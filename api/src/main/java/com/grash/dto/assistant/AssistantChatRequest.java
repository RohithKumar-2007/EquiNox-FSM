package com.grash.dto.assistant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class AssistantChatRequest {
    private String conversationId;

    @NotBlank
    @Size(max = 4000)
    private String message;

    private AssistantPageContext context;
}
