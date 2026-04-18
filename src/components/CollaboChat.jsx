import React, { useState, useEffect, useRef } from 'react';
import Corners from './Corners';
import {
  getOrCreateRoom,
  sendMessage,
  getMessages,
  markAsRead,
  getMyRooms,
  getUnreadCount,
  getLastMessage,
  uploadFile,
  MSG_TYPES,
} from '../data/chat';
import { PHOTOGRAPHERS } from '../data/photographers';

// ─── CollaboChat ────────────────────────────────────────────────────
// 콜라보 1:1 채팅 컴포넌트
// props: myId (작가 ID), theirId (optional, 특정 상대방과 바로 열기)

const CollaboChat = ({ myId, theirId: initialTheirId, onClose }) => {
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 채팅방 목록 로드
  const loadRooms = () => setRooms(getMyRooms(myId));

  // 메시지 로드
  const loadMessages = (roomId) => {
    setMessages(getMessages(roomId));
    markAsRead(roomId, myId);
  };

  useEffect(() => {
    loadRooms();
    // 특정 상대방과 바로 열기
    if (initialTheirId) {
      const room = getOrCreateRoom(myId, initialTheirId);
      setActiveRoomId(room.id);
      loadMessages(room.id);
    }
  }, [myId, initialTheirId]);

  // 폴링 (MVP — Supabase Realtime 전환 시 제거)
  useEffect(() => {
    if (!activeRoomId) return;
    const interval = setInterval(() => {
      loadMessages(activeRoomId);
      loadRooms();
    }, 2000);
    return () => clearInterval(interval);
  }, [activeRoomId]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getArtist = (id) => PHOTOGRAPHERS.find(p => p.id === id);

  // 메시지 전송
  const handleSend = () => {
    if (!inputText.trim() || !activeRoomId) return;
    sendMessage(activeRoomId, myId, { type: 'text', content: inputText.trim() });
    setInputText('');
    loadMessages(activeRoomId);
    loadRooms();
  };

  // 파일 전송 (이미지/영상)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;
    const { url, fileName, fileSize, fileType } = uploadFile(file);
    const type = fileType.startsWith('video/') ? 'video' : 'image';
    sendMessage(activeRoomId, myId, { type, content: url, meta: { fileName, fileSize, fileType } });
    loadMessages(activeRoomId);
    loadRooms();
  };

  // 위치 전송
  const handleSendLocation = () => {
    if (!locationInput.trim() || !activeRoomId) return;
    sendMessage(activeRoomId, myId, {
      type: 'location',
      content: locationInput.trim(),
      meta: { address: locationInput.trim() },
    });
    setLocationInput('');
    setShowLocationPicker(false);
    loadMessages(activeRoomId);
    loadRooms();
  };

  // 채팅방 선택
  const openRoom = (roomId) => {
    setActiveRoomId(roomId);
    loadMessages(roomId);
  };

  // 상대방 ID 찾기
  const getOtherId = (room) => room.participants.find(id => id !== myId);
  const myArtist = getArtist(myId);

  return (
    <div style={{ display: 'flex', height: 520, border: '1px solid var(--border)', background: 'var(--bg2)' }}>

      {/* ── 왼쪽: 채팅방 목록 ── */}
      <div style={{ width: 220, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase' }}>
            콜라보 채팅
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rooms.length === 0 && (
            <div style={{ padding: '24px 16px', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
              콜라보 성사 후 채팅이 시작됩니다
            </div>
          )}
          {rooms.map(room => {
            const otherId = getOtherId(room);
            const other = getArtist(otherId);
            const last = getLastMessage(room.id);
            const unread = getUnreadCount(room.id, myId);
            const isActive = activeRoomId === room.id;
            return (
              <div
                key={room.id}
                onClick={() => openRoom(room.id)}
                style={{
                  padding: '12px 14px', cursor: 'pointer',
                  background: isActive ? 'rgba(232,160,32,0.06)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: other?.img ? `url(${other.img}) center/cover` : 'var(--border)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-serif)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {other?.nameKo || other?.name || `작가 #${otherId}`}
                      </span>
                      {unread > 0 && (
                        <span style={{ fontSize: 9, background: '#e85d5d', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {unread}
                        </span>
                      )}
                    </div>
                    {last && (
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {last.type === 'image' ? '📷 사진' : last.type === 'video' ? '🎬 영상' : last.type === 'location' ? '📍 위치' : last.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 오른쪽: 메시지 영역 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!activeRoomId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 32 }}>💬</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>채팅방을 선택하세요</div>
            <div style={{ fontSize: 11, color: 'rgba(136,136,136,0.5)', maxWidth: 280, textAlign: 'center', lineHeight: 1.7 }}>
              콜라보 수락 후 여기서 직접 소통할 수 있습니다. 텍스트, 사진, 영상, 위치 공유가 가능합니다.
            </div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            {(() => {
              const room = rooms.find(r => r.id === activeRoomId);
              const otherId = room ? getOtherId(room) : null;
              const other = otherId ? getArtist(otherId) : null;
              return (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: other?.img ? `url(${other.img}) center/cover` : 'var(--border)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>{other?.nameKo || other?.name || '?'}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{other?.location}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(232,80,80,0.7)', padding: '3px 10px', border: '1px solid rgba(232,80,80,0.2)' }}>
                    플랫폼 내 소통만 허용
                  </div>
                </div>
              );
            })()}

            {/* 메시지 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 11, color: 'var(--muted)' }}>
                  채팅을 시작해보세요!
                </div>
              )}
              {messages.map(msg => {
                const isMine = msg.senderId === myId;
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%', padding: msg.type === 'image' || msg.type === 'video' ? '4px' : '10px 14px',
                      background: isMine ? 'var(--gold)' : 'var(--bg)',
                      color: isMine ? '#0B0B0B' : 'var(--text)',
                      border: `1px solid ${isMine ? 'var(--gold)' : 'var(--border)'}`,
                      fontSize: 13, lineHeight: 1.6,
                    }}>
                      {msg.type === 'text' && msg.content}
                      {msg.type === 'image' && (
                        <img src={msg.content} alt="shared" style={{ maxWidth: 240, maxHeight: 180, display: 'block' }} />
                      )}
                      {msg.type === 'video' && (
                        <video src={msg.content} controls style={{ maxWidth: 240, maxHeight: 180, display: 'block' }} />
                      )}
                      {msg.type === 'location' && (
                        <div style={{ padding: msg.type === 'location' ? '6px 10px' : 0 }}>
                          <div style={{ fontSize: 11, marginBottom: 2 }}>📍 위치 공유</div>
                          <div style={{ fontSize: 12 }}>{msg.content}</div>
                          {msg.meta?.address && (
                            <a href={`https://maps.google.com/maps?q=${encodeURIComponent(msg.meta.address)}`}
                              target="_blank" rel="noreferrer"
                              style={{ fontSize: 10, color: isMine ? '#0B0B0B' : 'var(--gold)', textDecoration: 'underline', marginTop: 4, display: 'inline-block' }}>
                              지도에서 보기 →
                            </a>
                          )}
                        </div>
                      )}
                      {msg.type === 'system' && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', fontStyle: 'italic' }}>{msg.content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 위치 공유 팝업 */}
            {showLocationPicker && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', gap: 8 }}>
                <input value={locationInput} onChange={e => setLocationInput(e.target.value)}
                  placeholder="주소 또는 장소명 입력 (예: 교토 기온 거리)"
                  onKeyDown={e => e.key === 'Enter' && handleSendLocation()}
                  style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontSize: 12, fontFamily: 'var(--font-serif)' }} />
                <button onClick={handleSendLocation} style={{ fontSize: 11, background: 'var(--gold)', color: '#0B0B0B', border: 'none', padding: '0 14px', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                  전송
                </button>
                <button onClick={() => setShowLocationPicker(false)} style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '0 10px', cursor: 'pointer' }}>
                  취소
                </button>
              </div>
            )}

            {/* 입력 영역 */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg)' }}>
              {/* 파일 첨부 */}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} title="사진/영상 전송"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', padding: '6px 10px', fontSize: 14 }}>
                📷
              </button>
              {/* 위치 공유 */}
              <button onClick={() => setShowLocationPicker(!showLocationPicker)} title="위치 공유"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', padding: '6px 10px', fontSize: 14 }}>
                📍
              </button>
              {/* 텍스트 입력 */}
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="메시지 입력..."
                style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', fontSize: 13, fontFamily: 'var(--font-serif)' }}
              />
              <button onClick={handleSend} disabled={!inputText.trim()}
                style={{
                  background: inputText.trim() ? 'var(--gold)' : 'rgba(136,136,136,0.15)',
                  color: inputText.trim() ? '#0B0B0B' : 'var(--muted)',
                  border: 'none', padding: '10px 18px', fontFamily: 'var(--font-serif)', fontSize: 12,
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                }}>
                전송
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CollaboChat;
