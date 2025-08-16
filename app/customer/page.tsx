"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSocket } from "../../hooks/useSocket"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { addMessage, setActiveConversation } from "@/store/slices/chatSlice"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Paperclip, X, ImageIcon, FileText, Video, Loader2 } from "lucide-react"
import { MediaMessage } from "@/components/media/MediaMessage"
import { useAuth } from "@/contexts/AuthContext"
import { LoginForm } from "@/components/auth/LoginForm"
import { ContactForm } from "@/components/customer/ContactForm"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const SUPPORTED_TYPES = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "application/pdf": "file",
  "text/plain": "file",
  "application/msword": "file",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "file",
} as const

export default function CustomerPage() {
  const { socket, isConnected, uploadFile, registerUser } = useSocket()
  const { isAuthenticated, user } = useAuth()
  const dispatch = useAppDispatch()

  const conversations = useAppSelector((state) => state.chat.conversations)
  const customerConversation = user?.id ? conversations[user.id] : null

  const [inputMessage, setInputMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showContactForm, setShowContactForm] = useState(true)
  const [agentsOnline, setAgentsOnline] = useState(false)
  const [contactInfo, setContactInfo] = useState<{
    name: string
    email: string
    phone?: string
  } | null>(null)

  useEffect(() => {
    if (isAuthenticated && user?.role === "agent") {
      window.location.href = "/agent"
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit("check_agent_availability")

      socket.on("agent_availability", (data: { available: boolean }) => {
        setAgentsOnline(data.available)
      })

      return () => {
        socket.off("agent_availability")
      }
    }
  }, [socket, isConnected])

  useEffect(() => {
    if (isConnected && user && registerUser) {
      console.log("[v0] Customer registering user:", user)
      registerUser(user)
      if (user.role === "customer") {
        dispatch(setActiveConversation(user.id))
      }
    }
  }, [isConnected, user, registerUser, dispatch])

  useEffect(() => {
    if (!socket || !user) return

    const handleAgentMessage = (data: {
      agentId: string
      agentName: string
      text: string
      media?: any
      timestamp?: string
    }) => {
      console.log("[v0] Customer received agent message:", data)

      const message = {
        id: uuidv4(),
        text: data.text || "",
        timestamp: data.timestamp || new Date().toISOString(),
        type: "agent" as const,
        agentId: data.agentId,
        agentName: data.agentName,
        media: data.media,
      }

      dispatch(
        addMessage({
          conversationId: user.id,
          message,
        }),
      )
    }

    socket.on("agent_message", handleAgentMessage)

    return () => {
      socket.off("agent_message", handleAgentMessage)
    }
  }, [socket, user, dispatch])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [customerConversation?.messages])

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }

    if (!SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES]) {
      return "Unsupported file type. Please select an image, video, or document."
    }

    return null
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      return
    }

    setUploadError(null)
    setSelectedFile(file)

    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />
    if (type.startsWith("video/")) return <Video className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !socket) return

    if (selectedFile) {
      setIsUploading(true)
      try {
        const uploadedFile = await uploadFile(selectedFile)
        if (uploadedFile) {
          const timestamp = new Date().toISOString()
          const message = {
            id: uuidv4(),
            text: inputMessage || "",
            timestamp,
            type: "customer" as const,
            customerId: user.id,
            customerName: user.name,
            media: uploadedFile,
          }

          dispatch(
            addMessage({
              conversationId: user.id,
              message,
            }),
          )

          const messageData = {
            customerId: user.id,
            customerName: user.name,
            text: inputMessage || "",
            media: uploadedFile,
            timestamp,
          }
          console.log("[v0] Customer sending message with media:", messageData)
          socket.emit("customer_message", messageData)

          setInputMessage("")
          clearSelectedFile()
        } else {
          setUploadError("Failed to upload file. Please try again.")
        }
      } catch (error) {
        setUploadError("Failed to upload file. Please try again.")
      } finally {
        setIsUploading(false)
      }
    } else if (inputMessage.trim()) {
      const timestamp = new Date().toISOString()
      const message = {
        id: uuidv4(),
        text: inputMessage,
        timestamp,
        type: "customer" as const,
        customerId: user.id,
        customerName: user.name,
      }

      dispatch(
        addMessage({
          conversationId: user.id,
          message,
        }),
      )

      const messageData = {
        customerId: user.id,
        customerName: user.name,
        text: inputMessage,
        timestamp,
      }
      console.log("[v0] Customer sending text message:", messageData)
      socket.emit("customer_message", messageData)

      setInputMessage("")
    }
  }

  const handleStartChat = (info: { name: string; email: string; phone?: string }) => {
    setContactInfo(info)
    setShowContactForm(false)

    // Create a temporary user session with contact info
    const tempUser = {
      id: uuidv4(),
      name: info.name,
      email: info.email,
      phone: info.phone,
      role: "customer" as const,
    }

    if (socket) {
      socket.emit("customer_contact_info", tempUser)
      dispatch(setActiveConversation(tempUser.id))
    }
  }

  const handleCreateTicket = async (ticketInfo: {
    name: string
    email: string
    phone?: string
    description: string
  }) => {
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...ticketInfo,
          status: "open",
          createdAt: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        // Show success message and reset form
        alert("Ticket created successfully! Our agents will contact you soon.")
        setShowContactForm(true)
      } else {
        alert("Failed to create ticket. Please try again.")
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
      alert("Failed to create ticket. Please try again.")
    }
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  if (showContactForm || !contactInfo) {
    return <ContactForm onStartChat={handleStartChat} onCreateTicket={handleCreateTicket} agentsOnline={agentsOnline} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-card via-background to-sidebar-primary p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="h-[700px] flex flex-col shadow-2xl border border-border bg-card/95 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border">
            <div>
              <CardTitle className="text-3xl font-bold text-primary">Customer Support</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Welcome, {contactInfo?.name || user?.name}</p>
            </div>
            <Badge
              variant={isConnected ? "default" : "destructive"}
              className={`px-3 py-1 text-sm font-medium ${
                isConnected
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </Badge>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-6">
            <div
              className="overflow-y-auto space-y-3 p-4 bg-muted/30 rounded-xl border border-border scroll-smooth"
              style={{ height: "450px" }}
            >
              {!customerConversation || customerConversation.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="text-lg font-medium text-foreground">Need help?</p>
                  <p className="text-sm text-muted-foreground">Send a message and an agent will assist you!</p>
                </div>
              ) : (
                customerConversation.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === "customer" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                        msg.type === "customer" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                      }`}
                    >
                      {msg.text && <p className="text-sm leading-relaxed mb-2">{msg.text}</p>}
                      {msg.media && <MediaMessage media={msg.media} className="mt-2" />}
                      <p
                        className={`text-xs mt-2 ${
                          msg.type === "customer" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {selectedFile && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(selectedFile.type)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelectedFile}
                    className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {filePreview && (
                  <div className="mt-3">
                    <img
                      src={filePreview || "/placeholder.svg"}
                      alt="Preview"
                      className="max-w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
            )}

            {uploadError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex space-x-3 mt-4">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="h-12 px-4 pr-12 rounded-xl bg-input border-border focus:ring-2 focus:ring-ring"
                  placeholder="Type your message..."
                  disabled={!isConnected || isUploading}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.txt,.doc,.docx"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={!isConnected || isUploading}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>
              <Button
                type="submit"
                disabled={!isConnected || (!inputMessage.trim() && !selectedFile) || isUploading}
                className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all duration-200"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-card/60 backdrop-blur-sm rounded-full px-6 py-3 border border-border">
            <span className="text-sm font-medium text-foreground">
              💡 Our agents are here to help! Send your questions or files.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
