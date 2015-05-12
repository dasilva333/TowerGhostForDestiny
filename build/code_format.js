var beautify = require('js-beautify'),
    fs = require('fs'),
    path = require('path');

function prettify(filepath) {
    data = fs.readFileSync(filepath, 'utf8');
    file_type = getOutputType(filepath);
    if (file_type === undefined) {
        console.error("Can't process " + filepath);
        return;
    }
    pretty = beautify[file_type](data, {});
    if (pretty !== data) {
        try {
            fs.writeFileSync(filepath, pretty, 'utf8');
            console.log('beautified ' + filepath)
        } catch (ex) {
            onOutputError(ex);
        }
    } else {
        console.log('beautified ' + filepath + ' - unchanged');
    }
}

function onOutputError(err) {
    if (err.code === 'EACCES') {
        console.error(err.path + " is not writable. Skipping!");
    } else {
        console.error(err);
        process.exit(0);
    }
};

function getOutputType(outfile) {
    if (outfile && /\.(js|css|html)$/.test(outfile)) {
        return outfile.split('.').pop();
    }
};

function process_directory(directory) {
    var files = fs.readdirSync(directory).filter(function(value) {
        return getOutputType(value) !== undefined
    })
    var filepaths = files.map(function(value) {
        return path.join(directory, value)
    });
    filepaths.forEach(function(value) {
        prettify(value)
    });
};

var directories = [
    '../www',
    '../www/js',
    '../www/css'
];

directories.forEach(function(value) {
    process_directory(value);
});
