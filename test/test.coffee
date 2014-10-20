smackbone_live = require '../out/smackbone-live'
smackbone = require 'smackbone'

class FakeConnection extends smackbone.Event
	constructor: (options) ->
		@readyState = 1
		super options

	send: (s) ->
		o = JSON.parse s
		@trigger 'send', o

	close: ->
		console.log 'closing'

class FakeModel
	on: (event) ->


describe 'live', ->
	it 'should reply to commands', (done) ->
		options =
			connection: new FakeConnection
			local: new FakeModel

		new smackbone_live.Connection options, (err, connection) ->
			options.connection.on 'send', (o) ->
				options.connection.trigger 'object', {reply_to:o.messageId, data: {name:"some name"}}

			connection.command '/some_command', {meaning:42}, (err, reply) ->
				reply.should.eql {name: 'some name'}
				done err
		