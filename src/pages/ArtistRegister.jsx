import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import { ArrowLeftIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { TermsViewer } from '../components/TermsModal';
import { TERMS_ARTIST, PRIVACY, REFUND_POLICY } from '../data/legal';
import { sendPhoneOtp, verifyPhoneOtp, getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage } from '../lib/storage';

// ─── 작가 전용 회원가입 페이지 ──────────────────────────────────────────

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

const genReferralCode = (name = '') => {
  const base = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${rand}`;
};

// ─── Create artist types and options dynamically based on language ────
const buildArtistTypes = (t) => [
  { id: 'photographer', icon: '📷', label: t('artistRegister.photographer.label'), sub: t('artistRegister.photographer.sub'), desc: t('artistRegister.photographer.desc') },
  { id: 'videographer', icon: '🎬', label: t('artistRegister.videographer.label'), sub: t('artistRegister.videographer.sub'), desc: t('artistRegister.videographer.desc') },
  { id: 'both', icon: '🎥', label: t('artistRegister.both.label'), sub: t('artistRegister.both.sub'), desc: t('artistRegister.both.desc') },
  { id: 'hmk', icon: '💄', label: t('artistRegister.hmk.label'), sub: t('artistRegister.hmk.sub'), desc: t('artistRegister.hmk.desc') },
];

const buildHmkOptions = (t) => [
  {
    id: 'solo',
    icon: '🧑‍🎨',
    label: t('artistRegister.solo.label'),
    desc: t('artistRegister.solo.desc'),
  },
  {
    id: 'partner',
    icon: '🤝',
    label: t('artistRegister.partner.label'),
    desc: t('artistRegister.partner.desc'),
  },
];

const STEPS_I18N = {
  ko: [{ n: '01', label: '기본 정보' }, { n: '02', label: '작가 유형' }, { n: '03', label: '서비스 옵션' }, { n: '04', label: '초대 & 동의' }],
  en: [{ n: '01', label: 'Basic Info' }, { n: '02', label: 'Artist Type' }, { n: '03', label: 'Service Options' }, { n: '04', label: 'Referral & Consent' }],
  ja: [{ n: '01', label: '基本情報' }, { n: '02', label: '作家タイプ' }, { n: '03', label: 'サービス設定' }, { n: '04', label: '招待 & 同意' }],
  zh: [{ n: '01', label: '基本信息' }, { n: '02', label: '摄影师类型' }, { n: '03', label: '服务设置' }, { n: '04', label: '邀请 & 同意' }],
};

// 전체 폼 다국어 텍스트
const FORM_I18N = {
  ko: {
    pageTitle: '작가 · H&M 등록', nativeName: '한글 활동명', englishName: '영문 활동명',
    email: '이메일', phone: '전화번호', birthdate: '생년월일', address: '기본 주소',
    addressDetail: '상세 주소 (선택)', searchAddr: '주소 검색', password: '비밀번호',
    passwordConfirm: '비밀번호 확인', pwHint: '8~16자, 대소문자+숫자+특수문자 포함',
    next: '다음', prev: '이전', submit: '가입 신청',
    sendOtp: '인증번호 받기', verifyOtp: '확인', otpResend: '재전송',
    otpSuccess: '✓ 전화번호 인증이 완료되었습니다.',
    otpFail: '인증번호가 올바르지 않습니다.',
    otpSendFail: '인증번호 발송에 실패했습니다.',
    referralCode: '추천 코드 (선택)', referralPlaceholder: 'XXXX0000 형식',
    agreeVisa: '해외 촬영 시 비자/세금은 본인 책임입니다.',
    agreePayment: '결제 및 수수료 정책을 확인했습니다.',
    agreeTerms: '이용약관, 개인정보 처리방침, 환불 정책에 동의합니다.',
    agreeMarketing: '(선택) 포트폴리오가 Phosnap 플랫폼의 마케팅에 활용될 수 있음에 동의합니다.',
    successMsg: '🎉 가입 신청이 완료됐습니다! 관리자 승인 후 작가 서비스 이용이 가능합니다. 이메일을 확인하고 인증을 완료해주세요.',
    goHome: '홈으로 이동',
    hmkSelf: 'H&M 서비스를 직접 제공할 수 있나요?', yes: '네', no: '아니요',
    hmkExternal: 'Phosnap H&M 전문가 매칭을 원하시나요?',
    dressOwn: '자체 의상을 보유하고 계신가요?',
    portfolioNotice: '가입 완료 후 작가 대시보드에서 등록하실 수 있습니다.',
    hmkMenuNotice: '가입 완료 후 작가 대시보드에서 등록하실 수 있습니다.',
    dressNotice: '자체 의상 목록은 가입 완료 후 작가 대시보드에서 등록하실 수 있습니다.',
    validationMissing: '아래 항목을 확인해주세요:',
    nameInfoTitle: '플랫폼에 노출되는 작가명입니다. 한글 활동명과 영문 활동명을 모두 입력해주세요.',
    nameInfoExtra: '실명(국/영문)은 별도로 기재되며, 활동명은 추후 대시보드 프로필 편집에서 변경할 수 있습니다.',
  },
  en: {
    pageTitle: 'Artist · H&M Registration', nativeName: 'Display Name (Korean)', englishName: 'Display Name (English)',
    email: 'Email', phone: 'Phone Number', birthdate: 'Date of Birth', address: 'Address',
    addressDetail: 'Address Detail (optional)', searchAddr: 'Search Address', password: 'Password',
    passwordConfirm: 'Confirm Password', pwHint: '8-16 chars, upper/lower/number/special required',
    next: 'Next', prev: 'Previous', submit: 'Submit Application',
    sendOtp: 'Send Code', verifyOtp: 'Verify', otpResend: 'Resend',
    otpSuccess: '✓ Phone number verified.',
    otpFail: 'Invalid verification code.',
    otpSendFail: 'Failed to send verification code.',
    referralCode: 'Referral Code (optional)', referralPlaceholder: 'XXXX0000 format',
    agreeVisa: 'I take responsibility for visa/tax for overseas shoots.',
    agreePayment: 'I have reviewed the payment and commission policy.',
    agreeTerms: 'I agree to the Terms of Service, Privacy Policy, and Refund Policy.',
    agreeMarketing: '(Optional) I agree that my portfolio may be used for Phosnap platform marketing.',
    successMsg: '🎉 Registration submitted! Your account will be activated after admin approval. Please check your email to complete verification.',
    goHome: 'Go Home',
    hmkSelf: 'Can you provide H&M services yourself?', yes: 'Yes', no: 'No',
    hmkExternal: 'Would you like Phosnap H&M specialist matching?',
    dressOwn: 'Do you own costumes/dresses?',
    portfolioNotice: 'You can register these in your dashboard after signup.',
    hmkMenuNotice: 'You can register H&M menus in your dashboard after signup.',
    dressNotice: 'Costume list can be registered in your dashboard after signup.',
    validationMissing: 'Please check the following:',
    nameInfoTitle: 'This is your display name on the platform. Please enter both Korean and English names.',
    nameInfoExtra: 'Your legal name (Korean/English) will be entered separately. Your display name can be changed later in your dashboard profile settings.',
  },
  ja: {
    pageTitle: '作家 · H&M 登録', nativeName: '韓国語活動名', englishName: '英語活動名',
    email: 'メール', phone: '電話番号', birthdate: '生年月日', address: '住所',
    addressDetail: '詳細住所（任意）', searchAddr: '住所検索', password: 'パスワード',
    passwordConfirm: 'パスワード確認', pwHint: '8〜16文字、大小文字+数字+特殊文字を含む',
    next: '次へ', prev: '戻る', submit: '登録申請',
    sendOtp: '認証番号を送信', verifyOtp: '確認', otpResend: '再送信',
    otpSuccess: '✓ 電話番号の認証が完了しました。',
    otpFail: '認証番号が正しくありません。',
    otpSendFail: '認証番号の送信に失敗しました。',
    referralCode: '招待コード（任意）', referralPlaceholder: 'XXXX0000 形式',
    agreeVisa: '海外撮影時のビザ・税金は自己責任です。',
    agreePayment: '決済・手数料ポリシーを確認しました。',
    agreeTerms: '利用規約、プライバシーポリシー、返金ポリシーに同意します。',
    agreeMarketing: '（任意）ポートフォリオがPhosnapプラットフォームのマーケティングに活用されることに同意します。',
    successMsg: '🎉 登録申請が完了しました！管理者の承認後にサービスをご利用いただけます。メールを確認して認証を完了してください。',
    goHome: 'ホームへ',
    hmkSelf: 'H&Mサービスを自分で提供できますか？', yes: 'はい', no: 'いいえ',
    hmkExternal: 'Phosnap H&M専門家マッチングを希望しますか？',
    dressOwn: '衣装を保有していますか？',
    portfolioNotice: '登録完了後、ダッシュボードで登録できます。',
    hmkMenuNotice: '登録完了後、ダッシュボードでH&Mメニューを登録できます。',
    dressNotice: '衣装リストは登録完了後、ダッシュボードで登録できます。',
    validationMissing: '以下の項目をご確認ください：',
    nameInfoTitle: 'これはプラットフォームに表示される名前です。韓国語と英語の両方を入力してください。',
    nameInfoExtra: '法的名義（韓国語/英語）は別途入力され、表示名はダッシュボードのプロフィール設定で後から変更できます。',
  },
  zh: {
    pageTitle: '摄影师 · H&M 注册', nativeName: '韩文艺名', englishName: '英文艺名',
    email: '邮箱', phone: '电话号码', birthdate: '出生日期', address: '地址',
    addressDetail: '详细地址（选填）', searchAddr: '搜索地址', password: '密码',
    passwordConfirm: '确认密码', pwHint: '8-16位，含大小写字母+数字+特殊字符',
    next: '下一步', prev: '上一步', submit: '提交申请',
    sendOtp: '发送验证码', verifyOtp: '验证', otpResend: '重新发送',
    otpSuccess: '✓ 手机号码验证完成。',
    otpFail: '验证码不正确。',
    otpSendFail: '验证码发送失败。',
    referralCode: '推荐码（选填）', referralPlaceholder: 'XXXX0000 格式',
    agreeVisa: '海外拍摄时签证/税务由本人负责。',
    agreePayment: '已确认支付及佣金政策。',
    agreeTerms: '同意服务条款、隐私政策和退款政策。',
    agreeMarketing: '（选填）同意作品集可用于Phosnap平台的营销。',
    successMsg: '🎉 注册申请已完成！管理员审批后即可使用服务。请检查您的邮箱完成验证。',
    goHome: '返回首页',
    hmkSelf: '您能自己提供H&M服务吗？', yes: '是', no: '否',
    hmkExternal: '是否需要Phosnap H&M专家匹配？',
    dressOwn: '您有自己的服装吗？',
    portfolioNotice: '注册完成后可在仪表板中添加。',
    hmkMenuNotice: '注册完成后可在仪表板中添加H&M菜单。',
    dressNotice: '服装列表可在注册完成后的仪表板中添加。',
    validationMissing: '请检查以下项目：',
    nameInfoTitle: '这是平台上显示的艺名。请同时输入韩文和英文名。',
    nameInfoExtra: '法定名义（韩文/英文）将单独填写，艺名可以在仪表板的资料编辑中稍后更改。',
  },
};

// 입력 공통 스타일
const INPUT = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '11px 14px', fontFamily: 'var(--font-sans)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const ArtistRegister = () => {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { addRole: authAddRole, switchRole: authSwitchRole } = useAuth();

  // Build arrays dynamically based on current language
  const ARTIST_TYPES = buildArtistTypes(t);
  const HMK_OPTIONS = buildHmkOptions(t);
  const STEPS = STEPS_I18N[lang] || STEPS_I18N.ko;
  const f = FORM_I18N[lang] || FORM_I18N.ko;
  const [step, setStep] = useState(1);

  // ── Step 1 상태 ─────────────────────────────────────────────────────
  const [realName,     setRealName]     = useState('');    // 실명
  const [nativeName,   setNativeName]   = useState('');
  const [englishName,  setEnglishName]  = useState('');
  const [nativeNameError, setNativeNameError] = useState('');
  const [englishNameError, setEnglishNameError] = useState('');

  // Debounce refs for duplicate name checking
  const nativeNameDebounceRef = useRef(null);
  const englishNameDebounceRef = useRef(null);

  const [email,        setEmail]        = useState('');
  const [phone,        setPhone]        = useState('');

  // OTP 인증
  const [otpSent,      setOtpSent]      = useState(false);
  const [otpCode,      setOtpCode]      = useState('');
  const [otpVerified,  setOtpVerified]  = useState(false);
  const [otpLoading,   setOtpLoading]   = useState(false);
  const [otpError,     setOtpError]     = useState('');
  const [otpTimer,     setOtpTimer]     = useState(0);
  const otpTimerRef = useRef(null);

  // 생년월일, 주소
  const [birthdate,    setBirthdate]    = useState('');
  const [addrBase,     setAddrBase]     = useState('');
  const [addrDetail,   setAddrDetail]   = useState('');

  // 비밀번호
  const [password,     setPassword]     = useState('');
  const [pwConfirm,    setPwConfirm]    = useState('');

  // SNS (선택)
  const [instagram,    setInstagram]    = useState('');
  const [website,      setWebsite]      = useState('');

  // ── Step 2 상태 ─────────────────────────────────────────────────────
  const [artistType,   setArtistType]   = useState('');

  // ── Step 3 상태 (서비스 옵션) ────────────────────────────────────────
  const [hmkSelf, setHmkSelf]         = useState(null);    // null=미선택, true=직접, false=외부
  const [hmkMenuItems, setHmkMenuItems] = useState([]);     // [{name, price, desc}]
  const [hmkExternalConnect, setHmkExternalConnect] = useState(false); // Phosnap H&M 작가 별도 연결
  const [dressSelf, setDressSelf]     = useState(false);     // 의상 자체 보유 여부

  // ── Step 4 상태 (포트폴리오 & 초대 & 동의) ────────────────────────────
  const [portfolioFiles,      setPortfolioFiles]      = useState([]);   // File objects
  const [portfolioPreviews,   setPortfolioPreviews]   = useState([]);   // Data URLs or uploaded URLs
  const [uploadingPortfolio,  setUploadingPortfolio]  = useState(false);

  const [referralCode, setReferralCode] = useState('');
  const [agreeVisa,      setAgreeVisa]      = useState(false);
  const [agreePayment,   setAgreePayment]   = useState(false);
  const [agreeTerms,     setAgreeTerms]     = useState(false);
  const [agreePrivacy,   setAgreePrivacy]   = useState(false);
  const [agreeRefund,    setAgreeRefund]    = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const [viewingTerms, setViewingTerms] = useState(null);  // 약관 보기 모달

  // ── 기존 계정 연결 모드 (이미 가입된 이메일) ──────────────────────────
  const [showExistingLogin, setShowExistingLogin] = useState(false);
  const [existingPassword, setExistingPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const isPhotoVideo = ['photographer', 'videographer', 'both'].includes(artistType);

  // ── Helper: 이름 유효성 검사 (특수문자/기호 차단) ────────────────────
  // 실명: 한글, 영문, 일본어, 중국어, 공백, 하이픈, 중간점만
  const REAL_NAME_REGEX = /^[가-힣a-zA-Zぁ-んァ-ヶ一-龥\u3400-\u4DBF\s\-·.]+$/;
  // 한글 활동명: 실명 + 숫자 허용
  const DISPLAY_NAME_REGEX = /^[가-힣a-zA-Z0-9ぁ-んァ-ヶ一-龥\u3400-\u4DBF\s\-·.]+$/;
  // 영문 활동명: 영문 알파벳 + 공백만 허용 (특수문자, 숫자, 한글 등 차단)
  const ENGLISH_NAME_REGEX = /^[a-zA-Z\s]+$/;
  const isRealNameValid = (v) => !v || REAL_NAME_REGEX.test(v);
  const isDisplayNameValid = (v) => !v || DISPLAY_NAME_REGEX.test(v);
  const isEnglishNameValid = (v) => !v || ENGLISH_NAME_REGEX.test(v);
  const [realNameError, setRealNameError] = useState('');
  const [displayNameKoError, setDisplayNameKoError] = useState('');
  const [displayNameEnError, setDisplayNameEnError] = useState('');

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

  // ── 유효성 ──────────────────────────────────────────────────────────
  const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,16}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const step1Valid = (
    realName && isRealNameValid(realName) &&
    nativeName && isDisplayNameValid(nativeName) &&
    englishName && isDisplayNameValid(englishName) &&
    !nativeNameError && !englishNameError &&
    emailRegex.test(email) &&
    phone.replace(/\D/g, '').length >= 10 &&
    // otpVerified && // TODO: SMS 프로바이더 연동 후 복원
    birthdate && addrBase &&
    pwRegex.test(password) &&
    password === pwConfirm
  );
  const step2Valid = !!artistType;
  const step3Valid = true; // 서비스 옵션은 모두 선택사항이므로 항상 통과
  const step4Valid = agreeVisa && agreePayment && agreeTerms && agreePrivacy && agreeRefund;

  // ── 각 단계별 부족한 항목 안내 메시지 생성 ─────────────────────────
  const getStep1Issues = () => {
    const issues = [];
    if (!realName) issues.push({ field: '실명', msg: '실명을 입력해주세요.' });
    else if (!isRealNameValid(realName)) issues.push({ field: '실명', msg: '실명에 특수문자나 기호는 사용할 수 없습니다.' });
    if (!nativeName) issues.push({ field: '한글 활동명', msg: '한글 활동명을 입력해주세요.' });
    else if (!isDisplayNameValid(nativeName)) issues.push({ field: '한글 활동명', msg: '활동명에 특수문자는 사용할 수 없습니다.' });
    if (!englishName) issues.push({ field: '영문 활동명', msg: '영문 활동명을 입력해주세요.' });
    else if (!isDisplayNameValid(englishName)) issues.push({ field: '영문 활동명', msg: '활동명에 특수문자는 사용할 수 없습니다.' });
    if (!email) issues.push({ field: '이메일', msg: '이메일 주소를 입력해주세요.' });
    else if (!emailRegex.test(email)) issues.push({ field: '이메일', msg: '이메일 형식이 올바르지 않습니다. 예) artist@phosnap.com' });
    if (!phone) issues.push({ field: '핸드폰', msg: '핸드폰 번호를 입력해주세요.' });
    else if (phone.replace(/\D/g, '').length < 10) issues.push({ field: '핸드폰', msg: '핸드폰 번호는 최소 10자리여야 합니다. 예) 010-0000-0000' });
    if (!birthdate) issues.push({ field: '생년월일', msg: '생년월일을 선택해주세요.' });
    if (!addrBase) issues.push({ field: '주소', msg: '"주소 검색" 버튼을 눌러 기본 주소를 입력해주세요.' });
    if (!password) issues.push({ field: '비밀번호', msg: '비밀번호를 입력해주세요.' });
    else if (!pwRegex.test(password)) {
      const missing = [];
      if (password.length < 8 || password.length > 16) missing.push('8~16자');
      if (!/[A-Z]/.test(password)) missing.push('대문자 1개 이상');
      if (!/[a-z]/.test(password)) missing.push('소문자 1개 이상');
      if (!/\d/.test(password)) missing.push('숫자 1개 이상');
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) missing.push('특수문자 1개 이상');
      issues.push({ field: '비밀번호', msg: `비밀번호 조건 미충족: ${missing.join(', ')}` });
    }
    if (password && !pwConfirm) issues.push({ field: '비밀번호 확인', msg: '비밀번호 확인을 입력해주세요.' });
    else if (pwConfirm && password !== pwConfirm) issues.push({ field: '비밀번호 확인', msg: '비밀번호가 일치하지 않습니다.' });
    return issues;
  };

  const getStep2Issues = () => {
    if (!artistType) return [{ field: '작가 유형', msg: '작가 유형을 선택해주세요. (사진, 영상, 사진+영상, H&M 중 택 1)' }];
    return [];
  };

  const getStep4Issues = () => {
    const issues = [];
    if (!agreeVisa) issues.push({ field: '비자·세금', msg: '비자·체류 자격 및 세금 관련 동의가 필요합니다.' });
    if (!agreePayment) issues.push({ field: '결제·수수료', msg: '결제 및 수수료 정산 방식에 동의해주세요.' });
    if (!agreeTerms) issues.push({ field: '이용약관', msg: '서비스 이용약관에 동의해주세요.' });
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

  // ── 이메일·핸드폰 인증은 추후 활성화 예정 (현재 테스트 모드) ─────────

  // ── Daum 우편번호 (도로명 주소 검색) ──────────────────────────────────
  const openDaumPostcode = () => {
    if (!window.daum || !window.daum.Postcode) {
      // 스크립트 동적 로드
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
        // data.roadAddress = 도로명 주소, data.jibunAddress = 지번 주소
        const addr = data.roadAddress || data.jibunAddress;
        setAddrBase(addr);
      },
    }).open();
  };

  // ── 포트폴리오 파일 처리 ──────────────────────────────────────────────
  const handlePortfolioFiles = async (files) => {
    if (!files) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    let newPreviews = [...portfolioPreviews];
    let newFiles = [...portfolioFiles];

    for (let file of files) {
      if (newPreviews.length >= 10) break; // Max 10 images
      if (!allowedTypes.includes(file.type)) continue;
      if (file.size > maxSize) continue;

      newFiles.push(file);
      // 미리보기용 URL 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setPortfolioPreviews(prev => [...prev, { url: e.target.result, isLocal: true }]);
      };
      reader.readAsDataURL(file);
    }

    setPortfolioFiles(newFiles);
  };

  const handlePortfolioDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handlePortfolioFiles(e.dataTransfer.files);
  };

  const removePortfolioImage = (index) => {
    setPortfolioFiles(prev => prev.filter((_, i) => i !== index));
    setPortfolioPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 포트폴리오 업로드 (등록 시)
  const uploadPortfolioImages = async () => {
    if (portfolioFiles.length === 0) return [];
    setUploadingPortfolio(true);
    const urls = [];
    try {
      const sb = await getSupabase();
      if (sb) {
        for (let file of portfolioFiles) {
          // uploadImage 는 { url, path, error } 를 반환한다.
          const { url, error } = await uploadImage(file, 'portfolios');
          if (url) urls.push(url);
          else if (error) console.error('[ArtistRegister] 포트폴리오 업로드 실패:', error);
        }
      } else {
        // Supabase not connected - use local URLs
        for (let preview of portfolioPreviews) {
          if (preview.isLocal) urls.push(preview.url);
        }
      }
    } catch (_) { /* silent */ }
    setUploadingPortfolio(false);
    return urls;
  };

  // ── 회원가입 제출 ────────────────────────────────────────────────────
  // ── 프로필 저장 공통 로직 ──
  const saveArtistProfile = async (userId) => {
    const { upsertProfile, addUserRole, ensureArtistRecord } = await import('../lib/supabase');
    const { saveReferralCode, applyReferralCode } = await import('../lib/referral');
    const portfolioUrls = await uploadPortfolioImages();
    const displayName = `${nativeName} (${englishName})`;

    // 헤어메이크업 전용 가입자는 stylists 경로(전용 대시보드 · 고객 H&M 선택)를
    // 사용한다. 사진/영상 작가와 상품 구조가 달라 테이블도 분리되어 있다.
    const signupRole = artistType === 'hmk' ? 'stylist' : 'artist';

    // 역할 추가
    await addUserRole(userId, signupRole);

    // Generate referral code for new artist
    const myCode = await saveReferralCode(userId, signupRole);

    const { error: profileErr } = await upsertProfile({
      id:               userId,
      full_name:        displayName,
      role:             signupRole,
      artist_type:      artistType,
      has_hmk_partner:  false,
      hmk_self:         isPhotoVideo ? (hmkSelf === true) : false,
      hmk_external_connect: isPhotoVideo ? hmkExternalConnect : false,
      hmk_options:      hmkSelf ? hmkMenuItems : [],
      dress_self:       isPhotoVideo ? dressSelf : false,
      referral_code:    myCode,
      referred_by_code: referralCode.trim() || null,
      phone,
      birthdate,
      real_name:        realName,
      address:          `${addrBase} ${addrDetail}`.trim(),
      portfolio_urls:   portfolioUrls,
      instagram:        instagram.trim() || null,
      website:          website.trim() || null,
    });
    if (profileErr) {
      // 프로필이 저장되지 않으면 이후 단계가 모두 무의미하므로 즉시 중단한다.
      throw new Error(`프로필 저장 실패: ${profileErr.message}`);
    }

    // 고객에게 노출되는 공개 레코드(photographers / stylists) 생성.
    // 이 단계가 없으면 작가가 검색 결과에 영원히 나타나지 않는다.
    const { error: artistErr } = await ensureArtistRecord(userId, {
      artistType,
      nativeName,
      englishName,
      portfolioUrls,
      instagram: instagram.trim() || null,
      hmkSelf:   isPhotoVideo ? (hmkSelf === true) : false,
      dressSelf: isPhotoVideo ? dressSelf : false,
    });
    if (artistErr) {
      throw new Error(`작가 등록 실패: ${artistErr.message}`);
    }

    // Apply referral code if provided
    if (referralCode.trim()) {
      try {
        const result = await applyReferralCode(userId, referralCode.trim());
      } catch (err) {
        // Silently ignore referral code errors
      }
    }
  };

  // ── 기존 계정으로 로그인하여 작가 역할 추가 ──
  const handleExistingLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { signInAndAddRole } = await import('../lib/supabase');
      const roleForSignup = artistType === 'hmk' ? 'stylist' : 'artist';
      const { error: loginErr, data } = await signInAndAddRole({
        email,
        password: existingPassword,
        role: roleForSignup,
      });
      if (loginErr) {
        setError(loginErr.message === 'Invalid login credentials'
          ? '비밀번호가 올바르지 않습니다.'
          : loginErr.message);
        setLoading(false);
        return;
      }
      const userId = data?.user?.id || data?.session?.user?.id;
      if (userId) {
        await saveArtistProfile(userId);
        // AuthContext를 통해 역할 추가 + 전환 (sessionStorage + React state 동기화)
        await authAddRole(roleForSignup);
        await authSwitchRole(roleForSignup);
        sessionStorage.setItem('phosnap_active_role', roleForSignup);
      }
      // 기존 계정 연결 완료 → 역할에 맞는 대시보드로 이동
      navigate(roleForSignup === 'stylist' ? '/stylist/dashboard' : '/artist/dashboard');
      return;
    } catch (err) {
      setError(err.message || '가입 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  // ── 신규 가입 (새 이메일) ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!step4Valid) return;
    setLoading(true);
    setError('');
    try {
      const { signUp } = await import('../lib/supabase');
      const displayName = `${nativeName} (${englishName})`;

      const { data, error: signUpErr } = await signUp({
        email,
        password,
        name: displayName,
        role: 'artist',
      });

      if (signUpErr) {
        const m = signUpErr.message?.toLowerCase() ?? '';
        if (m.includes('already registered') || m.includes('already exists')) {
          // 이미 가입된 이메일 → 기존 계정 연결 모드
          setShowExistingLogin(true);
          setError('');
          setLoading(false);
          return;
        }
        setError(signUpErr.message);
        setLoading(false);
        return;
      }

      if (data?.user?.id) {
        await saveArtistProfile(data.user.id);
      }
      setSuccess(f.successMsg);
    } catch (err) {
      setError(err.message || '가입 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  // ── 진행 바 ──────────────────────────────────────────────────────────
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

  // ── 섹션 구분선 ──────────────────────────────────────────────────────
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

        <button className="back-btn" style={{ marginBottom: 24 }}
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/for-artists')}>
          <ArrowLeftIcon /> {step > 1 ? f.prev : (lang === 'ko' ? '작가 소개 페이지로' : lang === 'ja' ? '作家紹介ページへ' : lang === 'zh' ? '摄影师介绍页' : 'Artist Info Page')}
        </button>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12 }}>
            Phosnap · Artist Registration
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, letterSpacing: '0.05em', marginBottom: 8 }}>{f.pageTitle}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
            {lang === 'ko' ? 'Phosnap과 함께 전 세계 고객을 만나보세요.' : lang === 'ja' ? 'Phosnapと一緒に世界中のお客様に出会いましょう。' : lang === 'zh' ? '与Phosnap一起面向全球客户。' : 'Meet clients worldwide with Phosnap.'}<br />
            {lang === 'ko' ? '가입 후 프로필을 완성하면 즉시 예약을 받을 수 있습니다.' : lang === 'ja' ? '登録後にプロフィールを完成させれば、すぐに予約が受けられます。' : lang === 'zh' ? '注册后完善资料即可开始接单。' : 'Complete your profile after signup to start receiving bookings.'}
          </p>
        </div>

        <ProgressBar />

        {/* ══════════════ STEP 1: 기본 정보 ══════════════ */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
              Step 01 · {STEPS[0]?.label}
            </div>

            {/* 실명 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'ko' ? '실명' : lang === 'ja' ? '本名' : lang === 'zh' ? '真实姓名' : 'Legal Name'} *
              </label>
              <input style={{
                  ...INPUT,
                  ...(realName && !isRealNameValid(realName) ? { borderColor: '#e85d5d', background: 'rgba(232,93,93,0.04)' } : {}),
                }}
                type="text" placeholder={lang === 'ko' ? '홍길동' : lang === 'ja' ? '山田太郎' : 'John Doe'}
                value={realName} onChange={e => setRealName(e.target.value)} required />
              {realName && !isRealNameValid(realName) && (
                <div style={{ fontSize: 11, color: '#e85d5d', marginTop: 6 }}>✗ {lang === 'ko' ? '특수문자나 기호는 사용할 수 없습니다.' : lang === 'ja' ? '特殊文字や記号は使用できません。' : 'Special characters are not allowed.'}</div>
              )}
            </div>

            {/* 작가명 */}
            <div style={{ background: 'rgba(232,160,32,0.05)', border: '1px solid var(--gold-border)', padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'rgba(242,242,242,0.6)', lineHeight: 1.7 }}>
              {f.nameInfoTitle}<br />
              {f.nameInfoExtra && <><br /><span style={{ color: 'var(--gold)', fontSize: 11 }}>💡 {f.nameInfoExtra}</span></>}
              <br />
              <span style={{ color: 'var(--gold)' }}>{lang === 'ko' ? '예) 홍길동 / Gildong Hong' : 'e.g.) 홍길동 / Gildong Hong'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 6 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{f.nativeName} *</label>
                <input style={{
                  ...INPUT,
                  borderColor: nativeNameError ? '#e85d5d' : 'var(--border)',
                  background: nativeNameError ? 'rgba(232,93,93,0.04)' : 'var(--bg)',
                }}
                  type="text" placeholder="홍길동"
                  value={nativeName}
                  onChange={e => {
                    setNativeName(e.target.value);
                    setNativeNameError('');
                  }}
                  onBlur={async (e) => {
                    const val = e.target.value;
                    if (!val) return;

                    // Check for special characters
                    if (!isDisplayNameValid(val)) {
                      setNativeNameError(lang === 'ko' ? '특수문자는 사용할 수 없습니다.' : lang === 'ja' ? '特殊文字は使用できません。' : lang === 'zh' ? '不能使用特殊字符。' : 'Special characters are not allowed.');
                      return;
                    }

                    // Check for inappropriate words
                    if (containsInappropriateWord(val)) {
                      setNativeNameError(lang === 'ko' ? '부적절한 단어가 포함되어 있습니다. 다른 이름을 사용해주세요.' : lang === 'ja' ? '不適切な単語が含まれています。' : lang === 'zh' ? '名称中包含不当的词汇。' : 'Inappropriate content detected.');
                      return;
                    }

                    // Check for duplicate (with debounce)
                    if (nativeNameDebounceRef.current) clearTimeout(nativeNameDebounceRef.current);
                    nativeNameDebounceRef.current = setTimeout(async () => {
                      const isDuplicate = await checkDuplicateName(val, 'ko');
                      if (isDuplicate) {
                        setNativeNameError(lang === 'ko' ? '이미 사용 중인 활동명입니다.' : lang === 'ja' ? 'すでに使用中の名前です。' : lang === 'zh' ? '该艺名已在使用中。' : 'Name already in use.');
                      }
                    }, 500);
                  }}
                  required />
                {nativeNameError && <div style={{ fontSize: 11, color: '#e85d5d', marginTop: 6 }}>✗ {nativeNameError}</div>}
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{f.englishName} *</label>
                <input style={{
                  ...INPUT,
                  borderColor: englishNameError ? '#e85d5d' : 'var(--border)',
                  background: englishNameError ? 'rgba(232,93,93,0.04)' : 'var(--bg)',
                }}
                  type="text" placeholder="Gildong Hong"
                  value={englishName}
                  onChange={e => {
                    // 입력 시 영문+공백만 허용 (실시간 필터링)
                    const filtered = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    setEnglishName(filtered);
                    setEnglishNameError('');
                  }}
                  onBlur={async (e) => {
                    const val = e.target.value;
                    if (!val) return;

                    // 영문 알파벳 + 공백만 허용 (특수문자, 숫자, 한글 등 차단)
                    if (!isEnglishNameValid(val)) {
                      setEnglishNameError(lang === 'ko' ? '영문 알파벳과 공백만 입력할 수 있습니다.' : lang === 'ja' ? '英字とスペースのみ使用可能です。' : lang === 'zh' ? '只能输入英文字母和空格。' : 'Only English letters and spaces are allowed.');
                      return;
                    }

                    // Check for inappropriate words
                    if (containsInappropriateWord(val)) {
                      setEnglishNameError(lang === 'ko' ? '부적절한 단어가 포함되어 있습니다. 다른 이름을 사용해주세요.' : lang === 'ja' ? '不適切な単語が含まれています。' : lang === 'zh' ? '名称中包含不当的词汇。' : 'Inappropriate content detected.');
                      return;
                    }

                    // Check for duplicate (with debounce)
                    if (englishNameDebounceRef.current) clearTimeout(englishNameDebounceRef.current);
                    englishNameDebounceRef.current = setTimeout(async () => {
                      const isDuplicate = await checkDuplicateName(val, 'en');
                      if (isDuplicate) {
                        setEnglishNameError(lang === 'ko' ? '이미 사용 중인 활동명입니다.' : lang === 'ja' ? 'すでに使用中の名前です。' : lang === 'zh' ? '该艺名已在使用中。' : 'Name already in use.');
                      }
                    }, 500);
                  }}
                  required />
                {englishNameError && <div style={{ fontSize: 11, color: '#e85d5d', marginTop: 6 }}>✗ {englishNameError}</div>}
              </div>
            </div>

            <SectionDivider label={lang === 'ko' ? '연락처' : lang === 'ja' ? '連絡先' : lang === 'zh' ? '联系方式' : 'Contact'} />

            {/* 이메일 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{f.email} *</label>
              <input style={INPUT} type="email" placeholder="artist@phosnap.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            {/* 핸드폰 + OTP 인증 */}
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'ko' ? '핸드폰 번호' : lang === 'ja' ? '携帯番号' : lang === 'zh' ? '手机号码' : 'Phone Number'} *
                {otpVerified && <span style={{ color: '#22c55e', marginLeft: 8, fontSize: 10 }}>✓ {lang === 'ko' ? '인증 완료' : lang === 'ja' ? '認証済み' : lang === 'zh' ? '已验证' : 'Verified'}</span>}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...INPUT, flex: 1, ...(otpVerified ? { borderColor: '#22c55e', background: 'rgba(34,197,94,0.04)' } : {}) }}
                  type="tel" placeholder="010-0000-0000"
                  value={phone}
                  disabled={otpVerified}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 3 && v.length <= 7) v = v.slice(0,3) + '-' + v.slice(3);
                    else if (v.length > 7) v = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7,11);
                    setPhone(v);
                    if (otpSent) { setOtpSent(false); setOtpCode(''); setOtpError(''); }
                  }}
                />
                {!otpVerified && (
                  <button type="button"
                    disabled={phone.replace(/\D/g, '').length < 10 || otpLoading || otpTimer > 0}
                    onClick={async () => {
                      setOtpLoading(true);
                      setOtpError('');
                      try {
                        const raw = phone.replace(/\D/g, '');
                        const e164 = raw.startsWith('0') ? '+82' + raw.slice(1) : '+82' + raw;
                        const { error: sendErr } = await sendPhoneOtp(e164);
                        if (sendErr) throw sendErr;
                        setOtpSent(true);
                        setOtpTimer(60);
                        if (otpTimerRef.current) clearInterval(otpTimerRef.current);
                        otpTimerRef.current = setInterval(() => {
                          setOtpTimer(prev => {
                            if (prev <= 1) { clearInterval(otpTimerRef.current); return 0; }
                            return prev - 1;
                          });
                        }, 1000);
                      } catch (err) {
                        setOtpError(lang === 'ko' ? '인증번호 발송에 실패했습니다. 번호를 확인해주세요.' :
                                    lang === 'ja' ? '認証番号の送信に失敗しました。番号を確認してください。' :
                                    lang === 'zh' ? '验证码发送失败，请检查号码。' :
                                    'Failed to send OTP. Please check your number.');
                      }
                      setOtpLoading(false);
                    }}
                    style={{
                      padding: '11px 16px', whiteSpace: 'nowrap',
                      background: phone.replace(/\D/g, '').length >= 10 && !otpLoading && otpTimer === 0 ? 'var(--gold)' : 'var(--border)',
                      border: 'none', color: phone.replace(/\D/g, '').length >= 10 ? '#0B0B0B' : 'var(--muted)',
                      fontFamily: 'var(--font-serif)', fontSize: 11, letterSpacing: '0.05em', cursor: 'pointer',
                    }}>
                    {otpLoading ? '...' :
                     otpTimer > 0 ? `${otpTimer}s` :
                     otpSent ? (lang === 'ko' ? '재전송' : lang === 'ja' ? '再送信' : lang === 'zh' ? '重新发送' : 'Resend') :
                     (lang === 'ko' ? '인증번호 받기' : lang === 'ja' ? '認証番号を取得' : lang === 'zh' ? '获取验证码' : 'Get OTP')}
                  </button>
                )}
              </div>

              {/* OTP 입력 필드 */}
              {otpSent && !otpVerified && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      style={{ ...INPUT, flex: 1, letterSpacing: '0.3em', textAlign: 'center', fontSize: 16, fontFamily: 'var(--font-serif)' }}
                      type="text" maxLength={6} placeholder="000000"
                      value={otpCode}
                      onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                      autoFocus
                    />
                    <button type="button"
                      disabled={otpCode.length !== 6 || otpLoading}
                      onClick={async () => {
                        setOtpLoading(true);
                        setOtpError('');
                        try {
                          const raw = phone.replace(/\D/g, '');
                          const e164 = raw.startsWith('0') ? '+82' + raw.slice(1) : '+82' + raw;
                          const { error: verifyErr } = await verifyPhoneOtp(e164, otpCode);
                          if (verifyErr) throw verifyErr;
                          setOtpVerified(true);
                          if (otpTimerRef.current) clearInterval(otpTimerRef.current);
                          setOtpTimer(0);
                        } catch (err) {
                          setOtpError(lang === 'ko' ? '인증번호가 올바르지 않습니다.' :
                                      lang === 'ja' ? '認証番号が正しくありません。' :
                                      lang === 'zh' ? '验证码不正确。' :
                                      'Invalid OTP code.');
                        }
                        setOtpLoading(false);
                      }}
                      style={{
                        padding: '11px 20px', whiteSpace: 'nowrap',
                        background: otpCode.length === 6 ? '#22c55e' : 'var(--border)',
                        border: 'none', color: otpCode.length === 6 ? '#fff' : 'var(--muted)',
                        fontFamily: 'var(--font-serif)', fontSize: 11, cursor: 'pointer',
                      }}>
                      {otpLoading ? '...' : (lang === 'ko' ? '확인' : lang === 'ja' ? '確認' : lang === 'zh' ? '确认' : 'Verify')}
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                    {lang === 'ko' ? '문자로 받은 6자리 인증번호를 입력해주세요.' :
                     lang === 'ja' ? 'SMSで届いた6桁の認証番号を入力してください。' :
                     lang === 'zh' ? '请输入短信收到的6位验证码。' :
                     'Enter the 6-digit code sent to your phone.'}
                    {otpTimer > 0 && (
                      <span style={{ color: otpTimer <= 10 ? '#e85d5d' : 'var(--gold)', marginLeft: 8 }}>
                        ⏱ {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* OTP 에러 */}
              {otpError && (
                <p style={{ color: '#e85d5d', fontSize: 11, marginTop: 6 }}>{otpError}</p>
              )}

              {/* 인증 완료 뱃지 */}
              {otpVerified && (
                <div style={{ marginTop: 8, padding: '8px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✓ {lang === 'ko' ? '전화번호 인증이 완료되었습니다.' :
                     lang === 'ja' ? '電話番号の認証が完了しました。' :
                     lang === 'zh' ? '手机号码验证完成。' :
                     'Phone number verified successfully.'}
                </div>
              )}
            </div>

            <SectionDivider label="개인 정보" />

            {/* 생년월일 + 주소 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{f.birthdate} *</label>
              <input style={INPUT} type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{f.address} *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...INPUT, flex: 1, background: addrBase ? 'var(--bg)' : 'var(--bg2)' }}
                  type="text" placeholder={lang === 'ko' ? '주소 검색을 눌러주세요' : 'Click search to find address'}
                  value={addrBase} readOnly />
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

            <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{f.addressDetail}</label>
              <input style={INPUT} type="text" placeholder={lang === 'ko' ? '상세주소 기재' : 'Detailed address'} value={addrDetail} onChange={e => setAddrDetail(e.target.value)} />
            </div>

            <SectionDivider label={f.password} />

            {/* 비밀번호 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 6 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{f.password} *</label>
                <input style={INPUT} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} minLength={8} maxLength={16} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{f.passwordConfirm} *</label>
                <input
                  style={{ ...INPUT, borderColor: pwConfirm && password !== pwConfirm ? '#e85d5d' : password && password === pwConfirm ? '#22c55e' : 'var(--border)' }}
                  type="password" placeholder="••••••••" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
              </div>
            </div>
            {password && (
              <div style={{ fontSize: 11, marginTop: 8, lineHeight: 1.8, color: 'var(--muted)' }}>
                <span style={{ color: password.length >= 8 && password.length <= 16 ? '#22c55e' : '#e85d5d' }}>
                  {password.length >= 8 && password.length <= 16 ? '✓' : '✗'} 8~16자
                </span>{' · '}
                <span style={{ color: /[A-Z]/.test(password) ? '#22c55e' : '#e85d5d' }}>
                  {/[A-Z]/.test(password) ? '✓' : '✗'} 대문자
                </span>{' · '}
                <span style={{ color: /[a-z]/.test(password) ? '#22c55e' : '#e85d5d' }}>
                  {/[a-z]/.test(password) ? '✓' : '✗'} 소문자
                </span>{' · '}
                <span style={{ color: /\d/.test(password) ? '#22c55e' : '#e85d5d' }}>
                  {/\d/.test(password) ? '✓' : '✗'} 숫자
                </span>{' · '}
                <span style={{ color: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) ? '#22c55e' : '#e85d5d' }}>
                  {/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) ? '✓' : '✗'} 특수문자
                </span>
              </div>
            )}
            {pwConfirm && password !== pwConfirm && (
              <p style={{ color: '#e85d5d', fontSize: 12, marginTop: 6 }}>{lang === 'ko' ? '비밀번호가 일치하지 않습니다.' : lang === 'ja' ? 'パスワードが一致しません。' : lang === 'zh' ? '密码不匹配。' : 'Passwords do not match.'}</p>
            )}

            {/* SNS · 웹사이트 (선택) */}
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 12, display: 'block', textTransform: 'uppercase' }}>
                SNS · {lang === 'ko' ? '웹사이트' : lang === 'ja' ? 'ウェブサイト' : 'Website'} ({lang === 'ko' ? '선택' : lang === 'ja' ? '任意' : 'Optional'})
              </label>
              <input style={{ ...INPUT, marginBottom: 12 }}
                type="text" placeholder={lang === 'ko' ? 'Instagram 핸들 (@ 제외)' : 'Instagram handle (without @)'}
                value={instagram} onChange={e => setInstagram(e.target.value)} />
              <input style={{ ...INPUT }}
                type="url" placeholder={lang === 'ko' ? '웹사이트 URL' : lang === 'ja' ? 'ウェブサイトURL' : 'Website URL'}
                value={website} onChange={e => setWebsite(e.target.value)} />
            </div>

            {error && <p style={{ color: '#e85d5d', fontSize: 12, marginTop: 14, lineHeight: 1.6 }}>{error}</p>}

            {!step1Valid && <ValidationHints issues={getStep1Issues()} />}

            <button className="btn-primary"
              style={{ marginTop: 28, opacity: step1Valid ? 1 : 0.4, width: '100%', justifyContent: 'center' }}
              disabled={!step1Valid}
              onClick={() => { if (step1Valid) { setError(''); setStep(2); } }}>
              {f.next} — {STEPS[1]?.label}
            </button>
          </div>
        )}

        {/* ══════════════ STEP 2: 작가 유형 ══════════════ */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
              Step 02 · {STEPS[1]?.label}
            </div>

            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.04em', marginBottom: 8 }}>
              어떤 유형의 작가로 활동하시나요?
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.7 }}>
              복수 선택이 필요하신 경우 사진+영상을 선택하세요. 가입 후 프로필에서 변경 가능합니다.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              {ARTIST_TYPES.map(at => (
                <div key={at.id}
                  onClick={() => setArtistType(at.id)}
                  style={{
                    border: `2px solid ${artistType === at.id ? 'var(--gold)' : 'var(--border)'}`,
                    padding: '20px 18px', cursor: 'pointer',
                    background: artistType === at.id ? 'rgba(232,160,32,0.06)' : 'var(--bg2)',
                    transition: 'all 0.2s', position: 'relative',
                  }}
                >
                  {artistType === at.id && (
                    <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#0B0B0B', fontSize: 10, fontWeight: 700 }}>✓</span>
                    </div>
                  )}
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{at.icon}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.04em', marginBottom: 4 }}>{at.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 8 }}>{at.sub}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>{at.desc}</div>
                </div>
              ))}
            </div>


            {!step2Valid && <ValidationHints issues={getStep2Issues()} />}

            <div style={{ display: 'flex', gap: 12, marginTop: !step2Valid ? 12 : 0 }}>
              <button className="btn-outline" onClick={() => setStep(1)}>← 이전</button>
              <button className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', opacity: step2Valid ? 1 : 0.4 }}
                disabled={!step2Valid}
                onClick={() => step2Valid && setStep(3)}>
                {f.next} — {STEPS[2]?.label}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 3: 서비스 옵션 ══════════════ */}
        {step === 3 && (
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
              Step 03 · {STEPS[2]?.label}
            </div>

            {isPhotoVideo && (
              <>
                {/* ── Q1: H&M 자체 진행 여부 ── */}
                <div style={{ border: '1px solid var(--gold-border)', padding: '24px', background: 'rgba(232,160,32,0.03)', marginBottom: 24, position: 'relative' }}>
                  <Corners />
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>
                    H&M · Hair & Makeup
                  </div>
                  <h4 style={{ fontSize: 14, fontFamily: 'var(--font-serif)', letterSpacing: '0.03em', marginBottom: 6 }}>
                    촬영 시 헤어·메이크업을 직접 진행하시나요?
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.7 }}>
                    직접 H&M을 제공하시면, 고객이 예약 시 작가님의 H&M 메뉴를 선택할 수 있습니다.
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[
                      { val: true, icon: '💄', label: '네, 직접 합니다', desc: '촬영과 함께 H&M도 제공 (함께 일하는 고정 H&M 작가 포함)' },
                      { val: false, icon: '🤝', label: '아니요', desc: '외부 스타일리스트 연결 또는 고객 자체 준비' },
                    ].map(opt => (
                      <div key={String(opt.val)}
                        onClick={() => {
                          setHmkSelf(opt.val);
                          if (!opt.val) { setHmkMenuItems([]); setHmkExternalConnect(true); }
                        }}
                        style={{
                          flex: 1, border: `2px solid ${hmkSelf === opt.val ? 'var(--gold)' : 'var(--border)'}`,
                          padding: '16px', cursor: 'pointer',
                          background: hmkSelf === opt.val ? 'rgba(232,160,32,0.06)' : 'transparent',
                          transition: 'all 0.2s', textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{opt.icon}</div>
                        <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{opt.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* H&M 메뉴는 가입 후 대시보드에서 등록 */}
                  {hmkSelf && (
                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(232,160,32,0.06)', borderLeft: '2px solid var(--gold)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
                      <span style={{ color: 'var(--gold)' }}>안내</span> · H&M 메뉴와 가격은 가입 완료 후 작가 대시보드에서 등록하실 수 있습니다.
                    </div>
                  )}
                </div>

                {/* ── 별도 H&M 작가 연결 — "아니요" 선택한 작가에게만 안내 ── */}
                {hmkSelf === false && (
                  <div style={{
                    border: `1px solid ${(hmkExternalConnect || !hmkSelf) ? 'var(--gold-border)' : 'var(--border)'}`,
                    padding: '16px 20px',
                    background: (hmkExternalConnect || !hmkSelf) ? 'rgba(232,160,32,0.06)' : 'var(--bg2)',
                    marginBottom: 24,
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    cursor: !hmkSelf ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                    onClick={() => { if (hmkSelf) setHmkExternalConnect(v => !v); }}
                  >
                    <div style={{
                      width: 20, height: 20, flexShrink: 0, marginTop: 1,
                      border: `2px solid ${hmkExternalConnect ? 'var(--gold)' : 'var(--border)'}`,
                      background: hmkExternalConnect ? 'var(--gold)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {hmkExternalConnect && <span style={{ color: '#0B0B0B', fontSize: 13, fontWeight: 'bold' }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                        💄 Phosnap H&M 작가 별도 연결
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
                        {!hmkSelf
                          ? 'H&M을 직접 진행하지 않으므로, Phosnap에 등록된 H&M 전문 작가가 자동으로 연결됩니다.'
                          : '필요시 Phosnap에 등록된 H&M 전문 작가를 매칭받을 수 있습니다. 고객 예약 시 H&M 작가가 함께 배정됩니다.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Q2: 의상 자체 보유 여부 ── */}
                <div style={{ border: '1px solid var(--gold-border)', padding: '24px', background: 'rgba(232,160,32,0.03)', marginBottom: 24, position: 'relative' }}>
                  <Corners />
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>
                    Dress · 의상 대여
                  </div>
                  <h4 style={{ fontSize: 14, fontFamily: 'var(--font-serif)', letterSpacing: '0.03em', marginBottom: 6 }}>
                    촬영용 의상을 자체 보유하고 계신가요?
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.7 }}>
                    자체 보유 시 고객이 예약할 때 의상 목록을 확인하고 선택할 수 있습니다. 보유하지 않는 경우, 연계 의상 업체를 연결하거나 고객이 직접 준비합니다.
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[
                      { val: true, icon: '👗', label: '네, 보유하고 있습니다', desc: '한복·드레스 등 자체 의상 보유' },
                      { val: false, icon: '🔗', label: '아니요', desc: '연계 업체 연결 또는 고객 자체 준비' },
                    ].map(opt => (
                      <div key={String(opt.val)}
                        onClick={() => setDressSelf(opt.val)}
                        style={{
                          flex: 1, border: `2px solid ${dressSelf === opt.val ? 'var(--gold)' : 'var(--border)'}`,
                          padding: '16px', cursor: 'pointer',
                          background: dressSelf === opt.val ? 'rgba(232,160,32,0.06)' : 'transparent',
                          transition: 'all 0.2s', textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{opt.icon}</div>
                        <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{opt.desc}</div>
                      </div>
                    ))}
                  </div>

                  {dressSelf && (
                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(232,160,32,0.06)', borderLeft: '2px solid var(--gold)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
                      <span style={{ color: 'var(--gold)' }}>안내</span> · 자체 의상 목록은 가입 완료 후 작가 대시보드에서 등록하실 수 있습니다.
                    </div>
                  )}
                </div>

                {/* 의상 미보유 시 안내 */}
                {!dressSelf && (
                  <div style={{ marginTop: 0, padding: '12px 16px', background: 'rgba(232,160,32,0.06)', borderLeft: '2px solid var(--gold)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 24 }}>
                    <span style={{ color: 'var(--gold)' }}>안내</span> · 의상이 필요한 고객은 Phosnap에 등록된 의상 벤더의 소품을 직접 선택할 수 있습니다. 별도 연계 설정은 필요하지 않습니다.
                  </div>
                )}
              </>
            )}

            {/* H&M 작가 선택 시 안내 */}
            {artistType === 'hmk' && (
              <div style={{ border: '1px solid var(--gold-border)', padding: '24px', background: 'rgba(232,160,32,0.03)', marginBottom: 24, position: 'relative' }}>
                <Corners />
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
                  <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)', fontSize: 14 }}>H&M 전문 작가</span>로 등록하셨습니다.
                  서비스 메뉴와 가격은 가입 후 대시보드에서 상세히 설정할 수 있습니다. 이 단계에서는 추가 설정이 필요 없습니다.
                </div>
              </div>
            )}

            {!isPhotoVideo && artistType !== 'hmk' && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8 }}>
                선택하신 작가 유형에는 추가 서비스 옵션이 필요하지 않습니다.<br />
                {lang === 'ko' ? '다음 단계로 진행해주세요.' : lang === 'ja' ? '次のステップに進んでください。' : lang === 'zh' ? '请进入下一步。' : 'Please proceed to the next step.'}
              </div>
            )}

            {/* 대표 포트폴리오 안내 */}
            <div style={{ border: '1px solid var(--border)', padding: '20px 24px', background: 'var(--bg2)', marginBottom: 24, position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10 }}>
                📸 대표 포트폴리오
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 0 }}>
                가입 완료 후 <span style={{ color: 'var(--gold)' }}>작가 대시보드</span>에서 대표 포트폴리오(최대 5장)를 등록하실 수 있습니다.
                고객이 작가를 검색할 때 대표 포트폴리오가 카드에 표시되므로, 가입 직후 꼭 등록해주세요!
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn-outline" onClick={() => setStep(2)}>← 이전</button>
              <button className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setStep(4)}>
                {f.next} — {STEPS[3]?.label}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 4: 초대 & 동의 ══════════════ */}
        {step === 4 && showExistingLogin && (
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
                기존 비밀번호를 입력하면 이 계정에 <strong style={{ color: 'var(--gold)' }}>작가 역할</strong>을 추가합니다.
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
                {loading ? '처리 중…' : '✦ 작가 역할 추가 및 가입 완료'}
              </button>
            </div>
          </form>
        )}

        {step === 4 && !showExistingLogin && (
          <form onSubmit={handleSubmit}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
              Step 04 · {STEPS[3]?.label}
            </div>

            {/* 초대코드 */}
            <div style={{ border: '1px solid var(--gold-border)', padding: '24px', background: 'rgba(232,160,32,0.03)', marginBottom: 28, position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12 }}>{f.referralCode}</div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
                {lang === 'ko' ? '다른 작가에게 받은 초대코드가 있으면 입력하세요. 초대한 작가가 수수료 할인 혜택을 받습니다.' : lang === 'ja' ? '他の作家から招待コードをもらった場合は入力してください。' : lang === 'zh' ? '如有其他摄影师给您的邀请码，请输入。' : 'Enter a referral code from another artist if you have one.'}
              </p>
              <input style={{ ...INPUT, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                type="text" placeholder="예) MINA1234"
                value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} />
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(232,160,32,0.06)', borderLeft: '2px solid var(--gold)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
                <span style={{ color: 'var(--gold)' }}>초대 혜택</span> · 초대한 작가 완료 5건 → 수수료 -1%p · 10건 → -2%p · 20건 → -3%p (등급 유효 3개월, 월 3건 유지) · 무제한 초대 가능
              </div>
            </div>

            {/* 동의 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>{lang === 'ko' ? '필수 동의' : lang === 'ja' ? '必須同意' : lang === 'zh' ? '必须同意' : 'Required Consent'}</div>

              {/* 전체 동의 — (선택) 포함 전부 체크, 하나라도 빠지면 해제 */}
              {(() => {
                const allChecked = agreeVisa && agreePayment && agreeTerms && agreePrivacy && agreeRefund && agreeMarketing;
                return (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '14px 16px', background: 'rgba(232,160,32,0.06)', border: '1px solid var(--gold-border)', marginBottom: 16 }}>
                    <input type="checkbox"
                      checked={allChecked}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setAgreeVisa(v);
                        setAgreePayment(v);
                        setAgreeTerms(v);
                        setAgreePrivacy(v);
                        setAgreeRefund(v);
                        setAgreeMarketing(v);
                      }}
                      style={{ accentColor: 'var(--gold)' }}
                    />
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>
                      {lang === 'ko' ? '전체 동의' : lang === 'ja' ? 'すべてに同意' : lang === 'zh' ? '全部同意' : 'Select All'}
                    </span>
                  </label>
                );
              })()}

              {[
                { key: 'visa',      checked: agreeVisa,      set: setAgreeVisa,      text: f.agreeVisa, termsData: null },
                { key: 'payment',   checked: agreePayment,   set: setAgreePayment,   text: f.agreePayment, termsData: null },
                { key: 'terms',     checked: agreeTerms,     set: setAgreeTerms,     text: f.agreeTerms, termsData: TERMS_ARTIST },
                { key: 'privacy',   checked: agreePrivacy,   set: setAgreePrivacy,   text: lang === 'ko' ? '개인정보 처리방침에 동의합니다.' : lang === 'ja' ? 'プライバシーポリシーに同意します。' : lang === 'zh' ? '同意隐私政策。' : 'I agree to the Privacy Policy.', termsData: PRIVACY },
                { key: 'refund',    checked: agreeRefund,    set: setAgreeRefund,    text: lang === 'ko' ? '환불/취소 정책에 동의합니다.' : lang === 'ja' ? '返金・キャンセルポリシーに同意します。' : lang === 'zh' ? '同意退款/取消政策。' : 'I agree to the Refund/Cancellation Policy.', termsData: REFUND_POLICY },
                { key: 'marketing', checked: agreeMarketing, set: setAgreeMarketing, text: f.agreeMarketing, termsData: null },
              ].map(item => (
                <label key={item.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 14 }}>
                  <div onClick={() => item.set(v => !v)} style={{
                    width: 18, height: 18, flexShrink: 0, marginTop: 2,
                    border: `2px solid ${item.checked ? 'var(--gold)' : 'var(--border)'}`,
                    background: item.checked ? 'var(--gold)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', cursor: 'pointer',
                  }}>
                    {item.checked && <span style={{ color: '#0B0B0B', fontSize: 10, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span onClick={() => item.set(v => !v)} style={{ fontSize: 12, color: item.checked ? 'var(--text)' : 'var(--muted)', lineHeight: 1.7, transition: 'color 0.2s', flex: 1 }}>
                    {item.text}
                  </span>
                  {item.termsData && (
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingTerms(item.termsData); }}
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontSize: 10, padding: '3px 10px', borderRadius: 2, whiteSpace: 'nowrap', fontFamily: 'var(--font-serif)', flexShrink: 0, marginTop: 1 }}>
                      보기
                    </button>
                  )}
                </label>
              ))}
            </div>

            {/* 요약 */}
            <div style={{ border: '1px solid var(--border)', padding: '20px 24px', marginBottom: 24, position: 'relative', background: 'var(--bg2)' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>{lang === 'ko' ? '가입 요약' : lang === 'ja' ? '登録概要' : lang === 'zh' ? '注册摘要' : 'Registration Summary'}</div>
              {[
                { label: '이름',     value: `${nativeName} (${englishName})` },
                { label: '이메일',   value: email },
                { label: '핸드폰',   value: phone },
                { label: '생년월일', value: birthdate },
                { label: '주소',     value: addrBase },
                { label: '작가 유형', value: ARTIST_TYPES.find(a => a.id === artistType)?.label || '' },
                isPhotoVideo && hmkSelf ? { label: 'H&M 자체', value: `메뉴 ${hmkMenuItems.length}개` } : null,
                isPhotoVideo && hmkExternalConnect ? { label: 'H&M 별도 연결', value: '신청' } : null,
                isPhotoVideo ? { label: '의상 보유', value: dressSelf ? '자체 보유' : '없음 (Phosnap 벤더 이용 가능)' } : null,
                referralCode ? { label: '초대코드', value: referralCode } : null,
              ].filter(Boolean).map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-serif)' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {error   && <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>{error}</p>}
            {success && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', padding: '16px 20px', marginBottom: 20, fontSize: 13, color: '#4ade80', lineHeight: 1.7 }}>
                {success}
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn-outline" style={{ fontSize: 12 }} onClick={() => navigate('/')}>{f.goHome}</button>
                </div>
              </div>
            )}

            {!success && (
              <>
                {!step4Valid && <ValidationHints issues={getStep4Issues()} />}
                <div style={{ display: 'flex', gap: 12, marginTop: !step4Valid ? 12 : 0 }}>
                  <button type="button" className="btn-outline" onClick={() => setStep(3)}>← {f.prev}</button>
                  <button type="submit" className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', opacity: (step4Valid && !loading) ? 1 : 0.4 }}
                    disabled={!step4Valid || loading}>
                    {loading ? (lang === 'ko' ? '가입 처리 중…' : lang === 'ja' ? '登録処理中…' : lang === 'zh' ? '注册处理中…' : 'Processing...') : `✦ ${f.submit}`}
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

export default ArtistRegister;
