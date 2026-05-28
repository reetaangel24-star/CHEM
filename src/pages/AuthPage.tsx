import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FlaskConical, Zap, Shield, BookOpen } from 'lucide-react';

export default function AuthPage() {
  const { session, profile, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [className, setClassName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else {
        if (!name.trim()) { setError('Full name is required'); return; }
        if (!studentId.trim()) { setError('Student ID is required'); return; }
        const { error } = await signUp(email, password, name, studentId, className);
        if (error) setError(error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full h-full bg-gray-950 overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-gray-950" />
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(0,229,255,0.15) 0%, transparent 60%)',
          }}
        />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
              <FlaskConical className="w-7 h-7 text-cyan-400" />
            </div>
            <span className="text-xl font-bold text-white font-space">VR ChemLab</span>
          </div>
          <p className="text-slate-500 text-sm ml-1">AI-Powered Virtual Chemistry Laboratory</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Master Chemistry<br />
              <span className="text-cyan-400">in Virtual Reality</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Conduct real experiments, get AI guidance, and learn through immersive 3D simulations — no physical lab required.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap, title: 'Real-time AI Tutor', desc: 'Get instant guidance from your personal chemistry tutor' },
              { icon: FlaskConical, title: 'Interactive 3D Lab', desc: 'Mix chemicals, observe reactions in a safe virtual environment' },
              { icon: Shield, title: 'Safe Experiments', desc: 'Practice dangerous reactions without any real-world risk' },
              { icon: BookOpen, title: 'Detailed Reports', desc: 'Export experiment results as PDF for submission' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20 mt-0.5 shrink-0">
                  <Icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-slate-200 font-medium text-sm">{title}</p>
                  <p className="text-slate-500 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-600 text-xs">Final Year Project — Ed-Tech Demo v1.0</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="p-1.5 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
              <FlaskConical className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-lg font-bold text-white">VR ChemLab</span>
          </div>

          <div className="lab-card">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-slate-400 text-sm">
                {mode === 'login'
                  ? 'Sign in to access your virtual lab'
                  : 'Register to start your chemistry journey'}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex bg-slate-800 rounded-lg p-1 mb-6">
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                    mode === m
                      ? 'bg-cyan-500 text-gray-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="lab-input"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Student ID</label>
                      <input
                        type="text"
                        value={studentId}
                        onChange={e => setStudentId(e.target.value)}
                        placeholder="e.g. STU001"
                        className="lab-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Class</label>
                      <input
                        type="text"
                        value={className}
                        onChange={e => setClassName(e.target.value)}
                        placeholder="e.g. 12-A"
                        className="lab-input"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="lab-input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="lab-input"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full lab-btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                ) : null}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Admin hint */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-slate-600 text-xs text-center">
                Admin access? Contact your system administrator for credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
