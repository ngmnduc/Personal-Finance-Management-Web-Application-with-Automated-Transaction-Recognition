# Finman — Personal Finance Management Web Application with Automated Transaction Recognition

<div align="center">

![Finman Banner](https://img.shields.io/badge/Finman-Personal%20Finance-4F46E5?style=for-the-badge)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel)](#)
![PERN Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Postgres-61DAFB?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-Academic-blue?style=for-the-badge)

**A personal finance tracker — featuring automated receipt scanning via OCR & AI, budget alerts, saving goals, and real-time recurring transaction detection.**

[Live Demo](https://finmanfe.vercel.app/) 

</div>

---

## Overview

**Finman** is a comprehensive personal finance web application tailored for individuals tracking their expenses and small merchants managing bulk receipt scanning. It eliminates manual data entry by introducing a powerful, intelligent, and hybrid data ingestion pipeline that automatically extracts transaction details from bank transfer screenshots or PDFs.

### Why Finman?

| Problem | Finman's Solution |
| --- | --- |
| Manual expense logging | AI-powered dual-track processing parses screenshots/PDFs instantly |
| Forgetting recurring bills | Auto-detects patterns and suggests recurring rules |
| Overspending without realizing | Real-time monthly budget alerts |
| Fragmented tracking tools | Unified dashboard for wallets, goals, budgets, and history |
| Processing bulk receipts is slow | Batch receipt processing with centralized caching optimization |

---

## Key Features

### Automated Transaction Recognition (OCR)

* **Core Financial Extraction**: Automatically identifies and structures the three foundational pillars of any financial transaction—**Amount**, **Transaction Date**, and **Merchant/Recipient Context**. This core capability is shared across both processing streams to eliminate manual data entry errors and unify backend ingestion.
* **Flexible Document Ingestion**: Supports high-accuracy processing for both bank transfer screenshots (images) and digital PDF documents.
* **Smart Dual-Engine Pipeline**:
  * *Cloud Vision Stream*: Powered by advanced multimodal Large Language Models (including Google Gemini and Qwen VL). It utilizes a robust **multi-model backup network** to guarantee high availability, seamless structural failover, and deep semantic understanding of complex receipt layouts.
  * *Offline Local Stream*: Provides a completely air-gapped, zero-cost processing alternative driven by a local engine. It is optimized for data compliance, cost-sensitive environments, and baseline performance benchmarking.
  * *Direct PDF Path*: Optimizes native digital document reading via deterministic parsing to bypass unnecessary model processing overhead.
* **Cost & Efficiency Optimization**: Features an intelligent caching mechanism designed to eliminate duplicate transaction processing, protect external API token quotas, and optimize overall system responsiveness.
* **Context & Flow Validation**: Employs advanced semantic checks to correctly interpret financial layouts, custom typography, and language variations. This ensures perfect role-resolution between senders and receivers, preventing account reversal errors.
* **Enterprise Bulk Ingestion**: Enables rapid batch scanning capabilities tailored for small merchants to ingest and process multiple receipts concurrently with adaptive queue management.

### Wallet & Transaction Management

* Multi-wallet support (Cash, Bank, E-Wallet) with atomic balance recalculations.
* Full CRUD operations for manual transactions with rich categorization.
* Real-time synchronization of balances across all active sessions via WebSockets.

### Budgeting & Saving Goals

* Set Weekly/Monthly limits for categories with strict threshold alerts.
* Dedicated Saving Goals tracker with deposit/refund tracking.

### Smart Automations

* **Recurring Pattern Detection**: Analyzes past expenses to discover unlogged subscriptions (e.g., matching merchants every ~30 days).
* **Automated Processing**: Cronjobs automatically execute active recurring incomes and expenses.
* Real-time **Socket.io notifications** for budget breaches, new automation triggers, and recurring suggestions.

### Security & UX

* PWA (Progressive Web App) support for mobile-friendly native-like experience.
* JWT Authentication (Access + Refresh tokens).
* Strict Soft-Delete architecture across all entities.

---

## Tech Stack

### Backend (Node.js REST API)

| Technology | Purpose |
| --- | --- |
| **Node.js + Express.js** | Core API server & Business logic execution |
| **PostgreSQL (Supabase)** | Relational database storage |
| **Prisma ORM v5** | Type-safe database access |
| **Socket.io** | Real-time push notifications & connection polling |
| **Zod** | Request runtime validation |
| **node-cron** | Automation task scheduling |

### Frontend (React SPA + PWA)

| Technology | Purpose |
| --- | --- |
| **React + TypeScript (Vite)** | Core User Interface Framework |
| **Tailwind CSS + shadcn/ui** | Design system, styling, and accessible layout components |
| **Zustand** | Global client state management |
| **React Query** | Server state caching, asynchronous fetching, and synchronization |
| **React Hook Form + Zod** | Form handling and client-side input validation |
| **Recharts & TanStack Table** | Financial data visualization charts and responsive history grids |

### Microservice (OCR & AI Stack)

| Tool | Purpose |
| --- | --- |
| **Python FastAPI** | Dedicated high-performance parsing microservice |
| **Google Gemini Flash 2.0** | Primary cloud Vision LLM for text-to-JSON parsing |
| **Qwen 2.5 VL, Gemma, GPT-4o** | Several fallbacks for cloud Vision LLM for structured extraction |
| **EasyOCR & PyTorch** | Local, stateless text localization and character recognition for offline benchmarking |
| **pdfplumber** | Deterministic native digital PDF text extraction |
| **Jinja2 & WeasyPrint** | Dynamic HTML document templating and vector-grade PDF report exportation |

---

## System Architecture

```text
┌───────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                     │
│                React SPA + PWA (Vercel)                   │
│   Tailwind CSS · shadcn/ui · React Query · Zustand · Zod  │
└─────────────────────────┬─────────────────────────────────┘
                          │  REST (HTTP) + WebSocket
┌─────────────────────────▼─────────────────────────────────┐
│                   APPLICATION LAYER                       │
│             Node.js + Express.js Backend                  │
│   JWT Auth · Prisma ORM · Socket.io · node-cron tasks     │
└──────────┬────────────────────────────────────▲───────────┘
           │                                    │
           │ REST (JSON mutation)               │ HTTP POST (Multipart Image Bytes)
           │                                    │ Returns Structured Financial JSON
┌──────────▼──────────┐              ┌──────────┴──────────────────────┐
│    DATA LAYER       │              │       OCR MICROSERVICE          │
│ PostgreSQL (Supabase)│             │  Python FastAPI + Gemini/Qwen   │
│                     │              │  (Supports Local EasyOCR Mode)  │
└─────────────────────┘              └─────────────────────────────────┘
```

> **Architecture Note:** The Python FastAPI Microservice functions as a completely stateless compute layer. It does not connect directly to the database. Extracted data parameters are funneled exclusively back to the central Node.js backend to enforce strict multi-tenant isolation, data logging, and atomic wallet updates.

---

## Getting Started

### Prerequisites

* Node.js >= 18.x
* Python >= 3.10 (Tested and optimized for Python 3.14 on macOS Apple Silicon environments)
* PostgreSQL instance (Supabase recommended)
* Google Gemini API Key / Qwen DashScope API Key

### Local Benchmarking

The microservice provides an independent execution script to evaluate the local pipeline locally via the terminal workspace without starting the live web containers:

```bash
# Execute offline rule-based evaluation directly through the terminal shell
./ocr/venv/bin/python ocr/run_benchmark.py ocr/tests/samples/agri_ocr.jpg
```

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

