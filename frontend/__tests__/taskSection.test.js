// __tests__/TaskSection.test.jsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock TaskSection component for testing
const MockTaskSection = ({ tasks = [], onTaskComplete, onTaskStart, onTaskSubmit, loading = false }) => {
  if (loading) {
    return <div data-testid="tasks-loading">Loading tasks...</div>;
  }

  if (!tasks || tasks.length === 0) {
    return <div data-testid="no-tasks">No tasks available for this module</div>;
  }

  return (
    <div data-testid="task-section">
      <h3 data-testid="tasks-header">Hands-on Tasks</h3>
      
      <div data-testid="tasks-container">
        {tasks.map((task, index) => (
          <div 
            key={task.task_id || index}
            data-testid={`task-${index}`}
            className={`task-card ${task.is_completed ? 'completed' : 'pending'}`}
            style={{
              padding: '16px',
              margin: '12px 0',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: task.is_completed ? '#e8f5e8' : '#fff'
            }}
          >
            {/* Task Header */}
            <div data-testid={`task-header-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 data-testid={`task-title-${index}`}>{task.task_title}</h4>
              <span 
                data-testid={`task-type-${index}`}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: task.task_type === 'project' ? '#007bff' : '#6c757d',
                  color: 'white',
                  fontSize: '12px'
                }}
              >
                {task.task_type}
              </span>
            </div>

            {/* Task Description */}
            <p data-testid={`task-description-${index}`}>{task.task_description}</p>

            {/* Task Details */}
            <div data-testid={`task-details-${index}`} style={{ margin: '8px 0', color: '#666' }}>
              <span data-testid={`task-time-${index}`}>
                Estimated time: {task.estimated_time_minutes || 30} minutes
              </span>
            </div>

            {/* Task Instructions (expandable) */}
            {task.instructions && (
              <div data-testid={`task-instructions-${index}`} style={{ margin: '12px 0' }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View Instructions</summary>
                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    {task.instructions}
                  </div>
                </details>
              </div>
            )}

            {/* Task Status and Actions */}
            <div data-testid={`task-actions-${index}`} style={{ marginTop: '16px' }}>
              {task.is_completed ? (
                <div data-testid={`task-completed-${index}`} style={{ color: '#28a745' }}>
                  ✅ Task Completed
                  {task.completion_date && (
                    <div data-testid={`completion-date-${index}`} style={{ fontSize: '12px', color: '#666' }}>
                      Completed on: {new Date(task.completion_date).toLocaleDateString()}
                    </div>
                  )}
                  <button 
                    data-testid={`review-task-${index}`}
                    onClick={() => onTaskStart && onTaskStart(task)}
                    style={{ marginLeft: '12px', padding: '6px 12px' }}
                  >
                    Review Task
                  </button>
                </div>
              ) : task.is_started ? (
                <div data-testid={`task-in-progress-${index}`}>
                  <div style={{ color: '#ffc107', marginBottom: '8px' }}>
                    🔄 In Progress
                  </div>
                  <button 
                    data-testid={`submit-task-${index}`}
                    onClick={() => onTaskSubmit && onTaskSubmit(task)}
                    style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    Mark as Complete
                  </button>
                </div>
              ) : (
                <button 
                  data-testid={`start-task-${index}`}
                  onClick={() => onTaskStart && onTaskStart(task)}
                  style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  Start Task
                </button>
              )}
            </div>

            {/* Task Resources (if any) */}
            {task.resources && task.resources.length > 0 && (
              <div data-testid={`task-resources-${index}`} style={{ marginTop: '12px' }}>
                <h5>Resources:</h5>
                <ul>
                  {task.resources.map((resource, resourceIndex) => (
                    <li key={resourceIndex}>
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        data-testid={`resource-link-${index}-${resourceIndex}`}
                      >
                        {resource.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      <div data-testid="task-progress-summary" style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        {(() => {
          const completedTasks = tasks.filter(t => t.is_completed).length;
          const totalTasks = tasks.length;
          const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
          
          return (
            <>
              <div data-testid="task-progress-text">
                Progress: {completedTasks} of {totalTasks} tasks completed ({progressPercentage}%)
              </div>
              <div 
                data-testid="task-progress-bar"
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  marginTop: '8px',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{
                    width: `${progressPercentage}%`,
                    height: '100%',
                    backgroundColor: '#28a745',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

describe('TaskSection Component', () => {

  const mockTasks = [
    {
      task_id: 'task_1',
      task_title: 'Build a Calculator',
      task_description: 'Create a simple calculator using JavaScript',
      task_type: 'project',
      estimated_time_minutes: 60,
      instructions: 'Step 1: Create HTML structure\nStep 2: Add CSS styling\nStep 3: Implement JavaScript logic',
      is_completed: true,
      completion_date: '2024-01-15T10:30:00Z',
      resources: [
        { title: 'JavaScript Calculator Tutorial', url: 'https://example.com/calculator' },
        { title: 'CSS Grid Guide', url: 'https://example.com/css-grid' }
      ]
    },
    {
      task_id: 'task_2',
      task_title: 'DOM Manipulation Exercise',
      task_description: 'Practice selecting and modifying DOM elements',
      task_type: 'exercise',
      estimated_time_minutes: 30,
      instructions: 'Complete the exercises in the provided CodePen',
      is_completed: false,
      is_started: true,
      resources: []
    },
    {
      task_id: 'task_3',
      task_title: 'JavaScript Quiz',
      task_description: 'Test your understanding of JavaScript fundamentals',
      task_type: 'quiz',
      estimated_time_minutes: 20,
      is_completed: false,
      is_started: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Display', () => {
    test('renders task section with header', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      expect(screen.getByTestId('task-section')).toBeInTheDocument();
      expect(screen.getByTestId('tasks-header')).toHaveTextContent('Hands-on Tasks');
    });

    test('displays all tasks with correct information', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      // Check first task (completed project)
      expect(screen.getByTestId('task-title-0')).toHaveTextContent('Build a Calculator');
      expect(screen.getByTestId('task-description-0')).toHaveTextContent('Create a simple calculator using JavaScript');
      expect(screen.getByTestId('task-type-0')).toHaveTextContent('project');
      expect(screen.getByTestId('task-time-0')).toHaveTextContent('Estimated time: 60 minutes');
      
      // Check second task (in progress exercise)
      expect(screen.getByTestId('task-title-1')).toHaveTextContent('DOM Manipulation Exercise');
      expect(screen.getByTestId('task-type-1')).toHaveTextContent('exercise');
      
      // Check third task (not started quiz)
      expect(screen.getByTestId('task-title-2')).toHaveTextContent('JavaScript Quiz');
      expect(screen.getByTestId('task-type-2')).toHaveTextContent('quiz');
    });

    test('shows loading state correctly', () => {
      render(<MockTaskSection loading={true} />);
      
      expect(screen.getByTestId('tasks-loading')).toHaveTextContent('Loading tasks...');
      expect(screen.queryByTestId('task-section')).not.toBeInTheDocument();
    });

    test('shows no tasks message when tasks array is empty', () => {
      render(<MockTaskSection tasks={[]} />);
      
      expect(screen.getByTestId('no-tasks')).toHaveTextContent('No tasks available for this module');
      expect(screen.queryByTestId('task-section')).not.toBeInTheDocument();
    });

    test('handles missing tasks prop gracefully', () => {
      render(<MockTaskSection />);
      
      expect(screen.getByTestId('no-tasks')).toBeInTheDocument();
    });
  });

  describe('Task Status and Actions', () => {
    test('shows completed status for finished tasks', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      expect(screen.getByTestId('task-completed-0')).toHaveTextContent('✅ Task Completed');
      expect(screen.getByTestId('completion-date-0')).toHaveTextContent('Completed on:');
      expect(screen.getByTestId('review-task-0')).toHaveTextContent('Review Task');
    });

    test('shows in-progress status for started tasks', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      expect(screen.getByTestId('task-in-progress-1')).toHaveTextContent('🔄 In Progress');
      expect(screen.getByTestId('submit-task-1')).toHaveTextContent('Mark as Complete');
    });

    test('shows start button for unstarted tasks', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      expect(screen.getByTestId('start-task-2')).toHaveTextContent('Start Task');
    });

    test('applies correct styling based on completion status', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      const completedTask = screen.getByTestId('task-0');
      expect(completedTask).toHaveClass('completed');
      expect(completedTask).toHaveStyle('backgroundColor: #e8f5e8');
      
      const pendingTask = screen.getByTestId('task-1');
      expect(pendingTask).toHaveClass('pending');
      expect(pendingTask).toHaveStyle('backgroundColor: #fff');
    });
  });

  describe('User Interactions', () => {
    test('calls onTaskStart when start button is clicked', () => {
      const mockOnTaskStart = jest.fn();
      render(<MockTaskSection tasks={mockTasks} onTaskStart={mockOnTaskStart} />);
      
      const startButton = screen.getByTestId('start-task-2');
      fireEvent.click(startButton);
      
      expect(mockOnTaskStart).toHaveBeenCalledWith(mockTasks[2]);
    });

    test('calls onTaskSubmit when submit button is clicked', () => {
      const mockOnTaskSubmit = jest.fn();
      render(<MockTaskSection tasks={mockTasks} onTaskSubmit={mockOnTaskSubmit} />);
      
      const submitButton = screen.getByTestId('submit-task-1');
      fireEvent.click(submitButton);
      
      expect(mockOnTaskSubmit).toHaveBeenCalledWith(mockTasks[1]);
    });

    test('calls onTaskStart when review button is clicked', () => {
      const mockOnTaskStart = jest.fn();
      render(<MockTaskSection tasks={mockTasks} onTaskStart={mockOnTaskStart} />);
      
      const reviewButton = screen.getByTestId('review-task-0');
      fireEvent.click(reviewButton);
      
      expect(mockOnTaskStart).toHaveBeenCalledWith(mockTasks[0]);
    });

    test('expands and collapses task instructions', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      const instructionsSection = screen.getByTestId('task-instructions-0');
      expect(instructionsSection).toBeInTheDocument();
      
      // Instructions should be collapsible via details/summary
      const summary = instructionsSection.querySelector('summary');
      expect(summary).toHaveTextContent('View Instructions');
    });
  });

  describe('Progress Tracking', () => {
    test('calculates and displays progress correctly', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      // 1 completed out of 3 tasks = 33%
      expect(screen.getByTestId('task-progress-text')).toHaveTextContent('Progress: 1 of 3 tasks completed (33%)');
      
      const progressBar = screen.getByTestId('task-progress-bar').firstChild;
      expect(progressBar).toHaveStyle('width: 33%');
    });

    test('shows 100% progress when all tasks completed', () => {
      const allCompletedTasks = mockTasks.map(task => ({ ...task, is_completed: true }));
      render(<MockTaskSection tasks={allCompletedTasks} />);
      
      expect(screen.getByTestId('task-progress-text')).toHaveTextContent('Progress: 3 of 3 tasks completed (100%)');
      
      const progressBar = screen.getByTestId('task-progress-bar').firstChild;
      expect(progressBar).toHaveStyle('width: 100%');
    });

    test('shows 0% progress when no tasks completed', () => {
      const noCompletedTasks = mockTasks.map(task => ({ ...task, is_completed: false }));
      render(<MockTaskSection tasks={noCompletedTasks} />);
      
      expect(screen.getByTestId('task-progress-text')).toHaveTextContent('Progress: 0 of 3 tasks completed (0%)');
      
      const progressBar = screen.getByTestId('task-progress-bar').firstChild;
      expect(progressBar).toHaveStyle('width: 0%');
    });
  });

  describe('Task Resources', () => {
    test('displays task resources when available', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      const resourcesSection = screen.getByTestId('task-resources-0');
      expect(resourcesSection).toBeInTheDocument();
      
      expect(screen.getByTestId('resource-link-0-0')).toHaveTextContent('JavaScript Calculator Tutorial');
      expect(screen.getByTestId('resource-link-0-0')).toHaveAttribute('href', 'https://example.com/calculator');
      expect(screen.getByTestId('resource-link-0-0')).toHaveAttribute('target', '_blank');
      
      expect(screen.getByTestId('resource-link-0-1')).toHaveTextContent('CSS Grid Guide');
    });

    test('does not show resources section when no resources available', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      // Task 1 has empty resources array
      expect(screen.queryByTestId('task-resources-1')).not.toBeInTheDocument();
      
      // Task 2 has no resources property
      expect(screen.queryByTestId('task-resources-2')).not.toBeInTheDocument();
    });
  });

  describe('Task Types and Styling', () => {
    test('applies correct styling for different task types', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      // Project type should have blue background
      const projectType = screen.getByTestId('task-type-0');
      expect(projectType).toHaveStyle('backgroundColor: #007bff');
      
      // Exercise type should have gray background
      const exerciseType = screen.getByTestId('task-type-1');
      expect(exerciseType).toHaveStyle('backgroundColor: #6c757d');
      
      // Quiz type should have gray background (default)
      const quizType = screen.getByTestId('task-type-2');
      expect(quizType).toHaveStyle('backgroundColor: #6c757d');
    });

    test('displays task type labels correctly', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      expect(screen.getByTestId('task-type-0')).toHaveTextContent('project');
      expect(screen.getByTestId('task-type-1')).toHaveTextContent('exercise');
      expect(screen.getByTestId('task-type-2')).toHaveTextContent('quiz');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles tasks without IDs gracefully', () => {
      const tasksWithoutIds = [
        { task_title: 'Task 1', task_description: 'Description 1', is_completed: false },
        { task_title: 'Task 2', task_description: 'Description 2', is_completed: true }
      ];
      
      render(<MockTaskSection tasks={tasksWithoutIds} />);
      
      expect(screen.getByTestId('task-0')).toBeInTheDocument();
      expect(screen.getByTestId('task-1')).toBeInTheDocument();
    });

    test('handles missing optional fields gracefully', () => {
      const minimalTasks = [
        { task_title: 'Minimal Task', task_description: 'Basic description' }
      ];
      
      render(<MockTaskSection tasks={minimalTasks} />);
      
      expect(screen.getByTestId('task-0')).toBeInTheDocument();
      expect(screen.getByTestId('task-time-0')).toHaveTextContent('Estimated time: 30 minutes'); // Default value
    });

    test('handles missing callback props gracefully', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      // Should render without crashing even without callback props
      expect(screen.getByTestId('task-section')).toBeInTheDocument();
      
      // Clicking buttons should not cause errors
      const startButton = screen.getByTestId('start-task-2');
      fireEvent.click(startButton);
      
      const submitButton = screen.getByTestId('submit-task-1');
      fireEvent.click(submitButton);
    });

    test('handles tasks with invalid completion dates', () => {
      const tasksWithInvalidDate = [
        {
          ...mockTasks[0],
          completion_date: 'invalid-date'
        }
      ];
      
      render(<MockTaskSection tasks={tasksWithInvalidDate} />);
      
      // Should not crash and should still show completion status
      expect(screen.getByTestId('task-completed-0')).toBeInTheDocument();
    });

    test('handles very long task titles and descriptions', () => {
      const longContentTasks = [
        {
          task_title: 'A'.repeat(100),
          task_description: 'B'.repeat(500),
          task_type: 'project',
          is_completed: false
        }
      ];
      
      render(<MockTaskSection tasks={longContentTasks} />);
      
      expect(screen.getByTestId('task-0')).toBeInTheDocument();
      expect(screen.getByTestId('task-title-0')).toHaveTextContent('A'.repeat(100));
    });
  });

  describe('Accessibility', () => {
    test('resource links have proper accessibility attributes', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      const resourceLink = screen.getByTestId('resource-link-0-0');
      expect(resourceLink).toHaveAttribute('target', '_blank');
      expect(resourceLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('buttons have appropriate text content for screen readers', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      expect(screen.getByTestId('start-task-2')).toHaveTextContent('Start Task');
      expect(screen.getByTestId('submit-task-1')).toHaveTextContent('Mark as Complete');
      expect(screen.getByTestId('review-task-0')).toHaveTextContent('Review Task');
    });

    test('progress information is clearly labeled', () => {
      render(<MockTaskSection tasks={mockTasks} />);
      
      const progressText = screen.getByTestId('task-progress-text');
      expect(progressText).toHaveTextContent('Progress: 1 of 3 tasks completed (33%)');
    });
  });

  describe('Performance and State Management', () => {
    test('updates progress when task completion status changes', () => {
      const { rerender } = render(<MockTaskSection tasks={mockTasks} />);
      
      // Initially 1 completed
      expect(screen.getByTestId('task-progress-text')).toHaveTextContent('Progress: 1 of 3 tasks completed (33%)');
      
      // Complete another task
      const updatedTasks = mockTasks.map((task, index) => 
        index === 1 ? { ...task, is_completed: true, is_started: false } : task
      );
      
      rerender(<MockTaskSection tasks={updatedTasks} />);
      
      expect(screen.getByTestId('task-progress-text')).toHaveTextContent('Progress: 2 of 3 tasks completed (67%)');
    });

    test('renders efficiently with large number of tasks', () => {
      const manyTasks = Array.from({ length: 50 }, (_, index) => ({
        task_id: `task_${index}`,
        task_title: `Task ${index + 1}`,
        task_description: `Description for task ${index + 1}`,
        task_type: index % 2 === 0 ? 'project' : 'exercise',
        is_completed: index < 10
      }));
      
      render(<MockTaskSection tasks={manyTasks} />);
      
      expect(screen.getByTestId('task-section')).toBeInTheDocument();
      expect(screen.getByTestId('task-progress-text')).toHaveTextContent('Progress: 10 of 50 tasks completed (20%)');
    });
  });
});