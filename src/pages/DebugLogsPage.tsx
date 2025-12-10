import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { errorLogger } from '../lib/errorLogger';

const DebugLogsPage: React.FC = () => {
  const [logs, setLogs] = useState(errorLogger.getLogs());
  const [diagnostics, setDiagnostics] = useState(errorLogger.getDiagnostics());
  const [copied, setCopied] = useState(false);

  const refreshLogs = () => {
    setLogs(errorLogger.getLogs());
    setDiagnostics(errorLogger.getDiagnostics());
  };

  const clearLogs = () => {
    errorLogger.clearLogs();
    refreshLogs();
  };

  const copyToClipboard = () => {
    const data = {
      diagnostics,
      logs
    };
    
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const interval = setInterval(refreshLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Debug Logs</h1>
          <p className="text-gray-600 text-sm mb-4">
            Diagnostic information for troubleshooting mobile issues
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={refreshLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy All'}
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Diagnostics */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            System Diagnostics
            {diagnostics.online ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Browser:</span>
              <span className="text-gray-900 font-mono text-xs">{diagnostics.userAgent.substring(0, 50)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform:</span>
              <span className="text-gray-900 font-mono">{diagnostics.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Screen Size:</span>
              <span className="text-gray-900 font-mono">{diagnostics.screenSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Viewport:</span>
              <span className="text-gray-900 font-mono">{diagnostics.viewportSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Online:</span>
              <span className={`font-semibold ${diagnostics.online ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics.online ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">localStorage:</span>
              <span className={`font-semibold ${diagnostics.localStorage ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics.localStorage ? 'Available' : 'Blocked'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">sessionStorage:</span>
              <span className={`font-semibold ${diagnostics.sessionStorage ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics.sessionStorage ? 'Available' : 'Blocked'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cookies:</span>
              <span className={`font-semibold ${diagnostics.cookiesEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics.cookiesEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Error Logs ({logs.length})
          </h2>
          
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No logs recorded yet</p>
          ) : (
            <div className="space-y-3">
              {logs.slice().reverse().map((log, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    log.type.includes('error')
                      ? 'bg-red-50 border-red-500'
                      : log.type.includes('warning')
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{log.type}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{log.message}</p>
                  {log.context && (
                    <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugLogsPage;

