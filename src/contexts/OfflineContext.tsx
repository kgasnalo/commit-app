import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface OfflineContextType {
  isOnline: boolean;
}

const OfflineContext = createContext<OfflineContextType>({ isOnline: true });

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({ isOnline }), [isOnline]);

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOfflineStatus = () => useContext(OfflineContext);
