// SY Set / SY Get의 "규칙"만 모아둔 파일 (화면과 분리해서 테스트 가능)

// Get 목록에서 "맞는 이름 없음"을 나타내는 특수 값 (선택해도 무시됨)
export const NO_MATCH = "\u0000sy-no-match";

// 필터 검사기 만들기: 정규식이 잘못되면 '포함' 검사로 바꾸고 invalid=true
export function makeMatcher(filter, caseSensitive = false) {
    const f = (filter ?? "").trim();
    if (!f) return { test: () => true, invalid: false, empty: true };
    try {
        const re = new RegExp(f, caseSensitive ? "" : "i");
        return { test: (name) => re.test(name), invalid: false, empty: false };
    } catch {
        const needle = caseSensitive ? f : f.toLowerCase();
        return {
            test: (name) => (caseSensitive ? name : name.toLowerCase()).includes(needle),
            invalid: true,
            empty: false,
        };
    }
}

// Get 목록 만들기
// names: Set 이름들 (이미 정렬된 상태), current: 지금 선택된 값
// 결과: values(목록), currentFiltered(현재 값이 필터 밖), noMatch, invalid
export function buildNameList(names, current, filter, caseSensitive = false) {
    const m = makeMatcher(filter, caseSensitive);
    const unique = [...new Set(names.filter((n) => typeof n === "string" && n.length > 0))];
    const matched = unique.filter((n) => m.test(n));
    const values = [];
    let currentFiltered = false;

    // 현재 값이 목록 밖이면 맨 위에 남겨둠 (필터 때문에 워크플로가 깨지지 않게)
    if (current && !matched.includes(current)) {
        values.push(current);
        currentFiltered = true;
    }
    values.push(...matched);

    const noMatch = matched.length === 0;
    if (noMatch) values.push(NO_MATCH);

    return { values, currentFiltered, noMatch, invalid: m.invalid };
}

// 이름 중복 해결: base가 이미 있으면 base_2, base_3 …
export function uniqueName(base, existing) {
    const taken = new Set(existing);
    if (!taken.has(base)) return base;
    let i = 2;
    while (taken.has(`${base}_${i}`)) i++;
    return `${base}_${i}`;
}

// 정렬: "name" = 이름순, "position" = 캔버스 위치순 (위→아래, 왼→오)
export function sortSets(sets, mode) {
    const arr = [...sets];
    if (mode === "position") {
        arr.sort((a, b) => (a.pos[1] - b.pos[1]) || (a.pos[0] - b.pos[0]));
    } else {
        // 기호(#, @, $ …)도 순서에 반영되도록 글자 코드 순 (대소문자 무시)
        arr.sort((a, b) => {
            const x = a.name.toLowerCase(), y = b.name.toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
        });
    }
    return arr.map((s) => s.name);
}
