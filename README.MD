# Fraud Detection Web Application

An intelligent fraud detection system combining a Node.js web interface with a Python-based machine learning API.

## Features
- Secure login and registration
- Manual transaction submissions
- CSV batch upload
- Fraud prediction with confidence scoring
- Fraud Risk Map visualisation
- Feedback system and model evaluation

## Setup Instructions

### Node.js Backend
1. `cd backend`
2. `npm install`
3. `node server.js`

### Python Flask API
1. `cd ml_model`
2. `python -m venv venv`
3. `.\venv\Scripts\activate`
4. `pip install -r requirements.txt`
5. `python api.py`

Dataset: [Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)

---

**Note**: Create a `fraud.db` SQLite database and apply `schema.sql` to set up tables.
