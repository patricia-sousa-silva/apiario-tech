/*
 * Apiário Tech — Leitura dos sensores.
 *
 * Cada sensor é tolerante a falhas: se não responder, a leitura é marcada
 * com o valor sentinela (-127.00) e/ou a bandeira de estado correspondente,
 * e o restante ciclo continua.
 *
 * Sensores:
 *   - BME280  (I2C)  → temperatura/humidade/pressão exteriores
 *   - DS18B20 (1-Wire, 2 sondas) → temperatura do ninho 1 e 2
 *   - HX711   (células de carga) → peso da colmeia
 *   - ADC     (divisor de tensão) → tensão da bateria
 */

#ifndef APIARIO_SENSORS_H
#define APIARIO_SENSORS_H

#include <Arduino.h>
#include "telemetry.h"

// Estado de saúde dos sensores (preenchido em sensorsBegin).
struct SensorHealth {
  bool bme280 = false;     // BME280 encontrado e configurado
  int ds18b20Count = 0;    // número de sondas DS18B20 no barramento
  bool hx711Ready = false; // HX711 responde
  bool hx711Calibrated = false; // fator de escala definido (≠ 1.0)
};

// Inicializa todos os sensores e preenche 'health'.
// Requer Wire.begin() já chamado no sketch principal.
void sensorsBegin(SensorHealth& health);

// Lê o BME280 e preenche tempExtC/humidityPct/pressureHpa.
// Deteta leitura "congelada" (BME280_STALE) e falha total (BME280_FAIL).
void sensorsReadBme280(Reading& r, const SensorHealth& health);

// Lê as duas sondas DS18B20 e preenche tempNest1C/tempNest2C.
void sensorsReadDs18b20(Reading& r, const SensorHealth& health);

// Lê o HX711 e preenche weightG (ou marca indisponível/falha).
void sensorsReadWeight(Reading& r, const SensorHealth& health);

// Lê a tensão da bateria e preenche batteryMv (+ BATTERY_LOW se aplicável).
void sensorsReadBattery(Reading& r);

// true se o valor de uma sonda DS18B20 é inválido (desligada/reset).
bool sensorsIsDs18b20Invalid(float tempC);

#endif // APIARIO_SENSORS_H
