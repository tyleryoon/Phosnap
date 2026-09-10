import { Component } from 'react';

// ─── Error Boundary ────────────────────────────────────────────────────
// React class component (hooks로는 ErrorBoundary 구현 불가)
// 렌더링 에러 시 흰 화면 대신 우아한 에러 페이지 표시

const MSG = {
  ko: { title: '문제가 발생했습니다', sub: '일시적인 오류가 발생했습니다. 새로고침을 해주세요.', reload: '새로고침', home: '홈으로' },
  en: { title: 'Something went wrong', sub: 'A temporary error has occurred. Please try refreshing.', reload: 'Refresh', home: 'Home' },
  ja: { title: '問題が発生しました', sub: '一時的なエラーが発生しました。ページを更新してください。', reload: '更新する', home: 'ホーム' },
  zh: { title: '出现了问题', sub: '发生了临时错误。请刷新页面。', reload: '刷新', home: '首页' },
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 프로덕션에서는 Sentry 등 에러 모니터링 서비스로 전송
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // navigator.language로 간단히 언어 추정
    const browserLang = (navigator.language || 'en').slice(0, 2);
    const langMap = { ko: 'ko', ja: 'ja', zh: 'zh' };
    const m = MSG[langMap[browserLang]] || MSG.en;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: '#0B0B0B', color: '#F2F2F2', padding: 24,
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          border: '2px solid rgba(232,160,32,0.3)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}>
          <span style={{ fontSize: 28, color: '#E8A020' }}>!</span>
        </div>

        <h1 style={{
          fontFamily: "'Cinzel', serif", fontSize: 20, letterSpacing: '0.12em',
          marginBottom: 12, fontWeight: 400,
        }}>
          {m.title}
        </h1>

        <p style={{ fontSize: 13, color: '#888888', marginBottom: 40, maxWidth: 360, lineHeight: 1.7 }}>
          {m.sub}
        </p>

        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={this.handleReload}
            style={{
              background: '#E8A020', color: '#0B0B0B', border: 'none',
              padding: '12px 32px', fontSize: 13, fontFamily: "'Cinzel', serif",
              letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            {m.reload}
          </button>
          <button
            onClick={this.handleHome}
            style={{
              background: 'transparent', color: '#F2F2F2',
              border: '1px solid rgba(242,242,242,0.18)',
              padding: '12px 32px', fontSize: 13, fontFamily: "'Cinzel', serif",
              letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            {m.home}
          </button>
        </div>

        {/* Dev mode: error details */}
        {import.meta.env.DEV && this.state.error && (
          <details style={{ marginTop: 40, textAlign: 'left', maxWidth: 600, width: '100%', color: '#888' }}>
            <summary style={{ cursor: 'pointer', fontSize: 11, letterSpacing: '0.05em' }}>Error Details</summary>
            <pre style={{
              marginTop: 8, padding: 16, background: '#111', border: '1px solid rgba(242,242,242,0.08)',
              fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflow: 'auto', maxHeight: 200,
            }}>
              {this.state.error?.toString()}
            </pre>
          </details>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
