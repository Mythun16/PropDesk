from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, Document
import asyncio

class TestDoc(Document):
    name: str

async def main():
    try:
        client = AsyncIOMotorClient("mongodb://localhost:27017")
        await init_beanie(database=client.testdb, document_models=[TestDoc])
        print("SUCCESS")
    except Exception as e:
        print(f"FAILED: {type(e).__name__} - {e}")

if __name__ == "__main__":
    asyncio.run(main())
