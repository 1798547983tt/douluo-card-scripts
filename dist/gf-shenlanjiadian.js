// 斗罗远程正文 gf-shenlanjiadian.js 1.1.0
// 斗罗金手指·深蓝加点：由 源码/build.py 生成，勿手改。逻辑见 源码/金手指/类型/深蓝加点.js，主页面见 源码/金手指/页面/，接线见 源码/金手指/入口.js。
import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

const GF = "深蓝加点";
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

/* 由 源码/build.py 从 气运金手指/gemini交付/深蓝加点/加点规则.json 自动生成，勿手改。 */
const GF_PTS_RULES = {
 "层次": [
  "入门",
  "小成",
  "大成",
  "圆满",
  "破限",
  "化境",
  "极道"
 ],
 "每层所需": [
  10,
  25,
  60,
  140,
  320,
  700,
  1500
 ],
 "魂力": {
  "说明": "人类魂师的魂力项按此阶梯逐级消耗点数，不套用常规七层表。每逢 10、20、30、40、50、60、70、80、90 级遇魂环瓶颈（魂力等级达环数最多的非血脉武魂环数加一乘十），进度满 100% 即由脚本锁停，须先在正文吸收魂环或融合魂灵破开瓶颈后才可继续靠加点升阶。斗1至斗3及未获神位者止步 99 级巅峰；斗4 破入 100 级神级、110 级真神、120 级超神须先在正文渡过生命层次与天劫门槛，120 级以上仅限斗4后期有原作级大机缘者。严禁借加点直接提升武魂品质、提高魂环年限、颁授神位或跨越大层次；魂兽兽身以修为年限项走常规层次表，神祇以神力凝练与神识项走常规层次表。",
  "每级所需": [
   {
    "到": 10,
    "点数": 4
   },
   {
    "到": 20,
    "点数": 6
   },
   {
    "到": 30,
    "点数": 10
   },
   {
    "到": 40,
    "点数": 16
   },
   {
    "到": 50,
    "点数": 24
   },
   {
    "到": 60,
    "点数": 36
   },
   {
    "到": 70,
    "点数": 55
   },
   {
    "到": 80,
    "点数": 85
   },
   {
    "到": 90,
    "点数": 130
   },
   {
    "到": 94,
    "点数": 200
   },
   {
    "到": 98,
    "点数": 320
   },
   {
    "到": 99,
    "点数": 500
   },
   {
    "到": 109,
    "点数": 650
   },
   {
    "到": 119,
    "点数": 950
   },
   {
    "到": 140,
    "点数": 1500
   }
  ]
 },
 "发点": [
  {
   "场景": "日常冥想、吐纳或体能苦修满一个外界日",
   "点数": "1–3"
  },
  {
   "场景": "钻研暗器、锻造、魂导制作、药理或自创魂技取得实效",
   "点数": "2–4"
  },
  {
   "场景": "门内切磋演练或轻松击败低阶对手",
   "点数": "2–4"
  },
  {
   "场景": "势均力敌的正式实战、斗魂或升灵台猎兽取胜",
   "点数": "4–8"
  },
  {
   "场景": "以弱胜强越级破敌、血战生死关头涉险脱困",
   "点数": "8–15"
  },
  {
   "场景": "成功吸收魂环、融合魂灵、吸收魂骨或炼化仙草奇珍",
   "点数": "6–12"
  },
  {
   "场景": "魂兽渡劫、化形重修破境或神祇演练权柄有所顿悟",
   "点数": "8–15"
  },
  {
   "场景": "完成日常任务",
   "点数": "4–8"
  },
  {
   "场景": "完成突发任务",
   "点数": "8–14"
  },
  {
   "场景": "完成主线任务或主导改写原作关键节点",
   "点数": "12–25"
  },
  {
   "场景": "跳时闭关或长途历练总结（按实效汇总，仍受每轮上限约束）",
   "点数": "10–30"
  }
 ],
 "每轮上限": 30,
 "默认面板": {
  "人类魂师": [
   {
    "项名": "魂力",
    "类别": "修为"
   },
   {
    "项名": "体魄",
    "类别": "体魄"
   },
   {
    "项名": "身法",
    "类别": "体魄"
   },
   {
    "项名": "精神力",
    "类别": "精神"
   },
   {
    "项名": "魂技微操",
    "类别": "魂技"
   },
   {
    "项名": "冥想术",
    "类别": "技艺"
   }
  ],
  "魂兽": [
   {
    "项名": "修为年限",
    "类别": "修为"
   },
   {
    "项名": "兽躯体魄",
    "类别": "体魄"
   },
   {
    "项名": "灵觉感知",
    "类别": "精神"
   },
   {
    "项名": "本命兽技",
    "类别": "魂技"
   },
   {
    "项名": "隐息敛形",
    "类别": "技艺"
   }
  ],
  "神祇": [
   {
    "项名": "神力凝练",
    "类别": "修为"
   },
   {
    "项名": "神躯承载",
    "类别": "体魄"
   },
   {
    "项名": "神识",
    "类别": "精神"
   },
   {
    "项名": "权柄运用",
    "类别": "魂技"
   },
   {
    "项名": "神装温养",
    "类别": "技艺"
   }
  ]
 }
};

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

/* 金手指 · 深蓝加点（完整规则，纯逻辑）
 * 契约 §2.2 + 审查记录 B2：
 *   - 7 层层次表（入门→极道：10/25/60/140/320/700/1500）与魂力 15 档每级所需点数
 *   - 逐点结算：用 2 位小数精度进度无漂移追踪到 1500 点档；遇瓶颈停在 100% 不多扣点
 *   - 瓶颈锁停：
 *       1) 人类/化形魂力：卡在 (非血脉武魂最多环数 + 1) × 10 级；非斗4无神位止步 99 级；斗4 99/109/119 级需正文渡劫破入百/真/超神
 *       2) 魂兽兽身修为年限（B2）：兽身 && !凶兽 && 修为年限 >= 90000 且 < 100000 锁在 100%，正文成凶兽或破十万年解锁
 *       3) 常规项极道满 100% 封顶
 *   - 每轮把关（onUpdated）：
 *       - 保护 累计 与面板已有项的 层次/进度/投入 不被 AI 篡改
 *       - 允许 AI 新增面板项（总上限 24），新增项强制初值 { 层次:'入门', 进度:0, 投入:0 }
 *       - 可用 单轮总净增封顶 30（含任务奖励，B2）；任务失败扣点放行
 *       - 主线魂力等级自然上涨高于面板时同步抬高 面板.魂力.层次 并清进度
 */
const PTS_CATS = Object.freeze(['修为', '体魄', '精神', '魂技', '技艺']);
const PTS_LAYERS_DEF = Object.freeze(['入门', '小成', '大成', '圆满', '破限', '化境', '极道']);
const PTS_COSTS_DEF = Object.freeze([10, 25, 60, 140, 320, 700, 1500]);
const PTS_SOUL_DEF = Object.freeze([
  { 到: 10, 点数: 4 }, { 到: 20, 点数: 6 }, { 到: 30, 点数: 10 }, { 到: 40, 点数: 16 },
  { 到: 50, 点数: 24 }, { 到: 60, 点数: 36 }, { 到: 70, 点数: 55 }, { 到: 80, 点数: 85 },
  { 到: 90, 点数: 130 }, { 到: 94, 点数: 200 }, { 到: 98, 点数: 320 }, { 到: 99, 点数: 500 },
  { 到: 109, 点数: 650 }, { 到: 119, 点数: 950 }, { 到: 140, 点数: 1500 },
]);

function ptsRulesObj(rules) {
  return rules || (typeof GF_PTS_RULES !== 'undefined' ? GF_PTS_RULES : null);
}
function ptsLayers(rules) {
  const r = ptsRulesObj(rules);
  return (r && Array.isArray(r.层次) && r.层次.length) ? r.层次 : PTS_LAYERS_DEF;
}
function ptsLayerCosts(rules) {
  const r = ptsRulesObj(rules);
  return (r && Array.isArray(r.每层所需) && r.每层所需.length) ? r.每层所需 : PTS_COSTS_DEF;
}
function ptsIsSoulRow(name, it) {
  return name === '魂力' && (!it || it.类别 === '修为' || /\d+\s*级/.test(String(it.层次 || '')));
}
function ptsSoulLevel(it, stat) {
  const m = /(\d+)\s*级/.exec(String((it && it.层次) || ''));
  if (m) return Number(m[1]);
  const hl = stat && stat.主角 && Number(stat.主角.魂力等级);
  return Number.isFinite(hl) && hl >= 1 ? Math.round(hl) : 1;
}
function ptsSoulCost(lv, rules) {
  const r = ptsRulesObj(rules);
  const table = (r && r.魂力 && Array.isArray(r.魂力.每级所需) && r.魂力.每级所需.length) ? r.魂力.每级所需 : PTS_SOUL_DEF;
  for (const row of table) if (lv <= row.到) return row.点数;
  return table[table.length - 1].点数;
}
function ptsCostOf(name, it, stat, rules) {
  if (ptsIsSoulRow(name, it)) return ptsSoulCost(ptsSoulLevel(it, stat), rules);
  const layers = ptsLayers(rules), costs = ptsLayerCosts(rules);
  const idx = layers.indexOf(it && it.层次);
  return costs[idx >= 0 ? idx : 0] || costs[costs.length - 1];
}

/** 计算某项是否卡在瓶颈（到达进度 100% 时不能再晋阶）；未卡返回 null */
function ptsLockOf(name, it, stat, rules) {
  const h = (stat && stat.主角) || {};
  const part = (stat && stat.时空 && stat.时空.当前部) || null;
  if (ptsIsSoulRow(name, it)) {
    const lv = ptsSoulLevel(it, stat);
    const souls = Object.values(h.武魂 || {}).filter((w) => w && typeof w === 'object' && w.类别 !== '血脉');
    const maxRings = souls.reduce((m, w) => Math.max(m, Array.isArray(w.魂环) ? w.魂环.length : 0), 0);
    if (maxRings < 9) {
      const cap = (maxRings + 1) * 10;
      if (lv >= cap) return { 卡在: cap, 说明: `已抵 ${cap} 级魂环瓶颈（当前最多 ${maxRings} 环），须先在正文吸收魂环或融合魂灵` };
    }
    const hasGod = !!((h.神途 && h.神途.神位) || h.神阶);
    if (part !== '斗4' && !hasGod && lv >= 99) {
      return { 卡在: 99, 说明: '已抵 99 级极限斗罗巅峰，需凝聚神位方能突破' };
    }
    if (part === '斗4') {
      const mainLv = Number(h.魂力等级) || lv;
      if (lv === 99 && mainLv < 100) return { 卡在: 100, 说明: '已抵 99 级巅峰，须先在正文渡过百级神级天劫门槛' };
      if (lv === 109 && mainLv < 110) return { 卡在: 110, 说明: '已抵 109 级神级巅峰，须先在正文渡过真神生命层次门槛' };
      if (lv === 119 && mainLv < 120) return { 卡在: 120, 说明: '已抵 119 级真神巅峰，须先在正文渡过超神生命层次门槛' };
    }
    if (lv >= 140) return { 卡在: 140, 说明: '已达面板修为上限' };
    return null;
  }
  // B2：兽身魂兽未成凶兽且修为年限达九万年时锁停，渡过十万年天劫（凶兽 true 或年限 >= 100000）解锁
  if (name === '修为年限' && h.出身 === '魂兽' && h.形态 === '兽身') {
    const years = Number(h.修为年限) || 0;
    if (!h.凶兽 && years >= 90000 && years < 100000) {
      return { 卡在: '十万年天劫', 说明: '已临近十万年大限，须先在正文渡过十万年天劫（成凶兽或破十万年）后解锁' };
    }
  }
  const layers = ptsLayers(rules);
  if (it && it.层次 === layers[layers.length - 1]) {
    return { 卡在: layers[layers.length - 1], 说明: `已达${layers[layers.length - 1]}满境，无法继续加点` };
  }
  return null;
}

function ptsDefaultPanelFor(stat, rules) {
  const r = ptsRulesObj(rules);
  const kind = gfHeroType(stat);
  const list = (r && r.默认面板 && r.默认面板[kind]) || [
    { 项名: '魂力', 类别: '修为' }, { 项名: '体魄', 类别: '体魄' }, { 项名: '精神力', 类别: '精神' },
  ];
  const lv = Math.max(1, Math.min(150, Math.round(Number(stat && stat.主角 && stat.主角.魂力等级) || 1)));
  const out = {};
  for (const row of list) {
    out[row.项名] = { 类别: row.类别, 层次: row.项名 === '魂力' ? `${lv} 级` : '入门', 进度: 0, 投入: 0 };
  }
  return out;
}

/** 逐点加点结算：卡瓶颈即停，不多扣点；突破自动写入待入账（来源“加点”） */
function ptsSpend(stat, payload, rules) {
  const G = stat && stat.金手指;
  const A = G && G.加点;
  if (!G || !A || !gfIsPlainObj(A.面板)) return { ok: false, why: '找不到加点面板' };
  const name = String((payload && payload.项) || '').trim();
  const it = A.面板[name];
  if (!it) return { ok: false, why: `面板里没有「${name}」` };
  if ((A.可用 || 0) < 1) return { ok: false, why: '可用点数不足' };

  const preLock = ptsLockOf(name, it, stat, rules);
  if (preLock && it.进度 >= 100) return { ok: false, lock: true, why: preLock.说明 };

  const want = Math.min(Math.max(1, Math.floor(Number(payload && payload.点) || 1)), A.可用);
  const layers = ptsLayers(rules);
  let spent = 0, leveled = 0, hitLock = null;
  const fromTier = it.层次;

  for (let i = 0; i < want && A.可用 > 0; i += 1) {
    const lock = ptsLockOf(name, it, stat, rules);
    if (lock && it.进度 >= 100) { hitLock = lock; break; }
    const need = Math.max(1, ptsCostOf(name, it, stat, rules));
    const curPts = Math.round((it.进度 / 100) * need);
    A.可用 -= 1;
    A.累计 = (A.累计 || 0) + 1;
    it.投入 = (it.投入 || 0) + 1;
    spent += 1;
    const nextPts = curPts + 1;
    if (nextPts >= need) {
      if (lock) {
        it.进度 = 100;
        hitLock = lock;
        break;
      }
      if (ptsIsSoulRow(name, it)) {
        it.层次 = `${ptsSoulLevel(it, stat) + 1} 级`;
      } else {
        const idx = layers.indexOf(it.层次);
        it.层次 = layers[Math.min(layers.length - 1, (idx < 0 ? 0 : idx) + 1)];
      }
      it.进度 = 0;
      leveled += 1;
    } else {
      it.进度 = Math.round((nextPts / need) * 10000) / 100;
    }
  }

  if (spent === 0 && hitLock) return { ok: false, lock: true, why: hitLock.说明 };

  if (leveled > 0) {
    const today = (stat.时空 && stat.时空.外界日期) || '';
    const part = (stat.时空 && stat.时空.当前部) || null;
    const target = ptsIsSoulRow(name, it) ? '魂力等级' : '面板';
    const desc = `由${fromTier}突破至${it.层次}，下一轮正文写突破体感并同步主线数值。`;
    gfPushPending(G, {
      名称: `${name}突破 · ${it.层次}`,
      品阶: null,
      来源: '加点',
      出处: '斗罗',
      说明: [...desc].length > 60 ? [...desc].slice(0, 60).join('') : desc,
      落点: target,
      日期: today,
      状态: '待入账',
    }, part);
  }
  return { ok: true, spent, 升: leveled, 卡: hitLock, it: { ...it } };
}

/** 玩家在面板手动新增一项可加点技艺/魂技（上限 24 项） */
function ptsAddRow(stat, payload) {
  const A = stat && stat.金手指 && stat.金手指.加点;
  if (!A || !gfIsPlainObj(A.面板)) return { ok: false, why: '找不到加点面板' };
  const name = String((payload && payload.项名) || '').trim();
  const clipped = [...name].slice(0, 20).join('');
  if (!clipped) return { ok: false, why: '请先填写项名' };
  if (A.面板[clipped]) return { ok: false, why: `面板里已有「${clipped}」` };
  if (Object.keys(A.面板).length >= 24) return { ok: false, why: '面板已满 24 项' };
  const cat = PTS_CATS.includes(payload && payload.类别) ? payload.类别 : '技艺';
  A.面板[clipped] = { 类别: cat, 层次: '入门', 进度: 0, 投入: 0 };
  return { ok: true, 项名: clipped, it: { ...A.面板[clipped] } };
}

const GF_DEF = {
  schema(z, K, tones) {
    const itemShape = z.object({
      类别: K.pick(PTS_CATS, '技艺'),
      层次: K.str('入门', 24),
      进度: K.num(0, 0, 100, 2),
      投入: K.int(0, 0, 999999),
    });
    const panelShape = K.pre((v) => {
      if (!gfIsPlainObj(v)) return {};
      const out = {};
      for (const [k, val] of Object.entries(v).slice(0, 24)) {
        const nk = [...String(k).trim()].slice(0, 20).join('');
        if (nk && gfIsPlainObj(val)) out[nk] = val;
      }
      return out;
    }, z.record(z.string(), itemShape));
    const ptsShape = K.pre((v) => (gfIsPlainObj(v) ? v : {}), z.object({
      可用: K.int(0, 0, 99999),
      累计: K.int(0, 0, 999999),
      面板: panelShape,
    }));
    return gfBlockSchema(z, '深蓝加点', { 加点: ptsShape }, null, tones);
  },

  onUpdated(after, before) {
    const G = after && after.金手指;
    if (!G || G.类型 !== '深蓝加点' || !G.加点) return;
    const A = G.加点;
    const prevA = before && gfIsPlainObj(before.金手指) && before.金手指.类型 === '深蓝加点' && gfIsPlainObj(before.金手指.加点)
      ? before.金手指.加点 : null;
    const rules = ptsRulesObj(null);
    const turnCap = (rules && Number.isFinite(rules.每轮上限)) ? rules.每轮上限 : 30;

    if (!prevA) {
      if (!gfIsPlainObj(A.面板) || !Object.keys(A.面板).length) A.面板 = ptsDefaultPanelFor(after, rules);
      if (A.可用 > turnCap) A.可用 = turnCap;
    } else {
      // 1. 累计不可被 AI 篡改
      A.累计 = prevA.累计 || 0;
      // 2. B2：单轮可用点数总净增上限 30（含任务奖励，不豁免）；扣减放行
      const prevAvail = Number(prevA.可用) || 0;
      if (A.可用 > prevAvail + turnCap) A.可用 = prevAvail + turnCap;
      // 3. 保护已有面板项的 层次/进度/投入；允许 AI 新增最多到 24 项（初值强制入门/0/0）
      const nextPanel = {};
      const prevPanel = gfIsPlainObj(prevA.面板) ? prevA.面板 : {};
      for (const [k, v] of Object.entries(prevPanel)) {
        nextPanel[k] = JSON.parse(JSON.stringify(v));
      }
      const curPanel = gfIsPlainObj(A.面板) ? A.面板 : {};
      for (const [k, v] of Object.entries(curPanel)) {
        if (k in nextPanel) continue;
        if (Object.keys(nextPanel).length >= 24) break;
        if (!gfIsPlainObj(v)) continue;
        const cat = PTS_CATS.includes(v.类别) ? v.类别 : '技艺';
        nextPanel[k] = { 类别: cat, 层次: '入门', 进度: 0, 投入: 0 };
      }
      A.面板 = nextPanel;
    }

    // 4. 若主线魂力等级自然上涨高于面板记录（如吸环破境或原作角色首轮定级），同步抬高 面板.魂力
    const mainLv = Number(after.主角 && after.主角.魂力等级);
    if (Number.isFinite(mainLv) && A.面板 && A.面板.魂力 && ptsIsSoulRow('魂力', A.面板.魂力)) {
      const pLv = ptsSoulLevel(A.面板.魂力, after);
      if (mainLv > pLv) {
        A.面板.魂力.层次 = `${Math.round(mainLv)} 级`;
        A.面板.魂力.进度 = 0;
      }
    }
  },

  act(action, payload, stat) {
    if (action === '加点') return ptsSpend(stat, payload, ptsRulesObj(null));
    if (action === '加新项') return ptsAddRow(stat, payload);
    return { ok: false, why: `深蓝加点不支持的操作：${action}` };
  },

  pageData() {
    const rules = ptsRulesObj(null);
    return {
      rules,
      costOf: (name, it, stat) => ptsCostOf(name, it, stat, rules),
      lockOf: (name, it, stat) => ptsLockOf(name, it, stat, rules),
    };
  },
};

const GF_PAGE = "/* 金手指 · 主页面代码的共用部分（状态栏系统页外壳 + 正文 <系统> 六皮标签）\n * build.py 把 本文件 + 页面/<类型>.js 拼起来，末尾加一句 return DLGF_PAGE_<类型>(GF, INFO, BRIDGE, DLGF_SHARED(GF, INFO, BRIDGE))，\n * 整段由金手指脚本在主页面里用 new Function('GF', 'INFO', 'BRIDGE', 代码) 执行。\n * 视觉红线：无朱砂主色、无大圆角（≤4px）、无 emoji 图标、无远程资源、三档动效（full / reduced→lite / off）+ prefers-reduced-motion。\n */\nfunction DLGF_SHARED(GF, INFO, BRIDGE) {\n  const esc = (s) => String(s == null ? '' : s).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\n  const TIER = ['彩', '金', '红', '紫', '黄', '白'];\n  const SYS_KEY = { 未来模拟器: 'sim', 深蓝加点: 'pts', 诸天代打: 'hero', 签到打卡: 'sign', 抽奖: 'gacha', 跨时代聊天群: 'chat' };\n  const gfOf = (st) => (st && st.金手指 && typeof st.金手指 === 'object' ? st.金手指 : null);\n  const mine = (st) => { const g = gfOf(st); return !!g && g.类型 === GF; };\n\n  function dayNo(s) {\n    const m = /(前)?(\\d{1,9})年(\\d{1,2})月(\\d{1,2})日/u.exec(String(s || ''));\n    if (!m) return null;\n    const y0 = (m[1] ? -1 : 1) * Number(m[2]), mo = Number(m[3]), d = Number(m[4]);\n    const y = y0 - (mo <= 2 ? 1 : 0), era = Math.floor(y / 400), yoe = y - era * 400;\n    const doy = Math.floor((153 * ((mo + 9) % 12) + 2) / 5) + d - 1;\n    return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;\n  }\n  const daysTo = (from, to) => { const a = dayNo(from), b = dayNo(to); return a == null || b == null ? null : b - a; };\n  const short = (s) => { const m = /(\\d{1,2})月(\\d{1,2})日/u.exec(String(s || '')); return m ? `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}` : '—'; };\n  const year = (s) => { const m = /(前)?(\\d{1,9})年/u.exec(String(s || '')); return m ? (m[1] ? '前' : '') + m[2] : '—'; };\n  const tierIn = (text) => { const m = /([彩金红紫黄白])阶/u.exec(String(text || '')); return m ? m[1] : null; };\n\n  function motionOf(kit) {\n    const raw = (kit && kit.motion) || (document.documentElement.dataset.dlMotion) || 'full';\n    if (raw === 'off') return 'off';\n    try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off'; } catch (_) { /* ignore */ }\n    return raw === 'reduced' || raw === 'lite' ? 'lite' : 'full';\n  }\n  const still = (kit) => motionOf(kit) !== 'full';\n\n  function frag(html) {\n    const t = document.createElement('template');\n    t.innerHTML = String(html || '').trim();\n    return t.content.firstElementChild;\n  }\n\n  function typeIn(el, text, kit, speed = 26) {\n    if (!el) return;\n    if (el._typing) { clearInterval(el._typing); el._typing = null; }\n    const s = String(text || '');\n    if (still(kit)) { el.innerHTML = `<q>${esc(s)}</q>`; return; }\n    let i = 0;\n    const q = document.createElement('q');\n    const cur = document.createElement('i');\n    cur.className = 'cur';\n    el.replaceChildren(q, cur);\n    el._typing = setInterval(() => {\n      if (!el.isConnected) { clearInterval(el._typing); el._typing = null; return; }\n      i += 1;\n      q.textContent = s.slice(0, i);\n      if (i >= s.length) {\n        clearInterval(el._typing); el._typing = null;\n        setTimeout(() => { if (cur.isConnected) cur.remove(); }, 1600);\n      }\n    }, speed);\n  }\n\n  function roll(el, to, kit, ms = 700) {\n    if (!el) return;\n    let tn = [...el.childNodes].find((n) => n.nodeType === 3);\n    if (!tn) tn = el.insertBefore(document.createTextNode(''), el.firstChild);\n    const from = Number(el.dataset.v != null ? el.dataset.v : parseFloat(tn.textContent)) || 0;\n    el.dataset.v = String(to);\n    if (still(kit) || from === to) { tn.textContent = String(to); return; }\n    const t0 = performance.now();\n    const step = () => {\n      if (!el.isConnected) return;\n      const p = Math.min(1, (performance.now() - t0) / ms);\n      tn.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));\n      if (p < 1) setTimeout(step, 16);\n    };\n    step();\n  }\n\n  function burst(host, x, y, colors, kit, n = 18, spread = 90) {\n    if (still(kit) || !host || !host.isConnected) return;\n    const cols = colors && colors.length ? colors : ['#fff'];\n    for (let i = 0; i < n; i += 1) {\n      const s = document.createElement('i');\n      s.className = 'jp-spark';\n      s.style.left = x + 'px';\n      s.style.top = y + 'px';\n      s.style.setProperty('--c', cols[i % cols.length]);\n      host.appendChild(s);\n      const a = Math.random() * Math.PI * 2;\n      const r = spread * (0.4 + Math.random() * 0.8);\n      if (s.animate) {\n        s.animate([\n          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },\n          { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(.2)`, opacity: 0 },\n        ], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => s.remove();\n      } else {\n        setTimeout(() => s.remove(), 400);\n      }\n    }\n  }\n\n  function toast(root, msg) {\n    if (!root) return;\n    root.querySelectorAll('.jp-toast').forEach((t) => t.remove());\n    const t = document.createElement('div');\n    t.className = 'jp-toast';\n    t.setAttribute('role', 'status');\n    t.textContent = String(msg || '');\n    root.appendChild(t);\n    setTimeout(() => { if (t.isConnected) t.remove(); }, 2700);\n  }\n\n  const disabled = (kit) => (BRIDGE && typeof BRIDGE.disabled === 'function' ? BRIDGE.disabled(kit) : '');\n  const act = (action, payload, opts) => (BRIDGE && typeof BRIDGE.act === 'function'\n    ? BRIDGE.act(action, payload, opts)\n    : Promise.resolve({ ok: false, why: '金手指写入桥不可用' }));\n  const syncBar = () => { if (BRIDGE && typeof BRIDGE.syncBar === 'function') BRIDGE.syncBar(); };\n\n  function lockBanner(reason) {\n    return reason ? `<div class=\"jp-lock\" role=\"note\">${esc(reason)}</div>` : '';\n  }\n\n  function caveat(extra) {\n    const text = extra || '面板操作写入最新 AI 楼层；重新生成或右滑这一层时，本层做过的签到、抽奖、加点等操作会一并撤销。';\n    return `<p class=\"jp-caveat\">${esc(text)}</p>`;\n  }\n\n  // ── 页头（含随时改口吻入口） ──\n  function head(G, o, kit) {\n    const tone = (G && G.口吻) || {};\n    const lock = disabled(kit);\n    return `<header class=\"jp-hd\">\n      <div class=\"jp-mark\" aria-hidden=\"true\">${o.mark || ''}</div>\n      <div class=\"jp-nm\"><b>${esc(tone.名字 || o.名字 || INFO.默认名 || '系统')}</b><span>${esc(G.类型)}${tone.预设 ? ' · ' + esc(tone.预设) : ' · 自定口吻'}</span><button type=\"button\" class=\"jp-tone-btn\" data-tone-toggle ${lock ? 'disabled' : ''}>改口吻</button></div>\n      <div class=\"jp-hs\">${(o.stats || []).map((s) => `<div><b data-k=\"${esc(s.k)}\">${esc(s.v)}${s.u ? `<small>${esc(s.u)}</small>` : ''}</b><span>${esc(s.label)}</span></div>`).join('')}</div>\n      <p class=\"jp-say\" aria-live=\"polite\"></p>\n    </header><div class=\"jp-tone\" data-part=\"tone\" hidden></div>`;\n  }\n\n  function bindToneEditor(root, G, kit) {\n    const btn = root.querySelector('[data-tone-toggle]');\n    const box = root.querySelector('[data-part=\"tone\"]');\n    if (!btn || !box) return;\n    const isChat = G.类型 === '跨时代聊天群' || !!(INFO && INFO.口吻预设 === '群主机器人');\n    const presets = Array.isArray(INFO && INFO.口吻预设)\n      ? INFO.口吻预设\n      : ((BRIDGE && BRIDGE.tones && (isChat ? BRIDGE.tones.群主机器人 : BRIDGE.tones.系统)) || []);\n    let open = false;\n    function renderBox() {\n      if (!open) { box.hidden = true; box.replaceChildren(); return; }\n      const tone = G.口吻 || {};\n      box.hidden = false;\n      box.innerHTML = `<div class=\"jp-tone-in\">\n        <div class=\"jp-tone-row\">\n          <label><span>${isChat ? '机器人名' : '系统名'}</span><input type=\"text\" data-tk=\"名字\" maxlength=\"8\" value=\"${esc(tone.名字 || '')}\"></label>\n          <label><span>称呼${isChat ? '群友' : '你'}</span><input type=\"text\" data-tk=\"称呼\" maxlength=\"8\" value=\"${esc(tone.称呼 || '')}\"></label>\n        </div>\n        ${presets.length ? `<div class=\"jp-tone-pre\">${presets.map((p, i) => `<button type=\"button\" data-tp=\"${i}\" aria-pressed=\"${String(tone.预设 === p.预设)}\">${esc(p.预设)}</button>`).join('')}</div>` : ''}\n        <label class=\"jp-tone-desc\"><span>性格与说话方式</span><textarea data-tk=\"描述\" maxlength=\"120\" rows=\"2\">${esc(tone.描述 || '')}</textarea></label>\n        <div class=\"jp-tone-acts\">\n          <button type=\"button\" class=\"jp-btn\" data-tone-cancel>取消</button>\n          <button type=\"button\" class=\"jp-btn pri\" data-tone-save>保存口吻</button>\n        </div>\n      </div>`;\n      let curPreset = tone.预设 || null;\n      const nmIn = box.querySelector('[data-tk=\"名字\"]');\n      const callIn = box.querySelector('[data-tk=\"称呼\"]');\n      const descIn = box.querySelector('[data-tk=\"描述\"]');\n      box.querySelectorAll('[data-tp]').forEach((b) => b.addEventListener('click', () => {\n        const p = presets[Number(b.dataset.tp)];\n        if (!p) return;\n        curPreset = p.预设;\n        nmIn.value = (isChat ? p.名字 : p.自称) || nmIn.value;\n        callIn.value = p.称呼 || callIn.value;\n        descIn.value = p.描述 || '';\n        box.querySelectorAll('[data-tp]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));\n      }));\n      descIn.addEventListener('input', () => {\n        curPreset = null;\n        box.querySelectorAll('[data-tp]').forEach((x) => x.setAttribute('aria-pressed', 'false'));\n      });\n      box.querySelector('[data-tone-cancel]').addEventListener('click', () => { open = false; renderBox(); });\n      box.querySelector('[data-tone-save]').addEventListener('click', async () => {\n        const r = await act('改口吻', { 名字: nmIn.value, 称呼: callIn.value, 预设: curPreset, 描述: descIn.value });\n        if (!r.ok) { toast(root, r.why || '没存上'); return; }\n        open = false;\n        toast(root, '口吻已更新，下一轮正文起生效');\n      });\n    }\n    btn.addEventListener('click', () => {\n      if (btn.disabled) return;\n      open = !open;\n      renderBox();\n    });\n  }\n\n  // ── 任务 ──\n  function tasks(G, S) {\n    const list = Array.isArray(G.任务) ? G.任务 : [];\n    const on = list.filter((t) => t.状态 === '进行中').length;\n    const today = S && S.时空 && S.时空.外界日期;\n    return `<section class=\"jp-sec\" data-part=\"tasks\"><h5 class=\"jp-st\">任务<em>进行中 ${on}/3</em></h5>\n      ${list.length ? `<div class=\"jp-tks\">${list.map((t) => {\n        const d = t.期限 === '不限' ? null : daysTo(today, t.期限);\n        const due = t.期限 === '不限' ? '不限期' : d == null ? short(t.期限) : d < 0 ? '已过期' : d === 0 ? '今日截止' : `剩 ${d} 天`;\n        const tier = tierIn(t.奖励);\n        return `<article class=\"jp-tk\" data-c=\"${esc(t.类别)}\" data-s=\"${esc(t.状态)}\">\n          <span class=\"jp-tk-k\">${esc(t.类别)}</span>\n          <div class=\"jp-tk-b\">\n            <div class=\"jp-tk-t\"><b>${esc(t.标题)}</b>${t.状态 === '进行中' ? `<time data-k=\"${d != null && d <= 1 ? 'soon' : ''}\">${esc(due)}</time>` : ''}</div>\n            <p class=\"jp-tk-c\">${esc(t.内容)}</p>\n            <div class=\"jp-tk-f\"><span class=\"g\"${tier ? ` data-tier=\"${tier}\" style=\"color:var(--c1)\"` : ''}>${esc(t.奖励)}</span>${t.失败 && t.失败 !== '无' ? `<span class=\"l\">${esc(t.失败)}</span>` : ''}</div>\n          </div>\n          ${t.状态 !== '进行中' ? `<span class=\"jp-tk-stamp\">${t.状态 === '已完成' ? '完成' : '失败'}</span>` : ''}\n        </article>`;\n      }).join('')}</div>` : `<p class=\"jp-none\">${esc((G.口吻 && G.口吻.名字) || '系统')}还没发任务。</p>`}\n    </section>`;\n  }\n\n  // ── 待入账 ──\n  function rewardCard(r, cls = '') {\n    const cross = r.出处 && r.出处 !== '斗罗';\n    return `<article class=\"jp-rw ${cls}\"${r.品阶 ? ` data-tier=\"${esc(r.品阶)}\"` : ''}>\n      <div class=\"jp-rw-h\">${r.品阶 ? `<span class=\"jp-rw-t\">${esc(r.品阶)}</span>` : ''}<b>${esc(r.名称)}</b>${cross ? `<span class=\"jp-rw-x\">跨界 · ${esc(r.出处)}</span>` : ''}</div>\n      ${r.说明 ? `<p>${esc(r.说明)}</p>` : ''}\n      <div class=\"jp-rw-f\"><span class=\"to\">${esc(r.落点 || '其他')}</span><span>${esc(r.来源 || '')} · ${short(r.日期)}</span>${r.状态 === '待入账' ? '<span class=\"wait\">等正文入账</span>' : ''}</div>\n    </article>`;\n  }\n\n  function ledger(G, freshCount = 0) {\n    // 待入账按时间追加在末尾，显示时最新排最前\n    const list = (Array.isArray(G.待入账) ? G.待入账 : []).filter((r) => r.状态 === '待入账').slice().reverse();\n    const log = Array.isArray(G.入账记录) ? G.入账记录 : [];\n    return `<section class=\"jp-sec\" data-part=\"ledger\"><h5 class=\"jp-st\">待入账<em>${list.length} 件 · 下一轮正文里落地</em></h5>\n      ${list.length ? `<div class=\"jp-lg\">${list.map((r, i) => rewardCard(r, i < freshCount ? 'new' : '')).join('')}</div>` : '<p class=\"jp-none\">没有等着入账的东西。</p>'}\n      ${log.length ? `<ol class=\"jp-log\">${log.slice(0, 4).map((x) => `<li><b>${esc(x.名称)}</b><span>→ ${esc(x.落点)}</span><time>${short(x.日期)}</time></li>`).join('')}</ol>` : ''}\n    </section>`;\n  }\n\n  function swap(root, part, html) {\n    const old = root.querySelector(`[data-part=\"${part}\"]`);\n    const nu = frag(html);\n    if (old && nu) old.replaceWith(nu);\n    return nu;\n  }\n\n  function dockMark(sys, iconPath, inner, k, title, kit, tab) {\n    const el = frag(`<button type=\"button\" class=\"jp-dk\" data-sys=\"${esc(sys)}\" data-k=\"${esc(k || '')}\" title=\"${esc(title || '')}\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"square\" aria-hidden=\"true\">${iconPath}</svg>${inner}</button>`);\n    if (kit && typeof kit.open === 'function' && tab) el.addEventListener('click', () => kit.open(tab));\n    return el;\n  }\n\n  // ── 正文块头解析（契约 §3） ──\n  const BLOCK_META_KEYS = new Set(['类别', '标题', '人物', '出处', '阶段']);\n  function parseBlock(inner) {\n    const lines = String(inner == null ? '' : inner).replace(/^\\n+|\\n+$/gu, '').split('\\n');\n    const meta = {};\n    let i = 0;\n    for (; i < lines.length; i += 1) {\n      const m = /^\\s*([^｜|\\s]{1,6})[｜|](.*)$/u.exec(lines[i]);\n      if (!m || !BLOCK_META_KEYS.has(m[1])) break;\n      meta[m[1]] = m[2].trim();\n    }\n    return { meta, body: lines.slice(i).join('\\n').trim() };\n  }\n\n  // ── 正文 <系统> 块渲染器（六个金手指共用，按 金手指.类型 换皮） ──\n  const systemBlock = {\n    render(seg, kit) {\n      const { meta, body } = parseBlock(seg.inner);\n      const st = kit && kit.env && kit.env.stat;\n      const G = (st && st.金手指) || { 类型: GF, 口吻: { 名字: INFO.默认名 } };\n      const key = (INFO && INFO.key) || SYS_KEY[G.类型] || 'sim';\n      const tone = G.口吻 || {};\n      const cat = meta.类别 || '提示';\n      const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null;\n      const attrs = {\n        class: 'sx qt-sx' + (t != null ? ' in' : ''),\n        'data-sys': key,\n        'data-cat': cat,\n        style: t != null ? { '--gf-t': `-${t.toFixed(2)}s` } : null,\n      };\n      const lines = body ? body.split('\\n').filter((l) => l.trim()) : [];\n      return kit.h('section', attrs,\n        kit.h('div', { class: 'sx-hd' },\n          kit.h('span', { class: 'sx-ding', text: key === 'chat' ? '群公告' : '叮' }),\n          kit.h('span', { class: 'sx-nm', text: tone.名字 || G.类型 || '系统' }),\n          kit.h('span', { class: 'sx-k', text: cat })),\n        meta.标题 ? kit.h('h5', { class: 'qt-sx-t', text: meta.标题 }) : null,\n        lines.map((l) => kit.h('p', { class: 'sx-line' }, kit.sub ? kit.sub(l) : l)));\n    },\n  };\n\n  // ── 共用样式（自带 @property --qa、品阶色、系统色、关键帧、.jp 外壳与 <系统> 六皮） ──\n  const CSS = `\n@property --qa{syntax:'<angle>';inherits:false;initial-value:0deg}\n@keyframes qyHue{to{--qa:360deg}}\n@keyframes qyShine{0%{background-position:130% 0}55%,100%{background-position:-130% 0}}\n@keyframes sxBlink{50%{opacity:0}}\n@keyframes sxIn{from{opacity:0;transform:translateY(8px)}}\n@keyframes sxScan{to{top:110%}}\n@keyframes sxGlitch{0%{opacity:0;clip-path:inset(40% 0 52% 0);transform:translateX(-6px)}20%{opacity:1;clip-path:inset(10% 0 70% 0);transform:translateX(5px)}40%{clip-path:inset(60% 0 10% 0);transform:translateX(-3px)}60%{clip-path:inset(0 0 30% 0)}80%,100%{clip-path:inset(0);transform:none}}\n@keyframes sxFlowY{to{background-position:0 14px}}\n@keyframes sxRoll{from{transform:translateY(70%);opacity:0}}\n@keyframes sxTurn{to{transform:rotate(405deg)}}\n@keyframes sxStamp{0%{transform:rotate(-10deg) scale(2.4);opacity:0}60%{transform:rotate(-10deg) scale(.92);opacity:1}100%{transform:rotate(-10deg) scale(1)}}\n@keyframes sxSweep{40%,100%{transform:translateX(100%)}}\n@keyframes jpRise{from{opacity:0;transform:translateY(10px)}}\n@keyframes jpPulse{50%{opacity:.2}}\n@keyframes jpDrop{0%{opacity:0;transform:translateY(-16px) scale(1.04);filter:brightness(2.2)}60%{opacity:1}100%{filter:none}}\n@keyframes jpToast{0%{opacity:0;transform:translate(-50%,10px)}12%,82%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-6px)}}\n@keyframes jpSpin{to{transform:rotate(360deg)}}\n\n:is(.jp,.jp-dk,.sx)[data-sys=\"sim\"]{--s1:#5FE3F0;--s2:#04141c;--sg:rgba(95,227,240,.45);--s3:#FF4D6A}\n:is(.jp,.jp-dk,.sx)[data-sys=\"pts\"]{--s1:#4C9BFF;--s2:#030b1c;--sg:rgba(76,155,255,.45);--s3:#9FF3FF}\n:is(.jp,.jp-dk,.sx)[data-sys=\"hero\"]{--s1:#B994FF;--s2:#0b0718;--sg:rgba(185,148,255,.45);--s3:#FFD36B}\n:is(.jp,.jp-dk,.sx)[data-sys=\"sign\"]{--s1:#E6B562;--s2:#140c04;--sg:rgba(230,181,98,.45);--s3:#FFF0C2}\n:is(.jp,.jp-dk,.sx)[data-sys=\"gacha\"]{--s1:#FFB341;--s2:#0d0a12;--sg:rgba(255,179,65,.42);--s3:#D96BFF}\n:is(.jp,.jp-dk,.sx)[data-sys=\"chat\"]{--s1:#7CF5C8;--s2:#061412;--sg:rgba(124,245,200,.4);--s3:#D8C39A}\n${INFO && INFO.key && !SYS_KEY[GF] && Array.isArray(INFO.色) ? `:is(.jp,.jp-dk,.sx)[data-sys=\"${String(INFO.key).replace(/[^a-z0-9-]/g, '')}\"]{--s1:${INFO.色[0] || '#5FE3F0'};--s2:${INFO.色[1] || '#04141c'};--sg:color-mix(in srgb,${INFO.色[0] || '#5FE3F0'} 45%,transparent);--s3:${INFO.色[2] || '#FFD36B'}}` : ''}\n\n#dl-root .jp [data-tier=\"白\"]{--c1:#F4F1EA;--c2:#A9A291;--cg:rgba(244,241,234,.28)}\n#dl-root .jp [data-tier=\"黄\"]{--c1:#F2D46B;--c2:#C08A17;--cg:rgba(242,212,107,.36)}\n#dl-root .jp [data-tier=\"紫\"]{--c1:#C3A2F2;--c2:#4E2585;--cg:rgba(176,138,224,.44)}\n#dl-root .jp [data-tier=\"红\"]{--c1:#F0565E;--c2:#7A111B;--cg:rgba(224,71,79,.5)}\n#dl-root .jp [data-tier=\"金\"]{--c1:#F6D877;--c2:#B8891F;--cg:rgba(240,207,106,.55)}\n#dl-root .jp [data-tier=\"彩\"]{--c1:#FFE45C;--c2:#6C7BFF;--cg:rgba(255,228,92,.45)}\n#dl-root .jp [data-tier=\"厄\"]{--c1:#A49FB1;--c2:#0A090D;--cg:rgba(0,0,0,.9)}\n#dl-root .jp [data-tier=\"绝\"]{--c1:#E0263B;--c2:#060509;--cg:rgba(150,10,26,.6)}\n\n#dl-root .jp{--tx:#E8ECF2;--tx2:#A9B0BF;--tx3:#687084;--ln:color-mix(in srgb,var(--s1) 16%,transparent);--ln2:color-mix(in srgb,var(--s1) 32%,transparent);--ok:#7BE0A6;--bad:#FF7A86;--warn:#FFC15A;--serif:\"Noto Serif SC\",\"Source Han Serif SC\",\"Songti SC\",\"STSong\",\"SimSun\",serif;--sans:\"Noto Sans SC\",system-ui,-apple-system,\"PingFang SC\",\"Microsoft YaHei\",sans-serif;--mono:\"JetBrains Mono\",\"Cascadia Mono\",Consolas,ui-monospace,monospace;--ease:cubic-bezier(.2,.7,.2,1);--snap:cubic-bezier(.7,0,.2,1);container:jp/inline-size;position:relative;isolation:isolate;min-height:100%;color:var(--tx);background:var(--s2);font:13.5px/1.65 var(--sans);overflow-x:clip;border:1px solid var(--ln)}\n#dl-root .jp *,#dl-root .jp *::before,#dl-root .jp *::after{box-sizing:border-box}\n#dl-root .jp button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}\n#dl-root .jp :focus-visible{outline:1px solid var(--s1);outline-offset:2px}\n#dl-root .jp p{margin:0}#dl-root .jp h4,#dl-root .jp h5{margin:0}\n#dl-root .jp-in>*{animation:jpRise .55s var(--ease) both;animation-delay:calc(var(--i,0) * 60ms)}\n\n#dl-root .jp-lock{padding:8px 16px;font:600 12px/1.5 var(--sans);color:var(--warn);background:rgba(255,193,90,.09);border-bottom:1px solid rgba(255,193,90,.28)}\n#dl-root .jp-caveat{padding:10px 20px 14px;font:11.5px/1.55 var(--sans);color:var(--tx3);border-top:1px solid var(--ln)}\n\n#dl-root .jp-hd{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px 16px;align-items:center;padding:18px 20px 16px;border-bottom:1px solid var(--ln);overflow:hidden}\n#dl-root .jp-hd::before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(80% 140% at 0% 0%,color-mix(in srgb,var(--s1) 18%,transparent),transparent 60%)}\n#dl-root .jp-mark{grid-row:span 2;width:54px;height:54px;color:var(--s1);filter:drop-shadow(0 0 10px var(--sg))}\n#dl-root .jp-mark svg{width:100%;height:100%;overflow:visible}\n#dl-root .jp-nm{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;min-width:0}\n#dl-root .jp-nm b{font:900 22px/1.1 var(--serif);letter-spacing:.16em;color:#fff;text-shadow:0 0 18px var(--sg)}\n#dl-root .jp-nm span{font:600 10.5px/1 var(--mono);letter-spacing:.2em;color:color-mix(in srgb,var(--s1) 75%,#fff)}\n#dl-root .jp .jp-tone-btn{padding:2px 8px;font:600 11px/1.5 var(--sans);color:var(--s1);border:1px solid var(--ln2);background:color-mix(in srgb,var(--s1) 8%,transparent)}\n#dl-root .jp .jp-tone-btn:hover:not([disabled]){border-color:var(--s1)}\n#dl-root .jp .jp-tone-btn[disabled]{opacity:.38;cursor:not-allowed}\n#dl-root .jp-say{grid-column:2/4;min-height:1.65em;color:var(--tx2);font-size:13px}\n#dl-root .jp-say q{quotes:\"「\" \"」\";color:var(--tx)}\n#dl-root .jp-say .cur{display:inline-block;width:.45em;height:1em;margin-left:2px;vertical-align:-.12em;background:var(--s1);animation:sxBlink 1s steps(1) infinite}\n#dl-root .jp-hs{grid-row:1;grid-column:3;display:flex;gap:18px}\n#dl-root .jp-hs div{text-align:right}\n#dl-root .jp-hs b{display:block;font:700 22px/1 var(--mono);color:var(--s1);text-shadow:0 0 12px var(--sg);font-variant-numeric:tabular-nums}\n#dl-root .jp-hs b small{font-size:12px;color:var(--tx3);margin-left:2px}\n#dl-root .jp-hs span{font:600 10px/1.9 var(--mono);letter-spacing:.2em;color:var(--tx3)}\n\n#dl-root .jp-tone{padding:12px 20px 14px;background:rgba(0,0,0,.32);border-bottom:1px solid var(--ln)}\n#dl-root .jp-tone-in{display:flex;flex-direction:column;gap:10px}\n#dl-root .jp-tone-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n#dl-root .jp-tone label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--tx2)}\n#dl-root .jp-tone input,#dl-root .jp-tone textarea{width:100%;padding:7px 10px;font:13px/1.5 var(--sans);color:var(--tx);background:#05060a;border:1px solid var(--ln2);outline:none;border-radius:0}\n#dl-root .jp-tone input:focus,#dl-root .jp-tone textarea:focus{border-color:var(--s1)}\n#dl-root .jp-tone-pre{display:flex;flex-wrap:wrap;gap:6px}\n#dl-root .jp .jp-tone-pre button{padding:4px 10px;font:600 12px/1.4 var(--serif);color:var(--tx2);border:1px solid var(--ln2);background:rgba(255,255,255,.02)}\n#dl-root .jp .jp-tone-pre button[aria-pressed=\"true\"]{color:var(--s2);background:var(--s1);border-color:var(--s1)}\n#dl-root .jp-tone-acts{display:flex;justify-content:flex-end;gap:8px}\n#dl-root .jp .jp-tone-acts .jp-btn{min-height:34px;padding:0 14px;font-size:12px}\n\n#dl-root .jp-sec{position:relative;padding:16px 20px}\n#dl-root .jp-sec+.jp-sec{border-top:1px solid var(--ln)}\n#dl-root .jp-st{display:flex;align-items:center;gap:10px;margin:0 0 12px;font:700 11px/1 var(--mono);letter-spacing:.3em;color:color-mix(in srgb,var(--s1) 80%,#fff)}\n#dl-root .jp-st::before{content:\"\";width:14px;height:2px;background:var(--s1);box-shadow:0 0 6px var(--s1)}\n#dl-root .jp-st::after{content:\"\";flex:1;height:1px;background:linear-gradient(90deg,var(--ln2),transparent)}\n#dl-root .jp-st em{order:2;font-style:normal;font-weight:500;letter-spacing:.12em;color:var(--tx3)}\n#dl-root .jp-none{color:var(--tx3);font-size:12.5px}\n\n#dl-root .jp .jp-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 18px;font:700 13px/1 var(--serif);letter-spacing:.2em;color:var(--s1);border:1px solid var(--ln2);background:color-mix(in srgb,var(--s1) 6%,transparent);clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);transition:background .25s,border-color .25s,color .25s,transform .15s}\n#dl-root .jp .jp-btn:hover:not([disabled]){border-color:var(--s1);background:color-mix(in srgb,var(--s1) 14%,transparent)}\n#dl-root .jp .jp-btn:active:not([disabled]){transform:translateY(1px)}\n#dl-root .jp .jp-btn.pri{color:var(--s2);background:linear-gradient(100deg,color-mix(in srgb,var(--s1) 80%,#fff),var(--s1));border-color:transparent;box-shadow:0 0 18px var(--sg)}\n#dl-root .jp .jp-btn[disabled]{opacity:.38;cursor:not-allowed;filter:saturate(.3)}\n#dl-root .jp .jp-btn svg{width:15px;height:15px}\n#dl-root .jp .jp-seg{display:inline-flex;border:1px solid var(--ln2)}\n#dl-root .jp .jp-seg button{padding:7px 14px;font:600 12px/1 var(--serif);letter-spacing:.16em;color:var(--tx2);transition:background .25s,color .25s}\n#dl-root .jp .jp-seg button[aria-pressed=\"true\"]{color:var(--s2);background:var(--s1)}\n#dl-root .jp-chip{display:inline-flex;align-items:center;gap:5px;padding:2px 7px;font:600 11px/1.5 var(--mono);letter-spacing:.06em;color:var(--tx2);border:1px solid var(--ln2)}\n#dl-root .jp-chip[data-tier]{color:var(--c1);border-color:color-mix(in srgb,var(--c1) 45%,transparent);background:color-mix(in srgb,var(--c1) 8%,transparent)}\n\n#dl-root .jp-tks{display:grid;gap:8px}\n#dl-root .jp-tk{--kc:var(--tx3);position:relative;display:grid;grid-template-columns:26px minmax(0,1fr);background:rgba(255,255,255,.025);border:1px solid var(--ln);overflow:hidden;transition:border-color .3s,background .3s}\n#dl-root .jp-tk[data-c=\"主线\"]{--kc:var(--s1)}\n#dl-root .jp-tk[data-c=\"突发\"]{--kc:#FF9A3D}\n#dl-root .jp-tk:hover{border-color:var(--ln2);background:rgba(255,255,255,.04)}\n#dl-root .jp-tk-k{display:grid;place-items:center;writing-mode:vertical-rl;font:800 11px/1 var(--serif);letter-spacing:.4em;color:var(--s2);background:var(--kc)}\n#dl-root .jp-tk[data-c=\"日常\"] .jp-tk-k{color:var(--tx2);background:rgba(255,255,255,.06)}\n#dl-root .jp-tk[data-c=\"突发\"] .jp-tk-k{background:repeating-linear-gradient(-45deg,#FF9A3D 0 6px,#E07A1C 6px 12px)}\n#dl-root .jp-tk-b{padding:9px 12px 10px;min-width:0}\n#dl-root .jp-tk-t{display:flex;align-items:baseline;gap:10px}\n#dl-root .jp-tk-t b{font:700 14px/1.4 var(--serif);letter-spacing:.06em}\n#dl-root .jp-tk-t time{margin-left:auto;flex:none;font:600 11px/1 var(--mono);color:var(--tx3)}\n#dl-root .jp-tk-t time[data-k=\"soon\"]{color:var(--warn)}\n#dl-root .jp-tk-c{margin-top:3px;color:var(--tx2);font-size:12.5px}\n#dl-root .jp-tk-f{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:7px;font-size:11.5px;color:var(--tx3)}\n#dl-root .jp-tk-f .g{color:var(--tx)}#dl-root .jp-tk-f .g::before{content:\"奖 \";color:var(--kc);font-family:var(--mono)}\n#dl-root .jp-tk-f .l::before{content:\"罚 \";color:var(--bad);font-family:var(--mono)}\n#dl-root .jp-tk[data-s=\"已完成\"],#dl-root .jp-tk[data-s=\"已失败\"]{opacity:.55}\n#dl-root .jp-tk[data-s=\"已完成\"] .jp-tk-t b{text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--ok) 70%,transparent)}\n#dl-root .jp-tk[data-s=\"已失败\"] .jp-tk-t b{text-decoration:line-through;text-decoration-color:var(--bad)}\n#dl-root .jp-tk-stamp{position:absolute;right:12px;bottom:6px;padding:1px 6px;font:900 13px/1.3 var(--serif);letter-spacing:.3em;border:2px solid;transform:rotate(-8deg);opacity:.9}\n#dl-root .jp-tk[data-s=\"已完成\"] .jp-tk-stamp{color:var(--ok)}#dl-root .jp-tk[data-s=\"已失败\"] .jp-tk-stamp{color:var(--bad)}\n\n#dl-root .jp-lg{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}\n#dl-root .jp-rw{position:relative;padding:10px 12px 10px 15px;border:1px solid color-mix(in srgb,var(--c1,#888) 30%,transparent);background:linear-gradient(100deg,color-mix(in srgb,var(--c1,#888) 13%,transparent),transparent 70%),rgba(0,0,0,.25);overflow:hidden}\n#dl-root .jp-rw::before{content:\"\";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--c1,#888);box-shadow:0 0 10px var(--c1,#888)}\n#dl-root .jp-rw[data-tier=\"彩\"]::before{background:linear-gradient(180deg,#FF5A5F,#FFE45C,#5FD88A,#3FC1F0,#D96BFF)}\n#dl-root .jp-rw[data-tier=\"金\"]::after,#dl-root .jp-rw[data-tier=\"彩\"]::after{content:\"\";position:absolute;inset:0;background:linear-gradient(110deg,transparent 40%,rgba(255,240,190,.16) 50%,transparent 60%);background-size:250% 100%;animation:qyShine 4.4s var(--ease) infinite;pointer-events:none}\n#dl-root .jp-rw-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n#dl-root .jp-rw-h b{font:700 14.5px/1.35 var(--serif);color:#fff}\n#dl-root .jp-rw-t{flex:none;padding:1px 5px;font:800 10.5px/1.4 var(--mono);color:#0b0c10;background:var(--c1,#888)}\n#dl-root .jp-rw[data-tier=\"彩\"] .jp-rw-t{background:linear-gradient(90deg,#FF5A5F,#FFE45C,#3FC1F0,#D96BFF)}\n#dl-root .jp-rw-x{margin-left:auto;flex:none;padding:1px 6px;font:700 10.5px/1.4 var(--mono);letter-spacing:.08em;color:var(--s3);border:1px solid color-mix(in srgb,var(--s3) 55%,transparent);text-shadow:0 0 6px var(--s3)}\n#dl-root .jp-rw p{margin-top:4px;color:var(--tx2);font-size:12px}\n#dl-root .jp-rw-f{display:flex;align-items:center;gap:10px;margin-top:7px;font:600 10.5px/1 var(--mono);color:var(--tx3);letter-spacing:.06em;flex-wrap:wrap}\n#dl-root .jp-rw-f .to{color:var(--tx)}#dl-root .jp-rw-f .to::before{content:\"→ \";color:var(--c1,#888)}\n#dl-root .jp-rw-f .wait{margin-left:auto;display:inline-flex;align-items:center;gap:5px;color:var(--warn)}\n#dl-root .jp-rw-f .wait::before{content:\"\";width:5px;height:5px;background:var(--warn);animation:jpPulse 1.4s ease-in-out infinite}\n#dl-root .jp-rw.new{animation:jpDrop .7s var(--snap) both}\n#dl-root .jp-log{display:grid;gap:2px;margin-top:10px;padding:0;margin-bottom:0;font-size:12px;color:var(--tx3)}\n#dl-root .jp-log li{display:flex;gap:10px;list-style:none}\n#dl-root .jp-log b{font-weight:500;color:var(--tx2)}#dl-root .jp-log time{margin-left:auto;font-family:var(--mono)}\n\n#dl-root .jp-toast{position:absolute;left:50%;bottom:14px;z-index:30;max-width:calc(100% - 32px);padding:9px 16px;font:600 13px/1.4 var(--serif);letter-spacing:.06em;color:var(--s2);background:var(--s1);box-shadow:0 0 24px var(--sg);transform:translateX(-50%);animation:jpToast 2.6s var(--ease) both;pointer-events:none}\n#dl-root .jp-spark{position:absolute;z-index:25;width:4px;height:4px;background:var(--c,#fff);box-shadow:0 0 6px var(--c,#fff);pointer-events:none}\n\n#dl-root .jp-dk{display:inline-flex;align-items:center;gap:5px;padding:2px 6px;font:700 12px/1 ui-monospace,Consolas,monospace;color:var(--s1);font-variant-numeric:tabular-nums;background:transparent;border:0;cursor:pointer;white-space:nowrap}\n#dl-root .jp-dk svg{width:15px;height:15px;flex:none;filter:drop-shadow(0 0 4px var(--sg))}\n#dl-root .jp-dk small{font-weight:500;color:var(--dl-ink3,#7a8090)}\n#dl-root .jp-dk[data-k=\"dim\"]{color:var(--dl-ink3,#7a8090)}\n#dl-root .jp-dk[data-k=\"hot\"] svg{animation:jpPulse 1.6s ease-in-out infinite}\n#dl-root .jp-dk .dot{width:6px;height:6px;background:var(--s3);box-shadow:0 0 6px var(--s3)}\n\n/* ── 正文 <系统> 标签六套皮肤 ── */\n[data-dlp-theme] .sx{position:relative;max-width:560px;margin:16px auto;padding:14px 18px 16px;font:14.5px/1.75 var(--dlp-sans,system-ui,sans-serif);color:#E8ECF2;background:var(--s2);border:1px solid color-mix(in srgb,var(--s1) 45%,transparent);isolation:isolate;overflow:hidden;--dlp-on:#E8ECF2;--dlp-on2:#A9B0BF}\n[data-dlp-theme] .sx-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px}\n[data-dlp-theme] .sx-ding{font:900 15px/1 var(--dlp-serif,serif);letter-spacing:.3em;color:var(--s1)}\n[data-dlp-theme] .sx-nm{font:700 13px/1 var(--dlp-serif,serif);letter-spacing:.2em;color:#fff}\n[data-dlp-theme] .sx-k{margin-left:auto;padding:4px 8px;font:600 11px/1 ui-monospace,Consolas,monospace;letter-spacing:.2em;color:var(--s2);background:var(--s1)}\n[data-dlp-theme] .qt-sx-t{margin:0 0 4px;font:800 15px/1.4 var(--dlp-serif,serif);letter-spacing:.1em;color:#fff}\n[data-dlp-theme] .qt-sx[data-cat=\"警告\"] .sx-k{background:#FF7A86!important;color:#1a0508!important}\n[data-dlp-theme] .qt-sx[data-cat=\"任务失败\"] .sx-k{background:#6f7689!important;color:#fff!important}\n[data-dlp-theme] .sx-line{margin:4px 0 0;min-height:1.5em}\n[data-dlp-theme] .sx.in{animation:sxIn .7s var(--gf-t,0s) cubic-bezier(.7,0,.2,1) both}\n[data-dlp-theme] .sx[data-sys=\"sim\"]{background:linear-gradient(180deg,rgba(8,40,52,.9),rgba(3,16,22,.94)),var(--s2);border-color:rgba(95,227,240,.55);box-shadow:0 0 24px rgba(95,227,240,.16),inset 0 0 30px rgba(95,227,240,.08)}\n[data-dlp-theme] .sx[data-sys=\"sim\"]::before{content:\"\";position:absolute;inset:0;z-index:-1;background:repeating-linear-gradient(0deg,rgba(95,227,240,.06) 0 1px,transparent 1px 3px)}\n[data-dlp-theme] .sx[data-sys=\"sim\"]::after{content:\"\";position:absolute;left:0;right:0;top:-30%;height:30%;background:linear-gradient(180deg,transparent,rgba(95,227,240,.14),transparent);animation:sxScan 3.2s linear infinite;pointer-events:none}\n[data-dlp-theme] .sx[data-sys=\"sim\"] .sx-nm::before{content:\"◇ \";color:var(--s1)}\n[data-dlp-theme] .sx[data-sys=\"sim\"].in{animation:sxGlitch .6s var(--gf-t,0s) steps(6) both}\n[data-dlp-theme] .sx[data-sys=\"pts\"]{padding-left:26px;background:linear-gradient(100deg,rgba(10,36,84,.95),rgba(3,11,28,.96));border-color:rgba(76,155,255,.5);font-family:ui-monospace,Consolas,monospace;font-size:13.5px}\n[data-dlp-theme] .sx[data-sys=\"pts\"]::before{content:\"\";position:absolute;left:9px;top:12px;bottom:12px;width:4px;background:repeating-linear-gradient(180deg,var(--s1) 0 3px,transparent 3px 7px);opacity:.7;animation:sxFlowY 1.2s linear infinite}\n[data-dlp-theme] .sx[data-sys=\"pts\"] .sx-ding{font-family:ui-monospace,Consolas,monospace;letter-spacing:.1em}\n[data-dlp-theme] .sx[data-sys=\"hero\"]{background:radial-gradient(60% 90% at 85% 0%,rgba(185,148,255,.28),transparent 70%),radial-gradient(1px 1px at 20% 30%,#fff8,transparent),radial-gradient(1px 1px at 70% 60%,#fff6,transparent),radial-gradient(1px 1px at 40% 80%,#fff7,transparent),linear-gradient(180deg,#120b26,#07040f);border:1px solid rgba(255,211,107,.45);border-top:2px solid var(--s3)}\n[data-dlp-theme] .sx[data-sys=\"hero\"] .sx-ding{color:var(--s3)}\n[data-dlp-theme] .sx[data-sys=\"hero\"] .sx-k{background:linear-gradient(90deg,var(--s3),var(--s1))}\n[data-dlp-theme] .sx[data-sys=\"hero\"]::after{content:\"\";position:absolute;right:-40px;top:-40px;width:120px;height:120px;border:1px solid rgba(255,211,107,.25);transform:rotate(45deg);box-shadow:0 0 0 10px rgba(185,148,255,.06),0 0 0 22px rgba(185,148,255,.04);animation:sxTurn 18s linear infinite;z-index:-1}\n[data-dlp-theme] .sx[data-sys=\"sign\"]{background:linear-gradient(135deg,rgba(230,181,98,.10),transparent 40%),linear-gradient(180deg,#24160a,#130b04);border:1px solid #8a6328;box-shadow:inset 0 0 0 3px #130b04,inset 0 0 0 4px rgba(230,181,98,.5)}\n[data-dlp-theme] .sx[data-sys=\"sign\"] .sx-ding,[data-dlp-theme] .sx[data-sys=\"sign\"] .sx-nm{color:var(--s3)}\n[data-dlp-theme] .sx[data-sys=\"sign\"] .sx-k{color:#2a1808;background:linear-gradient(180deg,#F4D28E,#B9852F)}\n[data-dlp-theme] .sx[data-sys=\"sign\"]::after{content:\"签\";position:absolute;right:14px;bottom:10px;z-index:-1;display:grid;place-items:center;width:46px;height:46px;font:900 26px/1 var(--dlp-serif,serif);color:rgba(230,181,98,.22);border:2px solid rgba(230,181,98,.22);transform:rotate(-10deg)}\n[data-dlp-theme] .sx[data-sys=\"sign\"].in::after{animation:sxStamp .7s .25s cubic-bezier(.7,0,.2,1) both}\n[data-dlp-theme] .sx[data-sys=\"gacha\"]{padding-top:18px;background:linear-gradient(180deg,#1a1222,#0b0810);border-color:rgba(255,179,65,.4)}\n[data-dlp-theme] .sx[data-sys=\"gacha\"]::before{content:\"\";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#F4F1EA 0 16.6%,#F2D46B 0 33.3%,#C3A2F2 0 50%,#F0565E 0 66.6%,#F6D877 0 83.3%,transparent 0),conic-gradient(from var(--qa,0deg),#FF5A5F,#FFE45C,#3FC1F0,#D96BFF,#FF5A5F);animation:qyHue 4s linear infinite}\n[data-dlp-theme] .sx[data-sys=\"gacha\"]::after{content:\"\";position:absolute;inset:0;z-index:-1;background:linear-gradient(100deg,transparent 35%,rgba(255,236,190,.12),transparent 65%);transform:translateX(-100%);animation:sxSweep 3.4s cubic-bezier(.2,.7,.2,1) infinite}\n[data-dlp-theme] .sx[data-sys=\"chat\"]{background:linear-gradient(180deg,#0c201d,#061210);border-color:rgba(124,245,200,.4);border-left:3px solid var(--s1)}\n[data-dlp-theme] .sx[data-sys=\"chat\"] .sx-ding{font-size:13px;letter-spacing:.1em}\n\n@container jp (max-width:560px){\n  #dl-root .jp-hd{grid-template-columns:auto minmax(0,1fr);padding:14px 16px 12px}\n  #dl-root .jp-hs{grid-column:1/-1;grid-row:auto;justify-content:flex-start;gap:22px;padding-top:6px}\n  #dl-root .jp-hs div{text-align:left}\n  #dl-root .jp-say{grid-column:1/-1}\n  #dl-root .jp-mark{width:44px;height:44px;grid-row:span 1}\n  #dl-root .jp-nm b{font-size:19px}\n  #dl-root .jp-sec{padding:14px 16px}\n  #dl-root .jp-lg{grid-template-columns:1fr}\n  #dl-root .jp-st{flex-wrap:wrap;row-gap:5px;white-space:nowrap}\n  #dl-root .jp-st em{order:3;flex:1 0 100%;padding-left:24px;font-size:10px;letter-spacing:.06em;white-space:normal}\n  #dl-root .jp-tone-row{grid-template-columns:1fr}\n}\n#dl-root[data-motion=\"off\"] .jp *,#dl-root[data-motion=\"off\"] .jp *::before,#dl-root[data-motion=\"off\"] .jp *::after,#dl-root[data-motion=\"off\"] .jp-dk svg,[data-dlp-motion=\"off\"] .sx,[data-dlp-motion=\"off\"] .sx *,[data-dlp-motion=\"off\"] .sx::before,[data-dlp-motion=\"off\"] .sx::after{animation:none!important;transition:none!important}\n#dl-root[data-motion=\"reduced\"] .jp-rw::after,#dl-root[data-motion=\"reduced\"] .jp-say .cur,#dl-root[data-motion=\"reduced\"] .jp-dk[data-k=\"hot\"] svg,[data-dlp-motion=\"reduced\"] .sx::before,[data-dlp-motion=\"reduced\"] .sx::after{animation:none!important}\n@media (prefers-reduced-motion:reduce){#dl-root .jp *,#dl-root .jp *::before,#dl-root .jp *::after,#dl-root .jp-dk svg,[data-dlp-theme] .sx,[data-dlp-theme] .sx *,[data-dlp-theme] .sx::before,[data-dlp-theme] .sx::after{animation:none!important;transition:none!important}}\n`;\n\n  return {\n    GF, INFO, BRIDGE, CSS, TIER, esc, gfOf, mine, dayNo, daysTo, short, year, tierIn,\n    motionOf, still, frag, typeIn, roll, burst, toast, disabled, act, syncBar,\n    lockBanner, caveat, head, bindToneEditor, tasks, rewardCard, ledger, swap, dockMark,\n    parseBlock, systemBlock,\n  };\n}\n\n/* 系统页 · 深蓝加点（金手指.加点）\n * 深海蓝：声呐盘扫过面板各项（越接近突破越靠近中心），点数上滚、气泡上浮；升层水压冲击；魂环瓶颈与兽身十万年锁停。\n */\nfunction DLGF_PAGE_深蓝加点(GF, INFO, BRIDGE, U) {\n  const CATS = ['修为', '体魄', '精神', '魂技', '技艺'];\n  const ANG = { 修为: 0, 体魄: 72, 精神: 144, 魂技: 216, 技艺: 288 };\n  const SWEEP = 4.2;\n  const iconPath = '<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"12\" cy=\"12\" r=\"4.5\"/><path d=\"M12 12 18 6\"/><circle cx=\"12\" cy=\"12\" r=\"1\" fill=\"currentColor\"/>';\n  const mark = `<svg viewBox=\"-30 -30 60 60\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\">\n    <circle r=\"26\" opacity=\".5\"/><circle r=\"17\" opacity=\".35\"/><circle r=\"8\" opacity=\".3\"/>\n    <g class=\"pts-mk-sw\"><path d=\"M0 0 L0 -26 A26 26 0 0 1 18.4 -18.4 Z\" fill=\"currentColor\" stroke=\"none\" opacity=\".35\"/><path d=\"M0 0V-26\"/></g>\n    <circle cx=\"9\" cy=\"-12\" r=\"1.8\" fill=\"currentColor\" stroke=\"none\" class=\"pts-mk-b\"/>\n  </svg>`;\n\n  const lockOf = (name, it, S) => (BRIDGE.data && typeof BRIDGE.data.lockOf === 'function' ? BRIDGE.data.lockOf(name, it, S) : null);\n  const costOf = (name, it, S) => (BRIDGE.data && typeof BRIDGE.data.costOf === 'function' ? BRIDGE.data.costOf(name, it, S) : 10);\n  const fmtPct = (p) => {\n    const n = Number(p) || 0;\n    if (n > 0 && n < 1) return n.toFixed(1);\n    return String(Math.floor(n));\n  };\n\n  function sonar(A) {\n    const items = Object.entries(A.面板 || {});\n    const per = {}; items.forEach(([, it]) => { per[it.类别] = (per[it.类别] || 0) + 1; });\n    const seen = {};\n    const blips = items.map(([n, it]) => {\n      const k = seen[it.类别] = (seen[it.类别] || 0) + 1;\n      const a = (ANG[it.类别] || 0) + (k - (per[it.类别] + 1) / 2) * 22;\n      const r = 84 - (Number(it.进度) || 0) * 0.62;\n      const rad = (a - 90) * Math.PI / 180;\n      const x = (Math.cos(rad) * r).toFixed(1), y = (Math.sin(rad) * r).toFixed(1);\n      const d = (((a % 360) + 360) % 360) / 360 * SWEEP;\n      return `<g class=\"pts-bl\" data-n=\"${U.esc(n)}\" transform=\"translate(${x} ${y})\" style=\"--d:${d.toFixed(2)}s\"><circle r=\"7\" class=\"pg\"/><circle r=\"2.6\" class=\"pd\"/></g>`;\n    }).join('');\n    const labels = CATS.map((c) => {\n      const rad = (ANG[c] - 90) * Math.PI / 180;\n      return `<text x=\"${(Math.cos(rad) * 104).toFixed(1)}\" y=\"${(Math.sin(rad) * 104 + 3).toFixed(1)}\">${c}</text>`;\n    }).join('');\n    return `<svg class=\"pts-sonar\" viewBox=\"-120 -120 240 240\" aria-hidden=\"true\">\n      <defs><radialGradient id=\"dl-pts-rg\"><stop offset=\"0\" stop-color=\"#4C9BFF\" stop-opacity=\".18\"/><stop offset=\"1\" stop-color=\"#4C9BFF\" stop-opacity=\"0\"/></radialGradient>\n      <linearGradient id=\"dl-pts-sw\" x1=\"0\" y1=\"1\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#9FF3FF\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#9FF3FF\" stop-opacity=\".55\"/></linearGradient></defs>\n      <circle r=\"92\" fill=\"url(#dl-pts-rg)\"/>\n      ${[30, 60, 92].map((r) => `<circle r=\"${r}\" class=\"ring\"/>`).join('')}\n      ${CATS.map((c) => { const rad = (ANG[c] - 90) * Math.PI / 180; return `<line x2=\"${(Math.cos(rad) * 92).toFixed(1)}\" y2=\"${(Math.sin(rad) * 92).toFixed(1)}\" class=\"sp\"/>`; }).join('')}\n      <g class=\"sweep\" style=\"--t:${SWEEP}s\"><path d=\"M0 0 L0 -92 A92 92 0 0 1 65 -65 Z\" fill=\"url(#dl-pts-sw)\"/><line y2=\"-92\" class=\"beam\"/></g>\n      ${blips}${labels}\n      <circle r=\"3\" class=\"core\"/>\n    </svg>`;\n  }\n\n  function row(name, it, S, avail, pageLock) {\n    const lk = lockOf(name, it, S);\n    const capped = !!(lk && it.进度 >= 100);\n    const need = costOf(name, it, S);\n    const dis = !!pageLock || avail < 1 || capped;\n    return `<li class=\"pts-r\" data-n=\"${U.esc(name)}\" data-cat=\"${U.esc(it.类别)}\"${capped ? ' data-lock=\"1\"' : ''} style=\"--p:${Number(it.进度) || 0}\">\n      <div class=\"pts-r-n\"><b>${U.esc(name)}</b><span>${U.esc(it.层次)} · 需 ${need} 点</span></div>\n      <div class=\"pts-g\" role=\"meter\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"${Math.floor(it.进度 || 0)}\" aria-label=\"${U.esc(name)} 进度\"><i class=\"f\"></i>${Array.from({ length: 19 }, (_, i) => `<i class=\"t\" style=\"left:${(i + 1) * 5}%\"></i>`).join('')}${lk ? `<em class=\"lk\" title=\"${U.esc(lk.说明)}\">瓶颈</em>` : ''}</div>\n      <span class=\"pts-r-p\"><b>${fmtPct(it.进度)}</b>%</span>\n      <span class=\"pts-r-i\">投入 <b>${it.投入 || 0}</b></span>\n      <span class=\"pts-r-b\"><button type=\"button\" class=\"pts-add\" data-v=\"1\" ${dis ? 'disabled' : ''} aria-label=\"给 ${U.esc(name)} 加 1 点\">+1</button><button type=\"button\" class=\"pts-add\" data-v=\"5\" ${dis ? 'disabled' : ''} aria-label=\"给 ${U.esc(name)} 加 5 点\">+5</button></span>\n      ${capped ? `<p class=\"pts-r-lock\">${U.esc(lk.说明)}</p>` : ''}\n    </li>`;\n  }\n\n  function board(A, S, pageLock) {\n    const items = Object.entries(A.面板 || {});\n    const full = items.length >= 24;\n    const avail = Number(A.可用) || 0;\n    return `<section class=\"jp-sec pts-bd\" data-part=\"board\">\n      <div class=\"pts-bd-hd\">\n        <h5 class=\"jp-st\">面板<em>${items.length}/24 项 · 七层表 10→1500 · 魂力按级递增</em></h5>\n        ${!pageLock && !full ? '<button type=\"button\" class=\"jp-btn pts-new-btn\" data-new-open>+ 新添一项</button>' : ''}\n      </div>\n      <div class=\"pts-new\" hidden>\n        <input class=\"jp-in\" data-new-name maxlength=\"20\" placeholder=\"项名（如 鬼影迷踪、乱披风锤法）\">\n        <select class=\"jp-in\" data-new-cat>${CATS.map((c) => `<option value=\"${c}\">${c}</option>`).join('')}</select>\n        <button type=\"button\" class=\"jp-btn pri\" data-new-save>加入面板</button>\n        <button type=\"button\" class=\"jp-btn\" data-new-cancel>取消</button>\n      </div>\n      ${CATS.filter((c) => items.some(([, it]) => it.类别 === c)).map((c) => `<div class=\"pts-cat\"><h6>${c}</h6><ol>${items.filter(([, it]) => it.类别 === c).map(([n, it]) => row(n, it, S, avail, pageLock)).join('')}</ol></div>`).join('') || '<p class=\"jp-none\">暂无可加点项。</p>'}\n    </section>`;\n  }\n\n  function say(G) {\n    const A = G.加点 || {}, c = (G.口吻 && G.口吻.称呼) || '宿主';\n    const near = Object.entries(A.面板 || {}).filter(([, it]) => (it.进度 || 0) >= 80).map(([n]) => n);\n    return `${c}当前有 ${A.可用 || 0} 点可用。${near.length ? `接近突破：${near.slice(0, 2).join('、')}。` : '修炼、实战与完成任务都会折算成点数。'}`;\n  }\n\n  function page(S, kit) {\n    const G = S.金手指;\n    if (!G || G.类型 !== '深蓝加点' || !G.加点) return null;\n    const A = G.加点;\n    const lock = U.disabled(kit);\n    const el = U.frag(`<div class=\"jp jp-in\" data-sys=\"pts\" data-motion=\"${U.motionOf(kit)}\">\n      <div class=\"pts-bub\" aria-hidden=\"true\">${Array.from({ length: 14 }, (_, i) => `<i style=\"--x:${(i * 37) % 100}%;--s:${4 + (i % 4) * 2}px;--d:${(i * 0.9) % 7}s;--t:${7 + (i % 5)}s\"></i>`).join('')}</div>\n      ${U.head(G, { mark, stats: [{ k: 'cum', v: A.累计 || 0, label: '累计点数' }] }, kit)}\n      ${U.lockBanner(lock)}\n      <section class=\"jp-sec pts-top\">\n        <div class=\"pts-sn-wrap\" data-part=\"sonar\">${sonar(A)}</div>\n        <div class=\"pts-pool\">\n          <span class=\"pts-pool-k\">可用点数</span>\n          <b class=\"pts-pool-n\" data-k=\"pool\">${A.可用 || 0}</b>\n          <p class=\"pts-pool-d\">下潜深度 <b data-k=\"depth\">${(A.累计 || 0) * 10}</b> m</p>\n          <p class=\"pts-pool-h\">修炼、实战、完成任务会换来点数；${U.esc((G.口吻 && G.口吻.名字) || '深蓝')}单轮至多发 30 点，突破后记入待入账由正文落地。</p>\n        </div>\n      </section>\n      ${board(A, S, lock)}\n      ${U.tasks(G, S)}\n      ${U.ledger(G)}\n      ${U.caveat()}\n    </div>`);\n    [...el.children].forEach((c, i) => c.style.setProperty('--i', String(i)));\n    U.bindToneEditor(el, G, kit);\n    bind(el, S, kit);\n    setTimeout(() => U.typeIn(el.querySelector('.jp-say'), say(G), kit), 120);\n    return el;\n  }\n\n  function bind(el, initialS, kit) {\n    let curS = initialS;\n    let busy = false;\n    el.addEventListener('click', async (e) => {\n      const openBtn = e.target.closest('[data-new-open]');\n      if (openBtn) {\n        const f = el.querySelector('.pts-new');\n        if (f) { f.hidden = !f.hidden; if (!f.hidden) { const inp = f.querySelector('[data-new-name]'); if (inp) inp.focus(); } }\n        return;\n      }\n      if (e.target.closest('[data-new-cancel]')) {\n        const f = el.querySelector('.pts-new'); if (f) f.hidden = true;\n        return;\n      }\n      if (e.target.closest('[data-new-save]')) {\n        if (busy) return;\n        const lock = U.disabled(kit);\n        if (lock) { U.toast(el, lock); return; }\n        const f = el.querySelector('.pts-new');\n        const 项名 = f.querySelector('[data-new-name]').value.trim();\n        const 类别 = f.querySelector('[data-new-cat]').value;\n        busy = true;\n        try {\n          const r = await U.act('加新项', { 项名, 类别 });\n          if (!r || !r.ok) { U.toast(el, (r && r.why) || '添加失败'); return; }\n          U.toast(el, `已加入面板：${r.项名}`);\n        } finally { busy = false; }\n        return;\n      }\n\n      const b = e.target.closest('.pts-add');\n      if (!b || busy) return;\n      const lock = U.disabled(kit);\n      if (lock) { U.toast(el, lock); return; }\n      const li = b.closest('.pts-r');\n      const name = li && li.dataset.n;\n      const avail = Number(curS && curS.金手指 && curS.金手指.加点 && curS.金手指.加点.可用) || 0;\n      const v = Math.min(Number(b.dataset.v) || 1, avail);\n      if (v <= 0) { U.toast(el, '没有可用点数了'); return; }\n\n      busy = true;\n      const still = U.still(kit);\n      try {\n        const r = await U.act('加点', { 项: name, 点: v }, { deferRefresh: true });\n        if (!r || !r.ok) {\n          U.toast(el, (r && r.why) || '加点失败');\n          if (r && r.lock && !still) shake(li);\n          return;\n        }\n        curS = r.stat || curS;\n        const nextG = curS.金手指, nextA = nextG.加点;\n        const nu = U.frag(row(name, r.it, curS, nextA.可用, null));\n        li.replaceWith(nu);\n        if (nextA.可用 < 1) el.querySelectorAll('.pts-add').forEach((btn) => { btn.disabled = true; });\n        U.roll(el.querySelector('[data-k=\"pool\"]'), nextA.可用, kit, 420);\n        U.roll(el.querySelector('[data-k=\"depth\"]'), (nextA.累计 || 0) * 10, kit, 420);\n        const cum = el.querySelector('[data-k=\"cum\"]');\n        if (cum) U.roll(cum, nextA.累计 || 0, kit, 420);\n        const snWrap = el.querySelector('[data-part=\"sonar\"]');\n        if (snWrap) snWrap.innerHTML = sonar(nextA);\n        const bl = el.querySelector(`.pts-bl[data-n=\"${CSS.escape(name)}\"]`);\n        if (bl && !still) { bl.classList.remove('hit'); try { void bl.getBBox(); } catch (_) {} bl.classList.add('hit'); }\n        bubbles(el, nu.querySelector('.pts-add'), kit);\n        if (r.升) {\n          shock(el, nu, kit);\n          U.toast(el, `${name}突破 → ${r.it.层次}（已进待入账）`);\n          U.swap(el, 'ledger', U.ledger(nextG, 1));\n          U.typeIn(el.querySelector('.jp-say'), `${name}突破至${r.it.层次}，突破记录已入待入账。`, kit);\n        } else if (r.卡) {\n          if (!still) shake(nu);\n          U.toast(el, r.卡.说明);\n        }\n        setTimeout(() => U.syncBar(), still ? 0 : 650);\n      } finally {\n        busy = false;\n      }\n    });\n  }\n\n  function bubbles(el, from, kit) {\n    if (U.still(kit) || !from) return;\n    const host = el.getBoundingClientRect(), b = from.getBoundingClientRect();\n    for (let i = 0; i < 6; i += 1) {\n      const s = document.createElement('i'); s.className = 'pts-pop';\n      const sz = 3 + Math.random() * 5; s.style.width = s.style.height = sz + 'px';\n      s.style.left = (b.left - host.left + b.width / 2 + (Math.random() - 0.5) * 20) + 'px';\n      s.style.top = (b.top - host.top) + 'px';\n      el.appendChild(s);\n      if (s.animate) {\n        s.animate([{ transform: 'translateY(0)', opacity: 0.9 }, { transform: `translate(${(Math.random() - 0.5) * 30}px, ${-40 - Math.random() * 50}px)`, opacity: 0 }], { duration: 850 + Math.random() * 450, easing: 'ease-out' }).onfinish = () => s.remove();\n      } else { s.remove(); }\n    }\n  }\n  function shock(el, li, kit) {\n    if (U.still(kit)) return;\n    el.classList.remove('pts-shock'); void el.offsetWidth; el.classList.add('pts-shock');\n    const host = el.getBoundingClientRect(), r = li.getBoundingClientRect();\n    const ring = document.createElement('i'); ring.className = 'pts-ring';\n    ring.style.left = (r.left - host.left + r.width / 2) + 'px'; ring.style.top = (r.top - host.top + r.height / 2) + 'px';\n    el.appendChild(ring);\n    setTimeout(() => ring.remove(), 1150);\n    setTimeout(() => el.classList.remove('pts-shock'), 650);\n  }\n  function shake(li) {\n    if (li && li.animate) li.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'none' }], { duration: 340 });\n  }\n\n  function dock(S, kit) {\n    const G = S && S.金手指;\n    if (!G || G.类型 !== '深蓝加点' || !G.加点) return null;\n    const avail = Number(G.加点.可用) || 0;\n    return U.dockMark('pts', iconPath, `+${avail}`, avail > 0 ? 'hot' : 'dim', `深蓝加点 · 可用 ${avail} 点`, kit, INFO.页签);\n  }\n\n  const pageCss = `\n#dl-root .jp[data-sys=\"pts\"]{background:linear-gradient(180deg,#06173a 0%,#030b1c 45%,#01050e 100%)}\n#dl-root .pts-bub{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none}\n#dl-root .pts-bub i{position:absolute;left:var(--x);bottom:-20px;width:var(--s);height:var(--s);border:1px solid rgba(159,243,255,.35);border-radius:50%;animation:ptsRise var(--t) linear infinite;animation-delay:calc(var(--d) * -1)}\n@keyframes ptsRise{to{transform:translate(12px,-110vh)}}\n#dl-root .pts-mk-sw{transform-origin:0 0;animation:jpSpin 4.2s linear infinite}\n#dl-root .pts-mk-b{animation:jpPulse 4.2s ease-in-out infinite}\n#dl-root .pts-top{display:grid;grid-template-columns:220px 1fr;gap:22px;align-items:center}\n#dl-root .pts-sonar{width:100%;height:auto;overflow:visible;display:block}\n#dl-root .pts-sonar .ring{fill:none;stroke:rgba(76,155,255,.28)}\n#dl-root .pts-sonar .sp{stroke:rgba(76,155,255,.16);stroke-dasharray:2 4}\n#dl-root .pts-sonar .sweep{transform-origin:0 0;animation:jpSpin var(--t) linear infinite}\n#dl-root .pts-sonar .beam{stroke:#9FF3FF;stroke-width:1.2;filter:drop-shadow(0 0 4px #9FF3FF)}\n#dl-root .pts-sonar .core{fill:#9FF3FF}\n#dl-root .pts-sonar text{font:700 10px var(--serif);fill:rgba(159,243,255,.7);text-anchor:middle;letter-spacing:.1em}\n#dl-root .pts-bl .pd{fill:#9FF3FF;animation:ptsDot 4.2s linear infinite;animation-delay:var(--d)}\n#dl-root .pts-bl .pg{fill:#9FF3FF;opacity:0;animation:ptsBlip 4.2s linear infinite;animation-delay:var(--d)}\n@keyframes ptsBlip{0%{opacity:.6;transform:scale(.4)}30%{opacity:0;transform:scale(1.6)}100%{opacity:0}}\n@keyframes ptsDot{0%{opacity:1;filter:drop-shadow(0 0 4px #9FF3FF)}60%{opacity:.35}100%{opacity:.35}}\n#dl-root .pts-bl.hit .pd{animation:ptsHit .9s ease-out}\n@keyframes ptsHit{0%{fill:#fff;transform:scale(2.4)}100%{transform:scale(1)}}\n#dl-root .pts-pool-k{font:700 11px/1 var(--mono);letter-spacing:.26em;color:rgba(159,243,255,.72)}\n#dl-root .pts-pool-n{display:block;margin:6px 0 2px;font:800 58px/1 var(--mono);color:#fff;text-shadow:0 0 22px rgba(76,155,255,.8),0 0 2px #9FF3FF;font-variant-numeric:tabular-nums;letter-spacing:-.02em}\n#dl-root .pts-pool-d{margin:0;font:600 12px/1.6 var(--mono);color:rgba(244,239,230,.72)}\n#dl-root .pts-pool-d b{color:#9FF3FF}\n#dl-root .pts-pool-h{margin:8px 0 0;font-size:12px;color:rgba(244,239,230,.54);max-width:32em}\n#dl-root .pts-bd-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}\n#dl-root .pts-bd-hd .jp-st{margin:0;flex:1}\n#dl-root .pts-new-btn{height:26px;padding:0 10px;font-size:11.5px}\n#dl-root .pts-new{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px;padding:8px 10px;border:1px solid rgba(76,155,255,.28);border-radius:3px;background:rgba(6,20,48,.7)}\n#dl-root .pts-new[hidden]{display:none}\n#dl-root .pts-new input{flex:1;min-width:140px}\n#dl-root .pts-new select{width:88px}\n#dl-root .pts-cat+.pts-cat{margin-top:14px}\n#dl-root .pts-cat h6{margin:0 0 6px;font:800 12px/1 var(--serif);letter-spacing:.36em;color:#9FF3FF}\n#dl-root .pts-cat ol{display:grid;gap:4px;margin:0;padding:0;list-style:none}\n#dl-root .pts-r{position:relative;display:grid;grid-template-columns:minmax(124px,1.15fr) minmax(110px,2fr) 46px 62px auto;gap:10px;align-items:center;padding:7px 10px;background:rgba(76,155,255,.04);border:1px solid rgba(76,155,255,.14);border-radius:3px;transition:background .25s,border-color .25s}\n#dl-root .pts-r:hover{background:rgba(76,155,255,.09);border-color:rgba(76,155,255,.32)}\n#dl-root .pts-r-n b{display:block;font:700 13px/1.3 var(--serif);color:#fff}\n#dl-root .pts-r-n span{font:500 10.5px/1.4 var(--mono);color:rgba(244,239,230,.68)}\n#dl-root .pts-g{position:relative;height:12px;background:#020814;border:1px solid rgba(76,155,255,.32);overflow:hidden;border-radius:2px}\n#dl-root .pts-g .f{position:absolute;left:0;top:0;bottom:0;width:calc(var(--p) * 1%);background:linear-gradient(90deg,#1E4FA8,#4C9BFF 70%,#9FF3FF);box-shadow:0 0 10px rgba(76,155,255,.6);transition:width .5s cubic-bezier(.2,.7,.2,1)}\n#dl-root .pts-g .f::after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);background-size:40% 100%;background-repeat:no-repeat;animation:ptsFlow 2.4s linear infinite}\n@keyframes ptsFlow{from{background-position:-40% 0}to{background-position:140% 0}}\n#dl-root .pts-g .t{position:absolute;top:0;bottom:0;width:1px;background:rgba(3,11,28,.8)}\n#dl-root .pts-g .lk{position:absolute;right:0;top:-1px;bottom:-1px;padding:0 5px;font:700 9.5px/12px var(--mono);font-style:normal;letter-spacing:.08em;color:#fff;background:repeating-linear-gradient(-45deg,#7a2a3c 0 4px,#4a1626 4px 8px)}\n#dl-root .pts-r[data-lock] .pts-g{border-color:#FF7A86}\n#dl-root .pts-r[data-lock] .pts-g .f{background:linear-gradient(90deg,#1E4FA8,#4C9BFF 60%,#FF7A86)}\n#dl-root .pts-r-p{font:700 12px/1 var(--mono);color:rgba(244,239,230,.72);text-align:right}#dl-root .pts-r-p b{color:#9FF3FF}\n#dl-root .pts-r-i{font:500 11px/1 var(--mono);color:rgba(244,239,230,.52)}#dl-root .pts-r-i b{color:#fff}\n#dl-root .pts-r-b{display:inline-flex;gap:3px}\n#dl-root .pts-add{min-width:34px;height:28px;font:700 12px/1 var(--mono);color:#9FF3FF;border:1px solid rgba(76,155,255,.45);border-radius:3px;background:rgba(76,155,255,.08);cursor:pointer;transition:background .2s,color .2s}\n#dl-root .pts-add:hover:not([disabled]){color:#030b1c;background:#4C9BFF}\n#dl-root .pts-add[disabled]{opacity:.36;cursor:not-allowed}\n#dl-root .pts-r-lock{grid-column:1/-1;margin:0;font-size:11.5px;color:#FF9AA4}\n#dl-root .pts-pop{position:absolute;z-index:20;border:1px solid #9FF3FF;border-radius:50%;pointer-events:none}\n#dl-root .pts-ring{position:absolute;z-index:20;width:20px;height:20px;margin:-10px 0 0 -10px;border:2px solid #9FF3FF;border-radius:50%;pointer-events:none;animation:ptsRing 1.1s cubic-bezier(.2,.7,.2,1) forwards}\n@keyframes ptsRing{to{transform:scale(40);opacity:0;border-width:.2px}}\n#dl-root .jp.pts-shock{animation:ptsShock .6s cubic-bezier(.3,0,.3,1)}\n@keyframes ptsShock{0%{transform:none;filter:none}10%{transform:translate(0,4px) scale(.995);filter:brightness(1.5) hue-rotate(-8deg)}25%{transform:translate(-3px,-2px)}40%{transform:translate(3px,1px)}60%{transform:translate(-1px,0);filter:none}100%{transform:none}}\n@container jp (max-width:560px){\n#dl-root .pts-top{grid-template-columns:136px 1fr;gap:14px}\n#dl-root .pts-pool-n{font-size:42px}#dl-root .pts-pool-h{display:none}\n#dl-root .pts-r{grid-template-columns:1fr auto;gap:6px 10px}\n#dl-root .pts-g{grid-column:1/-1;grid-row:2}\n#dl-root .pts-r-p{display:none}\n#dl-root .pts-r-i{display:none}\n#dl-root .pts-r-b{grid-row:1;grid-column:2}\n}\n#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .pts-bub{display:none!important}\n#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .pts-g .f::after,\n#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .pts-sonar .sweep,\n#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .pts-bl .pg,\n#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .pts-bl .pd{animation:none!important}\n`;\n\n  return {\n    css: U.CSS + pageCss,\n    blocks: { 系统: U.systemBlock },\n    bar: { tab: INFO.页签, iconPath, when: U.mine, page, dock },\n  };\n}\n\nreturn DLGF_PAGE_深蓝加点(GF, INFO, BRIDGE, DLGF_SHARED(GF, INFO, BRIDGE));";
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
