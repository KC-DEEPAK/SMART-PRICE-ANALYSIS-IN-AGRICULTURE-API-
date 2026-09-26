import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { ADMIN_STATS_API_URL, ADMIN_USERS_API_URL } from "../utils/api";
import "./AdminDashboardPage.css";

export default function AdminDashboardPage() {
  const { isAdmin, isCheckingAdmin, isLoaded, user } = useAdminAuth();

  const [stats, setStats] = useState({
    total_users: 0,
    total_farmers: 0,
    total_alerts: 0,
    active_devices: 0,
    admin_email: "deepakkcdeepu77@gmail.com",
    status: "Operational",
  });

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const userId = user?.id || "";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  // ────────── Fetch Admin Dashboard Data ──────────
  const fetchDashboardData = useCallback(async (query = "") => {
    if (!userId || !userEmail) return;

    setLoadingData(true);
    setErrorMsg("");

    const headers = {
      "x-clerk-user-id": userId,
      "x-clerk-user-email": userEmail,
    };

    try {
      // 1. Fetch Stats
      const statsRes = await fetch(ADMIN_STATS_API_URL, { headers });
      const statsData = await statsRes.json();

      if (statsRes.status === 403 || !statsData.success) {
        setErrorMsg(statsData.error || "Admin authorization required");
        setLoadingData(false);
        return;
      }

      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }

      // 2. Fetch Users
      const url = query
        ? `${ADMIN_USERS_API_URL}?q=${encodeURIComponent(query)}`
        : ADMIN_USERS_API_URL;

      const usersRes = await fetch(url, { headers });
      const usersData = await usersRes.json();

      if (usersData.success && Array.isArray(usersData.users)) {
        setUsers(usersData.users);
      } else if (usersData.error) {
        setErrorMsg(usersData.error);
      }
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
      setErrorMsg("Failed to connect to backend Admin API. Please check server.");
    } finally {
      setLoadingData(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    if (isAdmin && userId && userEmail) {
      fetchDashboardData(searchQuery);
    }
  }, [isAdmin, userId, userEmail, fetchDashboardData, searchQuery]);

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // ────────── Wait for Auth Verification ──────────
  if (!isLoaded || isCheckingAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-loading-box">
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          Verifying Admin Credentials & Permissions...
        </div>
      </div>
    );
  }

  // ────────── Access Denied for Non-Admin Users ──────────
  if (!isAdmin) {
    return (
      <div className="admin-denied-wrapper">
        <div className="admin-denied-card">
          <div className="admin-denied-icon">🚫</div>
          <h2 className="admin-denied-title">Access Denied (HTTP 403)</h2>
          <p className="admin-denied-msg">
            You do not have administrative privileges to access this page. The Admin Portal is restricted strictly to authorized admin accounts.
          </p>
          <Link to="/dashboard" className="admin-btn admin-btn--primary">
            🏠 Return to Farmer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* ── Admin Hero Banner ── */}
      <div className="admin-hero">
        <div>
          <h1 className="admin-hero__title">
            👑 Krishi Mitra Admin Portal
          </h1>
          <p className="admin-hero__sub">
            Authorized Admin: <strong>{userEmail}</strong> &bull; System Monitoring &amp; Registered Farmer Management
          </p>
        </div>
        <div className="admin-hero__actions">
          <button
            className="admin-btn admin-btn--light"
            onClick={() => fetchDashboardData(searchQuery)}
            title="Refresh Admin Data"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {errorMsg && (
        <div style={{
          background: "#fee2e2",
          color: "#991b1b",
          padding: "14px 20px",
          borderRadius: "12px",
          marginBottom: "20px",
          fontSize: "14px",
          fontWeight: 500,
          border: "1px solid #fca5a5"
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* ── Summary Stat Cards ── */}
      <div className="admin-stats-grid">
        {/* Total Registered Farmers */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--green">
            👨‍🌾
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-val">{stats.total_farmers ?? 0}</span>
            <span className="admin-stat-lbl">Registered Farmers</span>
          </div>
        </div>

        {/* Total Registered Users */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--blue">
            👥
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-val">{stats.total_users ?? 0}</span>
            <span className="admin-stat-lbl">Total Registered Users</span>
          </div>
        </div>

        {/* Total Price Alerts */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--amber">
            🔔
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-val">{stats.total_alerts ?? 0}</span>
            <span className="admin-stat-lbl">Active Price Alerts</span>
          </div>
        </div>

        {/* Active Devices / Tokens */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--purple">
            📱
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-val">{stats.active_devices ?? 0}</span>
            <span className="admin-stat-lbl">Registered Devices (FCM)</span>
          </div>
        </div>
      </div>

      {/* ── Registered Farmers / Users Table Panel ── */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">
            📋 Registered Farmers &amp; Users
            <span className="admin-panel-badge">{users.length} Total</span>
          </h2>

          {/* Search Box */}
          <div className="admin-search-wrapper">
            <span className="admin-search-icon">🔍</span>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by Name or Email..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {loadingData ? (
          <div className="admin-loading-box">
            ⏳ Loading registered users...
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            <span className="admin-empty-icon">📭</span>
            <p style={{ fontWeight: 600, fontSize: "16px", color: "#334155" }}>
              {searchQuery ? "No matching farmers found." : "No registered farmers logged in yet."}
            </p>
            <p style={{ fontSize: "13px" }}>
              {searchQuery ? "Try clearing your search query." : "When farmers log in via Clerk, they will automatically appear here."}
            </p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Farmer / User Name</th>
                  <th>Gmail / Email</th>
                  <th>Clerk User ID</th>
                  <th>Role</th>
                  <th>Registration Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.user_id || idx}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {u.name || "Farmer"}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: "#334155" }}>{u.email || "N/A"}</span>
                    </td>
                    <td>
                      <code className="user-id-code" title={u.user_id}>
                        {u.user_id ? (u.user_id.length > 18 ? `${u.user_id.substring(0, 18)}...` : u.user_id) : "N/A"}
                      </code>
                    </td>
                    <td>
                      {u.role === "Admin" ? (
                        <span className="role-badge role-badge--admin">
                          👑 Admin
                        </span>
                      ) : (
                        <span className="role-badge role-badge--farmer">
                          👨‍🌾 Farmer
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>
                        {u.created_at || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className="status-pill">
                        <span className="status-dot"></span>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
