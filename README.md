# Finman — Personal Finance Management Web Application with Automated Transaction Recognition

<div align="center">

![Finman Banner](https://img.shields.io/badge/Finman-Personal%20Finance-4F46E5?style=for-the-badge)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel)](#)
![PERN Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Postgres-61DAFB?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-Academic-blue?style=for-the-badge)

**A personal finance tracker — featuring automated receipt scanning via OCR & AI, budget alerts, saving goals, and real-time recurring transaction detection.**

[Live Demo](https://finmanfe.vercel.app/) *(Link coming soon)*

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Author](#-author)

---

## Overview

**Finman** is a comprehensive personal finance web application tailored for individuals tracking their expenses and small merchants managing bulk receipt scanning. It eliminates manual data entry by introducing a powerful, intelligent OCR pipeline that automatically extracts transaction details from bank transfer screenshots or PDFs.

> 🔗 **Live Application:** *(Vercel deployment link coming soon)*

### Why Finman?

| Problem | Finman's Solution |
|---|---|
| Manual, tedious expense logging | AI-powered OCR (Gemini/Qwen) parses screenshots/PDFs instantly |
| Forgetting recurring bills | Auto-detects patterns and suggests recurring rules |
| Overspending without realizing | Real-time monthly budget alerts |
| Fragmented tracking tools | Unified dashboard for wallets, goals, budgets, and history |
| Processing bulk receipts is slow | Sequential bulk OCR scanning with caching and retry logic |

---

## Key Features

### Automated Transaction Recognition (OCR)
- Upload bank transfer screenshots (images) or PDFs.
- **Smart Extraction Pipeline**: Bypasses LLM for PDFs (using `pdfplumber`); uses Google Gemini Flash 2.0 (fallback to Qwen 2.5 VL via OpenRouter) for images.
- Cache-backed architecture (MD5 hashing) to save API limits and speed up duplicate scans.
- Bulk processing mode for merchants handling multiple receipts.

### Wallet & Transaction Management
- Multi-wallet support (Cash, Bank, E-Wallet) with atomic balance recalculations.
- Full CRUD operations for manual transactions with rich categorization.
- Real-time synchronization of balances across all active sessions via WebSockets.

### Budgeting & Saving Goals
- Set Weekly/Monthly limits for categories with strict threshold alerts.
- Dedicated Saving Goals tracker with deposit/refund tracking.

### Smart Automations
- **Recurring Pattern Detection**: Analyzes past expenses to discover unlogged subscriptions (e.g., matching merchants every ~30 days).
- **Automated Processing**: Cronjobs automatically execute active recurring incomes and expenses.
- Real-time **Socket.io notifications** for budget breaches, new automation triggers, and recurring suggestions.

### Security & UX
- PWA (Progressive Web App) support for mobile-friendly native-like experience.
- JWT Authentication (Access + Refresh tokens).
- Strict Soft-Delete architecture across all entities.

---

## Tech Stack

### Backend (Node.js REST API)
| Technology | Purpose |
|---|---|
| **Node.js + Express.js** | Core API server |
| **PostgreSQL (Supabase)** | Relational database |
| **Prisma ORM v5** | Type-safe database access |
| **Socket.io** | Real-time push notifications |
| **Zod** | Request validation |
| **node-cron** | Automation task scheduling |

### Frontend (React SPA + PWA)
| Technology | Purpose |
|---|---|
| **React + TypeScript (Vite)** | UI Framework |
| **Tailwind CSS + shadcn/ui** | Styling and components |
| **Zustand** | Global state management |
| **React Query** | Server state caching and fetching |
| **React Hook Form + Zod** | Form handling and validation |
| **Recharts & TanStack Table** | Data visualization and history grids |

### Microservice (OCR & AI)
| Tool | Purpose |
|---|---|
| **Python FastAPI** | Dedicated high-performance microservice |
| **Google Gemini Flash 2.0** | Primary Vision LLM for OCR extraction |
| **pdfplumber** | Deterministic PDF text extraction |
| **spaCy** | NLP and regex rule-based processing |

---

## System Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                      │
│                React SPA + PWA (Vercel)                    │
│   Tailwind CSS · shadcn/ui · React Query · Zustand · Zod   │
└─────────────────────────┬─────────────────────────────────┘
                          │  REST (HTTP) + WebSocket
┌─────────────────────────▼─────────────────────────────────┐
│                   APPLICATION LAYER                        │
│             Node.js + Express.js Backend                   │
│   JWT Auth · Prisma ORM · Socket.io · node-cron tasks      │
└──────────┬─────────────────────────┬──────────────────────┘
           │                         │
┌──────────▼──────────┐   ┌──────────▼──────────────────────┐
│    DATA LAYER       │   │       OCR MICROSERVICE           │
│ PostgreSQL (Supabase)│◄──┤  Python FastAPI + Gemini/Qwen   │
└─────────────────────┘   └──────────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- Node.js >= 18.x
- Python >= 3.10 (for OCR microservice)
- PostgreSQL instance (Supabase recommended)
- Google Gemini API Key (or OpenRouter API Key)

### Installation

**1. Clone the repository**
```bash
git clone <your-repo-url>
cd finman
```

**2. Install Backend dependencies**
```bash
cd be
npm install
npm run prisma:generate
```

**3. Install Frontend dependencies**
```bash
cd ../fe
npm install
```

**4. Setup OCR Python Microservice**
```bash
cd ../ocr
python -m venv venv
# Activate venv: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
pip install -r requirements.txt
```

**5. Configure environment variables** (see below), then start all servers:

```bash
# Backend (Terminal 1)
cd be && npm run dev

# Frontend (Terminal 2)
cd fe && npm run dev

# OCR Service (Terminal 3)
cd ocr && uvicorn app.main:app --reload --port 8000
```

---

## Environment Variables

### Backend (`/be/.env`)
```env
PORT=3000
DATABASE_URL=postgresql://postgres:...
DIRECT_URL=postgresql://postgres:...
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
OCR_SERVICE_URL=http://localhost:8000
```

### Frontend (`/fe/.env`)
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

### OCR Service (`/ocr/.env`)
```env
GEMINI_API_KEY=your_gemini_key
OPENROUTER_API_KEY=your_openrouter_key
```

---

## Author

**Nguyễn Minh Đức - 23bi14102**  

