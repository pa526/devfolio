export interface RepoMeta {
  id: number | string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  url: string;
  updatedAt: string | null;
  readme?: string | null;
}

export async function fetchPublicRepos(
  username: string,
  opts: { perPage?: number; withReadme?: boolean } = {}
): Promise<{ profile: any; repos: RepoMeta[] }> {
  const perPage = opts.perPage ?? 30;
  const userRes = await fetch(`https://api.github.com/users/${username}`, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: 300 },
  });
  if (userRes.status === 404) throw new Error("GitHub user not found");
  if (!userRes.ok) throw new Error(`GitHub API error (${userRes.status})`);
  const profile = await userRes.json();

  const repoRes = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=${perPage}&sort=updated&type=owner`,
    { headers: { Accept: "application/vnd.github+json" }, next: { revalidate: 300 } }
  );
  if (!repoRes.ok) throw new Error(`Could not fetch repos (${repoRes.status})`);
  const raw = await repoRes.json();

  let repos: RepoMeta[] = raw
    .filter((r: any) => !r.fork)
    .slice(0, perPage)
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      url: r.html_url,
      updatedAt: r.updated_at,
    }));

  // Rank: pinned-worthy first (stars + recency)
  repos.sort((a, b) => b.stars - a.stars || +(b.updatedAt ?? 0) - +(a.updatedAt ?? 0));

  if (opts.withReadme) {
    const withReadme = await Promise.all(
      repos.slice(0, 12).map(async (r) => {
        try {
          const readme = await fetchReadme(username, r.name);
          return { ...r, readme: readme?.slice(0, 6000) ?? null };
        } catch {
          return r;
        }
      })
    );
    const rest = repos.slice(12);
    repos = [...withReadme, ...rest];
  }

  return { profile, repos };
}

export async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: { Accept: "application/vnd.github.raw" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 8000);
  } catch {
    return null;
  }
}
