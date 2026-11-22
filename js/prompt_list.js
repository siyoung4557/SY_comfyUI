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
.sy-pl-root { display:flex; flex-direction:column; gap:6px; width:100%; height:100%;
  box-sizing:border-box; padding:4px 2px; font-family:sans-serif; font-size:12px;
  color:var(--input-text, #ddd); }
.sy-pl-list { flex:1 1 auto; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:6px; }
.sy-pl-empty { flex:1; white-space:pre-line; display:flex; align-items:center; justify-content:center; opacity:.55;
  border:1px dashed var(--border-color, #555); border-radius:6px; padding:12px; text-align:center; }
.sy-pl-item { flex:1 1 0; min-height:72px; display:flex; gap:6px; align-items:stretch; }
.sy-pl-radio { flex:0 0 auto; margin:8px 0 0 0; cursor:pointer; accent-color:#3b82f6; }
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
.sy-pl-add { flex:0 0 auto; padding:6px; cursor:pointer; border-radius:6px; color:inherit;
  background:var(--comfy-input-bg, #222); border:1px dashed var(--border-color, #555); }
.sy-pl-add:hover { border-color:#3b82f6; }
.sy-pl-row { flex:0 0 auto; display:flex; align-items:center; gap:6px; }
.sy-pl-label { width:44px; opacity:.75; }
.sy-pl-arrow { width:26px; height:24px; cursor:pointer; border-radius:4px; color:inherit;
  background:var(--comfy-input-bg, #222); border:1px solid var(--border-color, #444); }
.sy-pl-index { flex:1; min-width:0; height:24px; text-align:center; box-sizing:border-box; color:inherit;
  background:var(--comfy-input-bg, #222); border:1px solid var(--border-color, #444); border-radius:4px; }
.sy-pl-seg { flex:1; display:flex; border:1px solid var(--border-color, #444); border-radius:4px; overflow:hidden; }
.sy-pl-seg button { flex:1; height:24px; border:none; cursor:pointer; color:inherit; background:var(--comfy-input-bg, #222); }
.sy-pl-seg button.on { background:#3b82f6; color:#fff; }
.sy-pl-root button:disabled, .sy-pl-root input:disabled { opacity:.4; cursor:default; }

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
function openDialog({ title, small }) {
    const overlay = el("div", "sy-pl-overlay");
    const box = el("div", "sy-pl-dialog" + (small ? " small" : ""));
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
    const { box, close } = openDialog({ title: heading });
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

// ───────────────────────── 노드 안 화면 ─────────────────────────
let radioGroupSeq = 0;

function createPromptListWidget(node, inputName) {
    injectCSS();
    let state = L.emptyState();
    const group = "sy-pl-radio-" + (++radioGroupSeq);

    const root = el("div", "sy-pl-root");
    const list = el("div", "sy-pl-list");
    const addBtn = el("button", "sy-pl-add", "+ Add Prompt");

    const idxRow = el("div", "sy-pl-row");
    const prev = el("button", "sy-pl-arrow", "◀");
    const idxInput = el("input", "sy-pl-index");
    idxInput.type = "number";
    idxInput.min = "0";
    const next = el("button", "sy-pl-arrow", "▶");
    idxRow.append(el("span", "sy-pl-label", "index"), prev, idxInput, next);

    const modeRow = el("div", "sy-pl-row");
    const seg = el("div", "sy-pl-seg");
    const bFixed = el("button", "", "fixed");
    const bRandom = el("button", "", "randomize");
    seg.append(bFixed, bRandom);
    modeRow.append(el("span", "sy-pl-label", "mode"), seg);

    root.append(list, addBtn, idxRow, modeRow);
    keepWheelInside(root);
    // 노드 안의 키 입력(index 숫자 입력 등)이 ComfyUI 단축키로 넘어가지 않게
    root.addEventListener("keydown", (e) => e.stopPropagation());

    const changed = () => {
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

            const radio = el("input", "sy-pl-radio");
            radio.type = "radio";
            radio.name = group;
            radio.checked = i === state.index;
            radio.addEventListener("change", () => { L.select(state, i, true); changed(); });

            const card = el("div", "sy-pl-card");
            const head = el("div", "sy-pl-head");
            const title = el("div", "sy-pl-title", it.title);
            title.title = it.title; // 마우스를 올리면 전체 제목 표시
            const kebab = el("button", "sy-pl-kebab", "⋮");
            kebab.title = "Menu";
            kebab.addEventListener("click", (e) => {
                e.stopPropagation();
                const entries = [{ label: "Edit", action: () => openEditor({
                    heading: "Edit Prompt", title: it.title, prompt: it.prompt,
                    onSave: (t, p) => { L.editItem(state, i, t, p); changed(); },
                }) }];
                if (i > 0) entries.push({ label: "▲", action: () => { L.moveItem(state, i, -1); changed(); } });
                if (i < n - 1) entries.push({ label: "▼", action: () => { L.moveItem(state, i, +1); changed(); } });
                entries.push({ label: "Delete", danger: true, action: () => openConfirmDelete(() => { L.deleteItem(state, i); changed(); }) });
                showMenu(kebab, entries);
            });
            head.append(title, kebab);

            const body = el("div", "sy-pl-body", it.prompt);
            card.append(head, body);
            row.append(radio, card);
            list.appendChild(row);
        });

        idxInput.value = String(state.index);
        idxInput.max = String(Math.max(0, n - 1));
        idxInput.disabled = n === 0;
        prev.disabled = n === 0 || state.index <= 0;
        next.disabled = n === 0 || state.index >= n - 1;

        bFixed.classList.toggle("on", state.mode === "fixed");
        bRandom.classList.toggle("on", state.mode === "randomize");
    }

    addBtn.addEventListener("click", () => openEditor({
        heading: "Add Prompt", title: "", prompt: "",
        onSave: (t, p) => { L.addItem(state, t, p); changed(); },
    }));
    prev.addEventListener("click", () => { L.select(state, state.index - 1, true); changed(); });
    next.addEventListener("click", () => { L.select(state, state.index + 1, true); changed(); });
    idxInput.addEventListener("change", () => {
        L.select(state, Number.parseInt(idxInput.value, 10) || 0, true);
        changed();
    });
    bFixed.addEventListener("click", () => { state.mode = "fixed"; changed(); });
    bRandom.addEventListener("click", () => { state.mode = "randomize"; changed(); });

    const widget = node.addDOMWidget(inputName, WIDGET_TYPE, root, {
        getValue: () => JSON.stringify(state),
        setValue: (v) => { state = L.normalize(v); render(); },
        getMinHeight: () => 260,
        hideOnZoom: false,
    });

    // 가져오기: 다른 노드에서 받은 목록으로 통째로 교체하고 0번 선택
    widget.__syImport = (items) => {
        if (!Array.isArray(items) || items.length === 0) return;
        state = L.replaceAll(state, items);
        changed();
    };

    // randomize 결과(실제로 출력된 번호)를 화면에 반영
    widget.__syShowPicked = (i) => {
        if (typeof i !== "number" || i < 0 || i >= state.items.length) return;
        state.index = i;
        changed();
    };

    render();
    return widget;
}

// ───────────────────────── 등록 ─────────────────────────
app.registerExtension({
    name: "SY.PromptList",

    getCustomWidgets() {
        return {
            [WIDGET_TYPE](node, inputName) {
                return { widget: createPromptListWidget(node, inputName), minWidth: 320, minHeight: 300 };
            },
        };
    },

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        const origCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = origCreated?.apply(this, arguments);
            // 처음 만들 때 넉넉한 크기 (워크플로를 불러올 때는 저장된 크기가 우선)
            this.setSize([Math.max(this.size[0], 420), Math.max(this.size[1], 480)]);
            return r;
        };

        const origExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            origExecuted?.apply(this, arguments);
            const w = this.widgets?.find((x) => x.type === WIDGET_TYPE);
            if (message?.sy_import) w?.__syImport?.(message.sy_import);
            w?.__syShowPicked?.(message?.sy_index?.[0]);
        };

        const origRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            closeMenus();
            return origRemoved?.apply(this, arguments);
        };
    },
});
