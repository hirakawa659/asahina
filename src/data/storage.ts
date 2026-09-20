import { logger } from '../utils/logger';
import { AppState, createInitialState, sanitizeAppState } from '../core/state/appState';
import { migration } from './migration';

export const STORAGE_KEY_APP_STATE = 'hirakawa_app_state';

/**
 * データの永続化を抽象化するレイヤー。
 * 将来的に IndexedDB や外部ストレージへの変更を容易にする。
 */
export interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// デフォルトは localStorage
class LocalStorageProvider implements StorageProvider {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

class StorageService {
  private provider: StorageProvider = new LocalStorageProvider();

  async save(key: string, data: any) {
    try {
      const serialized = JSON.stringify(data);
      await this.provider.setItem(key, serialized);
      logger.log('storage', `Data saved for key: ${key}`);
    } catch (e) {
      logger.error('storage', `Failed to save key: ${key}`, {
        location: 'storage.save',
        key,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const data = await this.provider.getItem(key);
      if (data === null) return null;
      return JSON.parse(data) as T;
    } catch (e) {
      logger.error('storage', `Failed to load or parse JSON for key: ${key}`, {
        location: 'storage.load',
        key,
        error: e instanceof Error ? e.message : String(e),
      });
      return null;
    }
  }

  /**
   * AppState 保存データを安全に読み込み・検証・復旧する。
   * JSON破損、null、非オブジェクト、プロパティ欠損、型不一致、旧スキーマデータ等を安全に処理し、
   * 不正・不足データ時は安全なデフォルト値へフォールバックして絶対にクラッシュさせない。
   */
  async loadAppState(key: string = STORAGE_KEY_APP_STATE): Promise<AppState> {
    try {
      const rawString = await this.provider.getItem(key);

      // 1. 保存データが null または未設定
      if (rawString === null) {
        logger.log('storage', `No saved data found for key: ${key}. Using default initial state.`, {
          location: 'storage.loadAppState',
          key,
          fallback: 'createInitialState',
        });
        return createInitialState();
      }

      // 2. JSON構文チェック（破損JSON対応）
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawString);
      } catch (parseError) {
        logger.error('storage', `Corrupted JSON encountered for key: ${key}. Falling back to default state.`, {
          location: 'storage.loadAppState (JSON.parse)',
          key,
          error: parseError instanceof Error ? parseError.message : String(parseError),
          fallback: 'createInitialState',
        });
        return createInitialState();
      }

      // 3. ルートオブジェクトの型チェック
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        logger.error('storage', `Saved data is not a valid object for key: ${key}. Falling back to default state.`, {
          location: 'storage.loadAppState (type check)',
          key,
          actualType: parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed,
          fallback: 'createInitialState',
        });
        return createInitialState();
      }

      // 4. 既存の migration 機構を優先適用
      const migrated = migration.migrate(parsed, key);
      const dataToSanitize = migrated !== null ? migrated : parsed;

      // 5. 必須プロパティ欠損・型不一致を検証し、安全なデフォルト値で補完
      return sanitizeAppState(dataToSanitize, key);
    } catch (e) {
      // 予期せぬエラー発生時もアプリ全体がクラッシュしないよう最外周でフォールバック
      logger.error('storage', `Unexpected error while loading app state for key: ${key}. Recovering with default initial state.`, {
        location: 'storage.loadAppState',
        key,
        error: e instanceof Error ? e.message : String(e),
        fallback: 'createInitialState',
      });
      return createInitialState();
    }
  }

  /**
   * AppState を保存する。
   */
  async saveAppState(state: AppState, key: string = STORAGE_KEY_APP_STATE): Promise<void> {
    await this.save(key, state);
  }

  async remove(key: string) {
    await this.provider.removeItem(key);
  }
}

export const storage = new StorageService();

