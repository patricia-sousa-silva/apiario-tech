/*
 * Apiário Tech — Implementação de comunicações e tempo.
 */

#include "comms.h"
#include "config.h"
#include "storage.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include <vector>

// Número máximo de leituras enviadas num só pedido HTTP.
static const size_t MAX_BATCH = 50;

static RTC_DS3231 rtc;
static bool rtcOk = false;
// Relógio de recurso: último tempo conhecido (usado se o RTC falhar).
static DateTime fallbackTime(2000, 1, 1, 0, 0, 0);

// -----------------------------------------------------
// RTC e relógio de recurso
// -----------------------------------------------------

bool commsBeginRtc() {
  Serial.println("[comms] A iniciar RTC DS3231...");
  rtcOk = rtc.begin();

  if (!rtcOk) {
    Serial.println("[comms] ERRO: RTC DS3231 nao encontrado.");
    fallbackTime = DateTime(F(__DATE__), F(__TIME__));
    return false;
  }

  if (rtc.lostPower()) {
    Serial.println("[comms] RTC perdeu energia; a acertar pela hora de compilacao.");
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  fallbackTime = rtc.now();
  Serial.println("[comms] RTC DS3231 OK.");
  return true;
}

bool commsIsRtcOk() {
  return rtcOk;
}

DateTime commsNow() {
  if (rtcOk) {
    fallbackTime = rtc.now();
  }
  return fallbackTime;
}

void commsAdvanceFallback() {
  if (!rtcOk) {
    fallbackTime = fallbackTime + TimeSpan((long)(INTERVALO_LEITURA_MS / 1000UL));
  }
}

// -----------------------------------------------------
// Wi-Fi
// -----------------------------------------------------

static bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.print("[comms] A ligar Wi-Fi a ");
  Serial.print(WIFI_SSID);
  Serial.println("...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < WIFI_TIMEOUT_MS) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[comms] Wi-Fi ligado. IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("[comms] ERRO: falha ao ligar Wi-Fi.");
  return false;
}

// -----------------------------------------------------
// NTP (SNTP) → acerta o RTC para UTC
// -----------------------------------------------------

static void syncNtp() {
  configTime(NTP_GMT_OFFSET_SEC, NTP_DAYLIGHT_OFFSET_SEC, NTP_SERVER);

  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 10000)) {
    DateTime ntpTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                     timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
    if (rtcOk) {
      rtc.adjust(ntpTime);
    }
    fallbackTime = ntpTime;
    Serial.println("[comms] Hora sincronizada por NTP (UTC).");
  } else {
    Serial.println("[comms] AVISO: nao foi possivel sincronizar NTP.");
  }
}

// -----------------------------------------------------
// HTTP POST /api/telemetry
// -----------------------------------------------------

static int postTelemetry(const String& payload) {
  WiFiClient client;
  HTTPClient http;

  String url = String(API_BASE_URL) + "/telemetry";
  if (!http.begin(client, url)) {
    Serial.println("[comms] ERRO: nao consegui abrir ligacao HTTP.");
    return -1;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", API_DEVICE_KEY);
  http.setTimeout(HTTP_TIMEOUT_MS);

  int code = http.POST(payload);
  if (code > 0) {
    Serial.printf("[comms] POST %u bytes -> HTTP %d\n", (unsigned)payload.length(), code);
  } else {
    Serial.printf("[comms] POST falhou: %s\n", http.errorToString(code).c_str());
  }

  http.end();
  return code;
}

// -----------------------------------------------------
// Envio da fila pendente (em lotes)
// -----------------------------------------------------

bool commsSendPending() {
  std::vector<String> lines;
  int total = storageLoadPending(lines);

  if (total == 0) {
    return true;  // nada por enviar
  }

  Serial.printf("[comms] %d leitura(s) pendente(s) para enviar.\n", total);

  if (!connectWifi()) {
    return false;  // tenta de novo no próximo ciclo
  }

  syncNtp();  // melhor esforço; mantém o RTC em UTC

  bool allSent = true;
  size_t sent = 0;

  while (sent < lines.size()) {
    size_t batchEnd = sent + MAX_BATCH;
    if (batchEnd > lines.size()) batchEnd = lines.size();

    String payload = "{\"readings\":[";
    for (size_t i = sent; i < batchEnd; i++) {
      if (i > sent) payload += ",";
      payload += lines[i];
    }
    payload += "]}";

    int code = postTelemetry(payload);

    if (code >= 200 && code < 300) {
      sent = batchEnd;
      // Persiste o progresso: mantém apenas o que ainda não foi enviado.
      std::vector<String> remaining(lines.begin() + sent, lines.end());
      storageSavePending(remaining);
    } else {
      allSent = false;
      break;  // guarda o restante para o próximo ciclo
    }
  }

  WiFi.disconnect();

  if (allSent) {
    Serial.println("[comms] Fila de envio vazia.");
  }
  return allSent;
}
