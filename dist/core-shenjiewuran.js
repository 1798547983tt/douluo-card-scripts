// 斗罗远程正文 core-shenjiewuran.js 2.1.0
// 斗罗核心·神界污染：由 源码/build.py 生成，勿手改。结构见 源码/叙事核心/核心/神界污染.js，主页面代码见 源码/叙事核心/页面/，接线见 源码/叙事核心/入口.js。
import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

const CORE = "神界污染";
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

/* 神界污染·飞升骗局 —— 叙事核心变量结构
 * 字段与规则的出处：源码/提示词/叙事核心/神界污染/（定稿，改自 Gemini 交付的 变量设计.md）。
 * CORE_DEF.schema(z)：AI 写 理智、污染、真相碎片、异化代价、结局；档位由数值算。
 * CORE_DEF.onUpdated(after, before)：按主角修为与污染算 窥见层级（96 级窥破门槛，Gemini 的 calcPeekTier）。
 *   开局初值要看主角修为（原作角色第一轮才建出修为），留给 AI 第一轮校准。
 */
const CORE_DEF = (() => {
  const 理智档 = [[80, '明镜守心'], [60, '偶生毛刺'], [40, '真妄交叠'], [20, '理性疯魔'], [0, '凡锚将断']];
  const 污染档 = [[100, '飞升成粮'], [70, '神龛候补'], [45, '半身异化'], [20, '环骨生根'], [0, '凡胎未染']];
  const 层级表 = ['凡尘盲区', '裂隙微光', '帷幕渗漏', '神枢直视'];
  const 进展表 = ['违和', '残片', '推论', '洞悉', '错乱误判'];
  const 真神 = new Set(['三级神', '二级神', '一级神', '神王']);

  function peekOf(hero, pollution) {
    const h = hero || {};
    const lv = Number(h.魂力等级) || 0;
    const yrs = Number(h.修为年限) || 0;
    const path = h.神途 || {};
    const rank = h.神阶 || (path.神位 && path.神位.神阶) || null;
    if (lv >= 100 || 真神.has(rank) || path.野神 === true || pollution >= 100) return '神枢直视';
    if (lv === 99 || rank === '神官' || yrs >= 700000 || pollution >= 70) return '帷幕渗漏';
    if (lv >= 96 || yrs >= 300000 || pollution >= 40) return '裂隙微光';
    return '凡尘盲区';
  }

  return {
    schema(z) {
      const k = coreKit(z);
      return k.block('神界污染', {
        理智: k.int(100), 理智档位: k.derived(),
        污染: k.int(0), 污染档位: k.derived(),
        窥见层级: k.pick(层级表, '凡尘盲区'),
        真相碎片: k.list({ 标题: k.str(), 来源: k.str(), 进展: k.pick(进展表, '违和'), 摘要: k.str() }, 12),
        异化代价: k.list({ 载体: k.str(), 表现: k.str() }, 6),
        结局: k.ending(),
      }, (c) => ({ ...c, 理智档位: TIER(理智档, c.理智), 污染档位: TIER(污染档, c.污染) }));
    },
    onUpdated(after) {
      const c = after.叙事核心;
      c.窥见层级 = peekOf(after.主角, c.污染);
    },
  };
})();

const CORE_PAGE = "/* 叙事核心 · 主页面代码的共用部分\n * 页面文件都只定义工厂函数，样稿页（样稿/叙事核心样稿.html）能直接用 <script> 加载同一份代码：\n *   DLC_SHARED(CORE, INFO) → 共用工具；DLC_PAGE_<核心>(CORE, INFO, U) → { css, blocks, bar, apply? }\n * build.py 把 本文件 + 页面/<核心>.js 拼起来，末尾加一句 return DLC_PAGE_<核心>(CORE, INFO, DLC_SHARED(CORE, INFO))，\n * 整段由核心脚本在主页面里用 new Function('CORE', 'INFO', 代码) 执行：函数都属于主页面，核心脚本的 iframe 关掉以后正文和状态栏照样能调。\n *   blocks 登记进 window.__DL_PROSE_BLOCKS__：{ 标签: { render(段, 工具) } }。段 = { tag, inner, closed }；\n *          工具有 h / sv（建节点）、sub(文字)（把块里的正文照常画成节点）、env（env.stat 是这一层的变量）、playAt()（入场动画已播几秒，不该播为 null）。\n *          块的外层由正文容器带 data-dlp-motion（full / reduced / off）和 data-dlp-surface（浅色聊天背景时为 light）。\n *   bar    登记进 window.__DL_BAR_EXT__：{ tab, when(数据), page(数据, 工具), dock(数据, 工具), iconPath }；工具里 motion 为 full / reduced / off。\n *   apply(最新变量 | null, 主页面 document)：可选，随最新变量改主页面上的全局状态；撤下时传 null。\n */\nfunction DLC_SHARED(CORE, INFO) {\n  const coreOf = (st) => (st && st.叙事核心 && typeof st.叙事核心 === 'object' ? st.叙事核心 : null);\n  const mine = (st) => { const c = coreOf(st); return !!c && c.核心 === CORE; };\n  const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);\n  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));\n  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);\n  const tierOf = (table, v) => { for (let i = 0; i < table.length; i += 1) if (v >= table[i][0]) return { i: table.length - 1 - i, name: table[i][1] }; return { i: 0, name: table[table.length - 1][1] }; };\n\n  /** 块里的内容拆成三样：开头的“键｜值”抬头行、行内小标签（<对策>…</对策> 这类，按名字收集）、剩下的正文 */\n  const META = /^[ \\t]*(视角|来源|主角|台词|死因|下手|所斩|类型|代价|所得|神祇|发布者|场面|内容|期限|奖励|惩罚|状态|赏赐|落点|人物|表面|图谋|筹码|利弊|姿态|主谋|目标|面具|对象|标题|本源|违和|判定|代号|职能)[ \\t]*[｜|][ \\t]*(.*)$/u;\n  function parseBlock(inner, inlineTags) {\n    const meta = {}, tags = {};\n    let text = String(inner == null ? '' : inner);\n    for (const t of inlineTags || []) {\n      tags[t] = [];\n      text = text.replace(new RegExp(`<${t}>([\\\\s\\\\S]*?)(?:</${t}>|$)`, 'gu'), (_, x) => { tags[t].push(x.trim()); return ''; });\n    }\n    const lines = text.replace(/^\\n+/u, '').split('\\n');\n    while (lines.length) {\n      const m = META.exec(lines[0]);\n      if (!m) { if (!lines[0].trim()) { lines.shift(); continue; } break; }\n      if (!(m[1] in meta)) meta[m[1]] = m[2].trim();\n      lines.shift();\n    }\n    return { meta, tags, body: lines.join('\\n').trim() };\n  }\n  /** 入场动画：正文给了“已播几秒”就带 data-play 和负的延迟，重画时接着播，不从头再来 */\n  function play(kit) {\n    const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null;\n    return t == null ? {} : { 'data-play': true, style: { '--dlc-t': `-${t.toFixed(2)}s` } };\n  }\n  const part = (st) => (st && st.时空 && st.时空.当前部) || null;\n  const date = (st) => String((st && st.时空 && st.时空.外界日期) || '').replace(/^斗罗历/u, '');\n  /** 结局块的通用拆法 */\n  const endingOf = (inner) => parseBlock(inner, []);\n  /** 只认结局对象里真写下的 */\n  const ended = (c) => !!(c && c.结局 && c.结局.已终结 === true);\n\n  return { CORE, INFO, coreOf, mine, num, clamp, list, tierOf, parseBlock, play, part, date, endingOf, ended };\n}\n\n/* 神界污染·飞升骗局 · 主页面代码（外观以 样稿/叙事核心样稿.html 为准）\n * 正文：<呓语>（左边一块竖写“来源”的牌位，右边是串了色的低语；按来源分三种：魂环魂骨一类暗紫筋膜、神界垂纶一类病态灿金、裂隙与自我错位一类惨白裂纹）、\n *       <结局>（已入神龛：两扇金门合拢、封蜡落下；凡锚断绝：黑石裂开）。\n * 状态栏：页签“神界污染”（饲神胎印、理智三炷香、污染裂环、窥见四重帷幕、真相碎片符纸、异化代价）；底栏一枚胎印和两个数。\n * apply：随最新一层的理智，在主页面 <html> 上挂 data-dlc-sanity（0–4），最后一层正文跟着出现轻微干扰；字始终清楚可读。\n */\nfunction DLC_PAGE_神界污染(CORE, INFO, U) {\n  const 理智档 = [[80, '明镜守心'], [60, '偶生毛刺'], [40, '真妄交叠'], [20, '理性疯魔'], [0, '凡锚将断']];\n  const 污染档 = [[100, '飞升成粮'], [70, '神龛候补'], [45, '半身异化'], [20, '环骨生根'], [0, '凡胎未染']];\n  const 层级 = ['凡尘盲区', '裂隙微光', '帷幕渗漏', '神枢直视'];\n  const 层级注 = ['所见与原作无异', '余光里有细缝', '帷幕在渗', '直面神枢'];\n  const STEPS = ['违和', '残片', '推论', '洞悉'];\n  const sanity = (c) => 4 - U.tierOf(理智档, U.num(c && c.理智, 100)).i; // 0 清醒 … 4 将断\n  const taint = (c) => U.tierOf(污染档, U.num(c && c.污染, 0)).i; // 0 未染 … 4 成粮\n  const hash = (s) => { let x = 11; for (const ch of String(s)) x = (x * 33 + ch.codePointAt(0)) >>> 0; return x; };\n  /** 呓语来源 → 三类：rift 裂隙与自我错位、holy 神界垂纶、flesh 环骨共生（其余都算这一类） */\n  function srcOf(s) {\n    const t = String(s || '');\n    if (/苍穹|裂隙|裂缝|升灵|碎肉|理性|错位|自我|剖白|太初|胎动|墟海|母蜕/u.test(t)) return 'rift';\n    if (/海神|神位|肉龛|神龛|神座|圣柱|乾坤|问情|黄金树|神祇|神识|神界|神考|神殿|神印|上界|天使|修罗|垂纶|神像/u.test(t)) return 'holy';\n    return 'flesh';\n  }\n  const SRC_NAME = { flesh: '环骨共生', holy: '神界垂纶', rift: '裂隙错位' };\n\n  /** 筋脉：从牌位一侧长出去的几道分叉 */\n  function veins(sv, seed) {\n    const r = hash(seed), paths = [];\n    for (let i = 0; i < 5; i += 1) {\n      const y = 12 + i * 22 + ((r >> i) % 9), k = (r >> (i * 3)) % 30;\n      paths.push(`M0 ${y} C${60 + k} ${y - 14} ${120 + k} ${y + 18} ${200 + k * 2} ${y + 4} S${330} ${y - 10 + (i % 2) * 20} 400 ${y + 6}`);\n      paths.push(`M${90 + k * 2} ${y + 4} q20 ${i % 2 ? 16 : -16} 46 ${i % 2 ? 22 : -20}`);\n    }\n    return sv('svg', { class: 'dlc-sp-veins', viewBox: '0 0 400 130', preserveAspectRatio: 'none', 'aria-hidden': 'true' },\n      paths.map((d, i) => sv('path', { d, 'data-k': i % 2 ? 'b' : 'a', style: { '--i': i } })));\n  }\n  /** 惨白裂纹 */\n  function cracks(sv, seed) {\n    const r = hash(seed);\n    const line = (x0, y0, n, dx) => { let x = x0, y = y0, d = `M${x} ${y}`; for (let i = 0; i < n; i += 1) { x += dx + ((r >> i) % 13) - 6; y += 10 + ((r >> (i + 2)) % 12); d += ` L${x} ${y}`; } return d; };\n    return sv('svg', { class: 'dlc-sp-cracks', viewBox: '0 0 400 130', preserveAspectRatio: 'none', 'aria-hidden': 'true' },\n      sv('path', { d: line(250 + (r % 60), 0, 11, 6) }), sv('path', { d: line(330, 0, 6, -9), class: 'thin' }), sv('path', { d: line(150, 130 - 60, 5, 12), class: 'thin' }));\n  }\n\n  // ───────── 正文：<呓语> ─────────\n  function whisper(p, kit) {\n    const { h, sv } = kit;\n    const b = U.parseBlock(p.inner, []);\n    const from = b.meta.来源 || '不知何处';\n    const src = srcOf(from);\n    const c = U.coreOf(kit.env && kit.env.stat);\n    const int = c ? Math.max(sanity(c), taint(c)) : 2;\n    const [head, ...tail] = from.split(/[·・]/u);\n    return h('section', { class: 'dlc-sp dlc-sp-whis', 'data-src': src, 'data-int': int, 'data-writing': p.closed ? null : true, ...U.play(kit) },\n      veins(sv, from), src === 'rift' ? cracks(sv, from) : null, h('i', { class: 'dlc-sp-leak', 'aria-hidden': 'true' }),\n      h('aside', { class: 'dlc-sp-tablet', title: from },\n        h('i', { class: 'dlc-sp-tab-cap', 'aria-hidden': 'true' }),\n        h('span', { class: 'dlc-sp-tab-k', text: '呓' }),\n        h('span', { class: 'dlc-sp-tab-src' }, h('b', { text: head }), tail.length ? h('small', { text: tail.join('·') }) : null),\n        h('i', { class: 'dlc-sp-tab-foot', 'aria-hidden': 'true' })),\n      h('div', { class: 'dlc-sp-main' },\n        h('div', { class: 'dlc-sp-kind', text: `${SRC_NAME[src]} · 呓语` }),\n        h('div', { class: 'dlc-sp-text' }, kit.sub(b.body))));\n  }\n\n  // ───────── 正文：<结局> ─────────\n  function niche(sv) {\n    return sv('svg', { class: 'dlc-sp-niche', viewBox: '0 0 200 120', 'aria-hidden': 'true' },\n      sv('path', { class: 'dlc-sp-niche-arch', d: 'M30 118V52Q30 8 100 6Q170 8 170 52V118' }),\n      sv('path', { class: 'dlc-sp-niche-in', d: 'M44 118V56Q44 22 100 20Q156 22 156 56V118Z' }),\n      sv('path', { class: 'dlc-sp-niche-door l', d: 'M44 118V56Q44 22 100 20V118Z' }),\n      sv('path', { class: 'dlc-sp-niche-door r', d: 'M156 118V56Q156 22 100 20V118Z' }),\n      sv('g', { class: 'dlc-sp-seal' }, sv('circle', { cx: 100, cy: 74, r: 15 }), sv('path', { d: 'M100 63v22M92 70h16M93 80h14' })));\n  }\n  function stone(sv) {\n    const hex = 'M100 8 162 44V112L100 148 38 112V44Z';\n    return sv('svg', { class: 'dlc-sp-stone', viewBox: '0 0 200 156', 'aria-hidden': 'true' },\n      sv('g', { class: 'dlc-sp-shard a' }, sv('path', { d: 'M100 8 162 44V80L104 70 96 40Z' })),\n      sv('g', { class: 'dlc-sp-shard b' }, sv('path', { d: 'M96 40 104 70 162 80V112L100 148 92 100Z' })),\n      sv('g', { class: 'dlc-sp-shard c' }, sv('path', { d: 'M100 8 96 40 92 100 100 148 38 112V44Z' })),\n      sv('path', { class: 'dlc-sp-stone-edge', d: hex }),\n      sv('path', { class: 'dlc-sp-stone-crack', d: 'M100 8 96 40 104 70 92 100 100 148M104 70 162 80M96 40 70 52' }));\n  }\n  function ending(p, kit) {\n    const { h, sv } = kit;\n    const b = U.endingOf(p.inner);\n    const c = U.coreOf(kit.env && kit.env.stat);\n    const why = `${b.meta.死因 || ''}${b.meta.下手 || ''}`;\n    const broke = /理智|凡锚|崩|疯|断绝|错乱/u.test(why) || (!/神龛|飞升|成粮|同化|肉龛|消化|入龛|神座/u.test(why) && !!c && U.num(c.理智, 100) <= 0);\n    return h('section', { class: 'dlc-sp dlc-sp-end', 'data-kind': broke ? 'break' : 'niche', 'data-writing': p.closed ? null : true, ...U.play(kit) },\n      veins(sv, why || 'end'), h('i', { class: 'dlc-sp-leak', 'aria-hidden': 'true' }),\n      h('div', { class: 'dlc-sp-end-art' }, broke ? stone(sv) : niche(sv)),\n      h('div', { class: 'dlc-sp-end-k', text: broke ? '凡锚断绝' : '飞升成粮' }),\n      h('h3', { class: 'dlc-sp-end-t', text: broke ? '人已不在' : '已入神龛' }),\n      (b.meta.死因 || b.meta.下手) ? h('dl', { class: 'dlc-sp-end-m' },\n        b.meta.死因 ? [h('dt', { text: '死因' }), h('dd', { text: b.meta.死因 })] : null,\n        b.meta.下手 ? [h('dt', { text: '下手' }), h('dd', { text: b.meta.下手 })] : null) : null,\n      h('div', { class: 'dlc-sp-text' }, kit.sub(b.body)),\n      h('footer', { class: 'dlc-sp-end-f', text: broke ? '此局已终 · 那具身体还在走动，里面已经没有人了' : '此局已终 · 神座上多了一位，祂很满足' }));\n  }\n\n  // ───────── 状态栏 ─────────\n  /** 饲神胎印：0 黑石 · 1–2 裂开一线金 · 3 半开竖瞳 · 4 全开；ended 时封蜡或碎石 */\n  function sigil(sv, lv, end, cls) {\n    const hex = 'M32 4 56 18V46L32 60 8 46V18Z';\n    return sv('svg', { class: cls, viewBox: '0 0 64 64', 'aria-hidden': 'true', 'data-lv': lv, 'data-end': end || null },\n      sv('path', { class: 'dlc-sp-sg-hex', d: hex }),\n      sv('path', { class: 'dlc-sp-sg-hex2', d: 'M32 10 51 21V43L32 54 13 43V21Z' }),\n      lv >= 1 && lv < 3 ? sv('path', { class: 'dlc-sp-sg-slit', d: lv === 1 ? 'M32 18 30 32 33 46' : 'M32 14 28 32 33 50' }) : null,\n      lv >= 3 ? sv('g', { class: 'dlc-sp-sg-eye' },\n        sv('path', { class: 'dlc-sp-sg-lid', d: lv >= 4 ? 'M32 12Q48 32 32 52Q16 32 32 12Z' : 'M32 16Q42 32 32 48Q22 32 32 16Z' }),\n        sv('ellipse', { class: 'dlc-sp-sg-pupil', cx: 32, cy: 32, rx: lv >= 4 ? 3.4 : 2.2, ry: lv >= 4 ? 11 : 8 })) : null,\n      end === 'niche' ? sv('g', { class: 'dlc-sp-sg-wax' }, sv('circle', { cx: 32, cy: 32, r: 12 }), sv('path', { d: 'M32 24v16M26 29h12M27 36h10' })) : null,\n      end === 'break' ? sv('path', { class: 'dlc-sp-sg-break', d: 'M32 4 29 20 36 30 26 42 32 60M36 30 56 34M29 20 14 24' }) : null);\n  }\n  function censer(sv, v) {\n    const H = 92, top = 104 - Math.max(2, U.clamp(v, 0, 100) / 100 * H);\n    const sticks = [[34, top + 5], [50, top], [66, top + 8]].map(([x, y]) => [x, Math.min(102, y)]);\n    return sv('svg', { class: 'dlc-sp-censer', viewBox: '0 0 100 150', 'aria-hidden': 'true' },\n      sticks.map(([x, y], i) => sv('g', { class: 'dlc-sp-stick', style: { '--i': i } },\n        sv('line', { x1: x, y1: 106, x2: x, y2: y, class: 'dlc-sp-stick-body' }),\n        sv('path', { class: 'dlc-sp-smoke', d: `M${x} ${y - 2}c-6 -10 8 -14 2 -24s-9 -12 -1 -22` }),\n        sv('circle', { class: 'dlc-sp-ember', cx: x, cy: y, r: 2.2 }))),\n      sv('path', { class: 'dlc-sp-bowl', d: 'M16 106h68l-6 26q-28 10 -56 0Z' }),\n      sv('path', { class: 'dlc-sp-bowl-rim', d: 'M12 106h76M28 136l-6 10M72 136l6 10M44 140h12' }));\n  }\n  function halo(sv, v, lv) {\n    const r = 46, C = 2 * Math.PI * r, f = U.clamp(v, 0, 100) / 100;\n    // 裂纹横穿光环：按档位一条条添，角度固定，锯齿往两侧错开\n    const CRACK = [-55, 140, 32, 232].map((deg, k) => {\n      const a = deg * Math.PI / 180, t = a + Math.PI / 2;\n      let d = '';\n      for (let j = 0; j < 5; j += 1) {\n        const rr = 37 + j * 4.4, off = (j % 2 ? 2.2 : -1.4) * (k % 2 ? 1 : -1);\n        d += `${j ? ' L' : 'M'}${(50 + Math.cos(a) * rr + Math.cos(t) * off).toFixed(1)} ${(50 + Math.sin(a) * rr + Math.sin(t) * off).toFixed(1)}`;\n      }\n      return d;\n    });\n    return sv('svg', { class: 'dlc-sp-halo', viewBox: '0 0 100 100', 'aria-hidden': 'true' },\n      sv('circle', { cx: 50, cy: 50, r, class: 'dlc-sp-halo-bg' }),\n      sv('circle', { cx: 50, cy: 50, r, class: 'dlc-sp-halo-fg', style: { 'stroke-dasharray': `${(C * f).toFixed(1)} ${C.toFixed(1)}` }, transform: 'rotate(-90 50 50)' }),\n      sv('circle', { cx: 50, cy: 50, r: 38, class: 'dlc-sp-halo-in' }),\n      CRACK.slice(0, lv).map((d) => sv('path', { d, class: 'dlc-sp-halo-crack' })));\n  }\n  function page(st, kit) {\n    const { h, sv } = kit;\n    const c = U.coreOf(st) || {};\n    const 理智 = U.num(c.理智, 100), 污染 = U.num(c.污染, 0);\n    const s = sanity(c), t = taint(c);\n    const peek = Math.max(0, 层级.indexOf(c.窥见层级));\n    const shards = U.list(c.真相碎片).slice().reverse(), costs = U.list(c.异化代价).slice().reverse();\n    const end = U.ended(c) ? (/理智|凡锚|崩|疯|断绝/u.test(c.结局.死因 || '') || 理智 <= 0 ? 'break' : 'niche') : null;\n    const warn = [];\n    if (污染 >= 85 && 污染 < 100) warn.push('污染已到 85 以上：上面已经在等你了。');\n    if (理智 > 0 && 理智 < 20) warn.push('理智不到 20：再往下，就分不清是谁在用这具身体。');\n    return h('div', { class: 'dlc-spp', 'data-m': kit.motion || 'full', 'data-s': s, 'data-t': t },\n      end ? h('div', { class: 'dlc-spp-end', 'data-kind': end }, h('b', { text: end === 'break' ? '凡锚断绝' : '已入神龛' }), h('span', { text: `${c.结局.死因 || ''}${c.结局.下手 ? ' · ' + c.结局.下手 : ''}` })) : null,\n      veins(sv, 'page'),\n      h('header', { class: 'dlc-spp-top' },\n        sigil(sv, t, end, 'dlc-sp-sigil'),\n        h('div', null,\n          h('div', { class: 'dlc-spp-k', text: '叙事核心 · 饲神胎印' }),\n          h('h4', null, '神界污染', h('small', { text: '·飞升骗局' })),\n          h('p', { class: 'dlc-spp-q', text: INFO.引 }))),\n      warn.length ? h('div', { class: 'dlc-spp-warn' }, warn.map((x) => h('p', { text: x }))) : null,\n      h('section', { class: 'dlc-spp-meters' },\n        h('div', { class: 'dlc-spp-m', 'data-k': 'sanity' }, censer(sv, 理智),\n          h('div', { class: 'dlc-spp-mv' }, h('span', { text: '理智' }), h('b', { text: String(理智) }), h('em', { text: c.理智档位 || U.tierOf(理智档, 理智).name }))),\n        h('div', { class: 'dlc-spp-m', 'data-k': 'taint' }, h('div', { class: 'dlc-spp-halo' }, halo(sv, 污染, t), h('b', { text: String(污染) })),\n          h('div', { class: 'dlc-spp-mv' }, h('span', { text: '污染' }), h('em', { text: c.污染档位 || U.tierOf(污染档, 污染).name })))),\n      h('section', { class: 'dlc-spp-sec' },\n        h('h5', null, '窥见层级'),\n        h('ol', { class: 'dlc-spp-veils' }, 层级.map((name, i) => h('li', { 'data-on': i === peek ? true : null, 'data-past': i < peek ? true : null },\n          h('b', { text: name }), h('span', { text: 层级注[i] }))).reverse())),\n      h('section', { class: 'dlc-spp-sec' },\n        h('h5', null, '真相碎片', h('span', { text: `${shards.length}/12` })),\n        shards.length ? h('div', { class: 'dlc-spp-shards' }, shards.map((x, i) => {\n          const k = STEPS.indexOf(x.进展), wrong = x.进展 === '错乱误判';\n          return h('article', { class: 'dlc-spp-shard', 'data-k': wrong ? 'wrong' : k, style: { '--r': `${((hash(x.标题 || i) % 5) - 2) * 0.6}deg` } },\n            h('em', { text: x.进展 || '违和' }),\n            h('b', { text: x.标题 || '无题' }),\n            h('p', { text: x.摘要 || '' }),\n            x.来源 ? h('small', { text: x.来源 }) : null);\n        })) : h('p', { class: 'dlc-spp-none', text: '世界看上去一切正常。' })),\n      h('section', { class: 'dlc-spp-sec' },\n        h('h5', null, '异化代价', h('span', { text: `${costs.length}/6` })),\n        costs.length ? h('ul', { class: 'dlc-spp-costs' }, costs.map((x) => h('li', null, h('b', { text: x.载体 || '' }), h('span', { text: x.表现 || '' }))))\n          : h('p', { class: 'dlc-spp-none', text: '身体还是你自己的。' })));\n  }\n  function dock(st, kit) {\n    const c = U.coreOf(st) || {};\n    const end = U.ended(c) ? (U.num(c.理智, 100) <= 0 ? 'break' : 'niche') : null;\n    return kit.h('span', { class: 'dlc-spd', 'data-m': kit.motion || 'full', 'data-s': sanity(c), 'data-t': taint(c), title: `神界污染 · 理智 ${U.num(c.理智, 100)} · 污染 ${U.num(c.污染, 0)} · ${c.窥见层级 || '凡尘盲区'}` },\n      sigil(kit.sv, taint(c), end, 'dlc-sp-sigil dlc-spd-sg'),\n      kit.h('b', { 'data-k': 's', text: String(U.num(c.理智, 100)) }), kit.h('i', { text: '/' }), kit.h('b', { 'data-k': 't', text: String(U.num(c.污染, 0)) }));\n  }\n  /** 最新一层的理智 → 主页面 <html data-dlc-sanity>；只有最后一层正文受影响 */\n  function apply(st, doc) {\n    const root = doc && doc.documentElement;\n    if (!root) return;\n    if (st && U.mine(st) && !U.ended(U.coreOf(st))) root.setAttribute('data-dlc-sanity', String(sanity(U.coreOf(st))));\n    else root.removeAttribute('data-dlc-sanity');\n  }\n\n  const P = '#chat .last_mes .mes_text[data-dlp-theme]';\n  const css = `\n.dlc-sp,.dlc-spp,.dlc-spd{--sp-ink:#09080D;--sp-p1:#120F18;--sp-p2:#1C1524;--sp-gold:#E2D98A;--sp-gold2:#F7F1CF;--sp-violet:#A98AD6;--sp-violet2:#4E3473;--sp-green:#9FD18F;--sp-green2:#D2F2C2;--sp-bone:#E9E5D8;--sp-flesh:#B5506A;--sp-flesh2:#6A2238;--sp-txt:#E7E2EE;--sp-txt2:#A69EB3;--x1:var(--sp-violet);--x2:var(--sp-green)}\n.dlc-sp{position:relative;isolation:isolate;overflow:hidden;margin:1.15em 0;color:var(--sp-txt);font-family:var(--dlp-serif,serif);--dlp-on:var(--sp-txt);--dlp-on2:var(--sp-txt2);--dlp-on-line:rgba(169,138,214,.3)}\n/* 呓语 */\n.dlc-sp-whis{display:grid;grid-template-columns:52px minmax(0,1fr);border:1px solid rgba(169,138,214,.42);\n  background:radial-gradient(70% 120% at 0 50%,rgba(78,52,115,.55),transparent 70%),radial-gradient(60% 80% at 100% 0,rgba(159,209,143,.10),transparent 60%),linear-gradient(180deg,var(--sp-p2),var(--sp-ink))}\n.dlc-sp-whis[data-src=holy]{--x1:var(--sp-gold);--x2:#F2B9C8;border-color:rgba(226,217,138,.5);\n  background:radial-gradient(80% 90% at 50% -10%,rgba(247,241,207,.24),transparent 60%),radial-gradient(60% 120% at 0 50%,rgba(226,217,138,.16),transparent 70%),linear-gradient(180deg,#221C14,#120D0C 70%,var(--sp-ink))}\n.dlc-sp-whis[data-src=rift]{--x1:var(--sp-bone);--x2:var(--sp-green);border-color:rgba(233,229,216,.38);\n  background:radial-gradient(50% 100% at 70% 0,rgba(233,229,216,.10),transparent 60%),radial-gradient(60% 80% at 100% 100%,rgba(159,209,143,.12),transparent 60%),linear-gradient(180deg,#14161A,var(--sp-ink))}\n.dlc-sp-veins{position:absolute;inset:0;width:100%;height:100%;z-index:-1;fill:none;pointer-events:none;opacity:.5}\n.dlc-sp-veins path{stroke:var(--x1);stroke-width:.9;vector-effect:non-scaling-stroke;opacity:.55}\n.dlc-sp-veins path[data-k=b]{stroke:var(--x2);stroke-width:.7;opacity:.45}\n.dlc-sp-whis[data-src=flesh] .dlc-sp-veins path[data-k=a]{stroke:var(--sp-flesh)}\n.dlc-sp-cracks{position:absolute;inset:0;width:100%;height:100%;z-index:-1;fill:none;pointer-events:none}\n.dlc-sp-cracks path{stroke:var(--sp-bone);stroke-width:1.2;vector-effect:non-scaling-stroke;opacity:.6;filter:drop-shadow(0 0 3px rgba(233,229,216,.6))}\n.dlc-sp-cracks path.thin{stroke-width:.6;opacity:.4}\n.dlc-sp-leak{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:0;background:radial-gradient(40% 60% at 30% 50%,color-mix(in srgb,var(--x1) 30%,transparent),transparent 70%)}\n.dlc-sp-tablet{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0 12px;color:var(--sp-ink);\n  background:linear-gradient(180deg,color-mix(in srgb,var(--x1) 92%,#fff),var(--x1) 40%,color-mix(in srgb,var(--x1) 70%,#000));box-shadow:inset -1px 0 0 rgba(0,0,0,.5),1px 0 12px color-mix(in srgb,var(--x1) 40%,transparent)}\n.dlc-sp-whis[data-src=flesh] .dlc-sp-tablet{background:linear-gradient(180deg,#C9B3EA,var(--sp-violet) 35%,#5B3F86);color:#130B1D}\n.dlc-sp-tab-cap{width:34px;height:8px;margin-top:-4px;background:currentColor;opacity:.75;clip-path:polygon(0 100%,12% 0,88% 0,100% 100%)}\n.dlc-sp-tab-k{font-size:18px;font-weight:900;line-height:1}\n.dlc-sp-tab-src{writing-mode:vertical-rl;display:flex;gap:2px;align-items:flex-start;font-family:var(--dlp-serif,serif);letter-spacing:.18em;line-height:1.15}\n.dlc-sp-tab-src b{font-size:13.5px;font-weight:800}\n.dlc-sp-tab-src small{font-size:11px;font-weight:600;opacity:.8}\n.dlc-sp-tab-foot{margin-top:auto;width:30px;height:5px;background:currentColor;opacity:.6}\n.dlc-sp-main{position:relative;padding:10px 14px 12px 16px;min-width:0}\n.dlc-sp-kind{font-family:var(--dlp-sans,sans-serif);font-size:10.5px;letter-spacing:.42em;color:var(--x2);margin-bottom:6px}\n.dlc-sp-whis[data-src=holy] .dlc-sp-kind{color:var(--sp-gold)}\n.dlc-sp-text{position:relative;font-size:1.02em;line-height:1.85;letter-spacing:.04em;color:var(--sp-txt);\n  text-shadow:.6px 0 color-mix(in srgb,var(--x1) 55%,transparent),-.6px 0 color-mix(in srgb,var(--x2) 45%,transparent)}\n.dlc-sp-whis[data-src=holy] .dlc-sp-text{color:var(--sp-gold2)}\n.dlc-sp-whis[data-src=rift] .dlc-sp-text{color:#EEF0E6}\n.dlc-sp-whis[data-int=\"3\"] .dlc-sp-text,.dlc-sp-whis[data-int=\"4\"] .dlc-sp-text{text-shadow:1px 0 color-mix(in srgb,var(--x1) 60%,transparent),-1px 0 color-mix(in srgb,var(--x2) 55%,transparent),0 0 10px color-mix(in srgb,var(--x1) 30%,transparent)}\n.dlc-sp-text>:first-child{margin-top:0}.dlc-sp-text>:last-child{margin-bottom:0}\n.dlc-sp-text>*:nth-child(3n+2){padding-left:.9em}\n.dlc-sp-text>*:nth-child(3n){padding-left:.35em}\n.dlc-sp[data-writing] .dlc-sp-kind::after{content:' ……';letter-spacing:.1em}\n/* 结局 */\n.dlc-sp-end{padding:18px 18px 14px;text-align:center;border:1px solid rgba(226,217,138,.5);\n  background:radial-gradient(60% 70% at 50% 20%,rgba(247,241,207,.28),transparent 70%),radial-gradient(80% 60% at 50% 100%,rgba(78,52,115,.5),transparent 70%),linear-gradient(180deg,#201A12,var(--sp-ink))}\n.dlc-sp-end[data-kind=break]{--x1:var(--sp-bone);border-color:rgba(233,229,216,.35);background:radial-gradient(50% 60% at 50% 25%,rgba(159,209,143,.14),transparent 70%),linear-gradient(180deg,#15171A,var(--sp-ink))}\n.dlc-sp-end-art{display:grid;place-items:center;margin-bottom:4px}\n.dlc-sp-niche{width:150px;height:90px;overflow:visible}\n.dlc-sp-niche-arch{fill:none;stroke:var(--sp-gold);stroke-width:2.5}\n.dlc-sp-niche-in{fill:rgba(247,241,207,.85)}\n.dlc-sp-niche-door{fill:#2A2014;stroke:var(--sp-gold);stroke-width:1.4}\n.dlc-sp-seal circle{fill:var(--sp-flesh2);stroke:var(--sp-gold);stroke-width:1.2}\n.dlc-sp-seal path{fill:none;stroke:var(--sp-gold2);stroke-width:1.6}\n.dlc-sp-stone{width:120px;height:94px;overflow:visible}\n.dlc-sp-shard path{fill:#2A2C32;stroke:none}.dlc-sp-shard.b path{fill:#202227}.dlc-sp-shard.c path{fill:#34363C}\n.dlc-sp-stone-edge{fill:none;stroke:#6E6A62;stroke-width:2}\n.dlc-sp-stone-crack{fill:none;stroke:var(--sp-green2);stroke-width:1.6;filter:drop-shadow(0 0 4px var(--sp-green))}\n.dlc-sp-end-k{font-family:var(--dlp-sans,sans-serif);font-size:11px;letter-spacing:.6em;color:var(--sp-violet)}\n.dlc-sp-end[data-kind=break] .dlc-sp-end-k{color:var(--sp-green)}\n.dlc-sp-end-t{margin:4px 0 12px;font-size:30px;line-height:1.1;font-weight:900;letter-spacing:.45em;color:var(--sp-gold2);text-shadow:0 0 18px rgba(247,241,207,.5)}\n.dlc-sp-end[data-kind=break] .dlc-sp-end-t{color:var(--sp-bone);text-shadow:2px 0 rgba(159,209,143,.55),-2px 0 rgba(169,138,214,.5)}\n.dlc-sp-end-m{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;max-width:560px;margin:0 auto 12px;text-align:left;font-size:13.5px}\n.dlc-sp-end-m dt{font-family:var(--dlp-sans,sans-serif);letter-spacing:.3em;color:var(--sp-gold)}.dlc-sp-end-m dd{margin:0}\n.dlc-sp-end .dlc-sp-text{text-align:left;padding-left:12px;border-left:1px solid rgba(226,217,138,.35)}\n.dlc-sp-end-f{margin-top:12px;font-family:var(--dlp-sans,sans-serif);font-size:11.5px;letter-spacing:.18em;color:var(--sp-txt2)}\n/* 动效 */\n[data-dlp-motion=full] .dlc-sp-veins path{stroke-dasharray:6 10;animation:dlcSpFlow 5s linear infinite;animation-delay:calc(var(--i) * -.6s)}\n[data-dlp-motion=full] .dlc-sp-leak{animation:dlcSpBeat 2.8s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-sp-whis[data-int=\"3\"] .dlc-sp-leak,[data-dlp-motion=full] .dlc-sp-whis[data-int=\"4\"] .dlc-sp-leak{animation-duration:1.6s}\n[data-dlp-motion=full] .dlc-sp-text>*{animation:dlcSpDrift 7s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-sp-text>*:nth-child(even){animation-duration:9s;animation-direction:reverse}\n[data-dlp-motion=full] .dlc-sp-whis[data-int=\"4\"] .dlc-sp-text{animation:dlcSpTear 6s steps(1) infinite}\n[data-dlp-motion=full] .dlc-sp-tab-src{animation:dlcSpSway 6s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-sp-cracks path{stroke-dasharray:400;animation:dlcSpCrack 7s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-sp[data-play] .dlc-sp-tablet{animation:dlcSpDrop .8s cubic-bezier(.3,.7,.2,1.2) both;animation-delay:var(--dlc-t,0s)}\n[data-dlp-motion=full] .dlc-sp[data-play] .dlc-sp-main{animation:dlcSpSeep 1.2s ease-out both;animation-delay:calc(var(--dlc-t,0s) + .3s)}\n[data-dlp-motion=full] .dlc-sp-end[data-play] .dlc-sp-niche-door.l{animation:dlcSpDoorL 1.6s cubic-bezier(.6,0,.3,1) both;animation-delay:calc(var(--dlc-t,0s) + .2s)}\n[data-dlp-motion=full] .dlc-sp-end[data-play] .dlc-sp-niche-door.r{animation:dlcSpDoorR 1.6s cubic-bezier(.6,0,.3,1) both;animation-delay:calc(var(--dlc-t,0s) + .2s)}\n[data-dlp-motion=full] .dlc-sp-end[data-play] .dlc-sp-seal{animation:dlcSpSeal .6s cubic-bezier(.2,.9,.3,1.5) both;animation-delay:calc(var(--dlc-t,0s) + 1.7s)}\n[data-dlp-motion=full] .dlc-sp-end[data-play] .dlc-sp-stone-crack{stroke-dasharray:300;animation:dlcSpCrackIn 1.2s ease-out both;animation-delay:calc(var(--dlc-t,0s) + .2s)}\n[data-dlp-motion=full] .dlc-sp-end[data-kind=break] .dlc-sp-shard.a{animation:dlcSpShardA 4s ease-in-out infinite alternate}\n[data-dlp-motion=full] .dlc-sp-end[data-kind=break] .dlc-sp-shard.b{animation:dlcSpShardB 4.6s ease-in-out infinite alternate}\n[data-dlp-motion=full] .dlc-sp-end[data-kind=niche] .dlc-sp-niche-in{animation:dlcSpBeat 2.4s ease-in-out infinite}\n[data-dlp-motion=reduced] .dlc-sp[data-play] .dlc-sp-main{animation:dlcSpSeep .4s ease-out both}\n@keyframes dlcSpFlow{to{stroke-dashoffset:-64}}\n@keyframes dlcSpBeat{0%,100%{opacity:.15}14%{opacity:.7}26%{opacity:.25}38%{opacity:.6}}\n@keyframes dlcSpDrift{0%,100%{transform:none;opacity:1}40%{transform:translateX(1.2px);opacity:.9}70%{transform:translateX(-.8px)}}\n@keyframes dlcSpTear{0%,100%{clip-path:none;transform:none}91%{clip-path:inset(30% 0 52% 0);transform:translateX(3px)}92%{clip-path:inset(62% 0 20% 0);transform:translateX(-2px)}93%{clip-path:none;transform:none}}\n@keyframes dlcSpSway{0%,100%{transform:none}50%{transform:translateY(2px) skewY(-1deg)}}\n@keyframes dlcSpCrack{0%,100%{stroke-dashoffset:0;opacity:.6}50%{stroke-dashoffset:40;opacity:.95}}\n@keyframes dlcSpCrackIn{from{stroke-dashoffset:300}to{stroke-dashoffset:0}}\n@keyframes dlcSpDrop{from{transform:translateY(-40%);opacity:0}to{transform:none;opacity:1}}\n@keyframes dlcSpSeep{from{opacity:0;filter:blur(4px)}to{opacity:1;filter:none}}\n@keyframes dlcSpDoorL{0%{transform:translateX(-56px)}60%{transform:translateX(-56px)}100%{transform:none}}\n@keyframes dlcSpDoorR{0%{transform:translateX(56px)}60%{transform:translateX(56px)}100%{transform:none}}\n@keyframes dlcSpSeal{from{transform:translateY(-30px) scale(1.8);opacity:0}to{transform:none;opacity:1}}\n@keyframes dlcSpShardA{to{transform:translate(4px,-5px) rotate(3deg)}}\n@keyframes dlcSpShardB{to{transform:translate(5px,4px) rotate(-2deg)}}\n.dlc-sp-niche-door,.dlc-sp-seal,.dlc-sp-shard{transform-box:fill-box;transform-origin:center}\n/* 低理智：只动最后一层正文，字始终清楚 */\nhtml[data-dlc-sanity=\"2\"] ${P} p,html[data-dlc-sanity=\"3\"] ${P} p,html[data-dlc-sanity=\"4\"] ${P} p{text-shadow:.4px 0 rgba(181,80,106,.38),-.4px 0 rgba(110,200,190,.38)}\nhtml[data-dlc-sanity=\"2\"] ${P}{background-image:radial-gradient(160px 110px at 0 0,rgba(110,200,190,.12),transparent 70%),radial-gradient(160px 110px at 100% 100%,rgba(110,200,190,.12),transparent 70%)}\nhtml[data-dlc-sanity=\"3\"] ${P},html[data-dlc-sanity=\"4\"] ${P}{background-image:repeating-linear-gradient(180deg,transparent 0 1.55em,rgba(169,138,214,.10) 1.55em calc(1.55em + 1px));box-shadow:inset 0 0 40px -18px rgba(78,52,115,.8)}\nhtml[data-dlc-sanity=\"1\"] ${P}[data-dlp-motion=full] p{animation:dlcSpFade 6s ease-in-out infinite}\nhtml[data-dlc-sanity=\"4\"] ${P}{outline:1px solid rgba(106,34,56,.55);outline-offset:4px}\nhtml[data-dlc-sanity=\"4\"] ${P}[data-dlp-motion=full]{animation:dlcSpDouble 1.7s ease-in-out infinite}\nhtml[data-dlc-sanity=\"3\"] ${P}[data-dlp-motion=full] p:nth-child(4n+1){animation:dlcSpDrift 8s ease-in-out infinite}\n@keyframes dlcSpFade{0%,100%{opacity:1}50%{opacity:.93}}\n@keyframes dlcSpDouble{0%,100%{outline-color:rgba(106,34,56,.35);transform:none}10%{outline-color:rgba(181,80,106,.85);transform:translateX(.3px)}20%{outline-color:rgba(106,34,56,.35)}32%{outline-color:rgba(181,80,106,.7);transform:translateX(-.3px)}44%{outline-color:rgba(106,34,56,.35);transform:none}}\n/* 状态栏页 */\n.dlc-spp{position:relative;isolation:isolate;overflow:hidden;padding:14px 14px 16px;color:var(--sp-txt);font-family:\"Noto Serif SC\",\"Source Han Serif SC\",\"Songti SC\",serif;border:1px solid rgba(226,217,138,.3);\n  background:radial-gradient(90% 50% at 50% 0,rgba(226,217,138,.14),transparent 70%),radial-gradient(80% 60% at 0 100%,rgba(78,52,115,.45),transparent 70%),linear-gradient(180deg,var(--sp-p2),var(--sp-ink) 80%)}\n.dlc-spp .dlc-sp-veins{opacity:.28}\n.dlc-spp[data-t=\"3\"],.dlc-spp[data-t=\"4\"]{border-color:rgba(181,80,106,.5)}\n.dlc-spp-end{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin:-14px -14px 12px;padding:8px 14px;color:var(--sp-ink);background:linear-gradient(90deg,var(--sp-gold2),var(--sp-gold))}\n.dlc-spp-end[data-kind=break]{background:linear-gradient(90deg,var(--sp-bone),#9C9A90)}\n.dlc-spp-end b{font-size:15px;letter-spacing:.4em}.dlc-spp-end span{font-family:\"Noto Sans SC\",sans-serif;font-size:12px}\n.dlc-spp-top{display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px;align-items:center}\n.dlc-sp-sigil{width:72px;height:72px;overflow:visible}\n.dlc-sp-sg-hex{fill:#15131A;stroke:#5C566A;stroke-width:1.6}\n.dlc-sp-sg-hex2{fill:none;stroke:rgba(226,217,138,.25);stroke-width:.8}\n.dlc-sp-sg-slit{fill:none;stroke:var(--sp-gold);stroke-width:2;filter:drop-shadow(0 0 4px var(--sp-gold))}\n.dlc-sp-sg-lid{fill:var(--sp-gold2);stroke:var(--sp-gold);stroke-width:1.4;filter:drop-shadow(0 0 6px rgba(247,241,207,.7))}\n.dlc-sp-sg-pupil{fill:var(--sp-flesh2)}\nsvg[data-lv=\"4\"] .dlc-sp-sg-pupil{fill:var(--sp-flesh)}\nsvg[data-lv=\"3\"] .dlc-sp-sg-hex,svg[data-lv=\"4\"] .dlc-sp-sg-hex{stroke:var(--sp-gold)}\n.dlc-sp-sg-wax circle{fill:var(--sp-flesh2);stroke:var(--sp-gold);stroke-width:1.4}\n.dlc-sp-sg-wax path{fill:none;stroke:var(--sp-gold2);stroke-width:1.6}\n.dlc-sp-sg-break{fill:none;stroke:var(--sp-green2);stroke-width:1.8;filter:drop-shadow(0 0 3px var(--sp-green))}\n.dlc-sp-sg-eye,.dlc-sp-sg-slit{transform-box:fill-box;transform-origin:center}\n.dlc-spp-k{font-family:\"Noto Sans SC\",sans-serif;font-size:10.5px;letter-spacing:.42em;color:var(--sp-violet)}\n.dlc-spp-top h4{margin:2px 0 4px;font-size:21px;letter-spacing:.2em;color:var(--sp-gold2);font-weight:800}\n.dlc-spp-top h4 small{font-size:13px;letter-spacing:.1em;color:var(--sp-gold);font-weight:500}\n.dlc-spp-q{margin:0;font-size:12.5px;color:var(--sp-txt2)}\n.dlc-spp-warn{margin:10px 0 0;padding:6px 10px;border-left:3px solid var(--sp-flesh);background:rgba(106,34,56,.35)}\n.dlc-spp-warn p{margin:0;font-family:\"Noto Sans SC\",sans-serif;font-size:12px;color:#F3C9D4}\n.dlc-spp-meters{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0 4px}\n.dlc-spp-m{display:grid;justify-items:center;gap:4px;padding:8px 6px;border:1px solid rgba(169,138,214,.22);background:rgba(9,8,13,.45)}\n.dlc-spp-mv{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;justify-content:center}\n.dlc-spp-mv span{font-size:13px;letter-spacing:.3em;color:var(--sp-gold)}\n.dlc-spp-mv b{font-family:\"Cascadia Mono\",Consolas,monospace;font-size:20px;color:#fff}\n.dlc-spp-mv em{font-style:normal;font-family:\"Noto Sans SC\",sans-serif;font-size:12px;letter-spacing:.1em;color:var(--sp-green)}\n.dlc-spp[data-s=\"3\"] .dlc-spp-m[data-k=sanity] em,.dlc-spp[data-s=\"4\"] .dlc-spp-m[data-k=sanity] em,.dlc-spp[data-t=\"3\"] .dlc-spp-m[data-k=taint] em,.dlc-spp[data-t=\"4\"] .dlc-spp-m[data-k=taint] em{color:#F29AB0}\n.dlc-sp-censer{width:84px;height:126px;overflow:visible}\n.dlc-sp-stick-body{stroke:#7A5A3A;stroke-width:2.4}\n.dlc-sp-ember{fill:#FFD27A;filter:drop-shadow(0 0 4px #FFB347)}\n.dlc-sp-smoke{fill:none;stroke:rgba(233,229,216,.55);stroke-width:1.4;stroke-linecap:round}\n.dlc-spp[data-s=\"2\"] .dlc-sp-smoke{stroke:rgba(159,209,143,.6)}\n.dlc-spp[data-s=\"3\"] .dlc-sp-smoke,.dlc-spp[data-s=\"4\"] .dlc-sp-smoke{stroke:rgba(169,138,214,.7)}\n.dlc-sp-bowl{fill:#2B2318;stroke:var(--sp-gold);stroke-width:1.4}\n.dlc-sp-bowl-rim{fill:none;stroke:var(--sp-gold);stroke-width:1.6}\n.dlc-spp-halo{position:relative;width:110px;height:110px;margin:8px 0 8px}\n.dlc-spp-halo b{position:absolute;inset:0;display:grid;place-items:center;font-family:\"Cascadia Mono\",Consolas,monospace;font-size:26px;color:var(--sp-gold2);text-shadow:0 0 10px rgba(247,241,207,.5)}\n.dlc-sp-halo{width:110px;height:110px}\n.dlc-sp-halo-bg{fill:none;stroke:rgba(226,217,138,.18);stroke-width:6}\n.dlc-sp-halo-fg{fill:none;stroke:var(--sp-gold);stroke-width:6;filter:drop-shadow(0 0 5px rgba(226,217,138,.6))}\n.dlc-spp[data-t=\"2\"] .dlc-sp-halo-fg{stroke:var(--sp-violet)}\n.dlc-spp[data-t=\"3\"] .dlc-sp-halo-fg,.dlc-spp[data-t=\"4\"] .dlc-sp-halo-fg{stroke:var(--sp-flesh)}\n.dlc-sp-halo-in{fill:rgba(247,241,207,.05);stroke:rgba(169,138,214,.35);stroke-width:.8;stroke-dasharray:2 3}\n.dlc-sp-halo-crack{fill:none;stroke:var(--sp-bone);stroke-width:1.3}\n.dlc-spp-sec{margin-top:14px}\n.dlc-spp-sec h5{display:flex;align-items:baseline;gap:8px;margin:0 0 8px;padding-bottom:4px;font-size:14px;letter-spacing:.35em;color:var(--sp-gold2);font-weight:700;border-bottom:1px solid rgba(169,138,214,.3)}\n.dlc-spp-sec h5 span{font-family:\"Cascadia Mono\",Consolas,monospace;font-size:11px;letter-spacing:0;color:var(--sp-txt2);font-weight:400}\n.dlc-spp-none{margin:0;font-size:12.5px;color:var(--sp-txt2)}\n.dlc-spp-veils{list-style:none;margin:0;padding:0;display:grid;gap:3px}\n.dlc-spp-veils li{position:relative;display:flex;align-items:baseline;gap:10px;padding:6px 10px;color:rgba(231,226,238,.5);\n  background:repeating-linear-gradient(100deg,rgba(231,226,238,.06) 0 2px,transparent 2px 6px),rgba(28,21,36,.8)}\n.dlc-spp-veils li b{font-size:13px;letter-spacing:.2em;font-weight:700}\n.dlc-spp-veils li span{font-family:\"Noto Sans SC\",sans-serif;font-size:11.5px}\n.dlc-spp-veils li[data-past]{color:var(--sp-txt2);background:rgba(28,21,36,.35);clip-path:polygon(0 0,100% 0,100% 70%,92% 100%,80% 60%,64% 100%,48% 65%,30% 100%,14% 60%,0 100%)}\n.dlc-spp-veils li[data-on]{color:var(--sp-ink);background:linear-gradient(90deg,var(--sp-gold2),var(--sp-gold) 60%,var(--sp-violet))}\n.dlc-spp-veils li[data-on]::after{content:'◉';margin-left:auto;font-size:12px}\n.dlc-spp-shards{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:9px}\n.dlc-spp-shard{position:relative;padding:12px 10px 9px;transform:rotate(var(--r));color:#2A2016;background:linear-gradient(180deg,#EFE6C4,#D8CB98);\n  clip-path:polygon(0 6px,8% 0,19% 5px,31% 1px,45% 6px,58% 0,72% 4px,86% 0,100% 5px,100% 100%,0 100%)}\n.dlc-spp-shard em{position:absolute;right:8px;top:9px;font-style:normal;font-family:\"Noto Sans SC\",sans-serif;font-size:10.5px;font-weight:700;padding:0 5px;color:#F7F1CF;background:#7C6A3A}\n.dlc-spp-shard[data-k=\"1\"] em{background:#6B5A8F}.dlc-spp-shard[data-k=\"2\"] em{background:#4E3473}.dlc-spp-shard[data-k=\"3\"] em{background:var(--sp-flesh2)}\n.dlc-spp-shard b{display:block;padding-right:40px;font-size:13.5px;font-weight:900}\n.dlc-spp-shard p{margin:4px 0 0;font-size:12.5px;line-height:1.55}\n.dlc-spp-shard small{display:block;margin-top:4px;font-family:\"Noto Sans SC\",sans-serif;font-size:10.5px;color:#6E604A}\n.dlc-spp-shard[data-k=wrong]{background:linear-gradient(180deg,#D8EBCC,#AFCB9C);color:#1C2A18}\n.dlc-spp-shard[data-k=wrong] em{background:#3E6B33}\n.dlc-spp-shard[data-k=wrong] b{text-decoration:line-through;text-decoration-color:rgba(181,80,106,.8)}\n.dlc-spp-costs{list-style:none;margin:0;padding:0;display:grid;gap:6px}\n.dlc-spp-costs li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:baseline;padding:7px 10px;border-left:3px solid var(--sp-flesh);background:linear-gradient(90deg,rgba(106,34,56,.4),rgba(9,8,13,.4) 70%)}\n.dlc-spp-costs b{font-size:12.5px;letter-spacing:.12em;color:#F2B9C8;white-space:nowrap}\n.dlc-spp-costs span{font-size:12.5px;color:var(--sp-txt)}\n.dlc-spp[data-m=full] .dlc-sp-veins path{stroke-dasharray:6 10;animation:dlcSpFlow 6s linear infinite;animation-delay:calc(var(--i) * -.6s)}\n.dlc-spp[data-m=full] .dlc-sp-smoke{stroke-dasharray:60;animation:dlcSpSmoke 3.6s ease-in-out infinite;animation-delay:calc(var(--i) * -1.1s)}\n.dlc-spp[data-m=full] .dlc-sp-ember{animation:dlcSpEmber 2.2s ease-in-out infinite;animation-delay:calc(var(--i) * -.7s)}\n.dlc-spp[data-m=full] .dlc-sp-sg-slit{animation:dlcSpGlitch 4s steps(1) infinite}\n.dlc-spp[data-m=full] .dlc-sp-sg-eye,.dlc-spd[data-m=full] .dlc-sp-sg-eye{animation:dlcSpPulse 1.9s ease-in-out infinite}\n.dlc-spp[data-m=full] .dlc-spp-veils li[data-on]{animation:dlcSpVeil 3.2s ease-in-out infinite}\n.dlc-spp[data-m=full][data-t=\"3\"] .dlc-sp-halo-fg,.dlc-spp[data-m=full][data-t=\"4\"] .dlc-sp-halo-fg{animation:dlcSpBeat 1.9s ease-in-out infinite}\n@keyframes dlcSpSmoke{0%{stroke-dashoffset:60;opacity:0}30%{opacity:.9}100%{stroke-dashoffset:-60;opacity:0}}\n@keyframes dlcSpEmber{0%,100%{opacity:1}50%{opacity:.55}}\n@keyframes dlcSpGlitch{0%,100%{transform:none;opacity:1}90%{transform:translateX(1.5px);opacity:.6}92%{transform:translateX(-1px)}94%{transform:none;opacity:1}}\n@keyframes dlcSpPulse{0%,100%{transform:scale(1)}12%{transform:scale(1.08)}24%{transform:scale(1)}36%{transform:scale(1.05)}}\n@keyframes dlcSpVeil{0%,100%{filter:none}50%{filter:brightness(1.12)}}\n@media (max-width:480px){.dlc-sp-whis{grid-template-columns:42px minmax(0,1fr)}.dlc-sp-tab-src b{font-size:12.5px}.dlc-sp-end-t{font-size:24px;letter-spacing:.35em}.dlc-spp-meters{gap:8px}}\n/* 底栏 */\n.dlc-spd{display:inline-flex;align-items:center;gap:2px;height:22px;padding:0 7px 0 2px;color:var(--sp-txt);background:var(--sp-ink);border:1px solid rgba(169,138,214,.5);font:700 11px/1 \"Cascadia Mono\",Consolas,monospace}\n.dlc-spd-sg{width:20px;height:20px}\n.dlc-spd b[data-k=s]{color:var(--sp-green)}.dlc-spd b[data-k=t]{color:var(--sp-gold)}.dlc-spd i{font-style:normal;opacity:.45}\n.dlc-spd[data-s=\"3\"] b[data-k=s],.dlc-spd[data-s=\"4\"] b[data-k=s],.dlc-spd[data-t=\"3\"] b[data-k=t],.dlc-spd[data-t=\"4\"] b[data-k=t]{color:#F29AB0}\n.dlc-spd[data-t=\"3\"],.dlc-spd[data-t=\"4\"]{border-color:var(--sp-flesh)}\n@media (prefers-reduced-motion:reduce){.dlc-sp *,.dlc-sp,.dlc-spp *,.dlc-spd *,html[data-dlc-sanity] ${P},html[data-dlc-sanity] ${P} p{animation:none !important}}\n`;\n\n  return {\n    css,\n    tiers: { 理智: 理智档, 污染: 污染档 }, // 只给测试核对：和变量脚本算的档位名一致\n    blocks: { 呓语: { render: whisper }, 结局: { render: ending } },\n    bar: { tab: CORE, when: U.mine, page, dock, iconPath: 'M12 2 20.5 7V17L12 22 3.5 17V7ZM12 7Q15.5 12 12 17Q8.5 12 12 7Z' },\n    apply,\n  };\n}\n\nreturn DLC_PAGE_神界污染(CORE, INFO, DLC_SHARED(CORE, INFO));";
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
