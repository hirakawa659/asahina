import { Sidebar } from './ui/sidebar';
import { Editor } from './editor/editor';

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Editor />
      </main>
    </div>
  );
}

export default App;
