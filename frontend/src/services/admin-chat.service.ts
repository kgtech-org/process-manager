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
    return response.data;
  },

  /**
   * Get all threads with all messages merged in one response (admin only)
   */
  async getAllThreadsWithMessages(): Promise<ChatThreadWithUserAndMessages[]> {
    // console.log('[AdminChatService] Fetching all threads with messages...');
    const response = await apiClient.get('/admin/chat/threads-with-messages');
    // console.log('[AdminChatService] Response:', response);
    // console.log('[AdminChatService] Data:', response.data);
    const threads = response.data;
    // console.log('[AdminChatService] Number of threads:', threads?.length);
    // if (threads && threads.length > 0) {
    //   console.log('[AdminChatService] First thread messages:', threads[0].messages);
    // }
    return threads;
  },

  /**
   * Get a specific thread with messages and user info (admin only)
   */
  async getThread(threadId: string): Promise<ChatThreadWithUserAndMessages> {
    // console.log('[AdminChatService] Fetching thread:', threadId);
    const response = await apiClient.get(`/admin/chat/threads/${threadId}`);
    // console.log('[AdminChatService] Raw response:', response);
    // console.log('[AdminChatService] Response data:', response.data);
    // console.log('[AdminChatService] Response data.data:', response.data.data);
    const threadData = response.data.data;
    // console.log('[AdminChatService] Thread data messages:', threadData?.messages);
    // console.log('[AdminChatService] Messages count:', threadData?.messages?.length);
    return threadData;
  },
};
