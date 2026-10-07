package com.grash.dto.assistant;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A clickable card shown in the chat. type is "asset" or "work_order".
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantRecord {
    private String type;
    private Long id;
    private String title;
    private String subtitle;
    private String status;
}
