/**
 * NPTEL Prep Master — Applied Accelerated Artificial Intelligence (IIT Guwahati)
 * Complete Interactive Quiz Engine & Study Hub Application
 */

(function () {
  'use strict';

  // =========================================================================
  // Application State
  // =========================================================================
  const state = {
    allQuestions: [],
    activeTab: 'play',
    theme: localStorage.getItem('nptel_theme') || 'dark',
    soundEnabled: localStorage.getItem('nptel_sound') !== 'false',
    streak: parseInt(localStorage.getItem('nptel_streak') || '1', 10),
    bookmarks: new Set(JSON.parse(localStorage.getItem('nptel_bookmarks') || '[]')),
    mistakes: new Set(JSON.parse(localStorage.getItem('nptel_mistakes') || '[]')),
    history: JSON.parse(localStorage.getItem('nptel_history') || '[]'),

    // Active Quiz Session
    quiz: {
      active: false,
      mode: 'general',
      title: '',
      questions: [],
      currentIndex: 0,
      userAnswers: {}, // { [qId]: { selectedKey, isCorrect, timeTaken } }
      flagged: new Set(),
      isExamMode: false,
      isAnswerRevealed: false,
      startTime: null,
      timerInterval: null,
      timeRemaining: 0,
      totalTimeAllocated: 0
    },

    // Question Bank Filters
    bank: {
      searchTerm: '',
      weekFilter: 'all',
      categoryFilter: 'all',
      revealAllAnswers: false
    }
  };

  // =========================================================================
  // Web Audio Synthesizer (Procedural Sound Effects — Zero External Files)
  // =========================================================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      if (type === 'click') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'correct') {
        // Bright Two-Tone Chime (C5 -> E5)
        [523.25, 659.25].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.18, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.3);
        });
      } else if (type === 'wrong') {
        // Soft Resonant Low Bump
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'fanfare') {
        // Arpeggio Fanfare (C5, E5, G5, C6)
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.2, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.38);
        });
      }
    } catch (e) {
      console.warn('Audio playback not supported or blocked:', e);
    }
  }

  // =========================================================================
  // Confetti Animation Trigger
  // =========================================================================
  function triggerCelebration() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899']
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#06b6d4', '#6366f1']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#f59e0b', '#ec4899', '#8b5cf6']
        });
      }, 250);
    }
  }

  // =========================================================================
  // Math & KaTeX Helper
  // =========================================================================
  function renderLatexInElement(el) {
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('KaTeX rendering notice:', err);
      }
    }
  }

  // =========================================================================
  // Helper Utilities
  // =========================================================================
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMarkdown(text) {
    if (!text) return '';
    // Detect code blocks ```python ... ```
    let formatted = text.replace(/```(?:python|yaml|bash)?\n([\s\S]*?)```/g, (match, code) => {
      return `<div class="code-container">
        <div class="code-header"><span>Code Snippet</span><button class="btn btn-sm btn-secondary copy-code-btn" data-code="${escapeHtml(code)}">Copy</button></div>
        <pre class="code-content">${escapeHtml(code.trim())}</pre>
      </div>`;
    });

    // Detect inline code `...`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Bold text **...**
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic text *...*
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return formatted;
  }

  // =========================================================================
  // Initialization & Data Loading
  // =========================================================================
  function init() {
    // 1. Load questions from window.NPTEL_QUIZ_DATA
    if (window.NPTEL_QUIZ_DATA && Array.isArray(window.NPTEL_QUIZ_DATA)) {
      state.allQuestions = window.NPTEL_QUIZ_DATA;
    } else {
      console.error('NPTEL Quiz Master Data not found on window.NPTEL_QUIZ_DATA');
      return;
    }

    // 2. Set theme
    applyTheme(state.theme);

    // 3. Render Dashboard stats & week cards
    renderDashboard();

    // 4. Setup Event Listeners
    setupNavListeners();
    setupGlobalKeyboardListeners();
    setupBankListeners();
    setupModalListeners();

    console.log(`NPTEL Prep Master initialized with ${state.allQuestions.length} verified questions.`);
  }

  // =========================================================================
  // Theme Management
  // =========================================================================
  function applyTheme(themeName) {
    state.theme = themeName;
    document.body.className = '';
    if (themeName === 'light') {
      document.body.classList.add('theme-light');
    } else if (themeName === 'matrix') {
      document.body.classList.add('theme-matrix');
    }
    localStorage.setItem('nptel_theme', themeName);

    // Update theme toggle icon
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      if (themeName === 'light') themeBtn.innerHTML = '☀️';
      else if (themeName === 'matrix') themeBtn.innerHTML = '⚡';
      else themeBtn.innerHTML = '🌙';
    }
  }

  function cycleTheme() {
    playSound('click');
    if (state.theme === 'dark') applyTheme('light');
    else if (state.theme === 'light') applyTheme('matrix');
    else applyTheme('dark');
  }

  // =========================================================================
  // Navigation & Tab Switching
  // =========================================================================
  function switchTab(tabId) {
    playSound('click');
    state.activeTab = tabId;

    // Update tab button active states
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const target = document.getElementById(`${tabId}View`);
    if (target) {
      target.classList.add('active');
    }

    if (tabId === 'bank') {
      renderQuestionBank();
    } else if (tabId === 'analytics') {
      renderAnalytics();
    } else if (tabId === 'bookmarks') {
      renderBookmarksView();
    } else if (tabId === 'play') {
      renderDashboard();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupNavListeners() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('brandLogo').addEventListener('click', () => switchTab('play'));
    document.getElementById('themeToggleBtn').addEventListener('click', cycleTheme);

    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) {
      soundBtn.innerHTML = state.soundEnabled ? '🔊' : '🔇';
      soundBtn.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem('nptel_sound', state.soundEnabled);
        soundBtn.innerHTML = state.soundEnabled ? '🔊' : '🔇';
        if (state.soundEnabled) playSound('click');
      });
    }

    // Modal triggers
    document.getElementById('openCustomModalBtn')?.addEventListener('click', () => openCustomQuizModal());
    document.getElementById('openCustomModalHeroBtn')?.addEventListener('click', () => openCustomQuizModal());
  }

  // =========================================================================
  // Dashboard & Home Views
  // =========================================================================
  function renderDashboard() {
    // 1. Overall stats
    const totalQCount = state.allQuestions.length;
    const completedQuizzes = state.history.length;
    
    // Calculate total questions attempted and accuracy
    let totalAttempts = 0;
    let totalCorrect = 0;
    state.history.forEach(h => {
      totalAttempts += h.total;
      totalCorrect += h.score;
    });

    const accuracyPct = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    const statTotalQ = document.getElementById('statTotalQuestions');
    if (statTotalQ) statTotalQ.textContent = totalQCount;

    const statAccuracy = document.getElementById('statAccuracy');
    if (statAccuracy) statAccuracy.textContent = `${accuracyPct}%`;

    const statQuizzes = document.getElementById('statQuizzesTaken');
    if (statQuizzes) statQuizzes.textContent = completedQuizzes;

    const statWeak = document.getElementById('statWeakCount');
    if (statWeak) statWeak.textContent = state.mistakes.size;

    const streakVal = document.getElementById('streakValue');
    if (streakVal) streakVal.textContent = state.streak;

    // 2. Render Week Cards
    renderWeekCards();
  }

  function renderWeekCards() {
    const grid = document.getElementById('weeksGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const weekTitles = {
      1: { name: 'Hardware Architecture & Memory Wall', cat: 'Roofline, OoO, ROB, Amdahl' },
      2: { name: 'Docker, CUDA & GPU Containers', cat: 'nvidia-docker, Kernels, PCIe Bandwidth' },
      3: { name: 'Kubernetes & Service Mesh Orchestration', cat: 'GPU Pods, StatefulSets, Istio VirtualService' },
      4: { name: 'PyTorch Acceleration & Profiling', cat: 'torch.profiler, DataLoader, AMP, Squeeze' },
      5: { name: 'TensorFlow Acceleration & XLA', cat: 'XLA Compilation, tf.data AUTOTUNE, tf.function' },
      6: { name: 'LLM Fine-Tuning, PEFT & Quantization', cat: 'Next-Token, LoRA, AdamW Memory, Checkpointing' },
      7: { name: 'Distributed Training & Parallelism', cat: 'DDP, Ring All-Reduce, NCCL, FSDP' },
      8: { name: 'Large-Scale Training Dynamics', cat: 'Linear LR Scaling, Warmup, Critical Batch Size' },
      9: { name: 'Graph Compilers & vLLM Serving', cat: 'torch.compile, TorchDynamo, KV Cache, AWQ' },
      10: { name: 'Distributed Data Engineering', cat: 'Spark Shuffling, Dask, Ray, DAG Lineage' }
    };

    for (let w = 1; w <= 10; w++) {
      const wQuestions = state.allQuestions.filter(q => q.week === w);
      // Calculate how many were answered correctly in history
      const answeredCorrectly = wQuestions.filter(q => {
        return state.history.some(h => h.breakdown && h.breakdown[q.id] === true);
      }).length;
      const pct = Math.round((answeredCorrectly / wQuestions.length) * 100);

      const card = document.createElement('div');
      card.className = 'week-card';
      card.innerHTML = `
        <div class="week-header">
          <span class="week-num-badge">Week ${w}</span>
          <span class="week-q-count">${wQuestions.length} Questions</span>
        </div>
        <h3>${weekTitles[w].name}</h3>
        <p class="week-cat">${weekTitles[w].cat}</p>
        <div class="week-progress-wrap">
          <div class="week-progress-bar" style="width: ${pct}%"></div>
        </div>
        <div class="week-footer">
          <span>${pct}% Mastered</span>
          <span class="week-play-btn">Practice Week →</span>
        </div>
      `;
      card.addEventListener('click', () => {
        playSound('click');
        startWeekQuiz(w);
      });
      grid.appendChild(card);
    }
  }

  // =========================================================================
  // Quiz Launchers
  // =========================================================================
  function launchQuiz(config) {
    state.quiz = {
      active: true,
      mode: config.mode,
      title: config.title,
      questions: config.questions,
      currentIndex: 0,
      userAnswers: {},
      flagged: new Set(),
      isExamMode: config.isExamMode || false,
      isAnswerRevealed: false,
      startTime: Date.now(),
      timerInterval: null,
      timeRemaining: config.timeLimitSeconds || 0,
      totalTimeAllocated: config.timeLimitSeconds || 0
    };

    // Show Quiz Arena View
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const arenaView = document.getElementById('quizArenaView');
    if (arenaView) arenaView.classList.add('active');

    // Setup Palette
    buildQuestionPalette();

    // Start Timer
    if (state.quiz.timeRemaining > 0) {
      startTimer();
    } else {
      updateTimerDisplay('Untimed');
    }

    // Render Question
    renderActiveQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 1. Rapid Fire Drill (5 Questions, 45s per Q, Instant Feedback)
  window.startRapidQuiz = function () {
    playSound('click');
    const shuffled = shuffleArray(state.allQuestions);
    const selected = shuffled.slice(0, 5);
    launchQuiz({
      mode: 'rapid',
      title: '⚡ Rapid Fire Quiz (5 MCQs)',
      questions: selected,
      isExamMode: false,
      timeLimitSeconds: 5 * 45 // 3m 45s
    });
  };

  // 2. General Practice Quiz (15 Questions, 60s per Q)
  window.startGeneralQuiz = function (count = 15) {
    playSound('click');
    // Balance pick 1-2 questions from each of the 10 weeks
    const picked = [];
    for (let w = 1; w <= 10; w++) {
      const wQs = shuffleArray(state.allQuestions.filter(q => q.week === w));
      if (wQs.length > 0) picked.push(wQs[0]);
    }
    // Fill remaining up to count
    const remaining = state.allQuestions.filter(q => !picked.some(p => p.id === q.id));
    const extra = shuffleArray(remaining).slice(0, count - picked.length);
    const finalSelected = shuffleArray([...picked, ...extra]);

    launchQuiz({
      mode: 'general',
      title: `🎯 General Practice (${count} Questions)`,
      questions: finalSelected,
      isExamMode: false,
      timeLimitSeconds: count * 60
    });
  };

  // 3. Comprehensive Mock Exam (30 Questions, 45 minutes, Full Exam Conditions)
  window.startExamQuiz = function (count = 30) {
    playSound('click');
    // Pick 3 questions per week for 30 questions
    const picked = [];
    for (let w = 1; w <= 10; w++) {
      const wQs = shuffleArray(state.allQuestions.filter(q => q.week === w));
      picked.push(...wQs.slice(0, 3));
    }
    const finalSelected = shuffleArray(picked);

    launchQuiz({
      mode: 'exam',
      title: `🏆 NPTEL Comprehensive Mock Exam (${count} Questions)`,
      questions: finalSelected,
      isExamMode: true,
      timeLimitSeconds: 45 * 60 // 45 minutes
    });
  };

  // 4. Week-Wise Practice (15 Questions of that specific week)
  window.startWeekQuiz = function (weekNum) {
    playSound('click');
    const wQs = state.allQuestions.filter(q => q.week === weekNum);
    const title = `📅 Week ${weekNum}: ${wQs[0]?.weekTitle || 'Practice'}`;
    launchQuiz({
      mode: 'week',
      title: title,
      questions: shuffleArray(wQs),
      isExamMode: false,
      timeLimitSeconds: 15 * 60
    });
  };

  // 5. Topic-Wise Practice
  window.startTopicQuiz = function (categoryName) {
    playSound('click');
    const topicQs = state.allQuestions.filter(q => q.category === categoryName);
    launchQuiz({
      mode: 'topic',
      title: `🏷️ Topic: ${categoryName} (${topicQs.length} Questions)`,
      questions: shuffleArray(topicQs),
      isExamMode: false,
      timeLimitSeconds: topicQs.length * 60
    });
  };

  // 6. Practice Weak Areas / Mistakes
  window.startWeakAreasQuiz = function () {
    playSound('click');
    if (state.mistakes.size === 0) {
      alert('Great job! You have zero questions recorded in your weak area list. Take a General or Exam quiz to identify areas for improvement.');
      return;
    }
    const weakQs = state.allQuestions.filter(q => state.mistakes.has(q.id));
    launchQuiz({
      mode: 'weak',
      title: `⚠️ Weak Areas Practice (${weakQs.length} Questions)`,
      questions: shuffleArray(weakQs),
      isExamMode: false,
      timeLimitSeconds: weakQs.length * 60
    });
  };

  // 7. Practice Bookmarked Questions
  window.startBookmarksQuiz = function () {
    playSound('click');
    if (state.bookmarks.size === 0) {
      alert('You have no bookmarked questions yet! Click the star icon on any question during a quiz or in the Question Bank to save it here.');
      return;
    }
    const bQs = state.allQuestions.filter(q => state.bookmarks.has(q.id));
    launchQuiz({
      mode: 'bookmark',
      title: `🔖 Bookmarked Questions (${bQs.length} Questions)`,
      questions: shuffleArray(bQs),
      isExamMode: false,
      timeLimitSeconds: bQs.length * 60
    });
  };

  // =========================================================================
  // In-Quiz Timer Management
  // =========================================================================
  function startTimer() {
    clearInterval(state.quiz.timerInterval);
    updateTimerDisplay(formatTime(state.quiz.timeRemaining));

    state.quiz.timerInterval = setInterval(() => {
      state.quiz.timeRemaining--;

      if (state.quiz.timeRemaining <= 0) {
        clearInterval(state.quiz.timerInterval);
        playSound('wrong');
        alert('Time is up! Submitting your quiz now.');
        submitQuiz();
        return;
      }

      updateTimerDisplay(formatTime(state.quiz.timeRemaining));

      // Visual urgency cue when time < 20%
      const timerPill = document.getElementById('quizTimerPill');
      if (timerPill) {
        if (state.quiz.timeRemaining < state.quiz.totalTimeAllocated * 0.2) {
          timerPill.classList.add('urgent');
        } else {
          timerPill.classList.remove('urgent');
        }
      }
    }, 1000);
  }

  function updateTimerDisplay(text) {
    const el = document.getElementById('quizTimerDisplay');
    if (el) el.textContent = text;
  }

  // =========================================================================
  // Rendering Active Question
  // =========================================================================
  function renderActiveQuestion() {
    const q = state.quiz.questions[state.quiz.currentIndex];
    if (!q) return;

    // Reset explanation drawer visibility
    state.quiz.isAnswerRevealed = false;
    const expPanel = document.getElementById('explanationPanel');
    if (expPanel) expPanel.classList.remove('show');

    // 1. HUD Updates
    document.getElementById('quizModeTitle').textContent = state.quiz.title;
    document.getElementById('quizProgressNum').textContent = `${state.quiz.currentIndex + 1} of ${state.quiz.questions.length}`;

    const progressPct = ((state.quiz.currentIndex + 1) / state.quiz.questions.length) * 100;
    document.getElementById('hudProgressBar').style.width = `${progressPct}%`;

    // 2. Question Bookmark State
    const bookmarkBtn = document.getElementById('quizBookmarkBtn');
    if (bookmarkBtn) {
      const isBookmarked = state.bookmarks.has(q.id);
      bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
      bookmarkBtn.innerHTML = isBookmarked ? '★' : '☆';
      bookmarkBtn.title = isBookmarked ? 'Remove Bookmark (F)' : 'Bookmark Question (F)';
    }

    // 3. Question Meta Badges
    document.getElementById('qTagWeek').textContent = `Week ${q.week} Assignment`;
    document.getElementById('qTagCategory').textContent = q.category;
    document.getElementById('qTagConcept').textContent = q.tag;

    // 4. Question Text & Code
    const qTitleEl = document.getElementById('questionTextTitle');
    qTitleEl.innerHTML = formatMarkdown(q.question);

    // 5. Formula Block (if available)
    const formulaContainer = document.getElementById('questionFormulaBlock');
    if (q.keyFormula && formulaContainer) {
      formulaContainer.style.display = 'flex';
      formulaContainer.innerHTML = `$$${q.keyFormula}$$`;
    } else if (formulaContainer) {
      formulaContainer.style.display = 'none';
      formulaContainer.innerHTML = '';
    }

    // 6. Render Options
    renderOptionsList(q);

    // 7. Update Controls (Prev/Next buttons, Submit button)
    updateQuizControls();

    // 8. Re-render KaTeX math
    renderLatexInElement(document.getElementById('questionCardMain'));

    // 9. Update Palette Matrix current item
    updatePaletteActiveState();
  }

  function renderOptionsList(q) {
    const optionsContainer = document.getElementById('optionsListContainer');
    optionsContainer.innerHTML = '';

    const existingAnswer = state.quiz.userAnswers[q.id];

    q.options.forEach((opt, idx) => {
      const optEl = document.createElement('div');
      optEl.className = 'option-item';
      optEl.dataset.key = opt.key;

      const isSelected = existingAnswer && existingAnswer.selectedKey === opt.key;
      if (isSelected) {
        optEl.classList.add('selected');
      }

      // If in instant mode and user has already answered this question
      if (!state.quiz.isExamMode && existingAnswer) {
        optEl.classList.add('disabled');
        if (opt.key === q.answer) {
          optEl.classList.add('correct');
        } else if (isSelected && !existingAnswer.isCorrect) {
          optEl.classList.add('wrong');
        }
      }

      optEl.innerHTML = `
        <div class="option-key-badge">${opt.key}</div>
        <div class="option-text">${escapeHtml(opt.text)}</div>
        <div class="option-indicator">${opt.key === q.answer ? '✓' : '✗'}</div>
      `;

      optEl.addEventListener('click', () => handleOptionSelect(opt.key));
      optionsContainer.appendChild(optEl);
    });

    // If already answered in Practice mode, show explanation
    if (!state.quiz.isExamMode && existingAnswer) {
      showExplanation(q, existingAnswer.isCorrect);
    }
  }

  // =========================================================================
  // Option Selection & Answer Handling
  // =========================================================================
  function handleOptionSelect(selectedKey) {
    const q = state.quiz.questions[state.quiz.currentIndex];
    if (!q) return;

    // In Instant Practice Mode: only allow answering once per question
    if (!state.quiz.isExamMode && state.quiz.userAnswers[q.id]) {
      return;
    }

    const isCorrect = selectedKey === q.answer;

    // Record answer
    state.quiz.userAnswers[q.id] = {
      selectedKey: selectedKey,
      isCorrect: isCorrect,
      timeTaken: Date.now() - state.quiz.startTime
    };

    // Update mistakes list
    if (!isCorrect) {
      state.mistakes.add(q.id);
    } else {
      state.mistakes.delete(q.id);
    }
    localStorage.setItem('nptel_mistakes', JSON.stringify(Array.from(state.mistakes)));

    if (!state.quiz.isExamMode) {
      // Instant Learning Mode: visual feedback + sounds + explanation
      if (isCorrect) {
        playSound('correct');
      } else {
        playSound('wrong');
      }

      // Update options styling
      const optEls = document.querySelectorAll('.option-item');
      optEls.forEach(el => {
        el.classList.add('disabled');
        if (el.dataset.key === q.answer) {
          el.classList.add('correct');
        } else if (el.dataset.key === selectedKey && !isCorrect) {
          el.classList.add('wrong');
        }
      });

      // Show Explanation drawer
      showExplanation(q, isCorrect);
    } else {
      // Exam Mode: select option, save state, play soft click
      playSound('click');
      document.querySelectorAll('.option-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.key === selectedKey);
      });
    }

    // Update Palette item state
    updatePaletteActiveState();
    updateQuizControls();
  }

  function showExplanation(q, isCorrect) {
    state.quiz.isAnswerRevealed = true;
    const expPanel = document.getElementById('explanationPanel');
    if (!expPanel) return;

    const statusTag = document.getElementById('expStatusTag');
    if (statusTag) {
      statusTag.className = `exp-status-tag ${isCorrect ? 'correct' : 'wrong'}`;
      statusTag.innerHTML = isCorrect ? '✓ Correct Answer' : '✗ Incorrect Choice';
    }

    const officialText = document.getElementById('expOfficialText');
    if (officialText) {
      officialText.innerHTML = formatMarkdown(q.explanation);
    }

    const deepDiveText = document.getElementById('expDeepDiveText');
    if (deepDiveText) {
      deepDiveText.innerHTML = formatMarkdown(q.deepDive);
    }

    const lectureRefText = document.getElementById('expLectureRef');
    if (lectureRefText) {
      lectureRefText.textContent = q.lectureRef;
    }

    expPanel.classList.add('show');
    renderLatexInElement(expPanel);

    // Scroll smoothly to explanation
    setTimeout(() => {
      expPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  // =========================================================================
  // Question Controls (Next, Prev, Review Flag, Submit)
  // =========================================================================
  function updateQuizControls() {
    const prevBtn = document.getElementById('quizPrevBtn');
    const nextBtn = document.getElementById('quizNextBtn');
    const submitBtn = document.getElementById('quizSubmitBtn');
    const flagBtn = document.getElementById('quizFlagReviewBtn');

    const total = state.quiz.questions.length;
    const current = state.quiz.currentIndex;
    const currentQ = state.quiz.questions[current];

    if (prevBtn) {
      prevBtn.disabled = current === 0;
    }

    if (flagBtn && currentQ) {
      const isFlagged = state.quiz.flagged.has(currentQ.id);
      flagBtn.classList.toggle('active', isFlagged);
      flagBtn.innerHTML = isFlagged ? '🚩 Flagged' : '🏳️ Flag for Review';
    }

    if (current === total - 1) {
      if (nextBtn) nextBtn.style.display = 'none';
      if (submitBtn) submitBtn.style.display = 'inline-flex';
    } else {
      if (nextBtn) nextBtn.style.display = 'inline-flex';
      if (submitBtn) submitBtn.style.display = state.quiz.isExamMode ? 'inline-flex' : 'none';
    }
  }

  function nextQuestion() {
    playSound('click');
    if (state.quiz.currentIndex < state.quiz.questions.length - 1) {
      state.quiz.currentIndex++;
      renderActiveQuestion();
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  }

  function prevQuestion() {
    playSound('click');
    if (state.quiz.currentIndex > 0) {
      state.quiz.currentIndex--;
      renderActiveQuestion();
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  }

  function toggleFlagCurrentQuestion() {
    const q = state.quiz.questions[state.quiz.currentIndex];
    if (!q) return;

    playSound('click');
    if (state.quiz.flagged.has(q.id)) {
      state.quiz.flagged.delete(q.id);
    } else {
      state.quiz.flagged.add(q.id);
    }

    updateQuizControls();
    updatePaletteActiveState();
  }

  function toggleBookmarkCurrentQuestion() {
    const q = state.quiz.questions[state.quiz.currentIndex];
    if (!q) return;

    playSound('click');
    if (state.bookmarks.has(q.id)) {
      state.bookmarks.delete(q.id);
    } else {
      state.bookmarks.add(q.id);
    }
    localStorage.setItem('nptel_bookmarks', JSON.stringify(Array.from(state.bookmarks)));

    const bookmarkBtn = document.getElementById('quizBookmarkBtn');
    if (bookmarkBtn) {
      const isBookmarked = state.bookmarks.has(q.id);
      bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
      bookmarkBtn.innerHTML = isBookmarked ? '★' : '☆';
    }
  }

  // =========================================================================
  // Question Navigation Palette Drawer
  // =========================================================================
  function buildQuestionPalette() {
    const matrix = document.getElementById('paletteMatrix');
    if (!matrix) return;
    matrix.innerHTML = '';

    state.quiz.questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.className = 'palette-btn';
      btn.textContent = idx + 1;
      btn.dataset.index = idx;
      btn.addEventListener('click', () => {
        playSound('click');
        state.quiz.currentIndex = idx;
        renderActiveQuestion();
        closePaletteDrawer();
      });
      matrix.appendChild(btn);
    });

    updatePaletteActiveState();
  }

  function updatePaletteActiveState() {
    const buttons = document.querySelectorAll('.palette-btn');
    state.quiz.questions.forEach((q, idx) => {
      const btn = buttons[idx];
      if (!btn) return;

      btn.className = 'palette-btn';
      if (idx === state.quiz.currentIndex) {
        btn.classList.add('current');
      }

      if (state.quiz.userAnswers[q.id]) {
        btn.classList.add('answered');
      }

      if (state.quiz.flagged.has(q.id)) {
        btn.classList.add('review');
      }
    });
  }

  function togglePaletteDrawer() {
    playSound('click');
    const drawer = document.getElementById('paletteDrawer');
    if (drawer) drawer.classList.toggle('open');
  }

  function closePaletteDrawer() {
    const drawer = document.getElementById('paletteDrawer');
    if (drawer) drawer.classList.remove('open');
  }

  // =========================================================================
  // Quiz Submission & Result Analytics
  // =========================================================================
  function submitQuiz() {
    clearInterval(state.quiz.timerInterval);

    // Confirmation if unanswered questions exist in Exam Mode
    if (state.quiz.isExamMode) {
      const answeredCount = Object.keys(state.quiz.userAnswers).length;
      const total = state.quiz.questions.length;
      if (answeredCount < total) {
        const confirmSubmit = confirm(`You have answered ${answeredCount} out of ${total} questions. Are you sure you want to submit your exam?`);
        if (!confirmSubmit) {
          startTimer();
          return;
        }
      }
    }

    // 1. Calculate Results
    const total = state.quiz.questions.length;
    let score = 0;
    const breakdown = {};

    state.quiz.questions.forEach(q => {
      const ans = state.quiz.userAnswers[q.id];
      if (ans && ans.isCorrect) {
        score++;
        breakdown[q.id] = true;
      } else {
        breakdown[q.id] = false;
        state.mistakes.add(q.id);
      }
    });

    localStorage.setItem('nptel_mistakes', JSON.stringify(Array.from(state.mistakes)));

    const percentage = Math.round((score / total) * 100);
    const timeSpentSeconds = Math.round((Date.now() - state.quiz.startTime) / 1000);

    // 2. Save to History
    const quizRecord = {
      id: `quiz_${Date.now()}`,
      timestamp: new Date().toISOString(),
      mode: state.quiz.mode,
      title: state.quiz.title,
      score: score,
      total: total,
      percentage: percentage,
      timeSpent: timeSpentSeconds,
      breakdown: breakdown
    };

    state.history.unshift(quizRecord);
    if (state.history.length > 50) state.history.pop();
    localStorage.setItem('nptel_history', JSON.stringify(state.history));

    // Update streak if score >= 60%
    if (percentage >= 60) {
      state.streak++;
      localStorage.setItem('nptel_streak', state.streak);
    }

    // 3. Render Results View
    renderResultsView(quizRecord);
  }

  function renderResultsView(record) {
    // Hide Arena, Show Results View
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const resultsView = document.getElementById('resultsView');
    if (resultsView) resultsView.classList.add('active');

    // Celebration sounds and confetti
    if (record.percentage >= 75) {
      playSound('fanfare');
      triggerCelebration();
    } else {
      playSound('click');
    }

    // Tier badge & messages
    const tierBadge = document.getElementById('resultTierBadge');
    const heroMsg = document.getElementById('resultHeroMsg');
    if (record.percentage >= 90) {
      tierBadge.className = 'result-badge-tier elite-gold';
      tierBadge.textContent = '🏆 Elite + Gold (Top 1% Certification Standard)';
      heroMsg.textContent = 'Outstanding Mastery! You have demonstrated exceptional knowledge across the course curriculum.';
    } else if (record.percentage >= 75) {
      tierBadge.className = 'result-badge-tier elite';
      tierBadge.textContent = '🎖️ Elite (Certificate of Excellence)';
      heroMsg.textContent = 'Superb performance! You are well prepared for the NPTEL Certification Exam.';
    } else if (record.percentage >= 50) {
      tierBadge.className = 'result-badge-tier pass';
      tierBadge.textContent = '✅ Successful Pass Standard';
      heroMsg.textContent = 'Good effort! Review the missed questions below to elevate your score to Elite.';
    } else {
      tierBadge.className = 'result-badge-tier retry';
      tierBadge.textContent = '⚠️ Revision Recommended';
      heroMsg.textContent = 'Keep practicing! Review the detailed explanations and weekly lecture notes to strengthen your fundamentals.';
    }

    // Score large
    document.getElementById('resultScoreDisplay').innerHTML = `${record.score} <span>/ ${record.total}</span>`;
    document.getElementById('resultAccuracy').textContent = `${record.percentage}%`;
    document.getElementById('resultTimeTaken').textContent = formatTime(record.timeSpent);

    const avgSpeed = Math.round(record.timeSpent / record.total);
    document.getElementById('resultAvgSpeed').textContent = `${avgSpeed}s / Q`;

    const rankEst = record.percentage >= 90 ? 'Top 1%' : record.percentage >= 75 ? 'Top 5%' : 'Top 25%';
    document.getElementById('resultRankEst').textContent = rankEst;

    // Render Review List
    renderResultsReviewList(record);
  }

  function renderResultsReviewList(record, filter = 'all') {
    const container = document.getElementById('reviewListContainer');
    if (!container) return;
    container.innerHTML = '';

    const questions = state.quiz.questions;

    questions.forEach((q, idx) => {
      const userAns = state.quiz.userAnswers[q.id];
      const isCorrect = userAns ? userAns.isCorrect : false;

      if (filter === 'mistakes' && isCorrect) return;
      if (filter === 'flagged' && !state.quiz.flagged.has(q.id)) return;

      const card = document.createElement('div');
      card.className = 'review-item-card';

      const selectedOpt = userAns ? q.options.find(o => o.key === userAns.selectedKey) : null;
      const correctOpt = q.options.find(o => o.key === q.answer);

      card.innerHTML = `
        <div class="review-item-header">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="q-tag week">Week ${q.week}</span>
            <span class="q-tag concept">${q.tag}</span>
          </div>
          <span class="exp-status-tag ${isCorrect ? 'correct' : 'wrong'}">
            ${isCorrect ? '✓ Correct' : '✗ Missed'}
          </span>
        </div>
        <div class="review-item-question">
          <strong>Q${idx + 1}:</strong> ${formatMarkdown(q.question)}
        </div>
        <div class="review-options-summary">
          <div class="review-opt-badge ${isCorrect ? 'correct-choice' : 'your-choice-wrong'}">
            <strong>Your Choice:</strong> ${userAns ? `${userAns.selectedKey}) ${selectedOpt ? escapeHtml(selectedOpt.text) : ''}` : 'Unanswered'}
          </div>
          <div class="review-opt-badge correct-choice">
            <strong>Correct Answer:</strong> ${q.answer}) ${correctOpt ? escapeHtml(correctOpt.text) : ''}
          </div>
        </div>
        <div class="deep-dive-box">
          <p><strong>Official Solution:</strong> ${formatMarkdown(q.explanation)}</p>
          <div style="margin-top:0.6rem; font-size:0.82rem; color:var(--text-muted);">
            <em>Reference:</em> ${q.lectureRef}
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    renderLatexInElement(container);
  }

  // =========================================================================
  // Question Bank & Study Hub
  // =========================================================================
  function renderQuestionBank() {
    const container = document.getElementById('bankQuestionsContainer');
    if (!container) return;

    const term = state.bank.searchTerm.toLowerCase().trim();
    const weekVal = state.bank.weekFilter;
    const catVal = state.bank.categoryFilter;

    const filtered = state.allQuestions.filter(q => {
      // Week filter
      if (weekVal !== 'all' && q.week !== parseInt(weekVal, 10)) return false;
      // Category filter
      if (catVal !== 'all' && q.category !== catVal) return false;
      // Search term
      if (term) {
        const inQuestion = q.question.toLowerCase().includes(term);
        const inExpl = q.explanation.toLowerCase().includes(term);
        const inTag = q.tag.toLowerCase().includes(term);
        const inOpts = q.options.some(o => o.text.toLowerCase().includes(term));
        if (!inQuestion && !inExpl && !inTag && !inOpts) return false;
      }
      return true;
    });

    document.getElementById('bankTotalCount').textContent = `${filtered.length} Questions Found`;

    container.innerHTML = '';
    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--text-muted);">
        <p style="font-size:1.1rem; margin-bottom:0.5rem;">No matching questions found.</p>
        <p style="font-size:0.85rem;">Try adjusting your search keywords or clearing filters.</p>
      </div>`;
      return;
    }

    filtered.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'bank-question-row';

      const isBookmarked = state.bookmarks.has(q.id);
      const correctOpt = q.options.find(o => o.key === q.answer);

      card.innerHTML = `
        <div class="bank-q-header">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="q-tag week">Week ${q.week}</span>
            <span class="q-tag concept">${q.tag}</span>
          </div>
          <button class="btn-icon-subtle ${isBookmarked ? 'bookmarked' : ''}" data-bookmark-id="${q.id}">
            ${isBookmarked ? '★' : '☆'}
          </button>
        </div>
        <div class="bank-q-title">
          <strong>#${idx + 1}:</strong> ${formatMarkdown(q.question)}
        </div>
        <div class="options-list" style="margin-bottom:1rem;">
          ${q.options.map(o => `
            <div class="option-item disabled" style="padding:0.6rem 0.9rem;">
              <div class="option-key-badge">${o.key}</div>
              <div class="option-text" style="font-size:0.88rem;">${escapeHtml(o.text)}</div>
            </div>
          `).join('')}
        </div>
        <button class="bank-solution-toggle-btn" data-drawer-id="drawer_${q.id}">
          <span>💡 Reveal Detailed Explanation</span>
        </button>
        <div class="bank-solution-drawer ${state.bank.revealAllAnswers ? 'open' : ''}" id="drawer_${q.id}">
          <div style="margin-bottom:0.75rem;">
            <span class="exp-status-tag correct">Correct Answer: Option ${q.answer}) ${correctOpt ? escapeHtml(correctOpt.text) : ''}</span>
          </div>
          <p class="exp-text-official"><strong>Official Solution:</strong> ${formatMarkdown(q.explanation)}</p>
          <div class="deep-dive-box">
            <p>${formatMarkdown(q.deepDive)}</p>
            ${q.keyFormula ? `<div class="formula-block">$$${q.keyFormula}$$</div>` : ''}
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.4rem;">
              <em>Source Reference:</em> ${q.lectureRef}
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    // Setup reveal buttons inside bank
    container.querySelectorAll('.bank-solution-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        const drawerId = btn.dataset.drawerId;
        const drawer = document.getElementById(drawerId);
        if (drawer) {
          const isOpen = drawer.classList.toggle('open');
          btn.querySelector('span').textContent = isOpen ? '▲ Hide Explanation' : '💡 Reveal Detailed Explanation';
          renderLatexInElement(drawer);
        }
      });
    });

    // Setup bookmark buttons
    container.querySelectorAll('[data-bookmark-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        const qid = btn.dataset.bookmarkId;
        if (state.bookmarks.has(qid)) {
          state.bookmarks.delete(qid);
          btn.classList.remove('bookmarked');
          btn.innerHTML = '☆';
        } else {
          state.bookmarks.add(qid);
          btn.classList.add('bookmarked');
          btn.innerHTML = '★';
        }
        localStorage.setItem('nptel_bookmarks', JSON.stringify(Array.from(state.bookmarks)));
      });
    });

    renderLatexInElement(container);
  }

  function setupBankListeners() {
    const searchInput = document.getElementById('bankSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.bank.searchTerm = e.target.value;
        renderQuestionBank();
      });
    }

    const weekSelect = document.getElementById('bankWeekSelect');
    if (weekSelect) {
      weekSelect.addEventListener('change', (e) => {
        state.bank.weekFilter = e.target.value;
        renderQuestionBank();
      });
    }

    const catSelect = document.getElementById('bankCategorySelect');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        state.bank.categoryFilter = e.target.value;
        renderQuestionBank();
      });
    }

    const toggleAllBtn = document.getElementById('bankToggleAllSolutionsBtn');
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => {
        playSound('click');
        state.bank.revealAllAnswers = !state.bank.revealAllAnswers;
        toggleAllBtn.textContent = state.bank.revealAllAnswers ? 'Hide All Solutions' : 'Reveal All Solutions';
        renderQuestionBank();
      });
    }
  }

  // =========================================================================
  // Bookmarks & Saved Mistakes Hub View
  // =========================================================================
  function renderBookmarksView() {
    const bCountEl = document.getElementById('savedBookmarksCount');
    const mCountEl = document.getElementById('savedMistakesCount');
    if (bCountEl) bCountEl.textContent = state.bookmarks.size;
    if (mCountEl) mCountEl.textContent = state.mistakes.size;
  }

  // =========================================================================
  // Analytics & Mastery View
  // =========================================================================
  function renderAnalytics() {
    const historyList = document.getElementById('analyticsHistoryList');
    if (!historyList) return;

    if (state.history.length === 0) {
      historyList.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--text-muted);">
        No quiz history recorded yet. Complete a quiz session to unlock your performance analytics.
      </div>`;
      return;
    }

    historyList.innerHTML = '';
    state.history.slice(0, 15).forEach(h => {
      const row = document.createElement('div');
      row.className = 'stat-card';
      row.style.marginBottom = '0.75rem';
      row.innerHTML = `
        <div style="flex:1;">
          <h4 style="font-size:0.98rem; font-weight:700; margin-bottom:0.2rem;">${escapeHtml(h.title)}</h4>
          <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(h.timestamp).toLocaleDateString()} at ${new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Time: ${formatTime(h.timeSpent)}</span>
        </div>
        <div style="text-align:right;">
          <span style="font-size:1.25rem; font-weight:800; color:${h.percentage >= 75 ? 'var(--accent-emerald)' : h.percentage >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)'};">
            ${h.score}/${h.total}
          </span>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${h.percentage}%</div>
        </div>
      `;
      historyList.appendChild(row);
    });
  }

  // =========================================================================
  // Custom Quiz Studio Modal
  // =========================================================================
  function openCustomQuizModal() {
    playSound('click');
    const modal = document.getElementById('customQuizModal');
    if (modal) modal.classList.add('open');
  }

  function closeCustomQuizModal() {
    const modal = document.getElementById('customQuizModal');
    if (modal) modal.classList.remove('open');
  }

  function setupModalListeners() {
    document.getElementById('closeModalBtn')?.addEventListener('click', closeCustomQuizModal);

    // Range slider update
    const slider = document.getElementById('customQCountSlider');
    const display = document.getElementById('customQCountDisplay');
    if (slider && display) {
      slider.addEventListener('input', (e) => {
        display.textContent = e.target.value;
      });
    }

    // Launch Custom Quiz
    document.getElementById('startCustomQuizSubmitBtn')?.addEventListener('click', () => {
      const count = parseInt(document.getElementById('customQCountSlider').value, 10) || 15;
      const checkedWeeks = Array.from(document.querySelectorAll('.week-checkbox:checked')).map(cb => parseInt(cb.value, 10));
      const modeSelect = document.getElementById('customQuizModeSelect').value;
      const timerSelect = parseInt(document.getElementById('customQuizTimerSelect').value, 10);

      // Filter available questions by checked weeks
      let candidatePool = state.allQuestions;
      if (checkedWeeks.length > 0) {
        candidatePool = candidatePool.filter(q => checkedWeeks.includes(q.week));
      }

      if (candidatePool.length === 0) {
        alert('Please select at least one week to draw questions from!');
        return;
      }

      const selected = shuffleArray(candidatePool).slice(0, count);

      closeCustomQuizModal();
      launchQuiz({
        mode: 'custom',
        title: `🛠️ Custom Quiz (${selected.length} Questions)`,
        questions: selected,
        isExamMode: modeSelect === 'exam',
        timeLimitSeconds: timerSelect * 60
      });
    });
  }

  // =========================================================================
  // Keyboard Shortcuts Listener
  // =========================================================================
  function setupGlobalKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in a search/input box
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      // Quiz Navigation
      if (state.quiz.active) {
        const key = e.key.toUpperCase();

        // Keys A, B, C, D or 1, 2, 3, 4
        if (['A', 'B', 'C', 'D'].includes(key)) {
          handleOptionSelect(key);
        } else if (key === '1') {
          handleOptionSelect('A');
        } else if (key === '2') {
          handleOptionSelect('B');
        } else if (key === '3') {
          handleOptionSelect('C');
        } else if (key === '4') {
          handleOptionSelect('D');
        } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
          nextQuestion();
        } else if (e.key === 'ArrowLeft') {
          prevQuestion();
        } else if (key === 'F') {
          toggleFlagCurrentQuestion();
        } else if (key === 'P') {
          togglePaletteDrawer();
        }
      }

      // ESC closes modals and drawers
      if (e.key === 'Escape') {
        closeCustomQuizModal();
        closePaletteDrawer();
      }
    });

    // Quiz Buttons
    document.getElementById('quizNextBtn')?.addEventListener('click', nextQuestion);
    document.getElementById('quizPrevBtn')?.addEventListener('click', prevQuestion);
    document.getElementById('quizSubmitBtn')?.addEventListener('click', submitQuiz);
    document.getElementById('quizFlagReviewBtn')?.addEventListener('click', toggleFlagCurrentQuestion);
    document.getElementById('quizBookmarkBtn')?.addEventListener('click', toggleBookmarkCurrentQuestion);
    document.getElementById('openPaletteBtn')?.addEventListener('click', togglePaletteDrawer);
    document.getElementById('closePaletteBtn')?.addEventListener('click', closePaletteDrawer);

    // Results Retake Buttons
    document.getElementById('retakeQuizBtn')?.addEventListener('click', () => {
      playSound('click');
      launchQuiz({
        mode: state.quiz.mode,
        title: state.quiz.title,
        questions: shuffleArray(state.quiz.questions),
        isExamMode: state.quiz.isExamMode,
        timeLimitSeconds: state.quiz.totalTimeAllocated
      });
    });

    document.getElementById('drillMistakesBtn')?.addEventListener('click', () => {
      startWeakAreasQuiz();
    });

    document.getElementById('backToDashboardBtn')?.addEventListener('click', () => {
      switchTab('play');
    });

    // Results Filter Tabs
    document.querySelectorAll('.review-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        document.querySelectorAll('.review-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        const lastRecord = state.history[0];
        if (lastRecord) renderResultsReviewList(lastRecord, filter);
      });
    });
  }

  // Initialize on DOMContentLoaded
  
  // Global Copy Code Handler
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-code-btn')) {
      const code = e.target.dataset.code;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          const orig = e.target.textContent;
          e.target.textContent = '✓ Copied!';
          setTimeout(() => { e.target.textContent = orig; }, 1500);
        });
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
