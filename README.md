# PMS - Project Management System

A collaborative project management system built for managing School ERP development projects.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel

## User Roles

1. **Project Manager** - Manage and oversee projects
2. **Developer** - Build and implement features
3. **Tester** - QC and testing
4. **Consultant** - Advise and refine modules

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

The Supabase credentials are already configured in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://loihxoyrutbzmqscdknk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migration

Go to your Supabase project:
1. Open the SQL Editor
2. Copy and paste the contents of `supabase-migration.sql`
3. Run the migration

This will create:
- `user_profiles` table with RBAC
- `projects` table
- `tasks` table
- `comments` table
- `project_members` table
- All necessary triggers and Row Level Security policies

### 4. Set Your Role as Project Manager

After signing up, run this SQL in Supabase to set your role:

```sql
UPDATE user_profiles SET role = 'project_manager' WHERE email = 'piush008@gmail.com';
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Features

### Current Features (MVP)
- User authentication (Sign up/Sign in)
- Role-based access control (RBAC)
- Dashboard with user profile
- Project overview
- Task management foundation

### Planned Features
- Create and manage projects
- Create and assign tasks
- Task comments and discussions
- Real-time collaboration
- File attachments
- Progress tracking and reporting
- Notifications
- Activity timeline

## Project Structure

```
pms/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   └── auth/callback/   # Auth callback handler
│   ├── dashboard/           # Dashboard page
│   ├── login/               # Login/signup page
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # React components (future)
├── lib/                     # Utility libraries
│   └── supabase.ts         # Supabase client & types
├── utils/                   # Helper functions (future)
├── supabase-migration.sql  # Database schema
├── .env.local              # Environment variables
└── README.md               # This file
```

## Database Schema

### user_profiles
- User information with role assignment
- Roles: project_manager, developer, tester, consultant

### projects
- Project details and status tracking
- Status: planning, in_progress, review, completed

### tasks
- Task management with assignments
- Status: todo, in_progress, review, done
- Priority: low, medium, high, critical

### comments
- Discussion threads on tasks

### project_members
- Track team members assigned to projects

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Add environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Team

- **Project Manager**: Piush (piush008@gmail.com)
- **Developer**: TBD
- **Tester**: TBD
- **Consultant**: TBD

## License

ISC
