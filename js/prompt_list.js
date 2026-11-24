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
.sy-pl-empty { flex:1; white-space:pre-line; display:flex; align-items:center; justify-content:center; color:#d1d5db;
  background:rgba(0,0,0,.45); border:1px dashed rgba(255,255,255,.3); border-radius:6px; padding:12px; text-align:center; }
.sy-pl-item { flex:0 0 auto; width:100%; box-sizing:border-box; display:flex; gap:6px; align-items:stretch; }
.sy-pl-side { flex:0 0 auto; align-self:flex-start; display:flex; flex-direction:column; align-items:center; gap:3px;
  padding:6px 0 7px; width:24px; border-radius:6px; background:rgba(0,0,0,.6); border:1px solid rgba(255,255,255,.12); }
.sy-pl-radio { margin:0; cursor:pointer; accent-color:#3b82f6; }
.sy-pl-num { font-size:10px; color:#d1d5db; font-variant-numeric:tabular-nums; }
.sy-pl-item.selected .sy-pl-num { color:#60a5fa; font-weight:bold; }
/* 랜덤 후보 체크 (randomize일 때만 결과에 영향, fixed에서도 똑같이 보이고 선택 가능) */
.sy-pl-pick { width:15px; height:15px; margin-top:3px; padding:0; box-sizing:border-box; cursor:pointer;
  border-radius:4px; border:1.5px solid rgba(255,255,255,.7); background:#151515;
  color:#fff; font-size:11px; line-height:12px; font-weight:bold; text-align:center; }
.sy-pl-pick:hover { border-color:#60a5fa; }
.sy-pl-pick.on { background:#3b82f6; border-color:#93c5fd; }
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
.sy-pl-addrow { flex:0 0 auto; display:flex; gap:6px; width:100%; }
.sy-pl-bulk { flex:0 0 auto; padding:6px 10px; cursor:pointer; border-radius:6px; color:#e5e7eb; font-size:12px;
  background:rgba(0,0,0,.65); border:1px solid rgba(255,255,255,.3); white-space:nowrap; }
.sy-pl-bulk:hover { border-color:#60a5fa; }
.sy-pl-bulk:disabled { color:rgba(229,231,235,.4); border-color:rgba(255,255,255,.12); cursor:default; }
.sy-pl-add { flex:1 1 auto; min-width:0; box-sizing:border-box; padding:6px; cursor:pointer; border-radius:6px; color:#e5e7eb;
  background:rgba(0,0,0,.65); border:1px dashed rgba(255,255,255,.35); }
.sy-pl-add:hover { border-color:#60a5fa; }

.sy-pl-menu { position:fixed; z-index:10001; min-width:120px; padding:4px; border-radius:6px;
  background:var(--comfy-menu-bg, #2b2b2b); border:1px solid var(--border-color, #555);
  box-shadow:0 6px 20px rgba(0,0,0,.4); font-family:sans-serif; font-size:13px; color:var(--fg-color, #ddd); }
.sy-pl-menu button { display:block; width:100%; text-align:left; padding:6px 10px; border:none; border-radius:4px;
  background:transparent; color:inherit; cursor:pointer; }
.sy-pl-menu button:hover { background:rgba(255,255,255,.1); }
.sy-pl-menu button.danger { color:#f87171; }

.sy-pl-overlay { position:fixed; inset:0; z-index:10004; background:rgba(0,0,0,.5);
  display:flex; align-items:center; justify-content:center; font-family:sans-serif; }
.sy-pl-dialog { width:min(560px, 92vw); max-height:88vh; display:flex; flex-direction:column; gap:10px;
  padding:16px; border-radius:10px; background:var(--comfy-menu-bg, #2b2b2b); color:var(--fg-color, #ddd);
  border:1px solid var(--border-color, #555); box-shadow:0 10px 40px rgba(0,0,0,.5); font-size:13px; }
.sy-pl-dialog.small { width:min(340px, 92vw); }
.sy-pl-dhead { display:flex; align-items:center; }
/* 떠 있는 창 (Add/Edit): 배경을 막지 않음, 제목줄을 끌어 이동, 항상 위 */
.sy-pl-dialog.floating { position:fixed; z-index:10003; margin:0; font-family:sans-serif; }
.sy-pl-dialog.floating .sy-pl-dhead { cursor:move; user-select:none; margin:-6px -6px 0; padding:6px 6px 0; }
.sy-pl-dialog.floating .sy-pl-dhead button { cursor:pointer; }
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
/* 수정 창 Prompt 안 검색 표시: 입력칸 뒤에 같은 글자를 겹쳐 그리고, 일치 부분만 파란색 */
.sy-pl-hlwrap { position:relative; display:flex; flex:1 1 220px; min-height:120px; }
.sy-pl-hlwrap textarea { position:relative; z-index:1; flex:1 1 auto; min-height:0; height:auto; margin:0;
  line-height:1.45; resize:none; }
.sy-pl-hl { display:none; position:absolute; inset:0; z-index:0; margin:0; box-sizing:border-box; pointer-events:none;
  padding:8px; border:1px solid transparent; border-radius:6px; overflow-y:scroll; overflow-x:hidden;
  white-space:pre-wrap; overflow-wrap:break-word; word-wrap:break-word; line-height:1.45;
  font-family:inherit; font-size:13px; color:var(--input-text, #ddd); background:var(--comfy-input-bg, #1e1e1e); }
.sy-pl-hl .sy-pl-hit { font-weight:inherit; color:#60a5fa; background:rgba(96,165,250,.22); border-radius:2px; }
.sy-pl-hlwrap.on .sy-pl-hl { display:block; }
.sy-pl-hlwrap.on textarea { color:transparent; caret-color:var(--input-text, #ddd); background:transparent; overflow-y:scroll; }
.sy-pl-dsearch { border:none; background:transparent; color:inherit; cursor:pointer; width:28px; height:26px;
  border-radius:6px; display:flex; align-items:center; justify-content:center; margin-right:4px; }
.sy-pl-dsearch:hover { background:rgba(255,255,255,.1); }
.sy-pl-dsearch.on { background:#3b82f6; color:#fff; }
.sy-pl-toast { position:fixed; left:50%; bottom:40px; transform:translateX(-50%); z-index:10003; padding:8px 16px;
  border-radius:8px; background:#111; color:#fff; border:1px solid #3b82f6; font:13px sans-serif;
  box-shadow:0 6px 20px rgba(0,0,0,.4); pointer-events:none; }
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

function showToast(text) {
    const t = el("div", "sy-pl-toast", text);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1500);
}

// 클립보드 복사 (localhost가 아니면 막힐 수 있어서 예비 방식도 사용)
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch { ok = false; }
        ta.remove();
        return ok;
    }
}

const SEARCH_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg>';

// 떠 있는 창: 배경(캔버스)을 막지 않고, 제목줄을 끌어 옮길 수 있음
function openFloating({ title }) {
    const box = el("div", "sy-pl-dialog resizable floating");
    const head = el("div", "sy-pl-dhead");
    head.appendChild(el("h3", "", title));
    const x = el("button", "sy-pl-x", "✕");
    head.appendChild(x);
    box.appendChild(head);
    document.body.appendChild(box);

    // 처음 위치: 화면 가운데
    const r = box.getBoundingClientRect();
    box.style.left = Math.max(8, Math.round((window.innerWidth - r.width) / 2)) + "px";
    box.style.top = Math.max(8, Math.round((window.innerHeight - r.height) / 2)) + "px";

    // 제목줄 끌어서 이동 (버튼 위에서는 이동하지 않음)
    head.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || e.target.closest("button")) return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const b = box.getBoundingClientRect();
        const move = (ev) => {
            const w = box.offsetWidth, h = box.offsetHeight;
            const nx = Math.min(Math.max(b.left + ev.clientX - startX, 40 - w), window.innerWidth - 40);
            const ny = Math.min(Math.max(b.top + ev.clientY - startY, 0), window.innerHeight - 30);
            box.style.left = nx + "px";
            box.style.top = ny + "px";
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    });

    const close = () => box.remove();
    x.addEventListener("click", close);
    // 창 안에서 누른 키는 ComfyUI 단축키로 넘어가지 않게 (창 밖은 평소대로)
    box.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") close();
    });
    box.addEventListener("keyup", (e) => e.stopPropagation());
    return { box, close };
}

// Add / Edit 창은 한 번에 하나만
let openEditorWin = null;

// Add / Edit 창: 처음 값에서 하나라도 바뀌면 Save 활성화
function openEditor({ heading, title, prompt, onSave }) {
    if (openEditorWin && document.body.contains(openEditorWin.box)) {
        if (openEditorWin.isDirty()) {
            // 고치던 내용이 있으면 그 창을 지키고 알려줌
            openEditorWin.box.animate?.([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 200 });
            showToast("Save or cancel the open window first.");
            return;
        }
        openEditorWin.close();   // 바뀐 게 없으면 새 창으로 바꿈
    }
    const { box, close: closeBox } = openFloating({ title: heading });
    const close = () => { closeBox(); if (openEditorWin?.box === box) openEditorWin = null; };
    box.querySelector(".sy-pl-x").addEventListener("click", close);
    const origTitle = title ?? "", origPrompt = prompt ?? "";

    box.appendChild(el("label", "", "Title"));
    const ti = el("input");
    ti.type = "text";
    ti.value = origTitle;
    ti.placeholder = "비워두면 자동으로 'Prompt N'";
    box.appendChild(ti);

    box.appendChild(el("label", "", "Prompt"));
    const wrap = el("div", "sy-pl-hlwrap");
    const hl = el("div", "sy-pl-hl");          // 뒤에 깔리는 표시용 글자
    const pa = el("textarea");
    pa.value = origPrompt;
    pa.spellcheck = false;
    wrap.append(hl, pa);
    box.appendChild(wrap);

    // Prompt 안 검색 (창을 닫으면 사라짐)
    let term = "";
    const head = box.querySelector(".sy-pl-dhead");
    const sbtn = el("button", "sy-pl-dsearch");
    sbtn.innerHTML = SEARCH_SVG;
    sbtn.title = "Search in prompt";
    head.insertBefore(sbtn, head.querySelector(".sy-pl-x"));
    const paintHL = () => {
        wrap.classList.toggle("on", term.length > 0);
        sbtn.classList.toggle("on", term.length > 0);
        if (!term) { hl.replaceChildren(); return; }
        fillHighlighted(hl, pa.value + "\n", term);   // 마지막 줄바꿈 높이까지 맞춤
        hl.scrollTop = pa.scrollTop;
    };
    pa.addEventListener("input", paintHL);
    pa.addEventListener("scroll", () => { hl.scrollTop = pa.scrollTop; });
    new ResizeObserver(() => { if (term) paintHL(); }).observe(pa);
    sbtn.addEventListener("click", () => openSearch(term, (t) => { term = t; paintHL(); pa.focus(); }));

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
    openEditorWin = { box, close, isDirty: () => !save.disabled };
    // 창 위치를 다시 가운데로 (내용이 다 들어간 뒤 크기 기준)
    const r = box.getBoundingClientRect();
    box.style.left = Math.max(8, Math.round((window.innerWidth - r.width) / 2)) + "px";
    box.style.top = Math.max(8, Math.round((window.innerHeight - r.height) / 2)) + "px";
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
    // + Add Prompt 옆: 랜덤 후보 전체 체크 / 전체 해제
    const checkAll = el("button", "sy-pl-bulk", "☑ All");
    checkAll.title = "Check all (random pool)";
    const uncheckAll = el("button", "sy-pl-bulk", "☐ None");
    uncheckAll.title = "Uncheck all (random pool)";
    const addRow = el("div", "sy-pl-addrow");
    addRow.append(addBtn, checkAll, uncheckAll);
    root.append(list, addRow);
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
        checkAll.disabled = n === 0 || state.items.every((x) => x.pick);
        uncheckAll.disabled = n === 0 || !state.items.some((x) => x.pick);

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
            const pick = el("button", "sy-pl-pick" + (it.pick ? " on" : ""), it.pick ? "✓" : "");
            pick.title = "Random pool (randomize only)";
            pick.addEventListener("click", (e) => { e.stopPropagation(); act(() => L.togglePick(state, i)); });
            side.append(radio, num, pick);

            const card = el("div", "sy-pl-card");
            const head = el("div", "sy-pl-head");
            const title = el("div", "sy-pl-title");
            fillHighlighted(title, it.title, searchTerm);
            title.title = it.title;
            const kebab = el("button", "sy-pl-kebab", "⋮");
            kebab.title = "Menu";
            kebab.addEventListener("click", (e) => {
                e.stopPropagation();
                const entries = [{ label: "Copy Prompt", action: async () => {
                    const ok = await copyText(it.prompt);
                    showToast(ok ? "Copied" : "Copy failed");
                } }, { label: "Edit", action: () => openEditor({
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
        layout();
    }

    // 내용 양에 맞춰 세트 높이 나누기 (짧은 세트는 필요한 만큼만, 남는 공간은 긴 세트들이 나눔)
    function layout() {
        const rows = [...list.querySelectorAll(".sy-pl-item")];
        if (rows.length === 0 || list.clientHeight === 0) return;
        // 1) 제한 없이 그렸을 때의 높이 재기
        rows.forEach((r) => { r.style.flex = "0 0 auto"; r.style.height = "auto"; });
        const natural = rows.map((r) => Math.ceil(r.offsetHeight));
        // 2) 쓸 수 있는 높이 = 목록 높이 - 세트 사이 간격
        const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
        const total = list.clientHeight - gap * (rows.length - 1);
        // 3) 나눠서 적용
        const heights = L.allocateHeights(natural, total, 72);
        rows.forEach((r, i) => { r.style.flex = `0 0 ${heights[i]}px`; r.style.height = heights[i] + "px"; });
    }

    // 노드 크기가 바뀌면 다시 나누기
    let rafId = 0, lastSize = "";
    const ro = new ResizeObserver(() => {
        const size = list.clientWidth + "x" + list.clientHeight;
        if (size === lastSize) return; // 크기가 그대로면 아무것도 안 함 (무한 반복 방지)
        lastSize = size;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(layout);
    });
    ro.observe(list);

    checkAll.addEventListener("click", () => act(() => L.setAllPicks(state, true)));
    uncheckAll.addEventListener("click", () => act(() => L.setAllPicks(state, false)));

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
        // 예전 버전으로 저장된 노드의 출력 단자 정리
        // (출력 구성이 바뀐 뒤 옛 워크플로를 열면 단자가 중복되거나 남는 경우가 있음)
        // 지금 정의에 없는 이름 / 같은 이름이 두 번째로 나온 단자 중, 연결선이 없는 것만 지움
        const expectedOutputs = nodeData.output_name || nodeData.output || [];
        const cleanOutputs = (node) => {
            if (!node.outputs || !expectedOutputs.length) return;
            for (let i = node.outputs.length - 1; i >= 0; i--) {
                const o = node.outputs[i];
                const firstIdx = node.outputs.findIndex((x) => x.name === o.name);
                const unknown = !expectedOutputs.includes(o.name);
                const duplicate = firstIdx !== i;
                const linked = Array.isArray(o.links) && o.links.length > 0;
                if ((unknown || duplicate) && !linked) node.removeOutput(i);
            }
        };

        const origConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            const r = origConfigure?.apply(this, arguments);
            try { cleanOutputs(this); } catch (e) { console.warn("[SYPromptList] output cleanup", e); }
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
