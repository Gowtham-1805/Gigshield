# 🛡️ GigShield — AI-Powered Parametric Insurance for India's Gig Workers

> **"Kaam ruke toh paisa nahi, GigShield hai na!"**
> *(When work stops, your income doesn't — GigShield has your back!)*

**GigShield** is an AI-powered parametric micro-insurance platform built to protect India's 15 million+ gig economy workers from income loss caused by weather disruptions, extreme pollution, and other parametric events — with instant, automated payouts and zero paperwork.

---

## 📑 Table of Contents

1. [Problem Statement & Vision](#-problem-statement--vision)
2. [Persona-Based Scenarios](#-persona-based-scenarios)
3. [Application Workflow](#-application-workflow)
4. [Weekly Premium Model](#-weekly-premium-model)
5. [Parametric Triggers](#-parametric-triggers)
6. [Platform Choice: Web (PWA)](#-platform-choice-web-pwa)
7. [AI/ML Integration](#-aiml-integration)
8. [Tech Stack](#-tech-stack)
9. [Development Plan](#-development-plan)
10. [Architecture Overview](#-architecture-overview)
11. [Key Differentiators](#-key-differentiators)
12. [Getting Started](#-getting-started)

---

## 🎯 Problem Statement & Vision

### The Problem
India's gig workers (delivery agents, ride-share drivers, micro-entrepreneurs) face a unique vulnerability: **when external events disrupt their ability to work, their income drops to zero**. Unlike salaried employees, they have:
- No paid leave or sick days
- No employer-provided insurance against weather events
- No safety net during monsoons, heatwaves, or pollution emergencies
- No bargaining power to negotiate downtime compensation

A Zomato rider in Mumbai loses ₹800-1500 per day during heavy monsoon flooding. A Swiggy driver in Delhi can't work when AQI exceeds 400. A Blinkit rider in Chennai faces cyclone shutdowns. **These are predictable, measurable events — but no affordable insurance product exists for them.**

### Our Vision
GigShield reimagines insurance as a **real-time, data-driven safety net** that:
- Uses weather APIs + AI to **automatically detect** when a worker can't work
- **Triggers instant payouts** without claims paperwork
- Keeps premiums **micro and weekly** (₹29-129/week) to match gig income cycles
- Uses **AI-powered fraud detection** to maintain pool integrity
- Provides **proactive alerts** so workers can plan ahead

---

## 👤 Persona-Based Scenarios

### Persona 1: Raju Kumar — Zomato Delivery Partner, Mumbai
- **Age:** 24 | **Weekly Earnings:** ₹4,000-5,000 | **Zone:** Mumbai - Dadar
- **Platform:** Zomato | **Policy:** Standard (₹49/week)

**Scenario:** On a Monday during peak monsoon, Mumbai receives 120mm rainfall in 3 hours. Raju's zone (Dadar) is waterlogged. He cannot safely deliver.

**GigShield Flow:**
1. Weather API detects rainfall > 100mm/hr in zone `mum-dad`
2. System auto-creates an `RAIN_EXTREME` incident (severity: 85)
3. Raju's active policy is matched → claim auto-generated for ₹600 (4 hours × ₹150/hr × 1.0x Standard multiplier)
4. AI fraud check runs: GPS confirms Raju is in-zone, weather data verified, anomaly score 0.02 → **approved**
5. Payout of ₹600 initiated to Raju's UPI within minutes
6. Raju gets a push notification: "₹600 credited — stay safe! 🛡️"

### Persona 2: Priya Sharma — Swiggy Delivery Executive, Delhi
- **Age:** 28 | **Weekly Earnings:** ₹3,500 | **Zone:** Delhi - Connaught Place
- **Platform:** Swiggy | **Policy:** Basic (₹29/week)

**Scenario:** Delhi experiences AQI > 450 for 6 consecutive hours in winter. Priya has respiratory issues and cannot work.

**GigShield Flow:**
1. AQI API detects AQI > 400 sustained for 4+ hours in zone `del-cp`
2. `AQI_SEVERE` incident created (severity: 70)
3. Priya's Basic policy triggers → claim for ₹480 (4 hours × ₹150/hr × 0.8x Basic multiplier)
4. Fraud check: AQI confirmed by government sensors, Priya's location verified → **approved**
5. Payout processed automatically

### Persona 3: Arjun Reddy — Amazon Flex Driver, Hyderabad
- **Age:** 32 | **Weekly Earnings:** ₹6,000 | **Zone:** Hyderabad - HITEC City
- **Platform:** Amazon Flex | **Policy:** Pro (₹99/week)

**Scenario:** Arjun tries to file a claim for "heavy rain" but the weather data shows only 15mm rainfall — well below threshold.

**GigShield Flow:**
1. Arjun submits a manual report via the Worker Report panel
2. System checks weather data: rainfall only 15mm (threshold: 50mm) → **no matching incident**
3. AI fraud scoring: anomaly score 0.78, GPS shows Arjun was 12km from claimed zone
4. Claim auto-flagged with fraud score 0.78 → **flagged for review**
5. Admin reviews and rejects; Arjun's Shield Score drops from 72 to 58
6. Higher fraud score means higher future premiums (deterrent effect)

---

## 🔄 Application Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     GigShield Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  Worker   │───▶│   Sign Up &  │───▶│  Choose Plan         │  │
│  │  App      │    │   Onboard    │    │  (Basic/Std/Pro)     │  │
│  └──────────┘    └──────────────┘    └──────────────────────┘  │
│       │                                        │                 │
│       ▼                                        ▼                 │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  Weather  │◀──│  Weather     │───▶│  Premium Calculated   │  │
│  │  APIs     │    │  Polling     │    │  (AI + Zone Risk)     │  │
│  │  (OWM)   │    │  (15 min)    │    └──────────────────────┘  │
│  └──────────┘    └──────────────┘                               │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PARAMETRIC TRIGGER ENGINE                     │   │
│  │  Rain >50mm? ──▶ RAIN_HEAVY                               │   │
│  │  Rain >100mm? ──▶ RAIN_EXTREME                            │   │
│  │  Temp >45°C? ──▶ HEAT_EXTREME                             │   │
│  │  AQI >400? ──▶ AQI_SEVERE                                 │   │
│  │  Cyclone? ──▶ STORM_CYCLONE                               │   │
│  │  Curfew? ──▶ CURFEW_LOCAL                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────┐    │
│  │  Incident     │───▶│  Auto-Create │───▶│  AI Fraud      │    │
│  │  Created      │    │  Claim       │    │  Detection     │    │
│  └──────────────┘    └──────────────┘    └────────────────┘    │
│                                                │                 │
│                           ┌────────────────────┤                 │
│                           ▼                    ▼                 │
│                    ┌─────────────┐     ┌─────────────┐          │
│                    │  APPROVED   │     │  FLAGGED     │          │
│                    │  Auto-Payout│     │  Admin Review│          │
│                    │  via UPI    │     │              │          │
│                    └─────────────┘     └─────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   ADMIN DASHBOARD                          │   │
│  │  • Zone Heatmap  • Fraud Network  • AI Predictions        │   │
│  │  • Claims Review • Weather Monitor • Worker Management    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Worker Journey:
1. **Sign Up** → Email verification → Create worker profile (name, phone, platform, city)
2. **Zone Assignment** → Auto-assigned to nearest zone based on city
3. **Choose Plan** → View dynamic premium (calculated per zone risk + season + claim history)
4. **Dashboard** → See Shield Score, active policy, weather alerts, AI predictions
5. **Incident Occurs** → Auto-notification, claim auto-generated OR manual report
6. **Payout** → Approved claims trigger instant UPI payout
7. **Renewal** → Weekly auto-renewal with updated premium

### Admin Journey:
1. **Dashboard** → Real-time overview of all zones, claims, weather
2. **Zone Map** → Interactive heatmap with risk scores per zone
3. **Claims Management** → Review flagged claims, approve/reject
4. **Fraud Network** → AI-generated graph showing suspicious patterns
5. **Trigger Demo** → Simulate weather events for testing
6. **AI Predictions** → View forecasted claims and reserve requirements

---

## 💰 Weekly Premium Model

### Why Weekly?
Gig workers earn daily/weekly — monthly premiums don't align with their cash flow. Our weekly model ensures:
- **Affordability:** ₹29-129/week vs ₹500+ monthly traditional plans
- **Flexibility:** Workers can pause/resume coverage
- **Cash flow alignment:** Premiums match earning cycles

### Tier Structure

| Tier | Weekly Premium | Max Payout/Week | Payout Multiplier | Target Worker |
|------|---------------|-----------------|-------------------|---------------|
| **BASIC** | ₹29-49 | ₹2,000 | 0.8x | Low-earning / new workers |
| **STANDARD** | ₹49-79 | ₹3,000 | 1.0x | Average earners |
| **PRO** | ₹79-129 | ₹4,000 | 1.2x | High earners / high-risk zones |

### Dynamic Premium Formula

```
Premium = Base Price × Zone Risk Factor × Season Factor × Claim History Discount
```

| Factor | Range | Description |
|--------|-------|-------------|
| **Base Price** | ₹29-99 (by tier) | Fixed base per tier |
| **Zone Risk Factor** | 0.5 - 2.0 | Based on zone's historical incident rate |
| **Season Factor** | 1.0 - 1.3 | Higher during monsoon (Jun-Sep), winter smog (Nov-Jan) |
| **Claim History Discount** | 0.95 | 5% discount if 0 claims in last 4 weeks |

**Example:** Pro tier in Mumbai-Dadar (risk: 0.78) during monsoon (season: 1.2):
```
₹99 × 1.56 (zone) × 1.2 (season) × 1.0 (no discount) = ₹185/week
```

### Payout Calculation

```
Payout = Lost Hours × ₹150/hr × Tier Multiplier
```

- Capped at weekly `max_payout` per tier
- Lost hours estimated from incident duration (minimum 2 hours per incident)

---

## ⚡ Parametric Triggers

Parametric insurance pays out based on **measurable, objective data** — not subjective damage assessment. Our triggers:

| Trigger ID | Event | Data Source | Threshold | Typical Severity |
|-----------|-------|-------------|-----------|-----------------|
| `RAIN_HEAVY` | Heavy Rainfall | OpenWeatherMap | > 50mm/hr for 2+ hrs | 50-70 |
| `RAIN_EXTREME` | Extreme Rain / Flood | OpenWeatherMap + Gov alerts | > 100mm/hr OR flood alert | 70-95 |
| `HEAT_EXTREME` | Extreme Heat | OpenWeatherMap | > 45°C for 3+ hrs | 60-85 |
| `AQI_SEVERE` | Severe Air Quality | OpenWeatherMap AQI API | AQI > 400 for 4+ hrs | 60-80 |
| `CURFEW_LOCAL` | Local Curfew/Bandh | Manual admin input | Verified curfew in zone | 70-90 |
| `STORM_CYCLONE` | Cyclone / Storm | OpenWeatherMap + IMD | Severe weather alert issued | 80-100 |

### How Triggers Work:
1. **Weather Polling:** Edge function `weather-poll` runs every 15 minutes, fetching data for all zones
2. **Threshold Check:** If any metric exceeds trigger threshold, an `incident` is created
3. **Auto-Claim:** The `fire-trigger` edge function matches affected workers' policies and auto-generates claims
4. **Severity Scoring:** Based on how far the reading exceeds the threshold (e.g., 200mm rain = higher severity than 60mm)

---

## 📱 Platform Choice: Web (PWA)

### Why Web over Native Mobile?

| Factor | Web (PWA) ✅ | Native App ❌ |
|--------|-------------|--------------|
| **Installation barrier** | No app store download needed | Requires Play Store download |
| **Storage concern** | Zero device storage | 50-100MB on low-end phones |
| **Update cycle** | Instant updates | App store review delays |
| **Development speed** | Single codebase | Separate Android/iOS |
| **Target devices** | Works on any browser | Needs specific OS versions |
| **Data usage** | Lightweight | Heavy initial download |
| **Offline support** | Service Worker caching | Full offline |

### Why PWA specifically?
- **India's gig workers use budget Android phones** with limited storage — PWA has near-zero footprint
- **Installable:** "Add to Home Screen" gives app-like experience without app store
- **Push Notifications:** Service Workers enable real-time weather alerts
- **Works on 2G/3G:** Optimized for Indian network conditions
- **Mobile-first UI:** Designed for one-handed, on-the-go usage during delivery breaks

---

## 🤖 AI/ML Integration

### 1. Dynamic Premium Calculation (`calculate-premium` edge function)
- **Input:** Worker zone, tier, claim history, current season, zone risk score
- **AI Role:** Zone risk scores are computed from historical weather data + incident frequency using weighted models
- **Output:** Personalized weekly premium that reflects real-time risk

### 2. AI-Powered Fraud Detection (`worker-report` + `fire-trigger` edge functions)
Every claim goes through a multi-layered fraud scoring pipeline:

```
Fraud Score = weighted_sum(
  GPS Proximity Check     (30%) — Is the worker actually in the claimed zone?
  Weather Verification    (25%) — Does weather data confirm the claimed event?
  Claim Velocity Check    (20%) — How many claims in the last 6 hours?
  Amount Anomaly Detection(15%) — Is the amount unusually high for this trigger?
  Behavioral Patterns     (10%) — Historical claim patterns, time-of-day analysis
)
```

| Score Range | Action | Description |
|-------------|--------|-------------|
| 0.0 - 0.3 | **Auto-Approve** | Low risk, verified by data |
| 0.3 - 0.7 | **Processing** | Needs automated review |
| 0.7 - 1.0 | **Flagged** | Sent to admin for manual review |

### 3. Predictive AI Alerts (`ai-predict` edge function)
- Uses **Gemini AI** (via Lovable AI gateway) to analyze weather patterns
- Predicts probability of disruption events **24-48 hours in advance**
- Generates city-level forecasts: event type, probability %, estimated claims volume, reserve requirements
- Workers see proactive alerts: *"⚠️ Heavy Monsoon Rainfall expected in your area (88% chance)"*

### 4. Shield Score — Worker Trust Metric
An AI-computed trust score (0-100) for each worker:
- **Increases:** Verified claims, long tenure, consistent zone presence
- **Decreases:** Flagged claims, GPS mismatches, unusual patterns
- **Impact:** Higher scores → lower premiums, priority payouts

### 5. Fraud Network Visualization (Admin Dashboard)
- AI identifies clusters of suspicious activity (e.g., multiple workers claiming same fabricated event)
- Graph visualization shows connections between workers, incidents, and anomalies
- Helps admins spot organized fraud rings

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework with hooks & functional components |
| **TypeScript** | Type safety across the codebase |
| **Vite** | Fast build tool with HMR |
| **Tailwind CSS** | Utility-first styling with custom design tokens |
| **shadcn/ui** | Accessible, customizable component library |
| **Framer Motion** | Smooth animations and transitions |
| **Recharts** | Data visualization (charts, graphs) |
| **Leaflet** | Interactive zone maps |
| **React Router v6** | Client-side routing |
| **React Query** | Server state management & caching |
| **PWA (vite-plugin-pwa)** | Installable, offline-capable progressive web app |

### Backend (Lovable Cloud / Supabase)
| Technology | Purpose |
|-----------|---------|
| **Supabase (PostgreSQL)** | Primary database with RLS policies |
| **Supabase Auth** | Email-based authentication with role management |
| **Supabase Edge Functions (Deno)** | Serverless backend logic |
| **Row-Level Security** | Fine-grained data access control |
| **Supabase Realtime** | Live data updates |

### AI/ML Services
| Technology | Purpose |
|-----------|---------|
| **Google Gemini 2.5 Flash** | Predictive analytics, fraud pattern analysis |
| **Lovable AI Gateway** | Managed AI model access (no API key needed) |
| **Custom scoring algorithms** | Fraud detection, Shield Score computation |

### External APIs
| API | Purpose |
|-----|---------|
| **OpenWeatherMap Current** | Real-time temperature, rainfall, wind |
| **OpenWeatherMap AQI** | Air quality index data |
| **OpenWeatherMap Forecast** | 3-hour forecast for predictions |

### Database Schema
- **workers** — Worker profiles (name, phone, platform, city, zone, shield_score)
- **zones** — Geographic zones with risk scores and coordinates
- **policies** — Weekly insurance policies (tier, premium, max_payout, dates)
- **incidents** — Weather/trigger events with severity scoring
- **claims** — Auto-generated claims linked to policies and incidents
- **payouts** — Payment records with UPI tracking
- **weather_readings** — Historical weather data per zone
- **user_roles** — Role-based access control (admin/moderator/user)

### Edge Functions
| Function | Purpose |
|---------|---------|
| `weather-poll` | Polls OpenWeatherMap every 15min for all zones |
| `fire-trigger` | Creates incidents and auto-generates claims when thresholds are breached |
| `worker-report` | Handles manual worker reports with fraud scoring |
| `calculate-premium` | Dynamic premium calculation per worker |
| `ai-predict` | AI-powered risk predictions using Gemini |
| `renew-policy` | Weekly policy renewal with updated premiums |
| `make-admin` | Admin role assignment (service-role secured) |

---

## 📅 Development Plan

### Phase 1: Ideation & Foundation (March 4-20) ✅
- [x] Problem research & persona development
- [x] Premium model design & trigger definition
- [x] Tech stack selection & architecture planning
- [x] AI/ML integration strategy
- [x] Comprehensive README documentation

### Phase 2: Core Build (March 20 - April 3)
- [x] Authentication (signup, login, email verification, password reset)
- [x] Worker onboarding & profile management
- [x] Policy selection with dynamic premium calculation
- [x] Weather data integration (OpenWeatherMap polling)
- [x] Parametric trigger engine (auto-incident creation)
- [x] Auto-claim generation with AI fraud scoring
- [x] Worker dashboard (Shield Score, alerts, claims)
- [x] Admin dashboard (zone map, claims management, fraud network)
- [x] Alerts page (weather notifications, AI predictions, claim updates)

### Phase 3: AI Enhancement & Polish (April 3 - April 17)
- [x] AI predictive alerts (Gemini-powered forecasting)
- [x] Fraud network visualization
- [x] Shield Score algorithm refinement
- [ ] Push notifications (Service Worker)
- [ ] Multi-language support (Hindi, Tamil, Telugu)
- [ ] Performance optimization & PWA polish
- [ ] End-to-end testing & bug fixes

### Phase 4: Demo & Presentation (April 17 - April 24)
- [ ] Demo video creation
- [ ] Pitch deck preparation
- [ ] Final testing & deployment
- [ ] Documentation finalization

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                 CLIENT (PWA)                      │
│  React + TypeScript + Tailwind + Framer Motion   │
│  ┌──────────┬──────────┬──────────┬───────────┐ │
│  │  Worker   │  Admin   │  Auth    │  Alerts   │ │
│  │Dashboard  │Dashboard │  Pages   │  Page     │ │
│  └────┬─────┴────┬─────┴────┬─────┴────┬──────┘ │
└───────┼──────────┼──────────┼──────────┼─────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────┐
│            SUPABASE (Backend-as-a-Service)        │
│  ┌─────────────────────────────────────────────┐ │
│  │              Edge Functions                   │ │
│  │  weather-poll │ fire-trigger │ ai-predict    │ │
│  │  worker-report│ calc-premium │ renew-policy  │ │
│  └──────────────┬──────────────┬───────────────┘ │
│  ┌──────────────┴──────────────┴───────────────┐ │
│  │         PostgreSQL + RLS Policies             │ │
│  │  workers│zones│policies│claims│payouts│...    │ │
│  └─────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │              Auth (JWT + Roles)               │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
        │                    │
        ▼                    ▼
┌───────────────┐   ┌───────────────────┐
│ OpenWeatherMap│   │  Lovable AI       │
│  Current/AQI/ │   │  Gateway          │
│  Forecast API │   │  (Gemini 2.5)     │
└───────────────┘   └───────────────────┘
```

---

## ✨ Key Differentiators

1. **Zero Paperwork Claims** — Parametric triggers mean no manual claim filing needed
2. **AI Fraud Prevention** — Multi-layered scoring prevents abuse while being fair to genuine workers
3. **Micro-Weekly Premiums** — ₹29/week makes insurance accessible to the lowest earners
4. **Proactive Alerts** — AI predicts disruptions before they happen
5. **Mobile-First PWA** — Works on budget phones without app store downloads
6. **Real-Time Weather Integration** — Live data from OpenWeatherMap with 15-minute polling
7. **Shield Score Gamification** — Trust metric incentivizes honest behavior
8. **Multi-Platform Support** — Zomato, Swiggy, Zepto, Blinkit, Amazon, Flipkart, Dunzo workers

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & npm
- Git

### Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd gigshield

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables
The app connects to Lovable Cloud (Supabase) automatically. For local development, ensure these are set:
- `VITE_SUPABASE_URL` — Backend URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Public API key

### Live Demo
- **Preview:** [GigShield Live](https://id-preview--4d21fef8-6b63-4d7e-926e-19fd15e30a55.lovable.app)

---

## 📄 License

Built with ❤️ for India's gig workers. Hackathon project.

---

*This README serves as the Phase 1 Idea Document for the hackathon submission.*
