"""
ASGI config for conveyor_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from channels.auth import AuthMiddlewareStack
from camera.consumers import FrameProgressConsumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'conveyor_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/progress/", FrameProgressConsumer.as_asgi()),
        ])
    ),
})

