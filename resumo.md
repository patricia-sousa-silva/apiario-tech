# Resumo do Projeto Apiário Tech

> Documento de resumo com todos os passos realizados até ao momento.
> Última atualização: 22 de julho de 2026 (v0.3.0)

---

## Estado geral

**Fase atual:** Plataforma web completa (todas as páginas funcionais) com design profissional
**Versão documental:** 0.3.0
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
│       ├── middleware/auth.ts
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
│   └── src/
│       ├── App.tsx
│       ├── App.css
│       ├── api/client.ts
│       ├── context/AuthContext.tsx
│       ├── components/Layout.tsx
│       └── pages/
│           ├── Login.tsx
│           ├── Register.tsx
│           └── Dashboard.tsx
└── firmware/
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

### Para testar junto ao ESP32 (firmware)

1. Carregar `test_bme280` e validar leitura
2. Carregar `test_ds18b20` e validar as duas sondas
3. Carregar `test_oled` e validar os três estados
4. Carregar `test_rtc` e validar retenção após corte
5. Carregar `test_microsd` — **teste bloqueador**
6. Carregar `test_hx711` e calibrar com peso conhecido

### Desenvolvimento futuro

- Firmware base integrado (sensores + RTC + OLED + microSD + CSV)
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
