'use client'

import React, { useState } from 'react'
import { Heart, MessageCircle, Layers } from 'lucide-react'
import { PostCard, PostCardData } from './PostCard'

interface ProfilePostGridProps {
  posts: PostCardData[]
  currentUserId?: string
}

export function ProfilePostGrid({ posts, currentUserId }: ProfilePostGridProps) {
  const [selectedPost, setSelectedPost] = useState<PostCardData | null>(null)

  if (!posts || posts.length === 0) return null

  return (
    <div>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        {posts.map((post) => {
          const firstMedia = post.media?.[0]?.media_url
          const isCarousel = post.media && post.media.length > 1

          return (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="relative aspect-square bg-slate-900 rounded-xl sm:rounded-2xl overflow-hidden group cursor-pointer border border-slate-800/60 shadow-md"
            >
              {firstMedia ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firstMedia}
                  alt={post.caption || 'Post image'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                  No image
                </div>
              )}

              {/* Carousel Icon */}
              {isCarousel && (
                <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-white">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              )}

              {/* Hover Overlay with Stats */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                  <Heart className="w-5 h-5 fill-white text-white" />
                  <span>{post.likesCount || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                  <MessageCircle className="w-5 h-5 fill-white text-white" />
                  <span>{post.commentsCount || 0}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl my-8">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute -top-10 right-0 text-slate-300 hover:text-white font-bold text-sm cursor-pointer"
            >
              Close ✕
            </button>
            <PostCard
              post={selectedPost}
              currentUserId={currentUserId}
              onPostDeleted={() => setSelectedPost(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
