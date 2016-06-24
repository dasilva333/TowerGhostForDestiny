module.exports = function (grunt) {
	/* Standard Production Build for AU (Auto Updates) */
	grunt.registerTask('prod', 		['generate-version:show','codeformat','combine-templates','removelogging:js','uglify:js','concat_sourcemap:css','cssmin','jsonmanifest:prod']);
	/* Production build for DEV-AU with logging code enabled */
	grunt.registerTask('prod-dev',	['generate-version:show','codeformat','combine-templates','uglify:js','uglify:jsDev','concat_sourcemap:css','cssmin','jsonmanifest:prod']);
	/* Production build for Windows-Phone devices */
	grunt.registerTask('prod-wp', 	['generate-version:show','codeformat','combine-templates','removelogging:wp','uglify:wp','concat_sourcemap:css','cssmin','jsonmanifest:prod']);
	/* Production build for static-share Share URL site */
	grunt.registerTask('prod-share',['generate-version:show','codeformat','combine-templates','removelogging:js','uglify:js','concat_sourcemap:css','cssmin','jsonmanifest:share']);
	/* Production build for Firefox bootloader site */
	grunt.registerTask('prod-ff', 	['generate-version:show','codeformat','combine-templates','removelogging:js','uglify:js','concat_sourcemap:css','cssmin','jsonmanifest:firefox']);	
	/* Standard Production build + rebuild definitions from source */
	grunt.registerTask('prod-def',	['generate-version:show','codeformat','combine-templates','removelogging:js','uglify:js', 'uglify:definitions','cssmin','jag:definitions','jsonmanifest:prod']);
};
