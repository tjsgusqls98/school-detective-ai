/* 우리 학교 탐정단: AI 추론 수사대 — 게임 진행 로직
   외부 API·서버 없이, data.js의 사건 데이터와 아래 규칙만으로 분석·평가합니다.
   진행 상태는 실행 중에만 유지되며 창을 닫으면 초기화됩니다. */

const stage = document.getElementById('stage');
let scale = 1;
function fit(){
  scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
  stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
}
window.addEventListener('resize', fit); fit();
// 교사용 확인: 주소 끝에 #hotspots 를 붙이면 조사 영역이 보입니다
if (location.hash.includes('hotspots')) stage.classList.add('show-hot');

// 터치한 곳을 바로 따라오는 돋보기 커서
const lensCursor = document.createElement('div');
lensCursor.id = 'lensCursor';
lensCursor.innerHTML = '<svg class="c-lens" viewBox="0 0 120 120"><path d="M64 64 L106 106" stroke="#3b2a1f" stroke-width="20" stroke-linecap="round"/><path d="M66 66 L104 104" stroke="#a8703c" stroke-width="11" stroke-linecap="round"/><circle cx="42" cy="42" r="32" fill="#dff3f7" fill-opacity=".28" stroke="#3b2a1f" stroke-width="15"/><circle cx="42" cy="42" r="32" fill="none" stroke="#f2c84b" stroke-width="8"/><path d="M24 34 Q30 22 42 20" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/></svg><svg class="c-exit" viewBox="0 0 120 120"><circle cx="42" cy="42" r="38" fill="#4f9a94" stroke="#3b2a1f" stroke-width="7"/><path d="M22 42 H58 M44 25 L62 42 L44 59" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const cursorKind = e => lensCursor.classList.toggle('exit', !!(e.target.closest && e.target.closest('.hot.exit')));
document.body.appendChild(lensCursor);
function moveLens(x, y){
  lensCursor.style.transform = `translate(${x}px,${y}px) scale(${Math.max(scale, .78)})`;
  lensCursor.classList.add('on');
}
window.addEventListener('pointerdown', e => {
  moveLens(e.clientX, e.clientY); cursorKind(e);
  lensCursor.classList.remove('tap'); void lensCursor.offsetWidth; lensCursor.classList.add('tap');
  SFX.wake();
  if (e.target.closest && e.target.closest('[disabled]')) SFX.play('locked');
}, true);
window.addEventListener('pointermove', e => { moveLens(e.clientX, e.clientY); cursorKind(e); }, true);
window.addEventListener('touchmove', e => { const p = e.touches[0]; if (p) moveLens(p.clientX, p.clientY); }, { passive:true, capture:true });

const robot = (mood, w) => `<img class="robot" src="${robotShot(mood)}" style="width:${w}px" alt="" draggable="false">`;


const ICON = {
  book:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h11"/></svg>',
  home:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
  file:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
  search:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>',
  prev:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>',
  next:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
  soundOn:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/></svg>',
  soundOff:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="m16 10 5 5M21 10l-5 5"/></svg>',
  ask:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M9.6 8.6a2.5 2.5 0 1 1 3.4 2.4c-.7.3-1 .7-1 1.4M12 14.4h.01"/></svg>',
  plus:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  pin:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
  ai:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="4"/><path d="M12 2v4M9 12h.01M15 12h.01"/></svg>',
  pen:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  redo:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>'
};

/* ───────── 상태 ───────── */
const S = {
  c:null, place:null, visited:[], got:[], lastNew:null,
  dialog:null, pendingSay:null, step:0, seenSteps:[],
  rep:null, repStep:0, results:{}, nbSel:null
};

function seededShuffle(arr, seed){
  let s = seed >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = arr.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const clueIds = c => Object.keys(c.clues).sort((a,b) => c.clues[a].n - c.clues[b].n);
const reqIds = c => clueIds(c).filter(k => c.clues[k].req);
const extIds = c => clueIds(c).filter(k => !c.clues[k].req);
const has = id => S.got.includes(id);
const allReq = () => reqIds(S.c).every(has);
const curPlace = () => S.c.places.find(p => p.id === S.place);
function findObj(clueId){
  for (const p of S.c.places) for (const o of p.objects) if (o.clue === clueId) return { ob:o, place:p };
  return null;
}
function chipC(id, cls){ const cl = S.c.clues[id]; return `<span class="cc ${cls}" data-act="clue" data-id="${id}" title="${esc(cl.title)}">단서 ${cl.n}</span>`; }

/* ───────── 화면 전환 ───────── */
function setScreen(html){ stage.innerHTML = html + soundBtnHTML(); }
const soundBtnHTML = () => `<button class="round sm sound-btn" data-act="sound" title="소리 켜기/끄기">${SFX.on ? ICON.soundOn : ICON.soundOff}</button>`;
function openModal(html, cls=''){ closeModal(true); const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.innerHTML = `<div class="paper ${cls}">${html}</div>`; stage.appendChild(m); }
function closeModal(silent){
  const m = document.getElementById('modal'); if (m) m.remove();
  if (!silent && S.pendingSay){ const p = S.pendingSay; S.pendingSay = null; if (p.sfx) SFX.play(p.sfx); note(p.text, p.mood); }
}

/* ───────── 메인 ───────── */
function renderMain(){
  S.c = null;
  const cards = CASES.map(c => {
    const done = S.results[c.id];
    const nPlaces = c.places.length, nAll = clueIds(c).length, nReq = reqIds(c).length;
    return `<div class="case-card" data-act="case" data-id="${c.id}" data-no="사건 파일 ${c.no}">
      ${done !== undefined ? `<span class="stamp done-stamp">해결 ${done}점</span>` : ''}
      <span class="stamp lv-${c.level}" style="align-self:flex-start">난이도 ${c.level}</span>
      <h3>${esc(c.title)}</h3>
      <div class="meta">조사 장소 ${nPlaces}곳 · 단서 ${nAll}개 (필수 ${nReq})<br>${esc(c.core)}</div>
    </div>`;
  }).join('');
  setScreen(`<div class="main">
    <img class="hero-art" src="${heroView()}" alt="" draggable="false">
    <button class="btn ghost small help-btn" data-act="help">${ICON.book} 탐정 수칙</button>
    <div class="ribbon"><div class="logo-sub">초등 고학년 · AI 추론 수사대</div><h1 class="logo">우리 학교 탐정단</h1></div>
    <div class="main-intro">${robot('happy', 84)}
      <div class="bubble left">안녕하세요, 탐정님! 저는 부여의 백제금동대향로를 닮은 AI 로봇 조수 <b>부향이</b>예요. 단서는 탐정님이 찾고, 저는 정보 정리와 가설 비교를 도울게요. 최종 결론은 탐정님이 근거를 들어 직접 내려 주세요!</div>
    </div>
    <div class="cases">${cards}</div>
  </div>`);
}

function helpModal(){
  const rows = [['찾기','현장을 <b>눌러서</b> 단서를 찾아요.','#e07a5f'],['묻기','모르면 <b>AI에게 질문</b>해요.','#8a6aa8'],['분석','필수 단서를 다 찾으면 <b>AI 분석</b>!','#4f9a94'],['결론','<b>근거</b>를 보고 내가 결론을 내요.','#6f9a4c']];
  openModal(`<h2>탐정 수칙</h2>
    <div class="rules">${rows.map(([k, t, c], i) => `<div class="rule"><span class="rn" style="background:${c}">${i + 1}</span><span class="rk" style="color:${c}">${k}</span><span class="rt">${t}</span></div>`).join('')}</div>
    <p class="rule-warn">AI도 틀릴 수 있어요. <b>근거를 꼭 확인!</b></p>
    <div class="actions"><button class="btn green" data-act="close">알겠어요!</button></div>`, 'dlg');
}

/* ───────── 사건 안내 ───────── */
function startCase(id){
  const c = CASES.find(x => x.id === id);
  S.c = c; S.place = c.places[0].id; S.visited = [S.place]; S.got = []; S.step = 0; S.seenSteps = [0]; S.nbSel = null;
  S.rep = { place:null, person:null, coactor:null, cause:null, seq:[] }; S.repStep = 0;
  S.dialog = null; S.note = null; S.thinkDone = {}; S.think = { i:0 };
  renderBrief();
}
/* 사건 파일 강조: **핵심 문제** , __살펴볼 곳·물건__ */
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="k1">$1</b>').replace(/__(.+?)__/g, '<b class="k2">$1</b>');
function briefHTML(c, inModal){
  return `<div class="tag" style="background:#e9d6b0">사건 파일 No.${c.no}</div>
    <span class="stamp lv-${c.level}" style="position:absolute; right:40px; top:34px; font-size:28px">난이도 ${c.level}</span>
    <h2>${esc(c.title)}</h2>
    <div class="sec"><h4>사건 상황</h4><p>${rich(c.situation)}</p></div>
    <div class="sec"><h4>탐정의 임무</h4><p>${rich(c.mission)}</p></div>
    <div class="facts">
      <div class="fact"><b>${c.places.length}곳</b><span>조사 장소</span></div>
      <div class="fact"><b>${reqIds(c).length}개</b><span>필수 단서</span></div>
      <div class="fact"><b>${extIds(c).length}개</b><span>추가 단서</span></div>
      <div class="fact"><b>${c.report.place.options.length}개</b><span>최종 선택지</span></div>
    </div>
    ${inModal ? '' : `<div class="sec"><h4>조사 장소</h4><p>${c.places.map(p => esc(p.name)).join(' · ')}</p></div>
    <div class="sec"><h4>수사 순서 (목표 약 5분 · 시간 제한은 없어요)</h4><div class="flow">${['현장 조사','단서 확인','AI 종합 분석','최종 추리','AI 평가'].map((t,i) => `<span><b>${i+1}</b>${t}</span>`).join('<em>→</em>')}</div></div>`}`;
}
function renderBrief(){
  const c = S.c;
  const people = Object.entries(c.people).map(([k,p]) => `<div class="pcard">${headOf(k, 62)}<div><b>${esc(p.name)}</b><span>${esc(p.role)}</span></div></div>`).join('');
  setScreen(`<div class="brief">
    <div class="file paper"><div class="clip"></div>${briefHTML(c)}</div>
    <div class="side">
      <div class="paper people"><h4>사건 관련 인물</h4>${people}</div>
      <div class="robot-talk">${robot('normal', 120)}<div class="bubble left">필수 단서 <b>${reqIds(c).length}개</b>를 모두 찾으면 <b>AI 종합 분석</b>을 시작할 수 있어요. 단서 위치는 표시되지 않으니, 수상해 보이는 곳을 직접 눌러 보세요!</div></div>
      <div style="display:flex; gap:12px; margin-top:auto">
        <button class="btn ghost" data-act="home">${ICON.home} 사건 목록</button>
        <button class="btn rust" style="flex:1" data-act="start">${ICON.search} 현장 조사 시작</button>
      </div>
    </div></div>`);
}

/* ───────── 현장 조사 ───────── */
/* ───────── 인물 그림: assets/characters/<이름>.png 가 있으면 그 그림을, 없으면 그려진 그림을 씁니다 ───────── */
const CHAR_FB = {}, MISSING = new Set();
let charSeq = 0;
function charFallbackHTML(fb){
  return `<img class="char-fb" src="${toyShot(fb.look, fb.kind === 'head' ? 'head' : 'full')}" alt="" draggable="false">`;
}function charImg(pid, w, h, kind = 'full'){
  const p = S.c.people[pid], src = (window.EMBED_CHARS && EMBED_CHARS[p.img]) || `assets/characters/${p.img}.png`, fb = { look:p.look, w, h, kind };
  if (MISSING.has(src)) return charFallbackHTML(fb);
  const id = ++charSeq; CHAR_FB[id] = fb;
  return `<img class="char-photo char-${kind}" data-char="${id}" src="${src}" alt="" draggable="false">`;
}
const headOf = (pid, w) => `<span class="head-av" style="width:${w}px; height:${w}px">${charImg(pid, w, w, 'head')}</span>`;
stage.addEventListener('error', e => {
  const t = e.target;
  if (t.dataset && t.dataset.char){ MISSING.add(t.getAttribute('src')); t.outerHTML = charFallbackHTML(CHAR_FB[t.dataset.char]); }
}, true);

/* ───────── 현장 조사 ───────── */
function renderInvestigate(){
  const c = S.c;
  setScreen(`<div class="inv">
    <div class="inv-top">
      <button class="round sm" data-act="home" title="사건 목록">${ICON.home}</button>
      <div class="case-pill"><span class="lvdot lv-${c.level}">${c.level}</span>사건 ${c.no}. ${esc(c.title)}</div>
      <span class="sp"></span>
      <button class="round" data-act="brief-view">${ICON.file}<span>사건 파일</span></button>
      <button class="round" data-act="notebook">${ICON.book}<span>탐정 수첩</span><i class="count" id="nbCount"></i></button>
      <button class="round ai" data-act="analysis" id="anaBtn">${ICON.ai}<span>AI 분석</span></button>
      <button class="round ask" data-act="ask">${ICON.ask}<span>AI에게 질문</span></button>
    </div>
    <div class="scene-full" id="scene"></div>
    <div class="inv-left">
      <div class="paper progress-box" id="progress"></div>
      <div class="paper robot-note" id="robotNote"></div>
      <div class="paper viewctl">
        <div class="vbtns"><button data-act="zoomout" title="축소">${ICON.minus}</button><button class="reset" data-act="zoomreset">처음 시점</button><button data-act="zoomin" title="확대">${ICON.plus}</button></div>
        <small>화면을 끌면 시점이 움직여요</small>
      </div>
      <div class="paper minimap" id="miniMap"></div>
    </div>
    <div class="dim" id="dim" data-act="dlg-close"></div>
    <div class="portrait" id="portrait"></div>
    <div class="talk" id="dialog" data-act="dlg-close"></div>
  </div>`);
  drawScene(); updateHud();
  if (S.note) note(S.note.text, S.note.mood);
  else note(`${curPlace().intro} 단서 위치는 표시되지 않으니, 수상한 곳을 직접 눌러 보세요!`);
}
function drawScene(){
  const p = curPlace(), c = S.c;
  mountScene(c, p);
  const sprites = p.objects.filter(o => o.person).map(o => {
    const s = spriteBox(o, c.people);
    return `<div class="sprite" data-foot="${o.id}" style="left:${s.x}px; top:${s.y}px; width:${s.w}px; height:${s.h}px">${charImg(o.person, Math.round(s.w), Math.round(s.h))}</div>`;
  }).join('');
  document.getElementById('scene').innerHTML = `<canvas id="sceneCanvas" class="scene-art" width="${VIEW.W}" height="${VIEW.H}"></canvas>` + sprites + hotLayerHTML(c, p);
  VW.onFrame = () => updateOverlays(c, p);
  renderLive();
  lensCursor.classList.remove('exit');
  drawMiniMap(); markFound();
}
/* 왼쪽 아래 장소 지도 */
function drawMiniMap(){
  const c = S.c;
  document.getElementById('miniMap').innerHTML = `<h5>${ICON.pin}장소 지도 <em>${c.places.findIndex(p => p.id === S.place) + 1} / ${c.places.length}</em></h5>`
    + c.places.map(p => `<div class="mp ${p.id === S.place ? 'cur' : (S.visited.includes(p.id) ? 'vis' : '')}"><span>${esc(p.name)}</span>${p.id === S.place ? '<b>지금 여기</b>' : (S.visited.includes(p.id) ? '<i>가 봄</i>' : '<i>아직 안 감</i>')}</div>`).join('<div class="mlink"></div>');
}
/* 현장을 가리지 않는 부향이의 짧은 안내 */
function note(text, mood = 'normal'){
  S.note = { text, mood };
  const el = document.getElementById('robotNote'); if (!el) return;
  el.innerHTML = `<div class="rn-head">${robot(mood, 54)}<b>부향이</b></div><p class="fade-in">${esc(text)}</p>`;
}
/* 이미 본 단서는 테두리 색을 바꿔 표시합니다 */
function markFound(){
  const p = curPlace();
  stage.querySelectorAll('.hot').forEach(el => { const ob = p.objects.find(o => o.id === el.dataset.id); el.classList.toggle('found', !!(ob && ob.clue && has(ob.clue))); });
}
/* 고른 물건의 테두리를 깜빡인 뒤 다음 동작을 합니다 */
const BLINK_MS = 640;
let blinking = false;
function flashThen(id, next){
  const el = stage.querySelector(`.hot[data-id="${id}"]`);
  if (!el) return next();
  blinking = true; el.classList.add('flash');
  setTimeout(() => { el.classList.remove('flash'); blinking = false; if (el.isConnected) next(); }, BLINK_MS);
}/* 대화창: 화면 아래 둥근 말풍선 + 말하는 인물 크게 */
function say(who, mood, text){
  S.dialog = { who, mood, text };
  const el = document.getElementById('dialog'); if (!el) return;
  const robo = who === 'robot';
  const name = robo ? '부향이 · AI 조수' : S.c.people[who].name;
  el.innerHTML = `<div class="talk-box"><div class="talk-name ${robo ? 'robot' : ''}">${esc(name)}</div><div class="talk-text">${esc(text)}</div><div class="talk-next">▼</div></div>`;
  document.getElementById('portrait').innerHTML = robo ? robot(mood, 330) : charImg(who, 420, 640);
  ['dialog','dim','portrait'].forEach(id => document.getElementById(id).classList.add('on'));
}
function closeTalk(){ ['dialog','dim','portrait'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('on'); }); }
function updateHud(){
  const c = S.c, rq = reqIds(c), ex = extIds(c);
  const nr = rq.filter(has).length, ne = ex.filter(has).length;
  document.getElementById('progress').innerHTML =
    `<div class="pg"><div class="pgh"><b>필수 단서</b><em>${nr} / ${rq.length}</em></div><span class="dots">${rq.map((k,i) => `<i class="${i < nr ? 'on' : ''}"></i>`).join('')}</span></div>`
    + `<div class="pg ext"><div class="pgh"><b>추가 단서</b><em>${ne} / ${ex.length}</em></div><span class="dots">${ex.map((k,i) => `<i class="${i < ne ? 'on' : ''}"></i>`).join('')}</span></div>`
    + `<div class="lock">${allReq() ? 'AI 분석을 시작할 수 있어요!' : `필수 단서 ${rq.length - nr}개 더 찾으면 AI 분석이 열려요`}</div>`;
  document.getElementById('nbCount').textContent = S.got.length || '';
  markFound();
  const btn = document.getElementById('anaBtn');
  btn.disabled = !allReq(); btn.classList.toggle('ready', allReq());
}
function ripple(e){
  const sc = document.getElementById('scene'); if (!sc) return;
  const r = sc.getBoundingClientRect();
  const d = document.createElement('span'); d.className = 'ripple';
  d.style.left = (e.clientX - r.left) / scale + 'px'; d.style.top = (e.clientY - r.top) / scale + 'px';
  sc.appendChild(d); setTimeout(() => d.remove(), 600);
}
function inspect(id){
  if (blinking) return;
  const p = curPlace(); const ob = p.objects.find(o => o.id === id); if (!ob) return;
  if (ob.exit){
    SFX.play('door');
    S.place = ob.exit; if (!S.visited.includes(ob.exit)) S.visited.push(ob.exit);
    drawScene(); note(curPlace().intro); updateHud(); return;
  }
  SFX.play('inspect');
  flashThen(id, () => {
    if (ob.requires && !has(ob.requires)){ SFX.play('talk'); say('robot', 'think', ob.locked); return; }
    if (ob.clue){
      const isNew = !has(ob.clue);
      if (isNew) S.got.push(ob.clue);
      const wasDone = isNew && allReq() && S.c.clues[ob.clue].req;
      SFX.play(isNew ? 'clue' : 'again');
      openZoom(ob.clue, isNew);
      updateHud();
      if (wasDone) S.pendingSay = { who:'robot', mood:'happy', sfx:'unlock', text:`필수 단서 ${reqIds(S.c).length}개를 모두 찾았어요! 이제 오른쪽 위 'AI 분석' 버튼으로 종합 분석을 시작할 수 있어요. 추가 단서를 더 찾아보면 분석이 더 확실해져요.` };
      else if (isNew) S.pendingSay = { who:'robot', mood:'happy', text:`'${S.c.clues[ob.clue].title}'을(를) 탐정 수첩에 저장했어요. 다른 곳도 살펴볼까요?` };
      return;
    }
    SFX.play('talk');
    if (ob.person) say(ob.person, 'normal', ob.comment);
    else say('robot', 'normal', ob.comment);
  });
}
/* 단서 확대 화면 */
function clueVisual(id){
  const cl = S.c.clues[id]; const f = findObj(id);
  if (cl.doc) return `<div class="docpaper"><h3>${esc(cl.doc.title)}</h3>${cl.doc.lines.map(l => `<div>${esc(l)}</div>`).join('')}</div>`;
  if (f && f.ob.person) return `<div class="speaker"><div class="zoom-person">${charImg(f.ob.person, 320, 520)}</div><div class="tag" style="font-size:20px; padding:6px 18px">${esc(S.c.people[f.ob.person].name)}의 이야기</div></div>`;
  return `<div class="lens"><img class="zoom-obj" src="${zoomView(S.c, f.place, f.ob)}" alt="" draggable="false"></div><div class="lens-handle"></div>`;}
function aiBox(cl){
  return `<div class="ai-box">${robot('think', 96)}<div><div class="say">${esc(cl.ai.say)}</div><dl>
    <dt>정보 유형</dt><dd>${esc(cl.ai.type)}</dd>
    <dt>관련 정보</dt><dd>${esc(cl.ai.related)}</dd>
    <dt>추론 가능성</dt><dd>${esc(cl.ai.possible)}</dd>
    <dt>추가 확인</dt><dd>${esc(cl.ai.check)}</dd></dl></div></div>`;
}
function clueTags(cl){
  return `<span class="tag ${cl.req ? 'req' : 'ext'}">${cl.req ? '필수 단서' : '추가 단서'}</span><span class="tag kind">${esc(cl.kind)}</span>${cl.cat.map(t => `<span class="tag cat">${esc(t)}</span>`).join('')}`;
}
function openZoom(id, isNew){
  const cl = S.c.clues[id];
  openModal(`<div class="zoom-left">${clueVisual(id)}</div>
    <div class="zoom-right">
      <div class="badge ${isNew ? '' : 'again'}">${isNew ? '새 단서 발견!' : '수첩 속 단서 다시 보기'}</div>
      <h2>단서 ${cl.n}. ${esc(cl.title)}</h2>
      <div class="tags">${clueTags(cl)}</div>
      <div class="ctext">${esc(cl.text)}</div>
      ${aiBox(cl)}
      <div class="actions"><button class="btn green" data-act="close">${isNew ? '탐정 수첩에 저장하고 닫기' : '닫기'}</button></div>
    </div>`, 'zoom');
}

/* 탐정 수첩 */
function openNotebook(sel){
  const c = S.c; const ids = clueIds(c);
  if (sel) S.nbSel = sel;
  if (!S.nbSel || !has(S.nbSel)) S.nbSel = ids.find(has) || null;
  const list = ids.filter(has).map(k => { const cl = c.clues[k]; return `<button class="nb-item ${cl.req ? '' : 'ext'} ${S.nbSel === k ? 'sel' : ''}" data-act="nbsel" data-id="${k}"><span class="num">${cl.n}</span><span><b>${esc(cl.title)}</b><br><span style="font-size:15px; color:#5a4636">${cl.req ? '필수' : '추가'} · ${esc(cl.kind)} · ${esc(findObj(k).place.name)}</span></span></button>`; }).join('')
    + reqIds(c).filter(k => !has(k)).map(() => `<div class="nb-item unk"><span class="num">?</span><span>아직 찾지 못한 필수 단서</span></div>`).join('');
  let detail = `<div class="empty-msg">아직 수첩이 비어 있어요.<br>현장의 사물이나 사람을 눌러 단서를 찾아보세요!</div>`;
  if (S.nbSel){ const cl = c.clues[S.nbSel]; detail = `<h3>단서 ${cl.n}. ${esc(cl.title)}</h3><div class="tags" style="display:flex; gap:8px; flex-wrap:wrap">${clueTags(cl)}<span class="tag cat">발견 장소: ${esc(findObj(S.nbSel).place.name)}</span></div><div class="ctext">${esc(cl.text)}</div>${aiBox(cl)}`; }
  const nr = reqIds(c).filter(has).length;
  openModal(`<div class="nb-head"><h2>탐정 수첩</h2><span class="tag req">필수 ${nr}/${reqIds(c).length}</span><span class="tag ext">추가 ${extIds(c).filter(has).length}/${extIds(c).length}</span><span style="flex:1"></span><button class="btn green small" data-act="close">닫기</button></div>
    <div class="nb-body"><div class="nb-list scroll">${list}</div><div class="nb-detail scroll">${detail}</div></div>`, 'nb');
}

/* ───────── AI 종합 분석 ───────── */
const STEPS = ['정보 정리','관계 파악','가설 생성','가설 검증','잠정 결론'];
const STEP_SAY = [
  '먼저 모은 정보를 종류별로 나눴어요. "사실·기록·흔적"은 직접 확인한 정보이고, "진술"은 사람이 말한 것이라 다른 단서로 한 번 더 확인해야 해요.',
  '단서와 단서 사이의 관계를 찾았어요. 시간 순서, 같은 장소, 원인과 결과, 같은 인물로 이어지는 단서를 선으로 연결했어요. 번호를 보며 관계를 읽어 보세요.',
  '모은 정보로 사건을 설명할 수 있는 가능성을 여러 개 만들었어요. 아직 어느 것이 맞는지는 몰라요! 다음 단계에서 하나씩 검증할 거예요.',
  '가설마다 뒷받침하는 근거, 맞지 않는 정보, 아직 확인하지 못한 내용을 나눠서 비교했어요. 단서 개수가 많다고 무조건 맞는 건 아니에요. 모순이 하나라도 있으면 다시 생각해야 해요.',
  '지금까지 모은 정보로는 이 가설이 가장 타당해 보여요. 하지만 이건 "잠정" 결론이에요. 최종 보고서는 탐정님이 근거를 확인하고 직접 완성해 주세요!'
];
function hypOrder(c){ return seededShuffle(c.hyps, c.no * 7 + 3); }
function hypVerdict(h){
  const conGot = h.con.filter(has), supMiss = h.sup.filter(k => !has(k));
  if (conGot.length) return { cls:'bad', t:'모순 발견\n가능성 낮음' };
  if (h.best) return supMiss.length ? { cls:'ok', t:'가장 타당\n추가 확인 권장' } : { cls:'best', t:'가장 타당\n근거 충분' };
  return { cls:'unk', t:'근거 부족\n추가 확인 필요' };
}
function renderAnalysis(){
  const c = S.c, st = S.step;
  if (!S.seenSteps.includes(st)) S.seenSteps.push(st);
  const pipe = ['정보 입력','정보 정리','관계 파악','가설 생성','가설 검증','결론 도출','결과 평가'];
  const pipeHTML = pipe.map((t,i) => `<span class="${i === 0 || i - 1 < st ? 'done' : ''} ${i - 1 === st ? 'now' : ''}">${i+1}. ${t}</span>`).join('<em>→</em>');
  const tabs = STEPS.map((t,i) => `<button class="step-tab ${i === st ? 'on' : ''} ${S.seenSteps.includes(i) ? 'seen' : ''}" data-act="astep" data-n="${i}"><b>${i+1}</b>${t}</button>`).join('');
  let body = '';
  if (st === 0) body = anaClassify(c);
  if (st === 1) body = anaRelations(c);
  if (st === 2) body = anaHyps(c);
  if (st === 3) body = anaVerify(c);
  if (st === 4) body = anaConclusion(c);
  const prev = st > 0 ? `<button class="btn ghost small" data-act="astep" data-n="${st-1}">${ICON.prev} 이전</button>` : `<button class="btn ghost small" data-act="back-inv">${ICON.prev} 현장으로</button>`;
  const next = st < 4 ? `<button class="btn teal" data-act="astep" data-n="${st+1}">다음 단계 ${ICON.next}</button>` : `<button class="btn ghost small" data-act="back-inv">${ICON.search} 현장 추가 조사</button><button class="btn rust" data-act="report">${ICON.pen} 최종 사건 보고서 작성</button>`;
  setScreen(`<div class="ana">
    <div class="topbar">${robot(st === 4 ? 'happy' : 'think', 56)}<span class="case-name">AI 종합 분석 — 사건 ${c.no}. ${esc(c.title)}</span><span class="sp"></span><button class="btn ghost small" data-act="ask">${ICON.ask} AI에게 질문</button><button class="btn ghost small" data-act="notebook">${ICON.book} 탐정 수첩</button><button class="btn ghost small" data-act="home">${ICON.home}</button></div>
    <div class="pipeline">${pipeHTML}</div>
    <div class="stepper">${tabs}</div>
    <div class="ana-body">${body}</div>
    <div class="limit-note">※ 실제 생성형 AI가 아니라, 미리 입력한 사건 정보와 규칙으로 <b>AI가 정보를 처리하는 과정</b>을 보여 주는 거예요.</div>
    <div class="ana-foot">${robot(st === 4 ? 'happy' : 'think', 96)}<div class="talk-box static think"><div class="talk-name robot">부향이의 생각 <i id="thinkN"></i></div><div class="talk-text" id="thinkText"></div></div><div class="think-btns"><button class="btn teal small" id="thinkNext" data-act="think-next"></button><button class="btn ghost small" id="thinkAll" data-act="think-all">한 번에 보기</button></div>${prev}${next}</div>
  </div>`);
  const lastT = thoughtsFor(c, st).length - 1;
  S.think = { i:S.thinkDone[st] ? lastT : 0 };
  applyThink();
}
function anaClassify(c){
  const kinds = [['사실','직접 관찰한 상태'],['기록','문서·표에 적힌 내용'],['흔적','물건에 남은 자국'],['진술','사람이 말한 내용']];
  const order = classOrder(c);
  return `<div class="cols4">${kinds.map(([k,sub]) => {
    const ids = clueIds(c).filter(id => has(id) && c.clues[id].kind === k);
    return `<div class="col"><h4>${k} <small>${sub}</small></h4><div class="scroll" style="display:flex; flex-direction:column; gap:10px; min-height:0">${ids.map(id => { const cl = c.clues[id]; return `<div class="icard ${cl.req ? '' : 'ext'}" data-seq="${order.indexOf(id) + 1}" data-act="clue" data-id="${id}"><div class="n">단서 ${cl.n} · ${cl.req ? '필수' : '추가'}</div><div class="t">${esc(cl.title)}</div><div class="tags">${cl.cat.map(t => `<span class="tag cat">${esc(t)}</span>`).join('')}</div></div>`; }).join('') || '<div style="color:#7a8a84; font-size:16px">해당 정보 없음</div>'}</div></div>`;
  }).join('')}</div>`;
}
function anaRelations(c){
  const ids = clueIds(c), N = ids.length, W = 960, H = 470, cx = W/2, cy = H/2 + 6;
  const pos = {}; ids.forEach((id,i) => { const a = -Math.PI/2 + i * 2*Math.PI/N; pos[id] = [cx + 375*Math.cos(a), cy + 188*Math.sin(a)]; });
  let lines = '', marks = '', list = '';
  c.relations.forEach(([a,b,k,label], i) => {
    const ok = has(a) && has(b), col = ok ? REL_COLORS[k] : '#a9a29a';
    const [x1,y1] = pos[a], [x2,y2] = pos[b];
    lines += `<line data-seq="${i+1}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${ok ? 5 : 3}" ${ok ? '' : 'stroke-dasharray="8 8"'} opacity="${ok ? .9 : .6}"/>`;
    const mx = (x1+x2)/2, my = (y1+y2)/2;
    marks += `<g data-seq="${i+1}"><circle cx="${mx}" cy="${my}" r="15" fill="${ok ? col : '#d8d0c4'}" stroke="${INK}" stroke-width="2"/><text x="${mx}" y="${my+5}" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">${i+1}</text></g>`;
    list += `<div class="rel-item ${ok ? '' : 'dim'}" data-seq="${i+1}"><span class="no" style="background:${ok ? col : '#a9a29a'}">${i+1}</span><span class="k" style="background:${ok ? col : '#a9a29a'}">${k}</span><span>${ok ? '' : '<b>[미확인]</b> '}단서 ${c.clues[a].n} ↔ 단서 ${c.clues[b].n}<br><b>${esc(label)}</b></span></div>`;
  });
  const nodes = ids.map(id => { const [x,y] = pos[id], cl = c.clues[id], g = has(id);
    return `<g ${g ? `data-act="clue" data-id="${id}" style="cursor:pointer"` : ''}><rect x="${x-92}" y="${y-28}" width="184" height="56" rx="12" fill="${g ? (cl.req ? '#fff3e2' : '#e6f3f1') : '#efe9df'}" stroke="${g ? (cl.req ? '#b5532d' : '#4f8a8b') : '#a9a29a'}" stroke-width="3" ${g ? '' : 'stroke-dasharray="7 6"'}/>
      <text x="${x}" y="${y-6}" text-anchor="middle" font-size="13" font-weight="800" fill="${g ? (cl.req ? '#b5532d' : '#3b6566') : '#8a8278'}">단서 ${cl.n}</text>
      <text x="${x}" y="${y+15}" text-anchor="middle" font-size="${cl.title.length > 11 ? 13 : 15}" font-weight="700" fill="${g ? INK : '#8a8278'}">${g ? esc(cl.title) : '? 아직 못 찾음'}</text></g>`; }).join('');
  const legend = Object.entries(REL_COLORS).map(([k,v]) => `<span style="display:inline-flex; align-items:center; gap:4px; margin-right:12px"><i style="width:22px; height:6px; background:${v}; display:inline-block; border-radius:3px"></i>${k}</span>`).join('');
  return `<div class="rel-wrap"><div class="rel-graph"><svg viewBox="0 0 ${W} ${H+30}">${lines}${marks}${nodes}</svg><div style="position:absolute; left:14px; bottom:8px; font-size:15px; font-weight:700">${legend}<span style="color:#8a8278">점선 = 아직 확인 안 됨</span></div></div><div class="rel-list scroll">${list}</div></div>`;
}
function anaHyps(c){
  const hs = hypOrder(c);
  const cols = hs.length === 3 ? 3 : (hs.length === 4 ? 2 : 3);
  return `<div class="hyp-grid scroll" style="grid-template-columns:repeat(${cols},1fr)">${hs.map((h,i) => `<div class="hyp" data-seq="${i+1}"><div class="h">가설 ${'ABCDE'[i]}</div><div class="ti">${esc(h.title)}</div><div class="de">${esc(h.desc)}</div></div>`).join('')}</div>`;
}
function anaVerify(c){
  const hs = hypOrder(c), ids = gotIds(), last = ids.length + 1;
  const tag = (html, n) => html.replace('<span ', `<span data-seq="${n}" `), none = `<span data-seq="${last}" style="color:#8a8278">없음</span>`;
  const rows = hs.map((h,i) => {
    const v = hypVerdict(h);
    const sup = h.sup.filter(has).map(k => tag(chipC(k,'s'), ids.indexOf(k) + 1)).join('') || none;
    const con = h.con.filter(has).map(k => tag(chipC(k,'c'), ids.indexOf(k) + 1)).join('') || none;
    const miss = [...h.sup, ...h.con].filter(k => !has(k));
    const unk = miss.map(() => `<span class="cc u" data-seq="${last}">찾지 못한 단서</span>`).join('') + h.unk.map(t => `<span class="unk-txt" data-seq="${last}">· ${esc(t)}</span>`).join('');
    return `<tr><td><span class="hl">가설 ${'ABCDE'[i]}</span> <span class="ht">${esc(h.title)}</span></td><td>${sup}</td><td>${con}</td><td>${unk || none}</td><td style="text-align:center"><span class="verdict ${v.cls}" data-seq="${last}" style="white-space:pre-line">${v.t}</span></td></tr>`;
  }).join('');
  return `<div class="scroll" style="height:100%"><table class="vtable"><thead><tr><th>가설</th><th>맞는 단서</th><th>부딪히는 단서</th><th>아직 모르는 것</th><th style="text-align:center">AI 판단</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function anaConclusion(c){
  const hs = hypOrder(c), best = hs.find(h => h.best), idx = hs.indexOf(best);
  const v = hypVerdict(best);
  const missExt = extIds(c).filter(k => !has(k));
  const others = hs.filter(h => !h.best).map(h => { const i = hs.indexOf(h); const con = h.con.filter(has); return `<li><b>가설 ${'ABCDE'[i]}</b> — ${esc(h.title)}: ${con.length ? con.map(k => chipC(k,'c')).join('') + '와(과) 맞지 않아요.' : '아직 근거가 부족해 판단을 미뤄요.'}</li>`; }).join('');
  return `<div class="concl">
    <div class="paper rep scroll"><h3>AI 분석 보고서 <span class="tag" style="vertical-align:middle">잠정</span></h3>
      <p>현재 수집한 정보로 볼 때 가장 타당한 설명은</p>
      <div class="best" data-seq="2">가설 ${'ABCDE'[idx]}. ${esc(best.title)}</div>
      <p data-seq="2"><b>지지 근거:</b> ${best.sup.filter(has).map(k => chipC(k,'s')).join('')}</p>
      <p data-seq="3"><b>근거 수준:</b> <span class="level" style="background:${v.cls === 'best' ? '#cfe6c6' : '#f6e3a8'}">${v.cls === 'best' ? '근거 충분' : '근거가 일부 부족함 — 추가 확인 권장'}</span></p>
      <div data-seq="1"><p><b>다른 가설을 낮게 본 이유</b></p><ul style="margin:0; padding-left:24px; font-size:18px; line-height:1.7">${others}</ul></div>
    </div>
    <div class="paper warn scroll" data-seq="4"><h4>탐정님, 꼭 확인하세요!</h4><ul style="margin:0; padding-left:22px">
      <li>이 결론은 <b>지금까지 모은 정보</b>에 따른 판단이에요. 정보가 바뀌면 결론도 바뀔 수 있어요.</li>
      ${missExt.length ? `<li>아직 찾지 못한 <b>추가 단서가 ${missExt.length}개</b> 있어요. 현장으로 돌아가 더 조사하면 판단이 더 확실해져요.</li>` : '<li>추가 단서까지 모두 찾았어요. 근거가 탄탄해요!</li>'}
      <li>부향이는 사건의 <b>순서</b>나 인물의 <b>역할</b>까지 정해 주지 않아요. 단서를 보고 직접 추리해 보세요.</li>
      <li>AI의 판단도 틀릴 수 있어요. 근거가 정말 맞는지 스스로 검토하는 것이 진짜 탐정의 자세예요!</li></ul></div>
  </div>`;
}

/* ───────── AI에게 질문하기 (정해진 질문 + 규칙으로 만든 답) ───────── */
const plainChip = id => `<span class="cc s plain">단서 ${S.c.clues[id].n}</span>`;
const gotIds = () => clueIds(S.c).filter(has);
const ASK = [
  { group:'수사 도움받기', items:[
    { id:'sum', q:'지금까지 알아낸 걸 정리해 줘.', a(){
      const ids = gotIds(), n = k => ids.filter(i => S.c.clues[i].kind === k).length;
      return { used:ids, rule:'모은 단서를 사실·기록·흔적·진술로 나눠 개수를 세요.', level:ids.length ? 'part' : 'none',
        ans: ids.length ? `지금 단서는 ${ids.length}개예요. 사실 ${n('사실')}개, 기록 ${n('기록')}개, 흔적 ${n('흔적')}개, 진술 ${n('진술')}개를 모았어요. 사건의 결론은 아직 내리지 않았어요.` : '아직 모은 단서가 없어서 정리할 내용이 없어요. 입력된 정보가 없으면 저도 답을 만들 수 없어요.' };
    } },
    { id:'first', q:'어떤 단서부터 다시 보면 좋을까?', a(){
      const ids = gotIds(), score = i => S.c.relations.filter(r => (r[0] === i && has(r[1])) || (r[1] === i && has(r[0]))).length;
      const best = ids.slice().sort((a, b) => score(b) - score(a))[0];
      if (!best || !score(best)) return { used:ids, rule:'다른 단서와 연결이 가장 많은 단서를 골라요.', level:'none', ans:'아직 서로 이어지는 단서가 없어요. 단서를 조금 더 찾아 주세요.' };
      return { used:[best], rule:'다른 단서와 연결이 가장 많은 단서를 골라요.', level:'part', ans:`'${S.c.clues[best].title}'을(를) 먼저 보면 좋겠어요. 지금 모은 단서 중 ${score(best)}개와 이어져요. 연결이 많다고 꼭 중요한 건 아니니, 내용도 직접 읽어 보세요.` };
    } },
    { id:'link', q:'서로 이어지는 단서가 있어?', a(){
      const rs = S.c.relations.filter(r => has(r[0]) && has(r[1]) && r[2] !== '비교').slice(0, 3);
      return { used:[...new Set(rs.flatMap(r => [r[0], r[1]]))], rule:'두 단서의 시간·장소·인물·원인이 겹치는지 비교해요.', level:rs.length ? 'sure' : 'none',
        ans: rs.length ? rs.map(r => `단서 ${S.c.clues[r[0]].n}${nj(S.c.clues[r[0]].n,'과')} 단서 ${S.c.clues[r[1]].n}${nj(S.c.clues[r[1]].n,'은')} ${r[2]} 관계로 이어져요.`).join(' ') + ' 왜 이어지는지는 탐정님이 생각해 보세요!' : '아직 이어지는 단서를 찾지 못했어요. 다른 사물도 조사해 보세요.' };
    } },
    { id:'conflict', q:'비교해 봐야 할 정보가 있어?', a(){
      const rs = S.c.relations.filter(r => has(r[0]) && has(r[1]) && r[2] === '비교').slice(0, 2);
      return { used:[...new Set(rs.flatMap(r => [r[0], r[1]]))], rule:'같은 일을 다르게 말하거나, 다른 설명을 지워 주는 단서 쌍을 찾아요.', level:rs.length ? 'sure' : 'none',
        ans: rs.length ? rs.map(r => `단서 ${S.c.clues[r[0]].n}${nj(S.c.clues[r[0]].n,'과')} 단서 ${S.c.clues[r[1]].n}${nj(S.c.clues[r[1]].n,'을')} 나란히 놓고 비교해 보세요.`).join(' ') + ' 무엇이 다른지 찾으면 가능성을 줄일 수 있어요.' : '지금 모은 단서에서는 비교할 쌍을 찾지 못했어요.' };
    } },
    { id:'left', q:'아직 확인하지 못한 게 뭐야?', a(){
      const c = S.c, left = reqIds(c).filter(k => !has(k)).length, ex = extIds(c).filter(k => !has(k)).length, unv = c.places.filter(p => !S.visited.includes(p.id));
      return { used:[], rule:'찾아야 할 단서 수와 찾은 단서 수, 가 본 장소를 비교해요.', level:'sure',
        ans:`필수 단서는 ${left}개, 추가 단서는 ${ex}개 남았어요. ${unv.length ? `아직 '${unv.map(p => p.name).join("', '")}'에는 가 보지 않았어요.` : '장소는 모두 가 봤어요.'} 단서의 위치는 탐정님이 직접 찾아야 해서 알려 줄 수 없어요.` };
    } },
    { id:'trust', q:'어떤 정보를 조심해서 봐야 해?', a(){
      const v = gotIds().filter(i => S.c.clues[i].kind === '진술');
      return { used:v, rule:'사람이 말한 정보(진술)를 골라 “확인 필요” 표시를 붙여요.', level:v.length ? 'sure' : 'none',
        ans: v.length ? `진술 ${v.length}개를 조심해서 봐 주세요. 거짓말이라는 뜻이 아니라, 기억은 틀릴 수 있으니 흔적이나 기록으로 한 번 더 확인하자는 뜻이에요.` : '아직 모은 진술이 없어요. 사람들에게 말을 걸어 보세요.' };
    } },
    { id:'who', q:'누가 그랬는지 그냥 알려 줘!', a(){
      return { used:[], rule:'결론을 바로 말하지 않고, 근거를 비교하도록 안내해요.', level:'none', ans:'그건 알려 주지 않을게요. 제가 답을 말하면 탐정님이 근거를 확인할 기회가 없어지니까요. 그리고 이 사건에 꼭 잘못한 사람이 있는 것도 아니에요. 단서를 모아 AI 분석으로 함께 비교해 봐요.' };
    } }
  ] },
  { group:'AI에 대해 알아보기', items:[
    { id:'how', q:'너는 어떻게 답을 만들어?', a(){ return { used:[], rule:'질문 → 정보 찾기 → 규칙 적용 → 답 만들기', level:'sure', ans:'질문을 읽고, 지금까지 입력된 단서를 찾아보고, 미리 정해 둔 규칙을 적용해서 답을 만들어요. 오른쪽에 보이는 ①~④가 바로 그 과정이에요.' }; } },
    { id:'real', q:'너는 진짜로 생각하는 거야?', a(){ return { used:[], rule:'이 프로그램이 만들어진 방식을 그대로 설명해요.', level:'sure', ans:'사람처럼 생각하거나 느끼는 건 아니에요. 저는 이 게임 안의 사건 정보와 규칙으로 움직이는 프로그램이에요. 실제 AI도 데이터에서 찾은 규칙으로 답을 만들지만, 저보다 훨씬 복잡해요.' }; } },
    { id:'wrong', q:'네 답은 항상 맞아?', a(){ return { used:[], rule:'입력 정보와 규칙의 한계를 확인해요.', level:'sure', ans:'아니요, 틀릴 수 있어요. 입력된 정보가 부족하거나 틀리면 제 답도 틀려요. 그래서 AI의 답은 근거를 직접 확인하고 판단해야 해요.' }; } },
    { id:'many', q:'단서가 많은 쪽이 정답이야?', a(){ return { used:[], rule:'지지 단서 수보다 모순 여부를 먼저 봐요.', level:'sure', ans:'꼭 그렇지 않아요. 맞는 단서가 많아도 분명히 어긋나는 단서가 하나 있으면 그 설명은 다시 생각해야 해요. 개수보다 단서가 얼마나 직접 뒷받침하는지가 중요해요.' }; } },
    { id:'unknown', q:'모르는 질문도 대답할 수 있어?', a(){ return { used:[], rule:'입력된 질문 목록 안에서만 답해요.', level:'sure', ans:'아니요. 저는 인터넷에 연결되어 있지 않고, 여기 있는 질문에만 답할 수 있어요. 모르는 걸 아는 척하지 않는 것도 AI에게 중요한 일이에요.' }; } },
    { id:'privacy', q:'내 이름이나 답을 기억해?', a(){ return { used:[], rule:'게임에 저장되는 정보를 확인해요.', level:'sure', ans:'아니요. 이름을 묻지 않고, 답을 밖으로 보내지도 않아요. 게임 창을 닫으면 모두 지워져요. AI를 쓸 때는 개인정보를 함부로 입력하지 않는 습관이 중요해요.' }; } }
  ] }
];
const ASK_LEVEL = { sure:['확인된 내용','sure'], part:['일부만 확인됨','part'], none:['아직 알 수 없음','none'] };
function askItem(id){ for (const g of ASK) for (const it of g.items) if (it.id === id) return it; }
function openAsk(sel){
  S.askSel = sel || null;
  const list = ASK.map(g => `<h4>${g.group}</h4>` + g.items.map(it => `<button class="ask-q ${it.id === sel ? 'sel' : ''}" data-act="askq" data-id="${it.id}">${esc(it.q)}</button>`).join('')).join('');
  let right = `<div class="ask-empty">${robot('normal', 130)}<p>왼쪽에서 질문을 골라 주세요.<br>제가 <b>어떤 정보와 규칙으로</b> 답을 만드는지 함께 보여 드릴게요!</p></div>`;
  if (sel){
    const it = askItem(sel), r = it.a(), lv = ASK_LEVEL[r.level];
    right = `<div class="ask-steps">
      <div class="astep" style="animation-delay:.05s"><b>①</b><div><small>질문 읽기</small><p>“${esc(it.q)}”</p></div></div>
      <div class="astep" style="animation-delay:.4s"><b>②</b><div><small>찾아본 정보</small><p>${r.used.length ? r.used.map(plainChip).join('') : '이번 질문은 단서 대신 게임에 입력된 규칙과 진행 상황을 봐요.'}</p></div></div>
      <div class="astep" style="animation-delay:.75s"><b>③</b><div><small>적용한 규칙</small><p>${esc(r.rule)}</p></div></div>
      <div class="astep ans" style="animation-delay:1.1s"><div class="ans-head">${robot(r.level === 'none' ? 'think' : 'happy', 62)}<small>④ 부향이의 답</small><span class="conf ${lv[1]}">${lv[0]}</span></div><p>${esc(r.ans)}</p></div>
    </div>`;
  }
  openModal(`<div class="nb-head"><h2>AI에게 질문하기</h2><span class="ask-limit">정해진 질문에만 답하는 규칙 기반 AI예요</span><span style="flex:1"></span><button class="btn green small" data-act="close">닫기</button></div>
    <div class="nb-body"><div class="ask-list scroll">${list}</div><div class="ask-panel scroll">${right}</div></div>`, 'nb');
}

/* ───────── AI 분석: 부향이의 생각을 한 단계씩 ───────── */
const KIND_THOUGHT = { '사실':'직접 확인한 상태라서 믿을 만한 정보로 분류해요.', '기록':'적힌 내용이에요. 실제로도 그랬는지는 다른 단서와 비교할게요.', '흔적':'물건에 남은 자국이에요. 왜 생겼는지는 다른 단서가 필요해요.', '진술':'사람의 말이에요. 기억은 틀릴 수 있으니 “확인 필요” 표시를 붙여요.' };
const KINDS = ['사실','기록','흔적','진술'];
const classOrder = c => KINDS.flatMap(k => clueIds(c).filter(id => has(id) && c.clues[id].kind === k));
const hName = (c, h) => '가설 ' + 'ABCDE'[hypOrder(c).indexOf(h)];
function thoughtsFor(c, st){
  const list = [STEP_SAY[st]], clue = id => c.clues[id];
  if (st === 0) classOrder(c).forEach(id => list.push(`단서 ${clue(id).n} '${clue(id).title}' → ${KIND_THOUGHT[clue(id).kind]}`));
  if (st === 1) c.relations.forEach(([a, b, k, label]) => list.push(has(a) && has(b)
    ? `단서 ${clue(a).n}${nj(clue(a).n,'과')} 단서 ${clue(b).n}${nj(clue(b).n,'을')} 나란히 놓아 봐요. '${k}' 규칙에 맞네요! → ${label}`
    : `단서 ${clue(a).n}${nj(clue(a).n,'과')} 단서 ${clue(b).n}${nj(clue(b).n,'은')} 이어질 수도 있지만 한쪽을 아직 못 찾았어요. 점선으로 남겨 둘게요.`));
  if (st === 2) hypOrder(c).forEach(h => { const s = h.sup.filter(has); list.push(s.length
    ? `단서 ${s.map(i => clue(i).n).join(', ')}을(를) 설명할 수 있는 이야기를 만들어 봐요. → ${hName(c, h)}: ${h.title}`
    : `뒷받침하는 단서는 없지만, 가능성을 놓치지 않으려고 일부러 후보에 넣어요. → ${hName(c, h)}: ${h.title}`); });
  if (st === 3){
    const hs = hypOrder(c);
    gotIds().forEach(id => {
      const ok = hs.filter(h => h.sup.includes(id)).map(h => hName(c, h).replace('가설 ', '')), no = hs.filter(h => h.con.includes(id)).map(h => hName(c, h).replace('가설 ', ''));
      list.push(`단서 ${clue(id).n}${nj(clue(id).n,'을')} 모든 가설에 대 봐요. ` + (ok.length ? `가설 ${ok.join(', ')}와(과) 맞아요. ` : '') + (no.length ? `가설 ${no.join(', ')}와(과)는 부딪혀요!` : (ok.length ? '' : '직접 관련된 가설은 없네요.')));
    });
    const out = hs.filter(h => h.con.some(has)).map(h => hName(c, h).replace('가설 ', ''));
    list.push(out.length ? `검사 끝! 가설 ${out.join(', ')}은(는) 맞지 않는 단서가 있어서 가능성을 낮춰요. 맞는 단서가 있어도 모순을 그냥 넘어가지 않아요.` : '검사 끝! 뚜렷하게 부딪히는 가설은 없어요.');
  }
  if (st === 4){
    const hs = hypOrder(c), best = hs.find(h => h.best), miss = extIds(c).filter(k => !has(k)).length, out = hs.filter(h => !h.best).map(h => hName(c, h).replace('가설 ', ''));
    list.push(`다른 가설 ${out.join(', ')}은(는) 모순이 있거나 근거가 부족해서 뒤로 미뤄요.`);
    list.push(`남은 것은 ${hName(c, best)}예요. 모은 단서를 모순 없이 가장 많이 설명하니까요.`);
    list.push(miss ? `하지만 못 찾은 추가 단서가 ${miss}개 있어요. 그 단서가 결과를 바꿀 수도 있으니 '근거 일부 부족'으로 표시해요.` : `추가 단서까지 모두 살펴봤어요. 그래서 '근거 충분'으로 표시해요.`);
    list.push('그래도 이건 “지금 가진 정보로는 이렇다”는 잠정 결론이에요. 최종 판단은 탐정님이 해 주세요!');
  }
  return list;
}
function applyThink(){
  const list = thoughtsFor(S.c, S.step), i = S.think.i, last = list.length - 1;
  stage.querySelectorAll('[data-seq]').forEach(el => { const s = +el.dataset.seq; el.classList.toggle('seq-wait', s > i); el.classList.toggle('seq-now', s === i); });
  const now = stage.querySelector('.rel-item.seq-now, .icard.seq-now'); if (now) now.scrollIntoView({ block:'nearest' });   // 칸이 길어도 지금 보는 항목이 보이게
  const tt = document.getElementById('thinkText'); if (!tt) return;
  tt.textContent = list[i]; tt.classList.remove('pop'); void tt.offsetWidth; tt.classList.add('pop');
  document.getElementById('thinkN').textContent = `생각 ${i + 1} / ${last + 1}`;
  const nx = document.getElementById('thinkNext'); nx.disabled = i >= last; nx.textContent = i >= last ? '생각 끝!' : '다음 생각 ▶';
  document.getElementById('thinkAll').style.visibility = i >= last ? 'hidden' : 'visible';
  if (i >= last) S.thinkDone[S.step] = true;
}

/* ───────── 최종 사건 보고서 ───────── */
const REP_ITEMS = [
  { k:'place', label:'사건 장소', q:'사건이 일어난 핵심 장소는 어디인가요?', help:'장소와 세부 위치까지 생각해 보세요.' },
  { k:'person', label:'주요 관련 인물', q:'사건 전개에 가장 핵심적으로 관련된 인물은 누구인가요?', help:'"범인"을 찾는 것이 아니라, 사건의 흐름에 직접 관련된 사람을 고르는 거예요.' },
  { k:'coactor', label:'공동 행동자', q:'주요 관련 인물과 함께 행동한 사람이 있나요?', help:'함께 행동한 사람이 없다면 "없음"을 고르세요. 목격자는 공동 행동자가 아니에요.' },
  { k:'cause', label:'행동 목적 또는 발생 원인', q:'왜 이런 일이 일어났나요?', help:'고의가 아닌 실수, 시설 상태, 환경도 원인이 될 수 있어요.' },
  { k:'seq', label:'사건 전개 순서', q:'사건이 일어난 순서대로 카드를 눌러 주세요.', help:'카드를 차례로 누르면 1, 2, 3… 번호가 붙어요. 번호가 붙은 카드를 다시 누르면 빠져요.' }
];
function optOrder(item){ const c = S.c; const n = c.report[item].options.length; return seededShuffle([...Array(n).keys()], c.no * 13 + (item === 'place' ? 1 : 5)); }
function seqOrder(){ const n = S.c.report.seq.steps.length; let o = seededShuffle([...Array(n).keys()], S.c.no * 31 + 9); if (o.every((v,i) => v === i)) o = o.reverse(); return o; }
function answerText(k, val){
  const c = S.c, r = c.report;
  if (k === 'place' || k === 'cause') return val === null ? null : r[k].options[val];
  if (k === 'person') return val === null ? null : (val === 'none' ? '해당 없음' : c.people[val].name);
  if (k === 'coactor') return val === null ? null : (val === 'none' ? '없음' : c.people[val].name);
  if (k === 'seq') return val.length === r.seq.steps.length ? `${val.length}단계 완성` : (val.length ? `${val.length} / ${r.seq.steps.length}단계 선택` : null);
}
const repDone = k => k === 'seq' ? S.rep.seq.length === S.c.report.seq.steps.length : S.rep[k] !== null;
function renderReport(){
  const c = S.c, it = REP_ITEMS[S.repStep], r = c.report;
  const side = REP_ITEMS.map((x,i) => { const a = answerText(x.k, S.rep[x.k]); return `<button class="rs-item ${i === S.repStep ? 'on' : ''}" data-act="rstep" data-n="${i}"><span class="ck ${repDone(x.k) ? 'ok' : ''}">${repDone(x.k) ? '✓' : i+1}</span><span><span class="q">${i+1}. ${x.label}</span><br><span class="a ${a ? '' : 'none'}">${a ? esc(a) : '아직 선택하지 않음'}</span></span></button>`; }).join('');
  const allDone = REP_ITEMS.every(x => repDone(x.k));
  let main = '';
  if (it.k === 'place' || it.k === 'cause'){
    main = `<div class="opts">${optOrder(it.k).map(i => `<button class="opt ${S.rep[it.k] === i ? 'sel' : ''}" data-act="pick" data-k="${it.k}" data-v="${i}"><span class="mk"></span>${esc(r[it.k].options[i])}</button>`).join('')}</div>`;
  } else if (it.k === 'person' || it.k === 'coactor'){
    const ppl = Object.entries(c.people).map(([id,p]) => `<button class="opt ${S.rep[it.k] === id ? 'sel' : ''}" data-act="pick" data-k="${it.k}" data-v="${id}"><span class="mk"></span>${headOf(id, 64)}<span>${esc(p.name)}<small>${esc(p.role)}</small></span></button>`);
    const none = `<button class="opt ${S.rep[it.k] === 'none' ? 'sel' : ''}" data-act="pick" data-k="${it.k}" data-v="none"><span class="mk"></span><span>${it.k === 'person' ? '해당 없음' : '없음'}<small>${it.k === 'person' ? '특정 인물과 관련 없이 일어난 일' : '함께 행동한 사람이 없음'}</small></span></button>`;
    main = `<div class="opts persons">${it.k === 'coactor' ? none + ppl.join('') : ppl.join('') + none}</div>`;
  } else {
    const steps = r.seq.steps, n = steps.length;
    const slots = [...Array(n).keys()].map(i => { const v = S.rep.seq[i]; return `<div class="slot ${v !== undefined ? 'filled' : ''}"><span class="sn">${i+1}</span><span class="st">${v !== undefined ? esc(steps[v]) : ''}</span></div>`; }).join('<span class="seq-arrow">→</span>');
    const pool = seqOrder().map(i => { const pos = S.rep.seq.indexOf(i); return `<button class="scard ${pos >= 0 ? 'used' : ''}" data-act="seq" data-v="${i}"><span class="badge">${pos >= 0 ? pos+1 : ''}</span>${esc(steps[i])}</button>`; }).join('');
    main = `<div class="seq-slots">${slots}</div><div class="seq-pool" style="margin-top:6px">${pool}</div><div><button class="btn ghost small" data-act="seq-reset">${ICON.redo} 순서 다시 고르기</button></div>`;
  }
  const prev = S.repStep > 0 ? `<button class="btn ghost" data-act="rstep" data-n="${S.repStep-1}">${ICON.prev} 이전 항목</button>` : `<button class="btn ghost" data-act="back-ana">${ICON.prev} AI 분석 다시 보기</button>`;
  const next = S.repStep < 4 ? `<button class="btn teal" data-act="rstep" data-n="${S.repStep+1}">다음 항목 ${ICON.next}</button>` : `<button class="btn rust" data-act="submit" ${allDone ? '' : 'disabled'}>${ICON.pen} 보고서 제출</button>`;
  setScreen(`<div class="rep-screen">
    <div class="topbar"><span class="case-name">최종 사건 보고서 — 사건 ${c.no}. ${esc(c.title)}</span><span class="sp"></span><button class="btn ghost small" data-act="notebook">${ICON.book} 탐정 수첩</button><button class="btn ghost small" data-act="home">${ICON.home}</button></div>
    <div class="rep-body">
      <div class="paper rep-side"><h3>나의 보고서</h3>${side}
        <button class="btn rust" style="margin-top:auto" data-act="submit" ${allDone ? '' : 'disabled'}>${ICON.pen} 보고서 제출</button>
        <div style="font-size:15px; color:#5a4636; text-align:center">${allDone ? '모든 항목을 채웠어요. 제출해 볼까요?' : '5개 항목을 모두 채우면 제출할 수 있어요.'}</div></div>
      <div class="paper rep-main"><div class="tag" style="align-self:flex-start">항목 ${S.repStep+1} / 5 · ${it.label}</div><h2>${it.q}</h2><div class="qhelp">${it.help}</div>${main}<div class="rep-nav">${prev}${next}</div></div>
    </div></div>`);
}

/* ───────── AI 평가 ───────── */
function evaluate(){
  const c = S.c, r = c.report, a = S.rep;
  const n = r.seq.steps.length, seqOk = a.seq.filter((v,i) => v === i).length;
  const coA = a.coactor === 'none' ? null : a.coactor;
  const items = [
    { k:'place', ok: a.place === r.place.ok, pts: a.place === r.place.ok ? SCORE.place : 0 },
    { k:'person', ok: a.person === r.person.ok, pts: a.person === r.person.ok ? SCORE.person : 0 },
    { k:'coactor', ok: coA === r.coactor.ok, pts: coA === r.coactor.ok ? SCORE.coactor : 0 },
    { k:'cause', ok: a.cause === r.cause.ok, pts: a.cause === r.cause.ok ? SCORE.cause : 0 },
    { k:'seq', ok: seqOk === n, pts: Math.round(SCORE.seq * seqOk / n), part: seqOk }
  ];
  return { items, total: items.reduce((s,x) => s + x.pts, 0) };
}
function correctText(k){
  const c = S.c, r = c.report;
  if (k === 'place' || k === 'cause') return r[k].options[r[k].ok];
  if (k === 'person') return c.people[r.person.ok].name;
  if (k === 'coactor') return r.coactor.ok ? c.people[r.coactor.ok].name : '없음';
}
function renderResult(){
  const c = S.c, ev = evaluate(), r = c.report;
  SFX.play(ev.total >= 90 ? 'great' : ev.total >= 60 ? 'good' : 'retry');
  S.results[c.id] = Math.max(S.results[c.id] || 0, ev.total);
  const rank = ev.total >= 90 ? '명탐정' : ev.total >= 70 ? '우수 탐정' : ev.total >= 50 ? '견습 탐정' : '수습 탐정';
  const missExt = extIds(c).filter(k => !has(k));
  const rows = ev.items.map((x,i) => {
    const it = REP_ITEMS[i];
    let mine;
    if (x.k === 'seq') mine = `<b>내 선택</b>${S.rep.seq.length}단계 중 <b class="hit ${x.ok ? 'ok' : 'no'}">${x.part}단계</b>가 올바른 위치`;
    else mine = `<b>내 선택</b>${esc(answerText(x.k, S.rep[x.k]))}${x.ok ? '' : `<br><b>정답</b>${esc(correctText(x.k))}`}`;
    const hint = `<div class="res-hint">${r[x.k].hint.map(k => has(k) ? chipC(k,'s') : `<span class="cc u">단서 ${c.clues[k].n} (못 찾음)</span>`).join('')}</div>`;
    return `<div class="res-row ${x.ok ? 'ok' : 'no'}"><div class="it">${i+1}. ${it.label}<small>${x.ok ? '정답과 일치' : '다시 검토해 봐요'}</small></div><div><div class="mine">${mine}</div>${hint}</div><div class="ex">${esc(r[x.k].explain)}</div><div class="pts">${x.pts}<small>/ ${SCORE[x.k]}점</small></div></div>`;
  }).join('');
  const wrong = ev.items.filter(x => !x.ok);
  const improve = wrong.length
    ? wrong.map(x => `<b>${REP_ITEMS.find(y => y.k === x.k).label}</b> 단서 ${r[x.k].hint.map(k => c.clues[k].n).join(', ')}`).join(' · ')
    : '모든 항목을 근거와 함께 정확하게 추리했어요!';
  const timeline = r.seq.steps.map((s,i) => `<div><b>${i+1}</b>${esc(s)}</div>`).join('');
  const robotLine = ev.total === 100 ? '완벽해요! 단서와 단서를 정확히 연결했어요. 탐정님의 추리가 제 분석보다 더 구체적이에요!'
    : ev.total >= 70 ? '훌륭해요! 대부분을 근거로 추리했어요. 표시된 항목의 관련 단서를 다시 보면 더 완벽해질 거예요.'
    : '좋은 시도예요! 틀린 항목과 연결된 단서를 다시 확인하고 한 번 더 추리해 볼까요?';
  setScreen(`<div class="res">
    <div class="topbar"><span class="case-name">AI 평가 결과 — 사건 ${c.no}. ${esc(c.title)}</span><span class="sp"></span><button class="btn ghost small" data-act="notebook">${ICON.book} 탐정 수첩</button></div>
    <div class="res-body">
      <div class="paper res-score">
        <div class="score-big">${ev.total}<small>/100</small></div><div class="rank">${rank}</div>
        ${robot(ev.total >= 70 ? 'happy' : 'normal', 84)}<div class="bubble">${robotLine}</div>
        <div class="res-count">단서: 필수 ${reqIds(c).length}/${reqIds(c).length} · 추가 ${extIds(c).length - missExt.length}/${extIds(c).length}</div>
        <div class="res-actions">
          <button class="btn teal small" data-act="retry">${ICON.pen} 다시 추리하기</button>
          <button class="btn ghost small" data-act="restart">${ICON.redo} 처음부터 다시 조사</button>
          <button class="btn ghost small" data-act="questions">${ICON.book} 생각 나누기 질문</button>
          <button class="btn rust small" data-act="home">${ICON.home} 사건 목록으로</button>
        </div>
      </div>
      <div class="paper res-main">
        ${rows}
        <div class="res-flow"><b>올바른 사건 전개</b><div class="timeline">${timeline}</div></div>
        <div class="res-notes">
          <div class="notebox"><h4>다시 볼 단서</h4>${improve}${missExt.length ? `<br>찾지 못한 추가 단서가 ${missExt.length}개 있어요.` : ''}</div>
          <div class="notebox warm"><h4>생각해 볼 점</h4>${esc(c.note)}</div>
        </div>
        <div class="res-foot">※ 미리 정해 둔 정답 데이터와 규칙에 따른 자동 평가예요. 실제 생성형 AI의 자유 평가가 아니에요.</div>
      </div>
    </div></div>`);
}

/* ───────── 입력 처리 (클릭/터치) ───────── */
const ACT = {
  help: () => helpModal(),
  close: () => closeModal(),
  case: d => startCase(d.id),
  home: () => {
    if (!S.c || document.querySelector('.res')) { closeModal(true); renderMain(); return; }
    openModal(`<h2>사건 목록으로 돌아갈까요?</h2><p>지금 사건의 조사 내용은 초기화돼요.</p><div class="actions"><button class="btn ghost" data-act="close">계속 조사하기</button><button class="btn rust" data-act="home-yes">사건 목록으로</button></div>`, 'dlg');
  },
  'dlg-close': () => closeTalk(),
  ask: () => openAsk(),
  askq: d => openAsk(d.id),
  zoomin: () => setZoom(VW.tzoom - .13),
  zoomout: () => setZoom(VW.tzoom + .13),
  zoomreset: () => resetView(),
  'think-next': () => { S.think.i++; applyThink(); },
  'think-all': () => { S.think.i = thoughtsFor(S.c, S.step).length - 1; applyThink(); },
  sound: () => { SFX.on = !SFX.on; if (SFX.on) SFX.play('pick'); stage.querySelectorAll('.sound-btn').forEach(b => b.innerHTML = SFX.on ? ICON.soundOn : ICON.soundOff); },
  'home-yes': () => { closeModal(true); renderMain(); },
  start: () => renderInvestigate(),
  'brief-view': () => openModal(`<div style="position:relative">${briefHTML(S.c, true)}</div><div class="actions"><button class="btn green" data-act="close">닫기</button></div>`, 'dlg brief-modal'),
  inspect: (d, e) => { ripple(e); inspect(d.id); },
  clue: d => { if (has(d.id)) openZoom(d.id, false); },
  notebook: () => openNotebook(),
  nbsel: d => openNotebook(d.id),
  analysis: () => { if (!allReq()) return; S.step = 0; renderAnalysis(); },
  astep: d => { S.step = +d.n; renderAnalysis(); },
  'back-inv': () => { S.note = { mood:'normal', text:'다시 현장으로 왔어요. 아직 찾지 못한 추가 단서가 있는지 살펴볼까요?' }; renderInvestigate(); },
  'back-ana': () => { S.step = 4; renderAnalysis(); },
  report: () => { S.repStep = 0; renderReport(); },
  rstep: d => { S.repStep = +d.n; renderReport(); },
  pick: d => { const v = (d.k === 'place' || d.k === 'cause') ? +d.v : d.v; S.rep[d.k] = v; renderReport(); },
  seq: d => { const v = +d.v, i = S.rep.seq.indexOf(v); if (i >= 0) S.rep.seq.splice(i, 1); else if (S.rep.seq.length < S.c.report.seq.steps.length) S.rep.seq.push(v); renderReport(); },
  'seq-reset': () => { S.rep.seq = []; renderReport(); },
  submit: () => { if (REP_ITEMS.every(x => repDone(x.k))) renderResult(); },
  retry: () => { S.repStep = 0; renderReport(); },
  restart: () => startCase(S.c.id),
  questions: () => openModal(`<h2>생각 나누기 질문</h2><ol>${POST_QUESTIONS.map(q => `<li>${esc(q)}</li>`).join('')}</ol><div class="actions"><button class="btn green" data-act="close">닫기</button></div>`, 'dlg')
};
const ACT_SFX = { ask:'paper', askq:'pick', zoomin:'tap', zoomout:'tap', zoomreset:'tap', 'think-next':'pick', 'think-all':'step', help:'paper', close:'tap', case:'paper', home:'tap', 'home-yes':'tap', start:'door', 'brief-view':'paper', clue:'again', notebook:'paper', nbsel:'pick', analysis:'unlock', astep:'step', 'back-inv':'door', 'back-ana':'step', report:'paper', rstep:'step', pick:'pick', seq:'pick', 'seq-reset':'tap', submit:'submit', retry:'paper', restart:'paper', questions:'paper', 'dlg-close':'tap' };
// 태블릿에서 길게 눌렀을 때 뜨는 메뉴 막기
window.addEventListener('contextmenu', e => e.preventDefault());

/* 현장 끌기·두 손가락 확대 */
const DRAG = { pts:new Map(), moved:false, suppress:false };
stage.addEventListener('pointerdown', e => {
  if (!e.target.closest('#scene')) return;
  DRAG.pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (DRAG.pts.size === 1) Object.assign(DRAG, { sx:e.clientX, sy:e.clientY, vx:VW.tx, vz:VW.tz, moved:false });
  if (DRAG.pts.size === 2){ const [a, b] = [...DRAG.pts.values()]; DRAG.d0 = Math.hypot(a[0]-b[0], a[1]-b[1]); DRAG.z0 = VW.tzoom; DRAG.moved = true; }
});
window.addEventListener('pointermove', e => {
  if (!DRAG.pts.has(e.pointerId)) return;
  DRAG.pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (DRAG.pts.size === 1){
    const dx = (e.clientX - DRAG.sx) / scale, dy = (e.clientY - DRAG.sy) / scale;
    if (!DRAG.moved && Math.hypot(dx, dy) > 10) DRAG.moved = true;
    if (DRAG.moved) setPan(DRAG.vx - dx * VW.tzoom * 1.05, DRAG.vz - dy * VW.tzoom * 1.5);
  } else { const [a, b] = [...DRAG.pts.values()]; setZoom(DRAG.z0 * DRAG.d0 / Math.max(20, Math.hypot(a[0]-b[0], a[1]-b[1]))); }
});
const dragEnd = e => {
  if (!DRAG.pts.delete(e.pointerId) || DRAG.pts.size) return;
  if (DRAG.moved){ DRAG.moved = false; DRAG.suppress = true; setTimeout(() => DRAG.suppress = false, 80); }
};
window.addEventListener('pointerup', dragEnd); window.addEventListener('pointercancel', dragEnd);
stage.addEventListener('wheel', e => { if (e.target.closest('#scene')){ e.preventDefault(); setZoom(VW.tzoom * (e.deltaY > 0 ? 1.08 : .92)); } }, { passive:false });

stage.addEventListener('click', e => {
  if (DRAG.suppress || blinking) return;   // 테두리가 깜빡이는 동안의 터치는 무시
  const t = e.target.closest('[data-act]');
  if (!t) { if (e.target.id === 'modal') closeModal(); return; }
  if (t.disabled) return;
  if (ACT_SFX[t.dataset.act]) SFX.play(ACT_SFX[t.dataset.act]);
  const fn = ACT[t.dataset.act]; if (fn) fn(t.dataset, e, t);
});

/* 글꼴을 먼저 불러온 뒤 시작합니다 (3D 칠판·게시물 글씨에 쓰임) */
function boot(){
  try { glRenderer(); renderMain(); }
  catch (err){ console.error(err); stage.innerHTML = '<div class="no-gl paper"><h2>3D 화면을 켤 수 없어요</h2><p>Microsoft Edge나 Chrome 최신 버전으로 열어 주세요. 그래도 안 되면 브라우저 설정의 “그래픽 가속 사용”을 켜 주세요.</p></div>'; }
}
document.fonts.load('32px Jua', '한글').then(boot, boot);