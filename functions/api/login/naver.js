/* GET /api/login/naver — 초록 단추.
 *
 * 🛑 네이버는 카카오와 결정적으로 다르다 — **검수를 통과하기 전에는
 *    개발자 본인과 '멤버 관리'에 적어 둔 테스트 아이디만 로그인된다.**
 *    손님이 누르면 "개발 중 상태에서는 등록된 아이디만" 이라는 알림을 보게 된다.
 *    그래서 키를 넣기 전까지 이 단추는 화면에 아예 안 뜬다 (네이버켜졌나).
 *    검수는 화면 캡처를 붙여 신청한다 — 로그인 화면이 살아 있어야 신청이 된다.
 *    ⭐ 그러니 순서는 **카카오로 먼저 열고 → 네이버 검수 신청 → 통과하면 켜기** 다.
 */
import { 네이버켜졌나, 우리주소, 봉인, 안전한길, 굽기, 표쿠키, 표수명 }
  from '../../_lib/세션.js';

export async function onRequestGet({ request, env }) {
  if (!네이버켜졌나(env)) {
    return new Response(
      '<meta charset="utf-8"><p style="font:15px/1.6 system-ui;padding:40px">'
      + '네이버 로그인은 아직 준비 중입니다. 카카오로 들어와 주세요.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const 온길 = new URL(request.url);
  const 돌아갈 = 안전한길(온길.searchParams.get('돌아갈'));
  const 팝업 = 온길.searchParams.get('팝업') === '1';

  const 표값 = crypto.randomUUID().replace(/-/g, '');
  const 쪽지 = await 봉인(env.SESSION_SECRET, { 표: 표값, 돌아갈, 팝업 });

  const 묶음 = new URLSearchParams({
    response_type: 'code',
    client_id: String(env.NAVER_CLIENT_ID || '').trim(),
    redirect_uri: 우리주소(request, env) + '/naver/done',
    state: 표값,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: 'https://nid.naver.com/oauth2.0/authorize?' + 묶음.toString(),
      'Set-Cookie': 굽기(표쿠키, 쪽지, 표수명),
      'Cache-Control': 'no-store',
    },
  });
}
