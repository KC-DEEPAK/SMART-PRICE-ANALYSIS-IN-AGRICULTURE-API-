import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { API_URL } from "../utils/api";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import "./LandingPage.css";

function LandingPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [livePrices, setLivePrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Fetch real live mandi price data from backend API
  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLivePrices(data.slice(0, 6)); // Top 6 live records for preview
        }
        setLoadingPrices(false);
      })
      .catch((err) => {
        console.error("Failed to load live prices for landing preview:", err);
        setLoadingPrices(false);
      });
  }, []);

  return (
    <div className="landing-page">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="hero-badge">
          <span>🌿 AI-POWERED AGRICULTURAL DECISION SUPPORT</span>
        </div>
        <h1 className="hero-title">
          KRISHI MITRA <br />
          <span className="hero-subtitle-gradient">Your Smart Farming Companion</span>
        </h1>
        <p className="hero-description">
          Real-time market intelligence, crop health insights and AI-powered decision support for farmers.
        </p>

        <div className="hero-actions">
          <Link to="/price-list" className="hero-btn primary-btn">
            🌾 Explore Krishi Mitra
          </Link>
          <SignedIn>
            <Link to="/dashboard" className="hero-btn secondary-btn">
              📊 Go to Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="hero-btn secondary-btn">
                🚪 Get Started / Login
              </button>
            </SignInButton>
          </SignedOut>
        </div>

        {/* Hero Feature Badges */}
        <div className="hero-stats-bar">
          <div className="stat-item">
            <span className="stat-number">500+</span>
            <span className="stat-label">Live Mandi Prices</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">4</span>
            <span className="stat-label">Languages Supported</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">100%</span>
            <span className="stat-label">Government Data Verified</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">AI</span>
            <span className="stat-label">Decision Support</span>
          </div>
        </div>
      </section>

      {/* 2. LIVE MANDI PRICES PREVIEW */}
      <section className="landing-section bg-card">
        <div className="section-header">
          <span className="section-tag">REAL-TIME DATA</span>
          <h2>📊 Live Mandi Market Prices</h2>
          <p>Verified daily market prices fetched directly from Government Agmarknet APIs.</p>
        </div>

        {loadingPrices ? (
          <div className="loading-preview">⏳ Fetching live prices from Government API...</div>
        ) : livePrices.length > 0 ? (
          <div className="prices-grid">
            {livePrices.map((item, idx) => (
              <div key={idx} className="price-preview-card">
                <div className="card-top">
                  <span className="crop-icon">🌾</span>
                  <span className="crop-name">{item.Commodity || item.commodity}</span>
                </div>
                <div className="card-location">
                  📍 {item.Market}, {item.State}
                </div>
                <div className="card-price">
                  ₹{item.Modal_x0020_Price || item.modal_price}
                  <span className="price-unit"> / quintal</span>
                </div>
                <div className="card-date">
                  📅 {item.Arrival_Date || item.arrival_date || "Today"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="loading-preview">No active mandi records currently available.</div>
        )}

        <div className="center-btn-wrapper">
          <Link to="/price-list" className="view-more-btn">
            View All Live Crop Prices →
          </Link>
        </div>
      </section>

      {/* 3. SMART SELLING DECISION PREVIEW */}
      <section className="landing-section">
        <div className="section-header">
          <span className="section-tag">PROFIT OPTIMIZATION</span>
          <h2>💡 Smart Selling Decision Engine</h2>
          <p>Don't just look at market price — calculate true net profit after transport expenses.</p>
        </div>

        <div className="decision-preview-box">
          <div className="decision-grid">
            <div className="decision-factor">
              <span className="factor-icon">📈</span>
              <h4>1. Current Market Price</h4>
              <p>Live modal rates across local & regional APMC mandis.</p>
            </div>
            <div className="decision-factor">
              <span className="factor-icon">🛣️</span>
              <h4>2. Market Distance</h4>
              <p>Precise distance calculation from your farm location.</p>
            </div>
            <div className="decision-factor">
              <span className="factor-icon">🚚</span>
              <h4>3. Transport Cost</h4>
              <p>Estimated freight charges per quintal based on vehicle type.</p>
            </div>
            <div className="decision-factor highlight">
              <span className="factor-icon">💰</span>
              <h4>4. Expected Net Return</h4>
              <p>Gross Market Price minus Transport Freight = Actual Take-Home Profit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AI CROP HEALTH PREVIEW */}
      <section className="landing-section bg-card">
        <div className="section-header">
          <span className="section-tag">PLANT HEALTH</span>
          <h2>🔬 AI Crop Health & Disease Detection</h2>
          <p>Early identification of leaf diseases with symptoms, prevention, and treatment plans.</p>
        </div>

        <div className="crop-health-preview-grid">
          <div className="health-feature-card">
            <div className="feature-icon">📸</div>
            <h3>Leaf Image Scanning</h3>
            <p>Upload a clear photo of your crop leaf for instant computer vision diagnostic analysis.</p>
          </div>
          <div className="health-feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Symptom Identification</h3>
            <p>Understand exact disease names, causes, and severity metrics for your crop.</p>
          </div>
          <div className="health-feature-card">
            <div className="feature-icon">🌿</div>
            <h3>Organic & Chemical Treatments</h3>
            <p>Get actionable, step-by-step pesticide, fertilizer, and organic remedy steps.</p>
          </div>
        </div>

        <div className="center-btn-wrapper">
          <Link to="/crop-health" className="view-more-btn">
            Explore Crop Health →
          </Link>
        </div>
      </section>



      {/* 6. AI FARMING ASSISTANT & VOICE */}
      <section className="landing-section bg-card">
        <div className="two-col-grid">
          <div>
            <span className="section-tag">24/7 AI SUPPORT</span>
            <h2>💬 Smart Farmer Assistant</h2>
            <p>
              Ask any question about crop prices, fertilizer timing, or pest control in simple everyday language. Powered by Google Gemini AI with real-time market context.
            </p>
            <ul className="feature-list">
              <li>✅ Answers tailored to current market conditions</li>
              <li>✅ Voice assistant speech output in 4 Indian languages</li>
              <li>✅ Available 24/7 on both desktop and mobile</li>
            </ul>
          </div>

          <div className="voice-card">
            <div className="voice-icon">🔊</div>
            <h3>Voice Assistance Enabled</h3>
            <p>Listen to market recommendations and fertilizer plans in Kannada, Hindi, Tamil, or English.</p>
            <div className="lang-chips">
              <span className="chip">🇮🇳 English</span>
              <span className="chip">🇮🇳 ಕನ್ನಡ (Kannada)</span>
              <span className="chip">🇮🇳 हिंदी (Hindi)</span>
              <span className="chip">🇮🇳 தமிழ் (Tamil)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRICE ALERTS & NOTIFICATIONS */}
      <section className="landing-section">
        <div className="section-header">
          <span className="section-tag">AUTOMATED NOTIFICATIONS</span>
          <h2>🔔 Custom Target Price Alerts</h2>
          <p>Set target price thresholds for your crops and receive automatic emails when market prices peak.</p>
        </div>

        <div className="alert-steps-grid">
          <div className="step-card">
            <span className="step-num">1</span>
            <h4>Select Crop & Target</h4>
            <p>Choose your commodity and set your minimum desired price per quintal.</p>
          </div>
          <div className="step-card">
            <span className="step-num">2</span>
            <h4>Continuous Monitoring</h4>
            <p>Our backend automatically scans live daily Government mandi price feeds.</p>
          </div>
          <div className="step-card">
            <span className="step-num">3</span>
            <h4>Instant Email Notification</h4>
            <p>Get notified via email the moment your target price is reached in nearby mandis.</p>
          </div>
        </div>
      </section>

      {/* 8. HOW KRISHI MITRA WORKS */}
      <section className="landing-section bg-card">
        <div className="section-header">
          <span className="section-tag">SIMPLE STEPS</span>
          <h2>🛠️ How Krishi Mitra Works</h2>
          <p>Three straightforward steps to maximize your agricultural revenue.</p>
        </div>

        <div className="workflow-grid">
          <div className="workflow-card">
            <div className="wf-icon">1️⃣</div>
            <h3>Check Market Trends</h3>
            <p>Browse live APMC mandi prices and compare crop rates across regional markets.</p>
          </div>
          <div className="workflow-card">
            <div className="wf-icon">2️⃣</div>
            <h3>Calculate Net Profit</h3>
            <p>Input harvest quantity & distance to determine exact transport costs and net returns.</p>
          </div>
          <div className="workflow-card">
            <div className="wf-icon">3️⃣</div>
            <h3>Execute Smart Sale</h3>
            <p>Receive clear SELL NOW, PARTIAL SELL, or HOLD advice based on net realizable income.</p>
          </div>
        </div>
      </section>

      {/* 9. WHY KRISHI MITRA */}
      <section className="landing-section">
        <div className="section-header">
          <span className="section-tag">OUR ADVANTAGE</span>
          <h2>⭐ Why Choose Krishi Mitra?</h2>
          <p>Built specifically to empower farmers with data-driven decision support.</p>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Traditional Farming</th>
                <th className="highlight-col">✨ Krishi Mitra</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Market Intelligence</td>
                <td>Middleman rumors & local quotes</td>
                <td className="highlight-col">Live Government API mandi prices</td>
              </tr>
              <tr>
                <td>Selling Strategy</td>
                <td>Distress selling at nearest mandi</td>
                <td className="highlight-col">Net profit ranking (Price - Transport)</td>
              </tr>
              <tr>
                <td>Crop Health Assistance</td>
                <td>Manual guesswork & delayed action</td>
                <td className="highlight-col">AI Leaf Scanner & detailed treatment guide</td>
              </tr>
              <tr>
                <td>Price Monitoring</td>
                <td>Physical trips to market</td>
                <td className="highlight-col">Automated email price alerts</td>
              </tr>
              <tr>
                <td>Language Accessibility</td>
                <td>Single language barriers</td>
                <td className="highlight-col">Multi-language text & voice synthesis</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 10. PUBLIC VS LOGGED-IN EXPERIENCE SUMMARY */}
      <section className="landing-section bg-card">
        <div className="section-header">
          <span className="section-tag">ACCESSIBILITY</span>
          <h2>🔓 Public vs. Farmer Account Features</h2>
          <p>Access core public tools instantly or log in for personalized decision features.</p>
        </div>

        <div className="two-col-grid">
          <div className="tier-card public-tier">
            <div className="tier-header">
              <h3>🌐 Public Access (No Login Required)</h3>
              <p>Instant access to market data tools</p>
            </div>
            <ul className="tier-list">
              <li>✅ Explore Live Mandi Market Prices</li>
              <li>✅ Compare Prices Between Two Crops</li>
              <li>✅ Use AI Chatbot for quick queries</li>
            </ul>
          </div>

          <div className="tier-card farmer-tier">
            <div className="tier-header">
              <h3>👤 Farmer Account (Free Clerk Login)</h3>
              <p>Personalized tools for your specific farm</p>
            </div>
            <ul className="tier-list">
              <li>🔑 Create Farmer Profile & Location</li>
              <li>🔑 Smart Selling Net Profit Calculator</li>
              <li>🔑 Configure Email Target Price Alerts</li>
              <li>🔑 Save Favorite Crops & Primary Mandis</li>
              <li>🔑 Personal Dashboard & Crop Recommendations</li>
              <li>🔑 Historical Leaf Disease Scan History</li>
            </ul>
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="hero-btn primary-btn" style={{ width: "100%" }}>
                    Create Free Farmer Account
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link to="/dashboard" className="hero-btn primary-btn" style={{ display: "block", textAlign: "center" }}>
                  Go to Your Dashboard →
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA */}
      <section className="final-cta-section">
        <h2>Ready to Make Data-Driven Farming Decisions?</h2>
        <p>Join Krishi Mitra today and optimize your crop sale profits with real-time market intelligence.</p>

        <div className="hero-actions" style={{ justifyContent: "center", marginTop: "24px" }}>
          <Link to="/price-list" className="hero-btn primary-btn">
            🌾 Browse Live Prices
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="hero-btn secondary-btn" style={{ background: "white", color: "#2e7d32" }}>
                🔑 Sign In / Register
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
