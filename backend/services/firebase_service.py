import os
import json
import firebase_admin
from firebase_admin import credentials, messaging


# Initialize Firebase only once
if not firebase_admin._apps:

    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    if not firebase_json:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is missing"
        )

    try:
        firebase_credentials = json.loads(firebase_json)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"Invalid FIREBASE_SERVICE_ACCOUNT_JSON: {e}"
        )

    cred = credentials.Certificate(firebase_credentials)

    firebase_admin.initialize_app(cred)


class FirebaseService:

    @staticmethod
    def send_notification(fcm_token, title, body):

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

            print(
                f"FCM notification sent successfully: {response}"
            )

            return True, response

        except Exception as e:

            print(
                f"FCM notification failed: {e}"
            )

            return False, str(e)