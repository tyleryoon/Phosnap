import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import Chat from '../components/Chat';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getMyBookings, cancelBooking, requestReschedule, submitReview, getReviewByBookingId, submitPackageReview, submitPhotographerReview, getPackageReviewByBookingId, getPhotographerReviewByBookingId } from '../lib/supabase';

// ─── My Bookings Page  (/my-bookings) ─────────────────────────────────

const CONTENT = {
  ko: {
    title: '내 예약', sub: '결제가 완료된 예약 목록입니다.',
    empty: '아직 예약 내역이 없습니다.', emptyBtn: '작가 둘러보기',
    loading: '예약 내역을 불러오는 중...',
    loginRequired: '로그인이 필요합니다.', loginBtn: '로그인하기',
    artist: '작가', date: '촬영 날짜', time: '촬영 시간',
    pkg: '패키지', amount: '결제 금액', orderId: '주문 번호',
    paidAt: '결제 일시', cancelledAt: '취소 일시',
    statuses: { confirmed: '확정', pending: '대기', completed: '완료', cancelled: '취소', refunded: '환불', delivered: '전달 완료' },
    cancelBtn: '예약 취소',
    rescheduleBtn: '일정 변경 요청',
    // 취소 모달
    cancelTitle: '예약을 취소하시겠습니까?',
    cancelDesc: '취소 후에는 되돌릴 수 없습니다.\n환불은 아래 정책에 따라 처리됩니다.',
    refundPolicy: ['촬영일 7일 전 이상: 전액 환불', '촬영일 3~6일 전: 50% 환불', '촬영일 2일 전 이하: 환불 불가'],
    confirmCancel: '취소 확정', keepBooking: '예약 유지',
    cancelling: '취소 처리 중...', cancelSuccess: '예약이 취소되었습니다.',
    cancelError: '취소에 실패했습니다. 다시 시도해주세요.',
    // 일정 변경 모달
    rescheduleTitle: '일정 변경 요청',
    rescheduleDesc: '원하시는 변경 내용을 작성해주세요.\n작가가 확인 후 연락드립니다.',
    reschedulePlaceholder: '예: 2026-05-15 오후 2시로 변경 요청합니다.',
    sendRequest: '요청 전송', cancel: '닫기',
    sending: '전송 중...', rescheduleSuccess: '요청이 전송되었습니다.',
    rescheduleError: '전송에 실패했습니다.',
    rescheduleNote: '* 변경은 확정이 아니며, 작가 확인이 필요합니다.',
    reviewBtn: '리뷰 작성', reviewDone: '리뷰 완료',
    reviewTitle: '리뷰 작성',
    reviewDesc: '촬영은 어떠셨나요? 솔직한 후기를 남겨주세요.',
    reviewPlaceholder: '촬영 경험, 작가님의 장점, 추천 포인트 등을 자유롭게 작성해주세요.',
    reviewRating: '평점', reviewSubmit: '리뷰 등록', reviewSubmitting: '등록 중...',
    reviewSuccess: '리뷰가 등록되었습니다! 감사합니다.',
    reviewError: '리뷰 등록에 실패했습니다.',
    pkgReviewBtn: '패키지 리뷰', artistReviewBtn: '작가 리뷰',
    pkgReviewTitle: '패키지 리뷰 작성', artistReviewTitle: '작가 리뷰 작성',
    pkgReviewDesc: '예약한 패키지에 대해 평가해주세요.', artistReviewDesc: '작가님에 대해 평가해주세요.',
    reviewTitleLabel: '제목', reviewTitlePlaceholder: '한 줄 요약',
    reviewBodyLabel: '상세 리뷰', selectTags: '태그 선택',
    pkgReviewDone: '패키지 리뷰 완료', artistReviewDone: '작가 리뷰 완료',
    receivePhotos: '📁 사진 받기',
    deliveryMemo: '작가 메모',
  },
  en: {
    title: 'My Bookings', sub: 'All completed and upcoming sessions.',
    empty: 'No bookings yet.', emptyBtn: 'Browse Artists',
    loading: 'Loading your bookings...',
    loginRequired: 'Please log in to view your bookings.', loginBtn: 'Log In',
    artist: 'Artist', date: 'Session Date', time: 'Session Time',
    pkg: 'Package', amount: 'Amount Paid', orderId: 'Order ID',
    paidAt: 'Paid At', cancelledAt: 'Cancelled At',
    statuses: { confirmed: 'Confirmed', pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled', refunded: 'Refunded', delivered: 'Delivered' },
    cancelBtn: 'Cancel Booking',
    rescheduleBtn: 'Request Reschedule',
    cancelTitle: 'Cancel this booking?',
    cancelDesc: 'This action cannot be undone.\nRefunds are subject to our cancellation policy.',
    refundPolicy: ['7+ days before: Full refund', '3–6 days before: 50% refund', '2 days or less: No refund'],
    confirmCancel: 'Confirm Cancellation', keepBooking: 'Keep Booking',
    cancelling: 'Cancelling...', cancelSuccess: 'Booking cancelled.',
    cancelError: 'Cancellation failed. Please try again.',
    rescheduleTitle: 'Request Reschedule',
    rescheduleDesc: 'Describe the changes you\'d like.\nThe artist will review and contact you.',
    reschedulePlaceholder: 'e.g. Please reschedule to May 15, 2026 at 2:00 PM.',
    sendRequest: 'Send Request', cancel: 'Close',
    sending: 'Sending...', rescheduleSuccess: 'Request sent successfully.',
    rescheduleError: 'Failed to send request.',
    rescheduleNote: '* Reschedule is not confirmed until the artist responds.',
    reviewBtn: 'Write Review', reviewDone: 'Reviewed',
    reviewTitle: 'Write a Review',
    reviewDesc: 'How was your session? Share your experience.',
    reviewPlaceholder: 'Tell us about the session, the artist\'s strengths, and what you loved.',
    reviewRating: 'Rating', reviewSubmit: 'Submit Review', reviewSubmitting: 'Submitting...',
    reviewSuccess: 'Review submitted! Thank you.',
    reviewError: 'Failed to submit review.',
    pkgReviewBtn: 'Package Review', artistReviewBtn: 'Artist Review',
    pkgReviewTitle: 'Write Package Review', artistReviewTitle: 'Write Artist Review',
    pkgReviewDesc: 'Rate the package you booked.', artistReviewDesc: 'Rate the photographer.',
    reviewTitleLabel: 'Title', reviewTitlePlaceholder: 'One-line summary',
    reviewBodyLabel: 'Detailed Review', selectTags: 'Select Tags',
    pkgReviewDone: 'Package Reviewed', artistReviewDone: 'Artist Reviewed',
    receivePhotos: '📁 Receive Photos',
    deliveryMemo: 'Artist Note',
  },
  ja: {
    title: '予約一覧', sub: '決済が完了した予約の一覧です。',
    empty: 'まだ予約がありません。', emptyBtn: '作家を探す',
    loading: '予約を読み込んでいます...',
    loginRequired: 'ログインが必要です。', loginBtn: 'ログイン',
    artist: '作家', date: '撮影日', time: '撮影時間',
    pkg: 'パッケージ', amount: '金額', orderId: '注文番号',
    paidAt: '決済日時', cancelledAt: 'キャンセル日時',
    statuses: { confirmed: '確定', pending: '保留中', completed: '完了', cancelled: 'キャンセル', refunded: '返金済', delivered: '送信済み' },
    cancelBtn: '予約キャンセル',
    rescheduleBtn: '日程変更リクエスト',
    cancelTitle: '予約をキャンセルしますか？',
    cancelDesc: 'この操作は元に戻せません。\n返金はキャンセルポリシーに従います。',
    refundPolicy: ['撮影日7日以上前：全額返金', '撮影日3〜6日前：50%返金', '撮影日2日以内：返金不可'],
    confirmCancel: 'キャンセル確定', keepBooking: '予約を維持',
    cancelling: 'キャンセル処理中...', cancelSuccess: '予約がキャンセルされました。',
    cancelError: 'キャンセルに失敗しました。',
    rescheduleTitle: '日程変更リクエスト',
    rescheduleDesc: '変更内容をご記入ください。\n作家が確認後にご連絡いたします。',
    reschedulePlaceholder: '例：2026年5月15日14時に変更希望',
    sendRequest: '送信', cancel: '閉じる',
    sending: '送信中...', rescheduleSuccess: 'リクエストが送信されました。',
    rescheduleError: '送信に失敗しました。',
    rescheduleNote: '※変更は作家の確認が取れてから確定となります。',
    reviewBtn: 'レビュー作成', reviewDone: 'レビュー済み',
    reviewTitle: 'レビュー作成',
    reviewDesc: '撮影はいかがでしたか？率直なご感想をお聞かせください。',
    reviewPlaceholder: '撮影体験、作家の良い点、おすすめポイントなどを自由にお書きください。',
    reviewRating: '評価', reviewSubmit: 'レビューを投稿', reviewSubmitting: '投稿中...',
    reviewSuccess: 'レビューが投稿されました！ありがとうございます。',
    reviewError: 'レビューの投稿に失敗しました。',
    pkgReviewBtn: 'パッケージレビュー', artistReviewBtn: '作家レビュー',
    pkgReviewTitle: 'パッケージレビュー作成', artistReviewTitle: '作家レビュー作成',
    pkgReviewDesc: '予約したパッケージについて評価してください。', artistReviewDesc: '作家について評価してください。',
    reviewTitleLabel: 'タイトル', reviewTitlePlaceholder: '一行まとめ',
    reviewBodyLabel: '詳細レビュー', selectTags: 'タグ選択',
    pkgReviewDone: 'パッケージレビュー済み', artistReviewDone: '作家レビュー済み',
    receivePhotos: '📁 写真を受け取る',
    deliveryMemo: '作家メモ',
  },
  zh: {
    title: '我的预约', sub: '已完成支付的预约列表。',
    empty: '暂无预约记录。', emptyBtn: '浏览摄影师',
    loading: '正在加载预约...',
    loginRequired: '请登录查看您的预约。', loginBtn: '登录',
    artist: '摄影师', date: '拍摄日期', time: '拍摄时间',
    pkg: '套餐', amount: '支付金额', orderId: '订单号',
    paidAt: '支付时间', cancelledAt: '取消时间',
    statuses: { confirmed: '已确认', pending: '待处理', completed: '已完成', cancelled: '已取消', refunded: '已退款', delivered: '已交付' },
    cancelBtn: '取消预约',
    rescheduleBtn: '申请改期',
    cancelTitle: '确认取消预约？',
    cancelDesc: '此操作无法撤销。\n退款将按取消政策处理。',
    refundPolicy: ['拍摄日7天以上前：全额退款', '拍摄日3-6天前：退款50%', '拍摄日2天以内：不予退款'],
    confirmCancel: '确认取消', keepBooking: '保留预约',
    cancelling: '取消中...', cancelSuccess: '预约已取消。',
    cancelError: '取消失败，请重试。',
    rescheduleTitle: '申请改期',
    rescheduleDesc: '请描述您希望的更改内容。\n摄影师确认后会与您联系。',
    reschedulePlaceholder: '例：请改约为2026年5月15日下午2点。',
    sendRequest: '发送申请', cancel: '关闭',
    sending: '发送中...', rescheduleSuccess: '申请已发送。',
    rescheduleError: '发送失败。',
    rescheduleNote: '* 改期需摄影师确认后方可生效。',
    reviewBtn: '写评价', reviewDone: '已评价',
    reviewTitle: '撰写评价',
    reviewDesc: '拍摄体验如何？请分享您的真实感受。',
    reviewPlaceholder: '请写下您的拍摄体验、摄影师的优点及推荐理由。',
    reviewRating: '评分', reviewSubmit: '提交评价', reviewSubmitting: '提交中...',
    reviewSuccess: '评价已提交！谢谢您。',
    reviewError: '评价提交失败。',
    pkgReviewBtn: '套餐评价', artistReviewBtn: '摄影师评价',
    pkgReviewTitle: '撰写套餐评价', artistReviewTitle: '撰写摄影师评价',
    pkgReviewDesc: '请评价您预订的套餐。', artistReviewDesc: '请评价摄影师。',
    reviewTitleLabel: '标题', reviewTitlePlaceholder: '一句话总结',
    reviewBodyLabel: '详细评价', selectTags: '选择标签',
    pkgReviewDone: '套餐已评价', artistReviewDone: '摄影师已评价',
    receivePhotos: '📁 接收照片',
    deliveryMemo: '摄影师备注',
  },
};

const STATUS_STYLE = {
  confirmed: { bg: 'rgba(72,187,120,0.12)',  color: '#48bb78',      border: 'rgba(72,187,120,0.35)' },
  pending:   { bg: 'rgba(232,160,32,0.12)',  color: 'var(--gold)',  border: 'rgba(232,160,32,0.35)' },
  completed: { bg: 'rgba(160,174,192,0.1)',  color: 'var(--muted)', border: 'rgba(160,174,192,0.25)' },
  cancelled: { bg: 'rgba(245,101,101,0.1)',  color: '#f56565',      border: 'rgba(245,101,101,0.3)' },
  refunded:  { bg: 'rgba(160,174,192,0.1)',  color: 'var(--muted)', border: 'rgba(160,174,192,0.25)' },
  delivered: { bg: 'rgba(66,153,225,0.12)', color: '#4299e1', border: 'rgba(66,153,225,0.35)' },
};

const fmt = (n) => Number(n).toLocaleString();
const fmtDatetime = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

const REVIEW_TAGS = {
  ko: ['친절해요', '소통 잘돼요', '결과물 최고', '시간 엄수', '추천해요', '재예약 의향 있어요', '분위기 좋아요', '전문적이에요'],
  en: ['Friendly', 'Great Communication', 'Amazing Results', 'Punctual', 'Highly Recommend', 'Would Rebook', 'Great Vibe', 'Professional'],
  ja: ['親切', 'コミュ力抜群', '最高の仕上がり', '時間厳守', 'おすすめ', 'リピートしたい', '雰囲気◎', 'プロフェッショナル'],
  zh: ['亲切友好', '沟通顺畅', '成果卓越', '准时守约', '强烈推荐', '愿意再约', '氛围很好', '非常专业'],
};

// ─── 모달 공통 래퍼 ───────────────────────────────────────────────────
const Modal = ({ onClose, children }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 999,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  }} onClick={onClose}>
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--gold-border)',
      maxWidth: 480, width: '100%', padding: '40px 36px',
      position: 'relative',
    }} onClick={e => e.stopPropagation()}>
      <Corners />
      {children}
    </div>
  </div>
);

// ─── 취소 확인 모달 ───────────────────────────────────────────────────
const CancelModal = ({ booking, c, onConfirm, onClose, loading }) => (
  <Modal onClose={onClose}>
    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 20 }}>
      {c.cancelTitle}
    </div>
    <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, whiteSpace: 'pre-line', marginBottom: 20 }}>{c.cancelDesc}</p>

    {/* 예약 요약 */}
    <div style={{ padding: '16px 20px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', marginBottom: 20, fontSize: 13 }}>
      <div style={{ color: 'var(--text)', marginBottom: 4 }}>{booking.photographer_name} · {booking.date}</div>
      <div style={{ color: 'var(--muted)' }}>{booking.package_name} · ₩{fmt(booking.total_price)}</div>
    </div>

    {/* 환불 정책 */}
    <div style={{ marginBottom: 28 }}>
      {c.refundPolicy.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <span style={{ color: 'var(--gold)', fontSize: 10, marginTop: 2, flexShrink: 0 }}>—</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p}</span>
        </div>
      ))}
    </div>

    <div style={{ display: 'flex', gap: 12 }}>
      <button
        className="btn-primary"
        style={{ flex: 1, background: '#c53030', borderColor: '#c53030' }}
        onClick={onConfirm}
        disabled={loading}
      >
        {loading ? c.cancelling : c.confirmCancel}
      </button>
      <button className="btn-outline" onClick={onClose} disabled={loading}>
        {c.keepBooking}
      </button>
    </div>
  </Modal>
);

// ─── 일정 변경 모달 ───────────────────────────────────────────────────
const RescheduleModal = ({ booking, c, onConfirm, onClose, loading }) => {
  const [message, setMessage] = useState('');
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 20 }}>
        {c.rescheduleTitle}
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, whiteSpace: 'pre-line', marginBottom: 16 }}>{c.rescheduleDesc}</p>

      {/* 예약 요약 */}
      <div style={{ padding: '12px 16px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', marginBottom: 16, fontSize: 12, color: 'var(--muted)' }}>
        {booking.photographer_name} · {booking.date} {booking.time}
      </div>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={c.reschedulePlaceholder}
        rows={4}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--bg)', border: '1px solid var(--border)',
          color: 'var(--text)', padding: '12px 14px',
          fontSize: 13, lineHeight: 1.7, resize: 'vertical',
          fontFamily: 'var(--font-body)',
          outline: 'none', marginBottom: 8,
        }}
      />
      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 24 }}>{c.rescheduleNote}</p>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={() => onConfirm(message)}
          disabled={loading || !message.trim()}
        >
          {loading ? c.sending : c.sendRequest}
        </button>
        <button className="btn-outline" onClick={onClose} disabled={loading}>
          {c.cancel}
        </button>
      </div>
    </Modal>
  );
};

// ─── 패키지 리뷰 모달 ────────────────────────────────────────────────
const PackageReviewModal = ({ booking, c, onConfirm, onClose, loading }) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hoverStar, setHoverStar] = useState(0);

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 20 }}>
        {c.pkgReviewTitle}
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 16 }}>{c.pkgReviewDesc}</p>

      {/* 예약 요약 */}
      <div style={{ padding: '12px 16px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', marginBottom: 20, fontSize: 12, color: 'var(--muted)' }}>
        {booking.photographer_name} · {booking.date}
      </div>

      {/* 별점 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
          {c.reviewRating}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <span
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverStar(star)}
              onMouseLeave={() => setHoverStar(0)}
              style={{
                fontSize: 28, cursor: 'pointer',
                color: star <= (hoverStar || rating) ? 'var(--gold)' : 'var(--border)',
                transition: 'color 0.15s',
              }}
            >
              ★
            </span>
          ))}
          <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8, alignSelf: 'center' }}>{rating}/5</span>
        </div>
      </div>

      {/* 제목 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
          {c.reviewTitleLabel}
        </div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={c.reviewTitlePlaceholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '10px 12px',
            fontSize: 13, fontFamily: 'var(--font-body)',
            outline: 'none', marginBottom: 12,
          }}
        />
      </div>

      {/* 상세 리뷰 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
          {c.reviewBodyLabel}
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={c.reviewPlaceholder}
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '12px 14px',
            fontSize: 13, lineHeight: 1.7, resize: 'vertical',
            fontFamily: 'var(--font-body)',
            outline: 'none', marginBottom: 20,
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={() => onConfirm({ rating, title, body })}
          disabled={loading || !body.trim()}
        >
          {loading ? c.reviewSubmitting : c.reviewSubmit}
        </button>
        <button className="btn-outline" onClick={onClose} disabled={loading}>
          {c.cancel || '닫기'}
        </button>
      </div>
    </Modal>
  );
};

// ─── 작가 리뷰 모달 ──────────────────────────────────────────────────
const ArtistReviewModal = ({ booking, c, onConfirm, onClose, loading, lang }) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [hoverStar, setHoverStar] = useState(0);
  const tags = REVIEW_TAGS[lang] || REVIEW_TAGS['ko'];

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 20 }}>
        {c.artistReviewTitle}
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 16 }}>{c.artistReviewDesc}</p>

      {/* 예약 요약 */}
      <div style={{ padding: '12px 16px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', marginBottom: 20, fontSize: 12, color: 'var(--muted)' }}>
        {booking.photographer_name} · {booking.date}
      </div>

      {/* 별점 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
          {c.reviewRating}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <span
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverStar(star)}
              onMouseLeave={() => setHoverStar(0)}
              style={{
                fontSize: 28, cursor: 'pointer',
                color: star <= (hoverStar || rating) ? 'var(--gold)' : 'var(--border)',
                transition: 'color 0.15s',
              }}
            >
              ★
            </span>
          ))}
          <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8, alignSelf: 'center' }}>{rating}/5</span>
        </div>
      </div>

      {/* 제목 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
          {c.reviewTitleLabel}
        </div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={c.reviewTitlePlaceholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '10px 12px',
            fontSize: 13, fontFamily: 'var(--font-body)',
            outline: 'none', marginBottom: 12,
          }}
        />
      </div>

      {/* 상세 리뷰 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
          {c.reviewBodyLabel}
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={c.reviewPlaceholder}
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '12px 14px',
            fontSize: 13, lineHeight: 1.7, resize: 'vertical',
            fontFamily: 'var(--font-body)',
            outline: 'none', marginBottom: 16,
          }}
        />
      </div>

      {/* 태그 선택 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
          {c.selectTags}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              style={{
                padding: '6px 12px', borderRadius: 3,
                background: selectedTags.includes(tag) ? 'var(--gold)' : 'transparent',
                border: `1px solid ${selectedTags.includes(tag) ? 'var(--gold)' : 'var(--border)'}`,
                color: selectedTags.includes(tag) ? 'var(--bg2)' : 'var(--text)',
                fontSize: 11, fontFamily: 'var(--font-body)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={() => onConfirm({ rating, title, body, tags: selectedTags })}
          disabled={loading || !body.trim()}
        >
          {loading ? c.reviewSubmitting : c.reviewSubmit}
        </button>
        <button className="btn-outline" onClick={onClose} disabled={loading}>
          {c.cancel || '닫기'}
        </button>
      </div>
    </Modal>
  );
};

// ─── 예약 카드 ────────────────────────────────────────────────────────
const BookingCard = ({ booking, c, onCancel, onReschedule, onPkgReview, onArtistReview, onChat, reviewedPkgBookings, reviewedArtistBookings }) => {
  const s = STATUS_STYLE[booking.status] || STATUS_STYLE.pending;
  const statusLabel = c.statuses[booking.status] || booking.status;
  const canCancel    = booking.status === 'confirmed' || booking.status === 'pending';
  const canReschedule = booking.status === 'confirmed';
  const reviewEligible = booking.status === 'completed' || booking.status === 'delivered';
  const canPkgReview = reviewEligible && !reviewedPkgBookings?.has(booking.id);
  const hasPkgReview = reviewedPkgBookings?.has(booking.id);
  const canArtistReview = reviewEligible && !reviewedArtistBookings?.has(booking.id);
  const hasArtistReview = reviewedArtistBookings?.has(booking.id);

  return (
    <div style={{
      border: '1px solid var(--gold-border)',
      background: booking.status === 'cancelled' ? 'var(--bg2)' : 'var(--gold-dim)',
      padding: '28px 32px', position: 'relative', marginBottom: 20,
      opacity: booking.status === 'cancelled' ? 0.65 : 1,
      transition: 'opacity 0.3s',
    }}>
      <Corners />

      {/* 헤더: 상태 배지 + 날짜/시간 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{
          display: 'inline-block', padding: '4px 10px', borderRadius: 3,
          background: s.bg, border: `1px solid ${s.border}`, color: s.color,
          fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.06em',
        }}>
          {statusLabel}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
          {booking.date}{booking.time ? ` · ${booking.time}` : ''}
        </span>
      </div>

      {/* 작가명 + 패키지 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', color: 'var(--text)', marginBottom: 4 }}>
          {booking.photographer_name || '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
          {booking.package_name}
        </div>
      </div>

      {/* 세부 정보 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', paddingTop: 16, borderTop: '1px solid rgba(232,160,32,0.15)', marginBottom: 20 }}>
        {[
          { label: c.amount,  value: booking.total_price ? `₩${fmt(booking.total_price)}` : '' },
          { label: c.paidAt,  value: booking.paid_at ? fmtDatetime(booking.paid_at) : '' },
          { label: c.orderId, value: booking.toss_order_id },
          booking.cancelled_at && { label: c.cancelledAt, value: fmtDatetime(booking.cancelled_at) },
        ].filter(Boolean).filter(r => r.value).map(row => (
          <div key={row.label}>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 3 }}>
              {row.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-serif)', wordBreak: 'break-all' }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>

      {/* 일정 변경 요청 메모 표시 */}
      {booking.reschedule_request && (
        <div style={{
          padding: '10px 14px', background: 'rgba(232,160,32,0.07)',
          border: '1px solid rgba(232,160,32,0.2)', marginBottom: 16,
          fontSize: 12, color: 'var(--muted)', lineHeight: 1.6,
        }}>
          📋 변경 요청: {booking.reschedule_request}
        </div>
      )}

      {/* 사진 전달 섹션 */}
      {booking.status === 'delivered' && booking.delivery_url && (
        <div style={{ marginBottom: 16 }}>
          {booking.delivery_memo && (
            <div style={{
              padding: '12px 14px', background: 'rgba(66,153,225,0.07)',
              border: '1px solid rgba(66,153,225,0.2)', marginBottom: 12,
              fontSize: 12, color: 'var(--muted)', lineHeight: 1.6,
            }}>
              <div style={{ fontSize: 10, color: '#4299e1', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 4 }}>
                {c.deliveryMemo}
              </div>
              {booking.delivery_memo}
            </div>
          )}
          <button
            onClick={() => window.open(booking.delivery_url, '_blank')}
            style={{
              padding: '10px 16px', background: 'rgba(66,153,225,0.1)',
              border: '1px solid rgba(66,153,225,0.35)', color: '#4299e1',
              fontSize: 12, fontFamily: 'var(--font-serif)', letterSpacing: '0.08em',
              cursor: 'pointer', borderRadius: 2,
            }}
          >
            {c.receivePhotos}
          </button>
        </div>
      )}

      {/* 액션 버튼 */}
      {(canCancel || canReschedule || canPkgReview || hasPkgReview || canArtistReview || hasArtistReview || booking.status === 'confirmed' || booking.status === 'completed' || booking.status === 'delivered') && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(booking.status === 'confirmed' || booking.status === 'completed' || booking.status === 'delivered') && (
            <button
              style={{
                fontSize: 11, padding: '8px 14px',
                background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)',
                fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', cursor: 'pointer',
                borderRadius: 2,
              }}
              onClick={() => onChat(booking)}
            >
              💬 Chat
            </button>
          )}
          {canPkgReview && (
            <button
              className="btn-primary"
              style={{ fontSize: 11, padding: '8px 16px' }}
              onClick={() => onPkgReview(booking)}
            >
              {c.pkgReviewBtn}
            </button>
          )}
          {hasPkgReview && (
            <span style={{
              fontSize: 11, padding: '8px 16px', color: '#48bb78',
              border: '1px solid rgba(72,187,120,0.3)', background: 'rgba(72,187,120,0.08)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              ✓ {c.pkgReviewDone}
            </span>
          )}
          {canArtistReview && (
            <button
              className="btn-primary"
              style={{ fontSize: 11, padding: '8px 16px' }}
              onClick={() => onArtistReview(booking)}
            >
              {c.artistReviewBtn}
            </button>
          )}
          {hasArtistReview && (
            <span style={{
              fontSize: 11, padding: '8px 16px', color: '#48bb78',
              border: '1px solid rgba(72,187,120,0.3)', background: 'rgba(72,187,120,0.08)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              ✓ {c.artistReviewDone}
            </span>
          )}
          {canReschedule && (
            <button
              className="btn-outline"
              style={{ fontSize: 11, padding: '8px 16px' }}
              onClick={() => onReschedule(booking)}
            >
              {c.rescheduleBtn}
            </button>
          )}
          {canCancel && (
            <button
              className="btn-ghost"
              style={{ fontSize: 11, padding: '8px 16px', color: '#f56565', borderColor: 'rgba(245,101,101,0.4)' }}
              onClick={() => onCancel(booking)}
            >
              {c.cancelBtn}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────
const MyBookings = () => {
  const { lang }     = useLanguage();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const navigate     = useNavigate();
  const c = CONTENT[lang] ?? CONTENT['ko'];

  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // 취소 모달
  const [cancelTarget,  setCancelTarget]  = useState(null);  // 취소할 booking 객체
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMsg,     setCancelMsg]     = useState('');

  // 일정 변경 모달
  const [rescheduleTarget,  setRescheduleTarget]  = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleMsg,     setRescheduleMsg]     = useState('');

  // 패키지 리뷰 모달
  const [pkgReviewTarget,      setPkgReviewTarget]      = useState(null);
  const [pkgReviewLoading,     setPkgReviewLoading]     = useState(false);
  const [pkgReviewMsg,         setPkgReviewMsg]         = useState('');
  const [reviewedPkgBookings,  setReviewedPkgBookings]  = useState(new Set());

  // 작가 리뷰 모달
  const [artistReviewTarget,      setArtistReviewTarget]      = useState(null);
  const [artistReviewLoading,     setArtistReviewLoading]     = useState(false);
  const [artistReviewMsg,         setArtistReviewMsg]         = useState('');
  const [reviewedArtistBookings,  setReviewedArtistBookings]  = useState(new Set());

  // 채팅
  const [chatBookingId, setChatBookingId] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const { data, error } = await getMyBookings();
      if (error) setError(error.message);
      else {
        setBookings(data);
        // 완료된 예약에 대해 패키지/작가 리뷰 여부 확인
        const completed = data.filter(b => b.status === 'completed' || b.status === 'delivered');
        const reviewedPkg = new Set();
        const reviewedArtist = new Set();
        for (const b of completed) {
          const pkgRev = await getPackageReviewByBookingId(b.id);
          if (pkgRev) reviewedPkg.add(b.id);
          const artistRev = await getPhotographerReviewByBookingId(b.id);
          if (artistRev) reviewedArtist.add(b.id);
        }
        setReviewedPkgBookings(reviewedPkg);
        setReviewedArtistBookings(reviewedArtist);
      }
      setLoading(false);
    };
    load();
  }, [isLoggedIn, authLoading]);

  // ── 취소 처리 ──
  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    setCancelMsg('');
    const { error } = await cancelBooking(cancelTarget.id);
    if (error) {
      setCancelMsg(c.cancelError);
      setCancelLoading(false);
    } else {
      // 목록에서 상태 업데이트
      setBookings(prev => prev.map(b =>
        b.id === cancelTarget.id
          ? { ...b, status: 'cancelled', cancelled_at: new Date().toISOString() }
          : b
      ));
      setCancelTarget(null);
      setCancelMsg(c.cancelSuccess);
      setCancelLoading(false);
    }
  };

  // ── 일정 변경 요청 처리 ──
  const handleRescheduleConfirm = async (message) => {
    if (!rescheduleTarget || !message.trim()) return;
    setRescheduleLoading(true);
    setRescheduleMsg('');
    const { error } = await requestReschedule(rescheduleTarget.id, message);
    if (error) {
      setRescheduleMsg(c.rescheduleError);
      setRescheduleLoading(false);
    } else {
      setBookings(prev => prev.map(b =>
        b.id === rescheduleTarget.id ? { ...b, reschedule_request: message } : b
      ));
      setRescheduleTarget(null);
      setRescheduleMsg(c.rescheduleSuccess);
      setRescheduleLoading(false);
    }
  };

  // ── 패키지 리뷰 처리 ──
  const handlePkgReviewConfirm = async ({ rating, title, body }) => {
    if (!pkgReviewTarget) return;
    setPkgReviewLoading(true);
    setPkgReviewMsg('');
    const { error } = await submitPackageReview({
      photographer_id: pkgReviewTarget.photographer_id,
      booking_id:      pkgReviewTarget.id,
      package_id:      pkgReviewTarget.package_id,
      rating,
      title,
      body,
    });
    if (error) {
      setPkgReviewMsg(c.reviewError);
      setPkgReviewLoading(false);
    } else {
      setReviewedPkgBookings(prev => new Set([...prev, pkgReviewTarget.id]));
      setPkgReviewTarget(null);
      setPkgReviewMsg(c.reviewSuccess);
      setPkgReviewLoading(false);
    }
  };

  // ── 작가 리뷰 처리 ──
  const handleArtistReviewConfirm = async ({ rating, title, body, tags }) => {
    if (!artistReviewTarget) return;
    setArtistReviewLoading(true);
    setArtistReviewMsg('');
    const { error } = await submitPhotographerReview({
      photographer_id: artistReviewTarget.photographer_id,
      booking_id:      artistReviewTarget.id,
      rating,
      title,
      body,
      tags,
    });
    if (error) {
      setArtistReviewMsg(c.reviewError);
      setArtistReviewLoading(false);
    } else {
      setReviewedArtistBookings(prev => new Set([...prev, artistReviewTarget.id]));
      setArtistReviewTarget(null);
      setArtistReviewMsg(c.reviewSuccess);
      setArtistReviewLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* ── 헤더 ── */}
        <div style={{ marginBottom: 40 }}>
          <div className="section-label">{c.title}</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(22px, 4vw, 36px)', marginBottom: 8 }}>{c.title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-elegant)', fontStyle: 'italic' }}>{c.sub}</p>
        </div>

        {/* 취소/변경/리뷰 결과 메시지 */}
        {(cancelMsg || rescheduleMsg || pkgReviewMsg || artistReviewMsg) && (
          <div style={{
            padding: '12px 18px', marginBottom: 20,
            background: 'rgba(72,187,120,0.08)', border: '1px solid rgba(72,187,120,0.3)',
            color: '#48bb78', fontSize: 13,
          }}>
            {cancelMsg || rescheduleMsg || pkgReviewMsg || artistReviewMsg}
          </div>
        )}

        {/* 로그인 필요 */}
        {!authLoading && !isLoggedIn && (
          <div style={{ textAlign: 'center', padding: '80px 24px', border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
            <Corners />
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>{c.loginRequired}</p>
            <button className="btn-primary" onClick={() => navigate('/')}>{c.loginBtn}</button>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 13 }}>{c.loading}</div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div style={{ padding: '14px 18px', background: 'rgba(245,101,101,0.08)', border: '1px solid rgba(245,101,101,0.3)', color: '#f56565', fontSize: 13, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {/* 빈 목록 */}
        {!loading && !error && isLoggedIn && bookings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
            <Corners />
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>{c.empty}</p>
            <Link to="/photographers" className="btn-primary" style={{ textDecoration: 'none' }}>{c.emptyBtn}</Link>
          </div>
        )}

        {/* 예약 목록 */}
        {!loading && bookings.length > 0 && bookings.map(b => (
          <BookingCard
            key={b.id}
            booking={b}
            c={c}
            onCancel={setCancelTarget}
            onReschedule={setRescheduleTarget}
            onPkgReview={setPkgReviewTarget}
            onArtistReview={setArtistReviewTarget}
            onChat={setChatBookingId}
            reviewedPkgBookings={reviewedPkgBookings}
            reviewedArtistBookings={reviewedArtistBookings}
          />
        ))}

      </div>
      <Footer />

      {/* 취소 모달 */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          c={c}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelTarget(null)}
          loading={cancelLoading}
        />
      )}

      {/* 일정 변경 모달 */}
      {rescheduleTarget && (
        <RescheduleModal
          booking={rescheduleTarget}
          c={c}
          onConfirm={handleRescheduleConfirm}
          onClose={() => setRescheduleTarget(null)}
          loading={rescheduleLoading}
        />
      )}

      {/* 패키지 리뷰 작성 모달 */}
      {pkgReviewTarget && (
        <PackageReviewModal
          booking={pkgReviewTarget}
          c={c}
          onConfirm={handlePkgReviewConfirm}
          onClose={() => setPkgReviewTarget(null)}
          loading={pkgReviewLoading}
        />
      )}

      {/* 작가 리뷰 작성 모달 */}
      {artistReviewTarget && (
        <ArtistReviewModal
          booking={artistReviewTarget}
          c={c}
          onConfirm={handleArtistReviewConfirm}
          onClose={() => setArtistReviewTarget(null)}
          loading={artistReviewLoading}
          lang={lang}
        />
      )}

      {/* ── 채팅 컴포넌트 ── */}
      <Chat bookingId={chatBookingId} isOpen={!!chatBookingId} onClose={() => setChatBookingId(null)} />
    </div>
  );
};

export default MyBookings;
