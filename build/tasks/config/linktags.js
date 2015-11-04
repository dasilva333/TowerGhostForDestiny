module.exports = function(grunt) {
	grunt.config.set("tags",{
		buildScripts: {
			options: {
				scriptTemplate: '<script type="text/javascript" src="{{ path }}"></script>',
				openTag: '<!-- start script template tags -->',
				closeTag: '<!-- end script template tags -->'
			},
			src: [
				'../www/data/definitions/*.json',
				'../www/js/libraries/primary/*.js',
				'../www/js/libraries/secondary/*.js',
				'../www/js/plugins/*.js',
				'../www/js/tgd/*.js',
				'../www/js/app/*.js',
				'../www/js/extras/*.js'
			],
			dest: '../www/index.html'
		},
		buildLinks: {
			options: {
				linkTemplate: '<link rel="stylesheet" type="text/css" href="{{ path }}" media="screen"/>',
				openTag: '<!-- start css template tags -->',
				closeTag: '<!-- end css template tags -->'
			},
			src: [
				'../www/css/bootstrap.min.css',
				'../www/css/style.css',
				'../www/css/tooltip.css',
				'../www/css/style_new.css'
			],
			dest: '../www/index.html'
		}
	});
	grunt.loadNpmTasks('grunt-script-link-tags');
};
