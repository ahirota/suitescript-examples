/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(["N/ui/message"], function (message) {
  function showMessage() {
    message.create(
      {
        title: "Editing Sales Order",
        message: "Please double check input data before saving.",
        type: message.Type.CONFIRMATION
      }
    ).show();
  }

  return {
    pageInit: showMessage
  };

});
