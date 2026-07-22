/*
 * Apiário Tech — Teste OLED SSD1306
 * 
 * Objetivo: Validar apresentação de estados normal, aviso e erro.
 * Critério: Ecrã apresenta informação legível nos três estados.
 * 
 * Ligações:
 *   VCC → 3.3V
 *   GND → GND
 *   SDA → GPIO 21
 *   SCL → GPIO 22
 * 
 * Bibliotecas necessárias:
 *   - Adafruit SSD1306
 *   - Adafruit GFX
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SDA_PIN 21
#define SCL_PIN 22
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledOK = false;

int estado = 0;  // 0=normal, 1=aviso, 2=erro
unsigned long ultimaMudanca = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("================================");
  Serial.println("TESTE OLED — Apiário Tech");
  Serial.println("================================");
  Serial.println();

  Wire.begin(SDA_PIN, SCL_PIN);
  delay(500);

  Serial.println("A iniciar OLED...");
  oledOK = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  if (oledOK) {
    Serial.println("✓ OLED encontrado e iniciado.");
    Serial.println("O ecrã alterna entre estados a cada 3 segundos.");
    Serial.println("----------------------------------------");
    mostrarEstado();
  } else {
    Serial.println("✗ ERRO: OLED não encontrado!");
    Serial.println("  Verifique ligações e endereço (0x3C ou 0x3D).");
  }
}

void loop() {
  if (!oledOK) {
    delay(5000);
    return;
  }

  if (millis() - ultimaMudanca > 3000) {
    ultimaMudanca = millis();
    estado = (estado + 1) % 3;
    mostrarEstado();
  }
}

void mostrarEstado() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  switch (estado) {
    case 0:  // Normal
      display.setCursor(0, 0);
      display.println("ESTADO: NORMAL");
      display.println();
      display.print("Temp: 24.5 C");
      display.setCursor(0, 20);
      display.print("Hum:  62 %");
      display.setCursor(0, 30);
      display.print("N1: 34.5 C");
      display.setCursor(0, 40);
      display.print("N2: 35.1 C");
      Serial.println("Estado: NORMAL");
      break;

    case 1:  // Aviso
      display.setCursor(0, 0);
      display.println("! AVISO !");
      display.println();
      display.print("Temp ninho alta");
      display.setCursor(0, 30);
      display.print("N1: 38.2 C");
      Serial.println("Estado: AVISO");
      break;

    case 2:  // Erro
      display.setCursor(0, 0);
      display.println("X ERRO X");
      display.println();
      display.print("BME280 falhou");
      display.setCursor(0, 30);
      display.print("SD: sem cartao");
      Serial.println("Estado: ERRO");
      break;
  }

  display.display();
}
