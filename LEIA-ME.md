# Correções e filtros do Dashboard — v7

## Aplicar
Substitua os cinco arquivos mantendo os caminhos:
- src/components/dashboard/DateFilter.tsx
- src/components/dashboard/StatsCards.tsx
- src/pages/Index.tsx
- src/pages/Reports.tsx
- src/lib/goals.ts

Se já executou a migração que adiciona closing_state, não precisa repetir. Caso contrário, execute supabase/migrations/20261005_add_closing_state.sql primeiro. Faça o build do projeto antes de publicar.

## Filtros
Mantidas as opções Hoje, Esta semana, Semana passada, Este mês, Este ano, Tudo e Personalizado. Semanal aparece imediatamente abaixo de Personalizado e abre seletores de mês e semana. Últimos X dias permite de1 a3650 dias, inclui hoje e usa dias de calendário. Personalizado inclui ambas as datas, do início do primeiro dia até o fim do último.

Semanas são agrupadas pelo mês da segunda-feira inicial, seguindo Fechamentos. A semana que começa em setembro e termina em outubro fica em setembro. Antecipações possuem opções Total, Antecipada e Continuação. O número da semana corresponde à ordem das semanas cadastradas no mês.

## Valores
Esta semana, Semana passada e Semanal usam a cadeia de fechamento da semana correspondente. Resultado S/RB é resultado das sessões; Resultado Total(+RB) é bruto com rake deal, antes das despesas. Líquido respeita makeup, despesas e reposição/utilização da banca. No total de uma semana antecipada, os líquidos das duas partes são somados, preservando o pagamento já encerrado; banca é o saldo final da continuação.

Nos demais filtros, resultados/mãos/horas seguem as sessões cuja data de início está no período. Sessões atravessando a meia-noite são atribuídas integralmente ao dia de início, sem repartir resultados desconhecidos. Rake total segue o rake dessas sessões. Rake Deal dos fechamentos e Líquido dos fechamentos somam apenas registros de fechamento cuja data de transação está no período; isso não comprova recebimento bancário. Não é feito rateio de rakeback manual semanal nem aplicação de um Profit Deal semanal sobre um recorte incompleto. Um fechamento no período pode se referir a sessões anteriores ao intervalo; os rótulos e explicação na tela distinguem esses conceitos.

Banca de buy-in é mostrada apenas no filtro por semana, pois não há histórico intradiário suficiente para afirmar seu saldo em um recorte arbitrário. Bankroll atual mantém a regra solicitada anteriormente: recargas Banca/Reload desde a segunda-feira anterior ao início do filtro até a data final. Nas etapas antecipada/continuação, respeita também o corte. Essa exceção aparece na explicação da tela.

## Correções anteriores preservadas
Despesas exibidas no resumo; Essa semana oculto se zero; Total+Rake Deal bruto; distribuição e herança entre antecipação, continuação e próxima semana; configuração do Supabase prioritária. Snapshots finais v6 são preservados. Estados históricos anteriores podem ser reconstruídos, e semanas antecipadas cujo período terminou são usadas na herança quando falta o registro legado de fechamento definitivo. Não há escrita automática desses ajustes históricos no banco.

## Validação
19 cenários do motor financeiro passaram. Quatro cenários executaram a lógica real de StatsCards com dados simulados: semanal total, antecipada, semana passada e recorte de um dia sem fechamento. Verificados intervalos inclusivos, Personalizado/Semanal/Últimos dias, presença de Tudo e posição de Semanal. Sintaxe TypeScript dos blocos de lógica verificada. Build completo, renderização do React e integração com o Supabase ativo não foram executados neste ambiente.
