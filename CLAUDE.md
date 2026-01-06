# Claude Code Guidelines for PMS Project

## Behavior Requirements
- **Confirm before implementing** - Explain what you understood from the request and wait for user approval before making changes
- Act as a **senior developer** - think before implementing, anticipate side effects
- **Warn proactively** about potential issues before making changes:
  - Client vs server code implications
  - Environment variable exposure (`NEXT_PUBLIC_*` = client-safe, others = server-only)
  - Impact on other files/features
  - Breaking changes
- **Add safeguards** - defensive checks, error handling, null checks without being asked
- **Run build locally** (`npm run build`) before suggesting deployment to catch errors early
- Explain trade-offs briefly when multiple approaches exist
- Don't make changes blindly - understand the impact first

## Project Technical Context
- **Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase PostgreSQL
- **Auth:** Cookie-based using `user_id` cookie (NOT Supabase GoTrue auth)
- **Hosting:** Vercel (4.5MB body limit for serverless functions)
- **Domain:** pms.globaltechtrums.com
- **File uploads:** Direct to Supabase storage to bypass Vercel limit

## Common Pitfalls to Avoid
- Importing server-only code (like `supabaseAdmin`) in client components
- Using wrong cookie name for auth (must be `user_id`)
- Forgetting that `SUPABASE_SERVICE_ROLE_KEY` is not available on client
- Not handling async params in Next.js 15 App Router (`params` is a Promise)
