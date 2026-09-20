import { appState } from './state/appState';
import { logger } from '../utils/logger';

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
      // TODO: 将来的にここで localStorage からの復元や PWA の準備を行う
      
      appState.set({ initialized: true });
      logger.log('lifecycle', 'Application initialized successfully');
    } catch (e) {
      logger.error('lifecycle', 'Initialization failed', e);
    }
  },

  /**
   * セッション終了の準備。
   */
  prepareShutdown() {
    logger.log('lifecycle', 'Preparing for shutdown...');
    // TODO: 将来的にここで一時的な状態の保存などを行う
  }
};
