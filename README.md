# FlowForge — Full Stack Workflow Builder

React [React Flow/Lucid React]+ Express + NodeJS + MongoDB.

---

## One-time setup

```bash
# 1. Install Node.js LTS from https://nodejs.org

# 2. Enter the project folder
cd flowforge

# 3. Install ALL dependencies (root + server + client) in one command
npm run install:all
```

---

## Run in development

```bash
# From the root /flowforge folder — starts BOTH server and client
npm run dev
```

| Service | URL |
|---------|-----|
| React frontend | http://localhost:3000 |
| Express API    | http://localhost:5000 |

The React dev server proxies all `/api/...` calls to Express automatically.

---

## Run in production

```bash
# Build the React app
npm run build

# Start the Express server (it serves the built React files)
npm start
# Open http://localhost:5000
```

---

## Project structure

```
flowforge/
├── package.json              ← root: runs client + server together
│
├── server/
│   ├── index.js              ← Express entry point
│   ├── .env                  ← PORT, SESSION_SECRET, DB_PATH
│   ├── db/
│   │   └── init.js           ← SQLite setup (creates tables on first run)
│   ├── middleware/
│   │   └── auth.js           ← requireAuth middleware
│   └── routes/
│       ├── auth.js           ← /api/auth/register|login|logout|me
│       ├── workflows.js      ← /api/workflows  (CRUD, auth-protected)
│       └── execute.js        ← /api/execute    (HTTP proxy, auth-protected)
│
└── client/
    └── src/
        ├── App.jsx           ← Root: Auth → Dashboard → Editor routing
        ├── index.js          ← Entry point
        ├── context/
        │   └── AuthContext.jsx   ← Global user state (login/logout/me)
        ├── pages/
        │   ├── AuthPage.jsx      ← Login + Register
        │   ├── DashboardPage.jsx ← Workflow list
        │   └── EditorPage.jsx    ← Canvas editor
        ├── components/
        │   ├── Toolbar.jsx           ← Save + Export JSON + rename workflow
        │   ├── Sidebar.jsx           ← Node catalog (drag or click)
        │   ├── NodeCard.jsx          ← Node on canvas (editable name)
        │   └── HttpRequestModal.jsx  ← Double-click popup for HTTP params
        ├── services/
        │   ├── api.js               ← All axios calls (authAPI, workflowAPI, executeAPI)
        │   ├── ValidateName.js      ← Node name uniqueness + auto-increment
        │   ├── WorkflowSerializer.js← Canvas → JSON + save to DB + download
        │   └── uuid.js              ← ID generator
        └── data/
            └── nodeTypes.js         ← Node catalog + HTTP_REQUEST_DEFAULTS schema
```

---

## API Reference

### Auth
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| POST | /api/auth/register | `{ username, email, password }` | Create account + auto-login |
| POST | /api/auth/login    | `{ username, password }`        | Login |
| POST | /api/auth/logout   | —                               | Destroy session |
| GET  | /api/auth/me       | —                               | Get current user |

### Workflows (all require login)
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| GET    | /api/workflows        | —                    | List all (metadata) |
| POST   | /api/workflows        | `{ name, data }`     | Create new workflow |
| GET    | /api/workflows/:id    | —                    | Get full workflow |
| PUT    | /api/workflows/:id    | `{ name?, data? }`   | Save/update |
| DELETE | /api/workflows/:id    | —                    | Delete |

### Execute (requires login)
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| POST | /api/execute | `{ parameters }` | Run an HTTP Request node via server-side proxy |

---

## Authentication strategy 

The auth flag on each HTTP Request node:

```js
authentication: {
  type: "none" | "bearerToken" | "apiKey" | "basicAuth",

  bearerToken: { token: "eyJ..." },

  apiKey: {
    in: "header" | "query",
    name: "X-API-Key",
    value: "your-key"
  },

  basicAuth: {
    username: "user",
    password: "pass"
  }
}
```

Why a single `type` flag:
- Only one auth method can be active at a time (mutually exclusive)
- The execute route does `if (auth.type === "bearerToken") { ... }` — clean switch
- Extensible: adding OAuth2 = one new `type` value
- The UI shows/hides the right fields based on the selected type

---

## Workflow JSON format (exported file)

```json
{
  "name": "My Workflow",
  "version": "1.0",
  "createdAt": "2025-...",
  "nodes": [
    {
      "uniq_id": "abc-123",
      "type": "HTTPRequest",
      "label": "Get Users",
      "description": "",
      "position": { "x": 200, "y": 150 },
      "parameters": {
        "method": "GET",
        "url": { "value": "https://api.example.com/users", "mode": "fixed" },
        "authentication": { "type": "none" }
      },
      "nexts": ["def-456"]
    }
  ]
}
```

---

## What to build next

1. More node types: `AIAgent`, `LLMCall` — same pattern as HTTPRequest

