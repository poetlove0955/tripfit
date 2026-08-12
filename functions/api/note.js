/* /api/note — 손님이 적어 보내는 「여기 뭐가 이상해요」 한 줄.
 *
 * 🛑 이 파일은 **쓰는 쪽과 읽는 쪽을 같이** 만든다.
 *    취업ON 에서 겪은 그 자리다 — 한마디가 장부에 잘 쌓이는데 **화면 어디서도
 *    읽지 않아** 대표가 볼 방법이 없었다. 들어와도 못 보면 안 받은 것과 같다.
 *
 *    POST  /api/note              누구나 (열쇠 없음)     — 한 줄 적기
 *    POST  /api/note {봤음:"..."} 대표만                  — 봤음/안봤음 뒤집기
 *    GET   /api/note              대표만                  — 받은 것 목록
 *
 * ⭐ 대표를 알아보는 방법이 **비밀번호가 아니라 카카오 회원번호**다.
 *    ADMIN_KAKAO_ID 와 지금 로그인한 번호가 같으면 대표다. 외울 게 하나도 안 는다.
 */
import { 지금누구, 답 } from '../_lib/세션.js';

const 앞 = '보고:';
const 최대글자 = 500;
const 시간당 = 20;                    // 한 사람이 한 시간에 이만큼까지

export async function onRequestPost({ request, env }) {
  if (!env.TRIPFIT) return 답({ 잘못: '아직 받을 자리가 없습니다.' }, 503);

  let 몸;
  try { 몸 = await request.json(); } catch (e) { 몸 = {}; }
  const 나 = await 지금누구(request, env);

  /* ── 대표가 [봤음] 을 누른 것 ── */
  if (몸 && 몸.봤음) {
    if (!대표인가(나, env)) return 답({ 잘못: '권한이 없습니다.' }, 403);
    const 열쇠 = String(몸.봤음);
    if (!열쇠.startsWith(앞)) return 답({ 잘못: '이상한 열쇠입니다.' }, 400);
    const 것 = await env.TRIPFIT.get(열쇠, 'json');
    if (!것) return 답({ 잘못: '없는 것입니다.' }, 404);
    것.봤나 = !것.봤나;
    await env.TRIPFIT.put(열쇠, JSON.stringify(것));
    return 답({ 됨: true, 봤나: 것.봤나 });
  }

  /* ── 손님이 한 줄 적은 것 ── */
  const 말 = String((몸 && 몸.말) || '').trim().slice(0, 최대글자);
  if (!말) return 답({ 잘못: '한 줄만 적어 주세요.' }, 400);

  /* 🛑 IP 를 기록에 남기지 않는다. 막는 데만 쓰고 그 자리에서 버린다.
   *    손님이 불편을 적어 보냈다고 그 사람의 주소를 우리가 갖고 있을 이유가 없다. */
  const 막힘 = await 너무많나(env, request);
  if (막힘) return 답({ 잘못: '조금 뒤에 다시 보내 주세요.' }, 429);

  const 이제 = new Date();
  /* ⭐ 열쇠를 **거꾸로 센 시각**으로 만든다. KV 목록은 글자순(오름차순)으로만 오는데,
   *    우리가 늘 보고 싶은 건 최신순이다. 거꾸로 세면 최신이 맨 앞에 온다. */
  const 거꾸로 = String(9999999999999 - 이제.getTime()).padStart(13, '0');
  const 열쇠 = 앞 + 거꾸로 + '-' + crypto.randomUUID().slice(0, 8);

  await env.TRIPFIT.put(열쇠, JSON.stringify({
    때: 이제.toISOString(),
    종류: ['불편', '오류', '바람'].includes(몸.종류) ? 몸.종류 : '불편',
    말,
    어디: String((몸 && 몸.어디) || '').slice(0, 80),
    화면: String((몸 && 몸.화면) || '').slice(0, 200),
    닉: 나 ? 나.닉 : '',
    번호: 나 ? 나.번호 : '',
    길: 나 ? 나.길 : '',
    봤나: false,
  }));

  return 답({ 됨: true });
}

export async function onRequestGet({ request, env }) {
  const 나 = await 지금누구(request, env);
  if (!대표인가(나, env)) return 답({ 잘못: '권한이 없습니다.' }, 403);
  if (!env.TRIPFIT) return 답({ 줄: [], 안본것: 0 });

  const 목록 = await env.TRIPFIT.list({ prefix: 앞, limit: 100 });
  const 줄 = [];
  for (const k of 목록.keys) {
    const 것 = await env.TRIPFIT.get(k.name, 'json');
    if (것) 줄.push(Object.assign({ 열쇠: k.name }, 것));
  }
  return 답({ 줄, 안본것: 줄.filter((r) => !r.봤나).length });
}

function 대표인가(나, 환경) {
  const 적은것 = String(환경.ADMIN_KAKAO_ID || '').trim();
  return !!(적은것 && 나 && String(나.번호) === 적은것);
}

/* 한 시간에 몇 번 보냈나. 🛑 주소 자체를 열쇠로 쓰지 않는다 —
 * 장부를 열어 본 사람이 누가 어디서 썼는지 읽을 수 있으면 안 된다. 섞어서 짧게 줄인다. */
async function 너무많나(환경, 요청) {
  try {
    const 주소 = 요청.headers.get('CF-Connecting-IP') || '?';
    const 씨 = await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(주소 + '|' + (환경.SESSION_SECRET || '')));
    const 짧게 = Array.from(new Uint8Array(씨).slice(0, 8))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    const 열쇠 = '셈:' + 짧게;
    const 지금 = Number(await 환경.TRIPFIT.get(열쇠)) || 0;
    if (지금 >= 시간당) return true;
    await 환경.TRIPFIT.put(열쇠, String(지금 + 1), { expirationTtl: 3600 });
    return false;
  } catch (e) {
    return false;                     // 세는 데 실패했다고 손님 말을 막지 않는다
  }
}
