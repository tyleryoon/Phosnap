import { useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '../lib/storage';

// ─── ImageUploader ──────────────────────────────────────────────────────
// 범용 이미지 업로드 컴포넌트 (드래그&드롭 + 클릭)
//
// Props:
//   onUpload    — (file: File) => Promise<{url, error}> 업로드 핸들러
//   onRemove    — (url: string) => void (optional)
//   value       — 현재 이미지 URL (미리보기용)
//   multiple    — 다중 선택 여부 (기본: false)
//   onMultiUpload — (files: File[]) => Promise<results> (multiple=true 시)
//   compact     — 작은 사이즈 모드 (기본: false)
//   label       — 라벨 텍스트
// ────────────────────────────────────────────────────────────────────────

const MSG = {
  ko: { drop: '이미지를 드래그하거나 클릭하여 업로드', size: '최대 5MB · JPG, PNG, WebP', uploading: '업로드 중...', change: '변경', remove: '삭제' },
  en: { drop: 'Drag & drop or click to upload', size: 'Max 5MB · JPG, PNG, WebP', uploading: 'Uploading...', change: 'Change', remove: 'Remove' },
  ja: { drop: '画像をドラッグまたはクリックしてアップロード', size: '最大5MB · JPG, PNG, WebP', uploading: 'アップロード中...', change: '変更', remove: '削除' },
  zh: { drop: '拖放或点击上传图片', size: '最大5MB · JPG, PNG, WebP', uploading: '上传中...', change: '更改', remove: '删除' },
};

const ImageUploader = ({
  onUpload, onRemove, value, multiple = false,
  onMultiUpload, compact = false, label,
}) => {
  const { lang } = useLanguage();
  const m = MSG[lang] || MSG.en;
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);

    try {
      if (multiple && onMultiUpload) {
        await onMultiUpload(Array.from(files));
      } else if (onUpload) {
        const result = await onUpload(files[0]);
        if (result?.error) setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const height = compact ? 120 : 200;

  // 이미 이미지가 있을 때: 미리보기
  if (value && !multiple) {
    return (
      <div style={{ position: 'relative' }}>
        {label && (
          <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
            {label}
          </div>
        )}
        <div style={{
          width: '100%', height, backgroundImage: `url(${value})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          border: '1px solid var(--border)', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            display: 'flex', gap: 6,
          }}>
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                background: 'rgba(11,11,11,0.8)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 10, padding: '4px 12px', cursor: 'pointer',
                fontFamily: 'var(--font-serif)', letterSpacing: '0.08em',
              }}
            >
              {m.change}
            </button>
            {onRemove && (
              <button
                onClick={() => onRemove(value)}
                style={{
                  background: 'rgba(245,101,101,0.15)', border: '1px solid rgba(245,101,101,0.3)',
                  color: '#f56565', fontSize: 10, padding: '4px 12px', cursor: 'pointer',
                  fontFamily: 'var(--font-serif)', letterSpacing: '0.08em',
                }}
              >
                {m.remove}
              </button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  // 업로드 영역
  return (
    <div>
      {label && (
        <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </div>
      )}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          width: '100%', height,
          border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--border)'}`,
          background: dragging ? 'var(--gold-dim)' : 'var(--bg2)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {uploading ? (
          <>
            <div style={{ width: 20, height: 20, border: '2px solid var(--gold)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em' }}>{m.uploading}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 24, color: 'var(--gold)', opacity: 0.5 }}>+</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textAlign: 'center' }}>
              {m.drop}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', opacity: 0.6 }}>{m.size}</div>
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#f56565', marginTop: 6 }}>{error}</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
};

export default ImageUploader;
