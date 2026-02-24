"use client";

import { useEffect } from "react";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";

export default function CollegeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("College detail error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center text-center">
        <FaIcon
          icon="graduation-cap"
          style="duotone"
          className="text-4xl text-destructive/40 mb-4"
        />
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Failed to load college
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          We couldn&apos;t load this college&apos;s details. It may have been removed or
          there&apos;s a temporary issue.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Back to Search
          </Button>
          <Button onClick={reset} className="bg-primary hover:bg-primary/90">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
