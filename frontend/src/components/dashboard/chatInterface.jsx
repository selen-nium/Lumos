// ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle,
  BookOpen,
  Target,
  Clock,
  TrendingUp
} from 'lucide-react';

const ChatInterface = ({ user, roadmapProgress, modules }) => {
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content: `Hi${user ? ` ${user.email.split('@')[0]}` : ''}! 👋 I'm your learning assistant. I can help you with:
      
• 📚 Understanding your learning roadmap
• 🎯 Setting study goals and schedules  
• 📝 Summarizing completed modules
• 💡 Suggesting next steps
• 🔄 Reorganizing your learning plan

What would you like to work on today?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [chatMessage, setChatMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Generate context for the AI assistant
  const generateChatContext = () => {
    const context = {
      user: {
        email: user?.email,
        id: user?.id
      },
      roadmap: roadmapProgress ? {
        title: roadmapProgress.title,
        totalModules: roadmapProgress.totalModules,
        completedModules: roadmapProgress.completedModules,
        completedPercentage: roadmapProgress.completedPercentage,
        totalHours: roadmapProgress.totalHours
      } : null,
      modules: modules?.map(module => ({
        id: module.id,
        name: module.name || module.module_name,
        isCompleted: module.isCompleted,
        sequence_order: module.sequence_order,
        difficulty: module.difficulty,
        estimated_hours: module.estimated_hours || module.estimated_completion_hours
      })) || [],
      currentTime: new Date().toISOString()
    };
    
    return context;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || isLoading) return;

    const userMessage = { 
      role: 'user', 
      content: chatMessage,
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setChatHistory(prev => [...prev, userMessage]);
    setChatMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: chatMessage,
          context: generateChatContext(),
          chatHistory: chatHistory.slice(-5) // Send last 5 messages for context
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          suggestions: data.suggestions || []
        };
        
        setChatHistory(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message);
      
      // Add error message to chat
      const errorMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setChatMessage(suggestion);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';
    const isError = msg.isError;
    
    return (
      <div 
        key={idx} 
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser ? 'bg-blue-100' : isError ? 'bg-red-100' : 'bg-muted'
          }`}>
            {isUser ? (
              <User className="h-4 w-4 text-blue-600" />
            ) : isError ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Bot className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          
          {/* Message bubble */}
          <div className={`rounded-lg px-4 py-3 ${
            isUser 
              ? 'bg-blue-600 text-white' 
              : isError 
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-muted text-muted-foreground'
          }`}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {msg.content}
            </div>
            
            {msg.timestamp && (
              <div className={`text-xs mt-2 ${
                isUser ? 'text-blue-100' : 'text-muted-foreground/60'
              }`}>
                {formatTimestamp(msg.timestamp)}
              </div>
            )}
            
            {/* Roadmap update notification */}
            {msg.roadmapUpdated && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  <span>Roadmap Updated!</span>
                </div>
                {msg.updateDetails && (
                  <div className="text-xs text-green-700 mt-1">
                    {msg.updateDetails.modificationType?.replace('_', ' ')} applied
                    {msg.updateDetails.newStructure && (
                      <span> • {msg.updateDetails.newStructure.totalModules} modules • {msg.updateDetails.newStructure.estimatedWeeks} weeks</span>
                    )}
                  </div>
                )}
              </div>
            )}
            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-muted-foreground/80">Suggestions:</div>
                {msg.suggestions.map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1 px-2"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const quickActions = [
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: "Summarize progress",
      message: "Can you summarize my learning progress so far?"
    },
    {
      icon: <Target className="h-4 w-4" />, 
      label: "Next steps",
      message: "What should I focus on next in my learning?"
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Study schedule", 
      message: "Help me create a study schedule for this week"
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Track goals",
      message: "How am I doing with my learning goals?"
    }
  ];

  return (
    <div className="md:w-1/2 flex flex-col border-t md:border-t-0 md:border-l h-full bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Bot className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Learning Assistant</h3>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Thinking...' : 'Ready to help'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {chatHistory.length <= 1 && (
        <div className="p-4 border-b">
          <div className="text-xs text-muted-foreground mb-3">Quick actions:</div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="h-auto p-3 flex flex-col items-center gap-2 text-xs"
                onClick={() => handleSendMessage({ 
                  preventDefault: () => {}, 
                  target: { value: action.message } 
                }) && setChatMessage(action.message)}
              >
                {action.icon}
                <span>{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {chatHistory.map(renderMessage)}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 border-t">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-red-800 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Connection error. Please try again.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSendMessage} className="flex p-4 border-t gap-2">
        <input
          className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          placeholder={isLoading ? "Please wait..." : "Ask about your learning..."}
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !chatMessage.trim()}
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default ChatInterface;