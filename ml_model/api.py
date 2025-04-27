# ml_model/api.py
from flask import Flask, request, jsonify
import joblib
import numpy as np
import os


app = Flask(__name__)
model = joblib.load("model.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    features = np.array(data["features"])

    EXPECTED_FEATURE_COUNT = 5 

    if len(features) > EXPECTED_FEATURE_COUNT:
        features = features[:EXPECTED_FEATURE_COUNT] 
    elif len(features) < EXPECTED_FEATURE_COUNT:
        features = np.pad(features, (0, EXPECTED_FEATURE_COUNT - len(features)), constant_values=0)  

    features = features.reshape(1, -1)

    prediction = model.predict(features)[0]

    try:
        confidence = model.predict_proba(features)[0].tolist()
    except:
        confidence = [0.5, 0.5]

    return jsonify({
        "prediction": int(prediction),
        "confidence": confidence
    })


@app.route("/test", methods=["GET"])
def test_prediction():
    sample = np.array([[0.1, 1.2, 0.5, 1.0, 120.0]])
    pred = model.predict(sample)[0]

    try:
        conf = model.predict_proba(sample)[0].tolist()
    except:
        conf = [0.5, 0.5]

    return jsonify({
        "prediction": int(pred),
        "confidence": conf
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port)