import type { BuilderResume } from "@/lib/builder";
import { tokenize } from "@/lib/matcher";

/* ------------------------------------------------------------------ */
/* Lexicon: what an ATS would plausibly match against a job description */
/* ------------------------------------------------------------------ */

const SKILL_LEXICON = [
  // languages
  "javascript", "typescript", "python", "java", "go", "golang", "rust", "c++", "c#", "ruby", "php", "swift", "kotlin", "dart", "scala", "r",
  // frontend
  "react", "react.js", "next.js", "nextjs", "vue", "vue.js", "angular", "svelte", "html", "css", "tailwind", "bootstrap", "sass", "redux", "vite", "webpack",
  // backend
  "node", "node.js", "express", "django", "flask", "fastapi", "spring", "spring boot", ".net", "laravel", "rails", "graphql", "rest", "rest api", "grpc", "microservices", "websocket",
  // mobile
  "flutter", "react native", "android", "ios", "expo",
  // data / ml
  "sql", "pandas", "numpy", "tensorflow", "pytorch", "scikit-learn", "machine learning", "deep learning", "nlp", "llm", "rag", "langchain", "openai", "etl", "spark", "airflow", "hadoop", "tableau", "power bi", "excel",
  // devops / cloud
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "ci/cd", "github actions", "linux", "nginx", "redis", "kafka", "rabbitmq",
  // databases
  "postgres", "postgresql", "mysql", "mongodb", "sqlite", "dynamodb", "elasticsearch", "firebase", "supabase", "prisma",
  // testing / quality
  "jest", "cypress", "playwright", "selenium", "pytest", "junit", "unit testing", "integration testing", "tdd",
  // practices & soft skills
  "agile", "scrum", "kanban", "code review", "mentoring", "leadership", "communication", "collaboration", "problem solving", "system design", "oops", "oop", "data structures", "algorithms",
  // tools
  "git", "github", "gitlab", "jira", "figma", "postman", "vs code", "vim",
];

const SYNONYMS: Record<string, string> = {
  js: "javascript", ts: "typescript", reactjs: "react", "react.js": "react",
  next: "nextjs", "next.js": "nextjs", nodejs: "node", "node.js": "node",
  k8s: "kubernetes", "ci cd": "ci/cd", ml: "machine learning", ai: "machine learning",
  postgres: "postgresql", mongo: "mongodb", tf: "tensorflow", sklearn: "scikit-learn",
  rn: "react native", golang: "go",
};

const DEGREE_TIERS = [
  { level: 3, label: "PhD / Doctorate", patterns: [/\bph\.?d\b/, /\bdoctorate\b/, /\bdoctoral\b/] },
  { level: 2, label: "Master's", patterns: [/\bmaster'?s?\b/, /\bm\.?tech\b/, /\bm\.?s\b/, /\bmba\b/, /\bm\.?e\b/] },
  { level: 1, label: "Bachelor's", patterns: [/\bbachelor'?s?\b/, /\bb\.?tech\b/, /\bb\.?s\b/, /\bb\.?e\b/, /\bundergraduate\b/, /\bgraduate\b/, /\bbca\b/, /\bmca\b/] },
];

const CERT_PATTERNS = [
  /\baws\s?(certified|solutions architect|developer|sysops)\b/, /\bazure\s?\w*\s?certified\b/,
  /\bcka\b/, /\bckad\b/, /\bpmp\b/, /\bcsm\b/, /\bgoogle\s?cloud\s?certified\b/,
  /\boracle\s?certified\b/, /\bcissp\b/, /\bcomptia\b/, /\bitil\b/, /\bcertified\b/,
];

const ACTION_VERBS = new Set(
  "achieved automated architected built collaborated crafted delivered deployed designed developed drove engineered established generated grew implemented improved increased integrated launched led maintained managed mentored migrated monitored owned pioneered reduced refactored resolved scaled shipped simplified solved spearheaded streamlined tested transformed accelerated analyzed created".split(" ")
);

const QUANT_RE = /(\d+\s?(%|\+|x|k|m\b)?|\d+\s?(users|user|projects|repos|stars|ms|seconds|minutes|percent|revenue|\$|clients|engineers|members))/i;

/* ------------------------------------------------------------------ */

export interface AtsCheck {
  label: string;
  status: "pass" | "fail" | "na";
  detail: string;
  tip: string;
  weight: number;
}

export interface AtsKnockout {
  label: string;
  status: "pass" | "fail" | "unknown";
  detail: string;
}

export interface AtsResult {
  score: number;
  jdPresent: boolean;
  matchedKeywords: string[];
  missingKeywords: string[];
  checks: AtsCheck[];
  knockouts: AtsKnockout[];
}

const norm = (t: string) => ` ${t.toLowerCase().replace(/[^a-z0-9+#./\s]/g, " ")} `;
const canon = (t: string) => SYNONYMS[t] ?? t;

function extractJdKeywords(jd: string): string[] {
  const hay = norm(jd);
  const found = new Set<string>();
  for (const skill of SKILL_LEXICON) {
    const pattern = new RegExp(`(?<![a-z0-9+#./])${skill.replace(/[.+]/g, "\\$&")}(?![a-z0-9+#./])`);
    if (pattern.test(hay)) found.add(canon(skill));
  }
  return [...found];
}

function extractJdTitle(jd: string): string {
  const m = jd.match(/(?:job\s*title|position|role)\s*[:\-]\s*(.+)/i);
  if (m) return m[1].split("\n")[0].trim().slice(0, 80);
  const first = jd.split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "";
  return first.length <= 80 ? first : "";
}

function extractRequiredYears(jd: string): number | null {
  const m = jd.match(/(\d+)\s*\+?\s*(?:years?|yrs?)\b/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractRequiredDegree(jd: string): { level: number; label: string } | null {
  const hay = jd.toLowerCase();
  for (const tier of DEGREE_TIERS) {
    if (tier.patterns.some((p) => p.test(hay))) return { level: tier.level, label: tier.label };
  }
  return null;
}

function resumeDegreeLevel(r: BuilderResume): { level: number; label: string } {
  const hay = r.education.map((e) => `${e.degree} ${e.field} ${e.school}`).join(" ").toLowerCase();
  for (const tier of DEGREE_TIERS) {
    if (tier.patterns.some((p) => p.test(hay))) return { level: tier.level, label: tier.label };
  }
  return { level: 0, label: "none listed" };
}

/** Total years from experience date ranges (4-digit years; present/now/current = this year). */
export function resumeYears(r: BuilderResume): number {
  const now = new Date().getFullYear();
  let total = 0;
  for (const e of r.experience) {
    const s = (e.start.match(/(19|20)\d{2}/) ?? [])[0];
    const endRaw = e.end.toLowerCase();
    const en = /present|current|now|till date/.test(endRaw) ? String(now) : (e.end.match(/(19|20)\d{2}/) ?? [])[0];
    if (s && en) total += Math.max(0, parseInt(en, 10) - parseInt(s, 10));
  }
  return total;
}

function resumeBlobs(r: BuilderResume) {
  const skillsText = r.skillGroups.map((g) => g.value).join(" ").toLowerCase();
  const bullets = [
    ...r.experience.flatMap((e) => e.bullets),
    ...r.projects.flatMap((p) => p.bullets),
    ...r.customSections.flatMap((c) => c.bullets),
  ].map((b) => b.trim()).filter(Boolean);
  const all = [r.summary, skillsText, ...bullets,
    ...r.experience.flatMap((e) => [e.title, e.company]),
    ...r.projects.flatMap((p) => [p.name, p.tech]),
  ].join(" ").toLowerCase();
  return { skillsText: norm(skillsText), all: norm(all), bullets };
}

/* ------------------------------------------------------------------ */

export function scoreAts(r: BuilderResume, jdRaw?: string): AtsResult {
  const jd = (jdRaw ?? "").trim();
  const jdPresent = jd.length >= 20;
  const { skillsText, all, bullets } = resumeBlobs(r);
  const checks: AtsCheck[] = [];
  const knockouts: AtsKnockout[] = [];

  /* --- Step 2/3 core: keyword coverage vs JD (weight 35) --- */
  let matchedKeywords: string[] = [];
  let missingKeywords: string[] = [];
  if (jdPresent) {
    const jdKeys = extractJdKeywords(jd);
    for (const k of jdKeys) {
      (all.includes(` ${k} `) || all.includes(k) ? matchedKeywords : missingKeywords).push(k);
    }
    const inSkills = matchedKeywords.filter((k) => skillsText.includes(k)).length;
    const ratio = jdKeys.length ? matchedKeywords.length / jdKeys.length : 1;
    checks.push({
      label: `Required keywords ${matchedKeywords.length}/${jdKeys.length} matched`,
      status: jdKeys.length === 0 ? "na" : ratio >= 0.7 ? "pass" : "fail",
      detail: jdKeys.length === 0
        ? "No recognizable skill keywords found in this job description."
        : `${Math.round(ratio * 100)}% of the posting's hard skills appear in your resume (${inSkills} in the Skills section — ATS weights those highest).`,
      tip: missingKeywords.length
        ? `Mirror these exact terms where honestly applicable: ${missingKeywords.slice(0, 10).join(", ")}.`
        : "Great coverage — keep exact JD terminology in your Skills section.",
      weight: 35,
    });
  } else {
    const skillCount = r.skillGroups.flatMap((g) => g.value.split(",")).map((s) => s.trim()).filter(Boolean).length;
    checks.push({
      label: `Skills listed plainly (${skillCount}, aim 8+)`,
      status: skillCount >= 8 ? "pass" : "fail",
      detail: "No job description pasted — scoring the Skills section standalone. Paste the JD for keyword matching.",
      tip: "List tools as comma-separated keywords and paste the job posting below for a real match score.",
      weight: 35,
    });
  }

  /* --- Title alignment (10) --- */
  const jdTitle = jdPresent ? extractJdTitle(jd) : "";
  const titleTokens = jdTitle ? tokenize(jdTitle).filter((t) => t.length > 3) : tokenize(r.targetRole);
  const expTitles = r.experience.map((e) => e.title.toLowerCase()).join(" ");
  if (titleTokens.length) {
    const hits = titleTokens.filter((t) => all.includes(t));
    const ratio = hits.length / titleTokens.length;
    checks.push({
      label: `Title alignment (“${(jdTitle || r.targetRole).slice(0, 40)}”: ${hits.length}/${titleTokens.length})`,
      status: ratio >= 0.5 ? "pass" : "fail",
      detail: `Your past titles and text match ${hits.length} of ${titleTokens.length} title words.`,
      tip: "Echo the posting's title words (e.g. Frontend, Engineer) in your summary and experience titles where honest.",
      weight: 10,
    });
  } else {
    checks.push({
      label: "Title alignment",
      status: "na",
      detail: "No target title found — set a Target role or paste a JD with a title.",
      tip: "Enter the role you're applying for so title matching can run.",
      weight: 10,
    });
  }

  /* --- Years of experience (15) + knockout --- */
  const reqYears = jdPresent ? extractRequiredYears(jd) : null;
  const haveYears = resumeYears(r);
  if (reqYears !== null) {
    const ok = haveYears >= reqYears;
    checks.push({
      label: `Experience: ${haveYears}y vs ${reqYears}y required`,
      status: ok ? "pass" : "fail",
      detail: ok ? "Meets the posting's stated minimum." : "Below the stated minimum — a common auto-filter.",
      tip: ok ? "Keep month-year date ranges so every ATS parses them." : "Use exact year ranges (2021 – 2024); if close, stress directly-relevant years in your summary.",
      weight: 15,
    });
    knockouts.push({
      label: "Minimum years filter",
      status: ok ? "pass" : haveYears >= reqYears * 0.5 ? "unknown" : "fail",
      detail: ok ? `${haveYears}y satisfies ${reqYears}y.` : `${haveYears}y against ${reqYears}y required — many systems auto-reject here.`,
    });
  } else if (r.experience.length) {
    checks.push({
      label: `Experience section (${r.experience.length} role${r.experience.length > 1 ? "s" : ""}, ~${haveYears}y)`,
      status: r.experience.every((e) => e.bullets.some((b) => b.trim())) ? "pass" : "fail",
      detail: "No years requirement detected in JD — checking structure instead.",
      tip: "Give every role 2–4 bullets with action verbs and metrics.",
      weight: 15,
    });
  } else {
    checks.push({
      label: "Experience section",
      status: "fail",
      detail: "No roles listed.",
      tip: "Add at least one role — internships and freelance count.",
      weight: 15,
    });
  }

  /* --- Education / degree (10) + knockout --- */
  const reqDegree = jdPresent ? extractRequiredDegree(jd) : null;
  const haveDegree = resumeDegreeLevel(r);
  const eduOk = r.education.some((e) => e.school.trim() && e.degree.trim());
  if (reqDegree) {
    const ok = haveDegree.level >= reqDegree.level;
    checks.push({
      label: `Degree: ${haveDegree.label} vs ${reqDegree.label} required`,
      status: ok ? "pass" : "fail",
      detail: ok ? "Meets the education requirement." : "Below the required level — often a hard filter.",
      tip: ok ? "Keep degree + field spelled out (e.g. B.Tech, Computer Science)." : "List your highest degree exactly; add relevant certifications to compensate.",
      weight: 10,
    });
    knockouts.push({
      label: "Degree filter",
      status: ok ? "pass" : "fail",
      detail: ok ? "Requirement met." : `Requires ${reqDegree.label}; resume shows ${haveDegree.label}.`,
    });
  } else {
    checks.push({
      label: "Education listed",
      status: eduOk ? "pass" : "fail",
      detail: eduOk ? "School + degree present." : "No school/degree found.",
      tip: "Add school + degree (field and grade optional).",
      weight: 10,
    });
  }

  /* --- Certifications (bonus note, unweighted unless JD mentions them) --- */
  const jdCerts = jdPresent ? CERT_PATTERNS.some((p) => p.test(jd.toLowerCase())) : false;
  if (jdCerts) {
    const resumeCerts = [...r.achievements.map((a) => `${a.title} ${a.detail}`), ...r.customSections.flatMap((c) => c.bullets)].join(" ").toLowerCase();
    const hit = CERT_PATTERNS.some((p) => p.test(resumeCerts));
    checks.push({
      label: "Required certification present",
      status: hit ? "pass" : "fail",
      detail: hit ? "A mentioned certification appears in your resume." : "The JD mentions a certification you don't list.",
      tip: "Add exact cert names (e.g. AWS Solutions Architect) under Achievements or a Certifications section.",
      weight: 5,
    });
  }

  /* --- Parseability: contact (5) --- */
  const contactOk = !!(r.email.trim() && r.phone.trim());
  checks.push({
    label: "Contact parses (email + phone)",
    status: contactOk ? "pass" : "fail",
    detail: contactOk ? "Machine-readable contact line." : "Email or phone missing.",
    tip: "Plain email + phone on one centered line — no icons-only contact info.",
    weight: 5,
  });

  /* --- Parseability: standard headers (5) --- */
  // Our template always emits standard single-column headers.
  checks.push({
    label: "Standard single-column headers",
    status: "pass",
    detail: "This builder emits Summary / Education / Experience / Projects / Technical Skills — no tables or graphics.",
    tip: "Keep these exact header words; creative headers confuse parsers.",
    weight: 5,
  });

  /* --- Quantified impact (5) --- */
  const quantified = bullets.filter((b) => QUANT_RE.test(b)).length;
  checks.push({
    label: `Quantified impact (${quantified} bullets with numbers)`,
    status: quantified >= 2 ? "pass" : "fail",
    detail: "Numbers (users, %, latency, stars) survive parsing and lift ranking.",
    tip: "Add metrics to at least 2 bullets: users, %, ms, stars, revenue.",
    weight: 5,
  });

  /* --- Action verbs (5) --- */
  const verbsUsed = bullets.filter((b) => ACTION_VERBS.has(b.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, ""))).length;
  checks.push({
    label: `Action verbs (${verbsUsed} bullets)`,
    status: verbsUsed >= 3 ? "pass" : "fail",
    detail: "Strong verbs signal scope to both parsers and humans.",
    tip: "Start bullets with Built, Shipped, Optimized, Led, Automated…",
    weight: 5,
  });

  /* --- Length sanity (5): ~1 page ≈ under 900 words --- */
  const words = [r.summary, ...bullets, ...r.skillGroups.map((g) => g.value)].join(" ").split(/\s+/).filter(Boolean).length;
  checks.push({
    label: `Length (~${words} words, aim < 900)`,
    status: words <= 900 && words >= 80 ? "pass" : "fail",
    detail: words < 80 ? "Very thin — parsers and recruiters both penalize this." : words > 900 ? "Likely spills past 2 pages; tail content gets ignored." : "Fits a crisp 1–2 page resume.",
    tip: "Cut to the most role-relevant bullets; keep it under ~900 words.",
    weight: 5,
  });

  /* --- Score over applicable checks (na excluded) --- */
  const applicable = checks.filter((c) => c.status !== "na");
  const totalW = applicable.reduce((s, c) => s + c.weight, 0) || 1;
  const earned = applicable.reduce((s, c) => s + (c.status === "pass" ? c.weight : 0), 0);
  const score = Math.round((earned / totalW) * 100);

  return { score, jdPresent, matchedKeywords, missingKeywords, checks, knockouts };
}
