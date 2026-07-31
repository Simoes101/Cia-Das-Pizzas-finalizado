document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. REGRAS DE SELEÇÃO DE TAMANHO E SABORES
    // ---------------------------------------------------------
    const limites = {
        '1/2': 2,        // Ajustado para limite real de meio a meio
        '1/3': 3,
        '1/4': 4,
        'individual': 1,
        'kids': 1
    };

    const radiosTamanho = document.querySelectorAll('input[name="tamanho-pizza"]');
    const checkboxesSabor = document.querySelectorAll('input[name="sabor-pizza"]');
    const dicaSabores = document.querySelector('.dica-sabores');

    function saboresMarcados() {
        return Array.from(checkboxesSabor).filter(cb => cb.checked);
    }

    function limiteAtual() {
        const tamanhoSelecionado = document.querySelector('input[name="tamanho-pizza"]:checked');
        return tamanhoSelecionado ? (limites[tamanhoSelecionado.value] || 1) : 1;
    }

    function atualizarDica(limite) {
        if (!dicaSabores) return;
        dicaSabores.textContent = limite === 1
            ? 'Escolha 1 sabor para este tamanho.'
            : `Escolha até ${limite} sabores para este tamanho.`;
    }

    function atualizarEstadoCheckboxes(limite) {
        const marcados = saboresMarcados();
        const atingiuLimite = marcados.length >= limite;

        checkboxesSabor.forEach(cb => {
            const label = cb.closest('label');
            if (!cb.checked && atingiuLimite) {
                cb.disabled = true;
                if (label) label.classList.add('opcao-desabilitada');
            } else {
                cb.disabled = false;
                if (label) label.classList.remove('opcao-desabilitada');
            }
        });
    }

    function aplicarLimiteDoTamanho() {
        const limite = limiteAtual();
        atualizarDica(limite);

        const marcados = saboresMarcados();
        if (marcados.length > limite) {
            marcados.slice(limite).forEach(cb => {
                cb.checked = false;
            });
        }

        atualizarEstadoCheckboxes(limite);
    }

    radiosTamanho.forEach(radio => {
        radio.addEventListener('change', aplicarLimiteDoTamanho);
    });

    checkboxesSabor.forEach(cb => {
        cb.addEventListener('change', () => {
            atualizarEstadoCheckboxes(limiteAtual());
        });
    });

    // Inicializa o estado dos limites
    aplicarLimiteDoTamanho();

    // ---------------------------------------------------------
    // 2. ESCUTA DO BOTÃO DE FINALIZAR PEDIDO
    // ---------------------------------------------------------
    const btnFinalizar = document.getElementById('btn-finalizar'); // Certifique-se de que o ID no seu HTML seja este
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', (e) => {
            e.preventDefault();
            finalizarPedido();
        });
    }
});

// ---------------------------------------------------------
// 3. ENVIAR PEDIDO PARA O SERVIDOR E IMPRESSORA DA COZINHA
// ---------------------------------------------------------
async function finalizarPedido() {
    // Coleta o nome do cliente (Ajuste o ID do seu campo se necessário)
    const campoNome = document.getElementById('nome-cliente');
    const nomeCliente = campoNome ? campoNome.value.trim() : 'Cliente Sem Nome';

    if (!nomeCliente) {
        alert('Por favor, digite seu nome antes de finalizar.');
        return;
    }

    // Coleta tamanho selecionado
    const tamanhoEl = document.querySelector('input[name="tamanho-pizza"]:checked');
    const tamanho = tamanhoEl ? tamanhoEl.value : 'Não informado';

    // Coleta sabores marcados
    const sabores = Array.from(document.querySelectorAll('input[name="sabor-pizza"]:checked'))
                        .map(cb => cb.value);

    if (sabores.length === 0) {
        alert('Selecione pelo menos 1 sabor de pizza!');
        return;
    }

    // Coleta observação geral (Ajuste o ID se necessário)
    const campoObs = document.getElementById('obs-geral');
    const obsGeral = campoObs ? campoObs.value : '';

    // Monta a lista de itens formatada para a impressora
    const itensPedido = [
        {
            qtd: 1,
            nome: `Pizza (${tamanho.toUpperCase()}) - ${sabores.join(' / ')}`,
            obs: ''
        }
    ];

    // Monta a estrutura final que vai para a cozinha
    const pedido = {
        id: Math.floor(1000 + Math.random() * 9000), // Gera ID único de 4 dígitos
        cliente: nomeCliente,
        itens: itensPedido,
        obsGeral: obsGeral
    };

    try {
        const resposta = await fetch('http://localhost:3000/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });

        if (!resposta.ok) throw new Error('Erro na resposta do servidor');

        const resultado = await resposta.json();
        alert(`Pedido #${pedido.id} recebido! Enviado para a impressora da cozinha.`);
    } catch (erro) {
        console.error('Erro ao enviar pedido:', erro);
        alert('Erro ao conectar com o servidor da cozinha. Verifique se o comando "node index.js" está rodando.');
    }
}