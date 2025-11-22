# consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json

class FrameProgressConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("frame_progress", self.channel_name)
        await self.accept()
        print("WebSocket connected")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("frame_progress", self.channel_name)
        print("WebSocket disconnected")

    # This handles messages sent with type="progress_message"
    async def progress_message(self, event):
        # Send everything to the client
        await self.send(text_data=json.dumps({
            "frame": event.get("frame"),
            "object_count": event.get("object_count"),
            "belt_speed": event.get("belt_speed"),
        }))
