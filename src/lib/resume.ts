import PDFDocument from "pdfkit";
import type { PortfolioData } from "@/lib/portfolio";
import { normalizeBg, normalizeTemplate, BG_COLORS } from "@/lib/resume-style";

export interface ResumeStyleOptions {
  template?: string;
  bg?: string;
  role?: string;
}

function professionalSummary(p: PortfolioData, role?: string): string {
  const topLangs = [...new Set(p.repos.map((r) => r.language).filter(Boolean))].slice(0, 3);
  const langBit = topLangs.length ? ` specializing in ${topLangs.join(", ")}` : "";
  const starBit = p.totalStars > 0 ? ` Their open-source work has earned ${p.totalStars} GitHub stars.` : "";
  const roleBit = role ? ` Tailored for ${role} roles.` : "";
  return `Software developer${langBit} with ${p.repos.length} public projects on GitHub.${starBit}${roleBit} Selected work below highlights real, shipped code with measurable community interest.`;
}

export function renderResumePdf(p: PortfolioData, style: ResumeStyleOptions = {}): Promise<Buffer> {
  const template = normalizeTemplate(style.template);
  const bgHex = BG_COLORS[normalizeBg(style.bg)].hex;
  const role = style.role?.trim() || undefined;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const paintBg = () => {
      doc.save();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(bgHex);
      doc.restore();
    };
    paintBg();
    doc.on("pageAdded", paintBg);

    const accent: [number, number, number] =
      template === "minimal" ? [24, 24, 27] : [109, 40, 217];
    const gray: [number, number, number] = [82, 82, 91];
    const ink: [number, number, number] = [24, 24, 27];

    const rule = () => {
      doc.moveDown(0.4);
      doc.strokeColor([228, 228, 231]).lineWidth(1);
      doc.moveTo(48, doc.y).lineTo(547, doc.y).stroke();
      doc.moveDown(0.6);
    };
    const section = (title: string) => {
      doc.fillColor(accent).font("Helvetica-Bold").fontSize(11);
      doc.text(title.toUpperCase(), { characterSpacing: 1 });
      rule();
    };

    // Header
    if (template === "bold") {
      const bandH = 118;
      doc.save();
      doc.rect(0, 0, doc.page.width, bandH).fill([24, 24, 27]);
      doc.restore();
      doc.fillColor([255, 255, 255]).font("Helvetica-Bold").fontSize(26).text(p.name, 48, 32);
      doc.fillColor([212, 212, 216]).font("Helvetica").fontSize(10.5);
      doc.text(`@${p.username}  ·  ${p.githubUrl}  ·  ${p.repos.length} public repos  ·  ${p.totalStars} stars`, 48);
      if (role) {
        doc.fillColor([221, 214, 254]).font("Helvetica-Bold").fontSize(10).text(`Target role: ${role}`, 48);
      }
      doc.y = bandH + 18;
    } else {
      doc.fillColor(ink).font("Helvetica-Bold").fontSize(26).text(p.name);
      doc.fillColor(gray).font("Helvetica").fontSize(10.5);
      doc.text(`@${p.username}  ·  ${p.githubUrl}  ·  ${p.repos.length} public repos  ·  ${p.totalStars} stars`);
      if (role) {
        doc.fillColor(accent).font("Helvetica-Bold").fontSize(10.5).text(`Target role: ${role}`);
      }
      rule();
    }

    // Summary
    section("Professional Summary");
    doc.fillColor(ink).font("Helvetica").fontSize(10.5);
    doc.text(p.bio?.trim() ? `${p.bio.trim()} ${professionalSummary(p, role)}` : professionalSummary(p, role), { align: "justify" });
    doc.moveDown(0.8);

    // Skills
    const skills = [...new Set(p.repos.flatMap((r) => [r.language, ...r.aiTags]).filter(Boolean))] as string[];
    const skillList = (p.skills.length ? p.skills : skills.slice(0, 18));
    if (skillList.length) {
      section("Technical Skills");
      doc.fillColor(ink).font("Helvetica").fontSize(10.5);
      doc.text(skillList.join("  ·  "));
      doc.moveDown(0.8);
    }

    // Projects
    section(role ? `Relevant Projects — ${role}` : "Selected Projects");
    const top = [...p.repos]
      .sort((a, b) => Number(b.isPinned ?? false) - Number(a.isPinned ?? false) || b.stars - a.stars)
      .slice(0, 12);
    for (const r of top) {
      doc.fillColor(ink).font("Helvetica-Bold").fontSize(11.5);
      const meta = [r.language, r.stars > 0 ? `★ ${r.stars}` : null].filter(Boolean).join("  ·  ");
      doc.text(r.name, { continued: false });
      if (meta) doc.fillColor(gray).font("Helvetica").fontSize(9.5).text(meta);
      const body = r.tailoredBullet?.trim() || r.aiSummary?.trim() || r.description?.trim() || "Open-source project — see GitHub for details.";
      doc.fillColor(ink).font("Helvetica").fontSize(10).text(body, { align: "left" });
      if (!r.tailoredBullet && r.aiHighlight?.trim()) {
        if (template === "minimal") {
          doc.fillColor(gray).font("Helvetica-Oblique").fontSize(10).text(`– ${r.aiHighlight.trim()}`);
        } else {
          doc.fillColor(accent).font("Helvetica-Oblique").fontSize(10).text(`✦ ${r.aiHighlight.trim()}`);
        }
      }
      if (r.aiTags.length) {
        doc.fillColor(gray).font("Helvetica").fontSize(9).text(r.aiTags.join(", "));
      }
      if (r.url) {
        doc.fillColor(template === "minimal" ? gray : accent).font("Helvetica").fontSize(9).text(r.url, { link: r.url });
      }
      doc.moveDown(0.9);
    }

    doc.fillColor([161, 161, 170]).font("Helvetica").fontSize(8.5);
    doc.text("Generated with DevFolio — AI-powered GitHub portfolio.", { align: "center" });

    doc.end();
  });
}
