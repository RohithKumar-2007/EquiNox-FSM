package com.grash.dto.assistant;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A change the assistant has prepared but not saved. The user must confirm it.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantPendingAction {
    private String id;
    private String kind;
    private String title;
    private Map<String, String> fields = new LinkedHashMap<>();
}
