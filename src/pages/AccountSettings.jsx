import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';

// ─── 개인정보 관리 페이지 (모든 역할 공통) ─────────────────────────────

const INPUT = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '11px 14px', fontFamily: 'var(--font-sans)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const LABEL = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, fontFamily: 'var(--font-serif)', letterSpacing: '0.06em' };

const SECTION_TITLE = {
  fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em',
  color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16, marginTop: 32,
  paddingBottom: 8, borderBottom: '1px solid var(--border)',
};

const I18N = {
  ko: {
    title: '개인정보 관리', sub: '계정의 기본 정보를 관리합니다.',
    email: '이메일', phone: '핸드폰 번호', address: '기본 주소', addressDetail: '상세 주소',
    searchAddr: '주소 검색', currentPw: '현재 비밀번호', newPw: '새 비밀번호', confirmPw: '새 비밀번호 확인',
    pwHint: '8~16자, 대소문자+숫자+특수문자 포함', changePw: '비밀번호 변경',
    save: '저장', saved: '저장되었습니다 ✓', saving: '저장 중…',
    pwChanged: '비밀번호가 변경되었습니다 ✓', pwError: '비밀번호 변경 실패',
    pwMismatch: '새 비밀번호가 일치하지 않습니다.',
    displayName: '활동명 / 업체명', realName: '실명', birthdate: '생년월일',
    back: '← 대시보드로 돌아가기',
    role: '계정 유형',
    roleLabels: { customer: '고객', artist: '작가', vendor: '벤더', stylist: '스타일리스트', admin: '관리자' },
    artistType: '작가 유형',
    artistTypes: { photographer: '📸 사진 작가', videographer: '🎬 영상 작가', both: '📸🎬 사진·영상 작가', hmk: '💄 헤어메이크업 아티스트' },
    artistTypeUnset: '⚠️ 미설정 (관리자에게 문의)',
    typeChangeReq: '유형 변경 문의 →',
  },
  en: {
    title: 'Account Settings', sub: 'Manage your personal information.',
    email: 'Email', phone: 'Phone Number', address: 'Address', addressDetail: 'Detailed Address',
    searchAddr: 'Search', currentPw: 'Current Password', newPw: 'New Password', confirmPw: 'Confirm New Password',
    pwHint: '8-16 chars, upper+lower+number+special', changePw: 'Change Password',
    save: 'Save', saved: 'Saved ✓', saving: 'Saving…',
    pwChanged: 'Password changed ✓', pwError: 'Password change failed',
    pwMismatch: 'New passwords do not match.',
    displayName: 'Display Name', realName: 'Full Name', birthdate: 'Birthdate',
    back: '← Back to Dashboard',
    role: 'Account Type',
    roleLabels: { customer: 'Customer', artist: 'Artist', vendor: 'Vendor', stylist: 'Stylist', admin: 'Admin' },
    artistType: 'Artist Type',
    artistTypes: { photographer: '📸 Photographer', videographer: '🎬 Videographer', both: '📸🎬 Photo & Video', hmk: '💄 Hair & Makeup Artist' },
    artistTypeUnset: '⚠️ Not set (contact admin)',
    typeChangeReq: 'Request type change →',
  },
  ja: {
    title: 'アカウント設定', sub: '個人情報を管理します。',
    email: 'メール', phone: '電話番号', address: '住所', addressDetail: '詳細住所',
    searchAddr: '検索', currentPw: '現在のパスワード', newPw: '新しいパスワード', confirmPw: '新しいパスワード確認',
    pwHint: '8～16文字、大小文字+数字+特殊文字', changePw: 'パスワード変更',
    save: '保存', saved: '保存しました ✓', saving: '保存中…',
    pwChanged: 'パスワードが変更されました ✓', pwError: 'パスワード変更失敗',
    pwMismatch: '新しいパスワードが一致しません。',
    displayName: '活動名', realName: '本名', birthdate: '生年月日',
    back: '← ダッシュボードへ戻る',
    role: 'アカウントタイプ',
    roleLabels: { customer: 'お客様', artist: '作家', vendor: 'ベンダー', stylist: 'スタイリスト', admin: '管理者' },
    artistType: '作家タイプ',
    artistTypes: { photographer: '📸 写真作家', videographer: '🎬 映像作家', both: '📸🎬 写真・映像作家', hmk: '💄 ヘアメイクアーティスト' },
    artistTypeUnset: '⚠️ 未設定（管理者にお問い合わせ）',
    typeChangeReq: 'タイプ変更のお問い合わせ →',
  },
  zh: {
    title: '账户设置', sub: '管理您的个人信息。',
    email: '邮箱', phone: '手机号码', address: '地址', addressDetail: '详细地址',
    searchAddr: '搜索', currentPw: '当前密码', newPw: '新密码', confirmPw: '确认新密码',
    pwHint: '8-16位，含大小写+数字+特殊字符', changePw: '修改密码',
    save: '保存', saved: '已保存 ✓', saving: '保存中…',
    pwChanged: '密码已修改 ✓', pwError: '密码修改失败',
    pwMismatch: '新密码不一致。',
    displayName: '显示名称', realName: '真实姓名', birthdate: '出生日期',
    back: '← 返回仪表盘',
    role: '账户类型',
    roleLabels: { customer: '客户', artist: '摄影师', vendor: '供应商', stylist: '造型师', admin: '管理员' },
    artistType: '摄影师类型',
    artistTypes: { photographer: '📸 摄影师', videographer: '🎬 摄像师', both: '📸🎬 摄影·摄像师', hmk: '💄 化妆造型师' },
    artistTypeUnset: '⚠️ 未设置（请联系管理员）',
    typeChangeReq: '类型变更咨询 →',
  },
};

const AccountSettings = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user, roles } = useAuth();
  const f = I18N[lang] || I18N.en;

  // 프로필 데이터
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [addrBase, setAddrBase] = useState('');
  const [addrDetail, setAddrDetail] = useState('');

  // 작가 유형
  const [artistType, setArtistType] = useState('');

  // 비밀번호 변경
  const [currentPw, setCurrentPw] = useState('');

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwChanging, setPwChanging] = useState(false);

  // 프로필 로드
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const sb = await getSupabase();
      if (sb) {
        const { data } = await sb.from('profiles')
          .select('full_name, real_name, phone, birthdate, address, artist_type')
          .eq('id', user.id)
          .maybeSingle();
        if (data) {
          setDisplayName(data.full_name || '');
          setRealName(data.real_name || '');
          setPhone(data.phone || '');
          setBirthdate(data.birthdate || '');
          setArtistType(data.artist_type || '');
          const addrParts = (data.address || '').split(' ');
          // 첫 공백 이후를 상세주소로 분리 시도
          if (addrParts.length > 3) {
            setAddrBase(addrParts.slice(0, -1).join(' '));
            setAddrDetail(addrParts[addrParts.length - 1]);
          } else {
            setAddrBase(data.address || '');
            setAddrDetail('');
          }
        }
      }
    } catch (e) {
      // Silently ignore load errors
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // 프로필 저장
  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const sb = await getSupabase();
      if (sb) {
        const address = `${addrBase} ${addrDetail}`.trim();
        await sb.from('profiles').update({
          full_name: displayName,
          real_name: realName,
          phone,
          birthdate: birthdate || null,
          address,
        }).eq('id', user.id);
        setSaveMsg(f.saved);
        setTimeout(() => setSaveMsg(''), 3000);
      }
    } catch (e) {
      // Silently ignore save errors
    }
    setSaving(false);
  };

  // 비밀번호 변경
  const handlePasswordChange = async () => {
    setPwMsg('');
    if (newPw !== confirmPw) {
      setPwMsg(f.pwMismatch);
      return;
    }
    if (newPw.length < 8 || newPw.length > 16) {
      setPwMsg(f.pwHint);
      return;
    }
    setPwChanging(true);
    try {
      const sb = await getSupabase();
      if (sb) {
        const { error } = await sb.auth.updateUser({ password: newPw });
        if (error) {
          setPwMsg(`${f.pwError}: ${error.message}`);
        } else {
          setPwMsg(f.pwChanged);
          setCurrentPw('');
          setNewPw('');
          setConfirmPw('');
          setTimeout(() => setPwMsg(''), 3000);
        }
      }
    } catch (e) {
      setPwMsg(f.pwError);
    }
    setPwChanging(false);
  };

  // Daum 주소 검색
  const openDaumPostcode = () => {
    if (!window.daum || !window.daum.Postcode) {
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = () => runPostcode();
      document.head.appendChild(script);
    } else {
      runPostcode();
    }
  };

  const runPostcode = () => {
    new window.daum.Postcode({
      oncomplete: (data) => {
        setAddrBase(data.roadAddress || data.jibunAddress);
      },
    }).open();
  };

  // 대시보드 경로 결정
  const getDashboardPath = () => {
    const r = roles || [];
    if (r.includes('artist')) return '/artist/dashboard';
    if (r.includes('vendor')) return '/vendor/dashboard';
    if (r.includes('stylist')) return '/stylist/dashboard';
    return '/my';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '80px 20px 120px' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 3.5vw, 32px)', letterSpacing: '0.05em', marginBottom: 8 }}>
          {f.title}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{f.sub}</p>
      </div>

      {/* 계정 정보 (읽기 전용) */}
      <div style={{ border: '1px solid var(--border)', padding: '20px 24px', background: 'var(--bg2)', position: 'relative', marginBottom: 8 }}>
        <Corners />
        <div style={SECTION_TITLE}>{f.role}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(roles || ['customer']).map(r => {
            // 작가 역할일 때 세분화 표시
            let label = f.roleLabels[r] || r;
            if (r === 'artist' && artistType && f.artistTypes?.[artistType]) {
              label = f.artistTypes[artistType];
            }
            return (
              <span key={r} style={{
                padding: '5px 14px', fontSize: 11, fontFamily: 'var(--font-serif)',
                background: 'rgba(232,160,32,0.1)', border: '1px solid var(--gold-border)',
                color: 'var(--gold)', letterSpacing: '0.06em',
              }}>
                {label}
              </span>
            );
          })}
        </div>

        {/* 작가 유형 변경 안내 (작가 역할인 경우만) */}
        {(roles || []).includes('artist') && (
          <div style={{ marginTop: 16, padding: '14px 20px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              {f.artistType}: <span style={{ color: artistType && f.artistTypes?.[artistType] ? 'var(--gold)' : '#e85d5d', fontFamily: 'var(--font-serif)' }}>
                {f.artistTypes?.[artistType] || f.artistTypeUnset}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, whiteSpace: 'nowrap' }}
              onClick={() => window.open('mailto:support@phosnap.com?subject=작가 유형 변경 요청', '_blank')}>
              {f.typeChangeReq}
            </span>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <label style={LABEL}>{f.email}</label>
          <input style={{ ...INPUT, background: 'var(--bg2)', color: 'var(--muted)' }}
            type="email" value={user?.email || ''} readOnly />
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            {lang === 'ko' ? '이메일은 변경할 수 없습니다.' : lang === 'ja' ? 'メールアドレスは変更できません。' : lang === 'zh' ? '邮箱不可修改。' : 'Email cannot be changed.'}
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <div style={{ border: '1px solid var(--border)', padding: '20px 24px', background: 'var(--bg2)', position: 'relative', marginBottom: 8 }}>
        <Corners />
        <div style={SECTION_TITLE}>
          {lang === 'ko' ? '기본 정보' : lang === 'ja' ? '基本情報' : lang === 'zh' ? '基本信息' : 'Basic Info'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={LABEL}>{f.displayName}</label>
            <input style={INPUT} type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>{f.realName}</label>
            <input style={INPUT} type="text" value={realName} onChange={e => setRealName(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>{f.phone}</label>
          <input style={INPUT} type="tel" value={phone}
            onChange={e => {
              let v = e.target.value.replace(/\D/g, '');
              if (v.length > 3 && v.length <= 7) v = v.slice(0,3) + '-' + v.slice(3);
              else if (v.length > 7) v = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7,11);
              setPhone(v);
            }}
            placeholder="010-0000-0000"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>{f.birthdate}</label>
          <input style={INPUT} type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)}
            max={new Date().toISOString().split('T')[0]} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>{f.address}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...INPUT, flex: 1 }} type="text" value={addrBase} readOnly
              placeholder={lang === 'ko' ? '주소 검색을 눌러주세요' : 'Click search'} />
            <button type="button" onClick={openDaumPostcode}
              style={{
                padding: '11px 16px', background: 'var(--gold)', border: 'none',
                color: '#0B0B0B', fontFamily: 'var(--font-serif)', fontSize: 12,
                letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              {f.searchAddr}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>{f.addressDetail}</label>
          <input style={INPUT} type="text" value={addrDetail} onChange={e => setAddrDetail(e.target.value)}
            placeholder={lang === 'ko' ? '상세주소 기재' : 'Detailed address'} />
        </div>

        {/* 저장 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary"
            style={{ justifyContent: 'center', opacity: saving ? 0.5 : 1 }}>
            {saving ? f.saving : f.save}
          </button>
          {saveMsg && (
            <span style={{ fontSize: 12, color: '#22c55e', fontFamily: 'var(--font-serif)' }}>{saveMsg}</span>
          )}
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div style={{ border: '1px solid var(--border)', padding: '20px 24px', background: 'var(--bg2)', position: 'relative', marginBottom: 8 }}>
        <Corners />
        <div style={SECTION_TITLE}>{f.changePw}</div>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>{f.newPw}</label>
          <input style={INPUT} type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            placeholder="••••••••" minLength={8} maxLength={16} />
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{f.pwHint}</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>{f.confirmPw}</label>
          <input style={{
            ...INPUT,
            borderColor: confirmPw && newPw !== confirmPw ? '#e85d5d' : confirmPw && newPw === confirmPw ? '#22c55e' : 'var(--border)',
          }}
            type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            placeholder="••••••••" />
        </div>

        {/* 비밀번호 강도 표시 */}
        {newPw && (
          <div style={{ fontSize: 11, marginBottom: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            <span style={{ color: newPw.length >= 8 && newPw.length <= 16 ? '#22c55e' : '#e85d5d' }}>
              {newPw.length >= 8 && newPw.length <= 16 ? '✓' : '✗'} 8~16{lang === 'ko' ? '자' : ''}
            </span>{' · '}
            <span style={{ color: /[A-Z]/.test(newPw) ? '#22c55e' : '#e85d5d' }}>
              {/[A-Z]/.test(newPw) ? '✓' : '✗'} {lang === 'ko' ? '대문자' : 'A-Z'}
            </span>{' · '}
            <span style={{ color: /[a-z]/.test(newPw) ? '#22c55e' : '#e85d5d' }}>
              {/[a-z]/.test(newPw) ? '✓' : '✗'} {lang === 'ko' ? '소문자' : 'a-z'}
            </span>{' · '}
            <span style={{ color: /\d/.test(newPw) ? '#22c55e' : '#e85d5d' }}>
              {/\d/.test(newPw) ? '✓' : '✗'} {lang === 'ko' ? '숫자' : '0-9'}
            </span>{' · '}
            <span style={{ color: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPw) ? '#22c55e' : '#e85d5d' }}>
              {/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPw) ? '✓' : '✗'} {lang === 'ko' ? '특수문자' : 'Special'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handlePasswordChange}
            disabled={pwChanging || !newPw || !confirmPw || newPw !== confirmPw}
            className="btn-outline"
            style={{ opacity: (!newPw || !confirmPw || newPw !== confirmPw) ? 0.4 : 1 }}>
            {pwChanging ? '...' : f.changePw}
          </button>
          {pwMsg && (
            <span style={{ fontSize: 12, color: pwMsg.includes('✓') ? '#22c55e' : '#e85d5d', fontFamily: 'var(--font-serif)' }}>
              {pwMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
