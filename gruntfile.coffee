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
					'lib/client/client_connection.litcoffee'
				]
				dest: 'out/smackbone_live.litcoffee'

		coffee:
			compile:
				files:
					'out/smackbone_live.js': 'out/smackbone_live.litcoffee'

	grunt.registerTask 'test', [
		'concat'
		'coffee'
		'mochaTest'
	]
