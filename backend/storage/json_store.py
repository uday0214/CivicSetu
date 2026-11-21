"""Dual-Mode Local Development Store: In-Memory with JSON Persistence."""

import json
import os
import logging
from typing import Any, Dict, List, Optional
from backend.storage.base import BaseIncidentRepository

logger = logging.getLogger("civicsetu.store")


class JSONIncidentRepository(BaseIncidentRepository):
    """
    In-memory incident repository backed by a persistent JSON file.
    Designed exclusively for local development and offline demos.
    """

    def __init__(self, data_file: str = "backend/data/incidents.json"):
        self.data_file = data_file
        self.incidents: Dict[str, Dict[str, Any]] = {}
        self.reports: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self):
        os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.incidents = {inc["id"]: inc for inc in data.get("incidents", [])}
                    self.reports = {rep["report_id"]: rep for rep in data.get("reports", [])}
                logger.info(f"Loaded {len(self.incidents)} incidents from {self.data_file}")
            except Exception as e:
                logger.warning(f"Could not load {self.data_file}, starting empty: {e}")
                self.incidents = {}
                self.reports = {}
        else:
            self._save()

    def _save(self):
        try:
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "incidents": list(self.incidents.values()),
                        "reports": list(self.reports.values()),
                    },
                    f,
                    indent=2,
                    ensure_ascii=False,
                )
        except Exception as e:
            logger.error(f"Failed to persist incidents to {self.data_file}: {e}")

    async def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        return self.incidents.get(incident_id)

    async def list_incidents(
        self,
        ward_id: Optional[str] = None,
        agency: Optional[str] = None,
        priority: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        items = list(self.incidents.values())
        if ward_id:
            items = [item for item in items if item.get("ward_id") == ward_id]
        if agency:
            items = [item for item in items if item.get("agency") == agency]
        if priority:
            items = [item for item in items if item.get("priority") == priority]
        if status:
            items = [item for item in items if item.get("status") == status]
        return items[offset : offset + limit]

    async def create_incident(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        incident_id = incident_data["id"]
        self.incidents[incident_id] = incident_data
        self._save()
        return incident_data

    async def update_incident(self, incident_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if incident_id not in self.incidents:
            return None
        self.incidents[incident_id].update(updates)
        self._save()
        return self.incidents[incident_id]

    async def add_citizen_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        report_id = report_data["report_id"]
        self.reports[report_id] = report_data
        self._save()
        return report_data

    async def list_citizen_reports(self, incident_id: Optional[str] = None) -> List[Dict[str, Any]]:
        reports = list(self.reports.values())
        if incident_id:
            reports = [r for r in reports if r.get("master_incident_id") == incident_id]
        return reports

    async def reset_demo_data(self, seed_incidents: List[Dict[str, Any]]) -> None:
        self.incidents = {inc["id"]: inc for inc in seed_incidents}
        self.reports = {}
        self._save()
        logger.info(f"Reset repository to {len(self.incidents)} seed incidents")


# Global repository instance
_repo_instance: Optional[BaseIncidentRepository] = None


def get_repository() -> BaseIncidentRepository:
    global _repo_instance
    if _repo_instance is None:
        from backend.config import settings
        if settings.DATA_STORE_MODE == "firestore":
            # Will be plugged in when cloud firestore is activated
            logger.info("Using Firestore repository mode")
            # Fallback to JSON repository for now if google-cloud-firestore not loaded
            _repo_instance = JSONIncidentRepository()
        else:
            logger.info("Using Local JSON repository mode")
            _repo_instance = JSONIncidentRepository()
    return _repo_instance
