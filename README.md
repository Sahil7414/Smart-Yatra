# Smart Travel AI Planner 🌍✨

An AI-powered travel itinerary planner built for hackathons.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Node.js, Express, Gemini AI
- **AI**: Google Gemini Pro (Flash 1.5)

## Setup Instructions

### 1. Prerequisites
- Node.js installed
- Gemini API Key ([Get it here](https://aistudio.google.com/app/apikey))

### 2. Backend Setup
1. Open a terminal in the `backend` folder.
2. Create a `.env` file:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   PORT=5000
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   node server.js
   ```

### 3. Frontend Setup
1. Open another terminal in the `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

### 4. Running the App
- Go to `http://localhost:5173`
- Click "Plan My Trip"
- Enter your details and get your AI itinerary!

## Features
- ✅ **AI Generation**: Custom day-wise plans using Gemini AI.
- ✅ **Budget Optimization**: Filters attractions based on your spending limit.
- ✅ **Clean UI**: Premium design with soft shadows and glassmorphism.
- ✅ **Responsive**: Works on mobile and desktop.
- ✅ **Local Dataset**: Fast and reliable data sourcing.

## PPT Link
- https://docs.google.com/presentation/d/1uYhz-q6SrcVbIq9glzuJZfRl27KyTAWQ/edit?usp=drive_link&ouid=109233741745053716629&rtpof=true&sd=true
