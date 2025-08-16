"use client"

import { useState } from "react"
import { Play, Loader2 } from "lucide-react"

interface VideoDisplayProps {
  src: string
  className?: string
}

export function VideoDisplay({ src, className = "" }: VideoDisplayProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoadedData = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg z-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      {hasError ? (
        <div className="flex flex-col items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded-lg border">
          <Play className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load video</p>
        </div>
      ) : (
        <video
          src={src}
          controls
          className={`max-w-full h-auto rounded-lg border transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoadedData={handleLoadedData}
          onError={handleError}
          preload="metadata"
        />
      )}
    </div>
  )
}
