# context-planner

> Turn scattered wikis, specs, and meeting notes into an executable `plan.md` in 5 minutes.

`context-planner` is a Claude Code skill for PMs and engineers. You paste a Confluence URL (or dump any raw text), and it compiles a structured, decision-ready `plan.md` — covering background, scope, domain rules, acceptance criteria, open questions, and a readiness check. Optionally, it generates a 15-slide `spec.pptx` from the same source.

Works on **Claude Code**, **Codex CLI**, **Claude.ai**, and **ChatGPT** (see [Input Methods](#input-methods)).

---

## Install

### Via Claude Code plugin marketplace (recommended)

```bash
claude plugin marketplace add goddaehee/context-planner-skill
claude plugin install context-planner
```

### Manual (git clone)

```bash
git clone https://github.com/goddaehee/context-planner-skill.git /tmp/context-planner-skill
cp -r /tmp/context-planner-skill/skills/context-planner ~/.claude/skills/
```

Then restart Claude Code. Run `/context-planner` to verify.

---

## Prerequisites

| Requirement | Required? | Purpose |
|---|---|---|
| [Claude Code](https://claude.ai/download) | Yes | Slash command support |
| [Codex CLI](https://github.com/openai/codex) | Alternative to Claude Code | Reads SKILL.md directly |
| [Confluence MCP](docs/onboarding.html) | Optional | Wiki auto-read via `[A]` input path |
| Node.js 22+ | Optional | Generate `spec.pptx` via `scripts/generate-spec.js` |

For Confluence MCP setup (5-step walkthrough for Mac and Windows), open **`docs/onboarding.html`** in your browser.

---

## How to Use

### 1. Slash command (Claude Code)

```
/context-planner
```

The skill greets you and asks which input method to use.

### 2. Natural language trigger

```
위키 링크 정리해서 plan.md로 만들어줘
turn this confluence page into a plan
요구사항 정리해서 기획서 초안 만들어줘
```

### 3. Codex CLI (no slash command support)

Codex doesn't support `/` slash commands. Instead:

```
skills/context-planner/SKILL.md 를 읽고, context-planner 스킬을 실행해줘.
```

Or paste the contents of `prompts/context-planner-prompt.md` directly into any LLM chat (ChatGPT, Claude.ai, etc.).

---

## Workflow Overview

| Phase | What happens | User action needed? |
|---|---|---|
| **Phase 0** | Choose input method ([A] URL / [B] paste / [C] describe) | Pick one |
| **Phase A** | Extract 7 core fields from raw context | Review & confirm |
| **Phase A+** | 3-question fill-gap interview (auto-triggered when wiki is sparse) | Answer questions |
| **Phase QG** | Context Quality Gate — 4-point check before drafting | Confirm or provide more info |
| **Phase B** | Draft `plan.md` (L1 Lite → L2 Full depending on confidence) | Review |
| **Phase B+** | Surface open questions; upgrade L1 → L2 when answered | Answer optional |
| **Phase F** | Generate 15-slide `spec.pptx` from plan.md | Y / N |

---

## Input Methods

**[A] Wiki URL** — paste a Confluence or Notion URL. If the Confluence MCP is configured, the skill auto-fetches the page and up to 3 child pages. If not, you get a paste-the-text fallback with MCP setup instructions.

**[B] Paste text** — drop raw requirements, meeting notes, or PRD drafts directly into the chat. Works on every LLM surface.

**[C] Describe** — type a short description. The skill interviews you with targeted questions to fill the 7 core fields.

---

## Output

### `plan.md`

A 13-section structured planning document:

1. Problem & Intent
2. In-Scope
3. Out-of-Scope
4. Source of Truth
5. UX / UI Guardrail
6. Domain Rules
7. Integration
8. Permission / Security
9. Acceptance Criteria
10. Test Scenarios
11. Open Questions
12. Risk & Guardrail
13. Readiness Decision

Starts at **L1 Lite** (key sections only). Upgrades to **L2 Full** as open questions are resolved.

### `spec.pptx` (optional)

15-slide corporate-style presentation generated from `plan.md` frontmatter and section content. Run with:

```bash
npm install
node scripts/generate-spec.js cases/your-case-name
```

Or answer **Y** when the skill asks "기획서도 만들어줄까?" at the end of Phase B.

---

## Example

See `examples/plan-example.md` for a complete L2 plan built from a fictional "blog comment moderation" feature, and `examples/context-input-filled.json` for the Phase A context object that drove it.

---

## Verify Installation

```
/context-planner
```

**Expected**: the skill greets you and presents the Phase 0 input-method choice ([A] / [B] / [C]).

If the slash command isn't recognized, confirm that `~/.claude/skills/context-planner/SKILL.md` exists with YAML frontmatter at the top.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `/context-planner` not recognized | Confirm `~/.claude/skills/context-planner/SKILL.md` exists. Run `claude plugin install context-planner` again. |
| Confluence MCP returns empty content | Re-check `CONFLUENCE_URL` and `CONFLUENCE_PERSONAL_TOKEN` env vars. See `docs/onboarding.html` STEP 2. |
| `generate-spec.js` fails — `Cannot find module 'pptxgenjs'` | Run `npm install` in the repo root. |
| Skill doesn't auto-trigger on natural language | Add the `CLAUDE.md` policy block to your project root (`cp CLAUDE.md your-project/CLAUDE.md`). |
| Codex doesn't follow the skill | Paste `prompts/context-planner-prompt.md` or `SKILL.md` content directly into the prompt. |

---

## Onboarding Guide

Open **`docs/onboarding.html`** in any browser for a visual 7-section walkthrough:

- Tool selection (Claude Code / Codex / Browser-based)
- 3-step setup (open folder → optional MCP → run skill)
- Input method selection flowchart
- Phase flow diagram (Phase 0 → F)
- Output preview (plan.md structure + spec.pptx)
- Mac and Windows instructions

---

## Repo Structure

```
context-planner-skill/
├── .claude-plugin/
│   ├── marketplace.json       # Claude Code plugin marketplace entry
│   └── plugin.json            # Skill pointer: skills/context-planner
├── docs/
│   └── onboarding.html        # Visual setup guide (offline, no CDN)
├── examples/
│   ├── context-input.json     # Empty Phase A template
│   ├── context-input-filled.json  # Filled example (fictional domain)
│   └── plan-example.md        # Complete L2 plan (fictional domain)
├── prompts/
│   └── context-planner-prompt.md  # Standalone prompt for Claude.ai / ChatGPT
├── scripts/
│   └── generate-spec.js       # PPTX generator (Node.js, pptxgenjs)
├── skills/
│   └── context-planner/
│       ├── SKILL.md           # Main skill file (Phase 0–F workflow)
│       └── references/        # Templates and playbooks
├── templates/
│   ├── plan-template.md       # L1 Lite blank template
│   └── plan-template-full.md  # L2 Full blank template
├── CHANGELOG.md
├── CLAUDE.md                  # Plugin-level auto-activation instructions
├── LICENSE                    # MIT
├── package.json               # Node deps for generate-spec.js
└── README.md
```

---

## Requirements

- macOS / Linux / Windows (both platforms covered in `docs/onboarding.html`)
- Claude Code CLI or Codex CLI
- Node.js 22+ *(optional — only for `spec.pptx` generation)*
- Confluence Personal Access Token *(optional — only for `[A]` wiki auto-read path)*

---

## 한국어 안내

### 설치

```bash
claude plugin marketplace add goddaehee/context-planner-skill
claude plugin install context-planner
```

또는 수동 설치:

```bash
git clone https://github.com/goddaehee/context-planner-skill.git /tmp/context-planner-skill
cp -r /tmp/context-planner-skill/skills/context-planner ~/.claude/skills/
```

### 사용법

1. 프로젝트 폴더에서 `claude`를 실행한다.
2. `/context-planner` 를 입력한다 (또는 자연어로 "plan.md 만들어줘").
3. 입력 방식 3가지 중 하나 선택:
   - **[A]** 위키 URL 붙여넣기 — Confluence MCP가 설정되어 있으면 자동 읽기
   - **[B]** 기획서·회의록·요구사항 원문 직접 붙여넣기
   - **[C]** 텍스트로 간단히 설명 — AI가 인터뷰로 채워나감
4. 스킬이 Phase A → A+ → QG → B 순으로 `plan.md`를 작성한다.
5. 완료 후 "기획서도 만들어줄까?" 질문에 **Y** 하면 15슬라이드 `spec.pptx` 생성.

### Codex CLI 사용 시

Codex는 슬래시 명령어를 지원하지 않는다. 대신:

```
skills/context-planner/SKILL.md 를 읽고, context-planner 스킬을 실행해줘.
```

### 왜 이 스킬인가?

- PM 1명이 수일에 걸쳐 작성하던 기획서를 **5분 컨텍스트 컴파일**로 단축
- wiki·회의록·기획서 초안이 흩어져 있을 때 한 번에 정리
- Codex / Claude Code / ChatGPT / Claude.ai 모두에서 동일하게 동작
- MCP 없어도 [B]/[C] 경로로 바로 시작 가능

### 상세 온보딩 (Mac + Windows)

`docs/onboarding.html` 을 브라우저에서 열면 설치부터 첫 `plan.md` 생성까지 7섹션 비주얼 가이드가 있다.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).

## Credits

Built on [Claude Code](https://claude.ai/code) skills and the [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) MCP server.  
Plugin structure modeled after [cmux-claude-skill](https://github.com/goddaehee/cmux-claude-skill).
