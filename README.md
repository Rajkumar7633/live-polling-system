# Live Polling System - Intervue Poll

A real-time polling system built with Next.js, Express.js, and Socket.io featuring teacher and student interfaces.

## Features

### Teacher Features
- Create and manage polling sessions
- Ask questions with multiple choice options
- Set custom time limits (30s, 60s, 90s, 120s)
- View real-time results with percentage bars
- Manage participants (view and kick students)
- View poll history for all questions
- Real-time chat with students
- Share session ID with students

### Student Features
- Join sessions using session ID
- Answer questions in real-time
- View live results after submission
- Countdown timer for each question
- Real-time chat with teacher and peers
- Get kicked notification if removed

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Express.js, Socket.io
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Real-time**: Socket.io for WebSocket communication

## Getting Started

### Installation

1. Install dependencies:
\`\`\`bash
npm install
# or
pnpm install
\`\`\`

2. Create environment file:
\`\`\`bash
cp .env.example .env.local
\`\`\`

3. Update the environment variables in `.env.local`:
\`\`\`env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3001
\`\`\`

### Development

Run both Next.js frontend and Express.js backend concurrently:

\`\`\`bash
npm run dev:all
\`\`\`

Or run them separately:

\`\`\`bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run dev:server
\`\`\`

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Usage

### For Teachers:
1. Navigate to http://localhost:3000
2. Select "I'm a Teacher"
3. Click "Continue"
4. Copy the Session ID displayed at the top
5. Share the Session ID with students
6. Create questions with options
7. Monitor responses in real-time
8. View results after the timer expires

### For Students:
1. Navigate to http://localhost:3000
2. Select "I'm a Student"
3. Click "Continue"
4. Enter the Session ID provided by the teacher
5. Enter your name
6. Wait for the teacher to ask questions
7. Select your answer and submit
8. View results after the question ends

## Color Palette

The application uses a consistent purple color scheme:
- Primary: #5767D0
- Secondary: #7765DA
- Accent: #4F0DCE
- Background: #F2F2F2
- Foreground: #373737
- Muted: #6E6E6E

## Project Structure

\`\`\`
├── app/
│   ├── page.tsx              # Landing page (role selection)
│   ├── teacher/
│   │   └── page.tsx          # Teacher interface
│   └── student/
│       └── page.tsx          # Student interface
├── server/
│   └── index.ts              # Express.js + Socket.io server
├── lib/
│   └── socket-client.ts      # Socket.io client utility
├── components/
│   └── ui/                   # shadcn/ui components
└── public/                   # Static assets
\`\`\`

## Socket Events

### Teacher Events:
- `teacher:create-session` - Create a new session
- `teacher:create-question` - Create and broadcast a question
- `teacher:kick-participant` - Remove a participant
- `chat:send-message` - Send chat message

### Student Events:
- `student:join` - Join a session with name
- `student:submit-answer` - Submit answer to question
- `chat:send-message` - Send chat message

### Broadcast Events:
- `question:new` - New question broadcast
- `question:ended` - Question ended with results
- `question:results-update` - Real-time results update
- `participants:update` - Participant list update
- `chat:new-message` - New chat message
- `student:kicked` - Student kicked notification
- `session:ended` - Session ended by teacher

## License

MIT
