"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { useSocket } from "@/hooks/useSocket"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { addMessage, setActiveConversation, setTyping, endSession } from "@/store/slices/chatSlice"
import { MediaMessage } from "@/components/media/MediaMessage"
import { StatusToggle } from "@/components/agent/StatusToggle"
import {
  MessageCircle,
  Users,
  Clock,
  Send,
  Paperclip,
  Loader2,
  LogOut,
  Download,
  FileDown,
  Database,
  History,
  Zap,
  X,
  FileSpreadsheet,
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export const AgentDashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const { socket, isConnected, uploadFile, registerUser } = useSocket()
  const dispatch = useAppDispatch()

  const conversations = useAppSelector((state) => state.chat.conversations)
  const activeConversationId = useAppSelector((state) => state.chat.activeConversationId)
  const typingUsers = useAppSelector((state) => state.chat.typingUsers)

  const [inputMessage, setInputMessage] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<"live" | "previous">("live")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const conversationsList = useMemo(() => {
    console.log("[v0] AgentDashboard - conversations updated:", Object.keys(conversations).length)
    return Object.values(conversations).map((conv) => ({
      customerId: conv.customerId,
      customerName: conv.customerName,
      lastMessage:
        conv.messages[conv.messages.length - 1]?.text ||
        (conv.messages[conv.messages.length - 1]?.media
          ? `Sent ${conv.messages[conv.messages.length - 1]?.media?.type}`
          : ""),
      lastMessageTime: conv.lastActivity,
      unreadCount: 0,
      sessionExpiresAt: conv.sessionExpiresAt,
      messages: conv.messages.map((msg) => ({
        id: msg.id,
        type: msg.type,
        customerId: msg.customerId || conv.customerId,
        customerName: msg.customerName || conv.customerName,
        agentId: msg.agentId,
        agentName: msg.agentName,
        text: msg.text,
        timestamp: msg.timestamp,
        media: msg.media,
      })),
    }))
  }, [conversations])

  const { liveConversations, previousConversations } = useMemo(() => {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const live = conversationsList.filter((conv) => new Date(conv.lastMessageTime) > oneHourAgo)
    const previous = conversationsList.filter((conv) => new Date(conv.lastMessageTime) <= oneHourAgo)

    console.log("[v0] AgentDashboard - live conversations:", live.length, "previous:", previous.length)

    return {
      liveConversations: live,
      previousConversations: previous,
    }
  }, [conversationsList])

  const selectedConversation = activeConversationId ? conversations[activeConversationId] : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedConversation?.messages])

  useEffect(() => {
    if (isConnected && user) {
      console.log("[v0] Agent dashboard - registering user:", user)
      if (registerUser) {
        registerUser(user)
        console.log("[v0] Agent registration called for:", user.id, user.name)
      }
    }
  }, [isConnected, user])

  useEffect(() => {
    if (!socket) return

    const handleCustomerMessage = (data: {
      customerId: string
      customerName: string
      text: string
      media?: any
      timestamp?: string
    }) => {
      console.log("[v0] Agent received customer message:", data)

      const message = {
        id: uuidv4(),
        text: data.text || "",
        timestamp: data.timestamp || new Date().toISOString(),
        type: "customer" as const,
        customerId: data.customerId,
        customerName: data.customerName,
        media: data.media,
      }

      console.log("[v0] Dispatching addMessage to Redux store")
      dispatch(
        addMessage({
          conversationId: data.customerId,
          message,
        }),
      )

      if (!activeConversationId) {
        console.log("[v0] Auto-selecting first conversation:", data.customerId)
        dispatch(setActiveConversation(data.customerId))
      }

      console.log("[v0] Agent added message to Redux store for customer:", data.customerId)
    }

    const handleUserTyping = (data: { userId: string; userName: string; userRole: string }) => {
      dispatch(setTyping({ userId: data.userId, name: data.userName, isTyping: true }))
    }

    const handleUserStoppedTyping = (data: { userId: string }) => {
      dispatch(setTyping({ userId: data.userId, name: "", isTyping: false }))
    }

    socket.on("customer_message", handleCustomerMessage)
    socket.on("user_typing", handleUserTyping)
    socket.on("user_stopped_typing", handleUserStoppedTyping)

    return () => {
      socket.off("customer_message", handleCustomerMessage)
      socket.off("user_typing", handleUserTyping)
      socket.off("user_stopped_typing", handleUserStoppedTyping)
    }
  }, [socket, dispatch, activeConversationId])

  useEffect(() => {
    console.log("[v0] AgentDashboard - conversations state changed:", {
      totalConversations: Object.keys(conversations).length,
      activeConversationId,
      conversationIds: Object.keys(conversations),
    })
  }, [conversations, activeConversationId])

  const handleSelectConversation = (customerId: string) => {
    dispatch(setActiveConversation(customerId))
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeConversationId || (!inputMessage.trim() && !selectedFile)) return

    if (selectedFile) {
      setIsUploading(true)
      try {
        const uploadedFile = await uploadFile(selectedFile)
        if (uploadedFile && socket) {
          const timestamp = new Date().toISOString()
          socket.emit("agent_message", {
            customerId: activeConversationId,
            agentId: user?.id,
            agentName: user?.name,
            text: inputMessage || "",
            media: uploadedFile,
            timestamp,
          })

          const message = {
            id: uuidv4(),
            text: inputMessage || "",
            timestamp,
            type: "agent" as const,
            agentId: user?.id,
            agentName: user?.name,
            media: uploadedFile,
          }

          dispatch(
            addMessage({
              conversationId: activeConversationId,
              message,
            }),
          )

          setInputMessage("")
          clearSelectedFile()
        }
      } catch (error) {
        setUploadError("Failed to upload file. Please try again.")
      } finally {
        setIsUploading(false)
      }
    } else if (inputMessage.trim() && socket) {
      const timestamp = new Date().toISOString()
      socket.emit("agent_message", {
        customerId: activeConversationId,
        agentId: user?.id,
        agentName: user?.name,
        text: inputMessage,
        timestamp,
      })

      const message = {
        id: uuidv4(),
        text: inputMessage,
        timestamp,
        type: "agent" as const,
        agentId: user?.id,
        agentName: user?.name,
      }

      dispatch(
        addMessage({
          conversationId: activeConversationId,
          message,
        }),
      )

      setInputMessage("")
    }
  }

  const handleExportChats = async (format: "json" | "csv") => {
    if (!user?.id) return

    setIsExporting(true)
    try {
      const exportData = {
        agentId: user.id,
        agentName: user.name,
        exportDate: new Date().toISOString(),
        conversations: Object.values(conversations),
      }

      const dataStr = format === "json" ? JSON.stringify(exportData, null, 2) : convertToCSV(exportData)

      const blob = new Blob([dataStr], {
        type: format === "json" ? "application/json" : "text/csv",
      })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `chat-export-${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Export failed:", error)
      setUploadError("Failed to export chats. Please try again.")
      setTimeout(() => setUploadError(null), 3000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = async () => {
    if (!user?.id) return

    setIsExporting(true)
    try {
      const exportData = {
        agentId: user.id,
        agentName: user.name,
        conversations: Object.values(conversations),
      }

      const response = await fetch("/api/export/excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportData),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `chat-export-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error("Export failed")
      }
    } catch (error) {
      console.error("Excel export failed:", error)
      setUploadError("Failed to export to Excel. Please try again.")
      setTimeout(() => setUploadError(null), 3000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleEndSession = (conversationId: string) => {
    if (window.confirm("Are you sure you want to end this session? This will remove the chat from your dashboard.")) {
      dispatch(endSession(conversationId))

      // Notify customer that session has ended
      if (socket) {
        socket.emit("session_ended", {
          customerId: conversationId,
          agentId: user?.id,
          agentName: user?.name,
        })
      }
    }
  }

  const convertToCSV = (data: any) => {
    const headers = ["Customer ID", "Customer Name", "Message", "Type", "Timestamp", "Agent"]
    const rows = []

    Object.values(data.conversations).forEach((conv: any) => {
      conv.messages.forEach((msg: any) => {
        rows.push([
          conv.customerId,
          conv.customerName,
          msg.text || (msg.media ? `[${msg.media.type}]` : ""),
          msg.type,
          msg.timestamp,
          msg.agentName || data.agentName || "",
        ])
      })
    })

    return [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.size <= MAX_FILE_SIZE) {
      setSelectedFile(file)
      setFilePreview(URL.createObjectURL(file))
    } else {
      setSelectedFile(null)
      setFilePreview(null)
      setUploadError("File size exceeds 5MB or no file selected.")
      setTimeout(() => setUploadError(null), 3000)
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
  }

  const renderConversationsList = (conversations: any[]) => (
    <div className="space-y-1 p-4">
      {conversations
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
        .map((conversation) => {
          const now = new Date()
          const expiresAt = new Date(conversation.sessionExpiresAt)
          const timeUntilExpiry = Math.max(0, expiresAt.getTime() - now.getTime())
          const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60))
          const minutesUntilExpiry = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60))

          return (
            <div
              key={conversation.customerId}
              className={`p-3 rounded-lg transition-colors ${
                activeConversationId === conversation.customerId
                  ? "bg-sidebar-primary dark:bg-sidebar-primary/20 border border-sidebar-border"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-start space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                    {conversation.customerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className="text-sm font-medium truncate cursor-pointer"
                      onClick={() => handleSelectConversation(conversation.customerId)}
                    >
                      {conversation.customerName}
                    </p>
                    <div className="flex items-center gap-1">
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEndSession(conversation.customerId)
                        }}
                        className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p
                    className="text-xs text-muted-foreground truncate cursor-pointer"
                    onClick={() => handleSelectConversation(conversation.customerId)}
                  >
                    {conversation.lastMessage}
                  </p>
                  <div className="flex items-center mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground mr-1" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(conversation.lastMessageTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">• {conversation.messages.length} msgs</span>
                    {timeUntilExpiry > 0 && (
                      <span className="text-xs text-orange-500 ml-2">
                        • Expires in {hoursUntilExpiry}h {minutesUntilExpiry}m
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-background to-sidebar-primary p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
          {/* Conversations Sidebar */}
          <Card className="lg:col-span-1 shadow-2xl border border-sidebar-border bg-sidebar/95 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-sidebar-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-primary">Agent Dashboard</CardTitle>
                  <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isExporting}>
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExportChats("json")} className="cursor-pointer">
                        <Database className="w-4 h-4 mr-2" />
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportChats("csv")} className="cursor-pointer">
                        <FileDown className="w-4 h-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export to Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={isConnected ? "default" : "destructive"}
                    className={`text-xs font-medium ${
                      isConnected
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                  >
                    {isConnected ? "Online" : "Offline"}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-border">
                    <Users className="w-3 h-3 mr-1" />
                    {conversationsList.length} conversations
                  </Badge>
                </div>
                <StatusToggle />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as "live" | "previous")}
                className="h-[500px]"
              >
                <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
                  <TabsTrigger value="live" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Live Chat
                    {liveConversations.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {liveConversations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="previous" className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Previous Chat
                    {previousConversations.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {previousConversations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="live" className="mt-0 h-[450px]">
                  <ScrollArea className="h-full">
                    {liveConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <Zap className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-sm text-muted-foreground">No active conversations</p>
                        <p className="text-xs text-muted-foreground mt-1">Waiting for customers to reach out...</p>
                      </div>
                    ) : (
                      renderConversationsList(liveConversations)
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="previous" className="mt-0 h-[450px]">
                  <ScrollArea className="h-full">
                    {previousConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <History className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-sm text-muted-foreground">No previous conversations</p>
                        <p className="text-xs text-muted-foreground mt-1">Past conversations will appear here</p>
                      </div>
                    ) : (
                      renderConversationsList(previousConversations)
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 shadow-2xl border border-border bg-card/95 backdrop-blur-md">
            {selectedConversation ? (
              <>
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {selectedConversation.customerName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedConversation.customerName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Customer • {selectedConversation.messages.length} messages
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-6">
                  <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-muted/30 rounded-xl border border-border scroll-smooth max-h-[400px]">
                    {console.log(
                      "[v0] Rendering messages for conversation:",
                      selectedConversation.customerId,
                      "Total messages:",
                      selectedConversation.messages.length,
                    )}
                    {selectedConversation.messages.map((msg, index) => {
                      console.log(`[v0] Message ${index}:`, {
                        id: msg.id,
                        type: msg.type,
                        text: msg.text,
                        customerId: msg.customerId,
                        agentId: msg.agentId,
                        timestamp: msg.timestamp,
                      })
                      return (
                        <div key={msg.id} className={`flex ${msg.type === "agent" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                              msg.type === "agent"
                                ? "bg-primary text-primary-foreground"
                                : "bg-card border border-border"
                            }`}
                          >
                            <div className="text-xs opacity-50 mb-1">
                              {msg.type === "agent" ? "Agent" : "Customer"} - {msg.type}
                            </div>
                            {msg.text && <p className="text-sm leading-relaxed mb-2">{msg.text}</p>}
                            {msg.media && <MediaMessage media={msg.media} className="mt-2" />}
                            <p
                              className={`text-xs mt-2 ${
                                msg.type === "agent" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}

                    {Object.entries(typingUsers).map(([userId, user]) => (
                      <div key={userId} className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user.name} is typing...</p>
                        </div>
                      </div>
                    ))}

                    <div ref={messagesEndRef} />
                  </div>

                  {uploadError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex space-x-3 mt-4">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        className="h-12 px-4 pr-12 rounded-xl bg-input border-border focus:ring-2 focus:ring-ring"
                        placeholder="Type your response..."
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
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Select a conversation</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a customer from the sidebar to start responding
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
