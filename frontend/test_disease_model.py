import json
import numpy as np
import onnxruntime as ort
from PIL import Image

MODEL_PATH = "backend/models/disease/efficientnet_v2_s_best.onnx"
CLASSES_PATH = "backend/models/disease/classes.json"
IMAGE_PATH = "test_images/tomato_leaf.jpg"


# Load model
session = ort.InferenceSession(
    MODEL_PATH,
    providers=["CPUExecutionProvider"]
)

# Load class names
with open(CLASSES_PATH, "r", encoding="utf-8") as f:
    classes = json.load(f)

# Load image
image = Image.open(IMAGE_PATH).convert("RGB")

# Resize
image = image.resize((224, 224))

# Convert to NumPy
image_array = np.array(image).astype(np.float32) / 255.0

# ImageNet normalization
mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

image_array = (image_array - mean) / std

# HWC → CHW
image_array = np.transpose(image_array, (2, 0, 1))

# Add batch dimension
image_array = np.expand_dims(image_array, axis=0)

# Run model
input_name = session.get_inputs()[0].name
output = session.run(None, {input_name: image_array})

logits = output[0][0]

# Softmax
exp_logits = np.exp(logits - np.max(logits))
probabilities = exp_logits / np.sum(exp_logits)

# Get top 5 predictions
top_indices = np.argsort(probabilities)[::-1][:5]

print("\n🌱 KRISHI MITRA - DISEASE DETECTION")
print("=" * 50)

for rank, index in enumerate(top_indices, start=1):
    print(
        f"{rank}. {classes[index]} "
        f"→ {probabilities[index] * 100:.2f}%"
    )

print("=" * 50)

best_index = top_indices[0]

print(f"\n🌿 Prediction : {classes[best_index]}")
print(f"🎯 Confidence : {probabilities[best_index] * 100:.2f}%")