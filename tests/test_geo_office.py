"""Tests for Multi-State Governing Offices Directory and Nearest Office Matching Service."""

import pytest
from backend.services.geo_office_service import (
    find_nearest_governing_office,
    calculate_haversine_distance,
    GOVERNING_OFFICES,
)


def test_calculate_haversine_distance():
    # Bengaluru BBMP HQ to Indiranagar (approx 6-7 km)
    dist = calculate_haversine_distance(12.9698, 77.5878, 12.9784, 77.6408)
    assert 5.0 < dist < 8.0


def test_find_nearest_governing_office_karnataka():
    # MG Road Bengaluru
    office = find_nearest_governing_office(12.9756, 77.6066)
    assert office.state == "Karnataka"
    assert "BBMP" in office.name
    assert office.distance_km is not None
    assert office.distance_km < 5.0


def test_find_nearest_governing_office_hyderabad():
    # Madhapur Hitec City
    office = find_nearest_governing_office(17.4483, 78.3915)
    assert office.state == "Telangana"
    assert office.city == "Hyderabad"
    assert "GHMC" in office.name
    assert office.distance_km is not None
    assert office.distance_km < 10.0


def test_find_nearest_governing_office_chennai():
    # T. Nagar Chennai
    office = find_nearest_governing_office(13.0418, 80.2341)
    assert office.state == "Tamil Nadu"
    assert office.city == "Chennai"
    assert "GCC" in office.name or "Greater Chennai Corporation" in office.name
    assert office.distance_km is not None
    assert office.distance_km < 8.0


def test_find_nearest_governing_office_andhra():
    # Visakhapatnam Beach Road
    office = find_nearest_governing_office(17.7214, 83.3054)
    assert office.state == "Andhra Pradesh"
    assert office.city == "Visakhapatnam"
    assert "GVMC" in office.name or "Visakhapatnam" in office.name
    assert office.distance_km is not None
    assert office.distance_km < 5.0

    # Vijayawada MG Road
    office_vja = find_nearest_governing_office(16.5062, 80.6480)
    assert office_vja.state == "Andhra Pradesh"
    assert office_vja.city == "Vijayawada"
    assert "Vijayawada" in office_vja.name
    assert office_vja.distance_km is not None
    assert office_vja.distance_km < 5.0
