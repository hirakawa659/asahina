// src/editor/editor.tsx
import { useEffect, useRef } from 'react';
import { useAppState } from '../core/state/useAppState';
import { appState } from '../core/state/appState';
import { Grid } from './grid';
import { Cursor } from './cursor';
import { Counter } from './counter';
import { logger } from '../utils/logger';

export function Editor() {
  const { text } = useAppState();
  const editorRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<number | null>(null);

  // 状態のテキストが外側から変わった（切り替わった）ときだけエディタに反映
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== text) {
      editorRef.current.innerText = text;
    }
  }, [text]);

  const handleInput = () => {
    if (!editorRef.current) return;
    
    // デバウンス処理: 入力が止まってから300ms後にグローバル状態を更新
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    
    debounceTimer.current = window.setTimeout(() => {
      const currentText = editorRef.current?.innerText || '';
      appState.set({ text: currentText });
      
      logger.log('editor', 'Text state synchronized', { length: currentText.length });
    }, 300); // 300msの遅延
  };

  return (
    <div className="editor-container">
      <div className="editor-paper">
        <div className="editor-body">
          <Grid />
          <Cursor />
          <div 
            ref={editorRef}
            className="editor-content" 
            contentEditable
            onInput={handleInput}
          />
        </div>
        <Counter />
      </div>
    </div>
  );
}
