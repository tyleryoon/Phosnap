import { useLanguage } from '../contexts/LanguageContext';

const VerifiedBadge = ({ tier = 'verified', size = 'md' }) => {
  const { t } = useLanguage();

  // Size variants
  const sizeConfig = {
    sm: { padding: '4px 8px', fontSize: 10, iconSize: 12 },
    md: { padding: '6px 12px', fontSize: 11, iconSize: 14 },
    lg: { padding: '8px 16px', fontSize: 12, iconSize: 16 },
  };

  // Tier configuration
  const tierConfig = {
    verified: {
      label: t('badge.verified'),
      description: t('badge.verifiedDesc'),
      bgColor: 'rgba(184, 134, 11, 0.15)',
      textColor: '#D4A574',
      borderColor: '#8B6914',
    },
    pro: {
      label: t('badge.pro'),
      description: t('badge.proDesc'),
      bgColor: 'rgba(192, 192, 192, 0.15)',
      textColor: '#C0C0C0',
      borderColor: '#808080',
    },
    elite: {
      label: t('badge.elite'),
      description: t('badge.eliteDesc'),
      bgColor: 'rgba(232, 160, 32, 0.15)',
      textColor: '#E8A020',
      borderColor: '#DAA520',
    },
  };

  const config = tierConfig[tier] || tierConfig.verified;
  const size_config = sizeConfig[size] || sizeConfig.md;

  // SVG Icons
  const CheckmarkIcon = ({ size }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ marginRight: 4, verticalAlign: 'middle' }}
    >
      <path
        d="M13.2 4.2L6.4 11L2.8 7.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const ShieldIcon = ({ size }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ marginRight: 4, verticalAlign: 'middle' }}
    >
      <path
        d="M8 2L3 4.5V8.5C3 12.5 8 14.5 8 14.5C8 14.5 13 12.5 13 8.5V4.5L8 2Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const icon = tier === 'elite' ? <ShieldIcon size={size_config.iconSize} /> : <CheckmarkIcon size={size_config.iconSize} />;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size_config.padding,
        fontSize: size_config.fontSize,
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: config.textColor,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: 12,
        cursor: 'default',
        transition: 'all 0.2s ease',
      }}
      title={config.description}
    >
      {icon}
      {config.label}
    </div>
  );
};

export default VerifiedBadge;
