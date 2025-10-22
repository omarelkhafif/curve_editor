import { Model } from './model.js';
import { View } from './view.js';
import { Controller } from './controller.js';
import { CommandManager, DeletePolygonCommand } from './commands.js';
import { TextParser, ParseError } from './parser.js';
import { FileManager } from './file-manager.js';

class App {
    constructor() {
        this.model = new Model();
        this.canvas = document.getElementById('canvas');
        this.view = new View(this.canvas);
        this.commandManager = new CommandManager();
        this.controller = new Controller(this.model, this.view, this.commandManager);
        this.fileManager = new FileManager();
        this.textEditor = document.getElementById('text-editor');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMenus();
        this.updateUI();
        this.render();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        document.getElementById('apply-btn').addEventListener('click', () => this.applyTextEditor());
        
        this.model.addListener(() => this.onModelChange());
        this.commandManager.addListener(() => this.updateUndoRedoButtons());
        this.controller.addListener((tool) => this.onToolChange(tool));
        this.fileManager.addListener((fileName) => this.updateFileName(fileName));
    }

    setupMenus() {
        const menuButtons = document.querySelectorAll('.menu-btn');
        menuButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const menuName = btn.dataset.menu;
                const menu = btn.parentElement;
                
                document.querySelectorAll('.menu.active').forEach(m => {
                    if (m !== menu) m.classList.remove('active');
                });
                
                menu.classList.toggle('active');
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.menu.active').forEach(m => {
                m.classList.remove('active');
            });
        });

        const actionButtons = document.querySelectorAll('[data-action]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.handleAction(action);
                
                document.querySelectorAll('.menu.active').forEach(m => {
                    m.classList.remove('active');
                });
            });
        });
    }

    handleAction(action) {
        switch (action) {
            case 'new':
                this.handleNew();
                break;
            case 'open':
                this.handleOpen();
                break;
            case 'save':
                this.handleSave();
                break;
            case 'save-as':
                this.handleSaveAs();
                break;
            case 'undo':
                this.handleUndo();
                break;
            case 'redo':
                this.handleRedo();
                break;
            case 'delete':
                this.handleDelete();
                break;
            case 'zoom-in':
                this.view.zoomIn();
                this.render();
                break;
            case 'zoom-out':
                this.view.zoomOut();
                this.render();
                break;
            case 'pan-up':
                this.view.pan(0, 50);
                this.render();
                break;
            case 'pan-down':
                this.view.pan(0, -50);
                this.render();
                break;
            case 'pan-left':
                this.view.pan(50, 0);
                this.render();
                break;
            case 'pan-right':
                this.view.pan(-50, 0);
                this.render();
                break;
            case 'zoom-all':
                this.view.zoomAll(this.model);
                this.render();
                break;
            case 'tool-select':
                this.controller.setTool('select');
                this.updateCanvasCursor();
                break;
            case 'tool-draw':
                this.controller.setTool('draw');
                this.updateCanvasCursor();
                break;
            case 'tool-move':
                this.controller.setTool('move');
                this.updateCanvasCursor();
                break;
        }
    }

    async handleNew() {
        await this.fileManager.newFile();
        this.model.clear();
        this.commandManager.clear();
        this.controller.cancelCurrentOperation();
        this.updateTextEditor();
        this.setStatusMessage('New file created', 'success');
    }

    async handleOpen() {
        try {
            const content = await this.fileManager.openFile();
            const polygons = TextParser.parse(content);
            this.model.setPolygons(polygons);
            this.commandManager.clear();
            this.controller.cancelCurrentOperation();
            this.updateTextEditor();
            this.view.zoomAll(this.model);
            this.render();
            this.setStatusMessage(`Opened ${this.fileManager.getFileName()}`, 'success');
        } catch (error) {
            if (error instanceof ParseError) {
                this.setStatusMessage(`Parse error at line ${error.line}: ${error.message}`, 'error');
            } else if (error.message.includes('cancelled')) {
                this.setStatusMessage('Open cancelled', '');
            } else {
                this.setStatusMessage(`Error opening file: ${error.message}`, 'error');
            }
        }
    }

    async handleSave() {
        try {
            const content = TextParser.serialize(this.model.polygons);
            await this.fileManager.saveFile(content);
            this.setStatusMessage(`Saved ${this.fileManager.getFileName()}`, 'success');
        } catch (error) {
            if (error.message.includes('cancelled')) {
                this.setStatusMessage('Save cancelled', '');
            } else {
                this.setStatusMessage(`Error saving file: ${error.message}`, 'error');
            }
        }
    }

    async handleSaveAs() {
        try {
            const content = TextParser.serialize(this.model.polygons);
            await this.fileManager.saveFileAs(content);
            this.setStatusMessage(`Saved as ${this.fileManager.getFileName()}`, 'success');
        } catch (error) {
            if (error.message.includes('cancelled')) {
                this.setStatusMessage('Save cancelled', '');
            } else {
                this.setStatusMessage(`Error saving file: ${error.message}`, 'error');
            }
        }
    }

    handleUndo() {
        if (this.commandManager.undo()) {
            this.updateTextEditor();
            this.setStatusMessage('Undo', 'success');
        }
    }

    handleRedo() {
        if (this.commandManager.redo()) {
            this.updateTextEditor();
            this.setStatusMessage('Redo', 'success');
        }
    }

    handleDelete() {
        if (this.model.selectedPolygonIndex !== null) {
            const command = new DeletePolygonCommand(this.model, this.model.selectedPolygonIndex);
            this.commandManager.executeCommand(command);
            this.updateTextEditor();
            this.setStatusMessage('Polygon deleted', 'success');
        }
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.controller.handleMouseDown(x, y);
        this.render();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const [snappedX, snappedY] = this.controller.handleMouseMove(x, y);
        this.updateMouseCoordinates(snappedX, snappedY);
        this.render();
    }

    handleMouseUp(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.controller.handleMouseUp(x, y);
        this.updateTextEditor();
        this.render();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.controller.handleClick(x, y);
        this.render();
    }

    handleKeyDown(e) {
        if (e.target === this.textEditor) {
            return;
        }

        this.controller.handleKeyDown(e.key);
        this.render();

        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.handleUndo();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            this.handleRedo();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.handleSave();
        } else if (e.key === 'Delete' && this.model.selectedPolygonIndex !== null) {
            e.preventDefault();
            this.handleDelete();
        }
    }

    applyTextEditor() {
        try {
            const text = this.textEditor.value;
            const polygons = TextParser.parse(text);
            this.model.setPolygons(polygons);
            this.commandManager.clear();
            this.setStatusMessage('Text applied successfully', 'success');
            this.render();
        } catch (error) {
            if (error instanceof ParseError) {
                this.setStatusMessage(`Parse error at line ${error.line}: ${error.message}`, 'error');
            } else {
                this.setStatusMessage(`Error: ${error.message}`, 'error');
            }
        }
    }

    onModelChange() {
        this.render();
    }

    onToolChange(tool) {
        const toolNames = {
            'select': 'Select',
            'draw': 'Draw Polygon',
            'move': 'Move'
        };
        document.getElementById('status-tool').textContent = `Tool: ${toolNames[tool] || tool}`;
    }

    updateTextEditor() {
        this.textEditor.value = TextParser.serialize(this.model.polygons);
    }

    updateUndoRedoButtons() {
        const undoBtn = document.querySelector('[data-action="undo"]');
        const redoBtn = document.querySelector('[data-action="redo"]');
        
        if (undoBtn) undoBtn.disabled = !this.commandManager.canUndo();
        if (redoBtn) redoBtn.disabled = !this.commandManager.canRedo();
    }

    updateFileName(fileName) {
        document.getElementById('status-file').textContent = fileName;
    }

    updateMouseCoordinates(x, y) {
        document.getElementById('status-coords').textContent = `X: ${x}, Y: ${y}`;
    }

    setStatusMessage(message, type = '') {
        const statusMsg = document.getElementById('status-message');
        statusMsg.textContent = message;
        statusMsg.className = 'status-item';
        if (type) {
            statusMsg.classList.add(type);
        }
    }

    updateCanvasCursor() {
        this.canvas.className = '';
        if (this.controller.currentTool === 'select') {
            this.canvas.classList.add('tool-select');
        } else if (this.controller.currentTool === 'move') {
            this.canvas.classList.add('tool-move');
        }
    }

    updateUI() {
        this.updateUndoRedoButtons();
        this.updateFileName(this.fileManager.getFileName());
        this.updateTextEditor();
        this.updateCanvasCursor();
    }

    render() {
        this.view.render(this.model, this.controller.getDrawState());
    }
}

const app = new App();
