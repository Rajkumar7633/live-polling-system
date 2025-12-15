const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

app.use(cors())
app.use(express.json())

// Simple health check endpoint for uptime checks / Render probes
app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

const sessions = new Map()
const socketToSession = new Map()

io.on("connection", (socket) => {
  console.log("[js] Client connected:", socket.id)

  socket.on("teacher:create-session", (callback) => {
    const sessionId = generateId()

    const pollSession = {
      teacherId: socket.id,
      teacherSocketId: socket.id,
      currentQuestion: null,
      questions: [],
      participants: [],
      chatMessages: [],
    }

    sessions.set(sessionId, pollSession)
    socketToSession.set(socket.id, sessionId)

    socket.join(sessionId)
    console.log("[js] Session created:", sessionId)
    callback({ sessionId })
  })

  socket.on("student:join", ({ name, sessionId }, callback) => {
    const session = sessions.get(sessionId)

    if (!session) {
      callback({ error: "Session not found" })
      return
    }

    const participant = {
      id: generateId(),
      name,
      socketId: socket.id,
      hasAnswered: false,
    }

    session.participants.push(participant)
    socket.join(sessionId)
    socketToSession.set(socket.id, sessionId)

    io.to(session.teacherSocketId).emit("teacher:participant-joined", participant)
    io.to(sessionId).emit("participants:update", session.participants)

    console.log("[js] Student joined:", name, "in session:", sessionId)
    callback({ success: true, participant })
  })

  socket.on("teacher:create-question", ({ sessionId, question }, callback) => {
    const session = sessions.get(sessionId)

    if (!session || session.teacherSocketId !== socket.id) {
      callback({ error: "Unauthorized" })
      return
    }

    if (session.currentQuestion && session.currentQuestion.isActive) {
      callback({ error: "Previous question is still active" })
      return
    }

    if (
      session.currentQuestion &&
      !session.currentQuestion.isActive &&
      session.participants.length > 0 &&
      session.participants.some((p) => !p.hasAnswered)
    ) {
      callback({ error: "Please wait until all students have answered the previous question" })
      return
    }

    const newQuestion = {
      id: generateId(),
      text: question.text,
      options: question.options.map((text) => ({
        id: generateId(),
        text,
        votes: 0,
        voters: [],
      })),
      timer: question.timer,
      isActive: true,
      startTime: Date.now(),
    }

    session.currentQuestion = newQuestion
    session.questions.push(newQuestion)

    session.participants.forEach((p) => {
      p.hasAnswered = false
    })

    io.to(sessionId).emit("question:new", newQuestion)
    io.to(sessionId).emit("participants:update", session.participants)

    console.log("[js] Question created:", newQuestion.text)
    callback({ success: true, question: newQuestion })

    setTimeout(() => {
      if (session.currentQuestion && session.currentQuestion.id === newQuestion.id && session.currentQuestion.isActive) {
        session.currentQuestion.isActive = false

        const results = {
          question: newQuestion.text,
          options: newQuestion.options.map((opt) => ({
            text: opt.text,
            votes: opt.votes,
          })),
          totalVotes: newQuestion.options.reduce((sum, opt) => sum + opt.votes, 0),
        }

        io.to(sessionId).emit("question:ended", {
          questionId: newQuestion.id,
          results,
        })
        console.log("[js] Question ended by timer:", newQuestion.id)
      }
    }, question.timer * 1000)
  })

  socket.on("student:submit-answer", ({ sessionId, questionId, optionId }, callback) => {
    const session = sessions.get(sessionId)

    if (!session || !session.currentQuestion) {
      callback({ error: "No active question" })
      return
    }

    const question = session.currentQuestion

    if (!question.isActive) {
      callback({ error: "This question has already ended" })
      return
    }

    const participant = session.participants.find((p) => p.socketId === socket.id)
    if (!participant) {
      callback({ error: "Participant not found" })
      return
    }

    if (participant.hasAnswered) {
      callback({ error: "Already answered" })
      return
    }

    const option = question.options.find((o) => o.id === optionId)
    if (!option) {
      callback({ error: "Option not found" })
      return
    }

    option.votes += 1
    option.voters.push(participant.id)
    participant.hasAnswered = true

    io.to(sessionId).emit("question:results-update", {
      questionId: question.id,
      options: question.options,
    })
    io.to(sessionId).emit("participants:update", session.participants)

    console.log("[js] Student answered:", participant.name, "selected:", option.text)

    const allAnswered =
      session.participants.length > 0 && session.participants.every((p) => p.hasAnswered)

    if (allAnswered && question.isActive) {
      question.isActive = false

      const results = {
        question: question.text,
        options: question.options.map((opt) => ({
          text: opt.text,
          votes: opt.votes,
        })),
        totalVotes: question.options.reduce((sum, opt) => sum + opt.votes, 0),
      }

      io.to(sessionId).emit("question:ended", {
        questionId: question.id,
        results,
      })
      console.log("[js] Question ended because all participants answered:", question.id)
    }

    callback({ success: true })
  })

  socket.on("teacher:kick-participant", ({ sessionId, participantId }) => {
    const session = sessions.get(sessionId)

    if (!session || session.teacherSocketId !== socket.id) {
      return
    }

    const participant = session.participants.find((p) => p.id === participantId)
    if (!participant) return

    session.participants = session.participants.filter((p) => p.id !== participantId)

    io.to(participant.socketId).emit("student:kicked")
    io.to(sessionId).emit("participants:update", session.participants)

    console.log("[js] Participant kicked:", participant.name)
  })

  socket.on("chat:send-message", ({ sessionId, message }, callback) => {
    const session = sessions.get(sessionId)

    if (!session) {
      callback({ error: "Session not found" })
      return
    }

    const participant = session.participants.find((p) => p.socketId === socket.id)
    const isTeacher = session.teacherSocketId === socket.id

    if (!participant && !isTeacher) {
      callback({ error: "Unauthorized" })
      return
    }

    const chatMessage = {
      id: generateId(),
      userId: isTeacher ? "teacher" : participant.id,
      userName: isTeacher ? "Teacher" : participant.name,
      message,
      timestamp: Date.now(),
    }

    session.chatMessages.push(chatMessage)
    io.to(sessionId).emit("chat:new-message", chatMessage)

    console.log("[js] Chat message from:", chatMessage.userName)

    // callback is optional on the client side; only call it if provided
    if (typeof callback === "function") {
      callback({ success: true })
    }
  })

  socket.on("disconnect", () => {
    const sessionId = socketToSession.get(socket.id)
    if (!sessionId) return

    const session = sessions.get(sessionId)
    if (!session) return

    session.participants = session.participants.filter((p) => p.socketId !== socket.id)
    io.to(sessionId).emit("participants:update", session.participants)

    console.log("[js] Client disconnected:", socket.id)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Express + Socket.io server listening on port ${PORT}`)
})

// Optional keep-alive ping to prevent Render free dyno from sleeping.
// Set KEEP_ALIVE_URL to your deployed backend URL (e.g. https://your-app.onrender.com/health).
if (process.env.KEEP_ALIVE_URL) {
  const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL

  setInterval(() => {
    fetch(KEEP_ALIVE_URL)
      .then(() => {
        // Silent success; we just need the ping
      })
      .catch((err) => {
        console.error("Keep-alive ping failed:", err.message)
      })
  }, 60 * 1000) // every 60 seconds

  console.log("Keep-alive ping enabled for:", KEEP_ALIVE_URL)
}
