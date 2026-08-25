# 💈 Barbearia Wesley — Sistema da Barbearia Fagundes

Sistema web completo para a **Barbearia Fagundes** (barbeiro Wesley Fagundes):
site público com agendamento online em tempo real + painel administrativo
profissional com agenda, clientes, horários fixos, financeiro e relatórios.

## O que está incluído

**Área pública** (`/`)
- Landing page premium com a identidade visual da logo (azul marinho, vermelho,
  creme, selo recriado em SVG vetorial)
- Tabela de serviços vinda do banco (nome, descrição, preço, duração)
- Fluxo de agendamento em 4 passos otimizado para celular
  (`/agendar`): serviço → data → horário → dados → confirmação
- Só aparecem horários realmente livres — conflitos são bloqueados no banco
- Confirmação com "Adicionar à agenda" (Google Calendar) e "Falar com a barbearia" (WhatsApp)

**Painel administrativo** (`/admin`)
- Dashboard: saudação, faturamento do dia/mês, comparação com o mês anterior,
  ticket médio, próximo cliente, horários livres de hoje, gráfico de 14 dias
- Agenda visual (dia / semana / mês) com legenda: agendado, confirmado,
  em atendimento, concluído, **horário fixo**, bloqueado, intervalo
- Agendamentos: lista com filtros de período/status, mudança de status
  (agendado → confirmado → em atendimento → concluído / cancelado / não compareceu)
- Clientes: perfil com histórico, total gasto, serviço favorito, observações
- Serviços: CRUD completo com preço, duração, ícone e ativar/desativar
- **Horários fixos**: reserva semanal permanente por cliente (ex.: João, toda
  terça às 18:00) — bloqueia o site automaticamente; na agenda dá para converter
  a ocorrência em atendimento ou liberar uma data específica
- Financeiro: faturamento por período com comparação percentual, serviços que
  mais faturam, melhores dias, valores "a receber"
- Relatórios: comparação mensal, serviços mais vendidos, clientes mais
  frequentes, horários e dias mais movimentados
- Configurações: dados da barbearia (nome, logo, WhatsApp, Instagram, endereço),
  horários de funcionamento com intervalo, grade de horários, troca de senha

Somente atendimentos **concluídos** entram no faturamento — o lançamento
financeiro é automático (trigger no banco).

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + componentes próprios estilo shadcn/ui (Radix primitives)
- Framer Motion (animações) · Recharts (gráficos) · TanStack Query (dados)
- Supabase (PostgreSQL + Auth + RLS)

## Banco de dados

Todo o schema está em [`supabase/setup.sql`](supabase/setup.sql) — idempotente,
basta colar no **SQL Editor** do projeto Supabase e executar.

Tabelas: `settings`, `services`, `customers`, `appointments`,
`fixed_schedules`, `blocked_times`, `business_hours`,
`financial_transactions`, `barber_admins`.

Garantias no banco (não só no front):
- **Exclusion constraint** impede dois atendimentos no mesmo intervalo, mesmo
  com requisições simultâneas
- `get_available_slots(data, serviço)`: horários livres considerando duração do
  serviço, funcionamento, intervalo, bloqueios, horários fixos e antecedência mínima
- `create_booking(...)`: agendamento público com revalidação total no servidor
  (security definer) + anti-abuso (máx. 3 agendamentos futuros por WhatsApp)
- RLS: público só lê serviços ativos/configurações/horários; dados de clientes,
  agenda e financeiro são exclusivos de admins (`barber_admins` + `bf_is_admin()`)

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com a URL e a anon key do seu projeto Supabase
npm run dev
```

O projeto atual aponta para o Supabase `nrckscuogbperulzwbbl` (região/projeto
fornecido pelo dono). Para trocar de projeto: rode o `setup.sql` no projeto novo,
crie o usuário admin (Authentication → Add user, depois rode a seção 6 do SQL
com o e-mail correto) e atualize o `.env`.

## Acesso administrativo

- URL: `/admin/login`
- Usuário inicial: `guilherme@biasiengenharia.com.br` (a senha foi entregue em
  separado — **troque em Configurações → Conta** no primeiro acesso)
- Para adicionar outro admin (ex.: o Wesley): crie o usuário em
  Authentication → Users no Supabase e rode:

```sql
insert into public.barber_admins (user_id, display_name)
select id, 'Wesley' from auth.users where email = 'email-do-wesley@exemplo.com';
```

## Deploy

Qualquer host de estáticos serve (Vercel, Netlify, Cloudflare Pages):

```bash
npm run build   # gera dist/
```

Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no host
e aponte o build para `dist/` (SPA fallback para `index.html`).

## Próximos passos sugeridos (estrutura já preparada)

- Confirmação/lembrete automático por WhatsApp (tabela de agendamentos já tem
  status + telefone normalizado)
- Avaliação do atendimento e programa de fidelidade
- Cupons e integração PIX
- Múltiplos barbeiros (basta adicionar `barber_id` em `appointments` e incluir
  na exclusion constraint)
- Upload de logo/imagens via Supabase Storage
