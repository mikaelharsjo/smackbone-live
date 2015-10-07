	smackbone_live = require '../out/smackbone-live'
	smackbone = require 'smackbone'
	ws = require 'ws'
	require 'should'

	describe 'reconnect', ->
		it 'should connect', (done) ->
			this.timeout 4000
			connection = new smackbone_live.WebsocketReConnection 'ws://echo.websocket.org', (host) ->
				x = new ws host
				x.connect = ->
				x
			, console

			connection.on 'open', ->
				connection.send 'Hello'

			connection.on 'message', (message) ->
				message.should.equal 'Hello'
				done()

			connection.connect()
