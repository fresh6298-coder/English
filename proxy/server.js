/**
 * Node 프록시 서버 — Anthropic(Claude) API 프록시 (로컬 실행 / 자체 호스팅용)
 *
 * 외부 라이브러리 없이 Node 18+ 내장 모듈만 사용합니다.
 * 실행:
 *   ANTHROPIC_API_KEY=sk-ant-... node server.js
 *   (기본 포트 8787, 바꾸려면 PORT=3000)
 *
 * 앱 설정 → 연결 방식 "프록시 서버 사용" → URL 에 http://localhost:8787 입력.
 *
 * 선택 환경변수:
 *   ALLOW_ORIGIN — 허용할 사이트 주소 (기본 "*")
 *   ACCESS_TOKEN — 접근 암호. 설정 시 요청 헤더 X-App-Token 이 일치해야 함.
 */
const http = require("http");

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const ORIGIN = process.env.ALLOW_ORIGIN || "*";
const TOKEN = process.env.ACCESS_TOKEN || "";

if (!API_KEY) {
  console.error("환경변수 ANTHROPIC_API_KEY 가 필요합니다.");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-app-token",
  };

  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.method !== "POST") { res.writeHead(405, cors); return res.end("Method Not Allowed"); }
  if (TOKEN && req.headers["x-app-token"] !== TOKEN) {
    res.writeHead(401, { ...cors, "content-type": "application/json" });
    return res.end(JSON.stringify({ error: "Unauthorized" }));
  }

  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 2e6) req.destroy(); });
  req.on("end", async () => {
    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body,
      });
      const text = await upstream.text();
      res.writeHead(upstream.status, { ...cors, "content-type": "application/json" });
      res.end(text);
    } catch (e) {
      res.writeHead(502, { ...cors, "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    }
  });
});

server.listen(PORT, () => console.log(`프록시 서버 실행 중: http://localhost:${PORT}`));
