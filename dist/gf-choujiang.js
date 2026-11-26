// 斗罗远程正文 gf-choujiang.js 1.0.0
// 斗罗金手指·抽奖：由 源码/build.py 生成，勿手改。逻辑见 源码/金手指/类型/抽奖.js，主页面见 源码/金手指/页面/，接线见 源码/金手指/入口.js。
import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

const GF = "抽奖";
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

/* 金手指 · 抽奖（结构、每轮把关、单抽/十连掷骰）
 * 规则出处：气运金手指/变量契约.md §2.2、§5；审查记录 B6–B8、第二段 B6。
 * 概率：白 38%、黄 28%、紫 20%、红 9.5%、金 4%、彩 0.5%；
 * 保底：10 抽保底红及以上、50 抽保底金及以上、未出彩满 60 抽后每抽彩率 +0.5%。
 */
const GACHA_BASE_ODDS = Object.freeze([
  ['白', 38], ['黄', 28], ['紫', 20], ['红', 9.5], ['金', 4], ['彩', 0.5],
]);

function gachaOddsTable(noRainbowCount) {
  const bonus = noRainbowCount >= 60 ? (noRainbowCount - 59) * 0.5 : 0;
  const rb = Math.min(100, 0.5 + bonus);
  let cut = rb - 0.5;
  // 彩率提升的部分依次从白→黄→紫→红→金扣减，确保总和恒为 100
  const base = [['白', 38], ['黄', 28], ['紫', 20], ['红', 9.5], ['金', 4]];
  for (let i = 0; i < base.length && cut > 0; i += 1) {
    const take = Math.min(base[i][1], cut);
    base[i][1] = Number((base[i][1] - take).toFixed(4));
    cut = Number((cut - take).toFixed(4));
  }
  return [['彩', rb], ...base.reverse()];
}

function gachaDraw(stat, n, rand = Math.random) {
  const count = Math.round(Number(n));
  if (count !== 1 && count !== 10) return { ok: false, why: '只支持单抽（1）或十连（10）' };
  const G = stat && stat.金手指;
  const C = G && G.抽奖;
  if (!C || typeof C !== 'object') return { ok: false, why: '找不到抽奖数据' };
  if (C.券 < count) return { ok: false, why: `券不够（还有 ${C.券} 张）` };
  const part = (stat.时空 && stat.时空.当前部) || null;
  const today = (stat.时空 && stat.时空.外界日期) || '';
  const up = (t) => GF_TIER_UP.indexOf(t);

  C.券 -= count;
  const out = [];
  const pool = typeof GF_POOL !== 'undefined' ? GF_POOL : [];
  const luckLib = typeof LUCK_LIB !== 'undefined' ? (typeof getLuckLib === 'function' ? getLuckLib(LUCK_LIB) : LUCK_LIB) : null;
  for (let i = 0; i < count; i += 1) {
    let tier = gfRollTable(gachaOddsTable(C.未出彩), rand);
    if (C.距金保底 <= 1 && up(tier) < up('金')) tier = '金';
    else if (C.距红保底 <= 1 && up(tier) < up('红')) tier = '红';

    C.距红保底 = up(tier) >= up('红') ? 10 : Math.max(1, C.距红保底 - 1);
    C.距金保底 = up(tier) >= up('金') ? 50 : Math.max(1, C.距金保底 - 1);
    C.未出彩 = tier === '彩' ? 0 : C.未出彩 + 1;
    C.累计 += 1;

    const reward = gfRollPoolReward({ pool, luckLib, stat, gfType: '抽奖', tier, source: '抽奖', rand });
    gfPushPending(G, reward, part);
    C.最近 = [{ 名称: reward.名称, 品阶: tier, 日期: today }, ...(Array.isArray(C.最近) ? C.最近 : [])].slice(0, 10);
    out.push(reward);
  }
  return { ok: true, out };
}

const GF_DEF = {
  schema(z, K, tones) {
    const recShape = {
      名称: K.str('', 20),
      品阶: K.pick(GF_REWARD_TIERS, '白'),
      日期: K.str('', 24),
    };
    const gachaShape = K.pre((v) => (gfIsPlainObj(v) ? v : {}), z.object({
      券: K.int(1, 0, 999),
      上次免费: K.strNull(null, 24),
      累计: K.int(0, 0, 999999),
      距红保底: K.int(10, 0, 10),
      距金保底: K.int(50, 0, 50),
      未出彩: K.int(0, 0, 999999),
      最近: K.headList(recShape, 10),
    }));
    return gfBlockSchema(z, '抽奖', { 抽奖: gachaShape }, null, tones);
  },

  onUpdated(after, before) {
    const G = after && after.金手指;
    if (!G || G.类型 !== '抽奖' || !G.抽奖) return;
    const prevC = before && gfIsPlainObj(before.金手指) && before.金手指.类型 === '抽奖' && gfIsPlainObj(before.金手指.抽奖)
      ? before.金手指.抽奖 : null;
    // 脚本字段防 AI 篡改（券允许 AI 按任务奖惩改，其余全由脚本维护）
    if (prevC) {
      G.抽奖.上次免费 = prevC.上次免费;
      G.抽奖.累计 = prevC.累计;
      G.抽奖.距红保底 = prevC.距红保底;
      G.抽奖.距金保底 = prevC.距金保底;
      G.抽奖.未出彩 = prevC.未出彩;
      G.抽奖.最近 = JSON.parse(JSON.stringify(prevC.最近 || []));
    }
    const today = (after.时空 && after.时空.外界日期) || '';
    const todayKey = dateKey(today);
    if (todayKey == null) return;
    const lastKey = dateKey(G.抽奖.上次免费);
    if (lastKey == null) {
      G.抽奖.上次免费 = today;
    } else if (todayKey > lastKey) {
      G.抽奖.券 = Math.min(999, G.抽奖.券 + 1);
      G.抽奖.上次免费 = today;
    }
  },

  act(action, payload, stat) {
    if (action === '抽奖') return gachaDraw(stat, payload && payload.n, payload && typeof payload.rand === 'function' ? payload.rand : Math.random);
    return { ok: false, why: `抽奖不支持操作：${action}` };
  },
};

const GF_PAGE = "/* 金手指 · 主页面代码的共用部分（状态栏系统页外壳 + 正文 <系统> 六皮标签）\n * build.py 把 本文件 + 页面/<类型>.js 拼起来，末尾加一句 return DLGF_PAGE_<类型>(GF, INFO, BRIDGE, DLGF_SHARED(GF, INFO, BRIDGE))，\n * 整段由金手指脚本在主页面里用 new Function('GF', 'INFO', 'BRIDGE', 代码) 执行。\n * 视觉红线：无朱砂主色、无大圆角（≤4px）、无 emoji 图标、无远程资源、三档动效（full / reduced→lite / off）+ prefers-reduced-motion。\n */\nfunction DLGF_SHARED(GF, INFO, BRIDGE) {\n  const esc = (s) => String(s == null ? '' : s).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\n  const TIER = ['彩', '金', '红', '紫', '黄', '白'];\n  const SYS_KEY = { 未来模拟器: 'sim', 深蓝加点: 'pts', 诸天代打: 'hero', 签到打卡: 'sign', 抽奖: 'gacha', 跨时代聊天群: 'chat' };\n  const gfOf = (st) => (st && st.金手指 && typeof st.金手指 === 'object' ? st.金手指 : null);\n  const mine = (st) => { const g = gfOf(st); return !!g && g.类型 === GF; };\n\n  function dayNo(s) {\n    const m = /(前)?(\\d{1,9})年(\\d{1,2})月(\\d{1,2})日/u.exec(String(s || ''));\n    if (!m) return null;\n    const y0 = (m[1] ? -1 : 1) * Number(m[2]), mo = Number(m[3]), d = Number(m[4]);\n    const y = y0 - (mo <= 2 ? 1 : 0), era = Math.floor(y / 400), yoe = y - era * 400;\n    const doy = Math.floor((153 * ((mo + 9) % 12) + 2) / 5) + d - 1;\n    return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;\n  }\n  const daysTo = (from, to) => { const a = dayNo(from), b = dayNo(to); return a == null || b == null ? null : b - a; };\n  const short = (s) => { const m = /(\\d{1,2})月(\\d{1,2})日/u.exec(String(s || '')); return m ? `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}` : '—'; };\n  const year = (s) => { const m = /(前)?(\\d{1,9})年/u.exec(String(s || '')); return m ? (m[1] ? '前' : '') + m[2] : '—'; };\n  const tierIn = (text) => { const m = /([彩金红紫黄白])阶/u.exec(String(text || '')); return m ? m[1] : null; };\n\n  function motionOf(kit) {\n    const raw = (kit && kit.motion) || (document.documentElement.dataset.dlMotion) || 'full';\n    if (raw === 'off') return 'off';\n    try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off'; } catch (_) { /* ignore */ }\n    return raw === 'reduced' || raw === 'lite' ? 'lite' : 'full';\n  }\n  const still = (kit) => motionOf(kit) !== 'full';\n\n  function frag(html) {\n    const t = document.createElement('template');\n    t.innerHTML = String(html || '').trim();\n    return t.content.firstElementChild;\n  }\n\n  function typeIn(el, text, kit, speed = 26) {\n    if (!el) return;\n    if (el._typing) { clearInterval(el._typing); el._typing = null; }\n    const s = String(text || '');\n    if (still(kit)) { el.innerHTML = `<q>${esc(s)}</q>`; return; }\n    let i = 0;\n    const q = document.createElement('q');\n    const cur = document.createElement('i');\n    cur.className = 'cur';\n    el.replaceChildren(q, cur);\n    el._typing = setInterval(() => {\n      if (!el.isConnected) { clearInterval(el._typing); el._typing = null; return; }\n      i += 1;\n      q.textContent = s.slice(0, i);\n      if (i >= s.length) {\n        clearInterval(el._typing); el._typing = null;\n        setTimeout(() => { if (cur.isConnected) cur.remove(); }, 1600);\n      }\n    }, speed);\n  }\n\n  function roll(el, to, kit, ms = 700) {\n    if (!el) return;\n    let tn = [...el.childNodes].find((n) => n.nodeType === 3);\n    if (!tn) tn = el.insertBefore(document.createTextNode(''), el.firstChild);\n    const from = Number(el.dataset.v != null ? el.dataset.v : parseFloat(tn.textContent)) || 0;\n    el.dataset.v = String(to);\n    if (still(kit) || from === to) { tn.textContent = String(to); return; }\n    const t0 = performance.now();\n    const step = () => {\n      if (!el.isConnected) return;\n      const p = Math.min(1, (performance.now() - t0) / ms);\n      tn.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));\n      if (p < 1) setTimeout(step, 16);\n    };\n    step();\n  }\n\n  function burst(host, x, y, colors, kit, n = 18, spread = 90) {\n    if (still(kit) || !host || !host.isConnected) return;\n    const cols = colors && colors.length ? colors : ['#fff'];\n    for (let i = 0; i < n; i += 1) {\n      const s = document.createElement('i');\n      s.className = 'jp-spark';\n      s.style.left = x + 'px';\n      s.style.top = y + 'px';\n      s.style.setProperty('--c', cols[i % cols.length]);\n      host.appendChild(s);\n      const a = Math.random() * Math.PI * 2;\n      const r = spread * (0.4 + Math.random() * 0.8);\n      if (s.animate) {\n        s.animate([\n          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },\n          { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(.2)`, opacity: 0 },\n        ], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => s.remove();\n      } else {\n        setTimeout(() => s.remove(), 400);\n      }\n    }\n  }\n\n  function toast(root, msg) {\n    if (!root) return;\n    root.querySelectorAll('.jp-toast').forEach((t) => t.remove());\n    const t = document.createElement('div');\n    t.className = 'jp-toast';\n    t.setAttribute('role', 'status');\n    t.textContent = String(msg || '');\n    root.appendChild(t);\n    setTimeout(() => { if (t.isConnected) t.remove(); }, 2700);\n  }\n\n  const disabled = (kit) => (BRIDGE && typeof BRIDGE.disabled === 'function' ? BRIDGE.disabled(kit) : '');\n  const act = (action, payload, opts) => (BRIDGE && typeof BRIDGE.act === 'function'\n    ? BRIDGE.act(action, payload, opts)\n    : Promise.resolve({ ok: false, why: '金手指写入桥不可用' }));\n  const syncBar = () => { if (BRIDGE && typeof BRIDGE.syncBar === 'function') BRIDGE.syncBar(); };\n\n  function lockBanner(reason) {\n    return reason ? `<div class=\"jp-lock\" role=\"note\">${esc(reason)}</div>` : '';\n  }\n\n  function caveat(extra) {\n    const text = extra || '面板操作写入最新 AI 楼层；重新生成或右滑这一层时，本层做过的签到、抽奖、加点等操作会一并撤销。';\n    return `<p class=\"jp-caveat\">${esc(text)}</p>`;\n  }\n\n  // ── 页头（含随时改口吻入口） ──\n  function head(G, o, kit) {\n    const tone = (G && G.口吻) || {};\n    const lock = disabled(kit);\n    return `<header class=\"jp-hd\">\n      <div class=\"jp-mark\" aria-hidden=\"true\">${o.mark || ''}</div>\n      <div class=\"jp-nm\"><b>${esc(tone.名字 || o.名字 || INFO.默认名 || '系统')}</b><span>${esc(G.类型)}${tone.预设 ? ' · ' + esc(tone.预设) : ' · 自定口吻'}</span><button type=\"button\" class=\"jp-tone-btn\" data-tone-toggle ${lock ? 'disabled' : ''}>改口吻</button></div>\n      <div class=\"jp-hs\">${(o.stats || []).map((s) => `<div><b data-k=\"${esc(s.k)}\">${esc(s.v)}${s.u ? `<small>${esc(s.u)}</small>` : ''}</b><span>${esc(s.label)}</span></div>`).join('')}</div>\n      <p class=\"jp-say\" aria-live=\"polite\"></p>\n    </header><div class=\"jp-tone\" data-part=\"tone\" hidden></div>`;\n  }\n\n  function bindToneEditor(root, G, kit) {\n    const btn = root.querySelector('[data-tone-toggle]');\n    const box = root.querySelector('[data-part=\"tone\"]');\n    if (!btn || !box) return;\n    const isChat = G.类型 === '跨时代聊天群' || !!(INFO && INFO.口吻预设 === '群主机器人');\n    const presets = Array.isArray(INFO && INFO.口吻预设)\n      ? INFO.口吻预设\n      : ((BRIDGE && BRIDGE.tones && (isChat ? BRIDGE.tones.群主机器人 : BRIDGE.tones.系统)) || []);\n    let open = false;\n    function renderBox() {\n      if (!open) { box.hidden = true; box.replaceChildren(); return; }\n      const tone = G.口吻 || {};\n      box.hidden = false;\n      box.innerHTML = `<div class=\"jp-tone-in\">\n        <div class=\"jp-tone-row\">\n          <label><span>${isChat ? '机器人名' : '系统名'}</span><input type=\"text\" data-tk=\"名字\" maxlength=\"8\" value=\"${esc(tone.名字 || '')}\"></label>\n          <label><span>称呼${isChat ? '群友' : '你'}</span><input type=\"text\" data-tk=\"称呼\" maxlength=\"8\" value=\"${esc(tone.称呼 || '')}\"></label>\n        </div>\n        ${presets.length ? `<div class=\"jp-tone-pre\">${presets.map((p, i) => `<button type=\"button\" data-tp=\"${i}\" aria-pressed=\"${String(tone.预设 === p.预设)}\">${esc(p.预设)}</button>`).join('')}</div>` : ''}\n        <label class=\"jp-tone-desc\"><span>性格与说话方式</span><textarea data-tk=\"描述\" maxlength=\"120\" rows=\"2\">${esc(tone.描述 || '')}</textarea></label>\n        <div class=\"jp-tone-acts\">\n          <button type=\"button\" class=\"jp-btn\" data-tone-cancel>取消</button>\n          <button type=\"button\" class=\"jp-btn pri\" data-tone-save>保存口吻</button>\n        </div>\n      </div>`;\n      let curPreset = tone.预设 || null;\n      const nmIn = box.querySelector('[data-tk=\"名字\"]');\n      const callIn = box.querySelector('[data-tk=\"称呼\"]');\n      const descIn = box.querySelector('[data-tk=\"描述\"]');\n      box.querySelectorAll('[data-tp]').forEach((b) => b.addEventListener('click', () => {\n        const p = presets[Number(b.dataset.tp)];\n        if (!p) return;\n        curPreset = p.预设;\n        nmIn.value = (isChat ? p.名字 : p.自称) || nmIn.value;\n        callIn.value = p.称呼 || callIn.value;\n        descIn.value = p.描述 || '';\n        box.querySelectorAll('[data-tp]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));\n      }));\n      descIn.addEventListener('input', () => {\n        curPreset = null;\n        box.querySelectorAll('[data-tp]').forEach((x) => x.setAttribute('aria-pressed', 'false'));\n      });\n      box.querySelector('[data-tone-cancel]').addEventListener('click', () => { open = false; renderBox(); });\n      box.querySelector('[data-tone-save]').addEventListener('click', async () => {\n        const r = await act('改口吻', { 名字: nmIn.value, 称呼: callIn.value, 预设: curPreset, 描述: descIn.value });\n        if (!r.ok) { toast(root, r.why || '没存上'); return; }\n        open = false;\n        toast(root, '口吻已更新，下一轮正文起生效');\n      });\n    }\n    btn.addEventListener('click', () => {\n      if (btn.disabled) return;\n      open = !open;\n      renderBox();\n    });\n  }\n\n  // ── 任务 ──\n  function tasks(G, S) {\n    const list = Array.isArray(G.任务) ? G.任务 : [];\n    const on = list.filter((t) => t.状态 === '进行中').length;\n    const today = S && S.时空 && S.时空.外界日期;\n    return `<section class=\"jp-sec\" data-part=\"tasks\"><h5 class=\"jp-st\">任务<em>进行中 ${on}/3</em></h5>\n      ${list.length ? `<div class=\"jp-tks\">${list.map((t) => {\n        const d = t.期限 === '不限' ? null : daysTo(today, t.期限);\n        const due = t.期限 === '不限' ? '不限期' : d == null ? short(t.期限) : d < 0 ? '已过期' : d === 0 ? '今日截止' : `剩 ${d} 天`;\n        const tier = tierIn(t.奖励);\n        return `<article class=\"jp-tk\" data-c=\"${esc(t.类别)}\" data-s=\"${esc(t.状态)}\">\n          <span class=\"jp-tk-k\">${esc(t.类别)}</span>\n          <div class=\"jp-tk-b\">\n            <div class=\"jp-tk-t\"><b>${esc(t.标题)}</b>${t.状态 === '进行中' ? `<time data-k=\"${d != null && d <= 1 ? 'soon' : ''}\">${esc(due)}</time>` : ''}</div>\n            <p class=\"jp-tk-c\">${esc(t.内容)}</p>\n            <div class=\"jp-tk-f\"><span class=\"g\"${tier ? ` data-tier=\"${tier}\" style=\"color:var(--c1)\"` : ''}>${esc(t.奖励)}</span>${t.失败 && t.失败 !== '无' ? `<span class=\"l\">${esc(t.失败)}</span>` : ''}</div>\n          </div>\n          ${t.状态 !== '进行中' ? `<span class=\"jp-tk-stamp\">${t.状态 === '已完成' ? '完成' : '失败'}</span>` : ''}\n        </article>`;\n      }).join('')}</div>` : `<p class=\"jp-none\">${esc((G.口吻 && G.口吻.名字) || '系统')}还没发任务。</p>`}\n    </section>`;\n  }\n\n  // ── 待入账 ──\n  function rewardCard(r, cls = '') {\n    const cross = r.出处 && r.出处 !== '斗罗';\n    return `<article class=\"jp-rw ${cls}\"${r.品阶 ? ` data-tier=\"${esc(r.品阶)}\"` : ''}>\n      <div class=\"jp-rw-h\">${r.品阶 ? `<span class=\"jp-rw-t\">${esc(r.品阶)}</span>` : ''}<b>${esc(r.名称)}</b>${cross ? `<span class=\"jp-rw-x\">跨界 · ${esc(r.出处)}</span>` : ''}</div>\n      ${r.说明 ? `<p>${esc(r.说明)}</p>` : ''}\n      <div class=\"jp-rw-f\"><span class=\"to\">${esc(r.落点 || '其他')}</span><span>${esc(r.来源 || '')} · ${short(r.日期)}</span>${r.状态 === '待入账' ? '<span class=\"wait\">等正文入账</span>' : ''}</div>\n    </article>`;\n  }\n\n  function ledger(G, freshCount = 0) {\n    // 待入账按时间追加在末尾，显示时最新排最前\n    const list = (Array.isArray(G.待入账) ? G.待入账 : []).filter((r) => r.状态 === '待入账').slice().reverse();\n    const log = Array.isArray(G.入账记录) ? G.入账记录 : [];\n    return `<section class=\"jp-sec\" data-part=\"ledger\"><h5 class=\"jp-st\">待入账<em>${list.length} 件 · 下一轮正文里落地</em></h5>\n      ${list.length ? `<div class=\"jp-lg\">${list.map((r, i) => rewardCard(r, i < freshCount ? 'new' : '')).join('')}</div>` : '<p class=\"jp-none\">没有等着入账的东西。</p>'}\n      ${log.length ? `<ol class=\"jp-log\">${log.slice(0, 4).map((x) => `<li><b>${esc(x.名称)}</b><span>→ ${esc(x.落点)}</span><time>${short(x.日期)}</time></li>`).join('')}</ol>` : ''}\n    </section>`;\n  }\n\n  function swap(root, part, html) {\n    const old = root.querySelector(`[data-part=\"${part}\"]`);\n    const nu = frag(html);\n    if (old && nu) old.replaceWith(nu);\n    return nu;\n  }\n\n  function dockMark(sys, iconPath, inner, k, title, kit, tab) {\n    const el = frag(`<button type=\"button\" class=\"jp-dk\" data-sys=\"${esc(sys)}\" data-k=\"${esc(k || '')}\" title=\"${esc(title || '')}\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"square\" aria-hidden=\"true\">${iconPath}</svg>${inner}</button>`);\n    if (kit && typeof kit.open === 'function' && tab) el.addEventListener('click', () => kit.open(tab));\n    return el;\n  }\n\n  // ── 正文块头解析（契约 §3） ──\n  const BLOCK_META_KEYS = new Set(['类别', '标题', '人物', '出处', '阶段']);\n  function parseBlock(inner) {\n    const lines = String(inner == null ? '' : inner).replace(/^\\n+|\\n+$/gu, '').split('\\n');\n    const meta = {};\n    let i = 0;\n    for (; i < lines.length; i += 1) {\n      const m = /^\\s*([^｜|\\s]{1,6})[｜|](.*)$/u.exec(lines[i]);\n      if (!m || !BLOCK_META_KEYS.has(m[1])) break;\n      meta[m[1]] = m[2].trim();\n    }\n    return { meta, body: lines.slice(i).join('\\n').trim() };\n  }\n\n  // ── 正文 <系统> 块渲染器（六个金手指共用，按 金手指.类型 换皮） ──\n  const systemBlock = {\n    render(seg, kit) {\n      const { meta, body } = parseBlock(seg.inner);\n      const st = kit && kit.env && kit.env.stat;\n      const G = (st && st.金手指) || { 类型: GF, 口吻: { 名字: INFO.默认名 } };\n      const key = (INFO && INFO.key) || SYS_KEY[G.类型] || 'sim';\n      const tone = G.口吻 || {};\n      const cat = meta.类别 || '提示';\n      const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null;\n      const attrs = {\n        class: 'sx qt-sx' + (t != null ? ' in' : ''),\n        'data-sys': key,\n        'data-cat': cat,\n        style: t != null ? { '--gf-t': `-${t.toFixed(2)}s` } : null,\n      };\n      const lines = body ? body.split('\\n').filter((l) => l.trim()) : [];\n      return kit.h('section', attrs,\n        kit.h('div', { class: 'sx-hd' },\n          kit.h('span', { class: 'sx-ding', text: key === 'chat' ? '群公告' : '叮' }),\n          kit.h('span', { class: 'sx-nm', text: tone.名字 || G.类型 || '系统' }),\n          kit.h('span', { class: 'sx-k', text: cat })),\n        meta.标题 ? kit.h('h5', { class: 'qt-sx-t', text: meta.标题 }) : null,\n        lines.map((l) => kit.h('p', { class: 'sx-line' }, kit.sub ? kit.sub(l) : l)));\n    },\n  };\n\n  // ── 共用样式（自带 @property --qa、品阶色、系统色、关键帧、.jp 外壳与 <系统> 六皮） ──\n  const CSS = `\n@property --qa{syntax:'<angle>';inherits:false;initial-value:0deg}\n@keyframes qyHue{to{--qa:360deg}}\n@keyframes qyShine{0%{background-position:130% 0}55%,100%{background-position:-130% 0}}\n@keyframes sxBlink{50%{opacity:0}}\n@keyframes sxIn{from{opacity:0;transform:translateY(8px)}}\n@keyframes sxScan{to{top:110%}}\n@keyframes sxGlitch{0%{opacity:0;clip-path:inset(40% 0 52% 0);transform:translateX(-6px)}20%{opacity:1;clip-path:inset(10% 0 70% 0);transform:translateX(5px)}40%{clip-path:inset(60% 0 10% 0);transform:translateX(-3px)}60%{clip-path:inset(0 0 30% 0)}80%,100%{clip-path:inset(0);transform:none}}\n@keyframes sxFlowY{to{background-position:0 14px}}\n@keyframes sxRoll{from{transform:translateY(70%);opacity:0}}\n@keyframes sxTurn{to{transform:rotate(405deg)}}\n@keyframes sxStamp{0%{transform:rotate(-10deg) scale(2.4);opacity:0}60%{transform:rotate(-10deg) scale(.92);opacity:1}100%{transform:rotate(-10deg) scale(1)}}\n@keyframes sxSweep{40%,100%{transform:translateX(100%)}}\n@keyframes jpRise{from{opacity:0;transform:translateY(10px)}}\n@keyframes jpPulse{50%{opacity:.2}}\n@keyframes jpDrop{0%{opacity:0;transform:translateY(-16px) scale(1.04);filter:brightness(2.2)}60%{opacity:1}100%{filter:none}}\n@keyframes jpToast{0%{opacity:0;transform:translate(-50%,10px)}12%,82%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-6px)}}\n@keyframes jpSpin{to{transform:rotate(360deg)}}\n\n:is(.jp,.jp-dk,.sx)[data-sys=\"sim\"]{--s1:#5FE3F0;--s2:#04141c;--sg:rgba(95,227,240,.45);--s3:#FF4D6A}\n:is(.jp,.jp-dk,.sx)[data-sys=\"pts\"]{--s1:#4C9BFF;--s2:#030b1c;--sg:rgba(76,155,255,.45);--s3:#9FF3FF}\n:is(.jp,.jp-dk,.sx)[data-sys=\"hero\"]{--s1:#B994FF;--s2:#0b0718;--sg:rgba(185,148,255,.45);--s3:#FFD36B}\n:is(.jp,.jp-dk,.sx)[data-sys=\"sign\"]{--s1:#E6B562;--s2:#140c04;--sg:rgba(230,181,98,.45);--s3:#FFF0C2}\n:is(.jp,.jp-dk,.sx)[data-sys=\"gacha\"]{--s1:#FFB341;--s2:#0d0a12;--sg:rgba(255,179,65,.42);--s3:#D96BFF}\n:is(.jp,.jp-dk,.sx)[data-sys=\"chat\"]{--s1:#7CF5C8;--s2:#061412;--sg:rgba(124,245,200,.4);--s3:#D8C39A}\n${INFO && INFO.key && !SYS_KEY[GF] && Array.isArray(INFO.色) ? `:is(.jp,.jp-dk,.sx)[data-sys=\"${String(INFO.key).replace(/[^a-z0-9-]/g, '')}\"]{--s1:${INFO.色[0] || '#5FE3F0'};--s2:${INFO.色[1] || '#04141c'};--sg:color-mix(in srgb,${INFO.色[0] || '#5FE3F0'} 45%,transparent);--s3:${INFO.色[2] || '#FFD36B'}}` : ''}\n\n#dl-root .jp [data-tier=\"白\"]{--c1:#F4F1EA;--c2:#A9A291;--cg:rgba(244,241,234,.28)}\n#dl-root .jp [data-tier=\"黄\"]{--c1:#F2D46B;--c2:#C08A17;--cg:rgba(242,212,107,.36)}\n#dl-root .jp [data-tier=\"紫\"]{--c1:#C3A2F2;--c2:#4E2585;--cg:rgba(176,138,224,.44)}\n#dl-root .jp [data-tier=\"红\"]{--c1:#F0565E;--c2:#7A111B;--cg:rgba(224,71,79,.5)}\n#dl-root .jp [data-tier=\"金\"]{--c1:#F6D877;--c2:#B8891F;--cg:rgba(240,207,106,.55)}\n#dl-root .jp [data-tier=\"彩\"]{--c1:#FFE45C;--c2:#6C7BFF;--cg:rgba(255,228,92,.45)}\n#dl-root .jp [data-tier=\"厄\"]{--c1:#A49FB1;--c2:#0A090D;--cg:rgba(0,0,0,.9)}\n#dl-root .jp [data-tier=\"绝\"]{--c1:#E0263B;--c2:#060509;--cg:rgba(150,10,26,.6)}\n\n#dl-root .jp{--tx:#E8ECF2;--tx2:#A9B0BF;--tx3:#687084;--ln:color-mix(in srgb,var(--s1) 16%,transparent);--ln2:color-mix(in srgb,var(--s1) 32%,transparent);--ok:#7BE0A6;--bad:#FF7A86;--warn:#FFC15A;--serif:\"Noto Serif SC\",\"Source Han Serif SC\",\"Songti SC\",\"STSong\",\"SimSun\",serif;--sans:\"Noto Sans SC\",system-ui,-apple-system,\"PingFang SC\",\"Microsoft YaHei\",sans-serif;--mono:\"JetBrains Mono\",\"Cascadia Mono\",Consolas,ui-monospace,monospace;--ease:cubic-bezier(.2,.7,.2,1);--snap:cubic-bezier(.7,0,.2,1);container:jp/inline-size;position:relative;isolation:isolate;min-height:100%;color:var(--tx);background:var(--s2);font:13.5px/1.65 var(--sans);overflow-x:clip;border:1px solid var(--ln)}\n#dl-root .jp *,#dl-root .jp *::before,#dl-root .jp *::after{box-sizing:border-box}\n#dl-root .jp button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}\n#dl-root .jp :focus-visible{outline:1px solid var(--s1);outline-offset:2px}\n#dl-root .jp p{margin:0}#dl-root .jp h4,#dl-root .jp h5{margin:0}\n#dl-root .jp-in>*{animation:jpRise .55s var(--ease) both;animation-delay:calc(var(--i,0) * 60ms)}\n\n#dl-root .jp-lock{padding:8px 16px;font:600 12px/1.5 var(--sans);color:var(--warn);background:rgba(255,193,90,.09);border-bottom:1px solid rgba(255,193,90,.28)}\n#dl-root .jp-caveat{padding:10px 20px 14px;font:11.5px/1.55 var(--sans);color:var(--tx3);border-top:1px solid var(--ln)}\n\n#dl-root .jp-hd{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px 16px;align-items:center;padding:18px 20px 16px;border-bottom:1px solid var(--ln);overflow:hidden}\n#dl-root .jp-hd::before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(80% 140% at 0% 0%,color-mix(in srgb,var(--s1) 18%,transparent),transparent 60%)}\n#dl-root .jp-mark{grid-row:span 2;width:54px;height:54px;color:var(--s1);filter:drop-shadow(0 0 10px var(--sg))}\n#dl-root .jp-mark svg{width:100%;height:100%;overflow:visible}\n#dl-root .jp-nm{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;min-width:0}\n#dl-root .jp-nm b{font:900 22px/1.1 var(--serif);letter-spacing:.16em;color:#fff;text-shadow:0 0 18px var(--sg)}\n#dl-root .jp-nm span{font:600 10.5px/1 var(--mono);letter-spacing:.2em;color:color-mix(in srgb,var(--s1) 75%,#fff)}\n#dl-root .jp .jp-tone-btn{padding:2px 8px;font:600 11px/1.5 var(--sans);color:var(--s1);border:1px solid var(--ln2);background:color-mix(in srgb,var(--s1) 8%,transparent)}\n#dl-root .jp .jp-tone-btn:hover:not([disabled]){border-color:var(--s1)}\n#dl-root .jp .jp-tone-btn[disabled]{opacity:.38;cursor:not-allowed}\n#dl-root .jp-say{grid-column:2/4;min-height:1.65em;color:var(--tx2);font-size:13px}\n#dl-root .jp-say q{quotes:\"「\" \"」\";color:var(--tx)}\n#dl-root .jp-say .cur{display:inline-block;width:.45em;height:1em;margin-left:2px;vertical-align:-.12em;background:var(--s1);animation:sxBlink 1s steps(1) infinite}\n#dl-root .jp-hs{grid-row:1;grid-column:3;display:flex;gap:18px}\n#dl-root .jp-hs div{text-align:right}\n#dl-root .jp-hs b{display:block;font:700 22px/1 var(--mono);color:var(--s1);text-shadow:0 0 12px var(--sg);font-variant-numeric:tabular-nums}\n#dl-root .jp-hs b small{font-size:12px;color:var(--tx3);margin-left:2px}\n#dl-root .jp-hs span{font:600 10px/1.9 var(--mono);letter-spacing:.2em;color:var(--tx3)}\n\n#dl-root .jp-tone{padding:12px 20px 14px;background:rgba(0,0,0,.32);border-bottom:1px solid var(--ln)}\n#dl-root .jp-tone-in{display:flex;flex-direction:column;gap:10px}\n#dl-root .jp-tone-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n#dl-root .jp-tone label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--tx2)}\n#dl-root .jp-tone input,#dl-root .jp-tone textarea{width:100%;padding:7px 10px;font:13px/1.5 var(--sans);color:var(--tx);background:#05060a;border:1px solid var(--ln2);outline:none;border-radius:0}\n#dl-root .jp-tone input:focus,#dl-root .jp-tone textarea:focus{border-color:var(--s1)}\n#dl-root .jp-tone-pre{display:flex;flex-wrap:wrap;gap:6px}\n#dl-root .jp .jp-tone-pre button{padding:4px 10px;font:600 12px/1.4 var(--serif);color:var(--tx2);border:1px solid var(--ln2);background:rgba(255,255,255,.02)}\n#dl-root .jp .jp-tone-pre button[aria-pressed=\"true\"]{color:var(--s2);background:var(--s1);border-color:var(--s1)}\n#dl-root .jp-tone-acts{display:flex;justify-content:flex-end;gap:8px}\n#dl-root .jp .jp-tone-acts .jp-btn{min-height:34px;padding:0 14px;font-size:12px}\n\n#dl-root .jp-sec{position:relative;padding:16px 20px}\n#dl-root .jp-sec+.jp-sec{border-top:1px solid var(--ln)}\n#dl-root .jp-st{display:flex;align-items:center;gap:10px;margin:0 0 12px;font:700 11px/1 var(--mono);letter-spacing:.3em;color:color-mix(in srgb,var(--s1) 80%,#fff)}\n#dl-root .jp-st::before{content:\"\";width:14px;height:2px;background:var(--s1);box-shadow:0 0 6px var(--s1)}\n#dl-root .jp-st::after{content:\"\";flex:1;height:1px;background:linear-gradient(90deg,var(--ln2),transparent)}\n#dl-root .jp-st em{order:2;font-style:normal;font-weight:500;letter-spacing:.12em;color:var(--tx3)}\n#dl-root .jp-none{color:var(--tx3);font-size:12.5px}\n\n#dl-root .jp .jp-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 18px;font:700 13px/1 var(--serif);letter-spacing:.2em;color:var(--s1);border:1px solid var(--ln2);background:color-mix(in srgb,var(--s1) 6%,transparent);clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);transition:background .25s,border-color .25s,color .25s,transform .15s}\n#dl-root .jp .jp-btn:hover:not([disabled]){border-color:var(--s1);background:color-mix(in srgb,var(--s1) 14%,transparent)}\n#dl-root .jp .jp-btn:active:not([disabled]){transform:translateY(1px)}\n#dl-root .jp .jp-btn.pri{color:var(--s2);background:linear-gradient(100deg,color-mix(in srgb,var(--s1) 80%,#fff),var(--s1));border-color:transparent;box-shadow:0 0 18px var(--sg)}\n#dl-root .jp .jp-btn[disabled]{opacity:.38;cursor:not-allowed;filter:saturate(.3)}\n#dl-root .jp .jp-btn svg{width:15px;height:15px}\n#dl-root .jp .jp-seg{display:inline-flex;border:1px solid var(--ln2)}\n#dl-root .jp .jp-seg button{padding:7px 14px;font:600 12px/1 var(--serif);letter-spacing:.16em;color:var(--tx2);transition:background .25s,color .25s}\n#dl-root .jp .jp-seg button[aria-pressed=\"true\"]{color:var(--s2);background:var(--s1)}\n#dl-root .jp-chip{display:inline-flex;align-items:center;gap:5px;padding:2px 7px;font:600 11px/1.5 var(--mono);letter-spacing:.06em;color:var(--tx2);border:1px solid var(--ln2)}\n#dl-root .jp-chip[data-tier]{color:var(--c1);border-color:color-mix(in srgb,var(--c1) 45%,transparent);background:color-mix(in srgb,var(--c1) 8%,transparent)}\n\n#dl-root .jp-tks{display:grid;gap:8px}\n#dl-root .jp-tk{--kc:var(--tx3);position:relative;display:grid;grid-template-columns:26px minmax(0,1fr);background:rgba(255,255,255,.025);border:1px solid var(--ln);overflow:hidden;transition:border-color .3s,background .3s}\n#dl-root .jp-tk[data-c=\"主线\"]{--kc:var(--s1)}\n#dl-root .jp-tk[data-c=\"突发\"]{--kc:#FF9A3D}\n#dl-root .jp-tk:hover{border-color:var(--ln2);background:rgba(255,255,255,.04)}\n#dl-root .jp-tk-k{display:grid;place-items:center;writing-mode:vertical-rl;font:800 11px/1 var(--serif);letter-spacing:.4em;color:var(--s2);background:var(--kc)}\n#dl-root .jp-tk[data-c=\"日常\"] .jp-tk-k{color:var(--tx2);background:rgba(255,255,255,.06)}\n#dl-root .jp-tk[data-c=\"突发\"] .jp-tk-k{background:repeating-linear-gradient(-45deg,#FF9A3D 0 6px,#E07A1C 6px 12px)}\n#dl-root .jp-tk-b{padding:9px 12px 10px;min-width:0}\n#dl-root .jp-tk-t{display:flex;align-items:baseline;gap:10px}\n#dl-root .jp-tk-t b{font:700 14px/1.4 var(--serif);letter-spacing:.06em}\n#dl-root .jp-tk-t time{margin-left:auto;flex:none;font:600 11px/1 var(--mono);color:var(--tx3)}\n#dl-root .jp-tk-t time[data-k=\"soon\"]{color:var(--warn)}\n#dl-root .jp-tk-c{margin-top:3px;color:var(--tx2);font-size:12.5px}\n#dl-root .jp-tk-f{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:7px;font-size:11.5px;color:var(--tx3)}\n#dl-root .jp-tk-f .g{color:var(--tx)}#dl-root .jp-tk-f .g::before{content:\"奖 \";color:var(--kc);font-family:var(--mono)}\n#dl-root .jp-tk-f .l::before{content:\"罚 \";color:var(--bad);font-family:var(--mono)}\n#dl-root .jp-tk[data-s=\"已完成\"],#dl-root .jp-tk[data-s=\"已失败\"]{opacity:.55}\n#dl-root .jp-tk[data-s=\"已完成\"] .jp-tk-t b{text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--ok) 70%,transparent)}\n#dl-root .jp-tk[data-s=\"已失败\"] .jp-tk-t b{text-decoration:line-through;text-decoration-color:var(--bad)}\n#dl-root .jp-tk-stamp{position:absolute;right:12px;bottom:6px;padding:1px 6px;font:900 13px/1.3 var(--serif);letter-spacing:.3em;border:2px solid;transform:rotate(-8deg);opacity:.9}\n#dl-root .jp-tk[data-s=\"已完成\"] .jp-tk-stamp{color:var(--ok)}#dl-root .jp-tk[data-s=\"已失败\"] .jp-tk-stamp{color:var(--bad)}\n\n#dl-root .jp-lg{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}\n#dl-root .jp-rw{position:relative;padding:10px 12px 10px 15px;border:1px solid color-mix(in srgb,var(--c1,#888) 30%,transparent);background:linear-gradient(100deg,color-mix(in srgb,var(--c1,#888) 13%,transparent),transparent 70%),rgba(0,0,0,.25);overflow:hidden}\n#dl-root .jp-rw::before{content:\"\";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--c1,#888);box-shadow:0 0 10px var(--c1,#888)}\n#dl-root .jp-rw[data-tier=\"彩\"]::before{background:linear-gradient(180deg,#FF5A5F,#FFE45C,#5FD88A,#3FC1F0,#D96BFF)}\n#dl-root .jp-rw[data-tier=\"金\"]::after,#dl-root .jp-rw[data-tier=\"彩\"]::after{content:\"\";position:absolute;inset:0;background:linear-gradient(110deg,transparent 40%,rgba(255,240,190,.16) 50%,transparent 60%);background-size:250% 100%;animation:qyShine 4.4s var(--ease) infinite;pointer-events:none}\n#dl-root .jp-rw-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n#dl-root .jp-rw-h b{font:700 14.5px/1.35 var(--serif);color:#fff}\n#dl-root .jp-rw-t{flex:none;padding:1px 5px;font:800 10.5px/1.4 var(--mono);color:#0b0c10;background:var(--c1,#888)}\n#dl-root .jp-rw[data-tier=\"彩\"] .jp-rw-t{background:linear-gradient(90deg,#FF5A5F,#FFE45C,#3FC1F0,#D96BFF)}\n#dl-root .jp-rw-x{margin-left:auto;flex:none;padding:1px 6px;font:700 10.5px/1.4 var(--mono);letter-spacing:.08em;color:var(--s3);border:1px solid color-mix(in srgb,var(--s3) 55%,transparent);text-shadow:0 0 6px var(--s3)}\n#dl-root .jp-rw p{margin-top:4px;color:var(--tx2);font-size:12px}\n#dl-root .jp-rw-f{display:flex;align-items:center;gap:10px;margin-top:7px;font:600 10.5px/1 var(--mono);color:var(--tx3);letter-spacing:.06em;flex-wrap:wrap}\n#dl-root .jp-rw-f .to{color:var(--tx)}#dl-root .jp-rw-f .to::before{content:\"→ \";color:var(--c1,#888)}\n#dl-root .jp-rw-f .wait{margin-left:auto;display:inline-flex;align-items:center;gap:5px;color:var(--warn)}\n#dl-root .jp-rw-f .wait::before{content:\"\";width:5px;height:5px;background:var(--warn);animation:jpPulse 1.4s ease-in-out infinite}\n#dl-root .jp-rw.new{animation:jpDrop .7s var(--snap) both}\n#dl-root .jp-log{display:grid;gap:2px;margin-top:10px;padding:0;margin-bottom:0;font-size:12px;color:var(--tx3)}\n#dl-root .jp-log li{display:flex;gap:10px;list-style:none}\n#dl-root .jp-log b{font-weight:500;color:var(--tx2)}#dl-root .jp-log time{margin-left:auto;font-family:var(--mono)}\n\n#dl-root .jp-toast{position:absolute;left:50%;bottom:14px;z-index:30;max-width:calc(100% - 32px);padding:9px 16px;font:600 13px/1.4 var(--serif);letter-spacing:.06em;color:var(--s2);background:var(--s1);box-shadow:0 0 24px var(--sg);transform:translateX(-50%);animation:jpToast 2.6s var(--ease) both;pointer-events:none}\n#dl-root .jp-spark{position:absolute;z-index:25;width:4px;height:4px;background:var(--c,#fff);box-shadow:0 0 6px var(--c,#fff);pointer-events:none}\n\n#dl-root .jp-dk{display:inline-flex;align-items:center;gap:5px;padding:2px 6px;font:700 12px/1 ui-monospace,Consolas,monospace;color:var(--s1);font-variant-numeric:tabular-nums;background:transparent;border:0;cursor:pointer;white-space:nowrap}\n#dl-root .jp-dk svg{width:15px;height:15px;flex:none;filter:drop-shadow(0 0 4px var(--sg))}\n#dl-root .jp-dk small{font-weight:500;color:var(--dl-ink3,#7a8090)}\n#dl-root .jp-dk[data-k=\"dim\"]{color:var(--dl-ink3,#7a8090)}\n#dl-root .jp-dk[data-k=\"hot\"] svg{animation:jpPulse 1.6s ease-in-out infinite}\n#dl-root .jp-dk .dot{width:6px;height:6px;background:var(--s3);box-shadow:0 0 6px var(--s3)}\n\n/* ── 正文 <系统> 标签六套皮肤 ── */\n[data-dlp-theme] .sx{position:relative;max-width:560px;margin:16px auto;padding:14px 18px 16px;font:14.5px/1.75 var(--dlp-sans,system-ui,sans-serif);color:#E8ECF2;background:var(--s2);border:1px solid color-mix(in srgb,var(--s1) 45%,transparent);isolation:isolate;overflow:hidden;--dlp-on:#E8ECF2;--dlp-on2:#A9B0BF}\n[data-dlp-theme] .sx-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px}\n[data-dlp-theme] .sx-ding{font:900 15px/1 var(--dlp-serif,serif);letter-spacing:.3em;color:var(--s1)}\n[data-dlp-theme] .sx-nm{font:700 13px/1 var(--dlp-serif,serif);letter-spacing:.2em;color:#fff}\n[data-dlp-theme] .sx-k{margin-left:auto;padding:4px 8px;font:600 11px/1 ui-monospace,Consolas,monospace;letter-spacing:.2em;color:var(--s2);background:var(--s1)}\n[data-dlp-theme] .qt-sx-t{margin:0 0 4px;font:800 15px/1.4 var(--dlp-serif,serif);letter-spacing:.1em;color:#fff}\n[data-dlp-theme] .qt-sx[data-cat=\"警告\"] .sx-k{background:#FF7A86!important;color:#1a0508!important}\n[data-dlp-theme] .qt-sx[data-cat=\"任务失败\"] .sx-k{background:#6f7689!important;color:#fff!important}\n[data-dlp-theme] .sx-line{margin:4px 0 0;min-height:1.5em}\n[data-dlp-theme] .sx.in{animation:sxIn .7s var(--gf-t,0s) cubic-bezier(.7,0,.2,1) both}\n[data-dlp-theme] .sx[data-sys=\"sim\"]{background:linear-gradient(180deg,rgba(8,40,52,.9),rgba(3,16,22,.94)),var(--s2);border-color:rgba(95,227,240,.55);box-shadow:0 0 24px rgba(95,227,240,.16),inset 0 0 30px rgba(95,227,240,.08)}\n[data-dlp-theme] .sx[data-sys=\"sim\"]::before{content:\"\";position:absolute;inset:0;z-index:-1;background:repeating-linear-gradient(0deg,rgba(95,227,240,.06) 0 1px,transparent 1px 3px)}\n[data-dlp-theme] .sx[data-sys=\"sim\"]::after{content:\"\";position:absolute;left:0;right:0;top:-30%;height:30%;background:linear-gradient(180deg,transparent,rgba(95,227,240,.14),transparent);animation:sxScan 3.2s linear infinite;pointer-events:none}\n[data-dlp-theme] .sx[data-sys=\"sim\"] .sx-nm::before{content:\"◇ \";color:var(--s1)}\n[data-dlp-theme] .sx[data-sys=\"sim\"].in{animation:sxGlitch .6s var(--gf-t,0s) steps(6) both}\n[data-dlp-theme] .sx[data-sys=\"pts\"]{padding-left:26px;background:linear-gradient(100deg,rgba(10,36,84,.95),rgba(3,11,28,.96));border-color:rgba(76,155,255,.5);font-family:ui-monospace,Consolas,monospace;font-size:13.5px}\n[data-dlp-theme] .sx[data-sys=\"pts\"]::before{content:\"\";position:absolute;left:9px;top:12px;bottom:12px;width:4px;background:repeating-linear-gradient(180deg,var(--s1) 0 3px,transparent 3px 7px);opacity:.7;animation:sxFlowY 1.2s linear infinite}\n[data-dlp-theme] .sx[data-sys=\"pts\"] .sx-ding{font-family:ui-monospace,Consolas,monospace;letter-spacing:.1em}\n[data-dlp-theme] .sx[data-sys=\"hero\"]{background:radial-gradient(60% 90% at 85% 0%,rgba(185,148,255,.28),transparent 70%),radial-gradient(1px 1px at 20% 30%,#fff8,transparent),radial-gradient(1px 1px at 70% 60%,#fff6,transparent),radial-gradient(1px 1px at 40% 80%,#fff7,transparent),linear-gradient(180deg,#120b26,#07040f);border:1px solid rgba(255,211,107,.45);border-top:2px solid var(--s3)}\n[data-dlp-theme] .sx[data-sys=\"hero\"] .sx-ding{color:var(--s3)}\n[data-dlp-theme] .sx[data-sys=\"hero\"] .sx-k{background:linear-gradient(90deg,var(--s3),var(--s1))}\n[data-dlp-theme] .sx[data-sys=\"hero\"]::after{content:\"\";position:absolute;right:-40px;top:-40px;width:120px;height:120px;border:1px solid rgba(255,211,107,.25);transform:rotate(45deg);box-shadow:0 0 0 10px rgba(185,148,255,.06),0 0 0 22px rgba(185,148,255,.04);animation:sxTurn 18s linear infinite;z-index:-1}\n[data-dlp-theme] .sx[data-sys=\"sign\"]{background:linear-gradient(135deg,rgba(230,181,98,.10),transparent 40%),linear-gradient(180deg,#24160a,#130b04);border:1px solid #8a6328;box-shadow:inset 0 0 0 3px #130b04,inset 0 0 0 4px rgba(230,181,98,.5)}\n[data-dlp-theme] .sx[data-sys=\"sign\"] .sx-ding,[data-dlp-theme] .sx[data-sys=\"sign\"] .sx-nm{color:var(--s3)}\n[data-dlp-theme] .sx[data-sys=\"sign\"] .sx-k{color:#2a1808;background:linear-gradient(180deg,#F4D28E,#B9852F)}\n[data-dlp-theme] .sx[data-sys=\"sign\"]::after{content:\"签\";position:absolute;right:14px;bottom:10px;z-index:-1;display:grid;place-items:center;width:46px;height:46px;font:900 26px/1 var(--dlp-serif,serif);color:rgba(230,181,98,.22);border:2px solid rgba(230,181,98,.22);transform:rotate(-10deg)}\n[data-dlp-theme] .sx[data-sys=\"sign\"].in::after{animation:sxStamp .7s .25s cubic-bezier(.7,0,.2,1) both}\n[data-dlp-theme] .sx[data-sys=\"gacha\"]{padding-top:18px;background:linear-gradient(180deg,#1a1222,#0b0810);border-color:rgba(255,179,65,.4)}\n[data-dlp-theme] .sx[data-sys=\"gacha\"]::before{content:\"\";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#F4F1EA 0 16.6%,#F2D46B 0 33.3%,#C3A2F2 0 50%,#F0565E 0 66.6%,#F6D877 0 83.3%,transparent 0),conic-gradient(from var(--qa,0deg),#FF5A5F,#FFE45C,#3FC1F0,#D96BFF,#FF5A5F);animation:qyHue 4s linear infinite}\n[data-dlp-theme] .sx[data-sys=\"gacha\"]::after{content:\"\";position:absolute;inset:0;z-index:-1;background:linear-gradient(100deg,transparent 35%,rgba(255,236,190,.12),transparent 65%);transform:translateX(-100%);animation:sxSweep 3.4s cubic-bezier(.2,.7,.2,1) infinite}\n[data-dlp-theme] .sx[data-sys=\"chat\"]{background:linear-gradient(180deg,#0c201d,#061210);border-color:rgba(124,245,200,.4);border-left:3px solid var(--s1)}\n[data-dlp-theme] .sx[data-sys=\"chat\"] .sx-ding{font-size:13px;letter-spacing:.1em}\n\n@container jp (max-width:560px){\n  #dl-root .jp-hd{grid-template-columns:auto minmax(0,1fr);padding:14px 16px 12px}\n  #dl-root .jp-hs{grid-column:1/-1;grid-row:auto;justify-content:flex-start;gap:22px;padding-top:6px}\n  #dl-root .jp-hs div{text-align:left}\n  #dl-root .jp-say{grid-column:1/-1}\n  #dl-root .jp-mark{width:44px;height:44px;grid-row:span 1}\n  #dl-root .jp-nm b{font-size:19px}\n  #dl-root .jp-sec{padding:14px 16px}\n  #dl-root .jp-lg{grid-template-columns:1fr}\n  #dl-root .jp-st{flex-wrap:wrap;row-gap:5px;white-space:nowrap}\n  #dl-root .jp-st em{order:3;flex:1 0 100%;padding-left:24px;font-size:10px;letter-spacing:.06em;white-space:normal}\n  #dl-root .jp-tone-row{grid-template-columns:1fr}\n}\n#dl-root[data-motion=\"off\"] .jp *,#dl-root[data-motion=\"off\"] .jp *::before,#dl-root[data-motion=\"off\"] .jp *::after,#dl-root[data-motion=\"off\"] .jp-dk svg,[data-dlp-motion=\"off\"] .sx,[data-dlp-motion=\"off\"] .sx *,[data-dlp-motion=\"off\"] .sx::before,[data-dlp-motion=\"off\"] .sx::after{animation:none!important;transition:none!important}\n#dl-root[data-motion=\"reduced\"] .jp-rw::after,#dl-root[data-motion=\"reduced\"] .jp-say .cur,#dl-root[data-motion=\"reduced\"] .jp-dk[data-k=\"hot\"] svg,[data-dlp-motion=\"reduced\"] .sx::before,[data-dlp-motion=\"reduced\"] .sx::after{animation:none!important}\n@media (prefers-reduced-motion:reduce){#dl-root .jp *,#dl-root .jp *::before,#dl-root .jp *::after,#dl-root .jp-dk svg,[data-dlp-theme] .sx,[data-dlp-theme] .sx *,[data-dlp-theme] .sx::before,[data-dlp-theme] .sx::after{animation:none!important;transition:none!important}}\n`;\n\n  return {\n    GF, INFO, BRIDGE, CSS, TIER, esc, gfOf, mine, dayNo, daysTo, short, year, tierIn,\n    motionOf, still, frag, typeIn, roll, burst, toast, disabled, act, syncBar,\n    lockBanner, caveat, head, bindToneEditor, tasks, rewardCard, ledger, swap, dockMark,\n    parseBlock, systemBlock,\n  };\n}\n\n/* 系统页 · 抽奖（金手指.抽奖）\n * 六色光柱：转盘按六色概率分段；红保底、金保底是两道充能魂环；十连时光柱升起、卡片逐张翻开。\n */\nfunction DLGF_PAGE_抽奖(GF, INFO, BRIDGE, U) {\n  const ODDS = [['白', 38], ['黄', 28], ['紫', 20], ['红', 9.5], ['金', 4], ['彩', 0.5]];\n  const TC = { 白: '#F4F1EA', 黄: '#F2D46B', 紫: '#C3A2F2', 红: '#F0565E', 金: '#F6D877', 彩: '#FFE45C' };\n  const RANK = ['白', '黄', '紫', '红', '金', '彩'];\n  const iconPath = '<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 3.5V12l6 6\"/><circle cx=\"12\" cy=\"12\" r=\"2\" fill=\"currentColor\"/>';\n  const mark = `<svg viewBox=\"-30 -30 60 60\" fill=\"none\" stroke-width=\"3\">\n    <g class=\"ga-mk\">${ODDS.map(([t], i) => `<path d=\"M0 -24 A24 24 0 0 1 ${(24 * Math.sin(Math.PI / 3)).toFixed(1)} ${(-24 * Math.cos(Math.PI / 3)).toFixed(1)}\" stroke=\"${TC[t]}\" transform=\"rotate(${i * 60})\"/>`).join('')}</g>\n    <path d=\"M0-30v10\" stroke=\"currentColor\" stroke-width=\"2\"/><circle r=\"5\" fill=\"currentColor\"/>\n  </svg>`;\n\n  const P = (r, a) => [(r * Math.sin(a)).toFixed(2), (-r * Math.cos(a)).toFixed(2)];\n  function arc(r, a0, a1) {\n    const [x0, y0] = P(r, a0), [x1, y1] = P(r, a1);\n    return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;\n  }\n\n  let lastDraw = null; // { total, n, best, out, tally }：刷新状态栏后仍保留刚抽完的翻牌结果\n\n  function altar(C, lock) {\n    let a = 0;\n    const segs = ODDS.map(([t, p]) => {\n      const da = Math.max(p, 1.6) / 100 * Math.PI * 2;\n      const s = `<path class=\"sg\" data-tier=\"${t}\" d=\"${arc(92, a + 0.01, a + da - 0.01)}\" style=\"stroke:${TC[t]}\"/>`;\n      a += da;\n      return s;\n    }).join('');\n    const red = Math.max(0, Math.min(1, (10 - C.距红保底) / 10));\n    const gold = Math.max(0, Math.min(1, (50 - C.距金保底) / 50));\n    const ringR = 66, ringG = 76;\n    const bonus = C.未出彩 >= 60 ? (C.未出彩 - 59) * 0.5 : 0;\n    const rbPct = Math.min(100, 0.5 + bonus).toFixed(1);\n    return `<section class=\"jp-sec ga-top\" data-part=\"altar\">\n      <div class=\"ga-wheel\">\n        <svg viewBox=\"-110 -110 220 220\" aria-hidden=\"true\">\n          <g class=\"ga-seg\">${segs}</g>\n          <circle r=\"${ringG}\" class=\"tr\"/><path class=\"pg gold\" d=\"${arc(ringG, 0, Math.max(0.001, gold) * Math.PI * 2 - 0.0001)}\"/>\n          <circle r=\"${ringR}\" class=\"tr\"/><path class=\"pg red\" d=\"${arc(ringR, 0, Math.max(0.001, red) * Math.PI * 2 - 0.0001)}\"/>\n          <g class=\"ga-tick\">${Array.from({ length: 60 }, (_, i) => `<path d=\"M0-${i % 5 ? 52 : 50}V-55\" transform=\"rotate(${i * 6})\"/>`).join('')}</g>\n        </svg>\n        <div class=\"ga-core\"><b data-k=\"tk\">${C.券}</b><span>张券</span></div>\n      </div>\n      <div class=\"ga-side\">\n        <div class=\"ga-pity\" data-c=\"red\"><i></i><b>${C.距红保底}</b><span>抽内必出红阶</span><em style=\"--p:${(red * 100).toFixed(0)}%\"></em></div>\n        <div class=\"ga-pity\" data-c=\"gold\"><i></i><b>${C.距金保底}</b><span>抽内必出金阶</span><em style=\"--p:${(gold * 100).toFixed(0)}%\"></em></div>\n        <div class=\"ga-pity\" data-c=\"rb\"><i></i><b>${C.未出彩}</b><span>抽未出彩 · 彩率 ${rbPct}%${C.未出彩 < 60 ? '（满 60 抽后开始加）' : ''}</span></div>\n        <div class=\"ga-go\">\n          <button type=\"button\" class=\"jp-btn\" data-n=\"1\" ${lock || C.券 < 1 ? 'disabled' : ''}>单抽<small>1 券</small></button>\n          <button type=\"button\" class=\"jp-btn pri\" data-n=\"10\" ${lock || C.券 < 10 ? 'disabled' : ''}>十连<small>10 券</small></button>\n        </div>\n        <p class=\"ga-free\">每个外界日补 1 张免费券 · 累计 ${C.累计} 抽</p>\n      </div>\n    </section>`;\n  }\n\n  function cardsHtml(out, flipped) {\n    return out.map((x, i) => `<div class=\"ga-card${flipped ? ' flip' : ''}\" data-tier=\"${U.esc(x.品阶)}\" style=\"--i:${i};--tc:${TC[x.品阶] || '#F4F1EA'}\"><div class=\"in\">\n      <div class=\"b\" aria-hidden=\"true\"><i></i></div>\n      <div class=\"f\"><span class=\"t\">${U.esc(x.品阶)}</span><b>${U.esc(x.名称)}</b>${x.出处 && x.出处 !== '斗罗' ? `<em>跨界 · ${U.esc(x.出处)}</em>` : ''}${x.落点 === '气运' ? '<em class=\"qy\">气运词条</em>' : ''}</div>\n    </div></div>`).join('');\n  }\n\n  function stageHtml(C) {\n    const hit = lastDraw && lastDraw.total === C.累计 ? lastDraw : null;\n    if (!hit) {\n      return '<section class=\"jp-sec ga-stage\" data-part=\"stage\" hidden><div class=\"ga-pillars\"></div><div class=\"ga-cards\"></div><p class=\"ga-sum\"></p></section>';\n    }\n    return `<section class=\"jp-sec ga-stage done\" data-part=\"stage\" data-best=\"${U.esc(hit.best)}\" data-n=\"${hit.n}\">\n      <div class=\"ga-pillars\"></div>\n      <div class=\"ga-cards\">${cardsHtml(hit.out, true)}</div>\n      <p class=\"ga-sum\">本次：${U.esc(hit.tally)}　已放进待入账</p>\n    </section>`;\n  }\n\n  function odds() {\n    return `<section class=\"jp-sec ga-odds\"><details><summary class=\"jp-st\">概率与保底<em>点开看</em></summary>\n      <ul class=\"ga-od\">${ODDS.slice().reverse().map(([t, p]) => `<li data-tier=\"${t}\"><i></i><b>${t}阶</b><span>${p}%</span><em style=\"--w:${(Math.max(p, 0.8) / 38 * 100).toFixed(1)}%\"></em></li>`).join('')}</ul>\n      <p class=\"jp-none\">10 抽没出红及以上，第 10 抽必出红；50 抽没出金及以上，第 50 抽必出金；彩色不保底，未出彩满 60 抽后每抽彩率 +0.5%。抽到紫阶及以上时，有一成会变成同品阶的气运词条。</p>\n    </details></section>`;\n  }\n\n  function recent(C) {\n    const list = Array.isArray(C.最近) ? C.最近 : [];\n    return `<section class=\"jp-sec\" data-part=\"recent\"><h5 class=\"jp-st\">最近出货<em>最多 10 条</em></h5>\n      ${list.length ? `<ol class=\"ga-rc\">${list.map((r) => `<li data-tier=\"${U.esc(r.品阶)}\"><i></i><b>${U.esc(r.名称)}</b><time>${U.short(r.日期)}</time></li>`).join('')}</ol>` : '<p class=\"jp-none\">还没抽过。</p>'}</section>`;\n  }\n\n  function say(G) {\n    const C = G.抽奖, c = (G.口吻 && G.口吻.称呼) || '宿主';\n    if (C.距红保底 <= 3) return `${c}，再抽 ${C.距红保底} 次必出红阶。`;\n    return `${c}现有 ${C.券} 张抽奖券，单抽还是十连？`;\n  }\n\n  let busy = false;\n  async function draw(el, S, kit, n) {\n    if (busy) return;\n    const lock = U.disabled(kit);\n    if (lock) { U.toast(el, lock); return; }\n    busy = true;\n    const btns = [...el.querySelectorAll('.ga-go [data-n]')];\n    btns.forEach((b) => { b.disabled = true; });\n    try {\n      const r = await U.act('抽奖', { n }, { deferRefresh: true });\n      if (!r.ok) { U.toast(el, r.why || '抽奖失败'); busy = false; btns.forEach((b) => { b.disabled = S.金手指.抽奖.券 < Number(b.dataset.n); }); return; }\n      const nextG = r.stat.金手指;\n      const out = r.out || [];\n      const best = out.reduce((m, x) => (RANK.indexOf(x.品阶) > RANK.indexOf(m) ? x.品阶 : m), '白');\n      const tally = RANK.slice().reverse().map((t) => [t, out.filter((x) => x.品阶 === t).length]).filter(([, k]) => k).map(([t, k]) => `${t}×${k}`).join('  ');\n      lastDraw = { total: nextG.抽奖.累计, n, best, out, tally };\n\n      if (U.still(kit)) {\n        busy = false;\n        U.syncBar();\n        return;\n      }\n\n      const st = el.querySelector('.ga-stage');\n      st.hidden = false;\n      st.dataset.best = best;\n      st.dataset.n = String(n);\n      st.classList.remove('go', 'done');\n      void st.offsetWidth;\n      const pil = st.querySelector('.ga-pillars');\n      const cards = st.querySelector('.ga-cards');\n      pil.innerHTML = out.map((x, i) => `<i data-tier=\"${U.esc(x.品阶)}\" style=\"--i:${i};--tc:${TC[x.品阶] || '#F4F1EA'}\"></i>`).join('');\n      cards.innerHTML = cardsHtml(out, false);\n      st.querySelector('.ga-sum').textContent = '';\n      if (st.scrollIntoView) st.scrollIntoView({ block: 'nearest', behavior: 'smooth' });\n      const step = n > 1 ? 180 : 0;\n      const lead = 760;\n      st.classList.add('go');\n      out.forEach((x, i) => setTimeout(() => {\n        if (!el.isConnected) return;\n        const c = cards.children[i];\n        if (!c) return;\n        c.classList.add('flip');\n        if (RANK.indexOf(x.品阶) >= 4) {\n          const hRect = el.getBoundingClientRect(), bRect = c.getBoundingClientRect();\n          U.burst(el, bRect.left - hRect.left + bRect.width / 2, bRect.top - hRect.top + bRect.height / 2,\n            x.品阶 === '彩' ? ['#FF5A5F', '#FFE45C', '#3FC1F0', '#D96BFF', '#5FD88A'] : ['#F6D877', '#FFF1B8', '#fff'], kit, 26, 110);\n          el.classList.remove('ga-flash');\n          void el.offsetWidth;\n          el.classList.add('ga-flash');\n        }\n      }, lead + i * step));\n      setTimeout(() => {\n        busy = false;\n        if (el.isConnected) {\n          st.querySelector('.ga-sum').textContent = `本次：${tally}　已放进待入账`;\n          U.swap(el, 'altar', altar(nextG.抽奖, U.disabled(kit)));\n          U.swap(el, 'recent', recent(nextG.抽奖));\n          U.swap(el, 'ledger', U.ledger(nextG, out.length));\n          U.roll(el.querySelector('[data-k=\"tk2\"]'), nextG.抽奖.券, kit);\n          const call = (nextG.口吻 && nextG.口吻.称呼) || '宿主';\n          U.typeIn(el.querySelector('.jp-say'), RANK.indexOf(best) >= 4 ? `${call}，出${best}阶了！已放入待入账。` : RANK.indexOf(best) >= 3 ? `红光一闪，${call}手气不错。` : `结果已记入待入账，下一次会更好。`, kit);\n        }\n        U.syncBar();\n      }, lead + Math.max(0, out.length - 1) * step + 620);\n    } catch (e) {\n      busy = false;\n      U.toast(el, '抽奖出错：' + ((e && e.message) || e));\n    }\n  }\n\n  function page(S, kit) {\n    const G = U.gfOf(S), C = G.抽奖;\n    const lock = U.disabled(kit);\n    const m = U.motionOf(kit);\n    const el = U.frag(`<div class=\"jp jp-in\" data-sys=\"gacha\" data-motion=\"${m}\">\n      <div class=\"ga-bg\" aria-hidden=\"true\"></div>\n      ${U.lockBanner(lock)}\n      ${U.head(G, { mark, stats: [{ k: 'tk2', v: C.券, u: '张', label: '抽奖券' }] }, kit)}\n      ${altar(C, lock)}\n      ${stageHtml(C)}\n      ${odds()}\n      ${recent(C)}\n      ${U.tasks(G, S)}\n      ${U.ledger(G)}\n      ${U.caveat()}\n    </div>`);\n    [...el.children].forEach((c, i) => c.style.setProperty('--i', String(i)));\n    U.bindToneEditor(el, G, kit);\n    el.addEventListener('click', (e) => {\n      const b = e.target.closest('.ga-go [data-n]');\n      if (b && !b.disabled) draw(el, S, kit, Number(b.dataset.n));\n    });\n    setTimeout(() => U.typeIn(el.querySelector('.jp-say'), say(G), kit), 160);\n    return el;\n  }\n\n  function dock(S, kit) {\n    const C = S.金手指 && S.金手指.抽奖;\n    if (!C) return null;\n    return U.dockMark('gacha', iconPath, `${C.券}<small>券</small>`, C.券 ? '' : 'dim',\n      `抽奖 · ${C.券} 张券 · 距红保底 ${C.距红保底} · 距金保底 ${C.距金保底}`, kit, INFO.页签);\n  }\n\n  const pageCss = `\n#dl-root .jp[data-sys=\"gacha\"]{background:radial-gradient(60% 45% at 50% 0%,rgba(255,179,65,.13),transparent 65%),radial-gradient(50% 40% at 100% 60%,rgba(217,107,255,.08),transparent 70%),linear-gradient(180deg,#120c1a,#07050b)}\n#dl-root .ga-bg{position:absolute;left:0;right:0;top:0;height:3px;z-index:2;background:linear-gradient(90deg,#F4F1EA 0 16.6%,#F2D46B 0 33.3%,#C3A2F2 0 50%,#F0565E 0 66.6%,#F6D877 0 83.3%,transparent 0),conic-gradient(from var(--qa,0deg),#FF5A5F,#FFE45C,#3FC1F0,#D96BFF,#FF5A5F);animation:qyHue 4s linear infinite}\n#dl-root .ga-mk{transform-origin:0 0;animation:jpSpin 10s linear infinite}\n#dl-root .ga-top{display:grid;grid-template-columns:240px minmax(0,1fr);gap:24px;align-items:center}\n#dl-root .ga-wheel{position:relative;aspect-ratio:1}\n#dl-root .ga-wheel svg{width:100%;height:100%;overflow:visible}\n#dl-root .ga-seg{transform-origin:0 0;animation:jpSpin 40s linear infinite}\n#dl-root .ga-seg .sg{fill:none;stroke-width:9;filter:drop-shadow(0 0 4px currentColor)}\n#dl-root .ga-seg .sg[data-tier=\"彩\"]{stroke:#fff!important;animation:gaRb 2s linear infinite}\n@keyframes gaRb{0%{stroke:#FF5A5F}33%{stroke:#FFE45C}66%{stroke:#3FC1F0}100%{stroke:#D96BFF}}\n#dl-root .ga-wheel .tr{fill:none;stroke:rgba(255,255,255,.06);stroke-width:6}\n#dl-root .ga-wheel .pg{fill:none;stroke-width:6;stroke-linecap:butt}\n#dl-root .ga-wheel .pg.red{stroke:#F0565E;filter:drop-shadow(0 0 6px #F0565E);animation:gaCharge 1.8s ease-in-out infinite}\n#dl-root .ga-wheel .pg.gold{stroke:#F6D877;filter:drop-shadow(0 0 6px #F6D877);animation:gaCharge 2.4s ease-in-out infinite}\n@keyframes gaCharge{50%{filter:drop-shadow(0 0 12px currentColor) brightness(1.4)}}\n#dl-root .ga-tick{stroke:rgba(255,179,65,.4);stroke-width:1}\n#dl-root .ga-core{position:absolute;inset:0;display:grid;place-content:center;text-align:center}\n#dl-root .ga-core b{font:800 44px/1 var(--mono);color:#fff;text-shadow:0 0 20px rgba(255,179,65,.7)}\n#dl-root .ga-core span{font:600 11px/1.8 var(--mono);letter-spacing:.3em;color:#FFB341}\n#dl-root .ga-pity{position:relative;display:grid;grid-template-columns:12px auto minmax(0,1fr);gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)}\n#dl-root .ga-pity i{width:10px;height:10px;align-self:center;border-radius:50%;border:2px solid}\n#dl-root .ga-pity[data-c=\"red\"] i{border-color:#F0565E;box-shadow:0 0 8px #F0565E}\n#dl-root .ga-pity[data-c=\"gold\"] i{border-color:#F6D877;box-shadow:0 0 8px #F6D877}\n#dl-root .ga-pity[data-c=\"rb\"] i{border-color:#fff;animation:gaRbB 2s linear infinite}\n@keyframes gaRbB{0%{border-color:#FF5A5F}33%{border-color:#FFE45C}66%{border-color:#3FC1F0}100%{border-color:#D96BFF}}\n#dl-root .ga-pity b{font:800 22px/1 var(--mono);color:#fff}\n#dl-root .ga-pity span{font-size:12px;color:var(--tx2)}\n#dl-root .ga-pity em{position:absolute;left:0;bottom:-1px;height:1px;width:var(--p);background:currentColor}\n#dl-root .ga-pity[data-c=\"red\"] em{color:#F0565E}#dl-root .ga-pity[data-c=\"gold\"] em{color:#F6D877}\n#dl-root .ga-go{display:flex;gap:10px;margin-top:14px}\n#dl-root .jp .ga-go .jp-btn{min-height:50px;padding:6px 24px;font-size:15px;flex-direction:column;gap:3px}\n#dl-root .jp .ga-go .jp-btn small{font:600 10px/1 var(--mono);letter-spacing:.1em;opacity:.75}\n#dl-root .jp .ga-go .jp-btn.pri{background:linear-gradient(100deg,#FFD27A,#FFB341 50%,#FF8A3D);color:#1a0d02;box-shadow:0 0 22px rgba(255,179,65,.5)}\n#dl-root .ga-free{margin-top:8px;font:500 11px/1.4 var(--mono);color:var(--tx3)}\n#dl-root .ga-stage{position:relative;min-height:190px;overflow:hidden;background:radial-gradient(70% 90% at 50% 100%,rgba(255,179,65,.12),transparent 70%)}\n#dl-root .ga-stage[data-best=\"金\"]{background:radial-gradient(70% 90% at 50% 100%,rgba(246,216,119,.28),transparent 70%)}\n#dl-root .ga-stage[data-best=\"彩\"]{background:radial-gradient(70% 90% at 50% 100%,rgba(108,123,255,.3),transparent 70%)}\n#dl-root .ga-pillars{position:absolute;left:20px;right:20px;bottom:0;top:0;display:flex;justify-content:center;gap:4%;pointer-events:none}\n#dl-root .ga-pillars i{flex:0 1 26px;height:100%;background:linear-gradient(0deg,var(--tc),color-mix(in srgb,var(--tc) 30%,transparent) 50%,transparent);filter:blur(5px);opacity:0;transform-origin:50% 100%;transform:scaleY(0)}\n#dl-root .ga-pillars i[data-tier=\"彩\"]{background:linear-gradient(0deg,#FF5A5F,#FFE45C 25%,#3FC1F0 50%,#D96BFF 75%,transparent)}\n#dl-root .ga-stage.go .ga-pillars i{animation:gaPillar 1.6s calc(var(--i) * 60ms) cubic-bezier(.2,.7,.2,1) forwards}\n@keyframes gaPillar{0%{opacity:0;transform:scaleY(0)}40%{opacity:1;transform:scaleY(1)}100%{opacity:.18;transform:scaleY(1)}}\n#dl-root .ga-pillars i[data-tier=\"白\"],#dl-root .ga-pillars i[data-tier=\"黄\"]{flex-basis:14px}\n#dl-root .ga-cards{position:relative;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;perspective:900px}\n#dl-root .ga-stage[data-n=\"1\"] .ga-cards{grid-template-columns:minmax(0,220px);justify-content:center}\n#dl-root .ga-card{height:118px}\n#dl-root .ga-card .in{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.2,.7,.2,1)}\n#dl-root .ga-card.flip .in{transform:rotateY(180deg)}\n#dl-root .ga-card .b,#dl-root .ga-card .f{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}\n#dl-root .ga-card .b{display:grid;place-items:center;background:repeating-linear-gradient(45deg,#2a1a08 0 6px,#1a1006 6px 12px);border:1px solid rgba(255,179,65,.45)}\n#dl-root .ga-card .b i{width:28px;height:28px;border:2px solid #FFB341;transform:rotate(45deg);box-shadow:0 0 10px rgba(255,179,65,.6)}\n#dl-root .ga-card .f{transform:rotateY(180deg);display:flex;flex-direction:column;justify-content:flex-end;gap:3px;padding:10px;border:1px solid color-mix(in srgb,var(--tc) 55%,transparent);background:linear-gradient(0deg,color-mix(in srgb,var(--tc) 30%,#0b0810),#0b0810 85%);overflow:hidden}\n#dl-root .ga-card .f::before{content:\"\";position:absolute;left:0;right:0;top:0;height:3px;background:var(--tc);box-shadow:0 0 12px var(--tc)}\n#dl-root .ga-card[data-tier=\"彩\"] .f::before{background:linear-gradient(90deg,#FF5A5F,#FFE45C,#5FD88A,#3FC1F0,#D96BFF)}\n#dl-root .ga-card[data-tier=\"金\"] .f::after,#dl-root .ga-card[data-tier=\"彩\"] .f::after{content:\"\";position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,241,184,.35) 50%,transparent 60%);background-size:250% 100%;animation:qyShine 2.4s cubic-bezier(.2,.7,.2,1) infinite}\n#dl-root .ga-card .t{position:absolute;right:8px;top:8px;font:900 22px/1 var(--serif);color:var(--tc);text-shadow:0 0 10px var(--tc)}\n#dl-root .ga-card .f b{position:relative;font:700 13px/1.35 var(--serif);color:#fff}\n#dl-root .ga-card .f em{position:relative;font:600 10px/1.3 var(--mono);font-style:normal;color:#D96BFF}\n#dl-root .ga-card .f em.qy{color:#E9D9A6}\n#dl-root .ga-sum{margin-top:12px;text-align:center;font:600 12.5px/1.4 var(--mono);color:#FFB341;letter-spacing:.06em;min-height:1.4em}\n#dl-root .jp.ga-flash::after{content:\"\";position:absolute;inset:0;z-index:40;background:radial-gradient(circle,rgba(255,240,200,.5),transparent 70%);pointer-events:none;animation:gaFlash .6s ease-out forwards}\n@keyframes gaFlash{from{opacity:1}to{opacity:0}}\n#dl-root .ga-odds summary{cursor:pointer;list-style:none}#dl-root .ga-odds summary::-webkit-details-marker{display:none}\n#dl-root .ga-od{display:grid;gap:4px;margin:0 0 10px;padding:0;list-style:none}\n#dl-root .ga-od li{display:grid;grid-template-columns:10px 44px 50px minmax(0,1fr);gap:10px;align-items:center;font-size:12px}\n#dl-root .ga-od li i{width:8px;height:8px;background:var(--c1);transform:rotate(45deg)}\n#dl-root .ga-od li b{color:var(--c1);font-family:var(--serif)}#dl-root .ga-od li span{font-family:var(--mono);color:var(--tx2)}\n#dl-root .ga-od li em{height:4px;width:var(--w);background:var(--c1);box-shadow:0 0 6px var(--c1)}\n#dl-root .ga-rc{display:grid;gap:3px;margin:0;padding:0;list-style:none}\n#dl-root .ga-rc li{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:10px;align-items:center;font-size:12.5px}\n#dl-root .ga-rc i{width:8px;height:8px;background:var(--c1);transform:rotate(45deg);box-shadow:0 0 6px var(--c1)}\n#dl-root .ga-rc b{font-weight:500;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dl-root .ga-rc time{font:500 11px var(--mono);color:var(--tx3)}\n@container jp (max-width:560px){\n  #dl-root .ga-top{grid-template-columns:150px minmax(0,1fr);gap:14px}\n  #dl-root .ga-core b{font-size:30px}\n  #dl-root .ga-pity span{font-size:11px}\n  #dl-root .ga-go{grid-column:1/-1}#dl-root .jp .ga-go .jp-btn{flex:1}\n  #dl-root .ga-cards{grid-template-columns:repeat(2,minmax(0,1fr))}\n  #dl-root .ga-card{height:88px}\n}\n@container jp (max-width:400px){#dl-root .ga-top{grid-template-columns:1fr}#dl-root .ga-wheel{max-width:200px;margin:0 auto;width:100%}}\n#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .ga-seg,#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .ga-bg,#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .ga-mk,#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .ga-wheel .pg,#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .ga-pity[data-c=\"rb\"] i,#dl-root:is([data-motion=\"reduced\"],[data-motion=\"off\"]) .ga-card .f::after{animation:none!important}\n`;\n\n  return {\n    css: U.CSS + pageCss,\n    blocks: { 系统: U.systemBlock },\n    bar: { tab: INFO.页签, iconPath, when: U.mine, page, dock },\n  };\n}\n\nreturn DLGF_PAGE_抽奖(GF, INFO, BRIDGE, DLGF_SHARED(GF, INFO, BRIDGE));";
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
