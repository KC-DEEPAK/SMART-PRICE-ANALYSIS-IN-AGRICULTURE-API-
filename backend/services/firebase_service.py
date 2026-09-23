import os
import json
import firebase_admin
from firebase_admin import credentials, messaging


# Initialize Firebase only once
if not firebase_admin._apps:
    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    
    if not firebase_json:
        # Check local file in backend directory
        local_json_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "krishi-mitra-9cc97-firebase-adminsdk-fbsvc-3d973fb283.json"
        )
        if os.path.exists(local_json_path):
            try:
                with open(local_json_path, "r", encoding="utf-8") as f:
                    firebase_json = f.read()
            except Exception as e:
                print(f"Warning: Could not read local Firebase JSON: {e}")

    if firebase_json:
        try:
            firebase_credentials = json.loads(firebase_json)
            cred = credentials.Certificate(firebase_credentials)
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"Warning: Firebase Admin SDK initialization failed: {e}")
    else:
        print("Warning: FIREBASE_SERVICE_ACCOUNT_JSON not set. FCM push notifications disabled.")



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