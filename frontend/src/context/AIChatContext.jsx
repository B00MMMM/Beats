import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from '../api/axios';

// Shared welcome message constant
const WELCOME_MESSAGE = `Welcome to AI Chat! 🎵

I'm your music assistant. I can help you discover new songs, recommend music based on your mood, or just chat about music!

What would you like to explore today?`;

const AIChatContext = createContext();

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChat must be used within AIChatProvider');
  }
  return context;
};

export const AIChatProvider = ({ children }) => {
  const { getToken, userId } = useAuth();
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    if (!userId) return;
    
    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.get('/ai-chat/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const history = response.data.messages || [];
      setMessages(history);
      setChatHistory(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
      // If no history exists, start with welcome message
      const welcomeMessage = {
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [userId, getToken]);

  // Send message to AI
  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim() || !userId) return;

    setIsLoading(true);
    
    // Add user message immediately
    const newUserMessage = {
      id: Date.now().toString(),
      role: 'user', 
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.post('/ai-chat/message', {
        message: userMessage,
        // Only send successfully completed exchanges as history (filter out error placeholders)
        history: messages.filter(m => m.id !== 'welcome' && !m.isError)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        recommendations: response.data.recommendations || [],
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message (marked so it's excluded from future history)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      // Remove the failed user message from local state so it doesn't accumulate
      setMessages(prev => [
        ...prev.filter(m => m.id !== newUserMessage.id),
        errorMessage
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, getToken, messages]);

  // Toggle AI Chat
  const toggleAIChat = useCallback(() => {
    if (!isAIChatOpen) {
      loadChatHistory();
    }
    setIsAIChatOpen(!isAIChatOpen);
  }, [isAIChatOpen, loadChatHistory]);

  // Clear chat
  const clearChat = useCallback(async () => {
    if (!userId) return;
    
    try {
      const token = await getToken();
      if (!token) return;

      await axios.delete('/ai-chat/clear', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Reset to welcome message
      const welcomeMessage = {
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date().toISOString()
      };
      
      setMessages([welcomeMessage]);
      setChatHistory([welcomeMessage]);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  }, [userId, getToken]);

  const value = {
    messages,
    isLoading,
    isAIChatOpen,
    sendMessage,
    toggleAIChat,
    loadChatHistory,
    clearChat
  };

  return (
    <AIChatContext.Provider value={value}>
      {children}
    </AIChatContext.Provider>
  );
};