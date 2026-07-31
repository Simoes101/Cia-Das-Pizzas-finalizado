(function(){
    const STORAGE_KEY = 'pizzaria_cart_v1';
    let cart = [];

    function load(){
        try{ cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }catch(e){ cart = []; }
    }
    function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); renderCart(); updateBadge(); }

    function formatPrice(v){ return 'R$ ' + v.toFixed(2).replace('.', ','); }

    function addItem(item){
        // merge by sku if provided, else by name
        const key = item.sku || item.name;
        const existing = cart.find(c => (c.sku || c.name) === key);
        if(existing){ existing.qty = (existing.qty || 1) + (item.qty || 1); }
        else { cart.push({ id: Date.now() + Math.random(), sku: item.sku, name: item.name, price: item.price||0, qty: item.qty||1 }); }
        save();
    }

    function removeItem(id){ cart = cart.filter(i=>i.id !== id); save(); }
    function updateQty(id, qty){ const it = cart.find(i=>i.id===id); if(!it) return; it.qty = Math.max(0, qty); if(it.qty===0) removeItem(id); else save(); }
    function clearCart(){ cart = []; save(); }
    function getTotal(){ return cart.reduce((s,i)=>s + (i.price||0)*(i.qty||1), 0); }

    // DOM: create floating button + panel
    const panel = document.createElement('div');
    panel.id = 'cart-panel';
    panel.innerHTML = `
      <button id="cart-toggle" aria-label="Abrir carrinho"><span id="cart-badge">0</span> Carrinho</button>
      <div id="cart-drawer" class="hidden">
        <header><strong>Seu carrinho</strong><button id="cart-close">×</button></header>
        <div id="cart-items"></div>
        <footer>
          <div class="cart-total">Total: <span id="cart-total">R$ 0,00</span></div>
          <div class="cart-actions">
            <button id="cart-clear" class="button">Limpar</button>
            <a id="cart-checkout" class="button button-primary" href="pagamento.html">Finalizar pedido</a>
          </div>
        </footer>
      </div>
    `;
    document.addEventListener('DOMContentLoaded', ()=>{
        document.body.appendChild(panel);
        bindUI(); load(); renderCart(); updateBadge();
    });

    function bindUI(){
        const toggle = document.getElementById('cart-toggle');
        const drawer = document.getElementById('cart-drawer');
        const close = document.getElementById('cart-close');
        const clearBtn = document.getElementById('cart-clear');
        toggle && toggle.addEventListener('click', ()=> drawer.classList.toggle('hidden'));
        close && close.addEventListener('click', ()=> drawer.classList.add('hidden'));
        clearBtn && clearBtn.addEventListener('click', ()=>{ if(confirm('Limpar o carrinho?')) clearCart(); });

        // delegate quantity and remove
        document.body.addEventListener('click', (e)=>{
            if(e.target.matches('.cart-remove')){ const id = Number(e.target.dataset.id); removeItem(id); }
            if(e.target.matches('.qty-plus')){ const id = Number(e.target.dataset.id); const it = cart.find(i=>i.id===id); if(it) updateQty(id, it.qty+1); }
            if(e.target.matches('.qty-minus')){ const id = Number(e.target.dataset.id); const it = cart.find(i=>i.id===id); if(it) updateQty(id, it.qty-1); }
        });

        // handle add selected buttons for product pages
        document.body.addEventListener('click', (e)=>{
            if(e.target.matches('.add-selected-to-cart')){
                e.preventDefault();
                const form = e.target.closest('form');
                if(!form) return;
                const checks = Array.from(form.querySelectorAll('input[type="checkbox"]:checked'));
                if(checks.length===0){ alert('Selecione ao menos um item.'); return; }
                checks.forEach(input=>{
                    const label = input.closest('label');
                    const name = label ? (label.querySelector('h3')?.innerText || input.dataset.name || input.value) : (input.dataset.name||input.value);
                    const price = parseFloat((input.dataset.price||0).toString().replace(',','.')) || 0;
                    addItem({ sku: input.value, name, price, qty: 1 });
                });
                alert('Itens adicionados ao carrinho.');
            }

            if(e.target.matches('.add-pizza-to-cart')){
                e.preventDefault();
                const form = e.target.closest('form');
                if(!form) return;
                const size = form.querySelector('input[name="tamanho-pizza"]:checked')?.value;
                const checks = Array.from(form.querySelectorAll('input[name="sabor-pizza"]:checked'));
                const sizePriceMap = { '1/2':48.9,'1/3':39.9,'1/4':29.9,'individual':24.9,'kids':14.9 };
                const price = sizePriceMap[size] || 0;
                const name = `Pizza ${size} - ${checks.map(c=>c.value).join(', ')}`;
                addItem({ sku: 'pizza-'+Date.now(), name, price, qty: 1 });
                alert('Pizza adicionada ao carrinho.');
            }

            if(e.target.matches('.add-xis-to-cart')){
                e.preventDefault();
                const form = e.target.closest('form');
                if(!form) return;
                const size = form.querySelector('input[name="tamanho-xis"]:checked')?.value;
                const sabor = form.querySelector('input[name="sabor-xis"]:checked')?.value;
                const priceMap = { 'xis-grande':34.9, 'xis-pequeno':24.9 };
                const price = priceMap[size] || 0;
                const name = `Xis (${size}) - ${sabor}`;
                addItem({ sku: 'xis-'+Date.now(), name, price, qty:1 });
                alert('Xis adicionado ao carrinho.');
            }
        });

    }

    function updateBadge(){ const b = document.getElementById('cart-badge'); const qty = cart.reduce((s,i)=>s + (i.qty||0),0); if(b) b.innerText = qty; const toggle = document.getElementById('cart-toggle'); if(toggle){ toggle.dataset.count = qty; } }

    function renderCart(){
        const container = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');
        if(!container) return;
        container.innerHTML = '';
        if(cart.length===0){ container.innerHTML = '<p class="muted">Seu carrinho está vazio.</p>'; totalEl && (totalEl.innerText = formatPrice(0)); return; }
        cart.forEach(it=>{
            const row = document.createElement('div');
            row.className = 'cart-row';
            row.innerHTML = `<div class="cart-name">${escapeHtml(it.name)}</div>
                <div class="cart-controls">
                  <button class="qty-minus" data-id="${it.id}">−</button>
                  <span class="cart-qty">${it.qty}</span>
                  <button class="qty-plus" data-id="${it.id}">+</button>
                  <div class="cart-price">${formatPrice(it.price * it.qty)}</div>
                  <button class="cart-remove" data-id="${it.id}" aria-label="Remover">✕</button>
                </div>`;
            container.appendChild(row);
        });
        totalEl && (totalEl.innerText = formatPrice(getTotal()));
    }

    function escapeHtml(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    // expose for debugging
    window.PizzariaCart = { addItem, removeItem, updateQty, clearCart, getCart: ()=>cart, getTotal, load, save };

    // ensure saving on unload
    window.addEventListener('beforeunload', save);

})();
