	smackbone_live = require '../out/smackbone-live'
	smackbone = require 'smackbone'
	require 'should'

	describe 'jsonrpc', ->
		beforeEach ->
			@jsonrpc = new smackbone_live.JsonRpc
				target: null

		it 'should generate requests', (done) ->
			target =
				_send: (data) ->
					data.should.eql {jsonrpc: '2.0', id:1, method:'test', params:{hello:'world'}}
					done null

			@jsonrpc.target = target
			@jsonrpc.sendRequest 'test', {hello: 'world'}


