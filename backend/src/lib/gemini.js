import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI - uses environment variable for security
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Pre-prompt for structured song recommendations
const SYSTEM_PROMPT = `You are an AI music assistant called MIZU for Beats, a music streaming app. Your job is to help users discover music, provide recommendations, and chat about music.

IMPORTANT SONG RECOMMENDATION FORMAT:
When recommending songs, you MUST format each song exactly like this:
<song>
Title: Song Name
Artist: Artist Name  
</song>

IMPORTANT DISPLAY GUIDELINES:
- The song tags (<song>...</song>) will be automatically parsed and shown as playable cards
- Write your response text SEPARATELY from the song tags
- Don't reference the songs by name in your text since they'll be displayed as cards
- Instead, describe them as "the songs above" or "these tracks" or "the recommendations"
- Keep your conversational text clean and engaging

You can recommend multiple songs by repeating the format. DO NOT deviate from this format when recommending music.

Guidelines:
- Be friendly, enthusiastic about music, and helpful
- Keep song descriptions separate with proper spacing and formatting
- Ask follow-up questions to better understand user preferences
- Provide context about why you're recommending specific songs
- Mix popular and lesser-known tracks when appropriate
- Consider mood, genre preferences, and user context
- Keep responses conversational and engaging
- Remember: song names in tags won't be visible in chat, so don't reference them directly in your text`;

export class GeminiService {
    
    static async generateResponse(userMessage, chatHistory = []) {
        try {
            // Build conversation context
            let conversationContext = SYSTEM_PROMPT + '\n\nConversation History:\n';
            
            // Add recent chat history for context (limit to last 10 messages to avoid token limits)
            const recentHistory = chatHistory.slice(-10);
            for (const msg of recentHistory) {
                conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            }
            
            conversationContext += `\nUser: ${userMessage}\nAssistant:`;
            
            const result = await model.generateContent(conversationContext);
            const response = await result.response;
            const text = response.text();
            
            return {
                success: true,
                response: text,
                error: null
            };
            
        } catch (error) {
            console.error('Gemini API Error:', error);
            
            return {
                success: false,
                response: "I'm having trouble connecting right now. Please try again in a moment.",
                error: error.message
            };
        }
    }
    
    static parseSongRecommendations(aiResponse) {
        const songs = [];
        const songPattern = /<song>\s*Title:\s*(.*?)\s*Artist:\s*(.*?)\s*<\/song>/gi;
        
        let match;
        while ((match = songPattern.exec(aiResponse)) !== null) {
            const title = match[1].trim();
            const artist = match[2].trim();
            
            if (title && artist) {
                songs.push({
                    title,
                    artist
                });
            }
        }
        
        return songs;
    }
    
    static cleanResponseText(aiResponse) {
        // Remove song tags from response text for cleaner display
        let cleanText = aiResponse.replace(/<song>\s*Title:\s*.*?\s*Artist:\s*.*?\s*<\/song>/gi, '');
        
        // Clean up extra whitespace and empty lines
        cleanText = cleanText
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple empty lines with max 2
            .replace(/^\s+|\s+$/g, '') // Trim start and end
            .replace(/\n\s*$/, ''); // Remove trailing newlines with spaces
            
        return cleanText;
    }
    
    static async testConnection() {
        try {
            const result = await model.generateContent("Hello, this is a test message. Please respond with 'Connection successful!'");
            const response = await result.response;
            return {
                success: true,
                message: response.text()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}