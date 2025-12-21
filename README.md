
# VAYMN — Stream Smarter

VAYMN is a modern, high-performance library management system designed for schools and organizations. It features an AI-powered librarian, automated cover generation, and real-time cloud syncing via Supabase.

## 🚀 Quick Start

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set your API Key:**
   Create a `.env` file in the root and add:
   ```env
   API_KEY=your_gemini_api_key_here
   ```
4. **Run development server:**
   ```bash
   npm run dev
   ```

## 🛠 Tech Stack

- **Frontend:** React 19, Tailwind CSS, Vite
- **AI Engine:** Google Gemini API (Flash 2.5 & 3.0)
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel

## 📦 Deployment to Vercel

1. Push this code to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. In the **Environment Variables** section, add `API_KEY` with your Gemini key.
4. Click **Deploy**.

## 📄 License
MIT
