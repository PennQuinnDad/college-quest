import React from "react";
import { renderHook, type RenderHookOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Creates a fresh QueryClient and wraps it in a provider for hook testing.
 */
export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
}

/**
 * Convenience: renderHook pre-wrapped with a QueryClientProvider.
 */
export function renderHookWithQuery<TResult>(
  hook: () => TResult,
  options?: Omit<RenderHookOptions<unknown>, "wrapper">,
) {
  const { Wrapper, queryClient } = createWrapper();
  const result = renderHook(hook, { wrapper: Wrapper, ...options });
  return { ...result, queryClient };
}
