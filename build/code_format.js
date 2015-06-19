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
	//TODO: Find the option that causes loadouts.js comments to tab infintely
    pretty = beautify[file_type](data, {
		"indent_size": 4,
		"indent_char": " ",
		"eol": "\n",
		"indent_level": 0,
		"indent_with_tabs": false,
		"preserve_newlines": true,
		"max_preserve_newlines": 10,
		"jslint_happy": false,
		"space_after_anon_function": false,
		"brace_style": "collapse",
		"keep_array_indentation": false,
		"keep_function_indentation": false,
		"space_before_conditional": true,
		"break_chained_methods": false,
		"eval_code": false,
		"unescape_strings": false,
		"wrap_line_length": 0,
		"wrap_attributes": "auto",
		"wrap_attributes_indent_size": 4,
		"end_with_newline": false
	});
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
    if (outfile && /\.(js|html)$/.test(outfile)) {
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
    '../www/js'
];

directories.forEach(function(value) {
    process_directory(value);
});