import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware for JSON request bodies
  app.use(express.json());

  // Secure API route for AI content generation (hiding Gemini API key)
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { prompt, systemContext } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "O prompt é obrigatório." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "A chave GEMINI_API_KEY não está configurada no servidor." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Using the latest recommended model for basic/general text tasks
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemContext
        }
      });

      res.json({ text: response.text || "" });
    } catch (error) {
      console.error("Erro na rota /api/ai/generate:", error);
      res.status(500).json({ error: error.message || "Erro interno ao gerar conteúdo com IA." });
    }
  });

  // Alias API Route as requested
  app.post("/api/gerar", async (req, res) => {
    try {
      const { prompt, systemContext } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "O prompt é obrigatório." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "A chave GEMINI_API_KEY não está configurada no servidor." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemContext
        }
      });

      res.json({ text: response.text || "" });
    } catch (error) {
      console.error("Erro na rota /api/gerar:", error);
      res.status(500).json({ error: error.message || "Erro interno ao gerar conteúdo." });
    }
  });

  // Integration with Vite: Development middleware vs Production static serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando servidor em modo DESENVOLVIMENTO com middleware do Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Iniciando servidor em modo PRODUÇÃO...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando com sucesso na porta ${PORT}`);
  });
}

startServer();
