/*
 * Apiário Tech — Teste DS18B20
 * 
 * Objetivo: Validar leitura das duas sondas de temperatura por endereço físico.
 * Critério: Ambas as sondas identificadas e lidas sem troca.
 * 
 * Ligações:
 *   VCC → 3.3V (ou parasita: VCC ao GND com pull-up)
 *   GND → GND
 *   DATA → GPIO 4 (com resistência 4.7kΩ entre DATA e VCC)
 * 
 * Bibliotecas necessárias:
 *   - OneWire
 *   - DallasTemperature
 */

#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_BUS 4

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensores(&oneWire);

int numSondas = 0;
DeviceAddress enderecoSonda1;
DeviceAddress enderecoSonda2;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("================================");
  Serial.println("TESTE DS18B20 — Apiário Tech");
  Serial.println("================================");
  Serial.println();

  sensores.begin();
  numSondas = sensores.getDeviceCount();

  Serial.print("Sondas encontradas: ");
  Serial.println(numSondas);
  Serial.println();

  if (numSondas == 0) {
    Serial.println("✗ ERRO: Nenhuma sonda encontrada!");
    Serial.println("  Verifique:");
    Serial.println("  - Ligação DATA ao GPIO 4");
    Serial.println("  - Resistência pull-up 4.7kΩ");
    Serial.println("  - Alimentação das sondas");
    return;
  }

  // Listar endereços
  Serial.println("Endereços das sondas:");
  for (int i = 0; i < numSondas; i++) {
    DeviceAddress addr;
    if (sensores.getAddress(addr, i)) {
      Serial.print("  Sonda ");
      Serial.print(i + 1);
      Serial.print(": ");
      printAddress(addr);
      Serial.println();
    }
  }

  // Guardar endereços das duas primeiras
  if (numSondas >= 1) sensores.getAddress(enderecoSonda1, 0);
  if (numSondas >= 2) sensores.getAddress(enderecoSonda2, 1);

  Serial.println();
  Serial.println("A ler temperaturas a cada 2 segundos...");
  Serial.println("----------------------------------------");
}

void loop() {
  if (numSondas == 0) {
    delay(5000);
    return;
  }

  sensores.requestTemperatures();

  Serial.print("Sonda 1: ");
  if (numSondas >= 1) {
    float temp1 = sensores.getTempC(enderecoSonda1);
    if (temp1 == DEVICE_DISCONNECTED_C) {
      Serial.print("DESCONECTADA");
    } else {
      Serial.print(temp1, 2);
      Serial.print(" °C");
    }
  } else {
    Serial.print("N/D");
  }

  Serial.print(" | Sonda 2: ");
  if (numSondas >= 2) {
    float temp2 = sensores.getTempC(enderecoSonda2);
    if (temp2 == DEVICE_DISCONNECTED_C) {
      Serial.print("DESCONECTADA");
    } else {
      Serial.print(temp2, 2);
      Serial.print(" °C");
    }
  } else {
    Serial.print("N/D");
  }

  Serial.println();
  delay(2000);
}

void printAddress(DeviceAddress addr) {
  for (uint8_t i = 0; i < 8; i++) {
    if (addr[i] < 16) Serial.print("0");
    Serial.print(addr[i], HEX);
    if (i < 7) Serial.print(":");
  }
}
