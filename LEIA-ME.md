Substitua os três arquivos nos caminhos indicados e faça rebuild.
No Financeiro selecione Despesa para H2N, solver e outros pagamentos feitos fora da banca. Informe valor positivo, descrição e a semana/data correspondentes. Recorrência automática não foi implementada: cadastre mensalmente.
O tipo expense já existe na migração 20240301_add_expense_type.sql do projeto; não foi criada alteração de banco. Se essa migração original ainda não estiver aplicada, aplique-a.
Os resultados exibidos descontam despesas. O fechamento desconta a mesma despesa uma única vez no cálculo financeiro existente, antes de makeup, banca e Profit Deal. O detalhamento indica que o desconto já entrou nos resultados.
Não transforme um FECHAMENTO em despesa. Saques já cadastrados não são convertidos automaticamente.
Períodos parciais mantêm o líquido dos fechamentos registrados no período, conforme a regra v7; o resultado considera despesas por data. Despesas novas em etapas já encerradas não reabrem pagamentos passados: selecione a continuação aberta.
Validação: sintaxe dos blocos de lógica TypeScript (JSX não compilado) e cálculo financeiro local. Build completo e banco ativo não validados.
