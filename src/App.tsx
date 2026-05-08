/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileVideo, 
  Languages, 
  Volume2, 
  Loader2, 
  Play, 
  Pause,
  CheckCircle2,
  AlertCircle,
  Type,
  Clock,
  Sparkles,
  Activity,
  Layout,
  Settings,
  PanelLeft,
  PanelRight,
  MonitorPlay,
  Scissors,
  Mic2,
  Download,
  Trash2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { transcribeVideo, translateText, generateSpeech, generateMultiSpeakerSpeech, analyzeVideo } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LANGUAGES = [
  { code: 'Khmer', name: 'Khmer (ភាសាខ្មែរ)' },
  { code: 'Spanish', name: 'Spanish' },
  { code: 'French', name: 'French' },
  { code: 'German', name: 'German' },
  { code: 'Chinese', name: 'Chinese' },
  { code: 'Japanese', name: 'Japanese' },
  { code: 'Korean', name: 'Korean' },
  { code: 'Vietnamese', name: 'Vietnamese' },
  { code: 'Thai', name: 'Thai' },
  { code: 'Hindi', name: 'Hindi' },
];

const VOICES = [
  { id: 'kiri_Kiri', label: 'Khmer Female (Kiri)' },
  { id: 'kiri_Phearith', label: 'Khmer Male (Phearith)' },
  { id: 'Kore', label: 'Female (Kore)' },
  { id: 'Zephyr', label: 'Female (Zephyr)' },
  { id: 'Puck', label: 'Male (Puck)' },
  { id: 'Charon', label: 'Male (Charon)' },
  { id: 'Fenrir', label: 'Male (Fenrir)' },
];

interface Segment {
  time: number;
  speaker: string;
  text: string;
  raw: string;
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [targetLang, setTargetLang] = useState('Khmer');
  const [selectedVoice, setSelectedVoice] = useState('kiri_Kiri');
  const [speakerVoices, setSpeakerVoices] = useState<Record<string, string>>({});
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<{ summary: string, highlights: { start: string, end: string, narration: string }[] } | null>(null);
  const [analysisAudio, setAnalysisAudio] = useState<string | null>(null);
  const [isPlayingAnalysis, setIsPlayingAnalysis] = useState(false);
  const [isReelMode, setIsReelMode] = useState(false);
  const [currentReelStep, setCurrentReelStep] = useState(0);

  // Audio Mixing State
  const [originalVolume, setOriginalVolume] = useState(0.2);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [isDubbingMode, setIsDubbingMode] = useState(false);
  const [isSyncPlaying, setIsSyncPlaying] = useState(false);

  const [status, setStatus] = useState<'idle' | 'transcribing' | 'translating' | 'speaking' | 'analyzing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editorOpen, setEditorOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'translate' | 'transcript' | 'analysis'>('translate');

  const [previewingSpeaker, setPreviewingSpeaker] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const videoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const parseSegments = (text: string): Segment[] => {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const match = line.match(/\[(\d{2}):(\d{2})\]\s+([^:]+):\s+(.*)/);
      if (match) {
        return {
          time: parseInt(match[1]) * 60 + parseInt(match[2]),
          speaker: match[3],
          text: match[4],
          raw: line
        };
      }
      return { time: 0, speaker: '', text: line, raw: line };
    });
  };

  const updateSegment = (index: number, newText: string, type: 'transcript' | 'translation') => {
    if (type === 'transcript') {
      const segments = [...transcriptSegments];
      segments[index].text = newText;
      // Reconstruct raw text
      const newTranscript = segments.map(s => `[${Math.floor(s.time / 60).toString().padStart(2, '0')}:${Math.floor(s.time % 60).toString().padStart(2, '0')}] ${s.speaker}: ${s.text}`).join('\n');
      setTranscript(newTranscript);
    } else {
      const segments = [...translationSegments];
      segments[index].text = newText;
      const newTranslation = segments.map(s => `[${Math.floor(s.time / 60).toString().padStart(2, '0')}:${Math.floor(s.time % 60).toString().padStart(2, '0')}] ${s.speaker}: ${s.text}`).join('\n');
      setTranslatedText(newTranslation);
    }
  };

  const transcriptSegments = useMemo(() => parseSegments(transcript), [transcript]);
  const translationSegments = useMemo(() => parseSegments(translatedText), [translatedText]);

  const activeSegmentIndex = useMemo(() => {
    const segments = translationSegments.length > 0 ? translationSegments : transcriptSegments;
    let index = -1;
    for (let i = 0; i < segments.length; i++) {
      if (currentTime >= segments[i].time) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [currentTime, transcriptSegments, translationSegments]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setTranscript('');
      setTranslatedText('');
      setAudioBase64(null);
      setDetectedSpeakers([]);
      setSpeakerVoices({});
      setIsAudioPlaying(false);
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      setStatus('idle');
    }
  }, [videoUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] } as Record<string, string[]>,
    multiple: false
  });

  const extractSpeakers = (text: string) => {
    const speakerRegex = /\[\d{2}:\d{2}\]\s+([^:]+):/g;
    const speakers = new Set<string>();
    let match;
    while ((match = speakerRegex.exec(text)) !== null) {
      speakers.add(match[1].trim());
    }
    return Array.from(speakers);
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsAudioPlaying(false);
  };

  const playAudio = async () => {
    if (!audioBase64 || !videoRef.current) return;

    if (isAudioPlaying) {
      stopAudio();
      if (videoRef.current) videoRef.current.pause();
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Decode new voice audio
      const binaryString = atob(audioBase64);
      const len = binaryString.length;
      const bytes = new Int16Array(len / 2);
      for (let i = 0; i < len; i += 2) {
        bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
      }

      const float32Data = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        float32Data[i] = bytes[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const voiceSource = ctx.createBufferSource();
      voiceSource.buffer = audioBuffer;

      // Create a gain node for the voice
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = voiceVolume;
      voiceSource.connect(voiceGain);
      voiceGain.connect(ctx.destination);

      // Handle video audio mixing
      const video = videoRef.current;
      video.currentTime = 0;
      
      if (!videoSourceRef.current) {
        videoSourceRef.current = ctx.createMediaElementSource(video);
      }
      const videoSource = videoSourceRef.current;
      const videoGain = ctx.createGain();
      videoGain.gain.value = originalVolume; // Use user volume setting
      
      videoSource.disconnect();
      videoSource.connect(videoGain);
      videoGain.connect(ctx.destination);
      
      voiceSource.onended = () => {
        setIsAudioPlaying(false);
        audioSourceRef.current = null;
        if (videoRef.current) {
          videoRef.current.pause();
          videoGain.gain.value = 1.0; // Reset for normal playback
        }
      };

      audioSourceRef.current = voiceSource;
      setIsAudioPlaying(true);
      
      // Sync start
      video.play();
      voiceSource.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsAudioPlaying(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;
    try {
      setStatus('analyzing');
      const base64 = await fileToBase64(videoFile);
      const analysis = await analyzeVideo(base64, videoFile.type, targetLang);
      setVideoAnalysis(analysis);
      
      if (analysis?.summary) {
        setStatus('speaking');
        const summaryAudio = await generateSpeech(analysis.summary, selectedVoice);
        setAnalysisAudio(summaryAudio);
      }

      // Pre-cache reel highlight audio for smoother transitions
      if (analysis?.highlights) {
        console.log('Pre-caching reel audio...');
        const cache: Record<number, string> = {};
        for (let i = 0; i < analysis.highlights.length; i++) {
          try {
            cache[i] = await generateSpeech(analysis.highlights[i].narration, selectedVoice);
          } catch (err) {
            console.warn(`Failed to pre-cache audio for highlight ${i}:`, err);
          }
        }
        setReelAudioCache(cache);
      }
      setStatus('idle');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  const parseTimeToSeconds = (timeStr: string) => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(parts[0]);
  };

  const [reelAudioCache, setReelAudioCache] = useState<Record<number, string>>({});

  const handleStartReel = async () => {
    if (!videoAnalysis?.highlights || !videoRef.current) return;
    
    stopAudio();
    setIsReelMode(true);
    setCurrentReelStep(0);
    
    // Reset video to start of first clip
    const firstStart = parseTimeToSeconds(videoAnalysis.highlights[0].start);
    videoRef.current.currentTime = firstStart;
    videoRef.current.play();

    // Play narration for first clip
    await playReelAudio(0);
  };

  const playReelAudio = async (index: number) => {
    if (!videoAnalysis?.highlights[index]) return;
    
    try {
      let audioBase64Str = reelAudioCache[index];
      if (!audioBase64Str) {
        setStatus('speaking');
        audioBase64Str = await generateSpeech(videoAnalysis.highlights[index].narration, selectedVoice);
        setReelAudioCache(prev => ({ ...prev, [index]: audioBase64Str }));
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const binaryString = atob(audioBase64Str);
      const bytes = new Int16Array(binaryString.length / 2);
      for (let i = 0; i < binaryString.length; i += 2) {
        bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
      }

      const float32Data = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) float32Data[i] = bytes[i] / 32768.0;

      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        audioSourceRef.current = null;
      };

      audioSourceRef.current = source;
      source.start();
      setStatus('idle');
    } catch (error) {
      console.error('Error playing reel audio:', error);
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (!isReelMode || !videoAnalysis || !videoRef.current) return;

    const currentHighlight = videoAnalysis.highlights[currentReelStep];
    const endTime = parseTimeToSeconds(currentHighlight.end);

    if (currentTime >= endTime) {
      const nextStep = currentReelStep + 1;
      if (nextStep < videoAnalysis.highlights.length) {
        setCurrentReelStep(nextStep);
        const nextStart = parseTimeToSeconds(videoAnalysis.highlights[nextStep].start);
        videoRef.current.currentTime = nextStart;
        playReelAudio(nextStep);
      } else {
        setIsReelMode(false);
        videoRef.current.pause();
      }
    }
  }, [currentTime, isReelMode, currentReelStep, videoAnalysis]);

  const handleProcess = async () => {
    if (!videoFile) return;

    try {
      setStatus('transcribing');
      const base64 = await fileToBase64(videoFile);
      const transcriptionResult = await transcribeVideo(base64, videoFile.type);
      const text = transcriptionResult.transcript;
      setDetectedLanguage(transcriptionResult.detectedLanguage);
      
      setTranscript(text || 'No transcript generated.');
      
      const speakers = extractSpeakers(text || '');
      setDetectedSpeakers(speakers);
      const initialVoices: Record<string, string> = {};
      speakers.forEach((s, i) => {
        if (targetLang === 'Khmer') {
          const kiriVoices = VOICES.filter(v => v.id.startsWith('kiri_'));
          initialVoices[s] = kiriVoices[i % kiriVoices.length]?.id || VOICES[i % VOICES.length].id;
        } else {
          initialVoices[s] = VOICES[i % VOICES.length].id;
        }
      });
      setSpeakerVoices(initialVoices);

      setStatus('analyzing');
      const analysis = await analyzeVideo(base64, videoFile.type, targetLang);
      setVideoAnalysis(analysis);

      setStatus('translating');
      const translated = await translateText(text || '', targetLang, transcriptionResult.detectedLanguage);
      setTranslatedText(translated || '');

      setStatus('speaking');
      const audio = await generateMultiSpeakerSpeech(translated || '', initialVoices);
      setAudioBase64(audio);

      // Generate analysis audio
      if (analysis?.summary) {
        const summaryAudio = await generateSpeech(analysis.summary, selectedVoice);
        setAnalysisAudio(summaryAudio);
      }

      // Pre-cache reel highlight audio for smoother transitions
      if (analysis?.highlights) {
        console.log('Pre-caching reel audio...');
        const cache: Record<number, string> = {};
        for (let i = 0; i < analysis.highlights.length; i++) {
          try {
            cache[i] = await generateSpeech(analysis.highlights[i].narration, selectedVoice);
          } catch (err) {
            console.warn(`Failed to pre-cache audio for highlight ${i}:`, err);
          }
        }
        setReelAudioCache(cache);
      }
      
      setStatus('idle');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.message || 'An unexpected error occurred.');
    }
  };

  const handlePlayAnalysis = async () => {
    if (!analysisAudio) return;
    if (isPlayingAnalysis) {
      stopAudio();
      setIsPlayingAnalysis(false);
      return;
    }
    await playAudioSegment(analysisAudio, (playing) => setIsPlayingAnalysis(playing));
  };

  const playAudioSegment = async (base64: string, setPlaying: (p: boolean) => void) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const binaryString = atob(base64);
      const bytes = new Int16Array(binaryString.length / 2);
      for (let i = 0; i < binaryString.length; i += 2) {
        bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
      }

      const float32Data = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) float32Data[i] = bytes[i] / 32768.0;

      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = voiceVolume;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.onended = () => {
        setPlaying(false);
        audioSourceRef.current = null;
      };

      audioSourceRef.current = source;
      setPlaying(true);
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlaying(false);
    }
  };

  const handleToggleSyncPlayback = () => {
    if (!videoRef.current || !audioBase64) return;

    if (isSyncPlaying) {
      videoRef.current.pause();
      stopAudio();
      setIsSyncPlaying(false);
    } else {
      videoRef.current.currentTime = 0;
      videoRef.current.volume = originalVolume;
      videoRef.current.play();
      playAudioSegment(audioBase64, (playing) => setIsSyncPlaying(playing));
      setIsSyncPlaying(true);
    }
  };

  const handleExport = async () => {
    if (!videoRef.current || !translatedText) return;
    setIsExporting(true);
    setStatus('idle');

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const stream = canvas.captureStream(30);
    
    // Mix audio for export
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx_audio = audioContextRef.current;
    const dest = ctx_audio.createMediaStreamDestination();
    
    // 1. Original Video Audio
    if (!videoSourceRef.current) {
      videoSourceRef.current = ctx_audio.createMediaElementSource(video);
    }
    const videoSource = videoSourceRef.current;
    const videoGain = ctx_audio.createGain();
    videoGain.gain.value = originalVolume; // Use user setting for export
    videoSource.disconnect();
    videoSource.connect(videoGain);
    videoGain.connect(dest);
    
    // 2. New Voice Audio
    if (audioBase64) {
      const binaryString = atob(audioBase64);
      const len = binaryString.length;
      const bytes = new Int16Array(len / 2);
      for (let i = 0; i < len; i += 2) {
        bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
      }
      const float32Data = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        float32Data[i] = bytes[i] / 32768.0;
      }
      const audioBuffer = ctx_audio.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);
      
      const voiceSource = ctx_audio.createBufferSource();
      voiceSource.buffer = audioBuffer;
      const voiceGain = ctx_audio.createGain();
      voiceGain.gain.value = voiceVolume; // Use user setting for export
      voiceSource.connect(voiceGain);
      voiceGain.connect(dest);
      voiceSource.start();
    }

    // Combine video and audio streams
    const combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translated_video.webm';
      a.click();
      setIsExporting(false);
    };

    recorder.start();
    video.currentTime = 0;
    await video.play();

    if (audioBase64) {
      playAudio();
    }

    const drawFrame = () => {
      if (video.paused || video.ended) {
        recorder.stop();
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const fontSize = Math.floor(canvas.height * 0.05);
      ctx.font = `bold ${fontSize}px "Khmer OS Battambang", "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.fillStyle = 'white';

      const lines = translatedText.split('\n').slice(0, 2);
      const margin = canvas.height * 0.1;
      
      lines.forEach((line, i) => {
        const y = canvas.height - margin - (lines.length - 1 - i) * (fontSize * 1.2);
        ctx.strokeText(line, canvas.width / 2, y);
        ctx.fillText(line, canvas.width / 2, y);
      });

      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  };

  const handleTranslateOnly = async () => {
    if (!transcript) return;
    try {
      setStatus('translating');
      const translated = await translateText(transcript, targetLang);
      setTranslatedText(translated || '');
      
      setStatus('speaking');
      const audio = await generateMultiSpeakerSpeech(translated || '', speakerVoices);
      setAudioBase64(audio);
      
      setStatus('idle');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  const handleSpeechOnly = async () => {
    if (!translatedText) return;
    try {
      setStatus('speaking');
      const audio = await generateMultiSpeakerSpeech(translatedText, speakerVoices);
      setAudioBase64(audio);
      setStatus('idle');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  const updateSpeakerVoice = (speaker: string, voiceId: string) => {
    setSpeakerVoices(prev => ({ ...prev, [speaker]: voiceId }));
  };

  const handlePreviewVoice = async (speaker: string) => {
    stopAudio();
    if (videoRef.current) videoRef.current.pause();
    
    const voiceId = speakerVoices[speaker] || 'Kore';
    setPreviewingSpeaker(speaker);
    try {
      const sampleText = targetLang === 'Khmer' ? "សួស្តី នេះគឺជាការសាកល្បងសំឡេងរបស់ខ្ញុំ។" : "Hello, this is a sample of my voice.";
      const audio = await generateSpeech(sampleText, voiceId);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const binaryString = atob(audio);
      const len = binaryString.length;
      const bytes = new Int16Array(len / 2);
      for (let i = 0; i < len; i += 2) {
        bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
      }

      const float32Data = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        float32Data[i] = bytes[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setPreviewingSpeaker(null);
      };

      source.start();
    } catch (error) {
      console.error('Error previewing voice:', error);
      setPreviewingSpeaker(null);
    }
  };

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl space-y-12 text-center"
        >
          <div className="space-y-4">
            <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl rotate-3">
              <Languages size={48} />
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-slate-900">
              Video Voice Translator
            </h1>
            <p className="text-slate-500 text-lg">
              Transcribe, Translate, and Voiceover your videos with AI precision.
            </p>
          </div>

          <div 
            {...getRootProps()} 
            className={cn(
              "border-2 border-dashed rounded-[40px] p-20 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-6 group",
              isDragActive ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-2xl"
            )}
          >
            <input {...getInputProps()} />
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-slate-700">Drop your video here</p>
              <p className="text-sm text-slate-400">MP4, MOV, or WebM supported</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-100 flex flex-col overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>
      
      {/* Header */}
      <header className="h-14 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setVideoUrl(null)}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
              <MonitorPlay size={18} />
            </div>
            <h1 className="text-sm font-bold tracking-tight text-white/90">Studio Translate</h1>
          </div>
          
          <div className="h-4 w-px bg-white/10 mx-2" />
          
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5">
                <FileVideo size={12} className="text-slate-400" />
                <span className="text-[10px] font-mono text-slate-300">{(videoFile?.size ? (videoFile.size / (1024 * 1024)).toFixed(1) : 0)}MB</span>
             </div>
             {detectedLanguage && (
               <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 rounded-md border border-blue-500/20">
                  <Languages size={12} className="text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">{detectedLanguage}</span>
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {status !== 'idle' && status !== 'error' && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-md border border-blue-500/20">
              <Loader2 className="animate-spin" size={12} />
              <span>{status}...</span>
            </div>
          )}
          
          <button 
            onClick={handleExport}
            disabled={!translatedText || isExporting}
            className="h-8 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
            Export
          </button>

          <div className="h-6 w-px bg-white/10 mx-1" />
          
          <button 
            onClick={() => setVideoUrl(null)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Close Project"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden lg:flex-row flex-col relative">
        {/* Left Sidebar: Controls */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-white/5 bg-slate-900/50 flex flex-col overflow-hidden shrink-0"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings size={14} className="text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Settings</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-white/5 rounded-md text-slate-500">
                  <ChevronLeft size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Language Selection */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Target Language</label>
                  <select 
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-white/5 border-white/10 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 text-white outline-none ring-1 ring-white/5"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code} className="bg-slate-900">{lang.name}</option>
                    ))}
                  </select>
                </div>

                {/* Voice Selection */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Main Narrator</label>
                  <select 
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full bg-white/5 border-white/10 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 text-white outline-none ring-1 ring-white/5"
                  >
                    {VOICES.map(v => (
                      <option key={v.id} value={v.id} className="bg-slate-900">{v.label}</option>
                    ))}
                  </select>
                </div>

                {/* Mixing Hub */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 size={12} className="text-blue-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Audio Mixing</span>
                  </div>
                  
                  <div className="space-y-4 bg-white/5 p-4 rounded-xl ring-1 ring-white/5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Original</span>
                        <span className="text-blue-400">{Math.round(originalVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.05" value={originalVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setOriginalVolume(val);
                          if (videoRef.current) videoRef.current.volume = val;
                        }}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>AI Voice</span>
                        <span className="text-blue-400">{Math.round(voiceVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="2" step="0.05" value={voiceVolume}
                        onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Speaker Assignment */}
                {detectedSpeakers.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Speaker Voices</label>
                    <div className="space-y-2">
                      {detectedSpeakers.map(speaker => (
                        <div key={speaker} className="flex flex-col gap-1.5 p-2 bg-white/5 rounded-lg ring-1 ring-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-slate-300 truncate max-w-[150px]">{speaker}</span>
                            <button onClick={() => handlePreviewVoice(speaker)} disabled={previewingSpeaker !== null} className="p-1 hover:bg-white/10 rounded-md text-blue-400">
                               {previewingSpeaker === speaker ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                            </button>
                          </div>
                          <select 
                            value={speakerVoices[speaker] || 'Kore'}
                            onChange={(e) => updateSpeakerVoice(speaker, e.target.value)}
                            className="bg-black/20 border-transparent rounded-md px-2 py-1 text-[9px] font-medium text-white outline-none cursor-pointer"
                          >
                            {VOICES.map(v => (
                              <option key={v.id} value={v.id} className="bg-slate-900">{v.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {!sidebarOpen && (
           <button 
             onClick={() => setSidebarOpen(true)}
             className="absolute top-4 left-4 z-10 p-2 bg-slate-900 border border-white/10 rounded-lg text-slate-400 hover:text-white"
           >
             <PanelLeft size={18} />
           </button>
        )}

        {/* Center Stage: Video Viewport */}
        <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black ring-1 ring-white/10 group">
              <video 
                ref={videoRef} key={videoUrl} 
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                className="w-full h-full cursor-pointer"
                onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.paused) videoRef.current.play();
                    else videoRef.current.pause();
                  }
                }}
              >
                <source src={videoUrl} type={videoFile?.type} />
              </video>
              
              {/* Caption Overlay */}
              {activeSegmentIndex !== -1 && (translationSegments.length > 0 || transcriptSegments.length > 0) && (
                <div className="absolute bottom-12 left-0 right-0 px-8 pointer-events-none flex justify-center">
                  <motion.div 
                    key={activeSegmentIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-xl text-center text-lg font-bold border border-white/10 shadow-2xl tracking-tight"
                  >
                    {(translationSegments[activeSegmentIndex] || transcriptSegments[activeSegmentIndex]).text}
                  </motion.div>
                </div>
              )}

              {/* Status Overlay */}
              {status !== 'idle' && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                   <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-white font-bold uppercase tracking-widest text-[10px] animate-pulse">{status}...</span>
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Quick Actions */}
          <div className="h-32 bg-slate-900 border-t border-white/5 p-4 flex flex-col gap-4">
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <button 
                     onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()}
                     className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg"
                   >
                     {videoRef.current?.paused ? <Play size={18} fill="currentColor" /> : <Pause size={18} />}
                   </button>
                   
                   <div className="text-[11px] font-mono font-bold text-slate-400">
                      <span className="text-white">{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                      <span className="mx-1 opacity-30">/</span>
                      <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                   <button
                     onClick={handleProcess}
                     disabled={status !== 'idle'}
                     className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20"
                   >
                     {status === 'idle' ? <Sparkles size={14} /> : <Loader2 size={14} className="animate-spin" />}
                     Process All
                   </button>
                   
                   <button
                     onClick={handleToggleSyncPlayback}
                     disabled={!audioBase64}
                     className={cn(
                       "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                       isSyncPlaying ? "bg-white text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                     )}
                   >
                     {isSyncPlaying ? <Pause size={14} /> : <Mic2 size={14} />}
                     Live Preview
                   </button>
                </div>
             </div>

             {/* Scrubber */}
             <div 
               className="relative h-4 bg-white/5 rounded-full ring-1 ring-white/5 cursor-pointer group"
               onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const x = e.clientX - rect.left;
                 const pct = x / rect.width;
                 if (videoRef.current) videoRef.current.currentTime = pct * duration;
               }}
             >
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-blue-500/20 rounded-full border-r border-blue-400"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                {(translationSegments.length > 0 ? translationSegments : transcriptSegments).map((seg, i) => (
                  <div 
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-white/10"
                    style={{ left: `${(seg.time / duration) * 100}%` }}
                  />
                ))}
             </div>
          </div>
        </div>

        {/* Right Sidebar: Editors */}
        <AnimatePresence initial={false}>
          {editorOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/5 bg-slate-900/50 flex flex-col overflow-hidden shrink-0"
            >
              {/* Tab Navigation */}
              <div className="flex items-center border-b border-white/5 p-1 shrink-0">
                 <button 
                   onClick={() => setActiveTab('translate')}
                   className={cn(
                     "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-md",
                     activeTab === 'translate' ? "text-white bg-white/5" : "text-slate-500 hover:text-slate-300"
                   )}
                 >
                   Translate
                 </button>
                 <button 
                   onClick={() => setActiveTab('transcript')}
                   className={cn(
                     "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-md",
                     activeTab === 'transcript' ? "text-white bg-white/5" : "text-slate-500 hover:text-slate-300"
                   )}
                 >
                   Transcript
                 </button>
                 <button 
                   onClick={() => setActiveTab('analysis')}
                   className={cn(
                     "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-md",
                     activeTab === 'analysis' ? "text-white bg-white/5" : "text-slate-500 hover:text-slate-300"
                   )}
                 >
                   Analysis
                 </button>
                 <button onClick={() => setEditorOpen(false)} className="p-3 text-slate-500 hover:text-white">
                   <ChevronRight size={16} />
                 </button>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'translate' && (
                  <div className="space-y-1">
                    {translationSegments.length > 0 ? translationSegments.map((seg, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "p-3 rounded-xl transition-all border border-transparent",
                          activeSegmentIndex === i ? "bg-white/10 border-blue-500/30 shadow-xl" : "hover:bg-white/5"
                        )}
                        onClick={() => { if (videoRef.current) videoRef.current.currentTime = seg.time; }}
                      >
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                             {seg.speaker} • {Math.floor(seg.time / 60)}:{Math.floor(seg.time % 60).toString().padStart(2, '0')}
                           </span>
                         </div>
                         <textarea
                           value={seg.text}
                           onChange={(e) => updateSegment(i, e.target.value, 'translation')}
                           className="w-full bg-transparent border-none p-0 text-xs text-white leading-relaxed focus:ring-0 resize-none font-medium"
                           rows={1}
                           onInput={(e) => {
                             const target = e.target as HTMLTextAreaElement;
                             target.style.height = 'auto';
                             target.style.height = target.scrollHeight + 'px';
                           }}
                         />
                      </div>
                    )) : (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-600 italic text-xs gap-4 text-center px-8">
                         <Languages size={32} className="opacity-20" />
                         <span>Translations will be generated after processing the video.</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'transcript' && (
                  <div className="space-y-1">
                    {transcriptSegments.length > 0 ? transcriptSegments.map((seg, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "p-3 rounded-xl transition-all border border-transparent",
                          activeSegmentIndex === i ? "bg-white/10 border-blue-500/30 shadow-xl" : "hover:bg-white/5"
                        )}
                        onClick={() => { if (videoRef.current) videoRef.current.currentTime = seg.time; }}
                      >
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                             {seg.speaker} • {Math.floor(seg.time / 60)}:{Math.floor(seg.time % 60).toString().padStart(2, '0')}
                           </span>
                         </div>
                         <textarea
                           value={seg.text}
                           onChange={(e) => updateSegment(i, e.target.value, 'transcript')}
                           className="w-full bg-transparent border-none p-0 text-xs text-white/70 leading-relaxed focus:ring-0 resize-none"
                           rows={1}
                           onInput={(e) => {
                             const target = e.target as HTMLTextAreaElement;
                             target.style.height = 'auto';
                             target.style.height = target.scrollHeight + 'px';
                           }}
                         />
                      </div>
                    )) : (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-600 italic text-xs gap-4 text-center px-8">
                         <Type size={32} className="opacity-20" />
                         <span>Transcripts will appear here after analysis.</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'analysis' && videoAnalysis && (
                   <div className="space-y-6">
                      <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-3">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">AI Summary</span>
                            {analysisAudio && (
                               <button 
                                 onClick={handlePlayAnalysis}
                                 className={cn(
                                   "p-2 rounded-lg transition-all",
                                   isPlayingAnalysis ? "bg-red-500 text-white" : "bg-white/5 text-blue-400 hover:bg-white/10"
                                 )}
                               >
                                 {isPlayingAnalysis ? <Pause size={12} /> : <Volume2 size={12} />}
                               </button>
                            )}
                         </div>
                         <p className="text-xs text-slate-300 leading-relaxed italic">"{videoAnalysis.summary}"</p>
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Highlight Reels</span>
                            <button 
                              onClick={handleStartReel}
                              disabled={isReelMode}
                              className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                            >
                               <Play size={10} fill="currentColor" />
                               Play All
                            </button>
                         </div>
                         <div className="grid gap-2">
                            {videoAnalysis.highlights.map((highlight, i) => (
                               <button 
                                 key={i}
                                 onClick={() => {
                                    if (videoRef.current) {
                                      videoRef.current.currentTime = parseTimeToSeconds(highlight.start);
                                      videoRef.current.play();
                                    }
                                 }}
                                 className={cn(
                                   "flex flex-col gap-2 p-3 rounded-xl border transition-all text-left group",
                                   isReelMode && currentReelStep === i ? "bg-blue-600 border-blue-500 shadow-lg" : "bg-white/5 border-transparent hover:border-white/10"
                                 )}
                               >
                                  <div className="flex items-center justify-between">
                                     <span className={cn("text-[9px] font-mono font-bold", isReelMode && currentReelStep === i ? "text-blue-100" : "text-blue-400")}>
                                        {highlight.start} - {highlight.end}
                                     </span>
                                     <div className={cn("w-2 h-2 rounded-full", isReelMode && currentReelStep === i ? "bg-white animate-pulse" : "bg-white/10")} />
                                  </div>
                                  <p className={cn("text-[11px] font-medium leading-snug", isReelMode && currentReelStep === i ? "text-white" : "text-slate-300")}>
                                     {highlight.narration}
                                  </p>
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                )}

                {activeTab === 'analysis' && !videoAnalysis && (
                   <div className="h-64 flex flex-col items-center justify-center text-slate-600 italic text-xs gap-4 text-center px-8">
                      <Sparkles size={32} className="opacity-20" />
                      <span>Run AI analysis to extract key highlights and insights.</span>
                   </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {!editorOpen && (
           <button 
             onClick={() => setEditorOpen(true)}
             className="absolute top-4 right-4 z-10 p-2 bg-slate-900 border border-white/10 rounded-lg text-slate-400 hover:text-white"
           >
             <PanelRight size={18} />
           </button>
        )}
      </div>

      {/* Legacy/Redundant Footer Actions Removed */}

    </div>
  );
}
