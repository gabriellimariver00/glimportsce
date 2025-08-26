const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pjahnzgqybqgvxhxlrye.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYWhuemdxeWJxZ3Z4aHhscnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjMyMTQsImV4cCI6MjA3MTczOTIxNH0.KU2Xb8AzqtvAVAsvMvoGGzIXvVZnmMxlieduYv7Oo1I';
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase env vars ausentes. Defina SUPABASE_URL e SUPABASE_KEY no .env');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos (raiz do projeto)
app.use(express.static(path.join(__dirname)));

// Rotas API com Supabase

// Admin login (tabela admin_users: email, password_hash)
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ ok:false, message:'Dados inválidos' });
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, password_hash')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(401).json({ ok:false, message:'Credenciais inválidas' });
    const ok = await bcrypt.compare(String(senha), data.password_hash || '');
    if (!ok) return res.status(401).json({ ok:false, message:'Credenciais inválidas' });
    return res.json({ ok:true, token:'ADMIN_TOKEN_OK' });
  } catch (e) {
    return res.status(500).json({ ok:false, message:e.message });
  }
});

// Site settings (tabela site_settings: id=1)
app.get('/api/settings', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return res.json(data || {});
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const payload = {
      store_name: req.body.store_name ?? null,
      banner_title: req.body.banner_title ?? null,
      banner_subtitle: req.body.banner_subtitle ?? null,
      promo_message: req.body.promo_message ?? null,
      instagram_url: req.body.instagram_url ?? null,
      whatsapp_number: req.body.whatsapp_number ?? null,
      about_text: req.body.about_text ?? null,
      return_policy: req.body.return_policy ?? null,
      payment_options: req.body.payment_options ?? null,
    };
    const { data, error } = await supabase
      .from('site_settings')
      .update(payload)
      .eq('id', 1)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return res.json(data || {});
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Categorias
app.get('/api/categories', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error:'Nome é obrigatório' });
    const { error } = await supabase
      .from('categories')
      .insert([{ name }]);
    if (error) throw error;
    const { data, error: listErr } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (listErr) throw listErr;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const id = Number(req.params.id);
    const { error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id);
    if (error) throw error;
    const { data, error: listErr } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (listErr) throw listErr;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    const { data, error: listErr } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (listErr) throw listErr;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Produtos
app.get('/api/products', async (req, res) => {
  try {
    const { category_id } = req.query;
    let { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    if (category_id && Array.isArray(data)) {
      // filtro no app se coluna não existir no banco
      data = data.filter(p => String(p.category_id || p.category_uuid || p.category || '') === String(category_id));
    }
    if (error) throw error;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, price, image_url, category_id, stock, featured, discount_percent, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return res.json(data || {});
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, image_url } = req.body;
    if (!name || !price) return res.status(400).json({ error:'Campos obrigatórios ausentes' });
    const insertObj = { name, description, price, image_url: image_url || null };
    const { error } = await supabase.from('products').insert([insertObj]);
    if (error) throw error;
    const { data, error: listErr } = await supabase.from('products').select('*');
    if (listErr) throw listErr;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, price, image_url } = req.body;
    const updateObj = { name, description, price, image_url: image_url || null };
    const { error } = await supabase.from('products').update(updateObj).eq('id', id);
    if (error) throw error;
    const { data, error: oneErr } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
    if (oneErr) throw oneErr;
    return res.json(data || {});
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    const { data, error: listErr } = await supabase.from('products').select('*');
    if (listErr) throw listErr;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
