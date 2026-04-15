---
name: context-planner
description: Wiki URL·문서·텍스트 요구사항을 인터뷰로 수집하여 plan.md 컨텍스트 패키지를 생성하고, 선택적으로 기획서(PPTX)까지 만든다
allowed-tools:
  - "mcp__mcp-atlassian__confluence_get_page"
  - "mcp__mcp-atlassian__confluence_get_page_children"
  - "Read"
  - "Write"
  - "Bash"
  - "WebFetch"
---

# context-planner

기획 스킬. Wiki·화면 캡처·요구사항 텍스트에 흩어진 컨텍스트를 `plan.md`로 컴파일하고, 선택적으로 한국 기업형 기획서(PPTX)까지 생성한다.

**전통적 기획서(PRD) 대신 에이전트를 위한 컨텍스트 패키지(plan.md)를 만드는 것이 목표.**

## 철학 (왜 이 방식인가)

> "기획서를 창작하지 마세요. 컨텍스트를 결합하세요."

- **문제**: 완벽한 장표(PPT)를 만드는 데 3일을 써도, 코드는 0줄. 개발자가 실제 코딩에 쓰는 시간은 하루 4시간 미만 — 나머지는 문서 관리와 부서 간 핑퐁.
- **해결**: Wiki·데이터·QA 시트 등 이미 존재하는 파편화된 문서를 하나의 맥락(plan.md)으로 모으면, 새로운 기획서를 발명할 필요가 없다.
- **루프**: `Context(기존 문서 수집)` → `plan.md(맥락 구조화)` → `Prototype(즉시 검증)` — 완벽한 기획서는 없고, 완벽한 흐름만 있을 뿐.
- **역할 변화**: 기획자는 '티켓 관리자'에서 '컨텍스트 디렉터'로 — 어떤 맥락이 중요한지 결정하는 가치 판단이 핵심이다.

## 트리거 키워드
- "plan.md 만들어줘", "컨텍스트 정리해줘", "기획서 대신 플랜 만들어"
- "plan compile", "context pack", "/plan-compile"
- "기획서 만들어줘", "PPT로 변환", "plan to spec", "spec-gen"

## Codex CLI 사용자 참고

Codex는 `/context-planner` 슬래시 명령을 지원하지 않습니다.
대신 아래 프롬프트를 그대로 입력하세요:

```
.claude/skills/context-planner/SKILL.md 를 읽고, context-planner 스킬을 실행해줘.
입력: [wiki URL 또는 요구사항 설명]
```

MCP 연결 시 wiki URL → [A] 경로 자동 진행, 미연결 시 내용 붙여넣기([B] 경로)로 전환합니다.

## 사전 참조 파일
- `references/plan-template-lite.md` — L1 요구사항 Lite 템플릿 (10섹션)
- `references/plan-template-full.md` — L2/L3 Full 템플릿 (14섹션)
- `references/context-pack-spec.md` — 성숙도 레벨 L0~L3 정의
- `references/prompt-pack.md` — 핵심 프롬프트
- `references/playbook.md` — 운영 플레이북, 품질 게이트

---

## 워크플로우

### Phase 0. Context Input Mode (컨텍스트 입력 방식 선택)

**목적**: 사용자가 가진 자료 형태에 맞는 수집 방식을 먼저 결정한다.

**시작 인사 (스킬 시작 시 항상 실행)**:
```
안녕하세요! 흩어진 요구사항을 plan.md로 정리해드리는 context-planner입니다 😊
Wiki URL, 기획 문서, 또는 말로 설명해주시면 바로 시작하겠습니다!
```

**자동 감지 규칙 (Phase 0 질문을 건너뜀)**:
- 사용자 메시지에 URL(`http://` 또는 `https://`)이 포함 → [A] 경로 즉시 진행
- 사용자가 긴 텍스트 / 문서 내용을 붙여넣은 경우 → [B] 경로 즉시 진행
- 아무 자료 없이 시작한 경우 → 아래 질문 제시

**입력 방식 선택 (자료가 없을 때만 질문)**:
```
어떤 방식으로 요구사항을 제공하시겠어요?

[A] Wiki URL 제공
     → 입력한 URL의 하위 페이지까지 자동 탐색하여 컨텍스트 수집
     → Confluence MCP 연결 시 자동 읽기 / 미연결 시 내용 직접 붙여넣기 안내

[B] 기획서 / 문서 붙여넣기
     → 기존 기획서, 요구사항 문서, 회의록 등을 대화창에 직접 복붙

[C] 텍스트로 설명
     → 요구사항을 직접 입력하거나 설명
     → AI가 인터뷰 질문으로 컨텍스트를 채워 나감
```

**[A] Wiki URL 선택 시**:
1. URL이 이미 주어졌으면 바로 2번으로, 없으면 wiki URL 입력 요청
2. Confluence MCP로 페이지 읽기 — **탐색 없이 바로 호출**
   > ⚠️ `list_mcp_resources` / `list_resources` 사전 탐색 금지. 도구를 바로 호출하면 된다.
   - 메인 페이지: `mcp__mcp-atlassian__confluence_get_page({"page_id": "{pageId}"})`
   - 하위 탐색: `mcp__mcp-atlassian__confluence_get_page_children({"page_id": "{pageId}"})`
   - **성공**: 하위 페이지까지 자동 탐색 (depth 2까지)
     → 추출된 모든 내용을 context 버퍼에 누적 → Phase A로 이동
   - **실패(내부망 / MCP 미연결 / DNS 오류)**: 아래 메시지를 **반드시 전체** 출력하고 [B] 경로로 전환:
     ```
     위키 자동 읽기를 시도했지만 접근이 안 됩니다.

     🔌 추천: MCP 한 번만 설정하면 앞으로 URL만 주면 자동으로 됩니다!
        【Confluence MCP 설정 방법】

        STEP 1. 개인용 액세스 토큰 발급 (Confluence 화면에서)
        1. Confluence 오른쪽 상단 본인 프로필 아이콘 클릭 → 프로필 페이지 이동
        2. 상단 탭 "환경설정" 클릭
        3. 왼쪽 사이드바 "개인용 액세스 토큰" 클릭
        4. 오른쪽 상단 "토큰 만들기" 버튼 클릭
           → 이름: mcp, 만료일: 1년 권장
        5. 생성된 토큰 즉시 복사 (창 닫으면 다시 볼 수 없음!)
        ※ Atlassian Cloud 사용자: https://id.atlassian.com/manage-profile/security/api-tokens

        STEP 2. 환경변수 설정 (~/.zshrc 또는 ~/.bashrc 에 추가 후 source 재실행)
           export CONFLUENCE_URL="https://wiki.yourcompany.com"
           export CONFLUENCE_PERSONAL_TOKEN="복사한-토큰"

        STEP 3. mcp-atlassian 설치 (터미널에서 한 번만)
           uv tool install "mcp-atlassian==0.21.0" --with "fastmcp==2.14.0" --force

        STEP 4. AI 도구별 설정 파일에 등록
           ┌─ Claude Code: ~/.claude/settings.json
           ├─ Gemini CLI:  ~/.gemini/settings.json   ← 동일 포맷!
           └─ Codex:       ~/.codex/config.toml     ← mcpServers 블록 동일!

           추가할 내용 (세 곳 모두 동일):
           "mcpServers": {
             "mcp-atlassian": {
               "command": "/Users/{username}/.local/bin/mcp-atlassian",
               "env": { "CONFLUENCE_URL": "...", "CONFLUENCE_PERSONAL_TOKEN": "..." }
             }
           }

        STEP 5. AI 도구 재시작 후 연결 확인
           · Claude Code: /mcp 명령으로 mcp-atlassian ✓ Connected 확인
           · Gemini CLI: /mcp 또는 재시작 후 동작 확인

     ✋ 지금 당장만 진행하려면 (임시):
        위키 본문을 브라우저에서 전체 선택(Ctrl+A) → 복사(Ctrl+C) → 여기에 붙여넣기
        (요구사항 페이지만으로도 시작 가능. 개발분석 페이지가 있으면 추가로 주세요.)
     ```
3. 이미지(AS-IS/TO-BE 화면): `cases/{case_name}/images/`에 수동 저장 안내
   > Confluence Server의 `/download/attachments/` 경로는 Bearer PAT 인증 미지원 — 브라우저에서 수동 다운로드 후 images/ 폴더에 배치
4. → Phase A로 이동 (대부분 필드 자동 채워짐, 미채워진 것만 질문)

**[B] 문서 붙여넣기 선택 시**:
1. 기획서/요구사항 문서 붙여넣기 요청 (여러 개면 순서대로)
2. AI가 문서에서 필드 자동 추출
3. → Phase A로 이동 (미채워진 필드만 질문)

**[C] 텍스트 설명 선택 시**:
1. → Phase A로 이동 (7개 필드를 순서대로 인터뷰)

---

### Phase A. Context Gather (컨텍스트 수집)

**목적**: 7개 필수 필드를 채워 `context-input.json` 생성.

Phase 0에서 수집된 내용을 기반으로 미채워진 필드만 추가 질문한다.

**필수 7개 필드**:
```
1. case_name       — 케이스 식별자 (영문 kebab-case, 예: cohort-management)
2. intent          — 왜 이 작업을 하는가? (비즈니스 의도)
3. scope           — 이번에 다룰 범위
4. out_of_scope    — 절대 건드리지 않을 범위
5. source_urls     — 원문 위치 (아래 계층 순서로 최대한 수집)
                      ① 요구사항 페이지 (AS-IS/TO-BE 화면, 기능 목록)
                      ② 의사결정사항 페이지: 트래픽 데이터, 옵션 확정, OQ 해소 근거
                      ③ 개발분석 페이지 (QA 케이스, URL 패턴, 기술 스펙)
                      ④ 상위 과제/프로젝트 페이지
                      ⑤ Figma, Slack 스레드 (있는 경우)
                   → 개발 분석 페이지가 있으면 반드시 포함. URL 패턴·옵션 목록이 거기 있을 수 있음
                   → 의사결정사항 페이지를 포함하면 OQ 해소율이 크게 높아짐
6. constraints     — 디자인·통합·권한·보안 제약
7. owner           — 담당자 이름
```

**권장 추가 필드** (입력할수록 plan.md 품질 향상):
```
resolved_questions  — 이미 확정된 질문과 답변 (key: value 형식)
                      → plan.md 5번(업무 규칙)으로 직접 변환됨
remaining_questions — 아직 미해소된 질문 목록
                      → plan.md 8번(확인 필요 사항)으로 변환됨
deferred_bugs       — 이번 scope에서 제외하는 기존 운영 버그 목록
                      → plan.md 3번(제외 항목)에 명시됨
ui_guidance         — TO-BE 화면 안내 문구, placeholder 텍스트 등
                      → plan.md 7번(완료 기준) AC와 6번(제약 조건)에 반영됨
known_issues        — 환경별 동작 차이, 알려진 기술 제약 등
                      → plan.md 9번(위험 요소)으로 변환됨
source_page_ids     — wiki pageId 목록 (source_urls와 쌍으로)
                      → plan.md YAML frontmatter의 source_wikis 필드로 변환됨
```

**자동 수집 옵션** (Confluence MCP 연결 시):
- `--from-confluence {page-id}`: `mcp__mcp-atlassian__confluence_get_page`로 위키 페이지 내용 추출
- 상위 페이지 입력 시: `mcp__mcp-atlassian__confluence_get_page_children`으로 하위 페이지 자동 탐색

**기존 케이스 감지 규칙** (case_name 결정 전 반드시 실행):
- `cases/` 폴더를 조회하여 `source_wikis` 또는 `source_urls`에 동일 pageId가 포함된 기존 케이스가 있는지 확인
- **있으면** → 해당 케이스 폴더를 재사용. 새 폴더 생성 금지. 기존 plan.md를 최신 wiki 내용으로 갱신. **갱신 완료 후 반드시 Phase F 자동 질의를 실행한다.**
- **없으면** → 새 case_name 생성 (wiki 제목 또는 기능명에서 영문 kebab-case 추출)

**출력**: `cases/{case_name}/context-input.json`

---

### Phase A+. Pre-compile Interview (사전 인터뷰)

**목적**: 7개 필드 수집 후, 과제 유형을 판단하여 plan.md 품질에 결정적인 추가 컨텍스트를 확보.
source_urls를 읽거나 intent를 분석하여 **과제 유형**을 먼저 판단한 후, 해당 유형에 맞는 질문만 선별하여 질문한다.

**과제 유형별 핵심 질문**:

| 유형 | 판단 키워드 | 반드시 확인할 것 |
|------|------------|-----------------|
| URL/링크 생성 | "URL 생성", "링크", "bridge", "deeplink" | ① 실제 URL 예시 또는 테스트 케이스 붙여넣기 요청, ② 파라미터 조합 규칙, ③ 빈 파라미터 처리 방식 |
| 조회/목록 화면 | "조회", "목록", "그리드", "검색" | ① 그리드 컬럼 목록, ② 검색 조건, ③ 페이징/정렬 규칙 |
| 등록/수정 폼 | "등록", "생성", "수정", "저장" | ① 필수/선택 필드 목록과 validation, ② 저장 API 계약, ③ 중복 방지 방법 |
| 외부 시스템 연동 | "연동", "외부", "새 탭" | ① 외부 시스템 URL/파라미터, ② 완료 후 처리 방식 |
| 권한/정책 변경 | "권한", "접근 제한", "등록자" | ① 현재 권한 구조, ② 변경 범위와 승인 주체 |

**공통 추가 질문** (항상 물어볼 것):
- "개발 분석 페이지(테스트 케이스, 기술 분석이 담긴 wiki)가 별도로 있나요? 있다면 URL을 주세요."
- "as-is 소스코드에 접근 가능한가요? (URL 생성 로직, 옵션 목록 등 역추출에 필요)"
- "이 화면에서 확실히 아는 것(확정)과 아직 모르는 것(미확정)을 구분해줄 수 있나요?"

**인터뷰 규칙**:
- 한 번에 최대 3개 질문. 사용자가 답하면 다음 질문 진행.
- 사용자가 "모른다" 또는 "확인 필요"라고 하면 → Open Question으로 기록하고 넘어간다.
- 답변이 충분하면 추가 질문 없이 Phase QG로 진행.

**출력**: context-input.json 보완 + 인터뷰 답변 메모

---

### Phase QG. Context Quality Gate (컨텍스트 충분성 검사)

**목적**: Phase A+에서 수집된 컨텍스트가 의미 있는 plan.md를 만들기에 충분한지 판단.
정보가 부족하면 바로 생성하지 않고 보완을 요청한다.

**판정 기준 (4개 항목 — 2개 이상 ❌이면 보완 요청)**:

| # | 항목 | 기준 |
|---|------|------|
| 1 | 이번 범위 구체성 | scope 필드가 "TBD" / "검토 중" 같은 미결로만 채워져 있지 않은가 |
| 2 | 업무 규칙 도출 가능성 | 수집된 내용에서 구체적 업무 규칙을 최소 3개 도출할 수 있는가 |
| 3 | 완료 기준 테스트 가능성 | 테스트 가능한 AC를 최소 2개 도출할 수 있는가 |
| 4 | OQ 집중도 | 핵심 필드(범위 / 업무 규칙 / 완료 기준)가 전부 미확정은 아닌가 |

**판정 결과 — 충분한 경우**:
- 별도 메시지 없이 Phase B로 바로 진행

**판정 결과 — 부족한 경우**:
```
수집된 정보만으로는 구체적인 plan.md를 만들기 어렵습니다.

부족한 항목:
- [예: 업무 규칙을 도출할 수 있는 기능 상세가 없습니다]
- [예: 완료 기준을 정의할 수 있는 요구사항 수준이 불명확합니다]

다음 중 하나를 선택해주세요:

[1] 추가 위키 URL 제공 → 개발 분석 페이지나 상세 요구사항 페이지를 주세요
[2] 텍스트로 보완 → 위에서 부족하다고 한 항목을 직접 설명해주세요
[3] 그래도 초안 생성 → 현재 정보로만 L0 초안을 만듭니다
                          (maturity_level: L0 — 보완 후 재컴파일 권장)
```

- [1] 선택 시 → 추가 URL 수집 후 Phase A로 돌아가 context 보강, QG 재평가
- [2] 선택 시 → 인터뷰 방식으로 부족 항목만 채우고, QG 재평가
- [3] 선택 시 → Phase B 진행, YAML frontmatter에 `maturity_level: L0` 명시

**출력**: QG 판정 결과 (충분 / 보완 요청)

---

### Phase B. Plan Compile (plan.md 생성)

**목적**: 수집된 컨텍스트를 `plan.md`로 컴파일. 확정 사실과 미확정 질문을 분리.

**사용할 프롬프트** (`references/prompt-pack.md` Prompt 01):
> 역할: 엔터프라이즈 환경의 시니어 Technical PM
> 규칙:
> - 제공된 문서에 없는 API 이름, DB 컬럼, 권한 규칙을 추측해서 만들지 말 것
> - 확정 사실과 추정/미확정을 명확히 분리할 것
> - 이번 범위, 제외 항목, 완료 기준, 확인 필요 사항, 위험 요소를 반드시 채울 것

**적용 템플릿**:
- L1: `references/plan-template-lite.md` (10섹션)
- L2/L3: `references/plan-template-full.md` (14섹션)

**YAML frontmatter 자동 설정**:
```yaml
case_name: {case_name}
version: 0.1
maturity_level: L1
owner: {owner}
last_updated: {오늘 날짜}
source_wikis:
  - pageId: {id}  # source_page_ids가 있으면 자동 변환
```

**품질 게이트 1+2 (하드스톱)**:
컴파일 완료 후 아래 항목을 자동 체크. 미통과 시 어떤 섹션이 부족한지 명시하고 중단.
- [ ] 추진 배경이 한 문장으로 요약 가능한가
- [ ] 이번 범위 / 제외 항목이 분리되어 있는가
- [ ] 옵션 목록에 동일하거나 유사한 표기가 있으면 Open Question으로 승격했는가
- [ ] 계산/생성 로직 패턴(URL 조합, 수식 등)이 기술되었거나 명시적으로 Open Question 처리되었는가
- [ ] 완료 기준이 테스트 가능한 문장인가
- [ ] 확인 필요 사항이 별도 섹션으로 분리되어 있는가
- [ ] 완료 기준의 옵션 레이블이 5번(업무 규칙) 테이블의 레이블과 정확히 일치하는가 (교차 검증)
- [ ] context-input.json에 source_page_ids가 있으면 YAML frontmatter의 source_wikis 필드로 변환했는가
- [ ] context-input.json에 deferred_bugs가 있으면 3번(제외 항목)에 반영했는가
- [ ] context-input.json에 ui_guidance가 있으면 7번(완료 기준) AC와 6번(제약 조건)에 반영했는가
- [ ] **plan.md에 프레임워크/언어명(React, Next.js, Spring Boot, REST API 등)이 노출되어 있지 않은가** (금지 규칙 위반 — 발견 시 비즈니스 표현으로 교체)

**출력**: `cases/{case_name}/plan.md` (초안)

**Phase F 자동 질의** (plan.md 신규 생성 OR 기존 케이스 갱신 직후 — 항상 반드시 실행):
> ⚠️ 기존 케이스를 업데이트한 경우에도 이 질의를 건너뛰지 않는다.

```
plan.md가 완성되었습니다.

이 내용을 기반으로 기획서(spec.pptx)도 생성할까요?
※ 기획서 원본이 없는 경우, 이 파이프라인이 기획서를 새로 만드는 방법입니다.

[Y] 네, 기획서도 만들어주세요 → Phase F 즉시 실행
[N] 아니요 → Phase B+ (Open Questions 즉시 해소 인터뷰) 진행
```

---

### Phase B+. Post-compile Interview (초안 검토 인터뷰)

**목적**: plan.md 초안의 Open Questions를 사용자에게 보여주고, 지금 바로 해소 가능한 항목을 즉시 반영.

**실행 순서**:

1. **초안 Open Questions 표시**
   ```
   plan.md 초안을 생성했습니다. Open Questions {N}개가 남아 있습니다.
   지금 바로 답할 수 있는 항목이 있으면 알려주세요.
   모르는 항목은 그냥 넘어가면 됩니다.

   [Open Questions 목록]
   #1. {질문}
   #2. {질문}
   ...
   ```

2. **답변 수집 및 plan.md 즉시 반영**
   - 사용자가 답한 항목 → plan.md 해당 섹션(업무 규칙, 제약 조건 등)으로 이동하여 확정 사실로 기록
   - 답변 못한 항목 → Open Questions에 그대로 유지
   - 새로운 정보가 나오면 → 관련 업무 규칙, 이번 범위, 위험 요소 섹션도 함께 업데이트

3. **해소율 보고**
   ```
   Open Questions {N}개 중 {M}개 해소되었습니다.
   남은 {N-M}개: #{번호} 목록
   → L2 진행을 위해 #{번호} 항목을 PM/개발자와 확인하세요.
   ```

**규칙**:
- 이 단계는 선택적 (사용자가 "건너뛰기" 하면 Phase C로 바로 진행)
- 답변이 추측 또는 불확실하면 → "확인 필요"로 기록하고 Open Question 유지
- 답변으로 새로운 Open Question이 생기면 → 추가로 기록

**출력**: `cases/{case_name}/plan.md` (인터뷰 반영 최종본)

---

### Phase C. Gap Review (리스크 추출)

**목적**: 구현 직전 반드시 확인해야 할 Missing Context와 Risk 추출.

**사용할 프롬프트** (`references/prompt-pack.md` Prompt 03):
> 역할: Risk Reviewer
> 우선 점검 항목: 권한, 보안, 외부 연동, 디자인 재사용 범위, 데이터 정합성, Idempotency, Error Handling

**출력 형식**:
```markdown
## Missing Context
- {구현 전 반드시 확인이 필요한 항목}

## Implementation Risk
- {코드 레벨 리스크}

## Business Risk
- {비즈니스/운영 레벨 리스크}

## Questions for PM
- {개발자가 PM에게 확인해야 할 질문}
```

**확인 필요 사항 작성 규칙**:
- plan.md 8번(확인 필요 사항)의 OQ 테이블에서 모든 컬럼을 채운다:
  - **질문**: 미확정 사항을 구체적으로 기술
  - **영향 범위**: 이 OQ가 미해소 시 어떤 구현이 블로킹되는지
  - **해소 경로**: PM 확인 / 코드 분석 / 데이터 조회 등 구체적 액션
  - **담당**: PM / 개발자 / 디자이너 등
  - **fallback**: 미해소 시 임시 처리 방안 (예: "기본값 사용", "Phase 2로 이관")
- 해소 경로와 fallback이 비어있는 OQ는 블로킹 리스크가 높으므로, 반드시 채우도록 한다.

**품질 게이트 3 체크**:
- [ ] 권한·보안 범위가 문서화되어 있는가
- [ ] 연동 계약이 명시되어 있는가
- [ ] 화면·디자인 제약(재사용 범위)이 고정되어 있는가
- [ ] risk-guardrails.md의 핵심 리스크(하위호환, 데이터 정합성 등)가 plan.md 9번(위험 요소)에도 반영되었는가
- [ ] 확인 필요 사항 테이블의 해소경로/담당/fallback 컬럼이 모두 채워져 있는가

**출력**: `cases/{case_name}/risk-guardrails.md`

---

### Phase E. Retrospective (회고)

**목적**: 케이스 완료 후 발견 사항을 정리하고, 다음 케이스에 적용할 개선점을 도출한다.

**실행 조건**: plan.md + (선택) spec.pptx 완료 후 실행.

**표준 retro 템플릿**:
```yaml
---
case_name: {case_name}
retro_date: {오늘 날짜}
phases_covered: {실행한 Phase 범위}
skill_version: {SKILL.md 버전}
---
```

**필수 섹션**:

1. **잘 된 것** — 이번 케이스에서 효과적이었던 패턴 (최소 3개)
2. **문제·발견 사항** — 테이블 형식 (# / 현상 / 원인 / 해결)
3. **다음 케이스 체크리스트** — `□` 형식
4. **수치 요약** — 테이블 (소스 수, OQ 수, 해소율 등)

**품질 게이트 4**:
- [ ] 최소 3개 개선 포인트 기록
- [ ] 다음 체크리스트 작성
- [ ] 수치 요약 테이블 포함

**출력**: `cases/{case_name}/retro.md`

---

### Phase F. Spec Generate (기획서 역생성)

**목적**: plan.md + wiki 이미지를 한국 기업형 기획서(PPTX)로 변환. 경영진/유관부서 보고용.
- **기획서 원본이 없는 경우**: wiki·회의록·업무 정의 등 raw context → Phase 0 → plan.md → Phase F 순서로 실행하면 기획서를 새로 만드는 완전한 파이프라인이 된다.
- **기획서 원본이 있는 경우**: 기존 기획서를 plan.md로 역파싱한 뒤 Phase F로 재생성하거나, Phase F를 건너뛰고 원본 기획서를 계속 사용한다.

**트리거**:
- 사용자 명시: "기획서 만들어줘", "PPT로 변환", "plan to spec", "spec-gen"
- **자동 질의**: Phase B 완료 직후 사용자 확인 (선택 사항)

**실행 조건**: Phase B 완료 (plan.md 존재, maturity_level L1 이상) + **사용자 확인**

**섹션 매핑** (plan.md 10섹션 → 기획서 최소 9슬라이드, 콘텐츠에 따라 최대 15슬라이드):

| 슬라이드 | 기획서 섹션 | plan.md 소스 |
|----------|------------|-------------|
| 1 | 표지 | YAML frontmatter (case_name, version, owner, last_updated) |
| 2 | 프로젝트 개요 | YAML + 문서 성격 |
| 3 | 추진 배경/목적 | `1. 추진 배경` |
| 4 | 현황 분석 (AS-IS) + 개선 방안 (TO-BE) | wiki 이미지 + `2. 이번 범위` |
| 5 | 변경사항 요약 | AS-IS→TO-BE 핵심 변경 목록 |
| 6 | 이번 범위 / 제외 항목 | `2. 이번 범위` + `3. 제외 항목` |
| 7 | 업무 규칙/프로세스 | `5. 업무 규칙` (표 형식 변환) |
| 8 | 제약 조건 | `6. 제약 조건` |
| 9 | 완료 기준 (DoD) | `7. 완료 기준` |
| 10 | QA 테스트 케이스 | `8. 확인 필요 사항` OQ 테이블 |
| 11 | 일정 계획 | [ESTIMATE] 범위 기반 WBS 자동 생성 |
| 12 | 기대 효과 | [ESTIMATE] 추진 배경에서 역추론 |
| 13 | 리스크/대응 방안 | `9. 위험 요소` |
| 14 | 착수 판단 / 관련 부서 협의사항 | `10. 착수 판단` + OQ 담당 그룹핑 |
| 15 | 기준 문서 / 부록 | `4. 기준 문서` + source_wikis |

**디자인 지침** (한국 기업형 기획서 표준):
- **슬라이드 번호 미노출** — 우측 하단 페이지 번호 추가 금지 (관행상 불필요, 번호 불일치 혼란 방지)
- 컬러 팔레트: 흰 배경 + 블루 포인트 (청색 헤더 바, `#0070C0`)
- 폰트: 맑은 고딕 (한국 기업 표준)
- 표/리스트 행 교번 배경 (흰색/연한 청색)
- [ESTIMATE] 마커: 자동 추정 콘텐츠(일정, 기대효과)는 반드시 표시

**실행 순서**:
```
F-0. 사전 확인 — plan.md 존재, maturity_level L1+
F-1. 이미지 수집
     ① cases/{case_name}/images/ 에 PNG 파일 있으면 → 자동 삽입
     ② 없으면 → **바로 플레이스홀더로 진행** (이미지 자동 다운로드 시도 금지)
        > ⚠️ `confluence_get_page_images` 사용 금지 — 이미지 바이너리를 컨텍스트로 반환해 에러 유발
        > ⚠️ `confluence_download_attachment` 도 직접 저장 불가 — 수동 다운로드 안내로 대체
     ③ 완료 후 수동 교체 안내: "images/ 폴더에 PNG 배치 후 재실행"
F-2. 보충 콘텐츠 — 일정(WBS)/기대효과 자동 생성, [ESTIMATE] 마커 표시
F-3. 섹션 매핑 — plan.md 파싱 + 기획서 9~15슬라이드 조립
F-4. PPTX 생성
     ① pptxgenjs 설치 확인: cases/{case_name}/에 node_modules/pptxgenjs 없으면
        `cd cases/{case_name} && npm install pptxgenjs`
     ② 프로젝트 루트에서 실행:
        `node generate-spec.js cases/{case_name}`
F-5. 품질 확인 — 슬라이드 구조 검증 (최소 9개)
F-6. 완료 보고 — 출력 경로 + 이미지 교체 안내
```

**이미지 처리**:
- `cases/{case_name}/images/` 에 PNG가 있으면 자동 삽입
- 없으면 **회색 플레이스홀더로 바로 생성** (이미지 자동 다운로드 금지)
  - ⚠️ `confluence_get_page_images` 금지 — 이미지 바이너리를 AI 컨텍스트로 전달해 에러 유발
  - 수동: 브라우저에서 PNG 다운로드 → `images/` 폴더 배치 → `node generate-spec.js` 재실행

**사용할 프롬프트** (`references/prompt-pack.md` Prompt 05)

**품질 게이트 5**:
- [ ] 최소 9슬라이드 구조 완성 (통상 13~15슬라이드)
- [ ] [ESTIMATE] 섹션에 마커 존재 (일정, 기대효과)
- [ ] 표지 메타데이터(과제명, 버전, 담당자, 일자) 정확
- [ ] 업무 규칙 테이블 정상 변환
- [ ] 슬라이드 번호(우측 하단 숫자) 미노출 확인

**출력**: `cases/{case_name}/spec.pptx`

---

## 성숙도 레벨 전이

| 레벨 | 상태 | 다음 단계 |
|------|------|-----------|
| L0 수집중 | Raw Context만 있음 | Phase 0 → Phase A 실행 |
| L1 요구사항 | 확정/미확정 분리 완료 | 확인 필요 사항 해소 |
| L2 규칙확정 | 권한·연동·디자인 제약 확정 | 구현 가능 영역 착수 |
| L3 착수준비 | 개발 에이전트 즉시 투입 가능 | 구현 핸드오프 |

---

## 케이스 폴더 구조

```
generate-spec.js          # 루트 공통 PPTX 생성 스크립트 (모든 케이스 공유)

cases/{case_name}/
  context-input.json      # Phase A 출력: 7개 필수 필드
  plan.md                 # Phase B 출력: canonical plan (YAML frontmatter 포함)
  risk-guardrails.md      # Phase C 출력: Missing Context + Risk
  retro.md                # Phase E(회고) 출력 (케이스 완료 후)
  spec.pptx               # Phase F(기획서 역생성) 출력
  images/                 # Phase F wiki 이미지 (수동 다운로드)
```

---

## 실행 예시

```
# 새 케이스 시작 (Phase 0부터 인터랙티브)
/context-planner

# Confluence 위키에서 컨텍스트 가져와 시작
/context-planner --from-confluence {page-id}

# 기존 케이스 Phase C만 실행
/context-planner cohort-management --phase gap-review

# Phase F: plan.md → 기획서 PPTX 생성
/context-planner external-link-generation --phase spec-gen
```

---

## 금지 규칙 (Anti-patterns)

- **기술 스택을 plan.md에 노출하지 않는다**: 프레임워크명(React, Spring 등), 언어 버전, 라이브러리 이름은 plan.md에 넣지 않는다. plan.md는 PM·기획자·디자이너를 위한 비즈니스 문서다.
  - 허용: 시스템·제품명(`legacy-app`, `new-platform` 등 비즈니스 컨텍스트에서 필요한 명칭), 비즈니스 제약이 된 기술 조건(`IE11 지원 필수`, `모바일 전용`)
  - 금지: `(React/Next.js + Spring Boot)`, `REST API`, `프론트엔드 개발`
  - 대체 표현: "화면 작업만으로", "서버 호출 없음"
- 문서에 없는 API 이름, DB 컬럼, 권한 규칙을 추측해서 채우지 않는다
- 확인 필요 사항을 숨기고 구현 가능한 것처럼 포장하지 않는다
- 옵션 목록에 동일하거나 유사한 표기가 있을 때 추측으로 구분하지 않는다 — 반드시 확인 필요 사항으로 올린다
- 계산/생성 로직(URL 조합, 수식 등)을 원문 없이 추측으로 채우지 않는다
- risk-guardrails.md에만 핵심 리스크를 두고 plan.md에는 누락하지 않는다 — plan.md가 canonical document
- 화면·디자인 재사용 범위 미확정 상태에서 프론트 개발을 `ready-for-dev`로 처리하지 않는다
- **spec.pptx에 슬라이드 번호(우측 하단 페이지 번호)를 추가하지 않는다** — 슬라이드 순서 변경 시 번호 불일치 혼란 발생. 한국 기업형 기획서 관행상 불필요

## Working Agreement

사람이 결정: Intent, Priority, Trade-off, Permission 경계
AI가 담당: 정리, 분해, 초안, 검증 질문, 형식화, 기획서 생성
