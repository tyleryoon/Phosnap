/**
 * DragDropImageUpload — 드래그 앤 드롭 + 클릭 이미지 업로드 컴포넌트
 * Props:
 *   onFileSelect(file) — 파일 선택 시 콜백
 *   previewUrl — 현재 미리보기 URL (optional)
 *   label — 라벨 텍스트 (optional, default: '이미지 업로드')
 *   accept — 허용 파일 타입 (optional, default: 'image/*')
 *   maxSizeMB — 최대 파일 크기 MB (optional, default: 10)
 */
import { useState, useRef, useCallback } from 'react';

const DragDropImageUpload = ({
  onFileSelect,
  previewUrl,
  label = '이미지 업로드',
  accept = 'image/*',
  maxSizeMB = 10,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateAndSelect = useCallback((file) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`파일 크기가 ${maxSizeMB}MB를 초과합니다.`);
      return;
    }
    onFileSelect(file);
  }, [onFileSelect, maxSizeMB]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    validateAndSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSelect(file);
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
        {label}
      </label>
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--gold)' : 'var(--gold-dim)'}`,
          borderRadius: '4px',
          padding: previewUrl ? '0.5rem' : '2rem 1rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragging ? 'rgba(212,175,55,0.06)' : 'var(--bg)',
          transition: 'all 0.2s',
          position: 'relative',
          minHeight: previewUrl ? 'auto' : '100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        {previewUrl ? (
          <div style={{ position: 'relative', width: '100%' }}>
            <img
              src={previewUrl}
              alt="preview"
              style={{
                width: '100%',
                maxHeight: '200px',
                objectFit: 'contain',
                borderRadius: '2px',
              }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.6)', padding: '6px',
              fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center',
            }}>
              클릭하거나 새 이미지를 드래그하여 교체
            </div>
          </div>
        ) : (
          <>
            <span style={{ fontSize: '2rem', opacity: 0.5 }}>📷</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
              이미지를 드래그하거나 클릭하여 업로드
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: 0, opacity: 0.7 }}>
              JPG, PNG, WebP (최대 {maxSizeMB}MB)
            </p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {error && (
        <p style={{ fontSize: '0.75rem', color: '#e85d5d', margin: '0.3rem 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default DragDropImageUpload;
