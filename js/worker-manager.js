/**
 * Worker Manager - Manages Web Worker for JSON processing
 */

class WorkerManager {
    constructor() {
        this.worker = null;
        this.messageId = 0;
        this.pendingMessages = new Map();
        this.initWorker();
    }
    
    initWorker() {
        try {
            this.worker = new Worker('js/json-worker.js');
            
            this.worker.addEventListener('message', (e) => {
                const { id, type, success, data, error } = e.data;
                const pending = this.pendingMessages.get(id);
                
                if (pending) {
                    if (success) {
                        pending.resolve(data);
                    } else {
                        pending.reject(new Error(error || 'Worker processing failed'));
                    }
                    this.pendingMessages.delete(id);
                }
            });
            
            this.worker.addEventListener('error', (error) => {
                console.error('Worker error:', error);
                // Reject all pending messages
                this.pendingMessages.forEach((pending) => {
                    pending.reject(error);
                });
                this.pendingMessages.clear();
            });
            
        } catch (e) {
            console.warn('Web Worker not supported or failed to initialize:', e);
            this.worker = null;
        }
    }
    
    sendMessage(type, data) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                // Fallback to main thread processing
                this.processInMainThread(type, data)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            
            const id = ++this.messageId;
            this.pendingMessages.set(id, { resolve, reject });
            
            // Set timeout for worker response
            const timeout = setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error('Worker timeout'));
                }
            }, 30000); // 30 second timeout
            
            // Store timeout in pending message for cleanup
            this.pendingMessages.get(id).timeout = timeout;
            
            // Override resolve/reject to clear timeout
            const originalResolve = this.pendingMessages.get(id).resolve;
            const originalReject = this.pendingMessages.get(id).reject;
            
            this.pendingMessages.get(id).resolve = (data) => {
                clearTimeout(timeout);
                originalResolve(data);
            };
            
            this.pendingMessages.get(id).reject = (error) => {
                clearTimeout(timeout);
                originalReject(error);
            };
            
            this.worker.postMessage({ id, type, data });
        });
    }
    
    async processInMainThread(type, data) {
        // Fallback processing in main thread
        switch(type) {
            case 'parse':
                return JSON.parse(data);
                
            case 'stringify':
                return JSON.stringify(data, null, 2);
                
            case 'analyze':
                const analyzer = new JSONLayerAnalyzer(data.maxDepth || 10);
                const parsedData = JSON.parse(data.json);
                return analyzer.analyze(parsedData);
                
            case 'rebuild':
                const rebuilder = new JSONLayerAnalyzer();
                return rebuilder.rebuild(data);
                
            case 'validate':
                JSON.parse(data);
                return true;
                
            case 'format':
                const parsed = JSON.parse(data.json);
                return JSON.stringify(parsed, null, data.indent || 2);
                
            case 'minify':
                const minified = JSON.parse(data);
                return JSON.stringify(minified);
                
            default:
                throw new Error('Unknown processing type: ' + type);
        }
    }
    
    // Convenience methods
    async parseJSON(jsonString) {
        return this.sendMessage('parse', jsonString);
    }
    
    async stringifyJSON(jsonObject) {
        return this.sendMessage('stringify', jsonObject);
    }
    
    async analyzeJSON(jsonString, maxDepth = 10) {
        return this.sendMessage('analyze', { json: jsonString, maxDepth });
    }
    
    async rebuildFromLayers(layers) {
        return this.sendMessage('rebuild', layers);
    }
    
    async validateJSON(jsonString) {
        try {
            await this.sendMessage('validate', jsonString);
            return true;
        } catch {
            return false;
        }
    }
    
    async formatJSON(jsonString, indent = 2) {
        return this.sendMessage('format', { json: jsonString, indent });
    }
    
    async minifyJSON(jsonString) {
        return this.sendMessage('minify', jsonString);
    }
    
    terminate() {
        if (this.worker) {
            // Reject all pending messages
            this.pendingMessages.forEach((pending) => {
                if (pending.timeout) clearTimeout(pending.timeout);
                pending.reject(new Error('Worker terminated'));
            });
            this.pendingMessages.clear();
            
            this.worker.terminate();
            this.worker = null;
        }
    }
}

// Export for use
window.WorkerManager = WorkerManager;