# Stage A Discovery UI with User Authentication Card

feature: Stage A Discovery UI with User Authentication
branch: 003-discovery-ui-auth
created: 2025-12-29
spec: specs/003-discovery-ui-auth/spec.md

## golden_path

goal: new developer reaches working state within 15 min

prerequisites:
- Node.js 18+
- npm
- Supabase project (https://supabase.com/dashboard)
- Google Cloud Console OAuth credentials (https://console.cloud.google.com/apis/credentials)

steps:
1. Clone and install:
   ```bash
   cd frontend && npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials:
   # - NEXT_PUBLIC_SUPABASE_URL
   # - SUPABASE_SERVICE_ROLE_KEY
   # - JWT_SECRET_KEY (openssl rand -base64 32)
   # - NEXT_PUBLIC_GOOGLE_CLIENT_ID
   ```
3. Set up database (run in Supabase SQL editor):
   ```sql
   -- See supabase/migrations/ for schema
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

success_check:
- `curl http://localhost:3000` returns 200
- Navigate to http://localhost:3000 and see problem cards
- Click "Sign in with Google" and complete OAuth flow
- After auth, click a problem card and proceed to Stage B

## recipes

### add-auth-api-endpoint
when: Adding new authentication-related API endpoint
steps:
1. Create route file in `frontend/src/app/api/auth/{endpoint}/route.ts`
2. Import Supabase client from `@/lib/supabase`
3. Import JWT functions from `@/lib/jwt`
4. Import auth helpers from `@/lib/auth-middleware`
5. Add `export const dynamic = 'force-dynamic'` at top
6. Implement POST/GET handler with proper error handling
verify: `curl -X POST http://localhost:3000/api/auth/{endpoint}`

### add-protected-api-route
when: Creating API route that requires authentication
steps:
1. Create route file in `frontend/src/app/api/{path}/route.ts`
2. Import `requireAuth` from `@/lib/auth-middleware`
3. Call `const user = await requireAuth()` at start of handler
4. Use `user.id` for user-specific operations
5. Wrap with try/catch using `handleAuthError`
verify: `curl -X GET http://localhost:3000/api/{path} -H "Cookie: access_token=..."`

### add-discovery-component
when: Adding new UI component to discovery page
steps:
1. Create component in `frontend/src/components/discovery/{ComponentName}.tsx`
2. Add `'use client'` directive at top
3. Import and use types from `@/types/problem`
4. Export component with proper TypeScript props interface
5. Import in page.tsx or parent component
verify: Component renders without errors on http://localhost:3000

### add-auth-context-method
when: Adding new auth functionality to AuthContext
steps:
1. Add method signature to `AuthContextType` interface in `auth-context.tsx`
2. Implement method in `AuthProvider` component
3. Add to value object in Provider return
4. Add corresponding API function in `@/lib/api.ts` if needed
verify: Call method from component using `useAuth()` hook

### add-database-table
when: Adding new Supabase table for the feature
steps:
1. Create migration file in `supabase/migrations/`
2. Add TypeScript interface in `@/lib/supabase.ts`
3. Use `supabaseAdmin.from('table_name')` in API routes
4. Add RLS policies if needed
verify: `SELECT * FROM table_name LIMIT 1;` in Supabase SQL editor

## decisions

### next-js-app-router
context: Needed to choose frontend routing and rendering approach
decision: Next.js 14 App Router with 'use client' for interactive components
alternatives:
- Pages Router: Older pattern, less optimal for server components
- Pure React SPA: No SSR benefits, worse SEO for discovery page
consequences: Better initial load, server components for static parts, client components for interactivity
revisit_when: React Server Components patterns significantly change or bundle size exceeds 500KB

### supabase-backend
context: Needed database and auth infrastructure for MVP
decision: Supabase as unified backend (PostgreSQL + Auth + Storage)
alternatives:
- Separate PostgreSQL + custom auth: More setup, more maintenance
- Firebase: Less SQL flexibility, different ecosystem
consequences: Rapid development, built-in RLS, integrated auth; vendor lock-in risk
revisit_when: Supabase costs exceed $100/month or need custom auth flows

### jwt-cookie-auth
context: Needed to maintain auth state across requests
decision: HttpOnly cookies for JWT tokens (access + refresh)
alternatives:
- localStorage: XSS vulnerable, not HttpOnly
- Session-only cookies: No remember-me functionality
consequences: Secure against XSS, automatic cookie handling, works with SSR
revisit_when: Need for mobile app without cookie support or cross-domain requirements

### google-oauth-identity
context: Users authenticate via Google OAuth
decision: Identify users by google_id (sub claim), NOT by email
alternatives:
- Email-based matching: Allows unauthorized account merges if email matches
- Multiple identifiers: More complex, overkill for single provider
consequences: Secure account isolation, email conflicts show clear error
revisit_when: Adding Apple/Kakao OAuth (will need AuthIdentity table)

### responsive-loading
context: Mobile and desktop have different UX expectations for lists
decision: Infinite scroll on mobile (viewport < 768px), pagination on desktop
alternatives:
- Infinite scroll everywhere: Poor keyboard navigation on desktop
- Pagination everywhere: Interrupts mobile browsing flow
consequences: Optimal UX per device, slightly more complex component logic
revisit_when: User research shows preference change or accessibility requirements

## runbook

### google-oauth-token-invalid
symptom: "Invalid Google token" or "Token audience mismatch" error
confirm: Check browser console for token response; verify NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local
fix:
1. Verify NEXT_PUBLIC_GOOGLE_CLIENT_ID matches Google Cloud Console
2. Check authorized JavaScript origins include your domain
3. Clear browser cookies and retry
4. Check Google OAuth consent screen status
verify: Complete Google sign-in flow successfully
prevent: Add startup validation for Google client ID format

### supabase-connection-failed
symptom: "Missing Supabase environment variables" or database queries fail
confirm: `grep SUPABASE .env.local`
fix:
1. Verify NEXT_PUBLIC_SUPABASE_URL format: `https://xxx.supabase.co`
2. Verify SUPABASE_SERVICE_ROLE_KEY starts with `eyJ`
3. Check Supabase project status in dashboard
4. Restart dev server after .env changes
verify: `npm run dev` starts without errors; API routes return data
prevent: Add .env validation on server startup

### jwt-secret-invalid
symptom: "Invalid token" on every request or cookies not working
confirm: Check JWT_SECRET_KEY in .env.local (min 32 chars)
fix:
1. Generate new key: `openssl rand -base64 32`
2. Update JWT_SECRET_KEY in .env.local
3. Clear browser cookies (old tokens are invalid)
4. Restart dev server
verify: Login and subsequent requests work without token errors
prevent: Validate JWT_SECRET_KEY length on startup

### email-already-registered
symptom: "Email already registered with password" when using Google OAuth
confirm: Check users table for email with auth_provider='LOCAL'
fix:
1. User must login with password first
2. Then link Google account in profile settings (future feature)
3. Or: delete LOCAL user if they want Google-only (manual)
verify: User can login with their chosen auth method
prevent: Clear messaging in UI about account linking options

### infinite-loading-spinner
symptom: Discovery page shows loading spinner forever
confirm: Check browser DevTools Network tab; check console for errors
fix:
1. Verify API routes return proper JSON
2. Check Supabase connection and document_summaries table has data
3. Check useProblems hook for error handling
4. Add 5s timeout (already implemented in auth-context.tsx)
verify: Problem cards load within 5 seconds
prevent: Always add timeouts to async data fetching

### cookie-not-set
symptom: Login succeeds but user appears logged out on next request
confirm: Check Application > Cookies in DevTools
fix:
1. Verify cookie options: httpOnly, secure (only in prod), sameSite: 'lax'
2. Check if running on HTTPS in production
3. Verify access_token and refresh_token cookies exist
4. Check cookie path is '/'
verify: Cookies visible in DevTools after login; refresh maintains auth
prevent: Test both dev and production cookie configurations

## templates

### auth-api-route
purpose: Create new authentication API route
location: frontend/src/app/api/auth/{endpoint}/route.ts
variables:
- endpoint: URL path segment (e.g., verify-email)
- http_method: POST/GET/PUT/DELETE
usage:
```typescript
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Implementation
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ detail: 'Error' }, { status: 500 });
  }
}
```

### protected-api-route
purpose: Create API route requiring authentication
location: frontend/src/app/api/{path}/route.ts
variables:
- path: URL path
- response_type: Expected response shape
usage:
```typescript
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    // Use user.id for user-specific data
    return NextResponse.json({ data: ... });
  } catch (error) {
    return handleAuthError(error);
  }
}
```

### discovery-component
purpose: Create new discovery UI component
location: frontend/src/components/discovery/{ComponentName}.tsx
variables:
- ComponentName: PascalCase component name
- props_interface: TypeScript props definition
usage:
```typescript
'use client';

import { ProblemCard as ProblemCardType } from '@/types/problem';

interface ComponentNameProps {
  data: ProblemCardType;
  onClick: () => void;
}

export function ComponentName({ data, onClick }: ComponentNameProps) {
  return (
    <div onClick={onClick} className="bg-white rounded-lg shadow p-4">
      {/* Component content */}
    </div>
  );
}
```

### auth-hook-usage
purpose: Use authentication in client components
location: Any 'use client' component
variables:
- component_name: Component using auth
usage:
```typescript
'use client';
import { useAuth } from '@/lib/auth-context';

export function ComponentName() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;

  return <div>Welcome, {user?.nickname}</div>;
}
```

### supabase-query
purpose: Query Supabase database in API routes
location: API route files
variables:
- table_name: Supabase table name
- columns: Columns to select
usage:
```typescript
const { data, error } = await supabaseAdmin
  .from('table_name')
  .select('id, name, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);
```

## tuning

metrics:
- initial_page_load: Lighthouse Performance score (target: >90)
- problem_card_load_time: Time to first card render (target: <2s)
- auth_latency: Time from login click to authenticated state (target: <3s)
- infinite_scroll_batch: Cards per infinite scroll load (default: 20)
- pagination_size: Cards per page on desktop (default: 12)

levers:
- ACCESS_TOKEN_EXPIRE_MINUTES: 5-60 (default: 15)
- REFRESH_TOKEN_EXPIRE_DAYS: 1-30 (default: 7)
- REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER: 7-90 (default: 30)
- auth_timeout: AuthContext init timeout (default: 5000ms)

guardrails:
- initial_page_load > 5s → Optimize images, reduce bundle size
- auth_latency > 5s → Check Supabase connection, add retry logic
- error_rate > 5% → Review error logs, add monitoring

## invariants

- Email format must be valid (validated client + server)
- Password minimum 8 characters with alphanumeric combination
- JWT tokens are HttpOnly cookies (never exposed to JavaScript)
- Google OAuth requires email_verified=true from token
- User can only access their own data (user_id check on all queries)
- Auth provider once set (LOCAL/GOOGLE) determines login method
- Session duration: 7 days default, 30 days with remember_me
- Infinite scroll on viewport < 768px, pagination on >= 768px
- Problem cards display max 5 keywords
- Unauthenticated users can browse but not select problems

## task_decomposition

unit: One API route or component per task
parallel_boundaries:
- Auth routes (login, register, google) can be developed in parallel
- Discovery components (ProblemCard, FilterBar, Pagination) can be developed in parallel
- Types/interfaces can be done alongside implementations
pr_sequence:
1. Database schema and types → Foundation
2. Auth infrastructure (JWT, cookies, middleware) → Auth ready
3. Auth routes (login, register, google, refresh, logout) → Auth complete
4. Discovery components (ProblemCard, FilterBar) → UI ready
5. Discovery page integration (page.tsx, hooks) → Feature complete
6. Auth modal and protected routes → Full integration
definition_of_done:
- Component renders without TypeScript errors
- API route returns expected JSON structure
- Auth flow works end-to-end (login → access protected → logout)
- Mobile and desktop views work correctly
- No console errors in browser DevTools

## evolution

rules:
- 1 incident → add 1 runbook entry + 1 regression test
- 2 repeated tasks → promote to recipe or template
- 6 months no reference → archive or delete

---

## Summary

| Section | Items |
|---------|-------|
| golden_path | 4 steps |
| recipes | 5 recipes |
| decisions | 5 ADRs |
| runbook | 6 entries |
| templates | 5 templates |
| tuning | 5 metrics, 4 levers, 3 guardrails |
| invariants | 10 rules |
| task_decomposition | 6 PR phases |

**Expected time savings**: 3-5 hours per new developer onboarding, 2-3 hours per similar auth+discovery feature.
