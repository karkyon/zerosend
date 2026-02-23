// =============================================================
// ZeroSend — components/send/StepIndicator.tsx
//
// パス        : frontend/src/components/send/StepIndicator.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-16 3ステップ進捗インジケーター
//               ①ファイル選択 → ②受信者設定 → ③送信確認
//               ワイヤーフレーム準拠デザイン
// =============================================================

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3
}

const STEPS = [
  { num: 1, label: 'ファイル選択' },
  { num: 2, label: '受信者設定' },
  { num: 3, label: '送信確認' },
] as const

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = step.num < currentStep
        const isActive    = step.num === currentStep
        const isLast      = idx === STEPS.length - 1

        return (
          <div key={step.num} className="flex items-center flex-1">
            {/* ステップ本体 */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {/* 番号バッジ */}
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                    : isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-200'
                    : 'bg-gray-100 text-gray-400 border border-gray-200',
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>

              {/* ラベル */}
              <span
                className={[
                  'text-[11px] font-semibold whitespace-nowrap transition-colors duration-200',
                  isCompleted
                    ? 'text-emerald-600'
                    : isActive
                    ? 'text-indigo-600'
                    : 'text-gray-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>

            {/* コネクタライン */}
            {!isLast && (
              <div className="flex-1 h-px mx-3 mt-[-14px] transition-all duration-500">
                <div
                  className={[
                    'h-full transition-all duration-500',
                    isCompleted ? 'bg-emerald-400' : 'bg-gray-200',
                  ].join(' ')}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}