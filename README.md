# Lecture Brain — Next.js Frontend

> **AI-powered learning platform** — upload lectures, chat with them, get summaries, quizzes, and admin analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion v11 |
| Icons | Lucide React + React Icons v5 |
| Charts | Chart.js v4 |
| HTTP | Axios v1 |
| Backend | FastAPI (Railway) — `https://lecture-brain-last-production.up.railway.app` |

---

## Getting Started

```bash
# 1. Install
npm install

# 2. Create .env.local
echo "NEXT_PUBLIC_API_BASE_URL=https://lecture-brain-last-production.up.railway.app" > .env.local

# 3. Run dev server
npm run dev        # → http://localhost:3000

# 4. Build for production
npm run build
npm start
```

---

## Project Structure

```
src/
├── api/
│   └── client.js                  # Re-export shim (backward compat)
├── app/
│   ├── layout.js                  # Root layout: anti-flash script, Providers, viewport
│   ├── globals.css                # Tailwind v4, dark mode, .tc utility, scrollbar-none
│   ├── page.js                    # Home / Landing page (role-aware hero + nav)
│   ├── login/page.js              # Login form — admin@lecturebrain.com → /admin
│   ├── signup/page.js             # Signup form with password strength checker
│   ├── subjects/page.js           # Subject list with delete, no lecture count
│   ├── subjects/[subjectId]/page.js # Lecture cards with delete + upload pipeline
│   ├── chat/page.js               # AI chat — 4 tabs (Chat, Explain, Summary, MCQ)
│   └── admin/
│       ├── layout.js              # RequireAdmin guard + AdminShell (email badge, logout)
│       ├── page.js                # Dashboard — /admin/analytics + /admin/operations
│       ├── students/page.js       # Lectures Overview — engagement from analytics
│       ├── analytics/page.js      # Analytics — per-subject AI insights, charts
│       └── presentation/page.js  # Presentation Generator — /admin/presentation/{id}
├── components/
│   ├── Providers.jsx              # Wraps children in Auth + Theme providers
│   ├── RequireAuth.jsx            # Client-side auth guard → /login
│   ├── RequireAdmin.jsx           # Admin guard → /subjects if not admin
│   └── admin/
│       └── AdminSidebar.jsx       # 4-item sidebar with mobile hamburger
├── context/
│   └── AppContext.js              # AuthProvider + ThemeProvider
├── hooks/
│   ├── useSubjects.js             # CRUD + optimistic UI for subjects
│   ├── useLectures.js             # CRUD + 3s status polling for lectures
│   └── useAdminData.js            # Shared admin hook — analytics + operations + lectures
└── utils/
    ├── api.js                     # All API function exports (typed, documented)
    └── axios.js                   # Axios instance, interceptors, setAuthToken()
```

---

## Authentication Flow

```
POST /auth/login
  → returns { access_token, token_type, user: { id, email, role, is_active } }

AppContext._buildUser(res)
  → { id, email, name, role, isAdmin: role === "admin", isActive }

login/page.js
  → user.isAdmin === true  →  router.push("/admin")
  → user.isAdmin === false →  router.push("/subjects")  (or ?next= param)

Session stored in localStorage: lb_token + lb_user (JSON)
Hydrated on mount — no /auth/me call needed (full user in login response)
```

**Admin account:** `admin@lecturebrain.com` — any user whose `role === "admin"` in the login response is treated as admin.

---

## API Reference

### Auth
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/auth/register` | `{ email, password }` |
| POST | `/auth/login` | OAuth2 form-data (`username`, `password`) |

### Subjects (require Bearer token)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/subjects/` | List all user subjects |
| POST | `/subjects/` | `{ name, description }` |
| GET | `/subjects/{id}` | Single subject |
| DELETE | `/subjects/{id}` | Cascade deletes lectures |

### Lectures (require Bearer token)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/lectures/` | `{ title, description, subject_id }` |
| GET | `/lectures/subject/{id}` | All lectures for a subject |
| GET | `/lectures/{id}` | Single lecture |
| GET | `/lectures/{id}/status` | `{ status: "processing"|"completed"|"failed" }` — polled every 3s |
| DELETE | `/lectures/{id}` | Deletes lecture + data |

### Knowledge Ingestion (require Bearer token)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/knowledge/upload_pdf/{id}` | multipart/form-data `file` field |
| POST | `/knowledge/upload_video/{id}` | `{ url, extract_frames }` |
| POST | `/knowledge/upload_text/{id}` | `{ text }` |

### AI Inference (require Bearer token)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/ai/chat` | `{ message, lecture_id, history[] }` → `{ response }` |
| POST | `/ai/explain` | `{ concept, lecture_id }` → `{ explanation }` |
| GET | `/ai/summary/{id}` | Returns knowledge card object |
| POST | `/ai/quiz/{id}` | Returns `{ questions: [...] }` |

### Admin (require admin Bearer token)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/admin/analytics` | Array of per-subject analytics objects |
| POST | `/admin/analytics/generate` | Triggers re-analysis |
| GET | `/admin/operations` | Array of lecture pipeline statuses |
| GET | `/admin/presentation/{id}` | AI slides for a completed lecture |
| POST | `/admin/upload_pdf` | Admin-level PDF upload (no lecture_id) |
| POST | `/admin/upload_video` | Admin-level video URL upload |

---

## Admin Analytics Response Shape

```js
// GET /admin/analytics → Array
[
  {
    subject_id:          "...",
    subject_name:        "Machine Learning",
    weak_topics:         [{ topic: "Backprop", frequency_score: 14 }],
    common_questions:    ["What is gradient descent?"],
    confusing_concepts:  ["Chain rule", "Learning rate"],
    engagement_count:    42,
    ai_insight:          "Students struggle with the mathematical basis of...",
    last_analyzed_at:    "2024-01-15T10:30:00Z"
  }
]

// GET /admin/operations → Array
[
  {
    lecture_id: "...",
    title:      "Intro to ML",
    status:     "completed",
    job_tracker: {
      upload_status:          "completed",
      extraction_status:      "completed",
      chunking_status:        "completed",
      embedding_status:       "completed",
      card_generation_status: "completed",
      error_traceback:        null
    },
    created_at: "2024-01-15T09:00:00Z"
  }
]
```

---

## Key Features

### User Flow
- **Subjects page** — create/delete subjects, click to open
- **Subject detail** — add lectures (PDF upload or YouTube URL), delete lectures, click completed lecture → Chat
- **Chat page** — 4 tabs:
  - **Chat** — conversational AI with history (`POST /ai/chat`)
  - **Explain** — concept explanation mode (`POST /ai/explain`)
  - **Summary** — auto-loads knowledge card on tab switch (`GET /ai/summary/{id}`)
  - **MCQ Quiz** — auto-loads interactive quiz on tab switch (`POST /ai/quiz/{id}`)

### Admin Flow
- **Dashboard** — KPIs + pipeline monitor from `/admin/analytics` + `/admin/operations`
  - Generate Analytics button → `POST /admin/analytics/generate`
  - Per-subject AI insight cards (weak topics, confusing concepts, engagement)
- **Lectures Overview** — subject + lecture table with engagement counts
- **Analytics** — deep per-subject breakdown with charts
- **Presentation** — generates slides via `GET /admin/presentation/{lecture_id}`

### Charts (Chart.js)
All charts use the safe mount pattern to avoid `Canvas is already in use` errors in React StrictMode:
```js
let mounted = true;
const existing = Chart.getChart(canvas);
if (existing) existing.destroy();
chart = new Chart(canvas, config);
return () => { mounted = false; chart?.destroy(); };
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://lecture-brain-last-production.up.railway.app
```

---

## Dark Mode

Class-based dark mode on `<html>`. Anti-flash inline script in `layout.js` reads `localStorage.lb_theme` before paint. `ThemeProvider` syncs state with `document.documentElement.classList`.

---

## Responsive Design

All pages are fully responsive:
- Mobile: single column, hamburger sidebar, compact cards
- Tablet: 2-column grids
- Desktop: 3–4 column grids, fixed sidebar (220px), full table views
