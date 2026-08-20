# Supabase Realtime Architecture Guide — Pixora

This document outlines the design decisions and differences between the three Supabase Realtime mechanisms used in **Pixora**: **Postgres Changes**, **Broadcast**, and **Presence**.

---

## Realtime Comparison Matrix

| Mechanism | Storage / Persistence | Purpose in Pixora | Sub-second Speed | Security / Authorization |
| :--- | :--- | :--- | :--- | :--- |
| **Postgres Changes** | **Persistent** (stored in PostgreSQL) | Live delivery of Chat Messages & Notifications | High (via WAL replication) | Enforced via PostgreSQL RLS & Channel filters |
| **Broadcast** | **Ephemeral** (zero database writes) | Typing indicators (`typing_start`, `typing_stop`) | Instant peer-to-peer | Ephemeral WebSocket Channel |
| **Presence** | **Ephemeral** (socket heartbeat tracking) | Online / Offline status dots & Active Focus | Instant socket state | Room / Channel State Sync |

---

## 1. Postgres Changes (Persistent Realtime)
**When to use**: Use Postgres Changes when the data **must be saved permanently in PostgreSQL**, and other users need to receive updates automatically without polling.

### Implementation in Pixora:
- **Chat Messages**: When User A inserts a row into `public.messages`, Supabase WAL (Write-Ahead Log) captures the change and broadcasts it to subscribers listening to channel `realtime:messages:conversation_id=eq.{id}`.
- **Notifications**: When someone follows or likes a post, the database trigger creates a row in `public.notifications`, pushing a realtime notification to the target user.

```ts
// Subscribe to persistent messages for a single conversation
const channel = supabase
  .channel(`chat:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      // Append new message to chat UI
    }
  )
  .subscribe()
```

---

## 2. Broadcast (Ephemeral Events)
**When to use**: Use Broadcast for **fleeting events that should never pollute PostgreSQL**, such as typing indicators ("Alice is typing..."), cursor positions, or video player sync events.

### Implementation in Pixora:
- **Typing Indicators**: When a user types in the message box, a `broadcast` event is emitted. Receiver displays "typing..." for 2 seconds and automatically dismisses it if no new event arrives. Zero database writes or storage costs.

```ts
// Send ephemeral typing event
channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId: currentUserId, username },
})
```

---

## 3. Presence (Ephemeral Online Status)
**When to use**: Use Presence to track **who is currently online or active in a room**, without writing heartbeats or timestamps to PostgreSQL every second.

### Implementation in Pixora:
- **Online / Offline Status**: When a user connects to Pixora, their socket joins the presence room. Disconnecting automatically triggers a presence `leave` event, turning their online dot grey.

```ts
// Sync presence state
const presenceTrack = await channel.track({
  online_at: new Date().toISOString(),
  userId: currentUserId,
})
```
