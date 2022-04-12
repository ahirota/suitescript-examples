/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(["N/record", "N/https", "N/log"], function(r,https,log) {

  /**
   * Get Item Jancode and add button to top of record
   *
   * @param {Object} context
   * @param {Record} context.newRecord - New record
   * @param {string} context.type - Trigger type
   * @param {Form} context.form - Current form
   * @Since 2015.2
   */
  function afterSubmit(context) {
    log.audit({title: "Record Submitted."});
    var url = "https://api.chatwork.com/v2/rooms/118193951/messages";
    var ChatWorkToken = "6ac2a35eba1f157a10cb44b14a3fa87a";

    var currentRecord = context.newRecord;
    var recType = currentRecord.type;
    var recId = currentRecord.id;

    var ChatText = recType + ':' + recId;

    var headers = {"X-ChatWorkToken": ChatWorkToken};
    var body = {body: ChatText};

    log.audit({title: "Sending Request"});

    var updatestatus = https.post({
      url: url,
      body: body,
      headers: headers
    });
    var updateresults = JSON.parse(updatestatus.getBody());

    log.audit({title: "Response Received: "+updateresults});
  }

  return {
    afterSubmit: afterSubmit
  };
});
