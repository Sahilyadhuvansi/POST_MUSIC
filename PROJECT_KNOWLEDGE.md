# MusicDiscover — Complete Project Knowledge Base

Everything used in this project, what it is, and where/how it works.
Use this as your personal reference when anyone asks about any concept, library, or design pattern used here.

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack Summary](#2-tech-stack-summary)
3. [Frontend Dependencies](#3-frontend-dependencies)
4. [Backend Dependencies](#4-backend-dependencies)
5. [Design System — Apple Liquid Glass / Glassmorphism](#5-design-system--apple-liquid-glass--glassmorphism)
6. [CSS Concepts Used](#6-css-concepts-used)
7. [UI Patterns & Components](#7-ui-patterns--components)
8. [Architecture — Frontend](#8-architecture--frontend)
9. [Architecture — Backend](#9-architecture--backend)
10. [Authentication Flow](#10-authentication-flow)
11. [Music Playback System](#11-music-playback-system)
12. [AI Features](#12-ai-features)
13. [Key Concepts Explained Simply](#13-key-concepts-explained-simply)

---

## 1. PROJECT OVERVIEW

**MusicDiscover** is a full-stack music discovery web app.

- Users can search for music, play songs via YouTube, save favorites, manage a personal music universe (profile playlist), and chat with an AI music assistant.
- Built as a **monorepo** with two folders: `frontend/` and `backend/`.
- Frontend is served separately; backend is an API server.

---

## 2. TECH STACK SUMMARY

| Layer | Technology |
|---|---|
| Frontend UI | React 19 + Vite 7 |
| Styling | Tailwind CSS 4 + custom CSS |
| Routing | React Router DOM v7 |
| HTTP client | Axios |
| Icons | Lucide React |
| Video player | react-youtube (YouTube IFrame API) |
| Backend server | Node.js + Express 4 |
| Database | MongoDB Atlas (via Mongoose) |
| Auth | JWT (JSON Web Tokens) + bcryptjs |
| AI chat | Groq SDK (LLM inference) |
| Image uploads | ImageKit + Google Cloud Vision |
| Search cache | Redis |
| Music search | yt-search (YouTube search wrapper) |
| Logging | Winston + Morgan |
| Validation | Zod + Envalid |
| Testing | Mocha + Chai + Sinon + Supertest |

---

## 3. FRONTEND DEPENDENCIES

### React 19
**What it is:** The JavaScript UI library. Version 19 is the latest.
**What it does:** Lets you build the UI as reusable components. Every page, card, button is a React component.
**Where used:** Every `.jsx` file in `frontend/src/`.

### Vite 7
**What it is:** The build tool and dev server.
**What it does:** Compiles your React code super fast during development. Runs `npm run dev` which starts the local server at `http://localhost:5173`. Also builds the production bundle with `npm run build`.
**Key feature:** Hot Module Replacement (HMR) — changes you save appear in the browser instantly without full reload.

### Tailwind CSS 4
**What it is:** A utility-first CSS framework.
**What it does:** Instead of writing CSS files, you apply pre-built class names directly in your HTML/JSX. Example: `className="rounded-2xl bg-white/5 text-white"`.
**Version 4 difference:** Uses `@import "tailwindcss"` instead of the old `@tailwind base/components/utilities`. New `@utility` syntax for custom utilities.
**Where used:** Every component file uses Tailwind classes.

### React Router DOM v7
**What it is:** Client-side routing library for React.
**What it does:** Makes the app feel like it has multiple pages without full page reloads. The URL changes and different components render.
**Routes in this app:**
- `/` and `/music` → Music discovery page
- `/login` → Login page
- `/register` → Register page
- `/profile` → Profile page (protected — needs login)
- `*` → 404 Not Found page

### Axios
**What it is:** An HTTP client library.
**What it does:** Makes API calls from the frontend to the backend. Easier than the browser's built-in `fetch` because it automatically parses JSON, handles errors better, and supports interceptors.
**Where used:** `frontend/src/services/api.js` — creates a shared axios instance with the base URL and JWT token attached to every request automatically.

### Lucide React
**What it is:** An icon library with 1000+ SVG icons as React components.
**What it does:** Provides clean, consistent icons. Instead of pasting SVG code, you write `<Play className="w-5 h-5" />`.
**Where used:** Throughout Header, Player, MusicCard, Profile, etc.
**Examples used:** `Play`, `Pause`, `Heart`, `Music`, `User`, `LogOut`, `Search`, `Shuffle`, `Repeat`, `Timer`, `Trash2`, `Sparkles`, `X`, `Menu`, `ArrowRight`.

### react-youtube
**What it is:** A React wrapper around YouTube's IFrame Player API.
**What it does:** Embeds a YouTube video player in the page. You give it a video ID and it handles play/pause/seek/volume through YouTube's official API.
**Why not react-player:** react-player caused build errors with the current Vite + React 19 setup. react-youtube is a direct, lighter wrapper.
**Where used:** `frontend/src/features/music/Player.jsx` — the YouTube player is hidden visually (audio-only mode) while showing custom controls.

### @tailwindcss/vite
**What it is:** The official Tailwind CSS plugin for Vite.
**What it does:** Integrates Tailwind into the Vite build pipeline so Tailwind's classes work with HMR and production builds.

### eslint-plugin-react-hooks v7
**What it is:** ESLint rules for React Hooks.
**What it does:** Catches common mistakes with `useEffect`, `useState`, etc. Version 7 added stricter rules including `react-hooks/set-state-in-effect` (warns when you call setState directly inside useEffect body without conditions).
**Where it affected this project:** Player.jsx `setSleepMode(null)` inside useEffect needed `// eslint-disable-next-line` comment.

---

## 4. BACKEND DEPENDENCIES

### Express 4
**What it is:** The most popular Node.js web framework.
**What it does:** Handles HTTP requests. You define routes like `app.get('/api/music', ...)` and it calls your handler when that URL is requested.
**Where used:** `backend/src/index.js` — the main server entry point.

### Mongoose
**What it is:** An ODM (Object-Document Mapper) for MongoDB.
**What it does:** Lets you define schemas for your data and interact with MongoDB using JavaScript objects instead of raw queries. Example: `await User.findById(id)`.
**Database:** MongoDB Atlas (cloud-hosted MongoDB).
**Models in this app:** User, Music track, Favorites, etc.

### JWT (jsonwebtoken)
**What it is:** JSON Web Token library.
**What it does:** Creates and verifies authentication tokens. When a user logs in, the server signs a JWT with the user's ID. The frontend stores this token and sends it with every request. The server verifies it to know who is making the request.
**Where used:** Auth routes (login/register) and middleware that protects private routes.

### bcryptjs
**What it is:** Password hashing library.
**What it does:** Hashes passwords before saving them to the database so plain-text passwords are never stored. When logging in, it compares the entered password against the stored hash.
**Why bcryptjs not bcrypt:** bcryptjs is pure JavaScript (no native addons), so it works everywhere without compilation issues.

### Groq SDK
**What it is:** The official JavaScript SDK for Groq's API.
**What it does:** Sends messages to Groq's LLM (Large Language Model) inference service and gets AI responses back. Groq is extremely fast at inference.
**Where used:** `backend/src/routes/ai.js` — the `/api/ai/chat` endpoint that powers the floating AI assistant chat.
**Model used:** Groq runs open-source models like `llama3` or `mixtral` at high speed.

### ImageKit + @imagekit/nodejs
**What it is:** A cloud image hosting and CDN service + its Node.js SDK.
**What it does:** Handles profile picture uploads. Images are uploaded to ImageKit's servers which serve them globally via CDN with automatic optimization (resize, compression, format conversion).
**Where used:** Profile picture upload endpoint.

### @google-cloud/vision
**What it is:** Google Cloud Vision AI SDK.
**What it does:** Analyzes images using Google's AI. Can detect faces, objects, labels, explicit content, text in images, etc.
**Where used:** Validates uploaded profile pictures (checks for inappropriate content before accepting the upload).

### Redis
**What it is:** An in-memory data store / cache.
**What it does:** Stores data temporarily in RAM for ultra-fast retrieval. Used here as a search results cache — when someone searches for "Bollywood", the results are stored in Redis so the next person searching the same thing gets instant results without hitting YouTube API again.
**Pattern used:** Stale-while-revalidate — serve cached result immediately, refresh cache in background.

### yt-search
**What it is:** A Node.js package that scrapes/searches YouTube.
**What it does:** Searches YouTube for music videos/songs by query and returns results (title, video ID, thumbnail, duration). No official YouTube API key required.
**Where used:** Music search endpoint in the backend.

### Zod
**What it is:** A TypeScript-first schema validation library (works in plain JS too).
**What it does:** Validates that incoming request data is the right shape before processing it. Example: ensures the request body has a valid email and password before trying to register.
**Why better than manual checks:** Gives clear error messages automatically.

### Envalid
**What it is:** Environment variable validation library.
**What it does:** Validates that all required environment variables (`.env` file) are present and the right type at server startup. If `MONGODB_URI` is missing, the server refuses to start with a clear error instead of crashing mysteriously later.

### Helmet
**What it is:** Express security middleware.
**What it does:** Sets HTTP security headers automatically (Content-Security-Policy, X-Frame-Options, etc.) to protect against common web attacks like XSS and clickjacking.

### express-rate-limit
**What it is:** Rate limiting middleware for Express.
**What it does:** Limits how many requests a single IP can make in a time window. Prevents abuse, bot attacks, and API hammering. Example: max 100 requests per 15 minutes.

### cors
**What it is:** Cross-Origin Resource Sharing middleware.
**What it does:** Controls which frontend URLs are allowed to make requests to the backend API. Since frontend runs on `localhost:5173` and backend on `localhost:5000`, CORS headers are needed to allow the connection.

### compression
**What it is:** Response compression middleware.
**What it does:** Gzip-compresses HTTP responses before sending them to the client. Makes responses smaller and faster to transfer.

### Morgan
**What it is:** HTTP request logger middleware.
**What it does:** Logs every incoming request to the console/file: method, URL, status code, response time.

### Winston
**What it is:** A structured logging library.
**What it does:** More powerful than `console.log`. Supports log levels (info, warn, error), multiple output destinations (console + file), log rotation, and structured JSON format.

### bad-words
**What it is:** Profanity filter library.
**What it does:** Detects and optionally filters profane/offensive words in text. Used to validate user-submitted content like usernames and bios.

### sentiment
**What it is:** Sentiment analysis library.
**What it does:** Analyzes text and returns a sentiment score (positive, negative, neutral). Can be used to analyze song descriptions or user messages.

### multer
**What it is:** Multipart form data middleware.
**What it does:** Handles file uploads in Express. When a user uploads a profile picture, multer processes the multipart/form-data request and makes the file available as `req.file`.

### uuid
**What it is:** UUID generator.
**What it does:** Generates universally unique IDs (e.g., `550e8400-e29b-41d4-a716-446655440000`). Used for things like session tokens, upload filenames, etc.

### cookie-parser
**What it is:** Cookie parsing middleware.
**What it does:** Parses Cookie headers from incoming requests and makes them available as `req.cookies`. Used for session management.

### dotenv
**What it is:** Environment variable loader.
**What it does:** Reads your `.env` file and loads the variables into `process.env`. Keeps secrets (API keys, database URLs) out of your code.

---

## 5. DESIGN SYSTEM — APPLE LIQUID GLASS / GLASSMORPHISM

This is the entire visual design language of the app. Understanding this lets you explain ANY visual element.

### What is Glassmorphism?

**Glassmorphism** is a UI design trend that makes elements look like frosted glass — semi-transparent, blurred backgrounds that let the content behind show through in a hazy way.

**Visual characteristics:**
- You can vaguely see what's behind the element (like looking through frosted shower glass)
- The element itself looks like floating glass in front of the background
- Has soft edges and a subtle glow
- Feels modern, clean, and depth-layered

**The core CSS property that makes it work:**
```css
backdrop-filter: blur(20px);
```
This blurs everything **behind** the element. The element itself is semi-transparent so the blurred background shows through.

### What is Apple Liquid Glass?

**Apple Liquid Glass** is Apple's refined version of glassmorphism introduced in iOS 18 / visionOS. It goes further than basic glassmorphism:

1. **More blur + saturation:** `blur(28px) saturate(160%)` — the background shows through blurrier AND more colorful
2. **Inset top highlight:** A thin bright line at the very top edge of the element simulates light hitting the top of a real glass object
3. **Layered depth:** Multiple shadow layers give a sense of the element floating above the background
4. **Liquid feel:** Smooth, organic shapes (high border-radius). Elements feel like liquid poured into rounded molds
5. **Subtle iridescence:** On hover, a rainbow shimmer effect like real glass catching light

### The 4 Glass Tiers Used in This App

Defined in `frontend/src/index.css`:

**Tier 1 — `.glass` (Standard panel)**
```css
background: rgba(12, 12, 18, 0.55);       /* 55% opaque dark */
backdrop-filter: blur(28px) saturate(160%);
border: 1px solid rgba(255, 255, 255, 0.09); /* thin white border */
box-shadow: 0 8px 32px rgba(0,0,0,0.45),    /* depth shadow */
            inset 0 1px 0 rgba(255,255,255,0.1); /* top highlight */
```
**Used for:** Header nav pill, search bar, genre pills, toast notifications.

**Tier 2 — `.glass-dark` (Heavy panel)**
```css
background: rgba(6, 6, 10, 0.75);         /* 75% opaque — heavier */
backdrop-filter: blur(40px) saturate(180%); /* stronger blur */
```
**Used for:** Mobile menu, modals, deeper background panels.

**Tier 3 — `.liquid-glass` (iOS widget card)**
```css
background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(0,0,0,0.1));
backdrop-filter: blur(32px) saturate(180%) brightness(1.05);
border: 1px solid rgba(255, 255, 255, 0.12);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.18),  /* top sheen */
            inset 0 -1px 0 rgba(0,0,0,0.15);        /* bottom shadow */
```
**After pseudo-element** adds the liquid top-half highlight.
**Used for:** Prominent cards that need the most "wow" effect.

**Tier 4 — `.glass-pill` (Button pill)**
```css
background: rgba(255, 255, 255, 0.08);
backdrop-filter: blur(20px) saturate(150%);
border: 1px solid rgba(255, 255, 255, 0.12);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
```
**Used for:** Small pill-shaped buttons, tags, badges.

### The Inset Top Highlight — The Most Important Detail

```css
box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
```

This single line creates the "glass edge" illusion. A real pane of glass has a bright line at its top where light hits the edge. This CSS rule mimics exactly that. Without it, the element looks flat. With it, it looks like real glass.

### The Ambient Background Orbs

The body background has large blurred color circles:
```css
body::before {
  background:
    radial-gradient(ellipse at 15% 12%, rgba(99,102,241,0.22), transparent 38%), /* indigo top-left */
    radial-gradient(ellipse at 85% 8%, rgba(236,72,153,0.16), transparent 34%),  /* pink top-right */
    radial-gradient(ellipse at 50% 95%, rgba(168,85,247,0.13), transparent 42%); /* purple bottom */
}
```
These create the colored atmosphere that glass elements blur into. Without these orbs, glassmorphism looks boring. With them, the frosted glass has color variation and depth.

---

## 6. CSS CONCEPTS USED

### `backdrop-filter: blur(Xpx)`
**What it does:** Blurs everything rendered **behind** the element in the browser's compositing layer.
**Requires:** The element must have a semi-transparent background, otherwise the blur has nothing to show through.
**Performance:** GPU-accelerated. Does not blur the element's own content, only the backdrop.
**Browser support:** All modern browsers. Needs `-webkit-backdrop-filter` prefix for older Safari.

### `backdrop-filter: saturate(X%)`
**What it does:** Makes colors behind the element more vivid/saturated. At 160%, colors appear 60% more intense.
**Combined with blur:** `blur(28px) saturate(160%)` — blurry AND colorful background = frosted glass look.

### `box-shadow` — Multi-layer
Multiple shadows are stacked with commas:
```css
box-shadow:
  0 8px 32px rgba(0,0,0,0.45),          /* outer depth shadow */
  0 2px 8px rgba(0,0,0,0.25),           /* close soft shadow */
  inset 0 1px 0 rgba(255,255,255,0.1);  /* inner top highlight */
```
- **Outer shadows** push the element away from the background (depth)
- **`inset`** draws the shadow inside the element (highlights, recesses)

### `rgba()` colors
**What it is:** Red, Green, Blue, Alpha (opacity).
**Used everywhere:** `rgba(255,255,255,0.08)` = white at 8% opacity. This is how semi-transparent white borders and backgrounds are made.

### CSS Variables (`--var-name`)
Defined in `:root {}` and used with `var()`:
```css
:root {
  --glass-blur: blur(28px) saturate(160%);
}
.glass {
  backdrop-filter: var(--glass-blur);
}
```
**Why:** Change one variable and every element using it updates. Consistent design.

### `border-radius`
**Used heavily for:** The rounded, pill, and organic shapes.
- `rounded-full` = 9999px (perfect circle / pill)
- `rounded-[32px]` = large rounded corners (card feel)
- `rounded-[36px]`, `rounded-[40px]` = even more organic, iOS-like

### Neumorphism (`.neu-raised`, `.neu-inset`)
**What it is:** A design trend that makes elements look extruded from or pressed into the background surface, like soft 3D clay.
**How it works:** Two shadows — one dark (below-right), one light (above-left):
```css
box-shadow:
  4px 4px 16px rgba(0,0,0,0.55),           /* dark shadow */
  -2px -2px 8px rgba(255,255,255,0.03);    /* subtle light shadow */
```
**Used subtly** in this app to complement the glass design without overwhelming it.

### CSS Animations

**`@keyframes` and `animation`:**

| Class | Effect | Used for |
|---|---|---|
| `animate-float` | Gentle up-down floating (3s loop) | Icons on Login/Register, 404 |
| `animate-glass-in` | Scale + fade + blur entry (0.42s) | Login card, Register card, modals |
| `animate-depth-pulse` | Slow scale breath (6s loop) | Ambient background orbs |
| `liquid-sheen-on-hover` | Light sweep across on hover (0.7s) | Cards, buttons on hover |
| `animate-fade-in-up` | Fade + slide up (0.4s) | Toast notifications, chat messages |
| `animate-slide-up` | Slide from bottom (0.36s) | Mobile bottom sheets |
| `animate-spin-slow` | Slow rotation (3s loop) | Empty state disc icon |
| `animate-spin` | Fast spin | Loading spinners |

### `transition` and `cubic-bezier`
Controls how fast and how smoothly properties animate when they change.
```css
transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
```
`cubic-bezier(0.22, 1, 0.36, 1)` = starts fast, decelerates smoothly to a stop (feels "weighted" and satisfying — the CSS equivalent of Apple's UIKit spring animations).

### Tailwind `group` / `group-hover`
```jsx
<div className="group">
  <img className="group-hover:scale-110" />
</div>
```
When the parent has `group`, children can react to the parent being hovered with `group-hover:`. Used in MusicCard to scale the image when the whole card is hovered.

### `will-change: transform`
Tells the browser in advance that this element will animate `transform`. The browser can move it to the GPU early, making animation smoother. Used on MusicCard.

---

## 7. UI PATTERNS & COMPONENTS

### Floating Action Button (FAB)
The circular AI chat button in the bottom-right. Always visible, fixed position. Opens the chat panel when clicked. CSS class: `.floating-fab`.

### Mini Player
The persistent music player bar at the bottom. Fixed position, always shows while music is playing. Has play/pause, skip, progress bar, and volume. Swipe up on mobile to expand.

### Expanded Player
Full-screen music player (desktop: modal dialog; mobile: full screen). Has album art, controls, sleep timer, queue, volume.

### Bottom Sheet
Mobile-only modal that slides up from the bottom. Used for Queue and Sleep Timer in the mobile player. Animated with `animate-slide-up`.

### Toast Notifications
Small notification messages that appear bottom-right and auto-dismiss after 5 seconds. Three types: success (green), error (pink), info (indigo). Uses context (`ToastProvider`) so any component can trigger a toast.

### Skeleton Loaders
Placeholder UI shown while real content loads. Gray shimmer boxes in the same shape as the content they'll replace. Uses the `.shimmer` CSS class which creates a moving gradient sweep effect.

### Glass Cards (MusicCard)
Music track cards with: thumbnail image, title, favorite button, play overlay on hover. Uses liquid glass background with top-edge highlight and hover sheen animation.

### Genre Pills
Horizontal scrollable row of category buttons. Active pill gets gradient background + glow. Inactive pills are glass. Used in MusicBrowseControls.

### Protected Routes
Pages like `/profile` are wrapped in `<ProtectedRoute>`. If the user is not logged in, they're redirected to `/login` automatically.

### Lazy Loading
Pages are loaded only when first visited (`lazy(() => import(...))`). The `<Suspense>` component shows a `<PageLoader>` while the page code downloads. This makes the initial page load faster.

---

## 8. ARCHITECTURE — FRONTEND

```
frontend/src/
├── App.jsx                   # Root component: routes, global providers
├── main.jsx                  # Entry point: ReactDOM.createRoot, ToastProvider
├── index.css                 # Global styles, glass system, animations
├── config.js                 # Constants (API URL, default avatar)
│
├── pages/
│   ├── Login.jsx             # Login form (glass card design)
│   ├── Register.jsx          # Register form (glass card design)
│   ├── NotFound.jsx          # 404 page
│   └── music/
│       ├── Music.jsx             # Main music discovery page
│       ├── MusicCard.jsx         # Individual track card
│       ├── MusicBrowseControls.jsx # Search bar, genre filters, header
│       ├── ApiKeyRequired.jsx    # Shown when YouTube API key missing
│       ├── constants.js          # Genre list, YouTube config
│       └── youtube.helpers.js    # YouTube URL/ID helpers
│   └── profile/
│       ├── Profile.jsx           # Profile page shell
│       ├── ProfileHeaderSection.jsx # Avatar, name, edit/logout buttons
│       ├── ProfileEditForm.jsx   # Edit username and bio form
│       ├── ProfileUniverseSection.jsx # Saved tracks grid
│       └── useProfileController.js # All profile logic (form, upload, etc.)
│
├── features/
│   ├── auth/
│   │   └── AuthContext.jsx   # Login/logout/register state, JWT management
│   └── music/
│       ├── MusicContext.jsx  # Global music state: currentTrack, playlist, favorites
│       ├── Player.jsx        # Full music player (mini + expanded)
│       └── music-command-brain.js # AI chat command interpreter for music
│
├── components/
│   ├── Header.jsx            # Top navigation bar
│   ├── Footer.jsx            # Page footer
│   ├── ErrorBoundary.jsx     # Catches React render errors gracefully
│   ├── ProtectedRoute.jsx    # Redirects to login if not authenticated
│   ├── SkeletonLoader.jsx    # Loading placeholder components
│   ├── FloatingAIButton.jsx  # AI chat FAB + chat panel
│   └── ui/
│       ├── Toast.jsx         # Toast notification system
│       └── AIChatCards.jsx   # Song/empty state cards inside AI chat
│
├── services/
│   └── api.js               # Shared axios instance with JWT & base URL
│
└── styles/
    └── FloatingAIButton.css  # CSS for the AI chat button and panel
```

### State Management
No Redux or Zustand. Uses React's built-in Context API:
- `AuthContext` — user login state, accessible everywhere
- `MusicContext` — music playback state (current track, queue, favorites), accessible everywhere
- `ToastContext` — toast system, wrapped in `main.jsx`

---

## 9. ARCHITECTURE — BACKEND

```
backend/src/
├── index.js              # Server entry: Express setup, middleware, route mounting
│
├── routes/
│   ├── auth.js           # POST /api/auth/login, /register, /me
│   ├── music.js          # GET /api/music/search, /api/music/track/:id
│   ├── favorites.js      # GET/POST/DELETE /api/favorites
│   ├── profile.js        # GET/PUT /api/profile, image upload
│   └── ai.js             # POST /api/ai/chat (Groq AI)
│
├── middleware/
│   ├── auth.js           # Verifies JWT, attaches req.user
│   ├── rateLimiter.js    # express-rate-limit config
│   └── validate.js       # Zod request validation middleware
│
├── models/
│   ├── User.js           # Mongoose schema: username, email, passwordHash, bio, profilePic
│   └── Music.js          # Mongoose schema: title, youtubeUrl, thumbnailUrl, savedBy
│
├── services/
│   ├── youtube.js        # yt-search wrapper + Redis caching
│   ├── imagekit.js       # ImageKit upload service
│   └── groq.js           # Groq AI chat service
│
└── utils/
    ├── logger.js         # Winston logger config
    └── env.js            # Envalid environment validation
```

---

## 10. AUTHENTICATION FLOW

1. **Register:** User submits username + email + password → backend hashes password with bcryptjs → saves User to MongoDB → returns JWT token
2. **Login:** User submits email/password → backend finds user → compares password with bcryptjs → signs JWT with user ID → returns token
3. **Token storage:** Frontend saves JWT in `localStorage`
4. **Authenticated requests:** Axios interceptor in `api.js` attaches the token as `Authorization: Bearer <token>` header on every request
5. **Token verification:** Backend `auth.js` middleware verifies the JWT signature on protected routes
6. **Logout:** Frontend removes token from localStorage, `AuthContext` clears user state
7. **401 handling:** If backend returns 401 (token expired/invalid), axios interceptor redirects to `/login`

---

## 11. MUSIC PLAYBACK SYSTEM

### How music plays
1. User clicks a song card → `playTrack(track, playlist)` called from `MusicContext`
2. `MusicContext` sets `currentTrack` and `playlist` in state
3. `Player.jsx` detects `currentTrack` and renders (was returning `null` before)
4. `react-youtube` renders a hidden YouTube IFrame with the track's `youtubeUrl`
5. YouTube plays the audio — Player.jsx shows custom controls that control the YouTube player via the `ref` (`ytRef.current.internalPlayer`)

### Sleep Timer
Two modes:
- **Timed:** Count down from N minutes → pause when reaches 0
- **End of song:** Pause when the current track ends

State: `sleepMode` (`"timed"` | `"end"` | `null`), `sleepRemaining` (seconds), `sleepTimerEnd` (timestamp).

### Queue
The playlist passed to `playTrack` becomes the queue. Skip forward/back navigates through it. Shuffle mode randomizes the order.

### Favorites
`MusicContext` tracks which songs are saved via `savedByUrl` (object keyed by YouTube URL). The `/api/favorites` endpoints sync with the database.

### Drag-and-Drop Reordering
On the Music page, when showing favorites in "Custom" sort order, cards become draggable. HTML5 drag events (`onDragStart`, `onDragOver`, `onDrop`) handle reordering the favorites array.

---

## 12. AI FEATURES

### Floating AI Chat (Groq-powered)
- User types a message → sent to `/api/ai/chat`
- Backend sends conversation history to Groq API → Groq returns AI response
- Response displayed in chat bubbles

### Music Command Brain (`music-command-brain.js`)
Before sending to Groq, the AI chat first runs through a local command interpreter:
- "play [song]" → directly calls `music.playTrack()`
- "add to favorites" → calls `toggleFavorite()`
- "search for [query]" → triggers a music search
- "clear queue" → clears the queue
Only if the command brain can't handle it does it fall back to the Groq API.

### Google Cloud Vision
Profile picture uploads are scanned for inappropriate content (explicit material, violence) before being accepted. If flagged, the upload is rejected.

---

## 13. KEY CONCEPTS EXPLAINED SIMPLY

### What is glassmorphism?
Frosted glass effect in UI design. Elements look like glass — semi-transparent, blurry background, thin white border, soft shadows. Made with CSS `backdrop-filter: blur()`.

### What is backdrop-filter?
A CSS property that blurs/adjusts what's rendered behind an element. The element itself must be semi-transparent for it to show.

### What is a JWT?
A JSON Web Token — a small string that proves who you are. Like a wristband at a concert. The server gives you one when you log in. You show it with every request so the server knows it's really you.

### What is a REST API?
A way for frontend and backend to communicate over HTTP. The frontend sends requests (GET, POST, PUT, DELETE) to specific URLs, and the backend responds with JSON data.

### What is React Context?
A way to share data between many React components without passing props through every level. Like a global variable, but reactive.

### What is Vite?
A dev server + build tool for web apps. Much faster than old tools like Webpack. Uses native ES modules in development (no bundling needed) and Rollup for production builds.

### What is Tailwind CSS?
A CSS framework where instead of writing `.my-button { border-radius: 8px; }`, you write `className="rounded-lg"`. Every style is a class name. Faster to write, consistent design.

### What is MongoDB?
A NoSQL database that stores data as JSON-like documents instead of SQL tables. Flexible — documents in the same collection can have different fields.

### What is Mongoose?
A library that adds structure to MongoDB. You define a schema (what fields a document should have and their types) and Mongoose enforces it.

### What is Redis?
An in-memory database — extremely fast because everything is in RAM. Used as a cache: store results of expensive operations so the next request gets the answer instantly.

### What is an LLM?
Large Language Model — an AI that understands and generates human language. GPT-4, Claude, Llama are LLMs. Groq runs open-source LLMs very fast (low latency).

### What is bcrypt?
A hashing algorithm designed specifically for passwords. It's intentionally slow (to stop brute-force attacks) and adds a random "salt" so two identical passwords produce different hashes.

### What is ImageKit?
A cloud service for storing and serving images. Automatically resizes, compresses, and converts images. Serves them from a CDN (fast servers near the user).

### What is a CDN?
Content Delivery Network — a network of servers worldwide. When you request an image, it comes from the server geographically closest to you, making it load faster.

### What is CORS?
Cross-Origin Resource Sharing. A browser security rule: JavaScript on `website-A.com` cannot call APIs on `website-B.com` unless `website-B.com` explicitly allows it via CORS headers.

### What is rate limiting?
Restricting how many API requests a single user/IP can make in a time period. Prevents abuse, DDoS, and API key theft.

### What is lazy loading?
Loading code/images only when they are actually needed. In React, `React.lazy()` loads a page component's code only when the user navigates to that page. Faster initial load.

### What is HMR (Hot Module Replacement)?
When you save a file during development, only that specific component updates in the browser — no full page reload. Vite does this automatically.

### What is a Skeleton Loader?
A gray placeholder that matches the shape of content that's loading. Better UX than a spinner because the user can see the layout before content arrives.

### What is a Monorepo?
A single repository containing multiple projects (here: `frontend/` and `backend/`). They share the same git history but are separate Node.js projects with their own `package.json`.
