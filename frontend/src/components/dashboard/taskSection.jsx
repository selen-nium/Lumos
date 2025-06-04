import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Code, 
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Target
} from 'lucide-react';

const TaskCard = ({ task, index, onToggleCompletion }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(task.is_completed || false);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleToggleCompletion = () => {
    const newCompletionStatus = !isCompleted;
    setIsCompleted(newCompletionStatus);
    
    // Call the parent function to handle the completion logic
    if (onToggleCompletion) {
      onToggleCompletion(task.task_id, newCompletionStatus);
    }
  };

  const getTaskTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'practice':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'project':
        return <Target className="h-4 w-4 text-green-500" />;
      case 'quiz':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'exercise':
        return <PlayCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Code className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTaskTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'practice':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'project':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'quiz':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'exercise':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      isCompleted ? 'bg-green-50 border-green-200' : 'bg-background'
    }`}>
      <CardContent className="p-0">
        {/* Task Header - Always Visible */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {/* Completion Checkbox */}
              <button
                onClick={handleToggleCompletion}
                className="mt-1 transition-colors hover:scale-110"
                aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 hover:text-green-500" />
                )}
              </button>

              {/* Task Icon */}
              <div className="mt-1">
                {getTaskTypeIcon(task.task_type)}
              </div>

              {/* Task Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`font-medium text-lg leading-tight ${
                    isCompleted ? 'line-through text-gray-500' : 'text-foreground'
                  }`}>
                    {task.task_title}
                  </h3>
                  <Badge 
                    variant="outline" 
                    className={`flex-shrink-0 capitalize ${getTaskTypeColor(task.task_type)}`}
                  >
                    {task.task_type}
                  </Badge>
                  {isCompleted && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Completed
                    </Badge>
                  )}
                </div>

                {/* Brief Description */}
                <p className={`text-sm mb-3 ${
                  isCompleted ? 'text-gray-400' : 'text-muted-foreground'
                }`}>
                  {task.task_description.length > 100 
                    ? `${task.task_description.substring(0, 100)}...`
                    : task.task_description
                  }
                </p>

                {/* Task Meta Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{task.estimated_time_minutes} minutes</span>
                  </div>
                  {task.sequence_order && (
                    <div className="flex items-center gap-1">
                      <span>Task {task.sequence_order}</span>
                    </div>
                  )}
                  {task.is_required && (
                    <Badge variant="secondary" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="ml-2 flex-shrink-0"
              aria-label={isExpanded ? "Collapse details" : "Expand details"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="border-t border-border">
            <div className="p-4 space-y-4">
              {/* Full Description */}
              {task.task_description && task.task_description.length > 100 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-foreground">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {task.task_description}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {task.instructions && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-foreground">Instructions</h4>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {task.instructions.split('\n').map((line, i) => (
                      <p key={i} className="mb-1">
                        {line.trim()}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Solution URL if available */}
              {task.solution_url && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-foreground">Resources</h4>
                  <a
                    href={task.solution_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <span>View solution or reference</span>
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              {/* Task Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-sm mb-1 text-blue-800">💡 Tips for Success</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Break the task into smaller steps</li>
                  <li>• Test your work frequently</li>
                  <li>• Don't hesitate to research and ask for help</li>
                  <li>• Document your learning process</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {!isCompleted ? (
                  <Button 
                    size="sm" 
                    onClick={handleToggleCompletion}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Complete
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={handleToggleCompletion}
                    className="flex items-center gap-2"
                  >
                    <Circle className="h-4 w-4" />
                    Mark Incomplete
                  </Button>
                )}
                
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Start Timer
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main Tasks Section Component
const TasksSection = ({ tasks = [], onTaskCompletion }) => {
  const [localTasks, setLocalTasks] = useState(tasks);

  const handleToggleCompletion = async (taskId, isCompleted) => {
    try {
      // Update local state immediately for responsiveness
      setLocalTasks(prevTasks =>
        prevTasks.map(task =>
          task.task_id === taskId
            ? { ...task, is_completed: isCompleted }
            : task
        )
      );

      // Call the parent callback for actual persistence
      if (onTaskCompletion) {
        await onTaskCompletion(taskId, isCompleted);
      }

      console.log(`Task ${taskId} marked as ${isCompleted ? 'completed' : 'incomplete'}`);
    } catch (error) {
      console.error('Failed to update task completion:', error);
      
      // Revert local state if the update failed
      setLocalTasks(prevTasks =>
        prevTasks.map(task =>
          task.task_id === taskId
            ? { ...task, is_completed: !isCompleted }
            : task
        )
      );
    }
  };

  const completedCount = localTasks.filter(task => task.is_completed).length;
  const totalCount = localTasks.length;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Hands-on Tasks</h2>
          <p className="text-muted-foreground">
            {completedCount} of {totalCount} tasks completed
          </p>
        </div>
        
        {totalCount > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold">
              {Math.round((completedCount / totalCount) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">completed</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Task Cards */}
      {localTasks.length > 0 ? (
        <div className="space-y-4">
          {localTasks.map((task, index) => (
            <TaskCard
              key={task.task_id || index}
              task={task}
              index={index}
              onToggleCompletion={handleToggleCompletion}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No tasks available</h3>
          <p className="text-muted-foreground">
            Tasks for this module will be added soon.
          </p>
        </Card>
      )}

      {/* Completion Celebration */}
      {completedCount > 0 && completedCount === totalCount && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-green-600 mb-2">
            <CheckCircle2 className="h-8 w-8 mx-auto" />
          </div>
          <h3 className="font-medium text-green-800 mb-1">
            🎉 All Tasks Completed!
          </h3>
          <p className="text-green-700 text-sm">
            Great job! You've finished all the hands-on tasks for this module.
          </p>
        </div>
      )}
    </div>
  );
};

// Integration code for ModulePage.jsx
// Replace the existing tasks tab content in your ModulePage with this:

const ModulePage_TasksTab_Integration = ({ tasks, user, module }) => {
  // Task completion handler
  const handleTaskCompletion = async (taskId, isCompleted) => {
    try {
      console.log('🔄 Updating task completion:', { taskId, isCompleted });

      // Here you would typically call your API to update task completion
      // For now, this is a placeholder - you'll need to implement the backend endpoint
      
      // Example API call structure:
      /*
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          isCompleted,
          moduleId: module.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update task completion');
      }
      */

      // Show success message
      console.log(`✅ Task ${taskId} ${isCompleted ? 'completed' : 'marked incomplete'}`);
      
    } catch (error) {
      console.error('❌ Failed to update task completion:', error);
      // Re-throw to let the TasksSection component handle the error
      throw error;
    }
  };

  return (
    <TasksSection 
      tasks={tasks} 
      onTaskCompletion={handleTaskCompletion}
    />
  );
};

export default TasksSection;