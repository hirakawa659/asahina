import { logger } from '../utils/logger';

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
      logger.error('storage', `Failed to save key: ${key}`, e);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const data = await this.provider.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (e) {
      logger.error('storage', `Failed to load key: ${key}`, e);
      return null;
    }
  }

  async remove(key: string) {
    await this.provider.removeItem(key);
  }
}

export const storage = new StorageService();
