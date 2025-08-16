"use client"

import { useState } from "react"
import { Loader2, Download, Eye, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface ImageDisplayProps {
  src: string
  alt: string
  className?: string
}

export function ImageDisplay({ src, alt, className = "" }: ImageDisplayProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = src
    link.download = alt || "image"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`relative group ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      {hasError ? (
        <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded-lg border">
          <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load image</p>
        </div>
      ) : (
        <div className="relative">
          <img
            src={src || "/placeholder.svg"}
            alt={alt}
            className={`max-w-full h-auto rounded-lg border transition-opacity duration-200 cursor-pointer hover:opacity-90 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={handleLoad}
            onError={handleError}
            onClick={() => setIsDialogOpen(true)}
          />

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="h-8 px-2 bg-black/50 hover:bg-black/70 text-white border-0"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2 bg-black/50 hover:bg-black/70 text-white border-0"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90 border-0">
              <div className="relative flex items-center justify-center w-full h-full">
                <img src={src || "/placeholder.svg"} alt={alt} className="max-w-full max-h-[90vh] object-contain" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDialogOpen(false)}
                  className="absolute top-4 right-4 text-white hover:bg-white/20"
                >
                  <X className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="absolute bottom-4 right-4 text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
