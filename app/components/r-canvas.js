import Component from '@ember/component';
import { computed, observer} from '@ember/object';
import { later } from '@ember/runloop';

import { rgbColors, colorBytes } from 'r-place-canvas-tool/utils/color';

const fs = requireNode('fs');
const path = requireNode('path');
const { remote } = requireNode('electron');
const sqlite3 = requireNode('sqlite3');
const userDataPath = remote.app.getPath('userData');
const pathToDB = path.resolve(userDataPath, 'reddit-place.sqlite3');



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
    drawPixel({x, y, color}) {
        const index = 4*((1001)*x + y);
        colorBytes[color].forEach((x,i) => {
            data[index+i] = x;
        });
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
    /*
    drawImage(imageDataUri, offset) {
        console.log(`[DEBUG] drawImage`);
        const context = this.get('canvasContext');
        const img = new Image;
        img.onload = () => {
            context.drawImage(img,offset.x,offset.y);
        };
        img.src = imageDataUri;
    },
    */
    drawSnapShot(imageData, offset) {
        const context = this.get('canvasContext');
        context.putImageData(imageData,offset.x,offset.y);
    },
    drawPixel({x, y, color}) {
        //console.log(`[DEBUG] drawPixel (${x},${y},${color})`);
        const context = this.get('canvasContext');
        context.fillStyle = rgbColors[color];
        context.fillRect(x, y, 1, 1);
    },
    _lastRenderedTime: 0,
    renderOnChange: observer('endTime', function() {
        // TODO: Throttle / drop new (use ember-concurrency?)
        const db = this.get('db');
        const canvasData = this.get('canvasData');
        const lastRenderedTime = this.get('_lastRenderedTime');
        const targetTime = Math.ceil(1000 * parseFloat(this.get('endTime')));
        const x1 = this.get('x1');
        const y1 = this.get('y1');
        const x2 = this.get('x2');
        const y2 = this.get('y2');


        // 1. Compute delta t from currentTime (N/A for first render)
        // 2. Find 2 nearest snapshots:
        //     max(timestamp) <= targetTime
        //     min(timestamp) >= targetTime
        // 3. Choose smallest delta
        const snapshotBeforePromise = new Promise((resolve, reject) => {
            let snapshotTime = -1;
            let snapshotData = null;
            console.log('Running snapshot query');
            const snapshot_query = `SELECT timestamp,canvas FROM canvas_snapshots WHERE timestamp <= ${targetTime} ORDER BY timestamp DESC LIMIT 1;`;
            //console.log(`[DEBUG]: snapshot_query = ${snapshot_query}`);
            db.each(snapshot_query, (err, row) => {
                if (err) {
                    console.warn(err);
                    reject(err);
                    return;
                }
                snapshotTime = row.timestamp;
                snapshotData = row.canvas;
            }, () => {
                //console.log('Finished snapshot query', snapshotTime);
                resolve({snapshotTime, snapshotData});
            });
        });

        snapshotBeforePromise.then(before => {
            let beforeDistance = (before.snapshotTime === -1) ? Infinity : targetTime - before.snapshotTime;
            let walkDistance = targetTime - lastRenderedTime;

            if (before.snapshotTime !== -1 && (typeof before.snapshotData === "string") && (beforeDistance < walkDistance) ||  walkDistance < 0) {
                // before snapshot is closest
                console.log(`[DEBUG] using snapshot from ${before.snapshotTime}`);
                try {
                    let buffer = Buffer.from(before.snapshotData, 'base64');
                    this.drawSnapShot(new ImageData(new Uint8ClampedArray(buffer), 1001, 1001), {x: x1, y: y1});
                }
                catch (e) {
                    this.set('_lastRenderedTime', 0);
                    console.warn(e, typeof before.snapshotData);
                    return; // 'snapshot error'
                }
                //buffer.copy(canvasData);
                //new ImageData(buffer, 1001, 1001)

                const pixel_query = `SELECT x,y,color FROM tiles WHERE x >= ${x1} AND x <= ${x2} AND y >= ${y1} AND y <= ${y2}` +
                                    ` AND timestamp >= ${before.snapshotTime} AND timestamp <= ${targetTime} ORDER BY timestamp ASC;`;
                console.log(`[DEBUG]: pixel_query = ${pixel_query}`);
                db.each(pixel_query, (err, row) => {
                    if (err) {
                        console.warn(err);
                        return;
                    }
                    this.drawPixel({x: row.x - x1, y: row.y - y1, color: row.color});
                });

            }
            else {
                // walking is closest
                if (walkDistance < 0) {
                    this.set('_lastRenderedTime', 0);
                    this.clearCanvas();
                }

                const lastRenderedTime = this.set('_lastRenderedTime', 0);
                const pixel_query = `SELECT x,y,color FROM tiles WHERE x >= ${x1} AND x <= ${x2} AND y >= ${y1} AND y <= ${y2}` +
                    ` AND timestamp >= ${lastRenderedTime} AND timestamp <= ${targetTime} ORDER BY timestamp ASC;`;
                console.log(`[DEBUG]: pixel_query = ${pixel_query}`);
                db.each(pixel_query, (err, row) => {
                    if (err) {
                        console.warn(err);
                        return;
                    }
                    this.drawPixel({x: row.x - x1, y: row.y - y1, color: row.color});
                }, () => {
                    this.set('_lastRenderedTime', targetTime);
                });
            }
        });
    }),
    actions: {
    }
});
