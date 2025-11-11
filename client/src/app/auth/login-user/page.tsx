'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useRedux';
import { setUserDetails } from '@/features/user/userSlice';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dispatch = useAppDispatch();

  const loginUser = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8000/login-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Login successful! Redirecting...');
        console.log('Login successful:', data);
        dispatch(setUserDetails({
          name: data.name,
          email: data.email,
          index_name_ocr: data.index_name_ocr,
          index_name_pdf: data.index_name_pdf,
        } ));
        // Redirect after a short delay to show success message
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
        
      } else {
        const err = await response.text();
        setError(err || 'Login failed. Please try again.');
        // Reset form after showing error
        setTimeout(() => {
          setError('');
          setForm({ email: '', password: '' });
        }, 3000);
      }
    } catch (error) {
      console.error('An error occurred during login:', error);
      setError('Network error! Please check your server.');
      // Reset form after showing error
      setTimeout(() => {
        setError('');
        setForm({ email: '', password: '' });
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-black">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Login</h2>

        {/* Success Message */}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-100 p-3 text-sm text-green-700">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-100 p-3 text-sm text-red-700">
            <XCircle size={18} />
            {error}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={loginUser}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Loading...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/auth/signup-user" className="font-semibold text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}