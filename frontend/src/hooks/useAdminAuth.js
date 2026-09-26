import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { ADMIN_CHECK_API_URL } from "../utils/api";

export function useAdminAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user?.id) {
      setIsAdmin(false);
      setIsCheckingAdmin(false);
      return;
    }

    const userId = user.id;
    const userEmail = user.primaryEmailAddress?.emailAddress || "";

    setIsCheckingAdmin(true);

    fetch(ADMIN_CHECK_API_URL, {
      method: "GET",
      headers: {
        "x-clerk-user-id": userId,
        "x-clerk-user-email": userEmail,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.is_admin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      })
      .catch((err) => {
        console.error("Admin check failed:", err);
        setIsAdmin(false);
      })
      .finally(() => {
        setIsCheckingAdmin(false);
      });
  }, [isLoaded, isSignedIn, user]);

  return { isAdmin, isCheckingAdmin, isLoaded, user };
}
