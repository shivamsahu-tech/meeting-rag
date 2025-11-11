def get_prompt(context, query, conversations=None):
    conversation_str = ""
    
    # Format the conversation history (if provided)
    if conversations and isinstance(conversations, list):
        formatted = []
        for c in conversations:
            role = c.get("role", "user").capitalize()
            text = c.get("text", "").strip()
            formatted.append(f"{role}: {text}")
        conversation_str = "\n\n".join(formatted)
    else:
        conversation_str = "No previous conversation."

    prompt_template = f"""
You are an AI RAG assistant that helps users by providing information based on the given context and conversation history.

Conversation History:
{conversation_str}

Context:
{context}

Question:
{query}

Instructions:
1. Provide a short and accurate answer based on the above context and prior conversation history, your answer should be keywords rich so any person can get more understanding in less words
2. If the context contains "Image URL:" entries, you MUST embed those images in your response using <img> tags.
3. Your output must be valid HTML wrapped inside a <div> element (do NOT include <html>, <head>, or <body> tags).
4. Use proper semantic HTML tags (<p>, <h1>-<h6>, <ul>, <ol>, <li>, <strong>, <em>, etc.).
5. You can use Tailwind CSS classes for styling.
6. For images, use this format:
   <img src="[URL]" alt="[descriptive text]" class="max-w-full h-auto rounded-lg my-4" />
7. Ensure images are contextually referenced within the explanation, not just listed.
8. Keep your tone professional, concise, and clear.

Output Example:
<div class="space-y-4">
    <p class="text-gray-800">Your explanation here...</p>
    <img src="https://example.com/image.jpg" alt="Relevant diagram" class="max-w-full h-auto rounded-lg my-4" />
    <p class="text-gray-800">More explanation referencing the image above...</p>
</div>

Remember: Always use 'class' (not 'className'), since this is pure HTML output.
"""
    return prompt_template
