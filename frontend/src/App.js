import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from "@clerk/clerk-react";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import ComparisonPage from "./pages/ComparisonPage";
import PriceListPage from "./pages/PriceListPage";
import LoginPage from "./pages/LoginPage";
import AccountPage from "./pages/AccountPage";
import FertilizerPage from "./pages/FertilizerPage";
import DiseaseFertilizerPage from "./pages/DiseaseFertilizerPage";
import SeasonGuidePage from "./pages/SeasonGuidePage";
import MapPage from "./pages/MapPage";
import PriceAlertPage from "./pages/PriceAlertPage";
import Chatbot from "./components/Chatbot";


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        <SignedIn>
          <Navbar />

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/price-list" element={<PriceListPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/fertilizer" element={<FertilizerPage />} />
            <Route path="/season-guide" element={<SeasonGuidePage />} />
            <Route path="/disease-guide" element={<DiseaseFertilizerPage />} />
            <Route path="/map" element={<MapPage />} />
            {/* 🔔 Price Alerts — email notification feature */}
            <Route path="/price-alerts" element={<PriceAlertPage />} />

          </Routes>

          <Chatbot />
        </SignedIn>

        <SignedOut>
          <RedirectToSignIn />
        </SignedOut>

      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;