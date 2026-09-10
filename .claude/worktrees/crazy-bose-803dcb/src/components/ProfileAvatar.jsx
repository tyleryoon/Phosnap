/**
 * ProfileAvatar — 프로필 대표 이미지 (이름 옆에 표시)
 * react-easy-crop 기반 이미지 크롭 + Supabase Storage 업로드
 *
 * Props:
 *   avatarUrl: 현재 아바타 URL (string|null)
 *   onAvatarChange: (newUrl) => void — 업로드 완료 시 콜백
 *   size: 아바타 크기 (default: 64)
 *   editable: 수정 가능 여부 (default: true)
 */
import { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { uploadAvatar } from '../lib/supabase';

// ── 크롭된 이미지를 Blob으로 변환 ──
const createCroppedBlob = (imageSrc, crop) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 400; // 출력 크기 (정사각형)
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, size, size
      );
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    };
    img.src = imageSrc;
  });
};

const ProfileAvatar = ({ avatarUrl, onAvatarChange, size = 64, editable = true }) => {
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setShowCropModal(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    // reset input so same file can be selected again
    e.target.value = '';
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await createCroppedBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const { url, error } = await uploadAvatar(file);
      if (!error && url) {
        onAvatarChange?.(url);
      }
    } catch (err) {
      // silently handled
    }
    setUploading(false);
    setShowCropModal(false);
    setImageSrc(null);
  };

  const handleCancel = () => {
    setShowCropModal(false);
    setImageSrc(null);
  };

  return (
    <>
      {/* 아바타 표시 */}
      <div
        onClick={() => editable && fileInputRef.current?.click()}
        style={{
          width: size, height: size, borderRadius: '50%',
          border: '2px solid var(--gold-border)',
          overflow: 'hidden', flexShrink: 0,
          cursor: editable ? 'pointer' : 'default',
          position: 'relative',
          background: 'var(--surface)',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', fontSize: size * 0.35,
          }}>
            👤
          </div>
        )}
        {editable && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,0.55)', textAlign: 'center',
            padding: '2px 0', fontSize: 9, color: '#fff',
            fontFamily: 'var(--font-serif)', letterSpacing: '0.05em',
          }}>
            편집
          </div>
        )}
      </div>
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileSelect}
          style={{ display: 'none' }}
        />
      )}

      {/* 크롭 모달 */}
      {showCropModal && imageSrc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* 크롭 영역 */}
          <div style={{ position: 'relative', width: '90vw', maxWidth: 400, height: '60vh', maxHeight: 400 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* 줌 슬라이더 */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>−</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: 200, accentColor: 'var(--gold)' }}
            />
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>+</span>
          </div>

          {/* 버튼 */}
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '10px 28px', background: 'transparent',
                border: '1px solid var(--border)', color: 'var(--muted)',
                fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={handleSaveCrop}
              disabled={uploading}
              style={{
                padding: '10px 28px', background: 'var(--gold)',
                border: 'none', color: '#0B0B0B',
                fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.08em',
                cursor: 'pointer', opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? '업로드 중...' : '적용'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileAvatar;
