import { Sidebar } from './ui/sidebar';
import { Editor } from './editor/editor';
import { useAppState } from './core/state/useAppState';

function App() {
  const state = useAppState();
  const { initialized, view } = state;

  const getDiagnosticInfo = () => {
    const isDisplayModeStandalone =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(display-mode: standalone)').matches
        : false;
    const isIosStandalone =
      typeof navigator !== 'undefined' && 'standalone' in navigator
        ? Boolean((navigator as unknown as { standalone?: boolean }).standalone)
        : false;
    const isPWA = isDisplayModeStandalone || isIosStandalone;

    const visualViewportInfo =
      typeof window !== 'undefined' && window.visualViewport
        ? `${window.visualViewport.width} / ${window.visualViewport.height} / ${window.visualViewport.scale}`
        : 'Not Supported';

    const textLength =
      typeof (state as unknown as { text?: unknown }).text === 'string'
        ? (state as unknown as { text: string }).text.length
        : 'N/A';

    const lastActiveAtFormatted =
      typeof (state as unknown as { lastActiveAt?: unknown }).lastActiveAt === 'number'
        ? `${state.lastActiveAt} (${new Date(state.lastActiveAt).toISOString()})`
        : 'N/A';

    const localStorageKeys =
      typeof localStorage !== 'undefined' ? Object.keys(localStorage) : [];

    return `【ブラウザ・環境情報】
・User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}
・Platform: ${typeof navigator !== 'undefined' ? navigator.platform : 'N/A'}
・PWAとして起動しているか: ${isPWA ? 'true' : 'false'}
  - display-mode: standalone: ${isDisplayModeStandalone}
  - iOS Safari navigator.standalone: ${isIosStandalone}
・最大タッチポイント数: ${typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 'N/A'}
・screen.width / screen.height: ${typeof window !== 'undefined' ? `${window.screen.width} / ${window.screen.height}` : 'N/A'}
・screen.availWidth / screen.availHeight: ${typeof window !== 'undefined' ? `${window.screen.availWidth} / ${window.screen.availHeight}` : 'N/A'}
・devicePixelRatio: ${typeof window !== 'undefined' ? window.devicePixelRatio : 'N/A'}
・window.innerWidth / innerHeight: ${typeof window !== 'undefined' ? `${window.innerWidth} / ${window.innerHeight}` : 'N/A'}
・window.outerWidth / outerHeight: ${typeof window !== 'undefined' ? `${window.outerWidth} / ${window.outerHeight}` : 'N/A'}
・visualViewport.width / height / scale: ${visualViewportInfo}

【アプリ状態】
・state.text の文字数: ${textLength}
・state.lastActiveAt: ${lastActiveAtFormatted}
・navigation history: ${Array.isArray((state as unknown as { history?: unknown }).history) ? JSON.stringify(state.history) : 'N/A'}
・localStorage に存在するキー一覧: ${JSON.stringify(localStorageKeys)}
・現在のアプリ状態 (全データ):
${JSON.stringify(state, null, 2)}`;
  };

  if (!initialized) {
    return <div className="loading-screen">Loading Hirakawa...</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {view === 'editor' && <Editor />}
        {view === 'home' && <div className="placeholder-screen">Documents View (Coming Soon)</div>}
        {view === 'trash' && <div className="placeholder-screen">Trash View (Coming Soon)</div>}
        {view === 'settings' && (
          <div className="settings-container">
            <h2 className="settings-title">設定</h2>
            <div className="debug-section">
              <h3 className="debug-section-title">🐞 バグ診断</h3>
              <div className="debug-section-body">
                {getDiagnosticInfo()}
              </div>
              <button
                id="debug-log-report-button"
                type="button"
                className="debug-button"
                onClick={() => {
                  console.log(getDiagnosticInfo());
                }}
              >
                診断情報をコンソールに出力
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
