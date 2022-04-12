/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/error', 'N/record', 'N/log'], function(error, record, log) {
    // Do Validation for Parameters
    function doValidation(args, argNames, methodName) {
        for (var i = 0; i < args.length; i++){
            if (!args[i] && args[i] !== 0){
                throw error.create({
                    name: 'MISSING_REQ_ARG',
                    message: 'Missing a required argument: [' + argNames[i] + '] for method: ' + methodName
                });
            }
        }
    }

    // Sales Order
    function createSalesOrder(context) {
        var salesOrder = record.create({
            type: record.Type.SALES_ORDER,
            isDynamic: true,
            defaultValues: {
                customform: context.customform,
                entity: context.customer_id
            }
        });

        salesOrder.setValue({ fieldId: 'department', value: context.department });

        for (var i = 0; i < context.itemlist.length; i++)
        {
            //add a line to a sublist
            salesOrder.selectNewLine({
                sublistId: 'item'
            });

            //set item fields
            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: context.itemlist[i]['itemid']
            });

            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: context.itemlist[i]['quantity']
            });

            //writes the line entry into the loaded record
            salesOrder.commitLine({
                sublistId: 'item'
            });
        }

        salesOrder.save({
            ignoreMandatoryFields: false
        });

        return salesOrder;
    }

    // Get parameters and return appropriate data
    function _post(context) {
        doValidation([context.customer_id, context.customform,context.department, context.itemlist], ['customer_id', 'customform', 'department', 'itemlist'], 'POST');
        return createSalesOrder(context);
    }

    return {
        post: _post
    };
});
