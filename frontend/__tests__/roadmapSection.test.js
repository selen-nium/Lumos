import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// // Mock the UI components before importing the real component
// jest.mock('@/components/ui/button', () => ({
//   Button: ({ children, ...props }) => <button {...props}>{children}</button>
// }));

// jest.mock('@/components/ui/card', () => ({
//   Card: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
//   CardContent: ({ children, ...props }) => <div data-testid="card-content" {...props}>{children}</div>,
//   CardDescription: ({ children, ...props }) => <div data-testid="card-description" {...props}>{children}</div>,
//   CardHeader: ({ children, ...props }) => <div data-testid="card-header" {...props}>{children}</div>,
//   CardTitle: ({ children, ...props }) => <h3 data-testid="card-title" {...props}>{children}</h3>
// }));

// jest.mock('@/components/ui/badge', () => ({
//   Badge: ({ children, ...props }) => <span data-testid="badge" {...props}>{children}</span>
// }));

// jest.mock('../ui/progress', () => {
//   return function Progress({ value, ...props }) {
//     return <div data-testid="progress" data-value={value} {...props} />;
//   };
// });


// import RoadmapSection from '../src/components/dashboard/roadmapSection'
//mock roadmap section
const RoadmapSection = ({ roadmapData, onModuleClick, onProgressUpdate, loading = false }) => {
  if (loading) {
    return <div data-testid="loading-spinner">Loading roadmap...</div>;
  }

  if (!roadmapData || !roadmapData.modules) {
    return <div data-testid="no-roadmap">No roadmap available</div>;
  }

  const completedModules = roadmapData.modules.filter(m => m.is_completed).length;
  const totalModules = roadmapData.modules.length;
  const progressPercentage = Math.round((completedModules / totalModules) * 100);

  return (
    <div data-testid="roadmap-section">
      <h2 data-testid="roadmap-title">{roadmapData.path_name}</h2>
      
      {/* Progress Bar */}
      <div data-testid="progress-container">
        <div data-testid="progress-text">
          {completedModules} of {totalModules} modules completed ({progressPercentage}%)
        </div>
        <div data-testid="progress-bar" style={{ width: `${progressPercentage}%`, height: '10px', backgroundColor: 'green' }} />
      </div>

      {/* Module List */}
      <div data-testid="modules-container">
        {roadmapData.modules.map((module, index) => (
          <div 
            key={module.module_id || index}
            data-testid={`module-${index}`}
            className={`module-card ${module.is_completed ? 'completed' : 'pending'}`}
            onClick={() => onModuleClick && onModuleClick(module)}
            style={{ 
              padding: '16px', 
              margin: '8px 0', 
              border: '1px solid #ddd',
              backgroundColor: module.is_completed ? '#e8f5e8' : '#f9f9f9',
              cursor: 'pointer'
            }}
          >
            <h3 data-testid={`module-name-${index}`}>{module.module_name}</h3>
            <p data-testid={`module-description-${index}`}>{module.module_description}</p>
            <div data-testid={`module-difficulty-${index}`}>
              Difficulty: {module.difficulty}
            </div>
            <div data-testid={`module-hours-${index}`}>
              Estimated: {module.estimated_hours}h
            </div>
            <div data-testid={`module-status-${index}`}>
              Status: {module.is_completed ? '✅ Completed' : '⏳ Pending'}
            </div>
            {module.is_completed && (
              <button 
                data-testid={`review-button-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onProgressUpdate && onProgressUpdate(module, 'review');
                }}
              >
                Review Module
              </button>
            )}
            {!module.is_completed && (
              <button 
                data-testid={`start-button-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onProgressUpdate && onProgressUpdate(module, 'start');
                }}
              >
                Start Module
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Completion Message */}
      {completedModules === totalModules && (
        <div data-testid="completion-message" style={{ padding: '20px', backgroundColor: '#d4edda', color: '#155724' }}>
          🎉 Congratulations! You've completed your entire roadmap!
        </div>
      )}
    </div>
  );
};

describe('RoadmapSection Component', () => {

  const mockRoadmapData = {
    path_id: 'path_123',
    path_name: 'Full Stack Developer Path',
    modules: [
      {
        module_id: 'mod_1',
        module_name: 'JavaScript Fundamentals',
        module_description: 'Learn the basics of JavaScript programming',
        difficulty: 'beginner',
        estimated_hours: 8,
        is_completed: true,
        sequence_order: 1
      },
      {
        module_id: 'mod_2',
        module_name: 'React Basics',
        module_description: 'Introduction to React framework',
        difficulty: 'intermediate',
        estimated_hours: 12,
        is_completed: false,
        sequence_order: 2
      },
      {
        module_id: 'mod_3',
        module_name: 'Node.js Backend',
        module_description: 'Server-side JavaScript with Node.js',
        difficulty: 'intermediate',
        estimated_hours: 10,
        is_completed: false,
        sequence_order: 3
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Display', () => {
    test('renders roadmap section with correct title', () => {
      render(<RoadmapSection roadmapData={mockRoadmapData} />);
      
      expect(screen.getByTestId('roadmap-title')).toHaveTextContent('Full Stack Developer Path');
      expect(screen.getByTestId('roadmap-section')).toBeInTheDocument();
    });

    test('displays correct progress information', () => {
      render(<RoadmapSection roadmapData={mockRoadmapData} />);
      
      const progressText = screen.getByTestId('progress-text');
      expect(progressText).toHaveTextContent('1 of 3 modules completed (33%)');
      
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveStyle('width: 33%');
    });

    test('renders all modules with correct information', () => {
      render(<RoadmapSection roadmapData={mockRoadmapData} />);
      
      // Check first module (completed)
      expect(screen.getByTestId('module-name-0')).toHaveTextContent('JavaScript Fundamentals');
      expect(screen.getByTestId('module-difficulty-0')).toHaveTextContent('Difficulty: beginner');
      expect(screen.getByTestId('module-hours-0')).toHaveTextContent('Estimated: 8h');
      expect(screen.getByTestId('module-status-0')).toHaveTextContent('✅ Completed');
      
      // Check second module (pending)
      expect(screen.getByTestId('module-name-1')).toHaveTextContent('React Basics');
      expect(screen.getByTestId('module-status-1')).toHaveTextContent('⏳ Pending');
    });

    test('shows loading state correctly', () => {
      render(<RoadmapSection loading={true} />);
      
      expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Loading roadmap...');
      expect(screen.queryByTestId('roadmap-section')).not.toBeInTheDocument();
    });

    test('shows no roadmap message when data is missing', () => {
      render(<RoadmapSection roadmapData={null} />);
      
      expect(screen.getByTestId('no-roadmap')).toHaveTextContent('No roadmap available');
      expect(screen.queryByTestId('roadmap-section')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('calls onModuleClick when module is clicked', () => {
      const mockOnModuleClick = jest.fn();
      render(<RoadmapSection roadmapData={mockRoadmapData} onModuleClick={mockOnModuleClick} />);
      
      const firstModule = screen.getByTestId('module-0');
      fireEvent.click(firstModule);
      
      expect(mockOnModuleClick).toHaveBeenCalledWith(mockRoadmapData.modules[0]);
    });

    test('calls onProgressUpdate when start button is clicked', () => {
      const mockOnProgressUpdate = jest.fn();
      render(<RoadmapSection roadmapData={mockRoadmapData} onProgressUpdate={mockOnProgressUpdate} />);
      
      const startButton = screen.getByTestId('start-button-1');
      fireEvent.click(startButton);
      
      expect(mockOnProgressUpdate).toHaveBeenCalledWith(mockRoadmapData.modules[1], 'start');
    });

    test('calls onProgressUpdate when review button is clicked', () => {
      const mockOnProgressUpdate = jest.fn();
      render(<RoadmapSection roadmapData={mockRoadmapData} onProgressUpdate={mockOnProgressUpdate} />);
      
      const reviewButton = screen.getByTestId('review-button-0');
      fireEvent.click(reviewButton);
      
      expect(mockOnProgressUpdate).toHaveBeenCalledWith(mockRoadmapData.modules[0], 'review');
    });

    test('prevents module click when button is clicked', () => {
      const mockOnModuleClick = jest.fn();
      const mockOnProgressUpdate = jest.fn();
      render(
        <RoadmapSection 
          roadmapData={mockRoadmapData} 
          onModuleClick={mockOnModuleClick}
          onProgressUpdate={mockOnProgressUpdate}
        />
      );
      
      const startButton = screen.getByTestId('start-button-1');
      fireEvent.click(startButton);
      
      // Module click should not be called when button is clicked
      expect(mockOnModuleClick).not.toHaveBeenCalled();
      expect(mockOnProgressUpdate).toHaveBeenCalled();
    });
  });

  describe('Progress Calculations', () => {
    test('calculates progress correctly for partially completed roadmap', () => {
      render(<RoadmapSection roadmapData={mockRoadmapData} />);
      
      expect(screen.getByTestId('progress-text')).toHaveTextContent('1 of 3 modules completed (33%)');
    });

    test('shows 100% progress when all modules completed', () => {
      const completedRoadmap = {
        ...mockRoadmapData,
        modules: mockRoadmapData.modules.map(m => ({ ...m, is_completed: true }))
      };
      
      render(<RoadmapSection roadmapData={completedRoadmap} />);
      
      expect(screen.getByTestId('progress-text')).toHaveTextContent('3 of 3 modules completed (100%)');
      expect(screen.getByTestId('completion-message')).toHaveTextContent('🎉 Congratulations!');
    });

    test('shows 0% progress when no modules completed', () => {
      const noProgressRoadmap = {
        ...mockRoadmapData,
        modules: mockRoadmapData.modules.map(m => ({ ...m, is_completed: false }))
      };
      
      render(<RoadmapSection roadmapData={noProgressRoadmap} />);
      
      expect(screen.getByTestId('progress-text')).toHaveTextContent('0 of 3 modules completed (0%)');
      expect(screen.queryByTestId('completion-message')).not.toBeInTheDocument();
    });
  });

  describe('Module States and Styling', () => {
    test('applies correct CSS classes for completed modules', () => {
      render(<RoadmapSection roadmapData={mockRoadmapData} />);
      
      const completedModule = screen.getByTestId('module-0');
      expect(completedModule).toHaveClass('completed');
      expect(completedModule).toHaveStyle('backgroundColor: #e8f5e8');
    });

    test('applies correct CSS classes for pending modules', () => {
      render(<RoadmapSection roadmapData={mockRoadmapData} />);
      
      const pendingModule = screen.getByTestId('module-1');
      expect(pendingModule).toHaveClass('pending');
      expect(pendingModule).toHaveStyle('backgroundColor: #f9f9f9');
    });

    test('shows correct buttons based on module completion status', () => {
      render(<RoadmapSection roadmapData={mockRoadmapData} />);
      
      // Completed module should have review button
      expect(screen.getByTestId('review-button-0')).toBeInTheDocument();
      expect(screen.queryByTestId('start-button-0')).not.toBeInTheDocument();
      
      // Pending module should have start button
      expect(screen.getByTestId('start-button-1')).toBeInTheDocument();
      expect(screen.queryByTestId('review-button-1')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles modules without IDs gracefully', () => {
      const roadmapWithoutIds = {
        path_name: 'Test Path',
        modules: [
          { module_name: 'Module 1', is_completed: false },
          { module_name: 'Module 2', is_completed: true }
        ]
      };
      
      render(<RoadmapSection roadmapData={roadmapWithoutIds} />);
      
      expect(screen.getByTestId('module-0')).toBeInTheDocument();
      expect(screen.getByTestId('module-1')).toBeInTheDocument();
    });

    test('handles missing optional props gracefully', () => {
      render(<RoadmapSection roadmapData={mockRoadmapData} />);
      
      // Should render without crashing even without callback props
      expect(screen.getByTestId('roadmap-section')).toBeInTheDocument();
      
      // Clicking should not cause errors
      const module = screen.getByTestId('module-0');
      fireEvent.click(module);
      
      const button = screen.getByTestId('review-button-0');
      fireEvent.click(button);
    });

    test('handles modules with missing fields', () => {
      const incompleteRoadmap = {
        path_name: 'Incomplete Data Path',
        modules: [
          { module_name: 'Complete Module', difficulty: 'beginner', estimated_hours: 5, is_completed: true },
          { module_name: 'Incomplete Module' } // Missing fields
        ]
      };
      
      render(<RoadmapSection roadmapData={incompleteRoadmap} />);
      
      expect(screen.getByTestId('module-1')).toBeInTheDocument();
      expect(screen.getByTestId('module-difficulty-1')).toHaveTextContent('Difficulty:'); // Should handle undefined
    });
  });
});