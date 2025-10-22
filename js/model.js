export class Segment {
    constructor(type, start, c1 = null, c2 = null) {
        this.type = type;
        this.start = start;
        this.c1 = c1;
        this.c2 = c2;
    }

    clone() {
        return new Segment(
            this.type,
            [...this.start],
            this.c1 ? [...this.c1] : null,
            this.c2 ? [...this.c2] : null
        );
    }
}

export class Polygon {
    constructor(segments = []) {
        this.segments = segments;
    }

    clone() {
        return new Polygon(this.segments.map(seg => seg.clone()));
    }

    addSegment(segment) {
        this.segments.push(segment);
    }

    isClosed() {
        return this.segments.length > 0;
    }

    getBounds() {
        if (this.segments.length === 0) {
            return null;
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const seg of this.segments) {
            const points = [seg.start];
            if (seg.c1) points.push(seg.c1);
            if (seg.c2) points.push(seg.c2);

            for (const [x, y] of points) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }

        return { minX, minY, maxX, maxY };
    }
}

export class Model {
    constructor() {
        this.polygons = [];
        this.selectedPolygonIndex = null;
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

    addPolygon(polygon) {
        this.polygons.push(polygon);
        this.notifyListeners();
    }

    removePolygon(index) {
        if (index >= 0 && index < this.polygons.length) {
            this.polygons.splice(index, 1);
            if (this.selectedPolygonIndex === index) {
                this.selectedPolygonIndex = null;
            } else if (this.selectedPolygonIndex > index) {
                this.selectedPolygonIndex--;
            }
            this.notifyListeners();
        }
    }

    updatePolygon(index, polygon) {
        if (index >= 0 && index < this.polygons.length) {
            this.polygons[index] = polygon;
            this.notifyListeners();
        }
    }

    setPolygons(polygons) {
        this.polygons = polygons;
        this.selectedPolygonIndex = null;
        this.notifyListeners();
    }

    selectPolygon(index) {
        this.selectedPolygonIndex = index;
        this.notifyListeners();
    }

    getSelectedPolygon() {
        if (this.selectedPolygonIndex !== null && 
            this.selectedPolygonIndex >= 0 && 
            this.selectedPolygonIndex < this.polygons.length) {
            return this.polygons[this.selectedPolygonIndex];
        }
        return null;
    }

    clear() {
        this.polygons = [];
        this.selectedPolygonIndex = null;
        this.notifyListeners();
    }

    getAllBounds() {
        if (this.polygons.length === 0) {
            return null;
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const polygon of this.polygons) {
            const bounds = polygon.getBounds();
            if (bounds) {
                minX = Math.min(minX, bounds.minX);
                minY = Math.min(minY, bounds.minY);
                maxX = Math.max(maxX, bounds.maxX);
                maxY = Math.max(maxY, bounds.maxY);
            }
        }

        if (minX === Infinity) {
            return null;
        }

        return { minX, minY, maxX, maxY };
    }
}
