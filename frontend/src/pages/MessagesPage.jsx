import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '@/components/common/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  ArrowLeft, 
  MessageCircle, 
  Clock,
  CheckCircle2
} from 'lucide-react';

const MessagesPage = () => {
  const { connectionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState(null);
  const [otherPerson, setOtherPerson] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConnectionAndMessages();
  }, [connectionId, user]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
      markMessagesAsRead();
    }
  }, [messages]);

  // Real-time message subscription
  useEffect(() => {
    if (!connectionId) return;

    const subscription = supabase
      .channel(`messages:${connectionId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `connection_request_id=eq.${connectionId}`
        }, 
        (payload) => {
          const newMessage = payload.new;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [connectionId]);

  const fetchConnectionAndMessages = async () => {
    if (!user || !connectionId) return;

    try {
      setLoading(true);

      // Fetch connection details
      const { data: connectionData, error: connectionError } = await supabase
        .from('connection_requests')
        .select(`
          request_id,
          from_user_id,
          to_user_id,
          status,
          created_at,
          from_profile:profiles!connection_requests_from_user_id_fkey (
            id,
            username,
            email,
            role,
            company
          ),
          to_profile:profiles!connection_requests_to_user_id_fkey (
            id,
            username,
            email,
            role,
            company
          )
        `)
        .eq('request_id', connectionId)
        .eq('status', 'accepted')
        .single();

      if (connectionError) throw connectionError;

      if (!connectionData) {
        throw new Error('Connection not found or not accepted');
      }

      // Verify user is part of this connection
      if (connectionData.from_user_id !== user.id && connectionData.to_user_id !== user.id) {
        throw new Error('Unauthorized access to this conversation');
      }

      setConnection(connectionData);

      // Determine the other person in the conversation
      const isFromUser = connectionData.from_user_id === user.id;
      const otherPersonData = isFromUser ? connectionData.to_profile : connectionData.from_profile;
      setOtherPerson(otherPersonData);

      // Fetch messages for this connection
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_request_id', connectionId)
        .order('sent_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(messagesData || []);

    } catch (error) {
      console.error('Error fetching connection and messages:', error);
      alert('Error loading conversation. Redirecting back to inbox.');
      navigate('/inbox');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markMessagesAsRead = async () => {
    if (!user || messages.length === 0) return;

    try {
      // Mark unread messages from the other person as read
      const unreadMessages = messages.filter(
        msg => msg.sender_id !== user.id && !msg.read_at
      );

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.message_id);
        
        const { error } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('message_id', messageIds);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !connection || !otherPerson) return;

    try {
      setSending(true);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          connection_request_id: connectionId,
          sender_id: user.id,
          receiver_id: otherPerson.id,
          message_text: newMessage.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Add message to local state (real-time subscription will also add it, but this is faster)
      setMessages(prev => [...prev, data]);
      setNewMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-3">Loading conversation...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/inbox')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
          </Button>
          
          {otherPerson && (
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-white">
                  {getInitials(otherPerson.username || otherPerson.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold">
                  {otherPerson.username || 'Anonymous User'}
                </h1>
                <p className="text-sm text-gray-600">
                  {otherPerson.role} {otherPerson.company && `at ${otherPerson.company}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Messages Container */}
        <Card className="flex flex-col h-[600px]">
          {/* Messages Area */}
          <CardContent className="flex-1 p-4 overflow-y-auto">
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isFromMe = message.sender_id === user.id;
                  const showAvatar = index === 0 || 
                    messages[index - 1].sender_id !== message.sender_id;

                  return (
                    <div
                      key={message.message_id}
                      className={`flex items-end gap-2 ${
                        isFromMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!isFromMe && showAvatar && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                            {getInitials(otherPerson?.username || otherPerson?.email)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      {!isFromMe && !showAvatar && (
                        <div className="w-8" /> // Spacer for alignment
                      )}

                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isFromMe
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.message_text}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span
                            className={`text-xs ${
                              isFromMe ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {formatMessageTime(message.sent_at)}
                          </span>
                          
                          {isFromMe && (
                            <div className="ml-2">
                              {message.read_at ? (
                                <CheckCircle2 className="h-3 w-3 text-blue-100" />
                              ) : (
                                <Clock className="h-3 w-3 text-blue-200" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">Start the conversation!</p>
                <p className="text-sm">Send your first message below.</p>
              </div>
            )}
          </CardContent>

          {/* Message Input */}
          <div className="border-t p-4">
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={sending}
                maxLength={1000}
              />
              <Button 
                type="submit" 
                disabled={!newMessage.trim() || sending}
                size="sm"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <div className="text-xs text-gray-500 mt-1 text-right">
              {newMessage.length}/1000
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default MessagesPage;