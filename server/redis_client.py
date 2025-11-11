import redis.asyncio as redis
from dotenv import load_dotenv
import os
load_dotenv()

url: str = os.getenv("REDIS_URL") or "redis://localhost:6379/0"

redis_client = redis.from_url(
    url,
    encoding="utf-8",
    decode_responses=True
)
