"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { getSocket } from "@/lib/socket-client"

interface Option {
  id: string
  text: string
  votes: number
}

interface Question {
  id: string
  text: string
  options: Option[]
  timer: number
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
}

interface Participant {
  id: string
  name: string
}

export default function StudentPage() {
  const [studentName, setStudentName] = useState("")
  const [isNameSet, setIsNameSet] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isKicked, setIsKicked] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [chatInput, setChatInput] = useState("")
  const [sessionId, setSessionId] = useState("")

  useEffect(() => {
    if (currentQuestion && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [currentQuestion, timeLeft])

  useEffect(() => {
    if (!isNameSet) return

    const socket = getSocket()

    socket.on("question:new", (question: Question) => {
      setCurrentQuestion(question)
      setHasAnswered(false)
      setSelectedAnswer(null)
      setTimeLeft(question.timer)
      setResults(null)
    })

    socket.on("question:ended", (data: any) => {
      const resultData = {
        question: currentQuestion?.text || "",
        options: data.results.options,
        totalVotes: data.results.options.reduce((sum: number, opt: any) => sum + opt.votes, 0),
      }
      setResults(resultData)
      setCurrentQuestion(null)
      setTimeLeft(0)
    })

    socket.on("student:kicked", () => {
      setIsKicked(true)
    })

    socket.on("session:ended", () => {
      setIsKicked(true)
    })

    socket.on("chat:new-message", (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message])
    })

    socket.on("participants:update", (participantsList: Participant[]) => {
      setParticipants(participantsList)
    })

    return () => {
      socket.off("question:new")
      socket.off("question:ended")
      socket.off("student:kicked")
      socket.off("session:ended")
      socket.off("chat:new-message")
      socket.off("participants:update")
    }
  }, [isNameSet, currentQuestion])

  const handleNameSubmit = () => {
    if (studentName.trim() && sessionId.trim()) {
      const socket = getSocket()

      socket.emit(
        "student:join",
        {
          name: studentName,
          sessionId,
        },
        (response: any) => {
          if (response.error) {
            alert(response.error)
          } else {
            setIsNameSet(true)
          }
        },
      )
    }
  }

  const handleAnswerSubmit = () => {
    if (selectedAnswer !== null && currentQuestion) {
      const socket = getSocket()

      socket.emit(
        "student:submit-answer",
        {
          sessionId,
          questionId: currentQuestion.id,
          optionId: currentQuestion.options[selectedAnswer].id,
        },
        (response: any) => {
          if (response.success) {
            setHasAnswered(true)
          } else {
            alert(response.error || "Failed to submit answer")
          }
        },
      )
    }
  }

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      const socket = getSocket()
      socket.emit("chat:send-message", { sessionId, message: chatInput })
      setChatInput("")
    }
  }

  if (isKicked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="inline-flex items-center gap-2 bg-[#5767D0] text-white px-6 py-2 rounded-full text-sm mb-6">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
          </svg>
          Intervue Poll
        </div>
        <h2 className="text-4xl font-bold mb-3 text-foreground text-center">You've been Kicked out !</h2>
        <p className="text-muted-foreground text-base text-center max-w-xl">
          Looks like the teacher had removed you from the poll system .Please Try again sometime.
        </p>
      </div>
    )
  }

  if (!isNameSet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md w-full bg-white shadow-sm">
          <div className="inline-flex items-center gap-2 bg-[#5767D0] text-white px-4 py-2 rounded-full text-sm mb-6">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
            </svg>
            Intervue Poll
          </div>
          <h2 className="text-2xl font-bold mb-2">Let's Get Started</h2>
          <p className="text-sm text-muted-foreground mb-8">
            If you're a student, you'll be able to{" "}
            <span className="font-semibold text-foreground">submit your answers</span>, participate in live polls, and
            see how your responses compare with your classmates
          </p>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Session ID</label>
            <Input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter session ID from teacher"
              className="w-full"
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold mb-2">Enter your Name</label>
            <Input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Rahul Bajaj"
              className="w-full"
              onKeyPress={(e) => e.key === "Enter" && handleNameSubmit()}
            />
          </div>

          <Button
            onClick={handleNameSubmit}
            disabled={!studentName.trim() || !sessionId.trim()}
            className="w-full bg-[#5767D0] hover:bg-[#4F0DCE] text-white rounded-full py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </Button>
        </Card>
      </div>
    )
  }

  if (results) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Question 1</h2>
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                00:15
              </div>
            </div>

            <div className="bg-[#373737] text-white p-4 rounded-lg mb-6 font-medium">{results.question}</div>

            <div className="space-y-3 mb-6">
              {results.options.map((option: any, idx: number) => {
                const percentage = results.totalVotes > 0 ? Math.round((option.votes / results.totalVotes) * 100) : 0
                return (
                  <div key={idx} className="relative">
                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-4 relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-[#7765DA] rounded-lg transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative z-10 flex items-center gap-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-white border-2 border-[#5767D0] flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="flex-1 font-medium text-foreground">{option.text}</span>
                        <span className="font-bold text-foreground">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-lg text-foreground font-semibold py-4">
              Wait for the teacher to ask a new question..
            </p>
          </Card>

          {/* Participants Panel */}
          {showParticipants && (
            <div className="fixed top-0 right-0 w-80 h-screen bg-white shadow-2xl border-l-2 border-[#5767D0] p-6 overflow-y-auto z-50">
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#5767D0]">
                <h3 className="text-xl font-bold">Participants</h3>
                <button
                  onClick={() => setShowParticipants(false)}
                  className="text-3xl text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-3">Name</div>
                {participants.map((participant) => (
                  <div key={participant.id} className="p-3 bg-gray-50 rounded">
                    <span className="font-medium text-foreground">{participant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Button */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-[#5767D0] hover:bg-[#4F0DCE] text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all z-40"
        >
          💬
        </button>

        {/* Chat Panel */}
        {showChat && (
          <div className="fixed bottom-24 right-6 w-80 bg-white rounded-lg shadow-2xl border-2 border-[#5767D0] z-40">
            <div className="bg-[#5767D0] text-white p-4 rounded-t-lg flex justify-between items-center">
              <div className="flex gap-3 border-b border-white/20">
                <button className="pb-2 border-b-2 border-white font-semibold">Chat</button>
                <button
                  onClick={() => {
                    setShowChat(false)
                    setShowParticipants(true)
                  }}
                  className="pb-2 text-white/70"
                >
                  Participants
                </button>
              </div>
              <button onClick={() => setShowChat(false)} className="text-white text-xl hover:text-white/80">
                ✕
              </button>
            </div>
            <div className="h-72 overflow-y-auto p-4 space-y-3 bg-white">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${msg.userName === studentName ? "bg-[#7765DA] text-white ml-12" : "bg-gray-100 text-foreground mr-12"} max-w-[85%]`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-80">
                      {msg.userName === studentName ? "User 2" : msg.userName}
                    </div>
                    <div className="text-sm">{msg.message}</div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t flex gap-2 bg-white rounded-b-lg">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                className="flex-1"
              />
              <Button onClick={sendChatMessage} className="bg-[#5767D0] hover:bg-[#4F0DCE] px-4">
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-12 text-center max-w-md bg-white">
          <div className="inline-flex items-center gap-2 bg-[#5767D0] text-white px-4 py-2 rounded-full text-sm mb-8">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
            </svg>
            Intervue Poll
          </div>
          <div className="w-16 h-16 border-4 border-[#5767D0] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold">Wait for the teacher to ask questions..</h2>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Question 1</h2>
            <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              00:{timeLeft.toString().padStart(2, "0")}
            </div>
          </div>

          <div className="bg-[#373737] text-white p-4 rounded-lg mb-6 font-medium">{currentQuestion.text}</div>

          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((option, idx) => (
              <div
                key={option.id}
                onClick={() => !hasAnswered && setSelectedAnswer(idx)}
                className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                  selectedAnswer === idx ? "bg-[#7765DA] text-white" : "bg-gray-100 hover:bg-gray-200"
                } ${hasAnswered ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    selectedAnswer === idx
                      ? "bg-white text-[#5767D0] border-white"
                      : "bg-white border-[#5767D0] text-[#5767D0]"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="font-medium">{option.text}</span>
              </div>
            ))}
          </div>

          {!hasAnswered ? (
            <Button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswer === null}
              className="w-full bg-[#5767D0] hover:bg-[#4F0DCE] text-white rounded-full py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </Button>
          ) : (
            <div className="text-center text-muted-foreground font-medium py-4">
              Answer submitted! Waiting for other students...
            </div>
          )}
        </Card>

        {/* Participants Panel */}
        {showParticipants && (
          <div className="fixed top-0 right-0 w-80 h-screen bg-white shadow-2xl border-l-2 border-[#5767D0] p-6 overflow-y-auto z-50">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#5767D0]">
              <h3 className="text-xl font-bold">Participants</h3>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-3xl text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-3">Name</div>
              {participants.map((participant) => (
                <div key={participant.id} className="p-3 bg-gray-50 rounded">
                  <span className="font-medium text-foreground">{participant.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#5767D0] hover:bg-[#4F0DCE] text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all z-40"
      >
        💬
      </button>

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-80 bg-white rounded-lg shadow-2xl border-2 border-[#5767D0] z-40">
          <div className="bg-[#5767D0] text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex gap-3 border-b border-white/20">
              <button className="pb-2 border-b-2 border-white font-semibold">Chat</button>
              <button
                onClick={() => {
                  setShowChat(false)
                  setShowParticipants(true)
                }}
                className="pb-2 text-white/70"
              >
                Participants
              </button>
            </div>
            <button onClick={() => setShowChat(false)} className="text-white text-xl hover:text-white/80">
              ✕
            </button>
          </div>
          <div className="h-72 overflow-y-auto p-4 space-y-3 bg-white">
            {chatMessages.length === 0 ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gray-100 text-foreground mr-12 max-w-[85%]">
                  <div className="text-xs font-semibold mb-1 opacity-80">User 1</div>
                  <div className="text-sm">Hey There, how can I help?</div>
                </div>
                <div className="p-3 rounded-lg bg-[#7765DA] text-white ml-12 max-w-[85%]">
                  <div className="text-xs font-semibold mb-1 opacity-80">User 2</div>
                  <div className="text-sm">Nothing bro, just chills</div>
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${msg.userName === studentName ? "bg-[#7765DA] text-white ml-12" : "bg-gray-100 text-foreground mr-12"} max-w-[85%]`}
                >
                  <div className="text-xs font-semibold mb-1 opacity-80">
                    {msg.userName === studentName ? "User 2" : "User 1"}
                  </div>
                  <div className="text-sm">{msg.message}</div>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t flex gap-2 bg-white rounded-b-lg">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
              className="flex-1"
            />
            <Button onClick={sendChatMessage} className="bg-[#5767D0] hover:bg-[#4F0DCE] px-4">
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
