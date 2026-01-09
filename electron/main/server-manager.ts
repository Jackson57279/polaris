import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import log from 'electron-log';
import http from 'http';

export class ServerManager {
  private serverProcess: ChildProcess | null = null;
  private port: number = 3000;
  private isDev: boolean;
  private isStopping: boolean = false;

  constructor(isDev: boolean) {
    this.isDev = isDev;
  }

  async start(): Promise<number> {
    try {
      if (this.isDev) {
        // In development, Next.js dev server is started separately
        // Use the configured dev server port (default 3000)
        this.port = parseInt(process.env.NEXT_DEV_PORT || '3000', 10);
        log.info(`Using dev server port: ${this.port}`);
        
        // Wait for it to be ready
        await this.waitForServer(this.port, 60000);
        return this.port;
      }

      // Get available port for production (try ports 3000-3100)
      // Use dynamic import for ESM-only get-port package
      const { default: getPort } = await import('get-port');
      const portRange = Array.from({ length: 101 }, (_, i) => 3000 + i);
      this.port = await getPort({ port: portRange });
      log.info(`Allocated port: ${this.port}`);

      // In production, start the standalone Next.js server
      const serverPath = path.join(process.resourcesPath, 'server', 'server.js');
      log.info(`Starting Next.js server from: ${serverPath}`);

      this.serverProcess = spawn('node', [serverPath], {
        env: {
          ...process.env,
          PORT: this.port.toString(),
          NODE_ENV: 'production',
          IS_ELECTRON: 'true',
          HOSTNAME: 'localhost'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.serverProcess.stdout?.on('data', (data) => {
        log.info('[Next.js Server]:', data.toString());
      });

      this.serverProcess.stderr?.on('data', (data) => {
        log.error('[Next.js Server Error]:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        log.error('Server process error:', error);
      });

      this.serverProcess.on('exit', (code) => {
        log.info(`Server process exited with code: ${code}`);
      });

      // Wait for server to be ready
      await this.waitForServer(this.port, 30000);
      log.info('Next.js server is ready');

      return this.port;
    } catch (error) {
      log.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.isStopping) {
      return;
    }

    if (this.serverProcess) {
      // Check if process already exited
      if (this.serverProcess.exitCode !== null || this.serverProcess.killed) {
        return;
      }

      this.isStopping = true;

      return new Promise((resolve) => {
        if (this.serverProcess) {
          // Set a timeout to force resolve after 3 seconds
          const timeout = setTimeout(() => {
            this.isStopping = false;
            resolve();
          }, 3000);

          this.serverProcess.on('exit', () => {
            clearTimeout(timeout);
            this.isStopping = false;
            resolve();
          });

          this.serverProcess.kill();
        } else {
          this.isStopping = false;
          resolve();
        }
      });
    }
  }

  private async waitForServer(port: number, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await this.checkHealth(port);
        return;
      } catch {
        // Retry after 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    throw new Error(`Server failed to start within ${timeout}ms`);
  }

  private checkHealth(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Health check failed with status: ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.setTimeout(1000, () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });
  }
}
