'use strict';

module.exports = function(grunt) {

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		project: {
			app: ['../www'],
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
			}
		},
		watch: {
			sass: {
				files: '<%= project.app %>/scss/{,*/}*.{scss,sass}',
				tasks: ['sass:dev']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', [
		'watch'
	]);

};