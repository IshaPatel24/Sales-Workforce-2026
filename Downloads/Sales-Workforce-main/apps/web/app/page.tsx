'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Lock, AlertCircle, RefreshCcw } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store auth credentials
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend api');
    } finally {
      setLoading(false);
    }
  };

  const autofillUser = (role: string) => {
    setUsername(role);
    setPassword('password123');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative',
    }}>
      {/* Background blobs for premium depth */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '300px',
        height: '300px',
        background: 'rgba(31, 111, 235, 0.15)',
        filter: 'blur(80px)',
        borderRadius: '50%',
        zIndex: -1,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '350px',
        height: '350px',
        background: 'rgba(35, 134, 54, 0.12)',
        filter: 'blur(90px)',
        borderRadius: '50%',
        zIndex: -1,
      }} />

      <div className="glass" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'var(--panel-border)',
            padding: '12px',
            borderRadius: '50%',
            color: 'var(--accent-primary)',
            boxShadow: '0 0 15px var(--accent-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.5px' }}>Sales & Workforce Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Enterprise Administration Portal</p>
        </div>

        {error && (
          <div className="glass" style={{
            background: 'rgba(248, 81, 73, 0.1)',
            borderColor: 'rgba(248, 81, 73, 0.2)',
            padding: '12px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--error)',
            fontSize: '13px',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={12} /> Username
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={12} /> Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="glow-btn"
            disabled={loading}
            style={{
              marginTop: '10px',
              padding: '14px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? <RefreshCcw className="animate-spin" size={16} /> : 'Access Dashboard'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center' }}>
            Demo Quick Logins (Seeds):
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            {['admin', 'management', 'supervisor1', 'salesperson1', 'purchaser1'].map((role) => (
              <button
                key={role}
                onClick={() => autofillUser(role)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--text-primary)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
