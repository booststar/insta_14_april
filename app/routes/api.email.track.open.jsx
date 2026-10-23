import prisma from "../db.server.js";

// 1x1 transparent GIF byte buffer
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function loader({ request }) {
  const url = new URL(request.url);
  const logId = url.searchParams.get("id");

  if (logId) {
    try {
      if (prisma?.emailLog) {
        await prisma.emailLog.update({
          where: { id: logId },
          data: {
            openCount: { increment: 1 },
            openedAt: new Date(),
          },
        });
      } else {
        await prisma.$executeRawUnsafe(
          'UPDATE "EmailLog" SET "openCount" = "openCount" + 1, "openedAt" = COALESCE("openedAt", NOW()) WHERE "id" = $1',
          logId
        );
      }
    } catch (e) {
      console.warn("[Email Open Tracker Warning]:", e.message);
    }
  }

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
