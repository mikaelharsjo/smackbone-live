
	if exports?
		SmackboneLive = exports
		Smackbone = require 'smackbone'
	else
		SmackboneLive = this.SmackboneLive = {}
		Smackbone = this.Smackbone

	class SmackboneLive.Connection extends Smackbone.Event
		ReadyState =
			Connecting: 0
			Open: 1
			Closing: 2
			Closed: 3

		constructor: (options, done) ->
			@connection = options.connection
			@repository = options.repository
			@log = options.log
			@commandReceiver = options.commandReceiver
			@local = options.local
			@listenToEvent = options.listenToEvent
			if @listenToEvent?
				@listenToEvent.on 'all', @_onAll
			@messageQueue = {}
			@messageId = 0

			@local.on 'save_request', @_onLocalSaveRequest

			@connection.on 'message', @_onMessage
			@connection.on 'object', @_onObject
			@connection.on 'open', @_onConnect
			@connection.on 'close', @_onDisconnect
			@connection.on 'error', @_onError
			done null, @

		_onAll: (url, data) ->
			@_send
				type: 'event'
				url: url
				data: data

		_sendModel: (domain, path, model) ->
			@_send
				type: 'save'
				url: path
				data: model
				domain: domain

		sendRepositoryChanges: ->
			@_sendRoot()
			@_listen()

		_sendRoot: ->
			@_sendModel '', '', @repository

		_listen: ->
			@repository.on 'save_request', @_onSaveRequest

		_stopListen: ->
			@repository.off 'save_request', @_onSaveRequest
			@listenToEvent?.off 'all', @_onAll

		close: ->
			@_stopListen()
			@local.off 'save_request', @_onLocalSaveRequest
			@connection.close()
			@isClosed = true

		isConnected: ->
			@connection.readyState is ReadyState.Open

		setCommandReceiver: (@commandReceiver) ->

		command: (url, data, done) ->
			@messageId += 1

			queueItem =
				callback: done

			@messageQueue[@messageId] = queueItem

			@_send
				type: 'command'
				messageId: @messageId
				url: url
				data: data

		model: (url) ->
			model = @repository.get url
			if not model?
				model = new Smackbone.Model
				@repository.set url, model
			model

		_sendReply: (messageId, err, data) ->
			reply =
				err: err
				reply_to: messageId
				data: data
			@_send reply

		_send: (object) ->
			if @isConnected()
				@log?.log 'Smackbone Live: Send:', object
				string = JSON.stringify object
				@connection.send string
			else
				console.warn "Couldn't send. Connection is not open:", object

		_onSaveRequest: (path, model) =>
			@_sendModel '', path, model

		_onLocalSaveRequest: (path, model) =>
			@_sendModel 'local', path, model

		_onReply: (messageId, err, data) ->
			message = @messageQueue[messageId]
			if not message?
				console.warn "Got confirmation on unknown message #{messageId}"
			else
				message.callback err, data
				delete @messageQueue[messageId]

		_onSave: (object) ->
			domain = if object.domain is 'local' then @local else @repository
			model = if object.url is '' then domain else domain.get object.url
			model?.set object.data,
				triggerRemove: true

		_onCommand: (object) ->
			functionName = "_#{object.url}"
			method = @commandReceiver[functionName]
			if method?
				method.call @commandReceiver, object.data, (err, reply) =>
					@_sendReply object.message_id, err, reply
					if err?.status < 0
						@close()
			else
				console.warn "Unknown function '#{functionName}'"

		_onObject: (object) =>
			@log?.log 'Smackbone Live: Incoming:', object
			if object.reply_to?
				@_onReply object.reply_to, object.err, object.data
			else
				switch object.type
					when 'save'
						@_onSave object
					when 'command'
						@_onCommand object
					when 'event'
						@trigger object.url, object.data, this

		_onMessage: (event) =>
			object = JSON.parse event
			@_onObject object

		_onConnect: (event) =>
			@log?.log 'Smackbone Live: Connected'
			@_listen()
			@trigger 'connect', this

		_onDisconnect: (event) =>
			@log?.log 'Smackbone Live: Disconnected'
			@_stopListen()
			@trigger 'disconnect', this

		_onError: (error) =>
			@log?.warn 'Smackbone Live: Error:', error
			@trigger 'error', this

	class SmackboneLive.WebsocketConnection extends Smackbone.Event
		constructor: (@host) ->

		connect: ->
			@readyState = 0
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
			@readyState = 1
			@trigger 'open', this

		_onClose: (event) =>
			@readyState = 2
			@trigger 'close', this

		_onError: (error) =>
			console.error 'we have a error:', error
			@trigger 'error', this
