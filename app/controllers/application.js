import Controller from '@ember/controller';
import { computed, observer } from '@ember/object';
const { remote } = requireNode('electron');
import { doesTableExist } from 'r-place-canvas-tool/utils/db-helpers';


export default Controller.extend({
    init(...args) {
        this._super(...args);
        //this.set('', new Uint8ClampedArray());
        doesTableExist('tiles').then(dbAvailable => {
            this.set('dbAvailable', dbAvailable);
        })
    },
    destroy(...args) {
        // ...
        this._super(...args);
    },
    dbAvailable: null,
    endTime: 1490979300, // track in ms?
    /*
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
        }),
    */
    actionHandlers: {
        makeSnapShots() {
            console.log('[DEBUG] application controller: actionHandlers.makeSnapShots');
        }
    },
    canvasData: observer('endTime', function() {
        const endTime = this.get('endTime');
    })
});
