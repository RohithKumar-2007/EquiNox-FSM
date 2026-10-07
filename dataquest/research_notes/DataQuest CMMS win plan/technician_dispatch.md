# Technician Routing, Assignment and Dispatch (FSM/CMMS) — Implementable in a Hackathon

Scope: how leading FSM/CMMS products route and assign technicians to service requests, and what a student team can build in a few days on Spring Boot + React + PostgreSQL to meet the DataQuest 3.0 brief (route by availability and location, validate skills and spares, assign and reserve, reassign instantly on dropout).

## Q1. How do Salesforce, Dynamics 365, ServiceNow, Maximo and SAP FSM model skills, availability, territories and travel?

### Takeaway
Every major product uses the same two-stage pattern. First, **hard filters** (skills, territory, availability or calendar, absences) remove ineligible candidates. Then a **weighted soft score** ranks whoever remains (travel, ASAP, preferred resource, skill level, overtime), and a dispatcher either accepts the top candidate ("candidates" or "schedule assistant") or lets an optimizer place the work automatically. Skills are an N:N resource-to-skill table with an optional proficiency or level. Requirements carry a list of required skills plus a territory, a time window and a duration.

### Cited Findings
**Salesforce Field Service (formerly Field Service Lightning)**
- A **scheduling policy** combines **work rules** with **service objectives**. Work rules are pass/fail filters that drop candidates without the required skills or who aren't available in the right territory at the right time. Service objectives are weighted grades. Each candidate is scored on each objective, the weighted scores are summed, and the highest scorer is recommended. Admins can add custom rules and objectives. — [Trailhead: Examine Scheduling Policies](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies)
- Standard work rules named there: **Match Skills**, **Required Resource**, **Service Appointment Visiting Hours**, and **Required/Excluded Services** (resources). The sample policy is "Customer First". The weights are shown only as a pie chart, with no numbers. — [Trailhead](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies)
- Standard service objectives: **ASAP** (sooner is better), **Minimize Overtime**, **Minimize Travel**, **Preferred Resource** (100 if the preferred worker, else 0), **Resource Priority** (1 = highest), and **Skill Level** (favour the least- or most-qualified worker). — [Trailhead](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies)
- For non-optimization operations (**Book Appointment, Candidates, Schedule, Fill-In Schedule, Group Nearby**), travel is normalized among the options: the closest scores 100 and the furthest scores 0. Optimization operations (global, resource schedule, in-day, **Reshuffle**) assume travel of 0–120 minutes. — [Trailhead](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies)
- **ResourceAbsence** is a first-class object. Without the managed package and its scheduling optimizer, resources can still be booked over their absences, so the absence check is the scheduler's job, not the database's. — [Salesforce ResourceAbsence object reference](https://developer.salesforce.com/docs/atlas.en-us.228.0.object_reference.meta/object_reference/sforce_api_objects_resourceabsence.htm)
- A community user reports that an **Emergency Scheduling Policy** only returned technicians with free capacity, not technicians who were already booked. This is unofficial. — [Trailblazer Community post](https://trailhead.salesforce.com/de/trailblazer-community/feed/0D5KX00000jAOfC0AW)

**Microsoft Dynamics 365 Field Service, Universal Resource Scheduling (URS)**
- Core entities are `bookableresource` (Resource), `bookableresourcebooking` (Booking) and `msdyn_resourcerequirement` (Requirement). A Requirement holds From/To dates, Duration, Work Location and Territory, plus child **Requirement Characteristic** rows (required skills). A Resource has child **Resource Characteristic** and **Resource Territory** N:N rows. — [MS Learn: Customize resource matching in URS (updated 2026-07)](https://learn.microsoft.com/en-us/dynamics365/common-scheduler/developer/understanding-and-customizing-resource-matching-in-urs)
- Built-in constraints are Characteristics ("skills … with optional rating values to indicate the characteristic level"), Categories, Territories, Organizational Units, Resource Type, Teams and Business Units. Matching runs as follows: the Retrieve Requirement Constraints API builds a "constraints property bag", the Resource Matching API turns it into a dynamic FetchXML query, and the matching resources are returned. Custom constraints (for example, Language) are added the same way. — [MS Learn](https://learn.microsoft.com/en-us/dynamics365/common-scheduler/developer/understanding-and-customizing-resource-matching-in-urs)
- The **Schedule Assistant** recommends resources that match availability, skills and location, estimates travel time, and ranks them. The dispatcher then books one. It returns 100 resources by default (configurable up to 1,000). Bookings made outside its recommended slots aren't checked against capacity, work hours or time windows. For full automation Microsoft points to the **Resource Scheduling Optimization (RSO)** add-on or the newer **Scheduling Operations Agent**. — [MS Learn: Schedule assistant overview (2026)](https://learn.microsoft.com/en-us/dynamics365/field-service/schedule-assistant)
- The "Rating Value" sort is the total proficiency score of the characteristics entered in the filter. — [Microsoft Dynamics blog, July 2017 URS update](https://cloudblogs.microsoft.com/dynamics365/?p=19055) (old; may have changed)

**ServiceNow Field Service Management**
- **Dynamic Scheduling** assigns work "by skills, parts, location, and availability", automatically or with one click, using no-code assignment rules and a skills module. — [ServiceNow Dynamic Scheduling product page](https://www.servicenow.com/products/dynamic-scheduling.html)
- **Dispatcher Workspace** puts unassigned tasks, technician schedules and a map with live agent locations on one screen. It recommends technicians by skills, parts, distance and access hours, and reassigns automatically when a technician runs late or a higher-priority job arrives. — [ServiceNow Dispatcher Workspace](https://www.servicenow.com/uk/products/dispatcher-workspace.html)
- A third-party guide says the engine weighs skills, location, availability, territory and SLA priority in one pass, and that dense multi-stop routing may need an external route-optimization API. This is not official. — [NextBillion.ai blog](https://nextbillion.ai/feeds/blog/servicenow-field-service-management-dispatch-scheduling)

**IBM Maximo (Maximo Application Suite: Scheduler / Graphical Assignment)**
- Labor is modelled as **Labor → Craft → Skill Level** (plus pay rates). Availability comes from **Calendars with Shift Patterns**, and a person can have planned absences. These are prerequisites for scheduling. — [NobleProg Maximo course outline](https://www.nobleprog.co.uk/cc/ibmmaximoam); [IBM Community: Scheduler application (Oct 2025)](https://community.ibm.com/community/user/discussion/scheduler-application)
- In Graphical Assignment, selecting a work assignment highlights every labor record whose craft and skill level can do the work, with one dark-blue "best match". An assignment turns green when labor and work match and red when they don't (for example, when the task duration exceeds the labor's available hours). — [IBM Community (Oct 2025)](https://community.ibm.com/community/user/discussion/scheduler-application)
- **Crews** group labor by craft and skill. The crew view compares Required Crafts and Qualifications with the actual labor's craft, skill level, available hours and shift. — [IBM STE Crews presentation (2012)](https://public.dhe.ibm.com/software/tivoli_support/misc/STE/2012_09_27_STE_Crews.pdf)
- If work is planned only at the craft level, schedulers can level hours by craft but can't assign individuals. — [Maximo List Archive (2011)](https://bportaluri.com/wp-content/MaximoListArchive/j40bjksfk3egroups.com.html) (old)

**SAP Field Service Management (part of "SAP Field Service and Asset Management"; originally Coresystems)**
- SAP finds the best-matching technician or crew "based on skills, job prediction duration, availability, location, priority, and business rules". Policies for assisted or automated scheduling are edited in a **no-code policy designer**, and SAP advertises predictive routing. — [SAP FSM features page](https://www.sap.com/products/scm/field-service-and-asset-management/features.html)
- ASUG reports an "AI policy designer" with about 50 out-of-the-box rules (for example, required skills) plus custom rules, which can be simulated before rollout. — [ASUG article](https://www.asug.com/insights/how-ai-assisted-scheduling-in-sap-field-service-management-can-enhance-time-cost-savings)
- A partner deployment refers to a company setting `CoreSystems.ResourePlanner.BestMatchingTechnicianWithPlugins` for best-match plugins, which shows the Coresystems origin. This is not official SAP documentation. — [Proaxia Confluence](https://proaxia-prod-doc.atlassian.net/wiki/x/QAATNw)

### Inferences
- The shared industry vocabulary maps directly onto a CMMS. Use **work rules / constraints** for hard filters, **service objectives** for weighted soft scores, **candidates** for the ranked shortlist, and **book** for creating the booking. Using these terms in the pitch signals domain fluency.
- Name changes to note: Salesforce "Field Service Lightning" is now "Salesforce Field Service". The "Enhanced Scheduling and Optimization" (ESO) engine is newer than the legacy optimizer. OptaPlanner became Timefold (April 2023). SAP FSM (formerly Coresystems) is now marketed under "SAP Field Service and Asset Management". Dynamics adds the "Scheduling Operations Agent" alongside RSO.
- Maximo's craft plus skill level maps to the existing CMMS. A `craft` (trade) plus an ordinal `skill_level` is enough.

### Gaps
- Exact default weights in Salesforce sample policies are not published as numbers (only as a pie chart).
- I found no public detail on how SAP FSM or ServiceNow compute distance (straight-line or road) or weight it against skills.
- I couldn't fetch official Salesforce Emergency wizard / ESO docs. Behaviour there comes from community posts.

## Q2. What factors and weights are used to score candidate technicians?

### Takeaway
Typical factors are skill match and proficiency, travel distance or time, earliest availability (ASAP), current workload or overtime, preferred or required resource, resource priority, SLA or priority urgency, and cost or pay rate. Vendors expose these as admin-tunable weights, not fixed numbers. A hackathon should do the same: hard-filter first, then compute a normalized 0–100 score per factor and a weighted sum with editable weights.

### Cited Findings
- Salesforce's objective set is ASAP, Minimize Travel, Minimize Overtime, Preferred Resource, Resource Priority and Skill Level. Each is normalized to 0–100 (for example, closest = 100, furthest = 0) and combined with policy weights. — [Trailhead](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies)
- In Dynamics, skills carry a rating, and candidates can be sorted by total proficiency rating. The Schedule Assistant also ranks by travel time and availability. — [MS Learn URS](https://learn.microsoft.com/en-us/dynamics365/common-scheduler/developer/understanding-and-customizing-resource-matching-in-urs); [MS Learn Schedule assistant](https://learn.microsoft.com/en-us/dynamics365/field-service/schedule-assistant); [MS blog 2017](https://cloudblogs.microsoft.com/dynamics365/?p=19055)
- ServiceNow's factors are skills, parts, location or distance, availability, access hours, territory and SLA priority. — [ServiceNow](https://www.servicenow.com/products/dynamic-scheduling.html); [NextBillion (third-party)](https://nextbillion.ai/feeds/blog/servicenow-field-service-management-dispatch-scheduling)
- SAP's factors are skills, predicted job duration, availability, location, priority and business rules. — [SAP](https://www.sap.com/products/scm/field-service-and-asset-management/features.html)
- Maximo's factors are craft and skill level, labor available hours compared with task duration, shift calendar, and pay rates. — [IBM Community](https://community.ibm.com/community/user/discussion/scheduler-application); [NobleProg](https://www.nobleprog.co.uk/cc/ibmmaximoam)

### Inferences
- **Suggested hackathon scoring.** These are my own defaults, not vendor values. Present them as tunable in an admin "Dispatch Policy" screen.
  - **Hard filters (any failure means ineligible):** has every required skill at or above the minimum level; on shift and not on time-off for the job window; within service radius or same site/territory; `active_jobs < max_concurrent_jobs`; required spare parts available or reservable (validated at the request level before approval).
  - **Soft score = Σ wᵢ·sᵢ** with each sᵢ in [0,1]:
    - proximity: `1 − d/d_max` (weight 0.35)
    - skill surplus: `(level − required)/(max − required)`, or invert it to "save experts" (weight 0.20)
    - workload: `1 − active/max` (weight 0.20)
    - earliest start or shift remaining (weight 0.15)
    - preferred tech or asset familiarity, i.e. previously worked on this asset (weight 0.10)
  - **Priority shifts the weights.** For CRITICAL or SLA-breaching work, raise proximity and earliest-start and drop workload balance. This mirrors separate "Emergency" policies in Salesforce.
- Return the **top-N ranked candidates with a per-factor score breakdown** ("why this technician"). Explainability is a strong demo point, and the dropout fallback can reuse the same ranked list.

### Gaps
- No vendor publishes recommended default weights. The numbers above are design suggestions.

## Q3. Which algorithms are realistic: weighted greedy, CSP, Hungarian, VRP? What do OR-Tools and Timefold offer and how hard are they to integrate?

### Takeaway
For a few-day build, **filter plus weighted-score greedy** (one request at a time, at approval) is the right core and covers the brief. Add an **optional batch "optimize unassigned queue"** using the assignment problem (OR-Tools or a hand-rolled Hungarian method) to show global optimality. **Timefold** is the most Java-native path to real constraint optimization (hard/soft scores, Spring Boot starter) but needs JDK 21+ and its starter supports Spring Boot 4.x only. Full VRP routing (OR-Tools routing or Timefold vehicle routing) is a stretch goal.

### Cited Findings
- **Problem class.** Technician dispatch is a *workforce scheduling and routing problem* (WSRP). It combines employee scheduling with routing, and VRPTW is the basic routing component. Approaches include exact MIP, heuristics and hybrids. — [Castillo-Salazar, Landa-Silva & Qu, Annals of OR 239 (2016)](https://eprints.nottingham.ac.uk/36529/)
- **OR-Tools assignment.** OR-Tools models assignment as a worker × task cost matrix `costs[i][j]` with binary `x[i][j]`, each worker taking at most one task and each task exactly one worker, minimizing total cost. Java samples exist (`AssignmentMip` with SCIP, `AssignmentSat` with CP-SAT). — [Google OR-Tools: Assignment example](https://developers.google.com/optimization/assignment/assignment_example)
- **OR-Tools Java install.** Maven is the recommended route, and it bundles native libraries loaded via `Loader.loadNativeLibraries()`. — [OR-Tools for Java](https://developers.google.com/optimization/install/java); [Assignment example](https://developers.google.com/optimization/assignment/assignment_example)
- **OR-Tools VRPTW.** Uses `RoutingModel`, `RoutingIndexManager` and a time `RoutingDimension` with a **time matrix**. The official Java sample is `CapacitatedVehicleRoutingProblemWithTimeWindows.java`. — [OR-Tools VRPTW guide](https://developers.google.com/optimization/routing/vrptw)
- **Timefold Solver.** Forked from OptaPlanner on 20 April 2023. The Community Edition is Apache-2.0, with a commercial Enterprise Edition. The Maven groupId is `ai.timefold.solver`, and it requires JDK 21+. Use cases include vehicle routing, employee rostering, maintenance scheduling and task assignment. — [Timefold Solver GitHub](https://github.com/TimefoldAI/timefold-solver)
- **Timefold with Spring Boot.** Add `timefold-solver-spring-boot-starter`, inject `SolverManager<Solution, Id>`, and set `timefold.solver.termination.spent-limit=5s` (or `30s` / `PT30S`). The docs (Solver 2.7.1) say the starter "only supports Spring Boot version 4.x". — [Timefold docs: Spring Boot](https://docs.timefold.ai/timefold-solver/latest/running-timefold-solver/library/spring-boot)
- **Timefold modelling.** `@PlanningSolution` holds `@ValueRangeProvider` fact lists and `@PlanningEntityCollectionProperty` entities. `@PlanningEntity` has `@PlanningVariable` fields. Constraints are written as Constraint Streams with `HardSoftScore` (`penalize(ONE_HARD)`, `reward(ONE_SOFT)`). The quickstart notes that blocking on `getFinalBestSolution()` can cause HTTP timeouts. — [Timefold Spring Boot quickstart](https://docs.timefold.ai/timefold-solver/latest/quickstart/spring-boot/spring-boot-quickstart)
- Timefold's Vehicle Routing quickstart is documented with Quarkus, and Timefold sells a separate hosted **Field Service Routing** model/REST API. — [Timefold docs: vehicle routing quickstart](https://docs.timefold.ai/timefold-solver/1.x/quickstart/quarkus-vehicle-routing/quarkus-vehicle-routing-quickstart)

### Inferences
| Approach | What it solves | Effort | Verdict |
|---|---|---|---|
| Hard filter + weighted score, greedy (per request) | Best tech for one request now | ~0.5–1 day, pure Java/SQL | **Core: do this** |
| Batch assignment (Hungarian / OR-Tools CP-SAT) | Globally best 1:1 matching of N open requests × M techs, cost = −score; ineligible = large cost | ~0.5 day with OR-Tools; Hungarian in ~100 LOC of Java | **Nice "Optimize queue" button** |
| Timefold (constraint optimization) | Multi-job per tech, time windows, shifts, skills as hard constraints; travel, workload as soft | 1–2 days; JDK 21 and Spring Boot 4 compatibility risk with an existing app | Only if the team's stack already matches, or run it as a separate microservice |
| VRP/VRPTW (OR-Tools routing, Timefold VRP) | Daily route sequence per technician | 1–2+ days plus a travel-time matrix | Stretch goal; probably overkill for "unscheduled request routing" |
- Check the existing project's Spring Boot and Java versions before adopting Timefold. If it runs on Spring Boot 3.x, use the plain `timefold-solver-core` library without the starter (an older Timefold 1.x line may also support Boot 3; not verified here).
- A credible pitch line: "Greedy policy-based dispatch for real-time requests, plus a batch optimizer (assignment problem) for the backlog. The same pattern Salesforce uses with Book Appointment vs Global Optimization."

### Gaps
- I didn't verify which Timefold versions support Spring Boot 3.x, or the exact OR-Tools Maven artifact and version (believed to be `com.google.ortools:ortools-java`; confirm on the install page).
- I found no public engineering blog from a vendor giving solver internals.

## Q4. How do these systems handle technician dropout or no-show and dynamic reassignment?

### Takeaway
Products treat dropout as a schedule change, not a special feature. Mark the resource unavailable (an absence) and the conflicting bookings become unassigned or flagged. Then either (a) a dispatcher re-runs candidate search for each affected job, or (b) an in-day or reshuffle optimization re-plans automatically. Emergency policies weight ASAP and proximity. Systems escalate when no one qualifies.

### Cited Findings
- Salesforce provides **in-day optimization** and a **Reshuffle** action as optimization operations, next to Candidates and Book Appointment for single-job rescheduling. — [Trailhead](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies)
- Salesforce **ResourceAbsence** records model unavailability, and the docs suggest a trigger that sends an approval request to a supervisor when an absence is created. Absence-conflict enforcement depends on the managed package or optimizer. — [Salesforce ResourceAbsence reference](https://developer.salesforce.com/docs/atlas.en-us.228.0.object_reference.meta/object_reference/sforce_api_objects_resourceabsence.htm)
- ServiceNow reassigns work automatically "when a technician runs late or another job takes priority", and can reschedule based on task priorities and double-booking settings. — [ServiceNow Dispatcher Workspace](https://www.servicenow.com/uk/products/dispatcher-workspace.html)
- Dynamics recommends the Schedule Assistant for semi-automated work, manual scheduling for emergencies, and RSO or the Scheduling Operations Agent for full automation. — [MS Learn Schedule assistant](https://learn.microsoft.com/en-us/dynamics365/field-service/schedule-assistant)
- Maximo flags labor in red when a person's available hours (calendar minus absences) can't cover the assignment. — [IBM Community](https://community.ibm.com/community/user/discussion/scheduler-application)

### Inferences
- **Hackathon dropout flow (implementable in about half a day):**
  1. `POST /technicians/{id}/unavailable` (or "decline" or "no-show" on an assignment) creates a `time_off` row covering now to end of shift, or sets the assignment's status to `DECLINED`/`NO_SHOW`.
  2. Find the affected open assignments, ordered by priority and SLA deadline.
  3. For each, re-run the same candidate ranking, excluding the dropped tech, and assign the top eligible one in a transaction. Move the **spare-part reservation** to the new assignment rather than releasing it.
  4. If no one is eligible, escalate: relax soft constraints (radius, then workload cap), then allow the next skill-level tier, then notify the supervisor or manager and mark the request `UNASSIGNED_ESCALATED`.
  5. Write an audit log row (`reassigned_from`, `reason`) and push a notification (WebSocket or SSE) to the dispatcher board for the "instant" feel.
- Store the ranked **backup candidates** (top 3) when assigning, so reassignment is O(1) in the demo. Re-validate availability before using them.
- Optional: an acceptance timeout. If a tech hasn't acknowledged within X minutes, auto-reassign (a `@Scheduled` job).

### Gaps
- I couldn't retrieve official Salesforce ESO or emergency-wizard docs describing automatic reassignment on absence.
- I found no published no-show or timeout defaults from vendors.

## Q5. How is distance computed simply (haversine vs routing APIs)?

### Takeaway
Vendors estimate travel time (Dynamics' schedule assistant estimates it, Salesforce scores travel in minutes, and SAP and ServiceNow advertise routing). For a hackathon, **haversine on stored lat/long** with an assumed average speed (travel-time ≈ km / 30 km/h × 60) is credible and dependency-free. An **OSRM `/table`** call can be an optional upgrade, behind an interface, for road travel durations.

### Cited Findings
- The Dynamics schedule assistant "estimates travel time for the recommended resources" and ranks them. — [MS Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/schedule-assistant)
- Salesforce optimization assumes travel times between 0 and 120 minutes when scoring Minimize Travel. — [Trailhead](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies)
- OR-Tools VRPTW expects a **time matrix** (travel times between locations). — [OR-Tools VRPTW](https://developers.google.com/optimization/routing/vrptw)
- OSRM's table service returns duration matrices. The public demo server (hosted by FOSSGIS, under its usage policy) limits table requests to 10,000 cells, returns durations only, and rejects the `exclude` option. For larger use, self-host and raise `--max-table-size`. — [R osrm package docs](https://rdrr.io/cran/osrm/man/osrmTable.html); [KNIME OSRM node](https://hub.knime.com/spatialdatalab/extensions/sdl.harvard.features.geospatial/latest/org.knime.python3.nodes.extension.ExtensionNodeSetFactory$DynamicExtensionNodeFactory:73ce3ef6); [R-sig-geo thread 2019](https://r-mailing-lists.thecoatlessprofessor.com/lists/r-sig-geo/msg/msg-5e60f2a94bc7)

### Inferences
- Haversine formula (standard; no source fetched): `a = sin²(Δφ/2) + cos φ1·cos φ2·sin²(Δλ/2); d = 2R·atan2(√a, √(1−a))`, with R = 6371 km. It can run in Java, or in PostgreSQL as a SQL function so candidates can be pre-filtered in one query. PostGIS `ST_DistanceSphere` is an alternative if the extension is available.
- Put travel behind a `TravelTimeService` interface with `HaversineTravelTimeService` as the default and an optional `OsrmTravelTimeService`. This avoids API keys and rate-limit failures during the live demo. Google Distance Matrix needs a billing-enabled key, so avoid it for a demo.
- For an industrial plant (one site, many assets), "location" can also mean site/building/zone. A zone-adjacency score (same zone = 1, same site = 0.6, other site = haversine) is sensible and cheap.

### Gaps
- I didn't fetch the FOSSGIS OSRM usage policy text (rate limits) or current Google Distance Matrix pricing.

## Q6. What is a minimal data model?

### Takeaway
Mirror URS and Maximo: a skills master with N:N technician-skill rows that carry a level, and request-type or asset required-skill rows with a minimum level. Add shifts, time-off, location and capacity on the technician, plus an assignment table with status history and a parts reservation table. That is about eight tables on top of the existing CMMS.

### Cited Findings
- Dynamics uses separate master entities (Characteristic, Territory), N:N child tables (Resource Characteristic with rating, Resource Territory), and Requirement plus Requirement Characteristic for demand. Requirement has From/To, Duration and Work Location. — [MS Learn URS](https://learn.microsoft.com/en-us/dynamics365/common-scheduler/developer/understanding-and-customizing-resource-matching-in-urs)
- Maximo uses Labor with Craft and Skill Level, a Calendar with Shift Patterns, planned absences, and Crews. — [IBM Community](https://community.ibm.com/community/user/discussion/scheduler-application); [IBM Crews PDF](https://public.dhe.ibm.com/software/tivoli_support/misc/STE/2012_09_27_STE_Crews.pdf)
- Salesforce has ResourceAbsence as a separate object from the resource. — [Salesforce](https://developer.salesforce.com/docs/atlas.en-us.228.0.object_reference.meta/object_reference/sforce_api_objects_resourceabsence.htm)

### Inferences
Proposed PostgreSQL schema (adapt names to the existing CMMS entities):
```
skill(id, code, name, category)                          -- master (e.g. HVAC, PLC, Welding-TIG, HV-Electrical)
technician(id, user_id, home_site_id, home_lat, home_lng,
           current_lat, current_lng, location_updated_at,
           max_concurrent_jobs int default 3, hourly_cost, active bool)
technician_skill(technician_id, skill_id, level smallint 1..5,
                 certified_until date, PRIMARY KEY(technician_id, skill_id))
shift(id, technician_id, day_of_week | date, start_time, end_time)   -- or a shift_pattern + assignment
time_off(id, technician_id, starts_at, ends_at, reason, type)       -- LEAVE/SICK/DROPOUT
request_type_skill(request_type_id | asset_category_id, skill_id, min_level)
work_request(..., asset_id, site_id, lat, lng, priority, sla_due_at,
             est_duration_min, status)                              -- existing table, extended
assignment(id, work_request_id, technician_id, status
           [PROPOSED, ACCEPTED, IN_PROGRESS, DONE, DECLINED, NO_SHOW, REASSIGNED],
           score numeric, score_breakdown jsonb, backup_candidates jsonb,
           assigned_at, reassigned_from_id, reason)
part_reservation(id, work_request_id, part_id, qty, status[RESERVED, ISSUED, RELEASED], reserved_at)
dispatch_policy(id, name, weights jsonb, max_radius_km, applies_to_priority)
```
- "Availability" = shift covers [now, now+duration], no overlapping `time_off`, and the count of active assignments is below `max_concurrent_jobs`. This can be one SQL query plus Java scoring.
- Approval gate (brief requirement): before `APPROVED`, run `validateSkills()` (at least one eligible tech exists) and `validateParts()` (stock minus reserved ≥ required, per part). Then reserve the parts with row locks (`SELECT … FOR UPDATE`) and create the assignment in one `@Transactional` method so the reservation and assignment are atomic.

### Gaps
- None for the schema itself. It is a design recommendation derived from the vendor models above, not a vendor-published schema.
