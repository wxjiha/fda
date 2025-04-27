import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

# Load dataset
data = pd.read_csv("https://storage.googleapis.com/download.tensorflow.org/data/creditcard.csv")

# Use 5 features for simplified model
X = data[["V1", "V2", "V3", "V4", "Amount"]]
y = data["Class"]

# Split into training and testing
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Save model
joblib.dump(model, "model.pkl")

# Predict on test data
y_pred = model.predict(X_test)

# Save classification report
report = classification_report(y_test, y_pred, target_names=["Legit", "Fraud"])
with open("metrics.txt", "w") as f:
    f.write(report)

print("✅ Model trained and saved as model.pkl")
print("📊 Evaluation metrics written to metrics.txt")

# Confusion matrix plot (optional but impressive)
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=["Legit", "Fraud"], yticklabels=["Legit", "Fraud"])
plt.title("Confusion Matrix")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.savefig("confusion_matrix.png")
plt.close()
