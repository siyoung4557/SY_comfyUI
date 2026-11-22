// SY Set / SY Get — 연결선 없이 값을 이름으로 주고받는 노드 쌍 (화면 전용, 파이썬 코드 없음)
//
// 동작 원리 ("가상 노드")
//  - 캔버스에서는 SY Get이 이름으로 SY Set을 가리킵니다.
//  - 실행(Queue)할 때 ComfyUI가 SY Get 자리에 "SY Set에 들어온 원래 연결"을 바꿔 끼워 서버로 보냅니다.
//    → 서버는 SY Set / SY Get의 존재를 모릅니다 (실행 결과는 직접 연결한 것과 같음).
//  - 이때 쓰는 resolveVirtualOutput은 ComfyUI 화면 코드에 Set/Get용으로 마련된 공식 연결 지점입니다.
//
// 필터 (SY Get)
//  - 속성 filter(정규식)로 이름 목록을 거름. 비어 있으면 전부 표시.
//  - 식이 잘못되면 '포함' 검사로 바꾸고 경고 표시.
//  - 현재 값이 필터 밖이어도 지우지 않고 목록 맨 위에 "(current, filtered out)"으로 남김.
//  - 필터는 목록 표시에만 영향. 실행 결과와는 무관.

import { app } from "../../scripts/app.js";
import * as S from "./setget_logic.js";

const SET_TYPE = "SYSetNode";
const GET_TYPE = "SYGetNode";

// UI 문구 (영문)
const T = {
    noMatch: "No names match the filter.",
    current: (n) => `${n} (current, filtered out)`,
    noSet: (n) => `No SY Set named "${n}".`,
    invalid: "Invalid filter. Using plain text match.",
    dupTitle: "Name already in use.",
    dup: (n) => `Renamed to "${n}".`,
    goSet: "Go to SY Set",
    goGets: "Go to SY Get",
    setFilter: "Set filter…",
    caseOn: "Case sensitive filter: On",
    caseOff: "Case sensitive filter: Off",
    sortName: "Sort names: by name",
    sortPos: "Sort names: by position",
};

// ───────────────────────── 공통 도우미 ─────────────────────────
const nodesOf = (graph) => graph?._nodes ?? graph?.nodes ?? [];
const isType = (n, t) => n?.type === t || n?.constructor?.type === t;
const setsIn = (graph) => nodesOf(graph).filter((n) => isType(n, SET_TYPE));
const getsIn = (graph) => nodesOf(graph).filter((n) => isType(n, GET_TYPE));
const nameOf = (n) => n?.widgets?.find((w) => w.name === "Name")?.value ?? "";
const findSet = (graph, name) => (name ? setsIn(graph).find((s) => nameOf(s) === name) : null);

function linkById(graph, id) {
    if (id == null || !graph) return null;
    return graph.getLink?.(id) ?? graph.links?.[id] ?? graph.links?.get?.(id) ?? null;
}

function toast(severity, summary, detail) {
    try {
        app.extensionManager?.toast?.add({ severity, summary, detail, life: 4000 });
    } catch {
        console.warn(`[SY Set/Get] ${summary} ${detail ?? ""}`);
    }
}

function redraw() {
    app.graph?.setDirtyCanvas?.(true, true);
    app.canvas?.setDirty?.(true, true);
}

function goTo(node) {
    const c = app.canvas;
    if (!c || !node) return;
    c.centerOnNode?.(node);
    c.selectNode?.(node, false);
    redraw();
}

// Set 이름이 바뀌면 그 이름을 쓰던 Get도 함께 바꿈 (F-06)
function renameGets(graph, oldName, newName) {
    if (!oldName || oldName === newName) return;
    for (const g of getsIn(graph)) {
        const w = g.widgets?.find((x) => x.name === "Name");
        if (w && w.value === oldName) {
            w.value = newName;
            g._syLast = newName;
        }
    }
}

// 간단한 입력 창 (필터 입력용)
function askText({ title, value, placeholder, onOk }) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-family:sans-serif;";
    const box = document.createElement("div");
    box.style.cssText = "width:min(380px,92vw);display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:10px;background:var(--comfy-menu-bg,#2b2b2b);color:var(--fg-color,#ddd);border:1px solid var(--border-color,#555);box-shadow:0 10px 40px rgba(0,0,0,.5);font-size:13px;";
    const h = document.createElement("div");
    h.textContent = title;
    h.style.cssText = "font-weight:bold;font-size:15px;";
    const hint = document.createElement("div");
    hint.textContent = "Regex to filter the name list. Leave empty to show all.  (e.g. ^#  /  ^[#@])";
    hint.style.cssText = "opacity:.7;font-size:12px;";
    const input = document.createElement("input");
    input.type = "text";
    input.value = value ?? "";
    input.placeholder = placeholder ?? "";
    input.style.cssText = "padding:8px;border-radius:6px;color:var(--input-text,#ddd);background:var(--comfy-input-bg,#1e1e1e);border:1px solid var(--border-color,#555);font-size:13px;";
    const foot = document.createElement("div");
    foot.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";
    const mk = (label, primary) => {
        const b = document.createElement("button");
        b.textContent = label;
        b.style.cssText = `padding:7px 16px;border-radius:6px;cursor:pointer;color:${primary ? "#fff" : "inherit"};border:1px solid ${primary ? "#3b82f6" : "var(--border-color,#555)"};background:${primary ? "#3b82f6" : "transparent"};`;
        return b;
    };
    const cancel = mk("Cancel"), ok = mk("OK", true);
    foot.append(cancel, ok);
    box.append(h, hint, input, foot);
    overlay.appendChild(box);
    const close = () => overlay.remove();
    const done = () => { onOk(input.value.trim()); close(); };
    cancel.onclick = close;
    ok.onclick = done;
    overlay.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") done();
        if (e.key === "Escape") close();
    });
    overlay.addEventListener("keyup", (e) => e.stopPropagation());
    document.body.appendChild(overlay);
    setTimeout(() => { input.focus(); input.select(); }, 0);
}

// ───────────────────────── 노드 등록 ─────────────────────────
app.registerExtension({
    name: "SY.SetGet",

    registerCustomNodes() {
        const LG = window.LiteGraph;
        const Base = window.LGraphNode;
        if (!LG || !Base) {
            console.error("[SY Set/Get] LiteGraph를 찾을 수 없어 노드를 등록하지 못했습니다.");
            return;
        }
        const INPUT = LG.INPUT ?? 1;

        // ═════════════════════ SY Set ═════════════════════
        class SYSet extends Base {
            constructor(title) {
                super(title);
                this.isVirtualNode = true;       // 실행 요청에서 빠짐
                this.serialize_widgets = true;   // 이름을 워크플로에 저장
                this._syPrev = "";

                this.addInput("value", "*");
                this.addOutput("value", "*");    // 통과 출력 (원하면 바로 이어서 쓸 수 있음)

                const self = this;
                this.addWidget("text", "Name", "", function (v) { self.syApplyName(v, true); });
            }

            // 이름 적용: 중복이면 _2, _3… 를 붙이고 알림 (F-05), 바뀌면 Get도 따라 바꿈 (F-06)
            syApplyName(v, notify) {
                const w = this.widgets.find((x) => x.name === "Name");
                let name = String(v ?? "").trim();
                const others = setsIn(this.graph).filter((s) => s !== this).map(nameOf);
                if (name && others.includes(name)) {
                    const fixed = S.uniqueName(name, others);
                    if (notify) toast("warn", T.dupTitle, T.dup(fixed));
                    name = fixed;
                }
                w.value = name;
                if (this._syPrev && this._syPrev !== name) renameGets(this.graph, this._syPrev, name);
                this._syPrev = name;
                redraw();
            }

            // 입력이 연결/해제되면 타입 표시를 맞춤 (F-07)
            onConnectionsChange(side, slot, connected, linkInfo) {
                if (side !== INPUT) return;
                if (connected && linkInfo) {
                    const type = linkInfo.type || "*";
                    this.inputs[0].type = type;
                    this.outputs[0].type = type;
                    this.inputs[0].label = type === "*" ? "value" : type;
                    this.outputs[0].label = type === "*" ? "value" : type;
                    // 이름이 비어 있으면 타입 이름으로 자동 지정 (불러오는 중에는 하지 않음)
                    if (!nameOf(this) && !app.configuringGraph && type !== "*") {
                        this.syApplyName(type, false);
                    }
                } else if (!connected) {
                    this.inputs[0].type = "*";
                    this.outputs[0].type = "*";
                    this.inputs[0].label = "value";
                    this.outputs[0].label = "value";
                }
                redraw();
            }

            // 복사·붙여넣기 등으로 추가될 때 이름 중복 해결
            onAdded() {
                if (app.configuringGraph) return;
                const n = nameOf(this);
                if (n) this.syApplyName(n, true);
            }

            onConfigure() {
                this._syPrev = nameOf(this);
            }

            getExtraMenuOptions(canvas, options) {
                const name = nameOf(this);
                const gets = getsIn(this.graph).filter((g) => nameOf(g) === name && name);
                const entry = { content: `${T.goGets} (${gets.length})`, disabled: gets.length === 0 };
                if (gets.length === 1) entry.callback = () => goTo(gets[0]);
                else if (gets.length > 1) {
                    entry.has_submenu = true;
                    entry.submenu = {
                        options: gets.map((g, i) => ({ content: `#${i + 1} (id ${g.id})`, callback: () => goTo(g) })),
                    };
                }
                options.unshift(entry, null);
            }
        }

        // ═════════════════════ SY Get ═════════════════════
        class SYGet extends Base {
            constructor(title) {
                super(title);
                this.isVirtualNode = true;
                this.serialize_widgets = true;
                this._syLast = "";
                this._syInfo = { values: [], currentFiltered: false, noMatch: true, invalid: false };

                this.addProperty("filter", "", "string");
                this.addProperty("filterCaseSensitive", false, "boolean");
                this.addProperty("sort", "name", "enum", { values: ["name", "position"] });

                this.addOutput("value", "*");

                const self = this;
                const w = this.addWidget("combo", "Name", "", function (v) { self.syOnSelect(v); }, {
                    values: [],
                    getOptionLabel: (v) => self.syLabel(v),
                });
                // 목록을 열 때마다 새로 계산 (Set 추가·이름 변경이 바로 반영)
                Object.defineProperty(w.options, "values", {
                    get: () => self.syComputeList().values,
                    configurable: true,
                    enumerable: true,
                });
            }

            syComputeList() {
                const sets = setsIn(this.graph).map((s) => ({ name: nameOf(s), pos: s.pos }));
                const names = S.sortSets(sets, this.properties.sort);
                this._syInfo = S.buildNameList(
                    names, nameOf(this), this.properties.filter, !!this.properties.filterCaseSensitive
                );
                return this._syInfo;
            }

            syLabel(v) {
                if (v == null || v === "") return "";
                if (v === S.NO_MATCH) return T.noMatch;
                if (v === nameOf(this) && this._syInfo.currentFiltered) return T.current(v);
                return v;
            }

            syOnSelect(v) {
                const w = this.widgets.find((x) => x.name === "Name");
                if (v === S.NO_MATCH) {       // "맞는 이름 없음" 안내는 선택해도 무시
                    w.value = this._syLast;
                } else {
                    this._syLast = v;
                }
                this.sySyncType();
                redraw();
            }

            onConfigure() {
                this._syLast = nameOf(this);
            }

            // ── 실행 때 연결 바꿔 끼우기 (F-03) ──
            // 새 ComfyUI 화면: resolveVirtualOutput 사용 (Bypass/Mute는 ComfyUI가 처리)
            resolveVirtualOutput() {
                const set = findSet(this.graph, nameOf(this));
                const link = linkById(this.graph, set?.inputs?.[0]?.link);
                if (!link) return undefined;
                const node = this.graph.getNodeById(link.origin_id);
                if (!node) return undefined;
                return { node, slot: link.origin_slot };
            }

            // 예전 ComfyUI 화면용 (getInputLink 방식)
            getInputLink() {
                const set = findSet(this.graph, nameOf(this));
                return linkById(this.graph, set?.inputs?.[0]?.link);
            }

            // 출력 타입을 Set 입력 타입에 맞춤 (F-07)
            sySyncType() {
                const set = findSet(this.graph, nameOf(this));
                const type = set?.inputs?.[0]?.type || "*";
                const out = this.outputs?.[0];
                if (out && out.type !== type) {
                    out.type = type;
                    out.label = type === "*" ? "value" : type;
                }
            }

            onPropertyChanged(name, value) {
                if (name === "filter" && S.makeMatcher(value).invalid) toast("warn", T.invalid);
                redraw();
            }

            // 경고 한 줄을 그릴 자리 확보
            computeSize(out) {
                const size = super.computeSize(out);
                size[1] += 16;
                return size;
            }

            onDrawForeground(ctx) {
                if (this.flags?.collapsed) return;
                this.sySyncType();

                const name = nameOf(this);
                const filter = (this.properties.filter ?? "").trim();
                let msg = "", color = "#f87171";
                if (name && !findSet(this.graph, name)) msg = T.noSet(name);          // F-09
                else if (filter && S.makeMatcher(filter).invalid) { msg = T.invalid; color = "#fbbf24"; }

                ctx.save();
                ctx.font = "11px sans-serif";
                ctx.textBaseline = "alphabetic";
                // 필터가 걸려 있으면 제목줄 오른쪽에 작게 표시
                if (filter) {
                    const th = LG.NODE_TITLE_HEIGHT || 30;
                    ctx.textAlign = "right";
                    ctx.fillStyle = "#8ab4f8";
                    ctx.fillText(`filter: ${filter}`, this.size[0] - 8, -th / 2 + 4);
                }
                if (msg) {
                    ctx.textAlign = "left";
                    ctx.fillStyle = color;
                    ctx.fillText(msg, 10, this.size[1] - 6);
                }
                ctx.restore();
            }

            getExtraMenuOptions(canvas, options) {
                const set = findSet(this.graph, nameOf(this));
                const p = this.properties;
                options.unshift(
                    { content: T.goSet, disabled: !set, callback: () => goTo(set) },
                    {
                        content: T.setFilter,
                        callback: () => askText({
                            title: "SY Get filter", value: p.filter, placeholder: "^#",
                            onOk: (v) => this.setProperty("filter", v),
                        }),
                    },
                    {
                        content: p.filterCaseSensitive ? T.caseOn : T.caseOff,
                        callback: () => this.setProperty("filterCaseSensitive", !p.filterCaseSensitive),
                    },
                    {
                        content: p.sort === "position" ? T.sortPos : T.sortName,
                        callback: () => this.setProperty("sort", p.sort === "position" ? "name" : "position"),
                    },
                    null
                );
            }
        }

        LG.registerNodeType(SET_TYPE, Object.assign(SYSet, { title: "SY Set", category: "SY" }));
        LG.registerNodeType(GET_TYPE, Object.assign(SYGet, { title: "SY Get", category: "SY" }));
        SYSet.category = "SY";
        SYGet.category = "SY";
    },
});
