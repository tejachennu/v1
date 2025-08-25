"use client"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Mail, User, Phone, MessageSquare, Ticket } from "lucide-react"

interface ContactFormProps {
  onStartChat: (contactInfo: { name: string; email: string; phone?: string }) => void
  onCreateTicket: (ticketInfo: { name: string; email: string; phone?: string; description: string }) => void
}

export function ContactForm({ onStartChat, onCreateTicket }: ContactFormProps) {
  // Store onlineAgents as a number so we can have actual counts!
  const [onlineAgents, setOnlineAgents] = useState<number | null>(null)
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Check the status of online agents from backend/API
  const checkOnlineAgents = async () => {
    try {
      const response = await fetch("/api/agents/status")
      const data = await response.json()
      if (data.success) {
        setOnlineAgents(data.onlineAgents)
        setShowTicketForm(data.onlineAgents === 0)
      } else {
        setOnlineAgents(0)
        setShowTicketForm(true)
      }
    } catch (error) {
      setOnlineAgents(0)
      setShowTicketForm(true)
    }
  }

  useEffect(() => {
    checkOnlineAgents()
    // Poll for updates every 30 seconds
    const interval = setInterval(checkOnlineAgents, 30000)
    return () => clearInterval(interval)
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }
    if (showTicketForm && !formData.description.trim()) {
      newErrors.description = "Issue description is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onStartChat({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
      })
    }
  }

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onCreateTicket({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        description: formData.description,
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  // While checking, show a spinner/placeholder
  if (onlineAgents === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking agent availability...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-card p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border border-border bg-card/95 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="https://consularhelpdesk.com/logonew.png"
                  alt="Consular Help Desk Logo"
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <h1 className="text-gray-900 font-semibold text-base sm:text-lg">Consular Help Desk</h1>
                  <p className="text-xs text-muted-foreground">Support Center</p>
                </div>
              </div>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mt-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-primary">
                {showTicketForm ? "Create Support Ticket" : "Start Conversation"}
              </CardTitle>
              <p className="text-sm text-muted-foreground max-w-xs">
                {onlineAgents && onlineAgents > 0
                  ? "Our agents are online and ready to help!"
                  : "No agents are currently online. Please create a ticket, and we'll get back to you."}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Suggest creating a ticket if NO agents are available and not already showing ticket form */}
            {onlineAgents === 0 && !showTicketForm && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-center transition-all">
                <Ticket className="w-6 h-6 text-accent mx-auto mb-2" />
                <p className="text-sm text-accent-foreground/80 leading-relaxed">
                  All agents are currently offline. Would you like to create a support ticket instead?
                </p>
                <Button
                  onClick={() => setShowTicketForm(true)}
                  className="mt-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg"
                  size="sm"
                >
                  Create Ticket
                </Button>
              </div>
            )}
            <form
              onSubmit={showTicketForm ? handleCreateTicket : handleStartChat}
              className="space-y-4 animate-fade-in"
            >
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`h-11 bg-input border-border focus:ring-2 focus:ring-ring rounded-lg ${
                    errors.name ? "border-destructive" : ""
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`h-11 bg-input border-border focus:ring-2 focus:ring-ring rounded-lg ${
                    errors.email ? "border-destructive" : ""
                  }`}
                  placeholder="Enter your email address"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number (Optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="h-11 bg-input border-border focus:ring-2 focus:ring-ring rounded-lg"
                  placeholder="Enter your phone number"
                />
              </div>
              {/* Description (only in Ticket mode) */}
              {showTicketForm && (
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Issue Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className={`min-h-[100px] bg-input border-border focus:ring-2 focus:ring-ring resize-none rounded-lg ${
                      errors.description ? "border-destructive" : ""
                    }`}
                    placeholder="Please describe your issue or question in detail..."
                  />
                  {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                </div>
              )}
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {/* Back button only shown if ticket form is open and agents are online */}
                {showTicketForm && onlineAgents && onlineAgents > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTicketForm(false)}
                    className="flex-1 h-11 border-border hover:bg-muted rounded-lg"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg"
                >
                  {showTicketForm ? "Create Ticket" : "Start Chat"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
