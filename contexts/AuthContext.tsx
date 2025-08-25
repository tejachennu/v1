"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export type UserRole = "customer" | "agent"

export interface User {
  id: string | number
  name: string
  role: UserRole
  email?: string
  status?: "online" | "offline"
}

interface AuthContextType {
  user: User | null
  login: (name: string, role: UserRole, email?: string, password?: string) => Promise<boolean>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<boolean>
  updateStatus: (status: "online" | "offline") => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check for stored user data on mount
    const storedUser = localStorage.getItem("chatUser")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const login = async (name: string, role: UserRole, email?: string, password?: string): Promise<boolean> => {
    try {
      if (role === "agent") {
        // Agent login with MySQL authentication
        if (!email || !password) {
          throw new Error("Email and password required for agent login")
        }

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error)
        }

        const newUser: User = {
          id: data.agent.id,
          name: data.agent.name,
          email: data.agent.email,
          role: "agent",
          status: data.agent.status,
        }
        setUser(newUser)
        localStorage.setItem("chatUser", JSON.stringify(newUser))
        return true
      } else {
        const newUser: User = {
          id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          role: "customer",
        }
        setUser(newUser)
        localStorage.setItem("chatUser", JSON.stringify(newUser))
        return true
      }
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error)
      }

      const newUser: User = {
        id: data.agent.id,
        name: data.agent.name,
        email: data.agent.email,
        role: "agent",
        status: data.agent.status,
      }
      setUser(newUser)
      localStorage.setItem("chatUser", JSON.stringify(newUser))
      return true
    } catch (error) {
      console.error("Registration error:", error)
      return false
    }
  }

  const logout = async () => {
    if (user && user.role === "agent") {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: user.id }),
        })
      } catch (error) {
        console.error("Logout error:", error)
      }
    }
    setUser(null)
    localStorage.removeItem("chatUser")
  }

  const updateStatus = async (status: "online" | "offline") => {
    if (user && user.role === "agent") {
      try {
        const response = await fetch("/api/agents/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: user.id, status }),
        })

        if (response.ok) {
          const updatedUser = { ...user, status }
          setUser(updatedUser)
          localStorage.setItem("chatUser", JSON.stringify(updatedUser))
        }
      } catch (error) {
        console.error("Status update error:", error)
      }
    }
  }

  const isAuthenticated = user !== null

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateStatus, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}
