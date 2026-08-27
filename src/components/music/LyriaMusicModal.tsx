import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Music, 
  Play, 
  Loader2, 
  Volume2, 
  Wand2, 
  Sliders, 
  CheckCircle, 
  Radio,
  Clock,
  Flame,
  Coffee,
  HeartPulse
} from 'lucide-react';
import { generateLyriaMusic, musicEngine, MusicTrack } from '../../services/musicService';

interface LyriaMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INSPIRATION_PROMPTS = [
  {
    title: 'Peaceful Ghanaian Rain & Kalimba',
    genre: 'Afro-Lofi Focus',
    tempo: 'medium',
    prompt: 'Soothing Ghanaian warm afternoon rain, mellow acoustic kalimba plucks, gentle vinyl texture, relaxing pharmacy workspace'
  },
  {
    title: 'Deep Clinical Interaction Analysis',
    genre: 'Ambient Neo-Classical',
    tempo: 'slow',
    prompt: 'Minimalist warm acoustic grand piano notes with soft analog synthesizer pads, deep concentration, zero fatigue'
  },
  {
    title: 'Fast Counter POS Dispatch Flow',
    genre: 'Highlife Chill Beats',
    tempo: 'fast',
    prompt: 'Upbeat Ghanaian Highlife guitar groove with soft wooden percussion, positive sunny vibes for fast retail checkout queues'
  },
  {
    title: 'Night Shift Synthwave Drone',
    genre: 'Chillwave',
    tempo: 'slow',
    prompt: 'Nocturnal analog synthesizer arpeggios, tape delay warmth, calming sub-bass pulse for 24-hour night shift dispensing'
  }
];

export const LyriaMusicModal: React.FC<LyriaMusicModalProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState<string>('Relaxing ambient pharmacy focus music with warm electric piano chords, soft lofi beats, and calming vinyl texture');
  const [genre, setGenre] = useState<string>('Lofi Hip Hop');
  const [modelType, setModelType] = useState<'clip' | 'pro'>('clip');
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [tempo, setTempo] = useState<string>('medium');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedTrack, setGeneratedTrack] = useState<MusicTrack | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setStatusMessage(`Synthesizing track with Google ${modelType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}...`);

    try {
      const track = await generateLyriaMusic({
        prompt,
        genre,
        durationSeconds,
        tempo,
        modelType
      });

      setGeneratedTrack(track);
      setStatusMessage('Music track generated successfully!');
    } catch (err: any) {
      console.error('Lyria generation failed:', err);
      setStatusMessage('Error during generation. Fallback audio created.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayNow = (track: MusicTrack) => {
    musicEngine.playTrack(track);
    onClose();
  };

  const handleApplyPreset = (item: typeof INSPIRATION_PROMPTS[0]) => {
    setPrompt(item.prompt);
    setGenre(item.genre);
    setTempo(item.tempo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-purple-600/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-purple-950/50 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border-b border-purple-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Lyria AI Focus Music Generator</h3>
                <span className="bg-purple-900/80 text-purple-200 border border-purple-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {modelType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Generate ambient, zero-fatigue background audio for pharmacy workflows.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
          
          {/* Model Selector Pill Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Google Lyria AI Model
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModelType('clip')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  modelType === 'clip'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-100 shadow-md shadow-purple-950/40'
                    : 'bg-slate-800/50 border-slate-700/70 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-200">Lyria 3 Clip Preview</span>
                  <span className="text-[10px] font-mono bg-purple-900/60 px-1.5 py-0.5 rounded text-purple-300">
                    ≤30s Clip
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Optimized for quick loopable work music clips and ambient beds.</p>
              </button>

              <button
                type="button"
                onClick={() => setModelType('pro')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  modelType === 'pro'
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-100 shadow-md shadow-indigo-950/40'
                    : 'bg-slate-800/50 border-slate-700/70 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-200">Lyria 3 Pro Preview</span>
                  <span className="text-[10px] font-mono bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-300">
                    Full Track
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Advanced multi-layer harmonic progression for extended focus sessions.</p>
              </button>
            </div>
          </div>

          {/* Quick Prompt Ideas */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Inspiration Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INSPIRATION_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(item)}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/40 hover:bg-purple-950/40 border border-slate-700/60 hover:border-purple-600/40 text-left transition-all"
                >
                  <div className="w-6 h-6 rounded-lg bg-purple-900/40 flex items-center justify-center shrink-0 text-purple-300 mt-0.5">
                    <Music className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{item.title}</span>
                    <span className="text-[10px] text-slate-400 block">{item.genre}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Music Prompt & Mood Description
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="e.g. Ambient lofi hip hop with electric piano chords and soft rain sounds..."
            />
          </div>

          {/* Genre & Tempo Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Genre / Style</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Lofi Hip Hop">Lofi Hip Hop</option>
                <option value="Afro-Lofi Highlife">Afro-Lofi Highlife</option>
                <option value="Ambient Neo-Classical">Ambient Neo-Classical</option>
                <option value="Chillwave Synth">Chillwave Synth</option>
                <option value="Binaural 432Hz">Binaural Alpha (432Hz)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tempo / Pace</label>
              <select
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="slow">Slow & Meditative (60-70 BPM)</option>
                <option value="medium">Medium & Balanced (75-85 BPM)</option>
                <option value="fast">Upbeat & Energetic (95-110 BPM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Clip Duration</label>
              <select
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value={15}>15 Seconds Loop</option>
                <option value={30}>30 Seconds Standard</option>
                <option value={45}>45 Seconds Extended</option>
                <option value={60}>60 Seconds Full</option>
              </select>
            </div>
          </div>

          {/* Generated Result Card if available */}
          {generatedTrack && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/50 shadow-inner flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-200">{generatedTrack.title}</div>
                  <p className="text-xs text-emerald-400/80">{generatedTrack.genre} • {generatedTrack.durationSeconds}s • {generatedTrack.model}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePlayNow(generatedTrack)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 transition-all shrink-0"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {statusMessage ? (
              <span className="text-purple-300 font-medium">{statusMessage}</span>
            ) : (
              <span>Generates real-time background audio with Lyria AI.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isGenerating || !prompt.trim()}
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 disabled:opacity-50 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Music...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Track</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
