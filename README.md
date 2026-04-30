# Z: The Open Video & Music Downloader

Z is a modern, privacy-focused web app for downloading and managing videos and music from YouTube and other platforms. It features a fast, user-friendly interface, robust authentication, and a secure backend for handling downloads. Z is designed for self-hosting or deployment on Vercel, with a flexible API that can run standalone or integrated with the Next.js frontend.

## Features

- Download YouTube videos and music with high reliability
- Support for age-gated and signed-in-only content (with cookies)
- Clean, mobile-friendly UI built with Next.js and Tailwind CSS
- Secure authentication (NextAuth, social logins)
- Download history, saved videos, and user profiles
- Multi-language support (i18n)
- Standalone API server for heavy download tasks
- Easy deployment to Vercel or self-hosted environments

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, Radix UI, shadcn/ui
- **Backend/API:** Node.js, TypeScript, yt-dlp, custom download server
- **Authentication:** NextAuth.js (OAuth, social logins)
- **Database:** Supabase (for saved videos, download limits)
- **Other:** Docker, ESLint, pnpm, Vercel

---
