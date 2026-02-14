import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | College Quest",
  description: "Terms of Service for the College Quest college research platform.",
};

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: February 14, 2026
        </p>

        <div className="space-y-8 text-base leading-relaxed text-foreground/90">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              1. About College Quest
            </h2>
            <p>
              College Quest is a free college research and discovery tool designed
              to help students and families explore higher education options in the
              United States. The platform provides college data sourced from the
              U.S. Department of Education&apos;s College Scorecard, along with
              features for saving favorites, organizing colleges into folders, and
              comparing institutions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              2. Acceptance of Terms
            </h2>
            <p>
              By accessing or using College Quest, you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not
              use the service. We reserve the right to update these terms at any
              time, and your continued use of the service constitutes acceptance of
              any changes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              3. Account &amp; Authentication
            </h2>
            <p>
              College Quest uses GitHub OAuth for authentication. When you sign in,
              we receive basic profile information from GitHub (such as your name
              and email address) to create and manage your account. You are
              responsible for maintaining the security of your GitHub account. We do
              not store your GitHub password.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              4. User Data &amp; Content
            </h2>
            <p>
              When you use College Quest, you may save colleges to your favorites
              list and organize them into folders. This data is stored securely and
              associated with your account. You retain ownership of your
              organizational choices (which colleges you save and how you categorize
              them). We do not claim any rights to your user-generated data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              5. Acceptable Use
            </h2>
            <p className="mb-3">
              You agree to use College Quest only for its intended purpose of
              college research and discovery. You agree not to:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-2 text-foreground/80">
              <li>
                Scrape, crawl, or systematically download data from the platform
              </li>
              <li>
                Attempt to gain unauthorized access to other users&apos; accounts
                or data
              </li>
              <li>
                Use the service in any way that could damage, disable, or impair
                the platform
              </li>
              <li>
                Use automated tools or bots to interact with the service without
                prior written permission
              </li>
              <li>
                Misrepresent your identity or affiliation when using the service
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              6. Data Accuracy Disclaimer
            </h2>
            <p>
              College data displayed on College Quest is primarily sourced from the
              U.S. Department of Education&apos;s College Scorecard and other public
              data sources. While we strive to present accurate and up-to-date
              information, we make no warranties or guarantees regarding the
              accuracy, completeness, or timeliness of this data. College
              admissions requirements, tuition costs, acceptance rates, and other
              metrics change regularly. Always verify critical information directly
              with the colleges you are considering.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              7. Limitation of Liability
            </h2>
            <p>
              College Quest is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, either express or
              implied. We are not liable for any decisions you make based on the
              information provided through this platform, including but not limited
              to college application decisions, financial commitments, or
              enrollment choices. In no event shall College Quest or its operators
              be liable for any indirect, incidental, special, or consequential
              damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              8. Service Availability
            </h2>
            <p>
              We make reasonable efforts to keep College Quest available and
              functional, but we do not guarantee uninterrupted access. The service
              may be temporarily unavailable due to maintenance, updates, or
              circumstances beyond our control. We reserve the right to modify,
              suspend, or discontinue the service at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              9. Changes to These Terms
            </h2>
            <p>
              We may update these Terms of Service from time to time. When we make
              changes, we will update the &ldquo;Last updated&rdquo; date at the
              top of this page. Your continued use of College Quest after any
              changes constitutes your acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              10. Contact
            </h2>
            <p>
              If you have questions about these Terms of Service, please reach out
              through our{" "}
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
