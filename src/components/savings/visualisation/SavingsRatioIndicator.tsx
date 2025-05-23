import React from 'react';

interface SavingsRatioIndicatorProps {
  savingsAmount: string;
  actualSwapAmount: string;
}

const SavingsRatioIndicator: React.FC<SavingsRatioIndicatorProps> = ({
  savingsAmount,
  actualSwapAmount
}) => {
  // Calculate percentages for the ratio visualization
  const calculateRatio = () => {
    const savings = parseFloat(savingsAmount);
    const actual = parseFloat(actualSwapAmount);
    
    if (isNaN(savings) || isNaN(actual) || (savings + actual) === 0) {
      return { savingsPercentage: 0, swapPercentage: 100 };
    }
    
    const total = savings + actual;
    const savingsPercentage = (savings / total) * 100;
    const swapPercentage = 100 - savingsPercentage;
    
    return { savingsPercentage, swapPercentage };
  };
  
  const { savingsPercentage, swapPercentage } = calculateRatio();
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">Spend/Save Ratio:</span>
        <span className="text-white">
          {swapPercentage.toFixed(1)}% / {savingsPercentage.toFixed(1)}%
        </span>
      </div>
      
      {/* Ratio Visualization Bar */}
      <div className="w-full h-2.5 rounded-full flex overflow-hidden">
        <div 
          className="bg-blue-600 h-full" 
          style={{ width: `${swapPercentage}%` }}
        ></div>
        <div 
          className="bg-green-500 h-full" 
          style={{ width: `${savingsPercentage}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs mt-1">
        <span className="text-blue-400">Spending</span>
        <span className="text-green-400">Saving</span>
      </div>
    </div>
  );
};

export default SavingsRatioIndicator; 