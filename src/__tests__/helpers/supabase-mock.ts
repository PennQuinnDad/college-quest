import { vi } from "vitest";

/**
 * Creates a chainable Supabase query builder mock.
 *
 * Usage:
 *   const qb = createQueryBuilder({ data: [...], error: null });
 *   qb.from("colleges").select("*").eq("id", "123").single();
 *
 * The terminal method (.single(), .maybeSingle(), or the chain itself when awaited)
 * resolves with `{ data, error, count }`.
 */
export function createQueryBuilder(
  result: { data?: unknown; error?: unknown; count?: number } = {},
) {
  const terminal = {
    data: result.data ?? null,
    error: result.error ?? null,
    count: result.count ?? null,
  };

  const chain: Record<string, unknown> = {};

  const methods = [
    "from",
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "in",
    "or",
    "not",
    "gte",
    "lte",
    "ilike",
    "order",
    "limit",
    "range",
    "filter",
  ];

  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockResolvedValue(terminal);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminal);

  // When the chain is awaited directly (no .single()) it resolves with terminal
  chain.then = (resolve: (v: unknown) => void) => resolve(terminal);

  return chain;
}

/**
 * A mock user returned by supabase.auth.getUser().
 */
export function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-123",
    email: "test@example.com",
    user_metadata: { full_name: "Test User" },
    ...overrides,
  };
}

/**
 * Creates a mock Supabase client with auth.getUser() pre-configured.
 *
 * Pass `user: null` to simulate unauthenticated state.
 */
export function createMockSupabaseClient(
  user: ReturnType<typeof mockUser> | null = mockUser(),
  queryResult: { data?: unknown; error?: unknown; count?: number } = {},
) {
  const qb = createQueryBuilder(queryResult);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
    from: qb.from as ReturnType<typeof vi.fn>,
    _qb: qb,
  };
}
