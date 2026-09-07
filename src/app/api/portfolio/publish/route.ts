import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, dbReady } from "@/lib/db";

/** POST /api/portfolio/publish — { publish: boolean } */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await dbReady())) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const { publish } = await req.json().catch(() => ({ publish: true }));
  const username = (session as any)?.username as string | undefined;
  if (!username) return NextResponse.json({ error: "No username" }, { status: 400 });

  const user = await db.user.update({
    where: { username },
    data: {
      isPublished: !!publish,
      publishedSlug: username.toLowerCase(),
    },
  });
  return NextResponse.json({ isPublished: user.isPublished, slug: user.publishedSlug });
}
