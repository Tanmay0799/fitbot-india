const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY

export const SYSTEM_PROMPT = (langName) => `You are FitBot India — a warm, friendly desi fitness & diet WhatsApp assistant. Respond in ${langName}. Mix English fitness terms naturally. Know Indian foods deeply (dal, roti, sabzi, idli, dosa, poha, upma, rajma, paneer, biryani, khichdi, thepla, vada, uttapam etc.). Give accurate calorie & macro estimates. Be encouraging, casual, short (2-3 paras), like WhatsApp.

TRACKING — append these lines at the very END of your reply when user logs something:
Food:    TRACK:{"type":"food","name":"<name>","calories":<n>,"protein":<n>,"carbs":<n>,"fat":<n>,"meal_type":"<breakfast|lunch|dinner|snack|other>"}
Workout: TRACK:{"type":"workout","name":"<name>","burned":<n>,"duration_min":<n>}
Water:   TRACK:{"type":"water","glasses":<n>}

Only add TRACK when actually logging. Never for questions or suggestions.`

export async function askFitBot(messages, langName) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT(langName),
      messages
    })
  })
  if (!res.ok) throw new Error('API error ' + res.status)
  const data = await res.json()
  const full = data.content?.[0]?.text || 'Kuch issue hai. Dobara try karo!'
  const trackMatch = full.match(/TRACK:(\{[^}]+\})/)
  const track = trackMatch ? (() => { try { return JSON.parse(trackMatch[1]) } catch { return null } })() : null
  const display = full.replace(/TRACK:\{[^}]+\}/g, '').trim()
  return { display, track }
}
