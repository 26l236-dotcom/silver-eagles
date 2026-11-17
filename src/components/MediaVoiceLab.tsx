import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Check,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Square,
  Upload,
  Video,
} from 'lucide-react';

type StudioTab = 'image' | 'video' | 'live' | 'transcribe';

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
      resolve({ base64, mimeType: file.type || 'image/png', previewUrl: result });
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function pcmToBase64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64PcmToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 0x8000;
  }
  return float32;
}

export function MediaVoiceLab() {
  const [activeTab, setActiveTab] = useState<StudioTab>('image');

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Studio Header & Sub-Navigation */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
            Multimodal Classroom Creation & Voice Suite
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1">
            AI Media, Video & Voice Lab
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Create educational diagrams, animate concept videos, talk live with the Gemini voice tutor, and transcribe classroom audio.
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-1 p-1 rounded-xl shrink-0"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          {(
            [
              { id: 'image', label: 'Create & Edit Images', icon: ImageIcon },
              { id: 'video', label: 'Text & Image to Video', icon: Film },
              { id: 'live', label: 'Live Voice Tutor', icon: Radio },
              { id: 'transcribe', label: 'Transcribe Audio', icon: Mic },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === 'image' && <ImageStudioPanel />}
      {activeTab === 'video' && <VideoStudioPanel />}
      {activeTab === 'live' && <LiveVoicePanel />}
      {activeTab === 'transcribe' && <TranscribePanel />}
    </div>
  );
}

/* ============================================================================
   1. Create & Edit Images (gemini-nano-banana-2.1)
   ============================================================================ */
function ImageStudioPanel() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageSize, setImageSize] = useState('1K');
  const [useSearch, setUseSearch] = useState(false);
  const [sourceImage, setSourceImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await fileToBase64(file);
    setSourceImage(data);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Enter a prompt to create or edit an educational image.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          imageSize,
          useSearch,
          sourceImageBase64: sourceImage?.base64,
          sourceMimeType: sourceImage?.mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Image generation failed.');
      } else {
        setOutputUrl(data.imageUrl);
        setCaption(data.caption || '');
      }
    } catch {
      setError('Network error calling image generation endpoint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div
        className="lg:col-span-5 rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
      >
        <div>
          <h2 className="font-display text-xl font-bold">Image Studio · gemini-nano-banana-2.1</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Generate high-resolution STEM illustrations or upload an existing photo/diagram to edit via prompt.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5">Prompt</label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Clean cross-section diagram of a leaf chloroplast showing light reactions and Calvin cycle"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}
            >
              <option value="16:9">16:9 Landscape</option>
              <option value="1:1">1:1 Square</option>
              <option value="4:3">4:3 Standard</option>
              <option value="3:4">3:4 Poster</option>
              <option value="9:16">9:16 Vertical</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Resolution</label>
            <select
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}
            >
              <option value="1K">1K Standard</option>
              <option value="2K">2K High-Res</option>
              <option value="4K">4K Ultra</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-semibold">Optional Source Image (For Editing)</span>
          <label
            className="flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer text-xs font-semibold"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px dashed var(--border-hairline)' }}
          >
            <Upload className="w-4 h-4" />
            <span>{sourceImage ? 'Change Uploaded Image' : 'Upload Photo or Diagram to Edit'}</span>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
          {sourceImage && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-emerald-400">Source image attached</span>
              <button type="button" onClick={() => setSourceImage(null)} className="underline">
                Clear
              </button>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={useSearch}
            onChange={(e) => setUseSearch(e.target.checked)}
            className="w-4 h-4 accent-[var(--accent-primary)]"
          />
          <span>Ground with Google Web & Image Search</span>
        </label>

        {error && (
          <p className="text-xs text-red-400 font-medium" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleGenerate()}
          className="w-full py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-on-primary)' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          {sourceImage ? 'Edit Image' : 'Generate Image'}
        </button>
      </div>

      <div
        className="lg:col-span-7 rounded-2xl p-6 min-h-[420px] flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
      >
        {outputUrl ? (
          <div className="w-full space-y-4">
            <img
              src={outputUrl}
              alt="Generated classroom visual"
              referrerPolicy="no-referrer"
              className="w-full max-h-[520px] object-contain rounded-xl bg-black/20"
            />
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {caption || 'Generated with gemini-nano-banana-2.1'}
              </p>
              <a
                href={outputUrl}
                download="smartfun360-visual.png"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center max-w-sm space-y-2">
            <ImageIcon className="w-10 h-10 mx-auto opacity-60" style={{ color: 'var(--accent-primary)' }} />
            <p className="font-display text-lg font-bold">Visual Output Canvas</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Enter a prompt on the left to generate a diagram, poster, or edited photograph.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   2. Text-to-Video & Image-to-Video (gemini-omni-1.2-flash Interactions API)
   ============================================================================ */
function VideoStudioPanel() {
  const [mode, setMode] = useState<'text' | 'animate'>('text');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState('6s');
  const [imageInput, setImageInput] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await fileToBase64(file);
    setImageInput(data);
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      setError('Please describe the video scene or animation motion.');
      return;
    }
    if (mode === 'animate' && !imageInput) {
      setError('Please upload a starting image to animate.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          duration,
          imageBase64: mode === 'animate' ? imageInput?.base64 : undefined,
          imageMimeType: mode === 'animate' ? imageInput?.mimeType : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Video generation failed.');
      } else {
        setVideoUrl(data.videoUrl);
      }
    } catch {
      setError('Network error calling Interactions video endpoint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div
        className="lg:col-span-5 rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
      >
        <div>
          <h2 className="font-display text-xl font-bold">Video Studio · gemini-omni-1.2-flash</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Powered by the Gemini Interactions API for text-to-video and image-to-video animation.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <button
            type="button"
            onClick={() => setMode('text')}
            className="py-2 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: mode === 'text' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'text' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            Text to Video
          </button>
          <button
            type="button"
            onClick={() => setMode('animate')}
            className="py-2 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: mode === 'animate' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'animate' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            Animate Photo
          </button>
        </div>

        {mode === 'animate' && (
          <div>
            <label
              className="flex items-center justify-center gap-2 p-3.5 rounded-xl cursor-pointer text-xs font-semibold"
              style={{ backgroundColor: 'var(--bg-canvas)', border: '1px dashed var(--border-hairline)' }}
            >
              <Upload className="w-4 h-4" />
              <span>{imageInput ? 'Replace Starting Photo' : 'Upload Starting Photo'}</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
            {imageInput && (
              <img
                src={imageInput.previewUrl}
                alt="Starting frame preview"
                className="mt-2 h-24 rounded-lg object-cover"
              />
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1.5">
            {mode === 'animate' ? 'Animation Motion Prompt' : 'Scene Prompt'}
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 'animate'
                ? 'e.g., Smoothly zoom into the solar panel cells as sunlight glints across the glass'
                : 'e.g., Time-lapse of a wind turbine spinning above green hills at sunrise, educational science style'
            }
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16')}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}
            >
              <option value="16:9">16:9 Landscape</option>
              <option value="9:16">9:16 Portrait</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}
            >
              <option value="5s">5 seconds</option>
              <option value="6s">6 seconds</option>
              <option value="10s">10 seconds</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 font-medium" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleGenerateVideo()}
          className="w-full py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-on-primary)' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
          {loading ? 'Rendering Video via Interactions API...' : mode === 'animate' ? 'Animate Image to Video' : 'Generate Video'}
        </button>
      </div>

      <div
        className="lg:col-span-7 rounded-2xl p-6 min-h-[420px] flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
      >
        {videoUrl ? (
          <div className="w-full space-y-4">
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              className="w-full max-h-[500px] rounded-xl bg-black"
            />
            <div className="flex justify-end">
              <a
                href={videoUrl}
                download="smartfun360-video.mp4"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <Download className="w-3.5 h-3.5" />
                Download MP4
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center max-w-sm space-y-2">
            <Film className="w-10 h-10 mx-auto opacity-60" style={{ color: 'var(--accent-primary)' }} />
            <p className="font-display text-lg font-bold">Video Playback Stage</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Choose 16:9 landscape or 9:16 portrait and launch an Interactions API video render.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   3. Real-Time Voice Conversations (gemini-3.8-live via WebSocket /live)
   ============================================================================ */
function LiveVoicePanel() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusText, setStatusText] = useState('Disconnected · Click Start Voice Session to talk live');
  const [transcripts, setTranscripts] = useState<Array<{ speaker: 'You' | 'Tutor'; text: string }>>([]);
  const [error, setError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const stopSession = () => {
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        // ignore
      }
    });
    activeSourcesRef.current = [];
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void inputCtxRef.current?.close();
    void outputCtxRef.current?.close();
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setConnecting(false);
    setStatusText('Session ended');
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    setError('');
    setConnecting(true);
    setStatusText('Connecting to gemini-3.8-live...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/live`);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as {
          ready?: boolean;
          audio?: string;
          inputTranscript?: string;
          outputTranscript?: string;
          interrupted?: boolean;
          error?: string;
        };

        if (msg.error) {
          setError(msg.error);
          stopSession();
          return;
        }

        if (msg.ready) {
          setConnected(true);
          setConnecting(false);
          setStatusText('Live · Speak naturally into your microphone');

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const channel = e.inputBuffer.getChannelData(0);
            ws.send(JSON.stringify({ audio: pcmToBase64(channel) }));
          };

          source.connect(processor);
          processor.connect(inputCtx.destination);
        }

        if (msg.interrupted) {
          activeSourcesRef.current.forEach((s) => {
            try {
              s.stop();
            } catch {
              // ignore
            }
          });
          activeSourcesRef.current = [];
          nextStartTimeRef.current = outputCtx.currentTime;
        }

        if (msg.audio) {
          const float32 = base64PcmToFloat32(msg.audio);
          const buf = outputCtx.createBuffer(1, float32.length, 24000);
          buf.getChannelData(0).set(float32);
          const srcNode = outputCtx.createBufferSource();
          srcNode.buffer = buf;
          srcNode.connect(outputCtx.destination);

          const startAt = Math.max(outputCtx.currentTime, nextStartTimeRef.current);
          srcNode.start(startAt);
          nextStartTimeRef.current = startAt + buf.duration;
          activeSourcesRef.current.push(srcNode);
          srcNode.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter((n) => n !== srcNode);
          };
        }

        if (msg.inputTranscript) {
          setTranscripts((prev) => [...prev, { speaker: 'You', text: msg.inputTranscript! }]);
        }
        if (msg.outputTranscript) {
          setTranscripts((prev) => [...prev, { speaker: 'Tutor', text: msg.outputTranscript! }]);
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error with Live API.');
        stopSession();
      };
      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone permission is required for Live Voice.');
      stopSession();
    }
  };

  return (
    <div
      className="rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto space-y-6"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div>
          <h2 className="font-display text-2xl font-bold">Real-Time Voice Tutor · gemini-3.8-live</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Full-duplex 16kHz/24kHz PCM audio conversation over WebSocket with interruption support.
          </p>
        </div>

        {!connected ? (
          <button
            type="button"
            disabled={connecting}
            onClick={() => void startSession()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold shrink-0"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-on-primary)' }}
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            Start Voice Session
          </button>
        ) : (
          <button
            type="button"
            onClick={stopSession}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-red-600 text-white shrink-0"
          >
            <PhoneOff className="w-4 h-4" />
            End Voice Session
          </button>
        )}
      </div>

      <p className="text-xs font-mono" style={{ color: connected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
        {statusText}
      </p>

      {error && (
        <p className="text-xs text-red-400 font-medium" role="alert">
          {error}
        </p>
      )}

      <div
        className="rounded-xl p-4 min-h-[240px] max-h-[380px] overflow-y-auto space-y-3"
        style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}
      >
        {transcripts.length === 0 ? (
          <p className="text-xs text-center py-14" style={{ color: 'var(--text-muted)' }}>
            Live speech transcripts will stream here as you converse with the SMARTFUN 360 Voice Tutor.
          </p>
        ) : (
          transcripts.map((t, i) => (
            <div key={i} className="text-sm">
              <span
                className="font-bold mr-2"
                style={{ color: t.speaker === 'Tutor' ? 'var(--accent-primary)' : 'var(--text-primary)' }}
              >
                {t.speaker}:
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{t.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   4. Microphone & Audio File Transcription (gemini-3.5-transcribe)
   ============================================================================ */
function TranscribePanel() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);

  const sendForTranscription = async (blob: Blob, mimeType: string) => {
    setLoading(true);
    setError('');
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const str = String(reader.result || '');
          resolve(str.slice(str.indexOf(',') + 1));
        };
        reader.onerror = () => reject(new Error('Failed to encode audio.'));
        reader.readAsDataURL(blob);
      });

      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Transcription failed.');
      } else {
        setTranscript(data.transcript || '');
      }
    } catch {
      setError('Failed to send audio for transcription.');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        void sendForTranscription(blob, mimeType);
      };

      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    setRecording(false);
    recorderRef.current?.stop();
  };

  const handleAudioUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void sendForTranscription(file, file.type || 'audio/mp3');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto space-y-6"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
    >
      <div>
        <h2 className="font-display text-2xl font-bold">Classroom Audio Transcription · gemini-3.5-transcribe</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Record lecture notes or student oral explanations directly from your microphone, or upload an audio clip.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void startRecording()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-on-primary)' }}
          >
            <Mic className="w-4 h-4" />
            Record Microphone
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-red-600 text-white"
          >
            <Square className="w-4 h-4" />
            Stop & Transcribe ({seconds}s)
          </button>
        )}

        <label
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <Upload className="w-4 h-4" />
          Upload Audio File
          <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
        </label>

        {loading && (
          <span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            Transcribing with gemini-3.5-transcribe...
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 font-medium" role="alert">
          {error}
        </p>
      )}

      <div
        className="rounded-xl p-5 min-h-[200px] space-y-3"
        style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Transcript Output
          </span>
          {transcript && (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: 'var(--accent-primary)' }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          )}
        </div>
        {transcript ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
        ) : (
          <p className="text-xs py-10 text-center" style={{ color: 'var(--text-muted)' }}>
            {recording ? (
              <span className="inline-flex items-center gap-1.5 text-red-400 font-semibold">
                <MicOff className="w-4 h-4" /> Listening... Click Stop & Transcribe when finished.
              </span>
            ) : (
              'Your transcribed speech will appear here.'
            )}
          </p>
        )}
      </div>
    </div>
  );
}
