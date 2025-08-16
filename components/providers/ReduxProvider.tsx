"use client"

import type React from "react"

import { Provider } from "react-redux"
import { store } from "@/store"
import { useEffect } from "react"
import { cleanupExpiredMessages, addMessage } from "@/store/slices/chatSlice"

const STORAGE_KEY = "chat_conversations"

const saveToLocalStorage = (state: any) => {
  try {
    const serializedState = JSON.stringify({
      conversations: state.chat.conversations,
      timestamp: Date.now(),
    })
    localStorage.setItem(STORAGE_KEY, serializedState)
  } catch (error) {
    console.error("Failed to save to localStorage:", error)
  }
}

const loadFromLocalStorage = () => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY)
    if (!serializedState) return null

    const { conversations, timestamp } = JSON.parse(serializedState)
    const now = Date.now()
    const twentyFourHours = 24 * 60 * 60 * 1000

    const validConversations: any = {}
    Object.keys(conversations).forEach((conversationId) => {
      const conversation = conversations[conversationId]
      const lastActivity = new Date(conversation.lastActivity).getTime()
      const sessionExpiry = conversation.sessionExpiresAt
        ? new Date(conversation.sessionExpiresAt).getTime()
        : now + twentyFourHours

      // Keep conversation if it's not expired by either condition
      if (now - lastActivity < twentyFourHours && now < sessionExpiry) {
        validConversations[conversationId] = {
          ...conversation,
          lastActivity: conversation.lastActivity,
          createdAt: conversation.createdAt,
          sessionExpiresAt: conversation.sessionExpiresAt || new Date(now + twentyFourHours).toISOString(),
          messages: conversation.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp,
          })),
        }
      }
    })

    return validConversations
  } catch (error) {
    console.error("Failed to load from localStorage:", error)
    return null
  }
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const persistedConversations = loadFromLocalStorage()
    if (persistedConversations && Object.keys(persistedConversations).length > 0) {
      Object.keys(persistedConversations).forEach((conversationId) => {
        const conversation = persistedConversations[conversationId]
        conversation.messages.forEach((message: any) => {
          store.dispatch(addMessage({ conversationId, message }))
        })
      })
    }

    const cleanupInterval = setInterval(
      () => {
        console.log("[v0] Running scheduled cleanup of expired conversations")
        store.dispatch(cleanupExpiredMessages())
      },
      5 * 60 * 1000, // 5 minutes instead of 30
    )

    const unsubscribe = store.subscribe(() => {
      const state = store.getState()
      saveToLocalStorage(state)
    })

    const now = new Date()
    const nextMidnight = new Date()
    nextMidnight.setHours(24, 0, 0, 0) // Next midnight

    const timeUntilMidnight = nextMidnight.getTime() - now.getTime()

    const dailyCleanupTimeout = setTimeout(() => {
      console.log("[v0] Running daily midnight cleanup")
      store.dispatch(cleanupExpiredMessages())

      // Set up recurring daily cleanup at midnight
      const dailyInterval = setInterval(
        () => {
          console.log("[v0] Running daily midnight cleanup")
          store.dispatch(cleanupExpiredMessages())
        },
        24 * 60 * 60 * 1000,
      ) // 24 hours

      return () => clearInterval(dailyInterval)
    }, timeUntilMidnight)

    // Initial cleanup on mount
    store.dispatch(cleanupExpiredMessages())

    return () => {
      clearInterval(cleanupInterval)
      clearTimeout(dailyCleanupTimeout)
      unsubscribe()
    }
  }, [])

  return <Provider store={store}>{children}</Provider>
}
