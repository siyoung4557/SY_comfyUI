# 서버(파이썬) 쪽 역할:
#  1) 들어온 이미지를 ComfyUI의 temp 폴더에 임시 저장 (기본 Preview Image와 같은 방식)
#  2) 노드 화면에 미리보기를 띄우도록 정보 전달
#  3) 받은 이미지를 그대로 오른쪽 'images' 출력으로 넘겨줌
# 실제 "다른 이름으로 저장" 창은 브라우저(js/preview_save.js)가 담당합니다.

import os
import json
import random

import numpy as np
from PIL import Image
from PIL.PngImagePlugin import PngInfo

import folder_paths


class SYPreviewImage:
    def __init__(self):
        self.output_dir = folder_paths.get_temp_directory()
        self.type = "temp"
        self.prefix = "_preview_save_" + "".join(
            random.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(5)
        )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
            },
            # 워크플로 정보를 PNG 안에 넣기 위한 숨은 입력
            # (저장한 PNG를 ComfyUI에 끌어다 놓으면 워크플로가 복원됩니다)
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "run"
    OUTPUT_NODE = True
    CATEGORY = "SY"

    def run(self, images, prompt=None, extra_pnginfo=None):
        full_output_folder, filename, counter, subfolder, _ = folder_paths.get_save_image_path(
            self.prefix, self.output_dir, images[0].shape[1], images[0].shape[0]
        )

        results = []
        for image in images:
            arr = 255.0 * image.cpu().numpy()
            img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

            metadata = PngInfo()
            if prompt is not None:
                metadata.add_text("prompt", json.dumps(prompt))
            if extra_pnginfo is not None:
                for key, value in extra_pnginfo.items():
                    metadata.add_text(key, json.dumps(value))

            file = f"{filename}_{counter:05}_.png"
            img.save(os.path.join(full_output_folder, file), pnginfo=metadata, compress_level=1)
            results.append({"filename": file, "subfolder": subfolder, "type": self.type})
            counter += 1

        return {"ui": {"images": results}, "result": (images,)}
