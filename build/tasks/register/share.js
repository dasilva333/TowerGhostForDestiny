module.exports = function (grunt) {
	grunt.registerTask('share', ['generate-version:show','codeformat','combine-templates','uglify:js','jag:definitions','jsonmanifest:share','export-branch:share','deployshare', 'prod']);
};
