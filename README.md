# 🎯 InterviewIQ — Real-Time Multimodal AI Interview & Coaching Platform

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-092E20?style=for-the-badge&logo=django)](https://www.djangoproject.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](https://www.python.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r185-000000?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-FaceMesh-0097A7?style=for-the-badge&logo=google)](https://mediapipe.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**InterviewIQ** is an enterprise-grade, real-time multimodal AI-driven mock interview and candidate coaching platform. Built with a photorealistic **3D Interactive AI Interviewer ("Alex")**, automated **MediaPipe face and emotion tracking**, **STAR method evaluation**, and **instant AI performance reporting**, InterviewIQ provides candidates with a realistic, low-latency interview simulation environment.

---

## 🌟 Key Features

### 👤 1. Interactive 3D AI Interviewer ("Alex")
* **Photorealistic 3D Avatar**: WebGL rendering via Three.js with realistic lighting and camera framing.
* **Viseme Lip Synchronization**: Real-time mouth position adjustments synchronized with Web Speech / Text-to-Speech audio output.
* **Natural Dynamic Behaviors**: Dynamic eye blinking, subtle head gestures, and visual state indicators (Listening, Thinking, Speaking).
* **Role-Specific Context**: Adapts interview style and questions based on candidate job role, category (Behavioral, Technical, System Design), and difficulty level.

### 👁️ 2. Real-Time Vision & Emotion Tracking
* **MediaPipe FaceMesh Integration**: Real-time facial landmark extraction directly in browser Web Workers.
* **Gaze & Posture Analytics**: Tracks eye contact, head movement, and confidence indicators throughout the session.
* **WebSocket Telemetry Streaming**: Streams vision metrics back to the Django backend without disrupting live audio/video flow.

### 🗣️ 3. Conversational AI & STAR Method Evaluation
* **LLM Engine**: Powered by Groq / Gemini / OpenAI high-speed inference for fluid, back-and-forth conversational dialogue.
* **STAR Framework Analysis**: Evaluates candidate answers across **Situation**, **Task**, **Action**, and **Result** dimensions.
* **Speech Metrics**: Analyzes clarity, confidence, speaking speed, filler word usage, and communication tone.

### 📊 4. Post-Interview Performance Studio
* **Interactive Dashboard**: Visual breakdown of candidate performance using dynamic Recharts graphs.
* **Comprehensive Feedback**: Granular question-by-question breakdown, strengths, areas for improvement, and actionable advice.
* **Automated Worker Pipeline**: Background evaluation executed asynchronously via Celery workers and Redis.

---

## 🏗️ Architecture & Data Flow

```mermaid
graph TD
    subgraph Client ["Client Browser (Next.js 14)"]
        UI["React UI / Dashboard"]
        Alex3D["Three.js 3D Avatar (Alex)"]
        FaceTrack["MediaPipe FaceMesh Tracker"]
        AudioRec["Speech Recognition & Synthesis"]
    end

    subgraph Proxy ["Reverse Proxy"]
        Nginx["Nginx (Port 80)"]
    end

    subgraph Backend ["Backend Gateway (Django & Daphne)"]
        REST["Django REST Framework API"]
        WS["Django Channels WebSocket (Daphne)"]
    end

    subgraph Worker ["Asynchronous Background Services"]
        Celery["Celery Worker (ML & Analysis)"]
        Redis[("Redis Broker / Cache")]
        Postgres[("PostgreSQL Database")]
    end

    subgraph AI ["AI Services"]
        Groq["Groq / Gemini / OpenAI LLM API"]
    end

    UI -->|HTTPS Requests| Nginx
    FaceTrack -->|Facial Telemetry WS| WS
    AudioRec -->|Transcript Data WS| WS
    Nginx -->|Route /api| REST
    Nginx -->|Route /ws| WS
    WS <-->|Prompt & Response| Groq
    REST <--> Postgres
    WS <--> Redis
    WS -->|Dispatch Tasks| Celery
    Celery <--> Postgres
```

---

## 🛠️ Technology Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts |
| **3D & Computer Vision** | Three.js, @mediapipe/face_mesh, @mediapipe/camera_utils |
| **Backend API** | Django 4.2, Django REST Framework, djangorestframework-simplejwt |
| **Real-Time WebSockets** | Django Channels 4.1, Daphne, channels-redis |
| **Task Queue & Cache** | Celery 5.3, Redis 7 |
| **Database & Storage** | PostgreSQL 15, AWS S3 / Local Media Storage |
| **Reverse Proxy & Containers** | Nginx 1.25, Docker, Docker Compose |
| **AI Ingestion** | Google Generative AI (Gemini), Groq API, OpenAI API, NVIDIA NIM |

---

## 📂 Project Structure

```
interviewiq/
├── backend/                  # Django REST API & Channels WebSockets
│   ├── apps/
│   │   ├── users/            # Authentication, JWT, and profiles
│   │   ├── sessions/         # Interview session lifecycle management
│   │   ├── analysis/         # Real-time WebSocket consumers & LLM logic
│   │   └── reports/          # Evaluation scorecards & report generation
│   ├── core/                 # Django settings, ASGI/WSGI config, URLs
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # Next.js 14 Frontend Application
│   ├── src/
│   │   ├── app/              # Next.js App Router (dashboard, interview, report)
│   │   ├── components/       # 3D Avatar (Alex3DRealCharacter), UI components
│   │   ├── hooks/            # Custom hooks (useSpeechInterviewer, useFaceTracking, useInterviewSocket)
│   │   └── lib/              # API utilities and constants
│   ├── Dockerfile
│   └── package.json
├── ml_worker/                # Asynchronous Celery ML background worker
│   ├── apps/
│   ├── Dockerfile
│   └── requirements.txt
├── nginx/                    # Nginx reverse proxy configuration
│   └── nginx.conf
├── docker-compose.yml        # Multi-container orchestrator
├── start_servers.ps1         # Windows PowerShell launcher script
├── .env.example              # Environment variables template
└── README.md
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to create `.env` in the root directory:

```bash
cp .env.example .env
```

### Essential Environment Variables

```env
# Django Settings
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend

# PostgreSQL Database
POSTGRES_DB=interviewiq_db
POSTGRES_USER=interviewiq_user
POSTGRES_PASSWORD=your-secure-password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://interviewiq_user:your-secure-password@postgres:5432/interviewiq_db

# Redis & Celery
REDIS_PASSWORD=your-redis-password
REDIS_HOST=redis
REDIS_PORT=6379
CELERY_BROKER_URL=redis://:your-redis-password@redis:6379/0
CELERY_RESULT_BACKEND=redis://:your-redis-password@redis:6379/1

# AI API Keys
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key

# NVIDIA NIM API
NVIDIA_API_KEY=your-nvidia-api-key-here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.3-70b-instruct
DEFAULT_LLM_PROVIDER=groq

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost/api
```

### Switching LLM Providers

InterviewIQ allows you to seamlessly switch between different LLM providers for the conversational AI interviewer using the `DEFAULT_LLM_PROVIDER` environment variable.
Currently supported providers:
- `groq` (Default)
- `nvidia` (NVIDIA NIM)
- `qwen_omni` (Qwen2.5-Omni via Alibaba Cloud DashScope)

To use NVIDIA NIM, set `DEFAULT_LLM_PROVIDER=nvidia` and provide your `NVIDIA_API_KEY` (starting with `nvapi-`).

To use Qwen2.5-Omni, set `DEFAULT_LLM_PROVIDER=qwen_omni`, provide your `DASHSCOPE_API_KEY`, and construct your `QWEN_BASE_URL` using your Alibaba Cloud Workspace ID (e.g. `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`). Make sure your API key region (e.g., ap-southeast-1 for Singapore) matches the endpoint. You can also configure the voice character using `QWEN_VOICE`.

---

## 🚀 Quick Start Guide

You can run **InterviewIQ** either using **Docker Compose** (recommended for production/full stack) or **Local Development Mode** (for rapid development).

### Option A: Running with Docker Compose (Recommended)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/interviewiq.git
   cd interviewiq
   ```

2. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials and API keys
   ```

3. **Build & Start Containers**:
   ```bash
   docker-compose up --build -d
   ```

4. **Access Applications**:
   * **Web Application**: `http://localhost`
   * **Backend REST API**: `http://localhost/api/`
   * **Interactive API Documentation (Swagger)**: `http://localhost/api/docs/`

---

### Option B: Local Development Setup (Windows PowerShell)

For local development on Windows without Docker, use the included `start_servers.ps1` script:

1. **Prerequisites Setup**:
   * Install **Python 3.11+** and **Node.js 18+**.
   * Setup a Python virtual environment in `backend/venv`:
     ```powershell
     cd backend
     python -m venv venv
     .\venv\Scripts\activate
     pip install -r requirements.txt
     python manage.py migrate
     cd ..
     ```
   * Install Node dependencies in `frontend`:
     ```powershell
     cd frontend
     npm install
     cd ..
     ```

2. **Launch Development Servers**:
   Run the PowerShell starter script from the root directory:
   ```powershell
   .\start_servers.ps1
   ```

   This script automatically:
   * Cleans up stale processes on ports `8000` and `3000`.
   * Starts Django on `http://127.0.0.1:8000` in a dedicated terminal window.
   * Starts Next.js on `http://localhost:3000` in a dedicated terminal window.
   * Performs an automated backend health check.

---

## 📡 API & WebSocket Specification

### Core REST Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /api/health/` | GET | API Health Status Check |
| `POST /api/auth/token/` | POST | Obtain JWT Access & Refresh Tokens |
| `POST /api/auth/token/refresh/` | POST | Refresh JWT Access Token |
| `GET /api/users/me/` | GET | Fetch Current User Profile |
| `POST /api/sessions/` | POST | Initialize a New Interview Session |
| `GET /api/sessions/` | GET | List Candidate Interview Sessions |
| `GET /api/sessions/{id}/` | GET | Retrieve Specific Session Detail |
| `GET /api/reports/{session_id}/` | GET | Retrieve Evaluation Report & Scorecard |
| `GET /api/docs/` | GET | Swagger UI Interactive API Specs |

### WebSocket Event Protocol (`ws://localhost/ws/interview/{session_id}/`)

* **Client `user_ready`**: Triggers Alex's opening greeting and first question.
* **Client `user_spoke`**: Transmits user speech transcript (`{ type: 'user_spoke', transcript: '...' }`).
* **Client `face_reading`**: Sends MediaPipe metrics (`{ type: 'face_reading', metrics: { gaze, emotion, posture } }`).
* **Server `alex_speaking`**: Sends Alex's response text and viseme speech cues (`{ type: 'alex_speaking', text: '...', is_complete: false }`).
* **Client `end_session`**: Concludes interview and triggers Celery background evaluation pipeline.

---

## 🧪 Testing & Code Quality

### Running Backend Unit Tests
```bash
cd backend
.\venv\Scripts\python.exe manage.py test
```

### Running Frontend Linter
```bash
cd frontend
npm run lint
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a **Pull Request**.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
