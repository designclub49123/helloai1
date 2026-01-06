import { useState, useRef, useEffect, useCallback } from 'react';
import { VoiceButton } from '@/components/chat/VoiceButton';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { useVoice } from '@/hooks/useVoice';
import { getAIResponse } from '@/services/aiService';
import { Microphone2 } from 'iconsax-react';
import aiAvatar from '@/assets/ai-avatar.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, isSpeaking, transcript, startListening, stopListening, speak, stopSpeaking, isSupported } = useVoice();

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
      setTranscript('');
      handleSendMessage(transcriptToSend);
    }
  }, [isListening, transcript, handleSendMessage]);

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

  // Initial welcome screen (like the reference image)
  if (!showConversation) {
    return (
      <div className="flex flex-col h-full bg-black items-center justify-center px-6">
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
          <Microphone2 size={24} variant={isListening ? 'Bold' : 'Linear'} />
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
      </div>
    );
  }

  // Conversation view
  return (
    <div className="flex flex-col h-full">
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
    </div>
  );
}
