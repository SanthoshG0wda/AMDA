# 🚀 AMDA - Autonomous Maintenance Decision Agent

**Team TechBeasts** presents the **Autonomous Maintenance Decision Agent**, a real-time predictive maintenance platform powered by ML and real-time sensor simulation.

---

## ⚡ Quick Start

### One-Command Startup (All Services)

```bash
# Option 1: Bash Script
bash start.sh

# Option 2: Make
make start

# Option 3: Docker Compose
docker-compose up -d
```

This starts:
- 🔧 **Backend**: Flask API on http://localhost:5000
- 📡 **Simulator**: Sensor data on http://localhost:3000  
- 🎨 **Frontend**: React app on http://localhost:5173

**Full details**: See [QUICK_START.md](QUICK_START.md)

---

## 📖 Full Setup

### Individual Services

```bash
# Terminal 1: Backend
python server.py

# Terminal 2: Simulator
cd simulator && npm install && npm start

# Terminal 3: Frontend
cd frontend && npm install && npm run dev
```

### Requirements
- Python 3.12+ (Backend)
- Node.js 18+ (Frontend & Simulator)
- MongoDB (optional, for persistence)
- Kafka (optional, for message streaming)

---

## 🎯 System Architecture

```
📡 Simulator (Node.js)
     ↓ [Sensor data]
🔧 Backend (Flask + ML)
     ↓ [Predictions & Alerts]
🗄️  MongoDB + Kafka
     ↓ [Real-time events]
🎨 Frontend (React)
```

---

## ✨ Key Features

- ✅ **4 ML Models**: CNC, Pump, Conveyor predictions
- ✅ **Real-time**: Socket.IO bidirectional updates
- ✅ **LLM Powered**: Ollama for autonomous reasoning
- ✅ **Alerts**: Email notifications for failures
- ✅ **Production Ready**: Tested, containerized, scalable

---

## 📊 Checkpoints

- ✅ **CP1**: Foundation - Datasets & models (100%)
- ✅ **CP2**: Model completion - All 4 models (100%)
- ✅ **CP3**: Integration - Backend + Frontend (100%)
- ✅ **CP4**: Stabilization - Production-ready (85-90%)

---

## 📚 Documentation

- [QUICK_START.md](QUICK_START.md) - Startup guide
- [documentation.md](documentation.md) - API & architecture
- [AMDA_README.md](AMDA_README.md) - Project overview
- [progress.md](progress.md) - Development checkpoints

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Flask, Socket.IO, Python 3.12 |
| **ML** | Scikit-learn (Random Forest), Joblib |
| **Database** | MongoDB |
| **Messaging** | Kafka |
| **LLM** | Ollama |
| **Frontend** | React 19, Vite, Tailwind CSS |
| **Simulator** | Node.js/Express |

---

## 🤝 Contributing

Team TechBeasts members:
- Machine Learning: Model training & evaluation
- Backend: API & integration
- Frontend: UI/UX & real-time updates
- DevOps: Deployment & infrastructure

---

**Let's build the future of predictive maintenance! 🚀**
