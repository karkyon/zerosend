// =============================================================
// ZeroSend — components/list/StatusFilterTabs.tsx
//
// パス        : frontend/src/components/list/StatusFilterTabs.tsx
// 作成日      : 2026-02
//
// 概要        : F-28 ステータスフィルタータブ
//               - すべて / 有効 / 期限切れ / 削除済み
//               - SessionStatus | undefined を親へ通知
// =============================================================

import type { SessionStatus } from '@/types/api'

interface TabDef {
  label:  string
  value:  SessionStatus | undefined
  color:  string
  active: string
}

const TABS: TabDef[] = [
  { label: 'すべて',   value: undefined,   color: 'text-slate-600',  active: 'bg-slate-800 text-white'    },
  { label: '有効',     value: 'ready',     color: 'text-green-600',  active: 'bg-green-600 text-white'    },
  { label: '期限切れ', value: 'expired',   color: 'text-red-600',    active: 'bg-red-600   text-white'    },
  { label: '削除済み', value: 'deleted',   color: 'text-slate-500',  active: 'bg-slate-500 text-white'    },
]

interface Props {
  current:   SessionStatus | undefined
  onChange:  (status: SessionStatus | undefined) => void
  counts?:   Partial<Record<SessionStatus | 'all', number>>
}

export function StatusFilterTabs({ current, onChange, counts }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map((tab) => {
        const isActive = tab.value === current
        const count    = tab.value === undefined
          ? counts?.all
          : counts?.[tab.value]

        return (
          <button
            key={tab.label}
            onClick={() => onChange(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all
              ${isActive ? tab.active : `bg-slate-100 ${tab.color} hover:bg-slate-200`}`}
          >
            {tab.label}
            {count !== undefined && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-white/25' : 'bg-slate-200 text-slate-500'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}