// SY Prompt List의 "규칙"만 모아둔 파일 (화면 그리기와 분리)
// 상태(state) 모양: { items: [{title, prompt}], index: 0, mode: "fixed" | "randomize" }
// index는 0부터 시작합니다.

export function emptyState() {
    return { items: [], index: 0, mode: "fixed" };
}

export function normalize(raw) {
    let d = raw;
    if (typeof d === "string") {
        try { d = JSON.parse(d); } catch { d = {}; }
    }
    if (!d || typeof d !== "object") d = {};
    const items = Array.isArray(d.items)
        ? d.items.filter((x) => x && typeof x === "object")
                 .map((x) => ({ title: String(x.title ?? ""), prompt: String(x.prompt ?? ""), pick: x.pick === true }))
        : [];
    const mode = d.mode === "randomize" ? "randomize" : "fixed";
    const s = { items, index: Number.parseInt(d.index, 10) || 0, mode };
    return clampIndex(s);
}

export function clampIndex(s) {
    if (s.items.length === 0) s.index = 0;
    else s.index = Math.max(0, Math.min(s.index, s.items.length - 1));
    return s;
}

// title이 비어 있으면 "Prompt N" (N = 목록에서의 순서, 1부터)
export function autoTitle(title, position) {
    const t = (title ?? "").trim();
    return t.length > 0 ? t : `Prompt ${position + 1}`;
}

export function addItem(s, title, prompt) {
    const pos = s.items.length;
    s.items.push({ title: autoTitle(title, pos), prompt: prompt ?? "", pick: false });
    if (s.items.length === 1) s.index = 0;
    return s;
}

export function editItem(s, i, title, prompt) {
    if (i < 0 || i >= s.items.length) return s;
    s.items[i] = { ...s.items[i], title: autoTitle(title, i), prompt: prompt ?? "" }; // 체크(pick)는 유지
    return s;
}

// 삭제: 선택된 세트를 지우면 바로 위 세트가 선택됨 (맨 위였다면 새 맨 위)
//       선택된 세트보다 위를 지우면 선택은 같은 세트를 따라감
export function deleteItem(s, i) {
    if (i < 0 || i >= s.items.length) return s;
    s.items.splice(i, 1);
    if (i < s.index) s.index -= 1;
    else if (i === s.index) s.index = Math.max(0, i - 1);
    return clampIndex(s);
}

// 자리 바꾸기: dir = -1(▲) / +1(▼). 선택 표시는 원래 선택한 세트를 따라감
export function moveItem(s, i, dir) {
    const j = i + dir;
    if (i < 0 || j < 0 || i >= s.items.length || j >= s.items.length) return s;
    [s.items[i], s.items[j]] = [s.items[j], s.items[i]];
    if (s.index === i) s.index = j;
    else if (s.index === j) s.index = i;
    return s;
}

// 라디오 버튼 / index 변경. fromRadio=true면 randomize → fixed 로 자동 전환
export function select(s, i, fromRadio = false) {
    s.index = i;
    if (fromRadio) s.mode = "fixed";
    return clampIndex(s);
}

// 가져오기: 목록을 통째로 교체하고 0번 선택 (mode는 그대로 유지)
export function replaceAll(s, items) {
    const n = normalize({ items, index: 0, mode: s.mode });
    n.items = n.items.map((it, i) => ({ title: autoTitle(it.title, i), prompt: it.prompt, pick: false })); // 체크는 모두 해제
    return n;
}

// 랜덤 후보 체크 켜기/끄기 (randomize 모드에서만 의미 있음)
export function togglePick(s, i) {
    if (i < 0 || i >= s.items.length) return s;
    s.items[i].pick = !s.items[i].pick;
    return s;
}

// 높이 나누기: 내용이 짧은 세트는 필요한 만큼만, 남은 공간은 내용이 긴 세트들이 똑같이 나눠 가짐
// natural: 각 세트가 내용을 다 보여줄 때의 높이, total: 쓸 수 있는 전체 높이, minH: 긴 세트의 최소 높이
export function allocateHeights(natural, total, minH = 72) {
    const n = natural.length;
    const res = new Array(n);
    const order = [...natural.keys()].sort((a, b) => natural[a] - natural[b]);
    let remaining = total, left = n;
    for (const i of order) {
        const share = remaining / left;
        if (natural[i] > share) break;
        res[i] = natural[i];
        remaining -= natural[i];
        left -= 1;
    }
    if (left > 0) {
        const share = Math.max(minH, Math.floor(remaining / left));
        for (const i of order) if (res[i] === undefined) res[i] = Math.min(natural[i], share);
    }
    return res;
}
