'use strict';

var express = require('express')
const fs = require('fs')
var app = express()

// Connect to Token's development sandbox
var TokenLib = require('token-io/dist/token-io.node.js');
var Token = new TokenLib('sandbox', '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI');

async function initServer() {
    const alias = {
        type: 'EMAIL',
        value: 'asjs-' + Math.random().toString(36).substring(2, 10) + '+noverify@example.com'
    };
    const m = await Token.createMember(alias, Token.MemoryCryptoEngine);
    m.setProfile({
        displayNameFirst: 'Info Demo'
    });
    const memberId = m.memberId();

    // Returns HTML file
    app.get('/', function (req, res) {
        fs.readFile('index.html', 'utf8', function (err, contents) {
            res.set('Content-Type', 'text/html');
            res.send(contents);
        })
    });
    // Returns JS file with {alias} replaced by accessMember's email address
    app.get('/script.js', function (req, res) {
        fs.readFile('script.js', 'utf8', function (err, contents) {
            res.send(contents.replace(/{alias}/g, alias.value));
        })
    });

    app.get('/fetch-data', async function (req, res) {
        // "log in" as service member.
        const member = Token.getMember(Token.MemoryCryptoEngine, memberId);
        member.useAccessToken(req.query.tokenId); // use access token's permissions from now on
        const accounts = await member.getAccounts();
        for (var i = 0; i < accounts.length; i++) {
            const balance = await member.getBalance(accounts[i].id);
            console.log("ACCT: ", balance.available);
        }
    });
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    })
}

initServer();
