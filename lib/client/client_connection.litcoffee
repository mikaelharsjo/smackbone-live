
	class SmackboneLive.ClientConnection extends Smackbone.Event

		connect: (host, @repository) ->
			connection = new WebSocket host
			connection.onopen = @_onOpen
			connection.onclose = @_onClose
			connection.onerror = @_onError
			connection.onmessage = @_onMessage
			@messageQueue = {}
			@messageId = 0
			@connection = connection
			@repository.on 'save_request', @_onSaveRequest
			@host = host

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
			console.log @repository, url
			model = @repository.get url
			if not model?
				model = new Smackbone.Model
				@repository.set url, model
			model

		_send: (object) ->
			string = JSON.stringify object
			console.log "Sending: '#{string}'"
			@connection.send string

		_onSaveRequest: (path, model) =>
			console.log 'save request', path
			@_send
				url: path
				data: model
				type: 'save'

		_onReply: (messageId, data) ->
			message = @messageQueue[messageId]
			message.callback null, data
			delete @messageQueue[messageId]

		_onMessage: (event) =>
			object = JSON.parse event.data
			console.log 'Message:', object
			if object.reply_to?
				@_onReply object.reply_to, object.data
			else
				if object.type is 'save'
					model = if object.url is '' then @repository else @repository.get(object.url)
					model?.set object.data
				else
					@trigger 'message', object.data, this

		_onOpen: (event) =>
			console.log 'connected to:', event
			@trigger 'connect', this

		_onClose: (event) =>
			console.log 'disconnected:', event
			@trigger 'disconnect', this

		_onError: (error) =>
			console.log 'we have a error:', error
