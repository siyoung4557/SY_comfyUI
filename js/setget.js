// SY Set / SY Get — 연결선 없이 값을 이름으로 주고받는 노드 쌍 (화면 전용, 파이썬 코드 없음)
//
// 동작 원리 ("가상 노드")
//  - 캔버스에서는 SY Get이 이름으로 SY Set을 가리킵니다.
//  - 실행(Queue)할 때 ComfyUI가 SY Get 자리에 "SY Set에 들어온 원래 연결"을 바꿔 끼워 서버로 보냅니다.
//    → 서버는 SY Set / SY Get의 존재를 모릅니다 (실행 결과는 직접 연결한 것과 같음).
//  - 이때 쓰는 resolveVirtualOutput은 ComfyUI 화면 코드에 Set/Get용으로 마련된 공식 연결 지점입니다.
//
// Filter
//  - SY Set: Name 아래 Filter 입력칸에 그룹 이름(예: AAA)을 적음
//  - SY Get: Name 아래 Filter 드롭다운에서 그룹을 고르면 Name 목록에 그 그룹의 Set만 보임
//    ("(all)" = 전부, 대소문자 구분 안 함). 목록 표시에만 영향, 실행 결과와는 무관.

import { app } from "../../scripts/app.js";
import * as S from "./setget_logic.js";

const SET_TYPE = "SYSetNode";
const GET_TYPE = "SYGetNode";

// UI 문구 (영문)
const T = {
    noMatch: "No SY Set in this filter.",
    current: (n) => `${n} (current, filtered out)`,
    filterMissing: (f) => `${f} (not used by any SY Set)`,
    noSet: (n) => `No SY Set named "${n}".`,
    dupTitle: "Name already in use.",
    dup: (n) => `Renamed to "${n}".`,
    goSet: "Go to SY Set",
    goGets: "Go to SY Get",
};

// ───────────────────────── 공통 도우미 ─────────────────────────
const nodesOf = (graph) => graph?._nodes ?? graph?.nodes ?? [];
const isType = (n, t) => n?.type === t || n?.constructor?.type === t;
const setsIn = (graph) => nodesOf(graph).filter((n) => isType(n, SET_TYPE));
const getsIn = (graph) => nodesOf(graph).filter((n) => isType(n, GET_TYPE));
const widgetOf = (n, name) => n?.widgets?.find((w) => w.name === name);
const nameOf = (n) => widgetOf(n, "Name")?.value ?? "";
const filterOf = (n) => widgetOf(n, "Filter")?.value ?? "";
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

// Set 이름이 바뀌면 그 이름을 쓰던 Get도 함께 바꿈
function renameGets(graph, oldName, newName) {
    if (!oldName || oldName === newName) return;
    for (const g of getsIn(graph)) {
        const w = widgetOf(g, "Name");
        if (w && w.value === oldName) {
            w.value = newName;
            g._syLast = newName;
        }
    }
}

// 콤보(드롭다운) 목록을 열 때마다 새로 계산하게 만듦
function liveValues(widget, compute) {
    Object.defineProperty(widget.options, "values", {
        get: compute,
        configurable: true,
        enumerable: true,
    });
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
                this.serialize_widgets = true;   // 이름·필터를 워크플로에 저장
                this._syPrev = "";

                this.addInput("value", "*");
                this.addOutput("value", "*");    // 통과 출력 (원하면 바로 이어서 쓸 수 있음)

                const self = this;
                this.addWidget("text", "Name", "", function (v) { self.syApplyName(v, true); });
                this.addWidget("text", "Filter", "", function () { redraw(); });
            }

            // 이름 적용: 중복이면 _2, _3… 를 붙이고 알림, 바뀌면 Get도 따라 바꿈
            syApplyName(v, notify) {
                const w = widgetOf(this, "Name");
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

            // 입력이 연결/해제되면 타입 표시를 맞춤
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
                this._syNames = { values: [], currentFiltered: false, noMatch: true };
                this._syFilters = { values: [S.ALL], currentMissing: false };

                this.addOutput("value", "*");

                const self = this;
                // Name: 선택한 Filter에 속한 Set 이름만 보임
                const nameW = this.addWidget("combo", "Name", "", function (v) { self.syOnSelect(v); }, {
                    values: [],
                    getOptionLabel: (v) => self.syNameLabel(v),
                });
                liveValues(nameW, () => self.syComputeNames().values);

                // Filter: Set들에 적힌 Filter 값 중에서 고름 ("(all)" = 전부)
                const filterW = this.addWidget("combo", "Filter", S.ALL, function () { redraw(); }, {
                    values: [S.ALL],
                    getOptionLabel: (v) => self.syFilterLabel(v),
                });
                liveValues(filterW, () => self.syComputeFilters().values);
            }

            syComputeFilters() {
                this._syFilters = S.filterOptions(setsIn(this.graph).map(filterOf), filterOf(this));
                return this._syFilters;
            }

            syComputeNames() {
                const sets = setsIn(this.graph).map((s) => ({ name: nameOf(s), filter: filterOf(s) }));
                this._syNames = S.buildNameList(sets, nameOf(this), filterOf(this));
                return this._syNames;
            }

            syNameLabel(v) {
                if (v == null || v === "") return "";
                if (v === S.NO_MATCH) return T.noMatch;
                if (v === nameOf(this) && this._syNames.currentFiltered) return T.current(v);
                return v;
            }

            syFilterLabel(v) {
                if (v == null || v === "") return S.ALL;
                if (v === filterOf(this) && this._syFilters.currentMissing) return T.filterMissing(v);
                return v;
            }

            syOnSelect(v) {
                const w = widgetOf(this, "Name");
                if (v === S.NO_MATCH) {       // "이 필터에 Set 없음" 안내는 선택해도 무시
                    w.value = this._syLast;
                } else {
                    this._syLast = v;
                }
                this.sySyncType();
                redraw();
            }

            onConfigure() {
                this._syLast = nameOf(this);
                const fw = widgetOf(this, "Filter");
                if (fw && (fw.value == null || fw.value === "")) fw.value = S.ALL;
            }

            // ── 실행 때 연결 바꿔 끼우기 ──
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

            // 출력 타입을 Set 입력 타입에 맞춤
            sySyncType() {
                const set = findSet(this.graph, nameOf(this));
                const type = set?.inputs?.[0]?.type || "*";
                const out = this.outputs?.[0];
                if (out && out.type !== type) {
                    out.type = type;
                    out.label = type === "*" ? "value" : type;
                }
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
                if (name && !findSet(this.graph, name)) {   // 대상 Set이 없음
                    ctx.save();
                    ctx.font = "11px sans-serif";
                    ctx.textAlign = "left";
                    ctx.fillStyle = "#f87171";
                    ctx.fillText(T.noSet(name), 10, this.size[1] - 6);
                    ctx.restore();
                }
            }

            getExtraMenuOptions(canvas, options) {
                const set = findSet(this.graph, nameOf(this));
                options.unshift({ content: T.goSet, disabled: !set, callback: () => goTo(set) }, null);
            }
        }

        LG.registerNodeType(SET_TYPE, Object.assign(SYSet, { title: "SY Set", category: "SY" }));
        LG.registerNodeType(GET_TYPE, Object.assign(SYGet, { title: "SY Get", category: "SY" }));
        SYSet.category = "SY";
        SYGet.category = "SY";
    },
});
