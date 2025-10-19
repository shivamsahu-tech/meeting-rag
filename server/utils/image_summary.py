import os
from mistralai import Mistral
from dotenv import load_dotenv

# Retrieve the API key from environment variables
# api_key = os.environ["MISTRAL_API_KEY"]
load_dotenv()
# Specify model
model = "pixtral-12b-2409"

api_key=os.getenv("MISTRAL_API_KEY")
# Initialize the Mistral client
client = Mistral(api_key=api_key)



def image_summary(image_url):
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "What's in this image?"
                },
                {
                    "type": "image_url",
                    "image_url": image_url
                }
            ]
        }
    ]

    chat_response = client.chat.complete(
        model=model,
        messages=messages
    )

    return chat_response.choices[0].message.content



# print(image_summary("https://res.cloudinary.com/dfl8h4on4/image/upload/quickstart_australia"))
