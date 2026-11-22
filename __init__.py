# ComfyUI가 이 폴더를 읽을 때 가장 먼저 실행하는 파일입니다.
# "어떤 노드가 있는지"와 "화면(JS) 파일이 어디 있는지"를 ComfyUI에 알려줍니다.

from .preview_save_node import SYPreviewImage

# 내부 이름(키) -> 파이썬 클래스
NODE_CLASS_MAPPINGS = {
    "SYPreviewImage": SYPreviewImage,
}

# 화면에 보이는 노드 이름
NODE_DISPLAY_NAME_MAPPINGS = {
    "SYPreviewImage": "SY Preview Image",
}

# 이 폴더 안의 js 폴더를 웹 화면에 자동으로 불러오게 합니다.
WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
