module.exports = function (grunt) {
	grunt.registerTask('deploy', [
        'ftpush'
	]);
	grunt.registerTask('deployjs', [
        'ftpush:js', 'ftpush:css', 'ftpush:manifest'
	]);
	grunt.registerTask('deployimages', [
        'ftpush:images', 'ftpush:shareData'
	]);
	grunt.registerTask('deploylocale', [
        'ftpush:locale'
	]);
	grunt.registerTask('deployshare', [
        'ftpush:shareAssets'
	]);
};