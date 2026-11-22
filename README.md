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
- **⋮ 메뉴**: Edit(수정) / ▲(위로) / ▼(아래로) / Delete(삭제)
- **라디오 버튼 / index(0부터)**: 출력할 세트 선택. 선택하면 mode가 fixed로 바뀝니다.
- **mode**: `fixed` = 선택한 세트 출력, `randomize` = 실행할 때마다 무작위 세트 출력(뽑힌 번호가 화면에 표시됨)
- title을 비워두면 `Prompt N`으로 자동 이름이 붙습니다.
- **편집 창 크기 조절**: 창 오른쪽 아래 모서리를 끌면 크기가 바뀌고 Prompt 입력칸도 함께 커집니다.
- **🔍 검색**(제목줄 오른쪽 위, 또는 우클릭 → Search...): 검색어와 같은 부분을 title·prompt에서 파란색으로 표시 (대소문자 구분 안 함). Clear 또는 빈 검색어로 해제. 검색 중에는 돋보기가 파란색.
- 출력: `t & p` — 선택된 세트를 `<title>  prompt` 형태로 합친 글자(STRING). 세트가 하나도 없으면 빈 문자열.
- 목록 출력: `title_list`, `prompt_list` — 모든 세트를 순서대로 담은 목록. 세트가 없으면 빈 글자 1개(`[""]`).

### 다른 노드에서 가져오기 (title_list / prompt_list 입력)
1. 다른 노드의 title 목록 → `title_list`, prompt 목록 → `prompt_list`에 연결 (title_list는 없어도 됨)
2. Queue(실행) 한 번 → **기존 목록이 전부 지워지고** 받은 목록으로 새로 채워짐 (같은 순서끼리 짝지음, title이 비면 `Prompt N`, prompt가 빈 세트는 건너뜀)
3. 이번 실행의 `t & p`는 항상 0번 세트
4. **가져온 뒤에는 연결선을 끊으세요.** 연결된 채로 다시 실행하면 수정한 내용이 다시 덮어써집니다.

받을 수 있는 형태: 리스트 출력 / JSON 배열 글자(`["a","b"]`) / 한 덩어리 글자(prompt 1개로 처리)

## SY Set / SY Get
연결선 없이 값을 **이름**으로 주고받는 노드 쌍입니다. (KJNodes Set/Get과 같은 방식, 화면 전용 — 파이썬 코드 없음)
- **SY Set**: 아무 타입이나 입력 1개를 받고 이름(Name)을 붙입니다. 입력을 연결하면 이름이 비어 있을 때 타입 이름으로 자동 지정됩니다.
- **SY Get**: 이름 목록에서 하나를 골라 그 Set의 입력을 그대로 내보냅니다. 출력 타입은 Set 입력 타입을 따라갑니다.
- 실행할 때 Get 자리에 Set의 원래 연결이 바꿔 끼워져 서버로 전달됩니다. (서버는 Set/Get을 모름)
- 같은 이름의 Set이 생기면 `_2`, `_3`…이 붙고 알림이 뜹니다. Set 이름을 바꾸면 연결된 Get도 함께 바뀝니다.
- 같은 그래프 안에서만 찾습니다. (서브그래프 안의 Set/Get은 그 서브그래프 안에서만 연결)

### Get 필터
- 우클릭 → **Set filter…** (또는 속성 패널의 `filter`): 정규식으로 이름 목록을 거릅니다. 비우면 전부 표시.
  - 예: `^#` → #으로 시작 / `^[#@]` → # 또는 @로 시작 / `seed` → seed가 들어간 이름
- 식이 잘못되면 일반 글자 포함 검사로 바뀌고 노드에 경고가 표시됩니다.
- 현재 값이 필터 밖이어도 지워지지 않고 `(current, filtered out)`으로 맨 위에 남습니다.
- 우클릭 메뉴: 대소문자 구분 켜기/끄기, 이름순/위치순 정렬, **Go to SY Set** / (Set에서) **Go to SY Get**
- 필터가 걸려 있으면 제목줄 오른쪽에 `filter: …`가 표시됩니다.
