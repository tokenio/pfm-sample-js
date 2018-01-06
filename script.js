'use strict';
var tokenId = '';
Token.styleButton({            // Sets up the Link with Token button
    id: 'tokenAccessBtn',
    label: 'Link with Token'
}).bindAccessButton(
    {
        alias: {
            type: 'EMAIL',
            value: '{alias}'        // address filled in by server.js
        },
        resources: [
            { type: Token.RESOURCE_TYPE_ALL_ACCOUNTS },
            { type: Token.RESOURCE_TYPE_ALL_BALANCES },
        ]
    },
    function(data) { // success, have access token
        console.log('success callback got ' + JSON.stringify(data));
        if (data.tokenId) {
            tokenId = data.tokenId;
            $('#fetch').prop('disabled', false);
            updateStatus('Got access token.');
        }
    },
    function(error) { // fail
        alert('Something\'s wrong! ' + error);
    }
);

function doFetch() {
    updateStatus('Fetching...');
    $.getJSON(
        `/fetch-data`,
        {tokenId: tokenId},
        function (gotJSON) {
            console.log('I see JSON ' + JSON.stringify(gotJSON));
            if (gotJSON.status) {
                updateStatus(gotJSON.status);
            }
            if (gotJSON.replacedBy) {
                tokenId = gotJSON.replacedBy;
                doFetch();
                return;
            }
            if (gotJSON.balances) {
                $('#display').html('<tr><th>CURRENCY <th>AMOUNT');
                for (var acctId in gotJSON.balances) {
                    const bal = gotJSON.balances[acctId];
                    if (bal.err) {
                        $('#display').append(`<tr><td colspan=2>${bal.err}</tr>`);
                    } else {
                        $('#display').append(`<tr><td>${bal.currency} <td>${bal.value} </tr>`);
                    }
                }
            }
        }
    );
}

// display status text to user
function updateStatus(s) {
    $('#status').text(s);
}

$('#fetch').click(doFetch);
