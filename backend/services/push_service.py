import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "data",
    "alerts.db"
)


class PushService:

    @staticmethod
    def init_db():
        """Create the device_tokens table if it doesn't exist."""

        db_dir = os.path.dirname(DB_PATH)

        if not os.path.exists(db_dir):
            os.makedirs(db_dir)

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS device_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                fcm_token TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        conn.close()

    @staticmethod
    def save_token(user_id, fcm_token):
        """Save or update an FCM token for a user."""

        if not user_id:
            return False, "User ID is missing"

        if not fcm_token:
            return False, "FCM token is missing"

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            # If this token already exists, update its user
            cursor.execute("""
                INSERT INTO device_tokens (user_id, fcm_token)
                VALUES (?, ?)
                ON CONFLICT(fcm_token)
                DO UPDATE SET
                    user_id = excluded.user_id
            """, (user_id, fcm_token))

            conn.commit()
            conn.close()

            logger.info(
                f"FCM token saved successfully for user: {user_id}"
            )

            return True, "FCM token saved successfully"

        except Exception as e:
            logger.error(f"Error saving FCM token: {e}")
            return False, str(e)

    @staticmethod
    def get_user_tokens(user_id):
        """Get all FCM tokens belonging to a user."""

        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("""
                SELECT fcm_token
                FROM device_tokens
                WHERE user_id = ?
            """, (user_id,))

            rows = cursor.fetchall()
            conn.close()

            return [row["fcm_token"] for row in rows], None

        except Exception as e:
            logger.error(f"Error getting user FCM tokens: {e}")
            return [], str(e)


# Initialize database when this service is imported
PushService.init_db()