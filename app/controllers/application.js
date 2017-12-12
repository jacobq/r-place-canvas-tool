import Controller from '@ember/controller';
import { computed, observer } from '@ember/object';
//import { later } from '@ember/runloop';

const { remote } = requireNode('electron');
const sqlite3 = requireNode('sqlite3').verbose();

import { doesTableExist, defaultDbFile } from 'r-place-canvas-tool/utils/db-helpers';
import { colorBytes } from 'r-place-canvas-tool/utils/color';


const data = new Uint8ClampedArray(4*1001*1001);

export default Controller.extend({
});
