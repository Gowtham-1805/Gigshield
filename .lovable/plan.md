
# GigShield — Implementation Plan

## 1. Landing/Marketing Page
- Hero section with tagline "Kaam ruke toh paisa nahi, GigShield hai na!"
- Animated 30-second pitch section explaining how it works (3 steps: Disruption → Auto-detect → Payout)
- Pricing tiers (Basic ₹29-49, Standard ₹49-79, Pro ₹79-129) with feature comparison cards
- Trust indicators: payout speed, zero paperwork, UPI integration
- Hindi/English language toggle (i18n)
- CTA buttons leading to worker signup

## 2. Database & Auth (Lovable Cloud / Supabase)
- Phone OTP authentication via Supabase Auth
- Tables: `workers` (city, zone, platform, Shield Score), `zones` (name, city, coordinates, risk_score), `policies` (worker, tier, start/end, premium, status), `claims` (policy, trigger_type, amount, status, fraud_score), `incidents` (zone, trigger_type, weather_data, timestamp), `payouts` (claim, amount, UPI status)
- Row-Level Security so workers see only their data; admin role for dashboard access
- User roles table for admin access control

## 3. Worker PWA (Mobile-First)
- **Onboarding flow**: Phone OTP → Select platform (Zomato/Swiggy) → Auto-detect or select city & zone → AI-recommended plan → UPI payment (Razorpay test mode placeholder)
- **Home dashboard**: Active plan card, coverage status, Shield Score (0-100) gauge, weather alerts for their zone, claimed vs. max coverage stats
- **Claims history**: Timeline view with status badges (approved ✅, processing 🔄, flagged 🚩)
- **Plan management**: Renew, upgrade/downgrade tier
- **Alerts section**: Predictive weather warnings ("Heavy rain expected Thursday")
- **Profile**: Zone info, earnings history, risk score breakdown

## 4. Admin/Insurer Dashboard (Desktop)
- **Overview KPIs**: Active workers, policies, claims this week, loss ratio, revenue
- **Zone Risk Map**: Interactive India map (Leaflet.js + OpenStreetMap) with color-coded risk zones
- **Claims Management**: Table with auto-approved / pending / flagged tabs, drill-down into individual claims with fraud check details
- **Predictive Analytics**: Next-week forecast cards per city with estimated claims and reserve needed (powered by Lovable AI)
- **Fraud Dashboard**: Anomaly score table, flagged workers list, network fraud graph visualization (D3.js force-directed graph showing shared devices/UPI/correlated claims)
- **Financial View**: Premium collected vs. claims paid charts (Recharts), profitability by zone
- **Live Demo Trigger Panel** (see below)

## 5. Live Demo Trigger Panel (Admin)
- Admin can simulate weather events: select a zone → choose trigger type (heavy rain, extreme heat, AQI spike, curfew) → set severity
- On trigger: real-time flow shows incident creation → affected workers identified → claims auto-initiated → fraud checks run → payouts appear in worker dashboard
- Visual timeline/log showing each step completing in real-time

## 6. Parametric Trigger Engine (Edge Functions)
- **Weather polling edge function**: Calls OpenWeatherMap API every 15 min for active zones, stores data in time-series table
- **Trigger evaluation edge function**: Checks thresholds (rain >50mm/hr, temp >45°C, AQI >400), creates incidents, auto-initiates claims for affected workers
- **Premium calculation**: Rule-based formula (Base × Zone Risk × Season × Claim History) with Lovable AI (Gemini) for personalized recommendations and next-week risk predictions
- **Fraud checks**: Multi-layer validation (GPS/zone match, multi-source weather cross-reference, velocity checks, duplicate detection) — implemented as edge function logic
- Store OpenWeatherMap API key as a Supabase secret

## 7. AI Integration (Lovable AI Gateway)
- Edge function calling Gemini for:
  - Personalized plan recommendations based on worker zone/history
  - Next-week disruption probability predictions
  - Shield Score narrative explanations
  - Anomaly scoring for fraud detection assistance

## 8. Design & UX
- Color scheme: Shield blue (#2563EB) + safety green (#10B981) + alert amber (#F59E0B)
- Mobile-first responsive design for worker app
- Desktop-optimized admin dashboard with sidebar navigation
- Micro-animations for claim flow visualization
- Card-based UI with clear status indicators
