import asyncio
import logging
from utils.db_connections import get_pinecone_connector

logger = logging.getLogger(__name__)

async def delete_index_after_delay(index_name: str, delay: int = 600):
    """Delete a Pinecone index after a specified delay (in seconds)."""
    try:
        logger.info(f"🕒 Scheduled deletion for index '{index_name}' in {delay} seconds...")
        await asyncio.sleep(delay)

        pc = get_pinecone_connector()
        indexes = [idx["name"] for idx in pc.list_indexes().indexes]

        if index_name in indexes:
            pc.delete_index(index_name)
            logger.info(f"🧹 Deleted expired Pinecone index: {index_name}")
        else:
            logger.info(f"Index '{index_name}' already removed or not found.")

    except Exception as e:
        logger.error(f"❌ Error deleting Pinecone index '{index_name}': {str(e)}")
