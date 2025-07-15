import React, { useEffect, useState } from 'react';

const Progress = ({ 
  value = 0, 
  max = 100, 
  className = '', 
  variant = 'default',
  showPercentage = false,
  size = 'default'
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);
  
  const percentage = Math.min(Math.max((currentValue / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-1',
    default: 'h-2',
    lg: 'h-3',
    xl: 'h-4'
  };
  
  const variantClasses = {
    default: {
      bg: 'bg-gray-200',
      fill: 'bg-gradient-to-r from-blue-500 to-blue-600'
    },
    lumos: {
      bg: 'bg-gray-200',
      fill: 'bg-gradient-to-r from-blue-500 to-blue-600'
    },
    success: {
      bg: 'bg-gray-200',
      fill: 'bg-gradient-to-r from-green-500 to-emerald-500'
    }
  };
  
  const currentVariant = variantClasses[variant] || variantClasses.default;
  const heightClass = sizeClasses[size] || sizeClasses.default;
  
  const isComplete = percentage >= 100;
  
  return (
    <div className={`relative ${className}`}>
      <div 
        className={`
          relative overflow-hidden rounded-full ${currentVariant.bg} ${heightClass}
          transition-all duration-700 ease-out
          ${isComplete && variant === 'success' ? 'animate-pulse-glow' : ''}
        `}
        role="progressbar"
        aria-valuenow={currentValue}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`
            h-full rounded-full transition-all duration-700 ease-out
            ${currentVariant.fill}
            ${isComplete ? 'shadow-lg' : ''}
          `}
          style={{ 
            width: `${percentage}%`,
          }}
        />
        
        {isComplete && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine absolute top-0 -skew-x-12" />
          </div>
        )}
      </div>
      
      {showPercentage && (
        <div className={`text-xs text-center mt-1 font-medium ${
          isComplete && variant === 'success' ? 'text-green-600 font-bold' : ''
        }`}>
          {Math.round(percentage)}%
          {isComplete && variant === 'success' && ' 🎉'}
        </div>
      )}
    </div>
  );
};

export default Progress;