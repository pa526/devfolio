import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, dbReady } from "@/lib/db";

/** PATCH /api/repo — edit summary, pin/hide */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await dbReady())) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const body = await req.json();
  const { id, aiSummary, aiHighlight, aiTags, isPinned, isHidden } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const username = (session as any)?.username as string | undefined;
  const user = username ? await db.user.findUnique({ where: { username } }) : null;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await db.repo.updateMany({
    where: { id, userId: user.id },
    data: {
      ...(aiSummary !== undefined ? { aiSummary } : {}),
      ...(aiHighlight !== undefined ? { aiHighlight } : {}),
      ...(aiTags !== undefined ? { aiTags: JSON.stringify(aiTags) } : {}),
      ...(isPinned !== undefined ? { isPinned: !!isPinned } : {}),
      ...(isHidden !== undefined ? { isHidden: !!isHidden } : {}),
    },
  });
  const repo = await db.repo.findFirst({ where: { id, userId: user.id } });
  return NextResponse.json({ updated: updated.count, repo });
}
