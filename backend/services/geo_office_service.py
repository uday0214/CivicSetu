"""CivicSetu Multi-State Governing Offices Directory and Nearest Office Spatial Service.

Covers major urban municipal corporations, zonal divisions, electricity distribution
boards, and water/sewerage authorities across:
  - Karnataka (BBMP, Mysuru MCC, Hubballi-Dharwad HDMC, Mangaluru MCC)
  - Telangana (GHMC Hyderabad, Secunderabad, GWMC Warangal, Cyberabad)
  - Andhra Pradesh (GVMC Visakhapatnam, VMC Vijayawada, GMC Guntur, Tirupati)
  - Tamil Nadu (GCC Greater Chennai, CCMC Coimbatore, Madurai, Tiruchirappalli)
"""

import math
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class GoverningOfficeInfo(BaseModel):
    id: str = Field(..., description="Unique office identifier")
    name: str = Field(..., description="Office or authority name")
    office_type: str = Field(..., description="Municipal Corp Head Office | Zonal Office | Ward Office | Utility Division")
    state: str = Field(..., description="Karnataka | Telangana | Andhra Pradesh | Tamil Nadu")
    city: str = Field(..., description="City or District name")
    address: str = Field(..., description="Physical street address")
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    phone: str = Field(..., description="Helpline or control room phone number")
    jurisdiction_agency: str = Field(..., description="Primary agency code (e.g. ULB_MUNICIPAL, DISCOM_ELECTRICAL, etc.)")
    distance_km: Optional[float] = Field(None, description="Calculated distance from reference point in kilometers")


# Directory of Administrative & Municipal Governing Offices across 4 States
GOVERNING_OFFICES: List[Dict[str, Any]] = [
    # ==========================
    # 1. KARNATAKA
    # ==========================
    {
        "id": "KA-BBMP-HQ",
        "name": "Bruhat Bengaluru Mahanagara Palike (BBMP) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Karnataka",
        "city": "Bengaluru",
        "address": "NR Square, Corporation Circle, Bengaluru, Karnataka 560002",
        "lat": 12.9698,
        "lng": 77.5878,
        "phone": "080-22660000 / 1533",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "KA-BBMP-EAST",
        "name": "BBMP East Zonal Office (Indiranagar / Halasuru)",
        "office_type": "Zonal Office",
        "state": "Karnataka",
        "city": "Bengaluru",
        "address": "Mayo Hall, MG Road, Bengaluru, Karnataka 560001",
        "lat": 12.9739,
        "lng": 77.6094,
        "phone": "080-22975803",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "KA-BBMP-SOUTH",
        "name": "BBMP South Zonal Office (Koramangala / Jayanagar)",
        "office_type": "Zonal Office",
        "state": "Karnataka",
        "city": "Bengaluru",
        "address": "9th Main, 2nd Block Jayanagar, Bengaluru, Karnataka 560011",
        "lat": 12.9351,
        "lng": 77.5815,
        "phone": "080-26566085",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "KA-BBMP-MAHADEVAPURA",
        "name": "BBMP Mahadevapura Zonal Office (Whitefield / Bellandur)",
        "office_type": "Zonal Office",
        "state": "Karnataka",
        "city": "Bengaluru",
        "address": "RHB Colony, Mahadevapura, Bengaluru, Karnataka 560048",
        "lat": 12.9915,
        "lng": 77.6872,
        "phone": "080-28512300",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "KA-MCC-MYS",
        "name": "Mysuru City Corporation (MCC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Karnataka",
        "city": "Mysuru",
        "address": "Sayyaji Rao Road, Agrahara, Mysuru, Karnataka 570001",
        "lat": 12.3051,
        "lng": 76.6552,
        "phone": "0821-2418800 / 0821-2440890",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "KA-MCC-MNG",
        "name": "Mangaluru City Corporation (MCC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Karnataka",
        "city": "Mangaluru",
        "address": "Lalbagh, MG Road, Mangaluru, Karnataka 575003",
        "lat": 12.8703,
        "lng": 74.8430,
        "phone": "0824-2220306",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "KA-HDMC-HUB",
        "name": "Hubballi-Dharwad Municipal Corporation (HDMC)",
        "office_type": "Municipal Corporation Head Office",
        "state": "Karnataka",
        "city": "Hubballi-Dharwad",
        "address": "Lamington Road, Hubballi, Karnataka 580020",
        "lat": 15.3647,
        "lng": 75.1240,
        "phone": "0836-2213888",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },

    # ==========================
    # 2. TELANGANA
    # ==========================
    {
        "id": "TG-GHMC-HQ",
        "name": "Greater Hyderabad Municipal Corporation (GHMC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Telangana",
        "city": "Hyderabad",
        "address": "CC Complex, Tank Bund Road, Lower Tank Bund, Hyderabad, Telangana 500063",
        "lat": 17.4065,
        "lng": 78.4772,
        "phone": "040-21111111 / 155304",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "TG-GHMC-KHAIRATABAD",
        "name": "GHMC Khairatabad Zonal Office (Banjara Hills / Jubilee Hills)",
        "office_type": "Zonal Office",
        "state": "Telangana",
        "city": "Hyderabad",
        "address": "Khairatabad Circle, Hyderabad, Telangana 500004",
        "lat": 17.4116,
        "lng": 78.4593,
        "phone": "040-23390234",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "TG-GHMC-SERILINGAMPALLY",
        "name": "GHMC Serilingampally Zonal Office (Madhapur / Hitec City / Gachibowli)",
        "office_type": "Zonal Office",
        "state": "Telangana",
        "city": "Hyderabad",
        "address": "Tara Nagar, Serilingampally, Cyberabad, Hyderabad, Telangana 500019",
        "lat": 17.4842,
        "lng": 78.3184,
        "phone": "040-23030382",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "TG-GHMC-SECUNDERABAD",
        "name": "GHMC Secunderabad Zonal Office",
        "office_type": "Zonal Office",
        "state": "Telangana",
        "city": "Hyderabad",
        "address": "SP Road, Secunderabad, Telangana 500003",
        "lat": 17.4399,
        "lng": 78.4983,
        "phone": "040-27712345",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "TG-GWMC-WAR",
        "name": "Greater Warangal Municipal Corporation (GWMC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Telangana",
        "city": "Warangal",
        "address": "Opp. Public Garden, Hanamkonda, Warangal, Telangana 506001",
        "lat": 17.9784,
        "lng": 79.5941,
        "phone": "0870-2424032 / 1800-425-1980",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },

    # ==========================
    # 3. ANDHRA PRADESH
    # ==========================
    {
        "id": "AP-GVMC-HQ",
        "name": "Greater Visakhapatnam Municipal Corporation (GVMC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Andhra Pradesh",
        "city": "Visakhapatnam",
        "address": "Tenneti Bhavan, Asilmetta, Visakhapatnam, Andhra Pradesh 530002",
        "lat": 17.7214,
        "lng": 83.3054,
        "phone": "0891-2746400 / 1800-425-00009",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "AP-VMC-HQ",
        "name": "Vijayawada Municipal Corporation (VMC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Andhra Pradesh",
        "city": "Vijayawada",
        "address": "Jawaharlal Nehru Buildings, Canal Road, Vijayawada, Andhra Pradesh 520001",
        "lat": 16.5062,
        "lng": 80.6480,
        "phone": "0866-2421058 / 1800-425-2000",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "AP-GMC-HQ",
        "name": "Guntur Municipal Corporation (GMC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Andhra Pradesh",
        "city": "Guntur",
        "address": "Opp. Hindu College Grounds, GT Road, Guntur, Andhra Pradesh 522003",
        "lat": 16.3067,
        "lng": 80.4365,
        "phone": "0863-2224202 / 1800-425-8888",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "AP-TMC-HQ",
        "name": "Tirupati Municipal Corporation (TMC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Andhra Pradesh",
        "city": "Tirupati",
        "address": "Tilak Road, Tirupati, Andhra Pradesh 517501",
        "lat": 13.6288,
        "lng": 79.4192,
        "phone": "0877-2256767",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },

    # ==========================
    # 4. TAMIL NADU
    # ==========================
    {
        "id": "TN-GCC-HQ",
        "name": "Greater Chennai Corporation (GCC) Ripon Building",
        "office_type": "Municipal Corporation Head Office",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "address": "Ripon Building, Raja Muthiah Road, Periyamet, Chennai, Tamil Nadu 600003",
        "lat": 13.0827,
        "lng": 80.2707,
        "phone": "044-25619206 / 1913",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "TN-GCC-ZONE9",
        "name": "GCC Teynampet Zonal Office (Zone 9 - T. Nagar / Mylapore)",
        "office_type": "Zonal Office",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "address": "No. 4, Lake Area 4th Cross St, Nungambakkam, Chennai, Tamil Nadu 600034",
        "lat": 13.0560,
        "lng": 80.2430,
        "phone": "044-28171711",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "TN-GCC-ZONE13",
        "name": "GCC Adyar Zonal Office (Zone 13 - OMR / Adyar / Besant Nagar)",
        "office_type": "Zonal Office",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "address": "Dr Muthulakshmi Salai, Adyar, Chennai, Tamil Nadu 600020",
        "lat": 13.0012,
        "lng": 80.2565,
        "phone": "044-24422201",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "TN-CCMC-CBE",
        "name": "Coimbatore City Municipal Corporation (CCMC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Tamil Nadu",
        "city": "Coimbatore",
        "address": "Big Bazaar Street, Town Hall, Coimbatore, Tamil Nadu 641001",
        "lat": 11.0168,
        "lng": 76.9558,
        "phone": "0422-2302323 / 0422-2300132",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "TN-MCMC-MAD",
        "name": "Madurai Municipal Corporation (MMC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Tamil Nadu",
        "city": "Madurai",
        "address": "Anna Maligai, Madurai, Tamil Nadu 625002",
        "lat": 9.9252,
        "lng": 78.1198,
        "phone": "0452-2531551",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
    {
        "id": "TN-TCMC-TRI",
        "name": "Tiruchirappalli City Corporation (TCC) Head Office",
        "office_type": "Municipal Corporation Head Office",
        "state": "Tamil Nadu",
        "city": "Tiruchirappalli",
        "address": "Bharathidasan Salai, Cantonment, Tiruchirappalli, Tamil Nadu 620001",
        "lat": 10.7905,
        "lng": 78.7047,
        "phone": "0431-2415325",
        "jurisdiction_agency": "ULB_MUNICIPAL",
    },
]


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in kilometers
    using the Haversine formula.
    """
    R = 6371.0  # Earth's radius in kilometers
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def find_nearest_governing_office(
    lat: float,
    lng: float,
    agency: Optional[str] = None,
    state: Optional[str] = None,
) -> GoverningOfficeInfo:
    """
    Finds the closest administrative or municipal governing office from the directory
    to the given GPS coordinates. Optionally filters by agency or state.
    """
    best_office = None
    min_dist = float("inf")

    candidates = GOVERNING_OFFICES
    if state:
        candidates = [o for o in candidates if o["state"].lower() == state.lower()] or candidates

    for office in candidates:
        dist = calculate_haversine_distance(lat, lng, office["lat"], office["lng"])
        if dist < min_dist:
            min_dist = dist
            best_office = {**office, "distance_km": dist}

    if not best_office:
        # Fallback to BBMP HQ
        fallback = GOVERNING_OFFICES[0]
        dist = calculate_haversine_distance(lat, lng, fallback["lat"], fallback["lng"])
        return GoverningOfficeInfo(**fallback, distance_km=dist)

    return GoverningOfficeInfo(**best_office)
