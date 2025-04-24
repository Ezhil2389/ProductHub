package com.example.crud.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import com.example.crud.model.ChatMessage;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Private chat: /app/chat.private.{username}
    @MessageMapping("/chat.private.{username}")
    public void sendPrivateMessage(@DestinationVariable String username, @Payload ChatMessage message) {
        // Forward the message as JSON to the recipient's topic
        messagingTemplate.convertAndSend("/topic/private." + username, message);
    }

    // Admin to all: /app/chat.admin.broadcast
    @MessageMapping("/chat.admin.broadcast")
    public void sendAdminBroadcast(@Payload String message) {
        // No authentication context, so just send the message as-is
        messagingTemplate.convertAndSend("/topic/admin", message);
    }
} 