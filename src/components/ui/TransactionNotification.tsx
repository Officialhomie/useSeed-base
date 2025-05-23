import React from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiClock, FiExternalLink } from 'react-icons/fi';

export type NotificationType = 'success' | 'error' | 'warning' | 'pending';

interface TransactionNotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  txHash?: string;
  onDismiss: () => void;
  autoClose?: boolean;
  linkUrl?: string;
  linkText?: string;
}

const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <FiCheckCircle className="w-6 h-6 text-green-500" />;
    case 'error':
      return <FiXCircle className="w-6 h-6 text-red-500" />;
    case 'warning':
      return <FiAlertTriangle className="w-6 h-6 text-yellow-500" />;
    case 'pending':
      return <FiClock className="w-6 h-6 text-blue-500" />;
  }
};

const getBackground = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'bg-green-500/10 border-green-500/30';
    case 'error':
      return 'bg-red-500/10 border-red-500/30';
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/30';
    case 'pending':
      return 'bg-blue-500/10 border-blue-500/30';
  }
};

const getActionColor = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'text-green-400 hover:text-green-300';
    case 'error':
      return 'text-red-400 hover:text-red-300';
    case 'warning':
      return 'text-yellow-400 hover:text-yellow-300';
    case 'pending':
      return 'text-blue-400 hover:text-blue-300';
  }
};

const TransactionNotification: React.FC<TransactionNotificationProps> = ({
  type,
  title,
  message,
  txHash,
  onDismiss,
  autoClose = true,
  linkUrl,
  linkText
}) => {
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-lg border p-4 shadow-lg ${getBackground(type)} max-w-md w-full`}
    >
      <div className="flex">
        <div className="flex-shrink-0 mr-3">
          {getIcon(type)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="text-white font-medium">{title}</h3>
            <button onClick={onDismiss} className="text-gray-400 hover:text-white ml-4">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="mt-1 text-sm text-gray-300">
            {message}
          </div>
          
          {txHash && (
            <div className="mt-2 text-xs">
              <a 
                href={`https://etherscan.io/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center ${getActionColor(type)}`}
              >
                View on Etherscan <FiExternalLink className="ml-1" />
              </a>
            </div>
          )}
          
          {linkUrl && linkText && (
            <div className="mt-2 text-xs">
              <a 
                href={linkUrl}
                className={`flex items-center ${getActionColor(type)}`}
              >
                {linkText} <FiExternalLink className="ml-1" />
              </a>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TransactionNotification; 