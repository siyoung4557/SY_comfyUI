// SY Prompt List — 화면(브라우저) 쪽
//  - 세트 목록 (라디오 / title 한 줄 / prompt 스크롤 / ⋮ 메뉴)
//  - ⋮ 메뉴: Edit / ▲ / ▼ / Delete
//  - + Add Prompt, index(◀ ▶), mode(fixed / randomize)
// 규칙(추가·삭제·이동·선택)은 prompt_list_logic.js에 있습니다.

import { app } from "../../scripts/app.js";
import * as L from "./prompt_list_logic.js";

const NODE_NAME = "SYPromptList";
const WIDGET_TYPE = "SY_PROMPT_LIST";

// ───────────────────────── 스타일 ─────────────────────────
const CSS = `
.sy-pl-root { display:flex; flex-direction:column; gap:6px; width:100%; max-width:none; height:100%;
  flex:1 1 auto; align-self:stretch;
  box-sizing:border-box; padding:4px 2px; font-family:sans-serif; font-size:12px;
  color:var(--input-text, #ddd); }
.sy-pl-list { flex:1 1 auto; min-height:0; width:100%; overflow-y:auto; display:flex; flex-direction:column; gap:6px; }
.sy-pl-empty { flex:1; white-space:pre-line; display:flex; align-items:center; justify-content:center; opacity:.55;
  border:1px dashed var(--border-color, #555); border-radius:6px; padding:12px; text-align:center; }
.sy-pl-item { flex:1 1 0; min-height:72px; width:100%; box-sizing:border-box; display:flex; gap:6px; align-items:stretch; }
.sy-pl-side { flex:0 0 auto; display:flex; flex-direction:column; align-items:center; gap:2px; padding-top:6px; width:22px; }
.sy-pl-radio { margin:0; cursor:pointer; accent-color:#3b82f6; }
.sy-pl-num { font-size:10px; opacity:.7; font-variant-numeric:tabular-nums; }
.sy-pl-item.selected .sy-pl-num { color:#3b82f6; opacity:1; font-weight:bold; }
.sy-pl-card { flex:1; min-width:0; display:flex; flex-direction:column;
  background:var(--comfy-input-bg, #222); border:1px solid var(--border-color, #444); border-radius:6px; }
.sy-pl-item.selected .sy-pl-card { border-color:#3b82f6; box-shadow:0 0 0 1px #3b82f6 inset; }
.sy-pl-head { display:flex; align-items:center; gap:4px; padding:4px 4px 4px 8px;
  border-bottom:1px solid var(--border-color, #444); }
.sy-pl-title { flex:1; min-width:0; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sy-pl-kebab { flex:0 0 auto; width:22px; height:22px; border:none; background:transparent; color:inherit;
  cursor:pointer; border-radius:4px; font-size:16px; line-height:1; }
.sy-pl-kebab:hover { background:rgba(255,255,255,.1); }
.sy-pl-body { flex:1; min-height:0; overflow-y:auto; padding:6px 8px; white-space:pre-wrap; word-break:break-word; opacity:.9; }
.sy-pl-add { flex:0 0 auto; width:100%; box-sizing:border-box; padding:6px; cursor:pointer; border-radius:6px; color:inherit;
  background:var(--comfy-input-bg, #222); border:1px dashed var(--border-color, #555); }
.sy-pl-add:hover { border-color:#3b82f6; }

.sy-pl-menu { position:fixed; z-index:10001; min-width:120px; padding:4px; border-radius:6px;
  background:var(--comfy-menu-bg, #2b2b2b); border:1px solid var(--border-color, #555);
  box-shadow:0 6px 20px rgba(0,0,0,.4); font-family:sans-serif; font-size:13px; color:var(--fg-color, #ddd); }
.sy-pl-menu button { display:block; width:100%; text-align:left; padding:6px 10px; border:none; border-radius:4px;
  background:transparent; color:inherit; cursor:pointer; }
.sy-pl-menu button:hover { background:rgba(255,255,255,.1); }
.sy-pl-menu button.danger { color:#f87171; }

.sy-pl-overlay { position:fixed; inset:0; z-index:10002; background:rgba(0,0,0,.5);
  display:flex; align-items:center; justify-content:center; font-family:sans-serif; }
.sy-pl-dialog { width:min(560px, 92vw); max-height:88vh; display:flex; flex-direction:column; gap:10px;
  padding:16px; border-radius:10px; background:var(--comfy-menu-bg, #2b2b2b); color:var(--fg-color, #ddd);
  border:1px solid var(--border-color, #555); box-shadow:0 10px 40px rgba(0,0,0,.5); font-size:13px; }
.sy-pl-dialog.small { width:min(340px, 92vw); }
.sy-pl-dhead { display:flex; align-items:center; }
.sy-pl-dhead h3 { flex:1; margin:0; font-size:15px; }
.sy-pl-x { border:none; background:transparent; color:inherit; font-size:18px; cursor:pointer; }
.sy-pl-dialog label { opacity:.75; font-size:12px; }
.sy-pl-dialog input, .sy-pl-dialog textarea { width:100%; box-sizing:border-box; padding:8px; border-radius:6px;
  color:var(--input-text, #ddd); background:var(--comfy-input-bg, #1e1e1e); border:1px solid var(--border-color, #555);
  font-family:inherit; font-size:13px; }
.sy-pl-dialog textarea { min-height:220px; resize:vertical; }
/* 편집 창: 오른쪽 아래 모서리를 끌어 크기 조절, Prompt 칸이 남는 공간을 채움 */
.sy-pl-dialog.resizable { resize:both; overflow:hidden; min-width:320px; min-height:300px;
  max-width:96vw; max-height:96vh; }
.sy-pl-dialog.resizable textarea { flex:1 1 220px; min-height:120px; resize:none; }
.sy-pl-hit { color:#60a5fa; font-weight:bold; }
.sy-pl-search-row { display:flex; gap:8px; }
.sy-pl-foot { display:flex; justify-content:flex-end; gap:8px; }
.sy-pl-btn { padding:7px 16px; border-radius:6px; cursor:pointer; color:inherit;
  border:1px solid var(--border-color, #555); background:transparent; }
.sy-pl-btn.primary { background:#3b82f6; border-color:#3b82f6; color:#fff; }
.sy-pl-btn.danger { background:#dc2626; border-color:#dc2626; color:#fff; }
.sy-pl-btn:disabled { opacity:.4; cursor:default; }
`;

function injectCSS() {
    if (document.getElementById("sy-prompt-list-css")) return;
    const style = document.createElement("style");
    style.id = "sy-prompt-list-css";
    style.textContent = CSS;
    document.head.appendChild(style);
}

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}

// 스크롤 가능한 영역 안에서는 마우스 휠이 캔버스 확대/축소로 넘어가지 않게 함
function keepWheelInside(root) {
    root.addEventListener("wheel", (e) => {
        let t = e.target;
        while (t && t !== root.parentElement) {
            if (t.scrollHeight > t.clientHeight + 1) {
                const canDown = e.deltaY > 0 && t.scrollTop + t.clientHeight < t.scrollHeight - 1;
                const canUp = e.deltaY < 0 && t.scrollTop > 0;
                if (canDown || canUp) { e.stopPropagation(); return; }
            }
            t = t.parentElement;
        }
    }, { passive: true });
}

// ───────────────────────── 팝업들 ─────────────────────────
function closeMenus() {
    document.querySelectorAll(".sy-pl-menu").forEach((m) => m.remove());
}

function showMenu(anchor, entries) {
    closeMenus();
    const menu = el("div", "sy-pl-menu");
    for (const en of entries) {
        const b = el("button", en.danger ? "danger" : "", en.label);
        b.addEventListener("click", (e) => { e.stopPropagation(); closeMenus(); en.action(); });
        menu.appendChild(b);
    }
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = r.right - mw, top = r.bottom + 4;
    if (top + mh > window.innerHeight - 8) top = r.top - mh - 4;
    menu.style.left = Math.max(8, left) + "px";
    menu.style.top = Math.max(8, top) + "px";
    setTimeout(() => {
        const off = (e) => {
            if (!menu.contains(e.target)) { closeMenus(); document.removeEventListener("pointerdown", off, true); }
        };
        document.addEventListener("pointerdown", off, true);
    }, 0);
}

// 공통 창 틀. 바깥 클릭으로는 닫히지 않음 (X / Cancel / Esc로만 닫힘)
function openDialog({ title, small, resizable }) {
    const overlay = el("div", "sy-pl-overlay");
    const box = el("div", "sy-pl-dialog" + (small ? " small" : "") + (resizable ? " resizable" : ""));
    const head = el("div", "sy-pl-dhead");
    head.appendChild(el("h3", "", title));
    const x = el("button", "sy-pl-x", "✕");
    head.appendChild(x);
    box.appendChild(head);
    overlay.appendChild(box);

    const close = () => overlay.remove();
    x.addEventListener("click", close);
    // 입력 중 키가 ComfyUI 단축키(Delete=노드 삭제 등)로 넘어가지 않게 막음
    overlay.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") close();
    });
    overlay.addEventListener("keyup", (e) => e.stopPropagation());
    document.body.appendChild(overlay);
    return { box, close };
}

// Add / Edit 창: 처음 값에서 하나라도 바뀌면 Save 활성화
function openEditor({ heading, title, prompt, onSave }) {
    const { box, close } = openDialog({ title: heading, resizable: true });
    const origTitle = title ?? "", origPrompt = prompt ?? "";

    box.appendChild(el("label", "", "Title"));
    const ti = el("input");
    ti.type = "text";
    ti.value = origTitle;
    ti.placeholder = "비워두면 자동으로 'Prompt N'";
    box.appendChild(ti);

    box.appendChild(el("label", "", "Prompt"));
    const pa = el("textarea");
    pa.value = origPrompt;
    box.appendChild(pa);

    const foot = el("div", "sy-pl-foot");
    const cancel = el("button", "sy-pl-btn", "Cancel");
    const save = el("button", "sy-pl-btn primary", "Save");
    foot.append(cancel, save);
    box.appendChild(foot);

    const refresh = () => { save.disabled = ti.value === origTitle && pa.value === origPrompt; };
    ti.addEventListener("input", refresh);
    pa.addEventListener("input", refresh);
    refresh();

    cancel.addEventListener("click", close);
    save.addEventListener("click", () => {
        if (save.disabled) return;
        onSave(ti.value, pa.value);
        close();
    });
    setTimeout(() => (origTitle ? pa : ti).focus(), 0);
}

function openConfirmDelete(onDelete) {
    const { box, close } = openDialog({ title: "Delete", small: true });
    box.appendChild(el("div", "", "Delete this prompt?"));
    const foot = el("div", "sy-pl-foot");
    const cancel = el("button", "sy-pl-btn", "Cancel");
    const del = el("button", "sy-pl-btn danger", "Delete");
    foot.append(cancel, del);
    box.appendChild(foot);
    cancel.addEventListener("click", close);
    del.addEventListener("click", () => { onDelete(); close(); });
    setTimeout(() => cancel.focus(), 0);
}

// 검색 창: Search(또는 Enter) → 검색어 적용, Clear → 검색 해제
function openSearch(current, onApply) {
    const { box, close } = openDialog({ title: "Search", small: true });
    const input = el("input");
    input.type = "text";
    input.value = current || "";
    input.placeholder = "검색어 (대소문자 구분 안 함)";
    box.appendChild(input);
    const foot = el("div", "sy-pl-foot");
    const clear = el("button", "sy-pl-btn", "Clear");
    const go = el("button", "sy-pl-btn primary", "Search");
    foot.append(clear, go);
    box.appendChild(foot);
    const apply = (term) => { onApply(term.trim()); close(); };
    go.addEventListener("click", () => apply(input.value));
    clear.addEventListener("click", () => apply(""));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") apply(input.value); });
    setTimeout(() => { input.focus(); input.select(); }, 0);
}

// 글자 안에서 검색어와 같은 부분을 파란색으로 (대소문자 구분 안 함)
function fillHighlighted(target, text, term) {
    target.replaceChildren();
    if (!term) { target.textContent = text; return; }
    const lower = text.toLowerCase(), t = term.toLowerCase();
    let pos = 0;
    while (true) {
        const hit = lower.indexOf(t, pos);
        if (hit < 0) break;
        if (hit > pos) target.appendChild(document.createTextNode(text.slice(pos, hit)));
        target.appendChild(el("span", "sy-pl-hit", text.slice(hit, hit + t.length)));
        pos = hit + t.length;
    }
    if (pos < text.length) target.appendChild(document.createTextNode(text.slice(pos)));
}

// ───────────────────────── 노드 안 화면 ─────────────────────────
let radioGroupSeq = 0;

function createPromptListWidget(node, inputName) {
    injectCSS();
    let state = L.emptyState();
    let searchTerm = ""; // 임시 (워크플로에 저장되지 않음)
    const group = "sy-pl-radio-" + (++radioGroupSeq);

    const root = el("div", "sy-pl-root");
    const list = el("div", "sy-pl-list");
    const addBtn = el("button", "sy-pl-add", "+ Add Prompt");
    root.append(list, addBtn);
    keepWheelInside(root);
    root.addEventListener("keydown", (e) => e.stopPropagation());

    // index / mode는 ComfyUI 기본 위젯 (파이썬 INPUT_TYPES에서 만들어짐)
    const idxW = () => node.widgets?.find((w) => w.name === "index");
    const modeW = () => node.widgets?.find((w) => w.name === "mode");

    // 위젯 값 → state
    function pull() {
        const iw = idxW(), mw = modeW();
        if (iw) state.index = Number(iw.value) || 0;
        if (mw) state.mode = mw.value === "randomize" ? "randomize" : "fixed";
        L.clampIndex(state);
    }
    // state → 위젯 값
    function push() {
        const iw = idxW(), mw = modeW();
        if (iw) {
            iw.value = state.index;
            if (iw.options) iw.options.max = Math.max(0, state.items.length - 1);
        }
        if (mw) mw.value = state.mode;
    }

    // 목록을 바꾸는 모든 동작은 이 함수를 거침
    const act = (fn) => {
        pull();
        fn();
        L.clampIndex(state);
        push();
        render();
        node.setDirtyCanvas?.(true, true);
        app.graph?.setDirtyCanvas?.(true, true);
    };

    function render() {
        list.replaceChildren();
        const n = state.items.length;

        if (n === 0) {
            list.appendChild(el("div", "sy-pl-empty", "아직 프롬프트가 없습니다.\n아래 + Add Prompt를 눌러 추가하세요."));
        }

        state.items.forEach((it, i) => {
            const row = el("div", "sy-pl-item" + (i === state.index ? " selected" : ""));

            // 라디오 + 그 아래 번호(00, 01, …)
            const side = el("div", "sy-pl-side");
            const radio = el("input", "sy-pl-radio");
            radio.type = "radio";
            radio.name = group;
            radio.checked = i === state.index;
            radio.addEventListener("change", () => act(() => L.select(state, i, true)));
            const num = el("div", "sy-pl-num", String(i).padStart(2, "0"));
            side.append(radio, num);

            const card = el("div", "sy-pl-card");
            const head = el("div", "sy-pl-head");
            const title = el("div", "sy-pl-title");
            fillHighlighted(title, it.title, searchTerm);
            title.title = it.title;
            const kebab = el("button", "sy-pl-kebab", "⋮");
            kebab.title = "Menu";
            kebab.addEventListener("click", (e) => {
                e.stopPropagation();
                const entries = [{ label: "Edit", action: () => openEditor({
                    heading: "Edit Prompt", title: it.title, prompt: it.prompt,
                    onSave: (t, p) => act(() => L.editItem(state, i, t, p)),
                }) }];
                if (i > 0) entries.push({ label: "▲", action: () => act(() => L.moveItem(state, i, -1)) });
                if (i < n - 1) entries.push({ label: "▼", action: () => act(() => L.moveItem(state, i, +1)) });
                entries.push({ label: "Delete", danger: true,
                    action: () => openConfirmDelete(() => act(() => L.deleteItem(state, i))) });
                showMenu(kebab, entries);
            });
            head.append(title, kebab);

            const body = el("div", "sy-pl-body");
            fillHighlighted(body, it.prompt, searchTerm);
            card.append(head, body);
            row.append(side, card);
            list.appendChild(row);
        });
    }

    addBtn.addEventListener("click", () => openEditor({
        heading: "Add Prompt", title: "", prompt: "",
        onSave: (t, p) => act(() => L.addItem(state, t, p)),
    }));

    const widget = node.addDOMWidget(inputName, WIDGET_TYPE, root, {
        // 세트 목록만 저장 (index/mode는 기본 위젯이 저장)
        getValue: () => JSON.stringify({ items: state.items }),
        setValue: (v) => {
            state.items = L.normalize(v).items;
            pull();
            render();
        },
        getMinHeight: () => 220,
        hideOnZoom: false,
    });

    // index / mode 기본 위젯을 사용자가 바꿨을 때
    widget.__syOnIndexChanged = () => act(() => {
        if (state.mode === "randomize") state.mode = "fixed"; // 직접 골랐으면 fixed로
    });
    widget.__syOnModeChanged = () => act(() => {});
    widget.__syRefresh = () => { pull(); push(); render(); };

    // 검색
    widget.__syIsSearching = () => searchTerm.length > 0;
    widget.__syOpenSearch = () => openSearch(searchTerm, (term) => {
        searchTerm = term;
        render();
        node.setDirtyCanvas?.(true, true); // 돋보기 색 갱신
        app.graph?.setDirtyCanvas?.(true, true);
    });

    // 가져오기: 다른 노드에서 받은 목록으로 통째로 교체하고 0번 선택
    widget.__syImport = (items) => {
        if (!Array.isArray(items) || items.length === 0) return;
        act(() => {
            const r = L.replaceAll(state, items);
            state.items = r.items;
            state.index = 0;
        });
    };

    // 실제로 출력된 번호(randomize 결과)를 화면에 반영 — mode는 바꾸지 않음
    widget.__syShowPicked = (i) => {
        if (typeof i !== "number" || i < 0 || i >= state.items.length) return;
        act(() => { state.index = i; });
    };

    // 노드 가로 크기를 직접 따라가게 함 (ComfyUI 버전에 따라 자동으로 안 늘어나는 경우 대비)
    let lastW = -1;
    widget.__sySyncWidth = () => {
        const margin = typeof widget.margin === "number" ? widget.margin : 10;
        const w = Math.max(120, Math.round(node.size[0] - margin * 2));
        if (w === lastW) return;
        lastW = w;
        root.style.width = w + "px";
    };

    render();
    widget.__sySyncWidth();
    return widget;
}

// ───────────────────────── 제목줄 돋보기 버튼 ─────────────────────────
const BTN_SIZE = 22, BTN_MARGIN = 8;
function titleHeight() {
    return (window.LiteGraph && window.LiteGraph.NODE_TITLE_HEIGHT) || 30;
}
function searchBtnRect(node) {
    const th = titleHeight();
    return [node.size[0] - BTN_SIZE - BTN_MARGIN, -th + (th - BTN_SIZE) / 2, BTN_SIZE, BTN_SIZE];
}
function drawSearchBtn(ctx, node, active) {
    const [x, y, w, h] = searchBtnRect(node);
    ctx.save();
    ctx.fillStyle = active ? "#3b82f6" : "rgba(255,255,255,0.08)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 4); else ctx.rect(x, y, w, h);
    ctx.fill();
    // 돋보기: 동그라미 + 손잡이
    ctx.strokeStyle = active ? "#fff" : "#ccc";
    ctx.lineWidth = 1.8;
    const cx = x + w * 0.44, cy = y + h * 0.44, r = w * 0.22;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.72, cy + r * 0.72);
    ctx.lineTo(x + w * 0.78, y + h * 0.78);
    ctx.stroke();
    ctx.restore();
}

// ───────────────────────── 등록 ─────────────────────────
app.registerExtension({
    name: "SY.PromptList",

    getCustomWidgets() {
        return {
            [WIDGET_TYPE](node, inputName) {
                return { widget: createPromptListWidget(node, inputName) };
            },
        };
    },

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        const origCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = origCreated?.apply(this, arguments);
            // 처음 만들 때 넉넉한 크기 (워크플로를 불러올 때는 저장된 크기가 우선)
            this.setSize([Math.max(this.size[0], 420), Math.max(this.size[1], 520)]);

            const main = this.widgets?.find((x) => x.type === WIDGET_TYPE);
            const hook = (name, fn) => {
                const w = this.widgets?.find((x) => x.name === name);
                if (!w) return;
                const orig = w.callback;
                w.callback = function () {
                    const res = orig?.apply(this, arguments);
                    fn();
                    return res;
                };
            };
            hook("index", () => main?.__syOnIndexChanged?.());
            hook("mode", () => main?.__syOnModeChanged?.());
            main?.__syRefresh?.();
            main?.__sySyncWidth?.();
            return r;
        };

        const origExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            origExecuted?.apply(this, arguments);
            const w = this.widgets?.find((x) => x.type === WIDGET_TYPE);
            if (message?.sy_import) w?.__syImport?.(message.sy_import);
            w?.__syShowPicked?.(message?.sy_index?.[0]);
        };

        // 노드 크기가 바뀌면 안쪽 화면 너비도 맞춤
        const mainOf = (n) => n.widgets?.find((x) => x.type === WIDGET_TYPE);
        const origResize = nodeType.prototype.onResize;
        nodeType.prototype.onResize = function () {
            const r = origResize?.apply(this, arguments);
            mainOf(this)?.__sySyncWidth?.();
            return r;
        };
        const origFg = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx) {
            const r = origFg?.apply(this, arguments);
            const m = mainOf(this);
            m?.__sySyncWidth?.(); // 바뀐 게 없으면 아무것도 안 함
            if (ctx && !(this.flags && this.flags.collapsed)) {
                drawSearchBtn(ctx, this, !!m?.__syIsSearching?.());
            }
            return r;
        };

        // 돋보기 클릭
        const origDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, pos) {
            if (!(this.flags && this.flags.collapsed) && pos) {
                const [x, y, w, h] = searchBtnRect(this);
                if (pos[0] >= x && pos[0] <= x + w && pos[1] >= y && pos[1] <= y + h) {
                    mainOf(this)?.__syOpenSearch?.();
                    return true;
                }
            }
            return origDown?.apply(this, arguments);
        };

        // 예비 수단: 우클릭 메뉴
        const origMenu = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (canvas, options) {
            const r = origMenu?.apply(this, arguments);
            options.unshift({ content: "🔍 Search...", callback: () => mainOf(this)?.__syOpenSearch?.() });
            return r;
        };

        // 워크플로를 불러온 뒤 화면을 위젯 값에 맞춤
        const origConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            const r = origConfigure?.apply(this, arguments);
            const m = this.widgets?.find((x) => x.type === WIDGET_TYPE);
            m?.__syRefresh?.();
            m?.__sySyncWidth?.();
            return r;
        };

        const origRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            closeMenus();
            return origRemoved?.apply(this, arguments);
        };
    },
});
