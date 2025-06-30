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
      fill: 'bg-gradient-to-r from-green-500 to-green-600'
    }
  };
  
  const currentVariant = variantClasses[variant] || variantClasses.default;
  const heightClass = sizeClasses[size] || sizeClasses.default;
  
  return (
    <div className={`relative ${className}`}>
      <div 
        className={`
          relative overflow-hidden rounded-full ${currentVariant.bg} ${heightClass}
          transition-all duration-700 ease-out
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
          `}
          style={{ 
            width: `${percentage}%`,
          }}
        />
      </div>
      
      {showPercentage && (
        <div className="text-xs text-center mt-1 font-medium">
          {percentage.toFixed(1)}%
        </div>
      )}
    </div>
  );
};

export default Progress;