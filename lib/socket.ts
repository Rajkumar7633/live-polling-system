import type { Server as NetServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import type { NextApiResponse } from "next"

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer
    }
  }
}

const students: Set<string> = new Set()
let currentQuestion: any = null
let questionTimer: NodeJS.Timeout | null = null
const answers = new Map<string, number>()

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function SocketHandler(req: any, res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    console.log("Socket is already running")
  } else {
    console.log("Socket is initializing")
    const io = new SocketIOServer(res.socket.server as any)
    res.socket.server.io = io

    io.on("connection", (socket) => {
      console.log("New client connected")

      socket.on("studentJoined", (name: string) => {
        students.add(name)
        io.emit("studentsUpdate", Array.from(students))
      })

      socket.on("startQuestion", (question: any) => {
        currentQuestion = question
        answers.clear()
        io.emit("questionStarted", question)

        let timeLeft = question.timeLimit || 60

        if (questionTimer) clearInterval(questionTimer)

        questionTimer = setInterval(() => {
          timeLeft--
          io.emit("timeUpdate", timeLeft)

          if (timeLeft <= 0) {
            if (questionTimer) clearInterval(questionTimer)
            endQuestion(io)
          }
        }, 1000)
      })

      socket.on("submitAnswer", (data: any) => {
        answers.set(data.studentName, data.answer)

        if (answers.size === students.size) {
          if (questionTimer) clearInterval(questionTimer)
          endQuestion(io)
        }
      })

      socket.on("kickStudent", (studentName: string) => {
        students.delete(studentName)
        io.emit("studentsUpdate", Array.from(students))
        io.emit("kicked", { studentName })
      })

      socket.on("sendMessage", (message: any) => {
        io.emit("chatMessage", message)
      })

      socket.on("disconnect", () => {
        console.log("Client disconnected")
      })
    })
  }
  res.end()
}

function endQuestion(io: SocketIOServer) {
  if (!currentQuestion) return

  const results = {
    question: currentQuestion.question,
    options: currentQuestion.options.map((opt: string, idx: number) => ({
      text: opt,
      votes: Array.from(answers.values()).filter((ans) => ans === idx).length,
    })),
    totalVotes: answers.size,
  }

  io.emit("questionEnded", { results })
  currentQuestion = null
}
