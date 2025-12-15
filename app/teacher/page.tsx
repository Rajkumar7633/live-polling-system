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
  voters: string[]
}

interface Question {
  id: string
  text: string
  options: Option[]
  timer: number
  isActive: boolean
}

interface Participant {
  id: string
  name: string
  socketId: string
  hasAnswered: boolean
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
}

export default function TeacherPage() {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0)
  const [timeLimit, setTimeLimit] = useState(60)
  const [isQuestionActive, setIsQuestionActive] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [liveResults, setLiveResults] = useState<Option[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [pollHistory, setPollHistory] = useState<Question[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [activeChatTab, setActiveChatTab] = useState<"chat" | "participants">("chat")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [sessionId, setSessionId] = useState<string>("")
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    const socket = getSocket()

    // Create a single session for this teacher when the page loads
    socket.emit("teacher:create-session", (response: any) => {
      setSessionId(response.sessionId)
    })

    socket.on("teacher:participant-joined", (participant: Participant) => {
      setParticipants((prev) => [...prev, participant])
    })

    socket.on("participants:update", (participantsList: Participant[]) => {
      setParticipants(participantsList)
    })

    socket.on("question:results-update", (data: { questionId: string; options: Option[] }) => {
      setLiveResults((prev) => {
        // Only update live results for the active question
        if (currentQuestion && currentQuestion.id === data.questionId) {
          return data.options
        }
        return prev
      })

      // Keep poll history in sync so percentages are correct later
      setPollHistory((prev) =>
        prev.map((q) =>
          q.id === data.questionId
            ? {
                ...q,
                options: data.options,
              }
            : q,
        ),
      )
    })

    socket.on("question:ended", (data: any) => {
      setIsQuestionActive(false)
      setShowResults(true)
      setLiveResults(data.results.options)

      // Persist final results into poll history
      setPollHistory((prev) =>
        prev.map((q) =>
          q.id === data.questionId
            ? {
                ...q,
                options: data.results.options,
              }
            : q,
        ),
      )
    })

    socket.on("chat:new-message", (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message])
    })

    return () => {
      socket.off("teacher:participant-joined")
      socket.off("participants:update")
      socket.off("question:results-update")
      socket.off("question:ended")
      socket.off("chat:new-message")
    }
    // We intentionally only run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAskQuestion = () => {
    if (question.trim() && options.every((opt) => opt.trim())) {
      const socket = getSocket()

      socket.emit(
        "teacher:create-question",
        {
          sessionId,
          question: {
            text: question,
            options,
            timer: timeLimit,
            correctAnswerIndex,
          },
        },
        (response: any) => {
          if (response?.error) {
            // Show a simple alert so the teacher knows why the question was not created
            alert(response.error)
            return
          }

          if (response?.success) {
            setCurrentQuestion(response.question)
            setIsQuestionActive(true)
            setShowResults(false)
            setLiveResults(response.question.options)
            setPollHistory((prev) => [...prev, response.question])

            // Clear form
            setQuestion("")
            setOptions(["", ""])
            setCorrectAnswerIndex(0)
          }
        },
      )
    }
  }

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""])
    }
  }

  const updateOption = (idx: number, value: string) => {
    const newOptions = [...options]
    newOptions[idx] = value
    setOptions(newOptions)
  }

  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx))
      if (correctAnswerIndex === idx) {
        setCorrectAnswerIndex(0)
      }
    }
  }

  const kickStudent = (participantId: string) => {
    const socket = getSocket()
    socket.emit("teacher:kick-participant", {
      sessionId,
      participantId,
    })
  }

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      const socket = getSocket()
      socket.emit("chat:send-message", { sessionId, message: chatInput })
      setChatInput("")
    }
  }

  const handleAskNewQuestion = () => {
    setShowResults(false)
    setIsQuestionActive(false)
    setCurrentQuestion(null)
    setLiveResults([])
  }

  const totalVotes = liveResults.reduce((sum, opt) => sum + opt.votes, 0)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="inline-flex items-center gap-2 bg-[#5767D0] text-white px-4 py-2 rounded-full text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
            </svg>
            Intervue Poll
          </div>

          {sessionId && (
            <div className="bg-white px-4 py-2 rounded-lg border-2 border-[#5767D0]">
              <span className="text-sm text-muted-foreground mr-2">Session ID:</span>
              <span className="font-bold text-[#5767D0]">{sessionId}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              className="bg-[#5767D0] hover:bg-[#4F0DCE] text-white rounded-full px-4 py-2 text-sm"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
              View Poll history
            </Button>
            <Button
              onClick={() => setShowParticipants(!showParticipants)}
              className="bg-white hover:bg-gray-100 text-foreground border-2 border-border rounded-full px-4 py-2 text-sm"
            >
              Participants
            </Button>
          </div>
        </div>

        {/* Create Question Form - full-width like Figma (no outer card) */}
        {!isQuestionActive && !showResults && (
          <div className="bg-transparent pt-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              Lets <span className="font-black">Get Started</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
              youll have the ability to create and manage polls, ask questions, and monitor your students
              responses in real-time.
            </p>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold">Enter your question</label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="border rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5767D0] min-w-[140px]"
                >
                  <option value={15}>15 seconds </option>
                  <option value={30}>30 seconds </option>
                  <option value={60}>60 seconds </option>
                  <option value={90}>90 seconds </option>
                  <option value={120}>120 seconds </option>
                </select>
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, 100))}
                placeholder="Rahul Bajaj"
                className="w-full min-h-[140px] resize-none rounded-md bg-[#E6E6E6] border border-[#D5D5D5] px-4 py-3 text-sm text-[#6E6E6E] focus:outline-none focus:ring-2 focus:ring-[#5767D0]"
              />
              <div className="text-right text-xs text-muted-foreground mt-1">{question.length}/100</div>
            </div>

            <div className="mb-10">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold">Edit Options</label>
                <label className="text-sm font-semibold mr-6">Is It Correct?</label>
              </div>

              {options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-4 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#7765DA] text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {idx + 1}
                  </div>
                  <Input
                    value={option}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder="Rahul Bajaj"
                    className="flex-1 rounded-md bg-[#E6E6E6] border border-[#D5D5D5] text-[#6E6E6E]"
                  />
                  <div className="flex gap-6 items-center pr-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="correct"
                        checked={correctAnswerIndex === idx}
                        onChange={() => setCorrectAnswerIndex(idx)}
                        className="w-4 h-4 accent-[#7765DA] cursor-pointer"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        checked={correctAnswerIndex !== idx}
                        onChange={() => {}}
                        className="w-4 h-4 accent-red-500 cursor-pointer"
                      />
                      <span className="text-red-500">No</span>
                    </label>
                  </div>
                </div>
              ))}

              {options.length < 6 && (
                <Button
                  onClick={addOption}
                  variant="outline"
                  className="mt-2 text-[#5767D0] border-[#5767D0] bg-transparent hover:bg-[#5767D0] hover:text-white transition-colors"
                >
                  + Add More option
                </Button>
              )}
            </div>

            <div className="w-full">
              <Button
                onClick={handleAskQuestion}
                disabled={!question.trim() || !options.every((opt) => opt.trim())}
                className="w-full bg-[#7765DA] hover:bg-[#4F0DCE] text-white rounded-full py-5 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ask Question
              </Button>
            </div>
          </div>
        )}

        {/* Waiting for Students */}
        {isQuestionActive && !showResults && (
          <Card className="p-12 text-center bg-white">
            <div className="inline-flex items-center gap-2 bg-[#5767D0] text-white px-4 py-2 rounded-full text-sm mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
              </svg>
              Intervue Poll
            </div>
            <div className="w-16 h-16 border-4 border-[#5767D0] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Wait for the students to answer..</h2>
            <p className="text-muted-foreground">
              Results will appear once all students have responded or time runs out
            </p>

            {totalVotes > 0 && (
              <div className="mt-6 text-sm text-muted-foreground">
                {participants.filter((p) => p.hasAnswered).length} / {participants.length} students answered
              </div>
            )}
          </Card>
        )}

        {/* Results View */}
        {showResults && currentQuestion && (
          <Card className="p-8 bg-white shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Question</h2>
            <div className="bg-[#373737] text-white p-4 rounded-lg mb-6 font-medium">{currentQuestion.text}</div>

            <div className="space-y-3 mb-8">
              {liveResults.map((option, idx) => {
                const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
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

            <Button
              onClick={handleAskNewQuestion}
              className="w-full bg-[#5767D0] hover:bg-[#4F0DCE] text-white rounded-full py-6 text-lg font-semibold"
            >
              + Ask a new question
            </Button>
          </Card>
        )}

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
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No participants yet</p>
              ) : (
                participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-foreground">{participant.name}</span>
                    <button
                      onClick={() => kickStudent(participant.id)}
                      className="text-[#5767D0] text-sm hover:underline font-medium"
                    >
                      Kick out
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Poll History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-white p-8">
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <h2 className="text-2xl font-bold">View Poll History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-3xl text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>

              {pollHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No poll history yet</p>
              ) : (
                pollHistory.map((poll, pollIdx) => {
                  const pollTotalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0)
                  return (
                    <div key={poll.id} className="mb-8 last:mb-0">
                      <h3 className="text-lg font-bold mb-3">Question {pollIdx + 1}</h3>
                      <div className="bg-[#373737] text-white p-4 rounded-lg mb-4 font-medium">{poll.text}</div>
                      <div className="space-y-3">
                        {poll.options.map((option, idx) => {
                          const percentage = pollTotalVotes > 0 ? Math.round((option.votes / pollTotalVotes) * 100) : 0
                          return (
                            <div key={`${poll.id}-opt-${idx}`} className="relative">
                              <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-4 relative overflow-hidden">
                                <div
                                  className="absolute left-0 top-0 h-full bg-[#7765DA] rounded-lg"
                                  style={{ width: `${percentage}%` }}
                                />
                                <div className="relative z-10 flex items-center gap-3 w-full">
                                  <div className="w-6 h-6 rounded-full bg-white border-2 border-[#5767D0] flex items-center justify-center text-xs font-bold">
                                    {String.fromCharCode(65 + idx)}
                                  </div>
                                  <span className="flex-1 font-medium">{option.text}</span>
                                  <span className="font-bold">{percentage}%</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </Card>
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
              <button
                onClick={() => setActiveChatTab("chat")}
                className={`pb-2 font-semibold ${
                  activeChatTab === "chat" ? "border-b-2 border-white" : "text-white/70"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveChatTab("participants")}
                className={`pb-2 font-semibold ${
                  activeChatTab === "participants" ? "border-b-2 border-white" : "text-white/70"
                }`}
              >
                Participants
              </button>
            </div>
            <button onClick={() => setShowChat(false)} className="text-white text-xl hover:text-white/80">
              ✕
            </button>
          </div>
          <div className="h-72 overflow-y-auto p-4 bg-white">
            {activeChatTab === "chat" ? (
              <div className="space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.userName === "Teacher"
                          ? "bg-[#7765DA] text-white ml-12"
                          : "bg-gray-100 text-foreground mr-12"
                      } max-w-[85%]`}
                    >
                      <div className="text-xs font-semibold mb-1 opacity-80">
                        {msg.userName === "Teacher" ? "User 2" : msg.userName}
                      </div>
                      <div className="text-sm">{msg.message}</div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-2">Name</div>
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No participants yet</p>
                ) : (
                  participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex justify-between items-center p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium text-foreground truncate mr-2">{participant.name}</span>
                      <button
                        onClick={() => kickStudent(participant.id)}
                        className="text-[#5767D0] hover:underline"
                      >
                        Kick out
                      </button>
                    </div>
                  ))
                )}
              </div>
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
