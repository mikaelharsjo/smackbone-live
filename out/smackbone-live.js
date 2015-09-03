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
      this._onMessage = bind(this._onMessage, this);
      this._onObject = bind(this._onObject, this);
      this._onLocalSaveRequest = bind(this._onLocalSaveRequest, this);
      this._onSaveRequest = bind(this._onSaveRequest, this);
      this.connection = options.connection;
      this.repository = options.repository;
      this.log = options.log;
      this.commandReceiver = options.commandReceiver;
      this.local = options.local;
      this.listenToEvent = options.listenToEvent;
      if (this.listenToEvent != null) {
        this.listenToEvent.on('all', this._onAll);
      }
      this.messageQueue = {};
      this.messageId = 0;
      this.local.on('save_request', this._onLocalSaveRequest);
      this.connection.on('message', this._onMessage);
      this.connection.on('object', this._onObject);
      this.connection.on('open', this._onConnect);
      this.connection.on('close', this._onDisconnect);
      this.connection.on('error', this._onError);
      done(null, this);
    }

    Connection.prototype._onAll = function(url, data) {
      return this._send({
        type: 'event',
        url: url,
        data: data
      });
    };

    Connection.prototype._sendModel = function(domain, path, model) {
      return this._send({
        type: 'save',
        url: path,
        data: model,
        domain: domain
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

    Connection.prototype.command = function(url, data, done) {
      var queueItem;
      this.messageId += 1;
      queueItem = {
        callback: done
      };
      this.messageQueue[this.messageId] = queueItem;
      return this._send({
        type: 'command',
        messageId: this.messageId,
        url: url,
        data: data
      });
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

    Connection.prototype._sendReply = function(messageId, err, data) {
      var reply;
      reply = {
        err: err,
        reply_to: messageId,
        data: data
      };
      return this._send(reply);
    };

    Connection.prototype._send = function(object) {
      var ref, string;
      if (this.isConnected()) {
        if ((ref = this.log) != null) {
          ref.log('Smackbone Live: Send:', object);
        }
        string = JSON.stringify(object);
        return this.connection.send(string);
      } else {
        return console.warn("Couldn't send. Connection is not open:", object);
      }
    };

    Connection.prototype._onSaveRequest = function(path, model) {
      return this._sendModel('', path, model);
    };

    Connection.prototype._onLocalSaveRequest = function(path, model) {
      return this._sendModel('local', path, model);
    };

    Connection.prototype._onReply = function(messageId, err, data) {
      var message;
      message = this.messageQueue[messageId];
      if (message == null) {
        return console.warn("Got confirmation on unknown message " + messageId);
      } else {
        message.callback(err, data);
        return delete this.messageQueue[messageId];
      }
    };

    Connection.prototype._onSave = function(object) {
      var domain, model;
      domain = object.domain === 'local' ? this.local : this.repository;
      model = object.url === '' ? domain : domain.get(object.url);
      return model != null ? model.set(object.data, {
        triggerRemove: true
      }) : void 0;
    };

    Connection.prototype._onCommand = function(object) {
      var functionName, method;
      functionName = "_" + object.url;
      method = this.commandReceiver[functionName];
      if (method != null) {
        return method.call(this.commandReceiver, object.data, (function(_this) {
          return function(err, reply) {
            _this._sendReply(object.message_id, err, reply);
            if ((err != null ? err.status : void 0) < 0) {
              return _this.close();
            }
          };
        })(this));
      } else {
        return console.warn("Unknown function '" + functionName + "'");
      }
    };

    Connection.prototype._onObject = function(object) {
      var ref;
      if ((ref = this.log) != null) {
        ref.log('Smackbone Live: Incoming:', object);
      }
      if (object.reply_to != null) {
        return this._onReply(object.reply_to, object.err, object.data);
      } else {
        switch (object.type) {
          case 'save':
            return this._onSave(object);
          case 'command':
            return this._onCommand(object);
          case 'event':
            return this.trigger(object.url, object.data, this);
        }
      }
    };

    Connection.prototype._onMessage = function(event) {
      var object;
      object = JSON.parse(event);
      return this._onObject(object);
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

    return Connection;

  })(Smackbone.Event);

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

}).call(this);
