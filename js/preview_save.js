// 브라우저(화면) 쪽 역할:
//  1) 노드 제목줄 오른쪽 위에 [Save] 버튼을 그림
//  2) 버튼을 누르면 '다른 이름으로 저장' 창을 띄워서 원하는 폴더에 PNG 저장
//  3) 혹시 제목줄 버튼이 안 눌리는 버전을 대비해, 노드 우클릭 메뉴에도 같은 기능 추가

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "PreviewImageWithSave";

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
function getCurrentImageInfo(node) {
    const list = node.__saveImages;
    if (!list || list.length === 0) return null;
    let idx = typeof node.imageIndex === "number" ? node.imageIndex : 0;
    if (idx < 0 || idx >= list.length) idx = 0;
    return list[idx];
}

function makeSuggestedName() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `ComfyUI_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
}

async function fetchImageBlob(info) {
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
            handle = await window.showSaveFilePicker({
                suggestedName,
                types: [{ description: "PNG Image", accept: { "image/png": [".png"] } }],
            });
        } catch (err) {
            if (err && err.name === "AbortError") return; // 사용자가 '취소' 누름
            console.error("[PreviewImageWithSave]", err);
            alert("저장 창을 열 수 없습니다: " + err.message);
            return;
        }
        try {
            const blob = await fetchImageBlob(info);
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err) {
            console.error("[PreviewImageWithSave]", err);
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
        console.error("[PreviewImageWithSave]", err);
        alert("다운로드 중 오류가 났습니다: " + err.message);
    }
}

app.registerExtension({
    name: "custom.PreviewImageWithSave",

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
