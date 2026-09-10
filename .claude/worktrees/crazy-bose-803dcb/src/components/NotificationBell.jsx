/**
 * NotificationBell — 헤더 알림 벨 아이콘 + 드롭다운 패널
 * Supabase Realtime으로 새 알림 실시간 수신
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeNotifications,
  unsubscribeNotifications,
} from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const NOTIF_ICONS = {
  booking_new: '📋',
  booking_confirmed: '✅',
  booking_rejected: '❌',
  booking_cancelled: '🚫',
  review_new: '⭐',
  message_new: '💬',
  payment_received: '💰',
  system: '🔔',
  info: 'ℹ️',
};

const timeAgo = (dateStr, lang = 'ko') => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'ko' ? '방금' : 'just now';
  if (mins < 60) return lang === 'ko' ? `${mins}분 전` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === 'ko' ? `${hrs}시간 전` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return lang === 'ko' ? `${days}일 전` : `${days}d ago`;
};

const NotificationBell = () => {
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const channelRef = useRef(null);

  // 알림 로드
  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    const [{ data }, count] = await Promise.all([
      getMyNotifications(20),
      getUnreadNotificationCount(),
    ]);
    setNotifications(data);
    setUnreadCount(count);
    setLoading(false);
  }, [isLoggedIn]);

  // 마운트 시 로드 + Realtime 구독
  useEffect(() => {
    if (!isLoggedIn) return;
    loadNotifications();

    const setupRealtime = async () => {
      const ch = await subscribeNotifications((newNotif) => {
        setNotifications(prev => [newNotif, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
      });
      channelRef.current = ch;
    };
    setupRealtime();

    return () => {
      if (channelRef.current) {
        unsubscribeNotifications(channelRef.current);
      }
    };
  }, [isLoggedIn, loadNotifications]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // 알림 클릭
  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (notif.link) {
      window.location.href = notif.link;
      setOpen(false);
    }
  };

  // 전체 읽음
  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  if (!isLoggedIn) return null;

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* 벨 아이콘 */}
      <button
        onClick={() => { setOpen(!open); if (!open) loadNotifications(); }}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '6px 8px', position: 'relative',
          color: 'var(--muted)', fontSize: 18,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
        title={lang === 'ko' ? '알림' : 'Notifications'}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: unreadCount > 9 ? 18 : 14, height: 14,
            borderRadius: 7, background: '#e85d5d',
            color: '#fff', fontSize: 9, fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0,
          width: 340, maxHeight: 440, overflowY: 'auto',
          background: 'var(--bg)', border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 1500,
        }}>
          {/* 헤더 */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{
              fontFamily: 'var(--font-serif)', fontSize: 13,
              letterSpacing: '0.08em', color: 'var(--text)',
            }}>
              {lang === 'ko' ? '알림' : 'Notifications'}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--gold)', fontSize: 11, cursor: 'pointer',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                {lang === 'ko' ? '모두 읽음' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              {lang === 'ko' ? '로딩...' : 'Loading...'}
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              {lang === 'ko' ? '알림이 없습니다' : 'No notifications'}
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: notif.link ? 'pointer' : 'default',
                  background: notif.is_read ? 'transparent' : 'rgba(232,160,32,0.04)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(232,160,32,0.04)'}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>
                  {NOTIF_ICONS[notif.type] || '🔔'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: 'var(--text)',
                    fontWeight: notif.is_read ? 'normal' : '600',
                    marginBottom: 3,
                  }}>
                    {notif.title}
                  </div>
                  {notif.body && (
                    <div style={{
                      fontSize: 12, color: 'var(--muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {notif.body}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                    {timeAgo(notif.created_at, lang)}
                  </div>
                </div>
                {!notif.is_read && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#e85d5d', flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
