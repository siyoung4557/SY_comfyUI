# SY Prompt List — 여러 개의 (title, prompt) 세트를 한 노드에서 관리하고
# 그중 하나를 골라 title / prompt 문자열로 출력합니다.
#
# 화면(목록, ⋮ 메뉴, Add/Edit 창, index, fixed/randomize)은 js/prompt_list.js가 그리고,
# 화면에서 만든 데이터는 "prompt_data"라는 하나의 JSON 문자열로 이 파이썬 코드에 전달됩니다.
#
# prompt_data 모양 예시:
# {
#   "items": [ {"title": "고양이", "prompt": "a cute cat"}, ... ],
#   "index": 0,            # 0부터 시작
#   "mode": "fixed"        # "fixed" 또는 "randomize"
# }

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
            },
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("title", "prompt")
    FUNCTION = "run"
    CATEGORY = "SY"

    @classmethod
    def IS_CHANGED(cls, prompt_data):
        # randomize일 때는 매번 새로 뽑도록 "항상 바뀌었다"고 알려줌
        # (NaN은 자기 자신과도 같지 않아서 ComfyUI가 항상 다시 실행합니다)
        _, _, mode = parse_data(prompt_data)
        if mode == "randomize":
            return float("nan")
        return prompt_data

    def run(self, prompt_data):
        items, index, mode = parse_data(prompt_data)
        i = pick(items, index, mode)
        if i < 0:
            return {"ui": {"sy_index": [-1]}, "result": ("", "")}
        it = items[i]
        # ui의 sy_index: 실제로 출력된 세트 번호를 화면에 알려줌 (randomize 결과 표시용)
        return {"ui": {"sy_index": [i]}, "result": (it["title"], it["prompt"])}
