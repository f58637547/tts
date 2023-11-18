import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { AudioProps } from '@/react/AudioPlayer';

export interface StreamAudioPlayerReturn extends AudioProps {
  arrayBuffers: ArrayBuffer[];
  download: () => void;
  load: (arrayBuffer: ArrayBuffer) => void;
  ref: RefObject<HTMLAudioElement>;
  reset: () => void;
  url: string;
}

export const useStreamAudioPlayer = (): StreamAudioPlayerReturn => {
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const [arrayBuffers, setArrayBuffers] = useState<ArrayBuffer[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [maxLength, setMaxLength] = useState(0);

  useEffect(() => {
    if (!audioRef.current) return;
    const onLoadedMetadata = () => {
      setDuration(audioRef.current.duration);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audioRef.current.currentTime);
    };
    const onAudioError = () => {
      console.error('Error useStreamAudioPlayer:', 'loading audio', audioRef.current.error);
    };

    audioRef.current.addEventListener('error', onAudioError);
    audioRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
    audioRef.current.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      audioRef.current.pause();
      audioRef.current.load();
      audioRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
      audioRef.current.removeEventListener('timeupdate', onTimeUpdate);
      audioRef.current.removeEventListener('error', onAudioError);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current || !audioRef.current.currentSrc || audioRef.current.duration === 0)
      return;
    const onEnded = async () => {
      if (!audioRef.current || !audioRef.current.currentSrc) return;
      audioRef.current.pause();
      if (maxLength < arrayBuffers.length) {
        const cacheTime = audioRef.current.currentTime;
        const newBlob = new Blob(arrayBuffers, { type: 'audio/mp3' });
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
        const newUrl = URL.createObjectURL(newBlob);
        audioRef.current.src = newUrl;
        audioRef.current.load();
        audioRef.current.currentTime = cacheTime;
        audioRef.current.play();
        setMaxLength(arrayBuffers.length);
      } else {
        setIsPlaying(false);
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    };

    audioRef.current.addEventListener('ended', onEnded);

    return () => {
      audioRef.current.removeEventListener('ended', onEnded);
    };
  }, [maxLength, arrayBuffers]);

  const loadArrayBuffer = useCallback(
    async (arrayBuffer: ArrayBuffer) => {
      console.log(arrayBuffer);
      if (!arrayBuffer) return;
      if (maxLength === 0) {
        const newBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        audioRef.current.src = URL.createObjectURL(newBlob);
        audioRef.current.load();
        audioRef.current.play();
        setIsPlaying(true);
        setMaxLength(1);
      }
      setArrayBuffers((prev) => [...prev, arrayBuffer].filter(Boolean));
    },
    [maxLength],
  );

  const handlePlay = useCallback(() => {
    if (audioRef.current.duration > 0) {
      setIsPlaying(true);
      audioRef.current.play();
    }
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    audioRef.current.pause();
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }, []);

  const setTime = useCallback((value: number) => {
    setCurrentTime(value);
    audioRef.current.currentTime = value;
  }, []);

  const reset = useCallback(() => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
    audioRef.current.src = '';
    setMaxLength(0);
    setArrayBuffers([]);
    setDuration(0);
    setCurrentTime(0);
  }, []);

  const handleDownload = useCallback(async () => {
    const a = document.createElement('a');
    a.href = audioRef.current.src;
    a.download = 'audio.mp3';
    a.click();
  }, []);

  return {
    arrayBuffers,
    currentTime,
    download: handleDownload,
    duration,
    isPlaying,
    load: loadArrayBuffer,
    pause: handlePause,
    play: handlePlay,
    ref: audioRef,
    reset,
    setTime,
    stop: handleStop,
    url: audioRef.current.src,
  };
};
