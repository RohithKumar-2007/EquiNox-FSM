package com.grash.dto.assistant;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class AssistantActionRequest {
    @NotBlank
    private String conversationId;
}
