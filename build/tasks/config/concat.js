module.exports = function(grunt) {
	
	grunt.config.set('concat_sourcemap', {
		css: {
		  options: {
		  },
		  files: {
			'../www/resources/tower_ghost.css': 
			[
				'../www/css/bootstrap.min.css',
				'../www/css/style.css',
				'../www/css/tooltip.css',
				'../www/css/style_new.css'
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
