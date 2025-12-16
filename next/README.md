# Order Management System - Next.js Version

A modern, full-stack order management application built with **Next.js 15**, **TypeScript**, and **Material-UI v6**. This is a Next.js equivalent of the React/Vite version of the Order Management System.

## 🎯 Overview

This Next.js version provides the same functionality as the original React app but with:
- ✅ Server-Side Rendering (SSR) and Static Site Generation (SSG)
- ✅ Next.js App Router architecture
- ✅ Improved SEO and performance
- ✅ Built-in API routes
- ✅ Optimized image loading
- ✅ Better production builds

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ 
- A running backend server (see `../backend` folder)
- Google OAuth credentials
- Environment variables configured

### Installation

```bash
# Navigate to the next folder
cd next

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
next/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── dashboard/           # Dashboard page
│   ├── login/               # Login page
│   └── layout.tsx           # Root layout
├── components/              # React components
├── lib/                     # Shared libraries
│   ├── api/                # API client
│   ├── utils/              # Utility functions
│   ├── auth.ts             # NextAuth configuration
│   └── theme.ts            # Material-UI theme
├── types/                   # TypeScript type definitions
└── constants/               # Application constants
```

## 🎨 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI) v6
- **Authentication**: NextAuth.js with Google OAuth
- **State Management**: React Context + TanStack Query
- **Analytics**: Vercel Analytics & Speed Insights

## 📄 License

ISC

---

**Note**: This is a Next.js port of the original React/Vite application. Both versions connect to the same backend API.
