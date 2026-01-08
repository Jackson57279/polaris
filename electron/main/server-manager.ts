/**
 * Server Manager
 *
 * Manages the Next.js server lifecycle in the Electron app
 * Handles server startup, health checking, and graceful shutdown
 */

import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import path from 'path';
import net from 'net';
import electronLog from 'electron-log';

// Simple port finder (avoids ESM-only get-port package)
const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
};

const getPort = async (): Promise<number> => {
  for (let port = 3000; port < 3100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available port found in range 3000-3100');
};

export class ServerManager {
  private serverProcess: ChildProcess | null = null;
  private port: number = 0;
  private isStarting: boolean = false;
  private startupTimeout: number = 60000; // 60 seconds

  /**
   * Start the Next.js server
   * @returns The port the server is running on
   */
  async start(): Promise<number> {
    if (this.serverProcess || this.isStarting) {
      electronLog.warn('Server is already running or starting');
      return this.port;
    }

    this.isStarting = true;
    electronLog.info('Starting Next.js server...');

    try {
      // Get an available port
      this.port = await getPort();
      electronLog.info(`Allocated port: ${this.port}`);

      // Get the server path
      const serverPath = this.getServerPath();
      electronLog.info(`Server path: ${serverPath}`);

      // Get environment variables
      const env = await this.getServerEnv();

      // Start the server process
      await this.spawnServer(serverPath, env);

      // Wait for the server to be ready
      await this.waitForServer();

      electronLog.info('Next.js server is ready');
      this.isStarting = false;

      return this.port;
    } catch (error) {
      this.isStarting = false;
      electronLog.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Spawn the server process
   */
  private spawnServer(serverPath: string, env: NodeJS.ProcessEnv): Promise<void> {
    return new Promise((resolve, reject) => {
      electronLog.info('Spawning server process...');

      // Check if we're in development mode
      const isDev = process.env.NODE_ENV === 'development';

      if (isDev) {
        // In development, we assume the dev server is already running
        // or we start it using `next dev`
        electronLog.info('Development mode - using external Next.js dev server');
        resolve();
        return;
      }

      // Production: Use the standalone server
      this.serverProcess = spawn(
        process.execPath, // Node.js executable
        [serverPath],
        {
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: path.dirname(serverPath),
          detached: false,
        }
      );

      // Handle stdout
      this.serverProcess.stdout?.on('data', (data: Buffer) => {
        const message = data.toString().trim();
        if (message) {
          electronLog.info(`[Next.js] ${message}`);
        }
      });

      // Handle stderr
      this.serverProcess.stderr?.on('data', (data: Buffer) => {
        const message = data.toString().trim();
        if (message) {
          electronLog.error(`[Next.js Error] ${message}`);
        }
      });

      // Handle process errors
      this.serverProcess.on('error', (error) => {
        electronLog.error('Server process error:', error);
        reject(error);
      });

      // Handle process exit
      this.serverProcess.on('exit', (code, signal) => {
        electronLog.warn(`Server process exited with code ${code}, signal ${signal}`);
        this.serverProcess = null;
      });

      // Resolve immediately - we'll verify with health check
      resolve();
    });
  }

  /**
   * Wait for the server to be ready
   */
  private waitForServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 500; // Check every 500ms

      const checkServer = async () => {
        // Check timeout
        if (Date.now() - startTime > this.startupTimeout) {
          reject(new Error('Server startup timeout'));
          return;
        }

        try {
          const response = await fetch(`http://localhost:${this.port}/api/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            electronLog.info('Server health check passed');
            resolve();
            return;
          }
        } catch (error) {
          // Server not ready yet, continue checking
        }

        // Try again
        setTimeout(checkServer, checkInterval);
      };

      // Start checking
      checkServer();
    });
  }

  /**
   * Get the path to the Next.js server
   */
  private getServerPath(): string {
    if (app.isPackaged) {
      // Production: Use the bundled standalone server
      return path.join(process.resourcesPath, 'server', 'server.js');
    } else {
      // Development: Use the local standalone build
      return path.join(app.getAppPath(), '.next', 'standalone', 'server.js');
    }
  }

  /**
   * Get environment variables for the server
   */
  private async getServerEnv(): Promise<NodeJS.ProcessEnv> {
    const Store = (await import('electron-store')).default;
    const store = new Store() as any;

    // Get stored credentials (for production use)
    const storedEnv = (store.get('serverEnv', {}) || {}) as Record<string, string>;

    return {
      ...process.env,
      ...storedEnv,
      NODE_ENV: 'production',
      PORT: this.port.toString(),
      HOSTNAME: 'localhost',
      IS_ELECTRON: 'true',
      // Override any electron-specific settings
      NEXT_TELEMETRY_DISABLED: '1',
    };
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    if (!this.serverProcess) {
      electronLog.info('No server process to stop');
      return;
    }

    electronLog.info('Stopping Next.js server...');

return new Promise((resolve) => {
      const serverProc = this.serverProcess!;
      const forceKillTimeout = setTimeout(() => {
        if (serverProc && !serverProc.killed) {
          electronLog.warn('Force killing server process');
          serverProc.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      serverProc.once('exit', () => {
        clearTimeout(forceKillTimeout);
        this.serverProcess = null;
        electronLog.info('Server process stopped');
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      serverProc.kill('SIGTERM');
    });
  }

  /**
   * Get the current server port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.serverProcess !== null && !this.serverProcess.killed;
  }

  /**
   * Restart the server
   */
  async restart(): Promise<number> {
    await this.stop();
    return this.start();
  }

  /**
   * Get server status for debugging
   */
  getStatus(): { port: number; running: boolean; pid: number | undefined } {
    return {
      port: this.port,
      running: this.isRunning(),
      pid: this.serverProcess?.pid,
    };
  }
}
