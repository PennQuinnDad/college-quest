"use client";

import { useEffect } from "react";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center text-center">
        <FaIcon
          icon="gear"
          style="duotone"
          className="text-4xl text-destructive/40 mb-4"
        />
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Admin page error
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Something went wrong loading the admin panel. Please try again.
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
