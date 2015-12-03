module.exports = function (grunt) {
	grunt.registerTask('prod', ['generate-version:show','codeformat','combine-templates','concat_sourcemap','jsonmanifest:prod']);
};
