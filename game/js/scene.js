/* 현장 장면: Three.js로 실제 3D 공간을 만들어 그립니다.
   한 번 그린 장면은 이미지로 기억해 두어 다시 그리지 않습니다.
   좌표: x = 뒷벽을 따라 오른쪽, z = 앞(카메라 쪽), y = 위 */

const T = THREE;
const VIEW = { W:1320, H:816 };
let GL = null, root = null, cur = null;

function glRenderer(){
  if (GL) return GL;
  GL = new T.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true, alpha:true });
  GL.setPixelRatio(1);
  GL.setSize(VIEW.W, VIEW.H, false);
  GL.shadowMap.enabled = true;
  GL.shadowMap.type = T.PCFSoftShadowMap;
  GL.shadowMap.autoUpdate = false;
  GL.outputColorSpace = T.SRGBColorSpace;
  return GL;
}

/* ───────── 기본 도형 ───────── */
const mat = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color:c, roughness:.82, metalness:0 }, o));
function add(m, cast = true){ m.castShadow = cast; m.receiveShadow = true; cur.add(m); return m; }
function box(x, y, z, w, h, d, c, o){
  const m = add(new T.Mesh(new T.BoxGeometry(w, h, d), c.isMaterial ? c : mat(c, o)));
  m.position.set(x + w/2, y + h/2, z + d/2);
  return m;
}
/* 모서리가 둥근 상자 (장난감 같은 느낌) */
function rbox(x, y, z, w, h, d, c, r = 4, o){
  const s = new T.Shape(), a = w - 2*r, b = d - 2*r, q = Math.min(r, a/2, b/2);
  s.moveTo(q, 0); s.lineTo(a-q, 0); s.quadraticCurveTo(a, 0, a, q); s.lineTo(a, b-q); s.quadraticCurveTo(a, b, a-q, b); s.lineTo(q, b); s.quadraticCurveTo(0, b, 0, b-q); s.lineTo(0, q); s.quadraticCurveTo(0, 0, q, 0);
  const g = new T.ExtrudeGeometry(s, { depth:Math.max(.1, h - 2*r), bevelEnabled:true, bevelThickness:r, bevelSize:r, bevelSegments:3, steps:1, curveSegments:6 });
  g.rotateX(Math.PI / 2); g.translate(r, h - r, r);
  const m = add(new T.Mesh(g, mat(c, o)));
  m.position.set(x, y, z);
  return m;
}
function cyl(x, y, z, r, h, c, o = {}){
  const m = add(new T.Mesh(new T.CylinderGeometry(o.top === undefined ? r : o.top, r, h, o.seg || 28), mat(c, o.m)));
  m.position.set(x, y + h/2, z);
  return m;
}
function ball(x, y, z, r, c, o){
  const m = add(new T.Mesh(new T.SphereGeometry(r, 24, 18), mat(c, o)));
  m.position.set(x, y, z);
  return m;
}
function leaf(x, y, z, r, c){
  const m = add(new T.Mesh(new T.IcosahedronGeometry(r, 1), mat(c, { flatShading:true })));
  m.position.set(x, y, z);
  m.rotation.set(x * .7, y * .4, z * .9);
  return m;
}
function tube(points, r, c){
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'catmullrom', .25);
  return add(new T.Mesh(new T.TubeGeometry(curve, 120, r, 12, false), mat(c)));
}

/* ───────── 그림 판 (캔버스 질감) ───────── */
function canvasTex(w, h, paint, o = {}){
  const px = o.px || 3, c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(w * px)); c.height = Math.max(2, Math.ceil(h * px));
  const g = c.getContext('2d'); g.scale(px, px); paint(g, w, h);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
  if (o.nearest){ t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapLinearFilter; }
  return t;
}
function decal(face, x, y, z, w, h, paint, o = {}){
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map:canvasTex(w, h, paint, o), roughness:.8, transparent:!!o.alpha, depthWrite:!o.alpha }));
  m.receiveShadow = true; cur.add(m);
  if (face === 'z') m.position.set(x + w/2, y + h/2, z);
  if (face === 'x'){ m.rotation.y = Math.PI / 2; m.position.set(x, y + h/2, z + w/2); }
  if (face === 'y'){ m.rotation.x = -Math.PI / 2; m.position.set(x + w/2, y, z + h/2); }
  return m;
}
function rr(g, x, y, w, h, r, c){ g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
function tx(g, s, x, y, size, c, align = 'center'){ g.fillStyle = c; g.font = `${size}px Jua, "Malgun Gothic", sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
const textFit = (s, w, max) => Math.min(max, Math.floor(w / (s.length * 1.02)));

/* 벽 위 좌표: u = 화면 왼→오, v = 위로, t = 벽에서 나온 거리 */
function wbox(L, u, v, t, uw, vh, td, c, o){
  return L.wall === 'B' ? box(L.a + u, L.y + v, t, uw, vh, td, c, o) : box(t, L.y + v, L.a + L.w - u - uw, td, vh, uw, c, o);
}
function wdecal(L, u, v, t, uw, vh, paint, o){
  return L.wall === 'B' ? decal('z', L.a + u, L.y + v, t, uw, vh, paint, o) : decal('x', t, L.y + v, L.a + L.w - u - uw, uw, vh, paint, o);
}
function mount(L, paint, frame = '#8a5a34', d = 5, o){
  wbox(L, -4, -4, 1, L.w + 8, L.h + 8, d, frame);
  wdecal(L, 0, 0, d + 1.4, L.w, L.h, paint, o);
}
/* 가구 앞면 좌표: u = 화면 왼→오, v = 위로, t = 앞면에서 안쪽으로 */
const fw = L => L.face === 'x' ? L.d : L.w;
function fbox(L, u, v, t, uw, vh, td, c, o){
  return L.face === 'x' ? box(L.x + L.w - t - td, L.y + v, L.z + L.d - u - uw, td, vh, uw, c, o) : box(L.x + u, L.y + v, L.z + L.d - t - td, uw, vh, td, c, o);
}
function front(L, u, v, uw, vh, paint, o){
  return L.face === 'x' ? decal('x', L.x + L.w + .6, L.y + v, L.z + L.d - u - uw, uw, vh, paint, o) : decal('z', L.x + u, L.y + v, L.z + L.d + .6, uw, vh, paint, o);
}

/* ───────── 소품 ───────── */
function plant(x, z, s = 1, c = '#3f9a3f'){
  cyl(x, 0, z, 22*s, 34*s, '#c8703f', { top:27*s });
  cyl(x, 30*s, z, 24*s, 5*s, '#5a3a22', { top:24*s });
  cyl(x, 30*s, z, 3.5*s, 70*s, '#7a5230');
  [[0,108,0,30],[-22,92,8,23],[22,94,-6,24],[6,88,24,20],[-8,126,-6,20],[14,120,12,17]].forEach(([a,b,e,r]) => leaf(x + a*s, b*s, z + e*s, r*s, i2c(c, a + b)));
}
const i2c = (c, n) => mix(c, n % 2 ? '#7ccb4f' : '#1f6b3a', .28);
function chair(x, z, c = '#d9823f'){
  rbox(x, 42, z, 44, 6, 44, c, 2.5);
  rbox(x, 48, z + 40, 44, 40, 5, c, 2);
  [[3,3],[37,3],[3,37],[37,37]].forEach(([a,b]) => box(x + a, 0, z + b, 4, 42, 4, '#8b949c'));
}
function desk3d(x, z, o = {}){
  const c = o.c || '#e9b56a';
  rbox(x, 66, z, o.w || 130, 7, o.d || 72, c, 3);
  box(x + 8, 46, z + 8, (o.w || 130) - 16, 20, (o.d || 72) - 16, '#b8824a');
  [[5,5],[(o.w||130)-10,5],[5,(o.d||72)-10],[(o.w||130)-10,(o.d||72)-10]].forEach(([a,b]) => box(x + a, 0, z + b, 5, 66, 5, '#7f8b95'));
  if (o.chair !== false) chair(x + ((o.w||130) - 44)/2, z + (o.d||72) + 10, o.cc);
}
function bookcase(L){
  L.y = L.y || 0;
  const W = fw(L), H = L.h, C = ['#d9493f','#2f7fc1','#f0b429','#3ea35a','#8a5ab8','#ef7f3a'];
  rbox(L.x, 0, L.z, L.w, H, L.d, L.c || '#a86f3f', 3);
  const rows = Math.floor(H / 54);
  for (let r = 0; r < rows; r++){
    const y = 8 + r * ((H - 12) / rows), ih = (H - 12) / rows - 7;
    fbox(L, 6, y, 0, W - 12, ih, 3, '#5f3d24');
    let u = 10, i = r * 3;
    while (u < W - 24){ const bw = 9 + (i * 7) % 12, bh = ih * (.62 + ((i * 13) % 30) / 100); fbox(L, u, y, -2, bw, bh, 22, C[i % 6]); u += bw + 1.6 + (i % 9 === 4 ? 16 : 0); i++; }
  }
}
function stackBox(x, z, c = '#d7a868'){
  rbox(x, 0, z, 72, 46, 60, c, 3); rbox(x + 10, 46, z + 6, 54, 34, 46, mix(c, '#fff6e0', .2), 3);
}
function poster(wall, a, y, w, h, c1, c2){
  mount({ wall, a, y, w, h }, (g, W, H) => { rr(g, 0, 0, W, H, 0, c1); g.fillStyle = c2; g.beginPath(); g.arc(W*.5, H*.42, W*.26, 0, 7); g.fill(); rr(g, W*.15, H*.76, W*.7, H*.08, 2, c2); }, '#fff6e0', 2);
}

/* ───────── 벽에 붙는 사물 ───────── */
const A = {
  door(L, o){
    wbox(L, -9, 0, 0, L.w + 18, L.h + 9, 9, '#7c4f2c');
    mount(L, (g, W, H) => {
      rr(g, 0, 0, W, H, 0, '#c58a4e'); rr(g, 12, 58, W - 24, 58, 3, '#bfe0e6'); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(20, 66, 16, 42);
      rr(g, 12, 128, W - 24, 66, 3, '#a9713c'); rr(g, 7, 14, W - 14, 34, 5, '#fff6df'); tx(g, o.label, W/2, 32, textFit(o.label, W - 22, 19), '#3b2a1f');
    }, '#c58a4e', 11);
    const k = L.wall === 'B' ? [L.a + L.w - 13, 96, 20] : [20, 96, L.a + 13]; ball(k[0], k[1], k[2], 5, '#f0c23c', { metalness:.3, roughness:.35 });
  },
  opening(L, o){
    wbox(L, -9, 0, 0, L.w + 18, L.h + 9, 9, '#7c4f2c');
    wdecal(L, 0, 0, 9.6, L.w, L.h, (g, W, H) => {
      const c = g.createLinearGradient(0, 0, 0, H); c.addColorStop(0, o.outdoor ? '#bfe3ee' : '#3a2c26'); c.addColorStop(.62, o.outdoor ? '#d7efc9' : '#59443a'); c.addColorStop(.63, o.outdoor ? '#8fc765' : '#7c6048'); c.addColorStop(1, o.outdoor ? '#6fae4d' : '#967453');
      g.fillStyle = c; g.fillRect(0, 0, W, H); rr(g, 6, 8, W - 12, 36, 6, '#fff6df'); tx(g, o.label + ' →', W/2, 27, textFit(o.label + ' →', W - 20, 19), '#3b2a1f');
    });
  },
  window(L, o){
    wdecal(L, 0, 0, 1.2, L.w, L.h, (g, W, H) => {
      const c = g.createLinearGradient(0, 0, 0, H); c.addColorStop(0, '#79c8ee'); c.addColorStop(1, '#d7f1f7'); g.fillStyle = c; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff'; [[.25,.25,34],[.36,.3,24],[.72,.2,28]].forEach(([a,b,r]) => { g.beginPath(); g.ellipse(W*a, H*b, r, r*.42, 0, 0, 7); g.fill(); });
      g.fillStyle = '#74bd59'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H*.68); g.quadraticCurveTo(W*.3, H*.42, W*.58, H*.68); g.quadraticCurveTo(W*.82, H*.84, W, H*.62); g.lineTo(W, H); g.fill();
    }, { px:2 });
    const f = '#f4efe2';
    wbox(L, -6, -6, 0, L.w + 12, 8, 16, f); wbox(L, -6, L.h - 2, 0, L.w + 12, 8, 8, f); wbox(L, -6, 0, 0, 8, L.h, 8, f); wbox(L, L.w - 2, 0, 0, 8, L.h, 8, f);
    if (o.open){
      wbox(L, L.w * .5, 0, 18, L.w * .5, L.h, 2, '#bfe3ea', { transparent:true, opacity:.55 });
      for (let i = 0; i < 7; i++) wbox(L, -14 + i * 10, -18, 8 + (i % 2) * 14 + i * 3, 10, L.h + 26 - i * 4, 4, i % 2 ? '#f08a6b' : '#f7a080');
    } else {
      wbox(L, L.w/2 - 3, 0, 0, 6, L.h, 6, f);
      for (let i = 0; i < 6; i++) wbox(L, 0, L.h - 8 - i * 7, 6, L.w, 4, 7, '#fbf6e8');
    }
  },
  clock(L){
    const r = L.w / 2, m = L.wall === 'B' ? cyl(L.a + r, L.y + r - 5, 5, r, 10, '#d9493f') : cyl(5, L.y + r - 5, L.a + r, r, 10, '#d9493f');
    if (L.wall === 'B'){ m.rotation.x = Math.PI/2; m.position.y = L.y + r; } else { m.rotation.z = Math.PI/2; m.position.y = L.y + r; }
    wdecal(L, 5, 5, 11, L.w - 10, L.w - 10, (g, W) => { g.fillStyle = '#fff9ea'; g.beginPath(); g.arc(W/2, W/2, W/2, 0, 7); g.fill(); g.strokeStyle = '#3b2a1f'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(W/2, W/2); g.lineTo(W/2, W*.2); g.moveTo(W/2, W/2); g.lineTo(W*.72, W*.56); g.stroke(); }, { alpha:true });
  },
  board(L, o){
    mount(L, (g, W, H) => {
      rr(g, 0, 0, W, H, 0, '#2f7a56'); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(30, 12, 180, H - 26);
      const n = o.lines || [], s = textFit(n.reduce((a, b) => a.length > b.length ? a : b, ''), W - 60, 30);
      n.forEach((t, i) => tx(g, t, 30, 42 + i * (s + 20), s, '#fbf8ee', 'left'));
    }, '#b8733d', 7);
    wbox(L, 30, -8, 7, L.w - 60, 5, 12, '#b8733d'); wbox(L, L.w * .68, -3, 12, 22, 4, 5, '#ffffff'); wbox(L, L.w * .75, -3, 12, 14, 4, 5, '#f2c84b');
  },
  poster(L, o){
    const lines = o.lines || [], s = textFit(lines.reduce((a, b) => a.length > b.length ? a : b, ''), L.w - 20, 15);
    mount(L, (g, W, H) => {
      rr(g, 0, 0, W, H, 0, o.tone || '#fff8e6'); rr(g, 7, 7, W - 14, 28, 4, '#e8604c'); tx(g, o.title, W/2, 22, textFit(o.title, W - 22, 18), '#fff');
      lines.forEach((t, i) => tx(g, t, 11, 53 + i * (s + 9), s, '#3b2a1f', 'left'));
    }, '#fff', 2);
    const p = L.wall === 'B' ? [L.a + L.w/2, L.y + L.h - 3, 7] : [7, L.y + L.h - 3, L.a + L.w/2]; ball(p[0], p[1], p[2], 5, '#d9493f');
  },
  clipboard(L){
    mount(L, (g, W, H) => {
      rr(g, 0, 0, W, H, 8, '#9a6235'); rr(g, 9, 20, W - 18, H - 29, 2, '#fffaf0'); rr(g, W/2 - 18, 3, 36, 18, 4, '#aeb7bd');
      g.strokeStyle = '#7f8b95'; g.lineWidth = 2.4; for (let i = 0; i < 6; i++){ g.beginPath(); g.moveTo(17, 40 + i * ((H - 56)/6)); g.lineTo(W - 17 - (i * 37) % 24, 40 + i * ((H - 56)/6)); g.stroke(); }
    }, '#7a4a28', 3);
  },
  bulletin(L){
    mount(L, (g, W, H) => {
      rr(g, 0, 0, W, H, 0, '#d9a564'); g.fillStyle = '#b98248'; for (let i = 0; i < 110; i++) g.fillRect((i * 97) % W, (i * 61) % H, 3, 3);
      rr(g, W/2 - 112, 6, 224, 28, 6, '#fff6df'); tx(g, '우리들의 꿈 그림 전시', W/2, 21, 18, '#3b2a1f');
      const pal = [['#ffe58f','#ef7f3a'],['#bfe6f5','#2f7fc1'],['#ffc9c0','#d9493f'],['#c9eea7','#3ea35a'],['#e6c9f2','#8a5ab8'],['#ffe58f','#3ea35a'],['#bfe6f5','#ef7f3a'],['#ffc9c0','#2f7fc1']];
      const cw = (W - 30) / 4, ch = (H - 54) / 2;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++){
        const x = 15 + c * cw + 6, y = 42 + r * ch + 4, w = cw - 12, h = ch - 10;
        if (r === 0 && c >= 2){ g.strokeStyle = '#8a5a34'; g.setLineDash([7, 6]); g.lineWidth = 2; g.strokeRect(x, y, w, h); g.setLineDash([]); g.fillStyle = '#8f98a0'; g.beginPath(); g.arc(x + 12, y + 14 + c * 4, 7, 0, 7); g.fill(); g.beginPath(); g.arc(x + w - 14, y + h - 12, 7, 0, 7); g.fill(); continue; }
        const p = pal[(r * 4 + c) % 8]; rr(g, x, y, w, h, 2, p[0]); g.fillStyle = p[1]; g.beginPath(); g.arc(x + w*.3, y + h*.32, h*.15, 0, 7); g.fill();
        g.strokeStyle = p[1]; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 8, y + h - 16); g.quadraticCurveTo(x + w*.3, y + h - 36, x + w*.5, y + h - 16); g.quadraticCurveTo(x + w*.72, y + h + 2, x + w - 8, y + h - 18); g.stroke();
        g.fillStyle = '#d9493f'; g.beginPath(); g.arc(x + 8, y + 7, 5, 0, 7); g.fill(); g.fillStyle = '#2f7fc1'; g.beginPath(); g.arc(x + w - 8, y + 7, 5, 0, 7); g.fill();
      }
    }, '#a86f3f', 7);
  },
  weatherBoard(L){
    mount(L, (g, W, H) => {
      rr(g, 0, 0, W, H, 0, '#fff6df'); tx(g, '오늘의 날씨', W/2, 22, 17, '#3b2a1f');
      g.fillStyle = '#9fb3c2'; g.beginPath(); g.ellipse(W*.3, H*.5, 26, 15, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(W*.42, H*.42, 22, 16, 0, 0, 7); g.fill();
      g.strokeStyle = '#2f7fc1'; g.lineWidth = 3.5; g.lineCap = 'round'; [.22,.33,.44].forEach(a => { g.beginPath(); g.moveTo(W*a, H*.66); g.lineTo(W*a - 5, H*.78); g.stroke(); });
      tx(g, '비', W*.72, H*.42, 22, '#2f7fc1'); tx(g, '(많음)', W*.72, H*.62, 14, '#3b2a1f'); tx(g, '09:00 ~ 11:00', W/2, H - 14, 13, '#3b2a1f');
    }, '#6b4a30', 5);
  },
  toolRack(L){
    mount(L, (g, W, H) => { rr(g, 0, 0, W, H, 0, '#c58a4e'); g.fillStyle = '#a8713d'; for (let x = 0; x < W; x += 46) g.fillRect(x, 0, 2, H); }, '#7a4a28', 5);
    const t = (u, h, c) => wbox(L, u, L.h - h - 16, 8, 6, h, 5, c);
    t(36, 165, '#8a5a34'); wbox(L, 16, L.h - 196, 8, 46, 12, 5, '#7f8b95'); t(106, 120, '#8a5a34'); wbox(L, 92, L.h - 166, 8, 34, 36, 4, '#aeb7bd');
    wbox(L, 168, L.h - 112, 8, 62, 52, 22, '#3ea35a'); wbox(L, 228, L.h - 92, 8, 40, 8, 8, '#3ea35a'); t(L.w - 22, 96, '#8a5a34'); wbox(L, L.w - 32, L.h - 136, 8, 26, 30, 5, '#aeb7bd');
  },

  /* ───────── 바닥에 놓인 가구 ───────── */
  table(L, o){
    const c = '#e9b56a';
    rbox(L.x, L.h - 9, L.z, L.w, 9, L.d, c, 3);
    [[6,6],[L.w-16,6],[6,L.d-16],[L.w-16,L.d-16]].forEach(([a,b]) => box(L.x + a, 0, L.z + b, 10, L.h - 9, 10, '#b8824a'));
    const y = L.h;
    box(L.x + 24, y, L.z + 26, 84, 1.4, 60, '#ff9a8b').rotation.y = .1;
    box(L.x + 92, y, L.z + 74, 78, 1.4, 56, '#8fd0ef').rotation.y = -.08;
    rbox(L.x + 150, y, L.z + 20, 46, 12, 26, '#f7c94b', 2);
    [0,1,2,3].forEach(i => { const m = cyl(L.x + 34 + i * 12, y + 3, L.z + 112, 2.6, 34, ['#d9493f','#2f7fc1','#3ea35a','#ef7f3a'][i]); m.rotation.x = Math.PI/2; });
    if (o.memo){ const x = L.x + L.w - 96, z = L.z + L.d - 74; box(x, y, z, 72, 1.6, 58, '#ffe46b').rotation.y = 0; decal('y', x, y + 2, z, 72, 58, (g, W, H) => { rr(g, 0, 0, W, H, 0, '#ffe46b'); g.strokeStyle = '#8a7a3a'; g.lineWidth = 2.5; for (let i = 0; i < 3; i++){ g.beginPath(); g.moveTo(9, 16 + i * 14); g.lineTo(W - 12 - i * 8, 16 + i * 14); g.stroke(); } }); }
  },
  desk(L, o){
    desk3d(L.x, L.z, { w:L.w, d:L.d - 54, chair:true, cc:'#6fb0d9' });
    const y = 73;
    if (o.items === 'books'){ rbox(L.x + 22, y, L.z + 14, 58, 7, 40, '#2f7fc1', 1.5); rbox(L.x + 26, y + 7, L.z + 16, 52, 7, 36, '#d9493f', 1.5); rbox(L.x + L.w - 48, y, L.z + 18, 36, 7, 18, '#f7c94b', 3); }
    if (o.items === 'magnets') for (let i = 0; i < 14; i++) ball(L.x + 18 + (i % 7) * 15, y + 6, L.z + 12 + Math.floor(i / 7) * 16, 6.5, ['#d9493f','#2f7fc1','#f7c94b','#3ea35a','#8a5ab8','#ef7f3a'][i % 6]);
  },
  locker(L){
    rbox(L.x, 0, L.z, L.w, L.h, L.d, '#3fa66b', 4);
    const names = ['하준','민서','민준','서아','도현','지우'], C = ['#ef7f3a','#f7c94b','#d9493f','#2f7fc1','#8a5ab8','#f28fb0'];
    const W = fw(L), cw = (W - 18) / 2, ch = (L.h - 18) / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++){
      const u = 6 + c * (cw + 6), v = 6 + r * (ch + 3), i = (2 - r) * 2 + c;
      fbox(L, u, v, -.4, cw, ch - 3, 1, '#23553b');
      fbox(L, u + 12, v, -1, cw * .5, ch * .62, 16, C[i]);
      front(L, u + cw/2 - 22, v + ch - 22, 44, 17, (g, A, B) => { rr(g, 0, 0, A, B, 2, '#fff8e6'); tx(g, names[i], A/2, B/2 + 1, 13, '#3b2a1f'); });
    }
  },
  cabinet(L){
    rbox(L.x, 0, L.z, L.w, L.h, L.d, '#c07a3f', 4);
    const W = fw(L);
    front(L, 8, L.h * .42, W - 16, L.h * .54, (g, A, B) => {
      rr(g, 0, 0, A, B, 3, '#d9eef0'); ['#f7c94b','#2f7fc1','#d9493f','#3ea35a'].forEach((c, i) => rr(g, 14 + i * 22, B - 60, 15, 52, 3, c));
      rr(g, A * .58, B - 56, 54, 48, 4, '#8fd0ef'); g.strokeStyle = '#8a5a34'; g.lineWidth = 4; [0,1,2].forEach(i => { g.beginPath(); g.moveTo(A*.64 + i*14, B - 56); g.lineTo(A*.62 + i*14 + i*3, B - 96); g.stroke(); });
      g.fillStyle = '#8a5a34'; g.fillRect(A/2 - 2, 0, 4, B);
    });
    front(L, 8, 8, W - 16, L.h * .38, (g, A, B) => { rr(g, 0, 0, A, B, 3, '#d9934f'); g.fillStyle = '#b8733d'; g.fillRect(A/2 - 2, 0, 4, B); g.fillStyle = '#f2c84b'; g.beginPath(); g.arc(A/2 - 14, B/2, 5, 0, 7); g.arc(A/2 + 14, B/2, 5, 0, 7); g.fill(); });
  },
  shelf(L, o){
    const W = fw(L), rows = 3, rh = (L.h - 10) / rows, P = ['#fff','#ff9a8b','#8fd0ef','#ffe58f','#a9e08b'], J = ['#8fd0ef','#a9e08b','#ffe58f','#f2b3d0'];
    rbox(L.x, 0, L.z, L.w, L.h, L.d, '#a86f3f', 3);
    for (let r = 0; r < rows; r++){
      const y = 7 + r * rh; fbox(L, 6, y, 0, W - 12, rh - 7, 3, '#5f3d24');
      if (o.items === 'paper') for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) fbox(L, 12 + i * (W - 24)/4, y + j * 5.4, -2, (W - 24)/4 - 7, 5, 26, P[(i + j + r) % 5]);
      if (o.items === 'sci') for (let i = 0; i < 4; i++){ const u = 18 + i * (W - 36)/4; fbox(L, u, y, -2, 30, rh * .62, 22, J[(i + r) % 4], { transparent:true, opacity:.8 }); fbox(L, u + 7, y + rh * .62, -5, 16, 10, 14, '#a58b6a'); }
    }
  },
  basket(L, o){
    box(L.x, 0, L.z, L.w, L.h, L.d, new T.MeshStandardMaterial({ map:(() => { const t = canvasTex(32, 32, (g, W) => { g.fillStyle = '#c9924f'; g.fillRect(0, 0, W, W); g.fillStyle = '#9a6a35'; for (let y = 0; y < 32; y += 8) for (let x = (y % 16); x < 32; x += 16) g.fillRect(x, y, 8, 4); }, { px:2, nearest:true }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 3); return t; })(), roughness:.9 }));
    rbox(L.x - 5, L.h - 3, L.z - 5, L.w + 10, 8, L.d + 10, '#8a5a34', 3);
    const y = L.h + 3;
    box(L.x + 14, y, L.z + 10, L.w - 40, 7, L.d - 26, '#ff9a8b').rotation.y = .12;
    box(L.x + 34, y + 7, L.z + 22, L.w - 60, 6, L.d - 50, '#ffe58f').rotation.y = -.2;
    box(L.x + 20, y + 13, L.z + 40, L.w - 90, 5, L.d - 62, '#a9e08b').rotation.y = .3;
    if (o.blue) rbox(L.x + L.w - 76, y + 4, L.z + L.d - 42, 62, 16, 26, '#2f6fd1', 5);
  },
  sink(L, o){
    const cx = L.x + L.w / 2, y = L.h;
    rbox(L.x, 0, L.z, L.w, L.h - 8, L.d, '#8fc7b2', 3);
    front(L, 14, 12, L.w/2 - 22, L.h - 34, (g, A, B) => rr(g, 0, 0, A, B, 3, '#a9d9c6'));
    front(L, L.w/2 + 8, 12, L.w/2 - 22, L.h - 34, (g, A, B) => rr(g, 0, 0, A, B, 3, '#a9d9c6'));
    box(L.x - 5, y - 8, L.z - 2, 28, 8, L.d + 7, '#e8edf0'); box(L.x + L.w - 23, y - 8, L.z - 2, 28, 8, L.d + 7, '#e8edf0');
    box(L.x + 23, y - 8, L.z - 2, L.w - 46, 8, 20, '#e8edf0'); box(L.x + 23, y - 8, L.z + L.d - 15, L.w - 46, 8, 20, '#e8edf0');
    box(L.x + 23, y - 6, L.z + 18, L.w - 46, 1, L.d - 33, '#aab4ba');
    box(L.x + 23, y - 3.4, L.z + 18, L.w - 46, 1, L.d - 33, o.muddy ? '#8b6a3f' : '#c7e6ee', { roughness:.18 });
    const dx = cx - 22, dz = L.z + L.d/2 - 10;
    decal('y', dx - 12, y - 2, dz - 8, 68, 36, (g, W, H) => { g.fillStyle = '#6b4a2b'; g.beginPath(); g.ellipse(W/2, H/2, W/2, H/2, 0, 0, 7); g.fill(); g.fillStyle = '#c0c6ca'; g.beginPath(); g.ellipse(W/2, H/2, W*.3, H*.3, 0, 0, 7); g.fill(); g.strokeStyle = '#5a3a20'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(W*.26, H/2); g.lineTo(W*.74, H/2); g.moveTo(W/2, H*.25); g.lineTo(W/2, H*.75); g.stroke(); g.fillStyle = '#4a2f18'; [[.34,.4],[.6,.62],[.68,.38],[.42,.66]].forEach(([a,b]) => { g.beginPath(); g.arc(W*a, H*b, 3, 0, 7); g.fill(); }); }, { alpha:true });
    rbox(L.x - 5, y, L.z - 2, L.w + 10, 60, 10, '#fbfdfc', 2);
    cyl(cx, y, L.z + 18, 6, 56, '#c0c9cf', { m:{ metalness:.4, roughness:.3 } });
    box(cx - 5, y + 50, L.z + 14, 10, 8, 46, '#c0c9cf', { metalness:.4, roughness:.3 });
    rbox(cx - 26, y + 58, L.z + 10, 52, 8, 16, '#3fa39a', 3);
    if (o.muddy) [[.22,.5],[.76,.7]].forEach(([a,b]) => box(L.x + L.w * a, L.h * (1 - b), L.z + L.d + .5, 7, L.h * b - 8, .8, '#7fbcd6', { roughness:.15 }));
  },
  labtable(L){
    rbox(L.x + 6, 0, L.z + 6, L.w - 12, L.h - 10, L.d - 12, '#b8824a', 3);
    rbox(L.x, L.h - 10, L.z, L.w, 10, L.d, '#39414a', 2);
    const glass = { m:{ transparent:true, opacity:.55, roughness:.1, color:'#c9eef5' } };
    [0,1,2].forEach(i => cyl(L.x + 44 + i * 58, L.h, L.z + 42, 18, 40, '#c9eef5', { top:14, m:glass.m }));
    rbox(L.x + L.w - 112, L.h, L.z + 28, 90, 18, 32, '#a86f3f', 2);
    [0,1,2,3,4].forEach(i => cyl(L.x + L.w - 100 + i * 16, L.h + 8, L.z + 44, 4.5, 40, '#eefaff', { m:glass.m }));
  },
  pots(L){
    rbox(L.x, 42, L.z, L.w, 8, L.d, '#c58a4e', 2);
    [[8,8],[L.w-16,8],[8,L.d-16],[L.w-16,L.d-16]].forEach(([a,b]) => box(L.x + a, 0, L.z + b, 8, 42, 8, '#8a5a34'));
    [0,1,2].forEach(i => { const x = L.x + L.w * (.2 + i * .3), z = L.z + L.d / 2; cyl(x, 50, z, 24, 44, '#cf6f3f', { top:32 }); cyl(x, 88, z, 30, 6, '#5a3a22', { top:30 }); ball(x - 22, 54, z + 26, 9, '#5a3a22'); ball(x + 16, 51, z + 28, 6, '#5a3a22'); });
    decal('y', L.x + 10, 50.6, L.z + 6, L.w - 20, L.d - 12, (g, W, H) => { g.fillStyle = 'rgba(82,50,26,.7)'; [[.2,.8,22],[.5,.7,30],[.8,.75,20],[.36,.25,14]].forEach(([a,b,r]) => { g.beginPath(); g.ellipse(W*a, H*b, r, r*.55, 0, 0, 7); g.fill(); }); }, { alpha:true });
  },
  plant(L){ plant(L.x + L.w/2, L.z + L.d/2, 1.05); },
  umbrellaStand(L){
    const cx = L.x + L.w/2, cz = L.z + L.d/2, C = ['#2f7fc1','#d9493f','#3ea35a','#f7c94b'];
    cyl(cx, 0, cz, 32, 62, '#8e9aa3', { m:{ metalness:.35, roughness:.4 } });
    C.forEach((c, i) => { const a = i * 1.57 + .5, x = cx + Math.cos(a) * 13, z = cz + Math.sin(a) * 13; const m = cyl(x, 40, z, 10, 74, c, { top:3 }); m.rotation.z = Math.cos(a) * .08; const h = cyl(x, 114, z, 1.6, 22, '#6b4a30'); h.rotation.z = Math.cos(a) * .08; });
    decal('y', cx - 56, .8, cz - 56, 112, 112, (g, W) => { g.fillStyle = 'rgba(112,178,206,.65)'; g.beginPath(); g.ellipse(W/2, W/2, W/2, W*.44, 0, 0, 7); g.fill(); }, { alpha:true });
  },
  matLeaning(L){
    const m = rbox(L.x, 0, L.z, L.w, L.h, L.d, '#7a4a2c', 2);
    m.rotation.x = -.09;
    const d = decal('z', L.x + 8, 8, L.z + L.d + 4, L.w - 16, L.h - 16, (g, W, H) => { rr(g, 0, 0, W, H, 3, '#8f5a36'); g.fillStyle = '#7a4a2c'; for (let y = 8; y < H; y += 16) g.fillRect(0, y, W, 5); g.save(); g.translate(W/2, H/2); g.rotate(-Math.PI/2); tx(g, 'WELCOME', 0, 0, 22, '#f2e0bd'); g.restore(); });
    d.rotation.x = -.09; d.position.z += 12;
  },
  shoeLocker(L){
    rbox(L.x, 0, L.z, L.w, L.h, L.d, '#e8a33f', 4);
    const cols = 4, rows = 4, W = fw(L), cw = (W - 12) / cols, ch = (L.h - 12) / rows, S = ['#fff','#2f7fc1','#d9493f','#3ea35a'];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
      fbox(L, 6 + c * cw + 2, 6 + r * ch + 2, -.4, cw - 4, ch - 4, 1, '#6b4326');
      if ((r + c) % 3) rbox(L.x + 6 + c * cw + cw * .18, 6 + r * ch + 3, L.z + L.d - 2, cw * .64, 12, 12, S[(r * 2 + c) % 4], 4);
    }
  },
  cart(L){
    rbox(L.x, 22, L.z, L.w, 10, L.d, '#3f83c9', 3);
    [[14,12],[L.w-14,12],[14,L.d-12],[L.w-14,L.d-12]].forEach(([a,b]) => { const m = cyl(L.x + a, 0, L.z + b, 12, 12, '#39414a'); m.rotation.x = Math.PI/2; m.position.y = 12; });
    box(L.x + L.w - 10, 32, L.z + 6, 6, 88, 6, '#8e9aa3'); box(L.x + L.w - 10, 32, L.z + L.d - 12, 6, 88, 6, '#8e9aa3'); box(L.x + L.w - 10, 116, L.z + 6, 6, 6, L.d - 12, '#8e9aa3');
    rbox(L.x + 16, 32, L.z + 16, 128, 48, L.d - 32, '#d7a868', 3);
    [['#d9493f',46],['#f7c94b',88],['#2f7fc1',128]].forEach(([c,x]) => ball(L.x + x - 6, 92, L.z + L.d/2, 22, c));
    cyl(L.x + L.w - 54, 32, L.z + L.d/2, 22, 60, '#ef7f3a', { top:3 });
  },
  ballBasket(L){
    const C = ['#d9493f','#fff','#f7c94b','#2f7fc1','#ef7f3a','#3ea35a'];
    [0,1].forEach(k => [0,1,2].forEach(i => [0,1].forEach(j => ball(L.x + 34 + i * 56, 30 + k * 50, L.z + 34 + j * 56 + k * 6, 27, C[(i + j * 2 + k * 3) % 6]))));
    const b = '#6b7580';
    [[0,0],[L.w-5,0],[0,L.d-5],[L.w-5,L.d-5]].forEach(([a,c]) => box(L.x + a, 0, L.z + c, 5, L.h, 5, b));
    [10, L.h * .55, L.h].forEach(y => { box(L.x, y, L.z + L.d - 5, L.w, 4, 5, b); box(L.x, y, L.z, L.w, 4, 5, b); box(L.x + L.w - 5, y, L.z, 5, 4, L.d, b); box(L.x, y, L.z, 5, 4, L.d, b); });
  },
  gardenBed(L, o){
    const n = 5, y = L.h;
    rbox(L.x, 0, L.z, L.w, L.h, L.d, '#b5763d', 3);
    decal('y', L.x + 7, L.h + .5, L.z + 7, L.w - 14, L.d - 14, (g, W, H) => {
      g.fillStyle = o.moist ? '#5a3a22' : '#d9b77e'; g.fillRect(0, 0, W, H);
      g.fillStyle = o.moist ? '#6c4629' : '#c29c62'; for (let i = 0; i < 90; i++) g.fillRect((i * 83) % W, (i * 37) % H, 5, 5);
      if (!o.moist){ g.strokeStyle = '#a07a44'; g.lineWidth = 2; for (let i = 0; i < 9; i++){ const x = 12 + i * W / 9; g.beginPath(); g.moveTo(x, 10); g.lineTo(x + 10, H * .4); g.lineTo(x + 2, H * .7); g.stroke(); } }
    }, { nearest:true, px:1 });
    for (let i = 0; i < n; i++){
      const x = L.x + 28 + i * (L.w - 56) / (n - 1), z = L.z + L.d / 2, wilt = !o.moist || (o.mid && i === n - 1);
      if (wilt){
        cyl(x, y, z, 2.6, 24, '#a08a3f');
        [[-1,0],[1,0],[0,1]].forEach(([a,b]) => { const m = ball(x + a * 15, y + 12, z + b * 15, 11, '#c9a93f'); m.scale.set(1.2, .4, .9); });
      } else {
        cyl(x, y, z, 3, 34, '#3f8f3a');
        [[-14,44,0,15],[14,48,4,14],[0,60,-4,13],[4,40,14,12]].forEach(([a,b,e,r]) => leaf(x + a, y + b - 6, z + e, r, i2c('#46a83f', a + b)));
      }
    }
  },
  signpost(L, o){
    const x = L.x + L.w/2;
    box(x - 6, 0, L.z, 12, L.h - 80, 12, '#8a5a34');
    rbox(L.x, L.h - 92, L.z - 4, L.w, 92, 8, '#b5763d', 2);
    decal('z', L.x + 7, L.h - 85, L.z + 4.6, L.w - 14, 78, (g, W, H) => { rr(g, 0, 0, W, H, 2, '#fffaf0'); tx(g, o.title, W/2, 15, textFit(o.title, W - 12, 17), '#3b2a1f'); g.strokeStyle = '#7f8b95'; g.lineWidth = 2.2; for (let i = 0; i < 3; i++){ g.beginPath(); g.moveTo(9, 33 + i * 13); g.lineTo(W - 10 - i * 7, 33 + i * 13); g.stroke(); } });
  },
  arrowSign(L, o){
    const x = L.x + L.w/2;
    box(x - 6, 0, L.z, 12, L.h - 30, 12, '#8a5a34');
    rbox(L.x, L.h - 60, L.z - 4, L.w, 56, 8, '#d9a15a', 2);
    decal('z', L.x + 3, L.h - 57, L.z + 4.6, L.w - 6, 50, (g, W, H) => { rr(g, 0, 0, W, H, 3, '#f0c07a'); tx(g, (o.left ? '← ' : '') + o.label + (o.left ? '' : ' →'), W/2, H/2 + 1, textFit(o.label + ' →', W - 10, 19), '#3b2a1f'); });
  },
  tap(L){
    const x = L.x + L.w/2, z = L.z + L.d/2;
    rbox(L.x, 0, L.z, L.w, 16, L.d, '#b5b0a4', 3);
    cyl(x, 16, z, 7, 120, '#99a4ac', { m:{ metalness:.4, roughness:.35 } });
    rbox(x - 15, 96, z - 15, 30, 30, 30, '#b9c2c8', 4);
    box(x + 12, 106, z - 5, 42, 10, 10, '#c7cfd4', { metalness:.4, roughness:.3 });
    cyl(x + 50, 62, z, 5, 46, '#c7cfd4', { m:{ metalness:.4, roughness:.3 } });
    rbox(x - 24, 128, z - 4, 48, 8, 8, '#d9493f', 2); cyl(x, 124, z, 3, 8, '#d9493f');
    cyl(x + 50, 50, z, 8, 14, '#f0c23c', { m:{ metalness:.4, roughness:.35 } });
  },
  wheelbarrow(L){
    const y = 62, wx = L.x + L.w - 14, cz = L.z + L.d/2;
    rbox(L.x + 26, y, L.z + 8, L.w - 66, 12, L.d - 16, '#3e8fb0', 3);
    rbox(L.x + 14, y + 12, L.z + 2, L.w - 44, 34, 8, '#4aa0c2', 2); rbox(L.x + 14, y + 12, L.z + L.d - 10, L.w - 44, 34, 8, '#4aa0c2', 2);
    rbox(L.x + 14, y + 12, L.z + 2, 8, 34, L.d - 4, '#4aa0c2', 2); rbox(L.x + L.w - 38, y + 12, L.z + 2, 8, 34, L.d - 4, '#4aa0c2', 2);
    box(L.x + 22, y + 8, L.z + 10, L.w - 60, 20, L.d - 20, '#7a5230');
    const w = cyl(wx, 0, cz, 30, 14, '#39414a'); w.rotation.x = Math.PI/2; w.position.y = 30;
    const hub = cyl(wx, 0, cz, 10, 16, '#c0c9cf'); hub.rotation.x = Math.PI/2; hub.position.y = 30;
    box(L.x - 30, y + 6, L.z + 4, L.w + 16, 6, 6, '#8a5a34'); box(L.x - 30, y + 6, L.z + L.d - 10, L.w + 16, 6, 6, '#8a5a34');
    box(L.x + 44, 0, L.z + 4, 6, y + 6, 6, '#8a5a34'); box(L.x + 44, 0, L.z + L.d - 10, 6, y + 6, 6, '#8a5a34');
  },
  hoseEnd(L){
    const x = L.x + 34, z = L.z + L.d/2;
    const m = cyl(x + 26, 8, z, 7, 40, '#f0c23c', { top:5, m:{ metalness:.4, roughness:.35 } }); m.rotation.z = -Math.PI/2; m.position.set(x + 26, 8, z);
    decal('y', x + 24, .8, z - 26, 110, 56, (g, W, H) => { g.fillStyle = 'rgba(112,178,206,.6)'; g.beginPath(); g.ellipse(W/2, H/2, W/2, H/2, 0, 0, 7); g.fill(); }, { alpha:true });
  },

  /* ───────── 바닥 흔적 ───────── */
  puddle(L){
    const s = new T.Shape(), w = L.w, d = L.d;
    s.moveTo(w*.05, d*.5); s.bezierCurveTo(w*.08, d*.05, w*.4, d*.2, w*.5, d*.08); s.bezierCurveTo(w*.74, -d*.04, w*1.02, d*.22, w*.94, d*.56); s.bezierCurveTo(w*.9, d*.98, w*.5, d*.86, w*.32, d*.96); s.bezierCurveTo(w*.08, d*1.04, -w*.02, d*.8, w*.05, d*.5);
    const g = new T.ShapeGeometry(s, 24); g.rotateX(Math.PI/2);
    const m = new T.Mesh(g, mat('#7fc0dc', { roughness:.08, transparent:true, opacity:.78, side:T.DoubleSide })); m.receiveShadow = true; m.position.set(L.x, .9, L.z); cur.add(m);
  },
  floorPapers(L){
    const P = [[.02,.18,'#ffc9c0',70,52,.4,1],[.17,.56,'#bfe6f5',66,48,-.5,1],[.33,.1,'#ffe58f',70,50,.2,1],[.54,.48,'#c9eea7',88,62,-.2,3],[.76,.14,'#e6c9f2',96,68,.1,3]];
    P.forEach(([a,b,c,w,d,r,h]) => { const m = box(L.x + L.w*a, 0, L.z + L.d*b, w, h, d, c); m.rotation.y = r; });
  },
  footprints(L){ floorPrints(L, 'rgba(58,92,118,.62)', false); },
  wetFloor(L){ floorPrints(L, 'rgba(58,92,118,.58)', true); },
  matSpot(L){
    decal('y', L.x, .9, L.z, L.w, L.d, (g, W, H) => {
      rr(g, 0, 0, W, H, 5, 'rgba(255,245,214,.82)'); g.strokeStyle = '#8a6a44'; g.lineWidth = 4; g.setLineDash([14, 10]); g.strokeRect(3, 3, W - 6, H - 6); g.setLineDash([]);
      prints(g, 18, H/2, W - 26, 'rgba(58,92,118,.6)', 7);
      g.strokeStyle = 'rgba(96,74,48,.85)'; g.lineWidth = 5; g.setLineDash([5, 8]); [H*.14, H*.3].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }); g.setLineDash([]);
    }, { alpha:true });
  },
  tracks(L, o){
    decal('y', L.x, .9, L.z, L.w, L.d, (g, W, H) => { g.strokeStyle = 'rgba(92,70,44,.85)'; g.lineWidth = o.single ? 11 : 8; g.setLineDash([6, 8]); (o.single ? [H/2] : [H*.3, H*.72]).forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + 2); g.stroke(); }); g.setLineDash([]); }, { alpha:true });
  },
  emptySpot(L){
    decal('y', L.x, .9, L.z, L.w, L.d, (g, W, H) => { g.strokeStyle = '#fff3d6'; g.lineWidth = 5; g.setLineDash([16, 12]); g.strokeRect(4, 4, W - 8, H - 8); g.setLineDash([]); tx(g, '손수레', W/2, H/2, 30, '#fff3d6'); }, { alpha:true });
  }
};
function prints(g, x, y, w, c, n){
  g.fillStyle = c;
  for (let i = 0; i < n; i++){ const px = x + i * w / n, py = y + (i % 2 ? -17 : 17); g.save(); g.translate(px, py); g.beginPath(); g.ellipse(0, 0, 14, 8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(-20, 0, 6.5, 7, 0, 0, 7); g.fill(); g.restore(); }
}
function floorPrints(L, c, wet){
  decal('y', L.x, .9, L.z, L.w, L.d, (g, W, H) => {
    if (wet){ g.fillStyle = 'rgba(122,188,218,.62)'; g.beginPath(); g.moveTo(0, H*.3); g.bezierCurveTo(W*.3, H*.02, W*.6, H*.34, W, H*.2); g.lineTo(W, H*.76); g.bezierCurveTo(W*.6, H*.98, W*.3, H*.62, 0, H*.8); g.fill(); }
    prints(g, 24, H/2, W - 30, c, Math.round(W / 56));
  }, { alpha:true });
}

/* ───────── 방과 야외 ───────── */
function patTex(paint, size, rx, rz){
  const t = canvasTex(size, size, paint, { px:1, nearest:true });
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, rz);
  return t;
}
const FLOORS = {
  wood:(a, b) => (g, S) => { g.fillStyle = a; g.fillRect(0, 0, S, S); for (let r = 0; r < 4; r++){ const y = r * S/4; g.fillStyle = r % 2 ? mix(a, b, .35) : a; g.fillRect(0, y, S, S/4); g.fillStyle = b; g.fillRect(0, y, S, 2); g.fillRect((r * 37) % S, y, 2, S/4); g.fillRect(((r * 37) + S/2) % S, y, 2, S/4); } },
  tile:(a, b) => (g, S) => { g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b; g.fillRect(0, 0, S/2, S/2); g.fillRect(S/2, S/2, S/2, S/2); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, S, 1); g.fillRect(0, 0, 1, S); },
  zig:(a, b) => (g, S) => { const c = S/16; g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++){ const q = (x + (y % 8 < 4 ? y % 8 : 8 - y % 8)) % 8; if (q < 3) g.fillRect(x*c, y*c, c, c); } },
  grass:(a, b) => (g, S) => { const c = S/16; g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b; for (let i = 0; i < 60; i++) g.fillRect(((i*7)%16)*c, ((i*11)%16)*c, c, c); }
};
function shell(R){
  const W = 1700, D = 1500, H = 470;
  const f = FLOORS[R.kind || 'wood'](R.floor, R.floor2);
  const m = new T.Mesh(new T.PlaneGeometry(W + 800, D + 800), new T.MeshStandardMaterial({ map:patTex(f, 128, (W + 800)/(R.tile || 150), (D + 800)/(R.tile || 150)), roughness:.92 }));
  m.rotation.x = -Math.PI/2; m.position.set(W/2, 0, D/2); m.receiveShadow = true; cur.add(m);
  const paint = (w, lower) => (g, A, B) => {
    g.fillStyle = R.wall; g.fillRect(0, 0, A, B);
    if (R.stripe){ g.fillStyle = R.stripe; for (let x = 0; x < A; x += 44) g.fillRect(x, 0, 20, B); }
    if (lower){ const y = B - 92; g.fillStyle = R.low; g.fillRect(0, y, A, 92); g.fillStyle = mix(R.low, '#2a160a', .25); for (let x = 0; x < A; x += 62) g.fillRect(x, y, 3, 92); g.fillStyle = mix(R.low, '#fff6e0', .35); g.fillRect(0, y - 7, A, 8); g.fillStyle = mix(R.low, '#2a160a', .4); g.fillRect(0, B - 10, A, 10); }
  };
  if (R.noB !== true){ box(-16, 0, -16, W + 16, H, 16, mix(R.wall, '#2a160a', .1)); decal('z', 0, 0, .3, W, H, paint(W, true), { px:1 }); }
  if (R.noL !== true){ box(-16, 0, -16, 16, H, D + 16, mix(R.wall, '#2a160a', .1)); decal('x', .3, 0, 0, D, H, paint(D, true), { px:1 }); }
}
function outdoor(R){
  cur.parent.background = new T.Color('#9ed7f0');
  const back = decal('z', -900, 0, -420, 3300, 1100, (g, W, H) => {
    const c = g.createLinearGradient(0, 0, 0, H); c.addColorStop(0, '#6fc2ec'); c.addColorStop(.75, '#d7f2f5'); c.addColorStop(1, '#d7f2f5'); g.fillStyle = c; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; [[.3,.5,140],[.42,.56,100],[.62,.44,130],[.74,.52,90]].forEach(([a,b,r]) => { g.beginPath(); g.ellipse(W*a, H*b, r, r*.34, 0, 0, 7); g.fill(); });
    g.fillStyle = '#86c96a'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H*.86); g.quadraticCurveTo(W*.25, H*.72, W*.5, H*.86); g.quadraticCurveTo(W*.75, H*.98, W, H*.82); g.lineTo(W, H); g.fill();
  }, { px:.5 });
  back.material = new T.MeshBasicMaterial({ map:back.material.map });
}
function tree(x, z, s = 1){
  cyl(x, 0, z, 12*s, 90*s, '#8a5a34');
  [[0,130,0,62],[-40,104,14,44],[40,108,-10,46],[8,168,6,42]].forEach(([a,b,e,r]) => leaf(x + a*s, b*s, z + e*s, r*s, i2c('#46a83f', a + b)));
}
function fence(axis, from, to, at = 0){
  for (let p = from; p < to; p += 62){ axis === 'x' ? rbox(p, 0, at, 14, 92, 10, '#f3e3c3', 2) : rbox(at, 0, p, 10, 92, 14, '#f3e3c3', 2); }
  [32, 68].forEach(y => axis === 'x' ? box(from, y, at + 10, to - from, 8, 4, '#d6bd92') : box(at + 10, y, from, 4, 8, to - from, '#d6bd92'));
}

/* ───────── 장소별 배치 ───────── */
const ROOM = {
  classroom:{ wall:'#fbeec9', low:'#d59a5a', floor:'#e0aa6c', floor2:'#c98f52', kind:'wood', tile:230 },
  storage:{ wall:'#f6dfae', low:'#b9824c', floor:'#c79a68', floor2:'#ad8050', kind:'wood', tile:230, stripe:'#f1d59e' },
  lab:{ wall:'#d6f2e4', low:'#76bfa6', floor:'#e8ecd8', floor2:'#c9dfcb', kind:'tile', tile:120 },
  prep:{ wall:'#e6efc9', low:'#9fb873', floor:'#d9b184', floor2:'#c09763', kind:'wood', tile:230 },
  hall:{ wall:'#fff1cd', low:'#88b98a', floor:'#d7ccba', floor2:'#b5aa98', kind:'zig', tile:210 },
  entrance:{ wall:'#f7e6c6', low:'#c89766', floor:'#ecd9b6', floor2:'#d4a97c', kind:'tile', tile:120 },
  hall1:{ wall:'#fff1cd', low:'#7fb4c4', floor:'#d7ccba', floor2:'#b5aa98', kind:'zig', tile:210 },
  gym:{ wall:'#ffe3b5', low:'#d07f4f', floor:'#e6b878', floor2:'#d09a58', kind:'wood', tile:190 },
  shed:{ wall:'#d9a56a', low:'#a86f3f', floor:'#b98f62', floor2:'#9c7650', kind:'wood', tile:200, stripe:'#cd975c' },
  garden:{ noB:true, noL:true, floor:'#8fd05f', floor2:'#79bd4c', kind:'grass', tile:130, outdoor:true },
  tap:{ noB:true, noL:true, floor:'#c9a873', floor2:'#b5935f', kind:'grass', tile:130, outdoor:true }
};

/* 벽 뒤로 꾸미는 교실 소품 */
function classDeco(){
  bookcase({ x:6, z:700, w:66, d:210, h:150, face:'x' });
  desk3d(130, 560); desk3d(350, 560); desk3d(570, 560, { cc:'#7fc06a' });
  plant(52, 56, 1.1);
  cyl(640, 0, 40, 26, 58, '#7fb0d0', { top:30 });
}
function labDeco(){
  bookcase({ x:6, z:640, w:66, d:220, h:190, face:'x', c:'#78b49f' });
  poster('L', 180, 110, 130, 100, '#fff8e6', '#3fa39a');
  [[170,560],[390,600]].forEach(([x,z]) => { cyl(x, 0, z, 18, 54, '#8e9aa3', { top:14 }); cyl(x, 54, z, 24, 8, '#e9b56a'); });
  plant(960, 50, 1);
}
const LAYOUT = {
  case1:{
    classroom:{ room:ROOM.classroom, deco:classDeco, at:{
      door:{ wall:'L', a:420, y:0, w:112, h:210 }, window:{ wall:'L', a:100, y:96, w:270, h:130 }, clock:{ wall:'B', a:44, y:172, w:58, h:58 },
      board:{ wall:'B', a:130, y:90, w:400, h:136 }, timetable:{ wall:'B', a:560, y:90, w:104, h:136 }, locker:{ x:700, z:4, w:190, d:60, h:162 },
      arttable:{ x:210, z:220, w:290, d:176, h:76 }, desk:{ x:610, z:270, w:130, d:126, h:100 }, minjun:{ foot:[110, 300] }, teacher:{ foot:[628, 170] } } },
    storage:{ room:ROOM.storage, deco(){ stackBox(760, 20, '#e3b878'); stackBox(860, 90, '#d59a5a'); bookcase({ x:6, z:560, w:60, d:180, h:150, face:'x', c:'#8f6a42' }); plant(50, 90, .9, '#4faa55'); poster('L', 90, 110, 96, 96, '#fff8e6', '#ef7f3a'); }, at:{
      cabinet:{ x:4, z:220, w:76, d:230, h:196, face:'x' }, roles:{ wall:'B', a:80, y:82, w:120, h:150 }, shelf:{ x:240, z:4, w:230, d:66, h:206 }, record:{ wall:'B', a:500, y:100, w:90, h:122 },
      basket:{ x:320, z:290, w:190, d:130, h:66 }, seoa:{ foot:[610, 300] }, door:{ wall:'B', a:640, y:0, w:112, h:210 } } }
  },
  case2:{
    lab:{ room:ROOM.lab, deco:labDeco, at:{
      schedule:{ wall:'L', a:370, y:88, w:116, h:140 }, sink:{ x:150, z:4, w:370, d:128, h:92, face:'z' }, faucet:{ box:[310, 92, 4, 56, 74, 64] }, drain:{ box:[292, 88, 44, 90, 6, 60] },
      puddle:{ x:170, z:150, w:330, d:150 }, door:{ wall:'B', a:640, y:0, w:112, h:210 }, labtable:{ x:300, z:400, w:340, d:130, h:86 }, doyun:{ foot:[640, 300] } } },
    prep:{ room:ROOM.prep, deco(){ stackBox(760, 240, '#c9a468'); plant(56, 60, 1); poster('B', 60, 100, 100, 120, '#fff8e6', '#46a83f'); }, at:{
      door:{ wall:'L', a:520, y:0, w:112, h:210 }, guide:{ wall:'L', a:290, y:88, w:124, h:146 }, pots:{ x:170, z:280, w:300, d:110, h:94 }, worklog:{ wall:'B', a:210, y:96, w:96, h:128 },
      shelf:{ x:360, z:4, w:280, d:70, h:210, face:'z' }, jimin:{ foot:[580, 330] }, teacher:{ foot:[760, 160] } } }
  },
  case3:{
    hall:{ room:ROOM.hall, deco(){ bookcase({ x:6, z:660, w:60, d:170, h:110, face:'x', c:'#88b98a' }); }, at:{
      window:{ wall:'L', a:110, y:80, w:290, h:150 }, board:{ wall:'B', a:90, y:60, w:500, h:180 }, magnet:{ wall:'B', a:345, y:128, w:240, h:96, hotOnly:true },
      papers:{ x:90, z:210, w:430, d:120 }, plant:{ x:640, z:24, w:60, d:60 }, hyunsu:{ foot:[640, 300] }, door:{ wall:'B', a:730, y:0, w:112, h:210 } } },
    classroom:{ room:ROOM.classroom, deco:classDeco, at:{
      door:{ wall:'L', a:420, y:0, w:112, h:210 }, board:{ wall:'B', a:60, y:90, w:400, h:136 }, guide:{ wall:'B', a:490, y:86, w:116, h:146 }, log:{ wall:'B', a:640, y:96, w:96, h:128 },
      desk:{ x:300, z:270, w:150, d:126, h:100 }, jimin:{ foot:[160, 300] }, teacher:{ foot:[700, 260] } } }
  },
  case4:{
    entrance:{ room:ROOM.entrance, deco(){
      wbox({ wall:'L', a:230, y:0, w:360, h:220 }, -10, 0, 0, 380, 230, 10, '#7c4f2c');
      wdecal({ wall:'L', a:230, y:0, w:360, h:220 }, 0, 0, 10.8, 360, 220, (g, W, H) => { const c = g.createLinearGradient(0, 0, 0, H); c.addColorStop(0, '#8ea6b4'); c.addColorStop(1, '#c6d4d6'); g.fillStyle = c; g.fillRect(0, 0, W, H); g.fillStyle = '#7f9a82'; g.fillRect(0, H*.66, W, H*.34); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; for (let i = 0; i < 70; i++){ const x = (i*53)%W, y = (i*97)%H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 22); g.stroke(); } g.fillStyle = '#7c4f2c'; g.fillRect(W/2 - 7, 0, 14, H); rr(g, W/2 - 40, H*.45, 12, 46, 4, '#f0c23c'); rr(g, W/2 + 28, H*.45, 12, 46, 4, '#f0c23c'); });
      mount({ wall:'L', a:340, y:236, w:130, h:28 }, (g, W, H) => { rr(g, 0, 0, W, H, 0, '#fff6df'); tx(g, '현 관', W/2, H/2 + 1, 19, '#3b2a1f'); }, '#7c4f2c', 3);
      plant(56, 56, 1);
    }, at:{
      glassdoor:{ wall:'L', a:230, y:0, w:360, h:220, hotOnly:true }, weather:{ wall:'B', a:90, y:104, w:176, h:124 }, matwall:{ x:330, z:6, w:92, d:12, h:170 }, umbrella:{ x:130, z:90, w:90, d:90, h:120 },
      shoes:{ x:470, z:4, w:210, d:56, h:190 }, footprints:{ x:270, z:430, w:520, d:110 }, matspot:{ x:40, z:300, w:210, d:250 }, toHall:{ wall:'B', a:730, y:0, w:124, h:216 } } },
    hall1:{ room:ROOM.hall1, deco(){ poster('B', 460, 100, 96, 120, '#fff8e6', '#2f7fc1'); plant(620, 44, .95); bookcase({ x:6, z:660, w:60, d:170, h:110, face:'x', c:'#7fb4c4' }); }, at:{
      toEntrance:{ wall:'L', a:420, y:0, w:124, h:216 }, ceiling:{ wall:'B', a:90, y:232, w:620, h:36, hotOnly:true }, notice:{ wall:'B', a:280, y:94, w:124, h:140 }, wet:{ x:90, z:210, w:640, d:170 },
      tracks:{ x:520, z:420, w:440, d:84 }, sua:{ foot:[230, 480] }, staff:{ foot:[790, 300] }, toGym:{ wall:'B', a:730, y:0, w:112, h:210 } } },
    gym:{ room:ROOM.gym, deco(){ [0,1,2].forEach(i => rbox(760, i * 22, 20 + i, 210 - i * 8, 22, 120, ['#3f83c9','#3fa66b','#ef7f3a'][i], 4)); cyl(120, 0, 52, 22, 58, '#ef7f3a', { top:3 }); cyl(190, 0, 44, 22, 58, '#f7c94b', { top:3 }); poster('B', 300, 100, 120, 110, '#fff8e6', '#d9493f'); }, at:{
      door:{ wall:'L', a:420, y:0, w:112, h:210 }, cart:{ x:230, z:260, w:280, d:130, h:130 }, log:{ wall:'B', a:520, y:96, w:96, h:128 }, hyunwoo:{ foot:[620, 340] }, balls:{ x:760, z:280, w:200, d:150, h:120 } } }
  },
  case5:{
    garden:{ room:ROOM.garden, deco(){
      outdoor(ROOM.garden); fence('x', -60, 1300, -8); fence('z', -60, 1100, -8);
      rbox(180, 0, -330, 680, 200, 180, '#f5dfae', 4); box(160, 200, -350, 720, 22, 220, '#c9623f');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) box(214 + c * 90, 44 + r * 72, -151, 52, 46, 2, '#9fd4e6');
      tree(-120, 620, 1.1); tree(1090, 40, 1.1); tree(-120, 200, .9);
      decal('y', 190, .8, 474, 870, 96, (g, W, H) => { g.fillStyle = 'rgba(255,236,150,.6)'; g.beginPath(); g.roundRect(0, 0, W, H, 34); g.fill(); g.fillStyle = 'rgba(255,246,196,.65)'; for (let x = 40; x < W; x += 120){ g.beginPath(); g.ellipse(x, H/2, 34, 15, 0, 0, 7); g.fill(); } }, { alpha:true, px:1 });
      box(452, 0, 8, 10, 112, 8, '#8a5a34'); box(534, 0, 8, 10, 112, 8, '#8a5a34');
      const sun = ball(120, 600, -400, 72, '#ffd75e'); sun.material = new T.MeshBasicMaterial({ color:'#ffd75e' }); sun.castShadow = false;
    }, at:{
      obs:{ x:40, z:330, w:120, d:12, h:210 }, nearbed:{ x:190, z:330, w:280, d:130, h:40 }, midbed:{ x:500, z:330, w:250, d:130, h:40 }, farbed:{ x:780, z:330, w:280, d:130, h:40 },
      waterlog:{ wall:'B', a:430, y:100, w:136, h:160, t:14 }, sun:{ box:[190, 0, 474, 870, 3, 96] }, teacher:{ foot:[300, 220] }, seojun:{ foot:[640, 220] }, toTap:{ x:930, z:150, w:150, d:12, h:190 } } },
    tap:{ room:ROOM.tap, deco(){
      outdoor(ROOM.tap); fence('x', 330, 1400, -8);
      box(-16, 0, -16, 16, 240, 1400, '#c96b4c'); box(-16, 0, -16, 350, 240, 16, '#c96b4c');
      const brick = (g, W, H) => { g.fillStyle = '#c96b4c'; g.fillRect(0, 0, W, H); g.fillStyle = '#a95138'; for (let y = 0; y < H; y += 24){ g.fillRect(0, y, W, 2); for (let x = (y/24 % 2) * 30; x < W; x += 60) g.fillRect(x, y, 2, 24); } };
      decal('x', .3, 0, 0, 1400, 240, brick, { px:1 }); decal('z', 0, 0, .3, 334, 240, brick, { px:1 });
      tube([[116,14,180],[150,10,270],[300,6,320],[520,6,330],[640,6,330],[700,6,352],[706,6,400],[704,6,480],[700,6,560],[700,6,620]], 7, '#3ea35a');
      tube([[664,12,352],[690,20,372],[712,8,392]], 7.4, '#33904c');
    }, at:{
      tapbody:{ x:60, z:160, w:60, d:60, h:138 }, connect:{ box:[100, 0, 160, 70, 66, 56] }, toShed:{ x:40, z:430, w:150, d:12, h:190, },
      tracks:{ x:190, z:420, w:330, d:40 }, barrow:{ x:530, z:376, w:190, d:96, h:120 }, kink:{ box:[664, 0, 376, 90, 24, 96] }, hoseEnd:{ x:660, z:600, w:180, d:70 }, toGarden:{ x:880, z:190, w:150, d:12, h:190 } } },
    shed:{ room:ROOM.shed, deco(){ stackBox(60, 500, '#c9a468'); bookcase({ x:640, z:6, w:190, d:60, h:130, c:'#8f6a42' }); cyl(120, 0, 60, 26, 60, '#6f7f8c', { top:30 }); }, at:{
      rack:{ wall:'L', a:190, y:40, w:320, h:200 }, log:{ wall:'B', a:210, y:96, w:100, h:130 }, yujin:{ foot:[390, 320] }, spot:{ x:560, z:340, w:300, d:150 }, toTap:{ wall:'B', a:860, y:0, w:124, h:216 } } }
  }
};
for (const c of CASES) for (const p of c.places){
  const lay = LAYOUT[c.id] && LAYOUT[c.id][p.id];
  if (!lay) continue;
  p.layout = lay;
  for (const o of p.objects){ o.at = lay.at[o.id]; if (!o.at) console.warn('배치 없음', c.id, p.id, o.id); }
}

/* 현장 시점: 끌어서 이동, 확대·축소 */
const VW = { x:0, z:0, zoom:1, tx:0, tz:0, tzoom:1, raf:0, onFrame:null };
const CAM_P = new T.Vector3(760, 900, 1420), CAM_T = new T.Vector3(470, 20, 300);
const ZOOM_MIN = .5, ZOOM_MAX = 1.22, FIT = 1.14;
function applyView(cam){
  const off = new T.Vector3(VW.x, 0, VW.z);
  cam.position.copy(CAM_P).sub(CAM_T).multiplyScalar(FIT * VW.zoom).add(CAM_T).add(off).add(off.clone().multiplyScalar(.35));
  cam.lookAt(CAM_T.clone().add(off)); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
}
function makeCamera(){ const c = new T.PerspectiveCamera(28, VIEW.W / VIEW.H, 10, 6000); applyView(c); return c; }
function clampView(){
  VW.tzoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, VW.tzoom));
  const t = Math.max(0, (1.05 - VW.tzoom) / .55), mx = 170 + 400 * t, mz = 130 + 290 * t;
  VW.tx = Math.min(mx, Math.max(-mx, VW.tx)); VW.tz = Math.min(mz, Math.max(-mz, VW.tz));
}
function stepView(){
  VW.raf = 0;
  const k = .32; let far = false;
  ['x','z','zoom'].forEach(a => { const ta = 't' + a, d = VW[ta] - VW[a]; if (Math.abs(d) > (a === 'zoom' ? .002 : .4)){ VW[a] += d * k; far = true; } else VW[a] = VW[ta]; });
  renderLive();
  if (far) VW.raf = requestAnimationFrame(stepView);
}
function kickView(){ clampView(); if (!VW.raf) VW.raf = requestAnimationFrame(stepView); }
function setPan(x, z){ VW.tx = x; VW.tz = z; kickView(); }
function setZoom(z){ VW.tzoom = z; kickView(); }
function resetView(){ VW.tx = VW.tz = 0; VW.tzoom = 1; kickView(); }
/* 지금 시점으로 다시 그리고 인물·조사 영역을 맞춥니다 */
function renderLive(){
  const canvas = document.getElementById('sceneCanvas'); if (!canvas || !SCENE.scene) return;
  const g = glRenderer();
  applyView(SCENE.camera);
  if (g.domElement.width !== VIEW.W || g.domElement.height !== VIEW.H) g.setSize(VIEW.W, VIEW.H, false);
  if (SCENE.dirty){ g.shadowMap.needsUpdate = true; SCENE.dirty = false; }
  g.render(SCENE.scene, SCENE.camera);
  canvas.getContext('2d').drawImage(g.domElement, 0, 0, VIEW.W, VIEW.H);
  if (VW.onFrame) VW.onFrame();
}
function mountScene(c, p){
  VW.x = VW.z = VW.tx = VW.tz = 0; VW.zoom = VW.tzoom = 1;
  buildPlace(c, p); applyView(SCENE.camera);
}
function hotLayerHTML(c, p){
  const hots = p.objects.map(ob => { const h = hotPath(ob, c.people); return h ? `<path class="hot ${ob.exit ? 'exit' : ''}" data-act="inspect" data-id="${ob.id}" d="${h.d}"><title>${esc(ob.name)}</title></path>` : ''; }).join('');
  return `<svg class="hot-layer" viewBox="0 0 ${VIEW.W} ${VIEW.H}">${hots}</svg>`;
}
function updateOverlays(c, p){
  for (const ob of p.objects){
    const el = document.querySelector(`.hot[data-id="${ob.id}"]`), h = el && hotPath(ob, c.people);
    if (h) el.setAttribute('d', h.d);
    if (ob.person){ const sp = document.querySelector(`.sprite[data-foot="${ob.id}"]`); if (sp){ const s = spriteBox(ob, c.people); sp.style.cssText = `left:${s.x}px; top:${s.y}px; width:${s.w}px; height:${s.h}px`; } }
  }
}

/* ───────── 장면 만들기·그리기 ───────── */
const SCENE = { key:null, scene:null, camera:null, disposeList:[] };
const SHOTS = new Map();

function lights(sc, o = {}){
  sc.add(new T.HemisphereLight(0xffffff, 0xe0c8a0, o.hemi || 1.75));
  const s = new T.DirectionalLight(0xfff0d6, o.sun || 2.3);
  s.position.set(620, 1000, 760); s.target.position.set(430, 0, 300);
  s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.radius = 7; s.shadow.bias = -.0005; s.shadow.normalBias = 1.5;
  Object.assign(s.shadow.camera, { left:-1200, right:1200, top:1000, bottom:-1000, near:100, far:2600 });
  sc.add(s); sc.add(s.target);
}
function disposeScene(){
  if (!SCENE.scene) return;
  SCENE.scene.traverse(o => { if (o.isLight && o.dispose) o.dispose(); if (o.geometry) o.geometry.dispose(); if (o.material){ [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
  SCENE.scene = null; SCENE.key = null;
}
function normL(a){ return Object.assign({ y:0 }, a); }
/* 벽 그림이 벽에서 떨어진 위치(울타리 앞 게시판 등)는 t 값만큼 앞으로 옮깁니다 */
function buildPlace(c, p){
  const key = c.id + '_' + p.id;
  if (SCENE.key === key) return SCENE;
  disposeScene();
  const sc = new T.Scene(); sc.background = new T.Color(p.layout.room.wall ? mix(p.layout.room.wall, '#2a160a', .22) : '#2d2329');
  root = new T.Group(); sc.add(root); cur = root;
  lights(sc, p.layout.room.outdoor ? { hemi:2, sun:2.4 } : {});
  shell(p.layout.room);
  if (p.layout.deco) p.layout.deco();
  const groups = {};
  for (const ob of p.objects){
    const L = normL(ob.at);
    if (ob.person || L.foot || L.box || L.sphere || L.hotOnly || !ob.art || !A[ob.art]) continue;
    const g = new T.Group(); root.add(g); cur = g;
    A[ob.art](L, ob.o || {});
    if (L.t) g.position.z += L.t;
    cur = root; groups[ob.id] = g;
  }
  sc.updateMatrixWorld(true);
  Object.assign(SCENE, { key, scene:sc, camera:makeCamera(), groups, boxes:{}, dirty:true });
  p.objects.forEach(ob => { if (!ob.person) SCENE.boxes[ob.id] = objBox(ob); });
  return SCENE;
}
function project(v, cam){ const p = v.clone().project(cam); return [(p.x + 1) / 2 * VIEW.W, (1 - p.y) / 2 * VIEW.H]; }
function hull(pts){
  const s = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const half = list => { const h = []; for (const p of list){ while (h.length >= 2 && cross(h[h.length-2], h[h.length-1], p) <= 0) h.pop(); h.push(p); } h.pop(); return h; };
  return half(s).concat(half(s.slice().reverse()));
}
function corners(b){ const r = []; [b.min.x, b.max.x].forEach(x => [b.min.y, b.max.y].forEach(y => [b.min.z, b.max.z].forEach(z => r.push(new T.Vector3(x, y, z))))); return r; }
function wallBox(L){
  return L.wall === 'B' ? new T.Box3(new T.Vector3(L.a, L.y, 0), new T.Vector3(L.a + L.w, L.y + L.h, 8)) : new T.Box3(new T.Vector3(0, L.y, L.a), new T.Vector3(8, L.y + L.h, L.a + L.w));
}
function objBox(ob){
  const L = normL(ob.at);
  if (L.box) return new T.Box3(new T.Vector3(L.box[0], L.box[1], L.box[2]), new T.Vector3(L.box[0] + L.box[3], L.box[1] + L.box[4], L.box[2] + L.box[5]));
  if (L.hotOnly) return wallBox(L);
  if (L.sphere){ const [x, y, z, r] = L.sphere; return new T.Box3(new T.Vector3(x - r, y - r, z - r), new T.Vector3(x + r, y + r, z + r)); }
  const g = SCENE.groups[ob.id];
  return g ? new T.Box3().setFromObject(g) : null;
}
/* 인물 크기와 조사 영역 */
function spriteBox(ob, people){
  const adult = LOOKS[people[ob.person].look].adult, cam = SCENE.camera, [x, z] = ob.at.foot;
  const f = project(new T.Vector3(x, 0, z), cam), t = project(new T.Vector3(x, adult ? 205 : 172, z), cam), h = f[1] - t[1], w = h * .72;
  return { x:f[0] - w/2, y:t[1], w, h };
}
function hotPath(ob, people){
  if (ob.person){ const s = spriteBox(ob, people), r = s.w * .3; return { d:`M${s.x+r},${s.y} H${s.x+s.w-r} Q${s.x+s.w},${s.y} ${s.x+s.w},${s.y+r} V${s.y+s.h-r} Q${s.x+s.w},${s.y+s.h} ${s.x+s.w-r},${s.y+s.h} H${s.x+r} Q${s.x},${s.y+s.h} ${s.x},${s.y+s.h-r} V${s.y+r} Q${s.x},${s.y} ${s.x+r},${s.y} Z` }; }
  const b = SCENE.boxes[ob.id]; if (!b) return null;
  const h = hull(corners(b).map(v => project(v, SCENE.camera)));
  return { d:'M' + h.map(p => p.map(f2).join(',')).join(' L') + ' Z' };
}
function shot(key, w, h, cam, q = .93){
  const g = glRenderer();
  g.setSize(w, h, false); g.shadowMap.needsUpdate = true; g.render(SCENE.scene, cam);
  const url = g.domElement.toDataURL('image/jpeg', q);
  SHOTS.set(key, url);
  return url;
}
/* 단서 확대: 카메라를 물건 앞으로 옮겨 다시 찍습니다 */
function zoomView(c, p, ob){
  const key = `${c.id}_${p.id}_${ob.id}_zoom`;
  if (SHOTS.has(key)) return SHOTS.get(key);
  buildPlace(c, p);
  const b = SCENE.boxes[ob.id], center = b.getCenter(new T.Vector3()), size = Math.max(b.getSize(new T.Vector3()).length(), 130);
  const cam = new T.PerspectiveCamera(28, 1, 10, 6000), dir = SCENE.camera.position.clone().sub(center).normalize();
  cam.position.copy(center).add(dir.multiplyScalar(size * 2.1)); cam.lookAt(center); cam.updateMatrixWorld();
  return shot(key, 560, 560, cam);
}

/* 메인 화면: 3D 학교 */
function heroView(){
  if (SHOTS.has('hero')) return SHOTS.get('hero');
  disposeScene();
  const sc = new T.Scene(); sc.background = new T.Color('#9ed7f0');
  root = new T.Group(); sc.add(root); cur = root;
  lights(sc, { hemi:2, sun:2.5 });
  const g = new T.Mesh(new T.PlaneGeometry(3400, 3000), new T.MeshStandardMaterial({ map:patTex(FLOORS.grass('#8fd05f', '#79bd4c'), 128, 26, 24), roughness:.95 }));
  g.rotation.x = -Math.PI/2; g.position.set(500, 0, 600); g.receiveShadow = true; cur.add(g);
  cur.parent.updateMatrixWorld();
  outdoorHero();
  sc.updateMatrixWorld(true);
  SCENE.scene = sc; SCENE.key = 'hero';
  const cam = new T.PerspectiveCamera(30, 16/9, 10, 8000);
  cam.position.set(560, 500, 2300); cam.lookAt(500, 78, 100); cam.updateMatrixWorld();
  return shot('hero', 1600, 900, cam, .94);
}
function outdoorHero(){
  // 하늘과 언덕
  const sky = decal('z', -1400, 0, -520, 3900, 1500, (g, W, H) => { const c = g.createLinearGradient(0, 0, 0, H); c.addColorStop(0, '#62baea'); c.addColorStop(.8, '#d7f2f5'); g.fillStyle = c; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; [[.3,.45,150],[.4,.5,110],[.66,.42,140],[.76,.5,100]].forEach(([a,b,r]) => { g.beginPath(); g.ellipse(W*a, H*b, r, r*.34, 0, 0, 7); g.fill(); }); g.fillStyle = '#7cc463'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H*.9); g.quadraticCurveTo(W*.3, H*.74, W*.55, H*.9); g.quadraticCurveTo(W*.8, H*.98, W, H*.84); g.lineTo(W, H); g.fill(); }, { px:.5 });
  sky.material = new T.MeshBasicMaterial({ map:sky.material.map });
  // 학교 본관
  const wall = '#fff0cf', roof = '#d9593f', trim = '#e9b56a', glass = '#8fd3ec';
  rbox(-130, 0, -60, 1260, 214, 170, wall, 5);
  box(-150, 214, -80, 1300, 18, 210, roof);
  const win = (x, y) => { box(x - 4, y - 4, 109, 60, 58, 3, '#fff'); box(x, y, 111, 52, 50, 2, glass, { roughness:.2 }); box(x + 24, y, 112, 4, 50, 2, '#fff'); };
  for (let r = 0; r < 2; r++) for (let c = 0; c < 12; c++){ if (c === 5 || c === 6) continue; win(-100 + c * 102, 34 + r * 90); }
  // 가운데 현관과 시계탑
  rbox(370, 0, 90, 260, 130, 90, trim, 4); box(356, 130, 80, 288, 14, 118, roof);
  box(460, 0, 178, 80, 104, 4, '#7c4f2c'); box(497, 0, 182, 6, 104, 2, '#5a3820');
  decal('z', 410, 106, 180.5, 180, 21, (g, W, H) => { rr(g, 0, 0, W, H, 4, '#fff6df'); tx(g, '우리 초등학교', W/2, H/2 + 1, 18, '#3b2a1f'); });
  rbox(430, 214, 10, 140, 180, 110, wall, 4);
  const top = new T.Mesh(new T.ConeGeometry(112, 96, 4), mat(roof)); top.rotation.y = Math.PI/4; top.position.set(500, 442, 65); top.castShadow = true; cur.add(top);
  const cl = cyl(500, 0, 122, 48, 8, '#d9593f'); cl.rotation.x = Math.PI/2; cl.position.y = 320;
  decal('z', 456, 276, 127, 88, 88, (g, W) => { g.fillStyle = '#fff9ea'; g.beginPath(); g.arc(W/2, W/2, W/2, 0, 7); g.fill(); g.strokeStyle = '#3b2a1f'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(W/2, W/2); g.lineTo(W/2, W*.2); g.moveTo(W/2, W/2); g.lineTo(W*.72, W*.58); g.stroke(); }, { alpha:true });
  cyl(500, 488, 65, 3, 74, '#c0c9cf'); box(503, 534, 64, 58, 28, 2, '#ef7f3a');
  // 운동장과 나무
  const track = decal('y', 40, 1, 300, 920, 480, (g, W, H) => { g.fillStyle = '#d8a56b'; g.beginPath(); g.roundRect(0, 0, W, H, H/2); g.fill(); g.strokeStyle = '#fff4dc'; g.lineWidth = 6; g.beginPath(); g.roundRect(46, 46, W - 92, H - 92, (H - 92)/2); g.stroke(); g.beginPath(); g.moveTo(W/2, 46); g.lineTo(W/2, H - 46); g.stroke(); g.beginPath(); g.arc(W/2, H/2, 62, 0, 7); g.stroke(); }, { alpha:true, px:1 });
  track.renderOrder = 1;
  [[-240,200],[-290,520],[1230,210],[1280,520],[-120,130],[1130,140]].forEach(([x, z], i) => tree(x, z, 1 + (i % 3) * .14));
  [[120,180],[300,190],[700,190],[880,180]].forEach(([x, z]) => { rbox(x - 56, 0, z - 20, 112, 18, 40, '#b5763d', 2); [-34,0,34].forEach((a, i) => ball(x + a, 28, z, 15, ['#f28fb0','#f7c94b','#ef7f3a'][i])); });
  // 축구 골대
  [[60, 480],[880, 480]].forEach(([x, z]) => { box(x, 0, z, 6, 72, 6, '#fff'); box(x, 0, z + 120, 6, 72, 6, '#fff'); box(x, 72, z, 6, 6, 126, '#fff'); });
}
