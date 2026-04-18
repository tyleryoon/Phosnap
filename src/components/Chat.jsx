import { useState, useEffect, useRef } from 'react';
import Corners from './Corners';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getChannelMessages,
  sendChannelMessage,
  getChannelUnreadCount,
  markChannelAsRead,
  getChatChannels,
  CHANNEL_CONFIG,
  PARTICIPANT_TYPES,
} from '../data/chat';

// ─── Multilingual Chat UI ─────────────────────────────────────────────
const CHAT_I18N = {
  ko: {
    title: '채팅',
    placeholder: '메시지를 입력하세요...',
    send: '전송',
    loading: '메시지 불러오는 중...',
    empty: '아직 메시지가 없습니다. 대화를 시작해보세요!',
    you: '나',
    error: '메시지 전송에 실패했습니다.',
    roleLabels: {
      customer: '고객',
      photographer: '포토그래퍼',
      stylist: '스타일리스트',
      costume_vendor: '의상 판매처',
      venue_vendor: '장소 제공처',
    },
  },
  en: {
    title: 'Chat',
    placeholder: 'Type a message...',
    send: 'Send',
    loading: 'Loading messages...',
    empty: 'No messages yet. Start the conversation!',
    you: 'You',
    error: 'Failed to send message.',
    roleLabels: {
      customer: 'Customer',
      photographer: 'Photographer',
      stylist: 'Stylist',
      costume_vendor: 'Costume Vendor',
      venue_vendor: 'Venue',
    },
  },
  ja: {
    title: 'チャット',
    placeholder: 'メッセージを入力...',
    send: '送信',
    loading: 'メッセージを読み込み中...',
    empty: 'まだメッセージがありません。会話を始めましょう！',
    you: '自分',
    error: 'メッセージの送信に失敗しました。',
    roleLabels: {
      customer: 'お客様',
      photographer: 'フォトグラファー',
      stylist: 'スタイリスト',
      costume_vendor: 'コスチュームベンダー',
      venue_vendor: 'ベニュー',
    },
  },
  zh: {
    title: '聊天',
    placeholder: '输入消息...',
    send: '发送',
    loading: '加载消息中...',
    empty: '暂无消息。开始对话吧！',
    you: '我',
    error: '消息发送失败。',
    roleLabels: {
      customer: '客户',
      photographer: '摄影师',
      stylist: '造型师',
      costume_vendor: '服装供应商',
      venue_vendor: '场地',
    },
  },
};

const Chat = ({ bookingId, isOpen, onClose, channelType = 'photo', userRole = PARTICIPANT_TYPES.customer }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const c = CHAT_I18N[lang] || CHAT_I18N.ko;

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState(null);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [error, setError] = useState('');
  const [activeChannel, setActiveChannel] = useState(channelType || 'photo');
  const [availableChannels, setAvailableChannels] = useState([]);
  const [currentChannelId, setCurrentChannelId] = useState(null);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Initialize: Check if using multi-channel mode or 1:1 mode
  useEffect(() => {
    if (!isOpen || !bookingId || !user) {
      setLoading(true);
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        // Check if we have localStorage channels for this booking (multi-channel mode)
        const channels = getChatChannels(bookingId);

        if (channels.length > 0) {
          // Multi-channel mode (localStorage)
          if (isMounted) {
            setAvailableChannels(channels);
            setActiveChannel(activeChannel);
          }
          loadChannelMessages(activeChannel);
        } else {
          // Fall back to 1:1 mode (Supabase)
          await loadOneOnOneChat();
        }
      } catch (err) {
        console.error('Chat init error:', err);
        if (isMounted) setError('Failed to initialize chat');
      }
    };

    const loadChannelMessages = (channelType) => {
      try {
        const channelId = `channel_${bookingId}_${channelType}`;
        setCurrentChannelId(channelId);
        const msgs = getChannelMessages(channelId);
        if (isMounted) {
          setMessages(msgs || []);
          setLoading(false);
          // Mark as read
          if (user?.id) {
            markChannelAsRead(channelId, user.id);
          }
        }
      } catch (err) {
        console.error('Error loading channel messages:', err);
      }
    };

    const loadOneOnOneChat = async () => {
      try {
        const { getSupabase } = await import('../lib/supabase');
        const sb = await getSupabase();
        if (!sb) {
          if (isMounted) setError('Supabase connection failed');
          return;
        }

        // Get or create room
        let { data: room, error: roomError } = await sb
          .from('chat_rooms')
          .select('*')
          .eq('booking_id', bookingId)
          .maybeSingle();

        if (roomError && roomError.code !== 'PGRST116') {
          console.error('Error fetching room:', roomError);
          if (isMounted) setError('Failed to load chat room');
          return;
        }

        if (!room) {
          const { data: booking, error: bookingError } = await sb
            .from('bookings')
            .select('photographer_id, user_id')
            .eq('id', bookingId)
            .single();

          if (bookingError || !booking) {
            console.error('Error fetching booking:', bookingError);
            if (isMounted) setError('Booking not found');
            return;
          }

          const { data: newRoom, error: createError } = await sb
            .from('chat_rooms')
            .insert({
              booking_id: bookingId,
              photographer_id: booking.photographer_id,
              customer_id: booking.user_id,
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating room:', createError);
            if (isMounted) setError('Failed to create chat room');
            return;
          }

          room = newRoom;
        }

        if (!room) {
          if (isMounted) setError('Failed to initialize chat');
          return;
        }

        if (isMounted) {
          setRoomId(room.id);
          const isPhotographer = user.id === room.photographer_id;
          setOtherUser({
            id: isPhotographer ? room.customer_id : room.photographer_id,
            isPhotographer: !isPhotographer,
          });
        }

        const { data: msgs, error: msgsError } = await sb
          .from('messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: true });

        if (msgsError) {
          console.error('Error fetching messages:', msgsError);
        }

        if (isMounted) {
          setMessages(msgs || []);
          setLoading(false);
        }

        const subscription = sb
          .channel(`room:${room.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${room.id}`,
            },
            (payload) => {
              if (isMounted) {
                setMessages((prev) => [...prev, payload.new]);
              }
            }
          )
          .subscribe();

        subscriptionRef.current = subscription;
      } catch (err) {
        console.error('1:1 chat init error:', err);
        if (isMounted) setError('Failed to initialize chat');
      }
    };

    init();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [isOpen, bookingId, user, activeChannel]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || sending || !user) return;

    setSending(true);
    setError('');

    try {
      // Multi-channel mode (localStorage)
      if (currentChannelId) {
        const msg = sendChannelMessage(currentChannelId, user.id, userRole, {
          type: 'text',
          content: newMsg.trim(),
        });
        setMessages((prev) => [...prev, msg]);
        setNewMsg('');
      }
      // 1:1 mode (Supabase)
      else if (roomId) {
        const { getSupabase } = await import('../lib/supabase');
        const sb = await getSupabase();
        if (!sb) {
          setError(c.error);
          setSending(false);
          return;
        }

        const { error: sendError } = await sb.from('messages').insert({
          room_id: roomId,
          sender_id: user.id,
          content: newMsg.trim(),
        });

        if (sendError) {
          console.error('Error sending message:', sendError);
          setError(c.error);
        } else {
          setNewMsg('');
        }
      }
    } catch (err) {
      console.error('Send error:', err);
      setError(c.error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: 'min(100%, 420px)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--gold-border)',
        zIndex: 9999,
        boxShadow: '-2px 0 16px rgba(0,0,0,0.2)',
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--gold-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(232,160,32,0.04)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.1em', color: 'var(--gold)' }}>
          💬 {c.title}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            color: 'var(--muted)',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Channel Tabs (if multi-channel) */}
      {availableChannels.length > 0 && (
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--gold-border)',
            background: 'var(--bg)',
            overflow: 'auto',
            padding: '0 8px',
          }}
        >
          {availableChannels.map((ch) => {
            const config = CHANNEL_CONFIG[ch.type] || CHANNEL_CONFIG.photo;
            const unreadCount = getChannelUnreadCount(ch.id, user?.id);
            const isActive = activeChannel === ch.type;

            return (
              <button
                key={ch.id}
                onClick={() => {
                  setActiveChannel(ch.type);
                  const msgs = getChannelMessages(ch.id);
                  setMessages(msgs || []);
                  setCurrentChannelId(ch.id);
                  if (user?.id) markChannelAsRead(ch.id, user.id);
                }}
                style={{
                  flex: '0 0 auto',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? `3px solid ${config.color}` : '3px solid transparent',
                  color: isActive ? config.color : 'var(--muted)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.2s, border-color 0.2s',
                  position: 'relative',
                }}
              >
                {config.icon} {config.label}
                {unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: '4px',
                      background: config.color,
                      color: 'white',
                      fontSize: 9,
                      fontFamily: 'var(--font-body)',
                      padding: '2px 5px',
                      borderRadius: '10px',
                      minWidth: '18px',
                      textAlign: 'center',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'var(--muted)',
              fontSize: 12,
            }}
          >
            {c.loading}
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'var(--muted)',
              fontSize: 12,
              padding: '20px',
              textAlign: 'center',
            }}
          >
            {c.empty}
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  color: 'var(--muted)',
                  margin: '12px 0 8px 0',
                  fontFamily: 'var(--font-serif)',
                  letterSpacing: '0.08em',
                }}
              >
                {date}
              </div>

              {/* Messages for this date */}
              {msgs.map((msg) => {
                const isOwn = msg.sender_id === user?.id || msg.senderId === user?.id;
                const senderRole = msg.senderRole || (msg.sender_id === user?.id ? userRole : 'photographer');
                const roleLabel = c.roleLabels?.[senderRole] || senderRole;
                const config = activeChannel && CHANNEL_CONFIG[activeChannel];
                const accentColor = config?.color || 'var(--gold)';

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      marginBottom: '4px',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                      }}
                    >
                      {!isOwn && (
                        <div
                          style={{
                            fontSize: 10,
                            fontFamily: 'var(--font-serif)',
                            letterSpacing: '0.08em',
                            color: accentColor,
                            marginBottom: '2px',
                            marginLeft: '2px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {roleLabel}
                        </div>
                      )}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '4px',
                          background: isOwn ? accentColor : 'rgba(232,160,32,0.12)',
                          color: isOwn ? 'var(--bg)' : 'var(--text)',
                          fontSize: 13,
                          lineHeight: 1.5,
                          wordWrap: 'break-word',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {msg.content}
                        <div
                          style={{
                            fontSize: 10,
                            marginTop: '4px',
                            color: isOwn ? 'rgba(0,0,0,0.4)' : 'var(--muted)',
                            fontFamily: 'var(--font-serif)',
                          }}
                        >
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '8px 16px',
            background: 'rgba(232,93,93,0.1)',
            border: '1px solid rgba(232,93,93,0.3)',
            color: '#e85d5d',
            fontSize: 11,
            fontFamily: 'var(--font-serif)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Input Bar */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--gold-border)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(232,160,32,0.04)',
        }}
      >
        <textarea
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={c.placeholder}
          disabled={(!roomId && !currentChannelId) || sending}
          style={{
            flex: 1,
            padding: '10px 12px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            borderRadius: '3px',
            resize: 'none',
            height: '36px',
            maxHeight: '80px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!newMsg.trim() || (!roomId && !currentChannelId) || sending}
          style={{
            padding: '10px 16px',
            background: newMsg.trim() && (roomId || currentChannelId) && !sending ? 'var(--gold)' : 'rgba(232,160,32,0.3)',
            border: 'none',
            color: newMsg.trim() && (roomId || currentChannelId) && !sending ? 'var(--bg)' : 'var(--muted)',
            fontFamily: 'var(--font-serif)',
            fontSize: 11,
            letterSpacing: '0.08em',
            cursor: newMsg.trim() && (roomId || currentChannelId) && !sending ? 'pointer' : 'not-allowed',
            borderRadius: '3px',
            transition: 'background 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {sending ? '...' : c.send}
        </button>
      </div>
    </div>
  );
};

export default Chat;
