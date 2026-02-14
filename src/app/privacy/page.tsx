import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | College Quest",
  description: "Privacy Policy for the College Quest college research platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden>←</span>
            Back to College Quest
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: February 14, 2026
        </p>

        <div className="space-y-8 text-base leading-relaxed text-foreground/90">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              1. Overview
            </h2>
            <p>
              College Quest is a free college research tool that respects your
              privacy. We collect minimal data, we do not sell your information, we
              do not display advertising, and we do not use tracking cookies beyond
              what is necessary for authentication. This policy explains what we
              collect, how we use it, and how we protect it.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              2. Information We Collect
            </h2>
            <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">
              Account Information
            </h3>
            <p className="mb-3">
              When you sign in with GitHub OAuth, we receive and store the
              following from your GitHub profile:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-2 text-foreground/80">
              <li>Your GitHub display name</li>
              <li>Your email address</li>
              <li>Your GitHub user ID (for authentication)</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">
              Usage Data
            </h3>
            <p className="mb-3">
              As you use College Quest, we store the following data associated with
              your account:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-2 text-foreground/80">
              <li>Colleges you add to your favorites</li>
              <li>Folders you create and the colleges organized within them</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">
              Automatic Information
            </h3>
            <p>
              Our hosting infrastructure may automatically collect standard web
              server logs (IP addresses, browser type, pages visited). This
              information is used solely for maintaining the service and diagnosing
              technical issues. We do not use analytics tracking scripts or
              third-party tracking pixels.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-inside list-disc space-y-1.5 pl-2 text-foreground/80">
              <li>Authenticate you and maintain your session</li>
              <li>Save and display your college favorites and folders</li>
              <li>Provide the core features of the College Quest platform</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> use your information for advertising,
              marketing, profiling, or any purpose beyond operating the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              4. Information We Do Not Collect or Sell
            </h2>
            <p className="mb-3">To be clear about what we do not do:</p>
            <ul className="list-inside list-disc space-y-1.5 pl-2 text-foreground/80">
              <li>
                We do <strong>not</strong> sell, rent, or share your personal
                information with third parties
              </li>
              <li>
                We do <strong>not</strong> display advertisements
              </li>
              <li>
                We do <strong>not</strong> use tracking cookies for advertising or
                analytics
              </li>
              <li>
                We do <strong>not</strong> store your GitHub password
              </li>
              <li>
                We do <strong>not</strong> access your GitHub repositories, code,
                or any data beyond basic profile information
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              5. Third-Party Services
            </h2>
            <p className="mb-3">
              College Quest relies on the following third-party services to
              operate:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-2 text-foreground/80">
              <li>
                <strong>GitHub</strong> — OAuth authentication provider. When you
                sign in, GitHub shares your basic profile information with us per
                their{" "}
                <a
                  href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Supabase</strong> — Database and authentication
                infrastructure. Your account and favorites data is stored securely
                in a PostgreSQL database hosted by Supabase.
              </li>
              <li>
                <strong>Cloudflare</strong> — DNS and content delivery. Cloudflare
                may process requests to improve performance and security.
              </li>
              <li>
                <strong>U.S. Department of Education College Scorecard</strong> —
                Source of college data displayed on the platform. No user data is
                shared with this service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              6. Data Storage &amp; Security
            </h2>
            <p>
              Your data is stored in a PostgreSQL database hosted by Supabase with
              industry-standard security measures including encryption in transit
              (TLS) and row-level security policies. While we take reasonable steps
              to protect your data, no system is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              7. Data Retention &amp; Deletion
            </h2>
            <p>
              We retain your account data and favorites for as long as your account
              is active. If you wish to delete your account and all associated
              data, please contact us through our GitHub repository and we will
              remove your information. You can also remove individual favorites and
              folders at any time through the College Quest interface.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              8. Children&apos;s Privacy
            </h2>
            <p>
              College Quest is designed as a college research tool and is not
              directed at children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you are a
              parent or guardian and believe your child has provided us with
              personal information, please contact us so we can take appropriate
              action.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we make
              changes, we will update the &ldquo;Last updated&rdquo; date at the
              top of this page. Your continued use of College Quest after any
              changes constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              10. Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy or want to request
              deletion of your data, please reach out through our{" "}
              <a
                href="https://github.com/PennQuinnDad/college-quest"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
