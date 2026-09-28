import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import LanguageToggle from "./LanguageToggle";
import { UserButton } from "@clerk/clerk-react";
import { API_URL } from "../utils/api";
import "./Header.css";

function Header({ isSidebarCollapsed, toggleSidebar, toggleMobileMenu }) {
  const [dataStatus, setDataStatus] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/status`)
      .then(res => res.json())
      .then(json => {
        if (json && json.success) {
          setDataStatus(json);
        }
      })
      .catch(() => {});
  }, []);

  const renderStatusPill = () => {
    if (!dataStatus) return null;
    const source = dataStatus.source;
    if (source === "live" || dataStatus.is_live) {
      return (
        <span
          title="Connected live to Government Agmarknet API"
          style={{
            fontSize: "12px",
            background: "rgba(34, 197, 94, 0.15)",
            color: "#15803d",
            border: "1px solid #86efac",
            padding: "2px 8px",
            borderRadius: "12px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          🟢 Live Data
        </span>
      );
    } else if (source === "cache") {
      return (
        <span
          title="Government API down/slow; using latest cached dataset"
          style={{
            fontSize: "12px",
            background: "rgba(234, 179, 8, 0.15)",
            color: "#a16207",
            border: "1px solid #fde047",
            padding: "2px 8px",
            borderRadius: "12px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          🟡 Cached Data
        </span>
      );
    } else {
      return (
        <span
          title="Using fallback dataset"
          style={{
            fontSize: "12px",
            background: "rgba(249, 115, 22, 0.15)",
            color: "#c2410c",
            border: "1px solid #fdba74",
            padding: "2px 8px",
            borderRadius: "12px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          🟠 Fallback Data
        </span>
      );
    }
  };

  return (
    <header className="app-top-header">
      <div className="header-left">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          className="header-icon-btn mobile-hamburger"
          onClick={toggleMobileMenu}
          title="Toggle Navigation Menu"
          aria-label="Toggle Mobile Menu"
        >
          ☰
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          className="header-icon-btn desktop-collapse-btn"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isSidebarCollapsed ? "▶" : "◀"}
        </button>

        {/* Brand Logo & Title */}
        <Link to="/" className="header-brand">
          <span className="header-logo-icon">🌾</span>
          <span className="header-brand-title">KRISHI MITRA</span>
        </Link>

        {/* Status Indicator */}
        <div style={{ marginLeft: "10px" }}>{renderStatusPill()}</div>
      </div>

      <div className="header-right">
        {/* Price Alerts / Notification Icon */}
        <Link to="/price-alerts" className="header-icon-btn notification-btn" title="Price Alerts & Notifications">
          🔔
          <span className="notification-badge-dot"></span>
        </Link>

        {/* Multi-language Selector */}
        <div className="header-lang-wrapper">
          <LanguageToggle />
        </div>

        {/* Clerk User Avatar Button */}
        <div className="header-user-wrapper">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}

export default Header;

