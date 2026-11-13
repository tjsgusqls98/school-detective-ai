/* 기본 인물: 장난감처럼 둥근 3D 인물을 그려 투명 이미지로 씁니다.
   assets/characters 폴더에 같은 이름의 그림을 넣으면 그 그림이 우선합니다. */

const TOY = new Map();

/* 두 점을 잇는 둥근 팔다리 */
function limb3(a, b, r, c, r2 = r){
  const A = new T.Vector3(...a), B = new T.Vector3(...b), len = A.distanceTo(B);
  const m = add(new T.Mesh(new T.CylinderGeometry(r2, r, len, 24), mat(c)), false);
  m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  const s = add(new T.Mesh(new T.SphereGeometry(r, 24, 16), mat(c)), false); s.position.copy(A);
  return m;
}
function blob(x, y, z, sx, sy, sz, c, o){
  const m = add(new T.Mesh(new T.SphereGeometry(1, 48, 32), c.isMaterial ? c : mat(c, o)), false);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  return m;
}
/* 옷 앞면 무늬 (가운데가 앞쪽) */
function shirtPaint(k){
  return (g, W, H) => {
    const cx = W / 2, tt = k.topType;
    g.fillStyle = tt === 'vest' ? k.shirt : tt === 'coat' ? '#f8f5ee' : k.top; g.fillRect(0, 0, W, H);
    if (tt === 'cardigan' || tt === 'apron'){
      g.fillStyle = k.shirt; g.beginPath(); g.moveTo(cx - 13, 0); g.lineTo(cx, 30); g.lineTo(cx + 13, 0); g.fill();
      if (tt === 'cardigan'){
        g.fillStyle = mix(k.top, '#2a160a', .25); g.fillRect(cx - .8, 30, 1.6, H);
        g.fillStyle = '#fff0cc'; for (let y = 42; y < H - 8; y += 15){ g.beginPath(); g.arc(cx + 5, y, 2.5, 0, 7); g.fill(); }
      } else {
        g.fillStyle = k.apron; g.beginPath(); g.roundRect(cx - 25, 26, 50, H, 6); g.fill();
        g.fillStyle = mix(k.apron, '#2a160a', .18); g.beginPath(); g.roundRect(cx - 13, H * .68, 26, 15, 4); g.fill();
      }
    } else if (tt === 'track'){
      g.fillStyle = '#f7f1e4'; g.fillRect(cx - 1.5, 0, 3, H);
      g.fillRect(cx - 44, 0, 6, H); g.fillRect(cx + 38, 0, 6, H);
    } else if (tt === 'vest'){
      g.fillStyle = k.top; g.beginPath(); g.roundRect(cx - 56, -4, 47, H + 8, 6); g.roundRect(cx + 9, -4, 47, H + 8, 6); g.fill();
      g.fillStyle = '#f7d65c'; g.fillRect(cx - 56, H * .5, 47, 9); g.fillRect(cx + 9, H * .5, 47, 9);
    } else if (tt === 'coat'){
      g.fillStyle = k.shirt; g.beginPath(); g.moveTo(cx - 13, 0); g.lineTo(cx, 28); g.lineTo(cx + 13, 0); g.fill();
      g.fillStyle = '#d0675a'; g.beginPath(); g.roundRect(cx - 3, 4, 6, 26, 2); g.fill();
      g.fillStyle = '#ddd8cc'; g.fillRect(cx - .8, 30, 1.6, H);
      g.strokeStyle = '#ddd8cc'; g.lineWidth = 1.6; g.beginPath(); g.roundRect(cx + 14, 44, 20, 18, 3); g.stroke();
    }
  };
}
/* 앞머리 선: t(0=왼쪽, 1=오른쪽) → 세로 위치 */
function hairEdge(hs){
  const q = t => (2 * t - 1) * (2 * t - 1);
  return {
    short:t => .425 + .03 * Math.abs(Math.sin(t * Math.PI * 4.5)) + .035 * q(t),
    part:t => .375 + .1 * Math.pow(t, 1.3) + .018 * Math.abs(Math.sin(t * Math.PI * 3.5)),
    bob:t => .43 + .024 * Math.abs(Math.sin(t * Math.PI * 5.5)) + .025 * q(t),
    long:t => .35 + .115 * Math.pow(Math.abs(2 * t - 1), 1.25),
    pony:t => .46 - .08 * Math.pow(t, 1.2) + .02 * Math.abs(Math.sin(t * Math.PI * 4)),
    bun:t => .35 + .07 * q(t)
  }[hs] || (t => .44);
}
const faceSpan = W => W * .205;
function edgePath(g, W, H, edge, off = 0){
  const cx = W / 2, L = cx - faceSpan(W), R = cx + faceSpan(W);
  g.beginPath(); g.moveTo(L, H);
  for (let i = 0; i <= 80; i++){ const t = i / 80; g.lineTo(L + (R - L) * t, H * (edge(t) + off)); }
  g.lineTo(R, H); g.closePath();
}
/* 머리카락: 얼굴 자리를 도려낸 매끈한 껍질 (거친 덩어리 없이) */
function hairPaint(k){
  return (g, W, H) => {
    const cx = W / 2, c = k.hair, edge = hairEdge(k.hs);
    const band = g.createLinearGradient(0, 0, 0, H * .6);
    band.addColorStop(0, c); band.addColorStop(.4, mix(c, '#ffe9c8', .2)); band.addColorStop(.62, c); band.addColorStop(1, mix(c, '#2a160a', .2));
    g.fillStyle = band; g.fillRect(0, 0, W, H);
    g.strokeStyle = mix(c, '#2a160a', .32); g.globalAlpha = .28; g.lineWidth = 1;
    for (let x = 0; x < W; x += 13){ g.beginPath(); g.moveTo(cx + (x - cx) * .2, 0); g.quadraticCurveTo(x, H * .2, x, H * .62); g.stroke(); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.filter = 'blur(2.5px)';
    edgePath(g, W, H, edge); g.fill();
    const low = k.hs === 'bob' || k.hs === 'long';
    if (!low){ g.fillRect(cx - W * .3, H * .6, W * .6, H); [-1, 1].forEach(d => { g.beginPath(); g.arc(cx + d * W * .25, H * .535, 17, 0, 7); g.fill(); }); }
    g.fillRect(0, H * (low ? .72 : .67), W, H);
    g.filter = 'none'; g.globalCompositeOperation = 'source-over';
  };
}
/* 얼굴: 동글동글한 눈, 작은 입, 은은한 볼 */
function facePaint(k){
  return (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const cx = W / 2, ey = H * .55, dx = W * .07, A_ = !!k.adult;
    if (!k.hat || k.hat === 'cap'){ const e = hairEdge(k.hs), L = cx - faceSpan(W), R = cx + faceSpan(W); g.filter = 'blur(3px)'; g.strokeStyle = 'rgba(130,70,40,.3)'; g.lineWidth = 9; g.beginPath(); for (let i = 0; i <= 60; i++){ const t = i / 60; g.lineTo(L + (R - L) * t, H * (e(t) + .018)); } g.stroke(); g.filter = 'none'; }
    [-1, 1].forEach(d => { const x = cx + d * dx * 1.55, y = H * .645, c = g.createRadialGradient(x, y, 1, x, y, 19); c.addColorStop(0, 'rgba(245,130,120,.62)'); c.addColorStop(1, 'rgba(245,130,120,0)'); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 19, 13, 0, 0, 7); g.fill(); });
    [-1, 1].forEach(d => {
      const x = cx + d * dx;
      g.fillStyle = '#33221b'; g.beginPath(); g.ellipse(x, ey, A_ ? 10 : 12.5, A_ ? 12 : 15.5, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 3.6, ey - 5.6, A_ ? 3.4 : 4.4, 0, 7); g.fill();
      g.globalAlpha = .75; g.beginPath(); g.arc(x + 3.8, ey + 5, 1.9, 0, 7); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = mix(k.hair, '#2a160a', .1); g.lineWidth = 3.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 9, ey - 22); g.quadraticCurveTo(x, ey - 26, x + 9, ey - 22); g.stroke();
    });
    g.strokeStyle = '#a9584a'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 9.5, H * .67); g.quadraticCurveTo(cx, H * .71, cx + 9.5, H * .67); g.stroke();
  };
}
function buildToy(k){
  const A_ = !!k.adult, c = k.skin, stretch = A_ ? 34 : 0, hs = A_ ? .86 : 1;
  const waist = 50 + stretch, chest = waist + 56 + (A_ ? 14 : 0), headY = chest + 62 * hs;
  const legX = 15, sleeve = k.topType === 'vest' ? k.shirt : k.topType === 'coat' ? '#f8f5ee' : k.top;
  /* 다리·신발 */
  [-1, 1].forEach(d => {
    const x = d * legX, leg = k.skirt ? c : k.bottom;
    limb3([x, waist + 4, 0], [x, 14, 0], k.skirt ? 9 : 12.5, leg, k.skirt ? 10 : 13.5);
    if (k.skirt && !A_) limb3([x, 30, 0], [x, 14, 0], 10, '#fbf6ea', 10.4);
    blob(x + d * 2, 10, 6, 14.5, 10.5, 20, k.shoes, { roughness:.6 });
  });
  /* 치마 */
  if (k.skirt){
    const h = A_ ? 76 : 36;
    const pts = [[52, 0], [50, h * .2], [42, h * .7], [33, h]].map(([r, y]) => new T.Vector2(A_ ? r * .96 : r, y));
    const tex = canvasTex(160, 40, (g, W, H) => { g.fillStyle = k.bottom; g.fillRect(0, 0, W, H); g.fillStyle = mix(k.bottom, '#2a160a', .2); for (let x = 0; x < W; x += 13) g.fillRect(x, 0, 1.6, H); }, { px:3 });
    const m = add(new T.Mesh(new T.LatheGeometry(new T.SplineCurve(pts).getPoints(16), 48), new T.MeshStandardMaterial({ map:tex, roughness:.85, side:T.DoubleSide })), false);
    m.position.y = waist + 8 - h; m.scale.z = .82;
  }
  /* 몸통: 끊김 없이 매끈한 곡면 */
  const span = chest - waist + 10, ps = [[41, 0], [40.5, span * .22], [36.5, span * .58], [30, span * .84], [19, span * .98], [9, span * 1.03]].map(([r, y]) => new T.Vector2(r, y));
  const tex = canvasTex(200, 90, shirtPaint(k), { px:3 });
  const body = add(new T.Mesh(new T.LatheGeometry(new T.SplineCurve(ps).getPoints(28), 56, Math.PI), new T.MeshStandardMaterial({ map:tex, roughness:.8, side:T.DoubleSide })), false);
  body.position.y = waist - 6; body.scale.z = .8;
  if (!k.skirt) blob(0, waist - 2, 0, 33, 13, 26, k.bottom);
  if (k.topType === 'coat'){ const pc = [[46, 0], [44, 34], [39, 72]].map(([r, y]) => new T.Vector2(r, y)); const m = add(new T.Mesh(new T.LatheGeometry(new T.SplineCurve(pc).getPoints(12), 48), mat('#f8f5ee', { side:T.DoubleSide })), false); m.position.y = waist - 62; m.scale.z = .8; }
  /* 팔과 동그란 손 */
  const hand = k.gloves ? '#86a55f' : c, pose = k.pose || 'stand', sh = chest - 7;
  const arm = (d, elbow, wrist) => { limb3([d * 27, sh, 0], elbow, 11.5, sleeve, 12.5); limb3(elbow, wrist, 10.5, sleeve, 11.5); blob(wrist[0], wrist[1], wrist[2], 12.5, 12.5, 12.5, hand); };
  [-1, 1].forEach(d => {
    if (pose === 'clasp') arm(d, [d * 41, sh - 26, 12], [d * 7, waist + 14, 34]);
    else if (pose === 'hip' && d < 0) arm(d, [d * 59, sh - 22, 0], [d * 36, waist + 12, 14]);
    else if (pose === 'chin' && d > 0) arm(d, [d * 47, sh - 26, 22], [d * 26, sh + 13, 50]);
    else arm(d, [d * 41, sh - 20, 2], [d * 52, sh - 44, 8]);
  });
  /* 머리: 살짝 기울여 뻣뻣하지 않게 */
  const head = new T.Group(); head.position.y = headY; head.scale.setScalar(hs);
  const lean = (k.hair.charCodeAt(3) + k.skin.charCodeAt(4)) % 3 - 1;
  head.rotation.set(.03, lean * .05, lean * .035);
  root.add(head); cur = head;
  blob(0, 0, 0, 64, 59, 59, c, { roughness:.55 });
  [-1, 1].forEach(d => blob(d * 64, -4, 0, 9.5, 13, 8, c, { roughness:.55 }));
  blob(0, -9, 57.5, 5.2, 4.2, 3, mix(c, '#d98a68', .22), { roughness:.5 });
  const face = add(new T.Mesh(new T.SphereGeometry(1, 64, 40), new T.MeshStandardMaterial({ map:canvasTex(512, 256, facePaint(k), { px:2 }), transparent:true, depthWrite:false, roughness:.6 })), false);
  face.scale.set(64.5, 59.5, 59.5); face.rotation.y = -Math.PI / 2;
  /* 머리카락 */
  const hm = () => mat(k.hair, { roughness:.5 });
  const hairMat = new T.MeshStandardMaterial({ map:canvasTex(512, 256, hairPaint(k), { px:3 }), alphaTest:.5, roughness:.5 });
  const shell = add(new T.Mesh(new T.SphereGeometry(1, 64, 40), hairMat), false);
  shell.scale.set(68.5, 65, 64.5); shell.position.y = 2.5; shell.rotation.y = -Math.PI / 2;
  if (k.hs === 'bob') blob(0, -16, -10, 73, 52, 53, hm());
  if (k.hs === 'long') blob(0, -48, -24, 71, 100, 37, hm());
  if (k.hs === 'pony'){ blob(0, 26, -62, 13, 13, 12, '#ef8a6f'); blob(0, -18, -76, 21, 50, 19, hm()); }
  if (k.hs === 'bun') blob(0, 76, -12, 26, 24, 26, hm());
  /* 모자·안경 */
  if (k.hat === 'cap'){ const m = add(new T.Mesh(new T.SphereGeometry(1, 48, 24, 0, 7, 0, 1.5), mat('#6d8a64')), false); m.scale.set(70, 58, 67); m.position.y = 16; blob(0, 22, 60, 44, 5.5, 32, '#5a7554'); blob(0, 54, 45, 8, 8, 3.5, '#f7cf55'); }
  if (k.hat === 'straw' || k.hat === 'sun'){ const col = k.hat === 'straw' ? '#f4d68c' : '#ddcfa6', bd = k.hat === 'straw' ? '#e0705f' : '#7d9a64'; blob(0, 36, 0, 104, 7, 102, col, { roughness:.75 }); const m = add(new T.Mesh(new T.SphereGeometry(1, 48, 24, 0, 7, 0, 1.57), mat(col, { roughness:.75 })), false); m.scale.set(69, 50, 67); m.position.y = 38; const b = add(new T.Mesh(new T.CylinderGeometry(69.6, 70, 12, 48), mat(bd)), false); b.position.y = 44; b.scale.z = .97; }
  if (k.glasses) [-1, 1].forEach(d => { const m = add(new T.Mesh(new T.TorusGeometry(15.5, 1.7, 12, 36), mat('#6b4a36')), false); m.position.set(d * 27, -9, 55); m.rotation.y = d * .44; });
  cur = root;
  return { top: headY + (k.hat ? 88 : 72) * hs + (k.hs === 'bun' ? 34 : 0), headY, hs };
}
/* kind: 'full' 전신 / 'head' 얼굴 */
function toyShot(lookKey, kind = 'full'){
  const key = lookKey + '|' + kind;
  if (TOY.has(key)) return TOY.get(key);
  const k = LOOKS[lookKey], sc = new T.Scene(), prevRoot = root, prevCur = cur;
  root = new T.Group(); sc.add(root); cur = root;
  const info = buildToy(k);
  sc.add(new T.HemisphereLight(0xffffff, 0xe8cdb0, 2.2));
  const d = new T.DirectionalLight(0xfff2de, 1.9); d.position.set(-160, 420, 620); sc.add(d);
  sc.updateMatrixWorld(true);
  const W = kind === 'head' ? 256 : 540, H = kind === 'head' ? 256 : 750;
  const span = kind === 'head' ? 176 * info.hs + (k.hat ? 50 : 0) : Math.max(info.top + 18, (k.hat ? 250 : 0));
  const cy = kind === 'head' ? info.headY + 6 : span / 2 - 6, dist = (span / 2) / Math.tan(T.MathUtils.degToRad(9));
  const cam = new T.PerspectiveCamera(18, W / H, 10, 8000); cam.position.set(0, cy + dist * .06, dist); cam.lookAt(0, cy, 0); cam.updateMatrixWorld();
  const g = glRenderer(); g.setClearColor(0x000000, 0); g.setSize(W, H, false); g.render(sc, cam);
  const url = g.domElement.toDataURL('image/png');
  TOY.set(key, url);
  sc.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material){ if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  root = prevRoot; cur = prevCur;
  return url;
}

/* AI 조수 부향이: 부여의 백제금동대향로를 닮은 로봇
   아래부터 용 받침 → 연꽃 몸통(얼굴 화면) → 산봉우리 뚜껑 → 봉황 */
function robotShot(mood = 'normal'){
  const key = 'robot|' + mood;
  if (TOY.has(key)) return TOY.get(key);
  const sc = new T.Scene(), prevRoot = root, prevCur = cur;
  root = new T.Group(); sc.add(root); cur = root;
  const gold = '#e0b04a', deep = '#bf8a33', pale = '#f2d27e', M = { metalness:.28, roughness:.42 };
  /* 용 받침: 똬리와 머리 */
  [[10, 44], [26, 36], [40, 26]].forEach(([y, r], i) => { const m = add(new T.Mesh(new T.TorusGeometry(r, 10 - i, 16, 40), mat(i % 2 ? gold : deep, M)), false); m.rotation.x = Math.PI / 2; m.position.y = y; });
  blob(0, 46, 34, 15, 12, 16, gold, M); blob(0, 42, 48, 9, 6.5, 8, pale, M);
  [-1, 1].forEach(d => { blob(d * 6, 54, 44, 2.6, 2.6, 2, '#33221b'); limb3([d * 7, 56, 30], [d * 15, 72, 24], 2.6, pale); });
  cyl(0, 46, 0, 15, 16, deep, { m:M });
  /* 연꽃 몸통 */
  blob(0, 122, 0, 72, 64, 60, gold, M);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++){
    const a = (i + r * .5) * Math.PI / 6;
    if (r === 1 && Math.cos(a) > .6) continue;
    const R = r ? 60 : 44, y = r ? 92 : 70;
    const p = blob(Math.sin(a) * R, y, Math.cos(a) * R * .84, 15, 21, 6, r ? pale : gold, M);
    p.rotation.set(r ? .42 : .75, a, 0);
  }
  /* 얼굴 화면 */
  rbox(-54, 100, 40, 108, 78, 18, deep, 8, M);
  decal('z', -47, 107, 58.8, 94, 64, (g, W, H) => {
    g.fillStyle = '#1f3d3a'; g.beginPath(); g.roundRect(0, 0, W, H, 16); g.fill();
    g.strokeStyle = g.fillStyle = '#a6f0df'; g.lineWidth = 6; g.lineCap = 'round';
    [W * .3, W * .7].forEach(x => {
      if (mood === 'happy'){ g.beginPath(); g.arc(x, H * .48, 10.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (mood === 'think'){ g.beginPath(); g.moveTo(x - 10, H * .42); g.lineTo(x + 10, H * .42); g.stroke(); g.beginPath(); g.arc(x + 4, H * .52, 3.4, 0, 7); g.fill(); }
      else { g.beginPath(); g.arc(x, H * .42, 10.5, 0, 7); g.fill(); g.fillStyle = '#1f3d3a'; g.beginPath(); g.arc(x + 2, H * .44, 4.8, 0, 7); g.fill(); g.fillStyle = '#a6f0df'; }
    });
    g.lineWidth = 4.5; g.beginPath(); g.arc(W / 2, H * .66, 10, .3, Math.PI - .3); g.stroke();
    g.fillStyle = 'rgba(240,130,115,.7)'; [W * .13, W * .87].forEach(x => { g.beginPath(); g.ellipse(x, H * .68, 7, 4, 0, 0, 7); g.fill(); });
  }, { alpha:true });
  /* 팔과 돋보기 */
  limb3([-66, 128, 0], [-92, 100, 12], 9, deep); blob(-95, 96, 14, 12, 12, 12, pale, M);
  limb3([66, 128, 0], [90, 152, 14], 9, deep); blob(93, 156, 16, 12, 12, 12, pale, M);
  const lens = add(new T.Mesh(new T.TorusGeometry(21, 4, 12, 32), mat('#a8703c')), false); lens.position.set(106, 186, 18);
  const glass = add(new T.Mesh(new T.CircleGeometry(20, 32), mat('#dff3f7', { transparent:true, opacity:.55, roughness:.1 })), false); glass.position.set(106, 186, 18);
  /* 산봉우리 뚜껑 */
  blob(0, 184, 0, 68, 26, 56, deep, M);
  const peak = (x, y, z, r, h, c) => { const m = add(new T.Mesh(new T.ConeGeometry(r, h, 18), mat(c, M)), false); m.position.set(x, y, z); blob(x, y + h * .46, z, r * .3, r * .3, r * .3, pale, M); };
  [[9, 56, 46, 19, 36, gold], [7, 37, 30, 16, 34, pale], [5, 18, 15, 13, 32, gold]].forEach(([n, R, zr, r, h, c], t) => {
    for (let i = 0; i < n; i++){ const a = (i + t * .5) * 2 * Math.PI / n; peak(Math.sin(a) * R, 200 + t * 20, Math.cos(a) * zr, r, h, c); }
  });
  /* 봉황 */
  cyl(0, 252, 0, 9, 12, deep, { m:M });
  blob(0, 276, 0, 18, 15, 15, '#ffcf5c', M);
  limb3([0, 284, 6], [0, 302, 11], 7.5, '#ffcf5c', 5.5); blob(0, 307, 13, 10, 10, 10, '#ffcf5c', M);
  [-1, 1].forEach(d => { blob(d * 5, 310, 20, 2, 2, 1.6, '#33221b'); const w = blob(d * 30, 288, -2, 26, 9, 12, pale, M); w.rotation.z = d * .55; });
  const beak = add(new T.Mesh(new T.ConeGeometry(4, 13, 12), mat('#ef8a3f')), false); beak.position.set(0, 305, 26); beak.rotation.x = Math.PI / 2;
  [-.5, 0, .5].forEach(a => { const t = blob(Math.sin(a) * 22, 288, -22, 8, 28, 4, a ? '#ef8a3f' : '#e0604c', M); t.rotation.set(-.75, 0, -a); });
  sc.add(new T.HemisphereLight(0xffffff, 0xe8cdb0, 2.2));
  const d = new T.DirectionalLight(0xfff2de, 2); d.position.set(-160, 420, 620); sc.add(d);
  sc.updateMatrixWorld(true);
  const W = 400, H = 464, dist = 172 / Math.tan(T.MathUtils.degToRad(9));
  const cam = new T.PerspectiveCamera(18, W / H, 10, 8000); cam.position.set(0, 168, dist); cam.lookAt(0, 160, 0); cam.updateMatrixWorld();
  const g = glRenderer(); g.setClearColor(0x000000, 0); g.setSize(W, H, false); g.render(sc, cam);
  const url = g.domElement.toDataURL('image/png');
  TOY.set(key, url);
  sc.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material){ if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  root = prevRoot; cur = prevCur;
  return url;
}
