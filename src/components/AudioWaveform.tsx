import React from 'react';

interface AudioWaveformProps {
  frequencies: Uint8Array;
  level: number;
  isActive: boolean;
  color?: string;
  glowColor?: string;
  barCount?: number;
  height?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  frequencies,
  level,
  isActive,
  color = '#00E5FF',
  glowColor = '#7C3AED',
  barCount = 32,
  height = 42,
}) => {
  // Normalize bars
  const bars = Array.from({ length: barCount }, (_, i) => {
    if (!isActive) return 4;
    const index = Math.floor((i / barCount) * Math.min(frequencies.length, 48));
    const rawVal = frequencies[index] || 0;
    const normalized = rawVal / 255;
    const dynamicHeight = Math.max(4, Math.round(normalized * height * (0.8 + level * 0.5)));
    return dynamicHeight;
  });

  return (
    <div
      className="flex items-center justify-center gap-[2.5px] w-full max-w-sm px-4 py-2"
      style={{ height: `${height + 12}px` }}
    >
      {bars.map((barHeight, idx) => {
        // Mirrored waveform symmetry from center
        const centerDistance = Math.abs(idx - barCount / 2) / (barCount / 2);
        const taper = 1 - centerDistance * 0.35;
        const adjustedHeight = Math.max(3, barHeight * taper);

        return (
          <div
            key={idx}
            className="w-1 rounded-full transition-all duration-75"
            style={{
              height: `${adjustedHeight}px`,
              backgroundColor: isActive ? color : 'rgba(148, 163, 184, 0.25)',
              boxShadow: isActive
                ? `0 0 8px ${color}, 0 0 16px ${glowColor}66`
                : 'none',
              opacity: isActive ? 0.35 + (adjustedHeight / height) * 0.65 : 0.2,
            }}
          />
        );
      })}
    </div>
  );
};
