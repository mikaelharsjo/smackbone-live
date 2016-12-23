
	class SmackboneLive.WebsocketConnection extends Smackbone.Event
		constructor: (@host, @log) ->

		connect: ->
			@readyState = 0
			connection = new WebSocket @host
			connection.onopen = @_onOpen
			connection.onclose = @_onClose
			connection.onerror = @_onError
			connection.onmessage = @_onMessage
			@connection = connection

		close: ->
			@connection.close()

		send: (string) ->
			@connection.send string

		_onMessage: (event) =>
			@trigger 'message', event.data

		_onOpen: (event) =>
			@readyState = 1
			@trigger 'open', this

		_onClose: (event) =>
			@readyState = 2
			@trigger 'close', this

		_onError: (error) =>
			@log?.log 'we have a error:', error
			@trigger 'error', this
