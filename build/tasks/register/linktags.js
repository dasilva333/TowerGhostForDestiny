module.exports = function (grunt) {
	grunt.registerTask('linktags', [ "tags:buildScripts","tags:buildLinks" ]);
};