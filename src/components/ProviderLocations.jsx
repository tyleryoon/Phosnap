import React, { useCallback, useEffect, useState } from 'react';
import LocationPicker from './LocationPicker';
import { locationLabel } from '../data/locationUtils';
import { getProviderLocations, setProviderLocations } from '../lib/supabase';

// ─── 활동 지역 (여러 곳) ────────────────────────────────────────────────
//
// 헤메·의상·장소 벤더는 지역을 한 곳만 적을 수 있었다. 서울·부산 둘 다
// 뛰는 사람도 부산 촬영 검색에는 안 나왔다. 작가만 여러 곳을 적을 수
// 있었는데 그마저 메인 한 곳만 DB 로 넘어갔다.
//
// 여기서 provider_locations 를 직접 관리한다. 장바구니는 담은 것들의
// 지역 목록을 교집합으로 보므로(lib/cart.js), 여기 한 줄을 더하면
// 그 지역 촬영에 이 사람이 들어올 수 있게 된다.
//
// 대표 지역(baseLocationId)은 뺄 수 없다. 프로필의 location_id 와 같아야
// 하고, 그게 비면 목록 카드에 지역이 안 찍힌다.
//
// Props
//   providerType   'photographer' | 'stylist' | 'dress' | 'venue'
//   providerId     해당 테이블의 UUID
//   baseLocationId 프로필의 대표 지역 (없으면 잠글 게 없다)
//   lang           'ko' | 'en' | 'ja' | 'zh'
// ────────────────────────────────────────────────────────────────────────

const T = {
  ko: { title: '활동 지역', desc: '여기에 적은 지역의 촬영에만 노출됩니다. 여러 곳에서 활동하면 모두 더해주세요.',
        base: '대표', add: '지역 추가', cancel: '취소', loading: '불러오는 중…',
        empty: '아직 등록된 활동 지역이 없습니다.', saving: '저장 중…', saved: '저장되었습니다',
        failed: '저장하지 못했습니다', remove: '빼기' },
  en: { title: 'Service areas', desc: 'You appear only in shoots in these areas. Add every city you work in.',
        base: 'Primary', add: 'Add area', cancel: 'Cancel', loading: 'Loading…',
        empty: 'No service areas yet.', saving: 'Saving…', saved: 'Saved',
        failed: 'Could not save', remove: 'Remove' },
  ja: { title: '活動地域', desc: 'ここに登録した地域の撮影にのみ表示されます。複数ある場合はすべて追加してください。',
        base: '代表', add: '地域を追加', cancel: 'キャンセル', loading: '読み込み中…',
        empty: '登録された活動地域がありません。', saving: '保存中…', saved: '保存しました',
        failed: '保存できませんでした', remove: '削除' },
  zh: { title: '活动地区', desc: '仅在此处登记的地区的拍摄中显示。如在多地活动请全部添加。',
        base: '代表', add: '添加地区', cancel: '取消', loading: '加载中…',
        empty: '尚未登记活动地区。', saving: '保存中…', saved: '已保存',
        failed: '无法保存', remove: '移除' },
};

export default function ProviderLocations({ providerType, providerId, baseLocationId = null, lang = 'ko' }) {
  const c = T[lang] || T.ko;
  const [ids, setIds]       = useState(null);   // null = 아직 모름
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!providerId) { setIds([]); return; }
    const { data } = await getProviderLocations(providerType, providerId);
    // 대표 지역이 목록에 없으면 넣어둔다. 등록 직후에는 provider_locations
    // 행이 아직 없는데, 그 상태로 다른 지역을 더하면 대표 지역이 빠진 채
    // 저장되어 원래 지역에서 사라진다.
    const next = [...new Set([...(baseLocationId ? [baseLocationId] : []), ...data])];
    setIds(next);
  }, [providerType, providerId, baseLocationId]);

  useEffect(() => { load(); }, [load]);

  const commit = async (next) => {
    const prev = ids;
    setIds(next);                       // 먼저 반영하고
    setStatus(c.saving);
    const { error } = await setProviderLocations(providerType, providerId, next);
    if (error) {
      setIds(prev);                     // 실패하면 되돌린다
      setStatus(c.failed);
      return;
    }
    setStatus(c.saved);
    setTimeout(() => setStatus(''), 2000);
  };

  const handleAdd = (picked) => {
    const id = picked?.locationId;
    setAdding(false);
    if (!id || ids?.includes(id)) return;
    commit([...(ids || []), id]);
  };

  const handleRemove = (id) => {
    if (id === baseLocationId) return;
    commit((ids || []).filter(x => x !== id));
  };

  if (!providerId) return null;
  if (ids === null) {
    return <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.loading}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}>{c.title}</span>
        {status && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{status}</span>}
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 14 }}>{c.desc}</p>

      {ids.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{c.empty}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {ids.map(id => {
            const isBase = id === baseLocationId;
            return (
              <span
                key={id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', fontSize: 12,
                  border: `1px solid ${isBase ? 'var(--accent-a40)' : 'var(--border)'}`,
                  background: isBase ? 'var(--accent-a05)' : 'transparent',
                  color: 'var(--text)',
                }}
              >
                {locationLabel(id, lang)}
                {isBase ? (
                  <span style={{ fontSize: 10, color: 'var(--accent)' }}>{c.base}</span>
                ) : (
                  <button
                    onClick={() => handleRemove(id)}
                    aria-label={`${locationLabel(id, lang)} ${c.remove}`}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--muted)', fontSize: 14, lineHeight: 1, padding: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {adding ? (
        <div style={{ border: '1px solid var(--border)', padding: 16 }}>
          <LocationPicker value={null} onChange={handleAdd} lang={lang} />
          <button
            className="btn-ghost"
            onClick={() => setAdding(false)}
            style={{ marginTop: 12, fontSize: 12 }}
          >
            {c.cancel}
          </button>
        </div>
      ) : (
        <button className="btn-outline" onClick={() => setAdding(true)} style={{ fontSize: 12 }}>
          + {c.add}
        </button>
      )}
    </div>
  );
}
