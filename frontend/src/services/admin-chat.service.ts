import { apiClient } from '@/lib/api';

export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export interface ChatThreadWithUser {
  id: string;
  userId: string;
  openaiThreadId: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  user: UserInfo;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatThreadWithUserAndMessages extends ChatThreadWithUser {
  messages: ChatMessage[];
}

export const adminChatService = {
  /**
   * Get all chat threads across all users (admin only)
   */
  async getAllThreads(): Promise<ChatThreadWithUser[]> {
    const response = await apiClient.get('/admin/chat/threads');
    return response.data.data;
  },

  /**
   * Get a specific thread with messages and user info (admin only)
   */
  async getThread(threadId: string): Promise<ChatThreadWithUserAndMessages> {
    const response = await apiClient.get(`/admin/chat/threads/${threadId}`);
    return response.data.data;
  },
};
