# Zeloria — Modern Visual Social Platform

**Zeloria** is a production-quality, full-stack visual social media web application built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase** as the complete backend infrastructure.

Zeloria features an original design system with Pantone Magenta accents, collapsible navigation rail, real-time messaging and presence, 24-hour expiring stories, a single-query PostgreSQL home feed, automated database-driven notification triggers, and a database-enforced Public / Private Account Privacy System.

---

## 🌟 Key Features & Highlights

### 🎨 1. Original Visual Identity & Theme Engine
- **Design Language**: Outlined glassmorphism components with Pantone Magenta (`#d946ef`) accents.
- **Collapsible Navigation Rail**: Responsive left sidebar with icon-only collapsed state (Instagram Web style) and persistent user preferences in `localStorage`.
- **Floating Mobile Navigation Dock**: Floating bottom dock for mobile viewports.
- **Theme System**: Full support for **Light**, **Dark**, and **System** color modes without page load flickering.

### 📰 2. Home Experience & High-Performance Feed
- **Single-Query RPC (`get_home_feed_v2`)**: Replaced traditional N+1 query patterns with a single PostgreSQL RPC function returning posts, author profiles, media items, likes count, comments count, `is_liked`, and `is_saved` in **1 database roundtrip**.
- **Cursor-Based Infinite Scroll**: Efficient pagination loading more posts as the user approaches the bottom.
- **Stories Tray**: Live horizontal tray highlighting creators with active stories (unseen stories framed in gradient rings).

### 🔒 3. Public / Private Account Privacy System
- **Database-Enforced Privacy**: `profiles.is_private` boolean setting protecting posts, stories, and media at the database Row Level Security (RLS) level.
- **Follow Request Lifecycle**: `follow_requests` table (`pending`, `accepted`, `rejected`).
  - Following a private account creates a pending request.
  - Private account owners can **Accept** or **Decline** requests from `/settings/privacy`.
- **Lock Screen**: Unauthorized non-followers visiting a private profile see a clean privacy lock screen with zero exposed media rows.
- **Blocked Accounts**: Comprehensive blocking system preventing blocked users from following, requesting, or viewing private content.

### 🔔 4. Realtime Notification System
- **Database-Driven Triggers**: Automated PostgreSQL triggers generate notifications for `like`, `comment`, `reply`, `follow`, `follow_request`, `follow_accepted`, and `message`.
- **Self & Duplicate Prevention**: Server-side functions enforce `actor_id <> user_id` and check recent time intervals to prevent self-notifications and duplicates.
- **Realtime Streaming**: Sockets powered by Supabase Realtime deliver instant notifications and update unread count badges without page refreshes.
- **Notifications Center (`/notifications`)**: Activity stream grouped by "TODAY" and "EARLIER" with single and bulk mark-as-read options and smart route navigation.

### 💬 5. Direct Messaging & Presence
- **1-on-1 Conversations**: Real-time direct messaging workspace (`/messages`) with image attachment uploads (`message-attachments` bucket).
- **Online Presence**: Global presence context (`PresenceProvider`) tracking online/offline status dots across the application.
- **Typing Indicators**: Realtime broadcast channel showing live typing feedback.

### 📖 6. Expiring Stories & Edge Functions
- **24-Hour Ephemeral Media**: Stories system supporting image uploads (`story-media` bucket) with captions and auto-progress viewing.
- **Owner Viewer List**: Detailed view counts and list of story viewers restricted exclusively to the story owner via RLS.
- **Background Cleanup**: Supabase Edge Function (`cleanup-expired-stories`) for automatic physical media and database row deletion upon expiration.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router with Turbopack) |
| **Language** | TypeScript (Strict Mode) |
| **Styling** | Tailwind CSS v4 + Vanilla CSS Custom Tokens |
| **Backend & Database** | Supabase PostgreSQL |
| **Authentication** | Supabase Auth (`@supabase/ssr`) |
| **Storage** | Supabase Storage Buckets (`avatars`, `post-media`, `story-media`, `message-attachments`) |
| **Realtime** | Supabase Realtime Sockets & Broadcast Channels |
| **Edge Functions** | Supabase Edge Functions (Deno TypeScript) |
| **Icons** | Lucide React |

---

## 📁 Repository Architecture

```
pixora/
├── src/
│   ├── app/
│   │   ├── (auth)/                # Auth routes (login, signup, reset-password)
│   │   ├── (main)/                # Authenticated application shell
│   │   │   ├── create/            # Post creation page
│   │   │   ├── explore/           # Explore masonry grid & trending spotlights
│   │   │   ├── messages/          # Real-time Direct Messaging workspace
│   │   │   ├── notifications/     # Realtime Notification Center
│   │   │   ├── profile/[username] # Public & Private user profiles
│   │   │   ├── saved/             # Bookmarked posts grid
│   │   │   ├── search/            # Global debounced user & post search
│   │   │   └── settings/          # Profile edit & /privacy settings
│   │   ├── globals.css            # CSS design tokens & theme overrides
│   │   ├── layout.tsx             # Root layout with Theme & Presence Providers
│   │   └── page.tsx               # Main Home Feed entry point
│   ├── components/
│   │   ├── chat/                  # ConversationList, ChatWindow, MessageBubble
│   │   ├── comments/              # Threaded comments and replies
│   │   ├── explore/               # ExploreGrid layout
│   │   ├── feed/                  # HomeFeedStream
│   │   ├── navigation/            # NavigationRail, Header, ContextRail, MobileDock
│   │   ├── posts/                 # PostCard, PostCarousel, LikeButton, SaveButton
│   │   ├── profile/               # FollowButton, ProfilePostGrid, ProfileMoreMenu
│   │   ├── providers/             # ThemeProvider, PresenceProvider
│   │   ├── search/                # GlobalSearch input
│   │   ├── stories/               # StoryRingRow, StoryViewerModal, CreateStoryModal
│   │   └── ui/                    # Button, Input, Modal, ThemeSwitcher, Toast
│   ├── hooks/                     # Custom hooks (useRealtimeMessages, useRealtimeNotifications, etc.)
│   ├── lib/                       # Supabase client/server singletons & storage helpers
│   └── types/                     # Database TypeScript definitions
├── supabase/
│   ├── functions/
│   │   └── cleanup-expired-stories/ # Deno Edge Function for background story purge
│   └── migrations/                 # PostgreSQL migrations (01 through 07)
├── package.json
└── tsconfig.json
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- Node.js `v18.x` or later
- npm or pnpm
- A Supabase project (free tier works great)

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/asimalimurtaza/pixora.git
cd pixora
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Apply Database Migrations
Run the SQL migration scripts in order inside your Supabase **SQL Editor**:
1. `supabase/migrations/01_initial_schema.sql` (Profiles, Posts, Likes, Comments, Notifications baseline)
2. `supabase/migrations/02_phase2_social_core.sql` (Social Core RPCs & storage policies)
3. `supabase/migrations/03_phase3_feed_explore_blocks.sql` (Feed RPCs, Explore & Blocking)
4. `supabase/migrations/04_phase4_realtime_messaging.sql` (Conversations, Messages & Realtime publication)
5. `supabase/migrations/05_phase5_stories_and_cleanup.sql` (Stories schema & viewer RPCs)
6. `supabase/migrations/06_fix_conversation_members_rls_recursion.sql` (RLS recursion fix)
7. `supabase/migrations/07_phase6_notifications_and_privacy.sql` (Notifications fix, `get_home_feed_v2` RPC, Follow Requests & Account Privacy)

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Production Build
```bash
npm run build
npm run start
```

---

## 🔐 Security & Row Level Security (RLS)

Zeloria strictly enforces authorization at the database level:
- **Posts & Stories Privacy**: RLS policies evaluate `is_approved_follower(author_id, auth.uid())` so unauthorized non-followers cannot access private posts or stories directly via API queries.
- **Direct Messaging**: Only authenticated members of a conversation (`conversation_members`) can read or insert messages.
- **Notifications**: Users can only `SELECT` and `UPDATE` their own notification rows (`auth.uid() = user_id`).
- **Profile Updates**: Users can only update their own profile record (`auth.uid() = id`).

---

## 📄 License

This project is licensed under the MIT License — Copyright © 2026 Asim Ali Murtaza.
