module.exports = function (grunt) {
	grunt.registerTask('deploy', [
        'ftpush'
	]);
	grunt.registerTask('deployjs', [
        'ftpush:resources', 'ftpush:manifest'
	]);
	grunt.registerTask('deployimages', [
        'ftpush:images', 'ftpush:shareImages'
	]);
	grunt.registerTask('deploylocale', [
        'ftpush:locale'
	]);
	grunt.registerTask('deployshare', [
        'ftpush:shareAssets'
	]);
};