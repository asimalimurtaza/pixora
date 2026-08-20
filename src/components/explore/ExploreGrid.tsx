'use client'

import React, { useState } from 'react'
import { Heart, MessageCircle, Layers } from 'lucide-react'
import { PostCard, PostCardData } from '@/components/posts/PostCard'

interface ExploreGridProps {
  posts: PostCardData[]
  currentUserId?: string
}

export function ExploreGrid({ posts, currentUserId }: ExploreGridProps) {
  const [selectedPost, setSelectedPost] = useState<PostCardData | null>(null)

  if (!posts || posts.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10 shadow-xl">
        <Layers className="w-8 h-8 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-white">No Public Posts Found</h3>
        <p className="text-xs text-slate-400">Be the first to publish a public photo or carousel!</p>
      </div>
    )
  }

  return (
    <div>
      {/* Dynamic Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        {posts.map((post, idx) => {
          const firstMedia = post.media?.[0]?.media_url
          const isCarousel = post.media && post.media.length > 1
          const isLargeTile = idx % 7 === 2

          return (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className={`relative bg-slate-900 rounded-2xl overflow-hidden group cursor-pointer border border-slate-800/60 shadow-md ${
                isLargeTile ? 'sm:col-span-2 sm:row-span-2 aspect-square' : 'aspect-square'
              }`}
            >
              {firstMedia ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firstMedia}
                  alt={post.caption || 'Explore post'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                  No image
                </div>
              )}

              {/* Multi-image Badge */}
              {isCarousel && (
                <div className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md text-white shadow-md">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity p-4 text-center">
                <div className="flex items-center gap-6 font-bold text-white text-sm">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-5 h-5 fill-white text-white" />
                    <span>{post.likesCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-5 h-5 fill-white text-white" />
                    <span>{post.commentsCount || 0}</span>
                  </div>
                </div>

                <p className="text-xs font-semibold text-pink-300 truncate max-w-full">
                  @{post.user?.username}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Post Modal */}
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
