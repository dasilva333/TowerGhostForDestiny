module.exports = function (grunt) {
	grunt.registerTask('share', ['generate-version:show','codeformat','combine-templates','concat_sourcemap','jag:definitions','jsonmanifest:share','export-branch:share','deployshare', 'prod']);
};
