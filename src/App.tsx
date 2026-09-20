import { Sidebar } from './ui/sidebar';
import { Editor } from './editor/editor';
import { useAppState } from './core/state/useAppState';

function App() {
  const { initialized, view } = useAppState();

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
        {view === 'settings' && <div className="settings-container">Settings (Coming Soon)</div>}
      </main>
    </div>
  );
}

export default App;
