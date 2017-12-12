import Controller from '@ember/controller';
import { computed, observer } from '@ember/object';
//import { later } from '@ember/runloop';

import { doesTableExist, defaultDbFile } from 'r-place-canvas-tool/utils/db-helpers';
import { colorBytes } from 'r-place-canvas-tool/utils/color';

const { remote } = requireNode('electron');

const data = new Uint8ClampedArray(4*1001*1001);

export default Controller.extend({
    init(...args) {
        this._super(...args);
        // FIXME: Shouldn't be using setInteval / polling for DB change
        //const checkDB = () => {
        //    doesTableExist('tiles').then(dbAvailable => {
        //        this.set('dbAvailable', dbAvailable);
        //    });
        //};
        //checkDB();
        //this.set('_checkDBInterval', setInterval(checkDB, 5000));
        const db = new sqlite3.Database(defaultDbFile);
        this.set('db', db);
        this.set('canvasData', data);
    },
    destroy(...args) {
        // ...
        this.get('db').close();
        //clearInterval(this.get('_checkDBInterval'));
        this._super(...args);
    },
    drawPixel({x, y, color}) {
        const index = 4*((1001)*x + y);
        colorBytes[color].forEach((x,i) => {
            data[index+i] = x;
        });
    },
    //_updated: false,
    dbAvailable: true,
    endTime: 1490979300, // track in ms?
    lastRenderedTime: 0,
    renderOnChange: observer('endTime', function() {
        // TODO: Throttle / drop new (use ember-concurrency?)
        const db = this.get('db');
        const canvasData = this.get('canvasData');
        const lastRenderedTime = this.get('lastRenderedTime');
        const targetTime = Math.ceil(1000 * parseFloat(this.get('endTime')));

        const pixel_query = 'SELECT x,y,color FROM tiles WHERE ' +
                            `timestamp >= ${snapshotTime} AND timestamp <= ${targetTime} ORDER BY timestamp ASC;`;
        console.log(`[DEBUG]: pixel_query = ${pixel_query}`);
        db.each(pixel_query, (err, row) => {
            if (err) {
                console.warn(err);
                return;
            }
            this.drawPixel({x: row.x, y: row.y, color: row.color});
        }, () => {
            console.log('[DEBUG] finished walk');
            //this.toggleProperty('_updated');
        });




        // 1. Compute delta t from currentTime (N/A for first render)
        // 2. Find 2 nearest snapshots:
        //     max(timestamp) <= targetTime
        //     min(timestamp) >= targetTime
        // 3. Choose smallest delta
/*
        const snapshotBeforePromise = new Promise((resolve, reject) => {
            let snapshotTime = -1;
            let snapshotData = null;
            const snapshot_query = `SELECT timestamp,canvas FROM canvas_snapshots WHERE timestamp <= ${targetTime} ORDER BY timestamp DESC LIMIT 1;`;
            console.log(`[DEBUG]: snapshot_query = ${snapshot_query}`);
            db.each(snapshot_query, (err, row) => {
                if (err) {
                    console.warn(err);
                    reject(err);
                    return;
                }
                snapshotTime = row.timestamp;
                snapshotData = row.canvas;
            }, () => { resolve({snapshotTime, snapshotData}); });
        })

        const snapshotAfterPromise = new Promise((resolve, reject) => {
            let snapshotTime = -1;
            let snapshotData = null;
            const snapshot_query = `SELECT timestamp,canvas FROM canvas_snapshots WHERE timestamp >= ${targetTime} ORDER BY timestamp ASC LIMIT 1;`;
            console.log(`[DEBUG]: snapshot_query = ${snapshot_query}`);
            db.each(snapshot_query, (err, row) => {
                if (err) {
                    console.warn(err);
                    reject(err);
                    return;
                }
                this.drawImage(row.canvas, { x: -x1, y: -y1});
                snapshotTime = row.timestamp;
                snapshotData = row.canvas;
            }, () => { resolve({snapshotTime, snapshotData }); });
        })

        Promise.all([snapshotBeforePromise, snapshotAfterPromise]).then((before, after) => {
            let beforeDistance = (before.snapshotTime === -1) ? Infinity : targetTime - before.snapshotTime;
            let afterDistance = (after.snapshotTime === -1) ? Infinity : after - targetTime.snapshotTime;
            let walkDistance = Math.abs(targetTime - lastRenderedTime);

            if (beforeDistance !== -1 &&
                (beforeDistance < afterDistance || afterDistance === -1)
                && beforeDistance < walkDistance) {
                // before snapshot is closest
                let buffer = Buffer.from(before.snapshotData, 'base64');
                buffer.copy(canvasData);
                //new ImageData(buffer, 1001, 1001)


                const pixel_query = `SELECT x,y,color FROM tiles WHERE x >= ${x1} AND x <= ${x2} AND y >= ${y1} AND y <= ${y2} AND timestamp >= ${snapshotTime} AND timestamp <= ${endTime} ORDER BY timestamp ASC;`;
                console.log(`[DEBUG]: pixel_query = ${pixel_query}`);
                db.each(pixel_query, (err, row) => {
                    if (err) {
                        console.warn(err);
                        return;
                    }
                    this.drawPixel({x: row.x - x1, y: row.y - y1, color: row.color});
                });

            }
            else if (afterDistance !== -1 && afterDistance < walkDistance) {
                // after snapshot is closest

            }
            else {
                // walking is closest
            }
*/
/*
            const pixel_query = `SELECT x,y,color FROM tiles WHERE x >= ${x1} AND x <= ${x2} AND y >= ${y1} AND y <= ${y2} AND timestamp >= ${snapshotTime} AND timestamp <= ${endTime} ORDER BY timestamp ASC;`;
            console.log(`[DEBUG]: pixel_query = ${pixel_query}`);
            db.each(pixel_query, (err, row) => {
                if (err) {
                    console.warn(err);
                    return;
                }
                this.drawPixel({x: row.x - x1, y: row.y - y1, color: row.color});
            });
*/
        });

    }),
    canvasData: observer('endTime', function() {
        const endTime = this.get('endTime');
    })
});
