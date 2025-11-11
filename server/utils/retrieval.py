# from utils.embedding import get_embeddings
# from utils.db_connections import get_pinecone_connector
# from utils.llm import chat
# from utils.prompt_template import get_prompt
# from utils.serper import search_serper

# async def get_context(transcript: str, index_name: str) -> dict:
#     """Retrieve additional context for the given transcript and generate LLM response."""
#     pc = get_pinecone_connector()
#     print("getting the embeddings for the transcript")
#     try:
#         query_embedding = get_embeddings([transcript])[0]
#     except Exception as e:
#         print(f"Error: Could not generate query embeddings: {e}")
#         return {
#             "transcript": transcript,
#             "context": "Error generating embeddings for query.",
#             "llm_response": "Unable to process query due to embedding error."
#         }
    
#     max_results = 10
#     print(f"querying pinecone index: {index_name} for top {max_results} results")
#     try:
#         index = pc.Index(index_name)
#         vector_results = index.query(
#             vector=query_embedding,
#             top_k=max_results,
#             include_metadata=True
#         )
#     except Exception as e:
#         print(f"Error: Failed to query Pinecone index: {e}")
#         return {
#             "transcript": transcript,
#             "context": "Error: Failed to query Pinecone index.",
#             "llm_response": "Unable to retrieve context from database."
#         }
#     print("Preparing the context from vector results")
    
#     if not vector_results.get('matches'):
#         context = "No matching context found in the document."
#     else:
#         formatted_results = []
#         for i, match in enumerate(vector_results['matches'], 1):
#             score = match.get('score', 0)
#             metadata = match.get('metadata', {})
#             text_chunk = metadata.get('text', 'No text available')
#             image_url = metadata.get('image_url', '')
#             chunk_type = metadata.get('type', 'text')
            
#             # Format each result with relevance score, text, and image URL if available
#             result_text = f"[Result {i} - Relevance: {score:.3f} - Type: {chunk_type}]\n"
            
#             if text_chunk and text_chunk != 'No text available':
#                 result_text += f"Text: {text_chunk}\n"
            
#             if image_url:
#                 result_text += f"Image URL: {image_url}\n"
            
#             formatted_results.append(result_text)
        
#         context = '\n'.join(formatted_results) if formatted_results else "No context details found."
    
#     # Generate prompt using the retrieved context
#     try:
#         prompt = get_prompt(context, transcript)
#     except Exception as e:
#         print(f"Error generating prompt: {e}")
#         return {
#             "transcript": transcript,
#             "context": context,
#             "llm_response": "Error generating prompt for LLM."
#         }
#     print("prepareing prompt")
    
#     print("Getting LLM response")
#     # Get LLM response
#     try:
#         llm_response = chat(prompt)
#     except Exception as e:
#         print(f"Error getting LLM response: {e}")
#         return {
#             "transcript": transcript,
#             "context": context,
#             "llm_response": "Error: Failed to get response from LLM."
#         }
    
#     serper_response = search_serper(transcript)
#     # Return structured object with transcript and LLM response
#     return {
#         "transcript": transcript,
#         "context": context,
#         "llm_response": llm_response,
#         "serper_response": serper_response
#     }