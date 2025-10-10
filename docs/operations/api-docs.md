# Public API Documentation Playbook

The public REST API is described in `public/api/public-openapi.yaml` and rendered at `/docs/public-api` using Redoc. This document explains how the spec is organised, how to keep it accurate, and how to validate changes before shipping.

---

## Quick Reference

| Endpoint | Description | Auth | Tag |
| --- | --- | --- | --- |
| `GET /api/health` | Service + database health probe | No | Health |
| `GET /api/account/profile` | Fetch the authenticated user's profile | Supabase session | Account |
| `PUT /api/account/profile` | Update Supabase profile metadata | Supabase session | Account |
| `POST /api/account/email/start-change` | Stage a new email address | Supabase session | Account |
| `POST /api/account/email/confirm` | Confirm staged email via token | Supabase session | Account |
| `POST /api/account/email/cancel` | Clear staged email change | Supabase session | Account |
| `POST /api/account/password/change` | Update password while logged in | Supabase session | Password |
| `POST /api/account/password/update` | Complete password reset flow | Supabase session | Password |
| `POST /api/account/password/request-reset` | Send password reset email | No | Password |
| `GET /api/user/workspaces` | List workspaces the user can access | Supabase session | Workspaces |
| `POST /api/invites/accept` | Redeem an invite code (rate limited) | Supabase session | Invites |

> **Supabase session**: requests must include the `sb-access-token` and `sb-refresh-token` cookies issued after signing into the Changemaker app.

---

## Spec Structure (OpenAPI 3.1)

- **Info block**: records the public API version, integration guidance, and support contact (`support@changemaker.im`).
- **Servers**: production, preview, and local base URLs so Redoc generates ready-to-copy example requests.
- **Security schemes**: `SupabaseSession` advertises the cookie-based auth model to consumers.
- **Reusable schemas**:
  - `SuccessResponse`, `ErrorResponse`, and specialised request payloads (profile, email change, password flows).
  - `WorkspaceSummary` / `WorkspaceMembershipSummary` used by invite redemption and workspace discovery.
  - Detailed examples inline with every response to make the docs self-explanatory.
- **Paths**: each operation defines an `operationId`, rich description, and full set of error scenarios (including 429 with retry hints for invites).

---

## Previewing the Docs

1. Start the dev server: `pnpm dev`.
2. Open [http://localhost:3000/docs/public-api](http://localhost:3000/docs/public-api).
3. Redoc should render instantly; if you see an empty canvas or an error banner, inspect the browser console for YAML parsing issues.

The same page is available on preview and production at `/docs/public-api`. Use those environments to confirm the CDN-hosted Redoc bundle loads correctly for external consumers.

---

## Editing Workflow

1. Update `public/api/public-openapi.yaml`. Keep descriptions narrative: call out rate limits, authentication requirements, and business rules.
2. Reuse existing schemas when possible. If you introduce a new object:
   - Define it under `components.schemas`.
   - Reference it from every operation that returns it.
   - Add an example payload so generated docs stay readable.
3. Bump the `info.version` when the API surface changes (new endpoints, new parameters, or breaking changes).
4. Preview `/docs/public-api` locally to smoke test Redoc.
5. Commit the spec alongside the backend change and include the spec file in code reviews so reviewers see the contract update.

---

## Validation & Tooling

Use Redocly's CLI (installed on demand) to lint the spec:

```bash
pnpm dlx @redocly/cli@latest lint public/api/public-openapi.yaml
```

Linting catches missing schemas, orphaned refs, and typos in examples before they reach production.

---

## Example Requests

```bash
# Fetch profile (requires browser cookies with valid Supabase session)
curl -b "sb-access-token=<token>; sb-refresh-token=<token>" \
  https://changemaker.im/api/account/profile

# Redeem an invite (must be authenticated)
curl -X POST \
  -H "Content-Type: application/json" \
  -b "sb-access-token=<token>; sb-refresh-token=<token>" \
  -d '{ "code": "CMKR-8QF7-AB21" }' \
  https://changemaker.im/api/invites/accept
```

Include `Retry-After` handling in clients responding to `RATE_LIMITED` errors. The error body also exposes `retryAfter` in milliseconds.

---

## Deploy Checklist

- [ ] Spec updated (`public/api/public-openapi.yaml`) and version bumped if necessary.
- [ ] `/docs/public-api` renders locally without console errors.
- [ ] Redocly lint passes.
- [ ] README section referencing the docs remains accurate.
- [ ] Any new or changed endpoint has backend tests (unit/integration) covering the adjusted behaviour.

---

## Troubleshooting

- **Redoc canvas is blank** → The YAML most likely contains invalid syntax. Run the Redocly lint command and check browser console errors.
- **Outdated responses** → The spec is the source of truth; keep it in the same PR as your API change to avoid drift. The docs page pulls the version from `/public/api/public-openapi.yaml` at request time.
- **CDN blocked** → The viewer script loads from `https://cdn.jsdelivr.net/npm/redoc@next`. For air-gapped environments, vendor a copy into `public/vendor/redoc/` and update `components/docs/redoc-viewer.tsx` to reference it.

---

Need deeper details for a new endpoint? Mirror the patterns above: describe the business rule, enumerate every error, and include concrete JSON examples so integrators never have to guess.
