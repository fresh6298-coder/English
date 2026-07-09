# 프록시 서버 (API 키 숨기기 / 공유용)

앱을 다른 사람과 공유하거나, 브라우저에 API 키를 직접 넣고 싶지 않을 때 사용합니다.
프록시 서버가 **서버 쪽에 저장된 API 키**로 Claude에 요청을 대신 보내주므로,
앱 사용자는 키를 몰라도 됩니다.

두 가지 방법 중 편한 것을 고르세요.

---

## 방법 A. Cloudflare Workers (권장 · 무료 · 24시간 동작)

`worker.js` + `wrangler.toml` 사용.

1. Cloudflare 계정 만들기 (무료): https://dash.cloudflare.com/sign-up
2. Wrangler 설치
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. 이 `proxy/` 폴더에서 배포
   ```bash
   cd proxy
   wrangler secret put ANTHROPIC_API_KEY   # 물어보면 sk-ant-... 키 붙여넣기
   wrangler deploy
   ```
4. 배포되면 주소가 나옵니다. 예: `https://english-tutor-proxy.내계정.workers.dev`
5. 앱 → **⚙️ 설정 → 연결 방식: 프록시 서버 사용** → 그 주소를 붙여넣고 저장.

### (선택) 보안 강화
- 내 사이트에서만 호출 허용: `wrangler.toml`의 `ALLOW_ORIGIN`을 내 주소로 지정
- 간단한 접근 암호: `wrangler secret put ACCESS_TOKEN`
  (이 경우 앱에서 직접 호출하려면 요청에 `X-App-Token` 헤더가 필요합니다.
  개인용이면 생략해도 됩니다.)

---

## 방법 B. 내 컴퓨터에서 실행 (로컬 · 자체 호스팅)

`server.js` 사용. Node 18+ 만 있으면 됩니다. (추가 설치 없음)

```bash
cd proxy
ANTHROPIC_API_KEY=sk-ant-... node server.js
# → http://localhost:8787 에서 실행
```

앱 → 설정 → 연결 방식: 프록시 서버 사용 → `http://localhost:8787` 입력.

> 이 방식은 서버(터미널)를 켜둔 동안에만 동작합니다.
> 항상 켜두려면 방법 A(Cloudflare)를 권장합니다.

---

## 방법 C. Vercel / 기타 서버리스

`server.js`의 로직을 그대로 함수 하나로 옮기면 됩니다. 핵심만 요약:

- 요청 body(JSON)를 그대로 `https://api.anthropic.com/v1/messages` 로 전달
- 헤더에 `x-api-key`(내 키), `anthropic-version: 2023-06-01` 추가
- 응답을 그대로 돌려주고, CORS 헤더(`Access-Control-Allow-Origin`) 포함

API 키는 반드시 **환경변수**로 저장하고 코드에 직접 쓰지 마세요.

---

## 동작 원리

```
[브라우저 앱] --(문장)--> [프록시 서버 + 내 API 키] --> [Anthropic Claude]
      ^                                                        |
      +---------------------- 첨삭 결과 ------------------------+
```

- 앱은 프록시에 키를 보내지 않습니다. 키는 서버에만 있습니다.
- `direct` 방식(설정 기본값)은 프록시 없이 브라우저가 직접 Claude를 호출하며,
  이때는 키가 그 브라우저(localStorage)에만 저장됩니다.
