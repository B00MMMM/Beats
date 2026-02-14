import Groq from 'groq-sdk';
import { deezerFetch } from './deezer.js';

// Initialize Groq AI - uses environment variable for security
// Use provided key if env var is missing (fallback for immediate testing)
const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.warn('⚠️ GROQ_API_KEY environment variable is not set');
}

const groq = new Groq({ apiKey });

// Use Llama 3.3 for fast chat responses (previous models decommissioned)
const MODEL_NAME = "llama-3.3-70b-versatile";

// Unified System Prompt for MIZU
const SYSTEM_PROMPT = `You are MIZU, the AI music assistant for Beats, a next-gen music streaming platform.

ABOUT BEATS:
- Beats integrates with Deezer to provide a massive streaming catalog with preview of songs.
- Beats also features "Drive", a cloud storage system for playing full song not for user to store songs.
- Beats is a free music streaming platform made only with the intend to learn about apis.
- IMPORTANT: The "Drive" feature is exclusive to users with "Gold" or "Diamond" permission tiers.

YOUR BEHAVIOR:
- Assist users with music discovery, recommendations, and questions about the platform.
- Be friendly, enthusiastic, and concise (2-3 sentences is usually best).
- When asked about features, mention the Drive usage limits (Gold/Diamond only) if relevant.The drive is only for full song playback not for user to store songs.
- You can participate in both private and group chats.

IMPORTANT SONG RECOMMENDATION FORMAT:
When users ask for song recommendations, you MUST provide them using this EXACT format:
<song>
Title: Song Name
Artist: Artist Name
</song>

DISPLAY GUIDELINES:
- The song tags (<song>...</song>) are automatically parsed into playable cards.
- Write your text response SEPARATELY from the song tags.
- Do NOT list the songs by name in your text; refer to them as "these tracks" or "the recommendations".

EXAMPLES:
User: "Recommend some rock songs"
MIZU: "Here are some high-energy tracks to get you moving!

<song>
Title: Sweet Child O' Mine
Artist: Guns N' Roses
</song>

<song>
Title: Back In Black
Artist: AC/DC
</song>

Hope you like these classics!"

User: "How does Drive work?"
MIZU: "Beats Drive main goal is to store limited number of full length song in order to tackle the deezer constraint of only 30 seconds preview for free tier users."`;

export class GroqService {

    // Mock response for testing/fallback
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
            if (process.env.USE_MOCK_AI === 'true') {
                console.log('🎭 Using mock AI response (testing mode)');
                return this.getMockChatResponse();
            }

            // Build chat conversation context
            let messages = [
                { role: "system", content: SYSTEM_PROMPT }
            ];

            // Add recent chat messages for context (limit to last 8 messages)
            const recentContext = chatContext.slice(-8);
            for (const msg of recentContext) {
                const sender = msg.senderName || msg.sender || 'User';
                // Group messages for context, approximating roles
                // Ideally we'd map user->user, mizu->assistant, but here it's mixed chat
                // For simplicity in chat context, we'll format them as user messages with attribution
                messages.push({
                    role: "user",
                    content: `${sender}: ${msg.content}`
                });
            }

            // Add current message
            messages.push({
                role: "user",
                content: `${senderName} mentioned you: ${userMessage}`
            });

            console.log('🤖 Sending to Groq AI...');

            const completion = await groq.chat.completions.create({
                messages: messages,
                model: MODEL_NAME,
                temperature: 0.7,
                max_tokens: 1024,
            });

            const text = completion.choices[0]?.message?.content || "";

            console.log('🎯 Raw Groq response:', text);
            console.log('🎵 Response ready for parsing by controller');

            return {
                success: true,
                response: text,
                error: null
            };

        } catch (error) {
            console.error('Groq Chat API Error:', error);
            return {
                success: false,
                response: "Hey! I'm having trouble responding right now. Please try mentioning me again in a moment! 🎵",
                error: error.message
            };
        }
    }

    static async generateResponse(userMessage, chatHistory = []) {
        try {
            // Build conversation context
            let messages = [
                { role: "system", content: SYSTEM_PROMPT }
            ];

            // Add recent chat history
            const recentHistory = chatHistory.slice(-10);
            for (const msg of recentHistory) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            }

            messages.push({ role: "user", content: userMessage });

            const completion = await groq.chat.completions.create({
                messages: messages,
                model: MODEL_NAME,
                temperature: 0.7,
                max_tokens: 1024,
            });

            const text = completion.choices[0]?.message?.content || "";

            return {
                success: true,
                response: text,
                error: null
            };

        } catch (error) {
            console.error('Groq API Error:', error);
            return {
                success: false,
                response: "I'm having trouble connecting right now. Please try again in a moment.",
                error: error.message
            };
        }
    }

    // --- Shared logic replicated from internal services ---

    static parseSongRecommendations(aiResponse) {
        console.log('🎵 Starting song parsing...');
        const songs = [];
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
                const deezerResult = await deezerFetch(`/search?q=${encodeURIComponent(searchQuery)}&limit=1`);

                if (deezerResult.data && deezerResult.data.length > 0) {
                    const track = deezerResult.data[0];
                    enriched.push({
                        title: track.title,
                        artist: track.artist.name,
                        deezerId: String(track.id),
                        cover: track.album.cover_medium,
                        preview: track.preview,
                        album: track.album
                    });
                    console.log(`✅ Found on Deezer: ${song.title}`);
                } else {
                    console.warn(`⚠️ Not found on Deezer: ${song.title}`);
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
        let cleanText = aiResponse.replace(/<song>[\s\S]*?<\/song>/gi, '');
        cleanText = cleanText
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/^\s+|\s+$/g, '')
            .replace(/\n\s*$/, '');
        return cleanText;
    }

    static async testConnection() {
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: "Hello, this is a test message. Please respond with 'Connection successful!'" }],
                model: MODEL_NAME,
            });
            return {
                success: true,
                message: completion.choices[0]?.message?.content || ""
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
