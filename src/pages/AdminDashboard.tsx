import { useState, useEffect, useRef } from 'react';
import {
  FlaskConical, LogOut, Users, Calendar, BarChart2,
  Download, Search, ChevronDown, RefreshCw, BookOpen,
  TrendingUp, Clock, Award, AlertTriangle, CheckCircle,
  Shield, Activity, Eye, Filter, FileText, Plus, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase, Profile, Experiment, AttendanceSession, ExperimentResult } from '../lib/supabase';

type AdminTab = 'overview' | 'attendance' | 'students' | 'experiments' | 'reports';

interface StudentWithStats extends Profile {
  totalSessions: number;
  completedExps: number;
  avgScore: number;
  lastSeen: string | null;
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateExp, setShowCreateExp] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setRefreshing(true);
    const [attRes, studRes, expRes, resRes] = await Promise.all([
      supabase.from('attendance_sessions').select('*, profiles(full_name, student_id, class_name), experiments(title, category)').order('entry_time', { ascending: false }).limit(500),
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
      supabase.from('experiments').select('*').order('created_at'),
      supabase.from('experiment_results').select('*, experiments(title)').order('completed_at', { ascending: false }),
    ]);

    if (attRes.data) setAttendance(attRes.data as AttendanceSession[]);
    if (studRes.data) setStudents(studRes.data as Profile[]);
    if (expRes.data) setExperiments(expRes.data as Experiment[]);
    if (resRes.data) setResults(resRes.data as ExperimentResult[]);
    setLoading(false);
    setRefreshing(false);
  }

  // Compute student stats
  const studentsWithStats: StudentWithStats[] = students.map(s => {
    const stuAtt = attendance.filter(a => a.student_id === s.id);
    const stuRes = results.filter(r => r.student_id === s.id);
    return {
      ...s,
      totalSessions: stuAtt.length,
      completedExps: new Set(stuRes.map(r => r.experiment_id)).size,
      avgScore: stuRes.length > 0 ? Math.round(stuRes.reduce((acc, r) => acc + r.score, 0) / stuRes.length) : 0,
      lastSeen: stuAtt[0]?.entry_time ?? null,
    };
  });

  // Overview stats
  const activeToday = attendance.filter(a => a.session_date === new Date().toISOString().split('T')[0]).length;
  const totalCompleted = attendance.filter(a => a.status === 'completed').length;
  const overallAvg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;

  async function handleLogout() {
    await signOut();
    navigate('/auth');
  }

  return (
    <div className="flex flex-col w-full h-full bg-gray-950 overflow-hidden">
      {/* Admin header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">VR ChemLab Admin</h1>
            <p className="text-slate-500 text-xs mt-0.5">Control Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-xs font-medium">Administrator</span>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-slate-200 text-sm font-medium">{profile?.full_name}</p>
            <p className="text-slate-500 text-xs">System Admin</p>
          </div>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleLogout} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="flex border-b border-slate-800 bg-slate-900/60 shrink-0 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'attendance', label: 'Attendance', icon: Calendar },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'experiments', label: 'Experiments', icon: FlaskConical },
          { id: 'reports', label: 'Reports', icon: BarChart2 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as AdminTab)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === id
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                students={studentsWithStats}
                attendance={attendance}
                experiments={experiments}
                results={results}
                activeToday={activeToday}
                totalCompleted={totalCompleted}
                overallAvg={overallAvg}
              />
            )}
            {activeTab === 'attendance' && (
              <AttendanceTab
                attendance={attendance}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />
            )}
            {activeTab === 'students' && (
              <StudentsTab students={studentsWithStats} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            )}
            {activeTab === 'experiments' && (
              <ExperimentsTab experiments={experiments} results={results} onCreateClick={() => setShowCreateExp(true)} onExperimentAdded={loadData} />
            )}
            {activeTab === 'reports' && (
              <ReportsTab attendance={attendance} students={students} results={results} experiments={experiments} />
            )}
          </>
        )}
      </main>

      {/* Create experiment modal */}
      {showCreateExp && (
        <CreateExperimentModal
          onClose={() => setShowCreateExp(false)}
          onSuccess={() => { setShowCreateExp(false); loadData(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, bg }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string; bg: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg border ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-slate-400 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-slate-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function OverviewTab({ students, attendance, experiments, results, activeToday, totalCompleted, overallAvg }: {
  students: StudentWithStats[];
  attendance: AttendanceSession[];
  experiments: Experiment[];
  results: ExperimentResult[];
  activeToday: number;
  totalCompleted: number;
  overallAvg: number;
}) {
  // Group attendance by date for last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const dailyCounts = last7.map(date => ({
    date,
    count: attendance.filter(a => a.session_date === date).length,
    label: new Date(date + 'T00:00:00').toLocaleDateString([], { weekday: 'short' }),
  }));

  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1);

  // Top performing students
  const topStudents = [...students].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

  // Experiment popularity
  const expPopularity = experiments.map(e => ({
    ...e,
    sessions: attendance.filter(a => a.experiment_id === e.id).length,
    avgScore: (() => {
      const r = results.filter(res => res.experiment_id === e.id);
      return r.length > 0 ? Math.round(r.reduce((s, res) => s + res.score, 0) / r.length) : 0;
    })(),
  })).sort((a, b) => b.sessions - a.sessions);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={students.length} icon={Users} color="text-amber-400" bg="bg-amber-500/10 border-amber-500/20" sub="Registered" />
        <StatCard label="Active Today" value={activeToday} icon={Activity} color="text-green-400" bg="bg-green-500/10 border-green-500/20" sub="Current sessions" />
        <StatCard label="Labs Completed" value={totalCompleted} icon={CheckCircle} color="text-cyan-400" bg="bg-cyan-500/10 border-cyan-500/20" sub="All time" />
        <StatCard label="Avg Score" value={`${overallAvg}%`} icon={Award} color="text-blue-400" bg="bg-blue-500/10 border-blue-500/20" sub="Across all experiments" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity chart */}
        <div className="lg:col-span-2 lab-card">
          <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Lab Activity — Last 7 Days
          </h3>
          <div className="flex items-end gap-2 h-32">
            {dailyCounts.map(({ date, count, label }) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-slate-500 text-xs">{count}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                  <div
                    className="w-full bg-amber-500/70 hover:bg-amber-400 rounded-t transition-all"
                    style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-slate-500 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top students */}
        <div className="lab-card">
          <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {topStudents.length === 0 ? (
              <p className="text-slate-500 text-sm">No data yet</p>
            ) : topStudents.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : 'bg-amber-700/20 text-amber-600'
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{s.full_name}</p>
                  <p className="text-slate-500 text-xs">{s.student_id}</p>
                </div>
                <span className={`text-sm font-bold ${s.avgScore >= 80 ? 'text-green-400' : s.avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {s.avgScore}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Experiment stats */}
      <div className="lab-card">
        <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-amber-400" />
          Experiment Engagement
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Experiment', 'Category', 'Difficulty', 'Sessions', 'Avg Score'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {expPopularity.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 text-slate-200 font-medium">{exp.title}</td>
                  <td className="py-3 px-3 text-slate-500">{exp.category}</td>
                  <td className="py-3 px-3">
                    <span className={`badge ${exp.difficulty === 'beginner' ? 'badge-green' : exp.difficulty === 'intermediate' ? 'badge-yellow' : 'badge-red'}`}>
                      {exp.difficulty}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-medium">{exp.sessions}</td>
                  <td className="py-3 px-3">
                    <span className={`font-bold ${exp.avgScore >= 80 ? 'text-green-400' : exp.avgScore >= 60 ? 'text-yellow-400' : exp.sessions === 0 ? 'text-slate-600' : 'text-red-400'}`}>
                      {exp.sessions === 0 ? '—' : `${exp.avgScore}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AttendanceTab({ attendance, searchQuery, setSearchQuery, dateFilter, setDateFilter, statusFilter, setStatusFilter }: {
  attendance: AttendanceSession[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  dateFilter: string;
  setDateFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
}) {
  const filtered = attendance.filter(a => {
    const prof = a.profiles as unknown as Profile;
    const exp = a.experiments as unknown as Experiment;
    const matchSearch = !searchQuery ||
      prof?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prof?.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDate = !dateFilter || a.session_date === dateFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchDate && matchStatus;
  });

  function exportCSV() {
    const rows = [
      ['Date', 'Student Name', 'Student ID', 'Experiment', 'Entry Time', 'Exit Time', 'Duration (min)', 'Device', 'Status'],
      ...filtered.map(a => {
        const prof = a.profiles as unknown as Profile;
        const exp = a.experiments as unknown as Experiment;
        const duration = a.exit_time
          ? Math.round((new Date(a.exit_time).getTime() - new Date(a.entry_time).getTime()) / 60000)
          : '';
        return [
          a.session_date,
          prof?.full_name ?? '',
          prof?.student_id ?? '',
          exp?.title ?? 'General',
          new Date(a.entry_time).toLocaleTimeString(),
          a.exit_time ? new Date(a.exit_time).toLocaleTimeString() : '',
          duration,
          a.device_type,
          a.status,
        ];
      })
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-white">Attendance Records</h2>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-sm font-medium transition-colors">
          <Download className="w-4 h-4" />
          Export CSV ({filtered.length} records)
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by student name, ID, or experiment..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="lab-input pl-10"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="lab-input sm:w-44"
        />
        <div className="relative sm:w-36">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="lab-input appearance-none pr-8"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
        {(searchQuery || dateFilter || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearchQuery(''); setDateFilter(''); setStatusFilter('all'); }}
            className="px-3 py-2 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="text-slate-500 text-sm">Showing {filtered.length} of {attendance.length} records</div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              {['Date', 'Student', 'Class', 'Experiment', 'Entry', 'Exit', 'Duration', 'Device', 'Status'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-slate-400 font-medium text-xs border-b border-slate-800 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.slice(0, 100).map(session => {
              const prof = session.profiles as unknown as Profile;
              const exp = session.experiments as unknown as Experiment;
              const duration = session.exit_time
                ? Math.round((new Date(session.exit_time).getTime() - new Date(session.entry_time).getTime()) / 60000)
                : null;
              return (
                <tr key={session.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{session.session_date}</td>
                  <td className="py-3 px-4">
                    <p className="text-slate-200 font-medium whitespace-nowrap">{prof?.full_name ?? '—'}</p>
                    <p className="text-slate-600 text-xs">{prof?.student_id ?? ''}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{prof?.class_name ?? '—'}</td>
                  <td className="py-3 px-4 text-slate-300 max-w-48 truncate">{exp?.title ?? 'General'}</td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{new Date(session.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{session.exit_time ? new Date(session.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{duration !== null ? `${duration}m` : '—'}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap capitalize">{session.device_type}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`badge ${session.status === 'completed' ? 'badge-green' : session.status === 'active' ? 'badge-cyan' : 'badge-slate'}`}>
                      {session.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-slate-600">No records found</td></tr>
            )}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div className="text-center py-3 text-slate-600 text-xs border-t border-slate-800">
            Showing 100 of {filtered.length} records. Export CSV for full data.
          </div>
        )}
      </div>
    </div>
  );
}

function StudentsTab({ students, searchQuery, setSearchQuery }: { students: StudentWithStats[]; searchQuery: string; setSearchQuery: (v: string) => void }) {
  const filtered = students.filter(s =>
    !searchQuery ||
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.student_id ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.class_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function exportCSV() {
    const rows = [
      ['Full Name', 'Student ID', 'Class', 'Email', 'Total Sessions', 'Experiments Done', 'Avg Score', 'Last Active', 'Joined'],
      ...filtered.map(s => [
        s.full_name, s.student_id ?? '', s.class_name,
        '', s.totalSessions, s.completedExps, `${s.avgScore}%`,
        s.lastSeen ? new Date(s.lastSeen).toLocaleDateString() : 'Never',
        new Date(s.created_at).toLocaleDateString(),
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-white">Student Management</h2>
        <div className="flex gap-2">
          <span className="badge badge-slate">{filtered.length} students</span>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-medium transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="lab-input pl-10"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              {['Student', 'Class', 'Sessions', 'Experiments', 'Avg Score', 'Performance', 'Last Active'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-slate-400 font-medium text-xs border-b border-slate-800 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                      {s.full_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium whitespace-nowrap">{s.full_name}</p>
                      <p className="text-slate-600 text-xs">{s.student_id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400">{s.class_name || '—'}</td>
                <td className="py-3 px-4 text-slate-300 font-medium">{s.totalSessions}</td>
                <td className="py-3 px-4 text-slate-300 font-medium">{s.completedExps}</td>
                <td className="py-3 px-4">
                  <span className={`font-bold text-base ${s.avgScore >= 80 ? 'text-green-400' : s.avgScore >= 60 ? 'text-yellow-400' : s.totalSessions === 0 ? 'text-slate-600' : 'text-red-400'}`}>
                    {s.totalSessions === 0 ? '—' : `${s.avgScore}%`}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {s.totalSessions === 0 ? (
                    <span className="badge badge-slate">Inactive</span>
                  ) : s.avgScore >= 80 ? (
                    <span className="badge badge-green">Excellent</span>
                  ) : s.avgScore >= 60 ? (
                    <span className="badge badge-yellow">Good</span>
                  ) : (
                    <span className="badge badge-red">Needs Help</span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                  {s.lastSeen ? new Date(s.lastSeen).toLocaleDateString() : 'Never'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-600">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExperimentsTab({ experiments, results, onCreateClick, onExperimentAdded }: {
  experiments: Experiment[];
  results: ExperimentResult[];
  onCreateClick: () => void;
  onExperimentAdded: () => void;
}) {
  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Experiment Management</h2>
        <div className="flex items-center gap-3">
          <span className="badge badge-amber">{experiments.length} experiments</span>
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-900 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Experiment
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {experiments.map(exp => {
          const expResults = results.filter(r => r.experiment_id === exp.id);
          const avgScore = expResults.length > 0 ? Math.round(expResults.reduce((s, r) => s + r.score, 0) / expResults.length) : 0;
          const highScorers = expResults.filter(r => r.score >= 80).length;

          return (
            <div key={exp.id} className="lab-card hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${exp.difficulty === 'beginner' ? 'badge-green' : exp.difficulty === 'intermediate' ? 'badge-yellow' : 'badge-red'}`}>
                      {exp.difficulty}
                    </span>
                    <span className="badge badge-slate">{exp.category}</span>
                    <span className={`badge ${exp.is_active ? 'badge-green' : 'badge-slate'}`}>
                      {exp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="text-slate-100 font-semibold text-base">{exp.title}</h3>
                  <p className="text-slate-500 text-sm mt-1">{exp.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {[
                      { label: 'Attempts', value: expResults.length },
                      { label: 'Avg Score', value: expResults.length > 0 ? `${avgScore}%` : '—' },
                      { label: 'High Scorers', value: highScorers },
                      { label: 'Duration', value: `${exp.estimated_duration_minutes}m` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-800/60 rounded-lg px-3 py-2">
                        <p className="text-slate-200 font-semibold text-lg">{value}</p>
                        <p className="text-slate-600 text-xs">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <div>
                      <p className="text-slate-600 text-xs mb-1">Chemicals ({exp.chemicals.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {exp.chemicals.slice(0, 4).map(c => (
                          <span key={c} className="badge badge-slate text-xs">{c}</span>
                        ))}
                        {exp.chemicals.length > 4 && <span className="badge badge-slate">+{exp.chemicals.length - 4}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {expResults.length > 0 && (
                  <div className="shrink-0 text-center">
                    <div className={`text-3xl font-bold ${avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {avgScore}%
                    </div>
                    <p className="text-slate-500 text-xs">avg score</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportsTab({ attendance, students, results, experiments }: {
  attendance: AttendanceSession[];
  students: Profile[];
  results: ExperimentResult[];
  experiments: Experiment[];
}) {
  const totalTime = results.reduce((s, r) => s + r.time_taken_minutes, 0);
  const totalHints = results.reduce((s, r) => s + r.ai_hints_used, 0);

  function exportFullReport() {
    const lines: string[] = [
      '=== VR CHEMLAB — SYSTEM ANALYTICS REPORT ===',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '--- SUMMARY ---',
      `Total Students: ${students.length}`,
      `Total Lab Sessions: ${attendance.length}`,
      `Total Experiments Completed: ${results.length}`,
      `Overall Average Score: ${results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0}%`,
      `Total Time Spent in Lab: ${totalTime} minutes`,
      `Total AI Hints Used: ${totalHints}`,
      '',
      '--- EXPERIMENTS ---',
      ...experiments.map(e => {
        const r = results.filter(res => res.experiment_id === e.id);
        const avg = r.length > 0 ? Math.round(r.reduce((s, res) => s + res.score, 0) / r.length) : 0;
        return `${e.title}: ${r.length} attempts, ${avg}% avg score`;
      }),
      '',
      '--- STUDENT PERFORMANCE ---',
      ...students.map(s => {
        const r = results.filter(res => res.student_id === s.id);
        const avg = r.length > 0 ? Math.round(r.reduce((sum, res) => sum + res.score, 0) / r.length) : 0;
        return `${s.full_name} (${s.student_id}): ${r.length} experiments, ${avg}% avg`;
      }),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vrchemlab_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const scoreDistribution = [
    { range: '90–100', count: results.filter(r => r.score >= 90).length, color: 'bg-green-500' },
    { range: '80–89', count: results.filter(r => r.score >= 80 && r.score < 90).length, color: 'bg-green-400' },
    { range: '70–79', count: results.filter(r => r.score >= 70 && r.score < 80).length, color: 'bg-yellow-400' },
    { range: '60–69', count: results.filter(r => r.score >= 60 && r.score < 70).length, color: 'bg-yellow-500' },
    { range: 'Below 60', count: results.filter(r => r.score < 60).length, color: 'bg-red-500' },
  ];
  const maxDist = Math.max(...scoreDistribution.map(d => d.count), 1);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Analytics & Reports</h2>
        <button onClick={exportFullReport} className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-sm font-medium transition-colors">
          <Download className="w-4 h-4" />
          Export Full Report
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Students', value: students.length },
          { label: 'Sessions', value: attendance.length },
          { label: 'Results', value: results.length },
          { label: 'Experiments', value: experiments.length },
          { label: 'Lab Hours', value: `${Math.round(totalTime / 60)}h` },
          { label: 'AI Hints', value: totalHints },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <div className="lab-card">
          <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            Score Distribution
          </h3>
          {results.length === 0 ? (
            <p className="text-slate-500 text-sm">No results yet</p>
          ) : (
            <div className="space-y-3">
              {scoreDistribution.map(({ range, count, color }) => (
                <div key={range} className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm w-20 shrink-0">{range}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                    <div
                      className={`${color} h-full rounded-full transition-all`}
                      style={{ width: `${(count / maxDist) * 100}%` }}
                    />
                  </div>
                  <span className="text-slate-300 text-sm w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="lab-card">
          <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Attention Required
          </h3>
          <div className="space-y-3">
            {(() => {
              const alerts: { msg: string; type: 'warn' | 'info' | 'good' }[] = [];
              const lowScorers = students.filter(s => {
                const r = results.filter(res => res.student_id === s.id);
                return r.length > 0 && r.reduce((sum, res) => sum + res.score, 0) / r.length < 60;
              });
              if (lowScorers.length > 0) alerts.push({ msg: `${lowScorers.length} students scoring below 60%`, type: 'warn' });
              const inactive = students.filter(s => attendance.filter(a => a.student_id === s.id).length === 0);
              if (inactive.length > 0) alerts.push({ msg: `${inactive.length} students never entered the lab`, type: 'warn' });
              const abandoned = attendance.filter(a => a.status === 'abandoned').length;
              if (abandoned > 0) alerts.push({ msg: `${abandoned} abandoned sessions detected`, type: 'info' });
              if (alerts.length === 0) alerts.push({ msg: 'All metrics look healthy!', type: 'good' });
              return alerts;
            })().map(({ msg, type }, i) => (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg ${type === 'warn' ? 'bg-red-500/10 border border-red-500/20' : type === 'info' ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                {type === 'warn' ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> : type === 'info' ? <Eye className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />}
                <p className={`text-sm ${type === 'warn' ? 'text-red-300' : type === 'info' ? 'text-yellow-300' : 'text-green-300'}`}>{msg}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed experiment stats */}
      <div className="lab-card">
        <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          Detailed Experiment Analytics
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Experiment', 'Attempts', 'Avg Score', 'Avg Time', 'Avg Hints', 'Pass Rate'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {experiments.map(exp => {
                const r = results.filter(res => res.experiment_id === exp.id);
                const avg = r.length > 0 ? Math.round(r.reduce((s, res) => s + res.score, 0) / r.length) : 0;
                const avgTime = r.length > 0 ? Math.round(r.reduce((s, res) => s + res.time_taken_minutes, 0) / r.length) : 0;
                const avgHints = r.length > 0 ? Math.round(r.reduce((s, res) => s + res.ai_hints_used, 0) / r.length) : 0;
                const passRate = r.length > 0 ? Math.round((r.filter(res => res.score >= 60).length / r.length) * 100) : 0;
                return (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-slate-200 font-medium">{exp.title}</td>
                    <td className="py-3 px-3 text-slate-400">{r.length}</td>
                    <td className="py-3 px-3">
                      <span className={`font-bold ${avg >= 80 ? 'text-green-400' : avg >= 60 ? 'text-yellow-400' : r.length === 0 ? 'text-slate-600' : 'text-red-400'}`}>
                        {r.length === 0 ? '—' : `${avg}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{r.length === 0 ? '—' : `${avgTime}m`}</td>
                    <td className="py-3 px-3 text-slate-400">{r.length === 0 ? '—' : avgHints}</td>
                    <td className="py-3 px-3">
                      <span className={`font-medium ${passRate >= 80 ? 'text-green-400' : passRate >= 60 ? 'text-yellow-400' : r.length === 0 ? 'text-slate-600' : 'text-red-400'}`}>
                        {r.length === 0 ? '—' : `${passRate}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreateExperimentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    estimated_duration_minutes: 30,
    objectives: [''],
    chemicals: [''],
    equipment: [''],
    safety_notes: [''],
    steps: [{ step: 1, title: '', desc: '' }],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateField(field: string, value: unknown) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function updateArray(field: string, index: number, value: string) {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).map((item, i) => i === index ? value : item),
    }));
  }

  function addArrayItem(field: string) {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field as keyof typeof prev] as string[]), ''],
    }));
  }

  function removeArrayItem(field: string, index: number) {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index),
    }));
  }

  function updateStep(index: number, field: string, value: string) {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  }

  function addStep() {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { step: prev.steps.length + 1, title: '', desc: '' }],
    }));
  }

  function removeStep(index: number) {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) { setError('Title is required'); return; }
    if (!formData.description.trim()) { setError('Description is required'); return; }

    setLoading(true);
    setError('');

    const { error: err } = await supabase.from('experiments').insert({
      title: formData.title,
      description: formData.description,
      category: formData.category || 'General',
      difficulty: formData.difficulty,
      estimated_duration_minutes: formData.estimated_duration_minutes,
      objectives: formData.objectives.filter(o => o.trim()),
      chemicals: formData.chemicals.filter(c => c.trim()),
      equipment: formData.equipment.filter(e => e.trim()),
      safety_notes: formData.safety_notes.filter(s => s.trim()),
      steps: formData.steps.filter(st => st.title.trim() && st.desc.trim()),
      is_active: true,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            Create New Experiment
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
                placeholder="e.g., Acid-Base Titration"
                className="lab-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={e => updateField('category', e.target.value)}
                placeholder="e.g., Analytical Chemistry"
                className="lab-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description *</label>
            <textarea
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Detailed experiment description..."
              className="lab-input resize-none h-20"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Difficulty</label>
              <select value={formData.difficulty} onChange={e => updateField('difficulty', e.target.value)} className="lab-input">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Duration (min)</label>
              <input
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={e => updateField('estimated_duration_minutes', parseInt(e.target.value))}
                className="lab-input"
                min="5"
              />
            </div>
          </div>

          {/* Objectives */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Learning Objectives</label>
              <button type="button" onClick={() => addArrayItem('objectives')} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400">
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.objectives.map((obj, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={obj}
                    onChange={e => updateArray('objectives', i, e.target.value)}
                    placeholder="e.g., Understand titration principles"
                    className="lab-input text-sm flex-1"
                  />
                  {formData.objectives.length > 1 && (
                    <button type="button" onClick={() => removeArrayItem('objectives', i)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chemicals */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Chemicals Required</label>
              <button type="button" onClick={() => addArrayItem('chemicals')} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400">
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.chemicals.map((chem, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={chem}
                    onChange={e => updateArray('chemicals', i, e.target.value)}
                    placeholder="e.g., HCl (0.1M)"
                    className="lab-input text-sm flex-1"
                  />
                  {formData.chemicals.length > 1 && (
                    <button type="button" onClick={() => removeArrayItem('chemicals', i)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Equipment Needed</label>
              <button type="button" onClick={() => addArrayItem('equipment')} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400">
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.equipment.map((eq, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={eq}
                    onChange={e => updateArray('equipment', i, e.target.value)}
                    placeholder="e.g., Burette"
                    className="lab-input text-sm flex-1"
                  />
                  {formData.equipment.length > 1 && (
                    <button type="button" onClick={() => removeArrayItem('equipment', i)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Safety Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Safety Precautions</label>
              <button type="button" onClick={() => addArrayItem('safety_notes')} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400">
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.safety_notes.map((note, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={note}
                    onChange={e => updateArray('safety_notes', i, e.target.value)}
                    placeholder="e.g., Wear safety goggles"
                    className="lab-input text-sm flex-1"
                  />
                  {formData.safety_notes.length > 1 && (
                    <button type="button" onClick={() => removeArrayItem('safety_notes', i)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Experiment Steps</label>
              <button type="button" onClick={addStep} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400">
                Add Step
              </button>
            </div>
            <div className="space-y-3">
              {formData.steps.map((step, i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Step {step.step}</span>
                    {formData.steps.length > 1 && (
                      <button type="button" onClick={() => removeStep(i)} className="text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={step.title}
                    onChange={e => updateStep(i, 'title', e.target.value)}
                    placeholder="Step title"
                    className="lab-input text-sm"
                  />
                  <textarea
                    value={step.desc}
                    onChange={e => updateStep(i, 'desc', e.target.value)}
                    placeholder="Step description"
                    className="lab-input text-sm resize-none h-16"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-900 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Creating...' : 'Create Experiment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
