import { useState, useRef, useEffect, useCallback } from 'react';
import { VoiceButton } from '@/components/chat/VoiceButton';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { useVoice } from '@/hooks/useVoice';
import { getAIResponse } from '@/services/aiService';
import { ArrowLeft, Download, Database, User, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import aiAvatar from '@/assets/ai-avatar.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FullScreenChatProps {
  onExit: () => void;
}

export function FullScreenChat({ onExit }: FullScreenChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, isSpeaking, transcript, startListening, stopListening, speak, stopSpeaking, isSupported, clearTranscript } = useVoice();
  const { toast } = useToast();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth error:', error);
          setUser(null);
        } else {
          console.log('Auth session:', session?.user?.email);
          setUser(session?.user || null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setUser(null);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Switch to conversation view
    if (!showConversation) {
      setShowConversation(true);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get conversation history including the current user message
      const conversationHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const response = await getAIResponse(content, conversationHistory);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto-speak the response
      if (isSupported) {
        setSpeakingMessageId(assistantMessage.id);
        speak(response);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, speak, isSupported, showConversation]);

  // Handle voice transcript - prevent duplicate sends
  useEffect(() => {
    if (!isListening && transcript && transcript.trim()) {
      // Clear transcript immediately to prevent duplicate sends
      const transcriptToSend = transcript;
      clearTranscript();
      handleSendMessage(transcriptToSend);
    }
  }, [isListening, transcript, handleSendMessage, clearTranscript]);

  // Handle speaking state
  useEffect(() => {
    if (!isSpeaking) {
      setSpeakingMessageId(null);
    }
  }, [isSpeaking]);

  const handleSpeak = (messageId: string, content: string) => {
    if (speakingMessageId === messageId) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      setSpeakingMessageId(messageId);
      speak(content);
    }
  };

  const handleDownloadDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*');

      if (error) {
        toast({
          title: "Error",
          description: "Failed to download database. Please check your permissions.",
          variant: "destructive"
        });
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Handle null/undefined values and escape commas
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_database_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Downloaded ${data.length} orders from database.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download database. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  // Initial welcome screen (like the reference image)
  if (!showConversation) {
    return (
      <div className="flex flex-col h-screen bg-black items-center justify-center px-6 relative">
        {/* Top bar with controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          
          <div className="flex gap-2">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadDatabase}
                className="text-gray-400 hover:text-white"
                title="Download Database"
              >
                <Download size={20} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-400 hover:text-white"
              title="Sign Out"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>

        {/* AI Avatar */}
        <div className="relative mb-8">
          <div className={`transition-all duration-500 ${isListening ? 'scale-110' : 'scale-100'}`}>
            <img 
              src={aiAvatar} 
              alt="ARKIO AI" 
              className="w-56 h-72 object-contain"
            />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-cyan-500/20 blur-3xl -z-10 rounded-full" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-light tracking-[0.5em] text-cyan-400 mb-4">
          A R K I O
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-center mb-12 font-light">
          I'm a Virtual Assistant ARKIO, How may I help you?
        </p>

        {/* Voice Button */}
        <button
          onClick={startListening}
          disabled={!isSupported || isLoading}
          className={`
            w-full max-w-sm flex items-center justify-center gap-3 
            py-4 px-8 rounded-lg transition-all duration-300
            ${isListening 
              ? 'bg-cyan-500 text-black' 
              : 'bg-gray-600/50 hover:bg-gray-600/70 text-gray-300'
            }
          `}
        >
          <span className="text-lg font-medium">
            {isListening ? 'Listening...' : 'Click here to speak'}
          </span>
        </button>

        {/* Or type message */}
        <div className="mt-8 w-full max-w-sm">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder="Or type your message..."
          />
        </div>

        {/* User info */}
        {user ? (
          <div className="absolute bottom-4 left-4 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <User size={16} />
              <div className="flex flex-col">
                <span className="font-medium text-white">{user.user_metadata?.full_name || user.email}</span>
                <span className="text-xs text-gray-500">{user.email}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-4 left-4 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>Guest User</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Conversation view
  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Top bar */}
      <div className="flex-shrink-0 p-4 flex justify-between items-center border-b border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Button>
        
        <h2 className="text-cyan-400 font-medium">ARKIO Assistant</h2>
        
        <div className="flex gap-2">
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadDatabase}
              className="text-gray-400 hover:text-white"
              title="Download Database"
            >
              <Download size={20} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-gray-400 hover:text-white"
            title="Sign Out"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
            onSpeak={message.role === 'assistant' ? () => handleSpeak(message.id, message.content) : undefined}
            onStopSpeak={stopSpeaking}
            isSpeaking={speakingMessageId === message.id}
          />
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary arkio-glow-sm flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">A</span>
            </div>
            <div className="bg-secondary px-4 py-3 rounded-lg rounded-tl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Voice button area */}
      <div className="flex-shrink-0 py-6 flex justify-center">
        <VoiceButton
          isListening={isListening}
          isSpeaking={isSpeaking}
          onPress={startListening}
          onRelease={stopListening}
          disabled={isLoading || !isSupported}
        />
      </div>

      {/* Text input */}
      <div className="flex-shrink-0 px-4 pb-4">
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder="Or type your message..."
        />
      </div>

      {/* User info in conversation view */}
      {user && (
        <div className="absolute bottom-20 right-4 text-gray-400 text-xs">
          <div className="flex items-center gap-2">
            <User size={12} />
            <span>{user.user_metadata?.full_name || user.email}</span>
          </div>
        </div>
      )}
    </div>
  );
}
