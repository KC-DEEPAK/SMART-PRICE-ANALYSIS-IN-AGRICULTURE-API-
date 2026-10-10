import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import diseaseFertilizerData from "../data/diseaseFertilizerData";
import { DISEASE_API_URL } from "../utils/api";

export default function CropHealthPage() {
  const [selectedCrop, setSelectedCrop] = useState("Apple");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const { t } = useLanguage();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setDiagnosis(null);
      setErrorMsg(null);
    }
  };

  const getRecommendation = (cropName, conditionName) => {
    // Attempt to find a matching recommendation from the existing database
    const cropData = diseaseFertilizerData[cropName];
    if (!cropData) return null;
    
    // Simple substring match for flexibility (e.g. "Blight" matches "Early blight")
    const match = cropData.find(d => 
      conditionName.toLowerCase().includes(d.disease.toLowerCase()) || 
      d.disease.toLowerCase().includes(conditionName.toLowerCase())
    );
    return match;
  };

  const runAnalysis = async () => {
    if (!selectedImageFile) return;
    setAnalyzing(true);
    setErrorMsg(null);
    setDiagnosis(null);

    const formData = new FormData();
    formData.append("image", selectedImageFile);

    try {
      const response = await fetch(DISEASE_API_URL, {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      
      if (!data.success) {
        setErrorMsg(data.error || "Analysis failed. Please try again.");
      } else {
        // Enforce crop check
        if (data.crop !== selectedCrop) {
          setErrorMsg(`Mismatch Detected: You selected '${selectedCrop}', but the AI identified the uploaded leaf as '${data.crop}'. Please upload a valid image for the selected crop or change your selection.`);
          setAnalyzing(false);
          return;
        }

        // Find recommendation
        let recText = "Consult local agricultural extension for specific treatments.";
        let orgText = "Maintain field hygiene and proper spacing to reduce spread.";
        
        const rec = getRecommendation(data.crop, data.condition);
        if (rec) {
            recText = rec.recommended || recText;
            orgText = rec.prevention || orgText;
        } else if (data.condition === "Healthy") {
            recText = "No chemical treatment required.";
            orgText = "Continue standard care and monitoring.";
        }
        
        setDiagnosis({
          condition: data.condition === "Healthy" ? "Healthy (No Disease Detected)" : `${data.condition} (${data.crop})`,
          confidence: data.confidence,
          severity: data.severity,
          recommendation: recText,
          organicSolution: orgText
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to reach the classification server.");
    } finally {
      setAnalyzing(false);
    }
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
              <option value="Apple">Apple</option>
              <option value="Blueberry">Blueberry</option>
              <option value="Cherry (Including Sour)">Cherry</option>
              <option value="Corn (Maize)">Corn / Maize</option>
              <option value="Grape">Grape</option>
              <option value="Orange">Orange</option>
              <option value="Peach">Peach</option>
              <option value="Pepper, Bell">Pepper (Bell)</option>
              <option value="Potato">Potato</option>
              <option value="Raspberry">Raspberry</option>
              <option value="Soybean">Soybean</option>
              <option value="Squash">Squash</option>
              <option value="Strawberry">Strawberry</option>
              <option value="Tomato">Tomato</option>
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
          {errorMsg && (
            <div style={{ background: "#fef2f2", color: "#991b1b", padding: "12px", borderRadius: "6px", marginBottom: "15px", border: "1px solid #ef4444" }}>
              ⚠️ {errorMsg}
            </div>
          )}
          
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
