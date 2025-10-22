import { api } from '@/lib/api';

export interface ChatThread {
  id: string;
  userId: string;
  openaiThreadId: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SendMessageRequest {
  threadId?: string;
  message: string;
}

export interface SendMessageResponse {
  threadId: string;
  message: string;
  role: string;
}

export interface ChatThreadWithMessages {
  thread: ChatThread;
  messages: ChatMessage[];
}

export const chatService = {
  // Send a message (creates new thread if threadId not provided)
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await api.post('/chat/messages', request);
    return response.data.data;
  },

  // Get all threads for current user
  async getThreads(): Promise<ChatThread[]> {
    const response = await api.get('/chat/threads');
    return response.data.data;
  },

  // Get specific thread with messages
  async getThread(threadId: string): Promise<ChatThreadWithMessages> {
    const response = await api.get(`/chat/threads/${threadId}`);
    return response.data.data;
  },

  // Update thread title
  async updateThreadTitle(threadId: string, title: string): Promise<void> {
    await api.patch(`/chat/threads/${threadId}`, { title });
  },

  // Delete a thread
  async deleteThread(threadId: string): Promise<void> {
    await api.delete(`/chat/threads/${threadId}`);
  },
};
