// ─── LogoText ──────────────────────────────────────────────────────────
// PHOS  → gold
// S     → gradient gold → white (left to right)
// NAP   → white

const sGradient = {
  background: 'linear-gradient(to right, var(--gold), var(--text))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  display: 'inline-block',   // background-clip 작동을 위해 필요
};

const LogoText = ({ style = {} }) => (
  <span style={{ letterSpacing: '0.2em', fontFamily: 'inherit', ...style }}>
    <span style={{ color: 'var(--gold)' }}>PHO</span>
    <span style={sGradient}>S</span>
    <span style={{ color: 'var(--text)' }}>NAP</span>
  </span>
);

export default LogoText;
