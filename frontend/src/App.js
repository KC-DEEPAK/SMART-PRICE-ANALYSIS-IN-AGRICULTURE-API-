import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CropPriceProvider } from "./context/CropPriceContext";

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
import SeasonGuidePage from "./pages/SeasonGuidePage";
import PriceAlertPage from "./pages/PriceAlertPage";
import SeedRecommendationPage from "./pages/SeedRecommendationPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import SmartSellPage from "./pages/SmartSellPage";
import CropHealthPage from "./pages/CropHealthPage";
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

function App() {
  return (
    <AuthProvider>
      <CropPriceProvider>
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
              path="/season-guide"
              element={<SeasonGuidePage />}
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
                  <SmartSellPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crop-health"
              element={
                <ProtectedRoute>
                  <CropHealthPage />
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
      </CropPriceProvider>
    </AuthProvider>
  );
}

export default App;