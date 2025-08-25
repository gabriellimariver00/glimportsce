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
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=> x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x=> x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(`panel-${t.dataset.tab}`).classList.add('active');
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
    op.value = c.slug; op.textContent = `${c.name} (${c.slug})`;
    sel.appendChild(op);
  });

  // Preenche lista produtos
  renderProdutosTable();

  // Preenche categorias
  renderCategoriasTable();

  // Preenche textos
  document.getElementById('tSite').value = settings.site_name || '';
  document.getElementById('tBannerTxt').value = settings.banner_text || '';
  document.getElementById('tBannerInfo').value = settings.banner_info || '';
  document.getElementById('tFrete').value = settings.beneficio_frete || '';
  document.getElementById('tParc').value = settings.beneficio_parcelamento || '';
  document.getElementById('tPix').value = settings.beneficio_pix || '';
  document.getElementById('tInsta').value = settings.instagram_url || '';
  document.getElementById('tWhats').value = settings.whatsapp_url || '';
}

function renderProdutosTable(){
  const tbody = document.querySelector('#prodTable tbody');
  tbody.innerHTML = '';
  products.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img class="img-preview" src="${p.image || 'https://via.placeholder.com/120x80'}" alt=""></td>
      <td>${p.name}</td>
      <td>R$ ${p.price.toFixed(2)}</td>
      <td>${p.category_slug}</td>
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
  if (categories[0]) document.getElementById('pCat').value = categories[0].slug;
}

function carregarProdutoForm(id){
  const p = products.find(x=> x.id === id);
  if(!p) return;
  editingId = id;
  document.getElementById('pNome').value = p.name;
  document.getElementById('pPreco').value = p.price;
  document.getElementById('pDesc').value = p.description || '';
  document.getElementById('pCat').value = p.category_slug;
  document.getElementById('pImg').value = '';
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
  const category_slug = document.getElementById('pCat').value;
  const description = document.getElementById('pDesc').value.trim();
  let image = null;

  const file = document.getElementById('pImg').files[0];
  if(file){ image = await fileToBase64(file); }

  if(!name || !price || !category_slug){
    showToast('Preencha nome, preço e categoria');
    return;
  }

  if(editingId){
    const res = await fetch(`/api/products/${editingId}`, {
      method:'PUT',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ name, description, price, category_slug, image })
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
      body: JSON.stringify({ name, description, price, category_slug, image })
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
      <td>${c.slug}</td>
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
  const slug = document.getElementById('cSlug').value.trim();
  if(!name || !slug){ showToast('Preencha nome e slug'); return; }
  const res = await fetch('/api/categories', {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ name, slug })
  });
  if(res.ok){
    categories = await res.json();
    renderCategoriasTable();
    document.getElementById('cNome').value = '';
    document.getElementById('cSlug').value = '';
    showToast('Categoria criada!');
  } else showToast('Erro ao criar categoria');
}

function editarCategoria(id){
  const c = categories.find(x=> x.id === id);
  if(!c) return;
  const name = prompt('Nome da categoria:', c.name);
  if(name === null) return;
  const slug = prompt('Slug da categoria:', c.slug);
  if(slug === null) return;
  fetch(`/api/categories/${id}`, {
    method:'PUT', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ name, slug })
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
    site_name: document.getElementById('tSite').value,
    banner_text: document.getElementById('tBannerTxt').value,
    banner_info: document.getElementById('tBannerInfo').value,
    beneficio_frete: document.getElementById('tFrete').value,
    beneficio_parcelamento: document.getElementById('tParc').value,
    beneficio_pix: document.getElementById('tPix').value,
    instagram_url: document.getElementById('tInsta').value,
    whatsapp_url: document.getElementById('tWhats').value
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
