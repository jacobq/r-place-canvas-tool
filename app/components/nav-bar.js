import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { initDB, addPreviousColorData } from 'r-place-canvas-tool/utils/db-helpers';

const fs = requireNode('fs');
const { remote } = requireNode('electron');

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
            }).then(() => {
                return addPreviousColorData();
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
            const f = this.get('makeSnapShots') || (function() {});
            f();
        }
    }
});
