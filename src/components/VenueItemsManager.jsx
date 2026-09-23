import { useState, useEffect, useCallback } from 'react';
import {
  ensureVenueVendor, getVenueItems,
  addVenueItem, updateVenueItem, deleteVenueItem,
  updateVenueVendorProfile,
} from '../lib/supabase';

// ─── 촬영 장소 관리 ───────────────────────────────────────────────────
//
// 고객 예약 STEP 05 는 venue_vendors / venue_items 에서 읽는데,
// 지금까지 여기에 쓰는 화면이 하나도 없었다.
// 벤더가 장소 탭에서 무엇을 등록해도 dress_items 로 들어가
// 고객에게는 영원히 보이지 않았다. 그래서 장소가 0개였다.
//
// 가격은 회차당 고정가만 받는다. 결제가 선결제라 총액이 미리 확정돼야
// 하고, 시간당으로 하면 촬영이 늘어졌을 때 정산 분쟁이 생긴다.
// ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'studio',            ko: '스튜디오',   en: 'Studio' },
  { id: 'traditional_space', ko: '전통 공간',  en: 'Traditional' },
  { id: 'outdoor',           ko: '야외',       en: 'Outdoor' },
  { id: 'urban',             ko: '도심',       en: 'Urban' },
  { id: 'event_hall',        ko: '연회장',     en: 'Event hall' },
  { id: 'other',             ko: '기타',       en: 'Other' },
];

const AMENITIES = [
  { id: 'parking',   ko: '주차',       en: 'Parking' },
  { id: 'dressing',  ko: '탈의실',     en: 'Dressing room' },
  { id: 'restroom',  ko: '화장실',     en: 'Restroom' },
  { id: 'aircon',    ko: '냉난방',     en: 'Climate control' },
  { id: 'lighting',  ko: '조명 장비',  en: 'Lighting gear' },
  { id: 'wifi',      ko: 'Wi-Fi',      en: 'Wi-Fi' },
  { id: 'elevator',  ko: '엘리베이터', en: 'Elevator' },
  { id: 'pet',       ko: '반려동물',   en: 'Pets allowed' },
];

const EMPTY = {
  name: '', category: 'studio', capacity: '10',
  price: '', description: '', amenities: [],
};

export default function VenueItemsManager({ vendorProfile, lang = 'ko' }) {
  const ko = lang === 'ko';
  const [vendorId, setVendorId] = useState(null);
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState(EMPTY);
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');
  // 고객 노출 여부 (is_active). 아이템이 하나라도 있으면 켜진다.
  const [activated, setActivated] = useState(false);

  const load = useCallback(async (vid) => {
    const { data } = await getVenueItems(vid);
    setItems(data || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: vendor, error } = await ensureVenueVendor({
        name:         vendorProfile?.name_ko || vendorProfile?.name,
        locationId:   vendorProfile?.location_id,
        locationNames: vendorProfile?.location_names,
        bio:          vendorProfile?.intro,
      });
      if (cancelled) return;
      if (error || !vendor) {
        setErr(error?.message || (ko ? '장소 벤더 정보를 만들지 못했습니다' : 'Could not set up venue vendor'));
        setLoading(false);
        return;
      }
      setVendorId(vendor.id);
      setActivated(!!vendor.is_active);
      await load(vendor.id);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [vendorProfile, load, ko]);

  const openModal = (item = null) => {
    setErr('');
    if (item) {
      setEditing(item);
      setForm({
        name:        item.name || '',
        category:    item.category || 'studio',
        capacity:    String(item.capacity ?? 10),
        price:       String(item.price ?? ''),
        description: item.description || '',
        amenities:   item.amenities || [],
      });
    } else {
      setEditing(null);
      setForm(EMPTY);
    }
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setErr(ko ? '장소 이름을 입력하세요' : 'Name is required'); return; }
    setBusy(true);
    setErr('');

    const payload = {
      name:        form.name.trim(),
      category:    form.category,
      capacity:    parseInt(form.capacity, 10) || 0,
      price:       parseInt(String(form.price).replace(/[^0-9]/g, ''), 10) || 0,
      // 선결제 구조라 회차당 고정가만 받는다
      price_unit:  'per_session',
      description: form.description || '',
      amenities:   form.amenities,
    };

    const { error } = editing
      ? await updateVenueItem(editing.id, payload)
      : await addVenueItem(vendorId, payload);

    setBusy(false);
    if (error) {
      // 조용히 넘어가면 등록된 줄 알고 기다리게 된다
      console.error('[VenueItemsManager] 저장 실패:', error);
      setErr(error.message || (ko ? '저장에 실패했습니다' : 'Save failed'));
      return;
    }

    // getVenueVendors 는 is_active=true 만 가져온다.
    // 아이템을 등록해도 벤더가 꺼져 있으면 고객 화면에 안 보인다.
    // 작가의 is_active 자동 전환과 같은 방식이다.
    if (!activated) {
      const { error: actErr } = await updateVenueVendorProfile(vendorId, { is_active: true });
      if (actErr) console.error('[VenueItemsManager] 노출 전환 실패:', actErr);
      else setActivated(true);
    }

    setOpen(false);
    await load(vendorId);
  };

  const remove = async (id) => {
    if (!confirm(ko ? '이 장소를 삭제할까요?' : 'Delete this venue?')) return;
    const { error } = await deleteVenueItem(id);
    if (error) { setErr(error.message); return; }
    await load(vendorId);
  };

  const box = {
    padding: 12, width: '100%', boxSizing: 'border-box',
    background: 'var(--bg)', color: 'var(--text)',
    border: '1px solid var(--border)', fontFamily: 'var(--font-body)', fontSize: 14,
  };
  const label = { fontSize: 12, color: 'var(--muted)', marginBottom: 4 };

  if (loading) return <div style={{ padding: 32, color: 'var(--muted)' }}>…</div>;

  return (
    <div style={{ display: 'grid', gap: 20, padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" onClick={() => openModal()}>
          {ko ? '장소 등록' : 'Add venue'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {ko ? `등록된 장소 ${items.length}곳` : `${items.length} venue(s)`}
        </span>
      </div>

      {err && (
        <div style={{
          padding: 12, fontSize: 13, color: '#e85d5d',
          border: '1px solid rgba(232,93,93,0.5)',
        }}>{err}</div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--border)' }}>
          {ko
            ? '등록된 장소가 없습니다. 장소를 등록해야 고객 예약 화면에 노출됩니다.'
            : 'No venues yet. Add one so customers can book it.'}
        </div>
      ) : (
        items.map(v => (
          <div key={v.id} style={{ border: '1px solid var(--border)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, marginBottom: 6 }}>{v.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {CATEGORIES.find(c => c.id === v.category)?.[ko ? 'ko' : 'en'] || v.category}
                  {' · '}{ko ? `최대 ${v.capacity}명` : `up to ${v.capacity}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 17 }}>
                  ₩{Number(v.price ?? 0).toLocaleString('ko-KR')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ko ? '촬영 1회' : 'per session'}</div>
              </div>
            </div>

            {v.description && (
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: '12px 0 0' }}>
                {v.description}
              </p>
            )}

            {(v.amenities || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {v.amenities.map(a => (
                  <span key={a} style={{
                    fontSize: 11, padding: '3px 9px', color: 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}>{AMENITIES.find(x => x.id === a)?.[ko ? 'ko' : 'en'] || a}</span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-outline" onClick={() => openModal(v)}>{ko ? '편집' : 'Edit'}</button>
              <button className="btn-outline" onClick={() => remove(v.id)}
                style={{ color: '#e85d5d', borderColor: 'rgba(232,93,93,0.5)' }}>
                {ko ? '삭제' : 'Delete'}
              </button>
            </div>
          </div>
        ))
      )}

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', padding: 28,
            width: 'min(560px, 100%)', maxHeight: '88vh', overflowY: 'auto',
            display: 'grid', gap: 14,
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, marginBottom: 4 }}>
              {editing ? (ko ? '장소 편집' : 'Edit venue') : (ko ? '장소 등록' : 'Add venue')}
            </div>

            <div>
              <div style={label}>{ko ? '장소 이름' : 'Name'}</div>
              <input style={box} value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <div style={label}>{ko ? '유형' : 'Category'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map(c => {
                  const on = form.category === c.id;
                  return (
                    <button key={c.id} type="button" onClick={() => setForm({ ...form, category: c.id })}
                      style={{
                        padding: '7px 13px', fontSize: 13, cursor: 'pointer',
                        background: on ? 'var(--accent-a15)' : 'transparent',
                        border: `1px solid ${on ? 'var(--accent-a50)' : 'var(--border)'}`,
                        color: on ? 'var(--gold)' : 'var(--muted)',
                      }}>{c[ko ? 'ko' : 'en']}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={label}>{ko ? '수용 인원' : 'Capacity'}</div>
                <input type="number" min="1" style={box} value={form.capacity}
                  onChange={e => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div>
                <div style={label}>{ko ? '촬영 1회 가격' : 'Price per session'}</div>
                <input type="number" style={box} value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>

            <div>
              <div style={label}>{ko ? '편의시설' : 'Amenities'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AMENITIES.map(a => {
                  const on = form.amenities.includes(a.id);
                  return (
                    <button key={a.id} type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        amenities: on ? f.amenities.filter(x => x !== a.id) : [...f.amenities, a.id],
                      }))}
                      style={{
                        padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                        background: on ? 'var(--accent-a15)' : 'transparent',
                        border: `1px solid ${on ? 'var(--accent-a50)' : 'var(--border)'}`,
                        color: on ? 'var(--gold)' : 'var(--muted)',
                      }}>{a[ko ? 'ko' : 'en']}</button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={label}>{ko ? '설명' : 'Description'}</div>
              <textarea style={{ ...box, minHeight: 96, resize: 'vertical' }} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            {err && <div style={{ fontSize: 13, color: '#e85d5d' }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn-outline" onClick={() => setOpen(false)}>{ko ? '취소' : 'Cancel'}</button>
              <button className="btn-primary" onClick={save} disabled={busy}>
                {busy ? (ko ? '저장 중…' : 'Saving…') : (ko ? '저장' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
