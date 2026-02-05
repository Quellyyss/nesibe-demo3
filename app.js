const LS_KEY = "nesibe_cart_v1";

function fmtMoney(v){
  const cur = window.NESIBE_DATA?.currency || "₸";
  return `${Number(v).toLocaleString("ru-RU")} ${cur}`;
}
function getCart(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function setCart(cart){
  localStorage.setItem(LS_KEY, JSON.stringify(cart));
}
function cartCount(cart){
  return Object.values(cart).reduce((a,b)=>a + b, 0);
}
function cartTotal(cart){
  const map = new Map(window.NESIBE_DATA.products.map(p=>[p.id,p]));
  let sum = 0;
  for (const [id, qty] of Object.entries(cart)){
    const p = map.get(id);
    if (p) sum += p.price * qty;
  }
  return sum;
}
function addToCart(id, qty=1){
  const cart = getCart();
  cart[id] = (cart[id] || 0) + qty;
  if (cart[id] <= 0) delete cart[id];
  setCart(cart);
  renderCartPill();
}
function setQty(id, qty){
  const cart = getCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  setCart(cart);
  renderCartPill();
}
function clearCart(){
  setCart({});
  renderCartPill();
}
function renderCartPill(){
  const el = document.querySelector("[data-cart-pill]");
  if (!el) return;
  const cart = getCart();
  const count = cartCount(cart);
  const sum = cartTotal(cart);
  el.innerHTML = `<strong>${count}</strong> • ${fmtMoney(sum)}`;
}

function qs(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function mountCommon(){
  renderCartPill();

  document.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      addToCart(btn.dataset.add, 1);
      toast("Добавлено в корзину");
    });
  });

  document.querySelectorAll("[data-wa]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      window.open(buildWhatsAppLink(), "_blank");
    });
  });
}

function toast(text){
  const t = document.createElement("div");
  t.textContent = text;
  t.style.position="fixed";
  t.style.left="50%";
  t.style.bottom="18px";
  t.style.transform="translateX(-50%)";
  t.style.padding="10px 14px";
  t.style.border="1px solid rgba(233,238,255,.14)";
  t.style.borderRadius="14px";
  t.style.background="rgba(7,10,20,.75)";
  t.style.color="white";
  t.style.boxShadow="0 16px 40px rgba(0,0,0,.35)";
  t.style.zIndex="9999";
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1400);
}

function buildWhatsAppLink(orderData){
  const phone = window.NESIBE_DATA.whatsappPhone || "77000000000";
  const cart = getCart();
  const products = new Map(window.NESIBE_DATA.products.map(p=>[p.id,p]));

  let lines = [];
  lines.push("Заказ Nesibe (Несібе):");

  for (const [id, qty] of Object.entries(cart)){
    const p = products.get(id);
    if (!p) continue;
    lines.push(`• ${p.name} — ${qty} ${p.unit} — ${fmtMoney(p.price * qty)}`);
  }

  const total = cartTotal(cart);
  lines.push(`Итого: ${fmtMoney(total)}`);

  if (orderData){
    lines.push("");
    lines.push("Данные для доставки:");
    lines.push(`Имя: ${orderData.name || "-"}`);
    lines.push(`Телефон: ${orderData.phone || "-"}`);
    lines.push(`Адрес: ${orderData.address || "-"}`);
    if (orderData.comment) lines.push(`Комментарий: ${orderData.comment}`);
  }

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}

function mountCatalog(){
    const chipsRoot = document.getElementById("catChips");
    if (chipsRoot){
        chipsRoot.innerHTML = window.NESIBE_DATA.categories.map(c =>
            `<button class="btn btn-ghost" type="button" data-chip="${c}">${c}</button>`
        ).join("");
        
        chipsRoot.querySelectorAll("[data-chip]").forEach(b=>{
            b.addEventListener("click", ()=>{
                catSel.value = b.dataset.chip;
                render();
            });
  });
}

  const list = document.querySelector("[data-products]");
  const catSel = document.querySelector("[data-category]");
  const search = document.querySelector("[data-search]");

  if (!list || !catSel || !search) return;

  catSel.innerHTML = "";
  window.NESIBE_DATA.categories.forEach(c=>{
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    catSel.appendChild(o);
  });

  function render(){
    const q = search.value.trim().toLowerCase();
    const cat = catSel.value;

    const items = window.NESIBE_DATA.products.filter(p=>{
      const okCat = (cat === "Все") || (p.category === cat);
      const okQ = !q || p.name.toLowerCase().includes(q);
      return okCat && okQ;
    });

    list.innerHTML = items.map(p => productCardHTML(p)).join("");
    list.querySelectorAll("[data-add]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        addToCart(btn.dataset.add, 1);
        toast("Добавлено в корзину");
      });
    });
  }

  catSel.addEventListener("change", render);
  search.addEventListener("input", render);

  render();
}

function productCardHTML(p){
  return `
    <article class="card">
      <div class="thumb">NESIBE</div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(p.name)}</div>
        <div class="card-meta">
          <span>${escapeHtml(p.category)}</span>
          <span class="price">${fmtMoney(p.price)}/${escapeHtml(p.unit)}</span>
        </div>
      </div>
      <div class="card-actions">
        <a class="btn btn-ghost" href="product.html?id=${encodeURIComponent(p.id)}">Подробнее</a>
        <button class="btn" data-add="${escapeHtml(p.id)}">В корзину</button>
      </div>
    </article>
  `;
}

function mountProduct(){
  const id = qs("id");
  const p = window.NESIBE_DATA.products.find(x=>x.id===id);
  const root = document.querySelector("[data-product]");
  if (!root) return;

  if (!p){
    root.innerHTML = `<p class="muted">Товар не найден.</p>`;
    return;
  }

  root.innerHTML = `
    <div class="row">
      <div class="panel">
        <div class="thumb" style="border-radius:14px; height:220px;">NESIBE</div>
        <h2 style="margin:12px 0 8px;">${escapeHtml(p.name)}</h2>
        <div class="badge"><span class="badge-dot"></span>${escapeHtml(p.category)}</div>
        <p class="muted" style="margin-top:10px; line-height:1.6;">${escapeHtml(p.desc)}</p>
      </div>

      <div class="panel">
        <h2 style="margin:0 0 10px;">Покупка</h2>
        <p class="muted">Цена: <b style="color:var(--text)">${fmtMoney(p.price)}</b> / ${escapeHtml(p.unit)}</p>
        <hr class="sep" />
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn" id="addBtn">Добавить в корзину</button>
          <a class="btn btn-ghost" href="cart.html">Открыть корзину</a>
        </div>
        <hr class="sep" />
        <button class="btn btn-wa" data-wa>Заказать через WhatsApp</button>
        <p class="muted small" style="margin-top:10px">WhatsApp формируется из корзины (можно добавить несколько товаров).</p>
      </div>
    </div>
  `;

  document.getElementById("addBtn")?.addEventListener("click", ()=>{
    addToCart(p.id, 1);
    toast("Добавлено в корзину");
  });

  root.querySelector("[data-wa]")?.addEventListener("click", ()=>{
    window.open(buildWhatsAppLink(), "_blank");
  });
}

function mountCart(){
  const tbody = document.querySelector("[data-cart-rows]");
  const totalEl = document.querySelector("[data-cart-total]");
  const emptyEl = document.querySelector("[data-cart-empty]");
  const clearBtn = document.querySelector("[data-cart-clear]");

  if (!tbody || !totalEl || !emptyEl) return;

  const products = new Map(window.NESIBE_DATA.products.map(p=>[p.id,p]));

  function render(){
    const cart = getCart();
    const entries = Object.entries(cart).filter(([id])=>products.has(id));

    emptyEl.style.display = entries.length ? "none" : "block";

    tbody.innerHTML = entries.map(([id, qty])=>{
      const p = products.get(id);
      return `
        <tr>
          <td>
            <b>${escapeHtml(p.name)}</b><br/>
            <span class="muted small">${escapeHtml(p.category)}</span>
          </td>
          <td>${fmtMoney(p.price)}/${escapeHtml(p.unit)}</td>
          <td>
            <div class="qty">
              <button data-dec="${escapeHtml(id)}">−</button>
              <span>${qty}</span>
              <button data-inc="${escapeHtml(id)}">+</button>
            </div>
          </td>
          <td><b>${fmtMoney(p.price * qty)}</b></td>
          <td><button class="btn btn-danger" data-del="${escapeHtml(id)}">Удалить</button></td>
        </tr>
      `;
    }).join("");

    totalEl.textContent = fmtMoney(cartTotal(cart));

    tbody.querySelectorAll("[data-inc]").forEach(b=>{
      b.addEventListener("click", ()=> addToCart(b.dataset.inc, 1) || render());
    });
    tbody.querySelectorAll("[data-dec]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const id = b.dataset.dec;
        const cart = getCart();
        setQty(id, (cart[id]||0) - 1);
        render();
      });
    });
    tbody.querySelectorAll("[data-del]").forEach(b=>{
      b.addEventListener("click", ()=>{
        setQty(b.dataset.del, 0);
        render();
      });
    });

    renderCartPill();
  }

  clearBtn?.addEventListener("click", ()=>{
    clearCart();
    render();
  });

  render();
}

function mountCheckout(){
  const form = document.querySelector("[data-checkout-form]");
  const totalEl = document.querySelector("[data-checkout-total]");
  if (!form || !totalEl) return;

  const cart = getCart();
  totalEl.textContent = fmtMoney(cartTotal(cart));

  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const order = {
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      address: String(fd.get("address") || ""),
      comment: String(fd.get("comment") || "")
    };
    window.open(buildWhatsAppLink(order), "_blank");
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[m]));
}

document.addEventListener("DOMContentLoaded", ()=>{
  mountCommon();
  const page = document.body.dataset.page;
  if (page === "catalog") mountCatalog();
  if (page === "product") mountProduct();
  if (page === "cart") mountCart();
  if (page === "checkout") mountCheckout();
});
function mountRevealAnimations(){
  const nodes = document.querySelectorAll(".hero, .section, .panel, .card");
  nodes.forEach(n => n.classList.add("reveal"));

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (e.isIntersecting) e.target.classList.add("is-in");
    });
  }, { threshold: 0.12 });

  nodes.forEach(n => io.observe(n));
}

document.addEventListener("DOMContentLoaded", ()=>{
  // ...твои mountCommon и mountX
  mountRevealAnimations();
});
