export class Command {
    execute() {
        throw new Error('execute() must be implemented');
    }

    undo() {
        throw new Error('undo() must be implemented');
    }
}

export class AddPolygonCommand extends Command {
    constructor(model, polygon) {
        super();
        this.model = model;
        this.polygon = polygon;
    }

    execute() {
        this.model.addPolygon(this.polygon);
    }

    undo() {
        this.model.removePolygon(this.model.polygons.length - 1);
    }
}

export class DeletePolygonCommand extends Command {
    constructor(model, index) {
        super();
        this.model = model;
        this.index = index;
        this.polygon = null;
    }

    execute() {
        this.polygon = this.model.polygons[this.index].clone();
        this.model.removePolygon(this.index);
    }

    undo() {
        this.model.polygons.splice(this.index, 0, this.polygon);
        this.model.notifyListeners();
    }
}

export class EditPolygonCommand extends Command {
    constructor(model, index, newPolygon) {
        super();
        this.model = model;
        this.index = index;
        this.newPolygon = newPolygon;
        this.oldPolygon = null;
    }

    execute() {
        this.oldPolygon = this.model.polygons[this.index].clone();
        this.model.updatePolygon(this.index, this.newPolygon);
    }

    undo() {
        this.model.updatePolygon(this.index, this.oldPolygon);
    }
}

export class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.listeners = [];
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        for (const listener of this.listeners) {
            listener();
        }
    }

    executeCommand(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
        this.notifyListeners();
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
        this.notifyListeners();
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;
        
        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);
        this.notifyListeners();
        return true;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notifyListeners();
    }
}
