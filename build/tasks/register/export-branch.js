module.exports = function (grunt) {

	grunt.registerMultiTask('export-branch', '', function () {

		var options = this.options({});
		
		var done = this.async();

		var branch = this.data.branch;
        
        console.log("exporting to branch " + branch);
        
		grunt.util.spawn({
		  cmd: 'export_to_branch.bat',
		  args: [ branch ],
		}, function (error, result, code) {
            
            if ( result ) {
                grunt.log.ok("export complete: " + result);
                done();                
            }	
            
		});
		
	});
}