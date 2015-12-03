module.exports = function(grunt) {
	
	grunt.config.set('concat_sourcemap', {
		js: {
		  options: {
		  },
		  files: {
			'../www/compiled/tower_ghost.js': 
			[
				'../www/js/libraries/primary/*.js',
				'../www/js/libraries/secondary/*.js',
				'../www/js/plugins/*.js',
				'../www/js/templates/*.js',
				'../www/js/tgd/*.js',
				'../www/js/app/*.js',
				'../www/js/extras/*.js'
			]
		  }
		},
		definitions: {
		  options: {
		  },
		  files: {
			'../www/compiled/definitions.json': 
			[
				'../www/data/definitions/*.json'
			]
		  }
		},
		css: {
		  options: {
		  },
		  files: {
			'../www/compiled/tower_ghost.css': 
			[
				'../www/css/bootstrap.min.css',
				'../www/css/style.css',
				'../www/css/tooltip.css',
				'../www/css/style_new.css'
			]
		  }
		}
	});

	grunt.loadNpmTasks('grunt-concat-sourcemap');
};
