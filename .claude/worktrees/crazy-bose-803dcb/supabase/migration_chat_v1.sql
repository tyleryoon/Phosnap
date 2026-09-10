-- ─── Chat System Migration v1 ────────────────────────────────────────
-- Real-time chat for Phosnap bookings using Supabase Realtime
-- Tables: chat_rooms, messages
-- Enables: 1-to-1 messaging between photographer and customer per booking

-- Chat rooms (1 per booking)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  photographer_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking ON chat_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_photographer ON chat_rooms(photographer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_customer ON chat_rooms(customer_id);

-- Row Level Security (RLS)
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can see their own chat rooms
CREATE POLICY "Users can see their own chat rooms" ON chat_rooms
  FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = photographer_id);

-- Users can see messages in their rooms
CREATE POLICY "Users can see messages in their rooms" ON messages
  FOR SELECT USING (
    room_id IN (SELECT id FROM chat_rooms WHERE customer_id = auth.uid() OR photographer_id = auth.uid())
  );

-- Users can send messages to their rooms
CREATE POLICY "Users can send messages to their rooms" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    room_id IN (SELECT id FROM chat_rooms WHERE customer_id = auth.uid() OR photographer_id = auth.uid())
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
