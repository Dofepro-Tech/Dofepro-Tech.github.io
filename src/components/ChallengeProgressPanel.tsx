import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Flame, Gem, Search, Bookmark, Sparkles, CheckCircle2, BellRing, TimerReset } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { ReadingChallengeSummary } from '@/src/types';

interface ChallengeProgressPanelProps {
  summary: ReadingChallengeSummary;
  compact?: boolean;
}

export function ChallengeProgressPanel({ summary, compact = false }: ChallengeProgressPanelProps) {
  const { t } = useTranslation();
  const weeklyIcons = [Sparkles, BookOpen, Search, Bookmark];
  const readingIcons = [BookOpen, CheckCircle2];
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const timeLabels = useMemo(() => {
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 0, 0);

    const nextWeek = new Date(now);
    const currentDay = (nextWeek.getDay() + 6) % 7;
    nextWeek.setDate(nextWeek.getDate() + (7 - currentDay));
    nextWeek.setHours(0, 0, 0, 0);

    const formatTimeRemaining = (target: Date) => {
      const diff = Math.max(0, target.getTime() - now.getTime());
      const totalHours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `${days}d ${hours}h`;
      }

      return `${hours}h ${minutes}m`;
    };

    return {
      dailyReset: formatTimeRemaining(nextDay),
      weeklyReset: formatTimeRemaining(nextWeek),
    };
  }, [now]);

  const reminderKey = summary.completedToday === 0
    ? 'app.challenge_reminder_start'
    : summary.completedToday < summary.totalDailyTasks
      ? 'app.challenge_reminder_continue'
      : 'app.challenge_reminder_done';

  return (
    <div className={cn('rounded-3xl border border-olive/10 bg-paper-light/80 shadow-sm', compact ? 'p-4' : 'p-5 sm:p-6')}>
      <div className={cn('grid gap-3 mb-4', compact ? 'md:grid-cols-2' : 'lg:grid-cols-2')}>
        <div className="rounded-2xl border border-blue-600/10 bg-blue-600/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[0.24em] font-bold text-blue-700">{t('app.challenge_daily_reminder')}</p>
              <h4 className="font-serif text-lg font-bold text-ink mt-1">{t(reminderKey)}</h4>
              <p className="font-sans text-sm text-ink-light mt-1">{t('app.challenge_daily_reset', { time: timeLabels.dailyReset })}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gold/15 bg-gold/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold">
              <TimerReset className="w-4 h-4" />
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[0.24em] font-bold text-gold">{t('app.challenge_weekly_reset')}</p>
              <h4 className="font-serif text-lg font-bold text-ink mt-1">{t('app.challenge_weekly_reset_body')}</h4>
              <p className="font-sans text-sm text-ink-light mt-1">{t('app.challenge_weekly_reset_time', { time: timeLabels.weeklyReset })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={cn('grid gap-3', compact ? 'md:grid-cols-3' : 'sm:grid-cols-3')}>
        <div className="rounded-2xl bg-paper p-4 border border-olive/10">
          <div className="flex items-center gap-2 text-gold mb-2">
            <Flame className="w-4 h-4" />
            <span className="font-sans text-[10px] uppercase tracking-[0.24em] font-bold">{t('app.challenge_streak')}</span>
          </div>
          <p className="font-serif text-2xl font-bold text-ink">{summary.streak}</p>
          <p className="font-sans text-xs text-ink-light mt-1">{t('app.challenge_streak_body')}</p>
        </div>

        <div className="rounded-2xl bg-paper p-4 border border-olive/10">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-sans text-[10px] uppercase tracking-[0.24em] font-bold">{t('app.challenge_completed_today')}</span>
          </div>
          <p className="font-serif text-2xl font-bold text-ink">{summary.completedToday}/{summary.totalDailyTasks}</p>
          <p className="font-sans text-xs text-ink-light mt-1">{t('app.challenge_completed_today_body')}</p>
        </div>

        <div className="rounded-2xl bg-paper p-4 border border-olive/10">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <Gem className="w-4 h-4" />
            <span className="font-sans text-[10px] uppercase tracking-[0.24em] font-bold">{t('app.challenge_rewards')}</span>
          </div>
          <p className="font-serif text-2xl font-bold text-ink">{summary.totalRewardPoints}</p>
          <p className="font-sans text-xs text-ink-light mt-1">{t('app.challenge_rewards_body')}</p>
        </div>
      </div>

      <div className={cn('grid gap-4 mt-4', compact ? 'lg:grid-cols-2' : 'lg:grid-cols-2')}>
        <div className="rounded-2xl bg-paper p-4 border border-olive/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-serif text-lg font-bold text-ink">{t('app.weekly_goals')}</h4>
            <span className="font-sans text-[10px] uppercase tracking-[0.24em] text-olive/45 font-bold">{t('app.challenge_bonus_points')}</span>
          </div>

          <div className="space-y-3">
            {summary.weeklyGoals.map((goal, index) => {
              const Icon = weeklyIcons[index] || Sparkles;
              const percent = Math.min(100, Math.round((goal.progress / goal.target) * 100));

              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl', goal.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-olive/8 text-olive')}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans text-sm font-bold text-ink truncate">{goal.label}</p>
                        <p className="font-sans text-[11px] text-ink-light">{goal.progress}/{goal.target}</p>
                      </div>
                    </div>
                    <span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-gold">+{goal.rewardPoints}</span>
                  </div>
                  <div className="h-2 rounded-full bg-olive/8 overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', goal.completed ? 'bg-emerald-500' : 'bg-gold')} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-paper p-4 border border-olive/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-serif text-lg font-bold text-ink">{t('app.reading_goals')}</h4>
            <span className="font-sans text-[10px] uppercase tracking-[0.24em] text-olive/45 font-bold">{t('app.challenge_focus_week')}</span>
          </div>

          <div className="space-y-3">
            {summary.readingGoals.map((goal, index) => {
              const Icon = readingIcons[index] || BookOpen;
              const percent = Math.min(100, Math.round((goal.progress / goal.target) * 100));

              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl', goal.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-600/10 text-blue-700')}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans text-sm font-bold text-ink truncate">{goal.label}</p>
                        <p className="font-sans text-[11px] text-ink-light">{goal.progress}/{goal.target}</p>
                      </div>
                    </div>
                    <span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">+{goal.rewardPoints}</span>
                  </div>
                  <div className="h-2 rounded-full bg-blue-600/8 overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', goal.completed ? 'bg-emerald-500' : 'bg-blue-600')} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}