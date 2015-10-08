/**
 * Watches the project directory to ensure sass files are maintained
 *
 */
module.exports = function(grunt) {
	grunt.config.set('watch', {
		sass: {
			files: '../www/scss/{,*/}*.{scss,sass}',
			tasks: ['sass:dev', 'autoprefixer:dev']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-sass');
};
