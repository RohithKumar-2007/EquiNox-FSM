package com.grash.voiceops;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.advancedsearch.FilterField;
import com.grash.advancedsearch.SearchCriteria;
import com.grash.dto.AssetShowDTO;
import com.grash.dto.workOrder.WorkOrderPostDTO;
import com.grash.exception.CustomException;
import com.grash.model.Asset;
import com.grash.model.Notification;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.enums.NotificationType;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.Priority;
import com.grash.model.enums.RoleCode;
import com.grash.model.enums.Status;
import com.grash.service.AssetService;
import com.grash.service.NotificationService;
import com.grash.service.UserService;
import com.grash.service.WorkOrderService;
import com.grash.service.WorkloadService;
import com.grash.voiceops.VoiceEvent.EventStatus;
import com.grash.voiceops.VoiceEvent.Origin;
import com.grash.voiceops.VoiceEvent.Type;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static com.grash.voiceops.VoiceOpsService.mapOf;

/**
 * The six actions the ElevenLabs agent may take. The agent never touches the database: every action goes
 * through here, runs as the API key's user (so normal permissions apply), validates its input and the
 * equipment, returns {"ok": ..., "data" | "error": ...} and records a VoiceOps event.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VoiceToolService {

    private static final Pattern LANGUAGE_CODE = Pattern.compile("^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$");
    private static final List<RoleCode> TECHNICIAN_ROLES = List.of(RoleCode.TECHNICIAN, RoleCode.LIMITED_TECHNICIAN);

    private final VoiceOpsService voiceOpsService;
    private final VoiceDispatchService voiceDispatchService;
    private final AssetService assetService;
    private final WorkOrderService workOrderService;
    private final UserService userService;
    private final WorkloadService workloadService;
    private final NotificationService notificationService;

    /**
     * Identifies the conversation a tool request belongs to (from ElevenLabs system dynamic variables).
     */
    public record CallContext(String conversationId, String callerNumber, String callSid) {
    }

    private static class ToolError extends RuntimeException {
        final String code;

        ToolError(String code, String message) {
            super(message);
            this.code = code;
        }
    }

    private interface ToolHandler {
        Map<String, Object> handle(VoiceCall call, JsonNode args, User actor);
    }

    public Map<String, Object> findEquipment(CallContext context, JsonNode args, User actor) {
        return run("find_equipment", context, args, actor, (call, a, user) -> {
            String query = requiredText(a, "query", 2, 120);
            SearchCriteria criteria = new SearchCriteria();
            criteria.setPageSize(5);
            criteria.setSortField("name");
            criteria.setDirection(Sort.Direction.ASC);
            criteria.getFilterFields().add(FilterField.builder().field("archived").operation("eq").value(false)
                    .values(new ArrayList<>()).build());
            FilterField nameFilter = contains("name", query);
            nameFilter.setAlternatives(List.of(contains("customId", query), contains("serialNumber", query),
                    contains("model", query), contains("description", query)));
            criteria.getFilterFields().add(nameFilter);
            assetService.getSearchCriteria(user, criteria);
            Page<AssetShowDTO> page = assetService.findBySearchCriteria(criteria);
            List<Map<String, Object>> matches = page.getContent().stream().map(asset -> mapOf(
                    "asset_id", asset.getId(),
                    "name", asset.getName(),
                    "code", asset.getCustomId(),
                    "status", asset.getStatus() == null ? null : asset.getStatus().name(),
                    "location", asset.getLocation() == null ? null : asset.getLocation().getName()
            )).toList();
            if (page.getContent().size() == 1) {
                AssetShowDTO asset = page.getContent().get(0);
                recordEquipment(call, asset.getId(), asset.getName(), asset.getCustomId(),
                        asset.getLocation() == null ? null : asset.getLocation().getName());
            }
            return mapOf("total_matches", page.getTotalElements(), "matches", matches,
                    "hint", matches.size() > 1 ? "Ask the caller which one they mean." :
                            matches.isEmpty() ? "No equipment matched. Ask for the name, code or location." : null);
        });
    }

    public Map<String, Object> getEquipmentStatus(CallContext context, JsonNode args, User actor) {
        return run("get_equipment_status", context, args, actor, (call, a, user) -> {
            Asset asset = requireAsset(a, user);
            recordEquipment(call, asset.getId(), asset.getName(), asset.getCustomId(),
                    asset.getLocation() == null ? null : asset.getLocation().getName());
            List<WorkOrder> workOrders = visibleWorkOrders(asset.getId(), user);
            Date now = new Date();
            List<WorkOrder> open = workOrders.stream().filter(wo -> wo.getStatus() != Status.COMPLETE).toList();
            Optional<WorkOrder> lastCompleted = workOrders.stream()
                    .filter(wo -> wo.getStatus() == Status.COMPLETE && wo.getCompletedOn() != null)
                    .max(Comparator.comparing(WorkOrder::getCompletedOn));
            return mapOf(
                    "asset_id", asset.getId(),
                    "name", asset.getName(),
                    "code", asset.getCustomId(),
                    "status", asset.getStatus() == null ? null : asset.getStatus().name(),
                    "location", asset.getLocation() == null ? null : asset.getLocation().getName(),
                    "open_work_orders", open.size(),
                    "overdue_work_orders", open.stream().filter(wo -> wo.getDueDate() != null
                            && wo.getDueDate().before(now)).count(),
                    "open_work_order_list", open.stream().limit(3).map(this::workOrderSummary).toList(),
                    "last_serviced", lastCompleted.map(wo -> formatDate(wo.getCompletedOn())).orElse(null)
            );
        });
    }

    public Map<String, Object> getEquipmentHistory(CallContext context, JsonNode args, User actor) {
        return run("get_equipment_history", context, args, actor, (call, a, user) -> {
            Asset asset = requireAsset(a, user);
            int limit = optionalInt(a, "limit", 5, 1, 10);
            List<Map<String, Object>> history = visibleWorkOrders(asset.getId(), user).stream()
                    .sorted(Comparator.comparing(WorkOrder::getCreatedAt,
                            Comparator.nullsLast(Comparator.reverseOrder())))
                    .limit(limit)
                    .map(this::workOrderSummary)
                    .toList();
            return mapOf("asset_id", asset.getId(), "name", asset.getName(), "work_orders", history);
        });
    }

    public Map<String, Object> createWorkOrder(CallContext context, JsonNode args, User actor) {
        return run("create_work_order", context, args, actor, (call, a, user) -> {
            if (!user.getRole().getCreatePermissions().contains(PermissionEntity.WORK_ORDERS))
                throw new ToolError("forbidden", "The voice agent account is not allowed to create work orders.");
            Asset asset = requireAsset(a, user);
            String title = requiredText(a, "title", 3, 200);
            String description = optionalText(a, "description", 2000);
            String severity = requiredText(a, "severity", 3, 10).toUpperCase(Locale.ROOT);
            Priority priority = switch (severity) {
                case "LOW" -> Priority.LOW;
                case "MEDIUM" -> Priority.MEDIUM;
                case "HIGH", "CRITICAL" -> Priority.HIGH;
                default -> throw new ToolError("invalid_input", "severity must be LOW, MEDIUM, HIGH or CRITICAL");
            };
            String originalText = optionalText(a, "original_text", 1000);

            // The model may retry a tool call; don't create a second work order for the same equipment.
            if (call.getWorkOrderId() != null) {
                Optional<WorkOrder> existing = workOrderService.findById(call.getWorkOrderId());
                if (existing.isPresent() && existing.get().getAsset() != null
                        && existing.get().getAsset().getId().equals(asset.getId())) {
                    return mapOf("work_order_id", existing.get().getId(), "code", existing.get().getCustomId(),
                            "already_created", true);
                }
            }

            recordEquipment(call, asset.getId(), asset.getName(), asset.getCustomId(),
                    asset.getLocation() == null ? null : asset.getLocation().getName());
            voiceOpsService.record(call, Type.SEVERITY, Origin.TOOL_REQUEST, EventStatus.INFO, "create_work_order",
                    "Severity: " + severity + " (priority " + priority.name() + ")",
                    mapOf("severity", severity, "priority", priority.name()), null);

            StringBuilder fullDescription = new StringBuilder(description == null ? "" : description);
            if (originalText != null) {
                String language = call.getLanguage() == null ? "the caller's language" : languageName(call.getLanguage());
                if (!fullDescription.isEmpty()) fullDescription.append("\n\n");
                fullDescription.append("Reported by voice in ").append(language).append(": \"")
                        .append(originalText).append("\"");
            }
            if (call.getCallerNumber() != null) fullDescription.append("\nCaller: ").append(call.getCallerNumber());

            WorkOrderPostDTO workOrder = new WorkOrderPostDTO();
            workOrder.setTitle(title);
            workOrder.setDescription(fullDescription.toString());
            workOrder.setPriority(priority);
            workOrder.setAsset(asset);
            workOrder.setLocation(asset.getLocation());
            WorkOrder created = workOrderService.createByUser(workOrder, user);

            call.setWorkOrderId(created.getId());
            voiceOpsService.saveCall(call);
            voiceOpsService.record(call, Type.WORK_ORDER_CREATED, Origin.TOOL_REQUEST, EventStatus.SUCCESS,
                    "create_work_order", "Work order " + created.getCustomId() + " created: " + created.getTitle(),
                    mapOf("work_order_id", created.getId(), "code", created.getCustomId(),
                            "title", created.getTitle(), "priority", priority.name(), "asset_id", asset.getId()),
                    null);
            return mapOf("work_order_id", created.getId(), "code", created.getCustomId(),
                    "priority", priority.name(), "status", created.getStatus().name());
        });
    }

    public Map<String, Object> assignTechnician(CallContext context, JsonNode args, User actor) {
        return run("assign_technician", context, args, actor, (call, a, user) -> {
            WorkOrder workOrder = requireEditableWorkOrder(a, user);
            Long technicianId = optionalLong(a, "technician_id");
            List<Map<String, Object>> ranking = new ArrayList<>();
            User technician;
            if (technicianId != null) {
                technician = userService.findByIdAndCompany(technicianId, user.getCompany().getId())
                        .filter(User::isEnabled)
                        .orElseThrow(() -> new ToolError("not_found", "No active user with id " + technicianId));
                if (!isWorker(technician))
                    throw new ToolError("invalid_input", technician.getFullName() + " can't be assigned work orders.");
            } else {
                List<Candidate> candidates = rankTechnicians(workOrder, user);
                candidates.stream().limit(3).forEach(candidate -> ranking.add(mapOf(
                        "technician_id", candidate.user.getId(), "name", candidate.user.getFullName(),
                        "score", candidate.score, "reasons", candidate.reasons)));
                if (candidates.isEmpty())
                    throw new ToolError("no_technician", "No technician is available. Escalate the work order.");
                technician = candidates.get(0).user;
            }

            workOrder.setPrimaryUser(technician);
            if (workOrder.getAssignedTo().stream().noneMatch(u -> u.getId().equals(technician.getId())))
                workOrder.getAssignedTo().add(technician);
            workOrderService.save(workOrder);
            voiceOpsService.record(call, Type.TECHNICIAN_ASSIGNED, Origin.TOOL_REQUEST, EventStatus.SUCCESS,
                    "assign_technician", technician.getFullName() + " assigned to " + workOrder.getCustomId(),
                    mapOf("work_order_id", workOrder.getId(), "technician_id", technician.getId(),
                            "technician", technician.getFullName(),
                            "selection", technicianId != null ? "chosen by agent" : "ranked automatically",
                            "ranking", ranking.isEmpty() ? null : ranking), null);

            String notification = notifyUser(technician, "Voice report assigned to you: " + workOrder.getTitle(),
                    workOrder.getId());
            voiceOpsService.record(call, Type.NOTIFICATION, Origin.BACKEND,
                    notification == null ? EventStatus.SUCCESS : EventStatus.FAILED, "assign_technician",
                    notification == null ? "In-app notification sent to " + technician.getFullName()
                            : "Notification to " + technician.getFullName() + " failed",
                    mapOf("channel", "in-app", "recipient", technician.getFullName(), "error", notification), null);

            return mapOf("work_order_id", workOrder.getId(), "technician_id", technician.getId(),
                    "technician", technician.getFullName(),
                    "notified", notification == null);
        });
    }

    public Map<String, Object> escalateWorkOrder(CallContext context, JsonNode args, User actor) {
        return run("escalate_work_order", context, args, actor, (call, a, user) -> {
            WorkOrder workOrder = requireEditableWorkOrder(a, user);
            String reason = requiredText(a, "reason", 3, 500);
            if (workOrder.getPriority() != Priority.HIGH) {
                workOrder.setPriority(Priority.HIGH);
                workOrderService.save(workOrder);
            }
            voiceOpsService.record(call, Type.ESCALATION, Origin.TOOL_REQUEST, EventStatus.SUCCESS,
                    "escalate_work_order", workOrder.getCustomId() + " escalated: " + reason,
                    mapOf("work_order_id", workOrder.getId(), "reason", reason, "priority", "HIGH"), null);

            // Tell the company's admins in the app.
            List<User> admins = userService.findByCompany(user.getCompany().getId()).stream()
                    .filter(u -> u.isEnabled() && u.getRole() != null && u.getRole().getCode() == RoleCode.ADMIN
                            && !u.getId().equals(user.getId()))
                    .toList();
            int delivered = 0;
            List<String> failures = new ArrayList<>();
            for (User admin : admins) {
                String error = notifyUser(admin, "Escalated by voice: " + workOrder.getTitle() + " (" + reason + ")",
                        workOrder.getId());
                if (error == null) delivered++;
                else failures.add(admin.getFullName() + ": " + error);
            }
            voiceOpsService.record(call, Type.NOTIFICATION, Origin.BACKEND,
                    admins.isEmpty() ? EventStatus.SKIPPED : failures.isEmpty() ? EventStatus.SUCCESS : EventStatus.FAILED,
                    "escalate_work_order",
                    admins.isEmpty() ? "No admins to notify" : "In-app escalation sent to " + delivered + " of "
                            + admins.size() + " admins",
                    mapOf("channel", "in-app", "delivered", delivered, "failures", failures.isEmpty() ? null : failures),
                    null);

            Map<String, Object> outbound = voiceDispatchService.callForEscalation(call, workOrder, reason);
            return mapOf("work_order_id", workOrder.getId(), "priority", "HIGH",
                    "admins_notified", delivered, "technician_call", outbound);
        });
    }

    // ---- Shared plumbing -------------------------------------------------------------------------------------

    private Map<String, Object> run(String toolName, CallContext context, JsonNode args, User actor,
                                    ToolHandler handler) {
        long start = System.currentTimeMillis();
        if (context.conversationId() == null || context.conversationId().isBlank()
                || context.conversationId().contains("{{")) {
            log.warn("VoiceOps tool {} called without a conversation id", toolName);
            return error("missing_conversation", "The X-Conversation-Id header must carry system__conversation_id.");
        }
        String callerNumber = normalizePhone(context.callerNumber());
        Long callerUserId = callerNumber == null ? null : findUserByPhone(callerNumber, actor.getCompany().getId());
        VoiceCall.Source source = context.callSid() != null && !context.callSid().isBlank()
                && !context.callSid().contains("{{") ? VoiceCall.Source.PHONE_INBOUND
                : callerNumber != null ? VoiceCall.Source.PHONE_INBOUND : VoiceCall.Source.UNKNOWN;
        VoiceCall call;
        try {
            call = voiceOpsService.getOrCreateCall(context.conversationId(), actor.getCompany().getId(),
                    source, callerNumber, callerUserId);
        } catch (IllegalStateException e) {
            log.warn("VoiceOps tool {} rejected: conversation {} belongs to another company", toolName,
                    context.conversationId());
            return error("forbidden", "This conversation belongs to another organization.");
        }
        recordLanguage(call, args);
        Map<String, Object> safeArgs = argsForLog(args);
        try {
            Map<String, Object> data = handler.handle(call, args, actor);
            voiceOpsService.record(call, Type.TOOL_CALL, Origin.TOOL_REQUEST, EventStatus.SUCCESS, toolName,
                    toolName + " succeeded", mapOf("input", safeArgs, "output", data),
                    System.currentTimeMillis() - start);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("ok", true);
            response.put("data", data);
            return response;
        } catch (ToolError e) {
            return failed(call, toolName, safeArgs, start, e.code, e.getMessage());
        } catch (CustomException e) {
            String code = switch (e.getHttpStatus().value()) {
                case 403 -> "forbidden";
                case 404 -> "not_found";
                default -> "rejected";
            };
            return failed(call, toolName, safeArgs, start, code, e.getMessage());
        } catch (RuntimeException e) {
            log.error("VoiceOps tool {} failed", toolName, e);
            return failed(call, toolName, safeArgs, start, "internal_error", "The action failed on the server.");
        }
    }

    private Map<String, Object> failed(VoiceCall call, String toolName, Map<String, Object> args, long start,
                                       String code, String message) {
        voiceOpsService.record(call, Type.TOOL_CALL, Origin.TOOL_REQUEST, EventStatus.FAILED, toolName,
                toolName + " failed: " + message, mapOf("input", args, "error", code),
                System.currentTimeMillis() - start);
        return error(code, message);
    }

    private static Map<String, Object> error(String code, String message) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", false);
        response.put("error", mapOf("code", code, "message", message));
        return response;
    }

    private void recordLanguage(VoiceCall call, JsonNode args) {
        String language = optionalText(args, "caller_language", 20);
        if (language == null) return;
        if (!LANGUAGE_CODE.matcher(language).matches()) return;
        if (language.equalsIgnoreCase(call.getLanguage())) return;
        call.setLanguage(language.toLowerCase(Locale.ROOT));
        voiceOpsService.saveCall(call);
        voiceOpsService.record(call, Type.LANGUAGE, Origin.TOOL_REQUEST, EventStatus.INFO, null,
                "Caller language: " + languageName(language) + " (" + language + ")",
                mapOf("language", language, "reported_by", "agent tool call"), null);
    }

    private void recordEquipment(VoiceCall call, Long assetId, String name, String code, String location) {
        if (voiceOpsService.hasEvent(call, Type.EQUIPMENT_IDENTIFIED)) return;
        voiceOpsService.record(call, Type.EQUIPMENT_IDENTIFIED, Origin.TOOL_REQUEST, EventStatus.SUCCESS, null,
                "Equipment identified: " + name + (code == null ? "" : " (" + code + ")")
                        + (location == null ? "" : " at " + location),
                mapOf("asset_id", assetId, "name", name, "code", code, "location", location), null);
    }

    private record Candidate(User user, int score, List<String> reasons) {
    }

    private List<Candidate> rankTechnicians(WorkOrder workOrder, User actor) {
        Collection<User> workers = userService.findWorkersByCompany(actor.getCompany().getId()).stream()
                .filter(u -> u.isEnabled() && !u.getId().equals(actor.getId()) && isWorker(u))
                .toList();
        List<User> technicians = workers.stream()
                .filter(u -> TECHNICIAN_ROLES.contains(u.getRole().getCode())).toList();
        Collection<User> pool = technicians.isEmpty() ? workers : technicians;
        LocalDate today = LocalDate.now();
        Long siteId = workOrder.getLocation() != null ? workOrder.getLocation().getId()
                : workOrder.getAsset() != null && workOrder.getAsset().getLocation() != null
                ? workOrder.getAsset().getLocation().getId() : null;

        List<Candidate> candidates = new ArrayList<>();
        for (User technician : pool) {
            List<String> reasons = new ArrayList<>();
            int score = 0;
            boolean shiftKnown = technician.getShiftConfiguration() != null
                    && technician.getShiftConfiguration().isEnabled();
            int minutes = workloadService.getUserCapacityForDay(technician, today);
            if (shiftKnown && minutes == 0) continue; // off shift today
            if (shiftKnown) {
                score += 20 + Math.min(10, minutes / 48);
                reasons.add("on shift today (" + minutes / 60 + "h available)");
            } else {
                score += 10;
                reasons.add("no shift set (availability unknown)");
            }
            if (siteId != null && technician.getLocation() != null && siteId.equals(technician.getLocation().getId())) {
                score += 40;
                reasons.add("based at the same site");
            }
            long openWork = workOrderService.findByAssignedToUser(technician.getId()).stream()
                    .filter(wo -> wo.getStatus() != Status.COMPLETE && !wo.isArchived()).count();
            score += Math.max(0, 30 - (int) openWork * 10);
            reasons.add(openWork + " open work order" + (openWork == 1 ? "" : "s"));
            candidates.add(new Candidate(technician, score, reasons));
        }
        candidates.sort(Comparator.comparingInt(Candidate::score).reversed()
                .thenComparing(c -> c.user().getId()));
        return candidates;
    }

    /**
     * Saves an in-app notification and pushes it over the websocket. Returns null on success, else the error.
     */
    private String notifyUser(User user, String message, Long workOrderId) {
        try {
            notificationService.create(new Notification(message, user, NotificationType.WORK_ORDER, workOrderId));
            return null;
        } catch (RuntimeException e) {
            log.warn("VoiceOps notification to user {} failed", user.getId(), e);
            return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
        }
    }

    private Asset requireAsset(JsonNode args, User user) {
        Long assetId = optionalLong(args, "asset_id");
        if (assetId == null) throw new ToolError("invalid_input", "asset_id is required. Use find_equipment first.");
        // Throws not found / forbidden when the equipment doesn't exist or the account can't see it.
        Asset asset = assetService.checkAccessToAssetId(assetId, user);
        if (asset.isArchived()) throw new ToolError("not_found", "Equipment " + assetId + " is archived.");
        return asset;
    }

    private WorkOrder requireEditableWorkOrder(JsonNode args, User user) {
        Long workOrderId = optionalLong(args, "work_order_id");
        if (workOrderId == null) throw new ToolError("invalid_input", "work_order_id is required.");
        WorkOrder workOrder = workOrderService.checkAccessToWorkOrderId(workOrderId, user);
        if (!workOrder.canBeEditedBy(user))
            throw new ToolError("forbidden", "The voice agent account can't change this work order.");
        if (workOrder.getStatus() == Status.COMPLETE)
            throw new ToolError("invalid_state", "Work order " + workOrder.getCustomId() + " is already complete.");
        return workOrder;
    }

    private List<WorkOrder> visibleWorkOrders(Long assetId, User user) {
        return workOrderService.findByAsset(assetId).stream()
                .filter(wo -> !wo.isArchived() && wo.canBeViewedBy(user))
                .collect(Collectors.toList());
    }

    private Map<String, Object> workOrderSummary(WorkOrder wo) {
        return mapOf("work_order_id", wo.getId(), "code", wo.getCustomId(), "title", wo.getTitle(),
                "status", wo.getStatus().name(), "priority", wo.getPriority() == null ? null : wo.getPriority().name(),
                "due_date", formatDate(wo.getDueDate()), "completed_on", formatDate(wo.getCompletedOn()),
                "assigned_to", wo.getPrimaryUser() == null ? null : wo.getPrimaryUser().getFullName());
    }

    private static boolean isWorker(User user) {
        return user.getRole() != null && user.getRole().getCode() != RoleCode.REQUESTER
                && user.getRole().getCode() != RoleCode.VIEW_ONLY;
    }

    private Long findUserByPhone(String phone, Long companyId) {
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.length() < 6) return null;
        return userService.findByCompany(companyId).stream()
                .filter(u -> u.getPhone() != null && !u.getPhone().isBlank())
                .filter(u -> {
                    String userDigits = u.getPhone().replaceAll("[^0-9]", "");
                    return userDigits.length() >= 6 && (digits.endsWith(userDigits) || userDigits.endsWith(digits));
                })
                .map(User::getId)
                .findFirst().orElse(null);
    }

    private static String normalizePhone(String value) {
        return VoiceDispatchService.normalizePhone(value);
    }

    private static FilterField contains(String field, String value) {
        return FilterField.builder().field(field).operation("cn").value(value).values(new ArrayList<>()).build();
    }

    private static String requiredText(JsonNode args, String field, int min, int max) {
        String value = optionalText(args, field, max);
        if (value == null || value.length() < min)
            throw new ToolError("invalid_input", field + " is required (" + min + "-" + max + " characters).");
        return value;
    }

    private static String optionalText(JsonNode args, String field, int max) {
        if (args == null) return null;
        JsonNode node = args.get(field);
        if (node == null || node.isNull() || !node.isValueNode()) return null;
        String value = node.asText().trim();
        if (value.isEmpty()) return null;
        if (value.length() > max) throw new ToolError("invalid_input", field + " must be at most " + max + " characters.");
        return value;
    }

    private static Long optionalLong(JsonNode args, String field) {
        if (args == null) return null;
        JsonNode node = args.get(field);
        if (node == null || node.isNull() || node.asText().isBlank()) return null;
        if (node.canConvertToLong()) return node.asLong();
        try {
            return Long.parseLong(node.asText().trim());
        } catch (NumberFormatException e) {
            throw new ToolError("invalid_input", field + " must be a number.");
        }
    }

    private static int optionalInt(JsonNode args, String field, int fallback, int min, int max) {
        Long value = optionalLong(args, field);
        if (value == null) return fallback;
        return (int) Math.max(min, Math.min(max, value));
    }

    private static Map<String, Object> argsForLog(JsonNode args) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (args == null || !args.isObject()) return map;
        args.fields().forEachRemaining(entry -> {
            String text = entry.getValue().isValueNode() ? entry.getValue().asText() : entry.getValue().toString();
            map.put(entry.getKey(), text.length() > 300 ? text.substring(0, 297) + "..." : text);
        });
        return map;
    }

    private static String languageName(String code) {
        String name = Locale.forLanguageTag(code).getDisplayLanguage(Locale.ENGLISH);
        return name.isBlank() ? code : name;
    }

    private static String formatDate(Date date) {
        return date == null ? null : new SimpleDateFormat("yyyy-MM-dd").format(date);
    }
}
