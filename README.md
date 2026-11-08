# Cia das Pizzas

Site de pedidos com servidor Node.js, armazenamento persistente dos pedidos e painel protegido para a cozinha.

## Publicar no Render

1. Envie este projeto para um repositório GitHub e, no Render, crie um serviço usando o Blueprint do repositório (`render.yaml`).
2. No Render, defina `KITCHEN_PASSWORD` com uma senha forte e exclusiva para a equipe. Não coloque essa senha no código nem no Git.
3. Faça o deploy e aguarde o serviço ficar disponível. O Render fornecerá um endereço HTTPS público para o cardápio.
4. Abra `https://SEU-ENDERECO/cozinha.html` no computador da pizzaria. O navegador pedirá o usuário `cozinha` e a senha configurada em `KITCHEN_PASSWORD`.
5. Faça um pedido de teste pelo site. O pedido deve aparecer no painel. Clique em **Imprimir comanda** e escolha a impressora de rede da cozinha na janela de impressão.
6. Use **Testar impressão** para conferir o tamanho do papel e as margens antes de começar a receber pedidos.

O Blueprint configura um disco persistente para que os pedidos não desapareçam quando o serviço reiniciar. O plano configurado no Render e o disco podem ter custo; confira os valores exibidos pelo Render antes de confirmar a criação do serviço. Não remova nem recrie o disco sem fazer backup, pois o histórico de pedidos está nele.

O computador da cozinha precisa permanecer ligado e conectado à internet. A impressão é confirmada por um funcionário no navegador; a impressora deve estar instalada e acessível nesse computador. O site não imprime automaticamente enquanto o painel estiver fechado.

## Executar localmente

Requer Node.js 18 ou superior:

```powershell
npm ci
$env:KITCHEN_PASSWORD = "uma-senha-local"
npm start
```

Abra `http://localhost:3000` para o cardápio e `http://localhost:3000/cozinha.html` para o painel. Em produção, `KITCHEN_PASSWORD` e `DATA_DIR` são obrigatórios; o servidor falha ao iniciar se não estiverem configurados.

## Funcionamento

- Os pedidos são validados e gravados em `pedidos.json` dentro do diretório definido por `DATA_DIR`.
- A tela da cozinha consulta pedidos recentes a cada três segundos. O histórico é carregado sem imprimir novamente pedidos antigos.
- Cada comanda é impressa somente quando alguém clica em **Imprimir comanda** e confirma a impressora no navegador.
- A rota de saúde para monitoramento é `GET /api/health`.
