/* 로그인shim.js  →  배포/로그인.js
 * ─────────────────────────────────────────────────────────────────────────────
 * TripFit 의 로그인 화면. **손님용 사이트에만 붙는다** (8773 대표용에는 안 붙는다).
 *
 * ┌─ 여행 쪽을 보고 정한 것 (2026-08-12) ──────────────────────────────────┐
 * │ ① 로그인 벽을 세우지 않는다.                                            │
 * │    스카이스캐너는 검색·결과·예약까지 로그인 없이 다 된다. 문이 열리는 건 │
 * │    **[가격 변동 알림]을 누르는 순간** 하나뿐이고, 그때 이렇게 말한다 —   │
 * │    "로그인하거나 계정을 만들어서 이용하실 수 있습니다."                  │
 * │    → 우리도 똑같이 간다. 값 찾기는 아무나. 문은 **저장할 게 생길 때만.** │
 * │ ② 단추를 늘리지 않는다. 간편 로그인 선택지를 늘리면 오히려 헷갈려서      │
 * │    느려진다. 카카오 하나로 시작하고 네이버는 검수가 끝나면 붙인다.       │
 * │ ③ 문구는 「계속하기」. 트리플은 「시작하기」를 쓰는데, 그러면 이미        │
 * │    회원인 사람이 "나는 시작한 적 있는데?" 하고 멈칫한다.                 │
 * │    **가입과 로그인은 같은 단추다** — 화면이 그렇게 말해야 한다.          │
 * │ ④ 3초의 진짜 요령은 팝업이다. 화면을 통째로 넘기면 보던 검색 결과가      │
 * │    날아가고, 돌아와서 다시 찾아야 한다 — 그게 3초를 30초로 만든다.      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 🛑 문이 하나도 안 켜져 있으면(키를 안 넣었으면) **아무것도 안 그린다.**
 *    눌러도 안 되는 단추를 손님에게 보이는 것 자체가 "고장난 사이트"로 읽힌다.
 */
(function () {
  'use strict';

  var 나 = { 들어옴: false, 닉: '', 길: '', 대표: false, 문: [] };
  var 창 = null, 지켜보기 = null;

  /* ─────────────────────────────────────────────────────── 생김새 */

  var 색 = { 브랜드: '#0d697c', 카카오: '#FEE500', 네이버: '#03C75A' };

  var 카카오심볼 =
    '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path fill="#000" fill-opacity=".85" d="M12 3C6.9 3 2.8 6.2 2.8 10.2c0 2.6 1.7 4.8 4.3 6.1' +
    '-.2.7-.7 2.5-.8 2.9-.1.5.2.5.4.4.2-.1 2.6-1.7 3.6-2.4.6.1 1.2.1 1.7.1 5.1 0 9.2-3.2 ' +
    '9.2-7.1S17.1 3 12 3z"/></svg>';

  var 네이버심볼 =
    '<svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true">' +
    '<path fill="#fff" d="M12.3 10.6 7.5 3.6H3.6v12.8h4.1V9.4l4.8 7h3.9V3.6h-4.1v7z"/></svg>';

  var 스타일 = [
    '#tf로그인단추{display:inline-flex;align-items:center;gap:6px;background:#fff;',
    '  border:1px solid #cfe0e3;color:' + 색.브랜드 + ';padding:7px 13px;border-radius:8px;',
    '  font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap}',
    '#tf로그인단추:hover{border-color:#4aa8b8;background:#f4fbfc}',
    '#tf막{position:fixed;inset:0;background:rgba(16,32,35,.42);z-index:9000;',
    '  display:flex;align-items:center;justify-content:center;padding:18px}',
    '#tf막[hidden]{display:none}',
    '#tf칸{background:#fff;border-radius:18px;width:min(360px,100%);padding:26px 22px 18px;',
    '  box-shadow:0 24px 60px rgba(0,0,0,.24);position:relative;text-align:center;',
    '  font-family:inherit;color:#2b3a3d}',
    '#tf닫기{position:absolute;top:10px;right:12px;border:none;background:none;',
    '  font-size:20px;color:#9bb0b4;cursor:pointer;line-height:1;padding:4px}',
    '#tf칸 h3{font-size:18px;font-weight:800;margin:2px 0 6px;letter-spacing:-.4px}',
    '#tf칸 .왜{font-size:13.5px;color:#5b7075;line-height:1.6;margin-bottom:18px}',
    '#tf칸 .문{display:flex;flex-direction:column;gap:9px}',
    '#tf칸 .문 button{display:flex;align-items:center;justify-content:center;gap:8px;',
    '  width:100%;border:none;border-radius:11px;padding:14px;font-size:15px;font-weight:700;',
    '  font-family:inherit;cursor:pointer;letter-spacing:-.3px}',
    '#tf칸 .문 button:active{transform:translateY(1px)}',
    '#tf칸 .같은문{font-size:12px;color:#7d9298;margin-top:14px;line-height:1.6}',
    '#tf칸 .받는것{font-size:11.5px;color:#9bb0b4;margin-top:9px;line-height:1.6}',
    '#tf칸 .나중{margin-top:12px;border:none;background:none;color:#7d9298;font-size:12.5px;',
    '  font-family:inherit;cursor:pointer;text-decoration:underline}',
    '@media (max-width:520px){',
    '  #tf막{align-items:flex-end;padding:0}',
    '  #tf칸{width:100%;border-radius:20px 20px 0 0;padding-bottom:26px}}',
  ].join('\n');

  /* ─────────────────────────────────────────────────────── 그리기 */

  function 만들기() {
    var 스 = document.createElement('style');
    스.textContent = 스타일;
    document.head.appendChild(스);

    var 막 = document.createElement('div');
    막.id = 'tf막';
    막.hidden = true;
    막.innerHTML =
      '<div id="tf칸" role="dialog" aria-modal="true" aria-labelledby="tf제목">' +
      '  <button id="tf닫기" aria-label="닫기">✕</button>' +
      '  <div style="font-size:30px">🧳</div>' +
      '  <h3 id="tf제목">잠깐이면 됩니다</h3>' +
      '  <div class="왜" id="tf왜"></div>' +
      '  <div class="문" id="tf문"></div>' +
      '  <div class="같은문">가입과 로그인이 <b>같은 단추</b>입니다.<br>' +
      '       처음이시면 누르는 그 자리에서 가입까지 끝납니다.</div>' +
      '  <div class="받는것" id="tf받는것"></div>' +
      '  <button class="나중" id="tf나중">그냥 둘러볼게요</button>' +
      '</div>';
    document.body.appendChild(막);

    막.addEventListener('click', function (e) { if (e.target === 막) 닫기(); });
    막.querySelector('#tf닫기').onclick = 닫기;
    막.querySelector('#tf나중').onclick = 닫기;
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') 닫기();
    });
  }

  function 머리단추그리기() {
    var 자리 = document.querySelector('.머리단추');
    if (!자리) return;
    var 단 = document.getElementById('tf로그인단추');
    if (!단) {
      단 = document.createElement('button');
      단.id = 'tf로그인단추';
      자리.appendChild(단);
    }
    if (나.들어옴) {
      단.innerHTML = '<span aria-hidden="true">🙂</span>' + 홑(나.닉);
      단.title = '누르면 나갑니다';
      단.onclick = 나가기;
    } else {
      단.textContent = '로그인';
      단.title = '카카오로 3초';
      단.onclick = function () { 열기(''); };
    }
  }

  function 홑(글) {
    return String(글 == null ? '' : 글)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ─────────────────────────────────────────────────────── 문 열고 닫기 */

  /**
   * 로그인 문을 연다.
   * @param 왜 무엇을 하려다 막혔는지. **이유를 적어 주는 게 핵심이다** —
   *          그냥 "로그인하세요" 는 손님이 왜 눌러야 하는지 모른다.
   *          예) 트립핏.로그인문('❤️ 찜해 두려면')
   */
  function 열기(왜) {
    if (!나.문.length) return;                 // 켜진 문이 없으면 아무 일도 안 한다
    var 막 = document.getElementById('tf막');
    if (!막) return;

    document.getElementById('tf왜').innerHTML = 왜
      ? 홑(왜) + '<br>카카오로 <b>3초</b>면 됩니다.'
      : '찜해 둔 노선과 값 알림을 <b>다음에 와도 그대로</b> 꺼내 드리려고요.<br>'
        + '카카오로 <b>3초</b>면 됩니다.';

    var 문칸 = document.getElementById('tf문');
    문칸.innerHTML = '';
    나.문.forEach(function (문) {
      var b = document.createElement('button');
      if (문.길 === 'kakao') {
        b.style.background = 색.카카오;
        b.style.color = 'rgba(0,0,0,.85)';
        b.innerHTML = 카카오심볼 + '카카오로 계속하기';
      } else {
        b.style.background = 색.네이버;
        b.style.color = '#fff';
        b.innerHTML = 네이버심볼 + '네이버로 계속하기';
      }
      b.onclick = function () { 다녀오기(문.길); };
      문칸.appendChild(b);
    });

    document.getElementById('tf받는것').textContent =
      나.문.length === 1
        ? '카카오에서 받는 건 회원번호와 닉네임 둘뿐입니다.'
        : '받는 건 회원번호와 닉네임 둘뿐입니다.';

    막.hidden = false;
    var 첫 = 문칸.querySelector('button');
    if (첫) 첫.focus();
  }

  function 닫기() {
    var 막 = document.getElementById('tf막');
    if (막) 막.hidden = true;
  }

  /* ⭐ 여기가 3초의 전부다.
   *    화면을 통째로 넘기면 손님이 30분 걸려 좁혀 놓은 검색 결과가 날아간다.
   *    작은 창 하나만 다녀오게 하고, 뒤 화면은 손도 안 댄다.
   * 🛑 팝업이 막힌 브라우저(폰의 일부 인앱 브라우저)에서는 window.open 이
   *    null 을 준다. 그때는 **조용히 실패하지 말고** 화면째 다녀온다. */
  function 다녀오기(길) {
    var 돌아갈 = location.pathname + location.search + location.hash;
    var 앞 = '/api/login/' + 길 + '?돌아갈=' + encodeURIComponent(돌아갈);

    var w = 520, h = 640;
    var x = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    var y = window.screenY + Math.max(0, (window.outerHeight - h) / 3);
    try {
      창 = window.open(앞 + '&팝업=1', 'tripfit로그인',
                      'width=' + w + ',height=' + h + ',left=' + Math.round(x) +
                      ',top=' + Math.round(y) + ',scrollbars=yes');
    } catch (e) { 창 = null; }

    if (!창) { location.href = 앞; return; }

    닫기();
    /* 🛑 쪽지(postMessage)만 믿으면 안 된다. 손님이 팝업을 그냥 손으로 닫는 일이
     *    제일 흔하고, 그때는 쪽지가 안 온다. 창이 닫혔는지도 같이 지켜본다. */
    clearInterval(지켜보기);
    지켜보기 = setInterval(function () {
      if (창 && 창.closed) { clearInterval(지켜보기); 지켜보기 = null; 새로알아보기(); }
    }, 500);
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin) return;          // 🛑 남이 보낸 쪽지는 안 읽는다
    var d = e.data || {};
    if (d.트립핏 !== '로그인') return;
    clearInterval(지켜보기); 지켜보기 = null;
    try { 창 && 창.close(); } catch (x) {}
    if (d.됨) 새로알아보기(true);
  });

  function 나가기() {
    if (!confirm('나갈까요? 찜해 둔 것은 그대로 있습니다.')) return;
    fetch('/api/logout', { method: 'POST' })
      .then(function () { 새로알아보기(); })
      .catch(function () {});
  }

  /* ─────────────────────────────────────────────────────── 물어보기 */

  function 새로알아보기(인사할까) {
    return fetch('/api/me', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var 전에들어와있었나 = 나.들어옴;
        /* 🛑 여기서 칸을 하나라도 빠뜨리면, 창구는 멀쩡히 보내 주는데 화면만
         *    모르는 채로 조용히 굴러간다. (`대표` 를 빠뜨려 받은함 탭이 안 떴다) */
        나 = {
          들어옴: !!d.들어옴, 닉: d.닉 || '', 길: d.길 || '',
          대표: !!d.대표,
          문: Array.isArray(d.문) ? d.문 : [],
        };
        머리단추그리기();
        닫기();
        if (인사할까 && 나.들어옴 && !전에들어와있었나) 인사(나.닉);
        /* 로그인 상태가 바뀌면 다른 조각(찜·알림·오류보고)도 다시 그릴 수 있게 알린다 */
        try {
          window.dispatchEvent(new CustomEvent('트립핏로그인', { detail: 나 }));
        } catch (e) {}
        return 나;
      })
      .catch(function () { return 나; });
  }

  /* 들어온 걸 **화면 한가운데서 축하하지 않는다.** 손님은 값을 보러 온 것이고,
     로그인은 곁다리다. 오른쪽 위에 잠깐 떴다 사라지는 것으로 충분하다. */
  function 인사(닉) {
    var t = document.createElement('div');
    t.setAttribute('style',
      'position:fixed;right:16px;top:16px;z-index:9100;background:' + 색.브랜드 + ';color:#fff;' +
      'padding:11px 16px;border-radius:11px;font-size:13.5px;font-weight:700;' +
      'box-shadow:0 10px 26px rgba(0,0,0,.22);font-family:inherit;opacity:0;' +
      'transition:opacity .2s,transform .2s;transform:translateY(-6px)');
    t.textContent = (닉 ? 닉 + '님, ' : '') + '어서 오세요 🙂';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'none'; });
    setTimeout(function () {
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 260);
    }, 2600);
  }

  /* ─────────────────────────────────────────────────────── 밖으로 내주는 것 */

  window.트립핏 = window.트립핏 || {};
  window.트립핏.로그인문 = 열기;              // 찜·알림·오류보고가 부를 자리
  window.트립핏.나 = function () { return 나; };
  window.트립핏.들어왔나 = function () { return !!나.들어옴; };

  document.addEventListener('DOMContentLoaded', function () {
    만들기();
    새로알아보기();
  });
})();
