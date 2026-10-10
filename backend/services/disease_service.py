import os
import json
import logging
import numpy as np
from PIL import Image
import threading

class DiseaseService:
    _model = None
    _class_names = []
    _is_loading = False
    _load_error = None
    _lock = threading.Lock()

    @classmethod
    def load_model(cls):
        if cls._model is not None:
            return "LOADED"
            
        if cls._is_loading:
            return "LOADING"
            
        if cls._load_error is not None:
            err = cls._load_error
            cls._load_error = None
            return f"FAILED: {err}"
            
        if cls._lock.acquire(blocking=False):
            def _background_load():
                try:
                    cls._is_loading = True
                    cls._load_error = None
                    model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'disease', 'compat_mobilenetv2.keras')
                    class_names_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'disease', 'class_names.json')
                    
                    # Disable OneDNN opts if warning exists
                    os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
                    
                    import tensorflow as tf
                    
                    logging.info(f"Loading disease model from {model_path}")
                    cls._model = tf.keras.models.load_model(model_path)
                    
                    with open(class_names_path, 'r') as f:
                        cls._class_names = json.load(f)
                        
                    logging.info(f"Model loaded successfully with {len(cls._class_names)} classes.")
                except Exception as e:
                    cls._load_error = str(e)
                    logging.error(f"Error loading disease model: {str(e)}", exc_info=True)
                finally:
                    cls._is_loading = False
                    cls._lock.release()
            
            thread = threading.Thread(target=_background_load)
            thread.daemon = True
            thread.start()
            return "LOADING"
            
        return "LOADING"

    @staticmethod
    def _is_image_suitable(image: Image.Image) -> bool:
        """
        Check if the image is likely a leaf by calculating the ratio of green/brown/yellow pixels.
        This provides a heuristic to avoid confidently misclassifying unrelated images.
        """
        hsv_image = image.convert('HSV')
        pixels = np.array(hsv_image)
        
        # PIL HSV ranges: H=0-255, S=0-255, V=0-255
        # Green is ~85, Yellow is ~42, Brown is ~15-30
        h = pixels[:,:,0]
        s = pixels[:,:,1]
        v = pixels[:,:,2]
        
        # We look for H in [10, 110] covering browns, yellows, and greens.
        # S should be above 20 to exclude grayscale/white/black.
        # V should be above 20 to exclude very dark areas.
        leaf_mask = (h >= 10) & (h <= 110) & (s >= 20) & (v >= 20)
        
        leaf_ratio = np.sum(leaf_mask) / (pixels.shape[0] * pixels.shape[1])
        return leaf_ratio > 0.05

    @classmethod
    def analyze_image(cls, image_path: str):
        status = cls.load_model()
        
        if status == "LOADING":
            return {
                "success": False, 
                "error": "AI model is currently warming up on the server. Please wait about 30 seconds and try again.",
                "status_code": 503
            }
        elif status.startswith("FAILED:"):
            err_details = status.replace("FAILED:", "").strip()
            return {
                "success": False, 
                "error": f"AI model failed to load previously: {err_details}. Please submit again to retry.",
                "status_code": 500
            }

        if cls._model is None:
            return {"success": False, "error": "AI model failed to load. Please try again later.", "status_code": 500}

        try:
             image = Image.open(image_path).convert("RGB")
        except Exception as e:
             return {"success": False, "error": "Invalid or corrupted image format."}

        # Check image suitability for crop diseases
        if not cls._is_image_suitable(image):
            return {
                "success": False,
                "error": "The image does not appear to be a clear, valid leaf photo. Please upload a clear photo of the crop leaf."
            }

        try:
            # Preprocess the image for correctly tuned MobileNetV2
            img = image.resize((224, 224), Image.Resampling.BILINEAR)
            img_array = np.array(img, dtype=np.float32)
            
            # The model was fine-tuned using [0, 1] standardization instead of 
            # the default Keras MobileNetV2 [-1, 1] preprocess_input scaling.
            img_array = img_array / 255.0
            
            img_array = np.expand_dims(img_array, axis=0)

            # Inference
            preds = cls._model.predict(img_array, verbose=0)[0]
            best_idx = np.argmax(preds)
            best_prob = preds[best_idx]
            
            # Certainty check
            if best_prob < 0.4:
                return {
                    "success": False,
                    "error": "The prediction is uncertain. Please upload a clearer leaf photo."
                }

            raw_name = cls._class_names[best_idx]
            parts = raw_name.split("___")
            crop_name = parts[0].replace("_", " ").title()
            
            # The second part might contain multiple words like 'Cercospora_leaf_spot Gray_leaf_spot'
            condition_name = parts[1].replace("_", " ") if len(parts) > 1 else "Healthy"
            
            if "healthy" in condition_name.lower():
                condition_name = "Healthy"
                severity = "None"
            else:
                if best_prob > 0.9:
                    severity = "High"
                elif best_prob > 0.7:
                    severity = "Moderate"
                else:
                    severity = "Low"

            return {
                "success": True,
                "crop": crop_name,
                "condition": condition_name,
                "confidence": f"{best_prob * 100:.1f}%",
                "severity": severity,
                "raw_label": raw_name
            }
        except Exception as e:
            logging.error(f"Error predicting disease: {str(e)}")
            return {"success": False, "error": "An error occurred during analysis."}
