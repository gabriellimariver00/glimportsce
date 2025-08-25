const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { init, all, get, run } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin fixo (você pode trocar depois)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@loja.com';
const ADMIN_PASS  = process.env.ADMIN_PASS  || '1234';

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // aceita imagens base64
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Servir frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Rotas API

// Login simples
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  if (email === ADMIN_EMAIL && senha === ADMIN_PASS) {
    // token simples (apenas demonstração)
    return res.json({ ok: true, token: 'ADMIN_TOKEN_OK' });
  }
  return res.status(401).json({ ok: false, message: 'Credenciais inválidas' });
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const s = await get(`SELECT * FROM settings WHERE id = 1;`);
    res.json(s);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const {
      site_name, banner_text, banner_info,
      beneficio_frete, beneficio_parcelamento, beneficio_pix,
      instagram_url, whatsapp_url
    } = req.body;

    await run(
      `UPDATE settings SET site_name=?, banner_text=?, banner_info=?, beneficio_frete=?, beneficio_parcelamento=?, beneficio_pix=?, instagram_url=?, whatsapp_url=? WHERE id=1`,
      [site_name, banner_text, banner_info, beneficio_frete, beneficio_parcelamento, beneficio_pix, instagram_url, whatsapp_url]
    );
    const s = await get(`SELECT * FROM settings WHERE id = 1;`);
    res.json(s);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Categorias
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM categories ORDER BY name;`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, slug } = req.body;
    await run(`INSERT INTO categories (name, slug) VALUES (?, ?)`, [name, slug]);
    const rows = await all(`SELECT * FROM categories ORDER BY name;`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { name, slug } = req.body;
    await run(`UPDATE categories SET name=?, slug=? WHERE id=?`, [name, slug, req.params.id]);
    const rows = await all(`SELECT * FROM categories ORDER BY name;`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await run(`DELETE FROM categories WHERE id=?`, [req.params.id]);
    const rows = await all(`SELECT * FROM categories ORDER BY name;`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Produtos
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = `SELECT * FROM products ORDER BY id DESC`;
    let params = [];
    if (category && category !== 'todos') {
      sql = `SELECT * FROM products WHERE category_slug=? ORDER BY id DESC`;
      params = [category];
    }
    const rows = await all(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const row = await get(`SELECT * FROM products WHERE id=?`, [req.params.id]);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, category_slug, image } = req.body;
    await run(
      `INSERT INTO products (name, description, price, category_slug, image) VALUES (?, ?, ?, ?, ?)`,
      [name, description, price, category_slug, image || null]
    );
    const rows = await all(`SELECT * FROM products ORDER BY id DESC`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, description, price, category_slug, image } = req.body;
    await run(
      `UPDATE products SET name=?, description=?, price=?, category_slug=?, image=? WHERE id=?`,
      [name, description, price, category_slug, image || null, req.params.id]
    );
    const row = await get(`SELECT * FROM products WHERE id=?`, [req.params.id]);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await run(`DELETE FROM products WHERE id=?`, [req.params.id]);
    const rows = await all(`SELECT * FROM products ORDER BY id DESC`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Inicializa DB e inicia servidor
init().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Erro ao iniciar DB', err);
  process.exit(1);
});
