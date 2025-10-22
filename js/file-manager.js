export class FileManager {
    constructor() {
        this.currentFileHandle = null;
        this.currentFileName = 'Untitled';
        this.supportsFileSystemAccess = 'showOpenFilePicker' in window;
        this.listeners = [];
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        for (const listener of this.listeners) {
            listener(this.currentFileName);
        }
    }

    async newFile() {
        this.currentFileHandle = null;
        this.currentFileName = 'Untitled';
        this.notifyListeners();
        return true;
    }

    async openFile() {
        try {
            if (this.supportsFileSystemAccess) {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Polygon Files',
                        accept: { 'text/plain': ['.txt', '.poly'] }
                    }],
                    multiple: false
                });

                const file = await fileHandle.getFile();
                const content = await file.text();
                
                this.currentFileHandle = fileHandle;
                this.currentFileName = file.name;
                this.notifyListeners();
                
                return content;
            } else {
                return new Promise((resolve, reject) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt,.poly';
                    
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const content = await file.text();
                            this.currentFileName = file.name;
                            this.notifyListeners();
                            resolve(content);
                        } else {
                            reject(new Error('No file selected'));
                        }
                    };
                    
                    input.oncancel = () => {
                        reject(new Error('File selection cancelled'));
                    };
                    
                    input.click();
                });
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('File selection cancelled');
            }
            throw error;
        }
    }

    async saveFile(content) {
        try {
            if (this.currentFileHandle) {
                if (this.supportsFileSystemAccess) {
                    const writable = await this.currentFileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    return true;
                }
            }
            
            return await this.saveFileAs(content);
        } catch (error) {
            throw new Error(`Failed to save file: ${error.message}`);
        }
    }

    async saveFileAs(content) {
        try {
            if (this.supportsFileSystemAccess) {
                const fileHandle = await window.showSaveFilePicker({
                    types: [{
                        description: 'Polygon Files',
                        accept: { 'text/plain': ['.txt', '.poly'] }
                    }],
                    suggestedName: this.currentFileName !== 'Untitled' ? 
                        this.currentFileName : 'polygon.txt'
                });

                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                
                this.currentFileHandle = fileHandle;
                this.currentFileName = fileHandle.name;
                this.notifyListeners();
                
                return true;
            } else {
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = this.currentFileName !== 'Untitled' ? 
                    this.currentFileName : 'polygon.txt';
                a.click();
                URL.revokeObjectURL(url);
                
                return true;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Save cancelled');
            }
            throw new Error(`Failed to save file: ${error.message}`);
        }
    }

    getFileName() {
        return this.currentFileName;
    }
}
