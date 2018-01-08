'use strict';

var express = require('express')
const fs = require('fs')
var app = express()

// Connect to Token's development sandbox
var TokenLib = require('token-io/dist/token-io.node.js');
var Token = new TokenLib('sandbox', '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI','./keys');

function initServer(memberId, alias) {
    const address = alias.value;
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
            res.send(contents.replace(/{alias}/g, address));
        })
    });

    app.get('/fetch-data', function (req, res) {
        // "log in" as service member.
        const member = Token.getMember(Token.UnsecuredFileCryptoEngine, memberId);
        member.getToken(req.query.tokenId).then( function(token) {
            member.useAccessToken(token.id); // use access token's permissions from now on
            member.getAccounts().then(function (accounts) {
                for (var i = 0; i < accounts.length; i++) {
                    member.getBalance(accounts[i].id).then(function (b) {
                        console.log("ACCT: ", b.available);
                    });
                }
            });
            res.send("fetching...");
        });
    });
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    })
}

// If we know of a previously-created access member, load it; else create a new one.
function initMember() {
    var member; // Server's member (Token account)

    // Token SDK stores member keys in files in ./keys.
    // If access member's ID is "m:1234:567", its key file is "m_1234_567".
    try {
        const keyPaths = fs.readdirSync('./keys');
        if (keyPaths && keyPaths.length) {
            const keyPath = keyPaths[0];
            const mid = keyPath.replace(/_/g, ':');
            member = Token.getMember(Token.UnsecuredFileCryptoEngine, mid);
        }
    } catch (x) { // if "./keys" doesn't exist, fs.feaddirSync throws
    }

    // If member is defined, that means we found keys and loaded them.
    if (member) {
        // We're using an existing access member. Fetch its alias (email address)
        member.firstAlias().then(function (alias) {
            // launch server
            initServer(member.memberId(), alias);
        }, function (err) {
            console.log('Something went wrong loading access member: ' + err);
            console.log('If member ID not found or firstAlias fails, `rm -r ./keys` and try again.');
        });
    } else {
        // Didn't find an existing access member. Create a new one.
        const alias = {
            type: 'EMAIL',
            value: 'asjs-' + Math.random().toString(36).substring(2, 10) + '+noverify@example.com'
        };
        Token.createMember(alias, Token.UnsecuredFileCryptoEngine).then(function(m) {
            m.setProfile({
                displayNameFirst: 'Info Demo',
            });
            // launch server
            initServer(m.memberId(), alias);
    });
}
}

initMember();
