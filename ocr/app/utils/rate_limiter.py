import asyncio
import time
from collections import deque
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
class ProviderRateLimiter:
    """Rate Limiting manager for LLM Providers"""
    
    def __init__(self, max_calls: int, period_seconds: float):
        self.max_calls = max_calls
        self.period = period_seconds
        self.calls = deque()
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:  
            now = time.time()
            while self.calls and now - self.calls[0] > self.period:
                self.calls.popleft()
            if len(self.calls) >= self.max_calls:
                sleep_time = self.period - (now - self.calls[0])
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
            self.calls.append(time.time())