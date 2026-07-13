import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'alerts.db')

class AlertService:
    @staticmethod
    def init_db():
        """Initializes the database and table for alerts."""
        db_dir = os.path.dirname(DB_PATH)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)
            
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_name TEXT,
                email TEXT,
                crop TEXT,
                target_price REAL,
                notification_enabled BOOLEAN
            )
        ''')
        conn.commit()
        conn.close()

    @staticmethod
    def add_alert(user_id, user_name, email, crop, target_price, notification_enabled):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO alerts (user_id, user_name, email, crop, target_price, notification_enabled)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, user_name, email, crop, target_price, notification_enabled))
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
            cursor.execute('SELECT * FROM alerts WHERE user_id = ?', (user_id,))
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
            cursor.execute('DELETE FROM alerts WHERE id = ? AND user_id = ?', (alert_id, user_id))
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
            cursor.execute('SELECT * FROM alerts WHERE notification_enabled = 1')
            rows = cursor.fetchall()
            conn.close()
            return [dict(row) for row in rows], None
        except Exception as e:
            logger.error(f"Error getting active alerts: {e}")
            return [], str(e)

# Initialize DB on import
AlertService.init_db()
