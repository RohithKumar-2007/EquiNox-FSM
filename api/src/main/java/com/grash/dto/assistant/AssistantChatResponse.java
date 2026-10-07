package com.grash.dto.assistant;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantChatResponse {
    private String conversationId;
    private String reply;
    private List<AssistantRecord> records = new ArrayList<>();
    private List<AssistantPendingAction> pendingActions = new ArrayList<>();
}
