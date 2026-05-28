import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, Clock, Award, BookOpen, LogOut, ChevronRight,
  Calendar, TrendingUp, Beaker, Activity, Play, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, Experiment, AttendanceSession, ExperimentResult } from '../lib/supabase';

const DIFFICULTY_COLORS = {
  beginner: 'badge-green',
  intermediate: 'badge-yellow',
  advanced: 'badge-red',
};

export default function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'experiments' | 'history' | 'progress'>('home');

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);
    const [expRes, attRes, resRes] = await Promise.all([
      supabase.from('experiments').select('*').eq('is_active', true).order('created_at'),
      supabase.from('attendance_sessions').select('*, experiments(title)').eq('student_id', profile!.id).order('entry_time', { ascending: false }).limit(20),
      supabase.from('experiment_results').select('*, experiments(title, category)').eq('student_id', profile!.id).order('completed_at', { ascending: false }),
    ]);
    if (expRes.data) setExperiments(expRes.data as Experiment[]);
    if (attRes.data) setAttendance(attRes.data as AttendanceSession[]);
    if (resRes.data) setResults(resRes.data as ExperimentResult[]);
    setLoading(false);
  }

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const completedExps = new Set(results.map(r => r.experiment_id)).size;
  const totalSessions = attendance.length;

  async function handleLogout() {
    await signOut();
    navigate('/auth');
  }

  return (
    <div className="flex flex-col w-full h-full bg-gray-950 overflow-hidden">
      {/* Top Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">VR ChemLab</h1>
            <p className="text-slate-500 text-xs mt-0.5">Student Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-slate-200 text-sm font-medium">{profile?.full_name}</p>
            <p className="text-slate-500 text-xs">{profile?.student_id} · {profile?.class_name}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'S'}
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="flex border-b border-slate-800 bg-slate-900/40 shrink-0 overflow-x-auto">
        {[
          { id: 'home', label: 'Overview', icon: Activity },
          { id: 'experiments', label: 'Experiments', icon: FlaskConical },
          { id: 'history', label: 'Attendance', icon: Calendar },
          { id: 'progress', label: 'My Progress', icon: TrendingUp },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'home' && <HomeTab profile={profile} experiments={experiments} results={results} avgScore={avgScore} completedExps={completedExps} totalSessions={totalSessions} attendance={attendance} navigate={navigate} />}
            {activeTab === 'experiments' && <ExperimentsTab experiments={experiments} results={results} navigate={navigate} />}
            {activeTab === 'history' && <AttendanceTab attendance={attendance} />}
            {activeTab === 'progress' && <ProgressTab results={results} experiments={experiments} avgScore={avgScore} completedExps={completedExps} />}
          </>
        )}
      </main>
    </div>
  );
}

function HomeTab({ profile, experiments, results, avgScore, completedExps, totalSessions, attendance, navigate }: {
  profile: ReturnType<typeof useAuth>['profile'];
  experiments: Experiment[];
  results: ExperimentResult[];
  avgScore: number;
  completedExps: number;
  totalSessions: number;
  attendance: AttendanceSession[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const recentAttendance = attendance.slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Welcome back, {profile?.full_name?.split(' ')[0]}!</h2>
          <p className="text-slate-400 mt-1 text-sm">Ready to explore the virtual chemistry lab?</p>
        </div>
        <div className="hidden sm:block p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 animate-float">
          <FlaskConical className="w-10 h-10 text-cyan-400" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Avg Score', value: `${avgScore}%`, icon: Award, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
          { label: 'Experiments', value: completedExps, icon: FlaskConical, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Lab Sessions', value: totalSessions, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Available Labs', value: experiments.length, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${bg} shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-slate-500 text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick experiments + Recent attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-slate-200 font-semibold">Quick Start — Available Experiments</h3>
          {experiments.slice(0, 3).map(exp => (
            <ExperimentCard key={exp.id} exp={exp} result={results.find(r => r.experiment_id === exp.id)} onEnter={() => navigate(`/lab/${exp.id}`)} />
          ))}
          {experiments.length > 3 && (
            <button
              onClick={() => {}}
              className="w-full py-2 text-sm text-cyan-400 hover:text-cyan-300 text-center border border-slate-800 hover:border-cyan-500/30 rounded-lg transition-colors"
            >
              View all {experiments.length} experiments
            </button>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-slate-200 font-semibold">Recent Attendance</h3>
          {recentAttendance.length === 0 ? (
            <div className="lab-card text-center py-8 text-slate-500 text-sm">No sessions yet</div>
          ) : (
            <div className="space-y-2">
              {recentAttendance.map(session => (
                <div key={session.id} className="lab-card py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`badge ${session.status === 'completed' ? 'badge-green' : session.status === 'active' ? 'badge-cyan' : 'badge-slate'}`}>
                      {session.status}
                    </span>
                    <span className="text-slate-600 text-xs">{session.session_date}</span>
                  </div>
                  <p className="text-slate-300 text-sm font-medium truncate">
                    {(session.experiments as unknown as Experiment)?.title ?? 'General Session'}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {new Date(session.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {session.exit_time && ` — ${new Date(session.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExperimentCard({ exp, result, onEnter }: { exp: Experiment; result?: ExperimentResult; onEnter: () => void }) {
  return (
    <div className="lab-card hover:border-slate-700 transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={DIFFICULTY_COLORS[exp.difficulty]}>{exp.difficulty}</span>
            <span className="badge badge-slate">{exp.category}</span>
            {result && <span className="badge badge-green">Completed</span>}
          </div>
          <h4 className="text-slate-100 font-semibold truncate">{exp.title}</h4>
          <p className="text-slate-500 text-sm mt-1 line-clamp-2">{exp.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exp.estimated_duration_minutes} min</span>
            <span className="flex items-center gap-1"><Beaker className="w-3 h-3" />{exp.chemicals.length} chemicals</span>
            {result && <span className="text-cyan-400 font-medium">Score: {result.score}%</span>}
          </div>
        </div>
        <button
          onClick={onEnter}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-gray-900 border border-cyan-500/40 hover:border-cyan-500 rounded-lg text-sm font-medium transition-all"
        >
          <Play className="w-4 h-4" />
          <span className="hidden sm:block">Enter Lab</span>
        </button>
      </div>
    </div>
  );
}

function ExperimentsTab({ experiments, results, navigate }: { experiments: Experiment[]; results: ExperimentResult[]; navigate: ReturnType<typeof useNavigate> }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? experiments
    : filter === 'completed' ? experiments.filter(e => results.some(r => r.experiment_id === e.id))
    : experiments.filter(e => e.difficulty === filter);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">All Experiments</h2>
        <div className="flex gap-2 flex-wrap">
          {['all', 'beginner', 'intermediate', 'advanced', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === f ? 'bg-cyan-500 text-gray-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(exp => (
          <ExperimentCard key={exp.id} exp={exp} result={results.find(r => r.experiment_id === exp.id)} onEnter={() => navigate(`/lab/${exp.id}`)} />
        ))}
        {filtered.length === 0 && (
          <div className="lab-card text-center py-12 text-slate-500">No experiments found</div>
        )}
      </div>
    </div>
  );
}

function AttendanceTab({ attendance }: { attendance: AttendanceSession[] }) {
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Attendance History</h2>
        <span className="badge badge-cyan">{attendance.length} sessions</span>
      </div>

      {attendance.length === 0 ? (
        <div className="lab-card text-center py-16 text-slate-500">No attendance records yet. Enter a lab to start tracking.</div>
      ) : (
        <div className="space-y-3">
          {attendance.map(session => (
            <div key={session.id} className="lab-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${session.status === 'completed' ? 'badge-green' : session.status === 'active' ? 'badge-cyan' : 'badge-slate'}`}>
                      {session.status}
                    </span>
                    <span className="badge badge-slate">{session.device_type}</span>
                  </div>
                  <p className="text-slate-100 font-medium">
                    {(session.experiments as unknown as Experiment)?.title ?? 'General Lab Session'}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500 shrink-0">
                  <p className="text-slate-400 font-medium">{session.session_date}</p>
                  <p>In: {new Date(session.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  {session.exit_time && (
                    <p>Out: {new Date(session.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressTab({ results, experiments, avgScore, completedExps }: {
  results: ExperimentResult[];
  experiments: Experiment[];
  avgScore: number;
  completedExps: number;
}) {
  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-lg font-bold text-white">My Learning Progress</h2>

      {/* Score overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card text-center py-6">
          <p className="text-4xl font-bold text-cyan-400">{avgScore}%</p>
          <p className="text-slate-400 text-sm mt-1">Average Score</p>
        </div>
        <div className="stat-card text-center py-6">
          <p className="text-4xl font-bold text-green-400">{completedExps}</p>
          <p className="text-slate-400 text-sm mt-1">Experiments Done</p>
        </div>
        <div className="stat-card text-center py-6">
          <p className="text-4xl font-bold text-yellow-400">{experiments.length - completedExps}</p>
          <p className="text-slate-400 text-sm mt-1">Remaining</p>
        </div>
      </div>

      {/* Results list */}
      <div>
        <h3 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          Experiment Results
        </h3>
        {results.length === 0 ? (
          <div className="lab-card text-center py-12 text-slate-500">Complete experiments to see your progress here</div>
        ) : (
          <div className="space-y-3">
            {results.map(result => {
              const exp = experiments.find(e => e.id === result.experiment_id);
              return (
                <div key={result.id} className="lab-card">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-slate-100 font-medium">{(result.experiments as unknown as Experiment)?.title ?? exp?.title ?? 'Experiment'}</p>
                      <p className="text-slate-500 text-sm mt-0.5">
                        {result.steps_completed}/{result.total_steps} steps · {result.time_taken_minutes} min · {result.ai_hints_used} hints used
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${result.score >= 80 ? 'text-green-400' : result.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {result.score}%
                      </p>
                      <p className="text-slate-600 text-xs">{new Date(result.completed_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${result.score >= 80 ? 'bg-green-500' : result.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                  {result.observations && (
                    <p className="text-slate-500 text-xs mt-2 italic">"{result.observations}"</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completion progress */}
      <div className="lab-card">
        <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-cyan-400" />
          Curriculum Completion
        </h3>
        <div className="space-y-3">
          {experiments.map(exp => {
            const result = results.find(r => r.experiment_id === exp.id);
            return (
              <div key={exp.id} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${result ? 'bg-green-400' : 'bg-slate-700'}`} />
                <span className={`flex-1 text-sm ${result ? 'text-slate-200' : 'text-slate-500'}`}>{exp.title}</span>
                <span className={`text-xs font-medium ${result ? 'text-green-400' : 'text-slate-600'}`}>
                  {result ? `${result.score}%` : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full transition-all"
            style={{ width: `${experiments.length > 0 ? (completedExps / experiments.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs mt-1.5">{completedExps} of {experiments.length} completed</p>
      </div>
    </div>
  );
}
