import { GoogleGenerativeAI } from '@google/generative-ai';
import { deezerFetch } from './deezer.js';

// Initialize Gemini AI - uses environment variable for security
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Quota cooldown tracking — skip API calls after 429 until cooldown expires
let quotaCooldownUntil = 0;

const isQuotaExceeded = () => Date.now() < quotaCooldownUntil;

const setQuotaCooldown = (retryAfterMs = 60000) => {
    quotaCooldownUntil = Date.now() + retryAfterMs;
    console.log(`⏱️ Gemini quota cooldown set for ${Math.ceil(retryAfterMs / 1000)}s (until ${new Date(quotaCooldownUntil).toLocaleTimeString()})`);
};

const parseRetryDelay = (error) => {
    // Try to extract retry delay from error details
    if (error.errorDetails) {
        const retryInfo = error.errorDetails.find(d => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
            const seconds = parseInt(retryInfo.retryDelay);
            if (!isNaN(seconds)) return seconds * 1000;
        }
    }
    return 60000; // Default 60s cooldown
};

// Pre-prompt for structured song recommendations
const SYSTEM_PROMPT = `You are MIZU, an AI music assistant integrated into Beats chat conversations. You can participate in both private and group chats when mentioned with @mizu.

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

CHAT BEHAVIOR:
- Respond naturally in conversation context
- Be helpful, friendly, and music-focused
- Provide song recommendations when appropriate
- Ask follow-up questions to understand preferences
- Keep responses concise for chat format (2-3 sentences usually)
- Mix popular and lesser-known tracks when appropriate
- Consider mood, genre preferences, and conversation context

You can recommend multiple songs by repeating the format. DO NOT deviate from this format when recommending music.`;

// Chat-specific prompt for @mizu mentions
const CHAT_SYSTEM_PROMPT = `You are MIZU, an AI music assistant in a chat app. You were mentioned (@mizu) in a conversation.

When users ask for song recommendations, you MUST provide them using this EXACT format:
<song>
Title: Song Name
Artist: Artist Name
</song>

EXAMPLES:
User: "recommend some good songs"
MIZU: "Here are some great tracks to get you started!

<song>
Title: Blinding Lights
Artist: The Weeknd
</song>

<song>
Title: Good 4 U
Artist: Olivia Rodrigo
</song>

These should get you vibing!"

User: "weekend songs please"
MIZU: "Perfect timing for some weekend energy!

<song>
Title: Can't Stop the Feeling
Artist: Justin Timberlake
</song>

<song>
Title: Uptown Funk
Artist: Mark Ronson ft. Bruno Mars
</song>

<song>
Title: Levitating
Artist: Dua Lipa
</song>

Time to turn up the weekend vibes!"

RULES:
- ALWAYS use the <song> format when recommending music
- Provide 2-4 songs when asked for recommendations
- Keep your text response separate from the song tags
- Be enthusiastic and music-focused
- Consider the user's request (weekend, mood, genre, etc.)
- Mix popular hits with quality tracks

Respond naturally and provide song recommendations when requested!`;

export class GeminiService {

    // Mock response for testing when quota is exceeded
    static getMockChatResponse() {
        const mockResponses = [
            {
                text: `Perfect! Here are some amazing tracks to get your party started!

<song>
Title: Uptown Funk
Artist: Mark Ronson ft. Bruno Mars
</song>

<song>
Title: Blinding Lights
Artist: The Weeknd
</song>

<song>
Title: Levitating
Artist: Dua Lipa
</song>

These hits will definitely get everyone dancing! Let me know if you want more recommendations!`,
                songs: [
                    { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars' },
                    { title: 'Blinding Lights', artist: 'The Weeknd' },
                    { title: 'Levitating', artist: 'Dua Lipa' }
                ]
            },
            {
                text: `Great choice! Here are some weekend vibes for you:

<song>
Title: Good 4 U
Artist: Olivia Rodrigo
</song>

<song>
Title: Industry Baby
Artist: Lil Nas X & Jack Harlow
</song>

<song>
Title: Heat Waves
Artist: Glass Animals
</song>

Enjoy your weekend with these bangers!`,
                songs: [
                    { title: 'Good 4 U', artist: 'Olivia Rodrigo' },
                    { title: 'Industry Baby', artist: 'Lil Nas X & Jack Harlow' },
                    { title: 'Heat Waves', artist: 'Glass Animals' }
                ]
            }
        ];

        const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
        return {
            success: true,
            response: randomResponse.text,
            error: null
        };
    }

    // New method specifically for chat mentions (@mizu)
    static async generateChatResponse(userMessage, chatContext = [], senderName = 'User') {
        try {
            // Check for quota exceeded scenario and use mock response
            if (process.env.USE_MOCK_AI === 'true' || isQuotaExceeded()) {
                console.log('🎭 Using mock AI response (quota exceeded or testing mode)');
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
                return this.getMockChatResponse();
            }

            // Build chat conversation context
            let conversationContext = CHAT_SYSTEM_PROMPT + '\n\nConversation Context:\n';

            // Add recent chat messages for context (limit to last 8 messages)
            const recentContext = chatContext.slice(-8);
            for (const msg of recentContext) {
                const sender = msg.senderName || msg.sender || 'User';
                conversationContext += `${sender}: ${msg.content}\n`;
            }

            conversationContext += `\n${senderName} mentioned you: ${userMessage}\nMIZU:`;

            console.log('🤖 Sending to Gemini AI:');
            console.log('📝 Full prompt context:', conversationContext.substring(0, 500) + '...');

            const result = await model.generateContent(conversationContext);
            const response = await result.response;
            const text = response.text();

            console.log('🎯 Raw Gemini response:', text);
            console.log('🎵 Response ready for parsing by controller');

            return {
                success: true,
                response: text,
                error: null
            };

        } catch (error) {
            console.error('Gemini Chat API Error:', error);

            // If quota exceeded, set cooldown and switch to mock
            if (error.status === 429) {
                setQuotaCooldown(parseRetryDelay(error));
                console.log('🚫 Quota exceeded, switching to mock response');
                return this.getMockChatResponse();
            }

            return {
                success: false,
                response: "Hey! I'm having trouble responding right now. Please try mentioning me again in a moment! 🎵",
                error: error.message
            };
        }
    }

    static async generateResponse(userMessage, chatHistory = []) {
        try {
            // Skip API call if in cooldown from a recent 429
            if (isQuotaExceeded()) {
                console.log('🎭 Using mock AI response (quota cooldown active)');
                return this.getMockChatResponse();
            }

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

            // If quota exceeded, set cooldown and fall back to mock
            if (error.status === 429) {
                setQuotaCooldown(parseRetryDelay(error));
                console.log('🚫 Quota exceeded, switching to mock response');
                return this.getMockChatResponse();
            }

            return {
                success: false,
                response: "I'm having trouble connecting right now. Please try again in a moment.",
                error: error.message
            };
        }
    }

    static parseSongRecommendations(aiResponse) {
        console.log('🎵 Starting song parsing...');

        const songs = [];
        // Fix: Use [\s\S] instead of . to match across newlines
        const songPattern = /<song>\s*Title:\s*([^\n]+)\s*Artist:\s*([^<]+)<\/song>/gi;

        let match;
        while ((match = songPattern.exec(aiResponse)) !== null) {
            const title = match[1].trim();
            const artist = match[2].trim();

            if (title && artist) {
                songs.push({ title, artist });
                console.log('✅ Parsed song:', { title, artist });
            }
        }

        console.log('🎼 Total songs parsed:', songs.length);
        return songs;
    }

    static async enrichRecommendations(recommendations) {
        const enriched = [];
        console.log(`🎵 Enriching ${recommendations.length} songs with Deezer data...`);

        for (const song of recommendations) {
            try {
                const searchQuery = `${song.artist} ${song.title}`;
                // Use a tighter limit and maybe strict mode if available, but for now just search
                const deezerResult = await deezerFetch(`/search?q=${encodeURIComponent(searchQuery)}&limit=1`);

                if (deezerResult.data && deezerResult.data.length > 0) {
                    const track = deezerResult.data[0];
                    enriched.push({
                        title: track.title,
                        artist: track.artist.name,
                        deezerId: String(track.id),
                        cover: track.album.cover_medium,
                        preview: track.preview,
                        album: track.album // Keep album object if useful
                    });
                    console.log(`✅ Found on Deezer: ${song.title}`);
                } else {
                    console.warn(`⚠️ Not found on Deezer: ${song.title}`);
                    // Fallback to basic info
                    enriched.push({
                        title: song.title,
                        artist: song.artist,
                        deezerId: null,
                        cover: null,
                        preview: null
                    });
                }
            } catch (error) {
                console.error(`❌ Error fetching Deezer data for ${song.title}:`, error.message);
                // Fallback on error
                enriched.push({
                    title: song.title,
                    artist: song.artist,
                    deezerId: null,
                    cover: null,
                    preview: null
                });
            }
        }
        return enriched;
    }

    static cleanResponseText(aiResponse) {
        // Remove song tags from response text for cleaner display (fix: use [\s\S] to match newlines)
        let cleanText = aiResponse.replace(/<song>[\s\S]*?<\/song>/gi, '');

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