module.exports = function (grunt) {

	var jag = require("jag");
	
	grunt.registerMultiTask('jag', 'Generate gzipped files from source', function () {

		var options = this.options({ });
		
		var done = this.async();

		var path = require('path');

		var files = this.data.files;
		
		var keys = Object.keys(files), count = 0;
		
		var finish = function(){
			count++;
			if (count == keys.length){
				done();
			}
		}
		keys.forEach(function(src){
			var dst = files[src];
			jag.pack(src, dst, finish);
		});
		

	});
}