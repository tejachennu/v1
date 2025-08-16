import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface Message {
  id: string
  text: string
  timestamp: string // Changed from Date to string for Redux serialization
  type: "customer" | "agent"
  customerId?: string
  customerName?: string
  agentId?: string
  agentName?: string
  media?: {
    type: string
    url: string
    name: string
    size: number
  }
}

export interface Conversation {
  id: string
  customerId: string
  customerName: string
  agentId?: string
  agentName?: string
  messages: Message[]
  lastActivity: string // Changed from Date to string for Redux serialization
  createdAt: string // Changed from Date to string for Redux serialization
  isActive: boolean
  sessionExpiresAt: string
}

interface ChatState {
  conversations: Record<string, Conversation>
  activeConversationId: string | null
  typingUsers: Record<string, { name: string; timestamp: number }>
}

const initialState: ChatState = {
  conversations: {},
  activeConversationId: null,
  typingUsers: {},
}

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ conversationId: string; message: Message }>) => {
      const { conversationId, message } = action.payload

      const messageWithStringTimestamp = {
        ...message,
        timestamp:
          typeof message.timestamp === "string" ? message.timestamp : new Date(message.timestamp).toISOString(),
      }

      if (!state.conversations[conversationId]) {
        console.log(
          "[v0] Creating new conversation for:",
          conversationId,
          messageWithStringTimestamp.customerName || messageWithStringTimestamp.agentName,
        )
        const now = new Date()
        const sessionExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

        state.conversations[conversationId] = {
          id: conversationId,
          customerId: messageWithStringTimestamp.customerId || conversationId,
          customerName:
            messageWithStringTimestamp.customerName || messageWithStringTimestamp.agentName || "Unknown Customer",
          agentId: messageWithStringTimestamp.agentId,
          agentName: messageWithStringTimestamp.agentName,
          messages: [],
          lastActivity: messageWithStringTimestamp.timestamp,
          createdAt: messageWithStringTimestamp.timestamp,
          isActive: true,
          sessionExpiresAt: sessionExpiry.toISOString(),
        }
      }

      const existingMessage = state.conversations[conversationId].messages.find(
        (msg) =>
          msg.id === messageWithStringTimestamp.id ||
          (msg.text === messageWithStringTimestamp.text &&
            msg.type === messageWithStringTimestamp.type &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(messageWithStringTimestamp.timestamp).getTime()) <
              2000),
      )

      if (!existingMessage) {
        state.conversations[conversationId].messages.push(messageWithStringTimestamp)
        state.conversations[conversationId].lastActivity = messageWithStringTimestamp.timestamp
        console.log(
          "[v0] Added message to conversation:",
          conversationId,
          "Total messages:",
          state.conversations[conversationId].messages.length,
        )

        // Update agent info if message is from agent
        if (messageWithStringTimestamp.type === "agent" && messageWithStringTimestamp.agentId) {
          state.conversations[conversationId].agentId = messageWithStringTimestamp.agentId
          state.conversations[conversationId].agentName = messageWithStringTimestamp.agentName
        }
      } else {
        console.log("[v0] Duplicate message detected, skipping:", messageWithStringTimestamp.id)
      }
    },

    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload
    },

    setTyping: (state, action: PayloadAction<{ userId: string; name: string; isTyping: boolean }>) => {
      const { userId, name, isTyping } = action.payload

      if (isTyping) {
        state.typingUsers[userId] = { name, timestamp: Date.now() }
      } else {
        delete state.typingUsers[userId]
      }
    },

    cleanupExpiredMessages: (state) => {
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000
      let cleanedCount = 0

      Object.keys(state.conversations).forEach((conversationId) => {
        const conversation = state.conversations[conversationId]
        const sessionExpiryTime = new Date(conversation.sessionExpiresAt).getTime()
        const lastActivityTime = new Date(conversation.lastActivity).getTime()
        const isExpired = now > sessionExpiryTime || now - lastActivityTime > twentyFourHours

        if (isExpired) {
          delete state.conversations[conversationId]
          cleanedCount++

          // Clear active conversation if it was deleted
          if (state.activeConversationId === conversationId) {
            state.activeConversationId = null
          }
        }
      })

      const fiveMinutes = 5 * 60 * 1000
      Object.keys(state.typingUsers).forEach((userId) => {
        const typingUser = state.typingUsers[userId]
        if (now - typingUser.timestamp > fiveMinutes) {
          delete state.typingUsers[userId]
        }
      })

      if (cleanedCount > 0) {
        console.log(`[v0] Cleaned up ${cleanedCount} expired conversations`)
      }
    },

    clearAllConversations: (state) => {
      state.conversations = {}
      state.activeConversationId = null
      state.typingUsers = {}
    },

    endSession: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload
      if (state.conversations[conversationId]) {
        delete state.conversations[conversationId]
        if (state.activeConversationId === conversationId) {
          state.activeConversationId = null
        }
        console.log(`[v0] Manually ended session for conversation: ${conversationId}`)
      }
    },
  },
})

export const {
  addMessage,
  setActiveConversation,
  setTyping,
  cleanupExpiredMessages,
  clearAllConversations,
  endSession,
} = chatSlice.actions

export default chatSlice.reducer
