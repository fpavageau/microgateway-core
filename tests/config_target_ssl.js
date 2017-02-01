'use strict'

const _ = require('lodash')
const assert = require('assert')
const gatewayService = require('../index')
const request = require('request')
const https = require('https')
const should = require('should')
const fs = require('fs');

const gatewayPort = 8800
const port = 3300
const baseConfig = {
  system: {
    port: gatewayPort,
    logging: { level: 'info', dir: './tests/log' },
    vhosts: {
      myvhost: {
        vhost: 'localhost:'+gatewayPort,
        cert: './tests/server.crt',
        key: './tests/server.key'
      }
    }
  },
  proxies: [
    { 
      base_path: '/v1', 
      secure: true, 
      url: 'https://localhost:' + port,
      vhost: "myvhost"
    }
  ],
  targets: [
    {
      host: 'localhost',
      ssl: {
        client: {
          cert: './tests/server.crt',
          key: './tests/server.key',
          rejectUnauthorized: false
        }
      }
    }  
  ]
}

var gateway
var server

const startGateway = (config, handler, done) => {
  const opts = {
    key: fs.readFileSync('./tests/server.key'),
    cert: fs.readFileSync('./tests/server.crt') 
  };
  server = https.createServer(opts, handler);

  server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url)

    gateway = gatewayService(config)

    done()
  })
}

describe('test configuration handling', () => {
  afterEach((done) => {
    if (gateway) {
      gateway.stop(() => {})
    }

    if (server) {
      server.close()
    }

    done()
  })

  describe('target', () => {
    describe('ssl', () => {
      it('ssl can be enabled between em and target', (done) => {
        startGateway(baseConfig, (req, res) => {
          assert.equal('localhost:' + port, req.headers.host)
          res.end('OK')
        }, () => {
          gateway.start((err) => {
            assert(!err, err)

            request({
              method: 'GET',
              url: 'http://localhost:' + gatewayPort + '/v1'
            }, (err, r, body) => {
              assert(!err, err)
              assert.equal('OK', body)
              done()
            })
          })
        })
      })
    })
  })
})
