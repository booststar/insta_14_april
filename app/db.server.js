import "dotenv/config";
import { PrismaClient } from "@prisma/client";

if (!global.prismaGlobal || !global.prismaGlobal.emailLog) {
  if (global.prismaGlobal?.$disconnect) {
    global.prismaGlobal.$disconnect().catch(() => {});
  }
  global.prismaGlobal = new PrismaClient();
}

const prisma = global.prismaGlobal;

export default prisma;
