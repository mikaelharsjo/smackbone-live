module.exports = (grunt) ->
	grunt.loadNpmTasks 'grunt-mocha-test'
	grunt.loadNpmTasks 'grunt-contrib-coffee'
	grunt.loadNpmTasks 'grunt-contrib-concat'

	grunt.initConfig
		mochaTest:
			test:
				options:
					reporter: 'spec'
					require: 'coffee-script/register'

				src: ['test/*.litcoffee']

		concat:
			options:
				separator: ''
			dist:
				src: [
					'lib/header.litcoffee'
					'lib/common/connection.litcoffee'
					'lib/common/jsonrpc.litcoffee'
					'lib/websocket/connection.litcoffee'
					'lib/websocket/reconnection.litcoffee'
				]
				dest: 'out/smackbone-live.litcoffee'

		coffee:
			compile:
				files:
					'out/smackbone-live.js': 'out/smackbone-live.litcoffee'

	grunt.registerTask 'test', [
		'concat'
		'coffee'
		'mochaTest'
	]
