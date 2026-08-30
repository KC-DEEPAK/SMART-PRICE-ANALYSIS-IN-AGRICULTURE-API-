import os
import firebase_admin
from firebase_admin import credentials, messaging

# Path to Firebase Admin SDK service-account key
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICE_ACCOUNT_FILE = os.path.join(
    BASE_DIR,
    "krishi-mitra-9cc97-firebase-adminsdk-fbsvc-3d973fb283.json"
)

# Initialize Firebase only once
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
    firebase_admin.initialize_app(cred)


class FirebaseService:

    @staticmethod
    def send_notification(fcm_token, title, body):
        """
        Send a push notification to one Android device using FCM.
        """

        if not fcm_token:
            return False, "FCM token is missing"

        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                token=fcm_token
            )

            response = messaging.send(message)

            print(f"FCM notification sent successfully: {response}")
            return True, response

        except Exception as e:
            print(f"FCM notification failed: {e}")
            return False, str(e)