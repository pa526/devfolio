import { NextResponse } from "next/server";
import { getPortfolioData } from "@/lib/portfolio";
import { renderResumePdf } from "@/lib/resume";
import { tailorRepos } from "@/lib/matcher";

/**
 * GET /api/resume/[username]?role=&requirements=&template=&bg=&count=
 * Downloads a résumé PDF. When role/requirements are given, only the most
 * suitable repos are included (Gemini-ranked, keyword fallback).
 */
export async function GET(req: Request, { params }: { params: { username: string } }) {
  const url = new URL(req.url);
  const role = url.searchParams.get("role") ?? undefined;
  const requirements = url.searchParams.get("requirements") ?? undefined;
  const template = url.searchParams.get("template") ?? undefined;
  const bg = url.searchParams.get("bg") ?? undefined;
  const count = Number(url.searchParams.get("count") ?? "6") || 6;

  const data = await getPortfolioData(params.username);
  if (!data || data.repos.length === 0) {
    return NextResponse.json({ error: "No portfolio data found for this user" }, { status: 404 });
  }
  try {
    const tailored = await tailorRepos(data.repos, { role, requirements, count });
    const pdf = await renderResumePdf(
      { ...data, repos: tailored.repos },
      { template, bg, role }
    );
    const suffix = role ? `-${role.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "";
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="DevFolio-${data.username}${suffix}-resume.pdf"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (e: any) {
    console.error("PDF render failed:", e);
    return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 });
  }
}
