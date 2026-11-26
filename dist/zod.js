// 斗罗远程正文 zod.js 1.1.0
// 斗罗ZOD：由 源码/build.py 生成，勿手改。源码见 源码/共用/规则.js、源码/共用/宗门血脉.js、源码/zod/。
import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

/* 斗罗变量 · 共用规则（纯函数，不碰 z、不碰宿主）
 * 构建时原样拼进 ZOD 脚本；测试时用 vm 载入。
 * 数值依据：设计决定.md §4、§5、§9；考据 A、B、C。改规则先改设计决定，再改这里。
 */

// ───────── 小工具 ─────────
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const entriesOf = (o) => (isObj(o) ? Object.entries(o) : []);

const CN_DIGIT = '零一二三四五六七八九';
// 0–9999 的中文数字（够年限、点数显示用）
function cnSmall(n) {
  n = Math.floor(n);
  if (n === 0) return '零';
  const units = [['千', 1000], ['百', 100], ['十', 10]];
  let out = '', zero = false;
  for (const [u, base] of units) {
    const d = Math.floor(n / base) % 10;
    if (d) { if (zero) out += '零'; out += (d === 1 && u === '十' && !out ? '' : CN_DIGIT[d]) + u; zero = false; }
    else if (out) zero = true;
  }
  const last = n % 10;
  if (last) out += (zero ? '零' : '') + CN_DIGIT[last];
  return out;
}
function cnNumber(n) {
  n = Math.round(n);
  if (n < 10000) return cnSmall(n);
  const wan = Math.floor(n / 10000), rest = n % 10000;
  if (wan >= 10000) return cnNumber(Math.floor(wan / 10000)) + '亿' + (wan % 10000 ? cnSmall(wan % 10000) + '万' : '');
  return cnSmall(wan) + '万' + (rest ? (rest < 1000 ? '零' : '') + cnSmall(rest) : '');
}

// “3.2万”“十万年”“32000”“二十万” → 数字；认不出返回 null
const CN_VAL = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function parseCnInt(s) {
  let total = 0, section = 0, num = 0, seen = false;
  for (const ch of s) {
    if (ch in CN_VAL) { num = CN_VAL[ch]; seen = true; }
    else if (ch === '十' || ch === '百' || ch === '千') {
      const m = ch === '十' ? 10 : ch === '百' ? 100 : 1000;
      section += (num || (ch === '十' ? 1 : 0)) * m; num = 0; seen = true;
    } else if (ch === '万' || ch === '亿') {
      const m = ch === '万' ? 1e4 : 1e8;
      total += (section + num) * m; section = 0; num = 0; seen = true;
    } else return null;
  }
  return seen ? total + section + num : null;
}
function parseAmount(v) {
  if (isNum(v)) return v;
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\s,，]/g, '').replace(/(年|级|点|%|％)$/u, '').replace(/^约/u, '');
  if (!s) return null;
  let m = s.match(/^(-?\d+(?:\.\d+)?)(万|亿)?$/u);
  if (m) return Number(m[1]) * (m[2] === '万' ? 1e4 : m[2] === '亿' ? 1e8 : 1);
  m = s.match(/^(-?\d+(?:\.\d+)?)万(\d+)$/u);
  if (m) return Number(m[1]) * 1e4 + Number(m[2]);
  return parseCnInt(s);
}

// ───────── 斗罗历日期 ─────────
// 日期键 = 年×10000 + 月×100 + 日；“前N年”为负年。只用来比先后。
function dateKey(text) {
  if (isNum(text)) return Math.trunc(text);
  if (typeof text !== 'string') return null;
  const s = text.replace(/\s/g, '').replace(/^斗罗历/u, '');
  const m = s.match(/^(前)?(\d{1,9})年(?:(\d{1,2})月(?:(\d{1,2})日)?)?/u);
  if (!m) return null;
  const y = (m[1] ? -1 : 1) * Number(m[2]), mo = m[3] ? Number(m[3]) : 1, d = m[4] ? Number(m[4]) : 1;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return y * 10000 + mo * 100 + d;
}
function splitKey(k) {
  const y = Math.floor(k / 10000), md = k - y * 10000;
  return [y, Math.floor(md / 100), md % 100];
}
const pad2 = (n) => String(n).padStart(2, '0');
function fmtKey(k) {
  const [y, m, d] = splitKey(k);
  return (y < 0 ? '前' + -y : String(y)) + '年' + pad2(m) + '月' + pad2(d) + '日';
}
const fmtDate = (k) => '斗罗历' + fmtKey(k);
const fmtRange = (a, b) => (a === b ? fmtDate(a) : fmtDate(a) + '至' + fmtKey(b));
// 日期键 ↔ 日序（按公历大小月、闰年算，只用来数天数：气运死劫倒计时、开局后 N 天的期限）
function dayNo(k) {
  const [y0, m, d] = splitKey(k);
  const y = y0 - (m <= 2 ? 1 : 0), era = Math.floor(y / 400), yoe = y - era * 400;
  const doy = Math.floor((153 * ((m + 9) % 12) + 2) / 5) + d - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
}
function keyOfDay(n) {
  const era = Math.floor(n / 146097), doe = n - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1, m = mp < 10 ? mp + 3 : mp - 9;
  return (yoe + era * 400 + (m <= 2 ? 1 : 0)) * 10000 + m * 100 + d;
}
const addDays = (k, n) => keyOfDay(dayNo(k) + n);

const PARTS = Object.freeze(['斗1', '斗2', '神界', '英雄', '斗3', '斗4']);
const PART_START = Object.freeze({ 斗1: 26310101, 斗2: 126310101, 神界: 224450101, 英雄: 226461001, 斗3: 226310101, 斗4: 326310101 });
const NEXT_PART = Object.freeze({ 斗1: '斗2', 斗2: '神界', 神界: '斗3', 英雄: '斗4', 斗3: '斗4', 斗4: null });
// 日历默认部（凡间主线）：斗1 部起点之前也算斗1（前史）；与斗3同期的神界支线《唐门英雄传》由 wantsHeroTrack 粘性识别
function partOf(key) {
  if (!isNum(key)) return null;
  if (key >= PART_START.斗4) return '斗4';
  if (key >= PART_START.斗3) return '斗3';
  if (key >= PART_START.神界) return '神界';
  if (key >= PART_START.斗2) return '斗2';
  return '斗1';
}
const partNo = (p) => PARTS.indexOf(p);

/** 一部正篇的最后结束日（幕索引里没有这一部时为 null） */
function partEnd(index, part) {
  const b = ((index && index.部) || []).find((x) => x.名 === part);
  return b && b.正篇.length ? Math.max(...b.正篇.map((a) => a[2])) : null;
}
function explicitHeroTrack(index, hint) {
  if (!hint) return false;
  if (hint === '英雄') return true;
  if (!isObj(hint)) return false;
  if (hint.当前部 === '英雄') return true;
  if (typeof hint.幕 === 'string' && hint.幕) {
    const hb = ((index && index.部) || []).find((b) => b.名 === '英雄');
    if (hb) {
      if (hb.前史篇 && hint.幕.startsWith(hb.前史篇)) return true;
      if (hb.前史.some((a) => a[0] === hint.幕) || hb.正篇.some((a) => a[0] === hint.幕)) return true;
    }
  }
  return false;
}
function wantsHeroTrack(index, hint) {
  if (explicitHeroTrack(index, hint)) return true;
  return isObj(hint) && hint.当前部 === '神界' && hint.时层 === '神界';
}
function inHeroSpan(index, key, explicit) {
  const yxEnd = partEnd(index, '英雄');
  if (yxEnd == null) return false;
  if (explicit) return key <= yxEnd;
  const sjEnd = partEnd(index, '神界');
  const lo = sjEnd != null ? sjEnd : PART_START.神界;
  return key > lo && key <= yxEnd;
}
/** 剧情归哪一部管（= 当前部）：先按部起点落到日历上的部；过了这一部正篇的结尾，就归下一部（下一部的前史）。
 *  若明确在《唐门英雄传》支线（或从神界传说在神界时层延续下来），在英雄传尾声前都保持为“英雄”，之后并入“斗4”。 */
function contentPart(index, key, hint) {
  if (!isNum(key)) return null;
  if (wantsHeroTrack(index, hint) && inHeroSpan(index, key, explicitHeroTrack(index, hint))) return '英雄';
  const p = partOf(key);
  if (!p) return null;
  const end = partEnd(index, p);
  const next = NEXT_PART[p];
  return end != null && key > end && next ? next : p;
}

// ───────── 原作指导：按外界日期定位当前幕 ─────────
// 索引格式（build.py 生成）：{ 部: [{ 名, 前史篇, 前史: [[幕名, 起, 止, 事]], 正篇: [[幕名, 起, 止, 事]] }] }
// 事 = [[事件号, 起, 止, 标题]]
const EMPTY_LOC = Object.freeze({ 来源: '无', 篇: null, 幕: null, 下一幕: null, 指导名: null, 事件: [] });
const actPian = (name) => (name ? String(name).split('·')[0] : null);

function pickPrehistory(book, key) {
  const all = [];
  book.前史.forEach((act, i) => act[3].forEach(([no, a, b, title]) => all.push({ id: `第${i + 1}幕事件${no}`, a, b, title })));
  all.sort((x, y) => x.a - y.a || x.b - y.b);
  const ongoing = all.filter((e) => e.a <= key && key <= e.b);
  const past = all.filter((e) => e.b < key).sort((x, y) => x.b - y.b).slice(-2);
  const next = all.filter((e) => e.a > key).slice(0, Math.max(3, 6 - ongoing.length));
  const picked = [...past, ...ongoing.slice(-4), ...next];
  const seen = new Set();
  return picked.filter((e) => !seen.has(e.id) && seen.add(e.id)).sort((x, y) => x.a - y.a).map((e) => [e.id, e.a, e.b, e.title]);
}
function prehistoryLoc(book, key) {
  const first = book.正篇[0];
  return {
    来源: '前史篇', 篇: book.前史篇, 幕: null, 下一幕: first ? first[0] : null,
    指导名: book.前史篇 + '（按日期取）', 事件: pickPrehistory(book, key),
  };
}

/**
 * @param index  幕索引
 * @param key    外界日期键
 * @param prev   { 幕: 上一次的指导名, 事件: {id: {状态}} }，用于同一天开始的几幕依次推进
 * @param hint   可选：当前部名或 { 当前部, 幕, 时层 }，用于识别与斗3同期的《唐门英雄传》支线
 */
function locateAct(index, key, prev, hint) {
  if (!index || !isNum(key)) return { ...EMPTY_LOC };
  const explicitHero = explicitHeroTrack(index, hint) || explicitHeroTrack(index, prev);
  const useHero = explicitHero || wantsHeroTrack(index, hint) || wantsHeroTrack(index, prev);
  const part = useHero && inHeroSpan(index, key, explicitHero) ? '英雄' : partOf(key);
  const books = index.部 || [];
  const book = books.find((b) => b.名 === part);
  const heroBook = books.find((b) => b.名 === '英雄');
  const nextName = part === '神界' && useHero && heroBook && heroBook.正篇.length ? '英雄' : NEXT_PART[part];
  const nextBook = nextName ? books.find((b) => b.名 === nextName) : null;
  if (!book || !book.正篇.length) return { ...EMPTY_LOC };
  const acts = book.正篇;
  if (key < acts[0][1]) return prehistoryLoc(book, key);
  let last = 0;
  for (let lo = 0, hi = acts.length - 1; lo <= hi;) {
    const mid = (lo + hi) >> 1;
    if (acts[mid][1] <= key) { last = mid; lo = mid + 1; } else hi = mid - 1;
  }
  // 幕的时间跨度彼此重叠（长事件把“本幕时间”拉长）。推进规则：
  // 从上一轮所在的幕出发（没有就从“开始日 ≤ 外界日期的最后一幕”所在的同日组第一幕出发），
  // 这一幕已经整段过去，或它到期的事件都有了结果，才推进到下一幕；最远推进到开始日 ≤ 外界日期的最后一幕。
  let g0 = last;
  while (g0 > 0 && acts[g0 - 1][1] === acts[last][1]) g0 -= 1;
  const pi = prev && prev.幕 ? acts.findIndex((a) => a[0] === prev.幕) : -1;
  let cur = pi >= 0 && pi <= last ? pi : g0;
  while (cur < last) {
    const [, , end, evs] = acts[cur];
    if (key > end) { cur += 1; continue; }
    const st = cur === pi ? (prev && prev.事件) || {} : {};
    const due = evs.filter((e) => e[1] <= key);
    if (due.every(([no]) => st['事件' + no] && st['事件' + no].状态 && st['事件' + no].状态 !== '未发生')) cur += 1;
    else break;
  }
  if (cur === last) {
    const lastEnd = Math.max(...acts.map((a) => a[2]));
    if (last === acts.length - 1 && key > lastEnd) {
      // 两部之间：用下一部的前史篇
      return nextBook && nextBook.正篇.length ? prehistoryLoc(nextBook, key) : { ...EMPTY_LOC };
    }
    if (key > acts[last][2] && last + 1 < acts.length && key < acts[last + 1][1]) {
      return { 来源: '幕间', 篇: actPian(acts[last + 1][0]), 幕: null, 下一幕: acts[last + 1][0], 指导名: null, 事件: [] };
    }
  }
  const act = acts[cur];
  return {
    来源: '当前幕', 篇: actPian(act[0]), 幕: act[0], 下一幕: acts[cur + 1] ? acts[cur + 1][0] : (nextBook && nextBook.正篇[0] ? nextBook.正篇[0][0] : null),
    指导名: act[0], 事件: act[3].map(([no, a, b, title]) => ['事件' + no, a, b, title]),
  };
}

// 篇级时间表（外界日期未设定时给 AI 定日期用）
function pianTable(index) {
  const rows = [];
  for (const book of (index && index.部) || []) {
    const by = new Map();
    for (const [name, a] of book.正篇) {
      const p = actPian(name);
      if (!by.has(p)) by.set(p, { 篇: p, 起: a, 幕数: 0 });
      by.get(p).幕数 += 1;
    }
    rows.push(...[...by.values()].map((r) => ({ 部: book.名, ...r })));
  }
  return rows;
}

// ───────── 力量尺度（ADR 0003）─────────
const QUALITY_BONUS = Object.freeze({ 废: -5, 普通: 0, 优秀: 2, 顶级: 5, 神级: 10, 超神级: 15 });
const GOD_LEVEL = Object.freeze({ 神官: 99, 三级神: 100, 二级神: 110, 一级神: 120, 神王: 150 });
const BEAST_POINTS = [[10, 10], [100, 24], [1e3, 44], [1e4, 70], [5e4, 86], [1e5, 95], [1e6, 109]];
const FIERCE_POINTS = [[2e5, 98], [3e5, 100], [4e5, 101], [5e5, 103], [7e5, 105], [8e5, 108], [9e5, 108], [9.9e5, 109], [1e6, 109]];
const NON_COMBAT_BEAST = /天梦冰蚕|非战斗魂兽|不擅战斗|无战斗力|无攻击力/u;
function isNonCombatBeast(p) {
  if (!p) return false;
  const text = [p.姓名, p.种族, p.身份, p.说明].filter(Boolean).join(' ');
  return NON_COMBAT_BEAST.test(text);
}
function logInterp(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    if (x <= x1) return y0 + (Math.log10(x) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}
function linInterp(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    if (x <= x1) return y0 + (x - x0) / (x1 - x0) * (y1 - y0);
  }
  return points[points.length - 1][1];
}
// 魂兽修为年限 → 等效等级：十年 10、百年 24、千年 44、万年 70、十万年 95、凶兽 98–108（80万年帝天 108）、百万年战力型 109
function beastLevel(years, fierce) {
  if (!isNum(years) || years <= 0) return 0;
  if (years >= 1e6) return 109;
  if (fierce || years >= 2e5) return Math.round(logInterp(FIERCE_POINTS, Math.max(years, 2e5)));
  if (years < 10) return Math.max(1, Math.round(years));
  return Math.round(logInterp(BEAST_POINTS, years));
}
function activeSoul(p) {
  const list = entriesOf(p && p.武魂).filter(([, w]) => w && w.形态 !== '血脉');
  const on = list.find(([, w]) => w.使用中);
  return on ? on[1] : list[0] ? list[0][1] : null;
}
const hasSeat = (p) => !!(p && p.神途 && p.神途.神位);
const isTrueGod = (p) => hasSeat(p) || !!(p && p.神阶 && GOD_LEVEL[p.神阶] >= 100);
// 常态等效等级 = 原作数值折算 + 武魂品质（95 级以上不计）；天梦冰蚕等非战斗魂兽肉搏折算封顶 65
function normalLevel(p, part) {
  let base = 0;
  if (isNum(p.魂力等级)) base = p.魂力等级;
  else if (isNum(p.修为年限)) {
    base = beastLevel(p.修为年限, p.凶兽);
    if (isNonCombatBeast(p)) base = Math.min(base, 65);
  }
  const seat = p.神途 && p.神途.神位;
  if (seat && part !== '斗4' && GOD_LEVEL[seat.神阶]) base = Math.max(base, GOD_LEVEL[seat.神阶]);
  if (!seat && part !== '斗4' && GOD_LEVEL[p.神阶]) base = Math.max(base, GOD_LEVEL[p.神阶]);
  let q = 0;
  if (isNum(p.魂力等级)) {
    const w = activeSoul(p);
    if (w) {
      if (base < 95) q = QUALITY_BONUS[w.品质] || 0;
      else if (w.品质 === '超神级' && base < 120) q = 5;
    }
  }
  return Math.max(0, Math.round(base + q));
}
// 斗铠 1–6 字宿主等级衰减曲线：严格单调不倒挂，1–3 字凡间封顶 99，4 字准神（99+4字=105），6 字不单靠斗铠破 140 神王线
const ARMOR_BONUS_PTS = Object.freeze({
  1: [[10, 8], [50, 8], [70, 6], [80, 4], [90, 2], [98, 1], [99, 0]],
  2: [[10, 13], [60, 13], [70, 10], [80, 7], [90, 4], [95, 2], [98, 1], [99, 0]],
  3: [[10, 18], [60, 18], [70, 15], [80, 11], [90, 6], [95, 3], [98, 1], [99, 0]],
  4: [[10, 22], [70, 22], [80, 17], [85, 14], [90, 11], [95, 8], [99, 6], [100, 5], [110, 3], [120, 2], [150, 1]],
  5: [[10, 26], [70, 26], [80, 19], [90, 14], [95, 11], [99, 9], [100, 9], [110, 7], [120, 5], [130, 3], [140, 2], [150, 2]],
  6: [[10, 30], [70, 30], [80, 23], [90, 17], [95, 14], [99, 12], [100, 12], [110, 10], [120, 8], [130, 6], [135, 4], [140, 3], [150, 3]],
});
function armorBonus(words, normal, fit = null, isCore = false) {
  const w = clampN(Math.round(Number(words) || 0), 1, 6);
  const lv = Math.max(0, Number(normal) || 0);
  const raw = linInterp(ARMOR_BONUS_PTS[w], lv);
  const coreMul = isCore ? 0.6 : 1;
  const fitMul = isNum(fit) ? clampN(0.5 + 0.5 * (clampN(fit, 0, 100) / 100), 0.5, 1) : 1;
  let b = Math.round(raw * coreMul * fitMul);
  if (w <= 3) {
    if (lv >= 99) return 0;
    b = Math.min(b, Math.max(0, 99 - Math.round(lv)));
  }
  if (w >= 4 && !isCore && lv >= 85 && lv < 99 && (fit == null || fit >= 60)) {
    b = Math.max(b, 99 - Math.round(lv));
  }
  if (lv < 140 && Math.round(lv) + b >= 140) b = Math.max(0, 139 - Math.round(lv));
  return Math.max(0, b);
}
// 当前 = 常态 + 加成（取最高）与保底取大 − 限制（累加），再压上限
function currentLevel(normal, effects) {
  let bonus = 0, floor = -Infinity, minus = 0, cap = Infinity;
  for (const [, e] of entriesOf(effects)) {
    const v = isNum(e && e.数值) ? e.数值 : 0;
    if (e.类型 === '加成') bonus = Math.max(bonus, v);
    else if (e.类型 === '保底') floor = Math.max(floor, v);
    else if (e.类型 === '限制') minus += v;
    else if (e.类型 === '上限') cap = Math.min(cap, v);
  }
  return Math.max(0, Math.round(Math.min(Math.max(normal + bonus, floor) - minus, cap)));
}

// 档差（本卡规则）：差 <5 势均力敌；5–10 差距明显；11–20 压制；>20 碾压；90 级以上每级按 3 级算；跨大层次直接碾压
// 斗1–斗3 及神界/英雄中，100–109 为准神/高阶凶兽战力带，仅凝聚神位/神阶者算“神”，避免无神位凶兽或准神误触神凡免疫
const adjLevel = (x) => (x <= 90 ? x : 90 + (x - 90) * 3);
function bigTier(eq, part, seat) {
  if (part === '斗4') return eq >= 150 ? 4 : eq >= 120 ? 3 : eq >= 110 ? 2 : eq >= 100 ? 1 : 0;
  return seat ? 1 : 0;
}
const TIER_NAME = Object.freeze({ 斗4: ['非神', '神级', '真神', '超神', '神王'], 其他: ['凡人', '神'] });
const NEED = Object.freeze({ 势均力敌: 0, 差距明显: 1, 压制: 2, 碾压: null });
const bandOf = (a) => (a < 5 ? '势均力敌' : a <= 10 ? '差距明显' : a <= 20 ? '压制' : '碾压');
/** h、o：{ 当前, 常态, 神位(bool) }。差值 = 主角当前 − 对方当前（原始等级差）；局面按折算后的差判定；
 *  大层次按常态与神位定，斗铠、领域这类临时加成不会把人抬成“神”。 */
function gapOf(h, o, part) {
  const d = h.当前 - o.当前, a = Math.abs(adjLevel(h.当前) - adjLevel(o.当前));
  const nh = isNum(h.常态) ? h.常态 : h.当前, no = isNum(o.常态) ? o.常态 : o.当前;
  const th = bigTier(nh, part, h.神位), to = bigTier(no, part, o.神位);
  const names = part === '斗4' ? TIER_NAME.斗4 : TIER_NAME.其他;
  if (th !== to) {
    return { 局面: '碾压', 差值: d, 强方: th > to ? '主角' : '对方', 需越级条件: null, 说明: `跨大层次：${names[th]}对${names[to]}，只能逃、拖、求援或谈判` };
  }
  if (part === '斗4' && th > 0 && !!h.神位 !== !!o.神位) {
    return { 局面: '差距明显', 差值: d, 强方: h.神位 ? '主角' : '对方', 需越级条件: 1, 说明: '有神位者对同阶野神' };
  }
  const 局面 = bandOf(a);
  return {
    局面, 差值: d, 强方: a < 5 ? '相当' : d > 0 ? '主角' : '对方', 需越级条件: NEED[局面],
    说明: 局面 !== bandOf(Math.abs(d)) ? `90 级以上每级按 3 级算（折算后差 ${a}）` : '',
  };
}

// ───────── 称号、下一道坎、精神力境界 ─────────
const TITLES = ['魂士', '魂师', '大魂师', '魂尊', '魂宗', '魂王', '魂帝', '魂圣', '魂斗罗', '封号斗罗'];
function beastTitle(years, fierce) {
  if (!isNum(years)) return '魂兽';
  if (years >= 1e6) return '百万年魂兽';
  if (fierce) return '凶兽';
  if (years >= 1e5) return '十万年魂兽';
  if (years >= 1e4) return '万年魂兽';
  if (years >= 1e3) return '千年魂兽';
  if (years >= 100) return '百年魂兽';
  return '十年魂兽';
}
function titleOf(p, part) {
  const seat = p.神途 && p.神途.神位;
  if (seat && seat.神阶) return seat.神阶;
  if (p.神阶 && GOD_LEVEL[p.神阶]) return p.神阶;
  const L = p.魂力等级;
  if (!isNum(L)) return p.出身 === '魂兽' || isNum(p.修为年限) ? beastTitle(p.修为年限, p.凶兽) : '';
  if (L >= 100 && part === '斗4') return L >= 120 ? '超神' : L >= 110 ? '真神' : '神级';
  if (L >= 99) return '极限斗罗';
  if (L >= 95) return '超级斗罗';
  // 卡在整十级时，已经拿到下一个魂环就算进了下一档（30 级三环＝魂尊）
  const idx = Math.max(Math.ceil(L / 10) - 1, Math.min(ringCount(p), Math.floor(L / 10)));
  return TITLES[clampN(idx, 0, 9)];
}
const RING_ORD = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function ringCount(p) {
  let n = 0;
  for (const [, w] of entriesOf(p.武魂)) {
    if (!w || w.形态 === '血脉') continue;
    n = Math.max(n, (w.魂环 || []).filter((r) => r && !r.神级).length);
  }
  return n;
}
function nextHurdle(p, part, isHero) {
  const L = p.魂力等级;
  const seat = p.神途 && p.神途.神位;
  if (!isNum(L)) {
    const y = p.修为年限;
    if (!isNum(y)) return null;
    if (y < 1e5) return { 等级: null, 说明: `十万年天劫 · 尚余${cnNumber(1e5 - y)}年` };
    if (y < 1e6) return { 等级: null, 说明: p.凶兽 ? '下一次天劫 · 迈向百万年' : '十万年天劫已至 · 渡过即为凶兽' };
    return { 等级: null, 说明: '百万年 · 近神' };
  }
  if (seat && part !== '斗4') return { 等级: null, 说明: '已成神 · 神阶晋升随剧情' };
  if (part === '斗4') {
    if (L >= 120) return { 等级: 150, 说明: '神王（推定 150 级以上）' };
    if (L >= 110) return { 等级: 120, 说明: '120 级 · 超神' };
    if (L >= 100) return { 等级: 110, 说明: '110 级 · 真神' };
    if (L >= 99) return { 等级: 100, 说明: '100 级 · 神级（第十阶）' };
  } else if (L >= 99) return { 等级: null, 说明: '99 级 · 极限斗罗；再往上需继承神位' };
  if (L >= 90) return { 等级: 99, 说明: part === '斗4' ? '99 级 · 极限斗罗' : '99 级 · 极限斗罗；再往上需神位' };
  const rings = ringCount(p);
  // 等级已经越过了魂环数撑得住的瓶颈（不硬压，只提醒）。NPC 一个魂环都没记时当资料不全，不提醒。
  const owed = Math.min(9, Math.ceil(L / 10) - 1);
  if (rings < owed && (isHero || rings > 0)) {
    return { 等级: (rings + 1) * 10, 说明: `${L} 级应有 ${owed} 个魂环，现记 ${rings} 个 · 缺第${RING_ORD[rings + 1] || rings + 1}魂环` };
  }
  let T = Math.max(10, Math.ceil(L / 10) * 10);
  while (rings >= T / 10 && T < 90) T += 10;
  const need = T / 10;
  return { 等级: T, 说明: `${T} 级瓶颈 · 需第${RING_ORD[need] || need}魂环` };
}
const SPIRIT_REALMS = ['灵元境', '灵通境', '灵海境', '灵渊境', '灵域境', '神元境'];
function spiritRealm(points, part) {
  if (!isNum(points)) return null;
  const cut = part === '斗4' ? [50, 500, 5000, 20000, 50000] : [100, 500, 5000, 20000, 50000];
  let i = 0;
  while (i < cut.length && points >= cut[i]) i += 1;
  return SPIRIT_REALMS[i];
}

// ───────── 魂环颜色 ─────────
function ringColor(r) {
  if (r.神级) return '神金';
  if (r.凶兽) return '橙金';
  const y = r.年限;
  if (!isNum(y)) return '特殊'; // 血脉魂环等不按年限计的，显示看特殊色
  if (y >= 1e6) return '金';
  if (y >= 1e5) return '红';
  if (y >= 1e4) return '黑';
  if (y >= 1e3) return '紫';
  if (y >= 100) return '黄';
  return '白';
}
const goldLines = (r, color) => (color === '红' && isNum(r.年限) ? Math.floor(r.年限 / 1e5) : 0);

// ───────── 好感 ─────────
const AFFECTION_STAGES = Object.freeze([
  [-151, '不共戴天'], [-101, '仇视'], [-51, '敌意'], [-21, '戒备'], [20, '陌路'],
  [50, '友善'], [100, '信任'], [150, '亲近'], [Infinity, '生死之交'],
]);
function affectionStage(v) {
  if (!isNum(v)) return '陌路';
  if (v <= -151) return '不共戴天';
  for (const [hi, name] of AFFECTION_STAGES.slice(1)) if (v <= hi) return name;
  return '生死之交';
}

// ───────── 时层 ─────────
const LAYERS = Object.freeze(['实际历史', '神界', '小世界', '幻境', '虚拟世界']);
const DAMAGE_MODE = Object.freeze({ 实际历史: '真实', 神界: '真实', 小世界: '真实', 幻境: '只扣精神', 虚拟世界: '投影气血' });

// ───────── 真实魂力容量池（ADR 0007）─────────
const SOUL_POOL_PTS = Object.freeze([
  [0, 20], [10, 100], [20, 240], [30, 500], [40, 1000], [50, 2000], [60, 4000],
  [70, 8000], [80, 15000], [90, 30000], [95, 50000], [99, 80000],
  [100, 150000], [108, 280000], [110, 350000], [120, 800000], [135, 1500000], [150, 2500000], [160, 3500000],
]);
function nicePool(n) {
  const v = Math.max(20, n);
  const step = v < 200 ? 5 : v < 2000 ? 10 : v < 20000 ? 100 : v < 200000 ? 1000 : 5000;
  return Math.round(v / step) * step;
}
function maxSoulPower(p, part) {
  let lv = 0;
  if (p && isNum(p.魂力等级)) lv = p.魂力等级;
  else if (p && isNum(p.修为年限)) lv = isNonCombatBeast(p) && p.修为年限 >= 1e5 ? 100 : beastLevel(p.修为年限, p.凶兽);
  const seat = p && p.神途 && p.神途.神位;
  if (seat && part !== '斗4' && GOD_LEVEL[seat.神阶]) lv = Math.max(lv, GOD_LEVEL[seat.神阶]);
  if (!seat && p && part !== '斗4' && GOD_LEVEL[p.神阶]) lv = Math.max(lv, GOD_LEVEL[p.神阶]);
  return nicePool(linInterp(SOUL_POOL_PTS, Math.max(0, lv)));
}

// ───────── 明文三币钱包与币种校验（ADR 0007）─────────
const SOUL_COIN_UNIT = Object.freeze({
  金魂币: 100, 金币: 100, 金: 100,
  银魂币: 10, 银币: 10, 银: 10,
  铜魂币: 1, 铜币: 1, 铜: 1, 魂币: 1, 铜魂币总计: 1,
});
const PART_CURRENCIES = Object.freeze({
  斗3: new Set(['联邦币', '星罗币', '斗灵币']),
  斗4: new Set(['联邦币', '斗罗币', '龙马币']),
  神界: new Set(),
  英雄: new Set(),
});
function parseSoulCoinValue(val, defaultCopper = 100) {
  if (isNum(val)) return val * defaultCopper;
  if (typeof val !== 'string') return null;
  const s = val.replace(/[\s,，]/g, '').replace(/^约/u, '');
  if (!s) return null;
  const segRe = /(-?\d+(?:\.\d+)?(?:万|亿)?|[零〇一二两三四五六七八九十百千万亿]+)(?:枚|个)?(金魂币|银魂币|铜魂币|金币|银币|铜币|金|银|铜)/gu;
  let sum = 0, matched = '', m;
  while ((m = segRe.exec(s)) !== null) {
    const n = parseAmount(m[1]);
    if (n == null) return null;
    const u = m[2].startsWith('金') ? 100 : m[2].startsWith('银') ? 10 : 1;
    sum += n * u;
    matched += m[0];
  }
  if (matched && s.replace(segRe, '') === '') return sum;
  const plain = s.replace(/(?:枚|个)?(?:魂币|币)$/u, '');
  const n = parseAmount(plain);
  return n == null ? null : n * defaultCopper;
}
function splitCopper(totalCopper) {
  const c = Math.max(0, Math.round(totalCopper || 0));
  return { 金魂币: Math.floor(c / 100), 银魂币: Math.floor((c % 100) / 10), 铜魂币: c % 10 };
}
function parseModernCoinValue(val) {
  if (isNum(val)) return val;
  if (typeof val !== 'string') return null;
  const s = val.replace(/[\s,，]/g, '').replace(/^约/u, '').replace(/(?:联邦币|星罗币|斗灵币|斗罗币|龙马币|币|元)$/u, '');
  return parseAmount(s);
}
function normalizeWallet(raw, part) {
  if (!isObj(raw)) return {};
  const keys = Object.keys(raw);
  if (!keys.length) return {};
  const hasSoulCoin = keys.some((k) => Object.prototype.hasOwnProperty.call(SOUL_COIN_UNIT, k));
  if (part === '斗1' || part === '斗2' || (!part && hasSoulCoin)) {
    let copper = 0, seen = false;
    for (const [k, v] of Object.entries(raw)) {
      const unit = SOUL_COIN_UNIT[String(k).trim()];
      if (!unit) continue;
      const c = parseSoulCoinValue(v, unit);
      if (c != null) { copper += c; seen = true; }
    }
    return seen ? splitCopper(copper) : { 金魂币: 0, 银魂币: 0, 铜魂币: 0 };
  }
  if (part && Object.prototype.hasOwnProperty.call(PART_CURRENCIES, part)) {
    const allow = PART_CURRENCIES[part];
    if (!allow.size) return {};
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      const key = String(k).trim();
      if (!allow.has(key)) continue;
      const n = parseModernCoinValue(v);
      if (n != null) out[key] = Math.max(0, Math.round(n));
    }
    return out;
  }
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = parseModernCoinValue(v);
    if (n != null) out[String(k).trim()] = Math.max(0, Math.round(n));
  }
  return out;
}
/** 从玩家开场想法/背景文字中识别显式初始钱数（如“一开始只有1000铜魂币”“身无分文”“500联邦币”）；未提及时返回 null */
function parseWalletHint(text, part) {
  const s = String(text || '');
  if (!s.trim()) return null;
  if (/身无分文|分文皆无|一文不名|分文未带|兜比脸干净/u.test(s)) {
    if (part === '斗1' || part === '斗2') return { 金魂币: 0, 银魂币: 0, 铜魂币: 0 };
    if (part === '斗3' || part === '斗4') return { 联邦币: 0 };
    return {};
  }
  if (part === '斗1' || part === '斗2') {
    const re = /(\d+(?:\.\d+)?(?:万|亿)?|[零〇一二两三四五六七八九十百千万亿]+)\s*(?:枚|个)?\s*(金魂币|银魂币|铜魂币|金币|银币|铜币)/gu;
    let copper = 0, hit = false, m;
    while ((m = re.exec(s)) !== null) {
      const n = parseAmount(m[1]);
      if (n == null) continue;
      const u = m[2].startsWith('金') ? 100 : m[2].startsWith('银') ? 10 : 1;
      copper += n * u;
      hit = true;
    }
    return hit ? splitCopper(copper) : null;
  }
  if (part === '斗3' || part === '斗4') {
    const re = /(\d+(?:\.\d+)?(?:万|亿)?|[零〇一二两三四五六七八九十百千万亿]+)\s*(联邦币|星罗币|斗灵币|斗罗币|龙马币)/gu;
    const out = {};
    let hit = false, m;
    const allow = PART_CURRENCIES[part];
    while ((m = re.exec(s)) !== null) {
      if (!allow.has(m[2])) continue;
      const n = parseAmount(m[1]);
      if (n == null) continue;
      out[m[2]] = (out[m[2]] || 0) + Math.max(0, Math.round(n));
      hit = true;
    }
    return hit ? out : null;
  }
  return null;
}

// 斗罗魂环色板：魂环颜色（变量里的 魂环颜色）→ 实际画出来的颜色。ZOD、状态栏、正文、小手机共用这一份。
// 规则：
//   1 变量里写了 魂环颜色 就按它画；没写（null）按年限：十年白、百年黄、千年紫、万年黑、十万年红（金纹）、百万年金。
//   2 按年限画时，带内越往上颜色越深；越接近下一档，越透出下一档的颜色（九万九千年＝黑里发红）。
//   3 颜色是开放的：先查命名色（含别名），查不到就按字拆（“暗紫金”＝暗紫＋金），也认 #RRGGBB 和 #A>#B 渐变；
//      实在认不出就按名字算一个固定颜色，同一个名字永远是同一种色。
// 没有任何依赖；构建时原样拼进各脚本，样稿页直接 <script src> 引它。
// eslint-disable-next-line no-unused-vars
function createRingPalette() {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hex2rgb = (x) => { const n = parseInt(String(x).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgb2hex = (a) => '#' + a.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lighten = (c, t) => mix(c, '#FFFFFF', t);
  const darken = (c, t) => mix(c, '#000000', t);
  function luminance(x) {
    const [r, g, b] = hex2rgb(x).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgb2hex([f(0) * 255, f(8) * 255, f(4) * 255]);
  }
  const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };

  // 年限色带：[名, 下限, 带内最浅, 带内最深]
  const BANDS = [['白', 10, '#F4F1EA', '#CFC8B8'], ['黄', 100, '#F2D46B', '#C08A17'], ['紫', 1000, '#B08AE0', '#4E2585'], ['黑', 1e4, '#45434B', '#0D0C10'], ['红', 1e5, '#C8323A', '#6E0F16'], ['金', 1e6, '#F0CF6A', '#B8891F']];
  const BAND_NAMES = BANDS.map((b) => b[0]);
  const bandIndex = (y) => { let i = 0; while (i < BANDS.length - 1 && y >= BANDS[i + 1][1]) i += 1; return i; };
  const bandOf = (y) => BANDS[bandIndex(y)][0];

  // 命名色：s 色组（第一个是主色）；gold 金纹道数；rainbow 彩色流转；shimmer 神光；note 谁用（写进提示词）
  const NAMED = {
    彩色: { s: ['#FF5A5F', '#FFB341', '#FFE45C', '#5FD88A', '#3FC1F0', '#6C7BFF', '#D96BFF'], rainbow: true, note: '龙神（五彩斑斓、流转）' },
    淡金: { s: ['#F3E7BE', '#D9DEE6', '#EAD9A0'], note: '银龙王（淡金带银）' },
    红金: { s: ['#C21F2E', '#E8B04A'], gold: 3, note: '修罗神' },
    蓝金: { s: ['#2B74C9', '#E8C25A'], gold: 3, note: '海神' },
    紫金: { s: ['#6A34A8', '#E2B84E'], gold: 3, note: '罗刹神' },
    绿: { s: ['#5ACB75', '#2C9A55'], note: '生命魂环' },
    玫瑰金: { s: ['#E8A090', '#C97668', '#F0C98A'], note: '三眼金猊' },
    灰: { s: ['#A3A6AC', '#5E6168'], note: '伊莱克斯（死灵）' },
    冰蓝: { s: ['#C4EEFF', '#5BB4E5'], note: '冰属性' },
    绿金: { s: ['#5E9E3A', '#E2C35A'], gold: 3, note: '' },
    蓝银: { s: ['#3576C8', '#D3DDE8'], note: '蓝银皇' },
    金银: { s: ['#E8C25A', '#DCE1E8'], note: '金银双龙' },
    冰火: { s: ['#7FD3FF', '#FF6A3D'], note: '冰火两仪' },
    琉璃: { s: ['#A6EBFF', '#E9B8FF', '#FFE5A6', '#B8FFD9'], note: '七宝琉璃' },
    极光: { s: ['#3BF0C0', '#47A6FF', '#9A6BFF'], note: '' },
    星空: { s: ['#232870', '#6A5CE0', '#D6D8FF'], note: '' },
    神金: { s: ['#FFF3C8', '#E8C25A', '#FFF3C8'], shimmer: true, note: '神级魂环' },
    橙金: { s: ['#F0A030', '#E8C25A'], note: '凶兽魂环' },
    白金: { s: ['#FAF6EA', '#E6CF8C'], note: '' },
    黑金: { s: ['#1A171D', '#D4AB4C'], gold: 3, note: '' },
    黑红: { s: ['#141116', '#A3121F'], note: '' },
    暗金: { s: ['#A9852F', '#6E5418'], note: '' },
    暗赤金: { s: ['#7A2A1C', '#C9953E'], gold: 3, note: '' },
    银: { s: ['#E6EAEF', '#A9B1BC'], note: '' },
    血红: { s: ['#A3101F', '#5C0710'], note: '' },
    青: { s: ['#3CC4B3', '#1C7F75'], note: '' },
    碧: { s: ['#4FCB9F', '#1F8F78'], note: '' },
    粉: { s: ['#F9BCD5', '#E07AA6'], note: '' },
    蓝: { s: ['#4A8BE0', '#2456A6'], note: '' },
    橙: { s: ['#F7A445', '#D06A16'], note: '' },
    紫红: { s: ['#9A2E86', '#D84A72'], note: '' },
    幽蓝: { s: ['#21407F', '#5584E0'], note: '' },
    雷紫: { s: ['#7C5CFF', '#CBBDFF'], note: '' },
    墨: { s: ['#1D1C22', '#3E3C47'], note: '' },
  };
  // 别名 → 命名色或年限色
  const ALIAS = {
    龙神: '彩色', 七彩: '彩色', 五彩: '彩色', 彩虹: '彩色', 五彩斑斓: '彩色', 斑斓: '彩色', 炫彩: '彩色', 幻彩: '彩色', 虹: '彩色', 彩: '彩色',
    银龙王: '淡金', 浅金: '淡金', 修罗: '红金', 修罗神: '红金', 金红: '红金', 海神: '蓝金', 金蓝: '蓝金', 罗刹: '紫金', 罗刹神: '紫金', 金紫: '紫金',
    生命: '绿', 生命魂环: '绿', 三眼金猊: '玫瑰金', 伊莱克斯: '灰', 死灵: '灰', 死灵圣法神: '灰', 蓝银皇: '蓝银', 金绿: '绿金', 冰: '冰蓝',
    七宝琉璃: '琉璃', 冰火两仪: '冰火', 金龙王: '金', 金银龙: '金银', 神级: '神金', 凶兽: '橙金', 红黑: '黑红', 赤金: '红金',
    十年: '白', 百年: '黄', 千年: '紫', 万年: '黑', 十万年: '红', 百万年: '金',
  };
  const NULLISH = /^(无|没有|暂无|默认|按年限|年限色|正常|普通|null|undefined|none|—|-)?$/iu;
  // 按字拆用的单色字（长的先认）；修饰字：淡浅亮明嫩 变浅，深暗沉浓重 变深
  const TOKENS = Object.entries({
    玫瑰: '#D9677F', 天青: '#7FC4C8', 琥珀: '#D9902A', 翡翠: '#2FA36B', 珊瑚: '#F07B6B', 胭脂: '#C2335A', 天蓝: '#6FB7F2', 海蓝: '#2A6FBF', 湖蓝: '#2F8FB8', 宝蓝: '#2747B8',
    藏青: '#1F2E5A', 月白: '#E6EEF7', 象牙: '#F3EBD6', 薄荷: '#8FE3C0', 柠檬: '#F2E35A', 橄榄: '#7D8A2E', 酒红: '#7A1730', 樱: '#F5A3B8', 桃: '#F59AA0',
    金: '#E8C25A', 银: '#CDD3DB', 红: '#C8323A', 赤: '#D93A2B', 朱: '#D4452E', 丹: '#D23A2A', 橙: '#F08A30', 黄: '#F2D46B', 绿: '#4FB05E', 翠: '#2FAF6A',
    碧: '#2E9E86', 青: '#2FAFA0', 蓝: '#3F7FD9', 靛: '#3B3F9E', 紫: '#8A5BC4', 粉: '#F29CC0', 黑: '#1A191E', 墨: '#17161B', 玄: '#1C1A24', 白: '#F4F1EA',
    雪: '#F7FBFF', 灰: '#8A8D93', 褐: '#8A5A3A', 棕: '#8A5A3A', 冰: '#A8E0F5', 霜: '#DCEFF7', 火: '#F26A2E', 炎: '#F2552E', 焰: '#FF7A30', 血: '#9E1020',
    雷: '#9C8CFF', 电: '#B5A8FF', 光: '#FFF2B8', 星: '#7C7FE6', 月: '#E9E6D6', 日: '#F7B733', 夜: '#1E2140',
  }).sort((a, b) => b[0].length - a[0].length);
  const LIGHT_MOD = '淡浅亮明嫩', DARK_MOD = '深暗沉浓重';

  // 写法归一：去空白、去“魂环”、去结尾的“色”，别名换成正名；空、“无”“默认”“按年限”返回 null
  function normalize(v) {
    if (v == null) return null;
    let s = String(v).replace(/\s+/gu, '');
    if (NULLISH.test(s)) return null;
    s = s.replace(/^魂环/u, '').replace(/魂环$/u, '');
    const known = (x) => (NAMED[x] || BAND_NAMES.includes(x) ? x : ALIAS[x] || null);
    if (known(s)) return known(s);
    if (s.length > 1 && s.endsWith('色')) { const t = s.slice(0, -1); if (known(t)) return known(t); if (!/#/u.test(t)) s = t; }
    return s || null;
  }
  function parse(name) {
    const hex = String(name).match(/#(?:[0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-f])/giu);
    if (hex) return { s: hex.slice(0, 7).map((h) => (h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h).toUpperCase()) };
    if (/彩|虹|斑斓/u.test(name)) return { s: NAMED.彩色.s, rainbow: true };
    const out = [];
    let mod = 0;
    for (let i = 0; i < name.length;) {
      const ch = name[i];
      if (LIGHT_MOD.includes(ch)) { mod = 1; i += 1; continue; }
      if (DARK_MOD.includes(ch)) { mod = -1; i += 1; continue; }
      const hit = TOKENS.find(([t]) => name.startsWith(t, i));
      if (!hit) { i += 1; continue; }
      out.push(mod > 0 ? lighten(hit[1], 0.38) : mod < 0 ? darken(hit[1], 0.38) : hit[1]);
      mod = 0; i += hit[0].length;
    }
    if (out.length) return { s: out.slice(0, 7), gold: out.length > 1 && /金/u.test(name) ? 3 : 0 };
    const h = hash(name) % 360;
    return { s: [hsl(h, 62, 60), hsl(h + 38, 58, 40)] };
  }

  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  // 一个魂环的完整外观
  //   name 显示名；custom 是否来自变量里的魂环颜色；main 主色；stops 色组（≥1，按环一圈排）；second 第二色；
  //   glow 光晕色（按年限时就是下一档的颜色）；hint 0–1，透出下一档的程度；gold 金纹道数；rainbow 彩色流转；shimmer 神光；dark/light 主色很深/很浅
  function look(r) {
    const ring = r || {};
    const y = num(ring.年限);
    const want = normalize(ring.魂环颜色 != null ? ring.魂环颜色 : ring.特殊色);
    const band = y != null ? bandOf(Math.max(y, 10)) : null;
    let o;
    if (want && want !== band) {
      const spec = NAMED[want] || (BAND_NAMES.includes(want) ? bandSpec(want) : parse(want));
      const s = spec.s.slice();
      let gold = spec.gold || 0;
      if (gold && y != null && y >= 1e5) gold = Math.max(gold, Math.min(9, Math.floor(y / 1e5)));
      o = { name: want, custom: true, main: s[0], stops: s, second: s[1] || s[0], glow: spec.glow || s[0], hint: 0, gold, rainbow: !!spec.rainbow, shimmer: !!spec.shimmer || !!ring.神级 };
    } else if (!want && ring.神级) {
      const s = NAMED.神金.s;
      o = { name: '神级', custom: false, main: '#F3E2A6', stops: s, second: s[1], glow: '#FFE9A8', hint: 0, gold: 0, rainbow: false, shimmer: true };
    } else if (!want && ring.凶兽) {
      const c = mix('#F0A030', '#C8781A', y ? clamp(Math.log10(y) - 5, 0, 1) : 0.5);
      o = { name: '橙金', custom: false, main: c, stops: [c, '#E8C25A'], second: '#E8C25A', glow: c, hint: 0, gold: 0, rainbow: false, shimmer: false };
    } else {
      o = yearLook(y);
      if (o.name === '红') o.gold = num(ring.金纹) != null ? ring.金纹 : Math.floor((y || 0) / 1e5);
    }
    const L = luminance(o.main);
    o.dark = L < 0.06; o.light = L > 0.7;
    return o;
  }
  function bandSpec(name) {
    const b = BANDS[BAND_NAMES.indexOf(name)];
    return { s: [mix(b[2], b[3], 0.35)] };
  }
  function yearLook(y0) {
    const y = Math.max(y0 == null ? 10 : y0, 10);
    const i = bandIndex(y), [name, lo, light, deep] = BANDS[i];
    const main = mix(light, deep, clamp(Math.log10(y / lo), 0, 1));
    const o = { name, custom: false, main, stops: [main], second: main, glow: main, hint: 0, gold: 0, rainbow: false, shimmer: false };
    if (i < BANDS.length - 1 && y0 != null) {
      const k = Math.pow(clamp((y - lo) / (lo * 9), 0, 1), 1.6);
      const next = BANDS[i + 1], nc = mix(next[2], next[3], 0.25);
      if (k > 0.04) {
        o.hint = k;
        o.second = mix(main, nc, 0.15 + 0.7 * k);
        o.glow = mix(main, nc, Math.min(1, 0.3 + k));
        o.stops = [main, o.second];
      }
    }
    return o;
  }
  // 名字的颜色（不看年限），给设置页、提示词色卡用
  const swatch = (name) => look({ 魂环颜色: name, 年限: null });

  // CSS 片段：linear 色带、conic 一圈、border4 四边（圆形边框上四段）
  function linear(o, deg = 135) { const s = o.stops.length > 1 ? o.stops : [o.main, o.main]; return `linear-gradient(${deg}deg,${s.join(',')})`; }
  function conic(o) { const s = o.stops.length > 1 ? o.stops : [o.main, o.main]; return `conic-gradient(from 0deg,${[...s, s[0]].join(',')})`; }
  function border4(o) { const s = o.stops, n = s.length; return [0, 1, 2, 3].map((i) => (n === 2 ? s[i % 2] : s[Math.floor((i * n) / 4) % n])).join(' '); }
  // SVG 渐变的停点：[[位置 0–1, 颜色]…]，首尾同色好让环上接缝不明显
  function svgStops(o) {
    const s = o.stops.length > 1 ? [...o.stops, o.stops[0]] : [o.main, o.main];
    return s.map((c, i) => [i / (s.length - 1), c]);
  }
  const key = (o) => 'r' + hash(o.stops.join('') + (o.rainbow ? '~' : '')).toString(36);
  const list = () => Object.entries(NAMED).map(([n, v]) => ({ name: n, note: v.note || '', stops: v.s.slice(), gold: v.gold || 0, rainbow: !!v.rainbow }));
  const aliases = () => Object.assign({}, ALIAS);

  return { BANDS: BANDS.map((b) => b.slice()), bandOf, normalize, look, swatch, linear, conic, border4, svgStops, key, list, aliases, mix, luminance };
}

/* 宗门与血脉数据表：由 源码/build.py 从 宗门血脉成就/gemini交付/ 自动生成，勿手改（只去掉了考据字段，数值原样）。 */
const SBC = {"设施":{"冥想聚灵室":{"类别":"修炼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"魂力等级40以下门人在此闭关1外界月折算1.15月修炼进度。","建造":1000,"工期":15,"维护":40,"积累":1},{"级":2,"效果":"魂力等级50以下门人在此闭关1外界月折算1.25月修炼进度。","建造":2500,"工期":30,"维护":90,"积累":2},{"级":3,"效果":"魂力等级60以下门人在此闭关1外界月折算1.35月进度，冥想回魂力加快20%。","建造":5500,"工期":50,"维护":180,"积累":3},{"级":4,"效果":"魂力等级70以下门人在此闭关1外界月折算1.5月进度，吸收魂环心魔风险小幅降低。","建造":11000,"工期":75,"维护":350,"积累":5},{"级":5,"效果":"魂力等级80以下门人在此闭关1外界月折算1.65月进度，魂圣凝聚魂核成功率提升10%。","建造":22000,"工期":110,"维护":680,"积累":8}]},"拟态修炼场·冰火极境":{"类别":"修炼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"冥想聚灵室","等级":2},"等级":[{"级":1,"效果":"冰火属性门人（魂力等级50以下）闭关1外界月折算1.3月进度，其余淬体气血恢复加快10%。","建造":4000,"工期":35,"维护":160,"积累":2},{"级":2,"效果":"冰火属性门人（魂力等级60以下）闭关1外界月折算1.45月进度，体魄抗寒抗火小幅增强。","建造":8500,"工期":60,"维护":320,"积累":4},{"级":3,"效果":"冰火属性门人（魂力等级70以下）闭关1外界月折算1.6月进度，上限年限内吸收魂环爆体风险降15%。","建造":18000,"工期":90,"维护":620,"积累":6},{"级":4,"效果":"冰火属性门人（魂力等级80以下）闭关1外界月折算1.8月进度，服食仙草药力吸收率增15%。","建造":36000,"工期":130,"维护":1150,"积累":9},{"级":5,"效果":"冰火属性门人（魂力等级90以下）闭关1外界月折算2.0月进度，冲击双魂核稳固度提升15%。","建造":70000,"工期":180,"维护":2100,"积累":14}]},"拟态修炼场·千钧重力室":{"类别":"修炼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"冥想聚灵室","等级":1},"等级":[{"级":1,"效果":"2倍重力：魂力等级45以下强攻防御及本体武魂门人闭关1月折算1.25月进度。","建造":2800,"工期":25,"维护":110,"积累":2},{"级":2,"效果":"4倍重力：魂力等级55以下对应门人闭关1月折算1.4月进度，吸收第一二魂环冲击风险降10%。","建造":6000,"工期":45,"维护":220,"积累":3},{"级":3,"效果":"6倍重力：魂力等级70以下对应门人闭关1月折算1.55月进度，体魄抗击打韧性显著提升。","建造":13000,"工期":75,"维护":450,"积累":5},{"级":4,"效果":"10倍重力：魂力等级80以下对应门人闭关1月折算1.75月进度，吸收高阶魂环肉身抗冲击力与契合度增15%。","建造":26000,"工期":110,"维护":880,"积累":8},{"级":5,"效果":"15倍重力：魂力等级90以下对应门人闭关1月折算1.95月进度，本体武魂二次觉醒契机微增。","建造":50000,"工期":150,"维护":1650,"积累":12}]},"拟态修炼场·深海重压池":{"类别":"修炼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"冥想聚灵室","等级":2},"等级":[{"级":1,"效果":"水属性及海魂师门人（魂力等级50以下）闭关1月折算1.3月进度。","建造":3200,"工期":30,"维护":120,"积累":2},{"级":2,"效果":"水属性门人（魂力等级60以下）闭关1月折算1.45月进度，魂力运转滞涩抗性提升。","建造":6800,"工期":50,"维护":250,"积累":3},{"级":3,"效果":"水属性门人（魂力等级70以下）闭关1月折算1.6月进度，持续作战魂力消耗降低5%。","建造":14500,"工期":80,"维护":500,"积累":5},{"级":4,"效果":"水属性门人（魂力等级80以下）闭关1月折算1.75月进度，抗击冲击波与重压能力增强。","建造":29000,"工期":115,"维护":960,"积累":8},{"级":5,"效果":"水属性门人（魂力等级90以下）闭关1月折算1.95月进度，领悟水系自创战技效率提升20%。","建造":56000,"工期":160,"维护":1800,"积累":12}]},"拟态修炼场·九霄雷霆崖":{"类别":"修炼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"冥想聚灵室","等级":2},"等级":[{"级":1,"效果":"雷属性门人（魂力等级50以下）闭关1月折算1.3月进度，非雷系慎入防雷伤。","建造":3600,"工期":30,"维护":140,"积累":2},{"级":2,"效果":"雷属性门人（魂力等级60以下）闭关1月折算1.45月进度，麻痹抗性小幅提升。","建造":7600,"工期":55,"维护":280,"积累":4},{"级":3,"效果":"雷属性门人（魂力等级70以下）闭关1月折算1.6月进度，雷系攻击魂技爆发力微增。","建造":16000,"工期":85,"维护":560,"积累":6},{"级":4,"效果":"雷属性门人（魂力等级80以下）闭关1月折算1.8月进度，雷霆淬体使肉身抗伤韧性稳固提升。","建造":32000,"工期":120,"维护":1050,"积累":9},{"级":5,"效果":"雷属性门人（魂力等级90以下）闭关1月折算2.0月进度，冲击毁灭或雷系极致属性契机微增。","建造":62000,"工期":170,"维护":1950,"积累":13}]},"拟态修炼场·极北玄冰窟":{"类别":"修炼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"冥想聚灵室","等级":2},"等级":[{"级":1,"效果":"冰属性门人（魂力等级50以下）闭关1月折算1.3月进度，平复心浮气躁。","建造":3400,"工期":30,"维护":130,"积累":2},{"级":2,"效果":"冰属性门人（魂力等级60以下）闭关1月折算1.45月进度，精神杂念干扰降低。","建造":7200,"工期":50,"维护":260,"积累":3},{"级":3,"效果":"冰属性门人（魂力等级70以下）闭关1月折算1.6月进度，寒毒反噬概率降低15%。","建造":15000,"工期":80,"维护":520,"积累":5},{"级":4,"效果":"冰属性门人（魂力等级80以下）闭关1月折算1.8月进度，吸收冰系魂环与魂灵契合度提升。","建造":30000,"工期":115,"维护":980,"积累":8},{"级":5,"效果":"冰属性门人（魂力等级90以下）闭关1月折算1.95月进度，极致之冰门人亦享1.4倍修炼速度。","建造":58000,"工期":160,"维护":1850,"积累":12}]},"拟态修炼场·烈阳熔岩窟":{"类别":"修炼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"冥想聚灵室","等级":2},"等级":[{"级":1,"效果":"火及至阳属性门人（魂力等级50以下）闭关1月折算1.3月进度。","建造":3400,"工期":30,"维护":130,"积累":2},{"级":2,"效果":"火及至阳属性门人（魂力等级60以下）闭关1月折算1.45月进度，驱除体内阴寒暗伤。","建造":7200,"工期":50,"维护":260,"积累":3},{"级":3,"效果":"火及至阳属性门人（魂力等级70以下）闭关1月折算1.6月进度，邪火躁动压制效果显著。","建造":15000,"工期":80,"维护":520,"积累":5},{"级":4,"效果":"火及至阳属性门人（魂力等级80以下）闭关1月折算1.8月进度，锻造师在此地火借力更省魂力。","建造":30000,"工期":115,"维护":980,"积累":8},{"级":5,"效果":"火及至阳属性门人（魂力等级90以下）闭关1月折算1.95月进度，极致之火门人亦享1.4倍进度。","建造":58000,"工期":160,"维护":1850,"积累":12}]},"九重试炼塔":{"类别":"修炼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":7,"前置":{"位阶":"地方豪强"},"等级":[{"级":1,"效果":"开放前2层（大魂师级试炼）：30级以下门人实战历练魂技熟练度提升加快15%。","建造":4500,"工期":40,"维护":150,"积累":2},{"级":2,"效果":"开放第3层（魂尊级试炼）：40级以下门人魂技衔接演练效率增20%，突破小瓶颈更顺畅。","建造":9000,"工期":60,"维护":300,"积累":4},{"级":3,"效果":"开放第4层（魂宗级试炼）：50级以下门人团队配合默契提升，组合技磨合期缩短20%。","建造":16000,"工期":85,"维护":520,"积累":6},{"级":4,"效果":"开放第5层（魂王级试炼）：60级以下门人越阶抗压演练，实战中心神动摇率降低。","建造":28000,"工期":115,"维护":880,"积累":8},{"级":5,"效果":"开放第6层（魂帝级试炼）：70级以下门人打磨武魂真身前序感悟，70级关口感悟加快15%。","建造":46000,"工期":150,"维护":1400,"积累":11},{"级":6,"效果":"开放第7至8层（魂圣魂斗罗试炼）：90级以下门人模拟强敌压迫，武魂融合技契合度易精进。","建造":75000,"工期":200,"维护":2200,"积累":15},{"级":7,"效果":"九层全开（封号级幻阵）：95级以下门人印证领域与绝学，冲击封号斗罗心境关成功率增15%。","建造":120000,"工期":260,"维护":3500,"积累":20}]},"地脉灵泉眼":{"类别":"修炼","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"千年以下族中魂兽在此栖息1外界年折算1.3年修为年限增长。","建造":1200,"工期":20,"维护":45,"积累":2},{"级":2,"效果":"万年以下族中魂兽栖息1外界年折算1.45年修为年限增长，轻伤自愈加快。","建造":3000,"工期":40,"维护":110,"积累":3},{"级":3,"效果":"五万年以下族中魂兽栖息1外界年折算1.6年修为年限增长，气血亏空恢复加快25%。","建造":7000,"工期":70,"维护":240,"积累":5},{"级":4,"效果":"十万年以下族中魂兽栖息1外界年折算1.8年修为年限增长，冲击万年关口稳固度提升。","建造":16000,"工期":110,"维护":520,"积累":8},{"级":5,"效果":"十万年及以上凶兽亦可借泉温养本源，全族渡十万年天劫前元气充盈度提升15%。","建造":36000,"工期":160,"维护":1100,"积累":13}]},"万兽试炼谷":{"类别":"修炼","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"地脉灵泉眼","等级":2},"等级":[{"级":1,"效果":"百年至千年族兽入谷搏杀磨砺，魂兽技实战熟练度与扑击凶性提升15%。","建造":2600,"工期":30,"维护":90,"积累":2},{"级":2,"效果":"万年以下族兽入谷淬炼鳞甲筋骨，物理抗打击与抗属性侵蚀能力小幅增强。","建造":5800,"工期":55,"维护":200,"积累":4},{"级":3,"效果":"五万年以下族兽模拟绝境厮杀，濒死激发潜能概率微增，突破万年瓶颈更稳。","建造":13000,"工期":85,"维护":420,"积累":6},{"级":4,"效果":"引劫雷余韵淬体，十万年大限将至的族兽在此备劫可降低10%天劫重创率。","建造":28000,"工期":125,"维护":880,"积累":9},{"级":5,"效果":"凶兽威压与天雷交织，族兽渡十万年及二十万年天劫硬抗生机提升15%（不免天劫）。","建造":58000,"工期":175,"维护":1750,"积累":14}]},"百草灵药园":{"类别":"药园","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"可培育十年药龄灵草，门人日常轻伤休养时间缩短15%，供应丹坊基础药材。","建造":1200,"工期":20,"维护":45,"积累":1},{"级":2,"效果":"可培育百年药龄灵草，宗门药浴汤剂充足，30级以下门人固本修炼微幅加快。","建造":2800,"工期":35,"维护":100,"积累":2},{"级":3,"效果":"可培育五百年药龄佳品灵草，重伤门人驻地疗养恢复速度提升25%。","建造":6200,"工期":60,"维护":210,"积累":4},{"级":4,"效果":"可培育千年药龄珍稀灵草，炼制培元固魂丹药成丹品质提高一成。","建造":13500,"工期":90,"维护":440,"积累":6},{"级":5,"效果":"灵土肥沃可温养近万年药王，每年有小概率催熟一株高药龄奇草入公库物资。","建造":28000,"工期":130,"维护":880,"积累":9}]},"仙草药园":{"类别":"药园","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"百草灵药园","等级":3},"等级":[{"级":1,"效果":"锁住移植仙品药性不流失，千年药龄奇草在此1外界年折算2年药龄生长。","建造":8000,"工期":50,"维护":300,"积累":4},{"级":2,"效果":"万年以下灵草仙苗1外界年折算3年药龄生长，采摘入药保留九成以上精华。","建造":18000,"工期":85,"维护":650,"积累":7},{"级":3,"效果":"可同时温养多株万年仙品药草，门人服食仙草洗髓改善先天魂力或体魄更稳妥。","建造":38000,"工期":130,"维护":1300,"积累":11},{"级":4,"效果":"万年仙品1外界年折算5年药龄生长，可孕育仙草分株种子留存宗门底蕴。","建造":75000,"工期":190,"维护":2500,"积累":16},{"级":5,"效果":"十万年仙草亦可安稳扎根产生灵智而不散本源，仙草旁闭关者修炼速度增30%。","建造":140000,"工期":260,"维护":4500,"积累":22}]},"古树聚灵圃":{"类别":"药园","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"聚拢林间生机，领地百年灵果朱果熟期缩短20%，幼兽体质微增。","建造":1400,"工期":20,"维护":50,"积累":2},{"级":2,"效果":"千年伴生灵植成活率大增，植物系与草食系族兽修为年限增长加快15%。","建造":3200,"工期":40,"维护":115,"积累":3},{"级":3,"效果":"古木垂落生命露华，重伤濒死族兽在树下休养气血恢复速度提升35%。","建造":7200,"工期":70,"维护":250,"积累":5},{"级":4,"效果":"可孕育万年药龄天材地宝，植物系魂兽在此冲击十万年瓶颈成功率增10%。","建造":16500,"工期":110,"维护":540,"积累":8},{"级":5,"效果":"古树冠盖十里生机如海，全族魂兽寿元损耗小幅延缓，伴生奇珍品质跃升。","建造":38000,"工期":160,"维护":1150,"积累":13}]},"百炼锻造坊":{"类别":"锻造","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"可提纯凡铁铸造制式兵刃，1至2级师级锻造师门人日常练锤效率增15%。","建造":1200,"工期":20,"维护":50,"积累":1},{"级":2,"效果":"炉温稳定支撑百锻上品，门人冲击3级大师级（千锻准入）成功率提升10%。","建造":2800,"工期":35,"维护":110,"积累":2},{"级":3,"效果":"配备稀有金属锻造台，3至4级锻造师打出千锻有灵（一品）概率提升15%。","建造":6500,"工期":60,"维护":240,"积累":4},{"级":4,"效果":"引地心真火入炉，5至6级宗匠门人进行灵锻与双金属融锻损耗降低20%。","建造":14000,"工期":90,"维护":500,"积累":6},{"级":5,"效果":"宗匠圣匠级重型工坊，7级圣匠魂锻成功率提升10%，打造神兵利器品质稳固。","建造":30000,"工期":130,"维护":1000,"积累":10}]},"机括暗器坊":{"类别":"锻造","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"百炼锻造坊","等级":1},"等级":[{"级":1,"效果":"可批量打制袖箭、飞蝗石与柳叶刀等手法暗器，门人暗器演练损耗减半。","建造":2000,"工期":25,"维护":80,"积累":2},{"级":2,"效果":"具备板晶发金加工精度，可组装无声袖箭、紧背花装弩与基础机括箭匣。","建造":4500,"工期":45,"维护":180,"积累":3},{"级":3,"效果":"流水精制诸葛神弩与蝠翼轮回零件，30级以下门人佩弩实战越阶自保力大增。","建造":10000,"工期":75,"维护":380,"积累":5},{"级":4,"效果":"可研制子母追魂夺命胆、孔雀翎级高精密机括暗器，成品破防精度提升15%。","建造":22000,"工期":110,"维护":780,"积累":8},{"级":5,"效果":"暗器巅峰秘坊，支撑佛怒唐莲或暴雨梨花针级绝世暗器部件精加工（须图纸材料齐备）。","建造":46000,"工期":155,"维护":1550,"积累":12}]},"斗铠工坊":{"类别":"锻造","适用":["宗门","家族","门派","学院"],"部":["斗3","斗4"],"最高等级":5,"前置":{"设施":"百炼锻造坊","等级":3},"等级":[{"级":1,"效果":"支撑一字斗铠（全千锻）设计、制作与修理，门人首套一字斗铠契合度起步增5%。","建造":6000,"工期":45,"维护":240,"积累":3},{"级":2,"效果":"支撑千锻一品有灵融合式一字斗铠及二字斗铠（全灵锻）部件铭刻，废件率降15%。","建造":13500,"工期":75,"维护":520,"积累":5},{"级":3,"效果":"支撑二字斗铠成套组装与战损精修，门人温养斗铠提升契合度速度加快20%。","建造":28000,"工期":110,"维护":1050,"积累":8},{"级":4,"效果":"配备圣匠级铭刻台，支撑三字斗铠（全魂锻）制作，斗铠领域激发稳定性提升。","建造":56000,"工期":155,"维护":2000,"积累":12},{"级":5,"效果":"神匠级辅助阵台，支撑四字斗铠（天锻或神锻）雏形塑形与三字升四字重刻法阵。","建造":105000,"工期":210,"维护":3600,"积累":17}]},"神级斗铠孕养台":{"类别":"锻造","适用":["宗门","家族","门派","学院"],"部":["斗4"],"最高等级":3,"前置":{"设施":"斗铠工坊","等级":4},"等级":[{"级":1,"效果":"辅助99级极限斗罗门人温养四字斗铠向五字蜕变，蕴养周期缩短15%（不破硬门槛）。","建造":90000,"工期":180,"维护":3200,"积累":14},{"级":2,"效果":"辅助四融以上神锻金属与斗铠融合，极限及神级门人五字斗铠契合度提升15%。","建造":150000,"工期":240,"维护":5200,"积累":19},{"级":3,"效果":"引聚浩瀚元气辅助百级以上神级门人以神识神力孕养六字斗铠完成终极进化。","建造":240000,"工期":300,"维护":8000,"积累":26}]},"神匠融锻炉":{"类别":"锻造","适用":["宗门","家族","门派","学院"],"部":["斗3","斗4"],"最高等级":5,"前置":{"设施":"斗铠工坊","等级":2},"等级":[{"级":1,"效果":"辅助双金属融锻，5至6级宗匠门人融锻融合度平均提升3%至5%。","建造":8000,"工期":50,"维护":320,"积累":4},{"级":2,"效果":"辅助三金属融锻与创生灵锻，有灵合金成型率提升15%。","建造":18000,"工期":85,"维护":700,"积累":6},{"级":3,"效果":"支撑7至8级圣匠进行魂锻层次融锻，大幅降低稀有金属炸炉损毁风险。","建造":38000,"工期":130,"维护":1450,"积累":10},{"级":4,"效果":"引动天地元素共鸣，9级神匠在此施行天锻或神锻时气血反噬与休养期缩短25%。","建造":78000,"工期":185,"维护":2800,"积累":15},{"级":5,"效果":"可承载多元稀有金属圣品融锻，为顶层高阶斗铠及准神级兵甲提供核心母材。","建造":145000,"工期":250,"维护":5000,"积累":21}]},"魂导工坊":{"类别":"魂导","适用":["宗门","家族","门派","学院"],"部":["斗2","神界","英雄","斗3","斗4"],"最高等级":6,"前置":null,"等级":[{"级":1,"效果":"可试制1至2级近战远程魂导器，门人练习基础核心法阵铭刻材料损耗降15%。","建造":2600,"工期":25,"维护":100,"积累":2},{"级":2,"效果":"可研制3至4级魂导器（含基础飞行与储物魂导器），魂导师考核通过率增15%。","建造":6000,"工期":45,"维护":230,"积累":3},{"级":3,"效果":"可研制5至6级攻击防御魂导器，门人铭刻复合法阵精神力消耗降低10%。","建造":13500,"工期":75,"维护":500,"积累":5},{"级":4,"效果":"可研制7级重型魂导器与高阶无敌护罩，联动测试安全性大幅提升。","建造":28000,"工期":115,"维护":1050,"积累":8},{"级":5,"效果":"明德堂级高阶实验室，支撑8至9级封号级魂导器研发（须对应修为魂导师主持）。","建造":58000,"工期":165,"维护":2100,"积累":13},{"级":6,"效果":"顶尖魂导枢机房，辅助95级以上大宗师参研十级本命魂导器或正向循环源泉核心。","建造":110000,"工期":230,"维护":4000,"积累":19}]},"定装魂导试验场":{"类别":"魂导","适用":["宗门","家族","门派","学院"],"部":["斗2","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"魂导工坊","等级":3},"等级":[{"级":1,"效果":"安全试射1至3级定装魂导炮弹与诸葛神弩炮，炸膛误伤门人风险降低50%。","建造":5500,"工期":40,"维护":220,"积累":3},{"级":2,"效果":"可测试4至5级定装炮弹及定装干扰弹，远程弹道校准精度提升15%。","建造":12500,"工期":70,"维护":480,"积累":5},{"级":3,"效果":"重型缓冲结界可承受6至7级定装魂导炮弹试爆，定装发射架装填效率提升。","建造":27000,"工期":110,"维护":1000,"积累":8},{"级":4,"效果":"绝密深层靶场，支撑8级定装魂导炮弹及子母追魂高阶机括炮弹定型。","建造":56000,"工期":160,"维护":2050,"积累":12},{"级":5,"效果":"战略级防爆试验区，可安全研发校准9级高阶定装魂导炮弹核心法阵与引信。","建造":115000,"工期":220,"维护":4200,"积累":18}]},"机甲工坊":{"类别":"魂导","适用":["宗门","家族","门派","学院"],"部":["斗3","斗4"],"最高等级":5,"前置":{"设施":"魂导工坊","等级":2},"等级":[{"级":1,"效果":"可整备保养白级练习机甲与黄级制式机甲，门人机甲基础驾驶入门周期缩短20%。","建造":5000,"工期":40,"维护":200,"积累":3},{"级":2,"效果":"可按门人武魂定制改装紫级专属机甲，机甲战损大修工费降低25%。","建造":12000,"工期":70,"维护":460,"积累":5},{"级":3,"效果":"支撑魂帝灵海境以上门人调试黑级超级机甲，魂灵与机甲中枢协同率提升15%。","建造":26000,"工期":105,"维护":980,"积累":8},{"级":4,"效果":"大师级重装机库，辅助八环以上门人亲手锻刻红级（神级）机甲部件与双甲流外挂。","建造":55000,"工期":155,"维护":2000,"积累":13},{"级":5,"效果":"顶级机甲研发中枢，红级（神级）机甲核心过载耐受度与魂灵融合协同率增15%。","建造":108000,"工期":215,"维护":3900,"积累":18}]},"虚拟战网舱室":{"类别":"魂导","适用":["宗门","家族","门派","学院"],"部":["斗3","斗4"],"最高等级":5,"前置":{"设施":"魂导工坊","等级":1},"等级":[{"级":1,"效果":"基础模拟舱：门人零肉身伤亡切磋魂技与机甲操控，实战临场经验稳步增长。","建造":3800,"工期":25,"维护":150,"积累":2},{"级":2,"效果":"痛觉拟真30%：还原各类地形与魂兽习性，门人越阶对敌应变与闪避技巧提升。","建造":8200,"工期":45,"维护":320,"积累":4},{"级":3,"效果":"多舱联机战术室：支持7人战队合练阵型与组合技，团队战术磨合效率提升30%。","建造":17500,"工期":75,"维护":660,"积累":6},{"级":4,"效果":"高精度精神接驳：锤炼门人灵通至灵海境精神力控制微操（战败出局仅轻微扣精神）。","建造":36000,"工期":115,"维护":1350,"积累":9},{"级":5,"效果":"全息主脑阵列：可全真推演封号级团战、百台机甲编队协同与大规模攻防战术。","建造":72000,"工期":160,"维护":2600,"积累":14}]},"藏经阁":{"类别":"藏经","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":6,"前置":null,"等级":[{"级":1,"效果":"收录常见魂兽图鉴，门人猎杀或挑选第一二魂环匹配度提高，功法初学速度增10%。","建造":1500,"工期":25,"维护":50,"积累":2},{"级":2,"效果":"完备武魂拟态理论卷宗，门人修习宗门功法熟练度晋升速度提升20%。","建造":3600,"工期":45,"维护":120,"积累":4},{"级":3,"效果":"设内阁秘卷室，长老与核心门人闭关参研时每年可补全残缺宗门功法完整度2至5点。","建造":8000,"工期":75,"维护":260,"积累":6},{"级":4,"效果":"历代封号手札齐备，门人冲击魂圣武魂真身与自创战技领悟效率提升25%。","建造":18000,"工期":110,"维护":550,"积累":10},{"级":5,"效果":"玉简魂导秘藏，宗门功法传承在跨部万年结算时遗失损耗率额外降低15%。","建造":38000,"工期":155,"维护":1150,"积累":15},{"级":6,"效果":"万卷渊薮阁，门人功法修至精通与入微门槛降低，每年稳定厚植高额宗门底蕴。","建造":76000,"工期":210,"维护":2300,"积累":22}]},"观星推演台":{"类别":"藏经","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"藏经阁","等级":2},"等级":[{"级":1,"效果":"灵通境（精神力500点以下）门人夜观冥想，精神力点数日常增长加快15%。","建造":3000,"工期":30,"维护":110,"积累":2},{"级":2,"效果":"灵海境（5000点以下）门人精神之海凝练加快20%，精神属性武魂门人额外增5%。","建造":6800,"工期":55,"维护":240,"积累":4},{"级":3,"效果":"双人或多人在台合演武魂互补气机，武魂融合技契合度打磨速度提升25%。","建造":15000,"工期":85,"维护":500,"积累":6},{"级":4,"效果":"辅助门人冲击灵渊境（5000点）关口，抵御幻境反噬与精神震荡恢复加快30%。","建造":32000,"工期":125,"维护":1020,"积累":9},{"级":5,"效果":"星辉引魂大阵，灵域境（20000点）自生精神领域感悟契机微增，推演绝学事半功倍。","建造":65000,"工期":175,"维护":2000,"积累":14}]},"魂导图谱库":{"类别":"藏经","适用":["宗门","家族","门派","学院"],"部":["斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"藏经阁","等级":2},"等级":[{"级":1,"效果":"收录1至3级标准法阵图谱，门人兼修魂导师或设计师入门时间缩短20%。","建造":2800,"工期":25,"维护":100,"积累":2},{"级":2,"效果":"收录4至6级复合法阵与稀有金属配比表，研制新式魂导器试错成本降15%。","建造":6500,"工期":50,"维护":230,"积累":4},{"级":3,"效果":"收录7级高阶联动核心法阵图谱，门人研制高阶攻击与护身魂导器效率增20%。","建造":14500,"工期":80,"维护":480,"积累":6},{"级":4,"效果":"珍藏8至9级古法回路与精密合金配比秘卷，跨部结算时科技图谱留存率额外增15%。","建造":31000,"工期":120,"维护":980,"积累":10},{"级":5,"效果":"宗门最高技术密档库，支撑门人逆向拆解缴获魂导重器并转化为自研图谱。","建造":64000,"工期":165,"维护":1950,"积累":15}]},"山门哨戒阵":{"类别":"护宗","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"外围暗桩巡防，可提前发觉魂尊以下潜入者，有效阻滞寻常盗匪夜袭。","建造":800,"工期":15,"维护":30,"积累":1},{"级":2,"效果":"布设机括陷阱与迷雾毒障，魂王以下强闯山门将受轻伤迟滞。","建造":2000,"工期":30,"维护":75,"积累":2},{"级":3,"效果":"联动烽火传讯与测魂阵纹，魂帝以下隐匿潜行有六成概率被当场识破。","建造":4800,"工期":50,"维护":170,"积累":3},{"级":4,"效果":"天险铁索锁道，守山门人依托山门险要对魂圣级来敌占「地利」越级条件。","建造":10500,"工期":80,"维护":360,"积累":5},{"级":5,"效果":"重重暗哨锁山，魂斗罗以下难以无声潜入，遭遇突袭时可争取从容撤离时间。","建造":22000,"工期":115,"维护":720,"积累":7}]},"护宗大阵":{"类别":"护宗","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":7,"前置":{"位阶":"地方豪强"},"等级":[{"级":1,"效果":"开启阵幕抵御魂帝级强攻，阵内守山门人持续作战魂力消耗降低10%。","建造":5000,"工期":45,"维护":200,"积累":3},{"级":2,"效果":"地脉光幕合拢可抵御魂圣级围攻，来犯之敌在阵内身法速度与感知受限。","建造":11000,"工期":70,"维护":420,"积累":5},{"级":3,"效果":"可正面硬抗魂斗罗强攻，守山一方自动占据「地利」越级条件。","建造":22000,"工期":100,"维护":820,"积累":7},{"级":4,"效果":"可阻挡初入封号斗罗（91至94级）一时三刻，动用底蕴催动可反震重创来敌。","建造":42000,"工期":140,"维护":1500,"积累":10},{"级":5,"效果":"可抵御95级超级斗罗猛攻，阵内守军当前等效等级视作临时+3（不破99）。","建造":75000,"工期":190,"维护":2600,"积累":14},{"级":6,"效果":"多名封号斗罗主持阵眼时，大阵光壁可正面抗衡99级极限斗罗猛烈轰击。","建造":130000,"工期":250,"维护":4400,"积累":19},{"级":7,"效果":"准神级覆山壁垒，耗底蕴超负荷运转可硬接准神层次全力一击而不破山门。","建造":210000,"工期":320,"维护":7000,"积累":25}]},"魂导炮台防线":{"类别":"护宗","适用":["宗门","家族","门派","学院"],"部":["斗2","英雄","斗3","斗4"],"最高等级":6,"前置":{"设施":"魂导工坊","等级":2},"等级":[{"级":1,"效果":"3级魂导射线塔群交叉齐射，正面压制魂宗级以下敌军集群冲锋。","建造":4500,"工期":35,"维护":180,"积累":2},{"级":2,"效果":"列装改良诸葛神弩炮阵，可密集攒射威胁魂帝级强敌与低空飞行魂导师。","建造":10000,"工期":60,"维护":400,"积累":4},{"级":3,"效果":"6级高能魂导炮配城防联动护罩，阻截魂圣级强敌突袭并分摊轰击伤害。","建造":22000,"工期":95,"维护":850,"积累":6},{"级":4,"效果":"7级远程重炮覆盖五公里防区，重创魂斗罗及高阶飞行魂导师编队。","建造":46000,"工期":135,"维护":1700,"积累":10},{"级":5,"效果":"8级定装发射井与九级护罩中枢联动，可正面威慑并阻遏封号斗罗兵锋。","建造":92000,"工期":190,"维护":3300,"积累":15},{"级":6,"效果":"9级主炮坐镇（高阶炮弹另备），全力齐射之威堪比超级至极限斗罗出手。","建造":170000,"工期":250,"维护":6000,"积累":21}]},"领地守护结界":{"类别":"护宗","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":6,"前置":null,"等级":[{"级":1,"效果":"浓雾迷踪障眼，魂尊以下人类猎魂小队误入领地十有八九迷途退出。","建造":1000,"工期":20,"维护":40,"积累":2},{"级":2,"效果":"毒瘴或寒雾弥漫侵蚀，魂王以下猎魂团闯入每刻持续损耗魂力与体力。","建造":2600,"工期":40,"维护":100,"积累":3},{"级":3,"效果":"群兽气机共鸣示警，魂圣以下踏足领地即刻暴露并受「地利」压制。","建造":6200,"工期":70,"维护":230,"积累":5},{"级":4,"效果":"十万年威压幻阵覆盖，初入封号斗罗孤身闯入亦难锁定核心主巢方位。","建造":14500,"工期":105,"维护":500,"积累":8},{"级":5,"效果":"凶兽本源烙印护持，隔绝远距探测，正面协助族兽抵御超级斗罗级猎杀。","建造":32000,"工期":150,"维护":1050,"积累":12},{"级":6,"效果":"生命核心级禁区壁垒，耗底蕴可引动万兽潮汐反扑99级极限斗罗强敌。","建造":68000,"工期":210,"维护":2200,"积累":18}]},"魂兽园":{"类别":"兽园","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","斗3","斗4"],"最高等级":5,"前置":{"位阶":"地方豪强"},"等级":[{"级":1,"效果":"圈养十年级常见魂兽，新入门孩童辨识魂兽弱点与实战胆魄训练效率增15%。","建造":2200,"工期":30,"维护":90,"积累":1},{"级":2,"效果":"圈养百年级魂兽，持续提供魂兽血肉药膳食材，门人日常气血恢复微增（不直给魂环）。","建造":5000,"工期":55,"维护":200,"积累":3},{"级":3,"效果":"栖息千年级珍稀亚种魂兽，兽武魂门人观摩同源魂兽形神，魂技领悟加快20%。","建造":11500,"工期":85,"维护":440,"积累":5},{"级":4,"效果":"生态稳固可栖养近万年异兽，长期善待喂养时偶有寿终魂兽自愿与门人缔结契约。","建造":25000,"工期":125,"维护":920,"积累":8},{"级":5,"效果":"小位面级生态秘苑，濒危魂兽繁衍栖息，提升宗门与自然派魂兽势力交好概率。","建造":52000,"工期":175,"维护":1850,"积累":12}]},"魂灵塔":{"类别":"兽园","适用":["宗门","家族","门派","学院"],"部":["斗2","斗3","斗4"],"最高等级":6,"前置":{"位阶":"一方名门"},"等级":[{"级":1,"效果":"可温养十年白色与百年黄色魂灵残魂不散，门人融合低阶魂灵契合度提升10%。","建造":5000,"工期":40,"维护":200,"积累":3},{"级":2,"效果":"可温养千年紫色魂灵，灵通境门人融合魂灵时精神力排斥反应降低15%。","建造":11500,"工期":70,"维护":440,"积累":5},{"级":3,"效果":"可长期寄养万年黑色魂灵，门人魂灵受损休眠时在塔内恢复速度加快30%。","建造":25000,"工期":105,"维护":920,"积累":8},{"级":4,"效果":"高阶传灵法阵：自愿契约的魂兽与门人缔结魂灵成功率增20%（仍守精神力容量上限）。","建造":52000,"工期":150,"维护":1850,"积累":12},{"级":5,"效果":"拟态升灵蕴养池：百年与千年魂灵在塔内每年可缓慢增长少量修为年限（不破万年）。","建造":98000,"工期":205,"维护":3400,"积累":17},{"级":6,"效果":"可安稳供奉十万年红环或凶兽橙金魂灵栖居作为护宗灵尊，世代守护宗门传承。","建造":168000,"工期":270,"维护":5600,"积累":23}]},"御兽驯化场":{"类别":"兽园","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":4,"前置":null,"等级":[{"级":1,"效果":"驯养信鸽灵隼与驮马，门人外出公干赶路耗时缩短10%，商队护卫更稳。","建造":900,"工期":15,"维护":35,"积累":1},{"级":2,"效果":"驯养百年鳞马与巡山猎犬，驻地周边百里异动预警提前，派遣差事效率增15%。","建造":2200,"工期":30,"维护":80,"积累":2},{"级":3,"效果":"驯养低阶飞行亚龙或疾风魔狼骑队，敏攻与侦察门人野外追踪搜寻能力大增。","建造":5200,"工期":55,"维护":190,"积累":4},{"级":4,"效果":"成建制灵禽异兽坐骑营，宗门大规模迁徙或驰援产业遇袭时行军速度提升30%。","建造":11500,"工期":85,"维护":400,"积累":6}]},"门人精舍":{"类别":"居所","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"遮风避雨安顿家眷，门人日常精神与气血自然恢复加快10%，防寒暑疫病。","建造":800,"工期":15,"维护":30,"积累":1},{"级":2,"效果":"内设药浴汤池与演武小院，门人归属感稳固，偶发琐事扣减人心的幅度减轻。","建造":2000,"工期":30,"维护":75,"积累":2},{"级":3,"效果":"嫡庶内外院井然有序，招揽外姓良才入门更容易，新生门人幼年夭折率降低。","建造":4600,"工期":50,"维护":165,"积累":3},{"级":4,"效果":"静谧园林配安神熏香，门人走火入魔或精神受创后静养恢复时间缩短25%。","建造":10000,"工期":80,"维护":350,"积累":5},{"级":5,"效果":"钟鸣鼎食的世家大宅气象，宗门声势自然彰显，高阶客卿与供奉更愿留驻。","建造":21000,"工期":115,"维护":700,"积累":8}]},"长老静修峰":{"类别":"居所","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"位阶":"一方名门"},"等级":[{"级":1,"效果":"清净无扰，70级以上长老在此闭关1外界月折算1.15月进度，陈年暗伤不易发作。","建造":4000,"工期":35,"维护":150,"积累":3},{"级":2,"效果":"80级以上长老闭关1外界月折算1.25月进度，高龄门人气血衰败略微延缓。","建造":9000,"工期":60,"维护":330,"积累":5},{"级":3,"效果":"90级以上封号斗罗参悟天地至理效率增20%，冲击95级超级斗罗分水岭契机微增。","建造":20000,"工期":95,"维护":720,"积累":8},{"级":4,"效果":"聚敛浓郁生机温养心脉，未成神高龄封号长老可多延数年坐镇寿数（不改跨部大限）。","建造":42000,"工期":140,"维护":1480,"积累":12},{"级":5,"效果":"供奉殿与海神阁级清修禁地，95级以上强者冲击99级极限斗罗或凝聚第二魂核更稳。","建造":85000,"工期":200,"维护":2900,"积累":18}]},"万兽祖巢":{"类别":"居所","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"稳固族群栖息根基，幼生魂兽破壳或分娩成活率提升15%，伤势恢复加快10%。","建造":900,"工期":15,"维护":35,"积累":1},{"级":2,"效果":"巢穴温润藏风聚气，族中魂兽凝聚人心更稳，吸纳流散同族魂兽投奔更容易。","建造":2200,"工期":35,"维护":85,"积累":3},{"级":3,"效果":"内辟沉睡石窟，重伤或闭关族兽沉睡疗伤速度提升25%，幼兽先天体魄更壮。","建造":5200,"工期":60,"维护":190,"积累":5},{"级":4,"效果":"王庭气象初成，周边低阶魂兽族群敬畏臣服，领地声势与号召力显著增强。","建造":12000,"工期":95,"维护":420,"积累":8},{"级":5,"效果":"霸主级万兽王庭主巢，十万年与凶兽族老沉睡休养可大幅锁住本源气血不泄。","建造":27000,"工期":140,"维护":920,"积累":12}]},"血脉祖地":{"类别":"血脉","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":6,"前置":{"位阶":"一方名门"},"等级":[{"级":1,"效果":"跨部万年换代时血脉每千年稀释系数补正至0.93；新生血亲门人出生浓度微增2点。","建造":6000,"工期":45,"维护":220,"积累":4},{"级":2,"效果":"跨部万年血脉每千年稀释系数补正至0.95；门人入祖地静思唤醒第1层觉醒更容易。","建造":13500,"工期":75,"维护":480,"积累":6},{"级":3,"效果":"跨部万年血脉每千年稀释系数补正至0.96；新生血亲门人出生浓度建议值上浮5点。","建造":28000,"工期":115,"维护":980,"积累":10},{"级":4,"效果":"跨部万年血脉每千年稀释系数补正至0.97；门人闭关触发血脉返祖所需机缘门槛降低。","建造":58000,"工期":160,"维护":1950,"积累":14},{"级":5,"效果":"跨部万年血脉每千年稀释系数补正至0.98；封印式血脉门人冲击封印时气血反噬减轻15%。","建造":110000,"工期":215,"维护":3600,"积累":19},{"级":6,"效果":"本源威压长存，跨部万年血脉每千年稀释系数达0.99，近乎锁住嫡系血统历经万年不衰。","建造":190000,"工期":280,"维护":6200,"积累":26}]},"淬血灵池":{"类别":"血脉","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"百草灵药园","等级":2},"等级":[{"级":1,"效果":"浓度30以下有血脉门人每年药浴1次可提纯浓度1点，无血脉门人亦可强健气血。","建造":3500,"工期":30,"维护":140,"积累":2},{"级":2,"效果":"浓度45以下有血脉门人每年药浴可提纯浓度1至2点，缓解血脉冲突躁动。","建造":7800,"工期":55,"维护":300,"积累":4},{"级":3,"效果":"浓度60以下有血脉门人药浴可提纯浓度2点，血脉魂环技气血消耗恢复加快20%。","建造":16500,"工期":85,"维护":620,"积累":6},{"级":4,"效果":"浓度75以下有血脉门人药浴可稳步提纯浓度2至3点（守单轮上限），跨部稀释略缓。","建造":35000,"工期":125,"维护":1250,"积累":10},{"级":5,"效果":"龙力池级秘浴：浓度85以下门人亦可借宝药精血提纯浓度，冲击血脉返祖成功率增15%。","建造":72000,"工期":175,"维护":2450,"积累":15}]},"血脉圣池":{"类别":"血脉","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":6,"前置":{"设施":"万兽祖巢","等级":2},"等级":[{"级":1,"效果":"跨部万年血脉每千年稀释系数补正至0.94；新生幼兽浸池洗礼出生浓度微增3点。","建造":4500,"工期":35,"维护":170,"积累":3},{"级":2,"效果":"跨部万年血脉每千年稀释系数补正至0.95；浓度50以下族兽浸池每年可提纯1至2点。","建造":10000,"工期":65,"维护":380,"积累":5},{"级":3,"效果":"跨部万年血脉每千年稀释系数补正至0.96；下位亚种族兽浸池触发血脉变异或返祖率微增。","建造":22000,"工期":100,"维护":800,"积累":8},{"级":4,"效果":"跨部万年血脉每千年稀释系数补正至0.97；浓度75以下族兽浸池提纯效率提升，气血暴涨。","建造":46000,"工期":145,"维护":1600,"积累":13},{"级":5,"效果":"跨部万年血脉每千年稀释系数补正至0.98；族兽觉醒上位天赋魂兽技时反噬大幅降低。","建造":92000,"工期":200,"维护":3100,"积累":18},{"级":6,"效果":"神兽本源化生池，跨部万年每千年稀释系数达0.99，王族后裔高概率继承高浓度真血。","建造":165000,"工期":265,"维护":5400,"积累":25}]},"宗门祖祠":{"类别":"祭祀","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"岁时祭祀先祖，门人背叛概率微降，每月稳定积累2点宗门底蕴。","建造":1000,"工期":20,"维护":30,"积累":2},{"级":2,"效果":"镌刻祖训家风，大难临头时人心滑落幅度减缓20%，每月积累4点底蕴。","建造":2500,"工期":40,"维护":75,"积累":4},{"级":3,"效果":"先祖遗泽昭彰，换代交接时新传人获宗门长辈初始好感更高，每月积累7点底蕴。","建造":6000,"工期":65,"维护":180,"积累":7},{"级":4,"效果":"百年香火不绝，动用底蕴护宗时每一百底蕴发挥效力提升15%，每月积累11点底蕴。","建造":14000,"工期":100,"维护":400,"积累":11},{"级":5,"效果":"万世宗祠气象，哪怕遭遇覆灭重立亦能更快重聚旧部人心，每月积累16点底蕴。","建造":30000,"工期":145,"维护":850,"积累":16}]},"神祇祈愿坛":{"类别":"祭祀","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"位阶":"一流大宗"},"等级":[{"级":1,"效果":"凝聚门人祈愿念力，每月积累4点底蕴；有飞升老祖时下界传讯感应更清晰。","建造":8000,"工期":50,"维护":260,"积累":4},{"级":2,"效果":"圣光洗礼心神，门人抵御邪魂师怨灵侵蚀能力增强，每月积累7点底蕴。","建造":18000,"工期":85,"维护":580,"积累":7},{"级":3,"效果":"神赐武魂家族在此觉醒仪式时先天魂力更易贴近高值，每月积累11点底蕴。","建造":38000,"工期":130,"维护":1200,"积累":11},{"级":4,"效果":"若主角身在神界或英雄部，下界投影降临宗门令损耗减轻，每月积累16点底蕴（斗3神界失联期仅留余泽）。","建造":76000,"工期":185,"维护":2400,"积累":16},{"级":5,"效果":"神恩泽被万年（绝不直给神位或神考），镇宗神器存放于坛上时护宗威慑大增，月积23点底蕴。","建造":150000,"工期":250,"维护":4600,"积累":23}]},"先祖兽骨坛":{"类别":"祭祀","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"供奉先祖遗骨，族中魂兽凝聚力稳固，每月积累2点宗门底蕴。","建造":1000,"工期":20,"维护":30,"积累":2},{"级":2,"效果":"骨坛散逸不屈战意，族兽面对强敌恐惧退缩率降低，每月积累4点底蕴。","建造":2600,"工期":40,"维护":80,"积累":4},{"级":3,"效果":"幼兽于骨坛前观想先祖真形，领悟本族传承魂兽技更快，每月积累7点底蕴。","建造":6200,"工期":70,"维护":190,"积累":7},{"级":4,"效果":"遗骸余威镇压气运，动用底蕴请先祖战魂虚影护佑领地时威力增15%，月积11点底蕴。","建造":14500,"工期":105,"维护":420,"积累":11},{"级":5,"效果":"万古龙墓级图腾圣坛，跨部万年结算时族群覆灭风险降低，每月积累17点底蕴。","建造":32000,"工期":150,"维护":900,"积累":17}]},"鉴宝珍藏库":{"类别":"其他","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"位阶":"地方豪强"},"等级":[{"级":1,"效果":"加固地窖暗锁，公库物资遭宵小窃取概率降低30%，药材金属防潮保鲜。","建造":2000,"工期":25,"维护":70,"积累":2},{"级":2,"效果":"配备鉴宝师案台，门人收购或缴获不明古物时识破赝品与辨明暗藏价值概率增25%。","建造":4800,"工期":45,"维护":160,"积累":3},{"级":3,"效果":"铅封玉匣隔绝魂骨与仙草气息外泄，降低因怀璧其罪招致强敌觊觎的风险。","建造":11000,"工期":75,"维护":350,"积累":6},{"级":4,"效果":"断龙石与自毁封门机关齐备，即便山门被破亦可保半数核心物资与镇宗之宝不失。","建造":24000,"工期":115,"维护":750,"积累":9},{"级":5,"效果":"半位面或储物枢机级宝库，跨部万年兴衰结算时镇宗之宝留存率额外提升15%。","建造":52000,"工期":165,"维护":1550,"积累":14}]},"传讯情报堂":{"类别":"其他","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"等级":[{"级":1,"效果":"收集周边城池风声，外地产业遭遇打压或盗匪窥伺时可提前传回预警。","建造":1200,"工期":20,"维护":50,"积累":1},{"级":2,"效果":"铺开行省眼线，寻访野生魂兽踪迹或拍卖会奇珍消息的效率提升20%。","建造":3000,"工期":35,"维护":120,"积累":2},{"级":3,"效果":"设立敏堂级专职暗哨，外交交涉与刺探敌对势力虚实时掌握主动，产业风险率降15%。","建造":7000,"工期":60,"维护":270,"积累":4},{"级":4,"效果":"跨地域严密情报网，邪魂师袭扰、猎魂奇袭或大军压境前必得先机预警。","建造":16000,"工期":95,"维护":580,"积累":7},{"级":5,"效果":"耳目遍及各大帝国或联邦高层，散播舆论单轮提升宗门声势更容易，反间防谍严密。","建造":35000,"工期":140,"维护":1200,"积累":11}]},"星际停泊港":{"类别":"其他","适用":["宗门","家族","门派","学院"],"部":["斗4"],"最高等级":5,"前置":{"位阶":"一流大宗"},"等级":[{"级":1,"效果":"可停靠民用星际穿梭艇与小型运输舰，门人往返母星与各行政星耗时减半。","建造":15000,"工期":60,"维护":550,"积累":4},{"级":2,"效果":"配备护卫舰整备泊位与空天雷达，支撑开启重工殖装船厂与外星采矿调度。","建造":32000,"工期":95,"维护":1150,"积累":7},{"级":3,"效果":"可停靠星际探索舰与流星级攻击舰，星际远航商社遭遇海盗拦截时支援速度大增。","建造":68000,"工期":145,"维护":2400,"积累":11},{"级":4,"效果":"轨道级大型空港，具备战列舰护盾充能与反物质或魂导能源补给能力，威慑一方星域。","建造":135000,"工期":205,"维护":4600,"积累":16},{"级":5,"效果":"母舰级深空星港，可整备三十三天翼级特混舰队，宗门跨星系投送与撤离畅通无阻。","建造":240000,"工期":280,"维护":8200,"积累":24}]}},"产业":{"灵草药堂":{"类别":"药铺","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"风险":"地头蛇药商联手压价断供药材，或遭受伤邪魂师夜闯劫药。","等级":[{"级":1,"月产出":{"币值":220,"物资":[{"名称":"金创止血散","数量":2}]},"建造":1800,"工期":15,"维护":35},{"级":2,"月产出":{"币值":480,"物资":[{"名称":"金创止血散","数量":4}]},"建造":4000,"工期":30,"维护":75},{"级":3,"月产出":{"币值":980,"物资":[{"名称":"百年固本草","数量":1}]},"建造":8500,"工期":50,"维护":150},{"级":4,"月产出":{"币值":1950,"物资":[{"名称":"百年固本草","数量":2}]},"建造":17500,"工期":80,"维护":300},{"级":5,"月产出":{"币值":3800,"物资":[{"名称":"五百年灵参","数量":1}]},"建造":35000,"工期":115,"维护":580}]},"奇珍仙药阁":{"类别":"药铺","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"百草灵药园","等级":2},"风险":"珍稀灵草消息走漏易引来强横封号觊觎强买，或卷入权贵毒杀构陷。","等级":[{"级":1,"月产出":{"币值":550,"物资":[{"名称":"百年蕴魂草","数量":1}]},"建造":4800,"工期":30,"维护":90},{"级":2,"月产出":{"币值":1180,"物资":[{"名称":"百年蕴魂草","数量":2}]},"建造":10500,"工期":55,"维护":190},{"级":3,"月产出":{"币值":2400,"物资":[{"名称":"千年洗髓芝","数量":1}]},"建造":22000,"工期":85,"维护":400},{"级":4,"月产出":{"币值":4800,"物资":[{"名称":"千年洗髓芝","数量":2}]},"建造":45000,"工期":120,"维护":820},{"级":5,"月产出":{"币值":9200,"物资":[{"名称":"三千年奇茸药露","数量":1}]},"建造":88000,"工期":165,"维护":1600}]},"培元丹坊":{"类别":"丹坊","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"百草灵药园","等级":1},"风险":"丹师被敌对宗门重金挖角窃方，或火候失控炸炉引燃药材。","等级":[{"级":1,"月产出":{"币值":320,"物资":[{"名称":"回魂培元丸","数量":2}]},"建造":2800,"工期":20,"维护":55},{"级":2,"月产出":{"币值":680,"物资":[{"名称":"回魂培元丸","数量":4}]},"建造":6000,"工期":40,"维护":120},{"级":3,"月产出":{"币值":1400,"物资":[{"名称":"清心宁神丹","数量":2}]},"建造":12800,"工期":65,"维护":250},{"级":4,"月产出":{"币值":2850,"物资":[{"名称":"玄水洗髓丸","数量":1}]},"建造":26000,"工期":95,"维护":500},{"级":5,"月产出":{"币值":5600,"物资":[{"名称":"玄水洗髓丸","数量":2}]},"建造":52000,"工期":135,"维护":980}]},"秘传灵膏坊":{"类别":"丹坊","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"位阶":"一方名门"},"风险":"上游魂兽骨髓货源断绝导致停炉，或仿冒劣膏流入市面折损声势。","等级":[{"级":1,"月产出":{"币值":620,"物资":[{"名称":"壮骨气血膏","数量":2}]},"建造":5500,"工期":35,"维护":110},{"级":2,"月产出":{"币值":1320,"物资":[{"名称":"壮骨气血膏","数量":3}]},"建造":12000,"工期":60,"维护":240},{"级":3,"月产出":{"币值":2700,"物资":[{"名称":"凝神蕴脉膏","数量":2}]},"建造":25000,"工期":90,"维护":480},{"级":4,"月产出":{"币值":5400,"物资":[{"名称":"万年兽髓灵膏","数量":1}]},"建造":50000,"工期":130,"维护":950},{"级":5,"月产出":{"币值":10500,"物资":[{"名称":"万年兽髓灵膏","数量":2}]},"建造":98000,"工期":180,"维护":1850}]},"精铁兵甲铺":{"类别":"锻造铺","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄"],"最高等级":5,"前置":null,"风险":"战乱时易被帝国官军强行征调铁匠与军械，或遭铁匠协会排挤。","等级":[{"级":1,"月产出":{"币值":240,"物资":[{"名称":"百炼精铁锭","数量":2}]},"建造":2000,"工期":15,"维护":40},{"级":2,"月产出":{"币值":520,"物资":[{"名称":"百炼精铁锭","数量":4}]},"建造":4400,"工期":30,"维护":85},{"级":3,"月产出":{"币值":1080,"物资":[{"名称":"寒心铁精","数量":1}]},"建造":9200,"工期":55,"维护":180},{"级":4,"月产出":{"币值":2200,"物资":[{"名称":"寒心铁精","数量":2}]},"建造":19000,"工期":85,"维护":360},{"级":5,"月产出":{"币值":4300,"物资":[{"名称":"深海沉银胚","数量":1}]},"建造":38000,"工期":120,"维护":700}]},"机括暗器行":{"类别":"锻造铺","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2"],"最高等级":5,"前置":{"设施":"机括暗器坊","等级":1},"风险":"武魂殿或敌国密探潜入窃取机括图纸，或因军火流向引来朝廷猜忌。","等级":[{"级":1,"月产出":{"币值":420,"物资":[{"名称":"精铁弩箭匣","数量":2}]},"建造":3600,"工期":25,"维护":70},{"级":2,"月产出":{"币值":900,"物资":[{"名称":"无声袖箭","数量":2}]},"建造":7800,"工期":45,"维护":150},{"级":3,"月产出":{"币值":1880,"物资":[{"名称":"诸葛神弩","数量":1}]},"建造":16500,"工期":75,"维护":320},{"级":4,"月产出":{"币值":3800,"物资":[{"名称":"诸葛神弩","数量":2}]},"建造":34000,"工期":110,"维护":650},{"级":5,"月产出":{"币值":7500,"物资":[{"名称":"子母追魂夺命胆","数量":1}]},"建造":68000,"工期":150,"维护":1300}]},"千锻金属行":{"类别":"锻造铺","适用":["宗门","家族","门派","学院"],"部":["斗3","斗4"],"最高等级":6,"前置":{"设施":"百炼锻造坊","等级":2},"风险":"锻造师协会严查品级认证，或稀有原矿暴涨挤压加工利润。","等级":[{"级":1,"月产出":{"币值":380,"物资":[{"名称":"百锻沉银块","数量":2}]},"建造":3200,"工期":20,"维护":65},{"级":2,"月产出":{"币值":820,"物资":[{"名称":"千锻钨钢","数量":1}]},"建造":7000,"工期":40,"维护":140},{"级":3,"月产出":{"币值":1700,"物资":[{"名称":"千锻沉银","数量":1}]},"建造":15000,"工期":65,"维护":300},{"级":4,"月产出":{"币值":3500,"物资":[{"名称":"千锻一品有灵金属","数量":1}]},"建造":31000,"工期":95,"维护":620},{"级":5,"月产出":{"币值":7000,"物资":[{"名称":"灵锻稀有合金","数量":1}]},"建造":64000,"工期":135,"维护":1250},{"级":6,"月产出":{"币值":13500,"物资":[{"名称":"魂锻金属胚","数量":1}]},"建造":125000,"工期":185,"维护":2400}]},"奇珍拍卖场":{"类别":"拍卖行","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":6,"前置":{"位阶":"一方名门"},"风险":"压轴重宝现世易引来强盗团或封号强者半路截杀买主、冲击拍场。","等级":[{"级":1,"月产出":{"币值":780,"物资":[]},"建造":7000,"工期":40,"维护":150},{"级":2,"月产出":{"币值":1680,"物资":[]},"建造":15000,"工期":70,"维护":320},{"级":3,"月产出":{"币值":3500,"物资":[{"名称":"百年奇珍匣","数量":1}]},"建造":32000,"工期":105,"维护":680},{"级":4,"月产出":{"币值":7200,"物资":[{"名称":"千年奇珍匣","数量":1}]},"建造":66000,"工期":150,"维护":1400},{"级":5,"月产出":{"币值":14200,"物资":[{"名称":"稀有金属精粹","数量":1}]},"建造":130000,"工期":200,"维护":2800},{"级":6,"月产出":{"币值":26500,"物资":[{"名称":"万年压轴宝材","数量":1}]},"建造":240000,"工期":260,"维护":5200}]},"黑市暗拍会":{"类别":"拍卖行","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","斗3","斗4"],"最高等级":5,"前置":{"位阶":"地方豪强"},"风险":"极易遭帝国军警或执法队围剿查封，亦常被邪魂师黑吃黑血洗。","等级":[{"级":1,"月产出":{"币值":560,"物资":[]},"建造":4500,"工期":25,"维护":90},{"级":2,"月产出":{"币值":1220,"物资":[]},"建造":9800,"工期":45,"维护":200},{"级":3,"月产出":{"币值":2550,"物资":[{"名称":"暗市秘宝囊","数量":1}]},"建造":21000,"工期":75,"维护":420},{"级":4,"月产出":{"币值":5200,"物资":[{"名称":"违禁定装核心","数量":1}]},"建造":44000,"工期":115,"维护":880},{"级":5,"月产出":{"币值":10200,"物资":[{"名称":"秘藏古残卷","数量":1}]},"建造":88000,"工期":160,"维护":1750}]},"精铁矿山":{"类别":"矿脉","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"风险":"地底坑道坍塌透水伤及矿工，或挖通地穴惊醒潜伏的千年穴居魂兽。","等级":[{"级":1,"月产出":{"币值":260,"物资":[{"名称":"精铁原矿","数量":5}]},"建造":2200,"工期":20,"维护":45},{"级":2,"月产出":{"币值":560,"物资":[{"名称":"精铁原矿","数量":10}]},"建造":4800,"工期":40,"维护":95},{"级":3,"月产出":{"币值":1180,"物资":[{"名称":"板晶伴生矿","数量":2}]},"建造":10200,"工期":65,"维护":200},{"级":4,"月产出":{"币值":2400,"物资":[{"名称":"乌钢母矿","数量":2}]},"建造":21500,"工期":95,"维护":420},{"级":5,"月产出":{"币值":4700,"物资":[{"名称":"寒铁髓矿","数量":2}]},"建造":43000,"工期":135,"维护":820}]},"稀有金属矿脉":{"类别":"矿脉","适用":["宗门","家族","门派","学院"],"部":["斗2","斗3","斗4"],"最高等级":6,"前置":{"位阶":"地方豪强"},"风险":"极易遭日月皇室、联邦军工财团或敌对大宗巧取豪夺与武装侵占。","等级":[{"级":1,"月产出":{"币值":650,"物资":[{"名称":"沉银原矿","数量":2}]},"建造":6000,"工期":35,"维护":120},{"级":2,"月产出":{"币值":1400,"物资":[{"名称":"星银原矿","数量":2}]},"建造":13000,"工期":60,"维护":260},{"级":3,"月产出":{"币值":2950,"物资":[{"名称":"水晶银矿","数量":2}]},"建造":27500,"工期":95,"维护":550},{"级":4,"月产出":{"币值":6000,"物资":[{"名称":"秘银精矿","数量":2}]},"建造":56000,"工期":135,"维护":1100},{"级":5,"月产出":{"币值":12000,"物资":[{"名称":"金晶伴生矿","数量":1}]},"建造":110000,"工期":185,"维护":2200},{"级":6,"月产出":{"币值":22500,"物资":[{"名称":"天星铁精粹","数量":1}]},"建造":205000,"工期":245,"维护":4200}]},"源龙晶石矿场":{"类别":"矿脉","适用":["宗门","家族","门派","学院"],"部":["斗4"],"最高等级":6,"前置":{"位阶":"一流大宗"},"风险":"外星野生源龙兽潮暴动冲击矿区，或遭星际海盗与龙马星系强族袭掠。","等级":[{"级":1,"月产出":{"币值":1100,"物资":[{"名称":"星际稀有原矿","数量":3}]},"建造":10000,"工期":45,"维护":220},{"级":2,"月产出":{"币值":2350,"物资":[{"名称":"高能灵晶","数量":2}]},"建造":21500,"工期":75,"维护":460},{"级":3,"月产出":{"币值":4900,"物资":[{"名称":"空源晶碎块","数量":1}]},"建造":45000,"工期":115,"维护":950},{"级":4,"月产出":{"币值":9800,"物资":[{"名称":"龙源金原矿","数量":1}]},"建造":92000,"工期":160,"维护":1950},{"级":5,"月产出":{"币值":19000,"物资":[{"名称":"提纯龙源晶","数量":1}]},"建造":180000,"工期":215,"维护":3800},{"级":6,"月产出":{"币值":35000,"物资":[{"名称":"高阶源龙核心晶","数量":1}]},"建造":330000,"工期":280,"维护":7000}]},"伴生灵晶矿窟":{"类别":"矿脉","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"风险":"人类高阶寻矿猎魂团循灵气波动潜入盗采，或异种地底魂兽争巢。","等级":[{"级":1,"月产出":{"币值":240,"物资":[{"名称":"地脉灵石","数量":2}]},"建造":1800,"工期":20,"维护":35},{"级":2,"月产出":{"币值":520,"物资":[{"名称":"地脉灵石","数量":4}]},"建造":4000,"工期":35,"维护":75},{"级":3,"月产出":{"币值":1120,"物资":[{"名称":"千年寒髓玉","数量":1}]},"建造":8800,"工期":60,"维护":165},{"级":4,"月产出":{"币值":2300,"物资":[{"名称":"千年寒髓玉","数量":2}]},"建造":18500,"工期":95,"维护":340},{"级":5,"月产出":{"币值":4600,"物资":[{"名称":"万年地心髓晶","数量":1}]},"建造":38000,"工期":135,"维护":700}]},"行省陆路商队":{"类别":"商队","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2"],"最高等级":5,"前置":null,"风险":"途经荒山易遭狼盗、马贼或堕落魂师劫镖，两国交战时关隘封锁断路。","等级":[{"级":1,"月产出":{"币值":230,"物资":[]},"建造":1800,"工期":15,"维护":40},{"级":2,"月产出":{"币值":500,"物资":[]},"建造":4000,"工期":30,"维护":85},{"级":3,"月产出":{"币值":1050,"物资":[{"名称":"异域特产礼匣","数量":1}]},"建造":8600,"工期":50,"维护":180},{"级":4,"月产出":{"币值":2150,"物资":[{"名称":"异域特产礼匣","数量":2}]},"建造":18000,"工期":80,"维护":370},{"级":5,"月产出":{"币值":4200,"物资":[{"名称":"跨国珍稀矿药箱","数量":1}]},"建造":36000,"工期":115,"维护":720}]},"魂导列车货运线":{"类别":"商队","适用":["宗门","家族","门派","学院"],"部":["斗3","斗4"],"最高等级":5,"前置":{"位阶":"地方豪强"},"风险":"邪魂师恐怖袭击炸毁铁轨劫车（如圣灵教袭车），或联邦市政严查扣货。","等级":[{"级":1,"月产出":{"币值":420,"物资":[]},"建造":3500,"工期":25,"维护":75},{"级":2,"月产出":{"币值":920,"物资":[]},"建造":7600,"工期":45,"维护":160},{"级":3,"月产出":{"币值":1950,"物资":[{"名称":"魂导工业备件","数量":2}]},"建造":16500,"工期":75,"维护":340},{"级":4,"月产出":{"币值":4000,"物资":[{"名称":"高纯稀有金属箱","数量":1}]},"建造":34000,"工期":110,"维护":700},{"级":5,"月产出":{"币值":7800,"物资":[{"名称":"高纯稀有金属箱","数量":2}]},"建造":68000,"工期":150,"维护":1400}]},"民用魂导器厂":{"类别":"魂导器厂","适用":["宗门","家族","门派","学院"],"部":["斗2","斗3","斗4"],"最高等级":5,"前置":{"设施":"魂导工坊","等级":1},"风险":"同行巨头发起专利诉讼与价格战倾销，或核心铭刻技师遭高薪挖走。","等级":[{"级":1,"月产出":{"币值":360,"物资":[{"名称":"民用魂导阵盘","数量":2}]},"建造":3000,"工期":25,"维护":65},{"级":2,"月产出":{"币值":780,"物资":[{"名称":"魂导通讯器","数量":2}]},"建造":6600,"工期":45,"维护":140},{"级":3,"月产出":{"币值":1650,"物资":[{"名称":"一立方储物戒","数量":1}]},"建造":14200,"工期":70,"维护":300},{"级":4,"月产出":{"币值":3400,"物资":[{"名称":"民用魂导汽车核心","数量":1}]},"建造":29500,"工期":105,"维护":620},{"级":5,"月产出":{"币值":6800,"物资":[{"名称":"十立方高阶储物镯","数量":1}]},"建造":60000,"工期":145,"维护":1250}]},"军工魂导兵工厂":{"类别":"魂导器厂","适用":["宗门","家族","门派","学院"],"部":["斗2","英雄","斗3","斗4"],"最高等级":6,"前置":{"设施":"魂导工坊","等级":3},"风险":"定装弹药库一旦失火或遇袭将引发毁灭爆炸，且受帝国或联邦军部严密监管。","等级":[{"级":1,"月产出":{"币值":720,"物资":[{"名称":"3级魂导射线枪","数量":1}]},"建造":6500,"工期":40,"维护":140},{"级":2,"月产出":{"币值":1550,"物资":[{"名称":"4级护身魂导罩","数量":1}]},"建造":14000,"工期":65,"维护":300},{"级":3,"月产出":{"币值":3250,"物资":[{"名称":"4级定装魂导炮弹","数量":1}]},"建造":30000,"工期":100,"维护":640},{"级":4,"月产出":{"币值":6600,"物资":[{"名称":"5级定装魂导炮弹","数量":1}]},"建造":62000,"工期":140,"维护":1300},{"级":5,"月产出":{"币值":13200,"物资":[{"名称":"6级定装魂导炮弹","数量":1}]},"建造":122000,"工期":195,"维护":2600},{"级":6,"月产出":{"币值":24800,"物资":[{"名称":"7级定装魂导炮弹","数量":1}]},"建造":230000,"工期":255,"维护":4900}]},"定制斗铠坊":{"类别":"斗铠工坊","适用":["宗门","家族","门派","学院"],"部":["斗3","斗4"],"最高等级":6,"前置":{"设施":"斗铠工坊","等级":2},"风险":"高阶客户定制部件若铭刻失败须赔付天价违约金，或遭传灵塔与同业封杀。","等级":[{"级":1,"月产出":{"币值":800,"物资":[]},"建造":7200,"工期":40,"维护":160},{"级":2,"月产出":{"币值":1750,"物资":[{"名称":"千锻斗铠修复件","数量":1}]},"建造":15500,"工期":70,"维护":340},{"级":3,"月产出":{"币值":3650,"物资":[{"名称":"一字斗铠标准胚件","数量":1}]},"建造":33000,"工期":105,"维护":720},{"级":4,"月产出":{"币值":7400,"物资":[{"名称":"灵锻斗铠修复件","数量":1}]},"建造":68000,"工期":145,"维护":1480},{"级":5,"月产出":{"币值":14800,"物资":[{"名称":"二字斗铠核心胚件","数量":1}]},"建造":135000,"工期":200,"维护":2900},{"级":6,"月产出":{"币值":27500,"物资":[{"名称":"魂锻斗铠精修匣","数量":1}]},"建造":250000,"工期":265,"维护":5400}]},"制式机甲制造厂":{"类别":"机甲厂","适用":["宗门","家族","门派","学院"],"部":["斗3","斗4"],"最高等级":6,"前置":{"设施":"机甲工坊","等级":2},"风险":"联邦军方削减采购订单引发产能积压，或机甲师协会抽检曝出动力炉缺陷。","等级":[{"级":1,"月产出":{"币值":700,"物资":[{"名称":"白级机甲备用件","数量":2}]},"建造":6200,"工期":35,"维护":140},{"级":2,"月产出":{"币值":1520,"物资":[{"名称":"黄级机甲动力核心","数量":1}]},"建造":13500,"工期":65,"维护":300},{"级":3,"月产出":{"币值":3200,"物资":[{"名称":"黄级制式机甲整机","数量":1}]},"建造":29000,"工期":100,"维护":640},{"级":4,"月产出":{"币值":6500,"物资":[{"名称":"紫级机甲改装套件","数量":1}]},"建造":60000,"工期":140,"维护":1300},{"级":5,"月产出":{"币值":13000,"物资":[{"名称":"紫级专属机甲骨架","数量":1}]},"建造":120000,"工期":195,"维护":2600},{"级":6,"月产出":{"币值":24500,"物资":[{"名称":"黑级机甲合金装甲包","数量":1}]},"建造":225000,"工期":255,"维护":4800}]},"重工殖装船厂":{"类别":"机甲厂","适用":["宗门","家族","门派","学院"],"部":["斗4"],"最高等级":6,"前置":{"设施":"星际停泊港","等级":2},"风险":"斗罗联邦舰队战时强行军管船坞，或深红之域与敌对间谍破坏星港船台。","等级":[{"级":1,"月产出":{"币值":1250,"物资":[{"名称":"星际战机护盾模块","数量":1}]},"建造":11500,"工期":50,"维护":260},{"级":2,"月产出":{"币值":2700,"物资":[{"名称":"高能推进引擎","数量":1}]},"建造":25000,"工期":85,"维护":560},{"级":3,"月产出":{"币值":5600,"物资":[{"名称":"制式星际侦察机","数量":1}]},"建造":52000,"工期":125,"维护":1150},{"级":4,"月产出":{"币值":11200,"物资":[{"名称":"流星级星际战机组件","数量":1}]},"建造":105000,"工期":175,"维护":2300},{"级":5,"月产出":{"币值":21800,"物资":[{"名称":"护卫舰主炮阵列","数量":1}]},"建造":205000,"工期":230,"维护":4500},{"级":6,"月产出":{"币值":39000,"物资":[{"名称":"正向循环源泉核心","数量":1}]},"建造":380000,"工期":300,"维护":8200}]},"灵谷农庄":{"类别":"田庄","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"风险":"旱涝蝗灾导致当季歉收萧条，或流窜魂兽踩踏庄稼惊扰佃户。","等级":[{"级":1,"月产出":{"币值":130,"物资":[{"名称":"精白灵米","数量":5}]},"建造":900,"工期":15,"维护":20},{"级":2,"月产出":{"币值":280,"物资":[{"名称":"精白灵米","数量":10}]},"建造":2000,"工期":25,"维护":40},{"级":3,"月产出":{"币值":580,"物资":[{"名称":"温血兽脯","数量":4}]},"建造":4300,"工期":45,"维护":85},{"级":4,"月产出":{"币值":1180,"物资":[{"名称":"百年灵穗米","数量":2}]},"建造":9000,"工期":70,"维护":175},{"级":5,"月产出":{"币值":2350,"物资":[{"名称":"百年灵穗米","数量":5}]},"建造":18500,"工期":100,"维护":350}]},"百果灵木园":{"类别":"田庄","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"风险":"寒潮霜冻冻伤灵木花期，或飞禽类魂兽成群啄食将熟灵果。","等级":[{"级":1,"月产出":{"币值":150,"物资":[{"名称":"百花灵酿","数量":2}]},"建造":1100,"工期":15,"维护":25},{"级":2,"月产出":{"币值":330,"物资":[{"名称":"百花灵酿","数量":4}]},"建造":2400,"工期":30,"维护":50},{"级":3,"月产出":{"币值":680,"物资":[{"名称":"玉髓朱果","数量":2}]},"建造":5200,"工期":50,"维护":105},{"级":4,"月产出":{"币值":1400,"物资":[{"名称":"百年猴儿灵酒","数量":2}]},"建造":10800,"工期":75,"维护":215},{"级":5,"月产出":{"币值":2800,"物资":[{"名称":"千年灵木芯","数量":1}]},"建造":22000,"工期":110,"维护":420}]},"天材地宝灵谷":{"类别":"田庄","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"风险":"异香远飘极易招引邻近领地强大魂兽越界争食，或人类采药人冒险潜入。","等级":[{"级":1,"月产出":{"币值":210,"物资":[{"名称":"百年赤阳果","数量":2}]},"建造":1600,"工期":20,"维护":30},{"级":2,"月产出":{"币值":460,"物资":[{"名称":"百年赤阳果","数量":4}]},"建造":3600,"工期":35,"维护":65},{"级":3,"月产出":{"币值":980,"物资":[{"名称":"千年紫芝","数量":1}]},"建造":7800,"工期":60,"维护":145},{"级":4,"月产出":{"币值":2050,"物资":[{"名称":"千年龙血果","数量":1}]},"建造":16500,"工期":90,"维护":300},{"级":5,"月产出":{"币值":4100,"物资":[{"名称":"五千年地灵宝参","数量":1}]},"建造":34000,"工期":130,"维护":620}]},"珍馐药膳楼":{"类别":"酒楼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"风险":"醉酒高阶魂师在楼内斗殴拆楼，或纨绔权贵吃霸王餐借题生事。","等级":[{"级":1,"月产出":{"币值":190,"物资":[{"名称":"气血药膳匣","数量":2}]},"建造":1500,"工期":15,"维护":30},{"级":2,"月产出":{"币值":410,"物资":[{"名称":"气血药膳匣","数量":4}]},"建造":3300,"工期":30,"维护":65},{"级":3,"月产出":{"币值":860,"物资":[{"名称":"百年兽髓羹","数量":2}]},"建造":7200,"工期":50,"维护":140},{"级":4,"月产出":{"币值":1780,"物资":[{"名称":"千年珍馐宴席券","数量":1}]},"建造":15000,"工期":80,"维护":290},{"级":5,"月产出":{"币值":3500,"物资":[{"名称":"千年珍馐宴席券","数量":2}]},"建造":31000,"工期":115,"维护":580}]},"魂师茗茶馆":{"类别":"酒楼","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":4,"前置":null,"风险":"三教九流混杂易成悬赏通缉犯藏身地，牵连茶馆遭城防军盘查停业。","等级":[{"级":1,"月产出":{"币值":120,"物资":[{"名称":"清心雾茶","数量":2}]},"建造":850,"工期":12,"维护":18},{"级":2,"月产出":{"币值":260,"物资":[{"名称":"清心雾茶","数量":4}]},"建造":1900,"工期":25,"维护":40},{"级":3,"月产出":{"币值":540,"物资":[{"名称":"百年醒神茶饼","数量":1}]},"建造":4100,"工期":45,"维护":85},{"级":4,"月产出":{"币值":1100,"物资":[{"名称":"百年醒神茶饼","数量":2}]},"建造":8600,"工期":70,"维护":175}]},"远洋海贸船队":{"类别":"航运","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","斗3"],"最高等级":5,"前置":{"位阶":"地方豪强"},"风险":"远洋飓风与万年海魂兽群（如邪魔虎鲸）袭船覆没，或遭海盗船队劫掠。","等级":[{"级":1,"月产出":{"币值":480,"物资":[{"名称":"瀚海珍珠","数量":2}]},"建造":4200,"工期":35,"维护":95},{"级":2,"月产出":{"币值":1050,"物资":[{"名称":"深海珊瑚玉","数量":2}]},"建造":9200,"工期":60,"维护":210},{"级":3,"月产出":{"币值":2250,"物资":[{"名称":"深海沉银原石","数量":1}]},"建造":20000,"工期":90,"维护":450},{"级":4,"月产出":{"币值":4650,"物资":[{"名称":"深海沉银原石","数量":2}]},"建造":42000,"工期":130,"维护":940},{"级":5,"月产出":{"币值":9200,"物资":[{"名称":"万年海魂奇珍","数量":1}]},"建造":85000,"工期":175,"维护":1850}]},"星际远航商社":{"类别":"航运","适用":["宗门","家族","门派","学院"],"部":["斗4"],"最高等级":6,"前置":{"位阶":"一流大宗"},"风险":"途经罪恶星球周边航道易遭星际海盗舰队伏击，虫洞风暴或星际战争断航。","等级":[{"级":1,"月产出":{"币值":1150,"物资":[]},"建造":10500,"工期":45,"维护":240},{"级":2,"月产出":{"币值":2500,"物资":[{"名称":"外星生态灵果","数量":2}]},"建造":23000,"工期":80,"维护":520},{"级":3,"月产出":{"币值":5200,"物资":[{"名称":"天罗稀有矿箱","数量":1}]},"建造":48000,"工期":120,"维护":1080},{"级":4,"月产出":{"币值":10500,"物资":[{"名称":"天养晶石碎粒","数量":1}]},"建造":98000,"工期":165,"维护":2150},{"级":5,"月产出":{"币值":20500,"物资":[{"名称":"龙马魔银锭","数量":1}]},"建造":195000,"工期":220,"维护":4200},{"级":6,"月产出":{"币值":38000,"物资":[{"名称":"高阶天养晶石","数量":1}]},"建造":360000,"工期":285,"维护":7800}]},"深海巡猎领海":{"类别":"航运","适用":["兽族"],"部":["斗1","斗2","斗3","斗4"],"最高等级":5,"前置":null,"风险":"与邪魔虎鲸或深海魔鲸等霸主领海摩擦血战，或遭人类远洋舰队声呐围猎。","等级":[{"级":1,"月产出":{"币值":250,"物资":[{"名称":"深海灵贝珠","数量":2}]},"建造":1900,"工期":20,"维护":40},{"级":2,"月产出":{"币值":550,"物资":[{"名称":"深海灵贝珠","数量":4}]},"建造":4200,"工期":40,"维护":85},{"级":3,"月产出":{"币值":1180,"物资":[{"名称":"海底沉银块","数量":1}]},"建造":9200,"工期":65,"维护":180},{"级":4,"月产出":{"币值":2450,"物资":[{"名称":"千年海魂晶","数量":1}]},"建造":19500,"工期":100,"维护":380},{"级":5,"月产出":{"币值":4900,"物资":[{"名称":"万年深海奇珍","数量":1}]},"建造":40000,"工期":140,"维护":760}]},"九宝商盟钱庄":{"类别":"其他","适用":["宗门","家族","门派","学院"],"部":["斗1","斗2","神界","英雄"],"最高等级":5,"前置":{"位阶":"一方名门"},"风险":"帝国更迭或大战爆发引发储户恐慌挤兑，或分号掌柜监守自盗卷款潜逃。","等级":[{"级":1,"月产出":{"币值":580,"物资":[]},"建造":5200,"工期":35,"维护":110},{"级":2,"月产出":{"币值":1280,"物资":[]},"建造":11500,"工期":60,"维护":240},{"级":3,"月产出":{"币值":2700,"物资":[]},"建造":24500,"工期":90,"维护":500},{"级":4,"月产出":{"币值":5600,"物资":[{"名称":"猫眼宝石匣","数量":1}]},"建造":50000,"工期":130,"维护":1020},{"级":5,"月产出":{"币值":11200,"物资":[{"名称":"极品琉璃奇珍","数量":1}]},"建造":98000,"工期":175,"维护":2000}]},"联邦跨界商社":{"类别":"其他","适用":["宗门","家族","门派","学院"],"部":["斗3","斗4"],"最高等级":6,"前置":{"位阶":"一方名门"},"风险":"联邦议会鹰派推动反垄断调查冻结账户，或遭传灵塔财阀恶意做空狙击。","等级":[{"级":1,"月产出":{"币值":760,"物资":[]},"建造":6800,"工期":35,"维护":150},{"级":2,"月产出":{"币值":1650,"物资":[]},"建造":14800,"工期":65,"维护":320},{"级":3,"月产出":{"币值":3500,"物资":[]},"建造":31500,"工期":100,"维护":680},{"级":4,"月产出":{"币值":7200,"物资":[{"名称":"传灵升灵入场券","数量":1}]},"建造":65000,"工期":140,"维护":1380},{"级":5,"月产出":{"币值":14500,"物资":[{"名称":"高阶魂导核心专利股","数量":1}]},"建造":130000,"工期":195,"维护":2750},{"级":6,"月产出":{"币值":27000,"物资":[{"名称":"联邦战略配给额度","数量":1}]},"建造":245000,"工期":255,"维护":5100}]},"领地附庸朝贡":{"类别":"其他","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":null,"风险":"附庸兽群遭人类大规模猎魂团屠戮殆尽，或外来万年凶兽挑唆附庸反叛。","等级":[{"级":1,"月产出":{"币值":140,"物资":[{"名称":"百兽血食贡品","数量":3}]},"建造":950,"工期":15,"维护":20},{"级":2,"月产出":{"币值":310,"物资":[{"名称":"百兽血食贡品","数量":6}]},"建造":2100,"工期":30,"维护":45},{"级":3,"月产出":{"币值":660,"物资":[{"名称":"百年灵果贡匣","数量":2}]},"建造":4600,"工期":50,"维护":95},{"级":4,"月产出":{"币值":1380,"物资":[{"名称":"千年奇珍贡品","数量":1}]},"建造":9800,"工期":80,"维护":200},{"级":5,"月产出":{"币值":2800,"物资":[{"名称":"千年奇珍贡品","数量":2}]},"建造":20500,"工期":115,"维护":410}]},"古林伴生秘境":{"类别":"其他","适用":["兽族"],"部":["斗1","斗2","神界","英雄","斗3","斗4"],"最高等级":5,"前置":{"设施":"领地守护结界","等级":2},"风险":"秘境空间裂隙偶发松动外泄宝光，引来人类封号斗罗或传灵塔强行勘探。","等级":[{"级":1,"月产出":{"币值":460,"物资":[{"名称":"灵泉甘露","数量":1}]},"建造":4000,"工期":30,"维护":85},{"级":2,"月产出":{"币值":1020,"物资":[{"名称":"灵泉甘露","数量":2}]},"建造":8800,"工期":55,"维护":185},{"级":3,"月产出":{"币值":2180,"物资":[{"名称":"千年木灵晶","数量":1}]},"建造":19000,"工期":85,"维护":390},{"级":4,"月产出":{"币值":4500,"物资":[{"名称":"万年生命泉露","数量":1}]},"建造":40000,"工期":125,"维护":800},{"级":5,"月产出":{"币值":9000,"物资":[{"名称":"万年天材精粹","数量":1}]},"建造":82000,"工期":170,"维护":1600}]}},"位阶":[{"名":"草莽微末","实力分":0,"左右格局":false,"份例":{"宗主":5,"长老":3,"核心弟子":2,"弟子":1}},{"名":"末流门户","实力分":90,"左右格局":false,"份例":{"宗主":15,"长老":10,"核心弟子":5,"弟子":2}},{"名":"地方豪强","实力分":180,"左右格局":false,"份例":{"宗主":40,"长老":25,"核心弟子":12,"弟子":5}},{"名":"一方名门","实力分":320,"左右格局":false,"份例":{"宗主":100,"长老":60,"核心弟子":30,"弟子":10}},{"名":"一流大宗","实力分":480,"左右格局":false,"份例":{"宗主":250,"长老":150,"核心弟子":75,"弟子":25}},{"名":"天下名宗","实力分":680,"左右格局":false,"份例":{"宗主":600,"长老":360,"核心弟子":180,"弟子":60}},{"名":"擎天巨擘","实力分":950,"左右格局":true,"份例":{"宗主":1500,"长老":900,"核心弟子":450,"弟子":150}},{"名":"万古道统","实力分":1350,"左右格局":true,"份例":{"宗主":3600,"长老":2200,"核心弟子":1000,"弟子":300}}],"开局最高":{"斗1":"天下名宗","斗2":"天下名宗","神界":"擎天巨擘","英雄":"擎天巨擘","斗3":"擎天巨擘","斗4":"擎天巨擘"},"兴衰档":[{"名":"鼎盛延续","相位":"鼎盛","说明":"万年岁月里代有大能辈出，顺应时代革新器道与功法，山门历劫不倒，威震新纪元。","折算":{"底蕴":0.85,"公库":0.35,"设施":"保留通用及符合下一部时代的设施且等级减 1（最低 1 级），过时设施转为 1 级损毁遗址","产业":"保留符合下一部时代的产业且等级减 1（最低 1 级），过时产业自动变卖折入公库","武魂":1,"功法":0.9,"镇宗之宝":0.8,"位阶":"重算实力分后保底不低于原位阶降 1 档，受下一部开局最高位阶封顶","门人":"有长存手段者留任老祖，并按鼎盛门庭生成 6 至 8 名新一代高阶与中坚门人"}},{"名":"中兴再起","相位":"中兴","说明":"万年里曾遭时代剧变而一度沉寂，幸得近几代惊才先辈顺势改制，重振声威再起风云。","折算":{"底蕴":0.65,"公库":0.25,"设施":"保留通用及符合下一部时代的设施且等级减 2（最低 1 级，原 1–2 级保留半数），其余转为损毁遗址","产业":"保留半数符合下一部时代的产业且等级减 1（最低 1 级），其余清零","武魂":1,"功法":0.8,"镇宗之宝":0.65,"位阶":"按折算后家底重算实力分，最高不超过原位阶降 1 档","门人":"有长存手段者留任老祖，生成 4 至 6 名锐意进取的新一代骨干门人"}},{"名":"守成","相位":"守成","说明":"万年风雨中谨守先祖基业，虽未再出惊世绝艳之辈，仍平稳过渡至新时代，根基尚存。","折算":{"底蕴":0.55,"公库":0.2,"设施":"保留通用设施等级减 2（最低 1 级，最多保留 4 座正常运转），其余转为 1 级损毁遗址","产业":"保留最多 3 处符合下一部时代的产业且等级降为 1 至 2 级","武魂":1,"功法":0.75,"镇宗之宝":0.55,"位阶":"按折算后家底重算实力分，通常较原位阶降 1 至 2 档","门人":"有长存手段者留任老祖，生成 3 至 5 名稳健守成的新一代门人"}},{"名":"中落","相位":"衰落","说明":"墨守成规未能跟上时代变革，又历数场战乱损耗，昔日外围产业凋零，门庭渐趋衰微。","折算":{"底蕴":0.35,"公库":0.1,"设施":"仅保留祖祠或藏经阁等 1 至 2 座 1 级基础设施正常运转，其余最多留 2 座损毁遗址","产业":"仅保留最多 1 处 1 级基础产业，其余全部散失","武魂":1,"功法":0.55,"镇宗之宝":0.3,"位阶":"按折算后家底重算实力分，通常跌至地方豪强或末流门户","门人":"有长存手段者留任闭死关老祖，仅生成 2 至 3 名勉力支应门庭的门人"}},{"名":"隐世","相位":"守成","说明":"为避灭顶大祸或时代倾轧而主动封闭山门、退隐秘境，外在声势与营生尽散而内蕴犹存。","折算":{"底蕴":0.6,"公库":0.12,"设施":"封闭山门保留护宗、藏经或血脉类设施 2 至 3 座（等级减 2，最低 1 级），声势重置为 10","产业":"外界世俗产业全部舍弃清零（兽族仅留 1 处 1 级伴生领地产业）","武魂":1,"功法":0.85,"镇宗之宝":0.7,"位阶":"按折算后家底重算实力分，对外隐匿不显","门人":"有长存手段者留任老祖，生成 2 至 4 名潜修避世的精锐血亲门人"}},{"名":"覆灭重建","相位":"草创","说明":"万年浩劫中山门被破、典籍焚毁，唯余一脉残裔携信物隐姓埋名，于新时代白手重立。","折算":{"底蕴":0.15,"公库":0.03,"设施":"原有设施尽毁，仅留 1 座 1 级损毁遗址待日后修复，另配 1 座 1 级基础潜修设施","产业":"全部清零","武魂":0.8,"功法":0.35,"镇宗之宝":0.15,"位阶":"重算为草莽微末或末流门户，声势重置为 5","门人":"有长存手段者重伤沉眠或失联，仅余 0 至 1 名相依为命的残存同门"}}],"掷骰":{"基础权重":{"鼎盛延续":8,"中兴再起":14,"守成":26,"中落":25,"隐世":15,"覆灭重建":12},"修正":[{"条件":{"老祖":true},"加":{"鼎盛延续":15,"中兴再起":8,"守成":5,"中落":-8,"隐世":2,"覆灭重建":-8}},{"条件":{"相位":["鼎盛","中兴"]},"加":{"鼎盛延续":8,"守成":5,"中落":-5,"覆灭重建":-4}},{"条件":{"相位":["衰落","覆灭"]},"加":{"鼎盛延续":-6,"中落":8,"隐世":5,"覆灭重建":10}},{"条件":{"位阶至少":"天下名宗"},"加":{"鼎盛延续":8,"中兴再起":5,"守成":4,"覆灭重建":-5}},{"条件":{"位阶至少":"擎天巨擘"},"加":{"鼎盛延续":10,"守成":5,"中落":-5,"覆灭重建":-4}},{"条件":{"底蕴至少":1000},"加":{"鼎盛延续":6,"中兴再起":6,"隐世":4,"覆灭重建":-5}},{"条件":{"底蕴至少":3000},"加":{"鼎盛延续":8,"守成":5,"中落":-6,"覆灭重建":-4}},{"条件":{"传承武魂至少":1},"加":{"守成":5,"隐世":5,"覆灭重建":-3}},{"条件":{"下一部":"斗2"},"加":{"中落":8,"隐世":6,"鼎盛延续":-4}},{"条件":{"下一部":"斗3"},"加":{"中落":10,"隐世":8,"鼎盛延续":-5}},{"条件":{"下一部":"斗4"},"加":{"中兴再起":6,"守成":4,"覆灭重建":-3}}]},"币值":{"斗1":{"金魂币":1},"斗2":{"金魂币":1},"斗3":{"联邦币":1000,"星罗币":3000},"斗4":{"联邦币":2000,"斗罗币":200,"龙马币":100}},"源位":["始源","嫡源","王脉","真脉","支脉","余脉"],"血系":{"龙族":{"本源":"龙神","类别":"神兽","天赋":"气血磅礴、龙鳞护体与万兽臣服之势；近源者兼掌破灭体魄或诸元素创生权柄。","觉醒":{"写法":"层","层数":9,"节奏":"随修为突破、升龙淬体或吞纳龙魂本源逐层纯化龙族气血，满层凝就真龙龙核。"},"形似武魂":["蓝电霸王龙","光明圣龙","黄金圣龙","黑暗圣龙","火龙","白甲地龙"],"可融合":[["金龙王血脉","银龙王血脉"],["光明圣龙血脉","黑暗圣龙血脉"]],"适用":["人类魂师","魂兽","神祇"],"成员":{"龙神血脉":{"源位":"始源","部":["神界","斗3","斗4"],"觉醒":null,"说明":"金银合流重归九彩混沌，统御创生与破灭，万龙跪拜臣服"},"金龙王血脉":{"源位":"嫡源","部":["神界","斗3","斗4"],"觉醒":{"写法":"封印","层数":18,"节奏":"前九道随修为与灵物破封；第九道后每破一道须隔至少一外界年并历生死磨砺，每破两道凝一气血魂环。"},"说明":"承龙神强横体魄、气血与破灭神力，自带十八道神血封印"},"银龙王血脉":{"源位":"嫡源","部":["神界","斗3","斗4"],"觉醒":null,"说明":"承龙神智慧神识与全元素掌控权柄，魂兽共主血统"},"山龙王血脉":{"源位":"王脉","部":["斗3","斗4"],"觉醒":null,"说明":"龙神九子中执掌大地山川重力之王，身化大陆泽被万龙"},"火龙王血脉":{"源位":"王脉","部":["斗3","斗4"],"觉醒":null,"说明":"龙神九子之极致炽火龙主，陨落龙躯化冰火两仪眼阳泉"},"水龙王血脉":{"源位":"王脉","部":["斗3","斗4"],"觉醒":null,"说明":"龙神九子之极致寒水龙主，陨落龙躯化冰火两仪眼阴泉"},"光明龙王血脉":{"源位":"王脉","部":["斗3","斗4"],"觉醒":null,"说明":"龙神九子之神圣光明本源，曙光与光明系真龙返祖极境"},"黑暗龙王血脉":{"源位":"王脉","部":["斗3","斗4"],"觉醒":null,"说明":"龙神九子之纯粹黑暗寂灭龙主，统御暗属性龙族法则"},"空间龙王血脉":{"源位":"王脉","部":["斗3","斗4"],"觉醒":null,"说明":"龙神九子之虚空穿梭龙主，与时间龙王合掌时空权柄"},"时间龙王血脉":{"源位":"王脉","部":["斗4"],"觉醒":null,"说明":"执掌岁月流速扭曲的上位初代龙王血统"},"饕餮神牛血脉":{"源位":"王脉","部":["斗2"],"觉醒":null,"说明":"龙神九子之五饕餮真血，在血脉位格上令帝天亦须服输"},"白龙王血脉":{"源位":"王脉","部":["斗4"],"觉醒":null,"说明":"传说九大龙王之一，执掌锋锐与极速突刺的初代龙王血统"},"金眼黑龙王血脉":{"源位":"真脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"龙神亲卫长兽神帝天一脉，纯血黑暗真龙之首，次于龙神九子"},"黄金龙血脉":{"源位":"真脉","部":["斗2","斗3"],"觉醒":null,"说明":"力量之祖正统纯血真龙血统，兼具极致力量与强横气血"},"光明圣龙血脉":{"源位":"真脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"神圣光明属性上位纯血真龙，蓝电霸王龙良性返祖方向"},"黑暗圣龙血脉":{"源位":"真脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"纯粹黑暗属性上位真龙，与光明圣龙并列圣龙双极"},"深渊魔龙血脉":{"源位":"真脉","部":["斗4"],"觉醒":null,"说明":"冰海凶兽魔后本体真龙血统，兼具深渊吞噬与冰暗龙躯"},"深渊冰魔龙血脉":{"源位":"真脉","部":["斗4"],"觉醒":null,"说明":"融合极寒与深渊魔龙本源变异而生的凋零冰龙真脉"},"雷龙血脉":{"源位":"真脉","部":["神界","斗4"],"觉醒":null,"说明":"神禁之地执掌狂雷毁灭之力的远古雷系真龙遗脉"},"天龙血脉":{"源位":"真脉","部":["斗4"],"觉醒":null,"说明":"龙马星系天龙星王族经升龙柱淬炼传承的上位真龙血统"},"精灵龙血脉":{"源位":"真脉","部":["斗4"],"觉醒":null,"说明":"亲和天地自然生命元素的灵秀上位真龙血统"},"泰坦龙血脉":{"源位":"真脉","部":["斗4"],"觉醒":null,"说明":"原恩家族泰坦血统与龙脉交融异变而生的重装真龙血统"},"地狱魔龙血脉":{"源位":"支脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"紫姬所属亚龙之首地狱魔龙一脉，魔气森然"},"霸王龙血脉":{"源位":"支脉","部":["斗1","斗2","斗3"],"觉醒":null,"说明":"刚猛暴烈的强攻陆战亚龙血统，不屈战意炽盛"},"亚龙血脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"胭脂龙、火龙、翼龙等混杂异族血统的旁支亚龙族裔"},"荆棘龙血脉":{"源位":"余脉","部":["斗4"],"觉醒":null,"说明":"身披反伤骨刺的下位地龙支系，龙血稀薄而坚韧"},"地龙血脉":{"源位":"余脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"匍匐大地、龙族血统传世最薄的远支末裔"}}},"凤凰一脉":{"本源":"凤凰之神","类别":"神兽","天赋":"浴火重塑气血、羽翼御空与极致冰火亲和；濒死之际可燃血激发涅槃生机。","觉醒":{"写法":"层","层数":9,"节奏":"每吞服至阳至寒奇珍或历生死涅槃可进一层，涤除驳杂火毒并提纯真凰羽翼。"},"形似武魂":["火凤凰","邪火凤凰","冰凤凰","天凤"],"可融合":[["雪女血脉","翡翠天鹅血脉"]],"适用":["人类魂师","魂兽","神祇"],"成员":{"凤凰真血":{"源位":"嫡源","部":["神界","英雄","斗4"],"觉醒":null,"说明":"上古神兽凤凰的先天嫡源本源，万禽朝宗"},"十首火凤凰血脉":{"源位":"王脉","部":["斗1","斗2","神界","英雄"],"觉醒":null,"说明":"融汇十首烈阳内丹蜕变的至阳皇者火凤血统"},"火凤凰血脉":{"源位":"真脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"涤尽邪火杂质的纯血七首至九首火凤凰正统"},"冰凤凰血脉":{"源位":"真脉","部":["斗1","斗4","英雄"],"觉醒":null,"说明":"极寒冰晶凝羽的纯血冰凤凰正统血统"},"天凤血脉":{"源位":"真脉","部":["斗3"],"觉醒":null,"说明":"气焰雍容炽烈的高阶天凤真血，具大范围焚天威势"},"翡翠凤凰血脉":{"源位":"真脉","部":["斗4"],"觉醒":null,"说明":"极寒冰雪与翡翠生机交融而生的生命凋零双极凤脉"},"邪火凤凰血脉":{"源位":"支脉","部":["斗1","斗2"],"觉醒":null,"说明":"血统变异驳杂的火凤支脉，爆发刚猛但受邪火反噬"},"亚凰血脉":{"源位":"余脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"仅存微薄凰鸟遗泽的飞禽远支血统"}}},"玄武一脉":{"本源":"玄武神兽","类别":"神兽","天赋":"绝对防御甲壳、玄冥水雾置换与狂暴血气反震，气血越盛甲御越坚。","觉醒":{"写法":"层","层数":9,"节奏":"于重压绝境或吞纳同源上古灵血时逐层唤醒玄武真躯，满层甲纹化金。"},"形似武魂":["玄冥龟","黄金玳瑁","海龟"],"可融合":[],"适用":["人类魂师","魂兽","神祇"],"成员":{"玄武血脉":{"源位":"王脉","部":["斗2","神界"],"觉醒":null,"说明":"复苏上古北方水土镇世神兽本源的纯正玄武王脉"},"黄金玄武血脉":{"源位":"真脉","部":["斗2"],"觉醒":null,"说明":"黄金玳瑁所携上古神圣金甲血统，重御无双"},"玄冥龟血脉":{"源位":"支脉","部":["斗2","斗3"],"觉醒":null,"说明":"玄武神兽在凡间潜藏流传的混血支系，受心绪激荡可短暂醒脉"}}},"瑞兽一脉":{"本源":"帝皇瑞兽","类别":"神兽","天赋":"命运裁决凝视、气运庇佑反噬敌手，以及光明与极致之火双极致亲和。","觉醒":{"写法":"层","层数":9,"节奏":"随精神力蜕变与气运感召逐层开启命运之眼威能。"},"形似武魂":["金猊","火焰狮"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"帝皇瑞兽血脉":{"源位":"嫡源","部":["斗2"],"觉醒":null,"说明":"星斗大森林气运本源化身，掌命运之眼与神兽记忆接引"},"三眼金猊血脉":{"源位":"王脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"兼具光明极致之火的上古瑞兽本体王脉"},"瑞兽眷属血脉":{"源位":"支脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"长年沐浴瑞兽祥瑞之气而沾染一缕命运灵光的伴生支裔"}}},"比蒙一脉":{"本源":"紫晶比蒙","类别":"神兽","天赋":"狂化倍增气血、无视防御的撕裂利爪与震慑百兽的凶戾霸体。","觉醒":{"写法":"层","层数":9,"节奏":"以强横气血与高阶金系灵物淬体，逐层凝实紫晶或暗金毛发战躯。"},"形似武魂":[],"可融合":[],"适用":["人类魂师","魂兽","神祇"],"成员":{"紫晶比蒙血脉":{"源位":"嫡源","部":["英雄","斗4"],"觉醒":null,"说明":"比蒙皇族至高紫晶本源，天生神兽之躯可硬撼神王锋芒"},"黄金比蒙血脉":{"源位":"王脉","部":["斗4"],"觉醒":null,"说明":"上位皇族黄金比蒙真血，暗金气血霸烈无双、专克群兽"},"比蒙巨兽血脉":{"源位":"真脉","部":["斗4","英雄"],"觉醒":null,"说明":"纯血陆战比蒙巨兽血统，力大无穷且凶悍嗜战"}}},"麒麟一脉":{"本源":"天干麒麟","类别":"神兽","天赋":"五行元素无缝流转相生、大五行神光刷落万法，至高处衍化阴阳混沌。","觉醒":{"写法":"层","层数":9,"节奏":"每补全一系阴阳五行属性本源进一层，阴阳齐聚方可窥天干真谛。"},"形似武魂":["火麒麟","水麒麟","玉麒麟"],"可融合":[],"适用":["人类魂师","魂兽","神祇"],"成员":{"天干麒麟血脉":{"源位":"王脉","部":["斗4"],"觉醒":null,"说明":"贯通阴阳十天干五行轮转的至高瑞麟王脉，触及混沌权柄"},"五行麒麟血脉":{"源位":"真脉","部":["斗3","斗4"],"觉醒":null,"说明":"统御金木水火土五行合一的纯正麒麟真血"},"麒麟支脉":{"源位":"支脉","部":["斗3","斗4"],"觉醒":null,"说明":"仅承单一或残缺元素属性的麒麟旁支血统"}}},"寻宝兽脉":{"本源":"寻宝兽","类别":"神兽","天赋":"寻龙辨宝感知天材地宝、绝顶精神幻术拟态及高维空间穿梭。","觉醒":{"写法":"层","层数":9,"节奏":"随吞纳仙灵之气与生命本源滋养，逐层恢复神界奇兽灵识神通。"},"形似武魂":[],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"寻宝兽血脉":{"源位":"王脉","部":["斗4"],"觉醒":null,"说明":"龙神伴生神兽本体血统，精擅天地寻宝与神识幻化"},"空之虫血脉":{"源位":"真脉","部":["斗4"],"觉醒":null,"说明":"天生亲和空间权柄、可撕裂虚空吞纳能量的太古奇虫真脉"}}},"天使一脉":{"本源":"天使神","类别":"神祇","天赋":"先天高魂力亲和、神圣太阳真火消融邪祟，高空环境大幅增幅。","觉醒":{"写法":"层","层数":9,"节奏":"随神圣信仰淬炼、吸收天使神装或神血洗礼逐层点亮羽翼圣辉。"},"形似武魂":["神圣天使","祈愿天使","四翼天使","炽天使"],"可融合":[],"适用":["人类魂师","神祇"],"成员":{"天使神血脉":{"源位":"始源","部":["斗1","神界"],"觉醒":null,"说明":"初代天使神本源神本体真血，后天继承天使神位者不获此脉"},"六翼天使血脉":{"源位":"王脉","部":["斗1"],"觉醒":null,"说明":"武魂殿千家世代嫡传的天使神直系后裔神血，先天二十级满魂力"},"堕落天使血脉":{"源位":"王脉","部":["斗3","英雄"],"觉醒":null,"说明":"贯通暗黑恶魔位面或异界纯正堕落天使族裔的暗翼王脉"},"神圣天使血脉":{"源位":"支脉","部":["斗2","斗3"],"觉醒":null,"说明":"六翼天使传世久远后的凡间退化支裔，仍存净化邪魂师之威"}}},"海神一脉":{"本源":"海神","类别":"神祇","天赋":"瀚海领域水系掌控、海洋环境生生不息回复及海魂兽天然敬服。","觉醒":{"写法":"层","层数":9,"节奏":"随瀚海神血苏醒或三叉戟亲和度提升逐层激发生命海洋神纹。"},"形似武魂":[],"可融合":[["海神血脉","修罗神血脉"]],"适用":["人类魂师","神祇"],"成员":{"海神本源血脉":{"源位":"始源","部":["斗1","神界"],"觉醒":null,"说明":"初代海神本源神本体真血，后天继承海神神位者不获此脉"},"海神血脉":{"源位":"王脉","部":["斗2","神界","英雄","斗3","斗4"],"觉醒":null,"说明":"海神成神后诞下的直系子女后裔所承神血，蕴黄金三叉戟守护印"},"海神支脉":{"源位":"支脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"海神直系后裔隔代繁衍稀释后的远支神裔血统"}}},"修罗一脉":{"本源":"修罗神","类别":"神祇","天赋":"杀气凝实化修罗血剑、破除一切领域幻妄，对恶念邪祟具绝对裁决力。","觉醒":{"写法":"层","层数":9,"节奏":"历经生死杀伐淬炼道心而不堕魔障，逐层凝练暗赤金修罗神意。"},"形似武魂":[],"可融合":[["海神血脉","修罗神血脉"]],"适用":["人类魂师","神祇"],"成员":{"修罗本源血脉":{"源位":"始源","部":["斗1","神界"],"觉醒":null,"说明":"初代修罗神天生杀伐法则凝聚的本源神本体真血"},"修罗神血脉":{"源位":"王脉","部":["神界","英雄","斗3","斗4"],"觉醒":null,"说明":"修罗神直系后代或受修罗神血赐予者所承的杀伐神裔血统"},"杀神血脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"修罗神血隔代流传或杀神气血浸润后裔而成的旁支血统"}}},"创世一脉":{"本源":"创世神","类别":"神祇","天赋":"创生与寂灭双极宇宙本源亲和，仙灵之气生生不息回流。","觉醒":{"写法":"层","层数":9,"节奏":"感悟生灭创世本源并凝练先天神核，逐层唤醒初始神种烙印。"},"形似武魂":[],"可融合":[["生命女神血脉","毁灭之神血脉"]],"适用":["人类魂师","神祇"],"成员":{"创世神血脉":{"源位":"始源","部":["神界","英雄"],"觉醒":null,"说明":"创世神本体或生命与毁灭先天初始种子彻底合流的始源真血"},"生命女神血脉":{"源位":"嫡源","部":["神界"],"觉醒":null,"说明":"神界诞生之初先天孕育的生命种子神王本体真血"},"毁灭之神血脉":{"源位":"嫡源","部":["神界"],"觉醒":null,"说明":"神界诞生之初先天孕育的毁灭种子神王本体真血"},"生命亲和血脉":{"源位":"支脉","部":["神界","斗3","斗4"],"觉醒":null,"说明":"受先天生命神血赐予后繁衍流传的生机支脉"}}},"深红一脉":{"本源":"深红之母","类别":"神祇","天赋":"吞噬生灵血能反哺己身、不灭能量重聚及侵蚀同化异种权柄。","觉醒":{"写法":"层","层数":9,"节奏":"每吞纳高浓度位面能量或突破生命阶位可凝练一层深红深渊印记。"},"形似武魂":[],"可融合":[],"适用":["人类魂师","魂兽","神祇"],"成员":{"深红之母血脉":{"源位":"始源","部":["斗4"],"觉醒":null,"说明":"深红之域先天至高母体本体真血，吞噬万界冲击神王境"},"深渊圣君血脉":{"源位":"嫡源","部":["斗3"],"觉醒":null,"说明":"深红之母所孕深渊位面最高主宰真血，执掌超神器天圣裂渊戟"},"深渊帝君血脉":{"源位":"王脉","部":["斗3","斗4"],"觉醒":null,"说明":"深渊位面黑帝、灵帝、智帝等十层上位帝君皇族血统"},"深渊魔裔血脉":{"源位":"支脉","部":["斗3","斗4"],"觉醒":null,"说明":"受深渊或深红本源浸染繁衍的下位生灵与混血支系"}}},"泰坦巨猿":{"本源":"泰坦巨猿皇","类别":"魂兽族裔","天赋":"泰坦苍穹破气血压缩、大地重力领域掌控及钢筋铁骨体魄。","觉醒":{"写法":"层","层数":9,"节奏":"随体魄打磨与气血冲关逐层壮大巨猿真身，满层可化巨魔泰坦法相。"},"形似武魂":["大力猩猩","狂猿","白猿"],"可融合":[["泰坦裔血脉","自然精灵血脉"],["泰坦巨猿血脉","精灵王血脉"]],"适用":["人类魂师","魂兽"],"成员":{"巨魔泰坦血脉":{"源位":"王脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"渡劫突破凶兽至神级层次的泰坦始祖王脉与家族返祖极境"},"泰坦巨猿血脉":{"源位":"真脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"十万年森林之王正统血统及原恩家族完全觉醒的嫡传真脉"},"泰坦雪魔血脉":{"源位":"真脉","部":["斗2"],"觉醒":null,"说明":"迁居极北冰原演化的二十万年上古冰雪泰坦巨魔皇族血统"},"泰坦裔血脉":{"源位":"支脉","部":["斗3","斗4"],"觉醒":null,"说明":"人类与泰坦巨猿后裔世代通婚流传的混血支系，体魄超常"}}},"天青牛蟒":{"本源":"天青牛蟒皇","类别":"魂兽族裔","天赋":"迟缓领域锁定神魂、天青寂灭雷霆轰击与磅礴水雷灵力护体。","觉醒":{"写法":"层","层数":9,"节奏":"引九天雷霆淬体并蓄养森林水木灵气，逐层蜕鳞化角。"},"形似武魂":["碧磷蛇","曼陀罗蛇"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"天青牛蟒血脉":{"源位":"王脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"星斗森林帝皇大明一脉正统王血，修至极境跨越凶兽入神级"},"天青蟒血脉":{"源位":"真脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"承袭纯粹天青水雷血统的上位巨蟒真脉"},"青蟒裔血脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"沾染一缕天青雷泽气息的蟒蛇类旁支血统"}}},"冰碧帝皇蝎":{"本源":"冰碧帝皇蝎","类别":"魂兽族裔","天赋":"极致之冰永冻寒气、冰帝之螯破甲重击与冰皇护体寒晶防御。","觉醒":{"写法":"层","层数":9,"节奏":"于极寒核心吞吐万载玄冰髓，逐层剔除杂气凝就碧绿钻晶甲。"},"形似武魂":["冰蝎","紫晶魔蝎","大地魔蝎"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"冰碧帝皇蝎血脉":{"源位":"王脉","部":["斗2","神界"],"觉醒":null,"说明":"四十万年极北冰原帝皇本体王血，天生执掌极致之冰"},"冰碧蝎血脉":{"源位":"真脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"极北核心圈纯血高阶冰碧蝎族裔，寒毒凛冽、甲壳坚逾精金"},"寒蝎支脉":{"源位":"支脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"极北外围混杂冰系蝎类的旁支血统"}}},"冰天雪女":{"本源":"冰天雪女","类别":"魂兽族裔","天赋":"天地冰雪权柄天然掌控、风雪无瑕灵躯及大范围极寒降雪增幅。","觉醒":{"写法":"层","层数":9,"节奏":"感悟极北万年风雪真意，逐层澄澈冰雪本源并凝练帝剑寒芒。"},"形似武魂":[],"可融合":[["雪女血脉","翡翠天鹅血脉"]],"适用":["人类魂师","魂兽"],"成员":{"冰天雪女血脉":{"源位":"王脉","部":["斗2","神界","英雄","斗4"],"觉醒":null,"说明":"七十万年极北之主雪帝本体王血，极致冰雪天地精灵本源"},"雪女血脉":{"源位":"真脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"承袭冰天雪女纯粹冰雪灵体血统的正统后裔真脉"},"极北冰灵血脉":{"源位":"支脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"极寒冰族或冰雪灵体世代流传稀释的混血支系"}}},"冰蚕一脉":{"本源":"天梦冰蚕","类别":"魂兽族裔","天赋":"精神力上限倍增、精神探测模拟干扰全能，以及极强隐匿敛息。","觉醒":{"写法":"层","层数":9,"节奏":"随精神之海扩容逐道点亮冰蚕金纹，每开一纹大幅拔升灵识上限。"},"形似武魂":["春蚕"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"金纹冰蚕血脉":{"源位":"王脉","部":["斗2","神界"],"觉醒":null,"说明":"天梦冰蚕蜕变十道金纹的百万年精神本源王血"},"冰蚕血脉":{"源位":"余脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"极北寻常冰蚕血统，天生位于食物链底端而擅敛息避祸"}}},"柔骨兔":{"本源":"柔骨魅兔","类别":"魂兽族裔","天赋":"柔韧无骨卸力、短距空间瞬移与瞬间绝对无敌护体。","觉醒":{"写法":"层","层数":9,"节奏":"淬炼全身筋骨柔韧度与气血瞬发力，满层金身圆融无瑕。"},"形似武魂":["柔骨兔","白兔"],"可融合":[],"适用":["人类魂师","魂兽","神祇"],"成员":{"柔骨魅兔血脉":{"源位":"真脉","部":["斗1","神界","英雄","斗4"],"觉醒":null,"说明":"十万年化形皇族正统血统，具瞬移、无敌金身与虚无免疫潜质"},"柔骨兔血脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"成年千年至万年柔骨兔族血统，弹跳惊人、身法轻灵"},"凡兔余脉":{"源位":"余脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"血统稀薄的寻常兔类魂兽后裔"}}},"蓝银皇":{"本源":"蓝银皇","类别":"魂兽族裔","天赋":"蓝银领域森罗万象生命吞吐、草木万灵传讯及断肢再生恢复。","觉醒":{"写法":"层","层数":9,"节奏":"受万株蓝银朝拜或生命本源浇灌完成二次觉醒，逐层演化金纹皇藤。"},"形似武魂":["蓝银草"],"可融合":[],"适用":["人类魂师","魂兽","神祇"],"成员":{"黄金古树血脉":{"源位":"王脉","部":["斗3","斗4"],"觉醒":null,"说明":"蓝银皇融合斗罗位面生命核心晋升而成的自然母树王脉"},"蓝银皇血脉":{"源位":"真脉","部":["斗1","斗2","斗3","斗4","神界","英雄"],"觉醒":null,"说明":"植物系帝皇正统血统，叶脉流金，统御天下蓝银草"},"暗黑蓝银草血脉":{"源位":"真脉","部":["斗2"],"觉醒":null,"说明":"蓝银皇血统异变堕入吞噬属性的暗黑变异脉，掠夺草木生机"},"蓝银王血脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"八万年以上修为辅佐帝皇统御一方森林的蓝银王族血统"},"蓝银灵脉":{"源位":"余脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"潜藏一缕微弱皇族生机而尚未二次觉醒的潜伏血统"}}},"深海魔鲸":{"本源":"深海魔鲸王","类别":"魂兽族裔","天赋":"深海雷霆重水掌控、鲸吞万物能量炼化体魄及准神级浩瀚气血。","觉醒":{"写法":"层","层数":9,"节奏":"于万丈海渊承受水压雷劫淬炼鲸珠内丹，满层气血化紫金。"},"形似武魂":["蓝鲸","巨鲸"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"深海魔鲸王血脉":{"源位":"王脉","部":["斗1","斗3"],"觉醒":null,"说明":"深海魔鲸王、魔皇及直系圣灵后裔蓝佛子所持海洋霸主最高王脉"},"深海魔鲸血脉":{"源位":"真脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"纯血万年深海魔鲸族裔，体魄如山、水雷狂暴"},"魔鲸裔血脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"海洋鲸类魂兽混有深海魔鲸血统的旁支"}}},"魔魂大白鲨":{"本源":"魔魂大白鲨之王","类别":"魂兽族裔","天赋":"海中极速突袭、魔鲨之牙破防撕裂及禁止瞬移的封锁水阵。","觉醒":{"写法":"层","层数":9,"节奏":"随深海搏杀与海神灵光洗礼逐层凝练魔鲨领域与晶莹战躯。"},"形似武魂":["狂鲨","白鲨","锤头鲨"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"魔魂大白鲨王血脉":{"源位":"真脉","部":["斗1","斗4"],"觉醒":null,"说明":"十万年护岛魔鲨皇族血统，海中极速与控水威能卓绝"},"魔魂大白鲨血脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"寻常魔魂大白鲨族群血统，凶猛矫健、善于群战"}}},"邪魔虎鲸":{"本源":"邪魔虎鲸王","类别":"魂兽族裔","天赋":"邪魔破浪巨力冲撞、暗水能量腐蚀及凶煞嗜血战意。","觉醒":{"写法":"层","层数":9,"节奏":"在深海血战吞噬强敌气血中逐层强化虎鲸凶煞之躯。"},"形似武魂":["虎鲸"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"邪魔虎鲸王血脉":{"源位":"真脉","部":["斗1","斗3"],"觉醒":null,"说明":"十万年以上深海凶霸皇族血统，体魄凶横力压同阶海兽"},"邪魔虎鲸血脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"万年邪魔虎鲸族群血统，凶戾嗜杀、冲击霸道"}}},"翡翠天鹅":{"本源":"翡翠天鹅","类别":"魂兽族裔","天赋":"磅礴生命力灌注起死回生、驱散剧毒侵蚀及抚平生机凋零。","觉醒":{"写法":"层","层数":9,"节奏":"沐浴生命古树灵气并践行救死扶伤，逐层升华翡翠生命本源。"},"形似武魂":["白天鹅","黑天鹅"],"可融合":[["雪女血脉","翡翠天鹅血脉"]],"适用":["人类魂师","魂兽"],"成员":{"翡翠天鹅血脉":{"源位":"王脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"五十万年凶兽碧姬及承其本源者的纯粹治愈王脉"},"灵鹅支脉":{"源位":"支脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"带有治愈翡翠灵光的翡翠天鹅混血旁支血统"}}},"暗金恐爪熊":{"本源":"暗金恐爪熊王","类别":"魂兽族裔","天赋":"暗金恐爪无坚不摧撕裂空间、狂暴护体暗金毛皮与越阶搏杀凶威。","觉醒":{"写法":"层","层数":9,"节奏":"以精金矿髓与实战血火磨砺双爪，逐层延展暗金撕天爪芒。"},"形似武魂":["大力金刚熊","大地暴熊","冰熊"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"暗金恐爪熊王血脉":{"源位":"王脉","部":["斗2","斗3"],"觉醒":null,"说明":"四十七万年凶兽熊君本体王血，利爪锋芒可伤巨龙之躯"},"暗金恐爪熊血脉":{"源位":"真脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"纯血暗金恐爪熊族裔，攻防一体，同修为难逢敌手"},"恐爪熊支脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"混有一丝暗金血统的强攻熊类旁支族裔"}}},"妖眼魔树":{"本源":"万妖王","类别":"魂兽族裔","天赋":"妖眼精神震慑迟滞、万枝缠绕吸血噬魂及木系断枝重生。","觉醒":{"写法":"层","层数":9,"节奏":"吞纳高品仙草精粹与地脉木灵，逐层开启树干妖瞳与凶植本源。"},"形似武魂":[],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"万妖王血脉":{"源位":"王脉","部":["斗2"],"觉醒":null,"说明":"五十三万年植物系凶兽霸主万妖王本体王血，精神木毒双绝"},"妖眼魔树血脉":{"源位":"真脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"纯正万年妖眼魔树族裔血统，枝干坚韧、妖瞳惑神"},"绮罗郁金香血脉":{"源位":"真脉","部":["斗1","斗3"],"觉醒":null,"说明":"仙品之王渡劫晋升二十万年凶兽后的雍容花皇真脉"},"雷鸣阎狱藤血脉":{"源位":"真脉","部":["斗3","斗4"],"觉醒":null,"说明":"吞汲九天雷劫成长的狂暴植物系凶兽雷藤真脉"}}},"暗魔邪神虎":{"本源":"暗魔邪神虎","类别":"魂兽族裔","天赋":"至邪黑暗风雷空间时间多系交融、吞噬魂兽内丹进阶与返老还童生死场。","觉醒":{"写法":"层","层数":9,"节奏":"吞噬强敌气血本源淬炼邪神珠，逐层解锁风雷邪暗与时空之力。"},"形似武魂":["白虎","鬼虎","飞天神虎"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"暗魔邪神虎血脉":{"源位":"王脉","部":["斗1"],"觉醒":null,"说明":"承邪神遗泽变异的暗魔邪神虎本体王血，具返老还童邪阵"},"邪神虎支脉":{"源位":"支脉","部":["斗1","斗2","斗3","斗4"],"觉醒":null,"说明":"沾染一缕暗黑邪雷气息的虎类变异支系"}}},"三头赤魔獒":{"本源":"赤王","类别":"魂兽族裔","天赋":"三首协同无死角锁定、地狱魔火焚烧神魂与凶悍护主气魄。","觉醒":{"写法":"层","层数":9,"节奏":"吸纳地心熔岩与纯阳火毒淬炼三首妖核，逐层纯化地狱魔焰。"},"形似武魂":["火云犬"],"可融合":[],"适用":["人类魂师","魂兽"],"成员":{"三头赤魔獒血脉":{"源位":"王脉","部":["斗2"],"觉醒":null,"说明":"三十万年凶兽赤王本体王血，地狱魔火霸烈无匹"},"赤魔獒支脉":{"源位":"支脉","部":["斗2","斗3","斗4"],"觉醒":null,"说明":"混有地狱魔犬血统的火系犬獒旁支族裔"}}},"精灵一脉":{"本源":"精灵王","类别":"魂兽族裔","天赋":"自然万灵亲和、超远距灵觉锁定，以及昼夜双态灵魂恢复。","觉醒":{"写法":"层","层数":9,"节奏":"聆听自然草木脉动并凝练精神灵识，满层蜕变为精灵王体。"},"形似武魂":[],"可融合":[["泰坦裔血脉","自然精灵血脉"],["泰坦巨猿血脉","精灵王血脉"]],"适用":["人类魂师","魂兽"],"成员":{"精灵王血脉":{"源位":"王脉","部":["斗4","英雄"],"觉醒":null,"说明":"精灵一族至高皇者血统，统御森林元素、箭无虚发"},"自然精灵血脉":{"源位":"真脉","部":["斗4"],"觉醒":null,"说明":"精灵星纯正自然精灵族血统，寿元绵长、精神澄澈"}}}},"原作血脉":{"唐三":[{"部":"斗1","血脉":[{"名":"蓝银灵脉","血系":"蓝银皇","源位":"余脉","浓度":25,"觉醒层":0,"自":"斗罗历2637年04月14日"},{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":90,"觉醒层":6,"自":"斗罗历2647年08月17日"}]},{"部":"神界","血脉":[{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":98,"觉醒层":9,"自":"斗罗历22445年"}]},{"部":"英雄","血脉":[{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":98,"觉醒层":9,"自":"斗罗历22646年10月01日"}]},{"部":"斗4","血脉":[{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":98,"觉醒层":9,"自":"斗罗历32650年05月07日"}]}],"小舞":[{"部":"斗1","血脉":[{"名":"柔骨魅兔血脉","血系":"柔骨兔","源位":"真脉","浓度":92,"觉醒层":6,"自":"斗罗历2635年"},{"名":"柔骨魅兔血脉","血系":"柔骨兔","源位":"真脉","浓度":96,"觉醒层":9,"自":"斗罗历2655年04月10日"}]},{"部":"神界","血脉":[{"名":"柔骨魅兔血脉","血系":"柔骨兔","源位":"真脉","浓度":98,"觉醒层":9,"自":"斗罗历22445年"}]},{"部":"英雄","血脉":[{"名":"柔骨魅兔血脉","血系":"柔骨兔","源位":"真脉","浓度":98,"觉醒层":9,"自":"斗罗历22646年10月01日"}]},{"部":"斗4","血脉":[{"名":"柔骨魅兔血脉","血系":"柔骨兔","源位":"真脉","浓度":98,"觉醒层":9,"自":"斗罗历32650年05月07日"}]}],"阿银":[{"部":"斗1","血脉":[{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":95,"觉醒层":8,"自":"斗罗历2617年"},{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":35,"觉醒层":8,"自":"斗罗历2631年01月17日"},{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":96,"觉醒层":9,"自":"斗罗历2655年04月29日"}]}],"千道流":[{"部":"斗1","血脉":[{"名":"六翼天使血脉","血系":"天使一脉","源位":"王脉","浓度":94,"觉醒层":8,"自":"斗罗历2601年"}]}],"千寻疾":[{"部":"斗1","血脉":[{"名":"六翼天使血脉","血系":"天使一脉","源位":"王脉","浓度":86,"觉醒层":7,"自":"斗罗历2615年"}]}],"千仞雪":[{"部":"斗1","血脉":[{"名":"六翼天使血脉","血系":"天使一脉","源位":"王脉","浓度":95,"觉醒层":7,"自":"斗罗历2619年"},{"名":"六翼天使血脉","血系":"天使一脉","源位":"王脉","浓度":99,"觉醒层":9,"自":"斗罗历2655年05月28日"},{"名":"六翼天使血脉","血系":"天使一脉","源位":"王脉","浓度":55,"觉醒层":9,"自":"斗罗历2655年06月20日"}]}],"马红俊":[{"部":"斗1","血脉":[{"名":"邪火凤凰血脉","血系":"凤凰一脉","源位":"支脉","浓度":62,"觉醒层":2,"自":"斗罗历2643年08月01日"},{"名":"火凤凰血脉","血系":"凤凰一脉","源位":"真脉","浓度":82,"觉醒层":5,"自":"斗罗历2644年09月15日"},{"名":"十首火凤凰血脉","血系":"凤凰一脉","源位":"王脉","浓度":92,"觉醒层":8,"自":"斗罗历2652年10月22日"}]},{"部":"神界","血脉":[{"名":"十首火凤凰血脉","血系":"凤凰一脉","源位":"王脉","浓度":95,"觉醒层":9,"自":"斗罗历22445年"}]}],"大明":[{"部":"斗1","血脉":[{"名":"天青牛蟒血脉","血系":"天青牛蟒","源位":"王脉","浓度":95,"觉醒层":8,"自":"斗罗历前97350年"}]},{"部":"斗3","血脉":[{"名":"天青牛蟒血脉","血系":"天青牛蟒","源位":"王脉","浓度":96,"觉醒层":9,"自":"斗罗历22631年"}]},{"部":"斗4","血脉":[{"名":"天青牛蟒血脉","血系":"天青牛蟒","源位":"王脉","浓度":98,"觉醒层":9,"自":"斗罗历32631年"}]}],"二明":[{"部":"斗1","血脉":[{"名":"泰坦巨猿血脉","血系":"泰坦巨猿","源位":"真脉","浓度":94,"觉醒层":8,"自":"斗罗历前97350年"}]},{"部":"斗3","血脉":[{"名":"巨魔泰坦血脉","血系":"泰坦巨猿","源位":"王脉","浓度":95,"觉醒层":9,"自":"斗罗历22631年"}]},{"部":"斗4","血脉":[{"名":"巨魔泰坦血脉","血系":"泰坦巨猿","源位":"王脉","浓度":97,"觉醒层":9,"自":"斗罗历32631年"}]}],"深海魔鲸王":[{"部":"斗1","血脉":[{"名":"深海魔鲸王血脉","血系":"深海魔鲸","源位":"王脉","浓度":97,"觉醒层":9,"自":"斗罗历前997346年"}]}],"小白":[{"部":"斗1","血脉":[{"名":"魔魂大白鲨王血脉","血系":"魔魂大白鲨","源位":"真脉","浓度":92,"觉醒层":8,"自":"斗罗历2652年07月01日"}]}],"暗魔邪神虎":[{"部":"斗1","血脉":[{"名":"暗魔邪神虎血脉","血系":"暗魔邪神虎","源位":"王脉","浓度":90,"觉醒层":7,"自":"斗罗历2654年05月31日"}]}],"王冬儿":[{"部":"斗2","血脉":[{"名":"海神血脉","血系":"海神一脉","源位":"王脉","浓度":72,"觉醒层":3,"自":"斗罗历12631年08月20日"},{"名":"海神血脉","血系":"海神一脉","源位":"王脉","浓度":90,"觉醒层":8,"自":"斗罗历12638年02月05日"}]}],"王秋儿":[{"部":"斗2","血脉":[{"名":"帝皇瑞兽血脉","血系":"瑞兽一脉","源位":"嫡源","浓度":95,"觉醒层":8,"自":"斗罗历2633年"},{"名":"黄金龙血脉","血系":"龙族","源位":"真脉","浓度":90,"觉醒层":7,"自":"斗罗历12636年04月01日"}]}],"贝贝":[{"部":"斗2","血脉":[{"名":"光明圣龙血脉","血系":"龙族","源位":"真脉","浓度":26,"觉醒层":2,"自":"斗罗历12631年08月15日"},{"名":"光明圣龙血脉","血系":"龙族","源位":"真脉","浓度":88,"觉醒层":7,"自":"斗罗历12638年03月18日"}]}],"穆恩":[{"部":"斗2","血脉":[{"名":"光明圣龙血脉","血系":"龙族","源位":"真脉","浓度":94,"觉醒层":9,"自":"斗罗历12504年07月19日"}]}],"龙逍遥":[{"部":"斗2","血脉":[{"名":"黑暗圣龙血脉","血系":"龙族","源位":"真脉","浓度":94,"觉醒层":9,"自":"斗罗历12390年"}]}],"徐三石":[{"部":"斗2","血脉":[{"名":"玄冥龟血脉","血系":"玄武一脉","源位":"支脉","浓度":68,"觉醒层":3,"自":"斗罗历12631年08月20日"},{"名":"玄武血脉","血系":"玄武一脉","源位":"王脉","浓度":85,"觉醒层":7,"自":"斗罗历12637年07月24日"},{"名":"玄武血脉","血系":"玄武一脉","源位":"王脉","浓度":94,"觉醒层":9,"自":"斗罗历12638年03月18日"}]}],"唐雅":[{"部":"斗2","血脉":[{"名":"蓝银灵脉","血系":"蓝银皇","源位":"余脉","浓度":30,"觉醒层":1,"自":"斗罗历12631年08月15日"},{"名":"暗黑蓝银草血脉","血系":"蓝银皇","源位":"真脉","浓度":78,"觉醒层":6,"自":"斗罗历12632年12月01日"},{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":86,"觉醒层":7,"自":"斗罗历12640年07月06日"}]}],"马小桃":[{"部":"斗2","血脉":[{"名":"邪火凤凰血脉","血系":"凤凰一脉","源位":"支脉","浓度":75,"觉醒层":4,"自":"斗罗历12631年08月22日"},{"名":"火凤凰血脉","血系":"凤凰一脉","源位":"真脉","浓度":90,"觉醒层":8,"自":"斗罗历12640年06月22日"}]}],"玄老":[{"部":"斗2","血脉":[{"名":"饕餮神牛血脉","血系":"龙族","源位":"王脉","浓度":80,"觉醒层":7,"自":"斗罗历12537年"},{"名":"饕餮神牛血脉","血系":"龙族","源位":"王脉","浓度":94,"觉醒层":9,"自":"斗罗历12637年11月02日"}]}],"叶骨衣":[{"部":"斗2","血脉":[{"名":"神圣天使血脉","血系":"天使一脉","源位":"支脉","浓度":80,"觉醒层":7,"自":"斗罗历12637年"}]}],"南水水":[{"部":"斗2","血脉":[{"名":"地龙血脉","血系":"龙族","源位":"余脉","浓度":74,"觉醒层":6,"自":"斗罗历12612年"}]}],"帝天":[{"部":"斗2","血脉":[{"名":"金眼黑龙王血脉","血系":"龙族","源位":"真脉","浓度":96,"觉醒层":8,"自":"斗罗历12633年"}]},{"部":"斗3","血脉":[{"名":"金眼黑龙王血脉","血系":"龙族","源位":"真脉","浓度":97,"觉醒层":9,"自":"斗罗历22645年"}]},{"部":"斗4","血脉":[{"名":"金眼黑龙王血脉","血系":"龙族","源位":"真脉","浓度":98,"觉醒层":9,"自":"斗罗历32642年12月27日"}]}],"雪帝":[{"部":"斗2","血脉":[{"名":"冰天雪女血脉","血系":"冰天雪女","源位":"王脉","浓度":96,"觉醒层":9,"自":"斗罗历前687363年"}]},{"部":"神界","血脉":[{"名":"冰天雪女血脉","血系":"冰天雪女","源位":"王脉","浓度":96,"觉醒层":9,"自":"斗罗历12645年"}]},{"部":"英雄","血脉":[{"名":"冰天雪女血脉","血系":"冰天雪女","源位":"王脉","浓度":97,"觉醒层":9,"自":"斗罗历22646年10月01日"}]}],"冰帝":[{"部":"斗2","血脉":[{"名":"冰碧帝皇蝎血脉","血系":"冰碧帝皇蝎","源位":"王脉","浓度":94,"觉醒层":9,"自":"斗罗历前387369年"}]},{"部":"神界","血脉":[{"名":"冰碧帝皇蝎血脉","血系":"冰碧帝皇蝎","源位":"王脉","浓度":95,"觉醒层":9,"自":"斗罗历12645年"}]}],"天梦冰蚕":[{"部":"斗2","血脉":[{"名":"金纹冰蚕血脉","血系":"冰蚕一脉","源位":"王脉","浓度":92,"觉醒层":9,"自":"斗罗历前987370年"}]}],"碧姬":[{"部":"斗2","血脉":[{"名":"翡翠天鹅血脉","血系":"翡翠天鹅","源位":"王脉","浓度":93,"觉醒层":8,"自":"斗罗历前567364年"}]},{"部":"斗4","血脉":[{"名":"翡翠天鹅血脉","血系":"翡翠天鹅","源位":"王脉","浓度":95,"觉醒层":9,"自":"斗罗历32642年12月27日"}]}],"熊君":[{"部":"斗2","血脉":[{"名":"暗金恐爪熊王血脉","血系":"暗金恐爪熊","源位":"王脉","浓度":92,"觉醒层":8,"自":"斗罗历前457363年"}]},{"部":"斗3","血脉":[{"名":"暗金恐爪熊王血脉","血系":"暗金恐爪熊","源位":"王脉","浓度":93,"觉醒层":9,"自":"斗罗历22646年"}]}],"万妖王":[{"部":"斗2","血脉":[{"名":"万妖王血脉","血系":"妖眼魔树","源位":"王脉","浓度":92,"觉醒层":8,"自":"斗罗历前517363年"}]}],"赤王":[{"部":"斗2","血脉":[{"名":"三头赤魔獒血脉","血系":"三头赤魔獒","源位":"王脉","浓度":89,"觉醒层":8,"自":"斗罗历前287363年"}]}],"牛天":[{"部":"斗2","血脉":[{"名":"天青牛蟒血脉","血系":"天青牛蟒","源位":"王脉","浓度":93,"觉醒层":9,"自":"斗罗历12636年12月16日"}]}],"泰坦":[{"部":"斗2","血脉":[{"名":"巨魔泰坦血脉","血系":"泰坦巨猿","源位":"王脉","浓度":92,"觉醒层":9,"自":"斗罗历12636年12月16日"}]}],"黄金玳瑁":[{"部":"斗2","血脉":[{"名":"黄金玄武血脉","血系":"玄武一脉","源位":"真脉","浓度":88,"觉醒层":8,"自":"斗罗历前87370年"}]}],"阿泰":[{"部":"斗2","血脉":[{"名":"泰坦雪魔血脉","血系":"泰坦巨猿","源位":"真脉","浓度":90,"觉醒层":8,"自":"斗罗历前197369年"}]}],"唐舞桐":[{"部":"神界","血脉":[{"名":"海神血脉","血系":"海神一脉","源位":"王脉","浓度":92,"觉醒层":8,"自":"斗罗历22445年"},{"名":"修罗神血脉","血系":"修罗一脉","源位":"王脉","浓度":86,"觉醒层":7,"自":"斗罗历22625年07月17日"}]},{"部":"英雄","血脉":[{"名":"海神血脉","血系":"海神一脉","源位":"王脉","浓度":92,"觉醒层":8,"自":"斗罗历22646年10月01日"},{"名":"修罗神血脉","血系":"修罗一脉","源位":"王脉","浓度":88,"觉醒层":8,"自":"斗罗历22646年10月01日"}]},{"部":"斗4","血脉":[{"名":"海神血脉","血系":"海神一脉","源位":"王脉","浓度":93,"觉醒层":9,"自":"斗罗历32650年05月07日"},{"名":"修罗神血脉","血系":"修罗一脉","源位":"王脉","浓度":90,"觉醒层":9,"自":"斗罗历32650年05月07日"}]}],"唐舞麟":[{"部":"神界","血脉":[{"名":"海神血脉","血系":"海神一脉","源位":"王脉","浓度":88,"觉醒层":1,"自":"斗罗历22625年07月18日"},{"名":"生命亲和血脉","血系":"创世一脉","源位":"支脉","浓度":90,"觉醒层":3,"自":"斗罗历22625年07月18日"},{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":18,"觉醒层":0,"自":"斗罗历22625年07月19日"}]},{"部":"斗3","血脉":[{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":18,"觉醒层":0,"自":"斗罗历22625年07月19日"},{"名":"蓝银灵脉","血系":"蓝银皇","源位":"余脉","浓度":22,"觉醒层":0,"自":"斗罗历22631年07月18日"},{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":28,"觉醒层":1,"自":"斗罗历22634年12月12日"},{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":35,"觉醒层":2,"自":"斗罗历22639年01月04日"},{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":42,"觉醒层":4,"自":"斗罗历22639年07月19日"},{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":90,"觉醒层":7,"自":"斗罗历22640年10月20日"},{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":68,"觉醒层":10,"自":"斗罗历22646年03月11日"},{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":88,"觉醒层":16,"自":"斗罗历22648年08月02日"},{"名":"海神血脉","血系":"海神一脉","源位":"王脉","浓度":92,"觉醒层":8,"自":"斗罗历22648年08月02日"}]},{"部":"斗4","血脉":[{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":88,"觉醒层":16,"自":"斗罗历32631年07月01日"},{"名":"蓝银皇血脉","血系":"蓝银皇","源位":"真脉","浓度":94,"觉醒层":9,"自":"斗罗历32631年07月01日"},{"名":"海神血脉","血系":"海神一脉","源位":"王脉","浓度":92,"觉醒层":9,"自":"斗罗历32631年07月01日"},{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":95,"觉醒层":17,"自":"斗罗历32648年07月12日"},{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":100,"觉醒层":18,"自":"斗罗历32650年05月07日"}]}],"毁灭之神":[{"部":"神界","血脉":[{"名":"毁灭之神血脉","血系":"创世一脉","源位":"嫡源","浓度":100,"觉醒层":9,"自":"斗罗历22445年"},{"名":"创世神血脉","血系":"创世一脉","源位":"始源","浓度":100,"觉醒层":9,"自":"斗罗历22625年07月19日"}]}],"生命女神":[{"部":"神界","血脉":[{"名":"生命女神血脉","血系":"创世一脉","源位":"嫡源","浓度":100,"觉醒层":9,"自":"斗罗历22445年"},{"名":"创世神血脉","血系":"创世一脉","源位":"始源","浓度":100,"觉醒层":9,"自":"斗罗历22625年07月19日"}]}],"金龙王":[{"部":"神界","血脉":[{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":100,"觉醒层":18,"自":"斗罗历前5000年"}]}],"银龙王":[{"部":"神界","血脉":[{"名":"银龙王血脉","血系":"龙族","源位":"嫡源","浓度":96,"觉醒层":8,"自":"斗罗历前5000年"}]}],"雷龙":[{"部":"神界","血脉":[{"名":"雷龙血脉","血系":"龙族","源位":"真脉","浓度":90,"觉醒层":8,"自":"斗罗历前4500年"}]}],"紫帝":[{"部":"英雄","血脉":[{"名":"紫晶比蒙血脉","血系":"比蒙一脉","源位":"嫡源","浓度":100,"觉醒层":9,"自":"斗罗历22646年10月01日"}]}],"雷翔":[{"部":"英雄","血脉":[{"名":"堕落天使血脉","血系":"天使一脉","源位":"王脉","浓度":96,"觉醒层":9,"自":"斗罗历22646年10月01日"}]}],"墨月":[{"部":"英雄","血脉":[{"名":"堕落天使血脉","血系":"天使一脉","源位":"王脉","浓度":94,"觉醒层":9,"自":"斗罗历22646年10月01日"}]}],"古月娜":[{"部":"斗3","血脉":[{"名":"银龙王血脉","血系":"龙族","源位":"嫡源","浓度":75,"觉醒层":4,"自":"斗罗历22631年07月18日"},{"名":"银龙王血脉","血系":"龙族","源位":"嫡源","浓度":92,"觉醒层":7,"自":"斗罗历22644年09月11日"},{"名":"银龙王血脉","血系":"龙族","源位":"嫡源","浓度":98,"觉醒层":9,"自":"斗罗历22647年02月25日"}]},{"部":"斗4","血脉":[{"名":"银龙王血脉","血系":"龙族","源位":"嫡源","浓度":82,"觉醒层":6,"自":"斗罗历32631年01月01日"},{"名":"银龙王血脉","血系":"龙族","源位":"嫡源","浓度":100,"觉醒层":9,"自":"斗罗历32649年03月04日"}]}],"原恩夜辉":[{"部":"斗3","血脉":[{"名":"泰坦裔血脉","血系":"泰坦巨猿","源位":"支脉","浓度":78,"觉醒层":4,"自":"斗罗历22631年"},{"名":"堕落天使血脉","血系":"天使一脉","源位":"王脉","浓度":82,"觉醒层":5,"自":"斗罗历22631年"},{"名":"泰坦巨猿血脉","血系":"泰坦巨猿","源位":"真脉","浓度":92,"觉醒层":8,"自":"斗罗历22647年09月01日"}]}],"原恩震天":[{"部":"斗3","血脉":[{"名":"泰坦巨猿血脉","血系":"泰坦巨猿","源位":"真脉","浓度":86,"觉醒层":7,"自":"斗罗历22577年"},{"名":"巨魔泰坦血脉","血系":"泰坦巨猿","源位":"王脉","浓度":90,"觉醒层":9,"自":"斗罗历22647年09月01日"}]}],"原恩天宕":[{"部":"斗3","血脉":[{"名":"泰坦巨猿血脉","血系":"泰坦巨猿","源位":"真脉","浓度":82,"觉醒层":6,"自":"斗罗历22599年"},{"名":"泰坦巨猿血脉","血系":"泰坦巨猿","源位":"真脉","浓度":90,"觉醒层":8,"自":"斗罗历22647年09月01日"}]}],"乐正宇":[{"部":"斗3","血脉":[{"名":"神圣天使血脉","血系":"天使一脉","源位":"支脉","浓度":82,"觉醒层":7,"自":"斗罗历22639年"}]}],"蓝佛子":[{"部":"斗3","血脉":[{"名":"深海魔鲸王血脉","血系":"深海魔鲸","源位":"王脉","浓度":90,"觉醒层":7,"自":"斗罗历22647年07月18日"},{"名":"深海魔鲸王血脉","血系":"深海魔鲸","源位":"王脉","浓度":98,"觉醒层":9,"自":"斗罗历22648年05月15日"}]}],"魔皇":[{"部":"斗3","血脉":[{"名":"深海魔鲸王血脉","血系":"深海魔鲸","源位":"王脉","浓度":94,"觉醒层":8,"自":"斗罗历2655年06月20日"},{"名":"深海魔鲸王血脉","血系":"深海魔鲸","源位":"王脉","浓度":99,"觉醒层":9,"自":"斗罗历22648年05月15日"}]}],"龙跃":[{"部":"斗3","血脉":[{"名":"山龙王血脉","血系":"龙族","源位":"王脉","浓度":88,"觉醒层":7,"自":"斗罗历22631年"}]}],"龙夜月":[{"部":"斗3","血脉":[{"名":"光明圣龙血脉","血系":"龙族","源位":"真脉","浓度":90,"觉醒层":8,"自":"斗罗历22537年"},{"名":"黑暗圣龙血脉","血系":"龙族","源位":"真脉","浓度":90,"觉醒层":8,"自":"斗罗历22537年"}]}],"恩慈":[{"部":"斗3","血脉":[{"名":"光明圣龙血脉","血系":"龙族","源位":"真脉","浓度":89,"觉醒层":8,"自":"斗罗历22570年"}]}],"冷遥茱":[{"部":"斗3","血脉":[{"名":"天凤血脉","血系":"凤凰一脉","源位":"真脉","浓度":88,"觉醒层":8,"自":"斗罗历22639年"}]}],"陈新杰":[{"部":"斗3","血脉":[{"名":"海神支脉","血系":"海神一脉","源位":"支脉","浓度":84,"觉醒层":8,"自":"斗罗历22639年"}]}],"深渊圣君":[{"部":"斗3","血脉":[{"名":"深渊圣君血脉","血系":"深红一脉","源位":"嫡源","浓度":98,"觉醒层":9,"自":"斗罗历6346年"}]}],"黑帝":[{"部":"斗3","血脉":[{"名":"深渊帝君血脉","血系":"深红一脉","源位":"王脉","浓度":92,"觉醒层":8,"自":"斗罗历22646年"}]}],"绮罗郁金香":[{"部":"斗3","血脉":[{"名":"绮罗郁金香血脉","血系":"妖眼魔树","源位":"真脉","浓度":92,"觉醒层":8,"自":"斗罗历22547年"}]}],"雷鸣阎狱藤":[{"部":"斗3","血脉":[{"名":"雷鸣阎狱藤血脉","血系":"妖眼魔树","源位":"真脉","浓度":88,"觉醒层":7,"自":"斗罗历22617年"}]}],"蓝轩宇":[{"部":"斗4","血脉":[{"名":"金龙王血脉","血系":"龙族","源位":"嫡源","浓度":62,"觉醒层":2,"自":"斗罗历32631年01月01日"},{"名":"银龙王血脉","血系":"龙族","源位":"嫡源","浓度":62,"觉醒层":2,"自":"斗罗历32631年01月01日"},{"名":"龙神血脉","血系":"龙族","源位":"始源","浓度":65,"觉醒层":4,"自":"斗罗历32642年02月25日"},{"名":"龙神血脉","血系":"龙族","源位":"始源","浓度":90,"觉醒层":7,"自":"斗罗历32649年11月16日"},{"名":"龙神血脉","血系":"龙族","源位":"始源","浓度":100,"觉醒层":9,"自":"斗罗历32650年05月07日"}]}],"白秀秀":[{"部":"斗4","血脉":[{"名":"魔魂大白鲨王血脉","血系":"魔魂大白鲨","源位":"真脉","浓度":90,"觉醒层":6,"自":"斗罗历前67000年01月01日"},{"名":"深渊魔龙血脉","血系":"龙族","源位":"真脉","浓度":84,"觉醒层":7,"自":"斗罗历32645年11月20日"},{"名":"深渊冰魔龙血脉","血系":"龙族","源位":"真脉","浓度":96,"觉醒层":9,"自":"斗罗历32649年12月02日"}]}],"蓝梦琴":[{"部":"斗4","血脉":[{"名":"雪女血脉","血系":"冰天雪女","源位":"真脉","浓度":86,"觉醒层":5,"自":"斗罗历32629年"},{"名":"翡翠天鹅血脉","血系":"翡翠天鹅","源位":"王脉","浓度":88,"觉醒层":6,"自":"斗罗历32642年12月28日"},{"名":"翡翠凤凰血脉","血系":"凤凰一脉","源位":"真脉","浓度":93,"觉醒层":8,"自":"斗罗历32645年11月20日"}]}],"原恩辉辉":[{"部":"斗4","血脉":[{"名":"自然精灵血脉","血系":"精灵一脉","源位":"真脉","浓度":84,"觉醒层":4,"自":"斗罗历32630年"},{"名":"泰坦裔血脉","血系":"泰坦巨猿","源位":"支脉","浓度":62,"觉醒层":3,"自":"斗罗历32630年"},{"名":"精灵王血脉","血系":"精灵一脉","源位":"王脉","浓度":95,"觉醒层":9,"自":"斗罗历32642年02月25日"}]}],"刘锋":[{"部":"斗4","血脉":[{"名":"白龙王血脉","血系":"龙族","源位":"王脉","浓度":18,"觉醒层":3,"自":"斗罗历32642年02月25日"},{"名":"白龙王血脉","血系":"龙族","源位":"王脉","浓度":95,"觉醒层":9,"自":"斗罗历32650年01月05日"}]}],"钱磊":[{"部":"斗4","血脉":[{"名":"黄金比蒙血脉","血系":"比蒙一脉","源位":"王脉","浓度":78,"觉醒层":5,"自":"斗罗历32642年02月26日"},{"名":"黄金比蒙血脉","血系":"比蒙一脉","源位":"王脉","浓度":96,"觉醒层":9,"自":"斗罗历32650年01月11日"}]}],"唐雨格":[{"部":"斗4","血脉":[{"名":"五行麒麟血脉","血系":"麒麟一脉","源位":"真脉","浓度":86,"觉醒层":6,"自":"斗罗历32626年"},{"名":"天干麒麟血脉","血系":"麒麟一脉","源位":"王脉","浓度":95,"觉醒层":9,"自":"斗罗历32645年12月11日"}]}],"龙神":[{"部":"斗4","血脉":[{"名":"龙神血脉","血系":"龙族","源位":"始源","浓度":100,"觉醒层":9,"自":"斗罗历前30100000年"}]}],"深红之母":[{"部":"斗4","血脉":[{"名":"深红之母血脉","血系":"深红一脉","源位":"始源","浓度":100,"觉醒层":9,"自":"斗罗历32649年07月01日"}]}],"江炜强":[{"部":"斗4","血脉":[{"名":"火龙王血脉","血系":"龙族","源位":"王脉","浓度":95,"觉醒层":9,"自":"斗罗历32648年09月01日"}]}],"嘉琳":[{"部":"斗4","血脉":[{"名":"火龙王血脉","血系":"龙族","源位":"王脉","浓度":93,"觉醒层":8,"自":"斗罗历32649年12月01日"}]}],"钟志昌":[{"部":"斗4","血脉":[{"名":"光明龙王血脉","血系":"龙族","源位":"王脉","浓度":94,"觉醒层":9,"自":"斗罗历32649年02月20日"}]}],"皇元朗":[{"部":"斗4","血脉":[{"名":"天龙血脉","血系":"龙族","源位":"真脉","浓度":88,"觉醒层":7,"自":"斗罗历32648年09月01日"}]}],"罗镧":[{"部":"斗4","血脉":[{"名":"天龙血脉","血系":"龙族","源位":"真脉","浓度":92,"觉醒层":8,"自":"斗罗历32648年10月01日"}]}],"魔后":[{"部":"斗4","血脉":[{"名":"深渊魔龙血脉","血系":"龙族","源位":"真脉","浓度":92,"觉醒层":8,"自":"斗罗历32642年12月27日"}]}],"蓝冰":[{"部":"斗4","血脉":[{"名":"极北冰灵血脉","血系":"冰天雪女","源位":"支脉","浓度":80,"觉醒层":6,"自":"斗罗历32629年"}]}],"云蓼":[{"部":"斗4","血脉":[{"名":"自然精灵血脉","血系":"精灵一脉","源位":"真脉","浓度":90,"觉醒层":7,"自":"斗罗历32629年"}]}],"原恩光军":[{"部":"斗4","血脉":[{"名":"泰坦龙血脉","血系":"龙族","源位":"真脉","浓度":91,"觉醒层":8,"自":"斗罗历32649年03月04日"}]}],"原恩风雨":[{"部":"斗4","血脉":[{"名":"泰坦巨猿血脉","血系":"泰坦巨猿","源位":"真脉","浓度":85,"觉醒层":7,"自":"斗罗历32625年"}]}],"金妮":[{"部":"斗4","血脉":[{"名":"三眼金猊血脉","血系":"瑞兽一脉","源位":"王脉","浓度":92,"觉醒层":7,"自":"斗罗历32642年12月27日"}]}],"荆棘龙":[{"部":"斗4","血脉":[{"名":"荆棘龙血脉","血系":"龙族","源位":"余脉","浓度":75,"觉醒层":5,"自":"斗罗历32642年12月27日"}]}],"寻宝兽":[{"部":"斗4","血脉":[{"名":"寻宝兽血脉","血系":"寻宝兽脉","源位":"王脉","浓度":94,"觉醒层":9,"自":"斗罗历前95000年"}]}],"唐空空":[{"部":"斗4","血脉":[{"名":"空之虫血脉","血系":"寻宝兽脉","源位":"真脉","浓度":95,"觉醒层":9,"自":"斗罗历前10000年"}]}]},"遗传":{"武魂":{"同武魂":[{"结果":"随父","概率":0.47},{"结果":"随母","概率":0.47},{"结果":"变异","概率":0.04},{"结果":"废武魂","概率":0.02}],"异武魂":[{"结果":"随父","概率":0.42},{"结果":"随母","概率":0.42},{"结果":"双生","概率":0.03},{"结果":"变异","概率":0.08},{"结果":"废武魂","概率":0.04},{"结果":"无武魂","概率":0.01}],"一方废或无":[{"结果":"随父","概率":0.32},{"结果":"随母","概率":0.32},{"结果":"变异","概率":0.1},{"结果":"废武魂","概率":0.18},{"结果":"无武魂","概率":0.08}],"一方双生":[{"结果":"随父","概率":0.38},{"结果":"随母","概率":0.38},{"结果":"双生","概率":0.1},{"结果":"变异","概率":0.1},{"结果":"废武魂","概率":0.03},{"结果":"无武魂","概率":0.01}],"一方神赐":[{"结果":"随父","概率":0.45},{"结果":"随母","概率":0.45},{"结果":"双生","概率":0.04},{"结果":"变异","概率":0.05},{"结果":"废武魂","概率":0.01}]},"万年稀释":{"每千年系数":0.88,"修正":[{"条件":"宗门有血脉类设施","系数":0.96},{"条件":"兴衰档为鼎盛延续","系数":0.95},{"条件":"兴衰档为守成或中兴","系数":0.92},{"条件":"同血系老祖坐镇","系数":0.97}]}},"神赐武魂":["六翼天使","海神"],"进化神级":[{"武魂":"时空之龙","自":["光龙匕","影龙匕"]}],"原作位阶":{"昊天宗":"天下名宗","七宝琉璃宗":"天下名宗","蓝电霸王龙家族":"天下名宗","唐门":"一方名门","力之一族":"一方名门","御之一族":"一方名门","敏之一族":"地方豪强","破之一族":"一方名门","象甲宗":"一流大宗","武魂殿千家":"天下名宗","海神岛":"天下名宗","本体宗":"天下名宗","昊天堡":"天下名宗","九宝琉璃宗":"天下名宗","白虎公爵府":"一流大宗","地龙门":"一方名门","夕水盟":"一流大宗","圣灵教":"天下名宗","冰火魔厨门":"天下名宗","东龙八宗":"擎天巨擘","千古家族":"擎天巨擘","原恩家族":"天下名宗","星罗戴家":"天下名宗","冰族":"一方名门","天龙族":"擎天巨擘","天马族":"擎天巨擘"}};

/* 宗门与血脉 · 规则（斗罗ZOD、开局、宗门脚本、测试共用；纯函数，不碰页面）
 * 依赖（同一作用域）：共用/规则.js；SBC（共用/宗门血脉数据.js，build.py 从 宗门血脉成就/gemini交付/ 生成）。
 * 口径：宗门血脉成就/变量契约.md（下面的 §x 都指它）。
 *   无状态的部分（派生数、条数上限、原作血脉自动填）在 finishSect / finishBloods / applyBloodRelations，ZOD 每次解析都跑；
 *   要对比上一轮的部分（兴衰一格、单轮幅度、月结、完工、陨落、遗传建议）在 guardSect，ZOD 在 MVU 更新结束事件里跑。
 */

// ───────── 常量 ─────────
const SECT_LIMIT = Object.freeze({
  设施: 24, 产业: 16, 工程: 6, 门人: 40, 祖谱: 30, 编年: 30, 宗门令: 10, 待办: 6, 远待办: 2, 留结算: 4,
  传承武魂: 6, 功法: 12, 镇宗之宝: 8, 祖训: 8, 物资: 30, 血脉: 3, 换代: 10, 结算月: 1200, 提醒: 12,
});
const SECT_FORMS = Object.freeze(['宗门', '家族', '门派', '学院', '兽族']);
const SECT_ORIGINS = Object.freeze(['白手起家', '继承家族', '原作宗门', '正文立宗']);
const SECT_PHASES = Object.freeze(['草创', '兴起', '鼎盛', '守成', '衰落', '中兴', '覆灭']);
const PHASE_STEP = Object.freeze({ 草创: ['兴起'], 兴起: ['鼎盛', '衰落'], 鼎盛: ['守成', '衰落'], 守成: ['鼎盛', '衰落'], 衰落: ['中兴', '守成'], 中兴: ['鼎盛', '守成', '衰落'], 覆灭: ['草创'] });
const FAC_KINDS = Object.freeze(['修炼', '药园', '锻造', '魂导', '藏经', '护宗', '兽园', '居所', '血脉', '祭祀', '其他']);
const IND_KINDS = Object.freeze(['药铺', '丹坊', '锻造铺', '拍卖行', '矿脉', '商队', '魂导器厂', '斗铠工坊', '机甲厂', '田庄', '酒楼', '航运', '其他']);
const ORDER_KINDS = Object.freeze(['兴建', '升级', '修复', '开产业', '派遣', '收徒', '闭关', '外交', '动用底蕴', '其他']);
const TREASURE_KINDS = Object.freeze(['神器', '魂导器', '斗铠', '魂骨', '仙草', '典籍', '其他']);
const STANCES = Object.freeze(['盟友', '友善', '中立', '敌视', '死敌']);
const BLOOD_SOURCES = Object.freeze(['始源', '嫡源', '王脉', '真脉', '支脉', '余脉']);
const BLOOD_TIERS = Object.freeze(['太初', '至尊', '帝皇', '真灵', '灵血', '凡血']);
const BLOOD_ORIGINS = Object.freeze(['先天', '返祖', '变异', '融合', '神赐', '机缘', '开局设定']);
// §9 实力分
const HEIR_SOUL_PTS = Object.freeze({ 废: 0, 普通: 5, 优秀: 10, 顶级: 20, 神级: 60, 超神级: 120 });
const BLOOD_TIER_PTS = Object.freeze({ 凡血: 5, 灵血: 10, 真灵: 20, 帝皇: 40, 至尊: 60, 太初: 120 });
// §5 用户点名的例外：形态仍是血脉，按武魂名认，最高到这一档
const GOD_SOUL_EXCEPT = Object.freeze({ 金龙王血脉: '神级', 银龙王血脉: '神级', 龙神血脉: '超神级' });
const QUALITY_ORDER = Object.freeze(['废', '普通', '优秀', '顶级', '神级', '超神级']);
// 修复工程：本卡规则，按目标等级的建造费与工期各取四成
const REPAIR_RATE = 0.4;
// 宗门传承每月的底蕴积累（本卡规则）：传承武魂每种 2、功法每部 1、镇宗之宝每件 1（神器 3）
const HEIR_ACCRUE = Object.freeze({ 武魂: 2, 功法: 1, 宝: 1, 神器: 3 });
// 驻地在没有凡间货币的地方：公库直接按宗门币值记（§1.5）
const DIVINE_SEAT = /神界|异界|上界|神域|神国|神殿|神山|神宫/u;

// 本轮解析时脚本改过、要告诉 AI 的事：finishRoot 开头清空，更新结束事件里由 guardSect 收进 脚本提醒
const SBC_NOTES = [];
function sbcNote(s) { if (s && !SBC_NOTES.includes(s) && SBC_NOTES.length < 40) SBC_NOTES.push(s); }

const sbcClone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
const sbcFull = (s) => (typeof s === 'string' && /\d+年\d{1,2}月\d{1,2}日$/u.test(s.replace(/\s/g, '')) ? dateKey(s) : null);
function takeN(rec, n) {
  if (!isObj(rec)) return {};
  const ks = Object.keys(rec);
  if (ks.length <= n) return rec;
  const out = {};
  for (const k of ks.slice(0, n)) out[k] = rec[k];
  return out;
}

// ───────── 数据表查询 ─────────
const sbcFac = (n) => (n && SBC.设施[n]) || null;
const sbcInd = (n) => (n && SBC.产业[n]) || null;
const sbcTpl = (n) => sbcFac(n) || sbcInd(n);
function tplLevel(t, lv) {
  if (!t || !Array.isArray(t.等级) || !t.等级.length) return null;
  const n = clampN(Math.round(isNum(lv) ? lv : 1), 1, t.等级.length);
  return t.等级.find((x) => x.级 === n) || t.等级[n - 1];
}
const rankRows = () => SBC.位阶;
const rankNo = (name) => SBC.位阶.findIndex((r) => r.名 === name);
function rankOfScore(score) {
  let row = SBC.位阶[0];
  for (const r of SBC.位阶) if (score >= r.实力分) row = r;
  return row;
}
const rankRow = (name) => SBC.位阶.find((r) => r.名 === name) || null;

// ───────── 宗门的钱（§1.5）─────────
// 记账按驻地所在的部：驻地在神界、异界的按宗门币值；在斗罗大陆的按外界日期落在哪一部（神界部、英雄部的日期仍按凡间算）
function sectCoinPart(s, today) {
  if (s && typeof s.驻地 === 'string' && DIVINE_SEAT.test(s.驻地)) return '神域';
  if (!isNum(today)) return '斗1';
  if (today >= PART_START.斗4) return '斗4';
  if (today >= PART_START.斗3) return '斗3';
  if (today >= PART_START.斗2) return '斗2';
  return '斗1';
}
// 宗门所在的“部”（查设施、产业的部别用）：神域按神界
const sectContentPart = (cp) => (cp === '神域' ? '神界' : cp);
function coinBook(cp) {
  if (cp === '神域') return { 币: '宗门币值', 率: 1 };
  const t = SBC.币值[cp] || { 金魂币: 1 };
  const [cur, rate] = Object.entries(t)[0];
  return { 币: cur, 率: rate };
}
const SOUL_PARTS = new Set(['斗1', '斗2']);
function vaultValue(money, cp) {
  if (!isObj(money)) return 0;
  if (SOUL_PARTS.has(cp)) {
    let c = 0;
    for (const [k, v] of Object.entries(money)) { const u = SOUL_COIN_UNIT[k]; if (u && isNum(v)) c += v * u; }
    return c / 100;
  }
  if (cp === '神域') return isNum(money.宗门币值) ? money.宗门币值 : 0;
  const t = SBC.币值[cp] || {};
  let s = 0;
  for (const [k, v] of Object.entries(money)) if (isNum(v) && t[k]) s += v / t[k];
  return s;
}
function normVault(money, cp) {
  if (cp === '神域') {
    const n = isObj(money) ? parseAmount(money.宗门币值) : null;
    return { 宗门币值: Math.max(0, Math.round(isNum(n) ? n : 0)) };
  }
  const out = normalizeWallet(isObj(money) ? money : {}, cp);
  if (!SOUL_PARTS.has(cp)) { const cur = coinBook(cp).币; if (!(cur in out)) out[cur] = 0; }
  return out;
}
// 加减宗门币值（负数为扣）；不够扣时返回 null
function vaultAdd(money, cp, value) {
  const m = normVault(money, cp);
  if (SOUL_PARTS.has(cp)) {
    const c = (m.金魂币 || 0) * 100 + (m.银魂币 || 0) * 10 + (m.铜魂币 || 0) + Math.round(value * 100);
    return c < 0 ? null : splitCopper(c);
  }
  const { 币, 率 } = coinBook(cp);
  const total = vaultValue(m, cp) + value;
  if (total < -1e-9) return null;
  const own = (m[币] || 0) + Math.round(value * 率);
  if (own >= 0) return { ...m, [币]: own };
  // 记账币种不够：其余币种全部折成记账币种
  return { [币]: Math.max(0, Math.round(total * 率)) };
}
// 份例划进主角钱包（主角所在部的币种）
function walletAddValue(wallet, part, value) {
  if (!isNum(value) || value <= 0) return wallet;
  if (part === '斗1' || part === '斗2') {
    const m = normalizeWallet(isObj(wallet) ? wallet : {}, part);
    return splitCopper((m.金魂币 || 0) * 100 + (m.银魂币 || 0) * 10 + (m.铜魂币 || 0) + Math.round(value * 100));
  }
  if (part === '斗3' || part === '斗4') {
    const { 币, 率 } = coinBook(part);
    const m = normalizeWallet(isObj(wallet) ? wallet : {}, part);
    return { ...m, [币]: (m[币] || 0) + Math.round(value * 率) };
  }
  return wallet;
}

// ───────── 血脉（§2）─────────
function bloodLine(name) {
  if (!name) return null;
  for (const [sn, sys] of Object.entries(SBC.血系)) if (sys.成员 && sys.成员[name]) return { 系名: sn, 系: sys, 员: sys.成员[name] };
  return null;
}
const bloodSys = (name) => (name && SBC.血系[name]) || null;
const srcNo = (s) => { const i = BLOOD_SOURCES.indexOf(s); return i < 0 ? 5 : i; };
const tierNo = (t) => { const i = BLOOD_TIERS.indexOf(t); return i < 0 ? 5 : i; };
// §2.2：源位定最高档，浓度低于 30 降一档
function bloodTier(src, purity) {
  return BLOOD_TIERS[Math.min(5, srcNo(src) + (isNum(purity) && purity >= 30 ? 0 : 1))];
}
function wakeCap(name, b) {
  const m = bloodLine(name);
  const sys = (m && m.系) || bloodSys(b && b.血系);
  const w = (m && m.员.觉醒) || (sys && sys.觉醒);
  return w && isNum(w.层数) ? w.层数 : 9;
}
function finishBloods(map, who) {
  if (!isObj(map)) return {};
  const out = {};
  for (const [n, b] of Object.entries(map)) {
    if (!isObj(b)) continue;
    if (Object.keys(out).length >= SECT_LIMIT.血脉) { sbcNote(`${who || '人物'}的血脉超过 ${SECT_LIMIT.血脉} 条：撤掉「${n}」`); continue; }
    const m = bloodLine(n);
    if (!b.血系 && m) b.血系 = m.系名;
    b.觉醒上限 = wakeCap(n, b);
    b.觉醒层 = clampN(isNum(b.觉醒层) ? b.觉醒层 : 0, 0, b.觉醒上限);
    b.品阶 = bloodTier(b.源位, b.浓度);
    if (!b.天赋) { const sys = bloodSys(b.血系); if (sys && sys.天赋) b.天赋 = String(sys.天赋).slice(0, 60); }
    out[n] = b;
  }
  return out;
}
function strongestBlood(map) {
  let best = null;
  for (const [n, b] of entriesOf(map)) {
    if (!isObj(b)) continue;
    const t = tierNo(b.品阶 || bloodTier(b.源位, b.浓度)), s = srcNo(b.源位), c = isNum(b.浓度) ? b.浓度 : 0;
    if (!best || t < best.t || (t === best.t && (s < best.s || (s === best.s && c > best.c)))) best = { n, b, t, s, c };
  }
  return best ? [best.n, best.b] : null;
}
// 键序与 ZOD 的 Blood 结构一致（过两遍结果要逐字相同）
const bloodEntry = (b, extra) => ({
  血系: b.血系 || '', 源位: BLOOD_SOURCES.includes(b.源位) ? b.源位 : '余脉', 浓度: isNum(b.浓度) ? b.浓度 : 0, 觉醒层: isNum(b.觉醒层) ? b.觉醒层 : 0, 觉醒上限: null, 品阶: null,
  来源: BLOOD_ORIGINS.includes(b.来源) ? b.来源 : '先天', 变自: Array.isArray(b.变自) && b.变自.length ? b.变自 : null, 天赋: b.天赋 || '', 获得日期: b.获得日期 || null, ...(extra || {}),
});
// §2.1 原作血脉表：按 (全名, 当前部) 取；只留 自 不晚于今天的（开局早于最早一条时取最早那条）；同血系留最晚的；最多 3 条
function canonBloods(fullName, part, today) {
  const rows = SBC.原作血脉[fullName];
  if (!rows) return null;
  const items = [];
  for (const r of rows) if (r.部 === part) for (const b of r.血脉) items.push(b);
  if (!items.length) return null;
  const k = (b) => { const x = dateKey(b.自); return x == null ? -Infinity : x; };
  items.sort((a, b) => k(a) - k(b));
  let use = isNum(today) ? items.filter((b) => k(b) <= today) : items;
  if (!use.length) use = [items[0]];
  const bySys = new Map();
  for (const b of use) { bySys.delete(b.血系 || b.名); bySys.set(b.血系 || b.名, b); }
  const out = {};
  for (const b of [...bySys.values()].slice(-SECT_LIMIT.血脉)) out[b.名] = bloodEntry({ ...b, 获得日期: b.自 || null });
  return out;
}
// 魂兽 NPC 按种族查血脉谱：成员名去掉“血脉”后与种族相同、或种族里含着它（至少三个字）；否则种族含血系名时取该系的真脉
function speciesBloods(species) {
  if (!species) return null;
  const s = String(species).replace(/血脉$/u, '').trim();
  if (s.length < 2) return null;
  for (const [sn, sys] of Object.entries(SBC.血系)) {
    if (sys.类别 === '神祇') continue;
    const ms = Object.entries(sys.成员 || {});
    const core = (n) => n.replace(/血脉$/u, '');
    let hit = ms.find(([n]) => core(n) === s) || ms.find(([n]) => core(n).length >= 3 && s.includes(core(n)));
    if (!hit && (sn === s || sys.本源 === s || (sn.length >= 2 && s.includes(sn)))) hit = ms.find(([, m]) => m.源位 === '真脉') || null;
    if (hit) return { [hit[0]]: bloodEntry({ 血系: sn, 源位: hit[1].源位, 浓度: 80 }) };
  }
  return null;
}

// ── 压制（§2.3）──
// 一方的血脉：每个血系取最强的一条；兽武魂在某血系“形似武魂”里、又没有该血系真血脉的，按凡血补上
function bloodSide(p) {
  const sys = new Map();
  for (const [n, b] of entriesOf(p && p.血脉)) {
    if (!isObj(b)) continue;
    const key = b.血系 || ((bloodLine(n) || {}).系名) || n;
    const t = tierNo(b.品阶 || bloodTier(b.源位, b.浓度)), s = srcNo(b.源位);
    const cur = sys.get(key);
    if (!cur || t < cur.t || (t === cur.t && s < cur.s)) sys.set(key, { 名: n, t, s, 形似: false });
  }
  for (const [wn, w] of entriesOf(p && p.武魂)) {
    if (!w || w.形态 !== '兽武魂') continue;
    for (const [sn, x] of Object.entries(SBC.血系)) if ((x.形似武魂 || []).includes(wn) && !sys.has(sn)) sys.set(sn, { 名: wn, t: 5, s: 6, 形似: true });
  }
  return sys;
}
/** a 对 b 的血脉关系：同血系取档差最大的一系（品阶相同、源位不同只算敬畏）；没有同系压制时看跨系威压（真血脉品阶差两档以上）。
 *  返回 null 或 { 强: 'a' | 'b' | null, 血系, 阶差, 威压, 形似 } */
function bloodRelation(a, b) {
  const A = bloodSide(a), B = bloodSide(b);
  let best = null;
  for (const [sn, x] of A) {
    const y = B.get(sn);
    if (!y) continue;
    const d = y.t - x.t;
    let c;
    if (d) c = { 强: d > 0 ? 'a' : 'b', 血系: sn, 阶差: Math.abs(d), 威压: false, 形似: d > 0 ? y.形似 : x.形似 };
    else if (x.s !== y.s) c = { 强: x.s < y.s ? 'a' : 'b', 血系: sn, 阶差: 0, 威压: false, 形似: false };
    else c = { 强: null, 血系: sn, 阶差: 0, 威压: false, 形似: false };
    if (!best || c.阶差 > best.阶差 || (best.强 == null && c.强 != null)) best = c;
  }
  if (best && best.强 && best.阶差) return best;
  const top = (M) => { let r = null; for (const [sn, x] of M) if (!x.形似 && (!r || x.t < r.t)) r = { ...x, 系: sn }; return r; };
  const ta = top(A), tb = top(B);
  if (ta && tb && ta.系 !== tb.系 && Math.abs(ta.t - tb.t) >= 2) {
    const [hi, lo] = ta.t < tb.t ? [ta, tb] : [tb, ta];
    return { 强: ta.t < tb.t ? 'a' : 'b', 血系: `${hi.系} › ${lo.系}`, 阶差: Math.abs(ta.t - tb.t), 威压: true, 形似: false };
  }
  return best;
}
const realmNo = (r) => (r ? SPIRIT_REALMS.indexOf(r) : -1);
function attrList(p, onlyPeak) {
  const out = [];
  for (const [, w] of entriesOf(p && p.武魂)) for (const a of (w && w.属性) || []) if (a && a.名称 && (!onlyPeak || a.极致)) out.push(a.名称);
  return out;
}
// 被压方的数值限制：每档 5 级、最多 15；抵消各减一档；修为高出 10–19 减半，20 以上或大层次更高只剩威慑；形似再减半
function pressureLimit(rel, strong, weak) {
  if (!rel || rel.威压 || !rel.阶差) return { 限制: 0, 抵消: [] };
  const off = [];
  if (weak.神位) off.push('神位');
  if (weak.极致.some((x) => strong.属性.includes(x))) off.push('同属性极致');
  if (realmNo(weak.境界) >= 0 && realmNo(weak.境界) > realmNo(strong.境界)) off.push('精神力境界更高');
  const d = rel.阶差 - off.length;
  if (d <= 0) return { 限制: 0, 抵消: off };
  const gap = (weak.常态 || 0) - (strong.常态 || 0);
  if (gap >= 20 || weak.大层次 > strong.大层次) return { 限制: 0, 抵消: [...off, '修为高出太多，只剩威慑'] };
  let lim = Math.min(15, 5 * d);
  if (gap >= 10) lim = Math.floor(lim / 2);
  if (rel.形似) lim = Math.floor(lim / 2);
  return { 限制: lim, 抵消: off };
}
function pressSide(p, normal, part, seat) {
  const god = !!seat;
  return {
    常态: isNum(normal) ? normal : 0, 神位: god, 大层次: bigTier(isNum(normal) ? normal : 0, part, god),
    境界: (p && p.精神力 && p.精神力.境界) || null, 属性: attrList(p, false), 极致: attrList(p, true),
  };
}
/** 写 NPC 的 血脉关系、对手的 血脉压制、主角自动的「血脉压制」与越级条件「血脉威压」（§2.3）。
 *  info：finishBattle 给的 { 对手名: { 常态, 神位 } }。返回 true 表示主角或对手的当前等效等级变了（要重算档差）。 */
function applyBloodRelations(r, part, info) {
  const hero = r.主角;
  for (const [, p] of entriesOf(r.人物)) {
    const rel = bloodRelation(p, hero);
    p.血脉关系 = rel ? { 方向: rel.强 === 'a' ? '上位' : rel.强 === 'b' ? '下位' : '同位', 血系: rel.血系, 阶差: rel.阶差 } : null;
  }
  const b = r.战斗;
  let changed = false, heroLim = 0, heroSrc = '', myAura = false;
  for (const [n, o] of entriesOf(b.对手)) {
    o.血脉压制 = null;
    if (!b.交战中) continue;
    const linked = o.档案 && r.人物[o.档案];
    const foe = { 血脉: Object.keys(o.血脉 || {}).length ? o.血脉 : (linked && linked.血脉) || {}, 武魂: (linked && linked.武魂) || {}, 精神力: linked && linked.精神力 };
    const rel = bloodRelation(hero, foe);
    if (!rel || !rel.强) continue;
    const meta = (info && info[n]) || { 常态: o.等效等级 && o.等效等级.当前, 神位: !!o.神位 };
    const hs = pressSide(hero, hero.等效等级.常态, part, isTrueGod(hero)), fs = pressSide(foe, meta.常态, part, meta.神位);
    const mine = rel.强 === 'a';
    const { 限制, 抵消 } = pressureLimit(rel, mine ? hs : fs, mine ? fs : hs);
    o.血脉压制 = { 方向: mine ? '我压彼' : '彼压我', 血系: rel.血系, 阶差: rel.阶差, 限制, 威压: rel.威压, 抵消 };
    if (mine && 限制 && o.等效等级) { o.等效等级.当前 = Math.max(0, o.等效等级.当前 - 限制); changed = true; }
    if (!mine && 限制 > heroLim) { heroLim = 限制; heroSrc = `${n}的${rel.血系}血脉（高${cnSmall(rel.阶差)}档）${rel.形似 ? '，形似武魂只压武魂魂技' : ''}`; }
    if (mine && rel.威压) myAura = true;
  }
  if (heroLim) {
    for (const k of Object.keys(hero.生效状态)) if (k !== '血脉压制' && /血脉压制/u.test(k) && !hero.生效状态[k].自动) delete hero.生效状态[k];
    hero.生效状态.血脉压制 = { 类型: '限制', 数值: heroLim, 剩余: '交战中', 来源: heroSrc, 自动: true };
    hero.等效等级.当前 = currentLevel(hero.等效等级.常态, hero.生效状态);
    changed = true;
  }
  const used = Array.isArray(b.已用越级条件) ? b.已用越级条件 : [];
  if (myAura && !used.includes('血脉威压')) b.已用越级条件 = [...used, '血脉威压'];
  if (!myAura && used.includes('血脉威压')) b.已用越级条件 = used.filter((x) => x !== '血脉威压');
  return changed;
}

// ───────── 神级武魂（§5）─────────
// 先天觉醒、不是神赐、没有进化记录、不是开局设定、又不在点名例外里却标了神级 / 超神级的，降为顶级；点名例外标高了降到它被定的那一档
function guardGodSoul(p, who) {
  for (const [n, w] of entriesOf(p && p.武魂)) {
    if (!w || (w.品质 !== '神级' && w.品质 !== '超神级')) continue;
    const way = (w.获得 && w.获得.方式) || '';
    if (/^开局设定/u.test(way)) continue;
    const cap = GOD_SOUL_EXCEPT[n];
    if (cap) {
      if (QUALITY_ORDER.indexOf(w.品质) > QUALITY_ORDER.indexOf(cap)) { w.品质 = cap; sbcNote(`${who}·${n}最高${cap}，已改回${cap}。`); }
      continue;
    }
    if (w.形态 === '神赐武魂') continue;
    if (SBC.进化神级.some((x) => x.武魂 === n)) continue;
    if (w.进化 && w.进化.自) { sbcNote(`${who}·${n}标了${w.品质}，有进化记录但不在原作进化神级名单里：正文要交代这次进化的机缘。`); continue; }
    w.品质 = '顶级';
    sbcNote(`${who}·${n}不是神赐武魂、没有进化记录也不是开局设定，品质最高顶级，已改回顶级（昊天锤、七杀剑、九宝琉璃塔这类同样是顶级）。`);
  }
}

// ───────── 宗门派生（无状态，§1、§9）─────────
const postKey = (post) => {
  const s = String(post || '');
  if (/宗主|族长|首领|族王|王$|院长|掌门|家主|盟主/u.test(s) && !/少|副/u.test(s)) return '宗主';
  if (/长老|护法|老祖|供奉|太上|副/u.test(s)) return '长老';
  if (/少|核心|嫡|传人|圣子|圣女|亲传/u.test(s)) return '核心弟子';
  return '弟子';
};
function heirAccrue(s) {
  const H = s.宗门传承 || {};
  let n = Object.keys(H.武魂 || {}).length * HEIR_ACCRUE.武魂 + Object.keys(H.功法 || {}).length * HEIR_ACCRUE.功法;
  for (const t of Object.values(H.镇宗之宝 || {})) n += t && t.类别 === '神器' ? HEIR_ACCRUE.神器 : HEIR_ACCRUE.宝;
  return n;
}
// 每月流水（宗门币值）；stipend 为份例（主角在神界部、英雄部时留在公库，不算支出）
function sectFlow(s, stipend) {
  let 入 = 0, 支 = 0, 积 = heirAccrue(s);
  for (const f of Object.values(s.设施 || {})) if (f && f.状态 === '正常') { 支 += f.维护 || 0; 积 += f.积累 || 0; }
  for (const x of Object.values(s.产业 || {})) {
    if (!x) continue;
    const t = sbcInd(x.模板);
    let v = (x.月产出 && x.月产出.币值) || 0;
    if (!t) v = x.状态 === '经营' ? v : x.状态 === '萧条' ? Math.floor(v / 2) : 0;
    入 += v;
    if (t && x.状态 !== '被占' && x.状态 !== '停业') 支 += (tplLevel(t, x.等级) || {}).维护 || 0;
  }
  支 += stipend || 0;
  return { 入, 支, 净: 入 - 支, 积, 份: stipend || 0 };
}
function sectPower(s, hero, flow, cp) {
  const lv = [];
  if (hero && hero.等效等级 && isNum(hero.等效等级.常态)) lv.push(hero.等效等级.常态);
  for (const m of Object.values(s.门人 || {})) if (m && m.状态 !== '陨落' && m.状态 !== '叛出' && isNum(m.等效等级)) lv.push(m.等效等级);
  lv.sort((a, b) => b - a);
  let 武力 = lv.slice(0, 3).reduce((a, x) => a + x + Math.max(0, x - 100) * 2, 0);
  let facs = 0;
  for (const f of Object.values(s.设施 || {})) if (f && f.状态 === '正常') { facs += f.等级; if (f.类别 === '护宗') 武力 += f.等级 * 5; }
  const 财力 = clampN(Math.floor(flow.净 / 100 + vaultValue(s.公库 && s.公库.钱, cp) / 1000), 0, 300);
  const H = s.宗门传承 || {};
  const souls = Object.values(H.武魂 || {});
  let 传承 = 0;
  for (const w of souls) 传承 += HEIR_SOUL_PTS[w && w.品质] || 0;
  for (const g of Object.values(H.功法 || {})) 传承 += ((g && g.完整度) || 0) / 10;
  for (const t of Object.values(H.镇宗之宝 || {})) 传承 += t && t.类别 === '神器' ? 80 : 15;
  if (s.组织形式 === '兽族' && !souls.length) { const sb = strongestBlood(hero && hero.血脉); if (sb) 传承 += BLOOD_TIER_PTS[sb[1].品阶] || 0; }
  传承 = Math.round(传承);
  const 设施 = facs * 3;
  武力 = Math.round(武力);
  return { 武力, 财力, 传承, 设施, 总分: Math.round(武力 + 财力 + 传承 + 设施 + Math.floor((s.底蕴 || 0) / 10) + (s.声势 || 0)) };
}
function memberLevel(m, people) {
  const p = m.档案 && people && people[m.档案];
  if (p && p.等效等级 && isNum(p.等效等级.当前)) return p.等效等级.当前;
  if (isNum(m.魂力等级)) return m.魂力等级;
  if (isNum(m.修为年限)) return beastLevel(m.修为年限, false);
  return null;
}
// 编年超过 30 条：最早 10 条压成一条概要；祖谱超过 30 条：最早的非主角先祖并成一条
function compressAnnals(list) {
  if (!Array.isArray(list) || list.length <= SECT_LIMIT.编年) return list;
  const sorted = list.slice().sort((a, b) => (dateKey(a.日期) ?? 0) - (dateKey(b.日期) ?? 0));
  while (sorted.length > SECT_LIMIT.编年) {
    const old = sorted.splice(0, 10);
    const a = old[0].日期, z = old[old.length - 1].日期;
    const y = (d) => { const k = dateKey(d); return k == null ? d : `${Math.floor(k / 10000)}年`; };
    sorted.unshift({ 日期: a, 事: `${y(a)}至${y(z)}：${old.map((x) => x.事).join('；')}`.slice(0, 40) });
  }
  return sorted;
}
function compressAncestors(rec) {
  if (!isObj(rec) || Object.keys(rec).length <= SECT_LIMIT.祖谱) return rec;
  const ents = Object.entries(rec);
  const plain = ents.filter(([, a]) => !a.曾为主角);
  plain.sort(([, a], [, b]) => (a.辈分 || 0) - (b.辈分 || 0));
  const over = ents.length - SECT_LIMIT.祖谱 + 1;
  const merge = plain.slice(0, Math.max(2, over));
  const gen = Math.max(...merge.map(([, a]) => a.辈分 || 1));
  const out = {};
  const key = `第${gen}代以前诸先祖`;
  out[key] = { 辈分: gen, 生卒: '', 生平: merge.map(([n]) => n).join('、').slice(0, 60), 遗泽: '', 曾为主角: false };
  const drop = new Set(merge.map(([n]) => n));
  for (const [n, a] of ents) if (!drop.has(n)) out[n] = a;
  return out;
}
/** 宗门的派生数（每次解析都重算）：条数上限、设施产业按模板填、工程完工日与进度、门人等效等级、公库币种、收支、实力、位阶。 */
function finishSect(s, r, part, today) {
  if (!isObj(s)) return null;
  if (!s.名称) return null;
  const cp = sectCoinPart(s, today), book = coinBook(cp);
  s.设施 = takeN(s.设施, SECT_LIMIT.设施);
  s.产业 = takeN(s.产业, SECT_LIMIT.产业);
  s.工程 = (s.工程 || []).slice(0, SECT_LIMIT.工程);
  s.门人 = takeN(s.门人, SECT_LIMIT.门人);
  s.祖谱 = compressAncestors(s.祖谱);
  s.编年 = compressAnnals(s.编年 || []);
  s.宗门令 = (s.宗门令 || []).slice(-SECT_LIMIT.宗门令);
  const H = s.宗门传承;
  H.武魂 = takeN(H.武魂, SECT_LIMIT.传承武魂);
  H.功法 = takeN(H.功法, SECT_LIMIT.功法);
  H.镇宗之宝 = takeN(H.镇宗之宝, SECT_LIMIT.镇宗之宝);
  H.祖训 = (H.祖训 || []).slice(0, SECT_LIMIT.祖训).map((x) => String(x).slice(0, 60));
  s.公库.物资 = takeN(s.公库.物资, SECT_LIMIT.物资);
  s.传承记录.换代 = (s.传承记录.换代 || []).slice(-SECT_LIMIT.换代);
  for (const [n, f] of Object.entries(s.设施)) {
    if (!f.模板 && sbcFac(n)) f.模板 = n;
    const t = sbcFac(f.模板);
    if (t) {
      f.等级 = clampN(f.等级, 1, t.最高等级 || 9);
      const lv = tplLevel(t, f.等级) || {};
      f.类别 = t.类别; f.效果 = String(lv.效果 || '').slice(0, 60); f.维护 = lv.维护 || 0; f.积累 = lv.积累 || 0;
    } else f.积累 = f.等级;
  }
  for (const [n, x] of Object.entries(s.产业)) {
    if (!x.模板 && sbcInd(n)) x.模板 = n;
    const t = sbcInd(x.模板);
    if (!t) continue;
    x.等级 = clampN(x.等级, 1, t.最高等级 || 9);
    const lv = tplLevel(t, x.等级) || {};
    const out = sbcClone(lv.月产出 || { 币值: 0, 物资: [] });
    if (x.状态 === '萧条') out.币值 = Math.floor((out.币值 || 0) / 2);
    if (x.状态 === '被占' || x.状态 === '停业') { out.币值 = 0; out.物资 = []; }
    x.类别 = t.类别; x.月产出 = { 币值: out.币值 || 0, 物资: out.物资 || [] }; x.风险 = String(t.风险 || '').slice(0, 40);
  }
  for (const w of s.工程) {
    const k = dateKey(w.开工);
    w.完工 = k != null ? fmtDate(addDays(k, w.工期)) : null;
    w.进度 = k != null && isNum(today) ? Math.round(clampN((dayNo(today) - dayNo(k)) / Math.max(1, w.工期), 0, 1) * 100) / 100 : 0;
  }
  for (const m of Object.values(s.门人)) m.等效等级 = memberLevel(m, r && r.人物);
  s.公库.钱 = normVault(s.公库.钱, cp);
  const far = part === '神界' || part === '英雄';
  const flow0 = sectFlow(s, 0);
  s.实力 = sectPower(s, r && r.主角, flow0, cp);
  s.位阶 = rankOfScore(s.实力.总分).名;
  const row = rankRow(s.位阶);
  const stipend = far ? 0 : ((row && row.份例) || {})[postKey(s.主角职位)] || 0;
  const flow = sectFlow(s, stipend);
  const unit = (v) => ({ [book.币]: Math.round(v * book.率 * 100) / 100 });
  s.收支 = { 月入: unit(flow.入), 月支: unit(flow.支), 净: unit(flow.净), 上次结算: s.收支.上次结算 || null, 欠费: s.收支.欠费 || 0 };
  return s;
}

// ───────── 遗传建议（§2.5、遗传表）─────────
function pick(rand, list, key) {
  const total = list.reduce((a, x) => a + (x[key] || 0), 0) || 1;
  let r = rand() * total;
  for (const x of list) { r -= x[key] || 0; if (r <= 0) return x; }
  return list[list.length - 1];
}
// 父母的一方：主角、人物档案或门人行
function parentOf(name, root) {
  if (!name) return null;
  const s = root.宗门 || {};
  if (root.主角 && root.主角.姓名 === name) return { kind: 'p', p: root.主角 };
  if (root.人物 && root.人物[name]) return { kind: 'p', p: root.人物[name] };
  if (s.门人 && s.门人[name]) return { kind: 'm', p: s.门人[name] };
  return null;
}
function parentSouls(x) {
  if (!x) return { names: [], waste: true, twin: false, god: false };
  if (x.kind === 'm') {
    const n = String(x.p.武魂 || '').split(/[·・]/u)[0].trim();
    return { names: n && !/^无$/u.test(n) ? [n] : [], waste: !n || /废/u.test(x.p.武魂 || ''), twin: /双生/u.test(x.p.武魂 || ''), god: false };
  }
  const list = entriesOf(x.p.武魂).filter(([, w]) => w && w.形态 !== '血脉');
  return { names: list.map(([n]) => n), waste: !list.length || list.every(([, w]) => w.品质 === '废'), twin: list.length >= 2, god: list.some(([, w]) => w.形态 === '神赐武魂') };
}
function parentBloods(x) {
  if (!x) return [];
  if (x.kind === 'm') {
    const b = x.p.血脉;
    if (!b || !b.名称) return [];
    const m = bloodLine(b.名称);
    return [{ 名: b.名称, 系: m ? m.系名 : b.名称, 源位: m ? m.员.源位 : '支脉', 浓度: b.浓度 || 0 }];
  }
  return entriesOf(x.p.血脉).map(([n, b]) => ({ 名: n, 系: b.血系 || n, 源位: b.源位, 浓度: b.浓度 || 0 }));
}
const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
/** 新生门人的遗传建议：{ 武魂: 文本, 血脉: [{名称, 源位, 浓度}] } */
function heredity(root, member, rand = Math.random) {
  const fa = parentOf(member.父, root), mo = parentOf(member.母, root);
  const A = parentSouls(fa), B = parentSouls(mo);
  let 情形 = '异武魂';
  if (A.waste || B.waste) 情形 = '一方废或无';
  else if (A.god || B.god) 情形 = '一方神赐';
  else if (A.twin || B.twin) 情形 = '一方双生';
  else if (A.names[0] && A.names[0] === B.names[0]) 情形 = '同武魂';
  const res = pick(rand, (SBC.遗传.武魂[情形] || [{ 结果: '随父', 概率: 1 }]), '概率').结果;
  const fn = A.names[0] || null, mn = B.names[0] || null;
  let soul;
  if (res === '随父') soul = fn ? `随父：${fn}` : (A.waste ? '废武魂' : '无武魂');
  else if (res === '随母') soul = mn ? `随母：${mn}` : (B.waste ? '废武魂' : '无武魂');
  else if (res === '双生') soul = fn && mn ? `双生：${fn}＋${mn}` : `随${fn ? '父：' + fn : '母：' + (mn || '无')}`;
  else if (res === '变异') soul = `变异：由${fn || mn || '亲代武魂'}变异而来`;
  else soul = res;
  // 血脉
  const pa = parentBloods(fa), pb = parentBloods(mo), out = [];
  const down = (src) => { const i = srcNo(src); return i >= 5 ? null : BLOOD_SOURCES[i + 1]; };
  const systems = new Map();
  for (const x of pa) systems.set(x.系, { a: x, b: null });
  for (const x of pb) { const c = systems.get(x.系); if (c) c.b = x; else systems.set(x.系, { a: null, b: x }); }
  const two = systems.size >= 2;
  for (const [, { a, b }] of systems) {
    if (a && b) {
      const [hi, lo] = srcNo(a.源位) <= srcNo(b.源位) ? [a, b] : [b, a];
      out.push({ 名称: hi.名, 源位: hi.源位, 浓度: clampN(Math.round(Math.max(a.浓度, b.浓度) * 0.75 + Math.min(a.浓度, b.浓度) * 0.35 + randInt(rand, -5, 8)), 0, 100) });
      continue;
    }
    const x = a || b;
    const src = x.浓度 < 20 ? down(x.源位) : x.源位;
    if (!src) continue;
    out.push({ 名称: x.名, 源位: src, 浓度: clampN(Math.round(x.浓度 * (two ? 0.55 : 0.65) + randInt(rand, -8, 8)), 0, 100) });
  }
  return { 武魂: soul, 血脉: out.slice(0, SECT_LIMIT.血脉), 情形 };
}

// ───────── 宗门把关（要对比上一轮；MVU 更新结束事件里跑）─────────
const monthNo = (k) => { const y = Math.floor(k / 10000), m = Math.floor((k - y * 10000) / 100); return y * 12 + (m - 1); };
const monthStart = (k) => Math.floor(k / 100) * 100 + 1;
const projKey = (w) => `${w.种类}|${w.对象}`;
function projectTemplate(w) {
  if (w.模板 && sbcTpl(w.模板)) return sbcTpl(w.模板);
  if (sbcTpl(w.对象)) { w.模板 = w.对象; return sbcTpl(w.对象); }
  return null;
}
// 新开的工程：照表校验部别、适用、前置与等级，填工期与花费
function admitProject(S, w, cp) {
  const t = projectTemplate(w);
  const isInd = t ? !!sbcInd(w.模板) : !!(S.产业 && S.产业[w.对象]);
  const bag = isInd ? S.产业 : S.设施;
  const cur = bag[w.对象];
  if (w.种类 === '新建' && cur) return `「${w.对象}」已经有了，要升级请开升级工程`;
  if (w.种类 !== '新建' && !cur) return `宗门里没有「${w.对象}」`;
  w.目标等级 = w.种类 === '新建' ? 1 : w.种类 === '升级' ? cur.等级 + 1 : cur.等级;
  if (w.种类 === '修复' && cur.状态 !== '损毁' && cur.状态 !== '被占' && cur.状态 !== '停业') return `「${w.对象}」没有损毁，不用修复`;
  if (!t) return null;
  const P = sectContentPart(cp);
  if (Array.isArray(t.部) && !t.部.includes(P)) return `「${w.模板}」在${P}建不了（只在${t.部.join('、')}）`;
  if (Array.isArray(t.适用) && !t.适用.includes(S.组织形式)) return `「${w.模板}」不适用于${S.组织形式}`;
  if (w.目标等级 > (t.最高等级 || 9)) return `「${w.对象}」已到最高 ${t.最高等级} 级`;
  const pre = t.前置;
  if (pre && pre.设施) { const f = S.设施[pre.设施]; if (!f || f.等级 < (pre.等级 || 1) || f.状态 !== '正常') return `前置未满足：要先有${pre.等级 || 1}级「${pre.设施}」`; }
  if (pre && pre.位阶 && rankNo(S.位阶) < rankNo(pre.位阶)) return `前置未满足：位阶要到「${pre.位阶}」`;
  const lv = tplLevel(t, w.目标等级) || {};
  const rate = w.种类 === '修复' ? REPAIR_RATE : 1;
  w.工期 = Math.max(1, Math.ceil((lv.工期 || 30) * rate));
  w.花费 = Math.round((lv.建造 || 0) * rate);
  if (!w.名称) w.名称 = `${w.对象}${w.种类}`.slice(0, 20);
  return null;
}
function completeProject(S, w, doneKey, tips) {
  const t = projectTemplate(w);
  const isInd = t ? !!sbcInd(w.模板) : !!(S.产业 && S.产业[w.对象]);
  const bag = isInd ? S.产业 : S.设施;
  const when = fmtDate(doneKey);
  let what;
  if (w.种类 === '新建') {
    bag[w.对象] = isInd
      ? { 类别: (t && t.类别) || '其他', 模板: w.模板 || null, 等级: 1, 地点: S.驻地 || '', 主事: null, 月产出: { 币值: 0, 物资: [] }, 风险: '', 状态: '经营' }
      : { 类别: (t && t.类别) || '其他', 模板: w.模板 || null, 等级: 1, 效果: '', 维护: 0, 积累: 0, 状态: '正常', 建成: when };
    what = `${w.对象}建成`;
  } else if (bag[w.对象]) {
    const x = bag[w.对象];
    x.等级 = Math.max(x.等级, w.目标等级);
    if (w.种类 === '修复') x.状态 = isInd ? '经营' : '正常';
    what = w.种类 === '升级' ? `${w.对象}升至${cnSmall(x.等级)}级` : `${w.对象}修复完毕`;
  } else what = `${w.名称}完工，但「${w.对象}」已不在`;
  S.编年.push({ 日期: when, 事: what.slice(0, 40) });
  tips.push(`工程「${w.名称}」已于${when}完工（${what}）：本轮用 <宗务> 写完工（类别｜完工）。`);
}
function settleMonths(S, root, today, tips, log) {
  const last = dateKey(S.收支 && S.收支.上次结算);
  if (last == null) { S.收支.上次结算 = fmtDate(monthStart(today)); return; }
  let n = monthNo(today) - monthNo(last);
  if (n <= 0) return;
  if (n > SECT_LIMIT.结算月) { tips.push(`这一轮跨过 ${n} 个月，宗门只按 ${SECT_LIMIT.结算月} 个月结账。`); n = SECT_LIMIT.结算月; }
  const part = root.时空 && root.时空.当前部;
  const cp = sectCoinPart(S, today);
  let paid = 0, owedMonths = 0, accrued = 0, stipendTotal = 0;
  const far = part === '神界' || part === '英雄';
  for (let i = 0; i < n; i += 1) {
    finishSect(S, root, part, today);
    const row = rankRow(S.位阶);
    const stipend = far ? 0 : ((row && row.份例) || {})[postKey(S.主角职位)] || 0;
    let flow = sectFlow(S, stipend);
    let money = vaultAdd(S.公库.钱, cp, flow.净);
    if (money == null) {
      // 付不起：维护费从高到低停用设施，直到打平
      const fs = Object.entries(S.设施).filter(([, f]) => f.状态 === '正常').sort(([, a], [, b]) => (b.维护 || 0) - (a.维护 || 0));
      const off = [];
      for (const [fn, f] of fs) {
        f.状态 = '停用'; off.push(fn);
        flow = sectFlow(S, stipend);
        money = vaultAdd(S.公库.钱, cp, flow.净);
        if (money != null) break;
      }
      if (money == null) money = vaultAdd(S.公库.钱, cp, flow.净 - flow.份) || normVault({}, cp);
      S.收支.欠费 = Math.min(99, (S.收支.欠费 || 0) + 1);
      owedMonths += 1;
      if (off.length) S.编年.push({ 日期: fmtDate(today), 事: `公库付不起维护，停用${off.join('、')}`.slice(0, 40) });
    } else S.收支.欠费 = 0;
    S.公库.钱 = money;
    S.底蕴 = clampN((S.底蕴 || 0) + flow.积, 0, 99999);
    accrued += flow.积;
    stipendTotal += flow.份;
    paid += 1;
  }
  if (stipendTotal > 0) root.钱包 = walletAddValue(root.钱包, part, stipendTotal);
  S.收支.上次结算 = fmtDate(monthStart(today));
  log.push(`宗门结账 ${paid} 个月：底蕴 +${accrued}${stipendTotal ? `，份例 ${stipendTotal} 宗门币值划进钱包` : ''}${owedMonths ? `，${owedMonths} 个月欠费` : ''}`);
  if (owedMonths) tips.push(`宗门公库有 ${owedMonths} 个月付不起维护费，已按维护费从高到低停用设施：本轮写出后果（人心、声势按情节扣）。`);
}
// 门人：陨落移进祖谱，叛出移出名册；新生门人给遗传建议
function guardMembers(P, S, root, today, tips, rand) {
  const when = isNum(today) ? fmtDate(today) : '';
  for (const [n, m] of Object.entries(S.门人)) {
    if (m.状态 === '陨落') {
      if (!S.祖谱[n]) S.祖谱[n] = { 辈分: m.辈分, 生卒: (isNum(today) ? `卒于${Math.floor(today / 10000)}年` : '').slice(0, 20), 生平: [m.职位, m.备注].filter(Boolean).join('，').slice(0, 60), 遗泽: '', 曾为主角: false };
      delete S.门人[n];
      S.编年.push({ 日期: when, 事: `${m.职位 || '门人'}${n}陨落`.slice(0, 40) });
      tips.push(`门人${n}陨落，已移进祖谱：本轮补全 宗门.祖谱.${n} 的生平、遗泽。`);
    } else if (m.状态 === '叛出') {
      delete S.门人[n];
      S.编年.push({ 日期: when, 事: `${n}叛出宗门`.slice(0, 40) });
    }
  }
  const before = (P && P.门人) || {};
  for (const [n, m] of Object.entries(S.门人)) {
    if (before[n] || !(m.父 || m.母) || (isNum(m.年龄) && m.年龄 > 1)) continue;
    const g = heredity(root, m, rand);
    const bl = g.血脉.length ? g.血脉.map((b) => `${b.名称}（${b.源位}，浓度 ${b.浓度}）`).join('、') : '无';
    tips.push(`新生门人${n}的遗传建议：武魂 ${g.武魂}；血脉 ${bl}。照写进门人行，或在备注写明改写理由。`);
  }
}
// 主角、在场 NPC 的血脉单轮把关（§2.4、§9）
function guardBloods(prevMap, nextMap, who, skip, log) {
  if (!isObj(nextMap)) return;
  const pm = isObj(prevMap) ? prevMap : {};
  for (const [n, b] of Object.entries(nextMap)) {
    const o = pm[n];
    if (o) {
      if (b.源位 !== o.源位) {
        const up = srcNo(o.源位) - srcNo(b.源位);
        const anc = b.来源 === '返祖' && up === 1 && (o.浓度 || 0) >= 90;
        const gift = b.来源 === '神赐' && o.来源 !== '神赐';
        if (!anc && !gift) { b.源位 = o.源位; log.push(`${who}·${n}：源位只在返祖、变异、融合、神赐那一轮能改，还原`); }
      }
      const ancNow = b.来源 === '返祖' && b.源位 !== o.源位;
      if (ancNow) b.浓度 = 55;
      else {
        const cap = skip ? 10 : 5;
        if ((b.浓度 || 0) > (o.浓度 || 0) + cap) { b.浓度 = (o.浓度 || 0) + cap; log.push(`${who}·${n}：浓度单轮最多 +${cap}`); }
      }
      if ((b.觉醒层 || 0) < (o.觉醒层 || 0)) { b.觉醒层 = o.觉醒层; log.push(`${who}·${n}：觉醒层只升不降，还原`); }
      else if ((b.觉醒层 || 0) > (o.觉醒层 || 0) + 1) { b.觉醒层 = (o.觉醒层 || 0) + 1; log.push(`${who}·${n}：觉醒层单轮最多 +1`); }
      continue;
    }
    // 新加的：变异不高过原血脉一个源位以上；融合要同系或配成一对
    const from = Array.isArray(b.变自) ? b.变自 : [];
    if (b.来源 === '变异' && from[0] && pm[from[0]]) {
      const lim = Math.max(0, srcNo(pm[from[0]].源位) - 1);
      if (srcNo(b.源位) < lim) { b.源位 = BLOOD_SOURCES[lim]; log.push(`${who}·${n}：变异最多比原血脉高一个源位`); }
    }
    if (b.来源 === '融合' && from.length === 2) {
      const [x, y] = from;
      const sx = (pm[x] && pm[x].血系) || ((bloodLine(x) || {}).系名), sy = (pm[y] && pm[y].血系) || ((bloodLine(y) || {}).系名);
      const pair = Object.values(SBC.血系).some((s) => (s.可融合 || []).some((p) => p.includes(x) && p.includes(y)));
      if (!(sx && sx === sy) && !pair) {
        delete nextMap[n];
        for (const k of [x, y]) if (pm[k] && !nextMap[k]) nextMap[k] = sbcClone(pm[k]);
        log.push(`${who}·${n}：${x}与${y}不同血系、也不在可融合名单里，融合不成立，还原`);
        continue;
      }
      const m = bloodLine(n);
      if (m) b.血系 = m.系名;
    }
  }
}
/** 主体：prev、next 为更新前后的 stat_data；直接改 next。返回 { log, tips }。rand 只给测试用。
 * opts.heir：这一次是换代页写的（斗罗宗门血脉脚本挂的一次性通行），不按“AI 这一轮能改多少”去比：
 *   宗门的锁定字段、兴衰一格、单轮幅度、新设施、门人去留、主角血脉单轮涨幅都不拦（主角已经换了人）。 */
function guardSect(prev, next, rand = Math.random, opts = {}) {
  if (!isObj(next)) return null;
  const heir = !!(opts && opts.heir);
  const log = [], tips = [];
  const today = sbcFull(next.时空 && next.时空.外界日期);
  const before = sbcFull(prev && prev.时空 && prev.时空.外界日期);
  const skip = isNum(today) && isNum(before) && dayNo(today) - dayNo(before) >= 30;
  const part = next.时空 && next.时空.当前部;
  const P = prev && isObj(prev.宗门) && prev.宗门.名称 ? prev.宗门 : null;
  if (P && !(isObj(next.宗门) && next.宗门.名称)) { next.宗门 = sbcClone(P); log.push('宗门不能删除，已还原'); }
  const S = isObj(next.宗门) && next.宗门.名称 ? next.宗门 : null;
  if (S) {
    const cp = sectCoinPart(S, today);
    if (P && !heir) {
      for (const k of ['组织形式', '来源', '原作宗门', '立宗日期']) if (P[k] != null && S[k] !== P[k]) { S[k] = P[k]; log.push(`宗门.${k} 建立后锁定，还原`); }
      if (S.兴衰 !== P.兴衰 && S.兴衰 !== '覆灭' && !(PHASE_STEP[P.兴衰] || []).includes(S.兴衰)) {
        log.push(`兴衰只能沿表走一格：${P.兴衰} → ${S.兴衰} 不成立，还原`); S.兴衰 = P.兴衰;
      }
      if (S.兴衰 === '覆灭' && P.兴衰 !== '覆灭') tips.push('宗门这一轮覆灭：正文要写明灭门之祸，并记一条编年。');
      for (const k of ['声势', '人心']) {
        const lo = (P[k] || 0) - 10, hi = (P[k] || 0) + 10;
        if (S[k] < lo || S[k] > hi) { S[k] = clampN(S[k], lo, hi); log.push(`宗门.${k} 单轮最多 ±10`); }
      }
      const capD = Math.max(100, Math.floor((P.底蕴 || 0) * 0.1));
      if (Math.abs((S.底蕴 || 0) - (P.底蕴 || 0)) > capD) { S.底蕴 = clampN(S.底蕴, (P.底蕴 || 0) - capD, (P.底蕴 || 0) + capD); log.push(`宗门.底蕴 单轮 AI 增减最多 ${capD}`); }
      // 设施、产业的等级只能走工程升；AI 只许降
      for (const bag of ['设施', '产业']) for (const [n, x] of Object.entries(S[bag])) {
        const o = P[bag] && P[bag][n];
        if (o && x.等级 > o.等级) { x.等级 = o.等级; log.push(`${bag}「${n}」升级要走工程，还原`); }
      }
      // 工程：老的锁住工期与花费，停工期间顺延；新的照表收
      const old = new Map((P.工程 || []).map((w) => [projKey(w), w]));
      const keep = [];
      for (const w of S.工程) {
        const o = old.get(projKey(w));
        if (o) {
          w.工期 = o.工期; w.花费 = o.花费; w.开工 = o.开工; w.目标等级 = o.目标等级; w.模板 = o.模板;
          w.已付 = !!o.已付;
          if (o.状态 === '停工' && isNum(today) && isNum(before) && today > before) {
            const k = dateKey(o.开工);
            if (k != null) w.开工 = fmtDate(addDays(k, dayNo(today) - dayNo(before)));
          }
          if (w.状态 === '在建' && !w.已付) {
            const m = vaultAdd(S.公库.钱, cp, -(w.花费 || 0));
            if (m == null) { w.状态 = '停工'; tips.push(`工程「${w.名称}」要花 ${w.花费} 宗门币值，公库不够，仍停工。`); } else { S.公库.钱 = m; w.已付 = true; }
          }
          keep.push(w);
          continue;
        }
        if (!w.开工 || dateKey(w.开工) == null) w.开工 = isNum(today) ? fmtDate(today) : w.开工;
        const why = admitProject(S, w, cp);
        if (why) { tips.push(`工程「${w.名称 || w.对象}」不收：${why}。`); continue; }
        const m = vaultAdd(S.公库.钱, cp, -(w.花费 || 0));
        if (m == null) { w.状态 = '停工'; w.已付 = false; tips.push(`工程「${w.名称}」要花 ${w.花费} 宗门币值，公库不够，先停工；钱够了改回在建再开。`); }
        else { S.公库.钱 = m; w.已付 = true; w.状态 = w.状态 || '在建'; }
        keep.push(w);
      }
      S.工程 = keep;
      for (const [n] of Object.entries(S.设施)) if (!(P.设施 && P.设施[n]) && !S.工程.some((w) => w.对象 === n)) {
        const fresh = (S.编年 || []).length > (P.编年 || []).length;
        if (!fresh) tips.push(`新增设施「${n}」：只有正文写明接手、缴获现成建筑才能直接加，并同一轮记编年；新建、升级要走工程。`);
      }
      guardMembers(P, S, next, today, tips, rand);
    } else if (!P) {
      if (!S.收支.上次结算 && isNum(today)) S.收支.上次结算 = fmtDate(monthStart(today));
      if (!S.立宗日期 && isNum(today)) S.立宗日期 = fmtDate(today);
      // 宗门第一次出现那一轮带着的在建工程：同新开工一样当轮从公库扣（§1.8）；不够就停工
      for (const w of S.工程) {
        if (!w.开工 && isNum(today)) w.开工 = fmtDate(today);
        if (w.状态 !== '在建' || w.已付) continue;
        const m = vaultAdd(S.公库.钱, cp, -(w.花费 || 0));
        if (m == null) { w.状态 = '停工'; tips.push(`工程「${w.名称}」要花 ${w.花费} 宗门币值，公库不够，先停工；钱够了改回在建再开。`); }
        else { S.公库.钱 = m; w.已付 = true; }
      }
    }
    // 完工、结账
    if (isNum(today)) {
      for (const w of S.工程.slice()) {
        if (w.状态 !== '在建') continue;
        const k = dateKey(w.开工);
        if (k == null) continue;
        const done = addDays(k, w.工期);
        if (today < done) continue;
        S.工程 = S.工程.filter((x) => x !== w);
        completeProject(S, w, done, tips);
      }
      settleMonths(S, next, today, tips, log);
    }
    // 宗门令：已结算、驳回的留最近 4 条；待办最多 6 条（主角在神界部、英雄部时 2 条）
    const far = part === '神界' || part === '英雄';
    const cap = far ? SECT_LIMIT.远待办 : SECT_LIMIT.待办;
    const settled = S.宗门令.filter((o) => o.状态 !== '待办');
    const keepSet = new Set([...settled.slice(-SECT_LIMIT.留结算), ...S.宗门令.filter((o) => o.状态 === '待办').slice(0, cap)]);
    S.宗门令 = S.宗门令.filter((o) => keepSet.has(o));
    // 左右格局：位阶升到这一档，AI 要登记蝴蝶效应（开局就在这一档的原作宗门不算）
    finishSect(S, next, part, today);
    const row = rankRow(S.位阶);
    const born = S.原作宗门 && rankRow(SBC.原作位阶[S.原作宗门]);
    if (row && row.左右格局 && !(born && born.左右格局 && rankNo(born.名) >= rankNo(row.名))) {
      const named = Object.values(next.蝴蝶效应 || {}).some((b) => [b && b.名称, b && b.实际走向].join('').includes(S.名称));
      if (!named) tips.push(`${S.名称}的位阶到了「${row.名}」（左右格局）：本轮登记一条蝴蝶效应，写宗门崛起怎样改了原作的势力格局。`);
    }
  }
  // 血脉
  if (next.主角 && !heir) guardBloods(prev && prev.主角 && prev.主角.血脉, next.主角.血脉, next.主角.姓名 || '主角', skip, log);
  for (const [n, p] of entriesOf(next.人物)) {
    const o = prev && prev.人物 && prev.人物[n];
    if (o) guardBloods(o.血脉, p.血脉, n, skip, log);
  }
  if (next.主角) next.主角.血脉 = finishBloods(next.主角.血脉, next.主角.姓名);
  for (const [n, p] of entriesOf(next.人物)) p.血脉 = finishBloods(p.血脉, n);
  const notes = [...SBC_NOTES, ...tips];
  SBC_NOTES.length = 0;
  next.脚本提醒 = [...new Set(notes)].slice(0, SECT_LIMIT.提醒).map((x) => x.slice(0, 160));
  return log.length || tips.length ? { log, tips } : null;
}

// ───────── 换代（§3）：兴衰档掷骰与折算 ─────────
function fateWeights(S, next, extra) {
  const base = { ...SBC.掷骰.基础权重 };
  const add = {};
  const ctx = {
    老祖: !!(extra && extra.老祖), 相位: S.兴衰, 位阶: S.位阶, 底蕴: S.底蕴 || 0,
    传承武魂: Object.keys((S.宗门传承 && S.宗门传承.武魂) || {}).length, 下一部: extra && extra.下一部,
  };
  for (const m of SBC.掷骰.修正 || []) {
    const c = m.条件 || {};
    let ok = true;
    if ('老祖' in c) ok = ok && ctx.老祖 === !!c.老祖;
    if (c.相位) ok = ok && c.相位.includes(ctx.相位);
    if (c.位阶至少) ok = ok && rankNo(ctx.位阶) >= rankNo(c.位阶至少);
    if ('底蕴至少' in c) ok = ok && ctx.底蕴 >= c.底蕴至少;
    if ('传承武魂至少' in c) ok = ok && ctx.传承武魂 >= c.传承武魂至少;
    if (c.下一部) ok = ok && ctx.下一部 === c.下一部;
    if (ok) for (const [k, v] of Object.entries(m.加 || {})) add[k] = (add[k] || 0) + v;
  }
  const w = {};
  for (const [k, v] of Object.entries(base)) w[k] = Math.max(0, v + (add[k] || 0));
  if (!Object.values(w).some((x) => x > 0)) return base;
  return w;
}
function rollFate(weights, rand = Math.random) {
  const list = Object.entries(weights).map(([名, 权]) => ({ 名, 权 }));
  return pick(rand, list, '权').名;
}
const fateRow = (name) => SBC.兴衰档.find((d) => d.名 === name) || null;
/** 跨部换代：按兴衰档折算宗门（数字是保留比例；文字项按“降几级”“保留”粗略执行，其余交给 AI 在 <编年> 里补）。返回新宗门。 */
function convertSect(S, fateName, nextPart, fromKey, startKey) {
  const d = fateRow(fateName);
  const s = sbcClone(S);
  if (!d) return s;
  const f = d.折算 || {};
  const ratio = (k, def) => (isNum(f[k]) ? f[k] : def);
  s.兴衰 = d.相位;
  s.底蕴 = Math.round((s.底蕴 || 0) * ratio('底蕴', 0.5));
  const cpTo = sectCoinPart(s, startKey);
  const value = vaultValue(s.公库.钱, sectCoinPart(S, fromKey)) * ratio('公库', 0.2);
  s.公库 = { 钱: vaultAdd({}, cpTo, value) || normVault({}, cpTo), 物资: {} };
  const drop = (txt) => { const m = String(txt || '').match(/减\s*(\d)/u); return m ? Number(m[1]) : 1; };
  const fit = (t) => !t || !Array.isArray(t.部) || t.部.includes(nextPart);
  const ruin = /遗址|损毁/u.test(String(f.设施 || ''));
  for (const [n, x] of Object.entries(s.设施)) {
    const t = sbcFac(x.模板);
    if (!fit(t)) { if (ruin) { x.等级 = 1; x.状态 = '损毁'; } else delete s.设施[n]; continue; }
    x.等级 = Math.max(1, x.等级 - drop(f.设施));
    if (/全毁|尽毁|化为|夷平/u.test(String(f.设施 || ''))) x.状态 = '损毁';
  }
  for (const [n, x] of Object.entries(s.产业)) {
    const t = sbcInd(x.模板);
    if (!fit(t) || /尽失|断绝|全部失去/u.test(String(f.产业 || ''))) { delete s.产业[n]; continue; }
    x.等级 = Math.max(1, x.等级 - drop(f.产业));
  }
  s.工程 = [];
  const H = s.宗门传承;
  const keepPart = (rec, r) => { const ks = Object.keys(rec); const n = Math.round(ks.length * r); const out = {}; for (const k of ks.slice(0, n)) out[k] = rec[k]; return out; };
  if (ratio('武魂', 1) < 1) H.武魂 = keepPart(H.武魂, ratio('武魂', 1));
  for (const w of Object.values(H.武魂)) w.现持者 = [];
  for (const g of Object.values(H.功法)) g.完整度 = Math.round(g.完整度 * ratio('功法', 0.8));
  H.镇宗之宝 = keepPart(H.镇宗之宝, ratio('镇宗之宝', 0.5));
  for (const t of Object.values(H.镇宗之宝)) t.持有 = '宗门';
  s.门人 = {};
  s.宗门令 = [];
  s.编年 = [{ 日期: fmtDate(startKey), 事: `万年之后·${fateName}`.slice(0, 40) }];
  s.收支 = { 月入: {}, 月支: {}, 净: {}, 上次结算: fmtDate(monthStart(startKey)), 欠费: 0 };
  return s;
}
// 万年稀释：传人浓度 = 旧浓度 × 每千年系数^(千年数)，有修正时取最高的系数（§2.5）
function diluteFactor(S, fateName, years, hasElder) {
  const t = SBC.遗传.万年稀释 || { 每千年系数: 0.88, 修正: [] };
  let k = t.每千年系数;
  for (const m of t.修正 || []) {
    const c = String(m.条件 || '');
    const hit = (/血脉类设施/u.test(c) && Object.values(S.设施 || {}).some((f) => f.类别 === '血脉' && f.状态 === '正常'))
      || (/鼎盛延续/u.test(c) && fateName === '鼎盛延续')
      || (/守成或中兴/u.test(c) && (fateName === '守成' || fateName === '中兴再起'))
      || (/老祖/u.test(c) && hasElder);
    if (hit) k = Math.max(k, m.系数);
  }
  return Math.pow(k, Math.max(0, years) / 1000);
}

// 幕索引（源码/幕索引/幕索引.json 的紧凑形式）
const ACT_INDEX = {"部":[{"名":"斗1","前史篇":"斗罗大陆前史篇","前史":[["斗罗大陆前史篇·第一幕 海陆远古与旧仇",-973459393,26550606,[[1,-973459393,26550606,"魔鲸十万年困神关"],[2,-183509689,-173499690,"千年统海信仰成神"],[3,-173499689,-173499689,"深海魔鲸受创失左眼"],[4,-73508998,-73508998,"救下青蛇结姐弟缘"],[5,24870115,24880114,"外戚铸匠创立力族"],[6,25210207,25210207,"罗刹留邪侵蚀杀界"],[7,25500307,26000306,"八考受赐登临绝顶"],[8,25540622,25540622,"鲸王杀弟结下血仇"],[9,25540622,26540621,"试闯鲸海百年息战"],[10,25550601,25560531,"兵蚁叛后吞噬成长"],[11,25570603,25570603,"觊觎王湖反被逐"],[12,25750409,25750409,"死而返魂觉醒鬼武魂"]]],["斗罗大陆前史篇·第二幕 双星成长与前世绝艺",25820101,26270127,[[1,25820101,25820101,"百弩齐发守住唐门"],[2,25830817,25830817,"初遇赌约牵来情缘"],[3,25870115,26170114,"双星成长受骨出宗"],[4,25870128,26270127,"剑父攀峰败后含笑逝"],[5,25920101,25920101,"无功之人针杀高手"],[6,25920115,25920115,"白氏早逝留下幼子"],[7,25920330,25920330,"波赛西旧闯二百二十八"],[8,26010115,26020114,"御族承建昊天宗门"],[9,26010207,26010207,"两千魂师征岛惨败"],[10,26010207,26010207,"唐晨胜半线换封山约"],[11,26010307,26010309,"两岳赴海岛双双败北"],[12,26010310,26010310,"百级情约错别数十年"]]],["斗罗大陆前史篇·第三幕 两世少年各求道路",26020101,26301231,[[1,26020101,26301231,"外门少年求绝学"],[2,26020307,26020307,"兄弟送信遭海魂师擒"],[3,26020310,26120309,"变异受轻未成年离族"],[4,26040115,26040115,"隔代择定昊天传人"],[5,26050115,26060114,"教昊铸造举族效忠"],[6,26070115,26070714,"半载水压练成连锤"],[7,26070115,26120114,"五年修炼越过六十"],[8,26070415,26070415,"探险分得储物带"],[9,26100310,26110309,"幼年苦修欲护母亲"],[10,26120310,26120310,"小刚被逐离开家族"]]],["斗罗大陆前史篇·第四幕 圣女情断昊天情定",26150115,26250113,[[1,26150115,26150115,"二十八岁闯出地狱"],[2,26150720,26150720,"前教皇猎得智慧骨"],[3,26170114,26250113,"三人结伴兄退情定"],[4,26170310,26190309,"圣女相恋终断情"],[5,26190210,26190210,"教皇暴力拆散初恋"],[6,26190310,26191209,"囚禁生产恨误女儿"],[7,26190922,26190922,"泰诺挑战强敌求偶"],[8,26200310,26210309,"三人同行结成铁三角"],[9,26200910,26200910,"游历途中母亲病逝"],[10,26200910,26200910,"圣龙本相仅成一半"]]],["斗罗大陆前史篇·第五幕 离宗求神铁三角离散",26210207,26550408,[[1,26210207,26210207,"唐晨离宗追寻百级"],[2,26210208,26550408,"修罗受考沦为杀王"],[3,26240307,26240309,"表白抉择守住兄妹情"],[4,26240310,26240310,"新婚认亲惊破姻缘"],[5,26240310,26440309,"离别避情寄心研究"],[6,26240311,26240313,"二龙离族寻觅小刚"],[7,26240410,26240410,"情伤后血洗森林"],[8,26240510,26240512,"伤及族弟引来追杀"]]],["斗罗大陆前史篇·第六幕 隐居待子与宗门危局",26250114,26310115,[[1,26250114,26250213,"截归途宗门受诏逼迫"],[2,26250213,26310115,"避世成婚待得幼子"],[3,26250214,26250214,"力服长老继宗位"],[4,26290311,26290311,"试服奇草险被毒死"]]]],"正篇":[["圣魂村篇·第一幕 绝崖转生风雨入世",26310101,26361214,[[1,26310101,26310101,"留莲跳下绝崖"],[2,26310115,26361214,"铁匠家中再长大"],[3,26310115,26310115,"力族随唐昊离宗"],[4,26310115,26310117,"阿银献祭昊天血战"],[5,26310118,26310217,"草籽留谷封宗避祸"]]],["圣魂村篇·第二幕 教皇易位四族流离",26310215,26500922,[[1,26310215,26310215,"比比东吞噬前教皇"],[2,26310216,26310216,"初登位猎魂被压回"],[3,26310216,26500922,"闭门苦修积蓄宗力"],[4,26310216,26310315,"丧子追昊终失踪"],[5,26310316,26310316,"采购遇袭痛失长子"],[6,26310331,26410330,"祭司护持七柱过考"],[7,26320115,26320115,"破族遭袭失半族人"],[8,26320115,26330114,"改造城府立足龙兴"],[9,26320115,26330114,"御族助建天斗力府"],[10,26320115,26320115,"破族遇袭兄弟失散"]]],["圣魂村篇·第三幕 封号旧怨与皇室暗毒",26330310,26350327,[[1,26330310,26340309,"旧友开解收敛杀性"],[2,26330811,26330811,"十六主教围而未擒"],[3,26330821,26330821,"护法掳走宗门直系"],[4,26330821,26330821,"牛首出湖惊退封号"],[5,26340310,26340310,"金鳄主持毒封册礼"],[6,26340311,26340311,"六头明蜥入谷爆体"],[7,26350327,26350327,"母亲赠梳祝女儿"]]],["圣魂村篇·第四幕 幼子试炼双魂初醒",26351013,26370414,[[1,26351013,26351015,"议储之后幼皇子夭折"],[2,26361015,26361114,"再失皇子查毒授伪装"],[3,26361230,26370110,"万锤换来试炼"],[4,26370113,26370113,"草叶照亮水晶球"],[5,26370113,26370113,"第二武魂唤醒父爱"],[6,26370113,26370412,"父亲传下连锤法"],[7,26370413,26370414,"带着袖箭离村"]]],["诺丁篇·第一幕 拜师结伴同入魂途",26370414,26380429,[[1,26370414,26370414,"从证明认出双魂"],[2,26370414,26370414,"七舍两度换老大"],[3,26370414,26370414,"为蓝银草选道路"],[4,26370414,26370414,"柔技遇上飞石"],[5,26370415,26370416,"玉带随行入森林"],[6,26370416,26370416,"暗器反击追命蛇"],[7,26370416,26370420,"草得魂环师得救"],[8,26370428,26370430,"缠绕制服学院霸王"],[9,26370430,26370430,"注册照出十三级"],[10,26370430,26380429,"连锤换来第一份工"]]],["诺丁篇·第二幕 父亲托孤兄妹相认",26380428,26501101,[[1,26380428,26380429,"留书后把儿子托孤"],[2,26380430,26380430,"空屋前重新认亲"],[3,26390416,26390416,"初见火舞倾心追求"],[4,26390715,26390715,"院长助取鬼藤环"],[5,26390810,26430809,"毕业择路到索托"],[6,26400721,26410720,"一年猎蛛成不死之身"],[7,26401013,26401013,"亲王救命结下旧恩"],[8,26401102,26501101,"暗中资助保住族尊"]]],["诺丁篇·第三幕 六年学业与各方伏流",26401103,26510102,[[1,26401103,26501102,"偶获血参深藏不售"],[2,26410103,26510102,"十年融材造出软甲"],[3,26410331,26410331,"欧亚闯鲨群完成黑四"],[4,26410809,26410809,"猎虎得来千年环"],[5,26410823,26410823,"成年誓将一生奉殿"],[6,26420811,26420811,"王室资助被拒绝"],[7,26420811,26420811,"村中发现邪火少年"],[8,26420811,26420811,"小舞诱敌施展重摔"]]],["怪物学院篇·第一幕 索托交锋闯关入学",26430809,26430812,[[1,26430809,26430809,"蓝银草逼出白虎变"],[2,26430810,26430810,"烂水晶开出龙须针"],[3,26430811,26430811,"村口怪物关开门"],[4,26430811,26430811,"四人合击难越魂圣"],[5,26430811,26430811,"满身暗器逼过考关"],[6,26430811,26430812,"新舍醒后收暗器"],[7,26430811,26430811,"黑夜里替小的讨还"]]],["怪物学院篇·第二幕 骄傲碰壁首战斗魂",26430812,26430812,[[1,26430812,26430812,"寻早饭碰上邪火"],[2,26430812,26430812,"收信院长开第一课"],[3,26430812,26430812,"宗主拒接女儿回家"],[4,26430812,26430812,"骄傲在同伴前碰壁"],[5,26430812,26430812,"三五组合走上斗台"],[6,26430812,26430812,"腰弓首胜铁角牛"],[7,26430812,26430812,"藤网截住幽冥突刺"],[8,26430812,26430812,"追踪双锤险破组合"],[9,26430812,26430812,"金钱买不来同伴"]]],["星斗森林篇·第一幕 香肠晋阶争取蛇环",26430813,26430817,[[1,26430813,26430813,"香肠课接来三十级"],[2,26430814,26430814,"镇上联手战玄龟"],[3,26430815,26430815,"千年蛇引来归属争"],[4,26430815,26430815,"追伤蛇却让它逃脱"],[5,26430815,26430815,"赢蛇环又见飞翔"],[6,26430816,26430817,"两日寻环谈滥杀"],[7,26430816,26430816,"追伤魔蛛又失目标"]]],["星斗森林篇·第二幕 追妹猎蛛外骨初生",26430817,26430822,[[1,26430817,26430817,"森林王者抓走小舞"],[2,26430817,26430817,"追妹途中弩杀魔蛛"],[3,26430817,26430817,"二明守着自行凝环"],[4,26430817,26430817,"再遇龙蛇飞刀解争"],[5,26430817,26430818,"血雾里长出八蛛腿"],[6,26430818,26430821,"示弩约装再回学院"],[7,26430821,26430821,"荣荣替宗门问暗器"],[8,26430821,26430821,"师长听险情再谈旧结"],[9,26430822,26430822,"蛛腿确认为外附魂骨"],[10,26430822,26430822,"图纸换来铁铺议价"],[11,26430822,26430822,"三环取信铁氏父子"]]],["索托斗魂篇·第一幕 负重同担共历苦训",26430823,26431130,[[1,26430823,26430823,"切磋暴露各人破绽"],[2,26430823,26430823,"互担负重不弃同伴"],[3,26430823,26430823,"药浴醒来共进晚餐"],[4,26430824,26431123,"三月苦练筑牢身体"],[5,26431124,26431124,"胖子负伤求援同伴"],[6,26431124,26431124,"八段摔重创不乐"],[7,26431124,26431124,"同党救人种下仇恨"],[8,26431130,26431130,"经费耗尽仍续特训"]]],["索托斗魂篇·第二幕 面具七怪迎战皇斗",26431201,26431229,[[1,26431201,26431201,"戴上面具进军斗魂"],[2,26431201,26431201,"三五速胜猫鼠组合"],[3,26431201,26431201,"升空拖尽狂热逆转"],[4,26431201,26431202,"首胜获赞荣荣致歉"],[5,26431203,26431228,"连战连胜逼近银章"],[6,26431229,26431229,"接下皇斗强敌挑战"],[7,26431229,26431229,"秦明告诫莫轻蓝草"],[8,26431229,26431229,"白虎蛛矛力克皇斗"],[9,26431229,26431229,"败后认错接受挫折"]]],["索托斗魂篇·第三幕 师门重逢筹谋远行",26431229,26440216,[[1,26431229,26431229,"学长拜师牵出玉姓"],[2,26431229,26431229,"一月跃升金斗魂"],[3,26431229,26431229,"叔侄重逢劝弃骄傲"],[4,26431229,26431229,"借皇家资源续育七怪"],[5,26431230,26431230,"返校安排离院前事"],[6,26431230,26431230,"宗门规矩横在情前"],[7,26431230,26431230,"暗器合作等待宗主"],[8,26431230,26440216,"闭门锻造十八铁球"],[9,26440216,26440216,"飞天神爪分赠同伴"]]],["天斗学院篇·第一幕 别院远行皇城受逐",26440228,26440310,[[1,26440228,26440228,"告别旧院奔赴皇城"],[2,26440301,26440301,"神弩齐发初历杀戮"],[3,26440302,26440309,"皇家山门冲突后入院"],[4,26440310,26440310,"魂力试压贯通冲脉"],[5,26440310,26440310,"毒斗罗威逼师生离院"],[6,26440310,26440310,"蓝霸接纳重聚铁三角"],[7,26440310,26440310,"林中诉苦直面旧爱"],[8,26440310,26440310,"毒斗罗夜掳唐三"]]],["天斗学院篇·第二幕 毒谷求生师长来援",26440310,26440911,[[1,26440310,26440310,"以解毒换来一线生机"],[2,26440310,26440311,"铁三角寻徒迎战蛇皇"],[3,26440311,26440311,"双草入腹冰火炼身"],[4,26440311,26440311,"巧设台阶救回师长"],[5,26440311,26440311,"教委申诉未获重视"],[6,26440312,26440312,"连过三毒证成疗法"],[7,26440312,26440312,"丹珠入腹立下疗约"],[8,26440312,26440911,"半年疗毒化敌为友"],[9,26440312,26440911,"留校潜修全员晋魂尊"]]],["天斗学院篇·第三幕 半年疗毒携草归来",26440721,26440921,[[1,26440721,26440721,"圆月击师获推魁首"],[2,26440911,26440912,"阎王贴成归还丹珠"],[3,26440912,26440912,"赠囊试胆相约作顾问"],[4,26440912,26440915,"采尽药圃携友返校"],[5,26440915,26440915,"半年重逢许诺相守"],[6,26440915,26440915,"仙草分赠试摘相思"],[7,26440915,26440915,"相思认主九宝初现"],[8,26440915,26440921,"守屋潜修巩固药力"]]],["天斗学院篇·第四幕 九宝惊宗力王败阵",26440918,26440923,[[1,26440918,26440919,"交付雁药送别老友"],[2,26440921,26440921,"归宗显九宝震惊亲长"],[3,26440921,26440921,"连环暗器逼出剑魂"],[4,26440922,26440922,"首日上课两败泰隆"],[5,26440922,26440922,"街头盒饭解开心结"],[6,26440922,26440922,"拍卖暗器结识宁宗主"],[7,26440922,26440922,"力王轻敌中毒落败"],[8,26440922,26440923,"疗伤夜过清晨话前途"]]],["天斗学院篇·第五幕 黑锤认主暗器订约",26440923,26450327,[[1,26440923,26440923,"泰坦设赌力压唐三"],[2,26440923,26440923,"黑锤现身赌斗止"],[3,26440923,26440923,"力族愿奉唐三为主"],[4,26440923,26440923,"五百套暗器订约"],[5,26440923,26440923,"荣荣暂缓门规坦白"],[6,26440928,26440928,"大师解说昊天身世"],[7,26440928,26450327,"半年苦练冲魂宗"],[8,26440928,26450327,"暗器交付难以仿制"]]],["天斗学院篇·第六幕 月夜寄情猎魂启程",26450327,26450331,[[1,26450327,26450327,"月下以木梳寄心"],[2,26450327,26450327,"人鱼天才送任守柱"],[3,26450328,26450328,"猎魂兼作毕业考"],[4,26450328,26450328,"旧情将合又被惊断"],[5,26450328,26450329,"赤龙压蝎胖子得环"],[6,26450329,26450329,"幽香护众破粉雾"],[7,26450329,26450329,"啸天击擒粉红娘娘"],[8,26450331,26450331,"借毒阵以幽香诱兽"]]],["天斗学院篇·第七幕 毒阵诱兽万年入环",26450331,26450404,[[1,26450331,26450331,"鬼虎突阵沐白护人"],[2,26450331,26450331,"合击鬼虎退守毒阵"],[3,26450331,26450331,"神爪捕兽荣荣得环"],[4,26450331,26450331,"坚持万年魂环选择"],[5,26450331,26450331,"相思花替小舞挡劫"],[6,26450331,26450331,"蛛矛进化小舞认母"],[7,26450331,26450331,"冰火泉中炼万年环"],[8,26450331,26450331,"弗兰德解开旧情结"],[9,26450401,26450401,"群体囚笼惊众人"],[10,26450402,26450404,"替补入队雪藏底牌"]]],["精英大赛篇·第一幕 开幕扬威结识太子",26450405,26450406,[[1,26450405,26450405,"怪校服引来旧敌"],[2,26450405,26450405,"开幕抽中皇家二队"],[3,26450405,26450405,"一分钟击溃皇家队"],[4,26450405,26450405,"宁风致赛后识群英"],[5,26450405,26450405,"茶楼结识太子清河"],[6,26450405,26450405,"获准共练分心控制"],[7,26450406,26450406,"草木同感初开三窍"]]],["精英大赛篇·第二幕 团控破甲残梦设伏",26450407,26450412,[[1,26450407,26450407,"折中换阵迎象甲"],[2,26450407,26450407,"空中团控逼出头骨"],[3,26450407,26450407,"幽冥白虎撕开防阵"],[4,26450408,26450411,"六连胜中勤练草控"],[5,26450412,26450412,"对手弃赛转看强队"],[6,26450412,26450412,"残梦把归途引出城"],[7,26450412,26450412,"忍过梦魇阎帖反杀"],[8,26450412,26450412,"花现异光小舞寻兄"],[9,26450412,26450412,"忍住融骨归校昏睡"]]],["精英大赛篇·第三幕 魂骨守密再胜炽火",26450413,26450417,[[1,26450413,26450413,"大师鉴骨叮嘱守密"],[2,26450413,26450415,"十连胜稳入第一阵"],[3,26450416,26450416,"炽火分工反设包围"],[4,26450416,26450416,"鬼影绕敌逼再火环"],[5,26450416,26450416,"火免破耀阳取胜"],[6,26450416,26450417,"火舞以交往换败唐三"],[7,26450416,26450416,"继续参赛增添护卫"]]],["精英大赛篇·第四幕 识破幻阵预赛出线",26450417,26450504,[[1,26450417,26450417,"七宝石现形布幻阵"],[2,26450417,26450417,"破幻重创后伪装伤势"],[3,26450417,26450417,"教皇令压住调查"],[4,26450418,26450501,"弃两场后稳住出线"],[5,26450429,26450429,"子母胆扳回旧敌局"],[6,26450502,26450502,"瞬发冰封压住控场"],[7,26450502,26450502,"冰凤凰逼出八蛛矛"],[8,26450502,26450502,"预赛封爵后再起争执"],[9,26450502,26450504,"独孤点醒武魂疑云"],[10,26450502,26450502,"查年龄密报教皇"]]],["精英大赛篇·第五幕 柔技启悟晋级初战",26450504,26450605,[[1,26450504,26450504,"送饭后发辫困身"],[2,26450504,26450504,"柔技锁身点破新路"],[3,26450505,26450530,"十日潜修返队受压"],[4,26450531,26450531,"连环打断算倒二龙"],[5,26450531,26450531,"入营再接宗门邀约"],[6,26450601,26450601,"小舞五胜首日扬威"],[7,26450601,26450601,"泰坦取蚁王八环"],[8,26450602,26450602,"唐门身法连破六人"],[9,26450602,26450602,"融环失控唐三护人"],[10,26450602,26450605,"伤中谢客伙伴续胜"]]],["精英大赛篇·第六幕 凤凰扬威雷霆鏖战",26450606,26450612,[[1,26450606,26450606,"凤凰连破植物全队"],[2,26450606,26450606,"亲吻误会后坦白心意"],[3,26450607,26450611,"接连取胜再败天水"],[4,26450612,26450612,"替补拖垮雷霆前阵"],[5,26450612,26450612,"闪避耗散空中雷鹰"],[6,26450612,26450612,"穿雷网后锁环落败"],[7,26450612,26450612,"白虎破环再迎雷龙"],[8,26450612,26450612,"虎胜雷龙再接风战"]]],["精英大赛篇·第七幕 黑锤破风赴城遇袭",26450612,26450629,[[1,26450612,26450612,"伤房承认婚约"],[2,26450613,26450613,"昊天锤破连斩"],[3,26450614,26450627,"全胜出线赴武魂城"],[4,26450628,26450628,"山道伏击暗器破围"],[5,26450628,26450628,"仙草暂缓封号杀机"],[6,26450628,26450628,"剑毒联手退菊鬼"],[7,26450628,26450628,"拒绝退赛避入宗门"],[8,26450629,26450629,"求法重逢反成决裂"]]],["武魂城决赛篇·第一幕 星罗死局七怪共破",26450629,26450719,[[1,26450629,26450707,"增援护送入圣城"],[2,26450630,26450630,"长老定杀赛场除患"],[3,26450709,26450709,"师徒归齐重排决赛"],[4,26450710,26450710,"风火秘密合队"],[5,26450710,26450712,"连获轮空风火现阵"],[6,26450714,26450714,"兄姐当前说破死局"],[7,26450714,26450714,"七怪暴动破星罗"],[8,26450714,26450714,"妖魅压倒皇斗"],[9,26450714,26450714,"皇子邀弟共返星罗"],[10,26450716,26450719,"三强晋升静候终局"]]],["武魂城决赛篇·第二幕 三强争先真身破局",26450720,26450720,[[1,26450720,26450720,"教皇临场展示三骨"],[2,26450720,26450720,"识破轮流弃权退赛"],[3,26450720,26450720,"七怪聚力震退风火"],[4,26450720,26450720,"禁用真身另破妖魅"],[5,26450720,26450720,"教皇破阵仍护旧人"]]],["武魂城决赛篇·第三幕 逆转夺冠身份惊变",26450721,26500720,[[1,26450721,26450721,"院长送行决战入雾"],[2,26450721,26450721,"蛛矛尽断挡下圆月"],[3,26450721,26450721,"蝠翼回旋逆转夺冠"],[4,26450721,26450721,"领骨拒招再分旧骨"],[5,26450721,26450721,"魂兽现形同伴护身"],[6,26450721,26450721,"昊天砸殿负伤救子"],[7,26450721,26450721,"毕业分路约五年再会"],[8,26450721,26450721,"夜别小舞父子相认"],[9,26450721,26500720,"帝国礼聘扩建学院"]]],["杀戮之都篇·第一幕 离别入谷封魂锤炼",26450722,26500806,[[1,26450722,26450805,"半月疾行入瀑谷"],[2,26450722,26450722,"门规说破十年离约"],[3,26450805,26450807,"智慧入骨蓝瞳碎石"],[4,26450807,26450807,"神光初成封魂入瀑"],[5,26450807,26451106,"铁锤三月反卷水幕"],[6,26450807,26500806,"借瞬移接续乱披风"],[7,26451106,26460805,"木锤九月炼尽巧力"],[8,26460327,26460327,"镇海一曲惊退鲸群"],[9,26460721,26460721,"娜娜求险再受头骨"]]],["杀戮之都篇·第二幕 瀑断皇醒踏入杀都",26460805,26480831,[[1,26460805,26460811,"解封七日贯脉达五十"],[2,26460811,26470803,"再练一年锤断瀑布"],[3,26470803,26470808,"杀气示威转赴古林"],[4,26470808,26470817,"蓝银皇醒凝第五环"],[5,26470817,26470817,"旧伤倒地父子争生"],[6,26470818,26470901,"酒馆杀局破地入城"],[7,26470901,26470901,"编号入都重逢旧敌"],[8,26470901,26480831,"一年死斗成修罗王"]]],["杀戮之都篇·第三幕 百胜结盟再闯血路",26480826,26501126,[[1,26480826,26480826,"荒野救命结成兄弟"],[2,26480901,26480901,"杀神背景阻断暗算"],[3,26480901,26490820,"九十九胜结盟排毒"],[4,26481127,26501126,"风谷两年苦练升阶"],[5,26490823,26490823,"双百胜拒封踏血路"],[6,26490823,26490823,"窄路同绳蓝域拒蝠"],[7,26490823,26490823,"断路救援合击蝠王"],[8,26490823,26490823,"九九归一夺蛇内丹"]]],["杀戮之都篇·第四幕 血湖归来月轩洗心",26490823,26500901,[[1,26490823,26490823,"背负伙伴越血湖"],[2,26490823,26490823,"双得杀域各归旧路"],[3,26490823,26490823,"长老接回失意杀神"],[4,26490902,26490902,"月轩遇姑收敛杀气"],[5,26490902,26500901,"琴音洗尽杀戮浮气"],[6,26490912,26490912,"舍去两骨清偿宗债"],[7,26500302,26500302,"月轩暂离向师报安"],[8,26500325,26500325,"零魂少年离岛行医"]]],["杀戮之都篇·第五幕 猎魂再启返谷知亲",26500713,26500925,[[1,26500713,26500715,"混毒诊出暗保皇帝"],[2,26500823,26500823,"毒血反噬杀都崩毁"],[3,26500826,26500925,"冰林追兽获得第六环"],[4,26500827,26500827,"立圣女再启猎魂令"],[5,26500901,26500903,"辞姑返谷惊见断肢"],[6,26500903,26500903,"洞中蓝银回应母爱"],[7,26500903,26500905,"母骨入体八脉全通"],[8,26500906,26500919,"迁母两仪炼药安父"]]],["昊天归来篇·第一幕 还骨归宗铁索立约",26500922,26500925,[[1,26500922,26500922,"归宗越索飞救同门"],[2,26500922,26500922,"还骨入宗见大伯"],[3,26500922,26500923,"夜听分歧晨赴会"],[4,26500923,26500923,"受辱母名请战同门"],[5,26500923,26500923,"金枪收势胜唐虎"],[6,26500923,26500923,"铁索定赌公开宗骨"],[7,26500923,26500923,"越限判负换得归宗"],[8,26500925,26500925,"镜像突袭杀队取骨"]]],["昊天归来篇·第二幕 五年重聚宗门惊变",26500926,26500928,[[1,26500926,26500926,"五年门前四怪重聚"],[2,26500926,26500926,"蓝银困友证回唐三"],[3,26500926,26500926,"师友叙旧约定演赛"],[4,26500927,26500927,"绿面归场迎双院长"],[5,26500927,26500927,"五怪联手逼和院长"],[6,26500927,26500928,"各定去留再许五年"],[7,26500927,26500927,"巡哨殒命示警保宗"],[8,26500927,26500927,"蓝电宗破族长战死"]]],["昊天归来篇·第三幕 埋骨立誓孤身寻舞",26500928,26501029,[[1,26500928,26500928,"宗破求援惊散重聚"],[2,26500928,26501001,"返宗埋骨坟前立誓"],[3,26500929,26500929,"清点血战转谋渗透"],[4,26500930,26500930,"星湖思人警惕追踪"],[5,26500930,26501029,"借兵甲盘剥过关人"],[6,26501001,26501001,"忍下血仇共议联合"],[7,26501001,26501001,"独入星斗草屋遇警"],[8,26501001,26501001,"借旧情潜入猎兽队"]]],["昊天归来篇·第四幕 双王受困血祭救爱",26501002,26501008,[[1,26501002,26501002,"探兽反噬瞒过敌意"],[2,26501002,26501002,"双王压敌反遭静止"],[3,26501002,26501002,"突袭救舞旧貌相认"],[4,26501002,26501002,"三五合击连毙追兵"],[5,26501002,26501002,"魔蛛拦路重陷合围"],[6,26501002,26501002,"舍命取骨只求舞生"],[7,26501002,26501002,"灵魂献祭救回爱人"],[8,26501002,26501002,"血脉骤警感知重演"],[9,26501002,26501008,"仙花续命七日待醒"],[10,26501003,26501005,"强宗招并逼出联合"]]],["昊天归来篇·第五幕 复生有望归校见师",26501004,26501015,[[1,26501004,26501006,"装病劝歇分担苦训"],[2,26501008,26501010,"三项复生条件重燃希望"],[3,26501010,26501010,"追杀魔蛛吞骨凝甲"],[4,26501013,26501013,"拦骑伤马重认毒友"],[5,26501013,26501013,"茶楼听警转赴师门"],[6,26501013,26501013,"负重代师练服众人"],[7,26501013,26501013,"师徒共悲救护昏师"],[8,26501013,26501015,"稳固修为察看魂甲"],[9,26501013,26501015,"返来寻荣暗候院门"],[10,26501014,26501014,"捕兽败归圣女面壁"]]],["异界唐门篇·第一幕 重认恋人唐门立志",26501015,26501031,[[1,26501015,26501015,"密议立唐门招首伴"],[2,26501015,26501015,"误战认友劝珍眼前"],[3,26501015,26501015,"摘笠重逢认回恋人"],[4,26501015,26501015,"隔音密谈获七宝资助"],[5,26501015,26501015,"镜像试战赢得认可"],[6,26501016,26501016,"力族归唐捐府献匠"],[7,26501016,26501017,"约同行暂缓唐门开张"],[8,26501017,26501031,"车中论器约守唐门"]]],["异界唐门篇·第二幕 远赴四族御族入唐",26501027,26501126,[[1,26501027,26501126,"拒并院受挤四院合迁"],[2,26501027,26501126,"新宗驻地暗留退路"],[3,26501031,26501031,"关口退敌留命过境"],[4,26501101,26501101,"三拳破防消解父子怨"],[5,26501101,26501101,"显环验弩赢取信心"],[6,26501101,26501101,"拒象甲吞并举族入唐"],[7,26501102,26501102,"弩价引赌步法胜沉香"],[8,26501102,26501102,"全族赌约迎纯敏追击"]]],["异界唐门篇·第三幕 舅爷认亲破枪合流",26501102,26501127,[[1,26501102,26501102,"虚无见舞主动止赌"],[2,26501102,26501102,"坦白父名约同进退"],[3,26501103,26501103,"舅爷赠参兔身再变"],[4,26501103,26501103,"破族逼离激将立赌"],[5,26501103,26501103,"舍身破枪舞影决胜"],[6,26501103,26501103,"双仙药成人形归来"],[7,26501103,26501103,"赠绮罗四族终合流"],[8,26501104,26501127,"御族迁城照护同行"]]],["异界唐门篇·第四幕 旧友争院整备采购",26501127,26510102,[[1,26501127,26501127,"三断连斩独胜旧敌"],[2,26501127,26501127,"拒让校权等院长定夺"],[3,26501127,26501203,"拨款护院整备远采"],[4,26501127,26501127,"双封号坐镇四院归并"],[5,26501127,26501127,"温玉双瓶携走神泉"],[6,26501202,26501202,"协会被闹器师受伤"],[7,26501203,26510102,"抵金属城揭破假铠"],[8,26501221,26510101,"购来神弩拆坏难复"]]],["异界唐门篇·第五幕 神匠入唐带宝返城",26501228,26510128,[[1,26501228,26510127,"混毒六变逼近死限"],[2,26510102,26510102,"残弩牵线神匠入唐"],[3,26510102,26510102,"定采购借令退主教"],[4,26510103,26510103,"鉴宝连得顶级材料"],[5,26510103,26510103,"拍卖受压约夺回神器"],[6,26510103,26510104,"街夜灭殿携材返程"],[7,26510104,26510128,"分配软甲续约高器"],[8,26510128,26510128,"五堂定职唐门运转"]]],["异界唐门篇·第六幕 病帝垂危识破太子",26510128,26510128,[[1,26510128,26510128,"返校问计忽报帝危"],[2,26510128,26510128,"请药堂主同赴皇宫"],[3,26510128,26510128,"三处破绽揭开逼宫"],[4,26510128,26510128,"破魂枪联手挫双敌"],[5,26510128,26510128,"假意提条件探出真身"],[6,26510128,26510128,"天使净化困住唐三"],[7,26510128,26510128,"八十一锤击碎天使域"],[8,26510128,26510128,"小舞暂醒抱护爱人"]]],["异界唐门篇·第七幕 护帝破围乱军覆灭",26510128,26510128,[[1,26510128,26510128,"黄金圣龙救下残阵"],[2,26510128,26510128,"辨出七毒挟帝突围"],[3,26510128,26510128,"失去病帝改令毁宗"],[4,26510128,26510128,"唐门七宝合歼监院军"],[5,26510128,26510128,"静候解毒议天使神装"],[6,26510128,26510128,"独臂剑斗罗揭峰顶差距"],[7,26510128,26510128,"帝醒反攻只见遍地尸"],[8,26510128,26510128,"撤离天斗再谋天使骨"]]],["异界唐门篇·第八幕 同赴海岛托付宗门",26510202,26510524,[[1,26510202,26510202,"平乱后师徒议海神岛"],[2,26510202,26510202,"七怪同赴海岛定议"],[3,26510202,26510202,"沉香拒婚唐三护意愿"],[4,26510202,26510202,"四堂受托守唐门"],[5,26510202,26510202,"七彩毒源牵出亲情"],[6,26510204,26510303,"融百器练成千一夜"],[7,26510205,26510205,"母女决裂祖父拒分权"],[8,26510206,26510524,"百八日静心得天使九考"],[9,26510207,26510216,"返宗托神匠再授锤法"]]],["异界唐门篇·第九幕 母前订婚拜师受宝",26510216,26510222,[[1,26510216,26510216,"阿银见证儿女订婚"],[2,26510216,26510216,"宁风致放女儿出海"],[3,26510217,26510219,"皇储请行携竹清赴约"],[4,26510219,26510219,"伙伴重逢再聚共仇"],[5,26510219,26510219,"七杀剑压碎六怪合阵"],[6,26510219,26510221,"三日静修凤凰再进阶"],[7,26510221,26510221,"雪崩拜师蓝昊王受宝"],[8,26510221,26510222,"瀚海认血夜授四法"]]],["异界唐门篇·第十幕 西行遇狼抵达海城",26510222,26510308,[[1,26510222,26510223,"西行初夜胖香解误会"],[2,26510222,26510222,"隐罩飞行三息耗半力"],[3,26510304,26510304,"村外惨案引出狼盗围杀"],[4,26510304,26510304,"千一暗器破狼盗围杀"],[5,26510304,26510304,"狼首遗骨交白虎"],[6,26510304,26510304,"沉香忍烫缝合重伤"],[7,26510304,26510308,"热骨复原抵达瀚海"]]],["海神岛篇·第一幕 试水备航海盗引鲸",26510308,26510311,[[1,26510308,26510308,"备航问水先试海魂师"],[2,26510308,26510308,"凤香合战险破水龙卷"],[3,26510308,26510308,"买龙渊艇复盘海战"],[4,26510309,26510310,"海魔启航众人初晕船"],[5,26510310,26510310,"海夜重申复生之约"],[6,26510311,26510311,"识破迷药留下三名海盗"],[7,26510311,26510311,"丧子船长引爆魔鲸域"],[8,26510311,26510311,"金身护阵白虎仍溃散"],[9,26510311,26510311,"蛛矛吞鲸换伙伴生路"]]],["海神岛篇·第二幕 失散获救海岛重聚",26510311,26510327,[[1,26510311,26510318,"瀚海虚影退鲸送孤客"],[2,26510311,26510321,"十日漂海合杀蛇中毒"],[3,26510318,26510321,"八蛛储鲸力吉祥救命"],[4,26510322,26510325,"神医照护唐三化异能"],[5,26510325,26510326,"吉祥拜师零魂得筑基"],[6,26510326,26510326,"见伙伴被缚怒擒团长"],[7,26510326,26510326,"烈阳蛇丹解寒毒"],[8,26510326,26510327,"千盗阵中赢主从赌约"]]],["海神岛篇·第三幕 辞别吉祥登岛受考",26510327,26550613,[[1,26510327,26510327,"吉祥劝止海神考验"],[2,26510327,26510329,"养伤三日传绝学别师徒"],[3,26510330,26510331,"紫帆送至鲨海再别"],[4,26510330,26550613,"留岛勤修飞刀成圆"],[5,26510331,26510331,"避水断桨改走海底"],[6,26510331,26510331,"隐渡鲨群踏上海神岛"],[7,26510331,26510331,"各展所长渡浪登圣台"],[8,26510331,26510331,"白虎获黑级六考"]]],["海神岛篇·第四幕 九考降临初探神阶",26510331,26510331,[[1,26510331,26510331,"荣荣红七惊动神殿"],[2,26510331,26510331,"黄级一吻牵动凤香"],[3,26510331,26510331,"三叉戟显海神九考"],[4,26510331,26510331,"问清阶数赴禁地救香"],[5,26510331,26510331,"五十五阶探出反弹压"],[6,26510331,26510331,"小舞登阶责独留死地"],[7,26510331,26510331,"镜像败后悟缓过首考"],[8,26510331,26510331,"凤凰得赐六环再测限"],[9,26510331,26510331,"一级阶内验证修炼法"]]],["海神岛篇·第五幕 苦修神环冲阶将至",26510331,26520330,[[1,26510331,26510331,"教皇密修誓毁天使根基"],[2,26510331,26510629,"三月苦修蓝皇破七十"],[3,26510629,26511006,"血染神环百日成红"],[4,26511006,26511006,"蓝银真身显森罗万象"],[5,26511006,26511006,"越百阶仍忧三百三十三"],[6,26511006,26520330,"末日冲阶沉香升紫权"],[7,26520105,26520105,"新七宗共推武魂统御"],[8,26520228,26520228,"白虎神赐成就七环"]]],["海神岛篇·第六幕 合力登顶再迎环海",26520330,26550404,[[1,26520330,26520330,"四人合助越过百八阶"],[2,26520330,26520330,"背塔越阶荣荣得增环"],[3,26520330,26520330,"借满山生力冲三百阶"],[4,26520330,26520330,"八段摔与修罗阵同越关"],[5,26520330,26520331,"二女成圣环海封技"],[6,26520331,26520706,"三月蓄力香肠魂师成圣"],[7,26520405,26550404,"比比东立国整军扩土"],[8,26520721,26520721,"金苍蝇亮出补给飞跃"]]],["海神岛篇·第七幕 鲨海练战凤凰七首",26520721,26530322,[[1,26520721,26520721,"锤震群鱼探出白鲨王"],[2,26520721,26520721,"鲨王误袭金戟止杀"],[3,26520721,26521020,"三月鲨海练出水中默契"],[4,26520721,26520721,"小白指明复魂之光"],[5,26521020,26521020,"烈阳丹入凤凰众人护脉"],[6,26521020,26521022,"七首凤凰破丹成形"],[7,26521023,26530322,"五个月合练定奇袭"]]],["海神岛篇·第八幕 破海通关怒浪锻体",26530322,26540622,[[1,26530322,26530322,"双凤烧海逼出化晶"],[2,26530322,26530322,"白虎恫吓叠锤破海"],[3,26530322,26530323,"沉银柱初受怒潮"],[4,26530322,26540221,"浪锤一年磨出卸力"],[5,26540221,26540221,"浩瀚觉醒提前过考"],[6,26540321,26540323,"炼体终结暂别怒浪"],[7,26540323,26540622,"三月休整凝魂待战"],[8,26540531,26540531,"双王合力逐邪虎"]]],["海神岛篇·第九幕 鲨鲸血战海光初成",26540622,26540624,[[1,26540622,26540622,"召鲨议战承诺同生"],[2,26540622,26540622,"隐身双骑潜入鲸域"],[3,26540622,26540622,"泉箭疲鲸追猎开局"],[4,26540622,26540622,"修罗压鲸联军夺势"],[5,26540622,26540622,"两仪止爆海光初明"],[6,26540622,26540624,"海光镇环双人晋阶"],[7,26540624,26540624,"邪魔融骨再迎五考"],[8,26540624,26540624,"天使五考后再受重击"]]],["海神岛篇·第十幕 蓄力备战七柱开局",26540627,26550408,[[1,26540627,26550326,"虎鲸新技练退小白"],[2,26541113,26541113,"教皇异变隐入深殿"],[3,26550205,26550205,"神匠终铸以身殉炉"],[4,26550213,26550402,"七周备好救命肠"],[5,26550325,26550408,"毒蛛半月追断兽王"],[6,26550326,26550326,"五怪合攻遭逐个拆散"],[7,26550326,26550326,"互助次序定下七战"]]],["海神岛篇·第十一幕 七柱连战人鱼设局",26550327,26550327,[[1,26550327,26550327,"金丝破盾首胜海马"],[2,26550327,26550327,"镜像凤凰接战得半奖"],[3,26550327,26550327,"幻雾移威白虎断矛"],[4,26550327,26550327,"海光慑矛二柱速过"],[5,26550327,26550327,"献祭幻伤几令杀戒"],[6,26550327,26550327,"凤凰破鬼四柱连过"],[7,26550327,26550327,"八矛近吞压倒海星"],[8,26550327,26550327,"人鱼读心诱出险招"]]],["海神岛篇·第十二幕 锤龙定约祭司杀局",26550327,26550329,[[1,26550327,26550327,"凤凰反诱竹清终考"],[2,26550327,26550327,"镇海神曲催红五环"],[3,26550327,26550327,"破魔面前改约锤龙"],[4,26550327,26550327,"飞锤暗器逼龙犯约"],[5,26550327,26550327,"六考改由大祭司出手"],[6,26550327,26550329,"戴沐白为生存求环"],[7,26550329,26550329,"雨燕分逃精神硬撼"],[8,26550329,26550329,"金身入海隐走神山"]]],["海神岛篇·第十三幕 借力脱身神戟认主",26550329,26550405,[[1,26550329,26550329,"引七柱入局借掌出界"],[2,26550329,26550329,"杀意说破危局暂解"],[3,26550329,26550330,"醒后兄弟追问独险"],[4,26550402,26550402,"神殿揭开传承道路"],[5,26550402,26550402,"七考握戟熔热不松"],[6,26550402,26550402,"海神之心归戟认主"],[7,26550402,26550402,"小舞输血守住生机"],[8,26550402,26550402,"九宝神赐首得红环"],[9,26550403,26550403,"五年八考不弃复舞"],[10,26550403,26550405,"骑鲨返陆分路惜别"]]],["复生归来篇·第一幕 帝国变局杀王认亲",26550405,26550409,[[1,26550405,26550405,"西鲁问出武魂帝国"],[2,26550405,26550405,"西鲁夜袭初试神戟"],[3,26550406,26550408,"圣女出查六城告急"],[4,26550406,26550408,"六城扰敌后收杀心"],[5,26550408,26550408,"断杀域暗门救旧侣"],[6,26550408,26550408,"神光破邪反逢重剑"],[7,26550408,26550408,"杀王认亲授首席信物"],[8,26550408,26550408,"画界断情惊闻猎兽"],[9,26550408,26550409,"蓝银探林急援双王"]]],["复生归来篇·第二幕 双王献祭小舞归魂",26550409,26550410,[[1,26550409,26550409,"神光刺鬼断两极融合"],[2,26550409,26550409,"三域救兽飞戟阻追"],[3,26550409,26550409,"海神烙印亲示三戟"],[4,26550409,26550409,"双王献祭送唐三九环"],[5,26550409,26550409,"神光炼体拜别双王"],[6,26550409,26550409,"双魂吸环暴露唐三"],[7,26550409,26550410,"落日归家释尽悲怀"],[8,26550410,26550410,"返环归魂小舞复生"]]],["复生归来篇·第三幕 两地诀别父母复生",26550410,26550601,[[1,26550410,26550531,"王逝邪虎潜返林"],[2,26550410,26550601,"趁王逝霸湖索贡"],[3,26550411,26550413,"神光修心再定婚约"],[4,26550411,26550413,"三日重逢剑留遗愿"],[5,26550413,26550413,"祖锤信物解父心结"],[6,26550413,26550426,"海纳百川催母结茧"],[7,26550413,26550419,"七日守尸容颜骤老"],[8,26550426,26550426,"复生漫步遇地穴蛛袭"],[9,26550426,26550426,"借戟杀敌补回囚笼"]]],["复生归来篇·第四幕 重归宗门为父正名",26550427,26550507,[[1,26550427,26550429,"三日补环伪装成形"],[2,26550429,26550502,"银皇重生一家相拥"],[3,26550503,26550503,"返宗父被挡在山外"],[4,26550503,26550503,"讨父公道三退七长老"],[5,26550503,26550503,"连续神控折服五老"],[6,26550503,26550503,"昊天令下为父正名"],[7,26550503,26550505,"兄弟迎归墓前三日"],[8,26550505,26550505,"遗器哀匠议定出山"],[9,26550505,26550505,"神光接骨再通八脉"],[10,26550505,26550507,"昊天重归九十六级"]]],["嘉陵关圣战篇·第一幕 帝师归军筹守粮道",26550506,26550516,[[1,26550506,26550506,"唐门急报大军出征"],[2,26550506,26550508,"长啸破级重聚帝师"],[3,26550508,26550508,"女皇返都召宗迎战"],[4,26550508,26550508,"军前授予帝师权"],[5,26550508,26550508,"两宗释怨议传位"],[6,26550508,26550508,"检阅唐门暗器军"],[7,26550508,26550508,"军议转向守粮道"],[8,26550509,26550509,"护粮前分赠魂骨"],[9,26550509,26550516,"放过斥候候截粮"]]],["嘉陵关圣战篇·第二幕 截粮破敌大军初胜",26550516,26550530,[[1,26550516,26550516,"青龙双技诛月关"],[2,26550516,26550516,"十路截粮尽受挫"],[3,26550516,26550530,"万人铸锤力堂运阵"],[4,26550517,26550517,"游骑引出圣龙军"],[5,26550517,26550517,"神戟连斩两宗主"],[6,26550517,26550517,"宝塔自守援八人"],[7,26550517,26550517,"剑开防线弩齐发"],[8,26550517,26550517,"群控抢出换伤机"]]],["嘉陵关圣战篇·第三幕 负伤退敌再谋攻关",26550517,26550526,[[1,26550517,26550517,"携熊挡斩救唐三"],[2,26550517,26550517,"修罗魔光夺回戟"],[3,26550517,26550519,"大胜之后困坚关"],[4,26550519,26550519,"定下飞军破墙策"],[5,26550526,26550526,"胡列娜临危守关"]]],["嘉陵关圣战篇·第四幕 破门遇援父锤救军",26550526,26550526,[[1,26550526,26550526,"飞戟破门引水攻关"],[2,26550526,26550526,"师徒相对问灭族"],[3,26550526,26550526,"唐莲横空灭群圣"],[4,26550526,26550526,"援声逼出绝杀局"],[5,26550526,26550526,"两道军令误撤机"],[6,26550526,26550526,"双骨反击盘龙棍"],[7,26550526,26550526,"昊天兄弟救危军"],[8,26550526,26550526,"三锤震鳄护子还"]]],["嘉陵关圣战篇·第五幕 休兵求神天使传承",26550526,26550613,[[1,26550526,26550526,"战后认错议休兵"],[2,26550526,26550526,"密议离营求海神"],[3,26550526,26550526,"父授大须弥锤法"],[4,26550526,26550526,"六供奉逼退女皇"],[5,26550526,26550528,"三日修整分路赴海"],[6,26550526,26550613,"两军休整固守相持"]]],["嘉陵关圣战篇·第六幕 祖祭成神林中猎环",26550528,26550531,[[1,26550528,26550528,"祖孙进入天使殿"],[2,26550528,26550528,"祖父献祭启神传"],[3,26550528,26550528,"三重执念守神劫"],[4,26550531,26550531,"破开执念成天使"],[5,26550531,26550531,"遥感神威入星斗"],[6,26550531,26550531,"邪虎设局吞双敌"],[7,26550531,26550531,"幼身弩杀邪神虎"],[8,26550531,26550531,"失珠吸环醒骄心"]]],["嘉陵关圣战篇·第七幕 吞蛛猎蚁天使截途",26550531,26550601,[[1,26550531,26550531,"连技破杀蛛皇"],[2,26550531,26550601,"八蛛矛先登神级"],[3,26550601,26550601,"重力叠戟胜拔河"],[4,26550601,26550601,"神矛克蚁尽吞能"],[5,26550601,26550601,"三环同入锤心醒"],[6,26550601,26550601,"天使招降唐三拒"],[7,26550601,26550601,"震神负伤失神戟"],[8,26550601,26550601,"草身误导困林缘"]]],["嘉陵关圣战篇·第八幕 炸环赌战观音破神",26550602,26550605,[[1,26550602,26550602,"赌一炷香换三日"],[2,26550602,26550602,"蓝银炸环撑半程"],[3,26550602,26550602,"食肠复体亮红锤"],[4,26550602,26550602,"须弥连锤逼神盾"],[5,26550602,26550602,"叠锤八一破神域"],[6,26550602,26550602,"观音泪穿神赢约"],[7,26550602,26550602,"隐返取戟断追手"],[8,26550602,26550605,"修经破级急奔海"]]],["嘉陵关圣战篇·第九幕 日剑追杀海边重聚",26550605,26550607,[[1,26550605,26550605,"太阳剑落人遁地"],[2,26550605,26550605,"借剑折矛换蚁遁"],[3,26550605,26550605,"穿地引日逼八环"],[4,26550605,26550605,"海神留念尽力救"],[5,26550605,26550605,"海边重聚随鲨遁"],[6,26550605,26550605,"天使留岸待海神"],[7,26550605,26550605,"细说三战重聚信"],[8,26550605,26550605,"慎议猎鲸盼白鲨"],[9,26550605,26550607,"三日备战临鲸域"]]],["嘉陵关圣战篇·第十幕 鏖战魔鲸完成八考",26550607,26550613,[[1,26550607,26550607,"识百万鲸附尾吞"],[2,26550607,26550607,"吞蚀逼鲸凝人甲"],[3,26550607,26550607,"破雷连锤转脱网"],[4,26550607,26550607,"护援传火六环决"],[5,26550607,26550607,"神光定鲸菩提灭"],[6,26550607,26550607,"鲸能分众舞破八十"],[7,26550607,26550613,"七日争骨八考成"],[8,26550613,26550613,"鲸头取珠留待补戟"]]],["嘉陵关圣战篇·第十一幕 悼祖辞祭跨入神殿",26550613,26550613,[[1,26550613,26550613,"返岛迎来含悲七柱"],[2,26550613,26550613,"祖逝消息殿内揭开"],[3,26550613,26550613,"压下修罗坚选海神"],[4,26550613,26550613,"六怪登台七柱送别"],[5,26550613,26550613,"献祭开门赴最后考"],[6,26550613,26550613,"烙印穿罩抵真正殿"],[7,26550613,26550613,"为祭者问神得指引"],[8,26550613,26550613,"双神争选追论先后"]]],["嘉陵关圣战篇·第十二幕 七情历尽海神再现",26550613,26550613,[[1,26550613,26550613,"八翼唤醒狂喜陷阱"],[2,26550613,26550613,"大明护念压下惊怒"],[3,26550613,26550613,"识破哀惧连过双关"],[4,26550613,26550613,"爱关梳头心声救赎"],[5,26550613,26550613,"不随恶念粉碎鲸魂"],[6,26550613,26550613,"认定爱人拒绝欲关"],[7,26550613,26550613,"鲸珠补心海神再现"],[8,26550613,26550613,"海神归来六怪受奖"]]],["嘉陵关圣战篇·第十三幕 海岸神战双辅蒙选",26550613,26550613,[[1,26550613,26550613,"托岛海龙携舞赴约"],[2,26550613,26550613,"双神临海正面邀战"],[3,26550613,26550613,"真水破开太阳火牢"],[4,26550613,26550613,"无尽蔚蓝反卷万阳"],[5,26550613,26550613,"佯泪退敌反留死约"],[6,26550613,26550613,"神血护奥突破食封"],[7,26550613,26550613,"食神选奥幽冥晋阶"],[8,26550613,26550613,"九彩临塔爱解旧隙"]]],["嘉陵关圣战篇·第十四幕 九环归齐天使守关",26550613,26550613,[[1,26550613,26550613,"凤虎九环齐定封号"],[2,26550613,26550613,"柔骨双环暗流入脉"],[3,26550613,26550613,"小舞自选魔剑入体"],[4,26550613,26550613,"过岛赠环再认弟子"],[5,26550613,26550613,"天使抵关接掌战令"],[6,26550613,26550613,"雪崩虚讯定军死守"],[7,26550613,26550613,"海神助制六根钻肠"],[8,26550613,26550613,"执法借规引双辅神"]]],["嘉陵关圣战篇·第十五幕 海神临军七怪破关",26550614,26550614,[[1,26550614,26550614,"百万出阵海神归军"],[2,26550614,26550614,"领域压军双神升空"],[3,26550614,26550614,"九重叠浪震退天使"],[4,26550614,26550614,"凤虎夹击重创金鳄"],[5,26550614,26550614,"双器开路柔骨杀供"],[6,26550614,26550614,"沙袋铺路巨锤撞门"],[7,26550614,26550614,"一秒神光再续白虎"],[8,26550614,26550614,"蛇毒漫城破门停军"]]],["嘉陵关圣战篇·第十六幕 神战破敌海雨纳降",26550614,26550616,[[1,26550614,26550614,"斗转星移卸太阳天使"],[2,26550614,26550614,"三位供奉舍命护主"],[3,26550614,26550614,"海雨洗城焚毒纳降"],[4,26550614,26550614,"神念失踪追敌无果"],[5,26550614,26550614,"胜后拜父再认恩师"],[6,26550614,26550614,"神血续脉救回新父"],[7,26550614,26550615,"分兵星罗合围余敌"],[8,26550614,26550616,"罗刹成神遮雪疗伤"]]],["嘉陵关圣战篇·第十七幕 罗刹反扑海神殒身",26550617,26550619,[[1,26550617,26550617,"溃军重来罗刹现身"],[2,26550617,26550617,"双神夹击海神重创"],[3,26550617,26550617,"剑骨殒身海神心碎"],[4,26550617,26550617,"哀兵赴死忽见生机"],[5,26550617,26550617,"母女反目罗刹藏伤"],[6,26550617,26550617,"复活神光竭尽双辅"],[7,26550617,26550619,"七柱呼海聚信复魂"],[8,26550617,26550619,"百万祈愿神魂归位"]]],["嘉陵关圣战篇·第十八幕 神魂闭修双神共存",26550619,26550620,[[1,26550619,26550619,"父识死志神魂闭修"],[2,26550620,26550620,"晨别梳发再临双神"],[3,26550620,26550620,"女救母身破双泪局"],[4,26550620,26550620,"孤海败退柔骨抱危"],[5,26550620,26550620,"剑鞘归身双神共存"],[6,26550620,26550620,"神位碎尽母替女死"],[7,26550620,26550620,"临终揭开绝情真相"]]],["嘉陵关圣战篇·第十九幕 四约止战故村留名",26550620,26650620,[[1,26550620,26550620,"临终托孤罗刹长逝"],[2,26550620,26550620,"四约止战许下主婚"],[3,26550620,26550620,"双神论规执法受召"],[4,26550621,26550621,"故村换碑神魂留名"],[5,26580620,26580620,"成名后谈起逆鳞"],[6,26650620,26650620,"把痛夜讲给孩子"]]]]},{"名":"斗2","前史篇":"绝世唐门前史篇","前史":[["绝世唐门前史篇·第一幕 远古群兽争命",-9873699185,126310814,[[1,-9873699185,126310814,"寒髓养蚕囚笼求生"],[2,-2873638899,-2873638899,"九子遗血龙治终结"],[3,-1873689185,-1873689185,"寻髓初遇单恋天敌"],[4,-1873629472,-1873629472,"雪帝斩霸兽立冰原规矩"],[5,-1873629471,-1873629471,"雪帝拾熊相伴成家"],[6,-373638899,-363638969,"救幼结护聚族止争"],[7,26310814,26310814,"偷吸自满吞金逃帝"],[8,26310814,56310813,"金反噬命隐弱求生"],[9,26330117,26330117,"金蛋破壳开启三眼"],[10,26371101,36371031,"千年佯护毒吞仙草"]]],["绝世唐门前史篇·第二幕 神迹余泽与陆变",26380630,88501231,[[1,26380630,26380630,"寒刀嵌神石改名晨露"],[2,26570101,26570101,"兽王舍身人类成神"],[3,26570101,26570101,"整谷留书设后人之约"],[4,26570102,26570102,"立谕约束封号屠戮"],[5,36371031,37371030,"百年融怨改写根源"],[6,37371101,37371101,"留置魔树保林退路"],[7,66320925,66330924,"学院分院承担监察"],[8,86310101,86501231,"双陆相撞联军决胜"],[9,86510101,88501231,"暗器失市唐门衰落"],[10,86510101,86511231,"星罗旧皇退位受封"]]],["绝世唐门前史篇·第三幕 诸国兴替阁初立",86510101,126321004,[[1,86510101,86511231,"星冠救国承继皇位"],[2,86510101,86510101,"天和先祖护皇获世袭爵"],[3,96321005,96321104,"邪师制凶刀遇敌殒命"],[4,96321005,126321004,"凶刀噬主屡遭流拍"],[5,96371017,96371019,"两凶争食主上退敌"],[6,106310813,106320812,"异世法师复苏亡妻魂"],[7,106321031,106331030,"首败召强创海神阁"],[8,106331031,106331031,"留树生命雕海神"],[9,111310813,111310813,"为研亡法开辟半界"],[10,116310813,116310813,"亡灵覆国后悟净法"]]],["绝世唐门前史篇·第四幕 圣龙少年情局",116310926,126310925,[[1,116310926,126310925,"雪魔求爱重伤久养"],[2,116371101,116371101,"撕天挑龙伤后受制"],[3,120320925,120520924,"邪修残害幼命成封号"],[4,120520925,120570924,"监察团长五年除邪"],[5,123780415,123800414,"圣龙变异破格八岁入学"],[6,123900415,123900415,"十八岁夺冠三俊相惜"],[7,123900416,124000415,"并肩除邪同恋叶择穆"],[8,124000415,124010414,"独行一年重逢共醉"],[9,124010414,124010415,"设局诱龙伪作误认"],[10,124010415,124020414,"生下龙子藏入人间"]]],["绝世唐门前史篇·第五幕 旧誓长困与兽潮",124110414,126371031,[[1,124110414,124110417,"叶挑战旧爱邪师救走"],[2,124110717,124140716,"怒战旧友双龙共寻叶"],[3,124140716,124140716,"叶败双龙逼十年死誓"],[4,124240716,124840715,"十年约战至百岁未决"],[5,124310414,124320413,"钟离强迫生子传位"],[6,124370724,125370723,"三误问情百年受困"],[7,125040719,126040718,"穆得龙丹百年磨霸气"],[8,125330105,125330105,"先辈换得掌骨秘密"],[9,125371101,125381031,"猎魂引潮召强护城"],[10,125371101,126371031,"败后择血百年育玄"]]],["绝世唐门前史篇·第六幕 师辈情债与成长",125371101,126321028,[[1,125371101,125371101,"三凶暗约不奉熊君"],[2,125420927,125420927,"凤凰引线暗验后人"],[3,125520927,125570926,"隔班暗恋苦追强敌"],[4,125530927,125531226,"三月恋后邪凤醒言放手"],[5,125531226,125561225,"穆罚禁足三年令言苦修"],[6,125561226,125561226,"少年少哲追邪遇毒失手"],[7,125570927,125580926,"伤情离去借婚试爱"],[8,125721029,126321028,"孤星失亲自修封号"],[9,125971009,126321008,"转研武魂入院执教"],[10,126020926,126120925,"隐名从军凭功获识"]]],["绝世唐门前史篇·第七幕 龙丹旧创与邪教",126040719,126360723,[[1,126040719,126040719,"龙神血战留残躯"],[2,126040720,126340719,"伤后急吸丹戾侵本源"],[3,126040724,126360723,"三十二载成死神器"],[4,126070620,126070620,"双极限换得林中驻地"],[5,126080317,126080317,"旧门主囤金留后人"],[6,126080607,126080607,"梦魇屠村逃追归圣灵"],[7,126080610,126080612,"荒野遗婴受尸毒变武魂"],[8,126120925,126120925,"恶魂帝借饭菜屠村"],[9,126121001,126130930,"皇子化名求学留恋"],[10,126121024,126121024,"择婚离心旧恋入邪"]]],["绝世唐门前史篇·第八幕 少辈失怙群像",126150316,126350522,[[1,126150316,126170115,"男爵救伤成婚得女"],[2,126150523,126350522,"低天赋独剑苦修成痴"],[3,126150717,126150717,"雪奎与公爵夫人暗生子"],[4,126160115,126220114,"公主违皇命私奔携子返"],[5,126170115,126170115,"出生失母父赴险不归"],[6,126170621,126270620,"钟独十年俘骨龙登教主"],[7,126190506,126190506,"千米光环破格入学"],[8,126200115,126200214,"床下逃劫受援立旧誓"],[9,126200415,126220414,"公爵幼子被逐柴房"]]],["绝世唐门前史篇·第九幕 宗门与家族裂隙",126200415,126340719,[[1,126200415,126230414,"侧室接济母子遭禁"],[2,126200720,126330719,"强冲裂核穆救玄养伤"],[3,126220909,126220909,"失散遇强兽八弟子战死"],[4,126221030,126321029,"误选首环练成控斧"],[5,126230115,126290114,"猎环遭控弑夫后殉情"],[6,126240719,126240719,"穆察张未害人赦一命"],[7,126240720,126340719,"解约难成亲情不作爱"],[8,126240910,126250909,"仁厚新帝留弟权柄"],[9,126241028,126271027,"征父战死慈母病逝"]]],["绝世唐门前史篇·第十幕 寒门母子与皇劫",126250415,126370713,[[1,126250415,126250415,"怀揣热饼暖幼子"],[2,126250707,126250707,"父遭惨死家计骤断"],[3,126250708,126370707,"打零工自学至五级"],[4,126260809,126310808,"灵眸弱体五年苦修"],[5,126260909,126260909,"皇宫遭屠幼子逃密道"],[6,126260910,126261009,"流亡异国获师收留"],[7,126270115,126270115,"寒冬洗衣换油护儿"],[8,126270714,126370713,"单练九耀成主控"],[9,126271104,126271104,"买通城防夜夺唐门"],[10,126280415,126280415,"晾衣遇殴母亲护子"],[11,126280821,126290820,"贝徐获内定接受藏锋"]]],["绝世唐门前史篇·第十一幕 遗孤各寻生路",126281028,126390619,[[1,126281028,126291027,"收橘护袭断腿保储"],[2,126290114,126350713,"挟亲魂迫娜入学待升灵"],[3,126290505,126290510,"六日成炮跻身明德首研"],[4,126290620,126390619,"乌云遭误追反杀后投邪"],[5,126290723,126370722,"食脑催魂渐失本性"],[6,126291006,126301005,"极北掠影冻伤祖父"],[7,126291104,126291104,"唐门求援遇昊天拒"],[8,126300415,126300415,"母亲病逝遗匕留恨"],[9,126300814,126310813,"孤女承门得侣相扶"]]]],"正篇":[["灵眸少年篇·第一幕 离府少年入唐门",126310101,126340426,[[1,126310101,126310101,"云中窥望唐门新星"],[2,126310425,126310425,"旧仪伤江半醒玄武"],[3,126310426,126310426,"送药救母含伤离乡"],[4,126310427,126340426,"耗元助药暗护慈母"],[5,126310809,126310814,"离府北行烤鱼结缘"],[6,126310813,126310813,"濒死神识破界寄存"],[7,126310814,126310814,"白虎匕反杀风狒狒"],[8,126310814,126310814,"百万年魂环寄双灵"],[9,126310814,126310814,"精神海内互托生死"],[10,126310814,126310814,"拜入唐门得法得伴"],[11,126310814,126310814,"探测共享助擒毒蛇"],[12,126310814,126310815,"师兄通脉初练玄功"],[13,126310815,126310818,"绕林听史立志入院"]]],["史莱克新生篇·第一幕 入学合寝初斗魂",126310818,126310821,[[1,126310818,126310818,"免试报到遇严师名"],[2,126310818,126310819,"木板床上勤修自立"],[3,126310819,126310819,"室友争执灵魂制胜"],[4,126310821,126310821,"开课百圈体弱遇险"],[5,126310821,126310821,"蝶翼助跑冰释前嫌"],[6,126310821,126310821,"初试魂炮立百米约"],[7,126310821,126310821,"铁衣苦撑领全班起"],[8,126310821,126310821,"烤鱼开张横遭抢摊"],[9,126310821,126310821,"拔针换丹再设赌局"],[10,126310821,126310821,"看台助战破龟甲盾"]]],["史莱克新生篇·第二幕 洗髓组队闯考核",126310821,126311124,[[1,126310821,126310822,"玄水洗髓灵眸入微"],[2,126310822,126310822,"湖畔邪火天梦护命"],[3,126310822,126310822,"邪火暂息寻冰受阻"],[4,126310822,126310822,"再摆鱼摊择药缓服"],[5,126310823,126311122,"三月苦学稳守班长"],[6,126311122,126311122,"三人结队双魂亮底"],[7,126311122,126311122,"桃临鱼摊赠器备考"],[8,126311123,126311123,"林间演练双控联手"],[9,126311123,126311123,"初战蝶翼连破双敏"],[10,126311124,126311124,"五战全胜保留底牌"]]],["史莱克新生篇·第三幕 魂力互通结浩冬",126311124,126311126,[[1,126311124,126311124,"湖畔逼问再受压制"],[2,126311125,126311125,"三人合力破天罗网"],[3,126311125,126311125,"萧萧接棒循环全胜"],[4,126311125,126311125,"王言识得本体灵眸"],[5,126311125,126311125,"为精神攻击另作解释"],[6,126311125,126311126,"天梦结茧助完美融合"],[7,126311125,126311125,"玄老约看新生排位"],[8,126311126,126311126,"迟到受罚发现魂力互通"],[9,126311126,126311126,"得知魂尊仍争冠军"],[10,126311126,126311126,"合修命名浩冬之力"]]],["史莱克新生篇·第四幕 黄金初现争魂骨",126311126,126311128,[[1,126311126,126311127,"林外初现黄金之路"],[2,126311127,126311127,"险误点名首轮晋级"],[3,126311127,126311127,"融合失效引来王言"],[4,126311127,126311127,"周漪设宴激励争先"],[5,126311127,126311127,"高台旧怨化魂骨赌约"],[6,126311127,126311127,"帆羽出面接下赌局"],[7,126311127,126311127,"灵魂冲击击倒七宝塔"],[8,126311127,126311127,"告知萧萧融合之秘"],[9,126311127,126311127,"宁天拒借家势报复"],[10,126311128,126311128,"鼎锁皮象蝶刃破局"]]],["史莱克新生篇·第五幕 师门争才备决赛",126311128,126311129,[[1,126311128,126311128,"帆羽愿收魂导核心"],[2,126311128,126311128,"疗伤合修替萧萧再战"],[3,126311128,126311128,"玄老弃选王言仍争"],[4,126311128,126311128,"双人爆发直入四强"],[5,126311129,126311129,"院长持签仇人现身"],[6,126311129,126311129,"双人换攻破三器魂"],[7,126311129,126311129,"向王冬诉说母亲旧伤"],[8,126311129,126311129,"异声叹息天梦示警"],[9,126311129,126311129,"萧萧归队决赛再聚"],[10,126311129,126311129,"两院赌局争取新生"]]],["史莱克新生篇·第六幕 夺冠分骨入魂导",126311129,126311130,[[1,126311129,126311129,"诱敌移位先除狐尾"],[2,126311129,126311129,"消耗迫出幽冥白虎"],[3,126311129,126311129,"黄金之路夺下冠军"],[4,126311129,126311129,"冠军同伴共入唐门"],[5,126311129,126311129,"减免赌债结成同伴"],[6,126311130,126311130,"冠军落选正式核心"],[7,126311130,126311130,"两块魂骨分赠同伴"],[8,126311130,126311130,"探测引出魂导新路"],[9,126311130,126311130,"叩首拜入帆羽门下"],[10,126311130,126311130,"两师合议极限单兵"]]],["史莱克新生篇·第七幕 魂导初学越旧怨",126311130,126380201,[[1,126311130,126311130,"周漪揭下面具叮嘱"],[2,126311130,126311130,"一环争位应下挑战"],[3,126311130,126311130,"灰色灵魂逆转败局"],[4,126311130,126311130,"残魂劝解放下迁怒"],[5,126311130,126311201,"伤后守夜再得照顾"],[6,126311201,126311201,"严令整班四人调离"],[7,126311201,126311201,"抡锤开启魂导基础"],[8,126311201,126311201,"唐门寄望暗器新路"],[9,126311202,126320801,"八月苦学锻骨刻阵"],[10,126320202,126380201,"难入名校离府从军"]]],["史莱克新生篇·第八幕 魂导成器与假期",126320430,126321029,[[1,126320430,126321029,"红环险融半年复身"],[2,126320701,126320701,"教网对练笑取情名"],[3,126320704,126320704,"重修前寻冰帝无果"],[4,126320719,126320719,"化人中途遭封神台"],[5,126320731,126320731,"三师猎兽药助金液环"],[6,126320801,126320801,"首刻二级核心获认"],[7,126320801,126320801,"雨夜撑伞独享烤鱼"],[8,126320802,126320802,"升学规则压住假兴"]]],["极北之行篇·第一幕 冰帝换骨成双魂",126320803,126320820,[[1,126320803,126320810,"惜别同伴独奔北疆"],[2,126320810,126320812,"雪下屏息躲过巨足"],[3,126320812,126320815,"凿冰藏身引出天王"],[4,126320815,126320815,"诱敌近身遗蜕锁帝"],[5,126320815,126320815,"说破私心重立信任"],[6,126320815,126320816,"狂奔脱险准备谈判"],[7,126320816,126320816,"永生之约换来本源"],[8,126320816,126320817,"熬过换骨坚守神识"],[9,126320817,126320819,"双魂成形红环封力"],[10,126320817,126320817,"家族助王冬跨入魂尊"],[11,126320820,126320820,"识破白虎猎得模拟"],[12,126320820,126320820,"两位学长为伴留级"]]],["极北之行篇·第二幕 迟归再拜双师",126320827,126320902,[[1,126320827,126320827,"亲见巨器威胁龙神"],[2,126320830,126320901,"归校无人众友焦等"],[3,126320901,126320901,"迟归重逢泪中追问"],[4,126320901,126320901,"以新武魂掩住真相"],[5,126320901,126320901,"模拟换形再认师门"],[6,126320901,126320902,"守住秘密安心重聚"],[7,126320902,126320902,"拦路赌分改为叩首"]]],["极北之行篇·第三幕 模拟红环惊考场",126320902,126320902,[[1,126320902,126320902,"同为惜才两师相争"],[2,126320902,126320902,"旧赌兑现魂导收人"],[3,126320902,126320902,"退学来人见证授徽"],[4,126320902,126320902,"院长追查错失潜力"],[5,126320902,126320902,"合修大进分餐备考"],[6,126320902,126320902,"模拟红环惊停考核"],[7,126320902,126320902,"抓住赌约逼敌叩首"],[8,126320902,126320902,"弓老试掌识极致冰"],[9,126320902,126320902,"借威压训练克服恐惧"]]],["极北之行篇·第四幕 极冰满分争归属",126320902,126320904,[[1,126320902,126320902,"问清神环接受重考"],[2,126320902,126320902,"受辱后暗谋院外杀人"],[3,126320902,126320902,"单兵方案转向一主一辅"],[4,126320904,126320904,"再立赌约蝶斩险取分"],[5,126320904,126320904,"白虎强杀获高分赔令"],[6,126320904,126320904,"极致冰威退火狮夺满分"],[7,126320904,126320904,"极致说明难改师门选择"],[8,126320904,126320904,"院长致歉许重赏争才"],[9,126320904,126320904,"两系争执转交海神阁"]]],["史莱克预备队篇·第一幕 双系共育逢截杀",126320904,126320905,[[1,126320904,126320904,"阁主裁定双系共同培养"],[2,126320904,126320904,"双核心落定依旧合修"],[3,126320905,126320905,"魂导考核以一敌三"],[4,126320905,126320905,"受邀赏宝相约初进城"],[5,126320905,126320905,"聚宝阁授顶级取宝权"],[6,126320905,126320905,"明知人情仍赠伙伴魂骨"],[7,126320905,126320905,"冰帝识宝低价购鲸胶"],[8,126320905,126320905,"得知极致冰急寻学弟"],[9,126320905,126320905,"六人截杀高空冻敌脱追"],[10,126320905,126320905,"黄金封魂学姐焚敌救援"]]],["史莱克预备队篇·第二幕 聚宝淬体成预备",126320905,126320909,[[1,126320905,126320906,"高层追查暗封内院路"],[2,126320906,126320906,"再逼三叩压住追凶冲动"],[3,126320906,126320906,"极冰压邪冷热炼体"],[4,126320906,126320907,"服胶休养体质再进"],[5,126320907,126320907,"选拔通知独压双核名额"],[6,126320907,126320908,"黄金融骨共得回复之力"],[7,126320908,126320909,"赶制二级装备待乱斗"],[8,126320909,126320909,"七人结阵金路扫十二敌"],[9,126320909,126320909,"预备队揭晓统帅之才"],[10,126320909,126320909,"七人排辈菜头正式入唐"]]],["史莱克预备队篇·第三幕 混编对抗掌主控",126320909,126320924,[[1,126320909,126320909,"师兄坦白旧恨结战友约"],[2,126320910,126320923,"两周实战轮换磨合"],[3,126320924,126320924,"新老七怪会面受令"],[4,126320924,126320924,"正选预备混编对抗"],[5,126320924,126320924,"模拟冰帝冻住冰控"],[6,126320924,126320924,"探测牵引凤凰流星"],[7,126320924,126320924,"换队同化冰寒再胜"],[8,126320924,126320924,"主控获任仍惧归乡"],[9,126320924,126320924,"兄长掌掴压住杀念"]]],["史莱克预备队篇·第四幕 监察出征遇生父",126320925,126320926,[[1,126320925,126320925,"出发途中讲监察责任"],[2,126320925,126320925,"七人入团接剿匪令"],[3,126320925,126320925,"戴钥衡示好谈邪魂"],[4,126320925,126320925,"分工野炊拉近队伍"],[5,126320925,126320925,"借器学飞跨越边境"],[6,126320925,126320926,"玄老拖飞夜抵西疆"],[7,126320926,126320926,"军营初见生父忍恨"],[8,126320926,126320926,"循温岚树痕逼近匪巢"],[9,126320926,126320926,"入匪巢初次杀人"]]],["史莱克预备队篇·第五幕 尸爆折翼赴星罗",126320926,126320930,[[1,126320926,126320926,"连环尸爆毁正选"],[2,126320926,126320926,"伊莱克斯净魂除邪"],[3,126320926,126320926,"救回雨浩分队疗伤"],[4,126320927,126320927,"醒后释疑勉力赴赛"],[5,126320927,126320927,"穆恩留玄子改任教"],[6,126320927,126320927,"借伤亡推动魂导改革"],[7,126320927,126320927,"独留唐雅忧门决心"],[8,126320930,126320930,"赛前宽慰隐下无援"],[9,126320930,126320930,"日月疑阵笑红尘傲言"]]],["初代大赛篇·第一幕 残阵首战扬唐门",126321001,126321031,[[1,126321001,126321001,"开幕呼声压向替补"],[2,126321001,126321001,"六红环一击扬唐门"],[3,126321001,126321001,"强撑回房倒下获谢"],[4,126321001,126321001,"夜谈首战得失再修"],[5,126321001,126321031,"暗启天赋夜夜吞生"],[6,126321002,126321002,"推破伪装尊重对手"],[7,126321002,126321002,"穆恩再拒派援争冠"],[8,126321003,126321003,"菜头雪茄显后勤天赋"],[9,126321003,126321003,"循环部署继续藏主控"],[10,126321003,126321003,"笑红尘挑衅催合修"]]],["初代大赛篇·第二幕 个人连胜购魂器",126321003,126321102,[[1,126321003,126321009,"玄子离院暗护少年"],[2,126321003,126321102,"察蝎观赛推机缘"],[3,126321004,126321004,"玄冥置换三秒夺先"],[4,126321004,126321004,"诱刀耗尽再送下台"],[5,126321004,126321004,"踏隙破炮台云罗服输"],[6,126321004,126321004,"楼顶观赛揭隐藏双强"],[7,126321004,126321004,"红尘受震获交流讯"],[8,126321005,126321005,"拍卖门前重议魂导"],[9,126321005,126321005,"信用入场为队配器"],[10,126321005,126321005,"竞得奶瓶补续航"]]],["初代大赛篇·第三幕 生灵凶刀与强敌",126321005,126321006,[[1,126321005,126321005,"压轴凶刀掀明风险"],[2,126321005,126321005,"识生灵之金购下噬灵"],[3,126321005,126321005,"窥王冬识海险遭毁"],[4,126321005,126321005,"城堡双雄惊觉护小冬"],[5,126321006,126321006,"精神一击借矛破四盾"],[6,126321006,126321006,"六十三炮摧盾压魂王"],[7,126321006,126321006,"置换救命极冰返龙卷"],[8,126321006,126321006,"冰控认出旧日恐惧"],[9,126321006,126321006,"拒弃强敌再赌团战"],[10,126321006,126321006,"斩首部署触怒楠楠"]]],["初代大赛篇·第四幕 正天逆战亮昊天",126321008,126321008,[[1,126321008,126321008,"抽签失算贝贝接令"],[2,126321008,126321008,"玄武破封双人夺胜"],[3,126321008,126321008,"留双强菜萧决意拼"],[4,126321008,126321008,"萧鼎碎裂炮震魂圣"],[5,126321008,126321008,"救治双伤三人接战"],[6,126321008,126321008,"虚射麻痹拆敌援护"],[7,126321008,126321008,"极冰破笼返台续战"],[8,126321008,126321008,"暗器破阵圣龙雷域"],[9,126321008,126321008,"借冰帝控力冻魂王"],[10,126321008,126321008,"王冬亮锤终结逆战"]]],["初代大赛篇·第五幕 险后护短备斗灵",126321008,126321010,[[1,126321008,126321008,"王言公开残阵缘由"],[2,126321008,126321008,"正选接护理雨浩醒"],[3,126321009,126321009,"晨醒悟控羞遇来客"],[4,126321009,126321009,"晨间误会谈双生秘"],[5,126321009,126321009,"程刚贪骨入室错抓"],[6,126321009,126321009,"问凶兽榜再催取刀"],[7,126321009,126321009,"单手压蚁罚其自掌"],[8,126321009,126321009,"探病见细心老师释疑"],[9,126321009,126321009,"四种融合猜想开门"],[10,126321010,126321010,"凌借极冰二人清台"]]],["初代大赛篇·第六幕 顶拍重宝引争锋",126321010,126321019,[[1,126321010,126321019,"全胜出线诸伤尽复"],[2,126321016,126321016,"日月辨炮戒躁进"],[3,126321019,126321019,"备战斗灵接顶拍请"],[4,126321019,126321019,"入顶拍见屏雅赠讯"],[5,126321019,126321019,"戴重金拍霸虎战刀"],[6,126321019,126321019,"临秒抬价购十二弹"],[7,126321019,126321019,"冰爆吸收有极冰限"],[8,126321019,126321019,"皇帝借骨结好未来"],[9,126321019,126321019,"胚胎压轴引融合欲"],[10,126321019,126321019,"帝亲访许夺冠赠骨"]]],["初代大赛篇·第七幕 重宝换器胜斗灵",126321019,126321025,[[1,126321019,126321019,"借重宝换器牵明德"],[2,126321019,126321019,"笑豪购胚胎暗敌探"],[3,126321019,126321019,"领刀收弹返店合修"],[4,126321019,126321019,"两兽论族运疑胚胎"],[5,126321020,126321020,"出战逗红尘戒轻敌"],[6,126321020,126321020,"双置换拆斗灵堡阵"],[7,126321020,126321020,"火凤破阵白虎断肢"],[8,126321020,126321020,"王言重责队长认错"],[9,126321022,126321022,"白虎连胜化敌怨"],[10,126321025,126321025,"再换无情直入四强"]]],["初代大赛篇·第八幕 生灵开眼战星罗",126321026,126321028,[[1,126321026,126321026,"戒裂迫取刀驱凶魂"],[2,126321026,126321026,"生灵之金开第三眼"],[3,126321026,126321027,"深冥一昼夜门外守护"],[4,126321027,126321027,"军议激志贝贝解压"],[5,126321027,126321028,"生命气息共修相益"],[6,126321027,126321027,"双七级压垮帝奥"],[7,126321027,126321027,"皇帝论底蕴解妹怨"],[8,126321028,126321028,"公主入列抽战星罗"],[9,126321028,126321028,"星冠双罩割裂冰火"],[10,126321028,126321028,"四魂一体重创白虎"]]],["初代大赛篇·第九幕 冰金护姐退本体",126321028,126321029,[[1,126321028,126321028,"金路消融巨锤破星"],[2,126321028,126321028,"凤凰绕击三路反杀"],[3,126321028,126321028,"公主认负邪火难平"],[4,126321028,126321028,"赛后护人与封口"],[5,126321028,126321028,"强灌邪火冰金护命"],[6,126321028,126321029,"认姐痛哭重得亲人"],[7,126321029,126321029,"喜报认亲试问换融"],[8,126321029,126321029,"雷铠初战斧转身后"],[9,126321029,126321029,"连封感官魂导控场"],[10,126321029,126321029,"本体招揽拒归遭擒"],[11,126321029,126321029,"鸡骨镇魂斗罗退敌"],[12,126321029,126321029,"海神阁缘起惊众人"]]],["初代大赛篇·第十幕 决赛揭局战日月",126321029,126321031,[[1,126321029,126321029,"姐姐劝保命少年悟器"],[2,126321030,126321030,"隐谋终揭留双生后手"],[3,126321030,126321030,"星罗示好遭婉拒"],[4,126321031,126321031,"决赛双亲影玄老压阵"],[5,126321031,126321031,"双流星截炮凤凰突阵"],[6,126321031,126321031,"台下共享换笑入雷狱"],[7,126321031,126321031,"双罩散尽高热夺命"],[8,126321031,126321031,"金蟾百炮柔兔反制"]]],["初代大赛篇·第十一幕 玄武血战破冰蟾",126321031,126321031,[[1,126321031,126321031,"黑凤夺命退台压火"],[2,126321031,126321031,"贝贝认负公爵止骂"],[3,126321031,126321031,"保玄武争留红尘兄妹"],[4,126321031,126321031,"玄武传送震离焱"],[5,126321031,126321031,"以伤留敌玄武杀"],[6,126321031,126321031,"玄老护伤震日月"],[7,126321031,126321031,"唐门毒针破定时炮"],[8,126321031,126321031,"冰蟾毒雾倒贝贝"],[9,126321031,126321031,"冰中传毒败落宸"],[10,126321031,126321031,"白虎诱敌破毒龙"]]],["初代大赛篇·第十二幕 黑凰霓裳夺桂冠",126321031,126321031,[[1,126321031,126321031,"日月弃赛逼双胜"],[2,126321031,126321031,"雷墙诱进审判落"],[3,126321031,126321031,"黑凰持刀逆双敌"],[4,126321031,126321031,"护姐无力仍请战"],[5,126321031,126321031,"双人蝶影穿炮网"],[6,126321031,126321031,"极冰压蟾锁链救"],[7,126321031,126321031,"心灵风暴断红尘"],[8,126321031,126321031,"光之霓裳定冠军"],[9,126321031,126321031,"索剑解毒两院散"],[10,126321031,126321031,"城头议史莱克立场"]]],["初代大赛篇·第十三幕 冠军归途暗流起",126321101,126370620,[[1,126321101,126321101,"夺冠醒后识海长"],[2,126321101,126321101,"恢复问姐知危局"],[3,126321101,126321101,"谢友倾心再共修"],[4,126321101,126321101,"冰床封凰待后策"],[5,126321101,126370425,"同研动心潜修追寒"],[6,126321101,126370620,"赛后暗查定拉拢国策"],[7,126321102,126321103,"领奖整装归学院"],[8,126321102,126321102,"败队归堂责后赦"],[9,126321102,126321102,"堂主察胎欲剥能"]]],["星斗历练篇·第一幕 终身七怪唐雅变",126321103,126330102,[[1,126321103,126321103,"归家受光登海神"],[2,126321103,126321103,"功过分明重治学"],[3,126321103,126321103,"终身七怪共担荣"],[4,126321103,126321103,"识穆老入地底门"],[5,126321103,126321103,"知秘不逼赢信任"],[6,126321103,126321103,"小雅执意归天斗"],[7,126321103,126330102,"闭关凝练寻己路"],[8,126321104,126321203,"退学返城处处碰壁"],[9,126321203,126321203,"暗草破匾吞铁唐"],[10,126321203,126321203,"老者救唐复仇掳人"]]],["星斗历练篇·第二幕 拜师退毒邀红尘",126330102,126330103,[[1,126330102,126330102,"同写唐门融双骨"],[2,126330102,126330102,"双班较劲选七人"],[3,126330103,126330103,"归班布控瞬破七"],[4,126330103,126330103,"两系松界强敌临"],[5,126330103,126330103,"饕餮斗毒拒交人"],[6,126330103,126330103,"海神金光退本体"],[7,126330103,126330103,"三少正式拜师"],[8,126330103,126330103,"布八器潜近史莱克"],[9,126330103,126330103,"镜红尘探视黑凰"],[10,126330103,126330103,"定交换索取门票"],[11,126330103,126330103,"收八器交魂导研究"],[12,126330103,126330103,"暮年授徒争时间"]]],["星斗历练篇·第三幕 冰爆猎熊融恐爪",126330104,126330107,[[1,126330104,126330105,"赶路约定猎环边界"],[2,126330105,126330105,"制服幼猫留生路"],[3,126330105,126330105,"合力冻困万年老猫"],[4,126330105,126330105,"冰爆重创恐爪熊"],[5,126330105,126330105,"掌骨反噬转交霍掌"],[6,126330105,126330106,"生灵护掌融恐爪"],[7,126330105,126330105,"黑凰消息引密谋"],[8,126330107,126330107,"休整试出鼎之威"]]],["星斗历练篇·第四幕 人兽相逢拓命运",126330107,126330117,[[1,126330107,126330116,"试爪后十日寻环"],[2,126330108,126330108,"邪袭引守小桃脱封"],[3,126330109,126330109,"邪药侵心蓄圣女底牌"],[4,126330116,126330116,"篝火结伴隐来历"],[5,126330117,126330117,"鼎挡猴王救维娜"],[6,126330117,126330117,"信封环脱队寻兽"],[7,126330117,126330117,"借冰威避巨人踏击"],[8,126330117,126330117,"误伤瑞兽迫赤王换兽"],[9,126330117,126330117,"强接瑞兽互换记忆"],[10,126330117,126330117,"伊老点明命运相连"],[11,126330117,126330117,"帝天许诺换回瑞兽"],[12,126330117,126330117,"帝天认瑞兽为家人"]]],["星斗历练篇·第五幕 封环启眼单兵试",126330117,126330120,[[1,126330117,126330117,"返阁惊见穆老衰败"],[2,126330117,126330119,"封环晋阶开命运眼"],[3,126330117,126330120,"误逃深林折三护卫"],[4,126330119,126330119,"穆定七日加速修炼"],[5,126330119,126330119,"双人单兵计划开训"],[6,126330119,126330119,"六兽首测尽显新爪"],[7,126330119,126330119,"审判虚弱扭转围攻"],[8,126330119,126330119,"兽测叫停改战同门"]]],["星斗历练篇·第六幕 长修别师承遗命",126330119,126340719,[[1,126330119,126330119,"疲战师兄示爪认输"],[2,126330119,126330119,"首课易容晚膳蕴神"],[3,126330120,126340719,"一年半苦学各进阶"],[4,126330120,126340719,"寻雅无果闭关自苦"],[5,126330720,126330720,"问尽复仇赠善愿"],[6,126340623,126340623,"抗命解禁另投明都"],[7,126340704,126340704,"穆托龙适时传丹护霍"],[8,126340719,126340719,"穆老临终交接阁务"],[9,126340719,126340719,"徐江入唐贝血脉定"],[10,126340719,126340719,"托两关门弟子前路"],[11,126340719,126340719,"圣龙归树穆老长逝"],[12,126340719,126340719,"帝天受命暂避史莱克"]]],["星斗历练篇·第七幕 闭关惜别赴交流",126340719,126351018,[[1,126340719,126340719,"醒悟最后赠礼四十级"],[2,126340720,126341019,"封闭三月苦修成器"],[3,126340720,126341019,"伊传亡灵消霍疑惧"],[4,126340809,126340809,"戴浩重修墓称爱妻"],[5,126341019,126341021,"玄制止苦修重定交换"],[6,126341019,126351018,"囚虐生恨觉魂报复"],[7,126341021,126341021,"离别约三事护己身"],[8,126341022,126341022,"留信离校飞抵枫叶"]]],["明都交流篇·第一幕 体测立约师徒初逢",126341023,126341024,[[1,126341023,126341023,"枫叶互换两院学员"],[2,126341023,126341023,"金翼载众初见明都"],[3,126341023,126341023,"体测显体魄暗记三器"],[4,126341023,126341023,"闭门绘录三仪构造"],[5,126341023,126341023,"监看新生暂缓一号"],[6,126341024,126341024,"抽中轩师受创意考"],[7,126341024,126341024,"魂导诸葛弩过轩考"],[8,126341024,126341024,"拒转院立十果之约"],[9,126341024,126341024,"新理念初识橘子"],[10,126341024,126341024,"观刻阵误惊冰橘子"]]],["明都交流篇·第二幕 烤肉旧情狼围初起",126341025,126341029,[[1,126341025,126341026,"静学三日勤扫实验室"],[2,126341027,126341027,"破门反击三败同学"],[3,126341027,126341027,"轩压争斗救治两伤"],[4,126341027,126341027,"轩护弟子外试避风"],[5,126341028,126341028,"飞行受限悟取舍"],[6,126341028,126341028,"香獐烤肉触旧家伤"],[7,126341029,126341029,"初乘全地形探测器"],[8,126341029,126341029,"橘吐复仇志试探霍"],[9,126341029,126341029,"熟驾出舱击杀银狼"],[10,126341029,126341029,"两女坚持同行引强狼"]]],["明都交流篇·第三幕 银狼取环舍身护伴",126341029,126341031,[[1,126341029,126341029,"山顶独守察狼围"],[2,126341029,126341029,"送球下山弩爆群狼"],[3,126341029,126341029,"尽爆底牌斩银月狼王"],[4,126341029,126341029,"抱狼滑翔脱围待吸环"],[5,126341029,126341029,"唤金狼亡灵作护卫"],[6,126341029,126341031,"双强护融合晋四十二"],[7,126341030,126341031,"返山搜霍再陷狼围"],[8,126341031,126341031,"新混乱破三王救围"],[9,126341031,126341031,"抱二女挡爆身重创"],[10,126341031,126341031,"橘缝血伤珂守阵地"]]],["明都交流篇·第四幕 皇室私刑与橘辞行",126341101,126341107,[[1,126341101,126341102,"配合取片经脉渐通"],[2,126341101,126341101,"全票受任执掌城防"],[3,126341102,126341104,"山外三日复原定情谊"],[4,126341105,126341105,"返校交损得知和入堂"],[5,126341106,126341106,"守局被捕遭皇室私刑"],[6,126341106,126341106,"橘借救霍促太子出手"],[7,126341106,126341106,"镜闯刑室霍借伤施压"],[8,126341106,126341106,"太子杀五借势定局"],[9,126341106,126341106,"帆霍配合争入堂补偿"],[10,126341106,126341107,"病房告别橘退学"]]],["明都交流篇·第五幕 地袭明德夺巨人",126341107,126371106,[[1,126341107,126341115,"休养后首入明德堂"],[2,126341107,126371106,"平叛立威渐掌火凤"],[3,126341116,126350515,"半年取录制成新推进"],[4,126350115,126350115,"成年母传六宝斗灵坠"],[5,126350515,126350515,"本体地袭明德血战"],[6,126350515,126350515,"钻甬道遇塌被迫向深"],[7,126350515,126350515,"秘密室收走金属巨人"],[8,126350515,126350515,"假宗主夺胎击裂封台"],[9,126350515,126350515,"雪帝破封霍杀敌遁回"],[10,126350515,126350515,"雪帝爆灵本源投冰帝"]]],["明都交流篇·第六幕 封雪本源百战立威",126350515,126350521,[[1,126350515,126350515,"伊莱克斯封存雪本源"],[2,126350515,126350518,"失一号封口投太子"],[3,126350519,126350519,"醒后藏宝抗搜拖离院"],[4,126350519,126350519,"解铐加料再议切磋"],[5,126350519,126350519,"隐宝复盘全院征对手"],[6,126350521,126350521,"三横幅挑衅满场敌意"],[7,126350521,126350521,"两场快胜镜借势励学"],[8,126350521,126350521,"夺怨灵胜娜娜险穿喉"],[9,126350521,126350521,"精神击倒重甲三十胜"],[10,126350521,126350521,"赢盘之后仍押全力战"]]],["明都交流篇·第七幕 鏖战剑痴入深冥",126350521,126351205,[[1,126350521,126350521,"娜娜索魂约定赛后还"],[2,126350522,126350522,"冻岩甲假爪逼判胜"],[3,126350522,126350522,"四器疾拳震破烟身"],[4,126350522,126350522,"拳剑争锋季绝尘认输"],[5,126350522,126351121,"半年守关精神海蜕变"],[6,126351121,126351205,"药浴疏脉半月复身"],[7,126351205,126351205,"无声压剑季定毕生追逐"],[8,126351205,126351205,"归还魂片娜再求救"]]],["明都交流篇·第八幕 净魂救娜入海神",126351205,126370421,[[1,126351205,126351205,"泣诉受控求解父母魂"],[2,126351208,126351208,"影遁入坛先杀黑骷髅"],[3,126351208,126351208,"净化群魂大圣灵自灭"],[4,126351208,126351208,"引九人入唐毁坛报院"],[5,126351208,126360807,"监察搜遍各国邪教无踪"],[6,126351208,126361209,"低调研器传千图入阁"],[7,126351210,126361209,"学院助唐门建址接炮单"],[8,126360422,126370421,"独行星斗熟林路"],[9,126360429,126360429,"羊形遗种激活封印"],[10,126360620,126360620,"恩臣失礼受命横死"],[11,126360620,126360620,"两极限划下攻院边界"],[12,126360623,126360623,"投人试谷验证杀局"]]],["明都交流篇·第九幕 冬归重逢援橘营",126360910,126361210,[[1,126360910,126361209,"世子谋独立太子决平叛"],[2,126361209,126361209,"奔逃遇王冬拦剑重逢"],[3,126361209,126361209,"浩冬再合黄金路破剑"],[4,126361209,126361209,"认罚入院诉情允归家"],[5,126361209,126361209,"允游历劝卸重压安眠"],[6,126361210,126361210,"赠双翼托巨宝惹误会"],[7,126361210,126361210,"逐飞假坠和解闻炮震"],[8,126361210,126361210,"远察识故人投围援橘"],[9,126361210,126361210,"冲阵心灵风暴歼八十"],[10,126361210,126361210,"三融合杀赵洋霍护王伤"]]],["明都交流篇·第十幕 伤复携冬闯昊天",126361210,126361216,[[1,126361210,126361211,"王橘治背霍醒省轻敌"],[2,126361211,126361211,"五味饭报恩婉拒军方"],[3,126361211,126361211,"橘守复仇拒随爱远走"],[4,126361212,126361212,"珂送别留唐门退路"],[5,126361212,126361214,"滑行一日停工重制翼"],[6,126361216,126361216,"云海启悟转化精神形"],[7,126361216,126361216,"探测失灵入堡受试威"],[8,126361216,126361216,"辨献祭家长改观护关"],[9,126361216,126361216,"玉床解封至四十七遇变"],[10,126361216,126361216,"绝境共信天梦献本源"]]],["明都交流篇·第十一幕 燃识留魂雪婴生",126361216,126361219,[[1,126361216,126361216,"散宗人两宗主破冰救客"],[2,126361216,126361216,"神火引丹重塑雪胚胎"],[3,126361216,126361216,"伊莱克斯燃识救徒留灰环"],[4,126361217,126361217,"重伤醒来识海空两印"],[5,126361217,126361217,"伊留影释魂灵霍再恸"],[6,126361218,126361218,"独处定志同王约守秘密"],[7,126361219,126361219,"半日讲友谊两叔认可"],[8,126361219,126361219,"牛天修海约共研魂灵"],[9,126361219,126361219,"雪婴破壳反哺认父"],[10,126361219,126361219,"四橙环寄冰武魂晋王"]]],["明都交流篇·第十二幕 雪域试泰制器百日",126361219,126370421,[[1,126361219,126361220,"一夜蜕体牛天指进化"],[2,126361220,126361220,"泰空手挡尽霍连招"],[3,126361220,126361220,"雪舞冰域帝掌逼泰开魂"],[4,126361220,126361221,"峰顶静修磨合雪三绝"],[5,126361222,126361222,"王归误认亲女霍吐秘"],[6,126361222,126361222,"牛天授蓝囊留父考验"],[7,126361222,126361223,"南行别王返日月收尾"],[8,126361223,126370421,"百廿日制器备招轩"],[9,126361224,126361224,"告同门女身筹缘会"],[10,126370124,126370124,"白虎入九环隐强境"]]],["明都交流篇·第十三幕 奇作换鳞别明德",126370323,126370423,[[1,126370323,126370323,"借赛重排金属私路"],[2,126370420,126370420,"双控金属人首飞录影"],[3,126370421,126370421,"两作动轩婉拒密瓶换"],[4,126370421,126370421,"离堂留密瓶报旧恩"],[5,126370422,126370422,"辞前双战破剑留胜疑"],[6,126370422,126370422,"赠弩引拆自毁索九级"],[7,126370422,126370423,"激怒抬价换半单三十鳞"],[8,126370422,126370422,"取影成形误认姊身"],[9,126370422,126370422,"借人世记忆化形出林"]]],["海神缘篇·第一幕 龙皇截途惊见秋影",126370423,126370425,[[1,126370423,126370423,"换回同学分队防截归"],[2,126370423,126370423,"蝎虎截路龙皇三击逼言"],[3,126370423,126370423,"借日净魂助仙破蝎虎"],[4,126370423,126370423,"掌剑逼龙越约玄接归"],[5,126370423,126370423,"归途听双龙百年纠葛"],[6,126370423,126370423,"返家惊见秋儿逐影失踪"],[7,126370423,126370424,"重聚论经营连夜整铸堂"],[8,126370424,126370424,"单身夜拒戴赌看贝醉"],[9,126370424,126370425,"黄金树前泣归午后习规"]]],["海神缘篇·第二幕 灯下摘笠述少年",126370424,126370623,[[1,126370424,126370623,"缓察邪教玄老急练"],[2,126370425,126370425,"湖灯开缘徐换首莲位"],[3,126370425,126370425,"徐揭楠笠夜柳越界落水"],[4,126370425,126370425,"电光佯攻摘金乌笠"],[5,126370425,126370425,"雪女索五笠初示魂灵"],[6,126370425,126370425,"巨炮虚张气柱取三笠"],[7,126370425,126370425,"留灯择缘同门保过关"],[8,126370425,126370425,"一分钟自述菜头诉真心"],[9,126370425,126370425,"橙环布雪台再展伙伴"]]],["海神缘篇·第三幕 缘定冬儿霓裳归",126370425,126370425,[[1,126370425,126370425,"徐泣退水楠唤回拥"],[2,126370425,126370425,"莲花互让鼎上定情"],[3,126370425,126370425,"三女择霍薄冰候答"],[4,126370425,126370425,"楚落水言哄伍求例"],[5,126370425,126370425,"王言越众牵寒归"],[6,126370425,126370425,"岸边立界牵手观缘"],[7,126370425,126370425,"牵手认冬迎五人挑战"],[8,126370425,126370425,"虚弱分阵冰域定五人"],[9,126370425,126370425,"霓裳解冻冬儿现真容"]]],["海神缘篇·第四幕 魂契入阁备猎环",126370425,126370428,[[1,126370425,126370426,"秋影成谜认情交封囊"],[2,126370426,126370426,"阁会述异师雪灵来历"],[3,126370426,126370426,"红密立研暂缓兽谈"],[4,126370426,126370426,"赠契约获隔代继承"],[5,126370426,126370426,"查秋途被训重逢周师"],[6,126370426,126370426,"双颜相对查黄金龙"],[7,126370426,126370427,"契约入库夜归再同修"],[8,126370426,126370428,"三日磨熊拘其魂"]]],["唐门壮大篇·第一幕 七怪再聚磨战阵",126370427,126370429,[[1,126370427,126370427,"猎环待批七怪约学长"],[2,126370427,126370427,"王言重述七怪护荣"],[3,126370427,126370427,"换阵破金乌徐遭缚"],[4,126370427,126370427,"困楚后晃金真身定败"],[5,126370427,126370427,"王评保留七怪再磨合"],[6,126370427,126370429,"增护获准八人赴星斗"],[7,126370428,126370428,"轩私赠自走炮台"],[8,126370429,126370429,"烤鱼聚队共享换主控"],[9,126370429,126370429,"双阵困猿蝶陨留末击"],[10,126370429,126370429,"队长双责调配墨成帝"]]],["唐门壮大篇·第二幕 双王取环逢猎熊",126370429,126370430,[[1,126370429,126370429,"深林择营轮守到双王"],[2,126370429,126370429,"热饼争执触旧伤"],[3,126370429,126370429,"夜述母亲怀饼恩"],[4,126370429,126370429,"月华金升破狒围"],[5,126370429,126370429,"让王环约路布冻尸"],[6,126370429,126370429,"冻尸爆狮失环护营"],[7,126370430,126370430,"晨成六环饼话暖冬"],[8,126370430,126370430,"金枪歼墨豹显神器"],[9,126370430,126370430,"伪宗藏实力随三老"],[10,126370430,126370430,"探产熊识夺幼陷阱"]]],["唐门壮大篇·第三幕 枪断三邪命运融",126370430,126370501,[[1,126370430,126370430,"两雷破围潜穴夺幼"],[2,126370430,126370430,"秋助母返三命兽围攻"],[3,126370430,126370430,"冰域救秋枪断母魂"],[4,126370430,126370430,"奔逃遇袭意外魂融"],[5,126370430,126370430,"净魂金甲退敌伤遁"],[6,126370430,126370430,"龙吟定名循记寻队"],[7,126370430,126370430,"紫果遭毁仍分热饼"],[8,126370430,126370430,"狼猿合击龙铠护生"],[9,126370430,126370430,"缝创喂生血双双昏"],[10,126370430,126370430,"三邪退遁主队循声"],[11,126370430,126370501,"重逢验生冬信无疑"]]],["唐门壮大篇·第四幕 救伤育幼各取环",126370430,126370504,[[1,126370430,126370502,"辞校追剑客寄唐门"],[2,126370501,126370501,"述险留隐催复幼熊"],[3,126370501,126370501,"复幼问食双女敞谈"],[4,126370501,126370501,"剖狼三骨定分与捐"],[5,126370501,126370502,"养伤携幼再入核心"],[6,126370502,126370502,"自走炮护幼启新议"],[7,126370502,126370502,"识拓印待双兽力竭"],[8,126370502,126370502,"围炮留双兽各得环"],[9,126370502,126370504,"猎毕归家携幼返阁"]]],["唐门壮大篇·第五幕 剑师入门双队成",126370504,126370506,[[1,126370504,126370505,"歇眠误会初吻散羞"],[2,126370505,126370505,"人形演示获试点支持"],[3,126370505,126370505,"双队机会七怪择唐门"],[4,126370505,126370505,"访师遇剑痴秋接战"],[5,126370505,126370505,"两击折剑迎入唐门"],[6,126370505,126370505,"轩师入宗接掌魂器"],[7,126370505,126370505,"携双幼熊同贺新门"],[8,126370505,126370506,"通宵议器定专修路"],[9,126370506,126370506,"求炮台墨轩誓入门"],[10,126370506,126370506,"烟攻龟守以和收场"]]],["唐门壮大篇·第六幕 金枪破阵留手情",126370506,126370520,[[1,126370506,126370506,"剑寂逼出光龙雷域"],[2,126370506,126370506,"议剑配合定情共修"],[3,126370506,126370520,"借资援建魂堂改轩堂"],[4,126370507,126370507,"双队定名宣布新规"],[5,126370507,126370507,"渡湖认冬秋儿立威"],[6,126370507,126370507,"光蝶破召唤连取四胜"],[7,126370507,126370507,"炮台锁空宁天败阵"],[8,126370507,126370507,"金枪传身破炮台"],[9,126370507,126370507,"冰域诱掌互留余地"],[10,126370507,126370507,"解冻触怒误会伤冬"]]],["唐门壮大篇·第七幕 天梦为灵拆封囊",126370507,126370508,[[1,126370507,126370507,"识海重逢天梦成灵"],[2,126370507,126370507,"玉环化盾发现封囊"],[3,126370507,126370508,"借梦解封静夜复神"],[4,126370508,126370508,"惊闻暗伤弃言求药"],[5,126370508,126370508,"拦途同行急飞天斗"],[6,126370508,126370508,"无声离阁众寻失踪"],[7,126370508,126370508,"封印早破双主忧险"],[8,126370508,126370508,"双腿融骨实得瞬移"],[9,126370508,126370508,"误入空域留手脱围"],[10,126370508,126370508,"林稀觉险仍为冬前行"]]],["唐门壮大篇·第八幕 冰火险途试真心",126370508,126370509,[[1,126370508,126370509,"识瘴改台夜议冰火"],[2,126370509,126370509,"双发空爆破云降毒林"],[3,126370509,126370509,"极寒换罩竖眼定谷"],[4,126370509,126370509,"碧磷反火逼退高空"],[5,126370509,126370509,"跪求弱点分途重定计"],[6,126370509,126370509,"秋返雪女寒护破阵"],[7,126370509,126370509,"避藤降谷见冰火奇境"],[8,126370509,126370509,"试花知语幽幽迎客"],[9,126370509,126370509,"索书逢试制秋独受药"],[10,126370509,126370509,"露入灵眸秋威逼问真"],[11,126370509,126370509,"双瞳质变再问退路"]]],["唐门壮大篇·第九幕 雪剑夺书血摘红",126370509,126370517,[[1,126370509,126370509,"阳泉护火女初战受挫"],[2,126370509,126370509,"借冰唤帝威压取书"],[3,126370509,126370509,"躯干纳冰缓解欲爆"],[4,126370509,126370509,"还宝过关秘录认先祖"],[5,126370509,126370511,"辨药补典留五次善缘"],[6,126370509,126370517,"十日遍寻等来归讯"],[7,126370511,126370511,"冰血难融饮火摘红"],[8,126370511,126370513,"秋求救草负伤者归院"],[9,126370513,126370513,"门前护短对峙待说明"]]],["唐门壮大篇·第十幕 两女护爱熬昏伤",126370513,126370619,[[1,126370513,126370513,"秋述求草众知真相"],[2,126370513,126370513,"心血连命冬接爱人"],[3,126370513,126370513,"群医辨乱静养保生"],[4,126370513,126370527,"半月守护唤醒伤者"],[5,126370513,126370619,"实战磨合逼强学院队"],[6,126370523,126370523,"六环试出森蚺真身"],[7,126370528,126370528,"醒察内乱冬追锦囊"]]],["唐门壮大篇·第十一幕 引寒复魂坐椅出征",126370528,126370917,[[1,126370528,126370530,"精神显形获援亦受罚"],[2,126370530,126370608,"绘体十日定分步疗法"],[3,126370608,126370609,"先通下肢再修手脉"],[4,126370610,126370610,"开胸祛火封三肢复魂"],[5,126370610,126370619,"通脉养身黄金椅代步"],[6,126370616,126370616,"求冠药推七十门槛"],[7,126370617,126370707,"学院入股土师筑工厂"],[8,126370618,126370917,"商会供金推动材料涨价"],[9,126370619,126370619,"战前留守剑痴请同行"],[10,126370619,126370619,"血镇反对准邪参赛"],[11,126370619,126370619,"压融稳势练成换阵"]]],["明都大赛篇·第一幕 轮椅赴明初逢雅",126370620,126370620,[[1,126370620,126370620,"轮椅出城显意服同门"],[2,126370620,126370620,"园中议军待位筹大赛"],[3,126370620,126370620,"城外歇炊结善天甲"],[4,126370620,126370620,"一剑碎铠却不杀人"],[5,126370620,126370620,"抵明探馆久公主赠令"],[6,126370620,126370620,"体测重逢唐雅伤贝"],[7,126370620,126370620,"核龄入低房病中交权"],[8,126370620,126370620,"持令告急震动公主"],[9,126370620,126370620,"护卫试压许追客致歉"],[10,126370620,126370620,"弩炮揭密封诱来订单"]]],["明都大赛篇·第二幕 采购双约摄政开赛",126370620,126370624,[[1,126370620,126370622,"专程返国验炮复明"],[2,126370620,126370621,"夜思延战翌日报商议"],[3,126370621,126370621,"领队探病贝隐唐雅"],[4,126370621,126370621,"贝述童养旧约难解"],[5,126370621,126370621,"改貌藏技备淘汰首战"],[6,126370621,126370621,"顶层谈失恋劝保自尊"],[7,126370622,126370622,"新规争议两国客撞门"],[8,126370622,126370622,"两国同签唐门采购"],[9,126370623,126370624,"抽签入场摄政开赛"],[10,126370624,126370624,"毒控六胜试出护罩"]]],["明都大赛篇·第三幕 雪灵连胜收秋秋",126370624,126370625,[[1,126370624,126370624,"夜讯本体强援潜都"],[2,126370624,126370624,"梦缠旧识冬怒护霍"],[3,126370624,126370624,"皇室查霍堂主求杀"],[4,126370625,126370625,"雪女连冻地龙三人"],[5,126370625,126370625,"泯灭受制赌入唐门"],[6,126370625,126370625,"暗中冲击拿满十二"],[7,126370625,126370625,"母定期限秋秋入门"],[8,126370625,126370625,"吞魂首杀逼退天都"],[9,126370625,126370625,"疑闻小桃精神轻唤"],[10,126370625,126370625,"午宴欢迎又争住处"]]],["明都大赛篇·第四幕 七盾逆时换组晋",126370625,126370721,[[1,126370625,126370625,"闯房撞见恋人表意"],[2,126370627,126370628,"首轮收官晋住凉棚"],[3,126370628,126370628,"戴破天甲两胜换人"],[4,126370628,126370628,"轮换练兵个人四分"],[5,126370628,126370628,"七盾合一逼出危机"],[6,126370628,126370628,"逆时增幅合破七盾"],[7,126370628,126370628,"轮换练兵兼筹购金"],[8,126370628,126370721,"三遣失踪星云断讯"],[9,126370629,126370629,"徐破蛇发两胜退场"],[10,126370629,126370629,"四人团胜保力晋级"]]],["明都大赛篇·第五幕 地下立威遇宿敌",126370629,126370704,[[1,126370629,126370629,"货源被占转报地下赛"],[2,126370629,126370629,"切桌制器双过资格"],[3,126370629,126370629,"杀管事立邪师威势"],[4,126370629,126370629,"净魂假身份收晨安"],[5,126370629,126370629,"返店析盟预感暗局"],[6,126370629,126370629,"橘揭女身平摄政疑"],[7,126370630,126370701,"避硬拼以小分晋级"],[8,126370702,126370702,"精封奶瓶以利固线"],[9,126370702,126370703,"同组再遇定战宿敌"],[10,126370704,126370704,"宿敌列阵冷心待战"]]],["明都大赛篇·第六幕 冰雪破日月旧队",126370704,126370705,[[1,126370704,126370704,"光神反炮暗芒取命"],[2,126370704,126370704,"百米疾进拆重炮台"],[3,126370704,126370704,"判后偷袭百米反杀"],[4,126370704,126370704,"冷令换将银网止冲"],[5,126370704,126370704,"针麻穿心制止续战"],[6,126370704,126370704,"日月退团唐门扬名"],[7,126370704,126370704,"治伤倾心重拾自我"],[8,126370705,126370705,"夜赛护主拒绝欺侮"],[9,126370705,126370705,"快刀抢先赌失三十万"],[10,126370705,126370705,"重取生灵裁决木桌"]]],["明都大赛篇·第七幕 换阵封龙再取胜",126370706,126370706,[[1,126370706,126370706,"剑意护队识破旧生"],[2,126370706,126370706,"六芒诱步昊天断刺"],[3,126370706,126370706,"吞血反噬蝙蝠自亡"],[4,126370706,126370706,"姐越规复仇判负"],[5,126370706,126370706,"抡鼎耗甲震败长刀"],[6,126370706,126370706,"三秒封蚺连鼎伤敌"],[7,126370706,126370706,"制导分阵先退刺客"],[8,126370706,126370706,"换位夹杀蝠分身逃"],[9,126370706,126370706,"女神雪域封双核心"],[10,126370706,126370706,"解冻附约剑痴领战"]]],["明都大赛篇·第八幕 金属黑赛添新友",126370706,126370714,[[1,126370706,126370706,"报捷卸压贝藏实情"],[2,126370706,126370706,"公主惊闻密报续查"],[3,126370707,126370707,"黑赛对抗重注入场"],[4,126370707,126370707,"土法精工相约试炮"],[5,126370707,126370707,"错向自轰轮椅取胜"],[6,126370707,126370707,"酒座谈技索留成品"],[7,126370707,126370707,"酒助化冰谈成留用"],[8,126370708,126370714,"连胜养力静候学院"],[9,126370709,126370709,"边帅得炮看重常兵"],[10,126370713,126370713,"冠军之心凝聚新队"]]],["明都大赛篇·第九幕 金龙枪决红尘恋",126370713,126370714,[[1,126370713,126370713,"摄政许冠邪宗扫路"],[2,126370714,126370714,"黄金疾袭枪吞骷髅师"],[3,126370714,126370714,"蓄枪逼退梦借裁判"],[4,126370714,126370714,"嗜血威退叠罩游斗"],[5,126370714,126370714,"九耀拦龙时锁破控"],[6,126370714,126370714,"龙伤冰蟾衰线夺生"],[7,126370714,126370714,"冰铠龙吟暗助破眷恋"],[8,126370714,126370714,"揭女身护判学院晋级"],[9,126370714,126370714,"坦白融合护伤再赴赛"],[10,126370714,126370714,"精元示利重注争前三"]]],["明都大赛篇·第十幕 晨露授法灰环醒",126370714,126400717,[[1,126370714,126370714,"示弱对赌黑暗青龙"],[2,126370714,126370715,"独造复盾压线完工"],[3,126370714,126370714,"邪教观盾欲收天才"],[4,126370714,126370714,"失尾查底晨安藏线"],[5,126370714,126400717,"笑伤后久养恢复元气"],[6,126370715,126370715,"捕球反炮雷霆晋三"],[7,126370715,126370715,"灰环解封凋零破罩"],[8,126370715,126370715,"赌物兑现择巷脱身"],[9,126370715,126370715,"信任赠刀冬拒卧底"],[10,126370715,126370715,"遗影授法明灰环本质"]]],["明都大赛篇·第十一幕 贝归试界分双赛",126370715,126370719,[[1,126370715,126370715,"贝复会餐共让榜首"],[2,126370715,126370715,"半位面试行重定约束"],[3,126370716,126370716,"乱披风争强及时止斗"],[4,126370716,126370716,"责违队令护臂和解"],[5,126370718,126370718,"分区避同门抽雪魔"],[6,126370718,126370719,"防本体伏兵双赛备战"],[7,126370719,126370719,"日积化冰左臂复动"],[8,126370719,126370719,"冰帝醒来解明末环"],[9,126370719,126370719,"夺徒许刀惩浮弟"],[10,126370719,126370719,"欲洗天才改为盯收"]]],["明都大赛篇·第十二幕 骄阳借日擂台胜",126370720,126370720,[[1,126370720,126370720,"赛前姐妹释意祝胜"],[2,126370720,126370720,"御医稳伤堂主被拢"],[3,126370720,126370720,"踩罩压飞移位锁喉"],[4,126370720,126370720,"太阳耀场强敌蓄势"],[5,126370720,126370720,"借日提纯四胜出线"],[6,126370720,126370720,"论器立愿护国止战"],[7,126370720,126370720,"观剑破龙雷霆翻局"],[8,126370720,126370720,"排查本体定首发"]]],["明都大赛篇·第十三幕 双生龙合败雪魔",126370720,126370720,[[1,126370720,126370720,"星罗退赛公主警示"],[2,126370720,126370720,"强攻诱怒复刻换掌"],[3,126370720,126370720,"幻影诱腿反盾断骨"],[4,126370720,126370720,"女神凝帖伤敌认负"],[5,126370720,126370720,"水域卸势换判认输"],[6,126370720,126370720,"授意偏判促两伤"],[7,126370720,126370720,"拒修协商即刻团战"],[8,126370720,126370720,"机炮抢先本体反控"],[9,126370720,126370720,"缚龙连融留命取胜"],[10,126370720,126370720,"胜后释怨相惜约战"],[11,126370720,126370720,"认清差距仍欲尽收"],[12,126370720,126370720,"拒绝含混同行邀约"]]],["明都大赛篇·第十四幕 仓谋封城争出线",126370720,126370722,[[1,126370720,126370720,"夜会晨安订金购材"],[2,126370720,126370720,"分神追踪寻得真仓"],[3,126370720,126370720,"亲巡西山未见重伏"],[4,126370721,126370721,"交底封城引见学院"],[5,126370721,126370721,"西山疑路学院护归"],[6,126370721,126370721,"拒刺保生各筹行动"],[7,126370722,126370722,"双龙立约单场争席"],[8,126370722,126370722,"黄金压雷膝落定胜"]]],["明都大赛篇·第十五幕 唤雅弃胜团破邪",126370722,126370722,[[1,126370722,126370722,"励众守门贝先迎邪"],[2,126370722,126370722,"凝雷锁舌四掌破邪"],[3,126370722,126370722,"破鞭震海圣龙灭骨"],[4,126370722,126370722,"重逢情网唤旧忆"],[5,126370722,126370722,"抱枪唤雅认负救命"],[6,126370722,126370722,"谎称暗通稳住师弟"],[7,126370722,126370722,"接下弃胜隐援入台"],[8,126370722,126370722,"换辅破虚镇骨分敌"],[9,126370722,126370722,"骨龙真身连破诸防"],[10,126370722,126370722,"白银扰识冰爆借杀"],[11,126370722,126370722,"蝶龙合三冰雪终杀"],[12,126370722,126370722,"弟子尽殁教主欲抓"]]],["明都大赛篇·第十六幕 退邪会盟宫变起",126370722,126370723,[[1,126370722,126370722,"扬名同庆仇敌退场"],[2,126370722,126370722,"师生会商改议配合"],[3,126370722,126370722,"平民小馆再结行动"],[4,126370722,126370722,"三面示威西伏待选"],[5,126370722,126370722,"借邪图霸预候来敌"],[6,126370722,126370722,"血月毁阁炮林退敌"],[7,126370722,126370722,"锁住三面再逼西行"],[8,126370722,126370722,"明德尽毁老帝骤逝"],[9,126370722,126370722,"借灾安内催仇留西"],[10,126370723,126370723,"探贝识伤再嘱保命"]]],["明都大赛篇·第十七幕 分神赴赛暗潜仓",126370723,126370723,[[1,126370723,126370723,"认橘警信定西退路"],[2,126370723,126370723,"赴夕水闻规见重弹"],[3,126370723,126370723,"卵化分神双线启行"],[4,126370723,126370723,"三盟竞奖怒命杀敌"],[5,126370723,126370723,"珍金留才大楼随行"],[6,126370723,126370723,"日月神针升空示奖"],[7,126370723,126370723,"分神制壳隐忍候归"],[8,126370723,126370723,"付余验货保住商路"],[9,126370723,126370723,"双九八战龙皇撤退"],[10,126370723,126370723,"候援离仓刺李取钥"]]],["明都大赛篇·第十八幕 取金盗库压线成甲",126370723,126370723,[[1,126370723,126370723,"循码潜降破守入仓"],[2,126370723,126370723,"母金蚀门蝶龙破守"],[3,126370723,126370723,"择金窥军善后传警"],[4,126370723,126370723,"见信分流先出西郊"],[5,126370723,126370723,"失忠管事升梯困返"],[6,126370723,126370723,"护贝出城隐林接赛"],[7,126370723,126370723,"归魂刻阵压线成甲"],[8,126370723,126370723,"临检缓神入甲复行"],[9,126370723,126370723,"凝冰腐光巧钻难金"],[10,126370723,126370723,"技巧晋级错开同门"]]],["明都大赛篇·第十九幕 灾爆夺冠出西山",126370723,126370723,[[1,126370723,126370723,"强破深仓撞上倒计"],[2,126370723,126370723,"金罩顶刀近炮夺命"],[3,126370723,126370723,"灵甲假拙拳震若若"],[4,126370723,126370723,"圣剑灭邪惊动五老"],[5,126370723,126370723,"光明亡灵藏天使"],[6,126370723,126370723,"领奖受围邪凤招子"],[7,126370723,126370723,"仓爆连灾玄抢双徒"],[8,126370723,126370723,"钻地东逃避开封兵"],[9,126370723,126370723,"西山问责同门共担"],[10,126370723,126370723,"逼情杀侣血祭湖"]]],["乾坤问情篇·第一幕 湖锁问情剖旧念",126370723,126370724,[[1,126370723,126370723,"旧路重现抱团候明"],[2,126370723,126370724,"三力同修紫金复元"],[3,126370723,126370723,"内应引踪双案刺帅"],[4,126370723,126370723,"借明都惨祸成死神"],[5,126370724,126370724,"雾锁天地标林求路"],[6,126370724,126370724,"亡灵说清师长释疑"],[7,126370724,126370724,"金潮牵众辨问情"],[8,126370724,126370724,"巫宁舍命各诉真心"],[9,126370724,126370724,"贝愿舍身求雅归常"],[10,126370724,126370724,"乐萱剖心贝闻旧爱"]]],["乾坤问情篇·第二幕 生死问爱同闯关",126370724,126370724,[[1,126370724,126370724,"戴朱痛问辨相守"],[2,126370724,126370724,"三心连问各明所爱"],[3,126370724,126370724,"萧和生死问出重担"],[4,126370724,126370724,"江顾慈母徐受三鞭"],[5,126370724,126370724,"徐再受罚双友落险"],[6,126370724,126370724,"近身连控破巫宁"],[7,126370724,126370724,"戴愿让关朱求同行"],[8,126370724,126370724,"甲拳幻域战秋让关"]]],["乾坤问情篇·第三幕 舍关救父再救兄",126370724,126370724,[[1,126370724,126370724,"贝徐困城燃命相救"],[2,126370724,126370724,"戴朱化卫同担救父"],[3,126370724,126370724,"暂压旧怨共接军危"],[4,126370724,126370724,"假环震帅真探截路"],[5,126370724,126370724,"崩山护兵神针退刺"],[6,126370724,126370724,"舍关换回百兵生机"],[7,126370724,126370724,"留针念父再接救令"],[8,126370724,126370724,"释叶同援探眼寻兄"],[9,126370724,126370724,"魂击止命冰爆断追"],[10,126370724,126370724,"城外别叶回谷复伤"]]],["乾坤问情篇·第四幕 真心各明死生炼",126370724,126370724,[[1,126370724,126370724,"死生重铸逼战无名"],[2,126370724,126370724,"逐蜈护朱急断毒路"],[3,126370724,126370724,"重临旧屋弃仪护江"],[4,126370724,126370724,"旧情照见江徐释结"],[5,126370724,126370724,"草原问爱放下旧念"],[6,126370724,126370724,"峰顶重压诱跃深谷"],[7,126370724,126370724,"虚影见雅获药指引"],[8,126370724,126370724,"幻敌逼仇萧许共担"],[9,126370724,126370724,"冰峰争锋见霍停战"],[10,126370724,126370724,"幕后父声坚持磨砺"],[11,126370724,126370724,"苦战终止重返冻身"]]],["乾坤问情篇·第五幕 舍命救冬梦暂沉",126370724,126380330,[[1,126370724,126370724,"冬先舍命秋抱归途"],[2,126370724,126370724,"众归观幕痛见冬逝"],[3,126370724,126370724,"问情派奖各带所求"],[4,126370724,126370724,"拒换所爱喂红续命"],[5,126370724,126370724,"免考出谷独退邪封"],[6,126370724,126370725,"绕飞出境分护送医"],[7,126370724,126370724,"秋别伤地独自归家"],[8,126370724,126380330,"镜病渐复重任天斗"],[9,126370724,126370726,"赛后搜唐五落空受责"]]],["日升营救篇·第一幕 辞冬复腿再谋援囚",126370725,126371024,[[1,126370725,126370726,"送冬归堡顶压拜别"],[2,126370725,126370808,"纳才储金同候母讯"],[3,126370725,126370924,"绘影遍问草药无名"],[4,126370725,126371024,"谷后暗寻始终无讯"],[5,126370728,126371012,"死关融冰双腿复全"],[6,126370728,126370927,"双女磨剑转试玄武"],[7,126370731,126370731,"登位认叶巩固后盾"],[8,126370808,126370808,"圣剑泯灭仍让剑痴"],[9,126370808,126370808,"母俘确讯谋救待机"],[10,126370809,126371008,"静局登帝扩堂交炮"],[11,126370812,126370812,"言护双女添六环"]]],["日升营救篇·第二幕 领队换翼海陆迂回",126370825,126371031,[[1,126370825,126370825,"送双熊留居落日"],[2,126370918,126371017,"俘后受虐被迫役使"],[3,126371001,126371031,"垫金精装六十一台"],[4,126371001,126371031,"拆巨甲制单兵战铠"],[5,126371012,126371012,"思拳念剑震退玄武"],[6,126371012,126371012,"定址援囚霍受领队"],[7,126371012,126371012,"粉花逢识救雅见路"],[8,126371012,126371012,"校门控争约束秋秋"],[9,126371012,126371013,"归阁议援换翼出城"],[10,126371013,126371013,"七翼绕林南下临海"],[11,126371013,126371013,"冰上捕鱼海边共炊"]]],["日升营救篇·第三幕 租船混城夜识囚影",126371014,126371017,[[1,126371014,126371014,"绕海入港订船留路"],[2,126371014,126371016,"诱匪入巷转赴日升"],[3,126371014,126371015,"八强越境尽毁军备"],[4,126371015,126371015,"边报入宫暂缓邪战"],[5,126371017,126371017,"凶地察命决意相助"],[6,126371017,126371017,"亡灵诱警六人混城"],[7,126371017,126371017,"静封魂力独过扫描"],[8,126371017,126371017,"谨探城防尚无囚影"],[9,126371017,126371017,"两灵苏醒另议头骨"]]],["日升营救篇·第四幕 净怨救友唤回小桃",126371018,126371019,[[1,126371018,126371018,"夜探偶见受困风凌"],[2,126371018,126371018,"三式思念破怨归尘"],[3,126371018,126371019,"清场救人静养余情"],[4,126371019,126371019,"轻唤创伤定先救众"],[5,126371019,126371019,"隔绝屋内装配巨器"],[6,126371019,126371019,"剑心开窍相守定情"],[7,126371019,126371019,"借命运感寻到水口"],[8,126371019,126371019,"精神潜牢识药窥隙"],[9,126371019,126371019,"认姐泄波险脱黑火"],[10,126371019,126371019,"负伤唤姐止掌颈前"],[11,126371019,126371019,"吸暗唤回失散姐姐"]]],["日升营救篇·第五幕 配药开牢南阵夺路",126371019,126371024,[[1,126371019,126371019,"暗置石雷剑重爱人"],[2,126371020,126371020,"分水验毒配成解药"],[3,126371020,126371020,"夜约内应查得母踪"],[4,126371021,126371023,"暗投解药联众待机"],[5,126371022,126371023,"双生感死引众追凶"],[6,126371022,126371022,"三波弩火破阵夺天"],[7,126371024,126371024,"分头就位承诺留救"],[8,126371024,126371024,"冻河冰爆开牢暴起"],[9,126371024,126371024,"借镜换位直捣南营"],[10,126371024,126371024,"开洞控场众破援兵"],[11,126371024,126371024,"援来过早返城接友"]]],["日升营救篇·第六幕 救母遇伏燃念诛邪",126371024,126371024,[[1,126371024,126371024,"破阵配翼分途向海"],[2,126371024,126371024,"借责拖兵随追护弟"],[3,126371024,126371024,"潜院断锁救出南母"],[4,126371024,126371024,"回店遇伏碎身成警"],[5,126371024,126371024,"回放动情幻遁仍困"],[6,126371024,126371024,"秋援开眼改命合力"],[7,126371024,126371024,"融合迎剑难破封号"],[8,126371024,126371024,"为送秋归点燃精海"],[9,126371024,126371024,"燃念破剑再斩巫雨"]]],["日升营救篇·第七幕 瑞兽献祭载运诀别",126371024,126371101,[[1,126371024,126371024,"金心载逃临危认爱"],[2,126371024,126371024,"瑞兽献祭扑灭魂火"],[3,126371024,126371024,"命运头骨融入诀别"],[4,126371024,126371024,"降临失效怒令集兽"],[5,126371024,126371024,"惊闻燃海孤身追寻"],[6,126371024,126371030,"七彩静融母女守护"],[7,126371025,126371025,"清点缺员咬牙开船"],[8,126371025,126371025,"夺责杀将宫廷生隙"],[9,126371030,126371030,"金光越隙蝶龙交映"],[10,126371030,126371101,"归队无讯忧中应警"]]],["兽神传灵篇·第一幕 孤寻邪眼兽潮压城",126371031,126371101,[[1,126371031,126371031,"醒后含悲托警独行"],[2,126371031,126371031,"避兽未果双敌毙命"],[3,126371031,126371031,"命运克眼焚魂取环"],[4,126371031,126371031,"免疫承怒残力穿甲"],[5,126371101,126371101,"黑云压境全城备战"],[6,126371101,126371101,"索人不从黑炎开战"],[7,126371101,126371101,"三十二弩炮截兽锋"],[8,126371101,126371101,"碧翼护军鹰影争锋"],[9,126371101,126371101,"金龙留魂护玄化饕"],[10,126371101,126371101,"树魂助饕暂封兽神"]]],["兽神传灵篇·第二幕 联炮杀虎爆盾护妻",126371101,126371102,[[1,126371101,126371101,"报明献祭获允助防"],[2,126371101,126371101,"轮守火墙挡住首潮"],[3,126371101,126371102,"夜潮耗尽储瓶重炮"],[4,126371101,126371102,"红环晋圣赶回危城"],[5,126371102,126371102,"联动红线灭虎退军"],[6,126371102,126371102,"售环换资密告耗能"],[7,126371102,126371102,"四凶合围弹火迎军"],[8,126371102,126371102,"强突伤熊爆盾护妻"],[9,126371102,126371102,"危时诉尽多年暗爱"],[10,126371102,126371102,"生死误会真心相认"]]],["兽神传灵篇·第三幕 亡灵退兽平生存争",126371102,126371104,[[1,126371102,126371102,"肉搏将溃树光续命"],[2,126371102,126371102,"九门亡灵破后争息"],[3,126371102,126371102,"兽军回围孤城暂歇"],[4,126371102,126371102,"绕兽归城闻师尚在"],[5,126371102,126371102,"破封灭世本体来援"],[6,126371102,126371102,"再燃精神逼兽神谈"],[7,126371102,126371102,"雪女现身说明契约"],[8,126371102,126371102,"约定试验兽潮退去"],[9,126371102,126371104,"公开研究招募百人"],[10,126371102,126371102,"湖畔敞心筹备首试"]]],["兽神传灵篇·第四幕 平等契约首成魂灵",126371102,126380203,[[1,126371102,126371102,"金玉养身重新合力"],[2,126371103,126371103,"思冬拳触动兽神情"],[3,126371103,126371104,"融技两日赴林缘约"],[4,126371104,126371104,"首名旧敌遇伤虎袭"],[5,126371104,126371104,"龙王爪惩熊稳试验"],[6,126371104,126371104,"平等契约首成黑虎"],[7,126371104,126371104,"百次试验九十一成"],[8,126371104,126380203,"扩城酬唐门限额传灵"],[9,126371105,126371105,"复查魂灵厘清边界"],[10,126371105,126371105,"五方同意筹传灵塔"]]],["兽神传灵篇·第五幕 立塔三月逆鳞留身",126371105,126380315,[[1,126371105,126371204,"林外留研制图存咒"],[2,126371109,126380208,"小公主自请留军营"],[3,126371204,126371204,"议会立制玄任塔主"],[4,126371204,126380203,"三月传灵教成首批"],[5,126371216,126380315,"鸾凤从留任到倾心相授"],[6,126380119,126380119,"少哲辞继位专心闭关"],[7,126380203,126380203,"求离获准戴上黑坠"],[8,126380203,126380203,"逆鳞封神重立长志"],[9,126380204,126380204,"归阁坦陈亡灵传承"],[10,126380204,126380204,"阁主寄望游子再辞"]]],["白虎军旅篇·第一幕 八角成灵冬醒失忆",126380204,126380205,[[1,126380204,126380204,"立下归讯阁老送行"],[2,126380204,126380204,"重会唐门约伴寻药"],[3,126380205,126380205,"极冰护兄重入毒谷"],[4,126380205,126380205,"命运逼问认蓝银皇"],[5,126380205,126380205,"收胶存粉留救人路"],[6,126380205,126380205,"八角自愿献晶求伴"],[7,126380205,126380205,"玄冰成灵双环齐满"],[8,126380205,126380205,"分途登峰破阵求见"],[9,126380205,126380205,"魂灵联击逼出龙罩"],[10,126380205,126380205,"得闻冬醒却失旧忆"],[11,126380205,126380205,"闻安复起辞别昊天"]]],["白虎军旅篇·第二幕 易名入伍虎弟开血",126380205,126380310,[[1,126380205,126380206,"西南赶路易容归乡"],[2,126380206,126380207,"伏墓痛哭重定复仇"],[3,126380208,126380208,"唐冬入伍举锁得甲"],[4,126380208,126380208,"整房服众有序用餐"],[5,126380208,126380208,"军姿出众获暂领队"],[6,126380208,126380208,"夜比认弟藏情施教"],[7,126380209,126380308,"白日练军夜里磨弟"],[8,126380308,126380308,"借星爆试胆弟挡许"],[9,126380309,126380309,"许云再战星冠失守"],[10,126380309,126380309,"受激染血变虎显锋"],[11,126380309,126380310,"止战洗伤回放释惑"]]],["白虎军旅篇·第三幕 西疆崩线幻军救父",126380310,126380310,[[1,126380310,126380310,"新兵双阵胜亲卫队"],[2,126380310,126380310,"显伤退让解公主疑"],[3,126380310,126380310,"九级破山斩首崩线"],[4,126380310,126380310,"远爆震营亲兵守城"],[5,126380310,126380310,"循命运北觅被围军"],[6,126380310,126380310,"分路留后主帅托孤"],[7,126380310,126380310,"伪称国教幻军脱围"],[8,126380310,126380310,"亲卫入门分瞳阻追"],[9,126380310,126380310,"换父袭叶夺针遁去"],[10,126380310,126380310,"放回亲卫隐伤辞父"]]],["白虎军旅篇·第四幕 滴血认弟误中牵制",126380311,126380317,[[1,126380311,126380311,"本体突袭遭圣灵阻"],[2,126380311,126380311,"归营隐救闻七万亡"],[3,126380312,126380317,"援兵汇集静候生疑"],[4,126380316,126380316,"力压群议封后为帅"],[5,126380317,126380317,"滴血认弟敞露旧恨"],[6,126380317,126380317,"高空断链整收探器"],[7,126380317,126380317,"突放高空催虎融灵"],[8,126380317,126380317,"远探空营识牵制局"],[9,126380317,126380317,"失探促橘提前动兵"],[10,126380317,126380317,"警讯到父反攻随起"]]],["白虎军旅篇·第五幕 死神白光催建新军",126380317,126380416,[[1,126380317,126380317,"试耗炮阵压近山口"],[2,126380317,126380317,"死神白光抹灭群圣"],[3,126380317,126380317,"舍弃小兵急返报战"],[4,126380317,126380318,"久久认责改议援北"],[5,126380317,126380317,"错抱舞桐拳传思念"],[6,126380317,126380317,"请议舞桐再报军情"],[7,126380317,126380317,"阁议唐门新军成形"],[8,126380317,126380317,"返边侦察带舞同行"],[9,126380317,126380317,"定队待传灵再上前线"],[10,126380317,126380416,"稀金赊让换城立足"]]],["魂核明斗篇·第一幕 通灵弃猎金盾回刃",126380317,126380318,[[1,126380317,126380318,"交探通宵领命启队"],[2,126380318,126380318,"守兄秘密假称师恩"],[3,126380318,126380318,"碧姬择兽殿中相识"],[4,126380318,126380318,"四人誓止猎环取信"],[5,126380318,126380318,"天龙完契光圣龙成"],[6,126380318,126380318,"胭脂通灵江晋七环"],[7,126380318,126380318,"玳瑁释生徐得金盾"],[8,126380318,126380318,"旧苦主前坦陈吞金"],[9,126380318,126380318,"灵刃升华逆鳞断感"],[10,126380318,126380318,"定志败帝藏忧出发"],[11,126380318,126380318,"同行心动让位国事"]]],["魂核明斗篇·第二幕 溪畔误认故味旧情",126380318,126380329,[[1,126380318,126380318,"溪畔备鱼旧味待尝"],[2,126380318,126380318,"金龟脱壳胜剑痴"],[3,126380318,126380318,"烤鱼暖味各藏心事"],[4,126380318,126380318,"半块烧饼牵旧闻"],[5,126380318,126380318,"守营核验公主迎客"],[6,126380318,126380318,"相握不识亲生子"],[7,126380318,126380318,"五里共享议高空"],[8,126380318,126380318,"军功取爵仍要自由"],[9,126380318,126380318,"掌心试融合落空"],[10,126380318,126380329,"天斗沦陷皇室东撤"],[11,126380319,126380319,"江楠楠说清旧情"]]],["魂核明斗篇·第三幕 寒空触悟盗高探",126380319,126380320,[[1,126380319,126380319,"七里探测争取主峰"],[2,126380319,126380319,"隐下绝望安排接应"],[3,126380319,126380319,"父亲背负升上寒空"],[4,126380319,126380319,"高空明悟再遭逆鳞"],[5,126380319,126380319,"兽神守运誓阻成神"],[6,126380319,126380319,"探峰撞屏急坠避圈"],[7,126380319,126380319,"雪域脱追归报新险"],[8,126380319,126380319,"天梦献策借兽神盾"],[9,126380320,126380320,"朝阳吐纳精魂再合"],[10,126380320,126380320,"改盗空探布下遥控"]]],["魂核明斗篇·第四幕 联杀狂牛夜抚旧伤",126380320,126380321,[[1,126380320,126380320,"银丝接管二十余探"],[2,126380320,126380320,"狂牛闻失探亲追"],[3,126380320,126380320,"贪取余探诱敌杀三"],[4,126380320,126380320,"雪女挡尖刀狂牛封退"],[5,126380320,126380320,"换位破网双友接应"],[6,126380320,126380320,"五女合势截住火牛"],[7,126380320,126380320,"八人合击诛狂牛"],[8,126380320,126380320,"留装备赠探器归营"],[9,126380320,126380320,"夜议战果令送样本"],[10,126380320,126380321,"一夜抚慰止住噬心"]]],["魂核明斗篇·第五幕 虎牙别弟潜明斗",126380321,126380323,[[1,126380321,126380321,"拾得方巾又燃希望"],[2,126380321,126380321,"获封子爵探网退缩"],[3,126380321,126380321,"败报入帐压住恐慌"],[4,126380321,126380321,"两策破局瞒险邀同伴"],[5,126380321,126380321,"临行托弟若不归"],[6,126380321,126380323,"两日静备虎牙相赠"],[7,126380323,126380323,"循波缝隙破屏潜峰"],[8,126380323,126380323,"舞桐潜随换位代劫"],[9,126380323,126380323,"半位面候门识后手"],[10,126380323,126380323,"逆鳞承怨绝处登山"]]],["魂核明斗篇·第六幕 死神压顶兽影退敌",126380323,126380504,[[1,126380323,126380323,"光门开封号入阵"],[2,126380323,126380323,"碎星护众巨槌毁阵"],[3,126380323,126380323,"圣剑净怨破土登顶"],[4,126380323,126380323,"血域压众死神现身"],[5,126380323,126380323,"报师暂获赦兽神迎战"],[6,126380323,126380323,"虚身惊退死神塔"],[7,126380323,126380323,"医仙引命护住断脉"],[8,126380323,126380324,"守夜清血医仙晋级"],[9,126380323,126380504,"破城取粮不占民土"],[10,126380324,126380325,"舞桐换护一夜安眠"]]],["魂核明斗篇·第七幕 险凝魂核被责独行",126380325,126380329,[[1,126380325,126380325,"苏醒接侯审视借力"],[2,126380325,126380325,"丹田旋魂险中收手"],[3,126380325,126380325,"刀枪互补暂寄命眼"],[4,126380325,126380325,"体外固漏自吸成形"],[5,126380325,126380325,"野试失控归帐认错"],[6,126380326,126380328,"康复辞营再尝烤鱼"],[7,126380326,126380326,"隐去兽神战事难问"],[8,126380328,126380328,"湖畔认巾留他希望"],[9,126380328,126380328,"玄老压外售先守城"],[10,126380329,126380329,"贝责独险筹成三团"]]],["魂核明斗篇·第八幕 情绪结核筹北行",126380329,126380511,[[1,126380329,126380329,"拒假恋约改探寒矿"],[2,126380329,126380412,"半月巧制低价炮弹"],[3,126380329,126380329,"傲天挡九级射线护未婚妻"],[4,126380330,126380330,"圣灵强索占城副职"],[5,126380412,126380412,"玄释魂核演空间"],[6,126380412,126380412,"天梦献本源固核成"],[7,126380412,126380412,"眉心融核留腹丹田"],[8,126380412,126380511,"月中静悟舞桐探望"],[9,126380428,126380428,"老天龙守城至死"],[10,126380511,126380511,"醒来误抱舞桐别离"]]],["冰原奇袭篇·第一幕 龙城采髓雪帝醒",126380511,126380513,[[1,126380511,126380512,"归门领托北赴龙城"],[2,126380512,126380512,"精神施压南倔受练"],[3,126380512,126380513,"探龙城识科技渗透"],[4,126380512,126380512,"帝后定科技稳占之策"],[5,126380513,126380513,"布店会母闻天龙殇"],[6,126380513,126380513,"寒泉开窟尽采神晶"],[7,126380513,126380513,"谢晶再潜极寒源头"],[8,126380513,126380513,"自由之议重定同行"],[9,126380513,126380513,"九髓凝冰雪帝醒来"],[10,126380513,126380513,"雪授温变诺破逆鳞"]]],["冰原奇袭篇·第二幕 试温变巧脱火凤",126380513,126380519,[[1,126380513,126380513,"假杀照出冰帝真情"],[2,126380513,126380513,"各吸余髓满载出窟"],[3,126380513,126380519,"七日串冰渣南守门"],[4,126380516,126380516,"诸老助轩凝核越封号"],[5,126380519,126380519,"潜火凤帅帐前止步"],[6,126380519,126380519,"联警突响温变破罩"],[7,126380519,126380519,"八角三技毁网脱追"],[8,126380519,126380519,"橘摔杯疑同一隐敌"],[9,126380519,126380519,"橘令搜敌护北行夺矿"],[10,126380519,126380519,"霍报脱围留南守店"]]],["冰原奇袭篇·第三幕 帅营拒战踏冰原",126380520,126380608,[[1,126380520,126380525,"远随北军看暖器行军"],[2,126380525,126380525,"摸柱探营反陷热探圈"],[3,126380525,126380525,"假戴禁铐换位挟橘"],[4,126380525,126380525,"背风私谈终不肯助战"],[5,126380525,126380526,"万人醉后橘独自离去"],[6,126380525,126380608,"橘扩矿营防史院援军"],[7,126380526,126380527,"高空巡矿终于识军图"],[8,126380527,126380529,"入核心落地慑熊传讯"],[9,126380529,126380529,"雪女舞罢传位阿泰"]]],["冰原奇袭篇·第四幕 传位聚兽雪袭矿",126380529,126400530,[[1,126380529,126380529,"认父定亲约白熊同行"],[2,126380529,126380531,"静悟极冰待两族交代"],[3,126380530,126380530,"天梦亲近后借析雪脱身"],[4,126380531,126380602,"两兽王领精锐回矿区"],[5,126380531,126400530,"双人制成两套冰极甲"],[6,126380531,126380702,"邪借魂灵骗海兽炼怨"],[7,126380601,126380601,"雪女谈帝天背后力量"],[8,126380602,126380602,"探明分层网再定夜袭"],[9,126380602,126380602,"小白高空蓄暴雪覆营"]]],["冰原奇袭篇·第五幕 毁矿潜都冰爆报复",126380602,126380609,[[1,126380602,126380602,"暴雪逼护营高空尽失"],[2,126380602,126380602,"空地牵制夺阵毁矿"],[3,126380602,126380602,"伤熊归营受令结善缘"],[4,126380603,126380607,"托南报矿携熊赴落日"],[5,126380607,126380607,"接走双熊惊得仙草赠礼"],[6,126380607,126380607,"隐身入城取肉供三熊"],[7,126380607,126380607,"先埋湖冰再扫宫图"],[8,126380607,126380607,"湖爆断腿隐枪杀追踪者"],[9,126380608,126380609,"橘让帐救兵留伏不发"]]],["冰原奇袭篇·第六幕 龙皇截路擒同伴",126380608,126380610,[[1,126380608,126380610,"修街不封城再谋诱擒"],[2,126380608,126380610,"贝托舞桐寻霍早归"],[3,126380610,126380610,"高空雪压宫诱魂圣离阵"],[4,126380610,126380610,"三重精神控制活冻敌圣"],[5,126380610,126380610,"龙皇现身争论助邪之罪"],[6,126380610,126380610,"挟舞移野八技逃门被断"],[7,126380610,126380610,"龙神血压敌二帝冰爆仍败"]]],["龙丹救雅篇·第一幕 九刀尽受借龙丹",126380610,126380710,[[1,126380610,126380610,"挟持舞桐强令五刀自伤"],[2,126380610,126380610,"黑刃之间诉王冬旧情"],[3,126380610,126380610,"九刀尽受濒危求解脱"],[4,126380610,126380610,"龙拔毒喂丹合拢九伤"],[5,126380610,126380616,"七日醒来无伤仍瞒九刀"],[6,126380611,126380710,"封忆骤醒闭关辨自我"],[7,126380612,126380612,"矿败归朝暂稳长补给线"],[8,126380612,126380612,"立储逼迫橘留宫生育"],[9,126380615,126380615,"天和遭杀橘交秘密材料"],[10,126380616,126380616,"假供奉控魂问讯触自爆"],[11,126380616,126380616,"请援救雅定传统魂师出战"],[12,126380616,126380616,"玄前说明雪灵与极北援军"],[13,126380616,126380616,"雪女解求死心结明共生"]]],["龙丹救雅篇·第二幕 制炮获准赴天灵",126380616,126380619,[[1,126380616,126380616,"河畔接白暂缓八环融合"],[2,126380616,126380616,"神晶难锻轩设八级出门考"],[3,126380616,126380618,"三日读分解炮先养精神"],[4,126380618,126380618,"冰针十八曲一夜成炮"],[5,126380618,126380618,"明言八十获准一月归"],[6,126380618,126380618,"十人赴天灵入堡休整"],[7,126380618,126380618,"维娜求国许爵霍不受"],[8,126380618,126380618,"宋授十人指挥先侦后战"],[9,126380618,126380618,"维娜请同行道本体重损"],[10,126380618,126380618,"四千米观五阵遇联攻"],[11,126380619,126380619,"分层诱探宋破假面控制"]]],["龙丹救雅篇·第三幕 扮邪寻雅炸二团",126380619,126380622,[[1,126380619,126380619,"置换假面锁毒活擒天蜈"],[2,126380619,126380619,"抽魂逼问天蜈交出雅踪"],[3,126380619,126380619,"借假面身份携全队潜入"],[4,126380619,126380619,"假报凤凰援敌蒙过钟离"],[5,126380619,126380619,"遣走药控侍女封帐报平安"],[6,126380620,126380620,"早餐见雅强压秋儿旧恨"],[7,126380620,126380621,"小精神体摸防再谋巡阵"],[8,126380622,126380622,"雅察亲切教主误作旧嫌"],[9,126380622,126380622,"巡第二阵受弹暗留分身"],[10,126380622,126380622,"帅帐置毁灭风暴全队待命"],[11,126380622,126380622,"九级内爆灭第二魂导团"]]],["龙丹救雅篇·第四幕 舍肩迎枪带雅还",126380622,126380625,[[1,126380622,126380622,"佯攻引走供奉屏帐待袭"],[2,126380622,126380622,"超斗破护白熊压邪群"],[3,126380622,126380622,"徐盾骂醒贝贝再接雅枪"],[4,126380622,126380622,"以肩迎枪抱回唐雅"],[5,126380622,126380622,"双老破围少哲断后"],[6,126380622,126380625,"金火失踪敌营空搜"],[7,126380622,126380622,"丹逼邪毒生命刃续命"],[8,126380622,126380623,"唐门共担悬赏护雅"],[9,126380625,126380625,"第四夜从原帐潜出"],[10,126380625,126380625,"天灵见少哲留报敌情"]]],["冬忆归一篇·第一幕 悬赏药源白熊渡劫",126380626,126381025,[[1,126380626,126380626,"归门发布蓝银皇悬赏"],[2,126380626,126380626,"毕业手续系上海神缘"],[3,126380626,126380626,"炉图受斥立留城师约"],[4,126380626,126380629,"师徒连研九级炉图"],[5,126380626,126381025,"雅忆渐归难止生命漏"],[6,126380629,126380629,"白逢雷劫霍挺身挡"],[7,126380629,126380629,"帝伤碎劫白成第五灵"],[8,126380629,126380629,"熊尸亡灵化仍通本灵"],[9,126380629,126380629,"向帝说明伊师遗界"]]],["冬忆归一篇·第二幕 四技重融认归人",126380629,126380629,[[1,126380629,126380629,"白衣归院遇后辈金沙"],[2,126380629,126380629,"旧同学护霍拒风纪刁难"],[3,126380629,126380629,"湖畔获告七人严考"],[4,126380629,126380629,"摘笠错认冬儿骤失落"],[5,126380629,126380629,"十六盏全留过场难逃"],[6,126380629,126380629,"乐萱公开修罗瞳功绩"],[7,126380629,126380629,"四女示爱霍守旧约"],[8,126380629,126380629,"思冬映空冰湖止挑战"],[9,126380629,126380629,"浩冬重融四技证归人"]]],["冬忆归一篇·第三幕 共修连情神谷留念",126380629,126380706,[[1,126380629,126380629,"舞桐讲明多段记忆"],[2,126380629,126380630,"许守舞桐相依迎晨"],[3,126380629,126380629,"见四融合连夜改严考"],[4,126380630,126380630,"三年毕业题重留修炼"],[5,126380630,126380630,"双战少哲失三绝悟真火"],[6,126380630,126380706,"七日爱融助舞忆归一"],[7,126380630,126380630,"引魂入神谷观九龙刀"],[8,126380630,126380630,"融念冰种下情绪神性"],[9,126380630,126380706,"留刃护雅三团续练"]]],["冬忆归一篇·第四幕 神刀成炉炼七丹",126380706,126381109,[[1,126380706,126380706,"归门烤鱼唤雅旧识"],[2,126380706,126380706,"九级炉改由霍主制"],[3,126380706,126380706,"神刀初用一日成炉壳"],[4,126380706,126380707,"亲近触父封印改共修"],[5,126380707,126380707,"轩盯核心霍半日读图"],[6,126380707,126380806,"十三核心成炉互授刀法"],[7,126380806,126380810,"五日普通丹试熟新炉"],[8,126380810,126381109,"三月合炼七枚造化丹"]]],["分丹蓄势篇·第一幕 分丹长修三团待发",126381109,126400605,[[1,126381109,126381109,"七丹不按七人平分"],[2,126381110,126381110,"化丹救过载双人晋八五"],[3,126381110,126400509,"一年半苦修霍滞舞封"],[4,126381110,126400509,"静战封边史城备三团"],[5,126381110,126400509,"一丹供三老玄越极限"],[6,126390223,126390322,"云瀚出生满月立储"],[7,126391209,126400508,"五个月造双超音速翼"],[8,126400306,126400605,"数月布边五团破联军"],[9,126400509,126400509,"新器理论通获半月空闲"],[10,126400509,126400509,"舞获阁席双人受借行"]]],["分丹蓄势篇·第二幕 十七强者潜明都",126400509,126400523,[[1,126400509,126400509,"玄授双核两途与禁急"],[2,126400509,126400517,"九日备行途议阴阳核"],[3,126400517,126400517,"明斗集强议灭帝潜入"],[4,126400517,126400517,"公爵私警霍不再追问"],[5,126400517,126400517,"毒劝天阳信隐侦内线"],[6,126400518,126400518,"十七人隐飞越边抵都郊"],[7,126400518,126400518,"绕城入都交权藏锋"],[8,126400518,126400518,"毒借本体秘典托传承"],[9,126400523,126400523,"帝后登台祭典启"],[10,126400523,126400523,"十弩佯轰超音脱网"]]],["分丹蓄势篇·第三幕 毒燃殒命掳子生争",126400523,126400524,[[1,126400523,126400523,"毒燃生命四超杀民"],[2,126400523,126400523,"叶拒援龙静候百万魂"],[3,126400523,126400523,"恐邪教收魂霍折返"],[4,126400523,126400523,"毒向龙道燃命四谋"],[5,126400523,126400523,"四柱挡核毒殒帝重伤"],[6,126400523,126400523,"接回强者方知掳婴"],[7,126400523,126400524,"帝弃储逼战橘生怨"],[8,126400523,126400523,"龙重伤仍守旧偿诺"],[9,126400523,126400523,"软粮安幼童护归明斗"]]],["分丹蓄势篇·第四幕 不索代价送子归宫",126400523,126400525,[[1,126400523,126400523,"护童异议碰国难筹码"],[2,126400523,126400523,"夜抱云瀚双人破围"],[3,126400524,126400524,"带子返宫不索代价"],[4,126400524,126400524,"重返明斗暗议敌后兵"],[5,126400524,126400525,"洛黎问亲霍暂后家事"],[6,126400524,126400524,"徐移永恒星域护太子"],[7,126400525,126400525,"橘迟报归子仍被留宫"],[8,126400525,126400525,"借半位面提敌后蛙跳"],[9,126400525,126400525,"二白护界诸老定奇兵"]]],["北海奇兵篇·第一幕 三团蛙跳北疆惊",126400528,126400529,[[1,126400528,126400528,"三团两千七百入九门"],[2,126400528,126400528,"明斗辞公主潜阵初震"],[3,126400528,126400528,"魂震连发尽杀阵内师"],[4,126400528,126400528,"清空探夺物不追逃兵"],[5,126400528,126400528,"橘令休整探网再前推"],[6,126400529,126400529,"自走台突奥克劫粮仓"],[7,126400529,126400529,"入东阳探屏即退锁定"],[8,126400529,126400529,"问冰海拟访海公主"],[9,126400529,126400529,"借旅馆布门定双线攻"],[10,126400529,126400529,"破罩先入惊现双邪斗"]]],["北海奇兵篇·第二幕 净东阳怨同门试技",126400529,126400531,[[1,126400529,126400529,"冰域留怨圣剑灭万魂"],[2,126400529,126400529,"解人鱼怨魂再净憎恶"],[3,126400529,126400530,"拆东阳七仓次午北撤"],[4,126400530,126400530,"萧争并肩和收护短心"],[5,126400530,126400530,"凤控诱剑移鼎封季"],[6,126400530,126400530,"霍舞斗技冰光两相持"],[7,126400530,126400530,"晨露冻枪戟环束霍"],[8,126400530,126400530,"舞责让胜吻触禁印"],[9,126400530,126400530,"叶净怨后闭关成天使斗罗"],[10,126400531,126400531,"午出海滨依雪言北飞"]]],["北海奇兵篇·第三幕 神影止杀人鱼为灵",126400531,126400531,[[1,126400531,126400531,"法螺禁空雪卷不杀象"],[2,126400531,126400531,"鲸刀夹击退路陷幻海"],[3,126400531,126400531,"免精神合击擒鱼上浮"],[4,126400531,126400531,"绝境三眼封神救舞出"],[5,126400531,126400531,"雪御冰甲高飞显真身"],[6,126400531,126400531,"海诉被骗雪证仍遭拒"],[7,126400531,126400531,"五灵御海霍醒舍身挡"],[8,126400531,126400531,"海神临世止杀净海怨"],[9,126400531,126400531,"母请救女金泪唤霍醒"],[10,126400531,126400531,"回朔见残魂冒险立约"],[11,126400531,126400531,"祝福认恩丽雅成六灵"]]],["北海奇兵篇·第四幕 海修南袭谋撼帝都",126400531,126400613,[[1,126400531,126400531,"五灵释旧缘舞明神技"],[2,126400531,126400609,"十日海修骨全暂缓凝核"],[3,126400531,126400609,"十日候门分赏稳军心"],[4,126400605,126400605,"徐令搜北急报天魂败"],[5,126400609,126400609,"归门认险隐飞换南疆"],[6,126400609,126400613,"南袭五日十二城搜财"],[7,126400612,126400612,"南警再至首相误判海路"],[8,126400612,126400612,"徐准皇家南下清奇兵"],[9,126400613,126400613,"议诱皇家离都威帝宫"]]],["北海奇兵篇·第五幕 丽歌清天太阿爆宫",126400613,126400615,[[1,126400613,126400613,"徐伤重示储君安压异心"],[2,126400613,126400613,"孔压叶威议空间报橘"],[3,126400614,126400615,"避港阵破天海搬沉银"],[4,126400615,126400615,"善融草木问得皇草踪"],[5,126400615,126400615,"目皇家甲群疾返都郊"],[6,126400615,126400615,"环都侦强阵议高空破眼"],[7,126400615,126400615,"冰甲暗贴空探丽歌复疲"],[8,126400615,126400615,"鱼唱倍咒十八门清天眼"],[9,126400615,126400615,"三轮压阵太阿钻宫爆"],[10,126400615,126400615,"置换借神针合杀九级师"],[11,126400615,126400615,"导引返炮护二百人远撤"]]],["北海奇兵篇·第六幕 草木引路皇草愿随",126400615,126400617,[[1,126400615,126400615,"橘读帝信六供奉拥统帅"],[2,126400615,126400615,"大军前移烟字限交霍"],[3,126400615,126400615,"徐赞不攻回信全权给橘"],[4,126400615,126400616,"两团五万暗撤留空帐"],[5,126400616,126400616,"复盘惜弹贝止返都侦"],[6,126400616,126400617,"共享草木一夜绕行寻谷"],[7,126400617,126400617,"幸运安草谷秋魂慰霍心"],[8,126400617,126400617,"秋慰归魂皇草愿随行"]]],["双核围城篇·第一幕 皇草醒雅六灵凝核",126400617,126400617,[[1,126400617,126400617,"归门知国灭急上阁问局"],[2,126400617,126400617,"阁前报奇袭仍守界秘密"],[3,126400617,126400617,"识围城阳谋仍须备援"],[4,126400617,126400617,"舞振单兵心分使守两国"],[5,126400617,126400617,"皇脉唤雅武魂贝携信行"],[6,126400617,126400617,"轩议穿刺弹揭孔师旧缘"],[7,126400617,126400617,"胸核留丹田六灵共担险"],[8,126400617,126400617,"抽魂临储逆冰种胸核"],[9,126400617,126400617,"仙索三团玄亲守闭关门"],[10,126400617,126400617,"龙丹醒血穆灵扶双核"],[11,126400617,126400617,"穆魂终散玄忍声守门"],[12,126400617,126400617,"橘拒钟催攻暗谋除圣教"],[13,126400617,126400617,"雪灵化丝冰核骤成形"]]],["双核围城篇·第二幕 双核迎帝夜问橘诺",126400617,126400617,[[1,126400617,126400617,"帝失逆鳞强索霍遭玄阻"],[2,126400617,126400617,"玄借大地仍遭黑龙剑压"],[3,126400617,126400617,"橘以帝尸诱圣灵涉险"],[4,126400617,126400617,"玄燃饕餮帝借七彩威"],[5,126400617,126400617,"双核出关退鳞邀兽神"],[6,126400617,126400617,"晨露迎剑转向日月营"],[7,126400617,126400617,"冰暗龙卷吞两阵五万兵"],[8,126400617,126400617,"橘射兽神钟借怨矛追杀"],[9,126400617,126400617,"返阁疗伤议夜探敌营"],[10,126400617,126400617,"橘撤屏被带亡灵半位面"],[11,126400617,126400617,"囚帅反被杀徐十年约困"],[12,126400617,126400617,"送橘返营放三团迎舞归"]]],["斗灵救亡篇·第一幕 斩首惊城远炮耗敌",126400617,126400618,[[1,126400617,126400617,"别贝雅携六人急赴斗灵"],[2,126400617,126400617,"学院向三国来援开放底蕴"],[3,126400618,126400618,"十二阵逼近两国援到史"],[4,126400618,126400618,"悟斩首夺五十人后方阵"],[5,126400618,126400618,"宫毁七斗死霍截两百敌"],[6,126400618,126400618,"心灵风暴杀敌未破金罩"],[7,126400618,126400618,"五人借夺阵吓退两器团"],[8,126400618,126400618,"徐亮皇坠调城兵救乱"],[9,126400618,126400618,"远炮反复消耗敌护罩"],[10,126400618,126400618,"九级分解穿罩杀皇龙员"]]],["斗灵救亡篇·第二幕 亡灵嫁祸徐摄斗灵",126400618,126400618,[[1,126400618,126400618,"敌林密防设饵霍改阳谋"],[2,126400618,126400618,"亡灵露面两团误认圣教"],[3,126400618,126400618,"重炮碎亡灵魂火仍返门"],[4,126400618,126400618,"复尸乱军亲王射杀逃兵"],[5,126400618,126400618,"暖罩藏极寒冰爆杀七十"],[6,126400618,126400618,"伪伤员近身冻杀徐天元"],[7,126400618,126400618,"伪控引夏杀同袍留仇军"],[8,126400618,126400618,"返城听宫中皇族覆灭"],[9,126400618,126400618,"徐向群臣说明公主血亲"],[10,126400618,126400618,"双证稳群臣徐暂任摄政"]]],["斗灵救亡篇·第三幕 逼教十战魂灭乌云",126400618,126400717,[[1,126400618,126400618,"追兽失败圣灵折众返营"],[2,126400618,126400717,"摄政月余精锐观望两军叛"],[3,126400619,126400619,"黎明阁报斗灵斩首惨局"],[4,126400619,126400619,"请辞未获宿老许做后盾"],[5,126400619,126400619,"归门定奇计舞坚持观战"],[6,126400619,126400619,"橘压军教怒火识出嫁祸"],[7,126400619,126400619,"虚影叫阵抛名誉逼日月"],[8,126400619,126400619,"二白晨露引圣灵接十战"],[9,126400619,126400619,"钟争二白签败受军法状"],[10,126400619,126400619,"魂击离体双核爆灭乌云"]]],["斗灵救亡篇·第四幕 救桃净龙冰爆斩廖",126400619,126400619,[[1,126400619,126400619,"九级拒借高价卖防精神器"],[2,126400619,126400619,"冻邪凤碎项链移瞳生擒"],[3,126400619,126400619,"放凤换对阵九环小桃"],[4,126400619,126400619,"不伤姐以风雪慢耗极火"],[5,126400619,126400619,"涅槃吞霍黑门先夺姐姐"],[6,126400619,126400619,"弱乱破脱壳冻住张鹏核"],[7,126400619,126400619,"风困磨空间反涡散龙卷"],[8,126400619,126400619,"晨露逐斩风火星破热身"],[9,126400619,126400619,"忍镰真伤置换净化骨龙"],[10,126400619,126400619,"龙雩裂空廖燃刀穿肩"],[11,126400619,126400619,"拔刀逼魂冰爆廖夺六胜"]]],["斗灵救亡篇·第五幕 魔傀伤舞昊天求救",126400619,126400706,[[1,126400619,126400619,"二白诱苏鬼刀穿头退军"],[2,126400619,126400619,"舞挡魔傀伤霍悲拳碎敌"],[3,126400619,126400619,"唐三放气息让融继承霍"],[4,126400619,126400621,"残军火拼圣教橘担罪托孤"],[5,126400622,126400622,"三日醒知舞危交十五弹"],[6,126400622,126400622,"界内火乱六时辰净桃邪"],[7,126400622,126400622,"炽胶净火小桃哭返家园"],[8,126400622,126400622,"留信携舞离院桃代扛责"],[9,126400622,126400706,"交舞昊天跪候十五日"]]],["斗灵救亡篇·第六幕 阴阳双核定斗灵",126400706,126400716,[[1,126400706,126400706,"闻损核风险霍仍求救舞"],[2,126400706,126400707,"映九成精神助舞凝双核"],[3,126400707,126400715,"两神引反馈九日双核运"],[4,126400715,126400715,"六灵醒浩冬重合双升超斗"],[5,126400715,126400716,"相守一日后再赴斗灵"],[6,126400716,126400716,"锤杀外九级换入冻群敌"],[7,126400716,126400716,"徐借霍威处死谋反父子"],[8,126400716,126400716,"摄政摘冠交母七人离城"],[9,126400716,126400716,"叶借切磋释怀众人分道"]]],["灭圣灵篇·第一幕 逼红尘问军见谷袭",126400716,126400718,[[1,126400716,126400718,"沿境寻军无踪转探天斗"],[2,126400717,126400717,"母劝断乱楠许未来子嗣"],[3,126400717,126400717,"神光破隐五斗围殿逼杀"],[4,126400717,126400717,"叶十秒神降合众突围"],[5,126400717,126400717,"外炮封出口唐门列阵死守"],[6,126400718,126400718,"红尘失势霍冻笑逼军报"],[7,126400718,126400718,"镜向孙言家族要乱求位"],[8,126400718,126400718,"定杀徐方向侦谷候补军"],[9,126400718,126400718,"帝延罪令进攻谷阵遭首袭"],[10,126400718,126400718,"双极限攻防破阵杀六十七"]]],["灭圣灵篇·第二幕 联血催军入火凤",126400718,126400726,[[1,126400718,126400718,"龙劝叶停杀赠晶约九八"],[2,126400718,126400720,"静融幻彩涡洞中速恢复"],[3,126400720,126400720,"截补军千余尽死物资夺"],[4,126400720,126400720,"橘借千死血书共将回师"],[5,126400720,126400720,"凤辇议刺徐约入火凤"],[6,126400720,126400720,"徐受血书令暗影查圣灵"],[7,126400720,126400720,"徐返闻贝雅封号仍先报院"],[8,126400721,126400725,"女甲亲卫随军抵边"],[9,126400725,126400725,"河鱼明情金印禁秘"],[10,126400725,126400726,"返都迎后帅印未收"]]],["灭圣灵篇·第三幕 龙叶传功终散尽",126400727,126400731,[[1,126400727,126400727,"迁教避祸龙留共担"],[2,126400727,126400731,"候令谈婚宫险改道"],[3,126400731,126400731,"烤店听龙澄清旧情"],[4,126400731,126400731,"真退让落入围杀局"],[5,126400731,126400731,"血魂换命连杀九级"],[6,126400731,126400731,"龙入宫十弹同爆"],[7,126400731,126400731,"返爆宫雪雾救二老"],[8,126400731,126400731,"临终吐露双龙骗局"],[9,126400731,126400731,"双传纯力同达九八"],[10,126400731,126400731,"移核封晶奠三核基"],[11,126400731,126400731,"双老散尽托灭圣灵"],[12,126400731,126400731,"帝惧未亡再令整军"]]],["灭圣灵篇·第四幕 太阿灭教斩邪眼",126400731,126400802,[[1,126400731,126400731,"太阿破罩炸毁总部"],[2,126400731,126400731,"五灵封雪清尽余众"],[3,126400731,126400731,"黄金凋零凤钟身亡"],[4,126400731,126400731,"升空抗邪双核受压"],[5,126400731,126400731,"三免破瞳冰爆斩邪"],[6,126400731,126400802,"天梦储能三日融环"]]],["灭圣灵篇·第五幕 刺帝暗海反控邪魂",126400802,126400911,[[1,126400802,126400802,"议乱局隐入临宫"],[2,126400802,126400802,"密令设宴约今夜袭"],[3,126400802,126400802,"冰酒入腹双震破防"],[4,126400802,126400802,"心暴破宴帝皇毙命"],[5,126400802,126400802,"劝止灭口促约急离"],[6,126400802,126400802,"魂暴迫降邪魂现形"],[7,126400802,126400911,"冰燃稳核暗海待变"],[8,126400802,126400901,"拥幼帝垂帘生违意"],[9,126400911,126400911,"情绪反控雪燃灭邪"]]],["三核靖世篇·第一幕 三年三核战围星罗",126400911,126431207,[[1,126400911,126430910,"三年易核双成三核"],[2,126410610,126410610,"耗寿增神驾皇家甲"],[3,126410910,126411009,"突斗灵牵星两线开"],[4,126411010,126420409,"北矿供研光能成储"],[5,126411109,126411109,"三口破明斗星军退"],[6,126420606,126430905,"专研干扰破同频"],[7,126421109,126421208,"佯攻星罗皇家灭斗"],[8,126421208,126431207,"三面蚕地围尽星城"],[9,126430906,126430906,"开门求生反遭围胁"],[10,126430909,126430909,"干扰九弹首战大捷"],[11,126430910,126430910,"混弹突阵银月困军"]]],["三核靖世篇·第二幕 换父灭军揭亲休战",126430910,126430910,[[1,126430910,126430910,"八斗护军双线受挫"],[2,126430910,126430910,"托三子赴死声断剑"],[3,126430910,126430910,"换父碎罩冰镜折光"],[4,126430910,126430910,"情绪叠震皇家尽灭"],[5,126430910,126430910,"屠城相胁抓帝为质"],[6,126430910,126430910,"当众认父也认旧仇"],[7,126430910,126430910,"留质揭父神临携舞"],[8,126430910,126430910,"三眼证亲归子撤军"],[9,126430910,126430910,"归城求离姐承院责"],[10,126430910,126430910,"许以死逼戴受禅"]]],["情绪神位篇·第一幕 墓前释恨败兽升神",126430910,126430911,[[1,126430910,126430910,"墓前追债终放旧恨"],[2,126430910,126430911,"拜母别友再赴兽神"],[3,126430910,126430910,"循魂复母留额接父"],[4,126430911,126430911,"万米对峙金阳黑日"],[5,126430911,126430911,"龙爪速压晨露破局"],[6,126430911,126430911,"时空飞刀胜而留命"],[7,126430911,126430911,"主上许期帝仍守林"],[8,126430911,126430911,"融明岳父重择仍守诺"],[9,126430911,126430911,"七情贯体承位升神"],[10,126430911,126430911,"新神求见却遭拒"],[11,126430911,126430911,"冰怒破网林中求路"]]],["情绪神位篇·第二幕 七情破考团聚天斗",126430911,126440710,[[1,126430911,126430911,"拒改母姓惊见亲娘"],[2,126430911,126430911,"母子释怀认祖再求见"],[3,126430911,126430911,"命运反伤雷下受困"],[4,126430911,126430911,"七情归爱破无定环"],[5,126430911,126430911,"明谋释疑金路许见"],[6,126430911,126430911,"留神三十共防灾变"],[7,126430911,126430911,"寻到爱人笑认丈夫"],[8,126431010,126431010,"戴登帝位院门易职"],[9,126440110,126440110,"撤尽星境交还明斗"],[10,126440710,126440710,"日月更名天斗复局"]]]]},{"名":"神界","前史篇":"神界传说前史篇","前史":[["神界传说前史篇·第一幕 乱流创界龙神封禁",-9773749899,-44999899,[[1,-9773749899,-9773749899,"远古乱流重创神界"],[2,-49999899,-49999899,"五王斩龙金王封禁"],[3,-44999899,-44999899,"土神诛雷残裔栖林"]]],["神界传说前史篇·第二幕 兔王旧忆星斗童年",-479999899,26250101,[[1,-479999899,-479999899,"小五成婚星斗安家"],[2,25350101,25450101,"幼兔贪玩结伴双兽"],[3,26250101,26250101,"父闯核心母寻不归"]]],["神界传说前史篇·第三幕 神王更迭师徒传位",26650101,126450101,[[1,26650101,26650101,"双神飞升执掌神枢"],[2,126200101,126200101,"双王赌约传位新主"],[3,126450101,126450101,"念冰传位雨浩安家"]]],["神界传说前史篇·第四幕 暗棋潜伏一年立约",150000101,223850101,[[1,150000101,150000101,"破坏拒招暗作制衡"],[2,222650101,222650101,"大劫预感立一年约"],[3,223850101,223850101,"小舞再度怀胎神界"]]]],"正篇":[["神枢暗涌篇·第一幕 委员争执麟儿喜讯",224450101,224451231,[[1,224450101,224450101,"委员议政生命贺喜"],[2,224450301,224450301,"紫绿谈心怨念暗生"],[3,224450601,224451231,"归家探孕赐名舞麟"]]],["神枢暗涌篇·第二幕 古堡密谋半年静默",224460101,226250715,[[1,224460101,224460101,"毁灭城堡密召八神"],[2,224460102,226250714,"半年静默悉心护胎"],[3,226250715,226250715,"幽谷设伏九宝亮塔"]]],["神枢暗涌篇·第三幕 原罪突袭诸神受困",226250715,226250716,[[1,226250715,226250715,"贪食吞山食彩被擒"],[2,226250715,226250715,"痴念破魅双罪擒凤"],[3,226250716,226250716,"木屋家宴四罪临门"]]],["神枢暗涌篇·第四幕 白虎破封交钥护妻",226250716,226250716,[[1,226250716,226250716,"白虎撞界金路突围"],[2,226250716,226250716,"挟妻逼宫交出神钥"]]],["神禁求援篇·第一幕 神枢扩张潜入禁地",226250717,226250717,[[1,226250717,226250717,"毁灭掌枢筹备扩界"],[2,226250717,226250717,"隐身潜林金枪救怪"]]],["神禁求援篇·第二幕 冰火破障父女重逢",226250717,226250717,[[1,226250717,226250717,"遭遇雷龙双帝冻空"],[2,226250717,226250717,"禁地团聚授珠托计"]]],["神禁求援篇·第三幕 修罗醒神师尊出山",226250717,226250717,[[1,226250717,226250717,"杀心通明师尊应援"],[2,226250717,226250717,"百柱冲霄神界强扩"]]],["神禁求援篇·第四幕 生命垂泪元素归心",226250717,226250717,[[1,226250717,226250717,"智激女神古树染红"],[2,226250717,226250717,"元素驰援净林合兵"]]],["古堡神战篇·第一幕 古堡对峙夫妻决裂",226250718,226250718,[[1,226250718,226250718,"古堡问罪亮生命种"],[2,226250718,226250718,"自毁相胁众神开战"]]],["古堡神战篇·第二幕 原罪神罚化铠死战",226250718,226250718,[[1,226250718,226250718,"蝶神化铠硬撼双罪"],[2,226250718,226250718,"神罚大阵七曜碎刀"]]],["古堡神战篇·第三幕 浩冬三绝燃魂一击",226250718,226250718,[[1,226250718,226250718,"独挑神王浩冬三绝"],[2,226250718,226250718,"燃烧神火女神救命"]]],["古堡神战篇·第四幕 往事温存麟儿破封",226250718,226250718,[[1,226250718,226250718,"囚室述旧麟儿降生"],[2,226250718,226250718,"修罗破封诸神脱困"]]],["七怪决胜篇·第一幕 七怪重聚生命祝福",226250718,226250718,[[1,226250718,226250718,"生命赐福七怪列阵"],[2,226250718,226250718,"定约赌战九宝耀世"]]],["七怪决胜篇·第二幕 修罗血剑食神惊世",226250718,226250718,[[1,226250718,226250718,"双斩血剑食神复制"],[2,226250718,226250718,"心灵风暴女神叹息"]]],["七怪决胜篇·第三幕 海神镇敌破坏反水",226250718,226250718,[[1,226250718,226250718,"三叉镇妒破坏倒戈"],[2,226250718,226250718,"九宝合一飞刀定胜"]]],["七怪决胜篇·第四幕 灰点成劫众神同舟",226250718,226250719,[[1,226250718,226250718,"揭明卧底宽宥诸神"],[2,226250719,226250719,"灰点骤临决意留守"]]],["创世送子篇·第一幕 双王归源创世护界",226250719,226250719,[[1,226250719,226250719,"毁灭生命融化创世"],[2,226250719,226250719,"众神立誓硬撼乱流"]]],["创世送子篇·第二幕 金龙破茧修罗诱敌",226250719,226250719,[[1,226250719,226250719,"金龙破茧血晶报警"],[2,226250719,226250719,"修罗伴败激将引龙"]]],["创世送子篇·第三幕 三界审判神核灌婴",226250719,226250719,[[1,226250719,226250719,"三界审判剑斩金龙"],[2,226250719,226250719,"临死反扑神核入婴"]]],["创世送子篇·第四幕 十八血封神界远遁",226250719,226250719,[[1,226250719,226250719,"神血十八封送子下界"],[2,226250719,226250719,"乱流卷界银龙微醒"]]]]},{"名":"英雄","前史篇":"英雄传前史篇","前史":[["英雄传前史篇·第一幕 诸界成神各掌乾坤",-499999899,150000101,[[1,-499999899,-149999899,"圣剑诛妖仙狂证道"],[2,-139999899,50000101,"死神历劫琴星创界"],[3,50010101,150000101,"魔厨善恶大力归神"]]],["英雄传前史篇·第二幕 乱流席卷黑洞葬神",225000101,226000101,[[1,225000101,225400101,"神星剧变挚友祭界"],[2,225410101,225600101,"神冥献祭死神独存"],[3,225610101,226000101,"黑洞吞界古迹遗方"]]],["英雄传前史篇·第三幕 六王同盟定神成阵",226010101,226250701,[[1,226010101,226150101,"天痕演算吞残筑阵"],[2,226160101,226220101,"圣柱为始琴韵调枢"],[3,226230101,226250701,"大爆破局主导难决"]]],["英雄传前史篇·第四幕 斗罗远遁神枢苦撑",226250718,226250719,[[1,226250718,226250719,"破坏反水双王化种"],[2,226250719,226250719,"血封麟儿留识下界"],[3,226250719,226250719,"乱流卷界六神护枢"]]]],"正篇":[["黑洞定神篇·第一幕 思子心悸泣血脱流",226461001,226461205,[[1,226461001,226461015,"小舞思子神枢渐稳"],[2,226461016,226461204,"喷血撞壁挣脱乱流"],[3,226461205,226461205,"能量骤耗惊陷黑洞"]]],["黑洞定神篇·第二幕 分神探墓竹院会帝",226461206,226461212,[[1,226461206,226461208,"异界神识分神入阵"],[2,226461209,226461210,"竹院晤琴仙帝试威"],[3,226461211,226461212,"狂神施压归界动员"]]],["黑洞定神篇·第三幕 敛息藏锋引界入阵",226461213,226461219,[[1,226461213,226461215,"光明固柱众神藏锋"],[2,226461216,226461218,"圣剑牵桥双界互拽"],[3,226461219,226461219,"九彩补阵持戟现身"]]],["黑洞定神篇·第四幕 折冲樽俎以一敌六",226461220,226461225,[[1,226461220,226461221,"碰撞奇谋拒散众神"],[2,226461222,226461223,"质器立制独挑六界"],[3,226461224,226461225,"古迹定约三日备战"]]],["跨界认子篇·第一幕 奇兵替补仙宫惧内",226461226,226470103,[[1,226461226,226461228,"唐三藏拙雨浩首发"],[2,226461229,226461231,"光明交底钦点天痕"],[3,226470101,226470103,"梦云天琴群殴仙帝"]]],["跨界认子篇·第二幕 死神解结魔厨亮刃",226470104,226470112,[[1,226470104,226470106,"玄月揭秘父母苦心"],[2,226470107,226470109,"木屋谈心翁婿情深"],[3,226470110,226470112,"七刀烹鲜洛柔献策"]]],["跨界认子篇·第三幕 狂天备战跨界认子",226470113,226470119,[[1,226470113,226470118,"狂神抒怀天痕验算"],[2,226470119,226470119,"乾坤呼唤跨界认父"],[3,226470119,226470119,"接引养亲小舞焕生"]]],["跨界认子篇·第四幕 神眷云集古迹定规",226470120,226470120,[[1,226470120,226470120,"众妻聚首天琴授术"],[2,226470120,226470120,"斗罗亮阵小舞慑众"],[3,226470120,226470120,"勘察引力三路立规"]]],["古迹争锋篇·第一幕 八指禁空七曜初鸣",226470121,226470228,[[1,226470121,226470131,"设塔置珠灵眸探敌"],[2,226470201,226470214,"八指禁空双火合击"],[3,226470215,226470228,"紫帝护主七曜反制"]]],["古迹争锋篇·第二幕 死光拒敌圣剑救场",226470301,226470410,[[1,226470301,226470315,"春雷扰识死光退仙"],[2,226470316,226470331,"徒手夺箭血剑斩天"],[3,226470401,226470410,"圣剑换人九塔成阵"]]],["古迹争锋篇·第三幕 神识震场善恶同生",226470411,226470520,[[1,226470411,226470425,"孤身诱敌凤曲忆妻"],[2,226470426,226470508,"冥王附体血翼破塔"],[3,226470509,226470520,"轮回触逆同生共死"]]],["古迹争锋篇·第四幕 英魂对垒两极破阵",226470521,226470630,[[1,226470521,226470602,"圣剑灭世移形换位"],[2,226470603,226470616,"英魂开路佯败诱敌"],[3,226470617,226470630,"两极爆裂琴紫出局"]]],["七曜破局篇·第一幕 神爪控场双锤奇袭",226470701,226470831,[[1,226470701,226470720,"弃塔巧退双控惊琴"],[2,226470721,226470810,"魔箭裂空神爪迟钝"],[3,226470811,226470831,"虚实双锤邪钩剧毒"]]],["七曜破局篇·第二幕 七曜咏叹仁心救敌",226470901,226471031,[[1,226470901,226470920,"百身吟咒燃命应战"],[2,226470921,226471010,"强送善恶极招对撞"],[3,226471011,226471031,"弃胜施援修罗耗尽"]]],["七曜破局篇·第三幕 神戟归手独战三王",226471101,226471228,[[1,226471101,226471227,"绝境重立小舞呐喊"],[2,226471228,226471228,"神戟重归白云送呆"],[3,226471228,226471228,"巧借乾坤反淘汰狂"]]],["七曜破局篇·第四幕 舍利问心还戟麟儿",226471228,226471228,[[1,226471228,226471228,"仙帝诈退携珠自败"],[2,226471228,226471228,"舍利问心一生无愧"],[3,226471228,226471228,"心病顿消遥还神戟"]]],["混沌创圈篇·第一幕 七界交心诀别备战",226480101,226480531,[[1,226480101,226480215,"十二共议靶点新谋"],[2,226480216,226480415,"六界迁枢诸王话别"],[3,226480416,226480531,"鬼雕暗备十二聚齐"]]],["混沌创圈篇·第二幕 诸界对撞同心挽枢",226480601,226480802,[[1,226480601,226480630,"破阵助推七界对撞"],[2,226480701,226480720,"五枢先归众王助呆"],[3,226480721,226480802,"双禁轰点初辟星隙"]]],["混沌创圈篇·第三幕 蛛矛锁枢众王创世",226480803,226480905,[[1,226480803,226480815,"燃情扩道蛛矛锁枢"],[2,226480816,226480825,"鬼雕断吸全员留驻"],[3,226480826,226480905,"七枢归一联手创世"]]],["混沌创圈篇·第四幕 永恒开眸千载寻麟",226480906,260000101,[[1,226480906,226501231,"神圈初立众王归家"],[2,226510101,259991231,"永恒开眸跨星寻子"],[3,260000101,260000101,"扭曲千载脆鸣重逢"]]]]},{"名":"斗3","前史篇":"龙王传说前史篇","前史":[["龙王传说前史篇·第一幕 龙神裂界诸族离散",-199999899,-39999899,[[1,-199999899,-199999899,"山龙化陆失自由得王封"],[2,-99999899,-97008769,"智狒叛猿两族俱衰"],[3,-59999899,-59998769,"翠鸟猎龙招来围剿"],[4,-50999899,-50999899,"龙角化刀斥退夜叉"],[5,-49999899,-49999899,"兽神争界战败裂金银"],[6,-39999899,-39999899,"刑刀醒血救义士生"]]],["龙王传说前史篇·第二幕 海神留泽深渊兴起",16560101,106310101,[[1,16560101,16560101,"幼鲸藏船同逃虎鲨"],[2,26560101,26560101,"鲸王留珠送妻女避祸"],[3,26580101,26580101,"建海神岛移树唤树灵"],[4,26580101,26580101,"海神令兽深海保群"],[5,26580101,26580101,"神界造盔赠族护海"],[6,63460114,63560113,"吞能造族匿宇宙暗面"],[7,63560114,63560114,"得裂渊戟诸领臣服"],[8,86310101,86310101,"碰陆闻神意止干涉"],[9,106310101,106310101,"海难求生启本体"]]],["龙王传说前史篇·第三幕 双王造界两国迁陆",126310101,126551231,[[1,126310101,126310101,"受托下界暗护舞桐"],[2,126310101,126310101,"留祖护子引渊作补"],[3,126440101,126440101,"外城扩建旧城成院"],[4,126440101,126440101,"留恋人间小界筑居"],[5,126450101,126451231,"天斗残部渡海占新陆"],[6,126460101,126551231,"星罗迁陆日月统故土"]]],["龙王传说前史篇·第四幕 封渊立军暗筑城基",163460114,226460808,[[1,163460114,163470113,"合军退渊封道建守"],[2,163560114,163570113,"久战识魔携晶防附"],[3,166460504,166460504,"学院弃席守住中立"],[4,196450612,196450612,"深层筑所预防重炮"],[5,196450617,199450616,"败战订约长筑困兽"],[6,196460809,226460808,"三千年共筑地底城"]]],["龙王传说前史篇·第五幕 孤岛旧缘异族迁居",216441230,216490205,[[1,216441230,216441230,"七怪探岛失身留魂"],[2,216470714,216470714,"采菌少女馈食小猴"],[3,216470813,216470815,"陨石毁家巨猿救孤"],[4,216470813,216470912,"木屋留字误别毁家"],[5,216470918,216470918,"六日归屋独育思泰"],[6,216480105,216480105,"诸族合力造七神珠"],[7,216490105,216490105,"双星碰撞裂界失乡"],[8,216490205,216490205,"寻浆续命约守火狱"]]],["龙王传说前史篇·第六幕 冥域恶童双凤情隙",225120217,225471202,[[1,225120217,225180217,"弃婴觉冥域屠孤院"],[2,225180217,225180224,"城防埋尸七日复生"],[3,225180225,225370224,"隐杀海村屠城越境"],[4,225200910,225320909,"双凤同长继位生隙"],[5,225271203,225471202,"不甘逊弟远走求变"],[6,225280826,225280826,"觉魂仍留救贫者"],[7,225370225,225470224,"三极合杀仍留冥患"],[8,225390104,225390104,"龙血入墨留威考心"]]],["龙王传说前史篇·第七幕 擎天成名圣灵济世",225420910,225540909,[[1,225420910,225540909,"少年越境终临准神"],[2,225430826,225440909,"燃命救疫信仰归"],[3,225430910,225430910,"一抱误见求爱成怨"],[4,225440909,225440909,"姐妹慕云终各伤别"],[5,225440910,225441009,"十六连胜诺护妻"],[6,225440910,225440910,"光暗掌掴塔主险起大战"],[7,225441230,225441230,"两怪陨落引学院严厉报复"],[8,225460114,225470113,"改测斩皇止住潜灾"]]],["龙王传说前史篇·第八幕 百年错爱守侣不改",225461114,225640910,[[1,225461114,225461114,"倔强错爱旧侣分离"],[2,225461115,225461115,"迟赴婚宴独咽旧情"],[3,225461215,225461215,"旧日海神缘光暗结伴"],[4,225461216,225561215,"闻婚十载闭关登极"],[5,225470220,225470220,"冰火仙草毁险藤"],[6,225471202,225471202,"返家胜弟再弃塔职"],[7,225471207,225471207,"提炼聚变造弹后封研"],[8,225481202,225481202,"遇寒韵定情越极限"],[9,225640910,225640910,"劝添妻传后云冥拒分心"]]],["龙王传说前史篇·第九幕 双龙竞艺双剑分途",225690106,226460201,[[1,225690106,225690106,"双龙竞逐立下匠誓"],[2,225701212,225701229,"十八日守门破格入怪物"],[3,225701229,226051228,"晚成院长独炼四字甲"],[4,225770220,225770220,"家资求得幽冥本命"],[5,225770715,225960714,"遍陆求道晋极限"],[6,225850823,226460201,"长守雪岭由兵领军"],[7,225860122,225860122,"双剑初合翻败退鬼"],[8,225860123,226460122,"接位血一八探深渊"],[9,225860123,225860123,"剑情相斥赴营远别"]]],["龙王传说前史篇·第十幕 麒麟求强血魔噬魂",225870118,226480802,[[1,225870118,225940117,"慕幼友苦追失分寸"],[2,225890106,226090105,"工读成匠破格入院"],[3,225940118,225970117,"毒后麒麟醒怪院收"],[4,225950612,225950612,"擎天压棍留惧延晋"],[5,225961114,225961116,"天海平战冲界终无路"],[6,225980803,225980803,"受恩离院枪心不改"],[7,225980803,226480802,"积修留法候刹那神境"],[8,225990715,226010714,"晚婚得子承族位"],[9,226020118,226100117,"八年越境旧恨不消"],[10,226030803,226480802,"噬魂成瘾童子投邪"]]],["龙王传说前史篇·第十一幕 寻母报仇遗祸三代",226060411,226470220,[[1,226060411,226460410,"天使整军精兵固南"],[2,226060715,226200714,"满魂幼子养为嗣"],[3,226070118,226100117,"寻子断腿盼归三载"],[4,226070119,226070119,"除血魔未绝血咒"],[5,226070410,226130409,"法刀凝孤儿六岁觉醒"],[6,226070626,226070626,"余家资锻结交震华"],[7,226080220,226470219,"机甲伴幼年成帝柱"],[8,226100118,226100221,"归迟三日母逝查仇"],[9,226100221,226100221,"报母仇断腿致死投案"],[10,226100221,226470220,"惜才免死囚守三十七载"],[11,226100222,226100222,"迫迁避仇反断音讯"]]],["龙王传说前史篇·第十二幕 军旅求变匠道成名",226100226,226450611,[[1,226100226,226270225,"隐名从军功成夺嫡"],[2,226100904,226101001,"牧野受极训二觉"],[3,226120214,226120214,"失恋离宗改入唐门"],[4,226120626,226310625,"千试天锻终成神匠"],[5,226130103,226130103,"云游拾孤收归门下"],[6,226140109,226140109,"同道旧友各择所爱"],[7,226141204,226341203,"先供兄长弟迟魂走歪路"],[8,226150612,226450611,"探神数十年初凝位"],[9,226161115,226401114,"枫林苦练夺黑甲"],[10,226170114,226170114,"圣歌临难救李全家"]]],["龙王传说前史篇·第十三幕 魂灵受缚家事渐起",226170220,226471201,[[1,226170220,226170220,"十一强者擒雷藤立约"],[2,226170220,226470219,"封修违诺雷藤待机"],[3,226171202,226171202,"受塔资助结缘任教"],[4,226171202,226171202,"魅惑戏人遭斥退职"],[5,226180105,226180105,"师兄点悟闭室专枪"],[6,226200103,226260102,"奉命入学冷心生情"],[7,226200713,226200713,"分裂魔种投向斗罗"],[8,226200714,226220113,"游历未满携爱归"],[9,226220113,226250112,"魔变受阻守恋成婚"],[10,226221202,226471201,"独角双子受资成封"],[11,226230719,226230719,"药物事故断育望"]]],["龙王传说前史篇·第十四幕 神界送子傲来收养",226240719,226310111,[[1,226240719,226250718,"设计招控携妻避傲来"],[2,226241207,226241207,"首代源阵失控丧亲"],[3,226250103,226250103,"龙冰相伴享家常"],[4,226250112,226310111,"守护成道家中暂安"],[5,226250719,226250719,"金王临死灌婴身"],[6,226250719,226250719,"十八封送子落人间"],[7,226250719,226250719,"浪声报姓名拾婴"]]],["龙王传说前史篇·第十五幕 天冰悲缘诸家续传",226260103,226480107,[[1,226260103,226260103,"拒作暗谍龙冰挡死"],[2,226260412,226460411,"百年药积炼先天体"],[3,226260719,226260719,"求神无应迁兽入界"],[4,226260901,226340831,"慕曦执锤八年破二级"],[5,226270222,226270222,"复夫诱诺魔鲸投邪"],[6,226270718,226270718,"位面崩塌遗孤承痛"],[7,226270813,226270813,"沙客受资签入塔约"],[8,226280108,226480107,"隐亲立功承压海军"]]],["龙王传说前史篇·第十六幕 少年磨艺旧患未消",226280902,226401211,[[1,226280902,226400901,"严父锤声养成天才"],[2,226281129,226401128,"无魂少女学成名解说"],[3,226290103,226290103,"斗铠进阶铭记爱人"],[4,226290105,226290105,"捕兽试验加深衰亡"],[5,226290719,226290719,"灵锻成功留暗伤"],[6,226300827,226300827,"强吸不屈反遭殒命"],[7,226301212,226401211,"剧痛炼山龙六环渐缓"]]]],"正篇":[["傲来童年篇·第一幕 银兽破湖率众出林",226310101,226340721,[[1,226310101,226310101,"银兽破湖率众出林"],[2,226310719,226310719,"蓝银觉醒金纹暗变"],[3,226310720,226310720,"初课受冷拦匪救娜儿"],[4,226310720,226310720,"查无来处留下作妹妹"],[5,226310720,226330719,"无武魂妹由兄护上学"],[6,226310721,226310722,"千锤过试神力自愈"],[7,226310722,226340721,"三年苦练锻造攒魂资"],[8,226311203,226311203,"谢母等夫未至含泪逝"],[9,226320715,226320715,"恶门侵族云冥封退"],[10,226320715,226320715,"问得女儿可封自尽"]]],["傲来童年篇·第二幕 燃核殉妻封修保命",226320715,226470720,[[1,226320715,226320715,"燃核殉妻封修保命"],[2,226320721,226470720,"门武得狼开召唤路"],[3,226321202,226351201,"刀意入魂低调藏锋"],[4,226330603,226371202,"优生入内嗜杀除名"],[5,226330901,226340831,"违纲冲突断腿调中部"],[6,226340721,226340722,"攒足魂资夜修破十级"],[7,226340723,226340723,"三万抽来残次草蛇"],[8,226340723,226340723,"接纳草蛇金纹再化形"],[9,226340723,226340723,"蓝藤抗拉老师重燃希望"]]],["傲来童年篇·第三幕 娜儿留坠离家兄遍寻",226340724,226470807,[[1,226340724,226340731,"娜儿留坠离家兄遍寻"],[2,226340724,226360723,"归族觉武拜阁师"],[3,226340724,226340724,"封身入人间分出娜儿魂"],[4,226340724,226340724,"赌弃妹妹娜儿应约护兄"],[5,226340731,226340731,"长藤胜刀再测千斤力"],[6,226340731,226340801,"五时锻银血祭初成"],[7,226340801,226340804,"血银成锤三叠得双环"],[8,226340808,226470807,"万刀劈海炼分界"],[9,226340830,226340830,"父为儿前途重应旧人"]]],["东海入学篇·第一幕 独赴东海入五班",226340831,226340902,[[1,226340831,226340831,"独到东海循纸找学车"],[2,226340831,226340831,"学姐引路独自入五班"],[3,226340831,226340831,"绣被受辱两拳飞室友"],[4,226340831,226340831,"赔款约战包子解宿怨"],[5,226340831,226340831,"沉银双考九岁登二级"],[6,226340901,226340901,"五班冷师定六年强者志"],[7,226340901,226340901,"匕刺激鳞反拳再败谢"],[8,226340902,226340902,"首课连胜双锤破石牢"],[9,226340902,226340902,"双匕破锤定夜训升班"],[10,226340902,226340902,"授徽接铁借戒得通讯"]]],["东海入学篇·第二幕 古月入班三友合练",226340903,226341130,[[1,226340903,226340903,"堵门逼比谢匕解围成友"],[2,226340903,226340903,"负重跑遇古月六素胜谢"],[3,226340903,226340903,"长空躬身为新生办学籍"],[4,226340903,226340903,"古月护队三人共入夜训"],[5,226340903,226340903,"叠锤断剑三人定参赛"],[6,226340904,226340910,"测精神分训苦练满一周"],[7,226340910,226340910,"音梦先示爱木子认相守"],[8,226340911,226340911,"周休练叠锤交首单"],[9,226340912,226341126,"三人合练成长备升班"],[10,226341130,226341130,"重操设计留资远走"]]],["东海入学篇·第三幕 拳破前锋首战胜四班",226341203,226341206,[[1,226341203,226341203,"拳破前锋首战胜四班"],[2,226341203,226341203,"牛肉店听悲三友卸隔阂"],[3,226341203,226341203,"护店不敌匕伤再激金鳞"],[4,226341203,226341203,"验匕引鳞仍难识本源"],[5,226341204,226341204,"抛友借冰逐破飞鹰阵"],[6,226341204,226341204,"二剑退光飙护校门"],[7,226341204,226341204,"梦见封龙得半岁生死限"],[8,226341205,226341205,"问果价再赢第三场"],[9,226341206,226341206,"拍品查果忍下两环挑衅"],[10,226341206,226341206,"准考获父信台风延期赛"]]],["东海入学篇·第四幕 半时千锻借材迎龙关",226341206,226341213,[[1,226341206,226341206,"半时千锻借材迎龙关"],[2,226341206,226341206,"风雨服三物忍痛启封"],[3,226341206,226341212,"破首封吸金龙精华"],[4,226341212,226341212,"失联归来补上战队"],[5,226341212,226341212,"金爪破融合酿重伤"],[6,226341212,226341212,"救治之后反省失控"],[7,226341212,226341212,"借赛场事故倡特班"],[8,226341213,226341213,"十秒金爪试出极限"],[9,226341213,226341213,"晨跑识欧阳紫馨"]]],["东海零班篇·第一幕 升班立零班签留校",226341213,226341224,[[1,226341213,226341213,"升班立零班签留校"],[2,226341214,226341214,"斗铠开眼教鞭破招"],[3,226341214,226341223,"十日教鞭磨基础"],[4,226341223,226341223,"拳碎仪器震住同窗"],[5,226341223,226341223,"血脉释疑暂允考核"],[6,226341223,226341223,"千锻钢精积累偿债"],[7,226341223,226341223,"两师共教破旧规"],[8,226341223,226341223,"师姐问锻渐消芥蒂"],[9,226341223,226341223,"龙威善恶转为增幅"],[10,226341224,226341224,"共修获益生黑鳞"],[11,226341224,226341224,"首入升灵台感草息"]]],["东海零班篇·第二幕 鹰击惹鸟群率先退",226341224,226401223,[[1,226341224,226341224,"鹰击惹鸟群率先退"],[2,226341224,226341224,"隐匕杀鼠避开魔树"],[3,226341224,226341224,"魔蛛伏杀引急救"],[4,226341224,226341224,"借落叶脱晶熊扑击"],[5,226341224,226341224,"龙威救友金爪破颅"],[6,226341224,226341224,"三人断熊颈遭晶化"],[7,226341224,226341224,"浴血守友共同回归"],[8,226341224,226341225,"金光升百年缠绕变"],[9,226341224,226401223,"学费被劫转皇家苦追龙"],[10,226341225,226341225,"复盘降骄补魂兽课"]]],["东海零班篇·第三幕 三月合练磨成小队",226341225,226470116,[[1,226341225,226350324,"三月合练磨成小队"],[2,226341230,226341230,"家族密合护岛留情"],[3,226350106,226390105,"不受择伴安排赴史求学"],[4,226350117,226470116,"十二年苦研终遭灭口"],[5,226350324,226350324,"期末定考暴动升灵"],[6,226350325,226350327,"三日锻甲获赠门卡"],[7,226350327,226350328,"星轮显露增取名额"],[8,226350328,226350328,"暴动开考合击退敌"],[9,226350328,226350328,"五人控场破魔蛛"],[10,226350328,226350328,"毒丝收灵悟出新路"]]],["东海零班篇·第四幕 古月诱矛破冰杖",226350328,226350404,[[1,226350328,226350328,"古月诱矛破冰杖"],[2,226350328,226350328,"引鸟逃狮终遇恐爪"],[3,226350328,226350328,"护甲保头获高分"],[4,226350328,226350328,"问承载谋一环升灵"],[5,226350329,226350329,"复盘提醒平安为先"],[6,226350401,226350401,"合击试剑融合突失"],[7,226350403,226350403,"为旧友舍共修离校"],[8,226350403,226350403,"学姐慰离愁遇许兄"],[9,226350403,226350403,"三人备考古月现紫光"],[10,226350404,226350404,"英雄殿硬撑过两关"]]],["东海零班篇·第五幕 两人选唐门古月辞邀",226350404,226350428,[[1,226350404,226350404,"两人选唐门古月辞邀"],[2,226350405,226350405,"假期同行车上传功"],[3,226350405,226350411,"护深冥移椅入静室"],[4,226350411,226350411,"天斗祭墓见温柔"],[5,226350412,226350426,"半月引紫气练眼"],[6,226350426,226350426,"正式入门测明承载"],[7,226350427,226350427,"拍卡得龙果见斗铠"],[8,226350428,226350428,"天霜制魔虎攒千年灵"],[9,226350428,226350428,"斩毒猪演霜痕变化"],[10,226350428,226350428,"幽暗围困触草探敌"]]],["东海零班篇·第六幕 白剑破魔猿误取灵",226350428,226350607,[[1,226350428,226350428,"白剑破魔猿误取灵"],[2,226350428,226350428,"金光修裂守到苏醒"],[3,226350428,226350504,"一周疗养真升千年"],[4,226350505,226350507,"归城千锻又入深冥"],[5,226350506,226350506,"插班获一月试留"],[6,226350507,226350507,"紫环护新友双人胜"],[7,226350507,226350507,"二品蓝铜获授四级"],[8,226350507,226350507,"夜星锁链初显威"],[9,226350507,226350507,"诱爪藏掌胜限环师"],[10,226350508,226350607,"月训还债定双线赛"]]],["东海零班篇·第七幕 赴天海睡醒破十七",226350608,226350610,[[1,226350608,226350608,"赴天海睡醒破十七"],[2,226350608,226350608,"锻协赛前讲三关"],[3,226350609,226350609,"鱼干结识小吃货"],[4,226350609,226350609,"雷光表演启内院志"],[5,226350609,226350609,"同食盛宴因账决裂"],[6,226350609,226350609,"无钱留店刷盘待赎"],[7,226350610,226350610,"百锻先交震动评席"],[8,226350610,226350610,"赛场争账叶欲参赛"],[9,226350610,226350610,"龙威近身取首胜"],[10,226350610,226350610,"示弱奇袭赢团首轮"]]],["东海零班篇·第八幕 不服饭输自创大吃",226350610,226350612,[[1,226350610,226350610,"不服饭输自创大吃"],[2,226350611,226350611,"同锤共振助曦千锻"],[3,226350611,226350611,"星剑破爪个人出局"],[4,226350611,226350611,"伤后复盘退出末锻"],[5,226350611,226350611,"肉包赔礼重续友情"],[6,226350612,226350612,"控鹤引力补近战"],[7,226350612,226350612,"旧友劝归难解心结"],[8,226350612,226350612,"高价招揽守师门"],[9,226350612,226350612,"暗考通过师徒议路"],[10,226350612,226350612,"三路合击龙爪破盾"]]],["东海零班篇·第九幕 连胜磨功共立斗铠志",226350612,226460131,[[1,226350612,226350615,"连胜磨功共立斗铠志"],[2,226350616,226350616,"借赛索取内院名额"],[3,226350616,226350616,"冰森失控舍身护友"],[4,226350616,226350616,"怒剑压倒两院长"],[5,226350616,226350616,"天冰现身临阵晋圣"],[6,226350616,226350616,"燃命光愈两师护归"],[7,226350616,226350618,"三日守床待双醒"],[8,226350618,226350618,"伤后停赛重审负荷"],[9,226350618,226381225,"三年深练隐班积功"],[10,226360201,226460131,"伪作邪神布血河局"]]],["东海零班篇·第十幕 招刀入军屡败仍战",226360410,226460409,[[1,226360410,226460409,"招刀入军屡败仍战"],[2,226370721,226370721,"联邦北扫冰兽衰"],[3,226370928,226370928,"旧居夹壁拾徽留线"],[4,226371123,226401122,"六十四后苦修再赴赛"],[5,226371203,226381202,"久留升灵虐杀致伤"],[6,226371228,226371228,"慕供珍矿试锻留技"],[7,226380105,226380105,"弃旧继甲另辟强攻"],[8,226381203,226381203,"双斧扫海成塔利器"],[9,226381225,226381225,"积功换药升任五级"],[10,226381225,226381225,"院长放行约归讲课"]]],["东海零班篇·第十一幕 求留无果知须放手",226381225,226381228,[[1,226381225,226381225,"求留无果知须放手"],[2,226381226,226381226,"期考探狮候夜设伏"],[3,226381226,226381226,"联控灭狮暗取灵力"],[4,226381226,226381227,"破恐爪旧惧合力杀熊"],[5,226381227,226381227,"掌骨融血金爪延锋"],[6,226381227,226381227,"出舱慰友期考过关"],[7,226381227,226381227,"暗室银爪察诸方讯"],[8,226381228,226381228,"师恩临别留好退路"],[9,226381228,226381228,"辞别两位学姐"],[10,226381228,226381228,"邙师指向大城寻亲"]]],["新生斗铠篇·第一幕 离海乘车初抵史城",226381229,226390104,[[1,226381229,226381229,"离海乘车初抵史城"],[2,226381229,226381229,"惜溢价取券待竞拍"],[3,226390101,226390101,"竞价超估买藤定险"],[4,226390101,226390104,"四灵药浴破第二封"],[5,226390103,226390104,"宁弃考相守终获缓机"],[6,226390103,226390103,"为徒归院长跪请罪"],[7,226390104,226390104,"醒后匆食侧门赶考"],[8,226390104,226390104,"金血护队压黑龙"],[9,226390104,226390104,"星场遇犀土沼被破"],[10,226390104,226390104,"黄金龙体破犀甲"]]],["新生斗铠篇·第二幕 金爪托刃背友过门",226390104,226390104,[[1,226390104,226390104,"金爪托刃背友过门"],[2,226390104,226390104,"双匕展技星杖述异"],[3,226390104,226390104,"三拳试力金爪惊老"],[4,226390104,226390104,"六元花现拒独入院"],[5,226390104,226390104,"两关判零按怒续考"],[6,226390104,226390104,"一人代吃四队满分"],[7,226390104,226390104,"舍弱取分保存体能"],[8,226390104,226390104,"耗雪藏爪近身制胜"],[9,226390104,226390104,"分身耗散败强敌"],[10,226390104,226390104,"冰风分袭绕过狮獒"]]],["新生斗铠篇·第三幕 星锁落锤巧赢水晶",226390104,226390104,[[1,226390104,226390104,"星锁落锤巧赢水晶"],[2,226390104,226390104,"长老暗议提高九考"],[3,226390104,226390104,"养力探谷识双强"],[4,226390104,226390104,"入洞合击制幼瑞兽"],[5,226390104,226390104,"舍骨留幼同言不悔"],[6,226390104,226390104,"生存假题心性真关"],[7,226390104,226390104,"五十九分再争同留"],[8,226390104,226390104,"魂竭血续初冲灵锻"],[9,226390104,226390104,"血铸双锤灵锻功成"],[10,226390104,226390104,"认下徒孙师徒归家"]]],["新生斗铠篇·第四幕 肯向蔡老认错",226390104,226390106,[[1,226390104,226390104,"肯向蔡老认错"],[2,226390105,226390105,"十六黑馒补旺气血"],[3,226390105,226390105,"工读注册落脚破宿"],[4,226390105,226390105,"风水扫场分工修舍"],[5,226390105,226390105,"免费末餐吃惊全院"],[6,226390105,226390105,"买吧索号反遇执法"],[7,226390105,226390105,"天使成形出关归校"],[8,226390105,226390105,"天凤出面拒绝争徒"],[9,226390106,226390106,"院长亲带新生班"],[10,226390106,226390106,"首课明规急赴斗铠"]]],["新生斗铠篇·第五幕 卖锻换饭结识原恩",226390106,226390107,[[1,226390106,226390106,"卖锻换饭结识原恩"],[2,226390106,226390106,"枫老试锻强邀入会"],[3,226390106,226390106,"专室开锻首单交银"],[4,226390106,226390106,"巨猿撞退堵门天使"],[5,226390106,226390106,"遥告师门灵锻成就"],[6,226390106,226390106,"订票辞职欲护爱徒"],[7,226390106,226390106,"新工读入席各定路"],[8,226390107,226390107,"先任锻委分队争班"],[9,226390107,226390107,"假憨诱敌暗线合杀"],[10,226390107,226390107,"观屏看重领袖气质"]]],["新生斗铠篇·第六幕 暗镰追斩显四环敌",226390107,226390107,[[1,226390107,226390107,"暗镰追斩显四环敌"],[2,226390107,226390107,"借问榜单让杨领队"],[3,226390107,226390107,"联攻拆散空间战阵"],[4,226390107,226390107,"白虎退杨众人护法"],[5,226390107,226390107,"千钧近战震碎魔镰"],[6,226390107,226390107,"元素风暴困败白虎"],[7,226390107,226390107,"四人分任七个班职"],[8,226390107,226390107,"天使入宿原恩搬离"],[9,226390107,226390107,"以退为进调往史城"],[10,226390107,226390107,"双铁换草各有所图"]]],["新生斗铠篇·第七幕 四业合课均衡分组",226390108,226390112,[[1,226390108,226390108,"四业合课均衡分组"],[2,226390108,226390108,"拒拿十锻换取速升"],[3,226390108,226390108,"夜窥误会引发追杀"],[4,226390108,226390108,"私斗查明重罚班长"],[5,226390109,226390109,"四委立下斗铠目标"],[6,226390109,226390109,"师长迁来允拜新师"],[7,226390109,226390109,"修窗致歉仍遭拒绝"],[8,226390109,226390109,"五锻管饭正式拜师"],[9,226390109,226390112,"本源温养灵物晋尊"],[10,226390110,226390110,"代请修炼师姐入班"]]],["新生斗铠篇·第八幕 借药破开第三封印",226390112,226390117,[[1,226390112,226390112,"借药破开第三封印"],[2,226390112,226390112,"食补复元惊呆新师"],[3,226390112,226390112,"湖畔释怀补回缺课"],[4,226390112,226390112,"双龙隔空争抢师门"],[5,226390113,226390113,"授掌惊天饭卡解忧"],[6,226390113,226390113,"合战长空败露隔阂"],[7,226390113,226390113,"握手同工锻齐四材"],[8,226390113,226390113,"清水被泼惊梦拒援"],[9,226390113,226390117,"越阶学融锻苦练合金"],[10,226390117,226390117,"玉银起灵获赠秘册"]]],["新生斗铠篇·第九幕 赔铁示徽引来鉴银",226390117,226390125,[[1,226390117,226390117,"赔铁示徽引来鉴银"],[2,226390117,226390117,"误传关系惹怒同伴"],[3,226390118,226390118,"改购为闯塔筹七人"],[4,226390118,226390118,"玉银牵线请来天使"],[5,226390120,226390120,"花点一试森罗修炼"],[6,226390123,226390123,"原恩索名额应邀"],[7,226390123,226390123,"饭友重聚药面满腹"],[8,226390123,226390124,"逆血冲关险爆获救"],[9,226390124,226390125,"七人齐赴魂灵塔"],[10,226390125,226390125,"分工轮替连过八关"]]],["新生斗铠篇·第十幕 破雪逐熊留敌休整",226390125,226390125,[[1,226390125,226390125,"破雪逐熊留敌休整"],[2,226390125,226390125,"冰熊惧死化灵归许"],[3,226390125,226390125,"龙威坠蜥一爪反哺"],[4,226390125,226390125,"金光入阵剥雷解危"],[5,226390125,226390125,"双翼牵藤悬顶避狂"],[6,226390125,226390125,"狒诈虚弱险折救人"],[7,226390125,226390125,"双灵得成出塔记账"],[8,226390125,226390125,"定金筹债悟材料升阶"],[9,226390125,226390125,"合金分歧名合实分"],[10,226390125,226390125,"豪车订料拒师代甲"]]],["新生斗铠篇·第十一幕 三融并练忙至满月",226390126,226390210,[[1,226390126,226390206,"三融并练忙至满月"],[2,226390206,226390206,"孤立中六人重新结队"],[3,226390206,226390206,"神基玉银引来新工"],[4,226390206,226390206,"教师议定再添压力"],[5,226390207,226390207,"禁叶难局仍不气馁"],[6,226390207,226390207,"反复败战求不惜一切"],[7,226390207,226390207,"拒成材赢赌求原铁"],[8,226390209,226390209,"双包续剑星线铸甲"],[9,226390210,226390210,"两强轮空会于决赛"]]],["新生斗铠篇·第十二幕 谢邂以伤换镰退敌",226390210,226390214,[[1,226390210,226390210,"谢邂以伤换镰退敌"],[2,226390210,226390210,"逼出白虎星甲现身"],[3,226390210,226390210,"金龙惊天兑下白虎"],[4,226390210,226390210,"雪锁包子合力定胜"],[5,226390210,226390210,"六人同庆拒添旧敌"],[6,226390210,226390210,"落败五强转作追赶"],[7,226390210,226390210,"邻居求甲先定分工"],[8,226390211,226390211,"门前问好认下班长"],[9,226390214,226390214,"双龙齐来院长观战"]]],["新生斗铠篇·第十三幕 由内铸钛创生获胜",226390214,226390625,[[1,226390214,226390214,"由内铸钛创生获胜"],[2,226390214,226390214,"三项较量定六人团"],[3,226390214,226390214,"两王硬碰各露底牌"],[4,226390214,226390214,"换位缠斗胜负连翻"],[5,226390214,226390214,"七彩真空绝境翻盘"],[6,226390214,226390217,"龙影惊梦三日方醒"],[7,226390217,226390226,"魂血重建暂停冒险"],[8,226390226,226390625,"锻食实战忙至学末"],[9,226390625,226390625,"十五日十城独试"]]],["十城历练篇·第一幕 搜尽资源各自出门",226390626,226390626,[[1,226390626,226390626,"搜尽资源各自出门"],[2,226390626,226390626,"剑拦学长强借盘缠"],[3,226390626,226390626,"锻路受堵放蛇逃票"],[4,226390626,226390626,"三环取信获助路费"],[5,226390626,226390626,"列车长赴险护乘客"],[6,226390626,226390626,"墨蓝换质断后车"],[7,226390626,226390626,"断厢夺器制首恶"],[8,226390626,226390626,"李峰挡枪身殉职"],[9,226390626,226390626,"避奖求工遇无徽"],[10,226390626,226390626,"长空护墨退瘟邪"],[11,226390626,226390626,"听锤融星银惊众"]]],["十城历练篇·第二幕 认得师伯求折现",226390626,226390627,[[1,226390626,226390626,"认得师伯求折现"],[2,226390626,226390626,"元宝儿截断争徒"],[3,226390626,226390626,"红玉补血拒离校"],[4,226390626,226390626,"破空制鹰审前路"],[5,226390626,226390626,"受赠重聚改同考"],[6,226390626,226390626,"求助不成拦雨王"],[7,226390626,226390626,"袭甲冒令脱天斗"],[8,226390626,226390626,"塔主压讯整执法"],[9,226390626,226390626,"购车同行谈志向"],[10,226390627,226390627,"误挑全甲难破防"],[11,226390627,226390627,"反诬引战借隙逃"]]],["十城历练篇·第三幕 负师责请饭明心",226390627,226390701,[[1,226390627,226390627,"负师责请饭明心"],[2,226390627,226390629,"连城冒考定踢馆"],[3,226390629,226390629,"挥爪阻甲土遁走"],[4,226390629,226390629,"再筹百万举横幅"],[5,226390629,226390629,"学长接战开星台"],[6,226390629,226390629,"抛阵截空星光定"],[7,226390629,226390629,"星杖洗冰剑晋阶"],[8,226390629,226390701,"校友连考立赌约"],[9,226390701,226390701,"烟火弃车避查证"],[10,226390701,226390701,"扩音挑战引直播"],[11,226390701,226390701,"遥令平安重输赢"]]],["十城历练篇·第四幕 纸塞卸势立战阵",226390701,226390706,[[1,226390701,226390701,"纸塞卸势立战阵"],[2,226390701,226390701,"龙血压圣龙坠地"],[3,226390701,226390701,"蓝焰削虎金龙破"],[4,226390701,226390701,"神龙初醒碎冰神"],[5,226390701,226390701,"败院查龙究差距"],[6,226390701,226390701,"昏梦闻封印急限"],[7,226390701,226390701,"返院得分获参选"],[8,226390702,226390706,"五日养伤赴唐门"],[9,226390706,226390706,"门赐绝学预订灵"],[10,226390706,226390706,"殿议倾资育新秀"],[11,226390706,226390706,"问龙留秘各藏心"]]],["十城历练篇·第五幕 康复坚持返列车",226390706,226390719,[[1,226390706,226390706,"康复坚持返列车"],[2,226390707,226390707,"全班留校假期散"],[3,226390707,226390707,"重逢赠卡认姐弟"],[4,226390707,226390707,"邪刑逼讯断车护"],[5,226390707,226390707,"金纹临身枪灭邪"],[6,226390707,226390709,"震华接救醒灵海"],[7,226390709,226390709,"录案探病立守愿"],[8,226390709,226390709,"圣灵修魂保蓝命"],[9,226390709,226390718,"十日神匠授融锻"],[10,226390718,226390718,"黑甲送返备四灵"],[11,226390718,226390719,"四灵破印生双金"]]],["十城历练篇·第六幕 隐私冲突伤恩谢",226390719,226390804,[[1,226390719,226390719,"隐私冲突伤恩谢"],[2,226390719,226390719,"洗衣告白被掷出"],[3,226390719,226390719,"扫把输赌悟敏攻"],[4,226390719,226390719,"登岛验拳镜技疑"],[5,226390719,226390719,"双龙争席惊秋千"],[6,226390719,226390719,"银眸重认失散妹"],[7,226390720,226390803,"入敏堂苦练锋芒"],[8,226390720,226390720,"同食遇痞银枪止"],[9,226390724,226390724,"银枪试出金龙霸"],[10,226390724,226390804,"苦修撼地辞岛妹"]]],["跨级备甲篇·第一幕 闻蓝苏醒偿护恩",226390804,226390821,[[1,226390804,226390804,"闻蓝苏醒偿护恩"],[2,226390804,226390804,"古月携饭归月下"],[3,226390805,226390805,"开学再议跨级战"],[4,226390805,226390805,"霸体破围合力取胜"],[5,226390805,226390806,"专场夜修见增益"],[6,226390806,226390806,"售出合金积修资"],[7,226390806,226390806,"定黄甲以银换铁"],[8,226390806,226390820,"昼锻夜修交甲材"],[9,226390820,226390821,"妹来班里古月醋"],[10,226390821,226390821,"白甲踏出鬼影步"]]],["跨级备甲篇·第二幕 守护之愿入斗魂",226390821,226441229,[[1,226390821,226390821,"守护之愿入斗魂"],[2,226390821,226390821,"十二时修知同化"],[3,226390821,226400220,"半年苦修迎跨级"],[4,226391128,226391128,"龙抗五环狐王退位"],[5,226391230,226441229,"从实习飞到王牌机长"],[6,226400220,226400220,"争额触痛谢邂心"],[7,226400221,226400221,"扫地消怨定选拔"],[8,226400223,226400223,"光影合星锁夺席"],[9,226400223,226400223,"霸体护月怒焰胜"],[10,226400223,226400223,"联队定员金语长"]]],["跨级备甲篇·第三幕 圣匠相试激长弓",226400223,226400224,[[1,226400223,226400223,"圣匠相试激长弓"],[2,226400224,226400224,"黄甲初载古月行"],[3,226400224,226400224,"飞赴天斗见红机"],[4,226400224,226400224,"小红变形显神工"],[5,226400224,226400224,"听劝定心先斗铠"],[6,226400224,226400224,"灵菌补体余力融"],[7,226400224,226400224,"登门挑战神匠应"],[8,226400224,226400224,"雷锤先成舞麟续"],[9,226400224,226400224,"创生反哺神匠让局"]]],["跨级备甲篇·第四幕 血锤镇恶灵赢赛",226400224,226400225,[[1,226400224,226400224,"血锤镇恶灵赢赛"],[2,226400224,226400224,"传送接剑救神匠"],[3,226400224,226400224,"询来历疑邪魂师"],[4,226400224,226400224,"牧野邀传麟拒退门"],[5,226400224,226400224,"售锻成名街中遭劫"],[6,226400224,226400224,"碎讯受刑仍护同伴"],[7,226400224,226400224,"恐爪退血剑月令留敌"],[8,226400225,226400225,"醒返学院获纳甲戒"],[9,226400225,226400225,"阁议查邪定海外行"]]],["跨级备甲篇·第五幕 获许全材昼夜谋战",226400225,226400827,[[1,226400225,226400227,"获许全材昼夜谋战"],[2,226400227,226400227,"高年戒轻敌布双核"],[3,226400228,226400228,"万年堕天破天书"],[4,226400228,226400228,"燃虎截火一线险胜"],[5,226400228,226400228,"剑刺铠隙败兑强敌"],[6,226400228,226400228,"双人分克逼高年弃团"],[7,226400228,226400228,"闻远行同问星罗"],[8,226400228,226400827,"八人备甲半年同修"],[9,226400301,226400301,"舍门见随团续求徒"]]],["跨级备甲篇·第六幕 离行惜别月问喜欢",226400827,226400828,[[1,226400827,226400827,"离行惜别月问喜欢"],[2,226400827,226400827,"临行破格先领六星"],[3,226400827,226400827,"携信报门冷月同行"],[4,226400827,226400827,"草索荡林避野猪"],[5,226400827,226400827,"龙吟慑霸王托麟近"],[6,226400827,226400827,"霸王化烟藏麟身"],[7,226400827,226400827,"雅莉监督护麟受检"],[8,226400827,226400828,"归校夜察仍无龙迹"],[9,226400827,226400827,"检无霸王封台自查"]]],["星罗海行篇·第一幕 交班惜别赴海城",226400828,226400904,[[1,226400828,226400830,"交班惜别赴海城"],[2,226400830,226400902,"海饭思亲候团静修"],[3,226400902,226400902,"同登星罗正午启航"],[4,226400902,226400902,"礼衣唤家携月赴宴"],[5,226400902,226400902,"握力护队巧退围堵"],[6,226400902,226400902,"林邀共舞月接下一曲"],[7,226400902,226400902,"银舞夺奖醋意相随"],[8,226400902,226400903,"深海挣命自游归面"],[9,226400903,226400904,"灵鱼补体再沉假死"]]],["星罗海行篇·第二幕 拜师苦海四十八日",226400904,226401021,[[1,226400904,226401019,"拜师苦海四十八日"],[2,226401020,226401020,"末考洒血引群鲨"],[3,226401020,226401020,"示弱入腹刃斩鲨王"],[4,226401020,226401020,"绝茧蓝银醒皇脉"],[5,226401020,226401020,"霸王吞环四环终成"],[6,226401020,226401021,"初醒新力忽逢围船"],[7,226401021,226401021,"双王索凶银月战章"],[8,226401021,226401021,"冰面合守霸王变初战"],[9,226401021,226401021,"巨铠携红刀威退兽潮"]]],["星罗海行篇·第三幕 访宗主话冷遣银球",226401021,226401118,[[1,226401021,226401021,"访宗主话冷遣银球"],[2,226401021,226401115,"拖海炼体融锻真成"],[3,226401115,226401115,"魂骨作奖蔡允青年赛"],[4,226401115,226401115,"反抗军谋毁使团嫁祸"],[5,226401116,226401116,"警袭牵藤救两校"],[6,226401116,226401116,"残车接力天霜断双黑"],[7,226401116,226401116,"借敌双锤穿黑甲杀枫"],[8,226401116,226401118,"援至收甲抵城眠"],[9,226401118,226401118,"银鳞欲动盖被留情"]]],["星罗天才篇·第一幕 问杀不信笑游逢殿下",226401119,226401125,[[1,226401119,226401119,"问杀不信笑游逢殿下"],[2,226401119,226401119,"玉银换晶发现差价"],[3,226401119,226401120,"访唐不露名连夜锻金"],[4,226401121,226401121,"国礼梦惊险惹围卫"],[5,226401121,226401121,"宠女免罚强定婚规"],[6,226401121,226401121,"踩舞报复反成绯闻"],[7,226401122,226401123,"月拒单团仍伴双赛"],[8,226401123,226401123,"双金初试震九环银刀"],[9,226401123,226401123,"连击锁甲逼银刀认输"],[10,226401125,226401125,"肩臂接续成完整右甲"],[11,226401125,226401125,"夜谈前路相约慢老"]]],["星罗天才篇·第二幕 装迟钝双击破兄妹",226401126,226401127,[[1,226401126,226401126,"装迟钝双击破兄妹"],[2,226401126,226401126,"独破冰火毒蝶晋双赛"],[3,226401126,226401126,"拒留星罗公主求兄"],[4,226401126,226401126,"白徽召集入剧场伏击"],[5,226401126,226401126,"拔炮连抛送爆弹上天"],[6,226401126,226401127,"护住白三授一次召令"],[7,226401127,226401127,"酒店拒赌不受激将"],[8,226401127,226401127,"握手暗争才知龙重"],[9,226401127,226401127,"观七人速胜古愿上阵"],[10,226401127,226401127,"泰坦砸卷四锋穿阵"],[11,226401127,226401127,"第五封开左爪撕裂"]]],["星罗天才篇·第三幕 抽中狐王押万年灵物",226401128,226401209,[[1,226401128,226401128,"抽中狐王押万年灵物"],[2,226401128,226401128,"观龙不动受冰重聚志"],[3,226401128,226401128,"借旧赛明七怪考验"],[4,226401128,226401128,"撼地恐爪重创五狐尾"],[5,226401128,226401128,"血压九尾破环赢狐王"],[6,226401128,226401128,"狐王强撑龙警轻敌"],[7,226401128,226401128,"慢镜析尾伤劝主场冷静"],[8,226401128,226401128,"冷门过后归房磨底牌"],[9,226401128,226401128,"五尾近断虎王动怒"],[10,226401128,226401209,"连捷十日三项入循环"],[11,226401208,226401208,"查山龙传承先勿惊蛇"]]],["星罗天才篇·第四幕 秋千思兄仍求强自守",226401208,226401212,[[1,226401208,226401208,"秋千思兄仍求强自守"],[2,226401210,226401210,"移狼截甲断辅胜金牌"],[3,226401210,226401210,"翼推入锁散剑破双雷"],[4,226401210,226401210,"父皇论敌提醒勿伤使"],[5,226401210,226401210,"求师指点只待决赛"],[6,226401212,226401212,"抽到龙王仍不怯战"],[7,226401212,226401212,"山川河流压天使折翼"],[8,226401212,226401212,"山龙秘辛改血压预期"],[9,226401212,226401212,"护伤归队不肯低头"],[10,226401212,226401212,"弃单双集力替队长制甲"]]],["星罗天才篇·第五幕 讲金银本源指压山龙",226401212,226401225,[[1,226401212,226401212,"讲金银本源指压山龙"],[2,226401212,226401212,"追问因血亲近却关心门"],[3,226401213,226401213,"蔡拦慰问只守生死线"],[4,226401213,226401222,"留力过循环三人晋决赛"],[5,226401216,226401216,"禁闭摔瓶仍想出气"],[6,226401224,226401224,"决赛前夜为原恩研敌"],[7,226401224,226401224,"售黑甲十一万换三灵"],[8,226401224,226401224,"老唐警九封止急破"],[9,226401225,226401225,"撼地接惊天拳落司马"],[10,226401225,226401225,"气场破影暗剑裂全甲"]]],["星罗天才篇·第六幕 弃蓄闪背破影王终局",226401225,226401229,[[1,226401225,226401225,"弃蓄闪背破影王终局"],[2,226401226,226401227,"三人齐晋再迎十六战"],[3,226401227,226401227,"诱怒预令金语擒灵猫"],[4,226401228,226401228,"休赛购金再领龙谷名额"],[5,226401229,226401229,"浴血双幻龙仍败风王"],[6,226401229,226401229,"悟自由倒入原恩怀"],[7,226401229,226401229,"藤阵逼虎换灵披全甲"],[8,226401229,226401229,"双锤连砸裁判止虎战"],[9,226401229,226401229,"两院双晋原抱谢归"],[10,226401229,226401229,"熬夜续甲疲叶报新件"]]],["星罗天才篇·第七幕 让赛留力连晋双龙决",226401230,226410106,[[1,226401230,226401231,"让赛留力连晋双龙决"],[2,226410101,226410101,"制甲衰竭徐守叶病床"],[3,226410101,226410102,"装病留人终换守床位"],[4,226410101,226410102,"决前封心晨席仍笑赴赛"],[5,226410102,226410102,"三十八重锤撼动山龙"],[6,226410102,226410102,"山河连摧狂龙踏重伤"],[7,226410102,226410102,"牧破罩救徒恩慈拦追"],[8,226410102,226410102,"脏器自排碎骨药浴续生"],[9,226410102,226410103,"全城寻徒双人决赛尽退"],[10,226410102,226410106,"三缸药浴续命仍待醒"]]],["星罗天才篇·第八幕 压抑一周补齐星银甲",226410102,226410112,[[1,226410102,226410108,"压抑一周补齐星银甲"],[2,226410103,226410103,"识海受责仍认学院是家"],[3,226410103,226410103,"隐去本体细授八脉法"],[4,226410106,226410106,"古接队长拒停团体赛"],[5,226410108,226410108,"星剑全甲首轮五零晋八"],[6,226410108,226410108,"胜者自省受命修精神"],[7,226410109,226410110,"三场五零仍守空席"],[8,226410111,226410112,"七人布决战四裁护赛"],[9,226410111,226410111,"开两脉拼六封得龙枪"],[10,226410112,226410112,"借逆转剑雨再败全甲狐"]]],["星罗天才篇·第九幕 地狱魔影合泰坦摔虎",226410112,226410112,[[1,226410112,226410112,"地狱魔影合泰坦摔虎"],[2,226410112,226410112,"肉包请龙不吃便认负"],[3,226410112,226410112,"队长归来三金再登台"],[4,226410112,226410112,"擒公主演杀逼恩入场"],[5,226410112,226410112,"半时整队双锤交泰坦"],[6,226410112,226410112,"空调众阵金枪初压龙"],[7,226410112,226410112,"黄金吼断技土禁清山河"],[8,226410112,226410112,"二字狂龙逼出六人共链"],[9,226410112,226410112,"神龙合身贯肩夺团冠"],[10,226410112,226410112,"无声主场相拥庆冠"]]],["龙谷葬骨篇·第一幕 龙谷结伴寻龙墓",226410113,226410405,[[1,226410113,226410115,"请假留古等字仍未出口"],[2,226410204,226410204,"白三身份已核龙谷守密"],[3,226410204,226410205,"一路饥行夜宿被拒门外"],[4,226410205,226410205,"觅食入林皇草通众植"],[5,226410205,226410205,"晨扫全镇食物备一月粮"],[6,226410205,226410205,"山顶开谷魂封血脉留"],[7,226410206,226410206,"争食落树两人分道"],[8,226410206,226410206,"车中念舞通讯终未拨"],[9,226410206,226410405,"九吸龙云修复血脉隐患"],[10,226410405,226410405,"拳碎地龙篝火认公主"],[11,226410405,226410405,"稀金签约重结护送同行"],[12,226410405,226410405,"六人撑裂银发主上入谷"]]],["龙谷葬骨篇·第二幕 银龙裂谷留人葬骨",226410406,226440610,[[1,226410406,226410408,"龙魂尽让三哥称呼渐亲"],[2,226410408,226410408,"龙吼落火龙面具终摘"],[3,226410408,226410408,"千龙曝骨唤起葬龙心"],[4,226410408,226410408,"枪触龙神血剑幻痛袭身"],[5,226410408,226410408,"银龙挡流舍杀留下金晶"],[6,226410408,226410408,"二十九人归来唯白三缺"],[7,226410409,226410411,"醒见四环不取龙族遗骨"],[8,226410411,226440610,"宏愿葬尽千龙魂日相助"],[9,226410411,226440410,"队长未归一字余甲全备"],[10,226410610,226410610,"银枪院比夺得女神之名"],[11,226410908,226410908,"以死拒订婚被除皇名"]]],["龙谷葬骨篇·第三幕 葬龙毕受群魂回赠",226411015,226470220,[[1,226411015,226411114,"延期候寻一月仍须返航"],[2,226411202,226411202,"尘魂先满举镇助学"],[3,226411202,226441201,"三年双环转学择塔"],[4,226420214,226420214,"经营星罗升掌分部"],[5,226420411,226430410,"吞有翼龙骨沉眠一年"],[6,226420908,226430907,"七人入院守住七怪之名"],[7,226421230,226421230,"派探魔鬼岛遭上级严责"],[8,226430220,226460219,"逼恋屡战各自苦修"],[9,226430808,226430808,"丈亭倾心冷师挡婚"],[10,226440221,226470220,"古族助研量产黑魂"],[11,226440610,226440610,"葬毕受赠晶钻躯干骨"]]],["龙枪姻缘篇·第一幕 归校赶上海神缘",226440611,226440910,[[1,226440611,226440910,"龙珠归岸货轮跨海返校"],[2,226440903,226440903,"梁助合双匕藏招等告白"],[3,226440907,226440907,"湖畔旧赌仍在古月定离"],[4,226440907,226440907,"正宇激勇胖子报来客"],[5,226440907,226440907,"归讯报喜云儿假认婚约"],[6,226440908,226440908,"云龙远来入院等故人"],[7,226440910,226440910,"兄妹重逢二字翼载回岛"],[8,226440910,226440910,"双龙见归人急拉去验锻"],[9,226440910,226440910,"礼服赴湖谢仍怕原恩怒"],[10,226440910,226440910,"阁老临湖海神缘正式开"],[11,226440910,226440910,"天使装弱劝八女摘笠"]]],["龙枪姻缘篇·第二幕 影分四摘仍未见原恩",226440910,226440910,[[1,226440910,226440910,"影分四摘仍未见原恩"],[2,226440910,226440910,"山龙洒水遭毁灭炮退"],[3,226440910,226440910,"孔雀水幕掩箭八笠落"],[4,226440910,226440910,"留灯认归人十八盏照舞"],[5,226440910,226440910,"音梦报孕木子喜断流程"],[6,226440910,226440910,"胖子吼爱欲退队长牵回"],[7,226440910,226440910,"龙王坦言痛苦求被接纳"],[8,226440910,226440910,"华丽许诺遭拒两人离场"],[9,226440910,226440910,"舞声止笑谢邂倾心求答"]]],["龙枪姻缘篇·第三幕 两友求爱舞丝朵皆拒",226440910,226440910,[[1,226440910,226440910,"两友求爱舞丝朵皆拒"],[2,226440910,226440910,"血脉旧问放下仍愿追爱"],[3,226440910,226440910,"娜儿绕过山龙选中哥哥"],[4,226440910,226440910,"星澜择胖子落水也成双"],[5,226440910,226440910,"机甲压山龙擎天止死斗"],[6,226440910,226440910,"两女连选舞被围在叶间"],[7,226440910,226440910,"双龙破魔眼原恩认败"],[8,226440910,226440910,"面纱后摇头归人心沉"],[9,226440910,226440910,"烟花祝谢原金叶送岸"]]],["龙枪姻缘篇·第四幕 两女告白皆拒娜儿开口",226440910,226441218,[[1,226440910,226440910,"两女告白皆拒娜儿开口"],[2,226440910,226440910,"拒娜选十七古月泪揭面"],[3,226440910,226440910,"爪问真心霸王载两人"],[4,226440910,226440911,"林中互诉相拥一夜安眠"],[5,226440910,226441218,"羞耻闭门半年不肯先道歉"],[6,226440911,226440911,"湖畔归一古月娜离去"],[7,226440912,226440914,"双重告别三日搜城无踪"],[8,226440914,226440914,"劝醒见银鳞决意先自强"],[9,226440914,226440914,"金鳞贴心古月选塔中路"]]],["北海魔岛篇·第一幕 血雾收全甲一字终成套",226440914,226471206,[[1,226440914,226440914,"血雾收全甲一字终成套"],[2,226440914,226440914,"双拳退万斤锤原恩脱臂"],[3,226440914,226440914,"讲葬龙经历解释体魄"],[4,226440914,226440914,"测出灵渊右拳越十万"],[5,226440914,226440914,"长空暂辞教导催升级"],[6,226440914,226440914,"天空龙吟评黑甲取名龙"],[7,226440914,226440914,"闭关前见慕辰得魂锻录"],[8,226440915,226441214,"队长归位苦修备好二字材"],[9,226441207,226471206,"三年循环凝成神机"]]],["北海魔岛篇·第二幕 皇草通岛金老赐造化",226441214,226441219,[[1,226441214,226441214,"皇草通岛金老赐造化"],[2,226441214,226441214,"皇树双影合成绿金五环"],[3,226441214,226441214,"借力开自然域十三秒昏"],[4,226441214,226441219,"军训作罚黄金路限十五日"],[5,226441219,226441219,"借锻筹路费重逢慕曦"],[6,226441219,226441219,"腕锤极致沉银止半步魂锻"],[7,226441219,226441219,"龙鳞售五百万师姐挥别"],[8,226441219,226441219,"迟歉再争列车夜里横抛"],[9,226441219,226441219,"脱车先察凶手再截屠杀"],[10,226441219,226441219,"蝠雾游斗飞翔迫出二甲"]]],["北海魔岛篇·第三幕 重压缚蝠霸王炎焚尽",226441219,226470212,[[1,226441219,226441219,"重压缚蝠霸王炎焚尽"],[2,226441219,226441219,"星控一秒合队歼群邪"],[3,226441219,226441219,"蓝藤撑车肉包稳伤者"],[4,226441219,226441219,"至阴偷袭尊防迫全队"],[5,226441219,226441219,"狂暴共享伤龟反困小言"],[6,226441219,226441219,"牺牲燃翼护许援者解域"],[7,226441219,226441219,"学长讲圣灵劝藏七怪名"],[8,226441219,226441220,"病榻互忏两颗心重合"],[9,226441219,226441219,"云儿伤返龙跃护送"],[10,226441219,226470212,"随龙赴星罗执教"]]],["北海魔岛篇·第四幕 四日车行重议七怪合练",226441220,226441230,[[1,226441220,226441223,"四日车行重议七怪合练"],[2,226441223,226441223,"无港重墙拦路改谋战机"],[3,226441223,226441223,"正门求训却被双禁扣押"],[4,226441223,226441229,"血护破禁暗学七日飞行"],[5,226441230,226441230,"击晕机组三人缚翼启机"],[6,226441230,226441230,"七百米强起亮名令护航"],[7,226441230,226441230,"霸王撑网借重突空捕"],[8,226441230,226441230,"穿屏增重藤撑落黑岛"],[9,226441230,226441230,"无元黑水断退路禁空"]]],["北海魔岛篇·第五幕 独闯碎气先入生命谷",226441230,226450123,[[1,226441230,226441230,"独闯碎气先入生命谷"],[2,226441230,226441230,"背老遭敲醒后筹全队入谷"],[3,226441230,226441230,"合力冲入魔鬼山谷"],[4,226441230,226441230,"神经毒痛逼醒警戒"],[5,226441230,226441230,"痒药揭骗拒食轮守"],[6,226441230,226441230,"信任真娜击碎噩梦"],[7,226441230,226450106,"受胁学飞练成机动"],[8,226450106,226450106,"借空捕劫机返岛"],[9,226450106,226450106,"再受胁渡海无功"],[10,226450106,226450123,"吸毁灭气反复试海"]]],["北海魔岛篇·第六幕 渡海潜掘军团地道",226450123,226450214,[[1,226450123,226450123,"渡海潜掘军团地道"],[2,226450123,226450123,"潜库挟参谋冲门禁"],[3,226450123,226450123,"逼迫沈星索来战机"],[4,226450123,226450123,"释沈星携整机返岛"],[5,226450123,226450214,"吞噬食关补生命"],[6,226450214,226450214,"刑击反促血魂交融"],[7,226450214,226450214,"真雾侵身冰水止危"],[8,226450214,226450214,"银鳞灼醒破假古月"],[9,226450214,226450214,"识心破幻乐受重创"]]],["北海魔岛篇·第七幕 老魔揭史说明规矩",226450214,226450506,[[1,226450214,226450214,"老魔揭史说明规矩"],[2,226450214,226450308,"五魔传授全能课程"],[3,226450308,226450308,"树屋安逸不废修炼"],[4,226450308,226450330,"深冥凝成液态魂涡"],[5,226450330,226450330,"生命潮汐提前再临"],[6,226450330,226450330,"双潮洗礼魂涡留点"],[7,226450330,226450330,"识破懒惰醒回现实"],[8,226450330,226450506,"守候全员毕业告别"]]],["圣城陨落篇·第一幕 圣灵炸城墨武殉职",226450428,226460504,[[1,226450428,226450428,"圣灵炸城墨武殉职"],[2,226450428,226450428,"忍悲抚民稳住天斗"],[3,226450429,226450429,"惜才暗护鸽派墨蓝"],[4,226450506,226450506,"循梦查库惊破内奸"],[5,226450506,226450506,"真潜库救沈换装"],[6,226450506,226450506,"易容脱营弃车乘列"],[7,226450506,226450506,"姐妹整肃追查失弹"],[8,226450507,226460504,"梦魇失眠渐借酒眠"],[9,226450508,226450508,"平安归城暂别合练"],[10,226450508,226450508,"升黄斗接侦邪任务"]]],["圣城陨落篇·第二幕 吼断怨流破骷髅",226450508,226450510,[[1,226450508,226450508,"吼断怨流破骷髅"],[2,226450508,226450509,"报坛获奖重归学院"],[3,226450509,226450509,"云冥指涡暗定预备"],[4,226450509,226450509,"浊世解惑寄望守世"],[5,226450510,226450510,"购车赴会识煽平乱"],[6,226450510,226450510,"六强会面获冰火印"],[7,226450510,226450510,"厨试论体听闻秘语"]]],["圣城陨落篇·第三幕 龙血酒破九封双循",226450510,226450612,[[1,226450510,226450510,"龙血酒破九封双循"],[2,226450510,226450609,"细修融锻真成圣匠"],[3,226450609,226450609,"归聚定下双人试战"],[4,226450609,226450609,"无甲双击胜谢乐"],[5,226450609,226450609,"借锤胜双女告圣匠"],[6,226450609,226450609,"二对五失机终认负"],[7,226450612,226450612,"内应放车血祭蓄弹"],[8,226450612,226450612,"心兆难辨先传警示"],[9,226450612,226450612,"手链示警夜召伙伴"]]],["圣城陨落篇·第四幕 古月震属拒绝合谋",226450612,226451211,[[1,226450612,226450612,"古月震属拒绝合谋"],[2,226450612,226450612,"百弹空拦外城连爆"],[3,226450612,226450612,"弑神双临护下种子"],[4,226450612,226450612,"云冥碎神陨护全城"],[5,226450612,226450612,"舍身挡弹银翼来援"],[6,226450612,226450612,"叶领六怪抱雅撤离"],[7,226450612,226450612,"议长惊灾追查弑神"],[8,226450612,226450612,"冷责塔主暗逐席位"],[9,226450612,226451211,"鹰派重组唐门转隐"],[10,226450612,226450612,"老师燃命一分钟救生"]]],["圣城陨落篇·第五幕 地下守学一年无离",226450612,226470214,[[1,226450612,226460611,"地下守学一年无离"],[2,226450612,226450612,"宿老护传龙伤带宝"],[3,226450613,226450614,"林中自愈护醒失忆"],[4,226450613,226450613,"误闻爱逝临址誓仇"],[5,226450613,226470214,"灾讯后闭修拒婚"],[6,226450614,226450614,"植视识猴护古退敌"],[7,226450614,226450614,"神龙合体制鸟诛猴"],[8,226450614,226450614,"银符收鸟暂立约束"],[9,226450614,226450614,"献链触发龙神庇佑"],[10,226450614,226450614,"四凶验主留观龙意"]]],["圣城陨落篇·第六幕 龙梦见灾醒谢遗赠",226450614,226451218,[[1,226450614,226450614,"龙梦见灾醒谢遗赠"],[2,226450614,226450617,"抵墙定策魂戒赠古"],[3,226450617,226450617,"假徐败露挟古破墙"],[4,226450617,226450617,"破墙植隐掘河脱围"],[5,226450617,226450617,"小城听灾定心谋后"],[6,226450617,226450618,"夜联旧伴归城重聚"],[7,226450618,226450618,"暗联双师得知重伤"],[8,226450619,226450619,"圣光拔邪神匠苏醒"],[9,226450619,226451218,"藏身锻甲谋取军权"]]],["圣城陨落篇·第七幕 茶楼密会再访冰火",226450912,226451218,[[1,226450912,226450912,"沈月入议妹妹念故人"],[2,226451028,226451028,"民推墨蓝走入议院"],[3,226451218,226451218,"茶楼密会再开秘境"],[4,226451218,226451218,"八甲展翼穿瘴入谷"],[5,226451218,226451218,"求药失和双龙围客"],[6,226451218,226451218,"金银驯龙重订药约"]]],["圣城陨落篇·第八幕 双龙护菊共分药力",226451218,226451222,[[1,226451218,226451218,"双龙护菊共分药力"],[2,226451218,226451218,"星光夺珠留果续生"],[3,226451218,226451218,"毁灭压草先服一叶"],[4,226451218,226451218,"自然之子引六凶争随"],[5,226451218,226451218,"血誓冰火紫花暂寄"],[6,226451218,226451218,"混元成灵五凶共寄"],[7,226451218,226451218,"心血摘红六灵归种"],[8,226451218,226451218,"药醒隐忆赠花出谷"],[9,226451218,226451222,"复诊议军四路分行"]]],["血神从军篇·第一幕 万里西行沙夜相依",226451222,226460405,[[1,226451222,226460101,"万里西行沙夜相依"],[2,226460103,226460103,"香破虫毒追杀起疑"],[3,226460104,226460106,"盆地劝留两日安顿"],[4,226460105,226460105,"易容应考分职东海"],[5,226460106,226460106,"哭电唤返含泪再别"],[6,226460106,226460106,"循位徒步踏入雪山"],[7,226460106,226460113,"徒攀雪峰抵血神营"],[8,226460106,226460405,"连冠搏剑晋海军校"],[9,226460106,226460405,"观云悟拳北疆晋校"],[10,226460106,226460405,"南军洗礼败后再励"],[11,226460113,226460113,"哨验荐信选棍入考"],[12,226460113,226460113,"禁魂护考枪杀巴安"],[13,226460113,226460113,"断臂护官止咒终考"],[14,226460113,226460113,"登记入营听规念归"],[15,226460113,226460113,"握赌赢饭满席惊人"],[16,226460113,226460113,"将校看片共评异才"]]],["血神从军篇·第二幕 破格授尉入职特勤",226460114,226460122,[[1,226460114,226460114,"破格授尉入职特勤"],[2,226460114,226460114,"初闻深渊誓守使命"],[3,226460114,226460120,"一周学渊立志自强"],[4,226460120,226460120,"出功入股建龙唐坊"],[5,226460120,226460120,"拳压霸王开域释嫌"],[6,226460120,226460120,"重炼炮管圣匠显技"],[7,226460120,226460120,"揭首劝女改制限功"],[8,226460120,226460121,"大单遇禁转战积功"],[9,226460122,226460122,"购具滑雪初临真渊"],[10,226460122,226460122,"狙蜥入阵龙枪验能"],[11,226460122,226460122,"金语清洞龙枪聚能"]]],["血神从军篇·第三幕 闻潮疾退血心接防",226460122,226460128,[[1,226460122,226460122,"闻潮疾退血心接防"],[2,226460122,226460122,"开域协军重创黑皇"],[3,226460122,226460122,"血涡塌凝终成龙核"],[4,226460122,226460122,"血刀挡指双营借域"],[5,226460122,226460122,"魅皇袭杀血八再救"],[6,226460122,226460122,"问枪认亲血营同悲"],[7,226460122,226460122,"识无情任编外守责"],[8,226460122,226460122,"深渊百帝前路未解"],[9,226460122,226460128,"七日稳核暂避再战"],[10,226460128,226460128,"功成待衔血九教联"],[11,226460128,226460128,"再探潮退预备固防"]]],["战网破渊篇·第一幕 塔议新赛扩大声势",226460128,226460131,[[1,226460128,226460128,"塔议新赛扩大声势"],[2,226460128,226460128,"入网真录双项报名"],[3,226460128,226460128,"龙核压霸王体验首胜"],[4,226460128,226460128,"夺剑封进远甲取胜"],[5,226460128,226460128,"六拨闻声约定相候"],[6,226460128,226460128,"辞赛求闭师许冲关"],[7,226460128,226460128,"求报遭拒谋造黑甲"],[8,226460128,226460128,"枪净残铠双方便利"],[9,226460128,226460130,"迁坊备赛藤胜首轮"],[10,226460130,226460130,"老唐醒转肯定龙核"],[11,226460130,226460131,"知后封险受传王枪"]]],["战网破渊篇·第二幕 原地试枪破甲首捷",226460131,226460218,[[1,226460131,226460131,"原地试枪破甲首捷"],[2,226460131,226460131,"持枪共餐贺友晋校"],[3,226460131,226460131,"教主入渊谋祭神国"],[4,226460201,226460201,"冰域试枪融血胜友"],[5,226460201,226460201,"急探误掷军长释疑"],[6,226460201,226460201,"争才定策共护曙光"],[7,226460201,226460201,"生死分利联手开界"],[8,226460202,226460202,"枪意穿舱再胜刀甲"],[9,226460202,226460216,"双线八胜获准探亲"],[10,226460216,226460217,"两日归家相拥再别"],[11,226460218,226460218,"循环首遇故友让胜"]]],["战网破渊篇·第三幕 三镖困甲召龙取胜",226460219,226460307,[[1,226460219,226460219,"三镖困甲召龙取胜"],[2,226460219,226460219,"闭环练刺约下再战"],[3,226460219,226460219,"蓝皇升天止镖服强"],[4,226460219,226460305,"锻材换教学甲半月"],[5,226460228,226460228,"飞包增舰演习立功"],[6,226460301,226460301,"赛前共议允护复校"],[7,226460302,226460302,"双决之后密议可行"],[8,226460305,226460306,"聚元一夜蓝核凝成"],[9,226460306,226460306,"七叶吐生雪岭萌青"],[10,226460306,226460306,"绮罗成灵红环晋帝"],[11,226460307,226460307,"明言留种重建树心"]]],["战网破渊篇·第四幕 许升上校试白金枪",226460307,226460311,[[1,226460307,226460307,"许升上校试白金枪"],[2,226460307,226460307,"连胜试枪触千夫意"],[3,226460308,226460308,"授校衔请战第九神"],[4,226460308,226460308,"寂灭一爪逼出三甲"],[5,226460308,226460308,"三灵合击赢得血九"],[6,226460309,226460309,"授将星加赛场重任"],[7,226460309,226460309,"误衔起争验环释嫌"],[8,226460309,226460309,"定魂锻约百场陪练"],[9,226460309,226460311,"破十封生翼架天桥"],[10,226460311,226460311,"试翼失控震爆首败"]]],["战网破渊篇·第五幕 借拳锻身连捷入围",226460313,226460322,[[1,226460313,226460313,"问本体获锻身之法"],[2,226460314,226460314,"龙翼急停双拳首捷"],[3,226460314,226460314,"辨元素问灵域门径"],[4,226460314,226460314,"通古释嫌借拳锻身"],[5,226460315,226460315,"双盾回旋震爆破甲"],[6,226460315,226460315,"古娜内争留情拒融"],[7,226460315,226460316,"河畔重聚两日相守"],[8,226460316,226460322,"锻成甲基连捷入循环"],[9,226460322,226460322,"龙吼震爆截翠魔遁"]]],["战网破渊篇·第六幕 咖啡明爱拒留错望",226460322,226460406,[[1,226460322,226460322,"咖啡明爱拒留错望"],[2,226460322,226460322,"探道吞影精神得益"],[3,226460322,226460322,"识魔报功暂禁独探"],[4,226460323,226460323,"暗命渗塔赴使者考"],[5,226460323,226460405,"双枪破冰千夫小成"],[6,226460323,226460323,"九帝许约谋吞世界"],[7,226460326,226460326,"考成预备隐身观赛"],[8,226460326,226460326,"明都识影帝命寻人"],[9,226460406,226460406,"阳血控场破幽灵王"],[10,226460406,226460406,"剑魂斩刀虽败得路"],[11,226460406,226460406,"云涡借势力破修罗"]]],["战网破渊篇·第七幕 看片识强咖啡约敌",226460407,226460410,[[1,226460407,226460407,"看片识强咖啡约敌"],[2,226460407,226460407,"火传入甲悬枪险胜"],[3,226460407,226460407,"画旧容明爱失家思"],[4,226460408,226460408,"恶魔重拳碎甲险胜"],[5,226460408,226460408,"破门探伤及时接护"],[6,226460408,226460409,"鏖战省路暂归整合"],[7,226460408,226460410,"放下错望赌赛邀约"],[8,226460409,226460409,"藏灵绊甲分金取胜"],[9,226460409,226460409,"窗前念古沉志复校"],[10,226460410,226460410,"刀枪相鸣退赛晋决"],[11,226460410,226460410,"悟机辞军奔赴雪岭"]]],["战网破渊篇·第八幕 赔票停网加固换舱",226460410,226460416,[[1,226460410,226460414,"赔票停网加固换舱"],[2,226460411,226460411,"识泡怕扰紫瞳破局"],[3,226460411,226460412,"落锤静心察枪开锋"],[4,226460411,226460411,"空道闻响严令值守"],[5,226460412,226460412,"心鸣破晶拳压翡翠"],[6,226460413,226460415,"换舱问局凝志迎师"],[7,226460415,226460415,"舍臂诱枪智取师兄"],[8,226460415,226460415,"夺冠振军求得先天"],[9,226460415,226460415,"催杀遭拒遣熊西寻"],[10,226460416,226460416,"封隙透雾暗影越界"],[11,226460416,226460416,"长枪迎战骷髅刀盾"]]],["战网破渊篇·第九幕 三灵合阵夺双冠",226460416,226460416,[[1,226460416,226460416,"三灵合阵夺双冠"],[2,226460416,226460416,"魔皇越封血染主道"],[3,226460416,226460416,"节能稳军待机擒皇"],[4,226460416,226460416,"双极限设域擒魔皇"],[5,226460416,226460416,"生命种锁核毁首层"],[6,226460416,226460416,"圣君醒令诸王献祭"],[7,226460416,226460416,"追锁蚁核再灭一层"],[8,226460416,226460416,"九神引灵重开封阵"],[9,226460416,226460416,"过载巨龙惊动黑帝"],[10,226460416,226460416,"自然之子入阵掌潮"]]],["战网破渊篇·第十幕 九邪暴起袭血神",226460416,226460416,[[1,226460416,226460416,"九邪暴起袭血神"],[2,226460416,226460416,"旧九燃命守住阵位"],[3,226460416,226460416,"六草开域引九灵"],[4,226460416,226460416,"王者之路贯杀一王"],[5,226460416,226460416,"青光止火救回旧九"],[6,226460416,226460416,"圣君临封万军借灵"],[7,226460416,226460416,"刀魔师兄登峰见阵"],[8,226460416,226460416,"燃命破封孤注一掷"],[9,226460416,226460416,"银龙合身镇退圣君"],[10,226460416,226460416,"娜儿拒让古月独逝"]]],["战网破渊篇·第十一幕 假刑雪缚逼声求救",226460416,226460503,[[1,226460416,226460417,"假刑雪缚逼声求救"],[2,226460416,226460416,"圣君败后再谋人盟"],[3,226460417,226460417,"醒见残绿获授血龙"],[4,226460417,226460417,"退伍请求改成外派"],[5,226460417,226460417,"灵域通透初生龙威"],[6,226460417,226460417,"龙罡挡弹救双雄"],[7,226460417,226460503,"稳境锻材备好远行"],[8,226460503,226460503,"血龙编队辞别雪山"],[9,226460503,226460503,"合队惊退恐爪熊君"],[10,226460503,226460503,"休营释刀识新射线"]]],["明都归聚篇·第一幕 龙月换车潜入明都",226460503,226460506,[[1,226460503,226460504,"龙月换车潜入明都"],[2,226460504,226460504,"雨雪接任副队长"],[3,226460504,226460504,"惠仁堂验令问政局"],[4,226460504,226460504,"化名古月魂锻换金"],[5,226460504,226460504,"约姐夜行忆旧院"],[6,226460504,226460504,"夜救沈星强制醒酒"],[7,226460505,226460505,"咖啡重逢姐弟泣诉"],[8,226460505,226460505,"无令搜捕四甲尽倒"],[9,226460505,226460505,"军警争人沈星认调"],[10,226460505,226460505,"密谈政局暂缓立旗"],[11,226460506,226460506,"分厢离明重返天斗"],[12,226460506,226460506,"追问泄生姐姐急召"]]],["明都归聚篇·第二幕 归见双师承诺继匠",226460506,226460805,[[1,226460506,226460506,"归见双师承诺继匠"],[2,226460506,226460506,"血祭金水魂锻入甲"],[3,226460506,226460805,"三月贯体融成六金"],[4,226460516,226460516,"耗源复层蝠族续生"],[5,226460621,226460621,"星祭洗礼正宇再进"],[6,226460621,226460621,"星剑断瀑毁光吞流"],[7,226460621,226460621,"时空龙影静对云涡"],[8,226460621,226460621,"星灵入体观台晋圣"],[9,226460622,226460622,"祖父划界许条件援"],[10,226460706,226460706,"先勘旧湖带回影像"],[11,226460708,226460708,"研究建功破格晋位"],[12,226460708,226460708,"密电报研限守秘密"],[13,226460718,226460718,"借龙心换盟扩兽台"]]],["明都归聚篇·第三幕 刀魂醒金九环尊主",226460805,226460808,[[1,226460805,226460805,"刀魂醒金九环尊主"],[2,226460805,226460805,"坦明刀魂仍作伙伴"],[3,226460805,226460805,"刀中记忆告知旧战"],[4,226460805,226460805,"探湖见辐射救副手"],[5,226460805,226460805,"湖底种树回赠生命"],[6,226460805,226460805,"猫虎战罢认出丝朵"],[7,226460805,226460805,"泣拥故人闻众生还"],[8,226460805,226460805,"潜门入所再见白衣"],[9,226460805,226460805,"师徒定计分批入世"],[10,226460805,226460805,"王路断霜师徒验锋"],[11,226460805,226460808,"五强议甲接续锻材"]]],["明都归聚篇·第四幕 无情辞主共推舞麟",226460805,226460808,[[1,226460805,226460805,"无情辞主共推舞麟"],[2,226460808,226460808,"隐息过探深见唐门"],[3,226460808,226460808,"揭财议盟拟使两国"],[4,226460808,226460808,"当仁接任唐门之主"],[5,226460808,226460808,"地下再会龙老内院"],[6,226460808,226460808,"龙老授位面择人课"],[7,226460808,226460808,"双位继任承枪接宝"],[8,226460808,226460808,"迎回正宇再见师长"],[9,226460808,226460808,"圣融三技劈龙留情"],[10,226460808,226460808,"孤注蓄势龙老成全"],[11,226460808,226460808,"咫尺忍见静候冰心"]]],["明都归聚篇·第五幕 七十亿竞得冰心",226460808,226460810,[[1,226460808,226460808,"七十亿竞得冰心"],[2,226460808,226460808,"瀚海入额遥联彼方"],[3,226460808,226460810,"问师得讯急查高城"],[4,226460809,226460809,"银龙映幕遥望哥哥"],[5,226460809,226460809,"以技换资议会否决"],[6,226460810,226460810,"光暗授域真空试压"],[7,226460810,226460810,"车站试肩七怪重逢"],[8,226460810,226460810,"白衣迎归满门泣喜"],[9,226460810,226460810,"议甲定战携兄入门"],[10,226460810,226460810,"三凶瞒主再谋截杀"]]],["明都归聚篇·第六幕 心跳解围金银反控",226460810,226461109,[[1,226460810,226460810,"心跳解围金银反控"],[2,226460810,226460810,"龙老斥傲着甲再战"],[3,226460810,226460810,"诱幕拉回却陷星域"],[4,226460810,226460810,"王路破围擎天碎星"],[5,226460810,226460810,"毁掌暗袭蒸笼拒援"],[6,226460810,226460810,"生命解创法刀定局"],[7,226460810,226461109,"三月合练并造双甲"],[8,226460810,226460810,"两殿定志夯基抗圣君"],[9,226461109,226461109,"借同学伪装越严检"],[10,226461109,226461109,"临航定衡以援止战"]]],["天海风暴篇·第一幕 海风卸责坦言盼家",226461109,226461114,[[1,226461109,226461109,"海风卸责坦言盼家"],[2,226461109,226461109,"海啸护人钻地脱追"],[3,226461109,226461109,"潜所避查谋转战论"],[4,226461109,226461109,"瀚海问责先查雷达"],[5,226461109,226461109,"兄问血龙弟担信任"],[6,226461109,226461109,"假监察揭底真秘说服"],[7,226461109,226461109,"海神令下谋饵引邪"],[8,226461114,226461114,"沉路劫车神梭收货"],[9,226461114,226461114,"多情困凤铃声来援"],[10,226461114,226461114,"法刀裂铃强敌遁走"],[11,226461114,226461114,"毒尸无供瀚海招贤"]]],["天海风暴篇·第二幕 惜才促议两军轮换",226461114,226461115,[[1,226461114,226461114,"惜才促议两军轮换"],[2,226461114,226461114,"旧情作钥催归请龙"],[3,226461114,226461114,"列车遭挟银鳞破惑"],[4,226461114,226461114,"古月设击夺回生路"],[5,226461114,226461114,"入地释疑重逢恩师"],[6,226461114,226461114,"请龙赴海清印惜爱"],[7,226461114,226461114,"山坡一唤瀚海现身"],[8,226461114,226461114,"泪拥悔爱龙拒晚偿"],[9,226461114,226461114,"扣梭一年约换云魂"],[10,226461114,226461115,"传言获诺舆论转邪"]]],["斗灵救亲篇·第一幕 千灵潜海密赴斗灵",226461115,226470116,[[1,226461115,226461115,"千灵潜海密赴斗灵"],[2,226461115,226461115,"瀚海初牵遥远呼唤"],[3,226461115,226470114,"千载入心两月悟时"],[4,226461215,226461215,"魂锻定制蓝皇成甲"],[5,226470114,226470114,"先赴灵波圣灵压傲"],[6,226470114,226470116,"展域寻亲借线拟潜"],[7,226470114,226470114,"塔议藏邪密清研员"],[8,226470116,226470116,"借衣通关惊闻父叫"],[9,226470116,226470116,"抢父毙邪时域初成"],[10,226470116,226470116,"六草护亲破土求医"]]],["斗灵救亲篇·第二幕 血龙失控镇狱毁塔",226470116,226470119,[[1,226470116,226470116,"血龙失控镇狱毁塔"],[2,226470116,226470116,"银龙缠血拔鳞镇魂"],[3,226470116,226470116,"娜述双心古仍沉眠"],[4,226470116,226470116,"冰珠入鳞戒止狂杀"],[5,226470116,226470118,"善后护众皇室噤声"],[6,226470116,226470116,"仙灵护命圣光续生"],[7,226470118,226470118,"域稳归来父息犹存"],[8,226470119,226470119,"晨拥母亲喜备家餐"],[9,226470119,226470119,"血咒再夺团圆将尽"]]],["斗灵救亲篇·第三幕 临别留方揭非亲生",226470119,226470221,[[1,226470119,226470119,"临别留方揭非亲生"],[2,226470119,226470119,"父子相认传无定"],[3,226470119,226470119,"跨界接玉承诺救亲"],[4,226470119,226470119,"醒后藏痛问血仇"],[5,226470119,226470119,"毁塔公告促帝择唐"],[6,226470120,226470120,"主动赴宫回溯立威"],[7,226470120,226470120,"全案签约物资入仓"],[8,226470121,226470214,"海航凝八环炼先天"],[9,226470122,226470221,"证据反击视频反噬"]]],["五神之决篇·第一幕 笑面迎主约夜试手",226470214,226470216,[[1,226470214,226470214,"笑面迎主约夜试手"],[2,226470214,226470214,"金肚银臀困新八环"],[3,226470214,226470214,"白云千载惊笑面"],[4,226470215,226470215,"七怪生还旧友约战"],[5,226470215,226470215,"云访龙求助重逢"],[6,226470215,226470215,"太子初会反被请看器"],[7,226470215,226470215,"重离子穿甲震太子"],[8,226470215,226470215,"藏限度议互援威慑"],[9,226470216,226470216,"入朝见故人候国议"]]],["五神之决篇·第二幕 拒联姻难以爱易国",226470216,226470219,[[1,226470216,226470216,"拒联姻难以爱易国"],[2,226470216,226470216,"五神无龄仍愿迎战"],[3,226470216,226470216,"越洋请示获真放权"],[4,226470216,226470216,"云护其战怒父不退"],[5,226470216,226470218,"公开五神违诺绑唐"],[6,226470216,226470216,"旧敌邀战双队各缺首"],[7,226470216,226470219,"闭关浑圆待五神"],[8,226470217,226470217,"学姐泪迎两队列阵"],[9,226470217,226470217,"断塔合击六怪胜天王"],[10,226470217,226470218,"米酒散芥蒂并肩可期"],[11,226470219,226470219,"借攻断镰蓝皇首胜"]]],["五神之决篇·第三幕 败者守约复盘赢敬",226470219,226470224,[[1,226470219,226470219,"败者守约复盘赢敬"],[2,226470219,226470219,"解说见算计贺胜警强"],[3,226470219,226470219,"首胜带订单声望升"],[4,226470219,226470219,"歪念再求助终被斥"],[5,226470219,226470224,"隐阵药酒谋逼婚"],[6,226470220,226470220,"问候平人心赴魂战"],[7,226470220,226470220,"龙晶赌仙草敌塔出阵"],[8,226470220,226470220,"本命争胜雷狱困金龙"],[9,226470220,226470220,"雷藤倒戈四灵溃败"],[10,226470220,226470220,"破契归身挡袭再胜"],[11,226470220,226470220,"问雷藤离约缘由"],[12,226470220,226470220,"娜入塔藏忧见怨主"]]],["五神之决篇·第四幕 雅陪步行晶赌履约",226470221,226470222,[[1,226470221,226470221,"雅陪步行晶赌履约"],[2,226470221,226470221,"九红出场五行压龙"],[3,226470221,226470221,"双真分战回溯避针"],[4,226470221,226470221,"龙皇镇狱逼五行罩"],[5,226470221,226470221,"罩崩穿胸阻回溯"],[6,226470221,226470221,"临终光幕述母冤"],[7,226470221,226470221,"保魂还珠救回麒麟"],[8,226470221,226470221,"塔令近探娜借机应"],[9,226470222,226470222,"圣光养疲帝允全案"],[10,226470222,226470222,"金刚收枪擎天反胜"],[11,226470222,226470222,"擎天遗光认母回心"]]],["五神之决篇·第五幕 圣灵越限一生祝子",226470222,226470224,[[1,226470222,226470222,"圣灵越限一生祝子"],[2,226470222,226470222,"娜来警塔相拥再别"],[3,226470222,226470222,"极限新变帝改平局策"],[4,226470222,226470222,"药控魔皇密令杀舞"],[5,226470222,226470222,"三母舰潜行压星罗"],[6,226470222,226470222,"极限魂锻铸龙月语"],[7,226470223,226470223,"末战前定归放胜负"],[8,226470223,226470223,"二十八击难撼四字"],[9,226470223,226470223,"血域惊退四字再受轰"],[10,226470223,226470223,"法刀破域五神全胜"],[11,226470223,226470223,"庆五胜先天终大成"],[12,226470224,226470224,"父允科院助留人"]]],["五神之决篇·第六幕 履约交货入宫送别",226470224,226470225,[[1,226470224,226470224,"履约交货入宫送别"],[2,226470224,226470224,"街爆冥域伤笑面"],[3,226470224,226470224,"圣龙援驾神格震冥"],[4,226470224,226470224,"投枪吞骑激怒冥王"],[5,226470224,226470224,"神圣替身迎母退冥"],[6,226470224,226470224,"母释准神忧邪势"],[7,226470224,226470224,"药移寝宫拒迫近"],[8,226470224,226470225,"一夜交融九彩洗身"],[9,226470225,226470225,"公园再别魂核初双"],[10,226470225,226470225,"坦告母亲释情疑"]]],["归海复院篇·第一幕 提前辞星罗潜艇归",226470225,226470225,[[1,226470225,226470225,"提前辞星罗潜艇归"],[2,226470225,226470225,"计败帝女放人远归"],[3,226470225,226470225,"归航苦修忽闻警报"],[4,226470225,226470225,"隐艇遣谢探舰报国"],[5,226470225,226470225,"借海底地形潜深泥"],[6,226470225,226470225,"三叉引海远察三舰"],[7,226470225,226470225,"传讯露踪震荡坠海"],[8,226470225,226470225,"冰雪围捕借浪脱险"],[9,226470225,226470225,"海拒瀚海反催进军"],[10,226470225,226470225,"惜海弃爆引动风云"],[11,226470225,226470225,"圣灵报危催帝急备"],[12,226470225,226470225,"雷藤吞云舰阵苦撑"]]],["归海复院篇·第二幕 父环封雷九环成真",226470225,226470430,[[1,226470225,226470225,"父环封雷九环成真"],[2,226470225,226470226,"借浪返艇醒定封号"],[3,226470225,226470225,"帝守岸拒试海督备"],[4,226470301,226470301,"出海首试森罗雷狱"],[5,226470301,226470301,"雷鞭破空敲醒谢邂"],[6,226470301,226470301,"只守联攻各悟真身"],[7,226470301,226470430,"长航合练群甲渐成"],[8,226470302,226470302,"追魂一弹退联百里"],[9,226470402,226470402,"明镜预警曹撤血神"]]],["归海复院篇·第三幕 议会定罪封门堵港",226470403,226470603,[[1,226470403,226470502,"议会定罪封门堵港"],[2,226470430,226470430,"闻止战更闻叛国名"],[3,226470503,226470503,"归门受命逆压议复院"],[4,226470503,226470602,"密筹月余晶养湖种"],[5,226470504,226470504,"神梭易残魂授乔装"],[6,226470603,226470603,"假云举枪复院慰亲"],[7,226470603,226470603,"云名退塔群生见日"],[8,226470603,226470603,"鬼塔密联欲再毁院"],[9,226470603,226470603,"物资抵湖中校挡拦"],[10,226470603,226470603,"焚契反落镜头退军"]]],["归海复院篇·第四幕 半月筑罩校友聚力",226470603,226470703,[[1,226470603,226470618,"半月筑罩校友聚力"],[2,226470618,226470618,"夜供九叶缓种枯"],[3,226470619,226470619,"鬼拒助塔另择强援"],[4,226470619,226470619,"潜林寻晶陷四凶围"],[5,226470619,226470619,"星移合攻暂压三兽"],[6,226470619,226470619,"帝指破刀全队溃退"],[7,226470619,226470619,"戟动白云破空离林"],[8,226470619,226470619,"银爪护伴镇服四凶"],[9,226470619,226470620,"七人报失四极暂候"],[10,226470619,226470703,"凡身长路首考过关"]]],["银龙招亲篇·第一幕 借仪式授招亲之计",226470625,226470726,[[1,226470625,226470625,"借仪式授招亲之计"],[2,226470626,226470626,"丈亭献策暗添杀局"],[3,226470627,226470627,"塔许权限娜允设门"],[4,226470627,226470726,"重奖明都招集群英"],[5,226470703,226470703,"返院识局仍定赴会"],[6,226470703,226470703,"冥鬼借盛会锁秘众"],[7,226470707,226470707,"血龙别门重返军团"],[8,226470708,226470708,"蓝电少主乔装入明"],[9,226470708,226470708,"避抱丈亭独对金鳞"],[10,226470708,226470708,"获允留明师授天锻"]]],["银龙招亲篇·第二幕 三锤示范渡劫差一",226470708,226470718,[[1,226470708,226470708,"三锤示范渡劫差一"],[2,226470708,226470708,"首试沉银自引七元"],[3,226470708,226470708,"三金渡雷首成神匠"],[4,226470708,226470708,"关系网暗排九员入围"],[5,226470718,226470718,"玉龙月入场待银龙"],[6,226470718,226470718,"升灵液奖巩塔依赖"],[7,226470718,226470718,"三关满分识蓝佛子"],[8,226470718,226470718,"藏域藏锻让蓝抢先"],[9,226470718,226470718,"雷闪三角炸甲留名"],[10,226470718,226470718,"入万兽台惊鸟不杀"]]],["银龙招亲篇·第三幕 护猿震斧验台生死",226470718,226470718,[[1,226470718,226470718,"护猿震斧验台生死"],[2,226470718,226470718,"梦花毒发黑域反噬"],[3,226470718,226470718,"雄霸连拍雷鞭解危"],[4,226470718,226470718,"救蓝解毒始识女身"],[5,226470718,226470718,"误掌释疑再守三时"],[6,226470718,226470718,"禁湖双王破雷狱"],[7,226470718,226470718,"蓝援破空两人同困"],[8,226470718,226470718,"报真名银爪再夺人"],[9,226470718,226470718,"双王疑亲分守寻人"],[10,226470718,226470718,"台外装忘互救各别"]]],["银龙招亲篇·第四幕 黑甲复演获八级证",226470718,226470802,[[1,226470718,226470718,"黑甲复演获八级证"],[2,226470718,226470718,"银屏撤去仍劝离"],[3,226470719,226470719,"云涡近身败霸火"],[4,226470721,226470721,"雷狱压狼首战胜"],[5,226470721,226470721,"北谷隐阵借赛掩"],[6,226470721,226470801,"合金引劫四胜晋级"],[7,226470801,226470801,"东风求改强敌同组"],[8,226470802,226470802,"百强抽签强敌并列"],[9,226470802,226470802,"双涡雷拳场边冲"],[10,226470802,226470802,"三金成神仍追七金"]]],["银龙招亲篇·第五幕 循环开战兽台收客",226470803,226470804,[[1,226470803,226470803,"循环开战兽台收客"],[2,226470803,226470803,"烤肉未尝急赴湖约"],[3,226470803,226470803,"亲族强索同伴相护"],[4,226470803,226470803,"三招护友甲裂不退"],[5,226470803,226470803,"震天认输收拳余力"],[6,226470803,226470803,"祖孙隔音揭魔门"],[7,226470803,226470803,"缓封半年约归看父"],[8,226470804,226470804,"雾中顿悟龙皇破"],[9,226470804,226470804,"送水护伤慈母疗源"],[10,226470804,226470804,"车中谈子重拾希望"]]],["银龙招亲篇·第六幕 三日沉思七彩入海",226470804,226470813,[[1,226470804,226470806,"三日沉思七彩入海"],[2,226470807,226470807,"兽灵可收暗织控制"],[3,226470808,226470808,"休室争锋怒退丈亭"],[4,226470808,226470808,"雷鞭化臂抽飞黑甲"],[5,226470808,226470808,"指刀观棍招揽军才"],[6,226470808,226470808,"同敌难同路泪别"],[7,226470808,226470810,"悲忆具象返璞归真"],[8,226470813,226470813,"善警受拒怒涡又破"],[9,226470813,226470813,"回溯禁法瞬擒黄沙"],[10,226470813,226470813,"街头逼问跨界擒人"]]],["银龙招亲篇·第七幕 神戟忆影证亲相认",226470813,226470919,[[1,226470813,226470813,"神戟忆影证亲相认"],[2,226470813,226470813,"叔侄互述神界失联"],[3,226470813,226470813,"原恩姓引断魔新法"],[4,226470813,226470813,"母姐影像铭心再返"],[5,226470813,226470813,"双球爆中悟力压胜"],[6,226470813,226470813,"车中揭祖血脉相认"],[7,226470813,226470813,"认可恋人约返族疗父"],[8,226470813,226470919,"月余苦锻八胜待决"],[9,226470815,226470815,"塔主筹学争夺生源"]]],["银龙招亲篇·第八幕 末轮破牌龙皇伤敌",226470913,226470920,[[1,226470913,226470913,"借雷强者模拟备战"],[2,226470919,226470919,"借出摄魂牌作杀备"],[3,226470920,226470920,"末轮聚焦暗藏反击"],[4,226470920,226470920,"承棍吸法穿甲续战"],[5,226470920,226470920,"千龙应召破邪失附"],[6,226470920,226470920,"摄魂杀牌神戟斩灭"],[7,226470920,226470920,"金界寂寞一年成考"],[8,226470920,226470920,"龙皇斩破棍伤祖孙"],[9,226470920,226470920,"双极接车护耗精神"],[10,226470920,226470920,"病榻安抚心系葬龙"]]],["银龙招亲篇·第九幕 龙泪通灵受托复族",226470920,226470925,[[1,226470920,226470921,"龙泪通灵受托复族"],[2,226470921,226470923,"追踪无果布网夺戟"],[3,226470924,226470924,"亮面入场蓝珠求选"],[4,226470924,226470924,"八人退选亮出史唐"],[5,226470924,226470924,"神甲赠爱揭面求婚"],[6,226470924,226470924,"七元封空爱战落败"],[7,226470924,226470924,"银龙择蓝断播成围"],[8,226470924,226470924,"校友齐应陈令放行"],[9,226470925,226470925,"醒知心意仍忧使命"],[10,226470925,226470925,"三方声援罪名未撤"]]],["泰坦魔灾篇·第一幕 筹设湖防分道离明",226470925,226470930,[[1,226470925,226470925,"筹设湖防分道离明"],[2,226470926,226470926,"返乡入祠巨猿认祖"],[3,226470926,226470926,"族谱解误共议诱魔"],[4,226470926,226470927,"精血激潜震天晋准"],[5,226470927,226470927,"解封助父骨肉重聚"],[6,226470930,226470930,"双友合击败于风波"],[7,226470930,226470930,"神匠认名以甲聘师"],[8,226470930,226470930,"拳意入金滤劫赠祖"],[9,226470930,226470930,"举族迁史共建新院"]]],["泰坦魔灾篇·第二幕 血种护灵预设诱杀",226470930,226471001,[[1,226470930,226470930,"血种护灵预设诱杀"],[2,226471001,226471001,"九环诱门迎恶魔君"],[3,226471001,226471001,"圣辉金暴重创魔军"],[4,226471001,226471001,"金枪导生拼护古树"],[5,226471001,226471001,"闭湖接流古树重生"],[6,226471001,226471001,"断尾破阵魔君救命"],[7,226471001,226471001,"三猿合击诛灭魔君"],[8,226471001,226471001,"十四封破金王夺身"],[9,226471001,226471001,"父戟镇狂重固封印"]]],["泰坦魔灾篇·第三幕 本源龙纹晋升超斗",226471001,226471109,[[1,226471001,226471001,"本源龙纹晋升超斗"],[2,226471004,226471004,"断魔分尾辞族返院"],[3,226471004,226471103,"锻台稳境筹甲迎师"],[4,226471004,226471005,"紫眸造假安抚塔疑"],[5,226471005,226471005,"迁居入阁古树延生"],[6,226471008,226471008,"商迁老魔补足教力"],[7,226471009,226471009,"七种植湖获准开界"],[8,226471009,226471009,"八强创界七圣入渊"],[9,226471107,226471107,"以身连核救千科研"],[10,226471108,226471108,"旧友幻训结情留疤"],[11,226471109,226471109,"邀魔入阁定正面策"]]],["双院争锋篇·第一幕 厚奖招新暗设封压",226471116,226471202,[[1,226471116,226471116,"厚奖招新暗设封压"],[2,226471122,226471122,"循旧踪问师寻孜然"],[3,226471125,226471125,"祖仇认亲止死留院"],[4,226471129,226471129,"议会示强请出清风"],[5,226471202,226471202,"门前拉客传媒施压"],[6,226471202,226471202,"假筛选门先择怪物"],[7,226471202,226471202,"雷网落神机卸装逐客"],[8,226471202,226471202,"四字臂拳震退群甲"],[9,226471202,226471202,"塔主压门议八场赌斗"]]],["双院争锋篇·第二幕 阳木三叠斩胜嗜血",226471202,226471202,[[1,226471202,226471202,"阳木三叠斩胜嗜血"],[2,226471202,226471202,"埙声逼近败于脑域"],[3,226471202,226471202,"双极限各取让局分"],[4,226471202,226471202,"活铠抱敌蒸胜拳皇"],[5,226471202,226471202,"星河困魔败于神篷"],[6,226471202,226471202,"门房让局换掉塔主"],[7,226471202,226471202,"禁光将胜惊退翻盘"],[8,226471202,226471202,"枪穿寒韵迫夫认负"],[9,226471202,226471202,"跳双定团双方升空"]]],["双院争锋篇·第三幕 硬承准神古树护还",226471202,226471204,[[1,226471202,226471202,"硬承准神古树护还"],[2,226471202,226471202,"五极亮相迫塔撤离"],[3,226471202,226471202,"幻史炼心改投史考"],[4,226471202,226471202,"心考见效收筛撤门"],[5,226471202,226471202,"百名入学庆宴释重"],[6,226471202,226471202,"压魂储核加固四封"],[7,226471203,226471203,"九钟开学宣教护生"],[8,226471204,226471204,"复名申请引再战压"]]],["战殿取炮篇·第一幕 决取天国联唐筹援",226471204,226471228,[[1,226471204,226471204,"决取天国联唐筹援"],[2,226471205,226471207,"讯报汇集重练潜技"],[3,226471205,226471205,"观星晋封龙老验控"],[4,226471207,226471207,"主任闻弹转怒求同行"],[5,226471207,226471207,"神机试战抱矛护学"],[6,226471207,226471207,"战约传回始知牺牲"],[7,226471207,226471228,"廿一日待讯龙老启程"],[8,226471209,226471209,"空缺高才塔主封口"],[9,226471227,226471227,"重价十催冥帝伏路"],[10,226471228,226471228,"带凌访曹密议闯殿"],[11,226471228,226471228,"冥域围路凌挺身救"]]],["战殿取炮篇·第二幕 劫雷洗死戟控脱围",226471228,226480105,[[1,226471228,226471228,"劫雷洗死戟控脱围"],[2,226471228,226471228,"借身神戟观父迎神"],[3,226471228,226480103,"烙印归来西山设营"],[4,226471229,226471229,"列车求讯揭旧孕恨"],[5,226471230,226471230,"闻子悔约赴史反计"],[6,226471231,226471231,"筛查军务选中沈星"],[7,226480102,226480102,"融会秘法金身晋阶"],[8,226480103,226480103,"姐姐催约沈星赴宴"],[9,226480103,226480103,"替宴施压换三人情"],[10,226480103,226480105,"监听两日换装入营"],[11,226480104,226480104,"先造守星护食魂师"]]],["战殿取炮篇·第三幕 拳退兵痞借乱脱身",226480105,226480105,[[1,226480105,226480105,"拳退兵痞借乱脱身"],[2,226480105,226480105,"雷阻追机推门入殿"],[3,226480105,226480105,"时空穿刺首胜雷炎"],[4,226480105,226480105,"全甲封跳蒸笼再胜"],[5,226480105,226480105,"决绝星陨化茧求剑"],[6,226480105,226480105,"翼逃重锤圣火制毒"],[7,226480105,226480105,"金身压日留面判平"],[8,226480105,226480105,"三言求婚海棠应诺"],[9,226480105,226480105,"约战五人乘台下行"],[10,226480105,226480105,"探场杀蛇记传送阵"]]],["战殿取炮篇·第四幕 四甲对赌两百吨金",226480105,226480105,[[1,226480105,226480105,"四甲对赌两百吨金"],[2,226480105,226480105,"双灵扫林法刀斩龙"],[3,226480105,226480105,"魔琴破防梓晨出局"],[4,226480105,226480105,"越天压枪悟神再创"],[5,226480105,226480105,"星移拆剑泰坦护营"],[6,226480105,226480105,"平局收阵坠向地河"],[7,226480105,226480105,"神戟分涡扶阶渡水"],[8,226480105,226480105,"火人罢战请寻故乡"],[9,226480105,226480105,"火天述灾游子共悲"],[10,226480105,226480105,"收莲许愿火族让路"]]],["战殿取炮篇·第五幕 十八洞天塔敌设伏",226480105,226480407,[[1,226480105,226480105,"十八洞天塔敌设伏"],[2,226480105,226480105,"反局夺弹瀚海辞殿"],[3,226480105,226480105,"真弹入手双极临塔"],[4,226480105,226480105,"剑神破茧拥星归途"],[5,226480105,226480404,"断讯返院三月扫地"],[6,226480105,226480204,"闭关融法五禁成架"],[7,226480105,226480204,"研弹释结新策助甲"],[8,226480108,226480407,"辞帅止战改选复名"],[9,226480108,226480108,"辞职交家再护子掌军"],[10,226480204,226480403,"火净七金改序融锻"],[11,226480403,226480403,"姐妹摊牌还妹选择"]]],["战殿取炮篇·第六幕 万锤自然千锻生灵",226480403,226480704,[[1,226480403,226480403,"万锤自然千锻生灵"],[2,226480403,226480403,"五禁渡劫神甲认主"],[3,226480403,226480403,"闭关出塔听兽台报"],[4,226480403,226480403,"墨蓝问仇阁主缓诺"],[5,226480403,226480403,"虚报军备压住离心"],[6,226480403,226480403,"鬼帝邀降塔主惊疑"],[7,226480403,226480403,"血祭蒙天北地开隙"],[8,226480403,226480704,"潜修成甲湖城复生"],[9,226480404,226480404,"晨练劝和旧侣未释"],[10,226480404,226480404,"清茶议怨龙求无策"],[11,226480413,226480413,"六帝护阵各藏造神计"]]],["战殿取炮篇·第七幕 女劝止戮魔皇掌掴",226480413,226480707,[[1,226480413,226480413,"女劝止戮魔皇掌掴"],[2,226480503,226480503,"合设研院拓文科新路"],[3,226480518,226480518,"本体迁城互守续传"],[4,226480606,226480705,"卜得一线逐子留脉"],[5,226480703,226480703,"抗渊存算清风拒隐"],[6,226480704,226480704,"擎枪为证阁议复仇"],[7,226480704,226480704,"旧侣释怨相约前线"],[8,226480705,226480707,"檄传全陆拒使出城"]]],["极北鏖战篇·第一幕 威压开道两禁破东",226480707,226480717,[[1,226480707,226480707,"威压开道两禁破东"],[2,226480707,226480707,"千古认栽求留后人"],[3,226480707,226480707,"北渊急报暂放私仇"],[4,226480707,226480707,"忍泪撤军塔诺北援"],[5,226480707,226480707,"阁议出援四极护枪"],[6,226480708,226480708,"首师覆没五线急守"],[7,226480708,226480717,"两国应援舰海兼程"],[8,226480709,226480709,"斧裂敌山铃袭军长"],[9,226480709,226480709,"五援救郭圣光守阵"],[10,226480709,226480709,"生命分树诱潮反吞"],[11,226480709,226480710,"空投筑阵黑帝劝降"]]],["极北鏖战篇·第二幕 圣舞覆阵三准退潮",226480710,226480716,[[1,226480710,226480710,"圣舞覆阵三准退潮"],[2,226480710,226480711,"炮逐败军子树复力"],[3,226480711,226480711,"余帅试权拒军议枪"],[4,226480711,226480711,"龙枪吞赞议甲赔偿"],[5,226480711,226480711,"议封新口催军速集"],[6,226480711,226480711,"北行拒劝银王自决"],[7,226480715,226480715,"银枪吞渊探明巨口"],[8,226480716,226480716,"七军聚首嘉奖北军"],[9,226480716,226480716,"双枪争核陈压军议"],[10,226480716,226480716,"双枪分路各怀戒心"],[11,226480716,226480716,"血龙归队分守子树"],[12,226480716,226480716,"拥别暗恋仍难放下"]]],["极北鏖战篇·第三幕 王牌火侦尽殁蜂群",226480717,226480718,[[1,226480717,226480717,"王牌火侦尽殁蜂群"],[2,226480717,226480717,"金身穿蜂引枪开炮"],[3,226480717,226480717,"血河罩起双雄受困"],[4,226480717,226480717,"暗援开缝双雄脱阵"],[5,226480717,226480717,"怨阵真相激起旧恨"],[6,226480717,226480717,"舍出永恒返湖见新生"],[7,226480717,226480717,"惜弹痛哭换血同行"],[8,226480717,226480717,"暗藏克隆复装携弹"],[9,226480717,226480717,"改弹控威密揭险情"],[10,226480718,226480718,"炮压一日塔军谋利"],[11,226480718,226480718,"血河移向西阵催战"]]],["极北鏖战篇·第四幕 雷枪圣舞只换暂缓",226480718,226480718,[[1,226480718,226480718,"雷枪圣舞只换暂缓"],[2,226480718,226480718,"假退逼宫反开敌隙"],[3,226480718,226480718,"银龙镇军迭停迎鬼"],[4,226480718,226480718,"暗卫退镰空间锁破"],[5,226480718,226480718,"灵帝摄魂银鳞反制"],[6,226480718,226480718,"双龙会援退敌情伤"],[7,226480718,226480718,"千古退位银龙掌塔"],[8,226480718,226480718,"认责死守密备反攻"],[9,226480718,226480718,"人形永恒一炮破血河"],[10,226480718,226480718,"破阵救凌续炮清场"],[11,226480718,226480718,"述说脉络人造强者"]]],["极北鏖战篇·第五幕 银金相拥三核破极",226480718,226480802,[[1,226480718,226480718,"银金相拥三核破极"],[2,226480718,226480720,"通道隐去三日寻无踪"],[3,226480720,226480802,"筑防重研奖惩落定"],[4,226480801,226480801,"录影寄子相思盼归"],[5,226480802,226480802,"留强返师护凌养命"],[6,226480802,226480802,"半价重整通话许未来"],[7,226480802,226480802,"拒亭召帝续兽族谋"],[8,226480802,226480802,"重力沉海步过环封"],[9,226480802,226480802,"四九潮锻微控身心"],[10,226480802,226480802,"金龙复苏围杀鲸王"]]],["极北鏖战篇·第六幕 环升获骨冰桥留约",226480802,226480802,[[1,226480802,226480802,"环升获骨冰桥留约"],[2,226480802,226480802,"归海惊见母族尽殁"],[3,226480802,226480802,"神血醒十五封启神元"],[4,226480802,226480802,"银龙示警联军备战"],[5,226480802,226480802,"金殿见亲影听守心嘱"],[6,226480802,226480802,"屡战悟简父抱别开终考"],[7,226480802,226480802,"巨鲸怨雨迫舰瀚海来援"],[8,226480802,226480802,"双线骤袭史唐合军"],[9,226480802,226480802,"隐下余寿再存科研"],[10,226480802,226480802,"灵啸破阵关月分敌"]]],["极北鏖战篇·第七幕 三龙吞军破耗战计",226480802,226480802,[[1,226480802,226480802,"三龙吞军破耗战计"],[2,226480802,226480802,"黑甲救山星光乱敌"],[3,226480802,226480802,"次声初试扫蜂稳外防"],[4,226480802,226480802,"海神燃命独抗真神鲸"],[5,226480802,226480802,"圣光稳核六怪锁三龙"],[6,226480802,226480802,"虚弱染机魔傀抢空"],[7,226480802,226480802,"镜护双炮合军退魔傀"],[8,226480802,226480802,"瀚海伤鲸光暗殉爱"],[9,226480802,226480802,"拔戟归阵独迎魔皇"],[10,226480802,226480802,"银龙夺界灭灵龙全族"]]],["极北鏖战篇·第八幕 魔剑弑姐双凤同陨",226480802,226480802,[[1,226480802,226480802,"魔剑弑姐双凤同陨"],[2,226480802,226480802,"银枪断冥再吞六王"],[3,226480802,226480802,"霜语封刺斩蜂解郁"],[4,226480802,226480802,"情域乱魂冰心拒鬼"],[5,226480802,226480802,"魔皇止战神子认父"],[6,226480802,226480802,"三场死赌逼军议决"],[7,226480802,226480802,"子树议赌密证定心"],[8,226480802,226480802,"增员成约双极留阵"],[9,226480802,226480802,"雅莉释嫌三队定员"],[10,226480802,226480802,"修线备炮赌战临场"]]],["群雄赌战篇·第一幕 封口成约双龙携手",226480802,226480802,[[1,226480802,226480802,"封口成约双龙携手"],[2,226480802,226480802,"断臂守阵天琴引杀"],[3,226480802,226480802,"刹那神刺诛黑赠枪"],[4,226480802,226480802,"凶狼锁命同爆魔帝"],[5,226480802,226480802,"帝剑灭蜂七神悼胜"],[6,226480802,226480802,"古树出水七魔筹岛"],[7,226480802,226480802,"混队压敌智格分战"],[8,226480802,226480802,"三燃净鬼叶魂归枪"],[9,226480802,226480802,"金身泰坦连诛三王"]]],["群雄赌战篇·第二幕 阳木刀传警智谋未消",226480802,226480802,[[1,226480802,226480802,"阳木刀传警智谋未消"],[2,226480802,226480802,"血咒同灭东风护孤"],[3,226480802,226480802,"长空舍境冰封化帝"],[4,226480802,226480802,"刻冰悼师刀讯揭谋"],[5,226480802,226480802,"残躯斩冥两胜未终"],[6,226480802,226480802,"星链合九转阵诛王"],[7,226480802,226480802,"星反借戟破神腰"],[8,226480802,226480802,"双龙临神断烈受劫"],[9,226480802,226480802,"龙神降临持环追魔"]]],["神王收网篇·第一幕 龙皇耀毁魔女挡刃",226480802,226480804,[[1,226480802,226480802,"龙皇耀毁魔女挡刃"],[2,226480802,226480802,"夺躯杀女圣君临世"],[3,226480802,226480802,"圣君夸局兽潮再开"],[4,226480802,226480802,"龙神再战唤骨龙军"],[5,226480802,226480802,"剖心扫军子树枯"],[6,226480802,226480802,"双极献命叠空封渊"],[7,226480802,226480802,"断肠红重塑龙心"],[8,226480803,226480803,"墨蓝止溃议会凝心"],[9,226480803,226480804,"爱定龙心再解十六封"],[10,226480804,226480804,"公映战况举国助威"],[11,226480804,226480804,"万众呼声古树援阵"]]],["神王收网篇·第二幕 银王明言禁开末封",226480804,226480903,[[1,226480804,226480804,"银王明言禁开末封"],[2,226480804,226480804,"人间炮火梓晨殉身"],[3,226480804,226480804,"古树护龙莲火伤神"],[4,226480804,226480804,"诸帝重临碧蛇殉口"],[5,226480804,226480804,"移舰极北炮援解危"],[6,226480804,226480804,"圣君谋躯海神留魂现"],[7,226480804,226480804,"昊锤碎圣祖孙相认"],[8,226480804,226480804,"群英复生旧愿有别"],[9,226480804,226480804,"七彩雨别祖梓晨归凡"],[10,226480804,226480903,"永恒树冠重建天空城"]]],["神王收网篇·第三幕 六怪研阵拟抗神敌",226480804,226480904,[[1,226480804,226480903,"六怪研阵拟抗神敌"],[2,226480819,226480819,"失炮伤情再立研究"],[3,226480819,226480819,"援舰载礼云儿别情"],[4,226480903,226480903,"扫地旧侣重得青春"],[5,226480903,226480903,"双极再比无情心破"],[6,226480903,226480903,"圈禁丈亭清扫旧塔系"],[7,226480903,226480903,"兽王辞殉主上定谋"],[8,226480903,226480903,"树顶谈婚订衣悼师"],[9,226480904,226480904,"墨蓝执杖提出新政"]]],["金银永冻篇·第一幕 晨别老陈独赴求婚",226480904,226480904,[[1,226480904,226480904,"晨别老陈独赴求婚"],[2,226480904,226480904,"天使星戒晨光互许"],[3,226480904,226480904,"小剑炼戒星澜允婚"],[4,226480904,226480904,"虚殒双戒原恩识戏"],[5,226480904,226480904,"树冠祝婚父终让步"],[6,226480904,226480904,"花海求婚戴戒相推"],[7,226480904,226480904,"银枪断花万兽临世"],[8,226480904,226480904,"银王述仇揭控魂种"],[9,226480904,226480904,"使命召唤众强失心"],[10,226480904,226480904,"查种无解杀念逼心"]]],["金银永冻篇·第二幕 墨蓝调军梓晨筑防",226480904,226480909,[[1,226480904,226480907,"墨蓝调军梓晨筑防"],[2,226480906,226480906,"胜势之下论人兽未来"],[3,226480906,226480906,"姐弟相拥勇敢再起"],[4,226480909,226480909,"两军列阵议长独往"],[5,226480909,226480909,"五约苛求留一时议"],[6,226480909,226480909,"三轮减约先战旧侣伴"],[7,226480909,226480909,"八伴合阵龙皇留杀"],[8,226480909,226480909,"雷鞭救伴撤杀魂令"],[9,226480909,226480909,"玄圆化围先擒神枪"],[10,226480909,226480909,"四灵破卷再撤毁技令"],[11,226480909,226480909,"双枪交锋旧情映天"]]],["金银永冻篇·第三幕 赌忆尽明仍言不悔",226480909,226581009,[[1,226480909,226480909,"赌忆尽明仍言不悔"],[2,226480909,226480909,"龙心破定金枪让命"],[3,226480909,226480909,"幻杀双极诱枪穿心"],[4,226480909,226480909,"银龙托种求两族生"],[5,226480909,226480909,"双心同贯永冻北境"],[6,226480909,226480909,"人兽解兵联会议和"],[7,226480909,226580908,"位面升格四老破百"],[8,226481009,226481009,"三国立约重开星斗"],[9,226581009,226581009,"天空城成三贤留像"]]]]},{"名":"斗4","前史篇":"终极斗罗前史篇","前史":[["终极斗罗前史篇·第一幕 太古双星与龙神家业",-300999999899,-949999899,[[1,-300999999899,-300999908769,"少年受护只恋普通龙女"],[2,-19999999899,-19999999899,"天养得神界助长"],[3,-9999999899,-9999999899,"天养分星尝试升维"],[4,-999999899,-999999899,"龙神建界赋九王权柄"],[5,-999999899,-999999899,"牵妻登座怒诛流言者"],[6,-999989899,-999989899,"寄生开智授园职"],[7,-999989899,-999989899,"培金煌木未达预想"],[8,-949999899,-949999899,"神王战后绝蓝凤源"]]],["终极斗罗前史篇·第二幕 远古族群与神星愿景",-899999899,-99999899,[[1,-899999899,-899999899,"猎龙强族遭两界剿"],[2,-669999899,-669999899,"父母看泡取名秀秀"],[3,-659999899,-659999899,"冰海自取冻千秋"],[4,-499999899,-499999899,"兽王合镇吃龙灾"],[5,-499999899,-499999899,"强孕生子主母命尽"],[6,-100008769,-100008769,"严父育储太子愿护终身"],[7,-99999899,-99999899,"天马血战夺星系统领"]]],["终极斗罗前史篇·第三幕 太子陨落龙族分裂",-99999899,-98999895,[[1,-99999899,-99999899,"时空乱典太子被吞命尽"],[2,-99999899,-99999899,"怒杀时空众神围挡狂王"],[3,-99999899,-99999899,"光暗托族同死水龙先殁"],[4,-99999899,-99999899,"法刀护主引发神界大战"],[5,-99999895,-99999895,"龙神败前抛虫求生"],[6,-99999895,-99999895,"燃命稳界请剑分金银"],[7,-99999895,-99999895,"残龙舍命稳住漂流界"],[8,-98999895,-98999895,"流落矿星以涎换食"]]],["终极斗罗前史篇·第四幕 龙变双星各走升维路",26310101,160000101,[[1,26310101,126301231,"空间重叠万年龙变"],[2,26310101,26310101,"遗蛋得星能火龙破壳"],[3,26570815,26570815,"海神复双兽授神官"],[4,26570816,26570816,"借锤悟力完善神拳"],[5,126310101,126310101,"改星结盟禁龙越门"],[6,127301230,127301230,"天养育第三核触高维"],[7,127301231,127301231,"双星强者分禁天养"],[8,159990101,159990101,"分出本体假死蒙法则"],[9,160000101,160000101,"深红裂出吞噬位面"]]],["终极斗罗前史篇·第五幕 神家失散双王冰封",225250719,326310102,[[1,225250719,225250719,"死神复仇败落后合界"],[2,226250719,226250719,"毁灭叛乱后双王留种"],[3,226250719,226250719,"母吞金王恶念隐下重伤"],[4,226410408,226410408,"取核心令残界更不稳"],[5,226410411,226440610,"入残界葬千龙获彩链"],[6,226420411,226420411,"旧寻龙墓见故主遗骨"],[7,226470715,226470715,"养育舞麟双亲得神官"],[8,226480731,226480731,"引路返海痛失亲族"],[9,226480804,226480804,"本体败亡一缕神识寄鲨"],[10,226480909,226480909,"弃吞金王双双殉情"],[11,226480909,326310102,"双脉核心冰封中育子"]]],["终极斗罗前史篇·第六幕 人类拓星长生暗研",226490101,326500507,[[1,226490101,227481231,"三方议合资源共享"],[2,226500101,226791231,"清风改貌重返塔高层"],[3,233500508,236500507,"屡试核心转寻生物孕养"],[4,236310101,326301231,"殖星赠兽共拓太空"],[5,236500126,246500125,"剿教夺典改体延寿"],[6,236500508,326500507,"改造守史唐孕核九千年"],[7,237480813,250480812,"研神核千年封怒技"],[8,246500126,326500125,"开发脑域存脑固躯"],[9,256310101,256310101,"唐门公开根本功法"]]],["终极斗罗前史篇·第七幕 双星旧争与文明后路",286500112,326500206,[[1,286500112,286500112,"侯失旧爱李叶结连理"],[2,291491213,291491213,"双首争锋张嫁天龙"],[3,296370103,326370102,"三千年挪戟戒附幼子"],[4,296460121,296460121,"五神引泉造宝地"],[5,296480911,296480911,"初战互损扩舰相持"],[6,296490727,296490727,"首座连胜神魔长老"],[7,296491224,296491224,"神火压冰剑终另换"],[8,296500126,326500125,"离塔入部累功掌权"],[9,296500207,326500206,"远航预留文明重生系统"],[10,301490206,301490206,"购联邦神史寻长生途"],[11,303480813,303480813,"禁武毁星震住联邦"],[12,306491213,306491213,"候顾旧情让徒退争"]]],["终极斗罗前史篇·第八幕 婚约神兵与封禁旧人",306491213,326500125,[[1,306491213,306491213,"取真龙血逼成平契婚"],[2,306491213,306491213,"三代炼刀融入赤金玄焱"],[3,311430120,311430120,"前任赴邀识天子果"],[4,316490201,316490201,"旁支受传继圣光位"],[5,316490727,316490727,"双族征服独眼族"],[6,316490727,316490727,"螳螂族归附换粮"],[7,316491224,316491224,"误融天眼泄秘失和"],[8,316500126,326500125,"收教邪武孩子组成暗部"],[9,321451119,321451119,"避极寒举族迁北斗"],[10,321500112,321500112,"本命焱养甲终传子"],[11,323310101,326301231,"冰封标本留待复苏"]]],["终极斗罗前史篇·第九幕 异族秘史与海陆旧战",324960104,326000131,[[1,324960104,324960104,"问心箭逐暗精灵"],[2,325421118,325421118,"剿邪留裔验骨归还"],[3,325460104,325460104,"两舰展威精灵选择投诚"],[4,325490201,325490201,"下龙生异子获傲天育"],[5,325490312,325490312,"动台惊界只得罢手"],[6,325490727,325490727,"联邦母舰歼神魔军"],[7,325491202,325491206,"皇道奇艰难入界"],[8,325491224,325491224,"两族合制太子毁灭甲"],[9,325491224,325491224,"冰封剑高售低价回流"],[10,325930427,325930427,"十神来攻主场败退"],[11,325990201,325990201,"树老融武魂续残寿"],[12,326000131,326000131,"座龙亡故首座不再另择"]]],["终极斗罗前史篇·第十幕 旧友逐院众家离散",326080620,326500119,[[1,326080620,326180619,"任斗天七级返内院"],[2,326120103,326120103,"夺冠毁友遭逐学院"],[3,326120104,326140103,"两年悔悟向旧友歉"],[4,326140103,326340102,"从兵二十年成少将"],[5,326150120,326500119,"转换任期再掌议军权"],[6,326251003,326251003,"海缘择桐拒风雨"],[7,326260103,326260402,"救父求婚错候归人"],[8,326260403,326300103,"执婚逐爱终合离"],[9,326260404,326480610,"隐名守邻执胜负约"],[10,326260409,326260608,"出圣渊两月复心神"]]],["终极斗罗前史篇·第十一幕 异星姻缘与亲情隐痛",326290102,326480608,[[1,326290102,326300101,"琴声化冰结侣归族"],[2,326290503,326300102,"异星结侣强催孕辉"],[3,326290608,326290608,"撞见亲昵婚盟破裂"],[4,326290608,326480607,"孤守星战候旧谅"],[5,326290609,326480608,"隐孕育丁守公平"],[6,326300102,326380101,"藏变育童八岁归星"],[7,326300103,326300103,"弃王位带子归泰坦"]]]],"正篇":[["天罗童年篇·第一幕 冰蛋破壳双亲失忆",326310101,326370102,[[1,326310101,326310102,"极北探出金银纹蛋"],[2,326310101,326310101,"银裙少女解冻失忆"],[3,326310102,326310102,"破壳婴儿测如常人"],[4,326310102,326310104,"三日啼哭化尽残壳"],[5,326310102,326370101,"留院失忆期满待证"],[6,326310104,326310207,"收养命名补办婚证"],[7,326310207,326370102,"迁家育子不再另生"],[8,326310715,326310715,"赶海救起失忆男子"]]],["天罗童年篇·第二幕 童年暗线与远星旧战",326310715,326420304,[[1,326310715,326310715,"久修化人失忆入世"],[2,326310716,326370715,"相伴六年领临时证"],[3,326320305,326350304,"三年强追终获杉心"],[4,326321225,326321225,"引古阴阳育继世鸟"],[5,326330305,326420304,"赌债拖垮星璇一家"],[6,326341118,326341118,"六岁共骨变暗金王"],[7,326351129,326351129,"舰炮迫退高阶龙"],[8,326360126,326380125,"两年植线谋夺巨款"]]],["天罗童年篇·第三幕 双生武魂守秘入学",326370102,326400206,[[1,326370102,326370102,"双掌生草父母守秘"],[2,326370102,326370102,"居家测满魂隐报三级"],[3,326370102,326370103,"梦夜双光暗戒自现"],[4,326370103,326370105,"授功见双环连守三日"],[5,326370206,326370206,"末轮遇郑失史院"],[6,326370207,326400206,"嘴上疏远仍替弟解围"],[7,326370224,326370224,"隐龄入学结怨分班"],[8,326370225,326370225,"首课藏锋反压伤同学"],[9,326370225,326370824,"半年求学魂力停滞"]]],["天罗童年篇·第四幕 期末龙威与初次远航",326370819,326370901,[[1,326370819,326370819,"亲见新星重金签约"],[2,326370824,326370824,"期末水涡消去龙技"],[3,326370824,326370824,"复试触草龙威震昏"],[4,326370824,326370824,"醒后问责挡下关注"],[5,326370824,326370824,"食量激增凝冰通灵"],[6,326370825,326370825,"考优放假叶女致歉"],[7,326370826,326370901,"星际初航感知银光"],[8,326370827,326370827,"星唐揭幕新人倾场"],[9,326370827,326370827,"船上见星母亲倾心"]]],["天罗童年篇·第五幕 博物重逢求作家师",326370902,326370922,[[1,326370902,326370902,"博物偶遇牵动旧忆"],[2,326370902,326370915,"旅中练水筹教师资"],[3,326370902,326370915,"思念扩感寻到孩子"],[4,326370915,326370915,"银龙手办再逢旧识"],[5,326370915,326370915,"九龙示水求作家师"],[6,326370916,326370916,"留书离院监护报警"],[7,326370916,326370922,"七日归航意识学步"]]],["天罗童年篇·第六幕 双血初险娜娜授法",326370923,326371025,[[1,326370923,326370923,"入家授课母亲释疑"],[2,326370923,326370923,"抗压激金双能冲心"],[3,326370923,326370925,"三日编旋暂平危血"],[4,326370925,326370925,"触戒忆戟夜裂长空"],[5,326370926,326370926,"珍筋饱腹教控旋涡"],[6,326370926,326371025,"假中习战开学测低"],[7,326370927,326370927,"半时三唱念曲成名"]]],["天罗童年篇·第七幕 父赴远星枭龙设局",326371025,326380125,[[1,326371025,326371025,"班战十胜金草护身"],[2,326371025,326380124,"枭龙秘布诱敌围捕"],[3,326371025,326380124,"三月强体父行远星"],[4,326380124,326380124,"逆血惊天初练锻体"],[5,326380125,326380125,"母子出游听念跳床"],[6,326380125,326380125,"入库破密反入军围"]]],["天罗童年篇·第八幕 商厦惊变银龙救子",326380125,326380128,[[1,326380125,326380125,"断电劫众逼放使者"],[2,326380125,326380125,"冰盾破碎稚子护母"],[3,326380125,326380125,"凝空碎甲救治伤众"],[4,326380125,326380125,"蓝戟追舰君王潜逃"],[5,326380125,326380125,"劫后问责决心变强"],[6,326380128,326380128,"护生立约允返受查"],[7,326380128,326380128,"留影诀别提前离星"]]],["高能少年篇·第一幕 送师候父高能初考",326380204,326480312,[[1,326380204,326380503,"苦练候父获荐新班"],[2,326380313,326480312,"三方造生舰求星路"],[3,326380319,326380618,"降衔返家女儿复学"],[4,326380319,326380618,"受限执教识千秋"],[5,326380503,326380617,"短讯报安假尽团聚"],[6,326380618,326380618,"拒走军校守住身世"],[7,326380618,326380618,"魂弱神强初测惊师"],[8,326380618,326380618,"借马逐狼赢得青眼"],[9,326380618,326380618,"引猿救同学身受创"]]],["高能少年篇·第二幕 昏儿获救新歌护生",326380618,326380801,[[1,326380618,326380707,"守候昏儿再临惊险"],[2,326380706,326380706,"抵星巡演仍陷迷惘"],[3,326380707,326380707,"昏中巨战红光裂影"],[4,326380707,326380707,"闻痛离台金光护儿"],[5,326380707,326380707,"即兴新歌平息满场"],[6,326380708,326380708,"晨醒呼母脱离重症"],[7,326380708,326380710,"匿名赠票调养出院"],[8,326380711,326380711,"抱子登台歌愈余创"],[9,326380718,326380801,"自择高能全家迁城"]]],["高能少年篇·第三幕 迁城入班三友初识",326380801,326380803,[[1,326380801,326380801,"轻视兽课抛空受惊"],[2,326380803,326380803,"迟到入院住进三三三"],[3,326380803,326380803,"识友垫底仍待合力"],[4,326380803,326380803,"拦饭撞盆全班受罚"],[5,326380803,326380803,"冰控败金双草获认"],[6,326380803,326380803,"双修问路补上迟课"],[7,326380803,326380803,"初入斗罗结队买训"]]],["高能少年篇·第四幕 召来千秋双草定辅",326380803,326380804,[[1,326380803,326380803,"枪快猫逃初配失衡"],[2,326380803,326380803,"护友触门召来千秋"],[3,326380803,326380803,"再召散场金龙破犬"],[4,326380803,326380803,"听召疑师徒同位"],[5,326380803,326380803,"欲验叶武魂却受阻"],[6,326380804,326380804,"门传师声反复验召"],[7,326380804,326380804,"双草试枪推认室长"]]],["高能少年篇·第五幕 迷宫反败三友夺首",326380808,326380909,[[1,326380808,326380808,"识兽善答先下魔王课"],[2,326380808,326380808,"独训彩爆胜后降级"],[3,326380808,326380907,"信问融合月修复级"],[4,326380909,326380909,"偏科四加先获免淘"],[5,326380909,326380909,"碎像藏身以逸待劳"],[6,326380909,326380909,"龙吟反压连破强敌"],[7,326380909,326380909,"佯逃诱转枪破金组"],[8,326380909,326380909,"提前止考逆袭夺冠"]]],["高能少年篇·第六幕 星战拜师极训迎考",326380909,326381209,[[1,326380909,326380909,"问谋收徒秘授舰道"],[2,326380909,326380909,"初乘战机晕极难支"],[3,326380910,326380910,"早餐风波另供珍食"],[4,326380910,326381109,"两月极训体强神疲"],[5,326381109,326381109,"旁验承载严师又加练"],[6,326381209,326381209,"期末观彩精神破阶"],[7,326381209,326381209,"复盘旧败先定攻核"]]],["高能少年篇·第七幕 守擂越阶双师共授",326381209,326381209,[[1,326381209,326381209,"守擂九战鳄龙开胜"],[2,326381209,326381209,"凶鸟再胜险噬召者"],[3,326381209,326381209,"抢先连击迫师调局"],[4,326381209,326381209,"护召舍胜留力待机"],[5,326381209,326381209,"规则加压彩爆破强"],[6,326381209,326381209,"双师共授彩爆实偿"]]],["高能少年篇·第八幕 三年成长星途各异",326381211,326420205,[[1,326381211,326411210,"三年双修藏压境由"],[2,326381211,326411210,"歌神长成改赴天斗"],[3,326390102,326410101,"孤儿工读两年学厨"],[4,326391225,326391225,"龙骑冒险取雷电双灵"],[5,326400206,326400206,"独采晶核报矿得奖"],[6,326400206,326420205,"屡追被拒定胜约"],[7,326400429,326400429,"偷舰寻亲检疫被阻"]]],["高能少年篇·第九幕 同窗旧事与远行前缘",326400904,326451123,[[1,326400904,326400904,"抢亲重伤情敌受重责"],[2,326401219,326401219,"板书拒恋尽弃情书"],[3,326410217,326410217,"售人隐私遭没加罚"],[4,326410806,326410806,"相亲突告白惹凌怒"],[5,326410808,326410808,"拟神舰图未能造实"],[6,326411119,326411119,"战友舍臂救回宝川"],[7,326411124,326451123,"匿名贵宾年年护场"],[8,326411130,326411130,"拒提前招携友赴考"]]],["高能少年篇·第十幕 少年驾机金龙破舰",326411210,326411214,[[1,326411210,326411210,"获假归家急订天斗"],[2,326411210,326411210,"双师争路各寄期望"],[3,326411211,326411213,"同船远行半途遭袭"],[4,326411213,326411213,"少年请战首驾真机"],[5,326411213,326411213,"极速双杀喜中落网"],[6,326411213,326411213,"金龙救网踏舰逆光"],[7,326411213,326411213,"凯归难瞒护亲缘由"],[8,326411214,326411214,"六舰失联罪首问责"]]],["高能少年篇·第十一幕 天斗重逢双黄破关",326411219,326411222,[[1,326411219,326411219,"问讯守秘接机交错"],[2,326411219,326411219,"久别拥师撞出误会"],[3,326411219,326411219,"报复越界湖战逐逃"],[4,326411219,326411219,"追至门前挨打认错"],[5,326411219,326411219,"揭考名再论彩血路"],[6,326411219,326411219,"双血暴涌护法融关"],[7,326411219,326411219,"双黄自生火控惊心"],[8,326411219,326411219,"逆旋水火示范爆融"],[9,326411220,326411222,"短假授步送别拒测"],[10,326411222,326411222,"银鳞留坐标续召唤"]]],["史莱克海选篇·第一幕 返校初测攀壁寻机",326411224,326420102,[[1,326411224,326411227,"返校亮环再争授业"],[2,326411227,326411229,"两师分时极训候测"],[3,326411230,326411230,"骨龄揭小初测通关"],[4,326420102,326420102,"海选动员三人成组"],[5,326420102,326420102,"攀壁分组识龙攻律"],[6,326420102,326420102,"峰顶绝路藏腹避雨"],[7,326420102,326420102,"二阶段险跳假岩浆"],[8,326420102,326420102,"复刻翠鸟双杀巨龙"],[9,326420102,326420102,"舍提前录三友重聚"]]],["史莱克海选篇·第二幕 海选夺魁魂骨让友",326420102,326420103,[[1,326420102,326420102,"藏双杀条件结联盟"],[2,326420102,326420103,"战后悟力深冥两日"],[3,326420103,326420103,"两万高分天罗夺魁"],[4,326420103,326420103,"醒测灵海双师再辩"],[5,326420103,326420103,"独留徒弟自揭逐院"],[6,326420103,326420103,"愿托舰道被季拆招"],[7,326420103,326420103,"联邦夺首候抽大奖"],[8,326420103,326420103,"转盘停步各获大奖"],[9,326420103,326420103,"愿让魂骨反获适配"],[10,326420103,326420103,"金草压骨助锋升阶"]]],["史莱克海选篇·第三幕 结伴魔猿反杀追敌",326420105,326420110,[[1,326420105,326420105,"森林首日稳探积累"],[2,326420106,326420106,"夺芝借猿结伴取分"],[3,326420106,326420106,"诱豹围空合杀复仇"],[4,326420106,326420106,"提前付芝还骨护猿"],[5,326420107,326420108,"围枝别猿蓄分待机"],[6,326420109,326420109,"围狮遭袭两友陷落"],[7,326420109,326420109,"援叶速战翠鸟双杀"],[8,326420109,326420109,"抢分翻脸断友淘汰"],[9,326420109,326420110,"猿来践约藏树察敌"]]],["史莱克海选篇·第四幕 末日混战彩爆保分",326420111,326420111,[[1,326420111,326420111,"末日议险分敌三组"],[2,326420111,326420111,"议价未成纽扣阻军"],[3,326420111,326420111,"诱分九人截杀取分"],[4,326420111,326420111,"雷击重创戒戟救命"],[5,326420111,326420111,"留门召秋许三条件"],[6,326420111,326420111,"冰雾破刀压雷救援"],[7,326420111,326420111,"银草助冰爆杀耀阳"],[8,326420111,326420111,"留钱保分彩爆谢幕"],[9,326420111,326420111,"舱外对质师责两人"],[10,326420111,326420111,"双师争论心性底线"],[11,326420111,326420111,"再夺冠军独接加考"]]],["史莱克海选篇·第五幕 加考问心同赴险途",326420111,326420121,[[1,326420111,326420111,"树藏候考冒险救秋"],[2,326420111,326420111,"双增凝视冻虎同逃"],[3,326420111,326420111,"善恶问命互选对方"],[4,326420111,326420111,"复赛获准双增失败"],[5,326420111,326420111,"再见问安约赴史院"],[6,326420112,326420121,"魔王十日威压特训"],[7,326420118,326420118,"承五灵合光再觉醒"]]],["史莱克海选篇·第六幕 结盟入塔共退树妖",326420123,326420123,[[1,326420123,326420123,"塔前释敌握手结盟"],[2,326420123,326420123,"初战越令立指挥权"],[3,326420123,326420123,"金银适配低耗合队"],[4,326420123,326420123,"冰火穿枝合猎入夜"],[5,326420123,326420123,"树海围夜反向寻妖"],[6,326420123,326420123,"凝视截防雷枪破树"],[7,326420123,326420123,"穿胸护友守得树能"],[8,326420123,326420123,"同退续盟获补门票"],[9,326420123,326420123,"两友紫环收留金魔"]]],["史莱克考核篇·第一幕 远航母星生命亲和",326420124,326420206,[[1,326420124,326420130,"余日压训送别登船"],[2,326420130,326420206,"长航复元思定双路"],[3,326420130,326420130,"父母忧秘仍认亲子"],[4,326420206,326420206,"初临母星生命相亲"],[5,326420206,326420206,"树潮喷涌长者寻因"],[6,326420206,326420206,"转机同盟共盼入院"],[7,326420206,326420206,"入城见树安顿候检"],[8,326420206,326420206,"生命灌脉彩核重塑"],[9,326420206,326420206,"再修不变长高少食"]]],["史莱克考核篇·第二幕 体测真擂三环逆胜",326420207,326420208,[[1,326420207,326420207,"抽血测魂假警验神"],[2,326420207,326420207,"血吞生命惊动院长"],[3,326420207,326420207,"封魂负重携友撑满"],[4,326420207,326420207,"反应收测兄弟立志"],[5,326420207,326420207,"借房试招熟悉新身"],[6,326420208,326420208,"琴秋现身初识双姝"],[7,326420208,326420208,"真擂抽签首逢强队"],[8,326420208,326420208,"海潮失灵三环逆胜"],[9,326420208,326420208,"观强者争锋再立志"],[10,326420208,326420208,"同议锁箭寻敌破绽"],[11,326420208,326420208,"考官议海压提复测"]]],["史莱克考核篇·第三幕 分科拼命携友入围",326420208,326420211,[[1,326420208,326420208,"季讲徽章劝各走路"],[2,326420209,326420209,"个考将分各担前途"],[3,326420209,326420209,"任海浪复证被动压"],[4,326420209,326420209,"银辅合海龙惊考官"],[5,326420209,326420209,"舍热门独选星战驾"],[6,326420209,326420209,"倾心自由双机待战"],[7,326420209,326420209,"巧驾连杀遭僚机坑"],[8,326420209,326420209,"断骨执枪撑过意志"],[9,326420209,326420209,"归馆报喜等来伤友"],[10,326420210,326420210,"信有真险仍结八盟"],[11,326420211,326420211,"生命光影入海增亲"],[12,326420211,326420211,"争生触旧情换让步"]]],["史莱克考核篇·第四幕 双阳试炼九人合猎",326420212,326420212,[[1,326420212,326420212,"登舰听清殖星真相"],[2,326420212,326420212,"沉睡远航落双阳星"],[3,326420212,326420212,"攀草落地立十份约"],[4,326420212,326420212,"尾随拾晶识蓝阳险"],[5,326420212,326420212,"三角围猎引怪逼弓"],[6,326420212,326420212,"琴禁双雕冰控合杀"],[7,326420212,326420212,"还晶纳辉护夜守秘"],[8,326420212,326420212,"分工连猎赢得安稳"]]],["史莱克考核篇·第五幕 猿王破围九人归营",326420213,326420215,[[1,326420213,326420213,"止贪备粮谋第三日"],[2,326420213,326420213,"谷边表决分粮探林"],[3,326420213,326420213,"群冻六猿各破双首"],[4,326420213,326420213,"收晶未退猿王骤袭"],[5,326420213,326420213,"叠雷冰凰拼穿双阳"],[6,326420213,326420213,"合熊锁臂借戟穿首"],[7,326420213,326420213,"遥感惊绪察无危机"],[8,326420213,326420213,"疲军留地护伤待夜"],[9,326420213,326420213,"夜变泄密同伴守诺"],[10,326420213,326420214,"丘陵守成重订分配"],[11,326420215,326420215,"全员归营九人入围"],[12,326420215,326420215,"拒拆紫徽统筹分利"],[13,326420215,326420215,"疑航报喜听师临别"]]],["稀奇战队篇·第一幕 正式入院三友择师",326420216,326420217,[[1,326420216,326420216,"师先辞去新生正录"],[2,326420216,326420216,"合款入墅见修炼阵"],[3,326420216,326420216,"拜会唐师立夺首约"],[4,326420216,326420216,"探血换徽借来黑木"],[5,326420216,326420216,"索药债逼出嫡传师"],[6,326420216,326420216,"跪团感海受院长教"],[7,326420216,326420216,"黑徽撑体逆引化魂"],[8,326420216,326420217,"跪极失稳一滴救海"]]],["稀奇战队篇·第二幕 首课明责初争生命徒",326420217,326420217,[[1,326420217,326420217,"首课明罚立斗铠志"],[2,326420217,326420217,"轮值领班再赴兑换"],[3,326420217,326420217,"贵宾识兄听清寄售"],[4,326420217,326420217,"付黄送审双生新法"],[5,326420217,326420217,"折徽入湖试转生命"],[6,326420217,326420217,"争徒惊阁雷挡树迁"],[7,326420217,326420217,"满湖醒夜师伤催返"]]],["稀奇战队篇·第三幕 怪队初登越阶斗魂",326420218,326420218,[[1,326420218,326420218,"兑币新惠促五人盟"],[2,326420218,326420218,"匿名过审注册怪队"],[3,326420218,326420218,"双人破五滚币试阶"],[4,326420218,326420218,"示弱近剑冰火穿心"],[5,326420218,326420218,"双女越阶再押团战"],[6,326420218,326420218,"隐注求让改赌卸铠"],[7,326420218,326420218,"借盾避爆破甲去四"],[8,326420218,326420218,"五行吞攻连败两友"]]],["稀奇战队篇·第四幕 一箭惊场双武获诊",326420218,326420224,[[1,326420218,326420218,"双辅醒弓一箭惊场"],[2,326420218,326420218,"惊退求医封片议售"],[3,326420218,326420218,"诊辉受礼拒被认师"],[4,326420218,326420218,"分账封片薄利待售"],[5,326420218,326420218,"如意聚生润骨压魂"],[6,326420218,326420218,"失利哭诉换来友借"],[7,326420218,326420224,"周修实进暂邀出城"],[8,326420219,326420219,"挥毁跑车拒绝纠缠"],[9,326420223,326420223,"启航母星信托卿财"],[10,326420223,326420223,"触忆银影痛乱心神"]]],["稀奇战队篇·第五幕 九彩入手各逢异变",326420224,326420225,[[1,326420224,326420224,"课后结伴尝遍烧鸟"],[2,326420224,326420224,"专席受惠学姐指拍"],[3,326420224,326420224,"血震竞席拍下九彩"],[4,326420224,326420224,"送秋归舍疑问唐姓"],[5,326420224,326420224,"十二爆试被迫叫停"],[6,326420224,326420225,"悟伴清心白龙归身"],[7,326420224,326420224,"吹钱开袋惊见活兽"],[8,326420224,326420224,"弃恨立恩白鲨成影"]]],["稀奇战队篇·第六幕 晶核化龙异兽成灵",326420224,326420225,[[1,326420224,326420224,"触晶悲龙融平双血"],[2,326420224,326420225,"十秒变龙执戟裂空"],[3,326420224,326420224,"本源唤兽血印成环"],[4,326420224,326420224,"新环无技反吸宿命"],[5,326420225,326420225,"献币识藤待内院鉴"],[6,326420225,326420225,"借点头换袋悔已迟"],[7,326420225,326420225,"探秋返班双辅失效"],[8,326420225,326420225,"失能保自由苦练机"]]],["稀奇战队篇·第七幕 分职习锻金兽吞湖",326420226,326420226,[[1,326420226,326420226,"问姓藏旧牵手归席"],[2,326420226,326420226,"命金胖子谋喂整湖"],[3,326420226,326420226,"三友分职定下锻造"],[4,326420226,326420226,"惧龙金兽合身增力"],[5,326420226,326420226,"牵手释嫌送到锻社"],[6,326420226,326420226,"恒锤沉银初识锻造"],[7,326420226,326420226,"胖兽吞湖反哺主人"],[8,326420226,326420226,"夜探轩窗龙拳退汪"]]],["稀奇战队篇·第八幕 重逢唐乐凡铁通灵",326420227,326420312,[[1,326420227,326420227,"叔侄重逢凡铁生灵"],[2,326420227,326420227,"暖意引锤初感凡铁"],[3,326420227,326420312,"两周铁锤磨稳新力"],[4,326420312,326420312,"留铁辞轩归释卿疑"],[5,326420312,326420312,"内运龙变破关三紫"]]],["资源星历练篇·第一幕 穷修再赌联手争奖",326420313,326420419,[[1,326420313,326420412,"分时苦修耗尽余资"],[2,326420412,326420412,"穷席议赌再约六战"],[3,326420413,326420416,"卖讯隐阶邀仙扩赛"],[4,326420417,326420417,"联手罢赛争得双奖"],[5,326420417,326420417,"院长重注反看低年"],[6,326420417,326420419,"借奖押己闭队备战"],[7,326420418,326420418,"金兽醒长粗臂利掌"],[8,326420419,326420419,"三地守屏牵念弟子"],[9,326420419,326420419,"临赛售秘翻转盘口"]]],["资源星历练篇·第二幕 雾分强敌神戟定胜",326420419,326460114,[[1,326420419,326420419,"雾分强敌爪破金骨"],[2,326420419,326420419,"双控解围分敌各击"],[3,326420419,326420419,"诱围挥戟连斩四强"],[4,326420419,326420419,"观吼显环忆起金戟"],[5,326420419,326420419,"分利成富获准静修"],[6,326420419,326420419,"庆功龙筋催醒食性"],[7,326420419,326460114,"拒绝孤立奋追前"],[8,326420419,326420419,"再败担责辞班退队"],[9,326420419,326420419,"听退队因收起自满"]]],["资源星历练篇·第三幕 双莲入湖积锻攒甲",326420419,326480630,[[1,326420419,326420419,"合封双莲借徽见心"],[2,326420419,326420419,"银枪百亿压轴流拍"],[3,326420419,326420419,"问湖养莲果香诱派"],[4,326420420,326420420,"骨醒耐战胜者失位"],[5,326420422,326420422,"双莲入湖各增一级"],[6,326420422,326420721,"低调月修稳进学末"],[7,326420701,326480630,"暗随星路枪守无声"]]],["资源星历练篇·第四幕 千锻成材备考聚队",326420721,326420722,[[1,326420721,326420721,"沉银升尺首成千锻"],[2,326420721,326420721,"三成锻锤助杨通灵"],[3,326420722,326420722,"换锤十成攒银备甲"],[4,326420722,326420722,"合款备考果贵止买"],[5,326420722,326420722,"高价夺镯交辉载货"],[6,326420722,326420722,"申请探生另派神监"]]],["资源星历练篇·第五幕 联队采矿冰屋护身",326420723,326420725,[[1,326420723,326420723,"雨格入队主动让令"],[2,326420723,326420723,"真航吸空抵资源星"],[3,326420723,326420723,"五金任务必越险峰"],[4,326420723,326420723,"联队遭卷四翼缓落"],[5,326420723,326420724,"冰屋护矿三十六时"],[6,326420724,326420725,"返营加题备盾再行"]]],["资源星历练篇·第六幕 土灵助关舍身断后",326420725,326420727,[[1,326420725,326420725,"通土止戈越岭识灵"],[2,326420725,326420725,"浓土护法雨格六环"],[3,326420725,326420725,"三盾续命依防撤洞"],[4,326420725,326420725,"舍后护友众出援轩"],[5,326420725,326420727,"腾甲装矿满载而归"],[6,326420727,326420727,"看片释争全班认领"],[7,326420727,326420727,"分矿约甲锻养同伴"]]],["资源星历练篇·第七幕 亲师相见五日整技",326420729,326420802,[[1,326420729,326420729,"接亲迎师湖水洗尘"],[2,326420729,326420729,"触祝忆骨辨鳞识戟"],[3,326420729,326420729,"尽述半年听师正途"],[4,326420729,326420802,"五日整技亲师相伴"],[5,326420802,326420802,"拒作资源择近守徒"]]],["资源星历练篇·第八幕 拍场夺枪银龙退敌",326420802,326420805,[[1,326420802,326420802,"携亲观拍万亿护枪"],[2,326420802,326420802,"树护众客断臂失枪"],[3,326420802,326420802,"银枪归娜逐退劫客"],[4,326420802,326420802,"封场问战神留待查"],[5,326420802,326420802,"雷神试探反失神识"],[6,326420802,326420802,"故人认枪不告旧名"],[7,326420802,326420802,"不愿旧梦再寻代罪"],[8,326420805,326420805,"父母别行娜留同星"],[9,326420805,326420805,"神甲半时尽灭群舰"],[10,326420805,326420805,"研究师一见暗查娜"]]],["全班争额篇·第一幕 全班联名争兽神礼",326420808,326480909,[[1,326420808,326420808,"观灭舰影再问星战"],[2,326420808,326421107,"三月炼矿稳练双甲"],[3,326420815,326480814,"倾徽浸湖六年跟队"],[4,326420910,326480909,"化旧怨苦学获少校"],[5,326421107,326421107,"观礼争额雨格约战"],[6,326421107,326421115,"全班联名愿同进退"],[7,326421110,326421110,"双势作保准兽冲神"],[8,326421115,326421115,"四级锻成借徽押胜"]]],["全班争额篇·第二幕 强控胜雷真戟退骨",326421116,326421118,[[1,326421116,326421116,"冰雪强控截断狂电"],[2,326421116,326421116,"雨格请降两级入班"],[3,326421116,326421117,"内院盯赌欲验心性"],[4,326421117,326421117,"全押之后换己求稳"],[5,326421118,326421118,"通关获准方知兽神"],[6,326421118,326421118,"黑徽谈价只许卸铠"],[7,326421118,326421118,"假戟诱夺真锋留手"]]],["全班争额篇·第三幕 巨款购宝备战刀客",326421118,326421120,[[1,326421118,326421118,"携巨款拒费请师入"],[2,326421118,326421118,"遍览珍品看中灵芝"],[3,326421118,326421118,"借师折扣购宝济友"],[4,326421118,326421118,"闻危险任务仍留后手"],[5,326421119,326421119,"挑丁布阵分宝强身"],[6,326421119,326421119,"胸疤难忘争额报友"],[7,326421119,326421120,"暴血入湖促回血力"]]],["全班争额篇·第四幕 三控断刀连胜还贷",326421120,326421120,[[1,326421120,326421120,"三控断刀再胜四年"],[2,326421120,326421120,"监赌才知余财又尽"],[3,326421120,326421120,"兑胜还贷初悟果效"],[4,326421120,326421120,"挽留太迟仍择温暖"],[5,326421120,326421120,"跨陆急至演水成晶"],[6,326421120,326421120,"两仪见面礼暖冷心"]]],["全班争额篇·第五幕 燃甲融箭强破二铠",326421122,326421123,[[1,326421122,326421122,"五人强攻终逼二甲"],[2,326421122,326421122,"燃甲融箭掷戟判胜"],[3,326421122,326421122,"圣果护伤姐弟渐近"],[4,326421122,326421122,"三十紫换一分钟约"],[5,326421123,326421123,"留约款重排合力阵"],[6,326421123,326421123,"复盘责师暗加观礼"]]],["全班争额篇·第六幕 全班撑时比蒙觉醒",326421123,326421209,[[1,326421123,326421124,"免费湖修终见三甲"],[2,326421124,326421124,"五位合力仍遭拆阵"],[3,326421124,326421124,"比蒙觉醒硬撑强拳"],[4,326421124,326421124,"借身控元反吞黑洞"],[5,326421124,326421124,"时满通关罚毁看台"],[6,326421124,326421124,"胖票补罚巨奖仍留紫"],[7,326421125,326421125,"认外力仍加任务码"],[8,326421125,326421209,"半月白甲摔练求衡"]]],["精灵星篇·第一幕 长航观礼虎王认妹",326421210,326421225,[[1,326421210,326421210,"赴精灵先解迁怒"],[2,326421210,326421210,"登船讲劫与双选"],[3,326421210,326421224,"十五日含果渡三跳"],[4,326421224,326421224,"王亲迎客辉随外婆"],[5,326421224,326421224,"林途初闻宇宙外敌"],[6,326421224,326421224,"白虎闯舍讨挠占床"],[7,326421224,326421224,"虎王隐去惊动众凶"],[8,326421225,326421225,"换果骗盒结虎妹"]]],["精灵星篇·第二幕 安乐双选群兽择人",326421225,326421225,[[1,326421225,326421225,"多方齐入安乐双选"],[2,326421225,326421225,"结网留蛇羽试刀获伴"],[3,326421225,326421225,"增血惊龙转荐刘锋"],[4,326421225,326421225,"群兽奉命至鳞威镇"],[5,326421225,326421225,"众择强伴琴曲空归"],[6,326421225,326421225,"容残猿继约借金刚"],[7,326421225,326421225,"群兽随返众领队惊"],[8,326421225,326421225,"问凤灵遥指翡翠鹅"],[9,326421225,326421225,"鸟越禁约仪式暂缓"]]],["精灵星篇·第三幕 潜湖食果虎化人形",326421225,326421227,[[1,326421225,326421225,"装无辜等来准契"],[2,326421225,326421225,"虎驮入林金眸验血"],[3,326421225,326421225,"潜光暗湖险窒入洞"],[4,326421225,326421225,"众生结契定实验班"],[5,326421225,326421226,"天子果燃血共修"],[6,326421226,326421226,"虎化人形赠果归营"],[7,326421226,326421227,"秘境幻龙择辉伴生"]]],["精灵星篇·第四幕 帝天认主双凶成灵",326421227,326460111,[[1,326421227,326421227,"双龙渡劫托族留生"],[2,326421227,326421227,"忆亲改回白秀秀"],[3,326421227,326421227,"双凶夜访另择学生"],[4,326421227,326421227,"帝天认主藏核沉睡"],[5,326421227,326421228,"翡翠调双武入琴身"],[6,326421227,326421227,"魔后识白鲨约成神"],[7,326421228,326421228,"早餐报喜隐龙登舰"],[8,326421228,326430118,"返航积锻血纹助甲"],[9,326430112,326460111,"刺球苦练求同台"],[10,326430113,326430113,"树循指引暗定传人"]]],["星战实验篇·第一幕 星班立约生命环择主",326430119,326430121,[[1,326430119,326430119,"星战实验班正式立"],[2,326430119,326430119,"班长授飞丁选刺激"],[3,326430119,326430119,"预判隐航追爆幽灵"],[4,326430119,326430119,"秀秀交心许诺相护"],[5,326430119,326430120,"锻金筹赊甲分果"],[6,326430120,326430120,"三紫赊甲全班报名"],[7,326430120,326430120,"坦拒重诺反得命环"],[8,326430120,326430121,"七人服果血脉进化"],[9,326430120,326430120,"红徽破例护命环主"]]],["星战实验篇·第二幕 合练备航天堂星考试",326430121,326490303,[[1,326430121,326430420,"忙学交材三果换黑"],[2,326430304,326490303,"窗外注视促她奋进"],[3,326430420,326430420,"七人磨合显新长技"],[4,326430420,326430420,"院议磨心转问唐门"],[5,326430422,326430422,"分考赞果听真任务"],[6,326430423,326430423,"独领队迎生猛升空"],[7,326430423,326430425,"三日轮驾读透舰册"],[8,326430425,326430425,"邓说星情托救同门"],[9,326430425,326430427,"缴金过洞降天堂星"]]],["星战实验篇·第三幕 黑角受困强闯大黑牙",326430427,326430429,[[1,326430427,326430429,"烤鸡受勒赶抵黑角"],[2,326430429,326430429,"住店忽收脱离考题"],[3,326430429,326430429,"扭臂震店换百十币"],[4,326430429,326430429,"塔问归舰得善意阻"],[5,326430429,326430429,"改谋劫领队闯大黑牙"],[6,326430429,326430429,"双枪试绑定再取炮"],[7,326430429,326430429,"拒付强取逼魂圣挡炮"]]],["星战实验篇·第四幕 毁店脱围押师夺舰",326430429,326430504,[[1,326430429,326430429,"连控幻魔洗劫植装"],[2,326430429,326430429,"破甲毁臂炸店突围"],[3,326430429,326430429,"邓援上车揭暗护"],[4,326430429,326430430,"连封领队据点休整"],[5,326430430,326430502,"屏车出城押邓返舰"],[6,326430502,326430502,"逼取权限首次掌舰"],[7,326430502,326430504,"半自动稳穿折叠洞"]]],["星战实验篇·第五幕 隐舰返家双龙定渊",326430504,326430515,[[1,326430504,326430504,"四弹伏击隐舰脱追"],[2,326430504,326430506,"议收友舰加速归星"],[3,326430506,326430506,"收舰送邓各自跑路"],[4,326430506,326430506,"救邓护生惊知失舰"],[5,326430506,326430506,"借挑战进校终见娜"],[6,326430506,326430506,"各归家门母护熟睡"],[7,326430506,326430506,"娜止疲战携生归宿"],[8,326430506,326430506,"双兽拜主隐去旧痛"],[9,326430507,326430513,"七日闲游重拾家暖"],[10,326430513,326430515,"双龙争海旋珠定渊"]]],["星战实验篇·第六幕 师护约战赢舰归院",326430516,326430517,[[1,326430516,326430516,"十日约战院长迎生"],[2,326430516,326430516,"紫瞳破鼎三元夺胜"],[3,326430516,326430516,"冰潮连变定龙凤"],[4,326430516,326430516,"赠合金换来周课"],[5,326430516,326430516,"吞雷导地破双子"],[6,326430516,326430516,"疗雷伤停赛教稳修"],[7,326430517,326430517,"返院开机师护受询"],[8,326430517,326430517,"陈述脱困转说护舰"],[9,326430517,326430517,"树汪唱和赠舰成礼"],[10,326430517,326430517,"交舰清货购七天翼"]]],["龙源星篇·第一幕 积学成甲假归修家缘",326430519,326490304,[[1,326430519,326451118,"两载半积基成双甲"],[2,326440205,326440205,"被嘲男相暴打折腿"],[3,326450102,326450102,"拒父赴礼独临湖"],[4,326450905,326490304,"落水误会换多年回避"],[5,326451119,326451123,"五日归家谈压境"],[6,326451119,326451121,"无聊试手伤友留陪"],[7,326451119,326451119,"父女合琴暖雪族"],[8,326451119,326451119,"让专利共研神天翼"],[9,326451123,326451123,"返星导师允破迎乐讯"],[10,326451123,326451123,"酒店备演卿争包厢"]]],["龙源星篇·第二幕 双凶化形再探斗天路",326451124,326451128,[[1,326451124,326451124,"五环双凶化龙凤"],[2,326451124,326451125,"四黑成环仙芝固基"],[3,326451125,326451126,"开学再询愿护全班"],[4,326451126,326451126,"登记斗天看难慎选"],[5,326451126,326451126,"两黄换来任务经"],[6,326451127,326451127,"全班共指接龙源"],[7,326451127,326451127,"握手平复失忆痛"],[8,326451127,326451127,"新歌获两方收礼"],[9,326451127,326451127,"白鲨问恩人无忆"],[10,326451127,326451128,"魂锤引路学融锻"]]],["龙源星篇·第三幕 毒星登陆初救友军",326451129,326451211,[[1,326451129,326451211,"十三日航向毒星"],[2,326451211,326451211,"五组分职踏实战"],[3,326451211,326451211,"止怒尾随机甲探"],[4,326451211,326451211,"拾龙尸疑金属命"],[5,326451211,326451211,"剥金斩龙救友军"],[6,326451211,326451211,"天翼探破万龙聚"],[7,326451211,326451211,"七翼载归受征调"],[8,326451211,326451211,"学阵冲锋获军护"]]],["龙源星篇·第四幕 城头守阵狂战险局",326451211,326451211,[[1,326451211,326451211,"暗腐翠舞震军心"],[2,326451211,326451211,"两轮磨阵守长战"],[3,326451211,326451211,"城头四人齐破关"],[4,326451211,326451211,"嗜血狂杀险伤友"],[5,326451211,326451211,"混沌压龙促异变"],[6,326451211,326451211,"变机断后牵八级"],[7,326451211,326451211,"夺晶遇爆红甲救"],[8,326451211,326451211,"认错安抚失亲惧"]]],["龙源星篇·第五幕 均功猎炼湖边托后事",326451212,326451229,[[1,326451212,326451212,"均分立约分队练"],[2,326451212,326451212,"谢将军知升级难"],[3,326451212,326451219,"八日猎炼累积分"],[4,326451219,326451228,"返校获积分双用"],[5,326451224,326451224,"偷入宝洞变骨藏"],[6,326451228,326451229,"留甲修阵湖中眠"],[7,326451228,326451228,"湖边定议催传承"]]],["龙源星篇·第六幕 天翼成名神殿识血",326451229,326451231,[[1,326451229,326451229,"注册三十三天翼"],[2,326451229,326451229,"无援矿探求唐门"],[3,326451229,326451229,"七人入门换全助"],[4,326451229,326451229,"问师知七怪门槛"],[5,326451229,326451229,"英雄殿前礼入唐"],[6,326451229,326451229,"帝醒点破双王血"],[7,326451229,326451229,"露台遥见轩宇影"],[8,326451229,326451229,"遥感亲缘报家音"],[9,326451229,326451231,"授艺租舰再启程"]]],["天翼初航篇·第一幕 伏击海盗隐舰售金",326451231,326460104,[[1,326451231,326451231,"接舰表决劫海盗"],[2,326451231,326460104,"轮岗定翼穿虫洞"],[3,326460104,326460104,"伏击双舰取补给"],[4,326460104,326460104,"暗置灭神重创紫火"],[5,326460104,326460104,"问俘择路售残舰"],[6,326460104,326460104,"荒星入市待评舰"],[7,326460104,326460104,"遇暗精灵止旧怒"],[8,326460104,326460104,"卖舰换金拒奴贩"]]],["天翼初航篇·第二幕 暗探无功归校争额",326460104,326460114,[[1,326460104,326460104,"说族恨请告外婆"],[2,326460104,326460104,"探矿无获及时止"],[3,326460104,326460104,"留针效忠隐舰返"],[4,326460110,326460110,"返校接下争额赛"],[5,326460110,326460110,"六年级重争旧誉"],[6,326460110,326460110,"银门探望再授艺"],[7,326460111,326460111,"唐门核战续军资"],[8,326460111,326460114,"分兵护送暗排阵"]]],["天翼初航篇·第三幕 逐场争锋八比一定",326460114,326460117,[[1,326460114,326460114,"接续神光破反伤"],[2,326460114,326460114,"玉化首箭启二战"],[3,326460114,326460114,"精灵体破玉域"],[4,326460114,326460114,"瞬移毁王犹认负"],[5,326460114,326460114,"看台暗议保星班"],[6,326460114,326460114,"悲喜双剑断蓝草"],[7,326460114,326460114,"龙变胜剑闻声醒"],[8,326460114,326460114,"七人合力定八比一"],[9,326460114,326460117,"问弹备航赴森罗"],[10,326460114,326460114,"七人暗列备选席"],[11,326460114,326460114,"象拳陪练盼内院"]]],["森罗星篇·第一幕 赴森罗双泉识祖缘",326460117,326460122,[[1,326460117,326460121,"抵森罗约试斗兽"],[2,326460121,326460121,"大师兄引见责任"],[3,326460121,326460121,"两掷真戟过杀试"],[4,326460121,326460121,"还环获认入双泉"],[5,326460121,326460121,"双草惊动旧兽王"],[6,326460121,326460121,"约留一月炼金身"],[7,326460122,326460122,"变阵让三人试单"]]],["森罗星篇·第二幕 五人轮战全胜主场",326460123,326460123,[[1,326460123,326460123,"血脉护众迎主场"],[2,326460123,326460123,"四元风暴胜猛犸"],[3,326460123,326460123,"双王认血愿护孙"],[4,326460123,326460123,"诱掌自伤巧败八环"],[5,326460123,326460123,"玉凰净影收第三胜"],[6,326460123,326460123,"麒麟借箭定五比零"],[7,326460123,326460123,"末位担压排斗兽"]]],["森罗星篇·第三幕 斗兽接力末关压轴",326460124,326460124,[[1,326460124,326460124,"闭目辨豹借重刺熊"],[2,326460124,326460124,"锁空破猿双身"],[3,326460124,326460124,"燃甲斩火取四胜"],[4,326460124,326460124,"擒翠翻龙吓青鸟"],[5,326460124,326460124,"狮虎问灵补关退钱"],[6,326460124,326460124,"封魔连射麒麟接八"],[7,326460124,326460124,"狐退鼠伤秀愧交棒"],[8,326460124,326460124,"念翡翠恩让关换将"]]],["森罗星篇·第四幕 龙威破纪录骨洞择伴",326460124,326460124,[[1,326460124,326460124,"龙威退赤破纪录"],[2,326460124,326460124,"六友获骨钱亦留修"],[3,326460124,326460124,"入洞闻骨帝再现"],[4,326460124,326460124,"名灵择骨六友强身"],[5,326460124,326460124,"错信圣龙误融头骨"],[6,326460124,326460124,"旧仆认主讲神灾"],[7,326460124,326460124,"耗血脱骨缔主契"],[8,326460124,326460124,"庆功知备选分工"]]],["森罗星篇·第五幕 树精催药双泉炼身",326460125,326480225,[[1,326460125,326460125,"三滴树精开新望"],[2,326460125,326460125,"三滴凝气催生果"],[3,326460125,326460204,"冰火十一日淬身"],[4,326460204,326460209,"育药换修定新约"],[5,326460209,326460218,"神拳双示习全身力"],[6,326460219,326460223,"返校闻限卸重压"],[7,326460226,326480225,"稳任铸甲共赴毕业"]]],["生命学派篇·第一幕 长修将毕各家藏忧",326460304,326490303,[[1,326460304,326490303,"三年融合练成雨魔"],[2,326470219,326470318,"劝另择伴惹月冷"],[3,326470304,326470304,"师长见证郑杉成婚"],[4,326470317,326480316,"母病严令先毕学"],[5,326470627,326470627,"双神清雾空返失因"],[6,326480211,326480211,"红洞遭袭一死一伤"],[7,326480216,326480216,"混石拍回星耀宝"],[8,326480225,326480225,"姐担主心辉择男"],[9,326480225,326480225,"众徽反哺班长路"],[10,326480225,326480225,"束暴学弟闻龙源疑"]]],["生命学派篇·第二幕 三草护关五红成核",326480304,326480312,[[1,326480304,326480304,"毕锻倾资备五环"],[2,326480304,326480304,"海阁特批三大仙草"],[3,326480304,326480304,"十年求谅未得回声"],[4,326480305,326480309,"航中知守源接金王"],[5,326480305,326480305,"秘研将成筹远测"],[6,326480309,326480312,"仙草护撞五环生核"],[7,326480312,326480312,"幻黑护秘别双泉"]]],["生命学派篇·第三幕 生态舰认主守底牌",326480312,326480316,[[1,326480312,326480312,"山腹揭生态舰密"],[2,326480312,326480312,"翠舰认主双撞试能"],[3,326480312,326480316,"归航知快守舰底牌"],[4,326480312,326480312,"护轩定攻库闻敌谋"],[5,326480312,326480312,"双战止手钱忧迟破"],[6,326480316,326480316,"双师同约盼新教"],[7,326480316,326480316,"独显金环知同光"],[8,326480316,326480316,"延演一周许新歌"]]],["生命学派篇·第四幕 新甲传情共担母病",326480316,326480316,[[1,326480316,326480316,"双龙新甲互名传情"],[2,326480316,326480316,"餐后论责梦琴离席"],[3,326480316,326480316,"追问隐忧抱泪入门"],[4,326480316,326480316,"共担病痛定情约"],[5,326480316,326480316,"借神精华议救母"]]],["生命学派篇·第五幕 火助魂锻旧情复动",326480318,326480320,[[1,326480318,326480318,"两师相见触旧影"],[2,326480318,326480318,"借火通灵首成魂锻"],[3,326480318,326480318,"晚谈血脉试问亲缘"],[4,326480319,326480320,"留独处邀约续双授"],[5,326480319,326480319,"临别索号落笔新歌"],[6,326480320,326480320,"元龙新招受控拆解"],[7,326480320,326480320,"争取毕业考公平"],[8,326480320,326480320,"以入渊求一次原谅"],[9,326480320,326480320,"拒抹果记劝入圣渊"]]],["生命学派篇·第六幕 星战预练巡演寻忆",326480321,326480403,[[1,326480321,326480321,"金遁潜舰借炮反杀"],[2,326480321,326480321,"受命独入高级灵台"],[3,326480325,326480325,"后台忍痛暂止巡演"],[4,326480327,326480327,"三曲寻忆双触心痛"],[5,326480327,326480327,"探忆受伤抱息痛潮"],[6,326480403,326480403,"一滴本源补母命缺"]]],["生命学派篇·第七幕 高级灵台风暴破甲",326480404,326480404,[[1,326480404,326480404,"幻貌持函赴高级台"],[2,326480404,326480404,"幻环过检接入森境"],[3,326480404,326480404,"信息掩护遭神识反攻"],[4,326480404,326480404,"辨镜像试树寻仙源"],[5,326480404,326480404,"杀蝎导能滋长龙核"],[6,326480404,326480404,"四色风暴破三甲"],[7,326480404,326480404,"带创出舱悔争猎场"]]],["生命学派篇·第八幕 逃涡脱塔备考全班",326480404,326480606,[[1,326480404,326480404,"弃涡远遁幻鸟救险"],[2,326480404,326480404,"听蓝鸟血源惊未爆"],[3,326480404,326480404,"巨涡爆裂伤透本体"],[4,326480404,326480404,"借救护出塔再脱身"],[5,326480404,326480407,"湖养三日知毁灵台"],[6,326480407,326480606,"凝心备考留全员路"]]],["生命学派篇·第九幕 毕业夺舰天翼显威",326480607,326480608,[[1,326480607,326480607,"谢师启考撞夺首舰"],[2,326480607,326480607,"冰封诈俘里应夺舰"],[3,326480607,326480607,"借星宫伏击满十舰"],[4,326480607,326480607,"拒露身份约后续合作"],[5,326480608,326480608,"十二翼引雷先破侦"],[6,326480608,326480608,"变甲藏陨联破六舰"],[7,326480608,326480608,"提前过关归舰受嘱"]]],["生命学派篇·第十幕 圣渊认子隐情渐释",326480608,326480611,[[1,326480608,326480610,"拦入险渊破镜认子"],[2,326480610,326480611,"吸本源催简考放行"],[3,326480611,326480611,"全队出渊各藏心波"],[4,326480611,326480611,"问幻求真亲父现身"],[5,326480611,326480611,"留伴解泪各守新缘"]]],["神王核心篇·第一幕 返龙源星深探灰雾",326480612,326480718,[[1,326480612,326480612,"听家变筛五级任务"],[2,326480619,326480623,"投票龙源倾班资备考"],[3,326480619,326480718,"争两强归属转拉子"],[4,326480624,326480627,"汪护返星小宝苏醒"],[5,326480627,326480627,"问灰雾禁用反物质"],[6,326480627,326480629,"三日清龙调虎积功"],[7,326480630,326480630,"隐机探雾遇磁退航"],[8,326480630,326480630,"金遁测敌惊群龙伏"],[9,326480630,326480630,"窥造龙流水线撤报"]]],["神王核心篇·第二幕 神识锁舰娜娜护生",326480630,326480704,[[1,326480630,326480630,"查晶触神识全队禁"],[2,326480630,326480630,"天龙压境一拳碎甲"],[3,326480630,326480630,"九彩破锁接舰远逃"],[4,326480630,326480630,"归舰隔语疑母子"],[5,326480630,326480630,"断翼甩舰坠入恒星"],[6,326480630,326480704,"抵卫星报险返母星"]]],["神王核心篇·第三幕 四方争援再赴恒星",326480704,326480712,[[1,326480704,326480704,"问讯受阻金环带离"],[2,326480704,326480704,"寻牵引科技求母舰"],[3,326480704,326480704,"借殿属说辞争救援"],[4,326480704,326480704,"亮五红环许下三事"],[5,326480704,326480704,"访宿摘帽诉万年爱"],[6,326480704,326480705,"诸方共争获准救援"],[7,326480706,326480712,"乘快舰候第七舰队"]]],["神王核心篇·第四幕 三探火海救回银蛋",326480712,326480712,[[1,326480712,326480712,"登母舰定分层接应"],[2,326480712,326480712,"两探无踪耗尽心神"],[3,326480712,326480712,"末探落空争十分钟"],[4,326480712,326480712,"破十七封银枪镇心"],[5,326480712,326480712,"隔音揭金银龙身份"],[6,326480712,326480712,"深入火海救出银蛋"],[7,326480712,326480712,"银蛋镇住封印恶念"]]],["神王核心篇·第五幕 大悲定志归家认养恩",326480712,326480911,[[1,326480712,326480713,"大悲大喜悟精神门"],[2,326480712,326480713,"封锁神迹追查亲缘"],[3,326480712,326480911,"滤晶藏识暗备反制"],[4,326480713,326480716,"护送返星再立强志"],[5,326480716,326480716,"赠金枪解两亲心结"],[6,326480716,326480716,"问出蛋生惧失亲子"],[7,326480716,326480718,"归家认养恩听身世"],[8,326480718,326480813,"陪亲度假迁居湖畔"]]],["神王核心篇·第六幕 全班录内院独闯血门",326480813,326480814,[[1,326480813,326480813,"全班录内院先赴军"],[2,326480813,326480813,"探父未唤听丁认亲"],[3,326480813,326480813,"入禁库讨得三神怒"],[4,326480814,326480814,"血门独试斩断依赖"],[5,326480814,326480814,"刀筝显技惊内院师"],[6,326480814,326480814,"凝时凋零首破人海"],[7,326480814,326480814,"魂灵护心各破群敌"]]],["神王核心篇·第七幕 血海试炼父枪认亲",326480814,326480820,[[1,326480814,326480814,"血海献祭首过三关"],[2,326480814,326480814,"试怒破甲再戟穿敌"],[3,326480814,326480814,"受训知短全班证志"],[4,326480814,326480814,"枪中留言认父诉爱"],[5,326480814,326480820,"承千夫一周融双脉"],[6,326480814,326480814,"重感子孙调神界归"]]],["第七舰队篇·第一幕 授衔远航全翼入军",326480820,326480911,[[1,326480820,326480820,"授少将率全班登舰"],[2,326480820,326480820,"送翼入军各怀打算"],[3,326480820,326480909,"长航练枪抵七舰队"],[4,326480904,326480904,"一剑问神全身退回"],[5,326480909,326480909,"述职分五组赴龙三"],[6,326480909,326480909,"入训重逢天罗故人"],[7,326480909,326480909,"双考速胜撤常规训"],[8,326480909,326480911,"入新居熟悉舰中城"]]],["第七舰队篇·第二幕 舰队对垒奉令自由侦",326480911,326480916,[[1,326480911,326480911,"领登陆令登记自舰"],[2,326480911,326480913,"随舰跳跃首见千舰"],[3,326480913,326480913,"假断能诱敌雷火反杀"],[4,326480913,326480913,"天马拦龙收权撤军"],[5,326480913,326480913,"忧子留母舰议军途"],[6,326480913,326480914,"领自由侦令隐舰出征"],[7,326480914,326480914,"幻舰诱火双弹灭四舰"],[8,326480914,326480916,"瞒目标定偷晶四人组"]]],["第七舰队篇·第三幕 潜入矿星盗走空之虫",326480916,326480916,[[1,326480916,326480916,"投雷调舰反侧潜星"],[2,326480916,326480916,"借车入罩金遁觅厂"],[3,326480916,326480916,"随魔银车下钻道"],[4,326480916,326480916,"随钻车见银洞源池"],[5,326480916,326480916,"认旧虫留幻带走源头"],[6,326480916,326480916,"误认残舰怒爆晶池"],[7,326480916,326480916,"报毁源获令全不认"]]],["第七舰队篇·第四幕 初潜天龙赌石立身份",326480916,326480918,[[1,326480916,326480918,"全翼潜主星试龙威"],[2,326480918,326480918,"偷史书读双星旧变"],[3,326480918,326480918,"灵锻引商订独家暗控"],[4,326480918,326480918,"两轮押宝揭铅中钛"],[5,326480918,326480918,"龙身压场拒杀收百万"],[6,326480918,326480918,"赴金厢显双属换礼"],[7,326480918,326480918,"编野龙旧梦获招揽"]]],["第七舰队篇·第五幕 拍晶探库嫁祸脱身",326480918,326480922,[[1,326480918,326480918,"两亿竞晶逼出御空"],[2,326480918,326480918,"金遁探库触警前止"],[3,326480918,326480919,"控制旁证收身份拍品"],[4,326480919,326480919,"独赴首都放虫嫁祸"],[5,326480920,326480920,"落皇家身份买书离城"],[6,326480920,326480922,"隐返舰队藏虫报爆"]]],["潜龙双姝篇·第一幕 归院交晶洗礼破六",326480924,326480930,[[1,326480924,326480930,"潜伏获准返校入城"],[2,326480930,326480930,"列席详报交晶换奖"],[3,326480930,326480930,"银蛋前会父定新路"],[4,326480930,326480930,"受领树屋候友择宝"],[5,326480930,326480930,"生命洗礼化龙破六"],[6,326480930,326480930,"湖畔限耗婉辞掌阁"],[7,326480930,326480930,"交虫托父稳七圣渊"]]],["潜龙双姝篇·第二幕 搬灵获准神雷初成",326480930,326481007,[[1,326480930,326480930,"收熔炉血威聚伙伴"],[2,326480930,326480930,"仙地显枪引平契"],[3,326480930,326480930,"宝议搬灵惊动阁员"],[4,326480930,326480930,"唐归主位议准搬灵"],[5,326480930,326480930,"四元入体初成神雷"],[6,326480930,326481001,"两日淬雷悟冒险稳健"],[7,326481001,326481007,"载四十五灵归军炼雷"]]],["潜龙双姝篇·第三幕 殊功授勋再潜天龙",326481007,326481009,[[1,326481007,326481007,"藏灵入环重返龙三"],[2,326481007,326481007,"立殊功晋八级斗天"],[3,326481007,326481007,"提三要求换潜伏支援"],[4,326481007,326481007,"空间小试商议伴龙"],[5,326481007,326481007,"母舰授勋落实三请"],[6,326481007,326481007,"全班誓同进退分果"],[7,326481007,326481009,"重返天龙烙印散灵"]]],["潜龙双姝篇·第四幕 皇家认女暗咒锁身",326481009,326481020,[[1,326481009,326481009,"午宴饮汁稳野龙身份"],[2,326481009,326481009,"龙厅初灌换认义女"],[3,326481009,326481009,"改认亲女暗锁龙力"],[4,326481009,326481009,"查血留咒另择身份"],[5,326481009,326481020,"静候魔醒设店藏身"],[6,326481020,326481020,"魔后全融秀晋八环"],[7,326481020,326481020,"坦白鲨身释报恩心"]]],["潜龙双姝篇·第五幕 金龙公主获骑士保",326481020,326481025,[[1,326481020,326481020,"化姐名蓝金龙入城"],[2,326481020,326481020,"淡龙力尽吸效仍微"],[3,326481020,326481020,"问骑释疑反引险关"],[4,326481020,326481020,"议留两人先撤同伴"],[5,326481020,326481020,"夜送群灵托别共备险"],[6,326481020,326481022,"候三日双验获龙骑保"],[7,326481022,326481022,"定骑座受法服龙果"],[8,326481022,326481025,"果炼先成接回伙伴"]]],["潜龙双姝篇·第六幕 同伴炼血全翼淬体",326481025,326490103,[[1,326481025,326481025,"钱试燃血失败思变"],[2,326481028,326481028,"诱龙吞血两女初炼"],[3,326481028,326481028,"访养母低首谢抚育"],[4,326481029,326481029,"允追蓝催长子练功"],[5,326481029,326481029,"真燃龙血五秒断炼"],[6,326481029,326481104,"接全天翼配植共修"],[7,326481104,326481104,"洞擒幼龙炼血惊来客"],[8,326481104,326481104,"三女拦父龙治伤断爆"],[9,326481104,326481104,"吞父龙全身淬血破境"],[10,326481104,326490103,"沉修两月送尸报功"]]],["升龙逐魁篇·第一幕 神甲龙枪共赴升龙",326490103,326490124,[[1,326490103,326490103,"受神龙甲枪闻赛制"],[2,326490103,326490103,"辨双枪知龙神肋骨"],[3,326490122,326490122,"赴夜宴套讯备启程"],[4,326490123,326490123,"四龙牵辇初见升台"],[5,326490123,326490123,"借御空居区刻退路"],[6,326490123,326490123,"拦翡翠龙扫街疗伤"],[7,326490124,326490124,"赛前遇挑衅识强敌"]]],["升龙逐魁篇·第二幕 双吼夺首先凝神识",326490124,326490124,[[1,326490124,326490124,"千龙升空拍落张梁"],[2,326490124,326490124,"两次龙吼夺升龙首"],[3,326490124,326490124,"龙神回眸激发七彩"],[4,326490124,326490124,"获准争界初凝神识"],[5,326490124,326490124,"改独自冒险为同行"],[6,326490124,326490124,"皇家父子重资留蓝"]]],["升龙逐魁篇·第三幕 认主晋位三胜入围",326490125,326490130,[[1,326490125,326490125,"严程认主立晋中位"],[2,326490125,326490125,"秀首胜后暂歇猎龙"],[3,326490126,326490126,"柱力入拳险杀象龙"],[4,326490126,326490126,"暗冰破圣光再留命"],[5,326490126,326490126,"分升台龙气淬五友"],[6,326490127,326490130,"三胜晋循环闭关候讯"]]],["升龙逐魁篇·第四幕 血契换髓炼体候赛",326490130,326490201,[[1,326490130,326490130,"血签千年换晶髓"],[2,326490130,326490131,"滤晶护秀首次练髓"],[3,326490131,326490131,"三用龙髓加固雷淬"],[4,326490131,326490131,"同组调序约共入界"],[5,326490201,326490201,"罗镧聚神气赠龙液"]]],["升龙逐魁篇·第五幕 循环初战仙气润众",326490201,326490201,[[1,326490201,326490201,"双骑并柱开启循环"],[2,326490201,326490201,"龙神震折影龙一翼"],[3,326490201,326490201,"秀避强敌保全首日"],[4,326490201,326490201,"双人凝液压住争气"],[5,326490201,326490201,"仙气洗七友片刻耗液"],[6,326490201,326490201,"仙灵润枯树再生机"]]],["升龙逐魁篇·第六幕 龙枪杀敌双姝连胜",326490202,326490206,[[1,326490202,326490202,"枪震贯脑杀韶秀"],[2,326490202,326490203,"树下两日遍淬全班"],[3,326490202,326490202,"皇求罗镧保蓝资格"],[4,326490203,326490203,"警告留蓝逐怯战者"],[5,326490203,326490205,"皇督长子勤修求好感"],[6,326490204,326490204,"破土壁再假震逼降"],[7,326490204,326490204,"循恶龙名单再猎三头"],[8,326490204,326490204,"夜谈群神与无战占星"],[9,326490205,326490205,"双震设伏重创五彩龙"],[10,326490205,326490205,"深渊控斧胜铁背狂龙"],[11,326490205,326490206,"疗肩凝精神备战强敌"]]],["升龙逐魁篇·第七幕 六翼血战圣台赐彩",326490206,326490214,[[1,326490206,326490206,"探九彩柱迎四骑观战"],[2,326490206,326490206,"四骑密议核心共鸣"],[3,326490206,326490206,"浴血连撞硬撼六翼"],[4,326490206,326490206,"幻龙卸力镇狱反胜"],[5,326490206,326490206,"血引柱能四骑守进化"],[6,326490206,326490206,"归屋解释显脉布局"],[7,326490206,326490206,"龙神灌体后再启二淬"],[8,326490207,326490209,"末轮让秀三人携手出线"],[9,326490210,326490214,"五日积修换甲秀九环"]]],["升龙逐魁篇·第八幕 组合决赛携手入八",326490215,326490216,[[1,326490215,326490215,"七骑混签组合不得空"],[2,326490215,326490215,"观木克光再见火王刀"],[3,326490215,326490215,"借夫妻云雷淬身反胜"],[4,326490215,326490215,"饱吸七骑再淬全班"],[5,326490216,326490216,"天魔舞破空甲悟灵域"],[6,326490216,326490216,"领八强龙髓约海神缘"]]],["升龙逐魁篇·第九幕 晶骨双奖诸骑议血",326490217,326490219,[[1,326490217,326490217,"剥离厚土双震入四"],[2,326490217,326490217,"见彩威黄急试柱"],[3,326490217,326490218,"晶骨双奖挺进最终战"],[4,326490217,326490219,"骑会争先改共同试血"]]],["升龙逐魁篇·第十幕 燃血苦战瞬移夺魁",326490220,326490302,[[1,326490220,326490220,"十八骑见赌婚与认主"],[2,326490220,326490220,"返火神刀雷拳穿背"],[3,326490220,326490220,"燃血耗尽瞬移夺龙魁"],[4,326490220,326490220,"伤后急返丰隆避锋芒"],[5,326490221,326490221,"认女装急封决赛影像"],[6,326490221,326490221,"借闭关名义集众返航"],[7,326490221,326490221,"十八同滴龙血获四色"],[8,326490221,326490223,"返舰途中议矿材分配"],[9,326490221,326490221,"蓝海顺势认领双龙"],[10,326490222,326490222,"齐天龙败后重蓄"],[11,326490223,326490223,"交全情报请假求实职"],[12,326490224,326490302,"战列编队护送返母星"]]],["内院七怪篇·第一幕 重奖定席植物归乡",326490225,326490302,[[1,326490225,326490225,"淬髓整合终越九环"],[2,326490301,326490301,"累功议重奖暗定后继"],[3,326490301,326490301,"龙情震联邦倾资强者"],[4,326490302,326490302,"植物归乡生命反哺成"],[5,326490302,326490302,"向阁中汇报潜伏成效"],[6,326490302,326490302,"尊子志阁会同允潜伏"],[7,326490302,326490302,"允换鹏舰拓保命支援"],[8,326490302,326490302,"十红徽伴七怪正授"]]],["内院七怪篇·第二幕 亲子团聚彩链赠儿",326490302,326490304,[[1,326490302,326490302,"抱银蛋呼母再拥父"],[2,326490302,326490302,"父析龙墓与成神之机"],[3,326490302,326490302,"父赠彩链唤龙界之门"],[4,326490303,326490303,"认两双亲仍不疏离"],[5,326490304,326490304,"失意候选仍接主持"],[6,326490304,326490304,"七怪叠掌共担挑战"],[7,326490304,326490304,"拥抱里仍守旧情"]]],["内院七怪篇·第三幕 湖上留灯旧情互答",326490304,326490304,[[1,326490304,326490304,"湖上留灯各展心意"],[2,326490304,326490304,"伪装试诺破旧心结"],[3,326490304,326490304,"刀筝交锋被队长叫停"],[4,326490304,326490304,"一盏灯回应多年守护"],[5,326490304,326490304,"坦言未忘等来旧爱"],[6,326490304,326490304,"龙吼回应昊天锤挑战"],[7,326490304,326490304,"湖上拥吻得双亲祝福"]]],["内院七怪篇·第四幕 银龙苏醒万年相逢",326490304,326490304,[[1,326490304,326490304,"银龙破壳回馈古树"],[2,326490304,326490304,"双超神迫塔主改争"],[3,326490304,326490304,"万年重逢却遭一掌"],[4,326490304,326490304,"戒指引痛决定重追"],[5,326490304,326490304,"六年注视换来初回应"],[6,326490304,326490304,"集体灭灯拒绝多情客"],[7,326490304,326490304,"公开告白揭痛遭拒"],[8,326490304,326490304,"劝止追赶另留转机"]]],["内院七怪篇·第五幕 七怪正名轮战内院",326490304,326490304,[[1,326490304,326490304,"七怪正名接受唯一挑战"],[2,326490304,326490304,"六人轮战梦琴守后勤"],[3,326490304,326490304,"比蒙军团撕碎雨魔"],[4,326490304,326490304,"紫晶停爪换两人同退"],[5,326490304,326490304,"紫借召唤添返程坐标"],[6,326490304,326490304,"舍身光刺穿甲伤大师姐"],[7,326490304,326490304,"冰龙双环互救判平"]]],["内院七怪篇·第六幕 箭斩红莲渡劫成神",326490304,326490304,[[1,326490304,326490304,"精灵王借形破万流"],[2,326490304,326490304,"红莲连破精灵攻势"],[3,326490304,326490304,"逆转决死箭换来真言"],[4,326490304,326490304,"天干神针反逼红莲"],[5,326490304,326490304,"天地斩劈莲引出升华"],[6,326490304,326490304,"七色裂桥仍渡劫成神"],[7,326490304,326490304,"见证成神放下称号执念"]]],["内院七怪篇·第七幕 平剑定号亲情相守",326490304,326490305,[[1,326490304,326490304,"红莲判平剑神自退竞争"],[2,326490304,326490304,"神雷撼剑平手定七怪"],[3,326490304,326490304,"林荫同行学会回应"],[4,326490304,326490304,"引伤求近仍须等真心"],[5,326490304,326490304,"向母讲救援与潜伏"],[6,326490304,326490304,"龙核诱动却暂封存"],[7,326490304,326490305,"三餐照护渐开距离"]]],["龙厅雷淬篇·第一幕 双亲护雷接收银鹏",326490305,326490308,[[1,326490305,326490305,"短现七彩再催骑士血"],[2,326490305,326490305,"备器挑金再陪养亲"],[3,326490305,326490305,"接监管令又被嘱拉拢"],[4,326490306,326490306,"七小时出星接银鹏"],[5,326490306,326490306,"兽神献蜕专为小主人"],[6,326490306,326490306,"双重雷劫迫提前试炼"],[7,326490306,326490308,"双亲护持初炼光暗雷"]]],["龙厅雷淬篇·第二幕 独线报军带监潜星",326490308,326490310,[[1,326490308,326490308,"回舰独线直报司令"],[2,326490308,326490308,"九级身份伴机甲重奖"],[3,326490308,326490308,"只一监军定为辉小姑"],[4,326490308,326490310,"带监军再潜天龙星"],[5,326490310,326490310,"暗号验家重布城内外"],[6,326490310,326490310,"闭关掩护中减量淬雷"]]],["龙厅雷淬篇·第三幕 首座召见七彩择主",326490312,326490312,[[1,326490312,326490312,"出关接到首座召令"],[2,326490312,326490312,"问清天龙两会分工"],[3,326490312,326490312,"双龙应召入四色龙雾"],[4,326490312,326490312,"试血只认七彩来主"],[5,326490312,326490312,"罗镧劝厚积再成神"],[6,326490312,326490312,"三徽到手兼藏疑虑"]]],["龙厅雷淬篇·第四幕 龙厅潮涌帝天识墓",326490313,326490725,[[1,326490313,326490313,"宇宙石牵线启龙厅"],[2,326490313,326490313,"群龙力潮几冲破厅"],[3,326490313,326490313,"银鹏独处仍忧儿安危"],[4,326490313,326490313,"帝天辨认龙墓归处"],[5,326490313,326490725,"输龙力助全班淬体"],[6,326490313,326490703,"两轮光暗淬遍全身"],[7,326490313,326490725,"光军定期回舰通报"]]],["龙厅雷淬篇·第五幕 光暗淬体磨应变鳞",326490408,326490725,[[1,326490408,326490408,"打通右臂试出光暗雷"],[2,326490704,326490704,"十秒合雷试出新力"],[3,326490704,326490725,"外雷淬体磨出应变鳞"],[4,326490720,326490720,"神魔王应邀支持统一"],[5,326490724,326490724,"阿宝苏醒恢复神级"],[6,326490724,326490724,"空源承诺换御空支持"]]],["天马会盟篇·第一幕 龙舍遇天养跨门赴会",326490725,326490726,[[1,326490725,326490725,"龙车启程去赴星会"],[2,326490725,326490726,"抵公馆入住龙舍"],[3,326490726,326490726,"天养湖边识破男身"],[4,326490726,326490726,"龙马通道送使团"],[5,326490726,326490726,"天马首座化身迎宾"],[6,326490726,326490726,"宴前探知联研议题"],[7,326490726,326490726,"龙骑暗许引战取晶"]]],["天马会盟篇·第二幕 招亲开擂双姝连胜",326490727,326490727,[[1,326490727,326490727,"金龙公主当众招亲"],[2,326490727,326490727,"邓煦瞳亮四翼守擂"],[3,326490727,326490727,"蓝徒手碎剑开胜"],[4,326490727,326490727,"光暗神雷破橡皮身"],[5,326490727,326490727,"秀秀天魔吞噬破双刀"],[6,326490727,326490727,"空间封锁逼敌落擂"],[7,326490727,326490727,"孤注一掷炸毁魔核"],[8,326490727,326490727,"次座镇怒续开擂战"]]],["天马会盟篇·第三幕 神魔苦斗创毁入身",326490727,326490727,[[1,326490727,326490727,"龙爪爆首再杀神魔"],[2,326490727,326490727,"连场血战拒绝求娶"],[3,326490727,326490727,"自爆逼伤神识抢位"],[4,326490727,326490727,"双重定身反噬魔相"],[5,326490727,326490727,"毁灭入体幻象退敌"],[6,326490727,326490727,"一枚晶石平复毁灭"],[7,326490727,326490727,"创毁隔膜储丹田"]]],["天马会盟篇·第四幕 议政合盟擂战未休",326490727,326490728,[[1,326490727,326490727,"示弱入会静听各族"],[2,326490727,326490727,"首座提联邦神魔杀异议"],[3,326490727,326490727,"神秘传声五族结盟"],[4,326490727,326490728,"闭口归房炼创毁"],[5,326490727,326490727,"潜鲨重联母上定夺舍"],[6,326490728,326490728,"合技变招压退六翼"],[7,326490728,326490728,"九战全胜再收三十晶"]]],["天马会盟篇·第五幕 雷退神魔拒绝求婚",326490728,326490729,[[1,326490728,326490728,"蓝接擂连破两族"],[2,326490728,326490728,"四色雷出神魔退擂"],[3,326490728,326490728,"李亮身份求婚被拒"],[4,326490728,326490728,"双星定下研造基地"],[5,326490728,326490728,"蓝报求婚获次座指点"],[6,326490728,326490729,"神秘声音净化两力"],[7,326490729,326490729,"守满三日收六十余晶"]]],["天马会盟篇·第六幕 深红临会联邦成立",326490729,326490729,[[1,326490729,326490729,"天马骑士压场议政"],[2,326490729,326490729,"深红之母打断表决"],[3,326490729,326490729,"举手通过龙马联邦"],[4,326490729,326490729,"龙天养自陈双星本源"],[5,326490729,326490729,"天养与轩宇约共升维"],[6,326490729,326490729,"双首座拒让双星"]]],["天马会盟篇·第七幕 私信出星百日压境",326490730,326491116,[[1,326490730,326490730,"回天龙留精舍候突破"],[2,326490730,326490730,"晶石闪讯送出密笺"],[3,326490730,326490730,"雨格转信光军上报"],[4,326490730,326490809,"十一日炼成创毁球"],[5,326490809,326491116,"精舍百日双双压境"],[6,326491026,326491026,"幽灵舰队袭基地败"]]],["龙神之路篇·第一幕 七彩劫起帝天献祭",326491116,326491116,[[1,326491116,326491116,"突来雷劫移升龙台"],[2,326491116,326491116,"钟离台引来七彩雷"],[3,326491116,326491116,"父母遥望九彩龙影"],[4,326491116,326491116,"双龙撕裂再合七彩"],[5,326491116,326491116,"帝天献祭挡首九彩"],[6,326491116,326491116,"次座当众力保蓝"],[7,326491116,326491116,"九雷炼躯真成神"]]],["龙神之路篇·第二幕 十年约定双龙成神",326491116,326491123,[[1,326491116,326491116,"罗镧坦陈龙族寿限"],[2,326491116,326491116,"首座应允十年之约"],[3,326491116,326491116,"次座说明深红战因"],[4,326491116,326491123,"传诺安秀感悟龙核"],[5,326491123,326491123,"十二晶助秀备劫"],[6,326491123,326491123,"龙髓入掌识柱中秘"],[7,326491123,326491123,"秀吞雷重聚天蓝身"],[8,326491123,326491123,"深红母子残识相见"]]],["龙神之路篇·第三幕 返城助友再获界令",326491126,326491202,[[1,326491126,326491126,"秀醒后轩归丰隆"],[2,326491126,326491126,"天翼闻败报知轩成神"],[3,326491126,326491126,"七彩神雷淬炼天翼"],[4,326491126,326491126,"轩托防深红再返城"],[5,326491129,326491129,"罗镧传令入龙界"],[6,326491129,326491129,"送植物归舰交五晶"],[7,326491202,326491202,"秀醒凝出天蓝晶"],[8,326491202,326491202,"冰噬试探七彩龙罡"]]],["龙神之路篇·第四幕 龙骨问志得力归来",326491202,326491207,[[1,326491202,326491202,"领御龙术踏入龙界"],[2,326491202,326491204,"泪滴融脉遇红发女子"],[3,326491204,326491204,"龙神骨前表明己志"],[4,326491204,326491204,"巨骨击退暗赠龙力"],[5,326491204,326491204,"龙神核心忽动再静"],[6,326491207,326491207,"七日期满返升龙台"],[7,326491207,326491207,"幻身守舍本体返丰隆"],[8,326491207,326491207,"会务上门告知拍卖"]]],["龙神之路篇·第五幕 领军制案神甲成器",326491207,326491211,[[1,326491207,326491208,"丰隆资助战前置甲"],[2,326491209,326491209,"会中献策领蓝海军"],[3,326491209,326491211,"写成十二种作战预案"],[4,326491211,326491211,"总商会试掌议定双甲"],[5,326491211,326491211,"七类龙王骨合为一甲"],[6,326491211,326491211,"七彩神龙甲渡劫成器"],[7,326491211,326491211,"三类龙骨铸天蓝神甲"],[8,326491211,326491211,"以助修抵债议收费"]]],["龙神之路篇·第六幕 助老返青张认干女",326491211,326491223,[[1,326491211,326491213,"谋蓝海藏队战案获准"],[2,326491212,326491212,"候携新活性唤三老"],[3,326491213,326491213,"十晶开领域助四老龙"],[4,326491213,326491213,"九彩龙爪使张返青春"],[5,326491213,326491222,"守舍修炼反复完善战案"],[6,326491220,326491220,"母劝缓吞血改用联姻"],[7,326491223,326491223,"张当众认蓝为干女"],[8,326491223,326491223,"愿赠精血试探护身"]]],["龙马竞宝篇·第一幕 龙蛋精金竞得神剑",326491223,326491224,[[1,326491223,326491223,"龙蛋开场首座许换舰"],[2,326491223,326491223,"神识购精金获赠巨款"],[3,326491223,326491223,"抬晶价诱天和入局"],[4,326491224,326491224,"十六万得冰封神剑"],[5,326491224,326491224,"天马赠下首座守护"],[6,326491224,326491224,"冷拒相让拍千套战甲"],[7,326491224,326491224,"为钱竞得天神之眼"],[8,326491224,326491224,"现钱竞甲天和终退"],[9,326491224,326491224,"识阴阳底价收神牌"]]],["龙马竞宝篇·第二幕 神器落定暗议护身",326491224,326491227,[[1,326491224,326491224,"弃高价龙枪得锋神手"],[2,326491224,326491224,"天和重金夺渡劫罩"],[3,326491224,326491224,"天焚神杵归李梦龙"],[4,326491224,326491224,"龙宫宴被首座插话"],[5,326491224,326491225,"识首座心思仍留守"],[6,326491224,326491227,"护宝返星付矿交商路"]]],["龙马竞宝篇·第三幕 登临神果天养核竞拍",326491225,326491225,[[1,326491225,326491225,"罗先赠菊众骑跟送礼"],[2,326491225,326491225,"认雷之源底价收下"],[3,326491225,326491225,"电母拒毁灭蓝再捡漏"],[4,326491225,326491225,"两流星重价诱天和"],[5,326491225,326491225,"一枚登临果逼相再拍"],[6,326491225,326491225,"凤鸣稳神御空重金买"],[7,326491225,326491225,"第三核现天养私通"],[8,326491225,326491225,"天和亿价买核会终"],[9,326491225,326491225,"首座坦谈整合与人类"],[10,326491225,326491225,"核藏神识欲炸深红"]]],["龙马竞宝篇·第四幕 分宝聚友整装蓝海军",326491225,326491230,[[1,326491225,326491225,"归丰隆聚友听回讯"],[2,326491225,326491225,"列三种战局请联邦预备"],[3,326491225,326491225,"梦琴破冰接受神剑"],[4,326491225,326491225,"钱抢融天眼先成神识"],[5,326491225,326491225,"辉试锋芒雨暂缓接牌"],[6,326491225,326491225,"心声泄露钱闭门自处"],[7,326491225,326491225,"议先融空虫再掌雷电"],[8,326491225,326491226,"皇许补给次晨同阅军"],[9,326491226,326491226,"破舰入眼另组精锐"],[10,326491227,326491230,"新御空舰配千套战甲"]]],["天和烽火篇·第一幕 天和认局血域降星",326491230,326500103,[[1,326491230,326500103,"蓝海闪空五日会援军"],[2,326491230,326491230,"君臣疑核再迎五龙骑"],[3,326491230,326491230,"天和认局归盟令战备"],[4,326491230,326491230,"五骑护星炮网拒深红"],[5,326491230,326491230,"血柱落地五骑唤座龙"],[6,326491230,326491230,"破心灵囚黑皇仍不死"],[7,326491230,326491231,"巫师补阵再开全球盾"]]],["天和烽火篇·第二幕 四族整军待令潜侦",326500103,326500105,[[1,326500103,326500103,"钟命蓝临统四族援军"],[2,326500103,326500105,"编号练阵遣二太子督舰"],[3,326500105,326500105,"见深红降临援军待令"],[4,326500105,326500105,"记敌形轮休淬体待战"],[5,326500105,326500105,"龙髓助修刘锋受雷炼"],[6,326500105,326500105,"缓驶援军暂缓龙骑合契"],[7,326500105,326500105,"阁议龙枪克敌催造舰"],[8,326500105,326500105,"深红将计等机令增攻"]]],["天和烽火篇·第三幕 试枪破返援舰撞盾",326500106,326500110,[[1,326500106,326500108,"黑屏定隐路带太子侦星"],[2,326500108,326500108,"四舰获授谨试黄金枪"],[3,326500109,326500109,"九金顺融铸成无属甲"],[4,326500110,326500110,"假撤变巨梭撞碎天和盾"],[5,326500110,326500110,"援舰登陆交令钟志昌"],[6,326500110,326500110,"缺口救军暗试吞噬"],[7,326500110,326500110,"天和重炮逼出巨蜈蚣"]]],["天和烽火篇·第四幕 暗吸龙髓双亲护险",326500110,326500110,[[1,326500110,326500110,"幻身留队偷吸生龙髓"],[2,326500110,326500110,"偶吞巨虫惊域急撤身"],[3,326500110,326500110,"问髓明白借力限度"],[4,326500110,326500110,"收回天翼大鹏见双亲"],[5,326500110,326500110,"父谈旧敌支持险中进"],[6,326500110,326500110,"验髓获支持返星接劫"],[7,326500110,326500110,"雷光掩护雨格成神"]]],["天和烽火篇·第五幕 巨虫追战魅皇逼关",326500110,326500111,[[1,326500110,326500110,"两袭巨虫爆髓即遁"],[2,326500110,326500110,"魅皇压身破境获救"],[3,326500110,326500110,"忧神回归失言认旧忆"],[4,326500110,326500110,"留魅为线封核入胸"],[5,326500110,326500111,"藏真神待舰退地战起"],[6,326500110,326500110,"阁主启行再显大炮名"]]],["天和烽火篇·第六幕 地战守钱双友成神",326500111,326500112,[[1,326500111,326500111,"联炮守坡比蒙列阵"],[2,326500111,326500111,"钱磊硬扛天地劫成神"],[3,326500111,326500111,"魅皇接线掩住截流"],[4,326500111,326500111,"神吞加军团守钱为先"],[5,326500111,326500111,"五人连控击杀潜刺者"],[6,326500112,326500112,"后撤见巫师燃命清敌"],[7,326500112,326500112,"抢能助三杀肋骨救命"]]],["天和烽火篇·第七幕 主从定契援至域遁",326500112,326500112,[[1,326500112,326500112,"停战生疑请相问核心"],[2,326500112,326500112,"催援未果获令返舰"],[3,326500112,326500112,"平契难承转为主从"],[4,326500112,326500112,"双龙真神迎来总援"],[5,326500112,326500112,"联军到齐拒绝吞星约"],[6,326500112,326500112,"双首座升力敌域遁空"],[7,326500112,326500112,"还核让半舰急转回援"],[8,326500112,326500112,"借秀幻身潜库取宝"],[9,326500112,326500112,"重建刚起皇怒失珍藏"],[10,326500112,326500112,"献宝问策父命接全队"],[11,326500112,326500112,"骨甲金甲相融成六字"],[12,326500112,326500112,"四甲命名父已调三舰"]]],["天马血战篇·第一幕 天养守星七老赴死约",326500112,326500112,[[1,326500112,326500112,"天养创生撑罩挡梭撞"],[2,326500112,326500112,"七老聚首议守不解封"],[3,326500112,326500112,"拒以众生命换取神王"],[4,326500112,326500112,"应燃命之约各族同守"],[5,326500112,326500112,"白凌拒暗令全速赴援"],[6,326500112,326500112,"重临天和暗启夺舍令"]]],["天马血战篇·第二幕 神火遗命群骨护王",326500113,326500113,[[1,326500113,326500113,"三老殉身神火破域"],[2,326500113,326500113,"域内苦战天养借双星"],[3,326500113,326500113,"再联跨界双人赴绝境"],[4,326500113,326500113,"祝福救阵二肋再护命"],[5,326500113,326500113,"碎晶呼龙众骨赴王召"],[6,326500113,326500113,"仆龙舍命挡下双钩"],[7,326500113,326500113,"骨援到场神火遗命逝"],[8,326500113,326500113,"天马接力燃尽守核心"]]],["天马血战篇·第三幕 银龙破域母舰合甲",326500113,326500113,[[1,326500113,326500113,"七老尽殁合龙杀巨鸟"],[2,326500113,326500113,"骨爆护王银龙突现"],[3,326500113,326500113,"借群龙升力迫域放人"],[4,326500113,326500113,"银龙连挡红柱待舰来"],[5,326500113,326500113,"舰群合甲主炮重击域"],[6,326500113,326500113,"联追急撤舰队致意走"],[7,326500113,326500113,"群龙拜别广场认英雄"],[8,326500113,326500113,"嘉琳认主坦陈来历"]]],["天马血战篇·第四幕 承遗命领使联邦",326500114,326500114,[[1,326500114,326500114,"隐去天养来法向首复命"],[2,326500114,326500114,"承遗命先授第二次座"],[3,326500114,326500114,"天和告急定守星联人"],[4,326500114,326500114,"定洗脑接舰圣女领使"],[5,326500114,326500114,"归还遗体湖边再谢援"]]],["联邦出使篇·第一幕 舰拒使团生态炮碎星",326500117,326500121,[[1,326500117,326500117,"载资源启使双亲密嘱"],[2,326500117,326500119,"第四拒联使团被逐返"],[3,326500119,326500121,"静待三日舞麟请阁援"],[4,326500119,326500119,"议长求抢资源众私议"],[5,326500121,326500121,"生态舰临阁主唤师门"],[6,326500121,326500121,"众舰静默司令终让路"],[7,326500121,326500121,"一炮碎远星联舰跃走"],[8,326500121,326500121,"第四舰隐去内部争执"]]],["联邦出使篇·第二幕 归院候谈银龙重掌塔",326500121,326500124,[[1,326500121,326500123,"跃迁后航返斗罗"],[2,326500122,326500122,"吞星近成母上议新界"],[3,326500123,326500123,"使团落院暂缓赴都"],[4,326500123,326500123,"银龙返塔再接掌权"],[5,326500123,326500124,"归校议援父子商后路"],[6,326500124,326500124,"湖畔重述祖辈守护"],[7,326500124,326500124,"诸王轮值循坐标归返"]]],["联邦出使篇·第三幕 国会陈危清风辞部",326500125,326500129,[[1,326500125,326500125,"临时国会迎来银龙塔主"],[2,326500125,326500125,"使者陈危提出联防"],[3,326500125,326500125,"清风辞职国会暂散"],[4,326500125,326500125,"山峰问出圣灵新教主"],[5,326500125,326500125,"托付暗部转入唐门研究"],[6,326500127,326500129,"天和带资逃星取回舰队"]]],["联邦出使篇·第四幕 联防签约空虫助晋升",326500128,326500131,[[1,326500128,326500128,"联防签约白凌掌军部"],[2,326500128,326500128,"血契反哺空虫化形"],[3,326500128,326500128,"空空得名轩晋超神"],[4,326500128,326500128,"双亲约定补上婚礼"],[5,326500129,326500129,"晨起识空空暂缓返程"],[6,326500129,326500129,"拥谢梓晨金光赴塔迎亲"],[7,326500129,326500129,"旧影散尽儿女泪满"],[8,326500129,326500129,"重现求婚银龙回抱"],[9,326500129,326500131,"离乡稳境归望天龙"]]],["双星守御篇·第一幕 逼皇交舰龙界迎主",326500131,326500202,[[1,326500131,326500131,"绕降丰隆听闻天和危局"],[2,326500131,326500131,"蓝破索资借传送留标"],[3,326500131,326500131,"集传旗舰迫皇交舰"],[4,326500131,326500131,"财政任命换来科技归心"],[5,326500131,326500131,"自开龙界许群龙重生"],[6,326500131,326500202,"金眼黑龙载众驰援"],[7,326500131,326500131,"九彩焚尽杂质承龙法"]]],["双星守御篇·第二幕 血域再袭四强并战",326500202,326500208,[[1,326500202,326500202,"暗定四舰合击留黑龙补缺"],[2,326500205,326500208,"换防备重生密议拖敌"],[3,326500206,326500206,"天和吞尽血域再远去"],[4,326500206,326500206,"血域突现龙骑聚力迎敌"],[5,326500206,326500206,"天马突剑碎甲险退"],[6,326500206,326500206,"神星诱言难换子民性命"],[7,326500206,326500206,"赤金难破血月百舰齐轰"]]],["双星守御篇·第三幕 金银赴援舰炮退母",326500206,326500206,[[1,326500206,326500206,"金银援到溯源推四强"],[2,326500206,326500206,"海戟禁法换伤双舰承击"],[3,326500206,326500206,"掷戟崩能逼母续战"],[4,326500206,326500206,"嘉琳驰援合焱增首座"],[5,326500206,326500206,"四舰饱和齐击震动双星"],[6,326500206,326500206,"血域吞回爆能缩点遁去"],[7,326500206,326500206,"战后合议备母神王回归"]]],["双星守御篇·第四幕 残圣夺舍秀秀献祭",326500206,326500206,[[1,326500206,326500206,"九源稳固戟戒定情"],[2,326500206,326500206,"戟锋穿心残圣夺舍"],[3,326500206,326500206,"秀逆兽献祭联焰灭残圣"],[4,326500206,326500206,"江乘丧夺血秀环唤生念"],[5,326500206,326500206,"龙怒破核戟杀旧首座"],[6,326500206,326500206,"三约定下剥环托复生"],[7,326500206,326500206,"明白复生筹码再赴升台"]]],["双星守御篇·第五幕 新王即位三月备劫",326500206,326500507,[[1,326500206,326500206,"柱顶宣王群龙拜首座"],[2,326500206,326500206,"钟定支持封口改称禅位"],[3,326500209,326500408,"彩柱剥石吸髓两月未歇"],[4,326500209,326500209,"残球吸星火稳定再藏"],[5,326500209,326500408,"双星加防静候两月"],[6,326500408,326500507,"第三月藏龙积血成晶"],[7,326500408,326500507,"两联互换资源发展科技"]]],["龙神终考篇·第一幕 龙神闭考神王压境",326500507,326500507,[[1,326500507,326500507,"甘霖遍龙现男身归界"],[2,326500507,326500507,"融核碎骨万米神躯初成"],[3,326500507,326500507,"恒星暗尽深红神王出世"],[4,326500507,326500507,"感恶意聚防线守空柱"],[5,326500507,326500507,"遁缝停吸受最后龙神考"],[6,326500507,326500507,"金龙王向群骑认子"],[7,326500507,326500507,"神王逼交子盟军不降"],[8,326500507,326500507,"破末封双龙合体退神王"],[9,326500507,326500507,"四炮被吞黑龙伤翼陷网"]]],["龙神终考篇·第二幕 考内救子再寻神星路",326500507,326500507,[[1,326500507,326500507,"考界醒问苗圃见太子"],[2,326500507,326500507,"欲止神星却被推上祭坛"],[3,326500507,326500507,"舍神星推太子换清醒"],[4,326500507,326500507,"观尽旧殇明白禁神根源"],[5,326500507,326500507,"护住太子再承神星考"]]],["龙神终考篇·第三幕 天养舍识无双赴绝境",326500507,326500507,[[1,326500507,326500507,"天养舍识将核心予秀"],[2,326500507,326500507,"吞噬锁战场秀罩救众"],[3,326500507,326500507,"舞麟纵狂血撞神王"],[4,326500507,326500507,"依子尘舍身与凌合炮"],[5,326500507,326500507,"无双裂神躯金戟贯胸"],[6,326500507,326500507,"罩碎绝境轩宇闭目归"],[7,326500507,326500507,"龙神枪一击灭深红"],[8,326500507,326500507,"亲献双脉轩醒拒吞"]]],["龙神终考篇·第四幕 神界归返诸王炼龙",326500507,326500507,[[1,326500507,326500507,"神界归来一家初团聚"],[2,326500507,326500507,"唐三安排延时炼心"],[3,326500507,326500507,"情绪琴音引出龙神殇"],[4,326500507,326500507,"海光二王慎议神星"],[5,326500507,326500507,"冥剑三决挡枪紫护琴"],[6,326500507,326500507,"狂拳仙棒再炼两枪"],[7,326500507,326500507,"万米龙显宇宙唯一"],[8,326500507,326500507,"十三王压龙析法则"]]],["龙神终考篇·第五幕 归还金银执法过考",326500507,326500507,[[1,326500507,326500507,"双亲承新位归还金银"],[2,326500507,326500507,"围攻龙神暂阻虚空建位"],[3,326500507,326500507,"龙环脱围引爆惊雷紫电"],[4,326500507,326500507,"立誓执法通过龙神考"],[5,326500507,326500507,"龙神清醒团聚忽见衰败"],[6,326500507,326500507,"留梳断辫小舞诀别"]]],["龙神终考篇·第六幕 诀别证婚蓝焰追妻",326500507,326500507,[[1,326500507,326500507,"父述无药延归留希望"],[2,326500507,326500507,"祖父叮嘱从小自建神界"],[3,326500507,326500507,"唐轩宇归宗祖父证婚"],[4,326500507,326500507,"讲考触红雷寻妻志不改"],[5,326500507,326500507,"蓝焰散神躯转世追小舞"],[6,326500507,326500507,"长弓接掌两界分向守望"]]]]}]};

/* 斗罗变量 · ZOD 变量结构
 * 依赖：共用/规则.js（同一作用域）、ACT_INDEX（build.py 注入的幕索引）、全局 z（酒馆助手自带的 zod 4）。
 * 原则：AI 写错类型时回退到默认值而不是让整轮更新失败；派生字段一律在 finishRoot 里重算，AI 写了也会被覆盖。
 * 输出形状 = 样稿/演示数据.js 里每个场景的 stat（状态栏直接读）。
 */

const NULL_WORD = /^(无|没有|暂无|null|undefined|none|—|-)?$/iu;
const YES = /^(true|是|有|对|开|启用|1)$/iu;
const NO = /^(false|否|无|没有|关|0)?$/iu;

const ALIAS = Object.freeze({
  时层: { 现实: '实际历史', 真实: '实际历史', 历史: '实际历史', 主世界: '实际历史', 斗罗大陆: '实际历史', 虚拟: '虚拟世界', 升灵台: '虚拟世界', 梦境: '幻境', 幻象: '幻境', 秘境: '小世界' },
  事件状态: { 发生: '已发生', 已完成: '已发生', 完成: '已发生', 改写: '已改写', 被改写: '已改写', 不会发生: '无法发生', 取消: '无法发生', 未能发生: '无法发生', 待发生: '未发生', 进行中: '未发生' },
  蝴蝶状态: { 扩散: '扩散中', 进行中: '扩散中', 收束: '收束中', 已收束: '收束中' },
  影响范围: { 篇: '本篇', 部: '本部', 永久: '跨部', 全局: '跨部' },
  出身: { 人: '人类', 外来者: '人类', 兽: '魂兽', 魂兽化形: '魂兽' },
  来历: { 土著: '原住民', 本土: '原住民', 本地人: '原住民', 穿越: '穿越者', 外来者: '穿越者', 重生者: '穿越者' },
  形态: { 人身: '人形', 化形: '人形', 本体: '兽身', 兽形: '兽身' },
  武魂形态: { 器: '器武魂', 兽: '兽武魂', 植物: '植物武魂', 草木: '植物武魂', 植物系: '植物武魂', 元素: '元素武魂', 元素系: '元素武魂', 本体: '本体武魂', 身体武魂: '本体武魂', 神赐: '神赐武魂', 神级武魂: '神赐武魂', 传承武魂: '神赐武魂', 血脉魂环: '血脉' },
  品质: { 废武魂: '废', 一般: '普通', 良好: '优秀', 顶尖: '顶级', 顶级武魂: '顶级', 神: '神级', 神品: '神级', 超神: '超神级', 超神品: '超神级', 超神武魂: '超神级', 神王级: '超神级' },
  真身: { 无: '未拥有', 没有: '未拥有', 已拥有: '可用', 拥有: '可用', 展开: '展开中', 使用中: '展开中' },
  领域状态: { 收: '收起', 未展开: '收起', 展开: '展开中', 开启: '展开中' },
  层次: { 神: '神级', 神级领域: '神级' },
  效果类型: { 增益: '加成', 提升: '加成', 增幅: '加成', 减益: '限制', 削弱: '限制', 压制: '限制', 下限: '保底', 封顶: '上限', 封印: '上限' },
  设定依据: { 原作: '原文', 推测: '推定', 推断: '推定', 自定: '本卡规则', 原创: '本卡规则' },
  斗铠状态: { 穿戴: '穿戴中', 穿着: '穿戴中', 着甲: '穿戴中', 收: '收起', 未穿戴: '收起' },
  性别: { 男性: '男', 女性: '女' },
  气运品阶: { 彩色: '彩', 七彩: '彩', 金色: '金', 红色: '红', 紫色: '紫', 黄色: '黄', 白色: '白', 黑: '厄', 黑色: '厄', 厄运: '厄', 绝命: '绝', 死劫: '绝' },
  词条类别: { 命数: '命格', 天命: '命格', 体魄: '体质', 血统: '血脉', 奇遇: '机缘', 心境: '心性', 性情: '心性' },
  词条状态: { 激活: '生效', 有效: '生效', 启用: '生效', 被压制: '压制', 封印: '压制', 镇压: '压制' },
  劫兆: { 未现: '未显', 隐伏: '未显', 将临: '将至', 逼近: '将至', 临门: '临头', 降临: '临头', 已至: '临头' },
  词条来源: { 初始: '开局', 开局自带: '开局', 天生: '开局', 抽卡: '抽奖', 打卡: '签到', 任务奖励: '任务', 奇遇: '机缘' },
  // 宗门与血脉（宗门血脉成就/变量契约.md）
  组织形式: { 宗派: '宗门', 世家: '家族', 氏族: '家族', 家: '家族', 门: '门派', 帮派: '门派', 书院: '学院', 兽群: '兽族', 族群: '兽族' },
  宗门来源: { 白手: '白手起家', 自创: '白手起家', 继承: '继承家族', 家族: '继承家族', 原作: '原作宗门', 立宗: '正文立宗' },
  兴衰: { 初创: '草创', 新立: '草创', 崛起: '兴起', 上升: '兴起', 全盛: '鼎盛', 极盛: '鼎盛', 平稳: '守成', 稳定: '守成', 中落: '衰落', 没落: '衰落', 式微: '衰落', 复兴: '中兴', 重振: '中兴', 灭门: '覆灭', 覆亡: '覆灭' },
  设施状态: { 运转: '正常', 启用: '正常', 关闭: '停用', 停工: '停用', 毁坏: '损毁', 被毁: '损毁', 废墟: '损毁' },
  产业状态: { 正常: '经营', 营业: '经营', 运转: '经营', 衰退: '萧条', 亏损: '萧条', 被夺: '被占', 占据: '被占', 关闭: '停业', 歇业: '停业' },
  工程种类: { 建造: '新建', 兴建: '新建', 扩建: '升级', 提升: '升级', 重建: '修复', 修缮: '修复' },
  工程状态: { 施工: '在建', 进行中: '在建', 暂停: '停工', 中止: '停工' },
  门人出身: { 族人: '血亲', 嫡系: '血亲', 旁系: '血亲', 外门: '外姓', 弟子: '外姓', 魂兽: '兽族' },
  门人状态: { 健在: '在世', 活着: '在世', 闭死关: '闭关', 出门: '外出', 游历: '外出', 死亡: '陨落', 身死: '陨落', 战死: '陨落', 叛逃: '叛出', 背叛: '叛出', 离开: '叛出' },
  令状态: { 待处理: '待办', 未办: '待办', 完成: '已结算', 已完成: '已结算', 结算: '已结算', 照办: '已结算', 拒绝: '驳回', 否决: '驳回' },
  宗门令: { 建造: '兴建', 新建: '兴建', 扩建: '升级', 修缮: '修复', 开设产业: '开产业', 派人: '派遣', 招收: '收徒', 收弟子: '收徒', 结盟: '外交', 底蕴: '动用底蕴' },
  遗传: { 嫡传: '嫡系', 血缘: '血亲', 父传: '父系', 母传: '母系' },
  宝物类别: { 神器碎片: '神器', 魂导: '魂导器', 仙品: '仙草', 秘籍: '典籍', 功法: '典籍' },
  对本宗: { 同盟: '盟友', 友好: '友善', 敌对: '敌视', 仇敌: '死敌', 世仇: '死敌' },
  源位: { 本源: '始源', 始祖: '始源', 嫡脉: '嫡源', 王血: '王脉', 纯血: '真脉', 真血: '真脉', 旁支: '支脉', 支系: '支脉', 远支: '余脉', 稀薄: '余脉' },
  血脉来源: { 天生: '先天', 遗传: '先天', 祖传: '先天', 觉醒: '先天', 返古: '返祖', 突变: '变异', 合一: '融合', 赐予: '神赐', 赐血: '神赐', 奇遇: '机缘', 开局: '开局设定' },
});

function aliasOf(table, v) {
  const s = String(v).trim();
  return table[s] || s;
}

// 把常见的别名键改成正式键（只在正式键缺失时）
function renameKeys(v, map) {
  if (!isObj(v)) return v;
  const out = { ...v };
  for (const [from, to] of Object.entries(map)) {
    if (from in out && !(to in out)) out[to] = out[from];
    if (from in out) delete out[from];
  }
  return out;
}
const RING_KEYS = { 特殊色: '魂环颜色', 环色: '魂环颜色', 色泽: '魂环颜色', 魂环色: '魂环颜色' };
const RING_PALETTE = createRingPalette();
const DERIVED_RING_COLOR = new Set(['白', '黄', '紫', '黑', '红', '金', '神金', '橙金', '特殊']);
function promoteRingColor(v) {
  if (!isObj(v)) return v;
  const own = ['魂环颜色', ...Object.keys(RING_KEYS)].some((k) => v[k] != null && String(v[k]).trim() !== '');
  if (own || typeof v.颜色 !== 'string') return v;
  const c = RING_PALETTE.normalize(v.颜色);
  return c && !DERIVED_RING_COLOR.has(c) ? { ...v, 魂环颜色: c } : v;
}
const PERSON_KEYS = { 魂力: '魂力等级', 等级: '魂力等级', 修为: '修为年限', 年限: '修为年限', 好感: '好感度', 关系: '关系标签', 状态效果: '生效状态', 增益: '生效状态', 精神力点数: '精神力' };

// 把“数组形式的字典”转回字典：[{名称:'a',…}] → {a:{…}}
// 别名字段改成正式字段，别名的值优先（正式字段是存下来的旧值，别名是 AI 这一轮刚写的）
function renameOver(v, map) {
  if (!isObj(v)) return v;
  const out = { ...v };
  for (const [from, to] of Object.entries(map)) {
    if (!(from in out)) continue;
    if (out[from] != null && out[from] !== '') out[to] = out[from];
    delete out[from];
  }
  return out;
}

function arrToRecord(v, keyNames) {
  if (!Array.isArray(v)) return v;
  const out = {};
  v.forEach((item, i) => {
    if (!isObj(item)) return;
    const k = keyNames.map((n) => item[n]).find((x) => typeof x === 'string' && x.trim()) || String(i + 1);
    out[k] = item;
  });
  return out;
}

/* eslint-disable no-shadow */
function buildSchema(z) {
  const pre = (fn, s) => z.preprocess(fn, s);

  const S = (def = '') => pre((v) => (v == null ? def : typeof v === 'number' || typeof v === 'boolean' ? String(v) : v), z.string()).catch(def);
  const SN = () => pre((v) => {
    if (v == null) return null;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string' && NULL_WORD.test(v.trim())) return null;
    return v;
  }, z.string().nullable()).catch(null);
  const N = (def, lo = -Infinity, hi = Infinity, round = false) => pre((v) => (v == null || v === '' ? def : parseAmount(v)), z.number())
    .transform((n) => clampN(round ? Math.round(n) : n, lo, hi)).catch(def);
  const NN = (lo = -Infinity, hi = Infinity, round = false) => pre((v) => {
    if (v == null || (typeof v === 'string' && NULL_WORD.test(v.trim()))) return null;
    return parseAmount(v);
  }, z.number().nullable()).transform((n) => (n == null ? null : clampN(round ? Math.round(n) : n, lo, hi))).catch(null);
  const B = (def = false) => pre((v) => {
    if (typeof v === 'boolean') return v;
    if (v == null) return def;
    const s = String(v).trim();
    if (YES.test(s)) return true;
    if (NO.test(s)) return false;
    return def;
  }, z.boolean()).catch(def);
  const E = (list, def, table) => pre((v) => (v == null || v === '' ? def : table ? aliasOf(table, v) : String(v).trim()), z.enum(list)).catch(def);
  const EN = (list, table) => pre((v) => (v == null || (typeof v === 'string' && NULL_WORD.test(v.trim())) ? null : table ? aliasOf(table, v) : String(v).trim()), z.enum(list).nullable()).catch(null);
  // 字符串数组；split 给出时把一整串按分隔符拆开
  const SA = (split) => pre((v) => {
    if (v == null) return [];
    if (Array.isArray(v)) return v.filter((x) => x != null && x !== '').map((x) => (isObj(x) ? x.名称 || JSON.stringify(x) : String(x)));
    if (typeof v === 'string') { const s = v.trim(); if (!s || NULL_WORD.test(s)) return []; return split ? s.split(split).map((x) => x.trim()).filter(Boolean) : [s]; }
    if (isObj(v)) return Object.keys(v);
    return [String(v)];
  }, z.array(z.string())).catch([]);
  // 对象数组；single(v) 为真时把单个对象当作一项；coerce 把字符串等转成对象
  const A = (item, { single = () => false, coerce = null } = {}) => pre((v) => {
    if (v == null) return [];
    let list = Array.isArray(v) ? v : isObj(v) ? (single(v) ? [v] : Object.values(v)) : [v];
    if (coerce) list = list.map((x) => (isObj(x) ? x : coerce(x)));
    return list.filter(isObj);
  }, z.array(item)).catch([]);
  // 以名字为键的字典
  const R = (item, { keys = ['名称', '姓名', '名字'], coerce = null } = {}) => pre((v) => {
    if (v == null || typeof v === 'string') return {};
    const o = arrToRecord(v, keys);
    if (!isObj(o)) return {};
    const out = {};
    for (const [k, x] of Object.entries(o)) {
      const y = isObj(x) ? x : coerce ? coerce(x) : null;
      if (isObj(y)) out[String(k).trim()] = y;
    }
    return out;
  }, z.record(z.string(), item)).catch({});
  const RN = (lo = -Infinity, hi = Infinity) => pre((v) => {
    if (!isObj(v)) return {};
    const out = {};
    for (const [k, x] of Object.entries(v)) { const n = parseAmount(x); if (n != null) out[k] = n; }
    return out;
  }, z.record(z.string(), z.number().transform((n) => clampN(n, lo, hi)))).catch({});
  const O = (shape, rename) => pre((v) => (isObj(v) ? (rename ? renameKeys(v, rename) : v) : {}), z.object(shape));
  const ON = (shape, coerce) => pre((v) => {
    if (isObj(v)) return v;
    if (coerce && v != null && !(typeof v === 'string' && NULL_WORD.test(v.trim()))) return coerce(v);
    return null;
  }, z.object(shape).nullable()).catch(null);
  const DV = () => pre(() => null, z.any()); // 派生字段占位：先置空，finishRoot 里重算

  // ── 小结构 ──
  const Skill = O({ 名称: S(), 类型: SA(/[、，,/]/u), 效果: S(), 消耗: S() });
  // 魂环颜色：写了就按它画（开放取值，见 共用/魂环色.js），null 按年限。旧档的 特殊色 和 环色、色泽 都并进来；
  // AI 把颜色错写进派生字段 颜色、又不是年限色名时，也挪进魂环颜色
  const Ring = pre(promoteRingColor, O({
    年限: NN(0, 1e8, true), 来源: S('猎杀'), 来源魂兽: SN(), 凶兽: B(), 魂环颜色: SN(), 神级: B(),
    颜色: DV(), 金纹: DV(),
    魂灵: ON({ 名称: S() }, (v) => ({ 名称: String(v) })),
    魂技: A(Skill, { single: (v) => '名称' in v || '效果' in v }),
  }, RING_KEYS));
  const Attr = O({ 名称: S(), 极致: B() });
  const coerceAttr = (v) => {
    const s = String(v).trim();
    const m = s.match(/^极致(?:之)?(.+)$/u);
    return m ? { 名称: m[1], 极致: true } : { 名称: s, 极致: false };
  };
  const Soul = O({
    形态: E(['器武魂', '兽武魂', '植物武魂', '元素武魂', '本体武魂', '神赐武魂', '血脉'], '器武魂', ALIAS.武魂形态),
    标签: SA(/[、，,]/u),
    属性: A(Attr, { single: (v) => '名称' in v, coerce: coerceAttr }),
    品质: E(['废', '普通', '优秀', '顶级', '神级', '超神级'], '普通', ALIAS.品质),
    获得: O({ 方式: S('先天觉醒'), 日期: SN() }),
    系别: S(),
    武魂真身: E(['未拥有', '可用', '展开中'], '未拥有', ALIAS.真身),
    使用中: B(),
    进化: ON({ 自: S() }, (v) => ({ 自: String(v) })),
    魂环: A(Ring, { single: (v) => '年限' in v && '魂技' in v }),
  });
  const Ability = O({ 类型: SA(/[、，,/]/u), 效果: S(), 消耗: S() });
  const Bone = O({ 名称: S(), 年限: NN(0, 1e8, true), 来源魂兽: SN(), 技能: A(O({ 名称: S(), 效果: S() }), { single: (v) => '名称' in v }) });
  const Domain = O({
    来源: S(), 获得途径: S(), 层次: E(['普通', '神级'], '普通', ALIAS.层次), 效果: S(), 环境加成: SN(),
    进化: ON({ 自: S() }, (v) => ({ 自: String(v) })),
    状态: E(['收起', '展开中'], '收起', ALIAS.领域状态),
    加成百分比: NN(0, 1000),
  });
  // 功法：AI 常把值写成字符串（"第二层""初学"）、写成名字数组、用 /功法/- 追加、或用“境界/层次”这类字段名。
  // 以前这些都被静默丢掉甚至清空整个功法表，这里统一转成 {类别, 熟练度, 层数}；熟练度是自由文字（境界名照存）
  const ART_ALIAS = { 境界: '熟练度', 层次: '熟练度', 境: '熟练度', 程度: '熟练度', 层: '层数', 重数: '层数', 等级: '层数' };
  const Art = pre((v) => renameOver(v, ART_ALIAS), O({ 类别: S(), 熟练度: SN(), 层数: SN() }));
  const artOf = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return { 层数: String(v) };
    if (typeof v !== 'string' || !v.trim()) return null;
    const s = v.trim();
    return /层|重$|^\d+$/u.test(s) ? { 层数: s } : { 熟练度: s };
  };
  const artName = (x) => (typeof x === 'string' ? x : isObj(x) ? [x.名称, x.名字].find((s) => typeof s === 'string' && s.trim()) : null);
  const Arts = pre((v) => {
    if (typeof v === 'string') v = v.split(/[、，,]/u).map((s) => s.trim()).filter(Boolean);
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? { 名称: x } : x));
    if (isObj(v) && '-' in v) {
      const { '-': x, ...rest } = v;
      const name = artName(x);
      if (name) rest[name.trim()] = isObj(x) ? x : {};
      return rest;
    }
    return v;
  }, R(Art, { coerce: artOf }));
  const Fusion = O({ 搭档: SA(/[、，,]/u), 契合度: NN(0, 100, true), 效果: S() });
  const Effect = O({
    类型: E(['加成', '限制', '保底', '上限'], '加成', ALIAS.效果类型), 数值: N(0, -500, 500), 剩余: S(), 来源: S(), 自动: B().optional(),
  });
  const Armor = ON({
    名称: S(), 字数: N(1, 1, 6, true), 形态: S('完整'), 契合度: NN(0, 100, true), 领域: SN(),
    状态: E(['收起', '穿戴中'], '收起', ALIAS.斗铠状态),
    部件: R(O({ 完成: B(), 金属: SN() }), { coerce: (v) => ({ 完成: !!v, 金属: null }) }),
  });
  const Mech = ON({ 名称: S(), 颜色: S('白'), 绑定: B(), 状态: S('收起') });
  // 定装炮弹：原作叫“定装魂导炮弹”，AI 常照原名写路径；并进正式的 定装炮弹（同名以新写的为准）
  const SHELL_ALIAS = ['定装魂导炮弹', '魂导炮弹'];
  const Gear = pre((v) => {
    if (!isObj(v)) return v;
    const out = { ...v };
    for (const k of SHELL_ALIAS) {
      if (!(k in out)) continue;
      if (isObj(out[k])) out.定装炮弹 = { ...(isObj(out.定装炮弹) ? out.定装炮弹 : {}), ...out[k] };
      delete out[k];
    }
    return out;
  }, O({
    斗铠: Armor, 机甲: Mech,
    魂导器: R(O({ 等级: N(1, 1, 12, true), 大类: S(), 用途: S() })),
    定装炮弹: R(O({ 等级: N(1, 1, 12, true), 数量: N(1, 0, 1e6, true) })),
  }));
  const Seat = ON({ 神名: S(), 神阶: S('三级神'), 取得方式: S(), 权柄: SA(/[、，,]/u) });
  const Trial = ON({
    神名: S(), 总考数: N(9, 1, 99, true), 亲和度: N(0, 0, 100), 失败后果: S(),
    考核: A(O({ 序: N(1, 1, 99, true), 内容: S(), 时限: SN(), 状态: E(['未开始', '进行中', '已通过', '已失败'], '未开始'), 奖励: SN() }), { single: (v) => '内容' in v }),
  });
  const Artifact = O({
    亲和度: N(0, 0, 100), 说明: S(),
    考核: ON({ 名称: S('神器亲和考核'), 总数: N(1, 1, 99, true), 已过: N(0, 0, 99, true), 当前: S(), 奖励: S() }),
  });
  const Path = O({ 神位: Seat, 野神: B(), 神考: Trial, 神器: R(Artifact) });

  // ── 气运（只有主角有；设计决定 §24.3、气运金手指/变量契约.md §1）：字数上限是硬的，超出截掉 ──
  const Cut = (n) => S().transform((x) => x.slice(0, n));
  const CutN = (n) => SN().transform((x) => (x == null ? null : x.slice(0, n)));
  const LuckEntry = O({
    品阶: E(['彩', '金', '红', '紫', '黄', '白', '厄', '绝'], '白', ALIAS.气运品阶),
    类别: E(['命格', '体质', '血脉', '机缘', '心性'], '命格', ALIAS.词条类别),
    效果: Cut(80), 代价: CutN(60), 状态: E(['生效', '压制'], '生效', ALIAS.词条状态),
    晋阶: ON({ 条件: Cut(40), 进度: Cut(20), 晋阶后名称: CutN(8), 晋阶后效果: Cut(80) }),
    化解: ON({ 条件: Cut(40) }, (v) => ({ 条件: String(v) })),
    死劫: ON({ 条件: Cut(40), 劫兆: E(['未显', '将至', '临头'], '未显', ALIAS.劫兆), 期限: SN().transform((x) => (x == null ? null : normDate(x))) }),
    倒计时: DV(),
    来源: E(['开局', '晋阶', '抽奖', '签到', '任务', '红包', '机缘'], '机缘', ALIAS.词条来源),
    获得日期: SN(),
  });
  const Luck = O({
    词条: R(LuckEntry, { keys: ['名称', '词条名', '名字'] }),
    结局: ON({ 已终结: B(true), 死因: S(), 下手: S(), 日期: SN(), 词条: S() }),
  });

  // ── 血脉（主角、人物、战斗对手都挂；宗门血脉成就/变量契约.md §2）：品阶、觉醒上限由脚本算 ──
  const NameList = pre((v) => {
    if (v == null || v === '' || (typeof v === 'string' && NULL_WORD.test(v.trim()))) return null;
    const list = (Array.isArray(v) ? v : String(v).split(/[、，,+＋]/u)).map((x) => String(x).trim()).filter(Boolean);
    return list.length ? list : null;
  }, z.array(z.string()).nullable()).catch(null);
  const Blood = O({
    血系: Cut(8), 源位: E(BLOOD_SOURCES, '余脉', ALIAS.源位), 浓度: N(0, 0, 100, true), 觉醒层: N(0, 0, 99, true), 觉醒上限: DV(), 品阶: DV(),
    来源: E(BLOOD_ORIGINS, '先天', ALIAS.血脉来源), 变自: NameList, 天赋: Cut(60), 获得日期: SN(),
  });
  const Bloods = R(Blood, { keys: ['名称', '名', '血脉名'] });

  // ── 宗门（顶层，没有时为 null；§1）：账由脚本算，AI 只写事件 ──
  const Facility = O({
    类别: E(FAC_KINDS, '其他'), 模板: SN(), 等级: N(1, 1, 9, true), 效果: Cut(60), 维护: N(0, 0, 1e8), 积累: DV(),
    状态: E(['正常', '停用', '损毁'], '正常', ALIAS.设施状态), 建成: SN(),
  });
  const Output = O({ 币值: N(0, 0, 1e9), 物资: A(O({ 名称: S(), 数量: N(1, 0, 1e6, true) }), { single: (v) => '名称' in v }) });
  const Industry = O({
    类别: E(IND_KINDS, '其他'), 模板: SN(), 等级: N(1, 1, 9, true), 地点: Cut(20), 主事: SN(), 月产出: Output, 风险: Cut(40),
    状态: E(['经营', '萧条', '被占', '停业'], '经营', ALIAS.产业状态),
  });
  const Project = O({
    名称: Cut(20), 种类: E(['新建', '升级', '修复'], '新建', ALIAS.工程种类), 对象: Cut(20), 模板: SN(), 目标等级: N(1, 1, 9, true),
    开工: S(), 工期: N(30, 1, 36500, true), 完工: DV(), 花费: N(0, 0, 1e9), 状态: E(['在建', '停工'], '在建', ALIAS.工程状态), 进度: DV(),
    已付: B(false),
  });
  const SoulHeir = O({
    形态: E(['器武魂', '兽武魂', '植物武魂', '元素武魂', '本体武魂', '神赐武魂', '血脉'], '器武魂', ALIAS.武魂形态),
    品质: E(['废', '普通', '优秀', '顶级', '神级', '超神级'], '普通', ALIAS.品质),
    遗传: E(['嫡系', '血亲', '父系', '母系'], '血亲', ALIAS.遗传), 说明: Cut(40), 现持者: SA(/[、，,]/u),
  });
  const Member = O({
    辈分: N(1, -999, 9999, true), 出身: E(['血亲', '外姓', '兽族'], '外姓', ALIAS.门人出身), 性别: E(['男', '女', '其他'], '男', ALIAS.性别), 年龄: NN(0, 1e7, true),
    父: SN(), 母: SN(), 师: SN(), 职位: Cut(10), 武魂: Cut(24), 魂力等级: NN(0, 300, true), 修为年限: NN(0, 1e8, true),
    血脉: ON({ 名称: S(), 浓度: N(0, 0, 100, true), 层: NN(0, 99, true) }),
    状态: E(['在世', '闭关', '外出', '陨落', '叛出'], '在世', ALIAS.门人状态), 档案: SN(), 等效等级: DV(), 备注: Cut(40),
  }, { 魂力: '魂力等级', 等级: '魂力等级', 修为: '修为年限' });
  const Sect = ON({
    名称: Cut(12), 组织形式: E(SECT_FORMS, '宗门', ALIAS.组织形式), 来源: E(SECT_ORIGINS, '正文立宗', ALIAS.宗门来源), 原作宗门: SN(),
    门风: Cut(40), 驻地: Cut(20), 立宗日期: SN(), 宗主: S(), 主角职位: Cut(10),
    主角谱系: O({ 辈分: N(1, -999, 9999, true), 父: SN(), 母: SN(), 师: SN() }),
    兴衰: E(SECT_PHASES, '草创', ALIAS.兴衰),
    底蕴: N(0, 0, 99999, true), 声势: N(0, 0, 100, true), 人心: N(50, 0, 100, true), 实力: DV(), 位阶: DV(),
    公库: O({
      钱: pre((v) => (isObj(v) ? v : {}), z.record(z.string(), z.any())).catch({}),
      物资: R(O({ 类别: S('杂物'), 数量: N(1, 0, 1e9, true), 说明: Cut(40), 年限: NN(0, 1e8, true).optional(), 品级: SN().optional() })),
    }),
    收支: O({ 月入: DV(), 月支: DV(), 净: DV(), 上次结算: SN(), 欠费: N(0, 0, 99, true) }),
    设施: R(Facility), 产业: R(Industry), 工程: A(Project, { single: (v) => '对象' in v }),
    宗门传承: O({
      武魂: R(SoulHeir), 功法: R(O({ 类别: Cut(6), 完整度: N(0, 0, 100, true), 说明: Cut(40) })),
      镇宗之宝: R(O({ 类别: E(TREASURE_KINDS, '其他', ALIAS.宝物类别), 说明: Cut(40), 持有: S('宗门') })),
      祖训: SA(),
    }),
    门人: R(Member, { keys: ['全名', '姓名', '名称'] }),
    祖谱: R(O({ 辈分: N(1, -999, 9999, true), 生卒: Cut(20), 生平: Cut(60), 遗泽: Cut(40), 曾为主角: B(false) }), { keys: ['全名', '姓名', '名称'] }),
    编年: A(O({ 日期: S(), 事: Cut(40) }), { single: (v) => '事' in v }),
    宗门令: A(O({
      令: E(ORDER_KINDS, '其他', ALIAS.宗门令), 对象: Cut(20), 说明: Cut(60), 下令: S(), 状态: E(['待办', '已结算', '驳回'], '待办', ALIAS.令状态), 结果: Cut(40),
    }), { single: (v) => '令' in v }),
    传承记录: O({ 代数: N(1, 1, 999, true), 换代: A(O({ 日期: S(), 部: S(), 从: S(), 到: S(), 兴衰档: SN() }), { single: (v) => '到' in v }) }),
  });

  // ── 人物档案（主角与 NPC 同构；NPC 另有在场、关系等） ──
  const base = {
    姓名: S(), 称呼: SN(), 性别: E(['男', '女', '其他'], '男', ALIAS.性别), 年龄: NN(0, 1e7, true),
    出身: E(['人类', '魂兽'], '人类', ALIAS.出身), 种族: SN(), 形态: E(['人形', '兽身'], '人形', ALIAS.形态),
    原作身份: SN(), 长存手段: SN(), 身份: S(), 势力: S('无'), 外貌: S(),
    魂力等级: NN(0, 300, true), 先天魂力: NN(0, 30, true), 称号: DV(), 修为年限: NN(0, 1e8, true), 凶兽: B(), 神阶: SN(),
    等效等级: DV(), 下一道坎: DV(),
    资源: O({ 气血: N(100, 0, 100, true), 魂力: N(100, 0, 1e9, true), 魂力上限: NN(1, 1e9, true), 精神: N(100, 0, 100, true), 投影气血: NN(0, 100, true) }),
    自动状态: DV(),
    伤势: SA(),
    精神力: pre((v) => (isNum(v) || typeof v === 'string' ? { 点数: v } : v), O({ 点数: NN(0, 1e9, true), 境界: DV(), 神识: SN() })),
    武魂: R(Soul),
    天赋能力: R(Ability),
    魂骨: R(Bone, { keys: ['部位', '名称'] }),
    领域: R(Domain),
    功法: Arts,
    融合技: R(Fusion),
    生效状态: R(Effect),
    装备: Gear,
    辅助职业: RN(0, 10),
    神途: Path,
    血脉: Bloods,
  };
  const npcExtra = {
    在场: B(false), 位置: S(), 行动: S(), 情绪: S(), 心声: S(),
    关系标签: SA(/[、，,]/u), 好感度: N(0, -200, 200, true), 好感阶段: DV(), 情意: NN(0, 100, true), 档差: DV(), 血脉关系: DV(),
    联系方式: B(false),
    设定依据: E(['原文', '推定', '本卡规则'], '推定', ALIAS.设定依据),
  };
  // 主角多一个来历：原住民不知道原作走向，穿越者知道（只有主角有，放在原作身份后面）
  const heroShape = Object.fromEntries(Object.entries(base).flatMap(([k, v]) => (k === '原作身份' ? [[k, v], ['来历', E(['原住民', '穿越者'], '原住民', ALIAS.来历)]] : [[k, v]])));
  const Hero = O({ ...heroShape, 气运: Luck }, PERSON_KEYS); // 旧档没有气运：结构给空词条、结局 null，不动别的字段
  const Npc = O({ ...npcExtra, ...base }, PERSON_KEYS);

  const Opponent = O({
    出身: E(['人类', '魂兽'], '人类', ALIAS.出身), 魂力等级: NN(0, 300, true), 修为年限: NN(0, 1e8, true), 凶兽: B(), 神阶: SN(), 神位: B(),
    等效等级: DV(), 档差: DV(),
    资源: O({ 气血: N(100, 0, 100, true) }),
    生效状态: R(Effect), 说明: S(), 档案: SN(),
    血脉: Bloods, 血脉压制: DV(),
  }, PERSON_KEYS);

  const Root = z.object({
    时空: O({
      外界日期: pre((v) => (v == null ? '' : typeof v === 'string' ? normDate(v) : String(v)), z.string()).catch(''),
      场景日期: SN(),
      时层: E(LAYERS, '实际历史', ALIAS.时层),
      地点: S(),
      当前部: pre((v) => (PARTS.includes(v) ? v : null), z.any()),
      当前篇: DV(), 当前幕: DV(), 下一幕: DV(),
      跳时总结: SN(),
    }),
    原作指导: O({
      幕: pre((v) => (typeof v === 'string' ? v : null), z.any()),
      来源: DV(),
      当前事件: SN(),
      事件: R(O({ 日期: S(), 标题: S(), 状态: E(['未发生', '已发生', '已改写', '无法发生'], '未发生', ALIAS.事件状态), 原因: S(), 关联蝴蝶: SA(/[、，,]/u) })),
    }),
    蝴蝶效应: R(O({
      名称: S(), 原作走向: S(), 实际走向: S(),
      发生于: O({ 日期: S(), 幕: S() }),
      波及: SA(), 状态: E(['扩散中', '收束中'], '扩散中', ALIAS.蝴蝶状态),
    }), { keys: ['编号'] }),
    永久改写: R(O({ 内容: S(), 影响范围: E(['本篇', '本部', '跨部'], '本部', ALIAS.影响范围) }), { keys: ['编号'], coerce: (v) => ({ 内容: String(v) }) }),
    人物归档: R(O({ 结局: S(), 关系: S() }), { keys: ['姓名'] }),
    主角: Hero,
    人物: R(Npc, { keys: ['姓名', '名称'] }),
    势力声望: R(O({ 声望: N(0, -100, 100, true), 身份: S(), 积分: RN(), 对本宗: EN(STANCES, ALIAS.对本宗) })),
    钱包: pre((v) => (isObj(v) ? v : {}), z.record(z.string(), z.any())).catch({}),
    行囊: R(O({
      类别: S('杂物'), 数量: N(1, 0, 1e9, true), 说明: S(),
      年限: NN(0, 1e8, true).optional(), 层级: SN().optional(), 品级: SN().optional(), 亲和度: NN(0, 100).optional(),
    })),
    战斗: O({
      交战中: B(false), 地点: SN(), 局势: SN(), 伤害口径: DV(),
      我方: SA(/[、，,]/u), 对手: R(Opponent), 已用越级条件: SA(),
    }),
    宗门: Sect,
    // 脚本发给 AI 的提醒（工程完工、欠费、遗传建议、神级降档……）：每轮更新结束时由脚本整份重写，AI 写了也会被覆盖
    脚本提醒: SA(),
  });
  return Root.transform(finishRoot);
}

// ───────── 日期 ─────────
// 只有写全年月日时才改成标准写法（斗罗历2644年03月11日）；只写到年或月的原样保留
function normDate(s) {
  const t = s.replace(/\s/g, '');
  const m = t.replace(/^斗罗历/u, '').match(/^(前)?(\d{1,9})年(\d{1,2})月(\d{1,2})日$/u);
  if (!m) return t;
  const k = dateKey(t);
  return k == null ? t : fmtDate(k);
}
function fullDateKey(s) {
  if (typeof s !== 'string') return null;
  return /\d+年\d{1,2}月\d{1,2}日$/u.test(s.replace(/\s/g, '')) ? dateKey(s) : null;
}
// 事件日期取自幕索引
const eventDate = (a, b) => fmtRange(a, b);

// ───────── 原作指导 ─────────
function rebuildGuide(g, loc) {
  const sameAct = g.幕 === loc.指导名 && loc.指导名 != null;
  const old = g.事件 || {};
  const events = {};
  for (const [id, a, b, title] of loc.事件) {
    const o = sameAct || loc.来源 === '前史篇' ? old[id] : null;
    events[id] = {
      日期: eventDate(a, b), 标题: title,
      状态: o ? o.状态 : '未发生',
      原因: o ? o.原因 : '',
      关联蝴蝶: o ? o.关联蝴蝶 : [],
    };
  }
  g.幕 = loc.指导名;
  g.来源 = loc.来源;
  g.事件 = events;
  if (!g.当前事件 || !events[g.当前事件]) {
    const first = Object.entries(events).find(([, e]) => e.状态 === '未发生');
    g.当前事件 = first ? first[0] : null;
  }
}

// ───────── 人物派生 ─────────
const MECH_FLOOR = Object.freeze({ 黄: 35, 紫: 55, 黑: 75, 红: 90 });
const MECH_ACTIVE = /驾驶|出战|启动|启用|作战/u;
const AUTO_KIND = Object.freeze({
  斗铠: /斗铠/u, 机甲: /机甲/u, 双甲流: /双甲/u, 武魂真身: /真身/u, 魂力枯竭: /魂力枯竭|魂力耗尽/u,
});

function armorEffect(a, normal) {
  if (!a || a.状态 !== '穿戴中') return null;
  const core = /核心/u.test(a.形态);
  const n = a.字数;
  const v = armorBonus(n, normal, a.契合度, core);
  const tag = core ? '核心部件' : '完整';
  const fitTxt = isNum(a.契合度) ? `，契合度 ${a.契合度}%` : '';
  return { 类型: '加成', 数值: v, 剩余: '穿戴中', 来源: `${cnSmall(n)}字斗铠·${a.名称 || '斗铠'}（${tag}${fitTxt}）` };
}
function mechEffect(m) {
  if (!m || !MECH_ACTIVE.test(m.状态) || !MECH_FLOOR[m.颜色]) return null;
  return { 类型: '保底', 数值: MECH_FLOOR[m.颜色], 剩余: m.状态, 来源: `${m.颜色}级机甲${m.名称}` };
}

// 重算自动生效状态：先清掉上一轮脚本加的，再按装备、领域、真身、资源重新生成
function autoEffects(p, normal) {
  const manual = {};
  for (const [k, e] of entriesOf(p.生效状态)) if (!e.自动) manual[k] = { ...e };
  const auto = {};
  const add = (name, e) => { if (e) auto[name] = { ...e, 自动: true }; };
  const g = p.装备 || {};
  const ae = armorEffect(g.斗铠, normal), me = mechEffect(g.机甲);
  if (ae && me) {
    const armorLv = normal + ae.数值;
    const dualPlus = normal >= 100 ? 1 : normal >= 95 ? 2 : normal >= 85 ? 3 : 4;
    let dualLv = Math.max(armorLv, me.数值) + dualPlus;
    if (g.斗铠 && g.斗铠.字数 <= 3 && normal < 100) dualLv = Math.min(dualLv, 99);
    if (normal < 140 && dualLv >= 140) dualLv = 139;
    add('双甲流', { 类型: '保底', 数值: dualLv, 剩余: '斗铠与机甲同时在身', 来源: `${ae.来源}＋${me.来源}，双甲增幅 +${dualPlus}` });
  } else {
    add('斗铠·' + (g.斗铠 && g.斗铠.名称 || '斗铠'), ae);
    add('机甲·' + (g.机甲 && g.机甲.名称 || '机甲'), me);
  }
  for (const [n, d] of entriesOf(p.领域)) {
    if (d.状态 !== '展开中' || !isNum(d.加成百分比) || d.加成百分比 <= 0) continue;
    add(n + '·展开', { 类型: '加成', 数值: Math.floor(d.加成百分比 / 10) * 3, 剩余: '展开中', 来源: `${n}（${d.加成百分比}%）` });
  }
  for (const [n, w] of entriesOf(p.武魂)) if (w.武魂真身 === '展开中') add('武魂真身·' + n, { 类型: '加成', 数值: 5, 剩余: '展开中', 来源: `${n}武魂真身` });
  if (p.资源 && p.资源.魂力 <= 0) add('魂力枯竭', { 类型: '限制', 数值: 20, 剩余: '魂力恢复前', 来源: '魂力耗尽，不能释放魂技' });
  // AI 手写的同类条目由脚本条目顶替，避免重复计数
  const kinds = new Set();
  for (const k of Object.keys(auto)) for (const [kind, re] of Object.entries(AUTO_KIND)) if (re.test(k)) kinds.add(kind);
  const domains = Object.keys(auto).filter((k) => k.endsWith('·展开')).map((k) => k.slice(0, -3));
  for (const [k, e] of Object.entries(manual)) {
    const text = k + ' ' + (e.来源 || '');
    const dup = [...kinds].some((kind) => AUTO_KIND[kind].test(text)) || domains.some((d) => text.includes(d) && /展开/u.test(text));
    if (dup) delete manual[k];
  }
  // 限制写成负数的统一成正数
  for (const e of Object.values(manual)) if (e.类型 === '限制' && e.数值 < 0) e.数值 = -e.数值;
  return { ...manual, ...auto };
}

function enforceRings(p) {
  for (const [, w] of entriesOf(p.武魂)) {
    let plain = 0;
    for (const r of w.魂环) {
      if (!r.神级) { plain += 1; if (plain > 9) r.神级 = true; }
      r.魂环颜色 = RING_PALETTE.normalize(r.魂环颜色);
      r.颜色 = r.魂环颜色 || ringColor(r);
      r.金纹 = goldLines(r, ringColor(r));
    }
  }
  // 只有一个武魂时默认它在使用中；多个都标使用中时只留第一个
  const souls = entriesOf(p.武魂).filter(([, w]) => w.形态 !== '血脉');
  const on = souls.filter(([, w]) => w.使用中);
  if (!on.length && souls.length) souls[0][1].使用中 = true;
  else on.slice(1).forEach(([, w]) => { w.使用中 = false; });
}

function enforceLevel(p, part) {
  if (!isNum(p.魂力等级)) return;
  // 魂环瓶颈不再硬压（2026-11-16）：变量里常常只记了一部分魂环，硬压会把 NPC 等级卡死。
  // 缺环只在“下一道坎”里提醒，由 AI 按原作规则处理。斗1–3 没有神位/神阶不过 99 级仍然硬压。
  if (part !== '斗4' && !isTrueGod(p)) p.魂力等级 = Math.min(p.魂力等级, 99);
}

function finishPerson(p, part, isHero) {
  guardGodSoul(p, p.姓名 || (isHero ? '主角' : '人物'));
  enforceRings(p);
  enforceLevel(p, part);
  const a = p.装备.斗铠;
  if (a) a.字数 = Math.min(a.字数, part === '斗4' || part === '神界' || part === '英雄' ? 6 : 4);
  const maxSp = maxSoulPower(p, part);
  const hadMax = isNum(p.资源.魂力上限);
  if (!hadMax && p.资源.魂力 <= 100) {
    p.资源.魂力 = Math.round(clampN(p.资源.魂力, 0, 100) / 100 * maxSp);
  } else {
    p.资源.魂力 = clampN(Math.round(p.资源.魂力), 0, maxSp);
  }
  p.资源.魂力上限 = maxSp;
  const normal = normalLevel(p, part);
  p.生效状态 = autoEffects(p, normal);
  p.等效等级 = { 常态: normal, 当前: currentLevel(normal, p.生效状态) };
  p.称号 = titleOf(p, part);
  p.下一道坎 = nextHurdle(p, part, isHero);
  p.精神力.境界 = p.精神力.神识 ? null : spiritRealm(p.精神力.点数, part);
  const auto = [];
  if (p.资源.魂力 <= 0) auto.push('魂力枯竭');
  if (p.资源.精神 <= 0) auto.push('精神崩溃');
  if (p.资源.气血 <= 0) auto.push('濒死');
  p.自动状态 = auto;
}

// ───────── 气运（无状态的部分；要对比更新前后的把关见下面的 guardLuck） ─────────
// 厄 / 绝、彩色、晋阶得来的没有晋阶（一条只晋阶一次）；正面没有化解、死劫；“绝”缺死劫补“条件不明”的未显死劫；
// 倒计时 = 死劫期限 − 外界日期（天）。
// 9 条、彩色 2 个的上限放在 guardLuck：只有对比上一轮才分得清哪条是先拿到的、哪个彩是新加的，也才能把晋阶前的金阶词条还原
const LUCK_MAX = 9, RAINBOW_MAX = 2;
const LUCK_BAD = (e) => !!e && (e.品阶 === '厄' || e.品阶 === '绝');
function finishLuck(L, today) {
  if (!L || !isObj(L.词条)) return;
  for (const e of Object.values(L.词条)) {
    const bad = LUCK_BAD(e);
    if (bad || e.品阶 === '彩' || e.来源 === '晋阶') e.晋阶 = null;
    if (!bad) e.化解 = null;
    if (e.品阶 !== '绝') e.死劫 = null;
    else if (!e.死劫) e.死劫 = { 条件: '条件不明', 劫兆: '未显', 期限: null };
    const end = e.死劫 ? fullDateKey(e.死劫.期限) : null;
    e.倒计时 = end != null && today != null ? dayNo(end) - dayNo(today) : null;
  }
}

// ───────── 战斗 ─────────
// 返回每个对手的 { 常态, 神位 }（血脉压制要按常态比修为、重算档差）
function finishBattle(b, r, H, part) {
  b.伤害口径 = b.交战中 ? DAMAGE_MODE[r.时空.时层] || '真实' : null;
  const info = {};
  for (const [oppName, o] of entriesOf(b.对手)) {
    const linked = o.档案 && r.人物[o.档案];
    if (linked) {
      o.等效等级 = { 当前: linked.等效等级.当前 };
      o.档差 = linked.档差;
      info[oppName] = { 常态: linked.等效等级.常态, 神位: isTrueGod(linked) };
      continue;
    }
    let normal = isNum(o.魂力等级) ? o.魂力等级 : isNum(o.修为年限) ? beastLevel(o.修为年限, o.凶兽) : 0;
    if (!isNum(o.魂力等级) && isNum(o.修为年限) && isNonCombatBeast({ 姓名: oppName, 说明: o.说明 })) normal = Math.min(normal, 65);
    if (part !== '斗4' && o.神阶 && GOD_LEVEL[o.神阶]) normal = Math.max(normal, GOD_LEVEL[o.神阶]);
    normal = Math.round(normal);
    const eff = {};
    for (const [k, e] of entriesOf(o.生效状态)) eff[k] = e.类型 === '限制' && e.数值 < 0 ? { ...e, 数值: -e.数值 } : e;
    o.生效状态 = eff;
    o.等效等级 = { 当前: currentLevel(normal, eff) };
    const oppGod = !!(o.神位 || (o.神阶 && GOD_LEVEL[o.神阶] >= 100) || ((part === '神界' || part === '英雄') && normal >= 100));
    o.档差 = gapOf(H, { 当前: o.等效等级.当前, 常态: normal, 神位: oppGod }, part);
    info[oppName] = { 常态: normal, 神位: oppGod };
  }
  return info;
}

// ───────── 根 ─────────
function finishRoot(r) {
  SBC_NOTES.length = 0;
  const t = r.时空, g = r.原作指导;
  const key = fullDateKey(t.外界日期);
  const hint = { 当前部: t.当前部, 幕: g.幕, 时层: t.时层 };
  const part = key != null ? contentPart(ACT_INDEX, key, hint) : t.当前部;
  const loc = locateAct(ACT_INDEX, key, { 幕: g.幕, 事件: g.事件 }, hint);
  t.当前部 = part || null;
  t.当前篇 = loc.篇;
  t.当前幕 = loc.幕;
  t.下一幕 = loc.下一幕;
  rebuildGuide(g, loc);
  if (key == null) g.来源 = '无';

  const P = part || '斗1';
  const hero = r.主角;
  finishPerson(hero, P, true);
  finishLuck(hero.气运, key);
  if (hero.姓名 && r.人物[hero.姓名]) delete r.人物[hero.姓名]; // 扮演原作角色时本人不进 NPC 档案
  hero.血脉 = finishBloods(hero.血脉, hero.姓名 || '主角');
  const H = { ...hero.等效等级, 神位: isTrueGod(hero) };
  for (const [n, p] of entriesOf(r.人物)) {
    if (!p.姓名) p.姓名 = n;
    finishPerson(p, P, false);
    p.好感阶段 = affectionStage(p.好感度);
    p.档差 = gapOf(H, { ...p.等效等级, 神位: isTrueGod(p) }, P);
    // 原作人物的血脉为空时按原作血脉表填，魂兽按种族查血脉谱（§2.1）
    if (!Object.keys(p.血脉).length) p.血脉 = canonBloods(n, P, key) || (p.出身 === '魂兽' ? speciesBloods(p.种族) : null) || {};
    p.血脉 = finishBloods(p.血脉, n);
  }
  for (const [n, o] of entriesOf(r.战斗.对手)) o.血脉 = finishBloods(o.血脉, n);
  const info = finishBattle(r.战斗, r, H, P);
  // 血脉压制改了主角或对手的当前等效等级时，按新数重算档差
  if (applyBloodRelations(r, P, info)) {
    const H2 = { ...hero.等效等级, 神位: isTrueGod(hero) };
    for (const [, p] of entriesOf(r.人物)) p.档差 = gapOf(H2, { ...p.等效等级, 神位: isTrueGod(p) }, P);
    for (const [n, o] of entriesOf(r.战斗.对手)) {
      const m = info[n];
      if (m) o.档差 = gapOf(H2, { 当前: o.等效等级.当前, 常态: m.常态, 神位: m.神位 }, P);
    }
  }
  for (const [n, it] of entriesOf(r.行囊)) if (it.数量 <= 0) delete r.行囊[n];
  r.钱包 = normalizeWallet(r.钱包, part);
  r.宗门 = finishSect(r.宗门, r, P, key);
  return r;
}

// ───────── 气运把关（在 MVU 更新结束事件里跑，需要更新前后两份数据；契约 §1“脚本把关”、审查记录 A2 A4） ─────────
// 直接改 next，返回改动说明（没改返回 null）：
// 1 结局写下后不能撤，也不能改；
// 2 已有的厄 / 绝：化解、死劫条件锁住（AI 改了还原）；死劫被整条清掉时还原；劫兆只往前走，退回未显须同时是压制；
// 3 彩色最多 2 个：撤掉这一轮新成彩的（从后往前）；它是金阶晋阶来的，就把晋阶前的金阶词条还原，进度写“彩位已满”；
// 4 词条顺序：上一轮就有的在前（按原顺序），新的在后；超 9 条撤掉最后的。最后重算倒计时
const OMEN_NO = Object.freeze({ 未显: 0, 将至: 1, 临头: 2 });
function guardLuck(prev, next) {
  const N = next && isObj(next.主角) ? next.主角.气运 : null;
  if (!isObj(N) || !isObj(N.词条)) return null;
  const P = prev && isObj(prev.主角) && isObj(prev.主角.气运) ? prev.主角.气运 : {};
  const pe = isObj(P.词条) ? P.词条 : {};
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const log = [];
  if (isObj(P.结局) && P.结局.已终结 && !same(N.结局, P.结局)) { N.结局 = copy(P.结局); log.push('结局已写下，不能撤或改'); }

  const ne = N.词条;
  for (const [k, e] of Object.entries(ne)) {
    const o = pe[k];
    if (!LUCK_BAD(o)) continue;
    if (!same(e.化解, o.化解)) { e.化解 = copy(o.化解); log.push(`${k}：化解条件已锁定，还原`); }
    if (!o.死劫) continue;
    if (!e.死劫 || (e.死劫.条件 === '条件不明' && o.死劫.条件 !== '条件不明')) { e.死劫 = copy(o.死劫); log.push(`${k}：死劫不能清掉，还原`); continue; }
    if (e.死劫.条件 !== o.死劫.条件) { e.死劫.条件 = o.死劫.条件; log.push(`${k}：死劫条件已锁定，还原`); }
    const a = OMEN_NO[o.死劫.劫兆], b = OMEN_NO[e.死劫.劫兆];
    if (b < a && !(b === 0 && e.状态 === '压制')) { e.死劫.劫兆 = o.死劫.劫兆; log.push(`${k}：劫兆只往前走，退回未显要先压制成功，还原为${o.死劫.劫兆}`); }
  }

  const back = {}; // 还原的金阶词条：键 → 词条
  const fresh = Object.keys(ne).filter((k) => ne[k].品阶 === '彩' && !(pe[k] && pe[k].品阶 === '彩'));
  let rainbow = Object.values(ne).filter((e) => e.品阶 === '彩').length;
  for (let i = fresh.length - 1; i >= 0 && rainbow > RAINBOW_MAX; i -= 1) {
    const y = fresh[i];
    delete ne[y];
    rainbow -= 1;
    const gone = (k) => !(k in ne) && !(k in back) && pe[k] && pe[k].品阶 === '金' && pe[k].晋阶;
    let x = pe[y] && pe[y].品阶 === '金' ? y : null;
    if (!x) x = Object.keys(pe).find((k) => gone(k) && pe[k].晋阶.晋阶后名称 === y) || null;
    if (!x) x = Object.keys(pe).find((k) => gone(k) && !pe[k].晋阶.晋阶后名称) || null;
    if (x) {
      back[x] = copy(pe[x]);
      back[x].晋阶.进度 = '彩位已满';
      log.push(`彩色已满 ${RAINBOW_MAX} 个：撤掉「${y}」，「${x}」停在金阶`);
    } else log.push(`彩色已满 ${RAINBOW_MAX} 个：撤掉新加的「${y}」`);
  }

  const merged = { ...ne, ...back };
  const order = [...Object.keys(pe).filter((k) => k in merged), ...Object.keys(merged).filter((k) => !(k in pe))];
  const out = {};
  for (const k of order) {
    if (Object.keys(out).length >= LUCK_MAX) { log.push(`词条已满 ${LUCK_MAX} 条：撤掉「${k}」`); continue; }
    out[k] = merged[k];
  }
  N.词条 = out;
  finishLuck(N, next.时空 ? fullDateKey(next.时空.外界日期) : null);
  return log.length ? log : null;
}

// ───────── 跨部转场（在 MVU 更新结束事件里跑，需要更新前后两份数据） ─────────
// 返回改动说明（给测试与日志用）；直接改 next
function crossPart(prev, next) {
  const before = prev && prev.时空 ? fullDateKey(prev.时空.外界日期) : null;
  const after = next && next.时空 ? fullDateKey(next.时空.外界日期) : null;
  if (before == null || after == null) return null;
  // 与当前部同一规则：过了上一部正篇结尾就算进了下一部（前史），在下一部前史里认识的人进正篇时不会被归档
  const fromHint = { 当前部: prev.时空.当前部, 幕: prev.原作指导 && prev.原作指导.幕, 时层: prev.时空.时层 };
  const toHint = { 当前部: next.时空.当前部 || prev.时空.当前部, 幕: next.原作指导 && next.原作指导.幕, 时层: next.时空.时层 };
  const from = contentPart(ACT_INDEX, before, fromHint), to = contentPart(ACT_INDEX, after, toHint);
  if (partNo(to) <= partNo(from)) return null;
  const log = { 从: from, 到: to, 归档: [], 收束: [], 清掉: [] };
  const oldPeople = (prev.人物 && Object.keys(prev.人物)) || [];
  next.人物归档 = isObj(next.人物归档) ? next.人物归档 : {};
  for (const name of oldPeople) {
    const p = next.人物 && next.人物[name];
    if (!p || p.长存手段) continue;
    if (!next.人物归档[name]) {
      const labels = Array.isArray(p.关系标签) && p.关系标签.length ? p.关系标签.join('、') : affectionStage(p.好感度);
      next.人物归档[name] = { 结局: `${from}结束后的结局未写明`, 关系: labels };
    }
    delete next.人物[name];
    log.归档.push(name);
  }
  // 还在进行的蝴蝶效应收束成跨部永久改写
  next.永久改写 = isObj(next.永久改写) ? next.永久改写 : {};
  for (const [id, b] of entriesOf(next.蝴蝶效应)) {
    let n = 1;
    while (next.永久改写['P' + n]) n += 1;
    next.永久改写['P' + n] = { 内容: `${b.名称 || id}：${b.实际走向 || '（实际走向未写）'}`, 影响范围: '跨部' };
    log.收束.push(id);
  }
  next.蝴蝶效应 = {};
  for (const [id, m] of entriesOf(next.永久改写)) {
    if (m.影响范围 !== '跨部') { delete next.永久改写[id]; log.清掉.push(id); }
  }
  // 编号重排成 P1、P2……
  next.永久改写 = Object.fromEntries(Object.values(next.永久改写).map((m, i) => ['P' + (i + 1), m]));
  if (next.战斗) next.战斗 = { ...next.战斗, 交战中: false, 对手: {}, 我方: [], 已用越级条件: [], 局势: null, 地点: null, 伤害口径: null };
  return log;
}

const installDLExt = (() => {
/* 斗罗 · 叙事核心的共用规则（纯函数，不碰宿主）
 * 开局、剧情窗口、七个核心脚本都拼进这一段，规则只有一份。术语见 CONTEXT.md“叙事核心”一节，决定见 设计决定.md §22–§23。
 *
 * 世界书里每个核心三条，名字固定、默认关着：
 *   叙事核心·万年黑幕·设定              深度 0、顺序 10
 *   叙事核心·万年黑幕·审查              深度 0、顺序 11
 *   [mvu_update]叙事核心·万年黑幕·变量更新规则   排在原有更新规则之后
 * 当前聊天选了哪个核心，就只开它的那几条，别的核心的条目全关。
 */
const CORES = Object.freeze(['万年黑幕', '全员嘉豪', '神界污染', '做减求空', '诸神围观', '衣冠修罗', '诸天猎场']);
const NO_CORE = '无核心';
const CORE_ID_RE = /^[^·\s/]{1,12}$/u;
const CORE_INFO = Object.freeze({
  万年黑幕: Object.freeze({ 全名: '万年黑幕·伪神唐王', 题: '伪神唐王', 引: '你所知道的斗罗，是胜利者写下的版本。' }),
  全员嘉豪: Object.freeze({ 全名: '全员嘉豪·排面至上', 题: '排面至上', 引: '这片大陆上，每个人都活在聚光灯下。' }),
  神界污染: Object.freeze({ 全名: '神界污染·飞升骗局', 题: '飞升骗局', 引: '成神的那一刻，祂们才看清自己去了哪里。' }),
  做减求空: Object.freeze({ 全名: '做减求空·斩我见真', 题: '斩我见真', 引: '世人修行皆做加法，唯你一刀一刀斩去自己。' }),
  诸神围观: Object.freeze({ 全名: '诸神围观·神座打赏', 题: '神座打赏', 引: '云端坐满了无聊的神明，你的悲欢是祂们的消遣。' }),
  衣冠修罗: Object.freeze({ 全名: '衣冠修罗·皆为利往', 题: '皆为利往', 引: '情义是筹码不够时的体面，至亲是尚未养熟的魂环。' }),
  诸天猎场: Object.freeze({ 全名: '诸天猎场·夺舍迷局', 题: '夺舍迷局', 引: '熟悉的皮囊底下换了芯子，每个人都在拿这方世界换赏金。' }),
});
const CORE_ENTRY = /^(?:\[mvu_update\]\s*)?叙事核心·([^·\s/]{1,12})·\s*\S[^\r\n]*$/u;

function coreHostWin(win) {
  if (win && typeof win === 'object') return win;
  try {
    if (typeof window !== 'undefined') {
      if (window.parent && window.parent !== window && window.parent.document) return window.parent;
      return window;
    }
  } catch (_) {
    if (typeof window !== 'undefined') return window;
  }
  return null;
}

const isValidCoreId = (c) => typeof c === 'string' && CORE_ID_RE.test(c) && c !== NO_CORE && c !== '无金手指';

function extCoreMap(win) {
  const W = coreHostWin(win);
  const m = W && W.__DL_EXT__ && W.__DL_EXT__.cores;
  return m && typeof m.get === 'function' ? m : null;
}

function extCoreOf(c, win) {
  if (!isValidCoreId(c) || CORES.includes(c)) return null;
  const m = extCoreMap(win);
  const rec = m ? m.get(c) : null;
  if (!rec) return null;
  if (rec.destroyed) return null;
  return rec.def || rec;
}

const isCore = (c, win) => CORES.includes(c) || !!extCoreOf(c, win);

function allCores(win) {
  const m = extCoreMap(win);
  if (!m) return CORES.slice();
  const extra = [];
  for (const [k, rec] of m.entries()) {
    if (rec && !rec.destroyed && isValidCoreId(k) && !CORES.includes(k)) extra.push(k);
  }
  return CORES.concat(extra);
}

function coreInfoOf(c, win) {
  if (CORE_INFO[c]) return CORE_INFO[c];
  return extCoreOf(c, win);
}

function coreRequiredEntries(c) {
  if (!isValidCoreId(c)) return [];
  return [`叙事核心·${c}·设定`, `叙事核心·${c}·审查`, `[mvu_update]叙事核心·${c}·变量更新规则`];
}

/** 条目名属于哪个叙事核心；不是核心条目返回 null */
function coreOfEntry(name) {
  const m = CORE_ENTRY.exec(String(name || '').trim());
  const id = m && m[1];
  return id && id !== NO_CORE && id !== '无金手指' ? id : null;
}

/** 当前聊天选的核心：开局记录（聊天变量“斗罗开局”）为准，其次是变量里的 叙事核心.核心；无核心返回 null */
function chatCore(record, stat) {
  const r = record && typeof record === 'object' ? record : null;
  for (const c of [r && r.叙事核心, r && r.草稿 && r.草稿.叙事核心]) {
    if (c === NO_CORE) return null;
    if (isValidCoreId(c)) return c;
  }
  const s = stat && typeof stat === 'object' && stat.叙事核心;
  return s && isValidCoreId(s.核心) ? s.核心 : null;
}

/** 核心条目该怎么开关：选中的核心的条目开，其余核心的条目关；core 为 null 时全关。只列出要改的 */
function corePlan(entries, core) {
  const 改动 = [];
  let 开着 = 0;
  for (const e of entries || []) {
    const c = coreOfEntry(e && e.name);
    if (!c) continue;
    const on = c === core;
    if (on) 开着 += 1;
    if (Boolean(e.enabled) !== on) 改动.push({ uid: e.uid, name: e.name, enabled: on });
  }
  return { 改动, 开着 };
}

/* 斗罗 · 金手指的共用规则（纯函数，不碰宿主、不碰 DOM）
 * 开局、剧情窗口、六个金手指脚本都拼进这一段，规则只有一份。术语见 CONTEXT.md“金手指”一节，决定见 设计决定.md §24，契约见 气运金手指/变量契约.md §2。
 *
 * 世界书里每个金手指两条，名字固定、默认关着：
 *   金手指·<类型>·设定                   深度 0、顺序 12
 *   [mvu_update]金手指·<类型>·变量更新规则  顺序 9997（排在叙事核心更新规则之后）
 * 当前聊天选了哪个金手指，就只开它的那两条，别的金手指条目全关。
 */
const GFS = Object.freeze(['未来模拟器', '深蓝加点', '诸天代打', '签到打卡', '抽奖', '跨时代聊天群']);
const NO_GF = '无金手指';
// 选这五个系统时，系统面板会显示气运词条，主角知道自己有哪些词条；不选或选跨时代聊天群时主角不知道（变量契约 §1）
const GF_SEE_LUCK = Object.freeze(['未来模拟器', '深蓝加点', '诸天代打', '签到打卡', '抽奖']);
const GF_INFO = Object.freeze({
  未来模拟器: Object.freeze({
    key: 'sim', 匾: '推演', 页签: '推演', 默认名: '推演者', 默认称呼: '宿主',
    语: '先看三天，再决定怎么活',
    说明: '写一句“我打算……”，后台推演未来三天会怎么走；另有“死法推演”，只推三天内最可能的死法。每个外界日补一次，最多攒三次。推演不推进正文。',
  }),
  深蓝加点: Object.freeze({
    key: 'pts', 匾: '加点', 页签: '加点', 默认名: '深蓝', 默认称呼: '宿主',
    语: '把苦修折成点数，加在刀刃上',
    说明: '修炼、实战、任务换来点数，自己往魂力、精神力、魂技熟练度、技艺上加。魂力到瓶颈就停，得吸收魂环；兽身魂兽九万年也须渡劫后解锁。',
  }),
  诸天代打: Object.freeze({
    key: 'hero', 匾: '代打', 页签: '代打', 默认名: '万界门', 默认称呼: '宿主',
    语: '借诸天主角一臂之力',
    说明: '召别的网文主角上身，你只给一句委托。实力不超过你的承载上限；退场后魂力枯竭、冷却几天。一局一次底牌召唤。',
  }),
  签到打卡: Object.freeze({
    key: 'sign', 匾: '签到', 页签: '签到', 默认名: '签到簿', 默认称呼: '宿主',
    语: '日日一签，名地有大奖',
    说明: '每个外界日签一次。冰火两仪眼、海神岛这类名地奖池更好，首签有大奖；连签 7、30、100、365 天有里程碑；跳时不计断签。',
  }),
  抽奖: Object.freeze({
    key: 'gacha', 匾: '抽奖', 页签: '抽奖', 默认名: '命运转盘', 默认称呼: '宿主',
    语: '单抽十连，保底在后',
    说明: '每个外界日补一张免费券，任务给更多。六色品阶出货，10 抽保底红、50 抽保底金；彩色不保底，未出彩满 60 抽后每抽彩率加 0.5%。',
  }),
  跨时代聊天群: Object.freeze({
    key: 'chat', 匾: '群聊', 页签: '聊天群', 默认名: '万界群务官', 默认称呼: '诸位群友',
    语: '隔着时代剧透，收红包',
    说明: '脑海里的异时空聊天群，群友全来自斗罗各时代。剧透应验涨威望，红包是那人当时真拿得出的东西。',
  }),
});
const GF_KEY_TO_TYPE = Object.freeze(Object.fromEntries(GFS.map((t) => [GF_INFO[t].key, t])));
const GF_ID_RE = /^[^·\s/]{1,12}$/u;
const GF_KEY_RE = /^[a-z0-9-]{2,16}$/;
const GF_ENTRY = /^(?:\[mvu_update\]\s*)?金手指·([^·\s/]{1,12})·\s*\S[^\r\n]*$/u;

const GF_DROP_TARGETS = Object.freeze([
  '行囊', '钱包', '武魂', '魂环', '魂骨', '领域', '功法', '天赋能力',
  '生效状态', '精神力', '魂力等级', '辅助职业', '气运', '面板', '其他',
]);
const GF_REWARD_SOURCES = Object.freeze(['签到', '抽奖', '加点', '任务', '红包', '代打', '推演']);
const GF_REWARD_TIERS = Object.freeze(['彩', '金', '红', '紫', '黄', '白']);
const GF_TIER_UP = Object.freeze(['白', '黄', '紫', '红', '金', '彩']);
const GF_TASK_CATS = Object.freeze(['主线', '日常', '突发']);
const GF_TASK_STATES = Object.freeze(['进行中', '已完成', '已失败']);
// 聊天群威望五档（设计 §24.8、审查记录第二段）
const GF_PRESTIGE_TIERS = Object.freeze([
  [80, '万古传说'],
  [60, '群中高人'],
  [40, '有点名气'],
  [20, '初露锋芒'],
  [0, '无人问津'],
]);

function gfHostWin(win) {
  if (win && typeof win === 'object') return win;
  try {
    if (typeof window !== 'undefined') {
      if (window.parent && window.parent !== window && window.parent.document) return window.parent;
      return window;
    }
  } catch (_) {
    if (typeof window !== 'undefined') return window;
  }
  return null;
}

const isValidGfId = (g) => typeof g === 'string' && GF_ID_RE.test(g) && g !== NO_GF && g !== '无核心';

function extGfMap(win) {
  const W = gfHostWin(win);
  const m = W && W.__DL_EXT__ && W.__DL_EXT__.gfs;
  return m && typeof m.get === 'function' ? m : null;
}

function extGfOf(g, win) {
  if (!isValidGfId(g) || GFS.includes(g)) return null;
  const m = extGfMap(win);
  const rec = m ? m.get(g) : null;
  if (!rec || rec.destroyed) return null;
  return rec.def || rec;
}

const isGf = (g, win) => GFS.includes(g) || !!extGfOf(g, win);

function allGfs(win) {
  const m = extGfMap(win);
  if (!m) return GFS.slice();
  const extra = [];
  for (const [k, rec] of m.entries()) {
    if (rec && !rec.destroyed && isValidGfId(k) && !GFS.includes(k)) extra.push(k);
  }
  return GFS.concat(extra);
}

function gfInfoOf(g, win) {
  if (GF_INFO[g]) return GF_INFO[g];
  return extGfOf(g, win);
}

function gfRequiredEntries(g) {
  if (!isValidGfId(g)) return [];
  return [`金手指·${g}·设定`, `[mvu_update]金手指·${g}·变量更新规则`];
}

function gfSeesLuck(g, stat, win) {
  if (stat && stat.金手指 && typeof stat.金手指.气运知情 === 'boolean') return stat.金手指.气运知情;
  if (GF_SEE_LUCK.includes(g)) return true;
  if (!g || g === NO_GF || g === '跨时代聊天群') return false;
  const ext = extGfOf(g, win);
  return ext && typeof ext.气运知情 === 'boolean' ? ext.气运知情 : false;
}

/** 条目名属于哪个金手指；不是金手指条目返回 null */
function gfOfEntry(name) {
  const m = GF_ENTRY.exec(String(name || '').trim());
  const id = m && m[1];
  return id && id !== NO_GF && id !== '无核心' ? id : null;
}

/** 当前聊天选的金手指：开局记录（聊天变量“斗罗开局”）为准，其次是变量里的 金手指.类型；未选返回 null */
function chatGf(record, stat) {
  const r = record && typeof record === 'object' ? record : null;
  for (const g of [r && r.金手指, r && r.草稿 && r.草稿.金手指]) {
    if (g === NO_GF) return null;
    if (isValidGfId(g)) return g;
  }
  const s = stat && typeof stat === 'object' && stat.金手指;
  return s && isValidGfId(s.类型) ? s.类型 : null;
}

/** 金手指条目该怎么开关：选中的金手指条目开，其余金手指条目关；gf 为 null 时全关。只列出要改的 */
function gfPlan(entries, gf) {
  const 改动 = [];
  let 开着 = 0;
  for (const e of entries || []) {
    const g = gfOfEntry(e && e.name);
    if (!g) continue;
    const on = g === gf;
    if (on) 开着 += 1;
    if (Boolean(e.enabled) !== on) 改动.push({ uid: e.uid, name: e.name, enabled: on });
  }
  return { 改动, 开着 };
}

/** 聊天群威望（0–100）→ 威望档 */
function gfPrestigeTier(v) {
  const n = Number.isFinite(Number(v)) ? Number(v) : 20;
  const hit = GF_PRESTIGE_TIERS.find(([lo]) => n >= lo);
  return hit ? hit[1] : '无人问津';
}

/** 等效等级 → 奖池强度段（1–5，契约 §5） */
function gfStrengthBand(eq) {
  const n = Number(eq) || 1;
  if (n >= 100) return 5;
  if (n >= 90) return 4;
  if (n >= 60) return 3;
  if (n >= 30) return 2;
  return 1;
}

/** 归一化自定义口吻预设数组（兼容 {预设,自称,称呼,描述}、guide 提示词 {名称,称呼,描述} 与简写 {名,述}） */
function normalizeGfToneList(list, info) {
  if (!Array.isArray(list)) return [];
  const defName = (info && info.默认名) || '系统';
  const defCall = (info && info.默认称呼) || '宿主';
  return list
    .filter((p) => p && typeof p === 'object')
    .map((p) => {
      const preset = String(p.预设 || p.名称 || p.名 || '').trim();
      if (!preset) return null;
      const selfName = String(p.自称 || p.名字 || defName).trim();
      const callName = String(p.称呼 || defCall).trim();
      const desc = String(p.描述 || p.述 || '').trim();
      return { ...p, 预设: preset, 自称: selfName, 名字: selfName, 称呼: callName, 描述: desc };
    })
    .filter(Boolean);
}

/** 取得某金手指的口吻预设组：{ isChat, list } */
function gfTonesFor(gfType, tones, win) {
  const info = gfInfoOf(gfType, win);
  if (info && Array.isArray(info.口吻预设)) {
    return { isChat: false, list: normalizeGfToneList(info.口吻预设, info) };
  }
  const isChat = gfType === '跨时代聊天群' || !!(info && info.口吻预设 === '群主机器人');
  const list = tones && (isChat ? tones.群主机器人 : tones.系统);
  return { isChat, list: Array.isArray(list) ? list : [] };
}

/** 默认口吻（可传入 GF_TONES 数据表；没传时退回基础默认） */
function gfDefaultTone(gfType, tones, win) {
  const info = gfInfoOf(gfType, win);
  const { isChat, list } = gfTonesFor(gfType, tones, win);
  const first = Array.isArray(list) && list[0];
  if (first) {
    return {
      名字: (isChat ? (info && info.默认名 ? info.默认名 : first.名字) : info ? info.默认名 : (first.自称 || first.名字)) || '系统',
      称呼: (info && info.默认称呼) || first.称呼 || (isChat ? '诸位群友' : '宿主'),
      预设: first.预设 || null,
      描述: first.描述 || '',
    };
  }
  return {
    名字: (info && info.默认名) || '系统',
    称呼: (info && info.默认称呼) || (isChat ? '诸位群友' : '宿主'),
    预设: isChat ? '政务管事' : '冷漠机械',
    描述: isChat ? '端庄肃穆的群务播报官，用语规范干练。' : '只陈述事实、数字与结论，不带情绪。',
  };
}

/** 口吻预设 → 写入变量的口吻对象（审查记录 Q1：系统用 自称→名字，群主机器人用 名字→名字） */
function gfToneFromPreset(gfType, presetObj, win) {
  if (!presetObj || typeof presetObj !== 'object') return gfDefaultTone(gfType, null, win);
  const info = gfInfoOf(gfType, win);
  const isChat = gfType === '跨时代聊天群' || !!(info && info.口吻预设 === '群主机器人');
  return {
    名字: String((isChat ? presetObj.名字 : (presetObj.自称 || presetObj.名字)) || (info && info.默认名) || '系统').trim().slice(0, 8),
    称呼: String(presetObj.称呼 || (info && info.默认称呼) || (isChat ? '诸位群友' : '宿主')).trim().slice(0, 8),
    预设: presetObj.预设 ? String(presetObj.预设).trim().slice(0, 16) : null,
    描述: String(presetObj.描述 || '').trim().slice(0, 120),
  };
}

/* 由 源码/build.py 从 气运金手指/gemini交付/通用/口吻预设.json 自动生成，勿手改。 */
const GF_TONES = {
 "系统": [
  {
   "预设": "冷漠机械",
   "描述": "冰冷精准、不带感情波动的电子播报，只陈述事实、数字与结论，绝不多说半句废话。",
   "自称": "本系统",
   "称呼": "宿主",
   "试听": {
    "未来模拟器": "推演完成。宿主若维持现行打算，三日后生还率为零，建议即刻变更路线。",
    "深蓝加点": "点数扣除完毕。目标技艺已跃升至大成，躯壳突破反响将于下轮同步结算。",
    "诸天代打": "跨界通道开启，承载上限已锁定。委托完毕或三轮届满后即刻强制退场。",
    "签到打卡": "坐标校验通过，首签达成。奖励已写入待入账队列，请宿主于现世接收。",
    "抽奖": "单抽结算完毕，出货品阶为紫。距十抽红阶保底尚余四次，奖励待入账。"
   }
  },
  {
   "预设": "毒舌损友",
   "描述": "嘴硬心软、擅长吐槽揭短的老熟人口吻，越是危急越爱阴阳怪气地催促，嘴毒却从不掉链子。",
   "自称": "本大爷",
   "称呼": "菜鸟",
   "试听": {
    "未来模拟器": "菜鸟，三天后你连骨灰都被扬得挺均匀啊，还不赶紧换条路跑？",
    "深蓝加点": "点数都攒发霉了才舍得花？行，替你灌进去，疼得嚎出来别怪本大爷。",
    "诸天代打": "打不过就摇人，菜鸟你倒是挺有自知之明。站稳了，那位爷这就上身！",
    "签到打卡": "跑这么大老远才摸到这块宝地，首签货倒不错，别拿在手里又给弄丢了。",
    "抽奖": "手气黑成这样也算独步大陆了，好在保底救了你一命，红光赶紧领走！"
   }
  },
  {
   "预设": "贱萌话痨",
   "描述": "爱撒娇、爱起哄、戏多到停不下来的活泼话痨，动不动拍手邀功，总爱把大事说得鸡飞狗跳。",
   "自称": "小统子",
   "称呼": "老板",
   "试听": {
    "未来模拟器": "老板老板不好啦！刚推演完您后天就要挨揍啦，快听小统子的赶紧溜吧！",
    "深蓝加点": "叮叮叮加点成功！老板快看面板亮起来啦，小统子手都拍红了，快夸我！",
    "诸天代打": "哇塞！摇来位超凶的大佬上身啦，老板快退后吃瓜，看人家帮咱清场子！",
    "签到打卡": "打卡成功耶！老板在这儿签出稀罕宝贝啦，记进待入账了，待会儿见分晓！",
    "抽奖": "转起来转起来——出金啦出金啦！老板您今天欧气爆棚，小统子都要跳起来了！"
   }
  },
  {
   "预设": "古风天道",
   "描述": "庄重古雅、淡漠苍茫的太古天音，句式工整多用文言短语，俯瞰尘世兴衰而不失几分点化意味。",
   "自称": "吾",
   "称呼": "小友",
   "试听": {
    "未来模拟器": "天机已演，三日之后死劫伏于前路。小友若肯易道而行，尚有一线生机。",
    "深蓝加点": "道途精进，破关在此一举。点数已化灵光入体，望小友静心体悟此番蜕变。",
    "诸天代打": "星门洞开，异界英灵应召临凡。借力终有反噬，三轮之后须还此身清明。",
    "签到打卡": "灵地初临，气数相合。此番首签机缘已记于册，不日便当显化于小友眼前。",
    "抽奖": "气运轮转，紫气东来。此番所抽奇珍已定名录，待入尘世便归小友掌中。"
   }
  },
  {
   "预设": "中二热血",
   "描述": "燃到发烫、张口便是宿命与苍穹的少年热血口吻，自带战歌气场，把每次操作都喊得惊天动地。",
   "自称": "燃魂星枢",
   "称呼": "破界者",
   "试听": {
    "未来模拟器": "破界者！未来三日的漆黑命轨已映入眼瞳，去亲手撕碎那道死局吧！",
    "深蓝加点": "燃起来吧！极限突破的号角已经吹响，这股沸腾的力量将震撼整片大陆！",
    "诸天代打": "万界星门轰然洞开！回应此身召唤的传奇强者，此刻降临于你掌中！",
    "签到打卡": "足迹烙印传奇之地！首签星印轰然落下，绝世宝藏正呼唤破界者之名！",
    "抽奖": "赌上全部气运的命运十连！冲破苍穹的赤红光柱，见证奇迹降临的瞬间吧！"
   }
  },
  {
   "预设": "温柔管家",
   "描述": "礼数周全、温润体贴的私家老执事，时刻记挂主角安危与体面，提醒风险时也总是轻声细语。",
   "自称": "执事",
   "称呼": "阁下",
   "试听": {
    "未来模拟器": "阁下，未来三日推演已妥，前方恐有暗礁，执事已为您标出可避之径。",
    "深蓝加点": "已按阁下吩咐完成加点，突破时经脉略胀，还请阁下寻一处静室妥善调息。",
    "诸天代打": "阁下，应召高人已至门前。退场后魂力将有亏损，执事已备好后续调养提醒。",
    "签到打卡": "今日名地首签已替阁下登簿，所得奇珍已入待入账，稍后便可从容收用。",
    "抽奖": "恭喜阁下，此番开箱喜获紫阶珍品，已妥善记档，待您闲暇时再行查收。"
   }
  }
 ],
 "群主机器人": [
  {
   "预设": "政务管事",
   "名字": "万界群务官",
   "称呼": "诸位群友",
   "描述": "端庄肃穆的群务播报官，用语规范干练，负责宣读新友入群、红包登账、剧透应验与委托通告。",
   "试听": "通告诸位群友：新成员已接入异时空频道，高人所留红包与委托均已生效。"
  },
  {
   "预设": "市井吃瓜",
   "名字": "吃瓜小铃铛",
   "称呼": "各位大佬",
   "描述": "活泼爱凑热闹的茶楼掌柜风格，专爱渲染新人入群、催抢红包、围观剧透应验后的群内炸锅场面。",
   "试听": "铛铛铛！各位大佬快出来迎新啦，刚有人改命成功甩出大红包，手慢可就没喽！"
  },
  {
   "预设": "古殿司仪",
   "名字": "星阁司仪",
   "称呼": "列位道友",
   "描述": "沉雅古韵的星阁司礼，善以金石雅语唱名新人入席、记述天机应验与异时空谢礼奉上，格调极高。",
   "试听": "星河共振，新客登席。列位道友静听：前番天机已然应验，谢礼封缄送达群中。"
  },
  {
   "预设": "毒舌群管",
   "名字": "值班铁算盘",
   "称呼": "群里诸位",
   "描述": "精明毒舌的守规群管，平时专爱催交红包、揭穿吹牛、核算威望涨跌，报喜时也要顺嘴损上两句。",
   "试听": "群里诸位都别潜水装死了，新人进门还不发红包？方才那条剧透竟真验上了。"
  }
 ]
};

/* 由 源码/build.py 从 气运金手指/gemini交付/通用/通用奖池.json 自动生成，勿手改。 */
const GF_POOL = [{"名称":"史莱克外院荐信","品阶":"白","出处":"斗罗","说明":"顶级学府举荐信，凭此免初试入考并微涨对应势力声望；神界折为巡猎引荐帖。","落点":"其他","强度段":[1,2],"限制":"仅对应本时代主流学府或神界组织生效"},{"名称":"铁精飞蝗石（一囊）","品阶":"白","出处":"斗罗","说明":"唐门手法暗器三十枚，精铁铸就，手法纯熟可破护体魂力并打断敌方蓄技。","落点":"行囊","强度段":[1,2],"限制":"消耗品，投出后需自行回收"},{"名称":"含沙射影","品阶":"白","出处":"斗罗","说明":"腕部机括暗器，近距猝发细针三十六枚，低阶魂师防身奇兵，装填简便。","落点":"行囊","强度段":[1,2],"限制":"钢针耗尽须另行装填，难穿高阶魂力护罩"},{"名称":"白虎匕","品阶":"白","出处":"斗罗","说明":"材质坚韧的锋利短匕，可削铁断木，宜初阶魂师近身防身与采集魂兽材料。","落点":"行囊","强度段":[1,2],"限制":null},{"名称":"一级聚能奶瓶","品阶":"白","出处":"斗罗","说明":"基础储魂魂导器，内置少许精纯魂力，战时应急吸纳可缓魂力枯竭之危。","落点":"行囊","强度段":[1,2],"限制":"耗尽须另行充注魂力；斗1折为储魂玉佩"},{"名称":"百锻沉银胚","品阶":"白","出处":"斗罗","说明":"入门锻造金属胚料，质地匀密，可供练手锤炼锻造造诣或打造基础兵刃零件。","落点":"行囊","强度段":[1,2,3],"限制":null},{"名称":"魂师药浴散","品阶":"白","出处":"斗罗","说明":"学院常备固本药粉，温水浸泡可舒缓体能训练暗伤并微强初阶魂师筋骨。","落点":"行囊","强度段":[1,2],"限制":"仅一段至二段效果显著，共三贴"},{"名称":"时代钱袋·散资","品阶":"白","出处":"斗罗","说明":"按当前部折算百枚金魂币或等值联邦币、斗罗币；神界与英雄折为神力微尘入行囊。","落点":"钱包","强度段":[1,2,3,4,5],"限制":"严禁跨部混用币种，神界与英雄不入钱包"},{"名称":"清心宁神茶（罐）","品阶":"白","出处":"斗罗","说明":"温润草木灵茶，饮后三日内冥想不易杂念纷扰，略缓精神疲惫，各段日常皆宜。","落点":"生效状态","强度段":[1,2,3,4,5],"限制":"不抵高阶精神冲击，不可叠加多层"},{"名称":"基础技艺心得札","品阶":"白","出处":"斗罗","说明":"百工杂学手札，深蓝面板任一技艺项涨少许进度；无面板折为辅助职业基础略进。","落点":"面板","强度段":[1,2,3,4,5],"限制":"不破魂环瓶颈与职业高阶门槛"},{"名称":"气运微光符","品阶":"白","出处":"斗罗","说明":"携之近三日小吉微现；若主角气运词条未满9条，可借机添一条白阶正面词条。","落点":"气运","强度段":[1,2,3,4,5],"限制":"严守9条与2彩上限，不改厄运词条"},{"名称":"高阶魂导维修包","品阶":"白","出处":"斗罗","说明":"内含星铁丝与魂力焊剂，可应急修补受损魂导器、机甲或斗铠非核心部件。","落点":"行囊","强度段":[3,4,5],"限制":"斗1折为精密暗器修补匣，不可修复神器"},{"名称":"淡薄仙灵露","品阶":"白","出处":"斗罗","说明":"极稀薄仙灵之气凝成的清露，高阶强者饮之润养经脉、舒缓大战暗伤与疲乏。","落点":"行囊","强度段":[4,5],"限制":"仅作日常润养，不增魂力等级也不破神阶"},{"名称":"回气丹（一瓶）","品阶":"白","出处":"斗破苍穹","说明":"三枚装速效回魂丹，在斗罗中服后立刻回复三成魂力上限，急战续航颇佳。","落点":"行囊","强度段":[1,2,3],"限制":"半日内多服药效减半，不超当前魂力上限"},{"名称":"储物袋","品阶":"白","出处":"凡人修仙传","说明":"修真界制式空间布袋，在斗罗中相当于十立方米储物魂导器，轻便不耗魂力。","落点":"行囊","强度段":[1,2,3,4],"限制":"不可存放活物，随身绑定防失窃"},{"名称":"百草液","品阶":"白","出处":"遮天","说明":"灵墟洞天草木精华药液，在斗罗中当低阶淬体灵剂，缓复气血并打磨初期体魄。","落点":"行囊","强度段":[1,2],"限制":"三十级以上效果微弱，共两小瓶"},{"名称":"龙血（小瓶）","品阶":"白","出处":"吞噬星空","说明":"怪兽时代龙类淬体药剂，在斗罗中可温和强健肌肉筋骨，助初阶魂师稳固根基。","落点":"行囊","强度段":[1,2],"限制":"一次性稀释装，不含龙神血脉威压"},{"名称":"阳元丹（一瓶）","品阶":"白","出处":"武动乾坤","说明":"十枚纯阳元气丹，在斗罗中既可服食回补魂力并温养经脉，也可作异宝交易筹码。","落点":"行囊","强度段":[1,2,3,4],"限制":"极寒冰属性魂师须慢化防冰火微冲"},{"名称":"凝气丹（三枚）","品阶":"白","出处":"仙逆","说明":"初阶聚灵丹药，在斗罗中服后半月内冥想纳魂速度略增，极适魂士与魂师打底。","落点":"行囊","强度段":[1,2],"限制":"仅一段至二段有效，不破十级瓶颈"},{"名称":"大黄丹","品阶":"白","出处":"诛仙","说明":"青云门常备培元疗伤灵丹，在斗罗中服后可速止外伤出血并平复内腑震荡。","落点":"行囊","强度段":[1,2,3,4,5],"限制":"对断肢奇毒与神力重创仅具缓和之效"},{"名称":"北凉绿蚁酒","品阶":"白","出处":"雪中悍刀行","说明":"醇烈江湖浊酒一壶，饮后壮胆提气、驱散寒意与困乏，用以结交豪杰极增好感。","落点":"生效状态","强度段":[1,2,3,4,5],"限制":"不增等效等级，仅提振气势与社交互益"},{"名称":"安魂符咒","品阶":"白","出处":"诡秘之主","说明":"纯银刻纹符咒，在斗罗中激发可安抚躁乱精神并震慑阴邪怨魂，克制低阶邪魂师。","落点":"行囊","强度段":[1,2,3,4,5],"限制":"一次性消耗，对高阶神识压制无效"},{"名称":"聚灵丹（一瓶）","品阶":"白","出处":"一念永恒","说明":"灵溪宗基础凝灵丸，在斗罗中助初阶魂师聚拢周遭天地魂力，十日修炼稳进。","落点":"行囊","强度段":[1,2],"限制":"仅一段至二段生效，绝不破魂环瓶颈"},{"名称":"气血丹（三枚）","品阶":"白","出处":"大奉打更人","说明":"武夫常备补血丸，在斗罗中服后速复气血并舒缓肉身脱力，强攻系与魂兽皆宜。","落点":"行囊","强度段":[1,2,3],"限制":"不补精神与魂力，日服限一枚"},{"名称":"诸葛神弩","品阶":"黄","出处":"斗罗","说明":"唐门精巧机括强弩，一次齐射十六支破甲劲箭，低阶魂师亦能借此威胁魂尊。","落点":"行囊","强度段":[1,2],"限制":"内置四十八箭，用尽须另寻铁匠补造"},{"名称":"二十四桥明月夜","品阶":"黄","出处":"斗罗","说明":"嵌二十四枚玉石的腰带魂导器，每石内藏一立方米独立空间，便于分类纳物。","落点":"行囊","强度段":[1,2,3],"限制":"不可存放活物"},{"名称":"玄玉手秘籍","品阶":"黄","出处":"斗罗","说明":"唐门炼手绝学，修成双掌莹润如玉，可抵寻常剧毒侵蚀并徒手格挡利刃劈斩。","落点":"功法","强度段":[1,2,3],"限制":"初学至入微须循序苦练"},{"名称":"鬼影迷踪步法","品阶":"黄","出处":"斗罗","说明":"唐门精妙身法，步履虚实难测，实战中大幅提升闪避腾挪与近身游斗能力。","落点":"功法","强度段":[1,2,3],"限制":null},{"名称":"玄水丹","品阶":"黄","出处":"斗罗","说明":"史莱克珍藏洗髓灵丹，排出体内杂质并助低阶魂师稳升一级魂力、夯实根基。","落点":"魂力等级","强度段":[1,2],"限制":"三十级以上效微；卡瓶颈则蓄力待吸环释放"},{"名称":"武魂醒脉露","品阶":"黄","出处":"斗罗","说明":"温和提纯武魂本源灵液，可令废或普通武魂良性改善潜质，至多达优秀武魂品质。","落点":"武魂","强度段":[1,2],"限制":"不新增武魂，优秀及以上武魂用之仅稳根基"},{"名称":"千年鲸胶","品阶":"黄","出处":"斗罗","说明":"千年海魂兽脑胶，火炙服食可强健经脉体魄，显著扩宽吸收魂环时的年限承压。","落点":"行囊","强度段":[1,2,3],"限制":"药性偏燥热，须运功化开防气血躁动"},{"名称":"千锻一品沉银","品阶":"黄","出处":"斗罗","说明":"千锻有灵之上等金属佳材，可用于打造一字斗铠核心胚件或高阶魂导器主壳。","落点":"行囊","强度段":[2,3,4],"限制":"斗1折为百炼精银佳材，利锻造暗器重兵"},{"名称":"暴动升灵台入场契","品阶":"黄","出处":"斗罗","说明":"传灵塔特许凭契，可免资入虚拟升灵台磨砺魂灵年限；斗1与斗2折为秘境猎兽图。","落点":"其他","强度段":[2,3,4],"限制":"升灵台内伤按投影气血计，收益真实"},{"名称":"百年魂环年限淬炼","品阶":"黄","出处":"斗罗","说明":"精纯魂兽本源光团，令主角一枚既有魂环年限提升五百年，增强该环魂技威能。","落点":"魂环","强度段":[1,2,3,4],"限制":"不新增环数，总年限不越当前体魄承限"},{"名称":"时代钱袋·厚资","品阶":"黄","出处":"斗罗","说明":"按当前部折算三千金魂币或等值联邦币、斗罗币；神界与英雄折为纯净神晶入行囊。","落点":"钱包","强度段":[2,3,4,5],"限制":"严守当部币种，神界与英雄不入钱包"},{"名称":"百战身法熟练印","品阶":"黄","出处":"斗罗","说明":"深蓝面板任一魂技或体魄项进度大涨；无面板折为既有身法或一门魂技纯熟一档。","落点":"面板","强度段":[1,2,3,4,5],"限制":"不直破魂环瓶颈与大层次"},{"名称":"神官巡界手札","品阶":"黄","出处":"斗罗","说明":"记述神界巡猎见闻与控神诀窍，研读可涨少许精神力点数并拓宽对神祇位格认知。","落点":"精神力","强度段":[4,5],"限制":"绝不赐予神位或神考，仅助识海凝练"},{"名称":"蓝孕铜神锻底胚","品阶":"黄","出处":"斗罗","说明":"龙马星系稀有金属毛坯，适于打造高阶斗铠与魂导器；斗1至斗3折为深海沉银块。","落点":"行囊","强度段":[4,5],"限制":"须经锻造方成器，本身不加战力"},{"名称":"筑基灵液","品阶":"黄","出处":"斗破苍穹","说明":"萧炎炼制洗髓药液，在斗罗中浸泡七日可稳固低阶经脉、提速修炼并增魂环承压。","落点":"生效状态","强度段":[1,2],"限制":"三十级以上效微，限用一次"},{"名称":"筑基丹","品阶":"黄","出处":"凡人修仙传","说明":"破境灵丹，在斗罗中助魂士至魂王冲破小阶并补足一至两级魂力，根基更牢。","落点":"魂力等级","强度段":[1,2,3],"限制":"卡十级瓶颈则蓄力待吸环释放，不跨大层次"},{"名称":"源石（小块）","品阶":"黄","出处":"遮天","说明":"蕴含天地精气之源石，在斗罗中可折算丰厚当部货币，或直接吸纳加速魂力恢复。","落点":"钱包","强度段":[1,2,3,4,5],"限制":"神界与英雄不入钱包，改入行囊作精气晶"},{"名称":"凶兽真血（稀释）","品阶":"黄","出处":"完美世界","说明":"太古遗种稀释宝血，在斗罗中当高阶魂兽淬体血浴，强健气血，魂兽用之亦壮血脉。","落点":"行囊","强度段":[1,2,3],"限制":"须温火稀释药浴，切忌高阶强吞防爆血"},{"名称":"九重雷刀（前三重）","品阶":"黄","出处":"吞噬星空","说明":"极限武馆叠劲刀法前三重，在斗罗中当近战暗劲发力武技，不耗额外魂力增爆发。","落点":"功法","强度段":[1,2,3],"限制":"威力受肉身与兵刃承压限制，不可越段强杀"},{"名称":"太极玄清道（玉清卷）","品阶":"黄","出处":"诛仙","说明":"青云门正统内功初卷，在斗罗中作中正平和冥想法，稳固魂力运转并可粗通御物。","落点":"功法","强度段":[1,2,3],"限制":"仅含玉清前四层，遇瓶颈仍须吸收魂环"},{"名称":"绣冬春雷（双刀）","品阶":"黄","出处":"雪中悍刀行","说明":"一轻灵一厚重之北凉名刀，在斗罗中相当于千锻级精良兵刃，锋锐且极易导魂力。","落点":"行囊","强度段":[1,2,3],"限制":"属凡兵名刀，不附自带魂技"},{"名称":"太阳胸针","品阶":"黄","出处":"诡秘之主","说明":"暗金太阳鸟胸针，在斗罗中佩戴可散光明暖意，克制邪武魂阴毒并护持识海清明。","落点":"行囊","强度段":[1,2,3],"限制":"黑暗或邪武魂持有者佩戴会受灼痛限制"},{"名称":"紫气驭鼎功","品阶":"黄","出处":"一念永恒","说明":"香云山吐纳功法，在斗罗中引天地紫气扩充经脉底蕴，长期勤修微增魂力回复速度。","落点":"功法","强度段":[1,2,3],"限制":"循序见效，不直破魂环瓶颈"},{"名称":"望气术（初阶卷）","品阶":"黄","出处":"大奉打更人","说明":"钦天监术士观气法门，在斗罗中可察言辨伪、敛藏气机并粗判目标魂力强弱与凶吉。","落点":"天赋能力","强度段":[1,2,3,4],"限制":"无法勘破高出自身大层次者或神识遮蔽"},{"名称":"龙须针（板晶发金）","品阶":"紫","出处":"斗罗","说明":"细若发丝的发金奇针三枚，遇魂力则蜷缩钻体，乃唐门极难提防的奇门暗器。","落点":"行囊","强度段":[1,2,3],"限制":"一次性消耗品，难穿封号斗罗护体魂力"},{"名称":"如意百宝囊","品阶":"紫","出处":"斗罗","说明":"顶级植物保鲜储物魂导器，内置宽广空间，可存仙草奇药而令药性丝毫不失。","落点":"行囊","强度段":[1,2,3,4,5],"限制":"可纳草木奇珍与器物，不可存放活兽与人"},{"名称":"暗器百解全卷","品阶":"紫","出处":"斗罗","说明":"唐门机括暗器与手法总纲，研习可大幅提升暗器制作与魂导机括设计造诣。","落点":"辅助职业","强度段":[1,2,3,4],"限制":"铸造高阶暗器仍须配齐对应金属材料"},{"名称":"玄天功（内门篇）","品阶":"紫","出处":"斗罗","说明":"唐门核心内功，魂力精纯绵长、回复加速且经脉宽韧，各阶修炼皆有长远裨益。","落点":"功法","强度段":[1,2,3,4],"限制":"卡十级瓶颈仍须先吸收魂环方能续升"},{"名称":"紫极魔瞳（芥子境）","品阶":"紫","出处":"斗罗","说明":"唐门瞳术法门，大涨精神力点数、洞察细微破绽，并附基础精神震慑冲击。","落点":"精神力","强度段":[1,2,3,4,5],"限制":"须晨吸东来紫气勤修，不越部精神上限"},{"名称":"八瓣仙兰","品阶":"紫","出处":"斗罗","说明":"冰火两仪眼温和仙品，固本培元祛杂质，令主角此后半年冥想修炼效率显著提高。","落点":"生效状态","强度段":[1,2,3],"限制":"药性徐徐发挥，不直接冲破魂环瓶颈"},{"名称":"九品紫芝","品阶":"紫","出处":"斗罗","说明":"冰火药王级灵芝，固本培元，服后直接增进魂力两级至三级并滋养气血。","落点":"魂力等级","强度段":[1,2,3],"限制":"卡瓶颈先蓄力待吸环释放，六十级以上效减"},{"名称":"升魂丹","品阶":"紫","出处":"斗罗","说明":"史莱克珍稀破阶灵丹，专为中阶魂师炼制，服后魂力精纯凝实并稳升一级。","落点":"魂力等级","强度段":[2,3],"限制":"魂尊至魂王效佳；卡瓶颈蓄力待吸环释放"},{"名称":"无敌护罩（六级）","品阶":"紫","出处":"斗罗","说明":"六级防御魂导器，激发三息内可硬抗魂帝至魂圣级全力一击，绝境脱险良器。","落点":"行囊","强度段":[2,3,4],"限制":"充能耗时三日，无法硬接封号以上杀招"},{"名称":"乱披风锤法","品阶":"紫","出处":"斗罗","说明":"昊天宗借力叠击绝技，连锤借势层层增幅力道，极适力量系武魂与重兵强攻。","落点":"功法","强度段":[2,3,4],"限制":"连击中断须重蓄势，气血消耗较大"},{"名称":"千年魂灵契约印","品阶":"紫","出处":"斗罗","说明":"温和千年魂兽灵识契印，斗2末起可融作魂灵代环，斗1折为自愿千年魂环。","落点":"魂环","强度段":[1,2,3],"限制":"须待魂力达瓶颈方吸收，不超九普通环上限"},{"名称":"万年魂环年限淬炼","品阶":"紫","出处":"斗罗","说明":"凝缩魂灵精华，令主角一枚既有魂环年限提升三千年，显著增强该环魂技威能。","落点":"魂环","强度段":[2,3,4,5],"限制":"不新增环数，提升后不越肉身承受上限"},{"名称":"龙谷通行骨符","品阶":"紫","出处":"斗罗","说明":"蕴古龙残息之骨符，可启龙谷外围寻宝机缘并微涨龙族亲和；斗1/2折为海岛引路符。","落点":"其他","强度段":[3,4,5],"限制":"仅作入场与机缘凭信，不直接附战力"},{"名称":"机缘词条引（紫）","品阶":"紫","出处":"斗罗","说明":"冥冥气机牵引，为主角赋予一条紫阶正面气运词条，令后续际遇更添助力。","落点":"气运","强度段":[1,2,3,4,5],"限制":"严守9条与2彩上限，满额只换正运不顶厄运"},{"名称":"玄重尺","品阶":"紫","出处":"斗破苍穹","说明":"地灵石重尺，在斗罗中负重可锤炼体魄并磨砺魂力掌控，撤压近战爆发大增。","落点":"行囊","强度段":[1,2,3],"限制":"重逾千斤，低阶须量力背负防伤筋骨"},{"名称":"大衍决（初篇）","品阶":"紫","出处":"凡人修仙传","说明":"炼神奇功前两层，在斗罗中大幅壮大精神力点数并可分心多用，极利多魂导器操控。","落点":"功法","强度段":[2,3,4,5],"限制":"修习颇耗心神，精神力增长仍受当前部封顶"},{"名称":"源天书（残篇）","品阶":"紫","出处":"遮天","说明":"寻源勘脉秘录残卷，在斗罗中化作寻矿探宝与辨识地势绝学，助觅仙草矿脉与遗藏。","落点":"辅助职业","强度段":[2,3,4,5],"限制":"偏重勘探寻珍，不直接提供正面斗战威能"},{"名称":"打神石（碎片）","品阶":"紫","出处":"完美世界","说明":"奇石碎块，在斗罗中掷出带破甲震魂奇效且通阵纹推演，可兼作暗器与铭刻辅石。","落点":"行囊","强度段":[2,3,4],"限制":"碎块非活体十凶，攻伐威力随持者等效等级封顶"},{"名称":"遁天梭","品阶":"紫","出处":"吞噬星空","说明":"念力组合飞梭，在斗罗中当高阶精神魂导器，凭精神力御使兼顾飞行、钻刺与护盾。","落点":"行囊","强度段":[2,3,4],"限制":"需灵通境以上精神力驾驭，威力按当前段封顶"},{"名称":"天鳞古戟","品阶":"紫","出处":"武动乾坤","说明":"古墓重戟附天鳞戟势，在斗罗中当高阶强攻重兵器，挥击带龙鳞煞气与破甲之锋。","落点":"行囊","强度段":[2,3,4],"限制":"威力随持者魂力与体魄封顶，不跨大层次"},{"名称":"精神磨盘观想法","品阶":"紫","出处":"武动乾坤","说明":"识海凝磨锤炼念力法门，在斗罗中精纯精神之海点数，并显著增强抗精神魅惑能力。","落点":"精神力","强度段":[2,3,4,5],"限制":"每日静修限一炷香，忌过度压榨伤及识海"},{"名称":"伤心花","品阶":"紫","出处":"诛仙","说明":"洁白玉花秘宝，在斗罗中散漫天花瓣迷人心神兼藏烈毒，当控制毒系高阶魂导器。","落点":"行囊","强度段":[2,3,4],"限制":"威能按主角等效等级封顶，不破极高精神免疫"},{"名称":"两袖青蛇剑诀","品阶":"紫","出处":"雪中悍刀行","说明":"剑神招牌剑招，在斗罗中化作自创凌厉剑气绝技，双袖青芒翻涌，极擅中近距突袭。","落点":"功法","强度段":[2,3,4],"限制":"器武魂或剑道修者尤佳，耗魂力按同阶魂技计"},{"名称":"阳炎符咒","品阶":"紫","出处":"诡秘之主","说明":"黄金铸就烈阳符咒三枚，在斗罗中催动迸发炽烈神圣光焰，专克黑暗邪武魂与亡灵。","落点":"行囊","强度段":[2,3,4],"限制":"共三枚消耗品，威力封顶同段强攻杀招"},{"名称":"寒门养念诀","品阶":"紫","出处":"一念永恒","说明":"以寒凝念秘法，在斗罗中大幅增进精神力点数并强化冰寒控场，冰系修者事半功倍。","落点":"精神力","强度段":[2,3,4],"限制":"火属性修者修习须缓行防冰火相激"},{"名称":"地书碎片（单镜）","品阶":"紫","出处":"大奉打更人","说明":"玉石小镜，在斗罗中当五十立方米便携储物魂导器，并可刻录单向留信传讯亲友。","落点":"行囊","强度段":[1,2,3,4,5],"限制":"仅含储物与短距留讯，不自带跨时空群聊功能"},{"名称":"暴雨梨花针","品阶":"红","出处":"斗罗","说明":"唐门机括暗器第二，内置二十七枚深海沉银针，猝发威势足以重创魂圣乃至封号。","落点":"行囊","强度段":[2,3,4],"限制":"单机匣二十七针，射毕须寻神匠重制银针"},{"名称":"鸡冠凤凰葵","品阶":"红","出处":"斗罗","说明":"冰火纯阳仙品，助火属性或禽类武魂祛除邪火杂质、提纯本源并晋升武魂品质。","落点":"武魂","强度段":[1,2,3,4],"限制":"满三生只走进化不加第四武魂，至多神级"},{"名称":"水仙玉肌骨","品阶":"红","出处":"斗罗","说明":"冰火仙品，润筋补骨、气息通透，服后魂力直进且显著改善后续修炼速度与体魄。","落点":"魂力等级","强度段":[1,2,3,4],"限制":"卡瓶颈蓄力待吸环释放，绝不破当部上限"},{"名称":"幽香绮罗仙品","品阶":"红","出处":"斗罗","说明":"仙品药王，携身可克世间百毒并中和毒雾，护心神免受毒瘴侵袭，群战抗毒至宝。","落点":"行囊","强度段":[1,2,3,4],"限制":"唯克奇毒瘴气，不抵纯粹魂力与神力压制"},{"名称":"蓝银领域（草木种子）","品阶":"红","出处":"斗罗","说明":"植物亲和天赋领域雏形，草木繁茂处感知与魂力回流大涨，可随实力逐步进化。","落点":"领域","强度段":[2,3,4],"限制":"属普通领域，受环境影响且不可压制神级领域"},{"名称":"急速前行之追风左腿骨","品阶":"红","出处":"斗罗","说明":"万年风系左腿魂骨，赋予极速踏空与疾影爆发技，大幅拔高敏攻追逃与越级闪避。","落点":"魂骨","强度段":[2,3,4],"限制":"左腿位已占则折原骨年限增五千年或入行囊"},{"名称":"精神凝聚之智慧头骨","品阶":"红","出处":"斗罗","说明":"五万年罕见头部魂骨，大涨精神力点数并附强控精神射线魂骨技，群战先手极强。","落点":"魂骨","强度段":[2,3,4,5],"限制":"头骨位已占则折为精神力点数大涨或入行囊"},{"名称":"红尘庇佑（护身魂导器）","品阶":"红","出处":"斗罗","说明":"明德堂顶尖护身触发器，遇致命杀招自动张开高阶护罩挡下一劫，换取脱险之机。","落点":"生效状态","强度段":[3,4,5],"限制":"触发后须冷却七日，无法硬抗跨大层次神威"},{"名称":"黑级机甲核心图谱","品阶":"红","出处":"斗罗","说明":"超级机甲设计与制造全图，大涨设计制造造诣；斗1/2折为高阶大型魂导战车图谱。","落点":"辅助职业","强度段":[3,4,5],"限制":"驾驭黑级机甲须魂帝与灵海境精神力以上"},{"名称":"黄金龙体（初阶血脉）","品阶":"红","出处":"斗罗","说明":"催动气血化金鳞护体增力，短时强攻抗打堪比同阶巨兽，魂兽得之亦壮血脉威压。","落点":"天赋能力","强度段":[2,3,4],"限制":"耗气血而非魂力，威能按等效等级封顶"},{"名称":"十万年魂环淬炼髓","品阶":"红","出处":"斗罗","说明":"精纯十万年魂兽本源髓，令一枚高阶魂环年限增一万五千年，可助迈入十万红环。","落点":"魂环","强度段":[3,4,5],"限制":"不新增环数，总年限不超主角当前肉身承压"},{"名称":"天养晶石匣","品阶":"红","出处":"斗罗","说明":"龙马星系珍稀天养晶石，按当前部折算巨额时代货币；神界与英雄折高纯神晶入行囊。","落点":"钱包","强度段":[3,4,5],"限制":"严守当部币种，神界与英雄不入钱包"},{"名称":"海神之光试炼引","品阶":"红","出处":"斗罗","说明":"借海神之光阶梯威压淬体悟道十日，极大夯实魂力根基并增精神抗压，稳拓潜能。","落点":"其他","强度段":[3,4,5],"限制":"仅借阶梯威压磨砺，绝不直接赐予神考或神位"},{"名称":"深蓝破境悟道晶","品阶":"红","出处":"斗罗","说明":"深蓝面板任一非瓶颈项直进一层；无面板折为一门核心功法或自创魂技跃至精通。","落点":"面板","强度段":[1,2,3,4,5],"限制":"严守魂环瓶颈，不可越环强升魂力等级"},{"名称":"厄运压制符","品阶":"红","出处":"斗罗","说明":"令主角一条生效中的厄运词条转为压制态以缓反噬；若无厄运则赠一条红阶正面词条。","落点":"气运","强度段":[1,2,3,4,5],"限制":"不可直接删去绝档死劫，且不越9条与2彩上限"},{"名称":"菩提化体涎","品阶":"红","出处":"斗破苍穹","说明":"六品罕世灵液，在斗罗中可祛除霸道奇毒、洗涤躯体并助冲高阶小境，根基无瑕。","落点":"行囊","强度段":[3,4,5],"限制":"卡瓶颈先蓄力待吸环，绝不跨大层次"},{"名称":"风雷翅","品阶":"红","出处":"凡人修仙传","说明":"风雷遁速秘宝，在斗罗中相当于高阶风雷飞行魂导器，极速追敌与绝境遁逃无双。","落点":"行囊","强度段":[3,4,5],"限制":"遁速按主角等效等级封顶，不跨大层次破空"},{"名称":"菩提子","品阶":"红","出处":"遮天","说明":"古刹悟道佛宝，在斗罗中贴身闭关可大涨精神力点数，并极大加速领域与自创技领悟。","落点":"精神力","强度段":[3,4,5],"限制":"助悟道不直加魂力等级，受当部精神上限约束"},{"名称":"血洛晶（一枚）","品阶":"红","出处":"吞噬星空","说明":"血洛世界奇晶，在斗罗中忍剧痛炼化可大幅强化肉身基因与空间契合，战力底蕴骤升。","落点":"天赋能力","强度段":[3,4,5],"限制":"融合极痛且一生限融三枚，严守当前部封顶"},{"名称":"大荒囚天指（四指卷）","品阶":"红","出处":"武动乾坤","说明":"大荒古宗造化武学，在斗罗中化作四重递进自创绝技，指印镇压威势可破同阶防御。","落点":"功法","强度段":[3,4,5],"限制":"高重消耗极巨魂力，威能按等效等级封顶"},{"名称":"极境灵识感悟","品阶":"红","出处":"仙逆","说明":"一丝毁灭极境锐意，在斗罗中令三场实战精神冲击与攻伐穿透暴涨，同阶极难招架。","落点":"生效状态","强度段":[1,2,3,4],"限制":"限三场激战，过刚易折且不可越级强杀神祇"},{"名称":"天琊神剑","品阶":"红","出处":"诛仙","说明":"九天正道灵剑，在斗罗中相当于光雷神圣系高阶器兵，浩然剑气专克邪武魂与阴煞。","落点":"行囊","强度段":[3,4,5],"限制":"邪武魂修者难以驾驭，威能随持者段位封顶"},{"名称":"大黄庭（三层灌顶）","品阶":"红","出处":"雪中悍刀行","说明":"武当浩然道门内力，在斗罗中化作精纯魂力助升小阶并拓宽经脉，余韵绵长护身。","落点":"魂力等级","强度段":[2,3,4],"限制":"卡十级瓶颈蓄力待吸环释放，绝不跨大层次"},{"名称":"深红月冕","品阶":"红","出处":"诡秘之主","说明":"绯红奇饰，在斗罗中激发可展开绯红满月领域，大幅增幅遁速自愈并稳固识海防疯魔。","落点":"领域","强度段":[3,4,5],"限制":"属普通高阶领域，不可压制神级领域"},{"名称":"永夜伞","品阶":"红","出处":"一念永恒","说明":"黑光护体灵伞，在斗罗中撑开形成大范围防护结界并吸收能量冲击，群战防御极佳。","落点":"行囊","强度段":[3,4,5],"限制":"防御强度随持者魂力封顶，不挡跨大层次神击"},{"名称":"天地一刀斩（刀意篇）","品阶":"红","出处":"大奉打更人","说明":"蕴无前道韵之武夫刀法，在斗罗中化作高爆发自创绝技，蓄势一刀极擅破防斩阵。","落点":"功法","强度段":[3,4,5],"限制":"挥出后气血魂力骤耗，威力随等效等级封顶"},{"名称":"望穿秋水露","品阶":"金","出处":"斗罗","说明":"冰火仙品，助修瞳术并暴涨精神力点数，可堪破隐匿与幻象破绽，精神系至宝。","落点":"精神力","强度段":[1,2,3,4],"限制":"须静心冥想三日炼化，不越当部精神力上限"},{"名称":"奇茸通天菊","品阶":"金","出处":"斗罗","说明":"冰火中性仙品，食之气运四肢血通八脉，炼成金刚不坏体魄，魂环承压大增。","落点":"天赋能力","强度段":[1,2,3,4],"限制":"不破魂环瓶颈，体魄增幅随当前段合理封顶"},{"名称":"绮罗郁金香","品阶":"金","出处":"斗罗","说明":"冰火华贵仙品，引天地灵气助器武魂或植物武魂良性进化晋品，打破先天局限。","落点":"武魂","强度段":[1,2,3,4],"限制":"满三生只走进化不加第四武魂，至多神级"},{"名称":"冰火炼金身秘泉","品阶":"金","出处":"斗罗","说明":"借烈火杏娇疏与八角玄冰草调和泉力淬体，获冰火双抗与强横肉身底蕴。","落点":"生效状态","强度段":[1,2,3,4],"限制":"须咬牙共御冰火药力，严守当前段位封顶"},{"名称":"八蛛矛（幼态外附骨）","品阶":"金","出处":"斗罗","说明":"极罕见可成长外附魂骨，带剧毒锋芒与吞噬潜质，随主角魂力等级渐次进化。","落点":"魂骨","强度段":[1,2,3,4],"限制":"外附位已占则折为原外附骨淬炼或入行囊"},{"名称":"佛怒唐莲（单枚）","品阶":"金","出处":"斗罗","说明":"唐门机括暗器巅峰，单枚爆发威能足以重创乃至格杀封号斗罗，战略威慑极强。","落点":"行囊","强度段":[3,4,5],"限制":"一次性消耗，无法击穿持神位神祇大层次"},{"名称":"大须弥锤秘传","品阶":"金","出处":"斗罗","说明":"昊天宗至高秘法，将魂环炸裂化纯力爆发，换取短时极大越级威能，破敌绝境。","落点":"功法","强度段":[3,4,5],"限制":"炸环毕立刻陷入魂力枯竭与重虚，不跨大层次"},{"名称":"杀神领域（残印）","品阶":"金","出处":"斗罗","说明":"凝杀戮之都至烈杀气，展开削弱对手属性并增幅己身杀势，随实战血战可进化。","落点":"领域","强度段":[3,4,5],"限制":"属普通天赋领域，不可压制神级领域"},{"名称":"蓝银皇右腿骨","品阶":"金","出处":"斗罗","说明":"十万年生命右腿骨，附凌空飞行与春风吹又生超强断肢自愈双技，续航冠绝同阶。","落点":"魂骨","强度段":[3,4,5],"限制":"右腿位已占则折原骨年限大涨或入行囊"},{"名称":"泰坦巨猿左臂骨","品阶":"金","出处":"斗罗","说明":"十万年力量左臂骨，附泰坦苍穹破与重力泥沼双绝技，控场强攻皆具恐怖爆发。","落点":"魂骨","强度段":[4,5],"限制":"左臂位已占则折原骨年限增三万年或入行囊"},{"名称":"暗金恐爪熊右掌骨","品阶":"金","出处":"斗罗","说明":"罕世强攻右臂掌骨，附暗金恐爪撕裂绝技，锋锐无匹可破坚甲并具成长潜能。","落点":"魂骨","强度段":[2,3,4,5],"限制":"右臂位已占则折原骨年限提升或入行囊"},{"名称":"生灵守望之刃（刻刀）","品阶":"金","出处":"斗罗","说明":"噬灵刻刀融生灵之金所化列榜神刀，大涨魂导核心铭刻与斗铠法阵成率且带生机。","落点":"辅助职业","强度段":[2,3,4,5],"限制":"无噬灵反噬，成器阶位仍受主角当前段位封顶"},{"名称":"极致玄冰髓","品阶":"金","出处":"斗罗","说明":"极北冰极神晶所化寒髓，可令冰系武魂化出极致之冰属性，对普通冰火具强压制。","落点":"武魂","强度段":[2,3,4,5],"限制":"满三生只走进化不加第四武魂，非冰系改入行囊"},{"名称":"乾坤造化丹","品阶":"金","出处":"斗罗","说明":"冰火药灵所炼无上仙丹，令封号斗罗魂力大进并夯实极限底蕴，祛除高阶暗疾。","落点":"魂力等级","强度段":[4,5],"限制":"斗1至斗3凡间封顶99级，绝不直接成神"},{"名称":"天锻神匠手札与沉银锤","品阶":"金","出处":"斗罗","说明":"蕴引雷赋命奥义之锻造秘典与宝锤，大涨锻造造诣，助由宗匠稳步冲击神匠境。","落点":"辅助职业","强度段":[3,4,5],"限制":"成天锻神匠仍须自身魂力与精神力达标"},{"名称":"正运晋阶签","品阶":"金","出处":"斗罗","说明":"令主角一条红阶及以下正面气运词条直接晋阶一阶；若无可晋者则改赠金阶机缘。","落点":"气运","强度段":[1,2,3,4,5],"限制":"严守9条与2彩上限，不改变厄运词条"},{"名称":"万法通明悟道晶","品阶":"金","出处":"斗罗","说明":"深蓝面板任选两项非瓶颈技艺魂技直升一层；无面板折为两门功法熟练度跃升。","落点":"面板","强度段":[1,2,3,4,5],"限制":"严守魂环瓶颈，不可越环强加魂力等级"},{"名称":"鲲鹏宝术（残纹）","品阶":"金","出处":"完美世界","说明":"十凶阴阳极速宝术残篇，在斗罗中化作刚柔双极爆发与遁速秘能，兽身化本命技。","落点":"天赋能力","强度段":[3,4,5],"限制":"威能按主角等效等级封顶，严禁跨大层次"},{"名称":"柳神法（枝芽）","品阶":"金","出处":"完美世界","说明":"蕴枯荣生机之柳神法残韵，在斗罗中化治愈兼缠敌之领域雏形，随主角境界成长。","落点":"领域","强度段":[2,3,4,5],"限制":"属成长型普通领域，不可压制神级领域"},{"名称":"摩云藤（幼株）","品阶":"金","出处":"吞噬星空","说明":"宇宙植物生命幼藤，在斗罗中滴血认主作伴生护体灵植，随投喂灵材渐次成长。","落点":"行囊","强度段":[1,2,3,4,5],"限制":"一生认主唯一，战力永不超越主角当前段位"},{"名称":"古神诀（一星炼体篇）","品阶":"金","出处":"仙逆","说明":"古神正统炼体功法，在斗罗中眉心凝星淬炼肉身气血与自愈力，大增越环承压。","落点":"功法","强度段":[2,3,4,5],"限制":"仅含初期星点篇，修习需海量气血灵材供养"},{"名称":"射神车（封灵态）","品阶":"金","出处":"仙逆","说明":"封雷兽兽魂之古战车，在斗罗中可轰出等同九级定装魂导炮弹之雷击，撼动封号。","落点":"行囊","强度段":[4,5],"限制":"每轰一次须充能三十日，不击穿神王大层次"},{"名称":"玄火鉴","品阶":"金","出处":"诛仙","说明":"焚香谷万火之祖古镜，在斗罗中大幅增幅火系魂技并御极寒，可引纯阳火龙破阵。","落点":"行囊","强度段":[3,4,5],"限制":"威力按主角等效等级封顶，绝不赐予神位"},{"名称":"一剑开天门剑意","品阶":"金","出处":"雪中悍刀行","说明":"封存陆地神仙一缕绝巅剑意，在斗罗中危局可借势挥出惊天一剑，破阵逆转战局。","落点":"生效状态","强度段":[4,5],"限制":"一次性杀招，威力封顶当前大层次不斩神王"},{"名称":"太平刀（封印态）","品阶":"金","出处":"大奉打更人","说明":"监正所赠破法神兵，在斗罗中锋芒可斩裂同阶领域与魂技束缚，随境界渐解封。","落点":"行囊","强度段":[2,3,4,5],"限制":"封印态仅破同段规则，绝不跨大层次斩神"},{"名称":"相思断肠红","品阶":"彩","出处":"斗罗","说明":"仙品之王，须赤诚滴血认主，携身护心脉避奇厄、掩魂兽气息并助脱胎换骨。","落点":"行囊","强度段":[1,2,3,4,5],"限制":"心念不诚则花落拒主；依段封顶不直破瓶颈"},{"名称":"生灵之金（本源块）","品阶":"彩","出处":"斗罗","说明":"罕世生命金属本源，壮大精神之海并滋养绵长生机，随主角境界渐次炼化吸收。","落点":"精神力","强度段":[1,2,3,4,5],"限制":"随当前段位渐解效用，绝不越当前部大层次"},{"名称":"自然之种（永恒树芽）","品阶":"彩","出处":"斗罗","说明":"永恒之树生命幼种，润养气血魂核并亲和天地生命能量，人类魂师与魂兽皆宜。","落点":"天赋能力","强度段":[1,2,3,4,5],"限制":"成长型本源，按当前部封顶绝不赐予神位"},{"名称":"瀚海乾坤罩（认主态）","品阶":"彩","出处":"斗罗","说明":"含隐身、防护与乾坤定神之效，内蕴海神亲和微光，危局护身控敌皆属绝品。","落点":"行囊","强度段":[2,3,4,5],"限制":"按当前段封顶，仅作亲和引路绝不直接赐神位"},{"名称":"黄金龙枪（九重封印）","品阶":"彩","出处":"斗罗","说明":"金龙王本源神枪，刺敌可吞噬能量反哺持者气血，随主角等效等级逐重解封。","落点":"行囊","强度段":[2,3,4,5],"限制":"封印态按当前段封顶，绝不跨大层次吞神"},{"名称":"冰碧帝皇蝎躯干骨","品阶":"彩","出处":"斗罗","说明":"极北凶兽所遗极致之冰躯干骨，附双绝技并大幅增冰系抗压，躯干珍宝之巅。","落点":"魂骨","强度段":[3,4,5],"限制":"躯干位已占则折原躯干骨提年限或入行囊"},{"名称":"神赐魂环（至尊）","品阶":"彩","出处":"斗罗","说明":"依吸收者体魄极限凝出最契合顶格魂环，无视猎杀年限上限且必配极品魂技。","落点":"魂环","强度段":[3,4,5],"限制":"须达十级魂环瓶颈方吸收，不超九普通环上限，未成神绝不赐神级魂环"},{"名称":"龙神核心残鳞","品阶":"彩","出处":"斗罗","说明":"蕴龙神本源威压，助龙类或顶级武魂良性进化晋品；五段神王机缘可引超神进化。","落点":"武魂","强度段":[3,4,5],"限制":"满三生只走进化不加第四武魂；四段及下至多神级"},{"名称":"极冰天域核心（残）","品阶":"彩","出处":"斗罗","说明":"冰神之心残片凝成的寒冰领域，展开冰封压制同阶强敌并极大增幅冰属性威能。","落点":"领域","强度段":[4,5],"限制":"按当前段封顶，四段属凡间绝巅领域不赐神位"},{"名称":"阴阳互补双魂核手札","品阶":"彩","出处":"斗罗","说明":"至高双魂核凝结秘典，修成令魂力生生不息、战力底蕴暴涨，堪比极限绝巅根基。","落点":"功法","强度段":[4,5],"限制":"须封号斗罗以上启修，绝不凭空破百级成神"},{"名称":"三界审判剑意残痕","品阶":"彩","出处":"斗罗","说明":"封存五大神王权杖合铸之一缕剑韵，危局可化绝世破阵杀招，涤荡同阶强敌。","落点":"生效状态","强度段":[4,5],"限制":"仅可激发一次，威力封顶当前大层次不赐神位"},{"名称":"逆命改运金简","品阶":"彩","出处":"斗罗","说明":"令主角一条金阶正运晋阶彩阶，或大幅压制一条厄运；已满2彩则改赠金阶机缘。","落点":"气运","强度段":[1,2,3,4,5],"限制":"严守9条与2彩上限，绝档死劫仍须亲付代价化解"},{"名称":"焚诀","品阶":"彩","出处":"斗破苍穹","说明":"成长型奇功，在斗罗中初阶仅微增火魂力，吞噬火系奇珍可逐阶进化，潜力无穷。","落点":"功法","强度段":[1,2,3,4,5],"限制":"须循序吞炼火系奇珍，严守当部上限与魂环瓶颈"},{"名称":"掌天瓶","品阶":"彩","出处":"凡人修仙传","说明":"凝月华生绿液的神秘小瓶，在斗罗中可催熟仙草灵药，极大缓解奇珍匮乏之困。","落点":"行囊","强度段":[1,2,3,4,5],"限制":"所催药龄随当前段位封顶，绝不催生超阶神药"},{"名称":"九秘·者字秘（残印）","品阶":"彩","出处":"遮天","说明":"极尽疗伤古秘，在斗罗中耗魂力可急速愈合重伤断骨，随主角境界渐解奥义。","落点":"天赋能力","强度段":[2,3,4,5],"限制":"重创愈合极耗魂力，不能令已死复生或跨大层次"},{"名称":"原始真解（神引篇）","品阶":"彩","出处":"完美世界","说明":"万法符文初篇，在斗罗中深蓝面板多项领悟与技艺齐进；无面板折为功法洞察大涨。","落点":"面板","强度段":[1,2,3,4,5],"限制":"仅含神引初篇，不破魂环瓶颈且不赐神位"},{"名称":"神秘石符（祖石）","品阶":"彩","出处":"武动乾坤","说明":"内藏演武静室与灵液提纯之能，在斗罗中助推演魂技、滋养识海并渐次解封。","落点":"行囊","强度段":[1,2,3,4],"限制":"仅作演武与提纯辅器，严守当部大层次上限"},{"名称":"天逆珠（五行初封）","品阶":"彩","出处":"仙逆","说明":"聚五行灵气与闭关静室秘宝，在斗罗中低段提纯魂力并微调修炼节奏，随境解封。","落点":"行囊","强度段":[1,2,3,4,5],"限制":"时间流速与威能随段位封顶，绝不破瓶颈成神"},{"名称":"源堡灰雾碎片","品阶":"彩","出处":"诡秘之主","说明":"灵界奇诡庇护印记，在斗罗中隔绝外敌窥伺、抵御精神侵蚀并稳固精神之海。","落点":"精神力","强度段":[2,3,4,5],"限制":"庇护强度随精神力境界解封，不涉神位与攻伐"},{"名称":"龟纹锅","品阶":"彩","出处":"一念永恒","说明":"奇异炼灵黑锅，在斗罗中可将兵刃、魂导器或斗铠部件逐次炼灵提质，妙用无穷。","落点":"辅助职业","强度段":[1,2,3,4],"限制":"炼灵次数与成器上限随主角当前段位严格封顶"}];

/* 气运词条库：由 源码/build.py 从 气运金手指/gemini交付/气运/词条库.json 原样转来，勿手改（第一段审查通过，接线不改内容）。
 * 改词条去改 Gemini 那份，再跑一次 build.py。 */
const LUCK_LIB = {
 "词条": [
  {
   "名称": "位面钟灵",
   "品阶": "彩",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "天地垂青，险局自有位面气数暗护",
   "效果": "每部遇绝境或异象可触发一次位面回护，天地元素偏助主角挡下同大层次绝杀一击；闭关破境吸纳翻倍，易引动神考线索（不直接获神位）。",
   "代价": null,
   "晋阶": null,
   "化解": null,
   "死劫": null,
   "互斥": [
    "位面厌弃",
    "天煞孤星",
    "神陨天罚",
    "宿敌索命"
   ],
   "风味": "山河有灵，苍天偏爱此间一人。"
  },
  {
   "名称": "瑞兽临世",
   "品阶": "彩",
   "类别": "血脉",
   "适用": [
    "魂兽"
   ],
   "简介": "祥瑞汇身，滋养百兽且引动气数接引",
   "效果": "周身祥瑞滋养同族，亲近魂兽修为大增并愿自发护道；自身渡天劫时雷威大减，与强者建立深厚因果后可触发属性接引，令双方底蕴同涨。",
   "代价": null,
   "晋阶": null,
   "化解": null,
   "死劫": null,
   "互斥": [
    "兽血招狩",
    "天劫倍至",
    "天煞孤星"
   ],
   "风味": "一兽承国运，万林沐金辉。"
  },
  {
   "名称": "众念归宗",
   "品阶": "彩",
   "类别": "命格",
   "适用": [
    "神祇"
   ],
   "简介": "亿兆香火念力回流，稳固神位根基",
   "效果": "凡间敬仰可跨界凝为念力回流，激战中神力与神识回复骤增；催动神位权柄消耗减半，可借信众祈愿隔界显圣护佑一人，不逾当前神阶大层次。",
   "代价": null,
   "晋阶": null,
   "化解": null,
   "死劫": null,
   "互斥": [
    "神陨天罚",
    "神位生裂",
    "众叛亲离"
   ],
   "风味": "众生念起处，神座永不倾。"
  },
  {
   "名称": "万劫不磨",
   "品阶": "彩",
   "类别": "体质",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "筋骨百炼不崩，承受极限反噬而不毁",
   "效果": "超限吸环、多骨同融、凝双魂核或渡天劫时，爆体走火风险降至极低；每次重伤痊愈体魄与魂力底蕴永久精进，且极难受非神级剧毒冰火侵蚀。",
   "代价": null,
   "晋阶": null,
   "化解": null,
   "死劫": null,
   "互斥": [
    "病骨支离",
    "环噬之躯",
    "毒脉反噬",
    "残躯早夭",
    "武魂崩解"
   ],
   "风味": "千锤炼玉骨，万劫见真身。"
  },
  {
   "名称": "机缘天成",
   "品阶": "彩",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "险地必逢奇遇，先人一步截得秘藏",
   "效果": "每逢探索秘境、险地或大势节点，必额外发现一处隐藏机缘（仙草、古籍、魂骨线索或奇材），先一步识破他人秘宝破绽；所获外物皆契合且守封顶。",
   "代价": null,
   "晋阶": null,
   "化解": null,
   "死劫": null,
   "互斥": [
    "霉运缠身",
    "散财童子"
   ],
   "风味": "别人九死寻无路，你脚下正是秘藏门。"
  },
  {
   "名称": "逆命争锋",
   "品阶": "彩",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "战意压服绝境，越级死斗每能破限",
   "效果": "面对同大层次高阶强敌时战意澄澈，免疫恐惧与常规精神干扰，越级条件全面放大；每场生死血战可临阵悟出自创魂技雏形或震松一道修为瓶颈。",
   "代价": null,
   "晋阶": null,
   "化解": null,
   "死劫": null,
   "互斥": [
    "心魔噬魂"
   ],
   "风味": "天堑虽高，犹敢递出一剑。"
  },
  {
   "名称": "鸿运齐天",
   "品阶": "金",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "绝路常转奇遇，择宝探秘总占先机",
   "效果": "涉足险地或跌入绝境时，极易意外发现古人洞府、秘境残址或仙草矿脉线索；拍卖、抽签或择宝时总能凭直觉挑中价值最高且最契合自身之物。",
   "代价": null,
   "晋阶": {
    "条件": "凭奇遇改写本部至少两处重大局势并名动大陆",
    "晋阶后名称": "气运所钟",
    "晋阶后效果": "每部主动探秘或卷入大势皆可得一次改局奇缘，所遇神考与秘藏线索必留余地；同大层次危局下，天地环境与偶发天象可暗助脱险一次。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "霉运缠身"
   ],
   "风味": "山穷水尽处，偏有仙光引前程。"
  },
  {
   "名称": "绝处逢生",
   "品阶": "金",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "死局必留生门，每部危机关头险死还生",
   "效果": "遭遇足以致命的伏击、围杀或失控险情时，每部至多两次必生意外变故（地陷、援军偶至或敌招微偏），助主角留命脱身，但难挡跨大层次正面碾压。",
   "代价": null,
   "晋阶": {
    "条件": "三次于重伤垂危之境反杀劲敌或绝地翻盘",
    "晋阶后名称": null,
    "晋阶后效果": "濒死之际必触发一次潜能回光与生机牵引，同大层次杀招难致当场毙命；重伤脱险后常因祸得福悟出保命绝招或撞见疗伤奇珍。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "霉运缠身",
    "残躯早夭"
   ],
   "风味": "十死无生局，总为你留一隙天光。"
  },
  {
   "名称": "天命归心",
   "品阶": "金",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "自带领袖气象，易揽当世豪杰与势力拥戴",
   "效果": "立宗、领军或招揽奇才时，对方初始戒心大减且易折服归附；麾下与同行同伴受主角号令时士气、配合俱增，所建势力扩张速度与凝聚力远超常人。",
   "代价": null,
   "晋阶": {
    "条件": "统领一方顶尖势力或联军扭转本部大战胜负",
    "晋阶后名称": "人皇气象",
    "晋阶后效果": "大义或实利旗帜所指，跨势力号召力倍增；绝境决战能令全军战意凝而不散，甚至令中立强者与游散封号斗罗主动投效听调。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "天煞孤星",
    "众叛亲离",
    "众怒公敌"
   ],
   "风味": "振臂一呼，自有风云随行。"
  },
  {
   "名称": "武魂通玄",
   "品阶": "金",
   "类别": "血脉",
   "适用": [
    "人类魂师"
   ],
   "简介": "武魂深藏蜕变潜能，易引二次觉醒与共鸣",
   "效果": "修至关键节点或炼化高阶仙草、契合魂灵时，大幅提升武魂良性变异或二次觉醒机会；与互补武魂具天然共鸣，显著降低武魂融合技磨合门槛。",
   "代价": null,
   "晋阶": {
    "条件": "促成一次武魂进化或创成高阶武魂融合技",
    "晋阶后名称": "本源通神",
    "晋阶后效果": "武魂底蕴圆融无瑕，高阶魂环与魂骨契合近乎完美；七环武魂真身无虚弱反噬，武魂融合技威力较寻常组合再拔高一筹。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "血脉排斥",
    "武魂崩解"
   ],
   "风味": "凡胎藏真龙，只待风云化渊。"
  },
  {
   "名称": "双核天成",
   "品阶": "金",
   "类别": "体质",
   "适用": [
    "人类魂师"
   ],
   "简介": "魂力自成气旋，凝聚双魂核反噬大减",
   "效果": "魂力运转自带旋涡吸纳之势，中低阶修炼与回气显著提速；冲击封号与极限斗罗凝聚单魂核及双魂核（阴阳互补或同位共振）时，爆体风险骤降。",
   "代价": null,
   "晋阶": {
    "条件": "成功凝成双魂核或九环圆满稳固魂海",
    "晋阶后名称": "混元魂核",
    "晋阶后效果": "双魂核生生不息，久战只要不遭毁灭性重创，魂力几乎源源不绝；施展高耗魂技与领域负荷减半，且能随时平复魂力震荡。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "魂力漏斗"
   ],
   "风味": "丹田旋沧海，一息纳八荒。"
  },
  {
   "名称": "凶兽真身",
   "品阶": "金",
   "类别": "血脉",
   "适用": [
    "魂兽"
   ],
   "简介": "体藏远古凶兽霸血，渡劫与化形皆具奇威",
   "效果": "同修为年限下气血、鳞甲与魂兽技威势远胜同族，直面人类封号威压毫不怯阵；渡天劫时兽躯韧性大增，化形重修后亦留一缕太古兽威与体魄底蕴。",
   "代价": null,
   "晋阶": {
    "条件": "正面渡过一次十万年天劫或力挫同阶顶尖强者",
    "晋阶后名称": "太古兽皇",
    "晋阶后效果": "举手投足自带太古兽压，寻常万年魂兽望风伏首；本命兽技与领域威能暴涨，兽躯愈合惊人，渡后续大劫时生机底蕴更厚。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "兽血招狩",
    "血脉排斥"
   ],
   "风味": "十万年血脉未寒，一声长啸震山林。"
  },
  {
   "名称": "神降无碍",
   "品阶": "金",
   "类别": "命格",
   "适用": [
    "神祇"
   ],
   "简介": "深谙下界秩序，行走凡尘少受位面排斥",
   "效果": "真身下界或隔界投影时，位面秩序压制与神界规矩追责大为缓和，可更从容地收敛神力干涉凡间局势；分身投影损耗锐减，不易提前溃散。",
   "代价": null,
   "晋阶": {
    "条件": "未触神界裁决前提下悄然改写一界大势",
    "晋阶后名称": "踏尘神尊",
    "晋阶后效果": "出入凡尘如履平地，既可彻底敛去神威规避常规监察，又能以极小代价将神力折算为凡间可控伟力，长驻人间不伤本源。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "神陨天罚",
    "神位生裂"
   ],
   "风味": "高居九天外，亦可踏红尘。"
  },
  {
   "名称": "神考垂青",
   "品阶": "金",
   "类别": "机缘",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "气息契合古神残意，极易引动高阶神考",
   "效果": "踏入古神遗迹、秘岛等留痕之地或展露极致意志时，极易引来先辈神祇青睐并开启高阶神考；领悟考题真意更快，过考淬炼更厚（不直接赐神位）。",
   "代价": null,
   "晋阶": {
    "条件": "连过三项高阶神考或赢得神器深度认可",
    "晋阶后名称": "神选之子",
    "晋阶后效果": "与神考及神器亲和度增长极快，临近抹杀级考核失败时可多得一次重整契机；所获神赐魂环或神器回应总能补足自身最大短板。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "位面厌弃",
    "神陨天罚",
    "绝命死契"
   ],
   "风味": "诸神垂眸万载，唯你应召而来。"
  },
  {
   "名称": "以战养道",
   "品阶": "金",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "越战越勇，在棋逢对手的血斗中迅猛破境",
   "效果": "每历一场势均力敌或略处下风的实战，战后魂力凝实度与招式掌控大幅精进，易在鏖战中震松瓶颈；连番高强度搏杀不显疲软，越到后程锋芒越盛。",
   "代价": "久居安逸且连月无实战切磋时，静坐闭关进境转慢、心绪易生躁郁。",
   "晋阶": {
    "条件": "于同大层次以弱胜强击败十名以上成名劲敌",
    "晋阶后名称": null,
    "晋阶后效果": "战斗中受创只要未失战力，气势与招式锐度反增不减，能迅速勘破强敌招式循环与魂技衔接缝隙，于绝战中强行催熟绝技。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "冥想静心"
   ],
   "风味": "静室修不出真锋，唯有血战证道途。"
  },
  {
   "名称": "器道神匠",
   "品阶": "金",
   "类别": "机缘",
   "适用": [
    "人类魂师"
   ],
   "简介": "锻造暗器与魂导器一点即通，成器易生灵性",
   "效果": "研习锻造、暗器、魂导器或斗铠法阵事半功倍，成器成色与融合度远超常人；亲手铸就或温养的本命器物极易通灵，冲击高阶锻造不易炸炉毁材。",
   "代价": null,
   "晋阶": {
    "条件": "亲手铸成一件震动当世的绝品器物或高字斗铠",
    "晋阶后名称": "造化神工",
    "晋阶后效果": "经手炼制之暗器、魂导器或斗铠部件皆浑然天成，引动元素之劫时成功率大增且少伤气血；持自制器物临敌契合臻至化境。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "散财童子"
   ],
   "风味": "百炼千锤落，顽铁亦有魂。"
  },
  {
   "名称": "灵台明镜",
   "品阶": "金",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "识海澄澈如镜，诸般幻魅难侵且洞穿虚妄",
   "效果": "精神之海坚稳无瑕，同大层次精神冲击、幻境、魅惑及邪魂侵蚀极难动摇心神；与人周旋对伪饰格外敏锐，破译古阵与凝聚精神领域速度倍增。",
   "代价": null,
   "晋阶": {
    "条件": "正面勘破强敌精神领域或识破足以倾覆势力的暗局",
    "晋阶后名称": "太虚神镜",
    "晋阶后效果": "精神防御坚不可摧，可反震同阶精神窥伺并瞬间锁敌方位；对决时能于电光火石间预判对手出招轨路与魂技破绽。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "心魔噬魂",
    "邪念夺舍"
   ],
   "风味": "明镜照寒渊，万邪不能移。"
  },
  {
   "名称": "仙草圣体",
   "品阶": "金",
   "类别": "体质",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "百草相亲，服食天材地宝药力尽化底蕴",
   "效果": "吞服仙草、奇珍丹药或吸纳珍稀植物能量时无排异狂暴之忧，药力化用近乎圆满且额外固本培元；身处灵地秘境修炼时天地灵气汇聚倍增。",
   "代价": null,
   "晋阶": {
    "条件": "炼化至少三株稀世仙草或顶尖奇珍并圆满消化",
    "晋阶后名称": "万木朝宗",
    "晋阶后效果": "凡服奇珍皆可激发潜藏药性、催动体魄与武魂深层蜕变；对一切凡俗植物毒瘴与寄生天然免疫，临近药草秘境自有感应。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "病骨支离",
    "毒脉反噬"
   ],
   "风味": "草木本无情，偏为玉骨开。"
  },
  {
   "名称": "越限承环",
   "品阶": "红",
   "类别": "体质",
   "适用": [
    "人类魂师"
   ],
   "简介": "经脉坚韧超常，吸收魂环年限上限大增",
   "效果": "常规吸收魂环时，安全承受年限较同阶常人高出约五成（如第一环可达六百余年，依环递升），超限冲击爆体风险大减，所成魂技更凝实。",
   "代价": null,
   "晋阶": {
    "条件": "连续三次成功吸收大幅超出常规上限的魂环",
    "晋阶后名称": "万环归宗",
    "晋阶后效果": "吸环与融合高阶魂灵的承受极限近乎翻倍，可驯化微有冲突的魂兽属性，且既有魂环随主角修为精进缓慢滋长年限。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "环噬之躯",
    "病骨支离"
   ],
   "风味": "常人止步处，正是我启程时。"
  },
  {
   "名称": "魂骨缘深",
   "品阶": "红",
   "类别": "机缘",
   "适用": [
    "人类魂师"
   ],
   "简介": "猎魂探秘易遇奇骨，融合顺遂成长更快",
   "效果": "击败高阶魂兽或探索古强者遗迹时，产出魂骨与外附魂骨的几率远胜常人，且更易贴合自身武魂属性；融骨排斥微弱、成长更快（仍守七部位唯一）。",
   "代价": null,
   "晋阶": {
    "条件": "集齐至少三块高年限魂骨或一块外附魂骨",
    "晋阶后名称": "神骨天成",
    "晋阶后效果": "体内多块魂骨间产生隐性共鸣，联动催动魂骨技时魂力损耗锐减且威力互增，魂骨随主人修为成长的上限大幅拓宽。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "霉运缠身"
   ],
   "风味": "万中无一骨，偏自入怀来。"
  },
  {
   "名称": "领域先觉",
   "品阶": "红",
   "类别": "心性",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "洞悉领域韵律，早年可触领域门槛",
   "效果": "身陷敌方领域时受压制幅度减半，能迅速摸清对方领域流转破绽；自身在机缘、高阶魂环或试炼中极易悟出天赋领域或提前催生领域雏形。",
   "代价": null,
   "晋阶": {
    "条件": "正面击破一处封号级领域并修成自身完整领域",
    "晋阶后名称": "万域独尊",
    "晋阶后效果": "自身领域展开迅捷且深借环境地利，与同阶领域相撞天然占优，双领域或领域与魂技切换之间几乎不留空隙。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "心魔噬魂"
   ],
   "风味": "一念开界域，天地入掌中。"
  },
  {
   "名称": "血脉压制",
   "品阶": "红",
   "类别": "血脉",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "体蕴上位血脉威压，震慑同源兽武魂与魂兽",
   "效果": "对敌同源下位兽武魂或低阶魂兽时，可释无形血脉威压令其魂力运转迟滞、招式威能下滑一两成；面对高阶血脉反压亦能稳住气血不溃。",
   "代价": null,
   "晋阶": {
    "条件": "正面交锋中以血脉威势压服三名顶尖兽武魂或凶兽",
    "晋阶后名称": "皇血镇世",
    "晋阶后效果": "血脉威压可化作实质气势场，重压同源魂师与魂兽并震散寻常精神干扰，危急时引动气血沸腾短时拔升体魄战力。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "血脉排斥"
   ],
   "风味": "血脉有尊卑，见皇岂敢不低头。"
  },
  {
   "名称": "大器晚成",
   "品阶": "红",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "前半程厚积薄发，跨入高阶后破境如潮",
   "效果": "五十级（或万年修为）前修炼不显惊艳但根基奇稳；越过中阶分水岭后，冲击七十级真身、九十级封号与九十五级分水岭时领悟骤增，极少死卡瓶颈。",
   "代价": null,
   "晋阶": {
    "条件": "跨入九十级封号或渡过十万年大限且根基圆满",
    "晋阶后名称": null,
    "晋阶后效果": "九十五级以上每级领悟耗时较常人缩短大半，魂力底蕴浑厚绵长，同级久战中持久力与爆发上限均稳压强敌一头。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "早慧早折"
   ],
   "风味": "蛰伏十载无人问，一朝破云天下惊。"
  },
  {
   "名称": "以杀证道",
   "品阶": "红",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "杀气凝而不散，百战血火淬炼冰冷杀意",
   "效果": "斩杀强敌或历经惨烈厮杀后，杀气不蚀理智反凝为实质锋芒；战斗释放杀意可震慑弱敌、削弱其反应，且极易借杀伐试炼修成杀气领域或绝技。",
   "代价": "日常眉宇自带凛冽寒意，百姓与温和正派初见易生畏惧戒心。",
   "晋阶": {
    "条件": "历经百战不失本心并手刃一名同阶宿敌",
    "晋阶后名称": "修罗剑心",
    "晋阶后效果": "杀意收发由心，敛息如常人，爆发可令同阶对手心神震颤、魂技起手慢上半拍，并免疫狂暴嗜血类心智侵蚀。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "面善无害",
    "魂兽亲和",
    "猫狗亲近"
   ],
   "风味": "杀气入骨不入魔，剑锋所指皆寒霜。"
  },
  {
   "名称": "桃花照命",
   "品阶": "红",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "风仪出众红尘缘深，易与当世俊杰结宿缘",
   "效果": "与容貌、才情或地位出众的人物深交时，对方天然易生好感与好奇，情意增长阻力大减；危难关头常有倾慕主角之人暗中报信、赠宝或出面周旋。",
   "代价": null,
   "晋阶": {
    "条件": "与至少两位当世核心人物缔结生死不渝的深厚情意",
    "晋阶后名称": "红尘绝恋",
    "晋阶后效果": "与情意深厚之人并肩作战心意相通，武魂融合技与合击契合度暴涨；主角陷险时身边亲近之人总能第一时间生出感应。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "天煞孤星",
    "情劫噬心"
   ],
   "风味": "一见倾心易，同行共白头难，偏你两相全。"
  },
  {
   "名称": "万兽共尊",
   "品阶": "红",
   "类别": "血脉",
   "适用": [
    "魂兽"
   ],
   "简介": "天生林野王者威仪，百兽听调不犯领地",
   "效果": "身处魂兽聚居地时，除宿敌外寻常万年以下魂兽绝不主动袭扰，更可驱使中低阶魂兽警戒、探路或迟滞追兵；危急时可唤周边族群短时助阵。",
   "代价": null,
   "晋阶": {
    "条件": "统御一方魂兽领地并正面击溃人类封号猎魂队",
    "晋阶后名称": "百兽之王",
    "晋阶后效果": "威名远播整片山林或海域，连高阶万年魂兽亦愿奉命听调，领地动静尽收耳目，遭强敌围剿可引动小规模兽潮突围。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "兽血招狩"
   ],
   "风味": "深林百兽皆低首，此地谁敢动刀兵。"
  },
  {
   "名称": "劫雷锻骨",
   "品阶": "红",
   "类别": "血脉",
   "适用": [
    "魂兽"
   ],
   "简介": "引天劫雷霆洗炼筋骨，化生死劫为大造化",
   "效果": "面对雷属性攻势或渡修为天劫时，抗伤能力远胜同族，更能吞引残余雷霆淬炼筋骨；每次硬扛雷击或渡劫后，修为年限额外暴涨且肉身更强。",
   "代价": null,
   "晋阶": {
    "条件": "硬抗一次完整天劫或雷属性封号绝技而不倒",
    "晋阶后名称": "雷劫化龙",
    "晋阶后效果": "攻势自带一缕天劫破魔雷韵，对防御魂技与领域具额外穿透力；后续再迎大劫更能引雷淬魂、令修为连跨台阶。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "天劫倍至",
    "病骨支离"
   ],
   "风味": "天雷本欲绝吾命，反替吾身铸金鳞。"
  },
  {
   "名称": "权柄余韵",
   "品阶": "红",
   "类别": "命格",
   "适用": [
    "神祇"
   ],
   "简介": "神位权柄留痕绵长，所立赐福与封印难散",
   "效果": "动用神位权柄布下赐福、封印或改造一方地界后，效用时限与范围翻倍；所立神契与印记极难被非神王级外力抹去，且可随时借印记隔空感应异动。",
   "代价": null,
   "晋阶": {
    "条件": "在凡间留下一处历经岁月而不衰的神迹或道统",
    "晋阶后名称": "神泽万古",
    "晋阶后效果": "权柄遗泽可化常驻界域，庇佑信众与亲眷免受邪祟侵扰；主角于自身神迹范围内交战时，神力回流加快且权柄威能再增一成。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "神位生裂",
    "神陨天罚"
   ],
   "风味": "神步虽远去，余威镇山河。"
  },
  {
   "名称": "神装自孕",
   "品阶": "红",
   "类别": "机缘",
   "适用": [
    "神祇"
   ],
   "简介": "神装神器与神识相融，受损自愈并渐生妙用",
   "效果": "随身神器、神装或高字斗铠激战受损后，置入神识温养数日即可自行修复，不必四处寻觅奇材；长期温养还能持续拉升亲和度并激发守护微效。",
   "代价": null,
   "晋阶": {
    "条件": "以神识将一件神装或神器温养至完全圆融",
    "晋阶后名称": "神兵化一",
    "晋阶后效果": "神器神装如臂使指，召唤切换近乎瞬发且消耗大减，战时可替本体分担一次同阶重击反震，保神躯核心无恙。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "神位生裂"
   ],
   "风味": "神识日夜养，金甲自有灵。"
  },
  {
   "名称": "燃血焚躯",
   "品阶": "红",
   "类别": "体质",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "绝境主动焚血换力，短时爆发惊世战力",
   "效果": "陷生死死斗时可主动燃动气血，接下来数息至一炷香内魂力爆发、力速骤升一截（触发强力爆发状态），足以在同大层次险局中强行一击定胜负。",
   "代价": "战后气血亏空，连虚三至五日，期间陷入虚弱限制且魂力回流大减。",
   "晋阶": {
    "条件": "凭燃血爆发三次逆斩强敌且未留永久暗伤",
    "晋阶后名称": "浴血修罗",
    "晋阶后效果": "燃血爆发时限延长且战后虚弱大减，燃血期间免疫一般痛觉与迟缓控制，更可强行崩开一次同阶禁锢类魂技。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "病骨支离",
    "残躯早夭",
    "火候老辣"
   ],
   "风味": "宁作焚身三息火，不做阶下苟活人。"
  },
  {
   "名称": "名师引路",
   "品阶": "红",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "贵人缘深，歧路常逢隐世高人倾囊指点",
   "效果": "陷入修为瓶颈、武魂困境或流落异乡时，极易偶遇隐世封号斗罗、学院泰斗或绝学传人赏识，不仅愿指点修行秘诀，危急时亦可能出面庇护一二。",
   "代价": null,
   "晋阶": {
    "条件": "得至少两位隐世高人真传并青出于蓝",
    "晋阶后名称": "薪火传人",
    "晋阶后效果": "极易获准阅览顶尖宗门或学院核心秘藏，研习自创魂技、秘法与高阶理论事半功倍，行走天下自带尊崇师门体面。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "天煞孤星",
    "众叛亲离"
   ],
   "风味": "千里马常有，偏你步步逢伯乐。"
  },
  {
   "名称": "精神海阔",
   "品阶": "红",
   "类别": "体质",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "识海辽阔浑厚，承载魂灵与神识蜕变极快",
   "效果": "精神力修炼增速显著，承载高阶魂灵、精神类魂骨与抵御精神探查的容量远超同修为魂师；同阶精神威压更厚，极难被精神系强敌震伤识海。",
   "代价": null,
   "晋阶": {
    "条件": "精神力步入封号级或灵域境并凭威压慑服同阶",
    "晋阶后名称": "沧溟识海",
    "晋阶后效果": "识海浩瀚无垠，可分心精细操控多件器物或复数魂技并行施法，迈向神元境或灵识化神时壁垒大为削薄。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "心魔噬魂",
    "邪念夺舍"
   ],
   "风味": "一念纳沧溟，识海宽如天。"
  },
  {
   "名称": "机关算尽",
   "品阶": "红",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "城府谋略深沉，擅设暗局借势制衡群雄",
   "效果": "筹划设伏、诱敌深入或周旋于皇室宗门之间时，总能提前看出隐患并备妥后手；布局成势常能以弱筹码撬动大势力互耗，借刀破局而不沾因果。",
   "代价": null,
   "晋阶": {
    "条件": "不靠武力碾压，单凭智谋瓦解一桩强敌大局",
    "晋阶后名称": "执棋天下",
    "晋阶后效果": "洞察人心弱点与势力利害如掌上观纹，每次落子皆能逼对手入两难死地；面对他人连环阴谋亦极难被彻底蒙蔽。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "天下皆棋盘，众生多在算中行。"
  },
  {
   "名称": "商海通神",
   "品阶": "红",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "鉴宝生财无往不利，以雄厚财力撬动资源",
   "效果": "对奇珍、稀金与魂骨行情直觉极准，常在黑市与拍卖会捡漏神材；经手商路利润丰厚，筹措修炼资源、打造器物与收买绝密情报从不捉襟见肘。",
   "代价": null,
   "晋阶": {
    "条件": "凭财富与商脉左右一城或一宗的战略资源命脉",
    "晋阶后名称": "富可敌国",
    "晋阶后效果": "商网遍及大陆要冲，任何奇药稀金与绝密情报皆能砸出渠道购得，更可凭财力资助顶尖势力或聘请强者出手。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "散财童子"
   ],
   "风味": "金流所至处，奇珍自叩门。"
  },
  {
   "名称": "借势化力",
   "品阶": "红",
   "类别": "心性",
   "适用": [
    "人类魂师"
   ],
   "简介": "招式圆转如水，善卸蛮力并引敌招反噬",
   "效果": "面对强攻猛击或重器砸落时，能精准卸去三成以上冲击并顺势引偏敌招；连绵缠斗中每化解一记重击，自身下一次反击的穿透与准度随之攀升。",
   "代价": null,
   "晋阶": {
    "条件": "以柔克刚正面击败高出一环以上的强攻系劲敌",
    "晋阶后名称": "四两拨千斤",
    "晋阶后效果": "卸力反击出神入化，甚至能将同阶远程魂技或射线偏折回引敌阵，令强攻劲敌投鼠忌器、越打越窘。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "任尔千钧力，入我太极皆成风。"
  },
  {
   "名称": "潜影无踪",
   "品阶": "红",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "敛息藏形天成，潜伏刺探与遁逃堪称一绝",
   "效果": "主动收敛魂力与杀气时，同大层次高出一两小阶强者亦难觉察踪迹；借阴影草木或人群脱身极难被锁定追踪，暗中奇袭首击必带出其不意破防优势。",
   "代价": null,
   "晋阶": {
    "条件": "在封号级或同阶强敌眼皮下潜入核心重地全身而退",
    "晋阶后名称": "无影无相",
    "晋阶后效果": "身形气息与环境融为一体，寻常精神扫描与警戒法阵难响警报；脱战数息即可抹尽行迹，顶尖敏攻也难追寻去向。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "煞气外露",
    "众星捧月"
   ],
   "风味": "来无影，去无尘，唯留空影惊敌魂。"
  },
  {
   "名称": "化形隐息",
   "品阶": "紫",
   "类别": "血脉",
   "适用": [
    "魂兽"
   ],
   "简介": "化形重修兽气尽敛，难被封号斗罗一眼看破",
   "效果": "魂兽化形行走人世时，寻常封号斗罗若不贴身深查极难察觉魂兽真身；重修阶段自凝魂环底蕴更厚，且不易触发人类猎魂者的本能警觉。",
   "代价": null,
   "晋阶": {
    "条件": "化形状态下安稳突破七环成熟期且未曾暴露真身",
    "晋阶后名称": "人兽无间",
    "晋阶后效果": "除极限斗罗持秘宝贴身查验或神祇外，世间无人能辨魂兽出身；重修临近九十级化神期时可提前唤回部分本体底蕴。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "兽血招狩",
    "煞气外露"
   ],
   "风味": "褪尽鳞羽入红尘，谁识旧日林中王。"
  },
  {
   "名称": "兽域天成",
   "品阶": "紫",
   "类别": "血脉",
   "适用": [
    "魂兽"
   ],
   "简介": "身契原生山海地利，主场作战威势大增",
   "效果": "身处契合自身属性的原生环境（森林、极北、深海、火山等）时，魂力恢复与速度大增，本命魂兽技威力提升约两成，且更易提前摸到魂兽领域门槛。",
   "代价": null,
   "晋阶": {
    "条件": "在原生主场击退或斩杀一名强闯领地的封号级强敌",
    "晋阶后名称": "沧海桑田",
    "晋阶后效果": "可在方圆百丈内牵引地脉元气微调局部环境，即便离开原生老巢作战，亦能凭空营造利于自身的弱化主场。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "一草一木皆我臂，千里山河作我盾。"
  },
  {
   "名称": "神识洞微",
   "品阶": "紫",
   "类别": "心性",
   "适用": [
    "神祇"
   ],
   "简介": "神识凝丝隐蔽探查，不易触怒同阶强者",
   "效果": "神识远距侦察纤细无声，同阶神祇或准神极难发觉窥伺而视作挑衅；对空间裂隙、隐蔽杀阵与伪装身份的细微违和格外敏锐，常先一步防备暗算。",
   "代价": null,
   "晋阶": {
    "条件": "凭神识暗查提前化解一次同阶强敌设下的绝杀埋伏",
    "晋阶后名称": "明察秋毫",
    "晋阶后效果": "神识如丝穿透重重遮蔽，既可精准锁定敌方弱点与魂核虚实，更能百里之外无声传讯而不被他人截听。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "煞气外露"
   ],
   "风味": "游丝拂千里，无声见真章。"
  },
  {
   "名称": "百毒不侵",
   "品阶": "紫",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "经脉奇异，凡俗剧毒迷烟难以伤及肺腑",
   "效果": "遭遇非神级剧毒、迷烟、麻痹药剂或毒系魂技时，毒效大幅减弱且易自行逼出；日常接触毒草或炼制毒器不误伤己身，甚至可借微毒淬炼气血。",
   "代价": null,
   "晋阶": {
    "条件": "吞服或硬扛一种封号级剧毒并成功炼化为己用",
    "晋阶后名称": null,
    "晋阶后效果": "凡俗至毒反成补药，中剧毒时不仅无伤，更能将余毒暂附于自身魂技或器物回敬对手，令毒系封号斗罗束手无策。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "毒脉反噬"
   ],
   "风味": "鸠酒入喉如清露，五毒见我自消融。"
  },
  {
   "名称": "天生神力",
   "品阶": "紫",
   "类别": "体质",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "筋骨沉雄，未动魂力亦有裂石崩山之伟力",
   "效果": "肉身纯粹气力与爆发远超同阶，近身搏杀、抡动重器或硬撼强攻魂师稳占上风；哪怕陷入魂力枯竭或禁技困局，仍能凭蛮力撕开缺口血战突围。",
   "代价": null,
   "晋阶": {
    "条件": "不靠魂技增幅，单凭肉身气力正面压服高一环强攻魂师",
    "晋阶后名称": null,
    "晋阶后效果": "举手投足暗藏千钧崩劲，寻常护体魂力罩与坚甲难以硬接，近身角力可直接震散对手蓄力中的强攻魂技。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "病骨支离"
   ],
   "风味": "一力降十会，万巧难敌真千钧。"
  },
  {
   "名称": "魂技精微",
   "品阶": "紫",
   "类别": "心性",
   "适用": [
    "人类魂师"
   ],
   "简介": "魂技收放极细，省力增效且擅分心变化",
   "效果": "施展魂技时魂力损耗降低约两成，起手更短且可中途微调轨路；研习分心控制、魂技衔接与自创魂技进展神速，实战中极少虚耗多余魂力。",
   "代价": null,
   "晋阶": {
    "条件": "于正式对决创出并打成一式令同阶惊艳的自创魂技",
    "晋阶后名称": "技近乎道",
    "晋阶后效果": "可将两式低环魂技无声糅合瞬发，打出出人意料的复合奇效；低年限魂环魂技经精微拆解后，封号阶段依旧实用。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "魂力漏斗"
   ],
   "风味": "毫厘之间见乾坤，一分魂力作两分用。"
  },
  {
   "名称": "锻体如钢",
   "品阶": "紫",
   "类别": "体质",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "皮膜筋骨如玄铁，最擅硬抗重击与持久血战",
   "效果": "物理防御与抗震荡能力大增，承受同阶强攻或轰爆余波极难伤及脏腑；重伤后止血接骨速度远快常人，极适合充当前排硬扛正面火力。",
   "代价": null,
   "晋阶": {
    "条件": "正面硬吃三记同阶绝技屹立不倒并反胜对手",
    "晋阶后名称": "金刚不坏",
    "晋阶后效果": "受击刹那体表魂力自动凝盾卸劲，寻常利刃穿甲难以破防；身负轻中度外伤时动作与战力几乎不受拖累。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "病骨支离"
   ],
   "风味": "刀剑加身铮然响，一身铁骨立苍茫。"
  },
  {
   "名称": "器阵奇才",
   "品阶": "紫",
   "类别": "心性",
   "适用": [
    "人类魂师"
   ],
   "简介": "精通机括阵纹，研习暗器魂导与斗铠事半功倍",
   "效果": "刻画核心法阵、改装魂导器、装造暗器或打磨斗铠机甲部件时，损毁失败率大降且效率翻倍；实战操持多件器物游刃有余，易看穿敌方器物弱点。",
   "代价": null,
   "晋阶": {
    "条件": "亲手制出超越自身当前环数一档的精良器物或部件",
    "晋阶后名称": "阵纹通灵",
    "晋阶后效果": "随手调校即可令手头暗器、魂导器或机甲威能临时上浮一档；面对敌方器阵防线一眼便能锁死核心节点破之。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "一笔刻灵纹，死物化神锋。"
  },
  {
   "名称": "巧舌如簧",
   "品阶": "紫",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "辞令锋锐圆融，谈判离间与脱身皆凭口才",
   "效果": "与权贵、宗主或敌对势力交涉时，极易直击利益痛点迫使对方让步；陷围堵审讯能凭滴水不漏的说辞拖延、转移猜忌，甚至挑动敌方内讧。",
   "代价": null,
   "晋阶": {
    "条件": "仅凭唇枪舌剑瓦解一场针对己方的多方势力联手围剿",
    "晋阶后名称": null,
    "晋阶后效果": "公开场合发声自带慑人说服力，寥寥数语即可翻动舆论、瓦解敌方士气，在各方大势力斡旋中总能谈下最厚筹码。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "众叛亲离"
   ],
   "风味": "三寸不烂舌，胜过十万兵。"
  },
  {
   "名称": "临危不乱",
   "品阶": "紫",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "崩山于前色不变，死局之中思绪反更清明",
   "效果": "遭突发偷袭、兽潮合围或敌众我寡时绝不慌神，感官瞬间沉静，电光火石间选出最稳闪避与破局路线；恐吓威压类精神干扰对主角失灵大半。",
   "代价": null,
   "晋阶": {
    "条件": "在全员溃乱的险局中独自稳住阵脚并带队突围",
    "晋阶后名称": null,
    "晋阶后效果": "绝境下自身反应速度显著拔高，沉稳气度更可稳住身旁同伴不溃，令强敌的心理施压与声东击西战术彻底失效。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "惊涛拍岸时，唯我心灯不摇。"
  },
  {
   "名称": "丹药良相",
   "品阶": "紫",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "辨草知性，服药食补皆能祛杂增效",
   "效果": "一眼识破草药药龄与药性相克，绝不误服毒草或买假药；吞服疗伤回气丹药或食物系魂技时，起效时间缩短一半且额外多出约三成恢复量。",
   "代价": null,
   "晋阶": {
    "条件": "以药石或食补之术救回一名濒死强者的性命",
    "晋阶后名称": "药王圣手",
    "晋阶后效果": "可就地取材调配高效解毒、固本与疗伤秘剂，连寻常医师束手的内伤暗疾亦能逐步拔除，令各方强者甘愿欠下人情。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "毒脉反噬"
   ],
   "风味": "良药本苦口，入君腹中尽成春。"
  },
  {
   "名称": "疾风掠影",
   "品阶": "紫",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "身法灵动迅疾，抢占先机与万里奔袭出众",
   "效果": "移速、变向爆发与滞空腾挪显著快过同阶，开战多能抢得先手；长途奔袭或紧急撤离耗力更少，寻常范围控制魂技极难将主角死死封困。",
   "代价": null,
   "晋阶": {
    "条件": "不借外物正面甩脱高自身一环的敏攻系强者追杀",
    "晋阶后名称": "缩地成寸",
    "晋阶后效果": "短距闪避几成残影，交锋极易绕至强敌视觉死角发动奇袭；战局不利只要空间未彻底封死，便有八成把握全身而退。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "病骨支离"
   ],
   "风味": "风起青萍末，身已过重山。"
  },
  {
   "名称": "世家底蕴",
   "品阶": "紫",
   "类别": "机缘",
   "适用": [
    "人类魂师"
   ],
   "简介": "承古族隐脉遗泽，通晓秘闻并留旧日暗线",
   "效果": "熟知各大宗门规矩、势力隐秘弱点与古秘境传闻，周旋高层不易露怯；每逢危急或急缺紧俏物资，可在大城寻得旧日人脉暗中搭线通融。",
   "代价": null,
   "晋阶": {
    "条件": "整合旧脉编织起足以影响一国的秘密情报网",
    "晋阶后名称": "权倾暗幕",
    "晋阶后效果": "天下风吹草动多能提前三日入耳，各势力暗中交易与伏兵动向难逃耳目，行事落子总能先人一步。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "众叛亲离"
   ],
   "风味": "百年钟鸣鼎食旧影，化作袖中暗棋几枚。"
  },
  {
   "名称": "灵眸洞察",
   "品阶": "紫",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "目力清明敏锐，善观魂力轨迹与伪装破绽",
   "效果": "暗夜视物清晰，对高速轨迹、暗器来路与细微神色捕捉极准；过招数合即可摸清对手魂力运转习惯与蓄力节点，大幅拔高闪避与反击准度。",
   "代价": null,
   "晋阶": {
    "条件": "无精神系辅助下仅凭目力勘破隐匿强敌的绝命杀招",
    "晋阶后名称": "破妄金瞳",
    "晋阶后效果": "可洞穿常规幻象、迷雾与易容伪装，直视强敌魂核虚实与护罩薄弱处，远程狙击或点穴破防准度惊人。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "双眼如秋水，一眼照破十重纱。"
  },
  {
   "名称": "元素亲和",
   "品阶": "紫",
   "类别": "血脉",
   "适用": [
    "通用"
   ],
   "简介": "深受天地元素眷顾，同属性攻防如鱼得水",
   "效果": "施展主属性元素攻防时可引天地游离元素增幅威能约两成，且受同属性敌招伤害显著减轻；在契合气候或地形下魂力恢复尤为迅速。",
   "代价": null,
   "晋阶": {
    "条件": "将自身主属性感悟推至近乎极致属性的临界门槛",
    "晋阶后名称": "元素之主",
    "晋阶后效果": "战时可掠夺场上敌方释出的同属性游离能量反补己身，同属性非极致强敌的魂技在主角面前威能大打折扣。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "位面厌弃",
    "血脉排斥"
   ],
   "风味": "天地万象自呼应，抬手皆是同源灵。"
  },
  {
   "名称": "众星捧月",
   "品阶": "紫",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "风采耀眼亲和力佳，公开场合极易脱颖而出",
   "效果": "参加大比、考核、宴会或初入新圈子时，言行极易赢得师长、裁判与同辈好感；众人多往佳处揣度主角，势力声望上涨极快，微小过失多获宽容。",
   "代价": null,
   "晋阶": {
    "条件": "于全大陆瞩目的盛会或大赛中夺魁赢得万众敬仰",
    "晋阶后名称": "万众归望",
    "晋阶后效果": "声名传遍大陆，行至何处皆受礼遇，寻常小人不敢明面刁难；登高一呼时，同辈俊杰与地方豪强多愿卖几分薄面。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "众叛亲离",
    "煞气外露",
    "众怒公敌",
    "血债难偿",
    "潜影无踪",
    "神威敛尘"
   ],
   "风味": "群英荟萃处，目光总不自觉落你一身。"
  },
  {
   "名称": "借花献佛",
   "品阶": "紫",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "善观强敌相争，混战之中总能巧手渔利",
   "效果": "卷入多方势力火拼或魂兽争斗时，极易瞥见无人看管的重宝、残伤猎物或撤离暗道；顺手渔翁得利后极少第一时间被胜负双方察觉记恨。",
   "代价": null,
   "晋阶": {
    "条件": "三次于多方强敌混战中全身而退并带走核心战利",
    "晋阶后名称": "鹬蚌得利",
    "晋阶后效果": "天生嗅得到势力博弈的缝隙，常能以极小代价诱发敌对各方提前火拼，自己在幕后稳收资源与人情。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "煞气外露"
   ],
   "风味": "两虎争山血未干，已有人笑纳残珍。"
  },
  {
   "名称": "逆境淬魂",
   "品阶": "紫",
   "类别": "心性",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "身处高压绝地越挫越勇，苦修效率反胜寻常",
   "效果": "在重力场、极寒酷暑、高阶威压或苦修绝地修炼时，不仅耐受力翻倍，魂力提纯与打磨效率反比平日高出五成；遭逢惨败打击后心气不堕反升。",
   "代价": null,
   "晋阶": {
    "条件": "于极端绝地苦修逾一年并连破瓶颈出关",
    "晋阶后名称": "百炼成钢",
    "晋阶后效果": "任何环境恶化、外力压制或修为封禁试炼皆难折主角斗志，反而不断化作浑厚底蕴，破封出关之日战力必迎暴涨。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "心魔噬魂"
   ],
   "风味": "风雪压青松，越折腰脊越峥嵘。"
  },
  {
   "名称": "灵药寻踪",
   "品阶": "黄",
   "类别": "机缘",
   "适用": [
    "魂兽"
   ],
   "简介": "嗅觉灵通，密林深谷易觅奇花异草与灵泉",
   "效果": "穿行荒野、密林或深海时，百丈内若有百年以上灵草、天材地宝或灵泉眼便生清晰感应；采摘时亦能提前嗅出守护魂兽与天然毒瘴。",
   "代价": null,
   "晋阶": {
    "条件": "凭本能觅得并守护或炼化一株万年稀世仙草",
    "晋阶后名称": "百草灵鼻",
    "晋阶后效果": "感应范围扩至数里，能分辨药草熟度与相生伴生物，即便潜入人类药园或秘藏深处也能直指最珍贵一株。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "霉运缠身"
   ],
   "风味": "深谷幽兰无人识，一阵清风早入鼻。"
  },
  {
   "名称": "香火常续",
   "品阶": "黄",
   "类别": "机缘",
   "适用": [
    "神祇"
   ],
   "简介": "下界留有残庙遗民，细微香火绵延不断",
   "效果": "纵然隐世或受排挤，凡间仍有零星信众与古族暗中供奉，每隔数日便有一缕微薄香火念力回流，助主角稳住神力根基、减缓久留人间消耗。",
   "代价": null,
   "晋阶": {
    "条件": "在下界重兴一座显赫神殿并令万民诚心敬奉",
    "晋阶后名称": "香火鼎盛",
    "晋阶后效果": "信仰回流成倍暴涨，平日神力充盈无忧，危急时更可透支积蓄香火瞬间补回三成神力，解燃眉之困。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "神位生裂",
    "众叛亲离"
   ],
   "风味": "荒山破庙一炷香，犹系人间万缕情。"
  },
  {
   "名称": "冥想静心",
   "品阶": "黄",
   "类别": "心性",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "入定极快，闹市荒野皆可安稳修习魂力",
   "效果": "无论身处车马喧嚣还是荒野露宿都能瞬间入定，日常修炼魂力或积攒修为年限效率提升约两成，且夜间调息能更好替代睡眠恢复精力。",
   "代价": null,
   "晋阶": {
    "条件": "静心苦修连破两道十级大关或万年大坎",
    "晋阶后名称": "心如止水",
    "晋阶后效果": "行住坐卧间魂力皆悄然自转微增，几乎不挑静室即可高效闭关，冲击大瓶颈时心神稳固不易岔气。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "以战养道"
   ],
   "风味": "结庐在人境，心静自无车马喧。"
  },
  {
   "名称": "刀头舔血",
   "品阶": "黄",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "久惯江湖凶险，对杀意暗算嗅觉极为敏锐",
   "效果": "附近有人藏匿杀意、暗中瞄准或饮食动过手脚时，后颈必生寒意预警，极难在毫无防备下遭一击毙命；反杀伏兵时果决利落、绝不手软。",
   "代价": null,
   "晋阶": {
    "条件": "连续五次识破并反制致命暗杀或险恶伏击",
    "晋阶后名称": "鹰隼警觉",
    "晋阶后效果": "十丈内任何恶意锁定、陷阱异响或高阶狙击皆提前数息在心头警铃大作，擅长隐匿的刺客亦难讨便宜。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "活过十回冷箭的人，听风都辨得出杀机。"
  },
  {
   "名称": "精打细算",
   "品阶": "黄",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "理财经商眼光独到，买卖筹资绝不吃暗亏",
   "效果": "采买魂导器、药材、装备或购买情报时，能识破虚价谈下约两成折扣；变卖战利品与稀材亦能寻到高价买家，钱包积蓄稳步增长。",
   "代价": null,
   "晋阶": {
    "条件": "凭交易调配攒下足以购置万年魂骨的丰厚家底",
    "晋阶后名称": "点石成金",
    "晋阶后效果": "交易眼光愈发毒辣，能一眼看透冷门矿材与古旧残器的隐藏价值，常以低价淘到转手翻倍的奇货。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "散财童子"
   ],
   "风味": "一枚金魂币掰作两半花，半枚买刀半枚买路。"
  },
  {
   "名称": "体健如牛",
   "品阶": "黄",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "精力充沛耐力悠长，长途奔走久战难倦",
   "效果": "气血厚实、体力充盈，连续赶路、严苛特训或拉锯恶战时极难力竭脱力；寻常风寒小疾不侵，轻伤歇息一夜即可恢复大半元气。",
   "代价": null,
   "晋阶": {
    "条件": "历经极端苦训或连日血战始终未曾力竭倒下",
    "晋阶后名称": null,
    "晋阶后效果": "持久战中体能与魂力衔接顺畅，哪怕魂力消耗过半仍能稳住高强度攻防节奏，战后休整耗时比常人减半。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "病骨支离",
    "残躯早夭"
   ],
   "风味": "别人喘如破风箱，你才刚活动开筋骨。"
  },
  {
   "名称": "长辈偏爱",
   "品阶": "黄",
   "类别": "命格",
   "适用": [
    "人类魂师"
   ],
   "简介": "懂礼合眼缘，在宗门学院极易得前辈关照",
   "效果": "身处学院、宗门或军旅，极易受导师、长老与前辈偏心照顾，分配资源、带队猎魂或推举历练常先想到主角；偶犯小错亦多获轻纵。",
   "代价": null,
   "晋阶": {
    "条件": "获一方大势力实权长老收为亲传并倾力栽培",
    "晋阶后名称": "掌上明珠",
    "晋阶后效果": "所在势力的核心秘籍、拟态修炼场与护道资源皆向主角倾斜，出外遇险时身后前辈更愿亲自出面撑腰。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "众叛亲离",
    "煞气外露"
   ],
   "风味": "人前乖巧三分笑，长老袖中好物自然留。"
  },
  {
   "名称": "魂兽亲和",
   "品阶": "黄",
   "类别": "命格",
   "适用": [
    "人类魂师"
   ],
   "简介": "气息温和纯净，非暴戾魂兽不易主动敌视",
   "效果": "踏入魂兽聚居地只要不散杀意，寻常中低阶魂兽多绕道避让；与温顺魂兽沟通、缔结魂灵契约或安抚暴躁魂兽时，成功率与默契度大增。",
   "代价": null,
   "晋阶": {
    "条件": "与一只万年及以上魂兽建立生死互信之约",
    "晋阶后名称": "万灵之友",
    "晋阶后效果": "魂兽本能信赖主角善意，招募强力魂灵或求助高阶魂兽阻力锐减，连十万年魂兽初见亦愿先听一言。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "煞气外露",
    "以杀证道"
   ],
   "风味": "不怀猎杀心，林间万灵自相亲。"
  },
  {
   "名称": "手巧心细",
   "品阶": "黄",
   "类别": "体质",
   "适用": [
    "人类魂师"
   ],
   "简介": "十指极稳，锻造铭刻与修配精密器物少失误",
   "效果": "锻造提纯、铭刻细微核心法阵、拆装暗器或抢修斗铠机甲部件时，手稳心细、次品率大降；日常修习辅助职业熟练度增速明显快过常人。",
   "代价": null,
   "晋阶": {
    "条件": "将任一辅助职业修至大师级或四级以上水准",
    "晋阶后名称": "巧夺天工",
    "晋阶后效果": "亲手修理或微调的器物耐用度与流畅度显著提升，战斗间隙即可迅速抢修受损部件，精密操作近乎零失误。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "毫厘不差手自稳，细微之处见真功。"
  },
  {
   "名称": "顺藤摸瓜",
   "品阶": "黄",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "查案追凶直觉敏锐，总能揪出隐秘蛛丝马迹",
   "效果": "追查失踪人物、搜寻秘密据点或排查内鬼时，总能在不起眼的细节里揪出关键线索，大幅少绕弯路；暗中尾随目标亦更易猜准其落脚去处。",
   "代价": null,
   "晋阶": {
    "条件": "顺着零碎线索揭破一桩暗中布局多年的大阴谋",
    "晋阶后名称": "洞若观火",
    "晋阶后效果": "凭两三条零散情报即可拼出八分真相，敌方布下的假线索与替身障眼法极难瞒过主角双眼。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "草蛇灰线伏千里，偏让你一眼扯出线头。"
  },
  {
   "名称": "义薄云天",
   "品阶": "黄",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "重诺守信，结交豪客战友多肯两肋插刀",
   "效果": "与性情中人、军旅悍将或江湖游侠结交时好感攀升极快，易结生死之交；只要主角守信待人，同伴受威逼利诱背叛几率大减，危难多肯回护。",
   "代价": null,
   "晋阶": {
    "条件": "为救挚友险死还生，赢得一片赤诚拥护",
    "晋阶后名称": "肝胆相照",
    "晋阶后效果": "与挚友结义并肩死斗时掩护衔接浑然天成，全队士气绝不因劣势崩盘，且在各处江湖人脉中凭名声即可借来援手。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "天煞孤星",
    "众叛亲离"
   ],
   "风味": "一诺重千金，生死共担不曾移。"
  },
  {
   "名称": "兵法通晓",
   "品阶": "黄",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "善察战局地形，带队团战与布阵游刃有余",
   "效果": "七人团战、小队猎魂或战阵交锋时，能迅速看穿地势利弊与敌阵空档，统筹强攻、敏攻与辅助站位，令全队配合战力凭空抬高一截。",
   "代价": null,
   "晋阶": {
    "条件": "以少胜多指挥三场硬仗大获全胜",
    "晋阶后名称": "运筹帷幄",
    "晋阶后效果": "不仅小队战阵滴水不漏，统领大军调度亦能直掐敌军补给与阵眼，常以奇兵一击撕裂强敌防线。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "兵形如水因地变，胜负早在阵前分。"
  },
  {
   "名称": "百步穿杨",
   "品阶": "黄",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "手眼配合奇准，远程魂技与暗器指哪打哪",
   "效果": "施展远程魂技、掷出暗器或操控魂导射线时，对风向、距离与移动预判极准，百丈内弹无虚发；瞄准眼目、关节或器物核心时命中率大增。",
   "代价": null,
   "晋阶": {
    "条件": "于混战远距离一击精准狙创高阶强敌要害",
    "晋阶后名称": null,
    "晋阶后效果": "远程攻势可借角度弹射或绕障直击死角，高速腾挪的敏攻强敌亦难凭寻常身法完全躲开主角锁定。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "弦响箭未至，眉心已生寒。"
  },
  {
   "名称": "火候老辣",
   "品阶": "黄",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "临阵稳守底牌、善抓空隙，极少冒进犯错",
   "效果": "切磋实战总留三成余力防变，极难被诱敌深入或一波带走；卡准对手魂技冷却与换气间隙反击，招招打在敌方难受节点上。",
   "代价": null,
   "晋阶": {
    "条件": "以沉稳消耗战拖垮并击败三名急躁劲敌",
    "晋阶后名称": "滴水不漏",
    "晋阶后效果": "攻守节奏尽在掌握，极难跌入魂力枯竭窘境；面对高出一小阶对手亦能凭老辣周旋稳住局面等待转机。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "燃血焚躯"
   ],
   "风味": "急锋易折，唯稳者笑看敌衰。"
  },
  {
   "名称": "夜瞳遗脉",
   "品阶": "黄",
   "类别": "血脉",
   "适用": [
    "通用"
   ],
   "简介": "双瞳含微弱夜行血韵，入夜暗战视听清明",
   "效果": "入夜、踏入地穴或身处浓雾暗处时，双目微映微光、视听反更清晰，身法与隐匿俱有微幅加成；夜间突袭或提防夜袭稳稳占尽地利。",
   "代价": null,
   "晋阶": {
    "条件": "在伸手不见五指的绝境暗战中连斩强敌",
    "晋阶后名称": "暗夜行者",
    "晋阶后效果": "夜幕阴影宛若天然斗篷，暗处施展魂技动静大为收敛，连寻常照明器物都难以立刻照破主角藏身之处。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "黑夜遮众目，却为我点亮明灯。"
  },
  {
   "名称": "血气充盈",
   "品阶": "黄",
   "类别": "血脉",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "血脉气血炙热浑厚，抗寒抗邪且伤愈迅速",
   "效果": "体表血气旺盛如温炉，面对极寒环境、阴寒毒雾或噬血邪技抗性显著增强；吸收刚猛属性魂环或奇珍时，肉身更易顶住血气冲刷。",
   "代价": null,
   "晋阶": {
    "条件": "以强横气血硬扛一次寒毒或气血风暴而不损根基",
    "晋阶后名称": "气血如炉",
    "晋阶后效果": "气血自鸣如烘炉，大幅减免冰霜、死气与阴邪侵蚀，危急时可震散细碎控制，近战拳脚隐带炙热刚劲。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "病骨支离",
    "残躯早夭"
   ],
   "风味": "血暖如阳春，冰雪近身自消。"
  },
  {
   "名称": "逢赌必赢",
   "品阶": "黄",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "偏财手气极佳，抽签博弈险押常占上风",
   "效果": "抽签排赛、赌石淘矿、盲选魂灵或酒馆博弈时，总能避开下签高频抽中上选；险局放手一搏拼概率时，胜算往往偏向主角一侧（不破战力档差）。",
   "代价": null,
   "晋阶": {
    "条件": "凭胆识与手气在三场高风险赌局或盲选中满载而归",
    "晋阶后名称": null,
    "晋阶后效果": "越是紧要抽签、宝库盲选或绝境博弈越易中彩，每逢孤注一掷总能撞见意料之外的翻盘小机缘。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "霉运缠身",
    "散财童子"
   ],
   "风味": "骰落未停时，胜局已向我倾斜。"
  },
  {
   "名称": "名门风范",
   "品阶": "黄",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "举止贵气从容，初入权贵圈子便自得体面",
   "效果": "出入皇宫、大宗门议事厅、贵宾拍场或高层宴会时礼仪毫无破绽，守卫执事不易轻慢刁难；更易凭气度赢得上层人物初步尊重与体面席位。",
   "代价": null,
   "晋阶": {
    "条件": "于帝国皇室或联邦高层博弈中赢得一席话语权",
    "晋阶后名称": "王侯气度",
    "晋阶后效果": "不怒自威，寻常官员与中小宗主见之气短三分；出面调停争端或索要通行便利时，各方高层多愿给足面子。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "煞气外露",
    "众怒公敌"
   ],
   "风味": "衣冠虽朴素，眉宇自有山岳仪。"
  },
  {
   "名称": "兽语通心",
   "品阶": "白",
   "类别": "心性",
   "适用": [
    "魂兽"
   ],
   "简介": "辨懂百兽嘶鸣情绪，与异族交涉少生误会",
   "效果": "能听懂多数异族魂兽的粗浅嘶鸣与领地警告，穿行陌生兽域不易误踩界线平白开战；偶能从林间鸟兽口中听出附近人类魂师动向。",
   "代价": null,
   "晋阶": {
    "条件": "借兽语化解一场两族高阶魂兽的血腥争端",
    "晋阶后名称": "百兽通言",
    "晋阶后效果": "可与各类高阶万年魂兽顺畅通意，既能借林野飞禽走兽打探十里动静，谈判借道或交换灵果也容易许多。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "林深风动处，声声皆是有情言。"
  },
  {
   "名称": "神威敛尘",
   "品阶": "白",
   "类别": "心性",
   "适用": [
    "神祇"
   ],
   "简介": "收尽九天神仪，混迹市井毫不显山露水",
   "效果": "收敛神力扮作游侠、商贩或低阶魂师时眉目松弛自然，封号斗罗以下绝不会疑心主角来历；在凡间吃喝游历更易融入烟火市井。",
   "代价": null,
   "晋阶": {
    "条件": "隐匿神身份在凡间市井或学院安稳度过一整年",
    "晋阶后名称": "大隐于市",
    "晋阶后效果": "连封号斗罗与常规探测魂导器皆难辨身上神韵，可在不动声色间近距离旁观当世豪杰与幕后暗流。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "煞气外露",
    "众星捧月"
   ],
   "风味": "褪却金光坐茶肆，一碗粗茶看众生。"
  },
  {
   "名称": "厨艺绝佳",
   "品阶": "白",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "灶台手艺一绝，一顿好饭便能拉近人心",
   "效果": "寻常食材经主角烹调皆香气扑鼻，共进一餐极易拉近陌生人或队友距离；用魂兽肉与药膳烹制的佳肴能微幅加速饭后体力与魂力回复。",
   "代价": null,
   "晋阶": {
    "条件": "凭厨艺征服至少三位当世大人物味蕾并结善缘",
    "晋阶后名称": null,
    "晋阶后效果": "精研药膳食补，亲烹的魂兽大餐可令全队半日精力充沛、修炼微增，挑剔强者饭桌前也愿多吐露几句秘闻。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "世间难解千般事，不如先尝一勺鲜。"
  },
  {
   "名称": "酒量惊人",
   "品阶": "白",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "千杯不醉，酒桌最易套出豪客与守卫真言",
   "效果": "饮用烈酒极难醉倒失态，对昏睡迷药抗性微增；在酒馆、军营或庆功宴拼酒总能稳站到最后，趁对方微醺极易套出隐秘消息。",
   "代价": null,
   "晋阶": {
    "条件": "在酒桌上喝倒一名封号豪杰或套出一桩绝密情报",
    "晋阶后名称": null,
    "晋阶后效果": "寻常迷魂散与醉毒难倒主角，反可佯醉松懈强敌防备，酒桌结交豪侠与打探黑市密闻无往不利。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "杯底沉星月，众人皆醉我独醒。"
  },
  {
   "名称": "市井百晓",
   "品阶": "白",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "混迹茶楼巷陌如鱼得水，风声传闻总先入耳",
   "效果": "每到新城集镇，半日逛茶馆便可摸清当地黑市入口、明暗势力格局与奇闻；向市井百姓搭话打听消息时对方多乐意多说两句。",
   "代价": null,
   "晋阶": {
    "条件": "在三座以上大城建立起固定市井耳目渠道",
    "晋阶后名称": "三教九流",
    "晋阶后效果": "通缉动向、拍场压轴秘闻与豪门隐事总第一时间经商贩传入耳中，城中隐匿脱身亦熟门熟路。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "莫道茶馆多闲汉，半城机密在壶中。"
  },
  {
   "名称": "辨识矿石",
   "品阶": "白",
   "类别": "心性",
   "适用": [
    "人类魂师"
   ],
   "简介": "懂金石成色纹理，买铁淘矿不易看走眼",
   "效果": "审视矿石、铸铁与魂导器原料时能一眼辨出优劣与掺假，免被黑店坑骗；偶经矿谷或废铁杂摊，更容易瞥见夹杂其中的稀少奇金。",
   "代价": null,
   "晋阶": {
    "条件": "于乱石杂货中慧眼识出并淘得一块顶尖稀有金属",
    "晋阶后名称": "点铁识金",
    "晋阶后效果": "对千锻、灵锻金属内部杂纹一眼洞悉，采购锻材或验看兵器暗伤从不失手，顺手便能指点工匠补漏。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "尘土掩真金，独有明眼识寒光。"
  },
  {
   "名称": "早起精神",
   "品阶": "白",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "破晓醒来神清气爽，晨间修行格外专心",
   "效果": "每日黎明初醒绝不犯困，晨间一个时辰内精神分外澄澈集中，修习精神功法、练眼或体能晨训的成效比旁人多出一两成。",
   "代价": null,
   "晋阶": {
    "条件": "连续百日不辍晨练并凭此修成一门精进秘技",
    "晋阶后名称": null,
    "晋阶后效果": "每日破晓自动涤清前夜疲乏与郁气，晨间首战或闭关状态绝佳，精神力凝练稳步领先同辈。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "紫气东来第一刻，满身清朗胜闲人。"
  },
  {
   "名称": "路痴克星",
   "品阶": "白",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "方向感奇准，密林暗道走过一次便不忘",
   "效果": "走过的岔路、地下暗道或林间小径牢记于心，身处密林、极北风雪或复杂城寨不易迷途；撤退抄近道时总能选对方向。",
   "代价": null,
   "晋阶": {
    "条件": "凭精准方向感带队平安穿出一处凶险迷雾绝地",
    "晋阶后名称": "山河在胸",
    "晋阶后效果": "即便身陷幻阵或地貌生变的秘境，也能借天地微征辨明方位，追敌与规划长途行军极少偏差。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "纵使浓雾锁千山，心底自有指南针。"
  },
  {
   "名称": "面善无害",
   "品阶": "白",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "眉眼温和显憨厚，初见极易让人卸下防备",
   "效果": "城门盘查、初遇陌生魂师或孤身借宿时，对方多觉主角老实无害而放宽戒心；装傻旁听、暗中试探或扮猪吃虎格外顺手。",
   "代价": null,
   "晋阶": {
    "条件": "凭无害表象连瞒三次强敌探查并成功暗度陈仓",
    "晋阶后名称": "笑面藏锋",
    "晋阶后效果": "纵然身怀重宝或暗藏杀机，面上仍能维持云淡风轻的诚恳笑意，寻常强敌难从神色辨出真实深浅。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "煞气外露",
    "以杀证道"
   ],
   "风味": "笑眼弯弯似春风，谁知袖里藏寒锋。"
  },
  {
   "名称": "讨价还价",
   "品阶": "白",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "嘴甜善磨价，市集采买总能省币拿添头",
   "效果": "集市、药铺、杂货店购买日常补给或小件器物时，总能磨得掌柜抹零让利，顺手多饶些干粮、绷带或地方路图之类的添头。",
   "代价": null,
   "晋阶": {
    "条件": "凭嘴皮子于大型商会交易中砍下一笔惊人差价",
    "晋阶后名称": "商谈妙手",
    "晋阶后效果": "不止零星采买占尽便宜，商议委托酬劳、战利分成与宗门采购契约时也常能多争回两三成实利。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "散财童子"
   ],
   "风味": "掌柜莫摆手，再少两枚铜魂币咱就成交。"
  },
  {
   "名称": "笔墨传神",
   "品阶": "白",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "字迹清峻绘图工整，书信拜帖颇得体面",
   "效果": "绘制地形图、器物草图或书写拜帖求援信时条理分明、字态俊雅，大人物更愿抽空细阅；临摹仿造寻常文书路引亦难露马脚。",
   "代价": null,
   "晋阶": {
    "条件": "以一纸书信或战图促成两大势力结盟或停战",
    "晋阶后名称": "妙笔生花",
    "晋阶后效果": "信札字字诛心，隔空传书可打动隐世高人或挑动敌阵生疑；所绘战图与器物图纸精度极高，他人照图即懂。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "落纸云烟生，一信抵千言。"
  },
  {
   "名称": "耳聪目明",
   "品阶": "白",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "五感微敏，隔墙轻语与林间细响易入耳中",
   "效果": "静处可隐约听清隔壁包厢低语或百步外轻步声，寻觅暗格机关与遗落小物眼力略胜常人，夜间值守巡哨极少漏过异动。",
   "代价": null,
   "晋阶": {
    "条件": "靠灵敏五感提前听破一次密室阴谋或致命伏击",
    "晋阶后名称": "顺风灵耳",
    "晋阶后效果": "百丈内风吹草动、蓄力细响与低声密谋尽入耳底，即便视线受阻，也能听风辨位格挡多数暗器袭扰。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "墙角风声细，无心亦听真。"
  },
  {
   "名称": "皮糙肉厚",
   "品阶": "白",
   "类别": "体质",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "从小耐摔打，切磋擦撞多只留皮外青紫",
   "效果": "日常对练、高处跌落或受钝器擦伤时多止于皮外淤青，极少伤筋动骨；苦练体能耐得住痛楚，肌肉酸痛恢复比同辈快上不少。",
   "代价": null,
   "晋阶": {
    "条件": "承受百场高强度近身苦练而筋骨愈打愈韧",
    "晋阶后名称": "铜皮铁骨",
    "晋阶后效果": "抗击打能力步入上乘，近身硬拼能生吃寻常拳脚魂技而不失重心，借机贴身反制对手。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "病骨支离"
   ],
   "风味": "跌倒拍拍土，明日再战三百合。"
  },
  {
   "名称": "小财常临",
   "品阶": "白",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "常撞零碎小便宜，钱包总不至彻底空空",
   "效果": "赶路、打扫战场或随手解围后，常拾得散落金魂币、联邦币、小包伤药或他人回赠小物，日常住店吃饭从不发愁。",
   "代价": null,
   "晋阶": {
    "条件": "由零星小利积少成多攒出第一笔可观家业",
    "晋阶后名称": "财星高照",
    "晋阶后效果": "不经意间总遇酬金丰厚的顺路差事或无主遗匣，钱包总能及时补足燃眉开销。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "散财童子"
   ],
   "风味": "虽无金山砸头来，偏是囊中常有余。"
  },
  {
   "名称": "水性极佳",
   "品阶": "白",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "入水如鱼，渡江涉海闭气潜行胜过常人",
   "效果": "水中闭气远超同阶，游速轻快不易被暗流卷走，江河湖海与沼泽作战行动阻力大减，失足坠水几乎绝无呛溺之虞。",
   "代价": null,
   "晋阶": {
    "条件": "于风急浪高的大海或深潭激战力克水系对手",
    "晋阶后名称": null,
    "晋阶后效果": "深水高压与暗流难阻身形，水下搏杀不弱反增三分灵动，连海魂兽与水系魂师也难凭水域轻困主角。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "惊涛卷白雪，翻身戏碧波。"
  },
  {
   "名称": "血脉温顺",
   "品阶": "白",
   "类别": "血脉",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "血气魂力平和顺畅，极少与外力生排异",
   "效果": "修习温和功法、接受辅助魂技增幅或他人渡气疗伤时毫无滞涩，受辅助加成时效微增，平日练功几乎不会岔气走火。",
   "代价": null,
   "晋阶": {
    "条件": "于团战中圆满承受多人极限辅助灌注而不乱",
    "晋阶后名称": "百川纳海",
    "晋阶后效果": "经脉包容力大涨，所受同盟辅助与治疗效果额外提升约一成，炼化异属性奇珍亦更平稳顺遂。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "血脉排斥",
    "环噬之躯"
   ],
   "风味": "细水长流不惊澜，万川归海自安然。"
  },
  {
   "名称": "包扎利落",
   "品阶": "白",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "通晓外伤急救，危急时能先保伤员一口气",
   "效果": "处理刀创骨折手法麻利，战后能迅速为自己或同伴止血防感染，缺治疗系魂师时也可稳住伤势撑到寻医问药。",
   "代价": null,
   "晋阶": {
    "条件": "在绝境中凭外伤急救手艺救回三名濒危同伴",
    "晋阶后名称": "杏林巧手",
    "晋阶后效果": "急救手法融汇点脉止血诀窍，重伤垂危者经主角施救可稳住心脉半日不绝，亦能一眼瞧出对手旧伤暗疾。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [],
   "风味": "一卷白布半瓶药，常从鬼门拉回人。"
  },
  {
   "名称": "猫狗亲近",
   "品阶": "白",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "寻常鸟兽宠物见之欢喜，常能带路报些巧信",
   "效果": "城中猫狗、信鸽与林间无害小兽见了便喜凑近蹭手，偶会叼来遗落小物；附近藏有异样动静时，小动物反常焦躁常能歪打正着示警。",
   "代价": null,
   "晋阶": {
    "条件": "感化或驯养一只通灵奇兽成为忠心随行耳目",
    "晋阶后名称": "灵兽随行",
    "晋阶后效果": "林野飞鸟走兽乐于替主角衔信探路，荒野扎营极少遭毒虫猛兽夜袭，寻物查踪更添灵巧帮手。"
   },
   "化解": null,
   "死劫": null,
   "互斥": [
    "煞气外露",
    "以杀证道"
   ],
   "风味": "街角黄犬摇尾迎，枝头青鸟报平安。"
  },
  {
   "名称": "天煞孤星",
   "品阶": "厄",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "克亲克友克良缘，亲近之人接连横祸不断",
   "效果": "凡重要人物对主角情意高企或结为至亲、师徒、挚友，其近期必接连遭遇横祸重伤或仇敌牵连；压制时灾祸烈度减半、多止于惊险轻伤。",
   "代价": "亲近之人厄难接踵，极易生离死别或被迫远离，难以安稳维系温情与深厚同盟。",
   "晋阶": null,
   "化解": {
    "条件": "舍弃至珍之物替亲近之人硬抗必死大劫，或积大功德扭转孤命"
   },
   "死劫": null,
   "互斥": [
    "位面钟灵",
    "瑞兽临世",
    "天命归心",
    "桃花照命",
    "名师引路",
    "义薄云天"
   ],
   "风味": "孤星照寒夜，凡近身者皆沾霜。"
  },
  {
   "名称": "环噬之躯",
   "品阶": "厄",
   "类别": "体质",
   "适用": [
    "人类魂师"
   ],
   "简介": "每纳新环必生怨念反噬，修为愈高痛楚愈烈",
   "效果": "每吸收一环或融合新魂灵，必留一缕怨念长期反噬经脉，久战或情绪激荡时魂力骤乱刺痛难忍；压制时仅余隐痛、不至打断魂技。",
   "代价": "每增一环反噬加重一分，无法轻易越限吸环，高阶破境极易失控震伤自身筋脉。",
   "晋阶": null,
   "化解": {
    "条件": "寻得至纯仙草或神级奇珍重塑经脉，并熬过三日刮骨剥魂洗怨之痛"
   },
   "死劫": null,
   "互斥": [
    "万劫不磨",
    "越限承环",
    "血脉温顺"
   ],
   "风味": "环光愈盛，噬骨愈深。"
  },
  {
   "名称": "毒脉反噬",
   "品阶": "厄",
   "类别": "体质",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "剧毒倒灌肺腑，每逢阴雨子午钻心蚀骨",
   "效果": "每隔数日或逢阴雨严寒，体内积毒必反噬两肋与脏腑，发作时剧痛难抑、战力骤跌且须耗魂力死压；压制时发作拉长至月余、痛楚轻减。",
   "代价": "积毒日夜侵蚀气血与修为底蕴，激战中若恰逢毒发极易当场溃败受擒。",
   "晋阶": null,
   "化解": {
    "条件": "集齐相克仙草奇宝将剧毒尽数逼入魂骨，或耗损数年修为断腕排毒"
   },
   "死劫": null,
   "互斥": [
    "万劫不磨",
    "仙草圣体",
    "百毒不侵",
    "丹药良相"
   ],
   "风味": "每到阴风细雨夜，两肋如遭万蚁啃。"
  },
  {
   "名称": "众叛亲离",
   "品阶": "厄",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "天生招忌易遭背刺，难得大势力长久信任",
   "效果": "初入势力或与人结盟极易无故遭疑，微小错漏会被成倍放大；一旦露财或显虚弱，同僚盟友背刺出卖的几率大增；压制时仅剩冷淡戒备。",
   "代价": "势力声望举步维艰，难靠大宗门或帝国资源安稳发育，处处须防背后冷刀。",
   "晋阶": null,
   "化解": {
    "条件": "不计前嫌力挽狂澜救一方大势力免遭覆灭，以铁血实绩洗刷猜忌"
   },
   "死劫": null,
   "互斥": [
    "众念归宗",
    "天命归心",
    "名师引路",
    "巧舌如簧",
    "世家底蕴",
    "众星捧月",
    "香火常续",
    "长辈偏爱",
    "义薄云天"
   ],
   "风味": "笑面递杯人，转背便是拔刀客。"
  },
  {
   "名称": "位面厌弃",
   "品阶": "厄",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "天地魂力排斥此身，苦修极慢且易惹天威",
   "效果": "冥想时游离魂力极难汇聚，常规修炼进境较常人慢去四成，破境瓶颈厚重异常；险地机关与恶劣天象总优先针对主角；压制时阻滞减半。",
   "代价": "单靠静坐苦修远远跟不上时代脚步，唯有不断搏命夺取奇珍异宝方能勉强破局。",
   "晋阶": null,
   "化解": {
    "条件": "完成一桩惠及整片大陆或护持位面根基的大功，重得天地气数认可"
   },
   "死劫": null,
   "互斥": [
    "位面钟灵",
    "神考垂青",
    "元素亲和"
   ],
   "风味": "天地如此广阔，偏不肯多赐你一缕清风。"
  },
  {
   "名称": "兽血招狩",
   "品阶": "厄",
   "类别": "血脉",
   "适用": [
    "魂兽"
   ],
   "简介": "周身隐散极品魂骨异香，沦为天下魂师活靶",
   "效果": "无论深藏密林还是化形入城，周身隐溢令高阶魂师垂涎的珍稀血香，高频招致猎魂队、邪魂师与封号斗罗围猎；压制时异香仅限贴身可察。",
   "代价": "永无长久安宁之所，一旦行踪败露便是无休追杀，化形后极易被当场识破。",
   "晋阶": null,
   "化解": {
    "条件": "蜕皮换血或炼化绝世隐息仙草彻底洗去异香，并连斩追猎首恶立威"
   },
   "死劫": null,
   "互斥": [
    "瑞兽临世",
    "凶兽真身",
    "万兽共尊",
    "化形隐息"
   ],
   "风味": "怀璧犹可藏，偏是满身血香招群狼。"
  },
  {
   "名称": "神位生裂",
   "品阶": "厄",
   "类别": "命格",
   "适用": [
    "神祇"
   ],
   "简介": "神位暗藏旧伤裂隙，动用权柄即漏力反噬",
   "效果": "每次全力动用神位权柄或展开神级领域，暗裂便剧烈震荡、反噬神魂并倒泻大片神力；凡间香火吸纳减半；压制时不动神威则暂不漏力。",
   "代价": "绝不可肆意挥霍神力久战同阶，否则神阶战力持续滑坡、真身亦难长驻。",
   "晋阶": null,
   "化解": {
    "条件": "觅得创世级本源奇珍或聚百万信众纯念，闭关漫长岁月弥合神位暗裂"
   },
   "死劫": null,
   "互斥": [
    "众念归宗",
    "神降无碍",
    "权柄余韵",
    "神装自孕",
    "香火常续"
   ],
   "风味": "金座虽高，底处早已裂纹纵横。"
  },
  {
   "名称": "心魔噬魂",
   "品阶": "厄",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "识海暗蛰执念心魔，破境血战随时乱神",
   "效果": "每逢破十级瓶颈、遭逢背叛或血战杀红眼，心魔必在识海低语掀澜，令主角幻象丛生、魂技失控甚至误伤友军；压制时仅剩杂音不扰出手。",
   "代价": "精神防线藏致命裂口，极惧精神系与魅惑强敌，失守便恐铸成终身大错。",
   "晋阶": null,
   "化解": {
    "条件": "直面心底最深恐惧或悔恨，无人相助下于识海独战斩灭心魔真身"
   },
   "死劫": null,
   "互斥": [
    "逆命争锋",
    "灵台明镜",
    "领域先觉",
    "精神海阔",
    "逆境淬魂"
   ],
   "风味": "最难胜的强敌，日夜就坐在你识海深处。"
  },
  {
   "名称": "病骨支离",
   "品阶": "厄",
   "类别": "体质",
   "适用": [
    "通用"
   ],
   "简介": "气血亏虚体魄极脆，畏重击且忌久战强攻",
   "效果": "肉身耐受力极低，同阶一记重击便易震伤肺腑，吸环身体耐受上限远逊常人；高强度激战逾一炷香即气喘呕血；压制时日常无碍但仍畏重伤。",
   "代价": "容错低至谷底，绝不可与人以伤换伤，常规猎环与苦修进度俱受脆躯死锁。",
   "晋阶": null,
   "化解": {
    "条件": "以顶尖洗髓仙草配合高阶锻体秘法重铸筋骨，熬过脱胎换骨剧痛"
   },
   "死劫": null,
   "互斥": [
    "万劫不磨",
    "仙草圣体",
    "越限承环",
    "劫雷锻骨",
    "燃血焚躯",
    "天生神力",
    "锻体如钢",
    "疾风掠影",
    "体健如牛",
    "血气充盈",
    "皮糙肉厚"
   ],
   "风味": "一步三喘霜侵骨，偏要在修罗场里争活命。"
  },
  {
   "名称": "霉运缠身",
   "品阶": "厄",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "百事横生枝节，好事多磨险事必撞正着",
   "效果": "赶路常撞暴雨塌方或强盗封路，探秘多先踩机关陷阱，紧要关头器物偶失灵、援军晚到一步，常被迫接手棘手烂摊子；压制时仅余琐碎小倒霉。",
   "代价": "周密计划屡遭莫名变数搅黄，时间、魂力与资源大量耗在收拾横祸之上。",
   "晋阶": null,
   "化解": {
    "条件": "主动替他人承下一桩天大厄难而不悔，或得祥瑞奇兽赐福冲散晦气"
   },
   "死劫": null,
   "互斥": [
    "机缘天成",
    "鸿运齐天",
    "绝处逢生",
    "魂骨缘深",
    "灵药寻踪",
    "逢赌必赢"
   ],
   "风味": "饮水塞牙犹小事，抬脚踏空才算常。"
  },
  {
   "名称": "魂力漏斗",
   "品阶": "厄",
   "类别": "体质",
   "适用": [
    "人类魂师"
   ],
   "简介": "经脉蓄气不住，施技耗力暴增极易枯竭",
   "效果": "施展魂技、维系真身或开启领域时，魂力消耗较常人多出五成以上；平日不战亦有细微逸散致冥想事倍功半；压制时额外耗损降为两成。",
   "代价": "极度畏惧拉锯恶战与高耗魂技连发，稍有失算便陷魂力枯竭任人宰割。",
   "晋阶": null,
   "化解": {
    "条件": "凝成稳固魂核彻底锁死经脉漏口，或寻固本奇珍重铸丹田气海"
   },
   "死劫": null,
   "互斥": [
    "双核天成",
    "魂技精微"
   ],
   "风味": "十成苦修入丹田，出手先漏去半江。"
  },
  {
   "名称": "煞气外露",
   "品阶": "厄",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "眉宇透出凶煞之气，行至何处皆易惹大祸",
   "效果": "凡入城池、宗门或秘境，守卫、正道强者与凶悍魂兽皆会本能戒备甚至主动发难；地界若出凶案失窃，主角常第一时间被列首疑盘查；压制时凶势暂敛。",
   "代价": "几乎无法安稳低调潜修，细微口角便易演成至死方休的恶战，麻烦如影随形。",
   "晋阶": null,
   "化解": {
    "条件": "于清修之地敛锋守戒满百日不染血腥，或借至正光明重宝洗尽凶煞"
   },
   "死劫": null,
   "互斥": [
    "潜影无踪",
    "化形隐息",
    "神识洞微",
    "众星捧月",
    "借花献佛",
    "长辈偏爱",
    "魂兽亲和",
    "名门风范",
    "神威敛尘",
    "面善无害",
    "猫狗亲近"
   ],
   "风味": "刀尚未出鞘，满街目光已当你是恶徒。"
  },
  {
   "名称": "血脉排斥",
   "品阶": "厄",
   "类别": "血脉",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "体内血脉孤傲排外，难容异源魂环与辅助",
   "效果": "吸收属性微偏的魂环、魂骨或承受他人辅助增幅时，血脉剧烈抗拒致效用折半甚至气血倒冲；施展武魂融合技几近无望；压制时可勉强受常规疗伤。",
   "代价": "择环择骨苛刻十倍，团战难享辅助队友完整加成，几乎只能孤身硬撼强敌。",
   "晋阶": null,
   "化解": {
    "条件": "寻得一株调和阴阳百脉的绝世仙草，将体内暴烈孤血彻底炼化圆融"
   },
   "死劫": null,
   "互斥": [
    "武魂通玄",
    "凶兽真身",
    "血脉压制",
    "元素亲和",
    "血脉温顺"
   ],
   "风味": "此身血脉太孤高，天地外力俱难容。"
  },
  {
   "名称": "情劫噬心",
   "品阶": "厄",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "动情即召惨变，挚爱必成立场死敌或反目",
   "效果": "一旦主角动情或对方情意渐深，局势必生立场死敌、血仇误会或强权强拆；每逢情伤发作心神剧震、修为滞涩数日；压制时仅生疏离不至立时拔刀。",
   "代价": "每一缕温情都易化作穿心利刃，越是倾心托付越可能引爆难以挽回的剧变。",
   "晋阶": null,
   "化解": {
    "条件": "与命定情劫之人携手踏碎敌对死局并互托生死，或狠心斩尽此段红尘执念"
   },
   "死劫": null,
   "互斥": [
    "桃花照命"
   ],
   "风味": "偏是情深处，最易见刀光。"
  },
  {
   "名称": "散财童子",
   "品阶": "厄",
   "类别": "机缘",
   "适用": [
    "通用"
   ],
   "简介": "财不聚手，资财奇珍到手必逢横祸破耗",
   "效果": "每当钱包渐丰或入手值钱奇珍，短期内必遇急需重金救场、器物骤损、失窃或强权勒索等破财横事，绝难攒下巨资；压制时破耗数额减半。",
   "代价": "常年囊中羞涩，拍场竞宝、高阶锻造与采买极品资源处处受阻，难凭财力开道。",
   "晋阶": null,
   "化解": {
    "条件": "主动散尽一笔足以购置珍稀魂骨的巨资济世救民，以大舍破除散财之厄"
   },
   "死劫": null,
   "互斥": [
    "机缘天成",
    "器道神匠",
    "商海通神",
    "精打细算",
    "逢赌必赢",
    "讨价还价",
    "小财常临"
   ],
   "风味": "金魂币入袋还没捂热，债主与灾祸已叩门。"
  },
  {
   "名称": "残躯早夭",
   "品阶": "绝",
   "类别": "体质",
   "适用": [
    "人类魂师"
   ],
   "简介": "先天寿元断绝，二十四岁生辰气血枯竭",
   "效果": "生机先天残缺，平日修魂虽不锁死，但每增一岁便觉精血暗耗、寒热交迫；压制时枯竭暂缓，可推迟生辰绝命发作数月以博求药之机。",
   "代价": "生机持续倒流，重伤愈合极慢且忌惮燃血拼命，否则死劫将大幅提前临头。",
   "晋阶": null,
   "化解": {
    "条件": "在期限前炼化一株延寿补本的绝世仙草，或修至七环以武魂真身重塑生机"
   },
   "死劫": {
    "条件": "年满二十四岁生辰当日，残存生机彻底干涸、心脉骤绝而亡",
    "预警": [
     "偶感胸口闷塞，晨起指尖冰凉，似有沉疴暗伏心脉深处。",
     "面色渐泛病态惨白，运功过剧偶咳血丝，生辰渐近寒意彻骨。",
     "二十四岁生辰钟响之际，丹田魂力倒卷枯竭，心脉如游丝将断，唯余一息抢救生机。"
    ],
    "期限规则": {
     "类型": "年龄",
     "值": 24
    }
   },
   "互斥": [
    "万劫不磨",
    "绝处逢生",
    "燃血焚躯",
    "体健如牛",
    "血气充盈",
    "早慧早折"
   ],
   "风味": "弱冠未满已见霜，二十四载是生死关。"
  },
  {
   "名称": "早慧早折",
   "品阶": "绝",
   "类别": "命格",
   "适用": [
    "人类魂师"
   ],
   "简介": "锋芒过盛遭天忌，三十岁未登封号则魂海崩",
   "效果": "三十岁前偶得破境灵光，却以透支魂海本源为柴，每过一岁识海刺痛渐深；压制时识海震荡暂平，但大限逼近仍须如期登顶方免碎魂。",
   "代价": "逼迫主角日夜亡命狂修，稍有停滞便眼睁睁望见大限迫近，永无片刻安逸。",
   "晋阶": null,
   "化解": {
    "条件": "三十岁生辰前破入九十级封号稳固魂海，或自废半数修为散去过盛锋芒"
   },
   "死劫": {
    "条件": "年满三十岁生辰仍未踏入封号，透支殆尽的魂海轰然崩裂、神魂俱散",
    "预警": [
     "深夜冥想偶闻颅内细微碎裂异响，次日醒来额角隐隐抽痛。",
     "识海裂痕时隐时现，催动高阶魂技易引一阵剧烈眩晕与耳鸣。",
     "三十岁生辰子夜，魂海如瓷龟裂倾塌，狂暴魂力即将撑碎识海夺命。"
    ],
    "期限规则": {
     "类型": "年龄",
     "值": 30
    }
   },
   "互斥": [
    "大器晚成",
    "残躯早夭"
   ],
   "风味": "而立之年不成封号，便作苍穹一缕烟。"
  },
  {
   "名称": "宿敌索命",
   "品阶": "绝",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "命中招惹绝世大敌，三载期满遭必杀围猎",
   "效果": "开局即暗负一桩滔天血仇，一路频遭神秘暗哨试探与悬赏伏兵纠缠；压制时追踪线索暂断，可换得数月喘息备战与查明宿敌身份之机。",
   "代价": "常年活在强敌狙杀阴影下，行迹一旦败露便杀手不断，孤身远行凶险万分。",
   "晋阶": null,
   "化解": {
    "条件": "于劫期前查明宿敌根脚，正面反杀之或借绝顶势力威压迫其立誓销仇"
   },
   "死劫": {
    "条件": "开局满三年之时，实力远胜往昔的命定宿敌亲率绝杀大局围猎取命",
    "预警": [
     "暗中偶觉冰冷目光窥伺，黑市隐约流传针对主角的暗花悬赏。",
     "宿敌麾下精锐开始频频截杀试探，一封染血索命信已送至门前。",
     "三载劫期届满，宿敌亲身现身封死四面退路，必杀绝招直取主角首级。"
    ],
    "期限规则": {
     "类型": "开局后",
     "值": 1095
    }
   },
   "互斥": [
    "位面钟灵"
   ],
   "风味": "千里之外有人磨刀三载，只为等你走到面前。"
  },
  {
   "名称": "血债难偿",
   "品阶": "绝",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "身背宗门级旧日血债，两年期满遭死士绝杀",
   "效果": "出身或过往深陷灭门级血案因果，沿途屡撞苦主旧部与死士不计生死袭杀；压制时可借易容改名暂避耳目，但血债线索迟早再度咬死。",
   "代价": "名声与盟友屡遭旧案牵累，身边同袍可能因忌惮株连而临阵背弃。",
   "晋阶": null,
   "化解": {
    "条件": "奉上绝世重宝偿还血债并手刃真凶，或以铁血实力荡平追债同盟"
   },
   "死劫": {
    "条件": "开局满两年之日，多路死士携轰爆奇器或献祭禁术同归于尽袭杀主角",
    "预警": [
     "街头偶遇神色怨毒的陌生人盯梢，陈年血案流言开始在坊间蔓延。",
     "接连两拨死士自爆截杀，血仇同盟已锁定主角常驻落脚之城。",
     "两年劫期已至，数名死士隐于人群骤然引爆必杀绝阵，烈火杀机四面合围。"
    ],
    "期限规则": {
     "类型": "开局后",
     "值": 730
    }
   },
   "互斥": [
    "众星捧月"
   ],
   "风味": "旧血未冷，讨债人从来只要你的命。"
  },
  {
   "名称": "武魂崩解",
   "品阶": "绝",
   "类别": "血脉",
   "适用": [
    "人类魂师"
   ],
   "简介": "武魂本源暗藏死裂，冲破大关随时反噬爆体",
   "效果": "武魂核心潜伏失衡爆裂隐患，全力催动真身或越级死拼皆会加深暗纹；压制时可借秘宝暂稳裂隙，但每临大关冲击仍会剧烈震荡。",
   "代价": "修为愈逼近七十级或九十级大关，武魂失控风险愈高，差之毫厘即爆体身亡。",
   "晋阶": null,
   "化解": {
    "条件": "觅得高度契合武魂的绝世仙草、顶级魂骨或十万年魂环重塑武魂本源"
   },
   "死劫": {
    "条件": "冲击七十级武魂真身或九十级封号大关时，武魂本源彻底崩裂反噬爆体",
    "预警": [
     "释放武魂时虚影偶有细颤，魂力输出忽强忽弱似藏隐滞。",
     "武魂表层浮现细密裂纹，逼近大关瓶颈时经脉灼痛宛若刀割。",
     "冲击大关最后一息，武魂轰然剧震倒卷全部魂力，肉身即将炸裂崩解。"
    ],
    "期限规则": null
   },
   "互斥": [
    "万劫不磨",
    "武魂通玄"
   ],
   "风味": "你引为倚仗的利刃，正一寸寸裂向心口。"
  },
  {
   "名称": "天劫倍至",
   "品阶": "绝",
   "类别": "命格",
   "适用": [
    "魂兽"
   ],
   "简介": "魂兽大限提前且雷劫倍增，寻常渡劫必成飞灰",
   "效果": "修为临近十万年或下一重十万年大限时，天地杀意提前数年锁死周身、雷云不散；压制时可借避劫灵地拖延半年，却终难逃九霄劫雷。",
   "代价": "天劫威势达寻常魂兽两倍以上，若无逆天奇宝与强援护法，渡劫即等同赴死。",
   "晋阶": null,
   "化解": {
    "条件": "集齐极品避雷防御奇珍与海量生命本源，或在凶兽强援护法下硬渡九重劫雷"
   },
   "死劫": {
    "条件": "大限天劫临头，双倍威势的灭世雷霆连劈九重，欲将主角劈得形神俱灭",
    "预警": [
     "晴空无故响起沉闷雷鸣，体内修为年限偶生莫名躁动与窒息威压。",
     "栖身领地终日乌云压顶、紫电游走，周边魂兽惊恐逃离不敢近身。",
     "九霄劫云轰然合拢，灭世紫金劫雷撕裂天幕直劈天灵，唯留一线渡劫生路。"
    ],
    "期限规则": null
   },
   "互斥": [
    "瑞兽临世",
    "劫雷锻骨"
   ],
   "风味": "十万年一劫已九死，偏要为你再加一重天威。"
  },
  {
   "名称": "神陨天罚",
   "品阶": "绝",
   "类别": "命格",
   "适用": [
    "神祇"
   ],
   "简介": "触神界忌讳或遭位面强排，一年半内降灭神罚",
   "效果": "神位边缘缠绕漆黑罚印，每次超额催动神威皆招雷罚灼魂，神识常闻肃杀警钟；压制时罚印暂伏，期间绝不可肆意显露神阶伟力。",
   "代价": "行走下界处处受罚印掣肘，神阶优势大打折扣，逾矩或期满即召灭神血雷。",
   "晋阶": null,
   "化解": {
    "条件": "献祭一件神器替身受过、自削神阶保命，或立滔天功德消弭神位罚印"
   },
   "死劫": {
    "条件": "开局满五百四十日，神界裁决或位面反噬彻底爆发，碾碎神位抹杀神魂",
    "预警": [
     "神位深处浮现一丝暗黑裂印，偶有冰冷杀意自虚空极高处扫过。",
     "神力流转屡遭无形锁链拉扯，苍穹隐现裁决异象死死锁定真身。",
     "五百四十日劫期已满，虚空裂开降下灭神血雷，神位剧震即将彻底崩碎。"
    ],
    "期限规则": {
     "类型": "开局后",
     "值": 540
    }
   },
   "互斥": [
    "位面钟灵",
    "众念归宗",
    "神降无碍",
    "神考垂青",
    "权柄余韵"
   ],
   "风味": "莫道高踞神座无死期，天罚落下神亦成灰。"
  },
  {
   "名称": "邪念夺舍",
   "品阶": "绝",
   "类别": "心性",
   "适用": [
    "通用"
   ],
   "简介": "识海潜伏远古凶残残魂，一年期满强夺肉身",
   "效果": "识海暗角蛰伏一缕阴毒残魂，日夜窃吸主角溢散精神力，重伤昏迷或精神枯竭时便图谋抢夺身躯；压制时残魂暂封，仍伺机噬笼破出。",
   "代价": "绝不可轻易令精神力透支昏迷，且常被耳畔邪念低语诱惑走向偏激杀戮。",
   "晋阶": null,
   "化解": {
    "条件": "觅得至阳精神秘宝或请动顶尖精神强者布阵，于识海死斗彻底炼化残魂"
   },
   "死劫": {
    "条件": "开局满三百六十五日，残魂蓄满凶威全面反扑，欲吞噬神魂彻底夺舍",
    "预警": [
     "梦境频现陌生血腥记忆残片，醒来偶觉手脚片刻不听自己使唤。",
     "耳畔阴冷低语日夜不绝，重伤疲惫时眼底竟一闪而过诡异凶芒。",
     "一年劫期将满，残魂冲破识海壁垒化黑雾吞天，本我意识即将被彻底抹除。"
    ],
    "期限规则": {
     "类型": "开局后",
     "值": 365
    }
   },
   "互斥": [
    "灵台明镜",
    "精神海阔"
   ],
   "风味": "这具皮囊里，早已不止住着你一个灵魂。"
  },
  {
   "名称": "绝命死契",
   "品阶": "绝",
   "类别": "命格",
   "适用": [
    "人类魂师",
    "魂兽"
   ],
   "简介": "身缚古老违禁血契，逃避或违约即焚魂抹杀",
   "效果": "开局即与一桩绝险试炼、隐秘组织或古神残印缔结死契，凡企图逃避或违背禁约便遭血印灼心；压制时灼痛减轻，但绝无法私自撕契。",
   "代价": "行止深受死契枷锁捆绑，必须步步履约完成严苛目标，退缩逾期即触发绝杀。",
   "晋阶": null,
   "化解": {
    "条件": "九死一生完成死契终极试炼，或付沉重代价觅得秘法强行反噬毁契"
   },
   "死劫": {
    "条件": "违背死契铁律、企图潜逃或在终限未能交差，血契引爆焚尽魂力与神魂",
    "预警": [
     "胸口暗红契纹时隐时烫，宛若有一道冰冷视线昼夜盯紧一言一行。",
     "契纹蔓延至颈侧开始暗抽生机，警示严苛试炼与最后期限迫在眉睫。",
     "死契血光冲天引爆，血链贯穿经脉绞杀生机，唯有一搏破契或赴约方能活命。"
    ],
    "期限规则": null
   },
   "互斥": [
    "神考垂青"
   ],
   "风味": "签下血名字那一刻，命便攥在契约掌中。"
  },
  {
   "名称": "众怒公敌",
   "品阶": "绝",
   "类别": "命格",
   "适用": [
    "通用"
   ],
   "简介": "因果招祸举世皆敌，大势交汇遭正邪合围必杀",
   "效果": "无论本心善恶，凡遇遗迹争锋、邪案爆发或权争剧变，栽赃祸水必引向主角，各方强敌暗中串联欲除之而后快；压制时流言追缉暂缓。",
   "代价": "容身之地越缩越小、四面楚歌，稍露软弱破绽便会招来群雄联手分食。",
   "晋阶": null,
   "化解": {
    "条件": "当众揭穿幕后黑手并连斩围剿首恶立下血威，或彻底假死易容舍弃旧名"
   },
   "死劫": {
    "条件": "重大风云交汇之际，多方顶尖势力借大义之名布下绝杀围剿大阵取首级",
    "预警": [
     "坊间渐起抹黑主角的恶毒流言，原本中立的势力态度骤冷暗藏杀意。",
     "多方通缉令与高额悬赏贴满大城，四面眼线已开始封锁出城要道。",
     "风云突变之夜，正邪数位封号强敌齐至合围，绝杀大阵升空断绝一切退路。"
    ],
    "期限规则": null
   },
   "互斥": [
    "天命归心",
    "众星捧月",
    "名门风范"
   ],
   "风味": "天下皆言你该死，那便看谁的刀先断。"
  }
 ]
};

/* 气运词条摘要：由 源码/build.py 从 气运金手指/gemini交付/气运/词条库.json 摘出来，勿手改。
 * 变量里只存词条的效果、代价和各种条件；状态栏和正文要显示的简介、死劫三段预警（未显 / 将至 / 临头）按词条名在这里查。 */
const LUCK_NOTES = {
 "位面钟灵": {"简介":"天地垂青，险局自有位面气数暗护"},
 "瑞兽临世": {"简介":"祥瑞汇身，滋养百兽且引动气数接引"},
 "众念归宗": {"简介":"亿兆香火念力回流，稳固神位根基"},
 "万劫不磨": {"简介":"筋骨百炼不崩，承受极限反噬而不毁"},
 "机缘天成": {"简介":"险地必逢奇遇，先人一步截得秘藏"},
 "逆命争锋": {"简介":"战意压服绝境，越级死斗每能破限"},
 "鸿运齐天": {"简介":"绝路常转奇遇，择宝探秘总占先机"},
 "绝处逢生": {"简介":"死局必留生门，每部危机关头险死还生"},
 "天命归心": {"简介":"自带领袖气象，易揽当世豪杰与势力拥戴"},
 "武魂通玄": {"简介":"武魂深藏蜕变潜能，易引二次觉醒与共鸣"},
 "双核天成": {"简介":"魂力自成气旋，凝聚双魂核反噬大减"},
 "凶兽真身": {"简介":"体藏远古凶兽霸血，渡劫与化形皆具奇威"},
 "神降无碍": {"简介":"深谙下界秩序，行走凡尘少受位面排斥"},
 "神考垂青": {"简介":"气息契合古神残意，极易引动高阶神考"},
 "以战养道": {"简介":"越战越勇，在棋逢对手的血斗中迅猛破境"},
 "器道神匠": {"简介":"锻造暗器与魂导器一点即通，成器易生灵性"},
 "灵台明镜": {"简介":"识海澄澈如镜，诸般幻魅难侵且洞穿虚妄"},
 "仙草圣体": {"简介":"百草相亲，服食天材地宝药力尽化底蕴"},
 "越限承环": {"简介":"经脉坚韧超常，吸收魂环年限上限大增"},
 "魂骨缘深": {"简介":"猎魂探秘易遇奇骨，融合顺遂成长更快"},
 "领域先觉": {"简介":"洞悉领域韵律，早年可触领域门槛"},
 "血脉压制": {"简介":"体蕴上位血脉威压，震慑同源兽武魂与魂兽"},
 "大器晚成": {"简介":"前半程厚积薄发，跨入高阶后破境如潮"},
 "以杀证道": {"简介":"杀气凝而不散，百战血火淬炼冰冷杀意"},
 "桃花照命": {"简介":"风仪出众红尘缘深，易与当世俊杰结宿缘"},
 "万兽共尊": {"简介":"天生林野王者威仪，百兽听调不犯领地"},
 "劫雷锻骨": {"简介":"引天劫雷霆洗炼筋骨，化生死劫为大造化"},
 "权柄余韵": {"简介":"神位权柄留痕绵长，所立赐福与封印难散"},
 "神装自孕": {"简介":"神装神器与神识相融，受损自愈并渐生妙用"},
 "燃血焚躯": {"简介":"绝境主动焚血换力，短时爆发惊世战力"},
 "名师引路": {"简介":"贵人缘深，歧路常逢隐世高人倾囊指点"},
 "精神海阔": {"简介":"识海辽阔浑厚，承载魂灵与神识蜕变极快"},
 "机关算尽": {"简介":"城府谋略深沉，擅设暗局借势制衡群雄"},
 "商海通神": {"简介":"鉴宝生财无往不利，以雄厚财力撬动资源"},
 "借势化力": {"简介":"招式圆转如水，善卸蛮力并引敌招反噬"},
 "潜影无踪": {"简介":"敛息藏形天成，潜伏刺探与遁逃堪称一绝"},
 "化形隐息": {"简介":"化形重修兽气尽敛，难被封号斗罗一眼看破"},
 "兽域天成": {"简介":"身契原生山海地利，主场作战威势大增"},
 "神识洞微": {"简介":"神识凝丝隐蔽探查，不易触怒同阶强者"},
 "百毒不侵": {"简介":"经脉奇异，凡俗剧毒迷烟难以伤及肺腑"},
 "天生神力": {"简介":"筋骨沉雄，未动魂力亦有裂石崩山之伟力"},
 "魂技精微": {"简介":"魂技收放极细，省力增效且擅分心变化"},
 "锻体如钢": {"简介":"皮膜筋骨如玄铁，最擅硬抗重击与持久血战"},
 "器阵奇才": {"简介":"精通机括阵纹，研习暗器魂导与斗铠事半功倍"},
 "巧舌如簧": {"简介":"辞令锋锐圆融，谈判离间与脱身皆凭口才"},
 "临危不乱": {"简介":"崩山于前色不变，死局之中思绪反更清明"},
 "丹药良相": {"简介":"辨草知性，服药食补皆能祛杂增效"},
 "疾风掠影": {"简介":"身法灵动迅疾，抢占先机与万里奔袭出众"},
 "世家底蕴": {"简介":"承古族隐脉遗泽，通晓秘闻并留旧日暗线"},
 "灵眸洞察": {"简介":"目力清明敏锐，善观魂力轨迹与伪装破绽"},
 "元素亲和": {"简介":"深受天地元素眷顾，同属性攻防如鱼得水"},
 "众星捧月": {"简介":"风采耀眼亲和力佳，公开场合极易脱颖而出"},
 "借花献佛": {"简介":"善观强敌相争，混战之中总能巧手渔利"},
 "逆境淬魂": {"简介":"身处高压绝地越挫越勇，苦修效率反胜寻常"},
 "灵药寻踪": {"简介":"嗅觉灵通，密林深谷易觅奇花异草与灵泉"},
 "香火常续": {"简介":"下界留有残庙遗民，细微香火绵延不断"},
 "冥想静心": {"简介":"入定极快，闹市荒野皆可安稳修习魂力"},
 "刀头舔血": {"简介":"久惯江湖凶险，对杀意暗算嗅觉极为敏锐"},
 "精打细算": {"简介":"理财经商眼光独到，买卖筹资绝不吃暗亏"},
 "体健如牛": {"简介":"精力充沛耐力悠长，长途奔走久战难倦"},
 "长辈偏爱": {"简介":"懂礼合眼缘，在宗门学院极易得前辈关照"},
 "魂兽亲和": {"简介":"气息温和纯净，非暴戾魂兽不易主动敌视"},
 "手巧心细": {"简介":"十指极稳，锻造铭刻与修配精密器物少失误"},
 "顺藤摸瓜": {"简介":"查案追凶直觉敏锐，总能揪出隐秘蛛丝马迹"},
 "义薄云天": {"简介":"重诺守信，结交豪客战友多肯两肋插刀"},
 "兵法通晓": {"简介":"善察战局地形，带队团战与布阵游刃有余"},
 "百步穿杨": {"简介":"手眼配合奇准，远程魂技与暗器指哪打哪"},
 "火候老辣": {"简介":"临阵稳守底牌、善抓空隙，极少冒进犯错"},
 "夜瞳遗脉": {"简介":"双瞳含微弱夜行血韵，入夜暗战视听清明"},
 "血气充盈": {"简介":"血脉气血炙热浑厚，抗寒抗邪且伤愈迅速"},
 "逢赌必赢": {"简介":"偏财手气极佳，抽签博弈险押常占上风"},
 "名门风范": {"简介":"举止贵气从容，初入权贵圈子便自得体面"},
 "兽语通心": {"简介":"辨懂百兽嘶鸣情绪，与异族交涉少生误会"},
 "神威敛尘": {"简介":"收尽九天神仪，混迹市井毫不显山露水"},
 "厨艺绝佳": {"简介":"灶台手艺一绝，一顿好饭便能拉近人心"},
 "酒量惊人": {"简介":"千杯不醉，酒桌最易套出豪客与守卫真言"},
 "市井百晓": {"简介":"混迹茶楼巷陌如鱼得水，风声传闻总先入耳"},
 "辨识矿石": {"简介":"懂金石成色纹理，买铁淘矿不易看走眼"},
 "早起精神": {"简介":"破晓醒来神清气爽，晨间修行格外专心"},
 "路痴克星": {"简介":"方向感奇准，密林暗道走过一次便不忘"},
 "面善无害": {"简介":"眉眼温和显憨厚，初见极易让人卸下防备"},
 "讨价还价": {"简介":"嘴甜善磨价，市集采买总能省币拿添头"},
 "笔墨传神": {"简介":"字迹清峻绘图工整，书信拜帖颇得体面"},
 "耳聪目明": {"简介":"五感微敏，隔墙轻语与林间细响易入耳中"},
 "皮糙肉厚": {"简介":"从小耐摔打，切磋擦撞多只留皮外青紫"},
 "小财常临": {"简介":"常撞零碎小便宜，钱包总不至彻底空空"},
 "水性极佳": {"简介":"入水如鱼，渡江涉海闭气潜行胜过常人"},
 "血脉温顺": {"简介":"血气魂力平和顺畅，极少与外力生排异"},
 "包扎利落": {"简介":"通晓外伤急救，危急时能先保伤员一口气"},
 "猫狗亲近": {"简介":"寻常鸟兽宠物见之欢喜，常能带路报些巧信"},
 "天煞孤星": {"简介":"克亲克友克良缘，亲近之人接连横祸不断"},
 "环噬之躯": {"简介":"每纳新环必生怨念反噬，修为愈高痛楚愈烈"},
 "毒脉反噬": {"简介":"剧毒倒灌肺腑，每逢阴雨子午钻心蚀骨"},
 "众叛亲离": {"简介":"天生招忌易遭背刺，难得大势力长久信任"},
 "位面厌弃": {"简介":"天地魂力排斥此身，苦修极慢且易惹天威"},
 "兽血招狩": {"简介":"周身隐散极品魂骨异香，沦为天下魂师活靶"},
 "神位生裂": {"简介":"神位暗藏旧伤裂隙，动用权柄即漏力反噬"},
 "心魔噬魂": {"简介":"识海暗蛰执念心魔，破境血战随时乱神"},
 "病骨支离": {"简介":"气血亏虚体魄极脆，畏重击且忌久战强攻"},
 "霉运缠身": {"简介":"百事横生枝节，好事多磨险事必撞正着"},
 "魂力漏斗": {"简介":"经脉蓄气不住，施技耗力暴增极易枯竭"},
 "煞气外露": {"简介":"眉宇透出凶煞之气，行至何处皆易惹大祸"},
 "血脉排斥": {"简介":"体内血脉孤傲排外，难容异源魂环与辅助"},
 "情劫噬心": {"简介":"动情即召惨变，挚爱必成立场死敌或反目"},
 "散财童子": {"简介":"财不聚手，资财奇珍到手必逢横祸破耗"},
 "残躯早夭": {"简介":"先天寿元断绝，二十四岁生辰气血枯竭","预警":["偶感胸口闷塞，晨起指尖冰凉，似有沉疴暗伏心脉深处。","面色渐泛病态惨白，运功过剧偶咳血丝，生辰渐近寒意彻骨。","二十四岁生辰钟响之际，丹田魂力倒卷枯竭，心脉如游丝将断，唯余一息抢救生机。"]},
 "早慧早折": {"简介":"锋芒过盛遭天忌，三十岁未登封号则魂海崩","预警":["深夜冥想偶闻颅内细微碎裂异响，次日醒来额角隐隐抽痛。","识海裂痕时隐时现，催动高阶魂技易引一阵剧烈眩晕与耳鸣。","三十岁生辰子夜，魂海如瓷龟裂倾塌，狂暴魂力即将撑碎识海夺命。"]},
 "宿敌索命": {"简介":"命中招惹绝世大敌，三载期满遭必杀围猎","预警":["暗中偶觉冰冷目光窥伺，黑市隐约流传针对主角的暗花悬赏。","宿敌麾下精锐开始频频截杀试探，一封染血索命信已送至门前。","三载劫期届满，宿敌亲身现身封死四面退路，必杀绝招直取主角首级。"]},
 "血债难偿": {"简介":"身背宗门级旧日血债，两年期满遭死士绝杀","预警":["街头偶遇神色怨毒的陌生人盯梢，陈年血案流言开始在坊间蔓延。","接连两拨死士自爆截杀，血仇同盟已锁定主角常驻落脚之城。","两年劫期已至，数名死士隐于人群骤然引爆必杀绝阵，烈火杀机四面合围。"]},
 "武魂崩解": {"简介":"武魂本源暗藏死裂，冲破大关随时反噬爆体","预警":["释放武魂时虚影偶有细颤，魂力输出忽强忽弱似藏隐滞。","武魂表层浮现细密裂纹，逼近大关瓶颈时经脉灼痛宛若刀割。","冲击大关最后一息，武魂轰然剧震倒卷全部魂力，肉身即将炸裂崩解。"]},
 "天劫倍至": {"简介":"魂兽大限提前且雷劫倍增，寻常渡劫必成飞灰","预警":["晴空无故响起沉闷雷鸣，体内修为年限偶生莫名躁动与窒息威压。","栖身领地终日乌云压顶、紫电游走，周边魂兽惊恐逃离不敢近身。","九霄劫云轰然合拢，灭世紫金劫雷撕裂天幕直劈天灵，唯留一线渡劫生路。"]},
 "神陨天罚": {"简介":"触神界忌讳或遭位面强排，一年半内降灭神罚","预警":["神位深处浮现一丝暗黑裂印，偶有冰冷杀意自虚空极高处扫过。","神力流转屡遭无形锁链拉扯，苍穹隐现裁决异象死死锁定真身。","五百四十日劫期已满，虚空裂开降下灭神血雷，神位剧震即将彻底崩碎。"]},
 "邪念夺舍": {"简介":"识海潜伏远古凶残残魂，一年期满强夺肉身","预警":["梦境频现陌生血腥记忆残片，醒来偶觉手脚片刻不听自己使唤。","耳畔阴冷低语日夜不绝，重伤疲惫时眼底竟一闪而过诡异凶芒。","一年劫期将满，残魂冲破识海壁垒化黑雾吞天，本我意识即将被彻底抹除。"]},
 "绝命死契": {"简介":"身缚古老违禁血契，逃避或违约即焚魂抹杀","预警":["胸口暗红契纹时隐时烫，宛若有一道冰冷视线昼夜盯紧一言一行。","契纹蔓延至颈侧开始暗抽生机，警示严苛试炼与最后期限迫在眉睫。","死契血光冲天引爆，血链贯穿经脉绞杀生机，唯有一搏破契或赴约方能活命。"]},
 "众怒公敌": {"简介":"因果招祸举世皆敌，大势交汇遭正邪合围必杀","预警":["坊间渐起抹黑主角的恶毒流言，原本中立的势力态度骤冷暗藏杀意。","多方通缉令与高额悬赏贴满大城，四面眼线已开始封锁出城要道。","风云突变之夜，正邪数位封号强敌齐至合围，绝杀大阵升空断绝一切退路。"]}
};

/* 气运 · 共用规则（纯函数，不碰 DOM、不碰宿主）
 * 开局建档（选词条、听天由命、死劫期限、写进变量）和金手指（抽奖 / 签到换出词条）共用。
 * 依赖：共用/规则.js（fmtDate、splitKey、dayNo、keyOfDay、addDays）；词条库 LUCK_LIB 由调用方传入
 *      （构建时 共用/气运词条库.js 定义 const LUCK_LIB，和本文件拼在同一作用域）。
 * 规则出处：设计决定 §24.3；气运金手指/审查记录.md 第一段 A1、A3、Q5。
 * 词条对象照 Gemini 词条库的字段：名称 品阶 类别 适用 简介 效果 代价 晋阶 化解 死劫{条件,预警,期限规则} 互斥 风味。
 */

const LUCK_TIERS = Object.freeze(['彩', '金', '红', '紫', '黄', '白', '厄', '绝']);
const LUCK_POS_TIERS = Object.freeze(['彩', '金', '红', '紫', '黄', '白']);
const LUCK_TYPES = Object.freeze(['人类魂师', '魂兽', '神祇']);
const LUCK_CATS = Object.freeze(['命格', '体质', '血脉', '机缘', '心性']);
const LUCK_FITS = Object.freeze(['通用', '人类魂师', '魂兽', '神祇']);
const LUCK_WORKSHOP_VAR = '斗罗工坊气运';
const LUCK_WORKSHOP_LS = 'dl-workshop-luck:v1';
const LUCK_BUILTIN_PACK = '原版';
// 开局：正面基础 3 个名额；每背一个厄运 +1；厄运最多 3 个；开局彩最多 1、金最多 2
const LUCK_OPEN = Object.freeze({ 基础: 3, 厄运: 3, 彩: 1, 金: 2 });
// 听天由命抽正面时的品阶权重
const LUCK_WEIGHT = Object.freeze({ 彩: 1, 金: 3, 红: 6, 紫: 10, 黄: 12, 白: 12 });

const isLuckBad = (e) => !!e && (e.品阶 === '厄' || e.品阶 === '绝');
const luckFits = (e, type) => !!e && (e.适用.includes('通用') || e.适用.includes(type));
const luckTierRank = (t) => { const i = LUCK_TIERS.indexOf(t); return i < 0 ? LUCK_TIERS.length : i; };
const luckCharLen = (s) => [...String(s || '')].length;

function luckHostWin(win) {
  if (win && typeof win === 'object') return win;
  try {
    if (typeof window !== 'undefined') {
      if (window.parent && window.parent !== window && window.parent.document) return window.parent;
      return window;
    }
  } catch (_) {
    if (typeof window !== 'undefined') return window;
  }
  return null;
}

/** 校验单条工坊气运词条（契约 #11 §2）：严禁与原版重名，返回 { ok, item?, why? } */
function validateLuckItem(raw, builtinNames) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, why: '词条须为对象' };
  const name = typeof raw.名称 === 'string' ? raw.名称.trim() : '';
  const nLen = luckCharLen(name);
  if (!nLen || nLen > 8 || /[\s/]/u.test(name)) return { ok: false, why: '词条名称须为 1~8 字且不含空白或斜杠' };
  if (builtinNames && builtinNames.has(name)) return { ok: false, why: `词条「${name}」与原版词条重名` };

  const tier = typeof raw.品阶 === 'string' ? raw.品阶.trim() : '';
  if (!LUCK_TIERS.includes(tier)) return { ok: false, why: `「${name}」品阶无效：${tier}` };

  const cat = typeof raw.类别 === 'string' ? raw.类别.trim() : '';
  if (!LUCK_CATS.includes(cat)) return { ok: false, why: `「${name}」类别无效：${cat}` };

  if (!Array.isArray(raw.适用) || !raw.适用.length) return { ok: false, why: `「${name}」适用须为非空数组` };
  const fits = [];
  for (const x of raw.适用) {
    const s = typeof x === 'string' ? x.trim() : '';
    if (!LUCK_FITS.includes(s)) return { ok: false, why: `「${name}」适用项无效：${s}` };
    if (!fits.includes(s)) fits.push(s);
  }

  const brief = typeof raw.简介 === 'string' ? raw.简介.trim() : '';
  if (!brief || luckCharLen(brief) > 28) return { ok: false, why: `「${name}」简介须为 1~28 字` };

  const eff = typeof raw.效果 === 'string' ? raw.效果.trim() : '';
  if (!eff || luckCharLen(eff) > 80) return { ok: false, why: `「${name}」效果须为 1~80 字` };

  const bad = tier === '厄' || tier === '绝';
  let cost = null;
  if (raw.代价 != null && raw.代价 !== '') {
    if (typeof raw.代价 !== 'string') return { ok: false, why: `「${name}」代价须为字符串或 null` };
    const c = raw.代价.trim();
    if (!c || luckCharLen(c) > 60) return { ok: false, why: `「${name}」代价须为 1~60 字` };
    cost = c;
  }
  if (bad && !cost) return { ok: false, why: `「${name}」为厄/绝品阶，代价必填` };

  let promo = null;
  if (raw.晋阶 != null) {
    if (bad || tier === '彩') return { ok: false, why: `「${name}」（${tier}阶）晋阶须为 null` };
    if (typeof raw.晋阶 !== 'object' || Array.isArray(raw.晋阶)) return { ok: false, why: `「${name}」晋阶须为对象或 null` };
    const cond = typeof raw.晋阶.条件 === 'string' ? raw.晋阶.条件.trim() : '';
    const nextEff = typeof raw.晋阶.晋阶后效果 === 'string' ? raw.晋阶.晋阶后效果.trim() : '';
    let nextName = null;
    if (raw.晋阶.晋阶后名称 != null && raw.晋阶.晋阶后名称 !== '') {
      if (typeof raw.晋阶.晋阶后名称 !== 'string') return { ok: false, why: `「${name}」晋阶后名称须为字符串或 null` };
      nextName = raw.晋阶.晋阶后名称.trim();
      if (!nextName || luckCharLen(nextName) > 8 || /[\s/]/u.test(nextName)) return { ok: false, why: `「${name}」晋阶后名称须为 1~8 字` };
    }
    if (!cond || luckCharLen(cond) > 40) return { ok: false, why: `「${name}」晋阶条件须为 1~40 字` };
    if (!nextEff || luckCharLen(nextEff) > 80) return { ok: false, why: `「${name}」晋阶后效果须为 1~80 字` };
    promo = { 条件: cond, 晋阶后名称: nextName, 晋阶后效果: nextEff };
  }

  let resolve = null;
  if (bad) {
    if (!raw.化解 || typeof raw.化解 !== 'object' || Array.isArray(raw.化解)) return { ok: false, why: `「${name}」化解条件必填` };
    const cond = typeof raw.化解.条件 === 'string' ? raw.化解.条件.trim() : '';
    if (!cond || luckCharLen(cond) > 40) return { ok: false, why: `「${name}」化解条件须为 1~40 字` };
    resolve = { 条件: cond };
  } else if (raw.化解 != null) {
    return { ok: false, why: `「${name}」正面词条化解须为 null` };
  }

  let doom = null;
  if (tier === '绝') {
    if (!raw.死劫 || typeof raw.死劫 !== 'object' || Array.isArray(raw.死劫)) return { ok: false, why: `「${name}」绝阶死劫必填` };
    const cond = typeof raw.死劫.条件 === 'string' ? raw.死劫.条件.trim() : '';
    if (!cond || luckCharLen(cond) > 40) return { ok: false, why: `「${name}」死劫条件须为 1~40 字` };
    if (!Array.isArray(raw.死劫.预警) || raw.死劫.预警.length !== 3) return { ok: false, why: `「${name}」死劫预警须为 3 段文本` };
    const warns = [];
    for (const w of raw.死劫.预警) {
      const ws = typeof w === 'string' ? w.trim() : '';
      if (!ws || luckCharLen(ws) > 40) return { ok: false, why: `「${name}」死劫预警每段须为 1~40 字` };
      warns.push(ws);
    }
    let rule = null;
    if (raw.死劫.期限规则 != null) {
      const rr = raw.死劫.期限规则;
      if (typeof rr !== 'object' || Array.isArray(rr)) return { ok: false, why: `「${name}」死劫期限规则须为对象或 null` };
      if (rr.类型 !== '年龄' && rr.类型 !== '开局后') return { ok: false, why: `「${name}」死劫期限规则类型无效` };
      const val = Number(rr.值);
      if (!Number.isInteger(val) || val <= 0) return { ok: false, why: `「${name}」死劫期限规则值须为正整数` };
      rule = { 类型: rr.类型, 值: val };
    }
    doom = { 条件: cond, 预警: warns, 期限规则: rule };
  } else if (raw.死劫 != null) {
    return { ok: false, why: `「${name}」非绝阶死劫须为 null` };
  }

  const clash = [];
  if (raw.互斥 != null) {
    if (!Array.isArray(raw.互斥) || raw.互斥.length > 8) return { ok: false, why: `「${name}」互斥须为不超过 8 项的数组` };
    for (const x of raw.互斥) {
      const s = typeof x === 'string' ? x.trim() : '';
      if (!s || luckCharLen(s) > 8) return { ok: false, why: `「${name}」互斥项须为 1~8 字` };
      if (s !== name && !clash.includes(s)) clash.push(s);
    }
  }

  let flavor = '';
  if (raw.风味 != null && raw.风味 !== '') {
    if (typeof raw.风味 !== 'string') return { ok: false, why: `「${name}」风味须为字符串` };
    flavor = raw.风味.trim();
    if (luckCharLen(flavor) > 40) return { ok: false, why: `「${name}」风味不超过 40 字` };
  }

  const item = {
    名称: name, 品阶: tier, 类别: cat, 适用: fits, 简介: brief, 效果: eff, 代价: cost,
    晋阶: promo, 化解: resolve, 死劫: doom, 互斥: clash,
  };
  if (flavor) item.风味 = flavor;
  return { ok: true, item };
}

/** 校验一个工坊气运词条包：{ key?, 包名, 词条: [...] } */
function validateLuckPack(raw, builtinNames) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, why: '气运包须为对象', errors: ['气运包须为对象'] };
  const packName = [...String(raw.包名 || raw.作品名 || raw.key || '').trim()].slice(0, 24).join('');
  if (!packName || packName === LUCK_BUILTIN_PACK || packName === '全部') {
    return { ok: false, why: '包名无效或与保留名冲突', errors: ['包名无效或与保留名冲突'] };
  }
  if (!Array.isArray(raw.词条) || !raw.词条.length) {
    return { ok: false, why: `「${packName}」词条列表为空`, errors: [`「${packName}」词条列表为空`] };
  }
  const items = [], errors = [], seen = new Set();
  for (const it of raw.词条) {
    const r = validateLuckItem(it, builtinNames);
    if (!r.ok) { errors.push(r.why); continue; }
    if (seen.has(r.item.名称)) { errors.push(`「${r.item.名称}」在包内重复`); continue; }
    seen.add(r.item.名称);
    items.push(r.item);
  }
  if (!items.length) return { ok: false, why: errors[0] || `「${packName}」没有有效词条`, errors };
  return {
    ok: true,
    pack: {
      key: String(raw.key || packName).trim(),
      包名: packName,
      词条: items,
      作品: raw.作品 || null,
      作品名: raw.作品名 || packName,
      版本: raw.版本 || 1,
      角色: raw.角色 ? String(raw.角色).trim() : '',
    },
    errors,
  };
}

function luckCurrentCharCandidates(win) {
  const W = luckHostWin(win);
  const out = new Set();
  const add = (v) => { if (v != null && String(v).trim()) out.add(String(v).trim()); };
  try { if (typeof getCurrentCharacterName === 'function') add(getCurrentCharacterName()); } catch (_) { /* ignore */ }
  try { if (W && typeof W.getCurrentCharacterName === 'function') add(W.getCurrentCharacterName()); } catch (_) { /* ignore */ }
  try {
    const c = W && W.SillyTavern && typeof W.SillyTavern.getContext === 'function' ? W.SillyTavern.getContext() : null;
    if (c) {
      add(c.name2);
      if (c.characterId != null) {
        add(c.characterId);
        const ch = Array.isArray(c.characters) ? c.characters[c.characterId] : null;
        if (ch) { add(ch.name); add(ch.avatar); }
      }
    }
  } catch (_) { /* ignore */ }
  return out;
}

/** 读取宿主全局变量“斗罗工坊气运”（localStorage 兜底）+ DLExt 注册的气运包，并按角色过滤 */
function readWorkshopLuckRows(win) {
  const W = luckHostWin(win);
  let rows = null;
  const tryGet = (fn) => {
    if (typeof fn !== 'function') return null;
    try {
      const v = fn({ type: 'global' });
      return v && Array.isArray(v[LUCK_WORKSHOP_VAR]) ? v[LUCK_WORKSHOP_VAR] : null;
    } catch (_) { return null; }
  };
  rows = tryGet(typeof getVariables === 'function' ? getVariables : null)
    || tryGet(W && W.getVariables)
    || (W && W.Mvu && typeof W.Mvu.getMvuData === 'function' ? (() => {
      try { const v = W.Mvu.getMvuData({ type: 'global' }); return v && Array.isArray(v[LUCK_WORKSHOP_VAR]) ? v[LUCK_WORKSHOP_VAR] : null; } catch (_) { return null; }
    })() : null);

  if ((!rows || !rows.length) && W && W.localStorage) {
    try {
      const raw = W.localStorage.getItem(LUCK_WORKSHOP_LS);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) rows = parsed;
      else if (parsed && Array.isArray(parsed.packs)) rows = parsed.packs;
    } catch (_) { /* ignore */ }
  }

  const list = Array.isArray(rows) ? rows.slice() : [];
  const extLuck = W && W.__DL_EXT__ && W.__DL_EXT__.luck;
  if (extLuck && typeof extLuck.values === 'function') {
    for (const rec of extLuck.values()) {
      if (rec && !rec.destroyed && rec.pack) list.push(rec.pack);
    }
  }

  const chars = luckCurrentCharCandidates(W);
  return list.filter((r) => {
    if (!r || typeof r !== 'object') return false;
    const role = r.角色 != null ? String(r.角色).trim() : '';
    if (role && chars.size && !chars.has(role)) return false;
    return true;
  });
}

/** 把工坊气运包合并到原版词条库（不改动原版 LUCK_LIB 对象；原版 115 条永不被覆盖） */
function mergeWorkshopLuck(baseLib, rawRows, baseNotes) {
  const baseItems = (baseLib && Array.isArray(baseLib.词条)) ? baseLib.词条 : [];
  const builtinNames = new Set(baseItems.map((e) => e.名称));
  const notes = Object.assign({}, baseNotes || {});
  for (const e of baseItems) {
    if (!notes[e.名称]) {
      notes[e.名称] = e.死劫 ? { 简介: e.简介, 预警: e.死劫.预警 } : { 简介: e.简介 };
    }
  }
  const rows = Array.isArray(rawRows) ? rawRows : [];
  if (!rows.length) {
    return {
      lib: baseLib,
      notes,
      packs: [{ key: LUCK_BUILTIN_PACK, 包名: LUCK_BUILTIN_PACK, count: baseItems.length, builtin: true }],
      packOf: new Map(baseItems.map((e) => [e.名称, LUCK_BUILTIN_PACK])),
      errors: [],
    };
  }

  const taken = new Set(builtinNames);
  const packOf = new Map(baseItems.map((e) => [e.名称, LUCK_BUILTIN_PACK]));
  const merged = baseItems.slice();
  const packs = [{ key: LUCK_BUILTIN_PACK, 包名: LUCK_BUILTIN_PACK, count: baseItems.length, builtin: true }];
  const packIndex = new Map();
  const errors = [];

  for (const raw of rows) {
    const v = validateLuckPack(raw, builtinNames);
    if (!v.ok) { errors.push(...v.errors); continue; }
    if (v.errors.length) errors.push(...v.errors);
    const pName = v.pack.包名;
    let added = 0;
    for (const it of v.pack.词条) {
      if (taken.has(it.名称)) { errors.push(`「${it.名称}」与其他词条包重名，已跳过`); continue; }
      taken.add(it.名称);
      const copy = { ...it };
      Object.defineProperty(copy, '_pack', { value: pName, enumerable: false });
      merged.push(copy);
      packOf.set(it.名称, pName);
      notes[it.名称] = it.死劫 ? { 简介: it.简介, 预警: it.死劫.预警, 包名: pName } : { 简介: it.简介, 包名: pName };
      added += 1;
    }
    if (added > 0) {
      if (packIndex.has(pName)) {
        packs[packIndex.get(pName)].count += added;
      } else {
        packIndex.set(pName, packs.length);
        packs.push({ key: v.pack.key || pName, 包名: pName, count: added, builtin: false });
      }
    }
  }

  if (merged.length === baseItems.length) {
    return { lib: baseLib, notes, packs, packOf, errors };
  }
  const lib = { ...baseLib, 词条: merged };
  Object.defineProperty(lib, '_packOf', { value: packOf, enumerable: false });
  Object.defineProperty(lib, '_packs', { value: packs, enumerable: false });
  return { lib, notes, packs, packOf, errors };
}

function luckPackOf(lib, name) {
  if (lib && lib._packOf && typeof lib._packOf.get === 'function') return lib._packOf.get(name) || LUCK_BUILTIN_PACK;
  return LUCK_BUILTIN_PACK;
}

function getLuckPacks(baseLib, win) {
  const lib = getLuckLib(baseLib, win);
  if (lib && Array.isArray(lib._packs)) return lib._packs;
  const n = lib && Array.isArray(lib.词条) ? lib.词条.length : 0;
  return [{ key: LUCK_BUILTIN_PACK, 包名: LUCK_BUILTIN_PACK, count: n, builtin: true }];
}

function getLuckLib(baseLib, win) {
  const W = luckHostWin(win);
  if (!baseLib) {
    return W && W.__DL_LUCK__ && typeof W.__DL_LUCK__.lib === 'function' ? W.__DL_LUCK__.lib() : null;
  }
  if (W && W.__DL_LUCK__ && W.__DL_LUCK__._base === baseLib && typeof W.__DL_LUCK__.lib === 'function') {
    return W.__DL_LUCK__.lib();
  }
  const rows = readWorkshopLuckRows(W);
  if (!rows.length) return baseLib;
  return mergeWorkshopLuck(baseLib, rows).lib;
}

function getLuckNotes(baseNotes, win) {
  const W = luckHostWin(win);
  if (W && W.__DL_LUCK__ && typeof W.__DL_LUCK__.notes === 'function') {
    return Object.assign({}, baseNotes || {}, W.__DL_LUCK__.notes());
  }
  return baseNotes || {};
}

/** 在主窗口挂载 __DL_LUCK__ 与 DLLuckRebuild()，监听 dl-workshop-changed 自动重算并派发 dl-luck-changed */
function installLuckRuntime(win, baseLib, baseNotes) {
  const W = luckHostWin(win);
  if (!W || !baseLib) return null;
  if (W.__DL_LUCK__ && typeof W.__DL_LUCK__.detach === 'function') {
    try { W.__DL_LUCK__.detach(); } catch (_) { /* ignore */ }
  }
  let state = mergeWorkshopLuck(baseLib, readWorkshopLuckRows(W), baseNotes);
  function rebuild(opts) {
    state = mergeWorkshopLuck(baseLib, readWorkshopLuckRows(W), baseNotes);
    if (!opts || opts.emit !== false) {
      try {
        const Ev = W.CustomEvent || W.Event;
        if (typeof W.dispatchEvent === 'function' && typeof Ev === 'function') {
          W.dispatchEvent(new Ev('dl-luck-changed'));
        }
      } catch (_) { /* ignore */ }
    }
    return state.lib;
  }
  const onWs = () => rebuild({ emit: true });
  try { if (typeof W.addEventListener === 'function') W.addEventListener('dl-workshop-changed', onWs); } catch (_) { /* ignore */ }
  const api = {
    _base: baseLib,
    rebuild,
    lib: () => state.lib,
    notes: () => state.notes,
    packs: () => state.packs,
    packOf: (name) => state.packOf.get(name) || LUCK_BUILTIN_PACK,
    errors: () => state.errors.slice(),
    validateItem: validateLuckItem,
    validatePack: validateLuckPack,
    detach() {
      try { if (typeof W.removeEventListener === 'function') W.removeEventListener('dl-workshop-changed', onWs); } catch (_) { /* ignore */ }
    },
  };
  W.__DL_LUCK__ = api;
  W.DLLuckRebuild = rebuild;
  return api;
}

const LUCK_MAPS = new WeakMap();
/** 名称 → 词条 */
function luckIndex(lib) {
  let m = LUCK_MAPS.get(lib);
  if (!m) { m = new Map(lib.词条.map((e) => [e.名称, e])); LUCK_MAPS.set(lib, m); }
  return m;
}

/** 已选词条的计数：pos 正面、neg 厄运、各品阶、cap 正面名额 */
function luckCounts(lib, names) {
  const by = luckIndex(lib);
  const c = { pos: 0, neg: 0, 彩: 0, 金: 0, 红: 0, 紫: 0, 黄: 0, 白: 0, 厄: 0, 绝: 0 };
  for (const n of names) {
    const e = by.get(n);
    if (!e) continue;
    if (isLuckBad(e)) c.neg += 1; else c.pos += 1;
    c[e.品阶] += 1;
  }
  c.cap = LUCK_OPEN.基础 + Math.min(c.neg, LUCK_OPEN.厄运);
  return c;
}

/** 和已选里哪一条互斥（双向查）；没有返回 null */
function luckClash(lib, names, e) {
  const by = luckIndex(lib);
  return names.find((n) => n !== e.名称 && ((e.互斥 || []).includes(n) || ((by.get(n) || {}).互斥 || []).includes(e.名称))) || null;
}

/** 年龄型死劫（审查 A1）：年龄不明，或已到 N−1 岁，开局就会应验——这条不给选。返回原因或 null */
function luckAgeBlock(e, age) {
  const rule = e && e.死劫 && e.死劫.期限规则;
  if (!rule || rule.类型 !== '年龄') return null;
  if (age == null || !Number.isFinite(age)) return `这条的死劫按年龄算，先在“身份”里填年龄`;
  if (age >= rule.值 - 1) return `主角已经 ${age} 岁，离 ${rule.值} 岁的死劫太近，开局就会应验`;
  return null;
}

/** 点一下这条能不能选 / 放下。ctx = { type: 主角类型, age: 年龄|null }。返回 { ok, why, remove } */
function luckCheck(lib, names, name, ctx) {
  const e = luckIndex(lib).get(name);
  if (!e) return { ok: false, why: '词条库里没有这一条' };
  if (names.includes(name)) {
    if (isLuckBad(e)) {
      const c = luckCounts(lib, names);
      if (c.pos > c.cap - 1) return { ok: false, why: `放下它会少一个名额：先放下一个正面词条（现在 ${c.pos}/${c.cap}）` };
    }
    return { ok: true, remove: true };
  }
  if (!luckFits(e, ctx.type)) return { ok: false, why: `这条只给${e.适用.join('、')}` };
  const age = luckAgeBlock(e, ctx.age);
  if (age) return { ok: false, why: age };
  const cl = luckClash(lib, names, e);
  if (cl) return { ok: false, why: `和「${cl}」互斥` };
  const c = luckCounts(lib, names);
  if (isLuckBad(e)) return c.neg >= LUCK_OPEN.厄运 ? { ok: false, why: `厄运词条最多 ${LUCK_OPEN.厄运} 个` } : { ok: true };
  if (c.pos >= c.cap) return { ok: false, why: c.neg < LUCK_OPEN.厄运 ? `正面名额满了（${c.pos}/${c.cap}）。再背一个厄运词条，就能多一个名额` : `正面名额满了（${c.pos}/${c.cap}）` };
  if (e.品阶 === '彩' && c.彩 >= LUCK_OPEN.彩) return { ok: false, why: `彩阶开局最多 ${LUCK_OPEN.彩} 个` };
  if (e.品阶 === '金' && c.金 >= LUCK_OPEN.金) return { ok: false, why: `金阶开局最多 ${LUCK_OPEN.金} 个` };
  return { ok: true };
}

/** 选上或放下；返回 { ok, why?, names: 新数组, added, entry } —— 不改传入的数组 */
function luckToggle(lib, names, name, ctx) {
  const r = luckCheck(lib, names, name, ctx);
  if (!r.ok) return { ok: false, why: r.why, names: names.slice() };
  const next = r.remove ? names.filter((n) => n !== name) : names.concat(name);
  return { ok: true, names: next, added: !r.remove, entry: luckIndex(lib).get(name) };
}

/** 听天由命（审查 Q5）：按主角类型过滤 → 勾了就先抽 1–2 个厄运 → 正面按品阶权重抽满名额；
 *  每一抽都过 luckCheck（互斥、彩 1 金 2、年龄型死劫）。rand 可传种子随机，测试用 */
function luckRandom(lib, ctx, withNeg, rand = Math.random, packFilter = null) {
  let names = [];
  const allowPack = typeof packFilter === 'function'
    ? packFilter
    : (packFilter && typeof packFilter.has === 'function')
      ? (e) => packFilter.has(luckPackOf(lib, e.名称))
      : Array.isArray(packFilter)
        ? (e) => packFilter.includes(luckPackOf(lib, e.名称))
        : null;
  const pool = lib.词条.filter((e) => luckFits(e, ctx.type) && (!allowPack || allowPack(e)));
  const okNow = (e) => !names.includes(e.名称) && luckCheck(lib, names, e.名称, ctx).ok;
  if (withNeg) {
    const k = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < k; i++) {
      const cand = pool.filter((e) => isLuckBad(e) && okNow(e));
      if (!cand.length) break;
      names = names.concat(cand[Math.floor(rand() * cand.length)].名称);
    }
  }
  for (let guard = 0; guard < 40; guard++) {
    const c = luckCounts(lib, names);
    if (c.pos >= c.cap) break;
    const cand = pool.filter((e) => !isLuckBad(e) && okNow(e));
    if (!cand.length) break;
    const tot = cand.reduce((s, e) => s + LUCK_WEIGHT[e.品阶], 0);
    let r = rand() * tot;
    const e = cand.find((x) => (r -= LUCK_WEIGHT[x.品阶]) <= 0) || cand[cand.length - 1];
    names = names.concat(e.名称);
  }
  return names;
}

/** 落笔前整体核对（换了主角类型、改了年龄、读旧存档以后都可能不合规）。返回问题列表（字符串） */
function luckIssues(lib, names, ctx) {
  const by = luckIndex(lib), out = [];
  const seen = new Set();
  for (const n of names) {
    if (seen.has(n)) { out.push(`「${n}」选了两次`); continue; }
    seen.add(n);
    const e = by.get(n);
    if (!e) { out.push(`「${n}」不在词条库里了，放下它`); continue; }
    if (!luckFits(e, ctx.type)) out.push(`「${n}」只给${e.适用.join('、')}，和现在的主角类型（${ctx.type}）不合，放下它`);
    const age = luckAgeBlock(e, ctx.age);
    if (age) out.push(`「${n}」：${age}`);
  }
  const known = [...seen].filter((n) => by.has(n));
  for (let i = 0; i < known.length; i++) {
    for (let j = i + 1; j < known.length; j++) {
      const a = by.get(known[i]), b = by.get(known[j]);
      if ((a.互斥 || []).includes(b.名称) || (b.互斥 || []).includes(a.名称)) out.push(`「${a.名称}」和「${b.名称}」互斥，放下一个`);
    }
  }
  const c = luckCounts(lib, known);
  if (c.neg > LUCK_OPEN.厄运) out.push(`厄运词条最多 ${LUCK_OPEN.厄运} 个（现在 ${c.neg} 个）`);
  if (c.pos > c.cap) out.push(`正面词条超出名额（${c.pos}/${c.cap}）`);
  if (c.彩 > LUCK_OPEN.彩) out.push(`彩阶开局最多 ${LUCK_OPEN.彩} 个`);
  if (c.金 > LUCK_OPEN.金) out.push(`金阶开局最多 ${LUCK_OPEN.金} 个`);
  return out;
}

/** 绝的死劫期限：年龄型 = 开局日 + (N − 年龄) 年（审查 A1）；开局后型 = 开局日 + N 天；没有期限规则返回 null。
 *  startKey 是日期键（规则.js 的 年*10000+月*100+日）；返回“斗罗历…年…月…日” */
function luckDeadline(e, startKey, age) {
  const rule = e && e.死劫 && e.死劫.期限规则;
  if (!rule || startKey == null) return null;
  if (rule.类型 === '开局后') return fmtDate(addDays(startKey, rule.值));
  if (rule.类型 === '年龄') {
    if (age == null || !Number.isFinite(age) || age >= rule.值) return null;
    let k = startKey + (rule.值 - age) * 10000;
    if (keyOfDay(dayNo(k)) !== k) k -= 1; // 平年没有 2 月 29 日，落到 28 日
    return fmtDate(k);
  }
  return null;
}

/** 词条库里的一条 → 变量里的一条（来源“开局”）。倒计时交给 ZOD 算 */
function luckEntry(e, startKey, age) {
  const bad = isLuckBad(e);
  return {
    品阶: e.品阶, 类别: e.类别, 效果: e.效果, 代价: e.代价 || null, 状态: '生效',
    晋阶: !bad && e.品阶 !== '彩' && e.晋阶 ? { 条件: e.晋阶.条件, 进度: '', 晋阶后名称: e.晋阶.晋阶后名称 || null, 晋阶后效果: e.晋阶.晋阶后效果 } : null,
    化解: bad && e.化解 ? { 条件: e.化解.条件 } : null,
    死劫: e.品阶 === '绝' && e.死劫 ? { 条件: e.死劫.条件, 劫兆: '未显', 期限: luckDeadline(e, startKey, age) } : null,
    来源: '开局', 获得日期: startKey == null ? null : fmtDate(startKey),
  };
}

/** 开局写进 /主角/气运 的整块：词条按品阶排（彩→白→厄→绝），名称是键 */
function luckBlock(lib, names, startKey, age) {
  const by = luckIndex(lib);
  const list = [...new Set(names)].map((n) => by.get(n)).filter(Boolean)
    .map((e, i) => [e, i]).sort((a, b) => luckTierRank(a[0].品阶) - luckTierRank(b[0].品阶) || a[1] - b[1]).map(([e]) => e);
  return { 词条: Object.fromEntries(list.map((e) => [e.名称, luckEntry(e, startKey, age)])), 结局: null };
}

/* 叙事核心 · 外挂变量结构的共用部分（纯函数，不碰宿主；ADR 0008）
 * 每个核心脚本用 mvu_zod 的 registerMvuSchema 登记一份自己的结构，只管 stat_data.叙事核心。斗罗ZOD 一个字不改。
 *
 * mvu_zod 处理一条命令的办法：拿当前变量的副本套上命令 → 过结构 → 结果里的键和当前变量比，有变化才“认领”这条命令并合并（{...当前, ...结果}），
 * 删除类命令则看被删的路径在结果里还在不在。没人认领的命令最后被丢掉。几份结构按注册先后轮流处理同一批命令。
 *
 * 所以这里的结构输出 = 当前变量（命令套上之前那份）＋ 解析过的 叙事核心：
 *   - 主线命令（改主角、删人物……）在输出里看不出变化，被删的路径也还在，不会被认领，留给斗罗ZOD；和谁先注册无关
 *   - 叙事核心.核心 不是本核心时整份原样交回，什么都不认领：别的核心、无核心的聊天都不受影响
 *   - 斗罗ZOD 的结构是 z.object(...).transform(...)，会去掉它不认识的 叙事核心，所以 叙事核心 的命令它也不认领
 * “当前变量”由入口在 mvu_zod 处理器前后紧挨着登记的监听器提供（live()）。拿不到时（变量管理器调用、监听器意外没跑）只输出 叙事核心 那一块：
 *   这时主线的删除命令可能被本结构认领（效果同样是删掉，只是斗罗ZOD 这一条不重算派生字段），但绝不会把主线的改动原样认领走。
 */
const isPlainObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

/** 登记给 registerMvuSchema 的整份结构。coreSchema 是本核心 叙事核心 那一块的 zod 结构 */
function coreRootSchema(z, core, coreSchema, live) {
  return z.any().transform((input) => {
    let now = null;
    try { now = live(); } catch (_) { now = null; }
    const base = isPlainObj(now) ? now : {};
    const c = isPlainObj(input) && isPlainObj(input.叙事核心) ? input.叙事核心 : null;
    if (!c || c.核心 !== core) return { ...base };
    // 这条命令没碰 叙事核心：原样交回，不认领。否则当前的 叙事核心 还没整理过时（旧存档少了后来加的字段、手改过变量），
    // 解析结果和它不一样，会把核心脚本先登记时轮到的主线命令也认领走，主线命令就丢了
    if (isPlainObj(now) && JSON.stringify(c) === JSON.stringify(now.叙事核心)) return { ...base };
    const r = coreSchema.safeParse(c);
    // 解析不了（结构自己有 catch，正常到不了这里）就当这条命令没发生
    return r.success ? { ...base, 叙事核心: r.data } : { ...base };
  });
}

/** 一轮变量更新结束后的把关：核心不能被改走、删掉；结局写下后不能撤；本核心的那一块再整理一遍（补默认值、去掉数组里的空洞）。
 *  返回 null 表示不用动；否则返回 { value: 新的 叙事核心, note: 说明 } */
function guardCore(core, coreSchema, after, before) {
  const was = isPlainObj(before) && isPlainObj(before.叙事核心) && before.叙事核心.核心 === core;
  const cur = isPlainObj(after) && isPlainObj(after.叙事核心) ? after.叙事核心 : null;
  const is = !!cur && cur.核心 === core;
  if (was && !is) return { value: JSON.parse(JSON.stringify(before.叙事核心)), note: cur ? `叙事核心.核心 被改成“${cur.核心}”，已撤回` : '叙事核心 被删掉，已撤回' };
  if (!is) return null;
  let clean = dropHoles(cur);
  const endedBefore = was && isEnded(before.叙事核心.结局);
  if (endedBefore && !isEnded(clean.结局)) clean = { ...clean, 结局: JSON.parse(JSON.stringify(before.叙事核心.结局)) };
  const r = coreSchema.safeParse(clean);
  if (!r.success) return was ? { value: JSON.parse(JSON.stringify(before.叙事核心)), note: '叙事核心 写坏了，已撤回到这一轮之前' } : null;
  return JSON.stringify(r.data) === JSON.stringify(cur) ? null : { value: r.data, note: '' };
}

const isEnded = (x) => isPlainObj(x) && x.已终结 === true;

// ───────── 核心结构的小零件（zod 4）─────────
// 和斗罗ZOD 同一个原则：AI 写错类型时退回默认值，不让整轮更新失败；派生字段（档位等）AI 写了也会被重算。
const TIER = (table, v) => (table.find(([lo]) => v >= lo) || table[table.length - 1])[1]; // table 按下限从高到低排
/** 外界日期“斗罗历32648年08月01日”→ 326480801；认不出返回 null（斗罗历前的年份为负） */
function coreDateKey(text) {
  const m = String(text || '').replace(/\s/gu, '').replace(/^斗罗历/u, '').match(/^(前)?(\d+)年(\d{1,2})月(\d{1,2})日/u);
  return m ? (m[1] ? -1 : 1) * (Number(m[2]) * 10000 + Number(m[3]) * 100 + Number(m[4])) : null;
}
/** 主角原作身份去掉括号注释和空白，便于对照名单 */
const coreWho = (hero) => String((hero && hero.原作身份) || '').replace(/[（(][^）)]*[）)]/gu, '').replace(/\s/gu, '');
/** 时代先后（斗3 与英雄传同期，算同一代）：跨部折算只在往后走时做，免得来回切换时反复折算 */
const CORE_ERA = Object.freeze({ 斗1: 1, 斗2: 2, 神界: 3, 斗3: 4, 英雄: 4, 斗4: 5 });

function coreKit(z) {
  const pre = (fn, s) => z.preprocess(fn, s);
  const clampN = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const toNum = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(/[^\d.+-]/gu, '')) : NaN);
  /** 整数，越界夹到 [lo, hi]，认不出用默认值 */
  const int = (def, lo = 0, hi = 100) => pre((v) => { const n = toNum(v); return Number.isFinite(n) ? clampN(Math.round(n), lo, hi) : def; }, z.number());
  /** 字符串；max 给出时按字截断；空串退回默认值 */
  const str = (def = '', max = 0) => pre((v) => {
    if (v == null || typeof v === 'object') return def;
    const s = String(v).trim();
    if (!s) return def;
    return max && [...s].length > max ? [...s].slice(0, max).join('') : s;
  }, z.string()).catch(def);
  const pick = (list, def) => pre((v) => (v == null || v === '' ? def : String(v).trim()), z.enum(list)).catch(def);
  /** 定长列表：只留对象项，超出上限保留最新的 max 条；写成 {键: 项} 也认 */
  const list = (shape, max) => pre((v) => {
    const a = Array.isArray(v) ? v : isPlainObj(v) ? Object.values(v) : [];
    return a.filter(isPlainObj).slice(-max);
  }, z.array(z.object(shape)));
  /** 派生字段占位：先置空，finish 里重算（占位是为了固定键的先后） */
  const derived = () => pre(() => null, z.any());
  /** 结局：平时 null；写成对象且有死因（或明写 已终结: true）才算数 */
  const ending = () => pre((v) => {
    if (!isPlainObj(v)) return null;
    const said = v.已终结 === true || v.已终结 === 'true';
    return said || (v.死因 != null && String(v.死因).trim()) ? { ...v, 已终结: true } : null;
  }, z.object({ 已终结: z.literal(true), 死因: str(), 下手: str(), 日期: str() }).nullable()).catch(null);
  /** 本核心那一块：核心 固定，其余按 shape；finish 算派生字段 */
  const block = (core, shape, finish) => pre((v) => (isPlainObj(v) ? v : {}), z.object({ 核心: z.literal(core).catch(core), ...shape })).transform(finish);
  return { int, str, pick, list, derived, ending, block };
}

/** 删除命令被别的结构认领时，lodash 的 unset 会在数组里留下空洞；整理前先去掉 */
function dropHoles(x) {
  if (Array.isArray(x)) return x.filter((v) => v !== undefined && v !== null).map(dropHoles);
  if (isPlainObj(x)) { const o = {}; for (const [k, v] of Object.entries(x)) if (v !== undefined) o[k] = dropHoles(v); return o; }
  return x;
}

/* 叙事核心 · 主页面代码的共用部分
 * 页面文件都只定义工厂函数，样稿页（样稿/叙事核心样稿.html）能直接用 <script> 加载同一份代码：
 *   DLC_SHARED(CORE, INFO) → 共用工具；DLC_PAGE_<核心>(CORE, INFO, U) → { css, blocks, bar, apply? }
 * build.py 把 本文件 + 页面/<核心>.js 拼起来，末尾加一句 return DLC_PAGE_<核心>(CORE, INFO, DLC_SHARED(CORE, INFO))，
 * 整段由核心脚本在主页面里用 new Function('CORE', 'INFO', 代码) 执行：函数都属于主页面，核心脚本的 iframe 关掉以后正文和状态栏照样能调。
 *   blocks 登记进 window.__DL_PROSE_BLOCKS__：{ 标签: { render(段, 工具) } }。段 = { tag, inner, closed }；
 *          工具有 h / sv（建节点）、sub(文字)（把块里的正文照常画成节点）、env（env.stat 是这一层的变量）、playAt()（入场动画已播几秒，不该播为 null）。
 *          块的外层由正文容器带 data-dlp-motion（full / reduced / off）和 data-dlp-surface（浅色聊天背景时为 light）。
 *   bar    登记进 window.__DL_BAR_EXT__：{ tab, when(数据), page(数据, 工具), dock(数据, 工具), iconPath }；工具里 motion 为 full / reduced / off。
 *   apply(最新变量 | null, 主页面 document)：可选，随最新变量改主页面上的全局状态；撤下时传 null。
 */
function DLC_SHARED(CORE, INFO) {
  const coreOf = (st) => (st && st.叙事核心 && typeof st.叙事核心 === 'object' ? st.叙事核心 : null);
  const mine = (st) => { const c = coreOf(st); return !!c && c.核心 === CORE; };
  const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
  const tierOf = (table, v) => { for (let i = 0; i < table.length; i += 1) if (v >= table[i][0]) return { i: table.length - 1 - i, name: table[i][1] }; return { i: 0, name: table[table.length - 1][1] }; };

  /** 块里的内容拆成三样：开头的“键｜值”抬头行、行内小标签（<对策>…</对策> 这类，按名字收集）、剩下的正文 */
  const META = /^[ \t]*(视角|来源|主角|台词|死因|下手|所斩|类型|代价|所得|神祇|发布者|场面|内容|期限|奖励|惩罚|状态|赏赐|落点|人物|表面|图谋|筹码|利弊|姿态|主谋|目标|面具|对象|标题|本源|违和|判定|代号|职能)[ \t]*[｜|][ \t]*(.*)$/u;
  function parseBlock(inner, inlineTags) {
    const meta = {}, tags = {};
    let text = String(inner == null ? '' : inner);
    for (const t of inlineTags || []) {
      tags[t] = [];
      text = text.replace(new RegExp(`<${t}>([\\s\\S]*?)(?:</${t}>|$)`, 'gu'), (_, x) => { tags[t].push(x.trim()); return ''; });
    }
    const lines = text.replace(/^\n+/u, '').split('\n');
    while (lines.length) {
      const m = META.exec(lines[0]);
      if (!m) { if (!lines[0].trim()) { lines.shift(); continue; } break; }
      if (!(m[1] in meta)) meta[m[1]] = m[2].trim();
      lines.shift();
    }
    return { meta, tags, body: lines.join('\n').trim() };
  }
  /** 入场动画：正文给了“已播几秒”就带 data-play 和负的延迟，重画时接着播，不从头再来 */
  function play(kit) {
    const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null;
    return t == null ? {} : { 'data-play': true, style: { '--dlc-t': `-${t.toFixed(2)}s` } };
  }
  const part = (st) => (st && st.时空 && st.时空.当前部) || null;
  const date = (st) => String((st && st.时空 && st.时空.外界日期) || '').replace(/^斗罗历/u, '');
  /** 结局块的通用拆法 */
  const endingOf = (inner) => parseBlock(inner, []);
  /** 只认结局对象里真写下的 */
  const ended = (c) => !!(c && c.结局 && c.结局.已终结 === true);

  return { CORE, INFO, coreOf, mine, num, clamp, list, tierOf, parseBlock, play, part, date, endingOf, ended };
}

/* 结局锁（设计决定 §22、§24.3）：结局写下以后，这个聊天不再推进。
 * 几个脚本各管自己的结局、共用页面上同一把锁：七个叙事核心脚本看 叙事核心.结局，斗罗楼层看气运死劫的 主角.气运.结局。
 * 每个脚本按最新一层变量登记或撤下自己这一份（锁主），还有一份在就锁着，全撤下才解锁。
 * 锁着时：藏起发送、继续、重新生成、代写和最后一层的右滑，输入框只读；
 *   Enter / Ctrl+Enter / Alt+Enter 和这些按钮的点击在捕获阶段拦下（酒馆的“重新生成”会先删掉最后一层再生成，生成开始后才拦就晚了）；
 *   兜底：真有一次主聊天生成漏进来，生成前（GENERATION_AFTER_COMMANDS）用酒馆的 stopGeneration 停掉。
 * 想重来只能删掉结局那一层；删了以后最新一层不再是结局，自动解锁。
 * html 上的 data-dlc-ended 写最早登记、仍在的那一份的名字（核心名，或“气运”）。
 * 用法：const lock = createEndingLock(主页面 window, 锁主名, 提示用的脚本名)；lock.set(结局 | null)；lock.attach(listen) 接上按键、点击、生成兜底；lock.detach()。 */
const LOCK_ATTR = 'data-dlc-ended';
const LOCK_BTNS = ['#send_but', '#mes_continue', '#mes_impersonate', '#option_regenerate', '#option_continue', '#option_impersonate', '#chat .last_mes .swipe_right'];
const LOCK_TIP = '此局已终。要重来，先删掉结局那一层。';
const LOCK_STYLE = 'dl-end-lock';

function createEndingLock(W, owner, label) {
  const D = W.document;
  let mine = null; // 锁着时是 { 死因 }
  const table = () => {
    const m = W.__DL_END_LOCK__;
    if (m && typeof m.get === 'function' && typeof m.set === 'function') return m;
    return (W.__DL_END_LOCK__ = new W.Map());
  };
  const ctx = () => { try { return W.SillyTavern && W.SillyTavern.getContext ? W.SillyTavern.getContext() : null; } catch (_) { return null; } };

  // 页面跟着锁主表走：有锁主就锁（属性写最早那一份），一个都没有就复原
  function paint() {
    const m = table(), root = D.documentElement, ta = D.getElementById('send_textarea');
    const first = m.size ? m.keys().next().value : null;
    if (first) {
      if (root.getAttribute(LOCK_ATTR) !== first) root.setAttribute(LOCK_ATTR, first);
      let st = D.getElementById(LOCK_STYLE);
      if (!st) { st = D.createElement('style'); st.id = LOCK_STYLE; D.head.appendChild(st); }
      const css = `html[${LOCK_ATTR}] :is(${LOCK_BTNS.join(',')}){display:none !important}`;
      if (st.textContent !== css) st.textContent = css;
      if (ta && !('dlcPlaceholder' in ta.dataset)) { ta.dataset.dlcPlaceholder = ta.placeholder || ''; ta.placeholder = LOCK_TIP; ta.readOnly = true; }
      return;
    }
    root.removeAttribute(LOCK_ATTR);
    const st = D.getElementById(LOCK_STYLE);
    if (st) st.remove();
    if (ta && 'dlcPlaceholder' in ta.dataset) { ta.placeholder = ta.dataset.dlcPlaceholder; delete ta.dataset.dlcPlaceholder; ta.readOnly = false; }
  }
  function set(ending) {
    const m = table();
    if (ending) { mine = { 死因: ending.死因 || '' }; m.set(owner, mine); }
    else { mine = null; m.delete(owner); }
    paint();
  }
  function note() {
    try {
      const why = mine && mine.死因 ? `（${String(mine.死因).slice(0, 40)}）` : '';
      if (W.toastr && W.toastr.warning) W.toastr.warning(`这一局已经结束${why}，聊天不再往下推进。要重来，先删掉结局那一层。`, label, { preventDuplicates: true, timeOut: 6000 });
    } catch (_) { /* 没有 toastr */ }
  }
  function blockKeys(e) {
    if (!mine || e.key !== 'Enter' || e.isComposing) return;
    const ta = D.getElementById('send_textarea');
    if (e.ctrlKey && D.querySelector('#chat .mes_edit_done, #chat .mes_reasoning_edit_done')) {
      const btn = D.querySelector('#chat .mes_edit_done, #chat .mes_reasoning_edit_done');
      if (btn && btn.offsetParent) return; // 正在改某一层：Ctrl+Enter 是确认修改，放行
    }
    if (e.ctrlKey || e.altKey || (D.activeElement === ta && !e.shiftKey)) { e.preventDefault(); e.stopImmediatePropagation(); note(); }
  }
  function blockClicks(e) {
    if (!mine || !e.target || !e.target.closest) return;
    if (e.target.closest(LOCK_BTNS.join(','))) { e.preventDefault(); e.stopImmediatePropagation(); note(); }
  }
  // 生成前兜底：isEnded() 现查最新一层（锁表可能还没跟上刚发生的变化）
  const stopper = (isEnded) => (type, _opt, dry) => {
    if (dry || type === 'quiet' || !isEnded()) return;
    try { const c = ctx(); if (c && typeof c.stopGeneration === 'function') c.stopGeneration(); } catch (e) { console.warn(`[${label}] 停不下这次生成`, e); }
    note();
  };
  let attached = false;
  // listen(事件名, 处理函数)：调用方自己的监听（随脚本收走）；isEnded 给生成兜底用
  function attach(listen, isEnded) {
    listen((window.tavern_events || W.tavern_events || {}).GENERATION_AFTER_COMMANDS || 'GENERATION_AFTER_COMMANDS', stopper(isEnded));
    W.addEventListener('keydown', blockKeys, true);
    D.addEventListener('click', blockClicks, true);
    attached = true;
  }
  function detach() {
    if (attached) { W.removeEventListener('keydown', blockKeys, true); D.removeEventListener('click', blockClicks, true); attached = false; }
    try { set(null); } catch (_) { /* 主页面已关 */ }
  }
  return { set, attach, detach, locked: () => !!mine };
}

/* 金手指 · 外挂变量结构的共用部分（纯函数，不碰宿主；ADR 0008）
 * 每个金手指脚本用 mvu_zod 的 registerMvuSchema 登记一份自己的结构，只管 stat_data.金手指。斗罗ZOD 一个字不改。
 * 原理与 源码/叙事核心/结构.js 完全相同：
 *   - 输出 = 当前变量（命令套上之前那份）＋ 解析过的 金手指
 *   - 金手指.类型 不是本金手指时原样交回，什么都不认领；主线命令、叙事核心命令都不受影响
 *   - 仅在命令确实改了 金手指 时认领，不抢占斗罗ZOD 或叙事核心的命令
 */
const gfIsPlainObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

/** 登记给 registerMvuSchema 的整份结构。gfSchema 是本金手指 stat_data.金手指 的 zod 结构 */
function gfRootSchema(z, gfType, gfSchema, live) {
  return z.any().transform((input) => {
    let now = null;
    try { now = live(); } catch (_) { now = null; }
    const base = gfIsPlainObj(now) ? now : {};
    const g = gfIsPlainObj(input) && gfIsPlainObj(input.金手指) ? input.金手指 : null;
    if (!g || g.类型 !== gfType) return { ...base };
    if (gfIsPlainObj(now) && JSON.stringify(g) === JSON.stringify(now.金手指)) return { ...base };
    const r = gfSchema.safeParse(g);
    return r.success ? { ...base, 金手指: r.data } : { ...base };
  });
}

/** 一轮变量更新结束后的把关：类型不能被改走或删掉；本金手指那一块再整理一遍。
 *  返回 null 表示不用动；否则返回 { value: 新的 金手指, note: 说明 } */
function guardGf(gfType, gfSchema, after, before) {
  const was = gfIsPlainObj(before) && gfIsPlainObj(before.金手指) && before.金手指.类型 === gfType;
  const cur = gfIsPlainObj(after) && gfIsPlainObj(after.金手指) ? after.金手指 : null;
  const is = !!cur && cur.类型 === gfType;
  if (was && !is) {
    return {
      value: JSON.parse(JSON.stringify(before.金手指)),
      note: cur ? `金手指.类型 被改成“${cur.类型}”，已撤回` : '金手指 被删掉，已撤回',
    };
  }
  if (!is) return null;
  const clean = gfDropHoles(cur);
  const r = gfSchema.safeParse(clean);
  if (!r.success) return was ? { value: JSON.parse(JSON.stringify(before.金手指)), note: '金手指 写坏了，已撤回到这一轮之前' } : null;
  return JSON.stringify(r.data) === JSON.stringify(cur) ? null : { value: r.data, note: '' };
}

/** 删除命令被别的结构认领时，lodash 的 unset 会在数组里留下空洞；整理前先去掉 */
function gfDropHoles(x) {
  if (Array.isArray(x)) return x.filter((v) => v !== undefined && v !== null).map(gfDropHoles);
  if (gfIsPlainObj(x)) {
    const o = {};
    for (const [k, v] of Object.entries(x)) if (v !== undefined) o[k] = gfDropHoles(v);
    return o;
  }
  return x;
}

/** 金手指结构的小零件（zod 4） */
function gfKit(z) {
  const pre = (fn, s) => z.preprocess(fn, s);
  const clampN = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const toNum = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(/[^\d.+-]/gu, '')) : NaN);
  const clipStr = (s, max) => (max && [...s].length > max ? [...s].slice(0, max).join('') : s);
  const int = (def, lo = 0, hi = 99999) => pre((v) => {
    const n = toNum(v);
    return Number.isFinite(n) ? clampN(Math.round(n), lo, hi) : def;
  }, z.number());
  const num = (def, lo = 0, hi = 100, dec = 2) => pre((v) => {
    const n = toNum(v);
    if (!Number.isFinite(n)) return def;
    const f = Math.pow(10, dec);
    return Math.round(clampN(n, lo, hi) * f) / f;
  }, z.number());
  const bool = (def = false) => pre((v) => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : def), z.boolean());
  const str = (def = '', max = 0) => pre((v) => {
    if (v == null || typeof v === 'object') return def;
    const s = String(v).trim();
    return s ? clipStr(s, max) : def;
  }, z.string()).catch(def);
  const strNull = (def = null, max = 0) => pre((v) => {
    if (v == null || v === '' || typeof v === 'object') return def;
    const s = String(v).trim();
    return s ? clipStr(s, max) : def;
  }, z.string().nullable()).catch(def);
  const pick = (list, def) => pre((v) => (v == null || v === '' ? def : String(v).trim()), z.enum(list)).catch(def);
  const pickNull = (list, def = null) => pre((v) => {
    if (v == null || v === '') return def;
    const s = String(v).trim();
    return list.includes(s) ? s : def;
  }, z.enum(list).nullable()).catch(def);
  /** 尾留列表（AI 用 /- 追加的新项在末尾，超上限保留最新 max 条） */
  const list = (shape, max) => pre((v) => {
    const a = Array.isArray(v) ? v : gfIsPlainObj(v) ? Object.values(v) : [];
    return a.filter(gfIsPlainObj).slice(-max);
  }, z.array(typeof shape.parse === 'function' ? shape : z.object(shape)));
  /** 头留列表（脚本把最新项插在头部，超上限保留前 max 条，如入账记录、最近出货） */
  const headList = (shape, max) => pre((v) => {
    const a = Array.isArray(v) ? v : gfIsPlainObj(v) ? Object.values(v) : [];
    return a.filter(gfIsPlainObj).slice(0, max);
  }, z.array(typeof shape.parse === 'function' ? shape : z.object(shape)));
  const strList = (max, itemMax = 24) => pre((v) => {
    const a = Array.isArray(v) ? v : [];
    const seen = new Set();
    const out = [];
    for (const x of a) {
      if (x == null || typeof x === 'object') continue;
      const s = clipStr(String(x).trim(), itemMax);
      if (s && !seen.has(s)) { seen.add(s); out.push(s); }
    }
    return out.slice(0, max);
  }, z.array(z.string()));
  const derived = () => pre(() => null, z.any());
  return { pre, int, num, bool, str, strNull, pick, pickNull, list, headList, strList, derived, clipStr };
}

/* 金手指 · 通用逻辑（纯函数，不碰宿主、不碰 DOM）
 * 依赖同一作用域里的：共用/规则.js（dateKey、dayNo、addDays、fmtDate）、共用/气运.js（LUCK_TIERS、luckFits、luckClash、luckIndex）、
 *   共用/金手指.js（GFS、GF_INFO、GF_DROP_TARGETS、GF_REWARD_SOURCES、GF_REWARD_TIERS、GF_TIER_UP、GF_TASK_CATS、GF_TASK_STATES、gfStrengthBand、gfDefaultTone）、
 *   金手指/结构.js（gfIsPlainObj、gfKit）。
 * 负责：
 *   1. 金手指通用字段（类型、口吻、任务、待入账、入账记录）的 zod 结构与组合器 gfBlockSchema
 *   2. 通用每轮更新把关 onUpdatedCommon（保护口吻与入账记录、任务进行中 ≤3 与逾期判已失败、神界/英雄钱包转行囊 B7、已入账挪进入账记录含当轮直标已入账 B5）
 *   3. 奖池掷骰与 10% 改出气运词条（B6 非深蓝过滤面板、B7 神界/英雄钱包转行囊、B8 气运落点跳过替换、审查 B6 附带词条原文），支持传入 rand 便于测试
 */

function gfRewardSchema(z, K) {
  const promoShape = z.object({
    条件: K.str('', 40),
    进度: K.str('', 20),
    晋阶后名称: K.strNull(null, 8),
    晋阶后效果: K.str('', 80),
  }).nullable().catch(null);
  const fixShape = z.object({ 条件: K.str('', 40) }).nullable().catch(null);
  const doomShape = z.object({
    条件: K.str('', 40),
    劫兆: K.pick(['未显', '将至', '临头'], '未显'),
    期限: K.strNull(null, 24),
  }).nullable().catch(null);
  const luckObj = z.object({
    品阶: K.pick(LUCK_TIERS, '紫'),
    类别: K.pick(['命格', '体质', '血脉', '机缘', '心性'], '机缘'),
    效果: K.str('', 80),
    代价: K.strNull(null, 60),
    状态: K.pick(['生效', '压制'], '生效'),
    晋阶: promoShape,
    化解: fixShape,
    死劫: doomShape,
  });
  return z.object({
    名称: K.str('未知奖励', 20),
    品阶: K.pickNull(GF_REWARD_TIERS, null),
    来源: K.pick(GF_REWARD_SOURCES, '任务'),
    出处: K.str('斗罗', 16),
    说明: K.str('', 60),
    落点: K.pick(GF_DROP_TARGETS, '其他'),
    日期: K.str('', 24),
    状态: K.pick(['待入账', '已入账'], '待入账'),
    词条: K.pre((v) => (gfIsPlainObj(v) ? v : undefined), luckObj.optional()).catch(undefined),
  }).transform((r) => {
    if (!r.词条) { const o = { ...r }; delete o.词条; return o; }
    return r;
  });
}

function gfCommonShape(z, K, gfType, tones, opts) {
  const win = opts && opts.win;
  const defTone = gfDefaultTone(gfType, tones, win);
  const seesLuck = opts && typeof opts.气运知情 === 'boolean' ? opts.气运知情 : gfSeesLuck(gfType, null, win);
  const toneSchema = K.pre((v) => (gfIsPlainObj(v) ? v : {}), z.object({
    名字: K.str(defTone.名字, 8),
    称呼: K.str(defTone.称呼, 8),
    预设: K.strNull(null, 16),
    描述: K.str(defTone.描述, 120),
  }));
  const taskSchema = z.object({
    标题: K.str('未命名任务', 20),
    类别: K.pick(GF_TASK_CATS, '日常'),
    内容: K.str('', 80),
    期限: K.str('不限', 24),
    奖励: K.str('', 40),
    失败: K.str('无', 40),
    状态: K.pick(GF_TASK_STATES, '进行中'),
  });
  const logSchema = z.object({
    名称: K.str('', 20),
    落点: K.pick(GF_DROP_TARGETS, '其他'),
    日期: K.str('', 24),
  });
  return {
    类型: z.literal(gfType).catch(gfType),
    气运知情: K.bool(seesLuck),
    提醒: K.str('', 160),
    口吻: toneSchema,
    任务: K.list(taskSchema, 8),
    待入账: K.list(gfRewardSchema(z, K), 20),
    入账记录: K.headList(logSchema, 12),
  };
}

/** 构造某个金手指的完整 zod 结构：通用字段 + 专属字段（extraShape）+ 可选 finish 派生重算 */
function gfBlockSchema(z, gfType, extraShape, finish, tones, opts) {
  const K = gfKit(z);
  const base = K.pre(
    (v) => (gfIsPlainObj(v) ? v : {}),
    z.object({ ...gfCommonShape(z, K, gfType, tones, opts), ...extraShape }),
  );
  return typeof finish === 'function' ? base.transform(finish) : base;
}

/** 从 stat 读取主角等效等级（优先常态，免受临时加成波动影响） */
function gfHeroEq(stat) {
  const h = stat && stat.主角;
  if (!h || typeof h !== 'object') return 1;
  const eq = h.等效等级;
  if (eq && typeof eq === 'object') {
    if (Number.isFinite(eq.常态)) return eq.常态;
    if (Number.isFinite(eq.当前)) return eq.当前;
  }
  return Number.isFinite(h.魂力等级) ? h.魂力等级 : 1;
}

/** 从 stat 推断主角类型（给气运词条适用筛查用） */
function gfHeroType(stat) {
  const h = stat && stat.主角;
  if (!h || typeof h !== 'object') return '人类魂师';
  if (h.出身 === '魂兽') return '魂兽';
  if ((h.神途 && h.神途.神位) || h.神阶 || (Number(h.魂力等级) >= 100)) return '神祇';
  return '人类魂师';
}

/** B7：神界与英雄不流通凡间货币，钱包落点改行囊 */
function gfFixDropTarget(target, part) {
  if (target === '钱包' && (part === '神界' || part === '英雄')) return '行囊';
  return target;
}

/** 追加一条待入账（保留最新 20 条，按 B7 修正落点） */
function gfPushPending(G, reward, part) {
  const item = { ...reward, 落点: gfFixDropTarget(reward.落点 || '其他', part), 状态: '待入账' };
  const list = Array.isArray(G.待入账) ? G.待入账.slice() : [];
  list.push(item);
  G.待入账 = list.slice(-20);
  return item;
}

/** 每轮更新后的通用把关（所有金手指在自己的 onUpdated 之前执行）：
 *  - 保护口吻、入账记录不被 AI 篡改
 *  - 任务：进行中上限 3 条（超出不收）；过期还在进行中的改“已失败”
 *  - 待入账：B7 神界/英雄 钱包→行囊；状态“已入账”的条目（含当轮新增直标已入账 B5）挪入入账记录（最新在前，上限 12） */
function gfOnUpdatedCommon(gfType, after, before) {
  const G = after && after.金手指;
  if (!G || G.类型 !== gfType) return;
  const prevG = before && gfIsPlainObj(before.金手指) && before.金手指.类型 === gfType ? before.金手指 : null;
  const part = (after.时空 && after.时空.当前部) || null;
  const todayStr = (after.时空 && after.时空.外界日期) || '';
  const todayKey = dateKey(todayStr);

  // 1. 口吻、气运知情与入账记录由玩家面板或脚本写，AI 更新不覆盖
  if (prevG && gfIsPlainObj(prevG.口吻)) G.口吻 = JSON.parse(JSON.stringify(prevG.口吻));
  if (prevG && typeof prevG.气运知情 === 'boolean') G.气运知情 = prevG.气运知情;
  const log = prevG && Array.isArray(prevG.入账记录) ? JSON.parse(JSON.stringify(prevG.入账记录)) : (Array.isArray(G.入账记录) ? G.入账记录.slice() : []);

  // 2. 任务：保留原有进行中 + 新增进行中至多 3 条，超出不收；到期未完成改已失败
  const prevActive = new Set((prevG && Array.isArray(prevG.任务) ? prevG.任务 : []).filter((t) => t.状态 === '进行中').map((t) => t.标题));
  const rawTasks = Array.isArray(G.任务) ? G.任务 : [];
  let activeCount = 0;
  // 先统计仍在进行中的旧任务，确保旧任务优先留住，多出的新进行中任务不收
  const keepFlags = rawTasks.map((t) => {
    if (t.状态 !== '进行中') return true;
    if (prevActive.has(t.标题)) { activeCount += 1; return activeCount <= 3; }
    return null; // 待二遍判定
  });
  const tasks = [];
  for (let i = 0; i < rawTasks.length; i += 1) {
    let keep = keepFlags[i];
    if (keep === null) {
      if (activeCount < 3) { activeCount += 1; keep = true; }
      else keep = false;
    }
    if (!keep) continue;
    const t = { ...rawTasks[i] };
    if (t.状态 === '进行中' && t.期限 && t.期限 !== '不限' && todayKey != null) {
      const dueKey = dateKey(t.期限);
      if (dueKey != null && todayKey > dueKey) t.状态 = '已失败';
    }
    tasks.push(t);
  }
  G.任务 = tasks.slice(-8);

  // 3. 待入账：B7 落点修正 + B5 已入账挪进入账记录
  const pending = [];
  for (const r of (Array.isArray(G.待入账) ? G.待入账 : [])) {
    const fixed = { ...r, 落点: gfFixDropTarget(r.落点, part) };
    if (fixed.状态 === '已入账') {
      log.unshift({ 名称: fixed.名称, 落点: fixed.落点, 日期: fixed.日期 || todayStr });
    } else {
      pending.push(fixed);
    }
  }
  G.待入账 = pending.slice(-20);
  G.入账记录 = log.slice(0, 12);
}

/** 按权重表掷品阶：table = [['彩', 0.5], ['金', 4], ...] */
function gfRollTable(table, rand = Math.random) {
  const total = table.reduce((s, [, w]) => s + Math.max(0, w), 0);
  if (!(total > 0)) return table[table.length - 1][0];
  let r = rand() * total;
  for (const [k, w] of table) {
    r -= Math.max(0, w);
    if (r < 0) return k;
  }
  return table[table.length - 1][0];
}

/** 从词条库中挑一条同品阶正面气运词条，转成待入账奖励（审查第二段 B6）；无合适词条返回 null */
function gfPickLuckReward(luckLib, stat, tier, source, today, rand = Math.random) {
  if (!luckLib || !Array.isArray(luckLib.词条)) return null;
  const ownedObj = (stat && stat.主角 && stat.主角.气运 && stat.主角.气运.词条) || {};
  const pendingLuck = ((stat && stat.金手指 && stat.金手指.待入账) || [])
    .filter((r) => r && r.状态 === '待入账' && r.落点 === '气运' && r.词条);
  const ownedNames = [...new Set(Object.keys(ownedObj).concat(pendingLuck.map((r) => r.名称)))];
  if (ownedNames.length >= 9) return null;
  if (tier === '彩') {
    const rb = Object.values(ownedObj).filter((x) => x && x.品阶 === '彩').length
      + pendingLuck.filter((r) => r.品阶 === '彩').length;
    if (rb >= 2) return null;
  }
  const heroType = gfHeroType(stat);
  const cand = luckLib.词条.filter((e) => e.品阶 === tier && !isLuckBad(e) && luckFits(e, heroType) && !ownedNames.includes(e.名称) && !luckClash(luckLib, ownedNames, e));
  if (!cand.length) return null;
  const e = cand[Math.floor(rand() * cand.length)];
  const entry = {
    品阶: e.品阶,
    类别: e.类别,
    效果: e.效果,
    代价: e.代价 || null,
    状态: '生效',
    晋阶: e.品阶 !== '彩' && e.晋阶 ? {
      条件: e.晋阶.条件,
      进度: '',
      晋阶后名称: e.晋阶.晋阶后名称 || null,
      晋阶后效果: e.晋阶.晋阶后效果,
    } : null,
    化解: null,
    死劫: null,
  };
  return {
    名称: e.名称,
    品阶: e.品阶,
    来源: source,
    出处: '斗罗',
    说明: e.简介,
    落点: '气运',
    日期: today || '',
    状态: '待入账',
    词条: entry,
  };
}

/** 从通用奖池抽一件指定品阶奖品：
 *  - B6：非深蓝加点过滤落点“面板”
 *  - 按主角等效等级算强度段（1–5），无命中退回最近强度段
 *  - B8：抽到紫及以上且原奖品落点不是“气运”时，有 10% 概率改成同品阶气运词条（带 词条 原文，审查第二段 B6）
 *  - B7：神界与英雄部把“钱包”落点转“行囊” */
function gfRollPoolReward({ pool, luckLib, stat, gfType, tier, source, rand = Math.random, luckChance = 0.1 }) {
  const part = (stat && stat.时空 && stat.时空.当前部) || null;
  const today = (stat && stat.时空 && stat.时空.外界日期) || '';
  const band = gfStrengthBand(gfHeroEq(stat));
  const items = (Array.isArray(pool) ? pool : (pool && pool.奖品) || []).filter(
    (x) => x && x.品阶 === tier && !(gfType !== '深蓝加点' && x.落点 === '面板'),
  );
  let cand = items.filter((x) => Array.isArray(x.强度段) && x.强度段.includes(band));
  if (!cand.length && items.length) {
    // 退回距离当前强度段最近的候选
    let bestDist = Infinity;
    for (const x of items) {
      const segs = Array.isArray(x.强度段) && x.强度段.length ? x.强度段 : [band];
      const dist = Math.min(...segs.map((s) => Math.abs(s - band)));
      if (dist < bestDist) { bestDist = dist; cand = [x]; }
      else if (dist === bestDist) cand.push(x);
    }
  }
  const picked = cand.length ? cand[Math.floor(rand() * cand.length)] : null;
  const highTier = GF_TIER_UP.indexOf(tier) >= GF_TIER_UP.indexOf('紫');
  // B8：原奖品落点已是“气运”时跳过 10% 替换，免得叠两次
  if (highTier && (!picked || picked.落点 !== '气运') && rand() < luckChance) {
    const lr = gfPickLuckReward(luckLib, stat, tier, source, today, rand);
    if (lr) return lr;
  }
  if (!picked) {
    return {
      名称: `${tier}阶奇珍`,
      品阶: tier,
      来源: source,
      出处: '斗罗',
      说明: '契合当前修为的一份机缘补给。',
      落点: '行囊',
      日期: today,
      状态: '待入账',
    };
  }
  return {
    名称: picked.名称,
    品阶: picked.品阶,
    来源: source,
    出处: picked.出处 || '斗罗',
    说明: picked.说明 || '',
    落点: gfFixDropTarget(picked.落点 || '行囊', part),
    日期: today,
    状态: '待入账',
  };
}

/** 改口吻（系统页随时可改） */
function gfApplyTone(G, gfType, payload, win) {
  if (!G || !payload || typeof payload !== 'object') return { ok: false, why: '口吻内容不完整' };
  const clip = (s, max) => { const t = String(s == null ? '' : s).trim(); return max && [...t].length > max ? [...t].slice(0, max).join('') : t; };
  const info = gfInfoOf(gfType, win) || {};
  const 名字 = clip(payload.名字, 8) || (G.口吻 && G.口吻.名字) || info.默认名 || '系统';
  const 称呼 = clip(payload.称呼, 8) || (G.口吻 && G.口吻.称呼) || info.默认称呼 || '宿主';
  const 预设 = clip(payload.预设, 16) || null;
  const 描述 = clip(payload.描述, 120);
  G.口吻 = { 名字, 称呼, 预设, 描述 };
  return { ok: true, 口吻: G.口吻 };
}

/** 清理正文消息里的变量更新/思维链/HTML标签，给后台生成做上下文尾巴 */
function gfRecentProse(env, maxMsgs = 4, maxChars = 1800) {
  const list = env && typeof env.chat === 'function' ? (env.chat() || []) : [];
  if (!Array.isArray(list) || !list.length) return '（尚无正文记录）';
  const tail = list.filter((m) => m && !m.is_hidden && !m.is_system).slice(-maxMsgs);
  const cleaned = tail.map((m) => {
    const raw = String(m.mes != null ? m.mes : (m.message != null ? m.message : ''));
    return raw
      .replace(/<(UpdateVariable|update|thinking|think|核心审查|status|StatusPlaceHolderImpl)[^>]*>[\s\S]*?<\/\1>/giu, '')
      .replace(/```[\s\S]*?```/gu, '')
      .replace(/<[^>]+>/gu, '')
      .replace(/\n{2,}/gu, '\n')
      .trim();
  }).filter(Boolean).join('\n…\n');
  if (!cleaned) return '（尚无正文记录）';
  return cleaned.length > maxChars ? cleaned.slice(-maxChars) : cleaned;
}

/** 从当前 stat 和聊天上下文拼出后台生成（未来模拟器 / 跨时代聊天群）的通用占位内容 */
function gfPromptContext(stat, env) {
  const h = (stat && stat.主角) || {};
  const t = (stat && stat.时空) || {};
  const G = (stat && stat.金手指) || {};
  const eq = h.等效等级 && typeof h.等效等级 === 'object' ? (h.等效等级.当前 ?? h.等效等级.常态 ?? h.魂力等级) : h.魂力等级;
  const souls = h.武魂 && typeof h.武魂 === 'object' ? Object.keys(h.武魂).join('、') : '';
  const present = stat && stat.人物 && typeof stat.人物 === 'object'
    ? Object.entries(stat.人物).filter(([, p]) => p && p.在场).map(([k]) => k)
    : [];
  const heroBits = [
    h.姓名 ? `姓名：${h.姓名}` : '',
    t.当前部 ? `部：${t.当前部}` : '',
    t.外界日期 ? `外界日期：${t.外界日期}` : '',
    t.地点 ? `地点：${t.地点}` : '',
    h.出身 ? `出身：${h.出身}` : '',
    eq != null ? `等效等级：${eq}` : '',
    h.魂力等级 != null ? `魂力：${h.魂力等级}级` : '',
    souls ? `武魂：${souls}` : '',
    h.伤势 && h.伤势 !== '无' ? `伤势：${h.伤势}` : '',
    present.length ? `在场人物：${present.join('、')}` : '',
  ].filter(Boolean);

  const g0 = stat && stat.原作指导;
  const guideBits = [];
  if (t.当前幕) guideBits.push(`当前幕：${t.当前幕}`);
  if (g0 && typeof g0 === 'object') {
    if (g0.当前节点) guideBits.push(`当前节点：${g0.当前节点}`);
    if (g0.近期事件) guideBits.push(`近期事件：${g0.近期事件}`);
    if (g0.偏移) guideBits.push(`偏移：${g0.偏移}`);
  } else if (typeof g0 === 'string' && g0.trim()) {
    guideBits.push(g0.trim());
  }

  const nc = stat && stat.叙事核心;
  const coreText = nc && typeof nc === 'object' && nc.核心
    ? `${nc.核心}${nc.阶段 ? `（阶段：${nc.阶段}）` : ''}`
    : '无';

  const luckMap = (h.气运 && h.气运.词条 && typeof h.气运.词条 === 'object') ? h.气运.词条 : {};
  const luckList = Object.entries(luckMap).map(([nm, e]) => {
    if (!e || typeof e !== 'object') return nm;
    const dj = e.死劫 && e.死劫.劫兆 && e.死劫.劫兆 !== '未显' ? `［死劫：${e.死劫.劫兆}${e.死劫.期限 ? '，期限' + e.死劫.期限 : ''}］` : '';
    return `${nm}（${e.品阶 || ''}·${e.状态 || '生效'}）：${e.效果 || ''}${dj}`;
  });

  const tone = (G.口吻 && typeof G.口吻 === 'object') ? G.口吻 : {};
  const toneText = `名字：${tone.名字 || '系统'}；称呼：${tone.称呼 || '宿主'}${tone.预设 ? `；预设：${tone.预设}` : ''}${tone.描述 ? `；风格：${tone.描述}` : ''}`;

  return {
    主角摘要: heroBits.join('；') || '（无）',
    最近正文: gfRecentProse(env),
    原作指导: guideBits.join('；') || '（无特定原作节点）',
    叙事核心: coreText,
    气运: luckList.length ? luckList.join('；') : '无',
    口吻: toneText,
  };
}

/** 按键值表替换 {{占位}} */
function gfFillTemplate(tpl, map) {
  return String(tpl || '').replace(/\{\{([^{}]+)\}\}/gu, (m, k) => (Object.prototype.hasOwnProperty.call(map, k) ? String(map[k] == null ? '' : map[k]) : m));
}

/** 严格从后台生成文本中提取单个 JSON 对象（去思维链和代码围栏）；失败返回 null */
function gfParseJsonObject(raw) {
  let s = String(raw == null ? '' : raw)
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/giu, '')
    .trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/iu.exec(s);
  if (fenced) s = fenced[1].trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const obj = JSON.parse(s.slice(a, b + 1));
    return gfIsPlainObj(obj) ? obj : null;
  } catch (_) {
    return null;
  }
}

/* 金手指 · 主页面代码的共用部分（状态栏系统页外壳 + 正文 <系统> 六皮标签）
 * build.py 把 本文件 + 页面/<类型>.js 拼起来，末尾加一句 return DLGF_PAGE_<类型>(GF, INFO, BRIDGE, DLGF_SHARED(GF, INFO, BRIDGE))，
 * 整段由金手指脚本在主页面里用 new Function('GF', 'INFO', 'BRIDGE', 代码) 执行。
 * 视觉红线：无朱砂主色、无大圆角（≤4px）、无 emoji 图标、无远程资源、三档动效（full / reduced→lite / off）+ prefers-reduced-motion。
 */
function DLGF_SHARED(GF, INFO, BRIDGE) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TIER = ['彩', '金', '红', '紫', '黄', '白'];
  const SYS_KEY = { 未来模拟器: 'sim', 深蓝加点: 'pts', 诸天代打: 'hero', 签到打卡: 'sign', 抽奖: 'gacha', 跨时代聊天群: 'chat' };
  const gfOf = (st) => (st && st.金手指 && typeof st.金手指 === 'object' ? st.金手指 : null);
  const mine = (st) => { const g = gfOf(st); return !!g && g.类型 === GF; };

  function dayNo(s) {
    const m = /(前)?(\d{1,9})年(\d{1,2})月(\d{1,2})日/u.exec(String(s || ''));
    if (!m) return null;
    const y0 = (m[1] ? -1 : 1) * Number(m[2]), mo = Number(m[3]), d = Number(m[4]);
    const y = y0 - (mo <= 2 ? 1 : 0), era = Math.floor(y / 400), yoe = y - era * 400;
    const doy = Math.floor((153 * ((mo + 9) % 12) + 2) / 5) + d - 1;
    return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  }
  const daysTo = (from, to) => { const a = dayNo(from), b = dayNo(to); return a == null || b == null ? null : b - a; };
  const short = (s) => { const m = /(\d{1,2})月(\d{1,2})日/u.exec(String(s || '')); return m ? `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}` : '—'; };
  const year = (s) => { const m = /(前)?(\d{1,9})年/u.exec(String(s || '')); return m ? (m[1] ? '前' : '') + m[2] : '—'; };
  const tierIn = (text) => { const m = /([彩金红紫黄白])阶/u.exec(String(text || '')); return m ? m[1] : null; };

  function motionOf(kit) {
    const raw = (kit && kit.motion) || (document.documentElement.dataset.dlMotion) || 'full';
    if (raw === 'off') return 'off';
    try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off'; } catch (_) { /* ignore */ }
    return raw === 'reduced' || raw === 'lite' ? 'lite' : 'full';
  }
  const still = (kit) => motionOf(kit) !== 'full';

  function frag(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '').trim();
    return t.content.firstElementChild;
  }

  function typeIn(el, text, kit, speed = 26) {
    if (!el) return;
    if (el._typing) { clearInterval(el._typing); el._typing = null; }
    const s = String(text || '');
    if (still(kit)) { el.innerHTML = `<q>${esc(s)}</q>`; return; }
    let i = 0;
    const q = document.createElement('q');
    const cur = document.createElement('i');
    cur.className = 'cur';
    el.replaceChildren(q, cur);
    el._typing = setInterval(() => {
      if (!el.isConnected) { clearInterval(el._typing); el._typing = null; return; }
      i += 1;
      q.textContent = s.slice(0, i);
      if (i >= s.length) {
        clearInterval(el._typing); el._typing = null;
        setTimeout(() => { if (cur.isConnected) cur.remove(); }, 1600);
      }
    }, speed);
  }

  function roll(el, to, kit, ms = 700) {
    if (!el) return;
    let tn = [...el.childNodes].find((n) => n.nodeType === 3);
    if (!tn) tn = el.insertBefore(document.createTextNode(''), el.firstChild);
    const from = Number(el.dataset.v != null ? el.dataset.v : parseFloat(tn.textContent)) || 0;
    el.dataset.v = String(to);
    if (still(kit) || from === to) { tn.textContent = String(to); return; }
    const t0 = performance.now();
    const step = () => {
      if (!el.isConnected) return;
      const p = Math.min(1, (performance.now() - t0) / ms);
      tn.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) setTimeout(step, 16);
    };
    step();
  }

  function burst(host, x, y, colors, kit, n = 18, spread = 90) {
    if (still(kit) || !host || !host.isConnected) return;
    const cols = colors && colors.length ? colors : ['#fff'];
    for (let i = 0; i < n; i += 1) {
      const s = document.createElement('i');
      s.className = 'jp-spark';
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--c', cols[i % cols.length]);
      host.appendChild(s);
      const a = Math.random() * Math.PI * 2;
      const r = spread * (0.4 + Math.random() * 0.8);
      if (s.animate) {
        s.animate([
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(.2)`, opacity: 0 },
        ], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => s.remove();
      } else {
        setTimeout(() => s.remove(), 400);
      }
    }
  }

  function toast(root, msg) {
    if (!root) return;
    root.querySelectorAll('.jp-toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'jp-toast';
    t.setAttribute('role', 'status');
    t.textContent = String(msg || '');
    root.appendChild(t);
    setTimeout(() => { if (t.isConnected) t.remove(); }, 2700);
  }

  const disabled = (kit) => (BRIDGE && typeof BRIDGE.disabled === 'function' ? BRIDGE.disabled(kit) : '');
  const act = (action, payload, opts) => (BRIDGE && typeof BRIDGE.act === 'function'
    ? BRIDGE.act(action, payload, opts)
    : Promise.resolve({ ok: false, why: '金手指写入桥不可用' }));
  const syncBar = () => { if (BRIDGE && typeof BRIDGE.syncBar === 'function') BRIDGE.syncBar(); };

  function lockBanner(reason) {
    return reason ? `<div class="jp-lock" role="note">${esc(reason)}</div>` : '';
  }

  function caveat(extra) {
    const text = extra || '面板操作写入最新 AI 楼层；重新生成或右滑这一层时，本层做过的签到、抽奖、加点等操作会一并撤销。';
    return `<p class="jp-caveat">${esc(text)}</p>`;
  }

  // ── 页头（含随时改口吻入口） ──
  function head(G, o, kit) {
    const tone = (G && G.口吻) || {};
    const lock = disabled(kit);
    return `<header class="jp-hd">
      <div class="jp-mark" aria-hidden="true">${o.mark || ''}</div>
      <div class="jp-nm"><b>${esc(tone.名字 || o.名字 || INFO.默认名 || '系统')}</b><span>${esc(G.类型)}${tone.预设 ? ' · ' + esc(tone.预设) : ' · 自定口吻'}</span><button type="button" class="jp-tone-btn" data-tone-toggle ${lock ? 'disabled' : ''}>改口吻</button></div>
      <div class="jp-hs">${(o.stats || []).map((s) => `<div><b data-k="${esc(s.k)}">${esc(s.v)}${s.u ? `<small>${esc(s.u)}</small>` : ''}</b><span>${esc(s.label)}</span></div>`).join('')}</div>
      <p class="jp-say" aria-live="polite"></p>
    </header><div class="jp-tone" data-part="tone" hidden></div>`;
  }

  function bindToneEditor(root, G, kit) {
    const btn = root.querySelector('[data-tone-toggle]');
    const box = root.querySelector('[data-part="tone"]');
    if (!btn || !box) return;
    const isChat = G.类型 === '跨时代聊天群' || !!(INFO && INFO.口吻预设 === '群主机器人');
    const presets = Array.isArray(INFO && INFO.口吻预设)
      ? INFO.口吻预设
      : ((BRIDGE && BRIDGE.tones && (isChat ? BRIDGE.tones.群主机器人 : BRIDGE.tones.系统)) || []);
    let open = false;
    function renderBox() {
      if (!open) { box.hidden = true; box.replaceChildren(); return; }
      const tone = G.口吻 || {};
      box.hidden = false;
      box.innerHTML = `<div class="jp-tone-in">
        <div class="jp-tone-row">
          <label><span>${isChat ? '机器人名' : '系统名'}</span><input type="text" data-tk="名字" maxlength="8" value="${esc(tone.名字 || '')}"></label>
          <label><span>称呼${isChat ? '群友' : '你'}</span><input type="text" data-tk="称呼" maxlength="8" value="${esc(tone.称呼 || '')}"></label>
        </div>
        ${presets.length ? `<div class="jp-tone-pre">${presets.map((p, i) => `<button type="button" data-tp="${i}" aria-pressed="${String(tone.预设 === p.预设)}">${esc(p.预设)}</button>`).join('')}</div>` : ''}
        <label class="jp-tone-desc"><span>性格与说话方式</span><textarea data-tk="描述" maxlength="120" rows="2">${esc(tone.描述 || '')}</textarea></label>
        <div class="jp-tone-acts">
          <button type="button" class="jp-btn" data-tone-cancel>取消</button>
          <button type="button" class="jp-btn pri" data-tone-save>保存口吻</button>
        </div>
      </div>`;
      let curPreset = tone.预设 || null;
      const nmIn = box.querySelector('[data-tk="名字"]');
      const callIn = box.querySelector('[data-tk="称呼"]');
      const descIn = box.querySelector('[data-tk="描述"]');
      box.querySelectorAll('[data-tp]').forEach((b) => b.addEventListener('click', () => {
        const p = presets[Number(b.dataset.tp)];
        if (!p) return;
        curPreset = p.预设;
        nmIn.value = (isChat ? p.名字 : p.自称) || nmIn.value;
        callIn.value = p.称呼 || callIn.value;
        descIn.value = p.描述 || '';
        box.querySelectorAll('[data-tp]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      }));
      descIn.addEventListener('input', () => {
        curPreset = null;
        box.querySelectorAll('[data-tp]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      });
      box.querySelector('[data-tone-cancel]').addEventListener('click', () => { open = false; renderBox(); });
      box.querySelector('[data-tone-save]').addEventListener('click', async () => {
        const r = await act('改口吻', { 名字: nmIn.value, 称呼: callIn.value, 预设: curPreset, 描述: descIn.value });
        if (!r.ok) { toast(root, r.why || '没存上'); return; }
        open = false;
        toast(root, '口吻已更新，下一轮正文起生效');
      });
    }
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      open = !open;
      renderBox();
    });
  }

  // ── 任务 ──
  function tasks(G, S) {
    const list = Array.isArray(G.任务) ? G.任务 : [];
    const on = list.filter((t) => t.状态 === '进行中').length;
    const today = S && S.时空 && S.时空.外界日期;
    return `<section class="jp-sec" data-part="tasks"><h5 class="jp-st">任务<em>进行中 ${on}/3</em></h5>
      ${list.length ? `<div class="jp-tks">${list.map((t) => {
        const d = t.期限 === '不限' ? null : daysTo(today, t.期限);
        const due = t.期限 === '不限' ? '不限期' : d == null ? short(t.期限) : d < 0 ? '已过期' : d === 0 ? '今日截止' : `剩 ${d} 天`;
        const tier = tierIn(t.奖励);
        return `<article class="jp-tk" data-c="${esc(t.类别)}" data-s="${esc(t.状态)}">
          <span class="jp-tk-k">${esc(t.类别)}</span>
          <div class="jp-tk-b">
            <div class="jp-tk-t"><b>${esc(t.标题)}</b>${t.状态 === '进行中' ? `<time data-k="${d != null && d <= 1 ? 'soon' : ''}">${esc(due)}</time>` : ''}</div>
            <p class="jp-tk-c">${esc(t.内容)}</p>
            <div class="jp-tk-f"><span class="g"${tier ? ` data-tier="${tier}" style="color:var(--c1)"` : ''}>${esc(t.奖励)}</span>${t.失败 && t.失败 !== '无' ? `<span class="l">${esc(t.失败)}</span>` : ''}</div>
          </div>
          ${t.状态 !== '进行中' ? `<span class="jp-tk-stamp">${t.状态 === '已完成' ? '完成' : '失败'}</span>` : ''}
        </article>`;
      }).join('')}</div>` : `<p class="jp-none">${esc((G.口吻 && G.口吻.名字) || '系统')}还没发任务。</p>`}
    </section>`;
  }

  // ── 待入账 ──
  function rewardCard(r, cls = '') {
    const cross = r.出处 && r.出处 !== '斗罗';
    return `<article class="jp-rw ${cls}"${r.品阶 ? ` data-tier="${esc(r.品阶)}"` : ''}>
      <div class="jp-rw-h">${r.品阶 ? `<span class="jp-rw-t">${esc(r.品阶)}</span>` : ''}<b>${esc(r.名称)}</b>${cross ? `<span class="jp-rw-x">跨界 · ${esc(r.出处)}</span>` : ''}</div>
      ${r.说明 ? `<p>${esc(r.说明)}</p>` : ''}
      <div class="jp-rw-f"><span class="to">${esc(r.落点 || '其他')}</span><span>${esc(r.来源 || '')} · ${short(r.日期)}</span>${r.状态 === '待入账' ? '<span class="wait">等正文入账</span>' : ''}</div>
    </article>`;
  }

  function ledger(G, freshCount = 0) {
    // 待入账按时间追加在末尾，显示时最新排最前
    const list = (Array.isArray(G.待入账) ? G.待入账 : []).filter((r) => r.状态 === '待入账').slice().reverse();
    const log = Array.isArray(G.入账记录) ? G.入账记录 : [];
    return `<section class="jp-sec" data-part="ledger"><h5 class="jp-st">待入账<em>${list.length} 件 · 下一轮正文里落地</em></h5>
      ${list.length ? `<div class="jp-lg">${list.map((r, i) => rewardCard(r, i < freshCount ? 'new' : '')).join('')}</div>` : '<p class="jp-none">没有等着入账的东西。</p>'}
      ${log.length ? `<ol class="jp-log">${log.slice(0, 4).map((x) => `<li><b>${esc(x.名称)}</b><span>→ ${esc(x.落点)}</span><time>${short(x.日期)}</time></li>`).join('')}</ol>` : ''}
    </section>`;
  }

  function swap(root, part, html) {
    const old = root.querySelector(`[data-part="${part}"]`);
    const nu = frag(html);
    if (old && nu) old.replaceWith(nu);
    return nu;
  }

  function dockMark(sys, iconPath, inner, k, title, kit, tab) {
    const el = frag(`<button type="button" class="jp-dk" data-sys="${esc(sys)}" data-k="${esc(k || '')}" title="${esc(title || '')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" aria-hidden="true">${iconPath}</svg>${inner}</button>`);
    if (kit && typeof kit.open === 'function' && tab) el.addEventListener('click', () => kit.open(tab));
    return el;
  }

  // ── 正文块头解析（契约 §3） ──
  const BLOCK_META_KEYS = new Set(['类别', '标题', '人物', '出处', '阶段']);
  function parseBlock(inner) {
    const lines = String(inner == null ? '' : inner).replace(/^\n+|\n+$/gu, '').split('\n');
    const meta = {};
    let i = 0;
    for (; i < lines.length; i += 1) {
      const m = /^\s*([^｜|\s]{1,6})[｜|](.*)$/u.exec(lines[i]);
      if (!m || !BLOCK_META_KEYS.has(m[1])) break;
      meta[m[1]] = m[2].trim();
    }
    return { meta, body: lines.slice(i).join('\n').trim() };
  }

  // ── 正文 <系统> 块渲染器（六个金手指共用，按 金手指.类型 换皮） ──
  const systemBlock = {
    render(seg, kit) {
      const { meta, body } = parseBlock(seg.inner);
      const st = kit && kit.env && kit.env.stat;
      const G = (st && st.金手指) || { 类型: GF, 口吻: { 名字: INFO.默认名 } };
      const key = (INFO && INFO.key) || SYS_KEY[G.类型] || 'sim';
      const tone = G.口吻 || {};
      const cat = meta.类别 || '提示';
      const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null;
      const attrs = {
        class: 'sx qt-sx' + (t != null ? ' in' : ''),
        'data-sys': key,
        'data-cat': cat,
        style: t != null ? { '--gf-t': `-${t.toFixed(2)}s` } : null,
      };
      const lines = body ? body.split('\n').filter((l) => l.trim()) : [];
      return kit.h('section', attrs,
        kit.h('div', { class: 'sx-hd' },
          kit.h('span', { class: 'sx-ding', text: key === 'chat' ? '群公告' : '叮' }),
          kit.h('span', { class: 'sx-nm', text: tone.名字 || G.类型 || '系统' }),
          kit.h('span', { class: 'sx-k', text: cat })),
        meta.标题 ? kit.h('h5', { class: 'qt-sx-t', text: meta.标题 }) : null,
        lines.map((l) => kit.h('p', { class: 'sx-line' }, kit.sub ? kit.sub(l) : l)));
    },
  };

  // ── 共用样式（自带 @property --qa、品阶色、系统色、关键帧、.jp 外壳与 <系统> 六皮） ──
  const CSS = `
@property --qa{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes qyHue{to{--qa:360deg}}
@keyframes qyShine{0%{background-position:130% 0}55%,100%{background-position:-130% 0}}
@keyframes sxBlink{50%{opacity:0}}
@keyframes sxIn{from{opacity:0;transform:translateY(8px)}}
@keyframes sxScan{to{top:110%}}
@keyframes sxGlitch{0%{opacity:0;clip-path:inset(40% 0 52% 0);transform:translateX(-6px)}20%{opacity:1;clip-path:inset(10% 0 70% 0);transform:translateX(5px)}40%{clip-path:inset(60% 0 10% 0);transform:translateX(-3px)}60%{clip-path:inset(0 0 30% 0)}80%,100%{clip-path:inset(0);transform:none}}
@keyframes sxFlowY{to{background-position:0 14px}}
@keyframes sxRoll{from{transform:translateY(70%);opacity:0}}
@keyframes sxTurn{to{transform:rotate(405deg)}}
@keyframes sxStamp{0%{transform:rotate(-10deg) scale(2.4);opacity:0}60%{transform:rotate(-10deg) scale(.92);opacity:1}100%{transform:rotate(-10deg) scale(1)}}
@keyframes sxSweep{40%,100%{transform:translateX(100%)}}
@keyframes jpRise{from{opacity:0;transform:translateY(10px)}}
@keyframes jpPulse{50%{opacity:.2}}
@keyframes jpDrop{0%{opacity:0;transform:translateY(-16px) scale(1.04);filter:brightness(2.2)}60%{opacity:1}100%{filter:none}}
@keyframes jpToast{0%{opacity:0;transform:translate(-50%,10px)}12%,82%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-6px)}}
@keyframes jpSpin{to{transform:rotate(360deg)}}

:is(.jp,.jp-dk,.sx)[data-sys="sim"]{--s1:#5FE3F0;--s2:#04141c;--sg:rgba(95,227,240,.45);--s3:#FF4D6A}
:is(.jp,.jp-dk,.sx)[data-sys="pts"]{--s1:#4C9BFF;--s2:#030b1c;--sg:rgba(76,155,255,.45);--s3:#9FF3FF}
:is(.jp,.jp-dk,.sx)[data-sys="hero"]{--s1:#B994FF;--s2:#0b0718;--sg:rgba(185,148,255,.45);--s3:#FFD36B}
:is(.jp,.jp-dk,.sx)[data-sys="sign"]{--s1:#E6B562;--s2:#140c04;--sg:rgba(230,181,98,.45);--s3:#FFF0C2}
:is(.jp,.jp-dk,.sx)[data-sys="gacha"]{--s1:#FFB341;--s2:#0d0a12;--sg:rgba(255,179,65,.42);--s3:#D96BFF}
:is(.jp,.jp-dk,.sx)[data-sys="chat"]{--s1:#7CF5C8;--s2:#061412;--sg:rgba(124,245,200,.4);--s3:#D8C39A}
${INFO && INFO.key && !SYS_KEY[GF] && Array.isArray(INFO.色) ? `:is(.jp,.jp-dk,.sx)[data-sys="${String(INFO.key).replace(/[^a-z0-9-]/g, '')}"]{--s1:${INFO.色[0] || '#5FE3F0'};--s2:${INFO.色[1] || '#04141c'};--sg:color-mix(in srgb,${INFO.色[0] || '#5FE3F0'} 45%,transparent);--s3:${INFO.色[2] || '#FFD36B'}}` : ''}

#dl-root .jp [data-tier="白"]{--c1:#F4F1EA;--c2:#A9A291;--cg:rgba(244,241,234,.28)}
#dl-root .jp [data-tier="黄"]{--c1:#F2D46B;--c2:#C08A17;--cg:rgba(242,212,107,.36)}
#dl-root .jp [data-tier="紫"]{--c1:#C3A2F2;--c2:#4E2585;--cg:rgba(176,138,224,.44)}
#dl-root .jp [data-tier="红"]{--c1:#F0565E;--c2:#7A111B;--cg:rgba(224,71,79,.5)}
#dl-root .jp [data-tier="金"]{--c1:#F6D877;--c2:#B8891F;--cg:rgba(240,207,106,.55)}
#dl-root .jp [data-tier="彩"]{--c1:#FFE45C;--c2:#6C7BFF;--cg:rgba(255,228,92,.45)}
#dl-root .jp [data-tier="厄"]{--c1:#A49FB1;--c2:#0A090D;--cg:rgba(0,0,0,.9)}
#dl-root .jp [data-tier="绝"]{--c1:#E0263B;--c2:#060509;--cg:rgba(150,10,26,.6)}

#dl-root .jp{--tx:#E8ECF2;--tx2:#A9B0BF;--tx3:#687084;--ln:color-mix(in srgb,var(--s1) 16%,transparent);--ln2:color-mix(in srgb,var(--s1) 32%,transparent);--ok:#7BE0A6;--bad:#FF7A86;--warn:#FFC15A;--serif:"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif;--sans:"Noto Sans SC",system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;--mono:"JetBrains Mono","Cascadia Mono",Consolas,ui-monospace,monospace;--ease:cubic-bezier(.2,.7,.2,1);--snap:cubic-bezier(.7,0,.2,1);container:jp/inline-size;position:relative;isolation:isolate;min-height:100%;color:var(--tx);background:var(--s2);font:13.5px/1.65 var(--sans);overflow-x:clip;border:1px solid var(--ln)}
#dl-root .jp *,#dl-root .jp *::before,#dl-root .jp *::after{box-sizing:border-box}
#dl-root .jp button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
#dl-root .jp :focus-visible{outline:1px solid var(--s1);outline-offset:2px}
#dl-root .jp p{margin:0}#dl-root .jp h4,#dl-root .jp h5{margin:0}
#dl-root .jp-in>*{animation:jpRise .55s var(--ease) both;animation-delay:calc(var(--i,0) * 60ms)}

#dl-root .jp-lock{padding:8px 16px;font:600 12px/1.5 var(--sans);color:var(--warn);background:rgba(255,193,90,.09);border-bottom:1px solid rgba(255,193,90,.28)}
#dl-root .jp-caveat{padding:10px 20px 14px;font:11.5px/1.55 var(--sans);color:var(--tx3);border-top:1px solid var(--ln)}

#dl-root .jp-hd{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px 16px;align-items:center;padding:18px 20px 16px;border-bottom:1px solid var(--ln);overflow:hidden}
#dl-root .jp-hd::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(80% 140% at 0% 0%,color-mix(in srgb,var(--s1) 18%,transparent),transparent 60%)}
#dl-root .jp-mark{grid-row:span 2;width:54px;height:54px;color:var(--s1);filter:drop-shadow(0 0 10px var(--sg))}
#dl-root .jp-mark svg{width:100%;height:100%;overflow:visible}
#dl-root .jp-nm{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;min-width:0}
#dl-root .jp-nm b{font:900 22px/1.1 var(--serif);letter-spacing:.16em;color:#fff;text-shadow:0 0 18px var(--sg)}
#dl-root .jp-nm span{font:600 10.5px/1 var(--mono);letter-spacing:.2em;color:color-mix(in srgb,var(--s1) 75%,#fff)}
#dl-root .jp .jp-tone-btn{padding:2px 8px;font:600 11px/1.5 var(--sans);color:var(--s1);border:1px solid var(--ln2);background:color-mix(in srgb,var(--s1) 8%,transparent)}
#dl-root .jp .jp-tone-btn:hover:not([disabled]){border-color:var(--s1)}
#dl-root .jp .jp-tone-btn[disabled]{opacity:.38;cursor:not-allowed}
#dl-root .jp-say{grid-column:2/4;min-height:1.65em;color:var(--tx2);font-size:13px}
#dl-root .jp-say q{quotes:"「" "」";color:var(--tx)}
#dl-root .jp-say .cur{display:inline-block;width:.45em;height:1em;margin-left:2px;vertical-align:-.12em;background:var(--s1);animation:sxBlink 1s steps(1) infinite}
#dl-root .jp-hs{grid-row:1;grid-column:3;display:flex;gap:18px}
#dl-root .jp-hs div{text-align:right}
#dl-root .jp-hs b{display:block;font:700 22px/1 var(--mono);color:var(--s1);text-shadow:0 0 12px var(--sg);font-variant-numeric:tabular-nums}
#dl-root .jp-hs b small{font-size:12px;color:var(--tx3);margin-left:2px}
#dl-root .jp-hs span{font:600 10px/1.9 var(--mono);letter-spacing:.2em;color:var(--tx3)}

#dl-root .jp-tone{padding:12px 20px 14px;background:rgba(0,0,0,.32);border-bottom:1px solid var(--ln)}
#dl-root .jp-tone-in{display:flex;flex-direction:column;gap:10px}
#dl-root .jp-tone-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#dl-root .jp-tone label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--tx2)}
#dl-root .jp-tone input,#dl-root .jp-tone textarea{width:100%;padding:7px 10px;font:13px/1.5 var(--sans);color:var(--tx);background:#05060a;border:1px solid var(--ln2);outline:none;border-radius:0}
#dl-root .jp-tone input:focus,#dl-root .jp-tone textarea:focus{border-color:var(--s1)}
#dl-root .jp-tone-pre{display:flex;flex-wrap:wrap;gap:6px}
#dl-root .jp .jp-tone-pre button{padding:4px 10px;font:600 12px/1.4 var(--serif);color:var(--tx2);border:1px solid var(--ln2);background:rgba(255,255,255,.02)}
#dl-root .jp .jp-tone-pre button[aria-pressed="true"]{color:var(--s2);background:var(--s1);border-color:var(--s1)}
#dl-root .jp-tone-acts{display:flex;justify-content:flex-end;gap:8px}
#dl-root .jp .jp-tone-acts .jp-btn{min-height:34px;padding:0 14px;font-size:12px}

#dl-root .jp-sec{position:relative;padding:16px 20px}
#dl-root .jp-sec+.jp-sec{border-top:1px solid var(--ln)}
#dl-root .jp-st{display:flex;align-items:center;gap:10px;margin:0 0 12px;font:700 11px/1 var(--mono);letter-spacing:.3em;color:color-mix(in srgb,var(--s1) 80%,#fff)}
#dl-root .jp-st::before{content:"";width:14px;height:2px;background:var(--s1);box-shadow:0 0 6px var(--s1)}
#dl-root .jp-st::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--ln2),transparent)}
#dl-root .jp-st em{order:2;font-style:normal;font-weight:500;letter-spacing:.12em;color:var(--tx3)}
#dl-root .jp-none{color:var(--tx3);font-size:12.5px}

#dl-root .jp .jp-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 18px;font:700 13px/1 var(--serif);letter-spacing:.2em;color:var(--s1);border:1px solid var(--ln2);background:color-mix(in srgb,var(--s1) 6%,transparent);clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);transition:background .25s,border-color .25s,color .25s,transform .15s}
#dl-root .jp .jp-btn:hover:not([disabled]){border-color:var(--s1);background:color-mix(in srgb,var(--s1) 14%,transparent)}
#dl-root .jp .jp-btn:active:not([disabled]){transform:translateY(1px)}
#dl-root .jp .jp-btn.pri{color:var(--s2);background:linear-gradient(100deg,color-mix(in srgb,var(--s1) 80%,#fff),var(--s1));border-color:transparent;box-shadow:0 0 18px var(--sg)}
#dl-root .jp .jp-btn[disabled]{opacity:.38;cursor:not-allowed;filter:saturate(.3)}
#dl-root .jp .jp-btn svg{width:15px;height:15px}
#dl-root .jp .jp-seg{display:inline-flex;border:1px solid var(--ln2)}
#dl-root .jp .jp-seg button{padding:7px 14px;font:600 12px/1 var(--serif);letter-spacing:.16em;color:var(--tx2);transition:background .25s,color .25s}
#dl-root .jp .jp-seg button[aria-pressed="true"]{color:var(--s2);background:var(--s1)}
#dl-root .jp-chip{display:inline-flex;align-items:center;gap:5px;padding:2px 7px;font:600 11px/1.5 var(--mono);letter-spacing:.06em;color:var(--tx2);border:1px solid var(--ln2)}
#dl-root .jp-chip[data-tier]{color:var(--c1);border-color:color-mix(in srgb,var(--c1) 45%,transparent);background:color-mix(in srgb,var(--c1) 8%,transparent)}

#dl-root .jp-tks{display:grid;gap:8px}
#dl-root .jp-tk{--kc:var(--tx3);position:relative;display:grid;grid-template-columns:26px minmax(0,1fr);background:rgba(255,255,255,.025);border:1px solid var(--ln);overflow:hidden;transition:border-color .3s,background .3s}
#dl-root .jp-tk[data-c="主线"]{--kc:var(--s1)}
#dl-root .jp-tk[data-c="突发"]{--kc:#FF9A3D}
#dl-root .jp-tk:hover{border-color:var(--ln2);background:rgba(255,255,255,.04)}
#dl-root .jp-tk-k{display:grid;place-items:center;writing-mode:vertical-rl;font:800 11px/1 var(--serif);letter-spacing:.4em;color:var(--s2);background:var(--kc)}
#dl-root .jp-tk[data-c="日常"] .jp-tk-k{color:var(--tx2);background:rgba(255,255,255,.06)}
#dl-root .jp-tk[data-c="突发"] .jp-tk-k{background:repeating-linear-gradient(-45deg,#FF9A3D 0 6px,#E07A1C 6px 12px)}
#dl-root .jp-tk-b{padding:9px 12px 10px;min-width:0}
#dl-root .jp-tk-t{display:flex;align-items:baseline;gap:10px}
#dl-root .jp-tk-t b{font:700 14px/1.4 var(--serif);letter-spacing:.06em}
#dl-root .jp-tk-t time{margin-left:auto;flex:none;font:600 11px/1 var(--mono);color:var(--tx3)}
#dl-root .jp-tk-t time[data-k="soon"]{color:var(--warn)}
#dl-root .jp-tk-c{margin-top:3px;color:var(--tx2);font-size:12.5px}
#dl-root .jp-tk-f{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:7px;font-size:11.5px;color:var(--tx3)}
#dl-root .jp-tk-f .g{color:var(--tx)}#dl-root .jp-tk-f .g::before{content:"奖 ";color:var(--kc);font-family:var(--mono)}
#dl-root .jp-tk-f .l::before{content:"罚 ";color:var(--bad);font-family:var(--mono)}
#dl-root .jp-tk[data-s="已完成"],#dl-root .jp-tk[data-s="已失败"]{opacity:.55}
#dl-root .jp-tk[data-s="已完成"] .jp-tk-t b{text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--ok) 70%,transparent)}
#dl-root .jp-tk[data-s="已失败"] .jp-tk-t b{text-decoration:line-through;text-decoration-color:var(--bad)}
#dl-root .jp-tk-stamp{position:absolute;right:12px;bottom:6px;padding:1px 6px;font:900 13px/1.3 var(--serif);letter-spacing:.3em;border:2px solid;transform:rotate(-8deg);opacity:.9}
#dl-root .jp-tk[data-s="已完成"] .jp-tk-stamp{color:var(--ok)}#dl-root .jp-tk[data-s="已失败"] .jp-tk-stamp{color:var(--bad)}

#dl-root .jp-lg{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
#dl-root .jp-rw{position:relative;padding:10px 12px 10px 15px;border:1px solid color-mix(in srgb,var(--c1,#888) 30%,transparent);background:linear-gradient(100deg,color-mix(in srgb,var(--c1,#888) 13%,transparent),transparent 70%),rgba(0,0,0,.25);overflow:hidden}
#dl-root .jp-rw::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--c1,#888);box-shadow:0 0 10px var(--c1,#888)}
#dl-root .jp-rw[data-tier="彩"]::before{background:linear-gradient(180deg,#FF5A5F,#FFE45C,#5FD88A,#3FC1F0,#D96BFF)}
#dl-root .jp-rw[data-tier="金"]::after,#dl-root .jp-rw[data-tier="彩"]::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 40%,rgba(255,240,190,.16) 50%,transparent 60%);background-size:250% 100%;animation:qyShine 4.4s var(--ease) infinite;pointer-events:none}
#dl-root .jp-rw-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#dl-root .jp-rw-h b{font:700 14.5px/1.35 var(--serif);color:#fff}
#dl-root .jp-rw-t{flex:none;padding:1px 5px;font:800 10.5px/1.4 var(--mono);color:#0b0c10;background:var(--c1,#888)}
#dl-root .jp-rw[data-tier="彩"] .jp-rw-t{background:linear-gradient(90deg,#FF5A5F,#FFE45C,#3FC1F0,#D96BFF)}
#dl-root .jp-rw-x{margin-left:auto;flex:none;padding:1px 6px;font:700 10.5px/1.4 var(--mono);letter-spacing:.08em;color:var(--s3);border:1px solid color-mix(in srgb,var(--s3) 55%,transparent);text-shadow:0 0 6px var(--s3)}
#dl-root .jp-rw p{margin-top:4px;color:var(--tx2);font-size:12px}
#dl-root .jp-rw-f{display:flex;align-items:center;gap:10px;margin-top:7px;font:600 10.5px/1 var(--mono);color:var(--tx3);letter-spacing:.06em;flex-wrap:wrap}
#dl-root .jp-rw-f .to{color:var(--tx)}#dl-root .jp-rw-f .to::before{content:"→ ";color:var(--c1,#888)}
#dl-root .jp-rw-f .wait{margin-left:auto;display:inline-flex;align-items:center;gap:5px;color:var(--warn)}
#dl-root .jp-rw-f .wait::before{content:"";width:5px;height:5px;background:var(--warn);animation:jpPulse 1.4s ease-in-out infinite}
#dl-root .jp-rw.new{animation:jpDrop .7s var(--snap) both}
#dl-root .jp-log{display:grid;gap:2px;margin-top:10px;padding:0;margin-bottom:0;font-size:12px;color:var(--tx3)}
#dl-root .jp-log li{display:flex;gap:10px;list-style:none}
#dl-root .jp-log b{font-weight:500;color:var(--tx2)}#dl-root .jp-log time{margin-left:auto;font-family:var(--mono)}

#dl-root .jp-toast{position:absolute;left:50%;bottom:14px;z-index:30;max-width:calc(100% - 32px);padding:9px 16px;font:600 13px/1.4 var(--serif);letter-spacing:.06em;color:var(--s2);background:var(--s1);box-shadow:0 0 24px var(--sg);transform:translateX(-50%);animation:jpToast 2.6s var(--ease) both;pointer-events:none}
#dl-root .jp-spark{position:absolute;z-index:25;width:4px;height:4px;background:var(--c,#fff);box-shadow:0 0 6px var(--c,#fff);pointer-events:none}

#dl-root .jp-dk{display:inline-flex;align-items:center;gap:5px;padding:2px 6px;font:700 12px/1 ui-monospace,Consolas,monospace;color:var(--s1);font-variant-numeric:tabular-nums;background:transparent;border:0;cursor:pointer;white-space:nowrap}
#dl-root .jp-dk svg{width:15px;height:15px;flex:none;filter:drop-shadow(0 0 4px var(--sg))}
#dl-root .jp-dk small{font-weight:500;color:var(--dl-ink3,#7a8090)}
#dl-root .jp-dk[data-k="dim"]{color:var(--dl-ink3,#7a8090)}
#dl-root .jp-dk[data-k="hot"] svg{animation:jpPulse 1.6s ease-in-out infinite}
#dl-root .jp-dk .dot{width:6px;height:6px;background:var(--s3);box-shadow:0 0 6px var(--s3)}

/* ── 正文 <系统> 标签六套皮肤 ── */
[data-dlp-theme] .sx{position:relative;max-width:560px;margin:16px auto;padding:14px 18px 16px;font:14.5px/1.75 var(--dlp-sans,system-ui,sans-serif);color:#E8ECF2;background:var(--s2);border:1px solid color-mix(in srgb,var(--s1) 45%,transparent);isolation:isolate;overflow:hidden;--dlp-on:#E8ECF2;--dlp-on2:#A9B0BF}
[data-dlp-theme] .sx-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px}
[data-dlp-theme] .sx-ding{font:900 15px/1 var(--dlp-serif,serif);letter-spacing:.3em;color:var(--s1)}
[data-dlp-theme] .sx-nm{font:700 13px/1 var(--dlp-serif,serif);letter-spacing:.2em;color:#fff}
[data-dlp-theme] .sx-k{margin-left:auto;padding:4px 8px;font:600 11px/1 ui-monospace,Consolas,monospace;letter-spacing:.2em;color:var(--s2);background:var(--s1)}
[data-dlp-theme] .qt-sx-t{margin:0 0 4px;font:800 15px/1.4 var(--dlp-serif,serif);letter-spacing:.1em;color:#fff}
[data-dlp-theme] .qt-sx[data-cat="警告"] .sx-k{background:#FF7A86!important;color:#1a0508!important}
[data-dlp-theme] .qt-sx[data-cat="任务失败"] .sx-k{background:#6f7689!important;color:#fff!important}
[data-dlp-theme] .sx-line{margin:4px 0 0;min-height:1.5em}
[data-dlp-theme] .sx.in{animation:sxIn .7s var(--gf-t,0s) cubic-bezier(.7,0,.2,1) both}
[data-dlp-theme] .sx[data-sys="sim"]{background:linear-gradient(180deg,rgba(8,40,52,.9),rgba(3,16,22,.94)),var(--s2);border-color:rgba(95,227,240,.55);box-shadow:0 0 24px rgba(95,227,240,.16),inset 0 0 30px rgba(95,227,240,.08)}
[data-dlp-theme] .sx[data-sys="sim"]::before{content:"";position:absolute;inset:0;z-index:-1;background:repeating-linear-gradient(0deg,rgba(95,227,240,.06) 0 1px,transparent 1px 3px)}
[data-dlp-theme] .sx[data-sys="sim"]::after{content:"";position:absolute;left:0;right:0;top:-30%;height:30%;background:linear-gradient(180deg,transparent,rgba(95,227,240,.14),transparent);animation:sxScan 3.2s linear infinite;pointer-events:none}
[data-dlp-theme] .sx[data-sys="sim"] .sx-nm::before{content:"◇ ";color:var(--s1)}
[data-dlp-theme] .sx[data-sys="sim"].in{animation:sxGlitch .6s var(--gf-t,0s) steps(6) both}
[data-dlp-theme] .sx[data-sys="pts"]{padding-left:26px;background:linear-gradient(100deg,rgba(10,36,84,.95),rgba(3,11,28,.96));border-color:rgba(76,155,255,.5);font-family:ui-monospace,Consolas,monospace;font-size:13.5px}
[data-dlp-theme] .sx[data-sys="pts"]::before{content:"";position:absolute;left:9px;top:12px;bottom:12px;width:4px;background:repeating-linear-gradient(180deg,var(--s1) 0 3px,transparent 3px 7px);opacity:.7;animation:sxFlowY 1.2s linear infinite}
[data-dlp-theme] .sx[data-sys="pts"] .sx-ding{font-family:ui-monospace,Consolas,monospace;letter-spacing:.1em}
[data-dlp-theme] .sx[data-sys="hero"]{background:radial-gradient(60% 90% at 85% 0%,rgba(185,148,255,.28),transparent 70%),radial-gradient(1px 1px at 20% 30%,#fff8,transparent),radial-gradient(1px 1px at 70% 60%,#fff6,transparent),radial-gradient(1px 1px at 40% 80%,#fff7,transparent),linear-gradient(180deg,#120b26,#07040f);border:1px solid rgba(255,211,107,.45);border-top:2px solid var(--s3)}
[data-dlp-theme] .sx[data-sys="hero"] .sx-ding{color:var(--s3)}
[data-dlp-theme] .sx[data-sys="hero"] .sx-k{background:linear-gradient(90deg,var(--s3),var(--s1))}
[data-dlp-theme] .sx[data-sys="hero"]::after{content:"";position:absolute;right:-40px;top:-40px;width:120px;height:120px;border:1px solid rgba(255,211,107,.25);transform:rotate(45deg);box-shadow:0 0 0 10px rgba(185,148,255,.06),0 0 0 22px rgba(185,148,255,.04);animation:sxTurn 18s linear infinite;z-index:-1}
[data-dlp-theme] .sx[data-sys="sign"]{background:linear-gradient(135deg,rgba(230,181,98,.10),transparent 40%),linear-gradient(180deg,#24160a,#130b04);border:1px solid #8a6328;box-shadow:inset 0 0 0 3px #130b04,inset 0 0 0 4px rgba(230,181,98,.5)}
[data-dlp-theme] .sx[data-sys="sign"] .sx-ding,[data-dlp-theme] .sx[data-sys="sign"] .sx-nm{color:var(--s3)}
[data-dlp-theme] .sx[data-sys="sign"] .sx-k{color:#2a1808;background:linear-gradient(180deg,#F4D28E,#B9852F)}
[data-dlp-theme] .sx[data-sys="sign"]::after{content:"签";position:absolute;right:14px;bottom:10px;z-index:-1;display:grid;place-items:center;width:46px;height:46px;font:900 26px/1 var(--dlp-serif,serif);color:rgba(230,181,98,.22);border:2px solid rgba(230,181,98,.22);transform:rotate(-10deg)}
[data-dlp-theme] .sx[data-sys="sign"].in::after{animation:sxStamp .7s .25s cubic-bezier(.7,0,.2,1) both}
[data-dlp-theme] .sx[data-sys="gacha"]{padding-top:18px;background:linear-gradient(180deg,#1a1222,#0b0810);border-color:rgba(255,179,65,.4)}
[data-dlp-theme] .sx[data-sys="gacha"]::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#F4F1EA 0 16.6%,#F2D46B 0 33.3%,#C3A2F2 0 50%,#F0565E 0 66.6%,#F6D877 0 83.3%,transparent 0),conic-gradient(from var(--qa,0deg),#FF5A5F,#FFE45C,#3FC1F0,#D96BFF,#FF5A5F);animation:qyHue 4s linear infinite}
[data-dlp-theme] .sx[data-sys="gacha"]::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(100deg,transparent 35%,rgba(255,236,190,.12),transparent 65%);transform:translateX(-100%);animation:sxSweep 3.4s cubic-bezier(.2,.7,.2,1) infinite}
[data-dlp-theme] .sx[data-sys="chat"]{background:linear-gradient(180deg,#0c201d,#061210);border-color:rgba(124,245,200,.4);border-left:3px solid var(--s1)}
[data-dlp-theme] .sx[data-sys="chat"] .sx-ding{font-size:13px;letter-spacing:.1em}

@container jp (max-width:560px){
  #dl-root .jp-hd{grid-template-columns:auto minmax(0,1fr);padding:14px 16px 12px}
  #dl-root .jp-hs{grid-column:1/-1;grid-row:auto;justify-content:flex-start;gap:22px;padding-top:6px}
  #dl-root .jp-hs div{text-align:left}
  #dl-root .jp-say{grid-column:1/-1}
  #dl-root .jp-mark{width:44px;height:44px;grid-row:span 1}
  #dl-root .jp-nm b{font-size:19px}
  #dl-root .jp-sec{padding:14px 16px}
  #dl-root .jp-lg{grid-template-columns:1fr}
  #dl-root .jp-st{flex-wrap:wrap;row-gap:5px;white-space:nowrap}
  #dl-root .jp-st em{order:3;flex:1 0 100%;padding-left:24px;font-size:10px;letter-spacing:.06em;white-space:normal}
  #dl-root .jp-tone-row{grid-template-columns:1fr}
}
#dl-root[data-motion="off"] .jp *,#dl-root[data-motion="off"] .jp *::before,#dl-root[data-motion="off"] .jp *::after,#dl-root[data-motion="off"] .jp-dk svg,[data-dlp-motion="off"] .sx,[data-dlp-motion="off"] .sx *,[data-dlp-motion="off"] .sx::before,[data-dlp-motion="off"] .sx::after{animation:none!important;transition:none!important}
#dl-root[data-motion="reduced"] .jp-rw::after,#dl-root[data-motion="reduced"] .jp-say .cur,#dl-root[data-motion="reduced"] .jp-dk[data-k="hot"] svg,[data-dlp-motion="reduced"] .sx::before,[data-dlp-motion="reduced"] .sx::after{animation:none!important}
@media (prefers-reduced-motion:reduce){#dl-root .jp *,#dl-root .jp *::before,#dl-root .jp *::after,#dl-root .jp-dk svg,[data-dlp-theme] .sx,[data-dlp-theme] .sx *,[data-dlp-theme] .sx::before,[data-dlp-theme] .sx::after{animation:none!important;transition:none!important}}
`;

  return {
    GF, INFO, BRIDGE, CSS, TIER, esc, gfOf, mine, dayNo, daysTo, short, year, tierIn,
    motionOf, still, frag, typeIn, roll, burst, toast, disabled, act, syncBar,
    lockBanner, caveat, head, bindToneEditor, tasks, rewardCard, ledger, swap, dockMark,
    parseBlock, systemBlock,
  };
}

/* 斗罗 · 官方扩展主机（window.DLExt / window.__DL_EXT__）
 * 由 斗罗ZOD 启动时挂载到酒馆主窗口 W（见 源码/zod/入口.js、build.py），无加载先后依赖：
 *   - 扩展脚本先跑时可压入 W.__DL_EXT_QUEUE__，本模块启动后立即排空接管；后跑时直接调 W.DLExt.register(...)
 *   - 封装 ADR 0008 的 MVU 命令认领守卫（liveVars 前后夹逼 + 已卸载实例静默放行）、每轮更新把关、结局锁、
 *     D4 最新 AI 楼层互动写入 act()、remind 自动同步到 stat_data.金手指.提醒、小手机应用桥接与 iframe 卸载自清理
 * 契约见 共享契约 #11、设计决定 §25、ADR 0010。
 */

function createDLExtHost(hostDeps) {
  const {
    hostZ,
    hostEventOn,
    hostRegisterMvuSchema,
    hostWaitGlobalInitialized,
    hostGetVariables,
    hostReplaceVariables,
    hostGenerateRaw,
  } = hostDeps;

  const W = (() => {
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window && window.parent.document) {
        return window.parent;
      }
    } catch (_) { /* 跨域退回本窗口 */ }
    return typeof window !== 'undefined' ? window : globalThis;
  })();
  const D = W && W.document ? W.document : null;
  const MapCtor = (W && W.Map) || Map;

  const EVENTS = {
    CHAT_CHANGED: 'chat_id_changed',
    MESSAGE_RECEIVED: 'message_received',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_SWIPED: 'message_swiped',
    MESSAGE_EDITED: 'message_edited',
    MESSAGE_UPDATED: 'message_updated',
    MESSAGE_DELETED: 'message_deleted',
    GENERATION_STARTED: 'generation_started',
    GENERATION_ENDED: 'generation_ended',
    GENERATION_STOPPED: 'generation_stopped',
  };
  const OPENING_KEY = '斗罗开局';
  const BUILTIN_GF_KEYS = new Set(GFS.map((g) => GF_INFO[g].key));

  function ensureMap(obj, key) {
    const cur = obj && obj[key];
    if (cur && typeof cur.get === 'function' && typeof cur.set === 'function') return cur;
    const m = new MapCtor();
    if (obj) obj[key] = m;
    return m;
  }

  function emit(win, name, detail) {
    if (!win || typeof win.dispatchEvent !== 'function') return;
    try {
      const CEv = win.CustomEvent || (typeof CustomEvent === 'function' ? CustomEvent : null);
      if (detail !== undefined && typeof CEv === 'function') {
        win.dispatchEvent(new CEv(name, { detail }));
        return;
      }
      const Ev = CEv || win.Event || (typeof Event === 'function' ? Event : null);
      if (typeof Ev === 'function') win.dispatchEvent(new Ev(name));
    } catch (_) { /* 主页面已关 */ }
  }

  function registry(key) {
    const m = W && W[key];
    if (m && typeof m.get === 'function' && typeof m.set === 'function') return m;
    const created = new MapCtor();
    if (W) W[key] = created;
    return created;
  }

  function sanitizeSvg(raw) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s) return '';
    return s
      .replace(/<script[\s\S]*?<\/script>/giu, '')
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, '')
      .replace(/javascript\s*:/giu, '');
  }

  function isFrameDead(sw) {
    if (!sw || sw === W || (typeof window !== 'undefined' && sw === window)) return false;
    try {
      if (sw.closed === true) return true;
      if (sw.frameElement && sw.frameElement.isConnected === false) return true;
    } catch (_) {
      return true;
    }
    return false;
  }

  function ctxOf() {
    try { return W && W.SillyTavern && W.SillyTavern.getContext ? W.SillyTavern.getContext() : null; } catch (_) { return null; }
  }

  function callGetVars(sw, opt) {
    const fns = [sw && sw.getVariables, hostGetVariables, W && W.getVariables];
    for (const fn of fns) {
      if (typeof fn !== 'function') continue;
      try { return fn(opt); } catch (_) { /* try next */ }
    }
    return {};
  }

  function openingRecord(sw) {
    try {
      const v = callGetVars(sw, { type: 'chat' });
      const r = v && v[OPENING_KEY];
      return r && typeof r === 'object' ? r : null;
    } catch (_) { return null; }
  }

  function mvuOf(sw) {
    return (sw && sw.Mvu) || (typeof window !== 'undefined' && window.Mvu) || (W && W.Mvu) || null;
  }

  function latestStatAny(sw) {
    const c = ctxOf(), n = c && Array.isArray(c.chat) ? c.chat.length : 0;
    for (let i = n - 1; i >= 0; i -= 1) {
      try {
        const M = mvuOf(sw);
        const v = M && typeof M.getMvuData === 'function'
          ? M.getMvuData({ type: 'message', message_id: i })
          : callGetVars(sw, { type: 'message', message_id: i });
        if (v && v.stat_data && typeof v.stat_data === 'object' && Object.keys(v.stat_data).length) return v.stat_data;
      } catch (_) { /* ignore */ }
    }
    return null;
  }

  function latestAiFloor(sw) {
    const c = ctxOf(), list = c && Array.isArray(c.chat) ? c.chat : [];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const m = list[i];
      if (!m || m.is_user || m.is_system) continue;
      try {
        const M = mvuOf(sw);
        const v = M && typeof M.getMvuData === 'function'
          ? M.getMvuData({ type: 'message', message_id: i })
          : callGetVars(sw, { type: 'message', message_id: i });
        if (v && v.stat_data && typeof v.stat_data === 'object' && Object.keys(v.stat_data).length) {
          return { floor: i, data: v, stat: v.stat_data };
        }
      } catch (_) { /* ignore */ }
    }
    return null;
  }

  async function writeFloor(sw, floor, data) {
    const M = mvuOf(sw);
    if (M && typeof M.replaceMvuData === 'function') {
      await M.replaceMvuData(data, { type: 'message', message_id: floor });
      return;
    }
    const rep = (sw && sw.replaceVariables) || hostReplaceVariables || (W && W.replaceVariables);
    if (typeof rep === 'function') {
      await rep(data, { type: 'message', message_id: floor });
      return;
    }
    throw new Error('找不到 Mvu.replaceMvuData 或 replaceVariables');
  }

  async function backgroundGenerate(sw, messages, opts = {}) {
    try {
      const ph = W && W.__DL_PHONE__;
      if (ph && typeof ph.generate === 'function') {
        return await ph.generate(messages, opts);
      }
    } catch (e) {
      if (e && e.fromPhoneApi) throw e;
    }
    const gen = (sw && sw.generateRaw) || hostGenerateRaw || (W && W.generateRaw);
    if (typeof gen === 'function') {
      const out = await gen({
        ordered_prompts: messages,
        should_stream: false,
        ...(opts.max_tokens ? { max_tokens: opts.max_tokens } : {}),
      });
      return { text: String(out || ''), via: 'tavern' };
    }
    throw new Error('当前环境没有可用的后台生成接口（既未启用斗罗小手机，也找不到 generateRaw）');
  }

  function disabledReason(kit, statHint) {
    if (kit && kit.floor != null) return '正在查看历史快照，切回最新楼层后再操作';
    try {
      if (W && W.DLStatusBar && W.DLStatusBar.state && W.DLStatusBar.state.floor != null) {
        return '正在查看历史快照，切回最新楼层后再操作';
      }
    } catch (_) { /* ignore */ }
    if (D && D.body && D.body.dataset && D.body.dataset.generating === 'true') return 'AI 正在生成，等本轮写完后再操作';
    if (D && D.documentElement && D.documentElement.hasAttribute && D.documentElement.hasAttribute('data-dlc-ended')) {
      return '此局已终，不再操作';
    }
    if (statHint && typeof statHint === 'object') {
      const lEnd = statHint.主角 && statHint.主角.气运 && statHint.主角.气运.结局;
      const cEnd = statHint.叙事核心 && statHint.叙事核心.结局;
      if ((lEnd && lEnd.已终结 === true) || (cEnd && cEnd.已终结 === true)) return '此局已终，不再操作';
    }
    return '';
  }

  function syncBar() {
    try { if (W && W.__DL_BAR__ && typeof W.__DL_BAR__.refresh === 'function') W.__DL_BAR__.refresh(0); } catch (_) { /* ignore */ }
  }

  function makeListen(sw, stops, tag) {
    const evOn = (sw && typeof sw.eventOn === 'function') ? sw.eventOn : hostEventOn;
    return function listen(name, fn) {
      if (!name || typeof evOn !== 'function') return;
      try {
        const r = evOn(name, fn);
        stops.push(typeof r === 'function' ? r : r && typeof r.stop === 'function' ? () => r.stop() : () => {});
      } catch (e) { console.warn(`[${tag}] 监听 ${name} 失败`, e); }
    };
  }

  function registerExtSchema(sw, extRegMvu, buildRoot, tag) {
    const useExtBus = !!(sw && typeof extRegMvu === 'function' && typeof sw.eventOn === 'function');
    const evOn = useExtBus ? sw.eventOn : hostEventOn;
    const regFn = useExtBus ? extRegMvu : hostRegisterMvuSchema;
    if (typeof evOn !== 'function' || typeof regFn !== 'function') return;

    let liveVars = null;
    const rootSchema = buildRoot(() => (liveVars && liveVars.stat_data) || null);

    if (useExtBus) {
      try { sw.registerVariableSchema = undefined; } catch (_) { /* ignore */ }
      evOn('mag_variable_initialized', (vars) => { liveVars = vars; });
      evOn('mag_command_parsed_for_zod', (vars) => { liveVars = vars; });
      regFn(rootSchema);
      evOn('mag_variable_initialized', () => { liveVars = null; });
      evOn('mag_command_parsed_for_zod', () => { liveVars = null; });
    } else {
      // 未传独立 iframe 的 registerMvuSchema 时借宿主通道注册，临时屏蔽 registerVariableSchema 免得覆盖主结构展示
      const hostWin = typeof window !== 'undefined' ? window : null;
      const saved = hostWin ? hostWin.registerVariableSchema : undefined;
      try {
        if (hostWin) hostWin.registerVariableSchema = undefined;
        evOn('mag_variable_initialized', (vars) => { liveVars = vars; });
        evOn('mag_command_parsed_for_zod', (vars) => { liveVars = vars; });
        regFn(rootSchema);
        evOn('mag_variable_initialized', () => { liveVars = null; });
        evOn('mag_command_parsed_for_zod', () => { liveVars = null; });
      } catch (e) {
        console.error(`[${tag}] 变量结构注册失败`, e);
      } finally {
        try { if (hostWin && saved !== undefined) hostWin.registerVariableSchema = saved; } catch (_) { /* ignore */ }
      }
    }
  }

  function attachAutoUnload(sw, destroy) {
    if (!sw || sw === W || (typeof window !== 'undefined' && sw === window)) return;
    try {
      if (typeof sw.addEventListener === 'function') {
        sw.addEventListener('pagehide', () => destroy(), { once: true });
        sw.addEventListener('unload', () => destroy(), { once: true });
      }
    } catch (_) { /* ignore */ }
  }

  function validateCoreDef(raw) {
    if (!raw || typeof raw !== 'object') return { ok: false, why: '叙事核心定义须为对象' };
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!isValidCoreId(id)) return { ok: false, why: `叙事核心 id 无效（须 1~12 字且不含空白/中点/斜杠）：${id}` };
    if (CORES.includes(id)) return { ok: false, why: `叙事核心「${id}」与内置七核重名` };
    const fullName = typeof raw.全名 === 'string' ? raw.全名.trim() : '';
    const quote = typeof raw.引 === 'string' ? raw.引.trim() : '';
    const desc = typeof raw.述 === 'string' ? raw.述.trim() : '';
    if (!fullName || !quote || !desc) return { ok: false, why: `叙事核心「${id}」缺少 全名 / 引 / 述` };
    if (!Array.isArray(raw.签) || raw.签.length < 1 || raw.签.length > 3) {
      return { ok: false, why: `叙事核心「${id}」签须为 1~3 个短词` };
    }
    const tags = raw.签.map((x) => String(x == null ? '' : x).trim()).filter(Boolean);
    if (!tags.length) return { ok: false, why: `叙事核心「${id}」签不能为空` };
    const col = raw.色 && typeof raw.色 === 'object' ? raw.色 : null;
    if (!col || !col.k1 || !col.k2 || !col.k3) return { ok: false, why: `叙事核心「${id}」色须含 { k1, k2, k3 }` };
    if (typeof raw.schema !== 'function') return { ok: false, why: `叙事核心「${id}」缺少 schema 函数` };
    if (typeof raw.page !== 'function' && (!raw.page || typeof raw.page !== 'object')) {
      return { ok: false, why: `叙事核心「${id}」缺少 page 定义` };
    }
    const subTitle = typeof raw.题 === 'string' && raw.题.trim()
      ? raw.题.trim()
      : (fullName.includes('·') ? fullName.split('·').slice(1).join('·') : id);
    const def = {
      ...raw,
      id,
      全名: fullName,
      题: subTitle,
      引: quote,
      述: desc,
      签: tags,
      色: { k1: String(col.k1).trim(), k2: String(col.k2).trim(), k3: String(col.k3).trim() },
      纹样: sanitizeSvg(raw.纹样),
      工坊: true,
    };
    return { ok: true, id, def };
  }

  function validateGfDef(raw, existingGfs) {
    if (!raw || typeof raw !== 'object') return { ok: false, why: '金手指定义须为对象' };
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!isValidGfId(id)) return { ok: false, why: `金手指 id 无效（须 1~12 字且不含空白/中点/斜杠）：${id}` };
    if (GFS.includes(id)) return { ok: false, why: `金手指「${id}」与内置六系统重名` };
    const key = typeof raw.key === 'string' ? raw.key.trim() : '';
    if (!GF_KEY_RE.test(key)) return { ok: false, why: `金手指「${id}」key 须匹配 /^[a-z0-9-]{2,16}$/` };
    if (BUILTIN_GF_KEYS.has(key)) return { ok: false, why: `金手指「${id}」key「${key}」与内置系统冲突` };
    if (existingGfs) {
      for (const [otherId, rec] of existingGfs.entries()) {
        if (otherId !== id && rec && !rec.destroyed && rec.def && rec.def.key === key) {
          return { ok: false, why: `金手指「${id}」key「${key}」与已注册扩展「${otherId}」冲突` };
        }
      }
    }
    const plaque = typeof raw.匾 === 'string' ? raw.匾.trim() : '';
    const tab = typeof raw.页签 === 'string' ? raw.页签.trim() : '';
    const defName = typeof raw.默认名 === 'string' ? raw.默认名.trim() : '';
    const defCall = typeof raw.默认称呼 === 'string' ? raw.默认称呼.trim() : '';
    const motto = typeof raw.语 === 'string' ? raw.语.trim() : '';
    const desc = typeof raw.说明 === 'string' ? raw.说明.trim() : '';
    if (!plaque || !tab || !defName || !defCall || !motto || !desc) {
      return { ok: false, why: `金手指「${id}」缺少 匾 / 页签 / 默认名 / 默认称呼 / 语 / 说明` };
    }
    if (typeof raw.气运知情 !== 'boolean') return { ok: false, why: `金手指「${id}」气运知情须为布尔值` };
    if (!Array.isArray(raw.色) || raw.色.length < 2 || !raw.色[0] || !raw.色[1]) {
      return { ok: false, why: `金手指「${id}」色须为 [主色, 底色]` };
    }
    if (typeof raw.schema !== 'function') return { ok: false, why: `金手指「${id}」缺少 schema 函数` };
    if (typeof raw.page !== 'function' && (!raw.page || typeof raw.page !== 'object')) {
      return { ok: false, why: `金手指「${id}」缺少 page 定义` };
    }
    if (raw.phoneApp != null) {
      const pa = raw.phoneApp;
      if (!pa || typeof pa !== 'object' || !pa.id || !pa.name || typeof pa.render !== 'function') {
        return { ok: false, why: `金手指「${id}」phoneApp 须含 { id, name, render }` };
      }
    }
    const def = {
      ...raw,
      id,
      key,
      匾: plaque,
      页签: tab,
      默认名: defName,
      默认称呼: defCall,
      语: motto,
      说明: desc,
      气运知情: raw.气运知情,
      色: raw.色.map((x) => String(x).trim()),
      口吻预设: Array.isArray(raw.口吻预设)
        ? normalizeGfToneList(raw.口吻预设, { 默认名: defName, 默认称呼: defCall })
        : (raw.口吻预设 || '系统'),
      门叶: sanitizeSvg(raw.门叶),
      门缝: sanitizeSvg(raw.门缝),
      工坊: true,
    };
    return { ok: true, id, def };
  }

  const extRoot = W.__DL_EXT__ && typeof W.__DL_EXT__ === 'object' ? W.__DL_EXT__ : {};
  extRoot.version = 1;
  ensureMap(extRoot, 'cores');
  ensureMap(extRoot, 'gfs');
  ensureMap(extRoot, 'luck');
  ensureMap(extRoot, 'phoneApps');
  W.__DL_EXT__ = extRoot;

  if (typeof LUCK_LIB !== 'undefined') {
    installLuckRuntime(W, LUCK_LIB, typeof LUCK_NOTES !== 'undefined' ? LUCK_NOTES : {});
  }

  function notifyRegistryChanged(detail) {
    emit(W, 'dl-ext-registry-changed', detail);
    emit(W, 'dl-ext-changed', detail);
    try { if (W.DLOpening && typeof W.DLOpening.refresh === 'function') W.DLOpening.refresh(); } catch (_) { /* ignore */ }
    syncBar();
  }

  function mountCoreInstance(def, opts = {}) {
    const id = def.id;
    const NAME = `斗罗扩展核心·${id}`;
    const sw = opts.scriptWin || null;
    const zInst = (sw && sw.z) || hostZ;
    const stops = [];
    const listen = makeListen(sw, stops, NAME);
    const on = (key, fn) => {
      const tev = (sw && sw.tavern_events) || (W && W.tavern_events) || {};
      listen(tev[key] || EVENTS[key], fn);
    };

    const baseCoreKit = coreKit(zInst);
    const K = {
      ...baseCoreKit,
      block: (coreOrShape, maybeShape, maybeFinish) => {
        if (typeof coreOrShape === 'string') {
          const fin = typeof maybeFinish === 'function' ? maybeFinish : (x) => x;
          return baseCoreKit.block(id, maybeShape || {}, fin);
        }
        const fin = typeof maybeShape === 'function' ? maybeShape : (x) => x;
        return baseCoreKit.block(id, coreOrShape || {}, fin);
      },
    };
    const rawCoreSchema = def.schema(zInst, K);
    const coreSchema = zInst.preprocess(
      (v) => (isPlainObj(v) ? v : {}),
      rawCoreSchema,
    ).transform((out) => (isPlainObj(out) ? { ...out, 核心: id } : { 核心: id }));

    let destroyed = false;
    let mounted = null;
    let timer = 0;
    const lock = D ? createEndingLock(W, id, NAME) : { set() {}, attach() {}, detach() {} };

    registerExtSchema(sw, opts.registerMvuSchema, (live) => {
      const inner = coreRootSchema(zInst, id, coreSchema, live);
      return zInst.any().transform((input) => {
        if (destroyed) {
          let now = null;
          try { now = live(); } catch (_) { now = null; }
          return isPlainObj(now) ? { ...now } : {};
        }
        return inner.parse(input);
      });
    }, NAME);

    function guard(vars, before) {
      if (destroyed) return;
      const after = vars && vars.stat_data;
      if (!after || typeof after !== 'object') return;
      const beforeStat = before && before.stat_data;
      const r = guardCore(id, coreSchema, after, beforeStat);
      if (r) {
        after.叙事核心 = r.value;
        if (r.note) console.warn(`[${NAME}] ${r.note}`);
      }
      if (typeof def.onUpdated === 'function' && after.叙事核心 && after.叙事核心.核心 === id) {
        const keep = JSON.parse(JSON.stringify(after.叙事核心));
        try {
          const ret = def.onUpdated(after.叙事核心, after, beforeStat);
          if (isPlainObj(ret)) after.叙事核心 = { ...ret, 核心: id };
          const r2 = coreSchema.safeParse(after.叙事核心);
          after.叙事核心 = r2.success ? r2.data : keep;
        } catch (e) {
          after.叙事核心 = keep;
          console.error(`[${NAME}] 核心更新处理出错，变量保持原样`, e);
        }
      }
    }

    const active = () => !destroyed && chatCore(openingRecord(sw), latestStatAny(sw)) === id;
    const endingOf = (stat) => {
      const c = stat && stat.叙事核心;
      return c && c.核心 === id && c.结局 && typeof c.结局 === 'object' && c.结局.已终结 === true ? c.结局 : null;
    };

    function mount() {
      if (!D || mounted || destroyed) return;
      const shared = DLC_SHARED(id, def);
      const spec = (typeof def.page === 'function'
        ? def.page({ W, D, K: shared, shared, CORE: id, INFO: def })
        : def.page) || {};
      const style = D.createElement('style');
      style.id = 'dl-core-style-' + id;
      style.textContent = spec.css || '';
      const old = D.getElementById ? D.getElementById(style.id) : null;
      if (old && typeof old.remove === 'function') old.remove();
      if (D.head && typeof D.head.appendChild === 'function') D.head.appendChild(style);
      const blocks = registry('__DL_PROSE_BLOCKS__');
      const bar = registry('__DL_BAR_EXT__');
      const tags = [];
      for (const [tag, renderer] of Object.entries(spec.blocks || {})) {
        blocks.set(tag, renderer);
        tags.push([tag, renderer]);
      }
      let barSpec = null;
      if (spec.bar && typeof spec.bar === 'object') {
        barSpec = {
          tab: spec.bar.tab || id,
          when: typeof spec.bar.when === 'function' ? spec.bar.when : (st) => !!(st && st.叙事核心 && st.叙事核心.核心 === id),
          ...spec.bar,
        };
        if (!barSpec.tab) barSpec.tab = id;
        bar.set('core:' + id, barSpec);
      }
      mounted = { spec, barSpec, tags, style };
      emit(W, 'dl-ext-changed');
    }

    function apply(stat, spec) {
      const sp = spec || (mounted && mounted.spec);
      if (!sp || typeof sp.apply !== 'function') return;
      try { sp.apply(stat, D); } catch (e) { console.error(`[${NAME}] 页面状态更新出错`, e); }
    }

    function unmount() {
      if (!mounted) return;
      const { spec, barSpec, tags, style } = mounted;
      mounted = null;
      apply(null, spec);
      try {
        const blocks = W.__DL_PROSE_BLOCKS__;
        const bar = W.__DL_BAR_EXT__;
        for (const [tag, r] of tags) if (blocks && blocks.get(tag) === r) blocks.delete(tag);
        if (bar && barSpec && bar.get('core:' + id) === barSpec) bar.delete('core:' + id);
        if (style && typeof style.remove === 'function') style.remove();
      } catch (_) { /* ignore */ }
      emit(W, 'dl-ext-changed');
    }

    function refreshNow() {
      if (destroyed) return;
      const want = active();
      if (want && !mounted) mount();
      else if (!want && mounted) unmount();
      const stat = mounted ? latestStatAny(sw) : null;
      apply(stat);
      try { lock.set(mounted ? endingOf(stat) : null); } catch (_) { /* ignore */ }
    }

    function refresh(immediate) {
      if (destroyed) return;
      if (immediate || !W || typeof W.setTimeout !== 'function') { refreshNow(); return; }
      if (typeof W.clearTimeout === 'function') W.clearTimeout(timer);
      timer = W.setTimeout(refreshNow, 80);
    }

    function destroy(dOpts = {}) {
      if (destroyed) return;
      destroyed = true;
      if (W && typeof W.clearTimeout === 'function') W.clearTimeout(timer);
      for (const s of stops.splice(0)) { try { s(); } catch (_) { /* ignore */ } }
      try { lock.detach(); } catch (_) { /* ignore */ }
      unmount();
      if (extRoot.cores.get(id) === rec) extRoot.cores.delete(id);
      if (!dOpts.silent) notifyRegistryChanged({ kind: 'core', id });
    }

    for (const k of Object.keys(EVENTS)) {
      if (k === 'GENERATION_STARTED' || k === 'GENERATION_STOPPED') continue;
      on(k, () => refresh(false));
    }
    try {
      if (D && typeof W.addEventListener === 'function') {
        lock.attach(listen, () => !!mounted && !!endingOf(latestStatAny(sw)));
      }
    } catch (_) { /* ignore */ }

    const waitFn = (sw && typeof sw.waitGlobalInitialized === 'function') ? sw.waitGlobalInitialized : hostWaitGlobalInitialized;
    Promise.resolve(typeof waitFn === 'function' ? waitFn('Mvu') : null).then(() => {
      const M = mvuOf(sw);
      if (destroyed || !M || !M.events) return;
      listen(M.events.VARIABLE_UPDATE_ENDED, (vars, before) => { guard(vars, before); refresh(false); });
    }, () => {});

    attachAutoUnload(sw, destroy);

    const rec = {
      type: 'core',
      id,
      def,
      scriptWin: sw,
      get destroyed() { return destroyed; },
      get mounted() { return !!mounted; },
      refresh: () => refresh(true),
      destroy,
    };
    extRoot.cores.set(id, rec);
    refresh(true);
    notifyRegistryChanged({ kind: 'core', id });
    return rec;
  }

  function mountGfInstance(def, opts = {}) {
    const id = def.id;
    const NAME = `斗罗扩展金手指·${id}`;
    const sw = opts.scriptWin || null;
    const zInst = (sw && sw.z) || hostZ;
    const stops = [];
    const listen = makeListen(sw, stops, NAME);
    const on = (key, fn) => {
      const tev = (sw && sw.tavern_events) || (W && W.tavern_events) || {};
      listen(tev[key] || EVENTS[key], fn);
    };

    const K = gfKit(zInst);
    K.block = (extraShape, finish) => gfBlockSchema(
      zInst, id, extraShape, finish,
      typeof GF_TONES !== 'undefined' ? GF_TONES : null,
      { win: W, 气运知情: def.气运知情 },
    );
    const commonSchema = K.pre(
      (v) => (gfIsPlainObj(v) ? v : {}),
      zInst.object(gfCommonShape(zInst, K, id, typeof GF_TONES !== 'undefined' ? GF_TONES : null, { win: W, 气运知情: def.气运知情 })),
    );
    const rawExtra = def.schema(zInst, K);
    const extraZod = rawExtra && typeof rawExtra.safeParse === 'function'
      ? K.pre((v) => (gfIsPlainObj(v) ? v : {}), rawExtra)
      : (gfIsPlainObj(rawExtra) ? K.pre((v) => (gfIsPlainObj(v) ? v : {}), zInst.object(rawExtra)) : null);
    const gfSchema = zInst.any().transform((v) => {
      const src = gfIsPlainObj(v) ? v : {};
      const cRes = commonSchema.safeParse(src);
      const cData = cRes.success ? cRes.data : commonSchema.parse({});
      if (!extraZod) return cData;
      const eRes = extraZod.safeParse(src);
      const eData = eRes.success && gfIsPlainObj(eRes.data) ? eRes.data : {};
      return { ...eData, ...cData };
    });

    function syncRemind(stat) {
      if (typeof def.remind !== 'function' || !stat || !gfIsPlainObj(stat.金手指) || stat.金手指.类型 !== id) return;
      try {
        const txt = def.remind(stat.金手指, stat);
        stat.金手指.提醒 = typeof txt === 'string' ? [...txt.trim()].slice(0, 160).join('') : '';
      } catch (e) {
        console.warn(`[${NAME}] remind 计算出错`, e);
      }
    }

    let destroyed = false;
    let mounted = null;
    let writing = false;
    let timer = 0;

    registerExtSchema(sw, opts.registerMvuSchema, (live) => {
      const inner = gfRootSchema(zInst, id, gfSchema, live);
      return zInst.any().transform((input) => {
        if (destroyed) {
          let now = null;
          try { now = live(); } catch (_) { now = null; }
          return isPlainObj(now) ? { ...now } : {};
        }
        return inner.parse(input);
      });
    }, NAME);

    function guard(vars, before) {
      if (destroyed) return;
      const after = vars && vars.stat_data;
      if (!after || typeof after !== 'object') return;
      const beforeStat = before && before.stat_data;
      const r = guardGf(id, gfSchema, after, beforeStat);
      if (r) {
        after.金手指 = r.value;
        if (r.note) console.warn(`[${NAME}] ${r.note}`);
      }
      if (after.金手指 && after.金手指.类型 === id) {
        const keep = JSON.parse(JSON.stringify(after.金手指));
        try {
          gfOnUpdatedCommon(id, after, beforeStat);
          if (typeof def.onUpdated === 'function') {
            const ret = def.onUpdated(after.金手指, after, beforeStat);
            if (gfIsPlainObj(ret)) after.金手指 = { ...after.金手指, ...ret, 类型: id };
          }
          syncRemind(after);
          const r2 = gfSchema.safeParse(after.金手指);
          after.金手指 = r2.success ? r2.data : keep;
        } catch (e) {
          after.金手指 = keep;
          console.error(`[${NAME}] 金手指更新处理出错，变量保持原样`, e);
        }
      }
    }

    const latestStat = () => {
      const hit = latestAiFloor(sw);
      return hit ? hit.stat : latestStatAny(sw);
    };
    const active = () => !destroyed && chatGf(openingRecord(sw), latestStat()) === id;

    async function act(action, payload, actOpts = {}) {
      if (destroyed) return { ok: false, why: '金手指扩展已卸载' };
      if (!active()) return { ok: false, why: '当前聊天未启用此金手指' };
      const hit = latestAiFloor(sw);
      const why = disabledReason(undefined, hit && hit.stat);
      if (why) return { ok: false, why };
      if (writing) return { ok: false, why: '上一次操作还在写入，稍等一下' };
      if (!hit || !hit.stat || !hit.stat.金手指 || hit.stat.金手指.类型 !== id) {
        return { ok: false, why: '最新 AI 楼层里找不到当前金手指变量' };
      }
      writing = true;
      try {
        const next = JSON.parse(JSON.stringify(hit.data));
        const stat = next.stat_data;
        let res;
        if (action === '改口吻') {
          res = gfApplyTone(stat.金手指, id, payload, W);
        } else if (typeof def.act === 'function') {
          const rewardZod = gfRewardSchema(zInst, K);
          const helpers = {
            stat,
            gfData: stat.金手指,
            getStat: () => stat,
            today: () => (stat.时空 && stat.时空.外界日期) || '',
            updateGf(fnOrPatch) {
              if (typeof fnOrPatch === 'function') {
                const ret = fnOrPatch(stat.金手指, stat);
                if (gfIsPlainObj(ret)) Object.assign(stat.金手指, ret, { 类型: id });
              } else if (gfIsPlainObj(fnOrPatch)) {
                Object.assign(stat.金手指, fnOrPatch, { 类型: id });
              }
              return stat.金手指;
            },
            addPendingReward(reward) {
              const todayStr = (stat.时空 && stat.时空.外界日期) || '';
              const part = (stat.时空 && stat.时空.当前部) || null;
              const rawRw = { 日期: todayStr, 状态: '待入账', ...(reward || {}) };
              const parsedRw = rewardZod.safeParse(rawRw);
              return gfPushPending(stat.金手指, parsedRw.success ? parsedRw.data : rawRw, part);
            },
            pickLuckReward(tier, source, rand) {
              const lib = typeof LUCK_LIB !== 'undefined' ? getLuckLib(LUCK_LIB, W) : null;
              const todayStr = (stat.时空 && stat.时空.外界日期) || '';
              return gfPickLuckReward(lib, stat, tier, source || '任务', todayStr, rand || Math.random);
            },
            rollPoolReward(rOpts = {}) {
              const pool = typeof GF_POOL !== 'undefined' ? GF_POOL : [];
              const lib = typeof LUCK_LIB !== 'undefined' ? getLuckLib(LUCK_LIB, W) : null;
              return gfRollPoolReward({ pool, luckLib: lib, stat, gfType: id, ...rOpts });
            },
            backgroundGenerate: (messages, gOpts) => backgroundGenerate(sw, messages, gOpts),
            generate: (messages, gOpts) => backgroundGenerate(sw, messages, gOpts),
            chat: () => { const c = ctxOf(); return c && Array.isArray(c.chat) ? c.chat : []; },
            record: () => openingRecord(sw),
            W,
            D,
          };
          const rawRes = await def.act(action, payload || {}, helpers);
          if (rawRes && typeof rawRes === 'object' && rawRes.ok === false) {
            return rawRes;
          }
          res = rawRes && typeof rawRes === 'object' ? { ok: true, ...rawRes } : { ok: true };
        } else {
          return { ok: false, why: `不支持的操作：${action}` };
        }
        if (!res || !res.ok) return res || { ok: false, why: '操作未生效' };
        syncRemind(stat);
        const parsed = gfSchema.safeParse(stat.金手指);
        if (!parsed.success) return { ok: false, why: '写入结果未通过结构校验' };
        stat.金手指 = parsed.data;
        await writeFloor(sw, hit.floor, next);
        if (!actOpts.deferRefresh) syncBar();
        return { ...res, ok: true, stat, floor: hit.floor };
      } catch (e) {
        console.error(`[${NAME}] 操作 ${action} 失败`, e);
        return { ok: false, why: `操作失败：${(e && e.message) || e}` };
      } finally {
        writing = false;
      }
    }

    function makeBridge() {
      return {
        act,
        syncBar,
        disabled: disabledReason,
        tones: typeof GF_TONES !== 'undefined' ? GF_TONES : null,
        openPhone(app, pOpts) {
          try {
            if (W && W.__DL_PHONE__ && typeof W.__DL_PHONE__.openApp === 'function') {
              W.__DL_PHONE__.openApp(app, pOpts);
              return true;
            }
            if (W && W.DLPhone && typeof W.DLPhone.open === 'function') {
              W.DLPhone.open();
              return true;
            }
          } catch (_) { /* ignore */ }
          return false;
        },
        hasPhoneApi() { return !!(W && W.__DL_PHONE__ && typeof W.__DL_PHONE__.generate === 'function'); },
      };
    }

    function mount() {
      if (mounted || destroyed) return;
      const bridge = makeBridge();
      const shared = DLGF_SHARED(id, def, bridge);
      const spec = (typeof def.page === 'function'
        ? def.page({ W, D, GF: id, INFO: def, BRIDGE: bridge, shared, act, disabledReason, syncBar })
        : def.page) || {};
      let style = null;
      if (D) {
        style = D.createElement('style');
        style.id = 'dl-gf-style-' + id;
        const ownCss = String(spec.css || '');
        style.textContent = ownCss.includes('#dl-root .jp{') ? ownCss : (shared.CSS + '\n' + ownCss);
        const old = D.getElementById ? D.getElementById(style.id) : null;
        if (old && typeof old.remove === 'function') old.remove();
        if (D.head && typeof D.head.appendChild === 'function') D.head.appendChild(style);
      }
      const blocks = registry('__DL_PROSE_BLOCKS__');
      const bar = registry('__DL_BAR_EXT__');
      const tags = [];
      const blockMap = spec.blocks === false
        ? {}
        : { 系统: shared.systemBlock, ...(spec.blocks || {}) };
      for (const [tag, renderer] of Object.entries(blockMap)) {
        if (!renderer) continue;
        blocks.set(tag, renderer);
        tags.push([tag, renderer]);
      }
      let barSpec = null;
      if (spec.bar && typeof spec.bar === 'object') {
        barSpec = {
          tab: spec.bar.tab || def.页签 || id,
          ...spec.bar,
        };
        bar.set('gf:' + id, barSpec);
      }
      let phoneKey = null;
      if (def.phoneApp && def.phoneApp.id) {
        phoneKey = String(def.phoneApp.id).trim();
        extRoot.phoneApps.set(phoneKey, {
          ...def.phoneApp,
          id: phoneKey,
          gf: id,
          act,
          disabledReason,
          latestStat,
        });
      }
      mounted = { spec, barSpec, tags, style, phoneKey };
      emit(W, 'dl-ext-changed');
    }

    function apply(stat, spec) {
      const sp = spec || (mounted && mounted.spec);
      if (sp && typeof sp.apply === 'function') {
        try { sp.apply(stat, D); } catch (e) { console.error(`[${NAME}] 页面状态更新出错`, e); }
      }
    }

    function unmount() {
      if (!mounted) return;
      const { spec, barSpec, tags, style, phoneKey } = mounted;
      mounted = null;
      apply(null, spec);
      try {
        const blocks = W && W.__DL_PROSE_BLOCKS__;
        const bar = W && W.__DL_BAR_EXT__;
        for (const [tag, r] of tags) if (blocks && blocks.get(tag) === r) blocks.delete(tag);
        if (bar && barSpec && bar.get('gf:' + id) === barSpec) bar.delete('gf:' + id);
        if (phoneKey && extRoot.phoneApps.get(phoneKey) && extRoot.phoneApps.get(phoneKey).gf === id) {
          extRoot.phoneApps.delete(phoneKey);
        }
        if (style && typeof style.remove === 'function') style.remove();
      } catch (_) { /* ignore */ }
      emit(W, 'dl-ext-changed');
    }

    function refreshNow() {
      if (destroyed) return;
      const want = active();
      if (want && !mounted) mount();
      else if (!want && mounted) unmount();
      const stat = mounted ? latestStat() : null;
      apply(stat);
    }

    function refresh(immediate) {
      if (destroyed) return;
      if (immediate || !W || typeof W.setTimeout !== 'function') { refreshNow(); return; }
      if (typeof W.clearTimeout === 'function') W.clearTimeout(timer);
      timer = W.setTimeout(refreshNow, 80);
    }

    function destroy(dOpts = {}) {
      if (destroyed) return;
      destroyed = true;
      if (W && typeof W.clearTimeout === 'function') W.clearTimeout(timer);
      for (const s of stops.splice(0)) { try { s(); } catch (_) { /* ignore */ } }
      unmount();
      if (extRoot.gfs.get(id) === rec) extRoot.gfs.delete(id);
      if (!dOpts.silent) notifyRegistryChanged({ kind: 'gf', id });
    }

    for (const k of Object.keys(EVENTS)) {
      on(k, () => {
        refresh(false);
        if ((k === 'GENERATION_STARTED' || k === 'GENERATION_STOPPED') && mounted && W && typeof W.setTimeout === 'function') {
          W.setTimeout(() => {
            try {
              const sb = W.DLStatusBar;
              const tabName = (mounted && mounted.barSpec && mounted.barSpec.tab) || def.页签;
              if (sb && sb.state && sb.state.open && sb.state.page === tabName) sb.render();
            } catch (_) { /* ignore */ }
          }, 60);
        }
      });
    }

    const waitFn = (sw && typeof sw.waitGlobalInitialized === 'function') ? sw.waitGlobalInitialized : hostWaitGlobalInitialized;
    Promise.resolve(typeof waitFn === 'function' ? waitFn('Mvu') : null).then(() => {
      const M = mvuOf(sw);
      if (destroyed || !M || !M.events) return;
      listen(M.events.VARIABLE_UPDATE_ENDED, (vars, before) => { guard(vars, before); refresh(false); });
    }, () => {});

    attachAutoUnload(sw, destroy);

    const rec = {
      type: 'gf',
      id,
      def,
      scriptWin: sw,
      act,
      get destroyed() { return destroyed; },
      get mounted() { return !!mounted; },
      refresh: () => refresh(true),
      destroy,
    };
    extRoot.gfs.set(id, rec);
    refresh(true);
    notifyRegistryChanged({ kind: 'gf', id });
    return rec;
  }

  function mountLuckInstance(rawDef, opts = {}) {
    const builtinNames = typeof LUCK_LIB !== 'undefined' && Array.isArray(LUCK_LIB.词条)
      ? new Set(LUCK_LIB.词条.map((e) => e.名称))
      : new Set();
    const v = validateLuckPack(rawDef, builtinNames);
    if (!v.ok) {
      console.error(`[DLExt] 气运扩展校验失败：${v.why}`);
      return { ok: false, why: v.why, errors: v.errors };
    }
    const key = v.pack.key;
    const prev = extRoot.luck.get(key);
    if (prev && typeof prev.destroy === 'function') prev.destroy({ silent: true });
    let destroyed = false;
    const sw = opts.scriptWin || null;
    function destroy(dOpts = {}) {
      if (destroyed) return;
      destroyed = true;
      if (extRoot.luck.get(key) === rec) extRoot.luck.delete(key);
      if (!dOpts.silent) {
        try { if (typeof W.DLLuckRebuild === 'function') W.DLLuckRebuild(); } catch (_) { /* ignore */ }
        notifyRegistryChanged({ kind: 'luck', id: key });
      }
    }
    attachAutoUnload(sw, destroy);
    const rec = {
      ok: true,
      type: 'luck',
      id: key,
      pack: v.pack,
      scriptWin: sw,
      get destroyed() { return destroyed; },
      destroy,
    };
    extRoot.luck.set(key, rec);
    try { if (typeof W.DLLuckRebuild === 'function') W.DLLuckRebuild(); } catch (_) { /* ignore */ }
    notifyRegistryChanged({ kind: 'luck', id: key });
    return rec;
  }

  function register(typeOrPayload, maybeDef, maybeOpts) {
    let type = typeOrPayload;
    let def = maybeDef;
    let opts = maybeOpts || {};
    if (typeOrPayload && typeof typeOrPayload === 'object') {
      type = typeOrPayload.type;
      def = typeOrPayload.def;
      opts = typeOrPayload;
    }
    if (type === 'core') {
      const v = validateCoreDef(def);
      if (!v.ok) {
        console.error(`[DLExt] ${v.why}`);
        return { ok: false, why: v.why };
      }
      const prev = extRoot.cores.get(v.id);
      if (prev && typeof prev.destroy === 'function') prev.destroy({ silent: true });
      const rec = mountCoreInstance(v.def, opts);
      return { ok: true, id: v.id, destroy: rec.destroy, instance: rec };
    }
    if (type === 'gf') {
      const v = validateGfDef(def, extRoot.gfs);
      if (!v.ok) {
        console.error(`[DLExt] ${v.why}`);
        return { ok: false, why: v.why };
      }
      const prev = extRoot.gfs.get(v.id);
      if (prev && typeof prev.destroy === 'function') prev.destroy({ silent: true });
      const rec = mountGfInstance(v.def, opts);
      return { ok: true, id: v.id, destroy: rec.destroy, act: rec.act, instance: rec };
    }
    if (type === 'luck') {
      return mountLuckInstance(def, opts);
    }
    return { ok: false, why: `未知的扩展类型：${type}` };
  }

  function unregister(typeOrId, maybeId) {
    if (maybeId !== undefined) {
      const map = typeOrId === 'core' ? extRoot.cores : typeOrId === 'gf' ? extRoot.gfs : typeOrId === 'luck' ? extRoot.luck : null;
      const rec = map && map.get(maybeId);
      if (rec && typeof rec.destroy === 'function') { rec.destroy(); return true; }
      return false;
    }
    let hit = false;
    for (const m of [extRoot.cores, extRoot.gfs, extRoot.luck]) {
      const rec = m.get(typeOrId);
      if (rec && typeof rec.destroy === 'function') { rec.destroy(); hit = true; }
    }
    return hit;
  }

  function prune() {
    let removed = 0;
    for (const m of [extRoot.cores, extRoot.gfs, extRoot.luck]) {
      for (const [, rec] of [...m.entries()]) {
        if (rec && !rec.destroyed && isFrameDead(rec.scriptWin)) {
          rec.destroy({ silent: true });
          removed += 1;
        }
      }
    }
    if (removed > 0) {
      try { if (typeof W.DLLuckRebuild === 'function') W.DLLuckRebuild(); } catch (_) { /* ignore */ }
      notifyRegistryChanged();
    }
    return removed;
  }

  if (W.__DL_EXT_HOST_CLEANUP__ && typeof W.__DL_EXT_HOST_CLEANUP__ === 'function') {
    try { W.__DL_EXT_HOST_CLEANUP__(); } catch (_) { /* ignore */ }
  }
  const onWorkshopChanged = () => {
    prune();
    try { if (typeof W.DLLuckRebuild === 'function') W.DLLuckRebuild(); } catch (_) { /* ignore */ }
    for (const rec of extRoot.cores.values()) if (rec && !rec.destroyed) rec.refresh();
    for (const rec of extRoot.gfs.values()) if (rec && !rec.destroyed) rec.refresh();
  };
  try { if (W && typeof W.addEventListener === 'function') W.addEventListener('dl-workshop-changed', onWorkshopChanged); } catch (_) { /* ignore */ }
  W.__DL_EXT_HOST_CLEANUP__ = () => {
    try { if (W && typeof W.removeEventListener === 'function') W.removeEventListener('dl-workshop-changed', onWorkshopChanged); } catch (_) { /* ignore */ }
  };

  const api = {
    version: 1,
    register,
    registerCore: (def, opts) => register('core', def, opts),
    registerGf: (def, opts) => register('gf', def, opts),
    registerLuck: (def, opts) => register('luck', def, opts),
    unregister,
    prune,
  };
  W.DLExt = api;

  // 排空在斗罗ZOD 启动前压入队列的扩展注册项，并让后续 push 直接走 register
  const prevQueue = Array.isArray(W.__DL_EXT_QUEUE__) ? W.__DL_EXT_QUEUE__.splice(0) : [];
  const liveQueue = [];
  liveQueue.push = function pushExt(...items) {
    for (const item of items) {
      try { register(item); } catch (e) { console.error('[DLExt] 队列扩展注册失败', e); }
    }
    return 0;
  };
  W.__DL_EXT_QUEUE__ = liveQueue;
  for (const item of prevQueue) {
    try { register(item); } catch (e) { console.error('[DLExt] 预队列扩展注册失败', e); }
  }

  return api;
}

return () => createDLExtHost({ hostZ: z, hostEventOn: typeof eventOn === "function" ? eventOn : null, hostRegisterMvuSchema: registerMvuSchema, hostWaitGlobalInitialized: typeof waitGlobalInitialized === "function" ? waitGlobalInitialized : null, hostGetVariables: typeof getVariables === "function" ? getVariables : null, hostReplaceVariables: typeof replaceVariables === "function" ? replaceVariables : null, hostGenerateRaw: typeof generateRaw === "function" ? generateRaw : null, });
})();
/* 斗罗变量 · ZOD 脚本入口（build.py 把 import 行、共用/规则.js、幕索引、zod/结构.js 拼在本段之前）
 * 运行环境：酒馆助手脚本（模块方式加载）。z 用酒馆助手自带的全局 zod 4，不另外引 zod。
 */
const Schema = buildSchema(z);

// 换代页写入（斗罗宗门血脉脚本）：那边在 Mvu.parseMessage 之前往主页面挂一张一次性的通行票，写完就收回；
// 这一轮宗门把关不按“AI 一轮能改多少”去比。票只能由脚本挂，AI 的回复文字碰不到它。
function takeHeirPass() {
  try {
    const W = window.parent && window.parent !== window ? window.parent : window;
    const t = W.__DL_SB_HEIR_PASS__;
    if (t && typeof t.at === 'number' && Date.now() - t.at < 20000) { delete W.__DL_SB_HEIR_PASS__; return true; }
  } catch (_) { /* 读不到主页面就当没有 */ }
  return false;
}

// 跨部转场、气运把关都要对比更新前后两份数据，所以放在 MVU 更新结束事件里做
async function watchCrossPart() {
  await waitGlobalInitialized('Mvu');
  eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables, before) => {
    try {
      const log = crossPart(before && before.stat_data, variables && variables.stat_data);
      if (log) console.info('[斗罗ZOD] 跨部转场', log);
    } catch (e) {
      console.error('[斗罗ZOD] 跨部转场处理失败，变量保持 AI 写的样子', e);
    }
    try {
      const log = guardLuck(before && before.stat_data, variables && variables.stat_data);
      if (log) console.warn('[斗罗ZOD] 气运把关', log);
    } catch (e) {
      console.error('[斗罗ZOD] 气运把关失败，气运保持 AI 写的样子', e);
    }
    // 宗门与血脉：兴衰一格、单轮幅度、月结、完工、陨落、遗传建议；最后整份重写 脚本提醒
    try {
      const log = guardSect(before && before.stat_data, variables && variables.stat_data, Math.random, { heir: takeHeirPass() });
      if (log && log.log.length) console.info('[斗罗ZOD] 宗门血脉把关', log.log);
    } catch (e) {
      console.error('[斗罗ZOD] 宗门血脉把关失败，宗门与血脉保持 AI 写的样子', e);
    }
  });
}

$(() => {
  if (typeof installDLExt === 'function') {
    try { installDLExt(); } catch (e) { console.error('[斗罗ZOD] 扩展主机挂载失败', e); }
  }
  registerMvuSchema(Schema);
  watchCrossPart();
});

// 斗罗远程正文结束
