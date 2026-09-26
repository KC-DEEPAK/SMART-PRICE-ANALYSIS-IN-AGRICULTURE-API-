import { PushNotifications } from "@capacitor/push-notifications";
import { REGISTER_DEVICE_API_URL } from "./utils/api";

export async function initializePushNotifications(userId) {
  try {
    console.log("🔔 Initializing push notifications...");

    if (!userId) {
      console.log("⚠️ User is not logged in. Push notification setup skipped.");
      return;
    }

    // 1. Check notification permission
    let permission = await PushNotifications.checkPermissions();

    console.log(
      "Current notification permission:",
      permission.receive
    );

    if (permission.receive !== "granted") {
      permission = await PushNotifications.requestPermissions();
    }

    console.log(
      "Notification permission after request:",
      permission.receive
    );

    if (permission.receive !== "granted") {
      console.log("❌ Notification permission was not granted.");
      return;
    }

    // 2. FCM registration
    await PushNotifications.addListener(
      "registration",
      async (token) => {
        console.log("====================================");
        console.log("🔥 KRISHI MITRA FCM TOKEN");
        console.log(token.value);
        console.log("====================================");

        // Save token locally
        localStorage.setItem("fcm_token", token.value);

        // 3. Send token to Flask backend
        try {
          const response = await fetch(
            REGISTER_DEVICE_API_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-clerk-user-id": userId,
              },
              body: JSON.stringify({
                fcm_token: token.value,
              }),
            }
          );

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
          "🔔 PUSH NOTIFICATION RECEIVED:",
          notification
        );
      }
    );

    // 6. Notification tapped
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        console.log(
          "👆 PUSH NOTIFICATION TAPPED:",
          notification
        );
      }
    );

    // 7. Register device with FCM
    await PushNotifications.register();

    console.log(
      "✅ Krishi Mitra push notification registration completed."
    );
  } catch (error) {
    console.error(
      "❌ Push notification initialization failed:",
      error
    );
  }
}