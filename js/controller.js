import { Polygon, Segment } from './model.js';
import { AddPolygonCommand, EditPolygonCommand } from './commands.js';

export class Controller {
    constructor(model, view, commandManager) {
        this.model = model;
        this.view = view;
        this.commandManager = commandManager;
        this.currentTool = 'select';
        this.drawState = null;
        this.dragState = null;
        this.listeners = [];
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        for (const listener of this.listeners) {
            listener(this.currentTool);
        }
    }

    setTool(tool) {
        this.cancelCurrentOperation();
        this.currentTool = tool;
        this.notifyListeners();
    }

    cancelCurrentOperation() {
        this.drawState = null;
        this.dragState = null;
    }

    handleMouseDown(screenX, screenY) {
        const [worldX, worldY] = this.view.screenToWorld(screenX, screenY);
        const [snappedX, snappedY] = this.view.snapPoint([worldX, worldY]);

        if (this.currentTool === 'select') {
            const polygonIndex = this.view.findPolygonAtPoint(this.model, snappedX, snappedY);
            this.model.selectPolygon(polygonIndex);
        } else if (this.currentTool === 'move') {
            const selectedPolygon = this.model.getSelectedPolygon();
            if (selectedPolygon) {
                const handle = this.view.findHandleAtPoint(selectedPolygon, snappedX, snappedY);
                if (handle) {
                    this.dragState = {
                        type: 'handle',
                        handle,
                        originalPolygon: selectedPolygon.clone(),
                        polygonIndex: this.model.selectedPolygonIndex
                    };
                } else if (this.view.isPointInPolygon(selectedPolygon, snappedX, snappedY)) {
                    this.dragState = {
                        type: 'polygon',
                        startX: snappedX,
                        startY: snappedY,
                        originalPolygon: selectedPolygon.clone(),
                        polygonIndex: this.model.selectedPolygonIndex
                    };
                }
            }
        }
    }

    handleMouseMove(screenX, screenY) {
        const [worldX, worldY] = this.view.screenToWorld(screenX, screenY);
        const [snappedX, snappedY] = this.view.snapPoint([worldX, worldY]);

        if (this.currentTool === 'draw' && this.drawState) {
            if (this.drawState.waitingForEnd) {
                this.drawState.previewStart = this.drawState.segments[this.drawState.segments.length - 1].start;
                this.drawState.previewEnd = [snappedX, snappedY];
            } else if (this.drawState.waitingForC1) {
                this.drawState.previewStart = this.drawState.segments[this.drawState.segments.length - 1].start;
                this.drawState.previewEnd = [snappedX, snappedY];
            } else if (this.drawState.waitingForC2) {
                this.drawState.previewStart = this.drawState.currentEnd;
                this.drawState.previewEnd = [snappedX, snappedY];
            }
        } else if (this.currentTool === 'move' && this.dragState) {
            const selectedPolygon = this.model.getSelectedPolygon();
            if (selectedPolygon) {
                if (this.dragState.type === 'handle') {
                    const { handle } = this.dragState;
                    const segment = selectedPolygon.segments[handle.segmentIndex];

                    if (handle.type === 'start') {
                        segment.start = [snappedX, snappedY];
                        
                        const prevIndex = (handle.segmentIndex - 1 + selectedPolygon.segments.length) % selectedPolygon.segments.length;
                        if (prevIndex !== handle.segmentIndex && selectedPolygon.segments[prevIndex]) {
                            const prevEndIndex = handle.segmentIndex;
                            if (prevEndIndex === 0 && selectedPolygon.segments.length > 0) {
                                selectedPolygon.segments[prevIndex].start;
                            }
                        }
                    } else if (handle.type === 'c1') {
                        segment.c1 = [snappedX, snappedY];
                    } else if (handle.type === 'c2') {
                        segment.c2 = [snappedX, snappedY];
                    }
                } else if (this.dragState.type === 'polygon') {
                    const dx = snappedX - this.dragState.startX;
                    const dy = snappedY - this.dragState.startY;
                    
                    for (const segment of selectedPolygon.segments) {
                        const originalSeg = this.dragState.originalPolygon.segments[selectedPolygon.segments.indexOf(segment)];
                        segment.start = [originalSeg.start[0] + dx, originalSeg.start[1] + dy];
                        
                        if (segment.type === 'bezier') {
                            segment.c1 = [originalSeg.c1[0] + dx, originalSeg.c1[1] + dy];
                            segment.c2 = [originalSeg.c2[0] + dx, originalSeg.c2[1] + dy];
                        }
                    }
                }

                this.model.notifyListeners();
            }
        }

        return [snappedX, snappedY];
    }

    handleMouseUp(screenX, screenY) {
        if (this.currentTool === 'move' && this.dragState) {
            const { polygonIndex, originalPolygon } = this.dragState;
            const newPolygon = this.model.polygons[polygonIndex].clone();
            
            const command = new EditPolygonCommand(this.model, polygonIndex, newPolygon);
            this.commandManager.undoStack.push(command);
            this.commandManager.redoStack = [];
            
            this.dragState = null;
        }
    }

    handleClick(screenX, screenY) {
        if (this.currentTool !== 'draw') return;

        const [worldX, worldY] = this.view.screenToWorld(screenX, screenY);
        const [snappedX, snappedY] = this.view.snapPoint([worldX, worldY]);

        if (!this.drawState) {
            this.drawState = {
                segments: [],
                waitingForEnd: true,
                currentStart: [snappedX, snappedY],
                currentEnd: null,
                currentC1: null,
                currentC2: null,
                previewStart: null,
                previewEnd: null,
                isClosing: false
            };
            
            this.drawState.segments.push(new Segment('line', [snappedX, snappedY]));
        } else if (this.drawState.waitingForEnd) {
            this.drawState.currentEnd = [snappedX, snappedY];
            this.drawState.waitingForEnd = false;
            this.drawState.waitingForC1 = true;
            this.drawState.previewStart = null;
            this.drawState.previewEnd = null;
        } else if (this.drawState.waitingForC1) {
            this.drawState.currentC1 = [snappedX, snappedY];
            this.drawState.waitingForC1 = false;
            this.drawState.waitingForC2 = true;
        } else if (this.drawState.waitingForC2) {
            this.drawState.currentC2 = [snappedX, snappedY];
            
            const lastSegment = this.drawState.segments[this.drawState.segments.length - 1];
            lastSegment.type = 'bezier';
            lastSegment.c1 = this.drawState.currentC1;
            lastSegment.c2 = this.drawState.currentC2;
            
            if (this.drawState.isClosing) {
                const polygon = new Polygon(this.drawState.segments);
                const command = new AddPolygonCommand(this.model, polygon);
                this.commandManager.executeCommand(command);
                this.drawState = null;
            } else {
                this.drawState.segments.push(new Segment('line', this.drawState.currentEnd));
                this.drawState.currentStart = this.drawState.currentEnd;
                this.drawState.currentEnd = null;
                this.drawState.currentC1 = null;
                this.drawState.currentC2 = null;
                this.drawState.waitingForC2 = false;
                this.drawState.waitingForEnd = true;
                this.drawState.previewStart = null;
                this.drawState.previewEnd = null;
            }
        }
    }

    handleKeyDown(key) {
        if (this.currentTool === 'draw' && this.drawState) {
            if (key === 's' || key === 'S') {
                if (this.drawState.waitingForC1 && this.drawState.currentEnd) {
                    if (this.drawState.isClosing) {
                        const polygon = new Polygon(this.drawState.segments);
                        const command = new AddPolygonCommand(this.model, polygon);
                        this.commandManager.executeCommand(command);
                        this.drawState = null;
                    } else {
                        this.drawState.segments.push(new Segment('line', this.drawState.currentEnd));
                        this.drawState.currentStart = this.drawState.currentEnd;
                        this.drawState.currentEnd = null;
                        this.drawState.waitingForC1 = false;
                        this.drawState.waitingForEnd = true;
                        this.drawState.previewStart = null;
                        this.drawState.previewEnd = null;
                    }
                }
            } else if (key === 'e' || key === 'E') {
                if (this.drawState.segments.length > 0) {
                    if (this.drawState.waitingForEnd) {
                        const firstPoint = this.drawState.segments[0].start;
                        this.drawState.currentEnd = firstPoint;
                        this.drawState.waitingForEnd = false;
                        this.drawState.waitingForC1 = true;
                        this.drawState.isClosing = true;
                        this.drawState.previewStart = null;
                        this.drawState.previewEnd = null;
                    } else if (this.drawState.waitingForC1 && this.drawState.isClosing) {
                        const polygon = new Polygon(this.drawState.segments);
                        const command = new AddPolygonCommand(this.model, polygon);
                        this.commandManager.executeCommand(command);
                        this.drawState = null;
                    }
                }
            } else if (key === 'Escape') {
                this.drawState = null;
            }
        }
    }

    getDrawState() {
        return this.drawState;
    }
}
