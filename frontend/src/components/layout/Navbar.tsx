// =============================================================
// ZeroSend — components/layout/Navbar.tsx
//
// パス        : frontend/src/components/layout/Navbar.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : 共通ナビゲーションバー
//               ワイヤーフレーム SCR-001〜004 準拠
//               表示要素: ロゴ / Quantum-Safe バッジ / 画面タブ /
//                         ML-KEM-768 インジケーター / ユーザーアバター / ログアウト
//               非表示条件: /login ページ / /download/:token ページ
//
// 依存関係    :
//   react-router-dom       ^7     Link / useLocation / useNavigate
//   lucide-react           ^0.5   Shield / Send / List / Settings / LogOut / Lock
//   @/stores/authStore     local  useAuthStore (user / logout)
//   @/stores/keyStore      local  useKeyStore (clearKey)
//   @/lib/keyStorage       local  deleteKyberSecretKey (ログアウト時に秘密鍵削除)
//
// 使用箇所    :
//   @/App.tsx              全ページ共通レイアウト
// =============================================================

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Shield, Send, List, Settings, LogOut, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { deleteKyberSecretKey } from '@/lib/keyStorage'
import { useKeyStore } from '@/stores/keyStore'

const NAV_TABS = [
  { path: '/',      label: '送信',    icon: Send },
  { path: '/list',  label: '送信履歴', icon: List },
] as const

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const clearKey = useKeyStore((s) => s.clearKey)

  // download/:token ページはナビバー不表示
  if (location.pathname.startsWith('/download/')) return null
  // ログインページも不表示
  if (location.pathname === '/login') return null

  async function handleLogout() {
    if (user) {
      try {
        await deleteKyberSecretKey(user.id)
      } catch {
        // IndexedDB削除失敗は無視
      }
    }
    clearKey()
    logout()
    navigate('/login')
  }

  const initials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : '??'

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* ─── ロゴ + バッジ ─── */}
        <div className="navbar-logo">
          <div className="navbar-logo-icon">
            <Lock size={16} />
          </div>
          <span className="navbar-logo-text">ZeroSend</span>
          <span className="navbar-badge-quantum">Quantum-Safe</span>
        </div>

        {/* ─── ナビタブ ─── */}
        <nav className="navbar-tabs">
          {NAV_TABS.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`navbar-tab ${isActive ? 'navbar-tab--active' : ''}`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </Link>
            )
          })}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`navbar-tab ${location.pathname === '/admin' ? 'navbar-tab--active' : ''}`}
            >
              <Settings size={15} />
              <span>管理者</span>
            </Link>
          )}
        </nav>

        {/* ─── ML-KEM-768 インジケーター + ユーザー ─── */}
        <div className="navbar-right">
          {/* ML-KEM-768 インジケーター */}
          <div className="navbar-mlkem">
            <Shield size={13} className="navbar-mlkem-icon" />
            <span className="navbar-mlkem-text">ML-KEM-768</span>
            <span className="navbar-mlkem-dot" />
          </div>

          {isAuthenticated && (
            <>
              {/* ユーザーアバター */}
              <div className="navbar-avatar" title={user?.email}>
                {initials}
              </div>

              {/* ログアウト */}
              <button
                onClick={handleLogout}
                className="navbar-logout"
                title="ログアウト"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}