import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '@/components/common/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  ArrowLeft, 
  MessageCircle, 
  Clock,
  CheckCircle2,
  User,
  Building,
  Smile,
  Paperclip,
  MoreVertical,
  Heart,
  Sparkles,
  Calendar,
  MapPin
} from 'lucide-react';

// Background Pattern Component
const BackgroundPattern = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-lumos-primary/5 to-lumos-primary-light/3 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
    <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-lumos-primary/3 to-lumos-primary-muted/5 rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
  </div>
));

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
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
            company,
            profile_picture_url,
            career_stage
          ),
          to_profile:profiles!connection_requests_to_user_id_fkey (
            id,
            username,
            email,
            role,
            company,
            profile_picture_url,
            career_stage
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
      inputRef.current?.focus();

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

//   const formatMessageTime = (timestamp) => {
//     const date = new Date(timestamp);
//     const now = new Date();
//     const diffMs = now - date;
//     const diffMins = Math.floor(diffMs / 60000);
//     const diffHours = Math.floor(diffMs / 3600000);
//     const diffDays = Math.floor(diffMs / 86400000);

//     if (diffMins < 1) return 'Just now';
//     if (diffMins < 60) return `${diffMins}m ago`;
//     if (diffHours < 24) return `${diffHours}h ago`;
//     if (diffDays < 7) return `${diffDays}d ago`;
//     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//   };

  const formatDetailedTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.sent_at).toDateString();
    const previousDate = new Date(previousMessage.sent_at).toDateString();
    
    return currentDate !== previousDate;
  };

  const formatDateSeparator = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-fade-in">
              <div className="flex justify-center items-center h-64">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumos-primary"></div>
                  <span className="text-muted-foreground font-medium">Loading conversation...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
        <div className="pt-16 min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50 relative">
            {/* <BackgroundPattern /> */}
        
            <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
                
                    {/* Left Sidebar - Header & Profile */}
                    <div className="lg:col-span-1 space-y-6 animate-fade-in">
                    {/* Back Button */}
                    <div className="flex items-center gap-4">
                        <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate('/inbox')}
                        className="btn-outline-rounded hover-lift"
                        >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Inbox
                        </Button>
                    </div>
                    
                    {/* Profile Card */}
                    {otherPerson && (
                        <Card className="card-minimal-hover bg-white/80 backdrop-blur-sm border border-lumos-primary/20">
                        <CardContent className="p-6">
                            <div className="text-center space-y-4">
                            <Avatar className="w-20 h-20 ring-4 ring-lumos-primary/20 mx-auto">
                                {otherPerson.profile_picture_url ? (
                                <AvatarImage
                                    src={otherPerson.profile_picture_url}
                                    alt={otherPerson.username || ''}
                                />
                                ) : (
                                <AvatarFallback className="bg-gradient-to-br from-lumos-primary to-lumos-primary-dark text-white text-xl font-semibold">
                                    {getInitials(otherPerson.username || otherPerson.email)}
                                </AvatarFallback>
                                )}
                            </Avatar>
                            
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-foreground">
                                {otherPerson.username || 'Anonymous User'}
                                </h1>
                                <Badge className="bg-green-50 text-green-600 border-green-200 font-medium">
                                <Heart className="h-3 w-3 mr-1" />
                                Connected
                                </Badge>
                            </div>
                            
                            <div className="space-y-3 text-sm">
                                {otherPerson.role && (
                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span>{otherPerson.role}</span>
                                </div>
                                )}
                                {otherPerson.company && (
                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                    <Building className="h-4 w-4" />
                                    <span>{otherPerson.company}</span>
                                </div>
                                )}
                                {otherPerson.career_stage && (
                                <div className="flex justify-center">
                                    <Badge variant="outline" className="capitalize">
                                    {otherPerson.career_stage.replace('-', ' ')}
                                    </Badge>
                                </div>
                                )}
                            </div>
                            
                            <div className="pt-4 border-t border-border space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center justify-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Connected {new Date(connection.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                <span>{messages.length} messages</span>
                                </div>
                            </div>
                            </div>
                        </CardContent>
                        </Card>
                    )}
                    </div>

                    {/* Right Side - Messages Container */}
                    <div className="lg:col-span-2">
                        <Card className="card-minimal bg-white/90 backdrop-blur-sm border border-lumos-primary/20 overflow-hidden animate-slide-up h-full">
                            <div className="flex flex-col h-full">
                                {/* Messages Area */}
                                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                    {messages.length > 0 ? (
                                    <div className="space-y-6">
                                        {messages.map((message, index) => {
                                        const isFromMe = message.sender_id === user.id;
                                        const previousMessage = index > 0 ? messages[index - 1] : null;
                                        const showAvatar = index === 0 || 
                                            messages[index - 1].sender_id !== message.sender_id;
                                        const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

                                        return (
                                            <div key={message.message_id} className="message-slide-in">
                                            {/* Date Separator */}
                                            {showDateSeparator && (
                                                <div className="flex items-center justify-center mb-6">
                                                <div className="bg-muted/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
                                                    <span className="text-sm font-medium text-muted-foreground">
                                                    {formatDateSeparator(message.sent_at)}
                                                    </span>
                                                </div>
                                                </div>
                                            )}

                                            {/* Message */}
                                            <div className={`flex items-start gap-3 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                                                {!isFromMe && showAvatar && (
                                                <Avatar className="w-8 h-8 ring-2 ring-border flex-shrink-0">
                                                    {otherPerson?.profile_picture_url ? (
                                                    <AvatarImage
                                                        src={otherPerson.profile_picture_url}
                                                        alt={otherPerson.username || ''}
                                                    />
                                                    ) : (
                                                    <AvatarFallback className="bg-gradient-to-br from-muted to-muted-foreground/20 text-muted-foreground text-xs font-medium">
                                                        {getInitials(otherPerson?.username || otherPerson?.email)}
                                                    </AvatarFallback>
                                                    )}
                                                </Avatar>
                                                )}
                                                
                                                {!isFromMe && !showAvatar && (
                                                <div className="w-8 flex-shrink-0" /> // Spacer for alignment
                                                )}

                                                <div className={`max-w-[75%] group ${isFromMe ? 'order-first' : ''}`}>
                                                <div
                                                    className={`rounded-2xl px-3 py-2 shadow-sm transition-all hover:shadow-md ${
                                                    isFromMe
                                                        ? 'bg-gradient-to-r from-lumos-primary to-lumos-primary-dark text-white chat-user-message'
                                                        : 'bg-white text-foreground border border-border'
                                                    }`}
                                                >
                                                    <p className="text-sm leading-normal break-words">
                                                    {message.message_text}
                                                    </p>
                                                </div>
                                                
                                                {/* Message Footer */}
                                                <div className={`flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                                                    isFromMe ? 'justify-end' : 'justify-start'
                                                }`}>
                                                    <span className="text-xs text-muted-foreground">
                                                    {formatDetailedTime(message.sent_at)}
                                                    </span>
                                                    
                                                    {isFromMe && (
                                                    <div className="flex items-center gap-1">
                                                        {message.read_at ? (
                                                        <div className="flex items-center gap-1 text-green-600">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            <span className="text-xs">Read</span>
                                                        </div>
                                                        ) : (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <Clock className="h-3 w-3" />
                                                            <span className="text-xs">Sent</span>
                                                        </div>
                                                        )}
                                                    </div>
                                                    )}
                                                </div>
                                                </div>
                                            </div>
                                            </div>
                                        );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <div className="w-24 h-24 bg-gradient-to-br from-lumos-primary-light to-lumos-primary/20 rounded-full flex items-center justify-center mb-6">
                                        <MessageCircle className="h-12 w-12 text-lumos-primary" />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-3">Start the conversation!</h3>
                                        <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
                                        This is the beginning of your mentoring journey together. Send your first message below.
                                        </p>
                                    </div>
                                    )}
                                </div>

                                {/* Message Input */}
                                <div className="border-t border-border bg-white/80 backdrop-blur-sm p-4">
                                    <form onSubmit={sendMessage} className="flex gap-3 items-end">
                                    <div className="flex-1 relative">
                                        <Input
                                        ref={inputRef}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={`Message ${otherPerson?.username || 'your mentor/mentee'}...`}
                                        className="pr-12 py-3 text-base border-border focus:border-lumos-primary focus:ring-lumos-primary/20 rounded-xl bg-white"
                                        disabled={sending}
                                        maxLength={1000}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage(e);
                                            }
                                        }}
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                            disabled
                                        >
                                            <Smile className="h-4 w-4" />
                                        </Button>
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        type="submit" 
                                        disabled={!newMessage.trim() || sending}
                                        className="btn-primary-rounded h-12 w-12 p-0 hover-lift"
                                    >
                                        {sending ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                        <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                    </form>
                                    
                                    <div className="flex justify-between items-center mt-2 px-1">
                                    <div className="text-xs text-muted-foreground">
                                        Press Enter to send, Shift + Enter for new line
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {newMessage.length}/1000
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    </Layout>
  );
};

export default MessagesPage;