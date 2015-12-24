module.exports = function (grunt) {
	grunt.registerTask('prod', ['generate-version:show','codeformat','combine-templates','concat_sourcemap:js', 'concat_sourcemap:css', 'concat_sourcemap:definitions','cssmin','jag:definitions','jsonmanifest:prod']);
};
