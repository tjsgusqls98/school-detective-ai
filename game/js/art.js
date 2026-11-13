/* 공통 도우미 */
const INK = '#3b2a1f';
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function mix(c1, c2, t){
  const hex = c => c.length === 4 ? '#' + c[1]+c[1]+c[2]+c[2]+c[3]+c[3] : c;
  const a = parseInt(hex(c1).slice(1), 16), b = parseInt(hex(c2).slice(1), 16);
  const ch = sh => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t);
  return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
}
const f2 = n => Math.round(n * 10) / 10;/* 숫자 뒤 조사: 단서 2를, 단서 1을 */
const nj = (n, j) => ([2, 4, 5, 9].includes(n % 10) ? { 과:'와', 은:'는', 을:'를' }[j] : j);
