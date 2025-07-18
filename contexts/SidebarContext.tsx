import React, { createContext, useContext, useState } from 'react';
import { Platform, Dimensions } from 'react-native';

interface SidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  shouldShowSidebar: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { width } = Dimensions.get('window');
  const shouldShowSidebar = Platform.OS === 'web' && width >= 768;

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);
  const openSidebar = () => setIsOpen(true);
  const toggleCollapsed = () => setIsCollapsed(!isCollapsed);

  return (
    <SidebarContext.Provider value={{
      isOpen,
      toggleSidebar,
      closeSidebar,
      openSidebar,
      isCollapsed,
      toggleCollapsed,
      shouldShowSidebar,
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};