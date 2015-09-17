
	class SmackboneLive.Connection extends Smackbone.Event
		ReadyState =
			Connecting: 0
			Open: 1
			Closing: 2
			Closed: 3

		constructor: (options, done) ->
			@jsonrpc = new SmackboneLive.JsonRpc
				target: @
				log: options.log
			@connection = options.connection
			@repository = options.repository
			@log = options.log
			@commandReceiver = options.commandReceiver
			@local = options.local
			@listenToEvent = options.listenToEvent
			if @listenToEvent?
				@listenToEvent.on 'all', @_onAll

			@local.on 'save_request', @_onLocalSaveRequest

			@connection.on 'message', @_onMessage
			@connection.on 'object', @_onObject
			@connection.on 'open', @_onConnect
			@connection.on 'close', @_onDisconnect
			@connection.on 'error', @_onError
			done null, @

		_onAll: (url, data) ->
			data =
				url: url
				data: data

			@jsonrpc.sendNotification 'smackbone.event', data

		_sendModel: (domain, path, model) ->
			data =
				url: path
				data: model
				domain: domain

			@jsonrpc.sendRequest 'smackbone.save', data, (err) ->
				if err?
					@log?.warn 'Smackbone-Live: Save returned error:', data

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

		command: (url, params, done) ->
			@jsonrpc.sendRequest url, params, done

		model: (url) ->
			model = @repository.get url
			if not model?
				model = new Smackbone.Model
				@repository.set url, model
			model

		_onSaveRequest: (path, model) =>
			@_sendModel '', path, model

		_onLocalSaveRequest: (path, model) =>
			@_sendModel 'local', path, model

		_onSave: (object, done) ->
			domain = if object.domain is 'local' then @local else @repository
			model = if object.url is '' then domain else domain.get object.url
			model?.set object.data,
				triggerRemove: true
			done null

		_callMethod: (functionName, params, done) ->
			method = @commandReceiver[functionName]
			if method?
				method.call @commandReceiver, params, done
			else
				errorMessage = "Unknown function '#{functionName}'"
				@log?.warn errorMessage
				done new Error errorMessage

		_onMessage: (event) =>
			object = JSON.parse event
			@jsonrpc.onObject object

		_onObject: (object) =>
			@jsonrpc.onObject object

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

		_onNormalRequest: (method, params, done) ->
			functionName = "_#{object.url}"
			@_callMethod functionName, object.data, (err, result) ->
				done err, result
				if err?.status < 0
					@close()

		_send: (object) ->
			if @isConnected()
				@log?.log 'Smackbone Live: Send:', object
				string = JSON.stringify object
				@connection.send string
			else
				@log?.warn "Smackbone Live: Couldn't send. Connection is not open:", object

JsonRpc 2.0 Handlers

		_onRequest: (method, params, done) ->
			@log?.log 'Smackbone Live: request:', method, params
			switch method
				when 'smackbone.save'
					@_onSave params, done
				else
					@_onNormalRequest method, params, done

		_onNotification: (method, params) ->
			@log?.log 'Smackbone Live: notification:', method, params
			switch method
				when 'smackbone.event'
					@trigger params.url, params.data, this
				else
					functionName = "on_#{method}"
					@_callMethod functionName, params, (err, result) ->
