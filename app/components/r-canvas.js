import Component from '@ember/component';
import {computed} from '@ember/object';
import { later } from '@ember/runloop';

import { rgbColors } from 'r-place-canvas-tool/utils/color';

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
        context.fillStyle = rgbColors[color];
        context.fillRect(x, y, 1, 1);
    },
    actions: {
    }
});
