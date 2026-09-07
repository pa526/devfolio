import Link from "next/link";
import { FolderGit2 } from "lucide-react";

export function Navbar({ username }: { username?: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
            <FolderGit2 size={18} />
          </span>
          DevFolio
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/resume"
            className="px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 font-medium"
          >
            Resume Builder
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 font-medium"
          >
            Dashboard
          </Link>
          {username ? (
            <Link
              href={`/${username}`}
              className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold"
            >
              View portfolio
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold"
            >
              Get started
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-white/10 mt-20">
      <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-zinc-500 flex flex-col sm:flex-row gap-2 items-center justify-between">
        <p>
          Built with Next.js, Octokit & Gemini · Turn your GitHub into a hireable portfolio.
        </p>
        <p>DevFolio — recruiter-ready in under a minute.</p>
      </div>
    </footer>
  );
}
