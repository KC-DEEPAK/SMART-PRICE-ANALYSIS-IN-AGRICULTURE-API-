import { PushNotifications } from "@capacitor/push-notifications";
import { REGISTER_DEVICE_API_URL } from "../utils/api";

export async function initializePushNotifications(userId) {
  try {
    // User must be logged in
    if (!userId) {
      console.error("❌ Cannot register FCM token: Clerk user ID is missing.");
      return null;
    }

    // 1. Check notification permission
    let permission = await PushNotifications.checkPermissions();

    if (permission.receive === "prompt") {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== "granted") {
      console.log("❌ Push notification permission was not granted.");
      return null;
    }

    console.log("✅ Push notification permission granted.");

    // 2. Listen for FCM registration token
    await PushNotifications.addListener(
      "registration",
      async (token) => {
        console.log("====================================");
        console.log("🔥 KRISHI MITRA FCM TOKEN");
        console.log(token.value);
        console.log("====================================");

        // Save token locally
        localStorage.setItem("fcm_token", token.value);

        // 3. Send FCM token + Clerk user ID to Flask backend
        try {
          const response = await fetch(REGISTER_DEVICE_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-clerk-user-id": userId,
            },
            body: JSON.stringify({
              fcm_token: token.value,
            }),
          });

          const result = await response.json();

          if (response.ok) {
            console.log(
              "✅ FCM token registered with backend:",
              result
            );
          } else {
            console.error(
              "❌ Backend rejected FCM token:",
              result
            );
          }
        } catch (error) {
          console.error(
            "❌ Failed to send FCM token to backend:",
            error
          );
        }
      }
    );

    // 4. Registration error
    await PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error(
          "❌ FCM registration error:",
          error
        );
      }
    );

    // 5. Notification received while app is open
    await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log(
          "🔔 Push notification received:"
        );
        console.log(notification);
      }
    );

    // 6. Notification tapped
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        console.log(
          "👆 Notification tapped:"
        );
        console.log(notification);
      }
    );

    // 7. Register device with FCM
    await PushNotifications.register();

    console.log(
      "✅ Krishi Mitra registered for push notifications."
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Push notification initialization failed:",
      error
    );

    return null;
  }
}