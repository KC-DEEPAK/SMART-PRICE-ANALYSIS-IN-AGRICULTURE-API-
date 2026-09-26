import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useUser,
} from "@clerk/clerk-react";

import Navbar from "./components/Navbar";
import AppLayout from "./components/AppLayout";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import ComparisonPage from "./pages/ComparisonPage";
import PriceListPage from "./pages/PriceListPage";
import AccountPage from "./pages/AccountPage";
import FertilizerPage from "./pages/FertilizerPage";
import DiseaseFertilizerPage from "./pages/DiseaseFertilizerPage";
import SeasonGuidePage from "./pages/SeasonGuidePage";
import MapPage from "./pages/MapPage";
import PriceAlertPage from "./pages/PriceAlertPage";
import SeedRecommendationPage from "./pages/SeedRecommendationPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import Chatbot from "./components/Chatbot";
import UserSync from "./components/UserSync";
import { useAdminAuth } from "./hooks/useAdminAuth";

// Helper component for protected routes requiring Clerk Authentication
function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

// Helper component for routes requiring authorized Admin role
function AdminProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useUser();
  const { isAdmin, isCheckingAdmin } = useAdminAuth();

  if (!isLoaded || isCheckingAdmin) {
    return (
      <div className="page-container" style={{ padding: "40px", textAlign: "center" }}>
        <p>⏳ Verifying admin access permissions...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  if (!isAdmin) {
    return (
      <div className="page-container" style={{ padding: "40px", textAlign: "center" }}>
        <div className="agri-card" style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: "#dc2626", marginTop: 0 }}>🚫 Access Denied (HTTP 403)</h2>
          <p style={{ color: "#64748b", margin: "15px 0" }}>
            You do not have permission to view the Admin Portal. This area is reserved for authorized administrators.
          </p>
          <a href="/dashboard" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
            🏠 Return to Farmer Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}

// Layout wrapper for application routes
function ApplicationLayoutWrapper() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

// Temporary placeholder for Smart Sell
function SmartSellPlaceholder() {
  return (
    <div
      className="page-container"
      style={{ padding: "40px", textAlign: "center" }}
    >
      <div className="agri-card">
        <h2>💡 Smart Selling Decision Engine</h2>

        <p style={{ color: "#666", marginTop: "10px" }}>
          Calculate true net returns based on market price, travel distance,
          and estimated transport costs.
        </p>

        <p
          style={{
            fontWeight: "bold",
            color: "var(--primary-green)",
            marginTop: "20px",
          }}
        >
          🚀 Coming in Phase 2 Implementation!
        </p>
      </div>
    </div>
  );
}

// Temporary placeholder for Crop Health
function CropHealthPlaceholder() {
  return (
    <div
      className="page-container"
      style={{ padding: "40px", textAlign: "center" }}
    >
      <div className="agri-card">
        <h2>🔬 AI Crop Health & Leaf Scanner</h2>

        <p style={{ color: "#666", marginTop: "10px" }}>
          Upload leaf images for automated computer vision disease
          identification and treatment recommendations.
        </p>

        <p
          style={{
            fontWeight: "bold",
            color: "var(--primary-green)",
            marginTop: "20px",
          }}
        >
          🚀 Coming in Phase 3 Implementation!
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <UserSync />
      <BrowserRouter>
        <Routes>

          {/* PUBLIC LANDING PAGE */}
          <Route
            path="/"
            element={
              <>
                <Navbar />
                <LandingPage />
              </>
            }
          />

          {/* APPLICATION PAGES */}
          <Route element={<ApplicationLayoutWrapper />}>

            {/* Public App Tools */}
            <Route
              path="/price-list"
              element={<PriceListPage />}
            />

            <Route
              path="/comparison"
              element={<ComparisonPage />}
            />

            <Route
              path="/map"
              element={<MapPage />}
            />

            <Route
              path="/fertilizer"
              element={<FertilizerPage />}
            />

            <Route
              path="/season-guide"
              element={<SeasonGuidePage />}
            />

            <Route
              path="/disease-guide"
              element={<DiseaseFertilizerPage />}
            />

            <Route
              path="/seed-recommendation"
              element={<SeedRecommendationPage />}
            />


            {/* Protected Farmer Features */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/smart-sell"
              element={
                <ProtectedRoute>
                  <SmartSellPlaceholder />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crop-health"
              element={
                <ProtectedRoute>
                  <CropHealthPlaceholder />
                </ProtectedRoute>
              }
            />

            <Route
              path="/price-alerts"
              element={
                <ProtectedRoute>
                  <PriceAlertPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Admin Portal */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminDashboardPage />
                </AdminProtectedRoute>
              }
            />

          </Route>
        </Routes>

        {/* Global Floating AI Chatbot */}
        <Chatbot />

      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;