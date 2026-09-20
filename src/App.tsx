import { Sidebar } from './ui/sidebar';
import { Editor } from './editor/editor';
import { useAppState } from './core/state/useAppState';

function App() {
  const state = useAppState();
  const { initialized, view } = state;

  const getDebugReport = () => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isPWA: window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone,
        maxTouchPoints: navigator.maxTouchPoints,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight,
          devicePixelRatio: window.devicePixelRatio
        },
        window: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight
        },
        safariVisualViewport: window.visualViewport ? {
          width: window.visualViewport.width,
          height: window.visualViewport.height,
          scale: window.visualViewport.scale
        } : 'Not Supported'
      },
      currentState: state,
      navigationHistory: state.history,
      editorStats: {
        textLength: state.text.length,
        lastActiveAt: new Date(state.lastActiveAt).toISOString()
      },
      localStorageKeys: Object.keys(localStorage)
    }, null, 2);
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
              <h3 className="debug-section-title">環境情報診断</h3>
              <div className="debug-section-body" style={{ whiteSpace: 'pre-wrap' }}>
                {`起動モード: ${window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone ? '📱 ホーム画面 (PWA)' : '🌐 通常ブラウザ(Safari)'}
物理画面サイズ: ${window.screen.width} × ${window.screen.height} (比率: ${window.devicePixelRatio})
表示可能領域: ${window.screen.availWidth} × ${window.screen.availHeight}
ウィンドウサイズ: ${window.innerWidth} × ${window.innerHeight}${
                  window.visualViewport
                    ? `\n拡大率（Viewport Scale）: ${window.visualViewport.scale}`
                    : ''
                }
デバイス種別: ${navigator.maxTouchPoints > 0 ? `Touch対応 (最大 ${navigator.maxTouchPoints} 点)` : '非Touch端末'}
OS/プラットフォーム: ${navigator.platform}
UserAgent: ${navigator.userAgent}`}
              </div>
              <button
                id="debug-log-report-button"
                type="button"
                className="debug-button"
                onClick={() => {
                  console.log(getDebugReport());
                }}
              >
                診断レポートをコンソールに出力
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
