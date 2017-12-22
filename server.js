'use strict';

var express = require('express')
const fs = require('fs')
var app = express()

 // Connect to Token's development sandbox
var TokenLib = require("token-io/dist/token-io.node.js");
var Token = new TokenLib('sandbox', '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI','./keys');

var aispMember; // aisp member

function initServer(member, alias) {
    const address = alias.value;
    // Returns HTML file with {alias} replaced by email address
    app.get('/', function (req, res) {
        fs.readFile('index.html', 'utf8', function (err, contents) {
            res.set('Content-Type', 'text/html');
            res.send(contents.replace(/{alias}/g, address));
        })
    });
    app.get('/script.js', function (req, res) {
        fs.readFile('script.js', 'utf8', function (err, contents) {
            res.send(contents.replace(/{alias}/g, address));
        })
    });

    app.get('/fetch-data', function (req, res) {
        // We'll going to set state on the member we use to fetch balances,
        // applying and later clearing an access token.
        // Rather than set this state on a global member, we'll use a copy here.
        const fetchMember = Token.getMember(Token.UnsecuredFileCryptoEngine, member.memberId());
        if ((!req) || (!req.query) || (!req.query.tokenId)) {
            res.json({
                status: "I don't see an access token Id? Click Link with Token to set that up.",
            });
            return;
        }
        console.log(`Using tokenId=${req.query.tokenId}`);

        fetchMember.getToken(req.query.tokenId).then( function(token) {
            console.log("got access token: " + JSON.stringify(token, null, 2));
            if (token.replacedByTokenId) {
                res.json({
                    status: "I had a token but it was replaced. I'll use the new one...",
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
            // If resources has an allBalances, then check for existence of other accounts
            // in, e.g. { account: { accountId: "a:1234:567" }}
            // TODO This seems only seems useful if access token has "silly" permissions.
            //      How much can we assume that access token permissions make sense?
            if (haveAllBalances) {
                for (var i = 0; i < token.payload.access.resources.length; i++) {
                    const resource = token.payload.access.resources[i];
                    for (var field in resource) {
                        if (resource[field].accountId) {
                            balances.set(resource[field].accountId, 0);
                        }
                    }
                }
            }
                    
            fetchMember.useAccessToken(token.id); // from here on, we will use access token's permissions to fetch
            
            if (haveAllBalances && haveAllAccounts) {
                // Call getAccounts to find out about other
                // accounts we can access.
                fetchMember.getAccounts().then(function (accounts) {
                    for (var i = 0; i < accounts.length; i++) {
                        console.log('getAccounts sees account: ' + JSON.stringify(accounts[i], null, 2));
                        balances.set(accounts[i].id, 0);
                    }
                }).then(function () {
                    getBalancesIntoResJson(fetchMember, balances, res).then(function () {
                        fetchMember.clearAccessToken();
                    });
                });
            } else {
                getBalancesIntoResJson(fetchMember, balances, res).then(function () {
                    fetchMember.clearAccessToken();
                });
            }
        }, function (err) {
            res.json({
                status: "Failed to fetch token, got " + JSON.stringify(err)
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
                console.log("saw error fetching balance: " + err);
                balancesMap.set(id, { err: "couldn't fetch: " + err });
            } );
        balancePromises.push(awaitBalance);
    }
    return Promise.all(balancePromises).then(function (l) {
        var jsonable = {} // JSON and Map don't work together
        for (const [k, v] of balancesMap) {
            jsonable[k] = v;
        }
        res.json({
            status: "got balances",
            balances: jsonable,
        });
    });
}

// If we know of a previously-created merchant member, load it; else create a new one.

// Token SDK stores member keys in files in ./keys.
// If merchant member's ID is "m:1234:567", its key file is "m_1234_567".
var keyPaths;
try {
    keyPaths = fs.readdirSync('./keys');
} catch (x) {
    keyPaths = [];
}
for (var i = 0; i < keyPaths.length; i++) {
    const keyPath = keyPaths[i];
    const mid = keyPath.replace(/_/g, ":");
    aispMember = Token.getMember(Token.UnsecuredFileCryptoEngine, mid);
}

// If member is defined, that means we found keys and loaded them.
if (aispMember) {
    // We're using an existing merchant member. Fetch its alias (email address)
    aispMember.firstAlias().then(function (alias) {
        // launch server
        initServer(aispMember, alias);
    }, function (err) {
        console.log("Something went wrong loading AISP member: " + err);
        console.log("If member ID not found, `rm -r ./keys` and try again.");
    });
} else {
    // Didn't find an existing merchant member. Create a new one.
    const alias = {
        type: 'EMAIL',
        value: "asjs-" + Math.random().toString(36).substring(2, 10) + "+noverify@example.com"
    };
    Token.createMember(alias, Token.UnsecuredFileCryptoEngine).then(function(m) {
        aispMember = m;
        aispMember.setProfile({
            displayNameFirst: "Info Demo",
        });
        // launch server
        initServer(aispMember, alias);
    });
}
