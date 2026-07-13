import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import AlertForm from "../components/AlertForm";
import AlertCard from "../components/AlertCard";
import { ALERTS_API_URL, CHECK_ALERTS_API_URL } from "../utils/api";
import "./PriceAlertPage.css";

/**
 * PriceAlertPage — The main Price Alerts feature page.
 *
 * Responsibilities:
 *  1. Pull the current Clerk user's email and name — no manual entry needed.
 *  2. POST new alerts to /api/alerts with Clerk user-id in request header.
 *  3. GET the user's saved alerts on mount.
 *  4. DELETE individual alerts.
 *  5. Optionally trigger a manual check via POST /api/check-alerts.
 */
function PriceAlertPage() {
  // ────────── Clerk user info ──────────
  const { user, isLoaded } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userName  = user?.fullName || user?.firstName || "Farmer";
  const userId    = user?.id || "";

  // ────────── Local state ──────────
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAlerts, setFetchingAlerts] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [checkMsg, setCheckMsg] = useState("");

  // Helper: auth header — Clerk user-id sent to backend for auth/ownership
  const authHeaders = {
    "Content-Type": "application/json",
    "x-clerk-user-id": userId,
  };

  // ── Show a success banner and auto-clear after 4 s ──
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 4000);
  };
  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 5000);
  };

  // ────────── Fetch saved alerts ──────────
  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    setFetchingAlerts(true);
    try {
      const res = await fetch(ALERTS_API_URL, {
        headers: { "x-clerk-user-id": userId },
      });
      const json = await res.json();
      if (json.success) setAlerts(json.alerts || []);
    } catch {
      // Silently ignore fetch errors on initial load
    } finally {
      setFetchingAlerts(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isLoaded && userId) fetchAlerts();
  }, [isLoaded, userId, fetchAlerts]);

  // ────────── Save a new alert (called from AlertForm) ──────────
  const handleSave = async ({ crop, target_price, notification_enabled }) => {
    if (!userEmail) {
      showError("Could not read your email from Clerk. Please sign in again.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(ALERTS_API_URL, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          user_name: userName,
          email: userEmail,
          crop,
          target_price,
          notification_enabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess("✅ Alert Saved Successfully");
        fetchAlerts(); // Refresh list
      } else {
        showError(`❌ Failed to save: ${json.error || "Unknown error"}`);
      }
    } catch (err) {
      showError("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ────────── Delete an alert ──────────
  const handleDelete = async (alertId) => {
    try {
      const res = await fetch(`${ALERTS_API_URL}/${alertId}`, {
        method: "DELETE",
        headers: { "x-clerk-user-id": userId },
      });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        showSuccess("🗑️ Alert removed.");
      } else {
        showError("Could not delete alert. Please try again.");
      }
    } catch {
      showError("Network error while deleting.");
    }
  };

  // ────────── Manual price check trigger ──────────
  const handleCheckNow = async () => {
    setCheckMsg("⏳ Checking prices…");
    try {
      const res = await fetch(CHECK_ALERTS_API_URL, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) setCheckMsg(`✅ ${json.message}`);
      else setCheckMsg(`⚠️ ${json.error}`);
    } catch {
      setCheckMsg("❌ Network error. Could not run check.");
    }
    setTimeout(() => setCheckMsg(""), 6000);
  };

  // ────────── Wait for Clerk to load ──────────
  if (!isLoaded) {
    return (
      <div className="page-container">
        <div className="alerts-loading">⏳ Loading user info…</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="agri-card mb-4 agri-card-left-border alerts-hero">
        <div className="alerts-hero__text">
          <h2 className="alerts-hero__title">🔔 Price Alerts</h2>
          <p className="alerts-hero__sub">
            We'll email <strong>{userEmail}</strong> the moment your crop hits your target price.
          </p>
        </div>
        {/* Manual trigger for testing / production use */}
        <button className="alerts-check-btn" onClick={handleCheckNow}>
          🔍 Check Prices Now
        </button>
      </div>

      {/* ── Status Banners ── */}
      {successMsg && <div className="alert-banner alert-banner--success">{successMsg}</div>}
      {errorMsg   && <div className="alert-banner alert-banner--error">{errorMsg}</div>}
      {checkMsg   && <div className="alert-banner alert-banner--info">{checkMsg}</div>}

      {/* ── User info summary card ── */}
      <div className="alerts-user-card mb-4">
        <div className="alerts-user-card__item">
          <span className="alerts-user-card__label">👤 User</span>
          <span className="alerts-user-card__value">{userName}</span>
        </div>
        <div className="alerts-user-card__item">
          <span className="alerts-user-card__label">📧 Email</span>
          <span className="alerts-user-card__value">{userEmail || "—"}</span>
        </div>
        <div className="alerts-user-card__item">
          <span className="alerts-user-card__label">📋 Alerts</span>
          <span className="alerts-user-card__value">{alerts.length}</span>
        </div>
      </div>

      {/* ── Form + Alerts List side-by-side on desktop ── */}
      <div className="alerts-grid">
        {/* LEFT — New alert form */}
        <div className="agri-card alerts-form-panel">
          <AlertForm onSave={handleSave} loading={loading} setLoading={setLoading} />
        </div>

        {/* RIGHT — Saved alerts list */}
        <div className="alerts-list-panel">
          <h3 className="alerts-list__title">📋 Your Saved Alerts</h3>

          {fetchingAlerts ? (
            <div className="alerts-skeleton">
              {[1, 2].map((n) => (
                <div key={n} className="alerts-skeleton__card" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="alerts-empty">
              <span className="alerts-empty__icon">📭</span>
              <p>No alerts set yet.</p>
              <p className="alerts-empty__hint">Fill the form to add your first alert.</p>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Info footer ── */}
      <div className="alerts-info-box">
        <h4>ℹ️ How Price Alerts Work</h4>
        <ul>
          <li>📡 Our backend checks live Government API prices regularly.</li>
          <li>📬 When <em>Today's Price ≥ Your Target Price</em>, you'll receive an email via Resend.</li>
          <li>🔕 Toggle notifications off anytime to pause alerts without deleting them.</li>
          <li>🔑 Your Clerk-verified email is used — no manual entry needed.</li>
        </ul>
      </div>
    </div>
  );
}

export default PriceAlertPage;
