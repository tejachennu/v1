"use client"

import { useEffect, useState } from "react"
import io, { type Socket } from "socket.io-client"

const SOCKET_URL = "http://localhost:3001"

interface MediaFile {
  type: "image" | "video" | "file"
  url: string
  name: string
  size: number
}

interface TypingUser {
  id: string
  name: string
  role: string
}

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  useEffect(() => {
    console.log("[v0] useSocket - Initializing socket connection to:", SOCKET_URL)
    const socketIo = io(SOCKET_URL)

    socketIo.on("connect", () => {
      console.log("[v0] useSocket - Socket connected:", socketIo.id)
      setIsConnected(true)
    })

    socketIo.on("disconnect", () => {
      console.log("[v0] useSocket - Socket disconnected")
      setIsConnected(false)
    })

    socketIo.onAny((eventName, ...args) => {
      console.log("[v0] useSocket - Received socket event:", eventName, args)
    })

    socketIo.on("user_typing", (data: { userId: string; userName: string; userRole: string }) => {
      console.log("[v0] useSocket - User typing:", data)
      setTypingUsers((prev) => {
        const exists = prev.find((user) => user.id === data.userId)
        if (!exists) {
          return [...prev, { id: data.userId, name: data.userName, role: data.userRole }]
        }
        return prev
      })
    })

    socketIo.on("user_stopped_typing", (data: { userId: string }) => {
      console.log("[v0] useSocket - User stopped typing:", data)
      setTypingUsers((prev) => prev.filter((user) => user.id !== data.userId))
    })

    setSocket(socketIo)

    return () => {
      console.log("[v0] useSocket - Cleaning up socket connection")
      socketIo.disconnect()
    }
  }, [])

  const registerUser = (user: { id: string; name: string; role: string }) => {
    if (socket) {
      console.log("[v0] useSocket - Registering user:", user, "Socket ID:", socket.id)
      socket.emit("user_connected", user)
    } else {
      console.error("[v0] useSocket - Cannot register user, socket not available:", user)
    }
  }

  const sendMessage = (message: string) => {
    if (socket) {
      console.log("[v0] useSocket - Sending message:", message)
      socket.emit("chat message", message)
    }
  }

  const sendMediaMessage = (text: string, media: MediaFile) => {
    if (socket) {
      console.log("[v0] useSocket - Sending media message:", { text, media })
      socket.emit("media message", { text, media })
    }
  }

  const startTyping = (user: { id: string; name: string; role: string }, targetId?: string) => {
    if (socket) {
      console.log("[v0] useSocket - Start typing:", user, "Target:", targetId)
      socket.emit("typing_start", {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        targetId,
      })
    }
  }

  const stopTyping = (user: { id: string; name: string; role: string }, targetId?: string) => {
    if (socket) {
      console.log("[v0] useSocket - Stop typing:", user, "Target:", targetId)
      socket.emit("typing_stop", {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        targetId,
      })
    }
  }

  const uploadFile = async (file: File): Promise<MediaFile | null> => {
    try {
      console.log("[v0] useSocket - Uploading file:", file.name, file.size, file.type)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("http://localhost:3001/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        console.error("[v0] useSocket - Upload failed with status:", response.status)
        throw new Error("Upload failed")
      }

      const result = await response.json()
      console.log("[v0] useSocket - File uploaded successfully:", result.file)
      return result.file
    } catch (error) {
      console.error("[v0] useSocket - File upload error:", error)
      return null
    }
  }

  return {
    socket,
    isConnected,
    sendMessage,
    sendMediaMessage,
    uploadFile,
    registerUser,
    startTyping,
    stopTyping,
    typingUsers,
  }
}
