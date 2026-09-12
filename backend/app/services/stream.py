import asyncio
import json
from typing import Set, Dict, Any


class DecisionStreamBroadcaster:
    """
    Server-Sent Events (SSE) Broadcaster for dispatching live payment verdicts
    to Mintu's split-screen simulator and bank war-room console in real time.
    """

    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    async def subscribe(self) -> asyncio.Queue:
        """Subscribes an active SSE connection queue."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        """Removes a disconnected client queue."""
        self._subscribers.discard(queue)

    async def broadcast(self, event_data: Dict[str, Any]):
        """Dispatches an interception event to all active SSE subscribers."""
        if not self._subscribers:
            return

        dead_queues = set()
        payload = json.dumps(event_data)

        for q in self._subscribers:
            try:
                # Non-blocking put; if full, discard oldest
                if q.full():
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                q.put_nowait(payload)
            except Exception:
                dead_queues.add(q)

        for dead in dead_queues:
            self._subscribers.discard(dead)


decision_stream = DecisionStreamBroadcaster()
