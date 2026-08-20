export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          website: string | null
          is_private: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          user_id: string
          caption: string | null
          visibility: 'public' | 'followers_only' | 'private'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          caption?: string | null
          visibility?: 'public' | 'followers_only' | 'private'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          caption?: string | null
          visibility?: 'public' | 'followers_only' | 'private'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_media: {
        Row: {
          id: string
          post_id: string
          media_url: string
          media_type: 'image' | 'video'
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          media_url: string
          media_type?: 'image' | 'video'
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          media_url?: string
          media_type?: 'image' | 'video'
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          post_id?: string
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          parent_id: string | null
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          parent_id?: string | null
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          parent_id?: string | null
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          id: string
          user_id: string
          media_url: string
          media_type: 'image' | 'video'
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          media_url: string
          media_type?: 'image' | 'video'
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          media_url?: string
          media_type?: 'image' | 'video'
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          story_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          story_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          story_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          conversation_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string | null
          attachment_url: string | null
          created_at: string
          edited_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content?: string | null
          attachment_url?: string | null
          created_at?: string
          edited_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string | null
          attachment_url?: string | null
          created_at?: string
          edited_at?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string
          type: 'follow' | 'like' | 'comment' | 'reply' | 'mention' | 'message'
          post_id: string | null
          comment_id: string | null
          conversation_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id: string
          type: 'follow' | 'like' | 'comment' | 'reply' | 'mention' | 'message'
          post_id?: string | null
          comment_id?: string | null
          conversation_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          actor_id?: string
          type?: 'follow' | 'like' | 'comment' | 'reply' | 'mention' | 'message'
          post_id?: string | null
          comment_id?: string | null
          conversation_id?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          post_id: string | null
          comment_id: string | null
          reason: string
          status: 'pending' | 'reviewed' | 'dismissed'
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          post_id?: string | null
          comment_id?: string | null
          reason: string
          status?: 'pending' | 'reviewed' | 'dismissed'
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          post_id?: string | null
          comment_id?: string | null
          reason?: string
          status?: 'pending' | 'reviewed' | 'dismissed'
          created_at?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          post_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type PostMedia = Database['public']['Tables']['post_media']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Story = Database['public']['Tables']['stories']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
