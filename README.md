# 教科書シェア v11

大学生が不要になった教科書を、これから必要とする学生へ譲るための3層構造Webアプリです。金銭の仲介は行わず、検索・お気に入り・おすすめ・チャット交渉を中心にしています。

v11では、利用者の**履修科目**をおすすめと新着表示に反映し、トップページを一般的なサービスのような横スクロール型の棚表示へ刷新しました。

## v11の主な追加内容

- 利用者ごとの履修科目登録・解除
- 履修科目は最大12件まで登録可能
- 教科名、担当教員、学部名から履修科目を検索
- 教科に学部・学期・キャンパス情報を追加
- 履修科目に対応する募集中教科書をトップページで優先表示
- 履修科目をルールベース推薦のスコアへ加算
- 「履修科目の新着」「あなたへのおすすめ」「注目の教科書」「最近見た教科書」の棚型表示
- 検索入力中の教科書名・教科名候補表示
- 選択中の検索条件を削除可能なチップとして表示
- お気に入り時の控えめなアニメーションと検索中の進捗表示
- キーボード操作、フォーカス表示、動きを減らす設定への対応
- PWA用マニフェスト、Service Worker、オフライン案内画面
- 履修科目と注目順ロジックの自動テスト

## 既存の主な機能

- 名前とメールアドレスによる簡易ログイン
- `@keio.jp` のメールアドレスのみ新規アカウント作成可能
- 教科書名・著者名・教科名・担当教員名による検索
- 本の状態・取引状態による絞り込み
- 新着順・更新順・状態順・お気に入り数順の並び替え
- 検索条件の保存と新着件数表示
- お気に入り・閲覧履歴・「興味なし」の記録
- 推薦理由とスコア内訳の表示
- 保存検索・お気に入り更新・チャットのアプリ内通知
- 出品、編集、取り消し、譲渡完了
- 登録済み教科書候補の自動入力
- 譲渡品ごとのチャットと既読判定
- 出品者による交渉相手の選択・変更
- マイページ、通知センター、レスポンシブ表示

## 画面構成

- `/`：検索、履修科目の新着、おすすめ、注目商品、譲渡品一覧
- `/login`：ログイン、新規アカウント作成
- `/courses`：履修科目の検索・登録・解除
- `/items/new`：出品登録
- `/items/:itemId`：譲渡品詳細、チャット、交渉相手選択
- `/items/:itemId/edit`：出品内容編集
- `/mypage`：更新、出品、問い合わせ、お気に入り、閲覧履歴、保存検索、履修科目
- `/notifications`：通知一覧

## 3層構造

### フロントエンド

EJS、CSS、JavaScriptを利用しています。検索候補、棚型の商品表示、タブ、確認モーダル、レスポンシブUI、PWA表示を担当します。

### バックエンド

ExpressとTypeScriptを利用しています。検索、ログイン、出品、チャット、履修科目、通知、推薦処理を担当します。検索・通知・推薦・履修パーソナライズは `src/services` に分離しています。

### データベース

PostgreSQLをPrisma経由で操作します。教科書、教科、出品、チャット、お気に入り、閲覧履歴、保存検索、通知、推薦フィードバック、履修科目を保存します。

## v11で追加・拡張したDB

- `account_courses`：利用者と履修科目の多対多対応
- `courses.faculty`：開講学部
- `courses.term`：開講学期
- `courses.campus`：主な開講キャンパス

主な既存テーブルは `accounts`、`textbooks`、`courses`、`textbook_courses`、`items`、`chat_messages`、`favorites`、`item_views`、`saved_searches`、`notifications`、`recommendation_feedback` です。

## 増量したサンプルデータ

`npm run db:seed` では、既存データを一括削除せず、識別キーを使ってデモデータを追加・更新します。

- アカウント：24件分
- 教科書：42冊分
- 教科：情報工学、数学、通信、デザイン、経済、法学など複数分野
- 出品：84件分
- チャット：約120件分
- 履修登録：約140件分
- お気に入り・閲覧履歴・保存検索・通知・推薦フィードバック
- 募集中、交渉中、譲渡完了、取り消し済みを含む

既にv10以前のデモデータがある場合は、それらも残るため実際の総件数はさらに多くなります。seed実行中は10段階の進捗を表示します。

## デモ用アカウント

- 利用者零一 / `user01@keio.jp`
- 佐藤葵 / `aoi.sato@keio.jp`
- 加藤陽菜 / `hina.kato@keio.jp`
- 井上澪 / `mio.inoue@keio.jp`
- 阿部琴音 / `kotone.abe@keio.jp`

パスワードはなく、名前とメールアドレスの一致でログインします。

## ディレクトリ構成

```text
my-app/
├── index.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/services/
│   ├── search-service.ts
│   ├── recommendation-service.ts
│   ├── notification-service.ts
│   └── course-personalization-service.ts
├── tests/
├── public/
│   ├── css/style.css
│   ├── js/
│   │   ├── common.js
│   │   ├── textbook-search.js
│   │   └── search-suggestions.js
│   ├── manifest.webmanifest
│   ├── service-worker.js
│   └── offline.html
└── views/
    ├── partials/
    ├── index.ejs
    ├── courses.ejs
    ├── mypage.ejs
    └── その他の画面
```

## 起動方法

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm test
npm start
```

ブラウザで `http://localhost:8888` を開きます。

## 注意

`.env` に `DATABASE_URL` を設定してください。`.env` はGitや提出用zipには含めません。
