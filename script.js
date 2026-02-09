// Визначаємо, чи це Telegram Mini App
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
    
    // Функція збереження стану
    const saveCheckboxes = () => {
        const state = {};
        otherCheckboxes.forEach(cb => {
            state[cb.id] = cb.checked;
        });
        state.all = allCheckbox.checked;
        localStorage.setItem(CHECKBOX_STORAGE_KEY, JSON.stringify(state));
    };
    
    // Функція відновлення стану
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
    
    // При завантаженні — відновлюємо
    restoreCheckboxes();
    
    // При зміні — зберігаємо
    allCheckbox.addEventListener('change', saveCheckboxes);
    otherCheckboxes.forEach(cb => {
        cb.addEventListener('change', saveCheckboxes);
    });

    // ─── Очищення форми ─────────────────────────────────────────────    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            form.reset();
            field4.value = '';
            resultText.innerHTML = '';
            localStorage.removeItem(CHECKBOX_STORAGE_KEY); // ← додаємо це
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

    
    // Новий обробник для промокодів
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('promo-code')) {
            const promoText = e.target.textContent.trim(); // беремо текст промокоду

            navigator.clipboard.writeText(promoText).then(() => {
                // Показуємо повідомлення прямо в resultText
                resultText.innerHTML += '<br><small style="color:#FF0000; font-style:italic;">Промокод скопійовано!</small>';
            }).catch(err => {
                console.error('Помилка копіювання:', err);
                resultText.innerHTML += '<br><small style="color:#ff5555;">Не вдалося скопіювати</small>';
            });

            // Опціонально: візуальний фідбек (наприклад, підсвітка)
            e.target.style.background = 'rgba(0,255,136,0.3)';
            setTimeout(() => { e.target.style.background = ''; }, 500);
        }
    });

    // ─── Кнопка COUPONS ──────────────────────────────────────────────────
    document.querySelector('.coupons-btn')?.addEventListener('click', async () => {
        try {
            resultText.innerHTML = '<span class="loading-text">Завантаження промокодів...</span>';
            resultText.style.color = '#00ff88';
    
            // Отримуємо user_id з Telegram WebApp (якщо є)
            const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0;
    
            const response = await fetch(`https://lexxexpress.click/pedro/coupons?user_id=${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
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
                // Додаємо атрибут, щоб стилі з CSS застосувалися саме сюди
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
    // ─── Кнопка WEB — перехід на повну версію сайту ────────────────────────
    document.querySelector('.web-btn')?.addEventListener('click', () => {
        window.open('https://pedroapp.lexxexpress.click', '_blank');
        // або window.location.href = 'https://pedroapp.lexxexpress.click'; — якщо хочеш відкрити в тому ж вікні
    });
    // ─── Кнопка FEEDBACK — написати адміністрації ────────────────────────
    document.querySelector('.feedback-btn')?.addEventListener('click', () => {
        window.open('https://t.me/EarlyBirdDeals_bot', '_blank');
        // або window.location.href = 'https://t.me/EarlyBirdDeals_bot'; — якщо хочеш відкрити в тому ж вікні
    });
    // ─── Функція відправки форми (використовується і з кнопки, і з Enter) ──
    const sendForm = async () => {
        let link = field4.value.trim();
    
        // Якщо поле порожнє — намагаємося взяти з буфера
        if (!link) {
            try {
                link = await navigator.clipboard.readText();
                link = link.trim();
                if (link && (link.includes('aliexpress.com') || link.includes('s.click.aliexpress.com'))) {
                    field4.value = link;
                    console.log('Автоматично вставлено з буфера:', link);
                    resultText.innerHTML = 'Посилання вставлено з буфера!<br>Обробка...';
                    resultText.style.color = '#00ff88';
                } else {
                    resultText.innerHTML = 'У буфері немає валідного посилання з AliExpress.<br>Вставте вручну.';
                    resultText.style.color = 'orange';
                    return;
                }
            } catch (err) {
                resultText.innerHTML = '<b>Не вдалося прочитати буфер обміну.</b><br>Вставте посилання вручну в поле "Посилання на товар" і натисніть INSERT AND START.';
                resultText.style.color = '#DC143C';
                submitBtn.style.background = 'linear-gradient(to bottom, #ffcc00, #ff9900)';
                submitBtn.style.boxShadow = '0 0 15px rgba(255,204,0,0.6)';
                setTimeout(() => {
                    submitBtn.style.background = '';
                    submitBtn.style.boxShadow = '';
                }, 3000);
                return;
            }
        }
    
        // Перевірка валідності
        if (!link.includes('aliexpress.com') && !link.includes('s.click.aliexpress.com')) {
            resultText.innerHTML = 'Це не посилання AliExpress';
            resultText.style.color = 'red';
            return;
        }
    
        // Збираємо стан чекбоксів
        const sections = [];
        if (document.getElementById('all')?.checked) {
            sections.push('all');
        } else {
            if (document.getElementById('coins')?.checked) sections.push('coins');
            if (document.getElementById('crystal')?.checked) sections.push('crystal');
            if (document.getElementById('prizeland')?.checked) sections.push('prizeland');
            if (document.getElementById('complect')?.checked) sections.push('complect');
            if (document.getElementById('bestsellers')?.checked) sections.push('bestsellers');
        }
    
        // Якщо жоден не вибраний — показуємо помилку
        if (sections.length === 0) {
            resultText.innerHTML = 'Оберіть хоча б один розділ (ALL, COINS, CRYSTALS або PRIZE LAND)';
            resultText.style.color = 'red';
            return;
        }
    
        // Запускаємо обробку
        submitBtn.disabled = true;
        submitBtn.textContent = 'Обробка...';
        resultText.innerHTML = '<span class="loading-text">Зачекайте...</span>';
    
        try {
            const response = await fetch('https://lexxexpress.click/pedro/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    link: link,
                    sections: sections  // передаємо масив вибраних розділів
                })
            });
    
            if (!response.ok) {
                throw new Error(`Помилка: ${response.status}`);
            }
    
            const data = await response.json();
    
            if (data.success) {
                let html = '';
                if (data.image_url) {
                    html += `<img src="${data.image_url}" alt="Товар" style="max-width: 90px; height: auto; border-radius: 12px; margin: 0 auto 12px; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">`;
                }
                html += data.result || 'Готово!';
                resultText.innerHTML = html;
                resultText.style.color = 'inherit';
                field4.value = '';
                field4.readOnly = false;
            } else {
                resultText.innerHTML = data.error || 'Помилка на сервері';
                resultText.style.color = 'red';
            }
        } catch (err) {
            resultText.innerHTML = 'Помилка з’єднання з сервером';
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

    // ─── Обробка кліку по кнопці (основний шлях) ─────────────────────
    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await sendForm();
        });
    }

    // ─── Enter в полі field4 також відправляє ────────────────────────
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
            const yOffset = -75; // негативне значення — опускаємо на 80 px
            const y = instructionsElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
    
            window.scrollTo({
                top: y,
                behavior: 'smooth'
            });
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
