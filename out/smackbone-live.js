(function() {
  var Smackbone, SmackboneLive,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  if (typeof exports !== "undefined" && exports !== null) {
    console.log('exports is here');
    SmackboneLive = exports;
    Smackbone = require('smackbone');
  } else {
    console.log('exports is not');
    console.log('root', this);
    SmackboneLive = this.SmackboneLive = {};
    Smackbone = this.Smackbone;
  }

  SmackboneLive.Connection = (function(_super) {
    __extends(Connection, _super);

    function Connection(connection, repository) {
      this.connection = connection;
      this.repository = repository;
      this._onError = __bind(this._onError, this);
      this._onDisconnect = __bind(this._onDisconnect, this);
      this._onConnect = __bind(this._onConnect, this);
      this._onMessage = __bind(this._onMessage, this);
      this._onSaveRequest = __bind(this._onSaveRequest, this);
      this.messageQueue = {};
      this.messageId = 0;
      this.repository.on('save_request', this._onSaveRequest);
      this.connection.on('message', this._onMessage);
      this.connection.on('connect', this._onConnect);
      this.connection.on('disconnect', this._onDisconnect);
      this.connection.on('error', this._onError);
    }

    Connection.prototype.setCommandReceiver = function(commandReceiver) {
      this.commandReceiver = commandReceiver;
    };

    Connection.prototype.command = function(url, data, done) {
      var queueItem;
      console.log('Connection:Command ', url, data);
      this.messageId += 1;
      this._send({
        type: 'command',
        message_id: this.messageId,
        url: url,
        data: data
      });
      queueItem = {
        callback: done
      };
      return this.messageQueue[this.messageId] = queueItem;
    };

    Connection.prototype.model = function(url) {
      var model;
      console.log(this.repository, url);
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
      var string;
      console.log('Connection: Sending:', object);
      string = JSON.stringify(object);
      return this.connection.send(string);
    };

    Connection.prototype._onSaveRequest = function(path, model) {
      console.log('Connection: save request', path);
      return this._send({
        url: path,
        data: model,
        type: 'save'
      });
    };

    Connection.prototype._onReply = function(messageId, err, data) {
      var message;
      message = this.messageQueue[messageId];
      if (message == null) {
        return console.log("Got confirmation on unknown message " + messageId);
      } else {
        message.callback(err, data);
        return delete this.messageQueue[messageId];
      }
    };

    Connection.prototype._onMessage = function(event) {
      var functionName, method, model, object;
      object = JSON.parse(event);
      console.log('Connection: Message:', object);
      if (object.reply_to != null) {
        return this._onReply(object.reply_to, object.err, object.data);
      } else {
        switch (object.type) {
          case 'save':
            model = object.url === '' ? this.repository : this.repository.get(object.url);
            return model != null ? model.set(object.data) : void 0;
          case 'command':
            functionName = "_" + object.url;
            method = this.commandReceiver[functionName];
            if (method != null) {
              return method.call(this.commandReceiver, object.data, (function(_this) {
                return function(err, reply) {
                  return _this._sendReply(object.message_id, err, reply);
                };
              })(this));
            } else {
              return console.log("Unknown function '" + functionName + "'");
            }
            break;
          default:
            return this.trigger('message', object.data, this);
        }
      }
    };

    Connection.prototype._onConnect = function(event) {
      console.log('Connection: connected to:', event);
      return this.trigger('connect', this);
    };

    Connection.prototype._onDisconnect = function(event) {
      console.log('Connection: disconnected:', event);
      return this.trigger('disconnect', this);
    };

    Connection.prototype._onError = function(error) {
      console.log('Connection: we have a error:', error);
      return this.trigger('error', this);
    };

    return Connection;

  })(Smackbone.Event);

  SmackboneLive.WebsocketConnection = (function(_super) {
    __extends(WebsocketConnection, _super);

    function WebsocketConnection(host) {
      this.host = host;
      this._onError = __bind(this._onError, this);
      this._onClose = __bind(this._onClose, this);
      this._onOpen = __bind(this._onOpen, this);
      this._onMessage = __bind(this._onMessage, this);
    }

    WebsocketConnection.prototype.connect = function() {
      var connection;
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
      console.log('connected to:', event);
      return this.trigger('connect', this);
    };

    WebsocketConnection.prototype._onClose = function(event) {
      console.log('disconnected:', event);
      return this.trigger('disconnect', this);
    };

    WebsocketConnection.prototype._onError = function(error) {
      console.log('we have a error:', error);
      return this.trigger('error', this);
    };

    return WebsocketConnection;

  })(Smackbone.Event);

}).call(this);
