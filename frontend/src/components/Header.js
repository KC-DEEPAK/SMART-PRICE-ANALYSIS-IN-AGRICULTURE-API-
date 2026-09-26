import React from "react";
import { Link } from "react-router-dom";
import LanguageToggle from "./LanguageToggle";
import { UserButton } from "@clerk/clerk-react";
import "./Header.css";

function Header({ isSidebarCollapsed, toggleSidebar, toggleMobileMenu }) {
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
