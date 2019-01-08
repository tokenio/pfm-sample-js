'use strict';

var express = require('express');
const fs = require('fs');
var app = express();

// It is strongly recommended that you use ES6 destructuring to require these objects (or ES6 named imports)
// They are written here in ES5 for maximum browser compatibility since we do not transpile this code sample
// See https://github.com/tokenio/sdk-js for details
var TokenIO = require('token-io').TokenIO; // main Token SDK entry object
var Alias = require('token-io').Alias; // Token alias constructor
var Profile = require('token-io').Profile; // Token member profile constructor

// 'sandbox': Connect to Sandbox testing environment
// '4qY7...': Developer key
var Token = new TokenIO({env: 'sandbox', developerKey: '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI'});

async function initServer() {
    // Create a Member (Token user account). A "real world" server would
    // use the same member instead of creating a new one for each run;
    // this demo creates a a new member for easier demos/testing.
    const alias = Alias.create({
        // An alias is a human-readable way to identify a member, e.g., an email address or domain.
        // When we tell Token UI to request an Access Token, we use this address.
        // If a domain alias is used instead of an email, please contact Token
        // with the domain and member ID for verification.
        // See https://developer.token.io/sdk/#aliases for more information.
        type: 'EMAIL',
        value: 'asjs-' + Math.random().toString(36).substring(2, 10) + '+noverify@example.com'
    });
    const m = await Token.createBusinessMember(alias, Token.MemoryCryptoEngine);
    m.setProfile(Profile.create({
        // A member's profile has a display name and picture.
        // The Token UI shows this (and the alias) to the user when requesting access.
        displayNameFirst: 'Info Demo'
    }));
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

    app.post('/request-balances', async function (req, res) {
        const member = Token.getMember(Token.MemoryCryptoEngine, memberId);

        // set up the AccessTokenBuilder
        const tokenBuilder = member.createAccessTokenBuilder()
            .forAllAccounts()
            .forAllBalances()
            .setToAlias(alias)
            .setToMemberId(memberId);
        // set up the TokenRequest
        const tokenRequest = Token.TokenRequest.create(tokenBuilder.build())
                .setRedirectUrl('http://localhost:3002/fetch-balances');
        // store the token request
        member.storeTokenRequest(tokenRequest).then(function(request) {
            const requestId = request.id;
            const redirectUrl = Token.generateTokenRequestUrl(requestId);
            res.redirect(302, redirectUrl);
        });
    });

    app.get('/fetch-balances', async function (req, res) {
        // "log in" as service member.
        const member = Token.getMember(Token.MemoryCryptoEngine, memberId);
        var balances = {};

	    var token = await member.getToken(req.query.tokenId);
        const accountIds = Array.from(new Set(token.payload.access.resources
            .filter((resource) => !!resource.account)
            .map((resource) => resource.account.accountId)));
            
        member.useAccessToken(req.query.tokenId); // use access token's permissions from now on
        const accounts = accountIds.length
            ? await Promise.all(accountIds
                .map(async (accId) => await member.getAccount(accId)))
            : await member.getAccounts(); 

        for (var i = 0; i < accounts.length; i++) { // for each account...
            const balance = (await member.getBalance(accounts[i].id, Token.KeyLevel.LOW)).balance; // ...get its balance
            balances[accounts[i].id] = balance.available;
        }

        member.clearAccessToken();

        res.json({balances: balances}); // respond to script.js with balances
    });
    app.use(express.static(__dirname));
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    });
}

initServer();
