// Ensure window.fetch has both getter and setter for third-party extensions and interceptors
try {
  let _currentFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    get() {
      return _currentFetch;
    },
    set(newFetch) {
      _currentFetch = newFetch;
    },
  });
} catch {
  // no-op if already defined
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

