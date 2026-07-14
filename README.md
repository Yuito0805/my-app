# 教科書シェア v14

学生同士で不要になった教科書を、金銭の仲介なしで譲渡する流れを想定した3層構造のWebアプリです。公開サイトには、架空の利用者・教科書・教科・教員・会話だけを登録します。

## v14の主な改善

- 初回ログイン後に、主要操作を3段階で案内するウェルカムガイドを追加
- ガイドは閉じた後も、マイページから再表示可能
- マイページに「最近の活動」を追加し、お気に入り・閲覧・出品・チャット・通知を時系列表示
- 過去7日間の活動件数と内訳を表示
- マイページ上部の件数カード、ボタン、余白、文字階層を再調整
- スマートフォンではチャット送信欄を下部に固定し、主要操作を押しやすく改善
- スキップリンク、明確なフォーカス表示、タブのARIA属性、モーダル内のフォーカス制御を追加
- 404画面と500画面のデザインを統一
- 日付表示、入力検証、活動集計をサービス・ユーティリティへ分割
- 活動集計、リダイレクト検証、アクセシビリティ構造を含む自動テストを16件へ拡充
- PWAキャッシュをv14へ更新

## 公開デモ上の注意

- 掲載情報はすべて授業課題用の架空データです。
- 実在する個人名、授業情報、メールアドレスなどは登録しないでください。
- ログイン方式は授業用の簡易方式であり、本番サービス向けの認証ではありません。

## 架空データの分野構成

次の8分野を均等に使用します。

1. 文学・語学
2. 経済・経営
3. 法学・政治
4. 理工・情報
5. 自然科学
6. 医療・生命科学
7. 社会・教育
8. 政策・環境

各分野には、教科5件、教科書5冊、利用者3人、出品10件を登録します。

## サンプルアカウント

```text
出品者として試す
利用者A02 / webpro-sample-a02@keio.jp

受取希望者として試す
利用者A01 / webpro-sample-a01@keio.jp
```

## 主な機能

- 名前・大学メールアドレスによる簡易ログインとアカウント作成
- 教科書の出品、編集、取り消し、譲渡完了
- 教科書名・教科名・著者名・担当教員名による検索
- 本の状態、取引状態、並び順による絞り込み
- 譲渡品ごとのチャットと交渉相手の選択・変更
- お気に入り、閲覧履歴、保存検索、通知
- 履修科目・お気に入り・閲覧履歴を使ったおすすめ
- 初回利用ガイドと活動ダッシュボード
- PWA、レスポンシブ表示、キーボード操作への対応

## コード構成

```text
src/
├── services/
│   ├── activity-service.ts
│   ├── notification-service.ts
│   ├── recommendation-service.ts
│   └── search-service.ts
├── middleware/
│   └── error-handler.ts
└── utils/
    ├── date-format.ts
    └── validation.ts
```

- URLとリクエスト処理：`index.ts`
- DB検索・集計・推薦：`src/services`
- 日付表示・入力検証：`src/utils`
- 表示：`views`、`public`

## 3層構造

- **フロントエンド**：EJS、HTML、CSS、JavaScript
- **バックエンド**：TypeScript、Express
- **データベース**：PostgreSQL、Prisma

## 通常の起動

```bash
npm install
npm run db:generate
npm run db:push
npm test
npm start
```

または次を実行します。

```bash
bash scripts/start-v14.sh
```

## Render DBを架空データへ再置換する場合

v14はDB構造を変更していないため、v13の架空データが入っていれば通常は再置換不要です。再投入が必要な場合だけ、Render DashboardのPostgreSQL画面からExternal Database URLを取得し、次を実行します。

```bash
bash scripts/reset-render-demo-v14.sh
```

スクリプトは接続先ホストとDB名を表示し、`RESET` の入力後にだけ既存データを削除します。DB初期化コマンドはRenderのBuild Commandへ入れないでください。

## Render設定例

```text
Build Command:
npm clean-install && npx prisma generate && npx prisma db push

Start Command:
npm start
```
