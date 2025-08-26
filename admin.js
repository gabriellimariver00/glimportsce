const API = '';
const toast = document.getElementById('toast');

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=> toast.classList.remove('show'), 2200);
}

function token(){ return localStorage.getItem('adm_token'); }
function isLogged(){ return !!token(); }

async function doLogin(){
  const email = document.getElementById('admEmail').value.trim();
  const senha = document.getElementById('admSenha').value.trim();
  if(!email || !senha){ showToast('Informe e-mail e senha'); return; }
  const res = await fetch('/api/login', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ email, senha })
  });
  if(res.ok){
    const data = await res.json();
    localStorage.setItem('adm_token', data.token);
    enterAdmin();
  }else{
    showToast('Login inválido');
  }
}
function logout(){
  localStorage.removeItem('adm_token');
  location.href = '/admin.html';
}

function enterAdmin(){
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('adminView').style.display = 'block';
  initPanels();
}

async function fetchJSON(url, opts){
  const res = await fetch(url, opts);
  if(!res.ok) throw new Error('Erro');
  return res.json();
}

let categories = [];
let products = [];
let settings = null;
let editingId = null;

// Tabs
document.querySelectorAll('.admin-link').forEach(link=>{
  link.addEventListener('click', ()=>{
    document.querySelectorAll('.admin-link').forEach(x=> x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x=> x.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(`panel-${link.dataset.tab}`).classList.add('active');
  });
});

async function initPanels(){
  // Carrega settings
  settings = await fetchJSON('/api/settings');
  // Carrega categorias
  categories = await fetchJSON('/api/categories');
  // Carrega produtos
  products = await fetchJSON('/api/products');

  // Preenche selects
  const sel = document.getElementById('pCat');
  sel.innerHTML = '';
  categories.forEach(c=>{
    const op = document.createElement('option');
    op.value = c.id; op.textContent = `${c.name}`;
    sel.appendChild(op);
  });

  // Preenche lista produtos
  renderProdutosTable();

  // Preenche categorias
  renderCategoriasTable();

  // Preenche textos
  document.getElementById('tSite').value = settings.store_name || '';
  document.getElementById('tBannerTxt').value = settings.banner_title || '';
  document.getElementById('tBannerInfo').value = settings.banner_subtitle || '';
  document.getElementById('tPromo').value = settings.promo_message || '';
  document.getElementById('tInsta').value = settings.instagram_url || '';
  document.getElementById('tWhats').value = settings.whatsapp_number || '';
  document.getElementById('tPay').value = settings.payment_options || '';
}

function renderProdutosTable(){
  const tbody = document.querySelector('#prodTable tbody');
  tbody.innerHTML = '';
  products.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img class="img-preview" src="${p.image_url || p.image || 'https://via.placeholder.com/120x80'}" alt=""></td>
      <td>${p.name}</td>
      <td>R$ ${p.price.toFixed(2)}</td>
      <td>${(categories.find(c=> c.id===p.category_id)?.name) || ''}</td>
      <td>
        <button class="btn btn-light" data-ed="${p.id}">Editar</button>
        <button class="btn" data-rm="${p.id}">Remover</button>
      </td>
    `;
    tr.querySelector('[data-ed]').addEventListener('click', ()=> carregarProdutoForm(p.id));
    tr.querySelector('[data-rm]').addEventListener('click', ()=> removerProduto(p.id));
    tbody.appendChild(tr);
  });
}

function limparProduto(){
  editingId = null;
  document.getElementById('pNome').value = '';
  document.getElementById('pPreco').value = '';
  document.getElementById('pDesc').value = '';
  document.getElementById('pImg').value = '';
  document.getElementById('pEstoque').value = '0';
  document.getElementById('pDestaque').value = 'false';
  document.getElementById('pDescPct').value = '0';
  if (categories[0]) document.getElementById('pCat').value = String(categories[0].id);
}

function carregarProdutoForm(id){
  const p = products.find(x=> x.id === id);
  if(!p) return;
  editingId = id;
  document.getElementById('pNome').value = p.name;
  document.getElementById('pPreco').value = p.price;
  document.getElementById('pDesc').value = p.description || '';
  document.getElementById('pCat').value = String(p.category_id);
  document.getElementById('pImg').value = p.image_url || '';
  document.getElementById('pEstoque').value = p.stock ?? 0;
  document.getElementById('pDestaque').value = String(!!p.featured);
  document.getElementById('pDescPct').value = p.discount_percent ?? 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function criarProduto(){
  const name = document.getElementById('pNome').value.trim();
  const price = parseFloat(document.getElementById('pPreco').value);
  const category_id = parseInt(document.getElementById('pCat').value);
  const description = document.getElementById('pDesc').value.trim();
  const image_url = document.getElementById('pImg').value.trim() || null;
  const stock = parseInt(document.getElementById('pEstoque').value) || 0;
  const featured = document.getElementById('pDestaque').value === 'true';
  const discount_percent = parseInt(document.getElementById('pDescPct').value) || 0;

  if(!name || !price || !category_id){
    showToast('Preencha nome, preço e categoria');
    return;
  }

  if(editingId){
    const res = await fetch(`/api/products/${editingId}`, {
      method:'PUT',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ name, description, price, category_id, image_url, stock, featured, discount_percent })
    });
    if(res.ok){
      const upd = await res.json();
      const idx = products.findIndex(x=> x.id === editingId);
      products[idx] = upd;
      renderProdutosTable();
      limparProduto();
      showToast('Produto atualizado!');
    } else {
      showToast('Erro ao atualizar');
    }
  } else {
    const res = await fetch(`/api/products`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ name, description, price, category_id, image_url, stock, featured, discount_percent })
    });
    if(res.ok){
      products = await res.json();
      renderProdutosTable();
      limparProduto();
      showToast('Produto criado!');
    } else {
      showToast('Erro ao criar');
    }
  }
}

async function removerProduto(id){
  if(!confirm('Remover este produto?')) return;
  const res = await fetch(`/api/products/${id}`, { method:'DELETE' });
  if(res.ok){
    products = await res.json();
    renderProdutosTable();
    showToast('Produto removido!');
  } else {
    showToast('Erro ao remover');
  }
}

// Categorias
function renderCategoriasTable(){
  const tbody = document.querySelector('#catTable tbody');
  tbody.innerHTML = '';
  categories.forEach(c=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.image_url ? `<img class="img-preview" src="${c.image_url}">` : '-'}</td>
      <td>
        <button class="btn btn-light" data-ed="${c.id}">Editar</button>
        <button class="btn" data-rm="${c.id}">Remover</button>
      </td>
    `;
    tr.querySelector('[data-ed]').addEventListener('click', ()=> editarCategoria(c.id));
    tr.querySelector('[data-rm]').addEventListener('click', ()=> removerCategoria(c.id));
    tbody.appendChild(tr);
  });
}

async function criarCategoria(){
  const name = document.getElementById('cNome').value.trim();
  const image_url = document.getElementById('cImg').value.trim();
  if(!name){ showToast('Preencha o nome'); return; }
  const res = await fetch('/api/categories', {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ name, image_url })
  });
  if(res.ok){
    categories = await res.json();
    renderCategoriasTable();
    document.getElementById('cNome').value = '';
    document.getElementById('cImg').value = '';
    showToast('Categoria criada!');
  } else showToast('Erro ao criar categoria');
}

function editarCategoria(id){
  const c = categories.find(x=> x.id === id);
  if(!c) return;
  const name = prompt('Nome da categoria:', c.name);
  if(name === null) return;
  const image_url = prompt('Imagem (URL):', c.image_url || '');
  fetch(`/api/categories/${id}`, {
    method:'PUT', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ name, image_url })
  }).then(r=> r.json()).then(rows=>{
    categories = rows;
    renderCategoriasTable();
    showToast('Categoria atualizada!');
  }).catch(()=> showToast('Erro ao atualizar categoria'));
}

function removerCategoria(id){
  if(!confirm('Remover esta categoria?')) return;
  fetch(`/api/categories/${id}`, { method:'DELETE' })
    .then(r=> r.json())
    .then(rows=>{
      categories = rows;
      renderCategoriasTable();
      showToast('Categoria removida!');
    })
    .catch(()=> showToast('Erro ao remover categoria'));
}

// Textos do Site
async function salvarTextos(){
  const payload = {
    store_name: document.getElementById('tSite').value,
    banner_title: document.getElementById('tBannerTxt').value,
    banner_subtitle: document.getElementById('tBannerInfo').value,
    promo_message: document.getElementById('tPromo').value,
    instagram_url: document.getElementById('tInsta').value,
    whatsapp_number: document.getElementById('tWhats').value,
    payment_options: document.getElementById('tPay').value
  };
  const res = await fetch('/api/settings', {
    method:'PUT',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  if(res.ok){
    showToast('Textos salvos!');
  } else showToast('Erro ao salvar textos');
}

// Boot
(function(){
  if(isLogged()){
    enterAdmin();
  } else {
    document.getElementById('loginView').style.display = 'block';
    document.getElementById('adminView').style.display = 'none';
  }
})();
