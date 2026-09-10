# Multi-Party Chat System Guide

## Overview

The Phosnap chat system has been expanded to support multi-party conversations beyond the original photographer↔customer 1:1 model. The system now supports dedicated chat channels for:

- **Photo** (Photographer↔Customer) - Gold accent
- **Stylist** (Stylist↔Customer) - Pink accent
- **Costume** (Costume Vendor↔Customer) - Green accent
- **Venue** (Venue Vendor↔Customer) - Blue accent

## Key Features

### 1. Backward Compatibility
- Existing 1:1 chat functionality remains unchanged
- Components default to photographer↔customer chat mode
- Supabase realtime chat still works as before
- No breaking changes to existing implementations

### 2. New Multi-Channel Architecture
- **Channel-based storage**: localStorage for multi-party channels
- **Participant roles**: Each message tracks sender role (customer, photographer, stylist, etc.)
- **Channel tabs**: UI shows available channels with unread badges
- **Color-coded channels**: Visual distinction between vendor types

### 3. New Data Structures

#### Channel
```javascript
{
  id: "channel_${bookingId}_${channelType}",
  bookingId: "1",
  type: "stylist" | "photo" | "costume" | "venue",
  participants: [
    { id: "user-1", role: "customer", joinedAt: "2025-04-10T10:00:00Z" },
    { id: "user-2", role: "stylist", joinedAt: "2025-04-10T10:00:00Z" }
  ],
  createdAt: "2025-04-10T10:00:00Z",
  lastMessageAt: "2025-04-15T14:30:00Z"
}
```

#### Channel Message
```javascript
{
  id: "msg-1",
  channelId: "channel_1_stylist",
  senderId: "user-1",
  senderRole: "customer" | "photographer" | "stylist" | "costume_vendor" | "venue_vendor",
  type: "text" | "image" | "video" | "location" | "system",
  content: "Message text",
  meta: { /* optional metadata */ },
  createdAt: "2025-04-15T14:30:00Z",
  read: false
}
```

## Usage

### Basic Usage (Backward Compatible)

Use the Chat component as before for photographer↔customer chat:

```jsx
import Chat from '../components/Chat';

<Chat 
  bookingId="123" 
  isOpen={true} 
  onClose={handleClose}
/>
```

### Multi-Channel Usage

For vendor-specific channels, pass the `channelType` and `userRole`:

```jsx
<Chat 
  bookingId="123"
  isOpen={true}
  onClose={handleClose}
  channelType="stylist"
  userRole="stylist"
/>
```

Channel type options:
- `"photo"` (default) - Photographer channel
- `"stylist"` - Stylist channel
- `"costume"` - Costume vendor channel
- `"venue"` - Venue vendor channel

User role options:
- `"customer"`
- `"photographer"`
- `"stylist"`
- `"costume_vendor"`
- `"venue_vendor"`

## Data Layer API

### Creating/Accessing Channels

```javascript
import {
  getOrCreateChannel,
  addChannelParticipant,
  getChatChannels,
  CHAT_CHANNELS,
  PARTICIPANT_TYPES
} from '../data/chat';

// Create or get a channel
const channel = getOrCreateChannel(bookingId, CHAT_CHANNELS.stylist);

// Add participants
addChannelParticipant(channel.id, userId, PARTICIPANT_TYPES.stylist);

// Get all channels for a booking
const channels = getChatChannels(bookingId);
```

### Sending Messages

```javascript
import { sendChannelMessage } from '../data/chat';

const msg = sendChannelMessage(
  channelId,
  senderId,
  senderRole,
  {
    type: 'text',
    content: 'Hello!',
    meta: {}
  }
);
```

### Retrieving Messages

```javascript
import { 
  getChannelMessages, 
  getChannelUnreadCount,
  markChannelAsRead 
} from '../data/chat';

const messages = getChannelMessages(channelId);
const unreadCount = getChannelUnreadCount(channelId, userId);
markChannelAsRead(channelId, userId);
```

## UI Components

### Channel Tabs
When viewing a booking with multiple channels, tabs appear at the top showing:
- Channel icon and name
- Color-coded border
- Unread message badge

```jsx
// Stylist tab appears as:
💄 Stylist [3]   // "3" = 3 unread messages
```

### Message Display
Messages show the sender's role above their name:

```
stylist
Hello! I'd recommend arriving 1.5 hours early.
14:30
```

Different colors for each channel type:
- Photo: Gold (#e8a020)
- Stylist: Pink (#e8a0d0)
- Costume: Green (#a0e8a0)
- Venue: Blue (#a0d0e8)

## Internationalization

Role labels are translated in CHAT_I18N:

```javascript
CHAT_I18N[lang].roleLabels = {
  customer: 'Customer',
  photographer: 'Photographer',
  stylist: 'Stylist',
  costume_vendor: 'Costume Vendor',
  venue_vendor: 'Venue'
}
```

Supported languages: Korean (ko), English (en), Japanese (ja), Chinese (zh)

## Mock Data

For development and testing, use `initializeMockChannels()`:

```javascript
import { initializeMockChannels } from '../data/chat';

// Initialize sample conversations for booking #1
initializeMockChannels('1');
```

This creates:
- A stylist↔customer conversation about makeup timing (7 messages)
- A venue↔customer conversation about venue access (8 messages)

## Storage

### localStorage Structure

```javascript
{
  rooms: { /* 1:1 chat rooms (backward compat) */ },
  messages: { /* 1:1 messages */ },
  channels: { /* multi-party channels */ },
  channelMessages: { /* multi-party messages */ }
}
```

Key: `'phosnap_chat'`

### Migration Path to Supabase

When ready to scale to production, migrate:
1. `channels` table: Store channel metadata
2. `channel_messages` table: Store channel messages
3. Update `sendChannelMessage()` to use Supabase
4. Add realtime subscriptions via `channel()` API

## Channel Configuration

Customize channel appearance and behavior:

```javascript
export const CHANNEL_CONFIG = {
  photo: { label: 'Photographer', color: '#e8a020', icon: '📷' },
  stylist: { label: 'Stylist', color: '#e8a0d0', icon: '💄' },
  costume: { label: 'Costume', color: '#a0e8a0', icon: '👗' },
  venue: { label: 'Venue', color: '#a0d0e8', icon: '📍' },
};
```

## Testing

### Test Multi-Channel Chat

1. Import and initialize mock data:
```javascript
import { initializeMockChannels } from '../data/chat';
initializeMockChannels('1');
```

2. Open Chat component with booking ID "1"

3. Observe:
   - Two tabs appear: Stylist and Venue
   - Each tab shows unread count
   - Click tabs to switch channels
   - Messages show sender role labels
   - Color changes per channel type

### Example: Displaying Stylist Channel

```jsx
import Chat from '../components/Chat';
import { initializeMockChannels } from '../data/chat';

// In your component
useEffect(() => {
  initializeMockChannels('1');
}, []);

return (
  <Chat 
    bookingId="1"
    isOpen={true}
    onClose={handleClose}
    channelType="stylist"
    userRole="customer"
  />
);
```

## Architecture Decisions

### Why localStorage for Channels?

- **MVP simplicity**: No additional database schema needed
- **Fast local access**: No network latency
- **Demo-friendly**: Works without backend
- **Easy migration**: Data structure maps to eventual Supabase tables

### Why Separate Storage?

- **Backward compatibility**: 1:1 chat data unchanged
- **Clean separation**: Multi-party logic isolated
- **Flexible transition**: Can migrate 1:1 and multi-party independently

### Why Role Labels on Messages?

- **Multi-party clarity**: Essential to know who's speaking in group chats
- **Vendor identification**: Customers know which vendor is responding
- **Language support**: Labels translate with app language

## Future Enhancements

1. **Read receipts**: Track who has read messages in each channel
2. **Typing indicators**: Show when vendors are composing
3. **File uploads**: Share vendor contracts, timelines, references
4. **@mentions**: Notify specific participants
5. **Message reactions**: Simple feedback mechanism
6. **Message search**: Full-text search across channels
7. **Notifications**: Push notifications for unread channels
8. **Scheduled messages**: Set reminders for important info

## Troubleshooting

### Channels not appearing?
- Check `getChatChannels(bookingId)` returns data
- Ensure channels were created with `getOrCreateChannel()`
- Verify localStorage is enabled

### Messages not showing?
- Confirm `currentChannelId` is set correctly
- Check `getChannelMessages(channelId)` has data
- Verify `activeChannel` matches a valid channel type

### Styling issues?
- Ensure CHANNEL_CONFIG colors are valid hex codes
- Check CSS variables (--gold, --bg, etc.) are defined
- Verify Corners component is imported

## Files Modified

- `/src/data/chat.js` - Added multi-channel data layer
- `/src/components/Chat.jsx` - Added channel tabs and role labels

## Backward Compatibility

All changes are additive:
- Existing 1:1 chat works unchanged
- Supabase integration unaffected
- Props are optional (defaults to 'photo' channel)
- No breaking changes to Chat API
