# Polygon Drawing Application

## Overview
A production-ready client-side HTML + JavaScript application for interactive polygon drawing and editing. The application uses the Canvas 2D API and plain JavaScript ES6 modules with no backend dependencies.

**Created:** October 22, 2025

## Project Purpose
Create a sophisticated polygon editor supporting:
- Interactive drawing with line and quadratic Bézier curve segments
- Integer-only coordinate system with automatic snapping
- Dual editing modes: visual canvas and synchronized textual editor
- Complete undo/redo functionality using Command Design Pattern
- File operations using File System Access API

## Architecture

### MVC Pattern
- **Model** (`js/model.js`): Polygon and segment data structures with integer coordinates
- **View** (`js/view.js`): Canvas rendering with view transform (zoom/pan), handle visualization
- **Controller** (`js/controller.js`): Tool state machine and interaction handling

### Additional Modules
- **Commands** (`js/commands.js`): Command Design Pattern implementation for undo/redo
- **Parser** (`js/parser.js`): Textual format parser with validation and error reporting
- **FileManager** (`js/file-manager.js`): File System Access API with fallback for older browsers
- **Main** (`js/main.js`): Application initialization and UI event coordination

## Key Features

### Coordinate System
- All world coordinates are integers (no floating-point in model or saved files)
- Automatic snapping on all interactions (clicks, drags, mouse movements)
- Standard rounding rule: ties (.5) round away from zero
- Status panel displays real-time snapped mouse coordinates

### Data Model
Each polygon is a cyclic ordered list of segments:
- **Line segment**: `start = [x, y]`, end = next segment's start
- **Quadratic Bézier segment**: `start = [x, y]`, `c1 = [x, y]`, `c2 = [x, y]`, end = next segment's start

### Textual Format
```
Polygon:
    Segment: (x, y)                    # Line segment
    Segment: (x1, y1, x2, y2, x3, y3)  # Quadratic Bézier segment
```

### Tools
1. **Select Tool**: Click polygon to select (highlighted in red)
2. **Draw Polygon Tool**:
   - Click to place start point, then end point for each segment
   - Press 's' to skip control points (creates line segment)
   - Press 'e' to connect back to start point (still allows adding control points for final segment)
   - Click two more times to add Bézier control points, or press 's' to skip
   - ESC cancels drawing
   - Dashed preview lines during drawing
3. **Move Tool**: Drag vertices and control points (live updates)

### View Controls
- **Zoom In/Out**: Scale view transform
- **Pan**: Arrow controls for navigation
- **Zoom All**: Fit all polygons with margin, or default (0,0) to (3000,3000) view

### File Operations
- **New**: Clear workspace
- **Open**: Load polygon file (with auto Zoom All)
- **Save**: Overwrite current file
- **Save As**: Save with new name
- Uses File System Access API with fallback for unsupported browsers

### Undo/Redo
- Complete Command Pattern implementation
- Supports AddPolygon, EditPolygon, DeletePolygon operations
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)

## UI Layout
- **Toolbar**: File, Edit, View, Tools menus
- **Canvas Widget**: Main drawing area (left panel)
- **Textual Editor**: Synchronized text editor with Apply button (right panel, 350px)
- **Status Panel**: Current tool, messages, file name, mouse coordinates

## Technical Details

### Dependencies
- None (pure HTML5, CSS3, JavaScript ES6+ modules)

### Browser Compatibility
- Modern browsers with Canvas 2D API support
- File System Access API with fallback to download/upload for older browsers

### Code Quality
- ES6 modules for clean architecture
- MVC separation of concerns
- Comprehensive error handling and validation
- Integer-only coordinate enforcement
- Deterministic snapping and rendering

## Development Notes

### Recent Changes (October 22, 2025)
- Initial implementation complete
- All core features implemented and tested
- Production-ready code with no TODOs or placeholders

### Project Structure
```
/
├── index.html           # Main HTML structure
├── styles.css           # Complete styling
├── js/
│   ├── main.js          # Application entry point
│   ├── model.js         # Data model
│   ├── view.js          # Canvas rendering
│   ├── controller.js    # Interaction handling
│   ├── commands.js      # Undo/Redo system
│   ├── parser.js        # Text format parser
│   └── file-manager.js  # File operations
└── replit.md           # This file
```

## User Preferences
- Clean, minimal design
- Full-window responsive layout
- Production-quality code
- No external dependencies
