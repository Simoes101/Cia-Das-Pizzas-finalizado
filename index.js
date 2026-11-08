const express = require('express');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { timingSafeEqual } = require('crypto');

const app = express();
const server = http.createServer(app);

const dataDirectory = process.env.DATA_DIR || path.join(os.homedir(), '.cia-das-pizzas');
const ordersFile = path.join(dataDirectory, 'pedidos.json');
const kitchenPassword = process.env.KITCHEN_PASSWORD;

if (process.env.NODE_ENV === 'production' && !kitchenPassword) {
    throw new Error('Configure KITCHEN_PASSWORD antes de iniciar em produção.');
}

fs.mkdirSync(dataDirectory, { recursive: true });

let orders;
let nextOrderId;

try {
    const savedData = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    if (!Array.isArray(savedData.pedidos) || !Number.isInteger(savedData.proximoId)) {
        throw new Error('Formato inválido no arquivo de pedidos.');
    }
    orders = savedData.pedidos;
    nextOrderId = savedData.proximoId;
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw new Error(`Não foi possível carregar ${ordersFile}: ${error.message}`);
    }
    orders = [];
    nextOrderId = 1000;
}

function saveOrders(updatedOrders, updatedNextOrderId) {
    const temporaryFile = `${ordersFile}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify({
        proximoId: updatedNextOrderId,
        pedidos: updatedOrders
    }, null, 2), 'utf8');
    fs.renameSync(temporaryFile, ordersFile);
}

function authenticateKitchen(req, res, next) {
    if (!kitchenPassword) return next();

    const authorization = req.get('authorization') || '';
    const encodedCredentials = authorization.match(/^Basic\s+(.+)$/i);
    if (encodedCredentials) {
        const credentials = Buffer.from(encodedCredentials[1], 'base64').toString('utf8');
        const separator = credentials.indexOf(':');
        const username = credentials.slice(0, separator);
        const suppliedPassword = credentials.slice(separator + 1);
        const suppliedBuffer = Buffer.from(suppliedPassword);
        const expectedBuffer = Buffer.from(kitchenPassword);

        if (separator > 0 && username === 'cozinha'
            && suppliedBuffer.length === expectedBuffer.length
            && timingSafeEqual(suppliedBuffer, expectedBuffer)) {
            return next();
        }
    }

    res.set('WWW-Authenticate', 'Basic realm="Cia das Pizzas - Cozinha", charset="UTF-8"');
    return res.status(401).send('Acesso restrito ao painel da cozinha.');
}

function normalizeOrder(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }

    const customer = body.cliente;
    if (!customer || typeof customer !== 'object' || Array.isArray(customer)
        || typeof customer.nome !== 'string' || !customer.nome.trim()
        || typeof customer.telefone !== 'string' || !customer.telefone.trim()
        || !Array.isArray(body.itens) || body.itens.length === 0 || body.itens.length > 50) {
        return null;
    }

    const items = [];
    for (const item of body.itens) {
        if (!item || typeof item !== 'object') return null;

        const name = typeof item.name === 'string' ? item.name.trim()
            : typeof item.nome === 'string' ? item.nome.trim() : '';
        const qty = Number(item.qty ?? item.qtd);
        const price = Number(item.price);

        if (!name || name.length > 200 || !Number.isInteger(qty) || qty < 1 || qty > 99
            || !Number.isFinite(price) || price < 0 || price > 100000) {
            return null;
        }

        items.push({ name, qty, price });
    }

    const paymentMethods = ['pix', 'cartao', 'dinheiro'];
    const payment = paymentMethods.includes(body.pagamento) ? body.pagamento : null;
    if (!payment) return null;

    const lineTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const total = Math.round((lineTotal + Number.EPSILON) * 100) / 100;

    return {
        cliente: {
            nome: customer.nome.trim().slice(0, 120),
            telefone: customer.telefone.trim().slice(0, 40),
            rua: String(customer.rua || customer.endereco || '').trim().slice(0, 160),
            numero: String(customer.numero || '').trim().slice(0, 30),
            bairro: String(customer.bairro || '').trim().slice(0, 100),
            obs: String(customer.obs || customer.referencia || '').trim().slice(0, 300)
        },
        pagamento: payment,
        itens: items,
        total,
        obsGeral: String(body.obsGeral || '').trim().slice(0, 500)
    };
}

app.use(express.json({ limit: '100kb' }));

app.get('/cozinha.html', authenticateKitchen, (req, res) => {
    res.sendFile(path.join(__dirname, 'cozinha.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/pedidos', (req, res, next) => {
    const orderData = normalizeOrder(req.body);
    if (!orderData) {
        return res.status(400).json({ mensagem: 'Confira os dados do cliente, pagamento e itens do pedido.' });
    }

    const newOrder = {
        id: nextOrderId,
        ...orderData,
        criadoEm: new Date().toISOString()
    };
    const updatedOrders = [...orders, newOrder];

    try {
        saveOrders(updatedOrders, nextOrderId + 1);
    } catch (error) {
        return next(error);
    }

    orders = updatedOrders;
    nextOrderId += 1;
    console.log(`Pedido #${newOrder.id} recebido de ${newOrder.cliente.nome}.`);
    return res.status(201).json({ status: 'sucesso', id: newOrder.id, pedido: newOrder });
});

app.get('/api/pedidos', authenticateKitchen, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(orders.slice(-100));
});

app.use(express.static(__dirname, { index: 'index.html' }));

app.use((error, req, res, next) => {
    console.error('Erro ao processar a solicitação:', error);
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ mensagem: 'O corpo da solicitação não contém JSON válido.' });
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ mensagem: 'O pedido enviado excede o tamanho permitido.' });
    }
    return res.status(500).json({ mensagem: 'Não foi possível processar a solicitação.' });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Cia das Pizzas disponível na porta ${port}.`);
});
