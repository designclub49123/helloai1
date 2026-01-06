import { useState, useEffect } from 'react';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { SideMenu } from '@/components/layout/SideMenu';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { OrdersScreen } from '@/components/screens/OrdersScreen';
import { ChatScreen } from '@/components/screens/ChatScreen';
import { ProfileScreen } from '@/components/screens/ProfileScreen';
import { PredictiveAnalytics } from '@/components/screens/PredictiveAnalytics';
import { BusinessInsights } from '@/components/screens/BusinessInsights';
import { VisualRecognition } from '@/components/screens/VisualRecognition';
import { OrderTracking } from '@/components/screens/OrderTracking';
import { VoiceAssistant } from '@/components/screens/VoiceAssistant';
import { ARProductPreview } from '@/components/screens/ARProductPreview';
import { BlockchainVerification } from '@/components/screens/BlockchainVerification';
import { FullScreenChat } from '@/components/screens/FullScreenChat';
import { AuthScreen } from '@/components/screens/AuthScreen';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const [activeTab, setActiveTab] = useState('home');
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  // Handle URL hash for tracking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#track?order=')) {
        const orderId = hash.replace('#track?order=', '');
        setTrackingOrderId(orderId);
        setActiveTab('orders');
      } else {
        setTrackingOrderId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
      setIsLoading(false);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle chat tab click - go to full-screen mode
  useEffect(() => {
    if (activeTab === 'chat' && isAuthenticated) {
      setIsFullScreenChat(true);
      setActiveTab('home'); // Reset tab to avoid conflicts
    }
  }, [activeTab, isAuthenticated]);

  const handleNavigateToChat = () => {
    setIsFullScreenChat(true);
  };

  const handleExitFullScreenChat = () => {
    setIsFullScreenChat(false);
    setActiveTab('home');
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const renderScreen = () => {
    // Show tracking screen if trackingOrderId is set
    if (trackingOrderId) {
      return <OrderTracking orderId={trackingOrderId} />;
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateToChat={handleNavigateToChat} />;
      case 'orders':
        return <OrdersScreen />;
      case 'blockchain':
        return <BlockchainVerification />;
      case 'scan':
        return <VisualRecognition />;
      case 'chat':
        return <ChatScreen />;
      case 'voice':
        return <VoiceAssistant />;
      case 'ar':
        return <ARProductPreview />;
      case 'insights':
        return <BusinessInsights />;
      case 'predictive':
        return <PredictiveAnalytics />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onNavigateToChat={handleNavigateToChat} />;
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-2xl">Loading...</div>
      </div>
    );
  }

  // Show authentication screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Full-screen chat mode
  if (isFullScreenChat) {
    return <FullScreenChat onExit={handleExitFullScreenChat} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppBar onMenuClick={() => setIsSideMenuOpen(true)} />
      
      <SideMenu 
        isOpen={isSideMenuOpen} 
        onClose={() => setIsSideMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <main className="flex-1 pt-14 pb-20 overflow-hidden">
        {renderScreen()}
      </main>
      
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
