1. Execute banco.sql no SQL Editor do Supabase antes de substituir os arquivos.
2. Substitua os três componentes e adicione src/lib/finance.ts. Faça rebuild.
Despesas adicionais cadastradas em Fechamentos reduzem o Bankroll Inicial disponível e, por consequência, o Bankroll Final. Saques manuais do Financeiro também. Despesas do Financeiro não reduzem esses saldos. O Dashboard usa a mesma regra para Bankroll atual. Registros FECHAMENTO/FECHAMENTO ANTECIPADO não entram como saques manuais.
A antecipação grava quanto já foi descontado para não descontar novamente ao consolidar a semana.
IMPORTANTE: despesas antigas não têm origem identificável. O comportamento legado considera expense sem marcação como despesa de Fechamentos (paga pela banca). Revise a lista do banco.sql e marque affects_bankroll=false nas despesas externas previamente cadastradas no Financeiro. Não há conversão automática segura pela descrição.
Os descontos nos resultados/líquido do pacote anterior são mantidos. Não descontamos novamente a despesa na distribuição por alterar a banca disponível.
Não alteramos automaticamente pagamentos ou snapshots de fechamentos históricos. Confira saldos de antecipações antigas após a revisão dos lançamentos.
Validação local: classificação de lançamentos, cálculos de banca e sintaxe dos blocos TypeScript. Build completo, JSX e banco ativo não validados.
