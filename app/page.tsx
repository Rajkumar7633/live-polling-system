"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Home() {
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | null>(null)

  const handleContinue = () => {
    if (selectedRole === "teacher") {
      window.location.href = "/teacher"
    } else if (selectedRole === "student") {
      window.location.href = "/student"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-[#5767D0] text-white px-4 py-2 rounded-full text-sm mb-6">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
            </svg>
            Intervue Poll
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Welcome to the <span className="font-black">Live Polling System</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Please select the role that best describes you to begin using the live polling system
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card
            className={`p-6 cursor-pointer transition-all border-2 ${
              selectedRole === "student"
                ? "border-[#5767D0] bg-white shadow-lg"
                : "border-border hover:border-[#7765DA] bg-white"
            }`}
            onClick={() => setSelectedRole("student")}
          >
            <h3 className="text-xl font-bold text-foreground mb-2">I'm a Student</h3>
            <p className="text-sm text-muted-foreground">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry
            </p>
          </Card>

          <Card
            className={`p-6 cursor-pointer transition-all border-2 ${
              selectedRole === "teacher"
                ? "border-[#5767D0] bg-white shadow-lg"
                : "border-border hover:border-[#7765DA] bg-white"
            }`}
            onClick={() => setSelectedRole("teacher")}
          >
            <h3 className="text-xl font-bold text-foreground mb-2">I'm a Teacher</h3>
            <p className="text-sm text-muted-foreground">Submit answers and view live poll results in real-time.</p>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedRole}
            className="bg-[#5767D0] hover:bg-[#4F0DCE] text-white px-12 py-6 text-lg rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
