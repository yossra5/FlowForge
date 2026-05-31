# FlowForge — Visual Workflow Builder

## What is FlowForge?

FlowForge is a **full-stack visual workflow builder** that allows users to create, configure, and execute automated workflows through an intuitive drag-and-drop interface. Designed with an n8n-style node editor, it enables seamless integration of API calls, AI agents, LLM chains, and custom tools into complex automation pipelines.

---

## Built With

**Frontend:**
- React 18
- React Flow (node-based canvas)
- Lucide React (icons)
- Custom CSS-in-JS styling

**Backend:**
- Express.js
- MongoDB with Mongoose
- Axios (HTTP requests)

**Authentication:**
- Session-based authentication
- bcrypt for password hashing

---

## Project Structure
flowforge/
├── client/ # React frontend
│ └── src/
│ ├── components/ # NodeCard, Sidebar, Toolbar, Modals
│ ├── pages/ # AuthPage, DashboardPage, EditorPage
│ ├── context/ # AuthContext, ThemeContext
│ ├── services/ # API calls, validation, serialization
│ └── data/ # Node types and defaults
│
├── server/ # Express backend
│ ├── routes/ # auth, workflows, execute
│ ├── middleware/ # authentication
│ ├── db/ # MongoDB connection
│ └── index.js # Entry point
│
└── package.json # Root with concurrent dev scripts


---

## Core Functionalities

### Node Editor Canvas
- Drag-and-drop nodes from sidebar
- Connect nodes via visual edges
- Pan, zoom, and fit view controls
- MiniMap and background customization

### Node Types
- **Manual Trigger** — Start workflow with confirmation
- **Schedule Trigger** — Time-based execution
- **API Call** — HTTP requests with authentication
- **AI Agent** — Intelligent agent with tool calling
- **LLM Basic Chain** — Direct language model calls
- **Tool Node** — API tools connected to AI Agent

### AI Agent Features
- Plus (+) button creates connected Tool nodes
- Tool nodes stack vertically to the right
- Solid line connections for tools
- Dashed line connections for regular nodes
- Delete confirmation with connected tools warning

### Workflow Management
- Save/auto-save workflows to MongoDB
- Export/import workflow JSON files
- Rename workflows and nodes
- Run workflows with visual execution status

### Authentication
- User registration and login
- Session-based authentication
- Protected API routes
- Personal workflow storage per user

### Execution Engine
- Sequential node execution based on connections
- Variable interpolation using `{{NodeName.field}}` syntax
- Support for Manual Trigger variables
- HTTP request proxying with authentication
- LLM-filled tool parameters

### Input/Output Panels
- Real-time variable inspection
- Drag-and-drop variable insertion
- Previous node output visibility
- Manual trigger variable management

---

## Key Features

✅ Visual node editor with React Flow  
✅ Multiple node types (Triggers, Actions, AI, Tools)  
✅ AI Agent with dynamic tool creation  
✅ Auto-incrementing tool naming  
✅ Solid tool connections / dashed regular connections  
✅ Delete confirmation for AI Agent with tools  
✅ Save, export, import workflows  
✅ Variable interpolation system  
✅ HTTP request with authentication (Bearer, API Key, Basic)  
✅ Session-based authentication  
✅ MongoDB persistence  
✅ Development hot reload  
✅ Production build ready  

---
## Quick Start

```bash
# Install dependencies
npm run install:all

# Run development (client + server)
npm run dev

# Build for production
npm run build
npm start
---
Frontend: http://localhost:3000
Backend API: http://localhost:5000

Environment Variables
env
PORT=5000
SESSION_SECRET=your_secret_key
MONGO_URI=mongodb://localhost:27017/flowforge
