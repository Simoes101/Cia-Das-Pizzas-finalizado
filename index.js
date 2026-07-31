const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve os arquivos do seu site (HTML, CSS, JS) - o mesmo servidor
// entrega o site pro cliente E recebe/distribui os pedidos.
app.use(express.static(__dirname));

const server = http.createServer(app);

// Configuração do Socket.io
const io = new Server(server, {
  cors: { origin: '*' }
});

// Guarda os últimos pedidos em memória, para a tela da cozinha
// conseguir recuperar o histórico caso a página seja recarregada.
const PEDIDOS_EM_MEMORIA = [];
const LIMITE_HISTORICO = 100;
let proximoId = 1000;

io.on('connection', (socket) => {
  console.log('⚡ Cozinha conectada em tempo real!');

  // Quando a tela da cozinha conecta (ou reconecta), manda o
  // histórico recente para ela não perder nenhum pedido.
  socket.emit('historico_pedidos', PEDIDOS_EM_MEMORIA);

  socket.on('pedido_impresso', (pedidoId) => {
    const pedido = PEDIDOS_EM_MEMORIA.find(p => p.id === pedidoId);
    if (pedido) pedido.impresso = true;
  });
});

// Rota para receber os pedidos reais do site (feito pelo cliente em casa)
app.post('/api/pedidos', (req, res) => {
  const dados = req.body || {};

  if (!dados.cliente || !dados.cliente.nome || !Array.isArray(dados.itens) || dados.itens.length === 0) {
    return res.status(400).json({ status: 'erro', mensagem: 'Dados do pedido incompletos.' });
  }

  const novoPedido = {
    id: proximoId++,
    cliente: dados.cliente,
    pagamento: dados.pagamento || 'não informado',
    itens: dados.itens,
    total: dados.total || 0,
    obsGeral: dados.obsGeral || '',
    criadoEm: new Date().toISOString(),
    impresso: false
  };

  PEDIDOS_EM_MEMORIA.push(novoPedido);
  if (PEDIDOS_EM_MEMORIA.length > LIMITE_HISTORICO) PEDIDOS_EM_MEMORIA.shift();

  console.log(`📦 Pedido #${novoPedido.id} recebido do cliente: ${novoPedido.cliente.nome}`);

  // Dispara o pedido direto para a tela da cozinha, que vai imprimir
  io.emit('novo_pedido', novoPedido);

  res.status(201).json({ status: 'sucesso', mensagem: 'Pedido enviado para a cozinha!', id: novoPedido.id });
});

// Rota auxiliar para consultar o status de um pedido pelo id
app.get('/api/pedidos/:id', (req, res) => {
  const pedido = PEDIDOS_EM_MEMORIA.find(p => p.id === Number(req.params.id));
  if (!pedido) return res.status(404).json({ status: 'erro', mensagem: 'Pedido não encontrado.' });
  res.json(pedido);
});

// Inicia o servidor. Em produção (Render, Railway etc.) a porta vem
// da variável de ambiente PORT; localmente cai na 3000.
const PORTA = process.env.PORT || 3000;
server.listen(PORTA, () => {
  console.log(`\n🚀 Servidor da Pizzaria rodando na porta: ${PORTA}`);
});
