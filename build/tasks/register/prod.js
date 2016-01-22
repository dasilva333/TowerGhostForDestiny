module.exports = function (grunt) {
	grunt.registerTask('prod', ['generate-version:show','codeformat','combine-templates','uglify:js', 'concat_sourcemap:css','cssmin','jsonmanifest:prod']);
};
