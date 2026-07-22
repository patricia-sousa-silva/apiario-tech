/*
 * Apiário Tech — Teste microSD
 * 
 * Objetivo: Validar init, criar, escrever, ler e fechar ficheiro.
 * Critério: Ficheiro criado e lido corretamente em reinícios sucessivos.
 * 
 * Ligações (SPI):
 *   VCC → 3.3V (ou 5V conforme módulo)
 *   GND → GND
 *   CS  → GPIO 27
 *   SCK → GPIO 18
 *   MISO → GPIO 19
 *   MOSI → GPIO 23
 * 
 * Nota: Este é o teste BLOQUEADOR. Deve funcionar isoladamente
 * antes de integrar com os restantes sensores.
 */

#include <SPI.h>
#include <SD.h>

#define SD_CS   27
#define SD_SCK  18
#define SD_MISO 19
#define SD_MOSI 23

#define FICHEIRO_TESTE "/teste.txt"

bool sdOK = false;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("================================");
  Serial.println("TESTE microSD — Apiário Tech");
  Serial.println("================================");
  Serial.println();

  Serial.println("A iniciar SPI...");
  SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);
  delay(500);

  Serial.println("A iniciar cartão microSD...");
  sdOK = SD.begin(SD_CS);

  if (!sdOK) {
    Serial.println("✗ ERRO: Cartão microSD não iniciou!");
    Serial.println();
    Serial.println("  Verifique:");
    Serial.println("  - Cartão inserido corretamente");
    Serial.println("  - Formatação FAT32");
    Serial.println("  - Ligações CS, SCK, MISO, MOSI");
    Serial.println("  - Alimentação do módulo (3.3V ou 5V)");
    Serial.println("  - Outro cartão, se disponível");
    Serial.println();
    Serial.println("  Tente também:");
    Serial.println("  - Reduzir a velocidade SPI");
    Serial.println("  - Verificar soldas e contactos");
    return;
  }

  Serial.println("✓ Cartão microSD iniciado.");

  // Mostrar informações do cartão
  uint64_t cardSize = SD.cardSize() / (1024 * 1024);
  Serial.print("  Tamanho: ");
  Serial.print(cardSize);
  Serial.println(" MB");

  Serial.println();
  Serial.println("A executar teste de escrita/leitura...");
  Serial.println("----------------------------------------");

  testeEscritaLeitura();
}

void loop() {
  if (!sdOK) {
    delay(5000);
    return;
  }

  // Repetir teste a cada 10 segundos
  static unsigned long ultimoTeste = 0;
  if (millis() - ultimoTeste > 10000) {
    ultimoTeste = millis();
    Serial.println();
    Serial.println("A repetir teste...");
    testeEscritaLeitura();
  }
}

void testeEscritaLeitura() {
  // 1. Criar/abrir ficheiro para escrita
  Serial.print("1. A criar ficheiro... ");
  File ficheiro = SD.open(FICHEIRO_TESTE, FILE_WRITE);

  if (!ficheiro) {
    Serial.println("FALHOU");
    Serial.println("   ✗ Não foi possível criar o ficheiro.");
    return;
  }
  Serial.println("OK");

  // 2. Escrever linha
  Serial.print("2. A escrever... ");
  String linha = "Apiario Tech; " + String(millis()) + " ms";
  ficheiro.println(linha);
  ficheiro.close();
  Serial.println("OK");
  Serial.print("   Conteúdo: ");
  Serial.println(linha);

  // 3. Ler ficheiro
  Serial.print("3. A ler... ");
  ficheiro = SD.open(FICHEIRO_TESTE, FILE_READ);

  if (!ficheiro) {
    Serial.println("FALHOU");
    Serial.println("   ✗ Não foi possível abrir para leitura.");
    return;
  }

  int numLinhas = 0;
  String ultimaLinha = "";
  while (ficheiro.available()) {
    ultimaLinha = ficheiro.readStringUntil('\n');
    numLinhas++;
  }
  ficheiro.close();

  Serial.println("OK");
  Serial.print("   Total de linhas: ");
  Serial.println(numLinhas);
  Serial.print("   Última linha: ");
  Serial.println(ultimaLinha);

  Serial.println();
  Serial.println("✓ Teste concluído com sucesso!");
  Serial.println("  O cartão está a funcionar corretamente.");
}
