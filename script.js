Відкривав з веб сторінки сафарі
2026-02-15 01:10:45 — GET_COUPONS
User Name: Без імені, Username: @немає, User ID: 0
Джерело: 📱 Mini App
Details: Користувач відкрив промокоди
// Визначаємо, чи це Telegram Mini App
const isWebVersion = !window.Telegram?.WebApp?.initDataUnsafe; // якщо Telegram.WebApp відсутній — це веб-версія
const isTelegramMiniApp = !!window.Telegram?.WebApp;
// Приклад використання — додаємо клас до body
if (isTelegramMiniApp) {
    document.body.classList.add('in-telegram');
  
    // Отримуємо safe-area від Telegram WebApp (якщо доступно)
    const safeTop = window.Telegram.WebApp.safeAreaInset?.top || 0;
    document.documentElement.style.setProperty('--tg-safe-area-top', safeTop + 'px');
  
    // Розгортаємо Mini App на весь екран
    window.Telegram.WebApp.expand();
} else {
    document.body.classList.add('in-browser');
}
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('telegramForm');
    const submitBtn = document.querySelector('.submit-btn');
    const field4 = document.getElementById('field4');
    const resultText = document.getElementById('resultText');
    const clearBtn = document.querySelector('.clear-btn');
    const themeToggle = document.getElementById('themeToggle');
    // Логування
    const addLog = (msg, data = {}) => console.log(`${msg}:`, data);
    // ─── Логіка чекбокса ALL ────────────────────────────────────────
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
    // ─── Збереження стану чекбоксів у localStorage ────────────────────────
    const CHECKBOX_STORAGE_KEY = 'pedro_checkboxes_state';
  
    const saveCheckboxes = () => {
        const state = {};
        otherCheckboxes.forEach(cb => {
            state[cb.id] = cb.checked;
        });
        state.all = allCheckbox.checked;
        localStorage.setItem(CHECKBOX_STORAGE_KEY, JSON.stringify(state));
    };
  
    const restoreCheckboxes = () => {
        const saved = localStorage.getItem(CHECKBOX_STORAGE_KEY);
        if (saved) {
            const state = JSON.parse(saved);
            otherCheckboxes.forEach(cb => {
                if (state[cb.id] !== undefined) {
                    cb.checked = state[cb.id];
                }
            });
            const allChecked = Array.from(otherCheckboxes).every(c => c.checked);
            allCheckbox.checked = allChecked;
        }
    };
  
    restoreCheckboxes();
    allCheckbox.addEventListener('change', saveCheckboxes);
    otherCheckboxes.forEach(cb => cb.addEventListener('change', saveCheckboxes));
    // ─── Очищення форми ─────────────────────────────────────────────
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            form.reset();
            field4.value = '';
            resultText.innerHTML = '';
            localStorage.removeItem(CHECKBOX_STORAGE_KEY);
            addLog('Форма та чекбокси очищені');
        });
    }
    // ─── Перемикання теми ───────────────────────────────────────────
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
    // ─── Новий обробник для промокодів ──────────────────────────────────
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
    // ─── Кнопка COUPONS ──────────────────────────────────────────────────
    document.querySelector('.coupons-btn')?.addEventListener('click', async () => {
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
                    source: isTelegramMiniApp ? 'MINI_APP' : 'WEB' // ← додаємо джерело
                })
            });
            if (!response.ok) {
                throw new Error(`Помилка: ${response.status}`);
            }
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
    // ─── Кнопка WEB / FEEDBACK — без логування (не критичні дії) ──────
    document.querySelector('.web-btn')?.addEventListener('click', () => {
        window.open('https://pedroapp.lexxexpress.click', '_blank');
    });
    document.querySelector('.feedback-btn')?.addEventListener('click', () => {
        window.open('https://t.me/EarlyBirdDeals_bot', '_blank');
    });
    // ─── Функція відправки форми ────────────────────────────────────────
    const sendForm = async () => {
        let inputValue = field4.value.trim();
        if (!inputValue) {
            try {
                inputValue = await navigator.clipboard.readText();
                inputValue = inputValue.trim();
                field4.value = inputValue;
                if (inputValue.includes('aliexpress.com') || inputValue.includes('s.click.aliexpress.com')) {
                    console.log('Автоматично вставлено посилання з буфера:', inputValue);
                    resultText.innerHTML = 'Посилання вставлено з буфера!<br>Обробка...';
                    resultText.style.color = '#00ff88';
                } else if (/^[A-Za-z0-9-]{10,35}$/.test(inputValue)) {
                    console.log('Автоматично вставлено трек-номер з буфера:', inputValue);
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
        const tg = window.Telegram?.WebApp;
        const tgUser = tg?.initDataUnsafe?.user || {};
        const userData = {
            user_id: tgUser.id || 0,
            user_name: tgUser.first_name || (tgUser.last_name ? `${tgUser.first_name} ${tgUser.last_name}` : 'Без імені'),
            username: tgUser.username ? `@${tgUser.username}` : 'немає',
            source: isTelegramMiniApp ? 'MINI_APP' : 'WEB' // ← додаємо джерело
        };
        submitBtn.disabled = true;
        submitBtn.textContent = 'Обробка...';
        resultText.innerHTML = '<span class="loading-text">Завантаження...</span>';
        try {
            if (isTrackNumber) {
                const trackUrl = `https://global.cainiao.com/detail.htm?lang=en-US&mailNoList=${encodeURIComponent(inputValue)}`;
                let html = `
                    <b>Статус відправлення (Cainiao)</b><br><br>
                    <iframe src="${trackUrl}" style="
                        width: 100%;
                        height: 800px;
                        border: none;
                        border-radius: 12px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                        background: #ffffff;
                    " allowfullscreen></iframe>
                    <br><br>
                    <small style="color:#aaa; font-style:italic;">
                        Повна інформація з офіційного сайту Cainiao.<br>
                        Якщо сторінка не завантажилася — перевірте трек за посиланням.
                    </small>
                `;
                resultText.innerHTML = html;
                resultText.style.color = 'inherit';
            } else {
                let endpoint = 'https://lexxexpress.click/pedro/submit';
                let payload = { link: inputValue, ...userData };
                payload.sections = sections;
                console.log('Запит на ОБРОБКУ ПОСИЛАННЯ:', JSON.stringify(payload));
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                console.log('Статус відповіді:', response.status, response.statusText);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.log('Помилка сервера:', errorText);
                    throw new Error(`Помилка сервера: ${response.status} — ${errorText}`);
                }
                const data = await response.json();
                if (data.success) {
                    let html = '';
                    if (data.image_url) {
                        html += `<img src="${data.image_url}" alt="Зображення" class="product-image">`;
                    }
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
    // ─── Обробка submit форми ────────────────────────────────────────
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await sendForm();
        });
    }
    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await sendForm();
        });
    }
    if (field4) {
        field4.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendForm();
            }
        });
    }
    // ─── Інші обробники ──────────────────────────────────────────────
    document.querySelector('.instruction-btn')?.addEventListener('click', () => {
        const instructionsElement = document.getElementById('instructions');
        if (instructionsElement) {
            const yOffset = -75;
            const y = instructionsElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    });
    window.scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('scroll', () => {
        const btn = document.querySelector('.scroll-top-btn');
        if (btn) btn.style.display = window.scrollY > 300 ? 'block' : 'none';
    });
    console.log("Скрипт Педро завантажився");
});
