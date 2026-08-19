/* /api/alert — 🔔 값이 내려갔을 때 **카카오톡으로 보내는 창구**.
 *
 * ⭐ 왜 여기가 보내는 자리인가
 *    값을 아는 것은 집 PC 공장(트립핏공장.py)이다. 카카오에 말을 걸 수 있는 것은
 *    손님의 새로고침표를 쥔 이쪽(Functions)이다. 그래서 둘로 나눈다 —
 *      ① 공장이 GET 으로 **누가 무엇을 기다리는지** 받아 간다
 *      ② 공장이 값을 견줘 보고, 보낼 것만 POST 로 되돌려 준다
 *      ③ 여기가 카카오에 실제로 보낸다
 *    공장에 카카오 열쇠를 내려보내지 않아도 되고, 여기서 300개 묶음을 읽지 않아도 된다.
 *
 * 🛑 이 창구는 **공장 열쇠(FACTORY_KEY)** 가 있어야 열린다. 없으면 아무나 남의
 *    계획 목록을 긁어 간다. 열쇠를 안 적어 뒀으면 창구 자체가 닫혀 있다.
 *
 * 🛑 카카오 [나에게 보내기] 는 talk_message 동의를 받은 손님에게만 간다.
 *    거절당하면 그 자리에서 장부의 `카톡` 을 끈다 — 안 끄면 화면은 계속
 *    "알림 켜짐" 이라고 말하는데 카톡은 영영 안 온다 (침묵이 성공의 증거가 되면 안 된다).
 */
import { 답 } from '../_lib/세션.js';

const 계획앞 = '계획:';
/* 🛑 무료 Cloudflare 는 **요청 하나당 바깥 부름이 50번**인데, 한 통이 두 번을 쓴다
   (표 갱신 + 발송). 60통을 받으면 25통째에서 이 요청이 통째로 끊긴다 — 그래서
   공장이 20통씩 나눠 보내고, 여기서도 한 번 더 막는다. */
const 최대보냄 = 20;
const 최대살림 = 45;                 // 표만 갱신할 때는 한 통에 한 번이라 더 갈 수 있다

function 공장인가(요청, 환경) {
  const 적은것 = String(환경.FACTORY_KEY || '').trim();
  if (!적은것) return false;
  const 온것 = String(요청.headers.get('x-tf-key') || '').trim();
  if (온것.length !== 적은것.length) return false;
  let 다름 = 0;
  for (let i = 0; i < 온것.length; i++) 다름 |= 온것.charCodeAt(i) ^ 적은것.charCodeAt(i);
  return 다름 === 0;
}

/* ── ① 누가 무엇을 기다리나 ── */
export async function onRequestGet({ request, env }) {
  if (!공장인가(request, env)) return 답({ 잘못: '권한이 없습니다.' }, 403);
  if (!env.TRIPFIT) return 답({ 줄: [] });

  const 오늘 = new Date().toISOString().slice(0, 10);
  const 목록 = await env.TRIPFIT.list({ prefix: 계획앞, limit: 1000 });
  const 줄 = [];
  for (const k of 목록.keys) {
    const 것 = await env.TRIPFIT.get(k.name, 'json');
    if (!것 || !Array.isArray(것.계획)) continue;
    /* 🛑 알림을 안 켠 계획과 이미 지난 계획은 공장에 내려보내지 않는다 —
       공장이 그걸 다시 걸러야 한다면 규칙이 두 군데 있는 것이다. */
    const 쓸것 = 것.계획.filter((c) => c && c.알림 && (c.끝 || c.시작) >= 오늘);
    if (!쓸것.length) continue;
    const 회원 = await env.TRIPFIT.get(`회원:${것.길}:${것.번호}`, 'json');
    if (!회원 || !회원.카톡 || !회원.새로고침표) continue;   // 보낼 길이 없는 사람은 뺀다
    줄.push({ 길: 것.길, 번호: 것.번호, 닉: 것.닉 || '', 계획: 계획추리기(쓸것) });
  }
  return 답({ 줄, 오늘 });
}

/* KV 에 담긴 계획에서 공장이 볼 칸만.
   🛑 **여기 안 적은 칸은 오류 하나 없이 사라진다.** 화면에 칸을 새로 만들면 반드시
      이 줄에도 같이 적어야 한다 — 손님은 골랐는데 아무 일도 안 일어나는 자리다.
   🎯 목표값 = "이 값 이하면 알려 줘" (0 이면 안 적은 것 = 예전대로 할인율로 본다) */
function 계획추리기(계획) {
  return 계획.map((c) => ({
    나라: c.나라,
    도시: c.도시 || '',
    시작: c.시작,
    끝: c.끝 || c.시작,
    목표값: Number(c.목표값) > 0 ? Math.round(Number(c.목표값)) : 0,
  }));
}

/* ── ② 보낼 것만 받아서 실제로 보낸다 ── */
export async function onRequestPost({ request, env }) {
  if (!공장인가(request, env)) return 답({ 잘못: '권한이 없습니다.' }, 403);
  if (!env.TRIPFIT) return 답({ 잘못: '장부가 없습니다.' }, 503);

  let 몸;
  try { 몸 = await request.json(); } catch (e) { 몸 = {}; }
  const 보낼것 = Array.isArray(몸 && 몸.보냄) ? 몸.보냄.slice(0, 최대보냄) : [];
  const 살릴까 = !!(몸 && 몸.살리기);
  if (!보낼것.length && !살릴까) return 답({ 보냄: 0, 줄: [] });

  const 결과 = [];
  for (const 것 of 보낼것) {
    결과.push(await 하나보내기(env, 것));
  }

  /* 🔔 보낼 것이 없어도 표는 살려 둔다 — 아래 표살리기() 의 설명을 볼 것.
     이미 쓴 부름(한 통에 두 번)만큼 빼고 남은 만큼만 만진다. */
  let 살림 = 0;
  let 끊김 = 0;
  if (살릴까) {
    const 잰 = await 표살리기(env, 최대살림 - 보낼것.length * 2);
    살림 = 잰.살림;
    끊김 = 잰.끊김;
  }

  return 답({ 보냄: 결과.filter((r) => r.됨).length, 줄: 결과, 살림, 끊김 });
}

/* ── ③ 두 달 뒤 조용히 죽는 자리를 막는다 ──
 * 🛑 카카오 새로고침표는 **두 달**이면 만료된다. 보낼 것이 있을 때만 표를 만지면,
 *    값이 두 달 내내 안 내려간 손님은 그날 이후 **영영 못 받는다.** 화면은 "알림
 *    켜짐"이라 말하는데 카톡은 안 온다 — 침묵이 성공의 증거가 되면 안 된다.
 * 🛑 한 요청의 바깥 부름이 정해져 있으니 **몇 명까지만** 한다. 남은 분은 다음
 *    회차에 걸린다 (며칠에 한 번이면 충분하다).
 */
async function 표살리기(환경, 몇명) {
  const 끝수 = Math.max(0, Math.min(Number(몇명) || 0, 최대살림));
  if (!끝수) return { 살림: 0, 끊김: 0 };

  const 오늘 = new Date().toISOString().slice(0, 10);
  const 목록 = await 환경.TRIPFIT.list({ prefix: 계획앞, limit: 1000 });
  let 살림 = 0;
  let 끊김 = 0;
  for (const k of 목록.keys) {
    if (살림 + 끊김 >= 끝수) break;
    const 것 = await 환경.TRIPFIT.get(k.name, 'json');
    if (!것 || !Array.isArray(것.계획)) continue;
    if (!것.계획.some((c) => c && c.알림 && (c.끝 || c.시작) >= 오늘)) continue;
    const 열쇠이름 = `회원:${것.길}:${것.번호}`;
    const 회원 = await 환경.TRIPFIT.get(열쇠이름, 'json');
    if (!회원 || !회원.카톡 || !회원.새로고침표) continue;
    const 표 = await 표갱신(환경, 열쇠이름, 회원);
    if (표.열쇠) 살림 += 1;
    else 끊김 += 1;
  }
  return { 살림, 끊김 };
}

/* 새로고침표 → 지금 쓸 수 있는 열쇠.
 * 🛑 카카오가 새 새로고침표를 같이 줄 때가 있다 (만료 한 달 전부터).
 *    안 갈아 두면 그날 이후로 전부 조용히 실패한다.
 * 🛑 손님이 카카오 [연결된 서비스] 에서 우리를 끊은 것이 제일 흔하다. 그러면 영영
 *    못 보내므로 장부를 **사실대로** 고친다.
 */
async function 표갱신(환경, 열쇠이름, 회원) {
  try {
    const 묶 = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: String(환경.KAKAO_REST_KEY || '').trim(),
      refresh_token: 회원.새로고침표,
    });
    const 비밀 = String(환경.KAKAO_CLIENT_SECRET || '').trim();
    if (비밀) 묶.set('client_secret', 비밀);
    const r = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: 묶.toString(),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) {
      await 카톡끄기(환경, 열쇠이름, 회원);
      return { 왜: `표 갱신 실패 (${r.status} ${d.error || ''})` };
    }
    if (d.refresh_token && d.refresh_token !== 회원.새로고침표) {
      회원.새로고침표 = d.refresh_token;
      await 환경.TRIPFIT.put(열쇠이름, JSON.stringify(회원));
    }
    return { 열쇠: d.access_token };
  } catch (e) {
    return { 왜: '카카오에 연결하지 못했습니다' };
  }
}

async function 하나보내기(환경, 것) {
  const 길 = String(것.길 || 'kakao');
  const 번호 = String(것.번호 || '');
  const 말 = String(것.말 || '').slice(0, 190);          // 카카오 텍스트는 200자까지
  const 링크 = String(것.링크 || '');
  if (길 !== 'kakao' || !번호 || !말) return { 번호, 됨: false, 왜: '보낼 것이 모자랍니다' };

  const 열쇠이름 = `회원:${길}:${번호}`;
  const 회원 = await 환경.TRIPFIT.get(열쇠이름, 'json');
  if (!회원 || !회원.새로고침표) return { 번호, 됨: false, 왜: '새로고침표 없음' };

  const 표 = await 표갱신(환경, 열쇠이름, 회원);
  if (!표.열쇠) return { 번호, 됨: false, 왜: 표.왜 };
  const 열쇠 = 표.열쇠;

  /* 나에게 보내기 — 손님 자신의 카톡방으로 간다 (친구에게 보내는 것이 아니다) */
  try {
    const 틀 = {
      object_type: 'text',
      text: 말,
      link: 링크 ? { web_url: 링크, mobile_web_url: 링크 } : {},
    };
    if (링크) 틀.button_title = '값 보러 가기';

    const r = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + 열쇠,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({ template_object: JSON.stringify(틀) }).toString(),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      /* -402 = 동의 안 됨. 화면이 "알림 켜짐" 이라고 말하고 있으면 안 된다. */
      if (d.code === -402 || r.status === 403) await 카톡끄기(환경, 열쇠이름, 회원);
      return { 번호, 됨: false, 왜: `카카오 거절 (${r.status} ${d.code || ''} ${d.msg || ''})` };
    }
    return { 번호, 됨: true };
  } catch (e) {
    return { 번호, 됨: false, 왜: '보내지 못했습니다' };
  }
}

async function 카톡끄기(환경, 열쇠이름, 회원) {
  try {
    회원.카톡 = false;
    await 환경.TRIPFIT.put(열쇠이름, JSON.stringify(회원));
  } catch (e) { /* 못 적어도 보내기 결과는 그대로 알린다 */ }
}
