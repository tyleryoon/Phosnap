import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import { ArrowLeftIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { TermsViewer } from '../components/TermsModal';
import { TERMS_VENDOR, PRIVACY, REFUND_POLICY } from '../data/legal';
import { getAllLocationsSorted } from '../data/locationUtils';
// LocationPicker removed — 활동 지역은 대시보드에서 설정
import { signUp, signIn, upsertProfile, createDressVendor, getSupabase, addUserRole, switchUserRole } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PhoneVerify } from '../components/AuthModal';

// ─── 의상 업체 회원가입 페이지 ──────────────────────────────────────────

// Blocked words for inappropriate names (Korean, English, Japanese)
const BLOCKED_WORDS = [
  // Korean profanity and inappropriate terms
  '병신', '새끼', '개년', '개놈', '미친', '썅', '씹', '존나', '좆', '엄창', '딸깡',
  '씌놈', '년놈', '개같', '어처구니', '지랄', '시발', '시벌', '쌔', '야발',
  // English profanity
  'fuck', 'shit', 'damn', 'ass', 'bitch', 'crap', 'piss', 'cock', 'bastard',
  'asshole', 'jerk', 'dick', 'dickhead', 'twat', 'slut', 'whore', 'douchebag',
  // Japanese inappropriate terms
  'クソ', 'バカ', 'アホ', 'キモい', '気持ち悪い', 'うざい', 'ウザい', 'クズ',
  '死ね', 'しね', '消えろ', 'キチガイ',
];

const STEPS = [
  { n: '01', label: '기본 정보' },
  { n: '02', label: '서비스 정보' },
  { n: '03', label: '약관 동의 & 완료' },
];

// 입력 공통 스타일
const INPUT = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '11px 14px', fontFamily: 'var(--font-sans)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

// ─── 벤더 유형 ──────────────────────────────────────────────────────────
const VENDOR_TYPES = [
  { id: 'costume',  icon: '👗', label: '의상 대여', desc: '한복, 드레스, 기모노, 턱시도 등 촬영용 의상 대여' },
  { id: 'venue',    icon: '🏛️', label: '장소 대여', desc: '스튜디오, 한옥, 카페, 루프탑 등 촬영 장소 제공' },
];

// ─── 유형별 카테고리 (추후 대시보드에서 사용) ──────────────────────────

const VendorRegister = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { addRole: authAddRole, switchRole: authSwitchRole } = useAuth();

  // ── Helper: 이름 유효성 검사 (특수문자/기호 차단) ────────────────────
  const REAL_NAME_REGEX = /^[가-힣a-zA-Zぁ-んァ-ヶ一-龥\u3400-\u4DBF\s\-·.]+$/;
  const DISPLAY_NAME_REGEX = /^[가-힣a-zA-Z0-9ぁ-んァ-ヶ一-龥\u3400-\u4DBF\s\-·.]+$/;
  // 영문 업체명: 영문 알파벳 + 공백만 허용
  const ENGLISH_NAME_REGEX = /^[a-zA-Z\s]+$/;
  const isRealNameValid = (v) => !v || REAL_NAME_REGEX.test(v);
  const isDisplayNameValid = (v) => !v || DISPLAY_NAME_REGEX.test(v);
  const isEnglishNameValid = (v) => !v || ENGLISH_NAME_REGEX.test(v);

  // ── Helper: Check for inappropriate words ────────────────────────────
  const containsInappropriateWord = (text) => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return BLOCKED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
  };

  // ── Helper: Check for duplicate names in database ────────────────────
  const checkDuplicateName = useCallback(async (name, lang) => {
    if (!name || name.length < 2) return false;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .ilike(lang === 'ko' ? 'display_name' : 'display_name', `%${name}%`)
        .limit(1);

      if (error) {
        return false;
      }
      return data && data.length > 0;
    } catch (err) {
      return false;
    }
  }, []);

  const [step, setStep] = useState(1);

  // ── Step 1 상태 ─────────────────────────────────────────────────────
  const [nameKo, setNameKo] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameKoError, setNameKoError] = useState('');
  const [nameEnError, setNameEnError] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [realName, setRealName] = useState('');       // 담당자 실명
  const [birthdate, setBirthdate] = useState('');     // 담당자 생년월일
  const [bio, setBio] = useState('');
  const [addrBase, setAddrBase] = useState('');       // 업체 주소 (기본)
  const [addrDetail, setAddrDetail] = useState('');   // 업체 주소 (상세)

  // Debounce refs for duplicate name checking
  const nameKoDebounceRef = useRef(null);
  const nameEnDebounceRef = useRef(null);

  // ── Step 2 상태 ─────────────────────────────────────────────────────
  const [vendorTypes, setVendorTypes] = useState([]);  // ['costume'] | ['venue'] | ['costume', 'venue']
  const [referralCode, setReferralCode] = useState('');   // 추천인 코드
  const [contactInstagram, setContactInstagram] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');

  // ── Step 3 상태 ─────────────────────────────────────────────────────
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeFee, setAgreeFee] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  // ── 기존 계정 연결 모드 ──
  const [showExistingLogin, setShowExistingLogin] = useState(false);
  const [existingPassword, setExistingPassword] = useState('');
  const [viewingTerms, setViewingTerms] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── 유효성 검사 ──────────────────────────────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 비밀번호 조건 체크
  const pwChecks = {
    length:  password.length >= 8 && password.length <= 16,
    upper:   /[A-Z]/.test(password),
    lower:   /[a-z]/.test(password),
    digit:   /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  const pwAllPass = Object.values(pwChecks).every(Boolean);

  const step1Valid = (
    realName && isRealNameValid(realName) &&
    birthdate &&
    nameKo && isDisplayNameValid(nameKo) &&
    nameEn && isEnglishNameValid(nameEn) &&
    !nameKoError && !nameEnError &&
    email && emailRegex.test(email) &&
    addrBase &&
    // phoneVerified && // TODO: SMS 프로바이더 연동 후 복원
    pwAllPass && password === pwConfirm
  );

  const step2Valid = vendorTypes.length > 0;

  const step3Valid = agreeTerms && agreeFee && agreePrivacy && agreeRefund;

  // ── 각 단계별 부족한 항목 안내 메시지 ──────────────────────────────
  const getStep1Issues = () => {
    const issues = [];
    if (!realName) issues.push({ field: '담당자 실명', msg: '담당자 실명을 입력해주세요.' });
    else if (!isRealNameValid(realName)) issues.push({ field: '담당자 실명', msg: '실명에 특수문자나 기호는 사용할 수 없습니다.' });
    if (!birthdate) issues.push({ field: '생년월일', msg: '담당자 생년월일을 입력해주세요.' });
    if (!nameKo) issues.push({ field: '업체명 (한글)', msg: '한글 업체명을 입력해주세요.' });
    else if (!isDisplayNameValid(nameKo)) issues.push({ field: '업체명 (한글)', msg: '업체명에 특수문자는 사용할 수 없습니다.' });
    if (!nameEn) issues.push({ field: '업체명 (영문)', msg: '영문 업체명을 입력해주세요.' });
    else if (!isEnglishNameValid(nameEn)) issues.push({ field: '업체명 (영문)', msg: '영문 알파벳과 공백만 입력할 수 있습니다.' });
    if (!email) issues.push({ field: '이메일', msg: '대표자 이메일을 입력해주세요.' });
    else if (!emailRegex.test(email)) issues.push({ field: '이메일', msg: '이메일 형식이 올바르지 않습니다. 예) vendor@phosnap.com' });
    if (!addrBase) issues.push({ field: '주소', msg: '업체 주소(기본)를 입력해주세요.' });
    // if (!phoneVerified) issues.push({ field: '핸드폰 인증', msg: '핸드폰 번호 인증을 완료해주세요.' }); // TODO: SMS 프로바이더 연동 후 복원
    if (!password) issues.push({ field: '비밀번호', msg: '비밀번호를 입력해주세요.' });
    else if (!pwAllPass) issues.push({ field: '비밀번호', msg: '비밀번호 조건을 모두 충족해주세요. (8~16자, 대소문자, 숫자, 특수문자)' });
    if (password && !pwConfirm) issues.push({ field: '비밀번호 확인', msg: '비밀번호 확인을 입력해주세요.' });
    else if (pwConfirm && password !== pwConfirm) issues.push({ field: '비밀번호 확인', msg: '비밀번호가 일치하지 않습니다.' });
    return issues;
  };

  const getStep2Issues = () => {
    const issues = [];
    if (vendorTypes.length === 0) issues.push({ field: '업체 유형', msg: '의상 대여 또는 장소 대여 중 최소 하나를 선택해주세요.' });
    return issues;
  };

  const getStep3Issues = () => {
    const issues = [];
    if (!agreeTerms) issues.push({ field: '이용약관', msg: '벤더 서비스 이용약관에 동의해주세요.' });
    if (!agreeFee) issues.push({ field: '수수료', msg: '수수료 정책에 동의해주세요.' });
    if (!agreePrivacy) issues.push({ field: '개인정보', msg: '개인정보 처리방침에 동의해주세요.' });
    if (!agreeRefund) issues.push({ field: '환불정책', msg: '환불/취소 정책에 동의해주세요.' });
    return issues;
  };

  // ── 유효성 안내 박스 컴포넌트 ──────────────────────────────────────
  const ValidationHints = ({ issues }) => {
    if (!issues || issues.length === 0) return null;
    return (
      <div style={{
        marginTop: 16, padding: '14px 18px',
        background: 'rgba(232,93,93,0.06)',
        border: '1px solid rgba(232,93,93,0.25)',
        fontSize: 12, lineHeight: 1.8,
      }}>
        <div style={{ color: '#e85d5d', fontFamily: 'var(--font-serif)', fontSize: 11, letterSpacing: '0.1em', marginBottom: 8 }}>
          ✦ 다음 항목을 확인해주세요
        </div>
        {issues.map((issue, i) => (
          <div key={i} style={{ color: 'rgba(242,242,242,0.7)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ color: '#e85d5d', flexShrink: 0 }}>•</span>
            <span><strong style={{ color: '#f0a0a0' }}>{issue.field}</strong> — {issue.msg}</span>
          </div>
        ))}
      </div>
    );
  };

  // ── 벤더 프로필 저장 공통 로직 ──
  const saveVendorProfile = async (userId) => {
    const { saveReferralCode, applyReferralCode } = await import('../lib/referral');
    const displayName = `${nameKo} (${nameEn})`;

    await addUserRole(userId, 'dress_vendor');

    // Generate referral code for new vendor
    const myCode = await saveReferralCode(userId, 'vendor');

    await upsertProfile({
      id: userId,
      full_name: displayName,
      role: 'dress_vendor',
      phone,
      real_name: realName,
      birthdate,
      address: addrBase,
      address_detail: addrDetail,
      referral_code: myCode,
      referred_by_code: referralCode?.trim() || null,
    });

    // vendor_types: DB에 text[] 컬럼이 없을 수 있으므로, 쉼표 join 문자열로도 저장
    const vendorPayload = {
      user_id: userId,
      vendor_type: vendorTypes.join(','), // 'costume', 'venue', or 'costume,venue'
      name_ko: nameKo,
      name_en: nameEn,
      contact_phone: phone,
      contact_email: email,
      contact_instagram: contactInstagram || null,
      contact_website: contactWebsite || null,
      address: addrBase || null,
      address_detail: addrDetail || null,
    };
    // text[] 컬럼이 있으면 배열로도 저장 시도
    try {
      vendorPayload.vendor_types = vendorTypes;
    } catch (_) { /* ignore */ }

    const { error: vendorErr } = await createDressVendor(vendorPayload);
    if (vendorErr) {
      // vendor_types 컬럼이 없어서 실패했을 수 있으므로, 해당 필드 제거 후 재시도
      if (vendorErr.message?.includes('vendor_types') || vendorErr.code === '42703') {
        delete vendorPayload.vendor_types;
        const { error: retryErr } = await createDressVendor(vendorPayload);
      }
    }

    // Apply referral code if provided
    if (referralCode?.trim()) {
      try {
        const result = await applyReferralCode(userId, referralCode.trim());
      } catch (err) {
        // silently handled
      }
    }
  };

  // ── 기존 계정으로 로그인하여 벤더 역할 추가 ──
  const handleExistingLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: loginErr, data } = await signIn({ email, password: existingPassword });
      if (loginErr) {
        setError(loginErr.message === 'Invalid login credentials'
          ? '비밀번호가 올바르지 않습니다.'
          : loginErr.message);
        setLoading(false);
        return;
      }
      const userId = data?.user?.id || data?.session?.user?.id;
      if (userId) {
        await saveVendorProfile(userId);
        // AuthContext를 통해 역할 추가 + 전환 (sessionStorage + React state 동기화)
        await authAddRole('dress_vendor');
        await authSwitchRole('dress_vendor');
        sessionStorage.setItem('phosnap_active_role', 'dress_vendor');
      }
      // 기존 계정 연결 완료 → 바로 벤더 대시보드로 이동
      navigate('/vendor/dashboard');
      return;
    } catch (err) {
      setError(err.message || '가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ── 회원가입 제출 (신규) ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!step3Valid) return;
    setLoading(true);
    setError('');
    try {
      const displayName = `${nameKo} (${nameEn})`;

      const { data, error: signUpErr } = await signUp({
        email,
        password,
        name: displayName,
        role: 'dress_vendor',
      });

      if (signUpErr) {
        const m = signUpErr.message?.toLowerCase() ?? '';
        if (m.includes('already registered') || m.includes('already exists')) {
          setShowExistingLogin(true);
          setError('');
          setLoading(false);
          return;
        }
        setError(signUpErr.message);
        setLoading(false);
        return;
      }

      const userId = data?.user?.id;
      if (!userId) { setError('회원가입은 완료되었으나 유저 ID를 받지 못했습니다.'); setLoading(false); return; }

      await saveVendorProfile(userId);
      setSuccess('🎉 업체 등록 신청이 완료됐습니다! 관리자 승인 후 벤더 서비스 이용이 가능합니다. 이메일을 확인하고 인증을 완료해주세요.');
    } catch (err) {
      setError(err.message || '가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ── Progress Bar ─────────────────────────────────────────────────────
  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 40 }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{
          flex: 1, padding: '12px 8px', textAlign: 'center',
          fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.1em',
          color: step === i + 1 ? 'var(--gold)' : step > i + 1 ? 'rgba(232,160,32,0.5)' : 'var(--muted)',
          borderBottom: step === i + 1 ? '2px solid var(--gold)' : '2px solid transparent',
          transition: 'all 0.2s',
        }}>
          {s.n} · {s.label}
          {step > i + 1 && <span style={{ marginLeft: 6, color: '#22c55e' }}>✓</span>}
        </div>
      ))}
    </div>
  );

  // ── Section Divider ──────────────────────────────────────────────────
  const SectionDivider = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 18px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );

  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter" style={{ paddingTop: 100, paddingBottom: 80 }}>
      <div className="section" style={{ maxWidth: 640 }}>

        {/* Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, cursor: 'pointer' }}
          onClick={() => {
            if (step === 1) navigate(-1);
            else setStep(step - 1);
          }}>
          <ArrowLeftIcon size={14} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>뒤로</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, letterSpacing: '0.05em', marginBottom: 8 }}>
          벤더 등록
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40, lineHeight: 1.7 }}>
          Phosnap에서 의상 · 장소를 고객과 작가에게 연결하세요.
        </p>

        <ProgressBar />

        {/* ══════════════ STEP 1: 기본 정보 ══════════════ */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
              Step 01 · 기본 정보
            </div>

            <SectionDivider label="업체 정보" />
            <div style={{ marginBottom: 12 }}>
              <input style={{
                ...INPUT,
                borderColor: nameKoError ? '#e85d5d' : 'var(--border)',
                background: nameKoError ? 'rgba(232,93,93,0.04)' : 'var(--bg)',
              }}
                type="text" placeholder="업체명 (한글)"
                value={nameKo}
                onChange={e => {
                  setNameKo(e.target.value);
                  setNameKoError('');
                }}
                onBlur={async (e) => {
                  const val = e.target.value;
                  if (!val) return;

                  // Check for special characters
                  if (!isDisplayNameValid(val)) {
                    setNameKoError('특수문자는 사용할 수 없습니다.');
                    return;
                  }

                  // Check for inappropriate words
                  if (containsInappropriateWord(val)) {
                    setNameKoError('부적절한 단어가 포함되어 있습니다. 다른 이름을 사용해주세요.');
                    return;
                  }

                  // Check for duplicate (with debounce)
                  if (nameKoDebounceRef.current) clearTimeout(nameKoDebounceRef.current);
                  nameKoDebounceRef.current = setTimeout(async () => {
                    const isDuplicate = await checkDuplicateName(val, 'ko');
                    if (isDuplicate) {
                      setNameKoError('이미 사용 중인 업체명입니다.');
                    }
                  }, 500);
                }}
              />
              {nameKoError && <div style={{ fontSize: 11, color: '#e85d5d', marginTop: 6 }}>✗ {nameKoError}</div>}
            </div>

            <div style={{ marginBottom: 24 }}>
              <input style={{
                ...INPUT,
                borderColor: nameEnError ? '#e85d5d' : 'var(--border)',
                background: nameEnError ? 'rgba(232,93,93,0.04)' : 'var(--bg)',
              }}
                type="text" placeholder="업체명 (영문)"
                value={nameEn}
                onChange={e => {
                  // 입력 시 영문+공백만 허용 (실시간 필터링)
                  const filtered = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  setNameEn(filtered);
                  setNameEnError('');
                }}
                onBlur={async (e) => {
                  const val = e.target.value;
                  if (!val) return;

                  // 영문 알파벳 + 공백만 허용
                  if (!isEnglishNameValid(val)) {
                    setNameEnError('영문 알파벳과 공백만 입력할 수 있습니다.');
                    return;
                  }

                  // Check for inappropriate words
                  if (containsInappropriateWord(val)) {
                    setNameEnError('부적절한 단어가 포함되어 있습니다. 다른 이름을 사용해주세요.');
                    return;
                  }

                  // Check for duplicate (with debounce)
                  if (nameEnDebounceRef.current) clearTimeout(nameEnDebounceRef.current);
                  nameEnDebounceRef.current = setTimeout(async () => {
                    const isDuplicate = await checkDuplicateName(val, 'en');
                    if (isDuplicate) {
                      setNameEnError('이미 사용 중인 업체명입니다.');
                    }
                  }, 500);
                }}
              />
              {nameEnError && <div style={{ fontSize: 11, color: '#e85d5d', marginTop: 6 }}>✗ {nameEnError}</div>}
            </div>

            <SectionDivider label="담당자 정보" />
            <input style={{
                ...INPUT, marginBottom: realName && !isRealNameValid(realName) ? 4 : 12,
                ...(realName && !isRealNameValid(realName) ? { borderColor: '#e85d5d', background: 'rgba(232,93,93,0.04)' } : {}),
              }}
              type="text" placeholder="담당자 실명"
              value={realName} onChange={e => setRealName(e.target.value)} />
            {realName && !isRealNameValid(realName) && (
              <div style={{ fontSize: 11, color: '#e85d5d', marginBottom: 12, marginTop: 0 }}>✗ 특수문자나 기호는 사용할 수 없습니다.</div>
            )}
            <input style={{ ...INPUT, marginBottom: 24 }}
              type="date" placeholder="생년월일"
              value={birthdate} onChange={e => setBirthdate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} />

            <SectionDivider label="연락처" />
            <input style={{ ...INPUT, marginBottom: 12 }}
              type="email" placeholder="대표자 이메일"
              value={email} onChange={e => setEmail(e.target.value)} />

            {/* 핸드폰 인증 */}
            <div style={{ marginBottom: 24 }}>
              <PhoneVerify
                onVerified={(verifiedPhone) => {
                  setPhone(verifiedPhone);
                  setPhoneVerified(true);
                }}
                setError={setError}
              />
              {phoneVerified && (
                <div style={{ fontSize: 11, color: '#4ade80', marginTop: 6 }}>
                  ✓ 핸드폰 인증이 완료되었습니다.
                </div>
              )}
            </div>

            <SectionDivider label="비밀번호" />
            <input style={{ ...INPUT, marginBottom: 8 }}
              type="password" placeholder="비밀번호"
              value={password} onChange={e => setPassword(e.target.value)} />

            {/* 비밀번호 조건 표시 */}
            {password && (
              <div style={{ fontSize: 11, lineHeight: 1.8, marginBottom: 12, color: 'var(--muted)' }}>
                <div style={{ color: pwChecks.length  ? '#4ade80' : '#e85d5d' }}>{pwChecks.length  ? '✓' : '✗'} 8~16자</div>
                <div style={{ color: pwChecks.upper   ? '#4ade80' : '#e85d5d' }}>{pwChecks.upper   ? '✓' : '✗'} 대문자 포함</div>
                <div style={{ color: pwChecks.lower   ? '#4ade80' : '#e85d5d' }}>{pwChecks.lower   ? '✓' : '✗'} 소문자 포함</div>
                <div style={{ color: pwChecks.digit   ? '#4ade80' : '#e85d5d' }}>{pwChecks.digit   ? '✓' : '✗'} 숫자 포함</div>
                <div style={{ color: pwChecks.special ? '#4ade80' : '#e85d5d' }}>{pwChecks.special ? '✓' : '✗'} 특수문자 포함</div>
              </div>
            )}

            <input style={{ ...INPUT, marginBottom: 4 }}
              type="password" placeholder="비밀번호 확인"
              value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
            {pwConfirm && (
              <div style={{ fontSize: 11, marginTop: 4, marginBottom: 20, color: password === pwConfirm ? '#4ade80' : '#e85d5d' }}>
                {password === pwConfirm ? '✓ 비밀번호가 일치합니다.' : '✗ 비밀번호가 일치하지 않습니다.'}
              </div>
            )}
            {!pwConfirm && <div style={{ marginBottom: 24 }} />}

            <SectionDivider label="주소" />
            <div style={{ marginBottom: 12 }}>
              <input style={{ ...INPUT, marginBottom: 8 }}
                type="text" placeholder="기본 주소 (예: 서울특별시 강남구)"
                value={addrBase} onChange={e => setAddrBase(e.target.value)} />
              <input style={{ ...INPUT }}
                type="text" placeholder="상세 주소 (동, 호수 등)"
                value={addrDetail} onChange={e => setAddrDetail(e.target.value)} />
            </div>

            <SectionDivider label="SNS · 웹사이트 (선택)" />
            <input style={{ ...INPUT, marginBottom: 12 }}
              type="text" placeholder="Instagram 핸들 (@ 제외)"
              value={contactInstagram} onChange={e => setContactInstagram(e.target.value)} />
            <input style={{ ...INPUT, marginBottom: 24 }}
              type="url" placeholder="웹사이트 URL (선택)"
              value={contactWebsite} onChange={e => setContactWebsite(e.target.value)} />

            <SectionDivider label="추천인 코드 (선택)" />
            <input style={{ ...INPUT, marginBottom: 24 }}
              type="text" placeholder="추천인 코드가 있으면 입력하세요"
              value={referralCode} onChange={e => setReferralCode(e.target.value)} />

            {error && <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>{error}</p>}

            {!step1Valid && <ValidationHints issues={getStep1Issues()} />}

            <div style={{ display: 'flex', gap: 12, marginTop: !step1Valid ? 12 : 0 }}>
              <button className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', opacity: step1Valid ? 1 : 0.4 }}
                disabled={!step1Valid}
                onClick={() => step1Valid && setStep(2)}>
                다음 단계 — 서비스 정보
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 2: 서비스 유형 ══════════════ */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
              Step 02 · 서비스 유형
            </div>

            {/* ── 업체 유형 선택 (복수 선택 가능) ── */}
            <SectionDivider label="업체 유형 (복수 선택 가능)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {VENDOR_TYPES.map(vt => {
                const isSelected = vendorTypes.includes(vt.id);
                return (
                  <div key={vt.id}
                    onClick={() => {
                      setVendorTypes(prev =>
                        prev.includes(vt.id) ? prev.filter(v => v !== vt.id) : [...prev, vt.id]
                      );
                    }}
                    style={{
                      border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                      padding: '20px 18px', cursor: 'pointer',
                      background: isSelected ? 'rgba(232,160,32,0.06)' : 'var(--bg2)',
                      transition: 'all 0.2s', position: 'relative', textAlign: 'center',
                    }}
                  >
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#0B0B0B', fontSize: 10, fontWeight: 700 }}>✓</span>
                      </div>
                    )}
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{vt.icon}</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.04em', marginBottom: 4 }}>{vt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>{vt.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* 안내 */}
            <div style={{ marginBottom: 28, padding: '12px 16px', background: 'rgba(232,160,32,0.05)', borderLeft: '2px solid var(--gold)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
              <span style={{ color: 'var(--gold)' }}>안내</span> · 활동 지역, 세부 카테고리, 대표 이미지, 상세 소개 등은 가입 완료 후 벤더 대시보드에서 설정하실 수 있습니다.
            </div>

            {error && <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>{error}</p>}

            {!step2Valid && <ValidationHints issues={getStep2Issues()} />}

            <div style={{ display: 'flex', gap: 12, marginTop: !step2Valid ? 12 : 0 }}>
              <button className="btn-outline" onClick={() => setStep(1)}>← 이전</button>
              <button className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', opacity: step2Valid ? 1 : 0.4 }}
                disabled={!step2Valid}
                onClick={() => step2Valid && setStep(3)}>
                다음 단계 — 약관 동의 & 완료
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 3: 기존 계정 연결 ══════════════ */}
        {step === 3 && showExistingLogin && (
          <form onSubmit={handleExistingLogin}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
              기존 계정 연결
            </div>
            <div style={{
              padding: '20px 24px', marginBottom: 24,
              border: '1px solid var(--gold-border)', background: 'rgba(232,160,32,0.04)',
            }}>
              <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-serif)', marginBottom: 10 }}>
                이미 가입된 이메일입니다
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 16 }}>
                <strong style={{ color: 'var(--gold)' }}>{email}</strong> 은 이미 Phosnap에 가입되어 있어요.<br />
                기존 비밀번호를 입력하면 이 계정에 <strong style={{ color: 'var(--gold)' }}>벤더 역할</strong>을 추가합니다.
              </p>
              <input
                type="password"
                placeholder="기존 비밀번호 입력"
                value={existingPassword}
                onChange={e => setExistingPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg)',
                  border: '1px solid var(--border)', color: 'var(--text)',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {error && <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setShowExistingLogin(false); setError(''); setExistingPassword(''); }}
                style={{
                  flex: 1, padding: '12px', background: 'transparent',
                  border: '1px solid var(--border)', color: 'var(--muted)',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                뒤로
              </button>
              <button
                type="submit"
                disabled={loading || !existingPassword}
                style={{
                  flex: 2, padding: '12px', background: 'var(--gold)',
                  border: 'none', color: '#0B0B0B', fontSize: 12, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? '처리 중…' : '✦ 벤더 역할 추가 및 등록 완료'}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════ STEP 3: 약관 동의 & 완료 ══════════════ */}
        {step === 3 && !showExistingLogin && (
          <form onSubmit={handleSubmit}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
              Step 03 · 약관 동의 & 완료
            </div>

            {/* 약관 동의 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>약관 동의</div>
              <div style={{ border: '1px solid var(--border)', padding: '20px 24px', background: 'var(--bg2)', position: 'relative' }}>
                <Corners />
                {[
                  { key: 'terms', checked: agreeTerms, set: setAgreeTerms, text: '벤더 서비스 이용약관에 동의합니다.', required: true, data: TERMS_VENDOR },
                  { key: 'fee', checked: agreeFee, set: setAgreeFee, text: '수수료 정책에 동의합니다. (의상 대여: 20%/15%/12% · 장소 대여: 18%/14%/10% — 거래량 기반 단계 적용 | 얼리억세스 벤더: 의상 12%, 장소 10% 고정)', required: true, data: TERMS_VENDOR },
                  { key: 'privacy', checked: agreePrivacy, set: setAgreePrivacy, text: '개인정보 처리방침에 동의합니다.', required: true, data: PRIVACY },
                  { key: 'refund', checked: agreeRefund, set: setAgreeRefund, text: '환불/취소 정책에 동의합니다.', required: true, data: REFUND_POLICY },
                  { key: 'marketing', checked: agreeMarketing, set: setAgreeMarketing, text: '등록된 아이템 사진 및 업체 정보가 Phosnap 플랫폼의 홍보·마케팅(SNS, 광고, 웹사이트 등)에 활용될 수 있음에 동의합니다. (선택)', required: false, data: null },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => item.set(v => !v)}
                      style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                      <span style={{ color: item.required ? 'var(--gold)' : 'var(--muted)', fontSize: 11, marginRight: 4 }}>
                        [{item.required ? '필수' : '선택'}]
                      </span>
                      {item.text}
                    </div>
                    {item.data && (
                      <button
                        type="button"
                        onClick={() => setViewingTerms(item.data)}
                        style={{
                          background: 'transparent', border: '1px solid var(--border)',
                          color: 'var(--muted)', cursor: 'pointer', fontSize: 10,
                          padding: '3px 10px', borderRadius: 2, whiteSpace: 'nowrap',
                          fontFamily: 'var(--font-serif)', letterSpacing: '0.05em',
                        }}
                      >
                        보기
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 가입 요약 */}
            <div style={{ border: '1px solid var(--border)', padding: '20px 24px', marginBottom: 24, position: 'relative', background: 'var(--bg2)' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>가입 요약</div>
              {[
                { label: '업체명', value: `${nameKo} (${nameEn})` },
                { label: '업체 유형', value: vendorTypes.map(vt => VENDOR_TYPES.find(v => v.id === vt)?.label || vt).join(', ') },
                { label: '이메일', value: email },
                { label: '핸드폰', value: phone },
                addrBase ? { label: '주소', value: `${addrBase}${addrDetail ? ' ' + addrDetail : ''}` } : null,
                contactInstagram ? { label: 'Instagram', value: contactInstagram } : null,
                contactWebsite ? { label: 'Website', value: contactWebsite } : null,
              ].filter(Boolean).map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-serif)', textAlign: 'right' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {error && <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>{error}</p>}
            {success && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', padding: '16px 20px', marginBottom: 20, fontSize: 13, color: '#4ade80', lineHeight: 1.7 }}>
                {success}
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn-outline" style={{ fontSize: 12 }} onClick={() => navigate('/')}>홈으로 이동</button>
                </div>
              </div>
            )}

            {!success && (
              <>
                {!step3Valid && <ValidationHints issues={getStep3Issues()} />}
                <div style={{ display: 'flex', gap: 12, marginTop: !step3Valid ? 12 : 0 }}>
                  <button type="button" className="btn-outline" onClick={() => setStep(2)}>← 이전</button>
                  <button type="submit" className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', opacity: (step3Valid && !loading) ? 1 : 0.4 }}
                    disabled={!step3Valid || loading}>
                    {loading ? '가입 처리 중…' : '✦ 업체 등록 완료'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

      </div>

      {/* 약관 전문 모달 */}
      {viewingTerms && (
        <TermsViewer data={viewingTerms} onClose={() => setViewingTerms(null)} />
      )}
    </div>
  );
};

export default VendorRegister;
