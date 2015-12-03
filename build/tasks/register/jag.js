module.exports = function (grunt) {

	var jag = require("jag");
	
	grunt.registerMultiTask('jag', 'Generate gzipped files from source', function () {

		var options = this.options({ });
		
		var done = this.async();

		var path = require('path');

		var files = this.data.files;
		
		Object.keys(files).forEach(function(src){
			var dst = files[src];
			jag.pack(src, dst, done);
		});
		

	});
}