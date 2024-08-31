import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TokenizerMasterVisualizer = () => {
  const [text, setText] = useState("কে নিলো কাকে ? ");
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
      
      // Create token pairs and count their frequencies
      for (let i = 0; i < prevTokens.length - 1; i++) {
        const pair = `${prevTokens[i].char}${prevTokens[i + 1].char}`;
        tokenPairs[pair] = (tokenPairs[pair] || 0) + 1;
      }

      // Check if there are no pairs to merge
      if (Object.keys(tokenPairs).length === 0) {
        updateExplanation("No more merges can be performed as there are no adjacent token pairs. It's like trying to combine two separate islands that have no bridges connecting them.");
        return prevTokens; // No merges can be performed, return current tokens
      }

      // Find the most frequent token pair
      const mostFrequent = Object.entries(tokenPairs).reduce((a, b) => a[1] > b[1] ? a : b);
      const [newToken, frequency] = mostFrequent;
      const newId = Math.max(...prevTokens.map(t => t.id)) + 1;

      const updatedTokens = [];
      let i = 0;

      // Merge the most frequent token pair
      while (i < prevTokens.length) {
        if (i < prevTokens.length - 1 && `${prevTokens[i].char}${prevTokens[i + 1].char}` === newToken) {
          updatedTokens.push({ char: newToken, id: newId });
          i += 2; // Skip the next token as it has been merged
        } else {
          updatedTokens.push(prevTokens[i]);
          i++;
        }
      }

      // Update merges and statistics
      setMerges(prev => ({ ...prev, [newToken]: { id: newId, frequency } }));
      setVocabSize(prev => prev + 1);
      setStep(prev => prev + 1);
      setCompressionRatio(text.length / updatedTokens.length);

      // Update explanation for the merge
      updateExplanation(`Merged tokens '${newToken}' (frequency: ${frequency}) to create a new token with ID: ${newId}. Think of it as combining two popular ingredients in a recipe to create a new dish that everyone loves!`);
      
      return updatedTokens;
    });
  };

  const renderTokens = () => {
    return tokens.map((token, index) => (
      <span 
        key={index} 
        style={{
          backgroundColor: `hsl(${token.id % 360}, 70%, 80%)`,
          padding: '4px 8px',
          margin: '0 4px',
          borderRadius: '8px',
          fontSize: `${Math.min(20, 12 + token.char.length * 2)}px`,
          transition: 'transform 0.2s',
          cursor: 'pointer',
        }}
        title={`ID: ${token.id}`}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {token.char}
      </span>
    ));
  };

  const renderView = () => {
    switch(view) {
      case 'tokens':
        return (
          <div className="border p-4 rounded-lg bg-white shadow-md min-h-[100px]">
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

  const updateExplanation = (customMessage) => {
    const explanations = [
      "Tokenization begins by breaking down a sentence into its smallest parts, like taking apart a puzzle to see each individual piece.",
      "Next, we look for the most common pairs of these pieces, similar to spotting the most frequently used two-letter combinations in words, like 'th' or 'he'.",
      "When we find a common pair, we combine them into a new piece, which reduces the total number of pieces, just like merging two similar puzzle pieces to make the puzzle easier to complete.",
      "This process continues, gradually creating a collection of common pairs, much like a gardener planting seeds that grow into a variety of plants over time.",
      "As we combine more pieces, the overall picture becomes clearer and simpler, similar to how organizing your closet makes it easier to find what you need.",
      "However, there’s a balance to maintain: if we create too many new pieces, it can become complicated, just like having too many ingredients in a recipe can make it hard to follow."
    ];

    // If a custom message is provided, use it; otherwise, use the predefined explanations
    if (customMessage) {
      setExplanation(customMessage);
    } else {
      setExplanation(explanations[Math.min(step, explanations.length - 1)]);
    }
  };

  useEffect(updateExplanation, [step]);

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center">Tokenizer Master Visualizer</h2>
      
      <div className="mb-6">
        <input 
          type="text" 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter text for tokenization"
        />
        <button 
          onClick={initializeTokens}
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Reset
        </button>
      </div>
      
      <div className="mb-6 flex justify-between">
        <button 
          onClick={performMerge} 
          disabled={step >= 20} 
          className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition mr-2"
        >
          Perform Merge
        </button>
        <button 
          onClick={() => setAutoPlay(!autoPlay)} 
          className={`${autoPlay ? 'bg-red-600' : 'bg-blue-600'} text-white px-4 py-2 rounded-lg shadow hover:bg-opacity-80 transition`}
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
          aria-label="Adjust speed of auto play"
        />
        <span className="ml-2">{speed}ms</span>
      </div>
      
      <div className="mb-6 flex justify-center">
        <button 
          onClick={() => setView('tokens')} 
          className={`mr-2 ${view === 'tokens' ? 'bg-blue-600 text-white' : 'bg-gray-300'} px-4 py-2 rounded-lg shadow transition`}
        >
          Tokens
        </button>
        <button 
          onClick={() => setView('merges')} 
          className={`mr-2 ${view === 'merges' ? 'bg-blue-600 text-white' : 'bg-gray-300'} px-4 py-2 rounded-lg shadow transition`}
        >
          Merges
        </button>
        <button 
          onClick={() => setView('compression')} 
          className={`${view === 'compression' ? 'bg-blue-600 text-white' : 'bg-gray-300'} px-4 py-2 rounded-lg shadow transition`}
        >
          Compression
        </button>
      </div>
      
      <div className="mb-6">
        {renderView()}
      </div>
      
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-xl font-semibold">Statistics:</h3>
        <p>Step: {step}</p>
        <p>Vocabulary Size: {vocabSize}</p>
        <p>Number of Tokens: {tokens.length}</p>
        <p>Compression Ratio: {compressionRatio.toFixed(2)}</p>
      </div>
      
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-xl font-semibold">Explanation:</h3>
        <p>{explanation}</p>
      </div>
    </div>
  );
};

// PropTypes for better type checking
TokenizerMasterVisualizer.propTypes = {
  text: PropTypes.string,
  tokens: PropTypes.array,
  merges: PropTypes.object,
  step: PropTypes.number,
  vocabSize: PropTypes.number,
  compressionRatio: PropTypes.number,
  view: PropTypes.string,
  autoPlay: PropTypes.bool,
  speed: PropTypes.number,
  explanation: PropTypes.string,
};

export default TokenizerMasterVisualizer;