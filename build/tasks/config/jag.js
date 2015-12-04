module.exports = function(grunt) {
	grunt.config.set('jag',{
      definitions: {
        files: {
			'../www/resources/definitions.json': '../www/resources/definitions.json.gz'
        }
      }
    });
};
	