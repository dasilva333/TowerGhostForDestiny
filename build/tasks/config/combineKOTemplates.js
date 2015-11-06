module.exports = function(grunt) {
	grunt.config.set('combineKOTemplates',{
		main: {
			src: "../www/templates/*.tmpl.html",
			dest: "../www/js/templates/templates.js"
		}
    });

};
	