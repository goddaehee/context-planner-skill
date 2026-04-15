# context-planner — Plugin Instructions

## Auto-activation triggers

When the user says any of the following, **immediately run the context-planner skill**:

- "plan.md 만들어줘" / "plan.md 생성" / "plan compile" / "make a plan"
- "기획서 정리해줘" / "위키 정리해서 플랜으로" / "spec 만들어줘"
- Provides a Wiki / Confluence URL + mentions plan, spec, or 기획서
- "요구사항 정리" / "requirements to plan" / "context-planner 실행"
- "turn this into a plan" / "summarize requirements"

## How to run

1. Read `skills/context-planner/SKILL.md`
2. Follow Phase 0 → A → (A+) → QG → B workflow in order
3. Open with: "안녕하세요! context-planner입니다. 흩어진 문서를 plan.md로 정리해드릴게요."

## Key rules

- Never guess missing information — use Open Questions
- Do not include tech stack (frameworks, languages) in plan.md
- Always confirm the 7 core fields with the user before drafting plan.md
