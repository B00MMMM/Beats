import { GroqService } from './src/lib/groq.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Testing GroqService...");

try {
    const result = await GroqService.testConnection();
    console.log("Connection result:", result);

    if (result.success) {
        console.log("✅ Groq connection successful!");
    } else {
        console.error("❌ Groq connection failed:", result.error);
    }
} catch (error) {
    console.error("❌ Critical error:", error);
}
