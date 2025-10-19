import os
from pinecone import Pinecone
from dotenv import load_dotenv
load_dotenv()


_pc_instance = None


def get_pinecone_connector():
    global _pc_instance
    if _pc_instance is None:
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY not found in environment variables")
        _pc_instance = Pinecone(api_key=api_key)
    return _pc_instance
