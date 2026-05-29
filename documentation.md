# 🏭 AMDA System – AI-Based Predictive Maintenance Platform

## 🚀 Overview

AMDA (Advanced Machine Decision Assistant) is a real-time predictive maintenance system designed to monitor industrial machines, predict failures, and assist in maintenance decision-making.

The system simulates and analyzes sensor data from critical industrial machines such as:

* CNC Machines
* Industrial Pumps
* Conveyor Systems

It transforms raw sensor data into **actionable insights**, enabling industries to reduce downtime, optimize maintenance, and improve operational efficiency.

---

## 🎯 Problem Statement

In many industries, machines are maintained using:

* ❌ Reactive maintenance (fix after failure)
* ❌ Scheduled maintenance (fixed intervals regardless of need)

These approaches lead to:

* Unexpected downtime
* Increased operational cost
* Inefficient resource usage
* Safety risks

---

## 💡 Our Solution

AMDA introduces a **smart, data-driven predictive maintenance system** that:

1. Simulates real-world industrial sensor data
2. Detects anomalies and failure patterns
3. Calculates real-time risk scores
4. Provides decision support for maintenance actions

---

## 🧠 Key Features

### 📡 1. Real-Time Sensor Simulation

* Generates realistic industrial sensor data
* Supports multiple machine types:

  * CNC (6 sensors)
  * Pump (6 sensors)
  * Conveyor (6 sensors)

### ⚙️ 2. Failure Scenario Modeling

Simulates real-world failures such as:

* Tool wear, bearing failure (CNC)
* Cavitation, clogging (Pump)
* Belt misalignment, overload (Conveyor)

### ⚖️ 3. Balanced Dataset Generation

* Ensures equal representation of failure scenarios
* Suitable for machine learning training

### 📊 4. Risk Scoring Engine

* Converts sensor data into normalized risk (0–1)
* Displays real-time risk percentage
* Categorizes machine health:

  * Good
  * Monitor
  * Warning
  * Critical

### 🧠 5. Decision Support System

Provides:

* Failure identification
* Risk severity
* Maintenance recommendation (rule-based)

Example:

```
Failure: Spindle Bearing Failure  
Risk: 0.87  
Decision: Maintenance Required  
Priority: High  
```

### 📺 6. Live Dashboard

* Real-time visualization (SSE streaming)
* Machine-wise monitoring
* Failure logs and risk trends

---

## 🏗️ System Architecture

```
Sensor Simulator (Node.js)
        ↓
Real-Time Stream (SSE API)
        ↓
Dashboard (React UI)
        ↓
Risk & Decision Engine
        ↓
(Next Phase) Kafka → MongoDB → Maintenance Automation
```

---

## 🔧 Technologies Used

### Backend

* Node.js
* Express.js
* Server-Sent Events (SSE)

### Frontend

* React (CDN)
* Tailwind CSS

### Data & Analysis

* Python (Pandas, NumPy)
* Synthetic dataset generation

### Future Stack

* Apache Kafka (event streaming)
* MongoDB (data storage)
* ML models (XGBoost / LSTM)

---

## 🤖 Innovation

### 🔹 1. End-to-End Simulation System

Unlike typical projects that use static datasets, AMDA:

* Generates realistic industrial data
* Simulates real-time machine behavior

---

### 🔹 2. Balanced Failure Dataset Generation

* Solves class imbalance problem
* Enables reliable ML model training

---

### 🔹 3. Decision-Oriented Design

The system focuses on:

> “What should be done next?”
> not just
> “What is happening?”

---

### 🔹 4. Modular & Scalable Architecture

* Easily extendable to new machines
* Ready for real-world integration

---

### 🔹 5. Industry-Relevant Use Case (India Focus)

Applicable to:

* Manufacturing MSMEs
* Automotive plants
* Textile industries
* Smart factories

---

## 📈 Business Impact

AMDA helps industries:

* ⏱ Reduce downtime
* 💰 Lower maintenance costs
* 🔧 Optimize maintenance scheduling
* 🏭 Improve productivity

Example Impact:

```
Prevented Failure: Pump Cavitation  
Estimated Savings: ₹30,000  
Downtime Avoided: 3 hours  
```

---

## 🔮 Future Scope

### Phase 2 (Planned)

* Kafka-based event streaming
* Automated maintenance scheduling
* MongoDB-based maintenance logs

### Phase 3

* Machine Learning models for prediction
* Remaining Useful Life (RUL) estimation
* Edge deployment for factories

---

## 🏁 Conclusion

AMDA is not just a monitoring system — it is a **decision intelligence platform** for industrial maintenance.

By combining:

* Real-time data simulation
* Failure modeling
* Risk analysis
* Decision support

it provides a scalable solution for modern smart industries.

---

## 👥 Team Vision

Our goal is to build:

> “Affordable, AI-driven predictive maintenance solutions for real-world industrial challenges.”

---
