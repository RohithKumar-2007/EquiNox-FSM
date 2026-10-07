package com.grash.service.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.grash.advancedsearch.FilterField;
import com.grash.advancedsearch.SearchCriteria;
import com.grash.dto.AssetShowDTO;
import com.grash.dto.assistant.AssistantRecord;
import com.grash.exception.CustomException;
import com.grash.model.Asset;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.enums.EnumName;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.Priority;
import com.grash.model.enums.Status;
import com.grash.service.AssetService;
import com.grash.service.WorkOrderService;
import com.grash.service.assistant.AssistantConversation.ActionKind;
import com.grash.service.assistant.AssistantConversation.PendingAction;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Functions Gemini can call. Lookups reuse the services' permission checks, so the assistant only sees
 * what the signed-in user can see. Draft functions never save anything; they create a pending action
 * the user has to confirm.
 */
@Component
@RequiredArgsConstructor
public class AssistantTools {

    private static final List<Status> OPEN_STATUSES = List.of(Status.OPEN, Status.IN_PROGRESS, Status.ON_HOLD);
    private static final int MAX_RESULTS = 10;

    private final AssetService assetService;
    private final WorkOrderService workOrderService;
    private final ObjectMapper objectMapper;

    public ArrayNode declarations() {
        ArrayNode functions = objectMapper.createArrayNode();
        functions.add(function("search_assets",
                "Find assets (equipment) by name, ID code, serial number, model or manufacturer.",
                params(Map.of("query", string("Text to search for, e.g. 'compressor' or 'AC-102'.")),
                        List.of("query"))));
        functions.add(function("get_asset",
                "Get an asset's details and maintenance history: last completed work order (last serviced), "
                        + "open and overdue work orders, and recent work orders.",
                params(Map.of("asset_id", integer("The asset ID.")), List.of("asset_id"))));
        functions.add(function("search_work_orders",
                "Find work orders. Use overdue_only=true for overdue maintenance (open work orders past "
                        + "their due date).",
                params(Map.of(
                        "query", string("Optional text to match in the title, ID code or description."),
                        "statuses", stringArray("Optional statuses to include.",
                                List.of("OPEN", "IN_PROGRESS", "ON_HOLD", "COMPLETE")),
                        "asset_id", integer("Optional: only work orders for this asset."),
                        "overdue_only", bool("Only open work orders whose due date has passed.")
                ), List.of())));
        functions.add(function("get_work_order",
                "Get a work order's full details.",
                params(Map.of("work_order_id", integer("The work order ID.")), List.of("work_order_id"))));
        functions.add(function("draft_work_order",
                "Prepare a new work order for the user to review. Nothing is saved until the user clicks "
                        + "Confirm in the app.",
                params(Map.of(
                        "title", string("Short title of the work order."),
                        "description", string("Optional details of the work to do."),
                        "priority", stringEnum("Optional priority.", List.of("NONE", "LOW", "MEDIUM", "HIGH")),
                        "asset_id", integer("Optional asset the work is for."),
                        "due_date", string("Optional due date as YYYY-MM-DD.")
                ), List.of("title"))));
        functions.add(function("draft_work_order_status_change",
                "Prepare a status change for an existing work order for the user to review. Nothing is "
                        + "saved until the user clicks Confirm in the app.",
                params(Map.of(
                        "work_order_id", integer("The work order ID."),
                        "status", stringEnum("The new status.", List.of("OPEN", "IN_PROGRESS", "ON_HOLD",
                                "COMPLETE")),
                        "feedback", string("Optional note to save with the change.")
                ), List.of("work_order_id", "status"))));
        return functions;
    }

    /**
     * Runs one function call. Errors are returned to Gemini as {"error": "..."} so it can explain them.
     */
    public Map<String, Object> execute(String name, JsonNode args, User user, AssistantConversation conversation,
                                       List<PendingAction> createdActions) {
        try {
            return switch (name) {
                case "search_assets" -> searchAssets(text(args, "query"), user, conversation);
                case "get_asset" -> getAsset(requiredLong(args, "asset_id"), user, conversation);
                case "search_work_orders" -> searchWorkOrders(args, user, conversation);
                case "get_work_order" -> getWorkOrder(requiredLong(args, "work_order_id"), user, conversation);
                case "draft_work_order" -> draftWorkOrder(args, user, conversation, createdActions);
                case "draft_work_order_status_change" ->
                        draftStatusChange(args, user, conversation, createdActions);
                default -> error("Unknown function " + name);
            };
        } catch (CustomException e) {
            return error(e.getMessage());
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }

    private Map<String, Object> searchAssets(String query, User user, AssistantConversation conversation) {
        if (query == null || query.isBlank()) throw new IllegalArgumentException("query is required");
        SearchCriteria criteria = new SearchCriteria();
        criteria.setPageSize(MAX_RESULTS);
        criteria.setSortField("name");
        criteria.setDirection(Sort.Direction.ASC);
        criteria.getFilterFields().add(eq("archived", false));
        criteria.getFilterFields().add(containsAny(query.trim(), "name", "customId", "serialNumber", "model",
                "manufacturer"));
        assetService.getSearchCriteria(user, criteria);
        Page<AssetShowDTO> page = assetService.findBySearchCriteria(criteria);

        List<Map<String, Object>> assets = new ArrayList<>();
        for (AssetShowDTO asset : page.getContent()) {
            String location = asset.getLocation() == null ? null : asset.getLocation().getName();
            conversation.addRecord(new AssistantRecord("asset", asset.getId(), asset.getName(),
                    joinNonBlank(asset.getCustomId(), location), enumName(asset.getStatus())));
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", asset.getId());
            item.put("name", asset.getName());
            item.put("code", asset.getCustomId());
            item.put("status", enumName(asset.getStatus()));
            item.put("location", location);
            item.put("category", asset.getCategory() == null ? null : asset.getCategory().getName());
            assets.add(item);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total_matches", page.getTotalElements());
        result.put("assets", assets);
        return result;
    }

    private Map<String, Object> getAsset(Long assetId, User user, AssistantConversation conversation) {
        Asset asset = assetService.checkAccessToAssetId(assetId, user);
        conversation.addRecord(assetRecord(asset));

        List<WorkOrder> workOrders = visibleWorkOrdersForAsset(assetId, user);
        Date now = new Date();
        Optional<WorkOrder> lastCompleted = workOrders.stream()
                .filter(wo -> wo.getStatus() == Status.COMPLETE && wo.getCompletedOn() != null)
                .max(Comparator.comparing(WorkOrder::getCompletedOn));
        List<WorkOrder> open = workOrders.stream()
                .filter(wo -> wo.getStatus() != Status.COMPLETE)
                .sorted(Comparator.comparing(WorkOrder::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<WorkOrder> recent = workOrders.stream()
                .sorted(Comparator.comparing(WorkOrder::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", asset.getId());
        result.put("name", asset.getName());
        result.put("code", asset.getCustomId());
        result.put("status", enumName(asset.getStatus()));
        result.put("location", asset.getLocation() == null ? null : asset.getLocation().getName());
        result.put("category", asset.getCategory() == null ? null : asset.getCategory().getName());
        result.put("description", asset.getDescription());
        result.put("model", asset.getModel());
        result.put("manufacturer", asset.getManufacturer());
        result.put("serial_number", asset.getSerialNumber());
        result.put("area", asset.getArea());
        result.put("in_service_date", formatDate(asset.getInServiceDate()));
        result.put("warranty_expiration_date", formatDate(asset.getWarrantyExpirationDate()));
        result.put("last_completed_work_order", lastCompleted.map(wo -> workOrderSummary(wo, conversation))
                .orElse(null));
        result.put("open_work_orders_count", open.size());
        result.put("overdue_work_orders_count", open.stream().filter(wo -> isOverdue(wo, now)).count());
        result.put("open_work_orders", open.stream().limit(MAX_RESULTS)
                .map(wo -> workOrderSummary(wo, conversation)).toList());
        result.put("recent_work_orders", recent.stream().map(wo -> workOrderSummary(wo, conversation)).toList());
        return result;
    }

    private Map<String, Object> searchWorkOrders(JsonNode args, User user, AssistantConversation conversation) {
        String query = text(args, "query");
        Long assetId = optionalLong(args, "asset_id");
        boolean overdueOnly = args != null && args.path("overdue_only").asBoolean(false);
        List<Status> statuses = new ArrayList<>();
        if (args != null && args.path("statuses").isArray()) {
            for (JsonNode status : args.path("statuses")) statuses.add(parseStatus(status.asText()));
        }
        if (overdueOnly) statuses = statuses.isEmpty() ? OPEN_STATUSES :
                statuses.stream().filter(OPEN_STATUSES::contains).toList();

        List<WorkOrder> workOrders;
        long total;
        if (assetId != null) {
            assetService.checkAccessToAssetId(assetId, user);
            workOrders = visibleWorkOrdersForAsset(assetId, user);
            total = workOrders.size();
        } else {
            SearchCriteria criteria = new SearchCriteria();
            // Overdue filtering happens below, so fetch enough rows sorted by due date to filter from.
            criteria.setPageSize(overdueOnly ? 100 : MAX_RESULTS);
            criteria.setSortField(overdueOnly ? "dueDate" : "id");
            criteria.setDirection(overdueOnly ? Sort.Direction.ASC : Sort.Direction.DESC);
            criteria.getFilterFields().add(eq("archived", false));
            if (!statuses.isEmpty()) criteria.getFilterFields().add(FilterField.builder()
                    .field("status").operation("in").value("").enumName(EnumName.STATUS)
                    .values(statuses.stream().map(Enum::name).collect(Collectors.toList())).build());
            if (query != null && !query.isBlank())
                criteria.getFilterFields().add(containsAny(query.trim(), "title", "customId", "description"));
            workOrderService.getSearchCriteria(user, criteria);
            Page<WorkOrder> page = workOrderService.findBySearchCriteria(criteria);
            workOrders = page.getContent();
            total = page.getTotalElements();
        }

        Date now = new Date();
        final List<Status> statusFilter = statuses;
        String loweredQuery = query == null ? null : query.trim().toLowerCase();
        List<WorkOrder> filtered = workOrders.stream()
                .filter(wo -> statusFilter.isEmpty() || statusFilter.contains(wo.getStatus()))
                .filter(wo -> !overdueOnly || isOverdue(wo, now))
                .filter(wo -> assetId == null || loweredQuery == null || loweredQuery.isEmpty()
                        || containsIgnoreCase(wo.getTitle(), loweredQuery)
                        || containsIgnoreCase(wo.getCustomId(), loweredQuery)
                        || containsIgnoreCase(wo.getDescription(), loweredQuery))
                .toList();
        if (overdueOnly || assetId != null) total = filtered.size();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total_matches", total);
        result.put("work_orders", filtered.stream().limit(MAX_RESULTS)
                .map(wo -> workOrderSummary(wo, conversation)).toList());
        return result;
    }

    private Map<String, Object> getWorkOrder(Long workOrderId, User user, AssistantConversation conversation) {
        WorkOrder wo = workOrderService.checkAccessToWorkOrderId(workOrderId, user);
        Map<String, Object> result = workOrderSummary(wo, conversation);
        result.put("description", wo.getDescription());
        result.put("location", wo.getLocation() == null ? null : wo.getLocation().getName());
        result.put("primary_user", wo.getPrimaryUser() == null ? null : wo.getPrimaryUser().getFullName());
        result.put("assigned_to", wo.getAssignedTo() == null ? List.of() :
                wo.getAssignedTo().stream().map(User::getFullName).toList());
        result.put("created_at", formatDate(wo.getCreatedAt()));
        result.put("feedback", wo.getFeedback());
        result.put("can_edit", wo.canBeEditedBy(user));
        if (wo.getAsset() != null) conversation.addRecord(assetRecord(wo.getAsset()));
        return result;
    }

    private Map<String, Object> draftWorkOrder(JsonNode args, User user, AssistantConversation conversation,
                                               List<PendingAction> createdActions) {
        if (!user.getRole().getCreatePermissions().contains(PermissionEntity.WORK_ORDERS))
            return error("This user is not allowed to create work orders.");
        String title = text(args, "title");
        if (title == null || title.isBlank()) throw new IllegalArgumentException("title is required");
        if (title.length() > 250) throw new IllegalArgumentException("title must be at most 250 characters");
        String description = text(args, "description");
        String priorityText = text(args, "priority");
        Priority priority = priorityText == null || priorityText.isBlank() ? Priority.NONE :
                parsePriority(priorityText);
        Long assetId = optionalLong(args, "asset_id");
        Asset asset = assetId == null ? null : assetService.checkAccessToAssetId(assetId, user);
        Date dueDate = parseDate(text(args, "due_date"));

        PendingAction action = new PendingAction();
        action.setId(UUID.randomUUID().toString());
        action.setKind(ActionKind.CREATE_WORK_ORDER);
        action.setTitle(title.trim());
        action.setDescription(description == null || description.isBlank() ? null : description.trim());
        action.setPriority(priority);
        action.setAssetId(asset == null ? null : asset.getId());
        action.setDueDate(dueDate);
        Map<String, String> preview = action.getPreviewFields();
        preview.put("Title", action.getTitle());
        if (action.getDescription() != null) preview.put("Description", action.getDescription());
        preview.put("Priority", capitalize(priority.name()));
        if (asset != null) {
            preview.put("Asset", joinNonBlank(asset.getName(), asset.getCustomId()));
            if (asset.getLocation() != null) preview.put("Location", asset.getLocation().getName());
        }
        if (dueDate != null) preview.put("Due date", formatDate(dueDate));
        conversation.getPendingActions().put(action.getId(), action);
        createdActions.add(action);
        return draftResult(action);
    }

    private Map<String, Object> draftStatusChange(JsonNode args, User user, AssistantConversation conversation,
                                                  List<PendingAction> createdActions) {
        WorkOrder wo = workOrderService.checkAccessToWorkOrderId(requiredLong(args, "work_order_id"), user);
        if (!wo.canBeEditedBy(user)) return error("This user is not allowed to change this work order.");
        Status status = parseStatus(text(args, "status"));
        if (status == wo.getStatus()) return error("The work order is already " + status.name() + ".");
        if (status == Status.COMPLETE && wo.isRequiredSignature())
            return error("This work order needs a signature to complete. The user must complete it from the "
                    + "work order page.");
        String feedback = text(args, "feedback");
        conversation.addRecord(workOrderRecord(wo));

        PendingAction action = new PendingAction();
        action.setId(UUID.randomUUID().toString());
        action.setKind(ActionKind.CHANGE_WORK_ORDER_STATUS);
        action.setWorkOrderId(wo.getId());
        action.setStatus(status);
        action.setFeedback(feedback == null || feedback.isBlank() ? null : feedback.trim());
        Map<String, String> preview = action.getPreviewFields();
        preview.put("Work order", joinNonBlank(wo.getCustomId(), wo.getTitle()));
        preview.put("Current status", humanize(wo.getStatus().name()));
        preview.put("New status", humanize(status.name()));
        if (action.getFeedback() != null) preview.put("Note", action.getFeedback());
        conversation.getPendingActions().put(action.getId(), action);
        createdActions.add(action);
        return draftResult(action);
    }

    public AssistantRecord assetRecord(Asset asset) {
        String location = asset.getLocation() == null ? null : asset.getLocation().getName();
        return new AssistantRecord("asset", asset.getId(), asset.getName(),
                joinNonBlank(asset.getCustomId(), location), enumName(asset.getStatus()));
    }

    public AssistantRecord workOrderRecord(WorkOrder wo) {
        String subtitle = joinNonBlank(wo.getCustomId(), wo.getAsset() == null ? null : wo.getAsset().getName(),
                wo.getDueDate() == null ? null : "Due " + formatDate(wo.getDueDate()));
        return new AssistantRecord("work_order", wo.getId(), wo.getTitle(), subtitle, enumName(wo.getStatus()));
    }

    private Map<String, Object> workOrderSummary(WorkOrder wo, AssistantConversation conversation) {
        conversation.addRecord(workOrderRecord(wo));
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", wo.getId());
        item.put("code", wo.getCustomId());
        item.put("title", wo.getTitle());
        item.put("status", enumName(wo.getStatus()));
        item.put("priority", enumName(wo.getPriority()));
        item.put("due_date", formatDate(wo.getDueDate()));
        item.put("completed_on", formatDate(wo.getCompletedOn()));
        item.put("overdue", isOverdue(wo, new Date()));
        item.put("asset", wo.getAsset() == null ? null :
                Map.of("id", wo.getAsset().getId(), "name", String.valueOf(wo.getAsset().getName())));
        return item;
    }

    private List<WorkOrder> visibleWorkOrdersForAsset(Long assetId, User user) {
        return workOrderService.findByAsset(assetId).stream()
                .filter(wo -> !wo.isArchived() && wo.canBeViewedBy(user))
                .collect(Collectors.toList());
    }

    private Map<String, Object> draftResult(PendingAction action) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "preview_shown");
        result.put("action_id", action.getId());
        result.put("note", "Not saved yet. The user sees a preview with a Confirm button.");
        return result;
    }

    private static boolean isOverdue(WorkOrder wo, Date now) {
        return wo.getStatus() != Status.COMPLETE && wo.getDueDate() != null && wo.getDueDate().before(now);
    }

    private static FilterField eq(String field, Object value) {
        return FilterField.builder().field(field).operation("eq").value(value).values(new ArrayList<>()).build();
    }

    private static FilterField contains(String field, String value) {
        return FilterField.builder().field(field).operation("cn").value(value).values(new ArrayList<>()).build();
    }

    private static FilterField containsAny(String value, String firstField, String... otherFields) {
        FilterField filter = contains(firstField, value);
        filter.setAlternatives(Arrays.stream(otherFields).map(field -> contains(field, value))
                .collect(Collectors.toList()));
        return filter;
    }

    private static Map<String, Object> error(String message) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("error", message);
        return result;
    }

    private static String text(JsonNode args, String field) {
        if (args == null) return null;
        JsonNode node = args.get(field);
        return node == null || node.isNull() ? null : node.asText();
    }

    private static Long optionalLong(JsonNode args, String field) {
        if (args == null) return null;
        JsonNode node = args.get(field);
        if (node == null || node.isNull() || node.asText().isBlank()) return null;
        if (node.isNumber()) return node.asLong();
        try {
            return Long.parseLong(node.asText().trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(field + " must be a number");
        }
    }

    private static Long requiredLong(JsonNode args, String field) {
        Long value = optionalLong(args, field);
        if (value == null) throw new IllegalArgumentException(field + " is required");
        return value;
    }

    private static Status parseStatus(String value) {
        try {
            return Status.valueOf(value.trim().toUpperCase(Locale.ROOT).replace(' ', '_'));
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("status must be one of OPEN, IN_PROGRESS, ON_HOLD, COMPLETE");
        }
    }

    private static Priority parsePriority(String value) {
        try {
            return Priority.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("priority must be one of NONE, LOW, MEDIUM, HIGH");
        }
    }

    private static Date parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Date.from(LocalDate.parse(value.trim()).atStartOfDay(ZoneId.systemDefault()).toInstant());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("due_date must be formatted as YYYY-MM-DD");
        }
    }

    static String formatDate(Date date) {
        return date == null ? null : new SimpleDateFormat("yyyy-MM-dd").format(date);
    }

    private static String enumName(Enum<?> value) {
        return value == null ? null : value.name();
    }

    private static boolean containsIgnoreCase(String text, String loweredQuery) {
        return text != null && text.toLowerCase().contains(loweredQuery);
    }

    private static String joinNonBlank(String... parts) {
        return Arrays.stream(parts).filter(part -> part != null && !part.isBlank())
                .collect(Collectors.joining(" · "));
    }

    private static String humanize(String enumName) {
        return capitalize(enumName.replace('_', ' '));
    }

    private static String capitalize(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.isEmpty() ? lower : Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private ObjectNode function(String name, String description, ObjectNode parameters) {
        ObjectNode function = objectMapper.createObjectNode();
        function.put("name", name);
        function.put("description", description);
        function.set("parameters", parameters);
        return function;
    }

    private ObjectNode params(Map<String, ObjectNode> properties, List<String> required) {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        new TreeMap<>(properties).forEach(props::set);
        if (!required.isEmpty()) {
            ArrayNode requiredNode = schema.putArray("required");
            required.forEach(requiredNode::add);
        }
        return schema;
    }

    private ObjectNode string(String description) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "string");
        node.put("description", description);
        return node;
    }

    private ObjectNode stringEnum(String description, List<String> values) {
        ObjectNode node = string(description);
        ArrayNode enumNode = node.putArray("enum");
        values.forEach(enumNode::add);
        return node;
    }

    private ObjectNode stringArray(String description, List<String> values) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "array");
        node.put("description", description);
        ObjectNode items = node.putObject("items");
        items.put("type", "string");
        ArrayNode enumNode = items.putArray("enum");
        values.forEach(enumNode::add);
        return node;
    }

    private ObjectNode integer(String description) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "integer");
        node.put("description", description);
        return node;
    }

    private ObjectNode bool(String description) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "boolean");
        node.put("description", description);
        return node;
    }
}
