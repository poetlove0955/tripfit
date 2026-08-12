/* GET /kakao/done — 카카오가 손님을 돌려보내는 자리 (redirect_uri).
 *
 * 🛑 이 주소는 **카카오 개발자 화면에 적어 둔 것과 글자 하나까지 같아야** 한다.
 *    다르면 카카오가 KOE006 으로 문 앞에서 돌려보낸다. (취업ON 에서 겪은 자리)
 *
 * 돌아온 뒤에 하는 일은 네이버와 똑같아서 _lib/다녀옴.js 한 곳에 있다.
 * 여기 있는 것은 **카카오에게서 번호와 닉네임을 받아오는 방법** 하나뿐이다.
 */
import { 카카오켜졌나 } from '../_lib/세션.js';
import { 마무리, 쪽지 } from '../_lib/다녀옴.js';

export async function onRequestGet({ request, env }) {
  if (!카카오켜졌나(env)) return 쪽지('아직 안 켜졌습니다', '카카오 로그인이 꺼져 있습니다.', '/', 503);
  return 마무리(request, env, 'kakao', 받아오기);
}

async function 받아오기(환경, 어디, code) {
  if (!code) return { 잘못: '카카오가 코드를 안 줬습니다.' };

  const 몸 = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: String(환경.KAKAO_REST_KEY || '').trim(),
    redirect_uri: 어디 + '/kakao/done',
    code,
  });
  const 비밀 = String(환경.KAKAO_CLIENT_SECRET || '').trim();
  if (비밀) 몸.set('client_secret', 비밀);       // 카카오 [보안] 에서 켠 경우에만

  let 열쇠, 새로고침표;
  try {
    const r = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: 몸.toString(),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) {
      return { 잘못: `카카오가 거절했습니다 (${r.status} ${d.error || ''} ${d.error_description || ''}).` };
    }
    열쇠 = d.access_token;
    새로고침표 = d.refresh_token || '';
  } catch (e) {
    return { 잘못: '카카오에 연결하지 못했습니다.' };
  }

  /* 🛑 가져오는 것은 **회원번호와 닉네임 둘뿐**이다.
   *    이메일·전화번호·생일은 안 받는다 — 받으면 지켜야 할 게 느는데, 이 사이트가
   *    그걸로 할 일이 하나도 없다. (덤으로 카카오 검수도 필요 없어진다) */
  try {
    const r = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: 'Bearer ' + 열쇠 },
    });
    const d = await r.json().catch(() => ({}));
    const 번호 = String(d.id || '').trim();
    if (!번호) return { 잘못: '카카오가 회원번호를 안 줬습니다.' };
    const 속 = d.properties || {};
    const 프 = (d.kakao_account || {}).profile || {};
    return { 번호, 닉: String(속.nickname || 프.nickname || '').trim(), 새로고침표 };
  } catch (e) {
    return { 잘못: '카카오에 연결하지 못했습니다.' };
  }
}
