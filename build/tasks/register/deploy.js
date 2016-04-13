module.exports = function (grunt) {
	grunt.registerTask('deploy', [
        'ftpush'
	]);
	grunt.registerTask('deployjs', [
        'ftpush:resources', 'ftpush:manifest'
	]);
	grunt.registerTask('deploydev', [
        'ftpush:devResources', 'ftpush:devManifest'
	]);
	grunt.registerTask('deployfirefox', [
        'ftpush:firefoxAssets'
	]);
	grunt.registerTask('deployimages', [
        'ftpush:images', 'ftpush:shareImages', 'ftpush:firefoxImages'
	]);
	grunt.registerTask('deployshare', [
        'ftpush:shareAssets'
	]);
};