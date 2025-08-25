const API = ''; // mesmo domínio (servido pelo Express)
let settings = null;
let categories = [];
let products = [];
let currentSelected = null;
let cart = [];

const productsGrid = document.getElementById('productsGrid');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartItems = document.getElementById('cartItems');
const cartBadge = document.getElementById('cartBadge');
const cartIcon = document.getElementById('cartIcon');
const emptyCartMsg = document.getElementById('emptyCartMsg');
const cartTotal = document.getElementById('cartTotal');

const productView = document.getElementById('productView');
const pvImg = document.getElementById('pvImg');
const pvName = document.getElementById('pvName');
const pvDesc = document.getElementById('pvDesc');
const pvPrice = document.getElementById('pvPrice');

const toast = document.getElementById('toast');

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error('Erro na requisição');
  return res.json();
}

function money(v){ return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=> toast.classList.remove('show'), 2500);
}

function scrollToProdutos(){
  document.getElementById('produtos').scrollIntoView({ behavior:'smooth' });
}

function renderProducts(list){
  productsGrid.innerHTML = '';
  list.forEach(p=>{
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <img class="card-img" src="${p.image || 'https://via.placeholder.com/600x400'}" alt="${p.name}">
      <div class="card-body">
        <div class="card-title">${p.name}</div>
        <p class="card-desc">${p.description || ''}</p>
        <div class="card-price">${money(p.price)}</div>
        <button class="btn" data-id="${p.id}">Ver Produto</button>
      </div>
    `;
    el.querySelector('button').addEventListener('click', ()=> openProduct(p.id));
    productsGrid.appendChild(el);
  });
}

function openProduct(id){
  const p = products.find(x=> x.id === id);
  if(!p) return;
  currentSelected = p;
  pvImg.src = p.image || 'https://via.placeholder.com/800x600';
  pvName.textContent = p.name;
  pvDesc.textContent = p.description || '';
  pvPrice.textContent = money(p.price);
  productView.classList.remove('hidden');
}
function closeProductView(){
  productView.classList.add('hidden');
}

function addSelectedToCart(){
  if(!currentSelected) return;
  cart.push({...currentSelected, qty:1});
  updateCartUI();
  closeProductView();
  showToast('Produto adicionado ao carrinho!');
  cartIcon.classList.add('glow');
  setTimeout(()=> cartIcon.classList.remove('glow'), 1200);
}

function updateCartUI(){
  cartItems.innerHTML = '';
  if(cart.length === 0){
    emptyCartMsg.style.display = 'block';
    cartBadge.textContent = '0';
    cartTotal.textContent = money(0);
    return;
  }
  emptyCartMsg.style.display = 'none';
  let total = 0;
  cart.forEach((it, idx)=>{
    total += it.price * it.qty;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${it.image || 'https://via.placeholder.com/100'}" alt="">
      <div class="cart-item-info">
        <div style="font-weight:700">${it.name}</div>
        <div>${money(it.price)} • Qtd: ${it.qty}</div>
      </div>
      <button class="icon-btn" title="Remover"><i class="fa-solid fa-trash"></i></button>
    `;
    row.querySelector('button').addEventListener('click', ()=>{
      cart.splice(idx,1);
      updateCartUI();
    });
    cartItems.appendChild(row);
  });
  cartBadge.textContent = String(cart.length);
  cartTotal.textContent = money(total);
}

function toggleCart(){
  const isOpen = cartDrawer.classList.contains('open');
  if(isOpen){
    cartDrawer.classList.remove('open');
    cartBackdrop.classList.remove('show');
  }else{
    cartDrawer.classList.add('open');
    cartBackdrop.classList.add('show');
    updateCartUI();
  }
}

function openCheckout(){
  if(cart.length === 0){
    showToast('Carrinho vazio!');
    return;
  }
  document.getElementById('checkoutModal').classList.remove('hidden');
}
function closeCheckout(){
  document.getElementById('checkoutModal').classList.add('hidden');
}

function finishOnWhats(){
  const pg = document.getElementById('pgto').value;
  const nome = document.getElementById('cliNome').value.trim();
  const email = document.getElementById('cliEmail').value.trim();
  const whats = document.getElementById('cliWhats').value.trim();
  if(!pg || !nome || !whats){
    showToast('Preencha pagamento, nome e WhatsApp!');
    return;
  }
  const summary = cart.map(c=> `${c.name} (${money(c.price)})`).join(' | ');
  const total = cart.reduce((s,c)=> s + c.price*c.qty, 0);
  const msg = `Olá! Quero finalizar minha compra.
- Produtos: ${summary}
- Total: ${money(total)}
- Pagamento: ${pg}
- Nome: ${nome}
- Email: ${email}
- WhatsApp: ${whats}`;

  const url = (settings && settings.whatsapp_url) ? settings.whatsapp_url : 'https://wa.me/5588921684808';
  window.open(`${url}?text=${encodeURIComponent(msg)}`, '_blank');
}

function bindCategoryLinks(){
  document.querySelectorAll('.nav-link[data-cat]').forEach(a=>{
    a.addEventListener('click', async (e)=>{
      e.preventDefault();
      const cat = a.getAttribute('data-cat');
      const data = await fetchJSON(`/api/products?category=${cat}`);
      renderProducts(data);
    });
  });
}

async function loadSettings(){
  settings = await fetchJSON('/api/settings');
  document.querySelector('.logo').textContent = settings.site_name || 'GL Imports CE';
  document.getElementById('bannerText').textContent = settings.banner_text || '';
  document.getElementById('bannerInfo').textContent = settings.banner_info || '';
  document.getElementById('benefFrete').textContent = settings.beneficio_frete || '';
  document.getElementById('benefParcelamento').textContent = settings.beneficio_parcelamento || '';
  document.getElementById('benefPix').textContent = settings.beneficio_pix || '';
  const insta = document.getElementById('instaLink');
  const whats = document.getElementById('whatsLink');
  if (settings.instagram_url) insta.href = settings.instagram_url;
  if (settings.whatsapp_url) whats.href = settings.whatsapp_url;
}

async function loadProducts(){
  products = await fetchJSON('/api/products');
  renderProducts(products);
}

async function boot(){
  try {
    await loadSettings();
    await loadProducts();
    bindCategoryLinks();
  } catch (e) {
    console.error(e);
    showToast('Erro ao carregar a loja.');
  }
}
boot();
