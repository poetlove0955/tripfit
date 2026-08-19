/* 정적shim.js — TripFit 을 '서버 없이' 돌게 하는 얇은 층.

   ⭐ 이 파일이 하는 일은 딱 하나다:
      화면(트립핏웹.html)이 서버에 물어보는 것을, **미리 만들어 둔 파일**로 대신 답한다.

   그래서 화면 코드(2300줄)는 **한 줄도 안 고친다.** 고장날 자리를 안 만드는 게 목적이다.
   (집 PC 가 살아 있을 때 쓰던 그 화면 그대로다 — 답하는 사람만 바뀐다)

   ┌ 지금 (집 PC 서버)                     ┌ 여기 (정적)
   │ POST api/search  → 30~60초 긁기       │ POST api/search  → 묶음 파일 읽고 거르기 (즉시)
   │ GET  api/job/…   → 다 될 때까지 반복   │ (필요 없음 — 바로 답이 나온다)
   └                                       └

   ⭐ 공장은 **넓게** 훑어 두고, 좁히는 건 여기서 한다.
      기간·박수·예산·직항·주말·도시는 전부 이 파일이 걸러 준다. 그래서 묶음 16개로
      손님이 고를 수 있는 수백 가지 조합을 덮는다.

   🛑 미리 만들어 둔 것에 없는 조건은 **지어내지 않는다.** "이 조건으로 준비된 게 없다"
      고 정직하게 말한다. 없는 값을 그럴듯하게 채우는 건 이 프로젝트에서 제일 하면 안 되는 것.

   🛑 여기의 잣대(박버킷·기간)는 트립핏공장.py 와 **글자 그대로 같아야** 한다.
      한쪽만 고치면 손님은 "찾았는데 아무것도 없다"만 보고 이유를 모른다.
*/
(function () {
  'use strict';

  /* 화면(트립핏웹.html)에게 "너는 지금 미리 찾아 둔 값으로 돌고 있다"고 알린다.
     🛑 화면은 이 표시를 보고 **대표용 도구(★ 담기·콘텐츠 만들기)를 감춘다** —
        여기서 501 로 막아 두긴 했지만, 눌러도 안 되는 단추가 보이는 것 자체가
        손님 눈에는 '고장난 사이트'다. (같은 이유로 공장이 [🔒 코드]를 지운다) */
  window.TF미리찾음 = true;

  var 밑 = location.pathname.replace(/[^/]*$/, '');   // …/ 로 끝나는 현재 폴더
  var 데이터 = 밑 + 'data/';
  var _fetch = window.fetch.bind(window);
  var 곳간 = {};              // 한 번 받은 파일은 다시 안 받는다
  var 차림표 = null;

  /* 🛑 공장(트립핏공장.py)의 버킷들·기간들 과 같아야 한다. 한쪽만 고치면
     손님은 "찾았는데 아무것도 없다"만 보고 이유를 모른다. */
  var 버킷들 = [['0', 0, 0], ['1', 1, 1], ['2', 2, 2], ['3', 3, 3],
                ['4-6', 4, 6], ['6-8', 6, 8], ['1-10', 1, 10]];
  var 기간들 = ['2주', '한달', '석달', '여섯달'];        // 공장이 실제로 훑는 기간
  var 기간글 = {'2주': '2주 안', '한달': '한 달 안', '석달': '3개월 안', '여섯달': '6개월 안'};

  /* ─────────────────────────────────────────── 거들기 */

  function 답(것, 코드) {
    return Promise.resolve(new Response(JSON.stringify(것), {
      status: 코드 || 200,
      headers: {'Content-Type': 'application/json; charset=utf-8'}
    }));
  }

  function 받기(이름) {
    if (곳간[이름]) return 곳간[이름];
    곳간[이름] = _fetch(데이터 + 이름, {cache: 'no-cache'}).then(function (r) {
      if (!r.ok) throw new Error(이름 + ' 없음 (' + r.status + ')');
      return r.json();
    }).catch(function (e) {
      delete 곳간[이름];        // 🛑 실패를 캐시하면 새로고침해도 영영 안 낫는다
      throw e;
    });
    return 곳간[이름];
  }

  function 날짜수(d) {                       // Date → 20260812
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function 더한날(n) {
    var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d;
  }

  /* 🛑 트립핏웹.py 의 _구간() 과 같은 잣대여야 한다 */
  function 구간(언제, 직접) {
    var 오늘 = 더한날(0), 요 = 오늘.getDay();      // 0=일 … 6=토
    var 월기준 = (요 + 6) % 7;                     // 파이썬 weekday(): 0=월
    if (언제 === '이번주말' || 언제 === '다음주말') {
      var 앞 = (4 - 월기준 + 7) % 7 + (언제 === '다음주말' ? 7 : 0);
      var 금 = 더한날(앞);
      return [날짜수(금), 날짜수(new Date(금.getTime() + 2 * 864e5))];
    }
    if (언제 === '2주')    return [날짜수(더한날(1)), 날짜수(더한날(14))];
    if (언제 === '한달')   return [날짜수(더한날(1)), 날짜수(더한날(31))];
    if (언제 === '석달')   return [날짜수(더한날(1)), 날짜수(더한날(92))];
    if (언제 === '여섯달') return [날짜수(더한날(1)), 날짜수(더한날(183))];
    if (언제 === '직접' && 직접 && 직접[0]) {
      var a = String(직접[0]).replace(/-/g, ''), b = String(직접[1] || 직접[0]).replace(/-/g, '');
      if (a.length === 8) return [Math.max(+a, 날짜수(오늘)), Math.max(+b, +a)];
    }
    return [날짜수(더한날(1)), 날짜수(더한날(92))];
  }

  /* 손님이 고른 기간을 덮는 **가장 좁은** 준비 기간. 좁을수록 그 기간의 진짜 싼 날이 들어 있다. */
  function 덮는기간(언제, 직접) {
    if (기간들.indexOf(언제) >= 0) return 언제;
    var 끝 = 구간(언제, 직접)[1];
    for (var i = 0; i < 기간들.length; i++) {
      if (구간(기간들[i])[1] >= 끝) return 기간들[i];
    }
    return 기간들[기간들.length - 1];
  }

  /* 고른 박수에 맞는 버킷. 화면의 [며칠] 단추와 버킷이 1:1 이라 보통 **딱 하나**가 맞는다.
     (딱 맞는 게 있는데 겹치는 것까지 다 불러오면, 2박을 골랐는데 3박 자료까지 받는다) */
  function 겹치는버킷(며칠) {
    var a = 0, b = 30;
    if (며칠 && 며칠.length === 2) {
      a = Math.min(+며칠[0], +며칠[1]); b = Math.max(+며칠[0], +며칠[1]);
    }
    var 딱 = 버킷들.filter(function (v) { return v[1] === a && v[2] === b; });
    if (딱.length) return [딱[0][0]];
    var 겹 = 버킷들.filter(function (v) { return v[1] <= b && v[2] >= a; })
                   .map(function (v) { return v[0]; });
    return 겹.length ? 겹 : [버킷들[2][0]];
  }

  function 열쇠들(갈래, 몸) {
    var 기 = 덮는기간(몸.언제 || '석달', 몸.직접기간);
    if (갈래 === '숙박') {
      var n = +(몸.박수 || 2);
      var 칸 = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 3 : n <= 6 ? 5 : 7;
      return {기간: 기, 열쇠: ['숙박_' + 기 + '_' + 칸 + '박']};
    }
    if (몸.편도) return {기간: 기, 열쇠: ['항공_' + 기 + '_편도_-']};
    return {기간: 기, 열쇠: 겹치는버킷(몸.며칠).map(function (b) {
      return '항공_' + 기 + '_왕복_' + b;
    })};
  }

  /* ─────────────────────────────────────────── 거르기 (원래 서버가 하던 것) */

  function 항공거르기(줄들, 몸) {
    var 고른 = (몸.고른곳 || []), 고른셋 = null;
    if (고른.length) { 고른셋 = Object.create(null); 고른.forEach(function (x) { 고른셋[x] = 1; }); }
    var 예산 = (+몸.예산만원 || 0) * 10000;
    var 범위 = 구간(몸.언제 || '석달', 몸.직접기간);
    var a = 0, b = 30;
    if (몸.며칠 && 몸.며칠.length === 2) {
      a = Math.min(+몸.며칠[0], +몸.며칠[1]); b = Math.max(+몸.며칠[0], +몸.며칠[1]);
    }
    return 줄들.filter(function (r) {
      if (고른셋 && !고른셋[r.목적지]) return false;
      var 값 = r.확인값 || r.가격;
      if (예산 && 값 > 예산) return false;
      if (몸.직항만 && r.경유 !== 0) return false;
      var 간 = +String(r.가는날 || 0);
      if (간 < 범위[0] || 간 > 범위[1]) return false;
      if (몸.주말만) {
        var s = String(r.가는날 || '');
        if (s.length !== 8) return false;
        var w = new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)).getDay();
        if (w !== 5 && w !== 6) return false;      // 금·토 출발
      }
      if (r.박 != null && (r.박 < a || r.박 > b)) return false;
      return true;
    });
  }

  function 숙박거르기(줄들, 몸) {
    var 고른 = (몸.고른곳 || []), 고른셋 = null;
    if (고른.length) { 고른셋 = Object.create(null); 고른.forEach(function (x) { 고른셋[x] = 1; }); }
    var 예산 = (+몸.예산만원 || 0) * 10000;      // 🛑 숙박 예산은 1박 기준이다
    var 최소후기 = +몸.최소후기 || 0;
    var 종류켬 = (몸.숙소종류 || []), 종류끔 = (몸.제외종류 || []);
    return 줄들.filter(function (r) {
      if (고른셋 && !고른셋[r.목적지]) return false;
      if (최소후기 && (+r.후기 || 0) < 최소후기) return false;
      // 🛑 숙박 예산은 1박 기준. 줄에 `1박` 이 이미 들어 있다 (숙박검색.py 가 붙인다)
      if (예산) {
        var 하루 = r['1박'] || (r.총액 && r.박 ? r.총액 / r.박 : 0);
        if (하루 && 하루 > 예산) return false;
      }
      if (종류켬.length && 종류켬.indexOf(r.종류) < 0) return false;
      if (종류끔.length && 종류끔.indexOf(r.종류) >= 0) return false;
      return true;
    });
  }

  /* 여러 묶음을 합칠 때 같은 비행을 두 번 보여주면 안 된다 */
  function 겹침빼기(줄들) {
    var 본 = Object.create(null), 난 = [];
    줄들.forEach(function (r) {
      var 키 = [r.코드, r.가는날, r.오는날, r.이름 || ''].join('|');
      var 값 = r.확인값 || r.가격 || r.총액 || 0;
      if (본[키] === undefined) { 본[키] = 난.length; 난.push(r); return; }
      var 옛 = 난[본[키]], 옛값 = 옛.확인값 || 옛.가격 || 옛.총액 || 0;
      if (값 && (!옛값 || 값 < 옛값)) 난[본[키]] = r;      // 싼 쪽만 남긴다
    });
    return 난;
  }

  /* ─────────────────────────────────────────── 묶음을 답으로 */

  function 묶음답(갈래, 몸) {
    var 잰시작 = (window.performance && performance.now) ? performance.now() : 0;
    return 받기('차림표.json').then(function (표) {
      차림표 = 표;
      var 있는 = 표.묶음 || {};
      var 뽑 = 열쇠들(갈래, 몸);
      var 쓸것 = 뽑.열쇠.filter(function (k) { return 있는[k]; });
      var 빠진 = 뽑.열쇠.length - 쓸것.length;
      var 갈아탄 = null;

      if (!쓸것.length) {
        // 🛑 아무거나 집어 주면 손님은 자기가 고른 조건의 답이라고 믿는다.
        //    **기간만** 바꿔 보고, 바꿨으면 반드시 말한다.
        var 내자리 = 기간들.indexOf(뽑.기간);
        var 차례 = 기간들.slice().sort(function (a, b) {
          return Math.abs(기간들.indexOf(a) - 내자리) - Math.abs(기간들.indexOf(b) - 내자리);
        });
        for (var i = 0; i < 차례.length && !쓸것.length; i++) {
          if (차례[i] === 뽑.기간) continue;
          var 후 = 뽑.열쇠.map(function (k) {
            return k.replace('_' + 뽑.기간 + '_', '_' + 차례[i] + '_');
          }).filter(function (k) { return 있는[k]; });
          if (후.length) { 쓸것 = 후; 갈아탄 = 차례[i]; 빠진 = 0; }
        }
      }
      if (!쓸것.length) {
        return 답({잘못: '고르신 조건으로 미리 찾아 둔 자료가 아직 없습니다. '
                       + '기간이나 박수를 바꿔 보시거나, 잠시 뒤 다시 시도해 주세요.'}, 503);
      }

      return Promise.all(쓸것.map(function (k) {
        return 받기('묶음/' + k + '.json');
      })).then(function (묶음들) {
        var 원본 = [];
        묶음들.forEach(function (m) {
          원본 = 원본.concat((m.결과 && m.결과.줄) || []);
        });
        원본 = 겹침빼기(원본);
        var 남은 = (갈래 === '항공') ? 항공거르기(원본, 몸) : 숙박거르기(원본, 몸);
        var 바탕 = (묶음들[0] && 묶음들[0].결과) || {};
        var 결 = Object.assign({}, 바탕, {줄: 남은});

        // 🛑 요약 숫자는 **거른 뒤로 다시 센다** — 안 그러면 "특가 12개"인데 화면엔 2개가 된다
        결.특가수 = 남은.filter(function (r) { return r.특가; }).length;
        결.제일싼 = null;
        // 🛑 항공은 `제일싼.가격`, 숙박은 `제일싼['1박']` 을 읽는다 — 이름이 다르다.
        //    항공 모양으로 통일해 놓으면 숙박 요약이 "1박 -원" 으로 나온다 (실제로 그랬다).
        var 값뽑 = (갈래 === '항공')
          ? function (r) { return r.확인값 || r.가격 || 0; }
          : function (r) { return r['1박'] || 0; };
        var 값있 = 남은.filter(function (r) { return 값뽑(r) > 0; });
        if (값있.length) {
          var 싼 = 값있.reduce(function (a, b) { return 값뽑(b) < 값뽑(a) ? b : a; });
          결.제일싼 = (갈래 === '항공')
            ? {목적지: 싼.목적지, 가격: 값뽑(싼)}
            : {목적지: 싼.목적지, '1박': 값뽑(싼)};
        }
        // 숙박 화면의 "찾아본 곳 — 아고다 400" 도 거른 뒤로 다시 센다
        if (갈래 === '숙박') {
          var 셈 = {};
          남은.forEach(function (r) { if (r.곳) 셈[r.곳] = (셈[r.곳] || 0) + 1; });
          결.소스별 = 셈;
        }
        결.어떻게 = (바탕.어떻게 || '') + ' · 미리 찾아 둔 값';
        // 🛑 묶음에 담겨 온 `걸린` 은 **공장이 새벽에 훑은 시간**이다. 그대로 두면
        //    화면에 "37.7초"라고 뜬다 — 손님은 0.1초 만에 받았는데 거짓말이 된다.
        //    손님이 실제로 기다린 시간으로 갈아 끼운다.
        결.걸린 = 잰시작
          ? Math.max(0.1, Math.round((performance.now() - 잰시작) / 100) / 10)
          : 0.1;

        var 말 = '📦 ' + (표.만든글 || '') + ' 에 찾아 둔 값입니다.';
        if (갈아탄) 말 = '고르신 기간은 아직 준비 중이라 「' + (기간글[갈아탄] || 갈아탄)
                       + '」 자료에서 골랐습니다. · ' + 말;
        if (빠진) 말 = '고르신 박수 일부는 아직 준비 중입니다. · ' + 말;
        if (!남은.length) 말 = '이 조건에 맞는 것이 없습니다 — 기간·예산·박수를 넓혀 보세요. · ' + 말;
        return 답({바로: true, 작업: '정적:' + 쓸것.join('+'), 결과: 결, 말: 말});
      });
    }).catch(function (e) {
      return 답({잘못: '자료를 못 읽었습니다 — ' + e.message}, 500);
    });
  }

  /* ─────────────────────────────────────────── 문 잡기 */

  function _몸읽기(o) {
    try { return JSON.parse((o && o.body) || '{}') || {}; }
    catch (e) { return {}; }
  }

  window.fetch = function (u, o) {
    var 주소 = (typeof u === 'string') ? u : (u && u.url) || '';
    var 길 = 주소.split('?')[0];
    function 있나(x) { return 길.indexOf(x) >= 0; }

    if (있나('/data/')) return _fetch(u, o);          // 우리 자료 파일은 그냥 통과

    if (있나('api/meta')) return 받기('항공메타.json').then(function (v) { return 답(v); })
      .catch(function (e) { return 답({잘못: e.message}, 500); });

    if (있나('api/stay/meta')) return 받기('숙박메타.json').then(function (v) { return 답(v); })
      .catch(function (e) { return 답({잘못: e.message}, 500); });

    if (있나('api/check')) return 받기('차림표.json').then(function (표) {
      var 줄 = [{이름: '자료 갱신', 됨: true, 말: (표.만든글 || '') + ' 기준'}];
      Object.keys(표.묶음 || {}).forEach(function (k) {
        줄.push({이름: (표.묶음[k].설명 || k), 됨: true, 말: (표.묶음[k].줄수 || 0) + '건'});
      });
      return 답({줄: 줄});
    }).catch(function (e) { return 답({줄: [{이름: '자료', 됨: false, 말: e.message}]}); });

    if (있나('api/search'))       return 묶음답('항공', _몸읽기(o));
    if (있나('api/stay/search'))  return 묶음답('숙박', _몸읽기(o));

    // 정적으로는 못 하는 것들 — 조용히 죽지 말고 이유를 말한다
    if (있나('api/job/'))         return 답({상태: '실패', 말: '미리 찾아 둔 것이 없습니다.'}, 404);
    if (있나('api/content'))      return 답({잘못: '콘텐츠 만들기는 대표용 프로그램에서만 됩니다.'}, 501);
    if (있나('api/stay/cities'))  return 답({잘못: '도시 번호 채우기는 대표용 프로그램에서만 됩니다.'}, 501);
    if (있나('api/edit'))         return 답({잘못: '코드 편집기는 여기에 없습니다.'}, 404);

    return _fetch(u, o);
  };

  /* 갱신 시각을 화면 맨 위에 한 줄로. 손님이 '실시간'으로 오해하면 안 된다. */
  document.addEventListener('DOMContentLoaded', function () {
    받기('차림표.json').then(function (표) {
      차림표 = 표;
      var 띠 = document.createElement('div');
      띠.setAttribute('style',
        'background:#081a26;color:#93b3c1;font-size:12px;font-weight:600;' +
        'padding:6px 16px;text-align:center;letter-spacing:-.2px');
      띠.textContent = (표.만든글 || '') + ' 기준 가격입니다 · '
                     + '최종 금액은 예약처에서 확인해 주세요';
      document.body.insertBefore(띠, document.body.firstChild);
      위높이맞추기(띠);
    }).catch(function () {});
  });

  /* ─────────────────────────────────────────── 띠만큼 화면을 낮춰 준다

     🛑 띠를 맨 위에 끼우면 왼쪽 기둥이 **그 높이만큼 화면 밖으로 밀린다.**
        화면 코드는 `calc(100vh - 56px)` 로 위쪽 바 높이가 굳어 있어서,
        [싼 항공권 찾기] 단추가 아래로 잘려 안 보인다.
        8773 에는 띠가 없어 안 나던, **이 사이트에서만 나는 어긋남**이다.

     ⭐ 56 을 85 로 바꿔 굳히지 않는다. 위쪽 바는 화면이 좁아지면 두 줄로 접히고
        띠도 글이 길면 두 줄이 된다 — **그때마다 또 잘린다.**
        그래서 숫자를 적지 말고 **실제 높이를 재서** 넘긴다.                       */

  function 위높이맞추기(띠) {
    var 머리 = document.querySelector('.머리');
    var 스 = document.createElement('style');
    스.textContent =
      '.판{min-height:calc(100vh - var(--위높이,56px))}' +
      '.옆{top:var(--위높이,56px); height:calc(100vh - var(--위높이,56px))}' +
      // 🛑 좁은 화면에서 옆칸은 붙박이가 아니라 그냥 위에 쌓인다(원본 @media 900px).
      //    이 줄이 없으면 내 규칙이 나중에 와서 그걸 덮어 폰에서 기둥이 잘린다.
      '@media (max-width:900px){.옆{top:auto; height:auto}}';
    document.head.appendChild(스);

    function 재기() {
      var 높 = (띠.offsetHeight || 0) + (머리 ? 머리.offsetHeight : 56);
      document.documentElement.style.setProperty('--위높이', 높 + 'px');
    }
    재기();
    window.addEventListener('resize', 재기);
    if (window.ResizeObserver && 머리) {
      try { new ResizeObserver(재기).observe(머리); } catch (e) {}
    }
  }
})();
