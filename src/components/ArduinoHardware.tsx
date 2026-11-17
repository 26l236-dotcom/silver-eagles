import { useRef, useState } from 'react';
import { Check, Copy, Cpu, Download, PlugZap, Unplug, Volume2 } from 'lucide-react';
import { ARDUINO_SKETCH } from '../data/blueprints';
import { soundEngine } from '../utils/audio';

interface SerialPortLike {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
}

const VIRTUAL_BUTTONS = [
  { id: 1, label: 'BTN 1 · Red Squad', squad: 'RED SQUAD', color: '#DC2626', freq: 523.25 },
  { id: 2, label: 'BTN 2 · Blue Squad', squad: 'BLUE SQUAD', color: '#2563EB', freq: 659.25 },
  { id: 3, label: 'BTN 3 · Green Squad', squad: 'GREEN SQUAD', color: '#16A34A', freq: 783.99 },
  { id: 4, label: 'BTN 4 · Yellow Squad', squad: 'YELLOW SQUAD', color: '#D97706', freq: 880.0 },
];

export function ArduinoHardware() {
  const [imgError, setImgError] = useState(false);
  const [connected, setConnected] = useState(false);
  const [serialStatus, setSerialStatus] = useState('Not connected · Simulator ready');
  const [lcdLine1, setLcdLine1] = useState('SMARTFUN 360    ');
  const [lcdLine2, setLcdLine2] = useState('PIN: 360360 RDY ');
  const [activeBtn, setActiveBtn] = useState<number | null>(null);
  const [serialLog, setSerialLog] = useState<string[]>([
    '00:00.00 [BOOT] 16x2 I2C LCD initialized (0x27)',
    '00:00.12 [UART] Serial 9600 baud listener active',
  ]);
  const [copiedSketch, setCopiedSketch] = useState(false);

  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const appendLog = (entry: string) => {
    setSerialLog((prev) => [entry, ...prev].slice(0, 8));
  };

  const triggerVirtualOrHardwarePress = (btnId: number, source: 'Simulator' | 'USB Serial') => {
    const btn = VIRTUAL_BUTTONS.find((b) => b.id === btnId);
    if (!btn) return;
    setActiveBtn(btnId);
    setLcdLine1('BUZZED IN:      ');
    setLcdLine2(btn.squad.padEnd(16, ' ').slice(0, 16));
    soundEngine.playPiezo(btn.freq, 160);
    appendLog(`[${source}] BTN:${btnId} -> ${btn.squad} (${Math.round(btn.freq)} Hz)`);
    setTimeout(() => setActiveBtn(null), 400);
  };

  const handleConnectSerial = async () => {
    const nav = navigator as unknown as {
      serial?: { requestPort: () => Promise<SerialPortLike> };
    };

    if (!nav.serial) {
      setSerialStatus('Web Serial API requires desktop Chrome or Edge outside restricted iframes. Use the interactive simulator below.');
      return;
    }

    try {
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setConnected(true);
      setSerialStatus('Connected to Arduino Uno at 9600 baud');
      appendLog('[USB] Arduino Uno serial port opened at 9600 baud');

      if (port.readable) {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const raw of lines) {
            const line = raw.trim();
            const match = line.match(/^BTN:([1-4])$/);
            if (match) {
              triggerVirtualOrHardwarePress(Number(match[1]), 'USB Serial');
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Serial connection cancelled.';
      setSerialStatus(msg);
      setConnected(false);
    }
  };

  const handleDisconnectSerial = async () => {
    try {
      await readerRef.current?.cancel();
      await portRef.current?.close();
    } catch {
      // ignore close errors
    }
    readerRef.current = null;
    portRef.current = null;
    setConnected(false);
    setSerialStatus('Disconnected · Simulator active');
  };

  const handleCopySketch = async () => {
    await navigator.clipboard.writeText(ARDUINO_SKETCH);
    setCopiedSketch(true);
    setTimeout(() => setCopiedSketch(false), 1800);
  };

  const handleDownloadSketch = () => {
    const blob = new Blob([ARDUINO_SKETCH], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Smartfun360_QuizBuzz_Uno.ino';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Hardware Overview + Web Serial Connector */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div
          className="lg:col-span-6 rounded-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div className="aspect-[4/3] w-full overflow-hidden">
            {!imgError ? (
              <img
                src="/src/assets/images/arduino_buzzer_kit_1794927376146.jpg"
                alt="Arduino Uno wired to four colorful arcade push buttons and a 16x2 I2C LCD display"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
                style={{ background: 'var(--hero-gradient)', color: '#ffffff' }}
              >
                <Cpu className="w-12 h-12 mb-2" />
                <p className="font-display text-xl font-bold">Arduino Uno QuizBuzz Kit</p>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
                Physical Hardware Bridge · Web Serial API
              </p>
              <h1 className="font-display text-2xl font-bold mt-1">
                Arduino Uno Classroom Buzzer Kit
              </h1>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Pair low-cost tactile arcade push buttons and an I2C 16x2 LCD directly to any classroom laptop over USB. Physical button presses emit <code className="font-mono text-xs">BTN:1</code>–<code className="font-mono text-xs">BTN:4</code> at 9600 baud.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <div className="flex flex-wrap items-center gap-3">
                {!connected ? (
                  <button
                    type="button"
                    onClick={() => void handleConnectSerial()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-on-primary)',
                    }}
                  >
                    <PlugZap className="w-4 h-4" />
                    Connect Arduino via USB Serial
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleDisconnectSerial()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white"
                  >
                    <Unplug className="w-4 h-4" />
                    Disconnect Serial Port
                  </button>
                )}
              </div>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {serialStatus}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Hardware Simulator */}
        <div
          className="lg:col-span-6 rounded-2xl p-6 space-y-6 flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Interactive Hardware Simulator</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Test the 16x2 I2C LCD display, 4 arcade switches, and piezo synthesizer in-browser
                </p>
              </div>
              <Volume2 className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            </div>

            {/* 16x2 I2C LCD Screen Simulator */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700">
              <div className="p-4 rounded-lg bg-[#76a614] text-[#111c02] font-mono text-lg sm:text-xl font-bold tracking-widest shadow-inner">
                <div className="whitespace-pre">{lcdLine1}</div>
                <div className="whitespace-pre mt-1">{lcdLine2}</div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-2">
                <span>HD44780 16x2 I2C · Addr 0x27</span>
                <span>Piezo Pin D8</span>
              </div>
            </div>

            {/* 4-Button Arcade Controller */}
            <div className="grid grid-cols-2 gap-3">
              {VIRTUAL_BUTTONS.map((btn) => {
                const pressed = activeBtn === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => triggerVirtualOrHardwarePress(btn.id, 'Simulator')}
                    className="py-4 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-md"
                    style={{
                      backgroundColor: btn.color,
                      transform: pressed ? 'scale(0.96)' : 'scale(1)',
                    }}
                  >
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Serial Packet Monitor */}
          <div
            className="p-4 rounded-xl space-y-2"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <p className="text-xs font-bold">Serial Output Monitor (9600 baud)</p>
            <div className="font-mono text-[11px] space-y-1 max-h-32 overflow-y-auto" style={{ color: 'var(--text-secondary)' }}>
              {serialLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Firmware Sketch Section */}
      <section
        className="rounded-2xl p-6 space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Smartfun360_QuizBuzz_Uno.ino</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Complete, upload-ready Arduino C++ firmware sketch for classroom builds
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopySketch()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              {copiedSketch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSketch ? 'Copied' : 'Copy Sketch'}
            </button>
            <button
              type="button"
              onClick={handleDownloadSketch}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-on-primary)',
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Download .ino
            </button>
          </div>
        </div>

        <pre
          className="p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--text-secondary)',
          }}
        >
          <code>{ARDUINO_SKETCH}</code>
        </pre>
      </section>
    </div>
  );
}
