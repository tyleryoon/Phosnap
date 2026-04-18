// ─── Chat System — Supabase Realtime + localStorage fallback ────────────────
//
// Supabase 연결 시: chat_rooms + messages 테이블 사용, Realtime 구독
// Supabase 미연결 시: localStorage fallback (개발/데모용)
//
// Participant Types: 'customer' | 'photographer' | 'stylist' | 'costume_vendor' | 'venue_vendor'
// Channel Types: 'photo' | 'stylist' | 'costume' | 'venue'

import {
  getOrCreateChatRoom,
  getMyChatRooms,
  getChatMessages,
  sendChatMessage,
  markMessagesRead,
  subscribeChatMessages,
  unsubscribeChat,
  getSupabase,
} from '../lib/supabase';

// ── 채팅 채널/참여자 타입 정의 (공유) ──
export const CHAT_CHANNELS = {
  photo: 'photo',
  stylist: 'stylist',
  costume: 'costume',
  venue: 'venue',
};

export const CHANNEL_CONFIG = {
  photo: { label: 'Photographer', color: '#e8a020', icon: '📷' },
  stylist: { label: 'Stylist', color: '#e8a0d0', icon: '💄' },
  costume: { label: 'Costume', color: '#a0e8a0', icon: '👗' },
  venue: { label: 'Venue', color: '#a0d0e8', icon: '📍' },
};

export const PARTICIPANT_TYPES = {
  customer: 'customer',
  photographer: 'photographer',
  stylist: 'stylist',
  costume_vendor: 'costume_vendor',
  venue_vendor: 'venue_vendor',
};

export const MSG_TYPES = {
  text: 'text',
  image: 'image',
  video: 'video',
  location: 'location',
  system: 'system',
};

// ── localStorage fallback (Supabase 미연결 시) ──
const STORAGE_KEY = 'phosnap_chat';

const loadAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { rooms: {}, channels: {}, messages: {}, channelMessages: {} };
  } catch { return { rooms: {}, channels: {}, messages: {}, channelMessages: {} }; }
};
const saveAll = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

// ── Supabase 사용 가능 여부 체크 ──
let _supabaseAvailable = null;
const isSupabaseAvailable = async () => {
  if (_supabaseAvailable !== null) return _supabaseAvailable;
  try {
    const sb = await getSupabase();
    _supabaseAvailable = !!sb;
  } catch {
    _supabaseAvailable = false;
  }
  return _supabaseAvailable;
};

// ══════════════════════════════════════════════════════════════════════
// 통합 API: Supabase 우선, localStorage fallback
// ══════════════════════════════════════════════════════════════════════

/** 룸 ID 생성 (1:1 기존 호환성) */
export const getRoomId = (userA, userB) => {
  const sorted = [userA, userB].sort((a, b) => a - b);
  return `room_${sorted[0]}_${sorted[1]}`;
};

/** 채널 ID 생성 (booking + channel type) */
export const getChannelId = (bookingId, channelType) => {
  if (!channelType) channelType = CHAT_CHANNELS.photo;
  return `channel_${bookingId}_${channelType}`;
};

/** 채팅방 생성 또는 가져오기 */
export const getOrCreateRoom = async (myId, theirId, bookingId = null, photographerId = null) => {
  if (await isSupabaseAvailable() && bookingId) {
    const { data, error } = await getOrCreateChatRoom(bookingId, photographerId || theirId);
    if (!error && data) return data;
  }
  // localStorage fallback
  const data = loadAll();
  const roomId = getRoomId(myId, theirId);
  if (!data.rooms[roomId]) {
    data.rooms[roomId] = {
      id: roomId,
      participants: [myId, theirId],
      bookingId,
      createdAt: new Date().toISOString(),
      lastMessageAt: null,
    };
    data.messages[roomId] = [];
    saveAll(data);
  }
  return data.rooms[roomId];
};

/** 채널 생성 또는 가져오기 (다중 참여자) */
export const getOrCreateChannel = (bookingId, channelType = CHAT_CHANNELS.photo) => {
  const data = loadAll();
  const channelId = getChannelId(bookingId, channelType);
  if (!data.channels[channelId]) {
    data.channels[channelId] = {
      id: channelId,
      bookingId,
      type: channelType,
      participants: [],
      createdAt: new Date().toISOString(),
      lastMessageAt: null,
    };
    data.channelMessages[channelId] = [];
    saveAll(data);
  }
  return data.channels[channelId];
};

/** 채널에 참여자 추가 */
export const addChannelParticipant = (channelId, userId, participantType) => {
  const data = loadAll();
  const channel = data.channels[channelId];
  if (!channel) return null;
  if (!channel.participants.find(p => p.id === userId)) {
    channel.participants.push({
      id: userId,
      role: participantType,
      joinedAt: new Date().toISOString(),
    });
    saveAll(data);
  }
  return channel;
};

/** 북킹의 모든 채널 조회 */
export const getChatChannels = (bookingId) => {
  const data = loadAll();
  return Object.values(data.channels)
    .filter(ch => ch.bookingId === bookingId)
    .sort((a, b) => {
      const order = ['photo', 'stylist', 'costume', 'venue'];
      return order.indexOf(a.type) - order.indexOf(b.type);
    });
};

/** 메시지 보내기 (1:1 room) */
export const sendMessage = async (roomId, senderId, { type = 'text', content, meta = {} }) => {
  // Supabase 방식 (roomId가 UUID인 경우)
  if (await isSupabaseAvailable() && roomId.includes('-')) {
    const { data, error } = await sendChatMessage(roomId, content);
    if (!error && data) return data;
  }
  // localStorage fallback
  const data = loadAll();
  if (!data.messages[roomId]) data.messages[roomId] = [];
  const msg = {
    id: Math.random().toString(36).substring(2, 10),
    roomId,
    senderId,
    type,
    content,
    meta,
    createdAt: new Date().toISOString(),
    read: false,
  };
  data.messages[roomId].push(msg);
  if (data.rooms[roomId]) data.rooms[roomId].lastMessageAt = msg.createdAt;
  saveAll(data);
  return msg;
};

/** 채널 메시지 보내기 */
export const sendChannelMessage = (channelId, senderId, senderRole, { type = 'text', content, meta = {} }) => {
  const data = loadAll();
  if (!data.channelMessages[channelId]) data.channelMessages[channelId] = [];
  const msg = {
    id: Math.random().toString(36).substring(2, 10),
    channelId,
    senderId,
    senderRole,
    type,
    content,
    meta,
    createdAt: new Date().toISOString(),
    read: false,
  };
  data.channelMessages[channelId].push(msg);
  if (data.channels[channelId]) data.channels[channelId].lastMessageAt = msg.createdAt;
  saveAll(data);
  return msg;
};

/** 메시지 목록 조회 (1:1) */
export const getMessages = async (roomId) => {
  if (await isSupabaseAvailable() && roomId.includes('-')) {
    const { data } = await getChatMessages(roomId);
    return data || [];
  }
  const data = loadAll();
  return data.messages[roomId] || [];
};

/** 채널 메시지 목록 조회 */
export const getChannelMessages = (channelId) => {
  const data = loadAll();
  return data.channelMessages[channelId] || [];
};

/** 읽음 처리 (1:1) */
export const markAsRead = async (roomId, readerId) => {
  if (await isSupabaseAvailable() && roomId.includes('-')) {
    await markMessagesRead(roomId);
    return;
  }
  const data = loadAll();
  const msgs = data.messages[roomId] || [];
  let changed = false;
  msgs.forEach(m => {
    if (m.senderId !== readerId && !m.read) { m.read = true; changed = true; }
  });
  if (changed) saveAll(data);
};

/** 채널 읽음 처리 */
export const markChannelAsRead = (channelId, readerId) => {
  const data = loadAll();
  const msgs = data.channelMessages[channelId] || [];
  let changed = false;
  msgs.forEach(m => {
    if (m.senderId !== readerId && !m.read) { m.read = true; changed = true; }
  });
  if (changed) saveAll(data);
};

/** 내 채팅방 목록 */
export const getMyRooms = async (myId) => {
  if (await isSupabaseAvailable()) {
    const { data } = await getMyChatRooms();
    return data || [];
  }
  const data = loadAll();
  return Object.values(data.rooms)
    .filter(r => r.participants.includes(myId))
    .sort((a, b) => (b.lastMessageAt || b.createdAt).localeCompare(a.lastMessageAt || a.createdAt));
};

/** 읽지 않은 메시지 수 (1:1) */
export const getUnreadCount = (roomId, myId) => {
  const data = loadAll();
  const msgs = data.messages[roomId] || [];
  return msgs.filter(m => m.senderId !== myId && !m.read).length;
};

/** 채널 읽지 않은 메시지 수 */
export const getChannelUnreadCount = (channelId, myId) => {
  const data = loadAll();
  const msgs = data.channelMessages[channelId] || [];
  return msgs.filter(m => m.senderId !== myId && !m.read).length;
};

/** 마지막 메시지 미리보기 (1:1) */
export const getLastMessage = (roomId) => {
  const data = loadAll();
  const msgs = data.messages[roomId] || [];
  return msgs.length > 0 ? msgs[msgs.length - 1] : null;
};

/** 채널 마지막 메시지 미리보기 */
export const getLastChannelMessage = (channelId) => {
  const data = loadAll();
  const msgs = data.channelMessages[channelId] || [];
  return msgs.length > 0 ? msgs[msgs.length - 1] : null;
};

/** 파일 업로드 (MVP: blob URL) */
export const uploadFile = (file) => {
  const url = URL.createObjectURL(file);
  return { url, fileName: file.name, fileSize: file.size, fileType: file.type };
};

/** Realtime 구독 (Supabase) */
export const subscribeToRoom = async (roomId, callback) => {
  if (await isSupabaseAvailable() && roomId.includes('-')) {
    return subscribeChatMessages(roomId, callback);
  }
  return null; // localStorage에서는 polling 또는 이벤트 사용
};

/** Realtime 구독 해제 */
export const unsubscribeFromRoom = async (channel) => {
  await unsubscribeChat(channel);
};
