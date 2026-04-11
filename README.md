# 🧠 Lecture Brain — Next.js Frontend

A pixel-perfect Next.js 16 mirror of the Vite frontend. Same UI, same logic, same API integration — rebuilt with the App Router, React Server Components, and Next.js conventions.

---

## ✨ Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16 |
| React | React | 19 |
| Styling | Tailwind CSS | 4 (PostCSS plugin) |
| Animations | Framer Motion | 11 |
| HTTP Client | Axios | 1.7 |
| Icons | Lucide React | latest |

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
cd frontend-next
npm install
```

### 2. Environment variables

The file `.env.local` is already created with:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Change the URL to match your backend.

### 3. Run dev server

```bash
npm run dev
# → http://localhost:3000
```

### 4. Build for production

```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
frontend-next/
├── .env.local                         # NEXT_PUBLIC_API_BASE_URL
├── next.config.mjs
├── package.json
└── src/
    ├── api/
    │   └── client.js                  # Axios instance + all 11 API methods
    ├── context/
    │   └── AppContext.js              # AuthContext + ThemeContext ('use client')
    ├── components/
    │   ├── Providers.jsx              # Wraps children in Auth + Theme providers
    │   └── RequireAuth.jsx            # Client-side auth guard with redirect
    ├── hooks/
    │   ├── useSubjects.js             # Subjects CRUD + optimistic UI
    │   └── useLectures.js             # Lectures CRUD + status polling
    └── app/                           # Next.js App Router
        ├── globals.css                # Tailwind + dark mode + custom utilities
        ├── layout.js                  # Root layout: anti-flash script + Providers
        ├── page.js                    # / → HomePage
        ├── login/
        │   └── page.js               # /login
        ├── signup/
        │   └── page.js               # /signup
        ├── subjects/
        │   ├── page.js               # /subjects (protected)
        │   └── [subjectId]/
        │       └── page.js           # /subjects/:id (protected)
        └── chat/
            └── page.js               # /chat?subject=&lecture= (protected)
```

---

## 🔑 Key Differences vs Vite Version

| Concern | Vite (React Router) | Next.js (App Router) |
|---|---|---|
| Routing | `react-router-dom` | File-system routing in `/app` |
| Navigation | `useNavigate`, `useSearchParams` | `useRouter`, `useSearchParams` from `next/navigation` |
| Links | `<Link to="...">` | `<Link href="...">` from `next/link` |
| Env vars | `import.meta.env.VITE_*` | `process.env.NEXT_PUBLIC_*` |
| Client components | All components are client by default | Requires `'use client'` directive |
| Auth + Theme | State in `App.jsx` passed as props | React Context (`AppContext.js`) consumed via hooks |
| Auth guard | `<RequireAuth>` in router | `<RequireAuth>` client component wrapping each protected page |
| Anti-flash | Inline script in `index.html` | `dangerouslySetInnerHTML` script in `layout.js` |

---

## 🌙 Dark Mode

Dark mode works identically to the Vite version:
- Toggled by adding/removing `dark` class on `<html>`
- Persisted in `localStorage` under key `lb_theme`
- Anti-flash inline script in `layout.js` prevents wrong-theme flash on reload
- Tailwind `dark:` variants handle all color switching

---

## 🔌 API Integration

All 11 endpoints are wired up in `src/api/client.js`:

| Method | Endpoint | Notes |
|---|---|---|
| `authRegister` | `POST /auth/register` | JSON body |
| `authLogin` | `POST /auth/login` | `application/x-www-form-urlencoded` (OAuth2) |
| `createSubject` | `POST /subjects/` | Bearer token |
| `getSubjects` | `GET /subjects/` | Bearer token |
| `getSubject` | `GET /subjects/{id}` | Bearer token |
| `deleteSubject` | `DELETE /subjects/{id}` | Cascade deletes lectures |
| `createLecture` | `POST /lectures/` | `{ title, description, subject_id }` |
| `getLecturesBySubject` | `GET /lectures/subject/{id}` | |
| `getLecture` | `GET /lectures/{id}` | |
| `getLectureStatus` | `GET /lectures/{id}/status` | Polled every 3s while `processing` |
| `deleteLecture` | `DELETE /lectures/{id}` | |

Token is injected globally via `setAuthToken()` into the Axios instance defaults after login.

---

## 🔐 Authentication Flow

1. User signs up → `POST /auth/register` → auto-login → `POST /auth/login` → `access_token`
2. Token stored in `localStorage` (`lb_token`) and injected into Axios headers
3. On page reload: token restored from `localStorage` and re-injected before any API call
4. Protected pages wrapped in `<RequireAuth>` → redirects to `/login?next=<current-path>` if not authenticated
5. Logout clears token from memory, Axios headers, and localStorage
