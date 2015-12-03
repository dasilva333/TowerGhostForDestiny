module.exports = function(grunt) {
	grunt.config.set('jag',{
      definitions: {
        files: {
			'../www/compiled/definitions.json': '../www/compiled/definitions.json.gz'
        }
      }
    });
};
	