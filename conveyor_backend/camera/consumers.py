from channels.generic.websocket import AsyncWebsocketConsumer
import json

class FrameProgressConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("frame_progress", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("frame_progress", self.channel_name)

    async def progress_message(self, event):
        await self.send(text_data=json.dumps({
            "frame": event["frame"]
        }))
