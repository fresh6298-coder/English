/**
 * Cloudflare Worker — Anthropic(Claude) API 프록시
 *
 * 앱(index.html)에서 이 Worker 주소로 요청을 보내면,
 * Worker가 서버에 저장된 API 키를 붙여 Anthropic으로 전달합니다.
 * → 사용자는 API 키를 몰라도 앱을 쓸 수 있습니다. (공유/배포용)
 *
 * 배포 방법은 이 폴더의 README.md 참고.
 *
 * 필요한 환경변수(Secret): ANTHROPIC_API_KEY
 * 선택 환경변수:
 *   ALLOW_ORIGIN  — 허용할 사이트 주소 (기본 "*", 예: "https://내아이디.github.io")
 *   ACCESS_TOKEN  — 간단한 접근 암호. 설정하면 요청 헤더 X-App-Token 이 일치해야 함.
 */
export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, x-app-token",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST")
      return json({ error: "Method Not Allowed" }, 405, cors);

    if (env.ACCESS_TOKEN && request.headers.get("x-app-token") !== env.ACCESS_TOKEN)
      return json({ error: "Unauthorized" }, 401, cors);

    if (!env.ANTHROPIC_API_KEY)
      return json({ error: "Server missing ANTHROPIC_API_KEY" }, 500, cors);

    const body = await request.text();

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...cors, "content-type": "application/json" },
    });
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
