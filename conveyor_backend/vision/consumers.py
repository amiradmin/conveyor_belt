# vision/consumers.py
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
import logging
import asyncio

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

    async def receive_json(self, content):
        """Handle commands from frontend"""
        command = content.get('command')

        if command == 'start_replay':
            # Handle replay start
            await self.send_json({
                'type': 'replay_status',
                'status': 'started'
            })
        elif command == 'get_metrics_summary':
            # Return metrics summary
            await self.send_json({
                'type': 'metrics_summary',
                'data': content.get('data', {})
            })

    async def progress_message(self, event):
        """Send processing progress with belt metrics"""
        await self.send_json({
            "type": "progress",
            "frame": event.get("frame"),
            "progress": event.get("progress"),
            "belt_metrics": event.get("belt_metrics", {}),
            "frame_image": event.get("frame_image"),
            "is_final": event.get("is_final", False),
            "replay_available": event.get("replay_available", False)
        })

    async def error_message(self, event):
        await self.send_json({
            "type": "error",
            "error": event.get("error")
        })