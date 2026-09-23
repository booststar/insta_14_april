import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";

// 1. Load environment variables from .env
dotenv.config();

const dbUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/instafeed";

const isMysql = dbUrl.startsWith("mysql:") || dbUrl.startsWith("mysql://");
const isPostgres = dbUrl.startsWith("postgres:") || dbUrl.startsWith("postgresql://");

const prismaDir = path.resolve(process.cwd(), "prisma");
const mainSchema = path.join(prismaDir, "schema.prisma");
const localSchema = path.join(prismaDir, "schema.local.prisma");

console.log(`\n======================================================`);
console.log(`[DB Setup] Database Engine: ${isMysql ? "MySQL (XAMPP)" : isPostgres ? "PostgreSQL" : "Custom"}`);
console.log(`[DB Setup] Target Database: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`);
console.log(`======================================================\n`);

try {
  if (isMysql) {
    // Read PostgreSQL schema and generate local MySQL schema
    let schemaContent = fs.readFileSync(mainSchema, "utf8");
    schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/g, 'provider = "mysql"');
    
    fs.writeFileSync(localSchema, schemaContent, "utf8");
    console.log(`[DB Setup] Local MySQL schema created: prisma/schema.local.prisma`);

    const env = { ...process.env, DATABASE_URL: dbUrl };

    console.log(`[DB Setup] Syncing tables with MySQL database...`);
    execSync("npx prisma db push --schema=prisma/schema.local.prisma --accept-data-loss", {
      stdio: "inherit",
      env,
    });

    console.log(`[DB Setup] Generating Prisma Client for MySQL...`);
    execSync("npx prisma generate --schema=prisma/schema.local.prisma", {
      stdio: "inherit",
      env,
    });
  } else {
    // PostgreSQL or default
    console.log(`[DB Setup] Syncing tables with PostgreSQL database...`);
    execSync("npx prisma db push --schema=prisma/schema.prisma --accept-data-loss", {
      stdio: "inherit",
      env: process.env,
    });

    console.log(`[DB Setup] Generating Prisma Client for PostgreSQL...`);
    execSync("npx prisma generate --schema=prisma/schema.prisma", {
      stdio: "inherit",
      env: process.env,
    });
  }

  console.log(`\n[DB Setup] Database setup completed successfully!\n`);
} catch (error) {
  console.error(`\n[DB Setup Error] Failed to sync database:`, error.message);
  if (isMysql) {
    console.error(`\nTip: Please verify that MySQL is RUNNING in your XAMPP Control Panel on port 3306.\n`);
  }
  process.exit(1);
}
