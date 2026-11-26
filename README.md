# 🦅 Águia Dourada — Sistema de Metas

Site preto e dourado com painel ADM e painel das participantes, meta semanal de 140 perfis aprovados, avaliação de perfis do Instagram, ranking e metas extras.

## O que tem

**Painel ADM** (`/admin`)
- **Dashboard**: fila de avaliação, aprovados da semana, quantas bateram a meta, taxa de aprovação, gráfico dos últimos 7 dias, envios recentes.
- **Avaliação**: cada perfil enviado aparece num cartão. Clique no @perfil para abrir o Instagram, depois **Aprovar** ou **Recusar** (com motivo opcional). Dá para aprovar/recusar vários de uma vez.
- **Participantes**: criar contas (gera usuário e senha temporária e uma mensagem pronta para copiar e mandar no WhatsApp), meta individual, redefinir senha, desativar, excluir.
- **Ranking**: pódio e lista da semana atual e das anteriores.
- **Histórico**: todos os envios, com filtro, busca e opção de mudar a decisão ou apagar um envio.
- **Metas e ajustes**: meta semanal padrão (140), metas extras/bônus (ex.: Prata 170, Ouro 200), recado para a equipe, nome do site e link de acesso para copiar.

**Painel da participante** (`/painel`)
- Anel de progresso da meta (aprovados/140), quanto falta, comemoração com confete dourado ao bater a meta.
- Envio de links (um ou vários de uma vez, aceita link completo, link com `?igsh=` ou `@usuario`).
- Status de cada envio: Em avaliação / Aprovado / Recusado (com o motivo).
- Ranking, metas extras, recado do ADM, histórico das semanas anteriores.

**Segurança**: senhas com hash scrypt, sessão em cookie HttpOnly, proteção contra CSRF, limite de tentativas de login, troca obrigatória da senha temporária no primeiro acesso, cabeçalhos de segurança (CSP etc.).

## Regras assumidas (dá para mudar)
- A semana vai de **segunda 00:00 a domingo 23:59**, horário de Brasília.
- Um perfil aprovado conta na semana em que **foi enviado** (não na semana em que você aprovou), para ninguém perder meta por avaliação atrasada.
- Um mesmo perfil do Instagram **só pode ser enviado uma vez** no sistema inteiro (por qualquer participante). Para liberar, apague o envio no Histórico.
- Só links de **perfil** são aceitos (links de post, reels ou stories são recusados automaticamente).
- Existe uma única conta ADM, criada no primeiro acesso.

## Como rodar no seu computador

1. Instale o **Node.js 22.13 ou mais novo** (https://nodejs.org, versão LTS).
2. Abra o terminal nesta pasta e rode:
   ```bash
   npm install
   npm start
   ```
3. Abra **http://localhost:3000**. No primeiro acesso aparece a tela **Criar conta ADM**: escolha seu usuário e senha.
4. No painel, vá em **Participantes → + Nova participante**, crie as contas e mande a mensagem com o link e a senha para cada uma.

> Rodando só no seu computador, as meninas não conseguem entrar de outro lugar. Para elas acessarem, o site precisa estar hospedado (veja abaixo).

Teste automático do fluxo completo: `npm test`.

Os dados ficam no arquivo `data/sistema.db`. **Faça backup dessa pasta.**

## Como hospedar de graça (Render + Turso)

O plano grátis do Render apaga os arquivos quando o site "dorme" (após ~15 min sem acesso). Por isso, em produção o banco fica no **Turso** (SQLite na nuvem, grátis). Basta definir `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`; sem elas, o sistema usa o arquivo local `data/sistema.db`.

1. **Turso** (turso.tech, entrar com GitHub): crie um banco (ex.: `sistema-metas`). Copie a **URL** (`libsql://...turso.io`) e gere um **token** (botão "Create Token").
2. **Render** (render.com, entrar com GitHub): New → **Blueprint** → escolha o repositório `sistema-metas`. O arquivo `render.yaml` já configura tudo. O Render vai pedir 3 valores:
   - `SETUP_TOKEN`: um código secreto que você inventa (será pedido ao criar a conta ADM);
   - `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`: os valores do passo 1.
3. Clique em **Apply/Deploy**. Em ~3 minutos o site fica em `https://sistema-metas-xxxx.onrender.com`. Abra, crie a conta ADM com o código do `SETUP_TOKEN` e pronto.

Observação do plano grátis: depois de um tempo sem acesso o site "dorme" e o primeiro acesso demora uns 30 a 50 segundos para acordar. Os dados não se perdem (estão no Turso).

**Domínio próprio** (ex.: `suaequipe.com.br`, opcional e pago): compre no Registro.br, depois no Render vá em Settings → Custom Domains e cadastre o registro DNS que ele indicar. O HTTPS é automático.

Também dá para usar o `Dockerfile` em qualquer outra hospedagem (VPS, Fly.io, Railway), montando um disco em `/data` com `DATA_DIR=/data`.

## Estrutura
```
src/server.js   rotas, login, regras de meta e ranking
src/db.js       banco: SQLite local (embutido no Node) ou Turso na nuvem
render.yaml     configuração pronta para o Render
src/util.js     senhas, cálculo da semana, leitura de links do Instagram
public/         páginas, estilo preto e dourado, águia animada (SVG original)
test/e2e.js     teste do fluxo completo
```
