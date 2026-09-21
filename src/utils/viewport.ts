/**
 * Visual Viewport のリサイズを監視し、
 * CSSカスタムプロパティ --viewport-height を更新する。
 */
export function setupViewportSync(): () => void {
  if (typeof window === 'undefined' || !window.visualViewport) {
    return () => {};
  }

  const updateHeight = () => {
    if (!window.visualViewport) return;
    const height = window.visualViewport.height;
    document.documentElement.style.setProperty('--viewport-height', `${height}px`);
  };

  // 初回同期
  updateHeight();

  window.visualViewport.addEventListener('resize', updateHeight);

  return () => {
    window.visualViewport?.removeEventListener('resize', updateHeight);
  };
}
