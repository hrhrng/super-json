export interface JSONLayer {
  depth: number;
  content: any;
  originalContent?: string;
  parentField?: string | null;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  isEscaped?: boolean;
  hasChildren?: boolean;
  parentIndex: number;
  childIndices: number[];
}

export class JSONLayerAnalyzer {
  private maxDepth: number;
  private layers: JSONLayer[];

  constructor(maxDepth = 10) {
    this.maxDepth = maxDepth;
    this.layers = [];
  }

  analyze(input: string): JSONLayer[] {
    this.layers = [];

    try {
      const parsed = JSON.parse(input);

      this.layers.push({
        depth: 0,
        content: parsed,
        type: this.getType(parsed),
        parentField: null,
        hasChildren: false,
        parentIndex: -1,
        childIndices: [],
      });

      this.scanForEscapedJSON(parsed, 0, 0);
    } catch {
      this.layers.push({
        depth: 0,
        content: input,
        originalContent: input,
        type: 'string',
        isEscaped: false,
        parentIndex: -1,
        childIndices: [],
      });
    }

    return this.layers;
  }

  private scanForEscapedJSON(
    obj: any,
    currentDepth: number,
    parentIndex: number,
    path = ''
  ): void {
    if (currentDepth >= this.maxDepth) return;
    if (obj === null || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`;
        if (typeof item === 'string' && this.isLikelyJSON(item)) {
          this.tryAddLayer(item, currentDepth, parentIndex, itemPath);
        } else {
          this.scanForEscapedJSON(item, currentDepth, parentIndex, itemPath);
        }
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        const fieldPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string' && this.isLikelyJSON(value)) {
          this.tryAddLayer(value, currentDepth, parentIndex, fieldPath);
        } else {
          this.scanForEscapedJSON(
            value,
            currentDepth,
            parentIndex,
            fieldPath
          );
        }
      });
    }
  }

  private tryAddLayer(
    value: string,
    currentDepth: number,
    parentIndex: number,
    fieldPath: string
  ): void {
    try {
      let parsed = null;
      try {
        parsed = JSON.parse(value);
      } catch {
        const unescaped = this.tryUnescape(value);
        if (unescaped) {
          parsed = JSON.parse(unescaped);
        }
      }

      if (parsed && typeof parsed === 'object' && parsed !== null) {
        this.layers.push({
          depth: currentDepth + 1,
          content: parsed,
          originalContent: value,
          type: this.getType(parsed),
          parentField: fieldPath,
          isEscaped: true,
          hasChildren: false,
          parentIndex: parentIndex,
          childIndices: [],
        });

        const childIndex = this.layers.length - 1;
        this.layers[parentIndex].childIndices =
          this.layers[parentIndex].childIndices || [];
        this.layers[parentIndex].childIndices.push(childIndex);
        this.layers[parentIndex].hasChildren = true;

        this.scanForEscapedJSON(
          parsed,
          currentDepth + 1,
          childIndex,
          ''
        );
      }
    } catch {
      // Not valid JSON
    }
  }

  private isLikelyJSON(str: string): boolean {
    const trimmed = str.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      return true;
    }

    if (trimmed.includes('\\"') || trimmed.includes('\\\\')) {
      const unescaped = this.tryUnescape(trimmed);
      if (
        unescaped &&
        ((unescaped.startsWith('{') && unescaped.endsWith('}')) ||
          (unescaped.startsWith('[') && unescaped.endsWith(']')))
      ) {
        return true;
      }
    }

    return false;
  }

  private tryUnescape(str: string): string | null {
    try {
      let unescaped = str;
      unescaped = unescaped.replace(/\\"/g, '"');
      unescaped = unescaped.replace(/\\\\/g, '\\');
      return unescaped;
    } catch {
      return null;
    }
  }

  rebuild(layers: JSONLayer[]): string {
    if (layers.length === 0) return '{}';

    const workingLayers = layers.map((l) => ({
      ...l,
      content:
        typeof l.content === 'string'
          ? l.content
          : JSON.parse(JSON.stringify(l.content)),
    }));

    for (let i = workingLayers.length - 1; i > 0; i--) {
      const currentLayer = workingLayers[i];
      const parentLayer = workingLayers[currentLayer.parentIndex!];

      if (!parentLayer) continue;

      const jsonString = JSON.stringify(currentLayer.content);

      if (currentLayer.parentField === '[parsed]') {
        parentLayer.content = currentLayer.content;
      } else {
        this.setNestedValue(
          parentLayer.content,
          currentLayer.parentField!,
          jsonString
        );
      }
    }

    return JSON.stringify(workingLayers[0].content, null, 2);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.match(/[^.\[\]]+/g) || [];
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];
      const isArrayIndex = /^\d+$/.test(nextKey);

      if (!(key in current)) {
        current[key] = isArrayIndex ? [] : {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  private getType(
    data: any
  ): 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    return typeof data as any;
  }
}

export function formatJson(input: string, indent = 2): string {
  try {
    return JSON.stringify(JSON.parse(input), null, indent);
  } catch {
    return input;
  }
}

export function minifyJson(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input));
  } catch {
    return input;
  }
}

export function escapeJson(input: string): string {
  return JSON.stringify(input);
}

export function unescapeJson(input: string): string {
  try {
    const result = JSON.parse(input);
    return typeof result === 'string' ? result : input;
  } catch {
    return input.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}
