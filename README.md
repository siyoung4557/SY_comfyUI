# SY Preview Image — ComfyUI 커스텀 노드

Preview Image 노드의 제목줄 오른쪽 위에 **Save** 버튼을 추가한 노드입니다.
버튼을 누르면 '다른 이름으로 저장' 창이 열려 원하는 폴더에 PNG로 저장할 수 있습니다.
한 번 폴더를 고르면 다음 저장 때는 그 폴더에서 저장 창이 열립니다.

## 설치
```
cd ComfyUI/custom_nodes
git clone <이 저장소 주소>
```
ComfyUI를 다시 시작하고 `SY Preview Image`를 검색하세요. (카테고리: SY)

## 참고
- 저장 창은 Chrome/Edge + localhost 접속에서만 열립니다. 다른 환경에서는 일반 다운로드로 저장됩니다.
- 제목줄 버튼이 동작하지 않으면 노드를 우클릭해 `💾 Save image as...`를 사용하세요.
