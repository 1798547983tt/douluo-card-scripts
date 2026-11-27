// 斗罗远程正文 core-zuojianqiukong.js 2.1.0
// 斗罗核心·做减求空：由 源码/build.py 生成，勿手改。结构见 源码/叙事核心/核心/做减求空.js，主页面代码见 源码/叙事核心/页面/，接线见 源码/叙事核心/入口.js。
import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

const CORE = "做减求空";
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

/* 做减求空·斩我见真 —— 叙事核心变量结构
 * 字段与规则的出处：源码/提示词/叙事核心/做减求空/（设定.md、审查.md、变量更新规则.yaml）。
 * CORE_DEF.schema(z)：AI 写 空度、尘缘、所斩之物、残执心障、结局；空度档位、尘缘档位由数值算。
 * CORE_DEF.onUpdated(after, before)：
 *   1. 开局落笔首轮对剑枪孤绝或记忆割裂原作身份做起点校准；
 *   2. 对 空度、尘缘 施加单轮 ±45 异常暴涨暴跌钳制；时代往后跨部且 AI 未手改尘缘时微扣 6 点岁月冲刷（保底 15）；
 *   3. 综合 空度、尘缘、所斩之物 与 残执心障 自动算出 道心状态（AI 手写无效）。
 */
const CORE_DEF = (() => {
  const 空度档 = [[100, '太上归空'], [75, '斩我见真'], [50, '忘筌得鱼'], [20, '损之又损'], [0, '万象负身']];
  const 尘缘档 = [[80, '红尘满袖'], [60, '微霜染衣'], [40, '半忘悲欢'], [15, '孤鸿雪泥'], [0, '形神俱寂']];
  const 道心表 = ['凡心未琢', '澄明见性', '孤高近道', '心魔暗涌', '临空将化'];
  const 斩类表 = ['魂环', '魂骨', '魂灵', '情缘', '记忆', '执念', '名姓', '血脉', '器甲', '权柄', '外物'];
  const 心障表 = ['潜伏', '躁动', '反噬', '道痕'];
  const 孤绝名 = new Set(['季绝尘', '尘心', '云冥']);
  const 割裂名 = new Set(['古月娜', '古月', '融念冰']);
  const MAX_STEP = 45;

  function openingOf(hero, t) {
    const who = coreWho(hero);
    const part = t && t.当前部;
    if (孤绝名.has(who)) return { 空度: 25, 尘缘: 76 };
    if (割裂名.has(who)) return { 空度: 22, 尘缘: 72 };
    if (who === '唐舞麟' && part === '斗4') return { 空度: 20, 尘缘: 70 };
    return null;
  }

  function heartOf(c) {
    const demons = Array.isArray(c.残执心障) ? c.残执心障.filter((x) => x && x.状态 !== '道痕') : [];
    const restless = demons.filter((x) => x.状态 === '躁动').length;
    if (demons.some((x) => x.状态 === '反噬') || restless >= 2 || demons.length >= 4 || (c.空度 >= 55 && c.尘缘 >= 75)) {
      return '心魔暗涌';
    }
    if (c.空度 >= 85 || c.尘缘 <= 14) return '临空将化';
    if (c.空度 >= 50) return '孤高近道';
    if (c.空度 >= 20 || (Array.isArray(c.所斩之物) && c.所斩之物.length > 0)) return '澄明见性';
    return '凡心未琢';
  }

  return {
    schema(z) {
      const k = coreKit(z);
      return k.block('做减求空', {
        空度: k.int(0), 空度档位: k.derived(),
        尘缘: k.int(100), 尘缘档位: k.derived(),
        道心状态: k.pick(道心表, '凡心未琢'),
        所斩之物: k.list({
          名称: k.str(),
          类型: k.pick(斩类表, '外物'),
          代价: k.str(),
          所得: k.str(),
          日期: k.str(),
        }, 12),
        残执心障: k.list({
          执念: k.str(),
          成因: k.str(),
          状态: k.pick(心障表, '潜伏'),
        }, 6),
        结局: k.ending(),
      }, (c) => ({ ...c, 空度档位: TIER(空度档, c.空度), 尘缘档位: TIER(尘缘档, c.尘缘) }));
    },
    onUpdated(after, before) {
      const c = after.叙事核心;
      const prev = before && before.叙事核心 && before.叙事核心.核心 === '做减求空' ? before.叙事核心 : null;
      const t = after.时空 || {};
      const isReset = prev && Array.isArray(prev.所斩之物) && prev.所斩之物.length > 0 && c.所斩之物.length === 0;
      if (prev && !isReset) {
        if (typeof prev.空度 === 'number') c.空度 = Math.min(prev.空度 + MAX_STEP, Math.max(prev.空度 - MAX_STEP, c.空度));
        if (typeof prev.尘缘 === 'number') c.尘缘 = Math.min(prev.尘缘 + MAX_STEP, Math.max(prev.尘缘 - MAX_STEP, c.尘缘));
        const from = before && before.时空 && CORE_ERA[before.时空.当前部];
        const to = CORE_ERA[t.当前部];
        if (from && to && to > from && typeof prev.尘缘 === 'number' && c.尘缘 === prev.尘缘 && prev.尘缘 > 15) {
          c.尘缘 = Math.max(15, c.尘缘 - 6);
        }
      } else if (!prev && c.空度 === 0 && c.尘缘 === 100) {
        Object.assign(c, openingOf(after.主角, t) || {});
      }
      c.道心状态 = heartOf(c);
    },
  };
})();

const CORE_PAGE = "/* 叙事核心 · 主页面代码的共用部分\n * 页面文件都只定义工厂函数，样稿页（样稿/叙事核心样稿.html）能直接用 <script> 加载同一份代码：\n *   DLC_SHARED(CORE, INFO) → 共用工具；DLC_PAGE_<核心>(CORE, INFO, U) → { css, blocks, bar, apply? }\n * build.py 把 本文件 + 页面/<核心>.js 拼起来，末尾加一句 return DLC_PAGE_<核心>(CORE, INFO, DLC_SHARED(CORE, INFO))，\n * 整段由核心脚本在主页面里用 new Function('CORE', 'INFO', 代码) 执行：函数都属于主页面，核心脚本的 iframe 关掉以后正文和状态栏照样能调。\n *   blocks 登记进 window.__DL_PROSE_BLOCKS__：{ 标签: { render(段, 工具) } }。段 = { tag, inner, closed }；\n *          工具有 h / sv（建节点）、sub(文字)（把块里的正文照常画成节点）、env（env.stat 是这一层的变量）、playAt()（入场动画已播几秒，不该播为 null）。\n *          块的外层由正文容器带 data-dlp-motion（full / reduced / off）和 data-dlp-surface（浅色聊天背景时为 light）。\n *   bar    登记进 window.__DL_BAR_EXT__：{ tab, when(数据), page(数据, 工具), dock(数据, 工具), iconPath }；工具里 motion 为 full / reduced / off。\n *   apply(最新变量 | null, 主页面 document)：可选，随最新变量改主页面上的全局状态；撤下时传 null。\n */\nfunction DLC_SHARED(CORE, INFO) {\n  const coreOf = (st) => (st && st.叙事核心 && typeof st.叙事核心 === 'object' ? st.叙事核心 : null);\n  const mine = (st) => { const c = coreOf(st); return !!c && c.核心 === CORE; };\n  const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);\n  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));\n  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);\n  const tierOf = (table, v) => { for (let i = 0; i < table.length; i += 1) if (v >= table[i][0]) return { i: table.length - 1 - i, name: table[i][1] }; return { i: 0, name: table[table.length - 1][1] }; };\n\n  /** 块里的内容拆成三样：开头的“键｜值”抬头行、行内小标签（<对策>…</对策> 这类，按名字收集）、剩下的正文 */\n  const META = /^[ \\t]*(视角|来源|主角|台词|死因|下手|所斩|类型|代价|所得|神祇|发布者|场面|内容|期限|奖励|惩罚|状态|赏赐|落点|人物|表面|图谋|筹码|利弊|姿态|主谋|目标|面具|对象|标题|本源|违和|判定|代号|职能)[ \\t]*[｜|][ \\t]*(.*)$/u;\n  function parseBlock(inner, inlineTags) {\n    const meta = {}, tags = {};\n    let text = String(inner == null ? '' : inner);\n    for (const t of inlineTags || []) {\n      tags[t] = [];\n      text = text.replace(new RegExp(`<${t}>([\\\\s\\\\S]*?)(?:</${t}>|$)`, 'gu'), (_, x) => { tags[t].push(x.trim()); return ''; });\n    }\n    const lines = text.replace(/^\\n+/u, '').split('\\n');\n    while (lines.length) {\n      const m = META.exec(lines[0]);\n      if (!m) { if (!lines[0].trim()) { lines.shift(); continue; } break; }\n      if (!(m[1] in meta)) meta[m[1]] = m[2].trim();\n      lines.shift();\n    }\n    return { meta, tags, body: lines.join('\\n').trim() };\n  }\n  /** 入场动画：正文给了“已播几秒”就带 data-play 和负的延迟，重画时接着播，不从头再来 */\n  function play(kit) {\n    const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null;\n    return t == null ? {} : { 'data-play': true, style: { '--dlc-t': `-${t.toFixed(2)}s` } };\n  }\n  const part = (st) => (st && st.时空 && st.时空.当前部) || null;\n  const date = (st) => String((st && st.时空 && st.时空.外界日期) || '').replace(/^斗罗历/u, '');\n  /** 结局块的通用拆法 */\n  const endingOf = (inner) => parseBlock(inner, []);\n  /** 只认结局对象里真写下的 */\n  const ended = (c) => !!(c && c.结局 && c.结局.已终结 === true);\n\n  return { CORE, INFO, coreOf, mine, num, clamp, list, tierOf, parseBlock, play, part, date, endingOf, ended };\n}\n\n/* 做减求空·斩我见真 · 主页面代码（Claude 样稿版：照抄到 源码/叙事核心/页面/做减求空.js 即可，接口、类名钩子和测试要求的文字都对齐了）\n * 母题是“减”：岩彩矿物色（石青、石绿、藤黄、赭石、群青、蛤粉）被一层层抽走，留白越来越多。\n * 正文：<斩>：被斩之物写成一条岩彩名签，一刀斜斩，斩下的半截褪成铅灰、飘走、不断掉渣；“去”一行被划掉，“得”一行留下。\n *       <结局>：void 归空：整张卡褪成一张留白纸，标题只剩空心字；demon 反噬：斩下的碎片倒灌回来，颜色搅成浊色。\n * 状态栏：页签“做减求空”（断环刃印、空度＝被抹成留白的岩彩带、尘缘丝、道心、减法账、残执心障）；底栏刃印 + 空度·尘缘。\n *         页面装饰的饱和度跟空度走（--jk-sat），斩得越多，整页越素。\n * apply：最新一层的空度档位 → <html data-dlc-void=\"0..4\">，最后一层正文的颜色被抽淡、字距变疏；字始终清楚。\n */\nfunction DLC_PAGE_做减求空(CORE, INFO, U) {\n  const 空度档 = [[100, '太上归空'], [75, '斩我见真'], [50, '忘筌得鱼'], [20, '损之又损'], [0, '万象负身']];\n  const 尘缘档 = [[80, '红尘满袖'], [60, '微霜染衣'], [40, '半忘悲欢'], [15, '孤鸿雪泥'], [0, '形神俱寂']];\n  const voidLv = (c) => U.tierOf(空度档, U.num(c && c.空度, 0)).i; // 0 万象负身 … 4 太上归空\n  const hash = (s) => { let x = 7; for (const ch of String(s)) x = (x * 31 + ch.codePointAt(0)) >>> 0; return x || 1; };\n  const rnd = (seed) => { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };\n  const fmtDate = (s) => String(s || '').replace(/^斗罗历/u, '').replace(/[年月]/gu, '.').replace(/日$/u, '');\n\n  // 斩类 → 岩彩（主色、亮色）\n  const PIG = {\n    魂环: ['#5C4FB0', '#B6AAF2'], // 群青紫\n    魂骨: ['#B9B09A', '#F1ECDD'], // 蛤粉\n    魂灵: ['#3E9C8A', '#A2E2D2'], // 石绿\n    情缘: ['#D9A63A', '#F6DC8E'], // 藤黄\n    记忆: ['#3D7FB8', '#9CC9EE'], // 石青\n    执念: ['#B8683A', '#EBB287'], // 赭石\n    名姓: ['#8C97A5', '#E1E7EE'], // 月白\n    血脉: ['#9A4E5C', '#E2A9B2'], // 胭脂灰\n    器甲: ['#5E8F6B', '#B5D8BC'], // 铜绿\n    权柄: ['#BF9A3F', '#F2E1A0'], // 泥金\n    外物: ['#77818B', '#C5CDD4'], // 铅灰\n  };\n  const RAMP = ['#3D7FB8', '#3E9C8A', '#D9A63A', '#B8683A', '#4A56B0', '#B9B09A'];\n  const pigOf = (k) => PIG[k] || PIG.外物;\n  const HEART = { 凡心未琢: '#B8BDC4', 澄明见性: '#9CC9EE', 孤高近道: '#E6EEF4', 心魔暗涌: '#EBB287', 临空将化: '#FFFFFF' };\n\n  /** 入场动画的属性和自己的 style 合在一起（U.play 也带 style，直接展开会把自己的冲掉） */\n  function withPlay(kit, attrs) {\n    const pl = U.play(kit);\n    return { ...attrs, ...pl, style: { ...(attrs.style || {}), ...(pl.style || {}) } };\n  }\n\n  /** 岩彩层：几道起伏的颜料带，从上往下一层压一层 */\n  function strata(sv, seed, cols, cls) {\n    const r = rnd(seed), bands = [], n = 6;\n    for (let i = 0; i < n; i += 1) {\n      const y0 = (i / n) * 100 - 6;\n      let d = `M0 ${(y0 + r() * 6).toFixed(1)}`;\n      for (let x = 50; x <= 400; x += 50) d += ` Q${x - 25} ${(y0 + (r() - 0.5) * 16).toFixed(1)} ${x} ${(y0 + (r() - 0.5) * 9).toFixed(1)}`;\n      bands.push(sv('path', { d: `${d} L400 100 L0 100Z`, fill: cols[i % cols.length], 'fill-opacity': (0.5 + r() * 0.45).toFixed(2) }));\n    }\n    return sv('svg', { class: cls, viewBox: '0 0 400 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, bands);\n  }\n\n  // ───────── 正文：<斩> ─────────\n  function cut(p, kit) {\n    const { h, sv } = kit;\n    const b = U.parseBlock(p.inner, []);\n    const name = b.meta.所斩 || '无名之物', kind = b.meta.类型 || '外物';\n    const [pg, pg2] = pigOf(kind);\n    const seed = hash(name);\n    const yl = 60 + (seed % 9), yr = 30 + ((seed >>> 5) % 9); // 斩线左右两端的高度（%）\n    const r = rnd(seed ^ 0x5bd1);\n    const flecks = [];\n    for (let i = 0; i < 14; i += 1) {\n      const x = 5 + i * 6.6 + r() * 3, y = yl + (yr - yl) * x / 100;\n      flecks.push(h('i', { class: 'dlc-jk-fleck', style: {\n        left: `${x.toFixed(1)}%`, top: `${y.toFixed(1)}%`, '--s': `${(2 + r() * 4).toFixed(1)}px`,\n        '--dx': `${(12 + r() * 44).toFixed(0)}px`, '--dy': `${(-20 - r() * 50).toFixed(0)}px`,\n        '--d': `${(-r() * 7).toFixed(2)}s`, '--c': i % 3 === 0 ? pg2 : i % 3 === 1 ? pg : '#8A9099' } }));\n    }\n    const cols = [pg, '#1D2933', pg2, '#2B2721', pg, '#16191D'];\n    const half = (cls, clip) => h('div', { class: `dlc-jk-half ${cls}`, style: { 'clip-path': clip }, 'aria-hidden': cls === 'gone' ? 'true' : null },\n      strata(sv, seed, cols, 'dlc-jk-strata'), h('b', { class: 'dlc-jk-name', text: name }));\n    const date = fmtDate(U.date(kit.env && kit.env.stat));\n    const line = `M-2 ${yl} L102 ${yr}`;\n    return h('section', withPlay(kit, { class: 'dlc-jk dlc-jk-cut', 'data-writing': p.closed ? null : true, style: { '--pg': pg, '--pg2': pg2 } }),\n      h('i', { class: 'dlc-jk-grain', 'aria-hidden': 'true' }),\n      h('header', { class: 'dlc-jk-hd' },\n        h('span', { class: 'dlc-jk-k', text: '斩' }),\n        h('span', { class: 'dlc-jk-kind', text: kind }),\n        h('span', { class: 'dlc-jk-sub', text: '斩一物 · 明一分' }),\n        date ? h('time', { class: 'dlc-jk-date', text: date }) : null),\n      h('div', { class: 'dlc-jk-slab' },\n        half('keep', `polygon(0 ${yl}%,100% ${yr}%,100% 100%,0 100%)`),\n        half('gone', `polygon(0 0,100% 0,100% ${yr}%,0 ${yl}%)`),\n        sv('svg', { class: 'dlc-jk-blade', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' },\n          sv('path', { class: 'dlc-jk-blade-g', d: line }), sv('path', { class: 'dlc-jk-blade-l', d: line })),\n        h('div', { class: 'dlc-jk-flecks', 'aria-hidden': 'true' }, flecks)),\n      (b.meta.代价 || b.meta.所得) ? h('dl', { class: 'dlc-jk-ledger' },\n        b.meta.代价 ? h('div', { class: 'dlc-jk-row', 'data-k': 'cost' }, h('dt', { text: '去', title: '代价' }), h('dd', null, h('span', { text: b.meta.代价 }))) : null,\n        b.meta.所得 ? h('div', { class: 'dlc-jk-row', 'data-k': 'gain' }, h('dt', { text: '得', title: '所得' }), h('dd', null, h('span', { text: b.meta.所得 }))) : null) : null,\n      b.body ? h('div', { class: 'dlc-jk-body' }, kit.sub(b.body)) : null);\n  }\n\n  // ───────── 正文：<结局> ─────────\n  /** 反噬（demon）还是归空（void）：先看死因和下手，再看正文，都没写明时看道心 */\n  function demonOf(why, by, body, c) {\n    const head = `${why || ''} ${by || ''}`;\n    if (/反噬|妄念|心魔|逆心|残执|吞真|崩解|寸断|倒灌|斩而未断/u.test(head)) return true;\n    if (/归空|化道|留白|褪尽|太上|虚无|天地法则|此身已空/u.test(head)) return false;\n    if (/反噬|妄念|心魔|吞真|倒灌/u.test(body || '')) return true;\n    if (/归空|留白|太上/u.test(body || '')) return false;\n    return !!(c && c.道心状态 === '心魔暗涌' && U.num(c.空度, 0) < 100);\n  }\n  function shards(sv, seed) {\n    const r = rnd(seed), out = [];\n    for (let i = 0; i < 22; i += 1) {\n      const a = r() * Math.PI * 2, d = 40 + r() * 150, x = 200 + Math.cos(a) * d, y = 90 + Math.sin(a) * d * 0.45;\n      const s = 6 + r() * 14, k = r() * Math.PI;\n      const pts = [0, 1, 2].map((j) => { const t = k + j * 2.1 + r() * 0.6; return `${(x + Math.cos(t) * s).toFixed(1)},${(y + Math.sin(t) * s).toFixed(1)}`; }).join(' ');\n      out.push(sv('polygon', { points: pts, fill: RAMP[i % RAMP.length], 'fill-opacity': (0.35 + r() * 0.5).toFixed(2),\n        style: { '--ox': `${(Math.cos(a) * 120).toFixed(0)}px`, '--oy': `${(Math.sin(a) * 60).toFixed(0)}px`, '--i': i } }));\n    }\n    return sv('svg', { class: 'dlc-jk-end-shards', viewBox: '0 0 400 180', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' },\n      out, sv('path', { class: 'dlc-jk-end-crack', d: 'M200 0 L192 40 L208 70 L186 112 L200 180 M208 70 L262 84 L300 76 M192 40 L150 50' }));\n  }\n  function ending(p, kit) {\n    const { h, sv } = kit;\n    const b = U.endingOf(p.inner);\n    const c = U.coreOf(kit.env && kit.env.stat);\n    const demon = demonOf(b.meta.死因, b.meta.下手, b.body, c);\n    const title = demon ? '斩而未断' : '此身已空';\n    return h('section', withPlay(kit, { class: 'dlc-jk dlc-jk-end', 'data-kind': demon ? 'demon' : 'void', 'data-writing': p.closed ? null : true }),\n      h('i', { class: 'dlc-jk-grain', 'aria-hidden': 'true' }),\n      demon ? shards(sv, hash(b.meta.死因 || 'demon'))\n        : h('div', { class: 'dlc-jk-end-wash', 'aria-hidden': 'true' }, strata(sv, hash(b.meta.死因 || 'void'), RAMP, 'dlc-jk-end-strata')),\n      h('div', { class: 'dlc-jk-end-frame' },\n        h('div', { class: 'dlc-jk-end-k', text: demon ? '心魔反噬 · 妄念吞真' : '太上归空 · 留白' }),\n        h('h3', { class: 'dlc-jk-end-t', 'aria-label': title }, [...title].map((ch, i) => h('span', { text: ch, style: { '--i': i } })))),\n      (b.meta.死因 || b.meta.下手) ? h('dl', { class: 'dlc-jk-end-m' },\n        b.meta.死因 ? [h('dt', { text: '死因' }), h('dd', { text: b.meta.死因 })] : null,\n        b.meta.下手 ? [h('dt', { text: '下手' }), h('dd', { text: b.meta.下手 })] : null) : null,\n      b.body ? h('div', { class: 'dlc-jk-body' }, kit.sub(b.body)) : null,\n      h('footer', { class: 'dlc-jk-end-f', text: demon ? '此局已终 · 斩下去的东西，一样一样都回来了' : '此局已终 · 世上少了一个人，也没有人记得少了谁' }));\n  }\n\n  // ───────── 状态栏 ─────────\n  /** 断环刃印：12 段岩彩环，空度越高抹掉的段越多、中间的留白越大；一刀斜贯 */\n  function emblem(sv, 空度, end, cls) {\n    const v = U.clamp(空度, 0, 100), gone = Math.round(v / 100 * 12), segs = [];\n    for (let i = 0; i < 12; i += 1) {\n      const a0 = (i * 30 - 90 + 3) * Math.PI / 180, a1 = ((i + 1) * 30 - 90 - 3) * Math.PI / 180;\n      segs.push(sv('path', { class: 'dlc-jk-seg', d: `M${(32 + 24 * Math.cos(a0)).toFixed(2)} ${(32 + 24 * Math.sin(a0)).toFixed(2)} A24 24 0 0 1 ${(32 + 24 * Math.cos(a1)).toFixed(2)} ${(32 + 24 * Math.sin(a1)).toFixed(2)}`,\n        stroke: RAMP[i % RAMP.length], 'data-off': i >= 12 - gone ? true : null }));\n    }\n    return sv('svg', { class: cls, viewBox: '0 0 64 64', 'aria-hidden': 'true', 'data-end': end || null },\n      sv('g', { class: 'dlc-jk-emb-ring' }, segs),\n      sv('circle', { class: 'dlc-jk-emb-void', cx: 32, cy: 32, r: (3 + v / 100 * 15).toFixed(1) }),\n      sv('path', { class: 'dlc-jk-emb-blade', d: 'M6 50 L58 14' }));\n  }\n  function eraseBar(h, sv, v) {\n    const x = U.clamp(v, 0, 100), cur = U.tierOf(空度档, x).name;\n    const dust = [0, 1, 2, 3, 4].map((i) => h('i', { class: 'dlc-jkp-dust', style: { '--i': i, top: `${15 + i * 17}%` } }));\n    return h('div', { class: 'dlc-jkp-erase' },\n      h('div', { class: 'dlc-jkp-bar', style: { '--v': `${x}%` } },\n        strata(sv, 77, RAMP, 'dlc-jkp-bar-s'),\n        h('span', { class: 'dlc-jkp-edge', 'aria-hidden': 'true' }, dust)),\n      h('div', { class: 'dlc-jkp-ticks', 'aria-hidden': 'true' },\n        空度档.slice().reverse().map(([at, name]) => [\n          h('i', { style: { '--x': `${at}%` } }),\n          h('span', { style: { '--x': `${at}%` }, 'data-on': name === cur ? true : null, 'data-at': at, text: name })])));\n  }\n  function threads(sv, v) {\n    const N = 20, lit = Math.round(U.clamp(v, 0, 100) / 100 * N), cols = ['#D9A63A', '#3E9C8A', '#3D7FB8', '#B8683A', '#F6DC8E'];\n    const gs = [];\n    for (let i = 0; i < N; i += 1) {\n      const x = 5 + i * (190 / (N - 1));\n      if (i < lit) {\n        gs.push(sv('g', { class: 'dlc-jkp-th-on', style: { '--i': i } },\n          sv('path', { d: `M${x.toFixed(1)} 2 C${(x + 3).toFixed(1)} 20 ${(x - 3).toFixed(1)} 40 ${x.toFixed(1)} 58`, stroke: cols[i % cols.length] }),\n          sv('circle', { cx: x.toFixed(1), cy: 58, r: 1.6, fill: cols[i % cols.length] })));\n      } else {\n        const end = 9 + ((i * 7) % 13);\n        gs.push(sv('g', { class: 'dlc-jkp-th-off', style: { '--i': i } },\n          sv('path', { d: `M${x.toFixed(1)} 2 L${x.toFixed(1)} ${end}` }),\n          sv('path', { class: 'dlc-jkp-fray', d: `M${(x - 2).toFixed(1)} ${end + 1} L${(x + 2).toFixed(1)} ${end + 4}` })));\n      }\n    }\n    return sv('svg', { class: 'dlc-jkp-th', viewBox: '0 0 200 60', preserveAspectRatio: 'none', 'aria-hidden': 'true' },\n      sv('path', { class: 'dlc-jkp-th-beam', d: 'M0 2 H200' }), gs);\n  }\n  function knotGlyph(sv, s) {\n    const k = { 潜伏: 'hide', 躁动: 'stir', 反噬: 'back', 道痕: 'scar' }[s] || 'hide';\n    return sv('svg', { class: 'dlc-jkp-knot', viewBox: '0 0 24 24', 'data-k': k, 'aria-hidden': 'true' },\n      k === 'scar' ? [sv('path', { d: 'M5 18 L19 6' }), sv('circle', { cx: 8, cy: 8, r: 0.9 }), sv('circle', { cx: 16, cy: 17, r: 0.9 })]\n        : [sv('circle', { cx: 12, cy: 12, r: k === 'hide' ? 4.5 : 6 }),\n          k === 'stir' ? sv('path', { d: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2' }) : null,\n          k === 'back' ? sv('path', { class: 'c', d: 'M12 4 L10 10 L14 13 L11 20' }) : null]);\n  }\n  function page(st, kit) {\n    const { h, sv } = kit;\n    const c = U.coreOf(st) || {};\n    const 空度 = U.num(c.空度, 0), 尘缘 = U.num(c.尘缘, 100);\n    const cuts = U.list(c.所斩之物).slice().reverse(), knots = U.list(c.残执心障);\n    const heart = c.道心状态 || '凡心未琢';\n    const end = U.ended(c) ? (demonOf(c.结局.死因, c.结局.下手, '', c) ? 'demon' : 'void') : null;\n    const warn = [];\n    if (!end && 空度 >= 85) warn.push('临空：再斩一刀，这个人就不在了。');\n    if (!end && 尘缘 <= 20) warn.push('尘缘将尽：还能拉住你的人，不多了。');\n    if (!end && heart === '心魔暗涌') warn.push('心魔暗涌：斩而未断的东西，正在找回来的路。');\n    return h('div', { class: 'dlc-jkp', 'data-m': kit.motion || 'full', 'data-lv': voidLv(c), style: { '--jk-sat': (1 - U.clamp(空度, 0, 100) / 100 * 0.82).toFixed(2) } },\n      end ? h('div', { class: 'dlc-jkp-end', 'data-kind': end },\n        h('b', { text: end === 'demon' ? '斩而未断' : '此身已空' }),\n        h('span', { text: `${c.结局.死因 || ''}${c.结局.下手 ? ' · ' + c.结局.下手 : ''}` })) : null,\n      h('header', { class: 'dlc-jkp-top' },\n        emblem(sv, 空度, end, 'dlc-jk-emb'),\n        h('div', null,\n          h('div', { class: 'dlc-jkp-k', text: '叙事核心 · 断环刃印' }),\n          h('h4', null, '做减求空', h('small', { text: '·斩我见真' })),\n          h('p', { class: 'dlc-jkp-q', text: INFO.引 }),\n          h('div', { class: 'dlc-jkp-heart', 'data-h': heart, style: { '--hc': HEART[heart] || '#D3DDE6' } }, h('span', { text: '道心' }), h('b', { text: heart })))),\n      warn.length ? h('div', { class: 'dlc-jkp-warn' }, warn.map((x) => h('p', { text: x }))) : null,\n      h('section', { class: 'dlc-jkp-sec' },\n        h('div', { class: 'dlc-jkp-v' }, h('span', { text: '空度' }), h('b', { text: String(空度) }), h('em', { text: c.空度档位 || U.tierOf(空度档, 空度).name })),\n        eraseBar(h, sv, 空度)),\n      h('section', { class: 'dlc-jkp-sec' },\n        h('div', { class: 'dlc-jkp-v', 'data-k': 'dust' }, h('span', { text: '尘缘' }), h('b', { text: String(尘缘) }), h('em', { text: c.尘缘档位 || U.tierOf(尘缘档, 尘缘).name })),\n        threads(sv, 尘缘)),\n      h('section', { class: 'dlc-jkp-sec' },\n        h('h5', null, '减法账', h('span', { text: `所斩 ${cuts.length}/12` })),\n        cuts.length ? h('ol', { class: 'dlc-jkp-cuts' }, cuts.map((x) => {\n          const [pg, pg2] = pigOf(x.类型);\n          return h('li', { class: 'dlc-jkp-cut', style: { '--pg': pg, '--pg2': pg2 } },\n            h('i', { class: 'dlc-jkp-sw', 'aria-hidden': 'true' }),\n            h('div', null,\n              h('div', { class: 'dlc-jkp-cut-hd' },\n                h('span', { class: 'dlc-jkp-cut-k', text: x.类型 || '外物' }),\n                h('b', { text: x.名称 || '无名之物' }),\n                x.日期 ? h('time', { text: fmtDate(x.日期) }) : null),\n              x.代价 ? h('p', { class: 'dlc-jkp-cost' }, h('i', { text: '去' }), x.代价) : null,\n              x.所得 ? h('p', { class: 'dlc-jkp-gain' }, h('i', { text: '得' }), x.所得) : null));\n        })) : h('p', { class: 'dlc-jkp-none', text: '还没斩过什么。身上的每一样，都还在。' })),\n      h('section', { class: 'dlc-jkp-sec' },\n        h('h5', null, '残执心障', h('span', { text: `${knots.length}/6` })),\n        knots.length ? h('ul', { class: 'dlc-jkp-knots' }, knots.map((x) => h('li', { 'data-s': x.状态 || '潜伏' },\n          knotGlyph(sv, x.状态),\n          h('div', null, h('b', { text: x.执念 || '' }), x.成因 ? h('p', { text: x.成因 }) : null),\n          h('em', { text: x.状态 || '潜伏' }))))\n          : h('p', { class: 'dlc-jkp-none', text: '心湖澄澈，没有斩而未断的东西。' })));\n  }\n  function dock(st, kit) {\n    const c = U.coreOf(st) || {};\n    const 空度 = U.num(c.空度, 0), 尘缘 = U.num(c.尘缘, 100);\n    const end = U.ended(c) ? 'end' : null;\n    return kit.h('span', { class: 'dlc-jkd', 'data-m': kit.motion || 'full', 'data-lv': voidLv(c), title: `做减求空 · 空度 ${空度}（${c.空度档位 || U.tierOf(空度档, 空度).name}）· 尘缘 ${尘缘} · ${c.道心状态 || '凡心未琢'}`,\n      style: { '--jk-sat': (1 - U.clamp(空度, 0, 100) / 100 * 0.82).toFixed(2) } },\n      emblem(kit.sv, 空度, end, 'dlc-jk-emb dlc-jkd-emb'),\n      kit.h('b', { 'data-k': 'v', text: String(空度) }), kit.h('i', { text: '·' }), kit.h('b', { 'data-k': 'b', text: String(尘缘) }));\n  }\n\n  /** 最新一层的空度档位 → 主页面 <html data-dlc-void=\"0..4\">；已终结、换核心或撤下时彻底移除 */\n  function apply(st, doc) {\n    const root = doc && doc.documentElement;\n    if (!root) return;\n    const c = st && U.coreOf(st);\n    if (st && U.mine(st) && !U.ended(c)) root.setAttribute('data-dlc-void', String(voidLv(c)));\n    else root.removeAttribute('data-dlc-void');\n  }\n\n  const P = '#chat .last_mes .mes_text[data-dlp-theme]';\n  const css = `\n.dlc-jk,.dlc-jkp,.dlc-jkd{--jk-ink:#0F1114;--jk-p2:#1B1F25;--jk-azure:#3D7FB8;--jk-azure2:#9CC9EE;--jk-mala:#3E9C8A;--jk-gam:#D9A63A;--jk-gam2:#F6DC8E;--jk-ochre:#B8683A;--jk-ochre2:#EBB287;--jk-ultra:#4A56B0;--jk-shell:#ECE7DB;--jk-moon:#D3DDE6;--jk-lead:#8A9099;--jk-txt:#E8E5DD;--jk-txt2:#A0A5AC;\n  --jk-rule:linear-gradient(90deg,#3D7FB8,#3E9C8A 22%,#D9A63A 46%,#B8683A 68%,#4A56B0 88%,#9CC9EE)}\n.dlc-jk{position:relative;isolation:isolate;overflow:hidden;container-type:inline-size;margin:1.15em 0;color:var(--jk-txt);font-family:var(--dlp-serif,serif);\n  background:radial-gradient(110% 70% at 0 0,rgba(61,127,184,.16),transparent 58%),radial-gradient(80% 60% at 100% 100%,rgba(217,166,58,.10),transparent 62%),linear-gradient(180deg,var(--jk-p2),var(--jk-ink));\n  --dlp-on:var(--jk-txt);--dlp-on2:var(--jk-txt2);--dlp-on-line:rgba(233,230,222,.14)}\n.dlc-jk::before{content:'';position:absolute;left:0;right:0;top:0;height:2px;z-index:4;background:var(--jk-rule);\n  -webkit-mask:linear-gradient(90deg,#000 0 58%,transparent 58% 66%,#000 66%);mask:linear-gradient(90deg,#000 0 58%,transparent 58% 66%,#000 66%)}\n.dlc-jk::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;z-index:4;background:linear-gradient(90deg,transparent,rgba(233,230,222,.2) 30%,transparent)}\n.dlc-jk-grain{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.55;\n  background:repeating-linear-gradient(97deg,rgba(255,255,255,.02) 0 1px,transparent 1px 4px),repeating-linear-gradient(7deg,rgba(0,0,0,.14) 0 1px,transparent 1px 5px)}\n.dlc-jk-hd{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;padding:13px 16px 9px;font-size:12px;letter-spacing:.08em;color:var(--jk-txt2)}\n.dlc-jk-k{position:relative;font-size:19px;line-height:1;color:var(--jk-shell);letter-spacing:0}\n.dlc-jk-k::after{content:'';position:absolute;left:-4px;right:-4px;top:52%;height:1.5px;background:var(--pg2);transform:rotate(-26deg)}\n.dlc-jk-kind{color:var(--pg2);font-weight:600}\n.dlc-jk-kind::before{content:'';display:inline-block;width:12px;height:2px;margin-right:6px;vertical-align:middle;background:var(--pg)}\n.dlc-jk-sub{opacity:.75}\n.dlc-jk-date{margin-left:auto;font-family:var(--dlp-mono,ui-monospace,monospace);font-size:11px;letter-spacing:.04em;font-variant-numeric:tabular-nums}\n.dlc-jk[data-writing] .dlc-jk-hd::after{content:'……';letter-spacing:.1em;color:var(--pg2)}\n/* 名签：两半叠在同一格，各自按斩线裁开；斩开的缝里露出底下的留白纸色 */\n.dlc-jk-slab{position:relative;display:grid;background:#0B0D10}\n.dlc-jk-half{grid-area:1/1;position:relative;overflow:hidden;background:#15181C;padding:30px 16px 32px}\n.dlc-jk-strata{position:absolute;top:0;left:-3%;width:106%;height:100%}\n.dlc-jk-half::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(13,15,18,.76),rgba(13,15,18,.34) 62%,rgba(13,15,18,.08))}\n.dlc-jk-name{position:relative;z-index:1;display:block;font-size:clamp(18px,5.6cqw,30px);line-height:1.32;letter-spacing:.06em;font-weight:700;color:#F5F1E7;\n  text-shadow:0 1px 0 rgba(0,0,0,.55),0 0 18px rgba(10,12,16,.6);overflow-wrap:anywhere}\n.dlc-jk-cut:not([data-writing]) .dlc-jk-half.gone{transform:translate(7px,-6px) rotate(-.6deg);filter:grayscale(1) brightness(.72) contrast(.9)}\n.dlc-jk-blade{position:absolute;inset:0;width:100%;height:100%;z-index:2;overflow:visible;pointer-events:none}\n.dlc-jk-blade path{fill:none;vector-effect:non-scaling-stroke;stroke-linecap:square}\n.dlc-jk-blade-l{stroke:#F8F4EA;stroke-width:1.4}\n.dlc-jk-blade-g{stroke:var(--pg2);stroke-width:6;opacity:.22}\n.dlc-jk-cut[data-writing] .dlc-jk-blade-l{stroke-dasharray:3 6;opacity:.5}\n.dlc-jk-cut[data-writing] .dlc-jk-blade-g,.dlc-jk-cut[data-writing] .dlc-jk-flecks{display:none}\n.dlc-jk-flecks{position:absolute;inset:0;z-index:3;pointer-events:none}\n.dlc-jk-fleck{position:absolute;width:var(--s);height:var(--s);background:var(--c);opacity:.5;transform:translate(calc(var(--dx) * .35),calc(var(--dy) * .35)) rotate(30deg)}\n/* 去 / 得 */\n.dlc-jk-ledger{margin:0;padding:12px 16px 2px;display:grid;gap:8px}\n.dlc-jk-row{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;align-items:start}\n.dlc-jk-row dt{width:20px;height:20px;display:grid;place-items:center;font-size:12px;line-height:1;border:1px solid;box-sizing:border-box}\n.dlc-jk-row dd{margin:0;font-size:13.5px;line-height:1.6}\n.dlc-jk-row[data-k=cost] dt{color:var(--jk-lead);border-color:rgba(138,144,153,.55)}\n.dlc-jk-row[data-k=cost] dd{color:var(--jk-txt2)}\n.dlc-jk-row[data-k=cost] dd span{text-decoration:line-through;text-decoration-thickness:1px;text-decoration-color:var(--pg)}\n.dlc-jk-row[data-k=gain] dt{color:#101215;background:var(--pg2);border-color:var(--pg2)}\n.dlc-jk-row[data-k=gain] dd{color:var(--jk-txt);font-weight:600}\n.dlc-jk-body{margin-top:12px;padding:10px 16px 16px;border-top:1px solid rgba(233,230,222,.08);line-height:1.85}\n.dlc-jk-body>:first-child{margin-top:0}.dlc-jk-body>:last-child{margin-bottom:0}\n/* 结局 · 归空：一张留白纸 */\n.dlc-jk-end[data-kind=void]{color:#3A3F46;background:radial-gradient(80% 60% at 50% 0,rgba(255,255,255,.7),transparent 70%),linear-gradient(180deg,#F0ECE2,#E1DBCE);\n  --dlp-on:#3A3F46;--dlp-on2:#6B717A;--dlp-on-line:rgba(40,44,50,.16)}\n.dlc-jk-end[data-kind=void]::before{filter:grayscale(1);opacity:.3}\n.dlc-jk-end[data-kind=void] .dlc-jk-grain{background:repeating-linear-gradient(97deg,rgba(0,0,0,.03) 0 1px,transparent 1px 4px),repeating-linear-gradient(7deg,rgba(0,0,0,.025) 0 1px,transparent 1px 5px)}\n.dlc-jk-end-wash{position:absolute;left:0;right:0;top:0;height:52%;z-index:0;opacity:.08;filter:grayscale(1);pointer-events:none}\n.dlc-jk-end-strata{display:block;width:100%;height:100%}\n.dlc-jk-end-frame{position:relative;z-index:1;margin:24px 16px 6px;padding:22px 12px 20px;text-align:center;border:1px solid rgba(58,63,70,.3);outline:1px solid rgba(58,63,70,.1);outline-offset:5px}\n.dlc-jk-end-k{font-size:12px;letter-spacing:.42em;color:#8A9099;margin-bottom:12px}\n.dlc-jk-end-t{margin:0;font-size:clamp(30px,10cqw,54px);line-height:1.15;letter-spacing:.38em;text-indent:.38em;font-weight:700}\n.dlc-jk-end[data-kind=void] .dlc-jk-end-t span{color:transparent;-webkit-text-stroke:1px rgba(58,63,70,.62)}\n.dlc-jk-end[data-kind=void] .dlc-jk-end-t span:last-child{-webkit-text-stroke-color:rgba(58,63,70,.22)}\n.dlc-jk-end-m{position:relative;z-index:1;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;margin:14px 16px 0;padding:8px 10px;font-size:13px;line-height:1.6}\n.dlc-jk-end[data-kind=demon] .dlc-jk-end-m{background:rgba(13,11,10,.72)}\n.dlc-jk-end-m dt{color:#8A9099;letter-spacing:.2em}\n.dlc-jk-end-m dd{margin:0}\n.dlc-jk-end .dlc-jk-body{position:relative;z-index:1}\n.dlc-jk-end[data-kind=void] .dlc-jk-body{border-top-color:rgba(58,63,70,.12)}\n.dlc-jk-end-f{position:relative;z-index:1;padding:8px 16px 14px;font-size:12px;letter-spacing:.14em;color:#8A9099;text-align:center}\n/* 结局 · 反噬：碎片倒灌，颜色搅浊 */\n.dlc-jk-end[data-kind=demon]{background:radial-gradient(70% 60% at 50% 36%,rgba(184,104,58,.3),transparent 70%),radial-gradient(60% 50% at 18% 92%,rgba(74,86,176,.24),transparent 70%),linear-gradient(180deg,#1D1814,#0D0B0A)}\n.dlc-jk-end-shards{position:absolute;left:0;top:0;width:100%;height:172px;z-index:0;pointer-events:none}\n.dlc-jk-end-shards polygon{transform-box:fill-box;transform-origin:center}\n.dlc-jk-end-crack{fill:none;stroke:#F0B48A;stroke-width:1.2;opacity:.7}\n.dlc-jk-end[data-kind=demon] .dlc-jk-end-frame{border-color:rgba(235,178,135,.45);outline-color:rgba(156,201,238,.2);background:rgba(13,11,10,.55)}\n.dlc-jk-end[data-kind=demon] .dlc-jk-end-k{color:var(--jk-ochre2)}\n.dlc-jk-end[data-kind=demon] .dlc-jk-end-t{color:#F1E3CF;text-shadow:2px 0 rgba(184,104,58,.8),-2px 0 rgba(61,127,184,.65),0 2px rgba(62,156,138,.5)}\n.dlc-jk-end[data-kind=demon] .dlc-jk-end-m dt,.dlc-jk-end[data-kind=demon] .dlc-jk-end-f{color:var(--jk-ochre2)}\n\n/* ───── 状态栏页 ───── */\n.dlc-jkp{position:relative;isolation:isolate;overflow:hidden;container-type:inline-size;padding:16px 14px 16px;color:var(--jk-txt);font-family:var(--dlp-serif,serif);\n  background:radial-gradient(90% 50% at 0 0,rgba(61,127,184,.16),transparent 60%),radial-gradient(70% 50% at 100% 30%,rgba(217,166,58,.09),transparent 60%),linear-gradient(180deg,#171B21,#0F1114)}\n.dlc-jkp::before{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:var(--jk-rule);filter:saturate(var(--jk-sat,1));\n  -webkit-mask:linear-gradient(90deg,#000 0 58%,transparent 58% 66%,#000 66%);mask:linear-gradient(90deg,#000 0 58%,transparent 58% 66%,#000 66%)}\n.dlc-jkp-end{margin:-16px -14px 14px;padding:10px 14px;display:grid;gap:3px;background:#E7E2D6;color:#3A3F46}\n.dlc-jkp-end b{font-size:15px;letter-spacing:.36em}\n.dlc-jkp-end span{font-size:12px;line-height:1.5}\n.dlc-jkp-end[data-kind=demon]{background:linear-gradient(90deg,#3B2519,#1C1512);color:#F1DCC8}\n.dlc-jkp-top{display:grid;grid-template-columns:76px minmax(0,1fr);gap:14px;align-items:center}\n.dlc-jk-emb{display:block;width:76px;height:76px;overflow:visible;filter:saturate(var(--jk-sat,1))}\n.dlc-jk-seg{fill:none;stroke-width:5.5}\n.dlc-jk-seg[data-off]{stroke:#4A5058;stroke-width:1;stroke-dasharray:1.5 2.5}\n.dlc-jk-emb-ring{transform-box:view-box;transform-origin:50% 50%}\n.dlc-jk-emb-void{fill:#DCD6C8}\n.dlc-jk-emb-blade{fill:none;stroke:#F7F3EA;stroke-width:1.4}\n.dlc-jk-emb[data-end] .dlc-jk-seg{stroke:#4A5058;stroke-width:1;stroke-dasharray:1.5 2.5}\n.dlc-jkp-k{font-size:11px;letter-spacing:.3em;color:var(--jk-txt2)}\n.dlc-jkp h4{margin:3px 0 2px;font-size:22px;line-height:1.2;letter-spacing:.14em;color:var(--jk-shell)}\n.dlc-jkp h4 small{margin-left:4px;font-size:13px;letter-spacing:.08em;color:var(--jk-txt2);font-weight:400}\n.dlc-jkp-q{margin:0;font-size:12px;line-height:1.6;color:var(--jk-txt2)}\n.dlc-jkp-heart{display:inline-flex;align-items:baseline;gap:8px;margin-top:6px;font-size:12px}\n.dlc-jkp-heart span{color:var(--jk-txt2);letter-spacing:.3em}\n.dlc-jkp-heart b{color:var(--hc);letter-spacing:.14em}\n.dlc-jkp-heart::before{content:'';width:7px;height:7px;align-self:center;background:var(--hc)}\n.dlc-jkp-warn p{margin:10px 0 0;padding:6px 10px;font-size:12px;line-height:1.55;border-left:2px solid var(--jk-ochre);background:linear-gradient(90deg,rgba(184,104,58,.18),transparent);color:#F1DCC8}\n.dlc-jkp-sec{margin-top:18px}\n.dlc-jkp-sec h5{display:flex;align-items:baseline;gap:10px;margin:0 0 6px;font-size:13px;letter-spacing:.3em;color:var(--jk-shell);font-weight:600}\n.dlc-jkp-sec h5 span{font-family:var(--dlp-mono,ui-monospace,monospace);font-size:11px;letter-spacing:.04em;color:var(--jk-txt2);font-weight:400}\n.dlc-jkp-v{display:flex;align-items:baseline;gap:9px;margin-bottom:7px}\n.dlc-jkp-v span{font-size:12px;letter-spacing:.3em;color:var(--jk-txt2)}\n.dlc-jkp-v b{font-family:var(--dlp-mono,ui-monospace,monospace);font-size:26px;line-height:1;color:var(--jk-shell);font-variant-numeric:tabular-nums}\n.dlc-jkp-v em{font-style:normal;font-size:13px;letter-spacing:.16em;color:var(--jk-azure2)}\n.dlc-jkp-v[data-k=dust] em{color:var(--jk-gam2)}\n/* 空度：一条岩彩带，左边被抹成留白 */\n.dlc-jkp-bar{position:relative;height:24px;background:#DAD4C6;box-shadow:inset 0 0 0 1px rgba(0,0,0,.2)}\n.dlc-jkp-bar-s{position:absolute;inset:0;width:100%;height:100%;clip-path:inset(0 0 0 var(--v));filter:saturate(var(--jk-sat,1))}\n.dlc-jkp-edge{position:absolute;top:-3px;bottom:-3px;left:var(--v);width:2px;margin-left:-1px;background:#F7F3EA;box-shadow:0 0 8px rgba(247,243,234,.6)}\n.dlc-jkp-dust{position:absolute;left:0;width:3px;height:3px;background:#8A9099;opacity:0}\n.dlc-jkp-ticks{position:relative;height:28px;margin-top:3px;font-size:10.5px;color:var(--jk-txt2)}\n.dlc-jkp-ticks i{position:absolute;top:0;left:var(--x);width:1px;height:6px;background:rgba(233,230,222,.35)}\n.dlc-jkp-ticks span{position:absolute;top:9px;left:var(--x);transform:translateX(-50%);white-space:nowrap;letter-spacing:.06em}\n.dlc-jkp-ticks span[data-at=\"0\"]{transform:none}.dlc-jkp-ticks span[data-at=\"100\"]{transform:translateX(-100%)}\n.dlc-jkp-ticks span[data-on]{color:var(--jk-shell)}\n@container (max-width:360px){.dlc-jkp-ticks span:not([data-on]){display:none}}\n/* 尘缘丝 */\n.dlc-jkp-th{display:block;width:100%;height:64px;overflow:visible}\n.dlc-jkp-th path{fill:none;vector-effect:non-scaling-stroke}\n.dlc-jkp-th-beam{stroke:rgba(233,230,222,.4);stroke-width:1}\n.dlc-jkp-th-on path{stroke-width:1.6;filter:saturate(var(--jk-sat,1))}\n.dlc-jkp-th-on circle{filter:saturate(var(--jk-sat,1))}\n.dlc-jkp-th-off path{stroke:#4C535C;stroke-width:1.2}\n.dlc-jkp-th-on,.dlc-jkp-th-off{transform-box:fill-box;transform-origin:50% 0}\n/* 减法账 */\n.dlc-jkp-cuts{list-style:none;margin:0;padding:0}\n.dlc-jkp-cut{display:grid;grid-template-columns:14px minmax(0,1fr);gap:11px;padding:10px 0;border-top:1px solid rgba(233,230,222,.08)}\n.dlc-jkp-sw{display:block;width:14px;height:36px;background:linear-gradient(162deg,#565D66 0 40%,transparent 40% 47%,var(--pg) 47% 80%,var(--pg2) 80%);filter:saturate(var(--jk-sat,1))}\n.dlc-jkp-cut-hd{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px}\n.dlc-jkp-cut-k{font-size:11px;color:var(--pg2);letter-spacing:.1em}\n.dlc-jkp-cut-hd b{font-size:14px;color:var(--jk-shell);text-decoration:line-through;text-decoration-thickness:1px;text-decoration-color:rgba(233,230,222,.4)}\n.dlc-jkp-cut-hd time{margin-left:auto;font-family:var(--dlp-mono,ui-monospace,monospace);font-size:10.5px;color:var(--jk-txt2)}\n.dlc-jkp-cost,.dlc-jkp-gain{margin:3px 0 0;font-size:12px;line-height:1.55}\n.dlc-jkp-cost{color:var(--jk-txt2)}.dlc-jkp-gain{color:var(--jk-moon)}\n.dlc-jkp-cost i,.dlc-jkp-gain i{font-style:normal;margin-right:6px;padding:0 3px;border:1px solid currentColor;font-size:10.5px}\n.dlc-jkp-gain i{color:var(--pg2)}\n/* 残执心障 */\n.dlc-jkp-knots{list-style:none;margin:0;padding:0}\n.dlc-jkp-knots li{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 0;border-top:1px solid rgba(233,230,222,.08)}\n.dlc-jkp-knots b{font-size:13.5px;color:var(--jk-txt)}\n.dlc-jkp-knots p{margin:2px 0 0;font-size:12px;line-height:1.5;color:var(--jk-txt2)}\n.dlc-jkp-knots em{font-style:normal;font-size:11px;letter-spacing:.14em;color:var(--jk-txt2)}\n.dlc-jkp-knots li[data-s=躁动] em{color:var(--jk-ochre2)}.dlc-jkp-knots li[data-s=反噬] em{color:#F2A070}.dlc-jkp-knots li[data-s=道痕] em{color:var(--jk-moon)}\n.dlc-jkp-knot{width:22px;height:22px;fill:none;stroke:#7B828B;stroke-width:1.4}\n.dlc-jkp-knot[data-k=stir]{stroke:var(--jk-ochre2)}\n.dlc-jkp-knot[data-k=back]{stroke:#F2A070}.dlc-jkp-knot[data-k=back] circle{fill:rgba(184,104,58,.3)}.dlc-jkp-knot .c{stroke:#FFE2C8}\n.dlc-jkp-knot[data-k=scar]{stroke:var(--jk-moon);stroke-width:2}.dlc-jkp-knot[data-k=scar] circle{fill:var(--jk-moon);stroke:none}\n.dlc-jkp-none{margin:4px 0 0;font-size:12px;color:var(--jk-txt2)}\n/* 底栏 */\n.dlc-jkd{display:inline-flex;align-items:center;gap:5px;font:600 12px/1 var(--dlp-mono,ui-monospace,monospace);color:var(--jk-txt)}\n.dlc-jkd-emb{width:20px;height:20px}\n.dlc-jkd b[data-k=v]{color:var(--jk-shell)}.dlc-jkd b[data-k=b]{color:var(--jk-gam2)}.dlc-jkd i{font-style:normal;color:var(--jk-txt2)}\n\n/* ───── 动效：只在 full 里动；reduced 只留短暂的淡入；off 全静 ───── */\n[data-dlp-motion=full] .dlc-jk-strata{animation:dlcJkFlow 16s ease-in-out infinite alternate}\n[data-dlp-motion=full] .dlc-jk-cut[data-play] .dlc-jk-blade{animation:dlcJkWipe .5s cubic-bezier(.7,0,.3,1) both;animation-delay:calc(var(--dlc-t,0s) + .25s)}\n[data-dlp-motion=full] .dlc-jk-cut[data-play] .dlc-jk-blade-g{animation:dlcJkFlash 1s ease-out both;animation-delay:calc(var(--dlc-t,0s) + .6s)}\n[data-dlp-motion=full] .dlc-jk-cut:not([data-writing]) .dlc-jk-half.gone{animation:dlcJkDrift 7s ease-in-out infinite alternate}\n[data-dlp-motion=full] .dlc-jk-cut[data-play]:not([data-writing]) .dlc-jk-half.gone{animation:dlcJkSever 1.4s cubic-bezier(.3,.6,.2,1) both,dlcJkDrift 7s ease-in-out infinite alternate;\n  animation-delay:calc(var(--dlc-t,0s) + .75s),calc(var(--dlc-t,0s) + 2.2s)}\n[data-dlp-motion=full] .dlc-jk-cut:not([data-writing]) .dlc-jk-fleck{animation:dlcJkFleck 7s linear infinite;animation-delay:var(--d)}\n[data-dlp-motion=full] .dlc-jk-cut[data-play] .dlc-jk-row[data-k=cost] dd span{animation:dlcJkStrike .9s ease-out both;animation-delay:calc(var(--dlc-t,0s) + 1.6s)}\n[data-dlp-motion=full] .dlc-jk-cut[data-play] .dlc-jk-row[data-k=gain]{animation:dlcJkRise .8s ease-out both;animation-delay:calc(var(--dlc-t,0s) + 2.1s)}\n[data-dlp-motion=full] .dlc-jk-cut[data-writing] .dlc-jk-blade{animation:dlcJkHover 1.4s ease-in-out infinite alternate}\n[data-dlp-motion=full] .dlc-jk-end[data-kind=void][data-play] .dlc-jk-end-wash{animation:dlcJkDrain 2.6s ease-in both;animation-delay:var(--dlc-t,0s)}\n[data-dlp-motion=full] .dlc-jk-end[data-kind=void][data-play] .dlc-jk-end-t span{animation:dlcJkHollow 1.2s ease-in-out both;animation-delay:calc(var(--dlc-t,0s) + 1.4s + var(--i) * .45s)}\n[data-dlp-motion=full] .dlc-jk-end[data-kind=void] .dlc-jk-end-frame{animation:dlcJkBreath 8s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-jk-end[data-kind=demon] .dlc-jk-end-shards polygon{animation:dlcJkJitter 2.6s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -.23s)}\n[data-dlp-motion=full] .dlc-jk-end[data-kind=demon][data-play] .dlc-jk-end-shards polygon{animation:dlcJkReturn 1.6s cubic-bezier(.2,.7,.2,1) both,dlcJkJitter 2.6s ease-in-out infinite alternate;\n  animation-delay:calc(var(--dlc-t,0s) + var(--i) * .04s),calc(var(--dlc-t,0s) + 1.8s + var(--i) * -.23s)}\n[data-dlp-motion=full] .dlc-jk-end[data-kind=demon] .dlc-jk-end-crack{animation:dlcJkCrack 2.2s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-jk-end[data-kind=demon] .dlc-jk-end-t{animation:dlcJkSplit 3.2s steps(1) infinite}\n[data-dlp-motion=reduced] .dlc-jk[data-play] .dlc-jk-half.gone,[data-dlp-motion=reduced] .dlc-jk-end[data-play] .dlc-jk-end-frame{animation:dlcJkFade .5s ease-out both}\n.dlc-jkp[data-m=full] .dlc-jk-emb-ring,.dlc-jkd[data-m=full] .dlc-jk-emb-ring{animation:dlcJkSpin 48s linear infinite}\n.dlc-jkp[data-m=full] .dlc-jk-emb-blade{animation:dlcJkGlint 3.6s ease-in-out infinite}\n.dlc-jkp[data-m=full] .dlc-jkp-th-on{animation:dlcJkSway 4.6s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -.41s)}\n.dlc-jkp[data-m=full] .dlc-jkp-th-off{animation:dlcJkSway 6s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -.53s)}\n.dlc-jkp[data-m=full] .dlc-jkp-dust{animation:dlcJkDust 3.4s linear infinite;animation-delay:calc(var(--i) * -.68s)}\n.dlc-jkp[data-m=full] .dlc-jkp-knot[data-k=stir]{animation:dlcJkStir .9s steps(2) infinite}\n.dlc-jkp[data-m=full] .dlc-jkp-knot[data-k=back]{animation:dlcJkPulse 1.6s ease-in-out infinite}\n.dlc-jkp[data-m=full] .dlc-jkp-heart[data-h=临空将化] b{animation:dlcJkFlicker 2.4s steps(1) infinite}\n.dlc-jkp[data-m=full] .dlc-jkp-heart[data-h=心魔暗涌]::before{animation:dlcJkPulse 1.4s ease-in-out infinite}\n@keyframes dlcJkFlow{to{transform:translateX(-2.5%)}}\n@keyframes dlcJkWipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}\n@keyframes dlcJkFlash{0%{opacity:0;stroke-width:1}25%{opacity:.9;stroke-width:14}100%{opacity:.22;stroke-width:6}}\n@keyframes dlcJkSever{from{transform:none;filter:none}to{transform:translate(7px,-6px) rotate(-.6deg);filter:grayscale(1) brightness(.72) contrast(.9)}}\n@keyframes dlcJkDrift{from{translate:0 0}to{translate:3px -3px}}\n@keyframes dlcJkFleck{0%{transform:translate(0,0) rotate(0);opacity:0}12%{opacity:.95}100%{transform:translate(var(--dx),var(--dy)) rotate(200deg);opacity:0}}\n@keyframes dlcJkStrike{from{text-decoration-color:transparent;color:var(--jk-txt)}to{text-decoration-color:var(--pg);color:var(--jk-txt2)}}\n@keyframes dlcJkRise{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}\n@keyframes dlcJkHover{from{transform:translateY(-4px)}to{transform:translateY(4px)}}\n@keyframes dlcJkDrain{0%{opacity:.95;filter:none}100%{opacity:.08;filter:grayscale(1)}}\n@keyframes dlcJkHollow{from{color:#2A2E33;-webkit-text-stroke-color:transparent}to{color:transparent}}\n@keyframes dlcJkBreath{0%,100%{outline-offset:5px}50%{outline-offset:9px}}\n@keyframes dlcJkReturn{from{transform:translate(var(--ox),var(--oy)) scale(.4);opacity:0}to{transform:none;opacity:1}}\n@keyframes dlcJkJitter{from{transform:none}to{transform:translate(2px,-1.5px) rotate(4deg)}}\n@keyframes dlcJkCrack{0%,100%{opacity:.45}50%{opacity:.95}}\n@keyframes dlcJkSplit{0%,100%{transform:none}92%{transform:translateX(2px)}94%{transform:translateX(-3px)}96%{transform:none}}\n@keyframes dlcJkFade{from{opacity:0}to{opacity:1}}\n@keyframes dlcJkSpin{to{transform:rotate(360deg)}}\n@keyframes dlcJkGlint{0%,100%{opacity:.55}50%{opacity:1}}\n@keyframes dlcJkSway{from{transform:rotate(-2.4deg)}to{transform:rotate(2.4deg)}}\n@keyframes dlcJkDust{0%{transform:translate(0,0);opacity:0}15%{opacity:.9}100%{transform:translate(-36px,-6px);opacity:0}}\n@keyframes dlcJkStir{0%{transform:translate(0,0)}50%{transform:translate(.6px,-.6px)}}\n@keyframes dlcJkPulse{0%,100%{opacity:.55}50%{opacity:1}}\n@keyframes dlcJkFlicker{0%,100%{opacity:1}46%{opacity:.35}48%{opacity:1}72%{opacity:.6}}\n\n/* ───── apply：空度越高，最后一层正文的颜色被抽得越淡、字越疏 ───── */\nhtml[data-dlc-void=\"2\"] ${P} p{filter:saturate(.78)}\nhtml[data-dlc-void=\"3\"] ${P} p{filter:saturate(.5);letter-spacing:.03em}\nhtml[data-dlc-void=\"4\"] ${P} p{filter:saturate(.24);letter-spacing:.07em;word-spacing:.12em}\nhtml[data-dlc-void=\"3\"] ${P}[data-dlp-motion=full] p:nth-child(4n+3),html[data-dlc-void=\"4\"] ${P}[data-dlp-motion=full] p:nth-child(3n+2){animation:dlcJkThin 10s ease-in-out infinite}\n@keyframes dlcJkThin{0%,100%{opacity:1}50%{opacity:.8}}\n`;\n\n  return {\n    css,\n    tiers: { 空度: 空度档, 尘缘: 尘缘档 }, // 与 核心/做减求空.js 的档位表逐字一致\n    blocks: { 斩: { render: cut }, 结局: { render: ending } },\n    bar: {\n      tab: CORE,\n      when: U.mine,\n      page,\n      dock,\n      iconPath: 'M5 19 19 5M8 4a9 9 0 1 0 12 12',\n    },\n    apply,\n  };\n}\n\nreturn DLC_PAGE_做减求空(CORE, INFO, DLC_SHARED(CORE, INFO));";
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
