# Supabase Stories Architecture Guide — Pixora

This document explains the architectural decisions behind **Pixora's** Instagram-style Stories system, covering PostgreSQL metadata, Supabase Storage, logical vs physical expiration, Edge Functions, RLS security, and Realtime integration.

---

## 1. Why Stories Use PostgreSQL
PostgreSQL is used to store story metadata (`id`, `user_id`, `media_url`, `media_path`, `caption`, `created_at`, `expires_at`). This enables fast relational queries, indexing, security checks via RLS policies, and precise timestamp calculations.

## 2. Why Media Uses Storage
Binary media files (images, videos) should never be stored as BYTEA binary blobs in PostgreSQL database rows. Supabase Storage stores binary files in optimized Object Storage S3/GCS buckets while returning light URL pointers, keeping database backups small and fast.

## 3. Why `expires_at` is Required
`expires_at` (default `created_at + INTERVAL '24 hours'`) establishes the exact logical boundary when a story stops being active. It enables instant database filtering.

## 4. Why Logical Expiration is Separate from Physical Deletion
- **Logical Expiration**: Database queries enforce `expires_at > NOW()`. The moment a story reaches 24 hours, it is immediately hidden from the feed and API results without waiting for background batch processing.
- **Physical Cleanup**: Background cron jobs physically remove expired Storage files and database rows later. This decouples user read latency from background storage maintenance.

## 5. Why Cleanup Uses an Edge Function
Physical deletion requires deleting both Object Storage files (`storage.from('story-media').remove()`) and PostgreSQL rows across multiple tables. An Edge Function running Deno executes this transactional multi-resource cleanup atomically using service role permissions.

## 6. Why Cleanup is Scheduled
Running background physical cleanup on a cron schedule (e.g., every 30 minutes) avoids expensive file deletion tasks during real-time user browsing requests.

## 7. Why RLS is Still Required
Even with logical expiration queries, RLS policies guarantee at the database security level that:
- Private account stories are only viewable by approved followers.
- Story viewer lists (`story_views`) are queryable **only** by the story owner.
- Users cannot upload or delete stories belonging to other accounts.

## 8. Why Realtime is Used Selectively
Realtime WebSocket subscriptions are opened **selectively** (e.g., when a story owner opens the live viewer count modal) rather than creating a global subscription to all story views across the platform. This conserves connection limits and bandwidth.

## 9. Why Typing / Presence are Not Stored in PostgreSQL
Typing indicators and online status dots change every few seconds. Writing every keystroke or heartbeat to PostgreSQL would cause write amplification, table bloat, and database lock contention. Ephemeral WebSockets (Broadcast & Presence) handle these in memory.

## 10. How Storage Cleanup Avoids Orphaned Files
The Edge Function fetches expired story records first, extracts `media_path`, purges the storage objects, and only then deletes the database rows. If Storage deletion fails, the database record remains for the next scheduled cleanup iteration to retry safely (idempotency).
