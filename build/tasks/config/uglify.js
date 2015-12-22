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
			'../www/resources/en/definitions.json': ['../www/data/definitions/*.json','../www/data/definitions/en/*.json'],
			'../www/resources/de/definitions.json': ['../www/data/definitions/*.json','../www/data/definitions/de/*.json'],
			'../www/resources/es/definitions.json': ['../www/data/definitions/*.json','../www/data/definitions/es/*.json'],
			'../www/resources/fr/definitions.json': ['../www/data/definitions/*.json','../www/data/definitions/fr/*.json'],
			'../www/resources/it/definitions.json': ['../www/data/definitions/*.json','../www/data/definitions/it/*.json'],
			'../www/resources/ja/definitions.json': ['../www/data/definitions/*.json','../www/data/definitions/ja/*.json'],
			'../www/resources/pt-br/definitions.json': ['../www/data/definitions/*.json','../www/data/definitions/pt-br/*.json']
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
