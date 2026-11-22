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
- 출력: `title`, `prompt` (STRING). 세트가 하나도 없으면 빈 문자열을 출력합니다.
