/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(["N/record","N/https","N/log"], function(record,https,log) {

  /**
   * @param {Object} context
   * @param {Record} context.newRecord - New record
   * @param {string} context.type - Trigger type
   * @param {Form} context.form - Current form
   * @Since 2015.2
   */
  function afterSubmit(context){
    log.audit({
      title: 'Start',
      details: 'Script has started.'
    });

    var currentRecord = context.newRecord;
    var jancode = currentRecord.getValue({
      fieldId:'itemid'
    });

    log.audit({
      title: 'Jancode',
      details: jancode
    });

    var url = "https://api.chatwork.com/v2/rooms/118193951/messages";
    var ChatWorkToken = "6ac2a35eba1f157a10cb44b14a3fa87a";

    var ChatText = 'Inventory Item : '+jancode;

    var headers = {"X-ChatWorkToken": ChatWorkToken};
    var body = {"body":ChatText};

    var response = https.post({
      url: url,
      body: body,
      headers: headers
    });

    var updateresults = response.body;

    log.audit({
      title: 'End',
      details: 'Chatwork Response : '+updateresults
    });
  }

  return {
    afterSubmit: afterSubmit
  };

});