"""CivicSetu Seed CLI Script. Run with: python -m backend.seed"""

import asyncio
from backend.services.seed_data import seed_database


async def main():
    print("🌱 Seeding CivicSetu with realistic Bengaluru BBMP dataset...")
    res = await seed_database()
    print(f"✅ {res['message']}")


if __name__ == "__main__":
    asyncio.run(main())
