/*
 * Apiário Tech — Persistência em microSD.
 *
 * Dois ficheiros com propósitos distintos:
 *
 *   CSV_FILE ("/apiario.csv")
 *     Arquivo permanente em formato CSV do contrato de telemetria v1.0.
 *     Serve de registo local e pode ser importado manualmente no backend.
 *     Sofre rotação quando atinge CSV_MAX_SIZE.
 *
 *   PENDING_FILE ("/pendentes.csv")
 *     Fila de envio para a API em JSON Lines (um objeto JSON por linha,
 *     apesar da extensão .csv). Cada leitura é aqui gravada e só é
 *     removida depois de a API confirmar a receção. Garante que nenhuma
 *     leitura se perde quando não há ligação — o envio é idempotente
 *     porque o backend deduplica por (device_id, timestamp).
 */

#ifndef APIARIO_STORAGE_H
#define APIARIO_STORAGE_H

#include <Arduino.h>
#include <vector>
#include "telemetry.h"

// Inicializa o cartão microSD e cria os ficheiros (com cabeçalho) se
// necessário. Devolve true se o cartão ficou operacional.
bool storageBegin();

// true se o cartão está operacional.
bool storageIsAvailable();

// Grava a leitura no arquivo CSV e na fila de envio. Devolve false se a
// escrita falhar (o chamador deve marcar FLAG_SD_FAIL).
bool storageAppend(const Reading& r);

// Carrega as leituras pendentes (objetos JSON, uma por linha) para 'out'.
// Devolve o número de linhas lidas.
int storageLoadPending(std::vector<String>& out);

// Limpa a fila de envio (após confirmação da API). Devolve true se OK.
bool storageClearPending();

// Reescreve a fila de envio com as linhas fornecidas (usado para remover
// um lote já confirmado, mantendo o restante). Devolve true se OK.
bool storageSavePending(const std::vector<String>& lines);

// Número de leituras pendentes na fila.
unsigned long storagePendingCount();

#endif // APIARIO_STORAGE_H
