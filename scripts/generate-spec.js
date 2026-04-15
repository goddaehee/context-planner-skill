#!/usr/bin/env node
/**
 * plan.md → 기획서 PPTX 생성기 (Phase F v4 — "Korean Corporate Light")
 *
 * 입력: plan.md (context-planner 10섹션 구조)
 * 출력: spec.pptx (13슬라이드)
 *
 * v4 변경사항: 라이트 테마(흰색+블루), 참고 양식(LFML-139979) 기반 표지,
 *   plan.md 10섹션 전체 동적 파싱, 작성자 fm.owner 사용
 */

const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// Accept case dir as CLI argument (e.g. "node generate-spec.js cases/my-case")
// Falls back to script directory for backward compatibility
const caseArg = process.argv[2];
const CASE_DIR = caseArg ? path.resolve(process.cwd(), caseArg) : __dirname;
const PLAN_FILE = path.join(CASE_DIR, "plan.md");
const IMAGES_DIR = path.join(CASE_DIR, "images");
const CTX_FILE = path.join(CASE_DIR, "context-input.json");
const OUTPUT_FILE = path.join(CASE_DIR, "spec.pptx");

// ─── Color Palette: "Korean Corporate Light" ──────────────────
const C = {
  bg:          "FFFFFF",  // slide background (white)
  bgCard:      "F5F5F5",  // card / container
  bgRowA:      "FFFFFF",  // table row even
  bgRowB:      "EFF4FB",  // table row odd (light blue-gray)
  bgGreen:     "E2EFDA",  // green tint background
  white:       "FFFFFF",
  dark:        "1A1A2E",  // header band
  mainTxt:     "333333",  // main body text
  muted:       "666666",  // captions, metadata
  border:      "CCCCCC",  // table borders
  blue:        "0070C0",  // primary accent (참고 양식)
  blueDark:    "004A8F",  // darker blue for header
  blueLight:   "DEEAF1",  // blue tint
  orange:      "ED7D31",  // secondary accent
  red:         "C00000",  // danger
  amber:       "D29922",  // warning
  greenAccent: "70AD47",  // ok/resolved
};

const FONT      = "맑은 고딕";
const FONT_MONO = "Consolas";
const W = 10;      // slide width (inches, 16:9)
const H = 5.625;   // slide height (inches)
const M = 0.45;    // left/right margin

// ─── Section Aliases (한국어/영어 헤더 정규화) ───────────────
const SECTION_ALIASES = {
  "추진 배경":       "background", "Problem & Intent":    "background",
  "이번 범위":       "scope",      "In-Scope":            "scope",
  "제외 항목":       "exclusions", "Out-of-scope":        "exclusions",
  "Out-of-Scope":    "exclusions",
  "기준 문서":       "references", "References":          "references",
  "업무 규칙":       "rules",      "Business Rules":      "rules",
  "제약 조건":       "constraints","Constraints":         "constraints",
  "완료 기준":       "acceptance", "Acceptance Criteria": "acceptance",
  "확인 필요 사항":  "oq",         "Open Questions":      "oq",
  "위험 요소":       "risks",      "Risks":               "risks",
  "착수 판단":       "readiness",  "Readiness":           "readiness",
};

// ─── Parsers ──────────────────────────────────────────────────
function parsePlanMd(filepath) {
  const raw = fs.readFileSync(filepath, "utf-8");

  // YAML frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0 && !line.startsWith("  ")) {
        const key = line.slice(0, idx).trim();
        const value = line
          .slice(idx + 1)
          .trim()
          .replace(/^"(.*)"$/, "$1")
          .replace(/^'(.*)'$/, "$1");
        fm[key] = value;
      }
    }
  }

  // 문서 성격 block (between --- and ## 1.)
  const docNatureMatch = raw.match(/^## 문서 성격\n([\s\S]*?)(?=^## \d+\.)/m);
  const docNature = docNatureMatch ? docNatureMatch[1].trim() : "";

  // Numbered sections ## N. Title
  const sections = {};
  const re = /^## (\d+)\. (.+)$/gm;
  const hits = [];
  let m;
  while ((m = re.exec(raw)) !== null) {
    hits.push({ num: m[1], title: m[2].trim(), pos: m.index + m[0].length });
  }
  for (let i = 0; i < hits.length; i++) {
    const end = i + 1 < hits.length
      ? hits[i + 1].pos - hits[i + 1].title.length - 8
      : raw.length;
    const body = raw.substring(hits[i].pos, end).trim();
    const alias = SECTION_ALIASES[hits[i].title] || `sec${hits[i].num}`;
    const entry = { title: hits[i].title, body, num: hits[i].num };
    sections[alias] = entry;
    sections[hits[i].num] = entry; // numeric key for fallback
  }

  return { fm, sections, docNature };
}

function bullets(text) {
  return text
    .split("\n")
    .filter(l => /^- /.test(l))
    .map(l => l.replace(/^- /, "").replace(/\*\*(.*?)\*\*/g, "$1").trim())
    .filter(Boolean);
}

function stripMd(text) {
  return String(text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function parseMarkdownTable(text) {
  const lines = text.split("\n").filter(l => l.trim().startsWith("|"));
  if (lines.length < 2) return null;
  const parseLine = l => l.split("|").slice(1, -1).map(c => c.trim());
  const headers = parseLine(lines[0]);
  const rows = lines.slice(2).map(parseLine).filter(r => r.length > 0);
  return { headers, rows };
}

function parseSubSections(text) {
  const re = /^### (.+)$/gm;
  const hits = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    hits.push({ title: m[1].trim(), pos: m.index + m[0].length });
  }
  const result = {};
  for (let i = 0; i < hits.length; i++) {
    const end = i + 1 < hits.length
      ? hits[i + 1].pos - hits[i + 1].title.length - 5
      : text.length;
    result[hits[i].title] = text.substring(hits[i].pos, end).trim();
  }
  return result;
}

function parseOQTable(body) {
  const table = parseMarkdownTable(body);
  if (!table || table.rows.length === 0) return [];
  return table.rows.map(row => {
    const qCell = row[1] || row[0] || "";
    const numCell = row[0] || "";
    const isResolved = qCell.includes("~~") || numCell.includes("~~");
    return {
      num:       stripMd(numCell),
      question:  stripMd(qCell),
      impact:    stripMd(row[2] || ""),
      path:      stripMd(row[3] || ""),
      owner:     stripMd(row[4] || ""),
      fallback:  stripMd(row[5] || ""),
      isResolved,
    };
  });
}

function hasImage(name) {
  const p = path.join(IMAGES_DIR, name);
  if (!fs.existsSync(p) || fs.statSync(p).size < 1000) return false;
  const buf = Buffer.alloc(4);
  const fd = fs.openSync(p, "r");
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  return buf[0] === 0x89 && buf[1] === 0x50; // PNG magic
}

// ─── Shared Helpers ───────────────────────────────────────────
function addHeader(slide, title, pres) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: M, y: 0.3, w: 0.06, h: 0.55,
    fill: { color: C.blue },
  });
  slide.addText(title, {
    x: M + 0.18, y: 0.25, w: 8.5, h: 0.72,
    fontFace: FONT, fontSize: 20, color: C.mainTxt,
    bold: true, valign: "middle", margin: 0,
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: M, y: 0.9, w: W - M * 2, h: 0.02,
    fill: { color: C.border },
  });
}

function th(text, align) {
  return {
    text,
    options: {
      fill: { color: C.blue }, color: C.white,
      bold: true, fontSize: 9, fontFace: FONT,
      align: align || "left", valign: "middle",
    },
  };
}

function td(text, i, opts) {
  return {
    text: String(text || ""),
    options: {
      fill: { color: i % 2 === 0 ? C.bgRowA : C.bgRowB },
      fontSize: 9, fontFace: FONT, color: C.mainTxt,
      valign: "middle", ...opts,
    },
  };
}

function estimateBadge(slide, x, y) {
  slide.addText("ESTIMATE", {
    x, y, w: 1.1, h: 0.24,
    fontFace: FONT, fontSize: 8, color: C.amber,
    bold: true, align: "center", valign: "middle",
    fill: { color: "FFF2CC" },
    border: { pt: 1, color: C.amber },
  });
}

function addPlaceholder(slide, pres, x, y, w, h, label, hint) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: "F0F4F8" },
    border: { pt: 1.5, color: C.blue },
    line: { dashType: "sysDash" },
  });
  slide.addText(`[ 이미지 삽입 ]\n${label}\n${hint || ""}`, {
    x: x + 0.1, y, w: w - 0.2, h,
    fontFace: FONT, fontSize: 10, color: C.muted,
    align: "center", valign: "middle",
  });
}

function addChecklistItem(slide, x, y, w, text) {
  slide.addText(`☐  ${text}`, {
    x, y, w, h: 0.34,
    fontFace: FONT, fontSize: 10, color: C.mainTxt,
    valign: "middle",
  });
}

function addInfoCard(slide, pres, x, y, w, h, title, body, color) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.bgCard },
    border: { pt: 1, color: color },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h: 0.07,
    fill: { color: color },
  });
  slide.addText(title, {
    x: x + 0.15, y: y + 0.1, w: w - 0.3, h: 0.36,
    fontFace: FONT, fontSize: 11, color: color,
    bold: true, valign: "middle", margin: 0,
  });
  slide.addText(body, {
    x: x + 0.15, y: y + 0.52, w: w - 0.3, h: h - 0.65,
    fontFace: FONT, fontSize: 10, color: C.mainTxt,
    valign: "top",
  });
}

// ─── Shared helpers ───────────────────────────────────────────
const fmtOQ = num => (/^\d+$/.test(num) ? `OQ#${num}` : (num || "-"));

// ─── Slide 1: Cover ──────────────────────────────────────────
function slide1(pres, fm) {
  const s = pres.addSlide();
  s.background = { color: C.bg };

  // Dark header band
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: 1.55,
    fill: { color: C.dark },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: 0.1,
    fill: { color: C.blue },
  });

  // Breadcrumb
  const caseName = fm.case_name || "Specification";
  const project  = fm.target_project || "";
  const crumb    = project ? `${project}  >  ${caseName}` : caseName;
  s.addText(crumb, {
    x: M, y: 0.13, w: 9.1, h: 0.36,
    fontFace: FONT, fontSize: 9, color: "AAAAAA",
    valign: "middle", margin: 0,
  });

  // Title
  const titleText = caseName.replace(/-/g, " ");
  s.addText(titleText, {
    x: M, y: 0.52, w: 7.4, h: 0.95,
    fontFace: FONT, fontSize: 26, color: C.white,
    bold: true, valign: "middle", margin: 0,
  });

  // Version badge
  if (fm.version) {
    s.addText(`v${fm.version}`, {
      x: W - 1.45, y: 0.6, w: 1.1, h: 0.42,
      fontFace: FONT, fontSize: 18, color: C.blue,
      bold: true, align: "center", valign: "middle",
      fill: { color: C.white },
      border: { pt: 1, color: C.blue },
    });
  }

  // Maturity badge
  if (fm.maturity_level) {
    const mc = fm.maturity_level.startsWith("L3") ? C.greenAccent
             : fm.maturity_level.startsWith("L2") ? C.orange : "888888";
    s.addText(fm.maturity_level, {
      x: M, y: 1.65, w: 2.2, h: 0.28,
      fontFace: FONT, fontSize: 9, color: mc,
      bold: true, align: "center", valign: "middle",
      fill: { color: "F5F5F5" },
      border: { pt: 0.75, color: mc },
    });
  }

  // Metadata table (작성자/검토자/작성일/검토일)
  const owner   = fm.owner || "미정";
  const dateStr = fm.last_updated || "";
  s.addTable(
    [
      [th("구분","center"), th("내용"), th("구분","center"), th("내용")],
      [
        td("작성자", 0, { color: C.muted, bold: true, align: "center" }),
        td(owner, 0),
        td("작성일", 0, { color: C.muted, bold: true, align: "center" }),
        td(dateStr, 0),
      ],
      [
        td("검토자", 1, { color: C.muted, bold: true, align: "center" }),
        td("", 1),
        td("검토일", 1, { color: C.muted, bold: true, align: "center" }),
        td("", 1),
      ],
    ],
    {
      x: M, y: 2.05, w: 6.2, colW: [1.1, 1.95, 1.1, 2.05],
      border: { pt: 0.75, color: C.border },
      rowH: [0.26, 0.3, 0.3],
      autoPage: false,
    }
  );

  s.addShape(pres.shapes.RECTANGLE, {
    x: M, y: 3.18, w: 6.2, h: 0.02,
    fill: { color: C.border },
  });

  // Wiki refs note
  if (fm.source_wikis) {
    s.addText("기준 Wiki: " + fm.source_wikis.replace(/^\[/, "").replace(/\]$/, ""),  {
      x: M, y: 3.28, w: 7.0, h: 0.28,
      fontFace: FONT, fontSize: 9, color: C.muted, margin: 0,
    });
  }

  // Right decorative panel
  s.addShape(pres.shapes.RECTANGLE, {
    x: 7.9, y: 1.6, w: 2.1, h: H - 1.6,
    fill: { color: C.blueLight },
  });
  s.addText("기획서", {
    x: 7.9, y: 2.5, w: 2.1, h: 0.52,
    fontFace: FONT, fontSize: 16, color: C.blue,
    bold: true, align: "center", margin: 0,
  });
  s.addText("Specification", {
    x: 7.9, y: 3.1, w: 2.1, h: 0.32,
    fontFace: FONT, fontSize: 9, color: C.muted,
    align: "center", margin: 0,
  });
}

// ─── Slide 2: 프로젝트 개요 (도입부) ─────────────────────────
function slide2(pres, docNature, sections, ctxInput) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "프로젝트 개요", pres);

  const bkgBullets = sections.background ? bullets(sections.background.body) : [];

  // WHAT: from 문서 성격 or Section 1 first bullet
  const whatLines = docNature
    ? docNature.split("\n").filter(l => l.startsWith("-")).map(l => l.replace(/^- /, "")).slice(0, 3)
    : bkgBullets.slice(0, 2);
  const whatText = whatLines.join("\n") || bkgBullets[0] || "";

  // WHO: from context-input or fallback
  const whoText = ctxInput?.team || "내부 운영 / 마케팅팀";

  // WHY: first background bullet that has 이유/배경
  const whyText = bkgBullets[0] || "";

  const cards = [
    { label: "WHAT", title: "무엇을 하는가", body: stripMd(whatText).slice(0, 200), color: C.blue },
    { label: "WHO",  title: "누가 사용하는가", body: stripMd(whoText).slice(0, 150), color: C.orange },
    { label: "WHY",  title: "왜 지금인가", body: stripMd(whyText).slice(0, 200), color: C.greenAccent },
  ];

  const cW = (W - M * 2 - 0.4) / 3;
  cards.forEach((card, i) => {
    const x = M + i * (cW + 0.2);
    addInfoCard(s, pres, x, 1.05, cW, H - 1.52, card.title, card.body, card.color);
    s.addText(card.label, {
      x: x + cW - 0.7, y: 1.08, w: 0.62, h: 0.28,
      fontFace: FONT, fontSize: 8, color: C.white,
      bold: true, align: "center", valign: "middle",
      fill: { color: card.color },
    });
  });
}

// ─── Slide 3: 추진 배경 ───────────────────────────────────────
function slide3(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "추진 배경 / 목적", pres);

  const items = sections.background ? bullets(sections.background.body) : [];
  items.slice(0, 4).forEach((item, i) => {
    const y = 1.05 + i * 1.05;
    s.addShape(pres.shapes.RECTANGLE, {
      x: M, y, w: W - M * 2, h: 0.9,
      fill: { color: C.bgCard },
      border: { pt: 0.5, color: C.border },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: M, y, w: 0.07, h: 0.9,
      fill: { color: C.blue },
    });
    s.addText(`0${i + 1}`, {
      x: M + 0.15, y, w: 0.6, h: 0.9,
      fontFace: FONT, fontSize: 22, color: C.blue,
      bold: true, valign: "middle", align: "center", margin: 0,
    });
    s.addText(stripMd(item), {
      x: M + 0.82, y, w: W - M * 2 - 0.9, h: 0.9,
      fontFace: FONT, fontSize: 12, color: C.mainTxt,
      valign: "middle",
    });
  });
}

// ─── Slide 4: AS-IS + TO-BE ───────────────────────────────────
function slide4(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "현황 분석 (AS-IS) / 개선 방안 (TO-BE)", pres);

  const mid = W / 2;
  const cW  = mid - M - 0.12;

  // AS-IS label
  s.addShape(pres.shapes.RECTANGLE, {
    x: M, y: 0.98, w: cW, h: 0.26,
    fill: { color: "FDECEA" },
  });
  s.addText("AS-IS (현행)", {
    x: M + 0.1, y: 0.98, w: cW, h: 0.26,
    fontFace: FONT, fontSize: 10, color: C.red,
    bold: true, valign: "middle", margin: 0,
  });

  const asFound = ["image2026-4-6_15-53-57.png", "image2026-4-6_15-55-20.png"].find(f => hasImage(f));
  if (asFound) {
    s.addImage({ path: path.join(IMAGES_DIR, asFound), x: M, y: 1.28, w: cW, h: H - 1.55 });
  } else {
    addPlaceholder(s, pres, M, 1.28, cW, H - 1.55, "AS-IS 화면 캡처", "AS-IS screenshot placeholder");
  }

  // TO-BE label
  s.addShape(pres.shapes.RECTANGLE, {
    x: mid + 0.12, y: 0.98, w: cW, h: 0.26,
    fill: { color: "E2EFDA" },
  });
  s.addText("TO-BE (개선)", {
    x: mid + 0.22, y: 0.98, w: cW, h: 0.26,
    fontFace: FONT, fontSize: 10, color: C.greenAccent,
    bold: true, valign: "middle", margin: 0,
  });

  const toFound = ["image2026-4-6_15-58-58.png", "image2026-4-6_15-59-51.png", "image2026-4-6_16-3-59.png"].find(f => hasImage(f));
  if (toFound) {
    s.addImage({ path: path.join(IMAGES_DIR, toFound), x: mid + 0.12, y: 1.28, w: cW, h: H - 1.55 });
  } else {
    addPlaceholder(s, pres, mid + 0.12, 1.28, cW, H - 1.55, "TO-BE 화면 캡처", "TO-BE screenshot placeholder");
  }

  // Divider
  s.addShape(pres.shapes.RECTANGLE, {
    x: mid + 0.04, y: 0.95, w: 0.06, h: H - 1.1,
    fill: { color: C.border },
  });
}

// ─── Slide 5: 범위 / 제외 항목 ───────────────────────────────
function slide5(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "이번 범위 / 제외 항목", pres);

  const scopeItems   = sections.scope      ? bullets(sections.scope.body)      : [];
  const excludeItems = sections.exclusions ? bullets(sections.exclusions.body) : [];
  const cW   = (W - M * 2 - 0.3) / 2;
  const midX = M + cW + 0.3;

  // In-scope header
  s.addShape(pres.shapes.RECTANGLE, {
    x: M, y: 0.98, w: cW, h: 0.32,
    fill: { color: C.blue },
  });
  s.addText("✓  이번 범위 (IN-SCOPE)", {
    x: M + 0.1, y: 0.98, w: cW, h: 0.32,
    fontFace: FONT, fontSize: 10, color: C.white,
    bold: true, valign: "middle", margin: 0,
  });
  scopeItems.slice(0, 10).forEach((item, i) => {
    const y = 1.36 + i * 0.41;
    s.addShape(pres.shapes.OVAL, {
      x: M + 0.08, y: y + 0.12, w: 0.14, h: 0.14,
      fill: { color: C.blue },
    });
    s.addText(stripMd(item), {
      x: M + 0.3, y, w: cW - 0.35, h: 0.38,
      fontFace: FONT, fontSize: 9, color: C.mainTxt,
      valign: "middle",
    });
  });

  // Exclusion header
  s.addShape(pres.shapes.RECTANGLE, {
    x: midX, y: 0.98, w: cW, h: 0.32,
    fill: { color: C.red },
  });
  s.addText("✗  제외 항목 (OUT-OF-SCOPE)", {
    x: midX + 0.1, y: 0.98, w: cW, h: 0.32,
    fontFace: FONT, fontSize: 10, color: C.white,
    bold: true, valign: "middle", margin: 0,
  });
  excludeItems.slice(0, 10).forEach((item, i) => {
    const y = 1.36 + i * 0.41;
    s.addShape(pres.shapes.RECTANGLE, {
      x: midX + 0.08, y: y + 0.12, w: 0.14, h: 0.14,
      fill: { color: C.red },
    });
    s.addText(stripMd(item), {
      x: midX + 0.3, y, w: cW - 0.35, h: 0.38,
      fontFace: FONT, fontSize: 9, color: C.mainTxt,
      valign: "middle",
    });
  });
}

// ─── Slide 6: 업무 규칙 ───────────────────────────────────────
function slide6(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "업무 규칙 / 프로세스", pres);

  if (!sections.rules) {
    s.addText("업무 규칙 섹션(5번) 없음", {
      x: M, y: 2.0, w: 8.0, h: 1.0,
      fontFace: FONT, fontSize: 14, color: C.muted,
      align: "center", valign: "middle",
    });
    return;
  }

  const sub      = parseSubSections(sections.rules.body);
  const subKeys  = Object.keys(sub);
  const urlKey   = subKeys.find(k => k.includes("URL") || k.includes("url"));
  const tblKeys  = subKeys.filter(k => k !== urlKey && sub[k].includes("|")).slice(0, 2);
  const otherKeys= subKeys.filter(k => k !== urlKey && !tblKeys.includes(k)).slice(0, 2);

  let curY = 1.05;

  // Render table sub-sections (side-by-side if 2)
  if (tblKeys.length > 0) {
    const tW = tblKeys.length === 2 ? (W - M * 2 - 0.25) / 2 : W - M * 2;
    let maxTableRows = 0;
    tblKeys.forEach((key, ti) => {
      const x = M + ti * (tW + 0.25);
      s.addText(key, {
        x, y: curY, w: tW, h: 0.26,
        fontFace: FONT, fontSize: 10, color: C.blue, bold: true, margin: 0,
      });
      const table = parseMarkdownTable(sub[key]);
      if (table && table.rows.length > 0) {
        const cCount = table.headers.length;
        s.addTable(
          [
            table.headers.map(h => th(stripMd(h))),
            ...table.rows.slice(0, 9).map((row, i) =>
              row.map(cell => td(stripMd(cell), i))
            ),
          ],
          {
            x, y: curY + 0.28, w: tW,
            colW: cCount === 3
              ? [tW * 0.12, tW * 0.28, tW * 0.60]
              : Array(cCount).fill(tW / cCount),
            border: { pt: 0.5, color: C.border },
            rowH: [0.26, ...Array(Math.min(table.rows.length, 9)).fill(0.30)],
            autoPage: false,
          }
        );
        maxTableRows = Math.max(maxTableRows, table.rows.length);
      }
    });
    curY += 0.28 + 0.26 + maxTableRows * 0.30 + 0.2;
  }

  // URL pattern block
  if (urlKey && sub[urlKey] && curY < 4.6) {
    const codeMatch = sub[urlKey].match(/```[\s\S]*?```/);
    let codeText = codeMatch
      ? codeMatch[0].replace(/```\w*\n?/g, "").trim()
      : sub[urlKey].split("\n").filter(l => l.trim().startsWith("http")).join("\n");
    if (!codeText) codeText = sub[urlKey].slice(0, 300);

    const urlLines = codeText.split("\n").length;
    const urlH = Math.min(H - curY - 0.15, Math.max(urlLines * 0.19 + 0.1, 1.0));
    s.addShape(pres.shapes.RECTANGLE, {
      x: M, y: curY, w: W - M * 2, h: 0.26,
      fill: { color: C.blue },
    });
    s.addText("URL 생성 패턴", {
      x: M + 0.15, y: curY, w: 4.0, h: 0.26,
      fontFace: FONT, fontSize: 9, color: C.white, bold: true, margin: 0,
    });
    curY += 0.28;
    s.addShape(pres.shapes.RECTANGLE, {
      x: M, y: curY, w: W - M * 2, h: urlH,
      fill: { color: "F8F8F8" },
      border: { pt: 0.5, color: C.border },
    });
    s.addText(codeText.slice(0, 400), {
      x: M + 0.15, y: curY + 0.05, w: W - M * 2 - 0.3, h: urlH - 0.08,
      fontFace: FONT_MONO, fontSize: 8, color: C.blue, margin: 0,
    });
    curY += urlH + 0.15;
  }

  // Other bullet sections
  otherKeys.forEach(key => {
    if (curY >= 4.8) return;
    const items = bullets(sub[key]).slice(0, 4);
    if (items.length === 0) return;
    s.addText(`${key}:`, {
      x: M, y: curY, w: 4.0, h: 0.24,
      fontFace: FONT, fontSize: 9, color: C.muted, bold: true, margin: 0,
    });
    curY += 0.26;
    items.forEach(item => {
      if (curY >= 4.9) return;
      s.addText(`• ${stripMd(item)}`, {
        x: M + 0.2, y: curY, w: W - M * 2 - 0.2, h: 0.24,
        fontFace: FONT, fontSize: 9, color: C.mainTxt, margin: 0,
      });
      curY += 0.26;
    });
  });
}

// ─── Slide 7: 제약 조건 ───────────────────────────────────────
function slide7(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "제약 조건", pres);

  if (!sections.constraints) {
    s.addText("제약 조건 섹션(6번) 없음", {
      x: M, y: 2.0, w: 8.0, h: 1.0,
      fontFace: FONT, fontSize: 14, color: C.muted,
      align: "center", valign: "middle",
    });
    return;
  }

  const sub     = parseSubSections(sections.constraints.body);
  const subKeys = Object.keys(sub);
  const colors  = [C.blue, C.orange, C.greenAccent];
  const n       = Math.min(subKeys.length, 3) || 1;
  const cW      = (W - M * 2 - 0.2 * (n - 1)) / n;

  subKeys.slice(0, 3).forEach((key, i) => {
    const x     = M + i * (cW + 0.2);
    const items = bullets(sub[key]).slice(0, 7);
    const col   = colors[i] || C.blue;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.0, w: cW, h: H - 1.35,
      fill: { color: C.bgCard },
      border: { pt: 1, color: col },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.0, w: cW, h: 0.07,
      fill: { color: col },
    });
    s.addText(key, {
      x: x + 0.12, y: 1.1, w: cW - 0.24, h: 0.34,
      fontFace: FONT, fontSize: 11, color: col,
      bold: true, valign: "middle", margin: 0,
    });
    items.forEach((item, j) => {
      s.addText(`• ${stripMd(item)}`, {
        x: x + 0.12, y: 1.5 + j * 0.55, w: cW - 0.24, h: 0.52,
        fontFace: FONT, fontSize: 9, color: C.mainTxt,
        valign: "top",
      });
    });
  });
}

// ─── Slide 8: 완료 기준 ───────────────────────────────────────
function slide8(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "완료 기준 (Definition of Done)", pres);

  if (!sections.acceptance) {
    s.addText("완료 기준 섹션(7번) 없음", {
      x: M, y: 2.0, w: 8.0, h: 1.0,
      fontFace: FONT, fontSize: 14, color: C.muted,
      align: "center", valign: "middle",
    });
    return;
  }

  const items = bullets(sections.acceptance.body);
  const half  = Math.ceil(items.length / 2);
  const colW  = (W - M * 2 - 0.3) / 2;

  // Two-column checklist
  [[0, half, M], [half, items.length, M + colW + 0.3]].forEach(([start, end, x]) => {
    items.slice(start, end).forEach((item, i) => {
      addChecklistItem(s, x, 1.05 + i * 0.44, colW, stripMd(item));
    });
  });

  s.addText("검수 시 위 항목을 체크리스트로 확인합니다.", {
    x: M, y: H - 0.35, w: W - M * 2, h: 0.26,
    fontFace: FONT, fontSize: 9, color: C.muted, italic: true, margin: 0,
  });
}

// ─── Slide 9: 일정 계획 ───────────────────────────────────────
function slide9(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "일정 계획", pres);
  estimateBadge(s, W - 1.6, 0.3);

  const phases = [
    { label: "Phase 1", name: "화면 골격",  task: "기본 레이아웃, 진입 화면 구조 설계",       dur: "N일", color: C.greenAccent },
    { label: "Phase 2", name: "핵심 기능",  task: "주요 기능 구현 및 비즈니스 규칙 반영",     dur: "N일", color: C.blue },
    { label: "Phase 3", name: "부가 기능",  task: "선택 필드, 예외 처리, UX 개선",            dur: "N일", color: C.orange },
    { label: "Phase 4", name: "QA",         task: "완료 기준 기반 테스트 및 검증",             dur: "N일", color: C.muted },
  ];

  const bW = 1.88, bH = 1.1, bY = 1.05, gap = 0.33;
  phases.forEach((ph, i) => {
    const x = M + i * (bW + gap);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: bY, w: bW, h: bH,
      fill: { color: C.bgCard },
      border: { pt: 1.5, color: ph.color },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: bY, w: bW, h: 0.07,
      fill: { color: ph.color },
    });
    s.addText(ph.label, {
      x, y: bY + 0.12, w: bW, h: 0.24,
      fontFace: FONT, fontSize: 9, color: C.muted,
      align: "center", margin: 0,
    });
    s.addText(ph.name, {
      x, y: bY + 0.38, w: bW, h: 0.4,
      fontFace: FONT, fontSize: 14, color: C.mainTxt,
      bold: true, align: "center", margin: 0,
    });
    s.addText(ph.dur, {
      x, y: bY + 0.8, w: bW, h: 0.24,
      fontFace: FONT, fontSize: 10, color: ph.color,
      bold: true, align: "center", margin: 0,
    });
    if (i < 3) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: x + bW, y: bY + bH / 2 - 0.02, w: gap, h: 0.04,
        fill: { color: C.border },
      });
    }
  });

  s.addTable(
    [
      [th("단계"), th("작업"), th("상세"), th("기간","center")],
      ...phases.map((ph, i) => [
        td(ph.label, i, { bold: true, color: ph.color }),
        td(ph.name,  i, { bold: true }),
        td(ph.task,  i),
        td(ph.dur,   i, { align: "center", bold: true }),
      ]),
    ],
    {
      x: M, y: 2.38, w: W - M * 2, colW: [1.0, 1.4, 5.6, 0.8],
      border: { pt: 0.5, color: C.border },
      rowH: [0.26, 0.28, 0.28, 0.28, 0.28],
      autoPage: false,
    }
  );

  s.addText("[ESTIMATE] 범위 분석 기반 추정. 실제 일정은 PM 협의 후 확정.", {
    x: M, y: H - 0.35, w: W - M * 2, h: 0.26,
    fontFace: FONT, fontSize: 9, color: C.muted, italic: true, margin: 0,
  });
}

// ─── Slide 10: 기대 효과 ──────────────────────────────────────
function slide10(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "기대 효과", pres);
  estimateBadge(s, W - 1.6, 0.3);

  const cards = [
    { num: "01", title: "사용자 경험 개선",  body: "신규 프로젝트 디자인 적용으로\n일관된 UI/UX 제공",       color: C.blue },
    { num: "02", title: "운영 효율화",       body: "화면 단순화 및 구조 개선으로\n오류 가능성 감소",          color: C.orange },
    { num: "03", title: "유지보수성 향상",   body: "현행 기술 스택 기준으로\n전환하여 관리 용이",             color: C.greenAccent },
    { num: "04", title: "저위험 전환",       body: "기존 비즈니스 로직 유지 하에\n안전하게 화면 전환 가능",  color: C.amber },
  ];

  const cW = (W - M * 2 - 0.35) / 2;
  const cH = (H - 1.5) / 2 - 0.12;
  cards.forEach((card, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * (cW + 0.35);
    const y = 1.05 + row * (cH + 0.15);

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cW, h: cH,
      fill: { color: C.bgCard },
      border: { pt: 1, color: card.color },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cW, h: 0.06,
      fill: { color: card.color },
    });
    s.addText(card.num, {
      x: x + 0.12, y: y + 0.1, w: 0.55, h: 0.4,
      fontFace: FONT, fontSize: 18, color: card.color,
      bold: true, valign: "middle", margin: 0,
    });
    s.addText(card.title, {
      x: x + 0.72, y: y + 0.08, w: cW - 0.88, h: 0.42,
      fontFace: FONT, fontSize: 12, color: C.mainTxt,
      bold: true, valign: "middle", margin: 0,
    });
    s.addText(card.body, {
      x: x + 0.12, y: y + 0.52, w: cW - 0.24, h: cH - 0.6,
      fontFace: FONT, fontSize: 10, color: C.muted,
      valign: "top",
    });
  });

  s.addText("[ESTIMATE] 추진 배경 역추론. 정량 효과는 전환 후 별도 측정 필요.", {
    x: M, y: H - 0.35, w: W - M * 2, h: 0.26,
    fontFace: FONT, fontSize: 9, color: C.muted, italic: true, margin: 0,
  });
}

// ─── Slide 11: 리스크 / 대응 방안 ────────────────────────────
function slide11(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "리스크 / 대응 방안", pres);

  const oqItems    = sections.oq    ? parseOQTable(sections.oq.body)   : [];
  const riskRaw    = sections.risks ? bullets(sections.risks.body)      : [];

  // Build unified row list
  const statusColor = { "해소": C.greenAccent, "확인 필요": C.amber, "주의": C.red, "모니터링": C.blue };

  const oqRows = oqItems.slice(0, 5).map(oq => ({
    label:      oq.isResolved ? `✓ ${oq.question.slice(0, 38)}` : oq.question.slice(0, 40),
    ref:        fmtOQ(oq.num),
    status:     oq.isResolved ? "해소" : "확인 필요",
    action:     oq.isResolved ? (oq.fallback.slice(0, 55) || "확정됨") : oq.path.slice(0, 55),
    resolved:   oq.isResolved,
  }));

  // Risk bullets: skip resolved (~~) and skip duplicates already in OQ table
  const riskRows = riskRaw
    .filter(r => !r.trim().startsWith("~~"))
    .filter(r => {
      const clean = stripMd(r);
      // Skip if this risk is about an OQ# already shown (e.g. "OQ#4" in text)
      const oqRef = clean.match(/OQ#?(\d+)/);
      if (oqRef) {
        const oqNum = oqRef[1];
        return !oqItems.some(oq => oq.num === oqNum && !oq.isResolved);
      }
      return true;
    })
    .slice(0, 3)
    .map(r => {
      const clean = stripMd(r);
      const resolved = r.includes("해소됨");
      return {
        label:    (clean.split(":")[0] || clean).slice(0, 42),
        ref:      "-",
        status:   resolved ? "해소" : (clean.includes("누락") || clean.includes("반드시") ? "주의" : "모니터링"),
        action:   clean.includes("→") ? clean.split("→").pop().trim().slice(0, 55) : clean.slice(0, 55),
        resolved,
      };
    });

  const allRows = [...oqRows, ...riskRows];

  s.addTable(
    [
      [th("리스크 / 항목"), th("OQ","center"), th("상태","center"), th("대응 방안 / 결과")],
      ...allRows.map((r, i) => [
        td(r.label,  i, { color: r.resolved ? C.muted : C.mainTxt, bold: !r.resolved }),
        td(r.ref,    i, { align: "center", color: C.muted }),
        td(r.status, i, { align: "center", bold: true, color: statusColor[r.status] || C.mainTxt }),
        td(r.action, i, { color: r.resolved ? C.muted : C.mainTxt }),
      ]),
    ],
    {
      x: M, y: 1.02, w: W - M * 2, colW: [2.95, 0.75, 1.0, 4.1],
      border: { pt: 0.5, color: C.border },
      rowH: [0.26, ...Array(allRows.length).fill(0.35)],
      autoPage: false,
    }
  );

  // Readiness summary box — only "확인 필요" counts as truly blocking
  const blocking  = allRows.filter(r => r.status === "확인 필요").length;
  const rdText  = blocking === 0
    ? "전체 착수 가능 — 블로킹 OQ 없음"
    : `대부분 착수 가능 — fallback 허용 (확인 필요 ${blocking}건)`;
  const rdColor = blocking === 0 ? C.greenAccent : C.orange;
  const unresolved = blocking; // alias for bgGreen logic below
  const rdBg    = unresolved === 0 ? C.bgGreen : "FFF2CC";

  const tableH = 0.26 + allRows.length * 0.35;
  const boxY   = Math.min(1.02 + tableH + 0.12, H - 0.64);
  s.addShape(pres.shapes.RECTANGLE, {
    x: M, y: boxY, w: W - M * 2, h: 0.48,
    fill: { color: rdBg },
    border: { pt: 1, color: rdColor },
  });
  s.addText(`착수 판단: ${rdText}`, {
    x: M + 0.2, y: boxY, w: W - M * 2 - 0.4, h: 0.48,
    fontFace: FONT, fontSize: 11, color: rdColor,
    bold: true, valign: "middle",
  });
}

// ─── Slide 12: 착수 판단 / 협의사항 ──────────────────────────
function slide12(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "착수 판단 / 관련 부서 협의사항", pres);

  const oqItems       = sections.oq       ? parseOQTable(sections.oq.body)              : [];
  const readinessBullets = sections.readiness ? bullets(sections.readiness.body)         : [];
  const resolved      = oqItems.filter(oq => oq.isResolved);
  const active        = oqItems.filter(oq => !oq.isResolved);

  const cW   = (W - M * 2 - 0.3) / 2;
  const midX = M + cW + 0.3;

  // Left column: PM 협의 완료
  s.addShape(pres.shapes.RECTANGLE, {
    x: M, y: 0.98, w: cW, h: 0.32,
    fill: { color: C.greenAccent },
  });
  s.addText(`PM 협의 완료 (${resolved.length}건)`, {
    x: M + 0.1, y: 0.98, w: cW - 0.2, h: 0.32,
    fontFace: FONT, fontSize: 11, color: C.white,
    bold: true, valign: "middle", margin: 0,
  });
  resolved.slice(0, 4).forEach((oq, i) => {
    const y = 1.36 + i * 0.98;
    s.addShape(pres.shapes.RECTANGLE, {
      x: M, y, w: cW, h: 0.84,
      fill: { color: C.bgCard },
      border: { pt: 0.5, color: C.greenAccent },
    });
    s.addText(`${fmtOQ(oq.num)} ✓`, {
      x: M + 0.12, y: y + 0.06, w: cW - 0.24, h: 0.26,
      fontFace: FONT, fontSize: 10, color: C.greenAccent, bold: true, margin: 0,
    });
    s.addText(oq.question.slice(0, 65), {
      x: M + 0.12, y: y + 0.33, w: cW - 0.24, h: 0.3,
      fontFace: FONT, fontSize: 9, color: C.mainTxt, margin: 0,
    });
    const fb = oq.fallback || "확정됨";
    const fbText = fb.startsWith("확정") ? fb.slice(0, 55) : `확정: ${fb.slice(0, 45)}`;
    s.addText(fbText, {
      x: M + 0.12, y: y + 0.62, w: cW - 0.24, h: 0.2,
      fontFace: FONT, fontSize: 8, color: C.muted, italic: true, margin: 0,
    });
  });

  // Right column: 개발자 확인 중 or 착수 가능
  const rhColor = active.length > 0 ? C.orange : C.blue;
  const rhLabel = active.length > 0 ? `개발자 확인 중 (${active.length}건)` : "착수 가능 항목";
  s.addShape(pres.shapes.RECTANGLE, {
    x: midX, y: 0.98, w: cW, h: 0.32,
    fill: { color: rhColor },
  });
  s.addText(rhLabel, {
    x: midX + 0.1, y: 0.98, w: cW - 0.2, h: 0.32,
    fontFace: FONT, fontSize: 11, color: C.white,
    bold: true, valign: "middle", margin: 0,
  });
  active.slice(0, 2).forEach((oq, i) => {
    const y = 1.36 + i * 0.98;
    s.addShape(pres.shapes.RECTANGLE, {
      x: midX, y, w: cW, h: 0.84,
      fill: { color: C.bgCard },
      border: { pt: 1, color: C.orange },
    });
    s.addText(`${fmtOQ(oq.num)} — 확인 필요`, {
      x: midX + 0.12, y: y + 0.06, w: cW - 0.24, h: 0.26,
      fontFace: FONT, fontSize: 10, color: C.orange, bold: true, margin: 0,
    });
    s.addText(oq.question.slice(0, 65), {
      x: midX + 0.12, y: y + 0.33, w: cW - 0.24, h: 0.3,
      fontFace: FONT, fontSize: 9, color: C.mainTxt, margin: 0,
    });
    s.addText(oq.fallback ? `Fallback: ${oq.fallback.slice(0, 45)}` : oq.path.slice(0, 50), {
      x: midX + 0.12, y: y + 0.62, w: cW - 0.24, h: 0.2,
      fontFace: FONT, fontSize: 8, color: C.muted, italic: true, margin: 0,
    });
  });

  // Readiness summary box (right column, remaining space)
  const boxStartY = active.length > 0 ? 1.36 + active.length * 0.98 + 0.1 : 1.36;
  if (boxStartY < H - 0.5 && active.length < 3) {
    const canStart = readinessBullets.filter(b => b.includes("가능")).slice(0, 4);
    const boxH = H - boxStartY - 0.15;
    s.addShape(pres.shapes.RECTANGLE, {
      x: midX, y: boxStartY, w: cW, h: boxH,
      fill: { color: C.bgGreen },
      border: { pt: 1, color: C.greenAccent },
    });
    s.addText("핵심 기능 착수 가능", {
      x: midX + 0.15, y: boxStartY + 0.1, w: cW - 0.3, h: 0.34,
      fontFace: FONT, fontSize: 12, color: C.greenAccent, bold: true, margin: 0,
    });
    const canText = canStart.length > 0
      ? canStart.map(b => `• ${b.slice(0, 55)}`).join("\n")
      : "OQ 해소 완료 — 전체 구현 착수 가능";
    s.addText(canText, {
      x: midX + 0.15, y: boxStartY + 0.5, w: cW - 0.3, h: boxH - 0.65,
      fontFace: FONT, fontSize: 9, color: C.mainTxt,
    });
  }
}

// ─── Slide 13: 기준 문서 / 부록 ──────────────────────────────
function slide13(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "기준 문서 / 부록", pres);

  if (!sections.references) {
    s.addText("기준 문서 섹션(4번) 없음", {
      x: M, y: 2.0, w: 8.0, h: 1.0,
      fontFace: FONT, fontSize: 14, color: C.muted,
      align: "center", valign: "middle",
    });
    return;
  }

  const refBullets = bullets(sections.references.body);
  const rows = refBullets.slice(0, 12).map(b => {
    const match = b.match(/^`([^`]+)`: (.+)$/) || b.match(/^([^:—]+)[:—] (.+)$/);
    if (match) return [match[1].trim(), match[2].trim()];
    return ["-", b.trim()];
  });

  if (rows.length > 0) {
    s.addTable(
      [
        [th("문서 유형", "center"), th("설명 / 위치")],
        ...rows.map((r, i) => [
          td(r[0], i, { align: "center", bold: true, color: C.blue }),
          td(r[1], i),
        ]),
      ],
      {
        x: M, y: 1.05, w: W - M * 2, colW: [1.9, W - M * 2 - 2.0],
        border: { pt: 0.5, color: C.border },
        rowH: [0.26, ...Array(rows.length).fill(0.32)],
        autoPage: false,
      }
    );
  }

  s.addText("※ Figma 미확정 — TO-BE 화면 이미지를 슬라이드 4에 첨부하여 대체합니다.", {
    x: M, y: H - 0.35, w: W - M * 2, h: 0.26,
    fontFace: FONT, fontSize: 9, color: C.muted, italic: true, margin: 0,
  });
}

// ─── Slide 14: 변경사항 요약 ──────────────────────────────────
function slideChangeSummary(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "변경사항 요약 (AS-IS → TO-BE)", pres);

  // scope 섹션에서 bullet 추출
  const scopeItems = sections.scope ? bullets(sections.scope.body) : [];

  // 변경 유형 분류 (키워드 기반)
  const changes = [];
  for (const item of scopeItems) {
    let category = "전환";
    let highlight = C.blue;
    if (/제거|삭제|제외|안 함|미노출|미제공/.test(item)) {
      category = "삭제/제거";
      highlight = C.red;
    } else if (/개선|변경|치환|추가|활성화|안내 문구|https/.test(item)) {
      category = "개선";
      highlight = C.greenAccent;
    }
    changes.push({ category, item: stripMd(item), highlight });
  }

  // 테이블 구성
  const tableRows = [
    [th("구분", "center"), th("변경 항목"), th("비고")],
  ];

  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const catBadge = {
      text: c.category,
      options: {
        fill: { color: i % 2 === 0 ? C.bgRowA : C.bgRowB },
        fontSize: 9, fontFace: FONT, color: c.highlight,
        bold: true, align: "center", valign: "middle",
      },
    };
    const note = c.category === "개선" ? "신규/변경"
               : c.category === "삭제/제거" ? "AS-IS 대비 제거" : "기존 기능 이관";
    tableRows.push([catBadge, td(c.item, i), td(note, i)]);
  }

  s.addTable(tableRows, {
    x: M, y: 1.05, w: W - M * 2, colW: [1.2, 6.2, 1.7],
    border: { pt: 0.75, color: C.border },
    rowH: 0.36,
    autoPage: false,
  });

  // 범례
  const legendY = H - 0.45;
  [
    { label: "전환", color: C.blue, x: M },
    { label: "개선", color: C.greenAccent, x: M + 1.6 },
    { label: "삭제/제거", color: C.red, x: M + 3.2 },
  ].forEach(({ label, color, x }) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: legendY, w: 0.2, h: 0.2,
      fill: { color },
    });
    s.addText(label, {
      x: x + 0.26, y: legendY - 0.02, w: 1.2, h: 0.24,
      fontFace: FONT, fontSize: 9, color: C.mainTxt,
      valign: "middle", margin: 0,
    });
  });
}

// ─── Slide 15: QA 테스트 케이스 ───────────────────────────────
function slideQATestCases(pres, sections) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "QA 테스트 케이스 (검증 항목)", pres);

  // 완료 기준(7번)에서 테스트 케이스 생성
  const acItems = sections.acceptance ? bullets(sections.acceptance.body) : [];

  // 업무 규칙(5번)에서 추가 규칙 기반 케이스 추출
  const ruleItems = [];
  if (sections.rules) {
    const subs = parseSubSections(sections.rules.body);
    for (const [title, body] of Object.entries(subs)) {
      const table = parseMarkdownTable(body);
      if (table && table.rows.length > 0) {
        ruleItems.push(`${stripMd(title)}: ${table.rows.length}개 옵션 정상 동작 확인`);
      }
    }
  }

  const allCases = [];

  // AC → 테스트 케이스 변환
  acItems.forEach((item) => {
    const cleaned = stripMd(item);
    let type = "기능";
    if (/보이지 않|표시|문구|노출|미노출/.test(cleaned)) type = "UI";
    if (/활성화|비활성화|버튼/.test(cleaned)) type = "UI/로직";
    if (/https|치환|URL|포함되지 않/.test(cleaned)) type = "로직";
    if (/테스트/.test(cleaned)) type = "테스트";
    allCases.push({ scenario: cleaned, type });
  });

  // 규칙 기반 케이스 추가
  ruleItems.forEach(item => {
    allCases.push({ scenario: item, type: "규칙" });
  });

  // 테이블 구성
  const tableRows = [
    [th("#", "center"), th("테스트 시나리오"), th("기대 결과"), th("구분", "center")],
  ];

  allCases.forEach((tc, i) => {
    const typeColor = tc.type === "UI" ? C.blue
                    : tc.type === "로직" ? C.orange
                    : tc.type === "규칙" ? C.amber
                    : tc.type === "테스트" ? C.greenAccent
                    : C.mainTxt;
    tableRows.push([
      td(String(i + 1), i, { align: "center" }),
      td(tc.scenario, i),
      td("Pass", i, { color: C.greenAccent, bold: true, align: "center" }),
      {
        text: tc.type,
        options: {
          fill: { color: i % 2 === 0 ? C.bgRowA : C.bgRowB },
          fontSize: 9, fontFace: FONT, color: typeColor,
          bold: true, align: "center", valign: "middle",
        },
      },
    ]);
  });

  // 행이 많으면 폰트 축소
  const rowH = allCases.length > 12 ? 0.28 : 0.34;

  s.addTable(tableRows, {
    x: M, y: 1.05, w: W - M * 2, colW: [0.45, 5.9, 0.8, 0.95],
    border: { pt: 0.75, color: C.border },
    rowH,
    autoPage: false,
  });

  s.addText(`총 ${allCases.length}건 — plan.md 완료 기준(7번) + 업무 규칙(5번) 기반 자동 생성`, {
    x: M, y: H - 0.35, w: W - M * 2, h: 0.26,
    fontFace: FONT, fontSize: 9, color: C.muted, italic: true, margin: 0,
  });
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("Parsing plan.md...");
  const { fm, sections, docNature } = parsePlanMd(PLAN_FILE);
  console.log("  FM keys  :", Object.keys(fm).join(", "));
  console.log("  Sections :", Object.keys(sections).filter(k => isNaN(k)).join(", "));

  let ctxInput = null;
  if (fs.existsSync(CTX_FILE)) {
    try { ctxInput = JSON.parse(fs.readFileSync(CTX_FILE, "utf-8")); } catch {}
  }

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = fm.owner || "작성자";
  pres.title  = fm.case_name || "Specification";

  console.log("\nGenerating 15 slides (Korean Corporate Light v5)...");
  console.log("  [ 1/15] 표지");               slide1(pres, fm);
  console.log("  [ 2/15] 프로젝트 개요");       slide2(pres, docNature, sections, ctxInput);
  console.log("  [ 3/15] 추진 배경");            slide3(pres, sections);
  console.log("  [ 4/15] AS-IS + TO-BE");       slide4(pres, sections);
  console.log("  [ 5/15] 변경사항 요약");        slideChangeSummary(pres, sections);
  console.log("  [ 6/15] 범위 / 제외 항목");    slide5(pres, sections);
  console.log("  [ 7/15] 업무 규칙");            slide6(pres, sections);
  console.log("  [ 8/15] 제약 조건");            slide7(pres, sections);
  console.log("  [ 9/15] 완료 기준");            slide8(pres, sections);
  console.log("  [10/15] QA 테스트 케이스");     slideQATestCases(pres, sections);
  console.log("  [11/15] 일정 계획");            slide9(pres, sections);
  console.log("  [12/15] 기대 효과");            slide10(pres, sections);
  console.log("  [13/15] 리스크 / 대응");        slide11(pres, sections);
  console.log("  [14/15] 착수 판단 / 협의");     slide12(pres, sections);
  console.log("  [15/15] 기준 문서");            slide13(pres, sections);

  console.log(`\nWriting ${OUTPUT_FILE}...`);
  await pres.writeFile({ fileName: OUTPUT_FILE });
  console.log("Done! (Korean Corporate Light v5, 15 slides)");
}

main().catch(err => { console.error(err); process.exit(1); });
