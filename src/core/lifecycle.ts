import { appState, createInitialState } from './state/appState';
import { logger } from '../utils/logger';
import { storage } from '../data/storage';

let isSaveSubscribed = false;
let saveDebounceTimer: number | null = null;

function scheduleAutoSave() {
  if (saveDebounceTimer !== null) {
    window.clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = window.setTimeout(() => {
    saveDebounceTimer = null;
    const currentState = appState.get();
    if (currentState.initialized) {
      void storage.saveAppState(currentState);
    }
  }, 500);
}

/**
 * アプリの起動時や終了時のライフサイクル処理を管理する。
 */
export const lifecycle = {
  /**
   * アプリの初期化。
   */
  async initialize() {
    logger.log('lifecycle', 'Application initializing...');

    try {
      // localStorage から安全に復元（破損データ・欠損・型違い等はすべてフォールバック済み）
      const restored = await storage.loadAppState();
      appState.replace({
        ...restored,
        initialized: true,
      });
      logger.log('lifecycle', 'Application initialized successfully');
    } catch (e) {
      // 予期せぬ例外時も安全な初期値で起動してクラッシュを防ぐ
      logger.error('lifecycle', 'Initialization failed, recovering with default initial state', {
        location: 'lifecycle.initialize',
        error: e instanceof Error ? e.message : String(e),
        fallback: 'createInitialState',
      });
      appState.replace({
        ...createInitialState(),
        initialized: true,
      });
    }

    // 状態変更時の自動保存購読（二重登録防止）
    if (!isSaveSubscribed) {
      isSaveSubscribed = true;
      appState.subscribe(scheduleAutoSave);

      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          lifecycle.prepareShutdown();
        });
        window.addEventListener('pagehide', () => {
          lifecycle.prepareShutdown();
        });
      }
    }
  },

  /**
   * セッション終了の準備。
   */
  prepareShutdown() {
    logger.log('lifecycle', 'Preparing for shutdown...');
    try {
      if (saveDebounceTimer !== null) {
        window.clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
      }
      const currentState = appState.get();
      if (currentState.initialized) {
        void storage.saveAppState(currentState);
      }
    } catch (e) {
      logger.error('lifecycle', 'Failed to save state during shutdown', {
        location: 'lifecycle.prepareShutdown',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
};


