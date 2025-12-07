# vision/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
import logging

logger = logging.getLogger(__name__)


class FrameProgressConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(
            "frame_progress",
            self.channel_name
        )
        await self.accept()
        logger.info("WebSocket connected")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            "frame_progress",
            self.channel_name
        )
        logger.info(f"WebSocket disconnected with code: {close_code}")

    async def receive(self, text_data=None, bytes_data=None):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            logger.info(f"Received WebSocket message: {data}")
        except Exception as e:
            logger.error(f"Error parsing WebSocket message: {e}")

    async def send_json(self, content):
        """Send JSON data through WebSocket"""
        try:
            await self.send(text_data=json.dumps(content))
        except Exception as e:
            logger.error(f"Error sending JSON: {e}")

    async def progress_message(self, event):
        """Handle progress messages from channel layer"""
        try:
            # Prepare the message data
            message = {
                'type': 'progress',
                'frame': int(event.get('frame', 0)),
                'progress': int(event.get('progress', 0)),
                'belt_metrics': event.get('belt_metrics', {}),
                'frame_image': event.get('frame_image', ''),
                'fps': float(event.get('fps', 0)),
                'is_final': bool(event.get('is_final', False)),
                'replay_available': bool(event.get('replay_available', False)),
                'replay_frames': int(event.get('replay_frames', 0)) if event.get('replay_frames') else 0
            }

            # Send the message
            await self.send_json(message)
        except Exception as e:
            logger.error(f"Error sending progress message: {e}")

    async def error_message(self, event):
        """Handle error messages from channel layer"""
        try:
            message = {
                'type': 'error',
                'error': str(event.get('error', 'Unknown error'))
            }
            await self.send_json(message)
        except Exception as e:
            logger.error(f"Error sending error message: {e}")