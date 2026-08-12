/* 다녀옴.js — 카카오든 네이버든 **돌아온 뒤에 하는 일은 똑같다.**
 *
 * ⭐ 문이 둘이라고 판정도 둘로 갈라 놓으면, 한쪽만 고치는 날이 반드시 온다.
 *    그래서 다른 것은 '번호와 닉네임을 어떻게 받아오나' 하나뿐이고,
 *    나머지(표 맞추기 · 장부 · 신분증 · 창 닫기)는 여기 한 곳에서 한다.
 */
import { 우리주소, 뜯기, 만들기, 굽기, 쿠키줄, 안전한길, 표쿠키, 표수명 } from './세션.js';

export function 쿠키하나(요청, 이름) {
  const 줄 = 요청.headers.get('Cookie') || '';
  for (const 조각 of 줄.split(';')) {
    const i = 조각.indexOf('=');
    if (i > 0 && 조각.slice(0, i).trim() === 이름) return 조각.slice(i + 1).trim();
  }
  return '';
}

export function 쪽지(제목, 말, 돌아갈, 코드) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>${제목}</title>
<div style="font:15px/1.7 system-ui,'맑은 고딕';max-width:460px;margin:14vh auto;padding:0 22px;
            color:#2b3a3d;text-align:center">
  <div style="font-size:38px">🙂</div>
  <h2 style="font-size:19px;margin:10px 0 6px;color:#0d697c">${제목}</h2>
  <p style="color:#5b7075">${말}</p>
  <p style="margin-top:22px"><a href="${돌아갈 || '/'}"
     style="display:inline-block;background:#0d697c;color:#fff;text-decoration:none;
            padding:11px 22px;border-radius:10px;font-weight:700">돌아가기</a></p>
</div>
<script>try{ window.opener && window.opener.postMessage({트립핏:'로그인', 됨:false}, '*'); }catch(e){}</script>`,
    { status: 코드 || 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

/* 팝업으로 다녀왔으면 창을 닫고, 뒤에 있던 화면에 "됐다"고만 알린다.
 * 🛑 이름·번호를 쪽지에 실어 보내지 않는다. 화면은 /api/me 를 한 번 물어보면 된다 —
 *    실어 보내면 그 값이 진짜인지 화면이 확인할 방법이 없다. */
function 닫기HTML(돌아갈, 팝업, 어디) {
  const 몸 = 팝업
    ? `try{ window.opener && window.opener.postMessage({트립핏:'로그인', 됨:true}, ${JSON.stringify(어디)}); }catch(e){}
       window.close();
       setTimeout(function(){ location.replace(${JSON.stringify(돌아갈)}); }, 300);`
    : `location.replace(${JSON.stringify(돌아갈)});`;
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>들어왔습니다</title>
<div style="font:15px system-ui;color:#5b7075;text-align:center;margin-top:22vh">들어왔습니다…</div>
<script>${몸}</script>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

/**
 * @param 길        'kakao' | 'naver'
 * @param 받아오기  (환경, 어디, code, 칸) → {번호, 닉, 새로고침표, 잘못}
 */
export async function 마무리(요청, 환경, 길, 받아오기) {
  const 칸 = new URL(요청.url).searchParams;
  const 어디 = 우리주소(요청, 환경);

  /* ① 우리가 보낸 손님이 맞나 */
  const 쪽 = await 뜯기(환경.SESSION_SECRET, 쿠키하나(요청, 표쿠키), 표수명);
  const 돌아갈 = 안전한길(쪽 && 쪽.돌아갈);
  const 팝업 = !!(쪽 && 쪽.팝업);

  /* 손님이 [취소] 를 누른 것도 여기로 온다 — 잘못이 아니다 */
  if (칸.get('error')) {
    return 팝업 ? 닫기HTML(돌아갈, true, 어디)
                : 쪽지('로그인을 멈췄습니다', '언제든 다시 누르시면 됩니다.', 돌아갈, 200);
  }
  if (!쪽 || !칸.get('state') || 칸.get('state') !== 쪽.표) {
    return 쪽지('다시 한 번 눌러 주세요',
                '로그인 표가 지났습니다. 문 앞에서 10분이 지나면 안전을 위해 새로 시작합니다.',
                돌아갈, 400);
  }

  /* ② 일회용 code → 회원번호·닉네임 */
  const 나 = await 받아오기(환경, 어디, 칸.get('code') || '', 칸);
  if (나.잘못) return 쪽지('로그인이 안 됐습니다', 나.잘못, 돌아갈, 502);

  const 닉 = 나.닉 || ('여행자' + String(나.번호).slice(-4));

  /* ③ 장부에 적는다.
   * ⭐ KV 를 아직 안 이어 뒀어도 로그인은 되게 둔다 — 문이 열리는 것과
   *    장부를 적는 것은 다른 일이다. (하나가 없다고 둘 다 죽이면 안 된다) */
  if (환경.TRIPFIT) {
    try {
      const 열쇠 = `회원:${길}:${나.번호}`;
      const 옛 = await 환경.TRIPFIT.get(열쇠, 'json');
      await 환경.TRIPFIT.put(열쇠, JSON.stringify({
        길, 번호: 나.번호, 닉,
        가입때: (옛 && 옛.가입때) || new Date().toISOString(),
        마지막: new Date().toISOString(),
        /* 새로고침표 — 손님이 [그만두기] 를 누르셨을 때 **그쪽 연결까지 끊어 드리는**
           데만 쓴다. 없으면 우리 장부에서만 지워지고 카카오의 [연결된 서비스] 에는
           TripFit 이 그대로 남아, 손님 눈에는 그만둔 적이 없는 것이 된다. */
        새로고침표: 나.새로고침표 || (옛 && 옛.새로고침표) || '',
      }));
    } catch (e) { /* 장부가 안 적혀도 손님은 들어가야 한다 */ }
  }

  /* ④ 신분증을 쥐어 주고 창을 닫는다 */
  const 답 = 닫기HTML(돌아갈, 팝업, 어디);
  답.headers.append('Set-Cookie', 쿠키줄(await 만들기(환경.SESSION_SECRET,
                                          { 길, 번호: 나.번호, 닉 })));
  답.headers.append('Set-Cookie', 굽기(표쿠키, '', 0));
  return 답;
}
