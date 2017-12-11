import Controller from '@ember/controller';
const { remote } = requireNode('electron');

export default Controller.extend({
    init(...args) {
        this._super(...args);
        const settings = remote.require('electron-settings');
        this.set('es_watcher', settings.watch('dbReady', (newVal, oldVal) => {
            console.log(`[DEBUG]: dbReady changed from ${oldVal} to ${newVal}`);
            this.set('dbReady', newVal)
        }));
        this.set('dbReady', settings.get('dbReady'));
    },
    destroy(...args) {
        const es_watcher = this.get('es_watcher');
        if (es_watcher && typeof es_watcher.dispose === 'function') {
            es_watcher.dispose();
        }
        this._super(...args);
    },
    makeSnapShots() {
        console.log('[DEBUG] application controller: makeSnapShots');
    }
});
