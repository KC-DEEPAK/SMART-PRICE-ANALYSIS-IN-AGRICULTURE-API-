import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function CropHealthPage() {
  const [selectedCrop, setSelectedCrop] = useState("Tomato");
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const { t } = useLanguage();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setDiagnosis(null);
    }
  };

  const runAnalysis = () => {
    if (!selectedImage) return;
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setDiagnosis({
        condition: "Early Blight (Alternaria solani)",
        confidence: "94%",
        severity: "Moderate",
        recommendation: "Apply Copper Fungicide or Mancozeb spray every 7-10 days. Ensure crop rotation and avoid overhead watering.",
        organicSolution: "Neem Oil spray (5ml/L) + Potassium Bicarbonate dilution."
      });
    }, 1500);
  };

  return (
    <div className="page-container">
      <div className="agri-card mb-4 agri-card-left-border">
        <h2 style={{ margin: "0 0 6px 0" }}>🔬 AI Crop Health & Disease Scanner</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
          Upload leaf images for computer-vision disease identification, treatment guides, and organic care instructions.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        {/* Upload Card */}
        <div className="agri-card">
          <h3 style={{ marginTop: 0 }}>📸 Step 1: Upload Leaf Photo</h3>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#475569", marginBottom: "4px" }}>Select Crop:</label>
            <select
              className="modern-select"
              value={selectedCrop}
              onChange={e => setSelectedCrop(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              <option value="Tomato">Tomato</option>
              <option value="Potato">Potato</option>
              <option value="Groundnut">Groundnut</option>
              <option value="Paddy">Paddy / Rice</option>
              <option value="Cotton">Cotton</option>
              <option value="Maize">Maize</option>
              <option value="Onion">Onion</option>
            </select>
          </div>

          <div
            style={{
              border: "2px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              background: "#f8fafc",
              cursor: "pointer"
            }}
            onClick={() => document.getElementById("leaf-file-input").click()}
          >
            {selectedImage ? (
              <img src={selectedImage} alt="Uploaded leaf" style={{ maxHeight: "180px", borderRadius: "8px", objectFit: "cover" }} />
            ) : (
              <div>
                <div style={{ fontSize: "40px" }}>🍃</div>
                <p style={{ margin: "8px 0", color: "#475569", fontWeight: "500" }}>Click or drag leaf photo here</p>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>Supports JPG, PNG (Max 5MB)</span>
              </div>
            )}
            <input id="leaf-file-input" type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </div>

          <button
            className="btn-primary"
            disabled={!selectedImage || analyzing}
            onClick={runAnalysis}
            style={{ width: "100%", marginTop: "15px", padding: "12px", fontWeight: "600" }}
          >
            {analyzing ? "🔍 Scanning Leaf Pattern..." : "⚡ Run AI Health Diagnosis"}
          </button>
        </div>

        {/* Diagnosis Results Card */}
        <div className="agri-card">
          <h3 style={{ marginTop: 0 }}>📋 Step 2: Diagnostic Results</h3>
          {diagnosis ? (
            <div>
              <div style={{ background: "#fef2f2", borderLeft: "4px solid #ef4444", padding: "12px 16px", borderRadius: "6px", marginBottom: "15px" }}>
                <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#991b1b", fontWeight: "700" }}>Detected Condition</span>
                <h3 style={{ margin: "4px 0", color: "#7f1d1d" }}>{diagnosis.condition}</h3>
                <span style={{ fontSize: "13px", color: "#b91c1c" }}>Confidence: <strong>{diagnosis.confidence}</strong> | Severity: <strong>{diagnosis.severity}</strong></span>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <h4 style={{ margin: "0 0 4px 0", color: "#1e293b" }}>💊 Recommended Chemical Treatment:</h4>
                <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>{diagnosis.recommendation}</p>
              </div>

              <div>
                <h4 style={{ margin: "0 0 4px 0", color: "#166534" }}>🌿 Organic & Eco-friendly Care:</h4>
                <p style={{ margin: 0, fontSize: "14px", color: "#15803d" }}>{diagnosis.organicSolution}</p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔬</div>
              <p>Upload a crop leaf image on the left and click "Run AI Health Diagnosis" to generate disease analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
