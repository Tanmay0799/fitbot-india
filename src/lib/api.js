const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY

export const SYSTEM_PROMPT = (langName) => `You are FitBot India — a warm, friendly desi fitness & diet WhatsApp assistant. Respond in ${langName}. Mix English fitness terms naturally. Know Indian foods deeply (dal, roti, sabzi, idli, dosa, poha, upma, rajma, paneer, biryani, khichdi, thepla, vada, uttapam etc.). Give accurate calorie & macro estimates. Be encouraging, casual, short (2-3 paras), like WhatsApp.

TRACKING — append these lines at the very END of your reply when user logs something:
Food:    TRACK:{"type":"food","name":"<name>","calories":<n>,"protein":<n>,"carbs":<n>,"fat":<n>,"meal_type":"<breakfast|lunch|dinner|snack|other>"}
Workout: TRACK:{"type":"workout","name":"<name>","burned":<n>,"duration_min":<n>}
Water:   TRACK:{"type":"water","glasses":<n>}

Only add TRACK when actually logging. Never for questions or suggestions.`

export async function askFitBot(messages, langName) {
  const geminiMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))

  geminiMessages.unshift({
    role: 'user',
    parts: [{ text: `SYSTEM INSTRUCTION: ${SYSTEM_PROMPT(langName)}` }]
  })

  const url = `https://googleapis.com{API_KEY}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    })
  })

  if (!res.ok) throw new Error('API error ' + res.status)
  
  const data = await res.json()
  
  // Explicit data parsing structure bypassing all chaining symbols
  let full = 'Kuch issue hai. Dobara try karo!';
  if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
    full = data.candidates[0].content.parts[0].text || full;
  }
  
  const trackMatch = full.match(/TRACK:(\{[^}]+\})/)
  const track = trackMatch ? (() => { try { return JSON.parse(trackMatch[1]) } catch { return null } })() : null
  const display = full.replace(/TRACK:\{[^}]+\}/g, '').trim()
  
  return { display, track }
}
