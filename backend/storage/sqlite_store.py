"""Lightweight SQLite Database & Incident Repository for CivicSetu."""

import json
import os
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.storage.base import BaseIncidentRepository
from backend.config import settings

logger = logging.getLogger("civicsetu.sqlite_store")


class SQLiteIncidentRepository(BaseIncidentRepository):
    """
    Lightweight SQLite database storage for incidents, citizen reports,
    user authentication, and uploaded media assets.
    """

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.SQLITE_DB_PATH
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Enable WAL mode for high concurrent read performance
            cursor.execute("PRAGMA journal_mode=WAL;")

            # 1. Users Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL, -- 'citizen' or 'admin'
                    name TEXT NOT NULL,
                    phone TEXT,
                    department TEXT,
                    ward_id TEXT,
                    created_at TEXT NOT NULL
                )
            """)

            # 2. Incidents Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    incident_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    priority TEXT NOT NULL,
                    status TEXT NOT NULL,
                    ward_id TEXT NOT NULL,
                    agency TEXT NOT NULL,
                    lat REAL NOT NULL,
                    lng REAL NOT NULL,
                    landmark TEXT,
                    description TEXT,
                    report_count INTEGER DEFAULT 1,
                    sla_deadline TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    assigned_crew TEXT,
                    dispatch_notes TEXT,
                    resolution_notes TEXT,
                    before_media_urls TEXT,
                    after_media_urls TEXT,
                    audit_status TEXT,
                    audit_confidence REAL,
                    audit_reasoning TEXT,
                    visual_match INTEGER,
                    raw_json TEXT NOT NULL
                )
            """)

            # 3. Citizen Reports Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS citizen_reports (
                    report_id TEXT PRIMARY KEY,
                    incident_id TEXT NOT NULL,
                    user_id TEXT,
                    raw_text TEXT,
                    transcript TEXT,
                    detected_language TEXT,
                    landmark_extracted TEXT,
                    category_suggested TEXT,
                    urgency_score REAL,
                    photo_url TEXT,
                    audio_url TEXT,
                    created_at TEXT NOT NULL,
                    raw_json TEXT NOT NULL
                )
            """)

            # 4. Assets Table (stores media, photos, audio, proofs)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS assets (
                    asset_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_url TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    mime_type TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    asset_type TEXT NOT NULL, -- 'photo', 'audio', 'audit_before', 'audit_after'
                    incident_id TEXT,
                    report_id TEXT,
                    uploaded_by TEXT,
                    created_at TEXT NOT NULL,
                    metadata_json TEXT
                )
            """)

            # Indices for rapid querying
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_ward ON incidents(ward_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_incident ON citizen_reports(incident_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_incident ON assets(incident_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
            conn.commit()

        # Seed default users if empty
        self._seed_default_users_if_needed()

        # Seed initial incidents from JSON if incidents table is empty
        self._seed_initial_incidents_if_needed()

    def _seed_default_users_if_needed(self):
        from backend.services.auth_service import hash_password
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users")
            count = cursor.fetchone()[0]
            if count == 0:
                now = datetime.now(timezone.utc).isoformat()
                # 1. BBMP Admin User
                admin_pw_hash = hash_password("bbmp2025")
                cursor.execute("""
                    INSERT INTO users (email, password_hash, role, name, phone, department, ward_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    "admin@bbmp.gov.in",
                    admin_pw_hash,
                    "admin",
                    "Ramesh Kumar (Chief Municipal Engineer)",
                    "+91 80 2266 0000",
                    "BBMP Road Infrastructure & Ward Command",
                    "BBMP-CENTRAL",
                    now
                ))

                # 2. Citizen User
                citizen_pw_hash = hash_password("citizen123")
                cursor.execute("""
                    INSERT INTO users (email, password_hash, role, name, phone, department, ward_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    "citizen@bengaluru.in",
                    citizen_pw_hash,
                    "citizen",
                    "Aarav Sharma",
                    "+91 98450 12345",
                    "Citizen / Resident",
                    "WARD-142",
                    now
                ))
                conn.commit()
                logger.info("Seeded default Admin and Citizen accounts in SQLite database.")

    def _seed_initial_incidents_if_needed(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM incidents")
            count = cursor.fetchone()[0]
            if count == 0:
                # Check if backend/data/incidents.json exists
                json_file = "backend/data/incidents.json"
                if os.path.exists(json_file):
                    try:
                        with open(json_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            incidents = data.get("incidents", [])
                            reports = data.get("reports", [])
                            for inc in incidents:
                                self._insert_incident_row(cursor, inc)
                            for rep in reports:
                                self._insert_report_row(cursor, rep)
                            conn.commit()
                            logger.info(f"Imported {len(incidents)} seed incidents into SQLite from {json_file}")
                    except Exception as e:
                        logger.warning(f"Could not load initial incidents from JSON: {e}")

    def _insert_incident_row(self, cursor: sqlite3.Cursor, inc: Dict[str, Any]):
        incident_id = inc.get("incident_id") or inc.get("id")
        before_media = json.dumps(inc.get("before_media_urls", []))
        after_media = json.dumps(inc.get("after_media_urls", []))
        raw_json = json.dumps(inc, ensure_ascii=False)

        cursor.execute("""
            INSERT OR REPLACE INTO incidents (
                incident_id, title, category, priority, status, ward_id, agency,
                lat, lng, landmark, description, report_count, sla_deadline,
                created_at, updated_at, assigned_crew, dispatch_notes, resolution_notes,
                before_media_urls, after_media_urls, audit_status, audit_confidence,
                audit_reasoning, visual_match, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            incident_id,
            inc.get("title", ""),
            inc.get("category", "General"),
            inc.get("priority", "P3"),
            inc.get("status", "SUBMITTED"),
            inc.get("ward_id", "WARD-142"),
            inc.get("agency", "BBMP"),
            float(inc.get("lat", 12.9716)),
            float(inc.get("lng", 77.5946)),
            inc.get("landmark", ""),
            inc.get("description", ""),
            int(inc.get("report_count", 1)),
            inc.get("sla_deadline"),
            inc.get("created_at", datetime.now(timezone.utc).isoformat()),
            inc.get("updated_at", datetime.now(timezone.utc).isoformat()),
            inc.get("assigned_crew"),
            inc.get("dispatch_notes"),
            inc.get("resolution_notes"),
            before_media,
            after_media,
            inc.get("audit_status"),
            inc.get("audit_confidence"),
            inc.get("audit_reasoning"),
            1 if inc.get("visual_match") else 0 if inc.get("visual_match") is not None else None,
            raw_json
        ))

    def _insert_report_row(self, cursor: sqlite3.Cursor, rep: Dict[str, Any]):
        report_id = rep.get("report_id")
        incident_id = rep.get("incident_id") or rep.get("master_incident_id", "")
        raw_json = json.dumps(rep, ensure_ascii=False)

        cursor.execute("""
            INSERT OR REPLACE INTO citizen_reports (
                report_id, incident_id, user_id, raw_text, transcript,
                detected_language, landmark_extracted, category_suggested,
                urgency_score, photo_url, audio_url, created_at, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            report_id,
            incident_id,
            rep.get("user_id"),
            rep.get("raw_text"),
            rep.get("transcript"),
            rep.get("detected_language"),
            rep.get("landmark_extracted"),
            rep.get("category_suggested"),
            rep.get("urgency_score"),
            rep.get("photo_url"),
            rep.get("audio_url"),
            rep.get("created_at", datetime.now(timezone.utc).isoformat()),
            raw_json
        ))

    # --- BaseIncidentRepository Implementation ---

    async def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT raw_json FROM incidents WHERE incident_id = ?", (incident_id,))
            row = cursor.fetchone()
            if row:
                return json.loads(row["raw_json"])
        return None

    async def list_incidents(
        self,
        ward_id: Optional[str] = None,
        agency: Optional[str] = None,
        priority: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        query = "SELECT raw_json FROM incidents WHERE 1=1"
        params: List[Any] = []

        if ward_id:
            query += " AND ward_id = ?"
            params.append(ward_id)
        if agency:
            query += " AND agency = ?"
            params.append(agency)
        if priority:
            query += " AND priority = ?"
            params.append(priority)
        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [json.loads(row["raw_json"]) for row in rows]

    async def create_incident(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        incident_id = incident_data.get("incident_id") or incident_data.get("id")
        if not incident_id:
            raise ValueError("Incident data must contain incident_id or id")

        with self._get_connection() as conn:
            cursor = conn.cursor()
            self._insert_incident_row(cursor, incident_data)
            conn.commit()

        # Update JSON file as fallback cache
        self._sync_to_json_cache()
        return incident_data

    async def update_incident(self, incident_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT raw_json FROM incidents WHERE incident_id = ?", (incident_id,))
            row = cursor.fetchone()
            if not row:
                return None

            current_data = json.loads(row["raw_json"])
            current_data.update(updates)
            current_data["updated_at"] = datetime.now(timezone.utc).isoformat()

            self._insert_incident_row(cursor, current_data)
            conn.commit()

        self._sync_to_json_cache()
        return current_data

    async def add_citizen_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        report_id = report_data.get("report_id")
        if not report_id:
            raise ValueError("Report data must contain report_id")

        with self._get_connection() as conn:
            cursor = conn.cursor()
            self._insert_report_row(cursor, report_data)
            conn.commit()

        self._sync_to_json_cache()
        return report_data

    async def list_citizen_reports(self, incident_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if incident_id:
                cursor.execute(
                    "SELECT raw_json FROM citizen_reports WHERE incident_id = ? ORDER BY created_at DESC",
                    (incident_id,)
                )
            else:
                cursor.execute("SELECT raw_json FROM citizen_reports ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [json.loads(row["raw_json"]) for row in rows]

    async def reset_demo_data(self, seed_incidents: List[Dict[str, Any]]) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM incidents")
            cursor.execute("DELETE FROM citizen_reports")
            for inc in seed_incidents:
                self._insert_incident_row(cursor, inc)
            conn.commit()

        logger.info(f"Reset SQLite database with {len(seed_incidents)} seed incidents")
        self._sync_to_json_cache()

    def _sync_to_json_cache(self):
        """Dual-write sync to backend/data/incidents.json for backup/compatibility."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT raw_json FROM incidents")
                incidents = [json.loads(r["raw_json"]) for r in cursor.fetchall()]
                cursor.execute("SELECT raw_json FROM citizen_reports")
                reports = [json.loads(r["raw_json"]) for r in cursor.fetchall()]

            json_path = "backend/data/incidents.json"
            os.makedirs(os.path.dirname(json_path), exist_ok=True)
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump({"incidents": incidents, "reports": reports}, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Could not sync to JSON backup file: {e}")

    # --- User Authentication Management ---

    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (email, password_hash, role, name, phone, department, ward_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_data["email"].strip().lower(),
                user_data["password_hash"],
                user_data.get("role", "citizen"),
                user_data.get("name", ""),
                user_data.get("phone", ""),
                user_data.get("department", ""),
                user_data.get("ward_id", ""),
                user_data.get("created_at", datetime.now(timezone.utc).isoformat()),
            ))
            user_id = cursor.lastrowid
            conn.commit()

        return await self.get_user_by_id(user_id)

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email.strip().lower(),))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    async def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    async def list_users(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, role, name, phone, department, ward_id, created_at FROM users")
            return [dict(row) for row in cursor.fetchall()]

    # --- Assets Management ---

    async def record_asset(self, asset_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            metadata_str = json.dumps(asset_data.get("metadata", {})) if "metadata" in asset_data else None
            cursor.execute("""
                INSERT OR REPLACE INTO assets (
                    asset_id, filename, file_url, file_path, mime_type,
                    size_bytes, asset_type, incident_id, report_id,
                    uploaded_by, created_at, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                asset_data["asset_id"],
                asset_data["filename"],
                asset_data["file_url"],
                asset_data.get("file_path", ""),
                asset_data.get("mime_type", "application/octet-stream"),
                int(asset_data.get("size_bytes", 0)),
                asset_data.get("asset_type", "photo"),
                asset_data.get("incident_id"),
                asset_data.get("report_id"),
                asset_data.get("uploaded_by"),
                asset_data.get("created_at", datetime.now(timezone.utc).isoformat()),
                metadata_str
            ))
            conn.commit()

        logger.info(f"Recorded asset in database: {asset_data['asset_id']} ({asset_data['file_url']})")
        return asset_data

    async def list_assets(
        self,
        incident_id: Optional[str] = None,
        asset_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM assets WHERE 1=1"
        params: List[Any] = []

        if incident_id:
            query += " AND incident_id = ?"
            params.append(incident_id)
        if asset_type:
            query += " AND asset_type = ?"
            params.append(asset_type)

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    async def get_asset(self, asset_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM assets WHERE asset_id = ?", (asset_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    async def get_asset_stats(self) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*), COALESCE(SUM(size_bytes), 0) FROM assets")
            total_count, total_bytes = cursor.fetchone()

            cursor.execute("SELECT asset_type, COUNT(*) FROM assets GROUP BY asset_type")
            by_type = {row[0]: row[1] for row in cursor.fetchall()}

        return {
            "total_assets": total_count,
            "total_bytes": total_bytes,
            "total_mb": round(total_bytes / (1024 * 1024), 2),
            "breakdown_by_type": by_type
        }


# Global repository instance
_sqlite_repo_instance: Optional[SQLiteIncidentRepository] = None


def get_sqlite_repository() -> SQLiteIncidentRepository:
    global _sqlite_repo_instance
    if _sqlite_repo_instance is None:
        _sqlite_repo_instance = SQLiteIncidentRepository()
    return _sqlite_repo_instance
