/* GET /naver/done — 네이버가 손님을 돌려보내는 자리 (Callback URL).
 *
 * 🛑 네이버 개발자센터 [API 설정] 의 Callback URL 과 **글자 하나까지** 같아야 한다.
 * 🛑 검수 통과 전에는 등록해 둔 테스트 아이디만 들어온다 — api/login/naver.js 의 쪽지 참고.
 */
import { 네이버켜졌나 } from '../_lib/세션.js';
import { 마무리, 쪽지 } from '../_lib/다녀옴.js';

export async function onRequestGet({ request, env }) {
  if (!네이버켜졌나(env)) return 쪽지('아직 안 켜졌습니다', '네이버 로그인이 꺼져 있습니다.', '/', 503);
  return 마무리(request, env, 'naver', 받아오기);
}

async function 받아오기(환경, 어디, code, 칸) {
  if (!code) return { 잘못: '네이버가 코드를 안 줬습니다.' };

  /* 🛑 네이버 토큰 창구는 redirect_uri 를 **안 받고 state 를 받는다** (카카오와 반대다).
   *    돌려받은 그 state 를 그대로 되돌려 줘야 한다 — 다른 값을 넣으면 거절한다. */
  const 묶음 = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: String(환경.NAVER_CLIENT_ID || '').trim(),
    client_secret: String(환경.NAVER_CLIENT_SECRET || '').trim(),
    code,
    state: String((칸 && 칸.get('state')) || ''),
  });

  let 열쇠, 새로고침표;
  try {
    const r = await fetch('https://nid.naver.com/oauth2.0/token?' + 묶음.toString());
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) {
      return { 잘못: `네이버가 거절했습니다 (${r.status} ${d.error || ''} ${d.error_description || ''}).` };
    }
    열쇠 = d.access_token;
    새로고침표 = d.refresh_token || '';
  } catch (e) {
    return { 잘못: '네이버에 연결하지 못했습니다.' };
  }

  /* 네이버도 **회원번호(id)와 닉네임**만 쓴다. 이메일·이름은 동의항목에서 아예 뺀다. */
  try {
    const r = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: 'Bearer ' + 열쇠 },
    });
    const d = await r.json().catch(() => ({}));
    const 속 = d.response || {};
    const 번호 = String(속.id || '').trim();
    if (!번호) return { 잘못: '네이버가 회원번호를 안 줬습니다.' };
    return { 번호, 닉: String(속.nickname || '').trim(), 새로고침표 };
  } catch (e) {
    return { 잘못: '네이버에 연결하지 못했습니다.' };
  }
}
