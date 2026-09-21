import { appState, AppView } from './state/appState';
import { logger } from '../utils/logger';

/**
 * AppView（メイン表示画面）と NavigationState.currentView（ドキュメント一覧カテゴリ）の
 * 対応関係を解決する。
 *
 * - 'trash': ゴミ箱画面表示時 → currentView は 'trash'
 * - 'home' | 'editor' | 'settings': 通常一覧・エディタ・設定画面時 → currentView は 'documents'
 */
export function resolveCurrentView(view: AppView): 'documents' | 'trash' {
  switch (view) {
    case 'trash':
      return 'trash';
    case 'editor':
    case 'home':
    case 'settings':
    default:
      return 'documents';
  }
}

/**
 * アプリ内の画面遷移とナビゲーション状態を管理する。
 * UIコンポーネントからロジックを分離し、タブ復元・PWA再起動時の完全復帰を支援する。
 */
export const navigation = {
  /**
   * 指定した画面に遷移する。
   * view に応じて navigation.currentView を適切なカテゴリ ('documents' | 'trash') に連動させる。
   */
  navigate(view: AppView) {
    const prevState = appState.get();
    
    // 履歴の更新（将来の「戻る」機能用）
    const history = [...prevState.history];
    if (prevState.view !== view) {
      history.push(prevState.view);
    }

    logger.log('navigation', `Navigating to: ${view}`, { from: prevState.view });

    const currentView = resolveCurrentView(view);

    appState.set({
      view,
      navigation: {
        ...prevState.navigation,
        currentView,
      },
      history: history.slice(-50), // 直近50件まで保持
    });
  },

  /**
   * 前の画面に戻る。
   * 復元先の previousView に応じて navigation.currentView も連動させる。
   */
  back() {
    const prevState = appState.get();
    const { history } = prevState;
    if (history.length === 0) return;

    const previousView = history[history.length - 1] as AppView;
    const newHistory = history.slice(0, -1);

    logger.log('navigation', `Going back to: ${previousView}`);

    const currentView = resolveCurrentView(previousView);

    appState.set({
      view: previousView,
      navigation: {
        ...prevState.navigation,
        currentView,
      },
      history: newHistory,
    });
  },

  /**
   * 特定のノートを開いてエディタ画面に遷移する。
   * text は直接設定せず、appState.set の自動同期に委ねる。
   */
  openDocument(documentId: string) {
    const prevState = appState.get();
    logger.log('navigation', `Opening document: ${documentId}`);

    const history = [...prevState.history];
    if (prevState.view !== 'editor') {
      history.push(prevState.view);
    }

    appState.set({
      view: 'editor',
      navigation: {
        ...prevState.navigation,
        activeDocumentId: documentId,
        currentView: 'documents',
      },
      history: history.slice(-50),
    });
  },

  /**
   * サイドバー等での一覧カテゴリ ('documents' | 'trash') を切り替える。
   */
  setCurrentView(currentView: 'documents' | 'trash') {
    const targetView: AppView = currentView === 'trash' ? 'trash' : 'home';
    this.navigate(targetView);
  },
};

