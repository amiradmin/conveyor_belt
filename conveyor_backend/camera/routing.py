from django.urls import re_path
from .consumers import RealtimeConsumer, FrameProgressConsumer

websocket_urlpatterns = [
    # Real-time updates per camera
    re_path(r'ws/realtime/(?P<camera_id>\w+)/$', RealtimeConsumer.as_asgi()),
    # Default camera fallback
    re_path(r'ws/realtime/default/$', RealtimeConsumer.as_asgi()),
    # Frame progress (e.g., video processing)
    re_path(r'ws/progress/$', FrameProgressConsumer.as_asgi()),
]
