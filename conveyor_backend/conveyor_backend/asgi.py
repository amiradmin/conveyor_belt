"""
ASGI config for conveyor_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

# conveyor_backend/asgi.py

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from camera import routing as camera_routing
from vision import routing as vision_routing   # NEW

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'conveyor_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),

    "websocket": AuthMiddlewareStack(
        URLRouter(
            camera_routing.websocket_urlpatterns +
            vision_routing.websocket_urlpatterns
        )
    ),
})
