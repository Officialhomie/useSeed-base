import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedProgressBarProps {
  progress: number;
  height?: number;
  color?: 'blue' | 'green' | 'purple' | 'gradient';
  showPercentage?: boolean;
  showLabels?: boolean;
  startLabel?: string;
  endLabel?: string;
  className?: string;
  animate?: boolean;
}

/**
 * Animated progress bar component with customizable appearance
 */
const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  height = 8,
  color = 'blue',
  showPercentage = false,
  showLabels = false,
  startLabel = '0%',
  endLabel = '100%',
  className = '',
  animate = true
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  // Color classes for the progress bar
  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      case 'purple':
        return 'bg-purple-500';
      case 'gradient':
        return 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-end mb-1">
          <span className="text-sm font-medium text-white">{clampedProgress.toFixed(1)}%</span>
        </div>
      )}
      
      <div className={`w-full bg-gray-800 rounded-full overflow-hidden`} style={{ height: `${height}px` }}>
        <motion.div 
          className={`h-full ${getColorClasses()} rounded-full`}
          style={{ width: `${clampedProgress}%` }}
          initial={animate ? { width: 0 } : { width: `${clampedProgress}%` }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      
      {showLabels && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">{startLabel}</span>
          <span className="text-xs text-gray-500">{endLabel}</span>
        </div>
      )}
    </div>
  );
};

export default AnimatedProgressBar; 