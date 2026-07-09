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
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={isStudying ? () => { setIsStudying(false); loadCards(); } : onBack}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              {isStudying ? 'Imtixaanka Kaararka' : 'Kaararka Darasada'}
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
              {isStudying ? 'Active Recall Mode' : 'Leitner Study Box'}
            </p>
          </div>
        </div>

        {!isStudying && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Kaar Cusub</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col justify-between max-w-2xl mx-auto w-full">
        
        {/* ADD CARD MODAL FORM */}
        {isAdding && !isStudying && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-6 animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Ku dar Kaar Tababar cusub
              </h2>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Dhanka Hore: Erayga ama Su'aasha (Front side)
                </label>
                <textarea
                  required
                  placeholder="Geli kelmada ama su'aasha aad rabto inaad xafiddo..."
                  value={frontText}
                  onChange={e => setFrontText(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Dhanka Dambe: Micnaha ama Jawaabta (Back side)
                </label>
                <textarea
                  required
                  placeholder="Geli micnaha, jawaabta ama qeexitaanka saxda ah..."
                  value={backText}
                  onChange={e => setBackText(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Qaybta (Category)
                  </label>
                  <select
                    value={cardCategory}
                    onChange={e => setCardCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    {PRESET_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Ama Qayb Cusub
                  </label>
                  <input
                    type="text"
                    placeholder="Qor qayb kale..."
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorMsg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 font-bold rounded-lg"
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
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Kaarka {currentIndex + 1} ee {studyCards.length}
              </span>
              <div className="flex items-center gap-3">
                {sessionStreak > 1 && (
                  <div className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full text-xs font-bold">
                    <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />
                    <span>{sessionStreak} guul</span>
                  </div>
                )}
                <span className="text-xs font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md">
                  Box {studyCards[currentIndex]?.box || 1}
                </span>
              </div>
            </div>

            {/* Leitner Box Status Dots bar */}
            <div className="w-full flex gap-1.5 mb-6">
              {studyCards.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    idx === currentIndex 
                      ? 'bg-blue-500' 
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
              className="flex-1 min-h-[250px] md:min-h-[300px] relative cursor-pointer select-none group perspective-1000 mb-6"
            >
              <div className={`w-full h-full duration-500 preserve-3d absolute rounded-2xl border transition-all ${
                isFlipped 
                  ? 'rotate-y-180 border-blue-200 dark:border-blue-900/60 shadow-xl' 
                  : 'border-slate-200 dark:border-slate-800 shadow-lg'
              } bg-white dark:bg-slate-900`}>
                
                {/* CARD FRONT */}
                <div className="absolute inset-0 backface-hidden p-6 flex flex-col justify-between rounded-2xl">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>SU'AASHA / ERAYGA</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                      {studyCards[currentIndex]?.category}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-relaxed font-sans max-h-40 overflow-y-auto scrollbar-thin">
                      {studyCards[currentIndex]?.front}
                    </h2>
                  </div>

                  <div className="text-center text-xs text-slate-400 italic">
                    Guji kaarka si aad u aragto jawaabta ↺
                  </div>
                </div>

                {/* CARD BACK */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 p-6 flex flex-col justify-between rounded-2xl bg-blue-50/20 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>JAWAABTA / MICNAHA</span>
                    <span className="bg-blue-100 dark:bg-blue-950/30 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold">
                      Flipped
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <p className="text-base md:text-lg text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">
                      {studyCards[currentIndex]?.back}
                    </p>
                  </div>

                  <div className="text-center text-xs text-slate-400 italic">
                    Qiimee sida aad ugu xafidnayd kaarkan ↓
                  </div>
                </div>

              </div>
            </div>

            {/* Leitner Feedback Buttons (only active when flipped) */}
            <div className="space-y-3">
              {isFlipped ? (
                <div className="grid grid-cols-3 gap-2.5 animate-in slide-in-from-bottom duration-150">
                  <button
                    onClick={() => handleGradeCard('hard')}
                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/35 text-red-700 dark:text-red-400 transition-colors"
                  >
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-xs font-bold">Aad u Adag</span>
                    <span className="text-[9px] opacity-70">Box 1 u celi</span>
                  </button>

                  <button
                    onClick={() => handleGradeCard('medium')}
                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-amber-200 dark:border-amber-950 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/35 text-amber-700 dark:text-amber-400 transition-colors"
                  >
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-bold">Noolow</span>
                    <span className="text-[9px] opacity-70">Kuna celi Box</span>
                  </button>

                  <button
                    onClick={() => handleGradeCard('easy')}
                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35 text-emerald-700 dark:text-emerald-400 transition-colors"
                  >
                    <Check className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-bold">Waan Aqaan</span>
                    <span className="text-[9px] opacity-70">Sare u qaad</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsFlipped(true)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Guji si aad u fujiso (Show Answer)
                </button>
              )}
              
              <button
                onClick={() => { setIsStudying(false); loadCards(); }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold text-center transition-colors"
              >
                Ka Bax Tababarka
              </button>
            </div>

          </div>
        ) : (
          /* DECK / LIST MANAGEMENT VIEW */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Quick Stats Widget */}
            <div className="grid grid-cols-3 gap-3 mb-6 shrink-0">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
                <Layers className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dhammaan</p>
                  <p className="text-sm font-black dark:text-white">{cards.length}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xafidan</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {cards.filter(c => c.box >= 4).length}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
                <Award className="w-5 h-5 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Box 1-2</p>
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {cards.filter(c => c.box <= 2).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Category horizontal scroller */}
            {categories.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 shrink-0 no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap font-semibold transition-colors ${
                      activeCategory === cat 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
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
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 mb-6 active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                Ku cil-celi: Baro Qaybta ({activeCategory})
              </button>
            )}

            {/* Lists of Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[350px] sm:max-h-none">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Qoraalka Kaararka ({filteredCards.length})
              </h3>
              
              {filteredCards.length === 0 ? (
                <div className="text-center p-8 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Wax kaarar ah kuma jiraan qaybtaan.</p>
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    Hada ku dar kii ugu horeeyay!
                  </button>
                </div>
              ) : (
                filteredCards.map(card => (
                  <div 
                    key={card.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-4 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-slate-500 rounded">
                          {card.category}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          card.box >= 4 
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          Box {card.box}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {card.front}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {card.back}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteCard(card.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
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
