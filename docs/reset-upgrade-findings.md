# Frontend Reset + Next.js Upgrade + Database Migration Findings

## Current State Snapshot

- The app has already been moved to **Next.js 16 + React 19 + Prisma 7**.
- A visual homepage reset exists, but much of it is still static placeholder content.
- Authentication still uses **NextAuth + Prisma adapter** and depends on a reliable Postgres connection.
- Prisma runtime code was optimized for Neon-specific pooling assumptions, which can introduce fragility.

## High-Impact Issues Found

1. **Build instability in restricted or CI environments**
   - `next/font/google` in `app/layout.tsx` fetches Google Fonts at build time.
   - If external font fetch fails, build fails.

2. **Database connection configuration mismatch**
   - Prisma schema lacked explicit `url` and `directUrl` declarations.
   - Runtime DB client was tightly coupled to `@prisma/adapter-pg` pool logic intended for Neon workflows.

3. **Homepage data is mostly static**
   - Hero metrics and pricing plans were hardcoded and not driven from database content.

4. **Seed mismatch with enum values**
   - `prisma/seed-plans.ts` used plan tiers (`pro`, `elite`) that do not align with the current schema enum (`professional`, `founder`).

## What Was Changed In This Iteration

- Moved Prisma runtime usage to a stable singleton `PrismaClient` config suitable for Supabase Postgres URLs.
- Updated Prisma datasource configuration for both pooled and direct connection URLs.
- Removed build-time dependency on Google Fonts fetch to prevent build breakages.
- Made homepage stats and pricing preview dynamic from database, with safe fallbacks if DB is unavailable.
- Corrected seed plan tier values to match current schema enum values.

## Recommended Next Execution Plan

1. **Supabase migration completion**
   - Create Supabase project and obtain:
     - `DATABASE_URL` (pooled/transaction mode)
     - `DIRECT_URL` (direct session mode for migrations)
   - Run `prisma migrate deploy` and `npm run db:seed`.

2. **Authentication hardening pass**
   - Validate credential and OAuth sign-in against Supabase in staging.
   - Add a focused test matrix for sign-up/sign-in/session refresh.

3. **Frontend reset phase 2**
   - Replace remaining static sections/pages with CMS or DB-backed content.
   - Add admin controls for homepage copy, platform signals, testimonials, and pricing messaging.

4. **Build and deploy hardening**
   - Add CI checks for lint, typecheck, and build with production env simulation.
   - Add a fallback/guard for optional integrations (PayPal, Cloudinary, Redis) when not configured.
