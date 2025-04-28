"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Custom UI components to replace imported ones
const Tabs = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`tabs ${className || ''}`}>{children}</div>;
const TabsContent = ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) => <div data-value={value} className={className}>{children}</div>;
const TabsList = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`tabs-list ${className || ''}`}>{children}</div>;
const TabsTrigger = ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) => <button data-value={value} className={className}>{children}</button>;

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`card ${className || ''}`}>{children}</div>;
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`card-content ${className || ''}`}>{children}</div>;
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`card-header ${className || ''}`}>{children}</div>;
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => <h3 className={`card-title ${className || ''}`}>{children}</h3>;
const CardDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => <p className={`card-description ${className || ''}`}>{children}</p>;

const Button = ({ 
  children, 
  variant, 
  size, 
  className, 
  onClick, 
  disabled 
}: { 
  children: React.ReactNode; 
  variant?: string; 
  size?: string; 
  className?: string; 
  onClick?: () => void;
  disabled?: boolean;
}) => 
  <button 
    className={`btn ${variant || ''} ${size || ''} ${className || ''}`} 
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>;

const Progress = ({ value, max, className }: { value: number; max?: number; className?: string }) => 
  <div className={`progress-bar ${className || ''}`} style={{ width: `${value}%` }}></div>;

const Badge = ({ 
  children, 
  variant, 
  className, 
  onClick 
}: { 
  children: React.ReactNode; 
  variant?: string; 
  className?: string; 
  onClick?: () => void;
}) => 
  <span 
    className={`badge ${variant || ''} ${className || ''}`} 
    onClick={onClick}
  >
    {children}
  </span>;

const Input = ({ 
  className, 
  placeholder, 
  value, 
  onChange,
  readOnly
}: { 
  className?: string; 
  placeholder?: string; 
  value?: any; 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
}) => 
  <input 
    className={`input ${className || ''}`} 
    placeholder={placeholder} 
    value={value} 
    onChange={onChange}
    readOnly={readOnly}
  />;

// Custom Dialog components
const Dialog = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`dialog ${className || ''}`}>{children}</div>;
const DialogContent = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`dialog-content ${className || ''}`}>{children}</div>;
const DialogHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`dialog-header ${className || ''}`}>{children}</div>;
const DialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => <h3 className={`dialog-title ${className || ''}`}>{children}</h3>;
const DialogDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => <p className={`dialog-description ${className || ''}`}>{children}</p>;
const DialogFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`dialog-footer ${className || ''}`}>{children}</div>;
const DialogTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`dialog-trigger ${className || ''}`}>{children}</div>;

// Custom Sheet components
const Sheet = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`sheet ${className || ''}`}>{children}</div>;
const SheetContent = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`sheet-content ${className || ''}`}>{children}</div>;
const SheetHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`sheet-header ${className || ''}`}>{children}</div>;
const SheetTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => <h3 className={`sheet-title ${className || ''}`}>{children}</h3>;
const SheetDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => <p className={`sheet-description ${className || ''}`}>{children}</p>;
const SheetFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`sheet-footer ${className || ''}`}>{children}</div>;
const SheetTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`sheet-trigger ${className || ''}`}>{children}</div>;

// SVG Icon Components
interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

const IconCheck = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconRefreshCcw = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3 2v6h6"></path>
    <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
    <path d="M21 22v-6h-6"></path>
    <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
  </svg>
);

const IconArrowsUpDown = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="m21 16-4 4-4-4"></path>
    <path d="M17 20V4"></path>
    <path d="m3 8 4-4 4 4"></path>
    <path d="M7 4v16"></path>
  </svg>
);

const IconSettings2 = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M20 7h-9"></path>
    <path d="M14 17H5"></path>
    <circle cx="17" cy="17" r="3"></circle>
    <circle cx="7" cy="7" r="3"></circle>
  </svg>
);

const IconArrowDown = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 5v14"></path>
    <path d="m19 12-7 7-7-7"></path>
  </svg>
);

const IconCopy = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
  </svg>
);

const IconX = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M18 6 6 18"></path>
    <path d="m6 6 12 12"></path>
  </svg>
);

const IconLoader2 = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className || ""}`} {...props}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
  </svg>
);

const IconArrowRight = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  </svg>
);

const IconTrendingUp = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
    <polyline points="16 7 22 7 22 13"></polyline>
  </svg>
);

const IconBarChart = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <line x1="12" x2="12" y1="20" y2="10"></line>
    <line x1="18" x2="18" y1="20" y2="4"></line>
    <line x1="6" x2="6" y1="20" y2="16"></line>
  </svg>
);

const IconShield = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const IconLayers = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"></path>
    <path d="m22 12-8.6 3.91a2 2 0 0 1-1.66 0L3 12"></path>
    <path d="m22 17-8.6 3.91a2 2 0 0 1-1.66 0L3 17"></path>
  </svg>
);

const IconUser = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const IconPresentation = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M2 3h20"></path>
    <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path>
    <path d="m7 21 5-5 5 5"></path>
  </svg>
);

const IconCoins = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="8" cy="8" r="6"></circle>
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
    <path d="M7 6h1v4"></path>
    <path d="m16.71 13.88.7.71-2.82 2.82"></path>
  </svg>
);

const IconLineChart = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3 3v18h18"></path>
    <path d="m19 9-5 5-4-4-3 3"></path>
  </svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const CheckIcon = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const ArrowRightIcon = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const Loader2Icon = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className || ""}`} {...props}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const CopyIcon = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const XIcon = ({ className, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Define types for state variables
interface Strategy {
  id: number;
  name: string;
  description: string;
  expectedReturn: string;
  riskLevel: string;
  timeCommitment: string;
  category: string;
  match: number;
  icon: JSX.Element;
}

interface Asset {
  id: number;
  name: string;
  symbol: string;
  amount: number | null;
  value: number;
  allocation: number;
  priceChange24h: number;
  color: string;
}

interface Insight {
  id: number;
  type: string;
  title: string;
  description: string;
  priority: string;
  icon: JSX.Element;
}

interface SimulationResult {
  success: boolean;
  gasCost: string;
  estimatedNetworkFee: string;
  estimatedPriorityFee: string;
  estimatedTime: string;
  optimizationSuggestions: string[];
}

interface SimulationError {
  message: string;
  details: string;
}

interface PortfolioData {
  totalValue: number;
  dayChange: number;
  weeklyChange: number;
  assets: Asset[];
}

export default function EnhancedUserExperience() {
  const [activeTab, setActiveTab] = useState("onboarding");

  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="onboarding">
          Enhanced Onboarding
        </TabsTrigger>
        <TabsTrigger value="dashboard">
          Intelligent Dashboard
        </TabsTrigger>
        <TabsTrigger value="transactions">
          Streamlined Transactions
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="onboarding" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Personalized Onboarding Experience</CardTitle>
            <CardContent>
              <EnhancedOnboarding />
            </CardContent>
          </CardHeader>
        </Card>
      </TabsContent>
      
      <TabsContent value="dashboard" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Intelligent Dashboard with Real-time Insights</CardTitle>
            <CardContent>
              <IntelligentDashboard />
            </CardContent>
          </CardHeader>
        </Card>
      </TabsContent>
      
      <TabsContent value="transactions" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Streamlined Transaction Flow</CardTitle>
            <CardContent>
              <StreamlinedTransactionFlow />
            </CardContent>
          </CardHeader>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function EnhancedOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [riskTolerance, setRiskTolerance] = useState('moderate');
  const [investmentGoal, setInvestmentGoal] = useState('growth');
  const [timeHorizon, setTimeHorizon] = useState('medium');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [recommendedStrategies, setRecommendedStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  
  const steps = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'risk', title: 'Risk Profile' },
    { id: 'goals', title: 'Investment Goals' },
    { id: 'experience', title: 'Experience' },
    { id: 'recommendations', title: 'Recommendations' }
  ];
  
  // Generate personalized strategy recommendations based on user inputs
  const generateRecommendations = () => {
    setLoading(true);
    
    // Simulate API call or processing time
    setTimeout(() => {
      // Logic to determine strategies based on user preferences
      const strategies: Strategy[] = [];
      
      // Base strategy selection on risk tolerance
      if (riskTolerance === 'conservative') {
        strategies.push({
          id: 1,
          name: 'Stablecoin Yield Farming',
          description: 'Low-risk yield generation through stablecoin deposits in established protocols.',
          expectedReturn: '4-8% APY',
          riskLevel: 'Low',
          timeCommitment: 'Low',
          category: 'Yield',
          match: 95,
          icon: <IconCoins />
        });
      }
      
      if (riskTolerance === 'moderate' || riskTolerance === 'aggressive') {
        strategies.push({
          id: 2,
          name: 'Ethereum Liquid Staking',
          description: 'Stake ETH through liquid staking tokens for yield while maintaining liquidity.',
          expectedReturn: '3-5% APY',
          riskLevel: 'Low-Medium',
          timeCommitment: 'Very Low',
          category: 'Staking',
          match: riskTolerance === 'moderate' ? 90 : 75,
          icon: <IconLayers />
        });
      }
      
      if (riskTolerance === 'moderate' || riskTolerance === 'aggressive') {
        strategies.push({
          id: 3,
          name: 'DeFi Index Funds',
          description: 'Diversified exposure to DeFi tokens through automated index products.',
          expectedReturn: '10-20% APY',
          riskLevel: 'Medium',
          timeCommitment: 'Low',
          category: 'Index',
          match: riskTolerance === 'moderate' ? 85 : 88,
          icon: <IconBarChart />
        });
      }
      
      if (riskTolerance === 'aggressive') {
        strategies.push({
          id: 4,
          name: 'Liquidity Providing',
          description: 'Provide liquidity to AMM pools to earn trading fees and incentive rewards.',
          expectedReturn: '15-40% APY',
          riskLevel: 'Medium-High',
          timeCommitment: 'Medium',
          category: 'Liquidity',
          match: 92,
          icon: <IconRefreshCcw />
        });
      }
      
      if (experienceLevel === 'advanced' && riskTolerance === 'aggressive') {
        strategies.push({
          id: 5,
          name: 'Leverage Farming',
          description: 'Amplify yields through leveraged positions in lending/borrowing protocols.',
          expectedReturn: '20-100% APY',
          riskLevel: 'High',
          timeCommitment: 'High',
          category: 'Advanced',
          match: 78,
          icon: <IconTrendingUp />
        });
      }
      
      // Adjust match percentages based on investment goals
      strategies.forEach(strategy => {
        if (investmentGoal === 'income' && strategy.category === 'Yield') {
          strategy.match += 5;
        } else if (investmentGoal === 'growth' && strategy.category === 'Index') {
          strategy.match += 5;
        }
        
        // Cap at 100%
        if (strategy.match > 100) strategy.match = 100;
      });
      
      // Sort by match percentage
      const sortedStrategies = strategies.sort((a, b) => b.match - a.match);
      
      setRecommendedStrategies(sortedStrategies);
      setLoading(false);
      setCurrentStep(4); // Move to recommendations step
    }, 1500);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
                {stepIdx < currentStep ? (
                  <div className="group">
                    <span className="flex items-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                        <IconCheck />
                      </span>
                      <span className="ml-2.5 text-sm font-medium">{step.title}</span>
                    </span>
                    {stepIdx !== steps.length - 1 && (
                      <span className="absolute top-4 h-0.5 w-full bg-primary" />
                    )}
                  </div>
                ) : stepIdx === currentStep ? (
                  <div className="flex items-center" aria-current="step">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary">
                      <span className="text-sm font-semibold text-primary">{stepIdx + 1}</span>
                    </span>
                    <span className="ml-2.5 text-sm font-medium">{step.title}</span>
                    {stepIdx !== steps.length - 1 && (
                      <span className="absolute top-4 right-0 h-0.5 w-full bg-muted" />
                    )}
                  </div>
                ) : (
                  <div className="group">
                    <div className="flex items-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-muted bg-background">
                        <span className="text-sm font-semibold text-muted-foreground">{stepIdx + 1}</span>
                      </span>
                      <span className="ml-2.5 text-sm font-medium text-muted-foreground">{step.title}</span>
                    </div>
                    {stepIdx !== steps.length - 1 && (
                      <span className="absolute top-4 right-0 h-0.5 w-full bg-muted" />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      
      <div className="bg-muted/30 border rounded-xl p-6">
        {/* Step 1: Welcome Screen */}
        {currentStep === 0 && (
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <IconUser />
            </div>
            <h2 className="text-2xl font-bold mb-4">Welcome to Your Personalized Onboarding</h2>
            <p className="text-gray-600 mb-6">
              We&apos;ll ask you a few questions to understand your preferences and goals.
              Then, we&apos;ll recommend personalized strategies that match your profile.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8 w-full">
              <div className="p-4 border rounded-lg bg-card text-center">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <IconShield />
                </div>
                <h3 className="font-medium mb-1">Risk Profile</h3>
                <p className="text-xs text-muted-foreground">Assess your risk tolerance</p>
              </div>
              <div className="p-4 border rounded-lg bg-card text-center">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <IconLineChart />
                </div>
                <h3 className="font-medium mb-1">Goals</h3>
                <p className="text-xs text-muted-foreground">Define your investment goals</p>
              </div>
              <div className="p-4 border rounded-lg bg-card text-center">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <IconPresentation />
                </div>
                <h3 className="font-medium mb-1">Recommendations</h3>
                <p className="text-xs text-muted-foreground">Get personalized strategies</p>
              </div>
            </div>
            <Button size="lg" onClick={() => setCurrentStep(1)}>
              Get Started
            </Button>
          </div>
        )}
        
        {/* Step 2: Risk Profile */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-2">What's your risk tolerance?</h2>
            <p className="text-gray-600 mb-6">
              This helps us determine which strategies align with your comfort level for volatility and potential losses.
            </p>
            
            <div className="space-y-4 mb-8">
              <div 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                  riskTolerance === 'conservative' 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setRiskTolerance('conservative')}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    riskTolerance === 'conservative' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {riskTolerance === 'conservative' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <h3 className="font-medium ml-3">Conservative</h3>
                </div>
                <p className="text-sm text-gray-600 mt-2 ml-8">
                  I prefer stability and am uncomfortable with significant volatility. 
                  I prioritize protecting my capital over maximizing returns.
                </p>
              </div>
              
              <div 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                  riskTolerance === 'moderate' 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setRiskTolerance('moderate')}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    riskTolerance === 'moderate' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {riskTolerance === 'moderate' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <h3 className="font-medium ml-3">Moderate</h3>
                </div>
                <p className="text-sm text-gray-600 mt-2 ml-8">
                  I can tolerate some volatility in exchange for higher potential returns. 
                  I seek a balance between growth and capital preservation.
                </p>
              </div>
              
              <div 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                  riskTolerance === 'aggressive' 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setRiskTolerance('aggressive')}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    riskTolerance === 'aggressive' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {riskTolerance === 'aggressive' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <h3 className="font-medium ml-3">Aggressive</h3>
                </div>
                <p className="text-sm text-gray-600 mt-2 ml-8">
                  I'm comfortable with significant volatility for the potential of high returns. 
                  I understand I could lose a substantial portion of my investment.
                </p>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(2)}>
                Continue
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 3: Investment Goals */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-2">What are your primary investment goals?</h2>
            <p className="text-gray-600 mb-6">
              Your objectives will help us recommend strategies that align with your financial aims.
            </p>
            
            <div className="space-y-4 mb-8">
              <div 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                  investmentGoal === 'income' 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setInvestmentGoal('income')}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    investmentGoal === 'income' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {investmentGoal === 'income' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium">Income Generation</h3>
                    <p className="text-xs text-muted-foreground">Passive income through yield farming, staking, etc.</p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                  investmentGoal === 'growth' 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setInvestmentGoal('growth')}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    investmentGoal === 'growth' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {investmentGoal === 'growth' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium">Capital Growth</h3>
                    <p className="text-xs text-muted-foreground">Focus on increasing portfolio value over time</p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                  investmentGoal === 'preservation' 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setInvestmentGoal('preservation')}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    investmentGoal === 'preservation' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {investmentGoal === 'preservation' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium">Capital Preservation</h3>
                    <p className="text-xs text-muted-foreground">Minimize risk while generating modest returns</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-base font-medium mb-3">Investment Time Horizon</h3>
              <div className="flex space-x-3">
                <Button 
                  variant={timeHorizon === 'short' ? 'default' : 'outline'}
                  onClick={() => setTimeHorizon('short')}
                  className="flex-1"
                >
                  Short Term<br/>(&lt;1 year)
                </Button>
                <Button 
                  variant={timeHorizon === 'medium' ? 'default' : 'outline'}
                  onClick={() => setTimeHorizon('medium')}
                  className="flex-1"
                >
                  Medium Term<br/>(1-3 years)
                </Button>
                <Button 
                  variant={timeHorizon === 'long' ? 'default' : 'outline'}
                  onClick={() => setTimeHorizon('long')}
                  className="flex-1"
                >
                  Long Term<br/>(&gt;3 years)
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 4: Experience Level */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-2">What's your experience level with DeFi?</h2>
            <p className="text-gray-600 mb-6">
              This helps us tailor recommendations to your comfort level with various DeFi protocols and concepts.
            </p>
            
            <div className="space-y-4 mb-8">
              <div 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                  experienceLevel === 'beginner' 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setExperienceLevel('beginner')}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    experienceLevel === 'beginner' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {experienceLevel === 'beginner' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium">Beginner</h3>
                    <p className="text-sm text-gray-600">I'm new to DeFi and looking for simple, user-friendly options.</p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                  experienceLevel === 'intermediate' 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setExperienceLevel('intermediate')}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    experienceLevel === 'intermediate' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {experienceLevel === 'intermediate' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium">Intermediate</h3>
                    <p className="text-sm text-gray-600">I understand most DeFi concepts and have used several protocols.</p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                  experienceLevel === 'advanced' 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setExperienceLevel('advanced')}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    experienceLevel === 'advanced' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {experienceLevel === 'advanced' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium">Advanced</h3>
                    <p className="text-sm text-gray-600">I'm experienced with complex DeFi strategies and comfortable with technical details.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button 
                onClick={generateRecommendations}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <IconLoader2 />
                    Generating...
                  </>
                ) : "Generate Recommendations"}
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 5: Personalized Recommendations */}
        {currentStep === 4 && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">Your Personalized Strategy Recommendations</h2>
              <p className="text-gray-400 text-sm mt-2">
                Based on your profile, here are the strategies that best match your preferences.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {recommendedStrategies.map((strategy) => (
                <div key={strategy.id} className="border rounded-lg bg-card overflow-hidden">
                  <div className="bg-muted/30 p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {strategy.icon}
                      </div>
                      <div>
                        <h3 className="font-medium">{strategy.name}</h3>
                        <div className="flex items-center mt-0.5">
                          <span className="text-xs text-muted-foreground mr-2">Match score:</span>
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${strategy.match}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium ml-2">{strategy.match}%</span>
                        </div>
                      </div>
                    </div>
                    <Badge>{strategy.category}</Badge>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-4">{strategy.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-muted/30 rounded p-2 text-center">
                        <h4 className="text-xs text-muted-foreground">Expected Return</h4>
                        <span className="text-sm font-medium">{strategy.expectedReturn}</span>
                      </div>
                      <div className="bg-muted/30 rounded p-2 text-center">
                        <h4 className="text-xs text-muted-foreground">Risk Level</h4>
                        <span className="text-sm font-medium">{strategy.riskLevel}</span>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" className="w-full">
                      Learn More
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                Back
              </Button>
              <Button>
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IntelligentDashboard() {
  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({ 
    totalValue: 0, 
    dayChange: 0, 
    weeklyChange: 0, 
    assets: [] 
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalReturn: 0,
    roi: 0,
    apr: 0,
    riskMetric: 0
  });
  const [marketInsights, setMarketInsights] = useState<Insight[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Simulate fetching portfolio data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock portfolio data
      setPortfolioData({
        totalValue: 12485.62,
        dayChange: 2.3,
        weeklyChange: -1.7,
        assets: [
          { 
            id: 1, 
            name: 'Ethereum', 
            symbol: 'ETH', 
            amount: 2.45, 
            value: 4891.25, 
            allocation: 39.2,
            priceChange24h: 4.5,
            color: '#627EEA'
          },
          { 
            id: 2, 
            name: 'USD Coin', 
            symbol: 'USDC', 
            amount: 3500, 
            value: 3500, 
            allocation: 28.0,
            priceChange24h: 0.01,
            color: '#2775CA'
          },
          { 
            id: 3, 
            name: 'Arbitrum', 
            symbol: 'ARB', 
            amount: 2200, 
            value: 2156, 
            allocation: 17.3,
            priceChange24h: -2.3,
            color: '#12AAFF'
          },
          { 
            id: 4, 
            name: 'Aave', 
            symbol: 'AAVE', 
            amount: 15, 
            value: 1215.75, 
            allocation: 9.7,
            priceChange24h: 1.8,
            color: '#B6509E'
          },
          { 
            id: 5, 
            name: 'Other Assets', 
            symbol: 'VARIOUS', 
            amount: null, 
            value: 722.62, 
            allocation: 5.8,
            priceChange24h: 0.5,
            color: '#CCCCCC'
          }
        ]
      });
      
      // Mock performance metrics
      setPerformanceMetrics({
        totalReturn: 2485.62,
        roi: 24.85,
        apr: 32.6,
        riskMetric: 68 // Risk-adjusted return metric (higher is better)
      });
      
      // Mock market insights
      setMarketInsights([
        {
          id: 1,
          type: 'market_trend',
          title: 'ETH Gas Prices Below Average',
          description: 'Current gas prices are 22% lower than the weekly average. Consider making transactions now.',
          priority: 'high',
          icon: <IconTrendingUp />
        },
        {
          id: 2,
          type: 'portfolio_alert',
          title: 'Portfolio Rebalance Recommended',
          description: 'Your stablecoin allocation has exceeded your target. Consider redeploying into yield-bearing assets.',
          priority: 'medium',
          icon: <IconRefreshCcw />
        },
        {
          id: 3,
          type: 'market_opportunity',
          title: 'Lending Rates Increased on Aave',
          description: 'USDC lending rates on Aave have increased to 4.2% APY, 0.8% higher than your current position.',
          priority: 'medium',
          icon: <IconTrendingUp />
        },
        {
          id: 4,
          type: 'risk_alert',
          title: 'High Concentration Risk',
          description: 'Consider diversifying further as 39% of your portfolio is in a single asset (ETH).',
          priority: 'low',
          icon: <IconShield />
        }
      ]);
      
      setLoading(false);
    };
    
    fetchData();
  }, []);
  
  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percent values
  const formatPercent = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  const getPercentColor = (value: number): string => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };
  
  // Render priority badge
  const renderPriorityBadge = (priority: string): JSX.Element => {
    const colors: {[key: string]: string} = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${colors[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Intelligent Dashboard</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <IconRefreshCcw />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <IconSettings />
            Settings
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <IconLoader2 />
            <p className="text-muted-foreground">Loading your intelligent dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Portfolio Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Portfolio Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolioData.totalValue)}
                </div>
                <div className="flex items-center mt-1">
                  <span className={`text-sm ${getPercentColor(portfolioData.dayChange)}`}>
                    {formatPercent(portfolioData.dayChange)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    24h
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Return
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(performanceMetrics.totalReturn)}
                </div>
                <div className="flex items-center mt-1">
                  <span className={`text-sm ${getPercentColor(performanceMetrics.roi)}`}>
                    {formatPercent(performanceMetrics.roi)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ROI
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Performance Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="text-2xl font-bold mr-2">
                    {performanceMetrics.riskMetric}/100
                  </div>
                  {performanceMetrics.riskMetric >= 80 ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Excellent</Badge>
                  ) : performanceMetrics.riskMetric >= 60 ? (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Good</Badge>
                  ) : performanceMetrics.riskMetric >= 40 ? (
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Moderate</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Needs Improvement</Badge>
                  )}
                </div>
                <div className="mt-2">
                  <Progress value={performanceMetrics.riskMetric} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Dashboard Tabs */}
          <div className="border-b">
            <div className="flex space-x-6">
              <button
                className={`pb-2 px-1 text-sm font-medium ${
                  activeTab === 'overview' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`pb-2 px-1 text-sm font-medium ${
                  activeTab === 'assets' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('assets')}
              >
                Assets
              </button>
              <button
                className={`pb-2 px-1 text-sm font-medium ${
                  activeTab === 'insights' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('insights')}
              >
                Insights
              </button>
              <button
                className={`pb-2 px-1 text-sm font-medium ${
                  activeTab === 'performance' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('performance')}
              >
                Performance
              </button>
            </div>
          </div>
          
          {/* Dashboard Content */}
          <div>
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Portfolio Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="h-48 w-48 mx-auto relative">
                            {/* This would be a real chart component in a production app */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-20 w-20 rounded-full border-4 bg-card flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">Total</div>
                                  <div className="font-bold">
                                    {formatCurrency(portfolioData.totalValue)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium mb-3">Assets</h3>
                          <div className="space-y-3">
                            {portfolioData.assets.map((asset) => (
                              <div key={asset.id} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div 
                                    className="h-3 w-3 rounded-full mr-2" 
                                    style={{ backgroundColor: asset.color }}
                                  ></div>
                                  <span className="text-sm">{asset.symbol}</span>
                                </div>
                                <div className="text-sm font-medium">
                                  {asset.allocation.toFixed(1)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg">Smart Insights</CardTitle>
                      <CardContent className="space-y-4">
                        {marketInsights.slice(0, 3).map((insight) => (
                          <div key={insight.id} className="border-b pb-3 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                  {insight.icon}
                                </div>
                                <h3 className="font-medium text-sm">{insight.title}</h3>
                              </div>
                              {renderPriorityBadge(insight.priority)}
                            </div>
                            <p className="text-xs text-muted-foreground ml-10">
                              {insight.description}
                            </p>
                          </div>
                        ))}
                        <Button variant="ghost" className="w-full text-xs" size="sm">
                          View All Insights
                        </Button>
                      </CardContent>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            )}
            
            {activeTab === 'assets' && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 font-medium">Asset</th>
                          <th className="text-right py-3 font-medium">Amount</th>
                          <th className="text-right py-3 font-medium">Value</th>
                          <th className="text-right py-3 font-medium">Allocation</th>
                          <th className="text-right py-3 font-medium">24h Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioData.assets.map((asset) => (
                          <tr key={asset.id} className="border-b last:border-0">
                            <td className="py-3">
                              <div className="flex items-center">
                                <div 
                                  className="h-8 w-8 rounded-full mr-2 flex items-center justify-center"
                                  style={{ backgroundColor: `${asset.color}30` }}
                                >
                                  <div 
                                    className="h-4 w-4 rounded-full" 
                                    style={{ backgroundColor: asset.color }}
                                  ></div>
                                </div>
                                <div>
                                  <div className="font-medium">{asset.name}</div>
                                  <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                                </div>
                              </div>
                            </td>
                            <td className="text-right py-3">
                              {asset.amount ? asset.amount.toLocaleString() : '-'}
                            </td>
                            <td className="text-right py-3 font-medium">
                              {formatCurrency(asset.value)}
                            </td>
                            <td className="text-right py-3">
                              {asset.allocation.toFixed(1)}%
                            </td>
                            <td className={`text-right py-3 ${getPercentColor(asset.priceChange24h)}`}>
                              {formatPercent(asset.priceChange24h)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {activeTab === 'insights' && (
              <Card>
                <CardHeader>
                  <CardTitle>Market & Portfolio Insights</CardTitle>
                  <CardContent>
                    <div className="space-y-6">
                      {marketInsights.map((insight) => (
                        <div key={insight.id} className="border-b pb-6 last:border-0 last:pb-0">
                          <div className="flex items-start mb-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3 mt-1">
                              {insight.icon}
                            </div>
                            <div>
                              <div className="flex items-center mb-1">
                                <h3 className="font-medium">{insight.title}</h3>
                                <div className="ml-3">
                                  {renderPriorityBadge(insight.priority)}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                          <div className="ml-13 pl-13 flex space-x-2">
                            {insight.type === 'portfolio_alert' && (
                              <Button size="sm">Rebalance Now</Button>
                            )}
                            {insight.type === 'market_opportunity' && (
                              <Button size="sm">View Strategy</Button>
                            )}
                            <Button variant="outline" size="sm">Learn More</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CardHeader>
              </Card>
            )}
            
            {activeTab === 'performance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Total Return</div>
                          <div className="text-xl font-bold mt-1">
                            {formatCurrency(performanceMetrics.totalReturn)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Return on Investment</div>
                          <div className="text-xl font-bold mt-1 text-green-500">
                            {formatPercent(performanceMetrics.roi)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex justify-between mb-1">
                          <div className="text-sm">Annual Percentage Rate (APR)</div>
                          <div className="text-sm font-medium">{formatPercent(performanceMetrics.apr)}</div>
                        </div>
                        <Progress value={performanceMetrics.apr} max={50} className="h-2" />
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex justify-between mb-1">
                          <div className="text-sm">Risk-Adjusted Performance</div>
                          <div className="text-sm font-medium">{performanceMetrics.riskMetric}/100</div>
                        </div>
                        <Progress value={performanceMetrics.riskMetric} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <IconLineChart />
                        <p>Performance chart would be displayed here</p>
                        <p className="text-sm">Historical performance data visualization</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StreamlinedTransactionFlow() {
  // Transaction flow state
  const [activeStep, setActiveStep] = useState(0);
  const [transactionDetails, setTransactionDetails] = useState({
    type: 'swap',
    fromToken: 'ETH',
    toToken: 'USDC',
    fromAmount: 0.5,
    toAmount: 825.75,
    slippage: 0.5,
    gasOption: 'standard',
    gasPrice: 25, // in Gwei
    estimatedFee: 0.0045, // ETH
    totalValue: 0.5045, // ETH
    exchanges: [
      { name: '1inch', rate: 1651.5, gasCost: 0.0045 },
      { name: 'Uniswap', rate: 1650.2, gasCost: 0.0052 },
      { name: 'SushiSwap', rate: 1649.8, gasCost: 0.0048 }
    ]
  });
  
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'simulating' | 'success' | 'error'>('idle');
  const [simulationResults, setSimulationResults] = useState<SimulationResult | null>(null);
  const [simulationErrors, setSimulationErrors] = useState<SimulationError | null>(null);
  const [transactionState, setTransactionState] = useState({
    status: 'idle', // idle, loading, simulating, confirming, sending, success, error
    txHash: '',
    errorMessage: '',
    confirmedBlocks: 0
  });
  
  const steps = [
    { id: 'details', title: 'Transaction Details' },
    { id: 'review', title: 'Review & Simulate' },
    { id: 'confirm', title: 'Confirm & Send' },
    { id: 'receipt', title: 'Transaction Receipt' }
  ];
  
  // Define the TransactionParams interface
  interface TransactionParams {
    type: string;
    fromToken: string;
    toToken: string;
    fromAmount: number;
    toAmount: number;
    slippage: number;
    gasOption: string;
    gasPrice: number;
    estimatedFee: number;
    totalValue: number;
    exchanges?: Array<{
      name: string;
      rate: number;
      gasCost: number;
    }>;
  }
  
  // Simulate transaction for preview
  const simulateTransaction = async (transactionParams: TransactionParams) => {
    setSimulationStatus('simulating');
    setSimulationErrors(null);
    setSimulationResults(null);
    
    try {
      // Simulate delay for API response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const simulationResponse = {
        success: true,
        gasCost: "0.003 ETH",
        estimatedNetworkFee: "0.0015 ETH",
        estimatedPriorityFee: "0.0005 ETH",
        estimatedTime: "30 seconds",
        optimizationSuggestions: [
          "Using a different gas fee option could save up to 15%",
          "Transaction could be bundled with other operations"
        ]
      };
      
      // Update with the simulation results
      setSimulationResults(simulationResponse);
      setSimulationStatus('success');
    } catch (error) {
      setSimulationStatus('error');
      setSimulationErrors({
        message: "Failed to simulate transaction. Please try again.",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  // Send transaction
  const sendTransaction = () => {
    setTransactionState({ ...transactionState, status: 'sending' });
    // Simulate transaction submission
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate for demo
      
      if (success) {
        const fakeTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        setTransactionState({
          status: 'success',
          txHash: fakeTxHash,
          errorMessage: '',
          confirmedBlocks: 1
        });
        
        // Simulate block confirmations
        let confirmations = 1;
        const confirmInterval = setInterval(() => {
          confirmations++;
          setTransactionState(prev => ({
            ...prev,
            confirmedBlocks: confirmations
          }));
          
          if (confirmations >= 12) {
            clearInterval(confirmInterval);
          }
        }, 1000);
        
        // Advance to receipt step
        setActiveStep(3);
      } else {
        setTransactionState({
          status: 'error',
          txHash: '',
          errorMessage: 'Transaction failed: insufficient funds for gas',
          confirmedBlocks: 0
        });
      }
    }, 2000);
  };
  
  // Reset flow
  const resetFlow = () => {
    setActiveStep(0);
    setSimulationResults(null);
    setSimulationErrors(null);
    setTransactionState({
      status: 'idle',
      txHash: '',
      errorMessage: '',
      confirmedBlocks: 0
    });
  };
  
  // Change gas option
  const selectGasOption = (option: string): void => {
    const gasOptions: {[key: string]: {price: number; fee: number}} = {
      'slow': { price: 20, fee: 0.0036 },
      'standard': { price: 25, fee: 0.0045 },
      'fast': { price: 30, fee: 0.0054 }
    };
    
    setTransactionDetails({
      ...transactionDetails,
      gasOption: option,
      gasPrice: gasOptions[option].price,
      estimatedFee: gasOptions[option].fee,
      totalValue: transactionDetails.fromAmount + gasOptions[option].fee
    });
  };
  
  // Handle input change with proper type
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setTransactionDetails({
      ...transactionDetails,
      fromAmount: parseFloat(e.target.value) || 0,
      toAmount: parseFloat(e.target.value) * 1651.5 || 0
    });
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
                {stepIdx < activeStep ? (
                  <div className="group">
                    <span className="flex items-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                        <IconCheck />
                      </span>
                      <span className="ml-2.5 text-sm font-medium">{step.title}</span>
                    </span>
                    {stepIdx !== steps.length - 1 && (
                      <span className="absolute top-4 h-0.5 w-full bg-primary" />
                    )}
                  </div>
                ) : stepIdx === activeStep ? (
                  <div className="flex items-center" aria-current="step">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary">
                      <span className="text-sm font-semibold text-primary">{stepIdx + 1}</span>
                    </span>
                    <span className="ml-2.5 text-sm font-medium">{step.title}</span>
                    {stepIdx !== steps.length - 1 && (
                      <span className="absolute top-4 right-0 h-0.5 w-full bg-muted" />
                    )}
                  </div>
                ) : (
                  <div className="group">
                    <div className="flex items-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-muted bg-background">
                        <span className="text-sm font-semibold text-muted-foreground">{stepIdx + 1}</span>
                      </span>
                      <span className="ml-2.5 text-sm font-medium text-muted-foreground">{step.title}</span>
                    </div>
                    {stepIdx !== steps.length - 1 && (
                      <span className="absolute top-4 right-0 h-0.5 w-full bg-muted" />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      
      <div className="bg-muted/30 border rounded-xl p-6">
        {/* Step 1: Transaction Details */}
        {activeStep === 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Swap</h3>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <IconArrowsUpDown />
                  Swap
                </Button>
                <Button variant="outline" size="sm">
                  <IconSettings />
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="font-bold text-sm">Ξ</span>
                    </div>
                    <span className="font-semibold">{transactionDetails.fromToken}</span>
                  </div>
                  <div>
                    <Input 
                      className="text-right text-lg font-medium"
                      value={transactionDetails.fromAmount}
                      onChange={handleInputChange}
                    />
                    <div className="text-right text-sm text-muted-foreground">
                      ≈ ${(transactionDetails.fromAmount * 1651.5).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center -my-2 relative z-10">
                <div className="bg-background rounded-full border p-1.5">
                  <IconArrowDown />
                </div>
              </div>
              
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="font-bold text-sm">$</span>
                    </div>
                    <span className="font-semibold">{transactionDetails.toToken}</span>
                  </div>
                  <div>
                    <Input 
                      className="text-right text-lg font-medium"
                      value={transactionDetails.toAmount.toFixed(2)}
                      readOnly
                    />
                    <div className="text-right text-sm text-muted-foreground">
                      ≈ ${transactionDetails.toAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Exchange rate</span>
                <span className="text-sm">1 ETH = {transactionDetails.exchanges[0].rate} USDC</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gas price</span>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={transactionDetails.gasOption === 'slow' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => selectGasOption('slow')}
                  >
                    Slow
                  </Badge>
                  <Badge 
                    variant={transactionDetails.gasOption === 'standard' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => selectGasOption('standard')}
                  >
                    Standard
                  </Badge>
                  <Badge 
                    variant={transactionDetails.gasOption === 'fast' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => selectGasOption('fast')}
                  >
                    Fast
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Network fee</span>
                <span className="text-sm">{transactionDetails.estimatedFee} ETH (${(transactionDetails.estimatedFee * 1651.5).toFixed(2)})</span>
              </div>
              
              <div className="flex justify-between items-center font-medium">
                <span className="text-sm">Total amount</span>
                <span className="text-sm">{transactionDetails.totalValue} ETH (${(transactionDetails.totalValue * 1651.5).toFixed(2)})</span>
              </div>
            </div>
            
            <Button className="w-full" onClick={() => setActiveStep(1)}>Continue</Button>
          </div>
        )}
        
        {/* Step 2: Review & Simulate */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Review & Simulate</h3>
              <p className="text-sm text-gray-600 mt-2">
                Preview your transaction's outcome with a gas-free simulation before sending.
              </p>
            </div>
            
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="font-medium">Transaction Summary</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveStep(0)}>
                  Edit
                </Button>
              </div>
              
              <div className="flex items-center justify-center space-x-4 py-2">
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="font-bold">Ξ</span>
                  </div>
                  <span className="mt-1 font-medium">{transactionDetails.fromAmount} {transactionDetails.fromToken}</span>
                </div>
                
                <ArrowRightIcon className="h-5 w-5 text-muted-foreground" />
                
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="font-bold">$</span>
                  </div>
                  <span className="mt-1 font-medium">{transactionDetails.toAmount.toFixed(2)} {transactionDetails.toToken}</span>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exchange</span>
                  <span>{transactionDetails.exchanges[0].name}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gas price</span>
                  <span>{transactionDetails.gasPrice} Gwei ({transactionDetails.gasOption})</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max slippage</span>
                  <span>{transactionDetails.slippage}%</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <div className="flex-1">
                <Button variant="outline" className="w-full" onClick={() => setActiveStep(0)}>
                  Back
                </Button>
              </div>
              <div className="flex-1">
                <Button 
                  className="w-full" 
                  onClick={() => simulateTransaction(transactionDetails)}
                  disabled={transactionState.status === 'simulating'}
                >
                  {transactionState.status === 'simulating' ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Simulating...
                    </>
                  ) : "Simulate & Preview"}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Confirm & Send */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Confirm & Send</h3>
              <p className="text-sm text-gray-600 mt-2">
                Simulation was successful! Review the results before sending your transaction.
              </p>
            </div>
            
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 p-4 flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-300">Simulation Successful</h4>
                <p className="text-sm text-green-700 dark:text-green-400 text-center mt-1">
                  Your swap was processed successfully.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-medium mb-3">Balance Changes</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 px-2 rounded bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-bold text-xs">Ξ</span>
                      </div>
                      <span className="text-sm">{transactionDetails.fromToken}</span>
                    </div>
                    <span className="text-sm font-medium text-red-500">-{transactionDetails.fromAmount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 px-2 rounded bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-bold text-xs">$</span>
                      </div>
                      <span className="text-sm">{transactionDetails.toToken}</span>
                    </div>
                    <span className="text-sm font-medium text-emerald-500">+{transactionDetails.toAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 px-2 rounded bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-bold text-xs">Ξ</span>
                      </div>
                      <span className="text-sm">Network fee</span>
                    </div>
                    <span className="text-sm font-medium text-red-500">-{transactionDetails.estimatedFee}</span>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-medium mb-2">Transaction Impact</h4>
                <div className="flex items-center mb-1">
                  <span className="text-sm font-medium text-emerald-500 mr-2">Low Impact</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '15%' }}></div>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  This transaction will have minimal impact on prices and liquidity.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <div className="flex-1">
                <Button variant="outline" className="w-full" onClick={() => setActiveStep(1)}>
                  Back
                </Button>
              </div>
              <div className="flex-1">
                <Button 
                  className="w-full" 
                  onClick={sendTransaction}
                  disabled={transactionState.status === 'sending'}
                >
                  {transactionState.status === 'sending' ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : "Send Transaction"}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 4: Transaction Receipt */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Transaction Complete</h3>
              <p className="text-sm text-gray-600 mt-2">
                Your transaction has been submitted to the network.
              </p>
            </div>
            
            {transactionState.status === 'success' ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 p-6 flex flex-col items-center">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-3">
                    <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-medium text-lg text-green-800 dark:text-green-300">Transaction Successful</h4>
                  <p className="text-sm text-green-700 dark:text-green-400 text-center mt-1">
                    Your swap was processed successfully.
                  </p>
                  
                  <div className="mt-4 w-full space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confirmations</span>
                      <div className="flex items-center">
                        <span className="font-medium">{transactionState.confirmedBlocks}/12</span>
                        {transactionState.confirmedBlocks < 12 && (
                          <Loader2Icon className="ml-2 h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transaction Hash</span>
                      <div className="flex items-center">
                        <span className="font-mono text-xs truncate max-w-[150px]">
                          {transactionState.txHash.substring(0, 10)}...{transactionState.txHash.substring(transactionState.txHash.length - 8)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                          <CopyIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <h4 className="font-medium">Transaction Summary</h4>
                  
                  <div className="flex items-center justify-center space-x-4 py-2">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-bold">Ξ</span>
                      </div>
                      <span className="mt-1 font-medium">{transactionDetails.fromAmount} {transactionDetails.fromToken}</span>
                    </div>
                    
                    <ArrowRightIcon className="h-5 w-5 text-muted-foreground" />
                    
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-bold">$</span>
                      </div>
                      <span className="mt-1 font-medium">{transactionDetails.toAmount.toFixed(2)} {transactionDetails.toToken}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Button variant="outline" className="w-full" onClick={resetFlow}>
                      Start New Transaction
                    </Button>
                  </div>
                  <div className="flex-1">
                    <Button className="w-full">
                      View on Explorer
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 p-6 flex flex-col items-center">
                  <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-3">
                    <XIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h4 className="font-medium text-lg text-red-800 dark:text-red-300">Transaction Failed</h4>
                  <p className="text-sm text-red-700 dark:text-red-400 text-center mt-1">
                    {transactionState.errorMessage}
                  </p>
                </div>
                
                <Button className="w-full" onClick={() => setActiveStep(0)}>
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 