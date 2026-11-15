import React, { useRef, useState, useEffect } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { saveAsset } from '../../db/assets';
import { useEditorStore } from '../../store/editorStore';
import { Play, Pause, Volume2, Upload, Bookmark, Music, Mic } from 'lucide-react';

export interface AudioNarrationProps {
  audioSrc?: string;
  trackTitle?: string;
  narrator?: string;
  duration?: string;
  coverImage?: string;
  accent?: 'vermilion' | 'yellow' | 'teal' | 'violet';
  keepTogetherOnPageTurn?: boolean;
}

export const AudioNarrationBlock: UserComponent<AudioNarrationProps> = ({
  audioSrc = '',
  trackTitle = 'Author Reading: The Open Horizon',
  narrator = 'Narrated by Author & Studio',
  duration = '03:42',
  coverImage = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
  accent = 'vermilion',
  keepTogetherOnPageTurn = true,
}) => {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
    actions: { setProp },
  } = useNode((node) => ({
    selected: node.events.selected,
    hovered: node.events.hovered,
  }));

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(25); // percentage for preview
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current && audioSrc) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(!isPlaying));
      }
    } else {
      // Toggle preview simulation if no actual audio file is loaded yet
      setIsPlaying(!isPlaying);
    }
  };

  const getAccentBg = () => {
    switch (accent) {
      case 'yellow':
        return 'bg-neo-yellow text-neo-ink';
      case 'teal':
        return 'bg-neo-teal text-neo-ink';
      case 'violet':
        return 'bg-neo-violet text-white';
      case 'vermilion':
      default:
        return 'bg-neo-vermilion text-white';
    }
  };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative group my-4 p-4 bg-white border-neo border-neo-ink rounded-xl shadow-neo transition-all ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
      style={{
        pageBreakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
        breakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
      }}
    >
      {audioSrc && <audio ref={audioRef} src={audioSrc} onEnded={() => setIsPlaying(false)} />}

      {/* Badges */}
      <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none">
        {keepTogetherOnPageTurn && (
          <span className="flex items-center gap-0.5 text-[9px] font-mono bg-neo-teal text-neo-ink px-1.5 py-0.5 rounded shadow-neo-sm font-bold">
            <Bookmark className="w-2.5 h-2.5" />
            Keep on Page
          </span>
        )}
        <span className="flex items-center gap-1 text-[9px] font-mono bg-neo-ink text-white px-1.5 py-0.5 rounded shadow-neo-sm font-bold">
          <Volume2 className="w-2.5 h-2.5 text-neo-yellow" />
          Audio Narration
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Track Artwork / Avatar */}
        <div className="w-14 h-14 rounded-lg border-neo border-neo-ink overflow-hidden bg-neo-bg shrink-0 shadow-neo-sm relative">
          {coverImage ? (
            <img src={coverImage} alt="Album Art" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neo-yellow">
              <Mic className="w-6 h-6 text-neo-ink" strokeWidth={2} />
            </div>
          )}
        </div>

        {/* Track Meta */}
        <div className="flex-1 min-w-0 pr-16">
          <h4
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              setProp((p: AudioNarrationProps) => {
                p.trackTitle = e.currentTarget.textContent || '';
              });
            }}
            className="font-heading font-bold text-sm text-neo-ink truncate focus:outline-none"
          >
            {trackTitle}
          </h4>
          <p
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              setProp((p: AudioNarrationProps) => {
                p.narrator = e.currentTarget.textContent || '';
              });
            }}
            className="font-mono text-xs text-gray-500 truncate focus:outline-none"
          >
            {narrator}
          </p>
        </div>
      </div>

      {/* Player Controls & Waveform Bar */}
      <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-3">
        {/* Big Tactile Play Button */}
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full border-neo border-neo-ink flex items-center justify-center shadow-neo-sm hover:scale-105 active:scale-95 transition-all shrink-0 ${getAccentBg()}`}
          title={isPlaying ? 'Pause' : 'Play audio narration'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Animated Waveform Bars */}
        <div className="flex items-center gap-1 h-6 shrink-0">
          {[40, 70, 30, 90, 60, 80, 45, 95, 50, 75].map((h, i) => (
            <div
              key={i}
              className={`w-1 bg-neo-ink rounded-full transition-all duration-200 ${
                isPlaying ? 'animate-pulse' : 'opacity-40'
              }`}
              style={{
                height: isPlaying ? `${Math.max(20, (h * (progress + i * 5)) % 100)}%` : `${h * 0.4}%`,
              }}
            />
          ))}
        </div>

        {/* Progress Bar & Timestamp */}
        <div className="flex-1 flex items-center gap-2">
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickedPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
              setProgress(clickedPct);
            }}
            className="flex-1 h-2 bg-gray-200 border border-neo-ink rounded-full overflow-hidden cursor-pointer relative"
          >
            <div
              className="h-full bg-neo-ink rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-gray-600 font-bold shrink-0">
            {duration}
          </span>
        </div>
      </div>
    </div>
  );
};

export const AudioNarrationSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as AudioNarrationProps,
  }));

  const projectId = useEditorStore((state) => state.project.id);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    try {
      const blobUrl = await saveAsset(projectId, file);
      setProp((p: AudioNarrationProps) => {
        p.audioSrc = blobUrl;
      });
    } catch (err) {
      console.error('Failed to store audio file:', err);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const blobUrl = await saveAsset(projectId, file);
      setProp((p: AudioNarrationProps) => {
        p.coverImage = blobUrl;
      });
    } catch (err) {
      console.error('Failed to store audio cover image:', err);
    } finally {
      setIsUploadingCover(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      <div className="p-2.5 bg-neo-teal/15 border-neo border-neo-teal rounded-lg">
        <span className="font-heading font-bold text-neo-ink uppercase tracking-wider text-[11px] block mb-1">
          Dual-Target Behavior
        </span>
        <p className="text-[11px] text-gray-700 leading-normal">
          On the <strong>Web</strong>, this renders as a custom tactile Neo-Brutalist player with animated waveforms. In <strong>EPUB 3</strong>, it compiles to semantic HTML5 <code className="bg-white px-1 py-0.2 rounded border border-gray-300">&lt;audio controls&gt;</code> compatible with Apple Books &amp; Thorium read-along storytelling.
        </p>
      </div>

      <input
        type="file"
        ref={audioInputRef}
        onChange={handleAudioUpload}
        accept="audio/*"
        className="hidden"
      />
      <input
        type="file"
        ref={coverInputRef}
        onChange={handleCoverUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Audio File Source */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Audio Track (.mp3, .m4a, .ogg)
        </label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            disabled={isUploadingAudio}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-neo-yellow text-neo-ink font-mono font-bold border-neo border-neo-ink rounded shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>{isUploadingAudio ? 'Saving Audio Blob...' : 'Upload Local Audio'}</span>
          </button>
        </div>
        <input
          type="text"
          value={props.audioSrc || ''}
          onChange={(e) => setProp((p: AudioNarrationProps) => (p.audioSrc = e.target.value))}
          placeholder="Or paste audio URL..."
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none shadow-neo-sm"
        />
      </div>

      {/* Artwork */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Track Thumbnail / Avatar
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={isUploadingCover}
            className="px-3 py-1.5 bg-white text-neo-ink font-mono font-bold border-neo border-neo-ink rounded shadow-neo-sm hover:bg-neo-bg text-[10px]"
          >
            Upload
          </button>
          <input
            type="text"
            value={props.coverImage || ''}
            onChange={(e) => setProp((p: AudioNarrationProps) => (p.coverImage = e.target.value))}
            placeholder="Thumbnail URL..."
            className="flex-1 bg-white border-neo border-neo-ink px-2.5 py-1 rounded font-mono text-xs focus:outline-none shadow-neo-sm"
          />
        </div>
      </div>

      {/* Duration & Button Accent */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
            Duration Label
          </label>
          <input
            type="text"
            value={props.duration || '03:42'}
            onChange={(e) => setProp((p: AudioNarrationProps) => (p.duration = e.target.value))}
            className="w-full bg-white border-neo border-neo-ink px-2 py-1 rounded font-mono text-xs shadow-neo-sm"
          />
        </div>

        <div>
          <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
            Button Accent
          </label>
          <select
            value={props.accent || 'vermilion'}
            onChange={(e) => setProp((p: AudioNarrationProps) => (p.accent = e.target.value as any))}
            className="w-full bg-white border-neo border-neo-ink px-2 py-1 rounded font-mono text-xs shadow-neo-sm capitalize"
          >
            <option value="vermilion">Vermilion</option>
            <option value="yellow">Yellow</option>
            <option value="teal">Teal</option>
            <option value="violet">Violet</option>
          </select>
        </div>
      </div>

      {/* Keep on Page Break */}
      <label className="flex items-start gap-2.5 cursor-pointer border-neo border-neo-ink p-2.5 rounded bg-neo-bg/50">
        <input
          type="checkbox"
          checked={props.keepTogetherOnPageTurn ?? true}
          onChange={(e) => setProp((p: AudioNarrationProps) => (p.keepTogetherOnPageTurn = e.target.checked))}
          className="w-4 h-4 accent-neo-ink rounded mt-0.5"
        />
        <div className="flex flex-col">
          <span className="font-heading font-bold text-neo-ink flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5 text-neo-teal" />
            Keep on Same Page Turn
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5">
            Prevents audio player from breaking across pages in print or e-readers.
          </span>
        </div>
      </label>
    </div>
  );
};

AudioNarrationBlock.craft = {
  displayName: 'Audio Narration Player',
  props: {
    audioSrc: '',
    trackTitle: 'Author Reading: The Open Horizon',
    narrator: 'Narrated by Author & Studio',
    duration: '03:42',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    accent: 'vermilion',
    keepTogetherOnPageTurn: true,
  },
  related: {
    toolbar: AudioNarrationSettings,
  },
};
