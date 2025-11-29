from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/progress/$', consumers.FrameProgressConsumer.as_asgi()),
    re_path(r'ws/realtime/(?P<camera_id>\w+)/$', consumers.RealTimeConsumer.as_asgi()),
]