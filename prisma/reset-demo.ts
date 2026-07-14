import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// @ts-ignore
import { PrismaClient } from "../generated/prisma/index.js";

if (process.env.CONFIRM_DEMO_RESET !== "YES") {
  console.error("公開DBを初期化するには CONFIRM_DEMO_RESET=YES を付けて実行してください。");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
// @ts-ignore
const prisma: any = new PrismaClient({ adapter });

const tables = `
  recommendation_feedback,
  notifications,
  saved_searches,
  item_views,
  favorites,
  item_read_statuses,
  chat_messages,
  items,
  account_courses,
  textbook_courses,
  courses,
  textbooks,
  accounts
`;

async function main() {
  console.log("[reset-demo] 既存データをすべて削除します...");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  console.log("[reset-demo] 既存データの削除が完了しました。");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error("[reset-demo] 初期化に失敗しました。", error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
