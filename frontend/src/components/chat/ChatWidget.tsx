'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { chatService, ChatThread, ChatMessage } from '@/services/chat.service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThread, setCurrentThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load threads when widget opens
  useEffect(() => {
    if (isOpen && threads.length === 0) {
      loadThreads();
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadThreads = async () => {
    try {
      const data = await chatService.getThreads();
      setThreads(data || []);
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  };

  const loadThread = async (threadId: string) => {
    setIsLoading(true);
    try {
      const data = await chatService.getThread(threadId);
      setMessages(data.messages || []);
      setCurrentThread(threadId);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    // Optimistically add user message to UI
    const tempMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      threadId: currentThread || '',
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await chatService.sendMessage({
        threadId: currentThread || undefined,
        message: userMessage,
      });

      // If this is a new thread, update current thread
      if (!currentThread) {
        setCurrentThread(response.threadId);
        await loadThreads(); // Reload threads to show new one
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: 'assistant-' + Date.now(),
        threadId: response.threadId,
        role: 'assistant',
        content: response.message,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev.filter((m) => m.id !== tempMessage.id), tempMessage, assistantMessage]);
    } catch (error: any) {
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));

      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const startNewConversation = () => {
    setCurrentThread(null);
    setMessages([]);
  };

  const deleteThread = async (threadId: string) => {
    try {
      await chatService.deleteThread(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (currentThread === threadId) {
        startNewConversation();
      }
      toast({
        title: 'Success',
        description: 'Conversation deleted',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-colors flex items-center justify-center z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-orange-500 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-semibold">Assistant Processus</h3>
        </div>
        <div className="flex items-center gap-2">
          {currentThread && (
            <Button
              variant="ghost"
              size="icon"
              onClick={startNewConversation}
              className="h-8 w-8 text-white hover:bg-orange-600"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-white hover:bg-orange-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!currentThread && messages.length === 0 ? (
        <div className="flex-1 flex flex-col">
          {/* Thread List */}
          <div className="p-4 border-b">
            <p className="text-sm text-gray-600 mb-2">Conversations récentes</p>
          </div>
          <ScrollArea className="flex-1 p-2">
            {threads.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Aucune conversation. Posez une question pour commencer!
              </div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  className="group p-3 hover:bg-gray-50 rounded-lg cursor-pointer mb-2 flex items-start justify-between"
                  onClick={() => loadThread(thread.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{thread.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-1">{thread.lastMessage}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {thread.messageCount} messages • {new Date(thread.updatedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(thread.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-2">Bonjour! Je suis votre assistant pour les processus Togocom.</p>
                  <p className="text-xs text-gray-400">Posez-moi des questions sur les procédures, les bonnes pratiques, ou les processus.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-lg px-4 py-2 max-w-[80%]',
                        message.role === 'user'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Posez une question..."
                disabled={isSending}
                className="flex-1"
              />
              <Button type="submit" disabled={!inputMessage.trim() || isSending} className="bg-orange-500 hover:bg-orange-600">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}
