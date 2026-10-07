# EquiNox Orchestration FSM — Product Description & Workflow Specification

> **Platform Version:** 2.0 (DataQuest 3.0 Release)  
> **Architecture:** Spring Boot 3.5 + React 18 (TypeScript) + PostgreSQL 16 + MinIO + Nginx  
> **Core Value Proposition:** End-to-End Industrial Equipment Service Orchestration  
> **Central Philosophy:** `VALIDATE → MATCH → EXECUTE → RECOVER → VERIFY`

---

## 1. Executive Summary

**EquiNox-FSM** is a specialized **Industrial Equipment Service Orchestration Platform** built for high-stakes, mission-critical manufacturing and heavy industrial environments.

Unlike traditional CMMS (Computerized Maintenance Management Systems) or static ticketing tools that simply log tickets in a queue, EquiNox-FSM actively **orchestrates** the complete end-to-end lifecycle of equipment service. It bridges plant operators, field technicians, dispatch managers, and enterprise administrators through real-time telemetry, automated 5-point validation, multi-factor technician dispatch scoring, automated exception failover, and dual-party cryptographic/audit-compliant verification.

---

## 2. Platform Persona Architecture & Role-Based Access Control (RBAC)

The platform provides dedicated, isolated workspaces tailored to three primary user classes, each with independent credentials and strict view boundaries.

```
+-----------------------------------------------------------------------------------------+
|                                    EQUINOX LOGIN PORTAL                                 |
|                     [ Operator Tab ]   [ Technician Tab ]   [ Admin Tab ]               |
+-----------------------------------------------------------------------------------------+
           |                                   |                                |
           v                                   v                                v
+----------------------+             +--------------------+            +--------------------+
|   OPERATOR PORTAL    |             | TECHNICIAN WORKSPACE|           |  ADMIN CONSOLE &   |
|                      |             |                    |            |   COMMAND CENTER   |
| • Request Submission |             | • Active Field HUD |            | • Policy Engines   |
| • Live Radar & ETA   |             | • Step Acceptance  |            | • Scoring Weights  |
| • Plant Machinery    |             | • Travel Status    |            | • SLA Tiers        |
| • Sign-Off Approval  |             | • Diagnostics HUD  |            | • Audit Trail Logs |
| • Plant Sites        |             | • Evidence Upload  |            | • Master Fleet Ops |
+----------------------+             +--------------------+            +--------------------+
```

### 2.1. Dedicated Login Portals (`/account/login`)
- **Interactive Role Switching:** The login interface includes three dedicated tabs (`Operator`, `Technician`, `Admin`), each displaying contextual role badges and role descriptions.
- **1-Click Default Auto-Fill:** Verified credentials pre-fill with a single click for instant access.
- **Backend Role Verification:** API validates the requested portal against database role records (`REQUESTER`, `TECHNICIAN`, `ADMIN`), preventing cross-role credential misuse.

### 2.2. Persona Profiles & Scoped View Boundaries

| Persona | Database Role | Default Account | Accessible Portals & Sidebar Views | Strictly Hidden / Restricted |
| :--- | :--- | :--- | :--- | :--- |
| **Plant Operator** | `REQUESTER` (ID 7) | `operator@equinox-fsm.com` | • **Plant Operator Self-Service Portal**<br>• **Machinery Fleet**<br>• **Plant Sites** | Manager Command Center, Exceptions Desk, Workforce Roster, SLA Config, Admin Console, Internal CMMS Settings |
| **Field Technician** | `TECHNICIAN` (ID 4) | `technician@equinox-fsm.com` | • **Technician Workspace (Field HUD)**<br>• **Machinery Fleet (Diagnostics)**<br>• **Spare Parts & Stock**<br>• **Plant Sites** | Operator Portal, Admin Panel, Exceptions Desk, SLA Policy Config, User Roster Management |
| **System Administrator** | `ADMIN` (ID 2) | `admin@equinox-fsm.com` | • **Admin Governance Panel**<br>• **Manager Command Center**<br>• **Full Operations & Workflow**<br>• **Assets, Sites, Workforce & Inventory** | None (Complete governance, simulation, and audit visibility) |

---

## 3. The 19-Step End-to-End Orchestration Lifecycle

EquiNox-FSM executes an automated 19-phase orchestration pipeline for every industrial service incident:

```
[01. INITIATION]        Breakdown reported by plant operator or telemetry
       │
[02. VALIDATION]        5-Point Automated Policy Engine
       │
[03. RESOURCE REQ]      Skills, spare parts & specialized tooling identified
       │
[04. MATCHING]          Multi-factor weighted technician ranking (40/30/20/10)
       │
[05. STOCK CHECK]       Inventory reserve lock in warehouse
       │
[06. CONFLICT CHECK]    Shift overlap & site constraint validation
       │
[07. APPROVAL GATE]     Automated rule-based or managerial authorization
       │
[08. DISPATCH]          Automated routing to primary matched technician
       │
[09. NOTIFICATION]      Real-time field alert dispatched
       │
[10. ACCEPTANCE]        Technician accepts job in Field HUD (Step 10)
       │
[11. TRAVEL & ETA]      Live GPS/corridor status: En Route → On Site (Step 11)
       │
[12. EXECUTION]         Diagnostics & active mechanical repair (Step 11c)
       │
[13. SLA MONITOR]       Real-time countdown vs. escalation thresholds
       │
[14. EXCEPTION DESK]    Dropout / Part Shortage / Access Block detection
       │
[15. RECOVERY]          Dynamic reassignment & automatic backup dispatch
       │
[16. COMPLETION PKG]    Telemetry measurements, parts used & photo evidence
       │
[17. VERIFICATION]      Plant Operator sign-off & supervisor approval gate
       │
[18. CLOSURE]           Machine marked operational & inventory reconciled
       │
[19. AUDIT TRAIL]       Immutable cryptographic timestamped compliance log
```

---

## 4. Deep-Dive Feature Breakdown

### Feature 1: Automated 5-Point Validation Engine (Step 2)
Before any request enters the dispatch queue, it is validated against 5 automated checks:
1. **Warranty & SLA Tier Validation:** Confirms active OEM warranty coverage or enterprise service contract.
2. **Operating Hours & Fatigue Bounds:** Assesses plant shift windows and legal work-hour compliance.
3. **Machine Criticality & Downtime Cost:** Evaluates revenue loss rate (e.g., $14,500/hr for stamping presses).
4. **Duplicate Request Filter:** Scans active requests to prevent redundant duplicate tickets for the same equipment.
5. **Initial Feasibility & Safety Check:** Confirms safety isolation protocols (LOTO — Lockout/Tagout).

### Feature 2: Multi-Factor Technician Matching Engine (Step 4)
The dispatch engine runs an automated scoring algorithm across available personnel:
$$\text{Score} = (W_{\text{skill}} \times S_{\text{skill}}) + (W_{\text{prox}} \times S_{\text{prox}}) + (W_{\text{load}} \times S_{\text{load}}) + (W_{\text{rate}} \times S_{\text{rate}})$$
- **Skill Matrix Match (Default: 40%):** Matches specific certifications (e.g., L4 Master Hydraulics, Siemens S7 PLC).
- **Proximity & Transit Time (Default: 30%):** Distance from technician base corridor (e.g., Sriperumbudur Corridor).
- **Current Workload & Utilization (Default: 20%):** Balances active tickets to avoid technician fatigue.
- **Performance Rating & First-Time Fix Rate (Default: 10%):** Historical SLA compliance rating (e.g., 98.4%).

### Feature 3: Resource Inventory Allocation & Lock (Step 5)
- Automated verification of bill-of-materials (BOM).
- Instant warehouse stock lock on critical parts (e.g., *Hydraulic Pump Assembly 250 Bar* in Sriperumbudur Central Depot).
- Alerts dispatched if stock dips below safety thresholds.

### Feature 4: Field Technician HUD Workspace (`/app/orchestration/technician-workspace`)
Tailored for field engineers on mobile or ruggedized tablets:
- **Assigned Dispatches Queue:** Real-time tickets with equipment code, site location, and failure description.
- **Workflow Action Bar:**
  - `[ Accept Assignment ]`: Locks technician onto the ticket (Step 10).
  - `[ Mark En Route ]`: Starts transit timer, updates Operator Radar ETA (Step 11).
  - `[ Mark Arrived On-Site ]`: Verifies arrival via geofence (Step 11b).
  - `[ Begin Repair ]`: Starts diagnostic logging (Step 11c).
  - `[ Report Blocker / Dropout ]`: Instantly escalates to Exceptions Desk if blocked.
- **Diagnostic Telemetry HUD:** Displays live machine parameters:
  - Working Pressure (Target: 248.5 Bar)
  - Operating Temperature (Target: 54.2 °C)
  - Flow Rate (Target: 118.0 L/min)
  - Vibration Level (Target: 1.2 mm/s)
- **Digital Completion Package Upload:**
  - Before & After photographic evidence capture.
  - Parts consumed reconciliation.
  - Technician work observations and digital sign-off.

### Feature 5: Plant Operator Self-Service & Radar Portal (`/app/orchestration/customer-portal`)
Tailored for plant operators and equipment supervisors:
- **1-Click Request Submission:** Quick breakdown modal with pre-loaded machinery fleet (e.g., Schuler Stamping Line A) and site locations.
- **Live Service Radar:** Real-time visibility into assigned technician name, status, and arrival ETA (~18 mins).
- **Dual-Party Operator Verification Gate (Phase 18):** When technician submits completion, plant operator receives inspection report and clicks `[ APPROVE COMPLETION & RESTORE MACHINE ]` to officially close the incident.

### Feature 6: Manager Command Center (`/app/orchestration/command-center`)
Central dispatch and operations oversight:
- **Live KPI Strip:**
  - Active Service Requests
  - SLA Compliance Rate
  - Mean Time to Dispatch (MTTD)
  - Active Field Technicians
- **Global Orchestration Grid:** Interactive table of all active requests with priority chips, 19-step stage indicators, assigned technicians, and SLA time remaining.
- **Dropout & Recovery Simulation:** Ability to test edge cases, trigger technician dropouts, and inspect real-time failover.

### Feature 7: Exceptions Desk & Automated Recovery Engine (`/app/orchestration/exceptions`)
Dedicated resolution hub for operational exceptions:
- **Monitored Exception Types:**
  - `TECHNICIAN_DROPOUT`: Technician unavailable or vehicle breakdown.
  - `PART_SHORTAGE`: Required component out of stock at primary depot.
  - `ACCESS_BLOCKED`: Plant site access delayed or safety permit pending.
- **Automated Recovery Playbooks:**
  - Re-evaluates ranking matrix excluding dropped technician.
  - Dispatches backup specialist (e.g., Karthik Natarajan).
  - Adjusts SLA baseline and updates Operator Radar in real time.

### Feature 8: Administrator Governance & Orchestration Control Panel (`/app/orchestration/admin-panel`)
System policy configuration and compliance oversight:
- **5-Point Policy Engine Toggles:** Enable/disable warranty check, operating hours check, skill matrix check, part lock check, and concurrent conflict check.
- **Scoring Weights Sliders:** Dynamically adjust skill, proximity, workload, and rating weights.
- **SLA Tier Configuration Matrix:** Set SLA deadlines for Urgent (120m), High (240m), Medium (480m), and Low (1440m) priority tickets.
- **Global Immutable Audit Trail:** Complete chronological audit feed showing timestamp, actor, stage, action, and cryptographic event details.
- **Emergency Incident Injector:** One-click simulation of critical plant breakdowns for testing platform response.

---

## 5. Technology Stack & Deployment Architecture

| Layer | Technologies Used | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Material-UI (MUI 5), Formik, Yup, MobX/Custom Store | Hosted via Nginx inside Docker (`atlas-cmms-frontend`) on port 3000 |
| **Backend API** | Spring Boot 3.5, Java 17, Spring Security, JWT (JJwt), Lombok | Hosted inside Docker (`atlas-cmms-backend`) on port 8080 |
| **Database** | PostgreSQL 16 (Alpine) | Docker container `atlas_db`, port 5432 |
| **Object Storage** | MinIO (S3-compatible) | Docker container `atlas_minio`, ports 9000-9001 |
| **Reverse Proxy** | Nginx 1.27 (Alpine) | Docker container `atlas_nginx`, exposes port 3000 |

---

## 6. How to Run & Test the Platform

### 6.1. Platform URL
Open the platform in any modern browser:
```
http://localhost:3000/account/login
```

### 6.2. Test Accounts & Personas

| Role | Email | Password | Recommended Initial Flow |
| :--- | :--- | :--- | :--- |
| **Plant Operator** | `operator@equinox-fsm.com` | `pls_change_me` | Click **Operator** tab → Click **Auto-Fill** → **Sign In** → View breakdown ticket `SR-1042` and Live Radar → Submit a new breakdown request. |
| **Technician** | `technician@equinox-fsm.com` | `pls_change_me` | Click **Technician** tab → Click **Auto-Fill** → **Sign In** → Accept dispatch → Mark En Route → Inspect diagnostics → Submit completion package. |
| **Administrator** | `admin@equinox-fsm.com` | `pls_change_me` | Click **Admin** tab → Click **Auto-Fill** → **Sign In** → Tune policy engines & scoring weights → Inspect global audit logs → Inject emergency incident. |

---

*EquiNox-FSM — DataQuest 3.0 Engineering Submission*
