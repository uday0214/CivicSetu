"""Abstract Base Repository for CivicSetu Data Persistence."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseIncidentRepository(ABC):
    """Abstract interface for Master Incidents and Citizen Reports persistence."""

    @abstractmethod
    async def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single master incident by ID."""
        pass

    @abstractmethod
    async def list_incidents(
        self,
        ward_id: Optional[str] = None,
        agency: Optional[str] = None,
        priority: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List master incidents with optional filtering and pagination."""
        pass

    @abstractmethod
    async def create_incident(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new master incident."""
        pass

    @abstractmethod
    async def update_incident(self, incident_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update fields of an existing master incident."""
        pass

    @abstractmethod
    async def add_citizen_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a new citizen report."""
        pass

    @abstractmethod
    async def list_citizen_reports(self, incident_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve citizen reports, optionally filtered by incident ID."""
        pass

    @abstractmethod
    async def reset_demo_data(self, seed_incidents: List[Dict[str, Any]]) -> None:
        """Reset repository state to the initial seed dataset for live pitch demos."""
        pass
