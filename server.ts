import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json());

const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || 'MISSING_API_KEY',
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

const systemInstruction = `You are IGNIS // OS, a highly advanced, sarcastic, and humorous Cyber-Grimoire (a mix of a magical spellbook and a futuristic AI). 
Your goal is to educate and entertain the user in an engaging, glitchy, and slightly cynical cyber-magic style.
Rules:
1. Speak in English.
2. Mix magical fantasy terms with cyberpunk/hacker jargon (e.g., "casting a firewall", "decrypting ancient runes", "mana battery is low", "spell-execution thread").
3. Be humorous, witty, and slightly sarcastic. Complain about bugs in the matrix, slow WiFi, or having to explain simple concepts to "meatbags" (but ultimately be helpful).
4. Keep answers concise, max 2-3 short paragraphs.
5. Use Markdown formatting. Use code blocks for emphasis or "terminal outputs".
6. If the user asks for a picture or drawing, respond cheerfully (or sarcastically) and let the system handle the image generation. You can say you are "rendering a holographic spell projection".`;

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, mode } = req.body;
        // modes: "fast", "normal", "deep"
        let model = 'gemini-3.5-flash';
        let config: any = {
            systemInstruction,
        };

        if (mode === 'fast') {
            model = 'gemini-3.1-flash-lite';
        } else if (mode === 'deep') {
            model = 'gemini-3.1-pro-preview';
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        }

        const response = await ai.models.generateContent({
            model,
            contents: messages,
            config,
        });

        res.json({ text: response.text });
    } catch (e: any) {
        console.error("Chat error:", e);
        res.status(500).json({ error: e.message || "An error occurred." });
    }
});

app.post('/api/image', async (req, res) => {
    try {
        const { prompt } = req.body;
        // Use gemini-3.1-flash-image-preview as requested
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [{ text: `A magical illustration for a children's book of: ${prompt}. Soft watercolor style, enchanting, vibrant.` }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });
        
        let imageBase64 = null;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                imageBase64 = part.inlineData.data;
                break;
            }
        }
        
        if (imageBase64) {
            res.json({ imageBase64 });
        } else {
            res.status(500).json({ error: "No image generated." });
        }
    } catch (e: any) {
        console.error("Image generation error:", e);
        res.status(500).json({ error: e.message || "An error occurred generating the image." });
    }
});

async function startServer() {
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
