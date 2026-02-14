import { AIChatConversation } from '../models/aiChatConversation.model.js';
import { GroqService } from '../lib/groq.js';
import { deezerFetch } from '../lib/deezer.js';
import { getAuth } from "@clerk/express";

// Shared welcome message constant
const WELCOME_MESSAGE = `Welcome to AI Chat! 🎵

I'm your music assistant. I can help you discover new songs, recommend music based on your mood, or just chat about music!

What would you like to explore today?`;

// Get chat history for authenticated user
export const getChatHistory = async (req, res) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let conversation = await AIChatConversation.findOne({ userId });

        if (!conversation) {
            // Create new conversation with welcome message
            const welcomeMessage = {
                role: 'assistant',
                content: WELCOME_MESSAGE,
                recommendations: []
            };

            conversation = new AIChatConversation({
                userId,
                messages: [welcomeMessage]
            });

            await conversation.save();
        }

        res.json({
            messages: conversation.messages,
            totalMessages: conversation.messages.length
        });

    } catch (error) {
        console.error('Error getting chat history:', error);
        res.status(500).json({ message: 'Error retrieving chat history' });
    }
};

// Send message to AI and get response
export const sendMessage = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const { message, history } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message is required" });
        }

        // Get or create conversation
        let conversation = await AIChatConversation.findOne({ userId });
        if (!conversation) {
            conversation = new AIChatConversation({
                userId,
                messages: []
            });
        }

        // Generate AI response using Groq
        // Use existing conversation history for context (don't add user msg to DB yet)
        const aiResult = await GroqService.generateResponse(message, history || conversation.messages);

        if (!aiResult.success) {
            // Don't save anything to DB on failure — keep conversation clean
            return res.status(500).json({ message: "AI service error", error: aiResult.error });
        }

        // Parse song recommendations from AI response
        const recommendedSongs = GroqService.parseSongRecommendations(aiResult.response);

        // Clean the response text (remove song tags for cleaner display)
        const cleanedResponse = GroqService.cleanResponseText(aiResult.response);

        // Enrich recommendations with Deezer data using shared service
        // This handles fetching IDs, covers, previews etc.
        const enrichedRecommendations = await GroqService.enrichRecommendations(recommendedSongs);

        // Only save to DB after successful AI response — both user + AI together
        const userMessage = {
            role: 'user',
            content: message.trim(),
            recommendations: []
        };
        conversation.messages.push(userMessage);

        // Add AI message to conversation
        const aiMessage = {
            role: 'assistant',
            content: cleanedResponse,
            recommendations: enrichedRecommendations
        };
        conversation.messages.push(aiMessage);

        // Save conversation
        await conversation.save();

        res.json({
            response: cleanedResponse,
            recommendations: enrichedRecommendations,
            messageId: conversation.messages[conversation.messages.length - 1]._id
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            message: 'Error processing message',
            error: error.message,
            stack: error.stack
        });
    }
};

// Clear chat history
export const clearChatHistory = async (req, res) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Reset conversation to welcome message
        const welcomeMessage = {
            role: 'assistant',
            content: WELCOME_MESSAGE,
            recommendations: []
        };

        await AIChatConversation.findOneAndUpdate(
            { userId },
            {
                messages: [welcomeMessage],
                lastActivity: new Date()
            },
            { upsert: true }
        );

        res.json({ message: "Chat history cleared successfully" });

    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({ message: 'Error clearing chat history' });
    }
};

// Test AI service connection (for debugging)
export const testAIConnection = async (req, res) => {
    try {
        const result = await GroqService.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};