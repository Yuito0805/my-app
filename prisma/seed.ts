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

async function mapBatches<T, R>(values: T[], size: number, fn: (value: T, index: number) => Promise<R>) {
  const results: R[] = [];
  for (let start = 0; start < values.length; start += size) {
    const batch = values.slice(start, start + size);
    results.push(...await Promise.all(batch.map((value, index) => fn(value, start + index))));
  }
  return results;
}

type CourseSeed = {
  courseName: string;
  teacherName: string;
  faculty: string;
  term: string;
  campus: string;
};
type BookSeed = {
  key: string;
  title: string;
  author: string;
  courses: CourseSeed[];
};

const course = (
  courseName: string,
  teacherName: string,
  faculty = "理工学部",
  term = "春学期",
  campus = "矢上",
): CourseSeed => ({ courseName, teacherName, faculty, term, campus });

async function main() {
  console.log("[1/10] アカウントを登録しています...");
  const accountSeeds = [
    ["利用者零一", "user01@keio.jp"], ["利用者零二", "user02@keio.jp"],
    ["利用者零三", "user03@keio.jp"], ["利用者零四", "user04@keio.jp"],
    ["利用者零五", "user05@keio.jp"], ["佐藤葵", "aoi.sato@keio.jp"],
    ["鈴木蓮", "ren.suzuki@keio.jp"], ["高橋凛", "rin.takahashi@keio.jp"],
    ["田中悠真", "yuma.tanaka@keio.jp"], ["伊藤美咲", "misaki.ito@keio.jp"],
    ["山本颯太", "sota.yamamoto@keio.jp"], ["小林結衣", "yui.kobayashi@keio.jp"],
    ["加藤陽菜", "hina.kato@keio.jp"], ["吉田湊", "minato.yoshida@keio.jp"],
    ["山田紬", "tsumugi.yamada@keio.jp"], ["松本樹", "itsuki.matsumoto@keio.jp"],
    ["井上澪", "mio.inoue@keio.jp"], ["木村蒼", "ao.kimura@keio.jp"],
    ["林咲良", "sakura.hayashi@keio.jp"], ["清水陸", "riku.shimizu@keio.jp"],
    ["阿部琴音", "kotone.abe@keio.jp"], ["森大和", "yamato.mori@keio.jp"],
    ["池田楓", "kaede.ikeda@keio.jp"], ["橋本直", "nao.hashimoto@keio.jp"],
  ].map(([accountName, email]) => ({ accountName, email }));

  const accountRows = await mapBatches(accountSeeds, 8, (account) => prisma.account.upsert({
    where: { email: account.email },
    update: { accountName: account.accountName },
    create: account,
  }));
  const accountsByEmail = new Map(accountRows.map((row: any) => [row.email, row]));

  const bookSeeds: BookSeed[] = [
    { key: "db-design", title: "関係データベース設計", author: "青木誠", courses: [course("データモデリング", "石井教授"), course("データベース論", "加藤教授", "理工学部", "秋学期")] },
    { key: "db-practice", title: "データモデリング実践", author: "青木誠", courses: [course("データモデリング", "石井教授"), course("情報システム設計", "石井教授", "理工学部", "秋学期")] },
    { key: "python", title: "Pythonプログラミング基礎", author: "中村翔", courses: [course("プログラミング基礎", "田辺准教授", "理工学部", "春学期", "日吉"), course("実践のためのWebプログラミング", "藤井講師")] },
    { key: "web", title: "Webアプリケーション開発", author: "井上優", courses: [course("実践のためのWebプログラミング", "藤井講師"), course("Webシステム設計", "藤井講師", "理工学部", "秋学期")] },
    { key: "typescript", title: "TypeScript実践ガイド", author: "杉山航", courses: [course("実践のためのWebプログラミング", "藤井講師"), course("ソフトウェア設計演習", "山田教授", "理工学部", "秋学期")] },
    { key: "algo", title: "アルゴリズムとデータ構造", author: "松本健", courses: [course("アルゴリズム第2", "岡田教授"), course("計算機科学基礎", "岡田教授", "理工学部", "春学期", "日吉")] },
    { key: "discrete", title: "離散数学入門", author: "奥村司", courses: [course("離散数学", "岡田教授", "理工学部", "春学期", "日吉"), course("計算機科学基礎", "岡田教授", "理工学部", "春学期", "日吉")] },
    { key: "java", title: "Javaオブジェクト指向演習", author: "森田亮", courses: [course("プログラミング第二同演習", "山田教授"), course("ソフトウェア設計演習", "山田教授", "理工学部", "秋学期")] },
    { key: "cpp", title: "C++標準ライブラリ入門", author: "村井亮介", courses: [course("プログラミング第二同演習", "山田教授"), course("ゲームプログラミング", "森講師", "環境情報学部", "秋学期", "湘南藤沢")] },
    { key: "c", title: "C言語プログラミング", author: "吉田剛", courses: [course("プログラミング第一", "山田教授", "理工学部", "春学期", "日吉"), course("情報工学実験", "中島准教授")] },
    { key: "network", title: "コンピュータネットワーク入門", author: "斎藤直樹", courses: [course("コンピュータネットワーク", "林教授"), course("通信ネットワーク論", "林教授", "理工学部", "秋学期")] },
    { key: "security", title: "情報セキュリティ基礎", author: "竹内真", courses: [course("情報セキュリティ", "石田教授"), course("ネットワークセキュリティ", "石田教授", "理工学部", "秋学期")] },
    { key: "os", title: "オペレーティングシステム概論", author: "西村悟", courses: [course("オペレーティングシステム", "山口教授"), course("システムプログラミング", "山口教授", "理工学部", "秋学期")] },
    { key: "architecture", title: "コンピュータアーキテクチャ", author: "安藤拓", courses: [course("コンピュータアーキテクチャ", "山口教授"), course("計算機工学", "中島准教授", "理工学部", "春学期")] },
    { key: "embedded", title: "組込みシステム設計", author: "上田隆", courses: [course("組込みシステム", "中島准教授"), course("情報工学実験", "中島准教授")] },
    { key: "dsp", title: "ディジタル信号処理", author: "清水浩", courses: [course("ディジタル信号処理", "渡辺教授"), course("音響信号処理", "渡辺教授", "理工学部", "秋学期")] },
    { key: "image", title: "画像処理の基礎", author: "前田修", courses: [course("画像処理", "前田教授"), course("ビジュアルコンピューティングⅠB", "前田教授")] },
    { key: "cg", title: "コンピュータグラフィックス", author: "平野修", courses: [course("ビジュアルコンピューティングⅠB", "前田教授"), course("コンピュータグラフィックス", "前田教授", "理工学部", "秋学期")] },
    { key: "hi", title: "ヒューマンインタフェース設計", author: "大野彩", courses: [course("ヒューマンインタフェース", "佐々木教授"), course("ユーザエクスペリエンス設計", "佐々木教授", "環境情報学部", "秋学期", "湘南藤沢")] },
    { key: "ar", title: "AR・VRシステム入門", author: "高野薫", courses: [course("拡張現実システム", "佐々木教授", "理工学部", "秋学期"), course("ヒューマンインタフェース", "佐々木教授")] },
    { key: "ai", title: "人工知能の基礎", author: "村上瞳", courses: [course("人工知能", "福田教授"), course("機械学習", "福田教授", "理工学部", "秋学期")] },
    { key: "ml", title: "機械学習パターン認識", author: "福田篤", courses: [course("機械学習", "福田教授", "理工学部", "秋学期"), course("データサイエンス演習", "木村教授", "理工学部", "秋学期")] },
    { key: "data-science", title: "データサイエンス入門", author: "木村誠", courses: [course("データ解析", "木村教授"), course("データサイエンス演習", "木村教授", "理工学部", "秋学期")] },
    { key: "stats", title: "確率統計入門", author: "橋本望", courses: [course("確率統計", "木村教授", "理工学部", "春学期", "日吉"), course("データ解析", "木村教授")] },
    { key: "linear", title: "線形代数とその応用", author: "藤田恵", courses: [course("線形代数", "小川教授", "理工学部", "春学期", "日吉"), course("数理工学", "小川教授")] },
    { key: "calculus", title: "微分積分学演習", author: "小川実", courses: [course("微分積分", "小川教授", "理工学部", "春学期", "日吉"), course("数理工学", "小川教授")] },
    { key: "optimization", title: "数理最適化", author: "佐伯徹", courses: [course("オペレーションズリサーチ", "佐伯教授"), course("数理工学", "小川教授")] },
    { key: "quantum", title: "量子コンピューティング入門", author: "川村智", courses: [course("量子コンピューティングⅠB", "吉川教授"), course("量子情報科学", "吉川教授", "理工学部", "秋学期")] },
    { key: "physics", title: "物理学基礎", author: "吉川健", courses: [course("物理学A", "吉川教授", "理工学部", "春学期", "日吉"), course("量子情報科学", "吉川教授", "理工学部", "秋学期")] },
    { key: "comm", title: "通信理論", author: "長谷川淳", courses: [course("通信理論", "長谷川教授"), course("情報理論", "長谷川教授", "理工学部", "秋学期")] },
    { key: "wireless", title: "無線通信システム", author: "林直人", courses: [course("無線通信", "林教授", "理工学部", "秋学期"), course("通信ネットワーク論", "林教授", "理工学部", "秋学期")] },
    { key: "se", title: "ソフトウェア工学", author: "近藤学", courses: [course("ソフトウェア工学", "山田教授"), course("システム設計論", "山田教授", "理工学部", "秋学期")] },
    { key: "testing", title: "ソフトウェアテスト技法", author: "山田浩", courses: [course("ソフトウェア工学", "山田教授"), course("品質保証演習", "近藤講師", "理工学部", "秋学期")] },
    { key: "project", title: "プロジェクトマネジメント", author: "近藤学", courses: [course("プロジェクトマネジメント", "近藤講師", "理工学部", "秋学期"), course("システム設計論", "山田教授", "理工学部", "秋学期")] },
    { key: "economics", title: "経済学入門", author: "遠藤真", courses: [course("経済学基礎", "遠藤教授", "経済学部", "春学期", "日吉"), course("ミクロ経済学", "遠藤教授", "経済学部", "秋学期", "三田")] },
    { key: "management", title: "経営管理論", author: "井口光", courses: [course("経営管理論", "井口教授", "商学部", "春学期", "三田"), course("組織論", "井口教授", "商学部", "秋学期", "三田")] },
    { key: "law", title: "情報法概論", author: "佐久間俊", courses: [course("情報法", "佐久間教授", "法学部", "秋学期", "三田"), course("知的財産法", "佐久間教授", "法学部", "春学期", "三田")] },
    { key: "english", title: "Academic Writing Skills", author: "Emma Brown", courses: [course("英語アカデミックライティング", "Brown講師", "全学部", "春学期", "日吉")] },
    { key: "design", title: "デザイン思考の実践", author: "大野彩", courses: [course("デザイン思考", "大野教授", "総合政策学部", "春学期", "湘南藤沢"), course("サービスデザイン", "大野教授", "環境情報学部", "秋学期", "湘南藤沢")] },
    { key: "media", title: "メディア研究入門", author: "森本花", courses: [course("メディア論", "森本教授", "環境情報学部", "春学期", "湘南藤沢"), course("コミュニケーション論", "森本教授", "総合政策学部", "秋学期", "湘南藤沢")] },
    { key: "bioinfo", title: "バイオインフォマティクス", author: "池田真", courses: [course("バイオインフォマティクス", "池田教授", "理工学部", "秋学期"), course("生命情報科学", "池田教授", "理工学部", "春学期")] },
    { key: "robotics", title: "ロボティクス基礎", author: "中島徹", courses: [course("ロボティクス", "中島准教授", "理工学部", "秋学期"), course("制御工学", "佐伯教授", "理工学部", "春学期")] },
  ];

  console.log("[2/10] 教科と教科書を登録しています...");
  const uniqueCourses = [...new Map(bookSeeds.flatMap((book) => book.courses).map((row) => [`${row.courseName}|${row.teacherName}`, row])).values()];
  const courseRows = await mapBatches(uniqueCourses, 8, (row) => prisma.course.upsert({
    where: { courseName_teacherName: { courseName: row.courseName, teacherName: row.teacherName } },
    update: { faculty: row.faculty, term: row.term, campus: row.campus },
    create: row,
  }));
  const coursesByKey = new Map(courseRows.map((row: any) => [`${row.courseName}|${row.teacherName}`, row]));

  const textbookRows = await mapBatches(bookSeeds, 8, (book) => prisma.textbook.upsert({
    where: { title_author: { title: book.title, author: book.author } },
    update: {},
    create: { title: book.title, author: book.author },
  }));
  const textbooksByKey = new Map(bookSeeds.map((book, index) => [book.key, textbookRows[index]]));
  await prisma.textbookCourse.createMany({
    data: bookSeeds.flatMap((book) => book.courses.map((row) => ({
      textbookId: textbooksByKey.get(book.key).id,
      courseId: coursesByKey.get(`${row.courseName}|${row.teacherName}`).id,
    }))),
    skipDuplicates: true,
  });

  console.log("[3/10] 多様な出品データを登録しています...");
  const conditions = ["新品に近い", "比較的きれい", "書き込み少しあり", "書き込みあり", "表紙に傷あり", "角に折れあり", "全体的に使用感あり"];
  const notes = [
    "講義で数回使用しました。本文は読みやすい状態です。",
    "重要箇所に黄色のマーカーが数か所あります。",
    "表紙にわずかな擦れがありますが、中身はきれいです。",
    "章末問題に鉛筆の書き込みがあります。消しゴムで消せます。",
    "カバーを付けて保管していました。付属資料も揃っています。",
    "持ち運びによる使用感があります。ページの欠損はありません。",
    "指定版を買い直したため出品します。授業利用には問題ありません。",
  ];
  const itemSeeds = bookSeeds.flatMap((book, bookIndex) => [0, 1].map((variant) => {
    const number = bookIndex * 2 + variant + 1;
    const seller = accountRows[(bookIndex * 3 + variant * 7) % accountRows.length];
    const inquirer = accountRows[(bookIndex * 3 + variant * 7 + 5) % accountRows.length];
    const canceled = number % 19 === 0;
    const completed = !canceled && number % 13 === 0;
    const negotiating = !canceled && !completed && number % 5 === 0;
    return {
      key: String(number).padStart(3, "0"),
      seller,
      receiver: completed || negotiating ? inquirer : null,
      textbook: textbooksByKey.get(book.key),
      condition: conditions[(bookIndex + variant * 2) % conditions.length],
      conditionNote: notes[(bookIndex * 2 + variant) % notes.length],
      isCanceled: canceled,
      canceledAt: canceled ? hoursAgo((number % 30) + 2) : null,
      completedAt: completed ? daysAgo((number % 12) + 1) : null,
      createdAt: daysAgo((bookIndex * 2 + variant) % 48, 8 + (number % 9)),
    };
  }));

  const itemRows = await mapBatches(itemSeeds, 8, (row) => prisma.item.upsert({
    where: { seedKey: `v11-item-${row.key}` },
    update: {
      sellerAccountId: row.seller.id, receiverAccountId: row.receiver?.id || null, textbookId: row.textbook.id,
      condition: row.condition, conditionNote: row.conditionNote, isCanceled: row.isCanceled,
      canceledAt: row.canceledAt, completedAt: row.completedAt, createdAt: row.createdAt,
    },
    create: {
      seedKey: `v11-item-${row.key}`, sellerAccountId: row.seller.id, receiverAccountId: row.receiver?.id || null,
      textbookId: row.textbook.id, condition: row.condition, conditionNote: row.conditionNote,
      isCanceled: row.isCanceled, canceledAt: row.canceledAt, completedAt: row.completedAt, createdAt: row.createdAt,
    },
  }));

  console.log("[4/10] チャット履歴を登録しています...");
  const chatTemplates = [
    ["この教科書はまだ受け取り可能でしょうか？", "はい、現在も募集中です。状態について質問があればお答えします。"],
    ["授業指定の版と同じか確認したいです。", "今年度のシラバスに記載されている版です。"],
    ["書き込みの場所をもう少し教えてください。", "主に前半の章にマーカーがあります。問題の解答は書いていません。"],
    ["本文に破れや水濡れはありますか？", "破れや水濡れはありません。表紙に少し使用感があります。"],
    ["関連する別冊や付属資料もありますか？", "購入時に付属していた資料はすべて揃っています。"],
  ];
  const chatSeeds: any[] = [];
  itemSeeds.forEach((seed, index) => {
    if (seed.isCanceled || index % 4 === 3) return;
    const item = itemRows[index];
    const sender = seed.receiver || accountRows[(index + 9) % accountRows.length];
    if (sender.id === seed.seller.id) return;
    const pair = chatTemplates[index % chatTemplates.length];
    chatSeeds.push({ seedKey: `v11-chat-${seed.key}-a`, itemId: item.id, senderAccountId: sender.id, message: pair[0], sentAt: hoursAgo(4 + index * 3) });
    chatSeeds.push({ seedKey: `v11-chat-${seed.key}-b`, itemId: item.id, senderAccountId: seed.seller.id, message: pair[1], sentAt: hoursAgo(2 + index * 3) });
  });
  await mapBatches(chatSeeds, 10, (row) => prisma.chatMessage.upsert({
    where: { seedKey: row.seedKey }, update: row, create: row,
  }));

  console.log("[5/10] 履修科目を登録しています...");
  const enrollmentData: any[] = [];
  accountRows.forEach((account: any, accountIndex: number) => {
    for (let offset = 0; offset < 6; offset += 1) {
      const selected = courseRows[(accountIndex * 5 + offset * 7) % courseRows.length];
      enrollmentData.push({ accountId: account.id, courseId: selected.id, createdAt: daysAgo(25 - offset) });
    }
  });
  await prisma.accountCourse.createMany({ data: enrollmentData, skipDuplicates: true });

  console.log("[6/10] お気に入りと閲覧履歴を登録しています...");
  const favoriteData: any[] = [];
  const viewData: any[] = [];
  accountRows.forEach((account: any, accountIndex: number) => {
    for (let offset = 0; offset < 8; offset += 1) {
      const item = itemRows[(accountIndex * 7 + offset * 11) % itemRows.length];
      if (item.sellerAccountId === account.id || item.isCanceled) continue;
      if (offset < 6) favoriteData.push({ accountId: account.id, itemId: item.id, createdAt: daysAgo(offset + 1, 18) });
      viewData.push({ accountId: account.id, itemId: item.id, viewedAt: daysAgo(offset % 7, 16), viewCount: 1 + ((accountIndex + offset) % 7) });
    }
  });
  await prisma.favorite.createMany({ data: favoriteData, skipDuplicates: true });
  await prisma.itemView.createMany({ data: viewData, skipDuplicates: true });

  console.log("[7/10] 保存検索を登録しています...");
  const searchThemes = [
    ["Web開発の教科書", "Web", "all"], ["データ系の教科書", "データ", "all"],
    ["アルゴリズム関連", "アルゴリズム", "all"], ["通信分野", "通信", "all"],
    ["機械学習", "機械学習", "course"], ["中島先生の授業", "中島", "teacher"],
    ["比較的きれいな本", "", "all"], ["量子分野", "量子", "all"],
    ["デザイン関連", "デザイン", "all"], ["統計と解析", "統計", "all"],
    ["セキュリティ", "セキュリティ", "all"], ["SFCの授業", "湘南藤沢", "all"],
  ];
  const savedRows: any[] = [];
  for (let index = 0; index < searchThemes.length; index += 1) {
    const [name, keyword, target] = searchThemes[index];
    const account = accountRows[index];
    const row = await prisma.savedSearch.upsert({
      where: { accountId_name: { accountId: account.id, name } },
      update: { keyword: keyword || null, searchTarget: target, condition: index === 6 ? "比較的きれい" : "all", itemStatus: "open", sortOrder: index % 3 === 0 ? "popular" : "newest", lastCheckedAt: daysAgo(4 + index % 6) },
      create: { accountId: account.id, name, keyword: keyword || null, searchTarget: target, condition: index === 6 ? "比較的きれい" : "all", itemStatus: "open", sortOrder: index % 3 === 0 ? "popular" : "newest", lastCheckedAt: daysAgo(4 + index % 6) },
    });
    savedRows.push(row);
  }

  console.log("[8/10] 推薦フィードバックと既読状態を登録しています...");
  await mapBatches(accountRows.slice(0, 10), 5, async (account: any, index) => {
    const item = itemRows[(index * 13 + 17) % itemRows.length];
    if (item.sellerAccountId !== account.id) {
      await prisma.recommendationFeedback.upsert({
        where: { accountId_itemId: { accountId: account.id, itemId: item.id } },
        update: { feedback: "not_interested" },
        create: { accountId: account.id, itemId: item.id, feedback: "not_interested" },
      });
    }
  });
  const readData = chatSeeds.slice(0, 36).map((chat, index) => ({
    accountId: accountRows[(index + 2) % accountRows.length].id,
    itemId: chat.itemId,
    lastReadAt: hoursAgo(3 + index * 2),
  }));
  await prisma.itemReadStatus.createMany({ data: readData, skipDuplicates: true });

  console.log("[9/10] 通知を登録しています...");
  const notificationSeeds = accountRows.slice(0, 20).map((account: any, index: number) => {
    const item = itemRows[(index * 9 + 4) % itemRows.length];
    const type = index % 3 === 0 ? "saved_search" : index % 3 === 1 ? "chat" : "favorite_update";
    const messages: Record<string, string> = {
      saved_search: `保存した検索に合う「${bookSeeds[(index * 3) % bookSeeds.length].title}」の新着出品があります。`,
      chat: `「${bookSeeds[(index * 3 + 1) % bookSeeds.length].title}」のチャットに新しいメッセージがあります。`,
      favorite_update: `お気に入りの「${bookSeeds[(index * 3 + 2) % bookSeeds.length].title}」の情報が更新されました。`,
    };
    return { accountId: account.id, type, itemId: item.id, savedSearchId: type === "saved_search" ? (savedRows.find((row: any) => row.accountId === account.id)?.id || null) : null, message: messages[type], isRead: index % 4 === 0, dedupeKey: `v11-notification-${String(index + 1).padStart(3, "0")}`, createdAt: hoursAgo(index + 1) };
  });
  await mapBatches(notificationSeeds, 8, (row) => prisma.notification.upsert({
    where: { dedupeKey: row.dedupeKey }, update: row, create: row,
  }));

  console.log("[10/10] 件数を確認しています...");
  const [accountCount, courseCount, textbookCount, itemCount, chatCount, favoriteCount, enrollmentCount] = await Promise.all([
    prisma.account.count(), prisma.course.count(), prisma.textbook.count(), prisma.item.count(),
    prisma.chatMessage.count(), prisma.favorite.count(), prisma.accountCourse.count(),
  ]);
  console.log(`完了: アカウント ${accountCount}件 / 教科 ${courseCount}件 / 教科書 ${textbookCount}冊 / 出品 ${itemCount}件 / チャット ${chatCount}件 / お気に入り ${favoriteCount}件 / 履修登録 ${enrollmentCount}件`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
