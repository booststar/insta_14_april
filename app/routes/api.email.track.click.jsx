import prisma from "../db.server.js";

export async function loader({ request }) {
  const url = new URL(request.url);
  const logId = url.searchParams.get("id");
  const targetUrl = url.searchParams.get("url") || "https://apps.shopify.com/ai-instafeed";

  if (logId) {
    try {
      if (prisma?.emailLog) {
        const existing = await prisma.emailLog.findUnique({ where: { id: logId } });
        await prisma.emailLog.update({
          where: { id: logId },
          data: {
            clickCount: { increment: 1 },
            clickedAt: new Date(),
            lastClickedUrl: targetUrl.slice(0, 500),
            openedAt: existing?.openedAt || new Date(),
            openCount: (existing?.openCount || 0) === 0 ? 1 : undefined,
          },
        });
      } else {
        await prisma.$executeRawUnsafe(
          'UPDATE "EmailLog" SET "clickCount" = "clickCount" + 1, "openCount" = GREATEST("openCount", 1), "clickedAt" = NOW(), "openedAt" = COALESCE("openedAt", NOW()), "lastClickedUrl" = $1 WHERE "id" = $2',
          targetUrl.slice(0, 500),
          logId
        );
      }
    } catch (e) {
      console.warn("[Email Click Tracker Warning]:", e.message);
    }
  }

  // Smooth HTTP 302 Redirect to destination
  return new Response(null, {
    status: 302,
    headers: {
      Location: targetUrl,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
