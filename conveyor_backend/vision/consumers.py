import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
import logging

logger = logging.getLogger(__name__)

class FrameProgressConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.group_name = "frame_progress"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket connected: {self.channel_name}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"WebSocket disconnected: {self.channel_name}")

    async def progress_message(self, event):
        """
        Receives 'progress_message' from BeltProcessor
        and sends to WebSocket frontend
        """
        await self.send_json({
            "type": "progress",
            "frame": event.get("frame"),
            "object_count": event.get("object_count"),
            "progress": event.get("progress"),
            "is_final": event.get("is_final", False)
        })

    async def error_message(self, event):
        """
        Receives 'error_message' from BeltProcessor
        and sends to WebSocket frontend
        """
        await self.send_json({
            "type": "error",
            "error": event.get("error")
        })
