# SLA, Approvals, Exceptions, Conflicts, Parts Reservation, Completion Verification and Audit Trails in Maintenance / Field Service Platforms

Scope note: about 16 searches and fetches. Primary vendor docs were reachable for Dynamics 365 Field Service (Microsoft Learn, updated Aug 2026), ServiceNow FSM and Task SLA (servicenow.com/docs), IBM Maximo support pages, Salesforce developer docs, and the UpKeep and Limble help centres. Some topics (notifications, exception queues) had little primary documentation and are marked as gaps. Items under "Inferences" are design recommendations for the Spring Boot/PostgreSQL team, not vendor facts.

## 1. Work order / service request lifecycle state machine

### Takeaway
Every major product separates a *request/approval* phase from an *execution* phase. Most also split the work order status from a per-assignment (booking/appointment/task) status, and the assignment status drives the parent. A good hackathon model is: REQUESTED → VALIDATED → PENDING_APPROVAL → APPROVED → SCHEDULED/ASSIGNED → ACCEPTED/DISPATCHED → EN_ROUTE → IN_PROGRESS ⇄ ON_HOLD (waiting on parts/approval) → COMPLETED → PENDING_REVIEW/VERIFIED → CLOSED. The terminal side states are REJECTED, CANCELLED and CLOSED_INCOMPLETE, and an orthogonal `exception_flag` or ESCALATED marker sits alongside them.

### Cited Findings
- **IBM Maximo** status codes: WAPPR (Waiting on Approval), APPR (Approved), WSCH (Waiting to be Scheduled), WMATL (Waiting on Material), INPRG (In Progress), COMP (Completed), CLOSE (Closed), CAN (Canceled) — [UC Berkeley Facilities FAQ](https://facilities.berkeley.edu/faq/maximo/what-do-different-statuses-work-order-mean)
- Maximo allowed transitions: from WAPPR to INPRG, CAN, WMATL, COMP, APPR or CLOSE. From APPR to INPRG, WMATL, COMP, WAPPR or CLOSE. From INPRG to WMATL, COMP, WAPPR or CLOSE. From COMP only to CLOSE. No change is allowed from CAN or CLOSE (history edits only). WSCH and WMATL behave like APPR, and synonym statuses follow their base status — [IBM Support: Allowable Status Changes for Work Orders](https://supportcontent.ibm.com/support/pages/node/1112013)
- Maximo's typical path is WAPPR, then optional WAPPR1–WAPPR5 multi-level approvals, then APPR → INPRG → COMP → CLOSE. Cancel is possible from early statuses but not from COMP or CLOSE — [IBM Community](https://community.ibm.com/community/user/asset-facilities/discussion/workorderstatus-different-from-last-line-in-wostatusstatus)
- The Maximo transition rules are hardcoded in WOStatusHandler. Sites restrict them with conditional expressions on the WOSTATUS domain — [bportaluri.com](https://bportaluri.com/blog/2018/08/restrict-allowed-status-changes/)
- **Dynamics 365 Field Service** work order System Status values are Unscheduled, Scheduled, In Progress, Completed, Posted and Canceled. Organizations add custom *substatuses* rather than editing the option set. The default booking statuses are Scheduled, Traveling, In Progress, On Break, Completed and Canceled — [Microsoft Learn: Work order lifecycle and system statuses](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)
- In D365, creating a booking moves the work order to Scheduled. Traveling, In Progress or On Break moves it to In Progress. The work order becomes Completed when *all* bookings are completed or canceled. A canceled booking returns the work order to Unscheduled. Posted triggers invoices and actuals and sets Closed By/Closed On — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)
- In D365, "every booking status change creates a booking timestamp". In Progress sets Actual Arrival Time and First Arrived On. Completed sets End Time and creates booking journals for work, travel and break durations — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)
- D365 has a "Status completes work order" toggle. A custom booking status such as "Partially Completed" with the toggle off closes the visit but returns the work order to Unscheduled for a follow-up, for example when waiting on parts — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)
- The D365 lifecycle stages are Create → Schedule → Dispatch (the agent may accept or decline) → Service → Review/Approval (a supervisor verifies the work) → Invoice/inventory adjustment — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)
- **ServiceNow FSM** work order *task* states: Draft → Pending dispatch (the qualifier sets the dispatch group and marks it Qualified) → Scheduled (optional soft booking) → Assigned (dispatcher) → Accepted (agent; "Start travel" sets the On route substate) → Work in Progress ("Start work") → Closed Complete / Closed Incomplete / Cancelled. With Quality Management on, Closed Complete goes to a **Pending review** substate, and the reviewer approves it or returns it as "Needs information" — [ServiceNow docs: Work order task states](https://www.servicenow.com/docs/r/DBkKvgbNn2vmEpXdLk9O2w/4V7ehAd~gF500f5YT0Fn4A)
- ServiceNow's parent work order uses "Qualified" when qualification is enabled and "Ready for Dispatch" when it is disabled. Closed Complete or Closed Incomplete qualifies the work order for customer digital signature and PDF summary generation — [ServiceNow docs: Work order states](https://www.servicenow.com/docs/r/yN_QmjTF0~igG0fSGkXXng/ccbt2xQienYJJefME~xHEw)
- **Salesforce Field Service** default ServiceAppointment statuses are None, Scheduled (assigned to a resource), Dispatched (resource notified), In Progress, Completed, Cannot Complete and Canceled. Custom values can be added, and StatusCategory mirrors the defaults — [Salesforce ServiceAppointmentStatus object reference](https://developer.salesforce.com/docs/atlas.en-us.228.0.object_reference.meta/object_reference/sforce_api_objects_serviceappointmentstatus.htm)
- **Request intake (UpKeep):** requests from in-app users and the Request Portal land in one review queue. Only Admins and Limited Admins can approve. A reviewer can enrich the request (priority, location, asset, workers) and "Save Without Approving". Approving converts the request into a work order and locks the request. Declining requires a reason that is sent to the requester, and a declined request cannot be reopened — [UpKeep Help](https://help.onupkeep.com/en/articles/9627833-how-administrators-and-limited-administrators-can-approve-and-manage-work-order-requests)
- **Limble:** request review and approval is off by default and enabled by Super Users. Reviewers need permission #212 "Approve or Decline a Work Request", and the reviewer is configurable per request portal — [Limble Help](https://help.limblecmms.com/en/articles/11471739-how-to-use-work-request-review-and-approval)

### Inferences
- Use **two layers**:
  1. `service_request` / `work_order.status`, a coarse lifecycle: REQUESTED, VALIDATION_FAILED, PENDING_APPROVAL, APPROVED, REJECTED, SCHEDULED, IN_PROGRESS, ON_HOLD, COMPLETED, VERIFIED, CLOSED and CANCELLED.
  2. `assignment.status`, per technician (D365 booking / SFS appointment style): ASSIGNED, ACCEPTED, DECLINED, EN_ROUTE, ON_SITE/WORKING, PAUSED, DONE, DROPPED and CANCELLED.

  Derive the work order status from its assignments, as D365 does. A dropout cancels one assignment and pushes the work order back to APPROVED/UNSCHEDULED with an exception flag.
- Add `sub_status` / `hold_reason` (WAITING_PARTS, WAITING_APPROVAL, WAITING_CUSTOMER, SAFETY) instead of many top-level states. This combines D365 substatuses with Maximo's WMATL.
- Implement transitions as an explicit `Map<Status, Set<Status>>` (Maximo-style allowed-transition table) in one `WorkOrderStateMachine` service, so every change goes through one method. That method writes history and publishes a Spring `ApplicationEvent`. Spring Statemachine is optional and probably overkill for a hackathon.
- Write a timestamp on every transition (D365 booking journal pattern). From those timestamps you can compute response time, travel time, wrench time, MTTR and SLA.

### Gaps
- Fiix and MaintainX lifecycle docs were not fetched. MaintainX statuses are commonly Open / On Hold / In Progress / Done, but that was not verified in this session.

## 2. Machine eligibility: warranty, contract and entitlement checks

### Takeaway
Products model eligibility as records linked to the asset or account: Entitlement, Service Contract/Contract Line, Asset Warranty and Agreement. These have date ranges and coverage terms, and they are evaluated when the request is created. For the hackathon, a `service_contract`/`warranty` table keyed by asset with `start_date`, `end_date`, `coverage_type` and `sla_policy_id`, plus asset-status checks, covers the brief.

### Cited Findings
- Salesforce **Entitlement** "represents the customer support an account or contact is eligible to receive. Entitlements may be based on an asset, product, or service contract". **ContractLineItem** is "a product covered by a service contract". **AssetWarranty** "defines the warranty terms applicable to an asset along with any exclusions and extensions" (API 50.0+). **EntityMilestone** "represents a required step in a customer support process on a work order" — [Salesforce Field Service Developer Guide: objects](https://developer.salesforce.com/docs/atlas.en-us.field_service_dev.meta/field_service_dev/fsl_dev_soap_objects.htm)
- Salesforce entitlement processes hold timed **milestones** such as First Response and Resolution Time. Milestone actions are time-based: warn before expiry, act on violation, act on success. An entitlement process can hold up to 10 milestones, and each can be one-time or recurring — [SalesforceBen: Entitlements and Milestones](https://www.salesforceben.com/complete-guide-to-salesforce-entitlements-and-milestones-in-service-cloud/)
- In D365 Field Service, customer asset and agreement information is available on cases, work orders run under warranty and agreement coverage, and coverage applies to products and services on the work order — [AppSource listing (partner add-on)](https://appsource.microsoft.com/en/product/dynamics-365/dynamics_software.03db4ad0-a327-4b2a-9b58-a09b43aa6bbe). Note this is a third-party add-on listing, not core Microsoft docs.
- D365 native work order *entitlements* apply price lists or discounts based on work order attributes. They affect price, not cost, and cannot express quantity limits such as "first 10 calls free". *Agreements* are recurring work order generators — [Dynamics Communities: Agreements, Entitlements, and NTEs](https://dynamicscommunities.com/?p=83888)
- Salesforce work rules act as pass/fail filters on candidate technicians, covering skills, required resources and time windows such as visiting hours — [Trailhead: Examine Scheduling Policies](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies)

### Inferences
- Implement validation as a **rule chain**: a list of `ValidationRule` beans, each returning PASS, WARN or FAIL with a message. Store the results in `request_validation_result(request_id, rule_code, outcome, message, evaluated_at)` and show them as a checklist on the approval screen. Suggested rules:
  - `ASSET_ACTIVE`: asset status is not DECOMMISSIONED or OUT_OF_SERVICE.
  - `COVERAGE`: an active warranty or contract exists for the asset on the request date. Otherwise the request is billable and needs extra approval.
  - `SITE_VALID`: the asset's site matches the request site and the site is active.
  - `PRIORITY_VALID`: priority is consistent with asset criticality, for example a critical asset forces at least HIGH.
  - `SKILL_AVAILABLE`: at least one technician has the required skill and certification and is not expired.
  - `PARTS_AVAILABLE`: available quantity is at least the required quantity at the site's warehouse. Otherwise WARN and route to ON_HOLD/WAITING_PARTS.
  - `DUPLICATE_OPEN_WO`: an open work order already exists on the same asset.
- Approval routing: auto-approve covered, low-cost, non-critical requests. Send everything else to PENDING_APPROVAL, using a threshold matrix by cost or priority, with Maximo-style WAPPR1..n levels. Require a reason on reject (UpKeep pattern).

### Gaps
- Exact Salesforce logic linking warranty terms to automatic entitlement checks was not found. Microsoft Learn pages on D365 agreements and warranty were not fetched.

## 3. SLA modeling and breach detection

### Takeaway
ServiceNow is the reference model. An SLA *definition* has start, pause, resume, stop, reset and cancel conditions plus a business-hours schedule. A *task SLA* instance tracks start time, breach time (moved later by pauses), elapsed time and percentage, time left, and a stage. Percentage thresholds (50/75/90/100%+) trigger warnings and escalations. Use separate response and resolution SLAs per priority.

### Cited Findings
- ServiceNow SLA conditions decide when a task SLA is attached, paused, resumed, reset, canceled and completed. Up to six conditions can be defined, and they are evaluated whenever the task record is created or updated. A stop condition completes the SLA "regardless of breach status" — [ServiceNow docs: SLA conditions (via search summary)](https://www.servicenow.com/docs/r/BgFKZnPHldZ62gGtzQ71Mw/3kQr0fQmgXt44nPbT6ojrw). The page returned 404 on direct fetch, so the content comes from a search snippet.
- ServiceNow Task SLA [task_sla] fields: Stage (In progress, Cancelled, Paused, Completed; "Breached" only under the legacy 2010 engine), Start time, Stop time, Breach time ("adjusted for pause duration", same as planned end time), Actual elapsed time and percentage (minus pause duration), Actual time left, and Business elapsed time, percentage and time left (within the schedule). Original breach time is computed at attach. "Actual breach time is dynamic and often different from the original breach time" — [ServiceNow docs: Task SLA table](https://www.servicenow.com/docs/r/MlbQAgTiiiMOLOw9T36wJg/IzrPpIJiB2a2oFdgpBOUEg)
- Threshold warnings at 50%, 75% and 90% are built with SLA Percentage Timer activities in the SLA workflow, or Wait-for-condition steps in Flow Designer, each followed by an event or notification. Some orgs also notify at 125%, 150%, 175% and 200% (post-breach escalation) — [ServiceNow Community](https://www.servicenow.com/community/hrsd-forum/trigger-sla-breach-for-50-and-75/m-p/3552790) (community, not official)
- Salesforce milestones (First Response, Resolution) carry warning, violation and success actions, can recur, and apply to work orders through EntityMilestone — [SalesforceBen](https://www.salesforceben.com/complete-guide-to-salesforce-entitlements-and-milestones-in-service-cloud/); [Salesforce FS Dev Guide](https://developer.salesforce.com/docs/atlas.en-us.field_service_dev.meta/field_service_dev/fsl_dev_soap_objects.htm)

### Inferences
- **Tables**:
  - `sla_policy(id, name, priority, response_minutes, resolution_minutes, calendar_id, warn_pct1=75, warn_pct2=90)`
  - `business_calendar(id, timezone, work_days, start_time, end_time)` plus `holiday`
  - `work_order_sla(id, work_order_id, sla_type RESPONSE|RESOLUTION, policy_id, start_at, due_at, original_due_at, paused_at, total_paused_seconds, stage IN_PROGRESS|PAUSED|MET|BREACHED|CANCELLED, warned_75, warned_90, breached_at, met_at)`
- **Clock rules**:
  - Response starts at APPROVED (or CREATED) and stops at the first ACCEPTED or EN_ROUTE.
  - Resolution starts at APPROVED and stops at COMPLETED.
  - The clock pauses on ON_HOLD with hold_reason WAITING_CUSTOMER or WAITING_PARTS (configurable). On resume, push `due_at` later by the paused business time.
- **Detection: hybrid.** Status-change events, through a `@TransactionalEventListener` on the WorkOrderStatusChanged event, start, pause and stop clocks immediately. A `@Scheduled(fixedRate = 60000)` job scans `stage='IN_PROGRESS' AND due_at` for the warn and breach thresholds, because elapsed time crosses thresholds without any record update. ServiceNow's definition-driven conditions plus percentage timers follow the same split. One indexed query, `WHERE stage='IN_PROGRESS' AND NOT warned_90 AND now() >= start_at + 0.9*(due_at-start_at)`, is enough. Quartz is only needed for clustering or persistence.
- **Example targets** to seed demo data, not from a source: P1 Critical, response 1h / resolve 4h, 24x7. P2 High, 4h / 1 business day. P3 Medium, 1 BD / 3 BD. P4 Low, 3 BD / 10 BD.
- **Escalation matrix**: at 75%, notify the assigned technician and dispatcher in-app. At 90%, email and push to the supervisor and set `exception_flag=SLA_RISK`. At 100%, set breached, escalate to the manager, and record an exception. At 150%, escalate to the site head.
- **KPIs** to show on the dashboard: SLA compliance %, MTTR and MTBF.

### Gaps
- SMRP or ISO 55000 KPI definitions (MTTR, first-time fix rate) were not fetched in this session.
- Exact official ServiceNow wording on the SLA engine's scheduled job ("SLA update" or timer) was not retrieved.

## 4. Exception management: dropout, part shortage, SLA risk

### Takeaway
Products handle exceptions mainly through status semantics plus dispatcher tooling:
- D365 "Partially Completed" or a canceled booking returns the work order to Unscheduled.
- Salesforce uses "Cannot Complete".
- ServiceNow uses "Closed Incomplete" and "Needs information".
- Maximo uses WMATL for waiting on material.

The scheduling board then highlights these items. A first-class `exception` entity with a queue is a reasonable differentiator for the hackathon.

### Cited Findings
- In D365, canceling a booking moves the work order back to Unscheduled. A booking status with "Status completes work order" turned off lets a technician finish a visit while the work order returns to Unscheduled, for example when waiting on parts, so the dispatcher sees it needs rescheduling — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)
- In D365 the dispatch step lets the field agent "review and accept/decline the work order" — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)
- Salesforce provides "Cannot Complete" as a closing outcome distinct from Completed — [Salesforce object reference](https://developer.salesforce.com/docs/atlas.en-us.228.0.object_reference.meta/object_reference/sforce_api_objects_serviceappointmentstatus.htm)
- ServiceNow tasks need agent *acceptance* after the dispatcher assigns them (Assigned → Accepted), and there is a Closed Incomplete state — [ServiceNow docs](https://www.servicenow.com/docs/r/DBkKvgbNn2vmEpXdLk9O2w/4V7ehAd~gF500f5YT0Fn4A)
- Maximo's WMATL (Waiting on Material) status is reachable from APPR and INPRG — [IBM Support](https://supportcontent.ibm.com/support/pages/node/1112013)
- MaintainX inspection checks automatically create a follow-up work order when FAIL is selected — [MaintainX procedures guide](https://www.getmaintainx.com:443/procedures/d/ZIHO3HWftbM/writing-maintenance-procedures)

### Inferences
- Table: `work_order_exception(id, work_order_id, type, severity, raised_at, raised_by SYSTEM|user, details_json, status OPEN|ACK|RESOLVED, resolved_at, resolved_by, resolution)`. The `type` values are TECH_DROPOUT, TECH_NO_SHOW, PART_UNAVAILABLE, SLA_AT_RISK, SLA_BREACHED, RESOURCE_CONFLICT and VERIFICATION_REJECTED. Add a denormalised `work_order.exception_flag` boolean for list filtering.
- **Triggers**:
  - Dropout: the technician declines, or an admin marks them unavailable or on leave. The assignment becomes DROPPED and a TECH_DROPOUT exception is raised.
  - No-show: a scheduled job finds assignments where `scheduled_start + grace (15 min) < now` and status is not EN_ROUTE or ON_SITE.
  - Part unavailable: a reservation fails, or a technician reports a part as missing, which moves the work order to ON_HOLD/WAITING_PARTS.
  - SLA: the SLA job described in section 3.
- **Instant reassignment flow**: the exception card offers a "Suggest replacements" call that queries technicians with the required skill at the same site who have no overlapping assignment, ranked by current workload. One click cancels the old assignment, creates a new one, moves the parts reservation, notifies both technicians over WebSocket, logs an audit event, and resolves the exception. The SLA clock keeps running, so a dropout does not reset the SLA.

### Gaps
- No primary docs were found on vendor "exception queue" UIs. Salesforce's Dispatcher Console rule-violation and jeopardy indicators were not fetched, though "jeopardy" flags are known from the training data and unverified here.

## 5. Resource conflict detection

### Takeaway
Scheduling engines treat availability and conflicts as hard work rules that filter candidates. Salesforce has a Resource Availability rule and visiting hours, and conflicts can still slip through when overtime is allowed. In PostgreSQL, overlap is best prevented at the database level with range types and exclusion constraints, and surfaced through a pre-check API.

### Cited Findings
- Salesforce scheduling work rules are pass/fail filters, and each rule narrows the candidate pool (skills, required resource, visiting hours). The Resource Availability rule blocks breaks and gaps and only takes effect when it is added to the scheduling policy in use — [Trailhead](https://trailhead.salesforce.com/content/learn/modules/field-service-lightning-scheduling-basics/examine-scheduling-policies)
- In one community case, appointments were booked on top of resource absences when overtime was allowed in the availability rule — [Trailblazer Community thread](https://trailhead.salesforce.com/ko/trailblazer-community/feed/0D54S00000BqkVOSAZ). This is an unresolved community post.

### Inferences
- Add `assignment.time_range tstzrange` and `EXCLUDE USING gist (technician_id WITH =, time_range WITH &&) WHERE (status NOT IN ('CANCELLED','DROPPED','DONE'))`. This needs `CREATE EXTENSION btree_gist`. Use the same pattern on `tool_reservation(tool_id, time_range)`.
- Run an application-level pre-check that returns conflicts as warnings so the UI can show them: `SELECT … WHERE technician_id=? AND time_range && tstzrange(?,?)`. Also check technician leave, shift hours, skill expiry, and travel buffer.
- Check part over-allocation as `SUM(reserved) > on_hand` per (part, warehouse). Use `SELECT … FOR UPDATE` or an optimistic `@Version` on the stock row when reserving.

### Gaps
- No vendor document was found describing a native "double-booking" flag. Pages on D365 Schedule Board overlap visualisation were not fetched.

## 6. Spare parts: reservation, consumption and backorder

### Takeaway
Maximo distinguishes Soft, Hard and Automatic reservations, created at APPR, and flags BACKORDER when a hard reservation drives available balance below zero. Salesforce models van and warehouse stock as ProductItem per Location, and moves it with ProductRequest and ProductTransfer. D365 adjusts inventory when the work order is posted. In short: reserve on approval, consume on usage, release on cancel.

### Cited Findings
- Maximo reservation type is chosen on the Plans tab: Soft, Hard or Automatic (7.5+). Hard reservations are subtracted from current balance to give available balance, and going below 0 triggers a reorder. Soft reservations are not time-sensitive and the item can be issued elsewhere. Automatic chooses based on the Required Date. "BACKORDER" appears when a hard reservation makes available balance negative. A direct issue creates no reservation, and a PO is created instead — [ReliabilityWeb: Making Maximo work for you](https://reliabilityweb.com/tips/article/making_maximo_work_for_you); [IBM Support: Inventory reservations](https://www.ibm.com/support/pages/inventory-reservations)
- Maximo creates reservations when a work order is approved (APPR) — [IBM Support](https://www.ibm.com/support/pages/inventory-reservations)
- Sources disagree on whether soft reservations reduce available balance. An IBM community post says they do, and ReliabilityWeb says they do not — [ReliabilityWeb](https://reliabilityweb.com/tips/article/making_maximo_work_for_you) vs [IBM Community blog](https://community.ibm.com/community/user/blogs/vishal-brahmbhatt/2026/08/05/materials-in-maximo-mobile)
- In Salesforce, product requests can be raised for a work order when stock is low and are fulfilled through ProductTransfer. Marking a ProductTransfer Received automatically adjusts ProductItem (stock-at-location) balances, which covers van-to-warehouse returns — [Trailblazer Community](https://trailhead.salesforce.com/trailblazer-community/feed/0D5KX00000pPFvx0AG); [Gyde guide](https://gyde.ai/kb/set-up-and-manage-your-inventory) (community and third-party sources)
- In D365, inventory adjustments and invoicing happen at Posted, and work order products can convert to customer assets at Completed — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)

### Inferences
- Tables:
  - `stock(part_id, location_id, on_hand, reserved, version)`. `location_id` is a warehouse or a technician's van, and available = on_hand − reserved.
  - `part_reservation(id, work_order_id, part_id, location_id, qty, type HARD|SOFT, status RESERVED|ISSUED|CONSUMED|RELEASED|BACKORDERED, required_by, created_at)`
  - `part_transaction(id, part_id, location_id, qty_delta, kind RECEIVE|ISSUE|RETURN|TRANSFER|ADJUST, work_order_id, user_id, at)`. This is append-only.
- **Rules**:
  - At validation, check availability at the site warehouse, then at nearby warehouses or vans, and return a suggested source.
  - On approval, create a HARD reservation inside the same transaction with an optimistic lock. If stock is short, mark the reservation BACKORDERED, raise a PART_UNAVAILABLE exception, and hold the work order.
  - On completion, the technician confirms the consumed quantity. Consumed parts decrement on_hand and reserved, and unused parts are released.
  - On cancel or dropout, release the reservation or keep it with the work order.

### Gaps
- Official Salesforce ProductItem and ProductTransfer documentation was not fetched directly. The claims above rely on community and third-party sources.

## 7. Completion verification

### Takeaway
Verification combines procedure or checklist fields that can be made mandatory (photo, signature, readings, pass/fail), service reports with role-typed signatures, and a supervisor review step: D365 Review/Approval, ServiceNow Pending review, Maximo COMP→CLOSE. Model it as COMPLETED → (supervisor) VERIFIED or REWORK → CLOSED.

### Cited Findings
- Salesforce service reports can carry multiple signatures, each with a distinct Signature Type such as Technician, Customer or Supervisor, and the count must match the template. Each DigitalSignature record stores a base64 image, the signer's name, date, and Place, with ParentId pointing to the work order or appointment — [Salesforce Create Service Report action](https://developer.salesforce.com/docs/atlas.en-us.api_action.meta/api_action/actions_obj_create_service_report.htm); [DigitalSignature object](https://developer.salesforce.com/docs/atlas.en-us.210.0.object_reference.meta/object_reference/sforce_api_objects_digitalsignature.htm)
- ServiceNow Quality Management routes qualifying Closed Complete tasks to Pending review, and the reviewer approves them or returns them as "Needs information". Closed work orders support customer digital signature and PDF summary — [ServiceNow docs](https://www.servicenow.com/docs/r/DBkKvgbNn2vmEpXdLk9O2w/4V7ehAd~gF500f5YT0Fn4A); [ServiceNow work order states](https://www.servicenow.com/docs/r/yN_QmjTF0~igG0fSGkXXng/ccbt2xQienYJJefME~xHEw)
- D365 has a Review/Approval stage in which the field supervisor "verifies that all the work was done properly" before Posted — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)
- MaintainX procedures support Picture/File fields and inspection checks, where a FAIL automatically creates a work order. Photos on work orders can be annotated — [MaintainX procedures](https://www.getmaintainx.com:443/procedures/d/ZIHO3HWftbM/writing-maintenance-procedures); [MaintainX Help: attach pictures](https://help.getmaintainx.com/add-pictures-or-files-to-a-work-order)
- Tractian procedure fields include Photo/File and Signature, and any field can be made mandatory. The closer cannot complete the work order without filling the mandatory fields — [Tractian FAQ](https://faq.tractian.com/en/articles/9171313-create-procedures)

### Inferences
- Tables:
  - `checklist_template(item: label, type CHECK|NUMBER|PHOTO|SIGNATURE|TEXT|PASS_FAIL, required, min, max)`
  - `work_order_checklist_response`
  - `work_order_attachment(id, wo_id, kind PHOTO|REPORT|DOC|SIGNATURE, file_path, sha256, mime, uploaded_by, uploaded_at, lat, lng, device_time, server_time)`
  - `work_order_verification(wo_id, verifier_id, decision VERIFIED|REWORK, comments, at)`
- Completion guard: COMPLETED is allowed only if every required checklist item is answered, at least N "after" photos exist, a technician signature exists (plus a customer signature if required), and consumed parts are confirmed. The server rejects the transition with a list of missing items.
- Evidence integrity: store a sha256 of each file and include it in the audit event hash, so later file swaps are detectable. Record both the server timestamp and the client geotag. A PASS_FAIL "FAIL" can auto-create a follow-up work order, as MaintainX does.

### Gaps
- MaintainX's mandatory-field and signature features were not confirmed in its help centre.

## 8. Audit trail and tamper evidence ("blockchain-lite")

### Takeaway
Use an append-only PostgreSQL event table: who, what, when, entity, old and new values. Block UPDATE, DELETE and TRUNCATE with triggers and privileges. Chain each row's SHA-256 to the previous row's hash, and periodically anchor the head hash externally. This is tamper-*evident* rather than tamper-proof, and it gives a credible "blockchain-ready" story without running a blockchain.

### Cited Findings
- Plain audit tables can be rewritten by anyone with UPDATE or DELETE rights, and blocking edits is not the same as detecting them. Hash chaining, where each entry's hash includes the previous hash, lets a verifier walk the chain and report the first divergence — [AppMaster: tamper-evident audit trails in PostgreSQL](https://appmaster.io/blog/tamper-evident-audit-trails-postgresql) (search snippet; fetch failed); [Pkcs11ex.Audit docs](https://hexdocs.pm/pkcs11ex_audit/Pkcs11ex.Audit.md)
- Triggers can block UPDATE, DELETE and TRUNCATE regardless of caller privilege. A canonical field order is needed so the app and the verifier compute identical digests — [hexdocs Pkcs11ex.Audit](https://hexdocs.pm/pkcs11ex_audit/Pkcs11ex.Audit.md); [DEV: tamper-evident audit log in NestJS](https://dev.to/elwin_ernst/building-a-tamper-evident-audit-log-in-nestjs-with-hash-chains-4l76)
- An attacker with full database access can recompute the whole chain. The mitigation is to periodically publish the head hash to storage the attacker cannot modify, such as email or WORM storage — [the47network: tamper-proof audit trail](https://the47network.com/blog/tamper-proof-audit-trail.html); [knogin docs](https://knogin.com/en/developers/auth-tamper-evident-audit-trail)
- One architecture decision record chose application-written domain events with JSONB context over trigger-captured row diffs, and flagged the tension with GDPR erasure. The suggested fix is to keep personal data outside the hashed payload — [the47network](https://the47network.com/blog/tamper-proof-audit-trail.html)
- D365 creates a timestamp record on every booking status change and keeps child records on deactivation "to preserve historical data" — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)

### Inferences
- Table: `audit_event(seq bigserial PK, occurred_at timestamptz default now(), actor_id, actor_role, action, entity_type, entity_id, old_value jsonb, new_value jsonb, reason, ip, prev_hash char(64), hash char(64))`. Compute the hash in Java as `hash = sha256(prev_hash || canonicalJson(seq, occurred_at, actor_id, action, entity_type, entity_id, old_value, new_value))`. Serialize writes with `pg_advisory_xact_lock(42)` or a single `synchronized` writer so the chain does not fork.
- Add a trigger `BEFORE UPDATE OR DELETE ON audit_event … RAISE EXCEPTION`.
- Expose `GET /api/audit/verify`, which recomputes the chain and returns OK or the first broken seq. A demo that edits a row in psql and shows "chain broken at #123" makes a strong hackathon moment.
- For "blockchain extensibility", describe a pluggable `AnchorService` that publishes the daily Merkle root or head hash. Today it can write to a file or email; later it could target Hyperledger or a public chain. Do not claim an actual blockchain is running.
- Feed the audit log from the state machine's single transition method, plus a JPA `@EntityListeners` or Hibernate Envers for field-level diffs if time allows.

### Gaps
- The full AppMaster article could not be fetched (DNS failure), so its specific schema is not included.

## 9. Notifications: events, channels and recipients

### Takeaway
Vendor docs say notifications are triggered by status transitions and SLA thresholds. For example, D365 sends an automatic notification at dispatch "if set up", and ServiceNow emails at percentage thresholds. No source gave a definitive event-to-channel matrix, so the matrix below is a design recommendation.

### Cited Findings
- In D365, at the dispatch stage a "notification, if set up, [is] sent by system automatically to field agent, customer, and other parties" — [Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status)
- In UpKeep, the decline reason is sent to the requester — [UpKeep Help](https://help.onupkeep.com/en/articles/9627833-how-administrators-and-limited-administrators-can-approve-and-manage-work-order-requests)
- ServiceNow SLA warnings at 50%, 75% and 90% are implemented as events followed by email notifications — [ServiceNow Community](https://www.servicenow.com/community/hrsd-forum/trigger-sla-breach-for-50-and-75/m-p/3552790)
- Salesforce milestone actions include warning, violation and success actions such as email alerts — [SalesforceBen](https://www.salesforceben.com/complete-guide-to-salesforce-entitlements-and-milestones-in-service-cloud/)

### Inferences
Suggested matrix. Implement it with a Spring `@TransactionalEventListener(phase = AFTER_COMMIT)` that writes a `notification` row (in-app inbox) and pushes it over STOMP to `/topic/dispatch` and `/user/queue/notifications`. Email and SMS are optional or stubbed.

| Event | Recipients | Channels |
|---|---|---|
| Request submitted | Approvers for the site | In-app + WebSocket badge |
| Validation failed / warning | Requester | In-app |
| Approved / Rejected (with reason) | Requester | In-app + email |
| Assigned | Technician | Push/WebSocket + email; must Accept |
| Technician declined / dropout / no-show | Dispatcher, supervisor | WebSocket alert (red), email |
| Part backordered | Dispatcher, storekeeper | In-app + email |
| SLA 75% | Technician, dispatcher | In-app |
| SLA 90% | Supervisor | In-app + email (+ SMS stub) |
| SLA breached | Manager | Email + in-app; exception logged |
| Completed (awaiting verification) | Supervisor | In-app |
| Verified / Rework | Technician, requester | In-app + email |
| Closed | Requester / customer | Email with report PDF |

- The centralized-visibility dashboard should subscribe to `/topic/work-orders` for live board updates. Show counts by status, open exceptions, SLA at-risk lists, and technician utilisation.

### Gaps
- No primary vendor source gave an authoritative event-to-channel-to-recipient matrix. MaintainX, Limble and Fiix notification settings were not researched.
