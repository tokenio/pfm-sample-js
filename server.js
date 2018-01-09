'use strict';

var express = require('express')
const fs = require('fs')
var app = express()

var TokenLib = require('token-io/dist/token-io.node.js');
// 'sandbox': Connect to Sandbox testing environment
// '4qY7...': Developer key
var Token = new TokenLib('sandbox', '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI');

async function initServer() {
    // Create a Member (Token user account). A "real world" server would
    // use the same member instead of creating a new one for each run;
    // this demo creates a a new member for easier demos/testing.
    const alias = {
        // An alias is a human-readable way to identify a member, e.g., an email address.
        // When we tell Token UI to request an Access Token, we use this address.
        // Normally, aliases are verified; in test environments like Sandbox, email addresses
        // that contain "+noverify" are automatically verified.
        type: 'EMAIL',
        value: 'asjs-' + Math.random().toString(36).substring(2, 10) + '+noverify@example.com'
    };
    const m = await Token.createMember(alias, Token.MemoryCryptoEngine);
    m.setProfile({
        // A member's profile has a display name and picture.
        // The Token UI shows this (and the alias) to the user when requesting access.
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

    app.get('/fetch-balances', async function (req, res) {
        // "log in" as service member.
        const member = Token.getMember(Token.MemoryCryptoEngine, memberId);
        var balances = {};
        member.useAccessToken(req.query.tokenId); // use access token's permissions from now on
        const accounts = await member.getAccounts(); // get list of accounts
        for (var i = 0; i < accounts.length; i++) { // for each account...
            const balance = await member.getBalance(accounts[i].id); // ...get its balance
            balances[accounts[i].id] = balance.available;
        }
        res.json({balances: balances}); // respond to script.js with balances
    });
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    })
}

initServer();
