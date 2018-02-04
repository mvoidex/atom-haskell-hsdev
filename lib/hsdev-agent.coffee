{Emitter, CompositeDisposable} = require 'atom'
process = require 'child_process'
net = require 'net'
{EOL} = require 'os'

module.exports =
  class HsDevAgent
    constructor: (port, db, log_file, log_config) ->
      @disposables = new CompositeDisposable
      @disposables.add @emitter = new Emitter
      @port = port
      @db = db
      @log_file = log_file
      @log_config = log_config
      @id = 0
      @callbacks = {}

      @runServer()

    runServer: =>
      console.log "Creating hsdev process"

      @process = process.spawn('hsdev', ['run', '--port', @port])
      @process.stdout.setEncoding 'utf-8'
      @process.stderr.setEncoding 'utf-8'
      lastLine = ""
      @process.stdout.on 'data', (data) =>
        [lines..., last] = data.split(EOL)
        if lines.length == 0
          lastLine = lastLine + last
        else
          lines[0] = lastLine + lines[0]
          lastLine = last
        lines.forEach (line) =>
          console.log "line: #{line}"
          if line.match(/Server started at port (.*)$/)
            @connect()
      @process.on 'exit', (code) ->
        console.log "hsdev exited with #{code}"

    connect: =>
      console.log "Connecting to hsdev"
      @hsdev = new net.Socket({port: 1234})
      @hsdev.setEncoding 'utf-8'
      @hsdev.on 'connect', =>
        console.log "Connected to hsdev"
        @emitter.emit 'connect'
      lastLine = ""
      @hsdev.on 'data', (data) =>
        [lines..., last] = data.split("\n")
        if lines.length == 0
          lastLine = lastLine + last
        else
          lines[0] = lastLine + lines[0]
          lastLine = last
        lines.forEach (line) =>
          @receive line
      @hsdev.connect(port = 1234)

    destroy: =>
      console.log "Stopping hsdev"

      @hsdev.end()
      @process.stdin.end()

    send: (cmd) =>
      if @hsdev?
        console.log "send: #{JSON.stringify(cmd)}"
        @hsdev.write(JSON.stringify(cmd) + "\n")

    call: (cmd, opts = {}, response = null, notify = null, error = null) =>
      opts['command'] = cmd
      opts['id'] = @id.toString()
      @subscribe @id, response, notify, error
      @id = @id + 1
      @send opts

    receive: (line) =>
      console.log "received: #{line}"
      resp = JSON.parse(line)
      id = null
      if resp['id'] != 'null'
        id = parseInt resp['id']
      if resp['result']
        @response id, resp['result']
      if resp['error']
        err = resp['error']
        ds = resp
        delete(ds['error'])
        @error id, err, ds
      if resp['notify']
        @notify id, resp['notify']

    response: (id, resp) =>
      console.log "response: #{id}, #{JSON.stringify(resp)}"
      if @callbacks[id]
        if @callbacks[id]['response']
          @callbacks[id]['response'] resp
        delete(@callbacks[id])

    notify: (id, n) =>
      console.log "notify: #{id}, #{JSON.stringify(n)}"
      if @callbacks[id]
        if @callbacks[id]['notify']
          @callbacks[id]['notify'] n

    error: (id, e, ds) =>
      console.log "error: #{id}, #{e}, #{JSON.stringify(ds)}"
      if @callbacks[id]
        if @callbacks[id]['error']
          @callbacks[id]['error'] e, ds
        delete(@callbacks[id])

    ping: (callbacks...) =>
      @call 'ping', {}, callbacks...

    subscribe: (id, response, notify, error) =>
      @callbacks[id] = {
        'response': response,
        'notify': notify,
        'error': error }
