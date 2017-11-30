import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { initDB } from 'r-place-canvas-tool/utils/db-helpers';

const fs = requireNode('fs');
const { remote } = requireNode('electron');
const sqlite3 = requireNode('sqlite3');

export default Component.extend({
    notifications: service('notification-messages'),
    classNames: ['nav-bar'],
    dbNotPresent: false, // TODO
    didInsertElement() {
        this.$(".dropdown-button").dropdown({
            constrainWidth: false,
            belowOrigin: true,
            //alignment: 'right'
        });
    },
    willDestroyElement() {
        // TODO: De-init?
        //this.$(".dropdown-button").dropdown();
    },
    actions: {
        importCSV() {
            //console.log(`[DEBUG]: importCSV`);
            const openDialogResult = remote.dialog.showOpenDialog({
                title: "Export current canvas state as...",
                //defaultPath: ``,
                //buttonLabel: '',
                filters: [{
                    name: 'Comma separated values', extensions: ['csv']
                }],
                properties: ['openFile', 'treatPackageAsDirectory'],
                //message: ''
            });
            if (openDialogResult === undefined)
                return;

            initDB({
                tilesCSV: openDialogResult[0]
            });
        },
        exportImage() {
            const saveDialogResult = dialog.showSaveDialog({
                title: "Export current canvas state as...",
                defaultPath: `canvas-${this.get('endTime')}.png`,
                //buttonLabel: '',
                filters: [{
                    name: 'PNG', extensions: ['png']
                }]
            });
            if (saveDialogResult === undefined)
                return;

            const pngBase64Data = this.$('canvas').get(0)
                .toDataURL("image/png", 1.0)
                .replace("data:image/png;base64,", "");
            fs.writeFileSync(saveDialogResult, new Buffer(pngBase64Data, "base64"))
        },
        makeSnapShots() {
            const db = this.get('db');
            // There are 16 million tile placements
            // so if we're saving every 20k we should expect around 800 snapshots (~5MB each due to format)
            const interval = 20000;
            const canvas = this.get('canvas');
            const context = this.get('canvasContext');

            // Force full size
            this.set('x1', 0);
            this.set('y1', 0);
            this.set('x2', 1000);
            this.set('y2', 1000);

            // 1. Clear canvas
            this.clearCanvas();

            const saveSnapshot = timestamp => {
                console.log('[DEBUG] creating snapshot at timestamp =', timestamp);
                const dataURL = canvas.toDataURL('image/png', 1.0);
                db.run(`INSERT OR REPLACE INTO canvas_snapshots (timestamp, canvas) VALUES (${timestamp}, "${dataURL}")`);
            };

            // 2. Get all pixels
            const all_pixels_query = 'SELECT timestamp,x,y,color FROM tiles ORDER BY timestamp ASC;';
            console.log(`[DEBUG]: makeSnapShots: all_pixels_query = ${all_pixels_query}`);
            let count = 0;
            db.serialize(() => {
                db.serialize(() => {
                    console.log('[DEBUG]: dropping & recreating canvas_snapshots table');
                    db.run('DROP TABLE IF EXISTS canvas_snapshots;')
                    db.run('CREATE TABLE canvas_snapshots (timestamp integer UNIQUE, canvas blob);');
                });

                db.each(all_pixels_query, (err, row) => {
                    if (err) {
                        console.warn(err);
                        return;
                    }

                    this.drawPixel({x: row.x, y: row.y, color: row.color});

                    // 3. Every <interval> pixels, get base64 encoded bitmap of canvas
                    //    and save in canvas-snapshots table with timestamp of last-drawn pixel
                    if (++count >= interval) {
                        saveSnapshot(row.timestamp);
                        count = 0;
                    }
                });
            });
        }
    }
});
