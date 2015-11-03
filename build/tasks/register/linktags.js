module.exports = function (grunt) {
	grunt.registerTask('linktags', [
        'tags:buildLinks', 'tags:buildScripts'
	]);
};