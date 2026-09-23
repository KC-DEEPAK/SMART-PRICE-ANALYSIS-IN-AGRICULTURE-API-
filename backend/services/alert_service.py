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


class AlertService:

    @staticmethod
    def init_db():
        """Initialize the database and required tables."""

        db_dir = os.path.dirname(DB_PATH)

        if not os.path.exists(db_dir):
            os.makedirs(db_dir)

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Price alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_name TEXT,
                email TEXT,
                crop TEXT,
                target_price REAL,
                notification_enabled BOOLEAN
            )
        """)

        # FCM device tokens table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS device_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                fcm_token TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        conn.close()

    @staticmethod
    def add_alert(
        user_id,
        user_name,
        email,
        crop,
        target_price,
        notification_enabled
    ):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO alerts (
                    user_id,
                    user_name,
                    email,
                    crop,
                    target_price,
                    notification_enabled
                )
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                user_name,
                email,
                crop,
                target_price,
                notification_enabled
            ))

            conn.commit()
            conn.close()

            return True, "Alert Saved Successfully"

        except Exception as e:
            logger.error(f"Error adding alert: {e}")
            return False, str(e)

    @staticmethod
    def get_alerts(user_id):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute(
                "SELECT * FROM alerts WHERE user_id = ?",
                (user_id,)
            )

            rows = cursor.fetchall()
            conn.close()

            return [dict(row) for row in rows], None

        except Exception as e:
            logger.error(f"Error getting alerts: {e}")
            return [], str(e)

    @staticmethod
    def delete_alert(alert_id, user_id):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            cursor.execute(
                """
                DELETE FROM alerts
                WHERE id = ? AND user_id = ?
                """,
                (alert_id, user_id)
            )

            conn.commit()
            conn.close()

            return True, None

        except Exception as e:
            logger.error(f"Error deleting alert: {e}")
            return False, str(e)

    @staticmethod
    def get_all_active_alerts():
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT *
                FROM alerts
                WHERE notification_enabled = 1
                """
            )

            rows = cursor.fetchall()
            conn.close()

            return [dict(row) for row in rows], None

        except Exception as e:
            logger.error(f"Error getting active alerts: {e}")
            return [], str(e)

    # =========================================================
    # FCM DEVICE TOKEN METHODS
    # =========================================================

    @staticmethod
    def save_device_token(user_id, fcm_token):
        """
        Save or update an FCM token for a user.
        """

        if not fcm_token:
            return False, "FCM token is required"

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO device_tokens (user_id, fcm_token)
                VALUES (?, ?)
                ON CONFLICT(fcm_token)
                DO UPDATE SET
                    user_id = excluded.user_id,
                    created_at = CURRENT_TIMESTAMP
            """, (
                user_id,
                fcm_token
            ))

            conn.commit()
            conn.close()

            logger.info(
                f"FCM device token saved for user: {user_id}"
            )

            return True, "Device token saved successfully"

        except Exception as e:
            logger.error(
                f"Error saving FCM device token: {e}"
            )
            return False, str(e)

    @staticmethod
    def get_device_tokens(user_id):
        """
        Get all FCM tokens belonging to a user.
        """

        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT fcm_token
                FROM device_tokens
                WHERE user_id = ?
                """,
                (user_id,)
            )

            rows = cursor.fetchall()
            conn.close()

            return [
                row["fcm_token"]
                for row in rows
            ], None

        except Exception as e:
            logger.error(
                f"Error getting FCM device tokens: {e}"
            )
            return [], str(e)


# Initialize database when this module is loaded
AlertService.init_db()