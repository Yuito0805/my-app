import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// @ts-ignore
import { PrismaClient } from "../generated/prisma/index.js";
import {
  accountSeeds,
  bookSeeds,
  chatTemplates,
  conditionNotes,
  conditionOptions,
  fieldSeeds,
} from "./seed-data.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 12,
  connectionTimeoutMillis: 20_000,
  idleTimeoutMillis: 30_000,
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

const itemSeedKey = (number: number) => `sample-v14-item-${String(number).padStart(3, "0")}`;
const chatSeedKey = (number: number) => `sample-v14-chat-${String(number).padStart(3, "0")}`;

type ItemSeed = {
  number: number;
  fieldKey: string;
  localItemIndex: number;
  seller: any;
  receiver: any | null;
  textbook: any;
  condition: string;
  conditionNote: string;
  isCanceled: boolean;
  canceledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

async function main() {
  const accountsByEmail = new Map<string, any>();
  const accountsByField = new Map<string, any[]>();
  const textbooksByKey = new Map<string, any>();
  const coursesByField = new Map<string, any[]>();
  const itemsByNumber = new Map<number, any>();

  await stage("架空アカウント24件", async () => {
    const rows = await mapLimit(accountSeeds, 6, async (account) => prisma.account.upsert({
      where: { email: account.email },
      update: { accountName: account.accountName },
      create: { accountName: account.accountName, email: account.email },
    }));

    rows.forEach((row, index) => {
      const seed = accountSeeds[index];
      accountsByEmail.set(seed.email, row);
      const fieldAccounts = accountsByField.get(seed.fieldKey) || [];
      fieldAccounts.push(row);
      accountsByField.set(seed.fieldKey, fieldAccounts);
    });
  });

  await stage("8分野の教科40件・教科書40冊", async () => {
    const rows = await mapLimit(bookSeeds, 5, async (book) => {
      const textbook = await prisma.textbook.upsert({
        where: { title_author: { title: book.title, author: book.author } },
        update: {},
        create: { title: book.title, author: book.author },
      });
      const course = await prisma.course.upsert({
        where: { courseName_teacherName: { courseName: book.courseName, teacherName: book.teacherName } },
        update: {},
        create: { courseName: book.courseName, teacherName: book.teacherName },
      });
      await prisma.textbookCourse.upsert({
        where: { textbookId_courseId: { textbookId: textbook.id, courseId: course.id } },
        update: {},
        create: { textbookId: textbook.id, courseId: course.id },
      });
      return { book, textbook, course };
    });

    rows.forEach(({ book, textbook, course }) => {
      textbooksByKey.set(book.key, textbook);
      const fieldCourses = coursesByField.get(book.fieldKey) || [];
      fieldCourses.push(course);
      coursesByField.set(book.fieldKey, fieldCourses);
    });
  });

  const accountRows = accountSeeds.map((seed) => accountsByEmail.get(seed.email));
  const itemSeeds: ItemSeed[] = [];
  let itemNumber = 1;

  for (const field of fieldSeeds) {
    const fieldBooks = bookSeeds.filter((book) => book.fieldKey === field.key);
    const fieldAccounts = accountsByField.get(field.key) || [];

    fieldBooks.forEach((book, bookIndex) => {
      for (let copyIndex = 0; copyIndex < 2; copyIndex += 1) {
        const localItemIndex = bookIndex * 2 + copyIndex;
        const seller = fieldAccounts[(bookIndex + copyIndex) % fieldAccounts.length];
        const isCanceled = localItemIndex === 8;
        const isCompleted = localItemIndex === 9;
        const hasReceiver = [6, 7, 9].includes(localItemIndex);
        let receiver = hasReceiver ? accountRows[(itemNumber * 5 + 3) % accountRows.length] : null;
        if (receiver?.id === seller.id) receiver = accountRows[(itemNumber * 5 + 4) % accountRows.length];

        itemSeeds.push({
          number: itemNumber,
          fieldKey: field.key,
          localItemIndex,
          seller,
          receiver,
          textbook: textbooksByKey.get(book.key),
          condition: conditionOptions[(itemNumber + localItemIndex * 2) % conditionOptions.length],
          conditionNote: conditionNotes[(itemNumber * 3 + localItemIndex) % conditionNotes.length],
          isCanceled,
          canceledAt: isCanceled ? hoursAgo(36 + itemNumber) : null,
          completedAt: isCompleted ? daysAgo((itemNumber % 9) + 1, 16) : null,
          createdAt: daysAgo((itemNumber * 3) % 42, 8 + (itemNumber % 10)),
        });
        itemNumber += 1;
      }
    });
  }

  await stage("8分野に各10件、合計80件の出品", async () => {
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

  const chatSeeds: { number: number; item: any; sender: any; message: string; sentAt: Date }[] = [];
  let chatNumber = 1;
  bookSeeds.forEach((book, bookIndex) => {
    const localBookIndex = bookIndex % 5;
    const primaryItemNumber = bookIndex * 2 + (localBookIndex === 4 ? 2 : 1);
    const item = itemsByNumber.get(primaryItemNumber);
    const itemSeed = itemSeeds[primaryItemNumber - 1];
    let inquirer = itemSeed.receiver ?? accountRows[(bookIndex * 7 + 5) % accountRows.length];
    if (inquirer.id === itemSeed.seller.id) inquirer = accountRows[(bookIndex * 7 + 6) % accountRows.length];
    const template = chatTemplates[localBookIndex];

    chatSeeds.push({
      number: chatNumber++,
      item,
      sender: inquirer,
      message: template[0],
      sentAt: hoursAgo(170 - Math.min(bookIndex * 3, 145)),
    });
    chatSeeds.push({
      number: chatNumber++,
      item,
      sender: itemSeed.seller,
      message: template[1],
      sentAt: hoursAgo(168 - Math.min(bookIndex * 3, 145)),
    });
  });

  await stage("8分野に各10件、合計80件のチャット", async () => {
    await mapLimit(chatSeeds, 8, async (seed) => prisma.chatMessage.upsert({
      where: { seedKey: chatSeedKey(seed.number) },
      update: { itemId: seed.item.id, senderAccountId: seed.sender.id, message: seed.message, sentAt: seed.sentAt },
      create: { seedKey: chatSeedKey(seed.number), itemId: seed.item.id, senderAccountId: seed.sender.id, message: seed.message, sentAt: seed.sentAt },
    }));
  });

  const enrollmentData: { accountId: number; courseId: number }[] = [];
  accountSeeds.forEach((accountSeed) => {
    const account = accountsByEmail.get(accountSeed.email);
    const fieldCourses = coursesByField.get(accountSeed.fieldKey) || [];
    fieldCourses.forEach((course) => enrollmentData.push({ accountId: account.id, courseId: course.id }));
  });

  await stage("各分野15件、合計120件の履修登録", async () => {
    await prisma.accountCourse.createMany({ data: enrollmentData, skipDuplicates: true });
  });

  const openItemsByField = new Map<string, any[]>();
  fieldSeeds.forEach((field) => {
    openItemsByField.set(field.key, itemSeeds
      .filter((seed) => seed.fieldKey === field.key && !seed.isCanceled && !seed.completedAt)
      .map((seed) => itemsByNumber.get(seed.number)));
  });

  const selectOtherUsersItem = (items: any[], accountId: number, startIndex: number) => {
    for (let offset = 0; offset < items.length; offset += 1) {
      const item = items[(startIndex + offset) % items.length];
      if (item.sellerAccountId !== accountId) return item;
    }
    return items[0];
  };

  const favoriteData: { accountId: number; itemId: number; createdAt: Date }[] = [];
  const viewData: { accountId: number; itemId: number; viewedAt: Date; viewCount: number }[] = [];
  accountRows.forEach((account, accountIndex) => {
    fieldSeeds.forEach((field, fieldIndex) => {
      const items = openItemsByField.get(field.key) || [];
      const favoriteItem = selectOtherUsersItem(items, account.id, accountIndex + fieldIndex);
      const viewedItem = selectOtherUsersItem(items, account.id, accountIndex + fieldIndex + 2);
      favoriteData.push({ accountId: account.id, itemId: favoriteItem.id, createdAt: daysAgo((accountIndex + fieldIndex) % 12, 18) });
      viewData.push({
        accountId: account.id,
        itemId: viewedItem.id,
        viewedAt: daysAgo((accountIndex * 2 + fieldIndex) % 15, 19),
        viewCount: 1 + ((accountIndex + fieldIndex * 2) % 9),
      });
    });
  });

  await stage("各分野に均等な、お気に入り192件・閲覧履歴192件", async () => {
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

  const savedSearchRowsByAccount = new Map<number, any>();
  await stage("各分野3件、合計24件の保存検索", async () => {
    for (let accountIndex = 0; accountIndex < accountSeeds.length; accountIndex += 1) {
      const accountSeed = accountSeeds[accountIndex];
      const account = accountsByEmail.get(accountSeed.email);
      const fieldBooks = bookSeeds.filter((book) => book.fieldKey === accountSeed.fieldKey);
      const book = fieldBooks[accountIndex % fieldBooks.length];
      const name = `${book.courseName}・募集中`;
      const row = await prisma.savedSearch.upsert({
        where: { accountId_name: { accountId: account.id, name } },
        update: {
          keyword: book.courseName,
          searchTarget: "course",
          condition: "all",
          itemStatus: "open",
          sortOrder: accountIndex % 2 === 0 ? "newest" : "popular",
          lastCheckedAt: daysAgo(2 + (accountIndex % 10)),
        },
        create: {
          accountId: account.id,
          name,
          keyword: book.courseName,
          searchTarget: "course",
          condition: "all",
          itemStatus: "open",
          sortOrder: accountIndex % 2 === 0 ? "newest" : "popular",
          lastCheckedAt: daysAgo(2 + (accountIndex % 10)),
        },
      });
      savedSearchRowsByAccount.set(account.id, row);
    }
  });

  const feedbackData: { accountId: number; itemId: number; feedback: string }[] = [];
  fieldSeeds.forEach((field, fieldIndex) => {
    const fieldAccounts = accountsByField.get(field.key) || [];
    const nextField = fieldSeeds[(fieldIndex + 1) % fieldSeeds.length];
    const candidateItems = openItemsByField.get(nextField.key) || [];
    fieldAccounts.slice(0, 2).forEach((account, index) => {
      const item = selectOtherUsersItem(candidateItems, account.id, fieldIndex + index);
      feedbackData.push({ accountId: account.id, itemId: item.id, feedback: "not_interested" });
    });
  });

  await stage("各分野2件、合計16件の推薦フィードバック", async () => {
    await mapLimit(feedbackData, 8, async (data) => prisma.recommendationFeedback.upsert({
      where: { accountId_itemId: { accountId: data.accountId, itemId: data.itemId } },
      update: { feedback: data.feedback },
      create: data,
    }));
  });

  const notificationData = accountRows.map((account, index) => {
    const accountSeed = accountSeeds[index];
    const items = openItemsByField.get(accountSeed.fieldKey) || [];
    const item = selectOtherUsersItem(items, account.id, index);
    const type = index % 3 === 0 ? "saved_search" : index % 3 === 1 ? "favorite_update" : "chat";
    const savedSearch = savedSearchRowsByAccount.get(account.id);
    const message = type === "saved_search"
      ? `保存検索「${savedSearch.name}」に合う新しい出品があります。`
      : type === "favorite_update"
        ? "お気に入りに登録した教科書の情報が更新されました。"
        : "教科書のチャットに新しいメッセージがあります。";
    return {
      accountId: account.id,
      type,
      itemId: item.id,
      savedSearchId: type === "saved_search" ? savedSearch.id : null,
      message,
      isRead: index % 4 === 0,
      dedupeKey: `sample-v14-notification-${String(index + 1).padStart(2, "0")}`,
      createdAt: hoursAgo((index + 1) * 3),
    };
  });

  await stage("各分野3件、合計24件の通知", async () => {
    await mapLimit(notificationData, 8, async (data) => prisma.notification.upsert({
      where: { dedupeKey: data.dedupeKey },
      update: data,
      create: data,
    }));
  });

  const readStatusData = accountRows.map((account, index) => {
    const fieldIndex = Math.floor(index / 3);
    const itemNumberForField = fieldIndex * 10 + 1 + (index % 3) * 2;
    return {
      accountId: account.id,
      itemId: itemsByNumber.get(itemNumberForField).id,
      lastReadAt: hoursAgo(150 - index * 4),
    };
  });

  await stage("各分野3件、合計24件の既読状態", async () => {
    await mapLimit(readStatusData, 8, async (data) => prisma.itemReadStatus.upsert({
      where: { accountId_itemId: { accountId: data.accountId, itemId: data.itemId } },
      update: { lastReadAt: data.lastReadAt },
      create: data,
    }));
  });

  const counts = await Promise.all([
    prisma.account.count(),
    prisma.textbook.count(),
    prisma.course.count(),
    prisma.item.count(),
    prisma.chatMessage.count(),
    prisma.accountCourse.count(),
    prisma.favorite.count(),
    prisma.itemView.count(),
    prisma.savedSearch.count(),
    prisma.notification.count(),
  ]);

  console.log("[seed] 架空データの投入がすべて完了しました。");
  console.log(`[seed] DB合計: アカウント ${counts[0]}件 / 教科書 ${counts[1]}冊 / 教科 ${counts[2]}件 / 出品 ${counts[3]}件 / チャット ${counts[4]}件 / 履修 ${counts[5]}件 / お気に入り ${counts[6]}件 / 閲覧履歴 ${counts[7]}件 / 保存検索 ${counts[8]}件 / 通知 ${counts[9]}件`);
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
