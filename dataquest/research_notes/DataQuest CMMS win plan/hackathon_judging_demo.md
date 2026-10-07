# DataQuest 3.0: Event Facts, What Judges Reward, and a Demo Plan for DQBH

Research date: 2026-10-08. **Timing alert:** one third-party source dates the DataQuest 3.0 finale to Oct 7–8, 2026, which would put it today. Confirm the schedule with the organizers right away.

## Q1. What is publicly known about DataQuest 3.0 (VIT Chennai)?

### Takeaway
Only basic facts can be found online. DataQuest 3.0 is a 24-hour, in-person, data-focused hackathon run by ECDS at VIT Chennai. It has an Unstop "Prelims" listing, teams of 4–6, and about 1,223 registrations, and it is said to offer cash rewards and job opportunities. The official judging rubric, prize amounts, round structure, and rules on prior work or open source could not be found. Teams must get these from the organizers' problem-statement PDF or briefing.

### Cited Findings
- Unstop lists "Data Quest 3.0 Prelims – 2026" for Vellore Institute of Technology (VIT) Chennai — [Unstop](https://unstop.com/hackathons/data-quest-3o-prelims-vellore-institute-of-technology-vit-chennai-1750118). The page content could not be fetched directly (it is rendered by JavaScript). These facts come from search-engine summaries of it:
  - Organizer: Engagement & Collaboration Committee of Data Science (ECDS), VIT Chennai. Format: 24-hour data-driven hackathon. Teams work on real-world challenges and present to "a panel of tech experts and industry professionals." Team size: 4–6. Registration deadline: 27 Sep 2026. About 1,223 registrations. Prize text: "job opportunities and cash rewards from leading co[mpanies]" (cut off, no amounts shown) — [Unstop listing via search summary](https://unstop.com/hackathons/data-quest-3o-prelims-vellore-institute-of-technology-vit-chennai-1750118)
- HackathonRadar lists "Data Quest 3.0 Prelims": In Person, Sep 5 – Sep 27, 2026, VIT Chennai, tags Data Science / AI / Edtech. It shows no prize pool, team size, or rounds — [HackathonRadar Chennai](https://www.hackathonradar.com/discover/chennai)
- A participant's template repo says "DataQuest 3.0 — 24-Hour Data-Driven Hackathon … Organized by ECDS (Engagement & Collaboration Committee of Data Science)", VIT Chennai, **Oct 7–8, 2026, MG Auditorium**. This is a participant source, not an official one — [hellcat123git/dataquest](https://github.com/hellcat123git/dataquest)
- Problem-statement codes start with "DQ". Another team's repo was "Built for DataQuest 3.0 (VIT Chennai)" under code **DQWL**, a placement and student-analytics brief. The code is not expanded anywhere — [CareerLens](https://github.com/UtkarshTheWise/CareerLens)
- **At least one other team is publicly working on the same DQBH brief.** The repo "dataquest3.0" describes a "full-stack activity management platform for industrial equipment servicing", a "service orchestration engine". Its features include AI request classification, technician matching, spare-part prediction, an SLA/exception engine with dynamic reassignment, and a "Service Passport" (an immutable machine service history). Its stated principle is "AI advises, deterministic backend enforces". Planned stack: React/Vite/Tailwind, FastAPI, PostgreSQL + pgvector, Redis, Celery. The README says setup is "to be added later", and filenames mention a "DQBH PDF" and a "Master Implementation Blueprint" — [DivyaaDharhsini/dataquest3.0](https://github.com/DivyaaDharhsini/dataquest3.0)
- A third repo, "HackathonOS", calls itself an AI workspace built for DataQuest 3.0 — [search summary referencing hellcat123git/dataquest](https://github.com/hellcat123git/dataquest)

### Inferences
- The codes appear to be sponsor-specific: DQWL probably maps to WeLe and DQBH to Bitumen Supply Hub ("BH"). This is inferred from the sponsor names and the codes, not confirmed. If it holds, a Bitumen Supply Hub representative may be judging DQBH, so the demo should use industrial and plant-equipment language (Site A, bitumen plant equipment, decanters, pumps, heaters) where it fits.
- The sequence looks like an online/registration "Prelims" (probably idea or PPT shortlisting, Sep 5–27), then a 24-hour offline finale at MG Auditorium (Oct 7–8). This shape is inferred from the listing name and dates, and the round structure is not confirmed.
- The event is branded as data science. Judges from ECDS may weigh the "Data" side (analytics, predictive elements, dashboards) more than a typical web-dev hackathon would.
- The rival DQBH team has the same feature vision (exception engine, reassignment, service passport) but appears to be starting from scratch. A working end-to-end CMMS core is a strong differentiator. The open-source base needs to be disclosed (see Q2), and the newly built orchestration layer should be the headline.

### Gaps
- No official ECDS or VIT web page, Instagram/LinkedIn post, Devfolio, or Devpost listing was found. The judging rubric, prize amounts, finale round structure (for example, mid-hackathon reviews or a finalist pitch), deliverables (PPT, video, GitHub link, deployed URL), rules on pre-existing code and open source, and AI-tool policy were all **not findable**. Get these from the problem-statement PDF or WhatsApp/Discord announcements.
- No information was found on DataQuest 1.0 or 2.0 (precedent, past winners). Searches only returned unrelated "DataQuest" events at IIT Roorkee, INSAT Tunisia, and elsewhere.
- No public source confirms the sponsor list (Cenizas Labs, ECDS, Bitumen Supply Hub, WeLe, ElevenLabs) or what each sponsor does at the event. This comes only from the user's brief.

## Q2. Can teams build on existing open-source code? What disclosure is expected? What does AGPL-3.0 require?

### Takeaway
Hackathon norms vary. MLH's template forbids reusing earlier project code but allows public frameworks if they are listed in a README. Many events allow open-source or pre-existing code if it is disclosed, and then judge only the new work. Since DataQuest's own rules are unknown, the safe course is full upfront disclosure: say the product is "built on Atlas CMMS (AGPL-3.0)" and show exactly what was added during the event. AGPL-3.0 requires that a publicly reachable modified deployment offer its full source to users, that it carry modification and license notices, and that it keep the AGPL license. Atlas's own README says white-label branding needs its commercial license, so a rebranded demo carries some IP risk.

### Cited Findings
- MLH recommended rules: "You may not work on your project before the event … you should not be reusing code from previous projects." Also: "You may use publicly available frameworks, but you need to list said frameworks in a readme." — [MLH Hackathon Organizer Guide](https://guide.mlh.com/general-information/judging-and-submissions/rules-for-your-hackathon)
- MLH notes that organizers may use its rules or their own, so the rules are a template and not universal. MLH also asks teams to credit AI tools and to be clear about "what they made vs what they are using" — [MLH guide, via search summary](https://guide.mlh.io/general-information/judging-and-submissions/rules-for-your-hackathon)
- Event rulesets vary. Some allow "libraries, frameworks, or open-source code". Others allow pre-existing code only "if it is open-source and publicly available before the hackathon". In some, "adding new features to existing projects is allowed" but "judges will only consider new functionality introduced … during the hackathon". The strictest require teams to state the existing project in the submission, keep a public commit history (no squashed commit), and risk exclusion if they do not disclose — [UH CodeRED rules](https://github.com/UHCodeRED/rules); [HackTheU rules](https://www.hackerearth.com/challenges/hackathon/hacktheu-2/rules) (search-summary aggregation, wording varies by event)
- A judge's year of notes: one of the standard judge questions is "What part did you build during the event?" — [DEV Community: What judges actually score](https://dev.to/kurbaitaev/what-judges-actually-score-notes-from-a-year-of-hackathon-judging-3p4l)
- AGPL-3.0 §13 (from the repo's own LICENSE file, E:\cmms\LICENSE): "if you modify the Program, your modified version must prominently offer all users interacting with it remotely through a computer network … an opportunity to receive the Corresponding Source of your version by providing access to the Corresponding Source from a network server at no charge" — [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)
- AGPL-3.0 §5 conditions for conveying modified versions: (a) "prominent notices stating that you modified it, and giving a relevant date"; (b) notices that it is released under the AGPL; (c) the entire work must be licensed under the AGPL; (d) interactive UIs must display "Appropriate Legal Notices" if the original did. §7(b)/(c) allow terms that require keeping author attributions and that prohibit misrepresenting the material's origin — [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)
- Atlas CMMS is dual-licensed: "AGPLv3 License — Free and open source" plus a commercial license "Required for white labeling, custom branding, and advanced features". The `LOGO_PATHS` and `BRAND_CONFIG` env settings "Need a license" — [Atlas CMMS GitHub](https://github.com/Grashjs/cmms)

### Inferences
- **Disclosure plan:**
  1. Put a slide early in the deck that says "Foundation: Atlas CMMS (open source, AGPL-3.0). What we built in 24h: …".
  2. Add a README section with a link to the upstream repo, the license, a list of modified files and modules, and a dated notice of modification.
  3. Make the GitHub repo public, with commit history showing event-window commits.
  4. Add a footer or "About / Source" link in the deployed UI that points to the repo, which satisfies AGPL §13.

  Judges who later find an undisclosed Atlas fork would probably treat it as misrepresentation. Disclosed reuse that is framed as "we didn't reinvent CRUD; we built the orchestration brain" usually reads as good engineering judgment.
- **Rebranding risk:** Atlas's README reserves white-labeling for its commercial license. If the team changed names and logos in source rather than through the licensed config, that is less clear-cut under AGPL, and the §7 attribution terms and the misrepresentation clause still apply. Keep visible "Powered by Atlas CMMS" attribution and do not imply the whole platform was written from scratch. This is not legal advice.
- If DataQuest's rules turn out to require from-scratch work only (as MLH's template does), the team should ask organizers before the final pitch and lean hard on demoing the new modules.

### Gaps
- DataQuest 3.0's actual policy on pre-existing or open-source code is unknown.
- I did not read Atlas's full COMMERCIAL_LICENSE.MD or check whether its LICENSE adds §7 terms beyond standard AGPL. A grep of the local LICENSE found only standard AGPL text.

## Q3. What do judges score in enterprise/B2B and Indian problem-statement hackathons?

### Takeaway
Rubrics are fairly consistent. Innovation/novelty, technical implementation, impact/feasibility, demo/presentation, and completeness each carry roughly 10–30%. In practice, a **working live demo of one complete end-to-end path** and a crisp opening line ("what it does and for whom") separate winners from the middle of the pack. Broad, half-built feature lists lose.

### Cited Findings
- Typical Indian-hackathon weights (SIH, corporate, platform-hosted): Innovation 20–25%, Technical Implementation 20–25%, Impact/Usefulness 20–25%, Demo/Presentation 15–20%, Completeness 10–15%. Advice: use real data rather than placeholders, get the live demo working first time, quantify impact (time saved, cost reduced), and name a specific user — [Reskilll blog](https://blogs.reskilll.com/what-hackathon-judges-look-for-complete-judging-criteria-breakdown-2026/) (secondary/blog source)
- Smart India Hackathon criteria: "novelty of the idea, complexity, clarity and details in the prescribed format, feasibility, practicability, sustainability, scale of impact, user experience and potential for future work progression" — [SIH 2019 FAQ](https://www.sih.gov.in/pdf/FAQs%20for%20SIH2019.pdf)
- One college's SIH internal rubric: Innovativeness 20%, Technical approach (feasibility, depth, correctness of implementation) 30%, Feasibility & Scalability 20% — [college SIH report via search](https://www.rcpit.ac.in/uploads/departmental_student_clubs/1786180197_357.pdf) (one institution only)
- HackTheU: Originality, Difficulty, Impact, Polish, with the note that "judges are free to make decisions based on their gut feeling". CodeRED weighs its criteria equally, including "How technically impressive was the hack?" — [HackTheU](https://www.hackerearth.com/challenges/hackathon/hacktheu-2/rules); [CodeRED](https://github.com/UHCodeRED/rules)
- A judge's observations:
  - "A live demo removes doubt". Working software beat ambitious slides "almost every time".
  - Cut scope until one end-to-end path runs, and describe unbuilt parts in one sentence.
  - Narrow projects scored higher.
  - Open with what it does and for whom, and rehearse the first 30 seconds.
  - Have a one-line identity judges can repeat.
  - Naming a known weakness ("what breaks first at scale?") raised scores.
  - Framework choice and polish beyond legibility did not move scores.
  - Record a screen capture as a fallback, because wifi failed at most events.
  - [DEV Community](https://dev.to/kurbaitaev/what-judges-actually-score-notes-from-a-year-of-hackathon-judging-3p4l)

### Inferences
- For DQBH, "technical complexity" points come from the **orchestration logic**: eligibility validation, a skill/location/availability-scored auto-assignment, part reservation with stock locking, an SLA timer, and an exception engine with reassignment. CRUD screens will not earn them, and Atlas already provides CRUD.
- "Completeness" is where the Atlas base helps most. Auth, RBAC, work orders, assets, parts, and notifications are real and clickable. The team should still disclose the base.
- The "extensible architecture" items in the brief (IoT, blockchain, maps, mobile, ML) should be shown as **one architecture slide plus at most one thin real hook**, for example a simulated IoT alert that auto-creates the M-104 request, or a hash-chained audit log as the "blockchain-ready" story. Each should get one sentence, not a half-built demo.
- ECDS is a data-science committee, so include one data-flavoured element that really works, such as an SLA-risk score, an MTTR/MTBF dashboard, or a technician-match score with explanation.

### Gaps
- DataQuest-specific weights are unknown.
- No rubric from the sponsor companies was found.

## Q4. Recommended 5–10 minute demo script and pitch structure for DQBH

### Takeaway
Tell one story: **"Machine M-104 at Site A goes down at 10:02. Watch the platform get it fixed within SLA, even when things go wrong."** Run it live on seeded realistic data, with role switching (requester → ops manager → technician) and a deliberately triggered failure path (technician dropout, then a part shortage, then an SLA-risk flag and automatic reassignment). End on the audit trail and dashboard. Keep a recorded backup video ready.

### Cited Findings (basis for the structure)
- Open with what it does and for whom. Show one end-to-end path. Name a weakness. Keep a recorded fallback — [DEV Community](https://dev.to/kurbaitaev/what-judges-actually-score-notes-from-a-year-of-hackathon-judging-3p4l)
- Use real data rather than placeholders, quantify impact, and make the live demo work first time — [Reskilll blog](https://blogs.reskilll.com/what-hackathon-judges-look-for-complete-judging-criteria-breakdown-2026/)

### Inferences: proposed script (about 8 minutes, adjust to the slot)

**0:00–0:30 Hook and identity.** "DQBH Ops is the dispatch brain for industrial equipment service: from breakdown to verified fix, with SLA and every exception handled automatically." Give one pain stat that the team can source or label as an estimate, such as downtime cost per hour for a plant asset.

**0:30–1:15 Problem → solution slide.** Show today's fragmented flow (calls, Excel, WhatsApp) next to our single orchestrated lifecycle. Include a disclosure line: "Built on open-source Atlas CMMS (AGPL); in 24h we built the orchestration, exception and SLA engine, dashboards, audit timeline."

**1:15–6:30 Live demo (one browser, pre-logged tabs per role, seeded data):**
1. **Requester (Site A supervisor)** raises an urgent, unscheduled request for M-104 with the symptom "hydraulic pressure drop". Optionally trigger it from a simulated IoT sensor alert to show the extensibility hook.
2. **System validation** appears on screen: the asset is eligible (under contract, at Site A), priority is computed (critical, SLA 4h), the needed skill is identified (hydraulics L2), and the required parts are listed.
3. **Ops manager** approves with one click, and auto-assignment runs. Show a ranked candidate list with reasons (skill match, distance or site, current workload, shift availability). The top technician is assigned, parts are **reserved** (stock decremented or held), and the notification fires (in-app, email, or phone on the table).
4. **Technician view (mobile-width browser or phone):** accept, travel, start. The timeline updates live on the manager's screen.
5. **Failure path 1, dropout:** the technician marks "unavailable / emergency". The system flags an exception, **auto-reassigns** to the next-best qualified tech in seconds, transfers the part reservation, and logs everything.
6. **Failure path 2, part unavailable:** the reserved seal kit is short at Site A. The system flags it, proposes a transfer from Site B or a substitute part, and the timeline shows the ETA impact.
7. **Failure path 3, SLA risk/breach:** fast-forward the clock (a demo "time-warp" button). The SLA timer goes amber then red, an exception flag is raised, an escalation alert goes to the ops manager, and reassignment is offered or auto-triggered.
8. **Completion verification:** the technician submits checklist, photo, and readings. The supervisor verifies and signs off, and the work order closes.
9. **Audit trail / service history:** an immutable, timestamped timeline for M-104 showing who did what and when, including every exception. Optionally show a hash-chained log as the "blockchain-ready" proof.

**6:30–7:15 Dashboard.** Show SLA compliance %, MTTR, open exceptions, technician utilisation, parts-at-risk, and a site map if available. All of it should come from seeded data, so the charts are not empty.

**7:15–7:45 Architecture and extensibility slide.** Show the modular services (auth/RBAC, workflow engine, assignment scorer, inventory reservation, SLA/exception engine, notification bus, audit log), the REST APIs, and labelled extension points for mobile, IoT ingestion, ML (predictive failure, assignment learning), maps, blockchain anchoring, and cloud deploy. Mark clearly what is built and what is designed.

**7:45–8:00 Close.** Give the impact claim (for example, "reassignment in seconds instead of hours of phone calls"), name the known limitation and the next step, and repeat the one-line identity.

**Demo hygiene (best practice, inferred from the sources above):**
- Seed realistic data: 3 sites, about 15 assets including M-104, about 8 technicians with skills, shifts, and locations, a parts inventory with one intentionally short item, and 2–4 weeks of historical work orders so the dashboards have trends.
- Use a deterministic "demo control panel" (trigger dropout, deplete part, warp clock) so the failure paths happen on cue and don't depend on timing.
- Keep pre-logged browser profiles per role so you never type passwords on stage. Run locally (docker-compose) with hotspot backup, and keep a 3–4 minute recorded video of the same flow plus screenshots in the deck.
- Rehearse the opening 30 seconds and the dropout→reassignment moment. That moment is the "wow" and the brief's core differentiator.
- Prepare answers for: "What did you build during the event?", "What breaks first at scale?" (for example, concurrency on part reservations, which we handle with DB locks), and "How is AI used?" (an advisory score with deterministic enforcement).

### Gaps
- The actual time slot for the DataQuest pitch and Q&A is unknown, and so are any required deck format or template and whether a video or GitHub submission is required.
