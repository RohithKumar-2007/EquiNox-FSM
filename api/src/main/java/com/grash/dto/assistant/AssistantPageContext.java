package com.grash.dto.assistant;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The record the user is looking at when they send a message.
 * type is "asset" or "work_order".
 */
@Data
@NoArgsConstructor
public class AssistantPageContext {
    private String type;
    private Long id;
}
