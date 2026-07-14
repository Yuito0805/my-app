import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// @ts-ignore
import { PrismaClient } from "../generated/prisma/index.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 12,
});
const adapter = new PrismaPg(pool);
// @ts-ignore
const prisma: any = new PrismaClient({ adapter });

const now = new Date();
const daysAgo = (days: number, hour = 12) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

async function mapLimit<T, R>(values: T[], limit: number, worker: (value: T, index: number) => Promise<R>) {
  const results = new Array<R>(values.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await worker(values[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function stage<T>(name: string, task: () => Promise<T>) {
  const started = Date.now();
  console.log(`[seed] ${name} を開始...`);
  const result = await task();
  console.log(`[seed] ${name} が完了 (${((Date.now() - started) / 1000).toFixed(1)}秒)`);
  return result;
}

const accountSeeds = Array.from({ length: 24 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  const group = String.fromCharCode(65 + Math.floor(index / 8));
  return {
    accountName: `デモ利用者${group}${number}`,
    email: `webpro-demo-${group.toLowerCase()}${number}@keio.jp`,
  };
});

type BookSeed = { key: string; title: string; author: string; courses: [string, string][] };
const bookSeeds: BookSeed[] = [
  { key: "a01", title: "蒼海情報構造ノート", author: "デモ著者A01", courses: [["蒼海情報構造演習", "デモ教員A01"], ["蒼海データ表現論", "デモ教員A02"]] },
  { key: "a02", title: "星環計算モデル入門", author: "デモ著者A02", courses: [["星環計算モデル論", "デモ教員A03"]] },
  { key: "a03", title: "白樺分散設計ワークブック", author: "デモ著者A03", courses: [["白樺分散設計", "デモ教員A04"], ["白樺サービス構成法", "デモ教員A05"]] },
  { key: "a04", title: "月影データ表現の基礎", author: "デモ著者A04", courses: [["月影データ表現法", "デモ教員A06"]] },
  { key: "a05", title: "翠嶺対話設計ガイド", author: "デモ著者A05", courses: [["翠嶺インタラクション研究", "デモ教員A07"]] },
  { key: "a06", title: "紅葉ネットワーク構成演習", author: "デモ著者A06", courses: [["紅葉ネットワーク構成", "デモ教員A08"], ["紅葉通信設計論", "デモ教員A09"]] },
  { key: "a07", title: "風紋アルゴリズム工房", author: "デモ著者A07", courses: [["風紋アルゴリズム工房", "デモ教員A10"]] },
  { key: "a08", title: "雪原数理モデリング帖", author: "デモ著者A08", courses: [["雪原数理モデリング", "デモ教員A11"]] },
  { key: "a09", title: "黄昏メディア設計読本", author: "デモ著者A09", courses: [["黄昏メディア設計", "デモ教員A12"]] },
  { key: "a10", title: "水鏡知能処理ノート", author: "デモ著者A10", courses: [["水鏡知能処理", "デモ教員B01"], ["水鏡推論構成法", "デモ教員B02"]] },
  { key: "a11", title: "桜雲ソフトウェア構築演習", author: "デモ著者A11", courses: [["桜雲ソフトウェア構築", "デモ教員B03"]] },
  { key: "a12", title: "紫苑クラウド基礎案内", author: "デモ著者A12", courses: [["紫苑クラウド基礎", "デモ教員B04"]] },
  { key: "a13", title: "青嵐信号解析演習帳", author: "デモ著者A13", courses: [["青嵐信号解析", "デモ教員B05"], ["青嵐波形観測論", "デモ教員B06"]] },
  { key: "a14", title: "銀河システム検証入門", author: "デモ著者A14", courses: [["銀河システム検証", "デモ教員B07"]] },
  { key: "a15", title: "朝霧情報倫理ケース集", author: "デモ著者A15", courses: [["朝霧情報倫理", "デモ教員B08"]] },
  { key: "a16", title: "夕凪設計パターン集", author: "デモ著者A16", courses: [["夕凪設計パターン論", "デモ教員B09"]] },
  { key: "a17", title: "天穹データ探索ハンドブック", author: "デモ著者A17", courses: [["天穹データ探索", "デモ教員B10"], ["天穹検索構成演習", "デモ教員B11"]] },
  { key: "a18", title: "深緑可視化デザイン", author: "デモ著者A18", courses: [["深緑情報可視化", "デモ教員B12"]] },
  { key: "a19", title: "金砂プロセス設計演習", author: "デモ著者A19", courses: [["金砂プロセス設計", "デモ教員C01"]] },
  { key: "a20", title: "藍晶計算基盤のしくみ", author: "デモ著者A20", courses: [["藍晶計算基盤論", "デモ教員C02"]] },
  { key: "b01", title: "琥珀データ連携ノート", author: "デモ著者B01", courses: [["琥珀データ連携演習", "デモ教員C03"]] },
  { key: "b02", title: "霧島状態機械ワーク", author: "デモ著者B02", courses: [["霧島状態機械論", "デモ教員C04"]] },
  { key: "b03", title: "若草ユーザー体験設計", author: "デモ著者B03", courses: [["若草体験設計演習", "デモ教員C05"]] },
  { key: "b04", title: "群青並行処理入門", author: "デモ著者B04", courses: [["群青並行処理論", "デモ教員C06"]] },
  { key: "b05", title: "花霞情報検索演習", author: "デモ著者B05", courses: [["花霞情報検索", "デモ教員C07"]] },
  { key: "b06", title: "流星コンポーネント設計", author: "デモ著者B06", courses: [["流星部品設計論", "デモ教員C08"]] },
  { key: "b07", title: "碧空データ品質ガイド", author: "デモ著者B07", courses: [["碧空データ品質演習", "デモ教員C09"]] },
  { key: "b08", title: "藤波言語処理の基礎", author: "デモ著者B08", courses: [["藤波言語処理論", "デモ教員C10"]] },
  { key: "b09", title: "陽炎モデル検査ノート", author: "デモ著者B09", courses: [["陽炎モデル検査", "デモ教員C11"]] },
  { key: "b10", title: "水脈ストレージ設計", author: "デモ著者B10", courses: [["水脈記憶構成論", "デモ教員C12"]] },
  { key: "b11", title: "雲海イベント処理演習", author: "デモ著者B11", courses: [["雲海イベント処理", "デモ教員D01"]] },
  { key: "b12", title: "灯台サービス観測入門", author: "デモ著者B12", courses: [["灯台サービス観測", "デモ教員D02"]] },
  { key: "b13", title: "森羅特徴量設計ノート", author: "デモ著者B13", courses: [["森羅特徴量設計", "デモ教員D03"]] },
  { key: "b14", title: "真珠レコメンド構成法", author: "デモ著者B14", courses: [["真珠推薦構成演習", "デモ教員D04"]] },
  { key: "b15", title: "青磁フロント設計読本", author: "デモ著者B15", courses: [["青磁画面構成論", "デモ教員D05"]] },
  { key: "b16", title: "薄明バックエンド実践", author: "デモ著者B16", courses: [["薄明処理層設計", "デモ教員D06"]] },
  { key: "b17", title: "千鳥テスト設計演習", author: "デモ著者B17", courses: [["千鳥検証設計論", "デモ教員D07"]] },
  { key: "b18", title: "虹彩アクセシビリティ入門", author: "デモ著者B18", courses: [["虹彩利用支援設計", "デモ教員D08"]] },
  { key: "b19", title: "木漏日性能改善ノート", author: "デモ著者B19", courses: [["木漏日性能設計", "デモ教員D09"]] },
  { key: "b20", title: "星霜サービス企画演習", author: "デモ著者B20", courses: [["星霜サービス企画", "デモ教員D10"], ["星霜要求整理法", "デモ教員D11"]] },
];

const conditions = ["新品に近い", "比較的きれい", "書き込み少しあり", "書き込みあり", "表紙に傷あり", "角に折れあり", "全体的に使用感あり"];
const notes = [
  "デモ用説明：カバーを付けて使用した設定です。",
  "デモ用説明：一部の章に架空のマーカー跡があります。",
  "デモ用説明：表紙に軽い擦れがある設定です。",
  "デモ用説明：章末問題に鉛筆の印がある設定です。",
  "デモ用説明：使用回数が少ない想定の出品です。",
  "デモ用説明：背表紙に軽い日焼けがある設定です。",
  "デモ用説明：付箋を貼っていた跡がある設定です。",
  "デモ用説明：架空の付属資料が揃っている設定です。",
];

const itemSeedKey = (number: number) => `fictional-item-${String(number).padStart(3, "0")}`;
const chatSeedKey = (number: number) => `fictional-chat-${String(number).padStart(3, "0")}`;

async function main() {
  const accountsByEmail = new Map<string, any>();
  const textbooksByKey = new Map<string, any>();
  const coursesByComposite = new Map<string, any>();
  const itemsByNumber = new Map<number, any>();

  await stage("架空アカウント24件", async () => {
    const rows = await mapLimit(accountSeeds, 6, async (account) => prisma.account.upsert({
      where: { email: account.email },
      update: { accountName: account.accountName },
      create: account,
    }));
    rows.forEach((row, index) => accountsByEmail.set(accountSeeds[index].email, row));
  });

  await stage("架空教科書40冊・架空教科マスタ", async () => {
    await mapLimit(bookSeeds, 5, async (book) => {
      const textbook = await prisma.textbook.upsert({
        where: { title_author: { title: book.title, author: book.author } },
        update: {},
        create: { title: book.title, author: book.author },
      });
      textbooksByKey.set(book.key, textbook);

      for (const [courseName, teacherName] of book.courses) {
        const composite = `${courseName}::${teacherName}`;
        let course = coursesByComposite.get(composite);
        if (!course) {
          course = await prisma.course.upsert({
            where: { courseName_teacherName: { courseName, teacherName } },
            update: {},
            create: { courseName, teacherName },
          });
          coursesByComposite.set(composite, course);
        }
        await prisma.textbookCourse.upsert({
          where: { textbookId_courseId: { textbookId: textbook.id, courseId: course.id } },
          update: {},
          create: { textbookId: textbook.id, courseId: course.id },
        });
      }
    });
  });

  const accountRows = accountSeeds.map((seed) => accountsByEmail.get(seed.email));
  const itemSeeds = Array.from({ length: 80 }, (_, index) => {
    const number = index + 1;
    const seller = accountRows[(index * 5 + 1) % accountRows.length];
    const textbookSeed = bookSeeds[(index * 7 + Math.floor(index / 6)) % bookSeeds.length];
    const isCanceled = number % 19 === 0;
    const isCompleted = !isCanceled && number % 13 === 0;
    const hasReceiver = !isCanceled && (isCompleted || number % 7 === 0 || number % 17 === 0);
    let receiver = hasReceiver ? accountRows[(index * 3 + 8) % accountRows.length] : null;
    if (receiver?.id === seller.id) receiver = accountRows[(index * 3 + 9) % accountRows.length];
    const canceledHours = isCanceled ? (number % 2 === 0 ? 12 : 40 + number) : null;
    return {
      number,
      seller,
      receiver,
      textbook: textbooksByKey.get(textbookSeed.key),
      condition: conditions[(index * 3 + number) % conditions.length],
      conditionNote: notes[(index * 5 + 2) % notes.length],
      isCanceled,
      canceledAt: canceledHours === null ? null : hoursAgo(canceledHours),
      completedAt: isCompleted ? daysAgo((number % 11) + 1, 16) : null,
      createdAt: daysAgo((index * 4) % 46, 8 + (index % 10)),
    };
  });

  await stage("架空出品80件", async () => {
    const rows = await mapLimit(itemSeeds, 6, async (seed) => {
      const data = {
        sellerAccountId: seed.seller.id,
        receiverAccountId: seed.receiver?.id ?? null,
        textbookId: seed.textbook.id,
        condition: seed.condition,
        conditionNote: seed.conditionNote,
        isCanceled: seed.isCanceled,
        canceledAt: seed.canceledAt,
        completedAt: seed.completedAt,
        createdAt: seed.createdAt,
      };
      return prisma.item.upsert({
        where: { seedKey: itemSeedKey(seed.number) },
        update: data,
        create: { seedKey: itemSeedKey(seed.number), ...data },
      });
    });
    rows.forEach((row, index) => itemsByNumber.set(itemSeeds[index].number, row));
  });

  const messageTemplates = [
    ["デモ質問：この架空教科書はまだ受け取り可能ですか？", "デモ返信：現在も募集中という設定です。"],
    ["デモ質問：書き込みの量を確認できますか？", "デモ返信：一部の章に少しだけある設定です。"],
    ["デモ質問：架空授業で使う版と同じですか？", "デモ返信：登録済み情報と一致する設定です。"],
    ["デモ質問：付属資料は残っていますか？", "デモ返信：架空の付属資料が揃っている設定です。"],
    ["デモ質問：受け取り希望として相談を進めてもよいですか？", "デモ返信：チャットで相談を進める設定です。"],
    ["デモ質問：本文に目立つ傷はありますか？", "デモ返信：破れや欠損はない設定です。"],
    ["デモ質問：関連する架空教科で利用できますか？", "デモ返信：関連教科に登録されている設定です。"],
  ];
  const chatSeeds: { number: number; item: any; sender: any; message: string; sentAt: Date }[] = [];
  let chatNumber = 1;
  for (let number = 1; number <= 80 && chatNumber <= 104; number += 1) {
    const item = itemsByNumber.get(number);
    const seed = itemSeeds[number - 1];
    if (!item || seed.isCanceled || number % 3 === 0) continue;
    let inquirer = seed.receiver ?? accountRows[(number * 7 + 3) % accountRows.length];
    if (inquirer.id === seed.seller.id) inquirer = accountRows[(number * 7 + 4) % accountRows.length];
    const template = messageTemplates[number % messageTemplates.length];
    chatSeeds.push({ number: chatNumber++, item, sender: inquirer, message: template[0], sentAt: hoursAgo(170 - Math.min(number * 2, 150)) });
    if (chatNumber <= 104) {
      chatSeeds.push({ number: chatNumber++, item, sender: seed.seller, message: template[1], sentAt: hoursAgo(168 - Math.min(number * 2, 150)) });
    }
  }

  await stage(`架空チャット${chatSeeds.length}件`, async () => {
    await mapLimit(chatSeeds, 8, async (seed) => prisma.chatMessage.upsert({
      where: { seedKey: chatSeedKey(seed.number) },
      update: { itemId: seed.item.id, senderAccountId: seed.sender.id, message: seed.message, sentAt: seed.sentAt },
      create: { seedKey: chatSeedKey(seed.number), itemId: seed.item.id, senderAccountId: seed.sender.id, message: seed.message, sentAt: seed.sentAt },
    }));
  });

  const courseRows = [...coursesByComposite.values()];
  const enrollmentData: { accountId: number; courseId: number }[] = [];
  accountRows.forEach((account, accountIndex) => {
    const desired = 4 + (accountIndex % 3);
    for (let offset = 0; offset < desired; offset += 1) {
      const course = courseRows[(accountIndex * 5 + offset * 7) % courseRows.length];
      enrollmentData.push({ accountId: account.id, courseId: course.id });
    }
  });
  await stage(`架空履修科目${enrollmentData.length}件`, async () => {
    await prisma.accountCourse.createMany({ data: enrollmentData, skipDuplicates: true });
  });

  const openItems = itemSeeds
    .filter((seed) => !seed.isCanceled && !seed.completedAt)
    .map((seed) => itemsByNumber.get(seed.number));
  const favoriteData: { accountId: number; itemId: number; createdAt: Date }[] = [];
  const viewData: { accountId: number; itemId: number; viewedAt: Date; viewCount: number }[] = [];
  accountRows.forEach((account, accountIndex) => {
    for (let offset = 0; offset < 6; offset += 1) {
      const item = openItems[(accountIndex * 9 + offset * 5) % openItems.length];
      if (item && item.sellerAccountId !== account.id) {
        favoriteData.push({ accountId: account.id, itemId: item.id, createdAt: daysAgo((accountIndex + offset) % 12, 18) });
      }
    }
    for (let offset = 0; offset < 8; offset += 1) {
      const item = openItems[(accountIndex * 11 + offset * 3 + 2) % openItems.length];
      if (item && item.sellerAccountId !== account.id) {
        viewData.push({
          accountId: account.id,
          itemId: item.id,
          viewedAt: daysAgo((accountIndex * 2 + offset) % 15, 19),
          viewCount: 1 + ((accountIndex + offset * 2) % 9),
        });
      }
    }
  });

  await stage(`架空お気に入り約${favoriteData.length}件・閲覧履歴約${viewData.length}件`, async () => {
    await mapLimit(favoriteData, 10, async (data) => prisma.favorite.upsert({
      where: { accountId_itemId: { accountId: data.accountId, itemId: data.itemId } },
      update: { createdAt: data.createdAt },
      create: data,
    }));
    await mapLimit(viewData, 10, async (data) => prisma.itemView.upsert({
      where: { accountId_itemId: { accountId: data.accountId, itemId: data.itemId } },
      update: { viewedAt: data.viewedAt, viewCount: data.viewCount },
      create: data,
    }));
  });

  const savedSearchTemplates = [
    ["架空教科の新着", "", "course", "all", "open", "newest"],
    ["状態のよいデモ本", "", "all", "比較的きれい", "open", "newest"],
    ["蒼海シリーズ", "蒼海", "all", "all", "open", "popular"],
    ["デモ教員から探す", "デモ教員", "teacher", "all", "open", "updated"],
  ];
  const savedSearchRows: any[] = [];
  await stage("架空保存検索24件", async () => {
    for (let accountIndex = 0; accountIndex < accountRows.length; accountIndex += 1) {
      const account = accountRows[accountIndex];
      const template = savedSearchTemplates[accountIndex % savedSearchTemplates.length];
      const course = courseRows[(accountIndex * 4) % courseRows.length];
      const name = `${template[0]} ${String(accountIndex + 1).padStart(2, "0")}`;
      const keyword = accountIndex % 3 === 0 ? course.courseName : template[1];
      const row = await prisma.savedSearch.upsert({
        where: { accountId_name: { accountId: account.id, name } },
        update: {
          keyword: keyword || null,
          searchTarget: template[2], condition: template[3], itemStatus: template[4], sortOrder: template[5],
          lastCheckedAt: daysAgo(2 + (accountIndex % 10)),
        },
        create: {
          accountId: account.id, name, keyword: keyword || null,
          searchTarget: template[2], condition: template[3], itemStatus: template[4], sortOrder: template[5],
          lastCheckedAt: daysAgo(2 + (accountIndex % 10)),
        },
      });
      savedSearchRows.push(row);
    }
  });

  const feedbackData = accountRows.slice(0, 14).map((account, index) => {
    let item = openItems[(index * 7 + 4) % openItems.length];
    if (item.sellerAccountId === account.id) item = openItems[(index * 7 + 5) % openItems.length];
    return { accountId: account.id, itemId: item.id, feedback: "not_interested" };
  });
  await stage("架空推薦フィードバック14件", async () => {
    await mapLimit(feedbackData, 8, async (data) => prisma.recommendationFeedback.upsert({
      where: { accountId_itemId: { accountId: data.accountId, itemId: data.itemId } },
      update: { feedback: data.feedback },
      create: data,
    }));
  });

  const notificationData = accountRows.slice(0, 18).map((account, index) => {
    let item = openItems[(index * 5 + 1) % openItems.length];
    if (item.sellerAccountId === account.id) item = openItems[(index * 5 + 2) % openItems.length];
    const type = index % 3 === 0 ? "saved_search" : index % 3 === 1 ? "favorite_update" : "chat";
    const savedSearch = type === "saved_search" ? savedSearchRows[index % savedSearchRows.length] : null;
    const message = type === "saved_search"
      ? `架空の保存検索「${savedSearch.name}」に合う新しい出品があります。`
      : type === "favorite_update"
        ? "お気に入りに登録した架空教科書の情報が更新されました。"
        : "架空の譲渡品チャットに新しいデモメッセージがあります。";
    return {
      accountId: account.id,
      type,
      itemId: item.id,
      savedSearchId: savedSearch?.accountId === account.id ? savedSearch.id : null,
      message,
      isRead: index % 4 === 0,
      dedupeKey: `fictional-v12-notification-${String(index + 1).padStart(2, "0")}`,
      createdAt: hoursAgo((index + 1) * 3),
    };
  });
  await stage("架空通知18件", async () => {
    await mapLimit(notificationData, 8, async (data) => prisma.notification.upsert({
      where: { dedupeKey: data.dedupeKey },
      update: data,
      create: data,
    }));
  });

  const readStatusData = chatSeeds.slice(0, 24).map((chat, index) => ({
    accountId: accountRows[index % accountRows.length].id,
    itemId: chat.item.id,
    lastReadAt: hoursAgo(160 - Math.min(index * 5, 140)),
  })).filter((value, index, self) => self.findIndex((other) => other.accountId === value.accountId && other.itemId === value.itemId) === index);
  await stage(`架空既読状態${readStatusData.length}件`, async () => {
    await mapLimit(readStatusData, 8, async (data) => prisma.itemReadStatus.upsert({
      where: { accountId_itemId: { accountId: data.accountId, itemId: data.itemId } },
      update: { lastReadAt: data.lastReadAt },
      create: data,
    }));
  });

  const counts = await Promise.all([
    prisma.account.count(), prisma.textbook.count(), prisma.course.count(), prisma.item.count(),
    prisma.chatMessage.count(), prisma.accountCourse.count(), prisma.favorite.count(), prisma.itemView.count(),
  ]);
  console.log("[seed] 架空データの投入がすべて完了しました。");
  console.log(`[seed] DB合計: 架空アカウント ${counts[0]}件 / 架空教科書 ${counts[1]}冊 / 架空教科 ${counts[2]}件 / 出品 ${counts[3]}件 / チャット ${counts[4]}件 / 履修 ${counts[5]}件 / お気に入り ${counts[6]}件 / 閲覧履歴 ${counts[7]}件`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error("[seed] エラーが発生しました。", error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
