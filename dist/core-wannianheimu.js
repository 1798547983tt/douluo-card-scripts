// 斗罗远程正文 core-wannianheimu.js 1.1.0
// 斗罗核心·万年黑幕：由 源码/build.py 生成，勿手改。结构见 源码/叙事核心/核心/万年黑幕.js，主页面代码见 源码/叙事核心/页面/，接线见 源码/叙事核心/入口.js。
import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

const CORE = "万年黑幕";
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

/* 万年黑幕·伪神唐王 —— 叙事核心变量结构
 * 字段与规则的出处：源码/提示词/叙事核心/万年黑幕/（定稿，改自 Gemini 交付的 变量设计.md）。
 * CORE_DEF.schema(z)：stat_data.叙事核心 这一块。AI 写 关注、威胁、当前对策、黑幕线索、神王落子、结局；档位由数值算。
 * CORE_DEF.onUpdated(after, before)：一轮更新结束后按主角原作身份与当前部算 模式、瞥视状态；斗3 冻结关注；
 *   叙事核心第一次出现（开局落笔那一轮）时按唐门身份写开局关注与对策。改完由入口再过一遍结构重算档位。
 */
const CORE_DEF = (() => {
  const 关注档 = [[90, '如芒在背'], [70, '神识锁死'], [45, '悬镜常照'], [20, '偶入神眸'], [0, '尘埃未觉']];
  const 威胁档 = [[100, '神罚抹除'], [70, '布局击杀'], [45, '收编驯化'], [20, '暗中干扰'], [0, '无害蝼蚁']];
  const 模式表 = ['棋外变数', '执棋神王', '神王养蛊', '枕边逆鳞'];
  const 瞥视表 = ['未开启', '全开', '残魂半瞥视', '双亲监护', '执棋心算'];
  const 对策表 = ['观望', '干扰', '收编', '驯化', '布局击杀', '强行下界', '亲自出手', '法则抹杀', '潜伏算计'];
  const 进展表 = ['异常', '线索', '猜测', '实证', '误判'];
  const 落子表 = ['酝酿中', '生效中', '已破局', '已应验'];
  const 霍雨浩 = new Set(['霍雨浩', '戴雨浩']);
  const 唐舞桐 = new Set(['唐舞桐', '王冬', '王冬儿']);
  const 蓝轩宇 = new Set(['蓝轩宇', '唐轩宇']);
  const 斗4后期 = 326480801; // 斗罗历32648年08月01日：大神圈锁定归途，神王瞥视重开

  function modeOf(hero) {
    const who = coreWho(hero);
    if (who === '唐三') return '执棋神王';
    if (who === '小舞') return '枕边逆鳞';
    if (霍雨浩.has(who) || 唐舞桐.has(who) || 蓝轩宇.has(who) || who === '唐舞麟') return '神王养蛊';
    return '棋外变数';
  }
  function gazeOf(mode, t) {
    if (mode === '执棋神王') return '执棋心算';
    const part = t && t.当前部;
    if (part === '斗2' || part === '神界' || part === '英雄') return '全开';
    if (part === '斗3') return '残魂半瞥视';
    if (part === '斗4') { const k = coreDateKey(t.外界日期); return k != null && k >= 斗4后期 ? '全开' : '双亲监护'; }
    return '未开启'; // 斗1：唐三尚未飞升；部未定时也按未开启
  }
  /** 唐门身份的开局关注与对策（定稿 变量更新规则“首轮校准”）；其余身份由 AI 第一轮按处境校准 */
  function openingOf(mode, hero, t) {
    const who = coreWho(hero), part = t && t.当前部;
    if (mode === '执棋神王') return { 关注: 50, 当前对策: '潜伏算计' };
    if (mode === '枕边逆鳞') return { 关注: part === '斗1' ? 60 : 90, 当前对策: '观望' };
    if (霍雨浩.has(who)) return { 关注: part === '斗2' ? 45 : 75, 当前对策: '驯化' };
    if (唐舞桐.has(who)) return { 关注: 80, 当前对策: '观望' };
    if (who === '唐舞麟') return { 关注: part === '斗3' ? 0 : 85, 当前对策: '观望' };
    if (蓝轩宇.has(who)) { const k = coreDateKey(t && t.外界日期); return { 关注: k != null && k >= 斗4后期 ? 85 : 50, 当前对策: '观望' }; }
    return null;
  }

  return {
    schema(z) {
      const k = coreKit(z);
      return k.block('万年黑幕', {
        模式: k.pick(模式表, '棋外变数'),
        瞥视状态: k.pick(瞥视表, '未开启'),
        关注: k.int(0), 关注档位: k.derived(),
        威胁: k.int(0), 威胁档位: k.derived(),
        当前对策: k.pick(对策表, '观望'),
        黑幕线索: k.list({ 标题: k.str(), 来源: k.str(), 进展: k.pick(进展表, '异常'), 摘要: k.str() }, 12),
        神王落子: k.list({ 名称: k.str(), 手段: k.str(), 状态: k.pick(落子表, '酝酿中') }, 8),
        结局: k.ending(),
      }, (c) => ({ ...c, 关注档位: TIER(关注档, c.关注), 威胁档位: TIER(威胁档, c.威胁) }));
    },
    onUpdated(after, before) {
      const c = after.叙事核心;
      const prev = before && before.叙事核心 && before.叙事核心.核心 === '万年黑幕' ? before.叙事核心 : null;
      const t = after.时空 || {};
      c.模式 = modeOf(after.主角);
      c.瞥视状态 = gazeOf(c.模式, t);
      if (prev && before.时空 && before.时空.当前部 === '斗3' && t.当前部 === '斗3') c.关注 = prev.关注; // 斗3 全程冻结
      if (!prev && c.关注 === 0 && c.当前对策 === '观望') Object.assign(c, openingOf(c.模式, after.主角, t) || {});
    },
  };
})();

const CORE_PAGE = "/* 叙事核心 · 主页面代码的共用部分\n * 页面文件都只定义工厂函数，样稿页（样稿/叙事核心样稿.html）能直接用 <script> 加载同一份代码：\n *   DLC_SHARED(CORE, INFO) → 共用工具；DLC_PAGE_<核心>(CORE, INFO, U) → { css, blocks, bar, apply? }\n * build.py 把 本文件 + 页面/<核心>.js 拼起来，末尾加一句 return DLC_PAGE_<核心>(CORE, INFO, DLC_SHARED(CORE, INFO))，\n * 整段由核心脚本在主页面里用 new Function('CORE', 'INFO', 代码) 执行：函数都属于主页面，核心脚本的 iframe 关掉以后正文和状态栏照样能调。\n *   blocks 登记进 window.__DL_PROSE_BLOCKS__：{ 标签: { render(段, 工具) } }。段 = { tag, inner, closed }；\n *          工具有 h / sv（建节点）、sub(文字)（把块里的正文照常画成节点）、env（env.stat 是这一层的变量）、playAt()（入场动画已播几秒，不该播为 null）。\n *          块的外层由正文容器带 data-dlp-motion（full / reduced / off）和 data-dlp-surface（浅色聊天背景时为 light）。\n *   bar    登记进 window.__DL_BAR_EXT__：{ tab, when(数据), page(数据, 工具), dock(数据, 工具), iconPath }；工具里 motion 为 full / reduced / off。\n *   apply(最新变量 | null, 主页面 document)：可选，随最新变量改主页面上的全局状态；撤下时传 null。\n */\nfunction DLC_SHARED(CORE, INFO) {\n  const coreOf = (st) => (st && st.叙事核心 && typeof st.叙事核心 === 'object' ? st.叙事核心 : null);\n  const mine = (st) => { const c = coreOf(st); return !!c && c.核心 === CORE; };\n  const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);\n  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));\n  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);\n  const tierOf = (table, v) => { for (let i = 0; i < table.length; i += 1) if (v >= table[i][0]) return { i: table.length - 1 - i, name: table[i][1] }; return { i: 0, name: table[table.length - 1][1] }; };\n\n  /** 块里的内容拆成三样：开头的“键｜值”抬头行、行内小标签（<对策>…</对策> 这类，按名字收集）、剩下的正文 */\n  const META = /^[ \\t]*(视角|来源|主角|台词|死因|下手|所斩|类型|代价|所得|神祇|发布者|场面|内容|期限|奖励|惩罚|状态|赏赐|落点|人物|表面|图谋|筹码|利弊|姿态|主谋|目标|面具|对象|标题|本源|违和|判定|代号|职能)[ \\t]*[｜|][ \\t]*(.*)$/u;\n  function parseBlock(inner, inlineTags) {\n    const meta = {}, tags = {};\n    let text = String(inner == null ? '' : inner);\n    for (const t of inlineTags || []) {\n      tags[t] = [];\n      text = text.replace(new RegExp(`<${t}>([\\\\s\\\\S]*?)(?:</${t}>|$)`, 'gu'), (_, x) => { tags[t].push(x.trim()); return ''; });\n    }\n    const lines = text.replace(/^\\n+/u, '').split('\\n');\n    while (lines.length) {\n      const m = META.exec(lines[0]);\n      if (!m) { if (!lines[0].trim()) { lines.shift(); continue; } break; }\n      if (!(m[1] in meta)) meta[m[1]] = m[2].trim();\n      lines.shift();\n    }\n    return { meta, tags, body: lines.join('\\n').trim() };\n  }\n  /** 入场动画：正文给了“已播几秒”就带 data-play 和负的延迟，重画时接着播，不从头再来 */\n  function play(kit) {\n    const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null;\n    return t == null ? {} : { 'data-play': true, style: { '--dlc-t': `-${t.toFixed(2)}s` } };\n  }\n  const part = (st) => (st && st.时空 && st.时空.当前部) || null;\n  const date = (st) => String((st && st.时空 && st.时空.外界日期) || '').replace(/^斗罗历/u, '');\n  /** 结局块的通用拆法 */\n  const endingOf = (inner) => parseBlock(inner, []);\n  /** 只认结局对象里真写下的 */\n  const ended = (c) => !!(c && c.结局 && c.结局.已终结 === true);\n\n  return { CORE, INFO, coreOf, mine, num, clamp, list, tierOf, parseBlock, play, part, date, endingOf, ended };\n}\n\n/* 万年黑幕·伪神唐王 · 主页面代码（外观以 样稿/叙事核心样稿.html 为准）\n * 正文：<瞥视>（神王视窗：海图暗底、取景角、扫描线、三叉戟瞳孔；视角不同换色，<对策> 按烈度分冷蓝 / 暗金 / 修罗血三档）、<结局>（已被抹除）。\n * 状态栏：页签“万年黑幕”（神王之眼、关注与威胁刻度尺、神王落子、黑幕线索）；底栏一只按关注开合的眼睛。\n */\nfunction DLC_PAGE_万年黑幕(CORE, INFO, U) {\n  const 关注档 = [[90, '如芒在背'], [70, '神识锁死'], [45, '悬镜常照'], [20, '偶入神眸'], [0, '尘埃未觉']];\n  const 威胁档 = [[100, '神罚抹除'], [70, '布局击杀'], [45, '收编驯化'], [20, '暗中干扰'], [0, '无害蝼蚁']];\n  const CALM = ['观望', '潜伏算计'], KILL = ['布局击杀', '强行下界', '亲自出手', '法则抹杀'];\n  const planTier = (k) => (KILL.includes(k) ? 'kill' : CALM.includes(k) ? 'calm' : k ? 'gold' : null);\n  const STEPS = ['异常', '线索', '猜测', '实证'];\n  let seq = 0;\n  const uid = () => `dlcwh${(seq += 1)}${Math.random().toString(36).slice(2, 6)}`;\n\n  /** 视角 → 配色与标题：神王本尊、识海残魂老唐、位面之主唐昊、生命核心阿银、扮唐三时的心算 */\n  function povOf(text) {\n    const s = String(text || '');\n    if (/心算/u.test(s)) return { key: 'mind', title: '神王心算' };\n    if (/老唐|残魂/u.test(s)) return { key: 'ghost', title: '残魂一瞥' };\n    if (/唐昊/u.test(s)) return { key: 'hao', title: '位面之瞥' };\n    if (/阿银/u.test(s)) return { key: 'yin', title: '生命之瞥' };\n    return { key: 'god', title: '神王瞥视' };\n  }\n\n  /** 神王之眼：open 0（闭）到 4（全开），kill 时瞳孔转修罗血色 */\n  function eye(sv, open, kill, cls) {\n    const id = uid(), L = [1.2, 6, 11, 15.5, 19][U.clamp(open, 0, 4)];\n    const up = `M8 32 Q60 ${32 - L * 2.3} 112 32`, lo = `M8 32 Q60 ${32 + L * 2.3} 112 32`;\n    const rays = [];\n    for (let i = 0; i < 9; i += 1) {\n      const a = (-160 + i * 17.5) * Math.PI / 180, r1 = 25 + (i % 2) * 2, r2 = r1 + 5 + (i % 3);\n      rays.push(sv('line', { x1: (60 + Math.cos(a) * r1).toFixed(1), y1: (34 + Math.sin(a) * r1).toFixed(1), x2: (60 + Math.cos(a) * r2).toFixed(1), y2: (34 + Math.sin(a) * r2).toFixed(1) }));\n    }\n    return sv('svg', { class: cls, viewBox: '0 0 120 64', 'aria-hidden': 'true', 'data-open': open, 'data-kill': kill ? true : null },\n      sv('defs', null, sv('clipPath', { id }, sv('path', { d: `${up} Q60 ${32 + L * 2.3} 8 32Z` }))),\n      sv('g', { class: 'dlc-wh-rays' }, rays),\n      sv('g', { class: 'dlc-wh-lidg' },\n        sv('g', { 'clip-path': `url(#${id})` },\n          sv('rect', { x: 0, y: 0, width: 120, height: 64, class: 'dlc-wh-sclera' }),\n          sv('g', { class: 'dlc-wh-iris' },\n            sv('circle', { cx: 60, cy: 32, r: 14, class: 'dlc-wh-irisc' }),\n            sv('circle', { cx: 60, cy: 32, r: 9, class: 'dlc-wh-irisr' }),\n            sv('path', { d: 'M60 21V43M54.5 23.5V28.5Q54.5 32 60 32Q65.5 32 65.5 28.5V23.5M60 21l-2 3.2h4Z', class: 'dlc-wh-pupil' }),\n            sv('circle', { cx: 54, cy: 26.5, r: 1.6, class: 'dlc-wh-glint' }))),\n        sv('path', { d: up, class: 'dlc-wh-lid' }),\n        sv('path', { d: lo, class: 'dlc-wh-lid dlc-wh-lid2' })));\n  }\n  /** 背景的海图潮线 */\n  function tide(sv) {\n    const wave = (y, a) => `M0 ${y}` + Array.from({ length: 8 }, (_, i) => ` q25 ${i % 2 ? a : -a} 50 0`).join('');\n    return sv('svg', { class: 'dlc-wh-tide', viewBox: '0 0 400 120', preserveAspectRatio: 'none', 'aria-hidden': 'true' },\n      sv('path', { d: wave(30, 6) }), sv('path', { d: wave(62, 9) }), sv('path', { d: wave(94, 5) }));\n  }\n  const corners = (h) => ['tl', 'tr', 'bl', 'br'].map((p) => h('i', { class: `dlc-wh-c dlc-wh-c-${p}`, 'aria-hidden': 'true' }));\n\n  // ───────── 正文：<瞥视> ─────────\n  function gaze(p, kit) {\n    const { h, sv } = kit;\n    const b = U.parseBlock(p.inner, ['对策']);\n    const pov = povOf(b.meta.视角);\n    const plan = b.tags.对策.length ? b.tags.对策[b.tags.对策.length - 1] : '';\n    const [kind, ...rest] = plan.split(/[｜|]/u);\n    const c = U.coreOf(kit.env && kit.env.stat);\n    const tier = planTier(kind && kind.trim()) || (c ? (U.num(c.威胁) >= 70 ? 'kill' : U.num(c.威胁) >= 20 ? 'gold' : 'calm') : 'calm');\n    const look = c ? U.tierOf(关注档, U.num(c.关注)).i : 3;\n    const when = U.date(kit.env && kit.env.stat);\n    return h('section', { class: 'dlc-wh dlc-wh-gaze', 'data-pov': pov.key, 'data-tier': tier, 'data-writing': p.closed ? null : true, ...U.play(kit) },\n      tide(sv), h('div', { class: 'dlc-wh-scan', 'aria-hidden': 'true' }), corners(h),\n      h('header', { class: 'dlc-wh-head' },\n        eye(sv, Math.max(2, look), tier === 'kill', 'dlc-wh-eye'),\n        h('div', { class: 'dlc-wh-title' },\n          h('b', { text: pov.title }),\n          h('span', { text: `视角｜${b.meta.视角 || '神王唐三'}` })),\n        when ? h('span', { class: 'dlc-wh-stamp', text: `密档 · ${when}` }) : null),\n      h('div', { class: 'dlc-wh-body' }, kit.sub(b.body)),\n      plan ? h('footer', { class: 'dlc-wh-plan', 'data-tier': tier },\n        h('span', { class: 'dlc-wh-chip', text: (kind || '对策').trim() }),\n        h('span', { class: 'dlc-wh-plan-t', text: rest.join('｜').trim() })) : null);\n  }\n\n  // ───────── 正文：<结局> ─────────\n  function trident(sv) {\n    return sv('svg', { class: 'dlc-wh-tri', viewBox: '0 0 60 160', 'aria-hidden': 'true' },\n      sv('path', { d: 'M30 4l-6 14h4v44h4V18h4ZM10 22l-4 12h3v18q0 14 17 16v-5q-12-2-12-11V34h3ZM50 22l4 12h-3v18q0 14-17 16v-5q12-2 12-11V34h-3Z' }),\n      sv('path', { d: 'M28 64h4v92h-4Z' }),\n      sv('path', { d: 'M22 70h16v4H22ZM24 150h12v6H24Z', class: 'dlc-wh-tri2' }));\n  }\n  function ending(p, kit) {\n    const { h, sv } = kit;\n    const b = U.endingOf(p.inner);\n    return h('section', { class: 'dlc-wh dlc-wh-end', 'data-writing': p.closed ? null : true, ...U.play(kit) },\n      tide(sv), corners(h), trident(sv),\n      h('div', { class: 'dlc-wh-end-k', text: '因果收束' }),\n      h('h3', { class: 'dlc-wh-end-t' }, h('span', { text: '已被抹除' }), h('i', { class: 'dlc-wh-redact', 'aria-hidden': 'true' })),\n      (b.meta.死因 || b.meta.下手) ? h('dl', { class: 'dlc-wh-end-m' },\n        b.meta.死因 ? [h('dt', { text: '死因' }), h('dd', { text: b.meta.死因 })] : null,\n        b.meta.下手 ? [h('dt', { text: '下手' }), h('dd', { text: b.meta.下手 })] : null) : null,\n      h('div', { class: 'dlc-wh-body' }, kit.sub(b.body)),\n      h('footer', { class: 'dlc-wh-end-f', text: '此局已终 · 历史合拢，异数的痕迹被一一抹平' }));\n  }\n\n  // ───────── 状态栏 ─────────\n  function gauge(h, label, v, table, grows, extra) {\n    const t = U.tierOf(table, v);\n    return h('div', { class: 'dlc-whp-g', 'data-tier': t.i, style: { '--v': (U.clamp(v, 0, 100) / 100).toFixed(3) } },\n      h('div', { class: 'dlc-whp-g-h' }, h('span', { text: label }), h('b', { text: String(v) }), h('em', { text: t.name }), extra || null),\n      h('div', { class: 'dlc-whp-g-t' },\n        h('div', { class: 'dlc-whp-g-seg' }, table.slice().reverse().map(([, name], i) => h('span', { style: { 'flex-grow': grows[i] }, 'data-on': i <= t.i ? true : null, text: name }))),\n        h('i', { class: 'dlc-whp-g-fill' }), h('i', { class: 'dlc-whp-g-needle' })));\n  }\n  const MOVE = { 酝酿中: 'brew', 生效中: 'live', 已破局: 'broken', 已应验: 'done' };\n  function page(st, kit) {\n    const { h, sv } = kit;\n    const c = U.coreOf(st) || {};\n    const 关注 = U.num(c.关注), 威胁 = U.num(c.威胁), kill = 威胁 >= 70;\n    const frozen = c.瞥视状态 === '残魂半瞥视';\n    const moves = U.list(c.神王落子).slice().reverse(), clues = U.list(c.黑幕线索).slice().reverse();\n    const plan = c.当前对策 || '观望';\n    return h('div', { class: 'dlc-whp', 'data-m': kit.motion || 'full', 'data-kill': kill ? true : null },\n      U.ended(c) ? h('div', { class: 'dlc-whp-end' }, h('b', { text: '已被抹除' }), h('span', { text: `${c.结局.死因 || ''}${c.结局.下手 ? ' · ' + c.结局.下手 : ''}` })) : null,\n      h('header', { class: 'dlc-whp-top' },\n        h('div', { class: 'dlc-whp-eyebox' }, eye(sv, U.tierOf(关注档, 关注).i, kill, 'dlc-wh-eye dlc-whp-eye'), tide(sv)),\n        h('div', { class: 'dlc-whp-id' },\n          h('div', { class: 'dlc-whp-k', text: '叙事核心' }),\n          h('h4', null, '万年黑幕', h('small', { text: '·伪神唐王' })),\n          h('div', { class: 'dlc-whp-tags' },\n            h('span', { class: 'dlc-whp-tag', text: c.模式 || '棋外变数' }),\n            h('span', { class: 'dlc-whp-tag', 'data-gaze': c.瞥视状态 || '未开启', text: `瞥视 · ${c.瞥视状态 || '未开启'}` }),\n            h('span', { class: 'dlc-wh-chip', 'data-tier': planTier(plan), text: plan })),\n          h('p', { class: 'dlc-whp-q', text: INFO.引 }))),\n      h('section', { class: 'dlc-whp-gauges' },\n        gauge(h, '关注', 关注, 关注档, [20, 25, 25, 20, 11], frozen ? h('i', { class: 'dlc-whp-lock', text: '斗3 冻结' }) : null),\n        gauge(h, '威胁', 威胁, 威胁档, [20, 25, 25, 30, 4])),\n      h('section', { class: 'dlc-whp-sec' },\n        h('h5', null, '神王落子', h('span', { text: `${moves.length}/8` })),\n        moves.length ? h('ol', { class: 'dlc-whp-moves' }, moves.map((m) => h('li', { 'data-s': MOVE[m.状态] || 'brew' },\n          h('i', { class: 'dlc-whp-piece', 'aria-hidden': 'true' }),\n          h('div', null, h('b', { text: m.名称 || '未名之子' }), h('p', { text: m.手段 || '' })),\n          h('em', { text: m.状态 || '酝酿中' }))))\n          : h('p', { class: 'dlc-whp-none', text: '棋盘上还没有落到你身上的子。' })),\n      h('section', { class: 'dlc-whp-sec' },\n        h('h5', null, '黑幕线索', h('span', { text: `${clues.length}/12` })),\n        clues.length ? h('div', { class: 'dlc-whp-clues' }, clues.map((x) => {\n          const k = STEPS.indexOf(x.进展), wrong = x.进展 === '误判';\n          return h('article', { class: 'dlc-whp-clue', 'data-wrong': wrong ? true : null },\n            h('div', { class: 'dlc-whp-steps' }, STEPS.map((s, i) => h('i', { 'data-on': !wrong && i <= k ? true : null, text: s[0] })), wrong ? h('i', { class: 'dlc-whp-x', text: '误判' }) : null),\n            h('b', { text: x.标题 || '无题' }),\n            h('p', { text: x.摘要 || '' }),\n            x.来源 ? h('small', { text: `来源 · ${x.来源}` }) : null);\n        })) : h('p', { class: 'dlc-whp-none', text: '你还什么都没发现。历史看上去和书里写的一样。' })));\n  }\n  function dock(st, kit) {\n    const c = U.coreOf(st) || {};\n    const 关注 = U.num(c.关注), kill = U.num(c.威胁) >= 70;\n    return kit.h('span', { class: 'dlc-whd', 'data-m': kit.motion || 'full', 'data-kill': kill ? true : null, title: `万年黑幕 · 关注 ${关注}（${U.tierOf(关注档, 关注).name}）· 威胁 ${U.num(c.威胁)}` },\n      eye(kit.sv, Math.max(1, U.tierOf(关注档, 关注).i), kill, 'dlc-wh-eye dlc-whd-eye'), kit.h('b', { text: String(关注) }));\n  }\n\n  const css = `\n.dlc-wh,.dlc-whp,.dlc-whd{--wh-ink:#060C0F;--wh-p1:#0A1418;--wh-p2:#0F2027;--wh-gold:#C7A466;--wh-gold2:#EBD49A;--wh-teal:#5FB6B0;--wh-teal2:#93E2D8;--wh-cold:#6E9FD6;--wh-blood:#C9264E;--wh-blood2:#5E0B20;--wh-txt:#D6E3E2;--wh-txt2:#8EA8AA;--a1:var(--wh-gold);--a2:var(--wh-teal)}\n.dlc-wh{position:relative;isolation:isolate;overflow:hidden;margin:1.15em 0;color:var(--wh-txt);font-family:var(--dlp-serif,serif);\n  --dlp-on:var(--wh-txt);--dlp-on2:var(--wh-txt2);--dlp-on-line:rgba(199,164,102,.3)}\n.dlc-wh[data-pov=ghost]{--a1:#A9BFCB;--a2:#62808E}\n.dlc-wh[data-pov=hao]{--a1:#A493D6;--a2:#C7A466}\n.dlc-wh[data-pov=yin]{--a1:#86D3BE;--a2:#A7CBEA}\n.dlc-wh[data-tier=kill]{--a1:#E0B76A}\n/* 视窗 */\n.dlc-wh-gaze{padding:12px 16px 12px 18px;border:1px solid color-mix(in srgb,var(--a1) 32%,transparent);\n  background:radial-gradient(120% 90% at 0 0,rgba(95,182,176,.14),transparent 60%),radial-gradient(90% 120% at 100% 100%,rgba(199,164,102,.11),transparent 55%),linear-gradient(180deg,var(--wh-p2),var(--wh-p1) 55%,var(--wh-ink));\n  box-shadow:inset 0 0 0 3px rgba(6,12,15,.85),inset 0 0 0 4px color-mix(in srgb,var(--a1) 14%,transparent)}\n.dlc-wh-gaze[data-pov=mind]{background:repeating-conic-gradient(rgba(199,164,102,.055) 0 25%,transparent 0 50%) 0 0/26px 26px,linear-gradient(180deg,#141A16,var(--wh-p1) 60%,var(--wh-ink))}\n.dlc-wh-gaze[data-pov=ghost]{border-style:dashed}\n.dlc-wh-gaze[data-pov=ghost] .dlc-wh-body{opacity:.88;text-shadow:1.5px 0 rgba(169,191,203,.22)}\n.dlc-wh-gaze[data-tier=kill]{border-color:rgba(201,38,78,.55);box-shadow:inset 0 0 0 3px rgba(6,12,15,.85),inset 0 0 0 4px rgba(201,38,78,.22),inset 0 -40px 60px -40px rgba(201,38,78,.35)}\n.dlc-wh-c{position:absolute;width:13px;height:13px;border:0 solid var(--a1);z-index:2;pointer-events:none}\n.dlc-wh-c-tl{top:5px;left:5px;border-width:2px 0 0 2px}.dlc-wh-c-tr{top:5px;right:5px;border-width:2px 2px 0 0}\n.dlc-wh-c-bl{bottom:5px;left:5px;border-width:0 0 2px 2px}.dlc-wh-c-br{bottom:5px;right:5px;border-width:0 2px 2px 0}\n.dlc-wh[data-tier=kill] .dlc-wh-c{border-color:var(--wh-blood)}\n.dlc-wh-tide{position:absolute;left:0;top:0;width:200%;height:100%;z-index:-1;fill:none;stroke:var(--a2);stroke-width:.8;opacity:.16;pointer-events:none}\n.dlc-wh-scan{position:absolute;left:0;right:0;top:-45%;height:40%;z-index:0;pointer-events:none;opacity:0;\n  background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--a2) 6%,transparent) 70%,color-mix(in srgb,var(--a2) 26%,transparent) 99%,transparent)}\n.dlc-wh-head{position:relative;z-index:1;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;margin:0 0 8px}\n.dlc-wh-eye{width:58px;height:31px;overflow:visible}\n.dlc-wh-rays{stroke:var(--a1);stroke-width:1.2;opacity:.65;transform-origin:60px 34px}\n.dlc-wh-sclera{fill:#03080A}\n.dlc-wh-irisc{fill:#071216;stroke:var(--a2);stroke-width:1.6}\n.dlc-wh-irisr{fill:none;stroke:var(--a1);stroke-width:.8;opacity:.55;stroke-dasharray:2 2.4}\n.dlc-wh-pupil{fill:var(--a1);stroke:var(--a1);stroke-width:1.9;stroke-linecap:square}\n.dlc-wh-glint{fill:#fff;opacity:.75}\n.dlc-wh-lid{fill:none;stroke:var(--a1);stroke-width:1.5}\n.dlc-wh-lid2{opacity:.6}\n.dlc-wh-lidg{transform-box:view-box;transform-origin:60px 32px}\nsvg[data-kill] .dlc-wh-pupil{fill:var(--wh-blood);stroke:var(--wh-blood)}\nsvg[data-kill] .dlc-wh-irisc{stroke:var(--wh-blood);fill:#1A0309}\nsvg[data-kill] .dlc-wh-rays{stroke:var(--wh-blood)}\n.dlc-wh-title{display:flex;flex-direction:column;min-width:0;line-height:1.25}\n.dlc-wh-title b{font-size:15px;letter-spacing:.42em;color:var(--a1);font-weight:700}\n.dlc-wh-title span{font-family:var(--dlp-sans,sans-serif);font-size:11.5px;letter-spacing:.12em;color:var(--a2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dlc-wh[data-writing] .dlc-wh-title b::after{content:'▍';margin-left:.2em;letter-spacing:0;color:var(--a2)}\n.dlc-wh-stamp{font-family:var(--dlp-mono,monospace);font-size:10.5px;letter-spacing:.08em;color:var(--a1);border:1px solid color-mix(in srgb,var(--a1) 55%,transparent);padding:2px 6px;transform:rotate(-2.5deg);opacity:.85;white-space:nowrap}\n.dlc-wh-body{position:relative;z-index:1;padding:2px 0 2px 13px;border-left:1px solid color-mix(in srgb,var(--a1) 30%,transparent);\n  background:repeating-linear-gradient(180deg,color-mix(in srgb,var(--a1) 40%,transparent) 0 1px,transparent 1px 14px) left top/4px 100% no-repeat}\n.dlc-wh-body>:first-child{margin-top:0}.dlc-wh-body>:last-child{margin-bottom:0}\n.dlc-wh-plan{position:relative;z-index:1;display:flex;align-items:baseline;gap:10px;margin-top:10px;padding-top:9px;border-top:1px solid color-mix(in srgb,var(--a1) 22%,transparent);font-family:var(--dlp-sans,sans-serif);font-size:13px}\n.dlc-wh-chip{flex:none;display:inline-block;padding:2px 14px 2px 9px;font-family:var(--dlp-sans,sans-serif);font-size:12px;font-weight:700;letter-spacing:.2em;color:#07100F;background:var(--wh-cold);\n  clip-path:polygon(0 0,calc(100% - 8px) 0,100% 50%,calc(100% - 8px) 100%,0 100%)}\n[data-tier=calm]>.dlc-wh-chip,.dlc-wh-chip[data-tier=calm]{background:var(--wh-cold)}\n[data-tier=gold]>.dlc-wh-chip,.dlc-wh-chip[data-tier=gold]{background:var(--wh-gold)}\n[data-tier=kill]>.dlc-wh-chip,.dlc-wh-chip[data-tier=kill]{background:var(--wh-blood);color:#FCE9EE}\n.dlc-wh-plan-t{color:var(--wh-txt)}\n/* 结局 */\n.dlc-wh-end{padding:22px 20px 16px 74px;text-align:left;border:1px solid rgba(201,38,78,.5);\n  background:radial-gradient(80% 120% at 0 50%,rgba(201,38,78,.22),transparent 60%),linear-gradient(160deg,#16070C,var(--wh-ink) 55%,#05090B)}\n.dlc-wh-end .dlc-wh-c{border-color:var(--wh-blood)}\n.dlc-wh-tri{position:absolute;left:14px;top:10px;width:40px;height:calc(100% - 20px);fill:var(--wh-gold);opacity:.9}\n.dlc-wh-tri2{fill:var(--wh-blood)}\n.dlc-wh-end-k{font-family:var(--dlp-sans,sans-serif);font-size:11px;letter-spacing:.5em;color:var(--wh-blood)}\n.dlc-wh-end-t{position:relative;display:inline-block;margin:4px 0 12px;font-size:30px;line-height:1.1;letter-spacing:.32em;color:var(--wh-gold2);font-weight:900}\n.dlc-wh-redact{position:absolute;left:-4px;right:.1em;top:55%;height:5px;background:var(--wh-blood);transform-origin:left center}\n.dlc-wh-end-m{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0 0 12px;font-size:13.5px}\n.dlc-wh-end-m dt{font-family:var(--dlp-sans,sans-serif);letter-spacing:.3em;color:var(--wh-blood)}\n.dlc-wh-end-m dd{margin:0;color:var(--wh-txt)}\n.dlc-wh-end .dlc-wh-body{border-left-color:rgba(201,38,78,.4)}\n.dlc-wh-end-f{margin-top:12px;font-family:var(--dlp-sans,sans-serif);font-size:11.5px;letter-spacing:.18em;color:var(--wh-txt2)}\n/* 动效：只在“完整”档 */\n[data-dlp-motion=full] .dlc-wh-tide{animation:dlcWhTide 22s linear infinite}\n[data-dlp-motion=full] .dlc-wh-scan{animation:dlcWhScan 5.6s cubic-bezier(.45,0,.55,1) infinite}\n[data-dlp-motion=full] .dlc-wh[data-writing] .dlc-wh-scan{animation-duration:1.5s}\n[data-dlp-motion=full] .dlc-wh-rays{animation:dlcWhSpin 46s linear infinite}\n[data-dlp-motion=full] .dlc-wh-iris{animation:dlcWhLook 9s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-wh-lidg{animation:dlcWhBlink 7.5s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-wh-gaze[data-pov=ghost]{animation:dlcWhGhost 5s steps(1) infinite}\n[data-dlp-motion=full] .dlc-wh-gaze[data-tier=kill] .dlc-wh-chip{animation:dlcWhBeat 1.6s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-wh-gaze[data-tier=kill]::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:linear-gradient(90deg,transparent,var(--wh-blood),transparent);animation:dlcWhVein 2.4s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-wh[data-play] .dlc-wh-c{animation:dlcWhCorner .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--dlc-t,0s)}\n[data-dlp-motion=full] .dlc-wh[data-play] .dlc-wh-eye .dlc-wh-lidg{animation:dlcWhOpen 1.1s cubic-bezier(.3,.7,.2,1) both,dlcWhBlink 7.5s ease-in-out 1.1s infinite;animation-delay:var(--dlc-t,0s),calc(var(--dlc-t,0s) + 1.1s)}\n[data-dlp-motion=full] .dlc-wh[data-play] .dlc-wh-body,[data-dlp-motion=full] .dlc-wh[data-play] .dlc-wh-plan{animation:dlcWhRise .7s ease-out both;animation-delay:calc(var(--dlc-t,0s) + .35s)}\n[data-dlp-motion=full] .dlc-wh-end[data-play] .dlc-wh-tri{animation:dlcWhDrop .9s cubic-bezier(.5,0,.3,1.3) both;animation-delay:var(--dlc-t,0s)}\n[data-dlp-motion=full] .dlc-wh-end[data-play] .dlc-wh-redact{animation:dlcWhRedact 1.2s cubic-bezier(.7,0,.2,1) both;animation-delay:calc(var(--dlc-t,0s) + .5s)}\n[data-dlp-motion=full] .dlc-wh-end[data-play] .dlc-wh-end-t span{animation:dlcWhSlam .5s cubic-bezier(.2,.9,.3,1.4) both;animation-delay:calc(var(--dlc-t,0s) + .25s)}\n[data-dlp-motion=reduced] .dlc-wh[data-play] .dlc-wh-body{animation:dlcWhRise .3s ease-out both}\n@keyframes dlcWhTide{to{transform:translateX(-50%)}}\n@keyframes dlcWhScan{0%{top:-45%;opacity:0}12%{opacity:1}85%{opacity:1}100%{top:105%;opacity:0}}\n@keyframes dlcWhSpin{to{transform:rotate(360deg)}}\n@keyframes dlcWhLook{0%,100%{transform:translateX(0)}22%{transform:translateX(-5px)}30%{transform:translateX(-5px) translateY(1px)}58%{transform:translateX(5px)}70%{transform:translateX(4px) translateY(-1px)}}\n@keyframes dlcWhBlink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}\n@keyframes dlcWhOpen{0%{transform:scaleY(.04)}55%{transform:scaleY(.04)}100%{transform:scaleY(1)}}\n@keyframes dlcWhGhost{0%,100%{opacity:1}31%{opacity:.82}33%{opacity:1}71%{opacity:.9}72%{opacity:1}}\n@keyframes dlcWhBeat{0%,100%{filter:none}12%{filter:brightness(1.5) drop-shadow(0 0 6px rgba(201,38,78,.9))}24%{filter:none}36%{filter:brightness(1.3)}}\n@keyframes dlcWhVein{0%,100%{opacity:.35}50%{opacity:1}}\n@keyframes dlcWhCorner{from{transform:scale(2.6);opacity:0}to{transform:none;opacity:1}}\n@keyframes dlcWhRise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}\n@keyframes dlcWhDrop{from{transform:translateY(-70%);opacity:0;filter:blur(3px)}to{transform:none;opacity:.9;filter:none}}\n@keyframes dlcWhRedact{0%{transform:scaleX(0)}55%{transform:scaleX(1);height:1.15em;top:-.05em}100%{transform:scaleX(1);height:5px;top:55%}}\n@keyframes dlcWhSlam{from{transform:scale(1.5);opacity:0;letter-spacing:.6em}to{transform:none;opacity:1}}\n/* 状态栏页 */\n.dlc-whp{position:relative;isolation:isolate;color:var(--wh-txt);font-family:\"Noto Serif SC\",\"Source Han Serif SC\",\"Songti SC\",serif;background:linear-gradient(180deg,var(--wh-p2),var(--wh-ink) 70%);border:1px solid rgba(199,164,102,.3);padding:14px 14px 16px}\n.dlc-whp[data-kill]{border-color:rgba(201,38,78,.5);box-shadow:inset 0 0 50px -20px rgba(201,38,78,.45)}\n.dlc-whp-end{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:-14px -14px 12px;padding:8px 14px;color:#FCE9EE;\n  background:repeating-linear-gradient(-45deg,rgba(0,0,0,.18) 0 8px,transparent 8px 16px),var(--wh-blood)}\n.dlc-whp-end b{font-size:15px;letter-spacing:.4em}.dlc-whp-end span{font-family:\"Noto Sans SC\",sans-serif;font-size:12px}\n.dlc-whp-top{display:grid;grid-template-columns:132px minmax(0,1fr);gap:14px;align-items:center}\n.dlc-whp-eyebox{position:relative;height:84px;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(199,164,102,.25);background:radial-gradient(closest-side,rgba(95,182,176,.18),transparent)}\n.dlc-whp-eyebox .dlc-wh-tide{width:200%}\n.dlc-whp-eye{width:120px;height:64px}\n.dlc-whp-k{font-family:\"Noto Sans SC\",sans-serif;font-size:10.5px;letter-spacing:.5em;color:var(--wh-teal)}\n.dlc-whp-id h4{margin:2px 0 6px;font-size:21px;letter-spacing:.2em;color:var(--wh-gold2);font-weight:800}\n.dlc-whp-id h4 small{font-size:13px;letter-spacing:.1em;color:var(--wh-gold);font-weight:500}\n.dlc-whp-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center}\n.dlc-whp-tag{font-family:\"Noto Sans SC\",sans-serif;font-size:11.5px;letter-spacing:.1em;padding:1px 7px;border:1px solid rgba(95,182,176,.5);color:var(--wh-teal2)}\n.dlc-whp-tag[data-gaze=全开]{border-color:var(--wh-gold);color:var(--wh-gold2)}\n.dlc-whp-tag[data-gaze=未开启]{opacity:.65}\n.dlc-whp-q{margin:8px 0 0;font-size:12.5px;color:var(--wh-txt2);font-style:italic}\n.dlc-whp-gauges{display:grid;gap:12px;margin:16px 0 6px}\n.dlc-whp-g-h{display:flex;align-items:baseline;gap:8px;margin-bottom:5px}\n.dlc-whp-g-h span{font-size:13px;letter-spacing:.3em;color:var(--wh-gold)}\n.dlc-whp-g-h b{font-family:\"Cascadia Mono\",Consolas,monospace;font-size:22px;line-height:1;color:#fff}\n.dlc-whp-g-h em{font-style:normal;font-size:12.5px;letter-spacing:.12em;color:var(--wh-teal2)}\n.dlc-whp-g[data-tier=\"3\"] .dlc-whp-g-h em,.dlc-whp-g[data-tier=\"4\"] .dlc-whp-g-h em{color:#F08DA6}\n.dlc-whp-lock{font-style:normal;font-family:\"Noto Sans SC\",sans-serif;font-size:11px;padding:0 6px;color:#06100F;background:var(--wh-teal2)}\n.dlc-whp-g-t{position:relative;height:36px}\n.dlc-whp-g-seg{position:absolute;inset:8px 0 0;display:flex;gap:2px}\n.dlc-whp-g-seg span{flex-basis:0;min-width:0;padding-top:4px;font-family:\"Noto Sans SC\",sans-serif;font-size:10px;line-height:1.3;letter-spacing:.06em;color:rgba(214,227,226,.38);white-space:nowrap;overflow:hidden;text-overflow:clip;border-top:6px solid rgba(255,255,255,.07)}\n.dlc-whp-g-seg span[data-on]{color:rgba(214,227,226,.78)}\n.dlc-whp-g-fill{position:absolute;left:0;top:8px;height:6px;width:calc(var(--v) * 100%);background:linear-gradient(90deg,var(--wh-teal) 0,var(--wh-gold) 55%,var(--wh-blood) 100%) 0 0/calc(100% / max(var(--v),.01)) 100% no-repeat}\n.dlc-whp-g-needle{position:absolute;top:0;left:calc(var(--v) * 100%);width:0;height:0;margin-left:-5px;border:5px solid transparent;border-top:7px solid #fff;filter:drop-shadow(0 0 4px var(--wh-gold))}\n.dlc-whp-sec{margin-top:16px}\n.dlc-whp-sec h5{display:flex;align-items:baseline;gap:8px;margin:0 0 8px;font-size:14px;letter-spacing:.35em;color:var(--wh-gold2);font-weight:700;border-bottom:1px solid rgba(199,164,102,.25);padding-bottom:4px}\n.dlc-whp-sec h5 span{font-family:\"Cascadia Mono\",Consolas,monospace;font-size:11px;letter-spacing:0;color:var(--wh-txt2);font-weight:400}\n.dlc-whp-none{margin:0;font-size:12.5px;color:var(--wh-txt2)}\n.dlc-whp-moves{list-style:none;margin:0;padding:0;display:grid;gap:6px;\n  background:repeating-linear-gradient(90deg,rgba(199,164,102,.07) 0 1px,transparent 1px 34px),repeating-linear-gradient(0deg,rgba(199,164,102,.07) 0 1px,transparent 1px 34px)}\n.dlc-whp-moves li{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:start;padding:7px 9px;background:rgba(6,12,15,.72);border-left:2px solid var(--wh-gold)}\n.dlc-whp-moves b{font-size:13.5px;color:var(--wh-txt)}\n.dlc-whp-moves p{margin:2px 0 0;font-family:\"Noto Sans SC\",sans-serif;font-size:12px;color:var(--wh-txt2)}\n.dlc-whp-moves em{font-style:normal;font-family:\"Noto Sans SC\",sans-serif;font-size:11px;letter-spacing:.1em;color:var(--wh-gold)}\n.dlc-whp-piece{width:13px;height:13px;margin:3px 0 0 4px;transform:rotate(45deg);border:1.5px dashed var(--wh-gold)}\n.dlc-whp-moves li[data-s=live]{border-left-color:var(--wh-teal)}\n.dlc-whp-moves li[data-s=live] .dlc-whp-piece{border:0;background:var(--wh-teal);box-shadow:0 0 8px var(--wh-teal)}\n.dlc-whp-moves li[data-s=live] em{color:var(--wh-teal2)}\n.dlc-whp-moves li[data-s=broken]{border-left-color:#59666A;opacity:.62}\n.dlc-whp-moves li[data-s=broken] b{text-decoration:line-through;text-decoration-color:var(--wh-teal)}\n.dlc-whp-moves li[data-s=broken] .dlc-whp-piece{border:1.5px solid #59666A;background:linear-gradient(45deg,transparent 45%,#59666A 45% 55%,transparent 55%)}\n.dlc-whp-moves li[data-s=broken] em{color:#8D9A9E}\n.dlc-whp-moves li[data-s=done]{border-left-color:var(--wh-blood);background:linear-gradient(90deg,rgba(201,38,78,.2),rgba(6,12,15,.72) 60%)}\n.dlc-whp-moves li[data-s=done] .dlc-whp-piece{border:0;background:var(--wh-blood)}\n.dlc-whp-moves li[data-s=done] em{color:#F08DA6}\n.dlc-whp-clues{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}\n.dlc-whp-clue{position:relative;padding:8px 10px 9px;background:linear-gradient(180deg,rgba(235,212,154,.08),rgba(235,212,154,.02));border:1px solid rgba(199,164,102,.25)}\n.dlc-whp-clue::before{content:'';position:absolute;right:8px;top:-1px;width:18px;height:7px;background:var(--wh-gold);clip-path:polygon(0 0,100% 0,100% 100%,50% 60%,0 100%)}\n.dlc-whp-clue b{display:block;margin:5px 0 2px;font-size:13.5px;color:var(--wh-gold2)}\n.dlc-whp-clue p{margin:0;font-size:12.5px;color:var(--wh-txt)}\n.dlc-whp-clue small{display:block;margin-top:4px;font-family:\"Noto Sans SC\",sans-serif;font-size:11px;color:var(--wh-txt2)}\n.dlc-whp-steps{display:flex;gap:3px;align-items:center}\n.dlc-whp-steps i{font-style:normal;width:18px;height:18px;display:grid;place-items:center;font-size:10.5px;color:rgba(214,227,226,.4);border:1px solid rgba(214,227,226,.2)}\n.dlc-whp-steps i[data-on]{color:#07100F;background:var(--wh-teal);border-color:var(--wh-teal)}\n.dlc-whp-steps i[data-on]:nth-child(4){background:var(--wh-gold);border-color:var(--wh-gold)}\n.dlc-whp-clue[data-wrong]{border-style:dashed;opacity:.8}\n.dlc-whp-x{width:auto !important;padding:0 6px;color:#E7D8FF !important;background:#5A4A86;border-color:#5A4A86 !important;transform:rotate(-6deg);margin-left:4px}\n.dlc-whp[data-m=full] .dlc-wh-tide{animation:dlcWhTide 22s linear infinite}\n.dlc-whp[data-m=full] .dlc-wh-rays{animation:dlcWhSpin 46s linear infinite}\n.dlc-whp[data-m=full] .dlc-wh-iris{animation:dlcWhLook 9s ease-in-out infinite}\n.dlc-whp[data-m=full] .dlc-wh-lidg{animation:dlcWhBlink 7.5s ease-in-out infinite}\n.dlc-whp[data-m=full] .dlc-whp-moves li[data-s=live] .dlc-whp-piece{animation:dlcWhVein 1.8s ease-in-out infinite}\n.dlc-whp[data-m=full][data-kill] .dlc-whp-g:last-child .dlc-whp-g-needle{animation:dlcWhBeat 1.6s ease-in-out infinite}\n@container (max-width:420px){.dlc-whp-top{grid-template-columns:1fr}.dlc-whp-eyebox{height:74px}}\n@media (max-width:480px){.dlc-whp-top{grid-template-columns:1fr}.dlc-whp-eyebox{height:74px}.dlc-wh-stamp{display:none}.dlc-wh-end{padding-left:58px}.dlc-wh-end-t{font-size:24px}}\n/* 底栏 */\n.dlc-whd{display:inline-flex;align-items:center;gap:3px;padding:0 6px 0 2px;height:22px;background:var(--wh-ink);border:1px solid rgba(199,164,102,.45);color:var(--wh-gold2);font:600 11px/1 \"Cascadia Mono\",Consolas,monospace}\n.dlc-whd[data-kill]{border-color:var(--wh-blood);color:#F6A9BC}\n.dlc-whd-eye{width:30px;height:16px}\n.dlc-whd .dlc-wh-rays{display:none}\n.dlc-whd[data-m=full] .dlc-wh-lidg{animation:dlcWhBlink 6s ease-in-out infinite}\n.dlc-whd[data-m=full] .dlc-wh-iris{animation:dlcWhLook 9s ease-in-out infinite}\n@media (prefers-reduced-motion:reduce){.dlc-wh *,.dlc-wh,.dlc-whp *,.dlc-whd *{animation:none !important}}\n`;\n\n  return {\n    css,\n    tiers: { 关注: 关注档, 威胁: 威胁档 }, // 只给测试核对：和变量脚本算的档位名一致\n    blocks: { 瞥视: { render: gaze }, 结局: { render: ending } },\n    bar: { tab: CORE, when: U.mine, page, dock, iconPath: 'M2 12C5 7 8.5 5 12 5s7 2 10 7c-3 5-6.5 7-10 7S5 17 2 12ZM12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7ZM12 10.5v3' },\n  };\n}\n\nreturn DLC_PAGE_万年黑幕(CORE, INFO, DLC_SHARED(CORE, INFO));";
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

/* 斗罗核心·<核心>（酒馆助手脚本，模块方式加载）
 * build.py 在本段之前注入：import registerMvuSchema、CORE（本核心名）、共用/叙事核心.js、叙事核心/结构.js、
 *   叙事核心/核心/<核心>.js（CORE_DEF）、CORE_PAGE（主页面代码，字符串）。
 * 三个核心脚本一直开着，但只有“自己的”聊天才有动作（设计决定 §22、ADR 0008）：
 *   变量：结构一直登记着，只认 叙事核心.核心 等于本核心的数据（见 结构.js），所以开局落笔写进去的那一刻就能接住；
 *         每轮更新结束再把关一次（核心不能被改走或删掉，本核心那一块补默认值），再交给 CORE_DEF.onUpdated。
 *   显示：当前聊天的核心（开局记录为准，其次最新一层变量）是本核心时，把块标签和状态栏页签登记到主页面，否则撤掉。
 *   世界书：核心条目的开关由斗罗剧情窗口统一写（和幕条目同一次写入），这里不碰世界书。
 */
const NAME = `斗罗核心·${CORE}`;
const W = (() => { try { if (window.parent && window.parent !== window && window.parent.document) return window.parent; } catch (_) { /* 跨域时退回本窗口 */ } return window; })();
const D = W.document;
const GLOBAL = '__DL_CORE_' + CORE + '__';
const EVENTS = { CHAT_CHANGED: 'chat_id_changed', MESSAGE_RECEIVED: 'message_received', MESSAGE_SENT: 'message_sent', MESSAGE_SWIPED: 'message_swiped',
  MESSAGE_EDITED: 'message_edited', MESSAGE_UPDATED: 'message_updated', MESSAGE_DELETED: 'message_deleted', GENERATION_ENDED: 'generation_ended' };
const OPENING_KEY = '斗罗开局';

const stops = [];
function listen(name, fn) {
  if (!name) return;
  try { const r = eventOn(name, fn); stops.push(typeof r === 'function' ? r : r && typeof r.stop === 'function' ? () => r.stop() : () => {}); }
  catch (e) { console.warn(`[${NAME}] 监听 ${name} 失败`, e); }
}
const on = (key, fn) => listen((window.tavern_events || W.tavern_events || {})[key] || EVENTS[key], fn);

// ───────── 变量结构 ─────────
const coreSchema = CORE_DEF.schema(z);
let liveVars = null; // mvu_zod 处理这一批命令时的“当前变量”（见 结构.js）
const rootSchema = coreRootSchema(z, CORE, coreSchema, () => (liveVars && liveVars.stat_data) || null);
function registerSchema() {
  // 变量管理器里的结构展示留给斗罗ZOD：本 iframe 里的 registerVariableSchema 关掉（只影响本脚本，mvu_zod 每处理一次都会调它）
  try { window.registerVariableSchema = undefined; } catch (_) { /* 改不了就算了，只影响变量管理器的显示 */ }
  if (typeof registerVariableSchema === 'function') console.info(`[${NAME}] 关不掉 registerVariableSchema，变量管理器可能显示本核心的结构`);
  // 紧挨着 mvu_zod 的处理器前后登记：同一事件按登记顺序调用，前一个记下当前变量，后一个清掉。
  // 这四个监听器不进 stops：它们必须和 mvu_zod 的处理器同生共死（都随本 iframe 由酒馆助手收走），不能先被撤掉
  eventOn('mag_variable_initialized', (vars) => { liveVars = vars; });
  eventOn('mag_command_parsed_for_zod', (vars) => { liveVars = vars; });
  registerMvuSchema(rootSchema);
  eventOn('mag_variable_initialized', () => { liveVars = null; });
  eventOn('mag_command_parsed_for_zod', () => { liveVars = null; });
}
function guard(vars, before) {
  const after = vars && vars.stat_data;
  if (!after || typeof after !== 'object') return;
  const r = guardCore(CORE, coreSchema, after, before && before.stat_data);
  if (r) {
    after.叙事核心 = r.value;
    if (r.note) console.warn(`[${NAME}] ${r.note}`);
  }
  if (typeof CORE_DEF.onUpdated === 'function' && after.叙事核心 && after.叙事核心.核心 === CORE) {
    const keep = JSON.parse(JSON.stringify(after.叙事核心));
    try {
      CORE_DEF.onUpdated(after, before && before.stat_data);
      // onUpdated 改了数值（开局校准、冻结、跨部折算）后再过一遍结构，档位跟着重算
      const r2 = coreSchema.safeParse(after.叙事核心);
      after.叙事核心 = r2.success ? r2.data : keep;
    } catch (e) { after.叙事核心 = keep; console.error(`[${NAME}] 核心更新处理出错，变量保持原样`, e); }
  }
}

// ───────── 当前聊天是不是本核心 ─────────
const ctx = () => { try { return W.SillyTavern && W.SillyTavern.getContext ? W.SillyTavern.getContext() : null; } catch (_) { return null; } };
function openingRecord() {
  try { const v = getVariables({ type: 'chat' }); const r = v && v[OPENING_KEY]; return r && typeof r === 'object' ? r : null; } catch (_) { return null; }
}
function latestStat() {
  const c = ctx(), n = c && Array.isArray(c.chat) ? c.chat.length : 0;
  for (let i = n - 1; i >= 0; i -= 1) {
    try { const v = getVariables({ type: 'message', message_id: i }); if (v && v.stat_data && typeof v.stat_data === 'object' && Object.keys(v.stat_data).length) return v.stat_data; } catch (_) { /* 这一层没有变量 */ }
  }
  return null;
}
const active = () => chatCore(openingRecord(), latestStat()) === CORE;

// ───────── 主页面：块标签、状态栏页签 ─────────
let mounted = null;
function registry(key) {
  const m = W[key];
  if (m && typeof m.get === 'function' && typeof m.set === 'function') return m;
  return (W[key] = new W.Map());
}
const changed = () => { try { W.dispatchEvent(new W.Event('dl-ext-changed')); } catch (_) { /* 主页面已关 */ } };
function mount() {
  const spec = new W.Function('CORE', 'INFO', CORE_PAGE)(CORE, CORE_INFO[CORE]) || {};
  const style = D.createElement('style');
  style.id = 'dl-core-style-' + CORE;
  style.textContent = spec.css || '';
  const old = D.getElementById(style.id);
  if (old) old.remove();
  D.head.appendChild(style);
  const blocks = registry('__DL_PROSE_BLOCKS__'), bar = registry('__DL_BAR_EXT__');
  const tags = [];
  for (const [tag, r] of Object.entries(spec.blocks || {})) { blocks.set(tag, r); tags.push([tag, r]); }
  if (spec.bar) bar.set('core:' + CORE, spec.bar);
  mounted = { spec, tags, style };
  changed();
}
// 页面代码可带 apply(最新变量, 主页面 document)：随最新变量改主页面上的全局状态（比如神界污染的低理智干扰）；撤下时传 null
function apply(stat, spec) {
  const sp = spec || (mounted && mounted.spec);
  if (!sp || typeof sp.apply !== 'function') return;
  try { sp.apply(stat, D); } catch (e) { console.error(`[${NAME}] 页面状态没更新`, e); }
}
function unmount() {
  if (!mounted) return;
  const { spec, tags, style } = mounted;
  mounted = null;
  apply(null, spec);
  try {
    const blocks = W.__DL_PROSE_BLOCKS__, bar = W.__DL_BAR_EXT__;
    for (const [tag, r] of tags) if (blocks && blocks.get(tag) === r) blocks.delete(tag);
    if (bar && bar.get('core:' + CORE) === spec.bar) bar.delete('core:' + CORE);
    style.remove();
  } catch (_) { /* 主页面已关 */ }
  changed();
}
// ───────── 结局以后这个聊天不再推进（设计决定 §22；锁的做法见 共用/结局锁.js） ─────────
const endingOf = (stat) => {
  const c = stat && stat.叙事核心;
  return c && c.核心 === CORE && c.结局 && typeof c.结局 === 'object' && c.结局.已终结 === true ? c.结局 : null;
};
const lock = createEndingLock(W, CORE, NAME);

let timer = 0;
function refresh() {
  W.clearTimeout(timer);
  timer = W.setTimeout(() => {
    const want = active();
    if (want && !mounted) mount();
    else if (!want && mounted) unmount();
    const stat = mounted ? latestStat() : null;
    apply(stat);
    try { lock.set(mounted ? endingOf(stat) : null); } catch (e) { console.warn(`[${NAME}] 结局锁没更新`, e); }
  }, 120);
}

// ───────── 启动与收尾 ─────────
let destroyed = false;
function destroy() {
  if (destroyed) return;
  destroyed = true;
  W.clearTimeout(timer);
  for (const s of stops.splice(0)) { try { s(); } catch (_) { /* 已注销 */ } }
  try { lock.detach(); } catch (_) { /* 主页面已关 */ }
  unmount();
  try { if (W[GLOBAL] && W[GLOBAL].destroy === destroy) delete W[GLOBAL]; } catch (_) { /* 主页面已关 */ }
}
function start() {
  try { if (W[GLOBAL] && typeof W[GLOBAL].destroy === 'function') W[GLOBAL].destroy(); } catch (_) { /* 旧实例已失效 */ }
  W[GLOBAL] = { destroy, refresh, status: () => ({ 核心: CORE, 当前聊天: chatCore(openingRecord(), latestStat()), 显示中: !!mounted }) };
  registerSchema();
  for (const k of Object.keys(EVENTS)) on(k, refresh);
  // 结局锁的接线单独兜住：这里出错不能连累变量结构和显示
  try {
    lock.attach(listen, () => !!mounted && !!endingOf(latestStat()));
  } catch (e) { console.warn(`[${NAME}] 结局锁没接上，结局后不会拦发送`, e); }
  Promise.resolve(typeof waitGlobalInitialized === 'function' ? waitGlobalInitialized('Mvu') : null).then(() => {
    const M = window.Mvu || W.Mvu;
    if (destroyed || !M || !M.events) return;
    listen(M.events.VARIABLE_UPDATE_ENDED, (vars, before) => { guard(vars, before); refresh(); });
  }, () => {});
  refresh();
}
$(() => {
  try {
    start();
    window.addEventListener('pagehide', destroy, { once: true });
  } catch (e) { console.error(`[${NAME}] 启动失败`, e); }
});

// 斗罗远程正文结束
