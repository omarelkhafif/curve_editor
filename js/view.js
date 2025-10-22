export class View {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.resizeCanvas();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    worldToScreen(x, y) {
        return [
            x * this.scale + this.offsetX,
            y * this.scale + this.offsetY
        ];
    }

    screenToWorld(x, y) {
        return [
            (x - this.offsetX) / this.scale,
            (y - this.offsetY) / this.scale
        ];
    }

    snap(value) {
        return Math.sign(value) * Math.floor(Math.abs(value) + 0.5);
    }

    snapPoint([x, y]) {
        return [this.snap(x), this.snap(y)];
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(model, drawState = null, currentTool = null) {
        this.clear();

        for (let i = 0; i < model.polygons.length; i++) {
            const polygon = model.polygons[i];
            const isSelected = i === model.selectedPolygonIndex;
            this.drawPolygon(polygon, isSelected);
        }

        if (drawState) {
            this.drawDrawState(drawState);
        }

        // draw dynamic legend at bottom center
        this.drawLegend(drawState, currentTool);
    }

    drawLegend(drawState, currentTool) {
        const padding = 12;
        const lineHeight = 18;
        const maxWidth = Math.min(520, this.canvas.width - 40);
        const linesCount = 4; // header + 3 dynamic lines
        const height = linesCount * lineHeight + padding * 2;
        const width = maxWidth;
        const x = (this.canvas.width - width) / 2;
        const y = this.canvas.height - height - 10;

        // background box
        this.ctx.save();
        this.ctx.globalAlpha = 0.95;
        this.ctx.fillStyle = 'rgba(44,62,80,0.95)';
        this.ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this._roundRectPath(this.ctx, x, y, width, height, 8);
        this.ctx.fill();
        this.ctx.stroke();

        // texts
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        const tx = x + padding;
        let ty = y + padding;

        // Header - always "Place"
        this.ctx.fillText('Place', tx, ty);
        ty += lineHeight;

        // Determine dynamic lines depending on drawState or currentTool
        const dynamic = [];
        if (!drawState) {
            if (currentTool === 'draw') {
                dynamic.push('Place first point of a polygon');
            } else {
                dynamic.push("Click 'Draw' to start placing polygon points");
            }
            dynamic.push('');
            dynamic.push('');
        } else {
            if (drawState.waitingForEnd) {
                dynamic.push('Place end point of current segment or press "e" to connect it to beginning of the polygon.');
                dynamic.push('');
                dynamic.push('');
            } else if (drawState.waitingForC1) {
                dynamic.push('Place 1st control point of bezier curve or press "s" to skip it.');
                dynamic.push('');
                dynamic.push('');
            } else if (drawState.waitingForC2) {
                dynamic.push('Place 2nd control point of bezier curve or press "s" to skip it.');
                dynamic.push('');
                dynamic.push('');
            } else {
                dynamic.push('Continue placing points');
                dynamic.push('');
                dynamic.push('');
            }
        }

        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '12px sans-serif';
        for (let i = 0; i < 3; i++) {
            const text = dynamic[i] || '';
            // wrap long text
            this._fillWrappedText(this.ctx, text, tx, ty + i * lineHeight, width - padding * 2, lineHeight);
        }

        this.ctx.restore();
    }

    _roundRectPath(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    _fillWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return;
        const words = text.split(' ');
        let line = '';
        let ty = y;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + (line ? ' ' : '') + words[n];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line) {
                ctx.fillText(line, x, ty);
                line = words[n];
                ty += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line) ctx.fillText(line, x, ty);
    }

    drawPolygon(polygon, isSelected = false) {
        if (polygon.segments.length === 0) return;

        this.ctx.save();

        this.ctx.strokeStyle = isSelected ? '#e74c3c' : '#2c3e50';
        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.fillStyle = isSelected ? 'rgba(231, 76, 60, 0.1)' : 'rgba(52, 152, 219, 0.1)';

        this.ctx.beginPath();

        const firstSeg = polygon.segments[0];
        const [startX, startY] = this.worldToScreen(...firstSeg.start);
        this.ctx.moveTo(startX, startY);

        for (let i = 0; i < polygon.segments.length; i++) {
            const seg = polygon.segments[i];
            const nextSeg = polygon.segments[(i + 1) % polygon.segments.length];
            const [endX, endY] = this.worldToScreen(...nextSeg.start);

            if (seg.type === 'line') {
                this.ctx.lineTo(endX, endY);
            } else if (seg.type === 'bezier') {
                const [c1x, c1y] = this.worldToScreen(...seg.c1);
                const [c2x, c2y] = this.worldToScreen(...seg.c2);
                this.ctx.bezierCurveTo(c1x, c1y, c2x, c2y, endX, endY);
            }
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        if (isSelected) {
            for (const seg of polygon.segments) {
                this.drawHandle(...seg.start, '#e74c3c');
                if (seg.type === 'bezier') {
                    this.drawHandle(...seg.c1, '#2c2e4dff');
                    this.drawHandle(...seg.c2, '#16222aff');
                    
                    this.ctx.save();
                    this.ctx.strokeStyle = '#313737ff';
                    this.ctx.lineWidth = 1;
                    this.ctx.setLineDash([3, 3]);
                    
                    const [sx, sy] = this.worldToScreen(...seg.start);
                    const [c1x, c1y] = this.worldToScreen(...seg.c1);
                    const [c2x, c2y] = this.worldToScreen(...seg.c2);
                    const nextSeg = polygon.segments[(polygon.segments.indexOf(seg) + 1) % polygon.segments.length];
                    const [ex, ey] = this.worldToScreen(...nextSeg.start);
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(sx, sy);
                    this.ctx.lineTo(c1x, c1y);
                    this.ctx.stroke();
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(ex, ey);
                    this.ctx.lineTo(c2x, c2y);
                    this.ctx.stroke();
                    
                    this.ctx.restore();
                }
            }
        }

        this.ctx.restore();
    }

    drawHandle(worldX, worldY, color) {
        const [x, y] = this.worldToScreen(worldX, worldY);
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#231f20ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawDrawState(drawState) {
        this.ctx.save();
        this.ctx.strokeStyle = '#ff355aff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        if (drawState.segments && drawState.segments.length > 0) {
            this.ctx.beginPath();
            const firstSeg = drawState.segments[0];
            const [startX, startY] = this.worldToScreen(...firstSeg.start);
            this.ctx.moveTo(startX, startY);

            for (let i = 0; i < drawState.segments.length; i++) {
                const seg = drawState.segments[i];
                const nextSeg = drawState.segments[i + 1] || 
                    (drawState.currentEnd ? { start: drawState.currentEnd } : null);
                
                if (!nextSeg) break;
                
                const [endX, endY] = this.worldToScreen(...nextSeg.start);

                if (seg.type === 'line') {
                    this.ctx.lineTo(endX, endY);
                } else if (seg.type === 'bezier' && seg.c1 && seg.c2) {
                    const [c1x, c1y] = this.worldToScreen(...seg.c1);
                    const [c2x, c2y] = this.worldToScreen(...seg.c2);
                    this.ctx.bezierCurveTo(c1x, c1y, c2x, c2y, endX, endY);
                }
            }

            this.ctx.stroke();

            for (const seg of drawState.segments) {
                this.drawHandle(...seg.start, '#3c35ffff');
            }
        }

        if (drawState.previewStart && drawState.previewEnd) {
            this.ctx.beginPath();
            const [sx, sy] = this.worldToScreen(...drawState.previewStart);
            const [ex, ey] = this.worldToScreen(...drawState.previewEnd);
            this.ctx.moveTo(sx, sy);
            this.ctx.lineTo(ex, ey);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    zoomIn() {
        this.scale *= 1.2;
    }

    zoomOut() {
        this.scale /= 1.2;
    }

    pan(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
    }

    zoomAll(model) {
        const bounds = model.getAllBounds();
        
        if (!bounds) {
            const worldWidth = 3000;
            const worldHeight = 3000;
            const scaleX = this.canvas.width / worldWidth;
            const scaleY = this.canvas.height / worldHeight;
            this.scale = Math.min(scaleX, scaleY);
            this.offsetX = (this.canvas.width - worldWidth * this.scale) / 2;
            this.offsetY = (this.canvas.height - worldHeight * this.scale) / 2;
            return;
        }

        const margin = 50;
        const worldWidth = bounds.maxX - bounds.minX;
        const worldHeight = bounds.maxY - bounds.minY;
        
        const scaleX = (this.canvas.width - 2 * margin) / worldWidth;
        const scaleY = (this.canvas.height - 2 * margin) / worldHeight;
        
        this.scale = Math.min(scaleX, scaleY);
        
        const centerWorldX = (bounds.minX + bounds.maxX) / 2;
        const centerWorldY = (bounds.minY + bounds.minY) / 2;
        
        this.offsetX = this.canvas.width / 2 - centerWorldX * this.scale;
        this.offsetY = this.canvas.height / 2 - centerWorldY * this.scale;
    }

    findPolygonAtPoint(model, worldX, worldY) {
        for (let i = model.polygons.length - 1; i >= 0; i--) {
            const polygon = model.polygons[i];
            if (this.isPointInPolygon(polygon, worldX, worldY)) {
                return i;
            }
        }
        return null;
    }

    isPointInPolygon(polygon, worldX, worldY) {
        if (polygon.segments.length === 0) return false;

        const [screenX, screenY] = this.worldToScreen(worldX, worldY);
        
        this.ctx.save();
        this.ctx.beginPath();
        
        const firstSeg = polygon.segments[0];
        const [startX, startY] = this.worldToScreen(...firstSeg.start);
        this.ctx.moveTo(startX, startY);

        for (let i = 0; i < polygon.segments.length; i++) {
            const seg = polygon.segments[i];
            const nextSeg = polygon.segments[(i + 1) % polygon.segments.length];
            const [endX, endY] = this.worldToScreen(...nextSeg.start);

            if (seg.type === 'line') {
                this.ctx.lineTo(endX, endY);
            } else if (seg.type === 'bezier') {
                const [c1x, c1y] = this.worldToScreen(...seg.c1);
                const [c2x, c2y] = this.worldToScreen(...seg.c2);
                this.ctx.bezierCurveTo(c1x, c1y, c2x, c2y, endX, endY);
            }
        }

        this.ctx.closePath();
        const result = this.ctx.isPointInPath(screenX, screenY);
        this.ctx.restore();
        
        return result;
    }

    findHandleAtPoint(polygon, worldX, worldY, tolerance = 10) {
        if (!polygon) return null;

        const [screenX, screenY] = this.worldToScreen(worldX, worldY);

        for (let i = 0; i < polygon.segments.length; i++) {
            const seg = polygon.segments[i];
            
            const [sx, sy] = this.worldToScreen(...seg.start);
            if (Math.hypot(screenX - sx, screenY - sy) < tolerance) {
                return { type: 'start', segmentIndex: i };
            }

            if (seg.type === 'bezier') {
                const [c1x, c1y] = this.worldToScreen(...seg.c1);
                if (Math.hypot(screenX - c1x, screenY - c1y) < tolerance) {
                    return { type: 'c1', segmentIndex: i };
                }

                const [c2x, c2y] = this.worldToScreen(...seg.c2);
                if (Math.hypot(screenX - c2x, screenY - c2y) < tolerance) {
                    return { type: 'c2', segmentIndex: i };
                }
            }
        }

        return null;
    }
}
