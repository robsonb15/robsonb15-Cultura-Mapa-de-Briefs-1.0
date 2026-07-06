import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from "firebase/firestore";
import { sanitizeText } from "./auth-utils";

/**
 * AI Service with safety controls:
 * 1. Usage tracking in Firestore.
 * 2. System prompt enforcement.
 * 3. Token usage estimations (rudimentary).
 */
export const aiService = {
  /**
   * Generates content with safety checks.
   * @param prompt The user-provided prompt.
   * @param systemContext The fixed system context (not reachable by user).
   * @param taskId A identifier for the task (for quota tracking).
   */
  async generateSafeContent(prompt: string, systemContext: string, taskId: string = "general") {
    const user = auth.currentUser;
    if (!user) throw new Error("Unauthorized: You must be logged in to use AI features.");

    // 1. Sanitize user input
    const cleanPrompt = sanitizeText(prompt);

    // 2. Check usage quota (e.g., max 50 requests per day per user for this demo)
    await this.checkQuota(user.uid);

    try {
      // Send secure request to Express backend API proxy
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: cleanPrompt,
          systemContext: systemContext
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro no servidor de IA.");
      }

      const data = await response.json();
      const text = data.text || '';

      // 4. Sanitize AI output
      const safeText = text
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
        .replace(/on\w+="[^"]*"/gim, '')
        .replace(/on\w+='[^']*'/gim, '')
        .replace(/javascript:/gim, '');

      // 3. Log usage
      await this.logUsage(user.uid, taskId, cleanPrompt.length, safeText.length);

      return safeText;
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      throw new Error(error.message || "O serviço de IA está temporariamente indisponível. Tente novamente mais tarde.");
    }
  },

  async logUsage(userId: string, task: string, inputSize: number, outputSize: number) {
    try {
      await addDoc(collection(db, "ai_usage"), {
        userId,
        task,
        inputSize,
        outputSize,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Failed to log AI usage:", e);
    }
  },

  async checkQuota(userId: string) {
    // Basic quota check: Count requests in the last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const q = query(
      collection(db, "ai_usage"),
      where("userId", "==", userId),
      where("timestamp", ">=", yesterday),
      limit(51) // One more than the limit
    );

    const snap = await getDocs(q);
    if (snap.size > 50) {
      throw new Error("Daily AI usage limit reached. Please try again tomorrow.");
    }
  }
};
