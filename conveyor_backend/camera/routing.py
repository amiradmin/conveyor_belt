from django.urls import path
from .consumers import FrameProgressConsumer

websocket_urlpatterns = [
    path("ws/progress/", FrameProgressConsumer.as_asgi()),
]
