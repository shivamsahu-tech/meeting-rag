import requests, os
from dotenv import load_dotenv

load_dotenv() 

api_key = os.getenv("EMBEDDING_API_KEY")
def get_embeddings(chunks):
    response = requests.post(
        "http://localhost:8001/embed",
        json={"chunks": chunks},
        headers={"Content-Type": "application/json"}
    )
    response.raise_for_status()
    return response.json()["embeddings"]