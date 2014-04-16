
	class SmackboneLive.WebsocketConnection extends Smackbone.Event
		constructor: (@host) ->

		connect: ->
			connection = new WebSocket @host
			connection.onopen = @_onOpen
			connection.onclose = @_onClose
			connection.onerror = @_onError
			connection.onmessage = @_onMessage
			@connection = connection

		send: (string) ->
			@connection.send string

		_onMessage: (event) =>
			@trigger 'message', event.data

		_onOpen: (event) =>
			console.log 'connected to:', event
			@trigger 'connect', this

		_onClose: (event) =>
			console.log 'disconnected:', event
			@trigger 'disconnect', this

		_onError: (error) =>
			console.log 'we have a error:', error
			@trigger 'error', this
