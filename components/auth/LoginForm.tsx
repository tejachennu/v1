"use client"

import React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth, type UserRole } from "@/contexts/AuthContext"
import { User, MessageCircle, Mail, Lock, UserPlus } from "lucide-react"

export const LoginForm: React.FC = () => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("customer")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [onlineAgents, setOnlineAgents] = useState<number | null>(null)
  const { login, register } = useAuth()

  React.useEffect(() => {
    if (role === "customer") {
      checkOnlineAgents()
    }
  }, [role])

  const checkOnlineAgents = async () => {
    try {
      const response = await fetch("/api/agents/status")
      const data = await response.json()
      if (data.success) {
        setOnlineAgents(data.onlineAgents)
      }
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
    if (!success) {
      setError("Failed to start chat. Please try again.")
    }
    setIsLoading(false)
  }

  const handleAgentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setIsLoading(true)
    setError("")

    const success = await login("", "agent", email.trim(), password.trim())
    if (!success) {
      setError("Invalid email or password. Please try again.")
    }
    setIsLoading(false)
  }

  const handleAgentRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !name.trim()) return

    setIsLoading(true)
    setError("")

    const success = await register(email.trim(), password.trim(), name.trim())
    if (!success) {
      setError("Registration failed. Email might already be in use.")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-card via-background to-sidebar-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border border-border/50 bg-card/95 backdrop-blur-md">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Join Chat</CardTitle>
          <p className="text-sm text-muted-foreground">Enter your details to start messaging</p>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">I am a:</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as UserRole)} className="space-y-3">
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-all duration-200">
                  <RadioGroupItem value="customer" id="customer" />
                  <Label htmlFor="customer" className="flex items-center space-x-3 cursor-pointer flex-1">
                    <User className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">Customer</div>
                      <div className="text-xs text-muted-foreground">
                        Need help or support
                        {role === "customer" && onlineAgents !== null && (
                          <span
                            className={`ml-2 font-medium ${onlineAgents > 0 ? "text-green-600" : "text-destructive"}`}
                          >
                            ({onlineAgents} agents online)
                          </span>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-all duration-200">
                  <RadioGroupItem value="agent" id="agent" />
                  <Label htmlFor="agent" className="flex items-center space-x-3 cursor-pointer flex-1">
                    <MessageCircle className="w-5 h-5 text-secondary" />
                    <div>
                      <div className="font-medium text-foreground">Agent</div>
                      <div className="text-xs text-muted-foreground">Provide customer support</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {role === "customer" ? (
              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">
                    Your Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-12 bg-input border-border focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-200"
                  disabled={!name.trim() || isLoading || onlineAgents === 0}
                >
                  {isLoading ? "Starting..." : onlineAgents === 0 ? "No Agents Available" : "Start Chatting"}
                </Button>
              </form>
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleAgentLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-foreground">
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
                      <Label htmlFor="password" className="text-sm font-medium text-foreground">
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

                    {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

                    <Button
                      type="submit"
                      className="w-full h-11 bg-green-600 hover:bg-green-700 font-medium"
                      disabled={!email.trim() || !password.trim() || isLoading}
                    >
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleAgentRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-sm font-medium text-foreground">
                        Full Name
                      </Label>
                      <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="reg-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your full name"
                          className="h-11 pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-sm font-medium text-foreground">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="reg-email"
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
                      <Label htmlFor="reg-password" className="text-sm font-medium text-foreground">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="reg-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                          className="h-11 pl-10"
                          required
                        />
                      </div>
                    </div>

                    {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

                    <Button
                      type="submit"
                      className="w-full h-11 bg-green-600 hover:bg-green-700 font-medium"
                      disabled={!email.trim() || !password.trim() || !name.trim() || isLoading}
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
