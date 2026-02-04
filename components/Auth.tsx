'use client';

import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage('이메일로 인증 링크를 보냈습니다.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-soft border border-slate-200/80 p-8">
        <h1 className="text-2xl font-bold text-slate-900">Growthclinic.ai</h1>
        <p className="text-slate-500 text-sm mt-1">계속하려면 로그인하세요.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>
          )}
          {message && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '처리 중...' : mode === 'signup' ? '회원가입' : '로그인'}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-500">
          {mode === 'signup' ? '이미 계정이 있나요?' : '계정이 없나요?'}{' '}
          <button
            className="text-blue-600 hover:text-blue-700 font-semibold"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          >
            {mode === 'signup' ? '로그인' : '회원가입'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
