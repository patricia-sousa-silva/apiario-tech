# Visão e âmbito do Apiário Tech

| Campo | Valor |
|---|---|
| Documento | Visão e âmbito |
| Versão | 0.1.0 |
| Estado | Rascunho para validação |
| Responsável | Patrícia Silva |
| Data | 21 de julho de 2026 |

## 1. Finalidade do documento

Este documento estabelece a visão do Apiário Tech, o problema que o projeto pretende resolver, os objetivos da primeira versão e os limites do respetivo âmbito. Serve como referência para decisões de produto, arquitetura, desenvolvimento e testes.

Alterações relevantes ao âmbito deverão ser registadas neste documento e no histórico do Git, para que seja possível compreender quando e por que motivo cada decisão foi tomada.

## 2. Contexto e problema

A avaliação do estado de uma colmeia depende habitualmente de visitas ao apiário e de observações realizadas durante as inspeções. Entre visitas, alterações de temperatura, humidade, peso ou funcionamento do equipamento podem passar despercebidas. Os registos manuais também podem ficar dispersos e dificultar a análise da evolução de cada colmeia.

No contexto inicial do Apiário Tech existem duas colmeias e energia solar com bateria, mas não existe ainda uma ligação permanente à Internet. A solução precisa, portanto, de recolher dados de forma autónoma e preservar a informação quando não houver conectividade.

## 3. Visão do produto

O Apiário Tech será uma plataforma IoT que combina sensores instalados no apiário, recolha local através de ESP32 e uma aplicação web para transformar leituras técnicas em informação compreensível e útil para a gestão apícola.

Pretende-se que o utilizador consiga responder rapidamente a perguntas como:

- Qual é o estado atual de cada colmeia?
- Como evoluíram a temperatura, a humidade e, quando disponível, o peso?
- Existem leituras anómalas que justificam atenção?
- Que inspeções, alimentações ou tratamentos foram realizados?
- O dispositivo está a recolher dados de forma regular?

## 4. Objetivos

### 4.1 Objetivos principais

- centralizar a informação relativa aos apiários e às colmeias;
- recolher e conservar telemetria com data e hora fiáveis;
- apresentar o estado atual e o histórico de forma clara;
- apoiar o acompanhamento das colmeias através de alertas básicos;
- manter um registo cronológico das intervenções;
- continuar a funcionar durante falhas de Internet e interrupções de energia;
- permitir evolução gradual sem reconstruir toda a solução.

### 4.2 Objetivos de longo prazo

- transmissão automática através de 4G, LoRa ou Wi-Fi;
- monitorização do sistema de alimentação e da bateria;
- alertas avançados baseados em padrões históricos;
- deteção e acompanhamento da Vespa velutina;
- utilização de modelos de inteligência artificial devidamente validados.

## 5. Utilizadores e intervenientes

| Perfil | Necessidade principal |
|---|---|
| Administrador | Gerir utilizadores, configurações e acesso aos apiários |
| Apicultor | Consultar colmeias, leituras, alertas e registar intervenções |
| Dispositivo ESP32 | Produzir telemetria identificada, válida e ordenada no tempo |
| Equipa de desenvolvimento | Implementar, testar, documentar e manter o sistema |

Um perfil apenas de consulta poderá ser acrescentado posteriormente, quando existir uma necessidade concreta.

## 6. Âmbito do MVP

### 6.1 Funcionalidades incluídas

| Área | Funcionalidade | Resultado mínimo esperado |
|---|---|---|
| Acesso | Conta e autenticação | Apenas utilizadores autorizados acedem à plataforma |
| Organização | Gestão de apiários e colmeias | Cada leitura e intervenção fica associada à colmeia correta |
| Dispositivos | Identificação do ESP32 | A origem de cada leitura pode ser determinada |
| Telemetria | Importação de CSV | Um ficheiro válido pode ser importado sem criar duplicados |
| Telemetria | Contrato preparado para API | O mesmo modelo de dados pode ser usado no envio automático futuro |
| Dashboard | Estado atual | É apresentada a leitura válida mais recente de cada colmeia |
| Histórico | Listagem e gráficos | O utilizador consulta a evolução num intervalo temporal |
| Alertas | Regras básicas | Valores fora dos limites configurados geram um aviso compreensível |
| Intervenções | Registo manual | Inspeções, alimentação, tratamentos e observações ficam no histórico |
| Qualidade | Estado da leitura | Falhas ou valores inválidos não são apresentados como medições normais |

O modelo de dados deverá aceitar o peso como leitura opcional. A conclusão do MVP da plataforma não dependerá desse campo até uma balança completa estar calibrada e validada.

### 6.2 Limites do MVP

Não fazem parte da primeira versão:

- deteção automática da Vespa velutina;
- modelos de inteligência artificial;
- diagnóstico automático do estado sanitário da colmeia;
- tomada automática de decisões ou atuação física sobre a colmeia;
- aplicação móvel nativa;
- integração com plataformas comerciais externas;
- comunicação de campo definitiva por 4G, LoRa ou Wi-Fi;
- gestão financeira ou comercial da exploração.

Estes elementos poderão ser estudados depois de o percurso básico de recolha, armazenamento, consulta e alerta estar estável.

## 7. Regras e princípios do produto

1. Todas as leituras devem possuir identificação da origem e data/hora.
2. Uma falha de sensor deve ser registada como falha, nunca convertida silenciosamente em zero.
3. A importação repetida do mesmo ficheiro não deverá duplicar leituras.
4. Dados recebidos não devem ser eliminados ou alterados sem rastreabilidade.
5. Cada utilizador apenas deverá aceder aos apiários para os quais tenha autorização.
6. O sistema deve privilegiar informação compreensível em vez de apresentar apenas valores técnicos.
7. A ausência de Internet não pode impedir o ESP32 de continuar a recolher dados localmente.
8. Segredos e credenciais nunca devem integrar o código-fonte ou a documentação versionada.

## 8. Condicionantes e pressupostos

- o primeiro piloto será realizado com duas colmeias;
- existe alimentação solar e bateria no apiário;
- poderá não existir ligação permanente à Internet;
- o ambiente exterior implica humidade, poeiras, variações térmicas e possíveis falhas de energia;
- o protótipo físico não será fechado antes de uma balança completa ser testada;
- sensores, OLED, RTC e microSD devem ficar estáveis antes da montagem definitiva;
- o sistema será desenvolvido progressivamente e deverá permitir substituição ou adição de sensores.

## 9. Critérios de sucesso do MVP

O MVP será considerado demonstrável quando:

1. existir pelo menos um utilizador autenticado;
2. estiverem registados um apiário, duas colmeias e um dispositivo;
3. um ficheiro CSV real produzido pelo ESP32 for importado com sucesso;
4. a plataforma apresentar a leitura mais recente e o histórico;
5. uma segunda importação do mesmo ficheiro não criar duplicados;
6. uma leitura inválida for identificada sem interromper todo o processamento;
7. pelo menos um alerta básico for gerado e consultado;
8. uma intervenção puder ser registada e associada à respetiva colmeia;
9. estiverem documentados os passos de instalação, utilização e recuperação;
10. os testes essenciais tiverem evidências registadas.

## 10. Riscos iniciais

| Risco | Impacto | Tratamento inicial |
|---|---|---|
| microSD instável | Perda de telemetria local | Isolar, reproduzir e testar o módulo antes de avançar |
| leituras incorretas ou congeladas | Decisões baseadas em dados inválidos | Validar intervalos, estado do sensor e atualização temporal |
| falha de energia | Interrupção ou corrupção de dados | Testar reinícios e escrita segura |
| ausência de Internet | Atraso na consulta remota | Manter armazenamento local e importação CSV |
| deriva da balança | Peso pouco fiável | Calibrar e repetir testes com cargas conhecidas |
| crescimento descontrolado do âmbito | Atraso na conclusão do MVP | Manter funcionalidades futuras fora do MVP |
| acesso indevido | Exposição ou alteração de dados | Autenticação, autorização e gestão segura de segredos |

## 11. Fases previstas

| Fase | Entrega principal |
|---|---|
| 0 — Consolidação | Inventário, código existente, ligações e testes documentados |
| 1 — Firmware base | Sensores, OLED, RTC e microSD estáveis |
| 2 — Peso | Uma balança completa calibrada e testada |
| 3 — Contrato de dados | Telemetria e CSV definidos e versionados |
| 4 — Núcleo web | Utilizadores, apiários, colmeias, dispositivos e base de dados |
| 5 — Percurso completo | ESP32 → CSV → importação → dashboard |
| 6 — Operação | Histórico, gráficos, alertas e intervenções |
| 7 — Validação | Segurança, testes e piloto prolongado |

## 12. Decisões em aberto

As decisões seguintes serão tratadas em documentos próprios antes da respetiva implementação:

- intervalo normal de recolha de dados;
- pinos e esquema elétrico definitivo;
- formato e versão inicial do contrato de telemetria;
- configuração final das células de carga;
- tecnologia de backend, interface web e base de dados;
- autenticação dos dispositivos;
- alojamento da plataforma;
- tecnologia de comunicação remota no apiário;
- política de retenção e cópias de segurança.

## 13. Histórico do documento

| Versão | Data | Alteração |
|---|---|---|
| 0.1.0 | 21-07-2026 | Criação do primeiro rascunho de visão e âmbito |
