import { useState, useRef, useEffect } from 'react';

const LazyImage = ({ src, alt, style, className, blurHash, width, height }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, []);

  const containerStyle = {
    ...style,
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--bg3)',
  };

  const shimmerStyle = {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 100%)',
    animation: 'shimmer 2s infinite',
    pointerEvents: 'none',
    zIndex: 1,
  };

  const imgStyle = {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.4s ease-in-out',
  };

  const placeholderStyle = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--muted)',
    fontSize: '24px',
    opacity: !isLoaded && !hasError ? 1 : 0,
    transition: 'opacity 0.3s ease-out',
    pointerEvents: 'none',
  };

  const errorStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(139, 69, 19, 0.1)',
    color: 'var(--muted)',
    fontSize: '12px',
    flexDirection: 'column',
    gap: '8px',
    opacity: hasError ? 1 : 0,
    transition: 'opacity 0.3s ease-out',
    pointerEvents: 'none',
  };

  return (
    <div ref={imgRef} style={containerStyle} className={className}>
      {/* Shimmer effect while loading */}
      {!isLoaded && !hasError && (
        <>
          <div style={placeholderStyle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <div style={shimmerStyle} />
        </>
      )}

      {/* Error state — graceful fallback */}
      {hasError && (
        <div style={errorStyle}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1" opacity="0.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          style={imgStyle}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      )}

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LazyImage;
