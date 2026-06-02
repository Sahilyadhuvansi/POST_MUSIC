# 🚀 Music Discover: AI-Enhanced Music Discovery Platform

A professional, monorepo-structured full-stack application featuring AI-powered music recommendations, playlist intelligence, and personalized discovery.

---

## 🏗️ Project Architecture

```mermaid
graph TD
    subgraph frontend [React + Vite]
        UI[User Interface]
        API_LAYER[api.js Layer]
        SERVICES[frontend Services]
    end

   subgraph backend [Node.js API]
      ROUTES[API Routes]
        CONTROLLERS[Feature Controllers]
        BIZ_LOGIC[Business Logic Services]
        MODELS[Mongoose Models]
    end

    UI --> API_LAYER
    API_LAYER --> ROUTES
    ROUTES --> CONTROLLERS
    CONTROLLERS --> BIZ_LOGIC
    BIZ_LOGIC --> MODELS
    MODELS --> DB[(MongoDB Atlas)]
    BIZ_LOGIC --> AI[Groq / Google Cloud AI]
```

## 🛠️ Tech Stack

- **frontend**: React 18, Vite, Tailwind CSS, Lucide React, Axios.
- **backend**: Node.js API, Mongoose, JWT, Helmet, Morgan.
- **AI**: Groq (Llama3), Google Cloud Platform features.
- **Storage**: ImageKit.io for media assets.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB (Local or Atlas)
- Groq API Key

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repo-url>
   cd MUSIC-DISCOVER
   ```

2. **Install Root Dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment**:
   - Copy `backend/.env.example` to `backend/.env`
   - Copy `frontend/.env.example` to `frontend/.env`
   - Fill in your API keys and configuration.

4. **Run in Development**:
   ```bash
   npm run dev
   ```

## 🛤️ API Endpoints

### Auth

- `POST /api/auth/register` - Create a new account
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/me` - Get current session user

### AI

- `POST /api/ai/chat` - Interactive AI companion
- `GET /api/ai/recommendations` - Personalized music discovery

---

## 🧹 Maintenance & Best Practices

- **Separation of Concerns**: Business logic resides in `services/`, not `routes/`.
- **API Strategy**: Centralized Axios instance in `frontend/src/services/api.js`.
- **Constants**: Shared configurations in `backend/src/constants/`.
- **Deployment**: Configured for Vercel (frontend) and scalable backend environments.

---

_Built with ❤️ by [Sahil Yadav]_
