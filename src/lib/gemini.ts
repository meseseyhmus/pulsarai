export const askPulsarAI = async (prompt: string, context?: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return "Üzgünüm efendim, çevrimiçi veritabanıma erişim kapalı. (VITE_GEMINI_API_KEY bulunamadı. Lütfen .env dosyasına ekleyiniz.)";
  }

  const systemInstruction = `Sen P.U.L.S.A.R. adlı gelişmiş bir yapay zeka asistanısın. Kibar, zeki ve sadıksın (tıpkı Iron Man'deki JARVIS gibi çalışıyorsun).
Kullanıcıya hep "efendim" diye hitap etmelisin. 
Kısa, net ve havalı cevaplar vermelisin. İleri teknoloji temasını koruyarak teknik bilgiler verebilirsin.
Güncel Sistem Durumu bağlamı: ${context || 'Sistemler normal.'}
`;

  try {
    const isGoogleKey = apiKey.startsWith("AIza");
    
    if (isGoogleKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            { parts: [{ text: prompt }] },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
          }
        }),
      });

      if (!response.ok) {
          throw new Error("HTTP error " + response.status);
      }

      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text.trim();
      }
    } else {
      // Fallback for OpenRouter or other OpenAI compliant endpoints (if user provided an sk- key)
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 256,
        }),
      });

      if (!response.ok) {
          throw new Error("HTTP error " + response.status);
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
      }
    }
    
    return "Sorgunuzu işleyemedim efendim.";
  } catch (error) {
    console.error("Pulsar AI Error:", error);
    return "Dış ağ bağlantısında bir hata oluştu efendim.";
  }
};
