# 🛡️ GigShield — AI-Powered Parametric Insurance for India's Gig Workers

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
9. [Implemented Features (Deep Dive)](#-implemented-features-deep-dive)
10. [Development Plan](#-development-plan)
11. [Architecture Overview](#-architecture-overview)
12. [Key Differentiators](#-key-differentiators)
13. [🛡️ Adversarial Defense & Anti-Spoofing Strategy](#️-adversarial-defense--anti-spoofing-strategy)
14. [Getting Started](#-getting-started)

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

### 3. 📍 GPS-Based Cross-Zone Claim System
GigShield allows gig workers to file claims in zones they aren't registered in — as long as their real-time GPS location proves they were physically nearby. This reflects the reality that delivery workers frequently cross zone boundaries during shifts.

**How it works:**

```
┌─────────────────────────────────────────────────────────────────┐
│              GPS Cross-Zone Claim Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Worker shares GPS location (Browser Geolocation API)            │
│       │                                                          │
│       ▼                                                          │
│  GPS coordinates stored: workers.last_lat, workers.last_lng      │
│  Timestamp stored: workers.last_location_at                      │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────┐           │
│  │  INCIDENT TRIGGERS (fire-trigger edge function)   │           │
│  │                                                    │           │
│  │  1. Find registered workers (zone_id match)        │           │
│  │  2. Find GPS workers within 10km radius            │           │
│  │     - Must have GPS updated within last 1 hour     │           │
│  │     - Haversine distance ≤ GPS_RADIUS_KM (10km)    │           │
│  │  3. Both groups get auto-generated claims           │           │
│  └──────────────────────────────────────────────────┘           │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────┐           │
│  │  MANUAL REPORTS (worker-report edge function)      │           │
│  │                                                    │           │
│  │  action: "report_disruption"                       │           │
│  │  → GPS finds nearest zone within 10km radius       │           │
│  │  → Incident created in that zone (not registered)  │           │
│  │                                                    │           │
│  │  action: "file_claim"                              │           │
│  │  → Checks: registered zone match OR GPS proximity  │           │
│  │  → If neither: "Share location to claim in other   │           │
│  │     zones" error guides the worker                 │           │
│  └──────────────────────────────────────────────────┘           │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────┐           │
│  │  FRAUD SCORING (GPS-aware)                         │           │
│  │                                                    │           │
│  │  • claim_method: "registered_zone" or              │           │
│  │    "gps_proximity" or "gps_nearest_zone"           │           │
│  │  • GPS distance penalty: min(0.1, distance × 0.01)│           │
│  │  • Cross-zone claims get slightly higher AI        │           │
│  │    anomaly scrutiny from Gemini fraud detector     │           │
│  │  • fraud_details stores: gps_method, distance_km,  │           │
│  │    gps_lat, gps_lng, gps_radius_km                 │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**Key implementation details:**

| Component | Detail |
|-----------|--------|
| **Haversine formula** | Used in both `fire-trigger` and `worker-report` to calculate Earth-surface distance between worker GPS and zone center |
| **Radius** | `GPS_RADIUS_KM = 10` — workers within 10km of any zone center are eligible |
| **GPS freshness** | Auto-trigger claims require GPS updated within the last 1 hour (`last_location_at >= now() - 1hr`) |
| **Location update** | Workers send `lat`/`lng` with reports; stored in `workers.last_lat`, `workers.last_lng`, `workers.last_location_at` |
| **Nearest zone** | For disruption reports, the system finds the nearest zone to the worker's GPS (not just their registered zone) |
| **Fraud metadata** | Every claim records `gps_method` ("registered_zone", "gps_proximity", "gps_nearest_zone") and `gps_distance_km` in `fraud_details` JSON |
| **AI scrutiny** | Gemini AI fraud detector receives `claim_method` and `gps_distance_km` per worker — cross-zone GPS claims get marginally higher anomaly scoring |
| **Error guidance** | Workers without GPS who try to claim in another zone see: *"Share your location to claim in other zones"* |

**Example scenario:**
> Priya is registered in zone `del-cp` (Connaught Place) but is delivering in `del-dwarka` (Dwarka, 8km away) when extreme heat strikes. She shares her GPS location → the system calculates she is 8km from Dwarka's zone center (within 10km radius) → her claim is created with `gps_method: "gps_proximity"`, `gps_distance_km: 8.0` → AI fraud score adds a small `0.08` GPS penalty → claim is still approved.

### 4. Predictive AI Alerts (`ai-predict` edge function)
- Uses **Gemini AI** (via Lovable AI gateway) to analyze weather patterns
- Predicts probability of disruption events **24-48 hours in advance**
- Generates city-level forecasts: event type, probability %, estimated claims volume, reserve requirements
- Workers see proactive alerts: *"⚠️ Heavy Monsoon Rainfall expected in your area (88% chance)"*

### 5. Shield Score — Worker Trust Metric
An AI-computed trust score (0-100) for each worker:
- **Increases:** Verified claims, long tenure, consistent zone presence
- **Decreases:** Flagged claims, GPS mismatches, unusual patterns
- **Impact:** Higher scores → lower premiums, priority payouts

### 6. Fraud Network Visualization (Admin Dashboard)
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
| **react-i18next** | Multi-language internationalization (EN, HI, TA, TE) |

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

### Payment & Notification Integrations (Demo Mode)

GigShield is architecturally designed for real-world payment and notification integrations. The current demo showcases these flows using high-fidelity mocks:

| Integration | Demo Implementation | Production-Ready For |
|-------------|---------------------|---------------------|
| **UPI Payouts** | Visual Payout Simulator with animated transaction flow | **Razorpay Fund Account + Contacts API** |
| **WhatsApp Notifications** | Mock toasts with WhatsApp-branded styling | **Twilio WhatsApp Business API** |

#### Payout Simulator
The `PayoutSimulator` component demonstrates the instant UPI payout experience:
- Animated 3-step flow: `Initiating → Processing → Completed`
- Mock transaction IDs and completion times
- Realistic UPI interface preview
- **Upgrade path:** Replace mock with Razorpay `POST /contacts` + `POST /fund_accounts` + `POST /payouts` API calls

#### WhatsApp Notifications (Mock)
The `whatsapp-mock.ts` utility simulates real-time worker notifications:
- **Claim Created:** `"GigShield: Your [type] claim for ₹[amount] has been submitted. Track status in-app."`
- **Claim Approved:** `"GigShield: Great news [Name]! Your claim for ₹[amount] is APPROVED. Payout processing..."`
- **Payout Sent:** `"GigShield: ₹[amount] credited to your UPI! Transaction complete. Stay safe! 🛡️"`
- **Weather Alert:** `"GigShield: ⚠️ [type] detected in your zone. Your coverage is ACTIVE. Stay safe!"`
- **Upgrade path:** Replace toast calls with Twilio WhatsApp API via Edge Function

### Database Schema
- **workers** — Worker profiles (name, phone, platform, city, zone, shield_score)
- **zones** — Geographic zones with risk scores and coordinates
- **policies** — Weekly insurance policies (tier, premium, max_payout, dates)
- **incidents** — Weather/trigger events with severity scoring
- **claims** — Auto-generated claims linked to policies and incidents
- **payouts** — Payment records with UPI tracking
- **weather_readings** — Historical weather data per zone
- **user_roles** — Role-based access control (admin/moderator/user)
- **notifications** — Real-time notification delivery per user
- **appeals** — Claims dispute/appeal records with evidence

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
| `submit-appeal` | Worker appeal submission with evidence upload |
| `review-appeal` | Admin appeal review and resolution |

---

## 📅 Development Plan

### Phase 1: Ideation & Foundation (March 4-20) ✅
- [x] Problem research & persona development
- [x] Premium model design & trigger definition
- [x] Tech stack selection & architecture planning
- [x] AI/ML integration strategy
- [x] Comprehensive README documentation

### Phase 2: Core Build (March 20 - April 3) ✅
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
- [x] Real-time notifications system (push/in-app alerts)
- [x] Worker onboarding flow (5-step guided wizard)
- [x] Claims appeal/dispute workflow with evidence uploads
- [x] Predictive risk dashboard (AI-powered forecasting)
- [x] Worker earnings impact report
- [x] Admin cohort analytics (retention, churn, renewal rates)
- [x] Payout proof / transparency ledger
- [x] Multi-language support (English, Hindi, Tamil, Telugu)
- [x] Adversarial defense & anti-spoofing — **fully implemented** (Edge Function, database tables, admin dashboard)
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

## 🚀 Implemented Features (Deep Dive)

### 1. 🔔 Real-Time Notifications System
Workers receive instant in-app alerts without needing to check the dashboard manually.

**How it works:**
- **Database triggers** (`notify_on_incident`, `notify_on_claim_update`, `notify_on_payout_update`) automatically insert into the `notifications` table whenever an incident fires, a claim status changes, or a payout completes
- **Supabase Realtime** subscription pushes new notifications to the client instantly via `postgres_changes` on the `notifications` table filtered by `user_id`
- **Notification Bell** (`NotificationBell.tsx`) in the header shows unread count badge and a dropdown with full notification history
- **WhatsApp-styled toasts** (via Sonner) pop up with color-coded gradients: amber for weather ⚠️, green for payouts 💰, blue for claims 📋
- **Mark as read / Mark all read** — workers can dismiss individual or all notifications
- **Notification types:** `weather`, `claim`, `payout` — stored as a PostgreSQL enum
- **RLS policies** ensure workers only see their own notifications; admins can manage all

**Tech:** Supabase Realtime, PostgreSQL triggers (SECURITY DEFINER), Sonner toast library, Framer Motion animations

---

### 2. 🧭 Worker Onboarding Flow
A guided 5-step wizard that gets new workers protected in under 90 seconds.

**Steps:**
1. **Account** — Name, email, password with real-time validation; creates auth user + auto-generates worker profile via `handle_new_user()` trigger
2. **Platform** — Select delivery platform (Zomato, Swiggy, Zepto, Blinkit, Amazon Flex, Flipkart, Dunzo) with branded icons
3. **Zone** — Choose primary delivery zone from database; shows **Zone Risk Preview** with risk score, recent incidents, and weather data
4. **Shield Score** — Animated gauge explainer showing the 4 factors (Weather Risk, Claim History, Seasonality, Loyalty) that determine their trust score and premiums
5. **Plan** — Choose BASIC/STANDARD/PRO tier with dynamic premium preview calculated via the `calculate-premium` edge function based on selected zone risk

**Key details:**
- Progress bar with step indicators
- Back navigation between steps
- Zone data fetched from `zones` table with city grouping
- Policy created on completion with correct tier, premium, and date range
- Smooth Framer Motion transitions between steps

**Tech:** Multi-step form state, Supabase Auth, `calculate-premium` edge function, animated ShieldScoreGauge component

---

### 3. ⚖️ Claims Appeal / Dispute Workflow
Workers can dispute flagged or rejected claims with photo evidence and written explanations.

**Worker side:**
- **Appeal Dialog** (`AppealDialog.tsx`) opens from the Claim History page for any flagged/rejected claim
- Workers write a detailed reason for the dispute
- **Photo evidence upload** — multiple images uploaded to Supabase Storage `evidence` bucket with worker-scoped paths
- Appeal stored in `appeals` table with `status: pending`, linked to the claim via `claim_id`
- Workers can track appeal status (pending → approved/rejected) in their claim history

**Admin side:**
- **Appeals queue** in the Admin Dashboard with `review-appeal` edge function
- Admins see the original claim details, fraud score, worker's appeal reason, and uploaded evidence
- Admins can approve (which updates claim status to approved and triggers payout) or reject with admin notes
- All actions logged with timestamps

**Security:** RLS ensures workers can only create/view their own appeals; admins can manage all appeals

**Tech:** Supabase Storage (public `evidence` bucket), `submit-appeal` + `review-appeal` edge functions, Dialog component

---

### 4. 🔮 Predictive Risk Dashboard
AI-powered forecasting of upcoming weather disruptions so workers can prepare and admins can pre-allocate funds.

**How it works:**
- **`ai-predict` edge function** calls Google Gemini 2.5 Flash via the Lovable AI Gateway
- Analyzes current weather readings, historical incident data, and seasonal patterns per zone
- Returns structured predictions: event type, probability (%), estimated affected workers, projected claims volume, and recommended reserve allocation

**Worker view (Alerts page → Predictions tab):**
- Cards showing predicted events for their zone in the next 24-48 hours
- Color-coded probability indicators (green < 40%, amber 40-70%, red > 70%)
- Actionable advice: "Consider staying home tomorrow" or "Your coverage is active"

**Admin view (Predictions tab):**
- City-level forecast table with all zones
- Aggregate projected claims and reserve requirements
- Helps admins pre-allocate funds before events hit

**Tech:** Lovable AI Gateway (Gemini 2.5 Flash), structured tool calling for JSON output, Recharts for visualization

---

### 5. 📊 Worker Earnings Impact Report
Shows workers exactly how much income they lost vs. how much GigShield covered — reinforcing the platform's value.

**Earnings Report page (`EarningsReportPage.tsx`):**
- **Income Loss vs. Coverage chart** — visual comparison of estimated lost earnings during incidents vs. actual GigShield payouts
- **Coverage ratio** — percentage of lost income recovered (e.g., "GigShield covered 78% of your weather-related income loss")
- **Breakdown by event type** — separate analysis for rain, heat, AQI events
- **Weekly/monthly trend** — line chart showing protection value over time
- **ROI calculation** — total premiums paid vs. total payouts received

**Data sources:** Joins `claims`, `payouts`, `policies`, and `incidents` tables to compute comprehensive earnings impact

**Tech:** Recharts (AreaChart, BarChart), Supabase queries with joins, responsive card layout

---

### 6. 📈 Admin Cohort Analytics
Deep analytics for admin decision-making — retention, churn, and renewal rates segmented by city, platform, and tier.

**Cohort Analytics Tab (`CohortAnalyticsTab.tsx`):**
- **Retention heatmap** — month-over-month worker retention rates
- **Churn prediction** — identifies workers at risk of not renewing based on claim frequency, Shield Score trends, and engagement
- **Policy renewal rates** — segmented by:
  - **City:** Mumbai vs. Delhi vs. Bangalore vs. Hyderabad vs. Chennai
  - **Platform:** Zomato vs. Swiggy vs. Zepto vs. Blinkit vs. Amazon Flex
  - **Tier:** BASIC vs. STANDARD vs. PRO
- **Key metrics:** Active workers, total premiums collected, loss ratio, average Shield Score
- **Trend charts:** Worker growth over time, premium revenue trends

**Tech:** Recharts (PieChart, LineChart, BarChart), Supabase aggregation queries, Tabs component for segmentation

---

### 7. 🔍 Payout Proof / Transparency Ledger
A worker-visible audit trail of all trigger events → claims → payouts for trust-building.

**Transparency Ledger (`TransparencyLedger.tsx`):**
- **End-to-end trail** for every payout: Weather Event → Incident Created → Claim Generated → Fraud Check → Approval → Payout Completed
- **Timeline view** — each step shown with timestamp, status, and relevant data (weather reading, fraud score, payout amount)
- **Filterable** by date range, event type, and status
- **Public verification** — workers can see that the system is fair and automated
- **Incident details** — links to the original weather data that triggered the event
- **Claim transparency** — shows fraud score and why the claim was approved/flagged

**Admin view:** Full ledger across all workers with aggregate statistics
**Worker view:** Personal ledger filtered to their own claims and payouts

**Tech:** Supabase joins across `incidents` → `claims` → `payouts` tables, Table component, Badge status indicators, date-fns formatting

---

### 8. 🌐 Multi-Language Support
Full internationalization supporting English, Hindi, Tamil, and Telugu — covering all UI text across every page.

**Implementation:**
- **react-i18next** with browser language auto-detection and localStorage persistence
- **Language Switcher** in the navbar allows instant language change without page refresh
- **Coverage:** Landing page, auth pages, onboarding wizard, worker dashboard, admin dashboard, all shared components
- **Fallback:** Missing translations fall back to English automatically
- **Scalable:** Adding a new language requires only a new JSON file in `src/i18n/`

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
9. **Adversarial Resilience** — Multi-signal anti-spoofing architecture designed to withstand coordinated fraud syndicates

---

## 🛡️ Adversarial Defense & Anti-Spoofing Strategy

> **⚡ Implementation Status: FULLY BUILT** — This is not a design document. Every layer described below is implemented as production code: the `anti-spoof` Edge Function (multi-signal analysis engine), `device_fingerprints` / `fraud_signals` / `spoofing_analysis` database tables, client-side device fingerprinting library, and a real-time **Anti-Spoof Dashboard** in the admin panel for monitoring and manual resolution.

> **Threat Context:** A coordinated syndicate of 500+ delivery workers in a tier-1 city has exploited a competing parametric insurance platform using GPS-spoofing applications via organized Telegram groups — faking locations in red-alert weather zones while resting at home, triggering mass false payouts and draining the liquidity pool. GigShield is architecturally designed — and built — to resist this exact attack vector.

### The Core Problem with GPS-Only Verification

Traditional GPS-based verification has a fatal flaw: **GPS coordinates are trivially spoofable on Android devices**. Apps like FakeGPS, GPS JoyStick, and Mock Locations allow any user to broadcast arbitrary coordinates. A syndicate exploiting this can:

1. Coordinate via Telegram to identify a real weather event in a distant zone
2. Each member spoofs their GPS to that zone's coordinates
3. File claims simultaneously, each appearing as a "legitimate" in-zone worker
4. Drain the liquidity pool before the system detects the coordinated attack

**Simple GPS verification is officially obsolete.** GigShield's defense operates on three layers: **Signal Triangulation**, **Behavioral Intelligence**, and **Network Graph Analysis**.

---

### Layer 1: Multi-Signal Location Triangulation (Differentiating Genuine vs. Spoofed)

GPS is treated as **one input among many** — never the sole source of truth. The `anti-spoof` Edge Function (`supabase/functions/anti-spoof/index.ts`) cross-references multiple independent signals that are significantly harder to spoof simultaneously:

| Signal | What It Proves | Spoofing Difficulty |
|--------|---------------|-------------------|
| **GPS Coordinates** | Reported location | Trivial (mock apps) |
| **Cell Tower ID (CID)** | Approximate location via network | Hard (requires physical relocation) |
| **Wi-Fi BSSID Fingerprint** | Nearby routers prove physical presence | Very Hard (unique per building) |
| **IP Geolocation** | ISP-level location | Moderate (VPN can bypass, but ISP mismatch flags) |
| **Network Latency Pattern** | RTT to local servers varies by region | Hard (physics-bound) |
| **Accelerometer/Gyroscope** | Motion patterns of a delivery worker vs. stationary person | Hard (must simulate realistic movement) |

**Triangulation Logic:**

```
Location Confidence = f(GPS, CellTower, WiFi, IP, Motion)

IF GPS_location matches CellTower_location (±5km)
   AND WiFi_BSSIDs are consistent with that area
   AND IP_geolocation is in the same city
   AND accelerometer shows outdoor movement patterns
THEN → Location Confidence = HIGH (0.9+)

IF GPS_location does NOT match CellTower_location
   OR WiFi scan returns home-network BSSIDs
   OR accelerometer shows stationary/indoor patterns
THEN → Location Confidence = LOW (0.2) → FLAG for review
```

**Key insight:** A worker spoofing GPS from home will still have:
- Their **home Wi-Fi router's BSSID** in the scan (not routers near the claimed zone)
- Their **home cell tower** as the primary connection (not the claimed zone's tower)
- **Stationary accelerometer data** (no walking, no vehicle vibration)
- Their **home ISP's IP range** (not the claimed city's ISP)

Spoofing *all four simultaneously* requires physical relocation — which defeats the purpose of the fraud.

**Device Integrity Checks (Implemented):**
- **Mock Location Detection:** The client-side fingerprint library (`src/lib/device-fingerprint.ts`) collects `mock_location_enabled`, accelerometer variance, GPU renderer, and connection type. The Edge Function flags `mock_location_enabled = true` as a **critical** fraud signal (score 0.95).
- **Shared Device Detection:** Device hashes are stored in the `device_fingerprints` table. If the same `device_hash` appears under multiple `worker_id`s, a **high-severity shared_device** signal is raised.
- **Accelerometer Analysis:** Near-zero accelerometer variance (< 0.01) flags the device as stationary — inconsistent with outdoor delivery work.
- **Timezone Cross-Check:** The reported device timezone is compared against the expected timezone for the worker's GPS coordinates; mismatches produce a **medium-severity** signal.

---

### Layer 2: Behavioral Intelligence (AI/ML Pattern Analysis) — Implemented

Even if a sophisticated attacker bypasses signal triangulation, their **behavior** will differ from genuine workers. The `anti-spoof` Edge Function analyzes temporal and behavioral patterns in real time:

#### A. Individual Anomaly Detection

| Behavior Signal | Genuine Worker | Spoofed Worker |
|----------------|---------------|----------------|
| **Delivery activity** | Order acceptance ↔ delivery completion logs throughout the day | No delivery activity before/after the claim window |
| **Movement trajectory** | Continuous GPS trail showing natural routes between deliveries | GPS "teleports" — sudden jump from home location to the claimed zone |
| **Claim timing** | Claims filed during or shortly after incident onset | Claims filed simultaneously with dozens of others (synchronized) |
| **Historical zone presence** | Worker has prior GPS history in the claimed zone (regular delivery area) | First-ever appearance in this zone, despite claiming to be "working there" |
| **Session behavior** | App used throughout the day (checking orders, navigation) | App opened only to file claim, then closed |
| **Accelerometer signature** | Two-wheeler vibration pattern (delivery bike), walking between deliveries | Stationary (sitting on sofa), brief device pickups (filing claim on phone) |

**ML Models Used:**
- **Isolation Forest** for individual anomaly detection — identifies claims that deviate from a worker's established behavioral baseline
- **LSTM (Long Short-Term Memory)** for trajectory analysis — learns typical movement patterns and flags teleportation/impossible-speed GPS jumps
- **Gradient Boosted Trees (XGBoost)** for composite fraud scoring — combines all signals into a single fraud probability

#### B. Temporal Clustering Detection (Coordinated Attack Identification)

The most powerful signal against syndicates is **temporal clustering** — genuine weather events produce a gradual, organic claim curve; coordinated fraud produces a sharp, synchronized spike:

```
Organic Weather Event (genuine):
Claims │     ╭───╮
       │   ╭╯   ╰──╮
       │ ╭╯        ╰──╮
       │╯              ╰───
       └──────────────────── Time
       [Weather starts]  [Weather ends]
       Claims trickle in over 1-3 hours as workers individually notice

Coordinated Fraud Attack (spoofed):
Claims │        █
       │        █
       │        █
       │        █
       │________█__________ Time
       [Telegram "GO" signal sent]
       50+ claims arrive within 5-minute window — statistically impossible
```

**Detection Algorithm (Implemented in `anti-spoof` Edge Function):**
1. Query all claims in the same zone within a **30-minute window** — if ≥10 arrive, flag as `temporal_cluster` (high severity)
2. Query all claims in a **2-hour window** and compute inter-arrival intervals
3. Calculate the **coefficient of variation (CV)** of intervals — if CV < 0.15 with mean interval < 60s, flag as `uniform_timing` (critical severity, score 0.85) indicating bot-like synchronized filing
4. All claims in the anomalous window are flagged for enhanced verification
5. Workers in the cluster are cross-referenced for shared device hashes (see Layer 3)

---

### Layer 3: Network Graph Analysis (Identifying Fraud Rings) — Implemented

Once temporal clustering flags a suspicious batch of claims, **network graph analysis** maps the relationships between the flagged workers. The Edge Function queries claims with `fraud_score ≥ 0.5` and cross-references device fingerprints to detect collusion:

#### Data Points Analyzed (Beyond GPS Coordinates)

| Data Point | What It Reveals | Ring Indicator |
|-----------|----------------|---------------|
| **UPI Account Clustering** | Shared bank accounts or beneficiary overlap | Multiple workers sending payouts to the same UPI ID |
| **Device Fingerprint** | Hardware/software identifiers (screen resolution, OS version, installed fonts, WebGL hash) | Multiple "workers" sharing the same device fingerprint |
| **Registration IP Address** | Network used during signup | 20+ accounts registered from the same IP/subnet within days |
| **Referral Chain** | Who referred whom | Tight referral loops forming a closed community |
| **Claim Co-occurrence Matrix** | Which workers always claim together | Statistical correlation > 0.8 between two workers' claim timing |
| **SIM/IMEI Patterns** | Physical device identification | SIM swapping between multiple accounts, or same IMEI across accounts |
| **Phone Number Clustering** | Sequential or patterned phone numbers | Bulk SIM purchases (numbers like +91-98765-00001 through +91-98765-00050) |
| **Geospatial Home Base** | Workers' non-claim-time GPS data reveals actual home locations | 50 "workers" from 50 different zones all reside in the same neighborhood |

#### Graph Construction

```
Worker A ──[same UPI]──▶ Worker B
    │                        │
    │ [same device]          │ [referred by]
    │                        │
Worker C ──[same IP]────▶ Worker D
    │                        │
    └──[claims together]─────┘

Community Detection Algorithm (Louvain method):
→ Identifies tightly connected clusters
→ Clusters with >10 members AND >3 shared attributes → FRAUD RING
→ All members' claims auto-flagged, Shield Scores frozen
```

#### Response Protocol for Detected Rings

| Ring Size | Response | Worker Impact |
|-----------|----------|--------------|
| 2-5 members | Enhanced verification on all future claims | Shield Score penalty, manual review required |
| 6-20 members | Temporary claim freeze (48 hours) + admin investigation | Claims held, not rejected — innocent members can appeal |
| 20+ members | **Pool protection mode**: all claims from flagged cluster require multi-factor verification | Legitimate members get fast-tracked through appeal with counter-evidence |

---

### UX Balance: Protecting Honest Workers — Implemented

The most critical design challenge is ensuring fraud detection **never unfairly punishes genuine workers**. This is fully implemented in both backend and frontend.

#### Principle: "Soft Hold, Not Hard Block" (Implemented)

GigShield **never instantly rejects** a flagged claim. The `anti-spoof` Edge Function assigns one of three verification statuses — `cleared`, `soft_hold`, or `flagged` — and the `claim_status` enum includes `soft_hold` as a first-class state. Workers see friendly, non-punitive messaging in the UI:

```
┌────────────────────────────────────────────────────────┐
│                CLAIM PROCESSING FLOW                     │
├────────────────────────────────────────────────────────┤
│                                                          │
│  Claim Submitted                                         │
│       │                                                  │
│       ▼                                                  │
│  ┌─────────────────────────────────┐                    │
│  │  Multi-Signal Verification       │                    │
│  │  (GPS + CellTower + WiFi + IMU)  │                    │
│  └──────────┬──────────────────────┘                    │
│             │                                            │
│     ┌───────┼───────┐                                    │
│     ▼       ▼       ▼                                    │
│  [GREEN]  [AMBER]  [RED]                                 │
│  Score    Score     Score                                │
│  < 0.3   0.3-0.7   > 0.7                                │
│     │       │       │                                    │
│     ▼       ▼       ▼                                    │
│  AUTO-     SOFT     ENHANCED                             │
│  APPROVE   HOLD     VERIFICATION                         │
│  (instant) (2 hrs)  (24 hrs)                             │
│             │       │                                    │
│             ▼       ▼                                    │
│         Worker gets notification:                        │
│         "Your claim is being verified.                   │
│          Expected resolution: [time]"                    │
│             │       │                                    │
│             ▼       ▼                                    │
│         ┌─────────────────────────┐                     │
│         │  APPEAL WINDOW (24 hrs) │                     │
│         │  Submit: photos, GPS    │                     │
│         │  logs, delivery receipts│                     │
│         └─────────────────────────┘                     │
└────────────────────────────────────────────────────────┘
```

#### Shield Score-Based Trust Tiers

Workers with established trust histories get preferential treatment during verification:

| Shield Score | Trust Level | Verification Standard | Fraud Threshold |
|-------------|------------|----------------------|----------------|
| 80-100 | **Platinum** | GPS-only sufficient; auto-approve unless 2+ red flags | 0.8 |
| 60-79 | **Gold** | GPS + one corroborating signal | 0.6 |
| 40-59 | **Silver** | GPS + two corroborating signals | 0.5 |
| 0-39 | **Bronze** | Full multi-signal verification required | 0.3 |

**Key UX decisions:**
- **New workers start at Silver (50)** — not punished for being new, but not fully trusted either
- **Every verified claim increases Shield Score** — building trust over time
- **Network drops during bad weather are EXPECTED** — the system treats GPS darkness during severe weather as a *positive* signal (bad weather causes network issues, which is consistent with a genuine claim)
- **Budget phone GPS drift is accounted for** — the 10km radius and cell tower cross-check handle inaccuracies common on ₹5,000-10,000 phones
- **Workers always see WHY a claim was flagged** — "Your location couldn't be verified because [specific reason]. You can submit [specific evidence] to resolve this."
- **Appeal success rate is tracked** — if a worker's appeals are consistently approved, the system learns to trust them more (feedback loop into Shield Score)

#### Handling the "Genuine Worker in Bad Weather with No Signal" Scenario

This is the hardest edge case: a worker is genuinely stranded in a flooded zone, but their phone has poor connectivity (2G fallback, no GPS fix, intermittent network).

**GigShield's approach:**

1. **Last Known Good Location:** If GPS goes dark, the system uses the worker's last confirmed GPS position (within the last 2 hours) as their presumed location
2. **Weather Severity as Positive Signal:** If weather data confirms extreme conditions in the worker's last-known zone, GPS absence is treated as *corroborating evidence* (bad weather = network disruption is expected)
3. **Retroactive Verification:** The worker can submit their claim after connectivity is restored — the system checks if their GPS trail before the outage was consistent with being in the affected zone
4. **Peer Corroboration:** If multiple workers in the same zone all experience GPS drops simultaneously during extreme weather, this is treated as a mass-genuine-event, not fraud
5. **Grace Period:** Workers in zones with active severe-weather incidents get a 6-hour extended window to file/verify claims (vs. standard 2-hour window)

---

### Summary: Why GigShield's Architecture Resists This Attack

| Attack Vector | GigShield's Defense |
|--------------|-------------------|
| GPS spoofing from home | Cell tower + Wi-Fi BSSID + accelerometer contradict the spoofed GPS |
| Coordinated claim timing | Temporal clustering analysis flags statistically impossible claim spikes |
| Multiple fake accounts | Device fingerprinting + registration IP analysis + phone number clustering |
| Shared payout destinations | UPI network analysis detects money flowing to common accounts |
| Mock location apps | Android Play Integrity API + mock location flag detection |
| VPN to mask IP | ISP mismatch with cell tower location creates a detectable inconsistency |
| "Clean" spoofing (one-off) | Behavioral baseline comparison — no prior delivery activity in claimed zone |
| Social engineering (buying accounts) | Shield Score is non-transferable and requires months of genuine activity to build |

**The key architectural principle:** No single signal is trusted alone. The system requires **convergence across independent channels** — GPS, network infrastructure, device sensors, behavioral history, and temporal patterns must all tell a consistent story. Spoofing one is easy. Spoofing all five simultaneously is practically impossible without physically being in the claimed location — which, of course, would make the claim genuine.

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
- **Published:** [GigShield Live](https://gigshield.lovable.app)
- **Preview:** [GigShield Preview](https://id-preview--4d21fef8-6b63-4d7e-926e-19fd15e30a55.lovable.app)

---

## 📄 License

Built with ❤️ for India's gig workers. Hackathon project for DEVTrails 2026.

---

*This document serves as the comprehensive Idea Document for the DEVTrails 2026 hackathon submission, covering all aspects of GigShield's architecture, strategy, and adversarial defense posture.*
