import { appState, AppView } from './state/appState';
import { logger } from '../utils/logger';

/**
 * アプリ内の画面遷移を管理する。
 * UIコンポーネントからロジックを分離する。
 */
export const navigation = {
  /**
   * 指定した画面に遷移する。
   */
  navigate(view: AppView) {
    const prevState = appState.get();
    
    // 履歴の更新（将来の「戻る」機能用）
    const history = [...prevState.history];
    if (prevState.view !== view) {
      history.push(prevState.view);
    }

    logger.log('navigation', `Navigating to: ${view}`, { from: prevState.view });

    appState.set({
      view,
      history: history.slice(-50), // 直近50件まで保持
    });
  },

  /**
   * 前の画面に戻る（土台のみ）。
   */
  back() {
    const { history } = appState.get();
    if (history.length === 0) return;

    const previousView = history[history.length - 1] as AppView;
    const newHistory = history.slice(0, -1);

    logger.log('navigation', `Going back to: ${previousView}`);

    appState.set({
      view: previousView,
      history: newHistory,
    });
  }
};
