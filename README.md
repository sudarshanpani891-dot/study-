# Study- | ମାଟିସାଥୀ (MatiSathi)

> **Autonomous Bilingual EdTech & Universal Learning Intelligence Platform**  
> *Bridging pedagogical and digital divides with multi-agent cognitive tutoring, localized Odia analogies, and offline-first resilience.*

[![Next.js 15](https://img.shields.io/badge/Next.js-15.x-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![LangGraph Multi-Agent](https://img.shields.io/badge/LangGraph-Multi--Agent%20Supervisor-purple?style=flat)](https://github.com/sudarshanpani891-dot/study-)
[![Bilingual Pedagogy](https://img.shields.io/badge/Pedagogy-Odia%20(ଓଡ଼ିଆ)%20%2B%20English-orange?style=flat)](https://github.com/sudarshanpani891-dot/study-)
[![Offline First PWA](https://img.shields.io/badge/PWA-Service%20Worker%20%2B%20IndexedDB-green?style=flat)](https://github.com/sudarshanpani891-dot/study-)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 Overview

**Study- (ମାଟିସାଥୀ / MatiSathi)** is an open-source, autonomous universal learning companion and educational presentation generation engine. Built to empower both rural and urban learners, it eliminates the barriers of language, connectivity, and abstract explanations through intelligent agentic scaffolding.

Instead of generic chatbot answers, **Study-** operates a **7-node cognitive multi-agent graph** that diagnoses the student's prerequisite gaps, identifies latent misconceptions, delivers explanations in natural conversational **Odia (`or-IN`)** with English technical vocabulary, and anchors ideas in intuitive everyday analogies (e.g. mud walls vs. wire mesh doors for cell walls, earthen water pots for evaporative cooling).

---

## ✨ Key Features

### 1. 🤖 7-Agent Cognitive Supervisor Workflow
Every student question triggers an autonomous LangGraph pipeline:
- **Intake Agent**: Normalizes multi-lingual inputs (English, Odia script, Odia in Latin transliteration) and extracts core query intent.
- **Concept Mapper Agent**: Matches the query to syllabus capsules (BSE Odisha / SCERT Class 9 & 10) or performs dynamic internet knowledge retrieval via Wikipedia for universal concepts.
- **Diagnostician Agent**: Proactively identifies misconceptions (e.g., assuming animal cells have cell walls, or confusing boiling with evaporation).
- **Tutor Agent**: Synthesizes structured Odia & English explanations grounded in regional analogies.
- **Assessor Agent**: Formulates 4-option interactive practice challenges with real-time feedback.
- **Planner Agent**: Generates tailored 4-stage autonomous learning plans and sets spaced repetition review schedules.
- **Language Guard Agent**: Enforces clean Odia phrasing with English technical terms preserved in parentheses for technical literacy.

### 2. 🌾 Culturally-Anchored Bilingual Pedagogy
- **Natural Odia Dialogue**: Smooth, relatable spoken Odia without overly archaic or literal machine-translated phrasing.
- **Dual-Script Support**: Seamlessly renders and switches between Odia script (`\u0B00–\u0B7F`) and English, with Noto Sans Oriya and Noto Serif Oriya typography.
- **Everyday Village Analogies**: Explains Bernoulli's principle, Newton's laws of motion, transpiration, and rivers using familiar local experiences (e.g., village tube wells, paddy field canal irrigation, earthen *surahi* pots).

### 3. 📶 Offline-First Resilience & Sync
- **Progressive Web App (PWA)**: Equipped with `manifest.json` and service worker caching (`sw.js`).
- **IndexedDB & LocalStorage Queues**: Learners in areas with intermittent cellular coverage can study and submit doubts offline. Doubts queue locally and automatically synchronize upon reconnection.
- **Low-Data Mode**: Optimized lightweight payloads for 2G/3G connections.

### 4. ⚡ Groq Token-Budgeting Engine
- **js-tiktoken Estimator**: Accurately counts tokens before network requests.
- **Adaptive Trimming**: Automatically trims and budgets slide generation prompts and chat contexts to prevent context overflow and reduce latency.

### 5. 🎨 Multi-Role Workspaces & Slide Generator
- **Learner Cockpit (`/matisathi`, `/learn`)**: Interactive doubt solver, voice dictation, audio read-aloud playback, diagnostic scorecards, interactive challenges, and hands-on experiments.
- **Portal & Management (`/login`)**: Role-based access for students and educators to review student mastery matrices and class-wide misconceptions.
- **OpenMAIC Visual Lesson Generator (`/`)**: High-fidelity AI slide presentation generator with KaTeX/LaTeX math rendering, custom font styling, and PPTX export.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    User([Learner Doubt / Query]) --> Intake[1. Intake Agent\nNormalize & Detect Language]
    Intake --> ConceptMap[2. Concept Mapper\nSyllabus KB or Web Knowledge]
    ConceptMap --> Diagnostician[3. Diagnostician\nDetect Misconceptions & Gaps]
    Diagnostician --> Tutor[4. Bilingual Tutor\nOdia + English + Village Analogy]
    Tutor --> Assessor[5. Assessor Agent\nInteractive Practice Challenge]
    Assessor --> Planner[6. Planner Agent\n4-Stage Plan & Spaced Review]
    Planner --> LangGuard[7. Language Guard\nOdia Style & Script Verification]
    LangGuard --> Client([Interactive Learner Dashboard\nAudio + Challenge + Action Task])
    
    subgraph Offline Storage & Cache
        Client <--> IndexedDB[(Dexie / LocalStorage)]
        IndexedDB <--> SyncEngine[Sync Engine\nAuto Reconnection]
        SyncEngine <--> ServerDB[(PostgreSQL / Concepts Store)]
    end
```

---

## 📁 Repository Structure

```
study-/
├── app/
│   ├── api/
│   │   ├── learner/           # Learner profile, mastery, doubts, and followups APIs
│   │   ├── matisathi/         # Query processing, syllabus, and sync endpoints
│   │   ├── plan/              # Autonomous learning plan generation
│   │   ├── portal/            # Multi-agent chat and teacher portal API
│   │   ├── practice/          # Interactive challenge submission and scoring
│   │   ├── trace/             # Execution decision trace inspect endpoints
│   │   └── tutor/             # Tutor turn execution and due review schedules
│   ├── learn/                 # Student learning journey & concept roadmap
│   ├── login/                 # Role-based authentication (Student/Teacher)
│   ├── matisathi/             # MatiSathi flagship autonomous tutor interface
│   ├── globals.css            # Tailored typography and fluid UI design tokens
│   ├── layout.tsx             # Root layout with Odia fonts & theme providers
│   └── page.tsx               # OpenMAIC visual presentation workbench
├── components/
│   ├── matisathi/             # MatiSathi UI components (Trace, Nudge, Audio, Voice)
│   ├── portal/                # Conversation feeds, sidebars, and switcher pills
│   ├── settings/              # Settings modal with LLM provider configs
│   └── ui/                    # Base UI and Radix component library
├── lib/
│   ├── ai/
│   │   ├── groq-budget.ts     # Token budget allocator and smart prompt trimmer
│   │   ├── odia-teaching.ts   # Odia pedagogical prompts & language guidelines
│   │   └── token-estimator.ts # js-tiktoken token counting utilities
│   ├── i18n/
│   │   ├── locales/or-IN.json # Odia locale translation dictionary
│   │   └── workbench-locales/ # Specialized workbench Odia strings
│   ├── matisathi/
│   │   ├── curriculum-kb.ts   # Class 9/10 Odisha Board curriculum capsules
│   │   ├── graph.ts           # LangGraph execution workflow
│   │   ├── offline-storage.ts # Local storage, IndexedDB, and sync handlers
│   │   ├── tools.ts           # Diagnostic finding and mastery matrix tools
│   │   └── web-knowledge.ts   # Dynamic Wikipedia universal knowledge fetcher
│   ├── offline/               # Dexie IndexedDB schemas and background sync
│   └── orchestration/tutor/   # 7 specialized tutor subagents & supervisor graph
├── public/
│   ├── manifest.json          # PWA Web App Manifest
│   └── sw.js                  # PWA offline caching service worker
├── scripts/
│   ├── seed-new-concepts.mjs  # Database seeding utility for Odisha curriculum
│   └── simulate-3day-learner.ts # 3-day learner simulation runner
└── tests/
    ├── ai/                    # Groq token budget unit tests
    ├── auth/                  # Student profile & login persistence tests
    ├── i18n/                  # Odia pedagogy & script verification tests
    ├── learn/                 # Learn route & roadmap tests
    ├── matisathi/             # LangGraph, offline sync & universal topic tests
    └── portal/                # Bilingual portal & multi-agent chat tests
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `>= 22.19.0`
- **pnpm**: `>= 9.x` (`npm install -g pnpm`)
- **PostgreSQL** *(optional for full persistence, memory fallback included)*

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sudarshanpani891-dot/study-.git
   cd study-
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   Create `.env.local` in the project root:
   ```env
   # LLM Provider Keys
   OPENAI_API_KEY=your_openai_or_groq_api_key_here
   GROQ_API_KEY=your_groq_api_key_here

   # Database (Optional for local PostgreSQL)
   DATABASE_URL=postgres://openmaic:openmaic-dev@127.0.0.1:5432/openmaic

   # Application Settings
   PORTAL_LLM_PROVIDER=openai
   PORTAL_LLM_MODEL=qwen/qwen3.8-27b
   ```

4. **Seed Concepts & Database (Optional):**
   ```bash
   node scripts/seed-new-concepts.mjs
   ```

5. **Start the Development Server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

The repository features comprehensive unit and integration tests written in **Vitest**:

```bash
# Run all MatiSathi, tutor, and bilingual portal tests
npx vitest run tests/matisathi tests/learn tests/portal tests/tutor tests/auth tests/ai

# Run test suite in watch mode
pnpm test
```

---

## 🌐 Key Application URLs

| Route | Description |
| :--- | :--- |
| **`/matisathi`** | Flagship MatiSathi Autonomous Bilingual Tutor Cockpit with Voice & Audio |
| **`/learn`** | Student Personalized Roadmap, Concept Matrix, and Review Queue |
| **`/login`** | Role-based authentication for Students, Teachers, and Mentors |
| **`/`** | OpenMAIC Autonomous Multimedia Presentation Workbench |
| **`/api/matisathi/query`** | API endpoint for the 7-node cognitive tutor supervisor pipeline |
| **`/api/portal/chat`** | Multi-agent collaborative conversation endpoint |

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router), React 19 |
| **Language & Typing** | TypeScript 5 |
| **Agentic Framework** | LangGraph & Custom Supervisor State Graphs |
| **Language & Pedagogy** | Odia (`or-IN`) & English with Odia Unicode Script |
| **Offline & PWA** | Service Worker, Web App Manifest, Dexie (IndexedDB), LocalStorage |
| **LLM Inference** | Groq (`qwen/qwen3.8-27b`, Llama 3) & OpenAI API compatible endpoints |
| **Styling & Icons** | Tailwind CSS, Lucide Icons, Framer Motion |
| **Math & Presentation** | KaTeX, MathML, PPTXGenJS |
| **Testing** | Vitest, Testing Library, Playwright |

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

*Dedicated to empowering every learner across Odisha with accessible, culturally resonant, and world-class artificial intelligence.*
