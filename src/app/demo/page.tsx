"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, Zap, ArrowRight } from "lucide-react";
import { Navbar, Footer } from "@/components/chrome";
import { Button, Input } from "@/components/ui";

export default function DemoLanding() {
  const [username, setUsername] = useState("torvalds");
  const router = useRouter();

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-10">
          <Zap size={36} className="mx-auto mb-4 text-violet-500" />
          <h1 className="text-3xl font-black">Try DevFolio without logging in</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Enter any public GitHub username. We fetch their repos live and
            generate Gemini summaries on demand — nothing is stored.
          </p>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (username.trim()) router.push(`/demo/${username.trim()}`);
            }}
          >
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="github username, e.g. torvalds"
            />
            <Button type="submit">Go <ArrowRight size={16} /></Button>
          </form>
          <div className="mt-4 flex justify-center gap-2 text-sm">
            {["torvalds", "sindresorhus", "shadcn"].map((u) => (
              <button key={u} onClick={() => router.push(`/demo/${u}`)} className="underline text-violet-500">
                {u}
              </button>
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            <FolderGit2 size={14} className="inline" /> Want persistence, editing & publishing?{" "}
            <a href="/dashboard" className="underline font-medium">Sign in with GitHub</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
