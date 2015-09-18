
	class SmackboneLive.JsonRpc
		constructor: (options) ->
			@target = options.target
			@log = options.log
			@messageQueue = {}
			@messageId = 0

JsonRpc 2.0 Handlers

		onObject: (object) =>
			@log?.log 'Smackbone Live: onObject:', object
			if object.jsonrpc isnt '2.0'
				@log?.warn 'Smackbone Live: Invalid Json Rpc object:', object
				throw new Error 'Smackbone Live: Invalid Json Rpc object'
			if object.method?
				if object.id
					@target._onRequest object.method, object.params, (err, result) =>
						@_sendResponse object.id, err, result
				else
					@target._onNotification object.method, object.params
			else
				@_onResponse object.id, object.error, object.result


		_onResponse: (id, err, result) ->
			@log?.log 'Smackbone Live: onResponse:', id, err, result

			message = @messageQueue[id]
			if not message?
				@log?.warn "Got confirmation on unknown message #{id}"
			else
				message.callback err, result
				delete @messageQueue[id]

		_sendResponse: (id, err, result) ->
			@log?.log 'Smackbone Live: SendResponse:', id, err, result
			response =
				id: id
				error: err ? null
				result: result ? null
			@_send response

		sendRequest: (method, params, done) ->
			@messageId += 1

			queueItem =
				callback: done

			@messageQueue[@messageId] = queueItem
			request =
				id: @messageId
				method: method
				params: params

			@_send request

		sendNotification: (method, params) ->
			notification =
				method: method
				params: params
			@_send notification

		_send: (data) ->
			data.jsonrpc = '2.0'
			@target._send data

