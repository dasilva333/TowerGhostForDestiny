module.exports = function (grunt) {
	grunt.registerTask('deploy', [
        'ftpush'
	]);
	grunt.registerTask('deployjs', [
        'ftpush:js', 'ftpush:css', 'ftpush:manifest'
	]);
	grunt.registerTask('deploydef', [
        'ftpush:definitions', 'ftpush:shareData'
	]);
	grunt.registerTask('deployimages', [
        'ftpush:images', 'ftpush:shareImages'
	]);
	grunt.registerTask('deploylocale', [
        'ftpush:locale'
	]);
	grunt.registerTask('deployshare', [
        'ftpush:shareAssets', 'ftpush:shareData', 'ftpush:shareImages'
	]);
};