import { ImageDisplay } from "./ImageDisplay"
import { VideoDisplay } from "./VideoDisplay"
import { FileDisplay } from "./FileDisplay"

interface MediaFile {
  type: "image" | "video" | "file"
  url: string
  name: string
  size: number
}

interface MediaMessageProps {
  media: MediaFile
  className?: string
}

export function MediaMessage({ media, className = "" }: MediaMessageProps) {
  switch (media.type) {
    case "image":
      return (
        <div className={className}>
          <ImageDisplay src={media.url || "/placeholder.svg"} alt={media.name} className="max-w-full" />
        </div>
      )

    case "video":
      return (
        <div className={className}>
          <VideoDisplay src={media.url} className="max-w-full" />
        </div>
      )

    case "file":
      return (
        <div className={className}>
          <FileDisplay url={media.url} name={media.name} size={media.size} className="max-w-full" />
        </div>
      )

    default:
      return null
  }
}
