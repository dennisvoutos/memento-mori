import { useState } from 'react';
import { FireOutlined } from '@ant-design/icons';
import './CandleButton.css';

interface CandleButtonProps {
  count: number;
  onLight: () => Promise<void>;
}

export function CandleButton({ count, onLight }: CandleButtonProps) {
  const [isLit, setIsLit] = useState(false);
  const [localCount, setLocalCount] = useState(count);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLit || isLoading) return;
    setIsLoading(true);
    try {
      await onLight();
      setIsLit(true);
      setLocalCount((c) => c + 1);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`candle-button ${isLit ? 'candle-lit' : ''}`}
      onClick={handleClick}
      disabled={isLit || isLoading}
      type="button"
    >
      <span className="candle-emoji"><FireOutlined /></span>
      <span className="candle-label">
        {isLit ? 'Candle Lit' : 'Light a Candle'}
      </span>
      <span className="candle-count">{localCount}</span>
      {isLit && <span className="candle-glow" />}
    </button>
  );
}
