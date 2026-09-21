import asyncio
from typing import Callable, Dict, List, Any
import logging

logger = logging.getLogger("LightSync.EventBus")

class EventBus:
    """
    Central Pub/Sub Event Bus for LightSync.
    Dispatches music, device, visual, and analytics events across all subsystems.
    """
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Dict[str, Any]], Any]]] = {}
        self._async_subscribers: Dict[str, List[Callable[[Dict[str, Any]], Any]]] = {}

    def subscribe(self, event_type: str, callback: Callable[[Dict[str, Any]], Any]):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    def subscribe_async(self, event_type: str, callback: Callable[[Dict[str, Any]], Any]):
        if event_type not in self._async_subscribers:
            self._async_subscribers[event_type] = []
        self._async_subscribers[event_type].append(callback)

    def publish_sync(self, event_type: str, data: Dict[str, Any]):
        """Synchronously notify callbacks (for high-speed real-time MIDI)."""
        # Call specific subscribers
        if event_type in self._subscribers:
            for cb in self._subscribers[event_type]:
                try:
                    cb(data)
                except Exception as e:
                    logger.error(f"Error in sync callback for {event_type}: {e}")

        # Wildcard subscribers
        if "*" in self._subscribers:
            for cb in self._subscribers["*"]:
                try:
                    cb({"type": event_type, **data})
                except Exception as e:
                    logger.error(f"Error in wildcard sync callback: {e}")

    async def publish(self, event_type: str, data: Dict[str, Any]):
        """Publish an event asynchronously to all subscribers."""
        self.publish_sync(event_type, data)

        # Notify async subscribers
        if event_type in self._async_subscribers:
            for acb in self._async_subscribers[event_type]:
                try:
                    res = acb(data)
                    if asyncio.iscoroutine(res):
                        await res
                except Exception as e:
                    logger.error(f"Error in async callback for {event_type}: {e}")

        if "*" in self._async_subscribers:
            for acb in self._async_subscribers["*"]:
                try:
                    res = acb({"type": event_type, **data})
                    if asyncio.iscoroutine(res):
                        await res
                except Exception as e:
                    logger.error(f"Error in wildcard async callback: {e}")

# Global singleton
event_bus = EventBus()
