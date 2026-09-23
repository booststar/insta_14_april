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

function safeGenerate(schemaPath, env) {
  try {
    console.log(`[DB Setup] Generating Prisma Client...`);
    execSync(`npx prisma generate --schema=${schemaPath}`, {
      stdio: "pipe",
      env,
    });
    console.log(`[DB Setup] Prisma Client generated successfully.`);
  } catch (err) {
    const combinedOutput = (err.stdout ? err.stdout.toString() : "") + (err.stderr ? err.stderr.toString() : "") + (err.message || "");
    const clientExists = fs.existsSync(path.resolve(process.cwd(), "node_modules/@prisma/client/index.js"));
    if (clientExists && combinedOutput.includes("EPERM")) {
      console.log(`[DB Setup] Note: Prisma Client is already generated and currently in use by a running server (skipping re-write).`);
    } else {
      console.error(combinedOutput);
      throw err;
    }
  }
}

try {
  if (isMysql) {
    // Read PostgreSQL schema and generate local MySQL schema
    let schemaContent = fs.readFileSync(mainSchema, "utf8");
    schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/g, 'provider = "mysql"');
    
    fs.writeFileSync(localSchema, schemaContent, "utf8");
    console.log(`[DB Setup] Local MySQL schema verified: prisma/schema.local.prisma`);

    const env = { ...process.env, DATABASE_URL: dbUrl };

    console.log(`[DB Setup] Syncing tables with MySQL database...`);
    execSync("npx prisma db push --schema=prisma/schema.local.prisma --skip-generate --accept-data-loss", {
      stdio: "inherit",
      env,
    });

    safeGenerate("prisma/schema.local.prisma", env);
  } else {
    // PostgreSQL or default
    console.log(`[DB Setup] Syncing tables with PostgreSQL database...`);
    execSync("npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss", {
      stdio: "inherit",
      env: process.env,
    });

    safeGenerate("prisma/schema.prisma", process.env);
  }

  console.log(`\n[DB Setup] Database setup completed successfully!\n`);
} catch (error) {
  console.error(`\n[DB Setup Error] Failed to sync database:`, error.message);
  if (isMysql) {
    console.error(`\nTip: Please verify that MySQL is RUNNING in your XAMPP Control Panel on port 3306.\n`);
  }
  process.exit(1);
}
