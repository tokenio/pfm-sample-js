'use strict';

var express = require('express');
var fs = require('fs');
var cookieSession = require('cookie-session');
var app = express();
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.json({ extended: false });

var {TokenClient} = require('@token-io/tpp'); // main Token SDK entry object

// 'sandbox': Connect to Sandbox testing environment
// '4qY7...': Developer key
var Token = new TokenClient({env: 'sandbox', developerKey: '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI'});

async function initServer() {
    app.use(cookieSession({
        name: 'session',
        keys: ['cookieSessionKey'],
        // Cookie Options
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }));

    // Create a Member (Token user account). A "real world" server would
    // use the same member instead of creating a new one for each run;
    // this demo creates a a new member for easier demos/testing.
    var alias = {
        // An alias is a human-readable way to identify a member, e.g., an email address or domain.
        // When we tell Token UI to request an Access Token, we use this address.
        // If a domain alias is used instead of an email, please contact Token
        // with the domain and member ID for verification.
        // See https://developer.token.io/sdk/#aliases for more information.
        type: 'EMAIL',
        value: 'asjs-' + Math.random().toString(36).substring(2, 10) + '+noverify@example.com'
    };
    var m = await Token.createMember(alias, Token.MemoryCryptoEngine);
    await m.setProfile({
        // A member's profile has a display name and picture.
        // The Token UI shows this (and the alias) to the user when requesting access.
        displayNameFirst: 'Demo Data Aggregator',
    });
    // empty placeholder image
    await m.setProfilePicture('img/gif', 'R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
    var memberId = m.memberId();

    // Returns HTML file
    app.get('/', function (req, res) {
        fs.readFile('index.html', 'utf8', function (err, contents) {
            res.set('Content-Type', 'text/html');
            res.send(contents);
        })
    });
    // Returns client-side JS file
    app.get('/script.js', function (req, res) {
        fs.readFile('script.js', 'utf8', function (err, contents) {
            res.send(contents);
        })
    });

    app.post('/request-balances', urlencodedParser, async function (req, res) {
        var member = Token.getMember(Token.MemoryCryptoEngine, memberId);
        var nonce = Token.Util.generateNonce();
        req.session.nonce = nonce;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/fetch-balances-redirect';

        // set up the AccessTokenRequest
        var tokenRequest = Token.createAccessTokenRequest(req.body.resources)
            .setToAlias(alias)
            .setToMemberId(memberId)
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(nonce);
        // store the token request
        member.storeTokenRequest(tokenRequest).then(function(request) {
            var requestId = request.id;
            var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
            res.status(200).send(tokenRequestUrl);
        });
    });

    // for popup flow, use Token.parseTokenRequestCallbackParams()
    app.get('/fetch-balances', async function (req, res) {
        // verifies signature and CSRF token
        var result = await Token.parseTokenRequestCallbackParams(JSON.parse(req.query.data), req.session.nonce);
        // "log in" as service member.
        var member = Token.getMember(Token.MemoryCryptoEngine, memberId);
        // get a Representable member object to use the access token
        var rep = member.forAccessToken(result.tokenId);
        var accounts = await rep.getAccounts();

        var output = {balances: []};
        for (var i = 0; i < accounts.length; i++) { // for each account...
            var balance = (await rep.getBalance(accounts[i].id(), Token.KeyLevel.LOW)); // ...get its balance
            output.balances.push(balance.available);
        }

        res.send(JSON.stringify(output)); // respond to script.js with balances
    });

    // for redirect flow, use Token.parseTokenRequestCallbackUrl()
    app.get('/fetch-balances-redirect', async function (req, res) {
        var callbackUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        // verifies signature and CSRF token
        var result = await Token.parseTokenRequestCallbackUrl(callbackUrl, req.session.nonce);
        // "log in" as service member.
        var member = Token.getMember(Token.MemoryCryptoEngine, memberId);
        // get a Representable member object to use the access token
        var rep = member.forAccessToken(result.tokenId);
        var accounts = await rep.getAccounts();

        var output = {balances: []};
        for (var i = 0; i < accounts.length; i++) { // for each account...
            var balance = (await rep.getBalance(accounts[i].id(), Token.KeyLevel.LOW)); // ...get its balance
            output.balances.push(balance.available);
        }

        res.send(JSON.stringify(output)); // respond to script.js with balances
    });

    app.use(express.static(__dirname));
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    });
}

initServer();
