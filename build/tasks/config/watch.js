/**
 * Watches the project directory to ensure sass files are maintained
 *
 */
module.exports = function(grunt) {
	grunt.config.set('watch', {
		build: {
			files: '../www/js/**',
			tasks: ['codeformat','combineKOTemplates','jsonmanifest']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
};
