module.exports = function (grunt) {
	//GRUNT TASK TO BUILD A JSON MANIFEST FILE FOR HOT CODE UPDATES
	grunt.registerMultiTask('jsonmanifest', 'Generate JSON Manifest for Hot Updates', function () {

		var options = this.options({loadall:true, root: "./", files: {}, load: []});
		var done = this.async();

		var path = require('path');

		this.files.forEach(function (file) {
		  var files;

		  //manifest format
		  var json = {
			"files": options.files,
			"load": options.load,
			"root": options.root
		  };

		  //clear load array if loading all found assets
		  if(options.loadall) {
			json.load = [];
		  }

		  // check to see if src has been set
		  if (typeof file.src === "undefined") {
			grunt.fatal('Need to specify which files to include in the json manifest.', 2);
		  }

		  // if a basePath is set, expand using the original file pattern
		  if (options.basePath) {
			files = grunt.file.expand({cwd: options.basePath}, file.orig.src);
		  } else {
			files = file.src;
		  }

		  // Exclude files
		  if (options.exclude) {
			files = files.filter(function (item) {
			  return options.exclude.indexOf(item) === -1;
			});
		  }

		  // Set default destination file
		  if (!file.dest) {
			file.dest = ['manifest.json'];
		  }      

		  // add files
		  if (files) {
			files.forEach(function (item) {
			  
				var isDir = grunt.file.isDir(path.join(options.basePath, item));
			  
				if (!isDir)
						  {
				  var hasher = require('crypto').createHash('sha256');
				  var filename = encodeURI(item);
				  var key = filename.split("-").slice(1).join('-');
				  json.files[key] = {};
				  json.files[key]['filename'] = filename;
				  json.files[key]['version'] = hasher.update(grunt.file.read(path.join(options.basePath, item))).digest("hex");

				  if(options.loadall) 
				  {
					json.load.push(filename);  
				  }
						  }
			});
		  }
		  //write out the JSON to the manifest files
		  file.dest.forEach(function(f) {
			grunt.file.write(f, JSON.stringify(json, null, 2));
		  });

		  done();
		});

	});
}