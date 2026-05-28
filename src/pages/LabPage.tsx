import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Bot, FlaskConical, CheckCircle,
  ChevronRight, FileDown, Thermometer, Droplets, Eye, Lightbulb
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, Experiment, ExperimentStep } from '../lib/supabase';
import ThreeLabCanvas from '../components/ThreeLabCanvas';

interface AiMessage {
  role: 'user' | 'ai';
  text: string;
  type?: 'hint' | 'correction' | 'info';
}

interface ReactionState {
  color: string;
  temperature: number;
  hasPrecipitate: boolean;
  gasProduced: boolean;
  colorName: string;
}

const AI_RESPONSES: Record<string, string[]> = {
  default: [
    "Great question! In chemistry, precision is key. Make sure you follow each step carefully.",
    "Remember to always observe the reaction carefully. Colors, temperature, and gas formation are all important indicators.",
    "Safety first! Always wear your protective equipment and handle chemicals with care.",
    "The reaction you're observing is driven by changes in electron arrangement. Keep watching!",
    "That's a good observation. Write it down in your notes so you can include it in your report.",
  ],
  titration: [
    "Watch the color change at the equivalence point — it should turn from colorless to pale pink with phenolphthalein.",
    "Add the NaOH drop by drop near the endpoint. Rapid addition can cause you to overshoot.",
    "The molarity formula is: M = moles of solute / liters of solution. Calculate carefully!",
    "Record your burette readings before and after — you'll need both for the volume calculation.",
  ],
  flame: [
    "Sodium produces a very bright yellow flame that can mask other colors — use cobalt blue glass to filter it.",
    "The colors come from excited electrons returning to ground state, releasing energy as visible light.",
    "Make sure your nichrome wire is thoroughly cleaned between tests to avoid contamination.",
    "Potassium produces a lilac/violet flame that's easier to see through cobalt blue glass.",
  ],
  electrolysis: [
    "Hydrogen forms at the cathode (negative electrode) and oxygen at the anode (positive electrode).",
    "The volume ratio of hydrogen to oxygen should be approximately 2:1 — this confirms the water formula H₂O.",
    "The glowing splint test confirms oxygen: it will relight when held near the oxygen-filled tube.",
    "Adding electrolyte (Na₂SO₄) improves conductivity without being consumed in the reaction.",
  ],
  precipitation: [
    "Precipitation occurs when the product of ion concentrations exceeds the Ksp (solubility product).",
    "AgCl is white, BaSO₄ is white, but PbI₂ is a distinctive bright yellow — a classic qualitative test.",
    "Net ionic equations only show the species actually participating in the reaction.",
    "The cloudiness you see is actually millions of tiny insoluble particles forming in solution.",
  ],
};

function getAIResponse(question: string, experiment: Experiment): string {
  const q = question.toLowerCase();
  let responses = AI_RESPONSES.default;

  if (experiment.title.toLowerCase().includes('titration')) responses = [...AI_RESPONSES.titration, ...AI_RESPONSES.default];
  else if (experiment.title.toLowerCase().includes('flame')) responses = [...AI_RESPONSES.flame, ...AI_RESPONSES.default];
  else if (experiment.title.toLowerCase().includes('electrolysis')) responses = [...AI_RESPONSES.electrolysis, ...AI_RESPONSES.default];
  else if (experiment.title.toLowerCase().includes('precipitation')) responses = [...AI_RESPONSES.precipitation, ...AI_RESPONSES.default];

  if (q.includes('help') || q.includes('what') || q.includes('how')) {
    return responses[Math.floor(Math.random() * responses.length)];
  }
  if (q.includes('safe') || q.includes('danger')) {
    return `For this experiment, key safety precautions include: ${experiment.safety_notes.join('; ')}.`;
  }
  if (q.includes('chemical') || q.includes('formula')) {
    return `This experiment uses: ${experiment.chemicals.join(', ')}. Each chemical plays a specific role in the reaction.`;
  }
  if (q.includes('step')) {
    return `You're currently working through a ${experiment.steps.length}-step experiment. Focus on careful observation at each step.`;
  }
  return responses[Math.floor(Math.random() * responses.length)];
}

function getReactionState(experimentTitle: string, step: number, totalSteps: number): ReactionState {
  const progress = step / totalSteps;
  if (experimentTitle.toLowerCase().includes('titration')) {
    return {
      color: progress >= 0.8 ? '#ff69b4' : '#e8f4f8',
      colorName: progress >= 0.8 ? 'Pink (endpoint reached)' : 'Colorless',
      temperature: 22 + progress * 2,
      hasPrecipitate: false,
      gasProduced: false,
    };
  } else if (experimentTitle.toLowerCase().includes('flame')) {
    const colors = ['#ff4500', '#ffdd00', '#ff6347', '#40e0d0', '#ff8c00'];
    const colorNames = ['Crimson (Li)', 'Yellow (Na)', 'Lilac (K)', 'Green-Blue (Cu)', 'Orange-Red (Ca)'];
    const idx = Math.min(Math.floor(progress * colors.length), colors.length - 1);
    return { color: colors[idx], colorName: colorNames[idx], temperature: 800 + step * 100, hasPrecipitate: false, gasProduced: false };
  } else if (experimentTitle.toLowerCase().includes('electrolysis')) {
    return {
      color: '#d0f0ff',
      colorName: 'Clear with bubbles',
      temperature: 20 + progress * 5,
      hasPrecipitate: false,
      gasProduced: progress > 0.3,
    };
  } else if (experimentTitle.toLowerCase().includes('precipitation')) {
    return {
      color: progress > 0.3 ? '#f5f5dc' : '#e8f4f8',
      colorName: step === 3 ? 'Yellow (PbI₂)' : step >= 1 ? 'White precipitate (AgCl/BaSO₄)' : 'Clear',
      temperature: 21,
      hasPrecipitate: progress > 0.25,
      gasProduced: false,
    };
  }
  return { color: '#e8f8e8', colorName: 'Clear', temperature: 22, hasPrecipitate: false, gasProduced: false };
}

function generatePDFContent(experiment: Experiment, results: {
  score: number; steps_completed: number; total_steps: number;
  observations: string; ai_hints_used: number; time_taken_minutes: number;
  aiMessages: AiMessage[]; studentName: string; studentId: string; className: string;
}) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = new Date().toLocaleTimeString();

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Lab Report — ${experiment.title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 0; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { background: linear-gradient(135deg, #0f172a, #1e3a5f); color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { margin: 0 0 4px; font-size: 24px; }
  .header .sub { opacity: 0.7; font-size: 13px; margin-top: 6px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; }
  .meta-item { background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 6px; font-size: 12px; }
  .meta-item strong { display: block; opacity: 0.7; font-size: 11px; margin-bottom: 2px; }
  .score-banner { display: flex; align-items: center; justify-content: center; gap: 20px; background: ${results.score >= 80 ? '#f0fdf4' : results.score >= 60 ? '#fffbeb' : '#fef2f2'}; border: 2px solid ${results.score >= 80 ? '#86efac' : results.score >= 60 ? '#fde68a' : '#fca5a5'}; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center; }
  .score-num { font-size: 56px; font-weight: bold; color: ${results.score >= 80 ? '#16a34a' : results.score >= 60 ? '#d97706' : '#dc2626'}; line-height: 1; }
  .score-label { font-size: 13px; color: #64748b; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 16px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .info-box strong { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .info-box span { font-size: 20px; font-weight: bold; color: #0f172a; }
  .step { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .step-num { width: 28px; height: 28px; background: #0f172a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; margin-top: 2px; }
  .step-content strong { font-size: 14px; display: block; margin-bottom: 2px; }
  .step-content span { font-size: 13px; color: #64748b; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; margin: 2px; }
  .pill-blue { background: #dbeafe; color: #1e40af; }
  .pill-red { background: #fee2e2; color: #dc2626; }
  .pill-green { background: #dcfce7; color: #16a34a; }
  .obs { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 12px; border-radius: 0 8px 8px 0; font-size: 13px; font-style: italic; }
  .ai-msg { padding: 8px 12px; margin-bottom: 6px; border-radius: 8px; font-size: 12px; }
  .ai-msg.user { background: #eff6ff; border-left: 3px solid #3b82f6; }
  .ai-msg.ai { background: #f0fdf4; border-left: 3px solid #22c55e; }
  .ai-msg strong { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 3px; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>VR ChemLab — Laboratory Report</h1>
    <div class="sub">${experiment.title} · ${experiment.category}</div>
    <div class="meta-grid">
      <div class="meta-item"><strong>Student Name</strong>${results.studentName}</div>
      <div class="meta-item"><strong>Student ID</strong>${results.studentId}</div>
      <div class="meta-item"><strong>Class</strong>${results.className || 'N/A'}</div>
      <div class="meta-item"><strong>Date</strong>${date} at ${time}</div>
    </div>
  </div>

  <div class="score-banner">
    <div>
      <div class="score-num">${results.score}%</div>
      <div class="score-label">Final Score</div>
    </div>
    <div style="text-align:left">
      <div style="font-size:14px; font-weight:bold; color:#0f172a; margin-bottom:4px">
        ${results.score >= 90 ? 'Outstanding Performance' : results.score >= 80 ? 'Excellent Work' : results.score >= 60 ? 'Good Effort' : 'Needs Improvement'}
      </div>
      <div style="font-size:13px; color:#64748b">${results.steps_completed}/${results.total_steps} steps completed</div>
      <div style="font-size:13px; color:#64748b">${results.time_taken_minutes} minutes · ${results.ai_hints_used} AI hints used</div>
    </div>
  </div>

  <div class="section">
    <h2>Experiment Overview</h2>
    <p style="font-size:13px;color:#475569;margin-bottom:12px">${experiment.description}</p>
    <div class="info-grid">
      <div class="info-box"><strong>Difficulty</strong><span style="font-size:14px;text-transform:capitalize">${experiment.difficulty}</span></div>
      <div class="info-box"><strong>Duration</strong><span style="font-size:14px">${experiment.estimated_duration_minutes} minutes</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Learning Objectives</h2>
    ${experiment.objectives.map(o => `<div style="padding:4px 0;font-size:13px;color:#475569">&#x2713; ${o}</div>`).join('')}
  </div>

  <div class="section">
    <h2>Materials Used</h2>
    <div style="margin-bottom:8px"><strong style="font-size:12px;color:#64748b">CHEMICALS</strong><br>${experiment.chemicals.map(c => `<span class="pill pill-blue">${c}</span>`).join('')}</div>
    <div><strong style="font-size:12px;color:#64748b">EQUIPMENT</strong><br>${experiment.equipment.map(e => `<span class="pill pill-green">${e}</span>`).join('')}</div>
  </div>

  <div class="section">
    <h2>Safety Precautions</h2>
    ${experiment.safety_notes.map(s => `<div style="padding:3px 0;font-size:13px;color:#dc2626">&#x26A0; ${s}</div>`).join('')}
  </div>

  <div class="section">
    <h2>Procedure — Step by Step</h2>
    ${(experiment.steps as ExperimentStep[]).map((s, i) => `
      <div class="step">
        <div class="step-num">${s.step || i + 1}</div>
        <div class="step-content">
          <strong>${s.title}</strong>
          <span>${s.desc}</span>
        </div>
      </div>
    `).join('')}
  </div>

  ${results.observations ? `
  <div class="section">
    <h2>Student Observations</h2>
    <div class="obs">${results.observations}</div>
  </div>` : ''}

  ${results.aiMessages.length > 0 ? `
  <div class="section">
    <h2>AI Tutor Interaction Log</h2>
    ${results.aiMessages.slice(0, 10).map(m => `
      <div class="ai-msg ${m.role}">
        <strong>${m.role === 'user' ? 'Student' : 'AI Tutor'}</strong>
        ${m.text}
      </div>
    `).join('')}
    ${results.aiMessages.length > 10 ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px">${results.aiMessages.length - 10} more interactions not shown...</div>` : ''}
  </div>` : ''}

  <div class="section">
    <h2>Performance Summary</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="background:#f8fafc"><th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0">Metric</th><th style="text-align:right;padding:8px;border-bottom:1px solid #e2e8f0">Value</th></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #f1f5f9">Final Score</td><td style="text-align:right;padding:8px;border-bottom:1px solid #f1f5f9;font-weight:bold">${results.score}%</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #f1f5f9">Steps Completed</td><td style="text-align:right;padding:8px;border-bottom:1px solid #f1f5f9">${results.steps_completed} / ${results.total_steps}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #f1f5f9">Time Taken</td><td style="text-align:right;padding:8px;border-bottom:1px solid #f1f5f9">${results.time_taken_minutes} minutes</td></tr>
      <tr><td style="padding:8px">AI Hints Used</td><td style="text-align:right;padding:8px">${results.ai_hints_used}</td></tr>
    </table>
  </div>

  <div class="footer">
    <p>VR ChemLab — AI-Powered Virtual Chemistry Laboratory</p>
    <p>Final Year Project &amp; Ed-Tech Research Prototype</p>
    <p>Report generated: ${date} at ${time}</p>
  </div>
</div>
</body>
</html>`;

  return html;
}

export default function LabPage() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [observations, setObservations] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startTime] = useState(Date.now());
  const [showNotes, setShowNotes] = useState(false);
  const [reactionState, setReactionState] = useState<ReactionState>({ color: '#e8f4f8', temperature: 22, hasPrecipitate: false, gasProduced: false, colorName: 'Clear' });
  const aiEndRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (experimentId && profile) {
      loadExperiment();
    }
  }, [experimentId, profile]);

  useEffect(() => {
    if (experiment) {
      const state = getReactionState(experiment.title, currentStep, experiment.steps.length);
      setReactionState(state);
    }
  }, [currentStep, experiment]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  async function loadExperiment() {
    const { data } = await supabase.from('experiments').select('*').eq('id', experimentId).maybeSingle();
    if (!data) { navigate('/dashboard'); return; }
    setExperiment(data as Experiment);

    // Auto-create attendance session
    const { data: session } = await supabase.from('attendance_sessions').insert({
      student_id: profile!.id,
      experiment_id: experimentId,
      session_date: new Date().toISOString().split('T')[0],
      entry_time: new Date().toISOString(),
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      status: 'active',
    }).select().maybeSingle();

    if (session) setSessionId(session.id);

    // Welcome message
    setAiMessages([{
      role: 'ai',
      text: `Welcome to "${data.title}"! I'm your AI tutor for this session. This is a ${data.difficulty} level experiment that takes about ${data.estimated_duration_minutes} minutes. ${data.objectives[0] ? `Today you'll learn: ${data.objectives[0]}.` : ''} Ready to begin? Click "Next Step" to start!`,
      type: 'info',
    }]);

    setLoading(false);
  }

  async function handleNextStep() {
    if (!experiment) return;
    const steps = experiment.steps as ExperimentStep[];
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await completeExperiment();
    }
  }

  async function completeExperiment() {
    if (!experiment || !sessionId || !profile) return;

    const timeTaken = Math.round((Date.now() - startTime) / 60000);
    const steps = experiment.steps as ExperimentStep[];
    const calcScore = Math.max(60, 100 - hintsUsed * 5 - (steps.length - currentStep - 1) * 10);
    setScore(calcScore);
    setCompleted(true);

    // Save result
    await supabase.from('experiment_results').insert({
      session_id: sessionId,
      student_id: profile.id,
      experiment_id: experiment.id,
      score: calcScore,
      steps_completed: currentStep + 1,
      total_steps: steps.length,
      observations,
      ai_hints_used: hintsUsed,
      time_taken_minutes: timeTaken,
      mistakes_made: [],
      reaction_outcomes: { finalColor: reactionState.color, temperature: reactionState.temperature },
    });

    // Update session
    await supabase.from('attendance_sessions').update({
      exit_time: new Date().toISOString(),
      status: 'completed',
    }).eq('id', sessionId);

    setAiMessages(prev => [...prev, {
      role: 'ai',
      text: `Excellent work! You've completed the "${experiment.title}" experiment with a score of ${calcScore}%. ${calcScore >= 80 ? 'Outstanding performance!' : calcScore >= 60 ? 'Good effort!' : 'Keep practicing to improve your score.'} You can now download your lab report as a PDF.`,
      type: 'info',
    }]);
  }

  async function handleAiSend() {
    if (!aiInput.trim() || !experiment) return;
    const q = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', text: q }]);
    setAiTyping(true);
    setHintsUsed(h => h + 1);

    // Save interaction
    if (sessionId && profile) {
      await supabase.from('ai_interactions').insert({
        session_id: sessionId,
        student_id: profile.id,
        question: q,
        answer: '',
        interaction_type: 'text',
        step_context: `Step ${currentStep + 1}`,
      });
    }

    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
    const answer = getAIResponse(q, experiment);
    setAiMessages(prev => [...prev, { role: 'ai', text: answer }]);
    setAiTyping(false);
  }

  function handleHint() {
    if (!experiment) return;
    const steps = experiment.steps as ExperimentStep[];
    const step = steps[currentStep];
    setHintsUsed(h => h + 1);
    setAiMessages(prev => [...prev, {
      role: 'ai',
      text: `Hint for Step ${currentStep + 1} — "${step.title}": ${step.desc} Take your time and observe carefully.`,
      type: 'hint',
    }]);
  }

  function handleExportPDF() {
    if (!experiment || !profile) return;
    setExporting(true);

    const steps = experiment.steps as ExperimentStep[];
    const html = generatePDFContent(experiment, {
      score,
      steps_completed: currentStep + 1,
      total_steps: steps.length,
      observations,
      ai_hints_used: hintsUsed,
      time_taken_minutes: Math.round((Date.now() - startTime) / 60000),
      aiMessages,
      studentName: profile.full_name,
      studentId: profile.student_id ?? '',
      className: profile.class_name,
    });

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        win.print();
      };
    }
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 2000);
  }

  async function handleLeave() {
    if (sessionId && !completed) {
      await supabase.from('attendance_sessions').update({
        exit_time: new Date().toISOString(),
        status: 'abandoned',
      }).eq('id', sessionId);
    }
    navigate('/dashboard');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading experiment...</p>
        </div>
      </div>
    );
  }

  if (!experiment) return null;

  const steps = experiment.steps as ExperimentStep[];
  const currentStepData = steps[currentStep];

  return (
    <div className="flex flex-col w-full h-full bg-gray-950 overflow-hidden">
      {/* Lab header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleLeave} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm truncate">{experiment.title}</h1>
            <p className="text-slate-500 text-xs">{experiment.category} · {experiment.difficulty}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Progress */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${((currentStep + (completed ? 1 : 0)) / steps.length) * 100}%` }} />
            </div>
            <span className="text-slate-400 text-xs">{completed ? steps.length : currentStep}/{steps.length}</span>
          </div>
          {completed && (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-gray-900 border border-cyan-500/40 hover:border-cyan-500 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              {exporting ? 'Opening...' : 'Export PDF'}
            </button>
          )}
        </div>
      </header>

      {/* Main lab layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: 3D Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <ThreeLabCanvas
              reactionColor={reactionState.color}
              hasGas={reactionState.gasProduced}
              hasPrecipitate={reactionState.hasPrecipitate}
            />

            {/* Reaction readouts */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <div className="glass rounded-lg px-3 py-2 flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-red-400" />
                <span className="text-white text-xs font-medium">{reactionState.temperature.toFixed(1)}°C</span>
              </div>
              <div className="glass rounded-lg px-3 py-2 flex items-center gap-2">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-white text-xs font-medium">{reactionState.colorName}</span>
              </div>
              {reactionState.gasProduced && (
                <div className="glass rounded-lg px-3 py-2 flex items-center gap-2 animate-pulse-glow">
                  <Eye className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-yellow-400 text-xs font-medium">Gas detected!</span>
                </div>
              )}
              {reactionState.hasPrecipitate && (
                <div className="glass rounded-lg px-3 py-2 flex items-center gap-2 animate-pulse-glow">
                  <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-400 text-xs font-medium">Precipitate forming</span>
                </div>
              )}
            </div>
          </div>

          {/* Step control */}
          <div className="border-t border-slate-800 bg-slate-900/80 p-4 space-y-3 shrink-0">
            {completed ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Experiment Complete!</p>
                    <p className="text-slate-400 text-sm">Score: <span className={`font-bold ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</span></p>
                  </div>
                </div>
                <button onClick={handleExportPDF} disabled={exporting} className="lab-btn-primary flex items-center gap-2">
                  <FileDown className="w-4 h-4" />
                  Download PDF Report
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0 mt-0.5">
                    {currentStep + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-100 font-semibold text-sm">{currentStepData?.title}</p>
                    <p className="text-slate-400 text-sm mt-0.5">{currentStepData?.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleHint} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-medium transition-colors">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Hint
                  </button>
                  <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg text-xs font-medium transition-colors">
                    Notes
                  </button>
                  <button onClick={handleNextStep} className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-900 rounded-lg text-sm font-semibold transition-colors">
                    {currentStep < steps.length - 1 ? (
                      <><ChevronRight className="w-4 h-4" />Next Step</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" />Complete</>
                    )}
                  </button>
                </div>
                {showNotes && (
                  <textarea
                    value={observations}
                    onChange={e => setObservations(e.target.value)}
                    placeholder="Record your observations here..."
                    className="lab-input text-sm h-20 resize-none"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: AI Panel */}
        <div className="w-72 xl:w-80 flex flex-col border-l border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-200 text-sm font-medium">AI Tutor</p>
              <p className="text-slate-500 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                Online · {hintsUsed} hints used
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                )}
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-500/20 text-cyan-100 rounded-br-sm'
                    : msg.type === 'hint'
                    ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-100 rounded-bl-sm'
                    : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                }`}>
                  {msg.type === 'hint' && <p className="text-yellow-500 text-xs font-medium mb-1">AI Hint</p>}
                  {msg.text}
                </div>
              </div>
            ))}
            {aiTyping && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="bg-slate-800 px-4 py-3 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend(); }}}
                placeholder="Ask a question..."
                className="lab-input text-sm flex-1"
                disabled={aiTyping}
              />
              <button
                onClick={handleAiSend}
                disabled={!aiInput.trim() || aiTyping}
                className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
