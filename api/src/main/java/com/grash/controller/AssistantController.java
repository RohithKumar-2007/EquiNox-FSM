package com.grash.controller;

import com.grash.dto.SuccessResponse;
import com.grash.dto.assistant.AssistantActionRequest;
import com.grash.dto.assistant.AssistantActionResult;
import com.grash.dto.assistant.AssistantChatRequest;
import com.grash.dto.assistant.AssistantChatResponse;
import com.grash.model.User;
import com.grash.service.UserService;
import com.grash.service.assistant.AssistantService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/assistant")
@Tag(name = "Assistant", description = "Maintenance assistant chat")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;
    private final UserService userService;

    @GetMapping("/status")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, Object> status() {
        return assistantService.status();
    }

    @PostMapping("/chat")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public AssistantChatResponse chat(@Valid @RequestBody AssistantChatRequest request, HttpServletRequest req) {
        User user = userService.whoami(req);
        return assistantService.chat(request, user);
    }

    @PostMapping("/actions/{actionId}/confirm")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public AssistantActionResult confirm(@PathVariable String actionId,
                                         @Valid @RequestBody AssistantActionRequest request,
                                         HttpServletRequest req) {
        User user = userService.whoami(req);
        return assistantService.confirm(actionId, request, user);
    }

    @PostMapping("/actions/{actionId}/cancel")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public SuccessResponse cancel(@PathVariable String actionId, @Valid @RequestBody AssistantActionRequest request,
                                  HttpServletRequest req) {
        User user = userService.whoami(req);
        assistantService.cancel(actionId, request, user);
        return new SuccessResponse(true, "Cancelled");
    }
}
