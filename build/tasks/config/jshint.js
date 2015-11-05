/**
 * Clean files and folders.
 *
 * ---------------------------------------------------------------
 *
 * JSHint is a program that flags suspicious usage in programs written in JavaScript. The core project consists of a library itself as well as a CLI program distributed as a Node module.
 *
 * For usage docs see:
 * 		https://github.com/gruntjs/grunt-contrib-jshint
 */
module.exports = function(grunt) {
	grunt.config.set('jshint', {
		js: {
	      options: {
	        jshintrc: '.jshintrc',
	        "no-use-before-define": true
	      },
	      files: {
	        src: [
				'../www/js/app/*.js',
				'../www/js/extras/*.js',
				'../www/js/tgd/*.js',
				'../www/js/*.js'
		    ]
	      },
	      gruntfile: {
	        src: 'Gruntfile.js'
	      }
		} 
    });

	grunt.loadNpmTasks('grunt-contrib-jshint');
};
