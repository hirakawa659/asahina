import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { lifecycle } from './core/lifecycle';

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
