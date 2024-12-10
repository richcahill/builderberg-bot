from redis import Redis
from config import REDIS_URL

cache = Redis.from_url(REDIS_URL)
