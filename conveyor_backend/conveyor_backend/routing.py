from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
import os
from camera import routing as camera_routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'conveyor_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(
        camera_routing.websocket_urlpatterns
    ),
})