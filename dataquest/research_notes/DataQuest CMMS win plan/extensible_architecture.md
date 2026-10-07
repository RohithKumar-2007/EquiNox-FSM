# Extensible Architecture for a Maintenance / Field-Service Platform (DataQuest 3.0)

Scope: How to make the existing Spring Boot 3.5 / React 17 / PostgreSQL / MinIO monolith (it already has a REST API with API keys, OpenAPI, outgoing webhooks, a workflow engine, STOMP websockets and a Gemini chatbot) visibly extensible. For each extension area (mobile, AI/ML, IoT, real-time, maps, analytics, blockchain, cloud) the notes give a minimum viable integration a student team can build in days on 8 GB Windows laptops with Docker, and what judges should see working.

Note on sourcing: the research used about 15 tool calls. Claims taken from sources are cited inline. Claims based on general engineering knowledge, without a fetched source, are kept in the "Inferences" subsections and labeled as such.

---

## 1. Which architecture style gives extensibility in a monolith (modular monolith + domain events, SPI plugins, webhooks/API-first, event bus) — and what are the hackathon trade-offs?

### Takeaway
Use a **modular monolith with in-process domain events**: Spring `ApplicationEvent`s, made durable with Spring Modulith's event publication registry, which acts as an outbox. Add three extension "ports" on top: the existing REST/OpenAPI API with API keys, the existing outgoing webhooks, and an MQTT ingress. Do not add Kafka. An external broker earns its place only if one is needed for IoT, and that broker is MQTT (Mosquitto), not a general event bus.

### Cited Findings
- Spring Modulith's event publication registry writes an entry for each transactional event listener into an event publication log **as part of the original business transaction**, and marks the entry complete when the listener succeeds. If a listener fails, the entry stays open so it can be retried. Republishing on restart is opt-in through `spring.modulith.events.republish-outstanding-events-on-restart`. — [Spring Modulith docs (events)](https://docs.spring.io/spring-modulith/reference/2.1-SNAPSHOT/events.html); [docs 1.3 events](https://docs.spring.io/spring-modulith/reference/1.3.0-SNAPSHOT/events.html)
- Spring Modulith 2.0 M1 (26 Jul 2025) revamped the registry and added new publication states in the JDBC implementation. Apps can keep the old schema with `spring.modulith.events.jdbc.use-legacy-structure=true`. — [Spring blog, Modulith 2.0 M1](https://spring.io/blog/2025/07/26/spring-modulith-2-0-M1-released)
- Spring Modulith 2.1 (M2 announced 19 Feb 2026) adds **outbox-based event externalization** through Namastack Outbox, as an alternative to the built-in asynchronous externalization, with multi-instance, order-preserving publication. The JDBC event publication repository now initializes its schema by default while still honoring Flyway and Liquibase. Test support (`PublishedEvents`/`Scenario`) captures events application-wide. The 1.4.x and 2.0.x lines got bug-fix releases at the same time. — [Spring blog, Modulith 2.1 M2 / 2.0.3 / 1.4.8](https://spring.io/blog/2026/02/19/spring-modulith-2-1-m2-2-0-3-and-1-4-8-released/)
- The Spring Modulith repository includes `spring-modulith-example-outbox`, which shows events persisted to an outbox table in the same transaction and processed asynchronously. — [spring-modulith releases/GitHub](https://github.com/spring-projects/spring-modulith/releases)
- Industry reference architectures for predictive maintenance treat the CMMS/EAM as a **system called through its REST API** by an external event pipeline. In AWS's Monitron + Treon guidance, AWS IoT rules route anomaly events to EventBridge (with retry), and a Lambda function "creates work orders using the REST API of the target EAM or CMMS". — [AWS Guidance: Integrating Amazon Monitron with Treon Connect](https://aws.amazon.com/solutions/guidance/integrating-amazon-monitron-with-treon-connect-on-aws/)
- In the SAP-integrated AWS variant, an IoT Events detector model holds the threshold logic (for example, temperature out of range for more than 15 minutes) and invokes a Lambda that creates an SAP service notification. — [AWS for SAP blog](https://aws.amazon.com/blogs/awsforsap/predictive-maintenance-using-sap-and-aws-iot-to-reduce-operational-cost/)

### Inferences
- **Recommended layered picture (text diagram):**
  ```
  [React web app]  [PWA / mobile]  [3rd-party / Python AI svc]  [IoT devices]
        |               |                    |  REST+API key         | MQTT
        +------ nginx (TLS, routing /api, /ws, /ai, /grafana) -------+
                                |                                    |
                     Spring Boot modular monolith           Mosquitto broker
         +------------------------------------------------+       |
         | Modules: assets | work-orders | technicians |   |<------+ (Spring Integration MQTT inbound)
         |          iot-ingest | analytics | audit-ledger|
         |   Ports: REST/OpenAPI, Webhooks(out), STOMP/SSE |
         |   Domain events: WorkOrderCreated, StatusChanged,|
         |   TelemetryThresholdBreached, WorkOrderClosed   |
         |   -> Spring Modulith event registry (outbox)    |
         |   SPI: AiProvider, NotificationChannel,         |
         |        LedgerAnchor, GeoService                 |
         +------------------------------------------------+
                 |                |               |
           PostgreSQL(+PostGIS)  MinIO      FastAPI ML svc
  ```
- The **SPI/plugin interface** is the cheapest way to "prove" extensibility to judges. Define Java interfaces such as `AiAssistantProvider` (Gemini today, others later), `NotificationChannel` (email, STOMP, FCM, webhook) and `LedgerAnchor` (hash-chain only, or OpenTimestamps/testnet), each with several `@ConditionalOnProperty` implementations. Then show on a slide that adding a capability is "implement interface + set config flag". This is general Spring practice and has no single source.
- **Event bus trade-off** (general knowledge, not sourced here): Kafka adds a JVM process and ZooKeeper/KRaft. Even in KRaft mode it typically wants 1 GB+ of heap, which hurts on 8 GB laptops already running Postgres, MinIO, Spring and a Python service. RabbitMQ or Redis Streams are lighter, but they still duplicate what in-process events plus the Modulith outbox already give a single-node monolith. Mosquitto, which IoT needs anyway, uses only a few MB. **Recommendation:** in-process events + Modulith registry, and mention "externalize to Kafka via Spring Modulith's externalization" as the scale-out path on a slide.
- **Compatibility caution:** the 2.x Modulith line appears aimed at Spring Boot 4 / Spring Framework 7. For a Boot 3.5 app the safe pick is probably **Spring Modulith 1.4.x**. The fetched blog post did not state the Boot-version mapping, so verify it (see Gaps). The 2.1 outbox (Namastack) feature is therefore probably unavailable on Boot 3.5. The 1.x event publication registry (JDBC) still gives the transactional-outbox behavior.
- **Fallback with no new dependency:** a hand-rolled outbox. Write an `outbox_event` row in the same `@Transactional` method, and have a `@Scheduled` poller deliver it to the webhooks, STOMP and the AI service. A team can write this in about half a day.
- The workflow engine and webhooks already in the codebase should be framed as part of the same event backbone. The rule is "every domain event can trigger (a) workflow rules, (b) webhooks, (c) websocket pushes, (d) ledger entries".

### Gaps
- I could not confirm from a fetched source which Spring Boot version each Spring Modulith line targets (1.4.x vs 2.0.x). Check the Spring Modulith compatibility matrix or project page before adding the dependency.
- No measured memory figures were sourced for Kafka, RabbitMQ or Redis on Docker Desktop for Windows. The memory guidance above is engineering judgment.

---

## 2. IoT: telemetry → MQTT broker → backend → threshold/anomaly rule → auto-created service request; device simulation and Spring integration

### Takeaway
Run **Eclipse Mosquitto 2.x in Docker** with an explicit `mosquitto.conf`. Simulate devices with a ~40-line Python `paho-mqtt` script. Consume the telemetry in Spring with **Spring Integration MQTT** (`Mqttv5PahoMessageDrivenChannelAdapter`), apply a rule (threshold plus duration or rolling z-score), and publish a domain event that auto-creates a work order and pushes it live to the dispatch board. This mirrors the AWS reference pattern, "anomaly → Lambda → CMMS REST API creates work order", on a laptop.

### Cited Findings
- **Mosquitto 2.0 defaults:** all listeners default to `allow_anonymous false`, and the default container config is loopback-only, so a custom config with at least a listener is required. Minimal dev config: `listener 1883` plus `allow_anonymous true`, mounted at `/mosquitto/config/mosquitto.conf` and run with `-p 1883:1883`. A port given on the command line is ignored when listeners are defined in the file. — [Eclipse Mosquitto 2.0 release review](https://projects.eclipse.org/node/20872); [DataCamp Mosquitto Docker tutorial](https://www.datacamp.com/ja/tutorial/mosquitto-docker); [Classmethod LAN access article](https://dev.classmethod.jp/articles/mosquitto-docker-access-from-lan/)
- For authentication, set `allow_anonymous false` with a `password_file` created using `mosquitto_passwd`, and optionally an `acl_file`. — [DataCamp Mosquitto Docker tutorial](https://www.datacamp.com/ja/tutorial/mosquitto-docker)
- **Spring Integration MQTT** (reference page currently documents 7.1.1): MQTT v5 channel adapters arrived in 5.5.5. The inbound adapter is `Mqttv5PahoMessageDrivenChannelAdapter` and the outbound is `Mqttv5PahoMessageHandler`. The Paho client libraries are **optional** dependencies that must be added explicitly: `org.eclipse.paho.mqttv5.client`, and since 6.5 also `org.eclipse.paho.client.mqttv3` for v3. Use `MqttConnectionOptions#setAutomaticReconnect(true)`. `MqttMessageConverter` is v3-only. A shared `ClientManager` (e.g. `Mqttv5ClientManager`) lets several adapters share one connection, and since 6.4 adapters can be added at runtime through `IntegrationFlowContext`. — [Spring Integration MQTT reference](https://docs.spring.io/spring-integration/reference/mqtt.html)
- DSL example from the docs: `new Mqttv5PahoMessageDrivenChannelAdapter(MQTT_URL, "clientId", "topic")`, with `setPayloadType(String.class)` and `IntegrationFlow.from(adapter)...`. The payload type defaults to `byte[]`. — [Spring Integration MQTT reference](https://docs.spring.io/spring-integration/reference/mqtt.html)
- Industrial reference: Treon sensors send measurements and inference results to AWS IoT Core **via MQTT v5**, IoT rules route predicted anomalies to EventBridge, and then a Lambda creates the CMMS/EAM work order through its REST API. Raw telemetry also goes to Firehose → S3 as a data lake. — [AWS Guidance: Monitron + Treon](https://aws.amazon.com/solutions/guidance/integrating-amazon-monitron-with-treon-connect-on-aws/)
- In AWS's Monitron guidance, an IoT Events state machine responds to a sensor warning state, creates an ERP work order through Lambda, and notifies staff through SNS (SMS, push, email). Analytics uses Glue/Athena with Amazon Managed Grafana. — [AWS Guidance for Predictive Maintenance with Amazon Monitron](https://docs.aws.amazon.com/solutions/predictive-maintenance-with-amazon-monitron/)
- Rule-style detection in the SAP variant: "temperature out of normal range for more than 15 minutes" fires a detector that creates a service notification. — [AWS for SAP blog](https://aws.amazon.com/blogs/awsforsap/predictive-maintenance-using-sap-and-aws-iot-to-reduce-operational-cost/)
- **Deprecation flags for AWS managed PdM services:** Amazon Monitron stopped accepting new customers on 31 Oct 2024 and will get no new features. — [AWS ML blog](https://aws.amazon.com/blogs/machine-learning/maintain-access-and-consider-alternatives-for-amazon-monitron). Amazon Lookout for Equipment has an end-of-support date of **7 Oct 2026**, after which console and resource access ends. — [AWS Lookout for Equipment page](https://aws.amazon.com/lookout-for-equipment); [AWS docs](https://docs.aws.amazon.com/lookout-for-equipment/latest/userguide/how-it-works.md)

### Inferences
- **MVP data flow (text diagram):**
  ```
  sim_devices.py (paho-mqtt) --publish--> Mosquitto :1883
     topic: plant/{siteId}/asset/{assetId}/telemetry
     payload: {"ts":..., "temp":71.2, "vib_rms":3.4, "rpm":1772}
                         |
  Spring Integration MQTT inbound adapter -> TelemetryService
     -> save to telemetry table (time-indexed; optional TimescaleDB later)
     -> RuleEngine: threshold for N consecutive readings OR z-score>3 OR call ML /score
     -> publish TelemetryThresholdBreached(assetId, metric, value)
          -> listener: create WorkOrder(priority=HIGH, source=IOT) with dedup window
          -> STOMP /topic/dispatch + /topic/assets/{id}/telemetry
          -> outgoing webhook "workorder.created"
          -> ledger entry (hash-chain)
  ```
- **Device simulator:** a Python script with N virtual assets, each a random walk, plus a CLI flag or keypress such as `--inject-fault asset-7` that ramps vibration and temperature. This makes the "fault" happen on cue in front of judges. Replaying rows from the Azure PdM telemetry CSV, or a C-MAPSS engine trajectory, makes the stream realistic rather than pure noise. Suggested library: `paho-mqtt` 2.x, whose callback API changed in 2.0; this is from memory, so verify.
- **Debounce/dedup is essential:** open at most one auto work order per asset and fault type while one is still open. Otherwise the demo floods the board.
- **Why Mosquitto over EMQX on 8 GB laptops** (judgment, not sourced): Mosquitto is a tiny C broker. EMQX (Erlang) has a nice dashboard but is heavier. Mention EMQX or HiveMQ as the "production cluster" option.
- Optional browser visual: Mosquitto can expose a WebSocket listener (`listener 9001` with `protocol websockets`), so the React app could subscribe directly with MQTT.js. Relaying through Spring STOMP keeps auth centralized and is simpler, so prefer that.

### Gaps
- No fetched source gave measured RAM or CPU for Mosquitto vs EMQX containers.
- I did not fetch the paho-mqtt 2.x Python docs. Check the `CallbackAPIVersion` change before writing the simulator.

---

## 3. AI/ML: predictive maintenance (RUL, anomaly detection), LLM assistants (RAG over manuals, NL work orders), technician recommendation; datasets; lightweight serving

### Takeaway
Build a **Python FastAPI sidecar** (`/predict/rul`, `/score/anomaly`, `/recommend/technician`) that Spring calls over REST through an `AiProvider` SPI. Train small scikit-learn or LightGBM models offline on **NASA C-MAPSS** (RUL) and/or the **Microsoft Azure PdM** dataset (failure prediction from telemetry, errors and maintenance history). Extend the existing Gemini chatbot with **RAG over equipment manuals stored in MinIO** and **natural-language → structured work order** (JSON output). Technician recommendation can be a transparent weighted score (skill match, distance, current load, first-time-fix history) rather than ML.

### Cited Findings
- **NASA C-MAPSS** has four subsets. FD001: 100 train / 100 test trajectories, 1 operating condition, 1 fault mode (HPC degradation). FD002: 260/259, 6 conditions, 1 fault mode. FD003: 100/100, 1 condition, 2 fault modes. FD004: 248/249, 6 conditions, 2 fault modes. Training sets are complete run-to-failure trajectories. Test sets are truncated, and true RUL values are provided separately. The data includes sensor noise. — [ozogxyz/cmapss GitHub](https://github.com/ozogxyz/cmapss); [IEEE DataPort C-MAPSS](https://ieee-dataport.org/documents/c-mapss-dataset)
- The original host is the NASA Prognostics Data Repository. Mirrors include an S3 "phm-datasets" zip, Hugging Face `SoyVitou/NASA-C-MAPSS-Turbofan-Engine`, and an IEEE DataPort copy (DOI 10.21227/pjh5-p424). A newer NASA set, N-CMAPSS ("Aircraft Engine Run-to-Failure Dataset under real flight conditions", Chao et al., 2021), also exists. — [ozogxyz/cmapss](https://github.com/ozogxyz/cmapss); [Hugging Face](https://huggingface.co/datasets/SoyVitou/NASA-C-MAPSS-Turbofan-Engine); [IEEE DataPort](https://ieee-dataport.org/documents/nasa-turbofan-jet-engine-data-set)
- **Microsoft Azure Predictive Maintenance dataset** has five tables for 100 machines. Telemetry gives hourly averages of voltage, rotation, pressure and vibration for 2015. Errors are non-fatal events. Maintenance records component replacements, scheduled or after breakdown, for 2014–2015. Failures are the subset of maintenance caused by breakdowns. Machines gives model and age. Timestamps are rounded to the hour. The original Azure AI Notebooks copy was retired (as of 15 Oct 2020), and Kaggle is now the main copy. — [H1st tutorial describing the dataset](https://h1st.readthedocs.io/en/latest/tutorials/examples/oracle-iot.html); [Microsoft Fabric predictive maintenance tutorial](https://learn.microsoft.com/en-ca/%20fabric/data-science/predictive-maintenance); [Microsoft PdM modelling guide (archive)](https://learn.microsoft.com/en-us/archive/blogs/machinelearning/predictive-maintenance-modelling-guide-in-the-cortana-intelligence-gallery)
- **CWRU Bearing Data Center:** a 2 hp Reliance motor with an SKF 6205-2RS drive-end bearing and an accelerometer sampled at 12 kHz or 48 kHz. The fan end is sampled at 12 kHz. Loads are 0–3 hp at about 1730–1797 rpm. Classes are normal, inner race, ball and outer race, with EDM-seeded faults of 0.007–0.028 in. Files are MATLAB `.mat`, about 120k–240k samples each. The `py-cwru` PyPI package downloads the data as NumPy arrays. — [arXiv 2310.11477](https://arxiv.org/pdf/2310.11477); [py-cwru on PyPI](https://pypi.org/project/py-cwru); [awesome-bearing-dataset](https://github.com/VictorBauler/awesome-bearing-dataset)
- Commercial reference stacks pair telemetry with ML anomaly models and then automated work-order creation. One LTIMindtree automotive case used Greengrass, SiteWise, IoT Core, Lambda, Glue and Athena, integrated with IBM Maximo for automated work orders. — [LTIMindtree case study (PDF)](https://www.ltimindtree.com/wp-content/uploads/2022/01/IoT-driven-Predictive-Maintenance-for-Leading-Automotive-Player-CS.pdf)
- Managed "PdM-as-a-service" options are being retired. Lookout for Equipment ends support on 7 Oct 2026, and Monitron is closed to new customers. This argues for owning a simple model instead of relying on such a service. — [AWS Lookout for Equipment](https://aws.amazon.com/lookout-for-equipment); [AWS ML blog on Monitron](https://aws.amazon.com/blogs/machine-learning/maintain-access-and-consider-alternatives-for-amazon-monitron)

### Inferences
- **Which dataset fits which demo:**
  - *C-MAPSS FD001* gives the cleanest "remaining useful life: 37 cycles" story. Engineer rolling-window features and train a GradientBoosting or RandomForest regressor, which takes minutes on CPU. Cap RUL at about 125 (piecewise-linear target); this is a common practice in the literature, not verified here. Stream a test engine through MQTT, and the asset page shows a RUL gauge counting down.
  - *Azure PdM* fits a CMMS best, because it has **machines, errors, maintenance and failures**: the same entities as the app. It supports "probability this machine has a component failure in the next 24 h" and can seed realistic maintenance history for the MTBF/MTTR analytics. Probably the best single dataset for this project.
  - *CWRU* is high-frequency vibration and suits a "fault classification" story (inner race vs ball). It needs FFT/spectral features, and streaming at 12 kHz over MQTT is unrealistic. Use it only if a team member already knows signal processing.
- **Serving:** FastAPI + uvicorn + joblib-loaded model in a `python:3.12-slim` container (about 150–300 MB RAM). Spring calls it with `RestClient` behind an `AiProvider` interface, with timeouts and a graceful "AI unavailable" fallback. Return explanation fields such as top contributing features, so the UI can show *why*.
- **LLM features that judges notice:**
  1. *Natural-language work order*: a technician types or speaks "Pump P-104 at Plant 2 is leaking from the seal, urgent". Gemini's structured/JSON output (verify the exact response-schema parameter in the Gemini API docs) returns `{asset, site, priority, category, description}`, which pre-fills the work-order form.
  2. *RAG over manuals*: chunk PDFs from MinIO, embed them, and store vectors in **pgvector** in the existing Postgres, which avoids a new vector DB. Answer "how do I replace the seal on P-104?" with citations to page numbers.
  3. *Work-order summarization / closure notes*.
- **Technician recommendation:** a transparent score such as `0.4*skillMatch + 0.3*(1 - normDistance) + 0.2*(1 - normLoad) + 0.1*historicalFTF`. Show the score breakdown in the UI. Explainable beats opaque for judges. Mention Timefold/OR-Tools route optimization only as "future work".

### Gaps
- I did not fetch the Gemini API docs (structured output, embeddings model names) or the pgvector docs. Verify current model names and the JSON-schema parameter.
- No source was fetched for typical C-MAPSS baseline RMSE values. Any accuracy claim on slides should come from the team's own run.
- The Kaggle Azure PdM page license and current availability were not confirmed directly.

---

## 4. Real-time: WebSocket/STOMP vs SSE, live dispatch board, push notifications (FCM)

### Takeaway
Keep the existing **STOMP** setup and widen it from "notifications" to a **live dispatch board** (`/topic/dispatch`), **live asset telemetry** (`/topic/assets/{id}`) and **technician location updates**. SSE is a simpler alternative for one-way streams, but there is no reason to switch. For phones, use **Web Push via FCM in the PWA**. On iOS this requires iOS/iPadOS 16.4+ and the app installed to the home screen.

### Cited Findings
- Practitioner guidance: SSE (`SseEmitter`) is simpler for one-way push. It is plain HTTP, `EventSource` reconnects automatically, and it rarely hits proxy or firewall issues. But the client cannot send on the same stream, and `EventSource` cannot set custom headers such as `Authorization`, so auth must rely on cookies or query parameters. — [besthub.dev SSE vs WebSocket](https://www.besthub.dev/articles/springboot-sse-vs-websocket-complete-guide-to-server-sent-events-for-unidirectional-push-60496cd8fe28); [CSDN comparison](https://aicoding.csdn.net/6a5ddfe7662f9a54cb9136a7.html); [dev.to SSE](https://dev.to/sadiul_hakim/server-sent-event-133o) (secondary blogs)
- STOMP over WebSocket gives topic subscriptions and bidirectional messaging on one connection, which suits dashboards with many independent widgets. Reconnection and proxy handling (SockJS fallback) are the developer's job. — [OneUptime blog, Jan 2026](https://oneuptime.com/blog/post/2026-01-25-real-time-apps-websocket-stomp-spring/markdown); [DZone live dashboard with Kafka + Spring WebSocket](https://dzone.com/articles/live-dashboard-using-apache-kafka-and-spring-webso)
- **iOS web push:** requires iOS/iPadOS 16.4+, and the PWA must be **added to the home screen** (standalone mode) with a valid `manifest.json`. The permission prompt must come from a user tap. Chrome and Firefox on iOS do not support it. — [Base Web push docs](https://baseweb.readthedocs.io/en/latest/push-notifications.html); [OneSignal web push for iOS](https://documentation.onesignal.com/docs/en/web-push-for-ios)
- Service workers should wrap the notification display in `event.waitUntil()`. Developers report subscription expiry and delivery issues on iOS; these are anecdotal forum reports. — [Apple Developer Forums thread](https://origin-devforums.apple.com/forums/thread/728796)
- One guide claims PWA push does not work in the EU after Apple's iOS 17.4 changes. This is unverified against Apple docs. — [MagicBell PWA iOS guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- FCM, or any VAPID-based push service, is the server-side component for PWA push. — [Base Web push docs](https://baseweb.readthedocs.io/en/latest/push-notifications.html); [Pretius: PWA push via FCM](https://pretius.com/?p=15673)

### Inferences
- **Demo choreography:** split screen with the dispatcher's board on the laptop and the technician PWA on a phone. (1) The IoT fault is injected. (2) A card appears on the board with no refresh. (3) The dispatcher clicks "recommended technician". (4) The phone buzzes with a push notification. (5) The technician taps "Accept" and the board card turns from red to amber live. (6) The technician closes the job with a photo stored in MinIO, and the KPI tiles update. This one flow touches IoT, AI, real-time, mobile, maps and analytics.
- Use **Android Chrome** for the push demo, to avoid iOS home-screen and EU caveats. Web Push with VAPID through the `web-push` Java library (nl.martijndwars) works without Firebase at all. Verify that the library is maintained; it is FCM-agnostic.
- Scale note for slides: the STOMP simple in-memory broker is single-node. Production would switch to the STOMP broker relay against RabbitMQ, or Redis pub/sub, so multiple app instances can fan out (general Spring knowledge).

### Gaps
- I did not fetch the official Spring Framework WebSocket/STOMP reference or the Firebase JS SDK docs. Exact FCM web-setup steps (VAPID key in the Firebase console, `firebase-messaging-sw.js`) should be checked against firebase.google.com.

---

## 5. Maps: Leaflet + OpenStreetMap vs Google Maps; plotting sites and technicians; nearest-technician (PostGIS vs haversine)

### Takeaway
Use **Leaflet + OSM tiles**. It is free, needs no API key or billing account, and is fine at demo scale under the OSM tile policy. **Watch the react-leaflet/React version pairing:** react-leaflet 5 needs React 19 and react-leaflet 4 needs React 18, so with **React 17** the team should use vanilla Leaflet in a `useEffect` (or react-leaflet 3.x). For "nearest technician", use **PostGIS KNN (`<->` with geography)** if the Postgres image can be swapped for `postgis/postgis`. Otherwise a haversine SQL expression over a few hundred technicians is fine.

### Cited Findings
- react-leaflet **5.0.0 (Dec 2024)** has peer dependencies `leaflet ^1.9.0`, `react ^19`, `react-dom ^19`. For React 18 or earlier, the guidance is to use react-leaflet 4.x. 4.0.0 required React 18 and Leaflet 1.8. — [tessl npm registry: react-leaflet](https://tessl.io/registry/tessl/npm-react-leaflet); [react-leaflet UPGRADING.md](https://github.com/jonahss/react-leaflet/blob/HEAD/UPGRADING.md)
- The OSM Foundation's tile servers are donation-funded. Heavy use "adversely affects people's ability to edit the map" and is considered abuse. There is no fixed numeric threshold. Distributing an app that uses openstreetmap.org tiles at scale has historically needed permission, and busy apps should use a commercial or self-hosted tile provider. — [OSMF vector tile usage policy](https://operations.osmfoundation.org/policies/vector/); [OSM help: tile server usage](https://help.openstreetmap.org/questions/10153/tile-map-server-usage); [Leaflet Tips and Tricks](https://leanpub.com/read/leaflet-tips-and-tricks/leanpub-auto-tile-servers-that-can-be-used-with-leaflet)
- **PostGIS `<->`** supports geography. Since PostGIS 2.2.0 it does true KNN for geometry and geography, with spherical distance for geography. The GiST index is used only when `<->` is in `ORDER BY` and one argument is a constant. — [PostGIS 3.7 manual: geometry_distance_knn](https://postgis.net/docs/manual-3.7/es/geometry_distance_knn.html)
- A common pattern is `ORDER BY loc <-> point LIMIT k`, plus `ST_Distance(geography)` for meter values. `ST_DWithin` can be faster when the search radius is small. A practical combination is an `ST_DWithin` radius filter followed by `<->` ordering. — [Packt: improving proximity filtering with KNN](https://www.packtpub.com/en-IN/learning/how-to-tutorials/improving-proximity-filtering-knn); [skills.cat postgis-nearest](https://skills.cat/skills/mmbmf1/geospatial-skills/postgis-nearest)

### Inferences
- **Example query:** `SELECT id, name, ST_Distance(loc, ST_MakePoint(:lng,:lat)::geography) AS m FROM technician WHERE available ORDER BY loc <-> ST_MakePoint(:lng,:lat)::geography LIMIT 5;` with a GiST index on `loc`. Hibernate 6 supports PostGIS through `hibernate-spatial`, but a native query is quicker to write.
- **Migration cost:** switching the Compose image from `postgres:16` to `postgis/postgis:16-3.4` (or similar) keeps existing data, after which you run `CREATE EXTENSION postgis;`. The haversine fallback is about 5 lines of SQL and needs no extension. Either works for a demo; PostGIS is the more credible "scale" story.
- **Map features judges should see:** site and asset markers coloured by health (green, amber, red from IoT/ML), technician markers moving live over STOMP (the simulator can move them too), a line from a selected job to its recommended technician, and optionally marker clustering. Google Maps adds billing setup and API-key restrictions for no demo benefit. Mention "swap the tile provider (MapTiler, Stadia, self-hosted)" as the production path.
- Routing or ETA: OSRM's public demo server exists but has usage limits, so it is optional. Straight-line distance with an "ETA ≈ distance/30 km/h" estimate is acceptable for a hackathon. This is unsourced; verify OSRM demo terms if used.

### Gaps
- I could not load the current OSMF **raster** tile policy page (only the vector policy and older discussions). Re-read it for attribution requirements: the "© OpenStreetMap contributors" credit is required.
- react-leaflet 3.x's compatibility with React 17 was not confirmed from a fetched source.

---

## 6. Analytics: KPIs (MTTR, MTBF, SLA compliance, first-time fix, utilization); embed Metabase/Superset/Grafana vs in-app charts

### Takeaway
Build the **5–6 headline KPIs in-app** (SQL views + a REST endpoint + MUI/Recharts or Chart.js tiles), because judges trust numbers that live inside the product. Optionally add **one embedded Metabase dashboard** (static/signed embedding, available in open source with a "Powered by Metabase" banner) or **Grafana** for IoT time series, as proof of "pluggable BI". Seed history from the Azure PdM maintenance and failure tables so the KPIs are not empty.

### Cited Findings
- **Metabase static (signed) embedding** is available in the open-source edition. It works as an iframe whose URL carries a JWT signed with the Metabase embedding secret. Locked parameters restrict data, for example per tenant. Interactive filter changes need server-side re-signing. Static embeds lack data sandboxing, drill-through and per-user analytics. OSS embeds show a "Powered by Metabase" banner, which only paid plans remove. Regenerating the secret breaks all existing embeds. — [Metabase docs: static embedding](https://metabase.com/docs/latest/embedding/static-embedding)
- AWS's predictive-maintenance guidance uses **Amazon Managed Grafana** dashboards over Athena-queried data. Grafana is the reference-architecture choice for telemetry visualization. — [AWS Guidance: PdM with Monitron](https://docs.aws.amazon.com/solutions/predictive-maintenance-with-amazon-monitron/)
- The Azure PdM dataset's maintenance and failure tables distinguish scheduled (proactive) from breakdown (reactive) replacements. That split directly supports a "planned vs reactive maintenance ratio" KPI. — [H1st tutorial](https://h1st.readthedocs.io/en/latest/tutorials/examples/oracle-iot.html)

### Inferences
- **KPI definitions** (standard maintenance-engineering definitions; no single fetched source):
  - MTTR = Σ(repair completion − repair start) / number of corrective repairs.
  - MTBF = total operating time / number of failures (per asset or asset class).
  - Availability ≈ MTBF / (MTBF + MTTR).
  - SLA compliance % = work orders closed (or responded to) within SLA target / total work orders.
  - First-time fix rate = work orders resolved on the first visit, with no reopen or follow-up within N days / total closed.
  - Technician utilization = wrench time (sum of logged labor on work orders) / available shift hours.
  - Planned-maintenance percentage = PM work orders / all work orders (healthy target often cited around 80%; unverified).
  - Backlog (open work orders by age) and **"predicted failures avoided"**, meaning auto-created work orders from IoT/ML that were closed before failure. The last one is the story KPI for this platform.
- Implement them as Postgres views or materialized views refreshed on a schedule. This keeps the analytics module decoupled and also lets Metabase or Grafana read the same views (one source of truth).
- **Memory budget:** Metabase is a JVM app (often about 1–2 GB), and Superset needs several containers. On 8 GB laptops, run Metabase only for the demo profile (`docker compose --profile bi up`), or skip it. Grafana is lighter (around 100–200 MB) and has a native Postgres datasource for the telemetry table. This is engineering judgment, not sourced.

### Gaps
- No authoritative source (for example SMRP best-practice metrics) was fetched for KPI definitions. If judges ask, cite SMRP or EN 15341 after verification.
- Superset's embedding (embedded SDK + guest tokens) was not researched in this pass.

---

## 7. Blockchain: realistic uses in maintenance and a lightweight demonstrable version — what's overkill

### Takeaway
The honest, defensible use is **tamper-evidence of service history** (who did what, when, which parts). It needs **no smart contracts and no tokens**. Build a **hash-chained audit ledger** in Postgres, where each work-order event stores `SHA-256(prev_hash || canonical_json(event))`, plus a "Verify chain" button. Then optionally **anchor the daily head hash** publicly, either with **OpenTimestamps** (free, Bitcoin-anchored, no wallet) or by sending one transaction to **Polygon Amoy / Ethereum Sepolia** testnet. A permissioned chain (Hyperledger Fabric) or NFT parts tokens are overkill for a hackathon and arguably for most single-operator CMMS deployments.

### Cited Findings
- **OpenTimestamps:** a file or hash is computed locally, sent to free public calendar servers that aggregate many hashes into a Merkle tree, and the root is committed to Bitcoin. The user gets a portable `.ots` proof that anyone can verify against Bitcoin block headers. A proof is final only after Bitcoin confirmation, which needs an "upgrade" step. — [dev.to: proving a prediction with OpenTimestamps](https://dev.to/neuportal/how-to-prove-a-prediction-was-made-before-the-event-with-opentimestamps-4p5d); [IETF draft-fassbender-scitt-time-anchor-07 (Sep 2026)](https://datatracker.ietf.org/doc/html/draft-fassbender-scitt-time-anchor-07)
- The IETF SCITT draft says such anchors are independently verifiable by anyone with validated Bitcoin chain data, without contacting the anchoring service. Verifiers must recompute the hash themselves rather than trust a claimed hash field. It is an Internet-Draft (work in progress), not a standard. — [IETF draft-fassbender-scitt-time-anchor-03](https://www.ietf.org/archive/id/draft-fassbender-scitt-time-anchor-03.html)
- A timestamp anchor proves that a hash existed by a certain time. It **does not prove the content is accurate or who wrote it**. — [dev.to OpenTimestamps article](https://dev.to/neuportal/how-to-prove-a-prediction-was-made-before-the-event-with-opentimestamps-4p5d)
- **Deprecated testnets:** Polygon **Mumbai was deprecated on 13 April 2024**, and **Amoy** (anchored to Sepolia) replaced it. Goerli, which Mumbai was based on, is deprecated. Alchemy runs an Amoy faucet that has historically dripped a small daily amount of test POL/MATIC. — [Alchemy: Mumbai deprecation](https://www.alchemy.com/blog/polygon-mumbai-testnet-deprecation.md); [OpenSea changelog: Amoy](https://docs.opensea.io/changelog/polygon-amoy-testnet); [Circle: Amoy support](https://www.circle.com/es/blog/upcoming-support-for-polygon-pos-amoy-testnet)

### Inferences
- **Recommended MVP (about 1 day):**
  1. Add a `ledger_entry` table: `(seq, entity_type, entity_id, event_type, payload_json, prev_hash, hash, created_at, actor)`. Write to it from the domain-event listener for WorkOrderCreated, StatusChanged, PartUsed and WorkOrderClosed.
  2. Add `GET /api/ledger/verify`, which recomputes the chain and returns OK, or "broken at seq N". **Demo moment:** run a manual `UPDATE` in psql to tamper with a closed work order's cost, click "Verify", and the UI highlights the broken link in red.
  3. Optional anchor: a nightly job (or a demo button) stamps the head hash. Either run the `ots` CLI or Python `opentimestamps-client` in the AI sidecar, which needs no keys or funds, or send a 0-value Amoy/Sepolia transaction with the hash in `data` using web3j or ethers. Show the transaction on a block explorer (Amoy PolygonScan / Sepolia Etherscan).
- **Parts provenance** (supplier → serial → install → removal) is a legitimate multi-party use case, but it needs supplier participation. Pitch it as the "future multi-party extension" via the same `LedgerAnchor` SPI. Do not build it.
- **Honesty point for judges:** in a single-operator system a database with a hash chain plus a periodic public anchor gives most of the tamper-evidence value at near-zero cost. A full blockchain adds value mainly when several mutually distrusting parties (OEM, contractor, regulator, insurer) must share one record. Saying this explicitly reads as maturity, not as a weakness.
- Risk: faucets for Amoy and Sepolia often require a mainnet balance or account and change their rules frequently. OpenTimestamps avoids this dependency, so prefer it for a reliable live demo.

### Gaps
- The current Amoy or Sepolia faucet requirements in Oct 2026 were not verified. Check them days before the event.
- I did not verify the current maintenance status of the OpenTimestamps Java/Python clients or the public calendar servers.

---

## 8. Mobile: PWA vs React Native/Flutter on the same REST API; offline-first field apps

### Takeaway
Ship a **PWA**: a mobile-optimized route of the same React app (or a small separate Vite app) with a manifest, a service worker (Workbox), IndexedDB for offline queueing, camera upload to MinIO via presigned URL, and Web Push. It reuses the existing REST API and auth with zero app-store friction, and it can be demoed on any phone through the nginx URL. React Native or Flutter only make sense if the team already knows them, and the brief explicitly makes mobile an *extension*, not the core.

### Cited Findings
- Installed PWAs support web push on iOS 16.4+ (home-screen install, valid manifest, user-gesture permission) and on Android Chrome. This removes the classic "PWAs can't notify" objection. — [Base Web push docs](https://baseweb.readthedocs.io/en/latest/push-notifications.html); [OneSignal iOS web push](https://documentation.onesignal.com/docs/en/web-push-for-ios)
- PWAs remain restricted on iOS (push only when installed; EU caveats reported after iOS 17.4). — [MagicBell PWA iOS limitations](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- Context: the repository's recent commit history includes "Remove mobile app" (commit 58502dce in this repo's git log), so a previous native mobile app was dropped. This is from the local repo, not a web source.

### Inferences
- **Offline-first MVP:** (1) Cache the app shell and today's assigned work orders, using Workbox `StaleWhileRevalidate` for `GET /api/workorders?assignee=me`. (2) Queue status updates, notes and checklists in IndexedDB when offline, then replay them on reconnect with Workbox Background Sync or a manual "sync now". Use last-write-wins plus server timestamps, and flag conflicts. (3) Show an "Offline — 3 changes pending" badge. **Demo:** put the phone in airplane mode, complete a checklist, turn the network back on, and the dispatcher board updates live.
- Field-tech features that look strong: QR or barcode scan of the asset tag (browser `BarcodeDetector` or a JS library) to open its history, photo capture, geolocation check-in at the site (feeds the technician map), and speech-to-text into the Gemini NL work order (Web Speech API, Chrome).
- HTTPS is required for service workers, camera and geolocation on a phone. For a LAN demo, use a tunnel (Cloudflare Tunnel or ngrok) or mkcert certificates on nginx. This is a common gotcha.
- The CRA/React 17 toolchain can add a service worker via `workbox-webpack-plugin` (CRA's `cra-template-pwa`). Note that Create React App itself is deprecated (as of early 2025, from memory; not verified in this pass).

### Gaps
- Workbox and Background Sync browser-support specifics (Safari lacks Background Sync, from memory) were not verified with a fetched source.
- No 2024–2026 source comparing PWA vs React Native vs Flutter for field service was fetched.

---

## 9. Cloud: containerization, Kubernetes, managed Postgres/object storage, horizontal scaling, 12-factor config

### Takeaway
For the hackathon, **Docker Compose is the deployment**. Show cloud-readiness rather than cloud deployment: 12-factor environment config, stateless app containers (sessions in JWT, files in MinIO, which is S3-API compatible and so swaps for AWS S3, GCS interop or Azure via gateway), health and readiness endpoints (Spring Actuator), and Compose **profiles** so 8 GB laptops run only what is needed. Add a short Kubernetes manifest or Helm chart, or a one-slide "cloud deployment view", rather than running k8s locally.

### Cited Findings
- Reference architectures for IoT PdM land raw telemetry in object storage (S3) as a data lake for analytics and model training (Firehose → S3, Glue/Athena). An S3-compatible store such as the team's MinIO maps cleanly onto this. — [AWS Guidance: Monitron + Treon](https://aws.amazon.com/solutions/guidance/integrating-amazon-monitron-with-treon-connect-on-aws/); [AWS architecture diagram: industrial data lake for PdM](https://docs.aws.amazon.com/architecture-diagrams/latest/industrial-data-lake-for-predictive-maintenance-using-amazon-monitron-and-amazon-kinesis/industrial-data-lake-for-predictive-maintenance-using-amazon-monitron-and-amazon-kinesis.html)
- Managed cloud ML services for PdM can be retired (Lookout for Equipment ends 7 Oct 2026; Monitron closed to new customers 31 Oct 2024). This supports a **portable, container-based** ML service over vendor-locked managed ML. — [AWS Lookout for Equipment](https://aws.amazon.com/lookout-for-equipment); [AWS ML blog](https://aws.amazon.com/blogs/machine-learning/maintain-access-and-consider-alternatives-for-amazon-monitron)

### Inferences
- **Cloud deployment view (text diagram):**
  ```
  Internet -> Cloud LB / Ingress (TLS) -> nginx/ingress
      -> app Deployment (N replicas, HPA on CPU)  -- stateless, config via env/Secrets
      -> ai-service Deployment (FastAPI, scale independently)
      -> MQTT broker (EMQX cluster or managed IoT Core / Azure IoT Hub / HiveMQ Cloud)
  Data: Managed PostgreSQL (+PostGIS, pgvector) | S3/Blob (MinIO in dev) | Redis/RabbitMQ for STOMP relay when N>1
  Ops: Actuator /health -> k8s probes; Micrometer -> Prometheus/Grafana; logs to stdout
  ```
- **What must change before horizontal scaling** (state these honestly): (1) the STOMP simple broker becomes a broker relay (RabbitMQ) or Redis fan-out; (2) `@Scheduled` jobs need a leader lock such as ShedLock so they don't run N times; (3) the event registry or outbox must avoid double processing (the Modulith 2.1 Namastack outbox targets exactly this multi-instance ordering, per the Spring blog cited in section 1); (4) local file storage must not be used (MinIO already solves this).
- **8 GB laptop budget** (rough estimates, not sourced): Postgres about 200 MB, MinIO about 150 MB, Spring Boot about 500–800 MB (cap with `-Xmx512m`), nginx about 10 MB, Mosquitto under 10 MB, FastAPI about 200 MB, React dev server about 500 MB (or serve a build). Docker Desktop's WSL2 VM overhead is significant. Set a `.wslconfig` memory cap (about 4–5 GB) and keep Metabase or Grafana behind an optional profile.

### Gaps
- No fetched source on Spring Boot 3.5 container memory tuning or Docker Desktop WSL2 memory on 8 GB machines. The figures above are estimates the team should measure with `docker stats`.

---

## 10. Security and multi-tenancy considerations relevant to judges (RBAC, JWT, audit)

### Takeaway
Judges look for **role-based access**, **tenant isolation**, **secured machine-to-machine channels** and **auditability**. The existing API keys, JWT and the new hash-chained ledger cover most of this. Add MQTT authentication with per-device credentials, HMAC-signed webhooks, and scoped API keys.

### Cited Findings
- Mosquitto 2.0 deliberately made anonymous access off by default. Production should use `password_file` and `acl_file`, for example per-device topic ACLs. — [Eclipse Mosquitto 2.0 release review](https://projects.eclipse.org/node/20872); [DataCamp Mosquitto Docker](https://www.datacamp.com/ja/tutorial/mosquitto-docker)
- Metabase signed embeds use **locked parameters** (signed into the JWT) to restrict each viewer to their own data, for example a tenant ID. Tenant scoping for embedded BI therefore has to be enforced by the host app's signing. — [Metabase static embedding docs](https://metabase.com/docs/latest/embedding/static-embedding)
- `EventSource` (SSE) cannot send an `Authorization` header, which matters if SSE is chosen for authenticated streams. — [besthub.dev SSE vs WebSocket](https://www.besthub.dev/articles/springboot-sse-vs-websocket-complete-guide-to-server-sent-events-for-unidirectional-push-60496cd8fe28)
- Hash anchors prove existence-at-time, not authorship. Pair the ledger with authenticated actor IDs. — [dev.to OpenTimestamps](https://dev.to/neuportal/how-to-prove-a-prediction-was-made-before-the-event-with-opentimestamps-4p5d)

### Inferences
- **Checklist to show on one slide:**
  - RBAC roles Admin, Dispatcher, Technician, Requester, Viewer, enforced with `@PreAuthorize` and reflected in the UI (the technician PWA sees only assigned jobs).
  - JWT for users. Scoped API keys (read-only vs write; per integration) for third parties and the AI service.
  - Multi-tenancy: a `company_id`/`tenant_id` on every row, enforced through a Hibernate filter or Postgres row-level security. Mention RLS as hardening.
  - Webhooks signed with HMAC-SHA256 (`X-Signature` header) and with retries. MQTT uses per-device credentials and ACL `plant/{tenant}/...`.
  - Secrets come from env or Docker secrets, never committed (12-factor).
  - Audit: the hash-chained ledger plus "who changed what" history on work orders.
  - Rate limiting on public endpoints at nginx (`limit_req`).
  - LLM safety: never let the chatbot execute writes without a user confirmation step. Scope RAG retrieval by tenant.
- STOMP auth: validate the JWT in a `ChannelInterceptor` on `CONNECT`, and authorize `SUBSCRIBE` destinations per tenant. This is standard Spring practice; verify against the existing code.

### Gaps
- I did not fetch the Spring Security or OWASP API Security Top 10 (2023) sources in this pass. Cite them directly if the report needs authoritative security references.

---

### Cross-cutting summary: per-area MVP and "what judges see" (synthesized from sections above)

| Area | MVP build (days) | What judges see live |
|---|---|---|
| Extensibility core | Domain events + Modulith registry (or hand-rolled outbox) + SPI interfaces; existing REST/OpenAPI/webhooks | Architecture slide; Swagger UI; webhook fired to webhook.site on work-order creation |
| IoT | Mosquitto container + Python simulator + Spring Integration MQTT + rule → auto work order (1.5 d) | Run `--inject-fault`; chart spikes; work order appears automatically |
| AI/ML | FastAPI sidecar with RUL/anomaly model (C-MAPSS or Azure PdM); Gemini NL→work-order JSON; RAG over manuals with pgvector (2 d) | RUL gauge/risk score on asset; typed sentence becomes structured work order; manual Q&A with page citations |
| Real-time | Extend STOMP topics to dispatch board and telemetry; Web Push (0.5–1 d) | Board updates without refresh; phone buzzes |
| Maps | Leaflet+OSM (vanilla Leaflet with React 17); PostGIS KNN or haversine (1 d) | Health-coloured asset markers, moving technicians, "nearest 3 technicians" line |
| Analytics | SQL views for MTTR, MTBF, SLA %, FTF %, utilization, predicted-failures-avoided; optional Metabase/Grafana embed (1 d) | KPI tiles change after closing a job; trend charts |
| Blockchain | Hash-chained ledger + verify endpoint; optional OpenTimestamps or Amoy anchor (1 d) | Tamper a row in psql, "Verify" goes red; explorer link for the anchor |
| Mobile | PWA with offline queue, camera, QR, push (1.5 d) | Airplane-mode completion that syncs on reconnect |
| Cloud | Compose profiles, Actuator health, env config, k8s manifests/diagram (0.5 d) | `docker compose up` from scratch; deployment diagram |
| Security | RBAC, scoped API keys, HMAC webhooks, MQTT auth, tenant filter (0.5–1 d) | Login as technician vs dispatcher shows different views; 403 on forbidden API call |
