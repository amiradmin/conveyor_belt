# vision/consumers.py
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
import logging
import asyncio

logger = logging.getLogger(__name__)


class FrameProgressConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.group_name = "frame_progress"
        self.replay_mode = False
        self.replay_speed = 1.0  # 1x normal speed
        self.replay_position = 0
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket connected: {self.channel_name}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"WebSocket disconnected: {self.channel_name}")

    async def receive_json(self, content):
        """Handle commands from frontend"""
        command = content.get('command')

        if command == 'start_replay':
            self.replay_mode = True
            self.replay_position = content.get('position', 0)
            self.replay_speed = content.get('speed', 1.0)
            await self.send_json({
                'type': 'replay_status',
                'status': 'started',
                'position': self.replay_position,
                'speed': self.replay_speed
            })

        elif command == 'stop_replay':
            self.replay_mode = False
            await self.send_json({
                'type': 'replay_status',
                'status': 'stopped'
            })

        elif command == 'seek_replay':
            self.replay_position = content.get('position', 0)
            await self.send_json({
                'type': 'replay_seek',
                'position': self.replay_position
            })

        elif command == 'set_replay_speed':
            self.replay_speed = content.get('speed', 1.0)
            await self.send_json({
                'type': 'replay_speed',
                'speed': self.replay_speed
            })

    async def progress_message(self, event):
        """Send processing progress or replay frames"""
        if self.replay_mode:
            # In replay mode, we don't send live frames
            return

        await self.send_json({
            "type": "progress",
            "frame": event.get("frame"),
            "object_count": event.get("object_count"),
            "progress": event.get("progress"),
            "speed": event.get("speed", 0),
            "alignment": event.get("alignment"),
            "frame_image": event.get("frame_image"),
            "replay_buffer_size": event.get("replay_buffer_size", 0),
            "is_final": event.get("is_final", False),
            "replay_available": event.get("replay_available", False)
        })

    async def error_message(self, event):
        await self.send_json({
            "type": "error",
            "error": event.get("error")
        })