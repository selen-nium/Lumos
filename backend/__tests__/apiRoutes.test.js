const request = require('supertest');

const express = require('express');
const app = express();

// middleware
app.use(express.json());

// Mock services for API tests
const mockRoadmapBusinessService = {
  generateRoadmap: jest.fn()
};

const mockChatService = {
  processUserMessage: jest.fn(),
  processRoadmapModification: jest.fn()
};

// Mock route handlers
app.post('/api/roadmap', async (req, res) => {
  try {
    const { userId, profileData } = req.body;
    
    // Basic validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Call the mocked service
    const result = await mockRoadmapBusinessService.generateRoadmap(userId, 'token', profileData);
    
    res.json({
      success: true,
      roadmap: result.roadmap,
      message: 'Roadmap generated successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message, options = {} } = req.body;
    
    // Basic validation
    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'User ID and message are required'
      });
    }

    // Detect if it's a roadmap modification request
    const isModification = message.toLowerCase().includes('modify') || 
                          message.toLowerCase().includes('change') ||
                          message.toLowerCase().includes('update');

    let result;
    if (isModification) {
      result = await mockChatService.processRoadmapModification(userId, message, 'general_modification');
    } else {
      result = await mockChatService.processUserMessage(userId, message, options);
    }
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

describe('API Routes Integration Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/roadmap', () => {
    test('creates roadmap successfully with valid data', async () => {
      // Mock successful roadmap generation
      mockRoadmapBusinessService.generateRoadmap.mockResolvedValue({
        success: true,
        roadmap: {
          path_id: 'path_123',
          path_name: 'Full Stack Developer Path',
          user_id: 'user123',
          modules: [
            { module_name: 'JavaScript Basics', difficulty: 'beginner' },
            { module_name: 'React Fundamentals', difficulty: 'intermediate' }
          ]
        }
      });

      const requestData = {
        userId: 'user123',
        profileData: {
          skills: [{ skill_name: 'HTML' }],
          goals: [{ goal_title: 'Learn Full Stack' }],
          experienceLevel: 'beginner'
        }
      };

      const response = await request(app)
        .post('/api/roadmap')
        .send(requestData)
        .expect(200);

      // Check response structure
      expect(response.body).toMatchObject({
        success: true,
        message: 'Roadmap generated successfully',
        roadmap: {
          path_id: 'path_123',
          path_name: 'Full Stack Developer Path',
          user_id: 'user123'
        }
      });

      // Verify service was called correctly
      expect(mockRoadmapBusinessService.generateRoadmap).toHaveBeenCalledWith(
        'user123',
        'token',
        requestData.profileData
      );
    });

    test('returns 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/roadmap')
        .send({
          profileData: { skills: [] }
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User ID is required'
      });

      // Service should not be called
      expect(mockRoadmapBusinessService.generateRoadmap).not.toHaveBeenCalled();
    });

    test('handles service errors', async () => {
      // Mock service throwing an error
      mockRoadmapBusinessService.generateRoadmap.mockRejectedValue(
        new Error('User not found')
      );

      const response = await request(app)
        .post('/api/roadmap')
        .send({ userId: 'invalid_user' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'User not found'
      });
    });

    test('handles empty request body', async () => {
      const response = await request(app)
        .post('/api/roadmap')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User ID is required');
    });

    test('accepts request without profileData', async () => {
      mockRoadmapBusinessService.generateRoadmap.mockResolvedValue({
        success: true,
        roadmap: { path_id: 'path_456', path_name: 'Basic Path' }
      });

      const response = await request(app)
        .post('/api/roadmap')
        .send({ userId: 'user123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockRoadmapBusinessService.generateRoadmap).toHaveBeenCalledWith(
        'user123',
        'token',
        undefined
      );
    });
  });

  describe('POST /api/chat', () => {
    test('processes regular chat message successfully', async () => {
      // Mock successful chat processing
      mockChatService.processUserMessage.mockResolvedValue({
        message: 'Hello, how are you?',
        response: 'I\'m doing great! How can I help you with your learning today?',
        context: { type: 'general_chat' },
        timestamp: '2024-01-15T10:30:00Z'
      });

      const requestData = {
        userId: 'user123',
        message: 'Hello, how are you?',
        options: { responseType: 'chat' }
      };

      const response = await request(app)
        .post('/api/chat')
        .send(requestData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Hello, how are you?',
        response: 'I\'m doing great! How can I help you with your learning today?',
        context: { type: 'general_chat' }
      });

      expect(mockChatService.processUserMessage).toHaveBeenCalledWith(
        'user123',
        'Hello, how are you?',
        { responseType: 'chat' }
      );
    });

    test('processes roadmap modification request', async () => {
      mockChatService.processRoadmapModification.mockResolvedValue({
        message: 'Please modify my roadmap to be more challenging',
        response: 'I\'ve successfully updated your roadmap to include more advanced modules!',
        roadmapUpdated: true,
        timestamp: '2024-01-15T10:30:00Z'
      });

      const requestData = {
        userId: 'user123',
        message: 'Please modify my roadmap to be more challenging'
      };

      const response = await request(app)
        .post('/api/chat')
        .send(requestData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        roadmapUpdated: true,
        response: expect.stringContaining('updated your roadmap')
      });

      expect(mockChatService.processRoadmapModification).toHaveBeenCalledWith(
        'user123',
        'Please modify my roadmap to be more challenging',
        'general_modification'
      );
    });

    test('returns 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User ID and message are required'
      });

      expect(mockChatService.processUserMessage).not.toHaveBeenCalled();
    });

    test('returns 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          userId: 'user123'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User ID and message are required'
      });
    });

    test('handles chat service errors', async () => {
      mockChatService.processUserMessage.mockRejectedValue(
        new Error('Chat processing failed')
      );

      const response = await request(app)
        .post('/api/chat')
        .send({
          userId: 'user123',
          message: 'Hello'
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Chat processing failed'
      });
    });

    test('handles empty message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          userId: 'user123',
          message: ''
        })
        .expect(400);

      expect(response.body.error).toContain('User ID and message are required');
    });

    test('detects modification keywords correctly', async () => {
      const modificationKeywords = ['modify', 'change', 'update'];
      
      for (const keyword of modificationKeywords) {
        jest.clearAllMocks();
        mockChatService.processRoadmapModification.mockResolvedValue({
          message: `Please ${keyword} my roadmap`,
          response: 'Roadmap updated!',
          roadmapUpdated: true
        });

        await request(app)
          .post('/api/chat')
          .send({
            userId: 'user123',
            message: `Please ${keyword} my roadmap`
          })
          .expect(200);

        expect(mockChatService.processRoadmapModification).toHaveBeenCalled();
        expect(mockChatService.processUserMessage).not.toHaveBeenCalled();
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      
      mockChatService.processUserMessage.mockResolvedValue({
        message: longMessage,
        response: 'I understand your long message',
        context: {}
      });

      const response = await request(app)
        .post('/api/chat')
        .send({
          userId: 'user123',
          message: longMessage
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});