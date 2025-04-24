import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { authService } from './authService';

export interface ChatMessage {
  content: string;
  sender?: string;
  timestamp?: string;
  type?: 'PRIVATE' | 'BROADCAST';
}

export class ChatService {
  private client: Client | null = null;
  private messageHandlers: ((message: ChatMessage) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private username: string | null = null;

  setUsername(username: string) {
    this.username = username;
  }

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/api/ws', null, {
        transports: ['xhr-polling']
      }),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('Connected to WebSocket');
        this.reconnectAttempts = 0;
        this.subscribeToMessages();
        this.notifyConnectionStatus(true);
      },
      onDisconnect: () => {
        console.log('Disconnected from WebSocket');
        this.notifyConnectionStatus(false);
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        this.handleReconnect();
      },
      connectHeaders: {
        'Origin': window.location.origin
      }
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, 5000 * this.reconnectAttempts);
    }
  }

  private subscribeToMessages() {
    if (!this.client?.connected) return;

    // Subscribe to private messages using /topic/private.{username}
    if (this.username) {
      this.client.subscribe(`/topic/private.${this.username}`, (message) => {
        try {
          const chatMessage = JSON.parse(message.body);
          this.notifyMessageHandlers({
            ...chatMessage,
            sender: chatMessage.sender || chatMessage.from,
            type: 'PRIVATE'
          });
        } catch (error) {
          console.error('Error parsing private message:', error);
        }
      });
    }

    // Subscribe to admin broadcasts
    this.client.subscribe('/topic/admin', (message) => {
      try {
        const chatMessage = JSON.parse(message.body);
        this.notifyMessageHandlers({
          ...chatMessage,
          sender: chatMessage.sender || chatMessage.from,
          type: 'BROADCAST'
        });
      } catch (error) {
        console.error('Error parsing broadcast message:', error);
      }
    });
  }

  private notifyMessageHandlers(message: ChatMessage) {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  connect() {
    if (this.client?.connected) return;

    try {
      // Get token from localStorage directly instead of authService.getToken()
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token available');
        this.notifyConnectionStatus(false);
        return;
      }

      this.client?.configure({
        connectHeaders: {
          'Authorization': `Bearer ${token}`,
          'Origin': window.location.origin
        }
      });

      // Add debug logging
      console.log('Activating STOMP client, connecting to:', 'http://localhost:8080/api/ws');
      
      this.client?.activate();
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.notifyConnectionStatus(false);
    }
  }

  disconnect() {
    this.client?.deactivate();
  }

  sendPrivateMessage(recipientUsername: string, content: string, from: string) {
    if (!this.client?.connected) {
      console.error('Not connected to WebSocket');
      return;
    }

    this.client.publish({
      destination: `/app/chat.private.${recipientUsername}`,
      body: JSON.stringify({ from, content })
    });
  }

  sendAdminBroadcast(content: string) {
    if (!this.client?.connected) {
      console.error('Not connected to WebSocket');
      return;
    }

    this.client.publish({
      destination: '/app/chat.admin.broadcast',
      body: JSON.stringify({ content })
    });
  }

  onMessage(handler: (message: ChatMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  get isConnected() {
    return !!this.client?.connected;
  }
}

export const chatService = new ChatService();