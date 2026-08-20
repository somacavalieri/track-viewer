# PRD — Track Viewer (codinome)

**Visualizador pessoal de rotas .GPX para planejamento de trips de bicicleta**

- **Autor:** Soma Cavalieri
- **Data:** 2026-07-30 · **Revisado:** 2026-08-05 (backend: Supabase → **Neon**, ver §6 e §11)
- **Status:** Aprovado para planejamento de implementação
- **Usuário:** único (uso pessoal, sem público externo)

---

## 1. Problema

Hoje a melhor ferramenta web para visualizar rotas é o Google Earth, mas ela falha em três pontos para este uso:

1. **Peso e excesso de recursos** — o Google Earth carrega globo 3D, camadas, timeline e dezenas de funções irrelevantes para simplesmente ver trilhas num mapa. Fica lento e poluído.
2. **Não abre .GPX** — só aceita .KML, obrigando uma conversão manual a cada arquivo importado.
3. **Importação em massa ruim** — organizar dezenas/centenas de arquivos em pastas é trabalhoso.

O objetivo é uma ferramenta focada: abrir e organizar **inúmeros arquivos .GPX** sobre um mapa de satélite, com marcações de pontos de interesse, e nada além disso.

## 2. Objetivo

Substituir 100% o fluxo atual com Google Earth para planejamento de trips de bicicleta:

- Importar GPX em massa (pastas inteiras), **sem nenhuma conversão prévia**.
- Organizar trilhas em árvore de pastas com mostrar/esconder por pasta e por trilha.
- Marcar pontos categorizados (cachoeira, cidade, estacionamento, pin colorível).
- Mesmo acervo disponível no Mac, num segundo computador e no tablet.

### Não-objetivos (explicitamente fora)

- **Não** é editor ou criador de rotas (não desenha/edita traçados).
- **Não** faz navegação turn-by-turn nem é app de campo/offline.
- **Não** é multiusuário, social ou produto para venda — é ferramenta pessoal.
- **Não** tem app móvel nativo — no tablet roda pelo navegador.
- **Não** funciona offline (tiles e dados exigem internet).

## 3. Usuário e contexto de uso

Um único usuário (ciclista) planejando trips: baixa GPX de fontes variadas (Wikiloc, Strava, arquivos recebidos), acumula **centenas de trilhas** ao longo do tempo e as estuda no mapa de satélite para montar roteiros.

**Dispositivos:**

| Dispositivo | Frequência | Expectativa |
|---|---|---|
| Mac (principal) | 90% do uso | Experiência completa e fluida |
| Segundo computador | eventual | Idêntico ao Mac, mesmo acervo |
| Tablet | eventual | Mesmo acervo; performance aceitável, pode ser inferior |

## 4. Requisitos funcionais

### 4.1 Biblioteca (sidebar)

- **RF-01** Sidebar à esquerda com a árvore de pastas e trilhas e um **campo de filtro por nome** (filtra a árvore localmente); **recolhível** para ampliar o mapa.
- **RF-02** Pastas com **sub-pastas ilimitadas** (ex.: `Trips 2026 > Serra da Canastra > Dia 1`).
- **RF-03** Criar, renomear, mover e excluir pastas (excluir pede confirmação e remove o conteúdo).
- **RF-04** Trilhas: renomear, mover de pasta, trocar cor e excluir (com confirmação), via menu de contexto.
- **RF-05** **Olhinho por pasta**: liga/desliga a visibilidade de tudo dentro dela (recursivo). Olhinho por trilha individual também. Um item só aparece no mapa se ele **e todos os seus ancestrais** estiverem ligados.
- **RF-06** Estado dos olhinhos, sidebar e posição/zoom do mapa **persistem entre sessões**.
- **RF-07** Cada pasta exibe o total de trilhas contidas (incluindo sub-pastas).
- **RF-08** Clicar numa trilha na sidebar **voa até ela** no mapa (enquadra o traçado com margem).

### 4.2 Importação

- **RF-09** Importar **múltiplos arquivos ou uma pasta inteira** do disco em uma ação (seletor de pasta do navegador e/ou arrastar-e-soltar arquivos/pasta na janela).
- **RF-10** Escolher a pasta de destino na biblioteca no momento da importação; menu de contexto da pasta oferece **"Importar GPX aqui"**.
- **RF-11** Parse no navegador, aceitando trilhas (`<trk>`, multi-segmento) e rotas (`<rte>`). Arquivo com múltiplas trilhas gera múltiplas entradas.
- **RF-12** **Waypoints (`<wpt>`) do arquivo viram pontos** no mapa com ícone genérico (pin), ligados à trilha — aparecem/somem junto com ela e podem ser recategorizados ou apagados depois.
- **RF-13** Cálculo automático na importação: distância total, ganho de elevação (com suavização), bounding box.
- **RF-14** **Detecção de duplicados** por hash do arquivo: duplicado é pulado e listado no aviso final.
- **RF-15** Arquivo inválido não interrompe o lote; relatório ao final: `N importadas · M duplicadas · K com erro`.
- **RF-16** Importação de lote grande mostra barra de progresso e não trava a interface.
- **RF-17** O arquivo GPX **original é preservado** no armazenamento (nada de perda por simplificação).

### 4.3 Mapa e trilhas

- **RF-18** Mapa base: **satélite Esri World Imagery** + camada de referência com nomes de cidades, limites e vias por cima (visual "híbrido"). Atribuição exibida conforme exigido.
- **RF-19** Trilhas renderizadas como linhas coloridas com contorno escuro fino (contraste sobre satélite), espessura adaptada ao zoom.
- **RF-20** **Cor automática** por trilha (paleta viva que contrasta com satélite), com **troca manual** por trilha.
- **RF-21** Hover na trilha: cursor muda e a linha destaca. **Clique: painel com nome da trilha**, pasta, distância (km) e ganho de elevação (m), com ações rápidas (ir até, trocar cor, esconder).
- **RF-22** Botão **"enquadrar tudo"**: ajusta o mapa para todas as trilhas visíveis.

### 4.4 Pontos (marcações)

- **RF-23** Quatro categorias com ícones distintos: **Cachoeira**, **Cidade**, **Estacionamento** ("P") e **Pin genérico**. O Pin tem **cor selecionável** (paleta de 8 cores).
- **RF-24** Criar ponto de duas formas:
  - **Clicando no mapa** (modo "adicionar ponto" por botão, ou clique-direito → "criar ponto aqui");
  - **Digitando coordenadas**, aceitando decimal (`-21.9927, -44.9223`) e graus/min/seg (`21°59'34"S 44°55'20"W`).
- **RF-25** Cada ponto tem: categoria, **nome/título**, **notas** (texto livre), coordenadas (editáveis) e, opcionalmente, vínculo com uma trilha (caso dos waypoints importados).
- **RF-26** Clicar no ponto abre painel com nome, notas, categoria e ações (editar, recategorizar, excluir com confirmação).
- **RF-27** Pontos aparecem na sidebar numa seção própria, **agrupados por categoria**, com olhinho por categoria e por ponto; clicar num ponto na lista voa até ele. Ponto vinculado a trilha também some quando a trilha está escondida.

### 4.5 Navegação (mouse e toque)

- **RF-28** **Pan com o botão do meio pressionado** (cursor vira "mãozinha"; o autoscroll padrão do navegador é interceptado). Arrasto com botão esquerdo também faz pan.
- **RF-29** **Scroll = zoom** (rolar para cima aproxima, para baixo afasta), centrado no cursor. Botões **+ / −** na tela. Duplo clique aproxima.
- **RF-30** No tablet: arrastar com um dedo (pan) e pinçar (zoom), nativos do MapLibre.

### 4.6 Conta e sincronização

- **RF-31** **Login simples** com e-mail/senha (**Neon Auth** / Stack Auth). Cadastro público desabilitado — o único usuário é criado manualmente. Sessão persiste por aparelho.
- **RF-32** Toda a biblioteca (pastas, trilhas, pontos, estados de visibilidade) vive no **Neon (Postgres)**: **qualquer alteração em um aparelho aparece nos demais** no próximo carregamento.
- **RF-33** Dados protegidos por Row Level Security (somente o dono lê/escreve).

## 5. Requisitos não-funcionais

- **RNF-01 Performance de abertura:** com ~300 trilhas visíveis, mapa interativo em **< 5 s** em conexão doméstica (metadados no load; geometrias carregadas sob demanda com cache local para aberturas seguintes).
- **RNF-02 Fluidez:** pan/zoom sem engasgo perceptível no Mac (~60 fps); aceitável no tablet (≥ 30 fps) — viabilizado pela renderização em GPU do MapLibre e pela simplificação das linhas.
- **RNF-03 Importação:** lote de 100 arquivos processado em **< 2 min**.
- **RNF-04 Custo:** **R$ 0/mês** — tiers gratuitos (Neon free, hospedagem estática free, tiles Esri gratuitos com atribuição). Domínio próprio é opcional.
- **RNF-05 Privacidade:** dados de localização pessoais atrás de login; sem analytics ou rastreamento.
- **RNF-06 Compatibilidade:** Chrome/Edge/Safari atuais no desktop; Safari (iPad) e Chrome (Android) no tablet. Layout responsivo ≥ 768 px; em telefone funciona, mas não é otimizado.
- **RNF-07 Instalável (PWA):** manifest para "instalar" com ícone no Dock do Mac e na tela inicial do tablet (janela própria, sem cache offline).
- **RNF-08 Dados nunca presos:** GPX originais preservados (comprimidos no Postgres) e baixáveis; exportação completa entra no pós-MVP.

## 6. Stack e arquitetura

**SPA estática, sem servidor próprio.** Todo o processamento (parse, simplificação, hash) acontece no navegador; o **Neon** faz papel de banco e autenticação — o navegador fala direto com o Postgres via **Neon Data API** (PostgREST) protegido por RLS, e o login usa **Neon Auth** (Stack Auth). Os GPX originais ficam comprimidos no próprio Postgres (sem serviço de storage separado).

| Camada | Escolha | Observação |
|---|---|---|
| Frontend | React + Vite + TypeScript | SPA leve; estado com Zustand |
| Mapa | **MapLibre GL JS** | Render em GPU — requisito de fluidez com centenas de trilhas |
| Tiles satélite | Esri World Imagery (raster) | Sem chave de API; atribuição obrigatória |
| Tiles nomes/vias | Camada de referência Esri (places/transportation) | Sobreposta ao satélite |
| Parse GPX | `@tmcw/togeojson` | Converte trk/rte/wpt em GeoJSON; tolerante |
| Simplificação | Douglas-Peucker (`simplify-js`), alvo ~1–3 mil pontos/trilha | Roda em Web Worker para não travar a UI |
| Hash dedupe | SHA-256 via `crypto.subtle` | |
| Banco | **Neon** (Postgres serverless) | Tier gratuito; usuário já centraliza projetos no Neon |
| API do banco | **Neon Data API** (PostgREST) + RLS | Navegador → Postgres direto, sem backend próprio |
| Autenticação | **Neon Auth** (Stack Auth) | E-mail/senha; cadastro público desabilitado |
| Hospedagem | Cloudflare Pages (ou Netlify) | Deploy estático gratuito, URL própria |
| PWA | Manifest via `vite-plugin-pwa` | Sem service worker de cache offline |

### Modelo de dados (Neon)

```
folders    id · user_id · parent_id (nullable, árvore) · name · visible · expanded · created_at · updated_at
tracks     id · user_id · folder_id · name · color · visible
           geometry (JSONB — linha simplificada) · distance_m · gain_m · profile (JSONB)
           bbox · file_hash · created_at · updated_at
points     id · user_id · track_id (nullable) · category (agua|cidade|park|pin)
           pin_color · name · notes · lat · lng · visible · created_at · updated_at
gpx_files  user_id · hash (PK c/ user) · name · content (texto gzip/base64) · created_at
```

- Geometria simplificada no banco serve o render; o **GPX bruto fica em `gpx_files`** no próprio Postgres (comprimido — o TOAST do Postgres também comprime).
- Carregamento: lista de pastas/trilhas/pontos **sem geometria** no load; geometrias por demanda (batch por ids), com cache em IndexedDB — como a geometria de uma trilha é imutável após a importação, o cache por id não precisa de invalidação.
- **Fotos de pontos** (recurso vindo do design): ficam **locais (IndexedDB)** no MVP; sync via Cloudflare R2 entra no pós-MVP (blobs grandes não cabem no free tier do banco).

### Estimativa de capacidade (tier gratuito)

Centenas de trilhas ≈ dezenas de MB de geometria + ~50–150 MB de GPX comprimido, tudo no Postgres (limite Neon free: 0,5 GB). **Cabe com folga para centenas de trilhas**; se um dia apertar, mover `gpx_files` para R2 (10 GB free) é a válvula de escape.

### Alternativa considerada: Supabase (registro da decisão)

O Supabase foi a escolha original e segue sendo uma alternativa sólida. Pontos positivos dele:

- **Tudo integrado num serviço só**: Postgres + Auth + Storage (1 GB) + API REST com RLS — nenhuma peça extra para blobs (fotos/GPX).
- **Caminho mais batido**: muito mais documentação/exemplos do padrão "SPA estática + RLS"; Data API do Neon ainda é beta.
- **Auth nativo da própria plataforma** (o Neon Auth é o Stack Auth embutido, um produto terceiro).
- Ferramentas maduras de dashboard (editor de tabelas, logs, advisors de segurança).

**Por que o Neon venceu**: o usuário já centraliza seus projetos no Neon (um dashboard/conta a menos); o compute do Neon free hiberna mas **acorda em ~1 s** (não existe o "projeto pausado após 1 semana" do Supabase free, que exigia ping semanal); e para app de usuário único os dados são pequenos o bastante para o GPX morar no próprio Postgres. Migrar de um para o outro é viável depois — ambos são Postgres com RLS.

## 7. Layout (referência)

```
┌────────────┬──────────────────────────────────────────┐
│ ◀ SIDEBAR  │  MAPA (satélite + nomes)          [+][−] │
│ 🔍 filtro  │                                          │
│ ▸ 📁 Trips 2026 (37)        👁                        │
│   ▾ 📁 Canastra (12)        👁                        │
│     ── Trilha Casca d'Anta  👁  ← cor da linha        │
│     ── Dia 2 – travessia    👁                        │
│ ▸ 📁 Mantiqueira (24)       🚫                        │
│ ▾ 📍 Pontos                                           │
│   ▸ 💧 Cachoeiras (8)       👁         [enquadrar]    │
│   ▸ 🏙 Cidades (5)          👁         [+ ponto]      │
│   ▸ 🅿 Estacionamentos (3)  👁                        │
│   ▸ 📌 Pins (11)            👁    Esri · attribution  │
└────────────┴──────────────────────────────────────────┘
```

- Sidebar recolhe para uma alça fina; mapa ocupa tudo.
- `🔍 filtro`: campo que filtra a árvore por nome (client-side, sem custo).
- Painéis de trilha/ponto abrem ancorados ao clique (popup) ou como cartão sobre o mapa.

## 8. Escopo

### MVP

Tudo das seções 4–7: biblioteca em árvore com olhinhos, importação em massa com dedupe, mapa satélite híbrido, trilhas coloridas com painel de stats, pontos categorizados (criação por clique e por coordenadas), navegação de mouse/toque, login, sync entre aparelhos, PWA instalável.

### Pós-MVP (ordem de prioridade)

1. **Busca de lugares** — campo de geocoding (Nominatim/Photon, gratuitos) para voar até uma cidade/região ao planejar trips distantes.
2. **Exportar** — baixar pontos e trilhas como GPX/KML (garantia extra de dados livres).
3. **Camada topográfica** — alternar satélite ⇄ relevo (OpenTopoMap, gratuito) para ler montanha.
4. **Perfil de elevação** — gráfico no painel da trilha.
5. **Sync de fotos de pontos** — hoje locais (IndexedDB); subir para Cloudflare R2 e referenciar por URL.

### Avaliados e deixados de fora (por ora)

Régua de medição de distância · arrastar ponto para reposicionar (edição é por coordenadas) · foto/link anexado a ponto · modo offline.

## 9. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| **Neon Data API é beta** — mudanças de contrato/URL | Sync quebra até ajustar | Camada `remote.ts` isola o acesso; fallback é o modo local (IndexedDB) que segue funcionando |
| Compute do Neon free **hiberna** após inatividade | Primeira consulta do dia leva ~1 s extra | Aceitável (cold start transparente); sem necessidade de ping |
| Política dos tiles Esri mudar | Mapa base some | Trocar para MapTiler (chave gratuita) é troca de 1 URL de tile |
| GPX exóticos/quebrados | Falha de importação | Parser tolerante; erro isolado por arquivo com relatório |
| Botão do meio capturado pelo SO/navegador | Pan alternativo | Arrasto com botão esquerdo sempre disponível |
| Biblioteca crescer além dos 0,5 GB do Neon free | Custo ou limpeza | GPX comprimido; mover `gpx_files` para R2 (10 GB free); upgrade Neon (~US$ 5–19) só se um dia precisar |

## 10. Critérios de aceite do MVP

1. Importar uma pasta com 50 GPX **em uma única ação**, sem conversão, e ver todas as trilhas no satélite.
2. Esconder/mostrar uma pasta inteira com **1 clique** no olhinho; o estado sobrevive a recarregar a página.
3. Clicar numa trilha no mapa mostra **nome, distância e elevação**; clicar nela na sidebar **voa até o traçado**.
4. Criar um ponto **clicando no mapa** e outro **digitando coordenadas** (decimal e GMS); as 4 categorias têm ícones distintos e o pin aceita 8 cores.
5. Logar no segundo computador e no tablet e ver **exatamente o mesmo acervo**, incluindo alterações recentes.
6. Pan com botão do meio, zoom por scroll e botões +/− funcionando.
7. Custo mensal: **R$ 0**.

## 11. Decisões registradas

| Decisão | Motivo |
|---|---|
| Web app hospedado (e não app nativo/Electron) | Leveza, zero manutenção de build nativo e única opção que cobre o tablet |
| Esri World Imagery (e não Google) | Sem chave/billing/lock-in de SDK; qualidade suficiente; troca fácil se necessário |
| MapLibre GL (e não Leaflet) | GPU: fluidez com centenas de trilhas, sobretudo no tablet |
| **Neon como backend** (rev. 2026-08-05; antes Supabase) | Projetos do usuário já centralizados no Neon; sem pausa de projeto do free tier; dados pequenos permitem GPX no próprio Postgres. Positivos do Supabase registrados em §6 (Storage integrado, stack mais madura/documentada) — migração futura é viável, ambos são Postgres+RLS |
| Sub-pastas ilimitadas | Modelo mental já usado no Google Earth |
| Waypoints do GPX importados junto | Aproveita pontos prontos dos arquivos; recategorizáveis |
| Cor automática + ajuste manual | Distinguir trilhas sem trabalho manual obrigatório |
| Login simples (e não link secreto) | Trilhas e pontos são dados de localização pessoais |
| Clique na trilha = nome + stats (perfil de elevação depois) | Corte de MVP |

## 12. Questões em aberto (não bloqueiam)

- Nome definitivo da ferramenta (codinome atual: **Track Viewer**).
- URL: subdomínio gratuito do host (`*.pages.dev`) ou domínio próprio.
- Ícone do app (PWA).
