import http from "node:http";

// ポート番号の設定。Renderでは環境変数 PORT が使われるので、それがあれば使い、なければ 8888 を使う
const PORT = process.env.PORT || 8888;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // 日本語が文字化けしないよう UTF-8 を指定する
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  if (url.pathname === "/") {
    console.log("GET /");
    res.writeHead(200);
    res.end("こんにちは！");
  } else if (url.pathname === "/ask") {
    console.log("GET /ask");
    const q = url.searchParams.get("q") ?? "なにもなし";
    res.writeHead(200);
    res.end(`お主の質問は '${q}' じゃな？`);
  } else {
    res.writeHead(404);
    res.end("ページが見つかりませぬ");
  }
});

server.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ URL: http://localhost:${PORT}`);
});
