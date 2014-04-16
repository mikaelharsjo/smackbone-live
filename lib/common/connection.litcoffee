
	class SmackboneLive.Connection extends Smackbone.Event

		constructor: (@connection, @repository) ->
			@messageQueue = {}
			@messageId = 0

			@repository.on 'save_request', @_onSaveRequest

			@connection.on 'message', @_onMessage
			@connection.on 'connect', @_onConnect
			@connection.on 'disconnect', @_onDisconnect
			@connection.on 'error', @_onError

		setCommandReceiver: (@commandReceiver) ->


		command: (url, data, done) ->
			console.log 'Connection:Command ', url, data

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
			console.log @repository, url
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
			console.log 'Connection: Sending:', object
			string = JSON.stringify object
			@connection.send string

		_onSaveRequest: (path, model) =>
			console.log 'Connection: save request', path
			@_send
				url: path
				data: model
				type: 'save'

		_onReply: (messageId, err, data) ->
			message = @messageQueue[messageId]
			if not message?
				console.log "Got confirmation on unknown message #{messageId}"
			else
				message.callback err, data
				delete @messageQueue[messageId]

		_onMessage: (event) =>
			object = JSON.parse event
			console.log 'Connection: Message:', object
			if object.reply_to?
				@_onReply object.reply_to, object.err, object.data
			else
				switch object.type
					when 'save'
						model = if object.url is '' then @repository else @repository.get(object.url)
						model?.set object.data
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
			console.log 'Connection: connected to:', event
			@trigger 'connect', this

		_onDisconnect: (event) =>
			console.log 'Connection: disconnected:', event
			@trigger 'disconnect', this

		_onError: (error) =>
			console.log 'Connection: we have a error:', error
			@trigger 'error', this
