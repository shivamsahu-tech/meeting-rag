import os
from dotenv import load_dotenv
from prisma import Prisma
from pathlib import Path


dotenv_path = Path(__file__).resolve().parent.parent / '.env'

load_dotenv(dotenv_path=dotenv_path) 

prisma = Prisma()

async def connect_db():
    if not os.getenv("DATABASE_URL"):
        print("CRITICAL ERROR: DATABASE_URL not found in environment variables.")
        exit(1)
        
    await prisma.connect()
    print("✅ Connected to PostgreSQL via Prisma")

async def disconnect_db():
    await prisma.disconnect()
    print("❌ Disconnected from PostgreSQL")
