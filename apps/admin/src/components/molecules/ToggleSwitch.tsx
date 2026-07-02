import React, { useState, useEffect, useRef } from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, id }) => {
  const [complete, setComplete] = useState(checked ? 100 : 0);
  const [isActive, setIsActive] = useState(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const target = checked ? 100 : 0;
    const dur = 240;
    const start = performance.now();
    const from = complete;

    const easeInOutQuad = (t: number) => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / dur, 1);
      const eased = easeInOutQuad(progress);
      const nextVal = from + (target - from) * eased;

      setComplete(nextVal);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setComplete(target);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [checked]);

  const handlePointerDown = () => {
    setIsActive(true);
  };

  const handlePointerUp = () => {
    setIsActive(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(!checked);
  };

  return (
    <button
      id={id}
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`relative w-[52px] h-[28px] rounded-full border-0 p-0 cursor-pointer overflow-visible flex-shrink-0 outline-none select-none bg-transparent ${
        checked ? 'on' : ''
      }`}
      style={{
        // Define Jhey's custom properties for local scoping
        // @ts-ignore
        '--complete': complete,
        '--border': '3px',
        '--checked': 'var(--indigo)',
        '--unchecked': 'rgba(255,255,255,0.12)',
        '--transition': '0.22s',
        '--ease': 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      data-active={isActive ? 'true' : 'false'}
    >
      {/* Knockout track layer */}
      <div className="absolute inset-0 rounded-full bg-white/12 pointer-events-none transition-colors duration-100 ease-out tgl-indicator" />

      {/* SVG-filtered Masked Track */}
      <div className="absolute inset-0 rounded-full [filter:url(#tgl-remove-black)] tgl-knockout">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full bg-[var(--indigo)] transition-colors duration-100 ease-out tgl-indicator--masked">
          <div
            className="absolute top-1/2 h-[calc(100%-6px)] w-[calc(60%-6px)] bg-black rounded-full transition-all duration-[var(--transition)] ease-[var(--ease)] will-change-transform tgl-mask"
            style={{
              left: '3px',
              transform: `translate(calc((${complete} / 100) * (52px - 60%)), -50%)`,
              ...(isActive && {
                height: 'calc((100% - 6px) * 1.5)',
                width: 'calc((60% - 6px) * 1.5)',
                marginLeft: 'calc((60% - 6px) * -0.25)',
              }),
            }}
          />
        </div>
      </div>

      {/* Liquid Gooey Window */}
      <div className="absolute inset-0 rounded-full tgl-goo-wrap">
        <div className="absolute inset-0 rounded-full overflow-hidden [filter:url(#tgl-goo)] tgl-liquids">
          <div
            className="absolute inset-0 rounded-full transition-all duration-[var(--transition)] ease-out"
            style={{
              boxShadow: checked
                ? `inset 0 0 2px 3px var(--indigo), inset calc((${complete} / 100) * 6px - 3px) 0 2px 3px var(--indigo)`
                : `inset 0 0 2px 3px rgba(255,255,255,0.12), inset calc((${complete} / 100) * 6px - 3px) 0 2px 3px rgba(255,255,255,0.12)`,
            }}
          />
          <div
            className="absolute top-1/2 left-0 w-[52px] h-[28px] rounded-full transition-all duration-[var(--transition)] ease-[var(--ease)] tgl-liquid-track"
            style={{
              backgroundColor: checked ? 'var(--indigo)' : 'rgba(255,255,255,0.12)',
              transform: `translate(calc((${complete} / 100) * (52px - 100% - 18px)), -50%)`,
              ...(isActive && {
                left: '9px',
                height: 'calc(28px - 18px)',
              }),
            }}
          />
        </div>
      </div>

      {/* Glass Knob Overlay */}
      <div
        className="absolute top-1/2 left-[3px] h-[calc(100%-6px)] w-[calc(60%-6px)] rounded-full transition-all duration-[var(--transition)] ease-[var(--ease)] will-change-transform z-10 tgl-knob"
        style={{
          transform: `translate(calc((${complete} / 100) * (52px - 100% - 6px)), -50%)`,
          ...(isActive && {
            transform: `translate(calc((${complete} / 100) * (52px - 100% - 6px)), -50%) scale(1.5)`,
          }),
        }}
      >
        <div
          className={`absolute inset-0 rounded-full transition-opacity duration-[var(--transition)] ease-out shadow-[1px_-1px_2px_rgba(255,255,255,0.5)_inset,0_-1px_2px_rgba(255,255,255,0.5)_inset,-1px_-1px_2px_rgba(255,255,255,0.5)_inset,1px_1px_2px_rgba(0,0,0,0.5)_inset,-6px_3px_8px_-4px_rgba(0,0,0,0.25)_inset,-1px_1px_4px_rgba(0,0,0,0.2)_inset,-1px_-1px_6px_rgba(255,255,255,0.12),2px_2px_5px_rgba(0,0,0,0.15),-2px_-1px_2px_rgba(255,255,255,0.2)_inset,2px_4px_12px_-4px_rgba(0,0,0,0.4)] z-20 tgl-knob-shadow ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-0 rounded-full [filter:blur(3px)] transition-all duration-[var(--transition)] ease-[var(--ease)] ${
            isActive ? '[filter:blur(0px)]' : ''
          }`}
        />
        <div
          className={`absolute inset-0 rounded-full bg-white transition-opacity duration-[var(--transition)] ease-out tgl-knob-cover ${
            isActive ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            boxShadow: checked
              ? 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.08), 0 2px 8px rgba(99,102,241,0.45), 0 1px 2px rgba(0,0,0,0.2)'
              : 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </button>
  );
};
