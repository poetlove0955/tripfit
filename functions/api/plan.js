/* /api/plan — 🧳 손님이 적어 둔 여행 계획 (최대 3개).
 *
 * ⭐ 왜 서버에도 두나
 *    계획을 이 컴퓨터(localStorage)에만 두면 **카톡을 보내는 쪽이 읽을 자리가 없다.**
 *    값이 내려갔을 때 알리는 것은 손님 브라우저가 아니라 집 PC 공장이 하는 일이라,
 *    공장이 읽을 수 있는 곳에 한 벌이 있어야 한다.
 *
 *    GET   /api/plan   들어온 사람만 — 내 계획과 「카톡 보내도 되나」
 *    POST  /api/plan   들어온 사람만 — 내 계획 통째로 갈아 끼우기
 *
 * 🛑 계획에 사람 이야기를 담지 않는다. 나라·도시·날짜뿐이다.
 *    화면이 보내 준 것 중 **우리가 아는 칸만** 골라 담는다 —
 *    흰 목록에서 빠진 칸은 조용히 사라지는 게 맞다 (모르는 것을 저장하지 않는다).
 */
import { 지금누구, 답 } from '../_lib/세션.js';

const 앞 = '계획:';
const 최대 = 3;

export async function onRequestGet({ request, env }) {
  const 나 = await 지금누구(request, env);
  if (!나) return 답({ 잘못: '로그인이 필요합니다.' }, 401);
  if (!env.TRIPFIT) return 답({ 계획: [], 카톡: false });

  const 것 = await env.TRIPFIT.get(앞 + 나.길 + ':' + 나.번호, 'json');
  return 답({ 계획: (것 && 것.계획) || [], 카톡: await 카톡되나(env, 나) });
}

export async function onRequestPost({ request, env }) {
  const 나 = await 지금누구(request, env);
  if (!나) return 답({ 잘못: '로그인이 필요합니다.' }, 401);
  if (!env.TRIPFIT) return 답({ 잘못: '아직 적어 둘 자리가 없습니다.' }, 503);

  let 몸;
  try { 몸 = await request.json(); } catch (e) { 몸 = {}; }
  const 계획 = Array.isArray(몸 && 몸.계획) ? 몸.계획.slice(0, 최대).map(다듬기).filter(Boolean) : [];

  const 열쇠 = 앞 + 나.길 + ':' + 나.번호;
  if (!계획.length) {
    /* 🛑 빈 것을 적어 두면 공장이 매번 읽고 매번 아무 일도 안 한다. 통째로 지운다. */
    await env.TRIPFIT.delete(열쇠);
    return 답({ 됨: true, 계획: [] });
  }

  await env.TRIPFIT.put(열쇠, JSON.stringify({
    길: 나.길, 번호: String(나.번호), 닉: 나.닉 || '',
    계획, 때: new Date().toISOString(),
  }));
  return 답({ 됨: true, 계획, 카톡: await 카톡되나(env, 나) });
}

/* 화면이 보내 준 것 중 **우리가 아는 칸만** 담는다 */
function 다듬기(c) {
  if (!c || typeof c !== 'object') return null;
  const 날 = (v) => {
    const s = String(v || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  };
  const 것 = {
    나라: String(c.나라 || '').slice(0, 20),
    도시: String(c.도시 || '').slice(0, 20),
    시작: 날(c.시작),
    끝: 날(c.끝) || 날(c.시작),
    알림: !!c.알림,
  };
  if (!것.나라 || !것.시작) return null;
  if (것.끝 < 것.시작) 것.끝 = 것.시작;
  return 것;
}

/* 카카오톡 [메시지 보내기] 동의를 받아 뒀나. 로그인 장부에 적혀 있다.
 * 🛑 이걸 못 보면 화면은 [🔔] 을 켰다고 표시하는데 카톡은 영영 안 간다 —
 *    침묵이 성공의 증거가 되면 안 된다. */
async function 카톡되나(환경, 나) {
  if (!환경.TRIPFIT || !나) return false;
  try {
    const 것 = await 환경.TRIPFIT.get(`회원:${나.길}:${나.번호}`, 'json');
    return !!(것 && 것.카톡 && 것.새로고침표);
  } catch (e) { return false; }
}
