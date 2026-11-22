# SY Prompt List — 여러 개의 (title, prompt) 세트를 한 노드에서 관리하고
# 그중 하나를 골라 "<title>  prompt" 문자열(t & p)로 출력합니다.
#
# 화면(목록, ⋮ 메뉴, Add/Edit 창, index, fixed/randomize)은 js/prompt_list.js가 그리고,
# 세트 목록은 "prompt_data"라는 하나의 JSON 문자열로 이 파이썬 코드에 전달됩니다.
#
# prompt_data 모양 예시:
# {
#   "items": [ {"title": "고양이", "prompt": "a cute cat"}, ... ],
# }
# index(0부터)와 mode(fixed/randomize)는 ComfyUI 기본 위젯으로 따로 들어옵니다.

import json
import random

DEFAULT_DATA = json.dumps({"items": [], "index": 0, "mode": "fixed"})


def parse_data(prompt_data):
    """JSON 문자열을 안전하게 읽어서 (items, index, mode)로 돌려줍니다."""
    try:
        data = json.loads(prompt_data) if isinstance(prompt_data, str) else dict(prompt_data or {})
    except Exception:
        data = {}

    items = []
    for it in data.get("items") or []:
        if isinstance(it, dict):
            items.append({
                "title": str(it.get("title", "")),
                "prompt": str(it.get("prompt", "")),
            })

    try:
        index = int(data.get("index", 0))
    except Exception:
        index = 0

    mode = data.get("mode", "fixed")
    if mode not in ("fixed", "randomize"):
        mode = "fixed"

    return items, index, mode


def first(v):
    """INPUT_IS_LIST 때문에 모든 입력이 리스트로 들어오므로 첫 값을 꺼냄"""
    if isinstance(v, list):
        return v[0] if v else None
    return v


def to_text_list(values):
    """다른 노드에서 받은 값을 글자 목록으로 바꿉니다. (빈 칸도 자리를 유지)
    - 여러 개가 리스트로 들어오면: 하나하나가 항목
    - 한 덩어리 글자인데 JSON 배열이면: 배열의 각 항목
    - 그 밖의 한 덩어리 글자: 통째로 항목 1개"""
    if values is None:
        return []
    if not isinstance(values, list):
        values = [values]

    flat = []
    for v in values:
        if isinstance(v, (list, tuple)):
            flat.extend(v)
        else:
            flat.append(v)

    if len(flat) == 1 and isinstance(flat[0], str):
        text = flat[0].strip()
        if text.startswith("["):
            try:
                arr = json.loads(text)
                if isinstance(arr, list):
                    flat = arr
            except Exception:
                pass

    out = []
    for v in flat:
        if v is None:
            v = ""
        elif isinstance(v, dict):  # {"prompt": "..."} 같은 모양도 허용
            v = v.get("prompt", v.get("text", v.get("title", "")))
        out.append(str(v))
    return out


def build_import(title_list, prompt_list):
    """title 목록과 prompt 목록을 같은 순서끼리 짝지어 세트 목록을 만듭니다.
    - prompt가 빈 세트는 버림
    - title이 없거나 비어 있으면 'Prompt N' (N = 최종 목록에서의 순서)"""
    titles = to_text_list(title_list)
    prompts = to_text_list(prompt_list)
    pairs = []
    for i, p in enumerate(prompts):
        if not p.strip():
            continue
        t = titles[i].strip() if i < len(titles) else ""
        pairs.append((t, p))
    return [{"title": t or f"Prompt {n + 1}", "prompt": p} for n, (t, p) in enumerate(pairs)]


def combine(title, prompt):
    """t & p 출력용: <title>  prompt"""
    return f"<{title}>  {prompt}"


def as_lists(items):
    """title_list / prompt_list 출력용.
    세트가 하나도 없으면 [""] (빈 목록을 내보내면 연결된 다음 노드가 오류를 낼 수 있어서)"""
    if not items:
        return [""], [""]
    return [it["title"] for it in items], [it["prompt"] for it in items]


def pick(items, index, mode, rng=random):
    """출력할 세트 번호를 고릅니다. 세트가 없으면 -1."""
    if not items:
        return -1
    if mode == "randomize":
        return rng.randrange(len(items))
    return max(0, min(index, len(items) - 1))


class SYPromptList:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # SY_PROMPT_LIST: js/prompt_list.js가 만드는 전용 화면(위젯)
                "prompt_data": ("SY_PROMPT_LIST", {"default": DEFAULT_DATA}),
                # ComfyUI 기본 위젯 모양(◀ index 0 ▶ / ◀ mode fixed ▶)을 그대로 사용
                "index": ("INT", {"default": 0, "min": 0, "max": 99999, "step": 1}),
                "mode": (["fixed", "randomize"], {"default": "fixed"}),
            },
            "optional": {
                # 다른 노드의 title / prompt 목록을 받아 목록을 통째로 바꿔 넣는 입력 (가져오기용)
                # "*" = 어떤 형식이든 연결 가능
                "title_list": ("*", {"forceInput": True}),
                "prompt_list": ("*", {"forceInput": True}),
            },
        }

    # 다른 노드가 목록으로 내보내도 한 번에 전부 받기 위해 필요
    INPUT_IS_LIST = True

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("t & p", "title_list", "prompt_list")
    # 뒤의 두 개는 "목록" 출력 (모든 세트의 title / prompt를 순서대로)
    OUTPUT_IS_LIST = (False, True, True)
    FUNCTION = "run"
    CATEGORY = "SY"

    @classmethod
    def IS_CHANGED(cls, prompt_data, index=None, mode=None, title_list=None, prompt_list=None):
        # randomize일 때는 매번 새로 뽑도록 "항상 바뀌었다"고 알려줌
        # (NaN은 자기 자신과도 같지 않아서 ComfyUI가 항상 다시 실행합니다)
        if first(mode) == "randomize":
            return float("nan")
        return f"{first(prompt_data)}|{first(index)}"

    def run(self, prompt_data, index=None, mode=None, title_list=None, prompt_list=None):
        prompt_data = first(prompt_data)

        # ── 가져오기: 연결된 입력에 prompt가 들어오면 목록을 통째로 교체하고 0번을 출력
        new_items = build_import(title_list, prompt_list)
        if new_items:
            first_item = new_items[0]
            tl, pl = as_lists(new_items)
            return {
                "ui": {"sy_import": new_items, "sy_index": [0]},
                "result": (combine(first_item["title"], first_item["prompt"]), tl, pl),
            }

        items, _, _ = parse_data(prompt_data)
        try:
            index = int(first(index) or 0)
        except Exception:
            index = 0
        mode = first(mode) if first(mode) in ("fixed", "randomize") else "fixed"
        i = pick(items, index, mode)
        if i < 0:
            return {"ui": {"sy_index": [-1]}, "result": ("", [""], [""])}
        it = items[i]
        # ui의 sy_index: 실제로 출력된 세트 번호를 화면에 알려줌 (randomize 결과 표시용)
        tl, pl = as_lists(items)
        return {"ui": {"sy_index": [i]}, "result": (combine(it["title"], it["prompt"]), tl, pl)}
