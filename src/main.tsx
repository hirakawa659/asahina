import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { lifecycle } from './core/lifecycle';

// サービスワーカーの最小限の登録
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('[PWA] ServiceWorker registration failed:', error);
      });
  };

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker);
  }
}

// eslint-disable-next-line react-refresh/only-export-components
const Root = () => {
  useEffect(() => {
    lifecycle.initialize();
  }, []);

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
