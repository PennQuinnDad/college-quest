"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GraduationCap, AlertCircle, Loader2 } from "lucide-react";
import { FaGoogle, FaGithub, FaApple } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "github" | "apple";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Your email is not authorized. Please contact an administrator for access.",
  auth: "Authentication failed. Please try again.",
  unknown: "An unexpected error occurred. Please try again.",
};

const PROVIDERS: {
  id: OAuthProvider;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}[] = [
  {
    id: "google",
    label: "Continue with Google",
    icon: FaGoogle,
    className:
      "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400",
  },
  {
    id: "github",
    label: "Continue with GitHub",
    icon: FaGithub,
    className:
      "bg-[#24292f] text-white hover:bg-[#1b1f23] border border-[#24292f]",
  },
  {
    id: "apple",
    label: "Continue with Apple",
    icon: FaApple,
    className:
      "bg-black text-white hover:bg-gray-900 border border-black",
  },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const errorMessage = errorParam
    ? ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.unknown
    : null;

  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null
  );

  async function handleOAuthLogin(provider: OAuthProvider) {
    setLoadingProvider(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        console.error("OAuth error:", error.message);
        setLoadingProvider(null);
      }
    } catch {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,0,120,0.08) 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 50% at 80% 100%, rgba(171,245,233,0.15) 0%, transparent 60%), " +
            "linear-gradient(to bottom, #fbfbf8, #f4f4f0)",
        }}
      />

      <div className="w-full max-w-md">
        <Card className="border-border/60 shadow-lg">
          <CardHeader className="items-center space-y-4 pb-2 pt-8">
            {/* Logo */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-md">
              <GraduationCap className="h-8 w-8 text-white" strokeWidth={1.75} />
            </div>

            <div className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                College Quest
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Sign in to discover colleges that match your goals
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 px-6 pt-6 pb-4">
            {/* Error message */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* OAuth buttons */}
            {PROVIDERS.map(({ id, label, icon: Icon, className }) => {
              const isLoading = loadingProvider === id;
              const isDisabled = loadingProvider !== null;
              return (
                <Button
                  key={id}
                  variant="outline"
                  size="lg"
                  className={cn(
                    "relative w-full text-sm font-medium transition-all",
                    className,
                    isDisabled && !isLoading && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={isDisabled}
                  onClick={() => handleOAuthLogin(id)}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="mr-2 h-5 w-5" />
                  )}
                  {label}
                </Button>
              );
            })}
          </CardContent>

          <CardFooter className="flex-col space-y-3 px-6 pb-8 pt-2">
            {/* Divider */}
            <div className="flex w-full items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                Secure authentication
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Legal links */}
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              By continuing, you agree to our{" "}
              <a
                href="#"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </CardFooter>
        </Card>

        {/* Footer branding */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} College Quest. All rights reserved.
        </p>
      </div>
    </div>
  );
}
