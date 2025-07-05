import express from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { responseFormatter } from '../middleware/responseFormatter.js';
import chatService from '../services/chatService.js';

const router = express.Router();
router.use(responseFormatter);

const basicValidation = (req, res, next) => {
  if (!req.body?.context?.user?.id) {
    return res.apiError('User context required', 400);
  }
  req.userId = req.body.context.user.id;
  next();
};

// Main chat endpoint
router.post('/message', basicValidation, asyncHandler(async (req, res) => {
  const { message, context, chatHistory } = req.body;
  
  // Validate input
  if (!message?.trim()) {
    return res.apiError('Message cannot be empty', 400);
  }

  if (message.length > 2000) {
    return res.apiError('Message too long. Please keep it under 2000 characters.', 400);
  }

  console.log(`💬 Processing chat message for user: ${req.userId}`);

  try {
    const roadmapEditType = detectRoadmapEditRequest(message); //detect roadmap modif request
    
    if (roadmapEditType) {
      console.log("🔧 Detected roadmap modification request:", roadmapEditType);
      
      try {
        const editResponse = await chatService.processRoadmapModification(
          req.userId,
          message,
          roadmapEditType,
          {
            roadmapContext: context.roadmap,
            modulesContext: context.modules,
            chatHistory: chatHistory || []
          }
        );

        return res.apiSuccess({
          response: editResponse.response,
          roadmapUpdated: editResponse.roadmapUpdated,
          updateDetails: editResponse.updateDetails,
          suggestions: generateRoadmapEditSuggestions(roadmapEditType, context.roadmap?.completedPercentage || 0)
        }, 'Roadmap updated successfully');

      } catch (modificationError) {
        console.error("❌ Roadmap modification error:", modificationError);
        // fall back to regular chat
        console.log("🔄 Falling back to regular chat processing...");
      }
    }

    // Regular chat 
    console.log("💬 Processing as regular chat message");
    
    const responseType = detectResponseType(message);
    const chatResponse = await chatService.processUserMessage(
      req.userId, 
      message, 
      {
        responseType,
        chatHistory: chatHistory || [],
        roadmapContext: context.roadmap,
        modulesContext: context.modules,
        temperature: 0.3,
        maxTokens: 800
      }
    );

    const suggestions = await generateSuggestions(message, context);

    res.apiSuccess({
      response: chatResponse.response,
      suggestions: suggestions,
      context: {
        messageProcessed: chatResponse.message,
        timestamp: chatResponse.timestamp
      }
    }, 'Message processed successfully');

  } catch (error) {
    if (error.message?.includes('OpenAI')) {
      throw new Error('AI service temporarily unavailable. Please try again in a moment.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Request timed out. Please try a shorter message.');
    } else {
      throw new Error('Failed to process your message. Please try again.');
    }
  }
}));

// roadmap editing endpoint
router.post('/edit-roadmap', basicValidation, asyncHandler(async (req, res) => {
  const { editRequest, editType, currentRoadmap } = req.body;
  
  if (!editRequest?.trim()) {
    return res.apiError('Edit request cannot be empty', 400);
  }

  console.log("🔧 Processing roadmap edit request:", {
    userId: req.userId,
    editType,
    editRequest: editRequest.substring(0, 100) + '...'
  });

  // Determine edit type if not provided
  const detectedEditType = editType || detectRoadmapEditRequest(editRequest);
  
  if (!detectedEditType) {
    return res.apiError('Could not understand your modification request. Please be more specific.', 400);
  }

  const editResponse = await chatService.processRoadmapModification(
    req.userId,
    editRequest,
    detectedEditType,
    { currentRoadmap }
  );

  res.apiSuccess({
    response: editResponse.response,
    roadmapUpdated: editResponse.roadmapUpdated,
    updateDetails: editResponse.updateDetails
  }, 'Roadmap modification completed');
}));

// Preview roadmap modification without saving
router.post('/preview-roadmap-edit', async (req, res) => {
  try {
    const { userId, editRequest, editType } = req.body;
    
    if (!userId || !editRequest) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID and edit request are required' 
      });
    }

    console.log("👁️ Processing roadmap edit preview:", {
      userId,
      editType,
      editRequest: editRequest.substring(0, 100) + '...'
    });

    const detectedEditType = editType || chatService.detectModificationType(editRequest);
    
    if (!detectedEditType) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine modification type from request'
      });
    }

    const previewResponse = await chatService.previewRoadmapModification(
      userId,
      editRequest,
      detectedEditType
    );

    res.json({
      success: true,
      preview: previewResponse.preview,
      changes: previewResponse.changes,
      modifiedStructure: previewResponse.modifiedStructure,
      timestamp: previewResponse.timestamp
    });

  } catch (error) {
    console.error('❌ Roadmap preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate roadmap preview'
    });
  }
});

// Get roadmap modification suggestions
router.get('/roadmap-suggestions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { progress = 0 } = req.query;
    
    console.log("💡 Getting roadmap modification suggestions for user:", userId);

    const suggestions = await chatService.generateRoadmapSuggestions(userId, parseInt(progress));

    res.json({
      success: true,
      suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting roadmap suggestions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get suggestions'
    });
  }
});

// Helper functions

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

function detectRoadmapEditRequest(message) {
  const lowerMessage = message.toLowerCase();

  const modificationPatterns = [
    // Difficulty changes
    { keywords: ['increase', 'difficulty'], type: 'increase_difficulty' },
    { keywords: ['more', 'challenging'], type: 'increase_difficulty' },
    { keywords: ['harder', 'advanced'], type: 'increase_difficulty' },
    { keywords: ['decrease', 'difficulty'], type: 'decrease_difficulty' },
    { keywords: ['easier', 'simpler'], type: 'decrease_difficulty' },
    
    // Module changes
    { keywords: ['add', 'module'], type: 'add_modules' },
    { keywords: ['add', 'topic'], type: 'add_modules' },
    { keywords: ['include', 'more'], type: 'add_modules' },
    { keywords: ['remove', 'module'], type: 'remove_modules' },
    { keywords: ['skip', 'topic'], type: 'remove_modules' },
    { keywords: ['delete', 'module'], type: 'remove_modules' },
    
    // Pace changes
    { keywords: ['speed', 'up'], type: 'accelerate_pace' },
    { keywords: ['faster', 'pace'], type: 'accelerate_pace' },
    { keywords: ['slow', 'down'], type: 'slow_pace' },
    { keywords: ['more', 'time'], type: 'slow_pace' },
    
    // Focus changes
    { keywords: ['focus', 'more'], type: 'change_focus' },
    { keywords: ['emphasize'], type: 'change_focus' },
    
    // General roadmap changes
    { keywords: ['modify', 'roadmap'], type: 'general_modification' },
    { keywords: ['change', 'plan'], type: 'general_modification' },
    { keywords: ['update', 'roadmap'], type: 'general_modification' },
    { keywords: ['adjust', 'roadmap'], type: 'general_modification' }
  ];
  
  // Check each pattern
  for (const pattern of modificationPatterns) {
    const hasAllKeywords = pattern.keywords.every(keyword => 
      lowerMessage.includes(keyword)
    );
    if (hasAllKeywords) {
      return pattern.type;
    }
  }
  
  // // Special case: "Make my roadmap more challenging" should definitely be detected
  // if (lowerMessage.includes('make') && lowerMessage.includes('roadmap') && 
  //     (lowerMessage.includes('challenging') || lowerMessage.includes('difficult'))) {
  //   return 'increase_difficulty';
  // }
  
  return null;
}

function generateRoadmapEditSuggestions(editType, currentProgress = 0) {
  const suggestions = {
    'increase_difficulty': [
      "Add more advanced projects to my roadmap",
      "Include industry-level challenges",
      "What advanced topics should I explore next?",
      "Make the projects more complex"
    ],
    'decrease_difficulty': [
      "Break down complex modules into smaller parts",
      "Add more beginner-friendly resources",
      "Extend the timeline for better understanding",
      "Include more guided tutorials"
    ],
    'add_modules': [
      "Add modules about specific frameworks I'm interested in",
      "Include more hands-on projects",
      "Add modules about industry best practices",
      "Focus more on practical applications"
    ],
    'remove_modules': [
      "Remove topics I already know well",
      "Skip beginner concepts I'm comfortable with",
      "Focus only on essential modules",
      "Streamline the learning path"
    ],
    'accelerate_pace': [
      "Speed up the easy modules",
      "Combine related topics",
      "Focus on essential concepts only",
      "Create an intensive study plan"
    ],
    'slow_pace': [
      "Give me more time for each module",
      "Add more practice exercises",
      "Include review sessions",
      "Extend the timeline for complex topics"
    ],
    'change_focus': [
      "Focus more on backend development",
      "Emphasize frontend technologies",
      "Add more database topics",
      "Include more design principles"
    ]
  };
  
  // Add progress-based suggestions
  const baseSuggestions = suggestions[editType] || [
    "What other changes would you like to make?",
    "How else can I customize your learning path?",
    "Any specific topics you'd like to focus on?",
    "Should I adjust the difficulty level?"
  ];

  // Add contextual suggestions based on progress
  if (currentProgress < 25) {
    baseSuggestions.push("Make the roadmap more beginner-friendly");
  } else if (currentProgress > 75) {
    baseSuggestions.push("Add advanced topics for the final stretch");
  }

  return baseSuggestions.slice(0, 4);
}

async function generateSuggestions(message, context) {
  try {
    const suggestions = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('roadmap') || lowerMessage.includes('plan')) {
      suggestions.push("Can you adjust the difficulty of my roadmap?");
      suggestions.push("Add more practical projects to my plan");
      suggestions.push("Focus more on specific technologies");
      suggestions.push("Change the pace of my learning");
    } else if (lowerMessage.includes('progress')) {
      suggestions.push("What should I focus on next?");
      suggestions.push("How can I improve my learning pace?");
      suggestions.push("Customize my roadmap based on progress");
      suggestions.push("Add more challenging modules");
    } else if (context.roadmap) {
      if (context.roadmap.completedPercentage < 25) {
        suggestions.push("Is my roadmap too difficult for a beginner?");
        suggestions.push("Can you add more foundational topics?");
        suggestions.push("Slow down the pace for better understanding");
      } else if (context.roadmap.completedPercentage > 50) {
        suggestions.push("Can you increase the difficulty level?");
        suggestions.push("Add more advanced modules to my roadmap");
        suggestions.push("Include more real-world projects");
      } else {
        suggestions.push("How can I customize my learning path?");
        suggestions.push("Add more hands-on practice");
        suggestions.push("Adjust the module difficulty");
      }
    } else {
      // Default suggestions
      suggestions.push("Can you help me with my learning?");
      suggestions.push("What should I study next?");
      suggestions.push("Create a personalized roadmap for me");
    }
    
    return suggestions.slice(0, 3);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [
      "Can you help me with my learning?",
      "What should I study next?",
      "How can I improve my roadmap?"
    ];
  }
}

export default router;