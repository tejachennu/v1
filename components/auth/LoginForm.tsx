"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { User, Mail, Lock, UserPlus, MessageCircle } from "lucide-react"

type LoginFormProps = {
  role: "customer" | "agent"
}

export const LoginForm: React.FC<LoginFormProps> = ({ role }) => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [onlineAgents, setOnlineAgents] = useState<number | null>(null)
  const { login, register } = useAuth()

  useEffect(() => {
    if (role === "customer") {
      checkOnlineAgents()
    }
  }, [role])

  const checkOnlineAgents = async () => {
    try {
      const response = await fetch("/api/agents/status")
      const data = await response.json()
      if (data.success) setOnlineAgents(data.onlineAgents)
    } catch (error) {
      console.error("Failed to check online agents:", error)
    }
  }

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (onlineAgents === 0) {
      setError("No agents are currently online. Please try again later.")
      return
    }

    setIsLoading(true)
    setError("")
    const success = await login(name.trim(), "customer")
    if (!success) setError("Failed to start chat. Please try again.")
    setIsLoading(false)
  }

  const handleAgentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setIsLoading(true)
    setError("")
    const success = await login("", "agent", email.trim(), password.trim())
    if (!success) setError("Invalid email or password.")
    setIsLoading(false)
  }

  const handleAgentRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !name.trim()) return

    setIsLoading(true)
    setError("")
    const success = await register(email.trim(), password.trim(), name.trim())
    if (!success) setError("Registration failed. Email might already be in use.")
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md shadow-lg border border-gray-200 bg-white">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            {role === "customer" ? "Start Chat" : "Agent Portal"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {role === "customer" ? (
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Your Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-12"
                  required
                />
              </div>

              {onlineAgents !== null && (
                <p className={`text-xs ${onlineAgents > 0 ? "text-green-600" : "text-red-600"}`}>
                  {onlineAgents > 0
                    ? `${onlineAgents} agents online`
                    : "No agents online currently"}
                </p>
              )}

              {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</p>}

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!name.trim() || isLoading || onlineAgents === 0}
              >
                {isLoading ? "Connecting..." : "Start Chat"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleAgentLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="h-11 pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-11 pl-10"
                      required
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</p>}

                <Button
                  type="submit"
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                  disabled={!email.trim() || !password.trim() || isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
              </form>

              <hr className="my-4" />
{/* 
              <form onSubmit={handleAgentRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="h-11"
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</p>}

                <Button
                  type="submit"
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                  disabled={!email.trim() || !password.trim() || !name.trim() || isLoading}
                >
                  {isLoading ? "Registering..." : "Create Account"}
                </Button>
              </form> */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
