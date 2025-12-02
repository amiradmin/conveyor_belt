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

class RealtimeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            # Accept connection
            await self.accept()

            # Optional: get camera_id from URL kwargs
            self.camera_id = self.scope['url_route']['kwargs'].get('camera_id', 'default')

            # Add the client to a group per camera if you want broadcasting
            self.group_name = f"realtime_{self.camera_id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)

            # Send initial confirmation
            await self.send(json.dumps({
                "status": "connected",
                "camera_id": self.camera_id
            }))
            print(f"WebSocket connected: camera_id={self.camera_id}")

        except Exception as e:
            print("WebSocket connect error:", e)
            await self.close(code=1011)  # Internal error

    async def disconnect(self, close_code):
        # Leave the group
        try:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        except Exception:
            pass
        print("WebSocket disconnected", close_code)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            if text_data:
                data = json.loads(text_data)
                print("Received:", data)

                # Echo back
                await self.send(json.dumps({
                    "echo": data
                }))

                # Example: broadcast to group
                # await self.channel_layer.group_send(
                #     self.group_name,
                #     {
                #         "type": "broadcast.message",
                #         "message": data
                #     }
                # )
        except Exception as e:
            print("WebSocket receive error:", e)
            await self.send(json.dumps({"error": str(e)}))

    # Optional: handler for group messages
    async def broadcast_message(self, event):
        message = event.get('message')
        if message:
            await self.send(json.dumps(message))