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
        "examples": ["Karnataka PWD", "Telangana R&B", "Tamil Nadu Highways", "Andhra Pradesh R&B"],
        "scope": "Major arterial roads, bus route roads, state highways, flyovers, pedestrian underpasses",
        "level_1_officer": "Junior Engineer (PWD Sub-Division)",
        "level_2_officer": "Executive Engineer (PWD Division)",
        "level_3_officer": "Chief Engineer / PWD Principal Secretary",
    },
    IndianAgency.NHAI: {
        "code": "NHAI",
        "name": "National Highways Authority of India",
        "examples": ["NHAI PIU Bengaluru", "NHAI PIU Hyderabad", "NHAI PIU Chennai", "NHAI PIU Visakhapatnam"],
        "scope": "Elevated highway corridors, bypasses, national expressways within city boundaries",
        "level_1_officer": "Site Engineer / Resident Engineer",
        "level_2_officer": "Project Director (NHAI PIU)",
        "level_3_officer": "Regional Officer (NHAI)",
    },
    IndianAgency.DISCOM_ELECTRICAL: {
        "code": "DISCOM_ELECTRICAL",
        "name": "Electricity Distribution Company",
        "examples": ["BESCOM (KA)", "TGSPDCL (TG)", "TANGEDCO (TN)", "APEPDCL / APSPDCL (AP)"],
        "scope": "Non-functioning streetlights, fallen electric poles, open transformer boxes, dangling live wires",
        "level_1_officer": "Assistant Executive Engineer (Electrical Sub-Station)",
        "level_2_officer": "Executive Engineer (O&M Division)",
        "level_3_officer": "Director (Operations / Technical)",
    },
    IndianAgency.WATER_SEWERAGE_BOARD: {
        "code": "WATER_SEWERAGE_BOARD",
        "name": "Water Supply & Sewerage Board",
        "examples": ["BWSSB (Bengaluru)", "HMWSSB (Hyderabad)", "CMWSSB (Chennai)", "GVMC Water Works (AP)"],
        "scope": "Drinking water pipeline bursts, sewer line blockages, open stormwater drains, missing manhole covers",
        "level_1_officer": "Assistant Engineer (Water/Drainage Ward Sub-Division)",
        "level_2_officer": "Executive Engineer (Water Supply & Sewerage)",
        "level_3_officer": "Engineer-in-Chief / Chairman",
    },
}

# Multi-State Seed Administrative Jurisdictions (Karnataka, Telangana, Andhra Pradesh, Tamil Nadu)
MUNICIPAL_WARDS: Dict[str, Dict[str, Any]] = {
    # Karnataka (Backward compatibility keys + full titles)
    "Ward 14 - Indiranagar": {
        "ward_id": "Ward 14 - Indiranagar",
        "zone": "East Zone",
        "state": "Karnataka",
        "city": "Bengaluru",
        "center_lat": 12.9716,
        "center_lng": 77.6412,
        "primary_landmarks": ["Indiranagar Metro Station", "100 Feet Road", "ESI Hospital", "Defense Colony"],
    },
    "Ward 84 - Koramangala": {
        "ward_id": "Ward 84 - Koramangala",
        "zone": "South Zone",
        "state": "Karnataka",
        "city": "Bengaluru",
        "center_lat": 12.9352,
        "center_lng": 77.6245,
        "primary_landmarks": ["Sony World Signal", "Koramangala 80 Feet Road", "Forum Mall", "Wipro Park"],
    },
    "Ward 150 - Bellandur": {
        "ward_id": "Ward 150 - Bellandur",
        "zone": "Mahadevapura Zone",
        "state": "Karnataka",
        "city": "Bengaluru",
        "center_lat": 12.9260,
        "center_lng": 77.6762,
        "primary_landmarks": ["Bellandur Lake Road", "Ecospace Outer Ring Road", "Central Mall Outer Ring Road"],
    },
    # Telangana
    "Circle 20 - Serilingampally / Madhapur (Hyderabad)": {
        "ward_id": "Circle 20 - Serilingampally / Madhapur (Hyderabad)",
        "zone": "West Zone (GHMC)",
        "state": "Telangana",
        "city": "Hyderabad",
        "center_lat": 17.4483,
        "center_lng": 78.3915,
        "primary_landmarks": ["Hitec City Cyber Towers", "Durgam Cheruvu Cable Bridge", "Inorbit Mall", "Mindspace IT Park"],
    },
    "Circle 18 - Khairatabad / Banjara Hills (Hyderabad)": {
        "ward_id": "Circle 18 - Khairatabad / Banjara Hills (Hyderabad)",
        "zone": "Central Zone (GHMC)",
        "state": "Telangana",
        "city": "Hyderabad",
        "center_lat": 17.4156,
        "center_lng": 78.4350,
        "primary_landmarks": ["Banjara Hills Road No 1", "Panjagutta Junction", "GVK One", "KBR Park"],
    },
    # Andhra Pradesh
    "Zone 3 - Asilmetta / MVP Colony (Visakhapatnam)": {
        "ward_id": "Zone 3 - Asilmetta / MVP Colony (Visakhapatnam)",
        "zone": "Zone 3 (GVMC)",
        "state": "Andhra Pradesh",
        "city": "Visakhapatnam",
        "center_lat": 17.7384,
        "center_lng": 83.3378,
        "primary_landmarks": ["RK Beach Road", "MVP Colony Sector 1", "Siripuram Junction", "Andhra University"],
    },
    "Circle 2 - Governorpet / MG Road (Vijayawada)": {
        "ward_id": "Circle 2 - Governorpet / MG Road (Vijayawada)",
        "zone": "Circle 2 (VMC)",
        "state": "Andhra Pradesh",
        "city": "Vijayawada",
        "center_lat": 16.5062,
        "center_lng": 80.6480,
        "primary_landmarks": ["Prakasam Barrage", "MG Road Commercial Axis", "Besant Road", "Benz Circle"],
    },
    # Tamil Nadu
    "Zone 9 - T. Nagar / Mylapore (Chennai)": {
        "ward_id": "Zone 9 - T. Nagar / Mylapore (Chennai)",
        "zone": "Central Region (GCC)",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "center_lat": 13.0418,
        "center_lng": 80.2341,
        "primary_landmarks": ["Panagal Park", "Pondy Bazaar", "Usman Road Flyover", "Kapaleeshwarar Temple"],
    },
    "Zone 13 - Adyar / OMR IT Corridor (Chennai)": {
        "ward_id": "Zone 13 - Adyar / OMR IT Corridor (Chennai)",
        "zone": "South Region (GCC)",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "center_lat": 12.9815,
        "center_lng": 80.2464,
        "primary_landmarks": ["Tidel Park", "Madhya Kailash", "SRP Tools Junction", "Thiruvanmiyur Beach Road"],
    },
}
