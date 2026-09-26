import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { USER_SYNC_API_URL } from "../utils/api";

export default function UserSync() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user?.id) {
      const email = user.primaryEmailAddress?.emailAddress || "";
      const name = user.fullName || user.firstName || "Farmer";

      fetch(USER_SYNC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clerk-user-id": user.id,
          "x-clerk-user-email": email,
        },
        body: JSON.stringify({
          name: name,
          email: email,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("👤 User synchronized with backend database.");
          }
        })
        .catch((err) => {
          console.warn("User sync warning:", err);
        });
    }
  }, [isSignedIn, user]);

  return null;
}
