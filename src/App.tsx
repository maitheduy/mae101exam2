/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import {
  Calculator,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Download,
  Moon,
  Sun,
  BookOpen,
  Award,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  Edit3,
  BarChart2,
  FileText,
  AlertTriangle,
  Check,
  Zap,
  Save,
  Trash2,
  Settings,
  PlusCircle,
  FolderPlus
} from 'lucide-react';

// KaTeX Render Helper
function MathRenderer({ math, display = false }: { math: string; display?: boolean }) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        let clean = math.trim();
        if (clean.startsWith('$$') && clean.endsWith('$$')) {
          clean = clean.slice(2, -2);
        } else if (clean.startsWith('$') && clean.endsWith('$')) {
          clean = clean.slice(1, -1);
        }
        katex.render(clean, containerRef.current, {
          displayMode: display,
          throwOnError: false,
        });
      } catch (e) {
        if (containerRef.current) {
          containerRef.current.innerText = math;
        }
      }
    }
  }, [math, display]);

  return <span ref={containerRef} className={display ? "block my-2 overflow-x-auto text-center" : "inline-block"} />;
}

// Rich Text Parser for LaTeX $...$ and $$...$$
function RichMathText({ text }: { text: string }) {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const matchedStr = match[0];
    const isDisplay = matchedStr.startsWith('$$');
    const inner = isDisplay ? matchedStr.slice(2, -2) : matchedStr.slice(1, -1);
    parts.push(<MathRenderer key={match.index} math={inner} display={isDisplay} />);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className="whitespace-pre-wrap">{parts}</span>;
}

interface Question {
  id: number;
  title: string;
  topic: string;
  part: string;
  statement: string;
  solution: string;
  answerKey: string;
  hints: string[];
  detailedHint?: string;
}

interface CustomExam {
  examId: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
}

interface GradeResult {
  score: number;
  isCorrect: boolean;
  aiFeedback: string;
  skillsIdentified: string[];
  gradedAt?: string;
}

interface ExamSession {
  sessionId: string;
  mode: 'exam' | 'fix_errors';
  startedAt: string;
  completedAt?: string;
  totalQuestions: number;
  score: number;
  answers: Record<number, string>;
  results: Record<number, GradeResult>;
  status: 'in_progress' | 'completed';
  activeExamTitle?: string;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [defaultQuestions, setDefaultQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom exams state
  const [customExams, setCustomExams] = useState<CustomExam[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [activeExamTitle, setActiveExamTitle] = useState<string>("Đề Mẫu MAE101 Kiểm tra Lần 2 (S.S. DuyMT)");
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [newExamTitle, setNewExamTitle] = useState<string>("");
  const [newExamDesc, setNewExamDesc] = useState<string>("");
  const [newExamJson, setNewExamJson] = useState<string>(
    JSON.stringify([
      {
        id: 1,
        title: "Câu 1 — Đạo hàm cơ bản",
        topic: "Calculus",
        part: "Phần I",
        statement: "Cho hàm số $f(x) = x^3 - 3x + 2$. Tính $f'(x)$ và tìm điểm cực trị.",
        solution: "Đạo hàm $f'(x) = 3x^2 - 3$. Cho $f'(x) = 0 \\implies x = \\pm 1$.",
        answerKey: "3x^2 - 3",
        hints: ["Power rule", "Derivative equal to zero"],
        detailedHint: "1. Tính đạo hàm từng số hạng.\n2. Giải phương trình f'(x) = 0 để tìm điểm tới hạn."
      }
    ], null, 2)
  );

  // App mode
  const [mode, setMode] = useState<'dashboard' | 'exam' | 'fix_errors' | 'history'>('dashboard');

  // Active session
  const [activeSession, setActiveSession] = useState<ExamSession | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [previewMode, setPreviewMode] = useState<Record<number, boolean>>({});
  const [gradingQuestionId, setGradingQuestionId] = useState<number | null>(null);
  const [isBatchGrading, setIsBatchGrading] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Đã lưu tự động');
  const [showHint, setShowHint] = useState<boolean>(false);

  // AI Settings State
  const [aiSettings, setAiSettings] = useState<{ provider: 'offline' | 'gemini' | 'openai'; apiKey: string }>({
    provider: 'gemini',
    apiKey: ''
  });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // History sessions
  const [historySessions, setHistorySessions] = useState<ExamSession[]>([]);

  // Filter in exam
  const [filterPart, setFilterPart] = useState<string>('all');

  useEffect(() => {
    setShowHint(false);
  }, [currentQIndex]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('mae101_history');
    if (savedHistory) {
      try {
        setHistorySessions(JSON.parse(savedHistory));
      } catch (e) {
        console.error(e);
      }
    }

    const savedCurrent = localStorage.getItem('mae101_current_session');
    if (savedCurrent) {
      try {
        const parsed = JSON.parse(savedCurrent);
        if (parsed && parsed.status === 'in_progress') {
          setActiveSession(parsed);
          setMode(parsed.mode);
          if (parsed.activeExamTitle) setActiveExamTitle(parsed.activeExamTitle);
        }
      } catch (e) {
        console.error(e);
      }
    }

    const savedAiSettings = localStorage.getItem('mae101_ai_settings');
    if (savedAiSettings) {
      try {
        setAiSettings(JSON.parse(savedAiSettings));
      } catch (e) {
        console.error(e);
      }
    }

    const savedCustomExams = localStorage.getItem('mae101_custom_exams');
    if (savedCustomExams) {
      try {
        setCustomExams(JSON.parse(savedCustomExams));
      } catch (e) {
        console.error(e);
      }
    }

    fetch('/api/questions')
      .then(res => res.json())
      .then(data => {
        setDefaultQuestions(data);
        if (activeQuestions.length === 0) {
          setActiveQuestions(data);
        }
        setLoadingQuestions(false);
      })
      .catch(err => {
        console.error("Failed to fetch questions:", err);
        setErrorMsg("Không thể tải danh sách câu hỏi từ server. Vui lòng kiểm tra lại kết nối.");
        setLoadingQuestions(false);
      });
  }, []);

  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('mae101_current_session', JSON.stringify(activeSession));
      setAutoSaveStatus('Đã lưu tự động');
      const timer = setTimeout(() => setAutoSaveStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeSession?.answers]);

  const saveHistoryToStorage = (updatedHistory: ExamSession[]) => {
    setHistorySessions(updatedHistory);
    localStorage.setItem('mae101_history', JSON.stringify(updatedHistory));
  };

  const saveAiSettings = (newSettings: { provider: 'offline' | 'gemini' | 'openai'; apiKey: string }) => {
    setAiSettings(newSettings);
    localStorage.setItem('mae101_ai_settings', JSON.stringify(newSettings));
    setShowSettingsModal(false);
    alert("Đã lưu cấu hình chế độ AI thành công!");
  };

  const handleSaveCustomExam = () => {
    if (!newExamTitle.trim()) {
      alert("Vui lòng nhập tên đề thi.");
      return;
    }
    try {
      const parsedQuestions = JSON.parse(newExamJson);
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        alert("JSON đề thi phải là một mảng câu hỏi hợp lệ (Array).");
        return;
      }
      const newExam: CustomExam = {
        examId: 'exam_' + Date.now(),
        title: newExamTitle.trim(),
        description: newExamDesc.trim() || 'Đề thi tự nhập',
        questions: parsedQuestions,
        createdAt: new Date().toISOString()
      };
      const updatedExams = [...customExams, newExam];
      setCustomExams(updatedExams);
      localStorage.setItem('mae101_custom_exams', JSON.stringify(updatedExams));
      setShowCustomModal(false);
      setNewExamTitle("");
      setNewExamDesc("");
      alert(`Tạo đề thi "${newExam.title}" thành công với ${parsedQuestions.length} câu hỏi!`);
    } catch (e: any) {
      alert("Lỗi phân tích JSON câu hỏi: " + e.message);
    }
  };

  const startExamWithQuestions = (questionsToUse: Question[], examTitle: string) => {
    setActiveQuestions(questionsToUse);
    setActiveExamTitle(examTitle);
    const newSession: ExamSession = {
      sessionId: 'sess_' + Date.now(),
      mode: 'exam',
      startedAt: new Date().toISOString(),
      totalQuestions: questionsToUse.length,
      score: 0,
      answers: {},
      results: {},
      status: 'in_progress',
      activeExamTitle: examTitle
    };
    setActiveSession(newSession);
    setCurrentQIndex(0);
    setMode('exam');
  };

  const startFullExam = () => {
    startExamWithQuestions(defaultQuestions, "Đề Mẫu MAE101 Kiểm tra Lần 2 (S.S. DuyMT)");
  };

  const startFixErrorsExam = () => {
    if (!activeSession) return;
    const incorrectQIds = activeQuestions
      .filter(q => {
        const res = activeSession.results[q.id];
        return !res || res.score < 1;
      })
      .map(q => q.id);

    if (incorrectQIds.length === 0) {
      alert("Chúc mừng! Bạn đã làm đúng tất cả các câu hỏi trong đề này, không còn lỗi nào cần sửa!");
      return;
    }

    const fixList = activeQuestions.filter(q => incorrectQIds.includes(q.id));
    const fixSession: ExamSession = {
      sessionId: 'fix_' + Date.now(),
      mode: 'fix_errors',
      startedAt: new Date().toISOString(),
      totalQuestions: fixList.length,
      score: 0,
      answers: {},
      results: {},
      status: 'in_progress',
      activeExamTitle: activeExamTitle + " (Sửa lỗi)"
    };
    setActiveSession(fixSession);
    setCurrentQIndex(0);
    setMode('fix_errors');
  };

  const getFilteredQuestions = (): Question[] => {
    if (!activeSession) return activeQuestions;
    if (activeSession.mode === 'fix_errors') {
      const lastSession = historySessions[historySessions.length - 1] || activeSession;
      const incorrectIds = activeQuestions.filter(q => {
        const r = lastSession.results[q.id];
        return !r || r.score < 1;
      }).map(q => q.id);
      return activeQuestions.filter(q => incorrectIds.includes(q.id));
    }
    if (filterPart === 'part1') return activeQuestions.filter(q => q.part?.toLowerCase().includes('phần i') || (q.id >= 1 && q.id <= 10));
    if (filterPart === 'part2') return activeQuestions.filter(q => q.part?.toLowerCase().includes('phần ii') || q.id > 10);
    return activeQuestions;
  };

  const currentList = getFilteredQuestions();
  const currentQuestion = currentList[currentQIndex] || activeQuestions[0];

  const handleAnswerChange = (qId: number, val: string) => {
    if (!activeSession) return;
    setAutoSaveStatus('Đang lưu...');
    setActiveSession({
      ...activeSession,
      answers: {
        ...activeSession.answers,
        [qId]: val
      }
    });
  };

  const submitSingleQuestion = async (qId: number) => {
    if (!activeSession) return;
    const userAnswer = activeSession.answers[qId] || "";
    const qData = activeQuestions.find(q => q.id === qId);
    if (!qData) return;

    setGradingQuestionId(qId);
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: qId,
          userAnswer,
          questionData: qData,
          aiSettings
        })
      });
      const data: GradeResult = await res.json();
      
      const updatedResults = {
        ...activeSession.results,
        [qId]: { ...data, gradedAt: new Date().toISOString() }
      };

      let totalScore = 0;
      Object.values(updatedResults).forEach((r: any) => {
        if (r.score) totalScore += r.score;
      });

      setActiveSession({
        ...activeSession,
        results: updatedResults,
        score: totalScore
      });
    } catch (err) {
      console.error("Grading failed:", err);
      alert("Lỗi chấm điểm AI. Vui lòng thử lại.");
    } finally {
      setGradingQuestionId(null);
    }
  };

  const submitAllAnswers = async () => {
    if (!activeSession) return;
    const answeredCount = Object.keys(activeSession.answers).filter(k => activeSession.answers[Number(k)]?.trim()).length;
    if (!window.confirm(`Bạn muốn nộp bài ngay lúc này? (${answeredCount}/${currentList.length} câu đã làm. Các câu chưa làm sẽ được tính 0 điểm).`)) return;

    setIsBatchGrading(true);
    try {
      let updatedResults = { ...activeSession.results };
      let totalScore = 0;

      for (const q of currentList) {
        const userAnswer = activeSession.answers[q.id] || "";
        try {
          const res = await fetch('/api/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: q.id,
              userAnswer,
              questionData: q,
              aiSettings
            })
          });
          const data: GradeResult = await res.json();
          updatedResults[q.id] = { ...data, gradedAt: new Date().toISOString() };
          if (data.score) totalScore += data.score;
        } catch (e) {
          console.error(`Failed to grade question ${q.id}`, e);
        }
      }

      const completedSession: ExamSession = {
        ...activeSession,
        results: updatedResults,
        score: totalScore,
        completedAt: new Date().toISOString(),
        status: 'completed'
      };

      setActiveSession(completedSession);
      localStorage.removeItem('mae101_current_session');
      const newHistory = [...historySessions.filter(s => s.sessionId !== completedSession.sessionId), completedSession];
      saveHistoryToStorage(newHistory);
      alert(`Nộp bài thành công! Tổng điểm của bạn: ${totalScore} / ${currentList.length}`);
    } catch (e) {
      console.error(e);
      alert("Lỗi nộp bài.");
    } finally {
      setIsBatchGrading(false);
    }
  };

  const insertLatexSymbol = (snippet: string) => {
    if (!currentQuestion || !activeSession) return;
    const qId = currentQuestion.id;
    const currentAns = activeSession.answers[qId] || "";
    handleAnswerChange(qId, currentAns + snippet);
  };

  const exportJsonReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historySessions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `MAE101_Test2_History_Report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loadingQuestions) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Đang tải bộ câu hỏi kiểm tra...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="max-w-md p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Lỗi khởi động</h2>
          <p>{errorMsg}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setMode('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                MAE101 Exam 2 Suite
              </h1>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>S.S. DuyMT — Custom Exam Importer & AI Grader</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {autoSaveStatus && (
              <span className="text-xs text-emerald-400 hidden sm:flex items-center space-x-1 animate-pulse font-medium">
                <Save className="w-3.5 h-3.5" />
                <span>{autoSaveStatus}</span>
              </span>
            )}

            <button
              onClick={() => setShowCustomModal(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
                darkMode ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border border-emerald-500/30' : 'bg-slate-100 text-emerald-600 hover:bg-slate-200 border border-emerald-200'
              }`}
              title="Tạo hoặc Nhập đề thi mới"
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nhập đề mới</span>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
                darkMode ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border border-blue-500/30' : 'bg-slate-100 text-blue-600 hover:bg-slate-200 border border-blue-200'
              }`}
              title="Cài đặt Chế độ AI & API Key"
            >
              <Settings className="w-4 h-4" />
              <span>Cài đặt AI</span>
            </button>

            <button
              onClick={() => setMode('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
                mode === 'history'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Lịch sử</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử bài làm và phân tích không?")) {
                  localStorage.removeItem('mae101_history');
                  localStorage.removeItem('mae101_current_session');
                  setHistorySessions([]);
                  setActiveSession(null);
                  setMode('dashboard');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition text-red-400 hover:bg-red-500/15 border border-red-500/30`}
              title="Xóa lịch sử & phân tích"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Xóa lịch sử</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl transition ${darkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              title="Đổi giao diện Sáng / Tối"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Custom Exam Creator Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border shadow-2xl space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-emerald-400" />
                <span>Tạo & Nhập Đề Thi Mới</span>
              </h3>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Tên đề thi:</label>
                <input
                  type="text"
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  placeholder="Ví dụ: Đề Kiểm Tra Giữa Kỳ Toán Cao Cấp"
                  className={`w-full p-3 rounded-xl text-sm border ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Mô tả / Ghi chú:</label>
                <input
                  type="text"
                  value={newExamDesc}
                  onChange={(e) => setNewExamDesc(e.target.value)}
                  placeholder="Ví dụ: 10 câu tự luận ôn tập chương đạo hàm"
                  className={`w-full p-3 rounded-xl text-sm border ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Nhập danh sách câu hỏi định dạng JSON (Array):</label>
                <textarea
                  value={newExamJson}
                  onChange={(e) => setNewExamJson(e.target.value)}
                  rows={10}
                  className={`w-full p-3 rounded-xl font-mono text-xs border ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Cấu trúc JSON gồm mảng các object có các trường: <code>id, title, topic, part, statement, solution, answerKey, hints, detailedHint</code>.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-sm font-medium hover:bg-slate-800 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveCustomExam}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm shadow transition"
              >
                Lưu & Tạo Đề Thi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <span>Cấu hình Chế độ AI & API Key</span>
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Chọn chế độ hoạt động:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'offline', label: '🔌 Không dùng AI (Offline)' },
                    { id: 'gemini', label: '✨ Google Gemini' },
                    { id: 'openai', label: '🤖 OpenAI GPT' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAiSettings({ ...aiSettings, provider: p.id as any })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                        aiSettings.provider === p.id
                          ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-400'
                          : darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {aiSettings.provider !== 'offline' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">
                    Nhập {aiSettings.provider === 'gemini' ? 'GEMINI_API_KEY' : 'OpenAI_API_Key'}:
                  </label>
                  <input
                    type="password"
                    value={aiSettings.apiKey}
                    onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
                    placeholder={aiSettings.provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                    className={`w-full p-3 rounded-xl font-mono text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-sm font-medium hover:bg-slate-800 transition"
              >
                Hủy
              </button>
              <button
                onClick={() => saveAiSettings(aiSettings)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm shadow transition"
              >
                Lưu Cấu Hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mode === 'dashboard' && (
          <div className="space-y-8">
            {/* Hero Card */}
            <div className={`relative overflow-hidden rounded-3xl p-8 sm:p-12 border shadow-xl ${
              darkMode ? 'bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800' : 'bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white border-blue-100'
            }`}>
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Hỗ trợ Nhập Đề Thi Mới & Đa Bộ Đề</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {activeExamTitle}
                </h2>
                <p className={`text-base sm:text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Luyện tập bộ 20 câu mẫu S.S. DuyMT hoặc nhập thêm các đề thi tùy chỉnh mới của riêng bạn để luyện tập trên cùng framework này.
                </p>
                <div className="pt-4 flex flex-wrap gap-4">
                  <button
                    onClick={startFullExam}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 flex items-center space-x-2 transition transform hover:-translate-y-0.5"
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Làm Đề Chuẩn (20 Câu)</span>
                  </button>
                  <button
                    onClick={() => setShowCustomModal(true)}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition transform hover:-translate-y-0.5"
                  >
                    <FolderPlus className="w-5 h-5" />
                    <span>Tạo Đề Thi Mới</span>
                  </button>
                </div>
              </div>

              {/* Decorative background element */}
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
                <Calculator className="w-96 h-96" />
              </div>
            </div>

            {/* Custom Exams List Section */}
            {customExams.length > 0 && (
              <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
                <h3 className="text-lg font-bold flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span>Danh Sách Đề Thi Tự Nhập Của Bạn</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customExams.map((ex) => (
                    <div key={ex.examId} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                      <div>
                        <h4 className="font-bold text-base">{ex.title}</h4>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{ex.description} • {ex.questions.length} câu hỏi</p>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => startExamWithQuestions(ex.questions, ex.title)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition"
                        >
                          Làm Đề Này
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Xóa đề thi "${ex.title}"?`)) {
                              const filtered = customExams.filter(e => e.examId !== ex.examId);
                              setCustomExams(filtered);
                              localStorage.setItem('mae101_custom_exams', JSON.stringify(filtered));
                            }
                          }}
                          className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-xs font-semibold transition"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent History Preview */}
            {historySessions.length > 0 && (
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center space-x-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span>Lần Làm Bài Gần Nhất</span>
                  </h3>
                  <button onClick={() => setMode('history')} className="text-sm text-blue-400 hover:underline">
                    Xem tất cả lịch sử →
                  </button>
                </div>
                {(() => {
                  const last = historySessions[historySessions.length - 1];
                  return (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                      <div>
                        <p className="text-sm font-semibold">Mã phiên: {last.sessionId}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Thời gian: {new Date(last.startedAt).toLocaleString('vi-VN')} ({last.activeExamTitle || 'Bài thi'})
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="text-2xl font-extrabold text-blue-400">{last.score}</span>
                          <span className="text-slate-400 text-sm"> / {last.totalQuestions} điểm</span>
                        </div>
                        <button
                          onClick={() => {
                            setActiveSession(last);
                            setMode(last.mode);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition"
                        >
                          Xem lại bài
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {(mode === 'exam' || mode === 'fix_errors') && activeSession && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Question Navigator */}
            <div className={`lg:col-span-1 p-5 rounded-2xl border h-fit sticky top-20 space-y-4 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                <div>
                  <h3 className="font-bold text-base truncate max-w-[200px]" title={activeExamTitle}>
                    {activeExamTitle}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Đã làm: <strong className="text-blue-400">{Object.keys(activeSession.answers).filter(k => activeSession.answers[Number(k)]?.trim()).length}</strong> / {currentList.length} câu
                  </p>
                </div>
              </div>

              {activeSession.status === 'in_progress' && (
                <div className="space-y-2">
                  <button
                    onClick={submitAllAnswers}
                    disabled={isBatchGrading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition"
                  >
                    {isBatchGrading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang chấm bài...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Nộp Bài (Chấm các câu đã làm)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-5 gap-2 max-h-[350px] overflow-y-auto p-1">
                {currentList.map((q, idx) => {
                  const res = activeSession.results[q.id];
                  const hasAns = Boolean(activeSession.answers[q.id]?.trim());
                  let statusColor = darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200';
                  if (res) {
                    statusColor = res.score >= 1 ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40' : 'bg-red-600/20 text-red-400 border-red-500/40';
                  } else if (hasAns) {
                    statusColor = 'bg-blue-600/20 text-blue-400 border-blue-500/40';
                  }
                  const isCurrent = currentQIndex === idx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-10 rounded-xl font-bold text-sm border flex items-center justify-center relative transition ${statusColor} ${
                        isCurrent ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-102'
                      }`}
                    >
                      {q.id}
                      {res && (
                        <span className="absolute -top-1 -right-1">
                          {res.score >= 1 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 bg-slate-900 rounded-full" /> : <XCircle className="w-3.5 h-3.5 text-red-400 bg-slate-900 rounded-full" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {activeSession.status === 'completed' && (
                <div className="space-y-3 pt-4 border-t border-slate-700/50">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-xs text-blue-400 font-medium">Kết quả chung cuộc</p>
                    <p className="text-2xl font-extrabold">{activeSession.score} / {currentList.length} điểm</p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        startFixErrorsExam();
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Sửa Lỗi (Fix Errors)</span>
                    </button>
                    <button
                      onClick={startFullExam}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Làm Lại Bài Mới (Retake)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Question Working Area */}
            <div className="lg:col-span-3 space-y-6">
              {currentQuestion && (
                <div className={`p-6 sm:p-8 rounded-3xl border shadow-lg space-y-6 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                  {/* Header info & Permanent Hint Button next to title */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700/50">
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {currentQuestion.part || "Phần Tự Luận"}
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        {currentQuestion.topic || "Toán Cao Cấp"}
                      </span>
                    </div>

                    {/* Permanent Hint Button Next to Question Header */}
                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showHint ? "Ẩn Gợi Ý" : "💡 Gợi Ý Lời Giải"}</span>
                    </button>
                  </div>

                  {/* Question Statement */}
                  <div className="space-y-3">
                    <h3 className="text-lg sm:text-xl font-bold">{currentQuestion.title}</h3>
                    <div className={`p-5 rounded-2xl text-base leading-relaxed border ${darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-200' : 'bg-blue-50/40 border-blue-100 text-slate-800'}`}>
                      <RichMathText text={currentQuestion.statement} />
                    </div>
                  </div>

                  {/* Expandable Hint Box */}
                  {showHint && (
                    <div className={`p-5 rounded-2xl border text-sm space-y-3 animate-fade-in ${darkMode ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                      <div className="flex items-center space-x-2 font-bold text-amber-400">
                        <Sparkles className="w-4 h-4" />
                        <span>Mẫu xương sống & Phương pháp giải:</span>
                      </div>
                      {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {currentQuestion.hints.map((h, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-amber-500/20 border border-amber-500/30 text-amber-300">
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="pt-2 border-t border-amber-500/20">
                        <p className="font-semibold mb-1">Các bước định hướng làm bài:</p>
                        <p className="whitespace-pre-line leading-relaxed text-sm opacity-95">
                          {currentQuestion.detailedHint || currentQuestion.solution || "Hãy áp dụng công thức cơ bản và phân tích giả thiết bài toán cẩn thận."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* LaTeX Formula Helper Toolbar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>Bảng gợi ý công thức LaTeX & Ký hiệu nhanh</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-950/40 border border-slate-800">
                      {[
                        { label: "∫", snippet: "\\int_{a}^{b} " },
                        { label: "d/dx", snippet: "\\frac{d}{dx}" },
                        { label: "Phân số a/b", snippet: "\\frac{}{}" },
                        { label: "Căn bậc hai", snippet: "\\sqrt{}" },
                        { label: "Đạo hàm y'", snippet: "y'" },
                        { label: "Mũ x^2", snippet: "^{2}" },
                        { label: "Chỉ số x_1", snippet: "_{1}" },
                        { label: "Vô cùng ∞", snippet: "\\infty" },
                        { label: "Khác ≠", snippet: "\\neq" },
                        { label: "Định thức det", snippet: "\\det(A)" },
                        { label: "Matrix 2x2", snippet: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
                        { label: "Vector 3D", snippet: "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}" },
                        { label: "Limit lim", snippet: "\\lim_{x \\to 0}" },
                        { label: "Sum ∑", snippet: "\\sum_{n=1}^{\\infty}" }
                      ].map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => insertLatexSymbol(item.snippet)}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Editor & Preview tabs */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Bài làm của bạn (Hỗ trợ LaTeX hoặc ghi đáp số / cách làm)</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setPreviewMode({ ...previewMode, [currentQuestion.id]: false })}
                          className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition ${
                            !previewMode[currentQuestion.id] ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Soạn thảo</span>
                        </button>
                        <button
                          onClick={() => setPreviewMode({ ...previewMode, [currentQuestion.id]: true })}
                          className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition ${
                            previewMode[currentQuestion.id] ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem trước LaTeX</span>
                        </button>
                      </div>
                    </div>

                    {!previewMode[currentQuestion.id] ? (
                      <textarea
                        value={activeSession.answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Nhập đáp số hoặc các bước làm đúng ở đây... Lời giải sẽ được tự động lưu liên tục."
                        rows={6}
                        className={`w-full p-4 rounded-xl font-mono text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                          darkMode ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    ) : (
                      <div className={`w-full min-h-[160px] p-4 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
                        <p className="text-xs font-semibold text-slate-400 mb-2">Xem trước kết quả hiển thị:</p>
                        <div className="text-base">
                          <RichMathText text={activeSession.answers[currentQuestion.id] || "(Chưa có nội dung)"} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation & Single Submit */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <button
                      onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                      disabled={currentQIndex === 0}
                      className="px-4 py-2 rounded-xl border border-slate-700 text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Câu trước</span>
                    </button>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => submitSingleQuestion(currentQuestion.id)}
                        disabled={gradingQuestionId === currentQuestion.id}
                        className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center space-x-2 transition"
                      >
                        {gradingQuestionId === currentQuestion.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>AI đang chấm...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>Chấm riêng câu này</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => setCurrentQIndex(Math.min(currentList.length - 1, currentQIndex + 1))}
                      disabled={currentQIndex === currentList.length - 1}
                      className="px-4 py-2 rounded-xl border border-slate-700 text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition flex items-center space-x-1"
                    >
                      <span>Câu sau</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* AI Grading Feedback Result Box */}
                  {activeSession.results[currentQuestion.id] && (
                    <div className={`p-6 rounded-2xl border space-y-4 animate-fade-in ${
                      activeSession.results[currentQuestion.id].score >= 1
                        ? darkMode ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                        : darkMode ? 'bg-red-950/20 border-red-500/30' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {activeSession.results[currentQuestion.id].score >= 1 ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-400" />
                          )}
                          <h4 className="font-bold text-base">
                            {activeSession.results[currentQuestion.id].score >= 1 ? 'Chính xác (+1.0 Điểm)' : 'Chưa chính xác (0 Điểm)'}
                          </h4>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          Đáp án chuẩn: <code className="text-blue-400">{currentQuestion.answerKey}</code>
                        </span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nhận xét từ AI:</p>
                        <div className={`p-4 rounded-xl text-sm leading-relaxed border ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <RichMathText text={activeSession.results[currentQuestion.id].aiFeedback} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lời giải chuẩn chi tiết:</p>
                        <div className={`p-4 rounded-xl text-sm leading-relaxed border ${darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                          <RichMathText text={currentQuestion.solution} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Lịch Sử Bài Làm & Phân Tích Tiến Độ</h2>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Tổng hợp tất cả các phiên làm bài thi, kỹ năng cần bổ sung và dữ liệu tiến độ.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={exportJsonReport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm flex items-center space-x-2 shadow transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất File JSON Báo Cáo</span>
                </button>
                <button
                  onClick={() => setMode('dashboard')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm transition"
                >
                  Quay về Trang Chủ
                </button>
              </div>
            </div>

            {historySessions.length === 0 ? (
              <div className={`p-12 text-center rounded-3xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                <h3 className="text-lg font-bold">Chưa có lịch sử làm bài nào</h3>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Hãy bắt đầu làm bài kiểm tra để hệ thống lưu lại lịch sử và phân tích tiến độ cho bạn.
                </p>
                <button
                  onClick={startFullExam}
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm"
                >
                  Làm Bài Thi Ngay
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {historySessions.map((session, idx) => (
                  <div key={session.sessionId || idx} className={`p-6 rounded-2xl border space-y-4 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-700/50">
                      <div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-base">Phiên #{idx + 1} ({session.sessionId})</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            session.mode === 'exam' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {session.activeExamTitle || (session.mode === 'exam' ? 'Bài thi chính thức' : 'Sửa lỗi (Fix errors)')}
                          </span>
                        </div>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Bắt đầu: {new Date(session.startedAt).toLocaleString('vi-VN')} {session.completedAt && `• Hoàn thành: ${new Date(session.completedAt).toLocaleString('vi-VN')}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-blue-400">{session.score}</span>
                        <span className="text-slate-400 text-sm"> / {session.totalQuestions} điểm</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kỹ năng cần bổ sung qua phiên này:</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(Object.values(session.results).flatMap((r: any) => r.skillsIdentified || []))).map((skill: any, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
