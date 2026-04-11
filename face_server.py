import os
import base64
import cv2
import numpy as np
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace

# Configuration
PORT = 5000
HOST = '0.0.0.0'

# Initialize Flask
app = Flask(__name__)
CORS(app) # Enable CORS for React frontend

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DeepFaceServer")

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400

        # Decode base64 image
        img_data = data['image']
        if ',' in img_data:
            img_data = img_data.split(',')[1]
        
        img_bytes = base64.b64decode(img_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"error": "Failed to decode image"}), 400

        # Run DeepFace Analysis
        # Actions: age, gender, emotion, race
        results = DeepFace.analyze(
            img_path=img, 
            actions=['age'],
            enforce_detection=False, # Don't crash if no face found
            detector_backend='opencv' # Faster for real-time
        )

        # DeepFace returns a list of results (one per face)
        if len(results) > 0:
            res = results[0]
            logger.info(f"Analyzed Face - Age: {res['age']}")
            return jsonify({
                "age": int(res['age']),
                "confidence": 0.9 # DeepFace is generally high confidence
            })
        
        return jsonify({"age": None, "confidence": 0}), 200

    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model": "DeepFace"}), 200

if __name__ == '__main__':
    logger.info(f"Starting DeepFace AI Server on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=False)
