/* 보고shim.js  →  배포/보고.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 🐞 「여기 뭐가 이상해요」 — 손님이 본 자리에서 바로 한 줄 적는 곳.
 *
 * ⭐ 왜 눌린 자리를 같이 적어 보내나
 *    "안 돼요" 한 줄만 오면 고칠 수가 없다. 손님이 **어느 화면 어느 칸**에서
 *    눌렀는지를 우리가 알아서 적어 넣으면, 손님은 한 줄만 써도 우리는 다 안다.
 *
 * 🛑 쓰는 쪽만 만들면 안 된다. 취업ON 에서 겪은 그 자리다 — 한마디가 장부에는
 *    잘 쌓이는데 **읽는 화면이 없어서** 대표가 볼 방법이 없었다.
 *    그래서 대표가 로그인해 있으면 같은 카드에 [📥 받은 것] 이 같이 열린다.
 *
 * 🛑 손님용 사이트라 눈에 덜 띄게 둔다. 평소엔 흐릿하고, 손을 올리면 진해진다.
 *    값을 보러 온 사람 앞에서 제일 진한 것이 오류 신고 단추면 안 된다.
 */
(function () {
  'use strict';

  var 색 = { 브랜드: '#0d697c' };
  var 커서 = { 어디: '' };
  var 받은것 = null;

  var 스타일 = [
    '#tf보고{position:fixed;right:18px;bottom:18px;z-index:8900;width:44px;height:44px;',
    '  border-radius:50%;border:1px solid #cfe0e3;background:#fff;color:#7d9298;',
    '  font-size:19px;cursor:pointer;opacity:.55;transition:opacity .18s,transform .18s,border-color .18s;',
    '  box-shadow:0 4px 14px rgba(0,0,0,.10);font-family:inherit;line-height:1}',
    '#tf보고:hover{opacity:1;transform:translateY(-2px);border-color:#4aa8b8}',
    '#tf보고 .종{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;',
    '  border-radius:9px;background:#e0554f;color:#fff;font-size:11px;font-weight:800;line-height:18px}',
    '#tf보고 .종[hidden]{display:none}',
    '#tf보고칸{position:fixed;right:18px;bottom:72px;z-index:8901;width:min(320px,92vw);',
    '  background:#fff;border:1px solid #dbe7e9;border-radius:14px;padding:14px;',
    '  box-shadow:0 16px 44px rgba(0,0,0,.18);font-family:inherit;color:#2b3a3d}',
    '#tf보고칸[hidden]{display:none}',
    '#tf보고칸 .제{font-size:13px;font-weight:800;margin-bottom:2px}',
    '#tf보고칸 .자리{font-size:11px;color:#9bb0b4;margin-bottom:10px}',
    '#tf보고칸 .칩{display:flex;gap:5px;margin-bottom:9px}',
    '#tf보고칸 .칩 div{flex:1;text-align:center;padding:7px 3px;border-radius:9px;cursor:pointer;',
    '  font-size:11.5px;font-weight:700;color:#7d9298;background:#f6fafb;border:1px solid #e3edee}',
    '#tf보고칸 .칩 div.켬{color:' + 색.브랜드 + ';border-color:#4aa8b8;background:#eaf6f8}',
    '#tf보고칸 textarea{width:100%;min-height:66px;padding:9px 10px;border-radius:9px;',
    '  font-size:12.5px;font-family:inherit;color:#2b3a3d;background:#fff;',
    '  border:1px solid #dbe7e9;resize:vertical;box-sizing:border-box}',
    '#tf보고칸 .줄{display:flex;gap:6px;margin-top:9px}',
    '#tf보고칸 .줄 button{border:none;border-radius:9px;padding:9px;font-size:12.5px;',
    '  font-weight:700;font-family:inherit;cursor:pointer}',
    '#tf보고칸 .보냄{flex:1;background:' + 색.브랜드 + ';color:#fff}',
    '#tf보고칸 .그만{background:#f2f6f7;color:#7d9298;padding:9px 13px}',
    '#tf보고칸 .탭{display:flex;gap:12px;border-bottom:1px solid #eef4f5;margin:-4px -4px 10px;padding:0 4px}',
    '#tf보고칸 .탭 b{font-size:12px;font-weight:700;color:#9bb0b4;padding:6px 0;cursor:pointer;',
    '  border-bottom:2px solid transparent}',
    '#tf보고칸 .탭 b.켬{color:' + 색.브랜드 + ';border-bottom-color:' + 색.브랜드 + '}',
    '#tf받은{max-height:300px;overflow-y:auto;margin:-2px -4px 0;padding:0 4px}',
    '#tf받은 .건{border:1px solid #eef4f5;border-radius:10px;padding:9px 10px;margin-bottom:7px;font-size:12px}',
    '#tf받은 .건.안봄{border-color:#cfe0e3;background:#fbfdfd}',
    '#tf받은 .건 .머{display:flex;justify-content:space-between;gap:6px;color:#9bb0b4;font-size:10.5px;margin-bottom:4px}',
    '#tf받은 .건 .말{color:#2b3a3d;line-height:1.55;white-space:pre-wrap;word-break:keep-all}',
    '#tf받은 .건 .밑{margin-top:6px;display:flex;justify-content:space-between;align-items:center;gap:6px}',
    '#tf받은 .건 .밑 span{color:#9bb0b4;font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#tf받은 .건 .밑 button{border:1px solid #dbe7e9;background:#fff;color:#7d9298;border-radius:7px;',
    '  padding:4px 8px;font-size:10.5px;font-weight:700;font-family:inherit;cursor:pointer;flex-shrink:0}',
  ].join('\n');

  /* ─────────────────────────────────────────── 어디서 눌렀나 */

  function 어디이름(el) {
    if (!el || !el.closest) return '';
    var 카 = el.closest('.카드');
    if (카) {
      var 도 = 카.querySelector('.도시');
      return '결과 카드' + (도 ? ' · ' + 도.textContent.trim().slice(0, 20) : '');
    }
    if (el.closest('.옆')) return '왼쪽 검색 조건';
    if (el.closest('.머리')) return '위쪽 바';
    if (el.closest('.본')) return '결과 칸';
    return '';
  }

  document.addEventListener('mousemove', function (e) {
    var 이름 = 어디이름(e.target);
    if (이름) 커서.어디 = 이름;
  }, { passive: true });

  /* ─────────────────────────────────────────── 그리기 */

  function 만들기() {
    var 스 = document.createElement('style');
    스.textContent = 스타일;
    document.head.appendChild(스);

    var 단 = document.createElement('button');
    단.id = 'tf보고';
    단.title = '여기 뭐가 이상해요 (Ctrl+.)';
    단.setAttribute('aria-label', '이상한 것 알려주기');
    단.innerHTML = '🐞<span class="종" hidden></span>';
    document.body.appendChild(단);

    var 칸 = document.createElement('div');
    칸.id = 'tf보고칸';
    칸.hidden = true;
    칸.innerHTML =
      '<div class="탭" id="tf탭" hidden>' +
      '  <b data-쪽="쓰기" class="켬">✍ 알려주기</b><b data-쪽="받은">📥 받은 것</b>' +
      '</div>' +
      '<div id="tf쓰기">' +
      '  <div class="제">여기 뭐가 이상한가요?</div>' +
      '  <div class="자리" id="tf자리">—</div>' +
      '  <div class="칩" id="tf종류">' +
      '    <div class="켬" data-v="불편">😖 불편해요</div>' +
      '    <div data-v="오류">🐞 값이 이상</div>' +
      '    <div data-v="바람">💡 이러면 좋겠어요</div>' +
      '  </div>' +
      '  <textarea id="tf글" maxlength="500" ' +
      '    placeholder="한 줄이면 충분합니다. 예: 도쿄 값이 예약처와 다릅니다"></textarea>' +
      '  <div class="줄">' +
      '    <button class="보냄" id="tf보냄">보내기</button>' +
      '    <button class="그만" id="tf그만">그만</button>' +
      '  </div>' +
      '</div>' +
      '<div id="tf받은" hidden></div>';
    document.body.appendChild(칸);

    단.onclick = function () { 칸.hidden ? 열기() : 닫기(); };
    칸.querySelector('#tf그만').onclick = 닫기;
    칸.querySelector('#tf종류').onclick = function (e) {
      var c = e.target.closest('[data-v]');
      if (!c) return;
      칸.querySelectorAll('#tf종류 div').forEach(function (d) { d.classList.remove('켬'); });
      c.classList.add('켬');
    };
    칸.querySelector('#tf보냄').onclick = 보내기;
    칸.querySelector('#tf탭').onclick = function (e) {
      var b = e.target.closest('[data-쪽]');
      if (b) 쪽바꾸기(b.dataset.쪽);
    };

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') 닫기();
      if (e.ctrlKey && (e.key === '.' || e.key === '·')) { e.preventDefault(); 열기(); }
    });
  }

  function 열기() {
    var 칸 = document.getElementById('tf보고칸');
    document.getElementById('tf자리').textContent =
      '여기 · ' + (커서.어디 || 'TripFit 화면');
    칸.hidden = false;
    if (대표인가()) { 받은가져오기(); }
    document.getElementById('tf글').focus();
  }

  function 닫기() {
    var 칸 = document.getElementById('tf보고칸');
    if (칸) 칸.hidden = true;
  }

  function 쪽바꾸기(쪽) {
    document.querySelectorAll('#tf탭 b').forEach(function (b) {
      b.classList.toggle('켬', b.dataset.쪽 === 쪽);
    });
    document.getElementById('tf쓰기').hidden = (쪽 !== '쓰기');
    document.getElementById('tf받은').hidden = (쪽 !== '받은');
    if (쪽 === '받은') 받은그리기();
  }

  /* ─────────────────────────────────────────── 보내기 */

  function 보내기() {
    var 글칸 = document.getElementById('tf글');
    var 말 = (글칸.value || '').trim();
    if (!말) { 글칸.focus(); return; }
    var 켠 = document.querySelector('#tf종류 .켬');
    var 단 = document.getElementById('tf보냄');
    단.disabled = true;
    단.textContent = '보내는 중…';

    fetch('/api/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        말: 말,
        종류: 켠 ? 켠.dataset.v : '불편',
        어디: 커서.어디,
        /* 🛑 주소만 남기고 물음표 뒤는 버린다 — 손님이 뭘 검색했는지까지 들고 올 이유가 없다 */
        화면: location.pathname,
      }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (d.잘못) throw new Error(d.잘못);
        글칸.value = '';
        닫기();
        알림('고맙습니다. 잘 받았습니다 🙂');
      })
      .catch(function (e) { 알림(e.message || '보내지 못했습니다.'); })
      .then(function () { 단.disabled = false; 단.textContent = '보내기'; });
  }

  /* ─────────────────────────────────────────── 받은 것 (대표만) */

  function 대표인가() {
    try { return !!(window.트립핏 && 트립핏.나() && 트립핏.나().대표); }
    catch (e) { return false; }
  }

  function 받은가져오기() {
    if (!대표인가()) return;
    fetch('/api/note', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.잘못) return;
        받은것 = d.줄 || [];
        종보이기(d.안본것 || 0);
        if (!document.getElementById('tf받은').hidden) 받은그리기();
      })
      .catch(function () {});
  }

  function 종보이기(n) {
    var 종 = document.querySelector('#tf보고 .종');
    if (!종) return;
    종.textContent = n > 99 ? '99+' : n;
    종.hidden = !n;
  }

  function 받은그리기() {
    var 방 = document.getElementById('tf받은');
    if (!받은것) { 방.innerHTML = '<div class="자리">불러오는 중…</div>'; return; }
    if (!받은것.length) {
      방.innerHTML = '<div style="color:#9bb0b4;font-size:12px;padding:14px 2px">'
                   + '아직 들어온 것이 없습니다.</div>';
      return;
    }
    var 딱지 = { 불편: '😖', 오류: '🐞', 바람: '💡' };
    방.innerHTML = 받은것.map(function (r) {
      var 때 = (r.때 || '').replace('T', ' ').slice(5, 16);
      return '<div class="건' + (r.봤나 ? '' : ' 안봄') + '">'
        + '<div class="머"><span>' + (딱지[r.종류] || '·') + ' ' + 홑(r.어디 || '—') + '</span>'
        + '<span>' + 홑(때) + '</span></div>'
        + '<div class="말">' + 홑(r.말) + '</div>'
        + '<div class="밑"><span>' + (r.닉 ? 홑(r.닉) + '님' : '비회원')
        + (r.화면 ? ' · ' + 홑(r.화면) : '') + '</span>'
        + '<button data-봤음="' + 홑(r.열쇠) + '">' + (r.봤나 ? '되돌리기' : '봤음') + '</button>'
        + '</div></div>';
    }).join('');

    방.querySelectorAll('[data-봤음]').forEach(function (b) {
      b.onclick = function () {
        fetch('/api/note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 봤음: b.dataset.봤음 }),
        }).then(function () { 받은가져오기(); }).catch(function () {});
      };
    });
  }

  /* ─────────────────────────────────────────── 거들기 */

  function 홑(글) {
    return String(글 == null ? '' : 글)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function 알림(말) {
    var t = document.createElement('div');
    t.setAttribute('style',
      'position:fixed;right:16px;bottom:74px;z-index:9100;background:' + 색.브랜드 + ';color:#fff;' +
      'padding:11px 15px;border-radius:11px;font-size:13px;font-weight:700;font-family:inherit;' +
      'box-shadow:0 10px 26px rgba(0,0,0,.2);max-width:280px');
    t.textContent = 말;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }

  /* 로그인 상태가 바뀌면(대표가 들어오면) 받은함 탭이 생긴다 */
  window.addEventListener('트립핏로그인', function () {
    var 탭 = document.getElementById('tf탭');
    if (탭) 탭.hidden = !대표인가();
    if (대표인가()) 받은가져오기(); else 종보이기(0);
  });

  document.addEventListener('DOMContentLoaded', function () {
    만들기();
    /* 🛑 쪽지(트립핏로그인)만 믿지 않는다. 그게 이미 지나간 뒤에 우리가 그려지면
     *    대표인데도 받은함이 영영 안 열린다. 그릴 때 한 번 직접 물어본다. */
    if (대표인가()) {
      document.getElementById('tf탭').hidden = false;
      받은가져오기();
    }
  });
})();
