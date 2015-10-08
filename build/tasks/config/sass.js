/**
 * Compiles the sass file to css
 *
 */
module.exports = function(grunt) {
	grunt.config.set('sass', {
		dev: {
			options: {
				style: 'compressed',
				compass: false
			},
			files: {
				'../www/css/style_new.css':'../www/scss/style_new.scss'
			}
		},
		prod: {
			options: {
				style: 'compressed',
				compass: false,
				sourcemap: 'none'
			},
			files: {
				'../www/css/style_new.css':'../www/scss/style_new.scss'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-sass');
};
