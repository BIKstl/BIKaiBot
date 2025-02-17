const { Telegraf } = require('telegraf');
const fs = require('fs');
const axios = require('axios');
const express = require('express'); // برای مدیریت اشتراک از طریق هاست

const bot = new Telegraf('7235738845:AAFXEZVH3Jcw4xoFsv5nT4PWG7Ezyn1CWHM'); // توکن ربات
const API_KEY = 'sk-dcaba291f1c144c390e46d1585f1ef18'; // کلید API دیپ سیک
const USERS_FILE = 'users.json';
const DAILY_LIMIT = 5;
const ADMIN_ID = 997890110; // آی‌دی عددی ادمین

// سرور اکسپرس برای مدیریت از طریق مرورگر
const app = express();
app.use(express.json());

// بارگذاری داده‌های کاربران
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
}

// ذخیره کاربران در فایل JSON
function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// بررسی یا ایجاد یوزر جدید
function checkUser(ctx) {
    const userId = ctx.from.id;
    const now = Date.now();

    if (!users[userId]) {
        users[userId] = { questions: 0, lastReset: now, subscription: false };
    } else {
        // بررسی ریست شدن محدودیت روزانه
        const lastReset = users[userId].lastReset;
        if (now - lastReset > 24 * 60 * 60 * 1000) {
            users[userId].questions = 0;
            users[userId].lastReset = now;
        }
    }
    saveUsers();
}

// درخواست به API دیپ سیک
async function askDeepSeek(question) {
    try {
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: question }]
        }, {
            headers: { Authorization: `Bearer ${API_KEY}` }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        return 'خطا در دریافت پاسخ از سرور';
    }
}

// مدیریت پیام‌های کاربران
bot.on('message', async (ctx) => {
    const userId = ctx.from.id;
    checkUser(ctx);

    if (users[userId].subscription || users[userId].questions < DAILY_LIMIT) {
        const response = await askDeepSeek(ctx.message.text);
        ctx.reply(response);
        
        if (!users[userId].subscription) {
            users[userId].questions++;
        }
        saveUsers();
    } else {
        ctx.reply('شما به حد مجاز سوالات رایگان امروز رسیده‌اید. برای خرید اشتراک به ایدی @BIKstl مراجعه کنید.');
    }
});

// سرور مدیریت اشتراک از طریق مرورگر
app.get('/users', (req, res) => {
    res.json(users);
});

app.post('/activate', (req, res) => {
    const { userId } = req.body;
    if (!userId || !users[userId]) return res.json({ success: false, message: 'کاربر یافت نشد' });
    users[userId].subscription = true;
    saveUsers();
    res.json({ success: true, message: `اشتراک کاربر ${userId} فعال شد.` });
});

app.listen(3000, () => {
    console.log('مدیریت اشتراک روی پورت 3000 فعال شد');
});

// شروع ربات
bot.launch();
