import Link from "next/link";
import AuditForm from "./audit-form";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  return (
    <>
      <div className="border-b border-rule bg-screen text-[11px] text-ink-dim">
        <div className="px-4 lg:px-6 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-accent">●</span>
            <span>lodestar</span>
            <span>/</span>
            <span>audit</span>
          </div>
          <Link
            href="/"
            className="text-ink-dim hover:text-ink no-underline"
          >
            ← back to discover
          </Link>
        </div>
      </div>

      <main className="min-h-screen bg-screen px-4 lg:px-6 py-6">
        <div className="2xl:max-w-[1800px] 2xl:mx-auto">
          <div className="mb-8">
            <div className="flex items-baseline gap-2">
              <span className="text-accent text-sm">~/audit</span>
              <h1 className="text-2xl text-ink font-medium tracking-tight">
                repo audit
              </h1>
              <span className="term-cursor" />
            </div>
            <p className="mt-2 text-sm text-ink-dim max-w-2xl">
              Point at a GitHub repo. The agent finds peers via the same
              discovery pipeline, compares patterns, and returns concrete
              improvements with priority and effort.
            </p>
          </div>

          <AuditForm />
        </div>
      </main>
    </>
  );
}
