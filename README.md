# Cia das Pizzas

Site de pedidos com servidor Node.js, armazenamento persistente dos pedidos e painel protegido para a cozinha.

## Publicar no Render sem domínio próprio

O Render fornece um endereço HTTPS temporário (`onrender.com`), sem precisar registrar domínio. O projeto está preparado para criar o servidor Node.js e um disco persistente para os pedidos.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Simoes101/Cia-Das-Pizzas-finalizado)

1. Clique em **Deploy to Render** e crie uma conta ou entre na sua conta Render. Autorize o acesso ao repositório público `Simoes101/Cia-Das-Pizzas-finalizado` se solicitado.
2. O Render lerá o Blueprint `render.yaml`. Antes de confirmar, confira o preço do serviço **Starter**, do disco de 1 GB, a moeda, os impostos e o total apresentado. O plano gratuito não mantém o disco persistente necessário para guardar os pedidos. Se o custo convertido ultrapassar seu limite de R$ 60 por mês ou houver cobrança antecipada que você não aceite, pare nesta tela; não confirme.
3. Na configuração do Blueprint, crie uma senha forte e exclusiva para `KITCHEN_PASSWORD`. Guarde-a em local privado; ela protege o painel da cozinha. Não a envie por chat nem a coloque no GitHub.
4. Só depois de conferir o custo e decidir prosseguir, confirme a criação e aguarde o deploy terminar. O Render fornecerá um endereço como `https://cia-das-pizzas.onrender.com`.
5. Teste o endereço: a página inicial deve abrir e `https://SEU-ENDERECO/api/health` deve responder `{"status":"ok"}`. Abra `https://SEU-ENDERECO/cozinha.html` e entre com o usuário `cozinha` e a senha criada no passo 3. Faça um pedido de teste e confirme que ele aparece no painel.

O projeto está configurado para não fazer deploy automático a cada alteração do GitHub. Para publicar uma atualização no futuro, use **Manual Deploy** no serviço do Render. Os pedidos ficam no disco persistente; não remova o disco, pois isso apaga o histórico armazenado nele. Confira também os preços e regras atuais na [página oficial de preços do Render](https://render.com/pricing) antes de autorizar qualquer cobrança.

## Hospedar em uma VPS HostGator

Esta opção usa Docker, mantém os pedidos em um volume persistente e configura HTTPS automaticamente com Caddy. Para começar sem comprar domínio, use um endereço temporário gratuito do [sslip.io](https://sslip.io/), que aponta para o IP da VPS. Para montar esse endereço, troque os pontos do IPv4 do servidor por hífens e acrescente `.sslip.io` (por exemplo, `203-0-113-10.sslip.io`); um domínio próprio pode ser conectado depois.

### Publicar no AlmaLinux 9

1. Conecte à VPS pelo PowerShell do Windows:

   ```powershell
   ssh -p 22022 root@IP_DA_VPS
   ```

   Nunca compartilhe a senha root. A HostGator também permite abrir um console no Portal do Cliente.

2. Se o firewalld já estiver ativo, libere SSH, HTTP e HTTPS antes de publicar:

   ```bash
   if systemctl is-active --quiet firewalld; then
     firewall-cmd --permanent --add-port=22022/tcp
     firewall-cmd --permanent --add-service=http
     firewall-cmd --permanent --add-service=https
     firewall-cmd --reload
   fi
   ```

   Não ative o firewalld sem primeiro configurar a porta SSH da VPS; bloqueá-la pode interromper seu acesso. Se o painel HostGator tiver regras de rede para a VPS, libere as portas **22022, 80 e 443** nele.

3. Inicie o Docker e baixe o projeto:

   ```bash
   systemctl enable --now docker
   docker compose version
   git clone https://github.com/Simoes101/Cia-Das-Pizzas-finalizado.git /opt/cia-das-pizzas
   cd /opt/cia-das-pizzas
   ```

4. Configure uma senha forte e exclusiva para o painel da cozinha e o endereço temporário:

   ```bash
   password=$(openssl rand -hex 24)
   printf 'KITCHEN_PASSWORD=%s\nSITE_DOMAIN=IP-COM-HIFENS.sslip.io\n' "$password" > .env
   chmod 600 .env
   printf 'Senha do painel da cozinha: %s\n' "$password"
   unset password
   ```

   Guarde a senha exibida em local seguro; ela será usada com o usuário `cozinha`. Não publique o arquivo `.env`.

5. Inicie o site e confirme que os serviços estão ativos:

   ```bash
   docker compose up -d --build
   docker compose ps
   curl https://IP-COM-HIFENS.sslip.io/api/health
   ```

   A resposta esperada do último comando contém `"status":"ok"`. Caddy solicita e renova automaticamente o certificado HTTPS. A primeira emissão pode levar alguns minutos.

6. Abra `https://IP-COM-HIFENS.sslip.io` para o cardápio e `https://IP-COM-HIFENS.sslip.io/cozinha.html` para o painel, substituindo `IP-COM-HIFENS` pelo IPv4 da VPS com pontos trocados por hífens. Entre com o usuário `cozinha` e a senha do passo 4. Faça um pedido de teste e confirme que ele aparece na cozinha.

Para usar um domínio próprio depois, configure os registros DNS para apontarem à VPS, altere `SITE_DOMAIN` no `.env` e reinicie os serviços com `docker compose up -d`.

### Atualizações e cópias de segurança

Para publicar atualizações do GitHub sem apagar os pedidos:

```bash
cd /opt/cia-das-pizzas
git pull
docker compose up -d --build
```

Os pedidos ficam no volume Docker `orders`, que não é apagado ao reconstruir ou reiniciar o contêiner. Faça cópias regulares e guarde-as também fora da VPS; um backup no mesmo servidor não protege contra falha ou perda do servidor:

```bash
mkdir -p backups
docker compose exec -T app sh -c 'cat "$DATA_DIR/pedidos.json"' > "backups/pedidos-$(date +%F).json"
```

Copie os arquivos da pasta `backups` para um computador seguro. Não execute `docker compose down -v`: a opção `-v` remove o volume que contém os pedidos.

## Executar localmente

Requer Node.js 18 ou superior:

```powershell
npm ci
$env:KITCHEN_PASSWORD = "uma-senha-local"
npm start
```

Abra `http://localhost:3000` para o cardápio e `http://localhost:3000/cozinha.html` para o painel. Em produção, `KITCHEN_PASSWORD` é obrigatório; o servidor falha ao iniciar se a senha não estiver configurada. `DATA_DIR` é opcional e, quando não definido, os pedidos são gravados em `~/.cia-das-pizzas`.

## Funcionamento

- Os pedidos são validados e gravados em `pedidos.json` dentro do diretório definido por `DATA_DIR`.
- A tela da cozinha consulta pedidos recentes a cada três segundos. O histórico é carregado sem imprimir novamente pedidos antigos.
- Cada comanda é impressa somente quando alguém clica em **Imprimir comanda** e confirma a impressora no navegador.
- A rota de saúde para monitoramento é `GET /api/health`.
