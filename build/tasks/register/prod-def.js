module.exports = function (grunt) {
	grunt.registerTask('prod-def', ['generate-version:show','codeformat','combine-templates','uglify:js', 'uglify:definitions','cssmin','jag:definitions','jsonmanifest:prod']);
};
