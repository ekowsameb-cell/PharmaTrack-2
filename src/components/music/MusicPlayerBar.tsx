import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Music, 
  Sparkles, 
  ChevronRight, 
  ListMusic, 
  Radio, 
  Headphones, 
  Sliders,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { musicEngine, MusicTrack, DEFAULT_PRESET_TRACKS } from '../../services/musicService';

interface MusicPlayerBarProps {
  onOpenGenerator: () => void;
}

export const MusicPlayerBar: React.FC<MusicPlayerBarProps> = ({ onOpenGenerator }) => {
  const [engineState, setEngineState] = useState(musicEngine.getState());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prevVolume, setPrevVolume] = useState<number>(0.6);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Subscribe to audio engine updates
  useEffect(() => {
    const unsub = musicEngine.subscribe(() => {
      setEngineState(musicEngine.getState());
    });
    return () => unsub();
  }, []);

  // Visualizer render loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const data = musicEngine.getFrequencyData();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = 3;
      const gap = 2;
      const count = Math.min(16, data.length);
      const startX = (canvas.width - (count * (barWidth + gap))) / 2;

      for (let i = 0; i < count; i++) {
        const val = engineState.isPlaying ? data[i] || Math.floor(Math.random() * 30 + 10) : 4;
        const barHeight = Math.max(3, (val / 255) * canvas.height * 0.9);
        const x = startX + i * (barWidth + gap);
        const y = canvas.height - barHeight;

        // Gradient coloring based on genre
        const grad = ctx.createLinearGradient(0, y, 0, canvas.height);
        grad.addColorStop(0, '#34d399');
        grad.addColorStop(1, '#059669');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [engineState.isPlaying]);

  const handleTogglePlay = () => {
    musicEngine.togglePlay();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    musicEngine.setVolume(val);
    if (val > 0 && isMuted) setIsMuted(false);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      musicEngine.setVolume(prevVolume || 0.6);
      setIsMuted(false);
    } else {
      setPrevVolume(engineState.volume);
      musicEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleSelectTrack = (track: MusicTrack) => {
    musicEngine.playTrack(track);
    setIsPlaylistOpen(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Floating Work Music Player */}
      <div 
        id="pharmacy-work-music-player"
        className={`fixed bottom-3 right-3 z-50 transition-all duration-300 ${
          isMinimized 
            ? 'w-auto' 
            : 'w-[95vw] sm:w-[460px] md:w-[500px]'
        }`}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-800/50 shadow-2xl shadow-emerald-950/60 rounded-2xl p-3 text-slate-100 overflow-hidden relative">
          
          {/* Glowing Ambient Backdrop */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          {isMinimized ? (
            /* Minimized Pill View */
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePlay}
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all shadow-md ${
                  engineState.isPlaying
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={engineState.isPlaying ? 'Pause Ambient Music' : 'Play Ambient Music'}
              >
                {engineState.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => setIsMinimized(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-xs font-semibold border border-slate-700/60"
              >
                <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[120px]">{engineState.currentTrack.title}</span>
                <Maximize2 className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          ) : (
            /* Expanded Full Player View */
            <div className="flex flex-col gap-2.5">
              {/* Header / Track Info */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    engineState.isPlaying 
                      ? 'bg-emerald-950 border-emerald-600/60 text-emerald-400 shadow-inner'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {engineState.currentTrack.title}
                      </span>
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[9px] font-mono px-1.5 py-0.2 rounded-full shrink-0">
                        {engineState.currentTrack.genre}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <span className="text-emerald-400 font-semibold">{engineState.currentTrack.mood}</span>
                      <span>•</span>
                      <span>{engineState.currentTrack.bpm} BPM</span>
                      <span>•</span>
                      <span className="font-mono text-[9px] text-slate-400">{engineState.currentTrack.model}</span>
                    </p>
                  </div>
                </div>

                {/* Actions & Minimize */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      isPlaylistOpen 
                        ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title="Focus Music Station Library"
                  >
                    <ListMusic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onOpenGenerator}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-900/70 to-indigo-900/70 hover:from-purple-800 hover:to-indigo-800 border border-purple-600/50 text-purple-200 text-[11px] font-bold shadow-sm transition-all"
                    title="Generate Custom Lyria Music with Gemini AI"
                  >
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    <span>Lyria AI</span>
                  </button>
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                    title="Minimize player"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress & Visualizer Row */}
              <div className="flex items-center gap-3 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/90">
                {/* Visualizer Canvas */}
                <canvas 
                  ref={canvasRef} 
                  width={80} 
                  height={18} 
                  className="rounded shrink-0" 
                />

                {/* Time slider */}
                <div className="flex-1 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span>{formatTime(engineState.currentTime)}</span>
                  <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${(engineState.currentTime / (engineState.duration || 30)) * 100}%` }}
                    />
                  </div>
                  <span>{formatTime(engineState.duration || 30)}</span>
                </div>
              </div>

              {/* Controls & Volume */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePlay}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                      engineState.isPlaying
                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/25 hover:bg-emerald-400'
                        : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {engineState.isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Focus</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        <span>Play Ambient</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Radio className={`w-3 h-3 ${engineState.isPlaying ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
                    {engineState.isPlaying ? 'Focus Audio Active' : 'Idle'}
                  </span>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleToggleMute}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {isMuted || engineState.volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : engineState.volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-20 accent-emerald-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-mono w-7 text-right">
                    {Math.round((isMuted ? 0 : engineState.volume) * 100)}%
                  </span>
                </div>
              </div>

              {/* Preset Track Drawer / Selector */}
              {isPlaylistOpen && (
                <div className="mt-1 border-t border-slate-800 pt-2 flex flex-col gap-1 max-h-48 overflow-y-auto scrollbar-thin">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between px-1">
                    <span>Preset Work Stations:</span>
                    <span className="text-emerald-400">Zero-Fatigue Audio</span>
                  </div>
                  {DEFAULT_PRESET_TRACKS.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => handleSelectTrack(track)}
                      className={`flex items-center justify-between gap-2 p-2 rounded-xl text-left text-xs transition-all border ${
                        engineState.currentTrack.id === track.id
                          ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{track.title}</span>
                          <span className="text-[9px] text-slate-400">({track.bpm} BPM)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{track.description}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 font-mono">
                        {track.genre}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
