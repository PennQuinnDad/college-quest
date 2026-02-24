"use client";

import { useEffect } from "react";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center text-center">
        <FaIcon
          icon="triangle-exclamation"
          style="duotone"
          className="text-4xl text-destructive/50 mb-4"
        />
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          An unexpected error occurred. Please try again or refresh the page.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go Home
          </Button>
          <Button onClick={reset} className="bg-primary hover:bg-primary/90">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
