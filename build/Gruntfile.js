'use strict';

module.exports = function(grunt) {

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		project: {
			app: ['../www'],
			gen_css: ['<%= project.app %>/css/style_new.css'],
			css: ['<%= project.app %>/scss/style_new.scss']
		},

		sass: {
			dev: {
				options: {
					style: 'compressed',
					compass: false
				},
				files: {
					'<%= project.app %>/css/style_new.css':'<%= project.css %>'
				}
			},
			prod: {
				options: {
					style: 'compressed',
					compass: false,
					sourcemap: 'none'
				},
				files: {
					'<%= project.app %>/css/style_new.css':'<%= project.css %>'
				}
			}
		},

		watch: {
			sass: {
				files: '<%= project.app %>/scss/{,*/}*.{scss,sass}',
				tasks: ['sass:dev', 'autoprefixer:dev']
			}
		},

		autoprefixer: {
			dev: {
				options: {
					map: true,
					browsers: ['> 5%', 'last 20 versions', 'Firefox ESR', 'Opera 12.1', 'ie 9', 'ie 10', 'ie 7']
				},
				src: '../www/css/style_new.css',
				dest: '../www/css/style_new.css'
			},
			prod: {
				options: {
					map: false,
					browsers: ['> 5%', 'last 20 versions', 'Firefox ESR', 'Opera 12.1', 'ie 9', 'ie 10', 'ie 7']
				},
				src: '../www/css/style_new.css',
				dest: '../www/css/style_new.css'
			}
		}

	});

	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-autoprefixer');

	// Just output some sort of documentation menu
	grunt.registerTask('default','Output a basic help menu', function() {
		grunt.log.writeln('Grunt Build Process');
		grunt.log.writeln('* grunt prod: Builds everything needed for production');
		grunt.log.writeln('* grunt dev: Creates a watch on a majority of the scss files (use for developing)');
	});

	grunt.registerTask('prod', ['sass:prod', 'autoprefixer:prod']);
	grunt.registerTask('dev', ['watch']);

};