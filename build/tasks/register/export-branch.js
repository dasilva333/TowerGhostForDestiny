module.exports = function (grunt) {

	grunt.registerMultiTask('export-branch', '', function () {

		var options = this.options({});
		
		var done = this.async();

		var branch = this.target;
		
		grunt.util.spawn({
		  cmd: 'export_to_branch.bat',
		  args: [ branch ],
		}, function done(error, result, code) {
		  if ( result ) {
			grunt.log.ok(result);
		  }	
		});
		
		done();
	});
}