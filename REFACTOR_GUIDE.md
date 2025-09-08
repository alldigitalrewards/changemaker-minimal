# Changemaker Refactor Guide (Minimal MVP)

Focus on core: Path-based workspaces, Supabase/Prisma, simple roles. No subdomains, no Redis.

1. **Setup**: pnpm install; set .env with Supabase vars; pnpm prisma db push.
2. **Schema**: Use 4-model Prisma (User, Workspace, Challenge, Enrollment).
3. **Auth/Middleware**: Simple Supabase login/signup; path extraction in middleware.ts.
4. **Routes**: Nest under /w/[slug] (e.g., /w/[slug]/admin/dashboard).
5. **Integrate Pages**: Strip bloat from old repo, adapt to paths.
6. **Test**: pnpm dev/build; verify flows.
