package com.grash.service.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.dto.assistant.AssistantRecord;
import com.grash.model.enums.Priority;
import com.grash.model.enums.Status;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * In-memory state of one chat. History is append-only and sent to Gemini unchanged on every turn.
 */
@Getter
public class AssistantConversation {

    private final String id;
    private final Long userId;
    private final List<JsonNode> contents = new ArrayList<>();
    private final Map<String, AssistantRecord> records = new LinkedHashMap<>();
    private final Map<String, PendingAction> pendingActions = new LinkedHashMap<>();
    // Results of confirmed or cancelled drafts, told to Gemini with the next user message.
    private final List<String> notes = new ArrayList<>();
    @Setter
    private volatile Instant lastUsed = Instant.now();

    public AssistantConversation(String id, Long userId) {
        this.id = id;
        this.userId = userId;
    }

    public void addRecord(AssistantRecord record) {
        records.put(record.getType() + ":" + record.getId(), record);
    }

    public enum ActionKind {CREATE_WORK_ORDER, CHANGE_WORK_ORDER_STATUS}

    @Getter
    @Setter
    public static class PendingAction {
        private String id;
        private ActionKind kind;
        private String title;
        private String description;
        private Priority priority;
        private Long assetId;
        private Date dueDate;
        private Long workOrderId;
        private Status status;
        private String feedback;
        private Map<String, String> previewFields = new LinkedHashMap<>();
    }
}
