module.exports = function(grunt) {
	
	grunt.config.set('cssmin', {
		css: {
		  options: {
		  },
		  files: {
			'../www/resources/tower_ghost.css': ['../www/resources/tower_ghost.css'],
			'../www/resources/base.css': 		['../www/resources/base.css']
		  }
		}
	});

	grunt.loadNpmTasks('grunt-contrib-cssmin');
};
