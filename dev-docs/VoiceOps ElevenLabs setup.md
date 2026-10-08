# VoiceOps: ElevenLabs voice agent setup

VoiceOps lets staff report breakdowns by voice, in their own language, and lets the system phone technicians.
An ElevenLabs agent handles speech, language and conversation. **It never touches the database.** Every
action goes through six backend tools under `/voice-tools/*`. Each tool:

- validates its input,
- authenticates the request (a shared secret header, or an `x-api-key`),
- authorizes the action with the service account's normal CMMS role,
- checks that the equipment exists and is visible,
- returns `{"ok": true, "data": …}` or `{"ok": false, "error": {"code", "message"}}`,
- saves a VoiceOps event, which the **VoiceOps** page (`/app/voice-ops`) shows live over WebSocket.

The panel only shows events the backend actually saved. Each row says where it came from: an agent tool call,
the browser voice SDK, the post-call webhook, or the backend itself.

```
Phone ──Twilio──► ElevenLabs agent ──HTTPS + X-VoiceOps-Token──► /api/voice-tools/*  ──► CMMS services ──► PostgreSQL
Browser mic ─────►        │                                             │
                          │◄──── outbound call request (dispatch) ──────┤
                          └──── post-call webhook (HMAC signed) ───────►│──► STOMP /user/{email}/voiceops ──► VoiceOps panel
```

## 1. Environment variables

Set these in `.env` (they are passed through `docker-compose.yml`), then rebuild and restart the backend.

| Variable | Needed for | Value |
|---|---|---|
| `ELEVENLABS_API_KEY` | browser sessions, outbound calls | ElevenLabs API key (stays on the server) |
| `ELEVENLABS_AGENT_ID` | browser sessions, inbound hotline | The hotline agent's id |
| `ELEVENLABS_TOOL_SECRET` | tool calls | A random string of 16+ characters, e.g. `openssl rand -hex 24` |
| `ELEVENLABS_SERVICE_USER_EMAIL` | tool calls | Email of the CMMS account the agent acts as (step 2) |
| `ELEVENLABS_WEBHOOK_SECRET` | post-call webhook | The secret ElevenLabs shows when you create the webhook (step 6) |
| `ELEVENLABS_PHONE_NUMBER_ID` | outbound calls | Id of the Twilio number imported into ElevenLabs (step 7) |
| `ELEVENLABS_DISPATCH_AGENT_ID` | outbound calls (optional) | A separate agent for technician calls (step 5). Defaults to the hotline agent |
| `ELEVENLABS_AUTO_DISPATCH` | auto-dispatch (optional) | `true` to phone the on-call technician when an asset goes `DOWN` or `EMERGENCY_SHUTDOWN` |

The panel header shows which of these are configured.

## 2. Create the service account

Create a normal user in Equinox, for example `voice-agent@yourcompany.com`, with a role that can:

- view assets and work orders,
- create work orders,
- edit work orders (for `assign_technician` and `escalate_work_order`),
- view people (for technician ranking).

Put its email in `ELEVENLABS_SERVICE_USER_EMAIL`. The agent can never do more than this role allows.

## 3. Give ElevenLabs a public HTTPS URL

ElevenLabs calls your backend from the internet. Behind the bundled Nginx, the API lives under `/api/`, so the
tool base URL is `https://<your-host>/api/voice-tools/`.

For local development, expose port 80 with a tunnel, for example:

```bash
cloudflared tunnel --url http://localhost:80
# or
ngrok http 80
```

Use the HTTPS URL it prints as `<your-host>` below.

## 4. Create the hotline agent

In ElevenLabs → Agents, create an agent (keep it private; the app uses signed URLs).

- **Language:** default English. Add the languages your workforce speaks and enable the **Language detection**
  system tool so the agent switches automatically.
- **First message:** `Maintenance hotline. What's the problem, and which machine is it?`
- **Advanced → client events:** make sure `user_transcript` and `agent_response` are enabled, so the browser
  panel receives the live transcript.
- **System prompt:**

```text
You are the maintenance hotline for a manufacturing plant. Callers are operators and supervisors reporting
equipment problems, often in a noisy place and often not in English.

Language
- Always answer in the language the caller is speaking.
- On every tool call, set caller_language to the ISO 639-1 code of that language (en, es, hi, ta, fr, ...).
- Write work order titles, descriptions and escalation reasons in English.
- Put the caller's own words, in their language, in original_text.

How to handle a call
1. Find out what is wrong and which equipment it is.
2. Call find_equipment with the name, code or location words the caller used. If there are several matches,
   ask which one. If there are none, ask for the machine code or where it is.
3. Call get_equipment_status. If an open work order already covers the same problem, tell the caller and do
   not create a duplicate.
4. Ask at most three short follow-up questions to judge severity: Is it completely stopped? Is anyone at risk
   (smoke, fire, leak, injury, exposed electrics)? Is production stopped?
5. Choose severity:
   CRITICAL = safety risk, or a whole line is stopped.
   HIGH = the equipment is down or production is affected.
   MEDIUM = degraded but running.
   LOW = minor or cosmetic.
6. Call create_work_order.
7. Call assign_technician with the work_order_id. Leave technician_id empty so the system picks the best
   available technician.
8. If severity is CRITICAL, call escalate_work_order with a short reason.
9. Tell the caller the work order code, who was assigned and whether they were notified.

Rules
- Only use ids that a tool returned. Never invent ids, names or numbers.
- Never say something succeeded unless the tool returned "ok": true.
- If a tool returns "ok": false, read error.message, explain briefly, and follow its hint.
- Keep every reply to one or two short sentences. This is a phone call.
```

- **Data collection** (Analysis tab): add `caller_language` (string): "ISO 639-1 code of the language the caller
  mainly spoke".

### The six tools

Add each as a **Webhook** tool, method `POST`, URL `https://<your-host>/api/voice-tools/<path>`.

On every tool:

- **Headers:** `X-VoiceOps-Token` of type **Secret**, value = `ELEVENLABS_TOOL_SECRET`.
- **Body parameters** shared by all six:

| Name | Type | Value |
|---|---|---|
| `conversation_id` | string | Dynamic variable `system__conversation_id` (required) |
| `caller_id` | string | Dynamic variable `system__caller_id` |
| `call_sid` | string | Dynamic variable `system__call_sid` |
| `caller_language` | string | LLM prompt: "ISO 639-1 code of the language the caller is speaking" |

Tool-specific body parameters (all filled by the LLM):

| Tool name | Path | Parameters | Description to give the LLM |
|---|---|---|---|
| `find_equipment` | `find-equipment` | `query` string, required: "Equipment name, code, serial, model or location words the caller used" | Search the plant's equipment. Use before any other equipment tool. |
| `get_equipment_status` | `get-equipment-status` | `asset_id` integer, required | Current status, open and overdue work orders, last service date. |
| `get_equipment_history` | `get-equipment-history` | `asset_id` integer, required; `limit` integer 1–10 | Recent work orders on this equipment. |
| `create_work_order` | `create-work-order` | `asset_id` integer, required; `title` string, required, English; `description` string, English; `severity` string, required, enum `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`; `original_text` string, the caller's words | Create a work order for a reported problem. |
| `assign_technician` | `assign-technician` | `work_order_id` integer, required; `technician_id` integer, optional | Assign a technician. Without technician_id the best one is chosen by shift, site and workload, and notified. |
| `escalate_work_order` | `escalate-work-order` | `work_order_id` integer, required; `reason` string, required, English | Raise to HIGH priority, alert admins and phone the assigned technician. |

`system__caller_id` and `system__call_sid` only have values on phone calls. If ElevenLabs refuses a browser test
because of them, remove those two parameters; the conversation id is the one that matters.

## 5. Create the dispatch agent (outbound calls)

Outbound calls send these dynamic variables, always all of them:
`call_purpose` (`escalation`, `dispatch` or `asset_down`), `technician_name`, `equipment`, `site`,
`asset_status`, `work_order_id`, `work_order_code`, `work_order_title`, `work_order_priority`,
`escalation_reason`.

Use a second agent for these calls and put its id in `ELEVENLABS_DISPATCH_AGENT_ID`, so the hotline agent's
prompt doesn't depend on variables an inbound caller never has.

- **First message:** `Hi {{technician_name}}, this is maintenance dispatch. There is an urgent problem with {{equipment}} at {{site}}.`
- **System prompt:**

```text
You are calling a maintenance technician about urgent work.
Equipment: {{equipment}} at {{site}}. Status: {{asset_status}}.
Work order: {{work_order_code}} {{work_order_title}} (priority {{work_order_priority}}).
Reason: {{escalation_reason}}.

Read out the problem clearly and briefly. Then ask whether they can go now, and roughly how many minutes until
they arrive. Speak the technician's language if they switch. Do not promise anything else. End the call
politely once you have their answer.
```

- **Data collection:** `technician_en_route` (boolean): "True if the technician agreed to go now, false if they
  said they cannot"; `technician_eta_minutes` (integer): "Minutes until they arrive, if they said".

The panel shows the technician's answer from the post-call webhook. If neither item comes back, it says no
confirmation was captured.

## 6. Post-call webhook

ElevenLabs → Settings → Webhooks: create a webhook to `https://<your-host>/api/voice-ops/webhooks/elevenlabs`,
enable it for **transcription** and **call initiation failure**, and attach it to both agents. Copy the secret
into `ELEVENLABS_WEBHOOK_SECRET`. Requests without a valid `ElevenLabs-Signature` are rejected. Webhooks for
conversations the backend has never seen are ignored, because they can't be tied to a company.

## 7. Phone numbers (Twilio)

In ElevenLabs → Phone numbers, import your Twilio number and assign the hotline agent for inbound calls. Copy
the phone number's id into `ELEVENLABS_PHONE_NUMBER_ID`; outbound calls are placed from it.

Technicians need a phone number in their profile, in international format (`+91…`), to be called.

## 8. Run and check

```bash
docker compose -p atlas-cmms -f docker-compose.yml -f docker-compose.local.yml up -d --build --no-deps api frontend
```

Liquibase creates the `voice_call` and `voice_event` tables on start. Then:

1. Open **VoiceOps** in the sidebar. The header chips should be green for what you configured.
2. Press **Start voice session**, allow the microphone, and report a fault ("The conveyor on line 3 is jammed").
   Language, transcript, equipment, questions, severity, tool calls, work order, technician and notification
   appear as the backend records them.
3. On a call with a work order, **Call technician** places a real outbound call. A skipped or failed call is
   shown as skipped or failed, with the reason.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Tool returns 503 `not_configured` | `ELEVENLABS_TOOL_SECRET` (16+ chars) or `ELEVENLABS_SERVICE_USER_EMAIL` is missing, or that user doesn't exist |
| Tool returns 401 `unauthenticated` | The `X-VoiceOps-Token` value doesn't match, or the service account is disabled |
| Tool returns `ok: false`, `missing_conversation` | `conversation_id` isn't bound to `system__conversation_id` |
| Tool returns `ok: false`, `forbidden` | The service account's role lacks the permission |
| Webhook answers 401 | Wrong `ELEVENLABS_WEBHOOK_SECRET` |
| Panel shows no transcript for browser sessions | Enable `user_transcript` and `agent_response` client events on the agent |
| "Start voice session" is disabled | `ELEVENLABS_API_KEY` or `ELEVENLABS_AGENT_ID` is missing |
