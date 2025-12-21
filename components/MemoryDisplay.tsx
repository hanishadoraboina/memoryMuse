
import React, { useState, useEffect, useRef } from 'react';
import { MemoryChapter } from '../types';
import { ArrowLeft, Share2, Heart, Volume2, VolumeX, RotateCcw, Play, Pause } from 'lucide-react';
import { decodeBase64, decodeAudioDataToBuffer } from '../services/geminiService';

interface MemoryDisplayProps {
  memory: MemoryChapter;
  onBack: () => void;
}

const MemoryDisplay: React.FC<MemoryDisplayProps> = ({ memory, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    if (memory.audioData) {
      initAudio();
    }
    return () => {
      stopAudio();
    };
  }, [memory]);

  const initAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioBytes = decodeBase64(memory.audioData!);
      const buffer = await decodeAudioDataToBuffer(audioBytes, audioContextRef.current!);
      audioBufferRef.current = buffer;
      
      // Auto-play the memory when loaded
      playAudio();
    } catch (e) {
      console.error("Audio initialization failed", e);
    }
  };

  const playAudio = () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    stopAudio();
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    
    source.start(0);
    sourceRef.current = source;
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {}
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const toggleAudio = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 fade-in">
      <div className="flex justify-between items-center mb-12">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-stone-400 hover:text-stone-700 transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm tracking-wide">Return to presence</span>
        </button>

        {memory.audioData && (
          <div className="flex items-center gap-4 bg-stone-100/50 px-4 py-2 rounded-full border border-stone-200/50">
             <button 
              onClick={toggleAudio}
              className={`p-2 rounded-full transition-all ${isPlaying ? 'bg-stone-800 text-stone-50' : 'text-stone-600 hover:bg-stone-200'}`}
              title={isPlaying ? "Silence" : "Listen"}
             >
               {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
             </button>
             <button 
              onClick={playAudio}
              className="p-2 text-stone-400 hover:text-stone-600 transition-all"
              title="Replay from start"
             >
               <RotateCcw size={16} />
             </button>
             {isPlaying && (
               <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium animate-pulse ml-1">
                 Speaking...
               </span>
             )}
          </div>
        )}
      </div>

      <div className="space-y-16">
        <header className="space-y-6">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl md:text-5xl serif font-light text-stone-800 leading-tight max-w-xl">
              {memory.chapterTitle}
            </h2>
            <div className="flex gap-4 text-stone-400">
               <button className="hover:text-stone-600 transition-colors"><Heart size={20} /></button>
               <button className="hover:text-stone-600 transition-colors"><Share2 size={20} /></button>
            </div>
          </div>
          <p className="text-stone-500 italic baskerville text-lg border-l-2 border-stone-200 pl-6 py-1">
            {memory.emotionalSummary}
          </p>
        </header>

        {memory.originalImage && (
          <div className="w-full aspect-[4/3] rounded-sm overflow-hidden bg-stone-100 shadow-inner">
            <img 
              src={`data:${memory.originalImage.split(';')[0].split(':')[1]};base64,${memory.originalImage}`} 
              className="w-full h-full object-cover opacity-90 sepia-[0.1]" 
              alt="Visual context"
            />
          </div>
        )}

        <section className="space-y-8">
          <div className="text-xl md:text-2xl leading-relaxed text-stone-700 baskerville whitespace-pre-wrap first-letter:text-4xl first-letter:serif first-letter:float-left first-letter:mr-3 first-letter:mt-1">
            {memory.narrative}
          </div>
        </section>

        <section className="pt-12 border-t border-stone-100">
          <h4 className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-6 font-medium">Emotional Progression</h4>
          <p className="text-stone-600 leading-relaxed text-lg italic italic">
            {memory.timeline}
          </p>
        </section>

        <footer className="flex flex-wrap gap-2 pt-8">
          {memory.tags.map(tag => (
            <span 
              key={tag} 
              className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-xs tracking-wider"
            >
              #{tag}
            </span>
          ))}
        </footer>
      </div>
    </div>
  );
};

export default MemoryDisplay;
