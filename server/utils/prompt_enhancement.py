from utils.llm import chat

def enhance_prompt(original_prompt: str, conversations) -> str:
    """Enhance the given prompt using a language model."""

    if conversations and isinstance(conversations, list):
        formatted = []
        for c in conversations:
            role = c.get("role", "user").capitalize()
            text = c.get("text", "").strip()
            formatted.append(f"{role}: {text}")
        conversation_str = "\n\n".join(formatted)
    else:
        conversation_str = "No previous conversation."
        

    full_prompt =  f"""
            Instructions:
            1. This query is for context enhancement of the orginal query given below. Improve its clarity and detail.
            2. We are internally using vector DB retrieval.
            3. keep the original intent unchanged but understand the user willing to get more detailed and context-rich responses.
            4. Provide the enhanced prompt as output without any additional commentary.
            5. example: what is AI?  =>  Can you provide a detailed explanation of Artificial Intelligence (AI), including its definition, key concepts, applications, and significance in today's world?
            6. Original Query and Last Question should be 

            =====================================================================

            The Main and Original User Query :  ${original_prompt}


            ==========================================================================

            Conversation History:
            {conversation_str}



            NOTE: YOUR BAD RESPONSE CAN LEAD THE WHOLE DISTRUCTION, SO DO THIS WITH HIGHER ACCURACY AND BETTER UNDERSTANDING.
        """

    enhanced_prompt = chat(full_prompt)
    return enhanced_prompt