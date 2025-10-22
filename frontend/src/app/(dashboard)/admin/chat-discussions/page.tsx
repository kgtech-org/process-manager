'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, User, Calendar, MessageSquare } from 'lucide-react';
import { adminChatService, ChatThreadWithUser, ChatThreadWithUserAndMessages } from '@/services/admin-chat.service';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminChatDiscussionsPage() {
  const [threads, setThreads] = useState<ChatThreadWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<ChatThreadWithUserAndMessages | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Safe check for threads
  const hasThreads = threads && threads.length > 0;

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const data = await adminChatService.getAllThreads();
      setThreads(data);
    } catch (error: any) {
      console.error('Failed to load threads:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Impossible de charger les discussions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openThread = async (threadId: string) => {
    try {
      setLoadingThread(true);
      setDialogOpen(true);
      const data = await adminChatService.getThread(threadId);
      console.log('Thread data received:', data);
      console.log('Messages in thread:', data.messages);
      console.log('Number of messages:', data.messages?.length || 0);
      setSelectedThread(data);
    } catch (error: any) {
      console.error('Failed to load thread:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Impossible de charger la discussion',
        variant: 'destructive',
      });
      setDialogOpen(false);
    } finally {
      setLoadingThread(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedThread(null);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Discussions avec l'Assistant IA</h1>
        <p className="text-gray-600 mt-2">
          Vue d'ensemble de toutes les conversations des utilisateurs avec l'assistant
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !hasThreads ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Aucune discussion pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {threads.map((thread) => (
            <Card
              key={thread.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openThread(thread.id)}
            >
              <CardHeader>
                <CardTitle className="text-base line-clamp-2">{thread.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <User className="h-4 w-4" />
                  <span>
                    {thread.user.firstName} {thread.user.lastName}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{thread.lastMessage}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{thread.messageCount} messages</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(thread.updatedAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-orange-500" />
              {loadingThread ? 'Chargement...' : selectedThread?.title}
            </DialogTitle>
            {selectedThread && (
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>
                    {selectedThread.user.firstName} {selectedThread.user.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{selectedThread.messageCount} messages</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDistanceToNow(new Date(selectedThread.updatedAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
              </div>
            )}
          </DialogHeader>

          {loadingThread ? (
            <div className="space-y-4 flex-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : selectedThread ? (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {selectedThread.messages && selectedThread.messages.length > 0 ? (
                  selectedThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className="flex-shrink-0">
                        {message.role === 'user' ? (
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                            {selectedThread.user.firstName.charAt(0)}
                            {selectedThread.user.lastName.charAt(0)}
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-xs opacity-70 mb-1">
                          {message.role === 'user' ? 'Utilisateur' : 'Assistant'}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <div className="text-xs opacity-70 mt-1">
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
                    <p>Aucun message dans cette discussion</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : null}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={closeDialog}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
