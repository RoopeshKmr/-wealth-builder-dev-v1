/**
 * TrackerProgressModal — reusable modal to display progress for a single tracker metric.
 *
 * Used by:
 *  - Onboarding Game (m8 recruits, m9 personal points, m10 licenses, m11 registrations)
 *  - Associate Tracker (same metrics, same display)
 */
import { Modal } from '@/shared/components';

export type TrackerMetric = 'recruits' | 'points' | 'licenses' | 'registrations';

export interface TrackerProgressModalProps {
  open: boolean;
  onClose: () => void;
  metric: TrackerMetric;
  current: number;
  target: number;
  /** Name of the user whose data is shown */
  userName?: string;
}

const METRIC_META: Record<TrackerMetric, { title: string; unit: string; targetLabel: string }> = {
  recruits: {
    title: '9 Recruits Progress',
    unit: 'recruits',
    targetLabel: '9 recruits required',
  },
  points: {
    title: '45,000 Personal Points',
    unit: 'pts',
    targetLabel: '45,000 personal points required',
  },
  licenses: {
    title: '3 Licenses Progress',
    unit: 'licenses',
    targetLabel: '3 licenses required',
  },
  registrations: {
    title: '15 Base Registrations',
    unit: 'registrations',
    targetLabel: '15 base registrations required',
  },
};

function formatNumber(n: number) {
  return n.toLocaleString();
}

export function TrackerProgressModal({
  open,
  onClose,
  metric,
  current,
  target,
  userName,
}: TrackerProgressModalProps) {
  const meta = METRIC_META[metric];
  const pct = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);
  const achieved = current >= target;

  const title = userName ? `${userName} — ${meta.title}` : meta.title;

  return (
    <Modal open={open} onClose={onClose} title={title} contentClassName="max-w-md">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1 text-white/70">
          <span>Progress</span>
          <span>
            {formatNumber(current)} / {formatNumber(target)} {meta.unit}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: achieved
                ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                : 'linear-gradient(90deg, #b45309, #d97706)',
            }}
          />
        </div>
        <p className="text-xs text-white/50 mt-1">{meta.targetLabel}</p>
      </div>

      {/* Status card */}
      <div
        className="rounded-xl p-4 text-center"
        style={{
          background: achieved ? 'rgba(22,163,74,0.15)' : 'rgba(180,83,9,0.15)',
          border: achieved ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(217,119,6,0.3)',
        }}
      >
        <div
          className="text-4xl font-black mb-1"
          style={{ color: achieved ? '#22c55e' : '#f59e0b' }}
        >
          {formatNumber(current)}
        </div>
        <div className="text-sm text-white/60 mb-2">current {meta.unit}</div>
        {achieved ? (
          <div className="text-green-400 font-semibold">🎉 Goal Achieved!</div>
        ) : (
          <div className="text-amber-400 text-sm">
            {formatNumber(remaining)} more {meta.unit} to reach goal
          </div>
        )}
      </div>
    </Modal>
  );
}
