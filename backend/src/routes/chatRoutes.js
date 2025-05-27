// src/routes/chatRoutes.js - Enhanced with roadmap editing
import express from 'express';
import chatService from '../services/chatService.js';

const router = express.Router();

// Main chat message endpoint with roadmap editing support
router.post('/message', async (req, res) => {
  const { message, context, chatHistory } = req.body;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Message is required' 
    });
  }

  if (!context || !context.user || !context.user.id) {
    return res.status(400).json({ 
      success: false, 
      error: 'User context is required' 
    });
  }

  try {
    console.log("💬 Processing chat message for user:", context.user.id);
    console.log("📝 Message:", message);

    // Detect if this is a roadmap modification request
    const roadmapEditType = detectRoadmapEditRequest(message);
    
    if (roadmapEditType) {
      console.log("🔧 Detected roadmap edit request:", roadmapEditType);
      
      // Handle roadmap modification
      const editResponse = await chatService.processRoadmapModification(
        context.user.id,
        message,
        roadmapEditType,
        {
          roadmapContext: context.roadmap,
          modulesContext: context.modules,
          chatHistory: chatHistory || []
        }
      );

      return res.json({
        success: true,
        response: editResponse.response,
        roadmapUpdated: editResponse.roadmapUpdated,
        updateDetails: editResponse.updateDetails,
        suggestions: generateRoadmapEditSuggestions(roadmapEditType),
        context: {
          messageProcessed: message,
          editType: roadmapEditType,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Regular chat processing
    const responseType = detectResponseType(message);
    const commonOptions = {
      responseType,
      chatHistory: chatHistory || [],
      roadmapContext: context.roadmap,
      modulesContext: context.modules,
      temperature: 0.3,
      maxTokens: 800
    };

    // const chatResponse = await chatService.processUserMessage(
    //   context.user.id, 
    //   message, 
    //   options
    // );

    let chatResponse;
    if (responseType !== 'chat') {
      chatResponse = await chatService.processUserMessage(
        context.user.id, 
        message, 
        { ...commonOptions, responseType }
      );
    } else {
      chatResponse = await chatService.processGeneralMessage(
        context.user.id,
        message
      );
    }

    res.json({
      success: true,
      response: chatResponse.response,
      suggestions: [],
      context: {
        messageProcessed: chatResponse.message,
        timestamp: chatResponse.timestamp
      }
    });


    const suggestions = await generateSuggestions(message, context);

    console.log("✅ Chat response generated successfully");

    res.json({
      success: true,
      response: chatResponse.response,
      suggestions: suggestions,
      context: {
        messageProcessed: chatResponse.message,
        timestamp: chatResponse.timestamp
      }
    });

  } catch (err) {
    console.error('❌ Chat message error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process message',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Dedicated roadmap editing endpoint
router.post('/edit-roadmap', async (req, res) => {
  const { userId, editRequest, currentRoadmap } = req.body;
  
  if (!userId || !editRequest) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID and edit request are required' 
    });
  }

  try {
    console.log("🔧 Processing roadmap edit request:", {
      userId,
      editRequest: editRequest.substring(0, 100) + '...'
    });

    const editResponse = await chatService.processRoadmapModification(
      userId,
      editRequest,
      'general',
      { currentRoadmap }
    );

    res.json({
      success: true,
      response: editResponse.response,
      roadmapUpdated: editResponse.roadmapUpdated,
      updateDetails: editResponse.updateDetails,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Roadmap edit error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process roadmap edit',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Helper function to detect roadmap edit requests
function detectRoadmapEditRequest(message) {
  const lowerMessage = message.toLowerCase();
  
  // Difficulty adjustments
  if (lowerMessage.includes('increase') && (lowerMessage.includes('difficulty') || lowerMessage.includes('challenge'))) {
    return 'increase_difficulty';
  }
  if (lowerMessage.includes('decrease') && (lowerMessage.includes('difficulty') || lowerMessage.includes('easier'))) {
    return 'decrease_difficulty';
  }
  
  // Module modifications
  if (lowerMessage.includes('add') && (lowerMessage.includes('module') || lowerMessage.includes('topic'))) {
    return 'add_modules';
  }
  if (lowerMessage.includes('remove') && (lowerMessage.includes('module') || lowerMessage.includes('topic'))) {
    return 'remove_modules';
  }
  
  // Time adjustments
  if (lowerMessage.includes('faster') || lowerMessage.includes('speed up') || lowerMessage.includes('accelerate')) {
    return 'accelerate_pace';
  }
  if (lowerMessage.includes('slower') || lowerMessage.includes('slow down') || lowerMessage.includes('more time')) {
    return 'slow_pace';
  }
  
  // Focus changes
  if (lowerMessage.includes('focus more on') || lowerMessage.includes('emphasize')) {
    return 'change_focus';
  }
  
  // Complete regeneration
  if (lowerMessage.includes('regenerate') || lowerMessage.includes('create new') || lowerMessage.includes('start over')) {
    return 'regenerate';
  }
  
  // General roadmap changes
  if ((lowerMessage.includes('change') || lowerMessage.includes('modify') || lowerMessage.includes('update')) && 
      (lowerMessage.includes('roadmap') || lowerMessage.includes('plan') || lowerMessage.includes('path'))) {
    return 'general_modification';
  }
  
  return null;
}

// Helper function to detect regular response types
function detectResponseType(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('progress') || lowerMessage.includes('summary') || lowerMessage.includes('completed')) {
    return 'progress_analysis';
  }
  
  if (lowerMessage.includes('next') || lowerMessage.includes('should i') || lowerMessage.includes('recommend')) {
    return 'roadmap_advice';
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('stuck') || lowerMessage.includes('difficult')) {
    return 'technical_guidance';
  }
  
  if (lowerMessage.includes('schedule') || lowerMessage.includes('plan') || lowerMessage.includes('time')) {
    return 'study_planning';
  }
  
  if (lowerMessage.includes('motivation') || lowerMessage.includes('discouraged') || lowerMessage.includes('goal')) {
    return 'motivation';
  }
  
  return 'chat';
}

// Generate suggestions for roadmap editing
function generateRoadmapEditSuggestions(editType) {
  const suggestions = {
    'increase_difficulty': [
      "Add more advanced projects to my roadmap",
      "Include industry-level challenges",
      "What advanced topics should I explore?"
    ],
    'decrease_difficulty': [
      "Break down complex modules into smaller parts",
      "Add more beginner-friendly resources",
      "Extend the timeline for better understanding"
    ],
    'add_modules': [
      "Add modules about specific frameworks I'm interested in",
      "Include more hands-on projects",
      "Add modules about industry best practices"
    ],
    'remove_modules': [
      "Focus only on essential skills for my goals",
      "Remove topics I already know well",
      "Streamline the roadmap for faster completion"
    ],
    'accelerate_pace': [
      "Create an intensive 30-day learning plan",
      "Focus on the most critical skills first",
      "What can I skip to reach my goals faster?"
    ],
    'slow_pace': [
      "Extend deadlines to reduce pressure",
      "Add more practice time between modules",
      "Break down complex topics into smaller chunks"
    ]
  };
  
  return suggestions[editType] || [
    "What other changes would you like to make?",
    "How else can I customize your learning path?",
    "Any specific topics you'd like to focus on?"
  ];
}

// Generate contextual suggestions for regular chat
async function generateSuggestions(message, context) {
  const suggestions = [];
  const lowerMessage = message.toLowerCase();
  
  // Add roadmap editing suggestions if user seems interested in modifications
  if (lowerMessage.includes('roadmap') || lowerMessage.includes('plan') || lowerMessage.includes('learning')) {
    suggestions.push("Can you adjust the difficulty of my roadmap?");
    suggestions.push("Add more practical projects to my plan");
    suggestions.push("Focus more on specific technologies");
  }
  
  // Progress-related suggestions
  else if (lowerMessage.includes('progress') || lowerMessage.includes('summary')) {
    suggestions.push("What should I focus on next?");
    suggestions.push("How can I improve my learning pace?");
    suggestions.push("Customize my roadmap based on progress");
  }
  
  // Default suggestions based on context
  else {
    if (context.roadmap) {
      if (context.roadmap.completedPercentage < 25) {
        suggestions.push("Is my roadmap too difficult for a beginner?");
        suggestions.push("Can you add more foundational topics?");
      } else if (context.roadmap.completedPercentage > 50) {
        suggestions.push("Can you increase the difficulty level?");
        suggestions.push("Add more advanced modules to my roadmap");
      }
      
      suggestions.push("How can I customize my learning path?");
    }
  }
  
  return suggestions.slice(0, 3);
}

export default router;