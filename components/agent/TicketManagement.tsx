"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Ticket,
  Clock,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Calendar,
  AlertCircle,
} from "lucide-react"

interface TicketData {
  id: string
  name: string
  email: string
  phone?: string
  description: string
  status: "open" | "closed" | "in-progress"
  createdAt: string
  updatedAt: string
  assignedAgent?: string
}

interface TicketManagementProps {
  agentId?: string
  agentName?: string
}

export function TicketManagement({ agentId, agentName }: TicketManagementProps) {
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    filterTickets()
  }, [tickets, searchTerm, statusFilter])

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/tickets")
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterTickets = () => {
    let filtered = tickets
    if (searchTerm) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter)
    }
    setFilteredTickets(filtered)
  }

  const updateTicketStatus = async (ticketId: string, status: "open" | "closed" | "in-progress") => {
    try {
      const response = await fetch("/api/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status,
          assignedAgent: status === "in-progress" ? agentName : undefined,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? data.ticket : ticket)))
        if (selectedTicket?.id === ticketId) setSelectedTicket(data.ticket)
      }
    } catch (error) {
      console.error("Error updating ticket:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-50 text-red-700 border-red-200"
      case "in-progress": return "bg-yellow-50 text-yellow-800 border-yellow-200"
      case "closed": return "bg-green-50 text-green-700 border-green-200"
      default: return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="w-3 h-3" />
      case "in-progress": return <Clock className="w-3 h-3" />
      case "closed": return <CheckCircle className="w-3 h-3" />
      default: return <Ticket className="w-3 h-3" />
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    })

  const openTicketDialog = (ticket: TicketData) => {
    setSelectedTicket(ticket)
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <Card className="h-[600px] flex flex-col rounded-xl">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading tickets...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-[600px] flex flex-col shadow-2xl border border-gray-200 bg-white/80 backdrop-blur-md rounded-xl">
      <CardHeader className="pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Ticket className="w-5 h-5" /> Support Tickets
            </CardTitle>
            <p className="text-sm text-gray-400">Manage customer support requests</p>
          </div>
          <span className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-white/60">{filteredTickets.length} tickets</span>
        </div>
        <div className="flex gap-3 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-50 border border-gray-200 rounded"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-gray-50 border border-gray-200 rounded">
              <Filter className="w-4 h-4 mr-2 text-gray-400" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      {/* ENHANCED TAILWIND-ONLY SCROLL AREA */}
      <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
              <Ticket className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-sm text-gray-400">
                {searchTerm || statusFilter !== "all"
                  ? "No tickets match your filters"
                  : "No support tickets yet"}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Customer tickets will appear here"}
              </p>
            </div>
          ) : (
            filteredTickets
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((ticket) => (
                <div
                  key={ticket.id}
                  className="relative p-5 rounded-xl border transition-shadow bg-white/90 shadow-sm hover:shadow-lg hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
                  onClick={() => openTicketDialog(ticket)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center text-xs font-bold px-2 py-1 rounded-full shadow-sm border ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      <span className="ml-1 capitalize">{ticket.status.replace("-", " ")}</span>
                    </span>
                    {ticket.assignedAgent && (
                      <span className="inline-block text-xs border border-gray-300 bg-gray-50 px-2 py-1 rounded font-medium text-gray-700">
                        Assigned to {ticket.assignedAgent}
                      </span>
                    )}
                  </div>
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-sm text-gray-700">{ticket.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm">
                      <Mail className="w-4 h-4" />
                      <span>{ticket.email}</span>
                      {ticket.phone && (
                        <>
                          <Phone className="w-4 h-4 ml-2" />
                          <span>{ticket.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mb-2 text-sm text-gray-900 line-clamp-2">{ticket.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created {formatDate(ticket.createdAt)}
                    </div>
                    {ticket.updatedAt !== ticket.createdAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {formatDate(ticket.updatedAt)}
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </CardContent>

      {/* DIALOG (unchanged) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          {selectedTicket && (
            <>
              <DialogHeader className="p-4 border-b border-gray-200">
                <DialogTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" /> Ticket Details
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center text-xs font-bold px-2 py-1 rounded-full shadow-sm border ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusIcon(selectedTicket.status)}
                      <span className="ml-1 capitalize">{selectedTicket.status.replace("-", " ")}</span>
                    </span>
                    {selectedTicket.assignedAgent && (
                      <span className="inline-block text-xs border border-gray-300 bg-gray-50 px-2 py-1 rounded font-medium text-gray-700">
                        Assigned to {selectedTicket.assignedAgent}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-sm">{selectedTicket.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{selectedTicket.email}</span>
                      {selectedTicket.phone && (
                        <>
                          <Phone className="w-4 h-4 text-gray-400 ml-2" />
                          <span className="text-sm text-gray-500">{selectedTicket.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mb-2">
                    <Label>Description:</Label>
                    <p className="text-gray-700">{selectedTicket.description}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created {formatDate(selectedTicket.createdAt)}
                    </div>
                    {selectedTicket.updatedAt !== selectedTicket.createdAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {formatDate(selectedTicket.updatedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-4 border-t border-gray-200">
                {selectedTicket.status === "open" && (
                  <Button
                    onClick={() => updateTicketStatus(selectedTicket.id, "in-progress")}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Start Working
                  </Button>
                )}
                {selectedTicket.status === "in-progress" && (
                  <Button
                    onClick={() => updateTicketStatus(selectedTicket.id, "closed")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Resolved
                  </Button>
                )}
                {selectedTicket.status === "closed" && (
                  <Button onClick={() => updateTicketStatus(selectedTicket.id, "open")} variant="outline">
                    <XCircle className="w-4 h-4 mr-2" />
                    Reopen Ticket
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
