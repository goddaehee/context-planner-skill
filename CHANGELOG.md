# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-04-15

### Added
- Initial public release of context-planner skill
- Phase 0 → A → A+ → QG → B → F workflow (plan.md + optional spec.pptx)
- Three input paths: [A] wiki URL (Confluence MCP), [B] paste text, [C] describe
- L1 Lite and L2 Full plan templates
- `scripts/generate-spec.js` — 15-slide PPTX generator from plan.md
- `docs/onboarding.html` — visual 7-section setup guide (Mac + Windows)
- `prompts/context-planner-prompt.md` — standalone prompt for Claude.ai / ChatGPT
- Claude Code plugin manifest (`.claude-plugin/`)
- Bilingual README (English primary + 한국어 안내)
