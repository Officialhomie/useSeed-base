import React, { useState, useEffect, createContext, useContext } from 'react';
import TransactionNotification, { NotificationType } from '@/components/ui/TransactionNotification';

// Define the type for a notification
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  txHash?: string;
  autoClose?: boolean;
  linkUrl?: string;
  linkText?: string;
}

// Create context with default values
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  addNotification: () => '',
  removeNotification: () => {},
  clearAllNotifications: () => {},
});

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Add a new notification
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prevNotifications => [
      ...prevNotifications,
      { ...notification, id },
    ]);
    return id;
  };

  // Remove a notification by ID
  const removeNotification = (id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== id)
    );
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {notifications.map(notification => (
          <TransactionNotification
            key={notification.id}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            txHash={notification.txHash}
            autoClose={notification.autoClose}
            linkUrl={notification.linkUrl}
            linkText={notification.linkText}
            onDismiss={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Hook to use the notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider; 