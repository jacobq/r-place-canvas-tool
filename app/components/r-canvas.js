import Component from '@ember/component';
import {computed, observer} from '@ember/object';
import { later } from '@ember/runloop';


const fs = requireNode('fs');
const path = requireNode('path');
const { remote } = requireNode('electron');
const sqlite3 = requireNode('sqlite3');
const userDataPath = remote.app.getPath('userData');
const pathToDB = path.resolve(userDataPath, 'reddit-place.sqlite3');

const palette = [
    {r: 255, g: 255, b: 255},
    {r: 228, g: 228, b: 228},
    {r: 136, g: 136, b: 136},
    {r: 34, g: 34, b: 34},
    {r: 255, g: 167, b: 209},
    {r: 229, g: 0, b: 0},
    {r: 229, g: 149, b: 0},
    {r: 160, g: 106, b: 66},
    {r: 229, g: 217, b: 0},
    {r: 148, g: 224, b: 68},
    {r: 2, g: 190, b: 1},
    {r: 0, g: 211, b: 221},
    {r: 0, g: 131, b: 199},
    {r: 0, g: 0, b: 234},
    {r: 207, g: 110, b: 228},
    {r: 130, g: 0, b: 128}
].map(color => `rgb(${color.r},${color.g},${color.b})`);


export default Component.extend({
    classNames: ['r-canvas'],
    attributeBindings: ['height', 'width'],
    init(...args) {
        this._super(...args);
        this.set('db', new sqlite3.Database(pathToDB));
    },
    destroy(...args) {
        const db = this.get('db');
        if (db && typeof db.close === 'function')
            db.close();
        this._super(...args);
    },
    didInsertElement() {
        console.log('[DEBUG] r-canvas didInsertElement');
        this.set('canvas', this.$('canvas').get(0));
        this.set('canvasContext', this.$('canvas').get(0).getContext('2d'));
    },
    // Note: endTime is stored in seconds (not ms) to avoid 32-bit int overflow
    endTime: 1491238730,
    // min: 1490919379000
    // about 25% -->1490999216750
    // max: 1491238730000
    x1: 0,
    y1: 0,
    x2: 1000,
    y2: 1000,
    height: computed('y1', 'y2', function () {
        const y1 = Math.round(parseFloat(this.get('y1')));
        const y2 = Math.round(parseFloat(this.get('y2')));
        return Math.abs(y2 - y1) + 1;
    }),
    width: computed('x1', 'x2', function () {
        const x1 = Math.round(parseFloat(this.get('x1')));
        const x2 = Math.round(parseFloat(this.get('x2')));
        return Math.abs(x2 - x1) + 1;
    }),
    clearCanvas() {
        const context = this.get('canvasContext');
        context.fillStyle = 'white';
        context.fillRect(0, 0, this.get('width'), this.get('height'));
    },
    drawImage(imageDataUri, offset) {
        console.log(`[DEBUG] drawImage`);
        const context = this.get('canvasContext');
        const img = new Image;
        img.onload = () => {
            context.drawImage(img,offset.x,offset.y);
        };
        img.src = imageDataUri;
    },
    drawPixel({x, y, color}) {
        //console.log(`[DEBUG] drawPixel (${x},${y},${color})`);
        const context = this.get('canvasContext');
        context.fillStyle = palette[color];
        context.fillRect(x, y, 1, 1);
    },
    renderOnChange: observer('endTime', function() {
        // TODO: Throttle / drop new (use ember-concurrency?)

        // Note: if going forward in time a small amount we should just go pixel by pixel

        const x1 = Math.round(parseFloat(this.get('x1')));
        const y1 = Math.round(parseFloat(this.get('y1')));
        const x2 = Math.round(parseFloat(this.get('x2')));
        const y2 = Math.round(parseFloat(this.get('y2')));
        // Note: endTime converted to ms here
        const endTime = Math.ceil(1000 * parseFloat(this.get('endTime')));
        console.log(`[DEBUG]: draw x1=${x1},x2=${x2},y1=${y1},y2=${y2},endTime=${endTime}`);
        const db = this.get('db');

        // 1. Find newest snapshot with timestamp <= endTime
        // 2. Load snapshot (or clear canvas if none found)
        // 3. Get & draw new pixels

        let snapshotTime = 0;
        this.clearCanvas();
        const snapshot_query = `SELECT timestamp,canvas FROM canvas_snapshots WHERE timestamp <= ${endTime} ORDER BY timestamp DESC LIMIT 1;`;
        console.log(`[DEBUG]: snapshot_query = ${snapshot_query}`);
        db.each(snapshot_query, (err, row) => {
            if (err) {
                console.warn(err);
                return;
            }
            this.drawImage(row.canvas, { x: -x1, y: -y1});
            snapshotTime = row.timestamp;
        });

        // FIXME: need to wait for image to load to avoid out-of-order writes
        // For now just wait 3 seconds and then start drawing the pixels
        later(() => {
            const pixel_query = `SELECT x,y,color FROM tiles WHERE x >= ${x1} AND x <= ${x2} AND y >= ${y1} AND y <= ${y2} AND timestamp >= ${snapshotTime} AND timestamp <= ${endTime} ORDER BY timestamp ASC;`;
            console.log(`[DEBUG]: pixel_query = ${pixel_query}`);
            db.each(pixel_query, (err, row) => {
                if (err) {
                    console.warn(err);
                    return;
                }
                this.drawPixel({x: row.x - x1, y: row.y - y1, color: row.color});
            });
        }, 3000);
    })
});
