import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle,
  BookOpen,
  Target,
  Clock,
  TrendingUp,
  CheckCircle,
  Settings,
  Zap
} from 'lucide-react';

const TypingIndicator = ({ isModifying }) => (
  <div className="flex justify-start mb-4">
    <div className="flex items-start gap-3 max-w-[80%] message-slide-in">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
          </div>
          <span className="text-sm text-gray-600 ml-1">
            {isModifying ? 'Modifying your roadmap...' : 'Thinking...'}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const ChatInterface = ({ user, roadmapProgress, modules, onRoadmapUpdate }) => {
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content: `Hi${user?.username ? ` ${user.username}` : ''}! 👋 I'm your learning assistant. I can help you with:
      
• 📚 Understanding your learning roadmap

• 🎯 Setting study goals and schedules  

• 📝 Summarising completed modules

• 💡 Suggesting next steps

• 🔄 Modifying your learning plan

**Try asking me to:**
- "Make my roadmap more challenging"
- "Add more JavaScript modules"
- "Slow down the pace"

What would you like to work on today?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [chatMessage, setChatMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModifying, setIsModifying] = useState(false);
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
    const currentMessage = chatMessage;
    setChatMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Check if this is a roadmap modification request
      const isModificationRequest = detectModificationRequest(currentMessage);
      
      if (isModificationRequest) {
        setIsModifying(true);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: currentMessage,
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
          suggestions: data.suggestions || [],
          roadmapUpdated: data.roadmapUpdated || false,
          updateDetails: data.updateDetails || null
        };
        
        setChatHistory(prev => [...prev, assistantMessage]);

        // If roadmap was updated, trigger refresh
        if (data.roadmapUpdated && onRoadmapUpdate) {
          console.log("🔄 Roadmap was updated, triggering refresh...");
          setTimeout(() => {
            onRoadmapUpdate();
          }, 1000); // Small delay to ensure DB is updated
        }
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
      setIsModifying(false);
    }
  };

  // Detect if message is requesting roadmap modification
  const detectModificationRequest = (message) => {
    const lowerMessage = message.toLowerCase();
    const modificationKeywords = [
      'modify', 'change', 'update', 'edit', 'adjust',
      'increase', 'decrease', 'add', 'remove', 'delete',
      'difficulty', 'pace', 'speed', 'challenging', 'easier',
      'module', 'roadmap', 'plan', 'path'
    ];

    return modificationKeywords.some(keyword => lowerMessage.includes(keyword)) &&
           (lowerMessage.includes('roadmap') || lowerMessage.includes('plan') || 
            lowerMessage.includes('module') || lowerMessage.includes('difficulty') ||
            lowerMessage.includes('pace'));
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
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 message-slide-in`}
      >
        <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Enhanced Avatar with amber theme */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
              : isError 
                ? 'bg-gradient-to-br from-red-500 to-red-600' 
                : 'bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300'
          }`}>
            {isUser ? (
              <User className="h-4 w-4 text-white" />
            ) : isError ? (
              <AlertCircle className="h-4 w-4 text-white" />
            ) : (
              <Bot className="h-4 w-4 text-gray-600" />
            )}
          </div>
          
          {/*  Message bubble */}
          <div className={`relative rounded-2xl px-4 py-3 shadow-sm border transition-all duration-200 ${
            isUser 
              ? 'chat-user-message' 
              : isError 
                ? 'bg-red-50 text-red-800 border-red-200 shadow-red-100'
                : 'bg-white text-gray-800 border-gray-200 shadow-gray-100 hover:shadow-md'
          }`}>
            
            {/* Message tail*/}
            <div className={`absolute top-3 w-3 h-3 transform rotate-45 ${
              isUser 
                ? 'right-[-6px] bg-gradient-to-br from-blue-500 to-blue-600 border-r border-b border-blue-600' 
                : isError
                  ? 'left-[-6px] bg-red-50 border-l border-t border-red-200'
                  : 'left-[-6px] bg-white border-l border-t border-gray-200'
            }`}/>
            
            <div className="prose prose-sm break-words relative z-10">
              {msg.content && <ReactMarkdown>{msg.content}</ReactMarkdown>}
            </div>
            
            {msg.timestamp && (
              <div className={`text-xs mt-2 font-medium ${
                isUser ? 'text-blue-900' : 'text-gray-500'
              }`}>
                {formatTimestamp(msg.timestamp)}
              </div>
            )}
            
            {/* Roadmap update notification with enhanced styling */}
            {msg.roadmapUpdated && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  <span>Roadmap Updated!</span>
                </div>
                {msg.updateDetails && (
                  <div className="text-xs text-emerald-700 mt-1">
                    {msg.updateDetails.modificationType?.replace('_', ' ')} applied
                    {msg.updateDetails.newStructure && (
                      <span> • {msg.updateDetails.newStructure.totalModules} modules • {msg.updateDetails.newStructure.estimatedWeeks} weeks</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Suggestions with amber theme */}
            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-gray-500 font-medium">Suggestions:</div>
                <div className="flex flex-wrap gap-2">
                  {msg.suggestions.map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-2 px-3 rounded-full border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                  ))}
                </div>
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
      icon: <Zap className="h-4 w-4" />,
      label: "Add modules",
      message: "Add more hands-on projects to my roadmap"
    }
  ];

  return (
    <div className="flex flex-col border-t md:border-t-0 md:border-l h-full bg-background">
      {/* Header*/}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center">
            <Bot className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium">Learning Assistant</h3>
            <p className="text-xs text-muted-foreground">
              {isLoading ? (isModifying ? 'Modifying roadmap...' : 'Thinking...') : 'Ready to help'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {chatHistory.length <= 1 && (
        <div className="p-4 border-b">
          {/* <div className="text-xs text-muted-foreground mb-3">Quick actions:</div> */}
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="h-auto p-3 flex flex-col items-center gap-2 text-xs transition-all duration-200 hover:bg-lumos-primary-light hover:border-lumos-primary hover:shadow-sm transform hover:scale-[1.02] rounded-full"
              onClick={() => {
                setChatMessage(action.message);
              }}
            >
              <div className="p-1 rounded-full bg-lumos-primary-light text-lumos-primary-dark">
                {action.icon}
              </div>
              <span className="font-medium">{action.label}</span>
            </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {chatHistory.map(renderMessage)}
        
        {/* Loading indicator */}
        {isLoading && <TypingIndicator isModifying={isModifying} />}
        
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

      {/* Input form with amber theme */}
      <form onSubmit={handleSendMessage} className="flex p-4 border-t bg-gray-50/50 gap-3">
        <div className="flex-1 relative">
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100 transition-all duration-200 shadow-sm"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={isLoading ? "Please wait..." : "Ask about your learning or modify your roadmap..."}
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !chatMessage.trim()}
          className="btn-primary-rounded w-12 h-12 p-0 disabled:bg-gray-300 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-black" />
          ) : (
            <Send className="h-5 w-5 text-black" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default ChatInterface;