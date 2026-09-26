import sqlite3
import os
import logging
import datetime
import urllib.request
import json
from config import Config

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "data",
    "alerts.db"
)


class UserService:

    @staticmethod
    def init_db():
        """Initialize the database table for users."""
        db_dir = os.path.dirname(DB_PATH)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                role TEXT DEFAULT 'Farmer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        conn.close()

    @staticmethod
    def get_admin_email():
        """Get lowercased admin email from configuration."""
        admin_email = os.getenv("ADMIN_EMAIL", getattr(Config, "ADMIN_EMAIL", "deepakkcdeepu77@gmail.com"))
        if not admin_email:
            admin_email = "deepakkcdeepu77@gmail.com"
        return admin_email.strip().lower()

    @staticmethod
    def is_admin_email(email):
        """Check if an email matches the configured admin email."""
        if not email:
            return False
        return email.strip().lower() == UserService.get_admin_email()

    @staticmethod
    def sync_user(user_id, name, email):
        """
        Upsert a user record on login/activity.
        Automatically sets role to Admin if email matches ADMIN_EMAIL.
        """
        if not user_id:
            return False, "User ID is required"

        email_clean = (email or "").strip().lower()
        name_clean = (name or "Farmer").strip()
        role = "Admin" if UserService.is_admin_email(email_clean) else "Farmer"

        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Check existing user
            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            existing = cursor.fetchone()

            if existing:
                # Update user record
                cursor.execute("""
                    UPDATE users
                    SET name = ?, email = COALESCE(NULLIF(?, ''), email), role = ?, last_seen = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                """, (name_clean, email_clean, role, user_id))
            else:
                # Insert new user
                cursor.execute("""
                    INSERT INTO users (user_id, name, email, role, created_at, last_seen)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (user_id, name_clean, email_clean, role))

            conn.commit()

            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            updated_row = cursor.fetchone()
            conn.close()

            user_dict = dict(updated_row) if updated_row else {}
            return True, user_dict

        except Exception as e:
            logger.error(f"Error syncing user: {e}")
            return False, str(e)

    @staticmethod
    def get_user_by_id(user_id):
        """Fetch user record by Clerk user ID."""
        if not user_id:
            return None
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            conn.close()
            return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
            return None

    @staticmethod
    def verify_admin_request(request):
        """
        Backend authorization check for Admin APIs.
        Verifies request headers and stored user record.
        Returns: (is_admin, error_message, status_code)
        """
        user_id = request.headers.get("x-clerk-user-id")
        if not user_id:
            return False, "Unauthorized: Clerk user ID is missing", 401

        user_email = request.headers.get("x-clerk-user-email")

        # Lookup in local DB if email not passed in header or to verify consistency
        db_user = UserService.get_user_by_id(user_id)
        if db_user and db_user.get("email"):
            user_email = db_user.get("email")

        # If email still unknown and CLERK_SECRET_KEY is present, query Clerk API
        clerk_secret = getattr(Config, "CLERK_SECRET_KEY", None) or os.getenv("CLERK_SECRET_KEY")
        if not user_email and clerk_secret:
            try:
                url = f"https://api.clerk.com/v1/users/{user_id}"
                req = urllib.request.Request(url, headers={"Authorization": f"Bearer {clerk_secret}"})
                with urllib.request.urlopen(req) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode())
                        emails = data.get("email_addresses", [])
                        if emails:
                            user_email = emails[0].get("email_address")
                            # Sync this user
                            name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or "Farmer"
                            UserService.sync_user(user_id, name, user_email)
            except Exception as e:
                logger.warning(f"Failed to query Clerk API for user verification: {e}")

        if not user_email:
            # If we only have user_id, check if user is already synced as Admin in DB
            if db_user and db_user.get("role") == "Admin":
                return True, user_id, 200
            return False, "Admin access required", 403

        if UserService.is_admin_email(user_email):
            # Ensure DB has role=Admin for this user_id
            if not db_user or db_user.get("role") != "Admin":
                UserService.sync_user(user_id, "Admin User", user_email)
            return True, user_id, 200

        return False, "Admin access required", 403

    @staticmethod
    def get_all_users(search_query=None):
        """
        Fetch registered users list for Admin Dashboard.
        Merges Clerk API users (if available) with local DB users & alerts users.
        """
        users_map = {}

        # 1. Try fetching from Clerk Backend REST API if secret key exists
        clerk_secret = getattr(Config, "CLERK_SECRET_KEY", None) or os.getenv("CLERK_SECRET_KEY")
        if clerk_secret:
            try:
                url = "https://api.clerk.com/v1/users?limit=500"
                req = urllib.request.Request(url, headers={"Authorization": f"Bearer {clerk_secret}"})
                with urllib.request.urlopen(req) as response:
                    if response.status == 200:
                        clerk_users = json.loads(response.read().decode())
                        for cu in clerk_users:
                            uid = cu.get("id")
                            first = cu.get("first_name") or ""
                            last = cu.get("last_name") or ""
                            name = f"{first} {last}".strip() or "Farmer"
                            emails = cu.get("email_addresses", [])
                            primary_id = cu.get("primary_email_address_id")
                            email = ""
                            for e in emails:
                                if e.get("id") == primary_id or not email:
                                    email = e.get("email_address", "")
                            
                            created_ts = cu.get("created_at")
                            created_str = ""
                            if created_ts:
                                try:
                                    created_str = datetime.datetime.fromtimestamp(created_ts / 1000.0).strftime("%Y-%m-%d %H:%M")
                                except Exception:
                                    created_str = str(created_ts)

                            role = "Admin" if UserService.is_admin_email(email) else "Farmer"
                            
                            users_map[uid] = {
                                "user_id": uid,
                                "name": name,
                                "email": email,
                                "role": role,
                                "created_at": created_str or "N/A",
                                "last_seen": "Active",
                                "status": "Active"
                            }
            except Exception as e:
                logger.warning(f"Could not fetch users directly from Clerk API: {e}")

        # 2. Merge/fallback to local DB users
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM users ORDER BY created_at DESC")
            db_rows = cursor.fetchall()

            for row in db_rows:
                r_dict = dict(row)
                uid = r_dict.get("user_id")
                email = r_dict.get("email", "")
                role = "Admin" if UserService.is_admin_email(email) else r_dict.get("role", "Farmer")
                
                if uid not in users_map:
                    users_map[uid] = {
                        "user_id": uid,
                        "name": r_dict.get("name") or "Farmer",
                        "email": email,
                        "role": role,
                        "created_at": str(r_dict.get("created_at") or "N/A"),
                        "last_seen": str(r_dict.get("last_seen") or "Active"),
                        "status": "Active"
                    }
                else:
                    # Update local specific fields if richer
                    users_map[uid]["role"] = role
                    if r_dict.get("name") and users_map[uid]["name"] == "Farmer":
                        users_map[uid]["name"] = r_dict.get("name")

            # 3. Check alerts table for any additional registered users
            cursor.execute("SELECT DISTINCT user_id, user_name, email FROM alerts")
            alert_users = cursor.fetchall()
            for au in alert_users:
                au_dict = dict(au)
                uid = au_dict.get("user_id")
                if uid and uid not in users_map:
                    email = au_dict.get("email", "")
                    role = "Admin" if UserService.is_admin_email(email) else "Farmer"
                    users_map[uid] = {
                        "user_id": uid,
                        "name": au_dict.get("user_name") or "Farmer",
                        "email": email,
                        "role": role,
                        "created_at": "N/A",
                        "last_seen": "Active",
                        "status": "Active"
                    }

            conn.close()
        except Exception as e:
            logger.error(f"Error reading local users database: {e}")

        users_list = list(users_map.values())

        # Filter by search query if provided
        if search_query:
            q = search_query.strip().lower()
            users_list = [
                u for u in users_list
                if q in u.get("name", "").lower() or q in u.get("email", "").lower() or q in u.get("user_id", "").lower()
            ]

        return users_list

    @staticmethod
    def get_admin_stats():
        """Compute system stats for Admin Dashboard."""
        users_list = UserService.get_all_users()
        total_users = len(users_list)
        total_farmers = len([u for u in users_list if u.get("role") != "Admin"])
        
        total_alerts = 0
        total_devices = 0

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) FROM alerts")
            total_alerts = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM device_tokens")
            total_devices = cursor.fetchone()[0]

            conn.close()
        except Exception as e:
            logger.error(f"Error fetching stats counts: {e}")

        return {
            "total_users": total_users,
            "total_farmers": total_farmers,
            "total_alerts": total_alerts,
            "active_devices": total_devices,
            "admin_email": UserService.get_admin_email(),
            "status": "Operational"
        }


# Initialize DB on module load
UserService.init_db()
