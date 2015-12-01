module.exports = function(grunt) {
	grunt.config.set('combine-templates',{
		knockout: {
			src: "../www/templates/knockout/*.tmpl.html",
			dest: "../www/js/templates/templates.js",
			object: "ko.templates"
		},
		underscore: {
			src: "../www/templates/underscore/*.html",
			dest: "../www/js/templates/dynamic-templates.js",
			object: "_.templates"
		}
    });

};
	