/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(["N/runtime","N/search","N/url","N/https","N/log"], function(runtime,search,url,https,log)
{
    /**
     * @param {Object} context
     */
    function execute(context)
    {
        log.audit({
            title: 'Start',
            details: 'Script has started.'
        });

        var matches = [];

        var savedSearchID = runtime.getCurrentScript().getParameter({name: 'custscript_search_id'});

        //Suitescript Search Loader
        try {
            var salesOrderItemSearch = search.load({
                id: savedSearchID
            });
        }
        catch (e) {
            log.audit({
                title: 'Error End',
                details: 'Search was unable to be loaded'
            });
            return;
        }

        var pagedData = salesOrderItemSearch.runPaged({
            "pageSize": 1000
        });

        var searchResultCount = pagedData.count;
        log.debug("Saved Search ID", savedSearchID);
        log.debug("Saved Search Result Count", searchResultCount);

        pagedData.pageRanges.forEach(function(pageRange){
            var currentPage = pagedData.fetch({index: pageRange.index});
            currentPage.data.forEach(function(result){
                // Build Out Summary Group Object
                var lineItem = {};
                lineItem.code = result.getValue({
                    "name": "custrecord_code",
                    "summary": search.Summary.GROUP
                });
                lineItem.name = result.getValue({
                    "name": "name",
                    "summary": search.Summary.GROUP
                });
                lineItem.numCount = parseInt(result.getValue({
                    "name": "internalid",
                    "summary": search.Summary.COUNT
                }), 10);
                matches.push({lineItem});
            });
        });

        if (matches.length < 1)
        {
            log.audit({
                title: 'End',
                details: 'No Items'
            });
            return;
        }

        // Build Link and Messages for Chatwork/Slack/etc...
        // If Scripts could call other scripts, the rest of this would be its own script and would send a message to the relevant notification platform
        var netsuiteDomain =  url.resolveDomain({
            hostType: url.HostType.APPLICATION,
            accountId: runtime.accountId
        });

        var body = "URL: https://" + netsuiteDomain + encodeURIComponent('/app/common/search/searchresults.nl?searchid=' + savedSearchID + '&whence=');

        for (var j = 0; j < matches.length; j++)
        {
            body += "\n" + matches[j].code + " | " + matches[j].name + " | " + matches[j].numCount;
        }

        // Adjust as necessary
        var room = runtime.getCurrentScript().getParameter({name: 'custscript_chatroom'});
        var token = runtime.getCurrentScript().getParameter({name: 'custscript_token'});

        // Adjust as necessary
        var text = "Emojis, alert body markdown, etc" + body;

        // Adjust as necessary
        var headers = {"API_Token": token,"Content-Type": "application/x-www-form-urlencoded"};
        var message = "body="+text;

        var response = https.request({
            method: https.Method.POST,
            url: room,
            body: message,
            headers: headers
        });

        var returnMessage = response.body;
        
        // Adjust as necessary
        log.audit({
            title: 'End',
            details: 'Response : ' + returnMessage
        });
    }

    return {
        execute: execute
    };

});