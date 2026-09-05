import type { ReactNode } from "react";

type LegalPageLayoutProps = {
  title: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <main className="h-screen overflow-y-auto bg-surface-1 px-6 py-12 text-primary sm:px-10 lg:px-16">
      <article className="shadow-sm mx-auto max-w-3xl space-y-8 rounded-xl border border-subtle bg-surface-2 p-6 sm:p-10">
        <header className="space-y-3 border-b border-subtle pb-6">
          <a href="/" className="text-sm text-accent font-semibold hover:underline">
            Ten-Fold
          </a>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-tertiary">Effective date: September 5, 2026</p>
        </header>
        <div className="text-sm space-y-8 leading-6 text-secondary">{children}</div>
        <footer className="text-sm flex flex-wrap gap-x-4 gap-y-2 border-t border-subtle pt-6">
          <a href="/terms" className="text-accent hover:underline">
            Terms of Service
          </a>
          <a href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </a>
        </footer>
      </article>
    </main>
  );
}
