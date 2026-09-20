import { Grid } from './grid';
import { Cursor } from './cursor';
import { Counter } from './counter';

/**
 * 編集処理の主責務を持つコンポーネント。
 */
export function Editor() {
  return (
    <div className="editor-container">
      <div className="editor-paper">
        <div className="editor-body">
          <Grid />
          <Cursor />
          <div className="editor-content" contentEditable>
            ここに小説を執筆... (土台実装中)
          </div>
        </div>
        <Counter />
      </div>
    </div>
  );
}
