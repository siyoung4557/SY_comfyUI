// SY Set / SY Get의 "규칙"만 모아둔 파일 (화면과 분리해서 테스트 가능)
//
// Filter 방식
//  - SY Set: Filter 입력칸에 그룹 이름(예: AAA)을 적음
//  - SY Get: Filter 드롭다운에서 그룹을 고르면, Name 목록에 그 Filter의 Set만 보임
//  - "(all)"이면 전부 보임. 대소문자·앞뒤 공백은 무시

export const ALL = "(all)";
// Get Name 목록에서 "맞는 이름 없음"을 나타내는 특수 값 (선택해도 무시됨)
export const NO_MATCH = "\u0000sy-no-match";

export const normFilter = (f) => String(f ?? "").trim().toLowerCase();

const byText = (a, b) => {
    const x = a.toLowerCase(), y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
};

// Get의 Filter 드롭다운 목록: "(all)" + Set들에 적힌 Filter (중복·대소문자 차이는 하나로)
// current가 지금은 어떤 Set에도 없으면, 지우지 않고 "(all)" 바로 아래에 남김
export function filterOptions(setFilters, current) {
    const seen = new Map(); // 정규화 값 → 처음 나온 표기
    for (const f of setFilters) {
        const t = String(f ?? "").trim();
        if (t && !seen.has(normFilter(t))) seen.set(normFilter(t), t);
    }
    const list = [...seen.values()].sort(byText);
    const values = [ALL];
    let currentMissing = false;
    const cur = String(current ?? "").trim();
    if (cur && cur !== ALL && !seen.has(normFilter(cur))) {
        values.push(cur);
        currentMissing = true;
    }
    values.push(...list);
    return { values, currentMissing };
}

// Get의 Name 목록
// sets: [{ name, filter }], current: 지금 선택된 이름, getFilter: Get의 Filter 값
export function buildNameList(sets, current, getFilter) {
    const all = !getFilter || getFilter === ALL || !normFilter(getFilter);
    const want = normFilter(getFilter);
    const names = [...new Set(
        sets.filter((s) => s.name && (all || normFilter(s.filter) === want)).map((s) => s.name)
    )].sort(byText);

    const values = [];
    let currentFiltered = false;
    // 현재 값이 목록 밖이면 맨 위에 남겨둠 (Filter를 바꿔도 연결이 깨지지 않게)
    if (current && !names.includes(current)) {
        values.push(current);
        currentFiltered = true;
    }
    values.push(...names);
    const noMatch = names.length === 0;
    if (noMatch) values.push(NO_MATCH);
    return { values, currentFiltered, noMatch };
}

// 이름 중복 해결: base가 이미 있으면 base_2, base_3 …
export function uniqueName(base, existing) {
    const taken = new Set(existing);
    if (!taken.has(base)) return base;
    let i = 2;
    while (taken.has(`${base}_${i}`)) i++;
    return `${base}_${i}`;
}
