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

    if (!fs.existsSync(options.tilesCSV)) {
        const message = `The CSV file provided does not exist: ${options.tilesCSV}`;
        console.warn(message);
        return {
            type: 'error',
            message
        };
    }

    console.log(`[DEBUG]: [${new Date()}] Creating SQLite3 database using SQL dump`);
    const readStream = fs.createReadStream(options.tilesCSV);
    const rl = readline.createInterface({
        input: readStream,
        //output: process.stdout
    });
    const db = new sqlite3.Database(options.pathToDB);

    let lines = 0;
    const columns = [];
    const columns_to_extract = {
        ts: 'timestamp',
        x_coordinate: 'x',
        y_coordinate: 'y',
        color: 'color'
    };
    rl.on('line', (line) => {
        //console.log(`[DEBUG]: read line = ${line}`);
        if (lines === 0) {
            line.split(',').forEach((c, i) => {
                c = c.replace(/\s*/, "");
                const name = columns_to_extract[c];
                if (name)
                    columns[i] = name;
            });
            db.serialize(function() {
                db.run("DROP TABLE IF EXISTS tiles;");
                db.run("CREATE TABLE tiles (timestamp INTEGER, x INTEGER, y INTEGER, color INTEGER);");
            });
        }
        else {
            const record = {};
            line.split(',').forEach((x,i) => {
                record[columns[i]] = parseInt(x);
            });

            db.serialize(function() {
                db.run(`INSERT INTO tiles VALUES (${record.timestamp}, ${record.x}, ${record.y}, ${record.color});`);
            });
        }
        lines++;
    });

    rl.on('close', () => {
        console.log(`[DEBUG] [${new Date()}] finished reading CSV data (${lines} lines read, including header row)`);
        db.serialize(function() {
            db.each('SELECT count(*) as count FROM tiles;', (err, row) => {
                if (err) {
                    console.warn(err);
                    return;
                }
                console.log(`[DEBUG] [${new Date()}] counted ${row.count} rows`);
            });
            db.close();
        });
    });
};
