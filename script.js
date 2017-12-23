'use strict';
var tokenId = '';
Token.styleButton({            // Sets up the Link with Token button
    id: "tokenAccessBtn",
    label: "Link with Token"
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
        console.log("success callback got " + JSON.stringify(data));
        if (data.tokenId) {
            tokenId = data.tokenId;
            $('#fetch').prop('disabled', false);
            $('#chat').text('Got access token.');
        }
    },
    function(error) { // fail, no/cancelled access token
        console.log('Something\'s wrong!', error);
    }
);
function doFetch() {
    $('#chat').text('Fetching...');
    $.getJSON(
        `/fetch-data`,
        {tokenId: tokenId},
        function (gotJSON) {
            console.log("I see JSON " + JSON.stringify(gotJSON));
            if (gotJSON.status) {
                $('#chat').text(gotJSON.status);
            } else {
                $('#chat').html(`GOT: <pre>${JSON.stringify(gotJSON, null, 2)}</pre>`);
            }
            if (gotJSON.replacedBy) {
                tokenId = gotJSON.replacedBy;
                doFetch();
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
$('#fetch').click(function () {
    if (tokenId) {
        doFetch();
    } else {
        $('#chat').text("App doesn't know your tokenId. Even if you set it up before, this app 'forgets' when you reload, sorry. Link with Token, please.");
    }
});
