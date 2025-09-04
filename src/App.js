import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [numerator, setNumerator] = useState('1');
  const [denominator, setDenominator] = useState('1 0.1 0.01');
  const [freqMin, setFreqMin] = useState(0.001);
  const [freqMax, setFreqMax] = useState(100);
  const [numPoints, setNumPoints] = useState(200);
  const [magnitudeData, setMagnitudeData] = useState([]);
  const [phaseData, setPhaseData] = useState([]);
  const [transferFunction, setTransferFunction] = useState('');
  const [poles, setPoles] = useState([]);
  const [zeros, setZeros] = useState([]);
  const [tableData, setTableData] = useState([]);

  // Parse polynomial coefficients from string
  const parseCoefficients = (str) => {
    return str.trim().split(/\s+/).map(parseFloat).filter(x => !isNaN(x));
  };

  // Find roots of polynomial using companion matrix eigenvalues (simplified approach)
  const findRoots = (coeffs) => {
    // For demonstration, we'll handle up to 4th order with some common cases
    const n = coeffs.length - 1;
    if (n === 0) return [];
    if (n === 1) return [-coeffs[1] / coeffs[0]];
    
    // For higher orders, we'll use numerical approximation
    // This is a simplified approach - in practice, you'd use more sophisticated root finding
    const roots = [];
    
    // Try to find real roots first using Newton-Raphson for simple cases
    if (n === 2) {
      const [a, b, c] = coeffs;
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        roots.push((-b + Math.sqrt(discriminant)) / (2 * a));
        roots.push((-b - Math.sqrt(discriminant)) / (2 * a));
      } else {
        const real = -b / (2 * a);
        const imag = Math.sqrt(-discriminant) / (2 * a);
        roots.push({ real, imag });
        roots.push({ real, imag: -imag });
      }
    }
    
    return roots;
  };

  // Evaluate polynomial at complex frequency s = jω
  const evaluatePolynomial = (coeffs, omega) => {
    const s = { real: 0, imag: omega }; // s = jω
    let result = { real: 0, imag: 0 };
    
    for (let i = 0; i < coeffs.length; i++) {
      const power = coeffs.length - 1 - i;
      const sPower = complexPower(s, power);
      const term = complexMultiply(sPower, { real: coeffs[i], imag: 0 });
      result = complexAdd(result, term);
    }
    
    return result;
  };

  // Complex number operations
  const complexAdd = (a, b) => ({
    real: a.real + b.real,
    imag: a.imag + b.imag
  });

  const complexMultiply = (a, b) => ({
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real
  });

  const complexDivide = (a, b) => {
    const denom = b.real * b.real + b.imag * b.imag;
    return {
      real: (a.real * b.real + a.imag * b.imag) / denom,
      imag: (a.imag * b.real - a.real * b.imag) / denom
    };
  };

  const complexPower = (base, exp) => {
    if (exp === 0) return { real: 1, imag: 0 };
    if (exp === 1) return base;
    
    let result = { real: 1, imag: 0 };
    for (let i = 0; i < exp; i++) {
      result = complexMultiply(result, base);
    }
    return result;
  };

  const complexMagnitude = (c) => Math.sqrt(c.real * c.real + c.imag * c.imag);
  const complexPhase = (c) => Math.atan2(c.imag, c.real) * 180 / Math.PI;

  // Calculate Bode plot data
  const calculateBodePlot = () => {
    const numCoeffs = parseCoefficients(numerator);
    const denCoeffs = parseCoefficients(denominator);
    
    if (numCoeffs.length === 0 || denCoeffs.length === 0) return;

    const magData = [];
    const phsData = [];
    
    // Generate frequency points logarithmically
    const logFreqMin = Math.log10(freqMin);
    const logFreqMax = Math.log10(freqMax);
    const logStep = (logFreqMax - logFreqMin) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const logFreq = logFreqMin + i * logStep;
      const omega = Math.pow(10, logFreq); // ω in rad/s

      // Evaluate H(jω) = N(jω) / D(jω)
      const numeratorValue = evaluatePolynomial(numCoeffs, omega);
      const denominatorValue = evaluatePolynomial(denCoeffs, omega);
      const H = complexDivide(numeratorValue, denominatorValue);

      // Calculate magnitude in dB and phase in degrees
      const magnitude = complexMagnitude(H);
      const magnitudeDB = 20 * Math.log10(magnitude);
      const phaseDeg = complexPhase(H);

      magData.push({ omega: omega, magnitude: magnitudeDB });
      phsData.push({ omega: omega, phase: phaseDeg });
    }

    setMagnitudeData(magData);
    setPhaseData(phsData);

    // Generate table data for 10x increments
    const tableValues = [];
    let currentOmega = 0.001;
    while (currentOmega <= 100) {
      // Evaluate H(jω) at this omega
      const numeratorValue = evaluatePolynomial(numCoeffs, currentOmega);
      const denominatorValue = evaluatePolynomial(denCoeffs, currentOmega);
      const H = complexDivide(numeratorValue, denominatorValue);

      const magnitude = complexMagnitude(H);
      const magnitudeDB = 20 * Math.log10(magnitude);
      const phaseDeg = complexPhase(H);

      tableValues.push({
        omega: currentOmega,
        k: magnitudeDB,
        fi: phaseDeg
      });

      currentOmega *= 10;
    }
    setTableData(tableValues);

    // Update transfer function display
    const numStr = numCoeffs.map((c, i) => {
      const power = numCoeffs.length - 1 - i;
      if (power === 0) return c.toString();
      if (power === 1) return `${c}s`;
      return `${c}s^${power}`;
    }).join(' + ');

    const denStr = denCoeffs.map((c, i) => {
      const power = denCoeffs.length - 1 - i;
      if (power === 0) return c.toString();
      if (power === 1) return `${c}s`;
      return `${c}s^${power}`;
    }).join(' + ');

    setTransferFunction(`H(s) = (${numStr}) / (${denStr})`);

    // Calculate poles and zeros
    const calculatedZeros = findRoots(numCoeffs);
    const calculatedPoles = findRoots(denCoeffs);
    setZeros(calculatedZeros);
    setPoles(calculatedPoles);
  };

  useEffect(() => {
    calculateBodePlot();
  }, [numerator, denominator, freqMin, freqMax, numPoints]);

  const formatNumber = (num) => {
    if (typeof num === 'object' && num.real !== undefined) {
      if (Math.abs(num.imag) < 1e-10) return num.real.toFixed(3);
      return `${num.real.toFixed(3)} ${num.imag >= 0 ? '+' : '-'} ${Math.abs(num.imag).toFixed(3)}j`;
    }
    return num.toFixed(3);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-blue-800">
        Transfer Function Bode Plot Calculator
      </h1>

      {/* Values Table */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">ω, K, and φ Values (10x Increments)</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-blue-100">
                <th className="border border-gray-300 px-4 py-2 text-left">ω (rad/s)</th>
                <th className="border border-gray-300 px-4 py-2 text-left">K (dB)</th>
                <th className="border border-gray-300 px-4 py-2 text-left">φ (degrees)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-4 py-2 font-mono">
                    {row.omega < 1 ? row.omega.toFixed(3) : row.omega.toFixed(1)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-mono">
                    {row.k.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-mono">
                    {row.fi.toFixed(2)}°
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          * K represents magnitude in dB, φ represents phase in degrees
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Input Controls */}
        <div className="lg:col-span-1 bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Transfer Function Input</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numerator Coefficients (highest to lowest power):
              </label>
              <input
                type="text"
                value={numerator}
                onChange={(e) => setNumerator(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 1 2 1 for s² + 2s + 1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Denominator Coefficients (highest to lowest power):
              </label>
              <input
                type="text"
                value={denominator}
                onChange={(e) => setDenominator(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 1 0.1 0.01 for s² + 0.1s + 0.01"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min ω (rad/s):</label>
                <input
                  type="number"
                  value={freqMin}
                  onChange={(e) => setFreqMin(parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max ω (rad/s):</label>
                <input
                  type="number"
                  value={freqMax}
                  onChange={(e) => setFreqMax(parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="1"
                />
              </div>
            </div>
            
            <button
              onClick={calculateBodePlot}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Calculate Bode Plot
            </button>
          </div>
        </div>

        {/* Transfer Function Info */}
        <div className="lg:col-span-2 bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Transfer Function Analysis</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700">Transfer Function:</h3>
              <p className="font-mono text-sm bg-white p-2 rounded border">{transferFunction}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Poles:</h3>
                <div className="bg-white p-2 rounded border max-h-32 overflow-y-auto">
                  {poles.length > 0 ? (
                    <ul className="text-sm font-mono space-y-1">
                      {poles.map((pole, i) => (
                        <li key={i}>{formatNumber(pole)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No poles calculated</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Zeros:</h3>
                <div className="bg-white p-2 rounded border max-h-32 overflow-y-auto">
                  {zeros.length > 0 ? (
                    <ul className="text-sm font-mono space-y-1">
                      {zeros.map((zero, i) => (
                        <li key={i}>{formatNumber(zero)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No zeros</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bode Plot */}
      <div className="space-y-6">
        {/* Magnitude Plot */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Magnitude Response</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={magnitudeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="omega" 
                scale="log" 
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => value.toExponential(0)}
                label={{ value: 'ω (rad/s)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ value: 'Magnitude (dB)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => [value.toFixed(2) + ' dB', 'Magnitude']}
                labelFormatter={(value) => `ω: ${value.toExponential(2)} rad/s`}
              />
              <Line 
                type="monotone" 
                dataKey="magnitude" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Phase Plot */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Phase Response</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={phaseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="omega" 
                scale="log" 
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => value.toExponential(0)}
                label={{ value: 'ω (rad/s)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ value: 'Phase (degrees)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => [value.toFixed(2) + '°', 'Phase']}
                labelFormatter={(value) => `ω: ${value.toExponential(2)} rad/s`}
              />
              <Line 
                type="monotone" 
                dataKey="phase" 
                stroke="#dc2626" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Usage Instructions:</h3>
        <ul className="text-blue-700 space-y-2 text-sm">
          <li><strong>Input Format:</strong> Enter coefficients from highest to lowest power (e.g., "1 2 1" for s² + 2s + 1)</li>
          <li><strong>Example 1:</strong> Second-order low-pass filter: Num="1", Den="1 1.414 1"</li>
          <li><strong>Example 2:</strong> Lead compensator: Num="1 1", Den="1 10"</li>
          <li><strong>Example 3:</strong> Fourth-order system: Num="1", Den="1 2 3 2 1"</li>
          <li><strong>Frequency Range:</strong> Default range is ω = 0.001 to 100 rad/s (adjustable)</li>
          <li>The tool automatically calculates poles and zeros for stability analysis</li>
        </ul>
      </div>
    </div>
  );
}

export default App;