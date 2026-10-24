(() => {
    const initializeChat = () => {
        if (window.fitPulseChatInitialized) return;

        const chatButton = document.getElementById('ai-assistant-btn');
        const overlay = document.getElementById('ai-chatbox-overlay');
        const closeButton = document.getElementById('close-ai-chat');
        const form = document.getElementById('ai-chat-form');
        const input = document.getElementById('ai-chat-input');
        const sendButton = document.getElementById('ai-chat-send');
        const messages = document.getElementById('ai-chat-messages');
        const welcome = document.getElementById('ai-chat-welcome');
        if (!form || !input || !sendButton || !messages) return;

        window.fitPulseChatInitialized = true;
        const storageKey = 'fitpulse_chat_history';
        const maxHistory = 40;

        const saveHistory = () => {
            const history = Array.from(messages.querySelectorAll('.ai-msg-user, .ai-msg-bot'))
                .slice(-maxHistory)
                .map(element => ({
                    sender: element.classList.contains('ai-msg-user') ? 'user' : 'model',
                    text: element.textContent || ''
                }));
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(history));
            } catch (error) {
                console.warn('Could not save AI chat history.', error);
            }
        };

        const appendMessage = (text, sender) => {
            const message = document.createElement('div');
            message.className = sender === 'user' ? 'ai-msg-user' : 'ai-msg-bot';
            message.textContent = text;
            messages.appendChild(message);
            messages.scrollTop = messages.scrollHeight;
            saveHistory();
            return message;
        };

        try {
            const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
            if (Array.isArray(saved) && saved.length) {
                messages.innerHTML = '';
                if (welcome) welcome.hidden = true;
                saved.filter(item =>
                    item &&
                    (item.sender === 'user' || item.sender === 'model' || item.sender === 'bot') &&
                    typeof item.text === 'string'
                ).slice(-maxHistory).forEach(item => appendMessage(item.text, item.sender === 'user' ? 'user' : 'model'));
            }
        } catch (error) {
            console.warn('Could not restore AI chat history.', error);
        }

        if (chatButton && overlay && closeButton) {
            const openChat = () => {
                overlay.style.display = 'flex';
                overlay.setAttribute('aria-hidden', 'false');
                input.focus();
            };
            const closeChat = () => {
                overlay.style.display = 'none';
                overlay.setAttribute('aria-hidden', 'true');
                chatButton.focus();
            };

            chatButton.addEventListener('click', event => {
                event.preventDefault();
                openChat();
            });
            closeButton.addEventListener('click', closeChat);
            overlay.addEventListener('click', event => {
                if (event.target === overlay) closeChat();
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && overlay.style.display === 'flex') closeChat();
            });
        }

        const getProfile = () => ({
            name: localStorage.getItem('userName') || 'User',
            age: localStorage.getItem('userAge') || '',
            height: localStorage.getItem('userHeight') || '',
            weight: localStorage.getItem('userWeight') || ''
        });

        const getApiKey = () => {
            const configKey = window.CONFIG?.GEMINI_API_KEY;
            if (configKey && configKey !== 'your_gemini_api_key_here') return configKey;
            const storedKey = localStorage.getItem('GEMINI_API_KEY');
            return storedKey || null;
        };

        const sendMessage = async text => {
            if (welcome) welcome.hidden = true;
            appendMessage(text, 'user');
            input.value = '';
            sendButton.disabled = true;
            const loading = appendMessage('Thinking...', 'model');
            try {
                const history = Array.from(messages.querySelectorAll('.ai-msg-user, .ai-msg-bot'))
                    .filter(element => element !== loading)
                    .slice(-12)
                    .map(element => ({
                        role: element.classList.contains('ai-msg-user') ? 'user' : 'model',
                        text: element.textContent || ''
                    }));
                const apiUrl = new URL('api/chat', document.baseURI);
                let serverError;
                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text, history, userProfile: getProfile() })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (!data.reply) throw new Error(data.error || 'The assistant returned an empty response.');
                        loading.remove();
                        appendMessage(data.reply, 'model');
                        return;
                    }

                    const data = await response.json().catch(() => ({}));
                    serverError = data.error || `AI chat request failed (${response.status}).`;
                    if (response.status !== 404 && !getApiKey()) throw new Error(serverError);
                } catch (error) {
                    if (!(error instanceof TypeError)) throw error;
                }

                const apiKey = getApiKey();
                if (!apiKey) throw new Error(serverError || 'AI chat is not configured. Set GEMINI_API_KEY in the server environment or config.js.');

                const profile = getProfile();
                const profileSummary = [
                    `Name: ${profile.name}`,
                    profile.age ? `Age: ${profile.age}` : null,
                    profile.height ? `Height: ${profile.height} cm` : null,
                    profile.weight ? `Weight: ${profile.weight} kg` : null
                ].filter(Boolean).join(', ');
                const contents = Array.from(messages.querySelectorAll('.ai-msg-user, .ai-msg-bot'))
                    .filter(element => element !== loading)
                    .slice(-12)
                    .map(element => ({
                        role: element.classList.contains('ai-msg-user') ? 'user' : 'model',
                        parts: [{ text: element.textContent || '' }]
                    }));

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{
                                text: `You are FitPulse's fitness assistant. Use this profile to personalize advice when relevant: ${profileSummary}. Give concise, safe, practical fitness guidance. Do not diagnose medical conditions.`
                            }]
                        },
                        contents
                    })
                });
                const data = await response.json();
                const reply = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
                if (!response.ok || !reply) {
                    throw new Error(data.error?.message || 'The assistant could not process that request.');
                }
                loading.remove();
                appendMessage(reply, 'model');
            } catch (error) {
                loading.remove();
                appendMessage(error.message || 'Could not connect to the AI assistant.', 'model');
            } finally {
                sendButton.disabled = false;
            }
        };

        form.addEventListener('submit', event => {
            event.preventDefault();
            const text = input.value.trim();
            if (text) sendMessage(text);
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
        });
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                form.requestSubmit();
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChat, { once: true });
    } else {
        initializeChat();
    }
})();
