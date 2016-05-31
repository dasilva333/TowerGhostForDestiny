module.exports = function (grunt) {
	grunt.registerTask('prod', 		['generate-version:show','codeformat','combine-templates','removelogging:js','uglify:js','concat_sourcemap:css','cssmin','jsonmanifest:prod']);
	grunt.registerTask('prod-wp', 	['generate-version:show','codeformat','combine-templates','removelogging:wp','uglify:wp','concat_sourcemap:css','cssmin','jsonmanifest:prod']);
	grunt.registerTask('prod-share',['generate-version:show','codeformat','combine-templates','removelogging:wp','uglify:wp','concat_sourcemap:css','cssmin','jsonmanifest:share']);
	grunt.registerTask('prod-ff', 	['generate-version:show','codeformat','combine-templates','removelogging:js','uglify:js','concat_sourcemap:css','cssmin','jsonmanifest:firefox']);	
	grunt.registerTask('prod-def',	['generate-version:show','codeformat','combine-templates','removelogging:js','uglify:js', 'uglify:definitions','cssmin','jag:definitions','jsonmanifest:prod']);
};
