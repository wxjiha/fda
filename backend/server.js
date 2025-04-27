// backend/server.js
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parser"); 

const upload = multer({ dest: "uploads/" });

const app = express();
const PORT = 3000;

// Setup DB
const dbPath = path.resolve(__dirname, "../database/fraud.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to open database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

const locations = ["New York", "London", "Tokyo", "Lagos", "Berlin"];
const randomLocation = locations[Math.floor(Math.random() * locations.length)];

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend/public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// Sessions
app.use(
  session({
    secret: "fraud-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Middleware to make username available in all views
app.use((req, res, next) => {
  res.locals.username = req.session.user?.username || null;
  next();
});

// Routes
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login", { username: null, loginError: false });
});


// Handle Registration
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.send("Error hashing password.");
    db.run(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, hash],
      function (err) {
        if (err) return res.send("User exists or error occurred.");
        req.session.user = { id: this.lastID, username };
        res.redirect("/dashboard");
      }
    );
  });  
});

// Handle Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user) {
      return res.render("login", { username: null, loginError: true });
    }    
    
    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (result) {
        req.session.user = user;
        res.redirect("/dashboard");
      } else {
        res.render("login", { username: null, loginError: true });
      }      
    });
  });  
});

// Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const range = req.query.range || "all";
  const userId = req.session.user.id;

  let query = "SELECT * FROM transactions WHERE user_id = ?";
  const params = [userId];

  if (range === "7" || range === "30") {
    query += " AND created_at >= datetime('now', ?)";
    params.push(`-${range} days`);
  }

  db.all(query, params, (err, rows) => {
    const fraudCount = rows.filter(t => t.prediction === 1).length;
    const legitCount = rows.length - fraudCount;

    res.render("dashboard", {
      transactions: rows || [],
      fraudCount,
      legitCount,
      selectedRange: range
    });
  });
});


// Submit Transaction Page
app.get("/submit", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("submit", {
    username: req.session.user.username,
    result: null,
    results: null
  });
});

// Handle Transaction Submission
app.post("/submit", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const featureStr = req.body.features;
  const features = featureStr.split(",").map(parseFloat);

  try {
    const response = await axios.post("http://127.0.0.1:5000/predict", 
      { features });


    const prediction = response.data.prediction;
    const confidence = Math.max(...response.data.confidence);

    db.run(
      "INSERT INTO transactions (user_id, features, prediction, confidence, location) VALUES (?, ?, ?, ?, ?)",
      [req.session.user.id, featureStr, prediction, confidence, randomLocation],
      (err) => {
        if (err) return res.send("Error saving transaction.");
        res.render("submit", {
          username: req.session.user.username,
          result: { prediction, confidence },
          results: null
        });        
      }
    );
  } catch (err) {
    console.error(err);
    res.send("Failed to connect to prediction model.");
  }
});

app.post("/submit-csv", upload.single("csvfile"), async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", row => {
      const features = Object.values(row).map(Number);
      if (features.length >= 5) {
        results.push(features);
      }
    })
    .on("end", async () => {
      const predictions = [];

      for (const features of results) {
        try {
          const response = await axios.post("http://127.0.0.1:5000/predict", { features });

          const prediction = response.data.prediction;
          const confidence = Math.max(...response.data.confidence);
          const featureStr = features.join(",");

          db.run(
            "INSERT INTO transactions (user_id, features, prediction, confidence) VALUES (?, ?, ?, ?)",
            [req.session.user.id, featureStr, prediction, confidence]
          );

          predictions.push({ prediction, confidence });
        } catch (e) {
          predictions.push({ prediction: "error", confidence: 0 });
        }
      }

      req.session.downloadResults = predictions;

      res.render("submit", {
        username: req.session.user.username,
        result: null,
        results: predictions
      });

    });
});


app.get("/download-report", (req, res) => {
  const results = req.session.downloadResults;

  if (!results || !Array.isArray(results)) {
    return res.status(400).send("No data available to download.");
  }

  let csv = "Row,Prediction,Confidence\n";

  results.forEach((row, i) => {
    const label = row.prediction === 1 ? "Fraud" : "Legit";
    const confidence = (row.confidence * 100).toFixed(2) + "%";
    csv += `${i + 1},${label},${confidence}\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=prediction_report.csv");
  res.send(csv);
});

app.post("/feedback", (req, res) => {
  const userId = req.session.user.id;
  const { index, prediction, feedback } = req.body;

  db.run(
    "INSERT INTO feedback (user_id, prediction_index, prediction, user_feedback) VALUES (?, ?, ?, ?)",
    [userId, index, prediction, feedback],
    (err) => {
      if (err) {
        console.error("Feedback error:", err);
        return res.send("Something went wrong.");
      }
      res.redirect("/submit");
    }
  );
});

app.get("/fraud-map", (req, res) => {
  db.all("SELECT location, prediction FROM transactions", [], (err, rows) => {
    if (err) return res.send("Error fetching data.");

    res.render("fraud-map", { transactions: rows });
  });
});


// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
