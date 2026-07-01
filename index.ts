import "dotenv/config";
import express, { Request, Response } from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// @ts-ignore
import { PrismaClient } from "./generated/prisma/index.js";

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true // Renderの外部接続にはこれが必要なことが多いんじゃ
});
const adapter = new PrismaPg(pool);
// @ts-ignore
const prisma: any = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req: Request, res: Response) => {
  try {
    // ここでエラーが出ないか確認じゃ
    const users = await prisma.user.findMany();
    res.render("index", { users });
  } catch (err) {
    console.error(err);
    res.status(500).send("データベースの読み込みに失敗したぞ");
  }
});

app.post("/users", async (req: Request, res: Response) => {
  const name = req.body.name;
  if (name) {
    await prisma.user.create({ data: { name } });
  }
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ http://localhost:${PORT}`);
});
