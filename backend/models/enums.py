"""CivicSetu Canonical Enums and Indian Administrative Hierarchy."""

from enum import Enum
from typing import Dict, Any


class PriorityTier(str, Enum):
    P0_CRITICAL = "P0_CRITICAL"
    P1_HIGH = "P1_HIGH"
    P2_MEDIUM = "P2_MEDIUM"
    P3_LOW = "P3_LOW"


class IncidentStatus(str, Enum):
    REPORTED = "REPORTED"
    TRIAGED = "TRIAGED"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    RESOLVED = "RESOLVED"
    REOPENED = "REOPENED"


class IndianAgency(str, Enum):
    ULB_MUNICIPAL = "ULB_MUNICIPAL"
    STATE_PWD = "STATE_PWD"
    NHAI = "NHAI"
    DISCOM_ELECTRICAL = "DISCOM_ELECTRICAL"
    WATER_SEWERAGE_BOARD = "WATER_SEWERAGE_BOARD"


class EscalationTier(str, Enum):
    LEVEL_1_WARD_JE = "LEVEL_1_WARD_JE"
    LEVEL_2_ZONAL_OFFICER = "LEVEL_2_ZONAL_OFFICER"
    LEVEL_3_MUNICIPAL_COMMISSIONER = "LEVEL_3_MUNICIPAL_COMMISSIONER"


class AuditStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED_FIXED = "VERIFIED_FIXED"
    PARTIAL_FIX = "PARTIAL_FIX"
    REJECTED_MISMATCH = "REJECTED_MISMATCH"


class CivicCategory(str, Enum):
    ROADS_FOOTPATHS = "Roads & Footpaths"
    SANITATION_WASTE = "Sanitation & Waste"
    WATER_DRAINAGE = "Water & Drainage"
    ELECTRICITY_LIGHTING = "Electricity & Lighting"
    PUBLIC_SAFETY = "Public Safety"


# Indian Municipal Agency Metadata & Jurisdiction Details
AGENCY_METADATA: Dict[IndianAgency, Dict[str, Any]] = {
    IndianAgency.ULB_MUNICIPAL: {
        "code": "ULB_MUNICIPAL",
        "name": "Urban Local Body / Municipal Corporation",
        "examples": ["BBMP", "GHMC", "BMC", "MCD"],
        "scope": "Garbage dumps, solid waste, colony interior roads, stray animals, parks, public health",
        "level_1_officer": "Ward Sanitary Inspector / Junior Health Officer",
        "level_2_officer": "Zonal Joint Commissioner",
        "level_3_officer": "Municipal Commissioner",
    },
    IndianAgency.STATE_PWD: {
        "code": "STATE_PWD",
        "name": "State Public Works Department",
        "examples": ["Karnataka PWD", "Telangana PWD", "Maharashtra PWD"],
        "scope": "Major arterial roads, bus route roads, state highways, flyovers, pedestrian underpasses",
        "level_1_officer": "Junior Engineer (PWD Sub-Division)",
        "level_2_officer": "Executive Engineer (PWD Division)",
        "level_3_officer": "Chief Engineer / PWD Principal Secretary",
    },
    IndianAgency.NHAI: {
        "code": "NHAI",
        "name": "National Highways Authority of India",
        "examples": ["NHAI PIU Bengaluru", "NHAI PIU Hyderabad"],
        "scope": "Elevated highway corridors, bypasses, national expressways within city boundaries",
        "level_1_officer": "Site Engineer / Resident Engineer",
        "level_2_officer": "Project Director (NHAI PIU)",
        "level_3_officer": "Regional Officer (NHAI)",
    },
    IndianAgency.DISCOM_ELECTRICAL: {
        "code": "DISCOM_ELECTRICAL",
        "name": "Electricity Distribution Company",
        "examples": ["BESCOM", "TSSPDCL", "Tata Power", "MSEDCL"],
        "scope": "Non-functioning streetlights, fallen electric poles, open transformer boxes, dangling live wires",
        "level_1_officer": "Assistant Executive Engineer (Electrical Sub-Station)",
        "level_2_officer": "Executive Engineer (O&M Division)",
        "level_3_officer": "Director (Operations / Technical)",
    },
    IndianAgency.WATER_SEWERAGE_BOARD: {
        "code": "WATER_SEWERAGE_BOARD",
        "name": "Water Supply & Sewerage Board",
        "examples": ["BWSSB", "HMWSSB", "Delhi Jal Board"],
        "scope": "Drinking water pipeline bursts, sewer line blockages, open stormwater drains, missing manhole covers",
        "level_1_officer": "Assistant Engineer (Water/Drainage Ward Sub-Division)",
        "level_2_officer": "Executive Engineer (Water Supply & Sewerage)",
        "level_3_officer": "Engineer-in-Chief / Chairman",
    },
}

# Real-world Seed Wards (Bengaluru Focus for Hackathon MVP)
MUNICIPAL_WARDS: Dict[str, Dict[str, Any]] = {
    "Ward 14 - Indiranagar": {
        "ward_id": "Ward 14 - Indiranagar",
        "zone": "East Zone",
        "center_lat": 12.9716,
        "center_lng": 77.6412,
        "primary_landmarks": ["Indiranagar Metro Station", "100 Feet Road", "ESI Hospital", "Defense Colony"],
    },
    "Ward 84 - Koramangala": {
        "ward_id": "Ward 84 - Koramangala",
        "zone": "South Zone",
        "center_lat": 12.9352,
        "center_lng": 77.6245,
        "primary_landmarks": ["Sony World Signal", "Koramangala 80 Feet Road", "Forum Mall", "Wipro Park"],
    },
    "Ward 150 - Bellandur": {
        "ward_id": "Ward 150 - Bellandur",
        "zone": "Mahadevapura Zone",
        "center_lat": 12.9260,
        "center_lng": 77.6762,
        "primary_landmarks": ["Bellandur Lake Road", "Ecospace Outer Ring Road", "Central Mall Outer Ring Road"],
    },
}
