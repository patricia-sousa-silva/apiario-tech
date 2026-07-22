# Contrato de telemetria

| Campo | Valor |
|---|---|
| Documento | Contrato de telemetria |
| Versão do contrato | 1.0 |
| Versão documental | 0.1.0 |
| Estado | Aprovado para implementação |
| Responsável | Patrícia Silva |
| Data | 22 de julho de 2026 |

## 1. Finalidade

Este documento define o formato único de telemetria do Apiário Tech, utilizado tanto na exportação CSV pelo ESP32 como na futura receção automática via API. Um só formato evita duplicação de regras, simplifica a importação e garante coerência entre o firmware e o backend.

## 2. Formato CSV

### 2.1 Regras gerais

| Propriedade | Valor |
|---|---|
| Separador | vírgula (`,`) |
| Codificação | UTF-8 sem BOM |
| Fim de linha | LF (`\n`) |
| Cabeçalho | obrigatório na primeira linha |
| Campos opcionais vazios | string vazia (nada entre vírgulas) |
| Casas decimais | 2 para temperatura e humidade; 1 para pressão; 0 para peso e bateria |
| Idioma dos identificadores | inglês (snake_case) |

### 2.2 Colunas

| # | Coluna | Tipo | Unidade | Obrigatório | Descrição |
|---|---|---|---|---|---|
| 1 | `device_id` | string | — | Sim | Identificador único do dispositivo (ex.: `ESP32-001`) |
| 2 | `timestamp` | datetime | ISO 8601 UTC | Sim | Data e hora da leitura: `AAAA-MM-DDTHH:MM:SSZ` |
| 3 | `temp_ext_c` | float | °C | Sim | Temperatura exterior (BME280) |
| 4 | `humidity_pct` | float | % | Sim | Humidade relativa exterior (BME280) |
| 5 | `pressure_hpa` | float | hPa | Sim | Pressão atmosférica (BME280) |
| 6 | `temp_nest1_c` | float | °C | Sim | Temperatura do ninho 1 (DS18B20) |
| 7 | `temp_nest2_c` | float | °C | Sim | Temperatura do ninho 2 (DS18B20) |
| 8 | `weight_g` | integer | g | Não | Peso da colmeia (HX711). Vazio se indisponível |
| 9 | `battery_mv` | integer | mV | Não | Tensão da bateria. Vazio se indisponível |
| 10 | `status_flags` | string | — | Sim | Códigos de estado separados por `|` (ver §4) |

### 2.3 Cabeçalho

```csv
device_id,timestamp,temp_ext_c,humidity_pct,pressure_hpa,temp_nest1_c,temp_nest2_c,weight_g,battery_mv,status_flags
```

### 2.4 Exemplo de ficheiro válido

```csv
device_id,timestamp,temp_ext_c,humidity_pct,pressure_hpa,temp_nest1_c,temp_nest2_c,weight_g,battery_mv,status_flags
ESP32-001,2026-07-22T08:00:00Z,24.35,61.20,1015.3,34.50,35.10,45200,12450,OK
ESP32-001,2026-07-22T08:15:00Z,24.50,60.80,1015.2,34.55,35.05,45180,12440,OK
ESP32-001,2026-07-22T08:30:00Z,24.80,60.10,1015.1,34.60,35.20,,,OK|BME280_STALE
ESP32-001,2026-07-22T08:45:00Z,-127.00,-127.00,-127.00,34.70,35.30,45150,12430,BME280_FAIL
```

## 3. Formato JSON (API futura)

O mesmo modelo de dados será usado quando o ESP32 enviar leituras automaticamente:

```json
{
  "device_id": "ESP32-001",
  "timestamp": "2026-07-22T08:00:00Z",
  "temp_ext_c": 24.35,
  "humidity_pct": 61.20,
  "pressure_hpa": 1015.3,
  "temp_nest1_c": 34.50,
  "temp_nest2_c": 35.10,
  "weight_g": 45200,
  "battery_mv": 12450,
  "status_flags": ["OK"]
}
```

No JSON, `status_flags` é um array de strings. No CSV, os códigos são separados por `|`.

## 4. Códigos de estado (status_flags)

| Código | Significado |
|---|---|
| `OK` | Todos os sensores funcionaram normalmente |
| `BME280_FAIL` | BME280 não respondeu; valores de temperatura/humidade/pressão são sentinelas |
| `BME280_STALE` | BME280 respondeu mas a leitura não variou desde o ciclo anterior |
| `DS18B20_1_FAIL` | Sonda do ninho 1 não respondeu |
| `DS18B20_2_FAIL` | Sonda do ninho 2 não respondeu |
| `RTC_FAIL` | RTC não disponível; timestamp pode ser impreciso |
| `SD_FAIL` | Erro de escrita no microSD durante este ciclo |
| `HX711_FAIL` | Leitura do peso falhou ou está fora do intervalo |
| `BATTERY_LOW` | Tensão da bateria abaixo do limiar definido |

Quando não existem erros, o campo contém apenas `OK`. Múltiplos códigos são separados por `|`.

## 5. Valor sentinela

Quando um sensor falha, o firmware deve escrever o valor sentinela `-127.00` (para temperaturas, humidade e pressão) em vez de zero. O backend rejeita valores sentinelas como medições válidas e marca a leitura com o estado de falha correspondente.

| Campo | Sentinela |
|---|---|
| `temp_ext_c` | -127.00 |
| `humidity_pct` | -127.00 |
| `pressure_hpa` | -127.00 |
| `temp_nest1_c` | -127.00 |
| `temp_nest2_c` | -127.00 |
| `weight_g` | (vazio) |
| `battery_mv` | (vazio) |

## 6. Regras de validação

### 6.1 Intervalos aceitáveis

| Campo | Mínimo | Máximo | Nota |
|---|---|---|---|
| `temp_ext_c` | -40.00 | 60.00 | Fora disto → leitura inválida |
| `humidity_pct` | 0.00 | 100.00 | |
| `pressure_hpa` | 300.0 | 1100.0 | |
| `temp_nest1_c` | -10.00 | 70.00 | Ninho pode aquecer acima da temp. exterior |
| `temp_nest2_c` | -10.00 | 70.00 | |
| `weight_g` | 0 | 200000 | 200 kg como limite físico razoável |
| `battery_mv` | 0 | 20000 | |

### 6.2 Regras de importação

1. Linhas com `device_id` ou `timestamp` vazios são rejeitadas.
2. Linhas com timestamp mal formatado são rejeitadas.
3. Uma leitura com valor sentinela é aceite mas marcada como falha (não é apresentada como medição normal).
4. Valores fora dos intervalos aceitáveis são rejeitados com registo do motivo.
5. A combinação `(device_id, timestamp)` é a chave de deduplicação: importações repetidas do mesmo ficheiro não criam duplicados.
6. Linhas rejeitadas não interrompem o processamento das restantes.

### 6.3 Ordenação

As leituras devem ser ordenadas por `timestamp` ascendente. O firmware deve garantir que o RTC fornece timestamps crescentes. Se o RTC falhar, o firmware deve usar o último timestamp conhecido + intervalo de leitura.

## 7. Ficheiro CSV no microSD

| Propriedade | Valor |
|---|---|
| Nome do ficheiro | `apiario.csv` |
| Localização | raiz do cartão (`/apiario.csv`) |
| Rotação | quando o ficheiro atingir 5 MB, renomear para `apiario_AAAA-MM-DD.csv` e criar novo |
| Cabeçalho | escrito apenas na criação do ficheiro |

## 8. Compatibilidade com o firmware original

O formato anterior (`data,hora,temp_ext_c,humidade_pct,pressao_hpa,temp_ninho1_c,temp_ninho2_c,estado_ninho1,estado_ninho2`) não é compatível com este contrato. O novo firmware base deverá produzir diretamente o formato v1.0 definido aqui.

Para importar ficheiros antigos, o backend poderá incluir um conversor que:

- combina `data` + `hora` em `timestamp` ISO 8601;
- mapeia `humidade_pct` → `humidity_pct`;
- mapeia `temp_ninho1_c` → `temp_nest1_c`;
- converte `estado_ninho1`/`estado_ninho2` em `status_flags`;
- preenche `device_id` com um valor configurável pelo utilizador.

## 9. Versionamento do contrato

Alterações ao contrato devem:

1. incrementar a versão (ex.: 1.0 → 1.1 para adições retrocompatíveis; 1.0 → 2.0 para alterações destrutivas);
2. ser registadas no histórico deste documento;
3. ser refletidas no firmware e no backend na mesma release.

## 10. Histórico do documento

| Versão | Data | Alteração |
|---|---|---|
| 0.1.0 | 22-07-2026 | Criação do contrato de telemetria v1.0 |
