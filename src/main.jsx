import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';

// 지금 화면이 어느 커밋인지 콘솔에서 확인할 수 있게 한다.
//
//   window.__BUILD__          →  { commit: 'a1b2c3d', time: '2026-…' }
//
// 푸시했는데 고친 게 안 보일 때, 이 값이 옛 커밋이면 배포·캐시 문제고
// 최신 커밋이면 코드 문제다. 이 구분이 없으면 멀쩡한 코드를 의심하며
// 시간을 버린다. (vite.config.js 의 define 참고)
window.__BUILD__ = { commit: __BUILD_COMMIT__, time: __BUILD_TIME__ };

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
        <LanguageProvider>
          <CurrencyProvider>
            <AuthProvider>
              {/* 담은 구성은 화면 밖에 둔다 — 탭을 옮겨도 살아 있어야 한다 */}
              <CartProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </CartProvider>
            </AuthProvider>
          </CurrencyProvider>
        </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
