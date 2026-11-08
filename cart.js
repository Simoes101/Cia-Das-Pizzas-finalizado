(function () {
    const STORAGE_KEY = 'pizzaria_cart_v1';
    let cart = [];

    function load() {
        try {
            const savedCart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            cart = Array.isArray(savedCart) ? savedCart : [];
        } catch (error) {
            console.error('Não foi possível carregar o carrinho:', error);
            cart = [];
        }
        renderCart();
        updateBadge();
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        renderCart();
        updateBadge();
    }

    function formatPrice(value) {
        return 'R$ ' + Number(value || 0).toFixed(2).replace('.', ',');
    }

    function addItem(item) {
        const key = item.sku || item.name;
        const existing = cart.find((entry) => (entry.sku || entry.name) === key);
        if (existing) {
            existing.qty = (existing.qty || 1) + (item.qty || 1);
        } else {
            cart.push({
                id: Date.now() + Math.random(),
                sku: item.sku,
                name: item.name,
                price: Number(item.price) || 0,
                qty: item.qty || 1
            });
        }
        save();
    }

    function removeItem(id) {
        cart = cart.filter((item) => item.id !== id);
        save();
    }

    function updateQty(id, qty) {
        const item = cart.find((entry) => entry.id === id);
        if (!item) return;
        item.qty = Math.max(0, Number(qty) || 0);
        if (item.qty === 0) removeItem(id);
        else save();
    }

    function clearCart() {
        cart = [];
        save();
    }

    function getTotal() {
        return cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function updateBadge() {
        const badge = document.getElementById('cart-badge');
        const quantity = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
        if (badge) badge.innerText = quantity;
    }

    function renderCart() {
        const container = document.getElementById('cart-items');
        const totalElement = document.getElementById('cart-total');
        if (!container) return;

        container.innerHTML = '';
        if (cart.length === 0) {
            container.innerHTML = '<p class="muted">Seu carrinho está vazio.</p>';
            if (totalElement) totalElement.innerText = formatPrice(0);
            return;
        }

        cart.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'cart-row';
            row.innerHTML = `<div class="cart-name">${escapeHtml(item.name)}</div>
                <div class="cart-controls">
                  <button type="button" class="qty-minus" data-id="${item.id}">−</button>
                  <span class="cart-qty">${item.qty}</span>
                  <button type="button" class="qty-plus" data-id="${item.id}">+</button>
                  <div class="cart-price">${formatPrice(item.price * item.qty)}</div>
                  <button type="button" class="cart-remove" data-id="${item.id}" aria-label="Remover">✕</button>
                </div>`;
            container.appendChild(row);
        });
        if (totalElement) totalElement.innerText = formatPrice(getTotal());
    }

    function buildCartPanel() {
        if (!document.body || document.getElementById('cart-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'cart-panel';
        panel.innerHTML = `
          <button id="cart-toggle" aria-label="Abrir carrinho"><span id="cart-badge">0</span> Carrinho</button>
          <div id="cart-drawer" class="hidden">
            <header><strong>Seu carrinho</strong><button type="button" id="cart-close">×</button></header>
            <div id="cart-items"></div>
            <footer>
              <div class="cart-total">Total: <span id="cart-total">R$ 0,00</span></div>
              <div class="cart-actions">
                <button type="button" id="cart-clear" class="button">Limpar</button>
                <a id="cart-checkout" class="button button-primary" href="pagamento.html">Finalizar pedido</a>
              </div>
            </footer>
          </div>`;
        document.body.appendChild(panel);
    }

    function addSelectedProducts(button) {
        const form = button.closest('form');
        if (!form) return;

        if (button.matches('.add-selected-to-cart')) {
            const selected = Array.from(form.querySelectorAll('input[type="checkbox"]:checked'));
            if (selected.length === 0) {
                alert('Selecione ao menos um item.');
                return;
            }
            selected.forEach((input) => {
                const label = input.closest('label');
                const heading = label && label.querySelector('h3');
                const name = heading ? heading.innerText : (input.dataset.name || input.value);
                const price = parseFloat((input.dataset.price || '0').replace(',', '.')) || 0;
                addItem({ sku: input.value, name, price, qty: 1 });
            });
            alert('Itens adicionados ao carrinho.');
            return;
        }

        if (button.matches('.add-pizza-to-cart')) {
            const size = form.querySelector('input[name="tamanho-pizza"]:checked');
            const flavors = Array.from(form.querySelectorAll('input[name="sabor-pizza"]:checked'));
            if (!size || flavors.length === 0) {
                alert('Selecione o tamanho e ao menos um sabor.');
                return;
            }
            const sizePriceMap = { '1/2': 48.9, '1/3': 39.9, '1/4': 29.9, individual: 24.9, kids: 14.9 };
            const name = `Pizza ${size.value} - ${flavors.map((flavor) => flavor.value).join(', ')}`;
            addItem({ sku: `pizza-${Date.now()}`, name, price: sizePriceMap[size.value] || 0, qty: 1 });
            alert('Pizza adicionada ao carrinho.');
            return;
        }

        if (button.matches('.add-xis-to-cart')) {
            const size = form.querySelector('input[name="tamanho-xis"]:checked');
            const flavor = form.querySelector('input[name="sabor-xis"]:checked');
            if (!size || !flavor) {
                alert('Selecione o tamanho e o sabor do xis.');
                return;
            }
            const priceMap = { 'xis-grande': 34.9, 'xis-pequeno': 24.9 };
            addItem({
                sku: `xis-${Date.now()}`,
                name: `Xis (${size.value}) - ${flavor.value}`,
                price: priceMap[size.value] || 0,
                qty: 1
            });
            alert('Xis adicionado ao carrinho.');
        }
    }

    function bindUI() {
        buildCartPanel();
        document.getElementById('cart-toggle')?.addEventListener('click', () => {
            document.getElementById('cart-drawer')?.classList.toggle('hidden');
        });
        document.getElementById('cart-close')?.addEventListener('click', () => {
            document.getElementById('cart-drawer')?.classList.add('hidden');
        });
        document.getElementById('cart-clear')?.addEventListener('click', () => {
            if (confirm('Limpar o carrinho?')) clearCart();
        });

        document.body.addEventListener('click', (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;

            const button = target.closest('button');
            if (!button) return;

            const id = Number(button.dataset.id);
            if (button.matches('.cart-remove')) removeItem(id);
            if (button.matches('.qty-plus')) {
                const item = cart.find((entry) => entry.id === id);
                if (item) updateQty(id, item.qty + 1);
            }
            if (button.matches('.qty-minus')) {
                const item = cart.find((entry) => entry.id === id);
                if (item) updateQty(id, item.qty - 1);
            }
            if (button.matches('.add-selected-to-cart, .add-pizza-to-cart, .add-xis-to-cart')) {
                event.preventDefault();
                addSelectedProducts(button);
            }
        });
    }

    window.PizzariaCart = {
        addItem,
        removeItem,
        updateQty,
        clearCart,
        getCart: () => cart,
        getTotal,
        load,
        save
    };

    document.addEventListener('DOMContentLoaded', () => {
        bindUI();
        load();
    });
})();
