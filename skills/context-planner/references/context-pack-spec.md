# Context Pack Spec v0.1
## 목적
- 이 문서는 `wiki / slack / asset`에 흩어진 컨텍스트를 `실행 가능한 Context Pack`으로 컴파일하기 위한 표준 입력/출력 규격입니다.
- 목표는 문서를 많이 쓰는 것이 아니라, 실제 구현과 운영 판단에 필요한 정보를 빠짐없이 구조화하는 것입니다.

## 운영 단위
- 한 개의 업무 과제 또는 파일럿 단위를 `case`로 봅니다.
- 각 `case`는 하나의 폴더를 가집니다.
- 각 `case` 폴더에는 최종 기준 문서 이름으로 반드시 `plan.md`가 존재해야 합니다.

## 최소 입력 규격
### Required Fields
- `case_name`
	- 케이스 이름
- `source_urls`
	- `wiki`, `slack`, `figma`, `drive` 등 원문 위치
- `intent`
	- 왜 이 작업을 하는지
- `scope`
	- 이번에 다룰 범위
- `out_of_scope`
	- 이번에 다루지 않을 범위
- `owner`
	- 담당자 이름
- `constraints`
	- 디자인, 권한, 보안, 외부 연동, 레거시 제약

### Recommended Fields
- `acceptance_criteria`
- `assets`
	- 화면 캡처, 레거시 링크, API 문서, 다이어그램
- `owners`
- `priority`
- `deadline`
- `related_issues`
- `design_reference`
- `api_reference`
- `permission_reference`

## 입력 소스 우선순위
### Source Priority
1. `wiki / PRD`
2. `slack discussion`
3. `legacy screen / asset / code reference`
4. `human clarification`

### Conflict Rule
- 소스 간 충돌이 있으면 임의로 합치지 않습니다.
- 최신 문서가 항상 우선이라는 가정도 하지 않습니다.
- 충돌은 `Open Questions` 또는 `Conflicts` 섹션으로 분리합니다.

## 표준 산출물
### Required Outputs
- `plan.md`
	- 최종 기준 문서
- `risk_guardrails.md`
	- 리스크와 구현 금지선

### Optional Outputs
- `spec.pptx`
	- 한국 기업형 기획서 (Phase F)
- `retro.md`
	- 케이스 회고
- `implementation_notes.md`

## plan.md 필수 섹션
- `Problem & Intent`
- `In-Scope`
- `Out-of-scope`
- `UX / Taste / UI Guardrail`
- `Domain Rules`
- `Acceptance Criteria`
- `Test Scenario`
- `Open Questions`
- `Risk & Guardrail`
- `Source of Truth`

## 성숙도 단계
### Level 0. Raw Context
- URL과 자료만 모인 상태

### Level 1. Requirement-only Pack
- 확정 사실과 미확정 질문이 분리된 상태
- 구현 시작 금지

### Level 2. Rule Freeze
- 권한, 연동, 디자인 재사용 범위가 정리된 상태
- 저위험 구현 가능

### Level 3. Execution Ready
- 개발 에이전트 또는 실제 개발자가 바로 구현 가능한 상태
- Acceptance Criteria와 Guardrail이 충분히 고정됨

## 구현 착수 조건
- `Open Questions` 중 구현에 직접 영향을 주는 항목이 남아 있지 않을 것
- `Permission`, `External Integration`, `Design Constraint`가 문서화되어 있을 것
- `Acceptance Criteria`가 테스트 가능한 문장으로 작성되어 있을 것
- `Out-of-scope`가 명시되어 있을 것

## 변경 관리
### Versioning
- 스펙 버전은 `v0.x -> v1.x` 방식으로 관리합니다.
- `v0.x`
	- 파일럿 중
- `v1.x`
	- 팀 내 운영 규칙으로 고정

### Change Rule
- 규칙 변경 시 무엇이 바뀌었는지와 이유를 남깁니다.
- `plan.md` 템플릿 변경은 반드시 실제 회고 근거를 가져야 합니다.
- 새 필수 입력값을 추가할 때는 왜 필요한지 예시와 함께 기록합니다.

## 금지 규칙
- 문서에 없는 사실을 추측해 `API`, `DB`, `Permission`을 확정하지 않습니다.
- `Open Questions`를 숨긴 채 구현 가능한 것처럼 포장하지 않습니다.
- 디자인 재사용 범위를 고정하지 않은 채 프론트 개발을 시작하지 않습니다.
- 외부 시스템 계약이 없는 상태에서 연동 완료로 간주하지 않습니다.

## 성공 기준
- URL과 최소 메타데이터만으로 `plan.md`를 반복 생성할 수 있을 것
- 다른 사람이 같은 입력을 받아도 비슷한 구조의 산출물을 만들 수 있을 것
- plan.md → spec.pptx 파이프라인이 기획서 없는 케이스에도 작동할 것
- 시간이 지나며 템플릿과 규칙이 더 명확해질 것
