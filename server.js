'use strict';

var express = require('express')
const fs = require('fs')
var app = express()

// Connect to Token's development sandbox
var TokenLib = require('token-io/dist/token-io.node.js');
var Token = new TokenLib('sandbox', '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI','./keys');

// Server's member (Token account)
var accessMember;

function initServer(member, alias) {
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
        // We set state on the member we use to fetch balances,
        // applying and later clearing an access token.
        // Rather than set this state on a global, use a copy here.
        const fetchMember = Token.getMember(Token.UnsecuredFileCryptoEngine, member.memberId());
        fetchMember.getToken(req.query.tokenId).then( function(token) {
            if (token.replacedByTokenId) {
                res.json({
                    replacedBy: token.replacedByTokenId,
                });
                return;
            }

            var balances = new Map();
            var haveAllBalances = false;
            var haveAllAccounts = false;
            for (var i = 0; i < token.payload.access.resources.length; i++) {
                const resource = token.payload.access.resources[i];
                if (resource.balance && resource.balance.accountId) {
                    balances.set(resource.balance.accountId, 0);
                }
                if (resource.allBalances) {
                    haveAllBalances = true;
                }
                if (resource.allAccounts) {
                    haveAllAccounts = true;
                }
            }
            fetchMember.useAccessToken(token.id); // use access token's permissions from now on
            
            var accountsPromise = Promise.resolve();
            if (haveAllBalances && haveAllAccounts) {
                // Call getAccounts to fetch list of accounts we can access.
                accountsPromise = fetchMember.getAccounts().then(function (accounts) {
                    for (var i = 0; i < accounts.length; i++) {
                        balances.set(accounts[i].id, 0);
                    }
                });
            }
            accountsPromise.then(function() {
                getBalancesIntoResJson(fetchMember, balances, res).then(function() {
                    fetchMember.clearAccessToken(); // stop using access token's permissions
                });
            });
        });
    });
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    })
}

// fetch balances for account Ids in keys of balancesMap,
// puts those balances into response as json.
function getBalancesIntoResJson(member, balancesMap, res) {
    var balancePromises = [];
    for (const [id, zero] of balancesMap) {
        const awaitBalance = member.getBalance(id).then(
            function(balance) {
                balancesMap.set(id, balance.available);
            } , function(err) {
                balancesMap.set(id, { err: 'couldn\'t fetch: ' + err });
            } );
        balancePromises.push(awaitBalance);
    }
    return Promise.all(balancePromises).then(function (l) {
        var jsonable = {} // JSON and Map don't work together
        for (const [k, v] of balancesMap) {
            jsonable[k] = v;
        }
        res.json({
            status: 'Got balances',
            balances: jsonable,
        });
    });
}

// If we know of a previously-created access member, load it; else create a new one.

// Token SDK stores member keys in files in ./keys.
// If access member's ID is "m:1234:567", its key file is "m_1234_567".
var keyPaths;
try {
    keyPaths = fs.readdirSync('./keys');
} catch (x) {
    keyPaths = [];
}
if (keyPaths && keyPaths.length) {
    const keyPath = keyPaths[0];
    const mid = keyPath.replace(/_/g, ':');
    accessMember = Token.getMember(Token.UnsecuredFileCryptoEngine, mid);
}

// If member is defined, that means we found keys and loaded them.
if (accessMember) {
    // We're using an existing access member. Fetch its alias (email address)
    accessMember.firstAlias().then(function (alias) {
        // launch server
        initServer(accessMember, alias);
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
        accessMember = m;
        accessMember.setProfile({
            displayNameFirst: 'Info Demo',
        });
        // launch server
        initServer(accessMember, alias);
    });
}
