import { supabase, auth, profileDB, foodDB, workoutDB, waterDB, alarmDB, chatDB } from './lib/supabase.js'
import { askFitBot } from './lib/api.js'

// ── STATE ──────────────────────────────────────────────────────
let user = null
let profile = { language: 'en', voice_lang: 'en-IN', cal_goal: 2000, protein_goal: 120, water_goal: 8, burn_goal: 500, name: '' }
let ST = { cal: 0, protein: 0, water: 0, burned: 0 }
let chatHistory = []
let alarms = []
let busy = false
let recognition = null
let voiceCtx = 'chat'
let voiceLang = 'en-IN'
let langName = 'English'
let alarmTick = null
let langOpen = false
let selAlarmType = '💧 Water reminder'

const LANGS = {
  en: { name: 'English',   voice: 'en-IN', sub: 'Your fitness buddy' },
  hi: { name: 'Hindi',     voice: 'hi-IN', sub: 'Aapka fitness dost' },
  mr: { name: 'Marathi',   voice: 'mr-IN', sub: 'Tumcha fitness mitra' },
  gu: { name: 'Gujarati',  voice: 'gu-IN', sub: 'Tamaro fitness dost' },
  ta: { name: 'Tamil',     voice: 'ta-IN', sub: 'Ungal fitness nanban' },
  te: { name: 'Telugu',    voice: 'te-IN', sub: 'Mee fitness snehitadu' },
  kn: { name: 'Kannada',   voice: 'kn-IN', sub: 'Nimma fitness geleya' },
  bn: { name: 'Bengali',   voice: 'bn-IN', sub: 'Apnar fitness bondhu' },
  pa: { name: 'Punjabi',   voice: 'pa-IN', sub: 'Tuhada fitness dost' },
}

const MEALS = {
  breakfast: [
    { name: 'Poha', desc: 'Flattened rice with veggies & peanuts', cal: 250, protein: 6, tags: ['Light','Vegan'] },
    { name: 'Idli Sambar', desc: '2 idli with sambar & chutney', cal: 220, protein: 8, tags: ['South Indian'] },
    { name: 'Oats Upma', desc: 'Oats cooked with vegetables', cal: 280, protein: 10, tags: ['High-fibre'] },
    { name: 'Egg Bhurji + Roti', desc: 'Scrambled eggs with 1 roti', cal: 320, protein: 18, tags: ['High-protein'] },
  ],
  lunch: [
    { name: 'Dal Chawal + Sabzi', desc: 'Toor dal, rice & seasonal veg', cal: 480, protein: 16, tags: ['Balanced'] },
    { name: 'Rajma Chawal', desc: 'Kidney beans curry with rice', cal: 520, protein: 20, tags: ['High-protein'] },
    { name: 'Paneer Tikka Wrap', desc: 'Grilled paneer in whole wheat roti', cal: 380, protein: 22, tags: ['Filling'] },
    { name: 'Khichdi', desc: 'Rice & moong dal one-pot meal', cal: 360, protein: 14, tags: ['Light'] },
  ],
  dinner: [
    { name: 'Grilled Fish + Dal', desc: 'Rohu/Pomfret with moong dal', cal: 420, protein: 32, tags: ['High-protein'] },
    { name: 'Palak Paneer + Roti', desc: 'Spinach paneer with 2 rotis', cal: 440, protein: 24, tags: ['Iron-rich'] },
    { name: 'Moong Dal Soup', desc: 'Light protein soup with salad', cal: 280, protein: 16, tags: ['Weight-loss'] },
    { name: 'Chicken Stir Fry', desc: 'Lean chicken with veggies & roti', cal: 460, protein: 36, tags: ['Low-carb'] },
  ],
  snack: [
    { name: 'Roasted Chana', desc: '50g dry roasted chickpeas', cal: 180, protein: 10, tags: ['Crunchy'] },
    { name: 'Banana + PB', desc: '1 banana with 1 tbsp peanut butter', cal: 200, protein: 5, tags: ['Pre-workout'] },
    { name: 'Sprouts Chaat', desc: 'Mixed sprouts with lemon & spices', cal: 120, protein: 9, tags: ['Superfood'] },
    { name: 'Dahi', desc: '200g plain curd', cal: 130, protein: 8, tags: ['Probiotic'] },
  ]
}

// ── RENDER ROOT ───────────────────────────────────────────────
function render() {
  document.getElementById('root').innerHTML = `
    <div id="loading"><div class="spinner"></div><p>Loading FitBot...</p></div>
    ${renderAuth()}
    ${renderApp()}
    ${renderVoiceOverlay()}
    ${renderProfileDrawer()}
  `
  bindEvents()
}

function renderAuth() {
  return `
  <div id="auth-screen" style="display:none;">
    <div class="auth-logo">💪</div>
    <div class="auth-title">FitBot India</div>
    <div class="auth-sub">Your personal desi fitness & diet assistant</div>
    <div class="auth-card">
      <div class="auth-tabs">
        <button class="auth-tab on" id="tab-signin" onclick="switchAuthTab('signin')">Sign In</button>
        <button class="auth-tab" id="tab-signup" onclick="switchAuthTab('signup')">Sign Up</button>
      </div>
      <div id="signup-name" class="inp-group" style="display:none;">
        <label>Your name</label>
        <input type="text" id="auth-name" placeholder="e.g. Rahul Sharma" />
      </div>
      <div class="inp-group">
        <label>Email</label>
        <input type="email" id="auth-email" placeholder="you@example.com" autocomplete="email" />
      </div>
      <div class="inp-group">
        <label>Password</label>
        <input type="password" id="auth-pass" placeholder="••••••••" autocomplete="current-password" />
      </div>
      <div id="auth-error" class="auth-error" style="display:none;"></div>
      <div id="auth-msg" class="auth-msg" style="display:none;"></div>
      <button class="btn-primary" id="auth-submit-btn" onclick="handleAuth()">Sign In</button>
    </div>
  </div>`
}

function renderApp() {
  return `
  <div id="app-shell" style="display:none;">
    <div id="hdr">
      <div id="hdr-av" onclick="openProfile()">💪</div>
      <div id="hdr-inf">
        <h3>FitBot India</h3>
        <p id="hdr-sub"><span class="dot-online"></span>Online — Your fitness buddy</p>
      </div>
      <button class="hdr-btn" onclick="toggleLang()" style="margin-right:5px;">🌐 भाषा</button>
      <button class="hdr-btn" onclick="reqNotif()"><i class="ti ti-bell" style="font-size:12px;vertical-align:-1px;"></i></button>
    </div>

    <div id="lang-panel">
      <p>Choose your language / अपनी भाषा चुनें</p>
      <div id="lang-grid">
        <span class="lchip on" onclick="setLang('en',this)">English</span>
        <span class="lchip" onclick="setLang('hi',this)">हिंदी</span>
        <span class="lchip" onclick="setLang('mr',this)">मराठी</span>
        <span class="lchip" onclick="setLang('gu',this)">ગુજરાતી</span>
        <span class="lchip" onclick="setLang('ta',this)">தமிழ்</span>
        <span class="lchip" onclick="setLang('te',this)">తెలుగు</span>
        <span class="lchip" onclick="setLang('kn',this)">ಕನ್ನಡ</span>
        <span class="lchip" onclick="setLang('bn',this)">বাংলা</span>
        <span class="lchip" onclick="setLang('pa',this)">ਪੰਜਾਬੀ</span>
      </div>
    </div>

    <div id="notif-bar"></div>

    <div id="stats-strip">
      <div class="spill"><div>🍽️</div><div class="spill-v" id="s-cal">0</div><div class="spill-l">kcal in</div><div class="spill-b"><div class="spill-f" id="b-cal" style="width:0%"></div></div></div>
      <div class="spill"><div>🥩</div><div class="spill-v" id="s-pro">0g</div><div class="spill-l">protein</div><div class="spill-b"><div class="spill-f f-blue" id="b-pro" style="width:0%"></div></div></div>
      <div class="spill"><div>💧</div><div class="spill-v" id="s-wat">0/8</div><div class="spill-l">glasses</div><div class="spill-b"><div class="spill-f f-teal" id="b-wat" style="width:0%"></div></div></div>
      <div class="spill"><div>🔥</div><div class="spill-v" id="s-brn">0</div><div class="spill-l">burned</div><div class="spill-b"><div class="spill-f f-red" id="b-brn" style="width:0%"></div></div></div>
      <div class="spill"><div>⚖️</div><div class="spill-v" id="s-net">0</div><div class="spill-l">net kcal</div><div class="spill-b"><div class="spill-f" id="b-net" style="width:0%"></div></div></div>
    </div>

    <div id="nav">
      <button class="nav-tab on" onclick="switchTab('chat',this)"><i class="ti ti-message-circle"></i>Chat</button>
      <button class="nav-tab" onclick="switchTab('suggest',this)"><i class="ti ti-salad"></i>Meals</button>
      <button class="nav-tab" onclick="switchTab('alarm',this)"><i class="ti ti-alarm"></i>Alarms</button>
      <button class="nav-tab" onclick="switchTab('history',this)"><i class="ti ti-chart-bar"></i>Log</button>
      <button class="nav-tab" onclick="switchTab('voice',this)"><i class="ti ti-microphone"></i>Voice</button>
    </div>

    <div id="panels">

      <!-- CHAT -->
      <div class="panel on" id="panel-chat">
        <div id="msgs"><div class="date-chip">Aaj — Today</div></div>
        <div id="typing-r" style="padding:4px 9px;">
          <div class="bico">💪</div>
          <div class="tybbl"><div class="td"></div><div class="td"></div><div class="td"></div></div>
        </div>
        <div id="chips">
          <span class="qc" onclick="useChip('Maine poha khaya breakfast mein')">🍳 Breakfast</span>
          <span class="qc" onclick="useChip('I just finished my workout')">🏋️ Workout</span>
          <span class="qc" onclick="useChip('Pani piya ek glass')">💧 Water</span>
          <span class="qc" onclick="useChip('Aaj ka summary batao')">📊 Summary</span>
          <span class="qc" onclick="useChip('Suggest healthy dinner')">🌙 Dinner</span>
          <span class="qc" onclick="useChip('Weight loss diet plan do')">📋 Diet plan</span>
        </div>
        <div id="inp-row">
          <input type="text" id="msg-in" placeholder="Type or tap 🎙️ to speak..." />
          <button id="mic-btn" onclick="startVoice('chat')"><i class="ti ti-microphone" style="font-size:16px;"></i></button>
          <button id="snd-btn" onclick="doSend()"><i class="ti ti-send" style="font-size:15px;"></i></button>
        </div>
      </div>

      <!-- MEALS -->
      <div class="panel" id="panel-suggest">
        <div id="suggest-panel">
          <div class="voice-log-row" onclick="startVoice('meal')">
            <div style="width:30px;height:30px;border-radius:50%;background:var(--v2);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ti ti-microphone" style="font-size:15px;color:var(--v6);"></i></div>
            <span>🎙️ Say a meal to log it — <em style="color:var(--txt3)">"Maine dal chawal khaya"</em></span>
            <i class="ti ti-chevron-right" style="font-size:13px;color:var(--txt3);"></i>
          </div>
          <div class="meal-section"><h4><i class="ti ti-sunrise" style="font-size:14px;color:var(--v6);"></i> Breakfast</h4><div id="mc-breakfast"></div></div>
          <div class="meal-section"><h4><i class="ti ti-sun" style="font-size:14px;color:var(--v6);"></i> Lunch</h4><div id="mc-lunch"></div></div>
          <div class="meal-section"><h4><i class="ti ti-moon" style="font-size:14px;color:var(--v6);"></i> Dinner</h4><div id="mc-dinner"></div></div>
          <div class="meal-section"><h4><i class="ti ti-apple" style="font-size:14px;color:var(--v6);"></i> Snacks</h4><div id="mc-snack"></div></div>
          <button class="sg-btn" onclick="useChip('Give me a personalised Indian meal plan for today')">✨ Get personalised meal plan ↗</button>
        </div>
      </div>

      <!-- ALARMS -->
      <div class="panel" id="panel-alarm">
        <div id="alarm-panel">
          <div class="alarm-form-card">
            <h4><i class="ti ti-alarm-plus" style="font-size:14px;color:var(--v6);"></i> Add new reminder</h4>
            <button class="voice-alarm-btn" onclick="startVoice('alarm')">
              <i class="ti ti-microphone" style="font-size:14px;color:var(--v6);"></i>
              🎙️ Set by voice — <em style="color:var(--txt3)">"Water at 2 PM daily"</em>
            </button>
            <div class="aform-row"><label>Reminder type</label>
              <div id="alarm-types">
                <span class="atype sel" onclick="selType(this,'💧 Water reminder')">💧 Water</span>
                <span class="atype" onclick="selType(this,'🍽️ Meal time')">🍽️ Meal</span>
                <span class="atype" onclick="selType(this,'🏋️ Workout time')">🏋️ Workout</span>
                <span class="atype" onclick="selType(this,'💊 Supplements')">💊 Supplements</span>
                <span class="atype" onclick="selType(this,'🚶 Walk break')">🚶 Walk</span>
                <span class="atype" onclick="selType(this,'😴 Sleep time')">😴 Sleep</span>
                <span class="atype" onclick="selType(this,'⚖️ Weigh-in')">⚖️ Weigh-in</span>
              </div>
            </div>
            <div class="aform-row"><label>Custom label (optional)</label><input type="text" id="al-label" placeholder="e.g. Evening walk..."/></div>
            <div class="aform-2">
              <div class="aform-row"><label>Time</label><input type="time" id="al-time" value="08:00"/></div>
              <div class="aform-row"><label>Repeat</label>
                <select id="al-repeat">
                  <option value="daily">Every day</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekends">Weekends</option>
                  <option value="once">Once</option>
                </select>
              </div>
            </div>
            <button class="btn-primary" onclick="addAlarm()"><i class="ti ti-plus" style="font-size:13px;vertical-align:-1px;"></i> Set Reminder</button>
          </div>
          <div>
            <h4 style="font-size:12px;font-weight:500;color:var(--blk2);margin-bottom:7px;display:flex;align-items:center;gap:5px;"><i class="ti ti-list" style="font-size:14px;color:var(--v6);"></i> Your reminders <span id="alarm-count" style="font-size:11px;color:var(--txt3);font-weight:400;"></span></h4>
            <div id="alarms-container"><div class="no-items">No reminders yet. Add one above! ⏰</div></div>
          </div>
        </div>
      </div>

      <!-- HISTORY LOG -->
      <div class="panel" id="panel-history">
        <div id="history-panel">
          <div class="hist-card" id="food-hist-card">
            <h4><i class="ti ti-fork-knife" style="font-size:14px;color:var(--v6);"></i> Today's food</h4>
            <div id="food-hist"><div class="no-items" style="padding:8px 0;">No food logged yet</div></div>
          </div>
          <div class="hist-card" id="workout-hist-card">
            <h4><i class="ti ti-run" style="font-size:14px;color:var(--v6);"></i> Today's workouts</h4>
            <div id="workout-hist"><div class="no-items" style="padding:8px 0;">No workouts logged yet</div></div>
          </div>
          <div class="hist-card">
            <h4><i class="ti ti-droplet" style="font-size:14px;color:var(--v6);"></i> Water intake</h4>
            <div id="water-hist" style="font-size:14px;color:var(--blk2);font-weight:500;">0 glasses today</div>
          </div>
        </div>
      </div>

      <!-- VOICE GUIDE -->
      <div class="panel" id="panel-voice">
        <div id="voice-guide">
          <div class="vg-card">
            <h4><i class="ti ti-microphone" style="font-size:15px;color:var(--v6);"></i> Voice Commands Guide</h4>
            <div style="margin-bottom:12px;">
              <p style="font-size:11px;color:var(--txt2);margin-bottom:6px;">Voice language</p>
              <select class="lang-select" id="voice-panel-lang" onchange="setVoiceLang(this.value)">
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">हिंदी (Hindi)</option>
                <option value="mr-IN">मराठी (Marathi)</option>
                <option value="gu-IN">ગુજરાતી (Gujarati)</option>
                <option value="ta-IN">தமிழ் (Tamil)</option>
                <option value="te-IN">తెలుగు (Telugu)</option>
                <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                <option value="bn-IN">বাংলা (Bengali)</option>
                <option value="pa-IN">ਪੰਜਾਬੀ (Punjabi)</option>
              </select>
            </div>
            <div class="vg-item"><h5>💬 Food logging</h5><p>"Maine aaj subah 2 idli khaye"<br>"I had dal rice for lunch"<br>"Just had a banana"</p></div>
            <div class="vg-item"><h5>🏋️ Workout logging</h5><p>"30 minute run kiya abhi"<br>"I did 1 hour gym workout"<br>"Walked 5 km today"</p></div>
            <div class="vg-item"><h5>💧 Water</h5><p>"Paani piya 2 glass"<br>"Had a glass of water"</p></div>
            <div class="vg-item"><h5>⏰ Set alarms</h5><p>"Water reminder at 2 PM daily"<br>"Lunch alarm at 1 30"<br>"Workout at 6 AM weekdays"</p></div>
          </div>
          <button class="btn-primary" onclick="startVoice('chat')"><i class="ti ti-microphone" style="font-size:15px;vertical-align:-2px;"></i> Start speaking now</button>
        </div>
      </div>

    </div>
  </div>`
}

function renderVoiceOverlay() {
  return `
  <div id="voice-overlay">
    <div id="vo-ctx-hint" class="vg-card" style="padding:4px 12px;background:rgba(255,255,255,0.08);border:none;font-size:12px;color:var(--v4);">💬 Listening...</div>
    <div id="vo-ring"><i class="ti ti-microphone" style="font-size:32px;color:#fff;"></i></div>
    <div class="vo-bars">${'<div class="vo-bar"></div>'.repeat(7)}</div>
    <select id="vo-lang-sel" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:5px 14px;font-size:12px;color:#fff;font-family:inherit;outline:none;" onchange="setVoiceLang(this.value)">
      <option value="en-IN">English (India)</option>
      <option value="hi-IN">हिंदी</option>
      <option value="mr-IN">मराठी</option>
      <option value="gu-IN">ગુજરાતી</option>
      <option value="ta-IN">தமிழ்</option>
      <option value="te-IN">తెలుగు</option>
      <option value="kn-IN">ಕನ್ನಡ</option>
      <option value="bn-IN">বাংলা</option>
      <option value="pa-IN">ਪੰਜਾਬੀ</option>
    </select>
    <div id="vo-transcript">Waiting for speech...</div>
    <div id="vo-hint" style="color:rgba(255,255,255,0.4);font-size:11px;">Speak clearly • Works best in Chrome</div>
    <button id="vo-stop" onclick="stopVoice()"><i class="ti ti-player-stop" style="font-size:12px;vertical-align:-1px;"></i> Stop listening</button>
  </div>`
}

function renderProfileDrawer() {
  return `
  <div id="profile-drawer">
    <div id="drawer-bg" onclick="closeProfile()"></div>
    <div id="drawer-content">
      <div class="drawer-header">
        <div class="drawer-av">💪</div>
        <div>
          <div class="drawer-name" id="drawer-name">Loading...</div>
          <div class="drawer-email" id="drawer-email"></div>
        </div>
      </div>
      <div class="drawer-section">
        <h5>Daily goals</h5>
        <div class="drawer-row"><label>Calorie goal (kcal)</label><input type="number" id="g-cal" value="2000" onchange="saveGoals()"/></div>
        <div class="drawer-row"><label>Protein goal (g)</label><input type="number" id="g-pro" value="120" onchange="saveGoals()"/></div>
        <div class="drawer-row"><label>Water goal (glasses)</label><input type="number" id="g-wat" value="8" onchange="saveGoals()"/></div>
        <div class="drawer-row"><label>Burn goal (kcal)</label><input type="number" id="g-brn" value="500" onchange="saveGoals()"/></div>
      </div>
      <button class="sign-out-btn" onclick="handleSignOut()"><i class="ti ti-logout" style="font-size:14px;vertical-align:-2px;"></i> Sign out</button>
    </div>
  </div>`
}

// ── BIND EVENTS ───────────────────────────────────────────────
function bindEvents() {
  document.getElementById('msg-in')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend() }
  })
}

// ── AUTH ──────────────────────────────────────────────────────
let authMode = 'signin'
window.switchAuthTab = (mode) => {
  authMode = mode
  document.getElementById('tab-signin').classList.toggle('on', mode === 'signin')
  document.getElementById('tab-signup').classList.toggle('on', mode === 'signup')
  document.getElementById('signup-name').style.display = mode === 'signup' ? 'flex' : 'none'
  document.getElementById('auth-submit-btn').textContent = mode === 'signin' ? 'Sign In' : 'Create Account'
  document.getElementById('auth-error').style.display = 'none'
  document.getElementById('auth-msg').style.display = 'none'
}

window.handleAuth = async () => {
  const email = document.getElementById('auth-email').value.trim()
  const pass  = document.getElementById('auth-pass').value
  const name  = document.getElementById('auth-name')?.value.trim() || ''
  const errEl = document.getElementById('auth-error')
  const msgEl = document.getElementById('auth-msg')
  const btn   = document.getElementById('auth-submit-btn')

  errEl.style.display = 'none'; msgEl.style.display = 'none'
  if (!email || !pass) { showErr('Please fill in all fields'); return }

  btn.disabled = true; btn.textContent = 'Please wait...'
  try {
    if (authMode === 'signup') {
      const { error } = await auth.signUp(email, pass, name)
      if (error) throw error
      msgEl.textContent = '✅ Account created! Check your email to verify, then sign in.'; msgEl.style.display = 'block'
    } else {
      const { error } = await auth.signIn(email, pass)
      if (error) throw error
    }
  } catch (e) {
    showErr(e.message || 'Something went wrong')
  }
  btn.disabled = false; btn.textContent = authMode === 'signin' ? 'Sign In' : 'Create Account'
}

function showErr(msg) {
  const el = document.getElementById('auth-error')
  el.textContent = msg; el.style.display = 'block'
}

window.handleSignOut = async () => {
  await auth.signOut()
  user = null; chatHistory = []; alarms = []
  clearInterval(alarmTick); alarmTick = null
  document.getElementById('app-shell').style.display = 'none'
  document.getElementById('auth-screen').style.display = 'flex'
  closeProfile()
}

// ── INIT APP AFTER LOGIN ──────────────────────────────────────
async function initApp(u) {
  user = u
  document.getElementById('loading').style.display = 'none'
  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('app-shell').style.display = 'flex'

  // Load profile
  const { data: p } = await profileDB.get(user.id)
  if (p) {
    profile = { ...profile, ...p }
    langName = LANGS[profile.language]?.name || 'English'
    voiceLang = profile.voice_lang || 'en-IN'
  }

  // Set goals inputs
  document.getElementById('g-cal').value = profile.cal_goal
  document.getElementById('g-pro').value = profile.protein_goal
  document.getElementById('g-wat').value = profile.water_goal
  document.getElementById('g-brn').value = profile.burn_goal
  document.getElementById('drawer-name').textContent  = profile.name || user.email
  document.getElementById('drawer-email').textContent = user.email

  // Load today's stats
  await loadTodayStats()

  // Load alarms
  const { data: als } = await alarmDB.getAll(user.id)
  if (als) alarms = als
  renderAlarms()

  // Load recent chat
  const { data: msgs } = await chatDB.recent(user.id, 20)
  if (msgs?.length) {
    chatHistory = msgs
    msgs.forEach(m => addMsgDOM(m.content, m.role === 'user' ? 'u' : 'b'))
  } else {
    setTimeout(() => addMsgDOM(`Namaste${profile.name ? ', '+profile.name : ''}! 🙏 Main hoon FitBot India — aapka personal fitness dost!\n\n🎙️ Voice support • 🥗 Meal suggestions • ⏰ Smart reminders — sab kuch hai!\n\nAaj ka pehla meal kya tha? Batao! 😊`, 'b'), 400)
  }

  buildMeals()
  startTick()

  // Update lang chip
  document.querySelectorAll('.lchip').forEach(c => c.classList.remove('on'))
  document.querySelector(`#lang-grid .lchip:nth-child(${Object.keys(LANGS).indexOf(profile.language) + 1})`)?.classList.add('on')
}

async function loadTodayStats() {
  const [food, workout, water] = await Promise.all([
    foodDB.today(user.id),
    workoutDB.today(user.id),
    waterDB.today(user.id),
  ])
  ST.cal     = food.data?.reduce((s, x) => s + (x.calories || 0), 0) || 0
  ST.protein = food.data?.reduce((s, x) => s + (x.protein || 0), 0) || 0
  ST.burned  = workout.data?.reduce((s, x) => s + (x.calories_burned || 0), 0) || 0
  ST.water   = water.data?.reduce((s, x) => s + (x.glasses || 0), 0) || 0
  updStats()
  renderHistory(food.data, workout.data, water.data)
}

// ── CHAT ──────────────────────────────────────────────────────
window.doSend = async () => {
  const inp = document.getElementById('msg-in')
  const txt = inp.value.trim()
  if (!txt || busy) return
  inp.value = ''; busy = true
  addMsgDOM(txt, 'u')
  if (user) chatDB.save(user.id, 'user', txt)
  chatHistory.push({ role: 'user', content: txt })
  showTyping(true)
  try {
    const { display, track } = await askFitBot(chatHistory.slice(-20), langName)
    showTyping(false)
    addMsgDOM(display, 'b')
    chatHistory.push({ role: 'assistant', content: display })
    if (user) chatDB.save(user.id, 'assistant', display)
    await applyTrack(track)
  } catch (e) {
    showTyping(false)
    addMsgDOM('Network issue. Dobara try karo 😅', 'b')
  }
  busy = false
}

window.useChip = (txt) => {
  document.getElementById('msg-in').value = txt
  switchTab('chat', document.querySelector('#nav .nav-tab'))
  doSend()
}

function addMsgDOM(txt, who) {
  const msgs = document.getElementById('msgs')
  const row = document.createElement('div'); row.className = 'mrow ' + who
  if (who === 'b') { const ic = document.createElement('div'); ic.className = 'bico'; ic.textContent = '💪'; row.appendChild(ic) }
  const wr = document.createElement('div'); wr.className = 'mwrap'
  const bb = document.createElement('div'); bb.className = 'bbl'; bb.textContent = txt
  const ts = document.createElement('div'); ts.className = 'mts'
  ts.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + (who === 'u' ? '  ✓✓' : '')
  wr.appendChild(bb); wr.appendChild(ts); row.appendChild(wr); msgs.appendChild(row)
  msgs.scrollTop = msgs.scrollHeight
}

function addToast(txt) {
  const msgs = document.getElementById('msgs')
  const t = document.createElement('div'); t.className = 'atoast'; t.textContent = txt
  msgs.appendChild(t); msgs.scrollTop = msgs.scrollHeight
}

function showTyping(v) {
  const t = document.getElementById('typing-r'); t.style.display = v ? 'flex' : 'none'
  const msgs = document.getElementById('msgs'); if (v) msgs.appendChild(t); msgs.scrollTop = msgs.scrollHeight
}

// ── TRACKING ──────────────────────────────────────────────────
async function applyTrack(t) {
  if (!t || !user) return
  if (t.type === 'food') {
    await foodDB.add(user.id, { name: t.name, calories: t.calories || 0, protein: t.protein || 0, carbs: t.carbs || 0, fat: t.fat || 0, meal_type: t.meal_type || 'other' })
    ST.cal += t.calories || 0; ST.protein += t.protein || 0
    addToast(`✅ ${t.name} — ${Math.round(t.calories)} kcal, ${Math.round(t.protein)}g protein`)
  } else if (t.type === 'workout') {
    await workoutDB.add(user.id, { name: t.name, calories_burned: t.burned || 0, duration_min: t.duration_min || 0 })
    ST.burned += t.burned || 0
    addToast(`🏋️ ${t.name} — ${Math.round(t.burned)} kcal burned`)
  } else if (t.type === 'water') {
    await waterDB.add(user.id, t.glasses || 1)
    ST.water += t.glasses || 1
    addToast(`💧 Water: ${t.glasses || 1} glass logged`)
  }
  updStats()
  await loadTodayStats()
}

// ── STATS ─────────────────────────────────────────────────────
function updStats() {
  const G = { cal: profile.cal_goal, pro: profile.protein_goal, wat: profile.water_goal, brn: profile.burn_goal }
  document.getElementById('s-cal').textContent = Math.round(ST.cal)
  document.getElementById('s-pro').textContent = Math.round(ST.protein) + 'g'
  document.getElementById('s-wat').textContent = ST.water + '/' + G.wat
  document.getElementById('s-brn').textContent = Math.round(ST.burned)
  const net = Math.round(ST.cal - ST.burned)
  document.getElementById('s-net').textContent = net
  const cp = Math.min((ST.cal / G.cal) * 100, 100)
  document.getElementById('b-cal').style.width = cp + '%'
  document.getElementById('b-cal').style.background = cp > 90 ? '#E05252' : cp > 70 ? '#C9831A' : '#7C6BE8'
  document.getElementById('b-pro').style.width = Math.min((ST.protein / G.pro) * 100, 100) + '%'
  document.getElementById('b-wat').style.width = Math.min((ST.water / G.wat) * 100, 100) + '%'
  document.getElementById('b-brn').style.width = Math.min((ST.burned / G.brn) * 100, 100) + '%'
  document.getElementById('b-net').style.width = Math.min((Math.max(net, 0) / G.cal) * 100, 100) + '%'
}

// ── HISTORY ───────────────────────────────────────────────────
function renderHistory(food, workouts, water) {
  const foodEl = document.getElementById('food-hist')
  if (food?.length) {
    foodEl.innerHTML = food.map(f => `
      <div class="hist-item">
        <span class="hist-name">${f.name}</span>
        <span class="hist-val">${Math.round(f.calories)} kcal</span>
        <span class="hist-time">${new Date(f.logged_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>`).join('')
  } else foodEl.innerHTML = '<div class="no-items" style="padding:8px 0;">No food logged yet</div>'

  const workEl = document.getElementById('workout-hist')
  if (workouts?.length) {
    workEl.innerHTML = workouts.map(w => `
      <div class="hist-item">
        <span class="hist-name">${w.name}</span>
        <span class="hist-val">${Math.round(w.calories_burned)} kcal burned</span>
        <span class="hist-time">${new Date(w.logged_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>`).join('')
  } else workEl.innerHTML = '<div class="no-items" style="padding:8px 0;">No workouts logged yet</div>'

  const wGlasses = water?.reduce((s, x) => s + (x.glasses || 0), 0) || 0
  document.getElementById('water-hist').textContent = `${wGlasses} glasses today 💧`
}

// ── MEALS ─────────────────────────────────────────────────────
function buildMeals() {
  ;['breakfast', 'lunch', 'dinner', 'snack'].forEach(type => {
    const c = document.getElementById('mc-' + type); if (!c) return
    c.innerHTML = ''
    MEALS[type].forEach(m => {
      const card = document.createElement('div'); card.className = 'meal-card'
      card.innerHTML = `<div style="flex:1"><div class="mc-name">${m.name}</div><div class="mc-desc">${m.desc}</div><div class="mc-tags">${m.tags.map(t => `<span class="mc-tag">${t}</span>`).join('')}</div></div><div class="mc-cal">${m.cal}<span>kcal</span><span class="mc-prot">${m.protein}g prot</span></div>`
      card.onclick = () => useChip(`Maine ${m.name} khaya (${m.cal} kcal)`)
      c.appendChild(card)
    })
  })
}

// ── ALARMS ────────────────────────────────────────────────────
window.selType = (el, type) => {
  document.querySelectorAll('.atype').forEach(a => a.classList.remove('sel'))
  el.classList.add('sel'); selAlarmType = type
}

window.addAlarm = async () => {
  const time   = document.getElementById('al-time').value
  const label  = document.getElementById('al-label').value.trim() || selAlarmType
  const repeat = document.getElementById('al-repeat').value
  if (!time) { showNotif('⚠️ Please set a time!'); return }
  const icon   = selAlarmType.split(' ')[0]
  const alarm  = { icon, label, time, repeat, active: true }
  if (user) {
    const { data } = await alarmDB.add(user.id, alarm)
    if (data) alarms.push(data)
  } else {
    alarms.push({ ...alarm, id: Date.now() })
  }
  document.getElementById('al-label').value = ''
  renderAlarms(); showNotif(`✅ Reminder set: ${label} at ${fmtTime(time)}`)
}

window.toggleAlarm = async (id, v) => {
  const a = alarms.find(x => x.id === id); if (a) a.active = v
  if (user) await alarmDB.toggle(id, v)
}

window.delAlarm = async (id) => {
  alarms = alarms.filter(x => x.id !== id)
  if (user) await alarmDB.delete(id)
  renderAlarms()
}

function renderAlarms() {
  const c = document.getElementById('alarms-container'); if (!c) return
  document.getElementById('alarm-count').textContent = `(${alarms.length})`
  if (!alarms.length) { c.innerHTML = '<div class="no-items">No reminders yet. Add one above! ⏰</div>'; return }
  c.innerHTML = ''
  alarms.forEach(a => {
    const rLbl = { daily: 'Every day', weekdays: 'Weekdays', weekends: 'Weekends', once: 'Once' }[a.repeat]
    const d = document.createElement('div'); d.className = 'alarm-item'; d.id = 'al-' + a.id
    d.innerHTML = `<div class="ai-icon">${a.icon}</div><div class="ai-info"><div class="ai-label">${a.label}</div><div class="ai-time">${fmtTime(a.time)}</div><div class="ai-days">${rLbl}</div></div><div class="ai-right"><label class="toggle"><input type="checkbox" ${a.active ? 'checked' : ''} onchange="toggleAlarm('${a.id}',this.checked)"><span class="slider"></span></label><button class="del-btn" onclick="delAlarm('${a.id}')"><i class="ti ti-trash" style="font-size:14px;"></i></button></div>`
    c.appendChild(d)
  })
}

function startTick() { if (alarmTick) return; alarmTick = setInterval(checkAlarms, 10000) }
function checkAlarms() {
  const now = new Date()
  const ns  = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0')
  const day = now.getDay()
  alarms.forEach(a => {
    if (!a.active || a.time !== ns) return
    const key = ns + '-' + now.toDateString()
    if (a.lastFired === key) return
    if (a.repeat === 'weekdays' && (day === 0 || day === 6)) return
    if (a.repeat === 'weekends' && day > 0 && day < 6) return
    a.lastFired = key; fireAlarm(a)
    if (a.repeat === 'once') { a.active = false; renderAlarms() }
  })
}
function fireAlarm(a) {
  showNotif(`${a.icon} Reminder: ${a.label} — ${fmtTime(a.time)}`)
  if (Notification?.permission === 'granted') try { new Notification('FitBot India', { body: a.label + ' — ' + fmtTime(a.time) }) } catch (e) {}
  const el = document.getElementById('al-' + a.id)
  if (el) { el.classList.add('fired'); setTimeout(() => el.classList.remove('fired'), 4000) }
  switchTab('chat', document.querySelector('#nav .nav-tab'))
  addMsgDOM(`${a.icon} Reminder: ${a.label}! Stay on track 💪`, 'b')
}

// ── VOICE ─────────────────────────────────────────────────────
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition

window.startVoice = (ctx) => {
  if (!SpeechRec) { showNotif('⚠️ Use Chrome for voice support'); return }
  voiceCtx = ctx
  const hints = { chat: '💬 Listening for chat...', meal: '🍽️ Say a meal to log...', alarm: '⏰ Say an alarm...' }
  document.getElementById('vo-ctx-hint').textContent = hints[ctx] || hints.chat
  document.getElementById('vo-transcript').textContent = 'Waiting for speech...'
  document.getElementById('voice-overlay').classList.add('show')
  document.getElementById('mic-btn')?.classList.add('active')

  recognition = new SpeechRec()
  recognition.lang = voiceLang; recognition.continuous = false; recognition.interimResults = true

  recognition.onresult = e => {
    let interim = '', final = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript
      else interim += e.results[i][0].transcript
    }
    document.getElementById('vo-transcript').textContent = final || interim || 'Listening...'
  }
  recognition.onend = () => {
    const txt = document.getElementById('vo-transcript').textContent
    stopVoice()
    if (txt && txt !== 'Waiting for speech...' && txt !== 'Listening...') handleVoiceResult(txt.trim(), voiceCtx)
  }
  recognition.onerror = e => {
    stopVoice()
    if (e.error === 'not-allowed') showNotif('⚠️ Allow microphone access in browser settings')
    else if (e.error === 'no-speech') showNotif('ℹ️ No speech detected. Try again!')
  }
  recognition.start()
}

window.stopVoice = () => {
  if (recognition) { try { recognition.stop() } catch (e) {} }
  recognition = null
  document.getElementById('voice-overlay').classList.remove('show')
  document.getElementById('mic-btn')?.classList.remove('active')
}

function handleVoiceResult(text, ctx) {
  if (ctx === 'alarm') parseVoiceAlarm(text)
  else { document.getElementById('msg-in').value = text; switchTab('chat', document.querySelector('#nav .nav-tab')); doSend() }
}

function parseVoiceAlarm(text) {
  const lower = text.toLowerCase()
  let hour = 8, min = 0
  const tm = lower.match(/(\d{1,2})\s*[:\s]\s*(\d{2})/); if (tm) { hour = parseInt(tm[1]); min = parseInt(tm[2]) }
  else { const ho = lower.match(/(\d{1,2})\s*(am|pm)/); if (ho) { hour = parseInt(ho[1]); if (ho[2] === 'pm' && hour < 12) hour += 12; if (ho[2] === 'am' && hour === 12) hour = 0 } }
  if (lower.includes('pm') && hour < 12) hour += 12
  const timeStr = String(hour).padStart(2,'0') + ':' + String(min).padStart(2,'0')
  const repeat = lower.includes('weekday') ? 'weekdays' : lower.includes('weekend') ? 'weekends' : lower.includes('once') ? 'once' : 'daily'
  let type = '💧 Water reminder'
  if (lower.match(/lunch|meal|food|khana/)) type = '🍽️ Meal time'
  else if (lower.match(/workout|gym|exercise|walk/)) type = '🏋️ Workout time'
  else if (lower.match(/sleep|bed/)) type = '😴 Sleep time'
  else if (lower.match(/supplement|vitamin|medicine/)) type = '💊 Supplements'
  const icon = type.split(' ')[0]
  const alarm = { icon, label: text.length < 40 ? text : type, time: timeStr, repeat, active: true }
  if (user) alarmDB.add(user.id, alarm).then(({ data }) => { if (data) alarms.push(data); renderAlarms() })
  else { alarms.push({ ...alarm, id: Date.now() }); renderAlarms() }
  switchTab('alarm', document.querySelectorAll('#nav .nav-tab')[2])
  showNotif(`✅ Voice alarm: ${type} at ${fmtTime(timeStr)} (${repeat})`)
}

window.setVoiceLang = (val) => {
  voiceLang = val
  document.getElementById('vo-lang-sel').value = val
  const vp = document.getElementById('voice-panel-lang'); if (vp) vp.value = val
}

// ── LANGUAGE ──────────────────────────────────────────────────
window.toggleLang = () => {
  langOpen = !langOpen
  document.getElementById('lang-panel').style.display = langOpen ? 'block' : 'none'
}

window.setLang = async (code, el) => {
  const L = LANGS[code]; if (!L) return
  langName = L.name; voiceLang = L.voice
  document.querySelectorAll('.lchip').forEach(c => c.classList.remove('on')); el.classList.add('on')
  document.getElementById('lang-panel').style.display = 'none'; langOpen = false
  document.getElementById('hdr-sub').innerHTML = `<span class="dot-online"></span>Online — ${L.sub}`
  document.getElementById('vo-lang-sel').value = L.voice
  const vp = document.getElementById('voice-panel-lang'); if (vp) vp.value = L.voice
  if (user) await profileDB.update(user.id, { language: code, voice_lang: L.voice })
  profile.language = code; profile.voice_lang = L.voice
  switchTab('chat', document.querySelector('#nav .nav-tab'))
  const greets = { en:"Language set to English! Let's go 💪", hi:"Hindi mein baat karenge! 😄", mr:"Marathi madhye boluyaa! 💪", gu:"Gujarati maa vaat! 🙏", ta:"Tamil la pesuvoam! 😊", te:"Telugu lo maatladudaam! 💪", kn:"Kannada alli! 🙏", bn:"Banglay bolbo! 😊", pa:"Punjabi vich! 💪" }
  addMsgDOM(greets[code] || greets.en, 'b')
}

// ── PROFILE DRAWER ────────────────────────────────────────────
window.openProfile = () => { document.getElementById('profile-drawer').classList.add('show') }
window.closeProfile = () => { document.getElementById('profile-drawer').classList.remove('show') }

window.saveGoals = async () => {
  const goals = { cal_goal: parseInt(document.getElementById('g-cal').value) || 2000, protein_goal: parseInt(document.getElementById('g-pro').value) || 120, water_goal: parseInt(document.getElementById('g-wat').value) || 8, burn_goal: parseInt(document.getElementById('g-brn').value) || 500 }
  Object.assign(profile, goals)
  if (user) await profileDB.update(user.id, goals)
  updStats()
}

// ── TABS ──────────────────────────────────────────────────────
window.switchTab = (name, el) => {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'))
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('on'))
  document.getElementById('panel-' + name)?.classList.add('on'); el.classList.add('on')
}

// ── UTILS ─────────────────────────────────────────────────────
function fmtTime(t) { const [h, m] = t.split(':'); const hr = parseInt(h); return (hr % 12 || 12) + ':' + m + (hr >= 12 ? ' PM' : ' AM') }

function showNotif(msg) {
  const b = document.getElementById('notif-bar'); if (!b) return
  b.textContent = msg; b.style.display = 'block'
  clearTimeout(b._t); b._t = setTimeout(() => b.style.display = 'none', 4000)
}

window.reqNotif = () => {
  if ('Notification' in window) Notification.requestPermission().then(p => showNotif(p === 'granted' ? '✅ Notifications enabled!' : 'ℹ️ In-app alerts will still work!'))
}

// ── SERVICE WORKER ────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

// ── BOOT ──────────────────────────────────────────────────────
render()

auth.onAuthChange(async (event, session) => {
  if (session?.user) {
    await initApp(session.user)
  } else {
    document.getElementById('loading').style.display = 'none'
    document.getElementById('auth-screen').style.display = 'flex'
    document.getElementById('app-shell').style.display = 'none'
  }
})
