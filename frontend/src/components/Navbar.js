import { NavLink } from "react-router-dom";
import { useState } from "react";
import LanguageToggle from "./LanguageToggle";
import { useLanguage } from "../context/LanguageContext";
import { UserButton } from "@clerk/clerk-react";
import "./Navbar.css";

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      {/* LEFT */}
      <div className="navbar-left">
        <span className="logo-icon">🌾</span>
        <span className="logo-text">Smart Crop Price</span>
      </div>

      {/* MOBILE TOGGLE */}
      <button className="mobile-menu-btn" onClick={toggleMenu}>
        {isMobileMenuOpen ? "✖" : "☰"}
      </button>

      {/* RIGHT */}
      <div className={`navbar-right ${isMobileMenuOpen ? "open" : ""}`}>
        <NavLink to="/" className="nav-link" onClick={closeMenu}>
          {t.dashboard}
        </NavLink>

        <NavLink to="/price-list" className="nav-link" onClick={closeMenu}>
          {t.priceList}
        </NavLink>

        <NavLink to="/comparison" className="nav-link" onClick={closeMenu}>
          {t.comparison}
        </NavLink>

        <NavLink to="/fertilizer" className="nav-link" onClick={closeMenu}>
          🌱 {t.fertilizer}
        </NavLink>
        
        <NavLink to="/season-guide" className="nav-link" onClick={closeMenu}>
          🌤️ Season Guide
        </NavLink>

        <NavLink to="/map" className="nav-link" onClick={closeMenu}>
          📍 Market Map
        </NavLink>

        {/* 🔔 PRICE ALERTS */}
        <NavLink to="/price-alerts" className="nav-link" onClick={closeMenu}>
          🔔 Price Alerts
        </NavLink>

        {/* 🌐 LANGUAGE TOGGLE */}
        <LanguageToggle />

        {/* ACCOUNT */}
        <NavLink to="/account" className="nav-link account-btn" onClick={closeMenu}>
          👤 {t.account}
        </NavLink>

        {/* CLERK USER BUTTON */}
        <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
