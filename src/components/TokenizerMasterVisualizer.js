import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TokenizerMasterVisualizer = () => {
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog.");
  const [tokens, setTokens] = useState([]);
  const [merges, setMerges] = useState({});
  const [step, setStep] = useState(0);
  const [vocabSize, setVocabSize] = useState(0);
  const [compressionRatio, setCompressionRatio] = useState(1);
  const [view, setView] = useState('tokens');
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [explanation, setExplanation] = useState('');

  const initializeTokens = useCallback(() => {
    const initialTokens = text.split('').map(char => ({ char, id: char.charCodeAt(0) }));
    setTokens(initialTokens);
    setVocabSize(new Set(initialTokens.map(t => t.id)).size);
    setMerges({});
    setStep(0);
    setCompressionRatio(1);
  }, [text]);

  useEffect(() => {
    initializeTokens();
  }, [initializeTokens]);

  useEffect(() => {
    let timer;
    if (autoPlay) {
      timer = setInterval(() => {
        performMerge();
      }, speed);
    }
    return () => clearInterval(timer);
  }, [autoPlay, speed]);

  const performMerge = () => {
    if (step >= 20) return;

    setTokens(prevTokens => {
      const tokenPairs = {};
      for (let i = 0; i < prevTokens.length - 1; i++) {
        const pair = `${prevTokens[i].char}${prevTokens[i+1].char}`;
        tokenPairs[pair] = (tokenPairs[pair] || 0) + 1;
      }

      const mostFrequent = Object.entries(tokenPairs).reduce((a, b) => a[1] > b[1] ? a : b);
      const [newToken, frequency] = mostFrequent;
      const newId = Math.max(...prevTokens.map(t => t.id)) + 1;

      const updatedTokens = [];
      for (let i = 0; i < prevTokens.length; i++) {
        if (i < prevTokens.length - 1 && `${prevTokens[i].char}${prevTokens[i+1].char}` === newToken) {
          updatedTokens.push({ char: newToken, id: newId });
          i++;
        } else {
          updatedTokens.push(prevTokens[i]);
        }
      }

      setMerges(prev => ({ ...prev, [newToken]: { id: newId, frequency } }));
      setVocabSize(prev => prev + 1);
      setStep(prev => prev + 1);
      setCompressionRatio(text.length / updatedTokens.length);

      return updatedTokens;
    });
  };

  const renderTokens = () => {
    return tokens.map((token, index) => (
      <span 
        key={index} 
        style={{
          backgroundColor: `hsl(${token.id % 360}, 70%, 80%)`,
          padding: '2px 4px',
          margin: '0 2px',
          borderRadius: '4px',
          fontSize: `${Math.min(20, 12 + token.char.length * 2)}px`
        }}
        title={`ID: ${token.id}`}
      >
        {token.char}
      </span>
    ));
  };

  const renderView = () => {
    switch(view) {
      case 'tokens':
        return (
          <div className="border p-2 rounded bg-white min-h-[100px]">
            {renderTokens()}
          </div>
        );
      case 'merges':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(merges).map(([token, { frequency }]) => ({ token, frequency }))}>
              <XAxis dataKey="token" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="frequency" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'compression':
        const compressionData = Array(step + 1).fill().map((_, i) => ({
          step: i,
          ratio: i === 0 ? 1 : text.length / (text.length - i)
        }));
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={compressionData}>
              <XAxis dataKey="step" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ratio" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const updateExplanation = () => {
    const explanations = [
      "Tokenization starts with individual characters as tokens.",
      "The most frequent pair of adjacent tokens is identified.",
      "This pair is merged to create a new token, reducing the total number of tokens.",
      "The process repeats, gradually building a vocabulary of common sequences.",
      "As merges occur, the text can be represented more efficiently.",
      "The trade-off is between vocabulary size and compression efficiency."
    ];
    setExplanation(explanations[Math.min(step, explanations.length - 1)]);
  };

  useEffect(updateExplanation, [step]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Tokenizer Master Visualizer</h2>
      
      <div className="mb-4">
        <input 
          type="text" 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          className="w-full p-2 border rounded"
        />
        <button 
          onClick={initializeTokens}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Reset
        </button>
      </div>
      
      <div className="mb-4">
        <button 
          onClick={performMerge} 
          disabled={step >= 20} 
          className="bg-green-500 text-white px-4 py-2 rounded mr-2"
        >
          Perform Merge
        </button>
        <button 
          onClick={() => setAutoPlay(!autoPlay)} 
          className={`${autoPlay ? 'bg-red-500' : 'bg-blue-500'} text-white px-4 py-2 rounded`}
        >
          {autoPlay ? 'Stop' : 'Auto Play'}
        </button>
        <input 
          type="range" 
          min="100" 
          max="2000" 
          value={speed} 
          onChange={(e) => setSpeed(Number(e.target.value))} 
          className="ml-4"
        />
        <span className="ml-2">{speed}ms</span>
      </div>
      
      <div className="mb-4">
        <button 
          onClick={() => setView('tokens')} 
          className={`mr-2 ${view === 'tokens' ? 'bg-blue-500 text-white' : 'bg-gray-300'} px-4 py-2 rounded`}
        >
          Tokens
        </button>
        <button 
          onClick={() => setView('merges')} 
          className={`mr-2 ${view === 'merges' ? 'bg-blue-500 text-white' : 'bg-gray-300'} px-4 py-2 rounded`}
        >
          Merges
        </button>
        <button 
          onClick={() => setView('compression')} 
          className={`${view === 'compression' ? 'bg-blue-500 text-white' : 'bg-gray-300'} px-4 py-2 rounded`}
        >
          Compression
        </button>
      </div>
      
      <div className="mb-4">
        {renderView()}
      </div>
      
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Statistics:</h3>
        <p>Step: {step}</p>
        <p>Vocabulary Size: {vocabSize}</p>
        <p>Number of Tokens: {tokens.length}</p>
        <p>Compression Ratio: {compressionRatio.toFixed(2)}</p>
      </div>
      
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Explanation:</h3>
        <p>{explanation}</p>
      </div>
    </div>
  );
};

export default TokenizerMasterVisualizer;
