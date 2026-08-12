/* POST /api/logout — 나가기. 신분증을 회수하는 것뿐이다.
 *
 * 🛑 GET 으로 열어 두면 안 된다. 남의 사이트가 `<img src=".../api/logout">` 한 줄로
 *    우리 손님을 로그아웃시킬 수 있다. 이미지 태그는 POST 를 못 보낸다.
 *
 * ⭐ 카카오 연결까지 끊는 것은 [그만두기] 지 [나가기] 가 아니다. 여기서는 안 끊는다 —
 *    끊어 버리면 다음에 들어올 때 동의 화면을 처음부터 다시 봐야 한다(3초가 깨진다).
 */
import { 지우는쿠키줄 } from '../_lib/세션.js';

export async function onRequestPost() {
  return new Response(JSON.stringify({ 됨: true }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': 지우는쿠키줄(),
    },
  });
}
