module.exports = function(grunt) {
	
	grunt.config.set('concat_sourcemap', {
		js: {
		  options: {
		  },
		  files: {
			'../www/resources/1.libraries.js': [
				'../www/js/libraries/primary/*.js',
				'../www/js/libraries/secondary/*.js',
				'../www/js/plugins/*.js'
			],
			'../www/resources/2.templates.js': [
				'../www/js/templates/**/*.js'
			],
			'../www/resources/3.tower_ghost.js': [
				'../www/js/tgd/*.js',
				'!../www/js/tgd/base-definitions.js',
				'../www/js/app/*.js',
			],
			'../www/resources/4.extras.js': [
				'../www/js/extras/*.js'
			],
			'../www/resources/bootstrap.js': [
				'../www/js/tgd/base-definitions.js',
				'../www/js/core/firefox-xhr.js',
				'../www/js/core/idb.filesystem.js',
				'../www/js/core/cordova-app-loader-bootstrap.js'
			]
		  }
		},
		definitions: {
		  options: {
		  },
		  files: {
			'../www/resources/definitions.json': 
			[
				'../www/data/definitions/*.json'
			]
		  }
		},
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
