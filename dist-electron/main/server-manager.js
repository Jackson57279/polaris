"use strict";
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
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
const http_1 = __importDefault(require("http"));
class ServerManager {
    constructor(isDev) {
        this.serverProcess = null;
        this.port = 3000;
        this.isStopping = false;
        this.isDev = isDev;
    }
    async start() {
        try {
            if (this.isDev) {
                // In development, Next.js dev server is started separately
                // Use the configured dev server port (default 3000)
                this.port = parseInt(process.env.NEXT_DEV_PORT || '3000', 10);
                electron_log_1.default.info(`Using dev server port: ${this.port}`);
                // Wait for it to be ready
                await this.waitForServer(this.port, 60000);
                return this.port;
            }
            // Get available port for production (try ports 3000-3100)
            // Use dynamic import for ESM-only get-port package
            const { default: getPort } = await Promise.resolve().then(() => __importStar(require('get-port')));
            const portRange = Array.from({ length: 101 }, (_, i) => 3000 + i);
            this.port = await getPort({ port: portRange });
            electron_log_1.default.info(`Allocated port: ${this.port}`);
            // In production, start the standalone Next.js server
            const serverPath = path_1.default.join(process.resourcesPath, 'server', 'server.js');
            electron_log_1.default.info(`Starting Next.js server from: ${serverPath}`);
            this.serverProcess = (0, child_process_1.spawn)('node', [serverPath], {
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
                electron_log_1.default.info('[Next.js Server]:', data.toString());
            });
            this.serverProcess.stderr?.on('data', (data) => {
                electron_log_1.default.error('[Next.js Server Error]:', data.toString());
            });
            this.serverProcess.on('error', (error) => {
                electron_log_1.default.error('Server process error:', error);
            });
            this.serverProcess.on('exit', (code) => {
                electron_log_1.default.info(`Server process exited with code: ${code}`);
            });
            // Wait for server to be ready
            await this.waitForServer(this.port, 30000);
            electron_log_1.default.info('Next.js server is ready');
            return this.port;
        }
        catch (error) {
            electron_log_1.default.error('Failed to start server:', error);
            throw error;
        }
    }
    async stop() {
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
                }
                else {
                    this.isStopping = false;
                    resolve();
                }
            });
        }
    }
    async waitForServer(port, timeout) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                await this.checkHealth(port);
                return;
            }
            catch {
                // Retry after 500ms
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        throw new Error(`Server failed to start within ${timeout}ms`);
    }
    checkHealth(port) {
        return new Promise((resolve, reject) => {
            const req = http_1.default.get(`http://localhost:${port}/api/health`, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                }
                else {
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
exports.ServerManager = ServerManager;
//# sourceMappingURL=server-manager.js.map