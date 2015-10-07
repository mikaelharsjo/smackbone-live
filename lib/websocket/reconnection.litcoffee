
	class SmackboneLive.WebsocketReConnection extends Smackbone.Event
		constructor: (@host, @socketFactory, @log) ->

		connect: ->
			@log?.log 'Smackbone Live:Reconnection: Connecting...'
			@readyState = 0
			connection = @socketFactory @host
			connection.on 'message', @_onMessage
			connection.on 'object', @_onObject
			connection.on 'open', @_onConnect
			connection.on 'close', @_onDisconnect
			connection.on 'error', @_onError
			connection.connect()
			@connection = connection

		send: (data) ->
			@log?.log 'Smackbone Live:Reconnection: Sending:', data
			@connection.send data

		close: ->
			@log?.log 'Smackbone Live:Reconnection: Closing...'
			@connection.close()
			clearTimeout @timer if @timer?

		_onMessage: (event) =>
			@trigger 'message', event

		_onObject: (object) =>
			@trigger 'object', event

		_onConnect: (event) =>
			@log?.log 'Smackbone Live:Reconnection: Connected'
			@trigger 'open', this

		_onRetryConnection: =>
			@timer = undefined
			@log?.log 'Smackbone Live:Reconnection: Reconnecting...'
			@connection = undefined
			@connect()

		_onError: (err) =>
			@log?.log 'Smackbone Live:Reconnection: OnError:', err
			@_tryReconnect()

		_onDisconnect: (event) =>
			@log?.log 'Smackbone Live:Reconnection: Disconnected'
			@trigger 'close', this
			@_tryReconnect()

		_tryReconnect: ->
			if @timer?
				@log?.log 'Smackbone Live:Reconnection: Already reconnecting...'
				return
			@timer = setTimeout @_onRetryConnection, 1000
