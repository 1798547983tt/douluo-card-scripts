// 斗罗远程正文 floor.js 1.1.0
// 斗罗楼层：由 源码/build.py 生成，勿手改。正文外观取自 样稿/正文样稿.html，接线见 源码/楼层/。
const PROSE_CSS = "/* ═══════════════ 斗罗正文：幕签、转场、对白、名字、技能卡。全部挂在带 data-dlp-theme 的正文容器下，类名和 keyframes 都带 dlp- 前缀 ═══════════════ */\n[data-dlp-theme]{\n  container-type:inline-size;container-name:dlp;\n  --dlp-serif:\"Noto Serif SC\",\"Source Han Serif SC\",\"Songti SC\",\"STSong\",\"SimSun\",serif;\n  --dlp-sans:\"Noto Sans SC\",\"Source Han Sans SC\",\"PingFang SC\",\"Microsoft YaHei\",sans-serif;\n  --dlp-mono:\"JetBrains Mono\",\"Cascadia Mono\",\"Consolas\",monospace;\n  --dlp-on:#D9DDE1;--dlp-on2:#9AA5AE;--dlp-on-line:rgba(255,255,255,.24);\n}\n[data-dlp-theme][data-dlp-surface=\"light\"]{--dlp-on:#24262A;--dlp-on2:#5F656D;--dlp-on-line:rgba(0,0,0,.3)}\n[data-dlp-theme=\"shouzha\"]{\n  --dlp-bg:#F2EDE1;--dlp-bg2:#EBE4D3;--dlp-ink:#1E1C19;--dlp-ink2:#4C473D;--dlp-ink3:#6B6558;\n  --dlp-line:#B8AD95;--dlp-line2:#2B2924;--dlp-acc:#1F4E79;--dlp-acc-ink:#F4EFE3;--dlp-gold:#B88A1E;\n  --dlp-title:var(--dlp-serif);--dlp-num:inherit;--dlp-ring-edge:rgba(30,28,25,.5);\n}\n[data-dlp-theme=\"zhongduan\"]{\n  --dlp-bg:#14181B;--dlp-bg2:#1A2025;--dlp-ink:#D5DDE2;--dlp-ink2:#9BA9B3;--dlp-ink3:#7C8A94;\n  --dlp-line:#2F3C46;--dlp-line2:#4B5C68;--dlp-acc:#55C7DC;--dlp-acc-ink:#0C1114;--dlp-gold:#E8C25A;\n  --dlp-title:var(--dlp-sans);--dlp-num:var(--dlp-mono);--dlp-ring-edge:#8FA3B0;\n  --dlp-cut:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px));\n}\n[data-dlp-theme=\"senlin\"]{\n  --dlp-bg:#0F1A15;--dlp-bg2:#15231C;--dlp-ink:#E6E0CF;--dlp-ink2:#AAB09A;--dlp-ink3:#8A957F;\n  --dlp-line:#2B3D31;--dlp-line2:#4E6A4B;--dlp-acc:#6FE3C4;--dlp-acc-ink:#0A130F;--dlp-gold:#E8C25A;\n  --dlp-title:var(--dlp-serif);--dlp-num:inherit;--dlp-ring-edge:#9DB3A0;\n}\n[data-dlp-theme] .dlp{box-sizing:border-box;position:relative;margin:.85em 0;font-family:var(--dlp-sans);font-style:normal;text-align:left;letter-spacing:0;line-height:1.6;font-variant-numeric:tabular-nums}\n[data-dlp-theme] .dlp *,[data-dlp-theme] .dlp *::before,[data-dlp-theme] .dlp *::after{box-sizing:border-box}\n[data-dlp-theme] .dlp p{margin:0}\n[data-dlp-theme] .dlp strong,[data-dlp-theme] .dlp small,[data-dlp-theme] .dlp b,[data-dlp-theme] .dlp i{font-style:normal;text-decoration:none}\n[data-dlp-theme] .dlp:first-child{margin-top:0}\n.dlp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}\n\n/* ── 名字：8 个色号加主角色。d 用在深底，l 用在浅底。只有标记的字（两字三字的第 1 字，四字五字的第 1、3 字）上色，其余字跟周围文字一个颜色 ── */\n[data-dlp-tone=\"0\"]{--d:#7CC7D9;--l:#1D6A80}\n[data-dlp-tone=\"1\"]{--d:#BFCB6A;--l:#5E6A12}\n[data-dlp-tone=\"2\"]{--d:#E28A9A;--l:#A23A52}\n[data-dlp-tone=\"3\"]{--d:#7FCB96;--l:#2A6E45}\n[data-dlp-tone=\"4\"]{--d:#B39BE6;--l:#5C3F9E}\n[data-dlp-tone=\"5\"]{--d:#E5A070;--l:#9A4E1C}\n[data-dlp-tone=\"6\"]{--d:#86A9EA;--l:#2C4F9E}\n[data-dlp-tone=\"7\"]{--d:#A9B8B0;--l:#4C5F56}\n[data-dlp-tone=\"hero\"]{--d:#F0CE6A;--l:#7A4B00}\n/* 正文里的名字：不放大、不加粗，只给标记的字上色 */\n.dlp-name{color:inherit;font-style:normal;white-space:nowrap}\n.dlp-name b{font-weight:600;color:var(--d)}\n[data-dlp-surface=\"light\"] .dlp-name b{color:var(--l)}\n/* 气泡和卡片里的名字：跟主题的底色走 */\n[data-dlp-theme=\"shouzha\"] .dlp .dlp-name b{color:var(--l)}\n[data-dlp-theme=\"zhongduan\"] .dlp .dlp-name b,[data-dlp-theme=\"senlin\"] .dlp .dlp-name b{color:var(--d)}\n/* 头像旁的名字：整体放大，标记的字再大一号；它落在酒馆底色上，颜色跟底色深浅走 */\n[data-dlp-theme] .dlp-say > .dlp-col > .dlp-name{font:500 1.12em/1.3 var(--dlp-title);letter-spacing:.04em;color:var(--dlp-on)}\n[data-dlp-theme] .dlp-say > .dlp-col > .dlp-name b{font-size:1.32em;font-weight:700;color:var(--d)}\n[data-dlp-theme][data-dlp-surface=\"light\"] .dlp-say > .dlp-col > .dlp-name b{color:var(--l)}\n\n/* ── 幕签 ── */\n.dlp-story{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.2em .9em;padding:.65em .95em;background:var(--dlp-bg);color:var(--dlp-ink)}\n.dlp-st-mark{display:grid;place-items:center;color:var(--dlp-acc)}\n.dlp-st-mark .dlp-st-m{display:none}\n.dlp-st-mark svg.dlp-st-m{width:2.4em;height:2.4em}\n[data-dlp-theme=\"shouzha\"] .dlp-st-mark .dlp-st-m--seal,[data-dlp-theme=\"zhongduan\"] .dlp-st-mark .dlp-st-m--code,[data-dlp-theme=\"senlin\"] .dlp-st-mark .dlp-st-m--tree{display:block}\n.dlp-st-top{display:flex;flex-wrap:wrap;gap:0 .85em;font-size:.8em;color:var(--dlp-ink2)}\n.dlp-st-date{font-family:var(--dlp-num)}\n.dlp-st-title{display:block;font:700 1.22em/1.4 var(--dlp-title);letter-spacing:.09em;color:var(--dlp-ink);overflow-wrap:anywhere}\n.dlp-st-no{text-align:right;white-space:nowrap}\n.dlp-st-no b{display:block;font:600 .98em/1.4 var(--dlp-title);color:var(--dlp-ink)}\n.dlp-st-no small{display:block;font-size:.74em;color:var(--dlp-ink3);font-family:var(--dlp-num)}\n[data-dlp-theme=\"shouzha\"] .dlp-story{border-top:3px double var(--dlp-line2);border-bottom:3px double var(--dlp-line2)}\n[data-dlp-theme=\"shouzha\"] .dlp-st-mark{width:2.1em;height:2.1em;background:var(--dlp-acc);color:var(--dlp-acc-ink);font:700 1.15em/1 var(--dlp-serif);box-shadow:inset 0 0 0 2px var(--dlp-acc),inset 0 0 0 3px rgba(244,239,227,.7)}\n[data-dlp-theme=\"zhongduan\"] .dlp-story{background:var(--dlp-line2);clip-path:var(--dlp-cut);padding-left:1.1em}\n[data-dlp-theme=\"zhongduan\"] .dlp-story::before{content:\"\";position:absolute;inset:1px;z-index:0;clip-path:var(--dlp-cut);background:var(--dlp-bg) linear-gradient(rgba(85,199,220,.05) 1px,transparent 1px) 0 0/100% 4px}\n[data-dlp-theme=\"zhongduan\"] .dlp-story::after{content:\"\";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--dlp-acc)}\n[data-dlp-theme=\"zhongduan\"] .dlp-story > *{position:relative;z-index:1}\n[data-dlp-theme=\"zhongduan\"] .dlp-st-mark{font:600 .8em/1 var(--dlp-mono);letter-spacing:.08em;padding:.45em .5em;border:1px solid var(--dlp-acc)}\n[data-dlp-theme=\"zhongduan\"] .dlp-st-title{letter-spacing:.05em}\n[data-dlp-theme=\"senlin\"] .dlp-story{border:1px solid var(--dlp-line);border-radius:2px;box-shadow:0 0 22px -10px var(--dlp-acc);background:var(--dlp-bg) radial-gradient(circle at 1.9em 50%,rgba(111,227,196,.12),transparent 4.5em)}\n.dlp-story[data-known=\"false\"] .dlp-st-no small{display:none}\n\n/* ── 块标签的素框：登记它的叙事核心脚本没在工作时，块里的正文照常显示在这里 ── */\n.dlp-block{margin:1em 0;padding:.2em 0 .2em 1em;border-left:2px solid var(--dlp-on-line)}\n\n/* ── 转场：落在酒馆底色上，文字颜色跟着底色深浅走 ── */\n.dlp-scene{display:flex;align-items:center;gap:.85em;margin:1.15em 0;color:var(--dlp-on)}\n.dlp-sc-rule{flex:1 1 0;height:1px;background:var(--dlp-on-line)}\n.dlp-sc-tag{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:0 .7em;max-width:76%;text-align:center}\n.dlp-sc-tag b{font:600 .95em/1.5 var(--dlp-title)}\n.dlp-sc-tag small{font-size:.8em;color:var(--dlp-on2);font-family:var(--dlp-num)}\n[data-dlp-theme=\"shouzha\"] .dlp-sc-rule{height:3px;background:var(--dlp-on);opacity:.55;clip-path:polygon(0 45%,6% 10%,24% 30%,52% 0,81% 34%,100% 18%,97% 80%,70% 100%,38% 72%,9% 100%)}\n[data-dlp-theme=\"shouzha\"] .dlp-sc-tag b::before{content:\"〔\"}\n[data-dlp-theme=\"shouzha\"] .dlp-sc-tag b::after{content:\"〕\"}\n[data-dlp-theme=\"zhongduan\"] .dlp-sc-rule:first-child{background:linear-gradient(90deg,transparent,var(--dlp-acc))}\n[data-dlp-theme=\"zhongduan\"] .dlp-sc-rule:last-child{background:linear-gradient(90deg,var(--dlp-acc),transparent)}\n[data-dlp-theme=\"zhongduan\"] .dlp-sc-tag b::before{content:\"// \";font-family:var(--dlp-mono);opacity:.6}\n[data-dlp-theme=\"senlin\"] .dlp-sc-rule{position:relative}\n[data-dlp-theme=\"senlin\"] .dlp-sc-rule:first-child{background:linear-gradient(90deg,transparent,var(--dlp-on-line))}\n[data-dlp-theme=\"senlin\"] .dlp-sc-rule:last-child{background:linear-gradient(90deg,var(--dlp-on-line),transparent)}\n[data-dlp-theme=\"senlin\"] .dlp-sc-rule::after{content:\"\";position:absolute;top:-2px;width:5px;height:5px;border-radius:50%;background:var(--dlp-acc);box-shadow:0 0 8px 1px var(--dlp-acc)}\n[data-dlp-theme=\"senlin\"] .dlp-sc-rule:first-child::after{right:0}\n[data-dlp-theme=\"senlin\"] .dlp-sc-rule:last-child::after{left:0}\n\n/* ── 对白：圆头像（外圈是这个人最高魂环的颜色）、名字、气泡；主角在右边镜像排 ── */\n.dlp-say{display:flex;align-items:flex-start;gap:.75em;--dlp-face:64px;--dlp-tone:var(--d)}\n[data-dlp-theme=\"shouzha\"] .dlp-say{--dlp-tone:var(--l)}\n.dlp-say[data-side=\"me\"]{flex-direction:row-reverse}\n[data-dlp-theme] .dlp-say[data-cont]{margin-top:-.45em}\n.dlp-face,.dlp-gap{flex:none;width:var(--dlp-face)}\n.dlp-face{position:relative;display:grid;place-items:center;height:var(--dlp-face);border-radius:50%;background:var(--dlp-bg2);border:3px solid var(--dlp-rim,var(--dlp-line2));box-shadow:0 0 0 1px var(--dlp-ring-edge);overflow:hidden}\n.dlp-face img{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%}\n.dlp-face b{font:700 calc(var(--dlp-face) * .42)/1 var(--dlp-title);color:var(--dlp-tone)}\n[data-dlp-theme=\"senlin\"] .dlp-face{box-shadow:0 0 0 1px var(--dlp-ring-edge),0 0 14px -3px var(--dlp-rim,transparent)}\n.dlp-col{display:flex;flex-direction:column;align-items:flex-start;gap:.34em;min-width:0;max-width:min(34em,calc(100% - var(--dlp-face) - .75em))}\n.dlp-say[data-side=\"me\"] .dlp-col{align-items:flex-end}\n[data-dlp-theme] .dlp-bubble{position:relative;padding:.55em .9em;background:var(--dlp-bg);color:var(--dlp-ink);line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}\n[data-dlp-theme=\"shouzha\"] .dlp-bubble{border:1px solid var(--dlp-line2);box-shadow:inset 0 0 0 3px var(--dlp-bg),inset 0 0 0 4px var(--dlp-line);padding:.65em 1em}\n[data-dlp-theme=\"shouzha\"] .dlp-bubble::before{content:\"\";position:absolute;top:-1px;left:-1px;width:9px;height:9px;background:var(--dlp-tone)}\n[data-dlp-theme=\"shouzha\"] .dlp-say[data-side=\"me\"] .dlp-bubble::before{left:auto;right:-1px}\n[data-dlp-theme=\"zhongduan\"] .dlp-bubble{background:var(--dlp-line2);clip-path:var(--dlp-cut);padding-left:1.1em}\n[data-dlp-theme=\"zhongduan\"] .dlp-bubble::before{content:\"\";position:absolute;inset:1px;z-index:-1;clip-path:var(--dlp-cut);background:var(--dlp-bg) linear-gradient(rgba(85,199,220,.045) 1px,transparent 1px) 0 0/100% 4px}\n[data-dlp-theme=\"zhongduan\"] .dlp-bubble{z-index:0}\n[data-dlp-theme=\"zhongduan\"] .dlp-bubble::after{content:\"\";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--dlp-tone)}\n[data-dlp-theme=\"zhongduan\"] .dlp-say[data-side=\"me\"] .dlp-bubble{padding-left:.9em;padding-right:1.1em}\n[data-dlp-theme=\"zhongduan\"] .dlp-say[data-side=\"me\"] .dlp-bubble::after{left:auto;right:0}\n[data-dlp-theme=\"senlin\"] .dlp-bubble{background:var(--dlp-bg2);border:1px solid var(--dlp-line);border-radius:2px;box-shadow:0 8px 20px -14px var(--dlp-tone)}\n[data-dlp-theme=\"senlin\"] .dlp-bubble::before{content:\"\";position:absolute;top:-3px;left:12px;width:5px;height:5px;border-radius:50%;background:var(--dlp-tone);box-shadow:0 0 8px 1px var(--dlp-tone)}\n[data-dlp-theme=\"senlin\"] .dlp-say[data-side=\"me\"] .dlp-bubble::before{left:auto;right:12px}\n.dlp-caret{display:inline-block;width:.45em;height:1em;margin-left:.15em;vertical-align:-.12em;background:currentColor;opacity:.6;animation:dlp-blink 1s steps(2,jump-none) infinite}\n\n/* ── 技能卡 ── */\n.dlp-skill{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:.2em 1em;padding:.75em 1em;background:var(--dlp-bg);color:var(--dlp-ink);overflow:hidden;--dlp-rc:var(--dlp-line2);--dlp-rcv:var(--dlp-rc)}\n.dlp-skill[data-dark]{--dlp-rcv:var(--dlp-ring-edge)}\n.dlp-sk-em{width:5.4em;height:5.4em}\n.dlp-sk-em svg{display:block;width:100%;height:100%;overflow:visible}\n.dlp-sk-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 .6em;font-size:.82em;color:var(--dlp-ink2)}\n.dlp-sk-top .dlp-name{font-weight:600;color:var(--dlp-ink)}\n.dlp-sk-kind{margin-left:auto;padding:0 .6em;font-weight:600;color:var(--dlp-ink);border:1px solid var(--dlp-line2);white-space:nowrap}\n.dlp-sk-name{display:block;font:700 1.32em/1.35 var(--dlp-title);letter-spacing:.07em;color:var(--dlp-ink);overflow-wrap:anywhere}\n.dlp-sk-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0 .6em;font-size:.82em;color:var(--dlp-ink2)}\n.dlp-sk-dot{flex:none;width:.72em;height:.72em;border-radius:50%;background:var(--dlp-rc);box-shadow:0 0 0 1px var(--dlp-ring-edge)}\n.dlp-sk-meta b{font-weight:600;color:var(--dlp-ink)}\n.dlp-sk-loose{padding:0 .45em;font-size:.9em;color:var(--dlp-ink3);border:1px dashed var(--dlp-line2)}\n[data-dlp-theme] .dlp-sk-fx{margin-top:.3em;font-size:.9em;line-height:1.7;color:var(--dlp-ink2)}\n.dlp-sk-em text{font-family:var(--dlp-title);font-weight:700;fill:var(--dlp-ink);text-anchor:middle;dominant-baseline:central}\n.dlp-rg-c,.dlp-rg-e,.dlp-rg-g,.dlp-em-line{fill:none}\n.dlp-rg-e{stroke:var(--dlp-ring-edge);opacity:.55}\n.dlp-rg-g{stroke:var(--dlp-gold)}\n.dlp-rg{opacity:.42}\n.dlp-rg--on,.dlp-rg--all{opacity:1}\n.dlp-rg-halo{fill:none;stroke:var(--dlp-rcv);opacity:0}\n.dlp-em-fill{fill:var(--dlp-rcv);opacity:.14}\n.dlp-em-line{stroke:var(--dlp-rcv)}\n.dlp-em-ink{fill:var(--dlp-ink)}\n.dlp-rg,.dlp-rg-halo,.dlp-em-rip,.dlp-em-a,.dlp-em-b,.dlp-sk-em text{transform-box:fill-box;transform-origin:center}\n[data-dlp-theme=\"shouzha\"] .dlp-skill{border:1px solid var(--dlp-line2);box-shadow:inset 0 0 0 3px var(--dlp-bg),inset 0 0 0 4px var(--dlp-line);padding:.9em 1.1em}\n[data-dlp-theme=\"shouzha\"] .dlp-sk-name{border-bottom:2px solid var(--dlp-rcv);display:inline-block;padding-bottom:.05em}\n[data-dlp-theme=\"zhongduan\"] .dlp-skill{background:var(--dlp-line2);clip-path:var(--dlp-cut);padding-left:1.25em}\n[data-dlp-theme=\"zhongduan\"] .dlp-skill::before{content:\"\";position:absolute;inset:1px;z-index:0;clip-path:var(--dlp-cut);background:var(--dlp-bg) linear-gradient(rgba(85,199,220,.05) 1px,transparent 1px) 0 0/100% 4px}\n[data-dlp-theme=\"zhongduan\"] .dlp-skill::after{content:\"\";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--dlp-rcv)}\n[data-dlp-theme=\"zhongduan\"] .dlp-skill > *{position:relative;z-index:1}\n[data-dlp-theme=\"zhongduan\"] .dlp-sk-kind{border-color:var(--dlp-acc);color:var(--dlp-acc);font-family:var(--dlp-mono)}\n[data-dlp-theme=\"senlin\"] .dlp-skill{border:1px solid var(--dlp-line);border-radius:2px;box-shadow:0 0 26px -12px var(--dlp-rcv);background:var(--dlp-bg) radial-gradient(circle at 3.7em 50%,color-mix(in srgb,var(--dlp-rcv) 16%,transparent),transparent 6.5em)}\n[data-dlp-theme=\"senlin\"] .dlp-sk-kind{border-radius:2px;border-color:var(--dlp-line2)}\n\n/* ═══════════════ 六套新主题（跟状态栏同名同色）：海神、星穹走环柱的潮光与星野；琉璃、冰晶走魂卡的彩窗与冰棱；雷霆、六翼圣辉走锋势的斜切 ═══════════════ */\n[data-dlp-theme=\"hai\"]{\n  --dlp-bg:#082d38;--dlp-bg2:#0b3c48;--dlp-ink:#E4F4F1;--dlp-ink2:#A4C8C4;--dlp-ink3:#80A6A3;\n  --dlp-line:rgba(88,222,211,.24);--dlp-line2:#1F6A73;--dlp-acc:#58DED3;--dlp-acc-ink:#04212A;--dlp-gold:#F1CB6C;\n  --dlp-title:var(--dlp-serif);--dlp-num:inherit;--dlp-ring-edge:#9FD9D2;\n  --dlp-wave:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='5'%3E%3Cpath d='M0 3Q4 0 8 3T16 3' fill='none' stroke='%23000' stroke-width='1.3'/%3E%3C/svg%3E\");\n}\n[data-dlp-theme=\"xing\"]{\n  --dlp-bg:#080A14;--dlp-bg2:#0E1222;--dlp-ink:#EEF1FB;--dlp-ink2:#A9B2CA;--dlp-ink3:#7F88A2;\n  --dlp-line:rgba(164,234,255,.18);--dlp-line2:#2C3A5A;--dlp-acc:#A4EAFF;--dlp-acc-ink:#05060D;--dlp-gold:#FFD08F;\n  --dlp-title:var(--dlp-sans);--dlp-num:var(--dlp-sans);--dlp-ring-edge:#A2B6D2;\n  --dlp-star:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);\n}\n[data-dlp-theme=\"liu\"]{\n  --dlp-bg:#17121F;--dlp-bg2:#1F1929;--dlp-ink:#F1EAD9;--dlp-ink2:#B6AC92;--dlp-ink3:#8E866F;\n  --dlp-line:rgba(214,190,130,.26);--dlp-line2:#6B5A35;--dlp-acc:#E3B04B;--dlp-acc-ink:#1A1408;--dlp-gold:#E3B04B;\n  --dlp-title:var(--dlp-serif);--dlp-num:\"Constantia\",\"Palatino Linotype\",\"Book Antiqua\",Georgia,serif;--dlp-ring-edge:#C8B98E;\n  --dlp-glass:conic-gradient(from 210deg at 50% 62%,#8f2d74,#1f63ad,#1f8f5e,#c98a1e,#b0486a,#5b3aa6,#8f2d74);\n  --dlp-arch:polygon(0 100%,0 34%,14% 14%,50% 0,86% 14%,100% 34%,100% 100%);\n}\n[data-dlp-theme=\"bing\"]{\n  --dlp-bg:#F7FBFE;--dlp-bg2:#E4F1F9;--dlp-ink:#0F2C44;--dlp-ink2:#49677D;--dlp-ink3:#6A8599;\n  --dlp-line:rgba(26,92,134,.24);--dlp-line2:rgba(26,92,134,.5);--dlp-acc:#0F7EA8;--dlp-acc-ink:#FFFFFF;--dlp-gold:#B8862B;\n  --dlp-title:var(--dlp-sans);--dlp-num:var(--dlp-sans);--dlp-ring-edge:rgba(15,44,68,.45);\n  --dlp-cut:polygon(0 8px,8px 0,calc(100% - 16px) 0,100% 16px,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%);\n  --dlp-fill:linear-gradient(155deg,#ffffff 0 34%,#eef7fc 34% 61%,#f7fbfe 61% 78%,#e6f2f9 78%);\n  --dlp-aurora:linear-gradient(90deg,#46e6b4,#5abeff,#a06eff,#ff82c8);\n  --dlp-hex:polygon(50% 0,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%);\n}\n[data-dlp-theme=\"lei\"]{\n  --dlp-bg:#0E0C20;--dlp-bg2:#15122E;--dlp-ink:#EEF4FF;--dlp-ink2:#A8ADCD;--dlp-ink3:#7C81A5;\n  --dlp-line:rgba(170,192,255,.22);--dlp-line2:#3B3C78;--dlp-acc:#F4FF58;--dlp-acc-ink:#0A0912;--dlp-gold:#F4FF58;\n  --dlp-title:var(--dlp-sans);--dlp-num:\"Impact\",\"Haettenschweiler\",\"Bahnschrift\",\"Arial Narrow\",sans-serif;--dlp-ring-edge:#AAB8E8;\n  --dlp-cut:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);\n  --dlp-fill:linear-gradient(100deg,#15122e,#0e0c20 60%) ;\n  --dlp-hex:polygon(50% 0,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%);\n}\n[data-dlp-theme=\"sheng\"]{\n  --dlp-bg:#FFFDF4;--dlp-bg2:#F6ECD0;--dlp-ink:#2A2110;--dlp-ink2:#6C5E40;--dlp-ink3:#8C7C58;\n  --dlp-line:rgba(150,112,34,.32);--dlp-line2:#B8923A;--dlp-acc:#9A6F12;--dlp-acc-ink:#FFFDF4;--dlp-gold:#D3A640;\n  --dlp-title:var(--dlp-serif);--dlp-num:\"Constantia\",\"Palatino Linotype\",Georgia,serif;--dlp-ring-edge:rgba(42,33,16,.45);\n  --dlp-cut:polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%);\n  --dlp-fill:linear-gradient(180deg,#fffdf4,#fbf4df);\n  --dlp-hex:polygon(50% 0,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%);\n}\n/* 名字与气泡色：浅底主题（冰晶、圣辉）用深一号的色 */\n[data-dlp-theme=\"bing\"] .dlp-say,[data-dlp-theme=\"sheng\"] .dlp-say{--dlp-tone:var(--l)}\n[data-dlp-theme=\"bing\"] .dlp .dlp-name b,[data-dlp-theme=\"sheng\"] .dlp .dlp-name b{color:var(--l)}\n[data-dlp-theme=\"hai\"] .dlp .dlp-name b,[data-dlp-theme=\"xing\"] .dlp .dlp-name b,[data-dlp-theme=\"liu\"] .dlp .dlp-name b,[data-dlp-theme=\"lei\"] .dlp .dlp-name b{color:var(--d)}\n[data-dlp-theme=\"lei\"] .dlp-say > .dlp-col > .dlp-name,[data-dlp-theme=\"sheng\"] .dlp-say > .dlp-col > .dlp-name{font-style:italic}\n[data-dlp-theme=\"xing\"] .dlp-say > .dlp-col > .dlp-name{letter-spacing:.18em}\n/* 幕签角标：海神舷窗、星穹四芒星、琉璃尖拱彩窗、冰晶六角、雷霆斜块、圣辉金六角 */\n[data-dlp-theme=\"hai\"] .dlp-st-mark .dlp-st-m--seal,[data-dlp-theme=\"liu\"] .dlp-st-mark .dlp-st-m--seal,[data-dlp-theme=\"bing\"] .dlp-st-mark .dlp-st-m--seal,[data-dlp-theme=\"sheng\"] .dlp-st-mark .dlp-st-m--seal,[data-dlp-theme=\"xing\"] .dlp-st-mark .dlp-st-m--star,[data-dlp-theme=\"lei\"] .dlp-st-mark .dlp-st-m--code{display:block}\n[data-dlp-theme=\"hai\"] .dlp-st-mark .dlp-st-m--seal{display:grid;place-items:center;width:2.3em;height:2.3em;border-radius:50%;border:1.5px solid var(--dlp-gold);box-shadow:inset 0 0 0 3px var(--dlp-bg),inset 0 0 0 4px rgba(241,203,108,.45),0 0 14px -4px var(--dlp-acc);color:var(--dlp-gold);font:700 1.05em/1 var(--dlp-serif)}\n[data-dlp-theme=\"xing\"] .dlp-st-mark{color:var(--dlp-acc);filter:drop-shadow(0 0 6px rgba(164,234,255,.55))}\n[data-dlp-theme=\"liu\"] .dlp-st-mark .dlp-st-m--seal{display:grid;place-items:end center;width:2.2em;height:2.7em;padding-bottom:.3em;clip-path:var(--dlp-arch);background:radial-gradient(circle at 50% 70%,rgba(255,240,200,.35),transparent 60%),var(--dlp-glass);color:#FFF7E0;font:700 1.05em/1 var(--dlp-serif);text-shadow:0 0 3px #17121F,0 0 1px #17121F}\n[data-dlp-theme=\"bing\"] .dlp-st-mark .dlp-st-m--seal{display:grid;place-items:center;width:2.3em;height:2.55em;clip-path:var(--dlp-hex);background:linear-gradient(135deg,#1d5a86,#0f2c44 55%,#4a3aa0);color:#fff;font:500 1em/1 var(--dlp-sans)}\n[data-dlp-theme=\"lei\"] .dlp-st-mark .dlp-st-m--code{padding:.4em .9em .4em .7em;font:italic 700 .82em/1 var(--dlp-num);letter-spacing:.06em;color:var(--dlp-acc-ink);background:var(--dlp-acc);clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);box-shadow:0 0 18px -4px var(--dlp-acc)}\n[data-dlp-theme=\"sheng\"] .dlp-st-mark .dlp-st-m--seal{display:grid;place-items:center;width:2.3em;height:2.55em;clip-path:var(--dlp-hex);background:linear-gradient(150deg,#f6dc8a,#d3a640 50%,#9a6f12);color:#2A2110;font:700 1.05em/1 var(--dlp-serif)}\n\n/* ── 海神：潮光 ── */\n[data-dlp-theme=\"hai\"] .dlp-story{position:relative;background:radial-gradient(60% 140% at 12% 0,rgba(88,222,211,.16),transparent 70%),linear-gradient(180deg,#0b3c48,#072a35);box-shadow:inset 0 1px 0 rgba(88,222,211,.45);padding-bottom:.95em}\n[data-dlp-theme=\"hai\"] .dlp-story::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:5px;background:var(--dlp-gold);opacity:.7;-webkit-mask:var(--dlp-wave) 0 0/16px 5px repeat-x;mask:var(--dlp-wave) 0 0/16px 5px repeat-x}\n[data-dlp-theme=\"hai\"] .dlp-sc-rule{height:5px;background:var(--dlp-on-line);-webkit-mask:var(--dlp-wave) 0 0/16px 5px repeat-x;mask:var(--dlp-wave) 0 0/16px 5px repeat-x}\n[data-dlp-theme=\"hai\"] .dlp-face{border-color:var(--dlp-rim,var(--dlp-line2));box-shadow:0 0 0 1px var(--dlp-ring-edge),0 0 16px -4px var(--dlp-rim,var(--dlp-acc))}\n[data-dlp-theme=\"hai\"] .dlp-bubble{background:radial-gradient(80% 120% at 0 0,rgba(88,222,211,.12),transparent 60%),linear-gradient(180deg,#0c4250,#082e3a);border:1px solid var(--dlp-line);box-shadow:inset 3px 0 0 var(--dlp-tone)}\n[data-dlp-theme=\"hai\"] .dlp-say[data-side=\"me\"] .dlp-bubble{box-shadow:inset -3px 0 0 var(--dlp-tone)}\n[data-dlp-theme=\"hai\"] .dlp-skill{position:relative;border:1px solid var(--dlp-line);background:radial-gradient(circle at 3.7em 50%,color-mix(in srgb,var(--dlp-rcv) 20%,transparent),transparent 6.5em),linear-gradient(180deg,#0b3c48,#072a35);box-shadow:inset 0 1px 0 rgba(88,222,211,.4);padding-bottom:1em}\n[data-dlp-theme=\"hai\"] .dlp-skill::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:5px;background:var(--dlp-rcv);opacity:.75;-webkit-mask:var(--dlp-wave) 0 0/16px 5px repeat-x;mask:var(--dlp-wave) 0 0/16px 5px repeat-x}\n[data-dlp-theme=\"hai\"] .dlp-sk-kind{border-color:var(--dlp-gold);color:var(--dlp-gold)}\n\n/* ── 星穹：星野、角标、四芒星 ── */\n[data-dlp-theme=\"xing\"] .dlp-story,[data-dlp-theme=\"xing\"] .dlp-skill{position:relative;background:radial-gradient(70% 160% at 0 0,rgba(18,104,128,.32),transparent 60%),radial-gradient(60% 140% at 100% 100%,rgba(150,44,92,.26),transparent 60%),var(--dlp-bg)}\n[data-dlp-theme=\"xing\"] .dlp-story::before,[data-dlp-theme=\"xing\"] .dlp-story::after,[data-dlp-theme=\"xing\"] .dlp-skill::before,[data-dlp-theme=\"xing\"] .dlp-skill::after,[data-dlp-theme=\"xing\"] .dlp-bubble::before,[data-dlp-theme=\"xing\"] .dlp-bubble::after{content:\"\";position:absolute;width:10px;height:10px;pointer-events:none}\n[data-dlp-theme=\"xing\"] .dlp-story::before,[data-dlp-theme=\"xing\"] .dlp-skill::before,[data-dlp-theme=\"xing\"] .dlp-bubble::before{left:0;top:0;border-left:1px solid var(--dlp-acc);border-top:1px solid var(--dlp-acc)}\n[data-dlp-theme=\"xing\"] .dlp-story::after,[data-dlp-theme=\"xing\"] .dlp-skill::after,[data-dlp-theme=\"xing\"] .dlp-bubble::after{right:0;bottom:0;border-right:1px solid var(--dlp-acc);border-bottom:1px solid var(--dlp-acc)}\n[data-dlp-theme=\"xing\"] .dlp-skill::after{border-color:var(--dlp-rcv)}\n[data-dlp-theme=\"xing\"] .dlp-skill{background:radial-gradient(circle at 3.7em 50%,color-mix(in srgb,var(--dlp-rcv) 22%,transparent),transparent 6.5em),radial-gradient(60% 140% at 100% 100%,rgba(150,44,92,.22),transparent 60%),var(--dlp-bg)}\n[data-dlp-theme=\"xing\"] .dlp-st-title,[data-dlp-theme=\"xing\"] .dlp-sk-name{font-weight:300;letter-spacing:.2em}\n[data-dlp-theme=\"xing\"] .dlp-sk-kind{border:0;padding:0;color:var(--dlp-acc)}\n[data-dlp-theme=\"xing\"] .dlp-sk-kind::before{content:\"[ \";opacity:.6}\n[data-dlp-theme=\"xing\"] .dlp-sk-kind::after{content:\" ]\";opacity:.6}\n[data-dlp-theme=\"xing\"] .dlp-sc-rule{position:relative}\n[data-dlp-theme=\"xing\"] .dlp-sc-rule:first-child{background:linear-gradient(90deg,transparent,var(--dlp-on-line))}\n[data-dlp-theme=\"xing\"] .dlp-sc-rule:last-child{background:linear-gradient(90deg,var(--dlp-on-line),transparent)}\n[data-dlp-theme=\"xing\"] .dlp-sc-rule::after{content:\"\";position:absolute;top:-4px;width:9px;height:9px;background:var(--dlp-acc);clip-path:var(--dlp-star);filter:drop-shadow(0 0 4px var(--dlp-acc))}\n[data-dlp-theme=\"xing\"] .dlp-sc-rule:first-child::after{right:-2px}\n[data-dlp-theme=\"xing\"] .dlp-sc-rule:last-child::after{left:-2px}\n[data-dlp-theme=\"xing\"] .dlp-sc-tag b{font-weight:400;letter-spacing:.3em}\n[data-dlp-theme=\"xing\"] .dlp-face{border-width:1px;box-shadow:0 0 0 3px var(--dlp-bg),0 0 0 4px var(--dlp-rim,var(--dlp-line2)),0 0 18px -4px var(--dlp-rim,var(--dlp-acc))}\n[data-dlp-theme=\"xing\"] .dlp-bubble{position:relative;background:linear-gradient(180deg,#0e1222,#080a14);border:1px solid var(--dlp-line)}\n[data-dlp-theme=\"xing\"] .dlp-bubble::after{border-color:var(--dlp-tone)}\n\n/* ── 琉璃：彩窗、铅条、尖拱 ── */\n[data-dlp-theme=\"liu\"] .dlp-story,[data-dlp-theme=\"liu\"] .dlp-skill{background:radial-gradient(120% 160% at 100% 0,rgba(35,28,51,.9),transparent 70%),var(--dlp-bg);box-shadow:inset 0 0 0 1px var(--dlp-line2),inset 0 0 0 3px var(--dlp-bg),inset 0 0 0 4px rgba(227,176,75,.38)}\n[data-dlp-theme=\"liu\"] .dlp-story{padding:.75em 1.05em}\n[data-dlp-theme=\"liu\"] .dlp-st-title,[data-dlp-theme=\"liu\"] .dlp-sk-name{color:#F3D58A}\n[data-dlp-theme=\"liu\"] .dlp-skill{background:radial-gradient(circle at 3.7em 50%,color-mix(in srgb,var(--dlp-rcv) 24%,transparent),transparent 6.5em),var(--dlp-bg);padding:.9em 1.1em}\n[data-dlp-theme=\"liu\"] .dlp-sk-kind{border-color:var(--dlp-line2);color:var(--dlp-acc)}\n[data-dlp-theme=\"liu\"] .dlp-bubble{background:var(--dlp-bg2);box-shadow:inset 0 0 0 1px var(--dlp-line2),inset 0 0 0 3px var(--dlp-bg2),inset 0 0 0 4px rgba(227,176,75,.3);padding:.7em 1em}\n[data-dlp-theme=\"liu\"] .dlp-bubble::before{content:\"\";position:absolute;top:-5px;left:10px;width:12px;height:9px;background:var(--dlp-tone);clip-path:var(--dlp-arch);box-shadow:none}\n[data-dlp-theme=\"liu\"] .dlp-say[data-side=\"me\"] .dlp-bubble::before{left:auto;right:10px}\n[data-dlp-theme=\"liu\"] .dlp-face{border-color:var(--dlp-rim,var(--dlp-line2));box-shadow:0 0 0 2px var(--dlp-bg),0 0 0 3px rgba(227,176,75,.55)}\n[data-dlp-theme=\"liu\"] .dlp-sc-rule{position:relative;height:1px;background:linear-gradient(90deg,transparent,var(--dlp-acc),transparent)}\n[data-dlp-theme=\"liu\"] .dlp-sc-rule::after{content:\"\";position:absolute;top:-4px;width:9px;height:9px;background:var(--dlp-glass);transform:rotate(45deg);box-shadow:0 0 0 1px var(--dlp-acc)}\n[data-dlp-theme=\"liu\"] .dlp-sc-rule:first-child::after{right:0}\n[data-dlp-theme=\"liu\"] .dlp-sc-rule:last-child::after{left:0}\n\n/* ── 冰晶（浅底）：冰棱切角、极光边 ── */\n[data-dlp-theme=\"bing\"] .dlp-story,[data-dlp-theme=\"bing\"] .dlp-skill,[data-dlp-theme=\"lei\"] .dlp-story,[data-dlp-theme=\"lei\"] .dlp-skill,[data-dlp-theme=\"sheng\"] .dlp-story,[data-dlp-theme=\"sheng\"] .dlp-skill{position:relative;background:var(--dlp-line2);clip-path:var(--dlp-cut)}\n[data-dlp-theme=\"bing\"] .dlp-story::before,[data-dlp-theme=\"bing\"] .dlp-skill::before,[data-dlp-theme=\"lei\"] .dlp-story::before,[data-dlp-theme=\"lei\"] .dlp-skill::before,[data-dlp-theme=\"sheng\"] .dlp-story::before,[data-dlp-theme=\"sheng\"] .dlp-skill::before{content:\"\";position:absolute;inset:1px;z-index:0;clip-path:var(--dlp-cut);background:var(--dlp-fill)}\n[data-dlp-theme=\"bing\"] .dlp-story > :not(.dlp-sk-sweep),[data-dlp-theme=\"bing\"] .dlp-skill > :not(.dlp-sk-sweep),[data-dlp-theme=\"lei\"] .dlp-story > :not(.dlp-sk-sweep),[data-dlp-theme=\"lei\"] .dlp-skill > :not(.dlp-sk-sweep),[data-dlp-theme=\"sheng\"] .dlp-story > :not(.dlp-sk-sweep),[data-dlp-theme=\"sheng\"] .dlp-skill > :not(.dlp-sk-sweep){position:relative;z-index:1}\n[data-dlp-theme=\"bing\"] .dlp-story::after,[data-dlp-theme=\"bing\"] .dlp-skill::after{content:\"\";position:absolute;left:8px;right:16px;top:1px;height:3px;z-index:1;background:var(--dlp-aurora);filter:blur(.6px)}\n[data-dlp-theme=\"bing\"] .dlp-skill::before{background:radial-gradient(circle at 3.7em 50%,color-mix(in srgb,var(--dlp-rcv) 18%,transparent),transparent 6.5em),var(--dlp-fill)}\n[data-dlp-theme=\"bing\"] .dlp-st-title,[data-dlp-theme=\"bing\"] .dlp-sk-name{font-weight:500;letter-spacing:.14em}\n[data-dlp-theme=\"bing\"] .dlp-sk-kind{border-color:var(--dlp-acc);color:var(--dlp-acc)}\n[data-dlp-theme=\"bing\"] .dlp-bubble{z-index:0;background:var(--dlp-line2);clip-path:var(--dlp-cut);padding:.6em 1.25em .6em 1.05em}\n[data-dlp-theme=\"bing\"] .dlp-bubble::before{content:\"\";position:absolute;inset:1px;z-index:-1;clip-path:var(--dlp-cut);background:var(--dlp-fill)}\n[data-dlp-theme=\"bing\"] .dlp-bubble::after{content:\"\";position:absolute;left:0;top:8px;bottom:0;width:3px;background:var(--dlp-tone)}\n[data-dlp-theme=\"bing\"] .dlp-say[data-side=\"me\"] .dlp-bubble::after{left:auto;right:0;top:16px}\n[data-dlp-theme=\"bing\"] .dlp-face{border-color:var(--dlp-rim,#7fc4e6);box-shadow:0 0 0 1px var(--dlp-ring-edge),0 4px 12px -6px rgba(15,44,68,.5);background:#e4f1f9}\n[data-dlp-theme=\"bing\"] .dlp-sc-rule{position:relative;height:1px}\n[data-dlp-theme=\"bing\"] .dlp-sc-rule:first-child{background:linear-gradient(90deg,transparent,var(--dlp-on-line))}\n[data-dlp-theme=\"bing\"] .dlp-sc-rule:last-child{background:linear-gradient(90deg,var(--dlp-on-line),transparent)}\n[data-dlp-theme=\"bing\"] .dlp-sc-rule::after{content:\"\";position:absolute;top:-4px;width:8px;height:9px;clip-path:var(--dlp-hex);background:var(--dlp-aurora)}\n[data-dlp-theme=\"bing\"] .dlp-sc-rule:first-child::after{right:0}\n[data-dlp-theme=\"bing\"] .dlp-sc-rule:last-child::after{left:0}\n\n/* ── 雷霆：斜切、电光、斜纹 ── */\n[data-dlp-theme=\"lei\"] .dlp-story,[data-dlp-theme=\"lei\"] .dlp-skill{padding-left:1.4em;padding-right:1.5em}\n[data-dlp-theme=\"lei\"] .dlp-story::after,[data-dlp-theme=\"lei\"] .dlp-skill::after{content:\"\";position:absolute;left:4px;top:0;bottom:0;width:10px;z-index:1;background:var(--dlp-acc);clip-path:polygon(60% 0,100% 0,40% 100%,0 100%)}\n[data-dlp-theme=\"lei\"] .dlp-skill::after{background:var(--dlp-rcv)}\n[data-dlp-theme=\"lei\"] .dlp-skill::before{background:radial-gradient(circle at 3.9em 50%,color-mix(in srgb,var(--dlp-rcv) 22%,transparent),transparent 6.5em),repeating-linear-gradient(115deg,rgba(255,255,255,.028) 0 6px,transparent 6px 12px),var(--dlp-fill)}\n[data-dlp-theme=\"lei\"] .dlp-st-title,[data-dlp-theme=\"lei\"] .dlp-sk-name,[data-dlp-theme=\"lei\"] .dlp-st-no b{font-style:italic;letter-spacing:.06em}\n[data-dlp-theme=\"lei\"] .dlp-st-title{text-shadow:2px 0 0 rgba(143,233,255,.45),-1px 0 0 rgba(255,93,138,.4)}\n[data-dlp-theme=\"lei\"] .dlp-sk-kind{border:0;color:var(--dlp-acc-ink);background:var(--dlp-acc);clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%);padding:0 .9em;font-style:italic}\n[data-dlp-theme=\"lei\"] .dlp-bubble{z-index:0;background:var(--dlp-line2);clip-path:var(--dlp-cut);padding:.55em 1.5em .55em 1.35em}\n[data-dlp-theme=\"lei\"] .dlp-bubble::before{content:\"\";position:absolute;inset:1px;z-index:-1;clip-path:var(--dlp-cut);background:var(--dlp-fill)}\n[data-dlp-theme=\"lei\"] .dlp-bubble::after{content:\"\";position:absolute;left:3px;top:0;bottom:0;width:9px;background:var(--dlp-tone);clip-path:polygon(66% 0,100% 0,34% 100%,0 100%)}\n[data-dlp-theme=\"lei\"] .dlp-say[data-side=\"me\"] .dlp-bubble::after{left:auto;right:3px}\n[data-dlp-theme=\"lei\"] .dlp-face,[data-dlp-theme=\"sheng\"] .dlp-face{border:0;border-radius:0;padding:3px;background:var(--dlp-rim,var(--dlp-line2));clip-path:var(--dlp-hex);box-shadow:none}\n[data-dlp-theme=\"lei\"] .dlp-face::before,[data-dlp-theme=\"sheng\"] .dlp-face::before{content:\"\";position:absolute;inset:3px;clip-path:var(--dlp-hex);background:var(--dlp-bg2)}\n[data-dlp-theme=\"lei\"] .dlp-face img,[data-dlp-theme=\"sheng\"] .dlp-face img{position:relative;z-index:1;border-radius:0;clip-path:var(--dlp-hex)}\n[data-dlp-theme=\"lei\"] .dlp-face b,[data-dlp-theme=\"sheng\"] .dlp-face b{position:relative;z-index:1}\n[data-dlp-theme=\"lei\"] .dlp-sc-rule{height:6px;background:repeating-linear-gradient(115deg,var(--dlp-on-line) 0 3px,transparent 3px 8px)}\n[data-dlp-theme=\"lei\"] .dlp-sc-tag b{font-style:italic;letter-spacing:.12em}\n[data-dlp-theme=\"lei\"] .dlp-sc-tag b::before{content:\"⚡\";font-style:normal;margin-right:.3em;color:var(--dlp-acc)}\n\n/* ── 六翼圣辉（浅底）：金边、斜切、圣光 ── */\n[data-dlp-theme=\"sheng\"] .dlp-story,[data-dlp-theme=\"sheng\"] .dlp-skill{padding-right:1.6em;background:linear-gradient(120deg,#e6c873,#b8923a 50%,#f1dc9a)}\n[data-dlp-theme=\"sheng\"] .dlp-story::before{background:repeating-conic-gradient(from 0deg at 1.9em 50%,rgba(211,166,64,.09) 0 4deg,transparent 4deg 12deg),var(--dlp-fill)}\n[data-dlp-theme=\"sheng\"] .dlp-skill::before{background:radial-gradient(circle at 3.7em 50%,color-mix(in srgb,var(--dlp-rcv) 16%,transparent),transparent 6.5em),repeating-conic-gradient(from 0deg at 3.7em 50%,rgba(211,166,64,.08) 0 4deg,transparent 4deg 12deg),var(--dlp-fill)}\n[data-dlp-theme=\"sheng\"] .dlp-st-title,[data-dlp-theme=\"sheng\"] .dlp-sk-name{font-style:italic;color:#6B4A08;letter-spacing:.1em}\n[data-dlp-theme=\"sheng\"] .dlp-sk-kind{border-color:var(--dlp-line2);color:var(--dlp-acc);font-style:italic}\n[data-dlp-theme=\"sheng\"] .dlp-bubble{z-index:0;background:linear-gradient(120deg,#e6c873,#b8923a 50%,#f1dc9a);clip-path:var(--dlp-cut);padding:.55em 1.6em .55em 1.1em}\n[data-dlp-theme=\"sheng\"] .dlp-bubble::before{content:\"\";position:absolute;inset:1px;z-index:-1;clip-path:var(--dlp-cut);background:var(--dlp-fill)}\n[data-dlp-theme=\"sheng\"] .dlp-bubble::after{content:\"\";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--dlp-tone)}\n[data-dlp-theme=\"sheng\"] .dlp-say[data-side=\"me\"] .dlp-bubble{clip-path:polygon(12px 0,100% 0,100% 100%,0 100%);padding:.55em 1.1em .55em 1.6em}\n[data-dlp-theme=\"sheng\"] .dlp-say[data-side=\"me\"] .dlp-bubble::before{clip-path:polygon(12px 0,100% 0,100% 100%,0 100%)}\n[data-dlp-theme=\"sheng\"] .dlp-say[data-side=\"me\"] .dlp-bubble::after{left:auto;right:0}\n[data-dlp-theme=\"sheng\"] .dlp-sc-rule{height:1px;background:linear-gradient(90deg,transparent,#d3a640,transparent);position:relative}\n[data-dlp-theme=\"sheng\"] .dlp-sc-rule::after{content:\"\";position:absolute;top:-4px;width:9px;height:9px;background:#d3a640;transform:rotate(45deg)}\n[data-dlp-theme=\"sheng\"] .dlp-sc-rule:first-child::after{right:0}\n[data-dlp-theme=\"sheng\"] .dlp-sc-rule:last-child::after{left:0}\n[data-dlp-theme=\"sheng\"] .dlp-sc-tag b{font-style:italic;letter-spacing:.14em}\n\n/* 动画：只在这一层第一次出现时播一次（元素带 data-play），--dlp-t 是已经播过的时间，重画时接着播 */\n@keyframes dlp-blink{50%{opacity:0}}\n@keyframes dlp-in{from{opacity:0;transform:translateY(6px)}}\n@keyframes dlp-fade{from{opacity:0}}\n@keyframes dlp-draw{from{stroke-dashoffset:100}}\n@keyframes dlp-halo{0%{opacity:.75;transform:scale(.86)}100%{opacity:0;transform:scale(1.5)}}\n@keyframes dlp-pop{0%{opacity:0;transform:scale(.4)}70%{transform:scale(1.12)}}\n@keyframes dlp-grow{from{opacity:0;transform:scale(.25)}}\n@keyframes dlp-left{from{opacity:0;transform:translateX(-16px)}}\n@keyframes dlp-right{from{opacity:0;transform:translateX(16px)}}\n@keyframes dlp-sweep{0%{opacity:0;transform:translateX(-120%)}30%{opacity:.5}100%{opacity:0;transform:translateX(320%)}}\n@keyframes dlp-rb-hue{to{filter:hue-rotate(360deg)}}\n[data-dlp-motion=\"full\"] .dlp-rg--rb .dlp-rg-c{animation:dlp-rb-hue 6s linear infinite}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play]{animation:dlp-in .42s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--dlp-t,0s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-rg{animation:dlp-fade .5s ease-out both;animation-delay:calc(var(--dlp-t,0s) + .25s + var(--i,0) * .07s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-rg--on{animation:none}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-rg--on .dlp-rg-c{animation:dlp-draw .85s cubic-bezier(.3,.6,.2,1) both;animation-delay:calc(var(--dlp-t,0s) + .2s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-rg--on .dlp-rg-g{animation:dlp-fade .5s ease-out both;animation-delay:calc(var(--dlp-t,0s) + 1s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-rg--all{animation:dlp-grow .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--dlp-t,0s) + .15s + var(--i,0) * .08s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-rg-halo{animation:dlp-halo .9s ease-out both;animation-delay:calc(var(--dlp-t,0s) + .95s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-sk-em text{animation:dlp-pop .5s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--dlp-t,0s) + .75s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-em-rip{animation:dlp-grow .8s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--dlp-t,0s) + .15s + var(--i,0) * .16s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-em-a{animation:dlp-left .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--dlp-t,0s) + .2s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-em-b{animation:dlp-right .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--dlp-t,0s) + .2s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-sk-name,[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-sk-meta,[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-sk-fx{animation:dlp-fade .5s ease-out both;animation-delay:calc(var(--dlp-t,0s) + .45s)}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-sk-fx{animation-delay:calc(var(--dlp-t,0s) + .7s)}\n.dlp-sk-sweep{display:none}\n[data-dlp-motion=\"full\"] .dlp-skill[data-play] .dlp-sk-sweep{display:block;position:absolute;z-index:2;top:0;bottom:0;left:0;width:34%;pointer-events:none;background:linear-gradient(100deg,transparent,var(--dlp-rcv),transparent);opacity:0;animation:dlp-sweep 1s ease-out both;animation-delay:calc(var(--dlp-t,0s) + .55s)}\n[data-dlp-motion=\"reduced\"] .dlp-skill[data-play]{animation:dlp-fade .3s ease-out both}\n[data-dlp-motion=\"off\"] .dlp-caret,[data-dlp-motion=\"reduced\"] .dlp-caret{animation:none}\n@media (prefers-reduced-motion:reduce){[data-dlp-theme] .dlp-skill[data-play],[data-dlp-theme] .dlp-skill[data-play] *{animation:none !important}.dlp-caret{animation:none}}\n\n/* ═══════════════ 气运（设计决定 §24.3、§24.8；定稿见 样稿/气运金手指/正文标签.html）：<气运> 命牌与晋阶、化解、劫兆大块，死劫应验的 <结局>。\n * 固定风格、不随主题换色：自带深底，浅色聊天底上也一样。静止时就是终态，[data-play] 时从头播一次入场；循环动效只在“完整”档 ═══════════════ */\n@property --dlp-qa{syntax:'<angle>';inherits:false;initial-value:0deg}\n[data-dlp-theme] .dlp-qy{--qy-ease:cubic-bezier(.2,.7,.2,1);--qy-snap:cubic-bezier(.7,0,.2,1);color:#E8E4DA;font-family:var(--dlp-serif)}\n[data-dlp-theme] :is(.dlp-qy,.dlp-qy *)[data-tier=\"白\"]{--c1:#F4F1EA;--c2:#A9A291;--cg:rgba(244,241,234,.28)}\n[data-dlp-theme] :is(.dlp-qy,.dlp-qy *)[data-tier=\"黄\"]{--c1:#F2D46B;--c2:#C08A17;--cg:rgba(242,212,107,.36)}\n[data-dlp-theme] :is(.dlp-qy,.dlp-qy *)[data-tier=\"紫\"]{--c1:#C3A2F2;--c2:#4E2585;--cg:rgba(176,138,224,.44)}\n[data-dlp-theme] :is(.dlp-qy,.dlp-qy *)[data-tier=\"红\"]{--c1:#F0565E;--c2:#7A111B;--cg:rgba(224,71,79,.5)}\n[data-dlp-theme] :is(.dlp-qy,.dlp-qy *)[data-tier=\"金\"]{--c1:#F6D877;--c2:#B8891F;--cg:rgba(240,207,106,.55)}\n[data-dlp-theme] :is(.dlp-qy,.dlp-qy *)[data-tier=\"彩\"]{--c1:#FFE45C;--c2:#6C7BFF;--cg:rgba(255,228,92,.45)}\n[data-dlp-theme] :is(.dlp-qy,.dlp-qy *)[data-tier=\"厄\"]{--c1:#A49FB1;--c2:#0A090D;--cg:rgba(0,0,0,.9)}\n[data-dlp-theme] :is(.dlp-qy,.dlp-qy *)[data-tier=\"绝\"]{--c1:#E0263B;--c2:#060509;--cg:rgba(150,10,26,.6)}\n/* 单行命牌 */\n[data-dlp-theme] .dlp-qy-line{display:flex;align-items:baseline;gap:.7em;padding:.42em .9em .42em .8em;line-height:1.8;background:linear-gradient(90deg,color-mix(in srgb,var(--c1) 17%,#0c0c11),rgba(12,12,17,.92) 72%,rgba(12,12,17,.8));border-left:2px solid var(--c1);overflow:hidden}\n[data-dlp-theme] .dlp-qy-gl{flex:none;align-self:center;width:.6em;height:.6em;background:var(--c1);box-shadow:0 0 8px var(--c1);transform:rotate(45deg)}\n[data-dlp-theme] .dlp-qy-line b{flex:none;color:var(--c1);font-weight:700;letter-spacing:.14em;text-shadow:0 0 10px var(--cg)}\n[data-dlp-theme] .dlp-qy-line span{min-width:0;color:#d6d2c8}\n[data-dlp-theme] .dlp-qy-line[data-tier=\"彩\"]{border-image:linear-gradient(180deg,#FF5A5F,#FFE45C,#3FC1F0,#D96BFF) 1;background:linear-gradient(90deg,#221f14,#111020 45%,rgba(12,12,17,.85))}\n[data-dlp-theme] .dlp-qy-line[data-tier=\"彩\"] .dlp-qy-gl{background:conic-gradient(from var(--dlp-qa),#FF5A5F,#FFE45C,#3FC1F0,#D96BFF,#FF5A5F)}\n[data-dlp-theme] .dlp-qy-line[data-tier=\"彩\"] b{background:linear-gradient(90deg,#FFB341,#FFE45C,#7CF5C8,#9FB4FF,#D96BFF,#FFB341);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none}\n[data-dlp-theme] .dlp-qy-line[data-tier=\"金\"]::after{content:\"\";position:absolute;inset:0;background:linear-gradient(110deg,transparent 40%,rgba(255,241,184,.16) 50%,transparent 60%);background-size:260% 100%;background-position:130% 0;pointer-events:none}\n[data-dlp-theme] .dlp-qy-line[data-tier=\"厄\"]{background:linear-gradient(90deg,#0a080e,rgba(40,34,50,.92) 62%,rgba(20,18,26,.85))}\n[data-dlp-theme] .dlp-qy-line[data-tier=\"厄\"] b{color:#c9c2d6;text-shadow:none}\n[data-dlp-theme] .dlp-qy-line[data-tier=\"绝\"]{background:linear-gradient(90deg,#3c040c,rgba(20,4,8,.94) 62%,rgba(14,4,7,.86))}\n[data-dlp-theme] .dlp-qy-line[data-tier=\"绝\"] b{color:#FF5A6E}\n/* 大块共用 */\n[data-dlp-theme] .dlp-qy-blk{isolation:isolate;margin:1.2em 0;padding:1.1em 1.35em 1em;overflow:hidden}\n[data-dlp-theme] .dlp-qy-blk>header{display:flex;flex-wrap:wrap;align-items:center;gap:.4em .7em;margin-bottom:.5em}\n[data-dlp-theme] .dlp-qy-k{font:700 10.5px/1 var(--dlp-mono);letter-spacing:.34em}\n[data-dlp-theme] .dlp-qy-t{margin:.2em 0;font:900 1.7em/1.2 var(--dlp-serif);letter-spacing:.16em;color:#fff}\n[data-dlp-theme] .dlp-qy-eff{margin:0 0 .5em;font-size:.86em;line-height:1.7;color:#b8b3a8}\n[data-dlp-theme] .dlp-qy-body{color:#dcd8cf}\n[data-dlp-theme] .dlp-qy-body p{margin:.5em 0 0}\n[data-dlp-theme] .dlp-qy-body .dlp{margin:.6em 0}\n[data-dlp-theme] .dlp-qy-blk[data-writing] .dlp-qy-t::after{content:'▍';margin-left:.2em;letter-spacing:0;color:var(--c1)}\n/* 晋阶：光柱上涌，品阶片翻面 */\n[data-dlp-theme] .dlp-qy-up{border:1px solid color-mix(in srgb,var(--c1) 45%,transparent);background:radial-gradient(70% 120% at 50% 110%,color-mix(in srgb,var(--c1) 30%,transparent),transparent 70%),linear-gradient(180deg,#0d0c10,#08070b)}\n[data-dlp-theme] .dlp-qy-up .dlp-qy-k{color:var(--c1)}\n[data-dlp-theme] .dlp-qy-col{position:absolute;inset:0;z-index:-1;pointer-events:none}\n[data-dlp-theme] .dlp-qy-col s{position:absolute;left:var(--x);bottom:-10px;width:2px;height:26px;background:linear-gradient(0deg,transparent,var(--c1));opacity:0}\n[data-dlp-theme] .dlp-qy-tr{display:flex;align-items:center;gap:.6em}\n[data-dlp-theme] .dlp-qy-chip{padding:3px 9px;font:800 12px/1.4 var(--dlp-mono);letter-spacing:.14em;color:#0b0b10;background:var(--c1)}\n[data-dlp-theme] .dlp-qy-chip:first-child{opacity:.55;filter:grayscale(.4)}\n[data-dlp-theme] .dlp-qy-chip[data-tier=\"彩\"]{background:linear-gradient(90deg,#FF5A5F,#FFE45C,#3FC1F0,#D96BFF)}\n[data-dlp-theme] .dlp-qy-arr{position:relative;width:46px;height:2px;background:linear-gradient(90deg,transparent,var(--c1))}\n[data-dlp-theme] .dlp-qy-arr::after{content:\"\";position:absolute;right:-2px;top:-4px;border:5px solid transparent;border-left-color:var(--c1)}\n[data-dlp-theme] .dlp-qy-up .dlp-qy-t{text-shadow:0 0 22px var(--cg)}\n/* 化解 / 压制：锁链从中间断开（压制时只松开一截），黑底透出天光 */\n[data-dlp-theme] .dlp-qy-fix{border:1px solid #3b3644;background:linear-gradient(180deg,#0c0a10,#07060a)}\n[data-dlp-theme] .dlp-qy-fix::before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(60% 80% at 50% 0%,rgba(160,240,210,.22),transparent 70%)}\n[data-dlp-theme] .dlp-qy-fix .dlp-qy-k{color:#7BE0A6}\n[data-dlp-theme] .dlp-qy-fix[data-kind=\"press\"]::before{background:radial-gradient(60% 80% at 50% 0%,rgba(164,159,177,.16),transparent 70%)}\n[data-dlp-theme] .dlp-qy-fix[data-kind=\"press\"] .dlp-qy-k{color:#C9C2D6}\n[data-dlp-theme] .dlp-qy-fix .dlp-qy-t s{text-decoration-color:rgba(123,224,166,.8);text-decoration-thickness:2px;color:#b9b3c4}\n[data-dlp-theme] .dlp-qy-chain{display:block;width:min(320px,70%);height:auto;margin:0 0 .4em;overflow:visible}\n[data-dlp-theme] .dlp-qy-chain rect{fill:none;stroke:#8e88a0;stroke-width:2.2}\n[data-dlp-theme] .dlp-qy-chain g{transform-box:fill-box;transform-origin:center}\n[data-dlp-theme] .dlp-qy-fix[data-kind=\"free\"] .dlp-qy-chain .l{transform:translate(-40px,6px) rotate(-6deg);opacity:.16}\n[data-dlp-theme] .dlp-qy-fix[data-kind=\"free\"] .dlp-qy-chain .r{transform:translate(40px,-4px) rotate(5deg);opacity:.16}\n[data-dlp-theme] .dlp-qy-fix[data-kind=\"press\"] .dlp-qy-chain .r{transform:translate(14px,2px) rotate(3deg);opacity:.5}\n/* 劫兆：心跳、裂纹、红黑压上来 */\n[data-dlp-theme] .dlp-qy-omen{border:1px solid #5a0f19;background:radial-gradient(80% 100% at 50% 0%,rgba(224,38,59,.22),transparent 70%),linear-gradient(180deg,#120307,#060204)}\n[data-dlp-theme] .dlp-qy-omen::before{content:\"\";position:absolute;inset:0;z-index:-1;box-shadow:inset 0 0 60px rgba(224,38,59,.45);opacity:.6}\n[data-dlp-theme] .dlp-qy-omen[data-stage=\"2\"]::before{box-shadow:inset 0 0 90px rgba(224,38,59,.7)}\n[data-dlp-theme] .dlp-qy-omen .dlp-qy-k{color:#FF5A6E}\n[data-dlp-theme] .dlp-qy-st{display:inline-flex;gap:2px;margin-left:auto}\n[data-dlp-theme] .dlp-qy-st i{padding:2px 8px;font:700 10.5px/1.4 var(--dlp-serif);font-style:normal;letter-spacing:.2em;color:#6c5a5e;background:rgba(255,255,255,.04)}\n[data-dlp-theme] .dlp-qy-st i.on{color:#fff;background:#7a1322}\n[data-dlp-theme] .dlp-qy-st i.cur{background:#E0263B}\n[data-dlp-theme] .dlp-qy-omen .dlp-qy-t{position:relative;font-size:2.1em;letter-spacing:.4em;color:#FF4D63;text-shadow:0 0 20px rgba(224,38,59,.8)}\n[data-dlp-theme] .dlp-qy-omen[data-stage=\"2\"] .dlp-qy-t::before,[data-dlp-theme] .dlp-qy-omen[data-stage=\"2\"] .dlp-qy-t::after{content:attr(data-text);position:absolute;left:0;top:0;width:100%;overflow:hidden;opacity:0}\n[data-dlp-theme] .dlp-qy-omen[data-stage=\"2\"] .dlp-qy-t::before{color:#5FE3F0;clip-path:inset(0 0 60% 0)}\n[data-dlp-theme] .dlp-qy-omen[data-stage=\"2\"] .dlp-qy-t::after{color:#fff;clip-path:inset(55% 0 0 0)}\n[data-dlp-theme] .dlp-qy-crack{position:absolute;inset:0;z-index:-1;width:100%;height:100%}\n[data-dlp-theme] .dlp-qy-crack path{fill:none;stroke:rgba(255,90,110,.45);stroke-width:1.2;stroke-dasharray:600;vector-effect:non-scaling-stroke}\n[data-dlp-theme] .dlp-qy-who{margin:0;font:600 13px/1.6 var(--dlp-mono);color:#c07a84;letter-spacing:.1em}\n[data-dlp-theme] .dlp-qy-who b{font-size:18px;color:#FF5A6E}\n[data-dlp-theme] .dlp-qy-warn{margin:.5em 0 0;padding-left:.8em;border-left:2px solid #E0263B;font-style:italic;line-height:1.8;color:#FF8A98}\n[data-dlp-theme] .dlp-qy-omen .dlp-qy-body{color:#e2c9cd}\n[data-dlp-theme] .dlp-qy-hint{margin:.8em 0 0;padding:.5em .8em;font-size:.86em;line-height:1.6;color:#a8d8bc;background:rgba(123,224,166,.06);border:1px dashed rgba(123,224,166,.35)}\n/* 结局（气运版） */\n[data-dlp-theme] .dlp-qy-end{padding:1.6em 1.6em 1.2em;text-align:center;background:radial-gradient(80% 60% at 50% 0%,rgba(224,38,59,.18),transparent 70%),#050304;border:1px solid #3a0a12}\n[data-dlp-theme] .dlp-qy-endc{position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,transparent,#E0263B 20%,#fff 50%,#E0263B 80%,transparent);box-shadow:0 0 20px #E0263B}\n[data-dlp-theme] .dlp-qy-end>header{justify-content:center}\n[data-dlp-theme] .dlp-qy-end .dlp-qy-k{color:#E0263B;letter-spacing:.6em}\n[data-dlp-theme] .dlp-qy-end .dlp-qy-t{font-size:1.9em;letter-spacing:.3em;color:#F4E8EA}\n[data-dlp-theme] .dlp-qy-end .dlp-qy-t small{margin-left:.6em;font-size:.45em;letter-spacing:.3em;color:#E0263B}\n[data-dlp-theme] .dlp-qy-end dl{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 26px;margin:.6em 0 .4em}\n[data-dlp-theme] .dlp-qy-end dt{font:600 10px/1.6 var(--dlp-mono);letter-spacing:.3em;color:#8a5a62}\n[data-dlp-theme] .dlp-qy-end dd{margin:0;font-weight:700;line-height:1.5;color:#fff}\n[data-dlp-theme] .dlp-qy-end .dlp-qy-body{text-align:left;color:#cdbfc2}\n[data-dlp-theme] .dlp-qy-endf{margin:.9em 0 0;font:600 11px/1 var(--dlp-mono);letter-spacing:.3em;color:#6b4a50}\n/* 动效：循环只在“完整”档；入场跟技能卡一样只在新生成的那一层播一次（--dlp-t 是负的已播时长，重画时接着播） */\n@keyframes dlp-qy-hue{to{--dlp-qa:360deg}}\n@keyframes dlp-qy-flow{to{background-position:200% 0}}\n@keyframes dlp-qy-shine{0%{background-position:130% 0}55%,100%{background-position:-130% 0}}\n@keyframes dlp-qy-flick{0%,86%,100%{opacity:1}87%{opacity:.2}89%{opacity:1}91%{opacity:.4}}\n@keyframes dlp-qy-rise{0%{transform:translateY(0);opacity:0}20%{opacity:.9}100%{transform:translateY(-220px);opacity:0}}\n@keyframes dlp-qy-beat{0%,100%{opacity:.3}12%{opacity:1}24%{opacity:.45}36%{opacity:.85}}\n@keyframes dlp-qy-gl{0%,80%,100%{transform:none;opacity:0}82%{transform:translateX(-4px);opacity:.6}86%{transform:translateX(3px);opacity:.5}}\n@keyframes dlp-qy-flip{0%{transform:rotateX(90deg);filter:brightness(3)}100%{transform:none}}\n@keyframes dlp-qy-glow{0%{letter-spacing:.4em;opacity:0}100%{opacity:1}}\n@keyframes dlp-qy-snapL{0%{transform:none;opacity:1}30%{transform:translateX(-2px);opacity:1}}\n@keyframes dlp-qy-snapR{0%{transform:none;opacity:1}30%{transform:translateX(2px);opacity:1}}\n@keyframes dlp-qy-dawn{0%,40%{opacity:0}}\n@keyframes dlp-qy-crack{from{stroke-dashoffset:600}}\n@keyframes dlp-qy-end{0%,30%{filter:brightness(0)}34%{filter:brightness(2.5)}40%{filter:brightness(.4)}100%{filter:none}}\n@keyframes dlp-qy-sweep{from{clip-path:inset(0 100% 0 0)}}\n[data-dlp-motion=\"full\"] .dlp-qy-line[data-tier=\"彩\"] .dlp-qy-gl{animation:dlp-qy-hue 3s linear infinite}\n[data-dlp-motion=\"full\"] .dlp-qy-line[data-tier=\"彩\"] b{animation:dlp-qy-flow 4s linear infinite}\n[data-dlp-motion=\"full\"] .dlp-qy-line[data-tier=\"金\"]::after{animation:dlp-qy-shine 4.4s var(--qy-ease) infinite}\n[data-dlp-motion=\"full\"] .dlp-qy-line[data-tier=\"绝\"] b{animation:dlp-qy-flick 3.4s steps(1) infinite}\n[data-dlp-motion=\"full\"] .dlp-qy-line[data-play]{animation:dlp-qy-sweep .7s var(--qy-ease) both;animation-delay:var(--dlp-t,0s)}\n[data-dlp-motion=\"full\"] .dlp-qy-col s{animation:dlp-qy-rise 2.6s var(--d) linear infinite}\n[data-dlp-motion=\"full\"] .dlp-qy-up[data-play] .dlp-qy-chip.to{animation:dlp-qy-flip .9s var(--qy-snap) both;animation-delay:calc(var(--dlp-t,0s) + .3s)}\n[data-dlp-motion=\"full\"] .dlp-qy-up[data-play] .dlp-qy-t{animation:dlp-qy-glow 1.4s ease-out both;animation-delay:calc(var(--dlp-t,0s) + .6s)}\n[data-dlp-motion=\"full\"] .dlp-qy-fix[data-play] .dlp-qy-chain .l{animation:dlp-qy-snapL 1.2s var(--qy-snap) both;animation-delay:calc(var(--dlp-t,0s) + .3s)}\n[data-dlp-motion=\"full\"] .dlp-qy-fix[data-play] .dlp-qy-chain .r{animation:dlp-qy-snapR 1.2s var(--qy-snap) both;animation-delay:calc(var(--dlp-t,0s) + .3s)}\n[data-dlp-motion=\"full\"] .dlp-qy-fix[data-play]::before{animation:dlp-qy-dawn 2.4s ease-out both;animation-delay:var(--dlp-t,0s)}\n[data-dlp-motion=\"full\"] .dlp-qy-omen::before{animation:dlp-qy-beat 1.8s ease-in-out infinite}\n[data-dlp-motion=\"full\"] .dlp-qy-omen[data-stage=\"2\"]::before{animation-duration:.85s}\n[data-dlp-motion=\"full\"] .dlp-qy-omen[data-stage=\"2\"] .dlp-qy-t::before{animation:dlp-qy-gl 2.6s steps(1) infinite}\n[data-dlp-motion=\"full\"] .dlp-qy-omen[data-stage=\"2\"] .dlp-qy-t::after{animation:dlp-qy-gl 2.2s steps(1) infinite reverse}\n[data-dlp-motion=\"full\"] .dlp-qy-omen[data-play] .dlp-qy-crack path{animation:dlp-qy-crack 1.2s var(--qy-snap) both;animation-delay:calc(var(--dlp-t,0s) + .2s)}\n[data-dlp-motion=\"full\"] .dlp-qy-end[data-play]{animation:dlp-qy-end 1.6s ease-out both;animation-delay:var(--dlp-t,0s)}\n[data-dlp-motion=\"reduced\"] .dlp-qy[data-play]{animation:dlp-fade .3s ease-out both}\n@media (prefers-reduced-motion:reduce){[data-dlp-theme] .dlp-qy,[data-dlp-theme] .dlp-qy *,[data-dlp-theme] .dlp-qy::before,[data-dlp-theme] .dlp-qy::after,[data-dlp-theme] .dlp-qy *::before,[data-dlp-theme] .dlp-qy *::after{animation:none !important}}\n@container dlp (max-width:520px){\n  .dlp-qy-blk{padding:.9em .9em .8em}\n  .dlp-qy-t{font-size:1.4em}\n  .dlp-qy-omen .dlp-qy-t{font-size:1.6em;letter-spacing:.3em}\n  .dlp-qy-st i{padding:2px 5px}\n  .dlp-qy-end{padding:1.2em 1em 1em}\n}\n\n/* 窄屏（手机）：头像 56，幕签把幕号挪到下面，技能卡的徽记缩小 */\n@container dlp (max-width:520px){\n  .dlp-say{--dlp-face:56px;gap:.6em}\n  .dlp-story{grid-template-columns:auto minmax(0,1fr);padding:.6em .8em}\n  .dlp-st-no{grid-column:2;text-align:left;display:flex;gap:.6em;align-items:baseline}\n  .dlp-skill{gap:.2em .75em;padding:.65em .8em}\n  .dlp-sk-em{width:4.2em;height:4.2em}\n  .dlp-sc-tag{max-width:84%}\n}";
const PROSE_CODE = "// 斗罗魂环色板：魂环颜色（变量里的 魂环颜色）→ 实际画出来的颜色。ZOD、状态栏、正文、小手机共用这一份。\n// 规则：\n//   1 变量里写了 魂环颜色 就按它画；没写（null）按年限：十年白、百年黄、千年紫、万年黑、十万年红（金纹）、百万年金。\n//   2 按年限画时，带内越往上颜色越深；越接近下一档，越透出下一档的颜色（九万九千年＝黑里发红）。\n//   3 颜色是开放的：先查命名色（含别名），查不到就按字拆（“暗紫金”＝暗紫＋金），也认 #RRGGBB 和 #A>#B 渐变；\n//      实在认不出就按名字算一个固定颜色，同一个名字永远是同一种色。\n// 没有任何依赖；构建时原样拼进各脚本，样稿页直接 <script src> 引它。\n// eslint-disable-next-line no-unused-vars\nfunction createRingPalette() {\n  'use strict';\n  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));\n  const hex2rgb = (x) => { const n = parseInt(String(x).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };\n  const rgb2hex = (a) => '#' + a.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();\n  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };\n  const lighten = (c, t) => mix(c, '#FFFFFF', t);\n  const darken = (c, t) => mix(c, '#000000', t);\n  function luminance(x) {\n    const [r, g, b] = hex2rgb(x).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });\n    return 0.2126 * r + 0.7152 * g + 0.0722 * b;\n  }\n  function hsl(h, s, l) {\n    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;\n    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);\n    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));\n    return rgb2hex([f(0) * 255, f(8) * 255, f(4) * 255]);\n  }\n  const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };\n\n  // 年限色带：[名, 下限, 带内最浅, 带内最深]\n  const BANDS = [['白', 10, '#F4F1EA', '#CFC8B8'], ['黄', 100, '#F2D46B', '#C08A17'], ['紫', 1000, '#B08AE0', '#4E2585'], ['黑', 1e4, '#45434B', '#0D0C10'], ['红', 1e5, '#C8323A', '#6E0F16'], ['金', 1e6, '#F0CF6A', '#B8891F']];\n  const BAND_NAMES = BANDS.map((b) => b[0]);\n  const bandIndex = (y) => { let i = 0; while (i < BANDS.length - 1 && y >= BANDS[i + 1][1]) i += 1; return i; };\n  const bandOf = (y) => BANDS[bandIndex(y)][0];\n\n  // 命名色：s 色组（第一个是主色）；gold 金纹道数；rainbow 彩色流转；shimmer 神光；note 谁用（写进提示词）\n  const NAMED = {\n    彩色: { s: ['#FF5A5F', '#FFB341', '#FFE45C', '#5FD88A', '#3FC1F0', '#6C7BFF', '#D96BFF'], rainbow: true, note: '龙神（五彩斑斓、流转）' },\n    淡金: { s: ['#F3E7BE', '#D9DEE6', '#EAD9A0'], note: '银龙王（淡金带银）' },\n    红金: { s: ['#C21F2E', '#E8B04A'], gold: 3, note: '修罗神' },\n    蓝金: { s: ['#2B74C9', '#E8C25A'], gold: 3, note: '海神' },\n    紫金: { s: ['#6A34A8', '#E2B84E'], gold: 3, note: '罗刹神' },\n    绿: { s: ['#5ACB75', '#2C9A55'], note: '生命魂环' },\n    玫瑰金: { s: ['#E8A090', '#C97668', '#F0C98A'], note: '三眼金猊' },\n    灰: { s: ['#A3A6AC', '#5E6168'], note: '伊莱克斯（死灵）' },\n    冰蓝: { s: ['#C4EEFF', '#5BB4E5'], note: '冰属性' },\n    绿金: { s: ['#5E9E3A', '#E2C35A'], gold: 3, note: '' },\n    蓝银: { s: ['#3576C8', '#D3DDE8'], note: '蓝银皇' },\n    金银: { s: ['#E8C25A', '#DCE1E8'], note: '金银双龙' },\n    冰火: { s: ['#7FD3FF', '#FF6A3D'], note: '冰火两仪' },\n    琉璃: { s: ['#A6EBFF', '#E9B8FF', '#FFE5A6', '#B8FFD9'], note: '七宝琉璃' },\n    极光: { s: ['#3BF0C0', '#47A6FF', '#9A6BFF'], note: '' },\n    星空: { s: ['#232870', '#6A5CE0', '#D6D8FF'], note: '' },\n    神金: { s: ['#FFF3C8', '#E8C25A', '#FFF3C8'], shimmer: true, note: '神级魂环' },\n    橙金: { s: ['#F0A030', '#E8C25A'], note: '凶兽魂环' },\n    白金: { s: ['#FAF6EA', '#E6CF8C'], note: '' },\n    黑金: { s: ['#1A171D', '#D4AB4C'], gold: 3, note: '' },\n    黑红: { s: ['#141116', '#A3121F'], note: '' },\n    暗金: { s: ['#A9852F', '#6E5418'], note: '' },\n    暗赤金: { s: ['#7A2A1C', '#C9953E'], gold: 3, note: '' },\n    银: { s: ['#E6EAEF', '#A9B1BC'], note: '' },\n    血红: { s: ['#A3101F', '#5C0710'], note: '' },\n    青: { s: ['#3CC4B3', '#1C7F75'], note: '' },\n    碧: { s: ['#4FCB9F', '#1F8F78'], note: '' },\n    粉: { s: ['#F9BCD5', '#E07AA6'], note: '' },\n    蓝: { s: ['#4A8BE0', '#2456A6'], note: '' },\n    橙: { s: ['#F7A445', '#D06A16'], note: '' },\n    紫红: { s: ['#9A2E86', '#D84A72'], note: '' },\n    幽蓝: { s: ['#21407F', '#5584E0'], note: '' },\n    雷紫: { s: ['#7C5CFF', '#CBBDFF'], note: '' },\n    墨: { s: ['#1D1C22', '#3E3C47'], note: '' },\n  };\n  // 别名 → 命名色或年限色\n  const ALIAS = {\n    龙神: '彩色', 七彩: '彩色', 五彩: '彩色', 彩虹: '彩色', 五彩斑斓: '彩色', 斑斓: '彩色', 炫彩: '彩色', 幻彩: '彩色', 虹: '彩色', 彩: '彩色',\n    银龙王: '淡金', 浅金: '淡金', 修罗: '红金', 修罗神: '红金', 金红: '红金', 海神: '蓝金', 金蓝: '蓝金', 罗刹: '紫金', 罗刹神: '紫金', 金紫: '紫金',\n    生命: '绿', 生命魂环: '绿', 三眼金猊: '玫瑰金', 伊莱克斯: '灰', 死灵: '灰', 死灵圣法神: '灰', 蓝银皇: '蓝银', 金绿: '绿金', 冰: '冰蓝',\n    七宝琉璃: '琉璃', 冰火两仪: '冰火', 金龙王: '金', 金银龙: '金银', 神级: '神金', 凶兽: '橙金', 红黑: '黑红', 赤金: '红金',\n    十年: '白', 百年: '黄', 千年: '紫', 万年: '黑', 十万年: '红', 百万年: '金',\n  };\n  const NULLISH = /^(无|没有|暂无|默认|按年限|年限色|正常|普通|null|undefined|none|—|-)?$/iu;\n  // 按字拆用的单色字（长的先认）；修饰字：淡浅亮明嫩 变浅，深暗沉浓重 变深\n  const TOKENS = Object.entries({\n    玫瑰: '#D9677F', 天青: '#7FC4C8', 琥珀: '#D9902A', 翡翠: '#2FA36B', 珊瑚: '#F07B6B', 胭脂: '#C2335A', 天蓝: '#6FB7F2', 海蓝: '#2A6FBF', 湖蓝: '#2F8FB8', 宝蓝: '#2747B8',\n    藏青: '#1F2E5A', 月白: '#E6EEF7', 象牙: '#F3EBD6', 薄荷: '#8FE3C0', 柠檬: '#F2E35A', 橄榄: '#7D8A2E', 酒红: '#7A1730', 樱: '#F5A3B8', 桃: '#F59AA0',\n    金: '#E8C25A', 银: '#CDD3DB', 红: '#C8323A', 赤: '#D93A2B', 朱: '#D4452E', 丹: '#D23A2A', 橙: '#F08A30', 黄: '#F2D46B', 绿: '#4FB05E', 翠: '#2FAF6A',\n    碧: '#2E9E86', 青: '#2FAFA0', 蓝: '#3F7FD9', 靛: '#3B3F9E', 紫: '#8A5BC4', 粉: '#F29CC0', 黑: '#1A191E', 墨: '#17161B', 玄: '#1C1A24', 白: '#F4F1EA',\n    雪: '#F7FBFF', 灰: '#8A8D93', 褐: '#8A5A3A', 棕: '#8A5A3A', 冰: '#A8E0F5', 霜: '#DCEFF7', 火: '#F26A2E', 炎: '#F2552E', 焰: '#FF7A30', 血: '#9E1020',\n    雷: '#9C8CFF', 电: '#B5A8FF', 光: '#FFF2B8', 星: '#7C7FE6', 月: '#E9E6D6', 日: '#F7B733', 夜: '#1E2140',\n  }).sort((a, b) => b[0].length - a[0].length);\n  const LIGHT_MOD = '淡浅亮明嫩', DARK_MOD = '深暗沉浓重';\n\n  // 写法归一：去空白、去“魂环”、去结尾的“色”，别名换成正名；空、“无”“默认”“按年限”返回 null\n  function normalize(v) {\n    if (v == null) return null;\n    let s = String(v).replace(/\\s+/gu, '');\n    if (NULLISH.test(s)) return null;\n    s = s.replace(/^魂环/u, '').replace(/魂环$/u, '');\n    const known = (x) => (NAMED[x] || BAND_NAMES.includes(x) ? x : ALIAS[x] || null);\n    if (known(s)) return known(s);\n    if (s.length > 1 && s.endsWith('色')) { const t = s.slice(0, -1); if (known(t)) return known(t); if (!/#/u.test(t)) s = t; }\n    return s || null;\n  }\n  function parse(name) {\n    const hex = String(name).match(/#(?:[0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-f])/giu);\n    if (hex) return { s: hex.slice(0, 7).map((h) => (h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h).toUpperCase()) };\n    if (/彩|虹|斑斓/u.test(name)) return { s: NAMED.彩色.s, rainbow: true };\n    const out = [];\n    let mod = 0;\n    for (let i = 0; i < name.length;) {\n      const ch = name[i];\n      if (LIGHT_MOD.includes(ch)) { mod = 1; i += 1; continue; }\n      if (DARK_MOD.includes(ch)) { mod = -1; i += 1; continue; }\n      const hit = TOKENS.find(([t]) => name.startsWith(t, i));\n      if (!hit) { i += 1; continue; }\n      out.push(mod > 0 ? lighten(hit[1], 0.38) : mod < 0 ? darken(hit[1], 0.38) : hit[1]);\n      mod = 0; i += hit[0].length;\n    }\n    if (out.length) return { s: out.slice(0, 7), gold: out.length > 1 && /金/u.test(name) ? 3 : 0 };\n    const h = hash(name) % 360;\n    return { s: [hsl(h, 62, 60), hsl(h + 38, 58, 40)] };\n  }\n\n  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);\n  // 一个魂环的完整外观\n  //   name 显示名；custom 是否来自变量里的魂环颜色；main 主色；stops 色组（≥1，按环一圈排）；second 第二色；\n  //   glow 光晕色（按年限时就是下一档的颜色）；hint 0–1，透出下一档的程度；gold 金纹道数；rainbow 彩色流转；shimmer 神光；dark/light 主色很深/很浅\n  function look(r) {\n    const ring = r || {};\n    const y = num(ring.年限);\n    const want = normalize(ring.魂环颜色 != null ? ring.魂环颜色 : ring.特殊色);\n    const band = y != null ? bandOf(Math.max(y, 10)) : null;\n    let o;\n    if (want && want !== band) {\n      const spec = NAMED[want] || (BAND_NAMES.includes(want) ? bandSpec(want) : parse(want));\n      const s = spec.s.slice();\n      let gold = spec.gold || 0;\n      if (gold && y != null && y >= 1e5) gold = Math.max(gold, Math.min(9, Math.floor(y / 1e5)));\n      o = { name: want, custom: true, main: s[0], stops: s, second: s[1] || s[0], glow: spec.glow || s[0], hint: 0, gold, rainbow: !!spec.rainbow, shimmer: !!spec.shimmer || !!ring.神级 };\n    } else if (!want && ring.神级) {\n      const s = NAMED.神金.s;\n      o = { name: '神级', custom: false, main: '#F3E2A6', stops: s, second: s[1], glow: '#FFE9A8', hint: 0, gold: 0, rainbow: false, shimmer: true };\n    } else if (!want && ring.凶兽) {\n      const c = mix('#F0A030', '#C8781A', y ? clamp(Math.log10(y) - 5, 0, 1) : 0.5);\n      o = { name: '橙金', custom: false, main: c, stops: [c, '#E8C25A'], second: '#E8C25A', glow: c, hint: 0, gold: 0, rainbow: false, shimmer: false };\n    } else {\n      o = yearLook(y);\n      if (o.name === '红') o.gold = num(ring.金纹) != null ? ring.金纹 : Math.floor((y || 0) / 1e5);\n    }\n    const L = luminance(o.main);\n    o.dark = L < 0.06; o.light = L > 0.7;\n    return o;\n  }\n  function bandSpec(name) {\n    const b = BANDS[BAND_NAMES.indexOf(name)];\n    return { s: [mix(b[2], b[3], 0.35)] };\n  }\n  function yearLook(y0) {\n    const y = Math.max(y0 == null ? 10 : y0, 10);\n    const i = bandIndex(y), [name, lo, light, deep] = BANDS[i];\n    const main = mix(light, deep, clamp(Math.log10(y / lo), 0, 1));\n    const o = { name, custom: false, main, stops: [main], second: main, glow: main, hint: 0, gold: 0, rainbow: false, shimmer: false };\n    if (i < BANDS.length - 1 && y0 != null) {\n      const k = Math.pow(clamp((y - lo) / (lo * 9), 0, 1), 1.6);\n      const next = BANDS[i + 1], nc = mix(next[2], next[3], 0.25);\n      if (k > 0.04) {\n        o.hint = k;\n        o.second = mix(main, nc, 0.15 + 0.7 * k);\n        o.glow = mix(main, nc, Math.min(1, 0.3 + k));\n        o.stops = [main, o.second];\n      }\n    }\n    return o;\n  }\n  // 名字的颜色（不看年限），给设置页、提示词色卡用\n  const swatch = (name) => look({ 魂环颜色: name, 年限: null });\n\n  // CSS 片段：linear 色带、conic 一圈、border4 四边（圆形边框上四段）\n  function linear(o, deg = 135) { const s = o.stops.length > 1 ? o.stops : [o.main, o.main]; return `linear-gradient(${deg}deg,${s.join(',')})`; }\n  function conic(o) { const s = o.stops.length > 1 ? o.stops : [o.main, o.main]; return `conic-gradient(from 0deg,${[...s, s[0]].join(',')})`; }\n  function border4(o) { const s = o.stops, n = s.length; return [0, 1, 2, 3].map((i) => (n === 2 ? s[i % 2] : s[Math.floor((i * n) / 4) % n])).join(' '); }\n  // SVG 渐变的停点：[[位置 0–1, 颜色]…]，首尾同色好让环上接缝不明显\n  function svgStops(o) {\n    const s = o.stops.length > 1 ? [...o.stops, o.stops[0]] : [o.main, o.main];\n    return s.map((c, i) => [i / (s.length - 1), c]);\n  }\n  const key = (o) => 'r' + hash(o.stops.join('') + (o.rainbow ? '~' : '')).toString(36);\n  const list = () => Object.entries(NAMED).map(([n, v]) => ({ name: n, note: v.note || '', stops: v.s.slice(), gold: v.gold || 0, rainbow: !!v.rainbow }));\n  const aliases = () => Object.assign({}, ALIAS);\n\n  return { BANDS: BANDS.map((b) => b.slice()), bandOf, normalize, look, swatch, linear, conic, border4, svgStops, key, list, aliases, mix, luminance };\n}\n\n/* 气运词条摘要：由 源码/build.py 从 气运金手指/gemini交付/气运/词条库.json 摘出来，勿手改。\n * 变量里只存词条的效果、代价和各种条件；状态栏和正文要显示的简介、死劫三段预警（未显 / 将至 / 临头）按词条名在这里查。 */\nconst LUCK_NOTES = {\n \"位面钟灵\": {\"简介\":\"天地垂青，险局自有位面气数暗护\"},\n \"瑞兽临世\": {\"简介\":\"祥瑞汇身，滋养百兽且引动气数接引\"},\n \"众念归宗\": {\"简介\":\"亿兆香火念力回流，稳固神位根基\"},\n \"万劫不磨\": {\"简介\":\"筋骨百炼不崩，承受极限反噬而不毁\"},\n \"机缘天成\": {\"简介\":\"险地必逢奇遇，先人一步截得秘藏\"},\n \"逆命争锋\": {\"简介\":\"战意压服绝境，越级死斗每能破限\"},\n \"鸿运齐天\": {\"简介\":\"绝路常转奇遇，择宝探秘总占先机\"},\n \"绝处逢生\": {\"简介\":\"死局必留生门，每部危机关头险死还生\"},\n \"天命归心\": {\"简介\":\"自带领袖气象，易揽当世豪杰与势力拥戴\"},\n \"武魂通玄\": {\"简介\":\"武魂深藏蜕变潜能，易引二次觉醒与共鸣\"},\n \"双核天成\": {\"简介\":\"魂力自成气旋，凝聚双魂核反噬大减\"},\n \"凶兽真身\": {\"简介\":\"体藏远古凶兽霸血，渡劫与化形皆具奇威\"},\n \"神降无碍\": {\"简介\":\"深谙下界秩序，行走凡尘少受位面排斥\"},\n \"神考垂青\": {\"简介\":\"气息契合古神残意，极易引动高阶神考\"},\n \"以战养道\": {\"简介\":\"越战越勇，在棋逢对手的血斗中迅猛破境\"},\n \"器道神匠\": {\"简介\":\"锻造暗器与魂导器一点即通，成器易生灵性\"},\n \"灵台明镜\": {\"简介\":\"识海澄澈如镜，诸般幻魅难侵且洞穿虚妄\"},\n \"仙草圣体\": {\"简介\":\"百草相亲，服食天材地宝药力尽化底蕴\"},\n \"越限承环\": {\"简介\":\"经脉坚韧超常，吸收魂环年限上限大增\"},\n \"魂骨缘深\": {\"简介\":\"猎魂探秘易遇奇骨，融合顺遂成长更快\"},\n \"领域先觉\": {\"简介\":\"洞悉领域韵律，早年可触领域门槛\"},\n \"血脉压制\": {\"简介\":\"体蕴上位血脉威压，震慑同源兽武魂与魂兽\"},\n \"大器晚成\": {\"简介\":\"前半程厚积薄发，跨入高阶后破境如潮\"},\n \"以杀证道\": {\"简介\":\"杀气凝而不散，百战血火淬炼冰冷杀意\"},\n \"桃花照命\": {\"简介\":\"风仪出众红尘缘深，易与当世俊杰结宿缘\"},\n \"万兽共尊\": {\"简介\":\"天生林野王者威仪，百兽听调不犯领地\"},\n \"劫雷锻骨\": {\"简介\":\"引天劫雷霆洗炼筋骨，化生死劫为大造化\"},\n \"权柄余韵\": {\"简介\":\"神位权柄留痕绵长，所立赐福与封印难散\"},\n \"神装自孕\": {\"简介\":\"神装神器与神识相融，受损自愈并渐生妙用\"},\n \"燃血焚躯\": {\"简介\":\"绝境主动焚血换力，短时爆发惊世战力\"},\n \"名师引路\": {\"简介\":\"贵人缘深，歧路常逢隐世高人倾囊指点\"},\n \"精神海阔\": {\"简介\":\"识海辽阔浑厚，承载魂灵与神识蜕变极快\"},\n \"机关算尽\": {\"简介\":\"城府谋略深沉，擅设暗局借势制衡群雄\"},\n \"商海通神\": {\"简介\":\"鉴宝生财无往不利，以雄厚财力撬动资源\"},\n \"借势化力\": {\"简介\":\"招式圆转如水，善卸蛮力并引敌招反噬\"},\n \"潜影无踪\": {\"简介\":\"敛息藏形天成，潜伏刺探与遁逃堪称一绝\"},\n \"化形隐息\": {\"简介\":\"化形重修兽气尽敛，难被封号斗罗一眼看破\"},\n \"兽域天成\": {\"简介\":\"身契原生山海地利，主场作战威势大增\"},\n \"神识洞微\": {\"简介\":\"神识凝丝隐蔽探查，不易触怒同阶强者\"},\n \"百毒不侵\": {\"简介\":\"经脉奇异，凡俗剧毒迷烟难以伤及肺腑\"},\n \"天生神力\": {\"简介\":\"筋骨沉雄，未动魂力亦有裂石崩山之伟力\"},\n \"魂技精微\": {\"简介\":\"魂技收放极细，省力增效且擅分心变化\"},\n \"锻体如钢\": {\"简介\":\"皮膜筋骨如玄铁，最擅硬抗重击与持久血战\"},\n \"器阵奇才\": {\"简介\":\"精通机括阵纹，研习暗器魂导与斗铠事半功倍\"},\n \"巧舌如簧\": {\"简介\":\"辞令锋锐圆融，谈判离间与脱身皆凭口才\"},\n \"临危不乱\": {\"简介\":\"崩山于前色不变，死局之中思绪反更清明\"},\n \"丹药良相\": {\"简介\":\"辨草知性，服药食补皆能祛杂增效\"},\n \"疾风掠影\": {\"简介\":\"身法灵动迅疾，抢占先机与万里奔袭出众\"},\n \"世家底蕴\": {\"简介\":\"承古族隐脉遗泽，通晓秘闻并留旧日暗线\"},\n \"灵眸洞察\": {\"简介\":\"目力清明敏锐，善观魂力轨迹与伪装破绽\"},\n \"元素亲和\": {\"简介\":\"深受天地元素眷顾，同属性攻防如鱼得水\"},\n \"众星捧月\": {\"简介\":\"风采耀眼亲和力佳，公开场合极易脱颖而出\"},\n \"借花献佛\": {\"简介\":\"善观强敌相争，混战之中总能巧手渔利\"},\n \"逆境淬魂\": {\"简介\":\"身处高压绝地越挫越勇，苦修效率反胜寻常\"},\n \"灵药寻踪\": {\"简介\":\"嗅觉灵通，密林深谷易觅奇花异草与灵泉\"},\n \"香火常续\": {\"简介\":\"下界留有残庙遗民，细微香火绵延不断\"},\n \"冥想静心\": {\"简介\":\"入定极快，闹市荒野皆可安稳修习魂力\"},\n \"刀头舔血\": {\"简介\":\"久惯江湖凶险，对杀意暗算嗅觉极为敏锐\"},\n \"精打细算\": {\"简介\":\"理财经商眼光独到，买卖筹资绝不吃暗亏\"},\n \"体健如牛\": {\"简介\":\"精力充沛耐力悠长，长途奔走久战难倦\"},\n \"长辈偏爱\": {\"简介\":\"懂礼合眼缘，在宗门学院极易得前辈关照\"},\n \"魂兽亲和\": {\"简介\":\"气息温和纯净，非暴戾魂兽不易主动敌视\"},\n \"手巧心细\": {\"简介\":\"十指极稳，锻造铭刻与修配精密器物少失误\"},\n \"顺藤摸瓜\": {\"简介\":\"查案追凶直觉敏锐，总能揪出隐秘蛛丝马迹\"},\n \"义薄云天\": {\"简介\":\"重诺守信，结交豪客战友多肯两肋插刀\"},\n \"兵法通晓\": {\"简介\":\"善察战局地形，带队团战与布阵游刃有余\"},\n \"百步穿杨\": {\"简介\":\"手眼配合奇准，远程魂技与暗器指哪打哪\"},\n \"火候老辣\": {\"简介\":\"临阵稳守底牌、善抓空隙，极少冒进犯错\"},\n \"夜瞳遗脉\": {\"简介\":\"双瞳含微弱夜行血韵，入夜暗战视听清明\"},\n \"血气充盈\": {\"简介\":\"血脉气血炙热浑厚，抗寒抗邪且伤愈迅速\"},\n \"逢赌必赢\": {\"简介\":\"偏财手气极佳，抽签博弈险押常占上风\"},\n \"名门风范\": {\"简介\":\"举止贵气从容，初入权贵圈子便自得体面\"},\n \"兽语通心\": {\"简介\":\"辨懂百兽嘶鸣情绪，与异族交涉少生误会\"},\n \"神威敛尘\": {\"简介\":\"收尽九天神仪，混迹市井毫不显山露水\"},\n \"厨艺绝佳\": {\"简介\":\"灶台手艺一绝，一顿好饭便能拉近人心\"},\n \"酒量惊人\": {\"简介\":\"千杯不醉，酒桌最易套出豪客与守卫真言\"},\n \"市井百晓\": {\"简介\":\"混迹茶楼巷陌如鱼得水，风声传闻总先入耳\"},\n \"辨识矿石\": {\"简介\":\"懂金石成色纹理，买铁淘矿不易看走眼\"},\n \"早起精神\": {\"简介\":\"破晓醒来神清气爽，晨间修行格外专心\"},\n \"路痴克星\": {\"简介\":\"方向感奇准，密林暗道走过一次便不忘\"},\n \"面善无害\": {\"简介\":\"眉眼温和显憨厚，初见极易让人卸下防备\"},\n \"讨价还价\": {\"简介\":\"嘴甜善磨价，市集采买总能省币拿添头\"},\n \"笔墨传神\": {\"简介\":\"字迹清峻绘图工整，书信拜帖颇得体面\"},\n \"耳聪目明\": {\"简介\":\"五感微敏，隔墙轻语与林间细响易入耳中\"},\n \"皮糙肉厚\": {\"简介\":\"从小耐摔打，切磋擦撞多只留皮外青紫\"},\n \"小财常临\": {\"简介\":\"常撞零碎小便宜，钱包总不至彻底空空\"},\n \"水性极佳\": {\"简介\":\"入水如鱼，渡江涉海闭气潜行胜过常人\"},\n \"血脉温顺\": {\"简介\":\"血气魂力平和顺畅，极少与外力生排异\"},\n \"包扎利落\": {\"简介\":\"通晓外伤急救，危急时能先保伤员一口气\"},\n \"猫狗亲近\": {\"简介\":\"寻常鸟兽宠物见之欢喜，常能带路报些巧信\"},\n \"天煞孤星\": {\"简介\":\"克亲克友克良缘，亲近之人接连横祸不断\"},\n \"环噬之躯\": {\"简介\":\"每纳新环必生怨念反噬，修为愈高痛楚愈烈\"},\n \"毒脉反噬\": {\"简介\":\"剧毒倒灌肺腑，每逢阴雨子午钻心蚀骨\"},\n \"众叛亲离\": {\"简介\":\"天生招忌易遭背刺，难得大势力长久信任\"},\n \"位面厌弃\": {\"简介\":\"天地魂力排斥此身，苦修极慢且易惹天威\"},\n \"兽血招狩\": {\"简介\":\"周身隐散极品魂骨异香，沦为天下魂师活靶\"},\n \"神位生裂\": {\"简介\":\"神位暗藏旧伤裂隙，动用权柄即漏力反噬\"},\n \"心魔噬魂\": {\"简介\":\"识海暗蛰执念心魔，破境血战随时乱神\"},\n \"病骨支离\": {\"简介\":\"气血亏虚体魄极脆，畏重击且忌久战强攻\"},\n \"霉运缠身\": {\"简介\":\"百事横生枝节，好事多磨险事必撞正着\"},\n \"魂力漏斗\": {\"简介\":\"经脉蓄气不住，施技耗力暴增极易枯竭\"},\n \"煞气外露\": {\"简介\":\"眉宇透出凶煞之气，行至何处皆易惹大祸\"},\n \"血脉排斥\": {\"简介\":\"体内血脉孤傲排外，难容异源魂环与辅助\"},\n \"情劫噬心\": {\"简介\":\"动情即召惨变，挚爱必成立场死敌或反目\"},\n \"散财童子\": {\"简介\":\"财不聚手，资财奇珍到手必逢横祸破耗\"},\n \"残躯早夭\": {\"简介\":\"先天寿元断绝，二十四岁生辰气血枯竭\",\"预警\":[\"偶感胸口闷塞，晨起指尖冰凉，似有沉疴暗伏心脉深处。\",\"面色渐泛病态惨白，运功过剧偶咳血丝，生辰渐近寒意彻骨。\",\"二十四岁生辰钟响之际，丹田魂力倒卷枯竭，心脉如游丝将断，唯余一息抢救生机。\"]},\n \"早慧早折\": {\"简介\":\"锋芒过盛遭天忌，三十岁未登封号则魂海崩\",\"预警\":[\"深夜冥想偶闻颅内细微碎裂异响，次日醒来额角隐隐抽痛。\",\"识海裂痕时隐时现，催动高阶魂技易引一阵剧烈眩晕与耳鸣。\",\"三十岁生辰子夜，魂海如瓷龟裂倾塌，狂暴魂力即将撑碎识海夺命。\"]},\n \"宿敌索命\": {\"简介\":\"命中招惹绝世大敌，三载期满遭必杀围猎\",\"预警\":[\"暗中偶觉冰冷目光窥伺，黑市隐约流传针对主角的暗花悬赏。\",\"宿敌麾下精锐开始频频截杀试探，一封染血索命信已送至门前。\",\"三载劫期届满，宿敌亲身现身封死四面退路，必杀绝招直取主角首级。\"]},\n \"血债难偿\": {\"简介\":\"身背宗门级旧日血债，两年期满遭死士绝杀\",\"预警\":[\"街头偶遇神色怨毒的陌生人盯梢，陈年血案流言开始在坊间蔓延。\",\"接连两拨死士自爆截杀，血仇同盟已锁定主角常驻落脚之城。\",\"两年劫期已至，数名死士隐于人群骤然引爆必杀绝阵，烈火杀机四面合围。\"]},\n \"武魂崩解\": {\"简介\":\"武魂本源暗藏死裂，冲破大关随时反噬爆体\",\"预警\":[\"释放武魂时虚影偶有细颤，魂力输出忽强忽弱似藏隐滞。\",\"武魂表层浮现细密裂纹，逼近大关瓶颈时经脉灼痛宛若刀割。\",\"冲击大关最后一息，武魂轰然剧震倒卷全部魂力，肉身即将炸裂崩解。\"]},\n \"天劫倍至\": {\"简介\":\"魂兽大限提前且雷劫倍增，寻常渡劫必成飞灰\",\"预警\":[\"晴空无故响起沉闷雷鸣，体内修为年限偶生莫名躁动与窒息威压。\",\"栖身领地终日乌云压顶、紫电游走，周边魂兽惊恐逃离不敢近身。\",\"九霄劫云轰然合拢，灭世紫金劫雷撕裂天幕直劈天灵，唯留一线渡劫生路。\"]},\n \"神陨天罚\": {\"简介\":\"触神界忌讳或遭位面强排，一年半内降灭神罚\",\"预警\":[\"神位深处浮现一丝暗黑裂印，偶有冰冷杀意自虚空极高处扫过。\",\"神力流转屡遭无形锁链拉扯，苍穹隐现裁决异象死死锁定真身。\",\"五百四十日劫期已满，虚空裂开降下灭神血雷，神位剧震即将彻底崩碎。\"]},\n \"邪念夺舍\": {\"简介\":\"识海潜伏远古凶残残魂，一年期满强夺肉身\",\"预警\":[\"梦境频现陌生血腥记忆残片，醒来偶觉手脚片刻不听自己使唤。\",\"耳畔阴冷低语日夜不绝，重伤疲惫时眼底竟一闪而过诡异凶芒。\",\"一年劫期将满，残魂冲破识海壁垒化黑雾吞天，本我意识即将被彻底抹除。\"]},\n \"绝命死契\": {\"简介\":\"身缚古老违禁血契，逃避或违约即焚魂抹杀\",\"预警\":[\"胸口暗红契纹时隐时烫，宛若有一道冰冷视线昼夜盯紧一言一行。\",\"契纹蔓延至颈侧开始暗抽生机，警示严苛试炼与最后期限迫在眉睫。\",\"死契血光冲天引爆，血链贯穿经脉绞杀生机，唯有一搏破契或赴约方能活命。\"]},\n \"众怒公敌\": {\"简介\":\"因果招祸举世皆敌，大势交汇遭正邪合围必杀\",\"预警\":[\"坊间渐起抹黑主角的恶毒流言，原本中立的势力态度骤冷暗藏杀意。\",\"多方通缉令与高额悬赏贴满大城，四面眼线已开始封锁出城要道。\",\"风云突变之夜，正邪数位封号强敌齐至合围，绝杀大阵升空断绝一切退路。\"]}\n};\n\n/* 斗罗正文本体：把一条 AI 回复里的幕签、转场、对白、技能签画成节点，并给人名上色。\n * 只管“文字 → 节点”，不碰酒馆；宿主（楼层脚本）负责取文字、取变量、把节点放进楼层。\n * 用法：DLProse.build(text, env) → 节点数组；DLProse.look(容器, { theme, motion, surface }) 给容器挂主题。\n * env = {\n *   format(text) → html        酒馆的正文排版（段落、引号上色等）\n *   stat                       这一层的 stat_data，没有就传 null\n *   acts                       { resolve({ arc 篇名, no 第几幕, title 幕名 }) → { known, part, arc, no, title, at, of } | null }，可省\n *   avatars                    头像库（window.DLAvatars），可省\n *   chosen                     状态栏设置里存的头像 { 全名: { src } 或 { pick } }，可省\n *   persona                    酒馆人设头像地址，主角没有别的图时用，可省\n *   playAt(key) → 秒 | null    这张技能卡的动画已经播了几秒；不该播返回 null\n *   floor                      楼层号，只用来给技能卡编 key\n * }\n */\n(function () {\n  'use strict';\n  const SVGNS = 'http://www.w3.org/2000/svg';\n  function setAttrs(el, attrs) {\n    for (const k in attrs || {}) {\n      const v = attrs[k];\n      if (v == null || v === false) continue;\n      if (k === 'class') el.setAttribute('class', v);\n      else if (k === 'text') el.textContent = v;\n      else if (k === 'style') { for (const p in v) if (v[p] != null) el.style.setProperty(p, v[p]); }\n      else el.setAttribute(k, v === true ? '' : v);\n    }\n  }\n  function add(el, kids) {\n    for (const c of kids.flat(Infinity)) {\n      if (c == null || c === false || c === '') continue;\n      el.append(c.nodeType ? c : document.createTextNode(String(c)));\n    }\n    return el;\n  }\n  const h = (tag, attrs, ...kids) => { const el = document.createElement(tag); setAttrs(el, attrs); return add(el, kids); };\n  const sv = (tag, attrs, ...kids) => { const el = document.createElementNS(SVGNS, tag); setAttrs(el, attrs); return add(el, kids); };\n  const f1 = (v) => +v.toFixed(1);\n  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));\n  const entries = (o) => Object.entries(o && typeof o === 'object' ? o : {});\n  const SEP = /[\\s·•・.\\-_]/u;\n\n  /* ═══════════════ 1. 数字、年限、魂环取色 ═══════════════ */\n  const DIGIT = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };\n  const UNIT = { 十: 10, 百: 100, 千: 1000 };\n  const half = (t) => String(t == null ? '' : t).replace(/[０-９]/gu, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));\n  // “三”“十二”“一万三千”“4.3万”“13000” → 数；认不出返回 null\n  function cnNumber(text) {\n    const s = half(text).replace(/[,，\\s]/gu, '');\n    if (!s) return null;\n    const m = /^(\\d+(?:\\.\\d+)?)(十万|百万|千万|万|千|百|亿)?$/u.exec(s);\n    if (m) return Math.round(parseFloat(m[1]) * ({ 百: 100, 千: 1e3, 万: 1e4, 十万: 1e5, 百万: 1e6, 千万: 1e7, 亿: 1e8 }[m[2]] || 1));\n    let total = 0, section = 0, num = 0;\n    for (const ch of s) {\n      if (ch in DIGIT) num = DIGIT[ch];\n      else if (ch in UNIT) { section += (num || 1) * UNIT[ch]; num = 0; }\n      else if (ch === '万') { total += (section + num || 1) * 1e4; section = 0; num = 0; }\n      else if (ch === '亿') { total = (total + section + num || 1) * 1e8; section = 0; num = 0; }\n      else return null;\n    }\n    return total + section + num;\n  }\n  const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];\n  const cnOrdinal = (n) => (n >= 1 && n <= 10 ? CN[n] : n > 10 && n < 20 ? '十' + CN[n - 10] : String(n));\n  // AI 补写的年限：“千年”“一万三千年”“约五万年魂环”“神级” → { years, god }\n  function yearsOf(text) {\n    const s = half(text).replace(/\\s+/gu, '');\n    if (!s) return null;\n    if (/神级|神赐/u.test(s)) return { years: null, god: true };\n    const m = /^(?:约|近|逾|超过|将近|大约)?([0-9.,，零〇一二两三四五六七八九十百千万亿]+)(?:余|多)?年/u.exec(s);\n    const n = m ? cnNumber(m[1]) : null;\n    return n ? { years: n, god: false } : null;\n  }\n  function fmtYears(n) {\n    if (n == null) return '';\n    if (n >= 1e4) return String(+(n / 1e4).toFixed(n % 1e4 ? 1 : 0)) + ' 万年';\n    return n.toLocaleString('en-US') + ' 年';\n  }\n\n  const hex2rgb = (x) => { const n = parseInt(x.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };\n  const rgb2hex = (a) => '#' + a.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');\n  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };\n  function luminance(x) {\n    const [r, g, b] = hex2rgb(x).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });\n    return 0.2126 * r + 0.7152 * g + 0.0722 * b;\n  }\n  // 取色交给 共用/魂环色.js（与状态栏同一份；构建时拼在本体前面，样稿页用 <script src> 引）：\n  // 变量里的 魂环颜色 优先（开放取值、可多色），没写按年限，带内越往上越深、越接近下一档越透出下一档的颜色\n  const RP = createRingPalette();\n  const BAND_WORD = { 白: '十年', 黄: '百年', 紫: '千年', 黑: '万年', 红: '十万年', 金: '百万年' };\n  function ringLook(r) {\n    const y = r && typeof r.年限 === 'number' ? r.年限 : null;\n    const want = r ? (r.魂环颜色 != null ? r.魂环颜色 : r.特殊色) : null;\n    if (!r || (y == null && !want && !r.神级 && !r.凶兽)) return { color: null, gold: 0, band: '', dark: false, years: y, stops: [], glow: null, rainbow: false };\n    const o = RP.look(r);\n    const band = o.custom ? (/^#/u.test(o.name) ? '异色' : o.name + (/色$/u.test(o.name) ? '' : '色')) : o.name === '神级' ? '神级' : o.name === '橙金' ? '凶兽' : BAND_WORD[o.name] || o.name;\n    return { color: o.main, gold: o.gold, band, dark: o.dark, years: y, stops: o.stops, glow: o.hint > 0.15 ? o.glow : null, rainbow: o.rainbow };\n  }\n  // 多色环的描边：在这张徽记自己的 svg 里放一条斜向渐变\n  let gradSeq = 0;\n  function lookPaint(look, svg) {\n    if (!look || !look.color) return 'var(--dlp-line2)';\n    if (!svg || !look.stops || look.stops.length < 2) return look.color;\n    const id = 'dlp-rg' + ++gradSeq;\n    const g = sv('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 });\n    RP.svgStops({ stops: look.stops, main: look.color }).forEach(([t, c]) => g.append(sv('stop', { offset: t.toFixed(3), 'stop-color': c })));\n    let defs = svg.querySelector('defs');\n    if (!defs) { defs = sv('defs'); svg.prepend(defs); }\n    defs.append(g);\n    return `url(#${id})`;\n  }\n  const topRing = (rings) => rings.reduce((best, r) => {\n    const rank = (x) => (x.神级 ? 1e12 : x.凶兽 ? 1e10 : typeof x.年限 === 'number' ? x.年限 : x.魂环颜色 || x.特殊色 ? 1e9 : 0);\n    return !best || rank(r) >= rank(best) ? r : best;\n  }, null);\n\n  /* ═══════════════ 2. 拆分：文字 → 一串段（正文、幕签、转场、技能签、对白）。只认文字，不碰节点 ═══════════════ */\n  const TAGS = ['story', 'scene', 'skill'];\n  const TAG_OPEN = /<(story|scene|skill)\\s*>/giu;\n  // 名字里不能有的字：花括号、换行、引号、冒号逗号句号问叹号、尖括号等号斜杠\n  const NAME_BODY = '[^{}\\\\n「」『』“”\"\\'：:，,。！？!?<>=;/\\\\\\\\]{1,16}?';\n  const SAY_START = new RegExp(`^[ \\\\t]*\\\\{\\\\s*(${NAME_BODY})\\\\s*\\\\}[ \\\\t]*[：:]?[ \\\\t]*(?=[「“\"『])`, 'u');\n  const NAME_ONLY = new RegExp(`^[ \\\\t]*\\\\{\\\\s*(${NAME_BODY})\\\\s*\\\\}[ \\\\t]*[：:]?[ \\\\t]*$`, 'u');\n  const INLINE_NAME = `(?<!\\\\{)\\\\{\\\\s*(${NAME_BODY})\\\\s*\\\\}(?!\\\\})`;\n  const CLOSE_OF = { '「': '」', '『': '』', '“': '”', '\"': '\"' };\n  const TRAILING = /^[\\s。．.，,、！!？?…—\\-~～）)]*$/u;\n  const NAME_LIMIT = 17;\n  const isName = (name) => /\\p{L}/u.test(String(name == null ? '' : name));\n\n  /* 块标签（叙事核心用）：别的脚本往主页面的 window.__DL_PROSE_BLOCKS__（一个 Map）里登记 标签名 → { render(段, 工具) }，\n   * 再派发 window 事件 dl-ext-changed。本体每次拆分时现读这张表，所以谁先加载都行；表里没有的标签照普通文字处理。\n   * 块从行首的 <标签> 开始，到 </标签> 结束；还没写到结束标签时一直算到末尾（closed 为 false，正在写）。\n   * render 收到 { type:'block', tag, inner, closed }，工具里有 h / sv（建节点）、sub(文字)（把块里的正文照常画成节点）、env。 */\n  function blockTable() {\n    const m = window.__DL_PROSE_BLOCKS__;\n    if (!(m && typeof m.get === 'function' && m.size)) return OWN_BLOCKS;\n    const all = new Map(OWN_BLOCKS);\n    for (const [tag, spec] of m) {\n      if (tag === '气运') continue; // 气运是主卡自己的，核心不能顶掉\n      if (tag === '结局' && spec && typeof spec.render === 'function') all.set(tag, { render: (part, kit) => (qyEnded(kit.env && kit.env.stat) ? qyEnding(part, kit) : spec.render(part, kit)) });\n      else all.set(tag, spec);\n    }\n    return all;\n  }\n\n  /* 气运（设计决定 §24.3、§24.8）：<气运> 和死劫应验的 <结局> 是主卡自带的块标签（气运在主变量里），拆法、画法接口和登记来的块一样。\n   * <气运>词条名｜一句话</气运> 画成一条命牌；整块（开头几行“词条｜…”“事件｜晋阶 / 化解 / 劫兆”）画成大块。品阶、效果、条件、倒计时取这一层的变量，\n   * 简介和死劫三段预警不在变量里，按词条名查 LUCK_NOTES（共用/气运摘要.js，构建时拼在本体前面）。\n   * <结局>：这一层 主角.气运.结局 写下了（死劫应验）画气运版；否则交给当前叙事核心登记的 <结局>；没选核心时也画气运版。 */\n  const QY_TN = { 彩: '彩阶', 金: '金阶', 红: '红阶', 紫: '紫阶', 黄: '黄阶', 白: '白阶', 厄: '厄运', 绝: '绝命' };\n  const QY_DOWN = { 彩: '金', 金: '红', 红: '紫', 紫: '黄', 黄: '白' };\n  const QY_OMEN = ['未显', '将至', '临头'];\n  const QY_HEAD = ['词条', '事件', '死因', '下手'];\n  const qyNote = (n) => {\n    try {\n      const dyn = window.__DL_LUCK__ && typeof window.__DL_LUCK__.notes === 'function' ? window.__DL_LUCK__.notes() : null;\n      if (dyn && dyn[n]) return dyn[n];\n    } catch (_) { /* ignore */ }\n    return (typeof LUCK_NOTES === 'object' && LUCK_NOTES && LUCK_NOTES[n]) || {};\n  };\n  const qyOf = (stat) => (stat && stat.主角 && stat.主角.气运 && typeof stat.主角.气运 === 'object' ? stat.主角.气运 : null);\n  const qyEntry = (stat, n) => { const q = qyOf(stat); return (q && q.词条 && typeof q.词条 === 'object' && q.词条[n]) || null; };\n  const qyEnded = (stat) => { const q = qyOf(stat); return !!(q && q.结局 && q.结局.已终结 === true); };\n  function qyHead(inner) {\n    const lines = String(inner || '').replace(/^\\s*\\n|\\n\\s*$/gu, '').split('\\n');\n    const meta = {};\n    let i = 0;\n    for (; i < lines.length; i++) {\n      const m = /^\\s*([^｜|\\s]{1,4})\\s*[｜|]\\s*(.*)$/u.exec(lines[i]);\n      if (!m || !QY_HEAD.includes(m[1])) break;\n      meta[m[1]] = m[2].trim();\n    }\n    return { meta, body: lines.slice(i).join('\\n').trim() };\n  }\n  // 入场：正文给了“已播几秒”就带 data-play 和负的延迟（同技能卡、核心块）\n  const qyPlay = (kit) => { const t = kit && typeof kit.playAt === 'function' ? kit.playAt() : null; return t == null ? {} : { 'data-play': true, style: { '--dlp-t': `-${t.toFixed(2)}s` } }; };\n  function qyBlock(part, kit) {\n    const stat = kit.env && kit.env.stat, raw = String(part.inner || '').trim(), writing = part.closed ? null : true;\n    const shell = (cls, tier, more) => Object.assign({ class: 'dlp dlp-qy ' + cls, 'data-tier': tier, 'data-writing': writing }, qyPlay(kit), more || {});\n    if (!raw.includes('\\n')) {\n      const cut = raw.search(/[｜|]/u);\n      const name = (cut < 0 ? raw : raw.slice(0, cut)).trim(), line = cut < 0 ? '' : raw.slice(cut + 1).trim();\n      const e = qyEntry(stat, name);\n      return h('div', shell('dlp-qy-line', (e && e.品阶) || '白'), h('i', { class: 'dlp-qy-gl', 'aria-hidden': 'true' }), h('b', { text: name }), line ? h('span', { text: line }) : null);\n    }\n    const { meta, body } = qyHead(raw);\n    const name = meta.词条 || '', e = qyEntry(stat, name);\n    const ev = meta.事件 || (e && e.死劫 ? '劫兆' : '');\n    const text = body ? h('div', { class: 'dlp-qy-body' }, kit.sub(body)) : null;\n    if (ev === '晋阶') {\n      const to = e && QY_TN[e.品阶] ? e.品阶 : null, from = to && QY_DOWN[to];\n      return h('section', shell('dlp-qy-blk dlp-qy-up', to || '金'),\n        h('i', { class: 'dlp-qy-col', 'aria-hidden': 'true' }, Array.from({ length: 14 }, (_, i) => h('s', { style: { '--x': (i * 41) % 100 + '%', '--d': (i * 0.23).toFixed(2) + 's' } }))),\n        h('header', null, h('span', { class: 'dlp-qy-k', text: '气运 · 晋阶' })),\n        from ? h('div', { class: 'dlp-qy-tr' }, h('span', { class: 'dlp-qy-chip', 'data-tier': from, text: QY_TN[from] }), h('i', { class: 'dlp-qy-arr', 'aria-hidden': 'true' }), h('span', { class: 'dlp-qy-chip to', 'data-tier': to, text: QY_TN[to] })) : null,\n        h('h4', { class: 'dlp-qy-t', text: name }),\n        e && e.效果 ? h('p', { class: 'dlp-qy-eff', text: e.效果 }) : null, text);\n    }\n    if (ev === '化解' || ev === '压制') {\n      const press = ev === '压制' || !!(e && e.状态 === '压制');\n      const links = (x0, flip) => [0, 1, 2, 3].map((i) => { const odd = (i % 2 === 1) !== flip; return sv('rect', { x: x0 + i * 22, y: odd ? 11 : 7, width: 26, height: odd ? 8 : 16 }); });\n      return h('section', shell('dlp-qy-blk dlp-qy-fix', (e && e.品阶) || '厄', { 'data-kind': press ? 'press' : 'free' }),\n        sv('svg', { class: 'dlp-qy-chain', viewBox: '0 0 200 30', 'aria-hidden': 'true' }, sv('g', { class: 'l' }, links(8, false)), sv('g', { class: 'r' }, links(104, true))),\n        h('header', null, h('span', { class: 'dlp-qy-k', text: press ? '气运 · 压制' : '气运 · 化解' })),\n        h('h4', { class: 'dlp-qy-t' }, press ? name : h('s', { text: name })),\n        e && e.化解 && e.化解.条件 ? h('p', { class: 'dlp-qy-eff', text: e.化解.条件 }) : null, text);\n    }\n    if (ev === '劫兆') {\n      const stage = e && e.死劫 && QY_OMEN.includes(e.死劫.劫兆) ? e.死劫.劫兆 : '将至', idx = QY_OMEN.indexOf(stage);\n      const warn = (qyNote(name).预警 || [])[idx] || '';\n      return h('section', shell('dlp-qy-blk dlp-qy-omen', (e && e.品阶) || '绝', { 'data-stage': String(idx) }),\n        sv('svg', { class: 'dlp-qy-crack', viewBox: '0 0 400 120', preserveAspectRatio: 'none', 'aria-hidden': 'true' },\n          sv('path', { d: 'M0 64 L60 58 L84 70 L130 52 L160 66 L210 48 L236 62 L300 50 L330 66 L400 56' }), sv('path', { d: 'M130 52 L138 30 L150 22M236 62 L246 86 L262 96M300 50 L310 34' })),\n        h('header', null, h('span', { class: 'dlp-qy-k', text: '气运 · 劫兆' }),\n          h('span', { class: 'dlp-qy-st' }, QY_OMEN.map((s, i) => h('i', { class: (i <= idx ? 'on' : '') + (i === idx ? ' cur' : '') || null, text: s })))),\n        h('h4', { class: 'dlp-qy-t', 'data-text': '劫兆' + stage, text: '劫兆' + stage }),\n        h('p', { class: 'dlp-qy-who' }, name, e && e.倒计时 != null ? [' · ', h('b', { text: e.倒计时 }), ' 天'] : null),\n        warn ? h('p', { class: 'dlp-qy-warn', text: warn }) : null, text,\n        idx === 2 ? h('p', { class: 'dlp-qy-hint', text: '化解：' + ((e && e.化解 && e.化解.条件) || '条件不明') }) : null);\n    }\n    // 认不出事件：按单行命牌的样子把块里的话画出来，内容不丢\n    return h('section', shell('dlp-qy-line', (e && e.品阶) || '白', { style: { display: 'block' } }), h('b', { text: name || '气运' }), text);\n  }\n  function qyEnding(part, kit) {\n    const { meta, body } = qyHead(part.inner);\n    const E = (qyOf(kit.env && kit.env.stat) || {}).结局 || {};\n    const rows = [['死因', meta.死因 || E.死因], ['下手', meta.下手 || E.下手]].filter(([, v]) => v);\n    return h('section', Object.assign({ class: 'dlp dlp-qy dlp-qy-blk dlp-qy-end', 'data-tier': '绝', 'data-writing': part.closed ? null : true }, qyPlay(kit)),\n      h('i', { class: 'dlp-qy-endc', 'aria-hidden': 'true' }),\n      h('header', null, h('span', { class: 'dlp-qy-k', text: '气运已尽' })),\n      h('h4', { class: 'dlp-qy-t' }, E.词条 || '死劫', h('small', { text: '应验' })),\n      rows.length ? h('dl', null, rows.map(([k, v]) => h('div', null, h('dt', { text: k }), h('dd', { text: v })))) : null,\n      body ? h('div', { class: 'dlp-qy-body' }, kit.sub(body)) : null,\n      part.closed ? h('p', { class: 'dlp-qy-endf', text: '此局已终，之后不再推进。' }) : null);\n  }\n  const OWN_BLOCKS = new Map([['气运', { render: qyBlock }], ['结局', { render: qyEnding }]]);\n  // 代码块与配对的非斗罗容器标签里的字换成空格（换行保留），找斗罗标签和对白时不会拆坏预设正则要匹配的标签块\n  const INLINE_HTML = new Set(['a', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup', 'span', 'font', 'ruby', 'rt', 'rp', 'q', 'cite', 'abbr', 'kbd']);\n  const VOID_HTML = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'wbr', 'col', 'area', 'base', 'embed', 'param', 'source', 'track']);\n  const FOREIGN_TOK = /<(\\/?)([A-Za-z][\\w:-]{0,31}|[\\u4e00-\\u9fa5][\\w\\u4e00-\\u9fa5:-]{0,15})(?:\\s[^<>]*?)?(\\/?)>/gu;\n  function ownTagSet() {\n    const set = new Set(['story', 'scene', 'skill', 'content', 'updatevariable']);\n    const table = blockTable();\n    if (table) for (const k of table.keys()) if (typeof k === 'string' && k) set.add(k.toLowerCase());\n    return set;\n  }\n  function maskCode(text) {\n    const coded = String(text).replace(/(`{3,}|~{3,})[\\s\\S]*?(?:\\1|$)|`[^`\\n]*`/gu, (m) => m.replace(/[^\\n]/gu, ' '));\n    if (!coded.includes('<')) return coded;\n    const own = ownTagSet(), stack = [], spans = [];\n    FOREIGN_TOK.lastIndex = 0;\n    for (let m = FOREIGN_TOK.exec(coded); m; m = FOREIGN_TOK.exec(coded)) {\n      const closing = m[1] === '/', name = m[2].toLowerCase(), self = m[3] === '/';\n      if (self || own.has(name) || INLINE_HTML.has(name) || VOID_HTML.has(name)) continue;\n      if (!closing) { stack.push({ name, start: m.index }); continue; }\n      for (let k = stack.length - 1; k >= 0; k -= 1) {\n        if (stack[k].name !== name) continue;\n        spans.push([stack[k].start, m.index + m[0].length]);\n        stack.length = k;\n        break;\n      }\n    }\n    if (!spans.length) return coded;\n    spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);\n    let out = '', pos = 0;\n    for (const [s, e] of spans) {\n      if (e <= pos) continue;\n      if (s > pos) out += coded.slice(pos, s);\n      const from = Math.max(s, pos);\n      out += coded.slice(from, e).replace(/[^\\n]/gu, ' ');\n      pos = e;\n    }\n    return out + coded.slice(pos);\n  }\n  const escRe = (s) => String(s).replace(/[.*+?^${}()|[\\]\\\\]/gu, '\\\\$&');\n  function blockRanges(masked) {\n    const table = blockTable();\n    if (!table) return [];\n    const names = [...table.keys()].filter((t) => typeof t === 'string' && t);\n    if (!names.length) return [];\n    const open = new RegExp(`^[ \\\\t]*<(${names.map(escRe).join('|')})\\\\s*>`, 'gmu');\n    const out = [];\n    for (let m = open.exec(masked); m; m = open.exec(masked)) {\n      const tag = m[1], from = m.index + m[0].length;\n      const close = new RegExp(`</${escRe(tag)}\\\\s*>`, 'u').exec(masked.slice(from));\n      const innerEnd = close ? from + close.index : masked.length, end = close ? innerEnd + close[0].length : masked.length;\n      out.push({ start: m.index, from, innerEnd, end, tag, closed: !!close });\n      open.lastIndex = end;\n    }\n    return out;\n  }\n\n  // 正在写的半截：<sto、<ski、行首的 {名字、写完名字还没写到引号；返回要藏起来的位置，没有返回 -1\n  function pendingCut(masked) {\n    let cut = -1;\n    const lt = masked.lastIndexOf('<');\n    if (lt !== -1) {\n      const tail = masked.slice(lt).toLowerCase();\n      const table = blockTable(), tags = table ? TAGS.concat([...table.keys()]) : TAGS;\n      if (!tail.includes('>') && !/\\n/u.test(tail) && (tail === '<' || tail === '</' || tags.some((t) => `<${t}>`.startsWith(tail) || `</${t}>`.startsWith(tail)))) cut = lt;\n    }\n    const brace = masked.lastIndexOf('{');\n    if (brace !== -1 && !/[}\\n]/u.test(masked.slice(brace)) && masked.length - brace <= NAME_LIMIT) cut = cut === -1 ? brace : Math.min(cut, brace);\n    const lineStart = masked.lastIndexOf('\\n') + 1;\n    const only = NAME_ONLY.exec(masked.slice(lineStart));\n    if (only && isName(only[1])) cut = cut === -1 ? lineStart : Math.min(cut, lineStart);\n    return cut;\n  }\n  function closeQuote(line, at) {\n    const open = line[at], close = CLOSE_OF[open];\n    let depth = 0;\n    for (let i = at; i < line.length; i++) {\n      const ch = line[i];\n      if (open === close) { if (i > at && ch === close) return i; }\n      else if (ch === open) depth++;\n      else if (ch === close && --depth === 0) return i;\n    }\n    return -1;\n  }\n  // 一行里从头开始的对白，一行写了几句就拆几句；剩下不是对白的字原样当正文\n  function sayLine(line, masked) {\n    const items = [];\n    let rest = line, restMasked = masked;\n    for (;;) {\n      const m = SAY_START.exec(restMasked);\n      if (!m || !isName(m[1])) break;\n      const quoteAt = m[0].length, end = closeQuote(restMasked, quoteAt);\n      items.push({ type: 'say', name: m[1].trim(), speech: rest.slice(quoteAt + 1, end === -1 ? rest.length : end).trim(), closed: end !== -1 });\n      const after = end === -1 ? rest.length : end + 1;\n      rest = rest.slice(after); restMasked = restMasked.slice(after);\n    }\n    if (!items.length) return null;\n    if (!TRAILING.test(rest)) items.push({ type: 'text', text: rest.trim() });\n    return items;\n  }\n  function textParts(text, masked, out) {\n    let offset = 0;\n    for (const line of text.split(/(?<=\\n)/u)) {\n      const body = line.replace(/\\r?\\n$/u, '');\n      const items = sayLine(body, masked.slice(offset, offset + body.length));\n      if (items) out.push(...items, { type: 'text', text: line.slice(body.length) });\n      else out.push({ type: 'text', text: line });\n      offset += line.length;\n    }\n  }\n  const cells = (inner) => String(inner).split(/[｜|]/u).map((c) => c.trim());\n\n  // <story> 里的三栏：日期｜篇｜第几幕 幕名。带“当前时间：”这类标签也认\n  function storyFields(inner) {\n    const out = { date: '', arc: '', no: null, title: '' };\n    const raw = String(inner).replace(/(当前(?:时间|日期)|当前篇章?|当前幕)\\s*[:：]\\s*/gu, '｜').replace(/\\s{2,}/gu, '｜');\n    for (const cell of cells(raw)) {\n      if (!cell) continue;\n      const act = /^第\\s*([0-9〇零一二两三四五六七八九十]{1,4})\\s*幕[\\s·:：、.\\-—]*(.*)$/u.exec(cell);\n      if (act) { out.no = cnNumber(act[1]); out.title = act[2].trim(); continue; }\n      if (!out.date && /\\d+\\s*年|^\\d{1,6}[-/.]\\d{1,2}[-/.]\\d{1,2}$/u.test(half(cell))) { out.date = cell; continue; }\n      const both = /^(.+?篇)[\\s·]*第\\s*([0-9〇零一二两三四五六七八九十]{1,4})\\s*幕[\\s·:：、.\\-—]*(.*)$/u.exec(cell);\n      if (both) { out.arc = both[1]; out.no = cnNumber(both[2]); out.title = both[3].trim(); continue; }\n      if (!out.arc && /篇$/u.test(cell)) { out.arc = cell; continue; }\n      if (!out.title) out.title = cell;\n    }\n    return out;\n  }\n  function storyDate(text) {\n    const m = /(前)?\\s*(\\d{1,6})\\s*[年\\-/.]\\s*(\\d{1,2})\\s*[月\\-/.]\\s*(\\d{1,2})/u.exec(half(text));\n    return m ? { bc: !!m[1], y: +m[2], m: +m[3], d: +m[4] } : null;\n  }\n  function skillFields(inner) {\n    const c = cells(inner);\n    if (c.length < 2 || !c[0]) return null;\n    return c.length === 2 ? { who: c[0], kind: '', name: c[1], years: '', effect: '' } : { who: c[0], kind: c[1], name: c[2] || '', years: c[3] || '', effect: c.slice(4).join('｜') };\n  }\n\n  // 拆成一串：text 正文、story 幕签、scene 转场、skill 技能签、say 对白；同一人连着说的几句，后面的 cont 为 true\n  // 拆分：先切出登记过的块标签（叙事核心），块外的文字再按单行标签和对白拆\n  function parse(raw) {\n    let text = String(raw == null ? '' : raw), masked = maskCode(text);\n    const cut = pendingCut(masked);\n    if (cut !== -1) { text = text.slice(0, cut); masked = masked.slice(0, cut); }\n    const parts = [];\n    let at = 0;\n    for (const b of blockRanges(masked)) {\n      flatParts(text.slice(at, b.start), masked.slice(at, b.start), parts);\n      parts.push({ type: 'block', tag: b.tag, inner: text.slice(b.from, b.innerEnd).replace(/^[ \\t]*\\r?\\n/u, '').replace(/\\s+$/u, ''), closed: b.closed });\n      at = b.end;\n    }\n    flatParts(text.slice(at), masked.slice(at), parts);\n    // 相邻的正文并成一段；空白不打断“同一人连着说”\n    const merged = [];\n    let last = null;\n    for (const part of parts) {\n      if (part.type === 'text') {\n        if (!part.text) continue;\n        const prev = merged[merged.length - 1];\n        if (prev && prev.type === 'text') prev.text += part.text; else merged.push({ ...part });\n        if (part.text.trim()) last = null;\n      } else if (part.type === 'say') { merged.push({ ...part, cont: last === part.name }); last = part.name; }\n      else { merged.push(part); last = null; }\n    }\n    return { parts: merged, cut: cut !== -1 };\n  }\n  function flatParts(text, masked, parts) {\n    const marks = [];\n    TAG_OPEN.lastIndex = 0;\n    for (let m = TAG_OPEN.exec(masked); m; m = TAG_OPEN.exec(masked)) {\n      const tag = m[1].toLowerCase(), from = m.index + m[0].length;\n      const nl = masked.indexOf('\\n', from), lineEnd = nl === -1 ? masked.length : nl;\n      const close = new RegExp(`</${tag}\\\\s*>`, 'iu').exec(masked.slice(from, lineEnd));\n      // 这一行还没写完、也没收尾：正在写，先藏起来\n      if (!close && nl === -1) { marks.push({ start: m.index, end: masked.length, part: null }); break; }\n      const innerEnd = close ? from + close.index : lineEnd, end = close ? innerEnd + close[0].length : lineEnd;\n      const inner = text.slice(from, innerEnd).trim();\n      let part = null;\n      if (tag === 'story') { const f = storyFields(inner); if (f.date || f.arc || f.no || f.title) part = { type: 'story', fields: f }; }\n      else if (tag === 'scene') { const c = cells(inner); if (c[0] || c[1]) part = { type: 'scene', place: c[0] || '', time: c.slice(1).join(' ') }; }\n      else { const f = skillFields(inner); if (f) part = { type: 'skill', ...f }; }\n      marks.push({ start: m.index, end, part });\n      TAG_OPEN.lastIndex = end;\n    }\n    let cursor = 0;\n    for (const mark of marks) {\n      textParts(text.slice(cursor, mark.start), masked.slice(cursor, mark.start), parts);\n      if (mark.part) parts.push(mark.part);\n      cursor = mark.end;\n    }\n    textParts(text.slice(cursor), masked.slice(cursor), parts);\n  }\n  // 要不要接手画这一层：有幕签、转场、技能签、登记过的块标签、{名字}，或者正写到半截\n  function has(text) {\n    const value = maskCode(String(text == null ? '' : text));\n    if (/<\\/?(?:story|scene|skill)\\s*>/iu.test(value)) return true;\n    if (blockRanges(value).length) return true;\n    for (const m of value.matchAll(new RegExp(INLINE_NAME, 'gu'))) if (isName(m[1])) return true;\n    return pendingCut(value) !== -1;\n  }\n\n  /* ═══════════════ 3. 认人：名字 → 同一个人、颜色、头像、变量里的档案 ═══════════════ */\n  function context(env) {\n    const stat = env.stat || null, lib = env.avatars || null;\n    const part = (stat && stat.时空 && stat.时空.当前部) || null;\n    const hero = (stat && stat.主角) || null;\n    const idOf = (name) => (lib ? lib.identity(name, part) : String(name).trim());\n    const heroId = hero && hero.姓名 ? idOf(hero.姓名) : null;\n    // 变量里的档案：正文写全名，变量里可能记的是别名，两边都试\n    function person(name) {\n      if (!stat) return null;\n      const tries = [String(name).trim()].concat(lib ? lib.alsoKnownAs(name, part) : []);\n      for (const n of tries) {\n        if (hero && hero.姓名 === n) return hero;\n        if (stat.人物 && stat.人物[n]) return Object.assign({ 姓名: n }, stat.人物[n]);\n      }\n      return null;\n    }\n    function tone(name) {\n      const id = idOf(name);\n      if (heroId && id === heroId) return 'hero';\n      let hash = 2166136261;\n      for (const ch of id) { hash ^= ch.codePointAt(0); hash = Math.imul(hash, 16777619); }\n      return String((hash >>> 0) % 8);\n    }\n    const chosen = env.chosen || {};\n    function avatar(name) {\n      const n = String(name).trim(), p = person(n);\n      const canon = lib ? lib.canon(n, part) : null;\n      const mine = chosen[n] || (canon && chosen[canon]) || (p && chosen[p.姓名]) || null;\n      if (mine && mine.src) return mine.src;\n      const hit = lib ? lib.pick(n, { part, age: p ? p.年龄 : null, choice: mine && mine.pick }) || (p ? lib.pick(p.姓名, { part, age: p.年龄, choice: mine && mine.pick }) : null) : null;\n      if (hit) return hit.src;\n      return heroId && idOf(n) === heroId ? env.persona || null : null;\n    }\n    // 头像外圈：这个人使用中武魂的最高魂环色；魂兽按修为年限\n    function rim(name) {\n      const p = person(name);\n      if (!p) return null;\n      const souls = entries(p.武魂).map(([, w]) => w);\n      const soul = souls.find((w) => w.使用中 && (w.魂环 || []).length) || souls.find((w) => (w.魂环 || []).length);\n      if (soul) return ringLook(topRing(soul.魂环)).color;\n      return p.修为年限 ? ringLook({ 年限: p.修为年限, 凶兽: p.凶兽 }).color : null;\n    }\n    // 此刻该显示的名字：变量里记全名、写了“称呼”或正处在别的阶段（斗3 的娜儿、古月）时换成那个叫法；正文明写别的叫法时照写的\n    const date = stat && stat.时空 ? stat.时空.外界日期 : null;\n    function shown(name) {\n      const n = String(name).trim(), p = person(n);\n      return lib && lib.persona ? lib.persona(n, { part, date, call: p && p.姓名 === n ? p.称呼 : null }) || n : n;\n    }\n    // 叙述里可以自动认的名字：主角、变量里的人物、头像库的全名和这一部有效的别名；撞词名不算\n    const known = new Set(lib ? lib.names(part) : []);\n    if (hero && hero.姓名) known.add(hero.姓名);\n    for (const [n] of entries(stat && stat.人物)) known.add(n);\n    const list = [...known].filter((n) => [...n].length >= 2 && !(lib && lib.ambiguous(n))).sort((a, b) => b.length - a.length);\n    const esc = (s) => s.replace(/[.*+?^${}()|[\\]\\\\]/gu, '\\\\$&');\n    const finder = new RegExp(INLINE_NAME + (list.length ? '|(' + list.map(esc).join('|') + ')' : ''), 'gu');\n    return { env, stat, lib, part, hero, heroId, idOf, person, tone, avatar, rim, finder, shown };\n  }\n\n  // 名字里标记哪几个字：奇数位、最后一字不标（两字三字标第 1 字，四字五字标第 1、3 字）；间隔号不算字；一字名标那个字；英文名标首字母\n  function nameGlyphs(name) {\n    const chars = [...String(name == null ? '' : name)];\n    let marked;\n    if (/^[A-Za-z]/u.test(chars[0] || '')) marked = [0];\n    else {\n      const counted = chars.map((ch, i) => (SEP.test(ch) ? -1 : i)).filter((i) => i !== -1);\n      marked = counted.length <= 1 ? counted : counted.filter((_, k) => k % 2 === 0 && k < counted.length - 1);\n    }\n    return chars.map((ch, i) => ({ ch, hi: marked.includes(i) }));\n  }\n  function nameTag(name, ctx) {\n    return h('span', { class: 'dlp-name', 'data-dlp-tone': ctx.tone(name), 'data-id': ctx.idOf(name) },\n      nameGlyphs(name).map(({ ch, hi }) => (hi ? h('b', { text: ch }) : ch)));\n  }\n\n  /* ═══════════════ 4. 技能签：先查变量，变量里没有再用正文补写的 ═══════════════ */\n  function skillKind(raw) {\n    const s = String(raw || '').replace(/\\s+/gu, '');\n    let m = /^(?:(.+?)[·・\\-—:：])?第([0-9〇零一二两三四五六七八九十]+)(?:魂技|魂环技?|环)$/u.exec(s);\n    if (m) { const n = cnNumber(m[2]); return { kind: 'ring', soul: m[1] || null, n, label: `第${cnOrdinal(n)}魂技` }; }\n    m = /^(?:(.+?)[·・\\-—:：])?(?:武魂)?真身$/u.exec(s);\n    if (m) return { kind: 'body', soul: m[1] || null, label: '武魂真身' };\n    if (/魂骨/u.test(s)) return { kind: 'bone', part: s.replace(/魂骨.*$/u, '').replace(/[·・]$/u, ''), label: s || '魂骨' };\n    if (/领域/u.test(s)) return { kind: 'domain', label: '领域' };\n    if (/融合/u.test(s)) return { kind: 'fusion', label: '武魂融合技' };\n    if (/魂兽|天赋/u.test(s)) return { kind: 'beast', label: '魂兽技' };\n    if (/魂技/u.test(s)) return { kind: 'ring', soul: null, n: null, label: '魂技' };\n    return { kind: 'other', label: s || '技能' };\n  }\n  const sameName = (a, b) => !!a && !!b && (a === b || a.includes(b) || b.includes(a));\n  function findRing(p, k, name) {\n    const souls = entries(p.武魂).filter(([, w]) => w && Array.isArray(w.魂环));\n    const named = k.soul ? souls.filter(([n]) => sameName(n, k.soul)) : [];\n    const pool = named.length ? named : souls.slice().sort((a, b) => (b[1].使用中 ? 1 : 0) - (a[1].使用中 ? 1 : 0));\n    const hasSkill = (r, exact) => (r.魂技 || []).find((s) => (exact ? s.名称 === name : sameName(s.名称, name)));\n    // 先找“第 n 环上正好有这个魂技”，再找“哪一环上有这个魂技”，最后才只按第 n 环取\n    for (const exact of [true, false]) {\n      if (k.n) for (const [sn, w] of pool) { const r = w.魂环[k.n - 1]; if (r && hasSkill(r, exact)) return { soul: sn, rings: w.魂环, index: k.n - 1, skill: hasSkill(r, exact) }; }\n      if (name) for (const [sn, w] of pool) { const i = w.魂环.findIndex((r) => hasSkill(r, exact)); if (i !== -1) return { soul: sn, rings: w.魂环, index: i, skill: hasSkill(w.魂环[i], exact) }; }\n    }\n    if (k.n) for (const [sn, w] of pool) if (w.魂环[k.n - 1]) return { soul: sn, rings: w.魂环, index: k.n - 1, skill: null };\n    return null;\n  }\n  // 返回画卡片要的全部内容；loose 为 true 表示年限或效果不是从变量来的\n  function resolveSkill(tag, ctx) {\n    const k = skillKind(tag.kind), p = ctx.person(tag.who);\n    const said = yearsOf(tag.years);\n    const out = { who: tag.who, kind: k.kind, label: k.label, name: tag.name, sub: '', look: null, rings: null, index: -1, gold: 0, years: null, beast: '', cost: '', effect: '', extra: '', loose: false, numeral: '' };\n    let hit = false;\n    if (p && k.kind === 'ring') {\n      const f = findRing(p, k, tag.name);\n      if (f) {\n        hit = true;\n        const r = f.rings[f.index];\n        Object.assign(out, { sub: f.soul, rings: f.rings.map(ringLook), index: f.index, look: ringLook(r), beast: r.来源魂兽 || (r.魂灵 && r.魂灵.名称) || '', label: `第${cnOrdinal(f.index + 1)}魂技`, numeral: cnOrdinal(f.index + 1) });\n        if (f.skill) { out.effect = f.skill.效果 || ''; out.cost = f.skill.消耗 || ''; if (!out.name) out.name = f.skill.名称; }\n      }\n    } else if (p && k.kind === 'body') {\n      const souls = entries(p.武魂).filter(([, w]) => w && (w.魂环 || []).length);\n      const f = souls.find(([n]) => k.soul && sameName(n, k.soul)) || souls.find(([n]) => sameName(n, tag.name)) || souls.find(([, w]) => w.使用中) || souls[0];\n      if (f) { hit = true; Object.assign(out, { sub: f[0], rings: f[1].魂环.map(ringLook), look: ringLook(topRing(f[1].魂环)) }); }\n    } else if (p && k.kind === 'bone') {\n      const f = entries(p.魂骨).find(([, b]) => b.名称 === tag.name || (b.技能 || []).some((s) => s.名称 === tag.name)) || entries(p.魂骨).find(([part]) => k.part && sameName(part, k.part));\n      if (f) {\n        hit = true;\n        const [part, b] = f, sk = (b.技能 || []).find((s) => s.名称 === tag.name) || (b.技能 || [])[0];\n        Object.assign(out, { sub: b.名称 === out.name ? '' : b.名称, label: (part === '外附' ? '外附魂骨' : part + '魂骨'), look: ringLook({ 年限: b.年限 }), beast: b.来源魂兽 || '', effect: sk ? sk.效果 || '' : '' });\n      }\n    } else if (p && k.kind === 'domain') {\n      const f = entries(p.领域).find(([n]) => sameName(n, tag.name));\n      if (f) { hit = true; Object.assign(out, { effect: f[1].效果 || '', extra: f[1].层次 === '神级' ? '神级领域' : '', look: f[1].层次 === '神级' ? ringLook({ 神级: true }) : null, sub: f[1].环境加成 || '' }); }\n    } else if (p && k.kind === 'fusion') {\n      const f = entries(p.融合技).find(([n]) => sameName(n, tag.name));\n      if (f) { hit = true; Object.assign(out, { effect: f[1].效果 || '', partners: f[1].搭档 || [], extra: f[1].契合度 != null ? `契合度 ${f[1].契合度}%` : '' }); }\n    } else if (p && k.kind === 'beast') {\n      const f = entries(p.天赋能力).find(([n]) => sameName(n, tag.name));\n      if (f) { out.effect = f[1].效果 || ''; out.cost = f[1].消耗 || ''; }\n      if (p.修为年限) { hit = true; out.look = ringLook({ 年限: p.修为年限, 凶兽: p.凶兽 }); out.sub = p.种族 || ''; }\n    }\n    // 变量里没有的，用正文补写的年限和效果\n    if (!out.look && said) { out.look = ringLook({ 年限: said.years, 神级: said.god }); out.loose = true; }\n    if (!out.effect && tag.effect) { out.effect = tag.effect; out.loose = true; }\n    if (!hit && !out.loose && (tag.years || tag.effect)) out.loose = true;\n    if (out.kind === 'ring' && !out.numeral) { out.numeral = k.n ? cnOrdinal(k.n) : ''; if (!out.rings && out.look) { out.rings = [out.look]; out.index = 0; } }\n    if (out.look) { out.years = out.look.years; out.gold = out.look.gold; }\n    // 融合技的另一半：搭档使用中武魂的最高魂环色\n    if (out.kind === 'fusion') {\n      const mine = ctx.rim(tag.who), other = (out.partners || []).map((n) => ctx.rim(n)).find(Boolean);\n      out.pair = [mine, other || mine];\n    }\n    return out;\n  }\n\n  /* ═══════════════ 5. 画：幕签、转场、对白、技能卡 ═══════════════ */\n  const PART_MARK = { 斗1: ['壹', 'DL-01'], 斗2: ['贰', 'DL-02'], 神界: ['神', 'DL-SJ'], 英雄: ['英', 'DL-YX'], 斗3: ['叁', 'DL-03'], 斗4: ['肆', 'DL-04'] };\n  const two = (v) => String(v).padStart(2, '0');\n  function storyCard(fields, ctx) {\n    const act = ctx.env.acts && ctx.env.acts.resolve ? ctx.env.acts.resolve({ arc: fields.arc, no: fields.no, title: fields.title, part: ctx.part }) : null;\n    const known = !!(act && act.known);\n    const part = (act && act.part) || ctx.part;\n    const ymd = storyDate(fields.date);\n    const no = known ? act.no : fields.no;\n    const mark = PART_MARK[part] || ['幕', 'DL-00'];\n    return h('div', { class: 'dlp dlp-story', 'data-known': String(known) },\n      h('span', { class: 'dlp-st-mark', 'aria-hidden': 'true' },\n        h('span', { class: 'dlp-st-m dlp-st-m--seal', text: mark[0] }), h('span', { class: 'dlp-st-m dlp-st-m--code', text: mark[1] }),\n        sv('svg', { class: 'dlp-st-m dlp-st-m--tree', viewBox: '0 0 40 40' }, [6, 11, 16].map((r, i) => sv('circle', { cx: 20, cy: 20, r, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-dasharray': `${r * 3.6} ${r * 1.1}`, 'stroke-dashoffset': i * 9, opacity: 1 - i * 0.22 })), sv('circle', { cx: 20, cy: 20, r: 2, fill: 'currentColor' })),\n        sv('svg', { class: 'dlp-st-m dlp-st-m--star', viewBox: '0 0 40 40' }, sv('circle', { cx: 20, cy: 20, r: 15, fill: 'none', stroke: 'currentColor', 'stroke-width': 1, opacity: 0.55 }),\n          sv('path', { d: 'M31 3l1.7 5.6L38 10.3l-5.3 1.7L31 17.6l-1.7-5.6L24 10.3l5.3-1.7z', fill: 'currentColor' }),\n          sv('text', { x: 20, y: 21, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 13, fill: 'currentColor', text: mark[0] }))),\n      h('span', { class: 'dlp-st-main' },\n        h('span', { class: 'dlp-st-top' },\n          fields.date ? h('span', { class: 'dlp-st-date', text: ymd ? `斗罗历${ymd.bc ? '前 ' : ' '}${ymd.y} 年 ${two(ymd.m)} 月 ${two(ymd.d)} 日` : fields.date }) : null,\n          (known ? act.arc : fields.arc) ? h('span', { text: known ? act.arc : fields.arc }) : null),\n        h('strong', { class: 'dlp-st-title', text: (known ? act.title : fields.title) || (no ? `第${cnOrdinal(no)}幕` : '') })),\n      no ? h('span', { class: 'dlp-st-no' }, h('b', { text: `第${cnOrdinal(no)}幕` }), known ? h('small', { text: `本篇 ${act.at} / ${act.of}` }) : null) : null);\n  }\n  function sceneLine(part) {\n    return h('div', { class: 'dlp dlp-scene' },\n      h('i', { class: 'dlp-sc-rule', 'aria-hidden': 'true' }),\n      h('span', { class: 'dlp-sc-tag' }, h('span', { class: 'dlp-sr', text: '转场：' }), part.place ? h('b', { text: part.place }) : null, part.time ? h('small', { text: part.time }) : null),\n      h('i', { class: 'dlp-sc-rule', 'aria-hidden': 'true' }));\n  }\n  function face(name, ctx) {\n    const src = ctx.avatar(name), rim = ctx.rim(name);\n    const glyph = () => h('b', { text: ([...name].find((ch) => !SEP.test(ch)) || '?').toUpperCase() });\n    const box = h('span', { class: 'dlp-face', 'aria-hidden': 'true', style: { '--dlp-rim': rim } });\n    if (!src) return add(box, [glyph()]);\n    const img = h('img', { src, alt: '', decoding: 'async', draggable: 'false' });\n    img.addEventListener('error', () => img.replaceWith(glyph()), { once: true });\n    return add(box, [img]);\n  }\n  function sayRow(part, ctx) {\n    const me = !!ctx.heroId && ctx.idOf(part.name) === ctx.heroId;\n    const name = ctx.shown(part.name);\n    return h('div', { class: 'dlp dlp-say', 'data-side': me ? 'me' : 'them', 'data-cont': part.cont || null, 'data-dlp-tone': ctx.tone(part.name) },\n      part.cont ? h('span', { class: 'dlp-gap', 'aria-hidden': 'true' }) : face(name, ctx),\n      h('div', { class: 'dlp-col' },\n        part.cont ? h('span', { class: 'dlp-sr', text: name + '：' }) : nameTag(name, ctx),\n        h('p', { class: 'dlp-bubble' }, part.speech, part.closed ? null : h('i', { class: 'dlp-caret', 'aria-hidden': 'true' }))));\n  }\n\n  // 徽记：100×100 的小画，画法按技能类别分\n  function ringSet(looks, active, all, svg) {\n    const n = looks.length, inner = n > 1 ? 21 : 34, step = n > 1 ? (45 - inner) / (n - 1) : 0;\n    return looks.map((look, i) => {\n      const r = inner + step * i, C = 2 * Math.PI * r, on = i === active;\n      const w = all ? clamp(step * 0.6 || 5, 2, 5) : on ? clamp(step * 0.95 || 6, 3.6, 6) : clamp(step * 0.36 || 2, 1.1, 2.2);\n      const g = sv('g', { class: 'dlp-rg' + (all ? ' dlp-rg--all' : on ? ' dlp-rg--on' : '') + (look.rainbow ? ' dlp-rg--rb' : ''), style: { '--i': String(i) } },\n        sv('circle', { class: 'dlp-rg-e', cx: 50, cy: 50, r: f1(r), 'stroke-width': f1(w + 1.1) }),\n        look.glow ? sv('circle', { class: 'dlp-rg-c', cx: 50, cy: 50, r: f1(r), stroke: look.glow, 'stroke-opacity': 0.3, 'stroke-width': f1(w * 2.2) }) : null,\n        sv('circle', { class: 'dlp-rg-c', cx: 50, cy: 50, r: f1(r), stroke: lookPaint(look, svg), 'stroke-width': f1(w), pathLength: 100, 'stroke-dasharray': 100, transform: 'rotate(-90 50 50)' }));\n      if (look.gold && (on || all)) {\n        const k = Math.min(look.gold, 9), dl = Math.min(C * 0.05, (C / k) * 0.5);\n        g.append(sv('circle', { class: 'dlp-rg-g', cx: 50, cy: 50, r: f1(r), 'stroke-width': f1(Math.max(w * 0.6, 0.9)), 'stroke-dasharray': `${f1(dl)} ${f1(C / k - dl)}` }));\n      }\n      return g;\n    });\n  }\n  function emblem(info) {\n    const svg = sv('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });\n    const glyph = (t, size) => sv('text', { x: 50, y: 50, 'font-size': size || 22, text: t });\n    if (info.kind === 'ring' && info.rings) {\n      const n = info.rings.length, r = n > 1 ? 21 + ((45 - 21) / (n - 1)) * info.index : 34;\n      add(svg, [ringSet(info.rings, info.index, false, svg), sv('circle', { class: 'dlp-rg-halo', cx: 50, cy: 50, r: f1(r), 'stroke-width': 3 }), info.numeral ? glyph(info.numeral, n > 6 ? 17 : 21) : null]);\n    } else if (info.kind === 'body' && info.rings) {\n      add(svg, [ringSet(info.rings, -1, true, svg), sv('circle', { class: 'dlp-rg-halo', cx: 50, cy: 50, r: 45, 'stroke-width': 3 }), glyph('真', info.rings.length > 6 ? 17 : 21)]);\n    } else if (info.kind === 'domain') {\n      add(svg, [[44, 31, 18].map((r, i) => sv('g', { class: 'dlp-em-rip', style: { '--i': String(2 - i) } }, sv('circle', { class: 'dlp-em-fill', cx: 50, cy: 50, r }), sv('circle', { class: 'dlp-em-line', cx: 50, cy: 50, r, 'stroke-width': i ? 1.2 : 2.4, 'stroke-dasharray': i === 1 ? '2 4' : null }))), glyph('域', 20)]);\n    } else if (info.kind === 'fusion') {\n      const [a, b] = info.pair || [];\n      add(svg, [sv('g', { class: 'dlp-em-a' }, sv('circle', { class: 'dlp-rg-e', cx: 37, cy: 50, r: 25, 'stroke-width': 6.6, fill: 'none' }), sv('circle', { cx: 37, cy: 50, r: 25, fill: 'none', stroke: a || 'var(--dlp-rcv)', 'stroke-width': 5.5 })),\n        sv('g', { class: 'dlp-em-b' }, sv('circle', { class: 'dlp-rg-e', cx: 63, cy: 50, r: 25, 'stroke-width': 6.6, fill: 'none' }), sv('circle', { cx: 63, cy: 50, r: 25, fill: 'none', stroke: b || 'var(--dlp-rcv)', 'stroke-width': 5.5 })),\n        sv('path', { class: 'dlp-em-ink', d: 'M50 28.6A25 25 0 0 1 50 71.4A25 25 0 0 1 50 28.6Z', opacity: 0.16 }), sv('circle', { class: 'dlp-rg-halo', cx: 50, cy: 50, r: 30, 'stroke-width': 3 })]);\n    } else if (info.kind === 'bone') {\n      add(svg, [sv('circle', { class: 'dlp-rg-e', cx: 50, cy: 50, r: 42, 'stroke-width': 4.6, fill: 'none' }), sv('g', { class: 'dlp-rg dlp-rg--on' }, sv('circle', { class: 'dlp-rg-c', cx: 50, cy: 50, r: 42, stroke: (info.look && info.look.color) || 'var(--dlp-line2)', 'stroke-width': 3.6, pathLength: 100, 'stroke-dasharray': 100, transform: 'rotate(-90 50 50)' })),\n        sv('circle', { class: 'dlp-rg-halo', cx: 50, cy: 50, r: 42, 'stroke-width': 3 }),\n        sv('g', { class: 'dlp-em-ink', transform: 'rotate(-45 50 50)' }, sv('rect', { x: 31, y: 45.5, width: 38, height: 9, rx: 3 }), [[31, 44], [31, 56], [69, 44], [69, 56]].map(([x, y]) => sv('circle', { cx: x, cy: y, r: 6.4 })))]);\n    } else if (info.kind === 'beast') {\n      add(svg, [[44, 36, 28, 20, 12].map((r, i) => sv('g', { class: 'dlp-em-rip', style: { '--i': String(4 - i) } }, sv('circle', { class: 'dlp-em-line', cx: 50, cy: 50, r, 'stroke-width': i ? 1.3 : 2.6, 'stroke-dasharray': `${f1(r * (2.2 + i * 0.7))} ${f1(r * 0.5)}`, 'stroke-dashoffset': i * 17, opacity: f1(1 - i * 0.13) }))), sv('circle', { class: 'dlp-rg-halo', cx: 50, cy: 50, r: 44, 'stroke-width': 3 })]);\n    } else {\n      add(svg, [sv('circle', { class: 'dlp-em-line', cx: 50, cy: 50, r: 38, 'stroke-width': 2, 'stroke-dasharray': '3 5' }), sv('circle', { class: 'dlp-rg-halo', cx: 50, cy: 50, r: 38, 'stroke-width': 3 }), glyph('技', 22)]);\n    }\n    return svg;\n  }\n  function skillCard(part, ctx, key) {\n    const info = resolveSkill(part, ctx);\n    const look = info.look;\n    const color = look && look.color ? look.color : info.kind === 'fusion' && info.pair && info.pair[0] ? info.pair[0] : null;\n    const t = ctx.env.playAt ? ctx.env.playAt(key) : null;\n    const meta = [];\n    if (info.kind === 'body' && info.rings) {\n      meta.push(h('span', { class: 'dlp-sk-dot', 'aria-hidden': 'true' }), h('b', { text: `${info.rings.length} 个魂环` }));\n      if (info.years != null) meta.push(h('span', { text: '最高 ' + fmtYears(info.years) }));\n    } else if (look && look.color) {\n      meta.push(h('span', { class: 'dlp-sk-dot', 'aria-hidden': 'true' }));\n      const what = info.kind === 'ring' ? '魂环' : info.kind === 'bone' ? '魂骨' : info.kind === 'beast' ? '修为' : '';\n      meta.push(h('b', { text: look.band + what }));\n      if (info.years != null) meta.push(h('span', { text: fmtYears(info.years) }));\n    }\n    if (info.beast) meta.push(h('span', { text: info.beast }));\n    if (info.gold && info.kind !== 'body') meta.push(h('span', { text: `金纹 ${info.gold} 道` }));\n    if (info.partners && info.partners.length) meta.push(h('span', {}, '搭档 ', info.partners.map((n, i) => [i ? '、' : '', nameTag(n, ctx)])));\n    if (info.extra) meta.push(h('span', { text: info.extra }));\n    if (info.cost) meta.push(h('span', { text: '消耗 ' + info.cost }));\n    if (info.kind !== 'ring' && info.kind !== 'bone' && info.kind !== 'body' && info.sub && info.kind !== 'beast') meta.push(h('span', { text: (info.kind === 'domain' ? '环境加成：' : '') + info.sub }));\n    if (info.loose) meta.push(h('span', { class: 'dlp-sk-loose', title: '这张卡的年限或效果取自正文，变量里还没有记录', text: '未入档' }));\n    return h('div', { class: 'dlp dlp-skill', 'data-kind': info.kind, 'data-dark': look && look.dark ? true : null, 'data-play': t != null ? true : null, 'data-dlp-tone': ctx.tone(info.who),\n      style: { '--dlp-rc': color, '--dlp-t': t != null ? `-${t.toFixed(2)}s` : null } },\n      h('span', { class: 'dlp-sk-em' }, emblem(info)),\n      h('div', { class: 'dlp-sk-body' },\n        h('div', { class: 'dlp-sk-top' }, nameTag(ctx.shown(info.who), ctx),\n          (info.kind === 'ring' || info.kind === 'body' || info.kind === 'bone' || info.kind === 'beast') && info.sub ? h('span', { text: info.sub }) : null,\n          h('b', { class: 'dlp-sk-kind', text: info.label })),\n        h('strong', { class: 'dlp-sk-name', text: info.name || info.label }),\n        meta.length ? h('div', { class: 'dlp-sk-meta' }, meta) : null,\n        info.effect ? h('p', { class: 'dlp-sk-fx', text: info.effect }) : null),\n      h('i', { class: 'dlp-sk-sweep', 'aria-hidden': 'true' }));\n  }\n\n  // 给正文里的人名上色：写成 {名字} 的去掉花括号；已知的名字自动认。代码、折叠块、预设自定义卡片、幕签、转场、已经上过色的不碰\n  const NAME_SKIP = 'code, pre, textarea, script, style, details, summary, .TH-render, [class*=\"custom-\"], .dlp-story, .dlp-scene, .dlp-name, .dlp-face, .dlp-sk-meta, .dlp-sk-name, .dlp-sk-kind, .dlp-nodeco';\n  function decorateNames(root, ctx) {\n    const walker = document.createTreeWalker(root, 4);\n    const hits = [];\n    for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.nodeValue.trim() && !(node.parentElement && node.parentElement.closest(NAME_SKIP))) hits.push(node);\n    for (const node of hits) {\n      const text = node.nodeValue, pieces = [];\n      let cursor = 0;\n      ctx.finder.lastIndex = 0;\n      for (const m of text.matchAll(ctx.finder)) {\n        const name = (m[1] != null ? m[1] : m[2] || '').trim();\n        if (!name || (m[1] != null && !isName(name))) continue;\n        pieces.push(text.slice(cursor, m.index), nameTag(name, ctx));\n        cursor = m.index + m[0].length;\n      }\n      if (!pieces.length) continue;\n      pieces.push(text.slice(cursor));\n      node.replaceWith(...pieces.filter((p) => p !== ''));\n    }\n  }\n  // 块标签交给登记它的脚本画；画不出来（没登记、出错）就把块里的正文照常画在一个素框里，内容不丢\n  function blockEl(part, env, key) {\n    const table = blockTable(), spec = table && table.get(part.tag);\n    const sub = (text) => build(String(text == null ? '' : text), env);\n    if (spec && typeof spec.render === 'function') {\n      try {\n        const out = spec.render(part, { h, sv, sub, env, key, playAt: env.playAt ? () => env.playAt(key) : () => null });\n        if (out && out.nodeType) return out;\n      } catch (e) { console.error(`[正文本体] 块标签 <${part.tag}> 没画出来，按普通正文显示`, e); }\n    }\n    return h('div', { class: 'dlp dlp-block', 'data-tag': part.tag }, sub(part.inner));\n  }\n  // 一条回复 → 一组节点。正文先把幕签、转场、对白、技能签、块标签换成占位字，整段交给酒馆排版一次，再把占位字换回做好的元素\n  const SLOT = /DLPSLOT(\\d+)Q/gu;\n  function build(text, env) {\n    const ctx = context(env || {});\n    const { parts } = parse(text);\n    const made = [];\n    let source = '', skills = 0, blocksSeen = 0;\n    for (const part of parts) {\n      if (part.type === 'text') { source += part.text; continue; }\n      const el = part.type === 'story' ? storyCard(part.fields, ctx) : part.type === 'scene' ? sceneLine(part) : part.type === 'skill' ? skillCard(part, ctx, `${env.floor == null ? '' : env.floor}:${skills++}:${part.who}:${part.name}`)\n        : part.type === 'block' ? blockEl(part, env, `${env.floor == null ? '' : env.floor}:b${blocksSeen++}:${part.tag}`) : sayRow(part, ctx);\n      source += `\\n\\nDLPSLOT${made.length}Q\\n\\n`;\n      made.push(el);\n    }\n    const holder = document.createElement('div');\n    if (source.trim()) holder.innerHTML = env.format ? env.format(source) : '';\n    const placed = new Set();\n    const take = (i) => { const el = made[+i]; if (!el || placed.has(el)) return null; placed.add(el); return el; };\n    const SLOT_SKIP = 'code, pre, textarea, script, style';\n    const walker = document.createTreeWalker(holder, 4), hits = [];\n    for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.nodeValue.includes('DLPSLOT') && !(node.parentElement && node.parentElement.closest(SLOT_SKIP))) hits.push(node);\n    for (const node of hits) {\n      const tokens = [...node.nodeValue.matchAll(SLOT)], parent = node.parentElement;\n      // 排版后整段只剩一个占位字：整段换掉\n      if (tokens.length === 1 && parent && parent !== holder && parent.textContent.trim() === tokens[0][0]) { const el = take(tokens[0][1]); if (el) parent.replaceWith(el); else parent.remove(); continue; }\n      const out = [];\n      let cursor = 0;\n      for (const tk of tokens) { out.push(node.nodeValue.slice(cursor, tk.index)); const el = take(tk[1]); if (el) out.push(el); cursor = tk.index + tk[0].length; }\n      out.push(node.nodeValue.slice(cursor));\n      node.replaceWith(...out.filter((p) => p !== ''));\n    }\n    // 排版吞了占位字（没配对的反引号、没收尾的标签被显示正则一路删到底等）：改成一段一段排，坏一段不连累后面的叙述\n    if (placed.size < made.length && env.format) {\n      holder.replaceChildren();\n      let i = 0;\n      for (const part of parts) {\n        if (part.type !== 'text') { holder.append(made[i++]); continue; }\n        if (!part.text.trim()) continue;\n        const box = document.createElement('div');\n        box.innerHTML = env.format(part.text);\n        holder.append(...box.childNodes);\n      }\n    }\n    for (const el of made) if (!holder.contains(el)) holder.append(el);\n    decorateNames(holder, ctx);\n    return [...holder.childNodes];\n  }\n\n  const THEMES = ['shouzha', 'zhongduan', 'senlin', 'hai', 'xing', 'liu', 'bing', 'lei', 'sheng'];\n  // 给正文容器挂主题、动效、底色深浅；传 null 则摘掉\n  function look(el, o) {\n    if (!el) return;\n    if (!o) { delete el.dataset.dlpTheme; delete el.dataset.dlpMotion; delete el.dataset.dlpSurface; return; }\n    el.dataset.dlpTheme = THEMES.includes(o.theme) ? o.theme : 'shouzha';\n    el.dataset.dlpMotion = o.motion === 'reduced' || o.motion === 'off' ? o.motion : 'full';\n    el.dataset.dlpSurface = o.surface === 'light' ? 'light' : 'dark';\n  }\n  // 没有状态栏时自己按当前部挑主题：斗1、斗2 用魂师手札，斗3、斗4 用联邦终端\n  const themeOf = (stat) => { const p = stat && stat.时空 && stat.时空.当前部; return p === '斗3' || p === '斗4' ? 'zhongduan' : 'shouzha'; };\n\n  window.DLProse = { build, has, look, themeOf, pure: { parse, nameGlyphs, cnNumber, yearsOf, fmtYears, ringLook, skillKind, resolveSkill, context, storyFields } };\n})();";
const DL_ACTS = [["斗1","圣魂村篇",["绝崖转生风雨入世","教皇易位四族流离","封号旧怨与皇室暗毒","幼子试炼双魂初醒"]],["斗1","诺丁篇",["拜师结伴同入魂途","父亲托孤兄妹相认","六年学业与各方伏流"]],["斗1","怪物学院篇",["索托交锋闯关入学","骄傲碰壁首战斗魂"]],["斗1","星斗森林篇",["香肠晋阶争取蛇环","追妹猎蛛外骨初生"]],["斗1","索托斗魂篇",["负重同担共历苦训","面具七怪迎战皇斗","师门重逢筹谋远行"]],["斗1","天斗学院篇",["别院远行皇城受逐","毒谷求生师长来援","半年疗毒携草归来","九宝惊宗力王败阵","黑锤认主暗器订约","月夜寄情猎魂启程","毒阵诱兽万年入环"]],["斗1","精英大赛篇",["开幕扬威结识太子","团控破甲残梦设伏","魂骨守密再胜炽火","识破幻阵预赛出线","柔技启悟晋级初战","凤凰扬威雷霆鏖战","黑锤破风赴城遇袭"]],["斗1","武魂城决赛篇",["星罗死局七怪共破","三强争先真身破局","逆转夺冠身份惊变"]],["斗1","杀戮之都篇",["离别入谷封魂锤炼","瀑断皇醒踏入杀都","百胜结盟再闯血路","血湖归来月轩洗心","猎魂再启返谷知亲"]],["斗1","昊天归来篇",["还骨归宗铁索立约","五年重聚宗门惊变","埋骨立誓孤身寻舞","双王受困血祭救爱","复生有望归校见师"]],["斗1","异界唐门篇",["重认恋人唐门立志","远赴四族御族入唐","舅爷认亲破枪合流","旧友争院整备采购","神匠入唐带宝返城","病帝垂危识破太子","护帝破围乱军覆灭","同赴海岛托付宗门","母前订婚拜师受宝","西行遇狼抵达海城"]],["斗1","海神岛篇",["试水备航海盗引鲸","失散获救海岛重聚","辞别吉祥登岛受考","九考降临初探神阶","苦修神环冲阶将至","合力登顶再迎环海","鲨海练战凤凰七首","破海通关怒浪锻体","鲨鲸血战海光初成","蓄力备战七柱开局","七柱连战人鱼设局","锤龙定约祭司杀局","借力脱身神戟认主"]],["斗1","复生归来篇",["帝国变局杀王认亲","双王献祭小舞归魂","两地诀别父母复生","重归宗门为父正名"]],["斗1","嘉陵关圣战篇",["帝师归军筹守粮道","截粮破敌大军初胜","负伤退敌再谋攻关","破门遇援父锤救军","休兵求神天使传承","祖祭成神林中猎环","吞蛛猎蚁天使截途","炸环赌战观音破神","日剑追杀海边重聚","鏖战魔鲸完成八考","悼祖辞祭跨入神殿","七情历尽海神再现","海岸神战双辅蒙选","九环归齐天使守关","海神临军七怪破关","神战破敌海雨纳降","罗刹反扑海神殒身","神魂闭修双神共存","四约止战故村留名"]],["斗2","灵眸少年篇",["离府少年入唐门"]],["斗2","史莱克新生篇",["入学合寝初斗魂","洗髓组队闯考核","魂力互通结浩冬","黄金初现争魂骨","师门争才备决赛","夺冠分骨入魂导","魂导初学越旧怨","魂导成器与假期"]],["斗2","极北之行篇",["冰帝换骨成双魂","迟归再拜双师","模拟红环惊考场","极冰满分争归属"]],["斗2","史莱克预备队篇",["双系共育逢截杀","聚宝淬体成预备","混编对抗掌主控","监察出征遇生父","尸爆折翼赴星罗"]],["斗2","初代大赛篇",["残阵首战扬唐门","个人连胜购魂器","生灵凶刀与强敌","正天逆战亮昊天","险后护短备斗灵","顶拍重宝引争锋","重宝换器胜斗灵","生灵开眼战星罗","冰金护姐退本体","决赛揭局战日月","玄武血战破冰蟾","黑凰霓裳夺桂冠","冠军归途暗流起"]],["斗2","星斗历练篇",["终身七怪唐雅变","拜师退毒邀红尘","冰爆猎熊融恐爪","人兽相逢拓命运","封环启眼单兵试","长修别师承遗命","闭关惜别赴交流"]],["斗2","明都交流篇",["体测立约师徒初逢","烤肉旧情狼围初起","银狼取环舍身护伴","皇室私刑与橘辞行","地袭明德夺巨人","封雪本源百战立威","鏖战剑痴入深冥","净魂救娜入海神","冬归重逢援橘营","伤复携冬闯昊天","燃识留魂雪婴生","雪域试泰制器百日","奇作换鳞别明德"]],["斗2","海神缘篇",["龙皇截途惊见秋影","灯下摘笠述少年","缘定冬儿霓裳归","魂契入阁备猎环"]],["斗2","唐门壮大篇",["七怪再聚磨战阵","双王取环逢猎熊","枪断三邪命运融","救伤育幼各取环","剑师入门双队成","金枪破阵留手情","天梦为灵拆封囊","冰火险途试真心","雪剑夺书血摘红","两女护爱熬昏伤","引寒复魂坐椅出征"]],["斗2","明都大赛篇",["轮椅赴明初逢雅","采购双约摄政开赛","雪灵连胜收秋秋","七盾逆时换组晋","地下立威遇宿敌","冰雪破日月旧队","换阵封龙再取胜","金属黑赛添新友","金龙枪决红尘恋","晨露授法灰环醒","贝归试界分双赛","骄阳借日擂台胜","双生龙合败雪魔","仓谋封城争出线","唤雅弃胜团破邪","退邪会盟宫变起","分神赴赛暗潜仓","取金盗库压线成甲","灾爆夺冠出西山"]],["斗2","乾坤问情篇",["湖锁问情剖旧念","生死问爱同闯关","舍关救父再救兄","真心各明死生炼","舍命救冬梦暂沉"]],["斗2","日升营救篇",["辞冬复腿再谋援囚","领队换翼海陆迂回","租船混城夜识囚影","净怨救友唤回小桃","配药开牢南阵夺路","救母遇伏燃念诛邪","瑞兽献祭载运诀别"]],["斗2","兽神传灵篇",["孤寻邪眼兽潮压城","联炮杀虎爆盾护妻","亡灵退兽平生存争","平等契约首成魂灵","立塔三月逆鳞留身"]],["斗2","白虎军旅篇",["八角成灵冬醒失忆","易名入伍虎弟开血","西疆崩线幻军救父","滴血认弟误中牵制","死神白光催建新军"]],["斗2","魂核明斗篇",["通灵弃猎金盾回刃","溪畔误认故味旧情","寒空触悟盗高探","联杀狂牛夜抚旧伤","虎牙别弟潜明斗","死神压顶兽影退敌","险凝魂核被责独行","情绪结核筹北行"]],["斗2","冰原奇袭篇",["龙城采髓雪帝醒","试温变巧脱火凤","帅营拒战踏冰原","传位聚兽雪袭矿","毁矿潜都冰爆报复","龙皇截路擒同伴"]],["斗2","龙丹救雅篇",["九刀尽受借龙丹","制炮获准赴天灵","扮邪寻雅炸二团","舍肩迎枪带雅还"]],["斗2","冬忆归一篇",["悬赏药源白熊渡劫","四技重融认归人","共修连情神谷留念","神刀成炉炼七丹"]],["斗2","分丹蓄势篇",["分丹长修三团待发","十七强者潜明都","毒燃殒命掳子生争","不索代价送子归宫"]],["斗2","北海奇兵篇",["三团蛙跳北疆惊","净东阳怨同门试技","神影止杀人鱼为灵","海修南袭谋撼帝都","丽歌清天太阿爆宫","草木引路皇草愿随"]],["斗2","双核围城篇",["皇草醒雅六灵凝核","双核迎帝夜问橘诺"]],["斗2","斗灵救亡篇",["斩首惊城远炮耗敌","亡灵嫁祸徐摄斗灵","逼教十战魂灭乌云","救桃净龙冰爆斩廖","魔傀伤舞昊天求救","阴阳双核定斗灵"]],["斗2","灭圣灵篇",["逼红尘问军见谷袭","联血催军入火凤","龙叶传功终散尽","太阿灭教斩邪眼","刺帝暗海反控邪魂"]],["斗2","三核靖世篇",["三年三核战围星罗","换父灭军揭亲休战"]],["斗2","情绪神位篇",["墓前释恨败兽升神","七情破考团聚天斗"]],["神界","神枢暗涌篇",["委员争执麟儿喜讯","古堡密谋半年静默","原罪突袭诸神受困","白虎破封交钥护妻"]],["神界","神禁求援篇",["神枢扩张潜入禁地","冰火破障父女重逢","修罗醒神师尊出山","生命垂泪元素归心"]],["神界","古堡神战篇",["古堡对峙夫妻决裂","原罪神罚化铠死战","浩冬三绝燃魂一击","往事温存麟儿破封"]],["神界","七怪决胜篇",["七怪重聚生命祝福","修罗血剑食神惊世","海神镇敌破坏反水","灰点成劫众神同舟"]],["神界","创世送子篇",["双王归源创世护界","金龙破茧修罗诱敌","三界审判神核灌婴","十八血封神界远遁"]],["英雄","黑洞定神篇",["思子心悸泣血脱流","分神探墓竹院会帝","敛息藏锋引界入阵","折冲樽俎以一敌六"]],["英雄","跨界认子篇",["奇兵替补仙宫惧内","死神解结魔厨亮刃","狂天备战跨界认子","神眷云集古迹定规"]],["英雄","古迹争锋篇",["八指禁空七曜初鸣","死光拒敌圣剑救场","神识震场善恶同生","英魂对垒两极破阵"]],["英雄","七曜破局篇",["神爪控场双锤奇袭","七曜咏叹仁心救敌","神戟归手独战三王","舍利问心还戟麟儿"]],["英雄","混沌创圈篇",["七界交心诀别备战","诸界对撞同心挽枢","蛛矛锁枢众王创世","永恒开眸千载寻麟"]],["斗3","傲来童年篇",["银兽破湖率众出林","燃核殉妻封修保命","娜儿留坠离家兄遍寻"]],["斗3","东海入学篇",["独赴东海入五班","古月入班三友合练","拳破前锋首战胜四班","半时千锻借材迎龙关"]],["斗3","东海零班篇",["升班立零班签留校","鹰击惹鸟群率先退","三月合练磨成小队","古月诱矛破冰杖","两人选唐门古月辞邀","白剑破魔猿误取灵","赴天海睡醒破十七","不服饭输自创大吃","连胜磨功共立斗铠志","招刀入军屡败仍战","求留无果知须放手"]],["斗3","新生斗铠篇",["离海乘车初抵史城","金爪托刃背友过门","星锁落锤巧赢水晶","肯向蔡老认错","卖锻换饭结识原恩","暗镰追斩显四环敌","四业合课均衡分组","借药破开第三封印","赔铁示徽引来鉴银","破雪逐熊留敌休整","三融并练忙至满月","谢邂以伤换镰退敌","由内铸钛创生获胜"]],["斗3","十城历练篇",["搜尽资源各自出门","认得师伯求折现","负师责请饭明心","纸塞卸势立战阵","康复坚持返列车","隐私冲突伤恩谢"]],["斗3","跨级备甲篇",["闻蓝苏醒偿护恩","守护之愿入斗魂","圣匠相试激长弓","血锤镇恶灵赢赛","获许全材昼夜谋战","离行惜别月问喜欢"]],["斗3","星罗海行篇",["交班惜别赴海城","拜师苦海四十八日","访宗主话冷遣银球"]],["斗3","星罗天才篇",["问杀不信笑游逢殿下","装迟钝双击破兄妹","抽中狐王押万年灵物","秋千思兄仍求强自守","讲金银本源指压山龙","弃蓄闪背破影王终局","让赛留力连晋双龙决","压抑一周补齐星银甲","地狱魔影合泰坦摔虎"]],["斗3","龙谷葬骨篇",["龙谷结伴寻龙墓","银龙裂谷留人葬骨","葬龙毕受群魂回赠"]],["斗3","龙枪姻缘篇",["归校赶上海神缘","影分四摘仍未见原恩","两友求爱舞丝朵皆拒","两女告白皆拒娜儿开口"]],["斗3","北海魔岛篇",["血雾收全甲一字终成套","皇草通岛金老赐造化","重压缚蝠霸王炎焚尽","四日车行重议七怪合练","独闯碎气先入生命谷","渡海潜掘军团地道","老魔揭史说明规矩"]],["斗3","圣城陨落篇",["圣灵炸城墨武殉职","吼断怨流破骷髅","龙血酒破九封双循","古月震属拒绝合谋","地下守学一年无离","龙梦见灾醒谢遗赠","茶楼密会再访冰火","双龙护菊共分药力"]],["斗3","血神从军篇",["万里西行沙夜相依","破格授尉入职特勤","闻潮疾退血心接防"]],["斗3","战网破渊篇",["塔议新赛扩大声势","原地试枪破甲首捷","三镖困甲召龙取胜","许升上校试白金枪","借拳锻身连捷入围","咖啡明爱拒留错望","看片识强咖啡约敌","赔票停网加固换舱","三灵合阵夺双冠","九邪暴起袭血神","假刑雪缚逼声求救"]],["斗3","明都归聚篇",["龙月换车潜入明都","归见双师承诺继匠","刀魂醒金九环尊主","无情辞主共推舞麟","七十亿竞得冰心","心跳解围金银反控"]],["斗3","天海风暴篇",["海风卸责坦言盼家","惜才促议两军轮换"]],["斗3","斗灵救亲篇",["千灵潜海密赴斗灵","血龙失控镇狱毁塔","临别留方揭非亲生"]],["斗3","五神之决篇",["笑面迎主约夜试手","拒联姻难以爱易国","败者守约复盘赢敬","雅陪步行晶赌履约","圣灵越限一生祝子","履约交货入宫送别"]],["斗3","归海复院篇",["提前辞星罗潜艇归","父环封雷九环成真","议会定罪封门堵港","半月筑罩校友聚力"]],["斗3","银龙招亲篇",["借仪式授招亲之计","三锤示范渡劫差一","护猿震斧验台生死","黑甲复演获八级证","循环开战兽台收客","三日沉思七彩入海","神戟忆影证亲相认","末轮破牌龙皇伤敌","龙泪通灵受托复族"]],["斗3","泰坦魔灾篇",["筹设湖防分道离明","血种护灵预设诱杀","本源龙纹晋升超斗"]],["斗3","双院争锋篇",["厚奖招新暗设封压","阳木三叠斩胜嗜血","硬承准神古树护还"]],["斗3","战殿取炮篇",["决取天国联唐筹援","劫雷洗死戟控脱围","拳退兵痞借乱脱身","四甲对赌两百吨金","十八洞天塔敌设伏","万锤自然千锻生灵","女劝止戮魔皇掌掴"]],["斗3","极北鏖战篇",["威压开道两禁破东","圣舞覆阵三准退潮","王牌火侦尽殁蜂群","雷枪圣舞只换暂缓","银金相拥三核破极","环升获骨冰桥留约","三龙吞军破耗战计","魔剑弑姐双凤同陨"]],["斗3","群雄赌战篇",["封口成约双龙携手","阳木刀传警智谋未消"]],["斗3","神王收网篇",["龙皇耀毁魔女挡刃","银王明言禁开末封","六怪研阵拟抗神敌"]],["斗3","金银永冻篇",["晨别老陈独赴求婚","墨蓝调军梓晨筑防","赌忆尽明仍言不悔"]],["斗4","天罗童年篇",["冰蛋破壳双亲失忆","童年暗线与远星旧战","双生武魂守秘入学","期末龙威与初次远航","博物重逢求作家师","双血初险娜娜授法","父赴远星枭龙设局","商厦惊变银龙救子"]],["斗4","高能少年篇",["送师候父高能初考","昏儿获救新歌护生","迁城入班三友初识","召来千秋双草定辅","迷宫反败三友夺首","星战拜师极训迎考","守擂越阶双师共授","三年成长星途各异","同窗旧事与远行前缘","少年驾机金龙破舰","天斗重逢双黄破关"]],["斗4","史莱克海选篇",["返校初测攀壁寻机","海选夺魁魂骨让友","结伴魔猿反杀追敌","末日混战彩爆保分","加考问心同赴险途","结盟入塔共退树妖"]],["斗4","史莱克考核篇",["远航母星生命亲和","体测真擂三环逆胜","分科拼命携友入围","双阳试炼九人合猎","猿王破围九人归营"]],["斗4","稀奇战队篇",["正式入院三友择师","首课明责初争生命徒","怪队初登越阶斗魂","一箭惊场双武获诊","九彩入手各逢异变","晶核化龙异兽成灵","分职习锻金兽吞湖","重逢唐乐凡铁通灵"]],["斗4","资源星历练篇",["穷修再赌联手争奖","雾分强敌神戟定胜","双莲入湖积锻攒甲","千锻成材备考聚队","联队采矿冰屋护身","土灵助关舍身断后","亲师相见五日整技","拍场夺枪银龙退敌"]],["斗4","全班争额篇",["全班联名争兽神礼","强控胜雷真戟退骨","巨款购宝备战刀客","三控断刀连胜还贷","燃甲融箭强破二铠","全班撑时比蒙觉醒"]],["斗4","精灵星篇",["长航观礼虎王认妹","安乐双选群兽择人","潜湖食果虎化人形","帝天认主双凶成灵"]],["斗4","星战实验篇",["星班立约生命环择主","合练备航天堂星考试","黑角受困强闯大黑牙","毁店脱围押师夺舰","隐舰返家双龙定渊","师护约战赢舰归院"]],["斗4","龙源星篇",["积学成甲假归修家缘","双凶化形再探斗天路","毒星登陆初救友军","城头守阵狂战险局","均功猎炼湖边托后事","天翼成名神殿识血"]],["斗4","天翼初航篇",["伏击海盗隐舰售金","暗探无功归校争额","逐场争锋八比一定"]],["斗4","森罗星篇",["赴森罗双泉识祖缘","五人轮战全胜主场","斗兽接力末关压轴","龙威破纪录骨洞择伴","树精催药双泉炼身"]],["斗4","生命学派篇",["长修将毕各家藏忧","三草护关五红成核","生态舰认主守底牌","新甲传情共担母病","火助魂锻旧情复动","星战预练巡演寻忆","高级灵台风暴破甲","逃涡脱塔备考全班","毕业夺舰天翼显威","圣渊认子隐情渐释"]],["斗4","神王核心篇",["返龙源星深探灰雾","神识锁舰娜娜护生","四方争援再赴恒星","三探火海救回银蛋","大悲定志归家认养恩","全班录内院独闯血门","血海试炼父枪认亲"]],["斗4","第七舰队篇",["授衔远航全翼入军","舰队对垒奉令自由侦","潜入矿星盗走空之虫","初潜天龙赌石立身份","拍晶探库嫁祸脱身"]],["斗4","潜龙双姝篇",["归院交晶洗礼破六","搬灵获准神雷初成","殊功授勋再潜天龙","皇家认女暗咒锁身","金龙公主获骑士保","同伴炼血全翼淬体"]],["斗4","升龙逐魁篇",["神甲龙枪共赴升龙","双吼夺首先凝神识","认主晋位三胜入围","血契换髓炼体候赛","循环初战仙气润众","龙枪杀敌双姝连胜","六翼血战圣台赐彩","组合决赛携手入八","晶骨双奖诸骑议血","燃血苦战瞬移夺魁"]],["斗4","内院七怪篇",["重奖定席植物归乡","亲子团聚彩链赠儿","湖上留灯旧情互答","银龙苏醒万年相逢","七怪正名轮战内院","箭斩红莲渡劫成神","平剑定号亲情相守"]],["斗4","龙厅雷淬篇",["双亲护雷接收银鹏","独线报军带监潜星","首座召见七彩择主","龙厅潮涌帝天识墓","光暗淬体磨应变鳞"]],["斗4","天马会盟篇",["龙舍遇天养跨门赴会","招亲开擂双姝连胜","神魔苦斗创毁入身","议政合盟擂战未休","雷退神魔拒绝求婚","深红临会联邦成立","私信出星百日压境"]],["斗4","龙神之路篇",["七彩劫起帝天献祭","十年约定双龙成神","返城助友再获界令","龙骨问志得力归来","领军制案神甲成器","助老返青张认干女"]],["斗4","龙马竞宝篇",["龙蛋精金竞得神剑","神器落定暗议护身","登临神果天养核竞拍","分宝聚友整装蓝海军"]],["斗4","天和烽火篇",["天和认局血域降星","四族整军待令潜侦","试枪破返援舰撞盾","暗吸龙髓双亲护险","巨虫追战魅皇逼关","地战守钱双友成神","主从定契援至域遁"]],["斗4","天马血战篇",["天养守星七老赴死约","神火遗命群骨护王","银龙破域母舰合甲","承遗命领使联邦"]],["斗4","联邦出使篇",["舰拒使团生态炮碎星","归院候谈银龙重掌塔","国会陈危清风辞部","联防签约空虫助晋升"]],["斗4","双星守御篇",["逼皇交舰龙界迎主","血域再袭四强并战","金银赴援舰炮退母","残圣夺舍秀秀献祭","新王即位三月备劫"]],["斗4","龙神终考篇",["龙神闭考神王压境","考内救子再寻神星路","天养舍识无双赴绝境","神界归返诸王炼龙","归还金银执法过考","诀别证婚蓝焰追妻"]]];
// 楼层显示前的文字清理（只影响显示，不改聊天原文，也不改发给 AI 的内容）。做法照参考的道诡楼层。
// 1 excludeFloorText：玩家在“排除渲染”里填的起止标签，把包着的内容藏起来
// 2 cleanPresetTags：拆开包着协议标签的代码块，去掉预设常见的 <thinking>/<think>、<Interleaving>、<type>；别的代码块原样留着

function unwrapProtocolFences(raw) {
  const text = String(raw == null ? '' : raw);
  const opening = /(^|\n)[ \t]{0,3}(`{3,}|~{3,})[^\n]*\n/gu;
  let out = '';
  let cursor = 0;
  let match;
  while ((match = opening.exec(text))) {
    const bodyStart = opening.lastIndex;
    const protocol = /^\s*<(content|UpdateVariable|Interleaving)\b[^>]*>/iu.exec(text.slice(bodyStart));
    const closeFence = new RegExp(`^[ \\t]{0,3}${match[2][0]}{${match[2].length},}[ \\t]*$`, 'gmu');
    if (protocol) {
      // 代码块里包的是协议标签：去掉围栏，标签里的内容整段保留，直到配对的收尾围栏
      const element = new RegExp(`<(content|UpdateVariable|Interleaving|thinking|think|type)\\b[^>]*>|^[ \\t]{0,3}${match[2][0]}{${match[2].length},}[ \\t]*$`, 'gimu');
      element.lastIndex = bodyStart;
      let item;
      let fence = null;
      while ((item = element.exec(text))) {
        if (!item[1]) { fence = item; break; }
        const closeTag = new RegExp(`<\\/${item[1]}\\s*>`, 'giu');
        closeTag.lastIndex = element.lastIndex;
        if (!closeTag.exec(text)) break;
        element.lastIndex = closeTag.lastIndex;
      }
      out += text.slice(cursor, match.index) + match[1] + text.slice(bodyStart, fence ? fence.index : text.length);
      cursor = fence ? fence.index + fence[0].length : text.length;
      opening.lastIndex = cursor;
      continue;
    }
    closeFence.lastIndex = bodyStart;
    const fence = closeFence.exec(text);
    const from = cursor;
    cursor = fence ? fence.index + fence[0].length : text.length;
    out += text.slice(from, cursor);
    opening.lastIndex = cursor;
  }
  return out + text.slice(cursor);
}

function cleanPresetTags(raw, keep) {
  const text = unwrapProtocolFences(raw);
  const token = /^[ \t]{0,3}(`{3,}|~{3,})[^\n]*$|<(think(?:ing)?)\b[^>]*>|<\/?Interleaving\b[^>]*>|<type\b[^>]*>/gimu;
  let out = '';
  let cursor = 0;
  let protectedTail = false;
  let match;
  while ((match = token.exec(text))) {
    out += text.slice(cursor, match.index);
    if (match[1]) {
      // 普通代码块：整块跳过，里面的标签不算
      const endFence = new RegExp(`^[ \\t]{0,3}${match[1][0]}{${match[1].length},}[ \\t]*$`, 'gmu');
      endFence.lastIndex = token.lastIndex + 1;
      const close = endFence.exec(text);
      cursor = close ? close.index + close[0].length : text.length;
      out += text.slice(match.index, cursor);
      protectedTail = !close;
    } else if (match[2]) {
      const close = new RegExp(`<\\/${match[2]}\\s*>`, 'giu');
      close.lastIndex = token.lastIndex;
      const end = close.exec(text);
      cursor = end ? close.lastIndex : text.length;
      if (keep && keep.think) out += text.slice(match.index, cursor);
    } else if (/^<type\b/iu.test(match[0])) {
      const close = /<\/type\s*>/giu;
      close.lastIndex = token.lastIndex;
      const end = close.exec(text);
      cursor = end ? close.lastIndex : text.length;
      const value = text.slice(token.lastIndex, end ? end.index : text.length).trim();
      if ((keep && keep.type) || !/^(?:non|none|normal)$/iu.test(value)) out += text.slice(match.index, cursor);
    } else {
      cursor = token.lastIndex;
      if (keep && keep.interleave) out += match[0];
    }
    token.lastIndex = cursor;
  }
  out += text.slice(cursor);
  if (!protectedTail) {
    // AI 正写到一半的预设标签（如 "<thin"）先藏起来；若外部显示正则接管对应标签则留给它
    const tags = [];
    if (!(keep && keep.think)) tags.push('<thinking>', '<think>');
    if (!(keep && keep.interleave)) tags.push('<interleaving>', '</interleaving>');
    if (!(keep && keep.type)) tags.push('<type>');
    const at = tags.length ? out.lastIndexOf('<') : -1;
    if (at >= 0) {
      const tail = out.slice(at).toLowerCase();
      if (tail.length >= 3 && tags.some((tag) => tag.startsWith(tail))) out = out.slice(0, at);
    }
  }
  return out;
}

// 玩家填的是原样文本，不当成正则
function excludeFloorText(raw, range) {
  const text = String(raw == null ? '' : raw);
  const start = (range && range.start) || '';
  const end = (range && range.end) || '';
  if (!end) return text;
  if (!start) {
    const at = text.indexOf(end);
    if (at !== -1) return text.slice(at + end.length);
    // 只填 </标签> 时，流式输出已出现配对开头、尚未写到结尾，也先藏住
    const opening = end.startsWith('</') && end.endsWith('>') ? `<${end.slice(2)}` : '';
    return opening && text.includes(opening) ? '' : text;
  }
  let out = '';
  let cursor = 0;
  let at;
  while ((at = text.indexOf(start, cursor)) !== -1) {
    out += text.slice(cursor, at);
    const close = text.indexOf(end, at + start.length);
    if (close === -1) return out;
    cursor = close + end.length;
  }
  const tail = text.slice(cursor);
  // 流式正写到开头标签的一半时不露出半截标签
  for (let size = Math.min(start.length - 1, tail.length); size >= 2; size -= 1) {
    if (tail.endsWith(start.slice(0, size))) return out + tail.slice(0, -size);
  }
  return out + tail;
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

/* 斗罗楼层（酒馆助手脚本）
 * build.py 在本段之前注入：
 *   PROSE_CSS / PROSE_CODE  样稿/正文样稿.html 的 <style id="dlp-style"> 与“正文本体”脚本（定义 window.DLProse）
 *   DL_ACTS                 [[部, 篇, [幕名…]]…]，核对幕签用
 *   以及 楼层/清理.js 的 excludeFloorText、cleanPresetTags，共用/结局锁.js 的 createEndingLock
 * 1 AI 回复里的 <UpdateVariable> 块显示成一张可折叠的“变量更新”卡片；块还没写完时显示“变量更新中”。
 * 2 正文格式：幕签 <story>、对白 {全名}「」、转场 <scene>、技能签 <skill> 交给正文本体画；外观全在本体里，不在这里改。
 * 3 发给 AI 之前，只保留最近 N 层的更新块（N = 脚本变量“保留更新块层数”，默认 3），更早的删掉省篇幅。
 * 4 去掉 MVU 的 <StatusPlaceHolderImpl/> 占位符；在每层 AI 回复末尾留一个快照徽章位 [data-dl-snap]，由状态栏脚本填。
 * 5 脚本按钮“排除渲染”：隐藏预设输出的思维链等标签；另外自动去掉 <thinking>、<think> 等常见预设标签。只影响显示。
 * 6 气运死劫的结局锁（设计决定 §24.3）：最新一层 主角.气运.结局 写下了，这个聊天不再推进；不选叙事核心也锁。叙事核心自己的结局由核心脚本锁，两边共用一把锁。
 * 运行环境：酒馆助手脚本 iframe；操作的是酒馆主页面（window.parent）的聊天区。
 */
(function () {
  'use strict';
  const NAME = '斗罗楼层';
  const GLOBAL = '__DL_FLOOR__';
  const KEEP_KEY = '保留更新块层数';
  const DEFAULT_KEEP = 3;
  const OPEN = '<UpdateVariable>', CLOSE = '</UpdateVariable>';
  const BLOCKS = /<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gu;
  const HAS_BLOCK = /<UpdateVariable>[\s\S]*?<\/UpdateVariable>/u; // 不带 g，避免 lastIndex 残留
  const UNCLOSED = /<UpdateVariable>(?:(?!<\/UpdateVariable>)[\s\S])*$/u; // 写到一半的块（MVU 不认，发给 AI 时一律删）
  // 正文区：<content>…</content>。卡里的“斗罗正文区”显示正则把它和更新块换成空占位（ADR 0005），
  // 这里只往占位里填，同一层里别的正则、酒馆助手画出来的前端一个节点都不动。
  // 开标签必须在行首：思维链里顺嘴提到“`<content>` 格式”的不算。行首的开标签有好几个时取离结束标签最近的那个。
  // 卡里的显示正则（build.py 5b）用同一个写法，两边切出来的段数才对得上。
  const CONTENT_ALL = /^[ \t]*<content>((?:(?!^[ \t]*<content>)[\s\S])*?)(?:<\/content>|(?![\s\S]))/gimu;
  const HAS_CONTENT = /^[ \t]*<content>/imu;
  const UPD_ALL = /^[ \t]*<UpdateVariable>((?:(?!^[ \t]*<UpdateVariable>)[\s\S])*?)(<\/UpdateVariable>|(?![\s\S]))/gimu;
  const SLOT_CONTENT = '[data-dl-content]', SLOT_UPD = '[data-dl-upd]';
  const OWN_REGEX = /^斗罗正文区/u;
  const FMT_HOOK = '__DL_FMT_HOOK__';
  const IS_FRONTEND = /html>|<head>|<body/u;
  const PLACEHOLDER = /<StatusPlaceHolderImpl\s*\/?>/giu;
  const HAS_PLACEHOLDER = /<StatusPlaceHolderImpl\s*\/?>/iu;
  const STORE_KEY = 'dl-statusbar:v1'; // 状态栏的本浏览器设置，头像的选择存在这里
  const EX_START = '排除渲染起始标签', EX_END = '排除渲染结束标签';
  const ITEMS = ['时空', '原作指导', '蝴蝶效应', '人物在场', '修为', '生效状态', '资源与伤势', '战斗', '物品与钱包', '关系', '势力', '叙事核心', '气运', '金手指'];
  // 核心审查（叙事核心）：卡里的“斗罗核心审查（隐藏）”正则在显示和发给 AI 时都删掉它；脚本变量“显示核心审查”为 true 时，
  // 这里从原文里取出来画成折叠卡片放在正文区前面，方便调试。没写结束标签时取到 <content> 之前
  const REVIEW_KEY = '显示核心审查';
  const REVIEW = /<核心审查>([\s\S]*?)(?:<\/核心审查>|(?=^[ \t]*<content>)|(?![\s\S]))/mu;
  const REVIEW_ALL = /<核心审查>([\s\S]*?)(?:<\/核心审查>|(?=^[ \t]*<content>)|(?![\s\S]))/gmu;

  const W = (() => { try { if (window.parent && window.parent !== window && window.parent.document) return window.parent; } catch (_) { /* 跨域时退回本窗口 */ } return window; })();
  const D = W.document;
  const ctx = () => { try { return W.SillyTavern && W.SillyTavern.getContext ? W.SillyTavern.getContext() : null; } catch (_) { return null; } };
  const chat = () => { const c = ctx(); return c && Array.isArray(c.chat) ? c.chat : []; };

  // ───────── 拆块与解析（纯函数） ─────────
  function splitBlocks(text) {
    const s = String(text || '');
    const parts = [];
    let pos = 0;
    for (;;) {
      const i = s.indexOf(OPEN, pos);
      if (i < 0) { parts.push({ text: s.slice(pos) }); break; }
      parts.push({ text: s.slice(pos, i) });
      const j = s.indexOf(CLOSE, i);
      if (j < 0) { parts.push({ block: s.slice(i + OPEN.length), closed: false }); break; }
      parts.push({ block: s.slice(i + OPEN.length, j), closed: true });
      pos = j + CLOSE.length;
    }
    return parts;
  }
  function pickTag(body, tag) {
    const m = body.match(new RegExp(`<${tag}>([\\s\\S]*?)(?:</${tag}>|$)`, 'u'));
    return m ? m[1].trim() : '';
  }
  function parseBlock(body) {
    const analysis = pickTag(body, 'analysis');
    const patchText = pickTag(body, 'JSONPatch');
    const rows = analysis.split(/\r?\n/u).map((l) => l.trim()).filter(Boolean).map((l) => {
      const k = l.indexOf('｜');
      return k > 0 ? [l.slice(0, k).trim(), l.slice(k + 1).trim()] : ['', l];
    });
    let ops = null, error = '';
    if (patchText) {
      try {
        const v = JSON.parse(patchText);
        if (Array.isArray(v)) ops = v; else error = 'JSONPatch 不是数组';
      } catch (e) { error = 'JSONPatch 不是合法 JSON：' + e.message; }
    } else error = '没有 JSONPatch';
    return { rows, ops, error };
  }
  const short = (v, n = 90) => { let s; try { s = typeof v === 'string' ? v : JSON.stringify(v); } catch (_) { s = String(v); } return s && s.length > n ? s.slice(0, n) + '…' : s; };
  const decodePath = (p) => String(p || '').split('/').slice(1).map((x) => x.replace(/~1/gu, '/').replace(/~0/gu, '~')).join(' › ');
  const OP_NAME = { add: '新增', replace: '改为', remove: '删除', move: '移动' };

  // ───────── 卡片 ─────────
  function el(tag, attrs, ...kids) {
    const n = D.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : D.createTextNode(String(c)));
    return n;
  }
  function card(part) {
    if (!part.closed) {
      return el('div', { class: 'dl-upd', 'data-pending': true, role: 'status' },
        el('span', { class: 'dl-upd-dot', 'aria-hidden': 'true' }), '变量更新中…',
        el('small', { text: '生成结束后仍停在这里，说明更新块没写完整（缺 </UpdateVariable>），这一轮变量不会更新。' }));
    }
    const r = parseBlock(part.block);
    const changes = r.ops ? r.ops.length : 0;
    const kept = r.rows.filter(([, v]) => /^保持/u.test(v)).length;
    const sum = el('summary', null,
      el('b', { text: '变量更新' }),
      el('span', { class: 'dl-upd-n', text: r.error ? r.error : changes ? `改动 ${changes} 处` : '无改动' }),
      r.rows.length ? el('span', { class: 'dl-upd-n', text: `${r.rows.length - kept} 项有变化` }) : null);
    const rows = r.rows.map(([k, v]) => el('div', { class: 'dl-upd-r', 'data-keep': /^保持/u.test(v) ? 'true' : null, 'data-unknown': k && !ITEMS.includes(k) ? 'true' : null },
      el('span', { class: 'dl-upd-k', text: k || '—' }), el('span', { text: v })));
    const ops = (r.ops || []).map((o) => el('li', null,
      el('code', { text: OP_NAME[o && o.op] || String(o && o.op) }), ' ', el('span', { class: 'dl-upd-p', text: decodePath(o && (o.path || o.from)) }),
      o && o.op === 'move' ? el('span', { text: ' → ' + decodePath(o.to || o.path) }) : null,
      o && 'value' in o ? el('span', { class: 'dl-upd-v', text: ' ＝ ' + short(o.value) }) : null));
    return el('details', { class: 'dl-upd', 'data-error': r.error ? 'true' : null }, sum,
      el('div', { class: 'dl-upd-b' }, rows.length ? el('div', { class: 'dl-upd-rows' }, rows) : null, ops.length ? el('ol', { class: 'dl-upd-ops' }, ops) : null));
  }

  const CSS = `
:is(.mes_text,.TH-streaming) .dl-upd{margin:.6em 0;border:1px solid var(--SmartThemeBorderColor,#5557);border-left-width:3px;padding:0;font-size:.92em;line-height:1.55;background:color-mix(in srgb,var(--SmartThemeBlurTintColor,#000) 35%,transparent)}
:is(.mes_text,.TH-streaming) .dl-upd>summary{cursor:pointer;display:flex;flex-wrap:wrap;gap:.3em .9em;align-items:baseline;padding:.35em .7em;list-style:none}
:is(.mes_text,.TH-streaming) .dl-upd>summary::-webkit-details-marker{display:none}
:is(.mes_text,.TH-streaming) .dl-upd>summary::before{content:"▸";opacity:.7}
:is(.mes_text,.TH-streaming) .dl-upd[open]>summary::before{content:"▾"}
:is(.mes_text,.TH-streaming) .dl-upd-n{opacity:.75;font-size:.92em}
:is(.mes_text,.TH-streaming) .dl-upd[data-error] .dl-upd-n:first-of-type{color:var(--warning,#d98b3a);opacity:1}
:is(.mes_text,.TH-streaming) .dl-upd-b{padding:.2em .7em .6em;border-top:1px dashed var(--SmartThemeBorderColor,#5557)}
:is(.mes_text,.TH-streaming) .dl-upd-r{display:grid;grid-template-columns:6.5em minmax(0,1fr);gap:.6em;padding:.12em 0}
:is(.mes_text,.TH-streaming) .dl-upd-r[data-keep]{opacity:.55}
:is(.mes_text,.TH-streaming) .dl-upd-k{font-weight:600}
:is(.mes_text,.TH-streaming) .dl-upd-r[data-unknown] .dl-upd-k{text-decoration:underline dotted}
:is(.mes_text,.TH-streaming) .dl-upd-ops{margin:.4em 0 0;padding-left:1.6em;font-size:.92em}
:is(.mes_text,.TH-streaming) .dl-upd-ops code{font-size:.92em}
:is(.mes_text,.TH-streaming) .dl-upd-v{opacity:.8;word-break:break-all}
:is(.mes_text,.TH-streaming) .dl-review-b{white-space:pre-wrap;font-size:.92em;opacity:.85}
:is(.mes_text,.TH-streaming) .dl-upd[data-pending]{display:flex;flex-wrap:wrap;align-items:center;gap:.5em;padding:.35em .7em}
:is(.mes_text,.TH-streaming) .dl-upd[data-pending] small{flex-basis:100%;opacity:.6}
:is(.mes_text,.TH-streaming) .dl-upd-dot{width:.55em;height:.55em;border-radius:50%;background:currentColor;opacity:.6;animation:dl-upd-pulse 1.2s ease-in-out infinite}
@keyframes dl-upd-pulse{50%{opacity:.15}}
@media (prefers-reduced-motion:reduce){:is(.mes_text,.TH-streaming) .dl-upd-dot{animation:none}}
:is(.mes_text,.TH-streaming) .dl-snap-slot:empty{display:none}
#dl-ex{box-sizing:border-box;width:min(32rem,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 32px);margin:auto;padding:20px;overflow:auto;border:1px solid #6c6658;border-radius:2px;background:#191b1d;color:#e4dfd3;font:14px/1.65 system-ui,"Microsoft YaHei",sans-serif;text-align:left}
#dl-ex::backdrop{background:rgba(0,0,0,.65)}
#dl-ex form{display:grid;gap:10px;margin:0}
#dl-ex h2{margin:0;color:inherit;font-size:18px}
#dl-ex p{margin:0;color:#c1bbaf;overflow-wrap:anywhere}
#dl-ex label{color:inherit;font-weight:600}
#dl-ex input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;margin:0;padding:8px;border:1px solid #6c6658;border-radius:2px;background:#111315;color:#eee9df;font:14px/1.5 ui-monospace,Consolas,monospace}
#dl-ex footer{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
#dl-ex button{min-height:40px;padding:6px 14px;border:1px solid #6c6658;border-radius:2px;background:#24272a;color:#eee9df;font:inherit;cursor:pointer}
#dl-ex button[type="submit"]{background:#e4dfd3;color:#191b1d;border-color:#e4dfd3}`;

  // ───────── 正文本体与它要的资料 ─────────
  let Prose = null;
  function loadProse() {
    try { new W.Function(PROSE_CODE)(); Prose = W.DLProse || null; } catch (e) { console.error(`[${NAME}] 正文本体加载失败，正文按酒馆原样显示`, e); Prose = null; }
  }
  // 幕签核对：先按“篇＋第几幕”找，篇对不上再按幕名找；都找不到返回 null，幕签照 AI 写的显示
  const ACTS = (() => {
    const byArc = new Map(), byTitle = new Map();
    for (const [part, arc, titles] of DL_ACTS) {
      byArc.set(arc, { part, titles });
      titles.forEach((t, i) => { if (!byTitle.has(t)) byTitle.set(t, [arc, i + 1]); });
    }
    return {
      resolve(q) {
        const arcName = String((q && q.arc) || '').replace(/\s+/gu, '');
        let hit = byArc.has(arcName) && q.no >= 1 && q.no <= byArc.get(arcName).titles.length ? [arcName, q.no] : null;
        if (!hit && q && q.title && byTitle.has(q.title)) hit = byTitle.get(q.title);
        if (!hit) return null;
        const a = byArc.get(hit[0]);
        return { known: true, part: a.part, arc: hit[0], no: hit[1], title: a.titles[hit[1] - 1], at: hit[1], of: a.titles.length };
      },
    };
  })();
  // 这一层的变量；AI 正在写的那层还没有，就往前找最近的一层
  const statCache = new Map();
  function statAt(id) {
    try {
      const v = getVariables({ type: 'message', message_id: id });
      const st = v && v.stat_data;
      return st && typeof st === 'object' && st.主角 && st.时空 ? st : null;
    } catch (_) { return null; }
  }
  function statFor(id) {
    if (statCache.has(id)) return statCache.get(id);
    let found = null;
    for (let i = id, n = 0; i >= 0 && n < 8 && !found; i -= 1, n += 1) found = statAt(i);
    statCache.set(id, found);
    return found;
  }
  let chosenCache = null;
  function chosen() {
    if (chosenCache) return chosenCache;
    try { chosenCache = (JSON.parse(W.localStorage.getItem(STORE_KEY) || '{}').avatars) || {}; } catch (_) { chosenCache = {}; }
    return chosenCache;
  }
  const persona = () => { try { return (typeof getPersonaAvatarPath === 'function' && getPersonaAvatarPath('current')) || null; } catch (_) { return null; } };
  // 酒馆聊天底色的深浅：正文是浅色字，底色就是深的
  function surface() {
    try {
      const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/u.exec(W.getComputedStyle(D.querySelector('#chat .mes_text') || D.getElementById('chat') || D.body).color || '');
      if (!m) return 'dark';
      return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 > 0.5 ? 'dark' : 'light';
    } catch (_) { return 'dark'; }
  }
  // 主题、动效跟状态栏走（它写在页面根元素上）；状态栏没开时按当前部挑主题、按系统设置定动效
  let version = 0; // 头像、设置、主题变了就加一，已画过的楼层据此重画
  let statVersion = 0; // 变量更新了就加一，只重画最后几层
  function currentLook() {
    const root = D.documentElement.dataset;
    const last = chat().length - 1;
    const theme = root.dlTheme || (Prose ? Prose.themeOf(statFor(last)) : 'shouzha');
    let reduced = false;
    try { reduced = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { /* 无 matchMedia */ }
    const look = { theme, motion: root.dlMotion || (reduced ? 'reduced' : 'full'), surface: surface() };
    look.key = `${look.theme}|${look.motion}|${look.surface}|${version}`;
    return look;
  }
  // 技能卡动画：只有这次生成刚写出来的最新一层才播，而且只播一次；3 秒内的重画接着播
  const played = new Map();
  let generating = false, generatedAt = -1e9;
  const chatKey = () => { try { const c = ctx(); return String(c && c.getCurrentChatId ? c.getCurrentChatId() : ''); } catch (_) { return ''; } };
  function playAt(key, id) {
    const now = W.performance.now();
    if (played.has(key)) { const t = (now - played.get(key)) / 1000; return t < 3 ? t : null; }
    const live = (generating || now - generatedAt < 2500) && id === chat().length - 1;
    played.set(key, live ? now : -1e9);
    return live ? 0 : null;
  }

  // ───────── 排除渲染（脚本变量，只影响显示） ─────────
  function readExclusion() {
    try {
      const v = getVariables({ type: 'script' }) || {};
      return { start: typeof v[EX_START] === 'string' ? v[EX_START].trim() : '', end: typeof v[EX_END] === 'string' ? v[EX_END].trim() : '' };
    } catch (_) { return { start: '', end: '' }; }
  }
  let exclusion = { start: '', end: '' };
  let showReview = false;
  function readReview() {
    try { const v = (getVariables({ type: 'script' }) || {})[REVIEW_KEY]; return v === true || v === 'true'; } catch (_) { return false; }
  }
  function syncReview(textEl, raw) {
    const old = textEl.querySelector('.dl-review');
    const m = showReview ? REVIEW.exec(raw) : null;
    const body = m ? m[1].trim() : '';
    if (!body) { if (old) old.remove(); return; }
    if (old && old.__dlSrc === body) return;
    const node = el('details', { class: 'dl-upd dl-review' },
      el('summary', null, el('b', { text: '核心审查' }), el('span', { class: 'dl-upd-n', text: '调试显示（脚本变量“显示核心审查”）；AI 看不到这段' })),
      el('div', { class: 'dl-upd-b dl-review-b', text: body }));
    node.__dlSrc = body;
    if (old) { old.replaceWith(node); return; }
    const slot = textEl.querySelector(SLOT_CONTENT);
    if (slot && slot.parentNode) slot.parentNode.insertBefore(node, slot); else textEl.prepend(node);
  }

  // ───────── 与酒馆正则及外部前端协同 ─────────
  let inInnerFormat = false;
  let keepsCache;
  let selfEmitDepth = 0;
  const pendingNotify = new Map();

  // 酒馆正则按 全局 → 预设 → 角色卡 顺序跑（engine.js）。若预设正则先把 <content> 或 <UpdateVariable> 拆了，
  // 卡里的“斗罗正文区”正则就造不出占位，退回整层重画时会把同层别的前端清掉。
  // 这里在所有正则之前（MessageFormatter.BEFORE_REGEX）先把 <content> 和 <UpdateVariable> 换成空占位。
  function beforeRegex(mes, info) {
    if (inInnerFormat || typeof mes !== 'string' || !mes) return mes;
    if (info && (info.isSystem || info.isUser || info.isReasoning)) return mes;
    if (info && Number(info.messageId) === 0 && mes.includes('<开局创建角色>')) return mes;
    const s = typeof unwrapProtocolFences === 'function' && /(`{3,}|~{3,})/u.test(mes) ? unwrapProtocolFences(mes) : mes;
    if (!HAS_CONTENT.test(s)) return mes;
    return s
      .replace(REVIEW_ALL, '')
      .replace(CONTENT_ALL, '<div data-dl-content="1"></div>')
      .replace(UPD_ALL, '<div data-dl-upd="1"></div>');
  }
  function ensureFormatHook() {
    const c = ctx(), mf = c && c.messageFormatter;
    if (!mf || typeof mf.addHook !== 'function' || W[FMT_HOOK]) return;
    const stage = (mf.stage && mf.stage.BEFORE_REGEX) || 'beforeRegex';
    const order = mf.order && typeof mf.order.EARLIEST === 'number' ? mf.order.EARLIEST : 0;
    try {
      mf.addHook((mes, info) => {
        const cur = W[GLOBAL];
        return cur && typeof cur._beforeRegex === 'function' ? cur._beforeRegex(mes, info) : mes;
      }, { stage, order });
      W[FMT_HOOK] = true;
    } catch (_) { /* 旧版酒馆无此接口时仍靠角色显示正则 */ }
  }
  function activeDisplayRegexes() {
    if (typeof getTavernRegexes !== 'function') return [];
    const all = [];
    let ok = false;
    for (const opt of [{ type: 'global' }, { type: 'preset', name: 'in_use' }, { type: 'character', name: 'current' }]) {
      try {
        const res = getTavernRegexes(opt);
        if (Array.isArray(res)) { ok = true; all.push(...res); }
      } catch (_) { /* 旧版酒馆助手退回 scope 写法 */ }
    }
    if (!ok) {
      try { const res = getTavernRegexes({ scope: 'all', enable_state: 'enabled' }); if (Array.isArray(res)) all.push(...res); } catch (_) { return []; }
    }
    return all.filter((r) => r && r.enabled !== false && !OWN_REGEX.test(String(r.script_name || '')) && !/^斗罗核心审查/u.test(String(r.script_name || ''))
      && (!r.destination || r.destination.display !== false) && (!r.source || r.source.ai_output !== false));
  }
  function currentKeeps() {
    if (keepsCache !== undefined) return keepsCache;
    const list = activeDisplayRegexes();
    if (!list.length) { keepsCache = null; return null; }
    let think = false, interleave = false, type = false;
    for (const r of list) {
      const f = String(r.find_regex || '');
      if (!think && /think/iu.test(f)) think = true;
      if (!interleave && /interleaving/iu.test(f)) interleave = true;
      if (!type && /<\\?\/?type\b/iu.test(f)) type = true;
    }
    keepsCache = think || interleave || type ? { think, interleave, type } : null;
    return keepsCache;
  }
  function hasUnrenderedFrontend(root) {
    if (!root) return false;
    for (const pre of root.querySelectorAll('pre')) {
      if (!pre.closest('.TH-render') && IS_FRONTEND.test(pre.textContent || '')) return true;
    }
    return false;
  }
  // 正文区异步填入后，若里面有预设正则变出来的 HTML 代码块（或酒馆助手开了流式镜像 .TH-streaming），
  // 通知酒馆助手重新扫描这一层把前端 iframe 挂起来（MVU 不监听这两个渲染事件，不会重复跑变量更新）
  function notifyFrontend(mes, textEl, id, notifyKey) {
    if (generating || !mes || !Number.isInteger(id) || id < 0) return;
    if (mes.__dlNotifiedSrc === notifyKey) return;
    const unrendered = hasUnrenderedFrontend(textEl);
    const streamingHost = !!mes.querySelector('.TH-streaming');
    if (!unrendered && !streamingHost) return;
    if (pendingNotify.has(id)) return;
    const E = typeof tavern_events === 'object' && tavern_events ? tavern_events : {};
    const tid = W.setTimeout(async () => {
      pendingNotify.delete(id);
      if (!W[GLOBAL] || !mes.isConnected) return;
      const needPre = hasUnrenderedFrontend(textEl);
      const needStream = !!mes.querySelector('.TH-streaming');
      mes.__dlNotifiedSrc = notifyKey;
      if (!needPre && !needStream) return;
      const c = ctx(), es = c && c.eventSource;
      if (!es || typeof es.emit !== 'function') return;
      selfEmitDepth += 1;
      try {
        if (needPre) await es.emit(E.MESSAGE_UPDATED || 'message_updated', id);
        await es.emit(E.CHARACTER_MESSAGE_RENDERED || 'character_message_rendered', id);
      } catch (_) { /* 外部监听报错不连累楼层 */ } finally {
        selfEmitDepth -= 1;
      }
    }, 0);
    pendingNotify.set(id, tid);
  }

  // ───────── 显示 ─────────
  const seen = new WeakMap(); // .mes_text → 上次处理时的原文与外观
  function formatted(text, msg, id) {
    const t = String(text || '').replace(PLACEHOLDER, '');
    if (!t.trim()) return '';
    const c = ctx();
    inInnerFormat = true;
    try {
      try { if (c && typeof c.messageFormatting === 'function') return c.messageFormatting(t, msg.name, !!msg.is_system, !!msg.is_user, id); } catch (_) { /* 退回酒馆助手的格式化 */ }
      try { if (typeof formatAsDisplayedMessage === 'function') return formatAsDisplayedMessage(t, { message_id: id }); } catch (_) { /* 退回纯文本 */ }
      const p = D.createElement('p'); p.textContent = t; return p.outerHTML;
    } finally {
      inInnerFormat = false;
    }
  }
  function ensureSlot(textEl, id) {
    if (textEl.querySelector(':scope > [data-dl-snap]')) return;
    textEl.append(el('div', { class: 'dl-snap-slot', 'data-dl-snap': String(id) }));
  }
  // 一段正文 → 节点。有正文本体就交给它（幕签、对白、转场、技能签、人名上色），没有就按酒馆原样排版
  function proseNodes(text, msg, id, partNo, look) {
    const clean = String(text || '').replace(PLACEHOLDER, '');
    if (!clean.trim()) return [];
    if (Prose) {
      try {
        const base = `${chatKey()}:${id}:${msg.swipe_id || 0}:${partNo}`;
        return Prose.build(clean, {
          format: (src) => formatted(src, msg, id), stat: statFor(id), acts: ACTS, avatars: W.DLAvatars || null, chosen: chosen(), persona: persona(),
          floor: base, playAt: (key) => playAt(key, id),
        });
      } catch (e) { console.error(`[${NAME}] 第 ${id} 层正文没画出来，按酒馆原样显示`, e); }
    }
    const box = D.createElement('div');
    box.innerHTML = formatted(clean, msg, id);
    return [...box.childNodes];
  }
  // 正文区模式：只填占位。占位不在（显示正则没开）返回 false，交给整层模式
  let warnedNoSlot = false;
  function fillSlots(mes, textEl, raw, msg, id, look) {
    let slots = [...textEl.querySelectorAll(SLOT_CONTENT)];
    if (!slots.length && W[FMT_HOOK] && textEl.__dlReformatted !== raw) {
      const c = ctx();
      if (c && typeof c.messageFormatting === 'function') {
        try {
          textEl.__dlReformatted = raw;
          textEl.innerHTML = c.messageFormatting(raw, msg.name, !!msg.is_system, !!msg.is_user, id);
          mes.__dlNotifiedSrc = '';
          slots = [...textEl.querySelectorAll(SLOT_CONTENT)];
        } catch (_) { /* 退回原逻辑 */ }
      }
    }
    if (!slots.length) {
      if (!warnedNoSlot) {
        warnedNoSlot = true;
        const text = `回复里有 <content>，但卡里的“斗罗正文区”显示正则没有生效（角色正则没被允许，或被关掉了）。这一层先按整层显示，同层别的前端可能被重画；请在正则设置里允许本角色的正则。`;
        console.warn(`[${NAME}]`, text);
        try { if (W.toastr && W.toastr.warning) W.toastr.warning(text, NAME, { timeOut: 12000 }); } catch (_) { /* 没有 toastr */ }
      }
      return false;
    }
    const now = look || currentLook();
    const keeps = currentKeeps();
    const keepsKey = keeps ? `${+!!keeps.think}${+!!keeps.interleave}${+!!keeps.type}` : '';
    const inners = [...raw.matchAll(CONTENT_ALL)].map((m) => m[1]);
    const live = id >= chat().length - 2 ? statVersion : 0;
    const srcParts = [];
    slots.forEach((slot, i) => {
      const inner = cleanPresetTags(excludeFloorText(inners[i] || '', exclusion), keeps);
      const src = [inner, msg.swipe_id || 0, now.key, live, keepsKey].join('\u0000');
      srcParts.push(src);
      if (slot.__dlSrc !== src) {
        slot.replaceChildren(...proseNodes(inner, msg, id, i, now));
        slot.__dlSrc = src;
        mes.__dlNotifiedSrc = '';
      }
      if (Prose) Prose.look(slot, now);
    });
    const blocks = [...raw.matchAll(UPD_ALL)].map((m) => ({ block: m[1], closed: !!m[2] }));
    [...textEl.querySelectorAll(SLOT_UPD)].forEach((slot, i) => {
      const part = blocks[i];
      const src = part ? `${part.closed}\u0000${part.block}` : '';
      srcParts.push(src);
      if (slot.__dlSrc === src) return;
      slot.replaceChildren(...(part ? [card(part)] : []));
      slot.__dlSrc = src;
      mes.__dlNotifiedSrc = '';
    });
    if (textEl.dataset.dlpTheme && Prose) Prose.look(textEl, null); // 整层模式留下的主题标记撤掉，样式只罩住正文区
    syncReview(textEl, raw);
    ensureSlot(textEl, id);
    notifyFrontend(mes, textEl, id, srcParts.join('\u0001'));
    return true;
  }
  function plainNodes(text, msg, id) {
    const clean = String(text || '').replace(PLACEHOLDER, '');
    if (!clean.trim()) return [];
    const box = D.createElement('div');
    box.innerHTML = formatted(clean, msg, id);
    return [...box.childNodes];
  }
  function process(mes, look) {
    if (!mes || !mes.isConnected) return;
    const id = Number(mes.getAttribute('mesid'));
    if (!Number.isInteger(id) || mes.getAttribute('is_user') === 'true' || mes.getAttribute('is_system') === 'true') return;
    const textEl = mes.querySelector('.mes_text');
    if (!textEl || textEl.querySelector('textarea')) return; // 正在编辑
    const msg = chat()[id];
    if (!msg || msg.is_user || msg.is_system) return;
    // 有翻译等显示用文本时按显示文本来
    const raw = String(msg.extra && typeof msg.extra.display_text === 'string' ? msg.extra.display_text : msg.mes == null ? '' : msg.mes);
    if (id === 0 && raw.includes('<开局创建角色>')) return; // 开局封面归斗罗开局脚本画
    if (HAS_CONTENT.test(raw) && fillSlots(mes, textEl, raw, msg, id, look)) return;
    const keeps = currentKeeps();
    const keepsKey = keeps ? `${+!!keeps.think}${+!!keeps.interleave}${+!!keeps.type}` : '';
    const shown = cleanPresetTags(excludeFloorText(raw, exclusion), keeps);
    const prose = !!Prose && Prose.has(shown);
    // 画过的层也要重画：比如叙事核心撤下块标签后，这一层不再算“正文格式”，不重画就会留着旧的块
    if (shown !== raw || shown.includes(OPEN) || HAS_PLACEHOLDER.test(shown) || prose || seen.has(textEl)) {
      const now = look || currentLook();
      const src = [shown, msg.swipe_id || 0, prose ? now.key : '', prose && id >= chat().length - 2 ? statVersion : 0, keepsKey].join('\u0000');
      if (seen.get(textEl) !== src || !textEl.querySelector(':scope > [data-dl-snap]')) {
        const nodes = [];
        const zoned = HAS_CONTENT.test(shown); // 有正文区但显示正则没生效：只有区内画气泡，区外按酒馆原样
        splitBlocks(shown).forEach((part, i) => {
          if (part.block != null) nodes.push(card(part));
          else if (!zoned) nodes.push(...proseNodes(part.text, msg, id, i, now));
          else {
            let pos = 0, k = 0;
            for (const m of part.text.matchAll(CONTENT_ALL)) {
              nodes.push(...plainNodes(part.text.slice(pos, m.index), msg, id));
              const box = el('div', { 'data-dl-zone': '' }, ...proseNodes(m[1], msg, id, `${i}.${k++}`, now));
              if (Prose) Prose.look(box, now);
              nodes.push(box);
              pos = m.index + m[0].length;
            }
            nodes.push(...plainNodes(part.text.slice(pos), msg, id));
          }
        });
        textEl.replaceChildren(...nodes);
        seen.set(textEl, src);
        mes.__dlNotifiedSrc = '';
      }
      if (Prose) Prose.look(textEl, prose && !HAS_CONTENT.test(shown) ? now : null);
      ensureSlot(textEl, id);
      notifyFrontend(mes, textEl, id, src);
      return;
    } else if (textEl.dataset.dlpTheme && Prose) Prose.look(textEl, null);
    ensureSlot(textEl, id);
  }
  function rescan() { keepsCache = undefined; showReview = readReview(); const look = currentLook(); for (const mes of D.querySelectorAll('#chat .mes')) process(mes, look); }

  // ───────── 气运死劫的结局锁 ─────────
  const luckEnding = (st) => {
    const q = st && st.主角 && st.主角.气运;
    return q && q.结局 && typeof q.结局 === 'object' && q.结局.已终结 === true ? q.结局 : null;
  };
  function latestStat() {
    for (let i = chat().length - 1; i >= 0; i -= 1) { const st = statAt(i); if (st) return st; }
    return null;
  }
  const luckLock = createEndingLock(W, '气运', NAME);
  function relock() { try { luckLock.set(luckEnding(latestStat())); } catch (e) { console.warn(`[${NAME}] 结局锁没更新`, e); } }

  // ───────── 发给 AI 前裁剪 ─────────
  function keepCount() {
    try {
      const v = getVariables({ type: 'script' })[KEEP_KEY];
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_KEEP;
    } catch (_) { return DEFAULT_KEEP; }
  }
  const textOf = (m) => (typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.filter((p) => p && p.type === 'text').map((p) => p.text).join('\n') : '');
  function mapText(m, fn) {
    if (typeof m.content === 'string') m.content = fn(m.content);
    else if (Array.isArray(m.content)) m.content.forEach((p) => { if (p && p.type === 'text' && typeof p.text === 'string') p.text = fn(p.text); });
  }
  // 聊天记录里“最近 N 层以外”的更新块原文（按原文精确删除，避免碰到格式说明里的示例块）
  function oldBlocks(n) {
    const floors = [], unclosed = [];
    const c = chat();
    for (let i = c.length - 1; i >= 0; i -= 1) {
      const m = c[i];
      if (!m || m.is_user || m.is_system) continue;
      const text = String(m.mes || '');
      const found = text.match(BLOCKS);
      if (found) floors.push(found);
      const cut = text.match(UNCLOSED);
      if (cut) unclosed.push(cut[0]);
    }
    return floors.slice(n).flat().concat(unclosed);
  }
  const dropExact = (text, blocks) => blocks.reduce((t, b) => (t.includes(b) ? t.split(b).join('') : t), text);
  function trimChat(list, n) {
    let removed = 0;
    const withBlock = [];
    // 只数有完整更新块的回复；写到一半的块不占“保留层数”
    list.forEach((m, i) => { if (m && m.role === 'assistant' && HAS_BLOCK.test(textOf(m))) withBlock.push(i); });
    const keep = new Set(withBlock.slice(Math.max(0, withBlock.length - n)));
    for (const i of withBlock) {
      if (keep.has(i)) continue;
      mapText(list[i], (t) => t.replace(BLOCKS, () => { removed += 1; return ''; }));
    }
    list.forEach((m) => { if (m && m.role === 'assistant') mapText(m, (t) => t.replace(UNCLOSED, () => { removed += 1; return ''; })); });
    const old = oldBlocks(n);
    for (const m of list) {
      if (!m) continue;
      mapText(m, (t) => {
        let out = dropExact(t, old);
        if (out !== t) removed += 1;
        if (m.role === 'assistant') out = out.replace(PLACEHOLDER, '');
        return out;
      });
    }
    return removed;
  }
  function trimText(prompt, n) {
    const old = oldBlocks(n);
    const out = dropExact(prompt, old).replace(PLACEHOLDER, '');
    return { out, removed: old.filter((b) => prompt.includes(b)).length };
  }

  // ───────── “排除渲染”设置框 ─────────
  let exDialog = null;
  function closeExclusion() { if (exDialog) { try { if (exDialog.open) exDialog.close(); } catch (_) { /* 已关 */ } exDialog.remove(); exDialog = null; } }
  function openExclusion(onSaved) {
    if (exDialog && exDialog.isConnected) { const first = exDialog.querySelector('input'); if (first) first.focus(); return; }
    const saved = readExclusion();
    const input = (id, value, hint) => el('input', { id, type: 'text', value, maxlength: '200', autocomplete: 'off', spellcheck: 'false', placeholder: hint });
    const start = input('dl-ex-start', saved.start, '<thinking>'), end = input('dl-ex-end', saved.end, '</thinking>');
    const status = el('p', { role: 'status', 'aria-live': 'polite' });
    const button = (text, type) => el('button', { type: type || 'button', text });
    const save = button('保存并应用', 'submit'), clear = button('清空停用'), cancel = button('取消');
    const form = el('form', null,
      el('h2', { id: 'dl-ex-title', text: '排除渲染' }),
      el('p', { text: '填两个标签，隐藏它们包着的内容和标签本身。只填结束标签时，隐藏这一层从开头到结束标签的全部文字。' }),
      el('label', { for: 'dl-ex-start', text: '起始标签（可留空）' }), start,
      el('label', { for: 'dl-ex-end', text: '结束标签' }), end,
      el('p', { text: '只影响楼层显示，不改聊天记录，也不改发给 AI 的内容。保存后对已有和以后的楼层都生效。' }),
      status, el('footer', null, clear, cancel, save));
    const dialog = el('dialog', { id: 'dl-ex', 'aria-labelledby': 'dl-ex-title' }, form);
    let busy = false;
    async function apply(disable) {
      if (busy) return;
      const next = disable ? { start: '', end: '' } : { start: start.value.trim(), end: end.value.trim() };
      if (next.start && !next.end) { status.textContent = '请填写结束标签；只按结束标签排除时，把起始标签留空。'; end.focus(); return; }
      if (next.start && next.start === next.end) { status.textContent = '起始和结束标签要不一样。'; end.focus(); return; }
      busy = true;
      status.textContent = '正在保存…';
      try {
        if (typeof insertOrAssignVariables !== 'function') throw new Error('找不到脚本变量的保存接口，请确认酒馆助手已启用');
        await insertOrAssignVariables({ [EX_START]: next.start, [EX_END]: next.end }, { type: 'script' });
        closeExclusion();
        onSaved();
      } catch (e) { status.textContent = '保存失败：' + ((e && e.message) || '请重试'); } finally { busy = false; }
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); apply(false); });
    clear.addEventListener('click', () => apply(true));
    cancel.addEventListener('click', closeExclusion);
    dialog.addEventListener('close', closeExclusion);
    exDialog = dialog;
    D.body.append(dialog);
    try { dialog.showModal(); } catch (_) { dialog.setAttribute('open', ''); }
    start.focus();
  }
  // 开着的正则也在处理同样的东西时提醒一次：两边一起做会重复或互相打架
  function warnRegexes() {
    const list = activeDisplayRegexes();
    const hit = list.filter((r) => {
      const find = String(r.find_regex || '');
      if (!W[FMT_HOOK] && /UpdateVariable/iu.test(find)) return true;
      return /StatusPlaceHolder|<\\?\/?(?:story|scene|skill)\b/iu.test(find) || (/\\\{|\{\(/u.test(find) && /[「“]/u.test(find));
    }).map((r) => `「${r.script_name || '未命名'}」`);
    if (!hit.length) return;
    const text = `这些开着的正则也在处理变量更新块、幕签、转场、技能签或对白：${hit.join('、')}。这些现在由“${NAME}”脚本显示，两边一起做会重复或互相打架，建议关掉它们。`;
    console.warn(`[${NAME}]`, text);
    try { if (W.toastr && W.toastr.warning) W.toastr.warning(text, NAME, { timeOut: 15000 }); } catch (_) { /* 没有 toastr */ }
  }

  // ───────── 生命周期 ─────────
  function start() {
    try { if (W[GLOBAL] && typeof W[GLOBAL].destroy === 'function') W[GLOBAL].destroy(); } catch (_) { /* 旧实例已失效 */ }
    const style = D.createElement('style');
    style.id = 'dl-floor-style';
    style.textContent = CSS;
    const old = D.getElementById(style.id);
    if (old) old.remove();
    D.head.append(style);
    const proseStyle = D.createElement('style');
    proseStyle.id = 'dlp-style';
    proseStyle.textContent = PROSE_CSS;
    const oldProse = D.getElementById(proseStyle.id);
    if (oldProse) oldProse.remove();
    D.head.append(proseStyle);
    loadProse();
    exclusion = readExclusion();

    const stops = [];
    const on = (name, fn) => { if (!name) return; try { const r = eventOn(name, fn); if (r && typeof r.stop === 'function') stops.push(() => r.stop()); } catch (e) { console.warn(`[${NAME}] 监听 ${name} 失败`, e); } };
    let timer = 0;
    const later = () => { if (selfEmitDepth > 0) return; statCache.clear(); keepsCache = undefined; if (!timer) timer = W.setTimeout(() => { timer = 0; rescan(); relock(); }, 40); };
    // 头像、设置、主题变了：已画过的楼层都重画一遍
    const restyle = () => { version += 1; chosenCache = null; later(); };
    const E = typeof tavern_events === 'object' && tavern_events ? tavern_events : {};
    ['CHARACTER_MESSAGE_RENDERED', 'MESSAGE_UPDATED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED', 'MORE_MESSAGES_LOADED', 'CHAT_CHANGED', 'GENERATION_ENDED'].forEach((k) => on(E[k], later));
    on(E.GENERATION_STARTED, (_type, _opt, dryRun) => { if (!dryRun) generating = true; });
    const ended = () => { if (generating) { generating = false; generatedAt = W.performance.now(); } };
    on(E.GENERATION_ENDED, ended);
    on(E.GENERATION_STOPPED, ended);
    on(E.CHAT_CHANGED, () => { generating = false; generatedAt = -1e9; played.clear(); });
    // 变量更新完：技能卡要用到新写进去的魂环，最后几层重画
    (async () => {
      try {
        await waitGlobalInitialized('Mvu');
        const bump = () => { statVersion += 1; later(); };
        on(Mvu.events.VARIABLE_INITIALIZED, bump);
        on(Mvu.events.VARIABLE_UPDATE_ENDED, () => { bump(); W.setTimeout(bump, 900); });
      } catch (_) { /* 没有 MVU 时技能卡只用正文补写的资料 */ }
    })();
    W.addEventListener('dl-avatars-ready', restyle);
    W.addEventListener('dl-settings-changed', restyle);
    W.addEventListener('dl-ext-changed', restyle); // 叙事核心登记、撤下块标签时重画
    W.addEventListener('dl-ext-registry-changed', restyle);
    W.addEventListener('dl-luck-changed', restyle);
    const onStorage = (e) => { if (!e || e.key === STORE_KEY) restyle(); };
    W.addEventListener('storage', onStorage);
    let lookMo = null;
    if (W.MutationObserver) {
      lookMo = new W.MutationObserver(restyle);
      lookMo.observe(D.documentElement, { attributes: true, attributeFilter: ['data-dl-theme', 'data-dl-motion'] });
    }
    try { if (typeof getButtonEvent === 'function') on(getButtonEvent('排除渲染'), () => openExclusion(() => { exclusion = readExclusion(); restyle(); })); } catch (e) { console.warn(`[${NAME}] “排除渲染”按钮没接上`, e); }
    on(E.CHAT_COMPLETION_PROMPT_READY, (data) => {
      if (!data || !Array.isArray(data.chat)) return;
      const removed = trimChat(data.chat, keepCount());
      if (removed && !data.dryRun) console.info(`[${NAME}] 发给 AI 前删去 ${removed} 处旧的变量更新块，保留最近 ${keepCount()} 层`);
    });
    on(E.GENERATE_AFTER_COMBINE_PROMPTS, (data) => {
      if (!data || typeof data.prompt !== 'string') return;
      const r = trimText(data.prompt, keepCount());
      data.prompt = r.out;
      if (r.removed && !data.dryRun) console.info(`[${NAME}] 发给 AI 前删去 ${r.removed} 处旧的变量更新块`);
    });

    // 流式生成时酒馆会反复重写消息正文，用 MutationObserver 跟上；酒馆助手挂前端 iframe 的改动跳过
    const queue = new Set();
    let mo = null;
    const root = D.getElementById('chat');
    if (root && W.MutationObserver) {
      mo = new W.MutationObserver((records) => {
        for (const r of records) {
          const t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
          if (t && t.closest && t.closest('.TH-render, .TH-streaming')) continue;
          const changed = [...(r.addedNodes || []), ...(r.removedNodes || [])];
          if (r.type === 'childList' && changed.length && changed.every((n) => n.nodeType === 1 && n.matches && n.matches('.TH-render, .TH-streaming'))) continue;
          const mes = t && t.closest ? t.closest('.mes') : null;
          if (mes) queue.add(mes);
          for (const n of r.addedNodes || []) if (n.nodeType === 1) { if (n.matches && n.matches('.mes')) queue.add(n); else if (n.querySelectorAll) n.querySelectorAll('.mes').forEach((m) => queue.add(m)); }
        }
        const batch = [...queue];
        queue.clear();
        if (!batch.length) return;
        const look = currentLook();
        batch.forEach((mes) => process(mes, look));
      });
      mo.observe(root, { childList: true, subtree: true, characterData: true });
    }

    let dead = false;
    const api = {
      rescan,
      _beforeRegex: beforeRegex,
      destroy() {
        if (dead) return;
        dead = true;
        stops.splice(0).forEach((f) => { try { f(); } catch (_) { /* 已停 */ } });
        if (mo) mo.disconnect();
        if (lookMo) lookMo.disconnect();
        if (timer) W.clearTimeout(timer);
        pendingNotify.forEach((tid) => W.clearTimeout(tid));
        pendingNotify.clear();
        luckLock.detach();
        W.removeEventListener('dl-avatars-ready', restyle);
        W.removeEventListener('dl-settings-changed', restyle);
        W.removeEventListener('dl-ext-changed', restyle);
        W.removeEventListener('dl-ext-registry-changed', restyle);
        W.removeEventListener('dl-luck-changed', restyle);
        W.removeEventListener('storage', onStorage);
        closeExclusion();
        style.remove();
        proseStyle.remove();
        D.querySelectorAll('#chat .mes_text[data-dlp-theme]').forEach((t) => { delete t.dataset.dlpTheme; delete t.dataset.dlpMotion; delete t.dataset.dlpSurface; });
        try { if (Prose && W.DLProse === Prose) delete W.DLProse; } catch (_) { /* 主页面已关 */ }
        if (W[GLOBAL] === api) delete W[GLOBAL];
      },
      // 测试用
      pure: { splitBlocks, parseBlock, trimChat, trimText, acts: ACTS, playAt },
    };
    W[GLOBAL] = api;
    ensureFormatHook();
    rescan();
    warnRegexes();
    // 结局锁的接线单独兜住：出错不能连累正文显示
    try { luckLock.attach(on, () => !!luckEnding(latestStat())); relock(); } catch (e) { console.warn(`[${NAME}] 结局锁没接上，气运结局后不会拦发送`, e); }
    window.addEventListener('pagehide', () => api.destroy(), { once: true });
  }

  try { start(); } catch (e) { console.error(`[${NAME}] 启动失败`, e); }
})();

// 斗罗远程正文结束
