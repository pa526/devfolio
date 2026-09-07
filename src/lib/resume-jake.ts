import PDFDocument from "pdfkit";
import type { BuilderResume } from "@/lib/builder";

/**
 * Jake's-resume style PDF (after Jake Gutierrez's LaTeX template):
 * centered name header, single column, SMALL-CAPS ruled sections,
 * bold-left / right-aligned-date rows, indented bullets. No tables,
 * no graphics — fully ATS-parseable.
 */
export function renderJakePdf(input: BuilderResume): Promise<Buffer> {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const r: BuilderResume = {
    ...input,
    fullName: str(input.fullName),
    email: str(input.email),
    phone: str(input.phone),
    location: str(input.location),
    github: str(input.github),
    linkedin: str(input.linkedin),
    leetcode: str(input.leetcode),
    website: str(input.website),
    otherLinkLabel: str(input.otherLinkLabel),
    otherLinkUrl: str(input.otherLinkUrl),
    targetRole: str(input.targetRole),
    summary: str(input.summary),
    education: arr<any>(input.education).map((e) => ({
      school: str(e?.school), degree: str(e?.degree), field: str(e?.field),
      location: str(e?.location), start: str(e?.start), end: str(e?.end), grade: str(e?.grade),
    })),
    experience: arr<any>(input.experience).map((e) => ({
      title: str(e?.title), company: str(e?.company), location: str(e?.location),
      start: str(e?.start), end: str(e?.end),
      bullets: arr(e?.bullets).map(str).filter(Boolean),
    })),
    projects: arr<any>(input.projects).map((p) => ({
      name: str(p?.name), tech: str(p?.tech), link: str(p?.link),
      bullets: arr(p?.bullets).map(str).filter(Boolean),
    })),
    achievements: arr<any>(input.achievements).map((a) => ({ title: str(a?.title), detail: str(a?.detail) })),
    skillGroups: arr<any>(input.skillGroups).map((g) => ({ label: str(g?.label), value: str(g?.value) })),
    customSections: arr<any>(input.customSections).map((c) => ({ title: str(c?.title), bullets: arr(c?.bullets).map(str).filter(Boolean) })),
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const LEFT = 40;
    const RIGHT = 572; // 612 - 40
    const WIDTH = RIGHT - LEFT;

    const section = (title: string) => {
      doc.moveDown(0.6);
      doc.fillColor("#000000").font("Helvetica-Bold").fontSize(11);
      doc.text(title.toUpperCase(), LEFT, doc.y, { width: WIDTH });
      doc.moveDown(0.15);
      doc.strokeColor("#000000").lineWidth(0.8);
      doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).stroke();
      doc.moveDown(0.45);
    };

    /** Jake-style row: bold item left, date/location right on the same line. */
    const row = (left: string, right: string, opts: { bold?: boolean; size?: number } = {}) => {
      const size = opts.size ?? 10.5;
      if (!left && !right) return;
      if (!right) {
        doc.fillColor("#000000").font(opts.bold === false ? "Helvetica" : "Helvetica-Bold").fontSize(size);
        doc.text(left, LEFT, doc.y, { width: WIDTH });
        return;
      }
      if (!left) {
        doc.fillColor("#000000").font("Helvetica").fontSize(size);
        doc.text(right, LEFT, doc.y, { width: WIDTH, align: "right" });
        return;
      }
      // continued fragment + right-aligned tail = same-line left/right layout
      doc.fillColor("#000000").font(opts.bold === false ? "Helvetica" : "Helvetica-Bold").fontSize(size);
      doc.text(left, LEFT, doc.y, { width: WIDTH, continued: true });
      doc.font("Helvetica").fontSize(size);
      doc.text(`  ${right}`, { align: "right" });
    };

    const bullets = (items: string[]) => {
      const clean = items.map(str).filter(Boolean);
      if (!clean.length) return;
      doc.fillColor("#000000").font("Helvetica").fontSize(10);
      for (const b of clean) {
        doc.text(`\u2022  ${b}`, LEFT + 14, doc.y, { width: WIDTH - 14 });
        doc.moveDown(0.12);
      }
    };

    // ---------- Header (centered) ----------
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(21);
    doc.text(r.fullName || "Your Name", LEFT, doc.y, { width: WIDTH, align: "center" });
    doc.moveDown(0.25);

    // Contact line with individually clickable links, separated by " | "
    const contacts: { label: string; link?: string }[] = [];
    if (r.phone) contacts.push({ label: r.phone });
    if (r.location) contacts.push({ label: r.location });
    if (r.email) contacts.push({ label: r.email, link: `mailto:${r.email}` });
    if (r.linkedin) contacts.push({ label: "LinkedIn", link: r.linkedin });
    if (r.github) contacts.push({ label: "GitHub", link: r.github });
    if (r.leetcode) contacts.push({ label: "LeetCode", link: r.leetcode });
    if (r.website) contacts.push({ label: "Portfolio", link: r.website });
    if (r.otherLinkUrl) contacts.push({ label: r.otherLinkLabel || "Link", link: r.otherLinkUrl });
    if (contacts.length) {
      doc.font("Helvetica").fontSize(9.5).fillColor("#000000");
      const SEP = "  |  ";
      const sepW = doc.widthOfString(SEP);
      const labelW = (label: string) => doc.widthOfString(label);
      // Greedy line-break so long contact lists wrap instead of running off-page.
      const lines: typeof contacts[] = [[]];
      let curW = 0;
      for (const c of contacts) {
        const w = labelW(c.label);
        const add = (lines[lines.length - 1].length ? sepW : 0) + w;
        if (curW + add > WIDTH && lines[lines.length - 1].length) {
          lines.push([c]);
          curW = w;
        } else {
          lines[lines.length - 1].push(c);
          curW += add;
        }
      }
      // Render each line as ONE centered run (per-fragment x is unreliable
      // with continued text), then overlay clickable link rectangles.
      const lineH = 13;
      let y = doc.y;
      for (const line of lines) {
        const plain = line.map((c) => c.label).join(SEP);
        const lineW = labelW(plain);
        const x0 = LEFT + Math.max(0, (WIDTH - lineW) / 2);
        doc.fillColor("#000000");
        doc.text(plain, x0, y, { width: lineW, align: "left" });
        let acc = 0;
        line.forEach((c, i) => {
          if (i > 0) acc += sepW;
          if (c.link) doc.link(x0 + acc, y, labelW(c.label), lineH, c.link);
          acc += labelW(c.label);
        });
        y += lineH;
      }
      doc.x = LEFT;
      doc.y = y;
      doc.moveDown(0.3);
    }

    // ---------- Summary (left-aligned like Jake's template) ----------
    if (r.summary) {
      section("Summary");
      doc.fillColor("#000000").font("Helvetica").fontSize(10);
      doc.text(r.summary, LEFT, doc.y, { width: WIDTH });
    }

    // ---------- Education ----------
    const edu = r.education.filter((e) => e.school || e.degree);
    if (edu.length) {
      section("Education");
      for (const e of edu) {
        row(e.school, e.location);
        const degree = [e.degree, e.field].filter(Boolean).join(", ");
        const left = e.grade ? `${degree}  --  GPA: ${e.grade}` : degree;
        row(left, [e.start, e.end].filter(Boolean).join(" -- "), { bold: false, size: 10 });
        doc.moveDown(0.35);
      }
    }

    // ---------- Experience ----------
    const exp = r.experience.filter((e) => e.title || e.company);
    if (exp.length) {
      section("Experience");
      for (const e of exp) {
        row(e.title, [e.start, e.end].filter(Boolean).join(" -- "));
        row(e.company, e.location, { bold: false, size: 10 });
        doc.moveDown(0.1);
        bullets(e.bullets);
        doc.moveDown(0.35);
      }
    }

    // ---------- Projects ----------
    const FILLER = [/showcases hands-on experience/i, /edit manually/i];
    const notFiller = (items: string[]) => items.filter((b) => !FILLER.some((p) => p.test(b)));
    const projs = r.projects.filter((p) => p.name);
    if (projs.length) {
      section("Projects");
      for (const p of projs) {
        doc.fillColor("#000000").font("Helvetica-Bold").fontSize(10.5);
        if (p.tech) {
          doc.text(p.name, LEFT, doc.y, { width: WIDTH, continued: true });
          doc.font("Helvetica").fontSize(10).text(`  |  ${p.tech}`);
        } else {
          doc.text(p.name, LEFT, doc.y, { width: WIDTH });
        }
        if (p.link) {
          doc.fillColor("#1e40af").font("Helvetica").fontSize(9);
          doc.text(p.link, LEFT, doc.y, { width: WIDTH, link: p.link });
          doc.fillColor("#000000");
        }
        doc.moveDown(0.1);
        bullets(notFiller(p.bullets));
        doc.moveDown(0.35);
      }
    }

    // ---------- Skills ----------
    const groups = r.skillGroups.filter((g) => g.value);
    if (groups.length) {
      section("Technical Skills");
      for (const g of groups) {
        doc.fillColor("#000000").font("Helvetica-Bold").fontSize(10);
        doc.text(`${g.label || "Skills"}: `, LEFT, doc.y, { width: WIDTH, continued: true });
        doc.font("Helvetica").text(g.value);
      }
    }

    // ---------- Achievements ----------
    const ach = r.achievements.filter((a) => a.title || a.detail);
    if (ach.length) {
      section("Achievements");
      doc.fillColor("#000000").font("Helvetica").fontSize(10);
      for (const a of ach) {
        const line = a.title && a.detail ? `${a.title} -- ${a.detail}` : a.title || a.detail;
        doc.text(`\u2022  ${line}`, LEFT + 14, doc.y, { width: WIDTH - 14 });
        doc.moveDown(0.12);
      }
    }

    // ---------- Custom sections ----------
    for (const c of r.customSections.filter((s) => s.title)) {
      section(c.title);
      bullets(c.bullets);
    }

    doc.end();
  });
}
