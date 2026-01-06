import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  HelpCircle,
  Sparkles,
  Brain,
  Globe,
  Heart,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { aiVoiceAssistantService, VoiceCommand, AIResponse } from '@/services/aiVoiceAssistantService';

export function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [commandHistory, setCommandHistory] = useState<VoiceCommand[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [showSettings, setShowSettings] = useState(false);
  const [emotion, setEmotion] = useState('neutral');
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize audio context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Load command history
    const history = aiVoiceAssistantService.getCommandHistory();
    setCommandHistory(history);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startListening = async () => {
    try {
      setIsListening(true);
      setTranscript('');
      setResponse('');
      setIsProcessing(true);
      
      await aiVoiceAssistantService.startListening();
      
      // Simulate real-time transcript
      const transcriptInterval = setInterval(() => {
        if (aiVoiceAssistantService.isCurrentlyListening()) {
          setTranscript(prev => prev + '...');
        } else {
          clearInterval(transcriptInterval);
        }
      }, 500);

    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
      setIsProcessing(false);
    }
  };

  const stopListening = () => {
    aiVoiceAssistantService.stopListening();
    setIsListening(false);
    setIsProcessing(false);
    
    // Simulate getting a response
    setTimeout(() => {
      const mockResponse = {
        text: "I found your order #OD20240115001! It's currently shipped and estimated to arrive tomorrow between 2-4 PM. Would you like me to set up delivery alerts?",
        suggestions: ['Set delivery alerts', 'Track delivery person', 'Contact support']
      };
      setResponse(mockResponse.text);
      setSuggestions(mockResponse.suggestions);
      setIsSpeaking(true);
      
      // Simulate speech synthesis
      setTimeout(() => {
        setIsSpeaking(false);
      }, 5000);
    }, 1000);
  };

  const speakResponse = (text: string) => {
    if (isMuted) return;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = volume;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setTranscript(suggestion);
    speakResponse(`Processing: ${suggestion}`);
    
    setTimeout(() => {
      const responses = [
        "I'll help you with that! Let me process your request.",
        "Great choice! Let me handle that for you.",
        "Excellent! I'm on it right now.",
        "Perfect! Let me get that information for you."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setResponse(randomResponse);
      setIsSpeaking(true);
      
      setTimeout(() => setIsSpeaking(false), 3000);
    }, 1000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted && isSpeaking) {
      window.speechSynthesis.cancel();
    }
  };

  const changeLanguage = (language: string) => {
    setCurrentLanguage(language);
    aiVoiceAssistantService.setLanguage(language);
  };

  const getEmotionIcon = () => {
    switch (emotion) {
      case 'happy': return '😊';
      case 'excited': return '🎉';
      case 'confused': return '🤔';
      case 'frustrated': return '😤';
      default: return '🤖';
    }
  };

  const supportedLanguages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-BR', name: 'Portuguese' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'zh-CN', name: 'Chinese' },
    { code: 'ja-JP', name: 'Japanese' }
  ];

  const sampleCommands = [
    "Track my order #12345",
    "Show me analytics for this month",
    "Order iPhone 15 Pro",
    "Predict delivery time",
    "Scan this receipt",
    "Go to orders page"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-black/20 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="relative">
                <Brain className="w-12 h-12 text-purple-400" />
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-white">ARKIO AI Assistant</CardTitle>
                <CardDescription className="text-purple-200">
                  Your intelligent voice-powered companion
                </CardDescription>
              </div>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center justify-center space-x-4 text-sm">
              <Badge variant={isListening ? "default" : "secondary"} className="bg-green-500/20 text-green-300 border-green-500/30">
                <Mic className="w-3 h-3 mr-1" />
                {isListening ? "Listening" : "Ready"}
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                <Globe className="w-3 h-3 mr-1" />
                {supportedLanguages.find(l => l.code === currentLanguage)?.name}
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Heart className="w-3 h-3 mr-1" />
                Emotion: {emotion}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Main Voice Interface */}
        <Card className="bg-black/20 border-purple-500/30 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Voice Assistant Avatar */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className={`
                  w-32 h-32 rounded-full flex items-center justify-center text-6xl
                  transition-all duration-300 transform
                  ${isListening ? 'bg-gradient-to-r from-green-400 to-blue-500 scale-110 animate-pulse' : 
                    isSpeaking ? 'bg-gradient-to-r from-purple-400 to-pink-500 scale-105' : 
                    'bg-gradient-to-r from-gray-600 to-gray-700'}
                `}>
                  {getEmotionIcon()}
                </div>
                
                {/* Sound Waves */}
                {isListening && (
                  <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping" />
                )}
                {isSpeaking && (
                  <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping" />
                )}
              </div>
            </div>

            {/* Voice Control Buttons */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                size="lg"
                className={`
                  ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                  text-white px-8 py-4 rounded-full transition-all duration-300 transform
                  ${isProcessing ? 'scale-95 opacity-50' : 'hover:scale-105'}
                `}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-6 h-6 mr-2" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="w-6 h-6 mr-2" />
                    Start Talking
                  </>
                )}
              </Button>

              <Button
                onClick={toggleMute}
                variant="outline"
                size="lg"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </Button>

              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="outline"
                size="lg"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                <Settings className="w-6 h-6" />
              </Button>
            </div>

            {/* Transcript Display */}
            {transcript && (
              <div className="mb-6 p-4 bg-black/30 rounded-lg border border-purple-500/20">
                <div className="flex items-start space-x-2">
                  <MessageCircle className="w-5 h-5 text-blue-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-blue-300 text-sm mb-1">You said:</p>
                    <p className="text-white">{transcript}</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Response */}
            {response && (
              <div className="mb-6 p-4 bg-black/30 rounded-lg border border-purple-500/20">
                <div className="flex items-start space-x-2">
                  <Brain className="w-5 h-5 text-purple-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-purple-300 text-sm mb-1">ARKIO responds:</p>
                    <p className="text-white">{response}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center space-x-2 text-purple-300">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="ml-2">Processing your voice...</span>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-6">
                <p className="text-purple-300 text-sm mb-3">Suggested actions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      variant="outline"
                      size="sm"
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Commands */}
            <div className="text-center">
              <p className="text-purple-300 text-sm mb-3">Try saying:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {sampleCommands.slice(0, 3).map((command, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-purple-500/10 text-purple-300 border-purple-500/20 cursor-pointer hover:bg-purple-500/20"
                    onClick={() => setTranscript(command)}
                  >
                    "{command}"
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="bg-black/20 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Voice Assistant Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language Selection */}
              <div>
                <label className="text-purple-300 text-sm mb-2 block">Language</label>
                <select
                  value={currentLanguage}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="w-full p-2 bg-black/30 border border-purple-500/20 rounded text-white"
                >
                  {supportedLanguages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>

              {/* Volume Control */}
              <div>
                <label className="text-purple-300 text-sm mb-2 block">Volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Features */}
              <div>
                <label className="text-purple-300 text-sm mb-2 block">Features</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white">Natural Language Processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white">Contextual Understanding</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white">Emotional Intelligence</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white">Multi-Language Support</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Command History */}
        {commandHistory.length > 0 && (
          <Card className="bg-black/20 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {commandHistory.slice(-5).reverse().map((command, index) => (
                  <div key={command.id} className="flex items-start space-x-3 p-3 bg-black/20 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Mic className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">{command.command}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-300">
                          {command.intent}
                        </Badge>
                        <span className="text-purple-400 text-xs">
                          {new Date(command.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-purple-400 text-xs">
                          {command.confidence.toFixed(0)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
