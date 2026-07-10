import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Trash2, RotateCcw, Check, X, HelpCircle, 
  Sparkles, Award, Flame, Layers, BookOpen, AlertCircle
} from 'lucide-react';
import { storage } from '../lib/storage';
import { Flashcard } from '../types';

interface FlashcardsScreenProps {
  onBack: () => void;
}

const PRESET_CATEGORIES = ['General', 'Medic', 'Tech', 'Language', 'History', 'Math'];

export function FlashcardsScreen({ onBack }: FlashcardsScreenProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  // Create / Edit card state
  const [isAdding, setIsAdding] = useState(false);
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [cardCategory, setCardCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Study session state
  const [isStudying, setIsStudying] = useState(false);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [stats, setStats] = useState({ easy: 0, medium: 0, hard: 0 });

  // Load all flashcards on startup
  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const loaded = await storage.getFlashcards();
      setCards(loaded);
    } catch (e) {
      console.error('Failed to load flashcards', e);
    }
  };

  // Extract all unique categories
  const categories = ['All', ...Array.from(new Set(cards.map(c => c.category).filter(Boolean)))];

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const finalFront = frontText.trim();
    const finalBack = backText.trim();
    if (!finalFront || !finalBack) {
      setErrorMsg('Fadlan geli su'+"'aal iyo jawaabba.");
      return;
    }

    const finalCategory = customCategory.trim() 
      ? customCategory.trim() 
      : cardCategory;

    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      front: finalFront,
      back: finalBack,
      box: 1, // Start in Leitner Box 1
      category: finalCategory,
      createdAt: Date.now()
    };

    try {
      const updated = await storage.saveFlashcard(newCard);
      setCards(updated);
      setFrontText('');
      setBackText('');
      setCustomCategory('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Wuu fashilmay kaydinta kaarka.');
    }
  };

  const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Ma hubtaa inaad tirtirto kaarkan darasada?')) return;
    try {
      const updated = await storage.deleteFlashcard(id);
      setCards(updated);
      
      // If we are studying, adjust the session
      if (isStudying) {
        setStudyCards(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Initialize a study session
  const startStudySession = (filterCategory?: string) => {
    let pool = [...cards];
    if (filterCategory && filterCategory !== 'All') {
      pool = pool.filter(c => c.category === filterCategory);
    }
    
    if (pool.length === 0) {
      alert("Ma haysid wax kaarar ah oo aad ku tababarato qaybtaan. Fadlan ku dar kaarar cusub marka hore!");
      return;
    }

    // Shuffle pool
    const shuffled = pool.sort(() => Math.random() - 0.5);
    setStudyCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsStudying(true);
    setStats({ easy: 0, medium: 0, hard: 0 });
  };

  // Grade progress via Leitner System
  const handleGradeCard = async (grade: 'hard' | 'medium' | 'easy') => {
    const card = studyCards[currentIndex];
    if (!card) return;

    let nextBox = card.box;
    if (grade === 'easy') {
      nextBox = Math.min(card.box + 1, 5); // promote card, max box 5
      setStats(prev => ({ ...prev, easy: prev.easy + 1 }));
      setSessionStreak(s => s + 1);
    } else if (grade === 'medium') {
      // keep same box
      setStats(prev => ({ ...prev, medium: prev.medium + 1 }));
    } else {
      nextBox = 1; // demote back to box 1 (tough love Leitner rule!)
      setStats(prev => ({ ...prev, hard: prev.hard + 1 }));
      setSessionStreak(0); // break streak
    }

    const updatedCard: Flashcard = {
      ...card,
      box: nextBox,
      lastReviewed: Date.now()
    };

    // Save update
    await storage.saveFlashcard(updatedCard);
    
    // Move to next card
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex + 1 < studyCards.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // finished session! reload library metadata
        loadCards();
      }
    }, 200);
  };

  const filteredCards = activeCategory === 'All' 
    ? cards 
    : cards.filter(c => c.category === activeCategory);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors h-full overflow-hidden">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={isStudying ? () => { setIsStudying(false); loadCards(); } : onBack}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white font-display tracking-tight">
              {isStudying ? 'Imtixaanka Kaararka' : 'Kaararka Darasada'}
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black font-mono">
              {isStudying ? 'Active Recall Mode' : 'Leitner Study Box'}
            </p>
          </div>
        </div>

        {!isStudying && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Kaar Cusub</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col justify-between max-w-2xl mx-auto w-full">
        
        {/* ADD CARD MODAL FORM */}
        {isAdding && !isStudying && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl mb-8 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 font-display tracking-tight">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                Ku dar Kaar Tababar
              </h2>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 font-mono">
                    Dhanka Hore: Erayga ama Su'aasha
                  </label>
                  <textarea
                    required
                    placeholder="Geli kelmada ama su'aasha aad rabto inaad xafiddo..."
                    value={frontText}
                    onChange={e => setFrontText(e.target.value)}
                    className="w-full text-sm font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:text-white transition-all resize-none shadow-sm placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 font-mono">
                    Dhanka Dambe: Micnaha ama Jawaabta
                  </label>
                  <textarea
                    required
                    placeholder="Geli micnaha, jawaabta ama qeexitaanka saxda ah..."
                    value={backText}
                    onChange={e => setBackText(e.target.value)}
                    className="w-full text-sm font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:text-white transition-all resize-none shadow-sm placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 font-mono">
                    Qaybta (Category)
                  </label>
                  <select
                    value={cardCategory}
                    onChange={e => setCardCategory(e.target.value)}
                    className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:text-white transition-all shadow-sm"
                  >
                    {PRESET_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 font-mono">
                    Ama Qayb Cusub
                  </label>
                  <input
                    type="text"
                    placeholder="Qor qayb kale..."
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:text-white transition-all shadow-sm placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 border border-red-100 dark:border-red-900/50">
                  <AlertCircle className="w-5 h-5" />
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-sm text-white bg-blue-600 hover:bg-blue-500 font-bold rounded-xl shadow-md hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Kaydi Kaarka
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STUDY MODE CONTAINER */}
        {isStudying ? (
          <div className="flex-1 flex flex-col justify-between py-2 sm:py-6">
            
            {/* Study Progress Header */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] font-black font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm">
                Kaarka {currentIndex + 1} / {studyCards.length}
              </span>
              <div className="flex items-center gap-3">
                {sessionStreak > 1 && (
                  <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-amber-200 dark:border-amber-900/50 shadow-sm">
                    <Flame className="w-4 h-4 fill-current animate-bounce" />
                    <span>{sessionStreak} guul</span>
                  </div>
                )}
                <span className="text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/50 shadow-sm">
                  Box {studyCards[currentIndex]?.box || 1}
                </span>
              </div>
            </div>

            {/* Leitner Box Status Dots bar */}
            <div className="w-full flex gap-1.5 mb-8">
              {studyCards.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    idx === currentIndex 
                      ? 'bg-blue-500 shadow-sm shadow-blue-500/20' 
                      : idx < currentIndex 
                        ? 'bg-emerald-500/80 dark:bg-emerald-600/60' 
                        : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* 3D Physical Card Flip Container */}
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex-1 min-h-[300px] md:min-h-[350px] relative cursor-pointer select-none group perspective-1000 mb-8"
            >
              <div className={`w-full h-full duration-500 preserve-3d absolute rounded-[2rem] border transition-all ${
                isFlipped 
                  ? 'rotate-y-180 border-blue-200/50 dark:border-blue-800/50 shadow-2xl' 
                  : 'border-slate-200/50 dark:border-slate-800/50 shadow-xl'
              } bg-white dark:bg-slate-900`}>
                
                {/* CARD FRONT */}
                <div className="absolute inset-0 backface-hidden p-8 flex flex-col justify-between rounded-[2rem]">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    <span>SU'AASHA / ERAYGA</span>
                    <span className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1 rounded-lg text-slate-500">
                      {studyCards[currentIndex]?.category}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-relaxed font-display tracking-tight max-h-48 overflow-y-auto scrollbar-thin">
                      {studyCards[currentIndex]?.front}
                    </h2>
                  </div>

                  <div className="text-center text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 py-3 rounded-xl">
                    Guji kaarka si aad u aragto jawaabta ↺
                  </div>
                </div>

                {/* CARD BACK */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 p-8 flex flex-col justify-between rounded-[2rem] bg-blue-50/30 dark:bg-slate-900/90 border border-blue-100/50 dark:border-blue-900/30">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    <span>JAWAABTA / MICNAHA</span>
                    <span className="bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-lg text-blue-600 dark:text-blue-400 font-bold">
                      Flipped
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <p className="text-lg md:text-xl text-slate-800 dark:text-slate-100 font-semibold whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin leading-relaxed">
                      {studyCards[currentIndex]?.back}
                    </p>
                  </div>

                  <div className="text-center text-xs font-bold text-slate-500 bg-white dark:bg-slate-800 py-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    Qiimee sida aad ugu xafidnayd kaarkan ↓
                  </div>
                </div>

              </div>
            </div>

            {/* Leitner Feedback Buttons (only active when flipped) */}
            <div className="space-y-4">
              {isFlipped ? (
                <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-bottom duration-150">
                  <button
                    onClick={() => handleGradeCard('hard')}
                    className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <X className="w-6 h-6 text-red-500" />
                    <span className="text-xs font-black tracking-tight">Aad u Adag</span>
                    <span className="text-[10px] font-bold opacity-70">Box 1 u celi</span>
                  </button>

                  <button
                    onClick={() => handleGradeCard('medium')}
                    className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <HelpCircle className="w-6 h-6 text-amber-500" />
                    <span className="text-xs font-black tracking-tight">Noolow</span>
                    <span className="text-[10px] font-bold opacity-70">Kuna celi Box</span>
                  </button>

                  <button
                    onClick={() => handleGradeCard('easy')}
                    className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Check className="w-6 h-6 text-emerald-500" />
                    <span className="text-xs font-black tracking-tight">Waan Aqaan</span>
                    <span className="text-[10px] font-bold opacity-70">Sare u qaad</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsFlipped(true)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-md hover:shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <RotateCcw className="w-5 h-5" />
                  Guji si aad u fujiso (Show Answer)
                </button>
              )}
              
              <button
                onClick={() => { setIsStudying(false); loadCards(); }}
                className="w-full py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                Ka Bax Tababarka
              </button>
            </div>

          </div>
        ) : (
          /* DECK / LIST MANAGEMENT VIEW */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Quick Stats Widget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-500 border border-blue-100/50 dark:border-blue-800/50">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-1">Dhammaan</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white font-display tracking-tight">{cards.length}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-500 border border-emerald-100/50 dark:border-emerald-800/50">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-1">Xafidan</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display tracking-tight">
                    {cards.filter(c => c.box >= 4).length}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3.5 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-500 border border-amber-100/50 dark:border-amber-800/50">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-1">Box 1-2</p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-display tracking-tight">
                    {cards.filter(c => c.box <= 2).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Category horizontal scroller */}
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6 shrink-0 no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      activeCategory === cat 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-500' 
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Launch Study Button */}
            {cards.length > 0 && (
              <button
                onClick={() => startStudySession(activeCategory)}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2.5 mb-8 active:scale-[0.98] transition-all duration-200 cursor-pointer hover:opacity-90"
              >
                <Sparkles className="w-5 h-5 text-amber-400 dark:text-amber-500 animate-pulse" />
                Ku cil-celi: Baro Qaybta ({activeCategory})
              </button>
            )}

            {/* Lists of Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-24 pr-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 font-mono pl-1">
                Qoraalka Kaararka ({filteredCards.length})
              </h3>
              
              {filteredCards.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-2">Wax kaarar ah kuma jiraan qaybtaan.</p>
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 font-black hover:underline tracking-widest uppercase cursor-pointer"
                  >
                    Hada ku dar
                  </button>
                </div>
              ) : (
                filteredCards.map(card => (
                  <div 
                    key={card.id}
                    className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-start justify-between gap-4 group hover:shadow-md hover:border-blue-500/30 transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 px-2.5 py-1 text-slate-500 rounded-lg font-mono">
                          {card.category}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border font-mono ${
                          card.box >= 4 
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' 
                            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50'
                        }`}>
                          Box {card.box}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate font-display tracking-tight mb-1">
                        {card.front}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                        {card.back}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteCard(card.id, e)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Tirtir kaarka"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>
      
      {/* 3D Flip style rules */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
