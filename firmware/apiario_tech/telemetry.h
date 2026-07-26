/*
 * Apiário Tech — Modelo de telemetria e serialização.
 *
 * Implementa o contrato de telemetria v1.0 (docs/03-contrato-telemetria.md):
 *   - valor sentinela -127.00 para temperaturas/humidade/pressão falhadas;
 *   - weight_g / battery_mv vazios (null) quando indisponíveis;
 *   - status_flags como array (JSON) ou separado por "|" (CSV).
 */

#ifndef APIARIO_TELEMETRY_H
#define APIARIO_TELEMETRY_H

#include <Arduino.h>

// Valor sentinela para sensores falhados (contrato §5).
constexpr float SENTINEL_F = -127.00f;

// Marcador interno para peso/bateria indisponíveis (serializado como vazio/null).
constexpr long WEIGHT_UNAVAILABLE = -1;
constexpr int BATTERY_UNAVAILABLE = -1;

// Bandeiras de estado (contrato §4). Combináveis em bitmask.
enum StatusFlag : uint16_t {
  FLAG_NONE            = 0,
  FLAG_BME280_FAIL     = 1 << 0,
  FLAG_BME280_STALE    = 1 << 1,
  FLAG_DS18B20_1_FAIL  = 1 << 2,
  FLAG_DS18B20_2_FAIL  = 1 << 3,
  FLAG_RTC_FAIL        = 1 << 4,
  FLAG_SD_FAIL         = 1 << 5,
  FLAG_HX711_FAIL      = 1 << 6,
  FLAG_BATTERY_LOW     = 1 << 7,
};

// Uma leitura de telemetria completa.
struct Reading {
  char timestamp[24];  // ISO 8601 UTC: "2026-07-22T08:00:00Z"
  float tempExtC;      // °C (SENTINEL_F se BME280 falhou)
  float humidityPct;   // %  (SENTINEL_F se BME280 falhou)
  float pressureHpa;   // hPa (SENTINEL_F se BME280 falhou)
  float tempNest1C;    // °C (SENTINEL_F se sonda 1 falhou)
  float tempNest2C;    // °C (SENTINEL_F se sonda 2 falhou)
  long weightG;        // g  (WEIGHT_UNAVAILABLE se HX711 falhou)
  int batteryMv;       // mV (BATTERY_UNAVAILABLE se não medido)
  uint16_t flags;      // bitmask de StatusFlag
};

// Cabeçalho CSV do contrato v1.0 (sem quebra de linha).
extern const char* TELEMETRY_CSV_HEADER;

// Preenche reading.timestamp a partir dos componentes de data/hora.
void telemetrySetTimestamp(Reading& r, int year, int month, int day,
                           int hour, int minute, int second);

// true se a leitura não tem nenhuma falha (flags == 0).
bool telemetryIsOk(const Reading& r);

// Serializa a leitura como objeto JSON (contrato §3).
String telemetryToJson(const Reading& r);

// Serializa a leitura como linha CSV (contrato §2), sem quebra de linha.
String telemetryToCsvLine(const Reading& r);

// Converte um bitmask de flags na representação "A|B|C" (ou "OK").
String telemetryFlagsToString(uint16_t flags);

// Formata um float com 'decimals' casas (usa '.' como separador).
String telemetryFmtFloat(float value, int decimals);

#endif // APIARIO_TELEMETRY_H
