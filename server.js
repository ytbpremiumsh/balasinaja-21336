require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new Database('onesender.db');
db.pragma('journal_mode = WAL');

// Initialize database tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS autoreplies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger TEXT UNIQUE NOT NULL,
      message_type TEXT DEFAULT 'text',
      content TEXT NOT NULL,
      url_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE,
      phone TEXT NOT NULL,
      name TEXT,
      inbox_type TEXT,
      inbox_message TEXT,
      reply_type TEXT,
      reply_message TEXT,
      reply_image TEXT,
      status TEXT DEFAULT 'received',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Database initialized successfully');
}

initDatabase();

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helper Functions
function getContact(phone) {
  return db.prepare('SELECT * FROM contacts WHERE phone = ?').get(phone);
}

function saveContact(phone, name) {
  try {
    db.prepare('INSERT INTO contacts (phone, name) VALUES (?, ?)').run(phone, name);
    console.log('📇 New contact saved:', phone);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      console.log('✅ Contact already exists:', phone);
    } else {
      console.error('❌ Error saving contact:', err.message);
    }
  }
}

function findTrigger(message) {
  const normalized = String(message).toLowerCase().trim();
  return db.prepare('SELECT * FROM autoreplies WHERE LOWER(trigger) = ?').get(normalized);
}

function buildAiContext() {
  const pairs = db.prepare('SELECT question, answer FROM ai_knowledge_base').all();
  if (!pairs.length) return '';
  
  const blocks = pairs.map(p => `Q: ${p.question}\nA: ${p.answer}`).join('\n---\n');
  return blocks.substring(0, 8000); // Limit context size
}

async function callGeminiAI(question, context) {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gemini-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemPrompt = `You are an assistant for a WhatsApp autoresponder named OneSender. Keep replies concise, friendly, and helpful. Answer in the language of the user message (likely Indonesian). Prefer answers suggested in the knowledge base when relevant. Avoid heavy Markdown formatting.`;
  
  const userPrompt = context 
    ? `${systemPrompt}\n\nKnowledge base:\n${context}\n\nUser question: ${question}`
    : `${systemPrompt}\n\nUser question: ${question}`;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512
      }
    });

    const candidates = response.data?.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0]?.content?.parts;
      if (parts && parts.length > 0) {
        return parts[0].text?.trim() || '';
      }
    }
    return '';
  } catch (error) {
    console.error('❌ Gemini API error:', error.response?.data || error.message);
    return '';
  }
}

async function callOpenAI(question, context) {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';
  const url = 'https://api.openai.com/v1/chat/completions';

  const systemPrompt = `You are an assistant for a WhatsApp autoresponder named OneSender. Keep replies concise, friendly, and helpful. Answer in the language of the user message (likely Indonesian). Prefer answers suggested in the knowledge base when relevant. Avoid heavy Markdown formatting.`;
  
  const messages = [
    { role: 'system', content: systemPrompt + (context ? `\n\nKnowledge base:\n${context}` : '') },
    { role: 'user', content: question }
  ];

  try {
    const response = await axios.post(url, {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 512
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('❌ OpenAI API error:', error.response?.data || error.message);
    return '';
  }
}

async function callDeepSeek(question, context) {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'deepseek-chat';
  const url = 'https://api.deepseek.com/v1/chat/completions';

  const systemPrompt = `You are an assistant for a WhatsApp autoresponder named OneSender. Keep replies concise, friendly, and helpful. Answer in the language of the user message (likely Indonesian). Prefer answers suggested in the knowledge base when relevant. Avoid heavy Markdown formatting.`;
  
  const messages = [
    { role: 'system', content: systemPrompt + (context ? `\n\nKnowledge base:\n${context}` : '') },
    { role: 'user', content: question }
  ];

  try {
    const response = await axios.post(url, {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 512
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('❌ DeepSeek API error:', error.response?.data || error.message);
    return '';
  }
}

async function callOpenRouter(question, context) {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'openrouter/auto';
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const systemPrompt = `You are an assistant for a WhatsApp autoresponder named OneSender. Keep replies concise, friendly, and helpful. Answer in the language of the user message (likely Indonesian). Prefer answers suggested in the knowledge base when relevant. Avoid heavy Markdown formatting.`;
  
  const messages = [
    { role: 'system', content: systemPrompt + (context ? `\n\nKnowledge base:\n${context}` : '') },
    { role: 'user', content: question }
  ];

  try {
    const response = await axios.post(url, {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 512
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://onesender-dashboard.com',
        'X-Title': 'OneSender Autoreply'
      }
    });

    return response.data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('❌ OpenRouter API error:', error.response?.data || error.message);
    return '';
  }
}

async function generateAiReply(question) {
  const vendor = (process.env.AI_VENDOR || '').toLowerCase();
  const context = buildAiContext();

  switch (vendor) {
    case 'gemini':
      return await callGeminiAI(question, context);
    case 'openai':
      return await callOpenAI(question, context);
    case 'deepseek':
      return await callDeepSeek(question, context);
    case 'openrouter':
      return await callOpenRouter(question, context);
    default:
      console.log('⚠️ AI vendor not configured or unknown:', vendor);
      return '';
  }
}

async function sendToOneSender(to, type, text, image = '') {
  const url = process.env.ONESENDER_API_URL;
  const apiKey = process.env.ONESENDER_API_KEY;
  const priority = parseInt(process.env.MESSAGE_PRIORITY || '10');

  const payload = { to, type, priority };

  if (type === 'text') {
    payload.text = { body: text };
  } else if (type === 'image') {
    payload.image = { link: image, caption: text };
  } else if (type === 'document') {
    payload.document = { link: image, caption: text };
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('📣 Message sent to OneSender:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending to OneSender:', error.response?.data || error.message);
    throw error;
  }
}

// Routes - Pages
app.get('/', (req, res) => res.redirect('/inbox'));

app.get('/inbox', (req, res) => {
  const messages = db.prepare('SELECT * FROM inbox ORDER BY created_at DESC LIMIT 50').all();
  res.render('inbox', { messages, page: 'inbox' });
});

app.get('/autoreplies', (req, res) => {
  const autoreplies = db.prepare('SELECT * FROM autoreplies ORDER BY created_at DESC').all();
  res.render('autoreplies', { autoreplies, page: 'autoreplies' });
});

app.post('/autoreplies/add', (req, res) => {
  const { trigger, message_type, content, url_image } = req.body;
  try {
    db.prepare('INSERT INTO autoreplies (trigger, message_type, content, url_image) VALUES (?, ?, ?, ?)')
      .run(trigger, message_type || 'text', content, url_image || '');
    res.redirect('/autoreplies');
  } catch (error) {
    console.error('Error adding autoreply:', error);
    res.redirect('/autoreplies?error=duplicate');
  }
});

app.post('/autoreplies/delete/:id', (req, res) => {
  db.prepare('DELETE FROM autoreplies WHERE id = ?').run(req.params.id);
  res.redirect('/autoreplies');
});

app.get('/ai-knowledge', (req, res) => {
  const knowledge = db.prepare('SELECT * FROM ai_knowledge_base ORDER BY created_at DESC').all();
  res.render('ai_knowledge_base', { knowledge, page: 'ai-knowledge' });
});

app.post('/ai-knowledge/add', (req, res) => {
  const { question, answer } = req.body;
  db.prepare('INSERT INTO ai_knowledge_base (question, answer) VALUES (?, ?)').run(question, answer);
  res.redirect('/ai-knowledge');
});

app.post('/ai-knowledge/delete/:id', (req, res) => {
  db.prepare('DELETE FROM ai_knowledge_base WHERE id = ?').run(req.params.id);
  res.redirect('/ai-knowledge');
});

app.get('/contacts', (req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.render('contacts', { contacts, page: 'contacts' });
});

app.get('/settings', (req, res) => {
  const settings = {
    onesender_api_url: process.env.ONESENDER_API_URL || '',
    onesender_api_key: process.env.ONESENDER_API_KEY ? '***' + process.env.ONESENDER_API_KEY.slice(-4) : 'Not set',
    message_priority: process.env.MESSAGE_PRIORITY || '10',
    ai_vendor: process.env.AI_VENDOR || 'Not set',
    ai_api_key: process.env.AI_API_KEY ? '***' + process.env.AI_API_KEY.slice(-4) : 'Not set',
    ai_model: process.env.AI_MODEL || 'Not set'
  };
  res.render('settings', { settings, page: 'settings' });
});

// Webhook endpoint
app.post('/api/webhook', async (req, res) => {
  try {
    const data = req.body;
    console.log('🔥 Webhook received:', JSON.stringify(data, null, 2));

    // Validate message
    const isValid = !data.is_group && !data.is_from_me && ['text', 'image', 'document'].includes(data.message_type);
    if (!isValid) {
      console.log('⚠️ Message ignored (group/self/invalid type)');
      return res.json({ status: 'ignored' });
    }

    const phone = String(data.from_id).replace(/(@s\.whatsapp\.net|@g\.us|@newsletter|@lid)/g, '');
    const name = data.from_name || '';
    const messageText = data.message_text || '';
    const messageType = data.message_type;
    const messageId = data.message_id;
    const timestamp = data.message_timestamp;

    // Save contact
    saveContact(phone, name);

    // Save to inbox
    db.prepare(`
      INSERT INTO inbox (message_id, phone, name, inbox_type, inbox_message, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'received', datetime('now'))
    `).run(messageId, phone, name, messageType, messageText);

    console.log('📥 Message saved to inbox from:', phone);

    // Check for trigger match
    const trigger = findTrigger(messageText);

    if (trigger) {
      console.log('✅ Trigger matched:', trigger.trigger);
      
      const contact = getContact(phone);
      const contactName = contact?.name || name;
      
      let replyContent = trigger.content
        .replace('{PHONE}', phone)
        .replace('{NAME}', contactName);

      // Send reply
      await sendToOneSender(phone, trigger.message_type, replyContent, trigger.url_image);

      // Update inbox
      db.prepare(`
        UPDATE inbox 
        SET reply_type = ?, reply_message = ?, reply_image = ?, status = 'replied_trigger'
        WHERE message_id = ?
      `).run(trigger.message_type, replyContent, trigger.url_image || '', messageId);

      return res.json({ status: 'replied_trigger' });
    }

    // AI fallback for text messages
    if (messageType === 'text' && process.env.AI_VENDOR && process.env.AI_API_KEY) {
      console.log('🤖 Attempting AI reply...');
      
      const aiReply = await generateAiReply(messageText);
      
      if (aiReply) {
        console.log('✅ AI generated reply');
        
        await sendToOneSender(phone, 'text', aiReply);

        db.prepare(`
          UPDATE inbox 
          SET reply_type = 'text', reply_message = ?, status = 'replied_ai'
          WHERE message_id = ?
        `).run(aiReply, messageId);

        return res.json({ status: 'replied_ai' });
      } else {
        console.log('⚠️ AI did not return a reply');
      }
    }

    console.log('🚫 No reply sent');
    db.prepare(`UPDATE inbox SET status = 'no_reply' WHERE message_id = ?`).run(messageId);
    
    return res.json({ status: 'no_reply' });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OneSender Dashboard running on http://localhost:${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook`);
});
