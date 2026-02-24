# Test Coverage Analysis — College Quest

## Current State

**The project has zero automated tests.** There is no testing framework installed, no test configuration, no test files, and no `test` script in `package.json`. This means every deployment relies entirely on manual verification.

---

## Recommended Testing Framework Setup

For a Next.js 16 / React 19 / TypeScript project, the recommended stack is:

| Layer | Tool | Why |
|---|---|---|
| Unit / Integration | **Vitest** | Fast, native ESM/TS support, compatible with Next.js |
| Component | **React Testing Library** + Vitest | Standard for React component testing |
| API routes | **Vitest** with mocked Supabase client | Test request/response logic in isolation |
| E2E (optional) | **Playwright** | Already a transitive dependency via Next.js |

---

## Priority Areas for Testing

The areas below are ranked by **risk × impact** — how likely a bug is and how much damage it would cause.

---

### Priority 1 — Critical (High risk, high impact)

#### 1A. College Search & Filtering (`src/app/api/colleges/route.ts`)

This is the most complex API route in the application (~200 lines). It constructs dynamic Supabase queries from 15+ filter parameters including text search, multi-value filters, numeric ranges, acceptance rate range buckets, program category joins, and pagination with a tiered batching strategy for limits >1000.

**Specific test cases needed:**

- Text search applies `ilike` across name, city, state, region, type, description, website
- Multi-value filters (states, regions, types, sizes) correctly split comma-separated values
- Acceptance rate range buckets map to correct numeric ranges (e.g., "Highly Selective (0-15%)" → `gte(0), lte(15)`)
- Numeric range filters (tuition min/max, enrollment min/max) apply correctly
- `jesuitOnly=true` filters to only Jesuit institutions
- Program category filter correctly cross-references the schools table
- Pagination: page/limit defaults, clamping, and the >1000 batch strategy
- Sort order: relevance sorting with favorite prioritization, numeric vs. text column sorting
- Edge cases: empty query, no filters, all filters at once, invalid parameter values

#### 1B. Family Invite Accept Flow (`src/app/api/family/invite/[token]/accept/route.ts`)

This route handles a multi-step security-sensitive operation: token lookup → expiry check → self-invite guard → parent/student role assignment → family link creation → invite claim.

**Specific test cases needed:**

- Valid token creates family link with correct parent/student assignment
- Expired invite returns 410
- Already-claimed invite returns 404
- Self-accept returns 400
- Duplicate link returns 409 (code 23505)
- Parent inviter → accepter becomes student; student inviter → accepter becomes parent
- Unauthenticated request returns 401

#### 1C. Family Invite Creation (`src/app/api/family/invite/route.ts`)

**Specific test cases needed:**

- Valid email creates invite with correct token and inviter type
- Invalid email format returns 400
- Self-invite (inviting own email) returns 400
- Duplicate pending invite returns 409
- Missing profile returns 400
- Inviter type correctly determines suggested account type for invitee

#### 1D. Admin Authorization (`src/lib/admin-auth.ts`)

All admin operations depend on this single function. A bug here could expose admin endpoints to regular users.

**Specific test cases needed:**

- Unauthenticated user → 401
- Authenticated non-admin → 403
- Authenticated admin → null (pass)
- Database error during profile lookup → 500

---

### Priority 2 — High (Moderate risk, high impact)

#### 2A. Favorites API (`src/app/api/favorites/route.ts`, `src/app/api/favorites/[collegeId]/route.ts`)

**Specific test cases needed:**

- GET returns user's favorites ordered by created_at desc
- POST upserts profile before inserting favorite
- POST with duplicate college returns 409
- DELETE removes the specific favorite
- GET check returns correct boolean for favorited/not-favorited
- All endpoints return 401 when unauthenticated

#### 2B. Folders API (`src/app/api/folders/route.ts`, `[folderId]/route.ts`, `[folderId]/items/route.ts`)

**Specific test cases needed:**

- Folder creation enforces max 20 folders per user
- Folder creation rejects empty names
- Duplicate folder names return 409
- Position calculation works correctly (max position + 1)
- Folder ownership is enforced on all operations (GET, PATCH, DELETE)
- Folder deletion cascades to folder items
- Adding duplicate college to folder returns 409
- `all-items` route correctly deduplicates across favorites and folders

#### 2C. User Profile (`src/app/api/me/route.ts`)

**Specific test cases needed:**

- GET returns complete profile with correct field mapping
- PATCH validates accountType is 'student' or 'parent'
- PATCH validates graduationYear range (2020–2040)
- PATCH only updates provided fields (doesn't null out others)
- `last_active_at` throttle: only updates if >5 minutes since last
- Profile completed flag set to true on update

#### 2D. Similar Colleges Algorithm (`src/app/api/colleges/[id]/similar/route.ts`)

This contains a non-trivial scoring algorithm with 11 weighted dimensions. The scoring logic is pure computation and highly testable.

**Specific test cases needed:**

- Identical region adds 20 points
- Same state adds 10 points
- Type match adds 15 points
- Size match adds 10 points
- Jesuit match adds 5 points
- Enrollment within 25% → +10, within 50% → +5
- Acceptance rate within 5% → +10, within 10% → +5
- Tuition within 20% → +10, within 40% → +5
- Graduation rate within 5% → +5, within 10% → +3
- SAT composite within 50 → +5, within 100 → +3
- Program overlap scoring scales correctly
- Results sorted by score descending, limited to requested count

---

### Priority 3 — Medium (Lower risk, moderate impact)

#### 3A. Utility Functions (`src/lib/utils.ts`)

These are pure functions and trivially testable.

**Specific test cases needed:**

- `formatCurrency(null)` → "N/A"
- `formatCurrency(45000)` → "$45,000"
- `formatPercent(null)` → "N/A"
- `formatPercent(82.456)` → "82.5%"
- `formatNumber(null)` → "N/A"
- `formatNumber(12345)` → "12,345"
- `cn()` merges Tailwind classes correctly

#### 3B. Admin CRUD Routes (`src/app/api/admin/colleges/route.ts`, `admin/schools/route.ts`)

**Specific test cases needed:**

- GET with search query filters correctly
- GET pagination returns correct page and count
- POST validates required fields (name, city, state for colleges; name, collegeId for schools)
- POST generates UUID when id not provided
- DELETE validates non-empty ids array
- All endpoints verify admin auth

#### 3C. College Detail Route (`src/app/api/colleges/[id]/route.ts`)

**Note:** The POST (update) endpoint requires authentication but does **not** check for admin role — this may be a security issue worth investigating.

**Specific test cases needed:**

- GET returns college data, 404 on missing ID
- POST maps camelCase to snake_case correctly
- DELETE requires admin auth
- POST auth behavior (currently allows any authenticated user to update)

#### 3D. Schools/Programs Routes

**Specific test cases needed:**

- Categories route handles pagination correctly (1000-row batches, deduplication)
- Programs route filters by comma-separated collegeIds
- Programs route returns all when no collegeIds provided

---

### Priority 4 — Component & Hook Tests

#### 4A. `useFolders` Hook (`src/hooks/use-folders.ts`)

Most complex hook in the app. Manages folder state, membership maps, and mutations.

**Specific test cases needed:**

- Folders query fetches and caches correctly
- Membership query builds correct college→folder map
- Toggle mutation handles add and remove
- Toggle mutation handles 409 conflict gracefully
- Create folder invalidates both folders and memberships caches

#### 4B. `useClickOutside` Hook (`src/hooks/use-click-outside.ts`)

**Specific test cases needed:**

- Callback fires on click outside ref element
- Callback does not fire on click inside ref element
- Escape key triggers callback
- `extraRefs` elements are excluded from outside-click detection
- Listeners are only attached when `open` is true

#### 4C. `CollegeTable` Component (`src/components/college-table.tsx`)

Most complex component with sorting, resizing, column visibility, and scroll state.

**Specific test cases needed:**

- Sorting toggles direction on click
- Numeric columns default to descending sort
- Column visibility persists to localStorage
- Column widths persist to localStorage
- Frozen column shadow appears on horizontal scroll

#### 4D. `CollegeResources` Component (`src/components/college-resources.tsx`)

**Specific test cases needed:**

- Resource list renders links with correct categories
- Form validation requires title and URL
- Admin-only actions hidden for non-admin users
- Delete requires confirmation step
- CRUD mutations trigger query invalidation

---

## Potential Security Issue Found

In `src/app/api/colleges/[id]/route.ts`, the **POST handler** (college update) checks for authentication but does **not** call `verifyAdmin()`. This means any logged-in user can update any college's data. The DELETE handler correctly verifies admin. This discrepancy should be addressed.

---

## Recommended Implementation Order

1. **Set up Vitest + React Testing Library** — install dependencies, configure, add `test` script
2. **Unit tests for `src/lib/utils.ts`** — quick win, builds confidence in the setup
3. **Unit tests for similar-colleges scoring algorithm** — extract scoring logic into a pure function, test exhaustively
4. **API route tests for family invite flow** — highest-risk business logic
5. **API route tests for college search/filtering** — most complex query construction
6. **API route tests for admin auth** — security boundary
7. **API route tests for favorites and folders** — core user-facing features
8. **API route tests for user profile** — validation logic
9. **Hook tests for `useFolders`** — complex client-side state
10. **Component tests for `CollegeTable` and `CollegeResources`** — complex UI logic

---

## Summary Table

| Area | Files | Risk | Complexity | Test Type |
|---|---|---|---|---|
| College search/filter | `api/colleges/route.ts` | Critical | Very High | Integration |
| Family invite accept | `api/family/invite/[token]/accept/route.ts` | Critical | High | Integration |
| Family invite create | `api/family/invite/route.ts` | Critical | High | Integration |
| Admin auth | `lib/admin-auth.ts` | Critical | Low | Unit |
| Favorites API | `api/favorites/` | High | Medium | Integration |
| Folders API | `api/folders/` | High | High | Integration |
| User profile | `api/me/route.ts` | High | Medium | Integration |
| Similar colleges | `api/colleges/[id]/similar/route.ts` | High | High | Unit (scoring) |
| Utility functions | `lib/utils.ts` | Medium | Low | Unit |
| Admin CRUD | `api/admin/` | Medium | Medium | Integration |
| College detail | `api/colleges/[id]/route.ts` | Medium | Low | Integration |
| Schools/programs | `api/schools/` | Medium | Low | Integration |
| useFolders hook | `hooks/use-folders.ts` | Medium | High | Unit |
| useClickOutside hook | `hooks/use-click-outside.ts` | Low | Low | Unit |
| CollegeTable | `components/college-table.tsx` | Low | High | Component |
| CollegeResources | `components/college-resources.tsx` | Low | Medium | Component |
