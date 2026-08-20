import React from 'react'
import { CreatePostForm } from '@/components/posts/CreatePostForm'

export const metadata = { title: 'Create New Post • Pixora' }

export default function CreatePostPage() {
  return (
    <div className="max-w-2xl mx-auto py-2">
      <CreatePostForm />
    </div>
  )
}
