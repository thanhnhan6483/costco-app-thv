'use client';
import { useState, FormEvent, useEffect } from 'react';
import logo from '../../../public/logo_thv.png';

const STORAGE_KEY = 'login_remember';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved) { setUsername(saved.username ?? ''); setPassword(saved.password ?? ''); setRemember(true); }
    } catch { /* ignore */ }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        if (remember) localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, password }));
        else localStorage.removeItem(STORAGE_KEY);
        window.location.href = '/';
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `Lỗi ${res.status}`);
      }
    } catch (err) {
      setError('Không thể kết nối server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: '40px 36px', width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={logo.src} alt="Tân Huê Viên" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 20, color: '#1e293b' }}>TÂN HUÊ VIÊN</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Quản lý chấm công</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tên đăng nhập</label>
          <input
            type="text" value={username} onChange={e => setUsername(e.target.value)}
            required autoFocus autoComplete="username"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mật khẩu</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password"
              style={{ width: '100%', padding: '9px 38px 9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 0, lineHeight: 1 }}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)}
            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#2563eb' }} />
          <label htmlFor="remember" style={{ fontSize: 13, color: '#374151', cursor: 'pointer', userSelect: 'none' }}>Ghi nhớ đăng nhập</label>
        </div>
        {error && <div style={{ marginBottom: 14, padding: '8px 12px', background: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 13 }}>{error}</div>}
        <button
          type="submit" disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
