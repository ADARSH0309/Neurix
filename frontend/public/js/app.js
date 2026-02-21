// Server configuration - matches backend MCP servers
const MCP_SERVERS = {
  gdrive: {
    name: 'Google Drive',
    baseUrl: 'http://localhost:9090',
    authUrl: '/auth/login',
    callbackUrl: '/auth/callback',
    sseUrl: '/sse',
    connected: false,
    token: null,
    eventSource: null,
    tools: [],
    userEmail: null
  },
  gforms: {
    name: 'Google Forms',
    baseUrl: 'http://localhost:8084',
    authUrl: '/auth/login',
    callbackUrl: '/auth/google-forms/callback',
    sseUrl: '/sse',
    connected: false,
    token: null,
    eventSource: null,
    tools: [],
    userEmail: null
  }
};

// Conversation history for OpenAI context
const conversationHistory = [];

// DOM elements
const messagesContainer = document.getElementById('messages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const targetServer = document.getElementById('targetServer');
const connectedCount = document.getElementById('connectedCount');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check for OAuth callback token
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('access_token');
  const server = urlParams.get('server'); // Sometimes passed back

  if (token) {
    // Get pending server from localStorage or URL
    const pendingServerId = localStorage.getItem('mcp_auth_pending') || server;

    if (pendingServerId && MCP_SERVERS[pendingServerId]) {
      // Store token
      localStorage.setItem(`mcp_token_${pendingServerId}`, token);
      localStorage.removeItem('mcp_auth_pending');

      // If this is a popup, notify opener and close
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'oauth_success', serverId: pendingServerId, token }, window.location.origin);
        window.close();
        return;
      } else {
        // Direct navigation - handle here
        handleOAuthCallback(pendingServerId, token);
      }
    }
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Listen for OAuth success messages from popup
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data.type === 'oauth_success') {
      const { serverId, token } = event.data;
      if (MCP_SERVERS[serverId]) {
        handleOAuthCallback(serverId, token);
      }
    }
  });

  // Check stored tokens and try to connect
  Object.keys(MCP_SERVERS).forEach(serverId => {
    const storedToken = localStorage.getItem(`mcp_token_${serverId}`);
    if (storedToken) {
      MCP_SERVERS[serverId].token = storedToken;
      // Check auth status instead of just connecting
      checkAuthStatus(serverId);
    }
  });

  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
  });

  // Send on Enter (Shift+Enter for new line)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});

// Connect to server
function connectServer(serverId) {
  const server = MCP_SERVERS[serverId];
  if (!server) return;

  updateServerStatus(serverId, 'connecting');

  // Store which server we're authenticating (used on callback)
  localStorage.setItem('mcp_auth_pending', serverId);

  // Use clean redirect URL without query params
  const redirectUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');

  // Open OAuth popup
  const authUrl = `${server.baseUrl}${server.authUrl}?redirect_uri=${encodeURIComponent(redirectUrl)}`;
  const popup = window.open(authUrl, 'oauth', 'width=600,height=700');

  // Check for popup close
  const checkPopup = setInterval(() => {
    if (popup && popup.closed) {
      clearInterval(checkPopup);
      // Check auth status after popup closes
      setTimeout(() => {
        const pendingServer = localStorage.getItem('mcp_auth_pending');
        if (pendingServer) {
          checkAuthStatus(pendingServer);
          localStorage.removeItem('mcp_auth_pending');
        }
      }, 500);
    }
  }, 500);
}

// Check if we can connect with stored token by trying to fetch tools
async function checkAuthStatus(serverId) {
  const server = MCP_SERVERS[serverId];
  if (!server || !server.token) return;

  try {
    updateServerStatus(serverId, 'connecting');

    // Try to fetch tools to verify connection works
    const response = await fetch(`/api/tools/${serverId}`, {
      headers: {
        'Authorization': `Bearer ${server.token}`
      }
    });
    const data = await response.json();

    if (data.tools && data.tools.length > 0) {
      server.tools = data.tools;
      server.connected = true;
      updateServerStatus(serverId, 'connected');
      updateConnectedCount();
      updateChatInput();
      addSystemMessage(`Reconnected to ${server.name} with ${server.tools.length} tools available.`);
    } else {
      // Token might be expired
      // Don't auto-remove per user request in similar apps, but here we can be checking validity
      // Let's assume invalid for now if tools fetch fails
      console.warn(`Token validation failed for ${serverId}`);
      localStorage.removeItem(`mcp_token_${serverId}`);
      server.token = null;
      updateServerStatus(serverId, 'disconnected');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem(`mcp_token_${serverId}`);
    server.token = null;
    updateServerStatus(serverId, 'disconnected');
  }
}

// Handle OAuth callback - trust the token and connect
async function handleOAuthCallback(serverId, token) {
  const server = MCP_SERVERS[serverId];
  if (!server) return;

  server.token = token;
  localStorage.setItem(`mcp_token_${serverId}`, token);

  updateServerStatus(serverId, 'connecting');
  addSystemMessage(`Successfully authenticated with ${server.name}!`);

  // Mark as connected and fetch tools
  server.connected = true;
  updateServerStatus(serverId, 'connected');
  updateConnectedCount();
  updateChatInput();

  // Fetch available tools via backend proxy
  await fetchServerTools(serverId);
}

// Fetch available tools from server via backend proxy
async function fetchServerTools(serverId) {
  const server = MCP_SERVERS[serverId];
  if (!server) return;

  try {
    const response = await fetch(`/api/tools/${serverId}`, {
      headers: {
        ...(server.token ? { 'Authorization': `Bearer ${server.token}` } : {})
      }
    });

    const data = await response.json();
    if (data.tools && data.tools.length > 0) {
      server.tools = data.tools;
      console.log(`Tools available for ${serverId}:`, server.tools.map(t => t.name));
      addSystemMessage(`${server.name} connected with ${server.tools.length} tools available. You can now chat naturally!`);
    } else {
      addSystemMessage(`${server.name} connected. No tools discovered.`);
    }
  } catch (error) {
    console.error(`Failed to fetch tools for ${serverId}:`, error);
    addSystemMessage(`${server.name} connected but tool discovery failed.`);
  }
}

// Disconnect from server
function disconnectServer(serverId) {
  const server = MCP_SERVERS[serverId];
  if (!server) return;

  localStorage.removeItem(`mcp_token_${serverId}`);
  server.token = null;
  server.connected = false;
  server.tools = [];
  
  updateServerStatus(serverId, 'disconnected');
  updateConnectedCount();
  updateChatInput();
  addSystemMessage(`Disconnected from ${server.name}.`);
}

// UI Updates
function updateServerStatus(serverId, status) {
  const card = document.querySelector(`.server-card[data-server="${serverId}"]`);
  if (!card) return;

  const statusBadge = card.querySelector('.status-badge');
  const statusText = card.querySelector('.status-text');
  const btn = card.querySelector('.connect-btn');

  // Reset classes
  statusBadge.className = 'status-badge';
  statusBadge.classList.add(status);
  
  if (status === 'connected') card.classList.add('connected');
  else card.classList.remove('connected');

  // Update text
  statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);

  // Update button
  if (status === 'connected') {
    btn.textContent = 'Disconnect';
    btn.className = 'connect-btn disconnect';
    btn.onclick = () => disconnectServer(serverId);
  } else if (status === 'connecting') {
    btn.textContent = 'Connecting...';
    btn.className = 'connect-btn connect';
    btn.disabled = true;
  } else {
    btn.textContent = 'Connect';
    btn.className = 'connect-btn connect';
    btn.disabled = false;
    btn.onclick = () => connectServer(serverId);
  }

  updateServerSelector();
}

function updateConnectedCount() {
  const count = Object.values(MCP_SERVERS).filter(s => s.connected).length;
  connectedCount.textContent = `${count} server${count !== 1 ? 's' : ''} connected`;
}

function updateServerSelector() {
  targetServer.innerHTML = '<option value="">Select a connected server...</option>';
  
  Object.entries(MCP_SERVERS).forEach(([id, server]) => {
    if (server.connected) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = server.name;
      targetServer.appendChild(option);
    }
  });

  // Auto-select if only one
  const connected = Object.keys(MCP_SERVERS).filter(k => MCP_SERVERS[k].connected);
  if (connected.length === 1) {
    targetServer.value = connected[0];
  } else if (connected.length > 0 && !targetServer.value) {
     targetServer.value = connected[0]; // Default to first available
  }
}

function updateChatInput() {
  const anyConnected = Object.values(MCP_SERVERS).some(s => s.connected);
  
  if (anyConnected) {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.placeholder = "Type your request (e.g., 'List my files' or 'Create a form')...";
  } else {
    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatInput.placeholder = "Connect to a server to start chatting...";
  }
}

// Chat Functions
async function sendMessage() {
  const message = chatInput.value.trim();
  const serverId = targetServer.value;
  
  if (!message) return;
  if (!serverId) {
    addSystemMessage('Please select a server to send the message to.');
    return;
  }

  // UI Updates
  chatInput.value = '';
  chatInput.style.height = 'auto';
  addMessage(message, 'user');
  
  // Create assistant placeholder
  const placeholderId = addMessage('Thinking...', 'assistant', true);

  try {
    const server = MCP_SERVERS[serverId];
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${server.token}`
      },
      body: JSON.stringify({
        message,
        serverId,
        conversationHistory
      })
    });

    const data = await response.json();
    
    // Remove placeholder
    document.getElementById(placeholderId)?.remove();

    if (data.error) {
      addMessage(`Error: ${data.message}`, 'error');
      return;
    }

    // Add interactions to history locally (simplified)
    conversationHistory.push({ role: 'user', content: message });
    conversationHistory.push({ role: 'assistant', content: data.response });

    // Show tool calls if any
    if (data.toolCalls && data.toolCalls.length > 0) {
      const toolInfo = data.toolCalls.map((tc, i) => 
        `🛠 Used tool: **${tc.name}**\nResult:\n\`\`\`json\n${data.toolResults[i]}\n\`\`\``
      ).join('\n\n');
      
      // Combine tool info with response or show separate?
      // Let's show response first, then tool info nicely formatted
      addMessage(data.response, 'assistant');
      // Optional: show tool usage detail
      // addMessage(toolInfo, 'system'); 
    } else {
      addMessage(data.response, 'assistant');
    }

  } catch (error) {
    document.getElementById(placeholderId)?.remove();
    console.error('Chat error:', error);
    addMessage('Failed to send message. Please check console.', 'error');
  }
}

function addMessage(content, type, isPlaceholder = false) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  div.id = id;

  if (type === 'user' || type === 'system' || type === 'error') {
    div.textContent = content; // Simple text for user/system
  } else {
    // Render Markdown for assistant
    div.innerHTML = `<div class="message-content">${marked.parse(content)}</div>`;
    
    // Formatting meta info if needed
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    meta.textContent = type === 'assistant' ? `AI Assistant • ${time}` : time;
    div.appendChild(meta);
  }

  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return id;
}

function addSystemMessage(text) {
  addMessage(text, 'system');
}
