/**
 * JSON Layer Analyzer - Detects and manages multi-layer escaped JSON structures
 */

class JSONLayerAnalyzer {
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
        
        // Save current layer
        const currentLayer = {
            depth: depth,
            path: path.join(' > ') || 'root',
            data: data,
            hasEscapedJSON: false,
            escapedFields: [],
            parentField: parentField
        };
        this.layers.push(currentLayer);
        
        // Check if string might be JSON
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                // Only treat as new layer if parsed result is object/array
                if (typeof parsed === 'object' && parsed !== null) {
                    currentLayer.hasEscapedJSON = true;
                    this.detectLayers(parsed, depth + 1, [...path, '[parsed]'], '[parsed]');
                }
            } catch (e) {
                // Not valid JSON string
            }
        } else if (typeof data === 'object' && data !== null) {
            // Check each field in object
            for (let key in data) {
                if (typeof data[key] === 'string') {
                    try {
                        const parsed = JSON.parse(data[key]);
                        // Only treat as new layer if parsed result is object/array
                        if (typeof parsed === 'object' && parsed !== null) {
                            currentLayer.escapedFields.push(key);
                            this.detectLayers(parsed, depth + 1, [...path, key], key);
                        }
                    } catch (e) {
                        // Not valid JSON string
                    }
                }
            }
        }
    }
    
    rebuild(editedLayers) {
        if (editedLayers.length === 0) return {};
        if (editedLayers.length === 1) return editedLayers[0].data;
        
        // Build from deepest layer up
        for (let i = editedLayers.length - 1; i > 0; i--) {
            const currentLayer = editedLayers[i];
            const parentLayer = editedLayers[i - 1];
            
            // Use parentField to determine how to embed into parent
            if (currentLayer.parentField === '[parsed]') {
                // Entire parent is escaped string
                parentLayer.data = JSON.stringify(currentLayer.data);
            } else if (currentLayer.parentField) {
                // Parent's field is escaped JSON
                if (typeof parentLayer.data === 'object' && parentLayer.data !== null) {
                    parentLayer.data[currentLayer.parentField] = JSON.stringify(currentLayer.data);
                }
            }
        }
        
        return editedLayers[0].data;
    }
}

// Export for use in other modules
window.JSONLayerAnalyzer = JSONLayerAnalyzer;