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

#define SD_CS   17
#define SD_SCK  18
#define SD_MISO 19
#define SD_MOSI 23

// Velocidade SPI baixa para máxima compatibilidade (fios longos ou módulos
// sensíveis). Igual ao firmware de produção. Só aumentar depois de estável.
#define SD_SPI_FREQ 1000000UL

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

  Serial.print("Pinos SPI -> CS=");
  Serial.print(SD_CS);
  Serial.print("  SCK=");
  Serial.print(SD_SCK);
  Serial.print("  MISO=");
  Serial.print(SD_MISO);
  Serial.print("  MOSI=");
  Serial.println(SD_MOSI);
  Serial.print("Velocidade SPI: ");
  Serial.print(SD_SPI_FREQ / 1000UL);
  Serial.println(" kHz");
  Serial.println();

  Serial.println("A iniciar SPI...");
  SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);
  delay(500);

  Serial.println("A iniciar cartão microSD (até 3 tentativas)...");
  for (int tentativa = 1; tentativa <= 3 && !sdOK; tentativa++) {
    sdOK = SD.begin(SD_CS, SPI, SD_SPI_FREQ);
    if (!sdOK) {
      Serial.print("  Tentativa ");
      Serial.print(tentativa);
      Serial.println(" falhou.");
      delay(1000);
    }
  }

  if (!sdOK) {
    Serial.println();
    Serial.println("✗ ERRO: Cartão microSD não iniciou!");
    Serial.println();

    // Diagnóstico: distingue falha de comunicação (ligação/alimentação)
    // de falha do sistema de ficheiros (formatação).
    uint8_t tipoFalha = SD.cardType();
    Serial.print("  Tipo detetado: ");
    if (tipoFalha == CARD_NONE) {
      Serial.println("NENHUM");
      Serial.println("  → O ESP32 não consegue comunicar com o cartão.");
      Serial.println("  → Problema de LIGAÇÃO ou ALIMENTAÇÃO:");
      Serial.println("    verifique CS, SCK, MISO, MOSI, GND e VCC.");
    } else {
      if (tipoFalha == CARD_MMC) Serial.println("MMC");
      else if (tipoFalha == CARD_SD) Serial.println("SD");
      else if (tipoFalha == CARD_SDHC) Serial.println("SDHC");
      else Serial.println("desconhecido");
      Serial.println("  → O cartão comunica, mas o sistema de ficheiros falhou.");
      Serial.println("  → Formate o cartão em FAT32 e volte a tentar.");
    }
    Serial.println();

    Serial.println("  Causas mais prováveis (por ordem):");
    Serial.println("  1. Cartão em exFAT — tem de estar em FAT32.");
    Serial.println("     (cartões > 32 GB vêm em exFAT e NÃO funcionam)");
    Serial.println("  2. Fios MISO e MOSI trocados — experimente trocar.");
    Serial.println("  3. Alimentação fraca — ligue o módulo a 5V (se tiver");
    Serial.println("     regulador) ou 3.3V, e use fios curtos.");
    Serial.println("  4. Cartão mal encaixado ou contactos sujos.");
    Serial.println("  5. Experimente outro cartão, se disponível.");
    Serial.println();
    Serial.println("  Depois de corrigir, reinicie o ESP32.");
    return;
  }

  Serial.println("✓ Cartão microSD iniciado.");

  // Tipo de cartão
  uint8_t tipo = SD.cardType();
  Serial.print("  Tipo: ");
  if (tipo == CARD_MMC) Serial.println("MMC");
  else if (tipo == CARD_SD) Serial.println("SD");
  else if (tipo == CARD_SDHC) Serial.println("SDHC");
  else Serial.println("desconhecido");

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
