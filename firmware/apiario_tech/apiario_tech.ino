/*
 * ============================================================================
 *  APIÁRIO TECH — Firmware de produção (ESP32)
 * ============================================================================
 *
 *  Estação de monitorização de colmeia. Em cada ciclo:
 *    1. Lê os sensores (BME280, 2× DS18B20, HX711, bateria) de forma
 *       tolerante a falhas.
 *    2. Carimba com a hora do RTC DS3231 (UTC).
 *    3. Grava no microSD (arquivo CSV + fila de envio JSON Lines).
 *    4. Atualiza o OLED.
 *    5. Periodicamente liga o Wi-Fi, sincroniza a hora por NTP e envia
 *       as leituras pendentes para POST /api/telemetry (em lotes).
 *
 *  Nenhuma falha individual (sensor, SD, Wi-Fi, RTC) interrompe o ciclo —
 *  o dispositivo continua a medir e a guardar localmente.
 *
 *  Configuração: ver config.h (Wi-Fi, chave API, pinos, calibração).
 *  Contrato de telemetria: docs/03-contrato-telemetria.md
 * ============================================================================
 */

#include <Wire.h>
#include <WiFi.h>

#include "config.h"
#include "telemetry.h"
#include "sensors.h"
#include "storage.h"
#include "comms.h"
#include "oled.h"

// Estado de saúde dos sensores (preenchido no arranque).
static SensorHealth health;

// Última leitura (para mostrar no OLED entre ciclos).
static Reading lastReading;

// Temporização dos ciclos de leitura e de envio.
static unsigned long lastReadMs = 0;
static unsigned long lastSendMs = 0;
static bool firstCycle = true;

// -----------------------------------------------------
// Leitura de um ciclo completo
// -----------------------------------------------------
static void doReading() {
  // Valores por omissão (sentinelas) — cada sensor sobrescreve o seu.
  lastReading.flags = FLAG_NONE;
  lastReading.tempExtC = SENTINEL_F;
  lastReading.humidityPct = SENTINEL_F;
  lastReading.pressureHpa = SENTINEL_F;
  lastReading.tempNest1C = SENTINEL_F;
  lastReading.tempNest2C = SENTINEL_F;
  lastReading.weightG = WEIGHT_UNAVAILABLE;
  lastReading.batteryMv = BATTERY_UNAVAILABLE;

  // Timestamp (UTC) a partir do RTC ou do relógio de recurso.
  DateTime now = commsNow();
  telemetrySetTimestamp(lastReading, now.year(), now.month(), now.day(),
                        now.hour(), now.minute(), now.second());
  if (!commsIsRtcOk()) {
    lastReading.flags |= FLAG_RTC_FAIL;
  }

  // Sensores.
  sensorsReadBme280(lastReading, health);
  sensorsReadDs18b20(lastReading, health);
  sensorsReadWeight(lastReading, health);
  sensorsReadBattery(lastReading);

  // Persistência local.
  if (!storageAppend(lastReading)) {
    lastReading.flags |= FLAG_SD_FAIL;
  }

  // Log serial (JSON do contrato).
  Serial.println("--- Leitura ---");
  Serial.println(telemetryToJson(lastReading));

  // Avança o relógio de recurso (só tem efeito se o RTC falhou).
  commsAdvanceFallback();
}

// -----------------------------------------------------
// Refresco do OLED
// -----------------------------------------------------
static void refreshOled() {
  bool wifiOn = (WiFi.status() == WL_CONNECTED);
  oledShowStatus(lastReading, storagePendingCount(), wifiOn);
}

// -----------------------------------------------------
// setup
// -----------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("=================================");
  Serial.println("  APIARIO TECH");
  Serial.print("  Dispositivo: ");
  Serial.println(DEVICE_ID);
  Serial.print("  Firmware:    ");
  Serial.println(FIRMWARE_VERSION);
  Serial.print("  Modo:        ");
  Serial.println(MODO_TESTE ? "TESTE" : "PRODUCAO");
  Serial.println("=================================");

  // Barramento I2C (OLED + BME280 + RTC).
  Wire.begin(SDA_PIN, SCL_PIN);

  // Módulos.
  bool rtcOk = commsBeginRtc();
  bool sdOk = storageBegin();
  sensorsBegin(health);
  oledBegin();

  oledShowBoot(health, rtcOk, sdOk);

  Serial.print("[main] Leituras pendentes no arranque: ");
  Serial.println(storagePendingCount());
}

// -----------------------------------------------------
// loop
// -----------------------------------------------------
void loop() {
  unsigned long nowMs = millis();

  bool doRead = firstCycle || (nowMs - lastReadMs >= INTERVALO_LEITURA_MS);
  bool doSend = firstCycle || (nowMs - lastSendMs >= INTERVALO_ENVIO_MS);

  if (doRead) {
    lastReadMs = nowMs;
    doReading();
    refreshOled();
  }

  if (doSend) {
    lastSendMs = nowMs;
    commsSendPending();
    refreshOled();  // o contador de pendentes pode ter mudado
  }

  firstCycle = false;
  delay(200);
}
