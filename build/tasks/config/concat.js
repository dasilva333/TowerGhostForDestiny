module.exports = function(grunt) {
	
	grunt.config.set('concat_sourcemap', {
		css: {
		  options: {
		  },
		  files: {
			'../www/resources/tower_ghost.css': 
			[
				'../www/css/bootstrap.min.css',
				'../www/css/app/*.css',
				'../www/css/tooltip.css'
			],
			'../www/resources/base.css': 
			[
				'../www/css/base.css'
			]
		  }
		}
	});

	grunt.loadNpmTasks('grunt-concat-sourcemap');
};
