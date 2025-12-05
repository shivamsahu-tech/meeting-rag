import asyncio
import logging
from typing import List, Dict
from utils.prompt_template import get_prompt
from utils.embedding import get_embeddings
from utils.db_connections import get_pinecone_connector
from utils.serper import search_serper
from utils.llm import chat
import requests
from utils.prompt_enhancement import enhance_prompt

# ---- Logging Configuration ----
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

async def retrieve_response_pipeline(
    index_name_pdf: str,
    index_name_ocr: str,
    conversations: List[Dict],
    query: str,
    isWebSearchOn: bool,
    isDocSearchOn: bool,
):
    main_response = {}

    logging.info("Starting retrieve_response_pipeline")
    logging.info(f"Query: {query}")
    # logging.info("Sending the query for enhancementment...")
    # query = enhance_prompt(query, conversations)
    # logging.info(f"Enhanced Query: {query}")
    logging.info(f" PDF Index: {index_name_pdf}, OCR Index: {index_name_ocr}")
    logging.info(f" WebSearch: {isWebSearchOn},  DocSearch: {isDocSearchOn}")

    # ---- Get embedding for the query ----
    logging.info("Generating embeddings for query...")
    query_embedding = get_embeddings([query])[0]
    logging.info("Embedding generated successfully.")

    # ----  Connect to Pinecone ----
    logging.info("Connecting to Pinecone...")
    pinecone_client = get_pinecone_connector()
    logging.info("Connected to Pinecone successfully.")

    # ---- Retrieve from PDF Index ----
    logging.info("Querying PDF Index...")
    pdf_index = pinecone_client.Index(index_name_pdf)
    pdf_results = pdf_index.query(vector=query_embedding, top_k=10, include_metadata=True)
    pdf_matches = pdf_results.get("matches", [])
    logging.info(f"Retrieved {len(pdf_matches)} PDF matches from Pinecone.")

    # ---- Extract PDF text + image context ----
    pdf_context = ""
    if pdf_matches:
        extracted_items = []
        for i, match in enumerate(pdf_matches, start=1):
            metadata = match.get("metadata", {})
            text = metadata.get("text", "").strip()
            image_url = metadata.get("image_url", "").strip()

            logging.info(f"Match {i}: score={match.get('score', 0):.4f}")
            logging.debug(f"   ➜ Text snippet: {text[:100]}{'...' if len(text) > 100 else ''}")
            if image_url:
                logging.info(f" Image URL: {image_url}")

            if text or image_url:
                item_str = ""
                if text:
                    item_str += f"Text: {text}"
                if image_url:
                    item_str += f"\nImage: {image_url}"
                extracted_items.append(item_str.strip())

        pdf_context = "\n\n".join(extracted_items) if extracted_items else "No relevant context found."
    else:
        logging.warning("No PDF matches found.")

    # ---- Build prompt and call Gemini ----
    logging.info(" Building prompt for Gemini LLM...")
    prompt = get_prompt(context=pdf_context, query=query, conversations=conversations)
    logging.debug(f" Prompt preview:\n{prompt[:500]}{'...' if len(prompt) > 500 else ''}")

    logging.info(" Calling Gemini LLM...")
    gemini_output = chat(prompt)
    main_response["llm_response"] = gemini_output
    logging.info(" Gemini response received.")
    logging.debug(f" Gemini Output Preview: {str(gemini_output)[:400]}")

    # ----  Web search (optional) ----
    if isWebSearchOn:
        logging.info(" Performing web search using Serper...")
        web_results = search_serper(query)
        main_response["web_results"] = web_results
        logging.info(f" Retrieved {len(web_results)} web results.")

    # ----  Document OCR search (optional) ----
    if isDocSearchOn:
        logging.info(" Querying OCR Index...")
        ocr_index = pinecone_client.Index(index_name_ocr)
        ocr_results = ocr_index.query(vector=query_embedding, top_k=5, include_metadata=True)
        ocr_matches = ocr_results.get("matches", [])
        logging.info(f" Retrieved {len(ocr_matches)} OCR matches.")

        formatted_docs = []
        for i, match in enumerate(ocr_matches, start=1):
            metadata = match.get("metadata", {})
            formatted_docs.append({
                "page_image_url": metadata.get("page_image_url"),
                "pdf_url": metadata.get("pdf_url"),
                "page_number": metadata.get("page_number"),
                "ocr_text_excerpt": metadata.get("ocr_text_excerpt"),
            })
            logging.debug(f" OCR Match {i}: Page {metadata.get('page_number')}")

        main_response["document_context"] = formatted_docs

    logging.info(" Pipeline completed successfully.")
    return main_response
