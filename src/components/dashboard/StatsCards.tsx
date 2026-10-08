"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, MousePointer2, Target, DollarSign, Percent, Wallet } from 'lucide-react';
import { formatCurrency, formatNumber, formatBB } from '@/lib/format';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getBigBlindFromLimitName } from '@/lib/poker';
import { format, endOfWeek, startOfWeek, startOfDay, startOfMonth, startOfYear, parseISO, subWeeks } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type SessionSite = { currency?: string } | { currency?: string }[];
type DashboardSession = {
  id?: string;
  result?: number | null;
  rake?: number | null;
  start_hands?: number | null;
  end_hands?: number | null;
  start_hands_bp?: number | null;
  end_hands_bp?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  limit_name?: string | null;
  sites?: SessionSite | null;
};

type StudyRecord = {
  study_type: 'fixed' | 'one_off';
  weekday: number | null;
  study_date: string | null;
  duration_minutes: number;
  active: boolean;
};

import { cn } from '@/lib/utils';
import { CardDetailsModal, CardModalType } from './CardDetailsModal';
import { 
  formatHoursMinutes, 
  getFilterPeriodRange, 
  calculateStudyMinutesInInterval,
  calculateWeekChain,
  consolidateSettlements,
  DashboardRange,
  BuyinBankrollConfig
} from '@/lib/goals';

interface InteractiveCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  isClickable?: boolean;
  className?: string;
  isAnticipatedBadge?: boolean;
}

const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  onClick,
  isClickable = false,
  className,
  isAnticipatedBadge = false,
}) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [transform, setTransform] = React.useState('');
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Efeito 3D solto suave proporcional ao mouse
    const rotateX = ((y - centerY) / centerY) * -9;
    const rotateY = ((x - centerX) / centerX) * 9;
    setTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025) translateY(-3px)`);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateY(0px)');
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={isClickable ? onClick : undefined}
      style={{
        transform: transform || 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
        transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      className={cn(
        'group relative rounded-xl border bg-card overflow-hidden transition-all duration-300',
        isClickable ? 'cursor-pointer hover:shadow-xl hover:shadow-black/25 hover:border-primary/50' : 'cursor-default',
        isAnticipatedBadge && 'border-emerald-500/50 shadow-sm shadow-emerald-500/15',
        className
      )}
    >
      {isAnticipatedBadge && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5 z-10" title="Semana com Fechamento Antecipado">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-400"></span>
        </span>
      )}
      {children}
    </div>
  );
};

const getModalTypeForLabel = (label: string): CardModalType => {
  switch (label) {
    case 'Bankroll atual':
      return 'bankroll';
    case 'Lucro Líquido':
      return 'lucro_liquido';
    case 'Horas Jogadas':
      return 'horas';
    case 'Total de Mãos':
      return 'maos';
    case 'Resultado Total (+RB)':
      return 'resultado_total';
    case 'Resultado S/ RB':
      return 'resultado_sem_rb';
    case 'Rake Total':
      return 'rake_total';
    case 'Rake Deal':
      return null;
    default:
      return null;
  }
};

const StatsCards = ({ 
  sessions = [], 
  allSessions = [],
  isLoading,
  period,
  customRange,
}: { 
  sessions: DashboardSession[]; 
  allSessions?: DashboardSession[];
  isLoading?: boolean;
  period?: string;
  customRange?: DashboardRange;
}) => {
  const { convertToBrl } = useCurrency();
  const [activeModal, setActiveModal] = React.useState<CardModalType>(null);

  const getWeekKeyForDate = (d: Date) => {
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return `${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}`;
  };

  const { data: authUser, isLoading: isLoadingAuth } = useQuery({
    queryKey: ['auth_user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Usuário não autenticado');
      return user;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: weeklyRakes = [], isLoading: isLoadingRakes } = useQuery({
    queryKey: ['weekly_rake'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('weekly_rake')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: financeTransactions = [], isLoading: isLoadingFinance } = useQuery({
    queryKey: ['finance_transactions'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: profile = null, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const profileQuery = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (!profileQuery.error && profileQuery.data) return profileQuery.data;
      if (profileQuery.error && profileQuery.error.code !== '42703' && profileQuery.error.code !== 'PGRST204') throw profileQuery.error;

      const fallbackQuery = await supabase
        .from('profiles')
        .select('makeup_value, retro_hours, retro_hands, retro_rake_total, retro_rake_deal, retro_result')
        .eq('id', user.id)
        .maybeSingle();
      if (fallbackQuery.error) throw fallbackQuery.error;
      return fallbackQuery.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: studyRecords = [], isLoading: isLoadingStudies } = useQuery({
    queryKey: ['study_records'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('study_records')
        .select('study_type, weekday, study_date, duration_minutes, active')
        .eq('user_id', user.id)
        .eq('active', true);
      if (error) throw error;
      return (data || []) as StudyRecord[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  });

  const anticipationByWeek = React.useMemo(() => {
    const map = new Map<string, {
      metadata: any;
      cutoff: Date;
      txAmount: number;
    }>();

    (financeTransactions || []).forEach((t: any) => {
      if (t.type === 'withdraw' && t.description?.startsWith('FECHAMENTO ANTECIPADO') && t.week_start && t.week_end) {
        const key = `${t.week_start}_${t.week_end}`;
        const parts = t.description.split('|');
        if (parts.length > 1) {
          try {
            const meta = JSON.parse(parts[1]);
            const cutoff = new Date(meta.anticipated_at || t.transaction_date);
            map.set(key, {
              metadata: meta,
              cutoff,
              txAmount: Number(t.amount_brl || 0),
            });
          } catch (e) {
            console.error('Erro ao ler antecipação em StatsCards:', e);
          }
        }
      }
    });

    return map;
  }, [financeTransactions]);

  const getWeekData = (weekKey: string) => {
    const dbEntry = weeklyRakes.find(r => `${r.week_start}_${r.week_end}` === weekKey);
    const anticipation = anticipationByWeek.get(weekKey);

    if (anticipation) {
      const meta = anticipation.metadata;
      const anticipatedRake = Number(meta?.rake_total_part1 ?? 0);
      const anticipatedDeal = Number(meta?.rake_deal_brl_part1 ?? 0);
      const pct = Number(dbEntry?.rake_deal_pct ?? meta?.rake_deal_pct_part1 ?? 0);

      const manualRake = Number(dbEntry?.rake_total_brl || 0);

      // Sessões após a data de corte desta semana
      const postCutoffSessions = (allSessions || []).filter(s => {
        if (!s.start_time) return false;
        const d = new Date(s.start_time);
        return getWeekKeyForDate(d) === weekKey && d > anticipation.cutoff;
      });

      const postCutoffSessionRake = postCutoffSessions.reduce((acc, s) => {
        const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
        const currency = siteData?.currency || 'BRL';
        return acc + convertToBrl(Number(s.rake || 0), currency);
      }, 0);

      let nonAnticipatedRake = 0;
      if (manualRake > 0) {
        nonAnticipatedRake = Math.max(0, manualRake - anticipatedRake);
      } else {
        nonAnticipatedRake = postCutoffSessionRake;
      }

      const nonAnticipatedDeal = (nonAnticipatedRake * pct) / 100;
      const rakeTotal = Math.max(anticipatedRake + nonAnticipatedRake, manualRake);
      const rakeDeal = anticipatedDeal + nonAnticipatedDeal;

      return {
        rakeTotal,
        rakeDeal,
        anticipatedRake,
        anticipatedDeal,
        nonAnticipatedRake,
        nonAnticipatedDeal,
        isAnticipated: true,
      };
    }

    if (dbEntry) {
      const rakeTotal = Number(dbEntry.rake_total_brl || 0);
      const rakeDeal = (rakeTotal * Number(dbEntry.rake_deal_pct || 0)) / 100;
      return { 
        rakeTotal, 
        rakeDeal, 
        anticipatedRake: 0, 
        anticipatedDeal: 0, 
        nonAnticipatedRake: 0, 
        nonAnticipatedDeal: 0, 
        isAnticipated: false 
      };
    }

    // Se não há entrada manual no banco, computa das sessões da semana se houver
    const weekSessions = (allSessions || []).filter(s => {
      if (!s.start_time) return false;
      const d = new Date(s.start_time);
      return getWeekKeyForDate(d) === weekKey;
    });

    const computedRake = weekSessions.reduce((acc, s) => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      return acc + convertToBrl(Number(s.rake || 0), currency);
    }, 0);

    return { 
      rakeTotal: computedRake, 
      rakeDeal: computedRake * 0.4, 
      anticipatedRake: 0, 
      anticipatedDeal: 0, 
      nonAnticipatedRake: 0, 
      nonAnticipatedDeal: 0, 
      isAnticipated: false 
    };
  };

  const statsData = React.useMemo(() => {
    const weekStartNow = startOfWeek(new Date(), { weekStartsOn: 1 });
    const hasPriorHistory = weeklyRakes.length > 0 || (allSessions && allSessions.some(s => {
      if (!s.start_time) return false;
      return new Date(s.start_time) < weekStartNow;
    }));

    // Retro+makeup só aplicados na primeira semana do sistema (sem histórico prévio).
    // O filtro 'Tudo' (all) mostra a soma de todas as sessões cadastradas — sem ajuste de dados retroativos de perfil.
    const shouldIncludeRetroAndMakeup = !hasPriorHistory && (period === 'this_week' || !period);

    let totalResultBrl = shouldIncludeRetroAndMakeup ? Number(profile?.retro_result || 0) : 0;
    let totalHands = shouldIncludeRetroAndMakeup ? Number(profile?.retro_hands || 0) : 0;
    let totalMinutes = shouldIncludeRetroAndMakeup ? (Number(profile?.retro_hours || 0) * 60) : 0;
    let totalProfitBb = 0;
    let totalHandsForBb = 0;
    let sessionMinutes = 0;
    const sessionIntervals: Array<{ start: number; end: number }> = [];
    const weeksInScope = new Set<string>();
    const weekMaxBbBrl = new Map<string, number>();

    sessions.forEach((s) => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      const resultBrl = convertToBrl(Number(s.result || 0), currency);
      const hands = Number(s.end_hands || 0) - Number(s.start_hands || 0);
      const totalSessionHands = hands;
      totalResultBrl += resultBrl;
      totalHands += totalSessionHands;

      let weekKey = '';
      if (s.start_time) {
        weekKey = getWeekKeyForDate(new Date(s.start_time));
        weeksInScope.add(weekKey);
      }

      const bb = getBigBlindFromLimitName(s.limit_name);
      if (bb) {
        const bbValueBrl = convertToBrl(bb, currency);
        if (bbValueBrl > 0) {
          totalProfitBb += resultBrl / bbValueBrl;
          totalHandsForBb += totalSessionHands;

          if (weekKey) {
            const currentMax = weekMaxBbBrl.get(weekKey) || 0;
            if (bbValueBrl > currentMax) weekMaxBbBrl.set(weekKey, bbValueBrl);
          }
        }
      }
      
      if (s.start_time && s.end_time) {
        const startDate = new Date(s.start_time);
        startDate.setMilliseconds(0);
        const endDate = new Date(s.end_time);
        endDate.setMilliseconds(0);
        const start = startDate.getTime();
        const end = endDate.getTime();
        sessionIntervals.push({ start, end: Math.max(start, end) });
      }
    });

    sessionIntervals.sort((a, b) => a.start - b.start);
    const mergedIntervals: Array<{ start: number; end: number }> = [];
    sessionIntervals.forEach((interval) => {
      const lastInterval = mergedIntervals[mergedIntervals.length - 1];
      if (!lastInterval || interval.start > lastInterval.end) {
        mergedIntervals.push({ ...interval });
        return;
      }

      lastInterval.end = Math.max(lastInterval.end, interval.end);
    });

    mergedIntervals.forEach(({ start, end }) => {
      const intervalMinutes = (end - start) / (1000 * 60);
      totalMinutes += intervalMinutes;
      sessionMinutes += intervalMinutes;
    });

    const hh = Math.floor(totalMinutes / 60);
    const mm = Math.floor(totalMinutes % 60);
    const hoursLabel = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const sessionCount = mergedIntervals.length;

    let totalRakeDealBrl = shouldIncludeRetroAndMakeup ? Number(profile?.retro_rake_deal || 0) : 0;
    let totalRakeTotalBrl = shouldIncludeRetroAndMakeup ? Number(profile?.retro_rake_total || 0) : 0;
    let rbProfitBb = 0;

    weeksInScope.forEach((k) => {
      const { rakeTotal, rakeDeal } = getWeekData(k);
      totalRakeTotalBrl += rakeTotal;
      totalRakeDealBrl += rakeDeal;

      // Converter o lucro do RB da semana para BB usando o maior blind daquela semana
      const maxBb = weekMaxBbBrl.get(k);
      if (maxBb && maxBb > 0) {
        rbProfitBb += rakeDeal / maxBb;
      }
    });

    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const currentWeekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const currentWeekEndStr = format(currentWeekEnd, 'yyyy-MM-dd');
    const currentWeekKey = `${currentWeekStartStr}_${currentWeekEndStr}`;

    if (period === 'this_week' || !period) {
      weeksInScope.add(currentWeekKey);
    } else if (period === 'last_week') {
      const lwStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
      const lwEnd = endOfWeek(lwStart, { weekStartsOn: 1 });
      weeksInScope.add(`${format(lwStart, 'yyyy-MM-dd')}_${format(lwEnd, 'yyyy-MM-dd')}`);
    }

    const isExpenseInScope = (t: any) => {
      if (t.type !== 'expense') return false;
      if (period === 'all') return true;
      if (t.week_start && t.week_end) {
        const key = `${t.week_start}_${t.week_end}`;
        if (weeksInScope.has(key)) return true;
        if ((period === 'this_week' || !period) && key === currentWeekKey) return true;
      }
      if (t.transaction_date) {
        const d = new Date(t.transaction_date);
        if (period === 'this_week' || !period) {
          return d >= currentWeekStart && d <= currentWeekEnd;
        }
        if (period === 'last_week') {
          const lwStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
          const lwEnd = endOfWeek(lwStart, { weekStartsOn: 1 });
          return d >= lwStart && d <= lwEnd;
        }
        if (period === 'month') {
          return d >= startOfMonth(new Date());
        }
        if (period === 'year') {
          return d >= startOfYear(new Date());
        }
        if (period === 'custom' && customRange) {
          const s = startOfDay(parseISO(customRange.start));
          const e = startOfDay(new Date(parseISO(customRange.end).getTime() + 86400000));
          return d >= s && d <= e;
        }
      }
      return false;
    };

    // Calcular despesas no período filtrado
    const expensesInPeriod = financeTransactions
      .filter(isExpenseInScope)
      .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);

    const makeupBrl = shouldIncludeRetroAndMakeup ? Number(profile?.makeup_value || 0) : 0;

    // Configuração da Banca de Buy-in
    const savedBuyinEnabled = typeof window !== 'undefined' ? localStorage.getItem('poker_buyin_bankroll_enabled') : null;
    const savedBuyinTarget = typeof window !== 'undefined' ? localStorage.getItem('poker_buyin_bankroll_target') : null;
    const savedBuyinIsManual = typeof window !== 'undefined' ? localStorage.getItem('poker_buyin_bankroll_is_manual') : null;
    const savedBuyinManualVal = typeof window !== 'undefined' ? localStorage.getItem('poker_buyin_bankroll_manual_value') : null;
    const savedBuyinCurrent = typeof window !== 'undefined' ? localStorage.getItem('poker_buyin_bankroll_current') : null;
    const savedBuyinStartWeek = typeof window !== 'undefined' ? localStorage.getItem('poker_buyin_bankroll_start_week') : null;

    const buyinConfig: BuyinBankrollConfig = {
      enabled: profile?.buyin_bankroll_enabled !== null && profile?.buyin_bankroll_enabled !== undefined ? Boolean(profile.buyin_bankroll_enabled) : savedBuyinEnabled === 'true',
      target: Number(profile?.buyin_bankroll_target ?? (savedBuyinTarget || 0)),
      isManual: profile?.buyin_bankroll_is_manual ?? (savedBuyinIsManual === 'true'),
      manualValue: Number(profile?.buyin_bankroll_manual_value ?? (savedBuyinManualVal || 0)),
      current: Number(profile?.buyin_bankroll_current ?? (savedBuyinCurrent || 0)),
      startWeek: profile?.buyin_bankroll_start_week || (savedBuyinStartWeek && savedBuyinStartWeek.trim() ? savedBuyinStartWeek.trim() : undefined),
    };

    // Montar mapa de semanas cronológicas para calcular a cadeia de makeup e banca de buy-in
    const weekMap = new Map<string, { start: Date; end: Date; weekStart: string; weekEnd: string }>();
    (allSessions || []).forEach(s => {
      if (!s.start_time) return;
      const d = new Date(s.start_time);
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      const weekStartStr = format(start, 'yyyy-MM-dd');
      const weekEndStr = format(end, 'yyyy-MM-dd');
      const key = `${weekStartStr}_${weekEndStr}`;
      if (!weekMap.has(key)) weekMap.set(key, { start, end, weekStart: weekStartStr, weekEnd: weekEndStr });
    });

    (weeklyRakes || []).forEach(w => {
      const [y, m, d] = w.week_start.split('-').map(Number);
      const start = new Date(y, m - 1, d);
      const [ey, em, ed] = w.week_end.split('-').map(Number);
      const end = new Date(ey, em - 1, ed);
      const key = `${w.week_start}_${w.week_end}`;
      if (!weekMap.has(key)) weekMap.set(key, { start, end, weekStart: w.week_start, weekEnd: w.week_end });
    });

    if (!weekMap.has(currentWeekKey)) {
      weekMap.set(currentWeekKey, {
        start: currentWeekStart,
        end: currentWeekEnd,
        weekStart: format(currentWeekStart, 'yyyy-MM-dd'),
        weekEnd: format(currentWeekEnd, 'yyyy-MM-dd'),
      });
    }

    const orderedWeekList = Array.from(weekMap.values())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map(w => {
        const key = `${w.weekStart}_${w.weekEnd}`;
        const weekSessions = (allSessions || []).filter(s => {
          if (!s.start_time) return false;
          const d = new Date(s.start_time);
          return d >= w.start && d <= w.end;
        });
        const sessRes = weekSessions.reduce((acc, s) => {
          const site = Array.isArray(s.sites) ? s.sites[0] : s.sites;
          return acc + convertToBrl(Number(s.result || 0), site?.currency || 'BRL');
        }, 0);

        const rkDeal = getWeekData(key).rakeDeal;

        const exp = (financeTransactions || [])
          .filter(t => t.type === 'expense' && t.week_start === w.weekStart && t.week_end === w.weekEnd)
          .reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);

        const finalTx = financeTransactions.find(t => t.type === 'withdraw' && t.description === 'FECHAMENTO' && t.week_start === w.weekStart && t.week_end === w.weekEnd);
        const anticipation = anticipationByWeek.get(key);
        let rawResult = sessRes + rkDeal - exp;
        let anticipatedPart;
        if (anticipation) {
          const meta = anticipation.metadata;
          const post = weekSessions.filter(t => new Date(t.start_time!) > anticipation.cutoff);
          const postResult = post.reduce((acc, t) => {
            const site = Array.isArray(t.sites) ? t.sites[0] : t.sites;
            return acc + convertToBrl(Number(t.result || 0), site?.currency || 'BRL');
          }, 0);
          const postExpenses = financeTransactions.filter(t => t.type === 'expense' && t.week_start === w.weekStart && t.week_end === w.weekEnd && new Date(t.transaction_date) > anticipation.cutoff).reduce((acc, t) => acc + Number(t.amount_brl || 0), 0);
          const preExpenses = meta.expenses_part1 ?? exp - postExpenses;
          rawResult = postResult + getWeekData(key).nonAnticipatedDeal - postExpenses;
          anticipatedPart = {
            rawResult: Number(meta.result_without_rb_part1 || 0) + Number(meta.rake_deal_brl_part1 || 0) - preExpenses,
            closingState: meta.closing_state,
            bankEnd: meta.buyin_bankroll_part1,
          };
        }
        return {
          weekKey: key, weekStart: w.weekStart, weekEnd: w.weekEnd,
          rawResult, isClosed: Boolean(finalTx), isCurrent: key === currentWeekKey,
          closingState: finalTx?.closing_state, anticipatedPart,
        };
      });

    const initialSystemMakeup = Number(profile?.makeup_value || 0);
    const profitDealPct = Number(profile?.profit_deal ?? 100);
    const weekChainMap = calculateWeekChain(orderedWeekList, initialSystemMakeup, buyinConfig, profitDealPct);
    const currentWeekItem = weekChainMap.get(currentWeekKey);

    const netResultBrl = totalResultBrl;
    let totalWithRakeDealBrl = (totalResultBrl + totalRakeDealBrl) - expensesInPeriod + makeupBrl;
    // Saldo da banca: SEMPRE começa em 0, a não ser que seja manual com valor definido
    let buyinBankrollCurrent = buyinConfig.enabled && buyinConfig.isManual && buyinConfig.manualValue
      ? Math.min(buyinConfig.target, Math.max(0, Number(buyinConfig.manualValue) || 0))
      : 0;
    let buyinBankrollPercent = 0;

    if ((period === 'this_week' || !period) && currentWeekItem) {
      totalWithRakeDealBrl = totalResultBrl + totalRakeDealBrl;
      buyinBankrollCurrent = currentWeekItem.buyinBankrollOut;
    } else if (currentWeekItem) {
      buyinBankrollCurrent = currentWeekItem.buyinBankrollOut;
    }

    if (buyinConfig.target > 0) {
      buyinBankrollPercent = Math.min(100, (buyinBankrollCurrent / buyinConfig.target) * 100);
    }

    const totalProfitBbWithRb = totalProfitBb + rbProfitBb;
    const bb100 = totalHandsForBb > 0 ? (totalProfitBbWithRb / totalHandsForBb) * 100 : 0;

    let earliestSessionDate: Date | undefined = undefined;
    if (allSessions && allSessions.length > 0) {
      let minTime = Infinity;
      for (const s of allSessions) {
        if (s.start_time) {
          const t = new Date(s.start_time).getTime();
          if (!isNaN(t) && t < minTime) minTime = t;
        }
      }
      if (Number.isFinite(minTime)) {
        earliestSessionDate = new Date(minTime);
      }
    }

    const periodRange = getFilterPeriodRange(period, customRange, earliestSessionDate);
    const { startDate, endDate, daysCount, periodLabel } = periodRange;

    // Metas calculadas proporcionalmente aos dias do período filtrado:
    // (meta semanal / 7) * dias do filtro
    const baseWeeklyGrind = Number(profile?.weekly_grind_goal_hours || 0);
    const baseWeeklyStudy = Number(profile?.weekly_study_goal_hours || 0);

    const grindGoalHours = (baseWeeklyGrind / 7) * daysCount;
    const studyGoalHours = (baseWeeklyStudy / 7) * daysCount;

    const grindCompletedHours = sessionMinutes / 60;
    const studyMinutes = calculateStudyMinutesInInterval(studyRecords, startDate, endDate);
    const studyCompletedHours = studyMinutes / 60;

    const isWeekly = ['selected_week', 'this_week', 'last_week'].includes(period || 'this_week');
    const rangeKey = `${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}`;
    const selectedItem = weekChainMap.get(rangeKey);
    const anticipation = anticipationByWeek.get(rangeKey);
    const kind = period === 'selected_week' ? customRange?.kind || 'total' : 'total';
    const meta = anticipation?.metadata;
    let displayResult = totalResultBrl;
    let displayRake = 0;
    let displayDeal = 0;
    let liquid = 0;
    let available = 0;
    let bank = selectedItem?.buyinBankrollOut ?? 0;
    let added = selectedItem?.buyinBankrollAllocated ?? 0;
    let used = selectedItem?.buyinBankrollAbsorbed ?? 0;
    let makeup = selectedItem?.carryOverIn ?? 0;
    const expenses = financeTransactions.filter(t => {
      if (t.type !== 'expense') return false;
      const date = new Date(t.transaction_date);
      if (isWeekly) {
        if (`${t.week_start}_${t.week_end}` !== rangeKey) return false;
        if (anticipation && kind === 'anticipated') return date <= anticipation.cutoff;
        if (anticipation && kind === 'current') return date > anticipation.cutoff;
        return true;
      }
      return date >= startDate && date <= endDate;
    }).reduce((sum,t) => sum + Number(t.amount_brl || 0),0);
    if (isWeekly) {
      const rakeInfo = getWeekData(rangeKey);
      displayRake = rakeInfo.rakeTotal;
      displayDeal = rakeInfo.rakeDeal;
      liquid = selectedItem?.totalLiquido ?? 0;
      available = selectedItem?.availableResult ?? 0;
      if (anticipation && selectedItem?.anticipatedState) {
        const first = selectedItem.anticipatedState;
        if (kind === 'anticipated') {
          displayResult = Number(meta?.result_without_rb_part1 || 0);
          displayRake = Number(meta?.rake_total_part1 || 0);
          displayDeal = Number(meta?.rake_deal_brl_part1 || 0);
          liquid = first.totalLiquido; available = first.availableResult;
          bank = first.buyinBankrollOut; added = first.buyinBankrollAllocated;
          used = first.buyinBankrollAbsorbed; makeup = first.carryOverIn;
        } else if (kind === 'current') {
          displayRake = rakeInfo.nonAnticipatedRake;
          displayDeal = rakeInfo.nonAnticipatedDeal;
        } else {
          const post = (allSessions || []).filter(t => t.start_time && getWeekKeyForDate(new Date(t.start_time)) === rangeKey && new Date(t.start_time) > anticipation.cutoff);
          displayResult = Number(meta?.result_without_rb_part1 || 0) + post.reduce((sum,t) => {
            const site = Array.isArray(t.sites) ? t.sites[0] : t.sites;
            return sum + convertToBrl(Number(t.result || 0),site?.currency || 'BRL');
          },0);
          const combined = consolidateSettlements(first,selectedItem);
          liquid = combined.totalLiquido; available = combined.availableResult;
          added += first.buyinBankrollAllocated; used += first.buyinBankrollAbsorbed;
          makeup = first.carryOverIn;
        }
      }
    } else {
      // Partial periods: session rake is an observed cost; deal and liquid are
      // recognized only on the date of a recorded closing, without proration.
      displayRake = sessions.reduce((sum,t) => {
        const site = Array.isArray(t.sites) ? t.sites[0] : t.sites;
        return sum + convertToBrl(Number(t.rake || 0),site?.currency || 'BRL');
      },0);
      for (const tx of financeTransactions) {
        if (tx.type !== 'withdraw') continue;
        const date = new Date(tx.transaction_date);
        if (date < startDate || date > endDate) continue;
        const key = `${tx.week_start}_${tx.week_end}`;
        const item = weekChainMap.get(key);
        if (tx.description?.startsWith('FECHAMENTO ANTECIPADO')) {
          const ante = anticipationByWeek.get(key);
          displayDeal += Number(ante?.metadata?.rake_deal_brl_part1 || 0);
          liquid += Math.round(((item?.anticipatedState?.totalLiquido ?? 0) + Number.EPSILON) * 100) / 100;
        } else if (tx.description === 'FECHAMENTO') {
          const info = getWeekData(key);
          displayDeal += anticipationByWeek.has(key) ? info.nonAnticipatedDeal : info.rakeDeal;
          liquid += Math.round(((item?.totalLiquido ?? 0) + Number.EPSILON) * 100) / 100;
        }
      }
      available = displayResult + displayDeal - expenses;
      added = 0; used = 0; makeup = 0;
    }
    return {
      totalResultBrl: displayResult - expenses, totalHands, hoursLabel, sessionCount,
      totalWithRakeDealBrl: displayResult + displayDeal - expenses,
      totalRakeTotalBrl: displayRake, totalRakeDealBrl: displayDeal,
      nonAnticipatedRake: 0, nonAnticipatedDeal: 0, isAnticipated: Boolean(anticipation && isWeekly),
      anticipatedLucroLiquido: 0, anticipatedResultWithRb: 0,
      postCutoffResultBrl: 0, postCutoffTotalWithRb: 0, postCutoffLucroLiquido: 0,
      bb100, grindGoalHours, studyGoalHours, grindCompletedHours, studyCompletedHours, periodLabel,
      buyinBankrollEnabled: isWeekly && buyinConfig.enabled,
      buyinBankrollTarget: buyinConfig.target, buyinBankrollCurrent: bank,
      buyinBankrollPercent: buyinConfig.target > 0 ? Math.min(100,bank / buyinConfig.target * 100) : 0,
      showWeekSubtext: isWeekly && makeup < 0, weekArrecadadoBrl: available,
      currentWeekTotalLiquido: liquid, weekRawResult: available, expensesInPeriod: expenses,
      buyinBankrollAllocated: added, buyinBankrollAbsorbed: used, carryOverIn: makeup,
      financialNote: isWeekly ? 'Valores da semana e da etapa selecionada, conforme Fechamentos.' : 'Sessões pela data de início. Rake Deal e líquido somente dos fechamentos registrados no período, sem rateio semanal. Recargas seguem a regra da segunda-feira anterior ao início do filtro. Banca de buy-in aparece apenas no filtro por semana.',
    };
  }, [sessions, convertToBrl, weeklyRakes, financeTransactions, profile, studyRecords, period, customRange, allSessions]);

  const globalProfitBrl = React.useMemo(() => {
    // Se allSessions não estiver carregado, retorna 0 para não quebrar o cálculo
    if (!allSessions || allSessions.length === 0) return 0;
    
    const total = allSessions.reduce((acc, s) => {
      const siteData = Array.isArray(s.sites) ? s.sites[0] : s.sites;
      const currency = siteData?.currency || 'BRL';
      const sessionResult = Number(s.result || 0);
      return acc + convertToBrl(sessionResult, currency);
    }, 0);
    
    return total;
  }, [allSessions, convertToBrl]);

  const currentBankroll = React.useMemo(() => {
    const historyDates = [
      ...financeTransactions.map(t => t.transaction_date),
      ...(allSessions || []).map(s => s.start_time),
    ]
      .filter((value): value is string => Boolean(value))
      .map(value => new Date(value))
      .filter(date => Number.isFinite(date.getTime()));

    const earliestDate = historyDates.length
      ? new Date(Math.min(...historyDates.map(date => date.getTime())))
      : undefined;

    const { startDate, endDate } = getFilterPeriodRange(
      period,
      customRange,
      earliestDate
    );

    // Mantém segunda-feira ou retrocede até a segunda anterior.
    const adjustedStart = startOfWeek(startDate, { weekStartsOn: 1 });

    const total = financeTransactions
      .filter(transaction => {
        // RECARGA é armazenada como deposit no banco.
        if (transaction.type !== 'deposit') return false;

        const description = String(transaction.description || '')
          .trim()
          .toLowerCase();

        if (description !== 'banca' && description !== 'reload') return false;

        const date = new Date(transaction.transaction_date);
        return (
          Number.isFinite(date.getTime()) &&
          date >= adjustedStart &&
          date <= endDate &&
          !(period === 'selected_week' && customRange?.cutoff && customRange.kind === 'anticipated' && date > new Date(customRange.cutoff)) &&
          !(period === 'selected_week' && customRange?.cutoff && customRange.kind === 'current' && date <= new Date(customRange.cutoff))
        );
      })
      .reduce((sum, transaction) => sum + Number(transaction.amount_brl || 0), 0);

    const sessionResult = (allSessions || []).filter(session => {
      if (!session.start_time) return false;
      const date = new Date(session.start_time);
      if (!Number.isFinite(date.getTime()) || date < startDate || date > endDate) return false;
      if (period === 'selected_week' && customRange?.cutoff) {
        const cutoff = new Date(customRange.cutoff);
        if (customRange.kind === 'anticipated' && date > cutoff) return false;
        if (customRange.kind === 'current' && date <= cutoff) return false;
      }
      return true;
    }).reduce((sum, session) => {
      const site = Array.isArray(session.sites) ? session.sites[0] : session.sites;
      return sum + convertToBrl(Number(session.result || 0), site?.currency || 'BRL');
    }, 0);

    // Resultado da sessão já contém ganhos/perdas de jogo: não repetir o rake.
    return Math.round((total + sessionResult) * 100) / 100;
  }, [financeTransactions, allSessions, period, customRange, convertToBrl]);

  const stats = React.useMemo(() => {
    const {
      totalResultBrl, 
      totalHands, 
      hoursLabel, 
      totalWithRakeDealBrl, 
      totalRakeTotalBrl, 
      totalRakeDealBrl, 
      bb100,
      grindGoalHours,
      studyGoalHours,
      grindCompletedHours,
      studyCompletedHours,
      isAnticipated,
      nonAnticipatedRake,
      nonAnticipatedDeal,
      anticipatedLucroLiquido,
      anticipatedResultWithRb,
      postCutoffResultBrl,
      postCutoffTotalWithRb,
      postCutoffLucroLiquido,
      weekRawResult,
      buyinBankrollAllocated,
      buyinBankrollAbsorbed,
      carryOverIn,
    } = statsData;

    const savedLocalDeal = typeof window !== 'undefined' ? localStorage.getItem('poker_profit_deal') : null;
    const profitDealPct = profile?.profit_deal !== undefined && profile?.profit_deal !== null
      ? Number(profile.profit_deal)
      : (savedLocalDeal !== null ? Number(savedLocalDeal) : 100);

    const lucroLiquidoBrl = statsData.currentWeekTotalLiquido;
    const isPartialPeriod = !['selected_week', 'this_week', 'last_week'].includes(period || 'this_week');

    return [
      { 
        label: 'Bankroll atual', 
        value: formatCurrency(currentBankroll), 
        icon: Wallet, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10', 
        textColor: 'text-emerald-500' 
      },
      { 
        label: isPartialPeriod ? 'Líquido dos fechamentos' : 'Lucro Líquido', 
        value: formatCurrency(Math.max(0, lucroLiquidoBrl)), 
        icon: TrendingUp, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10', 
        textColor: 'text-emerald-500',
      },
      { 
        label: 'Horas Jogadas', 
        value: hoursLabel, 
        icon: Clock, 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10', 
        textColor: 'text-foreground' 
      },
      { 
        label: 'Total de Mãos', 
        value: formatNumber(totalHands), 
        icon: MousePointer2, 
        color: 'text-purple-500', 
        bg: 'bg-purple-500/10', 
        textColor: 'text-foreground' 
      },
      { 
        label: 'Resultado Total (+RB)', 
        value: formatCurrency(totalWithRakeDealBrl), 
        icon: DollarSign, 
        color: totalWithRakeDealBrl >= 0 ? 'text-emerald-500' : 'text-rose-500',
        bg: totalWithRakeDealBrl >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
        textColor: totalWithRakeDealBrl >= 0 ? 'text-emerald-500' : 'text-rose-500',
      },
      { 
        label: 'Resultado S/ RB', 
        value: formatCurrency(totalResultBrl), 
        icon: DollarSign, 
        color: totalResultBrl >= 0 ? 'text-emerald-500' : 'text-rose-500',
        bg: totalResultBrl >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
        textColor: totalResultBrl >= 0 ? 'text-emerald-500' : 'text-rose-500',
      },
      { 
        label: 'Rake Total', 
        value: formatCurrency(totalRakeTotalBrl), 
        icon: Percent, 
        color: 'text-rose-500', 
        bg: 'bg-rose-500/10', 
        textColor: 'text-foreground',
      },
      { 
        label: isPartialPeriod ? 'Rake Deal dos fechamentos' : 'Rake Deal', 
        value: formatCurrency(totalRakeDealBrl), 
        icon: Percent, 
        color: 'text-rose-500', 
        bg: 'bg-rose-500/10', 
        textColor: 'text-foreground',
      },
    ];
  }, [statsData, currentBankroll, profile, period]);

  if (isLoading || isLoadingAuth || isLoadingRakes || isLoadingFinance || isLoadingStudies || isLoadingProfile) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border animate-pulse h-24" />
          <Card className="bg-card border-border animate-pulse h-24" />
          <Card className="bg-card border-border animate-pulse h-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-card border-border animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  const hasBuyinCard = !!(statsData?.buyinBankrollEnabled && (statsData?.buyinBankrollTarget || 0) > 0);
  const showTopCards = (statsData?.grindGoalHours || 0) > 0 || (statsData?.studyGoalHours || 0) > 0 || hasBuyinCard;

  const grindProgressPercent = statsData.grindGoalHours > 0
    ? Math.min(100, (statsData.grindCompletedHours / statsData.grindGoalHours) * 100)
    : 0;
  const studyProgressPercent = statsData.studyGoalHours > 0
    ? Math.min(100, (statsData.studyCompletedHours / statsData.studyGoalHours) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{statsData.financialNote}</p>
      {showTopCards && (
        <div className={`grid grid-cols-1 ${hasBuyinCard ? 'md:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
          {statsData.grindGoalHours > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta de grind</p>
                    <p className="text-lg font-bold">
                      {formatHoursMinutes(statsData.grindCompletedHours)} / {formatHoursMinutes(statsData.grindGoalHours)}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-amber-500">{Math.round(grindProgressPercent)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${grindProgressPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Horas jogadas {statsData.periodLabel}</p>
              </CardContent>
            </Card>
          )}

          {statsData.studyGoalHours > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta de estudo</p>
                    <p className="text-lg font-bold">
                      {formatHoursMinutes(statsData.studyCompletedHours)} / {formatHoursMinutes(statsData.studyGoalHours)}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-sky-500">{Math.round(studyProgressPercent)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${studyProgressPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Horas de estudo {statsData.periodLabel}</p>
              </CardContent>
            </Card>
          )}

          {hasBuyinCard && (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Banca de Buy-in</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(statsData.buyinBankrollCurrent)} / {formatCurrency(statsData.buyinBankrollTarget)}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-purple-500">{Math.round(statsData.buyinBankrollPercent)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${statsData.buyinBankrollPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {statsData.buyinBankrollPercent >= 100 
                    ? 'Reserva 100% concluída' 
                    : `Reserva em formação (${Math.round(statsData.buyinBankrollPercent)}%)`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const modalType = getModalTypeForLabel(stat.label);
          const isClickable = modalType !== null;
          const isAnticipatedBadge = Boolean(statsData.isAnticipated && stat.label === 'Lucro Líquido');

          return (
            <InteractiveCard 
              key={index} 
              isClickable={isClickable}
              isAnticipatedBadge={isAnticipatedBadge}
              onClick={() => {
                if (modalType) setActiveModal(modalType);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`${stat.bg} p-2 rounded-lg`}>
                    <stat.icon className={`${stat.color} w-4 h-4`} />
                  </div>
                  {isClickable && (
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Ver detalhes →
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <h3 className={`text-xl font-bold mt-1 ${stat.textColor || 'text-foreground'}`}>{stat.value}</h3>
                  {stat.subtext && (
                    <div className={`text-[11px] mt-1 font-semibold ${stat.subtextColor || 'text-muted-foreground'}`}>
                      {stat.subtext}
                    </div>
                  )}
                </div>
              </CardContent>
            </InteractiveCard>
          );
        })}
      </div>

      <CardDetailsModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        period={period || 'this_week'}
        periodLabel={statsData.periodLabel}
        sessions={sessions}
        allSessions={allSessions}
        financeTransactions={financeTransactions}
        weeklyRakes={weeklyRakes}
        profile={profile}
        currentBankroll={currentBankroll}
        statsData={statsData}
        convertToBrl={convertToBrl}
      />
    </div>
  );
};

export default StatsCards;
