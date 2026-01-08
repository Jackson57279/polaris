"use strict";
/**
 * Server Manager
 *
 * Manages the Next.js server lifecycle in the Electron app
 * Handles server startup, health checking, and graceful shutdown
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerManager = void 0;
const child_process_1 = require("child_process");
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const net_1 = __importDefault(require("net"));
const electron_log_1 = __importDefault(require("electron-log"));
// Simple port finder (avoids ESM-only get-port package)
const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = net_1.default.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close(() => resolve(true));
        });
        server.listen(port, '127.0.0.1');
    });
};
const getPort = async () => {
    for (let port = 3000; port < 3100; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error('No available port found in range 3000-3100');
};
class ServerManager {
    serverProcess = null;
    port = 0;
    isStarting = false;
    startupTimeout = 60000; // 60 seconds
    /**
     * Start the Next.js server
     * @returns The port the server is running on
     */
    async start() {
        if (this.serverProcess || this.isStarting) {
            electron_log_1.default.warn('Server is already running or starting');
            return this.port;
        }
        this.isStarting = true;
        electron_log_1.default.info('Starting Next.js server...');
        try {
            // Get an available port
            this.port = await getPort();
            electron_log_1.default.info(`Allocated port: ${this.port}`);
            // Get the server path
            const serverPath = this.getServerPath();
            electron_log_1.default.info(`Server path: ${serverPath}`);
            // Get environment variables
            const env = await this.getServerEnv();
            // Start the server process
            await this.spawnServer(serverPath, env);
            // Wait for the server to be ready
            await this.waitForServer();
            electron_log_1.default.info('Next.js server is ready');
            this.isStarting = false;
            return this.port;
        }
        catch (error) {
            this.isStarting = false;
            electron_log_1.default.error('Failed to start server:', error);
            throw error;
        }
    }
    /**
     * Spawn the server process
     */
    spawnServer(serverPath, env) {
        return new Promise((resolve, reject) => {
            electron_log_1.default.info('Spawning server process...');
            // Check if we're in development mode
            const isDev = process.env.NODE_ENV === 'development';
            if (isDev) {
                // In development, we assume the dev server is already running
                // or we start it using `next dev`
                electron_log_1.default.info('Development mode - using external Next.js dev server');
                resolve();
                return;
            }
            // Production: Use the standalone server
            this.serverProcess = (0, child_process_1.spawn)(process.execPath, // Node.js executable
            [serverPath], {
                env,
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: path_1.default.dirname(serverPath),
                detached: false,
            });
            // Handle stdout
            this.serverProcess.stdout?.on('data', (data) => {
                const message = data.toString().trim();
                if (message) {
                    electron_log_1.default.info(`[Next.js] ${message}`);
                }
            });
            // Handle stderr
            this.serverProcess.stderr?.on('data', (data) => {
                const message = data.toString().trim();
                if (message) {
                    electron_log_1.default.error(`[Next.js Error] ${message}`);
                }
            });
            // Handle process errors
            this.serverProcess.on('error', (error) => {
                electron_log_1.default.error('Server process error:', error);
                reject(error);
            });
            // Handle process exit
            this.serverProcess.on('exit', (code, signal) => {
                electron_log_1.default.warn(`Server process exited with code ${code}, signal ${signal}`);
                this.serverProcess = null;
            });
            // Resolve immediately - we'll verify with health check
            resolve();
        });
    }
    /**
     * Wait for the server to be ready
     */
    waitForServer() {
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
                        electron_log_1.default.info('Server health check passed');
                        resolve();
                        return;
                    }
                }
                catch (error) {
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
    getServerPath() {
        if (electron_1.app.isPackaged) {
            // Production: Use the bundled standalone server
            return path_1.default.join(process.resourcesPath, 'server', 'server.js');
        }
        else {
            // Development: Use the local standalone build
            return path_1.default.join(electron_1.app.getAppPath(), '.next', 'standalone', 'server.js');
        }
    }
    /**
     * Get environment variables for the server
     */
    async getServerEnv() {
        const Store = (await Promise.resolve().then(() => __importStar(require('electron-store')))).default;
        const store = new Store();
        // Get stored credentials (for production use)
        const storedEnv = (store.get('serverEnv', {}) || {});
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
    async stop() {
        if (!this.serverProcess) {
            electron_log_1.default.info('No server process to stop');
            return;
        }
        electron_log_1.default.info('Stopping Next.js server...');
        return new Promise((resolve) => {
            const serverProc = this.serverProcess;
            const forceKillTimeout = setTimeout(() => {
                if (serverProc && !serverProc.killed) {
                    electron_log_1.default.warn('Force killing server process');
                    serverProc.kill('SIGKILL');
                }
                resolve();
            }, 5000);
            serverProc.once('exit', () => {
                clearTimeout(forceKillTimeout);
                this.serverProcess = null;
                electron_log_1.default.info('Server process stopped');
                resolve();
            });
            // Send SIGTERM for graceful shutdown
            serverProc.kill('SIGTERM');
        });
    }
    /**
     * Get the current server port
     */
    getPort() {
        return this.port;
    }
    /**
     * Check if the server is running
     */
    isRunning() {
        return this.serverProcess !== null && !this.serverProcess.killed;
    }
    /**
     * Restart the server
     */
    async restart() {
        await this.stop();
        return this.start();
    }
    /**
     * Get server status for debugging
     */
    getStatus() {
        return {
            port: this.port,
            running: this.isRunning(),
            pid: this.serverProcess?.pid,
        };
    }
}
exports.ServerManager = ServerManager;
//# sourceMappingURL=server-manager.js.map