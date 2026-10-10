import React from "react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAdminAuth } from "../hooks/useAdminAuth";
import "./Sidebar.css";

function Sidebar({ isCollapsed, isMobileOpen, onCloseMobileMenu, toggleSidebar }) {
  const { t } = useLanguage();
  const { isAdmin } = useAdminAuth();

  const handleLinkClick = () => {
    if (isMobileOpen) {
      onCloseMobileMenu();
    }
  };

  const handleOpenChatbot = () => {
    window.dispatchEvent(new Event("openChatbot"));
    if (isMobileOpen) {
      onCloseMobileMenu();
    }
  };

  const navItems = [
    { path: "/", label: t.home || "Home", icon: "🏠" },
    { path: "/price-list", label: t.priceList || "Price List", icon: "📋" },
    { path: "/comparison", label: t.comparison || "Comparison", icon: "⚖️" },
    { path: "/seed-recommendation", label: t.seedRecommendation || "Seed Recommendation", icon: "🌾" },
    { path: "/dashboard", label: t.dashboard || "Dashboard", icon: "📊" },
    { path: "/smart-sell", label: t.smartSell || "Smart Sell", icon: "💡" },
    { path: "/crop-health", label: t.cropHealth || "Crop Health", icon: "🔬" },
    { path: "/price-alerts", label: t.priceAlerts || "Price Alerts", icon: "🔔" },
  ];

  if (isAdmin) {
    navItems.push({ path: "/admin", label: "Admin Portal", icon: "👑" });
  }


  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobileMenu} />
      )}

      <aside className={`app-sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-nav-container">
          <ul className="sidebar-menu">
            {navItems.map((item) => (
              <li key={item.path} className="sidebar-item">
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "active" : ""}`
                  }
                  onClick={handleLinkClick}
                  title={isCollapsed ? item.label : ""}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
                </NavLink>
              </li>
            ))}

            {/* AI Assistant Action Button */}
            <li className="sidebar-item">
              <button
                className="sidebar-link ai-assistant-btn"
                onClick={handleOpenChatbot}
                title={isCollapsed ? (t.chatbotTitle || "AI Assistant") : ""}
              >
                <span className="sidebar-icon">💬</span>
                {!isCollapsed && (
                  <span className="sidebar-label">{t.chatbotTitle || "AI Assistant"}</span>
                )}
              </button>
            </li>
          </ul>
        </div>

        {/* Footer Collapse Toggle */}
        <div className="sidebar-footer">
          <button
            className="sidebar-collapse-toggle"
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <span className="toggle-icon">{isCollapsed ? "▶" : "◀"}</span>
            {!isCollapsed && <span className="toggle-label">Collapse Menu</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
