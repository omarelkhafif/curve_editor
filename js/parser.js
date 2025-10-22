import { Polygon, Segment } from './model.js';

export class ParseError extends Error {
    constructor(message, line, token) {
        super(message);
        this.line = line;
        this.token = token;
    }
}

export class TextParser {
    static parse(text) {
        const lines = text.split('\n');
        const polygons = [];
        let currentPolygon = null;
        let lineNumber = 0;

        for (const line of lines) {
            lineNumber++;
            const trimmed = line.trim();
            
            if (trimmed === '' || trimmed.startsWith('#')) {
                continue;
            }

            if (trimmed.startsWith('Polygon:')) {
                if (currentPolygon && currentPolygon.segments.length > 0) {
                    polygons.push(currentPolygon);
                }
                currentPolygon = new Polygon();
            } else if (trimmed.startsWith('Segment:')) {
                if (!currentPolygon) {
                    throw new ParseError(
                        'Segment found before Polygon declaration',
                        lineNumber,
                        0
                    );
                }

                const coordsStr = trimmed.substring(8).trim();
                const segment = this.parseSegment(coordsStr, lineNumber);
                currentPolygon.addSegment(segment);
            } else {
                throw new ParseError(
                    `Expected 'Polygon:' or 'Segment:', found '${trimmed}'`,
                    lineNumber,
                    0
                );
            }
        }

        if (currentPolygon && currentPolygon.segments.length > 0) {
            polygons.push(currentPolygon);
        }

        return polygons;
    }

    static parseSegment(coordsStr, lineNumber) {
        const match = coordsStr.match(/^\((.+)\)$/);
        if (!match) {
            throw new ParseError(
                `Invalid segment format, expected (x, y) or (x1, y1, x2, y2, x3, y3)`,
                lineNumber,
                0
            );
        }

        const coordsPart = match[1];
        const tokens = coordsPart.split(',').map(s => s.trim());
        
        if (tokens.length === 2) {
            const [x, y] = this.parseIntegers(tokens, lineNumber);
            return new Segment('line', [x, y]);
        } else if (tokens.length === 6) {
            const [x1, y1, x2, y2, x3, y3] = this.parseIntegers(tokens, lineNumber);
            return new Segment('bezier', [x1, y1], [x2, y2], [x3, y3]);
        } else {
            throw new ParseError(
                `Invalid number of coordinates: ${tokens.length}, expected 2 or 6`,
                lineNumber,
                0
            );
        }
    }

    static parseIntegers(tokens, lineNumber) {
        const result = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (!/^-?\d+$/.test(token)) {
                throw new ParseError(
                    `Invalid integer '${token}', expected integer value`,
                    lineNumber,
                    i
                );
            }

            const value = parseInt(token, 10);
            
            if (!Number.isInteger(value)) {
                throw new ParseError(
                    `Invalid integer '${token}'`,
                    lineNumber,
                    i
                );
            }

            result.push(value);
        }

        return result;
    }

    static serialize(polygons) {
        let text = '';

        for (const polygon of polygons) {
            text += 'Polygon:\n';
            
            for (const segment of polygon.segments) {
                if (segment.type === 'line') {
                    text += `    Segment: (${segment.start[0]}, ${segment.start[1]})\n`;
                } else if (segment.type === 'bezier') {
                    text += `    Segment: (${segment.start[0]}, ${segment.start[1]}, ${segment.c1[0]}, ${segment.c1[1]}, ${segment.c2[0]}, ${segment.c2[1]})\n`;
                }
            }
            
            text += '\n';
        }

        return text.trim();
    }
}
