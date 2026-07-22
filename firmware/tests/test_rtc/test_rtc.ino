/*
 * Apiário Tech — Teste RTC DS3231
 * 
 * Objetivo: Validar configuração, leitura e retenção após corte de energia.
 * Critério: Data/hora mantida dentro da tolerância após reinício.
 * 
 * Ligações:
 *   VCC → 3.3V
 *   GND → GND
 *   SDA → GPIO 21
 *   SCL → GPIO 22
 * 
 * Bibliotecas necessárias:
 *   - RTClib
 */

#include <Wire.h>
#include "RTClib.h"

#define SDA_PIN 21
#define SCL_PIN 22

RTC_DS3231 rtc;
bool rtcOK = false;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("================================");
  Serial.println("TESTE RTC DS3231 — Apiário Tech");
  Serial.println("================================");
  Serial.println();

  Wire.begin(SDA_PIN, SCL_PIN);
  delay(500);

  Serial.println("A iniciar RTC...");
  rtcOK = rtc.begin();

  if (!rtcOK) {
    Serial.println("✗ ERRO: RTC não encontrado!");
    Serial.println("  Verifique ligações I2C.");
    return;
  }

  Serial.println("✓ RTC encontrado.");

  // Verificar se perdeu a hora
  if (rtc.lostPower()) {
    Serial.println("⚠ RTC perdeu energia. A acertar pela hora de compilação...");
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    Serial.println("  Hora acertada. Verifique se está correta.");
  } else {
    Serial.println("✓ RTC manteve a hora (bateria OK).");
  }

  Serial.println();
  Serial.println("A apresentar hora a cada segundo...");
  Serial.println("Desligue e volte a ligar para testar retenção.");
  Serial.println("----------------------------------------");
}

void loop() {
  if (!rtcOK) {
    delay(5000);
    return;
  }

  DateTime agora = rtc.now();

  Serial.print(agora.year());
  Serial.print("-");
  if (agora.month() < 10) Serial.print("0");
  Serial.print(agora.month());
  Serial.print("-");
  if (agora.day() < 10) Serial.print("0");
  Serial.print(agora.day());
  Serial.print(" ");
  if (agora.hour() < 10) Serial.print("0");
  Serial.print(agora.hour());
  Serial.print(":");
  if (agora.minute() < 10) Serial.print("0");
  Serial.print(agora.minute());
  Serial.print(":");
  if (agora.second() < 10) Serial.print("0");
  Serial.println(agora.second());

  // Temperatura interna do RTC (sensor de temperatura do DS3231)
  float tempRTC = rtc.getTemperature();
  Serial.print("  Temp RTC: ");
  Serial.print(tempRTC, 1);
  Serial.println(" °C");

  delay(1000);
}
