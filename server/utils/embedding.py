import requests, os
from dotenv import load_dotenv

load_dotenv() 

# def get_embeddings(chunks):
#     response = requests.post(
#         "http://localhost:8001/embed",
#         json={"chunks": chunks},
#         headers={"Content-Type": "application/json"}
#     )
#     response.raise_for_status()
#     return response.json()["embeddings"]


import os
from google import genai
from google.genai import types 
from typing import List

def get_embeddings(text_chunks: List[str]) -> List[List[float]]:
    """
    Generates 384-dimensional embeddings for a list of text chunks.
    
    Args:
        text_chunks: A list of text strings to embed.

    Returns:
        A list of corresponding 384-dimensional embedding vectors (lists of floats), 
        or an empty list if authentication or API call fails.
    """
    print(f"Generating embeddings for {len(text_chunks)} text chunks.")
    print("Text chunks preview:", text_chunks[:2])  # Print first 2 chunks for verification
    if not text_chunks:
        return []

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not found.")
        return []
    
    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Gemini client: {e}")
        return []

    try:
        # Define the configuration using types.EmbedContentConfig
        embedding_config = types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT", 
            output_dimensionality=384,      
        )

        # The response object is of type EmbedContentResponse
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text_chunks,
            config=embedding_config, 
        )

        # CORRECT WAY TO ACCESS: Use dot notation for the response object 
        # and access the 'values' attribute of each embedding object.
        embeddings_vectors = [emb.values for emb in response.embeddings]

        return embeddings_vectors

    except Exception as e:
        print(f"An error occurred during the API call: {e}")
        return []







# # Example Usage
# if __name__ == "__main__":
#     # Ensure you have run: export GEMINI_API_KEY="YOUR_API_KEY" in your terminal
    
#     input_strings = [
#         "This code now correctly uses dot notation to access the response attributes.",
#         "The response object is not subscriptable, it has attributes like 'embeddings'.",
#         "We successfully access the actual vector values via the '.values' attribute."
#     ]

#     print(f"Number of input strings: {len(input_strings)}")
#     print("\nGenerating embeddings...")

#     output_vectors_list = get_embeddings_list(input_strings)

#     if output_vectors_list:
#         print("Embeddings generated successfully:")
#         print(f"Number of output vectors: {len(output_vectors_list)}")
#         print(f"Length of the first vector: {len(output_vectors_list[0])}") # Should be 384
#         print(f"First 5 dimensions: {output_vectors_list[0][:5]}...")
