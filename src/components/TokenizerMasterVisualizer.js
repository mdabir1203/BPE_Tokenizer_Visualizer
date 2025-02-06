import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HelpCircle, Play, Pause, ChevronRight, RotateCw, Eye } from 'lucide-react';

// Constants
const MAX_STEPS = 20;
const DEFAULT_SPEED = 1000;
const MIN_SPEED = 100;
const MAX_SPEED = 2000;

// Custom hook for debouncing
const useDebounce = (fn, delay) => {
  const timeoutRef = useRef();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
};

const TokenDisplay = React.memo(({ token, onHover }) => (
  <div 
    className="group relative transform transition-all duration-300 hover:scale-110"
    onMouseEnter={() => onHover(token)}
    role="button"
    tabIndex={0}
    aria-label={`Token ${token.char} with frequency ${token.frequency}`}
  >
    <div className="absolute inset-0 bg-blue-500 rounded-xl transform rotate-3 translate-x-1 translate-y-1 group-hover:rotate-6 transition-transform" />
    <div 
      className="relative p-3 rounded-xl shadow-lg transform transition-transform bg-white border-2 border-gray-200 hover:-translate-y-1"
      style={{
        backgroundColor: `hsl(${token.id % 360}, 70%, 95%)`,
      }}
    >
      <span className="text-lg font-semibold">{token.char}</span>
      {token.frequency && (
        <span className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full px-2 py-1 text-xs">
          {token.frequency}
        </span>
      )}
    </div>
  </div>
));

const InfoBox = ({ title, children }) => (
  <div className="relative p-6 bg-white rounded-xl shadow-lg border-2 border-gray-100">
    <div className="absolute -top-3 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
      {title}
    </div>
    {children}
  </div>
);

const StatsPanel = ({ stats }) => (
  <div className="space-y-2">
    {Object.entries(stats).map(([key, value]) => (
      <div key={key} className="flex justify-between items-center">
        <span className="text-gray-600">{key}:</span>
        <span className="font-semibold">
          {typeof value === 'number' ? value.toFixed(2) : value}
        </span>
      </div>
    ))}
  </div>
);

const TokenizerMasterVisualizer = () => {
  const [text, setText] = useState("কে নিলো কাকে ?");
  const [tokens, setTokens] = useState([]);
  const [mergeHistory, setMergeHistory] = useState([]);
  const [step, setStep] = useState(0);
  const [view, setView] = useState('tokens');
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [selectedToken, setSelectedToken] = useState(null);

  const timerRef = useRef();

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

  const findOptimalMerge = useCallback((currentTokens) => {
    const frequencies = new Map();
    
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

  const debouncedTextUpdate = useDebounce((newText) => {
    setText(newText);
    initialize();
  }, 300);

  const performMerge = useCallback(() => {
    if (step >= MAX_STEPS) return;

    setTokens(prevTokens => {
      const { pair, frequency } = findOptimalMerge(prevTokens);
      if (!pair || !frequency) return prevTokens;

      const newId = Math.max(...prevTokens.map(t => t.id)) + 1;
      const newTokens = [];
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
    merges: Object.entries(tokens.reduce((acc, token) => {
      if (token.frequency) acc[token.char] = token.frequency;
      return acc;
    }, {})),
    compression: mergeHistory.map((hist, idx) => ({
      step: idx,
      ratio: hist.compressionRatio
    }))
  }), [tokens, mergeHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Tokenizer Master</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Visualize how text gets broken down into tokens and merged back together.
            Watch the compression ratio improve with each merge step.
          </p>
        </header>

        <div className="mb-8">
          <InfoBox title="Input">
            <div className="relative">
              <input 
                type="text"
                value={text}
                onChange={e => debouncedTextUpdate(e.target.value)}
                className="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="Enter text to tokenize..."
                aria-label="Input text for tokenization"
              />
              <HelpCircle className="absolute right-4 top-4 text-gray-400" />
            </div>
          </InfoBox>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <InfoBox title="Controls">
            <div className="flex flex-col gap-4">
              <button
                onClick={performMerge}
                disabled={step >= MAX_STEPS}
                className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg disabled:opacity-50 hover:from-blue-600 hover:to-blue-700 transition-colors"
              >
                <ChevronRight />
                Merge Tokens
              </button>
              <button
                onClick={() => setAutoPlay(!autoPlay)}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg shadow-lg text-white transition-colors
                  ${autoPlay ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-green-600'}`}
              >
                {autoPlay ? <Pause /> : <Play />}
                {autoPlay ? 'Stop' : 'Play Animation'}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Speed:</span>
                <input
                  type="range"
                  min={MIN_SPEED}
                  max={MAX_SPEED}
                  value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="flex-grow"
                />
              </div>
            </div>
          </InfoBox>

          <InfoBox title="Statistics">
            <StatsPanel stats={stats} />
          </InfoBox>

          <InfoBox title="Selected Token">
            {selectedToken ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold">{selectedToken.char}</p>
                <p className="text-sm text-gray-600">ID: {selectedToken.id}</p>
                <p className="text-sm text-gray-600">Frequency: {selectedToken.frequency}</p>
              </div>
            ) : (
              <p className="text-gray-500">Hover over a token to see details</p>
            )}
          </InfoBox>
        </div>

        <div className="mb-8">
          <div className="flex justify-center gap-4 mb-6">
            {['tokens', 'merges', 'compression'].map((viewType) => (
              <button 
                key={viewType}
                onClick={() => setView(viewType)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg shadow-md transition-all
                  ${view === viewType 
                    ? 'bg-blue-500 text-white transform -translate-y-1' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Eye size={18} />
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 min-h-[400px]">
            {view === 'tokens' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                  <Bar dataKey="1" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {view === 'compression' && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.compression}>
                  <XAxis dataKey="step" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="ratio" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenizerMasterVisualizer;
