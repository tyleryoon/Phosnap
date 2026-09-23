import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import ProviderDetailModal from '../components/ProviderDetailModal';
import { getDressVendorById, getVenueVendorById, getVenueItems } from '../lib/supabase';

// ─── 벤더 상세 (/vendor/:id) ───────────────────────────────────────────
//
// 이 라우트는 **없었다.**
// /vendors 의 카드가 navigate(`/vendor/${id}`) 로 보내는데 App.jsx 에는
// /vendor/register 와 /vendor/dashboard 만 있어서 전부 404 로 떨어졌다.
// 목록에서 업체를 누르면 아무 설명 없이 "페이지를 찾을 수 없습니다" 가 떴다.
//
// 의상 벤더와 장소 벤더는 테이블이 다르다. 주소에는 id 만 오므로
// 양쪽을 다 찾아보고 있는 쪽을 보여준다.

const fmt = (n) => (n === null || n === undefined ? null : `₩${Number(n).toLocaleString('ko-KR')}`);

const VendorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [type, setType] = useState(null);       // 'dress' | 'venue'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    setError(null);

    (async () => {
      // 의상 벤더 먼저. 없으면 장소 벤더.
      const d = await getDressVendorById(id);
      if (dead) return;
      if (d.data) {
        setVendor(d.data);
        setType('dress');
        setItems((d.data.dress_items || []).filter(x => x.is_available !== false));
        setLoading(false);
        return;
      }

      const v = await getVenueVendorById(id);
      if (dead) return;
      if (v.data) {
        setVendor(v.data);
        setType('venue');
        const { data: vi } = await getVenueItems(id);
        if (dead) return;
        setItems((vi || []).filter(x => x.is_available !== false));
        setLoading(false);
        return;
      }

      setLoading(false);
      // 조회 자체가 실패한 것과 그런 업체가 없는 것을 구분한다.
      if (d.error || v.error) {
        setError((d.error || v.error).message || '불러오지 못했습니다.');
      }
    })();

    return () => { dead = true; };
  }, [id]);

  if (loading) {
    return (
      <div style={{ paddingTop: 160, textAlign: 'center', color: 'var(--muted)' }}>
        불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ paddingTop: 160, textAlign: 'center', color: 'var(--muted)', lineHeight: 1.8 }}>
        <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)', fontSize: 15 }}>
          업체 정보를 불러오지 못했습니다
        </div>
        <div style={{ fontSize: 12.5, marginTop: 10 }}>{error}</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div style={{ paddingTop: 160, textAlign: 'center', color: 'var(--muted)', lineHeight: 1.8 }}>
        <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)', fontSize: 15 }}>
          등록되지 않은 업체입니다
        </div>
        <button type="button" onClick={() => navigate(type === 'venue' ? '/venues' : '/dresses')}
          style={{
            marginTop: 16, padding: '8px 16px', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--gold)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          목록으로
        </button>
      </div>
    );
  }

  const name = vendor.name_ko || vendor.name || '이름 없음';
  const isVenue = type === 'venue';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <SEO title={name} description={vendor.description || `${name} — Phosnap 제휴 업체`} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '130px 24px 60px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold)' }}>
          {isVenue ? '촬영 장소' : '의상 대여'}
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, margin: '10px 0 0' }}>
          {name}
        </h1>
        {(vendor.address || vendor.city || vendor.location_id) && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>
            {vendor.address || vendor.city || vendor.location_id}
          </div>
        )}
        {vendor.description && (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 14, lineHeight: 1.8, maxWidth: 700 }}>
            {vendor.description}
          </p>
        )}

        <div style={{
          marginTop: 30, paddingTop: 22, borderTop: '1px solid var(--border)',
          fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold)',
        }}>
          {isVenue ? '보유 장소' : '보유 의상'} {items.length}
        </div>

        {items.length === 0 ? (
          <div style={{ marginTop: 26, color: 'var(--muted)', fontSize: 13 }}>
            아직 등록된 {isVenue ? '장소' : '의상'}가 없습니다.
          </div>
        ) : (
          <div style={{
            marginTop: 22, display: 'grid', gap: 18,
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          }}>
            {items.map(it => {
              const img = it.image_url || it.images?.[0]?.url || it.images?.[0] || null;
              return (
                <button
                  key={it.id} type="button"
                  onClick={() => setDetail(it)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    padding: 0, color: 'var(--text)', fontFamily: 'inherit',
                  }}
                >
                  <div style={{ aspectRatio: '4 / 3', background: 'var(--bg)', overflow: 'hidden' }}>
                    {img ? (
                      <img src={img} alt={it.name_ko || it.name || ''} loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--muted)', fontSize: 11,
                      }}>사진 없음</div>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5 }}>
                      {it.name_ko || it.name || '이름 없음'}
                    </div>
                    {fmt(it.price) && (
                      <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 7 }}>
                        {fmt(it.price)}{it.price_unit ? ` / ${it.price_unit}` : ''}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {detail && (
        <ProviderDetailModal
          kind={isVenue ? 'venue' : 'dress'}
          data={detail}
          onClose={() => setDetail(null)}
        >
          <button type="button" onClick={() => navigate(isVenue ? '/venues' : '/dresses')}
            style={{
              padding: '11px 20px', border: 'none', background: 'var(--gold)',
              color: 'var(--on-accent)', fontSize: 12, letterSpacing: '0.1em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            예약 구성하러 가기
          </button>
        </ProviderDetailModal>
      )}

      <Footer />
    </div>
  );
};

export default VendorProfile;
