const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Helpers com Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Criação das tabelas
async function init() {
  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category_slug TEXT NOT NULL,
      image TEXT,            -- DataURL base64 ou URL
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      site_name TEXT,
      banner_text TEXT,
      banner_info TEXT,
      beneficio_frete TEXT,
      beneficio_parcelamento TEXT,
      beneficio_pix TEXT,
      instagram_url TEXT,
      whatsapp_url TEXT
    );
  `);

  // Seeds
  const catCount = await get(`SELECT COUNT(*) as c FROM categories;`);
  if (!catCount || catCount.c === 0) {
    const cats = [
      { name: 'Perfumes', slug: 'perfumes' },
      { name: 'Roupas', slug: 'roupas' },
      { name: 'Acessórios', slug: 'acessorios' }
    ];
    for (const c of cats) {
      await run(`INSERT INTO categories (name, slug) VALUES (?, ?)`, [c.name, c.slug]);
    }
  }

  const prodCount = await get(`SELECT COUNT(*) as c FROM products;`);
  if (!prodCount || prodCount.c === 0) {
    const demoImg = 'https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=800&q=80&auto=format&fit=crop';
    const demoImg2 = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80&auto=format&fit=crop';
    const demoImg3 = 'https://images.unsplash.com/photo-1520975731094-5cbf3f5464f3?w=800&q=80&auto=format&fit=crop';
    const items = [
      ['Perfume Importado A', 'Aroma floral sofisticado e marcante.', 199.90, 'perfumes', demoImg],
      ['Perfume Importado B', 'Notas amadeiradas com toque cítrico.', 229.90, 'perfumes', demoImg2],
      ['Camiseta Premium', 'Malha fria, caimento perfeito.', 89.90, 'roupas', demoImg2],
      ['Calça Jeans Skinny', 'Jeans premium com elastano.', 149.90, 'roupas', demoImg3],
      ['Bolsa Feminina', 'Acabamento impecável e moderno.', 179.90, 'acessorios', demoImg3],
      ['Relógio Clássico', 'Design minimalista elegante.', 249.90, 'acessorios', demoImg]
    ];
    for (const p of items) {
      await run(
        `INSERT INTO products (name, description, price, category_slug, image) VALUES (?, ?, ?, ?, ?)`,
        p
      );
    }
  }

  const hasSettings = await get(`SELECT COUNT(*) as c FROM settings WHERE id = 1;`);
  if (!hasSettings || hasSettings.c === 0) {
    await run(
      `INSERT INTO settings (id, site_name, banner_text, banner_info, beneficio_frete, beneficio_parcelamento, beneficio_pix, instagram_url, whatsapp_url)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'GL Imports CE',
        'Nova coleção chegou!',
        'Frete grátis acima de R$199 e desconto exclusivo no PIX',
        '🚚 Frete grátis acima de R$199',
        '💳 Parcelamento até 6x',
        '💸 10% OFF no PIX',
        'https://www.instagram.com/glimports.ce',
        'https://wa.me/5588921684808'
      ]
    );
  }
}

module.exports = { db, run, all, get, init };
