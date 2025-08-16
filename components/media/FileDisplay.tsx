"use client"

import { FileText, Download, File, FileImage, FileVideo, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileDisplayProps {
  url: string
  name: string
  size: number
  type?: string
  className?: string
}

export function FileDisplay({ url, name, size, type, className = "" }: FileDisplayProps) {
  const getFileIcon = (fileName: string, mimeType?: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    if (mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return <FileImage className="w-5 h-5 text-blue-500" />
    }

    if (mimeType?.startsWith("video/") || ["mp4", "webm", "mov", "avi"].includes(extension || "")) {
      return <FileVideo className="w-5 h-5 text-purple-500" />
    }

    if (["pdf"].includes(extension || "")) {
      return <FileText className="w-5 h-5 text-red-500" />
    }

    if (["doc", "docx", "txt"].includes(extension || "")) {
      return <FileText className="w-5 h-5 text-blue-600" />
    }

    return <File className="w-5 h-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleView = () => {
    window.open(url, "_blank")
  }

  const isViewable = () => {
    const extension = name.split(".").pop()?.toLowerCase()
    return ["pdf", "jpg", "jpeg", "png", "gif", "webp", "mp4", "webm"].includes(extension || "")
  }

  return (
    <div
      className={`flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
    >
      <div className="flex-shrink-0">{getFileIcon(name, type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(size)}</p>
      </div>
      <div className="flex gap-1">
        {isViewable() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            className="flex-shrink-0 h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/20"
          >
            <Eye className="w-4 h-4 mr-1" />
            <span className="text-xs">View</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="flex-shrink-0 h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/20"
        >
          <Download className="w-4 h-4 mr-1" />
          <span className="text-xs">Download</span>
        </Button>
      </div>
    </div>
  )
}
