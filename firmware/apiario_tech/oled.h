/*
 * Apiário Tech — Display OLED SSD1306 (128x64, I2C).
 *
 * Mostra um resumo de estado local: módulos no arranque e, em ciclo,
 * as leituras correntes, o peso, a bateria e as leituras pendentes.
 * O OLED é opcional — uma falha não impede o funcionamento.
 */

#ifndef APIARIO_OLED_H
#define APIARIO_OLED_H

#include <Arduino.h>
#include "telemetry.h"
#include "sensors.h"

// Inicializa o OLED. Devolve true se o display respondeu.
bool oledBegin();

// Ecrã de arranque com o estado dos módulos.
void oledShowBoot(const SensorHealth& health, bool rtcOk, bool sdOk);

// Ecrã de estado com a leitura corrente e contadores.
void oledShowStatus(const Reading& r, unsigned long pendingCount, bool wifiOn);

#endif // APIARIO_OLED_H
