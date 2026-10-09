// CityPulse PulseBot AI Assistant Module
let chatMessages = [];
let isBotTyping = false;

function initPulseBot() {
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  // Initial welcome message
  if (chatMessages.length === 0) {
    appendBotMessage(
      `👋 Welcome to **CityPulse 360**! I am **PulseBot**, your local rule-based city guide for **${window.currentCity}**.\n\n` +
      "Ask me anything about discovering authentic food spots, finding well-lit walking routes, listening to heritage audio tours, or checking urban traffic telemetry!",
      ["Best Street Food", "Is this area safe at night?", "Heritage Walking Tour", "Compare Top Districts"]
    );
  }
}

window.updatePulseBotCity = function(cityName) {
  appendBotMessage(
    `📍 Switched active destination to **${cityName}**!\n\n` +
    `Ask me for recommendations on local culinary specialties, historic monuments, or safe walking routes in **${cityName}**.`,
    [`Best Food in ${cityName}`, `Heritage Tour in ${cityName}`, `Safe Routes in ${cityName}`]
  );
};

function handleQuickPrompt(promptText) {
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.value = promptText;
    sendMessage();
  }
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim() || isBotTyping) return;

  const userText = input.value.trim();
  input.value = '';

  // Append user message
  appendUserMessage(userText);

  // Show typing indicator
  showTypingIndicator();
  isBotTyping = true;

  try {
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userText,
        city: window.currentCity || "Mumbai"
      })
    });

    removeTypingIndicator();

    if (res.ok) {
      const data = await res.json();
      appendBotMessage(data.answer, data.suggested_actions, data.highlight_places);
    } else {
      appendBotMessage("Sorry, I encountered an issue analyzing the city data. Please try again.");
    }
  } catch (err) {
    removeTypingIndicator();
    console.error(err);
    appendBotMessage("Connection to CityPulse AI server failed. Please check your network.");
  } finally {
    isBotTyping = false;
  }
}

function appendUserMessage(text) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex justify-end mb-3';
  msgDiv.innerHTML = `
    <div class="chat-bubble-user max-w-[85%] px-4 py-2.5 rounded-2xl text-xs md:text-sm shadow-md">
      <p class="whitespace-pre-wrap">${escapeHtml(text)}</p>
    </div>
  `;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendBotMessage(text, actions = [], highlightPlaces = []) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const formattedText = renderMarkdownBasic(text);

  let actionsHtml = '';
  if (actions && actions.length > 0) {
    actionsHtml = `
      <div class="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5">
        ${actions.map(act => `
          <button onclick="handleBotAction('${escapeAttr(act)}')" class="text-[11px] bg-blue-900/60 hover:bg-blue-800 text-blue-200 px-2.5 py-1 rounded-full border border-blue-700/50 transition">
            ⚡ ${act}
          </button>
        `).join('')}
      </div>
    `;
  }

  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex justify-start mb-3';
  msgDiv.innerHTML = `
    <div class="chat-bubble-bot max-w-[90%] p-3.5 rounded-2xl text-xs md:text-sm shadow-md text-slate-200">
      <div class="flex items-center justify-between mb-1 text-[11px] text-blue-400 font-semibold">
        <span class="flex items-center gap-1.5">🤖 PulseBot AI</span>
        <button onclick="speakText(this)" class="hover:text-blue-300 transition text-slate-400" title="Listen to response">
          🔊 Read Aloud
        </button>
      </div>
      <div class="prose prose-invert prose-xs leading-relaxed">
        ${formattedText}
      </div>
      ${actionsHtml}
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function handleBotAction(action) {
  const a = action.toLowerCase();
  if (a.includes('food') || a.includes('street')) {
    window.switchTab('explore');
    const filter = document.getElementById('category-filter');
    if (filter) { filter.value = 'food'; window.applyFilters(); }
  } else if (a.includes('safeway') || a.includes('route') || a.includes('gateway')) {
    window.switchTab('safety');
    window.loadPresetRoute('mum_cst_to_gateway');
  } else if (a.includes('heritage') || a.includes('culture') || a.includes('tour') || a.includes('csmt')) {
    window.switchTab('culture');
  } else if (a.includes('compare') || a.includes('radar')) {
    window.switchTab('compare');
  } else if (a.includes('traffic') || a.includes('weather') || a.includes('report')) {
    window.switchTab('insights');
  } else if (a.includes('sos')) {
    window.openEmergencyModal();
  } else {
    // Treat as query
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = action;
      sendMessage();
    }
  }
}

function showTypingIndicator() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const indicator = document.createElement('div');
  indicator.id = 'chat-typing-indicator';
  indicator.className = 'flex justify-start mb-3';
  indicator.innerHTML = `
    <div class="chat-bubble-bot px-4 py-2.5 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
      <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
      <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
      <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
      <span>Analyzing urban telemetry...</span>
    </div>
  `;
  container.appendChild(indicator);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const ind = document.getElementById('chat-typing-indicator');
  if (ind) ind.remove();
}

function renderMarkdownBasic(md) {
  if (!md) return '';
  let html = md
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^• (.*$)/gim, '<li class="ml-3 list-disc">$1</li>')
    .replace(/^[0-9]+\. (.*$)/gim, '<li class="ml-3 list-decimal">$1</li>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
  return html;
}

function speakText(btn) {
  const textContainer = btn.closest('.chat-bubble-bot').querySelector('.prose');
  if (!textContainer) return;
  const rawText = textContainer.innerText;
  
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(rawText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    alert("Text-to-speech is not supported in this browser.");
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
