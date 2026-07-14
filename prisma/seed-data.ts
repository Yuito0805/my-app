export type FieldSeed = {
  key: string;
  name: string;
};

export type AccountSeed = {
  fieldKey: string;
  accountName: string;
  email: string;
};

export type BookSeed = {
  key: string;
  fieldKey: string;
  title: string;
  author: string;
  courseName: string;
  teacherName: string;
};

export const fieldSeeds: FieldSeed[] = [
  { key: "A", name: "文学・語学" },
  { key: "B", name: "経済・経営" },
  { key: "C", name: "法学・政治" },
  { key: "D", name: "理工・情報" },
  { key: "E", name: "自然科学" },
  { key: "F", name: "医療・生命科学" },
  { key: "G", name: "社会・教育" },
  { key: "H", name: "政策・環境" },
];

export const accountSeeds: AccountSeed[] = fieldSeeds.flatMap((field) =>
  Array.from({ length: 3 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      fieldKey: field.key,
      accountName: `利用者${field.key}${number}`,
      email: `webpro-sample-${field.key.toLowerCase()}${number}@keio.jp`,
    };
  }),
);

export const bookSeeds: BookSeed[] = [
  { key: "a01", fieldKey: "A", title: "日本文学概論講義", author: "著者A01", courseName: "日本文学概論", teacherName: "教員A01" },
  { key: "a02", fieldKey: "A", title: "はじめて学ぶ英語学", author: "著者A02", courseName: "英語学入門", teacherName: "教員A02" },
  { key: "a03", fieldKey: "A", title: "哲学概論", author: "著者A03", courseName: "哲学概論", teacherName: "教員A03" },
  { key: "a04", fieldKey: "A", title: "西洋史の基礎", author: "著者A04", courseName: "西洋史", teacherName: "教員A04" },
  { key: "a05", fieldKey: "A", title: "言語学基礎演習", author: "著者A05", courseName: "言語学基礎", teacherName: "教員A05" },

  { key: "b01", fieldKey: "B", title: "ミクロ経済学入門", author: "著者B01", courseName: "ミクロ経済学", teacherName: "教員B01" },
  { key: "b02", fieldKey: "B", title: "マクロ経済学の基礎", author: "著者B02", courseName: "マクロ経済学", teacherName: "教員B02" },
  { key: "b03", fieldKey: "B", title: "経営学概論", author: "著者B03", courseName: "経営学", teacherName: "教員B03" },
  { key: "b04", fieldKey: "B", title: "マーケティング論演習", author: "著者B04", courseName: "マーケティング論", teacherName: "教員B04" },
  { key: "b05", fieldKey: "B", title: "はじめての会計学", author: "著者B05", courseName: "会計学基礎", teacherName: "教員B05" },

  { key: "c01", fieldKey: "C", title: "憲法概説", author: "著者C01", courseName: "憲法", teacherName: "教員C01" },
  { key: "c02", fieldKey: "C", title: "民法入門", author: "著者C02", courseName: "民法", teacherName: "教員C02" },
  { key: "c03", fieldKey: "C", title: "刑法の基礎", author: "著者C03", courseName: "刑法", teacherName: "教員C03" },
  { key: "c04", fieldKey: "C", title: "行政法講義", author: "著者C04", courseName: "行政法", teacherName: "教員C04" },
  { key: "c05", fieldKey: "C", title: "政治学概論", author: "著者C05", courseName: "政治学概論", teacherName: "教員C05" },

  { key: "d01", fieldKey: "D", title: "数学Ⅰ 基礎演習", author: "著者D01", courseName: "数学Ⅰ", teacherName: "教員D01" },
  { key: "d02", fieldKey: "D", title: "線形代数入門", author: "著者D02", courseName: "線形代数", teacherName: "教員D02" },
  { key: "d03", fieldKey: "D", title: "アルゴリズム理論演習", author: "著者D03", courseName: "アルゴリズム理論", teacherName: "教員D03" },
  { key: "d04", fieldKey: "D", title: "データベースの基礎", author: "著者D04", courseName: "データベース", teacherName: "教員D04" },
  { key: "d05", fieldKey: "D", title: "Webプログラミング入門", author: "著者D05", courseName: "Webプログラミング", teacherName: "教員D05" },

  { key: "e01", fieldKey: "E", title: "物理学Ⅰ演習", author: "著者E01", courseName: "物理学Ⅰ", teacherName: "教員E01" },
  { key: "e02", fieldKey: "E", title: "化学Ⅰの基礎", author: "著者E02", courseName: "化学Ⅰ", teacherName: "教員E02" },
  { key: "e03", fieldKey: "E", title: "生物学概論", author: "著者E03", courseName: "生物学", teacherName: "教員E03" },
  { key: "e04", fieldKey: "E", title: "はじめて学ぶ統計学", author: "著者E04", courseName: "統計学", teacherName: "教員E04" },
  { key: "e05", fieldKey: "E", title: "地球科学入門", author: "著者E05", courseName: "地球科学", teacherName: "教員E05" },

  { key: "f01", fieldKey: "F", title: "解剖学入門", author: "著者F01", courseName: "解剖学", teacherName: "教員F01" },
  { key: "f02", fieldKey: "F", title: "生理学演習", author: "著者F02", courseName: "生理学", teacherName: "教員F02" },
  { key: "f03", fieldKey: "F", title: "薬理学の基礎", author: "著者F03", courseName: "薬理学", teacherName: "教員F03" },
  { key: "f04", fieldKey: "F", title: "公衆衛生学問題集", author: "著者F04", courseName: "公衆衛生学", teacherName: "教員F04" },
  { key: "f05", fieldKey: "F", title: "生命科学概論", author: "著者F05", courseName: "生命科学概論", teacherName: "教員F05" },

  { key: "g01", fieldKey: "G", title: "社会学入門", author: "著者G01", courseName: "社会学", teacherName: "教員G01" },
  { key: "g02", fieldKey: "G", title: "心理学概論", author: "著者G02", courseName: "心理学概論", teacherName: "教員G02" },
  { key: "g03", fieldKey: "G", title: "教育学の基礎", author: "著者G03", courseName: "教育学", teacherName: "教員G03" },
  { key: "g04", fieldKey: "G", title: "メディア論講義", author: "著者G04", courseName: "メディア論", teacherName: "教員G04" },
  { key: "g05", fieldKey: "G", title: "文化人類学演習", author: "著者G05", courseName: "文化人類学", teacherName: "教員G05" },

  { key: "h01", fieldKey: "H", title: "政策分析入門", author: "著者H01", courseName: "政策分析", teacherName: "教員H01" },
  { key: "h02", fieldKey: "H", title: "環境科学概論", author: "著者H02", courseName: "環境科学", teacherName: "教員H02" },
  { key: "h03", fieldKey: "H", title: "地域研究の基礎", author: "著者H03", courseName: "地域研究", teacherName: "教員H03" },
  { key: "h04", fieldKey: "H", title: "国際関係論講義", author: "著者H04", courseName: "国際関係論", teacherName: "教員H04" },
  { key: "h05", fieldKey: "H", title: "都市計画論演習", author: "著者H05", courseName: "都市計画論", teacherName: "教員H05" },
];

export const conditionOptions = [
  "新品に近い",
  "比較的きれい",
  "書き込み少しあり",
  "書き込みあり",
  "表紙に傷あり",
  "角に折れあり",
  "全体的に使用感あり",
];

export const conditionNotes = [
  "カバーを付けて使用していたため、本文は比較的きれいです。",
  "一部の章にマーカーがあります。",
  "表紙に軽い擦れがありますが、本文に破れはありません。",
  "章末問題に鉛筆で書き込みがあります。",
  "授業で数回使用しただけで、目立つ汚れはありません。",
  "背表紙に軽い日焼けがあります。",
  "付箋を貼っていた跡が数か所あります。",
  "付属資料もそろっています。",
];

export const chatTemplates: [string, string][] = [
  ["この教科書はまだ受け取り可能ですか？", "はい、現在も募集中です。"],
  ["書き込みの量を教えていただけますか？", "一部の章に少しありますが、読むうえでは問題ありません。"],
  ["授業で使用する版と同じものですか？", "登録している教科書情報をご確認ください。"],
  ["付属資料は残っていますか？", "はい、付属資料もそろっています。"],
  ["受け取りについて相談を進めてもよいですか？", "はい、希望する日時をチャットで相談してください。"],
];
