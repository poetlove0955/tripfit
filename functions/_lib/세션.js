/* 세션.js — 로그인한 사람을 알아보는 **단 하나의 자리**.
 *
 * ⭐ 왜 쿠키 한 장에 서명만 해서 끝내나 (서버에 로그인 목록을 안 두나)
 *    tripfit.pages.dev 는 파일을 뿌리는 곳이라 '켜져 있는 서버'가 없다.
 *    Functions 는 부를 때만 잠깐 깨어난다 — 로그인 상태를 메모리에 못 들고 있다.
 *    그래서 **손님이 자기 신분증을 들고 다니게** 하고, 우리는 그 위조 여부만 본다.
 *    (KV 에도 회원을 적어 두지만 그건 장부지 로그인 판정에는 안 쓴다.
 *     판정에 KV 를 읽으면 화면 한 번 열 때마다 읽기가 늘고, 느려지고, 무료 한도를 먹는다)
 *
 * 🛑 서명 없는 쿠키였으면 손님이 편집기로 카카오번호만 바꿔 남의 칸을 연다.
 *    HMAC-SHA256 으로 봉인하고, 열 때 **다시 계산해서 같은지** 본다.
 */

const 이름 = 'tf_세션';
export const 표쿠키 = 'tf_표';          // 카카오·네이버에 다녀오는 동안만 사는 쪽지
export const 표수명 = 600;              // 10분. 문 앞에서 그보다 오래 서 있지는 않는다
const 살날 = 180 * 24 * 60 * 60;          // 여행은 띄엄띄엄 온다. 한 번 들어오면 반년은 기억한다

function _바이트(글) { return new TextEncoder().encode(글); }

/* base64url — 쿠키에 '=' '+' '/' 가 들어가면 브라우저·프록시마다 다르게 군다 */
function _싸기(것) {
  const 배 = (것 instanceof Uint8Array) ? 것 : new Uint8Array(것);
  let s = '';
  for (let i = 0; i < 배.length; i++) s += String.fromCharCode(배[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function _풀기(글) {
  const s = atob(String(글).replace(/-/g, '+').replace(/_/g, '/'));
  const 배 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) 배[i] = s.charCodeAt(i);
  return 배;
}

async function _열쇠(비밀) {
  return crypto.subtle.importKey('raw', _바이트(비밀), { name: 'HMAC', hash: 'SHA-256' },
                                 false, ['sign']);
}

async function _도장(비밀, 글) {
  return _싸기(await crypto.subtle.sign('HMAC', await _열쇠(비밀), _바이트(글)));
}

/* 🛑 두 도장을 `===` 로 비교하면 '몇 글자까지 맞았나'가 시간으로 새어 나간다.
 *    길이를 먼저 맞추고 **끝까지 다 훑는다.** (짧은 글이라 값도 안 든다) */
function _같나(가, 나) {
  if (가.length !== 나.length) return false;
  let 다름 = 0;
  for (let i = 0; i < 가.length; i++) 다름 |= 가.charCodeAt(i) ^ 나.charCodeAt(i);
  return 다름 === 0;
}

/* ── 봉인/뜯기 — 서명한 쪽지 한 장. 세션도, 아래 '다녀오는 표'도 이걸 쓴다 ── */
export async function 봉인(비밀, 것) {
  const 속 = _싸기(_바이트(JSON.stringify(Object.assign({ 때: Math.floor(Date.now() / 1000) }, 것))));
  return 속 + '.' + await _도장(비밀, 속);
}

export async function 뜯기(비밀, 글, 살날초) {
  if (!글 || !비밀) return null;
  const 칸 = String(글).split('.');
  if (칸.length !== 2) return null;
  if (!_같나(칸[1], await _도장(비밀, 칸[0]))) return null;
  let 속;
  try { 속 = JSON.parse(new TextDecoder().decode(_풀기(칸[0]))); } catch (e) { return null; }
  if (!속) return null;
  if ((Math.floor(Date.now() / 1000) - (속.때 || 0)) > (살날초 || 살날)) return null;
  return 속;
}

/* 🛑 돌아갈 자리를 손님이 준 대로 믿으면 **우리 주소로 남의 사이트에 보내는 문**이 된다
 *    (open redirect — 피싱에 그대로 쓰인다). 우리 집 안의 길만 통과시킨다.
 *    `//남의집` 은 브라우저가 다른 사이트로 읽으므로 같이 막는다. */
export function 안전한길(길) {
  const g = String(길 || '').trim();
  if (!g.startsWith('/') || g.startsWith('//')) return '/';
  return g;
}

export async function 만들기(비밀, 사람) {
  const 속 = _싸기(_바이트(JSON.stringify({
    길: 사람.길 || 'kakao',
    번호: String(사람.번호 || ''),
    닉: String(사람.닉 || ''),
    때: Math.floor(Date.now() / 1000),
  })));
  return 속 + '.' + await _도장(비밀, 속);
}

export async function 읽기(비밀, 표) {
  if (!표 || !비밀) return null;
  const 칸 = String(표).split('.');
  if (칸.length !== 2) return null;
  if (!_같나(칸[1], await _도장(비밀, 칸[0]))) return null;   // 위조
  let 속;
  try { 속 = JSON.parse(new TextDecoder().decode(_풀기(칸[0]))); } catch (e) { return null; }
  if (!속 || !속.번호) return null;
  if ((Math.floor(Date.now() / 1000) - (속.때 || 0)) > 살날) return null;  // 너무 오래됨
  return 속;
}

/* 요청에 실려 온 쿠키에서 우리 것만 꺼낸다 */
export function 쿠키에서(요청) {
  const 줄 = 요청.headers.get('Cookie') || '';
  for (const 조각 of 줄.split(';')) {
    const i = 조각.indexOf('=');
    if (i > 0 && 조각.slice(0, i).trim() === 이름) return 조각.slice(i + 1).trim();
  }
  return '';
}

/* 🛑 HttpOnly — 자바스크립트가 못 읽어야 한다. 광고·확장프로그램이 훔쳐 가는 자리다.
 * 🛑 SameSite=Lax — 카카오가 손님을 되돌려보내는 것은 남의 사이트에서 오는 이동이다.
 *    Strict 로 잠그면 **돌아온 그 순간에 쿠키가 안 실려** 로그인이 조용히 실패한다. */
export function 굽기(칸이름, 값, 살날초) {
  return `${칸이름}=${값}; Path=/; Max-Age=${살날초}; HttpOnly; Secure; SameSite=Lax`;
}

export function 쿠키줄(값, 살날초) {
  return 굽기(이름, 값, (살날초 === undefined) ? 살날 : 살날초);
}

export function 지우는쿠키줄() { return 쿠키줄('', 0); }

export async function 지금누구(요청, 환경) {
  return 읽기(환경.SESSION_SECRET || '', 쿠키에서(요청));
}

export function 답(것, 코드) {
  return new Response(JSON.stringify(것), {
    status: 코드 || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8',
               'Cache-Control': 'no-store' },
  });
}

/* 카카오가 켜져 있나 — 이 한 줄이 화면의 노란 단추를 좌우한다.
 * ⭐ 키가 없으면 **아예 없는 것처럼** 군다. 반쯤 켜져서 손님 앞에서 오류를 내는 것보다 낫다. */
export function 카카오켜졌나(환경) {
  return !!(String(환경.KAKAO_REST_KEY || '').trim()
         && String(환경.SESSION_SECRET || '').trim());
}

export function 네이버켜졌나(환경) {
  return !!(String(환경.NAVER_CLIENT_ID || '').trim()
         && String(환경.NAVER_CLIENT_SECRET || '').trim()
         && String(환경.SESSION_SECRET || '').trim());
}

/* 우리 집 주소. 🛑 카카오·네이버는 redirect_uri 가 **등록해 둔 것과 글자 하나까지**
 *   같은지 본다. 요청 헤더에서 뽑으면 미리보기 배포(…pages.dev 하위 주소)에서 달라져
 *   그 자리에서 깨진다. 그래서 환경변수에 적어 둔 것을 먼저 쓴다. */
export function 우리주소(요청, 환경) {
  const 적은것 = String(환경.SITE_URL || '').trim().replace(/\/+$/, '');
  if (적은것) return 적은것;
  return new URL(요청.url).origin;
}
