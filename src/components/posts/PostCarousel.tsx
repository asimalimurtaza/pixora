'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PostCarouselProps {
  mediaItems: {
    id: string
    media_url: string
    media_type?: string
  }[]
  aspectRatio?: 'square' | 'auto'
}

export function PostCarousel({ mediaItems, aspectRatio = 'square' }: PostCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!mediaItems || mediaItems.length === 0) return null

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1))
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="relative w-full overflow-hidden bg-black/60 group select-none">
      {/* Slide Item */}
      <div className={`${aspectRatio === 'square' ? 'aspect-square' : 'max-h-[500px]'} w-full flex items-center justify-center`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaItems[currentIndex].media_url}
          alt={`Slide ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Navigation Arrows */}
      {mediaItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg cursor-pointer"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg cursor-pointer"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md">
            {mediaItems.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(idx)
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-4 bg-pink-500' : 'bg-slate-400/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Slide Counter Badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-[10px] font-bold text-white tracking-wider">
            {currentIndex + 1}/{mediaItems.length}
          </div>
        </>
      )}
    </div>
  )
}
