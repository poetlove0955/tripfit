/* GET /api/login/kakao — 노란 단추가 부르는 자리. 카카오 로그인 화면으로 그대로 넘긴다.
 *
 * ⭐ 3초의 요령: 이 자리는 **팝업 창에서 열린다.** 그래서 손님이 보던 검색 결과가
 *    그대로 뒤에 남아 있고, 다녀오면 그 자리에서 이름만 바뀐다.
 *    (팝업이 막힌 브라우저면 화면 전체가 다녀오고 `돌아갈` 로 되돌아온다 — 아래 쪽지에 실린다)
 */
import { 카카오켜졌나, 우리주소, 봉인, 안전한길, 굽기, 표쿠키, 표수명 }
  from '../../_lib/세션.js';

export async function onRequestGet({ request, env }) {
  if (!카카오켜졌나(env)) {
    return new Response(
      '<meta charset="utf-8"><p style="font:15px/1.6 system-ui;padding:40px">'
      + '카카오 로그인이 아직 안 켜졌습니다.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const 온길 = new URL(request.url);
  const 돌아갈 = 안전한길(온길.searchParams.get('돌아갈'));
  const 팝업 = 온길.searchParams.get('팝업') === '1';
  /* 🔔 값 알림을 켜는 손님만 여기로 온다 — 카카오톡 [나에게 보내기] 추가 동의.
   * 🛑 이걸 **로그인할 때 같이 받지 않는다.** 값만 보러 온 손님에게 처음부터
   *    「메시지 보내기」 동의를 들이밀면 3초가 30초가 되고, 그 자리에서 나간다. */
  const 카톡동의 = 온길.searchParams.get('동의') === 'talk';

  /* state — 우리가 보낸 손님이 맞는지 되돌아올 때 맞춰 보는 쪽지.
   * 🛑 이게 없으면 남이 만든 주소로 우리 문을 두드리게 할 수 있다 (CSRF).
   * ⭐ 취업ON 은 이걸 서버 메모리에 뒀지만 여기는 **켜져 있는 서버가 없다.**
   *    그래서 서명한 쿠키에 실어 손님 손에 들려 보낸다 — 손대면 도장이 안 맞는다. */
  const 표값 = crypto.randomUUID().replace(/-/g, '');
  const 쪽지 = await 봉인(env.SESSION_SECRET, { 표: 표값, 돌아갈, 팝업 });

  const 묶음 = new URLSearchParams({
    client_id: String(env.KAKAO_REST_KEY || '').trim(),
    redirect_uri: 우리주소(request, env) + '/kakao/done',
    response_type: 'code',
    state: 표값,
  });
  if (카톡동의) 묶음.set('scope', 'talk_message');

  return new Response(null, {
    status: 302,
    headers: {
      Location: 'https://kauth.kakao.com/oauth/authorize?' + 묶음.toString(),
      'Set-Cookie': 굽기(표쿠키, 쪽지, 표수명),
      'Cache-Control': 'no-store',
    },
  });
}
