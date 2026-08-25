// === 1. ГЕНЕРАЦІЯ / ОТРИМАННЯ ПОСТІЙНОГО UUID ===
const getUserUUID = () => {
    const STORAGE_KEY = 'pedro_user_uuid';
    let uuid = localStorage.getItem(STORAGE_KEY);

    if (!uuid) {
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem(STORAGE_KEY, uuid);
    }
    return uuid;
};

const userUUID = getUserUUID();

// === 2. ВИЗНАЧЕННЯ СЕРЕДОВИЩА ТЕЛЕГРАМ ===
const tg = window.Telegram?.WebApp;
const isTelegramMiniApp = tg && 
                          tg.initData && 
                          tg.initDataUnsafe && 
                          tg.initDataUnsafe.user && 
                          tg.platform && 
                          ['ios', 'android', 'macos', 'windows'].includes(tg.platform);

const isWebVersion = !isTelegramMiniApp;

if (isTelegramMiniApp) {
    document.body.classList.add('in-telegram');
    const safeTop = tg.safeAreaInset?.top || 0;
    document.documentElement.style.setProperty('--tg-safe-area-top', safeTop + 'px');
    tg.expand();
} else {
    document.body.classList.add('in-browser');
}

// Інформація про пристрій
const deviceInfo = {
    screen: `${window.innerWidth}×${window.innerHeight}`,
    userAgent: navigator.userAgent,
    language: navigator.language || navigator.userLanguage || 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    isMobile: /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent),
    platform: navigator.platform || 'unknown'
};

const miniAppInfo = isTelegramMiniApp ? {
    premium: tg.initDataUnsafe.user.is_premium || false,
    language_code: tg.initDataUnsafe.user.language_code || 'unknown',
    tg_platform: tg.platform || 'unknown',
    tg_version: tg.version || 'unknown'
} : null;

// === 3. МОДУЛЬ TELEGRAM-ЧАТУ ТА ЗВОРОТНОГО ЗВ'ЯЗКУ ===
const CHAT_STORAGE_KEY = `pedro_chat_history_${userUUID}`;
const CONTACT_STORAGE_KEY = 'pedro_saved_contact';

function getLocalMessages() {
    try {
        return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveLocalMessage(sender, text, time = null) {
    const messages = getLocalMessages();
    messages.push({
        sender,
        text,
        time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
}

function renderChatMessages(container) {
    const messages = getLocalMessages();
    container.innerHTML = '';

    if (messages.length === 0) {
        container.innerHTML = `
            <div style="display: flex; justify-content: center; margin: 12px 0;">
                <span style="background: rgba(0,0,0,0.35); color: #8e8e93; font-size: 12px; padding: 4px 12px; border-radius: 12px; backdrop-filter: blur(4px);">
                    Повідомлення захищені та надходять напряму в підтримку
                </span>
            </div>
        `;
        return;
    }

    messages.forEach(msg => {
        const isUser = msg.sender === 'user';
        const msgWrapper = document.createElement('div');
        msgWrapper.style.cssText = `
            display: flex;
            justify-content: ${isUser ? 'flex-end' : 'flex-start'};
            margin-bottom: 6px;
        `;

        const bubble = document.createElement('div');
        bubble.style.cssText = `
            max-width: 78%;
            padding: 7px 11px 5px 12px;
            border-radius: ${isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px'};
            background: ${isUser ? '#2b5278' : '#182533'};
            color: #ffffff;
            font-size: 14px;
            line-height: 1.35;
            word-break: break-word;
            box-shadow: 0 1px 2px rgba(0,0,0,0.25);
            display: flex;
            flex-direction: column;
            position: relative;
        `;

        const textSpan = document.createElement('span');
        textSpan.textContent = msg.text;

        const metaSpan = document.createElement('div');
        metaSpan.style.cssText = `
            font-size: 10px;
            color: ${isUser ? '#6c9ecc' : '#708499'};
            align-self: flex-end;
            margin-top: 2px;
            display: flex;
            align-items: center;
            gap: 3px;
        `;
        metaSpan.innerHTML = `${msg.time} ${isUser ? '<span style="font-size: 11px;">✓✓</span>' : ''}`;

        bubble.appendChild(textSpan);
        bubble.appendChild(metaSpan);
        msgWrapper.appendChild(bubble);
        container.appendChild(msgWrapper);
    });

    container.scrollTop = container.scrollHeight;
}

// Запит на сервер (тихий режим, без спаму в консоль при 404)
async function fetchServerReplies(chatContainer) {
    if (!chatContainer) return;
    try {
        const response = await fetch(`https://lexxexpress.click/pedro/chat/history?uuid=${userUUID}`);
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.success && Array.isArray(data.messages)) {
            const currentSaved = localStorage.getItem(CHAT_STORAGE_KEY);
            const incoming = JSON.stringify(data.messages);
            
            // Якщо на сервері з'явилися нові відповіді — оновлюємо локально та перемальовуємо
            if (currentSaved !== incoming) {
                localStorage.setItem(CHAT_STORAGE_KEY, incoming);
                renderChatMessages(chatContainer);
            }
        }
    } catch (e) {
        // При помилці мережі не перериваємо роботу
    }
}

// Змінна для збереження таймера опитування
let chatPollInterval = null;

function openFeedbackModal() {
    let modal = document.getElementById('pedroFeedbackModal');
    
    if (modal) {
        modal.style.display = 'flex';
        const chatBox = modal.querySelector('#chatMessagesContainer');
        renderChatMessages(chatBox);
        fetchServerReplies(chatBox);
        
        // Запускаємо опитування при повторному відкритті вікна
        if (!chatPollInterval) {
            chatPollInterval = setInterval(() => {
                if (modal.style.display !== 'none') {
                    fetchServerReplies(chatBox);
                }
            }, 3000); // Перевірка кожні 3 секунди
        }
        return;
    }

    modal = document.createElement('div');
    modal.id = 'pedroFeedbackModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.65); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(5px); padding: 12px; box-sizing: border-box;
    `;

    const tgUser = tg?.initDataUnsafe?.user;
    const tgFullName = tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : '';
    const tgUsername = tgUser?.username ? `@${tgUser.username}` : (tgUser?.id ? `ID: ${tgUser.id}` : '');
    const savedContact = localStorage.getItem(CONTACT_STORAGE_KEY) || tgUsername || '';

    modal.innerHTML = `
        <div style="background: #0f1621; color: #ffffff; border-radius: 16px; max-width: 420px; width: 100%; height: 580px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 16px 36px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.08); position: relative; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            
            <div style="background: #17212b; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.3);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="https://raw.githubusercontent.com/DiscountsFromAli/X-CUBOT/main/images/pedro.jpeg" alt="Pedro" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; box-shadow: 0 2px 6px rgba(0,0,0,0.3); flex-shrink: 0; display: block;">
                    <div>
                        <div style="font-weight: 600; font-size: 15px; color: #f5f5f5;">Підтримка Педро</div>
                        <div style="font-size: 12px; color: #00ff88; display: flex; align-items: center; gap: 4px;">
                            <span style="display: inline-block; width: 6px; height: 6px; background: #00ff88; border-radius: 50%;"></span>
                            онлайн
                        </div>
                    </div>
                </div>
                <button id="closeFeedbackModal" style="background: none; border: none; font-size: 20px; color: #7f8c99; cursor: pointer; padding: 4px 8px; border-radius: 50%;">✕</button>
            </div>

            <div id="chatMessagesContainer" style="flex: 1; overflow-y: auto; padding: 12px; background: #0e1621; display: flex; flex-direction: column;"></div>

            ${!isTelegramMiniApp ? `
            <div style="background: #17212b; padding: 6px 12px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; color: #7f8c99; white-space: nowrap;">Контакт:</span>
                <input type="text" id="feedbackContact" value="${savedContact}" placeholder="@username або email" style="width: 100%; background: transparent; border: none; color: #5288c1; font-size: 12px; outline: none; padding: 2px;">
            </div>
            ` : ''}

            <div style="background: #17212b; padding: 10px 12px; display: flex; align-items: flex-end; gap: 10px; border-top: 1px solid rgba(0,0,0,0.2);">
                <textarea id="feedbackMessage" rows="1" placeholder="Напишіть повідомлення..." style="flex: 1; background: #242f3d; border: none; border-radius: 18px; color: #fff; padding: 10px 14px; font-size: 14px; outline: none; resize: none; max-height: 100px; line-height: 1.3; box-sizing: border-box;"></textarea>
                <button id="sendFeedbackBtn" style="width: 38px; height: 38px; border-radius: 50%; background: #5288c1; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; transition: background 0.2s;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
            
            <div id="feedbackStatus" style="font-size: 11px; background: #17212b; min-height: 0px; text-align: center; color: #8e8e93;"></div>
        </div>
    `;

    document.body.appendChild(modal);

    const chatBox = modal.querySelector('#chatMessagesContainer');
    const closeModal = () => { 
        modal.style.display = 'none'; 
        if (chatPollInterval) {
            clearInterval(chatPollInterval);
            chatPollInterval = null;
        }
    };
    modal.querySelector('#closeFeedbackModal').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    renderChatMessages(chatBox);
    fetchServerReplies(chatBox);

    // Фонове оновлення кожні 3 секунди
    if (!chatPollInterval) {
        chatPollInterval = setInterval(() => {
            if (modal.style.display !== 'none') {
                fetchServerReplies(chatBox);
            }
        }, 3000);
    }

    const handleSend = async () => {
        const textInput = modal.querySelector('#feedbackMessage');
        const text = textInput.value.trim();
        const status = modal.querySelector('#feedbackStatus');
        const sendBtn = modal.querySelector('#sendFeedbackBtn');

        if (!text) return;

        saveLocalMessage('user', text);
        renderChatMessages(chatBox);
        textInput.value = '';

        let contact = '';
        if (isTelegramMiniApp) {
            contact = tgUser?.username ? `@${tgUser.username}` : (tgUser?.id ? `ID: ${tgUser.id}` : 'Telegram Mini App');
        } else {
            const contactInput = modal.querySelector('#feedbackContact');
            contact = contactInput ? contactInput.value.trim() : savedContact;
            if (contact) localStorage.setItem(CONTACT_STORAGE_KEY, contact);
        }

        const resolvedUserName = tgFullName || (tgUser?.first_name ? tgUser.first_name : `Гість #${userUUID.slice(-4)}`);
        const resolvedUsername = tgUser?.username ? `@${tgUser.username}` : (contact ? contact : 'немає');

        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.5';

        const payload = {
            message: text,
            contact: contact,
            user_id: tgUser?.id || 0,
            user_name: resolvedUserName,
            username: resolvedUsername,
            source: isTelegramMiniApp ? 'MINI_APP' : 'WEB',
            device: deviceInfo,
            mini_app: miniAppInfo,
            uuid: userUUID
        };

        try {
            await fetch('https://lexxexpress.click/pedro/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            // Одразу синхронізуємо чат після відправки
            setTimeout(() => fetchServerReplies(chatBox), 500);
        } catch (err) {
            console.error('Feedback send error:', err);
        } finally {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
        }
    };

    modal.querySelector('#sendFeedbackBtn').onclick = handleSend;
    modal.querySelector('#feedbackMessage').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
}

// === 4. ІНІЦІАЛІЗАЦІЯ ВСІХ КНОПОК ===
function initButtons() {
    document.querySelector('.instruction-btn')?.addEventListener('click', () => {
        window.location.href = 'howto.html';
    });

    document.querySelector('.history-btn')?.addEventListener('click', () => {
        window.location.href = 'history.html';
    });

    document.querySelector('.coins-btn')?.addEventListener('click', () => {
        window.location.href = 'coins.html';
    });

    document.querySelector('.coupones-btn')?.addEventListener('click', () => {
        window.location.href = 'coupones.html';
    });

    // Підключення кнопки ЗВ'ЯЗОК / FEEDBACK
    document.querySelectorAll('.contact-btn, .feedback-btn, .connect-btn, [data-action="contact"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openFeedbackModal();
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtons);
} else {
    initButtons();
}

// === 5. ОСНОВНИЙ ФУНКЦІОНАЛ СТОРІНКИ ===
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('telegramForm');
    const submitBtn = document.querySelector('.submit-btn');
    const field4 = document.getElementById('field4');
    const resultText = document.getElementById('resultText');
    const clearBtn = document.querySelector('.clear-btn');
    const themeToggle = document.getElementById('themeToggle');

    const addLog = (msg, data = {}) => console.log(`${msg}:`, data);

    // Акордеон для інструкцій
    const instructionsHeader = document.getElementById('instructions');
    const instructionsContent = document.getElementById('instructionsContent');
    
    [instructionsHeader, instructionsContent].forEach(element => {
        element?.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') return;
            instructionsContent.classList.toggle('active');
            instructionsHeader.classList.toggle('active');
        });
    });

    // Логіка чекбоксів
    const allCheckbox = document.getElementById('all');
    const otherCheckboxes = document.querySelectorAll('input[name="check"]:not(#all)');
    if (allCheckbox) {
        allCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            otherCheckboxes.forEach(cb => cb.checked = isChecked);
        });
    }
    otherCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const allChecked = Array.from(otherCheckboxes).every(c => c.checked);
            allCheckbox.checked = allChecked;
        });
    });

    const CHECKBOX_STORAGE_KEY = 'pedro_checkboxes_state';
  
    const saveCheckboxes = () => {
        const state = {};
        otherCheckboxes.forEach(cb => { state[cb.id] = cb.checked; });
        state.all = allCheckbox.checked;
        localStorage.setItem(CHECKBOX_STORAGE_KEY, JSON.stringify(state));
    };
  
    const restoreCheckboxes = () => {
        const saved = localStorage.getItem(CHECKBOX_STORAGE_KEY);
        if (saved) {
            const state = JSON.parse(saved);
            otherCheckboxes.forEach(cb => {
                if (state[cb.id] !== undefined) cb.checked = state[cb.id];
            });
            const allChecked = Array.from(otherCheckboxes).every(c => c.checked);
            allCheckbox.checked = allChecked;
        }
    };
  
    restoreCheckboxes();
    allCheckbox?.addEventListener('change', saveCheckboxes);
    otherCheckboxes.forEach(cb => cb.addEventListener('change', saveCheckboxes));

    // Очищення форми
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            form.reset();
            field4.value = '';
            resultText.innerHTML = '';
            localStorage.removeItem(CHECKBOX_STORAGE_KEY);
            addLog('Форма та чекбокси очищені');
        });
    }

    // Перемикання теми
    if (themeToggle) {
        const saved = localStorage.getItem('theme') || 'dark';
        document.body.classList.toggle('light-theme', saved === 'light');
        document.body.classList.toggle('dark-theme', saved !== 'light');
        themeToggle.checked = saved === 'light';
        themeToggle.addEventListener('change', () => {
            const isLight = themeToggle.checked;
            document.body.classList.toggle('light-theme', isLight);
            document.body.classList.toggle('dark-theme', !isLight);
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            document.querySelector('.theme-label-moon')?.classList.toggle('active', !isLight);
            document.querySelector('.theme-label-sun')?.classList.toggle('active', isLight);
            addLog('Тема змінена', { theme: isLight ? 'light' : 'dark' });
        });
    }

    // Копіювання промокоду
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('promo-code')) {
            const promoText = e.target.textContent.trim();
            navigator.clipboard.writeText(promoText).then(() => {
                resultText.innerHTML += '<br><small style="color:#FF0000; font-style:italic;">Промокод скопійовано!</small>';
            }).catch(err => {
                console.error('Помилка копіювання:', err);
                resultText.innerHTML += '<br><small style="color:#ff5555;">Не вдалося скопіювати</small>';
            });
            e.target.style.background = 'rgba(0,255,136,0.3)';
            setTimeout(() => { e.target.style.background = ''; }, 500);
        }
    });

    // Кнопка COUPONS
    document.querySelector('.coupons-btn')?.addEventListener('click', async () => {
        console.log('Кнопка COUPONS натиснута! Час:', new Date().toISOString());
        try {
            resultText.innerHTML = '<span class="loading-text">Завантаження промокодів...</span>';
            resultText.style.color = '#00ff88';
            const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0;
            const userName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Без імені';
            const userUsername = window.Telegram?.WebApp?.initDataUnsafe?.user?.username
                ? `@${window.Telegram.WebApp.initDataUnsafe.user.username}`
                : 'немає';
            const response = await fetch('https://lexxexpress.click/pedro/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: userId,
                  user_name: userName,
                  username: userUsername,
                  source: isTelegramMiniApp ? 'MINI_APP' : 'WEB',
                  device: deviceInfo,
                  mini_app: miniAppInfo,
                  uuid: userUUID
              })
            });
            if (!response.ok) throw new Error(`Помилка: ${response.status}`);
            const data = await response.json();
            if (data.success) {
                let html = '<b>Актуальні промокоди та акції:</b><br><br>';
                html += data.text.replace(/\n/g, '<br>');
                resultText.innerHTML = html;
                resultText.style.color = 'inherit';
                resultText.setAttribute('data-coupons-loaded', 'true');
            } else {
                resultText.innerHTML = data.error || 'Не вдалося завантажити промокоди';
                resultText.style.color = 'red';
            }
        } catch (err) {
            resultText.innerHTML = 'Помилка з’єднання з сервером';
            resultText.style.color = 'red';
            console.error('Coupons error:', err);
        }
    });

    // Кнопка WEB
    document.querySelector('.web-btn')?.addEventListener('click', () => {
        window.open('https://pedroapp.lexxexpress.click', '_blank');
    });

    // Обробка форми / трекінг
    const sendForm = async () => {
        let inputValue = field4.value.trim();
        if (!inputValue) {
            try {
                inputValue = await navigator.clipboard.readText();
                inputValue = inputValue.trim();
                field4.value = inputValue;
                if (inputValue.includes('aliexpress.com') || inputValue.includes('s.click.aliexpress.com')) {
                    resultText.innerHTML = 'Посилання вставлено з буфера!<br>Обробка...';
                    resultText.style.color = '#00ff88';
                } else if (/^[A-Za-z0-9-]{10,35}$/.test(inputValue)) {
                    resultText.innerHTML = 'Трек-номер вставлено з буфера!<br>Завантаження трекінгу...';
                    resultText.style.color = '#00ff88';
                } else {
                    resultText.innerHTML = 'У буфері немає валідного посилання або трек-номера.<br>Вставте вручну.';
                    resultText.style.color = 'orange';
                    return;
                }
            } catch (err) {
                resultText.innerHTML = '<b>Не вдалося прочитати буфер обміну.</b><br>Вставте посилання або трек-номер вручну.';
                resultText.style.color = '#FF0000';
                submitBtn.style.background = 'linear-gradient(to bottom, #ffcc00, #ff9900)';
                submitBtn.style.boxShadow = '0 0 15px rgba(255,204,0,0.6)';
                setTimeout(() => {
                    submitBtn.style.background = '';
                    submitBtn.style.boxShadow = '';
                }, 3000);
                return;
            }
        }
        const isAliLink = inputValue.includes('aliexpress.com') || inputValue.includes('s.click.aliexpress.com');
        const isTrackNumber = /^[A-Za-z0-9-]{10,35}$/.test(inputValue) && !isAliLink;
        if (!isAliLink && !isTrackNumber) {
            resultText.innerHTML = 'Це не посилання AliExpress і не схоже на трек-номер.';
            resultText.style.color = 'red';
            return;
        }
        const sections = [];
        if (isAliLink) {
            if (document.getElementById('all')?.checked) sections.push('all');
            ['coins', 'crystal', 'prizeland', 'complect', 'bestsellers'].forEach(id => {
                if (document.getElementById(id)?.checked) sections.push(id);
            });
            if (sections.length === 0) {
                resultText.innerHTML = 'Оберіть хоча б один розділ для обробки посилання.';
                resultText.style.color = 'red';
                return;
            }
        }
        const tgUser = tg?.initDataUnsafe?.user || {};
        const userData = {
            user_id: tgUser.id || 0,
            user_name: tgUser.first_name || (tgUser.last_name ? `${tgUser.first_name} ${tgUser.last_name}` : 'Без імені'),
            username: tgUser.username ? `@${tgUser.username}` : 'немає',
            source: isTelegramMiniApp ? 'MINI_APP' : 'WEB',
            device: deviceInfo,
            mini_app: miniAppInfo,
            uuid: userUUID
        };
        submitBtn.disabled = true;
        submitBtn.textContent = 'Обробка...';
        resultText.innerHTML = '<span class="loading-text">Завантаження...</span>';
        try {
            if (isTrackNumber) {
                const trackUrl = `https://global.cainiao.com/detail.htm?lang=en-US&mailNoList=${encodeURIComponent(inputValue)}`;
                const modal = document.createElement('div');
                modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';
            
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '✕';
                closeBtn.style.cssText = 'position:absolute;top:5px;right:15px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:40px;height:40px;font-size:24px;cursor:pointer;z-index:10000;';
                if (isTelegramMiniApp) closeBtn.style.top = '165px';
            
                const iframe = document.createElement('iframe');
                iframe.src = trackUrl;
                iframe.style.cssText = 'width:95%;max-width:1400px;height:100%;border:none;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);background:#ffffff;';
            
                modal.appendChild(closeBtn);
                modal.appendChild(iframe);
                document.body.appendChild(modal);
            
                closeBtn.onclick = () => document.body.removeChild(modal);
                modal.onclick = (e) => { if (e.target === modal) document.body.removeChild(modal); };
            
                resultText.innerHTML = '<span style="color:#FF6347;">Для повторного відстеження посилки по трекеру вставте номер та натисніть "INSERT AND START"</span>';
                resultText.style.color = 'inherit';
            } else {
                let endpoint = 'https://lexxexpress.click/pedro/submit';
                let payload = { link: inputValue, ...userData, sections: sections };
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Помилка сервера: ${response.status} — ${errorText}`);
                }
                const data = await response.json();
                if (data.success) {
                    let html = '';
                    if (data.image_url) html += `<img src="${data.image_url}" alt="Зображення" class="product-image">`;
                    html += data.result || 'Готово!';
                    resultText.innerHTML = html;
                    resultText.style.color = 'inherit';
                } else {
                    resultText.innerHTML = data.error || 'Помилка на сервері';
                    resultText.style.color = 'red';
                }
            }
            field4.value = '';
            field4.readOnly = false;
        } catch (err) {
            resultText.innerHTML = 'Помилка з’єднання або сервер: ' + err.message;
            resultText.style.color = 'red';
            console.error('Fetch error:', err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'INSERT AND START';
        }
    };

    if (form) form.addEventListener('submit', async (e) => { e.preventDefault(); await sendForm(); });
    if (submitBtn) submitBtn.addEventListener('click', async (e) => { e.preventDefault(); await sendForm(); });
    if (field4) {
        field4.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendForm();
            }
        });
    }

    window.scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };
    window.addEventListener('scroll', () => {
        const btn = document.querySelector('.scroll-top-btn');
        if (btn) btn.style.display = window.scrollY > 100 ? 'block' : 'none';
    });

    // Слайдер
    const slider = document.getElementById('slider');
    if (slider) {
        let isPaused = false;
        let slideInterval;
    
        function autoPlay() {
            if (isPaused) return;
            const itemWidth = slider.clientWidth;
            const maxScroll = slider.scrollWidth - itemWidth;
            const currentScroll = slider.scrollLeft;
        
            if (currentScroll >= (maxScroll - itemWidth) - 5 && currentScroll < maxScroll - 5) {
                slider.style.scrollBehavior = 'smooth';
                slider.scrollLeft = maxScroll;
                setTimeout(() => {
                    slider.style.scrollBehavior = 'auto';
                    slider.scrollLeft = 0;
                }, 600); 
            } else {
                slider.style.scrollBehavior = 'smooth';
                slider.scrollBy({ left: itemWidth, behavior: 'smooth' });
            }
        }
    
        slideInterval = setInterval(autoPlay, 3000);
        const stopSlider = () => { isPaused = true; if (slideInterval) clearInterval(slideInterval); };
        const startSlider = () => { isPaused = false; clearInterval(slideInterval); slideInterval = setInterval(autoPlay, 3000); };
    
        slider.addEventListener('touchstart', stopSlider, { passive: true });
        slider.addEventListener('touchend', startSlider, { passive: true });
        slider.addEventListener('mouseenter', stopSlider);
        slider.addEventListener('mouseleave', startSlider);
    }

    console.log("Скрипт Педро завантажився");
});
