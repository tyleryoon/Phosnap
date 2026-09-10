import { useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import { useLanguage } from '../contexts/LanguageContext';

// ─── 404 Not Found Page ────────────────────────────────────────────────

const MSG = {
  ko: { code: '404',     title: '페이지를 찾을 수 없습니다',   sub: '요청하신 페이지가 존재하지 않거나 이동되었습니다.',     home: '홈으로 돌아가기', explore: '작가 탐색하기' },
  en: { code: '404',     title: 'Page Not Found',              sub: 'The page you requested does not exist or has been moved.', home: 'Back to Home',    explore: 'Explore Artists' },
  ja: { code: '404',     title: 'ページが見つかりません',       sub: 'リクエストされたページは存在しないか、移動されました。',   home: 'ホームに戻る',     explore: 'アーティストを探す' },
  zh: { code: '404',     title: '页面未找到',                   sub: '您请求的页面不存在或已被移动。',                           home: '返回首页',         explore: '浏览摄影师' },
};

const NotFound = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const m = MSG[lang] || MSG.en;

  return (
    <div className="page-enter" style={{ paddingTop: 160, textAlign: 'center', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* 404 code */}
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 'clamp(72px, 14vw, 140px)',
        letterSpacing: '0.15em', lineHeight: 1, marginBottom: 16,
        background: 'linear-gradient(180deg, var(--gold) 0%, rgba(232,160,32,0.3) 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {m.code}
      </div>

      {/* Decorative line */}
      <div style={{ width: 60, height: 1, background: 'var(--gold-border)', margin: '16px auto 24px' }} />

      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '0.12em',
        color: 'var(--text)', marginBottom: 12, fontWeight: 400,
      }}>
        {m.title}
      </h1>

      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 48, maxWidth: 380, lineHeight: 1.7 }}>
        {m.sub}
      </p>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="btn-primary"
          style={{ fontSize: 13, padding: '14px 36px', letterSpacing: '0.1em', position: 'relative' }}
          onClick={() => navigate('/')}
        >
          <Corners />
          {m.home}
        </button>
        <button
          className="btn-outline"
          style={{ fontSize: 13, padding: '13px 36px', letterSpacing: '0.1em' }}
          onClick={() => navigate('/photographers')}
        >
          {m.explore}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
