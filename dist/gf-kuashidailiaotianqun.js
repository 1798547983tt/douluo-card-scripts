// 斗罗远程正文 gf-kuashidailiaotianqun.js 1.1.0
// 斗罗金手指·跨时代聊天群：由 源码/build.py 生成，勿手改。逻辑见 源码/金手指/类型/跨时代聊天群.js，主页面见 源码/金手指/页面/，接线见 源码/金手指/入口.js。
import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

const GF = "跨时代聊天群";
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

/* 由 源码/build.py 从 气运金手指/gemini交付/跨时代聊天群/群友名单.json 自动生成，勿手改。 */
const GF_FRIENDS = {"默认群名":"万载斗罗听道群","群友":[{"姓名":"比比东","部":"斗1","时间点":"斗罗历2618年06月15日","封口":"武魂殿","处境":"武魂殿当代圣女，正与玉小刚相恋，尚未向教皇千寻疾坦白心意。","性格":"聪慧骄傲、外冷内柔、重情执着，此刻尚未沉沦怨恨，仍怀对爱与未来的憧憬。","想知道":"与玉小刚的感情能否得到师父应允，自己双生武魂未来如何稳妥加环。","改命点":"提前识破千寻疾野心，避开斗罗历2619年02月囚禁变故，重选人生与武魂殿之路。","红包":[{"名称":"武魂殿藏书阁抄本","品阶":"黄","出处":"斗罗","说明":"武魂殿整理的高阶魂兽图鉴与属性克制笔记，查探魂兽弱点大有裨益。","落点":"行囊"},{"名称":"紫晶魂力温养散","品阶":"紫","出处":"斗罗","说明":"教皇殿供奉秘制的温和药粉，服后可加快数日冥想回气并抚平经脉震荡。","落点":"行囊"},{"名称":"武魂殿银纹通行令","品阶":"紫","出处":"斗罗","说明":"圣女亲手刻记的私信令符，在斗1或对应势力商号可折算高额人情与物资便利。","落点":"其他"},{"名称":"双生武魂平衡手札","品阶":"红","出处":"斗罗","说明":"比比东潜心推演的双生加环防反噬心得，研读后大幅提升高年限吸环稳固度。","落点":"功法"}],"开场白":"脑海中凭空浮现的文字？何方高人在此设局，不妨现身一见。"},{"姓名":"千仞雪","部":"斗1","时间点":"斗罗历2645年04月20日","封口":"天斗皇室","处境":"假扮天斗太子雪清河潜伏宫闱已久，刚结识少年唐三，正谋划后续宫变。","性格":"矜傲隐忍、心机深沉、渴望母爱认可却又自尊极强，兼具皇室风度与锋芒。","想知道":"十年潜伏谋取天斗大位能否如愿，母亲比比东心里究竟如何看自己。","改命点":"提前识破宫变败局与独孤博察觉毒香的隐患，避开仓促出手致十年谋划毁于一旦。","红包":[{"名称":"天斗宫廷安神檀香","品阶":"白","出处":"斗罗","说明":"天斗太子府贡品安神香，燃之静心凝神，小幅提升夜间冥想效率。","落点":"行囊"},{"名称":"天斗太子府金魂币匣","品阶":"黄","出处":"斗罗","说明":"内贮五百枚成色极佳的金魂币，入账当部钱包按时代折算（神界/英雄转行囊奇材）。","落点":"钱包"},{"名称":"六翼天使圣光剑意帖","品阶":"红","出处":"斗罗","说明":"蕴含神圣属性剑势观想图，参悟后对光明与神圣攻防掌控显著精进。","落点":"功法"},{"名称":"天使圣辉护心玉","品阶":"红","出处":"斗罗","说明":"封存千仞雪一缕神圣魂力的护符，危急时可抵挡一次同大层次阴邪精神侵蚀。","落点":"行囊"}],"开场白":"有意思，连雪某神魂深处都能递进话来。诸位若真通晓古今，不妨先验一验真假。"},{"姓名":"小舞","部":"斗1","时间点":"斗罗历2645年06月05日","封口":"史莱克","处境":"随史莱克七怪征战全大陆精英大赛，怀揣相思断肠红，尚未前往武魂城决赛。","性格":"灵动活泼、爱憎分明、极度护短，认定唐三与伙伴后甘愿赴汤蹈火。","想知道":"相思断肠红能否一直遮住自己化形气息，和唐三能不能一直平安在一起。","改命点":"提防武魂城决赛遭封号斗罗识破真身，避开斗罗历2650年10月星斗围猎献祭之劫。","红包":[{"名称":"脆甜灵胡萝卜干","品阶":"白","出处":"斗罗","说明":"小舞珍藏的星斗林间灵蔬小食，食之清爽提神，微幅恢复体力与精神。","落点":"行囊"},{"名称":"柔技八段摔心得","品阶":"黄","出处":"斗罗","说明":"小舞亲笔涂鸦配注的近身借力柔技诀窍，提升贴身缠斗与连击卸力水平。","落点":"功法"},{"名称":"紫檀灵韵护身梳","品阶":"紫","出处":"斗罗","说明":"沾染十万年化形魂兽温润灵息的木梳仿件，佩戴可令温和魂兽降低敌意。","落点":"行囊"},{"名称":"柔骨魅兔瞬步感悟","品阶":"红","出处":"斗罗","说明":"关于短距折返、虚实变向的敏攻身法精义，可转化为实战身法技艺精进。","落点":"功法"}],"开场白":"咦？是谁在我脑子里说话呀？喂喂，先说好，可不许欺负三哥哦！"},{"姓名":"独孤博","部":"斗1","时间点":"斗罗历2643年10月05日","封口":"散修","处境":"独居落日森林冰火两仪眼，饱受碧磷蛇毒阴雨子午反噬，忧心孙女独孤雁旧疾。","性格":"阴鸷乖张、孤傲嘴硬、极致护短，一旦欠下人情便重诺死守。","想知道":"困扰独孤一脉三代的碧磷蛇毒反噬究竟有没有根治之法，雁雁能不能长命安康。","改命点":"提前得知以魂骨蓄毒与冰火仙草解毒正法，免去数年蚀骨折磨并保全独孤血脉。","红包":[{"名称":"碧磷解毒避瘴丸","品阶":"黄","出处":"斗罗","说明":"毒斗罗随手配制的解毒丹，可压制寻常千年以下蛇毒虫瘴并免受山林瘴气所侵。","落点":"行囊"},{"名称":"落日森林药圃寻幽图","品阶":"紫","出处":"斗罗","说明":"标明落日森林外围高阶毒草与危险魂兽巢穴的孤本手图，探林寻药极佳。","落点":"行囊"},{"名称":"冰火药园百年灵芝","品阶":"红","出处":"斗罗","说明":"沾染冰火两仪眼灵气的上等补药，服之大幅固本培元并加快经脉伤势痊愈。","落点":"行囊"},{"名称":"奇茸通天菊（仙品）","品阶":"金","出处":"斗罗","说明":"冰火两仪眼珍藏仙草，食之气运四肢血通八脉，大幅强健体魄（按当前段封顶消化）。","落点":"行囊"},{"名称":"毒斗罗碧磷护道毒障","品阶":"红","出处":"斗罗","说明":"封存封号级毒元的一枚玉瓶，掷碎可张开剧毒烟障逼退同大层次追敌。","落点":"行囊"}],"开场白":"装神弄鬼！若非老夫查不出半点魂力痕迹，早就拿碧磷蛇毒把你们全化了。"},{"姓名":"宁荣荣","部":"斗1","时间点":"斗罗历2643年09月10日","封口":"史莱克","处境":"初入史莱克不久刚收敛娇气，深知七宝琉璃塔卡死七十九级之憾，想变强护宗。","性格":"灵秀聪慧、嘴硬心软、精于鉴宝理财，骨子里要强又极度护短。","想知道":"七宝琉璃塔传说中的进化成九宝究竟是真是假，七宝琉璃宗日后会不会遭遇大劫。","改命点":"提前获知绮罗郁金香可助武魂进化九宝，并预警武魂殿猎魂行动护住宗门基业。","红包":[{"名称":"七宝商行千金汇票","品阶":"黄","出处":"斗罗","说明":"等价一千金魂币的琉璃商行凭证，入账当部钱包按时代折算（神界/英雄转奇珍）。","落点":"钱包"},{"名称":"七宝分心控制初解","品阶":"紫","出处":"斗罗","说明":"七宝琉璃宗不传之秘基础篇，修习后可微幅提升同时操控多道魂技与器物的准度。","落点":"功法"},{"名称":"琉璃鉴宝识材录","品阶":"黄","出处":"斗罗","说明":"宁荣荣自幼熟读的宗门鉴宝手册，提升辨识稀有金属、药草与古器的眼力。","落点":"辅助职业"},{"名称":"七宝阁秘藏储物玉坠","品阶":"紫","出处":"斗罗","说明":"做工精致的储物魂导玉佩，内含十余立方米恒温空间，方便妥善存放药草奇珍。","落点":"行囊"}],"开场白":"本小姐可不是好骗的，不过这东西连剑爷爷都没见过……群里真有前辈高人吗？"},{"姓名":"朱竹清","部":"斗1","时间点":"斗罗历2643年08月15日","封口":"星罗皇室","处境":"避过姐姐朱竹云一路刺杀刚考入史莱克，对戴沐白仍怀冷淡失望，独力苦修。","性格":"清冷寡言、倔强果决、不轻信于人，但认准道路便愿以命相搏。","想知道":"自己拼命修炼能否赢过星罗竞争活下来，戴沐白到底还值不值得托付。","改命点":"提前防备星罗皇室后续暗杀与武魂融合技修炼瓶颈，更早掌控命运不再被动逃亡。","红包":[{"名称":"星罗暗影潜行靴","品阶":"白","出处":"斗罗","说明":"星罗朱家斥候制式软靴，踏地无声且轻便耐磨，小幅提升夜行隐匿与步法灵动。","落点":"行囊"},{"名称":"幽冥灵猫步法纲要","品阶":"黄","出处":"斗罗","说明":"朱家敏攻一脉的短距折向与贴身闪避要诀，研读可精进近战身法反应。","落点":"功法"},{"名称":"星罗精炼金创药膏","品阶":"白","出处":"斗罗","说明":"逃亡路上随身备用的高效止血疗伤膏，外敷可迅速止血收敛皮肉创口。","落点":"行囊"},{"名称":"幽冥突刺蓄势心得","品阶":"紫","出处":"斗罗","说明":"凝缩魂力于指尖一点破防的敏攻发力技巧，显著增强突袭第一击的穿透力。","落点":"功法"}],"开场白":"若不是来取我性命的星罗死士，就请直说。我只想知道怎么活下去、怎么变强。"},{"姓名":"胡列娜","部":"斗1","时间点":"斗罗历2647年06月15日","封口":"武魂殿","处境":"精英大赛落败后闭关磨砺近两载，正准备请命只身前往杀戮之都闯地狱路。","性格":"骄傲要强、外媚内刚、对老师比比东极度忠诚，面对情义却易陷入两难。","想知道":"杀戮之都地狱路究竟藏着怎样的生死险关，往后会不会遇到让自己动摇的人。","改命点":"提前识破杀戮之都内唐银真实身份与黄泉露毒素隐患，免陷情义撕裂与心神重创。","红包":[{"名称":"妖狐魅影敛心散","品阶":"黄","出处":"斗罗","说明":"武魂殿调制的清心香散，关键时刻嗅之可瞬间清醒，抵御寻常精神魅惑干扰。","落点":"行囊"},{"名称":"武魂殿黄金一代战技录","品阶":"紫","出处":"斗罗","说明":"武魂殿精英实战控场与精神干扰配合笔记，可提升中近程控场与抗干扰能力。","落点":"功法"},{"名称":"教皇殿赏赐红宝石匣","品阶":"黄","出处":"斗罗","说明":"武魂殿赏赐给黄金一代的珍稀珠宝，变现可化作当部高额通币（神界/英雄转行囊）。","落点":"钱包"},{"名称":"天狐精神凝视秘法","品阶":"红","出处":"斗罗","说明":"以精神力凝聚狐瞳威压震慑对手的秘术，修炼可稳步拔高精神力修为点数。","落点":"精神力"}],"开场白":"武魂殿胡列娜在此。听闻此地能问前程，不知可有人走过杀戮之都的地狱路？"},{"姓名":"霍雨浩","部":"斗2","时间点":"斗罗历12631年09月10日","封口":"唐门","处境":"刚借唐门名额入史莱克外院、与王冬儿同寝，识海蛰伏天梦冰蚕与伊莱克斯残魂。","性格":"隐忍坚韧、心思缜密、知恩图报且藏锋极深，面对白虎公爵府旧恨暗自咬牙。","想知道":"自己先天魂力低微如何快速变强、洗刷母亲委屈，以及识海里两位存在靠不靠谱。","改命点":"提前规避新生期与极北、明都多处险局，更早筹谋救母遗愿与唐门中兴之路。","红包":[{"名称":"霍氏秘制炭火烤鱼","品阶":"白","出处":"斗罗","说明":"史莱克校门外风靡一时的金黄烤鱼，香气四溢，食之迅速补足体力并愉悦心神。","落点":"行囊"},{"名称":"唐门玄天功入门口诀","品阶":"黄","出处":"斗罗","说明":"唐雅传授的玄天功基础运功法门，初学即可理顺经脉、稳步提升魂力精纯度。","落点":"功法"},{"名称":"紫极魔瞳初阶观日法","品阶":"紫","出处":"斗罗","说明":"晨曦吸纳紫气淬炼眼力与识海的唐门绝学，坚持修习可稳步增长精神力点数。","落点":"精神力"},{"名称":"灵眸精神探测微操录","品阶":"紫","出处":"斗罗","说明":"霍雨浩结合天梦指点摸索的精神探查与共享心得，大幅提升战场态势感知力。","落点":"功法"}],"开场白":"各位前辈好，晚辈霍雨浩，只是史莱克一年级新生，若问得唐突还请海涵。"},{"姓名":"王冬儿","部":"斗2","时间点":"斗罗历12632年03月15日","封口":"史莱克","处境":"女扮男装化名王冬就读史莱克外院，刚与霍雨浩夺得新生考核冠军，隐瞒身世。","性格":"明媚骄傲、外泼内柔、爱洁讲究，嘴上不饶人实则极重情义与伙伴。","想知道":"自己偶尔浮现的模糊记忆片段究竟从何而来，以后和霍雨浩会走到哪一步。","改命点":"提前洞悉昊天宗旧嘱与日后乾坤问情谷及神界因果，免去误会分离与沉睡之苦。","红包":[{"名称":"昊天宗百花凝露香囊","品阶":"白","出处":"斗罗","说明":"大明二明为她备下的清幽安神香囊，祛除疲倦并令呼吸吐纳更为顺畅。","落点":"行囊"},{"名称":"光明女神蝶羽书签","品阶":"黄","出处":"斗罗","说明":"蕴藏一丝纯净光明魂力的蝶翼纹玉签，佩戴时对黑暗阴寒气息生出微弱抗性。","落点":"行囊"},{"名称":"皓月浩冬合击笔记","品阶":"紫","出处":"斗罗","说明":"记录双魂力共振引动武魂融合技的切身体会，显著缩短与同伴磨合融合技周期。","落点":"功法"},{"名称":"蝶翼凌空步法要诀","品阶":"紫","出处":"斗罗","说明":"轻盈灵动的低空腾挪与闪避剑意技巧，提升空中缠斗与高速变向能力。","落点":"功法"}],"开场白":"哼，奇奇怪怪的聊天群，居然能跨时代说话？先申明，别随便打听本少爷的来历！"},{"姓名":"王秋儿","部":"斗2","时间点":"斗罗历12637年05月10日","封口":"散修","处境":"帝皇瑞兽三眼金猊化形初入史莱克、刚晋六环魂帝，手握黄金龙枪，暗中关注霍雨浩。","性格":"高傲冷艳、直率果敢、骨子里带着瑞兽的孤独与炽烈，一旦倾心便义无反顾。","想知道":"自己化形入人世的命运归宿是什么，星斗大森林一族的未来还有没有出路。","改命点":"提前看清自身与命运接引的宿命纠葛，避开斗罗历12637年10月为爱献祭陨落之结局。","红包":[{"名称":"星斗瑞兽金麟片","品阶":"紫","出处":"斗罗","说明":"三眼金猊褪落的一枚祥瑞鳞片，佩之可短时稳固气血并略微提升寻宝直觉。","落点":"行囊"},{"名称":"黄金龙体锻骨要义","品阶":"红","出处":"斗罗","说明":"极致力量与气血爆发的体魄锤炼感悟，习之令近战体魄强度与爆发力大涨。","落点":"功法"},{"名称":"瑞兽祥瑞祈福印","品阶":"金","出处":"斗罗","说明":"帝皇瑞兽渡出的一缕温和祥瑞气数，可在关键破境或吸环时压低反噬风险一次。","落点":"生效状态"},{"名称":"命运之眼洞察残意","品阶":"红","出处":"斗罗","说明":"蕴含一缕命运感知的精神印记，吸收后可增长精神力并增强危局破绽直觉。","落点":"精神力"}],"开场白":"人类的奇异识海秘境么？若真能窥见命运尽头，倒值得我听上一听。"},{"姓名":"唐雅","部":"斗2","时间点":"斗罗历12637年08月15日","封口":"圣灵教","处境":"觉醒暗黑蓝银草落入圣灵教成为蓝银圣女，旧忆遭邪药封锁，仅偶尔在梦中感到空洞。","性格":"此时表面冷漠孤绝带着邪意戾气，潜意识深处仍残留一丝对温暖与旧人的本能渴求。","想知道":"脑海里总闪过的那道蓝电霸王龙背影究竟是谁，圣灵教到底瞒了自己什么。","改命点":"借群中高人点破唐门旧忆与圣灵教邪药真相，提前清醒脱困重逢贝贝与唐门。","红包":[{"名称":"唐门失传机括残图","品阶":"黄","出处":"斗罗","说明":"唐雅无意中贴身留存的半卷旧唐门暗器草图，可助研习精密机括与暗器制作。","落点":"辅助职业"},{"名称":"暗黑蓝银毒藤种","品阶":"紫","出处":"斗罗","说明":"蕴含霸道吞噬毒性的变异蓝银种子，妥善催动可作困敌毒阵或淬毒奇材。","落点":"行囊"},{"名称":"圣灵教秘制蚀骨毒丹","品阶":"紫","出处":"斗罗","说明":"邪魂师高阶防身毒物，慎用可瞬间瓦解同阶以下对手护体魂力（正道忌讳）。","落点":"行囊"},{"名称":"圣女玄冥护魂符","品阶":"红","出处":"斗罗","说明":"圣灵教赐予圣女抵御正道精神搜魂的秘符，可抵消一次强敌精神冲击。","落点":"行囊"}],"开场白":"圣灵教蓝银圣女。若你们真知道我忘掉的名字和仇人，开价便是。"},{"姓名":"雪帝","部":"斗2","时间点":"斗罗历12632年06月10日","封口":"散修","处境":"极北冰原之主，七十万年大限逼近且寻冰帝未果，正准备孤身选择化形重修。","性格":"清冷绝尘、高洁威严、心怀极北冰原苍生，面对同族安危绝不退让。","想知道":"冰帝此刻究竟去向何方，自己下月选择化形重修能否安稳渡过幼生险关。","改命点":"提前获知人类强者持封神台潜伏极北，避开斗罗历12632年07月化形被封胚胎之劫。","红包":[{"名称":"极北万年冰髓晶","品阶":"紫","出处":"斗罗","说明":"极北核心产出的至纯冰晶，冰属性魂师或魂兽吸收可凝练魂力、平复燥火。","落点":"行囊"},{"名称":"雪帝三绝·帝剑意境图","品阶":"金","出处":"斗罗","说明":"七十万年凶兽以极致之冰凝刻的剑意观想，参悟可大幅拔升剑技与冰系杀伐威势。","落点":"功法"},{"名称":"寒极冰泉淬体露","品阶":"红","出处":"斗罗","说明":"极北寒极之泉凝聚的三滴灵露，配合运功可淬炼筋骨并压制邪火毒热反噬。","落点":"行囊"},{"名称":"冰天雪女极寒护印","品阶":"金","出处":"斗罗","说明":"雪帝随手封存的一道极致寒芒印记，危急时激发可冻结同大层次对手三息。","落点":"行囊"}],"开场白":"人类造物竟能穿透极北风雪直抵吾之灵识？若知冰儿下落，本帝必有重谢。"},{"姓名":"马小桃","部":"斗2","时间点":"斗罗历12632年09月20日","封口":"史莱克","处境":"史莱克内院大师姐，刚借霍雨浩极致之冰暂压邪火，即将随队出征全大陆大赛。","性格":"火爆直爽、骄傲炽烈、重义护短，最见不得史莱克弟子受半点委屈。","想知道":"体内反复作祟的凤凰邪火能否彻底拔除，自己日后能不能冲破极限。","改命点":"提前戒备斗罗历12632年10月决赛审判之剑黑火异变与翌年失踪落入圣灵教之劫。","红包":[{"名称":"史莱克内院火炼手记","品阶":"黄","出处":"斗罗","说明":"马小桃整理的强攻系爆发控火心得，可助火系或强攻魂师提升爆发准度。","落点":"功法"},{"名称":"赤焰火晶魂导核心","品阶":"紫","出处":"斗罗","说明":"内院库存的五级火属性高纯金属核心，可作锻造或改造火系魂导器的良材。","落点":"行囊"},{"名称":"凤凰烈焰护身符","品阶":"紫","出处":"斗罗","说明":"蕴含一缕邪火凤凰本源烈焰的赤玉，激战时可震散寒毒或增幅一击火系威能。","落点":"行囊"},{"名称":"内院历练贡献凭证","品阶":"黄","出处":"斗罗","说明":"马小桃珍藏的史莱克实战考核补贴金票，折算入当部钱包（神界/英雄转行囊奇材）。","落点":"钱包"}],"开场白":"谁在搞鬼？不过这群里真有各朝各代的高人？那先告诉我，我这身邪火怎么彻底治！"},{"姓名":"毒不死","部":"斗2","时间点":"斗罗历12634年05月18日","封口":"本体宗","处境":"九十八级本体宗宗主，刚赴史莱克争抢霍雨浩未果，正密切关注日月帝国动向。","性格":"狂傲护短、乖张豪烈、行事不拘小节却极重家国大义与同袍铮骨。","想知道":"本体宗二次觉醒秘法能不能在霍雨浩身上开花结果，日月帝国何时全面开战。","改命点":"提前洞悉日月帝国与圣灵教勾结伏击之局，避开斗罗历12640年05月突袭明都陨落之劫。","红包":[{"名称":"本体宗淬体锻骨膏","品阶":"紫","出处":"斗罗","说明":"本体宗秘传炼体药膏，配合高强度苦练可稳步强化肉身筋骨与吸环承受力。","落点":"行囊"},{"名称":"本体武魂二次觉醒总纲","品阶":"金","出处":"斗罗","说明":"毒不死珍藏的本体秘传心法，本体武魂研读可引动二次觉醒，其余武魂亦可固本。","落点":"功法"},{"名称":"天毒凝露避毒珠","品阶":"红","出处":"斗罗","说明":"毒不死以碧毒本源温养多年的奇珠，佩之可大幅削弱非神级剧毒与瘴气侵蚀。","落点":"行囊"},{"名称":"超级斗罗霸体劲诀","品阶":"红","出处":"斗罗","说明":"凝练气血一击震敌的霸道近战发力秘法，显著提升近身硬撼与破防威能。","落点":"功法"}],"开场白":"哈哈哈哈！有点意思，老夫毒不死！群里谁家藏着本体武魂好苗子，快报上名来！"},{"姓名":"唐舞桐","部":"神界","时间点":"斗罗历22625年06月10日","封口":"神界","处境":"刚与霍雨浩大婚不久、隐居神界林间木屋，尚未察觉神界委员会暗流涌动。","性格":"娇俏灵动、护短炽烈、爱憎分明，遇父母与爱人安危则瞬间化作绝不退让的蝶神。","想知道":"神界近日为何气氛压抑，刚怀有身孕的娘亲小舞与弟弟会不会有危险。","改命点":"提前察觉毁灭之神扩界夺枢与金龙王破封隐患，早作部署护住父母与初生幼弟。","红包":[{"名称":"神界林间灵果蜜饯","品阶":"紫","出处":"斗罗","说明":"神界清甜灵果制成的小食，凡人食之洗涤经脉、补满气血精神并微增魂力底蕴。","落点":"行囊"},{"名称":"光明龙神蝶翼微光","品阶":"红","出处":"斗罗","说明":"蝶神凝练的一缕纯净光暗本源，炼化后可提纯光暗属性魂力并强化精神清明。","落点":"生效状态"},{"名称":"紫金蝶影身法神韵","品阶":"金","出处":"斗罗","说明":"二级神祇蝶神留下的虚空闪步感悟，按凡间尺度折算为极品敏攻闪避技艺。","落点":"功法"},{"名称":"蝶神祝福同心结","品阶":"红","出处":"斗罗","说明":"神界亲编的灵韵护结，佩戴可增强与亲密同伴的武魂共鸣与合击默契。","落点":"行囊"}],"开场白":"咦，居然连通了不同时代的斗罗大陆？别告诉雨浩，我先看看群里都有谁！"},{"姓名":"马红俊","部":"神界","时间点":"斗罗历22625年05月20日","封口":"神界","处境":"身为二级凤凰之神独卧神界岩浆湖近两万年，因当年未能带白沉香成神而自苦。","性格":"往日谐趣化作深沉痴情与孤寂，外冷内烈、重义护短，听闻旧友之名仍会动容。","想知道":"能否再有一丝机缘弥补当年遗憾，神界接下来是不是真要出大事了。","改命点":"振作孤寂神魂提前戒备神界大劫，更早备战协防神枢并解开两万年心结。","红包":[{"名称":"岩浆湖地火炎晶","品阶":"红","出处":"斗罗","说明":"神界地火湖底凝结两万年的赤红火晶，火系魂师炼化可淬炼极致火意并增幅修为。","落点":"行囊"},{"名称":"十首烈阳凤凰火诀","品阶":"金","出处":"斗罗","说明":"凤凰之神将邪火化作纯阳真火的毕生感悟，可彻底抚平火系反噬并提升火攻威能。","落点":"功法"},{"名称":"神火锻体赤金羽","品阶":"金","出处":"斗罗","说明":"马红俊褪下的一片蕴含神火余温的凤羽，关键时刻护体可挡同大层次重创一击。","落点":"行囊"},{"名称":"凤凰涅槃浴火残意","品阶":"红","出处":"斗罗","说明":"引动旺盛生机与烈焰的战斗爆发法门，重伤绝境下可短时稳住伤势强行反扑。","落点":"天赋能力"}],"开场白":"两万年没人吵我清静了…跨时代聊天群？若真有法子让我再见沉香，神晶全归你。"},{"姓名":"毁灭之神","部":"神界","时间点":"斗罗历22625年07月01日","封口":"神界","处境":"执掌毁灭神位、欲扩张神界中枢与唐三理念相左，正暗中集结原罪神筹备夺枢。","性格":"孤高威严、锐意激进、刚愎执拗，唯对爱妻生命女神温柔克制、重诺守信。","想知道":"扩张神界之后神界能否真正繁荣万古，海神唐三的保守预言究竟有几分真。","改命点":"提前洞悉扩界将诱发金龙王破封与时空乱流灭世之劫，悬崖勒马免与生命女神相殉。","红包":[{"名称":"毁灭古堡紫雷晶核","品阶":"红","出处":"斗罗","说明":"毁灭神力渗入神界矿脉所生雷晶，炼化可大幅提升雷霆与毁灭属性穿透力。","落点":"行囊"},{"名称":"毁灭意念凝锋秘术","品阶":"金","出处":"斗罗","说明":"将破灭意韵融入招式破防的至高心法，按主角大层次折算施展，专克防御护罩。","落点":"功法"},{"名称":"紫意神雷护道印","品阶":"彩","出处":"斗罗","说明":"毁灭神王随手封存的一缕雷韵（按当前大层次封顶），可震碎同阶领域并重创强敌。","落点":"行囊"},{"名称":"破界神识淬炼法","品阶":"金","出处":"斗罗","说明":"神王级锤炼识海锐度的法门，凡人修习可突破精神力瓶颈并免疫寻常精神威压。","落点":"精神力"}],"开场白":"区区异界奇音，也敢直入本王识海？既自称通晓未来，便说说扩张神界究竟是对是错！"},{"姓名":"生命女神","部":"神界","时间点":"斗罗历22625年07月05日","封口":"神界","处境":"隐居生命之森木屋，察觉夫君毁灭之神与唐三矛盾激化，忧心神界爆发内乱。","性格":"温婉慈悲、理性公允、外柔内刚，为了守护众生与夫君甘愿燃尽自身本源。","想知道":"如何劝阻小紫放弃激进夺枢，神界不久后究竟会迎来怎样的滔天劫难。","改命点":"借未来真相与夫君促膝相劝，化解神界委员会内讧，避免双双燃烧神魂创世陨落。","红包":[{"名称":"生命古树晨露（一滴）","品阶":"金","出处":"斗罗","说明":"生命古树凝结的至纯生机神露，服之可瞬间稳住濒死重伤、补足气血并延缓衰颓。","落点":"行囊"},{"名称":"生命之森灵木种子","品阶":"红","出处":"斗罗","说明":"沾染生命神王气息的灵种，随身佩带可缓慢滋养经脉暗伤并提升植物武魂亲和。","落点":"行囊"},{"名称":"万物生息调息诀","品阶":"金","出处":"斗罗","说明":"生命女神所传温润养元功法，运转时伤势与魂力回复大幅加快且化解暴戾反噬。","落点":"功法"},{"名称":"生命神王护命翠光","品阶":"彩","出处":"斗罗","说明":"蕴藏创世生机余韵的祝福状态（不跨大层次），危急时强行保命续脉并祛除凡毒。","落点":"生效状态"}],"开场白":"诸位有礼了。听闻此间能映照万古因果，不知可否告知，神界近期可有血光之灾？"},{"姓名":"唐三","部":"英雄","时间点":"斗罗历22646年10月18日","封口":"神界","处境":"斗罗神界坠入黑洞遇六大神界，刚定下黑暗之星诸神赌约，日夜挂念下界幼子唐舞麟。","性格":"渊渟岳峙、深谋远虑、仁厚守义，面对黑洞绝境冷静布局，唯涉妻儿柔软深情。","想知道":"被自己设下十八道封印送回斗罗大陆的儿子唐舞麟，如今是否平安长大、安然无恙。","改命点":"提前洞悉六界神王手段与斗罗大陆深渊危机，更稳妥赢得众神之战并尽早照拂下界亲人。","红包":[{"名称":"唐门暗器百解精要","品阶":"红","出处":"斗罗","说明":"神王亲校的唐门绝顶暗器手法与机关图录，大幅提升暗器与精密器物造诣。","落点":"辅助职业"},{"名称":"玄天宝录全篇神校本","品阶":"金","出处":"斗罗","说明":"融合神王理解的玄天功、鬼影迷踪、控鹤擒龙与紫极魔瞳全解，夯实全能根基。","落点":"功法"},{"名称":"瀚海乾坤一缕神意","品阶":"金","出处":"斗罗","说明":"海神封存的一缕隐匿与精神护持神韵，可助凡间强者遮蔽气息并提升精神力。","落点":"精神力"},{"名称":"蓝银皇生命本源叶","品阶":"彩","出处":"斗罗","说明":"神王蓝银皇凝出的金纹灵叶（按当段封顶），助植物武魂进化或为魂环增幅年限。","落点":"行囊"},{"名称":"修罗杀意凝神诀","品阶":"金","出处":"斗罗","说明":"掌控杀气而不失本心的至高心法，助修者压服心魔并在血战中激发凌厉威压。","落点":"功法"}],"开场白":"斗罗神界唐三。此处竟能联系过去与未来的斗罗大陆……敢问群内，可有见过唐舞麟的？"},{"姓名":"戴沐白","部":"英雄","时间点":"斗罗历22646年10月20日","封口":"神界","处境":"身为战神随斗罗神界流落黑洞，正随唐三整军备战对抗六大神界诸王。","性格":"豪迈刚毅、重义担当、护短直率，身为初代七怪老大遇硬仗永远冲在最前。","想知道":"这场对决六大神界的赌战最终怎么赢，斗罗大陆上戴家后人过得怎么样。","改命点":"提前知晓六界强者战法短板，在众神之战协防中减少伤损、助斗罗神界更从容破洞。","红包":[{"名称":"战神白虎炼体秘录","品阶":"红","出处":"斗罗","说明":"战神飞升后反推打磨的强攻炼体法门，大幅提升近身力量、体魄韧性与爆发力。","落点":"功法"},{"名称":"白虎金刚破阵印","品阶":"红","出处":"斗罗","说明":"封存一缕二级战神锐气的虎纹金印，战时激发可短时拔升强攻爆发（同大层次内）。","落点":"生效状态"},{"名称":"神界玄铁战刃胚","品阶":"紫","出处":"斗罗","说明":"神界冶炼的坚韧神铁矿胚，凡间锻造师得之可作千锻至天锻的极品配材。","落点":"行囊"},{"名称":"幽冥白虎合击心法","品阶":"金","出处":"斗罗","说明":"戴沐白与朱竹清万载打磨的双人合击融通秘诀，极易提升搭档间武魂融合契合度。","落点":"功法"}],"开场白":"哈哈哈！战神戴沐白报到！黑洞里闷得发慌，正好来听听后世小辈们都在忙活些什么！"},{"姓名":"奥斯卡","部":"英雄","时间点":"斗罗历22646年10月21日","封口":"神界","处境":"身为食神随神界困于黑洞，正忙着替出战诸神筹备恢复与增幅类神级食补。","性格":"诙谐洒脱、乐观嘴贫、宠妻如命，绝境中总能插科打诨稳住大家心气。","想知道":"困在黑洞里什么时候能重回故土，小三的儿子在下面吃穿用度够不够讲究。","改命点":"提前知晓诸神决战消耗节点，备齐针对性解毒与回气神膳助队友免遭暗算。","红包":[{"名称":"食神秘制恢复大香肠","品阶":"紫","出处":"斗罗","说明":"奥斯卡以神力封存的便携恢复香肠，咬下即可迅速恢复大片魂力与气血外伤。","落点":"行囊"},{"名称":"食神亢奋粉红肠（封存）","品阶":"红","出处":"斗罗","说明":"经神界秘法保鲜的强效增幅香肠，服后一炷香内全属性亢奋拔升且无副作用。","落点":"行囊"},{"名称":"食神一缕烹饪灵悟","品阶":"黄","出处":"斗罗","说明":"食神随手点拨的药膳食补火候诀窍，食物系魂师或厨艺修习者获益极丰。","落点":"辅助职业"},{"名称":"镜像魂力模拟心得","品阶":"金","出处":"斗罗","说明":"奥斯卡领悟复制镜像肠后的魂力拟态精义，助修者洞悉并短暂借用他人招式韵律。","落点":"功法"}],"开场白":"各位群友饿不饿？神界食神奥斯卡上线，老规矩，听完好故事先发两根恢复大香肠！"},{"姓名":"融念冰","部":"英雄","时间点":"斗罗历22646年10月22日","封口":"神界","处境":"留守斗罗神界中枢烹鲜待客、暗自推演七曜刀阵破局之法，嘴上吐槽唐三拉壮丁。","性格":"潇洒散漫、嘴硬心热、痴迷厨艺与刀法，真到护友关头则毫不留情展露神王锋芒。","想知道":"这一仗打完唐三还放不放自己回去游历四方，雨浩那徒弟将来能走到多高。","改命点":"提前洞悉六界敌手禁咒底牌与破洞契机，以更小代价赢下诸神对决稳步组建大神圈。","红包":[{"名称":"冰火魔厨灵膳调料盒","品阶":"紫","出处":"斗罗","说明":"融念冰自配的七味神厨秘料，烹入魂兽肉中可令食者连日精力旺盛、修炼提速。","落点":"行囊"},{"名称":"冰火双属性调和诀","品阶":"金","出处":"斗罗","说明":"冰火魔厨毕生所悟的水火相济心法，大幅化解体内属性冲突并增幅双属性威能。","落点":"功法"},{"名称":"七曜刀意初阶观想","品阶":"红","出处":"斗罗","说明":"蕴含冰火风土光暗空间变化之妙的刀剑意境，研读可精进兵器类魂技与爆发技巧。","落点":"功法"},{"名称":"情绪共鸣凝心茶","品阶":"红","出处":"斗罗","说明":"前任情绪之神亲泡封存的灵茶，饮之可抚平心魔躁意并稳步提升精神力点数。","落点":"精神力"}],"开场白":"啧，又被拉进什么奇怪地方？先说好，老夫只聊厨艺和刀法，替唐三干活的差事免谈。"},{"姓名":"唐舞麟","部":"斗3","时间点":"斗罗历22638年12月20日","封口":"唐门","处境":"刚从东海隐班出关成四级锻造师、筹备报考史莱克，正为破金龙王封印与买灵物发愁。","性格":"阳光坚韧、吃苦耐劳、极度护短又精打细算，饭量惊人却从不向厄运低头。","想知道":"体内金龙王封印后面到底有多凶险，失踪的妹妹娜儿和亲生父母究竟在哪儿。","改命点":"提前防备圣灵教与传灵塔阴谋、早作准备护住史莱克学院与身边挚爱同伴。","红包":[{"名称":"千锻一品沉银块","品阶":"紫","出处":"斗罗","说明":"唐舞麟亲手锤炼的千锻有灵稀有金属，可作一字斗铠、魂导器或暗器极品锻材。","落点":"行囊"},{"名称":"乱披风与叠锤锻造心得","品阶":"黄","出处":"斗罗","说明":"融汇唐门借力发力的锻造与重器连击笔记，可稳步提升锻造职业水平与发力连贯。","落点":"辅助职业"},{"名称":"金龙气血调息法","品阶":"紫","出处":"斗罗","说明":"唐舞麟压制气血冲撞摸索出的炼体导引法，能增强肉身气血韧性与饥饿续航。","落点":"功法"},{"名称":"五万联邦币转账券","品阶":"白","出处":"斗罗","说明":"唐舞麟接锻造私活省下的联邦币凭证，按当前部货币折算入账（神界/英雄转行囊）。","落点":"钱包"}],"开场白":"各位前辈好！我是唐舞麟，会打铁也会做饭，要是前辈缺千锻金属可以找我换指点呀！"},{"姓名":"古月娜","部":"斗3","时间点":"斗罗历22644年09月20日","封口":"传灵塔","处境":"海神缘刚与唐舞麟定情收下金鳞项链，旋即返归传灵塔谋掌大权，陷情感与使命撕裂。","性格":"清冷孤高、智慧深沉、执掌银龙王威仪，唯独在唐舞麟面前展露柔软与痛苦挣扎。","想知道":"人类与魂兽之间究竟有没有共存共荣的第三条路，不必走到与唐舞麟拔剑相向。","改命点":"提前洞悉深渊位面与千古东风算计，寻找化解人兽死结之策避免终战双双冰封。","红包":[{"名称":"传灵塔高阶升灵台令牌","品阶":"紫","出处":"斗罗","说明":"传灵塔高层签发的秘境感应信物，斗3/斗4可入高级升灵台，其余时代折作魂灵修炼秘宝。","落点":"行囊"},{"名称":"元素掌控七彩观想法","品阶":"金","出处":"斗罗","说明":"银龙王对地水火风光明黑暗空间七元素的本源理解，研习大幅提升元素掌控力。","落点":"功法"},{"名称":"银龙鳞片空间储物戒","品阶":"红","出处":"斗罗","说明":"蕴含银龙空间之力的罕见储物戒，容积辽阔且自带轻微稳固空间气息之效。","落点":"行囊"},{"名称":"龙神元素亲和祝福","品阶":"金","出处":"斗罗","说明":"古月娜以银龙本源赐下的一缕元素共鸣状态，短时提升主属性元素魂技威能。","落点":"生效状态"}],"开场白":"跨时代的声音……若你真看得到未来，告诉我，魂兽一族与人类当真只有你死我活吗？"},{"姓名":"云冥","部":"斗3","时间点":"斗罗历22644年10月15日","封口":"史莱克","处境":"史莱克海神阁阁主、当代最强准神擎天斗罗，刚送当代七怪赴军训，尚不知弑神炮阴谋。","性格":"沉稳威严、睥睨天下却心怀赤诚，护短史莱克与爱妻雅莉，宁折不弯。","想知道":"联邦鹰派、传灵塔与圣灵教暗中究竟在酝酿什么针对史莱克的毒计。","改命点":"提前获知斗罗历22645年06月两枚十二级弑神炮袭城死局，早破阴谋保全海神阁与性命。","红包":[{"名称":"擎天神枪枪意残卷","品阶":"金","出处":"斗罗","说明":"当代第一准神亲笔凝意写就的枪道至理，参悟后长兵杀伐与破空锐度脱胎换骨。","落点":"功法"},{"名称":"准神精神淬炼心得","品阶":"金","出处":"斗罗","说明":"云冥踏破神元境的精神力打磨秘要，研读可大幅精进精神力点数并稳固识海。","落点":"精神力"},{"名称":"天锻金属蕴灵秘法","品阶":"红","出处":"斗罗","说明":"海神阁珍藏的高阶斗铠与器物温养心法，提升器物契合度与锻造辅助职业境界。","落点":"辅助职业"},{"名称":"海神阁黄金古树灵叶","品阶":"红","出处":"斗罗","说明":"沾染黄金古树浓郁生命气息的翠叶，危急时含服可迅疾疗伤并驱散阴邪侵蚀。","落点":"行囊"}],"开场白":"史莱克海神阁主云冥。阁下能无声穿透我的神元识海，想必非同寻常，请指教。"},{"姓名":"舞长空","部":"斗3","时间点":"斗罗历22635年07月10日","封口":"史莱克","处境":"痛失龙冰后执教东海零班，刚破七环魂圣，一面严训唐舞麟等人一面冰封心门。","性格":"冷冽孤傲、外冷内热、洁癖自律、极致护短，愿用一袭白衣为弟子遮挡风雪。","想知道":"零班这几个孩子能否真正考进史莱克，当年龙冰被害的幕后元凶何时能手刃。","改命点":"提前洞察传灵塔与圣灵教动向、护住零班少年与学院薪火，走出自我放逐的冰霜心狱。","红包":[{"名称":"天霜剑基础冰剑谱","品阶":"紫","出处":"斗罗","说明":"舞长空亲传的冷冽快剑与冰意凝锋剑诀，研习可显著提升剑术准度与冰系控场。","落点":"功法"},{"名称":"天冰一字斗铠设计图稿","品阶":"紫","出处":"斗罗","说明":"舞长空昔年自用的一字斗铠设计范本，极适合学习机甲斗铠设计与法阵排布。","落点":"辅助职业"},{"名称":"冰心清神手帕","品阶":"白","出处":"斗罗","说明":"染有天霜剑清冷气息的素白丝帕，随身携之可定神解暑、略微平复浮躁心绪。","落点":"行囊"},{"名称":"零班严训体能实战录","品阶":"黄","出处":"斗罗","说明":"凝结舞长空实战教导精髓的训练纲要，照练可加速打磨身法配合与临战反应。","落点":"功法"}],"开场白":"莫名其妙。若无要事，别打扰零班下午的实战特训。"},{"姓名":"原恩夜辉","部":"斗3","时间点":"斗罗历22639年01月05日","封口":"史莱克","处境":"初入史莱克外院工读不久，深藏泰坦巨猿与堕落天使双生之秘，畏惧血脉失控。","性格":"冷硬克制、自尊要强、沉稳护短，用孤冷外壳掩盖对至亲与血脉反噬的恐惧。","想知道":"堕落天使武魂的黑暗反噬能不能彻底化解，原恩家族何时能洗雪屈辱。","改命点":"提前获知调和光暗双脉之法并防备家族隐患，更早与伙伴并肩破魔归宗。","红包":[{"名称":"泰坦巨猿家族锻力石锁","品阶":"黄","出处":"斗罗","说明":"泰坦家族祖传重力炼体器具，日常负重苦修可稳步拔高肉身气力与筋骨强度。","落点":"行囊"},{"名称":"工读生精省锻材包","品阶":"白","出处":"斗罗","说明":"原恩夜辉省吃俭用攒下的几块百锻稀有金属，足够新手练手或修补寻常兵刃。","落点":"行囊"},{"名称":"泰坦重力压制劲法","品阶":"紫","出处":"斗罗","说明":"原恩家族一脉相承的重拳震荡发力法门，令强攻近战招式附带沉浑震击破防。","落点":"功法"},{"名称":"暗翼敛息抗侵心诀","品阶":"紫","出处":"斗罗","说明":"原恩夜辉日夜压制堕落天使躁动摸索出的静心秘法，可有效稳固心神抗衡心魔。","落点":"功法"}],"开场白":"原恩夜辉。只要真能帮我压住另一重武魂的反噬，工读生攒下的东西都可以拿来换。"},{"姓名":"蓝轩宇","部":"斗4","时间点":"斗罗历32642年05月15日","封口":"史莱克","处境":"刚考入史莱克学院外院不久，体内金银龙王双血脉消耗惊人，尚不知亲生父母来历。","性格":"温润阳光、腹黑精算、极度护短有担当，小小年纪已显露带队筹谋的班长气度。","想知道":"自己体内的金银蓝银草和神秘血脉究竟源自何处，全班伙伴将来能否都平安毕业。","改命点":"提前看清星际危机与天龙星局势，更早稳固双血脉并助养父母与全班规避险劫。","红包":[{"名称":"天罗星营养能量棒礼盒","品阶":"白","出处":"斗罗","说明":"星际魂师常备高能补给，一口即可迅速缓解剧烈体能消耗与饥饿乏力。","落点":"行囊"},{"名称":"史莱克基础星际战阵图","品阶":"黄","出处":"斗罗","说明":"蓝轩宇整理的小队合击站位与奇兵诱敌笔记，适用于多时代小队团战指挥。","落点":"功法"},{"名称":"高能班秘藏星陨铁块","品阶":"紫","出处":"斗罗","说明":"天罗星高能少年班考核奖品中的高纯稀有金属，极适合千锻灵锻或炼制精良器物。","落点":"行囊"},{"名称":"金银龙息微弱共鸣引","品阶":"红","出处":"斗罗","说明":"蕴含一缕至高龙神初生血脉韵律的晶石，兽武魂或魂兽感应可助血脉提纯。","落点":"生效状态"}],"开场白":"各位前辈哥哥姐姐好！我是史莱克一年级的蓝轩宇，请问有便宜又能补气血的修炼法子吗？"},{"姓名":"白秀秀","部":"斗4","时间点":"斗罗历32642年06月10日","封口":"史莱克","处境":"魔魂大白鲨重修为人，此刻仍用冻千秋之名在史莱克外院求学，与蓝轩宇渐生默契。","性格":"骄傲冷艳、嘴硬心软、独占欲强、知恩图报，外表高冷实则对珍视之人毫无保留。","想知道":"自己前世的模糊冰海记忆是怎么回事，和蓝轩宇并肩修炼能否打破血脉桎梏。","改命点":"提前明白自身冰海白鲨出身与未来天龙星、深红之域凶险，避开绝境重创。","红包":[{"名称":"深海寒玉冰心佩","品阶":"黄","出处":"斗罗","说明":"产自天罗星冰海的温润寒玉，佩戴可清凉识海、加快冰水属性魂力凝聚。","落点":"行囊"},{"名称":"魔鲨噬冰枪意笔记","品阶":"紫","出处":"斗罗","说明":"融汇冰海杀伐锐气与穿透冰刺的实战技巧，大幅强化冰水系近中程爆发。","落点":"功法"},{"名称":"海族秘传避水闭气诀","品阶":"黄","出处":"斗罗","说明":"源自海魂兽本能的水下潜行与换气法门，令陆地魂师在江河深海亦如履平地。","落点":"功法"},{"名称":"极寒冰潮凝魂露","品阶":"紫","出处":"斗罗","说明":"凝缩深海寒气的修魂药液，冰水系吸收可淬炼精神与魂力精纯度。","落点":"精神力"}],"开场白":"冻千秋……不对，这里显示的怎么是我昔日真名白秀秀？你到底是谁，怎会知晓！"},{"姓名":"钱磊","部":"斗4","时间点":"斗罗历32642年07月18日","封口":"史莱克","处境":"史莱克外院三三三寝室成员，三环召唤金钱武魂仍看天吃饭，正为赚徽章和追蓝梦琴发愁。","性格":"圆滑讨喜、爱财识货、嘴碎怕苦，但真遇生死关头却最讲义气、一步不退。","想知道":"召唤金钱武魂怎样才能稳定摇出强力魂兽，以及怎么才能打动蓝梦琴芳心。","改命点":"提前洞悉比蒙血脉进化契机与未来星际奇遇，更快成长为三十三天翼可靠支柱。","红包":[{"名称":"钱氏古币鉴宝小册","品阶":"白","出处":"斗罗","说明":"钱磊随父学来的古币珍玩鉴别要诀，逛黑市地摊捡漏淘货时极少看走眼。","落点":"辅助职业"},{"名称":"联邦币十万信用筹","品阶":"黄","出处":"斗罗","说明":"钱磊倒腾拍卖会攒下的私房钱，按当部时代货币折算入钱包（神界/英雄转行囊）。","落点":"钱包"},{"名称":"星际便携储能魂导灯","品阶":"白","出处":"斗罗","说明":"小巧耐用的星际探险强光照明器，附带微弱探测波动功能，地穴探秘实用。","落点":"行囊"},{"名称":"召唤金钱偏财祝运币","品阶":"紫","出处":"斗罗","说明":"钱磊吹响过百次的幸运旧币，带在身上在抽签、赌矿或寻宝时微增好手气。","落点":"行囊"}],"开场白":"发财了发财了！万载跨时代大群？前辈们手里有没有古董孤品，小弟钱磊高价收或者帮销！"},{"姓名":"唐雨格","部":"斗4","时间点":"斗罗历32643年03月22日","封口":"唐门","处境":"唐门嫡传、刚从外院三年级降入星战实验班，外冷内硬，与原恩辉辉暗藏身世心结。","性格":"骄傲要强、飒爽果决、嘴硬心软，严守唐门纪律，护短起来比谁都拼命。","想知道":"自己和原恩辉辉的身世纠葛真相究竟是什么，大五行神光如何融会贯通。","改命点":"提前解开对生父与弟弟的误会心结，更快淬炼五行麒麟潜力迎接星际大战。","红包":[{"名称":"五行高纯矿石标本盒","品阶":"紫","出处":"斗罗","说明":"唐雨格按金木水火土码齐的五种高纯稀有金属，极适合融锻、魂导器与阵法耗材。","落点":"行囊"},{"名称":"唐门星际暗器改良图","品阶":"紫","出处":"斗罗","说明":"融合现代魂导工艺的新式袖箭与追踪暗器图纸，大幅精进暗器与器物制作。","落点":"辅助职业"},{"名称":"大五行相生轮转诀","品阶":"红","出处":"斗罗","说明":"五行属性流转互济的精妙功法，修习可大幅增强魂力回复连贯性与元素转换速度。","落点":"功法"},{"名称":"五行辟邪护身玉符","品阶":"紫","出处":"斗罗","说明":"以五行相克之理炼制的防御玉牌，可缓冲一次同大层次强力元素魂技正面轰击。","落点":"行囊"}],"开场白":"唐门唐雨格。既同在斗罗一脉，废话少说，若解五行与旧事疑窦，必守信回礼。"},{"姓名":"蓝梦琴","部":"斗4","时间点":"斗罗历32647年03月20日","封口":"史莱克","处境":"北斗冰族少主、史莱克外院才女，此刻母亲蓝冰血脉漏洞发作病危，焦心寻医。","性格":"护友毒舌、外冷内热、孝顺重情，嘴上总嫌弃钱磊啰嗦却早已悄悄动心。","想知道":"究竟哪里能找到补全母亲血脉漏洞的至宝，不用眼睁睁看着母亲凋零。","改命点":"提前获知海神阁永恒之树生命本源可彻底救愈母亲蓝冰，免受整年煎熬与退学危机。","红包":[{"名称":"北斗冰族清心玉琴弦","品阶":"紫","出处":"斗罗","说明":"以极寒雪蚕丝炼制的灵韵琴弦，音律或精神系魂师用之可安神定魄、增幅音波控场。","落点":"行囊"},{"名称":"冰凰之舞凝冰琴谱","品阶":"红","出处":"斗罗","说明":"蓝梦琴融合玉凰琴与冰天雪女气息所悟群控群疗琴意，可提升控制与辅助配合。","落点":"功法"},{"名称":"翡翠天鹅一缕疗愈风","品阶":"红","出处":"斗罗","说明":"经碧姬魂灵首肯凝于玉瓶的一缕治愈生机，重伤时开启可迅疾止血续骨回气。","落点":"行囊"},{"名称":"极北冰族百年雪莲膏","品阶":"紫","出处":"斗罗","说明":"北斗冰族秘传疗伤养元灵膏，服之稳固经脉并驱除炽热火毒反噬。","落点":"行囊"}],"开场白":"只要真有前辈知道怎么治好我母亲的血脉暗伤，别说冰族秘藏，什么代价我都肯出！"}]};

const GF_PROMPT_CHAT = "你是斗罗宇宙角色卡「跨时代聊天群」的后台群聊生成引擎。请根据下文信息，生成本轮跨时代群友的真实对话、威望变化、剧透更新与群友异时空进展。\n\n【硬性输出格式】\n只能输出**一个合法纯 JSON 对象**，直接以 `{` 开头、`}` 结尾，严禁输出代码块围栏、寒暄、解释或多余文字：\n{\n  \"消息\": [\n    {\"发言\": \"群友全名\", \"内容\": \"发言内容\", \"红包\": null},\n    {\"发言\": \"群友全名\", \"内容\": \"发言内容\", \"红包\": {\"名称\": \"≤20字\", \"品阶\": \"白|黄|紫|红|金|彩\", \"出处\": \"斗罗\", \"说明\": \"≤60字：斗罗折算效用\", \"落点\": \"14选1不含面板\"}}\n  ],\n  \"威望变化\": 0,\n  \"剧透更新\": [{\"群友\": \"群友全名\", \"内容\": \"≤40字\", \"状态\": \"待应验|已应验|落空\"}],\n  \"世界线更新\": [{\"姓名\": \"群友全名\", \"世界线\": \"≤60字\"}]\n}\n\n【输入上下文】\n- 主角摘要：{{主角摘要}}\n- 主角最近正文：{{最近正文}}\n- 原作指导：{{原作指导}}\n- 叙事核心：{{叙事核心}}\n- 主角气运（场外参考，群友不可见）：{{气运}}\n- 群主机器人口吻：{{口吻}}\n- 已入群群友档案：{{群友}}\n- 最近群聊记录：{{最近群聊}}\n- 主角群名片：{{群名片}}\n- 主角自定人设：{{人设}}\n- 主角当前威望与档位：{{威望}}\n- 现有剧透记录：{{剧透}}\n- 本轮主角发言（为空则主动活跃/回报近况）：{{主角发言}}\n\n【生成准则】\n1. **人物与知情边界**：\n   - `消息[].发言` 仅限 `{{群友}}` 中已入群斗罗人物的**标准全名**（不用别名或变体后缀），播报群通知时可用 `{{口吻}}` 指定的群主机器人名；严禁替主角发言，严禁引入斗罗以外任何作品人物。\n   - 群友严格停留在各自异时空与时间点，口吻见识贴合时代与性格；绝不知主角真名、位置及场外 `{{气运}}` 词条，只凭 `{{群名片}}`、`{{人设}}` 与发言揣测主角。\n   - 统一采用斗罗标准术语（称原作、异时空、群友、神位、神级魂环、大层次、情意），涉敏感情节只标时间点与变故，绝不写细节。\n2. **发言条数与互动**：\n   - `{{主角发言}}` 非空时生成 2–5 条回应，可穿插跨时代惊叹互答；为空时生成 2–4 条日常互聊、验证旧剧透或改命后回来致谢求助的动态。\n3. **按 `{{威望}}` 五档塑造态度**：\n   - `0–19 无人问津`：疑主角装神弄鬼，冷淡质疑，几不发贵重红包。\n   - `20–39 初露锋芒`：半信半疑试探，偶发白/黄阶谢礼。\n   - `40–59 有点名气`：渐生敬意请教，愿奉紫/红阶私藏。\n   - `60–79 群中高人`：敬称前辈，视指点为救命稻草，改命后慷慨赠宝。\n   - `80–100 万古传说`：封号、凶兽乃至神王亦执道友礼敬畏相询，愿奉金/彩重宝。\n4. **威望、剧透与异时空**：\n   - `威望变化` 取 `-15` 至 `15` 整数：剧透切中改命点或应验加 `3–15`；胡诌穿帮或落空扣 `3–15`；日常寒暄写 `0`。\n   - `剧透更新` 仅在新增预判（`待应验`）或旧预判验证（`已应验`/`落空`）时输出，否则 `[]`；`世界线更新` 仅在群友异时空实质变轨时输出（不改主线），否则 `[]`。\n5. **红包发放铁律**：\n   - 整轮至多 0–1 个红包，仅于求教预付、剧透应验重谢或折服时发出；物品必须是该群友当前时间点真拿得出的斗罗物事，`出处` 固定 `\"斗罗\"`，品阶契合身家与威望。\n   - `落点` 严格取 `行囊|钱包|武魂|魂环|魂骨|领域|功法|天赋能力|生效状态|精神力|魂力等级|辅助职业|气运|其他`（**严禁写 `面板`**）；严禁直接给神位、严禁跨大层次、严禁写连续晋阶。\n";
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

/* 金手指 · 跨时代聊天群（变量结构 + 防篡改/自动拉新 + 后台群聊生成 + 红包领取 + B4 提示词注入）
 * 规则：
 *   - 完整聊天记录与红包放小手机聊天变量（store.gfChat），不进 MVU；未启用小手机时用本脚本内存兜底
 *   - 威望 0–100，每次变动夹在 -15..+15，自动算五档（无人问津/初露锋芒/有点名气/群中高人/万古传说）
 *   - B4 自动拉新：跨部或完成一条聊天群主线任务时从 32 人名单自动拉 1 位未入群群友（上限 8 位）
 *   - B4 提示词注入：把最近 6 条群消息与未领红包通过 injectPrompts（id: 'dl-gf-chat', depth: 2）注入正文，换聊天或卸载时 uninjectPrompts 清理
 *   - B6/B7：红包与待入账不含 面板 落点；神界/英雄部 钱包 自动改 行囊
 */
const GF_DEF = (() => {
  const INJECT_ID = 'dl-gf-chat';
  const ERAS = ['斗1', '斗2', '神界', '英雄', '斗3', '斗4'];
  const SPOILER_STATES = ['待应验', '已应验', '落空'];
  const clip = (s, max) => {
    const t = String(s == null ? '' : s).trim();
    return max && [...t].length > max ? [...t].slice(0, max).join('') : t;
  };
  const friendsPool = () => (typeof GF_FRIENDS !== 'undefined' && GF_FRIENDS && Array.isArray(GF_FRIENDS.群友) ? GF_FRIENDS.群友 : []);
  const friendMeta = (name) => friendsPool().find((f) => f && f.姓名 === name) || null;

  // ── 兜底内存群聊库（当未启用斗罗小手机或离线测试时使用） ──
  const memByChat = new Map();
  let lastInjectSig = '';
  let injected = false;
  let pendingInvites = [];

  function currentChatId(W) {
    try {
      const c = W && W.SillyTavern && W.SillyTavern.getContext && W.SillyTavern.getContext();
      return String((c && (c.getCurrentChatId ? c.getCurrentChatId() : c.chatId)) || 'default');
    } catch (_) { return 'default'; }
  }
  function blankChat() { return { msgs: [], packets: [], unread: 0, seeded: false }; }
  function getChat(W) {
    try {
      const api = W && W.__DL_PHONE__ && W.__DL_PHONE__.gfChat;
      if (api && typeof api.get === 'function') {
        const g = api.get();
        if (g && typeof g === 'object') return g;
      }
    } catch (_) { /* 退回内存 */ }
    const cid = currentChatId(W);
    if (!memByChat.has(cid)) memByChat.set(cid, blankChat());
    return memByChat.get(cid);
  }
  function mutateChat(W, fn) {
    try {
      const api = W && W.__DL_PHONE__ && W.__DL_PHONE__.gfChat;
      if (api && typeof api.sync === 'function') {
        api.sync(fn);
        return;
      }
    } catch (_) { /* 退回内存 */ }
    const g = getChat(W);
    fn(g);
  }
  function nowHm() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function seedIfNeeded(stat, W) {
    const G = stat && stat.金手指;
    const C = G && G.聊天群;
    if (!C || !Array.isArray(C.群友) || !C.群友.length) return;
    const cur = getChat(W);
    if (cur.seeded || (cur.msgs && cur.msgs.length)) return;
    const bot = (G.口吻 && G.口吻.名字) || '群主机器人';
    const today = (stat.时空 && stat.时空.外界日期) || '';
    const hm = nowHm();
    mutateChat(W, (gc) => {
      if (gc.seeded || gc.msgs.length) return;
      gc.seeded = true;
      let seq = 1;
      const nid = () => `gc_${Date.now().toString(36)}_${seq++}`;
      gc.msgs.push({ id: nid(), kind: 'bot', who: bot, text: `欢迎「${C.群名片 || '神秘群友'}」加入「${C.群名}」。当前在线群友：${C.群友.map((f) => f.姓名).join('、')}。`, tm: hm, date: today });
      for (const f of C.群友) {
        const meta = friendMeta(f.姓名);
        if (meta && meta.开场白) {
          gc.msgs.push({ id: nid(), kind: 'msg', who: f.姓名, era: f.部, text: meta.开场白, tm: hm, date: today });
        }
      }
    });
  }

  // ── B4 提示词注入：把最近 6 条群消息和未领红包带给正文模型 ──
  function buildInjectText(stat, W) {
    const G = stat && stat.金手指;
    if (!G || G.类型 !== '跨时代聊天群' || !G.聊天群) return '';
    const C = G.聊天群;
    const gc = getChat(W);
    const msgs = (Array.isArray(gc.msgs) ? gc.msgs : [])
      .filter((m) => m && (m.kind === 'me' || m.kind === 'msg' || m.kind === 'shift'))
      .slice(-6);
    const unclaimed = (Array.isArray(gc.packets) ? gc.packets : []).filter((p) => p && !p.已领);
    if (!msgs.length && !unclaimed.length) return '';
    const lines = [`【跨时代聊天群 · 最近动态】群名「${C.群名}」，主角群名片「${C.群名片 || '未设'}」（威望 ${C.威望} · ${C.威望档}）。群友均在各自异时空，不直接干涉主线；主角知情但世人不知，正文可自然承接或用 <群消息> 摘录几条。`];
    if (msgs.length) {
      lines.push('最近消息：');
      for (const m of msgs) {
        const tag = m.kind === 'me' ? `${C.群名片 || '主角'}（主角）` : m.kind === 'shift' ? `世界线变动·${m.who}` : `${m.who}${m.era ? '·' + m.era : ''}`;
        lines.push(`- ${tag}：${String(m.text || '').slice(0, 120)}`);
      }
    }
    if (unclaimed.length) {
      lines.push('尚未领取的红包（需玩家点领后进待入账）：');
      for (const p of unclaimed.slice(0, 4)) {
        lines.push(`- ${p.群友}：${p.名称}（${p.品阶 || '白'}阶｜${p.说明}）`);
      }
    }
    return lines.join('\n');
  }

  function syncInject(stat, W) {
    const text = buildInjectText(stat, W);
    if (text === lastInjectSig) return;
    try {
      if (injected && typeof uninjectPrompts === 'function') uninjectPrompts([INJECT_ID]);
    } catch (_) { /* 尚未注入 */ }
    injected = false;
    lastInjectSig = text;
    if (!text) return;
    try {
      if (typeof injectPrompts === 'function') {
        injectPrompts([{ id: INJECT_ID, position: 'in_chat', depth: 2, role: 'system', content: text, should_scan: false }]);
        injected = true;
      }
    } catch (e) { console.warn('[斗罗金手指·跨时代聊天群] 提示词注入失败', e); }
  }

  function clearInject() {
    try {
      if (injected && typeof uninjectPrompts === 'function') uninjectPrompts([INJECT_ID]);
    } catch (_) { /* 已撤 */ }
    injected = false;
    lastInjectSig = '';
  }

  // ── 变量结构 ──
  function schema(z, K, tones) {
    const friendShape = {
      姓名: K.str('', 16),
      部: K.pick(ERAS, '斗1'),
      时间点: K.str('', 24),
      处境: K.str('', 40),
      世界线: K.str('', 60),
      入群: K.str('', 24),
    };
    const spoilerShape = {
      群友: K.str('', 16),
      内容: K.str('', 40),
      状态: K.pick(SPOILER_STATES, '待应验'),
    };
    const chatShape = K.pre((v) => (gfIsPlainObj(v) ? v : {}), z.object({
      群名: K.str('万载斗罗听道群', 12),
      群名片: K.str('', 12),
      人设: K.str('', 60),
      威望: K.int(20, 0, 100),
      威望档: K.derived(),
      群友: K.list(friendShape, 8),
      剧透: K.list(spoilerShape, 12),
    })).transform((c) => ({ ...c, 威望档: gfPrestigeTier(c.威望) }));
    return gfBlockSchema(z, '跨时代聊天群', { 聊天群: chatShape }, null, tones);
  }

  // ── 每轮把关 + B4 自动拉新 ──
  function pickInvite(existing, preferPart, rand = Math.random) {
    const have = new Set(existing.map((f) => f && f.姓名));
    const pool = friendsPool().filter((f) => f && f.姓名 && !have.has(f.姓名));
    if (!pool.length) return null;
    const same = preferPart ? pool.filter((f) => f.部 === preferPart) : [];
    const cand = same.length ? same : pool;
    return cand[Math.floor(rand() * cand.length)];
  }

  function onUpdated(after, before, opts = {}) {
    const G = after && after.金手指;
    if (!G || G.类型 !== '跨时代聊天群' || !gfIsPlainObj(G.聊天群)) return;
    const C = G.聊天群;
    const prevG = before && gfIsPlainObj(before.金手指) && before.金手指.类型 === '跨时代聊天群' ? before.金手指 : null;
    const prevC = prevG && gfIsPlainObj(prevG.聊天群) ? prevG.聊天群 : null;
    const todayStr = (after.时空 && after.时空.外界日期) || '';
    const part = (after.时空 && after.时空.当前部) || null;

    // 1. 保护脚本/玩家维护的聊天群字段不被 AI 篡改
    if (prevC) {
      C.群名 = prevC.群名;
      C.群名片 = prevC.群名片;
      C.人设 = prevC.人设;
      C.威望 = prevC.威望;
      C.群友 = JSON.parse(JSON.stringify(Array.isArray(prevC.群友) ? prevC.群友 : []));
      C.剧透 = JSON.parse(JSON.stringify(Array.isArray(prevC.剧透) ? prevC.剧透 : []));
    }

    // 2. B4 自动拉新：跨部转场或本轮完成主线任务时拉 1 位新群友（上限 8 位）
    let invites = 0;
    if (before && before.时空 && before.时空.当前部 && part && before.时空.当前部 !== part) {
      invites += 1;
    }
    if (prevG) {
      const prevDoneMain = new Set((Array.isArray(prevG.任务) ? prevG.任务 : [])
        .filter((t) => t && t.类别 === '主线' && t.状态 === '已完成')
        .map((t) => t.标题));
      for (const t of (Array.isArray(G.任务) ? G.任务 : [])) {
        if (t && t.类别 === '主线' && t.状态 === '已完成' && !prevDoneMain.has(t.标题)) {
          invites += 1;
        }
      }
    }
    const rand = typeof opts.rand === 'function' ? opts.rand : Math.random;
    for (let i = 0; i < invites && C.群友.length < 8; i += 1) {
      const f = pickInvite(C.群友, part, rand);
      if (!f) break;
      const entry = {
        姓名: f.姓名,
        部: f.部,
        时间点: f.时间点,
        处境: clip(f.处境, 40),
        世界线: '照原作走。',
        入群: todayStr,
      };
      C.群友.push(entry);
      pendingInvites.push({ friend: entry, openLine: f.开场白 || '' });
    }
    C.威望档 = gfPrestigeTier(C.威望);
  }

  // ── 互动操作：发言 / 活跃 / 领红包 ──
  function sanitizePacket(raw, sender, part, todayStr) {
    if (!gfIsPlainObj(raw) || !String(raw.名称 || '').trim()) return null;
    const rawDrop = String(raw.落点 || '行囊').trim();
    const safeDrop = (rawDrop === '面板' || !GF_DROP_TARGETS.includes(rawDrop)) ? '行囊' : gfFixDropTarget(rawDrop, part);
    const tier = GF_REWARD_TIERS.includes(raw.品阶) ? raw.品阶 : '黄';
    const meta = friendMeta(sender);
    return {
      id: `pk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      群友: sender,
      封: (meta && meta.封口) || '散修',
      祝福: clip(raw.祝福 || raw.说明 || raw.名称, 40),
      名称: clip(raw.名称, 20),
      品阶: tier,
      出处: '斗罗',
      说明: clip(raw.说明 || '群友隔空相赠之物。', 60),
      落点: safeDrop,
      日期: todayStr,
      已领: false,
    };
  }

  async function act(action, payload, stat, env) {
    const G = stat && stat.金手指;
    const C = G && G.聊天群;
    if (!C) return { ok: false, why: '找不到跨时代聊天群数据' };
    const part = (stat.时空 && stat.时空.当前部) || null;
    const todayStr = (stat.时空 && stat.时空.外界日期) || '';
    const W = env && env.W;

    if (action === '领红包') {
      const gc = getChat(W);
      let pk = null;
      if (payload && payload.id && Array.isArray(gc.packets)) {
        pk = gc.packets.find((p) => p && p.id === payload.id) || null;
      }
      if (!pk && payload && gfIsPlainObj(payload.红包)) pk = payload.红包;
      if (!pk) return { ok: false, why: '找不到这个红包' };
      if (pk.已领) return { ok: false, why: '这个红包已经领过了' };
      const rawDrop = String(pk.落点 || '行囊').trim();
      const safeDrop = (rawDrop === '面板' || !GF_DROP_TARGETS.includes(rawDrop)) ? '行囊' : gfFixDropTarget(rawDrop, part);
      const reward = gfPushPending(G, {
        名称: clip(pk.名称, 20) || '群友红包',
        品阶: GF_REWARD_TIERS.includes(pk.品阶) ? pk.品阶 : '黄',
        来源: '红包',
        出处: '斗罗',
        说明: clip(pk.说明, 60),
        落点: safeDrop,
        日期: todayStr || pk.日期 || '',
      }, part);
      return { ok: true, id: pk.id || null, 奖励: reward, 群友: pk.群友 || '' };
    }

    if (action !== '发言' && action !== '活跃') return { ok: false, why: `不支持的操作：${action}` };
    const isSpeak = action === '发言';
    const userText = isSpeak ? clip(payload && payload.文本, 200) : '';
    const isSpoiler = isSpeak && !!(payload && payload.剧透);
    if (isSpeak && !userText) return { ok: false, why: '还没写要说的话' };

    const gc = getChat(W);
    const recentMsgs = (Array.isArray(gc.msgs) ? gc.msgs : [])
      .filter((m) => m && (m.kind === 'me' || m.kind === 'msg' || m.kind === 'bot' || m.kind === 'shift'))
      .slice(-10)
      .map((m) => `${m.kind === 'me' ? (C.群名片 || '主角') : (m.who || '系统')}：${m.text}`)
      .join('\n') || '（暂无群聊记录）';

    const friendsText = (C.群友 || []).map((f) => {
      const m = friendMeta(f.姓名) || {};
      return `${f.姓名}（${f.部}｜${f.时间点}｜处境：${f.处境}｜世界线：${f.世界线}${m.性格 ? '｜性格：' + m.性格 : ''}${m.想知道 ? '｜想知道：' + m.想知道 : ''}${m.改命点 ? '｜改命点：' + m.改命点 : ''}）`;
    }).join('\n') || '（暂无群友）';

    const spoilersText = (C.剧透 || []).length
      ? C.剧透.map((s) => `${s.群友}：${s.内容}（${s.状态}）`).join('；')
      : '无';

    const baseCtx = gfPromptContext(stat, env);
    const tpl = typeof GF_PROMPT_CHAT === 'string' ? GF_PROMPT_CHAT : '';
    const prompt = gfFillTemplate(tpl, {
      ...baseCtx,
      群友: friendsText,
      最近群聊: recentMsgs,
      群名片: C.群名片 || '神秘群友',
      人设: C.人设 || '（未设）',
      威望: `${C.威望}（${C.威望档}）`,
      剧透: spoilersText,
      主角发言: isSpeak ? `${isSpoiler ? '【主角标记剧透】' : ''}${userText}` : '',
    });

    let res;
    try {
      res = await env.generate([
        { role: 'system', content: prompt },
        { role: 'user', content: isSpeak ? `主角（${C.群名片 || '神秘群友'}）在群里发言：${userText}` : '请生成本轮群内主动活跃或旧剧透后续，只输出一个合法 JSON 对象。' },
      ], { tag: 'gf-chat' });
    } catch (e) {
      return { ok: false, why: `群聊后台生成失败或超时：${(e && e.message) || e}` };
    }

    const rawText = typeof res === 'string' ? res : (res && res.text) || '';
    const parsed = gfParseJsonObject(rawText);
    if (!parsed || !Array.isArray(parsed.消息)) {
      return { ok: false, why: '群聊返回格式不对（未拿到 JSON 消息数组），可重试' };
    }

    const botName = (G.口吻 && G.口吻.名字) || '群主机器人';
    const joinedByName = new Map((C.群友 || []).map((f) => [f.姓名, f]));
    const cleanMsgs = [];
    let newPacket = null;
    for (const item of parsed.消息) {
      if (!gfIsPlainObj(item)) continue;
      const who = clip(item.发言, 16);
      const text = clip(item.内容, 240);
      if (!who || !text) continue;
      const isBot = who === botName || who === '群主机器人';
      const f = joinedByName.get(who);
      if (!isBot && !f) continue; // 拦截未入群/外书人物
      let pk = null;
      if (!isBot && !newPacket && item.红包) {
        pk = sanitizePacket(item.红包, who, part, todayStr);
        if (pk) newPacket = pk;
      }
      cleanMsgs.push({
        kind: isBot ? 'bot' : 'msg',
        who: isBot ? botName : who,
        era: f ? f.部 : '',
        text,
        packet: pk,
      });
      if (cleanMsgs.length >= 5) break;
    }

    // 威望变化夹在 -15..15
    const delta = Math.max(-15, Math.min(15, Math.trunc(Number(parsed.威望变化) || 0)));
    C.威望 = Math.max(0, Math.min(100, (C.威望 || 0) + delta));
    C.威望档 = gfPrestigeTier(C.威望);

    // 剧透更新（上限 12）
    const spList = Array.isArray(C.剧透) ? C.剧透.slice() : [];
    const cleanSpoilers = [];
    let addedPendingSpoiler = false;
    for (const s of (Array.isArray(parsed.剧透更新) ? parsed.剧透更新 : [])) {
      if (!gfIsPlainObj(s)) continue;
      const who = clip(s.群友, 16);
      const content = clip(s.内容, 40);
      const st = SPOILER_STATES.includes(s.状态) ? s.状态 : '待应验';
      if (!who || !content || !joinedByName.has(who)) continue;
      const idx = spList.findIndex((x) => x.群友 === who && x.内容 === content);
      if (idx >= 0) spList[idx] = { 群友: who, 内容: content, 状态: st };
      else {
        spList.push({ 群友: who, 内容: content, 状态: st });
        if (st === '待应验') addedPendingSpoiler = true;
      }
      cleanSpoilers.push({ 群友: who, 内容: content, 状态: st });
    }
    if (isSpoiler && !addedPendingSpoiler && C.群友.length) {
      const hitFriend = C.群友.find((f) => userText.includes(f.姓名)) || C.群友[0];
      const auto = { 群友: hitFriend.姓名, 内容: clip(userText.replace(/^@\S+\s*/u, ''), 40), 状态: '待应验' };
      spList.push(auto);
      cleanSpoilers.push(auto);
    }
    C.剧透 = spList.slice(-12);

    // 世界线更新
    const cleanShifts = [];
    for (const w of (Array.isArray(parsed.世界线更新) ? parsed.世界线更新 : [])) {
      if (!gfIsPlainObj(w)) continue;
      const who = clip(w.姓名, 16);
      const wl = clip(w.世界线, 60);
      const f = joinedByName.get(who);
      if (!f || !wl || f.世界线 === wl) continue;
      f.世界线 = wl;
      cleanShifts.push({ 姓名: who, 世界线: wl });
    }

    return {
      ok: true,
      userText,
      isSpoiler,
      消息: cleanMsgs,
      威望变化: delta,
      威望: C.威望,
      威望档: C.威望档,
      剧透更新: cleanSpoilers,
      世界线更新: cleanShifts,
      新红包: newPacket,
      via: (res && res.via) || 'tavern',
    };
  }

  function afterAct(action, res, stat, ctx) {
    const W = ctx && ctx.W;
    const todayStr = (stat && stat.时空 && stat.时空.外界日期) || '';
    const hm = nowHm();
    if (action === '领红包') {
      if (res && res.id) {
        mutateChat(W, (gc) => {
          const pk = (gc.packets || []).find((p) => p && p.id === res.id);
          if (pk) pk.已领 = true;
        });
      }
      syncInject(stat, W);
      return;
    }
    if (action === '发言' || action === '活跃') {
      seedIfNeeded(stat, W);
      mutateChat(W, (gc) => {
        gc.seeded = true;
        let seq = 1;
        const nid = () => `gc_${Date.now().toString(36)}_${seq++}`;
        if (action === '发言' && res.userText) {
          gc.msgs.push({
            id: nid(), kind: 'me', who: (stat.金手指.聊天群 && stat.金手指.聊天群.群名片) || '神秘群友',
            text: res.userText, tm: hm, date: todayStr,
            spoiler: !!res.isSpoiler, spoilerState: res.isSpoiler ? '待应验' : null,
          });
        }
        for (const m of (res.消息 || [])) {
          if (m.packet) {
            gc.packets.unshift(m.packet);
            if (gc.packets.length > 24) gc.packets.length = 24;
          }
          gc.msgs.push({
            id: nid(), kind: m.kind, who: m.who, era: m.era || '',
            text: m.text, tm: hm, date: todayStr, packetId: m.packet ? m.packet.id : null,
          });
        }
        for (const sh of (res.世界线更新 || [])) {
          gc.msgs.push({
            id: nid(), kind: 'shift', who: sh.姓名, text: sh.世界线, tm: hm, date: todayStr,
          });
        }
        if (gc.msgs.length > 200) gc.msgs.splice(0, gc.msgs.length - 200);
        // 如果小手机聊天群页当前没开着，累计未读
        try {
          const openGc = W && W.__DL_PHONE__ && W.__DL_PHONE__.gfChat && typeof W.__DL_PHONE__.gfChat.isVisible === 'function' && W.__DL_PHONE__.gfChat.isVisible();
          if (!openGc) gc.unread = (gc.unread || 0) + (res.消息 || []).length;
        } catch (_) { /* ignore */ }
      });
      syncInject(stat, W);
    }
  }

  function onSync(stat, ctx) {
    const W = ctx && ctx.W;
    if (!stat || !stat.金手指 || stat.金手指.类型 !== '跨时代聊天群') {
      clearInject();
      return;
    }
    seedIfNeeded(stat, W);
    if (pendingInvites.length) {
      const list = pendingInvites.splice(0);
      const bot = (stat.金手指.口吻 && stat.金手指.口吻.名字) || '群主机器人';
      const todayStr = (stat.时空 && stat.时空.外界日期) || '';
      const hm = nowHm();
      mutateChat(W, (gc) => {
        let seq = 1;
        const nid = () => `gc_${Date.now().toString(36)}_inv${seq++}`;
        for (const inv of list) {
          gc.msgs.push({ id: nid(), kind: 'bot', who: bot, text: `新群友「${inv.friend.姓名}」（${inv.friend.部}）已加入本群！`, tm: hm, date: todayStr });
          if (inv.openLine) gc.msgs.push({ id: nid(), kind: 'msg', who: inv.friend.姓名, era: inv.friend.部, text: inv.openLine, tm: hm, date: todayStr });
          gc.unread = (gc.unread || 0) + 1;
        }
      });
    }
    syncInject(stat, W);
  }

  function onDestroy() {
    clearInject();
  }

  function pageData() {
    return { friends: friendsPool().map((f) => ({ 姓名: f.姓名, 部: f.部, 封口: f.封口 })) };
  }

  function bridge({ W }) {
    return {
      chatState: () => getChat(W),
      buildInject: (stat) => buildInjectText(stat, W),
    };
  }

  return { schema, onUpdated, act, afterAct, onSync, onDestroy, pageData, bridge };
})();

const GF_PAGE = "/* 金手指 · 主页面代码的共用部分（状态栏系统页外壳 + 正文 <系统> 六皮标签）\n * build.py 把 本文件 + 页面/<类型>.js 拼起来，末尾加一句 return DLGF_PAGE_<类型>(GF, INFO, BRIDGE, DLGF_SHARED(GF, INFO, BRIDGE))，\n * 整段由金手指脚本在主页面里用 new Function('GF', 'INFO', 'BRIDGE', 代码) 执行。\n * 视觉红线：无朱砂主色、无大圆角（≤4px）、无 emoji 图标、无远程资源、三档动效（full / reduced→lite / off）+ prefers-reduced-motion。\n */\nfunction DLGF_SHARED(GF, INFO, BRIDGE) {\n  const esc = (s) => String(s == null ? '' : s).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\n  const TIER = ['彩', '金', '红', '紫', '黄', '白'];\n  const SYS_KEY = { 未来模拟器: 'sim', 深蓝加点: 'pts', 诸天代打: 'hero', 签到打卡: 'sign', 抽奖: 'gacha', 跨时代聊天群: 'chat' };\n  const gfOf = (st) => (st && st.金手指 && typeof st.金手指 === 'object' ? st.金手指 : null);\n  const mine = (st) => { const g = gfOf(st); return !!g && g.类型 === GF; };\n\n  function dayNo(s) {\n    const m = /(前)?(\\d{1,9})年(\\d{1,2})月(\\d{1,2})日/u.exec(String(s || ''));\n    if (!m) return null;\n    const y0 = (m[1] ? -1 : 1) * Number(m[2]), mo = Number(m[3]), d = Number(m[4]);\n    const y = y0 - (mo <= 2 ? 1 : 0), era = Math.floor(y / 400), yoe = y - era * 400;\n    const doy = Math.floor((153 * ((mo + 9) % 12) + 2) / 5) + d - 1;\n    return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;\n  }\n  const daysTo = (from, to) => { const a = dayNo(from), b = dayNo(to); return a == null || b == null ? null : b - a; };\n  const short = (s) => { const m = /(\\d{1,2})月(\\d{1,2})日/u.exec(String(s || '')); return m ? `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}` : '—'; };\n  const year = (s) => { const m = /(前)?(\\d{1,9})年/u.exec(String(s || '')); return m ? (m[1] ? '前' : '') + m[2] : '—'; };\n  const tierIn = (text) => { const m = /([彩金红紫黄白])阶/u.exec(String(text || '')); return m ? m[1] : null; };\n\n  function motionOf(kit) {\n    const raw = (kit && kit.motion) || (document.documentElement.dataset.dlMotion) || 'full';\n    if (raw === 'off') return 'off';\n    try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off'; } catch (_) { /* ignore */ }\n    return raw === 'reduced' || raw === 'lite' ? 'lite' : 'full';\n  }\n  const still = (kit) => motionOf(kit) !== 'full';\n\n  function frag(html) {\n    const t = document.createElement('template');\n    t.innerHTML = String(html || '').trim();\n    return t.content.firstElementChild;\n  }\n\n  function typeIn(el, text, kit, speed = 26) {\n    if (!el) return;\n    if (el._typing) { clearInterval(el._typing); el._typing = null; }\n    const s = String(text || '');\n    if (still(kit)) { el.innerHTML = `<q>${esc(s)}</q>`; return; }\n    let i = 0;\n    const q = document.createElement('q');\n    const cur = document.createElement('i');\n    cur.className = 'cur';\n    el.replaceChildren(q, cur);\n    el._typing = setInterval(() => {\n      if (!el.isConnected) { clearInterval(el._typing); el._typing = null; return; }\n      i += 1;\n      q.textContent = s.slice(0, i);\n      if (i >= s.length) {\n        clearInterval(el._typing); el._typing = null;\n        setTimeout(() => { if (cur.isConnected) cur.remove(); }, 1600);\n      }\n    }, speed);\n  }\n\n  function roll(el, to, kit, ms = 700) {\n    if (!el) return;\n    let tn = [...el.childNodes].find((n) => n.nodeType === 3);\n    if (!tn) tn = el.insertBefore(document.createTextNode(''), el.firstChild);\n    const from = Number(el.dataset.v != null ? el.dataset.v : parseFloat(tn.textContent)) || 0;\n    el.dataset.v = String(to);\n    if (still(kit) || from === to) { tn.textContent = String(to); return; }\n    const t0 = performance.now();\n    const step = () => {\n      if (!el.isConnected) return;\n      const p = Math.min(1, (performance.now() - t0) / ms);\n      tn.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));\n      if (p < 1) setTimeout(step, 16);\n    };\n    step();\n  }\n\n  function burst(host, x, y, colors, kit, n = 18, spread = 90) {\n    if (still(kit) || !host || !host.isConnected) return;\n    const cols = colors && colors.length ? colors : ['#fff'];\n    for (let i = 0; i < n; i += 1) {\n      const s = document.createElement('i');\n      s.className = 'jp-spark';\n      s.style.left = x + 'px';\n      s.style.top = y + 'px';\n      s.style.setProperty('--c', cols[i % cols.length]);\n      host.appendChild(s);\n      const a = Math.random() * Math.PI * 2;\n      const r = spread * (0.4 + Math.random() * 0.8);\n      if (s.animate) {\n        s.animate([\n          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },\n          { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(.2)`, opacity: 0 },\n        ], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => s.remove();\n      } else {\n        setTimeout(() => s.remove(), 400);\n      }\n    }\n  }\n\n  function toast(root, msg) {\n    if (!root) return;\n    root.querySelectorAll('.jp-toast').forEach((t) => t.remove());\n    const t = document.createElement('div');\n    t.className = 'jp-toast';\n    t.setAttribute('role', 'status');\n    t.textContent = String(msg || '');\n    root.appendChild(t);\n    setTimeout(() => { if (t.isConnected) t.remove(); }, 2700);\n  }\n\n  const disabled = (kit) => (BRIDGE && typeof BRIDGE.disabled === 'function' ? BRIDGE.disabled(kit) : '');\n  const act = (action, payload, opts) => (BRIDGE && typeof BRIDGE.act === 'function'\n    ? BRIDGE.act(action, payload, opts)\n    : Promise.resolve({ ok: false, why: '金手指写入桥不可用' }));\n  const syncBar = () => { if (BRIDGE && typeof BRIDGE.syncBar === 'function') BRIDGE.syncBar(); };\n\n  function lockBanner(reason) {\n    return reason ? `<div class=\"jp-lock\" role=\"note\">${esc(reason)}</div>` : '';\n  }\n\n  function caveat(extra) {\n    const text = extra || '面板操作写入最新 AI 楼层；重新生成或右滑这一层时，本层做过的签到、抽奖、加点等操作会一并撤销。';\n    return `<p class=\"jp-caveat\">${esc(text)}</p>`;\n  }\n\n  // ── 页头（含随时改口吻入口） ──\n  function head(G, o, kit) {\n    const tone = (G && G.口吻) || {};\n    const lock = disabled(kit);\n    return `<header class=\"jp-hd\">\n      <div class=\"jp-mark\" aria-hidden=\"true\">${o.mark || ''}</div>\n      <div class=\"jp-nm\"><b>${esc(tone.名字 || o.名字 || INFO.默认名 || '系统')}</b><span>${esc(G.类型)}${tone.预设 ? ' · ' + esc(tone.预设) : ' · 自定口吻'}</span><button type=\"button\" class=\"jp-tone-btn\" data-tone-toggle ${lock ? 'disabled' : ''}>改口吻</button></div>\n      <div class=\"jp-hs\">${(o.stats || []).map((s) => `<div><b data-k=\"${esc(s.k)}\">${esc(s.v)}${s.u ? `<small>${esc(s.u)}</small>` : ''}</b><span>${esc(s.label)}</span></div>`).join('')}</div>\n      <p class=\"jp-say\" aria-live=\"polite\"></p>\n    </header><div class=\"jp-tone\" data-part=\"tone\" hidden></div>`;\n  }\n\n  function bindToneEditor(root, G, kit) {\n    const btn = root.querySelector('[data-tone-toggle]');\n    const box = root.querySelector('[data-part=\"tone\"]');\n    if (!btn || !box) return;\n    const isChat = G.类型 === '跨时代聊天群' || !!(INFO && INFO.口吻预设 === '群主机器人');\n    const presets = Array.isArray(INFO && INFO.口吻预设)\n      ? INFO.口吻预设\n      : ((BRIDGE && BRIDGE.tones && (isChat ? BRIDGE.tones.群主机器人 : BRIDGE.tones.系统)) || []);\n    let open = false;\n    function renderBox() {\n      if (!open) { box.hidden = true; box.replaceChildren(); return; }\n      const tone = G.口吻 || {};\n      box.hidden = false;\n      box.innerHTML = `<div class=\"jp-tone-in\">\n        <div class=\"jp-tone-row\">\n          <label><span>${isChat ? '机器人名' : '系统名'}</span><input type=\"text\" data-tk=\"名字\" maxlength=\"8\" value=\"${esc(tone.名字 || '')}\"></label>\n          <label><span>称呼${isChat ? '群友' : '你'}</span><input type=\"text\" data-tk=\"称呼\" maxlength=\"8\" value=\"${esc(tone.称呼 || '')}\"></label>\n        </div>\n        ${presets.length ? `<div class=\"jp-tone-pre\">${presets.map((p, i) => `<button type=\"button\" data-tp=\"${i}\" aria-pressed=\"${String(tone.预设 === p.预设)}\">${esc(p.预设)}</button>`).join('')}</div>` : ''}\n        <label class=\"jp-tone-desc\"><span>性格与说话方式</span><textarea data-tk=\"描述\" maxlength=\"120\" rows=\"2\">${esc(tone.描述 || '')}</textarea></label>\n        <div class=\"jp-tone-acts\">\n          <button type=\"button\" class=\"jp-btn\" data-tone-cancel>取消</button>\n          <button type=\"button\" class=\"jp-btn pri\" data-tone-save>保存口吻</button>\n        </div>\n      </div>`;\n      let curPreset = tone.预设 || null;\n      const nmIn = box.querySelector('[data-tk=\"名字\"]');\n      const callIn = box.querySelector('[data-tk=\"称呼\"]');\n      const descIn = box.querySelector('[data-tk=\"描述\"]');\n      box.querySelectorAll('[data-tp]').forEach((b) => b.addEventListener('click', () => {\n        const p = presets[Number(b.dataset.tp)];\n        if (!p) return;\n        curPreset = p.预设;\n        nmIn.value = (isChat ? p.名字 : p.自称) || nmIn.value;\n        callIn.value = p.称呼 || callIn.value;\n        descIn.value = p.描述 || '';\n        box.querySelectorAll('[data-tp]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));\n      }));\n      descIn.addEventListener('input', () => {\n        curPreset = null;\n        box.querySelectorAll('[data-tp]').forEach((x) => x.setAttribute('aria-pressed', 'false'));\n      });\n      box.querySelector('[data-tone-cancel]').addEventListener('click', () => { open = false; renderBox(); });\n      box.querySelector('[data-tone-save]').addEventListener('click', async () => {\n        const r = await act('改口吻', { 名字: nmIn.value, 称呼: callIn.value, 预设: curPreset, 描述: descIn.value });\n        if (!r.ok) { toast(root, r.why || '没存上'); return; }\n        open = false;\n        toast(root, '口吻已更新，下一轮正文起生效');\n      });\n    }\n    btn.addEventListener('click', () => {\n      if (btn.disabled) return;\n      open = !open;\n      renderBox();\n    });\n  }\n\n  // ── 任务 ──\n  function tasks(G, S) {\n    const list = Array.isArray(G.任务) ? G.任务 : [];\n    const on = list.filter((t) => t.状态 === '进行中').length;\n    const today = S && S.时空 && S.时空.外界日期;\n    return `<section class=\"jp-sec\" data-part=\"tasks\"><h5 class=\"jp-st\">任务<em>进行中 ${on}/3</em></h5>\n      ${list.length ? `<div class=\"jp-tks\">${list.map((t) => {\n        const d = t.期限 === '不限' ? null : daysTo(today, t.期限);\n        const due = t.期限 === '不限' ? '不限期' : d == null ? short(t.期限) : d < 0 ? '已过期' : d === 0 ? '今日截止' : `剩 ${d} 天`;\n        const tier = tierIn(t.奖励);\n        return `<article class=\"jp-tk\" data-c=\"${esc(t.类别)}\" data-s=\"${esc(t.状态)}\">\n          <span class=\"jp-tk-k\">${esc(t.类别)}</span>\n          <div class=\"jp-tk-b\">\n            <div class=\"jp-tk-t\"><b>${esc(t.标题)}</b>${t.状态 === '进行中' ? `<time data-k=\"${d != null && d <= 1 ? 'soon' : ''}\">${esc(due)}</time>` : ''}</div>\n            <p class=\"jp-tk-c\">${esc(t.内容)}</p>\n            <div class=\"jp-tk-f\"><span class=\"g\"${tier ? ` data-tier=\"${tier}\" style=\"color:var(--c1)\"` : ''}>${esc(t.奖励)}</span>${t.失败 && t.失败 !== '无' ? `<span class=\"l\">${esc(t.失败)}</span>` : ''}</div>\n          </div>\n          ${t.状态 !== '进行中' ? `<span class=\"jp-tk-stamp\">${t.状态 === '已完成' ? '完成' : '失败'}</span>` : ''}\n        </article>`;\n      }).join('')}</div>` : `<p class=\"jp-none\">${esc((G.口吻 && G.口吻.名字) || '系统')}还没发任务。</p>`}\n    </section>`;\n  }\n\n  // ── 待入账 ──\n  function rewardCard(r, cls = '') {\n    const cross = r.出处 && r.出处 !== '斗罗';\n    return `<article class=\"jp-rw ${cls}\"${r.品阶 ? ` data-tier=\"${esc(r.品阶)}\"` : ''}>\n      <div class=\"jp-rw-h\">${r.品阶 ? `<span class=\"jp-rw-t\">${esc(r.品阶)}</span>` : ''}<b>${esc(r.名称)}</b>${cross ? `<span class=\"jp-rw-x\">跨界 · ${esc(r.出处)}</span>` : ''}</div>\n      ${r.说明 ? `<p>${esc(r.说明)}</p>` : ''}\n      <div class=\"jp-rw-f\"><span class=\"to\">${esc(r.落点 || '其他')}</span><span>${esc(r.来源 || '')} · ${short(r.日期)}</span>${r.状态 === '待入账' ? '<span class=\"wait\">等正文入账</span>' : ''}</div>\n    </article>`;\n  }\n\n  function ledger(G, freshCount = 0) {\n    // 待入账按时间追加在末尾，显示时最新排最前\n    const list = (Array.isArray(G.待入账) ? G.待入账 : []).filter((r) => r.状态 === '待入账').slice().reverse();\n    const log = Array.isArray(G.入账记录) ? G.入账记录 : [];\n    return `<section class=\"jp-sec\" data-part=\"ledger\"><h5 class=\"jp-st\">待入账<em>${list.length} 件 · 下一轮正文里落地</em></h5>\n      ${list.length ? `<div class=\"jp-lg\">${list.map((r, i) => rewardCard(r, i < freshCount ? 'new' : '')).join('')}</div>` : '<p class=\"jp-none\">没有等着入账的东西。</p>'}\n      ${log.length ? `<ol class=\"jp-log\">${log.slice(0, 4).map((x) => `<li><b>${esc(x.名称)}</b><span>→ ${esc(x.落点)}</span><time>${short(x.日期)}</time></li>`).join('')}</ol>` : ''}\n    </section>`;\n  }\n\n  function swap(root, part, html) {\n    const old = root.querySelector(`[data-part=\"${part}\"]`);\n    const nu = frag(html);\n    if (old && nu) old.replaceWith(nu);\n    return nu;\n  }\n\n  function dockMark(sys, iconPath, inner, k, title, kit, tab) {\n    const el = frag(`<button type=\"button\" class=\"jp-dk\" data-sys=\"${esc(sys)}\" data-k=\"${esc(k || '')}\" title=\"${esc(title || '')}\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"square\" aria-hidden=\"true\">${iconPath}</svg>${inner}</button>`);\n    if (kit && typeof kit.open === 'function' && tab) el.addEventListener('click', () => kit.open(tab));\n    return el;\n  }\n\n  // ── 正文块头解析（契约 §3） ──\n  const BLOCK_META_KEYS = new Set(['类别', '标题', '人物', '出处', '阶段']);\n  function parseBlock(inner) {\n    const lines = String(inner == null ? '' : inner).replace(/^\\n+|\\n+$/gu, '').split('\\n');\n    const meta = {};\n    let i = 0;\n    for (; i < lines.length; i += 1) {\n      const m = /^\\s*([^｜|\\s]{1,6})[｜|](.*)$/u.exec(lines[i]);\n      if (!m || !BLOCK_META_KEYS.has(m[1])) break;\n      meta[m[1]] = m[2].trim();\n    }\n    return { meta, body: lines.slice(i).join('\\n').trim() };\n  }\n\n  // ── 正文 <系统> 块渲染器（六个金手指共用，按 金手指.类型 换皮） ──\n  const systemBlock = {\n    render(seg, kit) {\n      const { meta, body } = parseBlock(seg.inner);\n      const st = kit && kit.env && kit.env.stat;\n      const G = (st && st.金手指) || { 类型: GF, 口吻: { 名字: INFO.默认名 } };\n      const key = (INFO && INFO.key) || SYS_KEY[G.类型] || 'sim';\n      const tone = G.口吻 || {};\n      const cat = meta.类别 || '提示';\n      const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null;\n      const attrs = {\n        class: 'sx qt-sx' + (t != null ? ' in' : ''),\n        'data-sys': key,\n        'data-cat': cat,\n        style: t != null ? { '--gf-t': `-${t.toFixed(2)}s` } : null,\n      };\n      const lines = body ? body.split('\\n').filter((l) => l.trim()) : [];\n      return kit.h('section', attrs,\n        kit.h('div', { class: 'sx-hd' },\n          kit.h('span', { class: 'sx-ding', text: key === 'chat' ? '群公告' : '叮' }),\n          kit.h('span', { class: 'sx-nm', text: tone.名字 || G.类型 || '系统' }),\n          kit.h('span', { class: 'sx-k', text: cat })),\n        meta.标题 ? kit.h('h5', { class: 'qt-sx-t', text: meta.标题 }) : null,\n        lines.map((l) => kit.h('p', { class: 'sx-line' }, kit.sub ? kit.sub(l) : l)));\n    },\n  };\n\n  // ── 共用样式（自带 @property --qa、品阶色、系统色、关键帧、.jp 外壳与 <系统> 六皮） ──\n  const CSS = `\n@property --qa{syntax:'<angle>';inherits:false;initial-value:0deg}\n@keyframes qyHue{to{--qa:360deg}}\n@keyframes qyShine{0%{background-position:130% 0}55%,100%{background-position:-130% 0}}\n@keyframes sxBlink{50%{opacity:0}}\n@keyframes sxIn{from{opacity:0;transform:translateY(8px)}}\n@keyframes sxScan{to{top:110%}}\n@keyframes sxGlitch{0%{opacity:0;clip-path:inset(40% 0 52% 0);transform:translateX(-6px)}20%{opacity:1;clip-path:inset(10% 0 70% 0);transform:translateX(5px)}40%{clip-path:inset(60% 0 10% 0);transform:translateX(-3px)}60%{clip-path:inset(0 0 30% 0)}80%,100%{clip-path:inset(0);transform:none}}\n@keyframes sxFlowY{to{background-position:0 14px}}\n@keyframes sxRoll{from{transform:translateY(70%);opacity:0}}\n@keyframes sxTurn{to{transform:rotate(405deg)}}\n@keyframes sxStamp{0%{transform:rotate(-10deg) scale(2.4);opacity:0}60%{transform:rotate(-10deg) scale(.92);opacity:1}100%{transform:rotate(-10deg) scale(1)}}\n@keyframes sxSweep{40%,100%{transform:translateX(100%)}}\n@keyframes jpRise{from{opacity:0;transform:translateY(10px)}}\n@keyframes jpPulse{50%{opacity:.2}}\n@keyframes jpDrop{0%{opacity:0;transform:translateY(-16px) scale(1.04);filter:brightness(2.2)}60%{opacity:1}100%{filter:none}}\n@keyframes jpToast{0%{opacity:0;transform:translate(-50%,10px)}12%,82%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-6px)}}\n@keyframes jpSpin{to{transform:rotate(360deg)}}\n\n:is(.jp,.jp-dk,.sx)[data-sys=\"sim\"]{--s1:#5FE3F0;--s2:#04141c;--sg:rgba(95,227,240,.45);--s3:#FF4D6A}\n:is(.jp,.jp-dk,.sx)[data-sys=\"pts\"]{--s1:#4C9BFF;--s2:#030b1c;--sg:rgba(76,155,255,.45);--s3:#9FF3FF}\n:is(.jp,.jp-dk,.sx)[data-sys=\"hero\"]{--s1:#B994FF;--s2:#0b0718;--sg:rgba(185,148,255,.45);--s3:#FFD36B}\n:is(.jp,.jp-dk,.sx)[data-sys=\"sign\"]{--s1:#E6B562;--s2:#140c04;--sg:rgba(230,181,98,.45);--s3:#FFF0C2}\n:is(.jp,.jp-dk,.sx)[data-sys=\"gacha\"]{--s1:#FFB341;--s2:#0d0a12;--sg:rgba(255,179,65,.42);--s3:#D96BFF}\n:is(.jp,.jp-dk,.sx)[data-sys=\"chat\"]{--s1:#7CF5C8;--s2:#061412;--sg:rgba(124,245,200,.4);--s3:#D8C39A}\n${INFO && INFO.key && !SYS_KEY[GF] && Array.isArray(INFO.色) ? `:is(.jp,.jp-dk,.sx)[data-sys=\"${String(INFO.key).replace(/[^a-z0-9-]/g, '')}\"]{--s1:${INFO.色[0] || '#5FE3F0'};--s2:${INFO.色[1] || '#04141c'};--sg:color-mix(in srgb,${INFO.色[0] || '#5FE3F0'} 45%,transparent);--s3:${INFO.色[2] || '#FFD36B'}}` : ''}\n\n#dl-root .jp [data-tier=\"白\"]{--c1:#F4F1EA;--c2:#A9A291;--cg:rgba(244,241,234,.28)}\n#dl-root .jp [data-tier=\"黄\"]{--c1:#F2D46B;--c2:#C08A17;--cg:rgba(242,212,107,.36)}\n#dl-root .jp [data-tier=\"紫\"]{--c1:#C3A2F2;--c2:#4E2585;--cg:rgba(176,138,224,.44)}\n#dl-root .jp [data-tier=\"红\"]{--c1:#F0565E;--c2:#7A111B;--cg:rgba(224,71,79,.5)}\n#dl-root .jp [data-tier=\"金\"]{--c1:#F6D877;--c2:#B8891F;--cg:rgba(240,207,106,.55)}\n#dl-root .jp [data-tier=\"彩\"]{--c1:#FFE45C;--c2:#6C7BFF;--cg:rgba(255,228,92,.45)}\n#dl-root .jp [data-tier=\"厄\"]{--c1:#A49FB1;--c2:#0A090D;--cg:rgba(0,0,0,.9)}\n#dl-root .jp [data-tier=\"绝\"]{--c1:#E0263B;--c2:#060509;--cg:rgba(150,10,26,.6)}\n\n#dl-root .jp{--tx:#E8ECF2;--tx2:#A9B0BF;--tx3:#687084;--ln:color-mix(in srgb,var(--s1) 16%,transparent);--ln2:color-mix(in srgb,var(--s1) 32%,transparent);--ok:#7BE0A6;--bad:#FF7A86;--warn:#FFC15A;--serif:\"Noto Serif SC\",\"Source Han Serif SC\",\"Songti SC\",\"STSong\",\"SimSun\",serif;--sans:\"Noto Sans SC\",system-ui,-apple-system,\"PingFang SC\",\"Microsoft YaHei\",sans-serif;--mono:\"JetBrains Mono\",\"Cascadia Mono\",Consolas,ui-monospace,monospace;--ease:cubic-bezier(.2,.7,.2,1);--snap:cubic-bezier(.7,0,.2,1);container:jp/inline-size;position:relative;isolation:isolate;min-height:100%;color:var(--tx);background:var(--s2);font:13.5px/1.65 var(--sans);overflow-x:clip;border:1px solid var(--ln)}\n#dl-root .jp *,#dl-root .jp *::before,#dl-root .jp *::after{box-sizing:border-box}\n#dl-root .jp button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}\n#dl-root .jp :focus-visible{outline:1px solid var(--s1);outline-offset:2px}\n#dl-root .jp p{margin:0}#dl-root .jp h4,#dl-root .jp h5{margin:0}\n#dl-root .jp-in>*{animation:jpRise .55s var(--ease) both;animation-delay:calc(var(--i,0) * 60ms)}\n\n#dl-root .jp-lock{padding:8px 16px;font:600 12px/1.5 var(--sans);color:var(--warn);background:rgba(255,193,90,.09);border-bottom:1px solid rgba(255,193,90,.28)}\n#dl-root .jp-caveat{padding:10px 20px 14px;font:11.5px/1.55 var(--sans);color:var(--tx3);border-top:1px solid var(--ln)}\n\n#dl-root .jp-hd{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px 16px;align-items:center;padding:18px 20px 16px;border-bottom:1px solid var(--ln);overflow:hidden}\n#dl-root .jp-hd::before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(80% 140% at 0% 0%,color-mix(in srgb,var(--s1) 18%,transparent),transparent 60%)}\n#dl-root .jp-mark{grid-row:span 2;width:54px;height:54px;color:var(--s1);filter:drop-shadow(0 0 10px var(--sg))}\n#dl-root .jp-mark svg{width:100%;height:100%;overflow:visible}\n#dl-root .jp-nm{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;min-width:0}\n#dl-root .jp-nm b{font:900 22px/1.1 var(--serif);letter-spacing:.16em;color:#fff;text-shadow:0 0 18px var(--sg)}\n#dl-root .jp-nm span{font:600 10.5px/1 var(--mono);letter-spacing:.2em;color:color-mix(in srgb,var(--s1) 75%,#fff)}\n#dl-root .jp .jp-tone-btn{padding:2px 8px;font:600 11px/1.5 var(--sans);color:var(--s1);border:1px solid var(--ln2);background:color-mix(in srgb,var(--s1) 8%,transparent)}\n#dl-root .jp .jp-tone-btn:hover:not([disabled]){border-color:var(--s1)}\n#dl-root .jp .jp-tone-btn[disabled]{opacity:.38;cursor:not-allowed}\n#dl-root .jp-say{grid-column:2/4;min-height:1.65em;color:var(--tx2);font-size:13px}\n#dl-root .jp-say q{quotes:\"「\" \"」\";color:var(--tx)}\n#dl-root .jp-say .cur{display:inline-block;width:.45em;height:1em;margin-left:2px;vertical-align:-.12em;background:var(--s1);animation:sxBlink 1s steps(1) infinite}\n#dl-root .jp-hs{grid-row:1;grid-column:3;display:flex;gap:18px}\n#dl-root .jp-hs div{text-align:right}\n#dl-root .jp-hs b{display:block;font:700 22px/1 var(--mono);color:var(--s1);text-shadow:0 0 12px var(--sg);font-variant-numeric:tabular-nums}\n#dl-root .jp-hs b small{font-size:12px;color:var(--tx3);margin-left:2px}\n#dl-root .jp-hs span{font:600 10px/1.9 var(--mono);letter-spacing:.2em;color:var(--tx3)}\n\n#dl-root .jp-tone{padding:12px 20px 14px;background:rgba(0,0,0,.32);border-bottom:1px solid var(--ln)}\n#dl-root .jp-tone-in{display:flex;flex-direction:column;gap:10px}\n#dl-root .jp-tone-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n#dl-root .jp-tone label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--tx2)}\n#dl-root .jp-tone input,#dl-root .jp-tone textarea{width:100%;padding:7px 10px;font:13px/1.5 var(--sans);color:var(--tx);background:#05060a;border:1px solid var(--ln2);outline:none;border-radius:0}\n#dl-root .jp-tone input:focus,#dl-root .jp-tone textarea:focus{border-color:var(--s1)}\n#dl-root .jp-tone-pre{display:flex;flex-wrap:wrap;gap:6px}\n#dl-root .jp .jp-tone-pre button{padding:4px 10px;font:600 12px/1.4 var(--serif);color:var(--tx2);border:1px solid var(--ln2);background:rgba(255,255,255,.02)}\n#dl-root .jp .jp-tone-pre button[aria-pressed=\"true\"]{color:var(--s2);background:var(--s1);border-color:var(--s1)}\n#dl-root .jp-tone-acts{display:flex;justify-content:flex-end;gap:8px}\n#dl-root .jp .jp-tone-acts .jp-btn{min-height:34px;padding:0 14px;font-size:12px}\n\n#dl-root .jp-sec{position:relative;padding:16px 20px}\n#dl-root .jp-sec+.jp-sec{border-top:1px solid var(--ln)}\n#dl-root .jp-st{display:flex;align-items:center;gap:10px;margin:0 0 12px;font:700 11px/1 var(--mono);letter-spacing:.3em;color:color-mix(in srgb,var(--s1) 80%,#fff)}\n#dl-root .jp-st::before{content:\"\";width:14px;height:2px;background:var(--s1);box-shadow:0 0 6px var(--s1)}\n#dl-root .jp-st::after{content:\"\";flex:1;height:1px;background:linear-gradient(90deg,var(--ln2),transparent)}\n#dl-root .jp-st em{order:2;font-style:normal;font-weight:500;letter-spacing:.12em;color:var(--tx3)}\n#dl-root .jp-none{color:var(--tx3);font-size:12.5px}\n\n#dl-root .jp .jp-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 18px;font:700 13px/1 var(--serif);letter-spacing:.2em;color:var(--s1);border:1px solid var(--ln2);background:color-mix(in srgb,var(--s1) 6%,transparent);clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);transition:background .25s,border-color .25s,color .25s,transform .15s}\n#dl-root .jp .jp-btn:hover:not([disabled]){border-color:var(--s1);background:color-mix(in srgb,var(--s1) 14%,transparent)}\n#dl-root .jp .jp-btn:active:not([disabled]){transform:translateY(1px)}\n#dl-root .jp .jp-btn.pri{color:var(--s2);background:linear-gradient(100deg,color-mix(in srgb,var(--s1) 80%,#fff),var(--s1));border-color:transparent;box-shadow:0 0 18px var(--sg)}\n#dl-root .jp .jp-btn[disabled]{opacity:.38;cursor:not-allowed;filter:saturate(.3)}\n#dl-root .jp .jp-btn svg{width:15px;height:15px}\n#dl-root .jp .jp-seg{display:inline-flex;border:1px solid var(--ln2)}\n#dl-root .jp .jp-seg button{padding:7px 14px;font:600 12px/1 var(--serif);letter-spacing:.16em;color:var(--tx2);transition:background .25s,color .25s}\n#dl-root .jp .jp-seg button[aria-pressed=\"true\"]{color:var(--s2);background:var(--s1)}\n#dl-root .jp-chip{display:inline-flex;align-items:center;gap:5px;padding:2px 7px;font:600 11px/1.5 var(--mono);letter-spacing:.06em;color:var(--tx2);border:1px solid var(--ln2)}\n#dl-root .jp-chip[data-tier]{color:var(--c1);border-color:color-mix(in srgb,var(--c1) 45%,transparent);background:color-mix(in srgb,var(--c1) 8%,transparent)}\n\n#dl-root .jp-tks{display:grid;gap:8px}\n#dl-root .jp-tk{--kc:var(--tx3);position:relative;display:grid;grid-template-columns:26px minmax(0,1fr);background:rgba(255,255,255,.025);border:1px solid var(--ln);overflow:hidden;transition:border-color .3s,background .3s}\n#dl-root .jp-tk[data-c=\"主线\"]{--kc:var(--s1)}\n#dl-root .jp-tk[data-c=\"突发\"]{--kc:#FF9A3D}\n#dl-root .jp-tk:hover{border-color:var(--ln2);background:rgba(255,255,255,.04)}\n#dl-root .jp-tk-k{display:grid;place-items:center;writing-mode:vertical-rl;font:800 11px/1 var(--serif);letter-spacing:.4em;color:var(--s2);background:var(--kc)}\n#dl-root .jp-tk[data-c=\"日常\"] .jp-tk-k{color:var(--tx2);background:rgba(255,255,255,.06)}\n#dl-root .jp-tk[data-c=\"突发\"] .jp-tk-k{background:repeating-linear-gradient(-45deg,#FF9A3D 0 6px,#E07A1C 6px 12px)}\n#dl-root .jp-tk-b{padding:9px 12px 10px;min-width:0}\n#dl-root .jp-tk-t{display:flex;align-items:baseline;gap:10px}\n#dl-root .jp-tk-t b{font:700 14px/1.4 var(--serif);letter-spacing:.06em}\n#dl-root .jp-tk-t time{margin-left:auto;flex:none;font:600 11px/1 var(--mono);color:var(--tx3)}\n#dl-root .jp-tk-t time[data-k=\"soon\"]{color:var(--warn)}\n#dl-root .jp-tk-c{margin-top:3px;color:var(--tx2);font-size:12.5px}\n#dl-root .jp-tk-f{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:7px;font-size:11.5px;color:var(--tx3)}\n#dl-root .jp-tk-f .g{color:var(--tx)}#dl-root .jp-tk-f .g::before{content:\"奖 \";color:var(--kc);font-family:var(--mono)}\n#dl-root .jp-tk-f .l::before{content:\"罚 \";color:var(--bad);font-family:var(--mono)}\n#dl-root .jp-tk[data-s=\"已完成\"],#dl-root .jp-tk[data-s=\"已失败\"]{opacity:.55}\n#dl-root .jp-tk[data-s=\"已完成\"] .jp-tk-t b{text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--ok) 70%,transparent)}\n#dl-root .jp-tk[data-s=\"已失败\"] .jp-tk-t b{text-decoration:line-through;text-decoration-color:var(--bad)}\n#dl-root .jp-tk-stamp{position:absolute;right:12px;bottom:6px;padding:1px 6px;font:900 13px/1.3 var(--serif);letter-spacing:.3em;border:2px solid;transform:rotate(-8deg);opacity:.9}\n#dl-root .jp-tk[data-s=\"已完成\"] .jp-tk-stamp{color:var(--ok)}#dl-root .jp-tk[data-s=\"已失败\"] .jp-tk-stamp{color:var(--bad)}\n\n#dl-root .jp-lg{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}\n#dl-root .jp-rw{position:relative;padding:10px 12px 10px 15px;border:1px solid color-mix(in srgb,var(--c1,#888) 30%,transparent);background:linear-gradient(100deg,color-mix(in srgb,var(--c1,#888) 13%,transparent),transparent 70%),rgba(0,0,0,.25);overflow:hidden}\n#dl-root .jp-rw::before{content:\"\";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--c1,#888);box-shadow:0 0 10px var(--c1,#888)}\n#dl-root .jp-rw[data-tier=\"彩\"]::before{background:linear-gradient(180deg,#FF5A5F,#FFE45C,#5FD88A,#3FC1F0,#D96BFF)}\n#dl-root .jp-rw[data-tier=\"金\"]::after,#dl-root .jp-rw[data-tier=\"彩\"]::after{content:\"\";position:absolute;inset:0;background:linear-gradient(110deg,transparent 40%,rgba(255,240,190,.16) 50%,transparent 60%);background-size:250% 100%;animation:qyShine 4.4s var(--ease) infinite;pointer-events:none}\n#dl-root .jp-rw-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n#dl-root .jp-rw-h b{font:700 14.5px/1.35 var(--serif);color:#fff}\n#dl-root .jp-rw-t{flex:none;padding:1px 5px;font:800 10.5px/1.4 var(--mono);color:#0b0c10;background:var(--c1,#888)}\n#dl-root .jp-rw[data-tier=\"彩\"] .jp-rw-t{background:linear-gradient(90deg,#FF5A5F,#FFE45C,#3FC1F0,#D96BFF)}\n#dl-root .jp-rw-x{margin-left:auto;flex:none;padding:1px 6px;font:700 10.5px/1.4 var(--mono);letter-spacing:.08em;color:var(--s3);border:1px solid color-mix(in srgb,var(--s3) 55%,transparent);text-shadow:0 0 6px var(--s3)}\n#dl-root .jp-rw p{margin-top:4px;color:var(--tx2);font-size:12px}\n#dl-root .jp-rw-f{display:flex;align-items:center;gap:10px;margin-top:7px;font:600 10.5px/1 var(--mono);color:var(--tx3);letter-spacing:.06em;flex-wrap:wrap}\n#dl-root .jp-rw-f .to{color:var(--tx)}#dl-root .jp-rw-f .to::before{content:\"→ \";color:var(--c1,#888)}\n#dl-root .jp-rw-f .wait{margin-left:auto;display:inline-flex;align-items:center;gap:5px;color:var(--warn)}\n#dl-root .jp-rw-f .wait::before{content:\"\";width:5px;height:5px;background:var(--warn);animation:jpPulse 1.4s ease-in-out infinite}\n#dl-root .jp-rw.new{animation:jpDrop .7s var(--snap) both}\n#dl-root .jp-log{display:grid;gap:2px;margin-top:10px;padding:0;margin-bottom:0;font-size:12px;color:var(--tx3)}\n#dl-root .jp-log li{display:flex;gap:10px;list-style:none}\n#dl-root .jp-log b{font-weight:500;color:var(--tx2)}#dl-root .jp-log time{margin-left:auto;font-family:var(--mono)}\n\n#dl-root .jp-toast{position:absolute;left:50%;bottom:14px;z-index:30;max-width:calc(100% - 32px);padding:9px 16px;font:600 13px/1.4 var(--serif);letter-spacing:.06em;color:var(--s2);background:var(--s1);box-shadow:0 0 24px var(--sg);transform:translateX(-50%);animation:jpToast 2.6s var(--ease) both;pointer-events:none}\n#dl-root .jp-spark{position:absolute;z-index:25;width:4px;height:4px;background:var(--c,#fff);box-shadow:0 0 6px var(--c,#fff);pointer-events:none}\n\n#dl-root .jp-dk{display:inline-flex;align-items:center;gap:5px;padding:2px 6px;font:700 12px/1 ui-monospace,Consolas,monospace;color:var(--s1);font-variant-numeric:tabular-nums;background:transparent;border:0;cursor:pointer;white-space:nowrap}\n#dl-root .jp-dk svg{width:15px;height:15px;flex:none;filter:drop-shadow(0 0 4px var(--sg))}\n#dl-root .jp-dk small{font-weight:500;color:var(--dl-ink3,#7a8090)}\n#dl-root .jp-dk[data-k=\"dim\"]{color:var(--dl-ink3,#7a8090)}\n#dl-root .jp-dk[data-k=\"hot\"] svg{animation:jpPulse 1.6s ease-in-out infinite}\n#dl-root .jp-dk .dot{width:6px;height:6px;background:var(--s3);box-shadow:0 0 6px var(--s3)}\n\n/* ── 正文 <系统> 标签六套皮肤 ── */\n[data-dlp-theme] .sx{position:relative;max-width:560px;margin:16px auto;padding:14px 18px 16px;font:14.5px/1.75 var(--dlp-sans,system-ui,sans-serif);color:#E8ECF2;background:var(--s2);border:1px solid color-mix(in srgb,var(--s1) 45%,transparent);isolation:isolate;overflow:hidden;--dlp-on:#E8ECF2;--dlp-on2:#A9B0BF}\n[data-dlp-theme] .sx-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px}\n[data-dlp-theme] .sx-ding{font:900 15px/1 var(--dlp-serif,serif);letter-spacing:.3em;color:var(--s1)}\n[data-dlp-theme] .sx-nm{font:700 13px/1 var(--dlp-serif,serif);letter-spacing:.2em;color:#fff}\n[data-dlp-theme] .sx-k{margin-left:auto;padding:4px 8px;font:600 11px/1 ui-monospace,Consolas,monospace;letter-spacing:.2em;color:var(--s2);background:var(--s1)}\n[data-dlp-theme] .qt-sx-t{margin:0 0 4px;font:800 15px/1.4 var(--dlp-serif,serif);letter-spacing:.1em;color:#fff}\n[data-dlp-theme] .qt-sx[data-cat=\"警告\"] .sx-k{background:#FF7A86!important;color:#1a0508!important}\n[data-dlp-theme] .qt-sx[data-cat=\"任务失败\"] .sx-k{background:#6f7689!important;color:#fff!important}\n[data-dlp-theme] .sx-line{margin:4px 0 0;min-height:1.5em}\n[data-dlp-theme] .sx.in{animation:sxIn .7s var(--gf-t,0s) cubic-bezier(.7,0,.2,1) both}\n[data-dlp-theme] .sx[data-sys=\"sim\"]{background:linear-gradient(180deg,rgba(8,40,52,.9),rgba(3,16,22,.94)),var(--s2);border-color:rgba(95,227,240,.55);box-shadow:0 0 24px rgba(95,227,240,.16),inset 0 0 30px rgba(95,227,240,.08)}\n[data-dlp-theme] .sx[data-sys=\"sim\"]::before{content:\"\";position:absolute;inset:0;z-index:-1;background:repeating-linear-gradient(0deg,rgba(95,227,240,.06) 0 1px,transparent 1px 3px)}\n[data-dlp-theme] .sx[data-sys=\"sim\"]::after{content:\"\";position:absolute;left:0;right:0;top:-30%;height:30%;background:linear-gradient(180deg,transparent,rgba(95,227,240,.14),transparent);animation:sxScan 3.2s linear infinite;pointer-events:none}\n[data-dlp-theme] .sx[data-sys=\"sim\"] .sx-nm::before{content:\"◇ \";color:var(--s1)}\n[data-dlp-theme] .sx[data-sys=\"sim\"].in{animation:sxGlitch .6s var(--gf-t,0s) steps(6) both}\n[data-dlp-theme] .sx[data-sys=\"pts\"]{padding-left:26px;background:linear-gradient(100deg,rgba(10,36,84,.95),rgba(3,11,28,.96));border-color:rgba(76,155,255,.5);font-family:ui-monospace,Consolas,monospace;font-size:13.5px}\n[data-dlp-theme] .sx[data-sys=\"pts\"]::before{content:\"\";position:absolute;left:9px;top:12px;bottom:12px;width:4px;background:repeating-linear-gradient(180deg,var(--s1) 0 3px,transparent 3px 7px);opacity:.7;animation:sxFlowY 1.2s linear infinite}\n[data-dlp-theme] .sx[data-sys=\"pts\"] .sx-ding{font-family:ui-monospace,Consolas,monospace;letter-spacing:.1em}\n[data-dlp-theme] .sx[data-sys=\"hero\"]{background:radial-gradient(60% 90% at 85% 0%,rgba(185,148,255,.28),transparent 70%),radial-gradient(1px 1px at 20% 30%,#fff8,transparent),radial-gradient(1px 1px at 70% 60%,#fff6,transparent),radial-gradient(1px 1px at 40% 80%,#fff7,transparent),linear-gradient(180deg,#120b26,#07040f);border:1px solid rgba(255,211,107,.45);border-top:2px solid var(--s3)}\n[data-dlp-theme] .sx[data-sys=\"hero\"] .sx-ding{color:var(--s3)}\n[data-dlp-theme] .sx[data-sys=\"hero\"] .sx-k{background:linear-gradient(90deg,var(--s3),var(--s1))}\n[data-dlp-theme] .sx[data-sys=\"hero\"]::after{content:\"\";position:absolute;right:-40px;top:-40px;width:120px;height:120px;border:1px solid rgba(255,211,107,.25);transform:rotate(45deg);box-shadow:0 0 0 10px rgba(185,148,255,.06),0 0 0 22px rgba(185,148,255,.04);animation:sxTurn 18s linear infinite;z-index:-1}\n[data-dlp-theme] .sx[data-sys=\"sign\"]{background:linear-gradient(135deg,rgba(230,181,98,.10),transparent 40%),linear-gradient(180deg,#24160a,#130b04);border:1px solid #8a6328;box-shadow:inset 0 0 0 3px #130b04,inset 0 0 0 4px rgba(230,181,98,.5)}\n[data-dlp-theme] .sx[data-sys=\"sign\"] .sx-ding,[data-dlp-theme] .sx[data-sys=\"sign\"] .sx-nm{color:var(--s3)}\n[data-dlp-theme] .sx[data-sys=\"sign\"] .sx-k{color:#2a1808;background:linear-gradient(180deg,#F4D28E,#B9852F)}\n[data-dlp-theme] .sx[data-sys=\"sign\"]::after{content:\"签\";position:absolute;right:14px;bottom:10px;z-index:-1;display:grid;place-items:center;width:46px;height:46px;font:900 26px/1 var(--dlp-serif,serif);color:rgba(230,181,98,.22);border:2px solid rgba(230,181,98,.22);transform:rotate(-10deg)}\n[data-dlp-theme] .sx[data-sys=\"sign\"].in::after{animation:sxStamp .7s .25s cubic-bezier(.7,0,.2,1) both}\n[data-dlp-theme] .sx[data-sys=\"gacha\"]{padding-top:18px;background:linear-gradient(180deg,#1a1222,#0b0810);border-color:rgba(255,179,65,.4)}\n[data-dlp-theme] .sx[data-sys=\"gacha\"]::before{content:\"\";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#F4F1EA 0 16.6%,#F2D46B 0 33.3%,#C3A2F2 0 50%,#F0565E 0 66.6%,#F6D877 0 83.3%,transparent 0),conic-gradient(from var(--qa,0deg),#FF5A5F,#FFE45C,#3FC1F0,#D96BFF,#FF5A5F);animation:qyHue 4s linear infinite}\n[data-dlp-theme] .sx[data-sys=\"gacha\"]::after{content:\"\";position:absolute;inset:0;z-index:-1;background:linear-gradient(100deg,transparent 35%,rgba(255,236,190,.12),transparent 65%);transform:translateX(-100%);animation:sxSweep 3.4s cubic-bezier(.2,.7,.2,1) infinite}\n[data-dlp-theme] .sx[data-sys=\"chat\"]{background:linear-gradient(180deg,#0c201d,#061210);border-color:rgba(124,245,200,.4);border-left:3px solid var(--s1)}\n[data-dlp-theme] .sx[data-sys=\"chat\"] .sx-ding{font-size:13px;letter-spacing:.1em}\n\n@container jp (max-width:560px){\n  #dl-root .jp-hd{grid-template-columns:auto minmax(0,1fr);padding:14px 16px 12px}\n  #dl-root .jp-hs{grid-column:1/-1;grid-row:auto;justify-content:flex-start;gap:22px;padding-top:6px}\n  #dl-root .jp-hs div{text-align:left}\n  #dl-root .jp-say{grid-column:1/-1}\n  #dl-root .jp-mark{width:44px;height:44px;grid-row:span 1}\n  #dl-root .jp-nm b{font-size:19px}\n  #dl-root .jp-sec{padding:14px 16px}\n  #dl-root .jp-lg{grid-template-columns:1fr}\n  #dl-root .jp-st{flex-wrap:wrap;row-gap:5px;white-space:nowrap}\n  #dl-root .jp-st em{order:3;flex:1 0 100%;padding-left:24px;font-size:10px;letter-spacing:.06em;white-space:normal}\n  #dl-root .jp-tone-row{grid-template-columns:1fr}\n}\n#dl-root[data-motion=\"off\"] .jp *,#dl-root[data-motion=\"off\"] .jp *::before,#dl-root[data-motion=\"off\"] .jp *::after,#dl-root[data-motion=\"off\"] .jp-dk svg,[data-dlp-motion=\"off\"] .sx,[data-dlp-motion=\"off\"] .sx *,[data-dlp-motion=\"off\"] .sx::before,[data-dlp-motion=\"off\"] .sx::after{animation:none!important;transition:none!important}\n#dl-root[data-motion=\"reduced\"] .jp-rw::after,#dl-root[data-motion=\"reduced\"] .jp-say .cur,#dl-root[data-motion=\"reduced\"] .jp-dk[data-k=\"hot\"] svg,[data-dlp-motion=\"reduced\"] .sx::before,[data-dlp-motion=\"reduced\"] .sx::after{animation:none!important}\n@media (prefers-reduced-motion:reduce){#dl-root .jp *,#dl-root .jp *::before,#dl-root .jp *::after,#dl-root .jp-dk svg,[data-dlp-theme] .sx,[data-dlp-theme] .sx *,[data-dlp-theme] .sx::before,[data-dlp-theme] .sx::after{animation:none!important;transition:none!important}}\n`;\n\n  return {\n    GF, INFO, BRIDGE, CSS, TIER, esc, gfOf, mine, dayNo, daysTo, short, year, tierIn,\n    motionOf, still, frag, typeIn, roll, burst, toast, disabled, act, syncBar,\n    lockBanner, caveat, head, bindToneEditor, tasks, rewardCard, ledger, swap, dockMark,\n    parseBlock, systemBlock,\n  };\n}\n\n/* 金手指 · 跨时代聊天群 · 状态栏系统页 + <系统> 与 <群消息> 正文标签 */\nfunction DLGF_PAGE_跨时代聊天群(GF, INFO, BRIDGE, U) {\n  const iconPath = '<path d=\"M4 5h16v11H9l-5 4z\"/><path d=\"M8 9.5h8M8 12.5h5\"/>';\n  const mark = `<svg viewBox=\"-30 -30 60 60\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\">\n    <path d=\"M-22-18h34v24h-18l-10 8v-8h-6z\"/><path d=\"M-6-6h34v24h-6v8l-10-8h-18z\" opacity=\".55\"/>\n    <circle cx=\"-12\" cy=\"-6\" r=\"1.6\" fill=\"currentColor\"/><circle cx=\"-5\" cy=\"-6\" r=\"1.6\" fill=\"currentColor\"/><circle cx=\"2\" cy=\"-6\" r=\"1.6\" fill=\"currentColor\"/>\n  </svg>`;\n  const ERA = { 斗1: '羊皮纸', 斗2: '魂导刻纹', 神界: '神界', 英雄: '神界', 斗3: '全息', 斗4: '星舰' };\n  const SEAL = {\n    武魂殿: { c1: '#F2CE6B', c2: '#2a1838', svg: '<path d=\"M0-13v26M-5-7h10\" stroke-width=\"2\"/><path d=\"M-3-4C-10-8-14-4-15 2c4-2 7-2 9 0M3-4C10-8 14-4 15 2c-4-2-7-2-9 0\" stroke-width=\"1.3\"/>' },\n    史莱克: { c1: '#7CF5C8', c2: '#0c2a22', svg: Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2 - Math.PI / 2; return `<circle cx=\"${(Math.cos(a) * 9).toFixed(1)}\" cy=\"${(Math.sin(a) * 9).toFixed(1)}\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"/>`; }).join('') + '<circle r=\"4\" stroke-width=\"1.4\"/>' },\n    唐门: { c1: '#9FB4FF', c2: '#141a33', svg: '<path d=\"M0-13L3-3 13 0 3 3 0 13-3 3-13 0-3-3Z\" stroke-width=\"1.3\"/><circle r=\"2.2\" fill=\"currentColor\" stroke=\"none\"/>' },\n    天斗皇室: { c1: '#E8C670', c2: '#241c0d', svg: '<path d=\"M-11 8L-13-5-5 1 0-10 5 1 13-5 11 8Z\" stroke-width=\"1.4\"/><path d=\"M-11 11h22\" stroke-width=\"1.4\"/>' },\n    星罗皇室: { c1: '#D8B4E2', c2: '#201228', svg: '<polygon points=\"0,-13 4,-4 13,-4 6,2 9,12 0,6 -9,12 -6,2 -13,-4 -4,-4\" stroke-width=\"1.3\"/>' },\n    传灵塔: { c1: '#6FE8F5', c2: '#0b242c', svg: '<path d=\"M0-13L8-3H-8Z M-10 3H10 M-7 3L-9 11H9L7 3\" stroke-width=\"1.4\"/>' },\n    本体宗: { c1: '#F0A868', c2: '#29170b', svg: '<polygon points=\"0,-13 11,-6 11,6 0,13 -11,6 -11,-6\" stroke-width=\"1.5\"/><circle r=\"4\" stroke-width=\"1.4\"/>' },\n    圣灵教: { c1: '#C98AE8', c2: '#1f0e29', svg: '<path d=\"M6-11A12 12 0 1 0 6 11A9 9 0 1 1 6-11Z\" stroke-width=\"1.4\"/><circle cx=\"-4\" cy=\"0\" r=\"2\" fill=\"currentColor\" stroke=\"none\"/>' },\n    神界: { c1: '#F5DF8E', c2: '#1e1a0c', svg: '<circle r=\"6\" stroke-width=\"1.4\"/><path d=\"M0-14v4M0 10v4M-14 0h4M10 0h4M-10-10l3 3M7 7l3 3M10-10l-3 3M-7 7l-3 3\" stroke-width=\"1.3\"/>' },\n    散修: { c1: '#C8C2B0', c2: '#1d1c19', svg: '<path d=\"M-11 4a5 5 0 0 1 1-10 6 6 0 0 1 11-1 4 4 0 0 1 1 8H-11Z\" stroke-width=\"1.4\"/>' },\n  };\n\n  function chatState() {\n    try {\n      if (BRIDGE && BRIDGE.extra && typeof BRIDGE.extra.chatState === 'function') {\n        const s = BRIDGE.extra.chatState();\n        if (s && typeof s === 'object') return s;\n      }\n    } catch (_) { /* ignore */ }\n    return { msgs: [], packets: [], unread: 0 };\n  }\n\n  function friendSeal(name) {\n    const list = (BRIDGE && BRIDGE.data && BRIDGE.data.friends) || [];\n    const hit = list.find((f) => f && f.姓名 === name);\n    return (hit && hit.封口) || '散修';\n  }\n\n  function overviewHtml(C, G, unread) {\n    const tick = [20, 40, 60, 80];\n    return `<section class=\"jp-sec ch-ov\" data-part=\"ov\">\n      <div class=\"ch-gp\"><span class=\"ch-gp-k\">群</span><b>${U.esc(C.群名)}</b><button type=\"button\" class=\"jp-btn pri ch-open\">打开群聊${unread ? `<i class=\"ch-badge\">${unread}</i>` : ''}</button></div>\n      <div class=\"ch-me\"><span class=\"ch-me-k\">你的群名片</span><b>${U.esc(C.群名片 || '未设名片')}</b><p>${U.esc(C.人设 || '暂未写人设。')}</p></div>\n      <div class=\"ch-pr\"><div class=\"ch-pr-h\"><span>威望</span><b data-k=\"pr\">${C.威望}</b><em>${U.esc(C.威望档)}</em></div>\n        <div class=\"ch-pr-bar\" style=\"--p:${C.威望}%\"><i></i>${tick.map((t) => `<s style=\"left:${t}%\"></s>`).join('')}</div>\n        <p>剧透应验涨威望，落空掉威望；一次最多 ±15。群主机器人：${U.esc((G.口吻 && G.口吻.名字) || '群主机器人')}（${U.esc((G.口吻 && G.口吻.预设) || '自定')}）</p></div>\n    </section>`;\n  }\n\n  function packetsHtml(packets, lock) {\n    const list = Array.isArray(packets) ? packets : [];\n    return `<section class=\"jp-sec\" data-part=\"pk\"><h5 class=\"jp-st\">红包<em>点开才进待入账 · 群友当时真拿得出的斗罗物事</em></h5>\n      ${list.length ? `<div class=\"ch-pk\">${list.map((p) => {\n        const s = SEAL[p.封] || SEAL[friendSeal(p.群友)] || SEAL.散修;\n        const done = !!p.已领;\n        return `<button type=\"button\" class=\"ch-env${done ? ' open' : ''}\" data-pk-id=\"${U.esc(p.id)}\" style=\"--e1:${s.c1};--e2:${s.c2}\" ${done || lock ? 'disabled' : ''} aria-label=\"${done ? '已领取' : '领取'} ${U.esc(p.群友)} 的红包\">\n          <span class=\"ch-env-body\"><span class=\"ch-env-from\">${U.esc(p.群友)}</span><span class=\"ch-env-msg\">${U.esc(p.祝福 || p.说明)}</span></span>\n          <span class=\"ch-env-flap\"></span>\n          <span class=\"ch-env-seal\"><svg viewBox=\"-16 -16 32 32\" fill=\"none\" stroke=\"currentColor\">${s.svg}</svg></span>\n          <span class=\"ch-env-in\" data-tier=\"${U.esc(p.品阶 || '黄')}\"><i>${U.esc(p.品阶 || '黄')}</i><b>${U.esc(p.名称)}</b></span>\n          <span class=\"ch-env-st\">${done ? '已领取' : '领取'}</span>\n        </button>`;\n      }).join('')}</div>` : '<p class=\"jp-none\">群里暂时没人发红包。打开小手机里的聊天群和大家聊聊吧。</p>'}</section>`;\n  }\n\n  function friendsHtml(C) {\n    const list = Array.isArray(C.群友) ? C.群友 : [];\n    return `<section class=\"jp-sec\" data-part=\"fr\"><h5 class=\"jp-st\">群友<em>${list.length}/8 · 每跨一部或完成主线拉 1 位</em></h5>\n      <div class=\"ch-fr\">${list.map((f) => {\n        const moved = f.世界线 && f.世界线 !== '照原作走。' && f.世界线 !== '照原作走';\n        return `<article class=\"ch-f\" data-era=\"${U.esc(f.部)}\"${moved ? ' data-moved=\"1\"' : ''}>\n          <i class=\"ch-f-tx\" aria-hidden=\"true\"></i>\n          <header><b>${U.esc(f.姓名)}</b><span>${U.esc(f.部)} · ${U.esc(ERA[f.部] || '')}</span></header>\n          <p class=\"ch-f-t\">斗罗历 ${U.esc(U.year(f.时间点))} 年</p>\n          <p class=\"ch-f-s\">${U.esc(f.处境)}</p>\n          <p class=\"ch-f-w\"><span>${moved ? '世界线已偏移' : '世界线'}</span>${U.esc(f.世界线)}</p>\n        </article>`;\n      }).join('')}</div></section>`;\n  }\n\n  function spoilersHtml(C) {\n    const list = Array.isArray(C.剧透) ? C.剧透 : [];\n    return `<section class=\"jp-sec\" data-part=\"sp\"><h5 class=\"jp-st\">剧透账<em>${list.length}/12</em></h5>\n      ${list.length ? `<ol class=\"ch-sp\">${list.map((s) => `<li data-s=\"${U.esc(s.状态)}\"><b>${U.esc(s.群友)}</b><p>${U.esc(s.内容)}</p><span>${U.esc(s.状态)}</span></li>`).join('')}</ol>` : '<p class=\"jp-none\">还没剧透过。</p>'}</section>`;\n  }\n\n  function say(G, packets) {\n    const C = G.聊天群, c = (G.口吻 && G.口吻.称呼) || '群友们';\n    const n = (packets || []).filter((p) => p && !p.已领).length;\n    return n ? `${c}，群里有 ${n} 个红包还没领。` : `${c}，「${C.群名}」今天也很热闹。`;\n  }\n\n  function page(stat, kit) {\n    const G = U.gfOf(stat);\n    if (!G || !G.聊天群) return U.frag('<div class=\"jp\" data-sys=\"chat\"><p class=\"jp-none\">当前楼层没有跨时代聊天群数据。</p></div>');\n    const C = G.聊天群, lock = U.disabled(kit);\n    const gc = chatState();\n    const unread = Number(gc.unread) || 0;\n    const packets = Array.isArray(gc.packets) ? gc.packets : [];\n    const el = U.frag(`<div class=\"jp jp-in\" data-sys=\"chat\">\n      ${U.head(G, { mark, stats: [{ k: 'n', v: (C.群友 || []).length, u: '/8', label: '群友' }, { k: 'un', v: unread, label: '未读' }] }, kit)}\n      ${U.lockBanner(lock)}\n      ${overviewHtml(C, G, unread)}\n      ${packetsHtml(packets, lock)}\n      ${friendsHtml(C)}\n      ${spoilersHtml(C)}\n      ${U.tasks(G, stat)}\n      ${U.ledger(G)}\n      ${U.caveat('群聊记录存在斗罗小手机的本聊天数据里；领红包、威望、剧透与群友变更写入最新 AI 楼层，重新生成或右滑该层时这些变量变动会一并撤销。')}\n    </div>`);\n    [...el.children].forEach((c, i) => c.style.setProperty('--i', i));\n    U.bindToneEditor(el, G, kit);\n\n    el.addEventListener('click', async (e) => {\n      if (e.target.closest('.ch-open')) {\n        const ok = BRIDGE && typeof BRIDGE.openPhone === 'function' && BRIDGE.openPhone('gfchat');\n        if (!ok) U.toast(el, '请先启用「斗罗小手机」脚本，即可打开跨时代聊天群');\n        return;\n      }\n      const envBtn = e.target.closest('.ch-env');\n      if (!envBtn || envBtn.disabled || lock) return;\n      envBtn.disabled = true;\n      const res = await U.act('领红包', { id: envBtn.dataset.pkId }, { deferRefresh: true });\n      if (!res || !res.ok) {\n        envBtn.disabled = false;\n        U.toast(el, (res && res.why) || '领取失败');\n        return;\n      }\n      envBtn.classList.add('open');\n      const stEl = envBtn.querySelector('.ch-env-st');\n      if (stEl) stEl.textContent = '已领取';\n      if (!U.still(kit)) {\n        const h = el.getBoundingClientRect(), b = envBtn.getBoundingClientRect();\n        U.burst(el, b.left - h.left + b.width / 2, b.top - h.top + 20, [getComputedStyle(envBtn).getPropertyValue('--e1').trim(), '#fff'], kit, 18, 86);\n      }\n      if (res.stat && res.stat.金手指) {\n        G.待入账 = res.stat.金手指.待入账;\n        G.入账记录 = res.stat.金手指.入账记录;\n      }\n      setTimeout(() => {\n        if (!el.isConnected) return;\n        const old = el.querySelector('[data-part=\"ledger\"]');\n        const nu = U.frag(U.ledger(G));\n        if (old && nu) old.replaceWith(nu);\n        U.syncBar();\n      }, U.still(kit) ? 0 : 750);\n      U.toast(el, `领到「${res.奖励.名称}」，已入待入账`);\n      U.typeIn(el.querySelector('.jp-say'), `${(G.口吻 && G.口吻.称呼) || '群友们'}，${res.群友 || '群友'}的红包已收进待入账。`, kit);\n    });\n    setTimeout(() => U.typeIn(el.querySelector('.jp-say'), say(G, packets), kit), 160);\n    return el;\n  }\n\n  function dock(stat, kit) {\n    const G = U.gfOf(stat);\n    if (!G || !G.聊天群) return null;\n    const gc = chatState();\n    const unread = Number(gc.unread) || 0;\n    const pkCount = (Array.isArray(gc.packets) ? gc.packets : []).filter((p) => p && !p.已领).length;\n    const hot = unread > 0 || pkCount > 0;\n    return U.dockMark('chat', iconPath, `${unread || ''}${hot ? '<i class=\"dot\"></i>' : ''}`, hot ? 'hot' : 'dim',\n      `跨时代聊天群 · 未读 ${unread}${pkCount ? ` · ${pkCount} 个红包` : ''}`, kit, INFO.页签);\n  }\n\n  // ── 正文块：<群消息> ──\n  const groupMsgBlock = {\n    render(seg, kit) {\n      const st = (kit && ((kit.env && kit.env.stat) || kit.stat || kit.S)) || {};\n      const C = (st.金手指 && st.金手指.聊天群) || { 群友: [], 群名: '跨时代聊天群', 群名片: '' };\n      const lines = String((seg && seg.inner) || '').split('\\n').map((l) => l.trim()).filter(Boolean);\n      const friends = Array.isArray(C.群友) ? C.群友 : [];\n      const eraOf = (n) => {\n        const hit = friends.find((f) => f && f.姓名 === n);\n        if (hit && hit.部) return hit.部;\n        const m = ((BRIDGE && BRIDGE.data && BRIDGE.data.friends) || []).find((f) => f && f.姓名 === n);\n        return (m && m.部) || '';\n      };\n      return U.frag(`<section class=\"qt-chat\">\n        <header><i aria-hidden=\"true\"></i><b>${U.esc(C.群名 || '跨时代聊天群')}</b><span>${lines.length} 条</span></header>\n        ${lines.map((l) => {\n          const [whoRaw, ...rest] = l.split(/[｜|]/u);\n          const who = String(whoRaw || '').trim();\n          const said = rest.join('｜').trim();\n          const me = Boolean(C.群名片 && who === C.群名片) || who === '主角群名片';\n          const era = me ? '' : eraOf(who);\n          const pk = /^\\[红包\\]/u.exec(said);\n          const sealObj = SEAL[friendSeal(who)] || SEAL.散修;\n          return `<div class=\"qt-msg${me ? ' me' : ''}\" data-era=\"${U.esc(era)}\">\n            <span class=\"who\">${U.esc(who)}${era ? `<small>${U.esc(era)}</small>` : ''}</span>\n            ${pk\n              ? `<span class=\"pk\" style=\"--e1:${sealObj.c1};--e2:${sealObj.c2}\"><i aria-hidden=\"true\"></i><b>${U.esc(said.replace(/^\\[红包\\]\\s*/u, ''))}</b><small>红包 · 去系统页或小手机领取</small></span>`\n              : `<span class=\"bb\">${U.esc(said)}</span>`}\n          </div>`;\n        }).join('')}\n      </section>`);\n    },\n  };\n\n  const pageCss = `\n#dl-root .jp[data-sys=\"chat\"]{background:radial-gradient(70% 50% at 0% 0%,rgba(124,245,200,.10),transparent 60%),linear-gradient(180deg,#081816,#040b0a)}\n#dl-root .ch-ov{display:grid;grid-template-columns:1.1fr 1fr;gap:14px 24px}\n#dl-root .ch-gp{grid-column:1/-1;display:flex;align-items:center;gap:12px}\n#dl-root .ch-gp-k{display:grid;place-items:center;width:30px;height:30px;font:900 15px/1 var(--serif);color:#061412;background:#7CF5C8;box-shadow:0 0 14px rgba(124,245,200,.5)}\n#dl-root .ch-gp b{font:900 22px/1.1 var(--serif);letter-spacing:.14em;color:#fff}\n#dl-root .ch-open{margin-left:auto}\n#dl-root .ch-badge{display:inline-grid;place-items:center;min-width:18px;height:18px;margin-left:4px;padding:0 4px;font:700 11px/1 var(--mono);font-style:normal;background:#D8C39A;color:#1a140a}\n#dl-root .ch-me{padding:10px 12px;border:1px solid var(--ln2);background:rgba(124,245,200,.04)}\n#dl-root .ch-me-k{font:600 10px/1 var(--mono);letter-spacing:.24em;color:var(--tx3)}\n#dl-root .ch-me b{display:block;margin-top:4px;font:800 16px/1.3 var(--serif);color:#7CF5C8}\n#dl-root .ch-me p{margin-top:4px;font-size:12.5px;color:var(--tx2)}\n#dl-root .ch-pr-h{display:flex;align-items:baseline;gap:10px}\n#dl-root .ch-pr-h span{font:600 10px/1 var(--mono);letter-spacing:.24em;color:var(--tx3)}\n#dl-root .ch-pr-h b{font:800 30px/1 var(--mono);color:#7CF5C8;text-shadow:0 0 14px rgba(124,245,200,.5)}\n#dl-root .ch-pr-h em{font:700 13px/1 var(--serif);font-style:normal;letter-spacing:.2em;color:#D8C39A}\n#dl-root .ch-pr-bar{position:relative;height:8px;margin:10px 0 8px;background:rgba(255,255,255,.06)}\n#dl-root .ch-pr-bar i{position:absolute;left:0;top:0;bottom:0;width:var(--p);background:linear-gradient(90deg,#2a7a62,#7CF5C8);box-shadow:0 0 10px rgba(124,245,200,.5)}\n#dl-root .ch-pr-bar s{position:absolute;top:-3px;bottom:-3px;width:1px;background:rgba(255,255,255,.25)}\n#dl-root .ch-pr p{font-size:11.5px;color:var(--tx3)}\n#dl-root .ch-fr{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}\n#dl-root .ch-f{position:relative;isolation:isolate;padding:12px 14px;min-height:150px;border:1px solid rgba(255,255,255,.1);overflow:hidden}\n#dl-root .ch-f-tx{position:absolute;inset:0;z-index:-1}\n#dl-root .ch-f header{display:flex;align-items:baseline;justify-content:space-between;gap:8px}\n#dl-root .ch-f header b{font:900 17px/1.2 var(--serif);letter-spacing:.1em}\n#dl-root .ch-f header span{font:600 10px/1 var(--mono);letter-spacing:.12em}\n#dl-root .ch-f-t{margin-top:2px;font:600 11px/1.4 var(--mono)}\n#dl-root .ch-f-s{margin-top:6px;font-size:12.5px;line-height:1.6}\n#dl-root .ch-f-w{margin-top:8px;padding-top:6px;font-size:12px;line-height:1.55;border-top:1px dashed}\n#dl-root .ch-f-w span{display:block;font:700 10px/1.6 var(--mono);letter-spacing:.2em}\n#dl-root .ch-f[data-era=\"斗1\"]{color:#3b2a14;border-color:#8a6a3a}\n#dl-root .ch-f[data-era=\"斗1\"] .ch-f-tx{background:radial-gradient(120% 80% at 20% 10%,#efe0bd,#d8bf8c 70%,#b89458);box-shadow:inset 0 0 24px rgba(90,60,20,.45)}\n#dl-root .ch-f[data-era=\"斗1\"] header span,#dl-root .ch-f[data-era=\"斗1\"] .ch-f-t{color:#7a5a2a}#dl-root .ch-f[data-era=\"斗1\"] .ch-f-w{border-color:rgba(90,60,20,.35)}\n#dl-root .ch-f[data-era=\"斗2\"]{color:#d8e2ea;border-color:#5a6a78}\n#dl-root .ch-f[data-era=\"斗2\"] .ch-f-tx{background:repeating-linear-gradient(90deg,transparent 0 22px,rgba(150,200,240,.08) 22px 23px),repeating-linear-gradient(0deg,transparent 0 22px,rgba(150,200,240,.06) 22px 23px),linear-gradient(160deg,#3a4652,#1a2028)}\n#dl-root .ch-f[data-era=\"斗2\"] .ch-f-tx::after{content:\"\";position:absolute;right:8px;top:8px;width:46px;height:46px;border:1px solid rgba(150,200,240,.3);border-radius:50%;box-shadow:inset 0 0 0 6px rgba(26,32,40,.9),inset 0 0 0 7px rgba(150,200,240,.25)}\n#dl-root .ch-f[data-era=\"斗2\"] header span,#dl-root .ch-f[data-era=\"斗2\"] .ch-f-t{color:#8fb8d8}#dl-root .ch-f[data-era=\"斗2\"] .ch-f-w{border-color:rgba(150,200,240,.3)}\n#dl-root .ch-f[data-era=\"神界\"],#dl-root .ch-f[data-era=\"英雄\"]{color:#f5ebd0;border-color:rgba(245,223,142,.48)}\n#dl-root .ch-f[data-era=\"神界\"] .ch-f-tx,#dl-root .ch-f[data-era=\"英雄\"] .ch-f-tx{background:radial-gradient(80% 70% at 80% 10%,rgba(245,223,142,.2),transparent 65%),linear-gradient(160deg,#262014,#0e0b06)}\n#dl-root .ch-f[data-era=\"神界\"] header span,#dl-root .ch-f[data-era=\"神界\"] .ch-f-t,#dl-root .ch-f[data-era=\"英雄\"] header span,#dl-root .ch-f[data-era=\"英雄\"] .ch-f-t{color:#F5DF8E}\n#dl-root .ch-f[data-era=\"神界\"] .ch-f-w,#dl-root .ch-f[data-era=\"英雄\"] .ch-f-w{border-color:rgba(245,223,142,.32)}\n#dl-root .ch-f[data-era=\"斗3\"]{color:#dffaff;border-color:rgba(95,227,240,.5)}\n#dl-root .ch-f[data-era=\"斗3\"] .ch-f-tx{background:repeating-linear-gradient(0deg,rgba(95,227,240,.07) 0 1px,transparent 1px 3px),linear-gradient(160deg,rgba(20,70,90,.8),rgba(4,20,28,.95))}\n#dl-root .ch-f[data-era=\"斗3\"] .ch-f-tx::after{content:\"\";position:absolute;left:0;right:0;height:40%;top:-40%;background:linear-gradient(180deg,transparent,rgba(95,227,240,.14),transparent);animation:sxScan 4s linear infinite}\n#dl-root .ch-f[data-era=\"斗3\"] header span,#dl-root .ch-f[data-era=\"斗3\"] .ch-f-t{color:#5FE3F0}#dl-root .ch-f[data-era=\"斗3\"] .ch-f-w{border-color:rgba(95,227,240,.3)}\n#dl-root .ch-f[data-era=\"斗4\"]{color:#e6e9ff;border-color:rgba(140,150,255,.45)}\n#dl-root .ch-f[data-era=\"斗4\"] .ch-f-tx{background:radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 20%,#fff9,transparent),radial-gradient(1px 1px at 50% 80%,#fffa,transparent),linear-gradient(115deg,transparent 60%,rgba(140,150,255,.18) 61%,transparent 62%),linear-gradient(160deg,#141a3a,#05060f)}\n#dl-root .ch-f[data-era=\"斗4\"] header span,#dl-root .ch-f[data-era=\"斗4\"] .ch-f-t{color:#9aa4ff}#dl-root .ch-f[data-era=\"斗4\"] .ch-f-w{border-color:rgba(140,150,255,.3)}\n#dl-root .ch-f[data-moved] .ch-f-w span{color:#FF9A6B}\n#dl-root .ch-f[data-era=\"斗1\"][data-moved] .ch-f-w span{color:#a8401c}\n#dl-root .ch-f[data-moved]::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:2px;background:repeating-linear-gradient(90deg,#FF9A6B 0 6px,transparent 6px 10px);animation:chShift 1.2s linear infinite}\n@keyframes chShift{to{background-position:10px 0}}\n#dl-root .ch-sp{display:grid;gap:5px;margin:0;padding:0;list-style:none}\n#dl-root .ch-sp li{display:grid;grid-template-columns:70px 1fr auto;gap:12px;align-items:center;padding:7px 10px;background:rgba(255,255,255,.025);border-left:2px solid var(--sc,#888)}\n#dl-root .ch-sp li[data-s=\"待应验\"]{--sc:#FFC15A}#dl-root .ch-sp li[data-s=\"已应验\"]{--sc:#7BE0A6}#dl-root .ch-sp li[data-s=\"落空\"]{--sc:#6f7689}\n#dl-root .ch-sp b{font:700 13px var(--serif);color:#fff}#dl-root .ch-sp p{font-size:12.5px;color:var(--tx2)}\n#dl-root .ch-sp span{padding:2px 7px;font:800 11px/1.4 var(--serif);letter-spacing:.16em;color:var(--sc);border:1.5px solid var(--sc);transform:rotate(-4deg)}\n#dl-root .ch-sp li[data-s=\"落空\"] p{text-decoration:line-through;text-decoration-color:#6f7689}\n#dl-root .ch-pk{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}\n#dl-root .ch-env{position:relative;height:150px;padding:0;text-align:left;perspective:600px;overflow:visible}\n#dl-root .ch-env-body{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:12px 14px;background:linear-gradient(170deg,var(--e2),#060608);border:1px solid color-mix(in srgb,var(--e1) 55%,transparent);box-shadow:inset 0 0 0 3px #060608,inset 0 0 0 4px color-mix(in srgb,var(--e1) 30%,transparent)}\n#dl-root .ch-env-from{font:900 16px/1.2 var(--serif);color:var(--e1)}\n#dl-root .ch-env-msg{margin-top:3px;font-size:12px;line-height:1.5;color:var(--tx2)}\n#dl-root .ch-env-flap{position:absolute;left:0;right:0;top:0;height:62px;z-index:2;background:linear-gradient(180deg,color-mix(in srgb,var(--e2) 70%,#000),var(--e2));clip-path:polygon(0 0,100% 0,100% 30%,50% 100%,0 30%);border-top:1px solid var(--e1);transform-origin:50% 0;transition:transform .6s cubic-bezier(.2,.7,.2,1)}\n#dl-root .ch-env-seal{position:absolute;left:50%;top:44px;z-index:3;display:grid;place-items:center;width:38px;height:38px;margin-left:-19px;color:var(--e2);background:radial-gradient(circle at 35% 30%,#fff8,transparent 50%),var(--e1);border-radius:50%;box-shadow:0 0 0 3px color-mix(in srgb,var(--e1) 40%,transparent),0 0 16px var(--e1);transition:transform .5s,opacity .5s}\n#dl-root .ch-env-seal svg{width:26px;height:26px}\n#dl-root .ch-env:not(.open):hover .ch-env-seal{transform:scale(1.08) rotate(-8deg)}\n#dl-root .ch-env-in{position:absolute;left:12px;right:12px;top:14px;z-index:1;display:flex;flex-direction:column;gap:2px;padding:8px 10px;background:#0b0b10;border:1px solid var(--c1);box-shadow:0 0 14px var(--cg);opacity:0;transform:translateY(20px);transition:transform .7s .25s cubic-bezier(.2,.7,.2,1),opacity .4s .25s}\n#dl-root .ch-env-in i{font:800 10px/1 var(--mono);font-style:normal;color:var(--c1)}\n#dl-root .ch-env-in b{font:700 13px/1.35 var(--serif);color:#fff}\n#dl-root .ch-env-st{position:absolute;right:10px;bottom:10px;z-index:3;font:700 11px/1 var(--mono);letter-spacing:.2em;color:var(--e1)}\n#dl-root .ch-env.open .ch-env-flap{transform:rotateX(180deg);opacity:.18}\n#dl-root .ch-env.open .ch-env-seal{opacity:0;transform:translateY(-10px) scale(.5)}\n#dl-root .ch-env.open .ch-env-in{opacity:1;transform:none;z-index:3}\n#dl-root .ch-env.open .ch-env-st{color:var(--tx3)}\n/* 正文块 <群消息> */\n.qt-chat{margin:18px auto;max-width:540px;padding:12px 14px 14px;background:linear-gradient(180deg,#0c201d,#061210);border:1px solid rgba(124,245,200,.3);font-family:\"Noto Sans SC\",\"Microsoft YaHei\",sans-serif}\n.qt-chat header{display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(124,245,200,.15)}\n.qt-chat header i{width:8px;height:8px;background:#7CF5C8;box-shadow:0 0 8px #7CF5C8;transform:rotate(45deg)}\n.qt-chat header b{font:800 14px/1 \"Noto Serif SC\",\"Songti SC\",serif;letter-spacing:.14em;color:#fff}\n.qt-chat header span{margin-left:auto;font:600 11px/1 Consolas,monospace;color:#6aa894}\n.qt-msg{display:flex;flex-direction:column;align-items:flex-start;margin-top:8px}\n.qt-msg.me{align-items:flex-end}\n.qt-msg .who{margin-bottom:3px;font:600 11.5px/1 sans-serif;color:#8fb8ab}\n.qt-msg .who small{margin-left:6px;font:600 10px Consolas,monospace;color:#5c7d73}\n.qt-msg .bb{max-width:86%;padding:7px 11px;font-size:14px;line-height:1.6;color:#1f1a12;background:#e6dcc6;border:1px solid rgba(0,0,0,.2);word-break:break-word}\n.qt-msg[data-era=\"斗1\"] .bb{background:radial-gradient(120% 100% at 20% 10%,#f2e4c2,#d9c08e);color:#3b2a14}\n.qt-msg[data-era=\"斗2\"] .bb{background:linear-gradient(160deg,#46525e,#232a33);color:#dfe8ef;border-color:#6a7a88}\n.qt-msg[data-era=\"神界\"] .bb,.qt-msg[data-era=\"英雄\"] .bb{background:linear-gradient(160deg,#2a2314,#120e07);color:#f5ebd0;border-color:rgba(245,223,142,.48)}\n.qt-msg[data-era=\"斗3\"] .bb{background:linear-gradient(160deg,rgba(30,90,110,.85),rgba(6,26,34,.95));color:#dffaff;border-color:rgba(95,227,240,.5);box-shadow:0 0 10px rgba(95,227,240,.2)}\n.qt-msg[data-era=\"斗4\"] .bb{background:linear-gradient(160deg,#1b2250,#090b1c);color:#e6e9ff;border-color:rgba(140,150,255,.5)}\n.qt-msg.me .bb{color:#061412;background:#7CF5C8;border-color:transparent}\n.qt-msg .pk{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:center;min-width:220px;max-width:92%;padding:9px 12px;background:linear-gradient(160deg,var(--e2,#2a1838),#0d0812);border:1px solid var(--e1,#D8C39A);box-shadow:inset 0 0 0 3px #0d0812,inset 0 0 0 4px color-mix(in srgb,var(--e1,#D8C39A) 35%,transparent)}\n.qt-msg .pk i{grid-row:span 2;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8,transparent 50%),var(--e1,#D8C39A);box-shadow:0 0 10px var(--e1,#D8C39A)}\n.qt-msg .pk b{font:700 13px/1.4 \"Noto Serif SC\",\"Songti SC\",serif;color:#fff}\n.qt-msg .pk small{font:500 10.5px/1.3 Consolas,monospace;color:var(--e1,#D8C39A)}\n@container jp (max-width:560px){\n#dl-root .ch-ov{grid-template-columns:1fr}\n#dl-root .ch-gp b{font-size:18px}\n#dl-root .ch-fr,#dl-root .ch-pk{grid-template-columns:1fr}\n#dl-root .ch-sp li{grid-template-columns:1fr auto;gap:2px 10px}#dl-root .ch-sp p{grid-column:1/-1;grid-row:2}\n}\n#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .ch-f-tx::after,#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .ch-f[data-moved]::after{animation:none!important}\n@media (prefers-reduced-motion:reduce){#dl-root .ch-f-tx::after,#dl-root .ch-f[data-moved]::after{animation:none!important}}\n`;\n\n  return {\n    css: U.CSS + pageCss,\n    blocks: { 系统: U.systemBlock, 群消息: groupMsgBlock },\n    bar: { tab: INFO.页签, iconPath, when: U.mine, page, dock },\n  };\n}\n\nreturn DLGF_PAGE_跨时代聊天群(GF, INFO, BRIDGE, DLGF_SHARED(GF, INFO, BRIDGE));";
/* 斗罗金手指·<类型>（酒馆助手脚本，模块方式加载）
 * build.py 在本段之前注入：
 *   import registerMvuSchema、GF（本金手指类型名）、共用/规则.js、共用/气运.js（+按需 气运词条库.js）、
 *   共用/金手指.js、共用/金手指数据/口吻预设.js（+按需奖池/名单等）、
 *   金手指/结构.js、金手指/通用.js、金手指/类型/<类型>.js（GF_DEF）、GF_PAGE（主页面代码，字符串）。
 * 六个金手指脚本一直开着，但只有“自己的”聊天才有动作（设计决定 §24、ADR 0008）：
 *   变量：结构一直登记着，只认 金手指.类型 等于本类型的数据，所以开局落笔写进去的那一刻就能接住；
 *         每轮更新结束再把关一次（类型不能改走或删掉，通用任务/待入账/入账记录校验，再交给 GF_DEF.onUpdated）。
 *   写入：前端面板的互动操作统一走本脚本的 act()，直接写最新 AI 楼层的 stat_data.金手指（D4）。
 *         查看历史快照、AI 生成中、已结局时一律拒绝写入。
 *   显示：当前聊天的金手指是本类型时，把块标签和状态栏页签登记到主页面，否则撤掉。
 *   世界书：金手指条目的开关由斗罗剧情窗口与开局统一写，这里不碰世界书。
 */
const NAME = `斗罗金手指·${GF}`;
const W = (() => { try { if (window.parent && window.parent !== window && window.parent.document) return window.parent; } catch (_) { /* 跨域时退回本窗口 */ } return window; })();
const D = W.document;
const GLOBAL = '__DL_GF_' + GF + '__';
const EVENTS = {
  CHAT_CHANGED: 'chat_id_changed', MESSAGE_RECEIVED: 'message_received', MESSAGE_SENT: 'message_sent', MESSAGE_SWIPED: 'message_swiped',
  MESSAGE_EDITED: 'message_edited', MESSAGE_UPDATED: 'message_updated', MESSAGE_DELETED: 'message_deleted',
  GENERATION_STARTED: 'generation_started', GENERATION_ENDED: 'generation_ended', GENERATION_STOPPED: 'generation_stopped',
};
const OPENING_KEY = '斗罗开局';

const stops = [];
function listen(name, fn) {
  if (!name) return;
  try {
    const r = eventOn(name, fn);
    stops.push(typeof r === 'function' ? r : r && typeof r.stop === 'function' ? () => r.stop() : () => {});
  } catch (e) { console.warn(`[${NAME}] 监听 ${name} 失败`, e); }
}
const on = (key, fn) => listen((window.tavern_events || W.tavern_events || {})[key] || EVENTS[key], fn);

// ───────── 变量结构 ─────────
const gfSchema = GF_DEF.schema(z, gfKit(z), typeof GF_TONES !== 'undefined' ? GF_TONES : null);
let liveVars = null;
const rootSchema = gfRootSchema(z, GF, gfSchema, () => (liveVars && liveVars.stat_data) || null);
function registerSchema() {
  try { window.registerVariableSchema = undefined; } catch (_) { /* 只影响变量管理器显示 */ }
  listen('mag_variable_initialized', (vars) => { liveVars = vars; });
  listen('mag_command_parsed_for_zod', (vars) => { liveVars = vars; });
  registerMvuSchema(rootSchema);
  listen('mag_variable_initialized', () => { liveVars = null; });
  listen('mag_command_parsed_for_zod', () => { liveVars = null; });
}

function guard(vars, before) {
  const after = vars && vars.stat_data;
  if (!after || typeof after !== 'object') return;
  const beforeStat = before && before.stat_data;
  const r = guardGf(GF, gfSchema, after, beforeStat);
  if (r) {
    after.金手指 = r.value;
    if (r.note) console.warn(`[${NAME}] ${r.note}`);
  }
  if (after.金手指 && after.金手指.类型 === GF) {
    const keep = JSON.parse(JSON.stringify(after.金手指));
    try {
      gfOnUpdatedCommon(GF, after, beforeStat);
      if (typeof GF_DEF.onUpdated === 'function') GF_DEF.onUpdated(after, beforeStat);
      const r2 = gfSchema.safeParse(after.金手指);
      after.金手指 = r2.success ? r2.data : keep;
    } catch (e) {
      after.金手指 = keep;
      console.error(`[${NAME}] 金手指更新处理出错，变量保持原样`, e);
    }
  }
}

// ───────── 读/写最新 AI 楼层变量（D4） ─────────
const ctx = () => { try { return W.SillyTavern && W.SillyTavern.getContext ? W.SillyTavern.getContext() : null; } catch (_) { return null; } };
const mvu = () => window.Mvu || W.Mvu || null;
function openingRecord() {
  try { const v = getVariables({ type: 'chat' }); const r = v && v[OPENING_KEY]; return r && typeof r === 'object' ? r : null; } catch (_) { return null; }
}
function latestAiFloor() {
  const c = ctx(), list = c && Array.isArray(c.chat) ? c.chat : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const m = list[i];
    if (!m || m.is_user || m.is_system) continue;
    try {
      const M = mvu();
      const v = M && typeof M.getMvuData === 'function'
        ? M.getMvuData({ type: 'message', message_id: i })
        : getVariables({ type: 'message', message_id: i });
      if (v && v.stat_data && typeof v.stat_data === 'object' && Object.keys(v.stat_data).length) {
        return { floor: i, data: v, stat: v.stat_data };
      }
    } catch (_) { /* 这一层没有变量 */ }
  }
  return null;
}
function latestStat() {
  const hit = latestAiFloor();
  return hit ? hit.stat : null;
}
const active = () => chatGf(openingRecord(), latestStat()) === GF;

function disabledReason(kit) {
  if (kit && kit.floor != null) return '正在查看历史快照，切回最新楼层后再操作';
  try {
    if (W.DLStatusBar && W.DLStatusBar.state && W.DLStatusBar.state.floor != null) return '正在查看历史快照，切回最新楼层后再操作';
  } catch (_) { /* 无状态栏 */ }
  if (D && D.body && D.body.dataset && D.body.dataset.generating === 'true') return 'AI 正在生成，等本轮写完后再操作';
  if (D && D.documentElement && D.documentElement.hasAttribute('data-dlc-ended')) return '此局已终，不再操作';
  return '';
}

async function writeFloor(floor, data) {
  const M = mvu();
  if (M && typeof M.replaceMvuData === 'function') {
    await M.replaceMvuData(data, { type: 'message', message_id: floor });
    return;
  }
  if (typeof replaceVariables === 'function') {
    await replaceVariables(data, { type: 'message', message_id: floor });
    return;
  }
  throw new Error('找不到 Mvu.replaceMvuData 或 replaceVariables');
}

function syncBar() {
  try { if (W.__DL_BAR__ && typeof W.__DL_BAR__.refresh === 'function') W.__DL_BAR__.refresh(0); } catch (_) { /* 状态栏未挂载 */ }
}

/** 后台生成桥（D5）：优先借用斗罗小手机的接口配置，未启用小手机时退回酒馆主模型 generateRaw */
async function backgroundGenerate(messages, opts = {}) {
  try {
    const ph = W.__DL_PHONE__;
    if (ph && typeof ph.generate === 'function') {
      return await ph.generate(messages, opts);
    }
  } catch (e) {
    if (e && e.fromPhoneApi) throw e;
  }
  if (typeof generateRaw === 'function') {
    const out = await generateRaw({
      ordered_prompts: messages,
      should_stream: false,
      ...(opts.max_tokens ? { max_tokens: opts.max_tokens } : {}),
    });
    return { text: String(out || ''), via: 'tavern' };
  }
  throw new Error('当前环境没有可用的后台生成接口（既未启用斗罗小手机，也找不到 generateRaw）');
}

let writing = false;
async function act(action, payload, opts = {}) {
  if (destroyed) return { ok: false, why: '金手指脚本已卸载' };
  if (!active()) return { ok: false, why: '当前聊天未启用此金手指' };
  const why = disabledReason();
  if (why) return { ok: false, why };
  if (writing) return { ok: false, why: '上一次操作还在写入，稍等一下' };
  const hit = latestAiFloor();
  if (!hit || !hit.stat || !hit.stat.金手指 || hit.stat.金手指.类型 !== GF) {
    return { ok: false, why: '最新 AI 楼层里找不到当前金手指变量' };
  }
  writing = true;
  try {
    const next = JSON.parse(JSON.stringify(hit.data));
    const stat = next.stat_data;
    let res;
    if (action === '改口吻') {
      res = gfApplyTone(stat.金手指, GF, payload);
    } else if (typeof GF_DEF.act === 'function') {
      res = await GF_DEF.act(action, payload || {}, stat, {
        generate: backgroundGenerate,
        chat: () => { const c = ctx(); return c && Array.isArray(c.chat) ? c.chat : []; },
        record: openingRecord,
        W, D,
      });
    } else {
      res = { ok: false, why: `不支持的操作：${action}` };
    }
    if (!res || !res.ok) return res || { ok: false, why: '操作未生效' };
    const parsed = gfSchema.safeParse(stat.金手指);
    if (!parsed.success) return { ok: false, why: '写入结果未通过结构校验' };
    stat.金手指 = parsed.data;
    await writeFloor(hit.floor, next);
    if (typeof GF_DEF.afterAct === 'function') {
      try { GF_DEF.afterAct(action, res, stat, { W, D, floor: hit.floor }); } catch (e) { console.warn(`[${NAME}] 写入后同步出错`, e); }
    }
    if (!opts.deferRefresh) syncBar();
    return { ...res, ok: true, stat, floor: hit.floor };
  } catch (e) {
    console.error(`[${NAME}] 操作 ${action} 失败`, e);
    return { ok: false, why: `操作失败：${(e && e.message) || e}` };
  } finally {
    writing = false;
  }
}

// ───────── 主页面：块标签、状态栏页签 ─────────
let mounted = null;
function registry(key) {
  const m = W[key];
  if (m && typeof m.get === 'function' && typeof m.set === 'function') return m;
  return (W[key] = new W.Map());
}
const changed = () => { try { W.dispatchEvent(new W.Event('dl-ext-changed')); } catch (_) { /* 主页面已关 */ } };

function makeBridge() {
  return {
    act,
    syncBar,
    disabled: disabledReason,
    tones: typeof GF_TONES !== 'undefined' ? GF_TONES : null,
    data: typeof GF_DEF.pageData === 'function' ? GF_DEF.pageData() : null,
    extra: typeof GF_DEF.bridge === 'function' ? GF_DEF.bridge({ W, D, latestStat, syncBar }) : null,
    openPhone(app, opts) {
      try {
        if (W.__DL_PHONE__ && typeof W.__DL_PHONE__.openApp === 'function') { W.__DL_PHONE__.openApp(app, opts); return true; }
        if (W.DLPhone && typeof W.DLPhone.open === 'function') { W.DLPhone.open(); return true; }
      } catch (e) { console.warn(`[${NAME}] 打开小手机失败`, e); }
      return false;
    },
    hasPhoneApi() { return !!(W.__DL_PHONE__ && typeof W.__DL_PHONE__.generate === 'function'); },
  };
}

function mount() {
  const spec = new W.Function('GF', 'INFO', 'BRIDGE', GF_PAGE)(GF, GF_INFO[GF], makeBridge()) || {};
  const style = D.createElement('style');
  style.id = 'dl-gf-style-' + GF;
  style.textContent = spec.css || '';
  const old = D.getElementById(style.id);
  if (old) old.remove();
  D.head.appendChild(style);
  const blocks = registry('__DL_PROSE_BLOCKS__'), bar = registry('__DL_BAR_EXT__');
  const tags = [];
  for (const [tag, r] of Object.entries(spec.blocks || {})) { blocks.set(tag, r); tags.push([tag, r]); }
  if (spec.bar) bar.set('gf:' + GF, spec.bar);
  mounted = { spec, tags, style };
  changed();
}

function apply(stat, spec) {
  const sp = spec || (mounted && mounted.spec);
  if (sp && typeof sp.apply === 'function') {
    try { sp.apply(stat, D); } catch (e) { console.error(`[${NAME}] 页面状态没更新`, e); }
  }
  if (typeof GF_DEF.onSync === 'function') {
    try { GF_DEF.onSync(stat, { mounted: !!mounted, W, D }); } catch (e) { console.warn(`[${NAME}] 同步钩子出错`, e); }
  }
}

function unmount() {
  if (!mounted) return;
  const { spec, tags, style } = mounted;
  mounted = null;
  apply(null, spec);
  try {
    const blocks = W.__DL_PROSE_BLOCKS__, bar = W.__DL_BAR_EXT__;
    for (const [tag, r] of tags) if (blocks && blocks.get(tag) === r) blocks.delete(tag);
    if (bar && bar.get('gf:' + GF) === spec.bar) bar.delete('gf:' + GF);
    style.remove();
  } catch (_) { /* 主页面已关 */ }
  changed();
}

let timer = 0;
function refresh() {
  W.clearTimeout(timer);
  timer = W.setTimeout(() => {
    if (destroyed) return;
    const want = active();
    if (want && !mounted) mount();
    else if (!want && mounted) unmount();
    const stat = mounted ? latestStat() : null;
    apply(stat);
  }, 120);
}

// ───────── 启动与收尾 ─────────
let destroyed = false;
function destroy() {
  if (destroyed) return;
  destroyed = true;
  W.clearTimeout(timer);
  for (const s of stops.splice(0)) { try { s(); } catch (_) { /* 已注销 */ } }
  if (typeof GF_DEF.onDestroy === 'function') {
    try { GF_DEF.onDestroy({ W, D }); } catch (_) { /* 已清理 */ }
  }
  unmount();
  try { if (W[GLOBAL] && W[GLOBAL].destroy === destroy) delete W[GLOBAL]; } catch (_) { /* 主页面已关 */ }
}
function start() {
  try { if (W[GLOBAL] && typeof W[GLOBAL].destroy === 'function') W[GLOBAL].destroy(); } catch (_) { /* 旧实例已失效 */ }
  W[GLOBAL] = {
    destroy, refresh, act,
    status: () => ({ 金手指: GF, 当前聊天: chatGf(openingRecord(), latestStat()), 显示中: !!mounted }),
  };
  registerSchema();
  for (const k of Object.keys(EVENTS)) on(k, () => {
    refresh();
    if ((k === 'GENERATION_STARTED' || k === 'GENERATION_STOPPED') && mounted) {
      W.setTimeout(() => {
        try {
          const sb = W.DLStatusBar;
          if (sb && sb.state && sb.state.open && sb.state.page === (GF_INFO[GF] && GF_INFO[GF].页签)) sb.render();
        } catch (_) { /* 无状态栏 */ }
      }, 60);
    }
  });
  Promise.resolve(typeof waitGlobalInitialized === 'function' ? waitGlobalInitialized('Mvu') : null).then(() => {
    const M = window.Mvu || W.Mvu;
    if (destroyed || !M || !M.events) return;
    listen(M.events.VARIABLE_UPDATE_ENDED, (vars, before) => { guard(vars, before); refresh(); });
  }, () => {});
  const onGfChatEvt = () => {
    if (destroyed || !mounted) return;
    const stat = latestStat();
    apply(stat);
    syncBar();
  };
  if (GF === '跨时代聊天群') {
    try { W.addEventListener('dl-gfchat-changed', onGfChatEvt); stops.push(() => W.removeEventListener('dl-gfchat-changed', onGfChatEvt)); } catch (_) { /* ignore */ }
  }
  refresh();
}
$(() => {
  try {
    start();
    window.addEventListener('pagehide', destroy, { once: true });
  } catch (e) { console.error(`[${NAME}] 启动失败`, e); }
});

// 斗罗远程正文结束
