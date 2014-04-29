
	class SmackboneLive.Connection extends Smackbone.Event
		ReadyState =
			Connecting: 0
			Open: 1
			Closing: 2
			Closed: 3


		constructor: (@connection, @repository, @local) ->
			@messageQueue = {}
			@messageId = 0

			@local.on 'save_request', @_onLocalSaveRequest

			@connection.on 'message', @_onMessage
			@connection.on 'open', @_onConnect
			@connection.on 'close', @_onDisconnect
			@connection.on 'error', @_onError

		_sendModel: (domain, path, model) ->
			@_send
				domain: domain
				url: path
				data: model
				type: 'save'

		sendRepositoryChanges: ->
			@_sendRoot()
			@_listen()


		_sendRoot: ->
			@_sendModel '', '', @repository

		_listen: ->
			@repository.on 'save_request', @_onSaveRequest

		_stopListen: ->
			@repository.off 'save_request', @_onSaveRequest

		close: ->
			@_stopListen()
			@local.off 'save_request', @_onLocalSaveRequest
			@connection.off 'message', @_onMessage
			@connection.off 'open', @_onConnect
			@connection.off 'close', @_onDisconnect
			@connection.off 'error', @_onError
			@isClosed = true

		isConnected: ->
			@connection.readyState is ReadyState.Open

		setCommandReceiver: (@commandReceiver) ->


		command: (url, data, done) ->
			@messageId += 1

			@_send
				type: 'command'
				message_id: @messageId
				url: url
				data: data

			queueItem =
				callback: done

			@messageQueue[@messageId] = queueItem

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
				string = JSON.stringify object
				console.log 'send:', string
				@connection.send string
			else
				console.log "Couldn't send. Connection is not open:", object

		_onSaveRequest: (path, model) =>
			@_sendModel '', path, model

		_onLocalSaveRequest: (path, model) =>
			@_sendModel 'local', path, model

		_onReply: (messageId, err, data) ->
			message = @messageQueue[messageId]
			if not message?
				console.log "Got confirmation on unknown message #{messageId}"
			else
				message.callback err, data
				delete @messageQueue[messageId]

		_onMessage: (event) =>
			console.log 'receive:', event
			object = JSON.parse event
			if object.reply_to?
				@_onReply object.reply_to, object.err, object.data
			else
				switch object.type
					when 'save'
						domain = if object.domain is 'local' then @local else @repository
						model = if object.url is '' then domain else domain.get(object.url)
						model?.set object.data,
							triggerRemove: true

					when 'command'
						functionName = "_#{object.url}"
						method = @commandReceiver[functionName]
						if method?
							method.call @commandReceiver, object.data, (err, reply) =>
								@_sendReply object.message_id, err, reply
						else
							console.log "Unknown function '#{functionName}'"
					else
						@trigger 'message', object.data, this

		_onConnect: (event) =>
			@_listen()
			@trigger 'connect', this

		_onDisconnect: (event) =>
			@_stopListen()
			@trigger 'disconnect', this

		_onError: (error) =>
			@trigger 'error', this
