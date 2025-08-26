"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSocket } from "../hooks/useSocket"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { addMessage, setActiveConversation } from "@/store/slices/chatSlice"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Paperclip, X, ImageIcon, FileText, Video, Loader2, Send } from "lucide-react"
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
  const { isAuthenticated, user ,login } = useAuth()
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

  const handleStartChat = async(info: { name: string; email: string; phone?: string }) => {
    
    console.log("Customer provided contact info:", info)

    setContactInfo(info)
    setShowContactForm(false)
    console.log("Contact Info set, proceeding to login as customer")  

    // Create a temporary user session with contact info
    const tempUser = {
      id: uuidv4(),
      name: info.name,
      email: info.email,
      phone: info.phone,
      role: "customer" as const,
    }

    const success = await login(tempUser.name.trim(), "customer")
    console.log("Login success:", success)
    
    if (!success) {
      alert("Failed to start chat. Please try again.")
      setShowContactForm(true)
      return
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

  // if (!isAuthenticated) {
  //   return <LoginForm role="customer" />
  // }

  if (showContactForm || !contactInfo || !isAuthenticated) {
      

    return <ContactForm onStartChat={handleStartChat} onCreateTicket={handleCreateTicket} />
  }

  return (
    <div className="h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-full sm:w-1/2 h-full flex flex-col border border-gray-300 shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="https://consularhelpdesk.com/logonew.png"
              alt="Consular Help Desk Logo"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="text-gray-900 font-semibold text-base sm:text-lg">Consular Help Desk</h1>
              <p className="text-gray-500 text-xs">{isConnected ? "🟢 Online" : "🔴 Offline"}</p>
            </div>
          </div>
          <Badge
            variant={agentsOnline ? "default" : "secondary"}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
          >
            {agentsOnline ? "Agent Available" : "Leave Message"}
          </Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden bg-gray-50 relative">
          <div className="relative h-full overflow-y-auto px-4 py-4 space-y-2">
            {!customerConversation || customerConversation.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl text-blue-600">💬</span>
                </div>
                <p className="text-gray-800 font-medium">Need help?</p>
                <p className="text-gray-500 text-sm">Send a message and an agent will assist you!</p>
              </div>
            ) : (
              customerConversation.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === "customer" ? "justify-end" : "justify-start"} mb-2`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${
                      msg.type === "customer"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-gray-200 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                    {msg.media && <MediaMessage media={msg.media} className="mt-2 rounded-lg overflow-hidden" />}
                    <p className="text-xs mt-1 opacity-70">
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
        </div>

        {/* Selected File */}
        {selectedFile && (
          <div className="bg-gray-100 border-t border-gray-200 px-4 py-2">
            <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-2">
              <div className="flex-shrink-0">
                {filePreview ? (
                  <img
                    src={filePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                    {getFileIcon(selectedFile.type)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-gray-500 text-xs">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelectedFile}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="bg-red-100 border-t border-red-300 px-4 py-2">
            <p className="text-red-600 text-sm">{uploadError}</p>
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500 rounded-full pl-4 pr-12 py-2 h-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type a message"
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
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full"
                disabled={!isConnected || isUploading}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
            <Button
              type="submit"
              disabled={!isConnected || (!inputMessage.trim() && !selectedFile) || isUploading}
              className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-0 flex items-center justify-center transition-all duration-200"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  
  )
}
