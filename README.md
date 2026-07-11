<h1 align="center">🗺️ Roadtripeado — Backend API</h1>

<p align="center">
  <strong>A production-ready, modular Node.js + TypeScript backend for the Roadtripeado travel platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Stripe-Payment-008CDD?style=for-the-badge&logo=stripe&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS-S3-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture & Project Structure](#-architecture--project-structure)
- [API Routes](#-api-routes)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Deployment](#-deployment)
- [Integration Guides](#-integration-guides)
- [User Roles](#-user-roles)
- [License](#-license)

---

## 🌍 Overview

**Roadtripeado** is a full-featured travel discovery and community platform. This repository contains the **backend REST API** that powers the platform, handling everything from user authentication and geo-located places, to real-time chat, Stripe-powered subscriptions, business management, push notifications, and an award/gamification system.

The API follows a clean, **domain-driven modular architecture** where each feature lives in its own isolated module under `src/modules/`.

**Base URL:** `https://roadtripeado.shop/api/v1`  
**Health Check:** `GET /api/v1/status`  
**Privacy Policy:** `GET /privacy-policy`

---

## ✨ Key Features

### 🔐 Authentication & Authorization
- JWT-based authentication with **Access Token** and **Refresh Token** rotation
- **OTP-based account verification** and password reset flow
- **Social Sign-In**: Google OAuth2 and Facebook via Passport.js
- Custom social login endpoint (mobile-friendly)
- Secure password change and account deletion
- **Role-Based Access Control (RBAC)** with 4 roles: `USER`, `ADMIN`, `SUPER_ADMIN`, `MAP_EDITOR`
- Token blocklist-based **logout** support

### 👤 User Management
- Full user profile CRUD (with avatar upload to S3)
- User interest/preference tagging system
- Admin-controlled **user invitation system** with email invite
- Admin-controlled **role upgrades** (e.g., promoting a user to `MAP_EDITOR`)
- Toggle favorite maps and offers per user
- User status management (ban/unban) by admins

### 🗺️ Places & Maps
- Full CRUD for **geo-located Places** with GeoJSON `Point` coordinates (longitude, latitude)
- Place types: `Business` or `Regular`
- Rich place metadata: accessibility features, entry cost, difficulty level, hike time, atmosphere, recommendations, schedules, and services
- Place **media gallery** (images/videos via AWS S3)
- Built-in **open count tracking** and **rating** aggregation
- Map-based place grouping and `.kml` geographic data integration

### 🏢 Business Module
- User-submitted **business listings** with pending approval workflow
- Multi-file upload support for business images (disk storage)
- Admin `PATCH /:id/status` endpoint to **approve or reject** businesses
- Business **view count tracking** (`POST /:id/view`)
- Per-business stats (`GET /:id/stats`)
- My Business dashboard (`GET /my-business`)

### 🏷️ Offers & Categories
- Full CRUD for **Offers** linked to businesses or maps
- User-level favorite offer toggling
- **Category taxonomy** for classifying places (full CRUD by admins)

### 💳 Subscriptions (Stripe)
- Full **Stripe Subscription** lifecycle management: create, update, cancel, pause, resume, reactivate
- **Checkout Sessions** and **Billing Portal** for web-based subscription management
- **Payment Intents** and **Ephemeral Keys** for Flutter/mobile Stripe integration
- Subscription plan seeding on server startup
- **Trial eligibility** checking per user
- Subscription **usage tracking** and warnings
- Admin analytics: `GET /admin/analytics`
- **Stripe Webhook** handlers for both subscriptions and one-time payments
- Automated subscription **Cron Jobs** (daily expiration checks, renewal reminders)

### 💰 Payments
- Stripe one-time **Checkout Session** creation
- Session **verification** after redirect
- Payment history per user (`GET /my-payments`)
- Invoice **PDF generation** (`GET /:id/invoice`)
- Admin-level **payment refund** (`POST /:id/refund`)
- Webhook for real-time Stripe payment events

### 💬 Real-time Chat & Messaging
- **Socket.IO**-powered real-time messaging
- Chat rooms with persistent message history in MongoDB
- Online user presence tracking (`Map<userId, socketId>`)
- Message and chat history retrieval REST endpoints

### 🔔 Notifications
- **Firebase Cloud Messaging (FCM)** for mobile push notifications
- Email notifications via **Resend** and **Nodemailer** (SMTP)
- SMS notifications via **Twilio**
- Notification persistence in MongoDB with read/unread status

### 🎖️ Award & Gamification System
- Progress-tracked award system with `locked`/`unlocked` states
- Award types: `PDF Itinerary`, `Free Map`, and more
- Redeemable `Free Map` award with backend validation
- Frontend API: `GET /awards/my-awards`, `POST /awards/redeem`

### ⭐ Reviews & Ratings
- User review creation and listing for places
- Rating aggregation back to place records

### ❤️ Favourites
- Separate favorites module for managing saved places

### 📊 Stats & Analytics
- Platform-level statistics endpoint for the admin dashboard
- Business-level view and engagement stats

### 🆘 Support System
- User-submitted support tickets

### 📁 File Uploads
- Unified upload module with **AWS S3** integration
- Image optimization via **Sharp**
- Video metadata via **fluent-ffmpeg**
- Pre-signed S3 URLs for secure direct-to-S3 uploads
- Local static file serving for `/uploads`, `/images`, `/media`, `/documents`

### 🛠️ Developer Experience
- **Zod** schema validation on every request (via `validateRequest` middleware)
- **Morgan** HTTP request logging in development
- **Winston** + `winston-daily-rotate-file` for production-grade structured logging
- **Global error handler** middleware with centralized `ApiError` class
- Graceful shutdown on `SIGTERM`
- Uncaught exception and unhandled rejection handling

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Runtime** | Node.js 18+ |
| **Language** | TypeScript 5.x |
| **Framework** | Express.js 4.x |
| **Database** | MongoDB (Mongoose ODM) |
| **Real-time** | Socket.IO 4.x |
| **Task Queue** | BullMQ + Redis (ioredis) |
| **Cloud Storage** | AWS S3 (`@aws-sdk/client-s3`) |
| **Image Processing** | Sharp |
| **Video** | fluent-ffmpeg |
| **Payments** | Stripe (Subscriptions + One-Time) |
| **Push Notifications** | Firebase Admin SDK (FCM) |
| **Email** | Resend, Nodemailer (SMTP) |
| **SMS** | Twilio |
| **Video Calls** | Agora (token generation) |
| **AI Integration** | OpenAI API |
| **Social Auth** | Passport.js (Google, Facebook OAuth) |
| **Validation** | Zod |
| **Logging** | Winston + Daily Rotate |
| **HTTP Logging** | Morgan |
| **Job Scheduling** | node-cron, BullMQ workers |
| **Session** | express-session |
| **Code Quality** | ESLint, Prettier, Husky |
| **Deployment** | Vercel (`@vercel/node`) |

---

## 🏗️ Architecture & Project Structure

```
giovafilm-roadtripeado/
├── src/
│   ├── server.ts               # Entry point: HTTP server + Socket.IO bootstrap
│   ├── app.ts                  # Express app: middleware, routes, error handlers
│   │
│   ├── config/
│   │   └── index.ts            # All env vars, unified config object
│   │
│   ├── routes/
│   │   └── index.ts            # Unified router (all 20 modules registered here)
│   │
│   ├── modules/                # Domain-driven feature modules

│   │
│   ├── middleware/

│   │
│   ├── helpers/

│   │
│   ├── builder/                # Custom Mongoose query builder (filter, sort, paginate)
│   ├── enum/                   # System enums (USER_ROLES, statuses, etc.)
│   ├── errors/                 # ApiError class and error factory helpers
│   ├── interfaces/             # Shared TypeScript interfaces
│   ├── shared/                 # Shared services (e.g., sendResponse utility)
│   ├── task/                   # Background cron jobs and BullMQ workers
│   ├── utils/                  # One-off utility scripts (geocoding, etc.)
│   └── privacy-policy.html     # Static privacy policy page
│
├── uploads/                    # Local file storage (development)
├── dist/                       # Compiled JavaScript output (production)
├── .env.example                # Environment variable template
├── vercel.json                 # Vercel deployment config
├── tsconfig.json               # TypeScript compiler config
├── eslint.config.mjs           # ESLint config
├── .prettierrc                 # Prettier config
└── .husky/                     # Git hooks (pre-commit linting)
```

---


## ⚙️ Prerequisites

Ensure the following are installed and available before running the project:

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **MongoDB** — [Atlas](https://www.mongodb.com/cloud/atlas) or local installation
- **Redis** — Required for BullMQ background queues — [Download](https://redis.io/)
- **AWS Account** — For S3 file storage
- **Stripe Account** — For payment and subscription management
- **Firebase Project** — For push notifications (FCM)
- **Twilio Account** — For SMS notifications
- **Resend Account** (or SMTP server) — For transactional emails
- **Agora Account** *(optional)* — For video call token generation
- **OpenAI API Key** *(optional)* — For AI-powered features

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd giovafilm-roadtripeado
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in all required values. See the [Environment Variables](#-environment-variables) section below.

### 4. Start the development server

```bash
npm run start
```

The server starts on `http://localhost:5000` with hot-reloading via `ts-node-dev`.

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure all variables:

```env
   encrypted 
```

---

## 📜 Available Scripts

Run scripts with `npm run <script>` or `yarn <script>`:

| Script | Description |
|---|---|
| `start` | Starts the development server with `ts-node-dev` (hot-reloading on `src/server.ts`) |
| `build` | Compiles TypeScript to JavaScript in the `dist/` folder |
| `start:prod` | Runs the compiled production build (`node dist/server.js`) |
| `lint:check` | Runs ESLint on the entire codebase without fixing |
| `lint:fix` | Runs ESLint and automatically fixes fixable issues |
| `prettier:check` | Checks code formatting against Prettier rules |
| `prettier:fix` | Formats all files with Prettier |
| `lint-prettier` | Runs both `lint:check` and `prettier:check` together |

---

## 🚢 Deployment

The project is configured for deployment on **Vercel** using `@vercel/node`:

```json
// vercel.json
{
  "version": 2,
  "builds": [{ "src": "dist/server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "dist/server.js" }]
}
```

**Deployment steps:**

```bash
# 1. Build the project
npm run build

# 2. Deploy to Vercel
vercel --prod
```

> **Important:** Make sure all environment variables are configured in your Vercel project settings before deploying.

---


## 👥 User Roles

The system has 4 distinct roles enforced via JWT and the `auth()` middleware:

| Role | Access Level |
|---|---|
| `USER` | Standard authenticated user (can access personal data, subscriptions, chat, etc.) |
| `ADMIN` | Platform administrator (can manage users, places, businesses, view all data) |
| `SUPER_ADMIN` | Full platform access including billing, refunds, system-level operations |
| `MAP_EDITOR` | Specialized role for managing map-related content only |

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">Built with ❤️ by <strong>Mohosin</strong> for the Roadtripeado platform</p>
