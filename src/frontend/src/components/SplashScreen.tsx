import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 50));
    timers.push(setTimeout(() => setPhase(2), 400));
    timers.push(setTimeout(() => setPhase(3), 1200));
    timers.push(setTimeout(() => setPhase(4), 2000));
    timers.push(setTimeout(() => setExiting(true), 3000));
    timers.push(setTimeout(() => onComplete(), 3600));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const sparks = Array.from({ length: 14 }, (_, i) => i);

  return (
    <div className={`splash-root${exiting ? " splash-exit" : ""}`}>
      {/* Grid background */}
      <div className="splash-grid" />

      {/* Radial glow */}
      <div className="splash-glow" />

      {/* Sparks */}
      <div className="splash-sparks">
        {sparks.map((i) => (
          <div
            key={i}
            className={`spark${phase >= 1 ? " spark-fire" : ""}`}
            style={
              { "--spark-angle": `${(i / 14) * 360}deg` } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Center blast ring */}
      <div className={`blast-ring${phase >= 1 ? " blast-ring-fire" : ""}`} />
      <div
        className={`blast-ring blast-ring-2${phase >= 1 ? " blast-ring-fire" : ""}`}
      />

      {/* Content */}
      <div className="splash-content">
        {/* Company name */}
        <div
          className={`splash-company${phase >= 2 ? " splash-company-in" : ""}`}
        >
          <span className="splash-company-top">PAVITHRA</span>
          <span className="splash-company-bottom">EXPLOSIVES</span>
        </div>

        {/* Divider line */}
        <div
          className={`splash-divider${phase >= 3 ? " splash-divider-in" : ""}`}
        />

        {/* Tagline */}
        <div
          className={`splash-tagline${phase >= 3 ? " splash-tagline-in" : ""}`}
        >
          Precision.&nbsp; Power.&nbsp; Delivery.
        </div>

        {/* Sweep loader + subtitle */}
        <div
          className={`splash-loader-wrap${phase >= 4 ? " splash-loader-wrap-in" : ""}`}
        >
          <div className="splash-loader-bar">
            <div
              className={`splash-loader-fill${phase >= 4 ? " splash-loader-fill-run" : ""}`}
            />
          </div>
          <div className="splash-subtitle">Order Management System</div>
        </div>
      </div>
    </div>
  );
}
