
import React, { useState, useCallback, useEffect } from 'react';
import { AppStatus, MemoryInput, MemoryChapter } from './types';
import { synthesizeMemory, parseMemoryResponse, generateMemorySpeech } from './services/geminiService';
// Added Volume2 to the import list to fix the compilation error on line 258
import { 
  Plus, 
  History, 
  Mic, 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  X,
  Wind,
  Volume2
} from 'lucide-react';
import MemoryDisplay from './components/MemoryDisplay';

const MODES = ['Default', 'Poetic', 'Honest', 'Cinematic', 'Minimal'] as const;

export default function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [history, setHistory] = useState<MemoryChapter[]>([]);
  const [currentMemory, setCurrentMemory] = useState<MemoryChapter | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Input states
  const [text, setText] = useState('');
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<MemoryInput['mode']>('Default');

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('memory_muse_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('memory_muse_history', JSON.stringify(history));
  }, [history]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        setBase64Image(base64);
        setImageType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSynthesize = async () => {
    if (!text.trim()) return;

    setStatus(AppStatus.PROCESSING);
    try {
      // 1. Synthesize Text
      const rawResponse = await synthesizeMemory({
        text,
        image: base64Image || undefined,
        imageType: imageType || undefined,
        mode: selectedMode
      });

      const parsed = parseMemoryResponse(rawResponse);
      
      // 2. Synthesize Voice
      setStatus(AppStatus.SYNTHESIZING_VOICE);
      let audioData: string | undefined;
      try {
        audioData = await generateMemorySpeech(parsed.narrative);
      } catch (audioError) {
        console.warn("Audio synthesis failed, proceeding with text only", audioError);
      }

      const newMemory: MemoryChapter = {
        id: crypto.randomUUID(),
        ...parsed,
        createdAt: Date.now(),
        originalImage: base64Image || undefined,
        audioData
      };

      setHistory(prev => [newMemory, ...prev]);
      setCurrentMemory(newMemory);
      setStatus(AppStatus.RESULT);
      
      // Clear inputs
      setText('');
      setBase64Image(null);
      setImageType(null);
    } catch (error) {
      console.error("Synthesis failed", error);
      setStatus(AppStatus.ERROR);
    }
  };

  const deleteMemory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(m => m.id !== id));
  };

  const renderIdle = () => (
    <div className="max-w-2xl mx-auto pt-24 pb-32 px-6">
      <div className="text-center mb-16 space-y-4">
        <div className="inline-block p-4 rounded-full bg-stone-100 mb-4">
          <Wind className="text-stone-400" size={32} />
        </div>
        <h1 className="text-4xl md:text-5xl serif font-light text-stone-800">How did it feel?</h1>
        <p className="text-stone-400 font-light text-lg">A whisper of voice, a fragment of sight, or just the weight of words.</p>
      </div>

      <div className="space-y-8 fade-in">
        <div className="relative group">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Recall the quiet details..."
            className="w-full h-48 p-8 bg-white rounded-2xl border border-stone-100 shadow-sm focus:ring-1 focus:ring-stone-200 focus:border-stone-200 outline-none transition-all resize-none baskerville text-xl text-stone-700 placeholder:text-stone-300"
          />
          <div className="absolute bottom-6 right-6 flex gap-2">
            <button className="p-2 text-stone-300 hover:text-stone-500 transition-colors tooltip" title="Voice Journal (Simulation)">
              <Mic size={20} />
            </button>
            <label className="p-2 text-stone-300 hover:text-stone-500 transition-colors cursor-pointer tooltip" title="Add Visual Context">
              <ImageIcon size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>

        {base64Image && (
          <div className="relative inline-block group">
            <img 
              src={`data:${imageType};base64,${base64Image}`} 
              className="h-24 w-24 object-cover rounded-xl shadow-md brightness-90 group-hover:brightness-75 transition-all" 
              alt="Attached"
            />
            <button 
              onClick={() => setBase64Image(null)}
              className="absolute -top-2 -right-2 bg-stone-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex gap-1 bg-stone-100/50 p-1 rounded-full border border-stone-100">
            {MODES.map(mode => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`px-4 py-1.5 rounded-full text-xs tracking-wider transition-all ${
                  selectedMode === mode 
                    ? 'bg-white text-stone-800 shadow-sm font-medium' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={handleSynthesize}
            disabled={!text.trim() || status === AppStatus.PROCESSING || status === AppStatus.SYNTHESIZING_VOICE}
            className={`flex items-center gap-3 px-8 py-4 rounded-full transition-all group ${
              text.trim() 
                ? 'bg-stone-800 text-stone-50 hover:bg-stone-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5' 
                : 'bg-stone-100 text-stone-300 cursor-not-allowed'
            }`}
          >
            <span className="text-sm font-medium tracking-widest uppercase">Synthesize</span>
            <Sparkles size={18} className={text.trim() ? "group-hover:rotate-12 transition-transform" : ""} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderProcessing = (isVoice: boolean) => (
    <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <div className="relative w-24 h-24 mb-12">
        <div className="absolute inset-0 border-2 border-stone-100 rounded-full"></div>
        <div className="absolute inset-0 border-t-2 border-stone-400 rounded-full animate-spin"></div>
      </div>
      <div className="space-y-4 animate-pulse">
        <h2 className="text-2xl serif text-stone-600">
          {isVoice ? "Preparing the memory's voice..." : "Holding space for your memory..."}
        </h2>
        <p className="text-stone-400 font-light max-w-sm">
          {isVoice ? "Allowing the narrative to find its breath." : "We are listening to the silence between the words."}
        </p>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="max-w-3xl mx-auto py-16 px-6 fade-in">
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl serif text-stone-800">Chapters</h2>
        <button 
          onClick={() => setShowHistory(false)}
          className="text-stone-400 hover:text-stone-700 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-stone-400 italic">No memories captured yet. The world is waiting.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {history.map(memory => (
            <div 
              key={memory.id}
              onClick={() => {
                setCurrentMemory(memory);
                setShowHistory(false);
                setStatus(AppStatus.RESULT);
              }}
              className="group p-8 bg-white rounded-2xl border border-stone-100 hover:border-stone-200 hover:shadow-sm transition-all cursor-pointer relative"
            >
              <button 
                onClick={(e) => deleteMemory(memory.id, e)}
                className="absolute top-4 right-4 text-stone-200 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={16} />
              </button>
              <div className="flex gap-6 items-start">
                <div className="relative">
                  {memory.originalImage ? (
                    <img 
                      src={`data:image/jpeg;base64,${memory.originalImage}`} 
                      className="w-16 h-16 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all shadow-sm"
                      alt=""
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-stone-50 flex items-center justify-center text-stone-200 border border-stone-100">
                      <Wind size={24} />
                    </div>
                  )}
                  {memory.audioData && (
                    <div className="absolute -bottom-1 -right-1 bg-stone-800 text-stone-50 p-1 rounded-full shadow-sm">
                      {/* Fixed line 258 by using the now imported Volume2 component from lucide-react */}
                      <Volume2 size={10} />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl serif text-stone-800 group-hover:text-stone-600 transition-colors">{memory.chapterTitle}</h3>
                  <p className="text-stone-500 line-clamp-1 italic text-sm font-light">{memory.emotionalSummary}</p>
                  <div className="flex gap-2 pt-2">
                    {memory.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] uppercase tracking-widest text-stone-300">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen selection:bg-stone-200">
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 md:px-12 md:py-8 flex justify-between items-center bg-[#fcfbf7]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
          setStatus(AppStatus.IDLE);
          setCurrentMemory(null);
          setShowHistory(false);
        }}>
          <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-50">
             <Wind size={16} />
          </div>
          <span className="text-xl serif tracking-tighter text-stone-800">MemoryMuse</span>
        </div>
        
        <div className="flex gap-6 items-center">
          {!showHistory && history.length > 0 && (
            <button 
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors"
            >
              <History size={20} />
              <span className="hidden md:inline text-xs uppercase tracking-widest font-medium">History</span>
            </button>
          )}
          
          {(status === AppStatus.RESULT || showHistory) && (
             <button 
              onClick={() => {
                setStatus(AppStatus.IDLE);
                setCurrentMemory(null);
                setShowHistory(false);
              }}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors bg-white px-4 py-2 rounded-full border border-stone-100 shadow-sm"
            >
              <Plus size={18} />
              <span className="hidden md:inline text-xs uppercase tracking-widest font-medium">New Memory</span>
            </button>
          )}
        </div>
      </nav>

      <main className="pt-20">
        {showHistory ? renderHistory() : (
          <>
            {status === AppStatus.IDLE && renderIdle()}
            {status === AppStatus.PROCESSING && renderProcessing(false)}
            {status === AppStatus.SYNTHESIZING_VOICE && renderProcessing(true)}
            {status === AppStatus.RESULT && currentMemory && (
              <MemoryDisplay 
                memory={currentMemory} 
                onBack={() => setStatus(AppStatus.IDLE)} 
              />
            )}
            {status === AppStatus.ERROR && (
              <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6 space-y-6">
                <div className="w-16 h-16 rounded-full bg-red-50 text-red-300 flex items-center justify-center">
                  <X size={32} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl serif text-stone-800">The memory drift away...</h2>
                  <p className="text-stone-400">Something interrupted the synthesis. Shall we try again?</p>
                </div>
                <button 
                  onClick={() => setStatus(AppStatus.IDLE)}
                  className="px-8 py-3 bg-stone-800 text-stone-50 rounded-full text-sm tracking-widest uppercase"
                >
                  Return
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {status === AppStatus.IDLE && (
        <footer className="fixed bottom-0 left-0 w-full p-8 text-center pointer-events-none">
          <p className="text-stone-300 text-[10px] uppercase tracking-[0.3em] font-light">Presence • Reflection • Truth</p>
        </footer>
      )}
    </div>
  );
}
