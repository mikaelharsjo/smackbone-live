(function() {
  var Smackbone, SmackboneLive,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  if (typeof exports !== "undefined" && exports !== null) {
    SmackboneLive = exports;
    Smackbone = require('smackbone');
  } else {
    SmackboneLive = this.SmackboneLive = {};
    Smackbone = this.Smackbone;
  }

  SmackboneLive.Connection = (function(superClass) {
    var ReadyState;

    extend(Connection, superClass);

    ReadyState = {
      Connecting: 0,
      Open: 1,
      Closing: 2,
      Closed: 3
    };

    function Connection(options, done) {
      this._onError = bind(this._onError, this);
      this._onDisconnect = bind(this._onDisconnect, this);
      this._onConnect = bind(this._onConnect, this);
      this._onObject = bind(this._onObject, this);
      this._onMessage = bind(this._onMessage, this);
      this._onLocalSaveRequest = bind(this._onLocalSaveRequest, this);
      this._onSaveRequest = bind(this._onSaveRequest, this);
      this.jsonrpc = new SmackboneLive.JsonRpc({
        target: this,
        log: options.log
      });
      this.connection = options.connection;
      this.repository = options.repository;
      this.log = options.log;
      this.commandReceiver = options.commandReceiver;
      this.local = options.local;
      this.listenToEvent = options.listenToEvent;
      if (this.listenToEvent != null) {
        this.listenToEvent.on('all', this._onAll);
      }
      this.local.on('save_request', this._onLocalSaveRequest);
      this.connection.on('message', this._onMessage);
      this.connection.on('object', this._onObject);
      this.connection.on('open', this._onConnect);
      this.connection.on('close', this._onDisconnect);
      this.connection.on('error', this._onError);
      done(null, this);
    }

    Connection.prototype._onAll = function(url, data) {
      data = {
        url: url,
        data: data
      };
      return this.jsonrpc.sendNotification('smackbone.event', data);
    };

    Connection.prototype._sendModel = function(domain, path, model) {
      var data;
      data = {
        url: path,
        data: model,
        domain: domain
      };
      return this.jsonrpc.sendRequest('smackbone.save', data, function(err) {
        var ref;
        if (err != null) {
          return (ref = this.log) != null ? ref.warn('Smackbone-Live: Save returned error:', data) : void 0;
        }
      });
    };

    Connection.prototype.sendRepositoryChanges = function() {
      this._sendRoot();
      return this._listen();
    };

    Connection.prototype._sendRoot = function() {
      return this._sendModel('', '', this.repository);
    };

    Connection.prototype._listen = function() {
      return this.repository.on('save_request', this._onSaveRequest);
    };

    Connection.prototype._stopListen = function() {
      var ref;
      this.repository.off('save_request', this._onSaveRequest);
      return (ref = this.listenToEvent) != null ? ref.off('all', this._onAll) : void 0;
    };

    Connection.prototype.close = function() {
      this._stopListen();
      this.local.off('save_request', this._onLocalSaveRequest);
      this.connection.close();
      return this.isClosed = true;
    };

    Connection.prototype.isConnected = function() {
      return this.connection.readyState === ReadyState.Open;
    };

    Connection.prototype.setCommandReceiver = function(commandReceiver) {
      this.commandReceiver = commandReceiver;
    };

    Connection.prototype.command = function(url, params, done) {
      return this.jsonrpc.sendRequest(url, params, done);
    };

    Connection.prototype.model = function(url) {
      var model;
      model = this.repository.get(url);
      if (model == null) {
        model = new Smackbone.Model;
        this.repository.set(url, model);
      }
      return model;
    };

    Connection.prototype._onSaveRequest = function(path, model) {
      return this._sendModel('', path, model);
    };

    Connection.prototype._onLocalSaveRequest = function(path, model) {
      return this._sendModel('local', path, model);
    };

    Connection.prototype._onSave = function(object, done) {
      var domain, model;
      domain = object.domain === 'local' ? this.local : this.repository;
      model = object.url === '' ? domain : domain.get(object.url);
      if (model != null) {
        model.set(object.data, {
          triggerRemove: true
        });
      }
      return done(null);
    };

    Connection.prototype._callMethod = function(functionName, params, done) {
      var errorMessage, method, ref;
      method = this.commandReceiver[functionName];
      if (method != null) {
        return method.call(this.commandReceiver, params, done);
      } else {
        errorMessage = "Unknown function '" + functionName + "'";
        if ((ref = this.log) != null) {
          ref.warn(errorMessage);
        }
        return done(new Error(errorMessage));
      }
    };

    Connection.prototype._onMessage = function(event) {
      var object;
      object = JSON.parse(event);
      return this.jsonrpc.onObject(object);
    };

    Connection.prototype._onObject = function(object) {
      return this.jsonrpc.onObject(object);
    };

    Connection.prototype._onConnect = function(event) {
      var ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live: Connected');
      }
      this._listen();
      return this.trigger('connect', this);
    };

    Connection.prototype._onDisconnect = function(event) {
      var ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live: Disconnected');
      }
      this._stopListen();
      return this.trigger('disconnect', this);
    };

    Connection.prototype._onError = function(error) {
      var ref;
      if ((ref = this.log) != null) {
        ref.warn('Smackbone Live: Error:', error);
      }
      return this.trigger('error', this);
    };

    Connection.prototype._onNormalRequest = function(method, params, done) {
      var functionName;
      functionName = "_" + object.url;
      return this._callMethod(functionName, object.data, function(err, result) {
        done(err, result);
        if ((err != null ? err.status : void 0) < 0) {
          return this.close();
        }
      });
    };

    Connection.prototype._send = function(object) {
      var ref, ref1, string;
      if (this.isConnected()) {
        if ((ref = this.log) != null) {
          ref.log('Smackbone Live: Send:', object);
        }
        string = JSON.stringify(object);
        return this.connection.send(string);
      } else {
        return (ref1 = this.log) != null ? ref1.warn("Smackbone Live: Couldn't send. Connection is not open:", object) : void 0;
      }
    };

    Connection.prototype._onRequest = function(method, params, done) {
      var ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live: request:', method, params);
      }
      switch (method) {
        case 'smackbone.save':
          return this._onSave(params, done);
        default:
          return this._onNormalRequest(method, params, done);
      }
    };

    Connection.prototype._onNotification = function(method, params) {
      var functionName, ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live: notification:', method, params);
      }
      switch (method) {
        case 'smackbone.event':
          return this.trigger(params.url, params.data, this);
        default:
          functionName = "on_" + method;
          return this._callMethod(functionName, params, function(err, result) {});
      }
    };

    return Connection;

  })(Smackbone.Event);

  SmackboneLive.JsonRpc = (function() {
    function JsonRpc(options) {
      this.onObject = bind(this.onObject, this);
      this.target = options.target;
      this.log = options.log;
      this.messageQueue = {};
      this.messageId = 0;
    }

    JsonRpc.prototype.onObject = function(object) {
      var ref, ref1;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live: onObject:', object);
      }
      if (object.jsonrpc !== '2.0') {
        if ((ref1 = this.log) != null) {
          ref1.warn('Smackbone Live: Invalid Json Rpc object:', object);
        }
        throw new Error('Smackbone Live: Invalid Json Rpc object');
      }
      if (object.method != null) {
        if (object.id) {
          return this.target._onRequest(object.method, object.params, (function(_this) {
            return function(err, result) {
              return _this._sendResponse(object.id, err, result);
            };
          })(this));
        } else {
          return this.target._onNotification(object.method, object.params);
        }
      } else {
        return this._onResponse(object.id, object.error, object.result);
      }
    };

    JsonRpc.prototype._onResponse = function(id, err, result) {
      var message, ref, ref1;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live: onResponse:', id, err, result);
      }
      message = this.messageQueue[id];
      if (message == null) {
        return (ref1 = this.log) != null ? ref1.warn("Got confirmation on unknown message " + id) : void 0;
      } else {
        message.callback(err, result);
        return delete this.messageQueue[id];
      }
    };

    JsonRpc.prototype._sendResponse = function(id, err, result) {
      var ref, response;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live: SendResponse:', id, err, result);
      }
      response = {
        id: id,
        error: err != null ? err : null,
        result: result != null ? result : null
      };
      return this._send(response);
    };

    JsonRpc.prototype.sendRequest = function(method, params, done) {
      var queueItem, request;
      this.messageId += 1;
      queueItem = {
        callback: done
      };
      this.messageQueue[this.messageId] = queueItem;
      request = {
        id: this.messageId,
        method: method,
        params: params
      };
      return this._send(request);
    };

    JsonRpc.prototype.sendNotification = function(method, params) {
      var notification;
      notification = {
        method: method,
        params: params
      };
      return this._send(notification);
    };

    JsonRpc.prototype._send = function(data) {
      data.jsonrpc = '2.0';
      return this.target._send(data);
    };

    return JsonRpc;

  })();

  SmackboneLive.WebsocketConnection = (function(superClass) {
    extend(WebsocketConnection, superClass);

    function WebsocketConnection(host) {
      this.host = host;
      this._onError = bind(this._onError, this);
      this._onClose = bind(this._onClose, this);
      this._onOpen = bind(this._onOpen, this);
      this._onMessage = bind(this._onMessage, this);
    }

    WebsocketConnection.prototype.connect = function() {
      var connection;
      this.readyState = 0;
      connection = new WebSocket(this.host);
      connection.onopen = this._onOpen;
      connection.onclose = this._onClose;
      connection.onerror = this._onError;
      connection.onmessage = this._onMessage;
      return this.connection = connection;
    };

    WebsocketConnection.prototype.send = function(string) {
      return this.connection.send(string);
    };

    WebsocketConnection.prototype._onMessage = function(event) {
      return this.trigger('message', event.data);
    };

    WebsocketConnection.prototype._onOpen = function(event) {
      this.readyState = 1;
      return this.trigger('open', this);
    };

    WebsocketConnection.prototype._onClose = function(event) {
      this.readyState = 2;
      return this.trigger('close', this);
    };

    WebsocketConnection.prototype._onError = function(error) {
      console.error('we have a error:', error);
      return this.trigger('error', this);
    };

    return WebsocketConnection;

  })(Smackbone.Event);

  SmackboneLive.WebsocketReConnection = (function(superClass) {
    extend(WebsocketReConnection, superClass);

    function WebsocketReConnection(host, socketFactory, log) {
      this.host = host;
      this.socketFactory = socketFactory;
      this.log = log;
      this._onDisconnect = bind(this._onDisconnect, this);
      this._onError = bind(this._onError, this);
      this._onRetryConnection = bind(this._onRetryConnection, this);
      this._onConnect = bind(this._onConnect, this);
      this._onObject = bind(this._onObject, this);
      this._onMessage = bind(this._onMessage, this);
    }

    WebsocketReConnection.prototype.connect = function() {
      var connection, ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live:Reconnection: Connecting...');
      }
      this.readyState = 0;
      connection = this.socketFactory(this.host);
      connection.on('message', this._onMessage);
      connection.on('object', this._onObject);
      connection.on('open', this._onConnect);
      connection.on('close', this._onDisconnect);
      connection.on('error', this._onError);
      connection.connect();
      return this.connection = connection;
    };

    WebsocketReConnection.prototype.send = function(data) {
      var ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live:Reconnection: Sending:', data);
      }
      return this.connection.send(data);
    };

    WebsocketReConnection.prototype.close = function() {
      var ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live:Reconnection: Closing...');
      }
      this.connection.close();
      if (this.timer != null) {
        return clearTimeout(this.timer);
      }
    };

    WebsocketReConnection.prototype._onMessage = function(event) {
      return this.trigger('message', event);
    };

    WebsocketReConnection.prototype._onObject = function(object) {
      return this.trigger('object', event);
    };

    WebsocketReConnection.prototype._onConnect = function(event) {
      var ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live:Reconnection: Connected');
      }
      return this.trigger('open', this);
    };

    WebsocketReConnection.prototype._onRetryConnection = function() {
      var ref;
      this.timer = void 0;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live:Reconnection: Reconnecting...');
      }
      this.connection = void 0;
      return this.connect();
    };

    WebsocketReConnection.prototype._onError = function(err) {
      var ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live:Reconnection: OnError:', err);
      }
      return this._tryReconnect();
    };

    WebsocketReConnection.prototype._onDisconnect = function(event) {
      var ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live:Reconnection: Disconnected');
      }
      this.trigger('close', this);
      return this._tryReconnect();
    };

    WebsocketReConnection.prototype._tryReconnect = function() {
      var ref;
      if (this.timer != null) {
        if ((ref = this.log) != null) {
          ref.log('Smackbone Live:Reconnection: Already reconnecting...');
        }
        return;
      }
      return this.timer = setTimeout(this._onRetryConnection, 1000);
    };

    return WebsocketReConnection;

  })(Smackbone.Event);

}).call(this);
