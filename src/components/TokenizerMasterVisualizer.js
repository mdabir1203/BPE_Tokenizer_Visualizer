import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const useDebounce = (fn: Function, delay: number) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback((...args: any[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
};

// Constants and Types
const MAX_STEPS = 20;
const DEFAULT_SPEED = 1000;
const MIN_SPEED = 100;
const MAX_SPEED = 2000;

interface Token {
  char: string;
  id: number;
  frequency?: number;
  metadata?: Record<string, unknown>;
}

interface MergeHistory {
  tokens: Token[];
  compressionRatio: number;
  timestamp: number;
}

interface StatsProps {
  stats: Record<string, number | string>;
}

// Components
const TokenDisplay: React.FC<{token: Token; onHover: (t: Token) => void}> = React.memo(({ token, onHover }) => (
  <span 
    className="inline-block px-2 py-1 m-1 rounded-lg transition-transform duration-200 hover:scale-105 cursor-pointer"
    style={{
      backgroundColor: `hsl(${token.id % 360}, 70%, 80%)`,
      fontSize: `${Math.min(20, 12 + token.char.length * 2)}px`,
    }}
    onMouseEnter={() => onHover(token)}
    role="button"
    tabIndex={0}
    aria-label={`Token ${token.char} with ID ${token.id}`}
  >
    {token.char}
  </span>
));

const StatsPanel: React.FC<StatsProps> = ({ stats }) => (
  <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg shadow">
    {Object.entries(stats).map(([key, value]) => (
      <div key={key} className="flex justify-between">
        <span className="font-medium">{key}:</span>
        <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
      </div>
    ))}
  </div>
);

const TokenizerMasterVisualizer: React.FC = () => {
  const [text, setText] = useState("কে নিলো কাকে ? ");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [mergeHistory, setMergeHistory] = useState<MergeHistory[]>([]);
  const [step, setStep] = useState(0);
  const [view, setView] = useState('tokens');
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const initialize = useCallback(() => {
    const initialTokens = text.split('').map(char => ({ 
      char, 
      id: char.charCodeAt(0),
      frequency: 1 
    }));
    
    setTokens(initialTokens);
    setMergeHistory([{
      tokens: initialTokens,
      compressionRatio: 1,
      timestamp: Date.now()
    }]);
    setStep(0);
  }, [text]);

  const findOptimalMerge = useCallback((currentTokens: Token[]) => {
    const frequencies = new Map<string, number>();
    
    for (let i = 0; i < currentTokens.length - 1; i++) {
      const pair = `${currentTokens[i].char}${currentTokens[i + 1].char}`;
      frequencies.set(pair, (frequencies.get(pair) || 0) + 1);
    }

    let maxFreq = 0;
    let optimalPair = '';
    
    frequencies.forEach((freq, pair) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        optimalPair = pair;
      }
    });

    return { pair: optimalPair, frequency: maxFreq };
  }, []);

  const debouncedTextUpdate = useDebounce((newText: string) => {
    setText(newText);
    initialize();
  }, 300);

  const performMerge = useCallback(() => {
    if (step >= MAX_STEPS) return;

    setTokens(prevTokens => {
      const { pair, frequency } = findOptimalMerge(prevTokens);
      if (!pair || !frequency) return prevTokens;

      const newId = Math.max(...prevTokens.map(t => t.id)) + 1;
      const newTokens: Token[] = [];
      let i = 0;

      while (i < prevTokens.length) {
        if (i < prevTokens.length - 1 && 
            `${prevTokens[i].char}${prevTokens[i + 1].char}` === pair) {
          newTokens.push({
            char: pair,
            id: newId,
            frequency,
            metadata: {
              merged: true,
              originalTokens: [prevTokens[i], prevTokens[i + 1]]
            }
          });
          i += 2;
        } else {
          newTokens.push(prevTokens[i]);
          i++;
        }
      }

      setMergeHistory(prev => [...prev, {
        tokens: newTokens,
        compressionRatio: text.length / newTokens.length,
        timestamp: Date.now()
      }]);

      return newTokens;
    });

    setStep(prev => prev + 1);
  }, [step, findOptimalMerge, text.length]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (autoPlay) {
      timerRef.current = setInterval(performMerge, speed);
    }
    return () => clearInterval(timerRef.current);
  }, [autoPlay, speed, performMerge]);

  const stats = useMemo(() => ({
    'Step': step,
    'Vocabulary Size': new Set(tokens.map(t => t.id)).size,
    'Token Count': tokens.length,
    'Compression Ratio': text.length / tokens.length
  }), [step, tokens, text]);

  const chartData = useMemo(() => ({
    merges: Object.entries(tokens.reduce((acc: Record<string, number>, token) => {
      if (token.frequency) acc[token.char] = token.frequency;
      return acc;
    }, {})),
    compression: mergeHistory.map((hist, idx) => ({
      step: idx,
      ratio: hist.compressionRatio
    }))
  }), [tokens, mergeHistory]);

  return (
    <div ref={containerRef} className="p-6 bg-gray-100 rounded-lg shadow-lg">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-center">Tokenizer Master</h1>
        <div className="relative mt-4">
          <input 
            type="text"
            value={text}
            onChange={e => debouncedTextUpdate(e.target.value)}
            className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
            aria-label="Input text for tokenization"
          />
        </div>
      </header>

      <main>
        <div className="flex gap-4 mb-6">
          <button
            onClick={performMerge}
            disabled={step >= MAX_STEPS}
            className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
          >
            Merge
          </button>
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className={`px-4 py-2 rounded-lg ${autoPlay ? 'bg-red-600' : 'bg-blue-600'} text-white`}
          >
            {autoPlay ? 'Stop' : 'Play'}
          </button>
          <input
            type="range"
            min={MIN_SPEED}
            max={MAX_SPEED}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="flex-grow"
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-center gap-4 mb-4">
            <button 
              onClick={() => setView('tokens')} 
              className={`px-4 py-2 rounded-lg ${view === 'tokens' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Tokens
            </button>
            <button 
              onClick={() => setView('merges')} 
              className={`px-4 py-2 rounded-lg ${view === 'merges' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Merges
            </button>
            <button 
              onClick={() => setView('compression')} 
              className={`px-4 py-2 rounded-lg ${view === 'compression' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Compression
            </button>
          </div>

          {view === 'tokens' && (
            <div className="p-4 bg-white rounded-lg min-h-[100px]">
              {tokens.map((token, idx) => (
                <TokenDisplay
                  key={`${token.id}-${idx}`}
                  token={token}
                  onHover={setSelectedToken}
                />
              ))}
            </div>
          )}
          {view === 'merges' && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.merges}>
                <XAxis dataKey="0" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="1" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
          {view === 'compression' && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.compression}>
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ratio" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatsPanel stats={stats} />
          {selectedToken && (
            <div className="p-4 bg-white rounded-lg">
              <h3 className="font-bold">Token Details</h3>
              <pre className="mt-2 text-sm">
                {JSON.stringify(selectedToken, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TokenizerMasterVisualizer;
