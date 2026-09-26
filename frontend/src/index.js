import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { LanguageProvider } from "./context/LanguageContext";
import { ClerkProvider, useUser } from "@clerk/clerk-react";

import { initializePushNotifications } from "./pushNotifications";

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

// Push notification initializer
function PushNotificationInitializer() {
  const { isSignedIn, user } = useUser();

  React.useEffect(() => {
    if (isSignedIn && user?.id) {
      console.log("👤 Clerk user detected:", user.id);

      initializePushNotifications(user.id);
    }
  }, [isSignedIn, user]);

  return null;
}

const root = ReactDOM.createRoot(
  document.getElementById("root")
);

root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <LanguageProvider>

        <PushNotificationInitializer />

        <App />

      </LanguageProvider>
    </ClerkProvider>
  </React.StrictMode>
);