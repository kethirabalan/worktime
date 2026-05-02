import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: AI Task Generator
  app.post("/api/ai/generate-tasks", async (req, res) => {
    try {
      const { goal, projectContext } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a list of 5-8 specific, actionable tasks for the following goal: "${goal}". context: ${projectContext || 'General project'}. Return exactly a JSON array of objects with title, description, priority (LOW, MEDIUM, or HIGH).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: { type: Type.STRING }
              },
              required: ["title", "description", "priority"]
            }
          }
        }
      });

      const tasks = JSON.parse(response.text);
      res.json(tasks);
    } catch (error) {
      console.error("AI Task Generation Error:", error);
      res.status(500).json({ error: "Failed to generate tasks" });
    }
  });

  // API Route: AI Chat Summarizer
  app.post("/api/ai/summarize-chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const chatHistory = messages.map((m: any) => `${m.senderName}: ${m.content}`).join("\n");
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize the following chat conversation into a few bullet points of key takeaways and action items:\n\n${chatHistory}`,
      });

      res.json({ summary: response.text });
    } catch (error) {
      console.error("AI Summarization Error:", error);
      res.status(500).json({ error: "Failed to summarize chat" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
