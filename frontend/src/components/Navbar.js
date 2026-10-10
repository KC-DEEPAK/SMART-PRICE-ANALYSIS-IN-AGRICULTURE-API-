import { NavLink } from "react-router-dom";
import { useState } from "react";
import LanguageToggle from "./LanguageToggle";
import { useLanguage } from "../context/LanguageContext";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react";
import "./Navbar.css";

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { isAdmin } = useAdminAuth();

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
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="logo-icon">🌾</span>
          <span className="logo-text">KRISHI MITRA</span>
        </NavLink>
      </div>

      {/* MOBILE TOGGLE */}
      <button className="mobile-menu-btn" onClick={toggleMenu}>
        {isMobileMenuOpen ? "✖" : "☰"}
      </button>

      {/* RIGHT */}
      <div className={`navbar-right ${isMobileMenuOpen ? "open" : ""}`}>
        {/* PUBLIC LINKS */}
        <NavLink to="/" className="nav-link" onClick={closeMenu}>
          🏠 {t.home || "Home"}
        </NavLink>

        <NavLink to="/price-list" className="nav-link" onClick={closeMenu}>
          📋 {t.priceList || "Crop Prices"}
        </NavLink>

        <NavLink to="/comparison" className="nav-link" onClick={closeMenu}>
          ⚖️ {t.comparison || "Comparison"}
        </NavLink>



        {/* PROTECTED LINKS (ONLY WHEN SIGNED IN) */}
        <SignedIn>
          <NavLink to="/dashboard" className="nav-link" onClick={closeMenu}>
            📊 {t.dashboard || "Dashboard"}
          </NavLink>

          <NavLink to="/smart-sell" className="nav-link" onClick={closeMenu}>
            💡 {t.smartSell || "Smart Sell"}
          </NavLink>

          <NavLink to="/crop-health" className="nav-link" onClick={closeMenu}>
            🔬 {t.cropHealth || "Crop Health"}
          </NavLink>

          <NavLink to="/price-alerts" className="nav-link" onClick={closeMenu}>
            🔔 {t.priceAlerts || "Alerts"}
          </NavLink>

          {isAdmin && (
            <NavLink to="/admin" className="nav-link" style={{ color: "#eab308", fontWeight: "bold" }} onClick={closeMenu}>
              👑 Admin Portal
            </NavLink>
          )}

          <NavLink to="/account" className="nav-link account-btn" onClick={closeMenu}>
            👤 {t.account || "Account"}
          </NavLink>

          <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>

        {/* SIGNED OUT BUTTONS */}
        <SignedOut>
          <SignInButton mode="modal">
            <button className="btn-primary" style={{ padding: "8px 16px", fontSize: "14px", marginLeft: "10px" }}>
              🔑 Login / Get Started
            </button>
          </SignInButton>
        </SignedOut>

        {/* 🌐 LANGUAGE TOGGLE */}
        <div style={{ marginLeft: "10px" }}>
          <LanguageToggle />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
