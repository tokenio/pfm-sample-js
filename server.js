'use strict';

var express = require('express')
const fs = require('fs')
var app = express()

 // Connect to Token's development sandbox
var TokenLib = require('token-io/dist/token-io.node.js');
var Token = new TokenLib('sandbox', '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI','./keys');

// Server's member (Token account)
// When a customer grants this app access, they create an Access Token
// that lets the server's member to see the customer member's info.
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
        if ((!req) || (!req.query) || (!req.query.tokenId)) {
            res.json({
                status: 'I don\'t see an access token Id? Click Link with Token to set that up.',
            });
            return;
        }
        console.log(`Using tokenId=${req.query.tokenId}`);

        const fetchMember = Token.getMember(Token.UnsecuredFileCryptoEngine, member.memberId());
        fetchMember.getToken(req.query.tokenId).then( function(token) {
            console.log('got access token: ' + JSON.stringify(token, null, 2));

            // If our locally-stored token has been replaced by a newer access token,
            // report it. In a real program, it makes more sense to store the
            // new token and silently fetch it. This demo isn't silent; it assumes the
            // user is learning the "flow" and wants to know about replacements.
            if (token.replacedByTokenId) {
                res.json({
                    status: 'I had a token but it was replaced. I\'ll use the new one next time.',
                    replacedBy: token.replacedByTokenId,
                });
                return;
            }

            // If the access token doesn't grant access to anything,
            // that's a little strange; report it.
            if ((!token.payload.access.resources) || (!token.payload.access.resources.length)) {
                res.json({
                    status: 'This Access Token contains no accesses',
                    balances: {},
                });
                return;
            }

            // Find out which accounts' balances we have access to,
            // then get those balances.
            // We initially asked for an access token with resources:
            //   allBalances: get balance for any account we know of
            //   allAccounts: get a list of accounts
            // If we have those , our logic is straightforward:
            // get a list of accounts, then for each get the balance.
            // But the user might have granted narrower resources.
            // Look at the token's resources. If we have allBalances
            // or allAccounts, remember to use them later. If we have
            // permission to get the balance of specific accounts,
            // remember the account ids in balances structure.
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
                        console.log('getAccounts sees account: ' +
                                    JSON.stringify(accounts[i], null, 2));
                        balances.set(accounts[i].id, 0);
                    }
                });
            }
            accountsPromise.then(function() {
                getBalancesIntoResJson(fetchMember, balances, res).then(function() {
                    fetchMember.clearAccessToken(); // stop using access token's permissions
                });
            });
        }, function (err) {
            res.json({
                status: 'Failed to fetch token, got ' + JSON.stringify(err)
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
                console.log('saw error fetching balance: ' + err);

                // One reason it maybe couldn't fetch: the access token
                // might list an account that the user has deleted. This gets
                // status code 400. Reason: FAILED_PRECONDITION: Account ... is not active

                // TODO Maybe I should check for this and handle it special?
                //      If I were writing a real-world app, I'd skip this account
                //      instead of showing an error. I think showing the error case
                //      is useful so folks know it can happen... but maybe showing
                //      the RAW error isn't so great.
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
for (var i = 0; i < keyPaths.length; i++) {
    const keyPath = keyPaths[i];
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
        console.log('If member ID not found, `rm -r ./keys` and try again.');
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
