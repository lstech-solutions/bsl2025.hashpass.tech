module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{css,js,svg,ico,json}'
	],
	globIgnores: [
		'**/*.html'
	],
	swDest: 'dist/sw.js',
	maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	runtimeCaching: [
		{
			urlPattern: /\.html$/,
			handler: 'NetworkFirst',
			options: {
				cacheName: 'html-cache',
				networkTimeoutSeconds: 3,
				cacheableResponse: {
					statuses: [0, 200]
				}
			}
		}
	]
};