package com.agripulse.backend.repository;

import com.agripulse.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    List<ChatMessage> findByConversationIdOrderBySentAtAsc(String conversationId);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.read = true WHERE m.conversationId = :conversationId")
    void markThreadAsRead(String conversationId);
}
