/*
 * Apiário Tech — Firmware de produção
 * Ficheiro de configuração central.
 *
 * AJUSTE OS VALORES DESTA FICHEIRO ANTES DE CARREGAR O SKETCH.
 *
 * Ordem de preparação recomendada:
 *   1. Correr os sketches de firmware/tests/ para validar cada sensor.
 *   2. Calibrar o HX711 (test_hx711) e anotar TARA e FATOR_ESCALA.
 *   3. Medir a tensão da bateria com um multímetro e calibrar BATTERY_*.
 *   4. Preencher WIFI_SSID / WIFI_PASSWORD e a chave de API do dispositivo.
 *   5. Registar o dispositivo no backend (POST /api/devices) e usar a
 *      chave devolvida em API_DEVICE_KEY.
 */

#ifndef APIARIO_CONFIG_H
#define APIARIO_CONFIG_H

// =====================================================
// IDENTIDADE DO DISPOSITIVO
// =====================================================

// Tem de corresponder ao deviceId registado no backend.
#define DEVICE_ID "ESP32-001"

// Versão do firmware (informativa, enviada nos logs).
#define FIRMWARE_VERSION "1.0.0"

// =====================================================
// REDE E API
// =====================================================

// Credenciais da rede Wi-Fi local do apiário.
#define WIFI_SSID "O_TEU_SSID"
#define WIFI_PASSWORD "A_TUA_PASSWORD"

// URL base da API (sem barra final). Em produção, apontar para o
// servidor real (ex.: "https://api.apiariotech.pt/api").
#define API_BASE_URL "http://192.168.1.100:3001/api"

// Chave de API do dispositivo (obtida ao registar o dispositivo no
// backend ou via POST /api/devices/:id/regenerate-key).
// NUNCA partilhar esta chave publicamente.
#define API_DEVICE_KEY "atk_substituir_pela_chave_real"

// Tempo máximo (ms) para a ligação Wi-Fi se estabelecer.
#define WIFI_TIMEOUT_MS 15000UL

// Tempo máximo (ms) para um pedido HTTP.
#define HTTP_TIMEOUT_MS 10000UL

// =====================================================
// MODO DE TESTE (bancada)
// =====================================================

// 1 = intervalos curtos para validar rapidamente no monitor série.
// 0 = intervalos de produção.
#define MODO_TESTE 1

#if MODO_TESTE
  #define INTERVALO_LEITURA_MS   10000UL    // lê sensores a cada 10 s
  #define INTERVALO_ENVIO_MS     30000UL    // tenta enviar a cada 30 s
  #define INTERVALO_OLED_MS      2000UL     // refresca OLED a cada 2 s
#else
  #define INTERVALO_LEITURA_MS   60000UL    // lê sensores a cada 60 s
  #define INTERVALO_ENVIO_MS     300000UL   // tenta enviar a cada 5 min
  #define INTERVALO_OLED_MS      2000UL     // refresca OLED a cada 2 s
#endif

// =====================================================
// PINOS
// =====================================================

// I2C (OLED + BME280 + RTC DS3231) — igual ao firmware original.
#define SDA_PIN 21
#define SCL_PIN 22

// Barramento OneWire das duas sondas DS18B20 (pull-up 4.7 kΩ).
#define ONE_WIRE_BUS 4

// Leitor microSD por SPI. CS validado no hardware real em GPIO 17.
#define SD_CS   17
#define SD_SCK  18
#define SD_MISO 19
#define SD_MOSI 23

// HX711 (células de carga) — igual a firmware/tests/test_hx711.
// Nota: GPIO 12 é um pino de boot (MTDI); evitar pull-up externo.
#define HX711_DT  12
#define HX711_SCK 13

// Medição da bateria via divisor de tensão (GPIO 34 é só de entrada).
// Divisor recomendado: 100 kΩ (VIN→ADC) + 100 kΩ (ADC→GND) → fator 2.
#define BATTERY_ADC_PIN 34

// =====================================================
// OLED
// =====================================================

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define OLED_ADDR     0x3C

// =====================================================
// CALIBRAÇÃO — HX711 (peso)
// =====================================================

// Preencher após calibração com test_hx711:
//   TARA           = valor bruto sem peso (read_average).
//   FATOR_ESCALA   = (leitura - tara) / peso_conhecido_em_gramas.
// Com FATOR_ESCALA = 1.0 o peso é reportado como indisponível até
// estar calibrado (evita valores sem sentido).
#define HX711_TARA          0L
#define HX711_FATOR_ESCALA  1.0f

// Número de amostras para estabilizar a leitura do peso.
#define HX711_AMOSTRAS      5

// =====================================================
// CALIBRAÇÃO — BATERIA
// =====================================================

// Fator do divisor de tensão (R1+R2)/R2. Para 100 kΩ + 100 kΩ → 2.0.
#define BATTERY_DIVIDER_FACTOR 2.0f

// Tensão mínima (mV) abaixo da qual é marcado BATTERY_LOW.
#define BATTERY_LOW_MV 11500

// =====================================================
// SONDAS DS18B20 (endereços físicos)
// =====================================================

// Preencher com os endereços impressos por firmware/tests/test_ds18b20
// para garantir que "Ninho 1" e "Ninho 2" são sempre as mesmas sondas.
// Exemplo: { 0x28, 0xFF, 0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC }
// Deixar a zeros para usar a ordem do barramento (menos fiável).
#define SONDAS_POR_ENDERECO 0

#if SONDAS_POR_ENDERECO
static const uint8_t ENDERECO_SONDA_1[8] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
static const uint8_t ENDERECO_SONDA_2[8] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
#endif

// =====================================================
// FICHEIROS NO microSD
// =====================================================

// Arquivo permanente (formato do contrato de telemetria v1.0).
#define CSV_FILE "/apiario.csv"

// Fila de leituras ainda não confirmadas pela API.
#define PENDING_FILE "/pendentes.csv"

// Rotação do arquivo quando atinge este tamanho (bytes). ~5 MB.
#define CSV_MAX_SIZE (5UL * 1024UL * 1024UL)

// =====================================================
// TEMPO
// =====================================================

// O RTC DS3231 é mantido em UTC. Quando há Wi-Fi, o firmware
// sincroniza-o via SNTP (servidor NTP abaixo).
#define NTP_SERVER "pool.ntp.org"
#define NTP_GMT_OFFSET_SEC 0   // UTC
#define NTP_DAYLIGHT_OFFSET_SEC 0

#endif // APIARIO_CONFIG_H
