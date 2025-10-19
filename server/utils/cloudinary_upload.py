import os
from pathlib import Path
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
from cloudinary import CloudinaryImage
from datetime import datetime
import uuid

def get_image_url(image_path):
    """
    Uploads an image to Cloudinary and returns its URL.
    Automatically generates a unique public_id.
    
    Args:
        image_path (str): The path to the local image file.
    
    Returns:
        str: The secure URL of the uploaded image, or None if upload fails.
    """
    # Load environment variables from .env file
    current_dir = Path(__file__).resolve().parent
    env_path = None
    
    # Try to find .env file in parent directories
    for parent in [current_dir] + list(current_dir.parents):
        potential_env = parent / '.env'
        if potential_env.exists():
            env_path = potential_env
            break
    
    if env_path:
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
    
    # Configure Cloudinary with environment variables
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET")
    )
    
    # Verify credentials are loaded
    if not all([os.getenv("CLOUDINARY_CLOUD_NAME"), 
                os.getenv("CLOUDINARY_API_KEY"), 
                os.getenv("CLOUDINARY_API_SECRET")]):
        print("Error: Cloudinary credentials not found in environment variables")
        return None
    
    # Verify file exists
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at {image_path}")
        return None
    
    # Generate unique public_id automatically
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    filename = Path(image_path).stem
    public_id = f"{filename}_{timestamp}_{unique_id}"
    
    try:
        # Upload the image and get the response
        upload_result = cloudinary.uploader.upload(
            image_path,
            public_id=public_id,
            unique_filename=False,
            overwrite=True
        )
        
        # Use CloudinaryImage to build the secure URL
        image_url = CloudinaryImage(upload_result["public_id"]).build_url(secure=True)
        
        print(f"Image uploaded successfully!")
        print(f"Public ID: {upload_result['public_id']}")
        print(f"URL: {image_url}")
        return image_url
    
    except Exception as e:
        print(f"An error occurred during upload: {e}")
        return None


# # --- Example Usage ---
# if __name__ == "__main__":
#     # Just pass the image path - that's it!
#     image_file = "/home/shivamsahu/Desktop/huggingface-test/australia.jpg"
#     image_url = get_image_url(image_file)
    
#     if image_url:
#         print(f"\nFinal image URL: {image_url}")
#     else:
#         print("\nFailed to upload image")