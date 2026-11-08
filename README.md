# Cia das Pizzas

Site de pedidos com servidor Node.js, armazenamento persistente dos pedidos e painel protegido para a cozinha.

## Hospedar em uma VPS HostGator

Esta opção usa Docker e mantém os pedidos em um volume persistente do servidor. A compra da VPS, do domínio e qualquer pagamento ficam por conta do proprietário. **Não receba pedidos reais por HTTP sem HTTPS.**

### Antes de contratar

1. Na [página de VPS da HostGator](https://www.hostgator.com.br/servidor-vps), confira o preço do ciclo **Mensal** antes de pagar. O [guia oficial de contratação](https://suporte.hostgator.com.br/hc/pt-br/articles/45892434068243-Como-contratar-uma-VPS-na-HostGator) informa as opções mensal, anual, bienal e trienal. O valor promocional destacado pode exigir pagamento antecipado de vários anos; não prossiga se o total ou o período não forem os que você quer.
2. Para um site pequeno, o plano inicial (NVMe 2, atualmente informado com 1 vCPU, 2 GB de RAM e 50 GB) deve ser suficiente. Selecione a aplicação **Docker** e não adicione uma licença cPanel.
3. Como você ainda não tem domínio, será preciso registrar um para ter um endereço próprio e ativar HTTPS. O domínio pode ter custo separado e normalmente é renovado anualmente; confira também esse valor antes de pagar.
4. Escolha Pix se essa forma aparecer no carrinho. O [Pix Automático](https://suporte.hostgator.com.br/hc/pt-br/articles/42481864736787-Como-ativar-e-cancelar-o-Pix-Recorrente) é autorizado no aplicativo do banco; confira o valor máximo e a recorrência antes de autorizar.

### Preparar o DNS

Depois de contratar e receber o endereço IP da VPS:

1. Registre um domínio e abra o gerenciamento de DNS do domínio.
2. Crie um registro **A** para o domínio raiz (`@`) apontando para o IP da VPS.
3. Crie outro registro **A** para `www` apontando para o mesmo IP. Aguarde a propagação antes de configurar o certificado.

### Publicar o site

Os comandos abaixo são executados no terminal da VPS, depois de conectar por SSH. No Windows, abra o PowerShell e use `ssh root@IP_DA_VPS`, trocando pelo IP recebido. Nunca compartilhe a senha de root ou a senha da cozinha no GitHub ou no chat.

1. Instale as ferramentas necessárias e prepare o proxy no AlmaLinux:

   ```bash
   dnf install -y git nginx nano policycoreutils-python-utils
   setsebool -P httpd_can_network_connect 1
   systemctl enable --now nginx
   ```

   Confira se o Docker e o Compose estão disponíveis:

   ```bash
   docker --version
   docker compose version
   ```

   Se algum comando não existir, instale o Docker seguindo o [guia oficial da HostGator para VPS AlmaLinux](https://suporte.hostgator.com.br/hc/pt-br/articles/45902431236243-Como-instalar-o-n8n-via-Docker-Docker-Compose-no-VPS-AlmaLinux-9), nas etapas de instalação do Docker e do Docker Compose.

2. Baixe o projeto e crie uma senha forte para o painel da cozinha:

   ```bash
   git clone https://github.com/Simoes101/Cia-Das-Pizzas-finalizado.git /opt/cia-das-pizzas
   cd /opt/cia-das-pizzas
   cp .env.example .env
   openssl rand -hex 24
   nano .env
   ```

   Copie o valor gerado pelo `openssl` para `KITCHEN_PASSWORD=` no arquivo `.env`, salve com `Ctrl+O`, `Enter` e saia com `Ctrl+X`. Proteja o arquivo:

   ```bash
   chmod 600 .env
   ```

3. Inicie o site:

   ```bash
   docker compose up -d --build
   docker compose ps
   curl http://127.0.0.1:3000/api/health
   ```

   A resposta esperada do último comando contém `"status":"ok"`. O Docker Compose publica a aplicação somente em `127.0.0.1`, para que visitantes não acessem o servidor sem passar pelo Nginx.

4. Configure o Nginx. Copie o exemplo, substitua `exemplo.com.br` e `www.exemplo.com.br` pelo seu domínio e teste a configuração:

   ```bash
   cp /opt/cia-das-pizzas/deploy/nginx.conf.example /etc/nginx/conf.d/cia-das-pizzas.conf
   nano /etc/nginx/conf.d/cia-das-pizzas.conf
   nginx -t
   systemctl reload nginx
   ```

5. Libere as portas **80 (HTTP)** e **443 (HTTPS)** no firewall do AlmaLinux e, se o painel do provedor tiver regras de rede, também nele:

   ```bash
   systemctl enable --now firewalld
   firewall-cmd --permanent --add-service=http --add-service=https
   firewall-cmd --reload
   ```

   Instale o Certbot e emita o certificado para os nomes que realmente apontam para a VPS:

   ```bash
   dnf install -y epel-release
   dnf install -y certbot python3-certbot-nginx
   certbot --nginx -d SEU-DOMINIO -d www.SEU-DOMINIO
   certbot renew --dry-run
   ```

   Substitua `SEU-DOMINIO` pelo domínio registrado. O Certbot solicitará um e-mail e configurará HTTPS no Nginx. Se você não criou o registro `www`, remova `-d www.SEU-DOMINIO`.

6. Abra `https://SEU-DOMINIO` para o cardápio e `https://SEU-DOMINIO/cozinha.html` no computador da pizzaria. O painel pede o usuário `cozinha` e a senha anotada no passo 2.

7. Faça um pedido de teste. Na cozinha, confira os dados e clique em **Imprimir comanda**; escolha a impressora da rede e use **Testar impressão** para ajustar papel e margens.

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

Abra `http://localhost:3000` para o cardápio e `http://localhost:3000/cozinha.html` para o painel. Em produção, `KITCHEN_PASSWORD` é obrigatório; o servidor falha ao iniciar se a senha não estiver configurada. `DATA_DIR` é opcional e, quando não definido, os pedidos são gravados em `~/.cia-das-pizzas`.

## Funcionamento

- Os pedidos são validados e gravados em `pedidos.json` dentro do diretório definido por `DATA_DIR`.
- A tela da cozinha consulta pedidos recentes a cada três segundos. O histórico é carregado sem imprimir novamente pedidos antigos.
- Cada comanda é impressa somente quando alguém clica em **Imprimir comanda** e confirma a impressora no navegador.
- A rota de saúde para monitoramento é `GET /api/health`.
