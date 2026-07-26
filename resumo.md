# Resumo do Projeto Apiário Tech

> Documento de resumo com todos os passos realizados até ao momento.
> Última atualização: 22 de julho de 2026 (v0.7.0)

---

## Estado geral

**Fase atual:** Firmware de produção — sketch modular completo (sensores + RTC + OLED + microSD + Wi-Fi/HTTP) pronto a carregar no ESP32 para enviar leituras para a API
**Versão documental:** 0.7.0
**Repositório:** https://github.com/patricia-sousa-silva/apiario-tech

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma 7 |
| Base de dados | PostgreSQL |
| Frontend | React + Vite + TypeScript |
| Gráficos | Recharts |
| Firmware | Arduino C++ (ESP32) |

---

## Passos realizados

### 1. Criação do repositório

- Repositório GitHub criado com o nome `apiario-tech`.
- Commit inicial realizado.

### 2. Fundação documental (PR #1 — branch `docs/fundacao-projeto`)

- **README.md** criado com:
  - Visão geral do projeto (plataforma IoT para monitorização de apiários).
  - Três componentes principais: Firmware (ESP32), Backend (API) e Plataforma Web.
  - Objetivos do projeto.
  - Definição do MVP.
  - Descrição do protótipo físico (ESP32, BME280, DS18B20, RTC, OLED, microSD, HX711, alimentação solar).
  - Arquitetura inicial (diagrama Mermaid).
  - Organização prevista de pastas.
  - Próximos marcos.
  - Política de segurança.

- **docs/01-visao-e-ambito.md** criado com:
  - Contexto e problema (duas colmeias, sem Internet permanente).
  - Visão do produto.
  - Objetivos principais e de longo prazo.
  - Utilizadores e intervenientes (Administrador, Apicultor, ESP32, Equipa de desenvolvimento).
  - Âmbito do MVP (funcionalidades incluídas e limites).
  - Regras e princípios do produto (8 regras).
  - Condicionantes e pressupostos.
  - Critérios de sucesso do MVP (10 critérios).
  - Riscos iniciais (7 riscos com tratamento).
  - Fases previstas (Fase 0 a Fase 7).
  - Decisões em aberto.

- **docs/02-estado-atual-prototipo.md** criado com:
  - Contexto do piloto (2 colmeias, ESP32, alimentação solar, sem conectividade).
  - Inventário de hardware (12 componentes com estado documental).
  - Estado do firmware por área (11 áreas com ação necessária).
  - Problemas conhecidos (microSD, BME280, ausência de inventário técnico).
  - Ordem de estabilização acordada (8 passos).
  - Plano mínimo de validação em bancada (11 testes — HW-001 a HW-011).
  - Evidências a guardar por teste.
  - Critério de conclusão da Fase 0.

### 3. Importação e inventário do firmware original (PR #3 — branch `firmware/importacao-codigo-original`)

- **Preservação dos sketches originais** (fornecidos em `colmeias.zip`):
  - `firmware/legacy/original/colmeias/colmeias.ino` — Versão 1 (02-05-2026): OLED, BME280, duas DS18B20.
  - `firmware/legacy/original/colmeias/colmeias_relogio/colmeias_relogio.ino` — Versão 2 (06-05-2026): acrescenta RTC DS3231.
  - `firmware/legacy/original/colmeias/colemias_cartaosd/colemias_cartaosd.ino` — Versão 3 (07-06-2026): acrescenta microSD, CSV, scanner I2C e tolerância a falhas.

- **firmware/legacy/README.md** criado com:
  - Finalidade da pasta (preservação sem alterações).
  - Comparação funcional das 3 versões (tabela de capacidades).
  - Pinos encontrados no código (GPIO 21, 22, 4, 27, 18, 19, 23).
  - Bibliotecas identificadas (Wire, SPI, SD, Adafruit, OneWire, DallasTemperature, RTClib).
  - Resultado da análise estática (sem credenciais, sem erros de sintaxe evidentes).
  - 8 pontos técnicos a corrigir na futura versão.
  - Sequência de testes recomendada (4 passos).

### 4. Contrato de telemetria (docs/03-contrato-telemetria.md)

- **Formato CSV v1.0** definido com 10 colunas:
  - `device_id`, `timestamp` (ISO 8601 UTC), `temp_ext_c`, `humidity_pct`, `pressure_hpa`, `temp_nest1_c`, `temp_nest2_c`, `weight_g` (opcional), `battery_mv` (opcional), `status_flags`
- **Formato JSON** para futura API (mesmo modelo de dados)
- **Códigos de estado**: OK, BME280_FAIL, BME280_STALE, DS18B20_1_FAIL, DS18B20_2_FAIL, RTC_FAIL, SD_FAIL, HX711_FAIL, BATTERY_LOW
- **Valor sentinela**: -127.00 para falhas de sensores
- **Regras de validação**: intervalos aceitáveis, deduplicação por (device_id, timestamp)
- **Compatibilidade**: conversor para formato antigo do firmware original

### 5. Backend (pasta backend/)

- **Estrutura do projeto**:
  - Node.js + Express + TypeScript
  - Prisma 7 com PostgreSQL
  - Autenticação JWT
  - Validação com Zod

- **Schema da base de dados** (8 modelos):
  - `User` — utilizadores e autenticação
  - `Apiary` — apiários
  - `Hive` — colmeias
  - `Device` — dispositivos ESP32
  - `TelemetryReading` — leituras de telemetria
  - `AlertRule` — regras de alerta
  - `Alert` — alertas gerados
  - `Intervention` — intervenções (inspeções, alimentação, tratamentos)

- **API REST completa**:
  - `POST /api/auth/register` e `POST /api/auth/login` — autenticação
  - CRUD: `/api/apiaries`, `/api/hives`, `/api/devices`
  - `POST /api/devices/:id/regenerate-key` — regenera a chave de API de um dispositivo
  - `POST /api/telemetry` — ingestão JSON direta do dispositivo (chave `X-Device-Key`)
  - `POST /api/telemetry/import` — importação CSV com validação e deduplicação
  - `GET /api/telemetry` — histórico com filtros e paginação
  - `GET /api/telemetry/latest` — última leitura válida
  - CRUD: `/api/alert-rules`, `/api/alerts`, `/api/interventions`

- **Script de seed** com dados de exemplo:
  - Utilizador: patricia@apiariotech.pt / password123
  - Apiário Principal com 2 colmeias
  - Dispositivo ESP32-001
  - 25 leituras de exemplo
  - Regra de alerta e intervenção de exemplo

### 6. Frontend (pasta frontend/)

- **Estrutura do projeto**:
  - React + Vite + TypeScript
  - React Router para navegação
  - Axios para chamadas API
  - Context API para autenticação
  - Recharts para gráficos
  - Lucide React para ícones profissionais

- **Design profissional (v2.0)**:
  - Design system completo (paleta âmbar/mel, tipografia Inter, sombras, raios)
  - Sidebar escura com navegação ativa e menu de utilizador
  - Páginas de autenticação com layout dividido e branding
  - Cards de métricas modernos com ícones e badges de estado
  - Tabelas, modais, formulários e upload drag-and-drop
  - Design totalmente responsivo

- **Páginas implementadas (todas funcionais)**:
  - Login e Registo (layout profissional com painel de branding)
  - Dashboard com cards de métricas, leituras detalhadas e colmeias
  - Histórico com gráficos interativos (temperatura, humidade, peso) e tabela
  - Importação CSV com drag-and-drop e resumo de importação
  - Gestão de colmeias e apiários (CRUD com modais)
  - Intervenções (inspeções, alimentações, tratamentos, colheitas)
  - Alertas (regras configuráveis e reconhecimento de alertas)

### 7. Firmware de teste (pasta firmware/tests/)

- **6 sketches de teste isolados**:
  - `test_bme280/` — leitura e deteção de leitura congelada
  - `test_ds18b20/` — leitura por endereço físico (não por índice)
  - `test_oled/` — estados normal, aviso e erro
  - `test_rtc/` — configuração, leitura e retenção após corte
  - `test_microsd/` — init, criar, escrever, ler, fechar (teste bloqueador)
  - `test_hx711/` — leitura bruta e procedimento de calibração

- Cada sketch com:
  - Instruções de ligações
  - Bibliotecas necessárias
  - Critérios de aceitação
  - Mensagens detalhadas no monitor série

### 8. Melhorias de UI/UX (14 melhorias em 4 grupos)

- **Novos módulos partilhados**:
  - `utils/time.ts` — tempos relativos (`timeAgo`) e formatação de datas (`formatDateTime`).
  - `components/Toast.tsx` — notificações toast (sucesso/erro/aviso/info) com auto-fecho.
  - `components/ConfirmDialog.tsx` — diálogo de confirmação para ações destrutivas.
  - `context/ThemeContext.tsx` — tema claro/escuro com persistência e `prefers-color-scheme`.

- **Alto impacto**:
  - Auto-refresh do Dashboard (30 s) com indicador "Atualizado há X".
  - Modo escuro em toda a aplicação (variáveis CSS, toggle na topbar, persistência).
  - Badge de alertas pendentes no sino e na sidebar (polling 60 s).
  - Notificações toast em todas as páginas (substituem alertas inline).

- **Visualização de dados**:
  - Indicadores de tendência nos cards de métricas (setas, cores bom/mau).
  - Gráfico das últimas 24 h no Dashboard.
  - Linhas de referência nos gráficos do Histórico (limites das regras de alerta).
  - Variação de peso (ganho/perda) no Histórico.
  - Zoom com `Brush` no gráfico de temperatura.
  - Tooltip de gráfico personalizado.

- **Interação**:
  - ConfirmDialog em todas as ações destrutivas (substitui `window.confirm`).
  - Skeletons de carregamento no Dashboard.

- **Polimento**:
  - Tempos relativos em todo o lado (Dashboard, Alertas, Intervenções).
  - Sidebar off-canvas em mobile + topbar reorganizada (hambúrguer, tema, sino).

- **Validação**: `tsc --noEmit` sem erros; teste em browser sem erros de consola; todas as páginas renderizam; modo escuro funcional nos dois sentidos.

### 9. Novas melhorias de UI/UX (14 melhorias em 4 grupos)

- **Novos módulos partilhados**:
  - `components/EmptyState.tsx` — estado vazio reutilizável com ícone, mensagem e ação.
  - `components/ErrorBoundary.tsx` — captura erros de renderização com fallback e retry.
  - `components/GlobalSearch.tsx` — pesquisa global (colmeias, intervenções, alertas) na topbar.
  - `context/ConnectionContext.tsx` — estado da ligação à API (polling `/health`).
  - `utils/export.ts` — exportação CSV (com BOM) e PNG (rasterização de SVG).
  - `utils/notify.ts` — notificações do browser (Notification API) + beep (Web Audio).

- **Grupo 1 — Alto impacto**:
  - Seletor de períodos predefinidos no Histórico (Hoje, 24h, 7/30/90 dias, Tudo, Personalizado).
  - Empty states com orientação em todas as listagens.
  - Exportação de dados em CSV e dos gráficos em PNG.
  - Indicador de ligação à API (online/offline) com nova tentativa.

- **Grupo 2 — Análise de dados**:
  - Resumo do período com agregados (mínimo/média/máximo) por métrica.
  - Comparação de colmeias lado a lado (última leitura por colmeia no Dashboard).
  - Tendência da bateria com estimativa de autonomia (extrapolação linear).
  - Heatmap da temperatura por hora do dia (24 células).

- **Grupo 3 — Produtividade**:
  - Notificações do browser + som para alertas críticos (novos alertas via polling).
  - Pesquisa global de colmeias, intervenções e alertas com navegação direta.
  - Atalhos de teclado (1–6 navegam, T alterna o tema, / foca a pesquisa).

- **Grupo 4 — Robustez e acesso**:
  - Error boundaries + estados de carregamento em todas as páginas.
  - Acessibilidade: ARIA, foco visível (`:focus-visible`), skip-link, contraste melhorado, `prefers-reduced-motion`.
  - PWA instalável com offline shell (manifest + service worker, ícone próprio).

- **Backend**: rota pública `GET /api/health` para o indicador de ligação.

- **Validação**: `tsc --noEmit` e `vite build` sem erros; teste em browser — dashboard, histórico (períodos, agregados, bateria, heatmap), pesquisa global e atalhos funcionais; sem erros de consola (apenas 404 esperado de colmeia sem leituras).

### 10. Pipeline de ingestão de telemetria (o ESP32 liga-se à API)

- **Autenticação de dispositivo**:
  - Novo campo `apiKey` no modelo `Device` (único, prefixo `atk_`).
  - `middleware/deviceAuth.ts` — valida o cabeçalho `X-Device-Key` (ou `Authorization: Bearer`), rejeita chaves inválidas (401) e dispositivos inativos (403).
  - Chave gerada automaticamente na criação de um dispositivo.
  - Novo endpoint `POST /api/devices/:id/regenerate-key` — regenera a chave (a anterior deixa de funcionar).

- **Endpoint de ingestão** `POST /api/telemetry` (autenticado por chave de dispositivo):
  - Aceita leitura única, array de leituras ou `{ readings: [...] }` (formato JSON do contrato v1.0).
  - Validação com Zod + intervalos aceitáveis (LIMITS) e tratamento do valor sentinela `-127.00` (guardado como `null`).
  - Deduplicação por `(device_id, timestamp)`.
  - Atualiza `lastSeenAt` do dispositivo.
  - Resposta com contadores: `accepted`, `duplicated`, `rejected`, `alerts`, `errors`.

- **Avaliação automática de alertas** (`services/alertService.ts`):
  - `evaluateReading()` avalia todas as regras ativas contra cada leitura acabada de registar.
  - Cria alertas com mensagem legível (ex.: `Temp. ninho 1 = 39.2 °C — regra "X" (> 38 °C)`).
  - Deduplicação: não cria alertas repetidos enquanto existir um alerta não reconhecido da mesma regra para a mesma colmeia.
  - **Correção dos "alertas mortos"**: a avaliação passou a correr também na importação CSV (`importCsv`), que até agora nunca avaliava regras.

- **Seed**: dispositivo ESP32-001 com chave de API fixa para testes de ingestão.

- **Validação**: `tsc --noEmit` sem erros; testes de API — 401 sem chave, leitura única e em lote aceites, alerta criado ao violar `TEMP_NEST1 > 38` e não duplicado em violações seguintes, rejeição de valores fora do intervalo, sentinela como `null`; teste em browser — alerta visível na página de Alertas e badge "1" no sino e na sidebar.

### 11. Firmware de produção (pasta firmware/apiario_tech/)

- **Sketch modular e tolerante a falhas** para ESP32, organizado em módulos com responsabilidades separadas:
  - `config.h` — configuração central: identidade do dispositivo, Wi-Fi, URL e chave de API, pinos, intervalos (modo teste/produção), calibração do HX711 e da bateria, endereços das sondas DS18B20, ficheiros no microSD e NTP.
  - `telemetry.h/.cpp` — modelo `Reading`, bandeiras de estado (bitmask) e serialização JSON/CSV segundo o contrato v1.0 (sentinela `-127.00` → `null`, `weight_g`/`battery_mv` vazios quando indisponíveis, `status_flags` como array em JSON e separado por `|` em CSV).
  - `sensors.h/.cpp` — leitura tolerante a falhas do BME280 (com deteção de leitura congelada), das duas sondas DS18B20 (por endereço físico ou índice), do HX711 (peso omitido até estar calibrado) e da bateria (ADC com divisor de tensão).
  - `storage.h/.cpp` — persistência em microSD: arquivo permanente `apiario.csv` (formato do contrato, com rotação aos ~5 MB) e fila de envio `pendentes.csv` (JSON Lines, limpa após confirmação da API).
  - `comms.h/.cpp` — RTC DS3231 com relógio de recurso, ligação Wi-Fi, sincronização da hora por NTP (SNTP, UTC) e envio HTTP em lotes para `POST /api/telemetry` com `X-Device-Key`.
  - `oled.h/.cpp` — display de estado (módulos no arranque; leituras, peso, bateria e pendentes em ciclo).
  - `apiario_tech.ino` — orquestração: lê sensores, carimba com a hora UTC, grava no SD, atualiza o OLED e envia periodicamente as leituras pendentes.

- **Princípio de resiliência**: nenhuma falha individual (sensor, SD, Wi-Fi ou RTC) interrompe o ciclo — o dispositivo continua a medir e a guardar localmente, enviando quando houver ligação.

- **Envio idempotente**: as leituras pendentes só são removidas da fila após confirmação da API; reenvios não criam duplicados porque o backend deduplica por `(device_id, timestamp)`.

- **Compatibilidade verificada**: o JSON produzido pelo firmware corresponde ao schema Zod do endpoint de ingestão (`status_flags` aceite como array ou string).

- **Nota**: o firmware compila-se no Arduino IDE/CLI com as bibliotecas Adafruit (BME280, SSD1306, GFX), OneWire, DallasTemperature, HX711 e RTClib; a validação em hardware faz-se com os sketches de `firmware/tests/` antes de carregar o sketch de produção.

---

## Estrutura atual do repositório

```text
apiario-tech/
├── README.md
├── resumo.md
├── docs/
│   ├── 01-visao-e-ambito.md
│   ├── 02-estado-atual-prototipo.md
│   └── 03-contrato-telemetria.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma
│   ├── seed.ts
│   └── src/
│       ├── index.ts
│       ├── config.ts
│       ├── lib/prisma.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   └── deviceAuth.ts
│       ├── services/
│       │   └── alertService.ts
│       ├── routes/index.ts
│       └── controllers/
│           ├── authController.ts
│           ├── apiaryController.ts
│           ├── hiveController.ts
│           ├── deviceController.ts
│           ├── telemetryController.ts
│           ├── alertController.ts
│           └── interventionController.ts
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icon.svg
│   │   ├── manifest.webmanifest
│   │   └── sw.js
│   └── src/
│       ├── App.tsx
│       ├── App.css
│       ├── main.tsx
│       ├── api/client.ts
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   ├── ThemeContext.tsx
│       │   └── ConnectionContext.tsx
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── AuthLayout.tsx
│       │   ├── Toast.tsx
│       │   ├── ConfirmDialog.tsx
│       │   ├── EmptyState.tsx
│       │   ├── ErrorBoundary.tsx
│       │   └── GlobalSearch.tsx
│       ├── utils/
│       │   ├── time.ts
│       │   ├── export.ts
│       │   └── notify.ts
│       └── pages/
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── Dashboard.tsx
│           ├── History.tsx
│           ├── ImportCsv.tsx
│           ├── Hives.tsx
│           ├── Interventions.tsx
│           └── Alerts.tsx
└── firmware/
    ├── apiario_tech/
    │   ├── apiario_tech.ino
    │   ├── config.h
    │   ├── telemetry.h / telemetry.cpp
    │   ├── sensors.h / sensors.cpp
    │   ├── storage.h / storage.cpp
    │   ├── comms.h / comms.cpp
    │   └── oled.h / oled.cpp
    ├── legacy/
    │   ├── README.md
    │   └── original/colmeias/...
    └── tests/
        ├── test_bme280/
        ├── test_ds18b20/
        ├── test_oled/
        ├── test_rtc/
        ├── test_microsd/
        └── test_hx711/
```

---

## Histórico Git

| Commit | Descrição |
|---|---|
| `ae6c6cc` | Initial commit |
| `1f49051` | docs: expand project overview |
| `67dd6b5` | docs: add vision and scope |
| `036a38c` | docs: record current prototype state |
| `00c4adf` | docs: estabelecer a fundação documental do Apiário Tech (#1) |
| `2551857` | firmware: preserve original sensor sketch |
| `55af546` | firmware: preserve original RTC sketch |
| `4a67f9e` | firmware: preserve original microSD sketch |
| `9bcc17e` | docs: inventory original firmware versions |
| `3d676ee` | docs: link firmware inventory |
| `1a32083` | firmware: preservar e inventariar os sketches originais (#3) |
| `c74c678` | chore: configurar .gitignore para o projeto (segredos, gerados, builds) |
| `df324a7` | docs: contrato de telemetria v1.0 e documento de apresentação (PDF) |
| `bf2e183` | backend: API REST com autenticação JWT, telemetria, alertas e intervenções |
| `65648b2` | frontend: plataforma web com design profissional e todas as páginas funcionais |
| `12bebf9` | firmware: sketches de teste dos sensores (ESP32) |
| `da8b3a0` | docs: atualizar resumo.md para v0.3.0 (frontend completo) |
| `e35bfcc` | frontend: melhorias de ui/ux — tempo real, modo escuro, alertas visuais |
| `029e09d` | docs: atualizar resumo.md para v0.4.0 (melhorias de ui/ux) |
| `76929bd` | frontend: novas melhorias ui/ux — períodos, exportação, análise, notificações, pesquisa, acessibilidade e PWA |
| `f710087` | docs: atualizar resumo.md para v0.5.0 (novas melhorias ui/ux) |
| `8beda18` | backend: pipeline de ingestão de telemetria — auth de dispositivo, POST /telemetry, alertas automáticos e regenerate-key |
| `017ebf5` | firmware: sketch de produção modular (sensores, RTC, OLED, microSD, Wi-Fi/HTTP) para envio de telemetria |

---

## Próximos passos

### Para testar já (software)

1. **Instalar PostgreSQL** localmente e criar a base de dados `apiario_tech`
2. **Backend**:
   - `cd backend`
   - Copiar `.env.example` para `.env` e ajustar credenciais
   - `npm install`
   - `npm run db:generate`
   - `npm run db:migrate` (cria as tabelas)
   - `npm run db:seed` (dados de exemplo)
   - `npm run dev` (inicia em http://localhost:3001)
3. **Frontend**:
   - `cd frontend`
   - `npm install`
   - `npm run dev` (inicia em http://localhost:5173)
4. **Testar**: Login com patricia@apiariotech.pt / password123

### Para testar a ingestão de telemetria (simular o ESP32)

1. Obter a chave do dispositivo (no seed: `atk_dev_esp32001_chave_teste_0000000000000001`, ou regenerar via `POST /api/devices/:id/regenerate-key`).
2. Enviar uma leitura com `curl`:
   ```bash
   curl -X POST http://localhost:3001/api/telemetry \
     -H "Content-Type: application/json" \
     -H "X-Device-Key: <chave>" \
     -d '{"timestamp":"2026-07-22T12:00:00Z","temp_ext_c":24.5,"humidity_pct":60,"temp_nest1_c":35,"weight_g":42500,"battery_mv":12400,"status_flags":["OK"]}'
   ```
3. Verificar a resposta (`accepted`, `alerts`, …) e o alerta gerado na página de Alertas.

### Para testar junto ao ESP32 (firmware)

1. Carregar `test_bme280` e validar leitura
2. Carregar `test_ds18b20` e validar as duas sondas
3. Carregar `test_oled` e validar os três estados
4. Carregar `test_rtc` e validar retenção após corte
5. Carregar `test_microsd` — **teste bloqueador**
6. Carregar `test_hx711` e calibrar com peso conhecido
7. Preencher `firmware/apiario_tech/config.h` (Wi-Fi, chave de API, calibrações) e carregar `apiario_tech.ino`; confirmar no monitor série as leituras (JSON) e o envio para `POST /api/telemetry`

### Desenvolvimento futuro

- Validação do firmware de produção em hardware real (carregar no ESP32 e confirmar o fluxo completo sensores → microSD → API)
- Calibração final do HX711 (tara + fator de escala) e da bateria
- Teste contínuo de bancada
- Testes automatizados (unitários e de integração)
- Deploy em produção (cloud ou VPS)
- Comunicação remota (4G/LoRa/Wi-Fi) — fase posterior

---

## Decisões tomadas

| Decisão | Opção escolhida |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Base de dados | PostgreSQL |
| ORM | Prisma 7 |
| Frontend | React + Vite + TypeScript |
| Gráficos | Recharts |
| Autenticação | JWT |
| Formato de telemetria | CSV v1.0 (10 colunas) |

## Decisões ainda em aberto

- Intervalo normal de recolha de dados
- Pinos e esquema elétrico definitivo
- Configuração final das células de carga
- Alojamento da plataforma
- Tecnologia de comunicação remota no apiário
- Política de retenção e cópias de segurança
