/*
 * Apiário Tech — Implementação do display OLED.
 */

#include "oled.h"
#include "config.h"

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

static Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
static bool oledOk = false;

// Limites provisórios do ninho apenas para o indicador local (OLED).
static const float NINHO_MIN = 32.0f;
static const float NINHO_MAX = 36.5f;

bool oledBegin() {
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (oledOk) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.display();
  } else {
    Serial.println("[oled] ERRO: OLED nao encontrado.");
  }
  return oledOk;
}

// Escreve "mm" ou "hh" com dois dígitos.
static void twoDigits(int v) {
  if (v < 10) display.print("0");
  display.print(v);
}

// Indicador curto do estado do ninho.
static const char* nestState(float t) {
  if (sensorsIsDs18b20Invalid(t)) return "ERR";
  if (t < NINHO_MIN) return "F";
  if (t > NINHO_MAX) return "Q";
  return "OK";
}

void oledShowBoot(const SensorHealth& health, bool rtcOk, bool sdOk) {
  if (!oledOk) return;

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("APIARIO TECH");
  display.println("--------------");
  display.print("BME280: ");
  display.println(health.bme280 ? "OK" : "ERRO");
  display.print("DS18B20: ");
  display.println(health.ds18b20Count);
  display.print("RTC: ");
  display.println(rtcOk ? "OK" : "ERRO");
  display.print("SD: ");
  display.println(sdOk ? "OK" : "ERRO");
  display.print("HX711: ");
  display.println(health.hx711Calibrated ? "OK" : "n/cal");
  display.display();
}

void oledShowStatus(const Reading& r, unsigned long pendingCount, bool wifiOn) {
  if (!oledOk) return;

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Linha 0: estado geral + hora.
  display.setCursor(0, 0);
  display.print(telemetryIsOk(r) ? "OK " : "A ");
  // timestamp = "AAAA-MM-DDTHH:MM:SSZ" → hora começa no índice 11.
  String ts = String(r.timestamp);
  display.print(ts.substring(11, 16));
  display.print(wifiOn ? " WiFi" : "");

  // Linha 1: exterior + humidade.
  display.setCursor(0, 12);
  if (r.tempExtC <= SENTINEL_F + 0.5f) {
    display.print("Ext: --.-C");
  } else {
    display.print("Ext:");
    display.print(r.tempExtC, 1);
    display.print("C");
  }
  if (r.humidityPct > SENTINEL_F + 0.5f) {
    display.print(" H:");
    display.print(r.humidityPct, 0);
    display.print("%");
  }

  // Linha 2: pressão.
  display.setCursor(0, 24);
  if (r.pressureHpa > SENTINEL_F + 0.5f) {
    display.print("P:");
    display.print(r.pressureHpa, 0);
    display.print(" hPa");
  } else {
    display.print("P: --");
  }

  // Linha 3: ninho 1.
  display.setCursor(0, 36);
  display.print("N1:");
  if (r.tempNest1C <= SENTINEL_F + 0.5f) {
    display.print("--.-C ERR");
  } else {
    display.print(r.tempNest1C, 1);
    display.print("C ");
    display.print(nestState(r.tempNest1C));
  }

  // Linha 4: ninho 2.
  display.setCursor(0, 48);
  display.print("N2:");
  if (r.tempNest2C <= SENTINEL_F + 0.5f) {
    display.print("--.-C ERR");
  } else {
    display.print(r.tempNest2C, 1);
    display.print("C ");
    display.print(nestState(r.tempNest2C));
  }

  // Linha 5: peso + bateria + pendentes.
  display.setCursor(0, 60);
  if (r.weightG != WEIGHT_UNAVAILABLE) {
    display.print(r.weightG / 1000.0f, 1);
    display.print("kg ");
  }
  if (r.batteryMv != BATTERY_UNAVAILABLE) {
    display.print(r.batteryMv / 1000.0f, 1);
    display.print("V ");
  }
  display.print("P:");
  display.print(pendingCount);

  display.display();
}
