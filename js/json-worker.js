/**
 * Web Worker for heavy JSON processing
 * Offloads CPU-intensive JSON parsing and analysis to a separate thread
 */

// JSON Layer Analyzer for Worker
class WorkerJSONAnalyzer {
    constructor(maxDepth = 10) {
        this.maxDepth = maxDepth;
        this.layers = [];
    }
    
    analyze(input) {
        this.layers = [];
        this.detectLayers(input, 0, [], null);
        return this.layers;
    }
    
    detectLayers(data, depth, path, parentField = null) {
        if (depth >= this.maxDepth) return;
        
        const currentLayer = {
            depth: depth,
            path: path.join(' > ') || 'root',
            data: data,
            hasEscapedJSON: false,
            escapedFields: [],
            parentField: parentField
        };
        this.layers.push(currentLayer);
        
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                if (typeof parsed === 'object' && parsed !== null) {
                    currentLayer.hasEscapedJSON = true;
                    this.detectLayers(parsed, depth + 1, [...path, '[parsed]'], '[parsed]');
                }
            } catch (e) {
                // Not valid JSON
            }
        } else if (typeof data === 'object' && data !== null) {
            for (let key in data) {
                if (typeof data[key] === 'string') {
                    try {
                        const parsed = JSON.parse(data[key]);
                        if (typeof parsed === 'object' && parsed !== null) {
                            currentLayer.escapedFields.push(key);
                            this.detectLayers(parsed, depth + 1, [...path, key], key);
                        }
                    } catch (e) {
                        // Not valid JSON
                    }
                }
            }
        }
    }
    
    rebuild(editedLayers) {
        if (editedLayers.length === 0) return {};
        if (editedLayers.length === 1) return editedLayers[0].data;
        
        for (let i = editedLayers.length - 1; i > 0; i--) {
            const currentLayer = editedLayers[i];
            const parentLayer = editedLayers[i - 1];
            
            if (currentLayer.parentField === '[parsed]') {
                parentLayer.data = JSON.stringify(currentLayer.data);
            } else if (currentLayer.parentField) {
                if (typeof parentLayer.data === 'object' && parentLayer.data !== null) {
                    parentLayer.data[currentLayer.parentField] = JSON.stringify(currentLayer.data);
                }
            }
        }
        
        return editedLayers[0].data;
    }
}

// Message handler
self.addEventListener('message', function(e) {
    const { type, data, id } = e.data;
    
    try {
        let result;
        
        switch(type) {
            case 'parse':
                // Parse JSON string
                result = JSON.parse(data);
                self.postMessage({
                    id: id,
                    type: 'parse-result',
                    success: true,
                    data: result
                });
                break;
                
            case 'stringify':
                // Stringify JSON object
                result = JSON.stringify(data, null, 2);
                self.postMessage({
                    id: id,
                    type: 'stringify-result',
                    success: true,
                    data: result
                });
                break;
                
            case 'analyze':
                // Analyze JSON layers
                const analyzer = new WorkerJSONAnalyzer(data.maxDepth || 10);
                const parsedData = JSON.parse(data.json);
                result = analyzer.analyze(parsedData);
                self.postMessage({
                    id: id,
                    type: 'analyze-result',
                    success: true,
                    data: result
                });
                break;
                
            case 'rebuild':
                // Rebuild JSON from layers
                const rebuilder = new WorkerJSONAnalyzer();
                result = rebuilder.rebuild(data);
                self.postMessage({
                    id: id,
                    type: 'rebuild-result',
                    success: true,
                    data: result
                });
                break;
                
            case 'validate':
                // Validate JSON
                JSON.parse(data);
                self.postMessage({
                    id: id,
                    type: 'validate-result',
                    success: true,
                    valid: true
                });
                break;
                
            case 'format':
                // Format JSON with custom indentation
                const parsed = JSON.parse(data.json);
                result = JSON.stringify(parsed, null, data.indent || 2);
                self.postMessage({
                    id: id,
                    type: 'format-result',
                    success: true,
                    data: result
                });
                break;
                
            case 'minify':
                // Minify JSON
                const minified = JSON.parse(data);
                result = JSON.stringify(minified);
                self.postMessage({
                    id: id,
                    type: 'minify-result',
                    success: true,
                    data: result
                });
                break;
                
            default:
                throw new Error('Unknown message type: ' + type);
        }
    } catch (error) {
        self.postMessage({
            id: id,
            type: type + '-error',
            success: false,
            error: error.message
        });
    }
});