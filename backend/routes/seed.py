"""CivicSetu Seed & Demo Simulation API Routes."""

import logging
from fastapi import APIRouter
from backend.services.seed_data import seed_database

logger = logging.getLogger("civicsetu.routes.seed")

router = APIRouter(prefix="/api/seed", tags=["seed"])


@router.post("/reset")
async def reset_seed_data():
    """
    Resets the database to the 16-incident Bengaluru BBMP demo dataset.
    Populates all 6 test clusters, including the overdue Level 3 Commissioner ticket.
    """
    logger.info("Executing demo database reset to Bengaluru BBMP dataset.")
    result = await seed_database()
    return result


@router.get("/fixtures")
async def get_multilingual_fixtures():
    """
    Returns quick-copy sample vernacular audio/text inputs for live hackathon pitch demonstrations.
    """
    return {
        "fixtures": [
            {
                "language": "Hindi / Hinglish",
                "text": "Indiranagar 100 feet road pe metro pillar 42 ke samne khula manhole pani mein dooba hai, gaadi gir sakti hai please urgently fix karo.",
                "category": "Water & Drainage",
                "expected_priority": "P0_CRITICAL",
                "expected_agency": "WATER_SEWERAGE_BOARD",
            },
            {
                "language": "Kannada",
                "text": "ಇಂದಿರಾನಗರ ಶಾಲೆ ಬಳಿ ವಿದ್ಯುತ್ ತಂತಿ ತುಂಡಾಗಿ ಬಿದ್ದಿದೆ, ಮಕ್ಕಳಿಗೆ ತುಂಬಾ ಅಪಾಯ, ಬೆಸ್ಕಾಂಗೆ ತಕ್ಷಣ ತಿಳಿಸಿ.",
                "transcription_en": "Electric wire snapped near Indiranagar school, very dangerous for children, inform BESCOM immediately.",
                "category": "Electricity & Lighting",
                "expected_priority": "P0_CRITICAL",
                "expected_agency": "DISCOM_ELECTRICAL",
            },
            {
                "language": "English",
                "text": "Huge heap of commercial vegetable waste and plastic bags encroaching the footpath near Koramangala BDA complex.",
                "category": "Sanitation & Waste",
                "expected_priority": "P2_MEDIUM",
                "expected_agency": "ULB_MUNICIPAL",
            },
            {
                "language": "Hinglish",
                "text": "Outer Ring Road Bellandur flyover ke pass deep road crater hai, bikers skid ho rahe hain.",
                "category": "Roads & Footpaths",
                "expected_priority": "P1_HIGH",
                "expected_agency": "STATE_PWD",
            },
        ]
    }
