'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PostCardData } from '@/components/posts/PostCard'

interface FetchPageResponse {
  posts: PostCardData[]
  hasMore: boolean
}

export function useInfiniteFeed(
  fetchPage: (cursorCreatedAt?: string, cursorId?: string) => Promise<FetchPageResponse>,
  initialPosts: PostCardData[] = [],
  initialHasMore: boolean = true
) {
  const [posts, setPosts] = useState<PostCardData[]>(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)

  const observerTargetRef = useRef<HTMLDivElement | null>(null)

  const loadNextPage = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    const lastPost = posts[posts.length - 1]
    const cursorCreatedAt = lastPost?.created_at
    const cursorId = lastPost?.id

    try {
      const res = await fetchPage(cursorCreatedAt, cursorId)
      setPosts((prev) => {
        // Deduplicate
        const existingIds = new Set(prev.map((p) => p.id))
        const newPosts = res.posts.filter((p) => !existingIds.has(p.id))
        return [...prev, ...newPosts]
      })
      setHasMore(res.hasMore)
    } catch (err) {
      console.error('Infinite feed load error:', err)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, posts, fetchPage])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadNextPage()
        }
      },
      { threshold: 0.5 }
    )

    const currentRef = observerTargetRef.current
    if (currentRef) observer.observe(currentRef)

    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [hasMore, loading, loadNextPage])

  return {
    posts,
    setPosts,
    hasMore,
    loading,
    observerTargetRef,
    loadNextPage,
  }
}
