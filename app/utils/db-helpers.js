import { colorBytes } from 'r-place-canvas-tool/utils/color';

const fs = requireNode('fs');
const path = requireNode('path');
const readline = requireNode('readline');

const { remote } = requireNode('electron');
const sqlite3 = requireNode('sqlite3').verbose();

const resourcesPath = path.resolve(__dirname, '..', 'ember-electron', 'resources');
const userDataPath = remote.app.getPath('userData');

export const defaultDbFile = path.resolve(userDataPath, 'reddit-place.sqlite3');

// This function takes tile data (CSV) and creates an SQLite DB table with a row for each placement
// FIXME: BROKEN at the moment
// This seems to run way too slow. Perhaps we could group some INSERTs or deserialize them?
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
            // Time stamp (UTC ms)
            timestamp: {
                name: 'timestamp',
                interpret: x => parseInt(x)
            },
            ts: {
                name: 'timestamp',
                interpret: x => parseInt(x)
            },

            // User (name & hash)
            user: {
                name: 'userhash'
            },
            userhash: {
                name: 'userhash'
            },
            user_hash: {
                name: 'userhash'
            },
            username: {
                name: 'username'
            },
            user_name: {
                name: 'username'
            },

            // X
            x: {
                name: 'x',
                interpret: x => parseInt(x)
            },
            x_coordinate: {
                name: 'x',
                interpret: x => parseInt(x)
            },

            // Y
            y: {
                name: 'y',
                interpret: x => parseInt(x)
            },
            y_coordinate: {
                name: 'y',
                interpret: x => parseInt(x)
            },

            // Color (palette index)
            color: {
                name: 'color',
                interpret: x => parseInt(x)
            }
        };
        // first line
        rl.once('line', line => {
            console.log(`[${new Date()}] [DEBUG] first line -> ${line}`);
            line.split(',').forEach((c, i) => {
                c = c.replace(/\s*/, "");
                const col = columns_to_extract[c];
                if (col)
                    columns[i] = col;
            });
            db.serialize(function() {
                //db.run("DROP TABLE IF EXISTS tiles;");
                db.run("CREATE TABLE IF NOT EXISTS tiles (timestamp INTEGER PRIMARY KEY, userhash TEXT, username, x INTEGER, y INTEGER, color INTEGER, prev_color INTEGER);");
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
                //console.log('[DEBUG] import line:', line, record);
                const sql = `INSERT OR REPLACE INTO tiles (timestamp, userhash, username, x, y, color, prev_color) VALUES (${record.timestamp}, "${record.userhash}", "${record.username}", ${record.x}, ${record.y}, ${record.color}, ${record.prev_color});`;
                //console.log('[DEBUG] sql =', sql);
                // FIXME: If this isn't serialized the table may not be created yet
                // if it is serialized then we end up going slow here for many more rows than needed
                db.run(sql);
                lines++;
                if (lines % 1000 === 0)
                    console.log(`[${new Date()}] [DEBUG] processed ${lines} lines`);
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

function create2DArray(rows, columns, initValue) {
    for (let i=0; i < rows; i++) {
        a[i] = [];
        for (let j=0; j < columns; j++) {
            a[i][j] = initValue;
        }
    }
    return a;
}


export function addPreviousColorData(options) {
    options = Object.assign({
        dbFile: defaultDbFile,
    }, options);

    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(options.dbFile);
        db.serialize(function() {
            // TODO: don't hard-code array dimensions
            const virtual_canvas = create2DArray(1001,1001,0);
            let count = 0;
            db.each('SELECT rowid,x,y,color FROM tiles ORDER BY timestamp ASC;', (err, row) => {
                if (err) {
                    console.warn(err);
                    reject(err);
                    return;
                }
                db.run(`UPDATE tiles SET prev_color = ${virtual_canvas[row.x][row.y]} WHERE rowid = ${row.rowid};`)
                virtual_canvas[row.x][row.y] = row.color;
                count++;
                if (count % 1000 === 0) {
                    console.log(`[${new Date()}] addPreviousColorData: count = ${count}`);
                }
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
        dbFile: defaultDbFile,
    }, options);
    // FIXME: Don't hard-code dimensions
    const rows = 1001;
    const cols = 1001;
    const virtual_canvas = new Uint8ClampedArray(4*rows*cols);  // inits to 0

    const db = new sqlite3.Database(options.dbFile);
    const saveSnapshot = timestamp => {
        console.log('[DEBUG] creating snapshot at timestamp =', timestamp);
        const b64 = Buffer.from(virtual_canvas).toString('base64');
        db.run(`INSERT OR REPLACE INTO canvas_snapshots (timestamp, canvas) VALUES (${timestamp}, "${b64}")`);
    };

    // 2. Get all pixels
    const all_pixels_query = 'SELECT timestamp,x,y,color FROM tiles ORDER BY timestamp ASC;';
    console.log(`[DEBUG]: makeSnapShots: all_pixels_query = ${all_pixels_query}`);
    let count = 0;
    db.serialize(() => {
        db.serialize(() => {
            console.log('[DEBUG]: dropping & recreating canvas_snapshots table');
            db.run('DROP TABLE IF EXISTS canvas_snapshots;');
            db.run('CREATE TABLE canvas_snapshots (timestamp integer UNIQUE, canvas TEXT);');
        });

        db.each(all_pixels_query, (err, row) => {
            if (err) {
                console.warn(err);
                return;
            }

            const startIndex = 4*((rows * row.x) + row.y);
            colorBytes[row.color].forEach((x,i) => {
                virtual_canvas[startIndex + i] = x;
            });

            // 3. Every <interval> pixels, get base64 encoded bitmap of canvas
            //    and save in canvas-snapshots table with timestamp of last-drawn pixel
            if (++count >= options.interval) {
                saveSnapshot(row.timestamp);
                count = 0;
            }
        });
    }, () => {
        db.close();
    });

}

export function doesTableExist(table, dbFile) {
    dbFile = dbFile || defaultDbFile;
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
