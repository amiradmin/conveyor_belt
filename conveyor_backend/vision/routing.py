# vision/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/vision/progress/$', consumers.FrameProgressConsumer.as_asgi()),
]