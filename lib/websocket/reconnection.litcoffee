
	class SmackboneLive.WebsocketReConnection extends Smackbone.Event
		constructor: (@host, @socketFactory, @log) ->
			@closeRequested = false

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
			@closeRequested = true
			clearTimeout @timer if @timer?
			@connection.close()

		_onMessage: (event) =>
			@trigger 'message', event

		_onObject: (object) =>
			@trigger 'object', event

		_onConnect: (event) =>
			@readyState = 1
			@log?.log 'Smackbone Live:Reconnection: Connected'
			@trigger 'open', this

		_onRetryConnection: =>
			@timer = undefined
			@readyState = 0
			@log?.log 'Smackbone Live:Reconnection: Reconnecting...'
			@connection = undefined
			@connect()

		_onError: (err) =>
			@log?.log 'Smackbone Live:Reconnection: OnError:', err
			@_tryReconnect() if not @closeRequested

		_onDisconnect: (event) =>
			@log?.log 'Smackbone Live:Reconnection: Disconnected'
			@trigger 'close', this
			@_tryReconnect() if not @closeRequested

		_tryReconnect: ->
			@readyState = 2
			if @timer?
				@log?.log 'Smackbone Live:Reconnection: Already reconnecting...'
				return
			@timer = setTimeout @_onRetryConnection, 1000
