const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")
const { Server } = require("socket.io")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { BlobServiceClient } = require("@azure/storage-blob")

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

const AZURE_STORAGE_CONNECTION_STRING =
  "DefaultEndpointsProtocol=https;AccountName=blsindia;AccountKey=mDVF5JlxGCqtOZH44ij/t6ntKErx50yJOQaEEc4jDfYgRsZdbm5nkUHs5AEPtr6Gwx8LrcFDzH/r+ASt1GV+sQ==;EndpointSuffix=core.windows.net"
const containerName = "skill2share"

const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const upload = multer({ dest: uploadsDir })

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)

    res.setHeader("Access-Control-Allow-Origin", "https://support.consularhelpdesk.com")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

    if (req.method === "OPTIONS") {
      res.writeHead(200)
      res.end()
      return
    }

    if (parsedUrl.pathname === "/api/upload" && req.method === "POST") {
      upload.single("file")(req, res, async (err) => {
        if (err) {
          console.error("Upload error:", err)
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: err.message }))
          return
        }

        if (!req.file) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "No file uploaded" }))
          return
        }

        try {
          const filePath = req.file.path
          const blobName = `${Date.now()}-${req.file.originalname}`

          const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
          const containerClient = blobServiceClient.getContainerClient(containerName)

          await containerClient.createIfNotExists({ access: "container" })

          // Ensure the container exists
          const exists = await containerClient.exists();
          if (!exists) {
            await containerClient.create({ access: "container" });
          }

          const blockBlobClient = containerClient.getBlockBlobClient(blobName)
          await blockBlobClient.uploadFile(filePath)

          fs.unlinkSync(filePath)

          const blobUrl = blockBlobClient.url
          const fileType = req.file.mimetype.startsWith("image/")
            ? "image"
            : req.file.mimetype.startsWith("video/")
              ? "video"
              : "file"

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              success: true,
              file: {
                url: blobUrl,
                name: req.file.originalname,
                size: req.file.size,
                type: fileType,
              },
            }),
          )
        } catch (azureError) {
          console.error("Azure upload error:", azureError)
          res.writeHead(500, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Failed to upload to Azure Storage" }))
        }
      })
      return
    }

    handle(req, res, parsedUrl)
  })

  const io = new Server(server, {
    cors: {
      origin: "https://support.consularhelpdesk.com",
      methods: ["GET", "POST"],
    },
  })

  const connectedUsers = new Map()
  const agents = new Set()
  const customers = new Set()
  const typingUsers = new Map()

  io.on("connection", (socket) => {
    console.log("A client connected:", socket.id)

    socket.on("user_connected", (userInfo) => {
      console.log("[v0] User connected:", userInfo)

      connectedUsers.set(userInfo.id, {
        socketId: socket.id,
        userInfo: userInfo,
        role: userInfo.role,
      })

      if (userInfo.role === "agent") {
        agents.add(userInfo.id)
        console.log("[v0] Agent registered:", userInfo.id, userInfo.name, "Socket:", socket.id)
        console.log("[v0] Total agents online:", agents.size, "Agent IDs:", Array.from(agents))
      } else if (userInfo.role === "customer") {
        customers.add(userInfo.id)
        console.log("[v0] Customer registered:", userInfo.id, userInfo.name, "Socket:", socket.id)
      }

      console.log(
        `${userInfo.role} ${userInfo.name} connected. Total agents: ${agents.size}, customers: ${customers.size}`,
      )
    })

    socket.on("typing_start", (data) => {
      const { userId, userName, userRole, targetId } = data

      const existingTyping = typingUsers.get(userId)
      if (existingTyping?.timeout) {
        clearTimeout(existingTyping.timeout)
      }

      const timeout = setTimeout(() => {
        typingUsers.delete(userId)
        socket.emit("typing_stop", { userId })
      }, 3000)

      typingUsers.set(userId, { userName, userRole, targetId, timeout })

      if (userRole === "customer") {
        agents.forEach((agentId) => {
          const agent = connectedUsers.get(agentId)
          if (agent && agent.socketId !== socket.id) {
            io.to(agent.socketId).emit("user_typing", { userId, userName, userRole })
          }
        })
      } else if (userRole === "agent" && targetId) {
        const customer = connectedUsers.get(targetId)
        if (customer) {
          io.to(customer.socketId).emit("user_typing", { userId, userName, userRole })
        }
      }
    })

    socket.on("typing_stop", (data) => {
      const { userId, userName, userRole, targetId } = data

      const typingData = typingUsers.get(userId)
      if (typingData?.timeout) {
        clearTimeout(typingData.timeout)
      }
      typingUsers.delete(userId)

      if (userRole === "customer") {
        agents.forEach((agentId) => {
          const agent = connectedUsers.get(agentId)
          if (agent && agent.socketId !== socket.id) {
            io.to(agent.socketId).emit("user_stopped_typing", { userId })
          }
        })
      } else if (userRole === "agent" && targetId) {
        const customer = connectedUsers.get(targetId)
        if (customer) {
          io.to(customer.socketId).emit("user_stopped_typing", { userId })
        }
      }
    })

    socket.on("customer_message", (data) => {
      console.log("[v0] Customer message received:", {
        customerId: data.customerId,
        customerName: data.customerName,
        hasText: !!data.text,
        hasMedia: !!data.media,
        mediaType: data.media?.type,
        mediaUrl: data.media?.url,
        connectedAgents: agents.size,
        agentIds: Array.from(agents),
      })

      console.log("[v0] Broadcasting to agents:", Array.from(agents))
      let broadcastCount = 0
      agents.forEach((agentId) => {
        const agent = connectedUsers.get(agentId)
        if (agent && agent.socketId !== socket.id) {
          console.log("[v0] Broadcasting to agent:", agentId, agent.userInfo.name, agent.socketId)
          const broadcastData = {
            customerId: data.customerId,
            customerName: data.customerName,
            text: data.text || "",
            media: data.media
              ? {
                  type: data.media.type,
                  url: data.media.url,
                  name: data.media.name,
                  size: data.media.size,
                }
              : undefined,
            timestamp: new Date().toISOString(),
          }
          io.to(agent.socketId).emit("customer_message", broadcastData)
          broadcastCount++
          console.log("[v0] Sent customer_message event to agent socket:", agent.socketId)
        } else {
          console.log("[v0] Skipping agent (not found or same socket):", agentId, agent ? "found" : "not found")
        }
      })
      console.log("[v0] Message broadcasted to", broadcastCount, "agents")
    })

    socket.on("agent_message", (data) => {
      console.log("Agent message received:", data)

      const customer = connectedUsers.get(data.customerId)
      if (customer) {
        io.to(customer.socketId).emit("agent_message", {
          agentId: data.agentId,
          agentName: data.agentName,
          text: data.text,
          media: data.media,
          timestamp: new Date().toISOString(),
        })
      } else {
        console.log("Customer not found or not connected:", data.customerId)
      }
    })

    socket.on("chat message", (msg) => {
      console.log("Legacy message received:", msg)
      socket.broadcast.emit("chat message", msg)
    })

    socket.on("media message", (mediaData) => {
      console.log("Legacy media message received:", mediaData)
      socket.broadcast.emit("media message", mediaData)
    })

    socket.on("disconnect", () => {
      console.log("A client disconnected:", socket.id)

      let disconnectedUser = null
      for (const [userId, userData] of connectedUsers.entries()) {
        if (userData.socketId === socket.id) {
          disconnectedUser = userData
          connectedUsers.delete(userId)

          const typingData = typingUsers.get(userId)
          if (typingData?.timeout) {
            clearTimeout(typingData.timeout)
          }
          typingUsers.delete(userId)

          if (userData.role === "agent") {
            agents.delete(userId)
          } else if (userData.role === "customer") {
            customers.delete(userId)
          }
          break
        }
      }

      if (disconnectedUser) {
        console.log(
          `${disconnectedUser.role} ${disconnectedUser.userInfo.name} disconnected. Total agents: ${agents.size}, customers: ${customers.size}`,
        )
      }
    })
  })

  server.listen(3005, (err) => {
    if (err) throw err
    console.log("> Ready on http://localhost:3001")
  })
})
