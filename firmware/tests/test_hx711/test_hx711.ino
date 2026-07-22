/*
 * Apiário Tech — Teste HX711
 * 
 * Objetivo: Validar leitura bruta e calibração com carga conhecida.
 * Critério: Mede cargas conhecidas dentro da tolerância definida.
 * 
 * Ligações:
 *   VCC → 3.3V (ou 5V conforme módulo)
 *   GND → GND
 *   DT  → GPIO 12 (ou outro)
 *   SCK → GPIO 13 (ou outro)
 * 
 * Bibliotecas necessárias:
 *   - HX711 (por Bogdan Necula)
 * 
 * Procedimento de calibração:
 *   1. Carregar o sketch sem peso na balança
 *   2. Anotar o valor de tara (offset)
 *   3. Colocar peso conhecido (ex.: 1 kg)
 *   4. Calcular fator de escala = (leitura - tara) / peso_conhecido
 *   5. Atualizar FATOR_ESCALA no código
 */

#include "HX711.h"

#define HX711_DT  12
#define HX711_SCK 13

HX711 balanca;

// Valores de calibração (ajustar após teste)
long TARA = 0;              // Valor sem peso
float FATOR_ESCALA = 1.0;   // Fator de conversão para gramas
bool calibrado = false;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("================================");
  Serial.println("TESTE HX711 — Apiário Tech");
  Serial.println("================================");
  Serial.println();

  Serial.println("A iniciar HX711...");
  balanca.begin(HX711_DT, HX711_SCK);

  if (!balanca.is_ready()) {
    Serial.println("⚠ HX711 não está pronto. A aguardar...");
    delay(1000);
  }

  Serial.println("✓ HX711 iniciado.");
  Serial.println();

  // Tara automática
  Serial.println("A calcular tara (sem peso na balança)...");
  Serial.println("Certifique-se de que não há peso na balança.");
  delay(2000);

  balanca.set_scale();
  TARA = balanca.read_average(10);
  balanca.set_offset(TARA);

  Serial.print("Tara: ");
  Serial.println(TARA);
  Serial.println();

  Serial.println("----------------------------------------");
  Serial.println("MODO: Leitura bruta");
  Serial.println("Coloque um peso conhecido e anote o valor.");
  Serial.println("Depois calcule: FATOR = (valor - tara) / peso_em_gramas");
  Serial.println("----------------------------------------");
}

void loop() {
  if (!balanca.is_ready()) {
    Serial.println("HX711 não está pronto...");
    delay(1000);
    return;
  }

  // Leitura bruta
  long leituraBruta = balanca.read();

  // Leitura com tara
  long comTara = leituraBruta - TARA;

  // Se calibrado, converter para gramas
  float gramas = 0;
  if (calibrado && FATOR_ESCALA != 1.0) {
    gramas = comTara / FATOR_ESCALA;
  }

  Serial.print("Bruto: ");
  Serial.print(leituraBruta);
  Serial.print(" | Com tara: ");
  Serial.print(comTara);

  if (calibrado) {
    Serial.print(" | Peso: ");
    Serial.print(gramas, 1);
    Serial.print(" g");
  }

  Serial.println();

  delay(1000);
}
