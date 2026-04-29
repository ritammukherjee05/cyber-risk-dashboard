import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import domToImage from 'dom-to-image-more';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]); 
  
  const reportRef = useRef();

  // Handle URL parameters for Auto-Scanning (?url=github.com)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    
    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam);
      setUrl(decodedUrl);
      runAutoScan(decodedUrl);
    }
  }, []);

  const runAutoScan = async (targetUrl) => {
    setLoading(true);
    setResult(null);
    setLogs([
      `[INIT] Auto-scan detected for ${targetUrl}...`,
      `[INFO] Resolving DNS and establishing handshake...`
    ]);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const response = await axios.post('https://cyber-risk-dashboard-64np.onrender.com/api/scan', { url: targetUrl });
      console.log("Testing Render connection...");
      setLogs(prev => [...prev, "[SUCCESS] Data received via deep link.", "[ANALYSIS] Calculating risk score..."]);
      setResult(response.data);
    } catch (err) {
      setLogs(prev => [...prev, "[ERROR] Auto-scan failed."]);
      setError('Failed to scan the URL from the link.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    
    setLogs([
      `[INIT] Starting Security Audit for ${url}...`,
      `[INFO] Resolving DNS and establishing handshake...`
    ]);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setLogs(prev => [...prev, "[INFO] Connection established. Fetching HTTP headers..."]);

      const response = await axios.post('http://localhost:5000/api/scan', { url });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setLogs(prev => [...prev, "[SUCCESS] Raw header data received.", "[ANALYSIS] Calculating security risk score..."]);
      
      setResult(response.data);
    } catch (err) {
      setLogs(prev => [...prev, "[ERROR] Critical failure during scan."]);
      setError(err.response?.data?.error || 'Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    const node = reportRef.current;
    if (!node) return;
    const scale = 3; 

    try {
      // JPEG + Quality 0.95 = Sharp text but file size between 2-4MB
      const dataUrl = await domToImage.toJpeg(node, {
        width: node.clientWidth * scale,
        height: node.clientHeight * scale,
        quality: 0.95,
        bgcolor: '#111827',
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: node.clientWidth + 'px',
          height: node.clientHeight + 'px',
          'font-family': 'sans-serif'
        }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'JPEG', 0, 10, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Security_Report_${result.target.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
    }
  };

  const getChartColor = (score) => {
    if (score >= 75) return '#4ade80'; 
    if (score >= 50) return '#facc15'; 
    return '#f87171'; 
  };

  return (
    <div className="min-h-screen bg-gray-900 hacker-bg text-gray-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">Cyber Risk Dashboard</h1>
          <p className="text-gray-400 text-sm md:text-base">Analyze the surface-level security headers of any web application.</p>
        </header>

        {/* Mobile-Responsive Form */}
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Enter a domain (e.g., github.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded focus:outline-none focus:border-blue-500 w-full"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-semibold transition disabled:opacity-50 active:scale-95 w-full sm:w-auto"
          >
            {loading ? 'Analyzing...' : 'Run Scan'}
          </button>
        </form>

        {loading && (
          <div className="bg-black font-mono text-[10px] md:text-xs p-4 rounded border border-blue-900/50 mb-8 h-32 overflow-y-auto shadow-inner">
            {logs.map((log, i) => (
              <div key={i} className="text-green-500 mb-1 leading-relaxed">
                <span className="text-gray-600 mr-2">{'>'}</span>{log}
              </div>
            ))}
            <div className="animate-pulse text-blue-400 inline-block ml-1">_</div>
          </div>
        )}

        {error && <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded mb-8">{error}</div>}

        {result && (
          <>
            <div 
              ref={reportRef} 
              id="report-container"
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 md:p-8 shadow-2xl flex flex-col md:flex-row gap-8 items-center mb-6"
            >
              <div className="w-full md:w-1/3 flex flex-col items-center justify-center">
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${result.target}&sz=64`} 
                  alt="favicon" 
                  className="mb-4 w-10 h-10 md:w-12 md:h-12 rounded bg-gray-700 p-1"
                />
                
                <div className="h-40 w-40 md:h-48 md:w-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ name: 'Score', value: result.riskScore }, { name: 'Missing', value: 100 - result.riskScore }]}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270} dataKey="value" stroke="none"
                      >
                        <Cell fill={getChartColor(result.riskScore)} />
                        <Cell fill="#374151" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span style={{ color: getChartColor(result.riskScore) }} className="text-3xl md:text-4xl font-bold">
                      {result.riskScore}
                    </span>
                  </div>
                </div>
                
                <span 
                  style={{
                    backgroundColor: result.riskScore >= 75 ? '#064e3b' : result.riskScore >= 50 ? '#713f12' : '#7f1d1d',
                    color: getChartColor(result.riskScore),
                    border: `1px solid ${getChartColor(result.riskScore)}`
                  }} 
                  className="mt-4 px-4 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider"
                >
                  {result.grade}
                </span>
              </div>

              <div className="w-full md:w-2/3 text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-bold mb-1 text-white truncate w-full">{result.target}</h2>
                <p className="text-gray-400 mb-6 text-xs md:text-sm">Security Header Analysis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(result.details).map(([key, isSecure]) => (
                    <div key={key} className="flex flex-col bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                      <span className="font-mono text-[9px] md:text-[10px] text-gray-500 uppercase mb-2 tracking-tighter">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div style={{ color: isSecure ? '#4ade80' : '#f87171' }} className="font-semibold text-xs md:text-sm">
                        {isSecure ? "✓ Protected" : "✕ Missing"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center pb-8">
              <button 
                onClick={downloadPDF}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 md:px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition active:scale-95 text-sm md:text-base"
              >
                <span>📥</span> Download Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;