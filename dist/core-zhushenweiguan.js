// 斗罗远程正文 core-zhushenweiguan.js 2.1.0
// 斗罗核心·诸神围观：由 源码/build.py 生成，勿手改。结构见 源码/叙事核心/核心/诸神围观.js，主页面代码见 源码/叙事核心/页面/，接线见 源码/叙事核心/入口.js。
import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

const CORE = "诸神围观";
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

/* 诸神围观·神座打赏 —— 叙事核心变量结构
 * 字段与规则的出处：源码/提示词/叙事核心/诸神围观/（结合 六部观众席考据 与 变量设计.md）。
 * CORE_DEF.schema(z)：AI 写 瞩目、神眷、在场诸神、当前神命、神赏记录、结局；档位由数值算。
 * CORE_DEF.onUpdated(after, before)：按当前部、外界日期与主角成神状态算 观测状态；
 *   开局落笔首轮按原作核心气运身份赋初始 瞩目 与 神眷；跨部（时代往后走）时按神席更替与斗3失联规则折算。
 */
const CORE_DEF = (() => {
  const 瞩目档 = [[90, '万神凝眸'], [70, '满座倾席'], [45, '列神侧目'], [20, '偶映天镜'], [0, '微尘未觉']];
  const 神眷档 = [[90, '宠极生缚'], [70, '神泽盈身'], [40, '垂眸观棋'], [15, '神威冷眼'], [0, '神谴临头']];
  const 观测表 = ['旧神垂眸', '新神执枢', '神枢环视', '乱流断续', '七界同观', '星海遥感', '诸王归位'];
  const 神阶表 = ['神王', '一级神', '二级神', '三级神', '位面灵识', '异界神王'];
  const 神命状态表 = ['进行中', '已完成', '已违抗', '已失败'];
  const 真神 = new Set(['三级神', '二级神', '一级神', '神王']);

  const 霍雨浩 = new Set(['霍雨浩', '戴雨浩']);
  const 唐舞桐 = new Set(['唐舞桐', '王冬', '王冬儿']);
  const 蓝轩宇 = new Set(['蓝轩宇', '唐轩宇']);
  const 斗1成神 = 26550620;   // 斗罗历2655年06月20日：嘉陵关双神共存，旧神卸任新神交替
  const 斗4后期 = 326480801;  // 斗罗历32648年08月01日：大神圈锁定坐标抵近，十二神王全席重开

  function hasGodSeat(hero) {
    const h = hero || {};
    const path = h.神途 || {};
    const rank = h.神阶 || (path.神位 && path.神位.神阶) || null;
    return 真神.has(rank);
  }

  function watchStateOf(hero, t) {
    const part = t && t.当前部;
    if (part === '英雄') return '七界同观';
    if (part === '神界' || hasGodSeat(hero)) return '神枢环视';
    if (part === '斗3') return '乱流断续';
    if (part === '斗4') {
      const k = coreDateKey(t && t.外界日期);
      return k != null && k >= 斗4后期 ? '诸王归位' : '星海遥感';
    }
    if (part === '斗2') return '新神执枢';
    const k1 = coreDateKey(t && t.外界日期);
    return k1 != null && k1 >= 斗1成神 ? '新神执枢' : '旧神垂眸';
  }

  /** 原作核心气运人物的开局初始瞩目与神眷；其余角色留给 AI 首轮按处境校准 */
  function openingOf(hero, t) {
    const who = coreWho(hero), part = t && t.当前部;
    if (who === '唐三') return part === '斗1' ? { 瞩目: 45, 神眷: 55 } : { 瞩目: 85, 神眷: 70 };
    if (who === '小舞') return part === '斗1' ? { 瞩目: 40, 神眷: 55 } : { 瞩目: 80, 神眷: 75 };
    if (who === '千仞雪' || who === '比比东') return { 瞩目: 55, 神眷: 58 };
    if (霍雨浩.has(who)) return part === '斗2' ? { 瞩目: 45, 神眷: 55 } : { 瞩目: 80, 神眷: 68 };
    if (唐舞桐.has(who)) return { 瞩目: 78, 神眷: 78 };
    if (who === '唐舞麟') return part === '斗3' ? { 瞩目: 55, 神眷: 65 } : { 瞩目: 75, 神眷: 68 };
    if (蓝轩宇.has(who)) {
      const k = coreDateKey(t && t.外界日期);
      return k != null && k >= 斗4后期 ? { 瞩目: 90, 神眷: 72 } : { 瞩目: 55, 神眷: 68 };
    }
    return null;
  }

  const 跨部折算 = (v) => Math.max(Math.round(v * 0.7), v >= 45 ? 30 : 0);

  return {
    schema(z) {
      const k = coreKit(z);
      return k.block('诸神围观', {
        观测状态: k.pick(观测表, '旧神垂眸'),
        瞩目: k.int(10), 瞩目档位: k.derived(),
        神眷: k.int(50), 神眷档位: k.derived(),
        在场诸神: k.list({
          神名: k.str(),
          神阶: k.pick(神阶表, '一级神'),
          阵营: k.str('中立'),
          态度: k.int(0, -100, 100),
          心情: k.str('饶有兴致', 12),
          口味: k.str('', 30),
        }, 8),
        当前神命: k.list({
          标题: k.str(),
          神祇: k.str(),
          内容: k.str(),
          期限: k.str('不限'),
          奖励: k.str(),
          惩罚: k.str(),
          状态: k.pick(神命状态表, '进行中'),
        }, 6),
        神赏记录: k.list({
          神祇: k.str(),
          赏赐: k.str(),
          落点: k.str(),
          日期: k.str(),
        }, 10),
        结局: k.ending(),
      }, (c) => ({ ...c, 瞩目档位: TIER(瞩目档, c.瞩目), 神眷档位: TIER(神眷档, c.神眷) }));
    },
    onUpdated(after, before) {
      const c = after.叙事核心;
      const prev = before && before.叙事核心 && before.叙事核心.核心 === '诸神围观' ? before.叙事核心 : null;
      const t = after.时空 || {};
      c.观测状态 = watchStateOf(after.主角, t);

      const from = before && before.时空 && CORE_ERA[before.时空.当前部];
      const to = t && CORE_ERA[t.当前部];
      if (prev && from && to && to > from) {
        if (t.当前部 === '斗3') {
          c.瞩目 = Math.min(c.瞩目, 35);
          c.在场诸神 = (c.在场诸神 || []).filter((g) => g && g.神阶 === '位面灵识');
        } else if (!hasGodSeat(after.主角)) {
          c.瞩目 = 跨部折算(c.瞩目);
        }
      }

      if (!prev && c.瞩目 === 10 && c.神眷 === 50) {
        Object.assign(c, openingOf(after.主角, t) || {});
      }
    },
  };
})();

const CORE_PAGE = "/* 叙事核心 · 主页面代码的共用部分\n * 页面文件都只定义工厂函数，样稿页（样稿/叙事核心样稿.html）能直接用 <script> 加载同一份代码：\n *   DLC_SHARED(CORE, INFO) → 共用工具；DLC_PAGE_<核心>(CORE, INFO, U) → { css, blocks, bar, apply? }\n * build.py 把 本文件 + 页面/<核心>.js 拼起来，末尾加一句 return DLC_PAGE_<核心>(CORE, INFO, DLC_SHARED(CORE, INFO))，\n * 整段由核心脚本在主页面里用 new Function('CORE', 'INFO', 代码) 执行：函数都属于主页面，核心脚本的 iframe 关掉以后正文和状态栏照样能调。\n *   blocks 登记进 window.__DL_PROSE_BLOCKS__：{ 标签: { render(段, 工具) } }。段 = { tag, inner, closed }；\n *          工具有 h / sv（建节点）、sub(文字)（把块里的正文照常画成节点）、env（env.stat 是这一层的变量）、playAt()（入场动画已播几秒，不该播为 null）。\n *          块的外层由正文容器带 data-dlp-motion（full / reduced / off）和 data-dlp-surface（浅色聊天背景时为 light）。\n *   bar    登记进 window.__DL_BAR_EXT__：{ tab, when(数据), page(数据, 工具), dock(数据, 工具), iconPath }；工具里 motion 为 full / reduced / off。\n *   apply(最新变量 | null, 主页面 document)：可选，随最新变量改主页面上的全局状态；撤下时传 null。\n */\nfunction DLC_SHARED(CORE, INFO) {\n  const coreOf = (st) => (st && st.叙事核心 && typeof st.叙事核心 === 'object' ? st.叙事核心 : null);\n  const mine = (st) => { const c = coreOf(st); return !!c && c.核心 === CORE; };\n  const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);\n  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));\n  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);\n  const tierOf = (table, v) => { for (let i = 0; i < table.length; i += 1) if (v >= table[i][0]) return { i: table.length - 1 - i, name: table[i][1] }; return { i: 0, name: table[table.length - 1][1] }; };\n\n  /** 块里的内容拆成三样：开头的“键｜值”抬头行、行内小标签（<对策>…</对策> 这类，按名字收集）、剩下的正文 */\n  const META = /^[ \\t]*(视角|来源|主角|台词|死因|下手|所斩|类型|代价|所得|神祇|发布者|场面|内容|期限|奖励|惩罚|状态|赏赐|落点|人物|表面|图谋|筹码|利弊|姿态|主谋|目标|面具|对象|标题|本源|违和|判定|代号|职能)[ \\t]*[｜|][ \\t]*(.*)$/u;\n  function parseBlock(inner, inlineTags) {\n    const meta = {}, tags = {};\n    let text = String(inner == null ? '' : inner);\n    for (const t of inlineTags || []) {\n      tags[t] = [];\n      text = text.replace(new RegExp(`<${t}>([\\\\s\\\\S]*?)(?:</${t}>|$)`, 'gu'), (_, x) => { tags[t].push(x.trim()); return ''; });\n    }\n    const lines = text.replace(/^\\n+/u, '').split('\\n');\n    while (lines.length) {\n      const m = META.exec(lines[0]);\n      if (!m) { if (!lines[0].trim()) { lines.shift(); continue; } break; }\n      if (!(m[1] in meta)) meta[m[1]] = m[2].trim();\n      lines.shift();\n    }\n    return { meta, tags, body: lines.join('\\n').trim() };\n  }\n  /** 入场动画：正文给了“已播几秒”就带 data-play 和负的延迟，重画时接着播，不从头再来 */\n  function play(kit) {\n    const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null;\n    return t == null ? {} : { 'data-play': true, style: { '--dlc-t': `-${t.toFixed(2)}s` } };\n  }\n  const part = (st) => (st && st.时空 && st.时空.当前部) || null;\n  const date = (st) => String((st && st.时空 && st.时空.外界日期) || '').replace(/^斗罗历/u, '');\n  /** 结局块的通用拆法 */\n  const endingOf = (inner) => parseBlock(inner, []);\n  /** 只认结局对象里真写下的 */\n  const ended = (c) => !!(c && c.结局 && c.结局.已终结 === true);\n\n  return { CORE, INFO, coreOf, mine, num, clamp, list, tierOf, parseBlock, play, part, date, endingOf, ended };\n}\n\n/* 诸神围观·神座打赏 · 主页面代码（Claude 样稿版：照抄到 源码/叙事核心/页面/诸神围观.js 即可，接口、类名钩子和测试要求的文字都对齐了）\n * 母题“神座观测台”：每位神有一枚按名字生成、独一无二的神纹，配色跟神职走（海神蓝金、修罗血金、天使白金、罗刹暗紫……）。\n * 正文：<神谕>：开口的神在上方坐成一道弧，每位神从自己的座位垂下一道光柱，话像流星一样一条条落进频道。\n *       <神命>：两道光链吊下一块神旨碑，下面一架天平，顺命的赏、逆命的罚各放一边，按结果往一边沉（颁布中来回摆）；沙漏计期限。\n *       <神赏>：光柱从天上砸下来，魂环落下、年限像里程表一样往上滚、环色跟着换档（魂骨嵌入、魂币落雨、其余是神纹炸开）。\n *       <结局>：smite 神座降劫：满座神纹一齐睁眼，一道裁决雷光劈开整张卡；puppet 神座玩物：金线从上面垂下来，罩成一座光笼。\n * 状态栏：页签“诸神围观”（神座穹顶图：在座的神坐在弧上，光线按态度连到你；瞩目十只眼、神眷冷暖尺、在座神席、神命、神赏录）；\n *         底栏一只星瞳 + 在看的神数 + 瞩目。\n * apply：瞩目 ≥ 70 → <html data-dlc-gaze=\"1\">，≥ 90 → \"2\"：最后一层正文上沿压下一层神光；字始终清楚。\n */\nfunction DLC_PAGE_诸神围观(CORE, INFO, U) {\n  const 瞩目档 = [[90, '万神凝眸'], [70, '满座倾席'], [45, '列神侧目'], [20, '偶映天镜'], [0, '微尘未觉']];\n  const 神眷档 = [[90, '宠极生缚'], [70, '神泽盈身'], [40, '垂眸观棋'], [15, '神威冷眼'], [0, '神谴临头']];\n  const OBS = {\n    旧神垂眸: '旧神世代，诸神隔着观尘镜看下界',\n    新神执枢: '新神执掌神界，镜前换了一批面孔',\n    神枢环视: '你已身在神界，神就在身边看',\n    乱流断续: '时空乱流隔断神界，注视时有时无',\n    七界同观: '七界神王同席，押注你的胜负',\n    星海遥感: '神界远在星海之外，只能遥遥感知',\n    诸王归位: '十二神王全席重开，镜光直落',\n  };\n  const hash = (s) => { let x = 5; for (const ch of String(s)) x = (x * 33 + ch.codePointAt(0)) >>> 0; return x || 1; };\n  const rnd = (seed) => { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };\n  const fmtDate = (s) => String(s || '').replace(/^斗罗历/u, '').replace(/[年月]/gu, '.').replace(/日$/u, '');\n  const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];\n\n  // 神职 → 配色（主色、亮色）；没对上的按名字算一个色相，同一个名字永远同一个颜色\n  const GODS = [\n    [/融念冰|冰火/u, '#7FDFFF', '#FF9A6A'],\n    [/海神|唐三/u, '#2FB8C9', '#F0C869'],\n    [/修罗/u, '#C8404E', '#F2C46B'],\n    [/天使|千仞雪/u, '#F3E2A0', '#FFFFFF'],\n    [/罗刹|比比东/u, '#A064E8', '#E0C8FF'],\n    [/毁灭/u, '#8A4FE0', '#FF8A3D'],\n    [/生命/u, '#4FD08A', '#D9FFE6'],\n    [/善良/u, '#8FD3FF', '#FFFFFF'],\n    [/邪恶/u, '#D0558F', '#FFC4DE'],\n    [/小舞|柔骨/u, '#F49AC2', '#FFE3F0'],\n    [/火神|姬动|炎/u, '#FF8A3D', '#FFD27A'],\n    [/冰|雪|水神/u, '#8FE3FF', '#E8FBFF'],\n    [/雷|狂神/u, '#7FA2FF', '#E6ECFF'],\n    [/光明|长弓威/u, '#FFEFB0', '#FFFFFF'],\n    [/贪婪/u, '#D3C043', '#FFF3A0'],\n    [/琴/u, '#C6A6FF', '#F4EBFF'],\n    [/仙帝|海龙/u, '#56D3B2', '#E0FFF6'],\n    [/灵识|位面/u, '#B8C4D6', '#FFFFFF'],\n    [/白虎|戴沐白|战神/u, '#EDEFF5', '#9FB4D8'],\n  ];\n  function godColor(name) {\n    for (const [re, a, b] of GODS) if (re.test(name)) return [a, b];\n    const hue = hash(name) % 360;\n    return [`hsl(${hue} 72% 66%)`, `hsl(${(hue + 40) % 360} 85% 86%)`];\n  }\n  const cleanGod = (s) => String(s || '').replace(/[（(][^）)]*[）)]/gu, '').trim();\n  const godsOf = (s) => String(s || '').split(/[、，,／/]/u).map(cleanGod).filter(Boolean);\n\n  /** 神纹：按名字生成的一枚徽记（外环虚实、几边形、几道芒都由名字决定） */\n  function sigil(sv, name, cls, extra) {\n    const r = rnd(hash(name)), [a, b] = godColor(name);\n    const n = 3 + Math.floor(r() * 4), rot = r() * Math.PI * 2, R = 8.6 + r() * 1.6;\n    const poly = [...Array(n)].map((_, i) => { const t = rot + i * Math.PI * 2 / n; return `${(Math.cos(t) * R).toFixed(2)} ${(Math.sin(t) * R).toFixed(2)}`; });\n    let rays = '';\n    for (let i = 0; i < n; i += 1) { const t = rot + (i + 0.5) * Math.PI * 2 / n; rays += `M${(Math.cos(t) * 4).toFixed(2)} ${(Math.sin(t) * 4).toFixed(2)}L${(Math.cos(t) * 13.2).toFixed(2)} ${(Math.sin(t) * 13.2).toFixed(2)}`; }\n    const dash = [['5 2'], ['12 2 2 2'], ['2 2'], ['22 4'], ['8 3 1 3']][Math.floor(r() * 5)][0];\n    return sv('svg', { class: cls, viewBox: '-16 -16 32 32', 'aria-hidden': 'true', style: { '--g': a, '--g2': b }, ...(extra || {}) },\n      sv('circle', { class: 'zs-sg-ring', r: 14.4, 'stroke-dasharray': dash }),\n      sv('path', { class: 'zs-sg-poly', d: `M${poly.join('L')}Z` }),\n      sv('path', { class: 'zs-sg-ray', d: rays }),\n      sv('circle', { class: 'zs-sg-core', r: 2.3 }));\n  }\n  function withPlay(kit, attrs) {\n    const pl = U.play(kit);\n    return { ...attrs, ...pl, style: { ...(attrs.style || {}), ...(pl.style || {}) } };\n  }\n  function sky(h, seed, n) {\n    const r = rnd(seed), dots = [];\n    for (let i = 0; i < (n || 22); i += 1) dots.push(h('i', { style: { left: `${(r() * 100).toFixed(1)}%`, top: `${(r() * 100).toFixed(1)}%`, '--s': `${(1 + r() * 1.8).toFixed(1)}px`, '--d': `${(-r() * 5).toFixed(2)}s` } }));\n    return h('div', { class: 'dlc-zs-sky', 'aria-hidden': 'true' }, dots);\n  }\n\n  // ───────── 正文：<神谕> ─────────\n  function oracle(p, kit) {\n    const { h, sv } = kit;\n    const b = U.parseBlock(p.inner, []);\n    const items = [];\n    for (const ln of b.body.split('\\n')) {\n      const m = /^\\s*【([^】]{1,24})】\\s*(.*)$/u.exec(ln);\n      if (m) items.push({ god: cleanGod(m[1]) || m[1], text: m[2].trim() });\n      else if (ln.trim()) items.push({ narr: ln });\n    }\n    const gods = [...new Set(items.filter((x) => x.god).map((x) => x.god))];\n    const n = Math.max(1, gods.length);\n    const seatX = (g) => ((gods.indexOf(g) + 0.5) / n * 100).toFixed(2);\n    let k = 0;\n    return h('section', withPlay(kit, { class: 'dlc-zs dlc-zs-oracle', 'data-writing': p.closed ? null : true }),\n      sky(h, hash(b.meta.场面 || 'oracle')),\n      h('div', { class: 'dlc-zs-pillars', 'aria-hidden': 'true' }, gods.map((g, i) => {\n        const [a, c2] = godColor(g);\n        return h('i', { style: { left: `${seatX(g)}%`, '--g': a, '--g2': c2, '--i': i } });\n      })),\n      h('header', { class: 'dlc-zs-hd' },\n        h('span', { class: 'dlc-zs-k', text: '神谕' }),\n        b.meta.场面 ? h('span', { class: 'dlc-zs-scene', text: b.meta.场面 }) : null,\n        h('span', { class: 'dlc-zs-cnt', text: `${gods.length} 位开口` })),\n      gods.length ? h('div', { class: 'dlc-zs-gallery' }, gods.map((g, i) => {\n        const [a] = godColor(g);\n        const lift = Math.sin(Math.PI * (i + 0.5) / n) * 14;\n        return h('figure', { class: 'dlc-zs-seat', style: { '--g': a, '--y': `${(-lift).toFixed(1)}px`, '--i': i } },\n          sigil(sv, g, 'dlc-zs-sg'), h('figcaption', { text: g }));\n      })) : null,\n      h('ol', { class: 'dlc-zs-feed' }, items.map((x) => {\n        if (x.narr) return h('li', { class: 'dlc-zs-narr' }, kit.sub(x.narr));\n        const [a, c2] = godColor(x.god);\n        k += 1;\n        return h('li', { class: 'dlc-zs-msg', style: { '--g': a, '--g2': c2, '--i': k - 1, '--sx': `${seatX(x.god)}%` } },\n          sigil(sv, x.god, 'dlc-zs-sg dlc-zs-msg-sg'),\n          h('div', null, h('b', { class: 'dlc-zs-who', text: x.god }), h('p', { text: x.text })));\n      })));\n  }\n\n  // ───────── 正文：<神命> ─────────\n  const stOf = (s) => (/违抗|抗命|拒/u.test(s) ? 'defy' : /失败|未能|逾期/u.test(s) ? 'fail' : /完成|达成|已成/u.test(s) ? 'done' : 'live');\n  const ST_TXT = { live: '颁布中', done: '已完成', defy: '已违抗', fail: '已失败' };\n  function hourglass(sv, st) {\n    return sv('svg', { class: 'dlc-zs-glass', viewBox: '0 0 20 30', 'data-st': st, 'aria-hidden': 'true' },\n      sv('path', { class: 'f', d: 'M3 2H17M3 28H17M4 2C4 10 9 12 9 15C9 18 4 20 4 28M16 2C16 10 11 12 11 15C11 18 16 20 16 28' }),\n      st === 'live' ? sv('path', { class: 's', d: 'M6 6H14L10 13Z' }) : null,\n      sv('path', { class: 's', d: st === 'live' ? 'M7 27H13L10 23Z' : 'M5 27H15L10 19Z' }),\n      st === 'live' ? sv('path', { class: 'm', d: 'M10 13V26' }) : null);\n  }\n  function scale(sv, st) {\n    const pan = (x, cls) => sv('g', { class: `dlc-zs-pan ${cls}`, style: { 'transform-origin': `${x}px 14px` } },\n      sv('path', { class: 'dlc-zs-pan-c', d: `M${x} 14 L${x - 16} 44 M${x} 14 L${x + 16} 44` }),\n      sv('path', { class: 'dlc-zs-pan-b', d: `M${x - 20} 44 Q${x} 60 ${x + 20} 44Z` }));\n    return sv('svg', { class: 'dlc-zs-scale', viewBox: '0 0 240 92', 'data-st': st, 'aria-hidden': 'true' },\n      sv('path', { class: 'dlc-zs-post', d: 'M120 10V82M98 86H142M106 82H134' }),\n      sv('g', { class: 'dlc-zs-beamg' },\n        sv('path', { class: 'dlc-zs-beam-l', d: 'M36 14H204' }),\n        sv('circle', { class: 'dlc-zs-pivot', cx: 120, cy: 14, r: 3.2 }),\n        pan(36, 'l'), pan(204, 'r')));\n  }\n  function decree(p, kit) {\n    const { h, sv } = kit;\n    const b = U.parseBlock(p.inner, []);\n    const who = b.meta.神祇 || b.meta.发布者 || '无名之神';\n    const g0 = godsOf(who)[0] || who;\n    const [a, c2] = godColor(g0);\n    const st = stOf(b.meta.状态 || '');\n    return h('section', withPlay(kit, { class: 'dlc-zs dlc-zs-decree', 'data-st': st, 'data-writing': p.closed ? null : true, style: { '--g': a, '--g2': c2 } }),\n      sky(h, hash(who), 14),\n      h('div', { class: 'dlc-zs-chains', 'aria-hidden': 'true' }, h('i'), h('i')),\n      h('div', { class: 'dlc-zs-tablet' },\n        h('header', { class: 'dlc-zs-tab-hd' },\n          sigil(sv, g0, 'dlc-zs-sg dlc-zs-tab-sg'),\n          h('div', null, h('span', { class: 'dlc-zs-k', text: '神命' }), h('b', { class: 'dlc-zs-tab-who', text: who })),\n          h('em', { class: 'dlc-zs-st', 'data-st': st, text: b.meta.状态 || ST_TXT[st] })),\n        b.meta.内容 ? h('p', { class: 'dlc-zs-order', text: b.meta.内容 }) : null,\n        b.meta.期限 ? h('div', { class: 'dlc-zs-term' }, hourglass(sv, st), h('span', { text: '期限' }), h('b', { text: b.meta.期限 })) : null,\n        h('div', { class: 'dlc-zs-weigh' },\n          scale(sv, st),\n          h('div', { class: 'dlc-zs-sides' },\n            h('div', { class: 'dlc-zs-side', 'data-k': 'gain' }, h('span', { text: '顺命 · 赏' }), h('p', { text: b.meta.奖励 || '未言明' })),\n            h('div', { class: 'dlc-zs-side', 'data-k': 'loss' }, h('span', { text: '逆命 · 罚' }), h('p', { text: b.meta.惩罚 || '未言明' }))))),\n      b.body ? h('div', { class: 'dlc-zs-body' }, kit.sub(b.body)) : null);\n  }\n\n  // ───────── 正文：<神赏> ─────────\n  /** 赏的是什么：先看落点（写进了哪个变量），落点说不清再看赏赐的名字 */\n  const kindOf = (spot, gift) => {\n    for (const t of [spot || '', gift || '']) {\n      if (/魂骨|头骨|臂骨|腿骨|躯干骨|外附/u.test(t)) return 'bone';\n      if (/魂环|年限/u.test(t)) return 'ring';\n      if (/钱包|魂币|金币|银币/u.test(t)) return 'coin';\n      if (/\\/武魂\\/|·武魂·|武魂进化|武魂蜕变|武魂变异|武魂品质|武魂觉醒|第二武魂|第三武魂|双生武魂|三生武魂|极致之|神赐武魂|血脉觉醒/u.test(t)) return 'soul';\n    }\n    return 'boon';\n  };\n  const ringTier = (y) => (y >= 1000000 ? ['神级', '#F7D774'] : y >= 100000 ? ['十万年', '#E2333A'] : y >= 10000 ? ['万年', '#17161F'] : y >= 1000 ? ['千年', '#9A5BE0'] : y >= 100 ? ['百年', '#F2C94C'] : ['十年', '#EEF2F5']);\n  function odo(h, from, to, unit) {\n    const A0 = String(Math.abs(from)), B0 = String(Math.abs(to)), len = Math.max(A0.length, B0.length);\n    const A = A0.padStart(len, '0'), B = B0.padStart(len, '0');\n    const lead = len - B0.length;\n    const cols = [...B].map((d, i) => {\n      const stop = 10 * (1 + i) + Number(d); // 越靠右转得越多圈\n      const strip = [];\n      for (let j = 0; j <= stop; j += 1) strip.push(h('span', { text: String(j % 10) }));\n      return h('span', { class: 'dlc-zs-odo-c', 'data-lead': i < lead ? true : null, style: { '--a': Number(A[i]), '--z': stop, '--i': i } }, h('span', { class: 'dlc-zs-odo-s' }, strip));\n    });\n    return h('span', { class: 'dlc-zs-odo', role: 'img', 'aria-label': `${from} → ${to}${unit || ''}` }, cols, unit ? h('small', { text: unit }) : null);\n  }\n  function giftArt(h, sv, kind, from, to) {\n    if (kind === 'ring') {\n      const [, c0] = ringTier(from == null ? to || 0 : from), [, c1] = ringTier(to || 0);\n      return sv('svg', { class: 'dlc-zs-art', viewBox: '0 0 160 96', 'data-k': 'ring', style: { '--c0': c0, '--c1': c1 }, 'aria-hidden': 'true' },\n        sv('path', { class: 'dlc-zs-art-fall', d: 'M80 0V40' }),\n        sv('ellipse', { class: 'dlc-zs-ring-glow', cx: 80, cy: 58, rx: 60, ry: 18 }),\n        sv('ellipse', { class: 'dlc-zs-ring', cx: 80, cy: 58, rx: 60, ry: 18 }),\n        sv('ellipse', { class: 'dlc-zs-ring-hi', cx: 80, cy: 56.5, rx: 57, ry: 15.5 }));\n    }\n    if (kind === 'bone') {\n      return sv('svg', { class: 'dlc-zs-art', viewBox: '0 0 160 96', 'data-k': 'bone', 'aria-hidden': 'true' },\n        sv('path', { class: 'dlc-zs-slot', d: 'M44 48c-8-10 4-22 13-14h46c9-8 21 4 13 14 8 10-4 22-13 14H57c-9 8-21-4-13-14Z' }),\n        sv('g', { class: 'dlc-zs-bone' }, sv('path', { d: 'M44 48c-8-10 4-22 13-14h46c9-8 21 4 13 14 8 10-4 22-13 14H57c-9 8-21-4-13-14Z' }),\n          sv('path', { class: 'v', d: 'M60 44H100M64 52H96' })));\n    }\n    if (kind === 'coin') {\n      const coins = [...Array(9)].map((_, i) => h('i', { style: { '--i': i, left: `${12 + i * 9.5}%` } }));\n      return h('div', { class: 'dlc-zs-art dlc-zs-coins', 'data-k': 'coin', 'aria-hidden': 'true' }, coins,\n        sv('svg', { viewBox: '0 0 160 96' }, [0, 1, 2, 3].map((i) => sv('ellipse', { cx: 80, cy: 78 - i * 7, rx: 30, ry: 8 }))));\n    }\n    if (kind === 'soul') {\n      const sparks = [[48, 72, 1.3], [57, 78, 1.7], [66, 65, 1.2], [74, 82, 1.5], [86, 81, 1.6], [94, 67, 1.2], [103, 77, 1.8], [112, 71, 1.3]];\n      return sv('svg', { class: 'dlc-zs-art', viewBox: '0 0 160 96', 'data-k': 'soul', 'aria-hidden': 'true' },\n        sv('path', { class: 'dlc-zs-art-fall', d: 'M80 0V18' }),\n        sv('ellipse', { class: 'dlc-zs-soul-ped-g', cx: 80, cy: 81, rx: 46, ry: 9 }),\n        sv('ellipse', { class: 'dlc-zs-soul-ped', cx: 80, cy: 81, rx: 46, ry: 9 }),\n        sv('ellipse', { class: 'dlc-zs-soul-ped2', cx: 80, cy: 81, rx: 31, ry: 5.8 }),\n        sv('circle', { class: 'dlc-zs-soul-glow', cx: 80, cy: 46, r: 25 }),\n        sv('g', { class: 'dlc-zs-soul-r1' },\n          sv('circle', { class: 'dlc-zs-soul-o1', cx: 80, cy: 46, r: 30 }),\n          sv('path', { class: 'dlc-zs-soul-ticks', d: 'M80 12V17M80 75V80M46 46H51M109 46H114M58.8 24.8L61.6 27.6M101.2 24.8L98.4 27.6M58.8 67.2L61.6 64.4M101.2 67.2L98.4 64.4' })),\n        sv('g', { class: 'dlc-zs-soul-r2' },\n          sv('circle', { class: 'dlc-zs-soul-o2', cx: 80, cy: 46, r: 22 }),\n          sv('path', { class: 'dlc-zs-soul-hex', d: 'M80 26L97.3 56H62.7ZM80 66L97.3 36H62.7Z' })),\n        sv('g', { class: 'dlc-zs-soul-wl' },\n          sv('path', { class: 'dlc-zs-soul-w1', d: 'M74 56C54 51 42 36 47 20C53 33 63 42 75 47Z' }),\n          sv('path', { class: 'dlc-zs-soul-w2', d: 'M75 61C57 62 45 53 41 39C50 48 62 53 76 55Z' })),\n        sv('g', { class: 'dlc-zs-soul-wr' },\n          sv('path', { class: 'dlc-zs-soul-w1', d: 'M86 56C106 51 118 36 113 20C107 33 97 42 85 47Z' }),\n          sv('path', { class: 'dlc-zs-soul-w2', d: 'M85 61C103 62 115 53 119 39C110 48 98 53 84 55Z' })),\n        sv('g', { class: 'dlc-zs-soul-gem' },\n          sv('path', { class: 'dlc-zs-soul-body', d: 'M80 21L93 44L80 69L67 44Z' }),\n          sv('path', { class: 'dlc-zs-soul-cut', d: 'M80 21V69M67 44H93M80 21L73.5 44L80 69L86.5 44Z' }),\n          sv('path', { class: 'dlc-zs-soul-core', d: 'M80 35L85.5 45L80 55L74.5 45Z' }),\n          sv('circle', { class: 'dlc-zs-soul-dot', cx: 80, cy: 45, r: 2.2 })),\n        sv('g', { class: 'dlc-zs-soul-sparks' }, sparks.map(([cx, cy, r], i) => sv('circle', { cx, cy, r, style: { '--i': i } }))));\n    }\n    return null;\n  }\n  function reward(p, kit) {\n    const { h, sv } = kit;\n    const b = U.parseBlock(p.inner, []);\n    const givers = godsOf(b.meta.神祇);\n    const who = givers.length ? givers : ['无名之神'];\n    const [a, c2] = godColor(who[0]);\n    const gift = b.meta.赏赐 || '一份神赐', spot = b.meta.落点 || '';\n    const m = /[（(]\\s*(-?\\d[\\d,]*)\\s*(?:→|->|=>|至)\\s*(-?\\d[\\d,]*)\\s*[)）]/u.exec(spot);\n    const from = m ? Number(m[1].replace(/,/gu, '')) : null, to = m ? Number(m[2].replace(/,/gu, '')) : null;\n    const kind = kindOf(spot, gift), years = kind === 'ring' || (kind === 'bone' && /年限/u.test(spot));\n    const path = spot.replace(/[（(][^）)]*[）)]\\s*$/u, '').trim();\n    const ri = /魂环\\/(\\d+)/u.exec(spot);\n    const unit = years ? '年' : kind === 'coin' ? '枚' : '';\n    const yearTag = to != null ? `${from != null && ringTier(from)[0] !== ringTier(to)[0] ? `${ringTier(from)[0]} → ` : ''}${ringTier(to)[0]}` : '';\n    const soulTag = /进化|觉醒|极致|品质|变异|蜕变/u.test(`${spot} ${gift}`) ? '武魂蜕变' : '神赐武魂';\n    const tag = kind === 'ring' && to != null\n      ? `${ri ? `第${CN[Number(ri[1]) + 1] || Number(ri[1]) + 1}魂环 · ` : ''}${yearTag}`\n      : kind === 'bone' ? `魂骨${years && yearTag ? ` · ${yearTag}` : ''}`\n        : kind === 'soul' ? soulTag : { coin: '魂币', boon: '神赐' }[kind] || '';\n    return h('section', withPlay(kit, { class: 'dlc-zs dlc-zs-reward', 'data-k': kind, 'data-writing': p.closed ? null : true, style: { '--g': a, '--g2': c2 } }),\n      sky(h, hash(gift), 18),\n      h('i', { class: 'dlc-zs-shaft', 'aria-hidden': 'true' }),\n      h('div', { class: 'dlc-zs-motes', 'aria-hidden': 'true' }, [...Array(14)].map((_, i) => h('i', { style: { '--i': i, left: `${(hash(gift + i) % 100)}%` } }))),\n      h('header', { class: 'dlc-zs-hd' },\n        h('span', { class: 'dlc-zs-k', text: '神赏' }),\n        h('span', { class: 'dlc-zs-givers' }, who.map((g) => sigil(sv, g, 'dlc-zs-sg dlc-zs-giver-sg'))),\n        h('b', { class: 'dlc-zs-giver', text: who.join('、') })),\n      h('div', { class: 'dlc-zs-gift' },\n        h('div', { class: 'dlc-zs-gift-art' }, giftArt(h, sv, kind, from, to) || sigil(sv, who[0], 'dlc-zs-sg dlc-zs-boon')),\n        h('div', { class: 'dlc-zs-gift-info' },\n          tag ? h('span', { class: 'dlc-zs-gift-tag', text: tag }) : null,\n          h('p', { class: 'dlc-zs-gift-name', text: gift }),\n          to != null ? h('div', { class: 'dlc-zs-gift-num' },\n            odo(h, from == null ? 0 : from, to, unit),\n            from != null ? h('em', { text: `${to - from >= 0 ? '+' : '−'}${Math.abs(to - from)}${unit}` }) : null) : null,\n          path ? h('code', { class: 'dlc-zs-gift-path', text: path }) : null)),\n      b.body ? h('div', { class: 'dlc-zs-body' }, kit.sub(b.body)) : null);\n  }\n\n  // ───────── 正文：<结局> ─────────\n  function isPuppet(why, body, c) {\n    if (/降劫|抹杀|神罚|雷殛|灰飞烟灭|爆体|除名/u.test(why || '')) return false;\n    return /玩物|神傀|傀儡|提线|标本|戏偶|宠极|丧失自我|豢养|收藏/u.test(`${why || ''} ${body || ''}`) || (!!c && U.num(c.神眷, 50) >= 100);\n  }\n  function ending(p, kit) {\n    const { h, sv } = kit;\n    const b = U.endingOf(p.inner);\n    const c = U.coreOf(kit.env && kit.env.stat);\n    const puppet = isPuppet(`${b.meta.死因 || ''}${b.meta.下手 || ''}`, b.body, c);\n    const seated = U.list(c && c.在场诸神).map((g) => g.神名).filter(Boolean);\n    const judges = (seated.length ? seated : godsOf(b.meta.下手)).slice(0, 7);\n    const art = puppet\n      ? sv('svg', { class: 'dlc-zs-end-art', viewBox: '0 0 300 150', preserveAspectRatio: 'xMidYMin slice', 'aria-hidden': 'true' },\n        [40, 85, 130, 170, 215, 260].map((x, i) => sv('path', { class: 'dlc-zs-string', d: `M${x} 0 Q${x + (i % 2 ? 8 : -8)} 60 ${150 + (x - 150) * 0.22} ${118 - Math.abs(x - 150) * 0.1}`, style: { '--i': i } })),\n        sv('path', { class: 'dlc-zs-cage', d: 'M100 140V80Q100 30 150 26Q200 30 200 80V140M122 140V70Q122 40 150 36Q178 40 178 70V140M150 26V140M96 140H204' }))\n      : sv('svg', { class: 'dlc-zs-end-art', viewBox: '0 0 300 150', preserveAspectRatio: 'xMidYMin slice', 'aria-hidden': 'true' },\n        sv('path', { class: 'dlc-zs-bolt-g', d: 'M158 0 L142 46 L166 52 L138 104 L160 108 L132 150' }),\n        sv('path', { class: 'dlc-zs-bolt', d: 'M158 0 L142 46 L166 52 L138 104 L160 108 L132 150' }));\n    return h('section', withPlay(kit, { class: 'dlc-zs dlc-zs-end', 'data-kind': puppet ? 'puppet' : 'smite', 'data-writing': p.closed ? null : true }),\n      sky(h, hash(b.meta.死因 || 'end'), 26),\n      art,\n      judges.length ? h('div', { class: 'dlc-zs-judges', 'aria-hidden': 'true' }, judges.map((g, i) => h('span', { style: { '--i': i } }, sigil(sv, g, 'dlc-zs-sg')))) : null,\n      h('div', { class: 'dlc-zs-end-k', text: puppet ? '宠极生缚 · 被带上神座' : '神座降劫 · 诸神除名' }),\n      h('h3', { class: 'dlc-zs-end-t', text: puppet ? '神座玩物' : '诸神降罚' }),\n      (b.meta.死因 || b.meta.下手) ? h('dl', { class: 'dlc-zs-end-m' },\n        b.meta.死因 ? [h('dt', { text: '死因' }), h('dd', { text: b.meta.死因 })] : null,\n        b.meta.下手 ? [h('dt', { text: '下手' }), h('dd', { text: b.meta.下手 })] : null) : null,\n      b.body ? h('div', { class: 'dlc-zs-body' }, kit.sub(b.body)) : null,\n      h('footer', { class: 'dlc-zs-end-f', text: puppet ? '此局已终 · 你被带上了神座，从此只演给一位神看' : '此局已终 · 看台上的神看够了，起身离席' }));\n  }\n\n  // ───────── 状态栏 ─────────\n  function chart(sv, c) {\n    const gods = U.list(c.在场诸神).slice(0, 8);\n    const gz = U.tierOf(瞩目档, U.num(c.瞩目, 10)).i;\n    const r = rnd(hash(c.观测状态 || 'sky'));\n    const stars = [...Array(30)].map(() => sv('circle', { class: 'dlc-zsp-star', cx: (r() * 320).toFixed(1), cy: (r() * 130).toFixed(1), r: (0.4 + r() * 0.9).toFixed(2), style: { '--d': `${(-r() * 6).toFixed(2)}s` } }));\n    // 在座的神沿穹顶均匀排开（人少就坐得疏），穹顶外沿 8 道刻度是 8 个席位\n    const n = Math.max(1, gods.length), ang = (k, m) => Math.PI + (k + 0.5) * Math.PI / m;\n    const seat = (i) => { const t = ang(i, n); return [160 + 136 * Math.cos(t), 150 + 136 * Math.sin(t)]; };\n    const marks = [...Array(8)].map((_, k) => { const t = ang(k, 8); return sv('path', { class: 'dlc-zsp-seat', d: `M${(160 + Math.cos(t) * 142).toFixed(1)} ${(150 + Math.sin(t) * 142).toFixed(1)}L${(160 + Math.cos(t) * 148).toFixed(1)} ${(150 + Math.sin(t) * 148).toFixed(1)}` }); });\n    const rays = [], seats = [], cut = n >= 6 ? 4 : 6;\n    gods.forEach((g, i) => {\n      const [x, y] = seat(i), name = g.神名 || '无名之神', [a, c2] = godColor(name);\n      const att = U.clamp(U.num(g.态度, 0), -100, 100), king = /神王/u.test(g.神阶 || '');\n      rays.push(sv('path', { class: 'dlc-zsp-ray', 'data-neg': att < 0 ? true : null, d: `M${x.toFixed(1)} ${y.toFixed(1)}L160 144`,\n        style: { '--g': a, '--w': (0.8 + Math.abs(att) / 100 * 2.4).toFixed(2), '--o': (0.25 + Math.abs(att) / 100 * 0.6).toFixed(2), '--i': i } }));\n      const s = king ? 30 : 24;\n      const lx = x, ly = y + s / 2 + 11;\n      seats.push(sv('g', { class: 'dlc-zsp-god', style: { '--g': a, '--g2': c2, '--i': i } },\n        sigil(sv, name, 'dlc-zs-sg', { x: (x - s / 2).toFixed(1), y: (y - s / 2).toFixed(1), width: s, height: s }),\n        sv('text', { x: lx.toFixed(1), y: ly.toFixed(1), 'text-anchor': 'middle', class: 'dlc-zsp-name' }, name.length > cut ? name.slice(0, cut) + '…' : name)));\n    });\n    return sv('svg', { class: 'dlc-zsp-chart', viewBox: '0 0 320 176', 'aria-hidden': 'true' },\n      stars,\n      sv('path', { class: 'dlc-zsp-arc', d: 'M24 150A136 136 0 0 1 296 150' }),\n      sv('path', { class: 'dlc-zsp-arc2', d: 'M48 150A112 112 0 0 1 272 150' }),\n      marks, rays,\n      sv('ellipse', { class: 'dlc-zsp-mirror', cx: 160, cy: 162, rx: 54, ry: 8 }),\n      [...Array(gz + 1)].map((_, i) => sv('circle', { class: 'dlc-zsp-you-r', cx: 160, cy: 146, r: 6 + i * 5, style: { '--i': i } })),\n      sv('circle', { class: 'dlc-zsp-you', cx: 160, cy: 146, r: 3.4 }),\n      sv('text', { class: 'dlc-zsp-you-t', x: 170, y: 140, 'text-anchor': 'start' }, '你'),\n      seats);\n  }\n  function eyes(h, sv, v) {\n    const open = Math.round(U.clamp(v, 0, 100) / 10);\n    return h('div', { class: 'dlc-zsp-eyes', 'aria-hidden': 'true' }, [...Array(10)].map((_, i) => sv('svg', { viewBox: '0 0 20 12', 'data-open': i < open ? true : null, style: { '--i': i } },\n      i < open ? [sv('path', { class: 'l', d: 'M1 6Q10 -2 19 6Q10 14 1 6Z' }), sv('circle', { class: 'p', cx: 10, cy: 6, r: 2.4 })]\n        : sv('path', { class: 'c', d: 'M2 6Q10 11 18 6' }))));\n  }\n  function favor(h, v) {\n    const x = U.clamp(v, 0, 100), cur = U.tierOf(神眷档, x).name;\n    return h('div', { class: 'dlc-zsp-fav' },\n      h('div', { class: 'dlc-zsp-fav-bar', style: { '--v': `${x}%` } }, h('i', { class: 'dlc-zsp-fav-cage' }), h('i', { class: 'dlc-zsp-fav-m' })),\n      h('div', { class: 'dlc-zsp-ticks', 'aria-hidden': 'true' }, 神眷档.slice().reverse().map(([at, name]) => [\n        h('i', { style: { '--x': `${at}%` } }),\n        h('span', { style: { '--x': `${at}%` }, 'data-at': at, 'data-on': name === cur ? true : null, text: name })])));\n  }\n  function giftIcon(sv, k) {\n    return sv('svg', { class: 'dlc-zsp-gi', viewBox: '0 0 20 20', 'data-k': k, 'aria-hidden': 'true' },\n      k === 'ring' ? sv('ellipse', { cx: 10, cy: 11, rx: 8, ry: 3.6 })\n        : k === 'bone' ? sv('path', { d: 'M4 10c-2-2 1-5 3-3h6c2-2 5 1 3 3 2 2-1 5-3 3H7c-2 2-5-1-3-3Z' })\n          : k === 'coin' ? [sv('ellipse', { cx: 10, cy: 13, rx: 6, ry: 2.4 }), sv('ellipse', { cx: 10, cy: 9.5, rx: 6, ry: 2.4 }), sv('ellipse', { cx: 10, cy: 6, rx: 6, ry: 2.4 })]\n            : k === 'soul' ? [sv('circle', { cx: 10, cy: 10, r: 7.5, 'stroke-dasharray': '3 2' }), sv('path', { d: 'M10 3.2L14.2 10L10 16.8L5.8 10Z' }), sv('circle', { cx: 10, cy: 10, r: 1.4 })]\n              : sv('path', { d: 'M10 2V18M2 10H18M4.5 4.5L15.5 15.5M15.5 4.5L4.5 15.5' }));\n  }\n  function page(st, kit) {\n    const { h, sv } = kit;\n    const c = U.coreOf(st) || {};\n    const 瞩目 = U.num(c.瞩目, 10), 神眷 = U.num(c.神眷, 50);\n    const gods = U.list(c.在场诸神), orders = U.list(c.当前神命).slice().reverse(), gifts = U.list(c.神赏记录).slice().reverse();\n    const end = U.ended(c) ? (isPuppet(`${c.结局.死因 || ''}${c.结局.下手 || ''}`, '', c) ? 'puppet' : 'smite') : null;\n    const warn = [];\n    if (!end && 神眷 >= 90) warn.push('宠极生缚：恩宠太满，神开始把你当成自己的东西了。');\n    if (!end && 神眷 < 15) warn.push('神谴临头：再惹恼一次，降下来的就不是话了。');\n    if (!end && 瞩目 >= 90) warn.push('万神凝眸：一举一动都在台上，没有私事了。');\n    return h('div', { class: 'dlc-zsp', 'data-m': kit.motion || 'full', 'data-gz': U.tierOf(瞩目档, 瞩目).i },\n      end ? h('div', { class: 'dlc-zsp-end', 'data-kind': end }, h('b', { text: end === 'puppet' ? '神座玩物' : '诸神降罚' }),\n        h('span', { text: `${c.结局.死因 || ''}${c.结局.下手 ? ' · ' + c.结局.下手 : ''}` })) : null,\n      h('header', { class: 'dlc-zsp-top' },\n        h('div', { class: 'dlc-zsp-k', text: '叙事核心 · 神座观测' }),\n        h('h4', null, '诸神围观', h('small', { text: '·神座打赏' })),\n        h('div', { class: 'dlc-zsp-obs' }, h('b', { text: c.观测状态 || '旧神垂眸' }), h('span', { text: OBS[c.观测状态] || INFO.引 }))),\n      warn.length ? h('div', { class: 'dlc-zsp-warn' }, warn.map((x) => h('p', { text: x }))) : null,\n      chart(sv, c),\n      h('section', { class: 'dlc-zsp-meters' },\n        h('div', { class: 'dlc-zsp-m' },\n          h('div', { class: 'dlc-zsp-v' }, h('span', { text: '瞩目' }), h('b', { text: String(瞩目) }), h('em', { text: c.瞩目档位 || U.tierOf(瞩目档, 瞩目).name })),\n          eyes(h, sv, 瞩目)),\n        h('div', { class: 'dlc-zsp-m' },\n          h('div', { class: 'dlc-zsp-v', 'data-k': 'fav' }, h('span', { text: '神眷' }), h('b', { text: String(神眷) }), h('em', { text: c.神眷档位 || U.tierOf(神眷档, 神眷).name })),\n          favor(h, 神眷))),\n      h('section', { class: 'dlc-zsp-sec' },\n        h('h5', null, '在座神席', h('span', { text: `${gods.length}/8` })),\n        gods.length ? h('ul', { class: 'dlc-zsp-gods' }, gods.map((g) => {\n          const name = g.神名 || '无名之神', [a, c2] = godColor(name), att = U.clamp(U.num(g.态度, 0), -100, 100);\n          return h('li', { style: { '--g': a, '--g2': c2 } },\n            sigil(sv, name, 'dlc-zs-sg dlc-zsp-gsg'),\n            h('div', null,\n              h('div', { class: 'dlc-zsp-g-hd' }, h('b', { text: name }), h('small', { text: [g.神阶, g.阵营].filter(Boolean).join(' · ') })),\n              g.心情 ? h('p', { class: 'dlc-zsp-mood', text: g.心情 }) : null,\n              g.口味 ? h('p', { class: 'dlc-zsp-taste', text: g.口味 }) : null),\n            h('div', { class: 'dlc-zsp-att', 'data-neg': att < 0 ? true : null, title: `态度 ${att}` },\n              h('i', { style: { '--a': `${Math.abs(att) / 2}%` } }), h('b', { text: `${att > 0 ? '+' : ''}${att}` })));\n        })) : h('p', { class: 'dlc-zsp-none', text: '镜前还没人落座。' })),\n      h('section', { class: 'dlc-zsp-sec' },\n        h('h5', null, '神命', h('span', { text: `${orders.length}/6` })),\n        orders.length ? h('ul', { class: 'dlc-zsp-orders' }, orders.map((x) => {\n          const s = stOf(x.状态 || ''), [a] = godColor(godsOf(x.神祇)[0] || '');\n          return h('li', { 'data-st': s, style: { '--g': a } },\n            h('i', { class: 'dlc-zsp-os', 'aria-hidden': 'true' }),\n            h('div', null,\n              h('div', { class: 'dlc-zsp-o-hd' }, h('b', { text: x.标题 || '无题神命' }), h('small', { text: x.神祇 || '' }), h('em', { text: x.状态 || ST_TXT[s] })),\n              x.内容 ? h('p', { text: x.内容 }) : null,\n              h('p', { class: 'dlc-zsp-o-ft' },\n                x.期限 ? h('span', null, h('i', { text: '限' }), x.期限) : null,\n                x.奖励 ? h('span', { 'data-k': 'gain' }, h('i', { text: '赏' }), x.奖励) : null,\n                x.惩罚 ? h('span', { 'data-k': 'loss' }, h('i', { text: '罚' }), x.惩罚) : null)));\n        })) : h('p', { class: 'dlc-zsp-none', text: '眼下没有神下命。' })),\n      h('section', { class: 'dlc-zsp-sec' },\n        h('h5', null, '神赏录', h('span', { text: `${gifts.length}/10` })),\n        gifts.length ? h('ul', { class: 'dlc-zsp-gifts' }, gifts.map((x) => {\n          const k = kindOf(x.落点, x.赏赐), [a] = godColor(godsOf(x.神祇)[0] || '');\n          return h('li', { style: { '--g': a } },\n            giftIcon(sv, k),\n            h('div', null,\n              h('div', { class: 'dlc-zsp-gf-hd' }, h('b', { text: x.赏赐 || '' }), x.日期 ? h('time', { text: fmtDate(x.日期) }) : null),\n              h('p', null, h('span', { text: x.神祇 || '' }), x.落点 ? h('code', { text: x.落点 }) : null)));\n        })) : h('p', { class: 'dlc-zsp-none', text: '还没有神赏过东西。' })));\n  }\n  function dock(st, kit) {\n    const c = U.coreOf(st) || {};\n    const n = U.list(c.在场诸神).length, 瞩目 = U.num(c.瞩目, 10);\n    return kit.h('span', { class: 'dlc-zsd', 'data-m': kit.motion || 'full', 'data-gz': U.tierOf(瞩目档, 瞩目).i, 'data-end': U.ended(c) ? true : null,\n      title: `诸神围观 · ${c.观测状态 || '旧神垂眸'} · ${n} 位神在看 · 瞩目 ${瞩目} · 神眷 ${U.num(c.神眷, 50)}` },\n      kit.sv('svg', { class: 'dlc-zsd-eye', viewBox: '0 0 24 16', 'aria-hidden': 'true' },\n        kit.sv('path', { class: 'l', d: 'M1 8Q12 -3 23 8Q12 19 1 8Z' }), kit.sv('circle', { class: 'i', cx: 12, cy: 8, r: 4.2 }), kit.sv('circle', { class: 'p', cx: 12, cy: 8, r: 1.6 })),\n      kit.h('b', { 'data-k': 'n', text: `${n}神` }), kit.h('i', { text: '·' }), kit.h('b', { 'data-k': 'v', text: String(瞩目) }));\n  }\n\n  /** 瞩目 ≥ 70 → 主页面 <html data-dlc-gaze=\"1\">，≥ 90 → \"2\"；低于 70、已终结、换核心或撤下时移除 */\n  function apply(st, doc) {\n    const root = doc && doc.documentElement;\n    if (!root) return;\n    const c = U.coreOf(st);\n    if (st && U.mine(st) && !U.ended(c) && U.num(c && c.瞩目, 0) >= 70) root.setAttribute('data-dlc-gaze', U.num(c.瞩目, 0) >= 90 ? '2' : '1');\n    else root.removeAttribute('data-dlc-gaze');\n  }\n\n  const P = '#chat .last_mes .mes_text[data-dlp-theme]';\n  const css = `\n@property --zs-a{syntax:'<angle>';inherits:true;initial-value:0deg}\n.dlc-zs,.dlc-zsp,.dlc-zsd{--zs-ink:#05070F;--zs-p1:#0A0F1E;--zs-p2:#111A33;--zs-gold:#E8C468;--zs-gold2:#FFF0C2;--zs-cyan:#5FD8EA;--zs-violet:#9D78FF;--zs-txt:#ECEFF7;--zs-txt2:#9AA6C0}\n.dlc-zs{position:relative;isolation:isolate;overflow:hidden;container-type:inline-size;margin:1.15em 0;color:var(--zs-txt);font-family:var(--dlp-serif,serif);\n  background:radial-gradient(90% 60% at 50% -10%,rgba(95,216,234,.16),transparent 62%),radial-gradient(70% 50% at 100% 100%,rgba(157,120,255,.14),transparent 64%),linear-gradient(180deg,var(--zs-p2),var(--zs-ink) 78%);\n  box-shadow:inset 0 0 0 1px rgba(232,196,104,.22);--dlp-on:var(--zs-txt);--dlp-on2:var(--zs-txt2);--dlp-on-line:rgba(232,196,104,.25)}\n.dlc-zs::before{content:'';position:absolute;left:0;right:0;top:0;height:1px;z-index:5;background:linear-gradient(90deg,transparent,var(--zs-gold) 20%,#FFFFFF 50%,var(--zs-gold) 80%,transparent)}\n.dlc-zs-sky{position:absolute;inset:0;z-index:-1;pointer-events:none}\n.dlc-zs-sky i{position:absolute;width:var(--s);height:var(--s);background:#FFFFFF;opacity:.5;box-shadow:0 0 4px rgba(255,255,255,.7)}\n.dlc-zs-hd{position:relative;z-index:2;display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;padding:12px 16px 6px;font-size:12px;color:var(--zs-txt2)}\n.dlc-zs-k{font-size:13px;letter-spacing:.5em;color:var(--zs-gold2);font-weight:700}\n.dlc-zs-scene{letter-spacing:.08em}\n.dlc-zs-cnt{margin-left:auto;font-family:var(--dlp-mono,ui-monospace,monospace);font-size:11px;color:var(--zs-gold)}\n.dlc-zs[data-writing] .dlc-zs-hd::after{content:'……';color:var(--zs-gold2);letter-spacing:.1em}\n.dlc-zs-body{position:relative;z-index:2;padding:6px 16px 16px;line-height:1.85}\n.dlc-zs-body>:first-child{margin-top:0}.dlc-zs-body>:last-child{margin-bottom:0}\n/* 神纹 */\n.dlc-zs-sg{display:block;overflow:visible}\n.zs-sg-ring{fill:none;stroke:var(--g);stroke-width:1.1}\n.zs-sg-poly{fill:var(--g);fill-opacity:.18;stroke:var(--g2);stroke-width:1.2;stroke-linejoin:miter}\n.zs-sg-ray{stroke:var(--g);stroke-width:1;fill:none}\n.zs-sg-core{fill:var(--g2)}\n/* 神谕 */\n.dlc-zs-pillars{position:absolute;inset:0;z-index:0;pointer-events:none}\n.dlc-zs-pillars i{position:absolute;top:0;bottom:0;width:46px;margin-left:-23px;opacity:.34;\n  background:linear-gradient(180deg,var(--g) 0%,transparent 75%);-webkit-mask:linear-gradient(90deg,transparent,#000 46%,#000 54%,transparent);mask:linear-gradient(90deg,transparent,#000 46%,#000 54%,transparent)}\n.dlc-zs-pillars i::after{content:'';position:absolute;left:50%;top:0;bottom:12%;width:1px;background:linear-gradient(180deg,var(--g2),transparent)}\n.dlc-zs-gallery{position:relative;z-index:2;display:flex;justify-content:space-around;padding:14px 8px 6px}\n.dlc-zs-seat{flex:1 1 0;min-width:0;margin:0;display:flex;flex-direction:column;align-items:center;gap:4px;transform:translateY(var(--y))}\n.dlc-zs-seat .dlc-zs-sg{width:34px;height:34px;filter:drop-shadow(0 0 6px var(--g))}\n.dlc-zs-seat figcaption{max-width:100%;font-size:11px;letter-spacing:.06em;color:var(--g);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dlc-zs-feed{position:relative;z-index:2;list-style:none;margin:0;padding:6px 12px 14px;display:grid;gap:4px}\n.dlc-zs-msg{position:relative;display:grid;grid-template-columns:26px minmax(0,1fr);gap:10px;padding:8px 10px 9px;\n  background:linear-gradient(90deg,rgba(5,7,15,.78),rgba(5,7,15,.35) 75%,transparent)}\n.dlc-zs-msg::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:linear-gradient(180deg,var(--g2),var(--g))}\n.dlc-zs-msg-sg{width:26px;height:26px;margin-top:2px}\n.dlc-zs-who{display:block;font-size:13px;letter-spacing:.14em;color:var(--g);text-shadow:0 0 10px var(--g)}\n.dlc-zs-msg p{margin:2px 0 0;font-size:14px;line-height:1.75;color:var(--zs-txt)}\n.dlc-zs-narr{padding:4px 10px;color:var(--zs-txt2);font-size:13.5px;line-height:1.75}\n.dlc-zs-narr>*{margin:0}\n/* 神命 */\n.dlc-zs-decree{padding-bottom:2px}\n.dlc-zs-chains{position:relative;z-index:1;height:22px;margin:0 14%}\n.dlc-zs-chains i{position:absolute;top:0;bottom:0;width:2px;background:repeating-linear-gradient(180deg,var(--g2) 0 4px,transparent 4px 7px);box-shadow:0 0 6px var(--g)}\n.dlc-zs-chains i:first-child{left:0}.dlc-zs-chains i:last-child{right:0}\n.dlc-zs-tablet{position:relative;z-index:2;margin:0 12px 10px;padding:12px 14px 12px;border:1px solid var(--g);outline:1px solid rgba(255,255,255,.08);outline-offset:-5px;\n  background:radial-gradient(90% 70% at 50% 0,color-mix(in srgb,var(--g) 22%,transparent),transparent 70%),linear-gradient(180deg,#0E1428,#070A14)}\n.dlc-zs-tab-hd{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center}\n.dlc-zs-tab-sg{width:34px;height:34px;filter:drop-shadow(0 0 6px var(--g))}\n.dlc-zs-tab-who{display:block;margin-top:2px;font-size:14px;color:var(--g2);letter-spacing:.06em}\n.dlc-zs-st{font-style:normal;font-size:12px;letter-spacing:.2em;padding:3px 8px;border:1px solid currentColor}\n.dlc-zs-st[data-st=live]{color:var(--zs-cyan)}.dlc-zs-st[data-st=done]{color:var(--zs-gold2);background:rgba(232,196,104,.16)}\n.dlc-zs-st[data-st=defy],.dlc-zs-st[data-st=fail]{color:#C9A2FF;background:rgba(157,120,255,.12)}\n.dlc-zs-order{margin:12px 0 10px;font-size:clamp(16px,4.6cqw,20px);line-height:1.55;font-weight:700;color:#FFFFFF;letter-spacing:.04em}\n.dlc-zs-term{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--zs-txt2)}\n.dlc-zs-term b{color:var(--zs-txt);font-weight:600}\n.dlc-zs-glass{width:16px;height:24px;flex:none}\n.dlc-zs-glass .f{fill:none;stroke:var(--g2);stroke-width:1.2}\n.dlc-zs-glass .s{fill:var(--zs-gold)}\n.dlc-zs-glass .m{stroke:var(--zs-gold);stroke-width:1;stroke-dasharray:1.5 2}\n.dlc-zs-weigh{margin-top:10px}\n.dlc-zs-scale{display:block;width:100%;max-width:340px;height:auto;margin:0 auto;overflow:visible;--zs-a:0deg}\n.dlc-zs-scale[data-st=done]{--zs-a:-9deg}.dlc-zs-scale[data-st=defy],.dlc-zs-scale[data-st=fail]{--zs-a:9deg}\n.dlc-zs-post{fill:none;stroke:rgba(236,239,247,.55);stroke-width:1.4}\n.dlc-zs-beamg{transform-box:view-box;transform-origin:120px 14px;transform:rotate(var(--zs-a))}\n.dlc-zs-beam-l{stroke:var(--zs-gold);stroke-width:2.2}\n.dlc-zs-pivot{fill:var(--zs-gold2)}\n.dlc-zs-pan{transform-box:view-box;transform:rotate(calc(var(--zs-a) * -1))}\n.dlc-zs-pan-c{fill:none;stroke:rgba(236,239,247,.5);stroke-width:1}\n.dlc-zs-pan.l .dlc-zs-pan-b{fill:rgba(232,196,104,.45);stroke:var(--zs-gold2);stroke-width:1}\n.dlc-zs-pan.r .dlc-zs-pan-b{fill:rgba(157,120,255,.35);stroke:#C9A2FF;stroke-width:1}\n.dlc-zs-scale[data-st=done] .dlc-zs-pan.l .dlc-zs-pan-b{filter:drop-shadow(0 0 8px var(--zs-gold))}\n.dlc-zs-scale[data-st=defy] .dlc-zs-pan.r .dlc-zs-pan-b,.dlc-zs-scale[data-st=fail] .dlc-zs-pan.r .dlc-zs-pan-b{filter:drop-shadow(0 0 8px var(--zs-violet))}\n.dlc-zs-sides{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:2px}\n.dlc-zs-side span{display:block;font-size:11px;letter-spacing:.3em}\n.dlc-zs-side p{margin:4px 0 0;font-size:12.5px;line-height:1.6;color:var(--zs-txt2)}\n.dlc-zs-side[data-k=gain] span{color:var(--zs-gold2)}.dlc-zs-side[data-k=loss]{text-align:right}.dlc-zs-side[data-k=loss] span{color:#C9A2FF}\n.dlc-zs-decree[data-st=done] .dlc-zs-side[data-k=gain] p{color:var(--zs-txt)}\n.dlc-zs-decree[data-st=defy] .dlc-zs-side[data-k=loss] p,.dlc-zs-decree[data-st=fail] .dlc-zs-side[data-k=loss] p{color:var(--zs-txt)}\n.dlc-zs-decree[data-st=done] .dlc-zs-side[data-k=loss],.dlc-zs-decree[data-st=defy] .dlc-zs-side[data-k=gain],.dlc-zs-decree[data-st=fail] .dlc-zs-side[data-k=gain]{opacity:.45}\n/* 神赏 */\n.dlc-zs-shaft{position:absolute;left:24%;top:0;width:150px;height:82%;margin-left:-75px;z-index:0;pointer-events:none;opacity:.6;\n  background:linear-gradient(180deg,#FFFFFF 0%,var(--g2) 10%,color-mix(in srgb,var(--g) 55%,transparent) 42%,transparent 90%);\n  -webkit-mask:linear-gradient(90deg,transparent,#000 38%,#000 62%,transparent);mask:linear-gradient(90deg,transparent,#000 38%,#000 62%,transparent)}\n.dlc-zs-motes{position:absolute;left:24%;top:0;width:150px;height:80%;margin-left:-75px;z-index:1;pointer-events:none}\n.dlc-zs-motes i{position:absolute;top:0;width:2px;height:2px;background:var(--g2);box-shadow:0 0 6px var(--g2);opacity:0}\n.dlc-zs-givers{display:inline-flex;gap:2px}\n.dlc-zs-giver-sg{width:20px;height:20px}\n.dlc-zs-giver{color:var(--g2);font-weight:600;letter-spacing:.06em}\n.dlc-zs-gift{position:relative;z-index:2;display:grid;grid-template-columns:minmax(120px,44%) minmax(0,1fr);gap:12px;align-items:center;padding:4px 16px 10px}\n@container (max-width:420px){.dlc-zs-gift{grid-template-columns:1fr}.dlc-zs-shaft,.dlc-zs-motes{left:50%}}\n@container (max-width:390px){.dlc-zs-art[data-k=soul]{max-width:176px}}\n.dlc-zs-gift-art{display:grid;place-items:center;min-height:96px}\n.dlc-zs-art{display:block;width:100%;max-width:200px;height:auto;overflow:visible}\n.dlc-zs-art-fall{stroke:var(--g2);stroke-width:1.4;opacity:.8}\n.dlc-zs-ring{fill:none;stroke:var(--c1);stroke-width:7}\n.dlc-zs-ring-glow{fill:none;stroke:var(--g);stroke-width:18;opacity:.32;filter:blur(5px)}\n.dlc-zs-ring-hi{fill:none;stroke:rgba(255,255,255,.55);stroke-width:1}\n.dlc-zs-art[data-k=bone] .dlc-zs-slot{fill:none;stroke:var(--g2);stroke-width:1;stroke-dasharray:3 3;opacity:.6}\n.dlc-zs-bone path{fill:#F3EBD7;stroke:var(--g2);stroke-width:1.2;filter:drop-shadow(0 0 8px var(--g))}\n.dlc-zs-bone .v{fill:none;stroke:var(--g);stroke-width:1.2;filter:none}\n.dlc-zs-coins{position:relative;height:96px}\n.dlc-zs-coins svg{position:absolute;inset:0;width:100%;height:100%}\n.dlc-zs-coins ellipse{fill:#E8C468;stroke:#FFF0C2;stroke-width:1}\n.dlc-zs-coins i{position:absolute;top:8%;width:10px;height:4px;background:#F3D98A;box-shadow:0 0 6px #E8C468;opacity:.8;transform:rotate(20deg)}\n.dlc-zs-soul-ped-g{fill:none;stroke:var(--g);stroke-width:10;opacity:.22;filter:blur(4px)}\n.dlc-zs-soul-ped{fill:color-mix(in srgb,var(--g) 14%,transparent);stroke:var(--g2);stroke-width:1.1;opacity:.82}\n.dlc-zs-soul-ped2{fill:none;stroke:var(--zs-gold);stroke-width:.9;stroke-dasharray:4 3;opacity:.65}\n.dlc-zs-soul-glow{fill:var(--g);opacity:.22;filter:blur(7px)}\n.dlc-zs-soul-r1,.dlc-zs-soul-r2,.dlc-zs-soul-gem{transform-box:view-box;transform-origin:80px 46px}\n.dlc-zs-soul-wl{transform-box:view-box;transform-origin:76px 56px}\n.dlc-zs-soul-wr{transform-box:view-box;transform-origin:84px 56px}\n.dlc-zs-soul-o1{fill:none;stroke:var(--g2);stroke-width:1.15;stroke-dasharray:15 4 2 4;opacity:.88}\n.dlc-zs-soul-ticks{fill:none;stroke:var(--zs-gold2);stroke-width:1.1;opacity:.85}\n.dlc-zs-soul-o2{fill:none;stroke:var(--g);stroke-width:1;stroke-dasharray:5 3;opacity:.8}\n.dlc-zs-soul-hex{fill:color-mix(in srgb,var(--g) 10%,transparent);stroke:var(--g2);stroke-width:.85;opacity:.58}\n.dlc-zs-soul-w1{fill:color-mix(in srgb,var(--g2) 28%,transparent);stroke:var(--g2);stroke-width:1.05;filter:drop-shadow(0 0 5px var(--g))}\n.dlc-zs-soul-w2{fill:color-mix(in srgb,var(--g) 22%,transparent);stroke:var(--g);stroke-width:.95;opacity:.88}\n.dlc-zs-soul-body{fill:color-mix(in srgb,var(--g) 36%,#0A0F1E);stroke:var(--g2);stroke-width:1.35;filter:drop-shadow(0 0 9px var(--g))}\n.dlc-zs-soul-cut{fill:none;stroke:rgba(255,255,255,.55);stroke-width:.8}\n.dlc-zs-soul-core{fill:var(--zs-gold2);stroke:#FFFFFF;stroke-width:.8;opacity:.92}\n.dlc-zs-soul-dot{fill:#FFFFFF}\n.dlc-zs-soul-sparks circle{fill:var(--zs-gold2);opacity:.6;filter:drop-shadow(0 0 3px var(--g2))}\n.dlc-zs-boon{width:84px;height:84px;filter:drop-shadow(0 0 12px var(--g))}\n.dlc-zs-gift-tag{display:inline-block;font-size:11px;letter-spacing:.24em;color:var(--g2);padding-bottom:4px;border-bottom:1px solid var(--g)}\n.dlc-zs-gift-name{margin:8px 0 6px;font-size:clamp(15px,4.4cqw,19px);line-height:1.5;font-weight:700;color:#FFFFFF}\n.dlc-zs-gift-num{display:flex;align-items:flex-end;flex-wrap:wrap;gap:6px 12px}\n.dlc-zs-gift-num em{font-style:normal;font-family:var(--dlp-mono,ui-monospace,monospace);font-size:13px;color:var(--zs-gold2);padding-bottom:4px}\n.dlc-zs-gift-path{display:block;margin-top:8px;font-family:var(--dlp-mono,ui-monospace,monospace);font-size:11px;color:var(--zs-txt2);overflow-wrap:anywhere;background:none;padding:0}\n.dlc-zs-odo{display:inline-flex;align-items:flex-end;gap:2px;font:700 clamp(28px,9cqw,42px)/1 var(--dlp-mono,ui-monospace,monospace);font-variant-numeric:tabular-nums;color:#FFF6DC;text-shadow:0 0 14px var(--g)}\n.dlc-zs-odo-c{display:inline-block;height:1em;overflow:hidden;padding:2px .06em;box-sizing:content-box;background:linear-gradient(180deg,rgba(255,255,255,.1),transparent 45%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1px rgba(232,196,104,.38)}\n.dlc-zs-odo-c[data-lead]{display:none}\n.dlc-zs-odo-s{display:flex;flex-direction:column;transform:translateY(calc(var(--z) * -1em))}\n.dlc-zs-odo-s span{display:block;height:1em;line-height:1em}\n.dlc-zs-odo small{font-size:.38em;margin-left:4px;padding-bottom:4px;color:var(--zs-gold2)}\n/* 结局 */\n.dlc-zs-end{padding-bottom:4px;text-align:center}\n.dlc-zs-end[data-kind=smite]{background:radial-gradient(60% 50% at 50% 0,rgba(201,162,255,.28),transparent 70%),linear-gradient(180deg,#120B22,#05040A)}\n.dlc-zs-end[data-kind=puppet]{background:radial-gradient(70% 60% at 50% 10%,rgba(232,196,104,.3),transparent 70%),linear-gradient(180deg,#1A1408,#07060A)}\n.dlc-zs-end-art{position:absolute;left:0;top:0;width:100%;height:150px;z-index:0;pointer-events:none}\n.dlc-zs-bolt{fill:none;stroke:#FFFFFF;stroke-width:2}\n.dlc-zs-bolt-g{fill:none;stroke:#C9A2FF;stroke-width:10;opacity:.4;filter:blur(4px)}\n.dlc-zs-string{fill:none;stroke:var(--zs-gold2);stroke-width:1;opacity:.7}\n.dlc-zs-cage{fill:none;stroke:var(--zs-gold);stroke-width:1.4;opacity:.55}\n.dlc-zs-judges{position:relative;z-index:2;display:flex;justify-content:center;gap:10px;padding:16px 12px 0}\n.dlc-zs-judges .dlc-zs-sg{width:26px;height:26px}\n.dlc-zs-end[data-kind=smite] .dlc-zs-judges .zs-sg-poly{fill:#FFFFFF;fill-opacity:.85}\n.dlc-zs-end-k{position:relative;z-index:2;margin-top:24px;font-size:12px;letter-spacing:.42em;color:var(--zs-txt2)}\n.dlc-zs-end-t{position:relative;z-index:2;margin:8px 0 4px;font-size:clamp(30px,10cqw,52px);line-height:1.15;letter-spacing:.32em;text-indent:.32em;font-weight:800}\n.dlc-zs-end[data-kind=smite] .dlc-zs-end-t{color:#F4EEFF;text-shadow:0 0 18px rgba(201,162,255,.9),0 0 2px #FFFFFF}\n.dlc-zs-end[data-kind=puppet] .dlc-zs-end-t{color:var(--zs-gold2);text-shadow:0 0 18px rgba(232,196,104,.85)}\n.dlc-zs-end-m{position:relative;z-index:2;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;margin:14px 16px 4px;font-size:13px;line-height:1.6;text-align:left}\n.dlc-zs-end-m dt{color:var(--zs-txt2);letter-spacing:.2em}.dlc-zs-end-m dd{margin:0}\n.dlc-zs-end .dlc-zs-body{text-align:left}\n.dlc-zs-end-f{position:relative;z-index:2;padding:6px 16px 14px;font-size:12px;letter-spacing:.14em;color:var(--zs-txt2)}\n\n/* ───── 状态栏页 ───── */\n.dlc-zsp{position:relative;isolation:isolate;overflow:hidden;container-type:inline-size;padding:16px 14px 16px;color:var(--zs-txt);font-family:var(--dlp-serif,serif);\n  background:radial-gradient(90% 40% at 50% 0,rgba(95,216,234,.14),transparent 70%),radial-gradient(70% 40% at 100% 40%,rgba(157,120,255,.12),transparent 70%),linear-gradient(180deg,#0E1630,#05070F 60%)}\n.dlc-zsp::before{content:'';position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--zs-gold),#FFFFFF,var(--zs-gold),transparent)}\n.dlc-zsp-end{margin:-16px -14px 14px;padding:10px 14px;display:grid;gap:3px}\n.dlc-zsp-end[data-kind=smite]{background:linear-gradient(90deg,#2A1A48,#120B22);color:#E9DEFF}\n.dlc-zsp-end[data-kind=puppet]{background:linear-gradient(90deg,#4A3812,#1A1408);color:var(--zs-gold2)}\n.dlc-zsp-end b{font-size:15px;letter-spacing:.36em}.dlc-zsp-end span{font-size:12px;line-height:1.5}\n.dlc-zsp-k{font-size:11px;letter-spacing:.3em;color:var(--zs-txt2)}\n.dlc-zsp h4{margin:3px 0 4px;font-size:22px;letter-spacing:.14em;color:#FFFFFF}\n.dlc-zsp h4 small{margin-left:4px;font-size:13px;color:var(--zs-gold);letter-spacing:.08em;font-weight:400}\n.dlc-zsp-obs{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;font-size:12px}\n.dlc-zsp-obs b{color:var(--zs-gold2);letter-spacing:.2em;padding:2px 8px;border:1px solid rgba(232,196,104,.5)}\n.dlc-zsp-obs span{color:var(--zs-txt2)}\n.dlc-zsp-warn p{margin:10px 0 0;padding:6px 10px;font-size:12px;line-height:1.55;border-left:2px solid var(--zs-violet);background:linear-gradient(90deg,rgba(157,120,255,.18),transparent);color:#E6DCFF}\n.dlc-zsp-chart{display:block;width:100%;height:auto;margin:10px 0 2px;overflow:visible}\n.dlc-zsp-star{fill:#FFFFFF;opacity:.55}\n.dlc-zsp-arc{fill:none;stroke:rgba(232,196,104,.55);stroke-width:1}\n.dlc-zsp-arc2{fill:none;stroke:rgba(232,196,104,.18);stroke-width:1;stroke-dasharray:2 4}\n.dlc-zsp-seat{stroke:rgba(232,196,104,.4);stroke-width:1.2}\n.dlc-zsp-ray{fill:none;stroke:var(--g);stroke-width:var(--w);stroke-opacity:var(--o)}\n.dlc-zsp-ray[data-neg]{stroke-dasharray:3 4}\n.dlc-zsp-mirror{fill:rgba(95,216,234,.14);stroke:rgba(95,216,234,.55);stroke-width:1}\n.dlc-zsp-you{fill:#FFFFFF}\n.dlc-zsp-you-r{fill:none;stroke:var(--zs-gold);stroke-width:.8;opacity:calc(.6 - var(--i) * .1)}\n.dlc-zsp-you-t{font-size:9px;fill:var(--zs-txt2);letter-spacing:.2em}\n.dlc-zsp-name{font-size:9px;fill:var(--g);letter-spacing:.04em;paint-order:stroke;stroke:#070A16;stroke-width:3px;stroke-linejoin:round}\n.dlc-zsp-god .dlc-zs-sg{filter:drop-shadow(0 0 4px var(--g))}\n.dlc-zsp-meters{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px}\n@container (max-width:380px){.dlc-zsp-meters{grid-template-columns:1fr}}\n.dlc-zsp-v{display:flex;align-items:baseline;gap:9px;margin-bottom:7px}\n.dlc-zsp-v span{font-size:12px;letter-spacing:.3em;color:var(--zs-txt2)}\n.dlc-zsp-v b{font-family:var(--dlp-mono,ui-monospace,monospace);font-size:26px;line-height:1;color:#FFFFFF;font-variant-numeric:tabular-nums}\n.dlc-zsp-v em{font-style:normal;font-size:13px;letter-spacing:.14em;color:var(--zs-gold2)}\n.dlc-zsp-v[data-k=fav] em{color:var(--zs-cyan)}\n.dlc-zsp-eyes{display:grid;grid-template-columns:repeat(10,1fr);gap:3px}\n.dlc-zsp-eyes svg{width:100%;height:auto;overflow:visible}\n.dlc-zsp-eyes .l{fill:rgba(232,196,104,.2);stroke:var(--zs-gold);stroke-width:1.2}\n.dlc-zsp-eyes .p{fill:var(--zs-gold2)}\n.dlc-zsp-eyes .c{fill:none;stroke:rgba(154,166,192,.5);stroke-width:1.2}\n.dlc-zsp-eyes svg[data-open]{transform-box:fill-box;transform-origin:center}\n.dlc-zsp-fav-bar{position:relative;height:12px;background:linear-gradient(90deg,#2A1240 0%,#5A2F98 15%,#3D7FC0 40%,#5FD8EA 60%,#E8C468 76%,#FFF0C2 90%,#FFFFFF 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}\n.dlc-zsp-fav-cage{position:absolute;left:90%;right:0;top:-3px;bottom:-3px;background:repeating-linear-gradient(90deg,rgba(5,7,15,.75) 0 1px,transparent 1px 5px)}\n.dlc-zsp-fav-m{position:absolute;left:var(--v);top:-5px;bottom:-5px;width:2px;margin-left:-1px;background:#FFFFFF;box-shadow:0 0 8px #FFFFFF}\n.dlc-zsp-ticks{position:relative;height:26px;margin-top:3px;font-size:10px;color:var(--zs-txt2)}\n.dlc-zsp-ticks i{position:absolute;top:0;left:var(--x);width:1px;height:5px;background:rgba(236,239,247,.35)}\n.dlc-zsp-ticks span{position:absolute;top:8px;left:var(--x);transform:translateX(-50%);white-space:nowrap}\n.dlc-zsp-ticks span[data-at=\"0\"]{transform:none}.dlc-zsp-ticks span[data-at=\"90\"]{transform:translateX(-70%)}\n.dlc-zsp-ticks span[data-on]{color:#FFFFFF}\n.dlc-zsp-ticks span:not([data-on]){display:none}\n.dlc-zsp-sec{margin-top:18px}\n.dlc-zsp-sec h5{display:flex;align-items:baseline;gap:10px;margin:0 0 6px;font-size:13px;letter-spacing:.3em;color:var(--zs-gold2);font-weight:600}\n.dlc-zsp-sec h5 span{font-family:var(--dlp-mono,ui-monospace,monospace);font-size:11px;letter-spacing:.04em;color:var(--zs-txt2);font-weight:400}\n.dlc-zsp-gods,.dlc-zsp-orders,.dlc-zsp-gifts{list-style:none;margin:0;padding:0}\n.dlc-zsp-gods li{display:grid;grid-template-columns:28px minmax(0,1fr) 74px;gap:10px;align-items:start;padding:9px 0;border-top:1px solid rgba(236,239,247,.07)}\n.dlc-zsp-gsg{width:28px;height:28px;filter:drop-shadow(0 0 4px var(--g))}\n.dlc-zsp-g-hd{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px}\n.dlc-zsp-g-hd b{font-size:14px;color:var(--g);letter-spacing:.06em}\n.dlc-zsp-g-hd small{font-size:11px;color:var(--zs-txt2)}\n.dlc-zsp-mood{margin:2px 0 0;font-size:12px;color:var(--g2);font-style:italic}\n.dlc-zsp-taste{margin:2px 0 0;font-size:12px;line-height:1.5;color:var(--zs-txt2)}\n.dlc-zsp-att{position:relative;height:16px;margin-top:4px;background:linear-gradient(90deg,transparent calc(50% - .5px),rgba(236,239,247,.4) calc(50% - .5px) calc(50% + .5px),transparent calc(50% + .5px)),rgba(236,239,247,.06)}\n.dlc-zsp-att i{position:absolute;top:5px;height:6px;left:50%;width:var(--a);background:var(--g)}\n.dlc-zsp-att[data-neg] i{left:auto;right:50%;background:repeating-linear-gradient(90deg,var(--g) 0 3px,transparent 3px 5px)}\n.dlc-zsp-att b{position:absolute;top:16px;left:0;right:0;text-align:center;font:600 10.5px/1.4 var(--dlp-mono,ui-monospace,monospace);color:var(--zs-txt2)}\n.dlc-zsp-orders li{display:grid;grid-template-columns:12px minmax(0,1fr);gap:10px;padding:9px 0;border-top:1px solid rgba(236,239,247,.07)}\n.dlc-zsp-os{width:10px;height:10px;margin-top:5px;border:1.5px solid var(--zs-cyan);transform:rotate(45deg)}\n.dlc-zsp-orders li[data-st=done] .dlc-zsp-os{background:var(--zs-gold);border-color:var(--zs-gold2)}\n.dlc-zsp-orders li[data-st=defy] .dlc-zsp-os,.dlc-zsp-orders li[data-st=fail] .dlc-zsp-os{border-color:#C9A2FF;border-style:dashed}\n.dlc-zsp-o-hd{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px}\n.dlc-zsp-o-hd b{font-size:14px;color:#FFFFFF}\n.dlc-zsp-o-hd small{font-size:11px;color:var(--g)}\n.dlc-zsp-o-hd em{margin-left:auto;font-style:normal;font-size:11px;letter-spacing:.14em;color:var(--zs-cyan)}\n.dlc-zsp-orders li[data-st=done] .dlc-zsp-o-hd em{color:var(--zs-gold2)}\n.dlc-zsp-orders li[data-st=defy] .dlc-zsp-o-hd em,.dlc-zsp-orders li[data-st=fail] .dlc-zsp-o-hd em{color:#C9A2FF}\n.dlc-zsp-orders p{margin:3px 0 0;font-size:12.5px;line-height:1.55;color:var(--zs-txt)}\n.dlc-zsp-o-ft{display:flex;flex-wrap:wrap;gap:2px 12px;color:var(--zs-txt2) !important;font-size:11.5px !important}\n.dlc-zsp-o-ft i{font-style:normal;margin-right:4px;color:var(--zs-gold)}\n.dlc-zsp-o-ft span[data-k=loss] i{color:#C9A2FF}\n.dlc-zsp-gifts li{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;padding:9px 0;border-top:1px solid rgba(236,239,247,.07)}\n.dlc-zsp-gi{width:20px;height:20px;margin-top:1px;fill:none;stroke:var(--g);stroke-width:1.4}\n.dlc-zsp-gi[data-k=coin]{stroke:var(--zs-gold)}\n.dlc-zsp-gi[data-k=soul]{stroke:var(--g2)}\n.dlc-zsp-gf-hd{display:flex;align-items:baseline;gap:8px}\n.dlc-zsp-gf-hd b{font-size:13.5px;color:#FFFFFF;line-height:1.5}\n.dlc-zsp-gf-hd time{margin-left:auto;flex:none;font-family:var(--dlp-mono,ui-monospace,monospace);font-size:10.5px;color:var(--zs-txt2)}\n.dlc-zsp-gifts p{margin:2px 0 0;display:flex;flex-wrap:wrap;gap:2px 10px;font-size:11.5px;color:var(--g)}\n.dlc-zsp-gifts code{font-family:var(--dlp-mono,ui-monospace,monospace);color:var(--zs-txt2);background:none;padding:0;overflow-wrap:anywhere}\n.dlc-zsp-none{margin:4px 0 0;font-size:12px;color:var(--zs-txt2)}\n/* 底栏 */\n.dlc-zsd{display:inline-flex;align-items:center;gap:5px;font:600 12px/1 var(--dlp-mono,ui-monospace,monospace);color:var(--zs-txt)}\n.dlc-zsd-eye{width:22px;height:15px;overflow:visible}\n.dlc-zsd-eye .l{fill:rgba(232,196,104,.15);stroke:var(--zs-gold);stroke-width:1.4}\n.dlc-zsd-eye .i{fill:none;stroke:var(--zs-cyan);stroke-width:1.2}\n.dlc-zsd-eye .p{fill:var(--zs-gold2)}\n.dlc-zsd[data-gz=\"3\"] .dlc-zsd-eye .l,.dlc-zsd[data-gz=\"4\"] .dlc-zsd-eye .l{fill:rgba(232,196,104,.45);filter:drop-shadow(0 0 4px var(--zs-gold))}\n.dlc-zsd[data-end] .dlc-zsd-eye .l{stroke:#8A7FA8;fill:none}\n.dlc-zsd b[data-k=n]{color:var(--zs-gold2)}.dlc-zsd i{font-style:normal;color:var(--zs-txt2)}\n\n/* ───── 动效 ───── */\n[data-dlp-motion=full] .dlc-zs-sky i{animation:dlcZsTwinkle 4.5s ease-in-out infinite;animation-delay:var(--d)}\n[data-dlp-motion=full] .dlc-zs-pillars i{animation:dlcZsPillar 5s ease-in-out infinite;animation-delay:calc(var(--i) * -1.3s)}\n[data-dlp-motion=full] .dlc-zs-oracle[data-play] .dlc-zs-pillars i{animation:dlcZsDrop .8s cubic-bezier(.3,.7,.2,1) both,dlcZsPillar 5s ease-in-out infinite;transform-origin:top;\n  animation-delay:calc(var(--dlc-t,0s) + var(--i) * .12s),calc(var(--dlc-t,0s) + .9s + var(--i) * -1.3s)}\n[data-dlp-motion=full] .dlc-zs-seat .dlc-zs-sg{animation:dlcZsSpin 30s linear infinite}\n[data-dlp-motion=full] .dlc-zs-oracle[data-play] .dlc-zs-seat{animation:dlcZsSeat .7s cubic-bezier(.2,.8,.3,1.3) both;animation-delay:calc(var(--dlc-t,0s) + .2s + var(--i) * .12s)}\n[data-dlp-motion=full] .dlc-zs-oracle[data-play] .dlc-zs-msg{animation:dlcZsFall .7s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--dlc-t,0s) + .7s + var(--i) * .35s)}\n[data-dlp-motion=full] .dlc-zs-oracle[data-play] .dlc-zs-msg::before{animation:dlcZsStreak .7s ease-out both;animation-delay:calc(var(--dlc-t,0s) + .7s + var(--i) * .35s)}\n[data-dlp-motion=full] .dlc-zs-oracle[data-writing] .dlc-zs-msg:last-child .dlc-zs-msg-sg{animation:dlcZsBlink 1s steps(2) infinite}\n[data-dlp-motion=full] .dlc-zs-decree[data-play] .dlc-zs-chains{animation:dlcZsChain .6s ease-out both;animation-delay:var(--dlc-t,0s);transform-origin:top}\n[data-dlp-motion=full] .dlc-zs-decree[data-play] .dlc-zs-tablet{animation:dlcZsDescend .9s cubic-bezier(.2,.8,.3,1.15) both;animation-delay:calc(var(--dlc-t,0s) + .2s)}\n[data-dlp-motion=full] .dlc-zs-decree .dlc-zs-chains i{animation:dlcZsLinks 1.2s linear infinite}\n[data-dlp-motion=full] .dlc-zs-scale[data-st=live]{animation:dlcZsSwing 3.2s ease-in-out infinite alternate}\n[data-dlp-motion=full] .dlc-zs-decree[data-play] .dlc-zs-scale:not([data-st=live]){animation:dlcZsSettle 1.8s cubic-bezier(.3,1.6,.4,1) both;animation-delay:calc(var(--dlc-t,0s) + 1s)}\n[data-dlp-motion=full] .dlc-zs-glass[data-st=live] .m{animation:dlcZsSand .6s linear infinite}\n[data-dlp-motion=full] .dlc-zs-decree[data-st=live] .dlc-zs-tab-sg{animation:dlcZsSpin 18s linear infinite}\n[data-dlp-motion=full] .dlc-zs-shaft{animation:dlcZsBreathe 3.6s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-zs-reward[data-play] .dlc-zs-shaft{animation:dlcZsSlam .7s cubic-bezier(.7,0,.2,1) both,dlcZsBreathe 3.6s ease-in-out infinite;transform-origin:top;\n  animation-delay:var(--dlc-t,0s),calc(var(--dlc-t,0s) + .8s)}\n[data-dlp-motion=full] .dlc-zs-motes i{animation:dlcZsMote 2.6s linear infinite;animation-delay:calc(var(--i) * -.19s)}\n[data-dlp-motion=full] .dlc-zs-reward[data-play] .dlc-zs-art[data-k=ring]{animation:dlcZsRingIn 1.1s cubic-bezier(.2,.8,.25,1.2) both;animation-delay:calc(var(--dlc-t,0s) + .45s)}\n[data-dlp-motion=full] .dlc-zs-reward[data-play] .dlc-zs-ring{animation:dlcZsRingTone 1.4s ease-in-out both;animation-delay:calc(var(--dlc-t,0s) + 1.3s)}\n[data-dlp-motion=full] .dlc-zs-ring-glow{animation:dlcZsGlow 2.4s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-zs-reward[data-play] .dlc-zs-bone{animation:dlcZsSlot 1.2s cubic-bezier(.2,.8,.3,1.2) both;animation-delay:calc(var(--dlc-t,0s) + .5s)}\n[data-dlp-motion=full] .dlc-zs-coins i{animation:dlcZsCoin 1.8s cubic-bezier(.5,0,.8,.6) infinite;animation-delay:calc(var(--i) * -.21s)}\n[data-dlp-motion=full] .dlc-zs-soul-r1{animation:dlcZsSpin 22s linear infinite}\n[data-dlp-motion=full] .dlc-zs-soul-r2{animation:dlcZsSpinRev 15s linear infinite}\n[data-dlp-motion=full] .dlc-zs-soul-glow{animation:dlcZsGlow 2.6s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-zs-soul-gem{animation:dlcZsSoulFloat 3.4s ease-in-out infinite}\n[data-dlp-motion=full] .dlc-zs-reward[data-play] .dlc-zs-soul-gem{animation:dlcZsSoulAwake 1.1s cubic-bezier(.2,.85,.28,1.25) both,dlcZsSoulFloat 3.4s ease-in-out infinite;\n  animation-delay:calc(var(--dlc-t,0s) + .4s),calc(var(--dlc-t,0s) + 1.5s)}\n[data-dlp-motion=full] .dlc-zs-reward[data-play] .dlc-zs-soul-wl{animation:dlcZsWingL 1.05s cubic-bezier(.2,.85,.25,1.18) both;animation-delay:calc(var(--dlc-t,0s) + .52s)}\n[data-dlp-motion=full] .dlc-zs-reward[data-play] .dlc-zs-soul-wr{animation:dlcZsWingR 1.05s cubic-bezier(.2,.85,.25,1.18) both;animation-delay:calc(var(--dlc-t,0s) + .52s)}\n[data-dlp-motion=full] .dlc-zs-soul-sparks circle{animation:dlcZsSoulRise 2.6s ease-out infinite;animation-delay:calc(var(--i) * -.32s)}\n[data-dlp-motion=full] .dlc-zs-boon{animation:dlcZsSpin 24s linear infinite}\n[data-dlp-motion=full] .dlc-zs-reward[data-play] .dlc-zs-odo-s{animation:dlcZsRoll calc(1.3s + var(--i) * .22s) cubic-bezier(.2,.7,.1,1) both;animation-delay:calc(var(--dlc-t,0s) + 1.1s)}\n[data-dlp-motion=full] .dlc-zs-reward[data-play] .dlc-zs-gift-num em{animation:dlcZsPop .5s cubic-bezier(.2,.9,.3,1.5) both;animation-delay:calc(var(--dlc-t,0s) + 2.6s)}\n[data-dlp-motion=full] .dlc-zs-end[data-kind=smite] .dlc-zs-bolt,[data-dlp-motion=full] .dlc-zs-end[data-kind=smite] .dlc-zs-bolt-g{animation:dlcZsBolt 3.4s steps(1) infinite}\n[data-dlp-motion=full] .dlc-zs-end[data-kind=smite][data-play] .dlc-zs-judges span{animation:dlcZsJudge .5s ease-out both;animation-delay:calc(var(--dlc-t,0s) + var(--i) * .14s)}\n[data-dlp-motion=full] .dlc-zs-end[data-kind=puppet] .dlc-zs-string{stroke-dasharray:240;animation:dlcZsString 2.4s ease-out both;animation-delay:calc(var(--dlc-t,0s) + var(--i) * .15s)}\n[data-dlp-motion=full] .dlc-zs-end[data-kind=puppet] .dlc-zs-cage{animation:dlcZsBreathe 3s ease-in-out infinite}\n[data-dlp-motion=reduced] .dlc-zs[data-play] .dlc-zs-feed,[data-dlp-motion=reduced] .dlc-zs[data-play] .dlc-zs-tablet,[data-dlp-motion=reduced] .dlc-zs[data-play] .dlc-zs-gift{animation:dlcZsFade .5s ease-out both}\n.dlc-zsp[data-m=full] .dlc-zsp-star{animation:dlcZsTwinkle 5s ease-in-out infinite;animation-delay:var(--d)}\n.dlc-zsp[data-m=full] .dlc-zsp-ray{stroke-dasharray:2 5;animation:dlcZsFlow 1.6s linear infinite;animation-delay:calc(var(--i) * -.2s)}\n.dlc-zsp[data-m=full] .dlc-zsp-ray[data-neg]{stroke-dasharray:3 4;animation-duration:2.6s}\n.dlc-zsp[data-m=full] .dlc-zsp-you-r{transform-box:fill-box;transform-origin:center;animation:dlcZsRipple 3s ease-out infinite;animation-delay:calc(var(--i) * -.6s)}\n.dlc-zsp[data-m=full] .dlc-zsp-eyes svg[data-open]{animation:dlcZsLid 6s ease-in-out infinite;animation-delay:calc(var(--i) * -.61s)}\n.dlc-zsd[data-m=full] .dlc-zsd-eye .i{transform-box:fill-box;transform-origin:center;animation:dlcZsSpin 9s linear infinite}\n@keyframes dlcZsTwinkle{0%,100%{opacity:.15}50%{opacity:.8}}\n@keyframes dlcZsPillar{0%,100%{opacity:.26}50%{opacity:.45}}\n@keyframes dlcZsDrop{from{transform:scaleY(0);opacity:0}to{transform:none;opacity:.34}}\n@keyframes dlcZsSpin{to{transform:rotate(360deg)}}\n@keyframes dlcZsSeat{from{transform:translateY(-26px) scale(.6);opacity:0}to{transform:translateY(var(--y));opacity:1}}\n@keyframes dlcZsFall{from{transform:translate(18px,-16px);opacity:0;filter:blur(3px)}to{transform:none;opacity:1;filter:none}}\n@keyframes dlcZsStreak{from{transform:scaleY(0);transform-origin:top}to{transform:none}}\n@keyframes dlcZsBlink{50%{opacity:.3}}\n@keyframes dlcZsChain{from{transform:scaleY(0)}to{transform:none}}\n@keyframes dlcZsDescend{from{transform:translateY(-34px);opacity:0}to{transform:none;opacity:1}}\n@keyframes dlcZsLinks{to{background-position:0 7px}}\n@keyframes dlcZsSwing{from{--zs-a:-6deg}to{--zs-a:6deg}}\n@keyframes dlcZsSettle{from{--zs-a:0deg}}\n@keyframes dlcZsSand{to{stroke-dashoffset:-7}}\n@keyframes dlcZsBreathe{0%,100%{opacity:.48}50%{opacity:.72}}\n@keyframes dlcZsSlam{from{transform:scaleY(0);opacity:1;filter:brightness(2)}to{transform:none;opacity:.6;filter:none}}\n@keyframes dlcZsMote{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(150px);opacity:0}}\n@keyframes dlcZsRingIn{from{transform:translateY(-60px) scale(.5);opacity:0}70%{opacity:1}to{transform:none;opacity:1}}\n@keyframes dlcZsRingTone{0%{stroke:var(--c0)}45%{stroke:#FFFFFF;stroke-width:9}100%{stroke:var(--c1)}}\n@keyframes dlcZsGlow{0%,100%{opacity:.25}50%{opacity:.5}}\n@keyframes dlcZsSlot{from{transform:translate(0,-40px) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}\n@keyframes dlcZsCoin{0%{transform:translateY(0) rotate(20deg);opacity:0}10%{opacity:1}100%{transform:translateY(70px) rotate(380deg);opacity:0}}\n@keyframes dlcZsSpinRev{to{transform:rotate(-360deg)}}\n@keyframes dlcZsSoulFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3.5px)}}\n@keyframes dlcZsSoulAwake{0%{transform:translateY(14px) scale(.35);opacity:0;filter:brightness(2)}65%{opacity:1;filter:brightness(1.35)}100%{transform:none;opacity:1;filter:none}}\n@keyframes dlcZsWingL{0%{transform:rotate(28deg) scale(.42);opacity:0}100%{transform:none;opacity:1}}\n@keyframes dlcZsWingR{0%{transform:rotate(-28deg) scale(.42);opacity:0}100%{transform:none;opacity:1}}\n@keyframes dlcZsSoulRise{0%{transform:translateY(6px);opacity:0}22%{opacity:.95}100%{transform:translateY(-38px);opacity:0}}\n@keyframes dlcZsRoll{from{transform:translateY(calc(var(--a) * -1em))}}\n@keyframes dlcZsPop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}\n@keyframes dlcZsBolt{0%,100%{opacity:.9}6%{opacity:.2}8%{opacity:1}40%{opacity:.85}42%{opacity:.3}44%{opacity:.9}}\n@keyframes dlcZsJudge{from{transform:translateY(-12px);opacity:0}to{transform:none;opacity:1}}\n@keyframes dlcZsString{from{stroke-dashoffset:240}to{stroke-dashoffset:0}}\n@keyframes dlcZsFade{from{opacity:0}to{opacity:1}}\n@keyframes dlcZsFlow{to{stroke-dashoffset:-14}}\n@keyframes dlcZsRipple{0%{transform:scale(.85);opacity:.7}100%{transform:scale(1.15);opacity:.1}}\n@keyframes dlcZsLid{0%,92%,100%{transform:none}95%{transform:scaleY(.12)}}\n\n/* ───── apply：瞩目高时，最后一层正文上沿压下一层神光 ───── */\nhtml[data-dlc-gaze=\"1\"] ${P}{box-shadow:inset 0 1px 0 rgba(232,196,104,.5),inset 0 44px 40px -40px rgba(232,196,104,.3)}\nhtml[data-dlc-gaze=\"2\"] ${P}{box-shadow:inset 0 1px 0 rgba(255,240,194,.8),inset 0 70px 60px -54px rgba(232,196,104,.42)}\nhtml[data-dlc-gaze=\"2\"] ${P}[data-dlp-motion=full]{animation:dlcZsGaze 5s ease-in-out infinite}\n@keyframes dlcZsGaze{0%,100%{box-shadow:inset 0 1px 0 rgba(255,240,194,.8),inset 0 70px 60px -54px rgba(232,196,104,.42)}50%{box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset 0 90px 70px -60px rgba(232,196,104,.55)}}\n`;\n\n  return {\n    css,\n    tiers: { 瞩目: 瞩目档, 神眷: 神眷档 }, // 与 核心/诸神围观.js 的档位表逐字一致\n    blocks: {\n      神谕: { render: oracle },\n      神命: { render: decree },\n      神赏: { render: reward },\n      结局: { render: ending },\n    },\n    bar: {\n      tab: CORE,\n      when: U.mine,\n      page,\n      dock,\n      iconPath: 'M2 12Q12 2 22 12Q12 22 2 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',\n    },\n    apply,\n  };\n}\n\nreturn DLC_PAGE_诸神围观(CORE, INFO, DLC_SHARED(CORE, INFO));";
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
