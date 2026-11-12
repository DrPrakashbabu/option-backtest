import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to execute Python scripts with stdin/stdout
function runPythonScript(scriptPath: string, inputPayload: any): Promise<{ data: any; executionTimeMs: number }> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const pyProcess = spawn('python3', [scriptPath]);

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    pyProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    pyProcess.on('close', (code) => {
      const executionTimeMs = Math.round(performance.now() - startTime);
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}: ${stderrData || stdoutData}`));
      }
      try {
        const parsed = JSON.parse(stdoutData);
        resolve({ data: parsed, executionTimeMs });
      } catch (err: any) {
        reject(new Error(`Failed to parse Python JSON output: ${err.message}. Raw: ${stdoutData.slice(0, 300)}`));
      }
    });

    pyProcess.on('error', (err) => {
      reject(err);
    });

    pyProcess.stdin.write(JSON.stringify(inputPayload));
    pyProcess.stdin.end();
  });
}

// 1. Backtest API Endpoint
app.post('/api/backtest', async (req: Request, res: Response) => {
  try {
    const scriptPath = path.resolve('engine/backtester.py');
    const result = await runPythonScript(scriptPath, req.body);
    res.json({
      success: true,
      executionEngine: 'Python 3.10 Vectorized Engine',
      executionTimeMs: result.executionTimeMs,
      data: result.data,
    });
  } catch (err: any) {
    console.error('Error in /api/backtest:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Strategy Payoff API Endpoint
app.post('/api/payoff', async (req: Request, res: Response) => {
  try {
    const scriptPath = path.resolve('engine/payoff_calculator.py');
    const result = await runPythonScript(scriptPath, req.body);
    res.json({
      success: true,
      executionEngine: 'Python 3.10 Black-Scholes Greeks Engine',
      executionTimeMs: result.executionTimeMs,
      data: result.data,
    });
  } catch (err: any) {
    console.error('Error in /api/payoff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Historical Nifty Data API Endpoint
app.get('/api/historical-data', (req: Request, res: Response) => {
  try {
    const dataPath = path.resolve('data/nifty50_data.json');
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: 'Historical data not found' });
    }
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    
    // Optional query params: startDate, endDate, limit
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    let filtered = data;
    if (startDate) {
      filtered = filtered.filter((d: any) => d.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((d: any) => d.date <= endDate);
    }
    if (limit && limit > 0) {
      filtered = filtered.slice(-limit);
    }

    res.json({
      success: true,
      count: filtered.length,
      latest: data[data.length - 1],
      data: filtered,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Python Engine Source Code API Endpoint (for quants to inspect & download)
app.get('/api/python-code', (req: Request, res: Response) => {
  try {
    const files = {
      'backtester.py': fs.readFileSync(path.resolve('engine/backtester.py'), 'utf-8'),
      'black_scholes.py': fs.readFileSync(path.resolve('engine/black_scholes.py'), 'utf-8'),
      'payoff_calculator.py': fs.readFileSync(path.resolve('engine/payoff_calculator.py'), 'utf-8'),
    };
    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite Dev Server / Static Hosting
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (Node + Python Engine)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
