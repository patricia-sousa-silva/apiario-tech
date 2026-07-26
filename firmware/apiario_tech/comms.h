/*
 * Apiário Tech — Comunicações e tempo.
 *
 * Responsabilidades:
 *   - RTC DS3231: hora de referência para os timestamps.
 *   - Relógio de recurso: se o RTC falhar, avança o último timestamp
 *     conhecido pelo intervalo de leitura (contrato §6.3).
 *   - Wi-Fi + HTTP: envia as leituras pendentes para POST /api/telemetry
 *     em lotes, autenticado com X-Device-Key.
 *   - NTP (SNTP): quando há Wi-Fi, sincroniza o RTC para UTC.
 *
 * O envio é idempotente: o backend deduplica por (device_id, timestamp),
 * pelo que reenviar leituras não cria duplicados.
 */

#ifndef APIARIO_COMMS_H
#define APIARIO_COMMS_H

#include <Arduino.h>
#include <RTClib.h>

// Inicializa o RTC DS3231. Devolve true se o RTC respondeu.
bool commsBeginRtc();

// true se o RTC está operacional.
bool commsIsRtcOk();

// Devolve a melhor estimativa de tempo atual (UTC). Se o RTC falhou,
// usa o relógio de recurso (último tempo conhecido).
DateTime commsNow();

// Faz avançar o relógio de recurso (chamar uma vez por ciclo de leitura).
// Sem efeito se o RTC estiver operacional.
void commsAdvanceFallback();

// Liga o Wi-Fi, sincroniza o RTC por NTP e envia as leituras pendentes
// para a API em lotes. Devolve true se a fila ficou vazia.
bool commsSendPending();

#endif // APIARIO_COMMS_H
