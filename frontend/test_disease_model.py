import json
import numpy as np
import onnxruntime as ort
from PIL import Image


# ============================================================
# PATHS
# ============================================================

MODEL_PATH = "backend/models/disease/efficientnet_v2_s_best.onnx"
CLASSES_PATH = "backend/models/disease/classes.json"
IMAGE_PATH = "test_images/tomato_leaf.jpeg"


# ============================================================
# LOAD MODEL
# ============================================================

print("\n🌱 KRISHI MITRA - DISEASE DETECTION")
print("=" * 60)

session = ort.InferenceSession(
    MODEL_PATH,
    providers=["CPUExecutionProvider"]
)

print("✅ ONNX model loaded")


# ============================================================
# LOAD CLASS NAMES
# ============================================================

with open(CLASSES_PATH, "r", encoding="utf-8") as f:
    class_data = json.load(f)

# classes.json contains:
# {
#   "classes": [...]
# }

classes = class_data["classes"]

print(f"✅ Classes loaded: {len(classes)}")


# ============================================================
# LOAD IMAGE
# ============================================================

image = Image.open(IMAGE_PATH).convert("RGB")

print(f"✅ Image loaded: {IMAGE_PATH}")


# ============================================================
# PREPROCESS IMAGE
# ============================================================

image = image.resize((224, 224))

image_array = np.array(image).astype(np.float32) / 255.0


# ImageNet normalization

mean = np.array(
    [0.485, 0.456, 0.406],
    dtype=np.float32
)

std = np.array(
    [0.229, 0.224, 0.225],
    dtype=np.float32
)

image_array = (image_array - mean) / std


# HWC → CHW

image_array = np.transpose(
    image_array,
    (2, 0, 1)
)


# Add batch dimension

image_array = np.expand_dims(
    image_array,
    axis=0
)


# ============================================================
# RUN MODEL
# ============================================================

input_name = session.get_inputs()[0].name

output = session.run(
    None,
    {
        input_name: image_array
    }
)

logits = output[0][0]


# ============================================================
# SOFTMAX
# ============================================================

exp_logits = np.exp(
    logits - np.max(logits)
)

probabilities = (
    exp_logits / np.sum(exp_logits)
)


# ============================================================
# TOP 5 PREDICTIONS
# ============================================================

top_indices = np.argsort(
    probabilities
)[::-1][:5]


print("\n🔍 TOP 5 PREDICTIONS")
print("-" * 60)


for rank, index in enumerate(
    top_indices,
    start=1
):

    index = int(index)

    class_name = classes[index]

    confidence = probabilities[index] * 100

    print(
        f"{rank}. {class_name} "
        f"→ {confidence:.2f}%"
    )


# ============================================================
# BEST PREDICTION
# ============================================================

best_index = int(top_indices[0])

best_class = classes[best_index]

best_confidence = (
    probabilities[best_index] * 100
)


print("=" * 60)

print(
    f"\n🌿 Prediction : {best_class}"
)

print(
    f"🎯 Confidence : {best_confidence:.2f}%"
)

print("=" * 60)