# SY_comfyUI — Siyoung의 ComfyUI 커스텀 노드 모음

## 설치
```
cd ComfyUI/custom_nodes
git clone https://github.com/siyoung4557/SY_comfyUI.git
```
또는 GitHub Desktop → File → Clone repository → URL 탭에 위 주소 입력.
ComfyUI를 다시 시작하면 **SY** 카테고리에 노드가 보입니다.

업데이트: GitHub Desktop에서 Fetch origin → Pull origin (또는 `git pull`)

---

## SY Preview Image
Preview Image 노드의 제목줄 오른쪽 위에 **Save** 버튼이 있습니다.
- 버튼을 누르면 '다른 이름으로 저장' 창이 열려 원하는 폴더에 PNG로 저장합니다.
- 한 번 폴더를 고르면 다음 저장 때는 그 폴더에서 저장 창이 열립니다.
- 저장 창은 Chrome/Edge + localhost 접속에서만 열립니다. 다른 환경에서는 일반 다운로드로 저장됩니다.
- 제목줄 버튼이 동작하지 않으면 노드를 우클릭해 `💾 Save image as...`를 사용하세요.

## SY Prompt List
여러 개의 title / prompt 세트를 한 노드에서 관리하고, 그중 하나를 출력합니다.
- **+ Add Prompt**: 입력 창에서 title·prompt를 입력하고 Save → 맨 아래에 추가
- **⋮ 메뉴**: Copy Prompt(prompt 복사) / Edit(수정) / ▲(위로) / ▼(아래로) / Delete(삭제)
- **라디오 버튼 / index(0부터)**: 출력할 세트 선택. 선택하면 mode가 fixed로 바뀝니다.
- **mode**: `fixed` = 선택한 세트 출력, `randomize` = 실행할 때마다 무작위 세트 출력(뽑힌 번호가 화면에 표시됨)
- **랜덤 후보 체크**(번호 아래 작은 체크칸): randomize일 때 **체크된 세트 중에서만** 뽑습니다. 체크된 게 없으면 전체에서 뽑습니다. fixed일 때도 보이고 선택할 수 있지만 결과에는 영향이 없습니다. + Add Prompt 옆 **☑ All / ☐ None**으로 전체 체크·해제.
- title을 비워두면 `Prompt N`으로 자동 이름이 붙습니다.
- **Add / Edit 창은 떠 있는 창**: 배경(캔버스)을 막지 않아 창을 띄운 채로 다른 노드를 선택·복사할 수 있습니다. 제목줄을 끌어 이동, 항상 위에 표시, 한 번에 하나만 열림.
- **편집 창 크기 조절**: 창 오른쪽 아래 모서리를 끌면 크기가 바뀌고 Prompt 입력칸도 함께 커집니다.
- **편집 창 🔍**: 수정 창 제목줄의 돋보기 → 검색어 입력 → Prompt 입력칸 안에서 일치하는 부분이 파란색으로 표시 (대소문자 구분 안 함, 고치는 중에도 따라 바뀜, 창을 닫으면 사라짐)
- **🔍 검색**(제목줄 오른쪽 위, 또는 우클릭 → Search...): 검색어와 같은 부분을 title·prompt에서 파란색으로 표시 (대소문자 구분 안 함). Clear 또는 빈 검색어로 해제. 검색 중에는 돋보기가 파란색.
- 출력: `prompt`, `t & p`(`<title>  prompt` 형태로 합친 글자) — 모두 STRING. 세트가 하나도 없으면 빈 문자열.

### 다른 노드에서 가져오기 (title_list / prompt_list 입력)
1. 다른 노드의 title 목록 → `title_list`, prompt 목록 → `prompt_list`에 연결 (title_list는 없어도 됨)
2. Queue(실행) 한 번 → **기존 목록이 전부 지워지고** 받은 목록으로 새로 채워짐 (같은 순서끼리 짝지음, title이 비면 `Prompt N`, prompt가 빈 세트는 건너뜀)
3. 이번 실행은 항상 0번 세트를 출력
4. **가져온 뒤에는 연결선을 끊으세요.** 연결된 채로 다시 실행하면 수정한 내용이 다시 덮어써집니다.

받을 수 있는 형태: 리스트 출력 / JSON 배열 글자(`["a","b"]`) / 한 덩어리 글자(prompt 1개로 처리)

## SY Set / SY Get
연결선 없이 값을 **이름**으로 주고받는 노드 쌍입니다. (KJNodes Set/Get과 같은 방식, 화면 전용 — 파이썬 코드 없음)
- **SY Set**: 아무 타입이나 입력 1개를 받고 이름(Name)을 붙입니다. 입력을 연결하면 이름이 비어 있을 때 타입 이름으로 자동 지정됩니다.
- **SY Get**: 이름 목록에서 하나를 골라 그 Set의 입력을 그대로 내보냅니다. 출력 타입은 Set 입력 타입을 따라갑니다.
- 실행할 때 Get 자리에 Set의 원래 연결이 바꿔 끼워져 서버로 전달됩니다. (서버는 Set/Get을 모름)
- 같은 이름의 Set이 생기면 `_2`, `_3`…이 붙고 알림이 뜹니다. Set 이름을 바꾸면 연결된 Get도 함께 바뀝니다.
- 같은 그래프 안에서만 찾습니다. (서브그래프 안의 Set/Get은 그 서브그래프 안에서만 연결)

### Filter (Get 목록 줄이기)
- **SY Set**: Name 아래 **Filter** 칸에 그룹 이름을 적습니다. (예: `AAA`)
- **SY Get**: Name 아래 **Filter** 드롭다운에서 그룹을 고르면, Name 목록에 **그 Filter의 Set만** 보입니다.
  - 드롭다운에는 Set들에 적힌 Filter 값만 나와서 오타가 날 수 없습니다. `(all)` = 전부 보기
  - 대소문자·앞뒤 공백은 구분하지 않습니다. (`AAA` = `aaa`)
- 현재 고른 Name이 Filter 밖이 되어도 지워지지 않고 `(current, filtered out)`으로 맨 위에 남습니다.
- Filter는 목록 표시에만 영향이 있고, 실행 결과와는 무관합니다.
- 우클릭 메뉴: (Get) **Go to SY Set** / (Set) **Go to SY Get**
