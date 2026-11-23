// 브라우저(화면) 쪽 역할:
//  1) 노드 제목줄 오른쪽 위에 [Save] 버튼을 그림
//  2) 버튼을 누르면 '다른 이름으로 저장' 창을 띄워서 원하는 폴더에 PNG 저장
//     (마지막으로 저장한 폴더를 기억해서 다음엔 그 폴더에서 창이 열림)
//  3) 혹시 제목줄 버튼이 안 눌리는 버전을 대비해, 노드 우클릭 메뉴에도 같은 기능 추가

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "SYPreviewImage";

// 버튼 모양 설정 (원하면 숫자만 바꿔서 조정하세요)
const BTN_W = 52;          // 버튼 너비
const BTN_MARGIN = 8;      // 오른쪽 여백
const BTN_LABEL = "Save";

function titleHeight() {
    return (window.LiteGraph && window.LiteGraph.NODE_TITLE_HEIGHT) || 30;
}

// 버튼 위치 계산 (노드 기준 좌표, 제목줄은 y가 음수 영역)
function getButtonRect(node) {
    const th = titleHeight();
    const h = th - 10;
    const x = node.size[0] - BTN_W - BTN_MARGIN;
    const y = -th + 5;
    return [x, y, BTN_W, h];
}

// 지금 노드에 표시 중인 이미지 정보 가져오기
// ComfyUI는 탭 전환·새로고침·다른 탭에서 생성 등의 경우 "실행 완료" 알림 없이
// 예전 결과를 다시 띄우기 때문에, 여러 곳을 순서대로 확인합니다.
//  1) ComfyUI가 보관 중인 이 노드의 최신 출력
//  2) 실행 완료 때 기억해 둔 목록
//  3) 노드에 붙어 있는 출력 목록
//  4) 화면에 실제로 그려진 이미지 주소
// 결과: { filename, subfolder, type } 또는 { url } 또는 null
function pickIndex(node, length) {
    let idx = typeof node.imageIndex === "number" ? node.imageIndex : 0;
    if (idx < 0 || idx >= length) idx = 0;
    return idx;
}

function getCurrentImageInfo(node) {
    const lists = [];
    try {
        const out = app.nodeOutputs?.[String(node.id)];
        if (out?.images?.length) lists.push(out.images);
    } catch { /* 이전 버전 ComfyUI */ }
    if (node.__saveImages?.length) lists.push(node.__saveImages);
    if (Array.isArray(node.images) && node.images.length) lists.push(node.images);

    for (const list of lists) {
        const it = list[pickIndex(node, list.length)];
        if (it && it.filename) return it;
    }

    const imgs = node.imgs;
    if (Array.isArray(imgs) && imgs.length) {
        const src = imgs[pickIndex(node, imgs.length)]?.src;
        if (src && !src.startsWith("data:,")) return { url: src };
    }
    return null;
}

function makeSuggestedName() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `ComfyUI_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
}

// ── 마지막 저장 위치 기억하기 ─────────────────────────────
// 브라우저 안의 작은 저장소(IndexedDB)에 "마지막으로 저장한 파일"을 기억해 두고,
// 다음 저장 창을 그 파일이 있던 폴더에서 열게 합니다.
// (ComfyUI를 껐다 켜도, 브라우저를 새로고침해도 유지됩니다)
const PICKER_ID = "sy-preview-image";   // 브라우저가 폴더를 기억할 때 쓰는 이름표
const DB_NAME = "sy-preview-image";
const STORE = "handles";
const KEY = "lastSavedFile";

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function loadLastHandle() {
    try {
        const db = await openDB();
        return await new Promise((resolve) => {
            const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function saveLastHandle(handle) {
    try {
        const db = await openDB();
        db.transaction(STORE, "readwrite").objectStore(STORE).put(handle, KEY);
    } catch (err) {
        console.warn("[SYPreviewImage] 마지막 위치 기억 실패", err);
    }
}

async function openSavePicker(suggestedName) {
    const base = {
        id: PICKER_ID,
        suggestedName,
        types: [{ description: "PNG Image", accept: { "image/png": [".png"] } }],
    };
    const last = await loadLastHandle();
    if (last) {
        try {
            // 마지막으로 저장한 파일이 있던 폴더에서 시작
            return await window.showSaveFilePicker({ ...base, startIn: last });
        } catch (err) {
            if (err && err.name === "AbortError") throw err; // 사용자가 취소
            // 그 폴더가 지워졌거나 이동된 경우 → 아래에서 기본 방식으로 다시 열기
        }
    }
    return await window.showSaveFilePicker(base);
}
// ─────────────────────────────────────────────────────────

async function fetchImageBlob(info) {
    if (info.url) {   // 화면에 그려진 이미지 주소에서 바로 가져오기
        const res = await fetch(info.url);
        if (!res.ok) throw new Error(`이미지를 불러오지 못했습니다 (HTTP ${res.status})`);
        return await res.blob();
    }
    const params = new URLSearchParams({
        filename: info.filename,
        subfolder: info.subfolder || "",
        type: info.type || "temp",
    });
    const res = await fetch(api.apiURL(`/view?${params.toString()}`));
    if (!res.ok) throw new Error(`이미지를 불러오지 못했습니다 (HTTP ${res.status})`);
    return await res.blob();
}

async function saveImageAs(node) {
    const info = getCurrentImageInfo(node);
    if (!info) {
        alert("저장할 이미지가 없습니다. 먼저 워크플로를 실행(Queue)해 주세요.");
        return;
    }

    const suggestedName = makeSuggestedName();

    // 방법 1: '다른 이름으로 저장' 창 (Chrome / Edge, localhost 접속일 때)
    if (window.showSaveFilePicker) {
        let handle;
        try {
            // 저장 창을 먼저 띄웁니다 (클릭 직후에 띄워야 브라우저가 허용함)
            handle = await openSavePicker(suggestedName);
        } catch (err) {
            if (err && err.name === "AbortError") return; // 사용자가 '취소' 누름
            console.error("[SYPreviewImage]", err);
            alert("저장 창을 열 수 없습니다: " + err.message);
            return;
        }
        try {
            const blob = await fetchImageBlob(info);
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            await saveLastHandle(handle); // 이번 저장 위치를 기억
        } catch (err) {
            console.error("[SYPreviewImage]", err);
            alert("저장 중 오류가 났습니다: " + err.message);
        }
        return;
    }

    // 방법 2: 저장 창을 지원하지 않는 브라우저 → 일반 다운로드
    try {
        const blob = await fetchImageBlob(info);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
        console.error("[SYPreviewImage]", err);
        alert("다운로드 중 오류가 났습니다: " + err.message);
    }
}

app.registerExtension({
    name: "SY.PreviewImage",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        // (1) 실행이 끝나면 이미지 목록을 기억해 둠
        const origOnExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            origOnExecuted?.apply(this, arguments);
            if (message && message.images) {
                this.__saveImages = message.images;
                this.setDirtyCanvas?.(true, true);
            }
        };

        // (2) 제목줄 오른쪽 위에 버튼 그리기
        const origDraw = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx) {
            origDraw?.apply(this, arguments);
            if (this.flags && this.flags.collapsed) return;

            const [x, y, w, h] = getButtonRect(this);
            const enabled = !!getCurrentImageInfo(this);

            ctx.save();
            ctx.fillStyle = enabled ? "#2f7d4f" : "#444";
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, w, h, 4);
            else ctx.rect(x, y, w, h);
            ctx.fill();

            ctx.fillStyle = enabled ? "#ffffff" : "#888";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(BTN_LABEL, x + w / 2, y + h / 2 + 1);
            ctx.restore();
        };

        // (3) 버튼 클릭 처리
        const origMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, pos) {
            if (!(this.flags && this.flags.collapsed) && pos) {
                const [x, y, w, h] = getButtonRect(this);
                const [px, py] = pos;
                if (px >= x && px <= x + w && py >= y && py <= y + h) {
                    saveImageAs(this);
                    return true; // 노드가 끌려가지 않도록 클릭을 여기서 끝냄
                }
            }
            return origMouseDown?.apply(this, arguments);
        };

        // (4) 예비 수단: 노드 우클릭 메뉴에 'Save image as...' 추가
        const origMenu = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (canvas, options) {
            const r = origMenu?.apply(this, arguments);
            options.unshift({
                content: "💾 Save image as...",
                disabled: !getCurrentImageInfo(this),
                callback: () => saveImageAs(this),
            });
            return r;
        };
    },
});
