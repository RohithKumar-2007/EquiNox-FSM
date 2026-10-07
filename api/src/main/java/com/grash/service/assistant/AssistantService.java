package com.grash.service.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.grash.dto.WorkOrderChangeStatusDTO;
import com.grash.dto.assistant.*;
import com.grash.dto.workOrder.WorkOrderPostDTO;
import com.grash.exception.CustomException;
import com.grash.model.Asset;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.service.AssetService;
import com.grash.service.WorkOrderService;
import com.grash.service.assistant.AssistantConversation.ActionKind;
import com.grash.service.assistant.AssistantConversation.PendingAction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssistantService {

    private static final int MAX_TOOL_ROUNDS = 8;
    private static final int MAX_HISTORY_ENTRIES = 150;
    private static final Duration CONVERSATION_TTL = Duration.ofHours(2);
    private static final Pattern RECORD_TOKEN = Pattern.compile("\\[\\[(asset|work_order):(\\d+)]]");

    private static final String SYSTEM_PROMPT = """
            You are the Maintenance Assistant inside Equinox CMMS, a maintenance management web app. You help \
            users find assets, check maintenance work and prepare work orders.

            How to work:
            - Look things up with the functions. Never invent assets, work orders, dates or IDs. If a lookup \
            finds nothing, say so.
            - Each user message starts with a [Context] block with today's date and, when there is one, the \
            record the user has open. When the user says "this", "it" or asks without naming a record, they \
            mean the open record.
            - "Last serviced" means the most recent completed work order for the asset.
            - To show an asset or work order, write its token on its own line: [[asset:ID]] or \
            [[work_order:ID]], using only IDs returned by the functions. The app turns each token into a \
            clickable card, so don't repeat all of the record's details in your text.
            - You cannot save or change anything yourself. To create a work order, call draft_work_order; to \
            change a status, call draft_work_order_status_change. The app then shows the user a preview with \
            a Confirm button, and nothing is saved until they click it. Ask the user to review and confirm. \
            Never say a record was created or changed unless the [Context] block says the user confirmed it.
            - A work order needs at least a title. Ask for missing details only when you can't reasonably \
            infer them. Use the open asset when the request is about it.
            - Keep answers short and practical, in plain text. For lists, use short lines starting with "- ". \
            Don't use markdown headings, tables or bold text.
            """;

    private final GeminiClient geminiClient;
    private final AssistantTools assistantTools;
    private final AssetService assetService;
    private final WorkOrderService workOrderService;
    private final ObjectMapper objectMapper;

    private final Map<String, AssistantConversation> conversations = new ConcurrentHashMap<>();

    public Map<String, Object> status() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("enabled", geminiClient.isEnabled());
        status.put("model", geminiClient.getModel());
        return status;
    }

    public AssistantChatResponse chat(AssistantChatRequest request, User user) {
        if (!geminiClient.isEnabled())
            throw new CustomException("The assistant is not set up. Add GEMINI_API_KEY to the server " +
                    "configuration.", HttpStatus.SERVICE_UNAVAILABLE);
        AssistantConversation conversation = getOrCreateConversation(request.getConversationId(), user);
        synchronized (conversation) {
            conversation.setLastUsed(Instant.now());
            if (conversation.getContents().size() > MAX_HISTORY_ENTRIES)
                throw new CustomException("This conversation is too long. Start a new chat.",
                        HttpStatus.BAD_REQUEST);
            int checkpoint = conversation.getContents().size();
            List<PendingAction> createdActions = new ArrayList<>();
            try {
                conversation.getContents().add(userText(buildUserMessage(request, user, conversation)));
                String reply = runModel(conversation, user, createdActions);
                conversation.getNotes().clear();
                return buildResponse(conversation, reply, createdActions, user);
            } catch (RuntimeException e) {
                // Roll back this turn so the history stays valid for the next message.
                truncate(conversation.getContents(), checkpoint);
                createdActions.forEach(action -> conversation.getPendingActions().remove(action.getId()));
                throw e;
            }
        }
    }

    public AssistantActionResult confirm(String actionId, AssistantActionRequest request, User user) {
        AssistantConversation conversation = getOwnedConversation(request.getConversationId(), user);
        synchronized (conversation) {
            PendingAction action = conversation.getPendingActions().get(actionId);
            if (action == null)
                throw new CustomException("This draft is no longer available.", HttpStatus.NOT_FOUND);
            AssistantActionResult result;
            if (action.getKind() == ActionKind.CREATE_WORK_ORDER) {
                WorkOrderPostDTO workOrder = new WorkOrderPostDTO();
                workOrder.setTitle(action.getTitle());
                workOrder.setDescription(action.getDescription());
                workOrder.setPriority(action.getPriority());
                workOrder.setDueDate(action.getDueDate());
                if (action.getAssetId() != null) {
                    Asset asset = assetService.checkAccessToAssetId(action.getAssetId(), user);
                    workOrder.setAsset(asset);
                    workOrder.setLocation(asset.getLocation());
                }
                WorkOrder created = workOrderService.createByUser(workOrder, user);
                AssistantRecord record = assistantTools.workOrderRecord(created);
                conversation.addRecord(record);
                conversation.getNotes().add("The user confirmed the draft; work order " + created.getCustomId()
                        + " (id " + created.getId() + ") \"" + created.getTitle() + "\" was created.");
                result = new AssistantActionResult("Work order " + created.getCustomId() + " created.", record);
            } else {
                workOrderService.checkAccessToWorkOrderId(action.getWorkOrderId(), user);
                WorkOrderChangeStatusDTO change = new WorkOrderChangeStatusDTO();
                change.setStatus(action.getStatus());
                change.setFeedback(action.getFeedback());
                WorkOrder updated = workOrderService.changeStatus(change, action.getWorkOrderId(), user, null);
                AssistantRecord record = assistantTools.workOrderRecord(updated);
                conversation.addRecord(record);
                conversation.getNotes().add("The user confirmed the draft; work order " + updated.getCustomId()
                        + " (id " + updated.getId() + ") is now " + updated.getStatus().name() + ".");
                result = new AssistantActionResult("Work order " + updated.getCustomId() + " updated.", record);
            }
            conversation.getPendingActions().remove(actionId);
            return result;
        }
    }

    public void cancel(String actionId, AssistantActionRequest request, User user) {
        AssistantConversation conversation = getOwnedConversation(request.getConversationId(), user);
        synchronized (conversation) {
            if (conversation.getPendingActions().remove(actionId) != null)
                conversation.getNotes().add("The user cancelled the last draft; nothing was saved.");
        }
    }

    private String runModel(AssistantConversation conversation, User user, List<PendingAction> createdActions) {
        ArrayNode functionDeclarations = assistantTools.declarations();
        for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
            JsonNode response = geminiClient.generateContent(requestBody(conversation, functionDeclarations));
            if (response == null)
                throw new CustomException("Gemini returned an empty response.", HttpStatus.BAD_GATEWAY);
            if (response.path("promptFeedback").hasNonNull("blockReason"))
                throw new CustomException("Gemini declined this request. Try rephrasing it.",
                        HttpStatus.UNPROCESSABLE_ENTITY);
            JsonNode candidate = response.path("candidates").path(0);
            JsonNode content = candidate.path("content");
            JsonNode parts = content.path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                String finishReason = candidate.path("finishReason").asText("");
                log.warn("Gemini returned no content, finishReason={}", finishReason);
                throw new CustomException("Gemini couldn't answer this request. Try rephrasing it.",
                        HttpStatus.BAD_GATEWAY);
            }
            // Keep the model's turn exactly as returned: it can carry thought signatures that Gemini needs
            // back unchanged on the next call.
            ObjectNode modelContent = content.deepCopy();
            if (!modelContent.hasNonNull("role")) modelContent.put("role", "model");
            conversation.getContents().add(modelContent);

            List<JsonNode> functionCalls = new ArrayList<>();
            StringBuilder text = new StringBuilder();
            for (JsonNode part : parts) {
                if (part.has("functionCall")) functionCalls.add(part.get("functionCall"));
                else if (part.has("text") && !part.path("thought").asBoolean(false))
                    text.append(part.get("text").asText());
            }
            if (functionCalls.isEmpty()) return text.toString().trim();

            ArrayNode responseParts = objectMapper.createArrayNode();
            for (JsonNode call : functionCalls) {
                String name = call.path("name").asText();
                Map<String, Object> result = assistantTools.execute(name, call.path("args"), user, conversation,
                        createdActions);
                ObjectNode functionResponse = responseParts.addObject().putObject("functionResponse");
                functionResponse.put("name", name);
                if (call.hasNonNull("id")) functionResponse.set("id", call.get("id"));
                functionResponse.set("response", objectMapper.valueToTree(result));
            }
            ObjectNode functionTurn = objectMapper.createObjectNode();
            functionTurn.put("role", "user");
            functionTurn.set("parts", responseParts);
            conversation.getContents().add(functionTurn);
        }
        throw new CustomException("The assistant needed too many steps for this request. Try asking something " +
                "more specific.", HttpStatus.UNPROCESSABLE_ENTITY);
    }

    private ObjectNode requestBody(AssistantConversation conversation, ArrayNode functionDeclarations) {
        ObjectNode body = objectMapper.createObjectNode();
        body.putObject("systemInstruction").putArray("parts").addObject().put("text", SYSTEM_PROMPT);
        ArrayNode contents = body.putArray("contents");
        conversation.getContents().forEach(contents::add);
        body.putArray("tools").addObject().set("functionDeclarations", functionDeclarations);
        body.putObject("generationConfig").put("maxOutputTokens", 8192);
        return body;
    }

    private String buildUserMessage(AssistantChatRequest request, User user, AssistantConversation conversation) {
        StringBuilder context = new StringBuilder("[Context]\n");
        context.append("Today's date: ").append(AssistantTools.formatDate(new Date())).append('\n');
        context.append("User: ").append(user.getFullName()).append('\n');
        AssistantPageContext page = request.getContext();
        if (page != null && page.getId() != null && page.getType() != null) {
            try {
                if ("asset".equals(page.getType())) {
                    Asset asset = assetService.checkAccessToAssetId(page.getId(), user);
                    conversation.addRecord(assistantTools.assetRecord(asset));
                    context.append("Open record: asset id ").append(asset.getId()).append(" \"")
                            .append(asset.getName()).append('"');
                    if (asset.getCustomId() != null) context.append(" (").append(asset.getCustomId()).append(')');
                    context.append('\n');
                } else if ("work_order".equals(page.getType())) {
                    WorkOrder wo = workOrderService.checkAccessToWorkOrderId(page.getId(), user);
                    conversation.addRecord(assistantTools.workOrderRecord(wo));
                    context.append("Open record: work order id ").append(wo.getId()).append(" \"")
                            .append(wo.getTitle()).append('"');
                    if (wo.getCustomId() != null) context.append(" (").append(wo.getCustomId()).append(')');
                    context.append('\n');
                }
            } catch (CustomException e) {
                // The user can't see the record (or it was deleted); answer without it.
            }
        }
        conversation.getNotes().forEach(note -> context.append("Update: ").append(note).append('\n'));
        context.append("[/Context]\n\n").append(request.getMessage().trim());
        return context.toString();
    }

    private AssistantChatResponse buildResponse(AssistantConversation conversation, String reply,
                                                List<PendingAction> createdActions, User user) {
        Map<String, AssistantRecord> records = new LinkedHashMap<>();
        StringBuilder cleaned = new StringBuilder();
        Matcher matcher = RECORD_TOKEN.matcher(reply);
        while (matcher.find()) {
            String key = matcher.group(1) + ":" + matcher.group(2);
            AssistantRecord record = resolveRecord(conversation, matcher.group(1), Long.parseLong(matcher.group(2)),
                    user, key);
            if (record != null) records.putIfAbsent(key, record);
            // Drop tokens for records the user can't see, keep the rest for the frontend to render as cards.
            matcher.appendReplacement(cleaned, record == null ? "" : Matcher.quoteReplacement(matcher.group()));
        }
        matcher.appendTail(cleaned);
        String finalReply = cleaned.toString().trim();
        if (finalReply.isEmpty() && createdActions.isEmpty()) finalReply = "Sorry, I don't have an answer for that.";

        List<AssistantPendingAction> actions = createdActions.stream()
                .filter(action -> conversation.getPendingActions().containsKey(action.getId()))
                .map(action -> new AssistantPendingAction(action.getId(), action.getKind().name(),
                        action.getKind() == ActionKind.CREATE_WORK_ORDER ? "New work order" :
                                "Change work order status",
                        new LinkedHashMap<>(action.getPreviewFields())))
                .toList();
        return new AssistantChatResponse(conversation.getId(), finalReply, new ArrayList<>(records.values()),
                new ArrayList<>(actions));
    }

    private AssistantRecord resolveRecord(AssistantConversation conversation, String type, Long id, User user,
                                          String key) {
        AssistantRecord known = conversation.getRecords().get(key);
        if (known != null) return known;
        try {
            AssistantRecord record = "asset".equals(type)
                    ? assistantTools.assetRecord(assetService.checkAccessToAssetId(id, user))
                    : assistantTools.workOrderRecord(workOrderService.checkAccessToWorkOrderId(id, user));
            conversation.addRecord(record);
            return record;
        } catch (CustomException e) {
            return null;
        }
    }

    private ObjectNode userText(String text) {
        ObjectNode content = objectMapper.createObjectNode();
        content.put("role", "user");
        content.putArray("parts").addObject().put("text", text);
        return content;
    }

    private AssistantConversation getOrCreateConversation(String conversationId, User user) {
        evictExpired();
        if (conversationId != null) {
            AssistantConversation existing = conversations.get(conversationId);
            if (existing != null && existing.getUserId().equals(user.getId())) return existing;
        }
        AssistantConversation conversation = new AssistantConversation(UUID.randomUUID().toString(), user.getId());
        conversations.put(conversation.getId(), conversation);
        return conversation;
    }

    private AssistantConversation getOwnedConversation(String conversationId, User user) {
        AssistantConversation conversation = conversationId == null ? null : conversations.get(conversationId);
        if (conversation == null || !conversation.getUserId().equals(user.getId()))
            throw new CustomException("This chat has expired. Start a new chat.", HttpStatus.NOT_FOUND);
        return conversation;
    }

    private void evictExpired() {
        Instant cutoff = Instant.now().minus(CONVERSATION_TTL);
        conversations.values().removeIf(conversation -> conversation.getLastUsed().isBefore(cutoff));
    }

    private static void truncate(List<JsonNode> list, int size) {
        while (list.size() > size) list.remove(list.size() - 1);
    }
}
