const fs = requireNode('fs');
const path = requireNode('path');
const readline = requireNode('readline');

const { remote } = requireNode('electron');
const sqlite3 = requireNode('sqlite3').verbose();

const resourcesPath = path.resolve(__dirname, '..', 'ember-electron', 'resources');
const userDataPath = remote.app.getPath('userData');

// This function takes tile data (CSV) and creates an SQLite DB table with a row for each placement
export function initDB(options) {
    options = Object.assign({
        tilesCSV: path.resolve(resourcesPath, 'tile-placement.csv'),
        dbFile: path.resolve(userDataPath, 'reddit-place.sqlite3'),
    }, options);
    console.log(`[DEBUG]: initDB options = ${JSON.stringify(options)}`);

    return new Promise((resolve, reject) => {
        if (!fs.existsSync(options.tilesCSV)) {
            const message = `The CSV file provided does not exist: ${options.tilesCSV}`;
            console.warn(message);
            reject(message);
            return;
        }

        const readStream = fs.createReadStream(options.tilesCSV);
        const rl = readline.createInterface({
            input: readStream
        });
        const db = new sqlite3.Database(options.dbFile);

        let lines = 0;
        // ts,user,x_coordinate,y_coordinate,color
        const columns = [];
        const columns_to_extract = {
            ts: {
                name: 'timestamp',
                interpret: x => parseInt(x)
            },
            user: {
                name: 'userhash'
            },
            userhash: {
                name: 'userhash'
            },
            username: {
                name: 'username'
            },
            x_coordinate: {
                name: 'x',
                interpret: x => parseInt(x)
            },
            y_coordinate: {
                name: 'y',
                interpret: x => parseInt(x)
            },
            color: {
                name: 'color',
                interpret: x => parseInt(x)
            }
        };
        // first line
        rl.once('line', line => {
            console.log('[DEBUG] first line ->', line);
            line.split(',').forEach((c, i) => {
                c = c.replace(/\s*/, "");
                const col = columns_to_extract[c];
                if (col)
                    columns[i] = col;
            });
            db.serialize(function() {
                db.run("DROP TABLE IF EXISTS tiles;");
                db.run("CREATE TABLE tiles (timestamp INTEGER, userhash TEXT, username, x INTEGER, y INTEGER, color INTEGER, prev_color INTEGER);");
            });
            lines++;
            rl.on('line', line => {
                if (line.length < 5) {
                    console.warn('[DEBUG] Skipping blank line', line);
                    return;
                }
                const record = {
                    timestamp: null,
                    userhash: null,
                    username: null,
                    x: null,
                    y: null,
                    color: null,
                    prev_color: null
                };
                line.split(',').forEach((x,i) => {
                    record[columns[i].name] = (typeof columns[i].interpret === 'function') ? columns[i].interpret(x) : x;
                });
                console.log('[DEBUG] import line:', line, record);
                db.serialize(function() {
                    const sql = `INSERT OR REPLACE INTO tiles (timestamp, userhash, username, x, y, color, prev_color) VALUES (${record.timestamp}, "${record.userhash}", "${record.username}", ${record.x}, ${record.y}, ${record.color}, ${record.prev_color});`;
                    console.log('[DEBUG] sql =', sql);
                    db.run(sql);
                });
                lines++;
            });
        })

        rl.on('close', () => {
            console.log(`[DEBUG] [${new Date()}] finished reading CSV data (${lines} lines read, including header row)`);
            db.serialize(function() {
                db.each('SELECT count(*) as count FROM tiles;', (err, row) => {
                    if (err) {
                        console.warn(err);
                        reject(err);
                        return;
                    }
                    const message = `[${new Date()}] counted ${row.count} rows`;
                    console.log(message);
                }, () => {
                    resolve();
                    db.close();
                });
            });
        });
    });
}

export function addPreviousColorData(options) {
    options = Object.assign({
        dbFile: path.resolve(userDataPath, 'reddit-place.sqlite3'),
    }, options);

    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(options.dbFile);
        db.serialize(function() {
            // TODO: don't hard-code array dimensions
            const virtual_canvas = [];
            for (let i=0; i < 1001; i++) {
                virtual_canvas[i] = [];
                for (let j=0; j < 1001; j++) {
                    virtual_canvas[i][j] = 0;   // initially everything is white
                }
            }
            db.each('SELECT rowid,x,y,color FROM tiles ORDER BY timestamp ASC;', (err, row) => {
                if (err) {
                    console.warn(err);
                    reject(err);
                    return;
                }
                db.run(`UPDATE tiles SET prev_color = ${virtual_canvas[row.x][row.y]} WHERE rowid = ${row.rowid};`)
                virtual_canvas[row.x][row.y] = row.color;
            }, () => {
                console.log(virtual_canvas);
                db.close();
                resolve();
            });
        });

    });
}

export function createSnapShots(options) {
    options = Object.assign({
        interval: 10000,
        dbFile: path.resolve(userDataPath, 'reddit-place.sqlite3'),
    }, options);

}

export function doesTableExist(table, dbFile) {
    dbFile = dbFile || path.resolve(userDataPath, 'reddit-place.sqlite3');
    if (!fs.existsSync(dbFile)) {
        const message = `The DB file specified does not exist: ${dbFile}`;
        console.warn(message);
        return Promise.resolve(false);
    }

    const promise = new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbFile);
        db.serialize(function() {
            // FIXME: SQL injection
            db.each(`SELECT x,y FROM ${table} LIMIT 1;`, (err, row) => {
                if (err) {
                    console.warn(err);
                    resolve(false);
                    return;
                }
            }, () => {
                resolve(true);
            });
            db.close();
        });
    });
    return promise;
}
