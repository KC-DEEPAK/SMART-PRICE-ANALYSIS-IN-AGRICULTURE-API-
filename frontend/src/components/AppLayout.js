import React, { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./AppLayout.css";

function AppLayout({ children }) {
  // Read persisted sidebar collapse state from localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("krishi_sidebar_collapsed") === "true";
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("krishi_sidebar_collapsed", next ? "true" : "false");
      return next;
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Top Header */}
      <Header
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        toggleMobileMenu={toggleMobileMenu}
      />

      {/* Left Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobileMenu={closeMobileMenu}
        toggleSidebar={toggleSidebar}
      />

      {/* Main App Content Area */}
      <main className={`app-main-content ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="app-main-inner">{children}</div>
      </main>
    </div>
  );
}

export default AppLayout;
