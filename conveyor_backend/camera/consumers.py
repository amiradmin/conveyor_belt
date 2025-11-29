from channels.generic.websocket import AsyncWebsocketConsumer
import json


class FrameProgressConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("frame_progress", self.channel_name)
        await self.accept()
        print("WebSocket connected for video progress")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("frame_progress", self.channel_name)
        print("WebSocket disconnected for video progress")

    async def receive(self, text_data):
        # Handle any messages from client if needed
        pass

    async def progress_message(self, event):
        """Handle video processing progress updates"""
        await self.send(text_data=json.dumps({
            "type": "progress",
            "frame": event.get("frame"),
            "object_count": event.get("object_count"),
            "belt_speed": event.get("belt_speed"),
            "progress": event.get("progress", 0),
            "is_final": event.get("is_final", False)
        }))

    async def error_message(self, event):
        """Handle error messages"""
        await self.send(text_data=json.dumps({
            "type": "error",
            "error": event.get("error")
        }))


class RealTimeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get camera_id from URL route or use default
        self.camera_id = self.scope['url_route']['kwargs'].get('camera_id', 'default')
        self.group_name = f'conveyor_{self.camera_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        print(f"Real-time WebSocket connected for camera: {self.camera_id}")

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        print(f"Real-time WebSocket disconnected for camera: {self.camera_id}")

    async def receive(self, text_data):
        # Handle any messages from client if needed
        pass

    async def realtime_update(self, event):
        """Handle real-time analysis updates"""
        await self.send(text_data=json.dumps({
            "type": "realtime",
            "data": event.get("data", {})
        }))

    async def analysis_update(self, event):
        """Handle analysis updates from ConveyorAnalysisAPI"""
        await self.send(text_data=json.dumps({
            "type": "analysis",
            "data": event.get("data", {})
        }))