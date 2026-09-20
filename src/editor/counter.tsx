import { useAppState } from '../core/state/useAppState';

/**
 * 文字数計算と表示を管理するコンポーネント。
 */
export function Counter() {
  const { text } = useAppState();
  
  return (
    <div className="editor-counter">
      <span>{text.length} 文字</span>
    </div>
  );
}
