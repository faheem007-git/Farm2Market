package com.agripulse.backend.controller;

import com.agripulse.backend.dto.request.CreateConversationRequest;
import com.agripulse.backend.dto.request.SendMessageRequest;
import com.agripulse.backend.dto.response.ChatDtos.ConversationResponse;
import com.agripulse.backend.dto.response.ChatDtos.MessageResponse;
import com.agripulse.backend.security.JwtUserDetails;
import com.agripulse.backend.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public ResponseEntity<List<ConversationResponse>> list(Authentication auth) {
        return ResponseEntity.ok(chatService.list(
                (String) auth.getPrincipal(), roleOf(auth)));
    }

    @PostMapping
    public ResponseEntity<ConversationResponse> getOrCreate(
            Authentication auth, @Valid @RequestBody CreateConversationRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.getOrCreate(
                (String) auth.getPrincipal(), roleOf(auth), req));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<MessageResponse>> messages(@PathVariable String id,
                                                          Authentication auth) {
        return ResponseEntity.ok(chatService.messages(
                id, (String) auth.getPrincipal(), roleOf(auth)));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<MessageResponse> send(@PathVariable String id,
                                                Authentication auth,
                                                @Valid @RequestBody SendMessageRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.send(
                id, (String) auth.getPrincipal(), roleOf(auth), req));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable String id, Authentication auth) {
        chatService.markRead(id, (String) auth.getPrincipal(), roleOf(auth));
        return ResponseEntity.ok().build();
    }

    private String roleOf(Authentication auth) {
        return ((JwtUserDetails) auth.getDetails()).getRole();
    }
}
