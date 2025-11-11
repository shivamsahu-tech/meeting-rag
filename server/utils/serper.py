import requests
import json
import os
from dotenv import load_dotenv

# Load .env file to keep API key secure
load_dotenv()

SERPER_API_KEY = os.getenv("SERPER_API_KEY")
SERPER_URL = "https://google.serper.dev/search"


def search_serper(query: str):
    """
    Search the web using Serper API and return top results with snippets.
    """
    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
    }

    payload = json.dumps({"q": query})

    try:
        response = requests.post(SERPER_URL, headers=headers, data=payload)
        response.raise_for_status()
        data = response.json()

        # Extract snippet-like results
        results = []
        for item in data.get("organic", []):
            results.append({
                "title": item.get("title"),
                "link": item.get("link"),
                "snippet": item.get("snippet")
            })

        return results

    except requests.exceptions.RequestException as e:
        print("Error during Serper API call:", e)
        return []


# if __name__ == "__main__":
#     query = "in india pollution is increaseing, what are the main reasons?"
#     search_results = search_serper(query)
#     for idx, result in enumerate(search_results[:5], start=1):
#         print(f"\n[{idx}] {result['title']}")
#         print(f"URL: {result['link']}")
#         print(f"Snippet: {result['snippet']}")
