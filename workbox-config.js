module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{css,js,svg,ico,json,html}'
	],
	swDest: 'dist/sw.js',
	maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};